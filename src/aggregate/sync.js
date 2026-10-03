// 目录同步（cron）。每个节点一个游标（agg_sync）：
//   1. 一轮（pass）= 遍历该节点账号可见的电影 / 剧集媒体库，分页取条目合并进目录；
//      首轮是全量，之后只取 MinDateLastSaved >= 上一轮开始时间的条目（增量）。
//   2. 每天一次对账（reconcile）：按媒体库比对条目数，不一致时比对 Id 列表，
//      删掉节点上已不存在的、补上漏掉的。
// 两道闸：每次 cron 的上游请求数（Workers 子请求上限）和每天的 D1 写入行数（免费额度）。
// 用完就停，下一次 cron 从游标处接着来。
import { dbAll, dbFirst, dbRun } from '../db/helpers.js';
import { ensureAggSchema } from './schema.js';
import { memberRoutes, nodeJson } from './upstream.js';
import { mergeItem, existingSources, removeSources, forgetPrefix, safeJson } from './catalog.js';

export const PAGE = 200;
const ID_PAGE = 1000;
const SINCE_SLACK_MS = 10 * 60 * 1000;   // 节点与本地时钟偏差的余量
const RECONCILE_EVERY_MS = 24 * 3600 * 1000;
const PLAY_SESSION_TTL_MS = 2 * 24 * 3600 * 1000;
const DEFAULT_DAILY_WRITES = 30000;
const DEFAULT_TICK_REQUESTS = 20;
const LIB_TYPES = new Set(['movies', 'tvshows', 'mixed', '']);
const FIELDS = 'ProviderIds,Genres,PremiereDate,ProductionYear,DateCreated,SortName,CommunityRating,OfficialRating,RunTimeTicks';

const dayKey = (now) => 'writes:' + new Date(now).toISOString().slice(0, 10);

function itemsQuery(lib, extra) {
    const q = new URLSearchParams({
        ParentId: lib.id, Recursive: 'true',
        IncludeItemTypes: lib.type === 'movies' ? 'Movie' : lib.type === 'tvshows' ? 'Series' : 'Movie,Series',
        Fields: FIELDS, EnableUserData: 'false', EnableImageTypes: 'Primary,Backdrop,Thumb,Logo', ImageTypeLimit: '1',
        SortBy: 'DateCreated,SortName', SortOrder: 'Ascending', ...extra,
    });
    return `/Users/{uid}/Items?${q}`;
}

async function fetchLibs(env, route) {
    const r = await nodeJson(env, route, '/Users/{uid}/Views');
    if (r.error) return r;
    const libs = ((r.data && r.data.Items) || [])
        .filter(v => LIB_TYPES.has(String(v.CollectionType || '').toLowerCase()))
        .map(v => ({ id: String(v.Id), type: String(v.CollectionType || '').toLowerCase() }));
    return { libs };
}

// opts: { maxRequests, dailyWrites }
export async function runSync(env, now = Date.now(), opts = {}) {
    await ensureAggSchema(env);
    const members = await memberRoutes(env, now);
    const memberSet = new Set(members.map(r => r.prefix));
    const summary = { nodes: {}, writes: 0, requests: 0, stopped: '' };

    await dbRun(env, `DELETE FROM agg_play_sessions WHERE created_at < ?`, now - PLAY_SESSION_TTL_MS);
    const synced = ((await dbAll(env, `SELECT prefix, updated_at FROM agg_sync`)).results || []);
    for (const r of synced) if (!memberSet.has(r.prefix)) summary.writes += await forgetPrefix(env, r.prefix);

    const limit = Number(opts.dailyWrites ?? env.AGG_DAILY_WRITE_BUDGET) || DEFAULT_DAILY_WRITES;
    const used = Number((await dbFirst(env, `SELECT v FROM agg_meta WHERE k = ?`, dayKey(now)))?.v) || 0;
    const budget = {
        requests: Number(opts.maxRequests ?? env.AGG_SYNC_REQUESTS) || DEFAULT_TICK_REQUESTS,
        writes: Math.max(0, limit - used - summary.writes),
    };

    // 最久没同步的节点先来。
    const last = new Map(synced.map(r => [r.prefix, Number(r.updated_at) || 0]));
    const order = [...members].sort((a, b) => (last.get(a.prefix) || 0) - (last.get(b.prefix) || 0));
    for (const route of order) {
        if (budget.requests <= 0) { summary.stopped = 'requests'; break; }
        if (budget.writes <= 0) { summary.stopped = 'writes'; break; }
        const before = { r: budget.requests, w: budget.writes };
        const res = await syncNode(env, route, now, budget);
        summary.nodes[route.prefix] = res;
        summary.requests += before.r - budget.requests;
        summary.writes += before.w - budget.writes;
    }
    if (!summary.stopped && budget.writes <= 0) summary.stopped = 'writes';
    if (!summary.stopped && budget.requests <= 0) summary.stopped = 'requests';
    if (summary.writes) {
        await dbRun(env, `INSERT INTO agg_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = CAST(v AS INTEGER) + CAST(excluded.v AS INTEGER)`,
            dayKey(now), String(summary.writes));
        await dbRun(env, `DELETE FROM agg_meta WHERE k LIKE 'writes:%' AND k < ?`, dayKey(now - 7 * 86400000));
    }
    return summary;
}

async function loadState(env, prefix) {
    const row = await dbFirst(env, `SELECT * FROM agg_sync WHERE prefix = ?`, prefix);
    return row ? { ...row, libs: safeJson(row.libs, []) }
        : { prefix, since: '', pass_start: '', libs: [], li: 0, start: 0, reconciled_at: 0, error: '' };
}

async function saveState(env, st, now) {
    await dbRun(env,
        `INSERT OR REPLACE INTO agg_sync (prefix, since, pass_start, libs, li, start, reconciled_at, updated_at, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        st.prefix, st.since, st.pass_start, JSON.stringify(st.libs), st.li, st.start, st.reconciled_at, now, st.error || '');
}

// 同步一个节点，直到这一轮做完或预算用完。返回 { merged, removed, passDone, reconciled, error }。
async function syncNode(env, route, now, budget) {
    const st = await loadState(env, route.prefix);
    const out = { merged: 0, removed: 0, passDone: false, reconciled: false, error: '' };
    const fail = async (msg) => { st.error = out.error = msg; await saveState(env, st, now); return out; };

    if (!st.libs.length) {
        if (st.since && now - (Number(st.reconciled_at) || 0) >= RECONCILE_EVERY_MS) {
            const rec = await reconcile(env, route, budget);
            if (rec.error) return fail(rec.error);
            out.merged += rec.added; out.removed += rec.removed; out.reconciled = true;
            st.reconciled_at = now;
        }
        if (budget.requests <= 0) { await saveState(env, st, now); return out; }
        budget.requests--;
        const v = await fetchLibs(env, route);
        if (v.error) return fail(v.error);
        st.libs = v.libs; st.li = 0; st.start = 0; st.pass_start = new Date(now).toISOString();
    }

    while (st.li < st.libs.length && budget.requests > 0 && budget.writes > 0) {
        const lib = st.libs[st.li];
        const extra = { StartIndex: String(st.start), Limit: String(PAGE) };
        if (st.since) extra.MinDateLastSaved = st.since;
        budget.requests--;
        const r = await nodeJson(env, route, itemsQuery(lib, extra));
        if (r.error) return fail(r.error);
        const items = (r.data && r.data.Items) || [];
        const total = Number(r.data && r.data.TotalRecordCount) || 0;
        const have = await existingSources(env, route.prefix, items.map(it => it.Id));
        let done = 0;
        for (const it of items) {
            if (budget.writes <= 0) break;
            const cost = await mergeItem(env, route.prefix, lib.id, it, have.get(String(it.Id)) || null);
            budget.writes -= cost;
            if (cost) out.merged++;
            done++;
        }
        st.start += done;
        if (done === items.length && (items.length < PAGE || st.start >= total)) { st.li++; st.start = 0; }
    }

    if (st.li >= st.libs.length) {
        out.passDone = true;
        st.since = new Date(Date.parse(st.pass_start) - SINCE_SLACK_MS).toISOString();
        st.libs = []; st.li = 0; st.start = 0;
        // 首轮全量刚做完：当天不必再对账。
        if (!st.reconciled_at) st.reconciled_at = now;
    }
    st.error = '';
    await saveState(env, st, now);
    return out;
}

// 对账：按媒体库比较条目数；不一致的库拉 Id 全表比对，删多余、补缺失。
async function reconcile(env, route, budget) {
    const out = { added: 0, removed: 0 };
    budget.requests--;
    const v = await fetchLibs(env, route);
    if (v.error) return v;
    const libIds = v.libs.map(l => l.id);

    // 节点账号已看不到的媒体库：整库移除。
    const gone = ((await dbAll(env,
        `SELECT item_id FROM agg_sources WHERE prefix = ? AND lib_id NOT IN (SELECT value FROM json_each(?))`,
        route.prefix, JSON.stringify(libIds))).results || []).map(r => r.item_id);
    if (gone.length) { budget.writes -= await removeSources(env, route.prefix, gone); out.removed += gone.length; }

    for (const lib of v.libs) {
        budget.requests--;
        const head = await nodeJson(env, route, itemsQuery(lib, { Limit: '0', Fields: '' }));
        if (head.error) return head;
        const remoteTotal = Number(head.data && head.data.TotalRecordCount) || 0;
        const local = Number((await dbFirst(env, `SELECT COUNT(*) AS n FROM agg_sources WHERE prefix = ? AND lib_id = ?`, route.prefix, lib.id))?.n) || 0;
        if (remoteTotal === local) continue;

        const remote = new Set();
        for (let start = 0; start < remoteTotal; start += ID_PAGE) {
            budget.requests--;
            const r = await nodeJson(env, route, itemsQuery(lib, { StartIndex: String(start), Limit: String(ID_PAGE), Fields: '', EnableImageTypes: '' }));
            if (r.error) return r;
            for (const it of (r.data && r.data.Items) || []) remote.add(String(it.Id));
        }
        const localIds = ((await dbAll(env, `SELECT item_id FROM agg_sources WHERE prefix = ? AND lib_id = ?`, route.prefix, lib.id)).results || []).map(r => String(r.item_id));
        const extra = localIds.filter(id => !remote.has(id));
        if (extra.length) { budget.writes -= await removeSources(env, route.prefix, extra); out.removed += extra.length; }

        const localSet = new Set(localIds);
        const missing = [...remote].filter(id => !localSet.has(id));
        for (let i = 0; i < missing.length && budget.writes > 0; i += 100) {
            budget.requests--;
            const r = await nodeJson(env, route, itemsQuery(lib, { Ids: missing.slice(i, i + 100).join(',') }));
            if (r.error) return r;
            for (const it of (r.data && r.data.Items) || []) {
                const cost = await mergeItem(env, route.prefix, lib.id, it, null);
                budget.writes -= cost;
                if (cost) out.added++;
            }
        }
    }
    return out;
}

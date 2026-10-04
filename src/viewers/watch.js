// Watch state：每个 viewer 在每个节点上独立的 已播放/进度/收藏。
// 写：上游先成功，再写 D1（dual write，调用方保证顺序）。
// 读：凡 JSON 里带 Id + UserData 的对象，一律用本地记录覆盖（无记录 = 清空），
//     上游共享账号的观看历史因此不会泄露给 viewer。
import { dbAll, dbFirst, dbRun } from '../db/helpers.js';

const PLAYED_RATIO = 0.9;
// 表名：生产用 watch_state；聚合 Worker 传 s.table = 'agg_watch_state'（它不能写生产表）。
const TABLES = new Set(['watch_state', 'agg_watch_state']);
const T = (s) => (s.table && TABLES.has(s.table) ? s.table : 'watch_state');
const WRITABLE = new Set(['item_type', 'series_id', 'parent_index', 'index_number', 'position_ticks',
    'runtime_ticks', 'played', 'is_favorite', 'last_played']);

async function upsert(env, s, itemId, fields) {
    const cols = Object.keys(fields).filter(k => WRITABLE.has(k));
    if (!cols.length) return;
    await dbRun(env,
        `INSERT INTO ${T(s)} (viewer_id, prefix, item_id, ${cols.join(', ')}) VALUES (?, ?, ?, ${cols.map(() => '?').join(', ')})
         ON CONFLICT(viewer_id, prefix, item_id) DO UPDATE SET ${cols.map(c => `${c} = excluded.${c}`).join(', ')}`,
        s.viewerId, s.prefix, String(itemId), ...cols.map(c => fields[c]));
}

// 首次记录某条目时向上游取一次类型/剧集信息（Resume 分组、NextUp、90% 判定要用）。
async function withMeta(env, s, itemId, fetchItem, fields) {
    const row = await dbFirst(env, `SELECT item_type, runtime_ticks FROM ${T(s)} WHERE viewer_id = ? AND prefix = ? AND item_id = ?`,
        s.viewerId, s.prefix, String(itemId));
    if (row && row.item_type) return { ...fields, runtime: Number(row.runtime_ticks) || 0 };
    const it = (await fetchItem(itemId).catch(() => null)) || {};
    return {
        item_type: it.Type || '',
        series_id: it.SeriesId || '',
        parent_index: Number(it.ParentIndexNumber) || 0,
        index_number: Number(it.IndexNumber) || 0,
        runtime_ticks: Number(it.RunTimeTicks) || 0,
        ...fields,
        runtime: Number(it.RunTimeTicks) || 0,
    };
}

// kind: 'playing' | 'progress' | 'stopped'；body 为 Sessions/Playing* 的 JSON。
export async function recordPlayback(env, s, kind, body, fetchItem, now = Date.now()) {
    const itemId = body && (body.ItemId || body.itemId);
    if (!itemId) return;
    const pos = Math.max(0, Number(body.PositionTicks ?? body.positionTicks) || 0);
    const f = await withMeta(env, s, itemId, fetchItem, { position_ticks: pos, last_played: now });
    if (kind === 'stopped' && f.runtime > 0 && pos >= f.runtime * PLAYED_RATIO) {
        f.played = 1; f.position_ticks = 0;
    }
    delete f.runtime;
    await upsert(env, s, itemId, f);
    if (kind !== 'progress') await setResumeHidden(env, s, itemId, false);
}

// flags: { played?, favorite?, position?, resumeHidden? }（来自 PlayedItems / FavoriteItems / UserData / HideFromResume 接口）
export async function setUserData(env, s, itemId, flags, fetchItem, now = Date.now()) {
    if (flags.resumeHidden !== undefined) await setResumeHidden(env, s, itemId, flags.resumeHidden);
    const fields = {};
    if (flags.played !== undefined) {
        fields.played = flags.played ? 1 : 0;
        fields.position_ticks = 0;
        fields.last_played = flags.played ? now : 0; // Emby 标记未播放时同时清掉 LastPlayedDate
    }
    if (flags.favorite !== undefined) fields.is_favorite = flags.favorite ? 1 : 0;
    if (flags.position !== undefined) fields.position_ticks = Math.max(0, Number(flags.position) || 0);
    if (!Object.keys(fields).length) return (await loadRows(env, s, [String(itemId)])).get(String(itemId)) || null;
    const f = await withMeta(env, s, itemId, fetchItem, fields);
    delete f.runtime;
    await upsert(env, s, itemId, f);
    return (await loadRows(env, s, [String(itemId)])).get(String(itemId));
}

// 「从继续观看中移除」与 Emby 一致：只隐藏，进度保留；剧集按整部剧隐藏（隐藏任一集，整部剧都不再出现）。
// 该剧任一集 / 该电影再次播放时取消隐藏（见 recordPlayback）。
async function setResumeHidden(env, s, itemId, hidden) {
    const row = await dbFirst(env, `SELECT series_id FROM ${T(s)} WHERE viewer_id = ? AND prefix = ? AND item_id = ?`,
        s.viewerId, s.prefix, String(itemId));
    if (!row) return;
    const sid = row.series_id || '';
    await dbRun(env,
        `UPDATE ${T(s)} SET resume_hidden = ? WHERE viewer_id = ? AND prefix = ? AND (item_id = ? OR (? != '' AND series_id = ?))`,
        hidden ? 1 : 0, s.viewerId, s.prefix, String(itemId), sid, sid);
}

export async function loadRows(env, s, ids) {
    const out = new Map();
    const uniq = [...new Set(ids.map(String))];
    // D1 单语句绑定参数上限 100
    for (let i = 0; i < uniq.length; i += 90) {
        const chunk = uniq.slice(i, i + 90);
        const r = await dbAll(env,
            `SELECT item_id, position_ticks, runtime_ticks, played, is_favorite, last_played FROM ${T(s)}
              WHERE viewer_id = ? AND prefix = ? AND item_id IN (${chunk.map(() => '?').join(',')})`,
            s.viewerId, s.prefix, ...chunk);
        for (const row of r.results || []) out.set(String(row.item_id), row);
    }
    return out;
}

export function applyUserData(ud, row) {
    ud.Played = !!(row && row.played);
    ud.IsFavorite = !!(row && row.is_favorite);
    ud.PlaybackPositionTicks = (row && Number(row.position_ticks)) || 0;
    ud.PlayCount = ud.Played ? Math.max(1, Number(ud.PlayCount) || 0) : 0;
    if (row && row.position_ticks > 0 && row.runtime_ticks > 0) ud.PlayedPercentage = row.position_ticks / row.runtime_ticks * 100;
    else delete ud.PlayedPercentage;
    if (row && row.last_played) ud.LastPlayedDate = new Date(Number(row.last_played)).toISOString();
    else delete ud.LastPlayedDate;
    return ud;
}

function walk(node, visit) {
    if (Array.isArray(node)) { for (const x of node) walk(x, visit); return; }
    if (!node || typeof node !== 'object') return;
    visit(node);
    for (const k of Object.keys(node)) if (k !== 'UserData' && node[k] && typeof node[k] === 'object') walk(node[k], visit);
}

// 覆盖整个 JSON 响应里的 UserData；data 原地修改并返回。
// ponytail: 剧集/季的 UnplayedItemCount 仍来自上游账号（与 Emby-In-One 一致的已知限制）。
export async function overlayJson(env, s, data) {
    const targets = [];
    walk(data, o => { if (o.Id != null && o.UserData && typeof o.UserData === 'object') targets.push(o); });
    if (!targets.length) return data;
    const rows = await loadRows(env, s, targets.map(o => o.Id));
    for (const o of targets) applyUserData(o.UserData, rows.get(String(o.Id)));
    return data;
}

// Filters=IsFavorite/IsPlayed/IsResumable 或 IsFavorite=true/IsPlayed=true：由本地记录给出 Ids。
// 返回 null = 查询不含本地可答的过滤；否则返回匹配的 item id 数组，并从 params 里移除这些过滤。
// IsUnplayed / IsPlayed=false 仍交给上游账号判断（已知限制）。
export async function localFilterIds(env, s, params) {
    const filters = (params.get('Filters') || '').split(',').map(x => x.trim()).filter(Boolean);
    const conds = [];
    const take = (name, cond) => {
        const inFilters = filters.includes(name);
        const inParam = (params.get(name) || '').toLowerCase() === 'true';
        if (!inFilters && !inParam) return;
        conds.push(cond);
        if (inParam) params.delete(name);
    };
    take('IsFavorite', 'is_favorite = 1');
    take('IsPlayed', 'played = 1');
    take('IsResumable', 'position_ticks > 0 AND played = 0');
    if (!conds.length) return null;
    const rest = filters.filter(f => !['IsFavorite', 'IsPlayed', 'IsResumable'].includes(f));
    if (rest.length) params.set('Filters', rest.join(',')); else params.delete('Filters');
    const r = await dbAll(env,
        `SELECT item_id FROM ${T(s)} WHERE viewer_id = ? AND prefix = ? AND ${conds.join(' AND ')} ORDER BY last_played DESC LIMIT 1000`,
        s.viewerId, s.prefix);
    let ids = (r.results || []).map(x => String(x.item_id));
    const given = params.get('Ids');
    if (given) { const g = new Set(given.split(',')); ids = ids.filter(id => g.has(id)); }
    return ids;
}

// Continue Watching：本地 进度>0、未看完且未被隐藏，每部剧只取最近一集。
export async function resumeIds(env, s, params) {
    const r = await dbAll(env,
        `SELECT item_id, series_id FROM ${T(s)} WHERE viewer_id = ? AND prefix = ? AND position_ticks > 0 AND played = 0 AND resume_hidden = 0
          ORDER BY last_played DESC, rowid DESC LIMIT 500`,
        s.viewerId, s.prefix);
    const seen = new Set(); const ids = [];
    for (const row of r.results || []) {
        const key = row.series_id || row.item_id;
        if (seen.has(key)) continue;
        seen.add(key); ids.push(String(row.item_id));
    }
    const start = Math.max(0, Number(params.get('StartIndex')) || 0);
    const limit = Number(params.get('Limit')) || 20;
    return { ids: ids.slice(start, start + limit), total: ids.length };
}

// Next Up：每部剧取已播/在播的最后一集，向上游取整部剧集列表找下一集。
// fetchEpisodes(seriesId) → Episodes 数组（上游顺序）。
// ponytail: 每部剧一次上游请求，最多 MAX_NEXTUP_SERIES 部，避免撞 Workers 子请求上限。
const MAX_NEXTUP_SERIES = 12;
export async function buildNextUp(env, s, params, fetchEpisodes) {
    const r = await dbAll(env,
        `SELECT item_id, series_id, parent_index, index_number, position_ticks, played, last_played, resume_hidden FROM ${T(s)}
          WHERE viewer_id = ? AND prefix = ? AND item_type = 'Episode' AND series_id != '' AND (played = 1 OR position_ticks > 0)`,
        s.viewerId, s.prefix);
    // 与 Emby 一致：从继续观看中移除的剧，Next Up 里也不再出现，直到再次播放。
    const hidden = new Set((r.results || []).filter(x => x.resume_hidden).map(x => x.series_id));
    const bySeries = new Map();
    for (const row of r.results || []) {
        if (hidden.has(row.series_id)) continue;
        const cur = bySeries.get(row.series_id);
        // 与 Emby 一致：以最近播放的一集为准（回看较早的一集时 Next Up 跟着回去），同一时刻按集序。
        const at = Number(row.last_played) || 0, curAt = cur ? Number(cur.last.last_played) || 0 : 0;
        const later = !cur || at > curAt || (at === curAt && (row.parent_index > cur.last.parent_index ||
            (row.parent_index === cur.last.parent_index && row.index_number > cur.last.index_number)));
        const played = new Set(cur ? cur.played : []);
        if (row.played) played.add(String(row.item_id));
        bySeries.set(row.series_id, {
            last: later ? row : cur.last,
            at: Math.max(cur ? cur.at : 0, Number(row.last_played) || 0),
            played,
        });
    }
    const want = params.get('SeriesId');
    const series = [...bySeries.entries()].filter(([id]) => !want || id === want).sort((a, b) => b[1].at - a[1].at);
    const limit = Math.min(Number(params.get('Limit')) || 20, MAX_NEXTUP_SERIES);
    const picks = await Promise.all(series.slice(0, limit).map(async ([sid, st]) => {
        const eps = ((await fetchEpisodes(sid).catch(() => null)) || []).filter(e => Number(e.ParentIndexNumber) !== 0);
        const last = st.last;
        let idx = eps.findIndex(e => String(e.Id) === String(last.item_id));
        if (idx >= 0 && !last.played && last.position_ticks > 0) return eps[idx];
        if (idx < 0) {
            idx = eps.findIndex(e => Number(e.ParentIndexNumber) > last.parent_index ||
                (Number(e.ParentIndexNumber) === last.parent_index && Number(e.IndexNumber) > last.index_number)) - 1;
            if (idx < -1) return null;
        }
        return eps.slice(idx + 1).find(e => !st.played.has(String(e.Id))) || null;
    }));
    const items = picks.filter(Boolean);
    return { Items: items, TotalRecordCount: items.length };
}

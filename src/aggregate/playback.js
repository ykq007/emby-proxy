// 阶段 2：播放。客户端看到的条目 Id 是聚合 vid（或阶段 3 推出的集 Id，见 series.js），真正的媒体在某个节点上。
//
// PlaybackInfo：按 健康（探测失败 / 熔断冷却）→ 并发槽位 → routes.sort_order 给可见副本排序，
//   在第一个能占到槽位的节点上取 PlaybackInfo（失败换下一个）；另取至多两个健康且有空槽的节点
//   作为「其它版本」，客户端的版本选择器里就是「Source 1 / Source 2 …」。
//   MediaSource.Id 编码成 `<节点前缀>~<原 Id>`，之后的流 / 进度请求凭它找回节点；
//   PlaySessionId → 节点 记在 agg_play_sessions 里兜底（HLS 分片请求常常只带它）。
// 流：
//   - 客户端自己拼的 /Videos/{vid}/… → 解析出节点，换成真实条目 Id 转发；
//   - 节点返回的 DirectStreamUrl / TranscodingUrl / 字幕 DeliveryUrl 改写成 /n/<前缀>/…，
//     原样转发（只允许 GET/HEAD 且只在 /Videos/ 下，viewer 拿不到节点的其它接口）。
// 上游会话按 (节点, viewer 设备) 各登录一次，以该设备自己的身份；令牌双向替换，
// 节点令牌不会出现在给客户端的响应里。
// 并发：直接用生产的 playback_slots（acquireSlot / heartbeatSlot / releaseSlot），
//   节点并发上限与 viewer 配额在生产与聚合之间合并计算。
import { dbAll, dbFirst, dbRun } from '../db/helpers.js';
import { acquireSlot, heartbeatSlot, releaseSlot, SLOT_TTL_MS } from '../viewers/limits.js';
import { clientIdentity } from '../viewers/upstream.js';
import { UPSTREAM_CB } from '../proxy/circuit-breaker.js';
import { memberRoutes, deviceSession, nodeFetch, bases } from './upstream.js';
import { copiesOf, watchMeta } from './series.js';
import { recordPlayback } from '../viewers/watch.js';
import { CORS, json, empty, param } from './http.js';

const SEP = '~';
const MAX_VERSIONS = 3;
const HEALTH_TTL_MS = 30000;
const TOKEN_PARAM = /^(api_?key|x-emby-token|accesstoken)$/i;
const PASS_HEADERS = ['range', 'if-range', 'accept', 'accept-language', 'if-none-match', 'if-modified-since'];
const PLAY_MEM = new Map(); // PlaySessionId -> { prefix, item_id, vid }
// 进度上报（客户端约每 10 秒一次）每个 viewer 每个条目最多每分钟写一次 D1；开始 / 停止总是写。
export const PROGRESS_WRITE_MS = 60000;
const PROGRESS_MEM = new Map(); // `${viewerId}|${vid}` -> 上次写入时间
let healthMem = null;

export function __resetPlaybackForTest() { PLAY_MEM.clear(); PROGRESS_MEM.clear(); healthMem = null; }

// 聚合端的观看状态（watch.js 共用，写 agg_watch_state，不写生产 watch_state）。
export const watchSession = (s) => ({ viewerId: s.viewerId, prefix: 'agg', table: 'agg_watch_state' });

export const encodeMsid = (prefix, id) => `${prefix}${SEP}${id}`;
export function decodeMsid(v, prefixes) {
    const s = String(v || ''); const i = s.indexOf(SEP);
    if (i < 1) return null;
    const prefix = s.slice(0, i);
    return prefixes.includes(prefix) ? { prefix, id: s.slice(i + 1) } : null;
}

const swap = (text, from, to) => (from && text.includes(from) ? text.split(from).join(to) : text);
const slotOf = (s, prefix) => ({ prefix, viewerId: s.viewerId, quota: s.scope.quota.get(prefix) || 0 });
const deviceOf = (s, request, url) => s.deviceId || clientIdentity(request, url).deviceId || 'ea-' + s.viewerId;

// 节点返回的 URL → 本 Worker 的 /n/<前缀>/… 路径（去掉节点主机与 /emby 前缀）。
export function nsUrl(prefix, u) {
    if (!u) return u;
    let p = String(u);
    if (/^https?:\/\//i.test(p)) { try { const x = new URL(p); p = x.pathname + x.search; } catch (e) { return u; } }
    if (!p.startsWith('/')) p = '/' + p;
    return `/n/${encodeURIComponent(prefix)}${p.replace(/^\/emby(?=\/)/i, '')}`;
}

async function failingNodes(env, now) {
    if (healthMem && now - healthMem.at < HEALTH_TTL_MS) return healthMem.set;
    let set = new Set();
    try { set = new Set(((await dbAll(env, `SELECT prefix FROM emby_probe_state WHERE first_fail_at > 0`)).results || []).map(r => r.prefix)); } catch (e) { }
    healthMem = { at: now, set };
    return set;
}

// 可见副本 → 候选节点，坏的排后面（不剔除：只有一个副本时仍然要试）。label = 按节点顺序的编号，跨次播放稳定。
async function rank(env, sources, now) {
    const routes = new Map((await memberRoutes(env, now)).map(r => [r.prefix, r]));
    const failing = await failingNodes(env, now);
    // 每个节点只留第一份副本（同一节点多个媒体库里的同一部片）：版本要来自不同节点才有意义。
    const seen = new Set();
    const perNode = sources.filter(src => routes.has(src.prefix) && !seen.has(src.prefix) && seen.add(src.prefix));
    return perNode.map((src, i) => {
        const route = routes.get(src.prefix);
        const cooling = bases(route).every(u => (UPSTREAM_CB.get(u)?.failUntil || 0) > now);
        return { src, route, label: i + 1, bad: (failing.has(src.prefix) ? 2 : 0) + (cooling ? 1 : 0) };
    }).sort((a, b) => a.bad - b.bad || a.label - b.label);
}

// 只读地判断该设备在该节点能否起播（与 acquireSlot 同一口径），给「其它版本」用。
async function slotFree(env, slot, device, now) {
    const row = await dbFirst(env,
        `SELECT (SELECT max_concurrent FROM routes WHERE prefix = ?) AS cap, COUNT(*) AS total,
                COALESCE(SUM(viewer_id = ?), 0) AS mine, COALESCE(SUM(viewer_id = ? AND device_id = ?), 0) AS same
           FROM playback_slots WHERE prefix = ? AND heartbeat_at >= ?`,
        slot.prefix, slot.viewerId, slot.viewerId, device, slot.prefix, now - SLOT_TTL_MS);
    if (Number(row?.same)) return true;
    const cap = Number(row?.cap) || 0;
    return !((slot.quota > 0 && Number(row?.mine) >= slot.quota) || (cap > 0 && Number(row?.total) >= cap));
}

// 用该 viewer 设备在节点上的会话发请求；上游 401 → 以同一设备身份重登一次再发。
async function withSession(env, route, s, request, url, send) {
    const ident = { ...clientIdentity(request, url), deviceId: deviceOf(s, request, url) };
    let sess = await deviceSession(env, route, ident);
    if (sess.error) return { error: sess.error };
    let r = await send(sess);
    if (r && r.status === 401) {
        r.body?.cancel().catch(() => {});
        sess = await deviceSession(env, route, sess.ident || ident, true);
        if (sess.error) return { error: sess.error };
        r = await send(sess);
    }
    return { r, sess };
}

function passHeaders(request) {
    const h = {};
    for (const k of PASS_HEADERS) { const v = request.headers.get(k); if (v) h[k] = v; }
    return h;
}

// 客户端查询串 → 发给节点的查询串：令牌参数换成节点令牌（节点生成的播放列表会照抄它，
// 分片请求才带得上令牌），其余照传；drop 里的键去掉。
function upstreamQuery(url, upToken, drop = []) {
    const q = new URLSearchParams();
    const dropSet = new Set(drop.map(d => d.toLowerCase()));
    for (const [k, v] of url.searchParams) {
        if (dropSet.has(k.toLowerCase())) continue;
        q.append(k, TOKEN_PARAM.test(k) ? upToken : v);
    }
    return q;
}

async function rememberPlay(env, psid, prefix, itemId, vid) {
    if (!psid) return;
    PLAY_MEM.set(String(psid), { prefix, item_id: String(itemId), vid: Number(vid) });
    await dbRun(env, `INSERT OR REPLACE INTO agg_play_sessions (play_session_id, prefix, item_id, vid, created_at) VALUES (?, ?, ?, ?, ?)`,
        String(psid), prefix, String(itemId), Number(vid), Date.now());
}

async function lookupPlay(env, psid) {
    if (!psid) return null;
    if (PLAY_MEM.has(String(psid))) return PLAY_MEM.get(String(psid));
    const row = await dbFirst(env, `SELECT prefix, item_id, vid FROM agg_play_sessions WHERE play_session_id = ?`, String(psid));
    if (row) PLAY_MEM.set(String(psid), row);
    return row;
}

// vid + （编码过的 MediaSourceId | PlaySessionId）→ 该 viewer 可用的那份副本。都没有时取排第一的节点。
async function resolveCopy(env, s, vid, msidRaw, psid, now = Date.now()) {
    const want = msidRaw ? decodeMsid(msidRaw, s.scope.prefixes) : null;
    let prefix = want ? want.prefix : null;
    if (!prefix && psid) {
        const p = await lookupPlay(env, psid);
        if (p && Number(p.vid) === Number(vid)) prefix = p.prefix;
    }
    const ranked = await rank(env, await copiesOf(env, s.scope, vid), now);
    const c = prefix ? ranked.find(x => x.src.prefix === prefix) : ranked[0];
    return c ? { ...c, msid: want ? want.id : null } : null;
}

// 响应后处理：节点令牌 → viewer 令牌（JSON / 播放列表 / 重定向），其余原样流式透传。
function finish(r, upToken, token, path) {
    if (!r) return json({ message: 'Node unreachable' }, 502);
    const headers = new Headers(r.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    const loc = headers.get('Location');
    if (loc) headers.set('Location', swap(loc, upToken, token));
    const ct = r.headers.get('content-type') || '';
    const textual = /json|mpegurl|dash\+xml/i.test(ct) || /\.(m3u8|mpd)$/i.test(path.split('?')[0]);
    if (!textual) return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
    headers.delete('Content-Length');
    return r.text().then(t => new Response(swap(t, upToken, token), { status: r.status, statusText: r.statusText, headers }));
}

async function askPlaybackInfo(env, c, s, request, url, body, msid) {
    const res = await withSession(env, c.route, s, request, url, (sess) => {
        const q = upstreamQuery(url, sess.token, ['UserId', 'MediaSourceId']);
        q.set('UserId', sess.userId);
        if (msid) q.set('MediaSourceId', msid);
        const headers = body ? { 'Content-Type': request.headers.get('content-type') || 'application/json' } : {};
        return nodeFetch(c.route, sess, `/Items/${encodeURIComponent(c.src.item_id)}/PlaybackInfo?${q}`,
            { method: request.method, body, headers });
    });
    if (res.error) return { error: res.error };
    const r = res.r;
    if (!r || !r.ok) { r?.body?.cancel().catch(() => {}); return { error: r ? `node answered ${r.status}` : 'node unreachable' }; }
    const data = await r.json().catch(() => null);
    if (!data || !Array.isArray(data.MediaSources) || !data.MediaSources.length) return { error: 'node returned no media sources' };
    return { data, sess: res.sess };
}

function rewriteSource(ms, c, vid, label) {
    ms.Id = encodeMsid(c.src.prefix, ms.Id);
    if ('ItemId' in ms) ms.ItemId = String(vid);
    delete ms.Path; // 节点上的文件路径不给客户端
    if (label) ms.Name = [ms.Name, `Source ${c.label}`].filter(Boolean).join(' · ');
    for (const k of ['DirectStreamUrl', 'TranscodingUrl']) if (ms[k]) ms[k] = nsUrl(c.src.prefix, ms[k]);
    for (const st of ms.MediaStreams || []) if (st.DeliveryUrl) st.DeliveryUrl = nsUrl(c.src.prefix, st.DeliveryUrl);
    return ms;
}

// GET|POST /Items/{vid}/PlaybackInfo
export async function playbackInfo(env, request, url, s, vid) {
    const now = Date.now();
    const sources = await copiesOf(env, s.scope, vid);
    if (!sources.length) return json({ message: 'Not found' }, 404);
    const want = decodeMsid(param(url, 'MediaSourceId'), s.scope.prefixes);
    let ranked = await rank(env, sources, now);
    if (want) ranked = ranked.filter(c => c.src.prefix === want.prefix);
    const body = request.method === 'POST' ? await request.text() : undefined;
    const device = deviceOf(s, request, url);

    // 主节点：第一个占得到槽位且答得上来的。
    let primary = null; let full = 0; let lastError = '';
    for (const c of ranked) {
        const slot = slotOf(s, c.src.prefix);
        if (await acquireSlot(env, slot, device, c.src.item_id)) { full++; continue; }
        const res = await askPlaybackInfo(env, c, s, request, url, body, want ? want.id : null);
        if (res.data) { primary = { c, ...res }; break; }
        lastError = res.error;
        await releaseSlot(env, slot, device);
    }
    if (!primary) {
        return full && !lastError
            ? json({ message: 'Concurrent playback limit reached' }, 429)
            : json({ message: `No node could play this title (${lastError || 'no copy available'})` }, 503);
    }

    // 其它版本：健康且有空槽的其它节点（客户端指定了版本时不取）。
    const results = [primary];
    if (!want) {
        const alts = [];
        for (const c of ranked) {
            if (alts.length >= MAX_VERSIONS - 1) break;
            if (c === primary.c || c.bad) continue;
            if (await slotFree(env, slotOf(s, c.src.prefix), device, now)) alts.push(c);
        }
        const got = await Promise.all(alts.map(c => askPlaybackInfo(env, c, s, request, url, body, null)));
        got.forEach((res, i) => { if (res.data) results.push({ c: alts[i], ...res }); });
    }

    const label = sources.length > 1;
    const out = { ...primary.data, MediaSources: [] };
    for (const r of results) {
        for (const ms of r.data.MediaSources) out.MediaSources.push(rewriteSource(ms, r.c, vid, label));
        await rememberPlay(env, r.data.PlaySessionId, r.c.src.prefix, r.c.src.item_id, vid);
    }
    let text = JSON.stringify(out);
    for (const r of results) text = swap(text, r.sess.token, s.token);
    return new Response(text, { headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
}

// GET|HEAD /Videos/{vid}/…（客户端自己拼的直连 / 字幕 / HLS 分片）
export async function videoStream(env, request, url, s, vid, rest) {
    const segs = rest.split('/');
    let msidRaw = param(url, 'MediaSourceId');
    const pathMsid = segs.length > 1 && decodeURIComponent(segs[0]).includes(SEP);
    if (!msidRaw && pathMsid) msidRaw = decodeURIComponent(segs[0]);
    const c = await resolveCopy(env, s, vid, msidRaw, param(url, 'PlaySessionId'));
    if (!c) return json({ message: 'Not found' }, 404);
    if (pathMsid && c.msid) segs[0] = encodeURIComponent(c.msid);
    const res = await withSession(env, c.route, s, request, url, (sess) => {
        const q = upstreamQuery(url, sess.token, ['MediaSourceId']);
        if (c.msid) q.set('MediaSourceId', c.msid);
        return nodeFetch(c.route, sess, `/Videos/${encodeURIComponent(c.src.item_id)}/${segs.join('/')}?${q}`,
            { method: request.method, headers: passHeaders(request) });
    });
    if (res.error) return json({ message: res.error }, 503);
    return finish(res.r, res.sess.token, s.token, rest);
}

// GET|HEAD /n/<前缀>/Videos/…（节点给出的流地址，原样转发）
export async function namespaced(env, request, url, s, prefix, rest) {
    if (!s.scope.prefixes.includes(prefix)) return json({ message: 'Forbidden' }, 403);
    const path = rest.replace(/^\/emby(?=\/)/i, '');
    if (!/^\/videos\//i.test(path) || !['GET', 'HEAD'].includes(request.method)) return json({ message: 'Forbidden' }, 403);
    const route = (await memberRoutes(env)).find(r => r.prefix === prefix);
    if (!route) return json({ message: 'Not found' }, 404);
    const res = await withSession(env, route, s, request, url, (sess) =>
        nodeFetch(route, sess, `${path}?${upstreamQuery(url, sess.token)}`, { method: request.method, headers: passHeaders(request) }));
    if (res.error) return json({ message: res.error }, 503);
    return finish(res.r, res.sess.token, s.token, path);
}

// POST /Sessions/Playing[/Progress|/Stopped]：改写成节点上的条目再上报；顺带续 / 放并发槽位。
export async function playing(env, request, url, s, kind) {
    const raw = await request.text().catch(() => '');
    let body = {};
    try { body = JSON.parse(raw) || {}; } catch (e) { }
    const vid = String(body.ItemId ?? body.itemId ?? '');
    if (!/^\d+$/.test(vid)) return empty();
    const c = await resolveCopy(env, s, vid, body.MediaSourceId ?? body.mediaSourceId, body.PlaySessionId ?? body.playSessionId);
    if (!c) return empty();
    await recordWatch(env, s, kind, { ItemId: vid, PositionTicks: body.PositionTicks ?? body.positionTicks });
    body.ItemId = c.src.item_id;
    if (c.msid) body.MediaSourceId = c.msid;
    delete body.NowPlayingQueue; delete body.PlaylistItemId; // 里面是 vid，节点不认识
    const device = deviceOf(s, request, url);
    const slot = slotOf(s, c.src.prefix);
    await (kind === 'stopped' ? releaseSlot(env, slot, device) : heartbeatSlot(env, slot, device));
    const path = '/Sessions/Playing' + (kind === 'playing' ? '' : kind === 'progress' ? '/Progress' : '/Stopped');
    const res = await withSession(env, c.route, s, request, url, (sess) =>
        nodeFetch(c.route, sess, path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }));
    res.r?.body?.cancel().catch(() => {});
    return empty();
}

async function recordWatch(env, s, kind, body) {
    const k = `${s.viewerId}|${body.ItemId}`; const now = Date.now();
    if (kind === 'progress') {
        if (now - (PROGRESS_MEM.get(k) || 0) < PROGRESS_WRITE_MS) return;
        PROGRESS_MEM.set(k, now);
        if (PROGRESS_MEM.size > 1000) PROGRESS_MEM.delete(PROGRESS_MEM.keys().next().value);
    } else PROGRESS_MEM.delete(k);
    await recordPlayback(env, watchSession(s), kind, body, (id) => watchMeta(env, s.scope, id), now)
        .catch(e => console.log('agg watch write failed:', e && e.message || e));
}

// POST /Sessions/Playing/Ping、DELETE /Videos/ActiveEncodings：凭 PlaySessionId 找回节点转发。
export async function byPlaySession(env, request, url, s, path) {
    const p = await lookupPlay(env, param(url, 'PlaySessionId'));
    if (!p || !s.scope.prefixes.includes(p.prefix)) return empty();
    const route = (await memberRoutes(env)).find(r => r.prefix === p.prefix);
    if (!route) return empty();
    const res = await withSession(env, route, s, request, url, (sess) =>
        nodeFetch(route, sess, `${path}?${upstreamQuery(url, sess.token)}`, { method: request.method }));
    res.r?.body?.cancel().catch(() => {});
    if (path.toLowerCase().endsWith('/ping')) await heartbeatSlot(env, slotOf(s, p.prefix), deviceOf(s, request, url));
    return empty();
}

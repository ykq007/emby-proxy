// 聚合 Worker 访问各节点的上游会话。
// - 同步会话：每节点用一台真实 viewer 设备自己的会话（真实 DeviceId，不另造设备，见 syncDevice）；用于后台同步与目录。
// - 设备会话：viewer 设备自己的会话。优先用生产代理里该设备已有的会话（只读 viewer_device_sessions），
//   节点上同一台设备就只有一个登录，和用代理时一样；没有才自己登录，存 agg_device_sessions（不写生产表）。
// 登录复用生产的 loginUpstream（同一套凭据解析 + 日志里的真实非浏览器 UA）。
import { dbAll, dbFirst, dbRun } from '../db/helpers.js';
import { encryptToken, decryptToken } from '../emby/tokens.js';
import { fetchEmbyJsonWithFallback } from '../emby/client.js';
import { parseCustomHeadersForProbe, isBrowserUa } from '../emby/headers.js';
import { loginUpstream, identityHeaders, getDeviceSession } from '../viewers/upstream.js';
import { forwardToNode } from '../proxy/forward.js';
import { getConfig } from '../proxy/config-cache.js';
import { nodeBase } from './ids.js';

const MEM = new Map(); // prefix -> session（同步 / 详情 / 图片）
const PICK = new Map(); // prefix -> 同步用的那台真实设备的身份
const DEV_MEM = new Map(); // `${prefix}\n${deviceId}` -> session（播放：每个 viewer 设备一个）
const ROUTES_TTL_MS = 60000;
let routesMem = null; // { at, routes }

export function __resetAggUpstreamForTest() { MEM.clear(); DEV_MEM.clear(); PICK.clear(); routesMem = null; }

// 聚合成员节点：开启了 viewers 的节点；env.AGG_NODES（逗号分隔）只取这些，env.AGG_EXCLUDE_NODES 去掉这些。
// 节点退出成员后，下一轮同步自动清掉它在目录里的副本（sync.js → forgetPrefix）。
export async function memberRoutes(env, now = Date.now()) {
    if (routesMem && now - routesMem.at < ROUTES_TTL_MS) return routesMem.routes;
    const list = (v) => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
    const only = list(env.AGG_NODES); const skip = list(env.AGG_EXCLUDE_NODES);
    const res = await dbAll(env,
        `SELECT prefix, target, custom_headers, mode, cache_img, remark, COALESCE(sort_order, 0) AS sort_order FROM routes
          WHERE viewers_enabled = 1 ORDER BY sort_order, prefix`);
    const routes = (res.results || []).filter(r => (!only.length || only.includes(r.prefix)) && !skip.includes(r.prefix));
    routesMem = { at: now, routes };
    return routes;
}

export const bases = (route) => String(route.target || '').split(',').map(s => s.trim()).filter(Boolean);

// 同步用哪台设备：agg_sessions 记着（{ real: true, ident }）。旧版存的是随机 DeviceId 设备的会话：登出、删掉，换一台真实设备。
async function syncDevice(env, route) {
    const prefix = route.prefix;
    if (PICK.has(prefix)) return PICK.get(prefix);
    const row = await dbFirst(env, `SELECT blob FROM agg_sessions WHERE prefix = ?`, prefix);
    let saved = null;
    try { saved = row && JSON.parse(await decryptToken(env, prefix, row.blob) || 'null'); } catch (e) { }
    if (saved && saved.real && saved.ident) { PICK.set(prefix, saved.ident); return saved.ident; }
    if (saved && saved.token) {
        const r = await nodeFetch(env, route, saved, '/Sessions/Logout', { method: 'POST' }).catch(() => null);
        r?.body?.cancel().catch(() => {});
    }
    const ident = await syncIdent(env, prefix);
    if (!ident) return null;
    await dbRun(env, `INSERT OR REPLACE INTO agg_sessions (prefix, blob) VALUES (?, ?)`, prefix, await encryptToken(env, prefix, JSON.stringify({ real: true, ident })));
    PICK.set(prefix, ident);
    return ident;
}

// 同步 / 目录用的会话：那台真实设备在这个节点的会话。生产代理或聚合端已有就直接用（节点上还是那一个设备、那一个登录）；
// 没有才以它的真实身份登录一次，和它自己来播放时一样（存 agg_device_sessions，之后播放也共用）。
async function session(env, route, fresh = false, failedToken = '') {
    const ident = await syncDevice(env, route);
    if (!ident) return { error: 'no real client identity yet: no viewer device has used any node' };
    if (!fresh && MEM.has(route.prefix)) return MEM.get(route.prefix);
    const s = await deviceSession(env, route, ident, fresh, null, failedToken);
    if (!s.error) MEM.set(route.prefix, s);
    return s;
}

// 同步用的真实设备：用过节点的 viewer 设备（该节点的优先），身份原样照用，包括它自己的 DeviceId。浏览器 UA 的设备不用。
// env.AGG_SYNC_VIEWER（viewer 用户名）：只用这个 viewer 的设备（真实设备 Id 会出现在节点上，不能借别人的设备）。
export async function syncIdent(env, prefix) {
    const owner = String(env.AGG_SYNC_VIEWER || '').trim();
    const mine = owner ? `WHERE device_id IN (SELECT t.device_id FROM viewer_tokens t JOIN viewers v ON v.id = t.viewer_id WHERE v.username = ?1
                                      UNION SELECT t.device_id FROM agg_tokens t JOIN viewers v ON v.id = t.viewer_id WHERE v.username = ?1)` : '';
    const res = await dbAll(env,
        `SELECT prefix, blob FROM (SELECT prefix, device_id, blob FROM viewer_device_sessions
          UNION ALL SELECT prefix, device_id, blob FROM agg_device_sessions) ${mine} ORDER BY (prefix = ?2) DESC, prefix, blob`, owner, prefix);
    for (const row of res.results || []) {
        let id = null;
        try { id = JSON.parse(await decryptToken(env, row.prefix, row.blob) || 'null')?.ident; } catch (e) { }
        if (!id || !id.client || !id.deviceId || !id.ua || isBrowserUa(id.ua)) continue;
        return { client: id.client, device: id.device, deviceId: id.deviceId, version: id.version, ua: id.ua };
    }
    return null;
}

// 某 viewer 设备在任一节点登录过的真实身份（Client / Device / Version / UA），没有返回 null。
export async function knownIdent(env, deviceId) {
    const res = await dbAll(env, `SELECT prefix, blob FROM agg_device_sessions WHERE device_id = ? LIMIT 5`, deviceId);
    for (const row of res.results || []) {
        let id = null;
        try { id = JSON.parse(await decryptToken(env, row.prefix, row.blob) || 'null')?.ident; } catch (e) { }
        if (id && id.client && id.ua && !isBrowserUa(id.ua)) return id;
    }
    return null;
}

// 播放用的设备会话：以客户端设备自己的身份（Client / Device / DeviceId / Version / UA）登录节点，
// 与生产 viewer 网关一致——上游看到的是真实的那台设备。存 agg_device_sessions。
// fixIdent：请求里没有客户端身份（取流请求常常只带令牌）时，登录前用它换成该设备的真实身份；换不到就不登录。
// failedToken：fresh 时刚被节点拒掉的令牌；聚合端表里已有另一份（别的 isolate 刚登录的）就用它，不再登录。
export async function deviceSession(env, route, ident, fresh = false, fixIdent = null, failedToken = '') {
    const k = route.prefix + '\n' + ident.deviceId;
    if (fresh && failedToken) {
        const row = await dbFirst(env, `SELECT blob FROM agg_device_sessions WHERE prefix = ? AND device_id = ?`, route.prefix, ident.deviceId);
        try {
            const s = row && JSON.parse(await decryptToken(env, route.prefix, row.blob) || 'null');
            if (s && s.token && s.userId && s.token !== failedToken) { DEV_MEM.set(k, s); return s; }
        } catch (e) { }
    }
    if (!fresh) {
        if (DEV_MEM.has(k)) return DEV_MEM.get(k);
        const shared = await getDeviceSession(env, route.prefix, ident.deviceId).catch(() => null);
        if (shared) { DEV_MEM.set(k, shared); return shared; }
        const row = await dbFirst(env, `SELECT blob FROM agg_device_sessions WHERE prefix = ? AND device_id = ?`, route.prefix, ident.deviceId);
        if (row) {
            try {
                const s = JSON.parse(await decryptToken(env, route.prefix, row.blob) || 'null');
                if (s && s.token && s.userId) { DEV_MEM.set(k, s); return s; }
            } catch (e) { }
        }
    }
    if (fixIdent) {
        const fixed = await fixIdent(ident);
        if (!fixed) return { error: 'no client identity for this device yet' };
        ident = fixed;
    }
    const s = await loginUpstream(env, route.prefix, ident);
    if (s.error) return s;
    DEV_MEM.set(k, s);
    await dbRun(env, `INSERT OR REPLACE INTO agg_device_sessions (prefix, device_id, blob) VALUES (?, ?, ?)`,
        route.prefix, ident.deviceId, await encryptToken(env, route.prefix, JSON.stringify(s)));
    return s;
}

// 发给节点：经 proxy/forward.js，与生产代理同一套（多地址故障转移、协议回退、403 换头、超时、
// 3xx 与正文里节点地址的改写，改写后的地址在本 Worker 的 /n/<前缀>/ 下）。pathQuery 不带 /emby 前缀。
// init.request：正在处理的客户端请求，决定本 Worker 的 origin。默认照它的头发（只把 viewer 令牌 init.token
//   换成节点令牌，与生产 viewer 网关一样除令牌外原样转发）；init.own：聚合端自己发的请求（能力报告、
//   附加版本的 PlaybackInfo、登出），改用会话里的设备身份。init.headers 覆盖在最后。
// init.dropToken：带 viewer 令牌的头去掉而不是换成节点令牌（发往别的主机时）。
// init.exact：pathQuery 已是节点上的完整路径（含 /emby 或指向别的主机的绝对地址的路径），不再加 /emby。
export async function nodeFetch(env, route, sess, pathQuery, init = {}) {
    const { request, token } = init;
    let headers;
    if (request && !init.own) {
        headers = new Headers(request.headers);
        for (const [k, v] of [...headers]) {
            if (!token || !v.includes(token)) continue;
            if (init.dropToken) headers.delete(k); else headers.set(k, v.split(token).join(sess.token));
        }
        headers.delete('Content-Length');
    } else headers = new Headers(identityHeaders(sess.ident, sess.token));
    for (const [k, v] of Object.entries(init.headers || {})) headers.set(k, v);
    const u = new URL((init.exact ? '' : '/emby') + pathQuery, request ? request.url : 'https://aggregate.invalid');
    const req = new Request(u, { method: init.method || 'GET', headers, body: init.body });
    let manualRedirectSet = null;
    try { manualRedirectSet = (await getConfig(env)).config.manualRedirectSet; } catch (e) { }
    return forwardToNode(req, env, null, {
        targets: bases(route), path: u.pathname, search: u.search, mode: route.mode, customHeaders: route.custom_headers,
        cache: route.cache_img !== 'off', publicPrefix: nodeBase(route.prefix), manualRedirectSet,
    });
}

function headersFor(route, s) {
    return { ...identityHeaders(s.ident, s.token), ...parseCustomHeadersForProbe(route.custom_headers) };
}

// GET 节点 JSON。pathQuery 不带 /emby 前缀，可用 {uid} 占位上游用户 Id。
// 返回 { data } / { error }。令牌失效时重新登录一次。
// 浏览用：该设备在这个节点已有的会话（生产代理的或聚合端的），没有返回 null。只读，不为浏览去登录。
export async function browseSession(env, route, deviceId) {
    if (!deviceId) return null;
    try { return await deviceSession(env, route, { deviceId }, false, async () => null).then(x => (x && x.token ? x : null)); } catch (e) { return null; }
}

// opts.deviceId：用该设备自己的会话发（和用代理浏览时节点看到的一样）；它在这个节点没有会话或被拒时用同步会话。
export async function nodeJson(env, route, pathQuery, opts = {}) {
    const dev = await browseSession(env, route, opts.deviceId);
    if (dev) {
        const pq = pathQuery.replace('{uid}', encodeURIComponent(dev.userId));
        for (const base of bases(route)) {
            const r = await fetchEmbyJsonWithFallback(base, ['/emby' + pq, pq],
                { headers: headersFor(route, dev), timeoutMs: opts.timeoutMs || 15000, fetchImpl: opts.fetchImpl });
            if (r && r.data !== undefined) return { data: r.data };
            if (r && r.unauthorized) break;
        }
    }
    let s = await session(env, route);
    for (let attempt = 0; attempt < 2; attempt++) {
        if (s.error) return { error: s.error };
        const pq = pathQuery.replace('{uid}', encodeURIComponent(s.userId));
        let unauthorized = false;
        for (const base of bases(route)) {
            const r = await fetchEmbyJsonWithFallback(base, ['/emby' + pq, pq],
                { headers: headersFor(route, s), timeoutMs: opts.timeoutMs || 15000, fetchImpl: opts.fetchImpl });
            if (r && r.data !== undefined) return { data: r.data };
            if (r && r.unauthorized) { unauthorized = true; break; }
        }
        if (!unauthorized) return { error: 'upstream unreachable' };
        MEM.delete(route.prefix);
        s = await session(env, route, true, s.token);
    }
    return { error: 'upstream rejected the session' };
}

// 原样取节点的二进制响应（图片）。
export async function nodeRaw(env, route, pathQuery, deviceId = '') {
    const s = (await browseSession(env, route, deviceId)) || await session(env, route);
    if (s.error) return null;
    for (const base of bases(route)) {
        try {
            const r = await fetch(base.replace(/\/+$/, '') + '/emby' + pathQuery, { headers: headersFor(route, s), redirect: 'follow' });
            if (r.ok) return r;
            r.body?.cancel().catch(() => {});
        } catch (e) { }
    }
    return null;
}

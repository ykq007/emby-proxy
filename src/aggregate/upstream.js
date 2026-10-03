// 聚合 Worker 访问各节点的上游会话：每节点一个（设备 agg-<prefix>），存 agg_sessions。
// 登录复用生产的 loginUpstream（同一套凭据解析 + 日志里的真实非浏览器 UA），
// 但会话存在自己的表里，不写生产的 viewer_device_sessions。
import { dbAll, dbFirst, dbRun } from '../db/helpers.js';
import { encryptToken, decryptToken } from '../emby/tokens.js';
import { fetchEmbyJsonWithFallback } from '../emby/client.js';
import { parseCustomHeadersForProbe } from '../emby/headers.js';
import { loginUpstream, identityHeaders } from '../viewers/upstream.js';
import { orderUpstreamsByHealth, markUpstreamFailure, markUpstreamSuccess } from '../proxy/circuit-breaker.js';

const MEM = new Map(); // prefix -> session（同步 / 详情 / 图片）
const DEV_MEM = new Map(); // `${prefix}\n${deviceId}` -> session（播放：每个 viewer 设备一个）
const ROUTES_TTL_MS = 60000;
let routesMem = null; // { at, routes }

export function __resetAggUpstreamForTest() { MEM.clear(); DEV_MEM.clear(); routesMem = null; }

// 聚合成员节点：开启了 viewers 的节点；env.AGG_NODES（逗号分隔）可进一步限定。
export async function memberRoutes(env, now = Date.now()) {
    if (routesMem && now - routesMem.at < ROUTES_TTL_MS) return routesMem.routes;
    const only = String(env.AGG_NODES || '').split(',').map(s => s.trim()).filter(Boolean);
    const res = await dbAll(env,
        `SELECT prefix, target, custom_headers, COALESCE(sort_order, 0) AS sort_order FROM routes
          WHERE viewers_enabled = 1 ORDER BY sort_order, prefix`);
    const routes = (res.results || []).filter(r => !only.length || only.includes(r.prefix));
    routesMem = { at: now, routes };
    return routes;
}

export const bases = (route) => String(route.target || '').split(',').map(s => s.trim()).filter(Boolean);

async function session(env, route, fresh = false) {
    const prefix = route.prefix;
    if (!fresh) {
        if (MEM.has(prefix)) return MEM.get(prefix);
        const row = await dbFirst(env, `SELECT blob FROM agg_sessions WHERE prefix = ?`, prefix);
        if (row) {
            try {
                const s = JSON.parse(await decryptToken(env, prefix, row.blob) || 'null');
                if (s && s.token && s.userId) { MEM.set(prefix, s); return s; }
            } catch (e) { }
        }
    }
    const ident = { client: 'Forward', device: 'Forward Aggregate', deviceId: 'agg-' + prefix, version: '1.0.0', ua: '' };
    const s = await loginUpstream(env, prefix, ident);
    if (s.error) return s;
    MEM.set(prefix, s);
    await dbRun(env, `INSERT OR REPLACE INTO agg_sessions (prefix, blob) VALUES (?, ?)`, prefix, await encryptToken(env, prefix, JSON.stringify(s)));
    return s;
}

// 播放用的设备会话：以客户端设备自己的身份（Client / Device / DeviceId / Version / UA）登录节点，
// 与生产 viewer 网关一致——上游看到的是真实的那台设备。存 agg_device_sessions。
export async function deviceSession(env, route, ident, fresh = false) {
    const k = route.prefix + '\n' + ident.deviceId;
    if (!fresh) {
        if (DEV_MEM.has(k)) return DEV_MEM.get(k);
        const row = await dbFirst(env, `SELECT blob FROM agg_device_sessions WHERE prefix = ? AND device_id = ?`, route.prefix, ident.deviceId);
        if (row) {
            try {
                const s = JSON.parse(await decryptToken(env, route.prefix, row.blob) || 'null');
                if (s && s.token && s.userId) { DEV_MEM.set(k, s); return s; }
            } catch (e) { }
        }
    }
    const s = await loginUpstream(env, route.prefix, ident);
    if (s.error) return s;
    DEV_MEM.set(k, s);
    await dbRun(env, `INSERT OR REPLACE INTO agg_device_sessions (prefix, device_id, blob) VALUES (?, ?, ?)`,
        route.prefix, ident.deviceId, await encryptToken(env, route.prefix, JSON.stringify(s)));
    return s;
}

// 原样把请求发给节点（播放 / 流）。按熔断状态排序节点的多个地址，网络错误记一次失败换下一个。
// pathQuery 不带 /emby 前缀；init.headers 只放调用方白名单过的客户端头（Range / Accept / Content-Type…），
// 身份与令牌一律由会话决定。返回 Response 或 null（全部地址不可达）。
export async function nodeFetch(route, sess, pathQuery, init = {}) {
    const urls = bases(route);
    const now = Date.now();
    for (const i of orderUpstreamsByHealth(urls, now)) {
        const headers = { ...headersFor(route, sess), ...(init.headers || {}) };
        try {
            const r = await fetch(urls[i].replace(/\/+$/, '') + '/emby' + pathQuery,
                { method: init.method || 'GET', headers, body: init.body, redirect: 'manual' });
            markUpstreamSuccess(urls[i]);
            return r;
        } catch (e) {
            markUpstreamFailure(urls[i], now);
        }
    }
    return null;
}

function headersFor(route, s) {
    return { ...identityHeaders(s.ident, s.token), ...parseCustomHeadersForProbe(route.custom_headers) };
}

// GET 节点 JSON。pathQuery 不带 /emby 前缀，可用 {uid} 占位上游用户 Id。
// 返回 { data } / { error }。令牌失效时重新登录一次。
export async function nodeJson(env, route, pathQuery, opts = {}) {
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
        s = await session(env, route, true);
    }
    return { error: 'upstream rejected the session' };
}

// 原样取节点的二进制响应（图片）。
export async function nodeRaw(env, route, pathQuery) {
    const s = await session(env, route);
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

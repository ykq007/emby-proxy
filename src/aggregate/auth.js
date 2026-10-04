// 聚合端的 viewer 登录与令牌。账号、密码、节点授权都读生产的 viewers / viewer_access（只读）；
// 令牌是聚合端自己的（ea_ 前缀，存 agg_tokens）。令牌里记了密码哈希的指纹：
// 管理端改密码后，聚合端令牌随之失效，无需改动生产代码。
import { dbAll, dbFirst, dbRun } from '../db/helpers.js';
import { rateLimitFixedWindow, resp429 } from '../db/rate-limit.js';
import { verifyPassword, sha256Hex, randomHex } from '../viewers/store.js';
import { memberRoutes } from './upstream.js';
import { isBrowserUa, BROWSER_BLOCKED_MESSAGE } from '../emby/headers.js';

export const AGG_TOKEN_PREFIX = 'ea_';
const TTL_MS = 60000;
const RESOLVE_MEM = new Map(); // token -> { at, s }
let serverIdMem = null;

export function __resetAggAuthForTest() { RESOLVE_MEM.clear(); serverIdMem = null; }

export async function serverId(env) {
    if (serverIdMem) return serverIdMem;
    let row = await dbFirst(env, `SELECT v FROM agg_meta WHERE k = 'server_id'`);
    if (!row) {
        await dbRun(env, `INSERT OR IGNORE INTO agg_meta (k, v) VALUES ('server_id', ?)`, randomHex(16));
        row = await dbFirst(env, `SELECT v FROM agg_meta WHERE k = 'server_id'`);
    }
    serverIdMem = row.v;
    return serverIdMem;
}

const pwFingerprint = async (hash) => (await sha256Hex('agg:' + hash)).slice(0, 16);

// 该 viewer 在聚合里能看到的节点与隐藏媒体库。
export async function viewerScope(env, viewerId) {
    const members = await memberRoutes(env);
    const memberSet = new Set(members.map(r => r.prefix));
    const rows = (await dbAll(env, `SELECT prefix, quota, hidden_libraries FROM viewer_access WHERE viewer_id = ?`, viewerId)).results || [];
    const hidden = new Map(); const prefixes = []; const quota = new Map();
    for (const r of rows) {
        if (!memberSet.has(r.prefix)) continue;
        prefixes.push(r.prefix);
        quota.set(r.prefix, Number(r.quota) || 0);
        let h = [];
        try { h = JSON.parse(r.hidden_libraries || '[]'); } catch (e) { }
        if (Array.isArray(h) && h.length) hidden.set(r.prefix, new Set(h.map(String)));
    }
    return { prefixes, hidden, quota, all: prefixes.length === memberSet.size && hidden.size === 0 };
}

export async function login(env, request, body, ident) {
    const username = String(body.Username ?? body.username ?? '');
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
    const now = Date.now();
    if (ip) {
        const ban = await dbFirst(env, `SELECT until FROM ip_bans WHERE ip = ?`, ip);
        if (ban && ban.until > now) return { response: resp429(ban.until - now) };
    }
    const row = username ? await dbFirst(env, `SELECT id, username, password, enabled FROM viewers WHERE username = ? COLLATE NOCASE`, username) : null;
    const ok = row && row.enabled && await verifyPassword(body.Pw ?? body.Password ?? body.pw ?? '', row.password);
    if (!ok) {
        const limited = ip ? await rateLimitFixedWindow(env, ip, now,
            { table: 'agg_auth_rl', minuteLimit: 12, hourlyLimit: 100, banMs: 3600000, reason: 'agg-viewer-bruteforce' }) : null;
        return { response: limited || null };
    }
    if (isBrowserUa(request.headers.get('User-Agent'))) return { response: Response.json({ message: BROWSER_BLOCKED_MESSAGE }, { status: 403 }) };
    const scope = await viewerScope(env, row.id);
    if (!scope.prefixes.length) return { response: null };
    const token = AGG_TOKEN_PREFIX + randomHex(16);
    await dbRun(env, `INSERT INTO agg_tokens (token_hash, viewer_id, device_id, pw_fp, created_at) VALUES (?, ?, ?, ?, ?)`,
        await sha256Hex(token), row.id, String(ident.deviceId || ''), await pwFingerprint(row.password), now);
    return { token, viewer: { id: row.id, username: row.username } };
}

// 令牌 → { viewerId, username, deviceId, token, scope }；无效返回 null。60s isolate 缓存。
export async function resolveToken(env, token, now = Date.now()) {
    if (!token || !token.startsWith(AGG_TOKEN_PREFIX)) return null;
    const hit = RESOLVE_MEM.get(token);
    if (hit && now - hit.at < TTL_MS) return hit.s;
    const row = await dbFirst(env,
        `SELECT t.viewer_id, t.device_id, t.pw_fp, v.username, v.password
           FROM agg_tokens t JOIN viewers v ON v.id = t.viewer_id AND v.enabled = 1
          WHERE t.token_hash = ?`, await sha256Hex(token));
    let s = null;
    if (row && row.pw_fp === await pwFingerprint(row.password)) {
        const scope = await viewerScope(env, row.viewer_id);
        // scope.deviceId：浏览（详情 / 剧集列表 / 图片）用该设备自己在节点上的会话，见 upstream.js 的 browseSession。
        if (scope.prefixes.length) s = { viewerId: row.viewer_id, username: row.username, deviceId: row.device_id || '', token, scope: { ...scope, deviceId: row.device_id || '' } };
    }
    if (s) RESOLVE_MEM.set(token, { at: now, s });
    return s;
}

export async function revokeToken(env, token) {
    RESOLVE_MEM.delete(token);
    await dbRun(env, `DELETE FROM agg_tokens WHERE token_hash = ?`, await sha256Hex(token));
}

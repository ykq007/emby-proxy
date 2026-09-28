// 节点的上游账号会话：viewer 流量统一以它的身份访问 Emby。
// 凭据复用节点已有的 emby_username/emby_password_enc（或全局共享凭据），
// 用独立 DeviceId（<prefix>-viewers）登录，避免顶掉媒体计数用的那个会话。
// 会话 { token, userId, serverId } 加密后存 viewer_upstream，isolate 内再缓存一层。
import { dbFirst, dbRun } from '../db/helpers.js';
import { encryptToken, decryptToken } from '../emby/tokens.js';
import { resolveCreds, DEFAULT_EMBY_UA } from '../emby/auth.js';
import { fetchEmbyJsonWithFallback } from '../emby/client.js';
import { buildEmbyLoginHeaders } from '../emby/headers.js';

const MEM = new Map(); // prefix -> session

export async function getUpstreamSession(env, prefix, ua) {
    if (MEM.has(prefix)) return MEM.get(prefix);
    const row = await dbFirst(env, `SELECT blob FROM viewer_upstream WHERE prefix = ?`, prefix);
    if (row) {
        try {
            const s = JSON.parse(await decryptToken(env, prefix, row.blob) || 'null');
            if (s && s.token && s.userId) { MEM.set(prefix, s); return s; }
        } catch (e) { }
    }
    const s = await loginUpstream(env, prefix, ua);
    if (!s) return null;
    MEM.set(prefix, s);
    await dbRun(env, `INSERT OR REPLACE INTO viewer_upstream (prefix, blob) VALUES (?, ?)`,
        prefix, await encryptToken(env, prefix, JSON.stringify(s)));
    return s;
}

// 上游返回 401 时调用：下次请求重新登录。
export async function dropUpstreamSession(env, prefix) {
    MEM.delete(prefix);
    await dbRun(env, `DELETE FROM viewer_upstream WHERE prefix = ?`, prefix);
}

export function __resetUpstreamMemForTest() { MEM.clear(); }

async function loginUpstream(env, prefix, ua) {
    const route = await dbFirst(env, `SELECT prefix, target, emby_username, emby_password_enc FROM routes WHERE prefix = ?`, prefix);
    if (!route) return null;
    const creds = await resolveCreds(env, route);
    if (!creds || !creds.username) return null;
    const headers = buildEmbyLoginHeaders(prefix + '-viewers', ua || DEFAULT_EMBY_UA);
    const body = JSON.stringify({ Username: creds.username, Pw: creds.password || '' });
    for (const base of String(route.target || '').split(',').map(s => s.trim()).filter(Boolean)) {
        const r = await fetchEmbyJsonWithFallback(base, ['/emby/Users/AuthenticateByName', '/Users/AuthenticateByName'],
            { method: 'POST', headers, body, timeoutMs: 10000 });
        if (r && r.unauthorized) return null;
        const d = r && r.data;
        if (d && d.AccessToken && d.User && d.User.Id) {
            return { token: d.AccessToken, userId: d.User.Id, serverId: d.ServerId || d.User.ServerId || '' };
        }
    }
    return null;
}

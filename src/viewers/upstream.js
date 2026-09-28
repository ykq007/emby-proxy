// 节点的上游账号会话：viewer 流量统一以它的身份访问 Emby。
// 凭据复用节点已有的 emby_username/emby_password_enc（或全局共享凭据），
// 用独立 DeviceId（<prefix>-viewers）登录，避免顶掉媒体计数用的那个会话。
// 会话 { token, userId, serverId } 加密后存 viewer_upstream，isolate 内再缓存一层。
// 登录请求的身份与反代流量一致：节点自定义请求头优先，UA 取该节点最近的真实客户端 UA——
// 不用管理员/viewer 当下的浏览器 UA，部分上游 WAF 会对浏览器 UA 直接 403。
import { dbFirst, dbRun } from '../db/helpers.js';
import { encryptToken, decryptToken } from '../emby/tokens.js';
import { resolveCreds } from '../emby/auth.js';
import { fetchEmbyJsonWithFallback } from '../emby/client.js';
import { buildEmbyLoginHeaders, parseCustomHeadersForProbe } from '../emby/headers.js';

const FALLBACK_UA = 'Emby/4.8 (Forward)';

// 上游会话登录所用的设备 ID。部分 Emby 会把令牌绑定到登录设备，转发时必须沿用它。
export const upstreamDeviceId = (prefix) => prefix + '-viewers';

const MEM = new Map(); // prefix -> session

export async function getUpstreamSession(env, prefix) {
    if (MEM.has(prefix)) return MEM.get(prefix);
    const row = await dbFirst(env, `SELECT blob FROM viewer_upstream WHERE prefix = ?`, prefix);
    if (row) {
        try {
            const s = JSON.parse(await decryptToken(env, prefix, row.blob) || 'null');
            if (s && s.token && s.userId) { MEM.set(prefix, s); return s; }
        } catch (e) { }
    }
    const s = await loginUpstream(env, prefix);
    if (!s || s.error) return null;
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

// 管理端开启开关前的校验：实际登录一次，失败时给出原因。成功则缓存会话。
export async function checkUpstreamLogin(env, prefix) {
    await dropUpstreamSession(env, prefix);
    const s = await loginUpstream(env, prefix);
    if (!s || s.error) return (s && s.error) || '上游登录失败';
    MEM.set(prefix, s);
    await dbRun(env, `INSERT OR REPLACE INTO viewer_upstream (prefix, blob) VALUES (?, ?)`,
        prefix, await encryptToken(env, prefix, JSON.stringify(s)));
    return null;
}

async function loginUpstream(env, prefix) {
    const route = await dbFirst(env, `SELECT prefix, target, custom_headers, emby_username, emby_password_enc FROM routes WHERE prefix = ?`, prefix);
    if (!route) return { error: '节点不存在' };
    const creds = await resolveCreds(env, route);
    if (!creds || !creds.username) return { error: '节点没有 Emby 账号：请在「部署节点」编辑该节点，填写「媒体计数账号」的用户名/密码，或设置全局共享账号' };
    const who = `${creds.source === 'shared' ? '全局共享账号' : '节点账号'}「${creds.username}」`;
    let error = `无法连接上游或上游返回异常（${who}）`;
    const recent = await dbFirst(env,
        `SELECT ua FROM visitor_logs WHERE prefix = ? AND ua NOT IN ('', 'Unknown') AND ua NOT LIKE 'Mozilla%' ORDER BY id DESC LIMIT 1`, prefix);
    const headers = { ...buildEmbyLoginHeaders(upstreamDeviceId(prefix), (recent && recent.ua) || FALLBACK_UA), ...parseCustomHeadersForProbe(route.custom_headers) };
    const body = JSON.stringify({ Username: creds.username, Pw: creds.password || '' });
    for (const base of String(route.target || '').split(',').map(s => s.trim()).filter(Boolean)) {
        const r = await fetchEmbyJsonWithFallback(base, ['/emby/Users/AuthenticateByName', '/Users/AuthenticateByName'],
            { method: 'POST', headers, body, timeoutMs: 10000 });
        if (r && r.unauthorized) return { error: `上游拒绝登录（401/403）：${who}的用户名或密码不对，或上游拦截了该客户端（可在节点自定义请求头里设置 User-Agent）` };
        const d = r && r.data;
        if (d && d.AccessToken && d.User && d.User.Id) {
            return { token: d.AccessToken, userId: d.User.Id, serverId: d.ServerId || d.User.ServerId || '' };
        }
        if (d) error = `上游返回了意外的登录响应（${who}）`;
    }
    return { error };
}

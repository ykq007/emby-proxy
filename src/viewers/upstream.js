// 节点上游账号的会话：每个 viewer 设备各自登录一次上游，用该设备自己的客户端身份
// （Client / Device / DeviceId / Version / UA）。上游因此看到的是真实的多台设备，
// 与客户端直连时一致；绑定设备的令牌（如 sntp）也自然成立。
// 凭据复用节点的 emby_username/emby_password_enc（或全局共享凭据）。
// 会话 { token, userId, serverId, ident } 加密存 viewer_device_sessions，isolate 内再缓存一层。
import { dbFirst, dbRun } from '../db/helpers.js';
import { encryptToken, decryptToken } from '../emby/tokens.js';
import { resolveCreds, getRecentUa, DEFAULT_EMBY_UA } from '../emby/auth.js';
import { fetchEmbyJsonWithFallback } from '../emby/client.js';
import { parseCustomHeadersForProbe } from '../emby/headers.js';

const MEM = new Map(); // `${prefix}\n${deviceId}` -> session

// 从请求里取客户端身份：X-Emby-Authorization / Authorization 头、URL 里的同名参数、X-Emby-* 头。
export function clientIdentity(request, url, fallbackDeviceId = '') {
    const h = request.headers;
    const src = [h.get('X-Emby-Authorization'), h.get('Authorization'), url.searchParams.get('X-Emby-Authorization')]
        .filter(Boolean).find(s => /DeviceId=/i.test(s)) || h.get('X-Emby-Authorization') || h.get('Authorization') || '';
    const field = (name) => (new RegExp('\\b' + name + '="?([^",]*)', 'i').exec(src) || [])[1] || '';
    const q = (k) => url.searchParams.get(k) || url.searchParams.get(k.toLowerCase()) || '';
    return {
        client: field('Client') || h.get('X-Emby-Client') || 'Emby',
        device: field('Device') || h.get('X-Emby-Device-Name') || 'Emby',
        deviceId: field('DeviceId') || h.get('X-Emby-Device-Id') || q('DeviceId') || fallbackDeviceId,
        version: field('Version') || h.get('X-Emby-Client-Version') || '1.0.0',
        ua: h.get('User-Agent') || '',
    };
}

export function identityHeaders(ident, token) {
    const clean = (s) => String(s || '').replace(/"/g, '');
    const auth = `MediaBrowser Client="${clean(ident.client)}", Device="${clean(ident.device)}", ` +
        `DeviceId="${clean(ident.deviceId)}", Version="${clean(ident.version)}"` + (token ? `, Token="${clean(token)}"` : '');
    const hh = {
        'Accept': 'application/json',
        'X-Emby-Authorization': auth,
        'X-Emby-Client': clean(ident.client),
        'X-Emby-Device-Name': clean(ident.device),
        'X-Emby-Device-Id': clean(ident.deviceId),
        'X-Emby-Client-Version': clean(ident.version),
    };
    if (token) hh['X-Emby-Token'] = token;
    if (ident.ua) hh['User-Agent'] = ident.ua;
    return hh;
}

const memKey = (prefix, deviceId) => prefix + '\n' + deviceId;

export async function getDeviceSession(env, prefix, deviceId) {
    const k = memKey(prefix, deviceId);
    if (MEM.has(k)) return MEM.get(k);
    const row = await dbFirst(env, `SELECT blob FROM viewer_device_sessions WHERE prefix = ? AND device_id = ?`, prefix, deviceId);
    if (!row) return null;
    try {
        const s = JSON.parse(await decryptToken(env, prefix, row.blob) || 'null');
        if (s && s.token && s.userId) { MEM.set(k, s); return s; }
    } catch (e) { }
    return null;
}

// 以该设备身份登录上游并缓存。成功返回会话，失败返回 { error }。
export async function loginDevice(env, prefix, ident) {
    const s = await loginUpstream(env, prefix, ident);
    if (s.error) return s;
    MEM.set(memKey(prefix, ident.deviceId), s);
    await dbRun(env, `INSERT OR REPLACE INTO viewer_device_sessions (prefix, device_id, blob) VALUES (?, ?, ?)`,
        prefix, ident.deviceId, await encryptToken(env, prefix, JSON.stringify(s)));
    return s;
}

export async function dropDeviceSession(env, prefix, deviceId) {
    MEM.delete(memKey(prefix, deviceId));
    await dbRun(env, `DELETE FROM viewer_device_sessions WHERE prefix = ? AND device_id = ?`, prefix, deviceId);
}

export function clearDeviceSessionCache() { MEM.clear(); }

// 节点凭据变更：该节点所有设备会话作废，下次请求按各自设备身份重新登录。
export async function dropNodeSessions(env, prefix) {
    for (const k of [...MEM.keys()]) if (k.startsWith(prefix + '\n')) MEM.delete(k);
    await dbRun(env, `DELETE FROM viewer_device_sessions WHERE prefix = ?`, prefix);
}
export function __resetUpstreamMemForTest() { MEM.clear(); }

// 管理端用的临时会话（开关校验、媒体库列表）：登录 → fn(session) → 上游登出，不留设备。
export async function withTempSession(env, prefix, fn) {
    const ident = { client: 'Forward', device: 'Forward', deviceId: prefix + '-admin-check', version: '1.0.0', ua: '' };
    const s = await loginUpstream(env, prefix, ident);
    if (s.error) return { error: s.error };
    try { return { result: fn ? await fn(s) : null }; }
    finally {
        const route = await dbFirst(env, `SELECT target FROM routes WHERE prefix = ?`, prefix);
        const base = String(route?.target || '').split(',')[0].trim();
        if (base) await fetchEmbyJsonWithFallback(base, ['/emby/Sessions/Logout', '/Sessions/Logout'],
            { method: 'POST', headers: identityHeaders(s.ident, s.token), timeoutMs: 5000 }).catch(() => null);
    }
}

async function loginUpstream(env, prefix, ident) {
    const route = await dbFirst(env, `SELECT prefix, target, custom_headers, emby_username, emby_password_enc FROM routes WHERE prefix = ?`, prefix);
    if (!route) return { error: '节点不存在' };
    const creds = await resolveCreds(env, route);
    if (!creds || !creds.username) return { error: '节点没有 Emby 账号：请在「部署节点」编辑该节点，填写「媒体计数账号」的用户名/密码，或设置全局共享账号' };
    const who = `${creds.source === 'shared' ? '全局共享账号' : '节点账号'}「${creds.username}」`;
    // UA：客户端自己的；没有（管理端校验）时取该节点最近的非浏览器真实 UA——部分 WAF 对浏览器 UA 直接 403。
    const ua = ident.ua || (await getRecentUa(env, prefix)) || DEFAULT_EMBY_UA;
    const full = { ...ident, ua };
    // 节点自定义请求头与反代流量一致地覆盖在最后。
    const headers = { ...identityHeaders(full), 'Content-Type': 'application/json', ...parseCustomHeadersForProbe(route.custom_headers) };
    const body = JSON.stringify({ Username: creds.username, Pw: creds.password || '' });
    let error = `无法连接上游或上游返回异常（${who}）`;
    for (const base of String(route.target || '').split(',').map(s => s.trim()).filter(Boolean)) {
        const r = await fetchEmbyJsonWithFallback(base, ['/emby/Users/AuthenticateByName', '/Users/AuthenticateByName'],
            { method: 'POST', headers, body, timeoutMs: 10000 });
        if (r && r.unauthorized) return { error: `上游拒绝登录（401/403）：${who}的用户名或密码不对，或上游拦截了该客户端（可在节点自定义请求头里设置 User-Agent）` };
        const d = r && r.data;
        if (d && d.AccessToken && d.User && d.User.Id) {
            return { token: d.AccessToken, userId: d.User.Id, serverId: d.ServerId || d.User.ServerId || '', ident: full };
        }
        if (d) error = `上游返回了意外的登录响应（${who}）`;
    }
    return { error };
}

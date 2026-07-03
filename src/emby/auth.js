// 实时媒体计数的鉴权链：Emby 用户名/密码 → AuthenticateByName → 缓存 AccessToken。
// UA 优先取该节点 visitor_logs 中的真实 UA；无流量节点回退到通用浏览器 UA（DEFAULT_EMBY_UA）。
import { dbFirst } from '../db/helpers.js';
import { decryptSecret, encryptToken, decryptToken } from './tokens.js';
import { parseCustomHeaderEmbyToken } from './headers.js';
import { authenticateByNameFromEmby } from './client.js';
import { cacheEmbyAuthToken } from '../routing/route.js';
import { kvGet, EMBY_SHARED_USERNAME_KEY, EMBY_SHARED_PASSWORD_ENC_KEY } from '../db/kv.js';

// 兜底 UA：节点从未有真实访客流量时（visitor_logs 无 UA），
// 用一个常见的桌面浏览器 UA 仍可拉取媒体计数（Emby Web 客户端本就发浏览器 UA）。
export const DEFAULT_EMBY_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// 取该节点最近一条真实 UA（仅从 visitor_logs）。无有效 UA 返回 null。
export async function getRecentUa(env, prefix) {
    try {
        const row = await dbFirst(
            env,
            `SELECT ua FROM visitor_logs
              WHERE prefix = ? AND ua IS NOT NULL AND ua != '' AND ua != 'Unknown'
              ORDER BY id DESC LIMIT 1`,
            prefix
        );
        const ua = row && String(row.ua || '').trim();
        return ua ? ua : null;
    } catch (e) {
        return null;
    }
}

// 读取全局共享凭据（kv_config）。返回 { username, password } 或 null。
export async function getSharedCreds(env) {
    try {
        const rawUsername = await kvGet(env, EMBY_SHARED_USERNAME_KEY);
        const username = rawUsername && String(rawUsername).trim();
        if (!username) return null;
        const passEnc = await kvGet(env, EMBY_SHARED_PASSWORD_ENC_KEY);
        const password = passEnc ? (await decryptSecret(env, passEnc)) : '';
        return { username, password: password || '' };
    } catch (e) {
        return null;
    }
}

// 解析某节点应使用的凭据：优先 route 自带（alternative），否则回退全局共享。
// route 需带 emby_username / emby_password_enc 字段。
export async function resolveCreds(env, route) {
    const ru = route && String(route.emby_username || '').trim();
    if (ru) {
        const pw = route.emby_password_enc ? (await decryptSecret(env, route.emby_password_enc)) : '';
        return { username: ru, password: pw || '', source: 'route' };
    }
    const shared = await getSharedCreds(env);
    if (shared) return { ...shared, source: 'shared' };
    return null;
}

// 调用 Emby /Users/AuthenticateByName 换取 AccessToken。
// 成功返回 { token }；凭据错误返回 { unauthorized: true }；其他失败返回 null。
export async function authenticateByName(base, username, password, ua, prefix) {
    return authenticateByNameFromEmby(base, username, password, ua, prefix);
}

// 解析某节点可用的 AccessToken。
// 优先级：custom_headers 里手填的 X-Emby-Token → 已缓存 AccessToken → 用凭据登录。
// opts.ua 必须为真实 UA；opts.forceLogin 跳过缓存强制重新登录。
// 成功返回 { token, source }；凭据失败返回 { unauthorized: true }；无可用路径返回 null。
export async function getEmbyToken(env, route, base, opts) {
    const ua = opts && opts.ua;
    const forceLogin = !!(opts && opts.forceLogin);
    const now = (opts && opts.now) || Math.floor(Date.now() / 1000);

    // 1) 手填 token（显式配置优先）
    const manual = parseCustomHeaderEmbyToken(route.custom_headers);
    if (manual) return { token: manual, source: 'manual' };

    if (!ua) return null; // 无真实 UA → 不发任何请求

    // 2) 缓存的 AccessToken
    if (!forceLogin && route.emby_auth_cache) {
        const cached = await decryptToken(env, route.prefix, route.emby_auth_cache);
        if (cached) return { token: cached, source: 'cache' };
    }

    // 3) 凭据登录
    const creds = await resolveCreds(env, route);
    if (!creds || !creds.username) return null;
    const auth = await authenticateByName(base, creds.username, creds.password, ua, route.prefix);
    if (!auth) return null;
    if (auth.unauthorized) return { unauthorized: true };

    // 缓存 AccessToken（复用 emby_auth_cache 槽位，prefix 作为 salt）
    try {
        const blob = await encryptToken(env, route.prefix, auth.token);
        await cacheEmbyAuthToken(env, route.prefix, blob, now);
        route.emby_auth_cache = blob; // 让同一请求内后续读取命中
    } catch (e) { /* 缓存失败不影响本次使用 */ }

    return { token: auth.token, source: 'login' };
}

import { dbFirst } from '../db/helpers.js';
import { ensureSchema } from '../db/schema.js';

// F1: 路由别名保留前缀（与系统/CF 路径冲突的不允许注册为代理别名）
export const RESERVED_ALIASES = new Set([
    'api', 'admin', '__client_rtt__',
    'login', 'logout',
    'assets', 'static', 'public',
    'health', 'healthz', 'ping', 'status',
    'emby', 'web', 'stats',
    'favicon.ico', 'robots.txt',
    'apple-touch-icon', 'sw.js', 'manifest.json', 'cdn-cgi'
]);
export const PREFIX_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function validateRoutePrefix(raw) {
    const prefix = String(raw || '').trim();
    if (!prefix) return '别名为空';
    if (!PREFIX_REGEX.test(prefix)) return '别名格式非法（仅允许字母/数字/_/-，且不超过 64 位，不能以特殊字符开头）';
    if (RESERVED_ALIASES.has(prefix.toLowerCase())) return `别名 "${prefix}" 为系统保留前缀`;
    return null;
}

// F3: 直接透传 3xx Location 的上游域名白名单（云盘签名直链等）
export const DEFAULT_MANUAL_REDIRECT_DOMAINS = [
    'cn-beijing-data.aliyundrive.net',
    'cn-shenzhen-data.aliyundrive.net',
    'alicdn-adrive-cn-data-yk.alicdn.com',
    '115.com', '115cdn.com', 'anxia.com',
    'pcs.drive.quark.cn', 'video-pcs.drive.quark.cn',
    'mypikpak.com', 'mypikpak.net',
    'aliyuncs.com', 'myqcloud.com', 'myhuaweicloud.com',
    'cos.ap-shanghai.myqcloud.com'
];
let _manualRedirectHosts = null; // Set<string>，由 ensureSchema/POST 端点初始化

/** Called by ensureSchema and the POST /api/manual-redirect-domains handler */
export function updateManualRedirectHosts(value) {
    _manualRedirectHosts = value;
}

export function hostMatchesAllowlist(host, set) {
    if (!host || !set || set.size === 0) return false;
    const h = host.toLowerCase();
    if (set.has(h)) return true;
    for (const d of set) {
        if (h.endsWith('.' + d)) return true;
    }
    return false;
}

// F4: 内置 12 个 CF 友好优选域名（首次部署自动 seed）
export const DEFAULT_OPTIMIZED_DOMAINS = [
    { domain: 'cf.090227.xyz',         note: 'ZhiXuanWang 优选合集' },
    { domain: 'cf.zhetengsha.eu.org',  note: '社区维护' },
    { domain: 'cdn.2020111.xyz',       note: '2020111 推送' },
    { domain: 'xn--b6gac.eu.org',      note: 'IPv6 友好' },
    { domain: 'cloudflare.182682.xyz', note: '182682 推送' },
    { domain: 'cf.877771.xyz',         note: '877771 推送' },
    { domain: 'cf.0sm.com',            note: '0sm 推送' },
    { domain: 'visa.com.sg',           note: '亚太低延迟' },
    { domain: 'visa.com.hk',           note: '香港' },
    { domain: 'time.is',               note: '欧洲低延迟' },
    { domain: 'cf-ns.com',             note: '通用' },
    { domain: 'icook.tw',              note: '台湾' }
];

// F4: HEAD 测速辅助
export async function probeDomain(domain) {
    const start = Date.now();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await fetch(`https://${domain}/cdn-cgi/trace`, {
            method: 'HEAD', redirect: 'manual', signal: controller.signal,
            cf: { cacheTtl: 0 }
        });
        clearTimeout(t);
        if (res.status >= 500) return { ms: -1, ok: false };
        return { ms: Date.now() - start, ok: true };
    } catch (e) { clearTimeout(t); return { ms: -1, ok: false }; }
}

export async function loadCountryAllowlist(env) {
    if (!env.DB) return null;
    try {
        const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'proxy_country_allowlist'`);
        if (!row || !row.v) return null;
        const set = new Set(String(row.v).split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
        return set.size ? set : null;
    } catch (e) {
        return null;
    }
}

export async function getManualRedirectHosts(env) {
    if (_manualRedirectHosts) return _manualRedirectHosts;
    await ensureSchema(env);
    return _manualRedirectHosts || new Set();
}

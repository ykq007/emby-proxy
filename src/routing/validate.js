import { kvGet, COUNTRY_ALLOWLIST_KEY, HOTLINK_ALLOW_HOSTS_KEY } from '../db/kv.js';
export { PREFIX_REGEX, RESERVED_ALIASES, validateRoutePrefix } from './route-alias-policy.js';
export {
    DEFAULT_MANUAL_REDIRECT_DOMAINS,
    createMemoryManualRedirectAllowlist,
    getManualRedirectHosts,
    hostMatchesAllowlist,
    normalizeManualRedirectDomains,
    parseManualRedirectDomains,
    readManualRedirectDomains,
    serializeManualRedirectDomains,
    writeManualRedirectDomains,
} from './manual-redirect-allowlist.js';

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
        return await kvGet(env, COUNTRY_ALLOWLIST_KEY);
    } catch (e) {
        return null;
    }
}

// 防盗链：允许内嵌的 Referer 主机白名单。留空/未配置 → 返回 null（功能关闭）。
export async function loadHotlinkHosts(env) {
    if (!env.DB) return null;
    try {
        return await kvGet(env, HOTLINK_ALLOW_HOSTS_KEY);
    } catch (e) {
        return null;
    }
}

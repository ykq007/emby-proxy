import { loadCountryAllowlist, loadHotlinkHosts } from '../routing/validate.js';
import { hostMatchesAllowlist } from '../routing/manual-redirect-allowlist.js';

export function decideCountryGate(request, allowSet) {
    if (!allowSet) return null;
    const country = (request.headers.get('cf-ipcountry') || '').toUpperCase();
    if (!country || country === 'XX' || !allowSet.has(country)) {
        return new Response('Forbidden: country not allowed', { status: 403 });
    }
    return null;
}

export function decideHotlinkGate(request, hotlinkSet) {
    if (!hotlinkSet) return null;
    const ref = request.headers.get('referer') || request.headers.get('referrer') || '';
    if (!ref) return null;

    let refHost = '';
    try { refHost = new URL(ref).host.toLowerCase(); } catch (e) { }
    const selfHost = new URL(request.url).host.toLowerCase();
    if (refHost && refHost !== selfHost && !hostMatchesAllowlist(refHost, hotlinkSet)) {
        return new Response('Forbidden: hotlink not allowed', { status: 403 });
    }
    return null;
}

// config 由调用方（引擎热路径）通过 config-cache.getConfig(env) 预取，
// 内含 countrySet/hotlinkSet，避免每请求各发一次 D1 读。
// 未传 config（其他调用方/旧测试）时退回逐次 D1 读取，行为与之前完全一致。
export async function applyRequestGate(request, env, config = null) {
    const countrySet = config ? config.countrySet : await loadCountryAllowlist(env);
    const countryBlocked = decideCountryGate(request, countrySet);
    if (countryBlocked) return countryBlocked;
    const hotlinkSet = config ? config.hotlinkSet : await loadHotlinkHosts(env);
    return decideHotlinkGate(request, hotlinkSet);
}

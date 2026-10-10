// Pure helpers for the 测速 & DNS and 优选 CDN pages. No DOM, so test/console-speed.test.mjs can import them.
import { html } from '../html.js';
import Cfip from '../cfip.mjs';

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
const IPV6 = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;
const DOMAIN = /\b([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g;
const isIpv4 = s => /^\d+\.\d+\.\d+\.\d+$/.test(s);

// Domains in free text, IPv4 addresses excluded.
export const extractDomains = text => (String(text).match(DOMAIN) || []).filter(d => !isIpv4(d));

// IPv4, domains and IPv6 (bracketed, as the DNS API and URLs expect) from pasted text, deduplicated.
export function extractTargets(text) {
    const s = String(text);
    const v6 = (s.match(IPV6) || [])
        .filter(ip => ip.length > 7 && ip.includes(':') && !ip.startsWith('::1'))
        .map(ip => ip.startsWith('[') ? ip : `[${ip}]`);
    return [...new Set([...(s.match(IPV4) || []), ...extractDomains(s), ...v6])];
}

// The DNS record a target becomes, matching /api/update-dns.
export function recordType(target) {
    const bare = String(target).replace(/[[\]]/g, '');
    if (bare.includes(':')) return 'AAAA';
    return /[a-zA-Z]/.test(bare) ? 'CNAME' : 'A';
}

export const PROBE_TIMEOUT_MS = 2000;

// Turns a raw /cdn-cgi/trace round trip into the shown latency, as the old console did. A request to a
// bare IPv4 fails its TLS handshake, so the raw time includes that failure and is scaled down.
// Returns null when the probe took longer than the timeout.
export function displayLatency(rawMs, type, rand = Math.random) {
    const raw = Math.round(rawMs);
    if (raw > PROBE_TIMEOUT_MS) return null;
    if (type !== 'A') return raw;
    if (raw >= 500) return raw - 400;
    return Math.floor(40 + (raw / 500) * 60) + Math.floor(rand() * 10);
}

// Status word for a speed-test row. level is a .st class.
export function latencyGrade(ms) {
    if (ms == null || !Number.isFinite(ms)) return { level: 'err', word: '超时' };
    if (ms < 300) return { level: 'ok', word: '极佳' };
    if (ms <= 500) return { level: '', word: '正常' };
    return { level: 'warn', word: '较高' };
}

// Latency bar: full at 30 ms or less, empty at 600 ms or more; colour ok under 150 ms, warn under 400 ms.
export function latencyBar(ms) {
    if (ms == null || !Number.isFinite(ms) || ms < 0) return { fill: 0, level: 'off' };
    const fill = Math.round((600 - Math.max(30, Math.min(600, ms))) / 570 * 100) / 100;
    return { fill, level: ms < 150 ? 'ok' : ms < 400 ? 'warn' : 'err' };
}

// The bar plus the number. text overrides the number, e.g. '测算中…' or '失败'.
export function latencyCell(ms, text) {
    const bar = latencyBar(ms);
    return html`<span class="sp-lat ${bar.level}"><span class="sp-lat-bar" aria-hidden="true"><i style="--f:${bar.fill}"></i></span><span class="num">${text ?? ms + ' ms'}</span></span>`;
}

// Sorted copy by msOf(item). Missing or failed latencies (null, NaN, Infinity, negative) stay last either way.
export function sortByLatency(list, msOf, dir = 'asc') {
    const key = it => { const m = msOf(it); return m == null || !Number.isFinite(m) || m < 0 ? null : m; };
    return list.slice().sort((a, b) => {
        const ma = key(a), mb = key(b);
        if (ma === null || mb === null) return (ma === null) - (mb === null);
        return dir === 'asc' ? ma - mb : mb - ma;
    });
}

// The first n targets that answered, in the given order.
export const fastest = (rows, n) => rows.filter(r => r.ms != null && r.ms < PROBE_TIMEOUT_MS).slice(0, n).map(r => r.target);

// 优选 CDN: a fresh browser result wins over last_ms saved in D1. -1 or 0 means no result.
export function domainMs(item, live) {
    if (live) return live.ok ? live.ms : null;
    return typeof item.last_ms === 'number' && item.last_ms > 0 ? item.last_ms : null;
}

// An A or AAAA answer as cfip.bend's Addr, or null when it is not a plain address.
export function parseIp(text) {
    const s = String(text).trim().toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
        const [a, b, c, d] = s.split('.').map(Number);
        return [a, b, c, d].every(n => n <= 255) ? { $: 'V4', a, b, c, d } : null;
    }
    const halves = s.split('::');
    if (halves.length > 2) return null;
    const groups = halves.map(h => h ? h.split(':') : []);
    const missing = 8 - groups[0].length - (groups[1]?.length ?? 0);
    if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
    const all = halves.length === 1 ? groups[0] : [...groups[0], ...Array(missing).fill('0'), ...groups[1]];
    if (!all.every(g => /^[0-9a-f]{1,4}$/.test(g))) return null;
    const [a, b, c, d, e, f, g, h] = all.map(g => parseInt(g, 16));
    return { $: 'V6', a, b, c, d, e, f, g, h };
}

// 'on' when every answer is a Cloudflare IP, 'off' when any is not, 'none' when there are no answers.
// The rule lives in cfip.bend, where LAWS.bend proves it.
export function cfVerdict(ips) {
    const addrs = ips.map(parseIp);
    if (addrs.includes(null)) return 'off';
    const list = addrs.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
    return { OnCloudflare: 'on', OffCloudflare: 'off', Unresolved: 'none' }[Cfip.verdict(list).$];
}

// Viewer entry colo split from /api/optimized-domains `colos`.
export function coloSplit(colos) {
    const total = colos.reduce((sum, c) => sum + c.n, 0);
    if (!total) return '过去 24 小时还没有观众入口机房记录';
    return '过去 24 小时观众入口机房：' + colos.map(c => c.colo + ' ' + Math.round(c.n * 100 / total) + '%').join(' · ') + '（' + total + ' 次播放）';
}

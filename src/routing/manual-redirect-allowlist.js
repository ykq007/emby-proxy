import { dbFirst, dbRun } from '../db/helpers.js';
import { MANUAL_REDIRECT_DOMAINS_KEY } from '../db/kv.js';

// Key constant lives in db/kv.js (the kv_config registry); re-exported here
// so existing importers of MANUAL_REDIRECT_DOMAINS_KEY from this module
// keep working.
export { MANUAL_REDIRECT_DOMAINS_KEY };

// Direct 3xx Location passthrough targets for cloud-drive signed URLs.
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

export function normalizeManualRedirectDomains(domains) {
    const list = Array.isArray(domains) ? domains : [];
    return list
        .map(s => String(s || '').trim().toLowerCase())
        .filter(s => s && /^[a-z0-9.-]+$/.test(s));
}

export function parseManualRedirectDomains(value) {
    return normalizeManualRedirectDomains(String(value || '').split('\n'));
}

export function serializeManualRedirectDomains(domains) {
    return normalizeManualRedirectDomains(domains).join('\n');
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

function manualRedirectStore(env) {
    return env?.MANUAL_REDIRECT_ALLOWLIST || null;
}

export function createMemoryManualRedirectAllowlist(initialDomains = []) {
    let domains = normalizeManualRedirectDomains(initialDomains);
    return {
        async readDomains() {
            return [...domains];
        },
        async writeDomains(nextDomains) {
            domains = normalizeManualRedirectDomains(nextDomains);
            return [...domains];
        },
        async readHosts() {
            return new Set(domains);
        },
    };
}

export async function readManualRedirectDomains(env) {
    const store = manualRedirectStore(env);
    if (store?.readDomains) return normalizeManualRedirectDomains(await store.readDomains());
    if (!env?.DB) return [];

    const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = '${MANUAL_REDIRECT_DOMAINS_KEY}'`);
    return parseManualRedirectDomains(row?.v || '');
}

export async function writeManualRedirectDomains(env, domains) {
    const cleaned = normalizeManualRedirectDomains(domains);
    const store = manualRedirectStore(env);
    if (store?.writeDomains) await store.writeDomains(cleaned);
    if (env?.DB) {
        await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('${MANUAL_REDIRECT_DOMAINS_KEY}', ?, CURRENT_TIMESTAMP)`, serializeManualRedirectDomains(cleaned));
    }
    return cleaned;
}

export async function getManualRedirectHosts(env) {
    const store = manualRedirectStore(env);
    if (store?.readHosts) return store.readHosts();
    return new Set(await readManualRedirectDomains(env));
}

import { buildEmbyClientHeaders, buildEmbyLoginHeaders, parseCustomHeadersForProbe } from './headers.js';
import { mapItemCounts } from './media-counts.js';

export const EMBY_PROBE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function normalizeEmbyBase(targetBase) {
    return targetBase ? String(targetBase).replace(/\/+$/, '') : '';
}

export function buildEmbyReadHeaders(token, prefix, ua, customHeadersRaw) {
    const headers = buildEmbyClientHeaders(token, prefix, ua);
    const extra = parseCustomHeadersForProbe(customHeadersRaw);
    for (const k of Object.keys(extra)) headers[k] = extra[k];
    return headers;
}

export async function fetchEmbyJsonWithFallback(base, paths, options = {}) {
    const root = normalizeEmbyBase(base);
    const candidates = Array.isArray(paths) ? paths : [paths];
    if (!root || candidates.length === 0) return null;

    // options.fetchImpl：Emby HTTP 的注入缝（与 cf/api.js 同一约定）；缺省走全局 fetch。
    const doFetch = options.fetchImpl || fetch;
    const timeoutMs = options.timeoutMs || 10000;
    const ctrl = new AbortController();
    const tmr = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        let lastResponse = null;
        for (const path of candidates) {
            const res = await doFetch(root + path, {
                method: options.method || 'GET',
                redirect: 'manual',
                signal: ctrl.signal,
                headers: options.headers || {},
                body: options.body,
                cf: { cacheTtl: 0 },
            });
            lastResponse = res;
            if (res.status === 404 && path !== candidates[candidates.length - 1]) {
                res.body?.cancel().catch(() => {});
                continue;
            }
            break;
        }
        clearTimeout(tmr);

        if (!lastResponse) return null;
        if (lastResponse.status === 401 || lastResponse.status === 403) {
            lastResponse.body?.cancel().catch(() => {});
            return { unauthorized: true };
        }
        if (!lastResponse.ok) {
            lastResponse.body?.cancel().catch(() => {});
            return null;
        }
        const data = await lastResponse.json().catch(() => null);
        return data == null ? null : { data };
    } catch (e) {
        clearTimeout(tmr);
        return null;
    }
}

export async function fetchEmbyStatusWithFallback(base, paths, options = {}) {
    const root = normalizeEmbyBase(base);
    const candidates = Array.isArray(paths) ? paths : [paths];
    if (!root || candidates.length === 0) return null;

    // timeoutMs 是"每次尝试"的超时，而不是整个 fallback 循环的总超时——
    // 每次 fetch 都拥有自己独立的 AbortController/计时器，慢的第一个路径
    // 不会挤占后面路径的时间预算。
    const doFetch = options.fetchImpl || fetch;
    const timeoutMs = options.timeoutMs || 10000;
    try {
        let response = null;
        for (const path of candidates) {
            const ctrl = new AbortController();
            const tmr = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
                response = await doFetch(root + path, {
                    method: options.method || 'GET',
                    redirect: 'manual',
                    signal: ctrl.signal,
                    headers: options.headers || {},
                    cf: { cacheTtl: 0 },
                });
            } finally {
                clearTimeout(tmr);
            }
            response.body?.cancel().catch(() => {});
            if (response.status === 404 && path !== candidates[candidates.length - 1]) continue;
            break;
        }
        return response ? { status: response.status } : null;
    } catch (e) {
        return null;
    }
}

export async function fetchItemCountsFromEmby(targetBase, token, customHeadersRaw, prefix, ua, opts = {}) {
    if (!targetBase || !token) return null;
    const qs = 'Recursive=true&api_key=' + encodeURIComponent(token);
    const headers = buildEmbyReadHeaders(token, prefix, ua, customHeadersRaw);
    const result = await fetchEmbyJsonWithFallback(targetBase, [
        '/emby/Items/Counts?' + qs,
        '/Items/Counts?' + qs,
    ], { headers, timeoutMs: 15000, fetchImpl: opts.fetchImpl });
    if (!result) return null;
    if (result.unauthorized) return { unauthorized: true };
    return mapItemCounts(result.data);
}

export function latestLibraryScanEnd(tasks) {
    if (!Array.isArray(tasks)) return 0;
    let latest = 0;
    for (const task of tasks) {
        const key = String(task?.Key || '').toLowerCase();
        if (key !== 'refreshlibrary' && !key.includes('library')) continue;
        const end = task?.LastExecutionResult?.EndTimeUtc;
        if (!end) continue;
        const ts = Math.floor(Date.parse(end) / 1000);
        if (ts > latest) latest = ts;
    }
    return latest;
}

// Probe Emby's ScheduledTasks list, return the latest "RefreshLibrary" EndTimeUtc as unix seconds.
// Returns 0 if not found / network error, -1 if unauthorized. Cheap call (~metadata only).
export async function fetchLibraryScanLastEndFromEmby(targetBase, token, customHeadersRaw, prefix, ua, opts = {}) {
    if (!targetBase || !token) return 0;
    const qs = 'api_key=' + encodeURIComponent(token);
    const headers = buildEmbyReadHeaders(token, prefix, ua, customHeadersRaw);
    const result = await fetchEmbyJsonWithFallback(targetBase, [
        '/emby/ScheduledTasks?' + qs,
        '/ScheduledTasks?' + qs,
    ], { headers, timeoutMs: 5000, fetchImpl: opts.fetchImpl });
    if (!result) return 0;
    if (result.unauthorized) return -1;
    return latestLibraryScanEnd(result.data);
}

export async function authenticateByNameFromEmby(base, username, password, ua, prefix, opts = {}) {
    if (!base || !username || !ua) return null;
    const headers = buildEmbyLoginHeaders(prefix, ua);
    const body = JSON.stringify({ Username: username, Pw: password || '' });
    const result = await fetchEmbyJsonWithFallback(base, [
        '/emby/Users/AuthenticateByName',
        '/Users/AuthenticateByName',
    ], { method: 'POST', headers, body, timeoutMs: 10000, fetchImpl: opts.fetchImpl });
    if (!result) return null;
    if (result.unauthorized) return { unauthorized: true };
    const token = result.data && (result.data.AccessToken || result.data.accessToken);
    return token ? { token } : null;
}

export async function probeEmbyNode(targetBase, customHeadersRaw, opts = {}) {
    const start = Date.now();
    const customHeaders = parseCustomHeadersForProbe(customHeadersRaw);
    const result = await fetchEmbyStatusWithFallback(targetBase, [
        '/emby/System/Info/Public',
        '/System/Info/Public',
        '/emby/Users/Public',
    ], {
        // 每次尝试（每条 fallback 路径）单独计时 8s，而非整个探测过程的总预算——
        // 慢的第一条路径不会挤占后续路径的超时时间。
        timeoutMs: 8000,
        fetchImpl: opts.fetchImpl,
        headers: {
            'User-Agent': EMBY_PROBE_UA,
            'Accept': 'application/json,text/plain,*/*',
            'X-Forward-Probe': '1',
            ...customHeaders,
        },
    });
    const ms = Date.now() - start;
    if (!result) return { ok: false, ms, status: 0 };
    const ok = (result.status >= 200 && result.status < 400) || result.status === 401 || result.status === 403;
    return { ok, ms, status: result.status };
}

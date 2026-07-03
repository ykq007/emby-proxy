// 统一 Cloudflare API 适配层（REST + GraphQL）。
// 唯一持有 Bearer 鉴权、超时、success/errors 信封映射的地方；
// 所有 api.cloudflare.com 调用都应经过这里，而不是各处手搓 fetch。
//
// 用法：
//   const cfApi = createCfApi(env);
//   const r = await cfApi.rest('/zones/<zone>/dns_records', { method: 'POST', body: {...} });
//   if (!r.ok) { ... r.error ... } else { ... r.result ... }
//
//   const g = await cfApi.graphql(query);
//   if (!g.ok) { ... g.error ... } else { ... g.data ... }
//
// 测试用假适配器见 ./fakeApi.js。

export const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
export const DEFAULT_CF_TIMEOUT_MS = 15000;

function cfErrorMessage(data, fallback) {
    if (data && Array.isArray(data.errors) && data.errors.length) {
        return data.errors.map(e => (e && e.message) || String(e)).join('; ');
    }
    return fallback;
}

/**
 * 创建一个真实（HTTP）的 Cloudflare API 客户端。
 * @param {object} env - 必须含 CF_API_TOKEN。
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl] - 覆盖底层 fetch（测试/依赖注入用）。
 * @param {number} [options.timeoutMs] - 每次调用的默认超时（毫秒）。
 */
export function createCfApi(env, options = {}) {
    const token = env && env.CF_API_TOKEN;
    const defaultTimeoutMs = options.timeoutMs || DEFAULT_CF_TIMEOUT_MS;

    async function doFetch(url, init, timeoutMs) {
        const fetchImpl = options.fetchImpl || fetch;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            return await fetchImpl(url, { ...init, signal: ctrl.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * REST 调用。返回 { ok, status, result, errors, error, reason }。
     * @param {string} path - 相对 CF_API_BASE 的路径，如 '/zones/<id>/dns_records'。
     * @param {object} [init]
     * @param {string} [init.method='GET']
     * @param {*} [init.body] - 若 isForm=false 会自动 JSON.stringify 并加 Content-Type。
     * @param {boolean} [init.isForm=false] - body 为 FormData 时设为 true，透传不序列化。
     * @param {object} [init.headers]
     * @param {number} [init.timeoutMs]
     */
    async function rest(path, init = {}) {
        if (!token) return { ok: false, reason: 'missing-token', error: '缺少 CF_API_TOKEN 环境变量' };
        const { method = 'GET', body, isForm = false, headers = {}, timeoutMs = defaultTimeoutMs } = init;

        const reqHeaders = { 'Authorization': `Bearer ${token}`, ...headers };
        let reqBody;
        if (body !== undefined) {
            if (isForm) {
                reqBody = body;
            } else {
                reqHeaders['Content-Type'] = 'application/json';
                reqBody = JSON.stringify(body);
            }
        }

        let res;
        try {
            res = await doFetch(`${CF_API_BASE}${path}`, { method, headers: reqHeaders, body: reqBody }, timeoutMs);
        } catch (e) {
            return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network-error', error: e.message };
        }

        let data = null;
        try { data = await res.json(); } catch (_) { /* 非 JSON 响应体，保持 data=null */ }

        if (!res.ok || !data || data.success !== true) {
            return {
                ok: false,
                reason: 'api-error',
                status: res.status,
                errors: (data && data.errors) || null,
                error: cfErrorMessage(data, `CF API 请求失败 (HTTP ${res.status})`),
            };
        }
        return { ok: true, status: res.status, result: data.result };
    }

    /**
     * GraphQL 调用（api.cloudflare.com/client/v4/graphql）。
     * 返回 { ok, status, data, errors, error, reason }。
     */
    async function graphql(query, variables, init = {}) {
        if (!token) return { ok: false, reason: 'missing-token', error: '缺少 CF_API_TOKEN 环境变量' };
        const timeoutMs = init.timeoutMs || defaultTimeoutMs;
        const payload = variables !== undefined ? { query, variables } : { query };

        let res;
        try {
            res = await doFetch(`${CF_API_BASE}/graphql`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }, timeoutMs);
        } catch (e) {
            return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network-error', error: e.message };
        }

        let data = null;
        try { data = await res.json(); } catch (_) { /* 非 JSON 响应体，保持 data=null */ }

        if (!res.ok || !data || (data.errors && data.errors.length)) {
            return {
                ok: false,
                reason: 'api-error',
                status: res.status,
                errors: (data && data.errors) || null,
                error: cfErrorMessage(data, `CF GraphQL 请求失败 (HTTP ${res.status})`),
            };
        }
        return { ok: true, status: res.status, data: data.data };
    }

    return { rest, graphql };
}

// vps789 优选 CDN 列表拉取 + 合库（issue: 优选CDN list sourced live from vps789）。
//
// 背景：optimized_domains 里的 builtin=1 行原先是 routing/validate.js 里一份写死
// 的清单，会逐渐过时（域名失效/被墙）。这个模块负责从 vps789 的官方开放接口
// （免 token，每日刷新）实时拉取当前 Top20 优选 CDN 域名，合库进
// optimized_domains，让 builtin 行始终跟随源站刷新；DEFAULT_OPTIMIZED_DOMAINS
// 降级为冷启动/vps789 长期不可用时的兜底种子，不再是唯一数据源。
//
// 惰性刷新策略（stale-while-revalidate，12h TTL）：
//   - 从未成功拉取过（marker 缺失/0）：GET /api/optimized-domains 内联阻塞拉取
//     一次，让首次访问就能看到真实数据（替换掉种子行）。
//   - 已拉取过但超过 TTL：后台刷新（ctx.waitUntil），本次请求仍返回当前行，不阻塞。
//   - 未过期：什么都不做。
// 拉取失败（网络错误 / 非 2xx / code!==0 / good[] 为空）一律返回 null，跳过合库
// （不做任何 DELETE），保留上一次成功结果；marker 保持 0 时下次请求会重试内联拉取。
import { dbStmt, dbBatch } from '../db/helpers.js';
import { kvGet, kvSetStmt, OPTIMIZED_VPS789_FETCHED_AT_KEY } from '../db/kv.js';

export const CFIP_TOP20_URL = 'https://vps789.com/openApi/cfIpTop20';
export const VPS789_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const DOMAIN_RE = /^[a-z0-9.-]+$/;

/**
 * 纯函数：把 vps789 cfIpTop20 接口的响应体解析成可写入 optimized_domains 的
 * 域名列表。不做网络请求，不校验 json.code（那是 fetchCfIpTop20 的职责）。
 *
 * 过滤规则：
 *   - domain = String(entry.ip).trim().toLowerCase()
 *   - 丢弃裸 IPv4（entry.ip 本身就是 IP，不是域名，测速逻辑要求的是域名）
 *   - 丢弃含 ':' 的（IPv6 字面量）
 *   - 必须匹配 /^[a-z0-9.-]+$/，否则丢弃
 *   - 按结果去重（保留先出现的 rank）
 *
 * rank 取 data.good[] 里的原始 1-based 下标（即接口给出的真实排名），不是
 * 过滤/去重后的紧凑序号——note 里的"综合排名"要如实反映源站排名。
 *
 * @param {*} json - 已解析的响应体，形如 { code, message, data: { good: [...] } }
 * @returns {{domain:string, note:string, rank:number}[]}
 */
export function parseCfIpTop20(json) {
    const good = json && json.data && Array.isArray(json.data.good) ? json.data.good : [];
    const seen = new Set();
    const out = [];
    good.forEach((entry, idx) => {
        const rank = idx + 1;
        if (!entry) return;
        const domain = String(entry.ip ?? '').trim().toLowerCase();
        if (!domain) return;
        if (IPV4_RE.test(domain)) return;
        if (domain.includes(':')) return;
        if (!DOMAIN_RE.test(domain)) return;
        if (seen.has(domain)) return;
        seen.add(domain);
        out.push({ domain, note: `vps789·综合排名${rank}`, rank });
    });
    return out;
}

/**
 * 拉取 vps789 cfIpTop20 接口并解析。任何失败（网络异常/超时、非 2xx、
 * json.code !== 0、解析后 good[] 为空）一律返回 null——调用方据此跳过合库，
 * 保留上一次成功的结果。
 *
 * @param {object} env
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl] - 覆盖底层 fetch（测试/依赖注入用）。
 * @param {number} [options.timeoutMs=8000]
 * @returns {Promise<{domain:string, note:string, rank:number}[]|null>}
 */
export async function fetchCfIpTop20(env, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetchImpl(CFIP_TOP20_URL, { signal: ctrl.signal });
        if (!res || !res.ok) return null;
        let json;
        try {
            json = await res.json();
        } catch (e) {
            return null;
        }
        if (!json || json.code !== 0) return null;
        const domains = parseCfIpTop20(json);
        if (!domains.length) return null;
        return domains;
    } catch (e) {
        return null; // 网络错误 / abort 超时
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 用一次成功、非空的拉取结果合库到 optimized_domains：
 *   - INSERT OR IGNORE 新域名（UNIQUE(domain) 保证已存在的行不被覆盖——
 *     enabled 开关、last_ms 测速结果都原样保留）
 *   - DELETE builtin=1 且不在本次 top20 里的行（镜像源站：源站移除的域名
 *     builtin 行也随之移除）；builtin=0 的用户自定义行永远不碰。
 *   - 写入 fetched-at marker（用于 maybeRefreshOptimizedDomains 的 TTL 判断）
 *
 * 只在拉取成功时调用；失败（fetchCfIpTop20 返回 null）应完全跳过本函数，
 * 不做任何 DELETE。
 *
 * @param {object} env
 * @param {{domain:string, note:string}[]} domains - 非空
 */
export async function reconcileOptimizedDomains(env, domains) {
    if (!env?.DB) return;
    const list = Array.isArray(domains) ? domains : [];
    if (!list.length) return; // 防御：调用方应已保证非空（空结果算失败，不应走到这里）

    const stmts = list.map(d =>
        dbStmt(env, `INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 1, 1)`, d.domain, d.note)
    );

    const placeholders = list.map(() => '?').join(',');
    stmts.push(dbStmt(
        env,
        `DELETE FROM optimized_domains WHERE builtin = 1 AND domain NOT IN (${placeholders})`,
        ...list.map(d => d.domain)
    ));

    stmts.push(kvSetStmt(env, OPTIMIZED_VPS789_FETCHED_AT_KEY, Date.now()));

    await dbBatch(env, stmts);
}

/**
 * 惰性刷新入口，供 GET /api/optimized-domains 在 ensureSchema 之后、读表之前调用。
 *
 *   - marker 缺失/0（从未成功拉取过）：阻塞拉取 + 合库，让首次访问看到真实数据。
 *   - marker 存在但已过 TTL：通过 ctx.waitUntil 后台刷新，本次请求不等待。
 *   - marker 存在且未过 TTL：什么都不做。
 *
 * @param {object} env
 * @param {object} [ctx] - Worker 的 ExecutionContext（提供 waitUntil）。
 * @param {object} [opts]
 * @param {number} [opts.now] - 测试注入的"当前时间"，默认 Date.now()。
 * @param {number} [opts.ttlMs] - 测试注入的 TTL，默认 VPS789_TTL_MS。
 * @param {typeof fetch} [opts.fetchImpl] - 测试注入的 fetch。
 */
export async function maybeRefreshOptimizedDomains(env, ctx, opts = {}) {
    if (!env?.DB) return;
    const now = opts.now ?? Date.now();
    const ttlMs = opts.ttlMs ?? VPS789_TTL_MS;

    const raw = await kvGet(env, OPTIMIZED_VPS789_FETCHED_AT_KEY);
    const fetchedAt = parseInt(raw, 10) || 0;

    const doRefresh = async () => {
        const domains = await fetchCfIpTop20(env, opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {});
        if (domains) await reconcileOptimizedDomains(env, domains);
    };

    if (!fetchedAt) {
        // 从未成功拉取过：阻塞，首次响应就要是真实数据。
        await doRefresh();
        return;
    }
    if (now - fetchedAt > ttlMs) {
        // 过 TTL：后台刷新，本次仍走当前行（stale-while-revalidate）。
        if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(doRefresh());
        } else {
            // 没有 ctx（理论上不会发生在真实请求路径上）时退化为阻塞，避免静默丢刷新。
            await doRefresh();
        }
        return;
    }
    // 未过 TTL：nothing to do.
}

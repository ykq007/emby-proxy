import { dbRun, dbAll, dbStmt, dbBatch } from '../db/helpers.js';
import { ensureSchema } from '../db/schema.js';
import { probeEmbyNode } from '../emby/client.js';
import { runAlertFSM, maybeRollupHourly } from './alerts.js';
import { PROBE_SELECT } from '../routing/route.js';

export function probeTargetFor(routeTarget) {
    const first = String(routeTarget || '').split(',').map(s => s.trim()).filter(Boolean)[0];
    if (!first) return null;
    return first.replace(/\/+$/, '');
}

export async function probeOne(route, opts) {
    const base = probeTargetFor(route.target);
    if (!base) return { prefix: route.prefix, ok: false, ms: 0, status: 0 };
    const result = await probeEmbyNode(base, route.custom_headers, opts);
    return { prefix: route.prefix, ...result };
}

// 并发池：限制同时在途的探测请求数量，与 Workers 的 6 路并发连接上限对齐，
// 这样每个 fetch 的 abort 计时器只会在真正发起请求时才开始计时，
// 而不是在排队等待连接槽位时就已经在消耗超时预算。
const PROBE_CONCURRENCY = 6;

async function probeWithPool(routes, limit = PROBE_CONCURRENCY, opts) {
    const results = new Array(routes.length);
    let next = 0;
    async function worker() {
        while (true) {
            const i = next++;
            if (i >= routes.length) return;
            results[i] = await probeOne(routes[i], opts);
        }
    }
    const workers = Array.from({ length: Math.min(limit, routes.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function probeAll(env) {
    try {
        await ensureSchema(env);
        if (!env.DB) return;
        const now = Math.floor(Date.now() / 1000);
        const { results: routes } = await dbAll(env, `
            SELECT ${PROBE_SELECT}
              FROM routes WHERE monitor_enabled = 1
        `);
        if (!routes || !routes.length) return;
        // env.EMBY_FETCH：测试注入 Emby HTTP 假件的载体（生产 env 不含该键 → 全局 fetch）。
        const fetchOpts = env.EMBY_FETCH ? { fetchImpl: env.EMBY_FETCH } : undefined;
        const probes = await probeWithPool(routes, PROBE_CONCURRENCY, fetchOpts);

        // 失败重试：第一轮里失败的探测，等 3s 再单独复测一遍——很多"离线"
        // 其实是排队等连接槽位时计时器已经在跑，或恰好落在延迟尾部的瞬时抖动。
        // 复测结果（无论成功还是再次失败）都会覆盖第一轮的记录。
        //
        // 上限保护：失败节点太多时（大概率是真实的大范围故障，而非个别抖动）
        // 不再无条件复测全部——8s 超时 × 两轮会让本次 invocation 的 fetch 数
        // 翻倍，在故障期间正是最容易撞上 Workers 免费版 subrequest 配额的时候。
        const RETRY_MAX_FAILED = 15;
        const failedIdx = probes.reduce((acc, p, i) => { if (!p.ok) acc.push(i); return acc; }, []);
        if (failedIdx.length && failedIdx.length <= RETRY_MAX_FAILED) {
            await new Promise(r => setTimeout(r, 3000));
            const retryRoutes = failedIdx.map(i => routes[i]);
            const retryResults = await probeWithPool(retryRoutes, PROBE_CONCURRENCY, fetchOpts);
            failedIdx.forEach((idx, j) => { probes[idx] = retryResults[j]; });
        }

        const insertStmts = probes.map(p =>
            dbStmt(env, `INSERT OR REPLACE INTO emby_probes(prefix, ts, ok, ms, status) VALUES(?,?,?,?,?)`,
                p.prefix, now, p.ok ? 1 : 0, p.ms | 0, p.status | 0));
        if (insertStmts.length) await dbBatch(env, insertStmts);
        await runAlertFSM(env, routes, probes, now);
        await maybeRollupHourly(env, now);
    } catch (e) {
        console.log('probeAll error:', e.message);
    }
}

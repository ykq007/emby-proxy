// 今日带宽聚合：从 Cloudflare GraphQL 抓取每节点今日 edgeResponseBytes，
// 持久化到 D1 `route_bandwidth_today`，供 /api/routes 直接读取，避免页面打开时实时拉取。
// 数据为“当日累计”，分钟级几乎不变，由 cron 周期刷新（默认约 5 分钟），页面只读 D1。
import { dbAll, dbFirst, dbStmt, dbBatch } from '../db/helpers.js';
export { beijingDayStr } from './traffic.js';
import { beijingDayStr, queryRouteTrafficBytes } from './traffic.js';
import { PREFIX_SELECT } from '../routing/route.js';

// 抓取并持久化到 D1。返回成功写入的 prefix 数量。
export async function refreshBandwidth(env) {
    if (!env.DB || !env.CF_API_TOKEN || !env.CF_ZONE_ID) return 0;
    const { results: routes } = await dbAll(env, `SELECT ${PREFIX_SELECT} FROM routes`);
    const prefixes = (routes || []).map(r => r.prefix).filter(Boolean);
    if (prefixes.length === 0) return 0;

    const { bytesByPrefix, anySuccess } = await queryRouteTrafficBytes(env, prefixes);
    if (!anySuccess || bytesByPrefix.size === 0) return 0;

    const day = beijingDayStr();
    const updatedAt = Math.floor(Date.now() / 1000);
    const stmts = [];
    for (const [prefix, bytes] of bytesByPrefix) {
        stmts.push(dbStmt(env,
            `INSERT INTO route_bandwidth_today (prefix, day, bytes, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(prefix, day) DO UPDATE SET bytes = excluded.bytes, updated_at = excluded.updated_at`,
            prefix, day, bytes, updatedAt));
    }
    if (stmts.length) await dbBatch(env, stmts);
    return stmts.length;
}

// 节流刷新：距上次刷新不足 minIntervalSec 则跳过。挂在 5 分钟节点探测 cron 上调用，
// 自身仍保留节流以防 cron 间隔变化时重复刷新。
export async function maybeRefreshBandwidth(env, minIntervalSec = 270) {
    if (!env.DB || !env.CF_API_TOKEN || !env.CF_ZONE_ID) return 0;
    try {
        const day = beijingDayStr();
        const row = await dbFirst(env, `SELECT MAX(updated_at) AS m FROM route_bandwidth_today WHERE day = ?`, day);
        const last = row && row.m ? Number(row.m) : 0;
        const nowSec = Math.floor(Date.now() / 1000);
        if (last && nowSec - last < minIntervalSec) return 0;
    } catch (e) {
        // 读节流时间戳失败（如表尚未建好）：忽略，继续尝试刷新。调用方已先跑 ensureSchema。
    }
    return refreshBandwidth(env);
}

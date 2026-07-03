// 代理层 Fail2ban：拦截扫描有效节点前缀的 IP（反复命中“未知前缀 404”）。
// 复用 ip_bans 封禁名单（与登录穷举共用，一个坏 IP 一次封禁）。
// 只在“未知前缀 404”这条路径上计数 → 命中真实节点的正常流量(含媒体串流)零开销。
// DB 缺失/异常时 fail-open。

import { rateLimitFixedWindow } from '../db/rate-limit.js';

const SCAN_RL_LIMIT = 30;        // 单 IP 每 60s 未知前缀 404 上限，超出回 429
const SCAN_BAN_HOURLY = 200;     // 近 1 小时累计未知前缀 404 超此 → 封禁
const SCAN_BAN_MS = 3600000;     // 封禁时长（1 小时）

// 返回 429 Response 表示已限流/封禁（调用方应直接返回它），null 表示放行（继续走原 404）。
// 仅应在“未知前缀 404”分支调用。
export async function guardPrefixScan(env, ip, now) {
    if (!env.DB || !ip || ip === 'Unknown') return null;
    try {
        return await rateLimitFixedWindow(env, ip, now, {
            table: 'scan_rl',
            minuteLimit: SCAN_RL_LIMIT,
            hourlyLimit: SCAN_BAN_HOURLY,
            banMs: SCAN_BAN_MS,
            reason: 'prefix-scan',
        });
    } catch (e) { return null; }
}

// 共享的 D1 固定窗口限流 + Fail2ban 封禁实现。
// 语义：已封禁 → 立即 429（不计数）；当前分钟窗口计数 +1，超分钟阈值 → 429；
// 若近 1 小时累计超阈值 → 写入 ip_bans 升级为封禁，否则仅 429 一分钟。
// 调用方按各自的 table / 阈值传参，行为与此前两套各自实现完全一致。
import { dbFirst, dbRun } from './helpers.js';

export function resp429(retryAfterMs) {
    return new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))) },
    });
}

// options: { table, minuteLimit, hourlyLimit, banMs, reason }
// 返回 429 Response 表示已限流/封禁（调用方应直接返回它），null 表示放行。
// 调用前提：调用方已确认 env.DB 存在；本函数不做 fail-open 兜底，异常由调用方处理。
export async function rateLimitFixedWindow(env, ip, now, options) {
    const { table, minuteLimit, hourlyLimit, banMs, reason } = options;

    // 1. 已封禁 → 立即 429，不再写计数
    const ban = await dbFirst(env, `SELECT until FROM ip_bans WHERE ip = ?`, ip);
    if (ban && ban.until > now) return resp429(ban.until - now);

    // 2. 当前分钟窗口计数 +1
    const win = Math.floor(now / 60000);
    const row = await dbFirst(env,
        `INSERT INTO ${table} (ip, win, n) VALUES (?, ?, 1)
         ON CONFLICT(ip, win) DO UPDATE SET n = n + 1 RETURNING n`,
        ip, win);
    if (!row || row.n <= minuteLimit) return null;

    // 3. 超分钟阈值：查近 1 小时累计，达标则升级为封禁
    const agg = await dbFirst(env, `SELECT SUM(n) AS s FROM ${table} WHERE ip = ? AND win > ?`, ip, win - 60);
    if (agg && agg.s > hourlyLimit) {
        await dbRun(env, `INSERT OR REPLACE INTO ip_bans (ip, until, reason) VALUES (?, ?, ?)`, ip, now + banMs, reason);
        return resp429(banMs);
    }
    return resp429(60000);
}

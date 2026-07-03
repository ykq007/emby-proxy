// Cron 调度逻辑（从 index.js 抽离，行为不变）。
// 触发器：
//   '*/5 * * * *'  每 5 分钟跑节点探测 probeAll（原每分钟一次会导致 D1 免费额度
//                  rows_written 超限：~47 路由 × 1440 次/天 ≈ 230k 行/天，超出
//                  10 万/天上限后当日所有 D1 写入会失败）。maybeRefreshBandwidth
//                  内部已自节流约 5 分钟一次，挂在同一 cron 上无害，无需再拆一条
//                  独立的分钟级 cron。/api/_probe_now 作为外部 cron 的冗余看门狗
//                  存在（已自节流：最新探测数据新鲜度 >=4 分钟才会补跑，避免
//                  被外部约 1 分钟一次的调用抬高到 3 倍写入量）。
//   '0 * * * *'    每小时整点：保活提醒 maybeRemindKeepalive
//   '0 0 * * *'    每日 0 点推送 TG 统计 + 抓取媒体计数
//   其他/未知      兼容旧部署，仅触发 TG 日报
// 离线告警阈值 EMBY_OUTAGE_THRESHOLD_S 现为 900s（约 3 个探测周期，且每次
// 探测已由 probe.js 内部重试确认，减少瞬时抖动误报）。
import { ensureSchema } from './db/schema.js';
import { dbAll, dbRun } from './db/helpers.js';
import { maybeFetchMediaCounts } from './emby/counts.js';
import { probeAll } from './probes/probe.js';
import { sendTgStats } from './stats/telegram.js';
import { maybeRemindKeepalive } from './probes/keepalive.js';
import { maybeRefreshBandwidth } from './stats/bandwidth.js';
import { MEDIA_COUNTS_REFRESH_SELECT } from './routing/route.js';

export async function handleScheduled(event, env, ctx) {
    const cron = event && event.cron || '';
    if (cron === '0 * * * *') {
        if (env.DB && env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
            ctx.waitUntil((async () => {
                try {
                    await ensureSchema(env);
                    const nowSec = Math.floor(Date.now() / 1000);
                    await maybeRemindKeepalive(env, nowSec);
                } catch (e) { console.log('scheduled keepalive error:', e && e.message || e); }
            })());
        }
        return;
    }
    if (cron === '0 0 * * *') {
        if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
            ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
        }
        if (env.DB) {
            ctx.waitUntil((async () => {
                try {
                    await ensureSchema(env);
                    const { results: routes } = await dbAll(env, `
                        SELECT ${MEDIA_COUNTS_REFRESH_SELECT}
                          FROM routes WHERE monitor_enabled = 1
                    `);
                    await maybeFetchMediaCounts(env, routes || [], Math.floor(Date.now() / 1000));
                } catch (e) {
                    console.log('scheduled maybeFetchMediaCounts error:', e && e.message || e);
                }
            })());
            // 每日清理 7 天前的访客精细日志，避免表体积持续膨胀
            ctx.waitUntil((async () => {
                try {
                    await ensureSchema(env);
                    await env.DB.exec(`DELETE FROM visitor_logs WHERE timestamp < datetime('now', '-7 days')`);
                } catch (e) {
                    console.log('scheduled visitor_logs cleanup error:', e && e.message || e);
                }
            })());
            // 每日清理过期的登录限流窗口行（窗口为分钟级，保留约 2 小时足矣）+ 过期封禁
            ctx.waitUntil((async () => {
                try {
                    await ensureSchema(env);
                    const cutoff = Math.floor(Date.now() / 60000) - 120;
                    await dbRun(env, `DELETE FROM auth_rl WHERE win < ?`, cutoff);
                    await dbRun(env, `DELETE FROM scan_rl WHERE win < ?`, cutoff);
                    await dbRun(env, `DELETE FROM ip_bans WHERE until < ?`, Date.now());
                } catch (e) {
                    console.log('scheduled auth_rl cleanup error:', e && e.message || e);
                }
            })());
        }
        return;
    }
    if (cron === '*/5 * * * *') {
        if (env.DB) {
            ctx.waitUntil(probeAll(env));
            // 今日带宽：节流刷新（约 5 分钟一次），写入 D1 供页面只读
            ctx.waitUntil((async () => {
                try {
                    await ensureSchema(env);
                    await maybeRefreshBandwidth(env);
                } catch (e) { console.log('scheduled bandwidth refresh error:', e && e.message || e); }
            })());
        }
        return;
    }
    // 未配置 / 未知 cron：兼容旧部署，仅触发 TG 日报
    if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
        ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
    }
}

// 聚合 Worker 入口（emby-aggregate）：多个 Emby 节点合并成一台虚拟 Emby 服务器。
// 与生产 Worker（src/index.js）共用 D1，但只建 / 写 agg_ 表，见 schema.js。
// HTTP → api.js；cron → sync.js（目录同步）。
// 外部定时器（如 cron-job.org）可用 POST /admin/sync 触发同步：只认 SYNC_TOKEN（专用密钥，
// 只能触发同步，不是 ADMIN_TOKEN），未设置时该地址不存在。
import { ensureAggSchema } from './schema.js';
import { handleAggRequest } from './api.js';
import { runSync } from './sync.js';
import { dbFirst, dbRun } from '../db/helpers.js';
import { sha256Hex } from '../viewers/store.js';

const LOCK_MS = 9 * 60 * 1000; // 一轮同步的锁；进程意外中断时最多卡这么久
// cron 触发的一轮不受 HTTP 后台任务 30 秒的限制，可以跑久一些（仍远小于 LOCK_MS 和 10 分钟的 cron 间隔）。
const CRON_TIME_BUDGET_MS = 8 * 60 * 1000;

// 同一时刻只跑一轮同步（Cloudflare cron 与外部定时器可能同时到）：两轮并发会把同一部作品插成两条。
export async function guardedSync(env, now = Date.now(), opts = {}) {
    await ensureAggSchema(env);
    const got = await dbFirst(env,
        `INSERT INTO agg_meta (k, v) VALUES ('sync_lock', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v
          WHERE CAST(agg_meta.v AS INTEGER) < ? RETURNING v`, String(now), now - LOCK_MS);
    if (!got) return { skipped: 'another sync is running' };
    try {
        return await runSync(env, now, opts);
    } finally {
        await dbRun(env, `DELETE FROM agg_meta WHERE k = 'sync_lock' AND v = ?`, String(now));
    }
}

const logSync = (p) => p
    .then(s => console.log('agg sync:', JSON.stringify(s)))
    .catch(e => console.log('agg sync error:', e && e.message || e));

async function syncTrigger(request, env, ctx) {
    if (!env.SYNC_TOKEN) return new Response('Not found', { status: 404 });
    const given = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    // 比较哈希而不是明文，避免按字符的时序差异。
    if (!given || await sha256Hex(given) !== await sha256Hex(env.SYNC_TOKEN)) return new Response('Unauthorized', { status: 401 });
    ctx.waitUntil(logSync(guardedSync(env)));
    return Response.json({ started: true }, { status: 202 });
}

export default {
    async fetch(request, env, ctx) {
        if (!env.DB) return new Response('D1 binding DB is missing', { status: 500 });
        if (new URL(request.url).pathname === '/admin/sync' && (request.method === 'POST' || request.method === 'GET')) {
            return syncTrigger(request, env, ctx);
        }
        await ensureAggSchema(env);
        return handleAggRequest(request, env, ctx);
    },
    async scheduled(event, env, ctx) {
        ctx.waitUntil(logSync(guardedSync(env, Date.now(), { timeBudgetMs: CRON_TIME_BUDGET_MS })));
    },
};

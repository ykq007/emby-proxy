// 聚合 Worker 入口（emby-aggregate）：多个 Emby 节点合并成一台虚拟 Emby 服务器。
// 与生产 Worker（src/index.js）共用 D1，但只建 / 写 agg_ 表，见 schema.js。
// HTTP → api.js；cron → sync.js（目录同步）。
import { ensureAggSchema } from './schema.js';
import { handleAggRequest } from './api.js';
import { runSync } from './sync.js';

export default {
    async fetch(request, env, ctx) {
        if (!env.DB) return new Response('D1 binding DB is missing', { status: 500 });
        await ensureAggSchema(env);
        return handleAggRequest(request, env, ctx);
    },
    async scheduled(event, env, ctx) {
        ctx.waitUntil(runSync(env, Date.now())
            .then(s => console.log('agg sync:', JSON.stringify(s)))
            .catch(e => console.log('agg sync error:', e && e.message || e)));
    },
};

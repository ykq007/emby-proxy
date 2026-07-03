import { probeAll } from '../probes/probe.js';
import { ensureSchema } from '../db/schema.js';
import { dbAll } from '../db/helpers.js';
import { maybeFetchMediaCounts } from '../emby/counts.js';
import { readManualRedirectDomains, writeManualRedirectDomains } from '../routing/manual-redirect-allowlist.js';
import { notify } from '../tg/notifications.js';
import { invalidateConfigCache } from '../proxy/config-cache.js';
import { MEDIA_COUNTS_REFRESH_SELECT } from '../routing/route.js';

export async function handleSystem(request, env, ctx, url) {
    if (url.pathname === '/api/ping-node') {
        const target = url.searchParams.get('url');
        if (!target) return Response.json({ ms: -1 });
        const start = Date.now();
        try {
            const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 2000);
            await fetch(target + '/', { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId); return Response.json({ ms: Date.now() - start });
        } catch (e) { return Response.json({ ms: -1 }); }
    }

    // 手动触发探测（外部 cron / 调试用）。需 ?key=<ADMIN_TOKEN>。
    if (url.pathname === '/api/_probe_now') {
        const key = url.searchParams.get('key') || '';
        if (!env.ADMIN_TOKEN || key !== env.ADMIN_TOKEN) {
            return new Response('forbidden', { status: 403 });
        }
        if (!env.DB) return new Response('no DB', { status: 500 });
        const t0 = Date.now();
        // 自节流：外部 ~1 分钟级 cron 会把探测频率抬高到 CF cron 的 3 倍，
        // 这里降级为“冗余看门狗”——只有当最新一次探测数据已经陈旧（>=4 分钟）
        // 时才真正补跑一次，否则直接跳过，避免重复写 D1。
        try {
            await ensureSchema(env);
            const now = Math.floor(Date.now() / 1000);
            const { results } = await dbAll(env, `SELECT MAX(ts) AS t FROM emby_probes`);
            const lastTs = (results && results[0] && results[0].t) || 0;
            if (lastTs && (now - lastTs) < 240) {
                return Response.json({ ok: true, skipped: 'fresh', age_s: now - lastTs });
            }
        } catch (e) {
            // fail-open：新鲜度检查本身出错不应阻塞探测
        }
        try {
            await probeAll(env);
            return Response.json({ ok: true, ms: Date.now() - t0 });
        } catch (e) {
            return Response.json({ ok: false, error: String(e && e.message || e), ms: Date.now() - t0 }, { status: 500 });
        }
    }

    // 手动触发媒体计数抓取（外部 cron 每日一次）。需 ?key=<ADMIN_TOKEN>。
    if (url.pathname === '/api/_counts_now') {
        const key = url.searchParams.get('key') || '';
        if (!env.ADMIN_TOKEN || key !== env.ADMIN_TOKEN) {
            return new Response('forbidden', { status: 403 });
        }
        if (!env.DB) return new Response('no DB', { status: 500 });
        const t0 = Date.now();
        try {
            await ensureSchema(env);
            const { results: routes } = await dbAll(env, `
                SELECT ${MEDIA_COUNTS_REFRESH_SELECT}
                  FROM routes WHERE monitor_enabled = 1
            `);
            const now = Math.floor(Date.now() / 1000);
            await maybeFetchMediaCounts(env, routes || [], now);
            return Response.json({ ok: true, routes: (routes || []).length, ms: Date.now() - t0 });
        } catch (e) {
            return Response.json({ ok: false, error: String(e && e.message || e), ms: Date.now() - t0 }, { status: 500 });
        }
    }

    // 管理面板：发送一条 Telegram 测试消息（admin auth 由 requireAuth 中间件统一拦截）。
    if (url.pathname === '/api/tg-test' && request.method === 'POST') {
        if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
            return Response.json({ ok: false, error: 'TG_BOT_TOKEN or TG_CHAT_ID not configured' }, { status: 400 });
        }
        try {
            const result = await notify(env, 'tg-test');
            return Response.json({ ok: !!(result && result.ok) });
        } catch (e) {
            return Response.json({ ok: false, error: String(e && e.message || e) }, { status: 500 });
        }
    }

    // ==========================================
    // 🚀 下载测速端点：客户端 → 当前 CF 入口 → Worker 的实际带宽
    // ==========================================
    if (url.pathname === '/api/speedtest-down') {
        const bytes = Math.min(parseInt(url.searchParams.get('bytes') || '5242880', 10) || 5242880, 50 * 1024 * 1024);
        const chunkSize = 65536;
        const chunk = new Uint8Array(chunkSize);
        let sent = 0;
        const stream = new ReadableStream({
            pull(controller) {
                if (sent >= bytes) { controller.close(); return; }
                const remaining = bytes - sent;
                if (remaining < chunkSize) {
                    controller.enqueue(chunk.subarray(0, remaining));
                    sent += remaining;
                } else {
                    controller.enqueue(chunk);
                    sent += chunkSize;
                }
            }
        });
        return new Response(stream, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': String(bytes),
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // ==========================================
    // 🚀 F3: 手动重定向白名单管理
    // ==========================================
    if (url.pathname === '/api/manual-redirect-domains') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
        await ensureSchema(env);
        if (request.method === 'GET') {
            const domains = await readManualRedirectDomains(env);
            return Response.json({ success: true, domains });
        }
        if (request.method === 'POST') {
            try {
                const body = await request.json();
                const list = Array.isArray(body.domains) ? body.domains : [];
                const cleaned = await writeManualRedirectDomains(env, list);
                invalidateConfigCache();
                return Response.json({ success: true, domains: cleaned });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
        }
        return new Response("Method not allowed", { status: 405 });
    }

    return null;
}

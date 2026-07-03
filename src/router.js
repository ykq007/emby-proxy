// HTTP 请求分发（薄分发层）。
// 顺序敏感：公开端点 → 鉴权门控 → 管理面板/端点 → 反代兜底。
// 每个 handleXxx 命中路由时返回 Response，否则返回 null 继续向下。
import { ensureSchema } from './db/schema.js';
import { HTML_UI, HTML_UI_ETAG } from './ui/dashboard.js';
import { proxyRequest } from './proxy/engine.js';
import { requireAuth } from './middleware/auth.js';
import { handlePublic } from './api/public.js';
import { handleCf } from './api/cf.js';
import { handleSystem } from './api/system.js';
import { handleOptimizedDomains } from './api/optimized-domains.js';
import { handleDns } from './api/dns.js';
import { handleRoutes } from './api/routes.js';
import { handleStatusApi } from './api/status.js';

export async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);

    // 共享 schema 初始化（幂等；首次请求后为内存 no-op）
    if (env.DB) { await ensureSchema(env); }

    let r;

    // ── 公开端点（鉴权前）────────────────────────────────
    // placement / trace / edge-info / client_rtt / tg-webhook / OPTIONS / status / public / card
    if (r = await handlePublic(request, env, ctx, url)) return r;

    // ── 鉴权门控（admin_token cookie）─────────────────────
    const blocked = await requireAuth(request, env, url);
    if (blocked) return blocked;

    // ── 管理面板 ─────────────────────────────────────────
    if (url.pathname === '/') {
        // 条件请求：版本/内容未变时回 304，省去每次重复下载约 450KB 面板 HTML。
        const cacheHeaders = {
            "ETag": HTML_UI_ETAG,
            "Cache-Control": "private, max-age=0, must-revalidate",
        };
        if (request.headers.get('If-None-Match') === HTML_UI_ETAG) {
            return new Response(null, { status: 304, headers: cacheHeaders });
        }
        return new Response(HTML_UI, {
            headers: { "Content-Type": "text/html;charset=UTF-8", ...cacheHeaders },
        });
    }

    // ── 管理端点（保持原始相对顺序）──────────────────────
    if (r = await handleCf(request, env, ctx, url)) return r;                // analytics / route-trends / deploy / purge-cache
    if (r = await handleSystem(request, env, ctx, url)) return r;            // ping-node / _probe_now / _counts_now / speedtest-down / manual-redirect-domains
    if (r = await handleOptimizedDomains(request, env, ctx, url)) return r;  // optimized-domains CRUD + speedtest
    if (r = await handleDns(request, env, ctx, url)) return r;               // dns-ready / dns/replace / get-dns / update-dns / get-*-ips
    if (r = await handleRoutes(request, env, ctx, url)) return r;            // routes/reorder / routes/import / routes CRUD
    if (r = await handleStatusApi(request, env, ctx, url)) return r;         // status/route-flags / revoke-auth / probes / auth-state / global-flags

    // ── 反代兜底 ─────────────────────────────────────────
    return proxyRequest(request, env, ctx, url);
}

// VERSION: 2.4.0
// 🟢 面板核心配置区 (放在最顶端方便修改)

// ── imports ─────────────────────────────────────────────────────────────────
import { CURRENT_VERSION, GITHUB_RAW_URL } from './util/version.js';
import { jsonResponse } from './util/json.js';
import { htmlEscape, nowLocalDayStr } from './util/text.js';
import { newShareToken } from './util/share.js';
import { dbRun, dbAll, dbFirst } from './db/helpers.js';
import { ensureSchema } from './db/schema.js';
import { CSS_COMMON } from './ui/css.js';
import { LOGIN_UI } from './ui/login.js';
import { HTML_UI } from './ui/dashboard.js';
import { SVG_TG, ecgStripSvg, renderCardSvg } from './ui/svg.js';
import { tokenKey, b64encode, b64decode, encryptToken, decryptToken, extractEmbyToken, persistHarvestedToken } from './emby/tokens.js';
import { parseCustomHeadersForProbe, parseCustomHeaderEmbyToken, buildEmbyClientHeaders, buildUpstreamHeaders } from './emby/headers.js';
import { fetchItemCounts, maybeFetchMediaCounts } from './emby/counts.js';
import { probeTargetFor, probeOne, probeAll } from './probes/probe.js';
import { maybeRollupHourly, runAlertFSM } from './probes/alerts.js';
import { getCFTraffic } from './stats/cf.js';
import { sendTgStats } from './stats/telegram.js';
import { loadStatusData, renderStatusHtml } from './status/page.js';
import { validateRoutePrefix, hostMatchesAllowlist, probeDomain, loadCountryAllowlist, getManualRedirectHosts, updateManualRedirectHosts } from './routing/validate.js';
import { flipScheme, fetchWithSchemeFallback, attempt403Cascade } from './net/fallback.js';
import { HARVEST_MEM } from './emby/tokens.js';
// ────────────────────────────────────────────────────────────────────────────

// ==========================================
// 反代核心健壮性辅助函数 (proxy-core robustness helpers)
// ==========================================
const MAX_RETRY_BODY_BYTES = 8 * 1024 * 1024; // 8MB：超过此值的请求体不缓冲、不重试
const MAX_UPSTREAM_TIMEOUT_MS = 15000; // F2: 每个上游单次超时

// ==========================================
// emby-js 监控移植：令牌收割去抖常量
// ==========================================
const EMBY_HARVEST_DEBOUNCE_S = 600;       // 同令牌 10 min 内不重复写 D1

export default {
    // 定时触发器：1 分钟 cron 跑节点探测；每日 0 点 cron 推送 TG 统计
    async scheduled(event, env, ctx) {
        const cron = event && event.cron || '';
        if (cron === '0 0 * * *') {
            if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
                ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
            }
            if (env.DB) {
                ctx.waitUntil((async () => {
                    try {
                        await ensureSchema(env);
                        const { results: routes } = await dbAll(env, `
                            SELECT prefix, target, custom_headers, media_counts_auto_auth, emby_auth_cache
                              FROM routes WHERE show_on_status = 1 AND media_counts_auto_auth = 1
                        `);
                        await maybeFetchMediaCounts(env, routes || [], Math.floor(Date.now() / 1000));
                    } catch (e) {
                        console.log('scheduled maybeFetchMediaCounts error:', e && e.message || e);
                    }
                })());
            }
            return;
        }
        if (cron === '* * * * *') {
            if (env.DB) ctx.waitUntil(probeAll(env));
            return;
        }
        // 未配置 / 未知 cron：兼容旧部署，仅触发 TG 日报
        if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
            ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
        }
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 共享 schema 初始化（幂等；首次请求后为内存 no-op）
        if (env.DB) { await ensureSchema(env); }

        // ==========================================
        // 🚀 新增：全云厂商 Worker 放置区域接口
        // ==========================================
        if (url.pathname === '/api/placement' && request.method === 'POST') {
            try {
                const body = await request.json();
                const placementData = body.placement;

                if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_WORKER_NAME) {
                    return jsonResponse({ success: false, msg: '后台变量未配置全！请检查 CF_API_TOKEN, CF_ACCOUNT_ID, CF_WORKER_NAME' });
                }

                const formData = new FormData();
                formData.append('settings', new Blob([JSON.stringify({ placement: placementData })], { type: 'application/json' }));

                const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${env.CF_WORKER_NAME}/settings`;
                const cfRes = await fetch(cfUrl, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}` },
                    body: formData
                });

                const cfData = await cfRes.json();
                if (cfData.success) {
                    return jsonResponse({ success: true, msg: '部署区域修改成功！' });
                } else {
                    return jsonResponse({ success: false, msg: 'CF报错: ' + (cfData.errors[0]?.message || '未知错误') });
                }
            } catch (e) {
                return jsonResponse({ success: false, msg: e.message });
            }
        }

        // ==========================================
        // 🚀 新增：CF 节点与落地机房探针接口
        // ==========================================
        if (url.pathname === '/api/trace') {
            const cf = request.cf || {};
            let egressColo = '探测中...';
            try {
                // 请求 CF 官方 trace 接口获取落地机房
                const traceRes = await fetch('https://1.1.1.1/cdn-cgi/trace', {
                    headers: { 'User-Agent': 'Mozilla/5.0 (CF-Worker-Trace)' }
                });
                const traceText = await traceRes.text();
                const match = traceText.match(/colo=([A-Z]+)/);
                if (match) egressColo = match[1];
            } catch (e) {
                egressColo = '获取失败';
            }

            return jsonResponse({
                success: true,
                entryCountry: cf.country || '未知',
                entryCity: cf.city || '',
                entryColo: cf.colo || '未知',
                egressColo: egressColo
            });
        }

        // ==========================================
        // 🚀 F5: /api/edge-info — /api/trace 的别名，附带 cacheKey（5 分钟桶 SHA-1）
        // ==========================================
        if (url.pathname === '/api/edge-info') {
            const cf = request.cf || {};
            let egressColo = '探测中...';
            try {
                const traceRes = await fetch('https://1.1.1.1/cdn-cgi/trace', {
                    headers: { 'User-Agent': 'Mozilla/5.0 (CF-Worker-Trace)' }
                });
                const traceText = await traceRes.text();
                const match = traceText.match(/colo=([A-Z]+)/);
                if (match) egressColo = match[1];
            } catch (e) {
                egressColo = '获取失败';
            }

            const entryColo = cf.colo || '未知';
            const bucket = Math.floor(Date.now() / 300000);
            let cacheKey = '';
            try {
                const buf = new TextEncoder().encode(`${entryColo}:${egressColo}:${bucket}`);
                const digest = await crypto.subtle.digest('SHA-1', buf);
                cacheKey = Array.from(new Uint8Array(digest)).slice(0, 8)
                    .map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) { cacheKey = ''; }

            return jsonResponse({
                success: true,
                entryCountry: cf.country || '未知',
                entryCity: cf.city || '',
                entryColo,
                egressColo,
                cacheKey
            });
        }

        // ==========================================
        // 🌟 新增：客户端 RTT 实时极速探针接口
        // 直接返回 204 无内容，且强制不缓存，确保每次都是真实的物理延迟
        // ==========================================
        if (url.pathname === '/__client_rtt__') {
            return new Response(null, {
                status: 204,
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        // Telegram Webhook 拦截
        if (url.pathname === '/api/tg-webhook' && request.method === 'POST') {
            try {
                const body = await request.json();
                if (body.message && body.message.text === '/stats') {
                    if (env.DB && env.TG_BOT_TOKEN) {
                        ctx.waitUntil(sendTgStats(env, body.message.chat.id));
                    }
                }
                return new Response("OK");
            } catch (e) { return new Response("OK"); }
        }

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Max-Age": "86400" } });
        }

        // ==========================================
        // emby-js 监控移植：公开页面（无需 admin 鉴权）
        // ==========================================
        if (url.pathname === '/status' && request.method === 'GET') {
            if (!env.DB) return new Response('DB not bound', { status: 500 });
            try {
                const data = await loadStatusData(env, {});
                const hideRow = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'status_hide_node_names'`);
                const hideNames = !!(hideRow && hideRow.v === '1');
                return new Response(renderStatusHtml(data, { title: '节点状态', hideNames }), {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public, max-age=10' }
                });
            } catch (e) {
                return new Response('Status error: ' + e.message, { status: 500 });
            }
        }
        if (url.pathname.startsWith('/public/') && request.method === 'GET') {
            if (!env.DB) return new Response('DB not bound', { status: 500 });
            const token = url.pathname.slice('/public/'.length);
            if (!/^[a-f0-9]{32,80}$/.test(token)) {
                return new Response('Invalid token', { status: 410, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } });
            }
            try {
                const row = await dbFirst(env, `SELECT scope, expires_at FROM emby_public_share WHERE token = ? AND scope = 'dashboard'`, token);
                if (!row || (row.expires_at | 0) <= Math.floor(Date.now() / 1000)) {
                    return new Response('链接已过期或失效', { status: 410, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } });
                }
                const data = await loadStatusData(env, {});
                return new Response(renderStatusHtml(data, { title: '节点状态（公开）' }), {
                    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public, max-age=10' }
                });
            } catch (e) {
                return new Response('Public status error: ' + e.message, { status: 500 });
            }
        }
        if (url.pathname.startsWith('/card/') && url.pathname.endsWith('.svg') && request.method === 'GET') {
            if (!env.DB) return new Response('DB not bound', { status: 500 });
            const token = url.pathname.slice('/card/'.length, -'.svg'.length);
            if (!/^[a-f0-9]{32,80}$/.test(token)) {
                return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">链接无效</text></svg>', {
                    status: 410, headers: { 'Content-Type': 'image/svg+xml;charset=UTF-8' }
                });
            }
            try {
                const row = await dbFirst(env, `SELECT scope, prefix, expires_at FROM emby_public_share WHERE token = ? AND scope = 'card'`, token);
                if (!row || (row.expires_at | 0) <= Math.floor(Date.now() / 1000)) {
                    return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">链接已过期</text></svg>', {
                        status: 410, headers: { 'Content-Type': 'image/svg+xml;charset=UTF-8' }
                    });
                }
                const data = await loadStatusData(env, { prefix: row.prefix });
                if (!data.cards.length) {
                    return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">节点已下线或未开启状态</text></svg>', {
                        status: 410, headers: { 'Content-Type': 'image/svg+xml;charset=UTF-8' }
                    });
                }
                return new Response(renderCardSvg(data.cards[0]), {
                    headers: { 'Content-Type': 'image/svg+xml;charset=UTF-8', 'Cache-Control': 'public, max-age=60' }
                });
            } catch (e) {
                return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">渲染失败</text></svg>', {
                    status: 500, headers: { 'Content-Type': 'image/svg+xml;charset=UTF-8' }
                });
            }
        }

        const EXPECTED_TOKEN = env.ADMIN_TOKEN;
        if (!EXPECTED_TOKEN) return new Response("请在 Worker 变量中配置 ADMIN_TOKEN", { status: 500 });

        function getCookie(req, name) {
            const cookieString = req.headers.get("Cookie");
            if (!cookieString) return null;
            const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
            if (match) return decodeURIComponent(match[2]);
            return null;
        }

        const isPanelOrApi = url.pathname === '/' || url.pathname.startsWith('/api/');
        if (isPanelOrApi && url.pathname !== '/api/tg-webhook') {
            const providedToken = getCookie(request, 'admin_token');
            if (providedToken !== EXPECTED_TOKEN) {
                if (url.pathname === '/') return new Response(LOGIN_UI, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
                else return new Response('Unauthorized', { status: 401 });
            }
        }

        if (url.pathname === '/') {
            return new Response(HTML_UI, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        // ==========================================
        // 2.3 数据大屏统计接口 (Analytics)
        // ==========================================
        if (url.pathname === '/api/analytics' && request.method === 'GET') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            try {
                // 并发获取 24小时、7天、30天流量 (通过全新 GraphQL API 规避限制)
                const [trafficToday, traffic7d, traffic30d] = await Promise.all([
                    getCFTraffic(env, 'today'),
                    getCFTraffic(env, 7),
                    getCFTraffic(env, 30)
                ]);

                const trend = await dbAll(env, `SELECT date(timestamp, '+8 hours') as date, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY date(timestamp, '+8 hours') ORDER BY date ASC`);
                const locations = await dbAll(env, `SELECT country, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY country ORDER BY count DESC`);
                const recents = await dbAll(env, `SELECT prefix, datetime(timestamp, '+8 hours') as timestamp, ip, country, ua FROM visitor_logs ORDER BY timestamp DESC LIMIT 20`);

                return Response.json({
                    success: true,
                    trend: trend.results,
                    locations: locations.results,
                    recents: recents.results,
                    trafficToday, traffic7d, traffic30d
                });
            } catch (e) {
                return Response.json({ success: false, error: e.message });
            }
        }

        // ==========================================
        // 节点近 N 天每日流量趋势 (sparkline 数据源)
        // 口径：CF GraphQL httpRequestsAdaptiveGroups, 按 clientRequestPath_like "/<prefix>%" 过滤,
        //       date 维度分组, 缺失日补 0, 顺序最早 → 今日 (UTC)。
        // ==========================================
        if (url.pathname === '/api/route-trends' && request.method === 'GET') {
            const days = Math.max(1, Math.min(7, parseInt(url.searchParams.get('days') || '7', 10) || 7));

            if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
                return Response.json({ ok: false, reason: 'no-cf-token', days, items: [] });
            }
            if (!env.DB) {
                return Response.json({ ok: false, reason: 'no-db', days, items: [] });
            }

            try {
                const utcHour = Math.floor(Date.now() / 3600000);
                const cacheKey = `${env.CF_ZONE_ID}|${days}|${utcHour}`;
                globalThis.__routeTrendCache = globalThis.__routeTrendCache || new Map();
                const cached = globalThis.__routeTrendCache.get(cacheKey);
                const now = Date.now();
                if (cached && cached.expireAt > now) {
                    return Response.json(cached.payload);
                }

                const { results: routes } = await dbAll(env, `SELECT prefix FROM routes`);
                if (!routes || routes.length === 0) {
                    return Response.json({ ok: false, reason: 'no-routes', days, items: [] });
                }

                const todayUtc = new Date();
                todayUtc.setUTCHours(0, 0, 0, 0);
                const dayKeys = [];
                for (let i = days - 1; i >= 0; i--) {
                    const d = new Date(todayUtc.getTime() - i * 86400000);
                    dayKeys.push(d.toISOString().split('T')[0]);
                }
                const startIso = new Date(todayUtc.getTime() - (days - 1) * 86400000).toISOString();
                const endIso = new Date(todayUtc.getTime() + 86400000 - 1).toISOString();

                const items = await Promise.all(routes.map(async (r) => {
                    const empty = dayKeys.map(() => 0);
                    try {
                        const q = {
                            query: `query {
                              viewer {
                                zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                                  httpRequestsAdaptiveGroups(
                                    limit: ${days},
                                    filter: {
                                      clientRequestPath_like: "/${r.prefix}%",
                                      datetime_geq: "${startIso}",
                                      datetime_leq: "${endIso}"
                                    },
                                    orderBy: [date_ASC]
                                  ) {
                                    dimensions { date }
                                    sum { edgeResponseBytes }
                                  }
                                }
                              }
                            }`
                        };
                        const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(q)
                        });
                        const cfData = await cfRes.json();
                        const groups = cfData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
                        const byDate = new Map();
                        for (const g of groups) {
                            byDate.set(g.dimensions?.date, g.sum?.edgeResponseBytes || 0);
                        }
                        const bytes = dayKeys.map(d => byDate.get(d) || 0);
                        return { prefix: r.prefix, bytes };
                    } catch (e) {
                        return { prefix: r.prefix, bytes: empty };
                    }
                }));

                const payload = {
                    ok: true,
                    days,
                    generated_at: Math.floor(now / 1000),
                    source: 'cf-graphql',
                    items
                };
                globalThis.__routeTrendCache.set(cacheKey, { expireAt: now + 30 * 60 * 1000, payload });
                return Response.json(payload);
            } catch (e) {
                return Response.json({ ok: false, reason: 'graphql-failed', error: e.message, days, items: [] });
            }
        }

        // ==========================================
        // 🟢 后端接口：执行代码覆盖更新 (纯JSON接口无损继承：变量、数据库、兼容性、放置地区)
        // ==========================================
        if (url.pathname === '/api/deploy' && request.method === 'POST') {
            const cfToken = env.CF_API_TOKEN;
            const accountId = env.CF_ACCOUNT_ID;
            const workerName = env.CF_WORKER_NAME;
            if (!cfToken || !accountId || !workerName) {
                return Response.json({ success: false, error: '缺少 CF_API_TOKEN, CF_ACCOUNT_ID 或 CF_WORKER_NAME 环境变量' });
            }
            try {
                const body = await request.json();
                if (!body.newCode) return Response.json({ success: false, error: '代码内容为空。' });

                // 1. 🚀 终极修复：调用纯 JSON 的 services 接口获取真实配置，绝对不再崩溃！
                const serviceRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/services/${workerName}`, {
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
                const serviceData = await serviceRes.json();

                let compDate = "2024-01-01"; // 依然保留兜底，但这次绝不会用到
                let compFlags = undefined;
                let placement = undefined;

                if (serviceData.success && serviceData.result) {
                    // 精准从 JSON 中提取你原本的配置
                    let scriptInfo = null;
                    if (serviceData.result.default_environment && serviceData.result.default_environment.script) {
                        scriptInfo = serviceData.result.default_environment.script;
                    } else if (serviceData.result.script) {
                        scriptInfo = serviceData.result.script;
                    }

                    if (scriptInfo) {
                        if (scriptInfo.compatibility_date) compDate = scriptInfo.compatibility_date;
                        if (scriptInfo.compatibility_flags) compFlags = scriptInfo.compatibility_flags;
                        if (scriptInfo.placement) placement = scriptInfo.placement;
                    }
                }

                const preservedBindings = [];
                // 2. 备份普通的字符串变量
                for (const key in env) {
                    if (typeof env[key] === 'string') {
                        preservedBindings.push({ name: key, type: 'plain_text', text: env[key] });
                    }
                }

                // 3. 拉取 D1、KV 等高级绑定并无损合并
                const bindingsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/bindings`, {
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
                const bindingsData = await bindingsRes.json();
                if (bindingsData.success && Array.isArray(bindingsData.result)) {
                    for (const b of bindingsData.result) {
                        if (b.type !== 'plain_text' && b.type !== 'secret_text' && b.type !== 'inherited') {
                            preservedBindings.push(b);
                        }
                    }
                }

                // 4. 组装最终的部署请求
                const formData = new FormData();
                const metadata = {
                    main_module: 'worker.js',
                    bindings: preservedBindings,
                    compatibility_date: compDate
                };
                if (compFlags) metadata.compatibility_flags = compFlags;
                if (placement) metadata.placement = placement; // 🎯 完美带上你原始的放置地区！

                formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
                formData.append('worker.js', new Blob([body.newCode], { type: 'application/javascript+module' }), 'worker.js');

                const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
                const res = await fetch(cfUrl, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${cfToken}` },
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    return Response.json({ success: true, msg: '代码更新成功，并已完美保留原有放置地区和兼容配置！' });
                } else {
                    throw new Error(JSON.stringify(data.errors));
                }
            } catch (e) {
                return Response.json({ success: false, error: e.message });
            }
        }
        // ==========================================
        // 2.4 系统级与提取工具 API 
        // ==========================================
        if (url.pathname === '/api/purge-cache' && request.method === 'POST') {
            const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID;
            if (!cfToken || !zoneId) return Response.json({ success: false, error: '缺少 CF_API_TOKEN 或 CF_ZONE_ID 变量' });
            try {
                const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, { method: 'POST', headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ purge_everything: true }) });
                const data = await res.json();
                if (!data.success) throw new Error(JSON.stringify(data.errors));
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }); }
        }

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
                    SELECT prefix, target, custom_headers, media_counts_auto_auth, emby_auth_cache
                      FROM routes WHERE show_on_status = 1 AND media_counts_auto_auth = 1
                `);
                const now = Math.floor(Date.now() / 1000);
                await maybeFetchMediaCounts(env, routes || [], now);
                return Response.json({ ok: true, routes: (routes || []).length, ms: Date.now() - t0 });
            } catch (e) {
                return Response.json({ ok: false, error: String(e && e.message || e), ms: Date.now() - t0 }, { status: 500 });
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
                const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'manual_redirect_domains'`);
                const domains = String(row?.v || '').split('\n').map(s => s.trim()).filter(Boolean);
                return Response.json({ success: true, domains });
            }
            if (request.method === 'POST') {
                try {
                    const body = await request.json();
                    const list = Array.isArray(body.domains) ? body.domains : [];
                    const cleaned = list.map(s => String(s || '').trim().toLowerCase()).filter(s => s && /^[a-z0-9.-]+$/.test(s));
                    const v = cleaned.join('\n');
                    await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('manual_redirect_domains', ?, CURRENT_TIMESTAMP)`, v);
                    updateManualRedirectHosts(new Set(cleaned));
                    return Response.json({ success: true, domains: cleaned });
                } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
            }
            return new Response("Method not allowed", { status: 405 });
        }

        // ==========================================
        // 🚀 F4: 优选域名 CRUD + 测速
        // ==========================================
        if (url.pathname === '/api/optimized-domains' && request.method === 'GET') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            const { results } = await dbAll(env, `SELECT id, domain, note, builtin, enabled, last_ms FROM optimized_domains ORDER BY builtin DESC, id ASC`);
            return Response.json({ success: true, items: results || [] });
        }
        if (url.pathname === '/api/optimized-domains' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            try {
                const { domain, note } = await request.json();
                const d = String(domain || '').trim().toLowerCase();
                if (!d || !/^[a-z0-9.-]+$/.test(d)) return Response.json({ success: false, error: '域名格式非法' }, { status: 400 });
                await dbRun(env, `INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 0, 1)`, d, String(note || ''));
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
        }
        if (url.pathname.startsWith('/api/optimized-domains/') && url.pathname !== '/api/optimized-domains/speedtest') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            const id = parseInt(url.pathname.split('/').pop(), 10);
            if (!id) return Response.json({ success: false, error: 'invalid id' }, { status: 400 });
            const row = await dbFirst(env, `SELECT * FROM optimized_domains WHERE id = ?`, id);
            if (!row) return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
            if (request.method === 'PATCH') {
                try {
                    const body = await request.json();
                    const enabled = body.enabled === undefined ? row.enabled : (body.enabled ? 1 : 0);
                    const note = body.note === undefined ? row.note : String(body.note || '');
                    await dbRun(env, `UPDATE optimized_domains SET enabled = ?, note = ? WHERE id = ?`, enabled, note, id);
                    return Response.json({ success: true });
                } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
            }
            if (request.method === 'DELETE') {
                if (row.builtin) return Response.json({ success: false, error: '内置域名不可删除（可禁用）' }, { status: 400 });
                await dbRun(env, `DELETE FROM optimized_domains WHERE id = ?`, id);
                return Response.json({ success: true });
            }
            return new Response("Method not allowed", { status: 405 });
        }
        if (url.pathname === '/api/optimized-domains/speedtest' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            const { results } = await dbAll(env, `SELECT id, domain FROM optimized_domains WHERE enabled = 1`);
            const rows = results || [];
            const measured = await Promise.all(rows.map(async r => {
                const probe = await probeDomain(r.domain);
                return { id: r.id, domain: r.domain, ms: probe.ms, ok: probe.ok };
            }));
            // 持久化 last_ms
            try {
                const stmts = measured.map(m => env.DB.prepare(`UPDATE optimized_domains SET last_ms = ? WHERE id = ?`).bind(m.ms, m.id));
                if (stmts.length) await env.DB.batch(stmts);
            } catch (e) {}
            measured.sort((a, b) => {
                if (!a.ok && !b.ok) return 0;
                if (!a.ok) return 1;
                if (!b.ok) return -1;
                return a.ms - b.ms;
            });
            return Response.json({ success: true, items: measured });
        }

        // 检查 DNS 替换前置条件（env 变量是否齐全）
        if (url.pathname === '/api/dns-ready' && request.method === 'GET') {
            const ok = !!(env.CF_API_TOKEN && env.CF_ZONE_ID && env.CF_DOMAIN);
            return Response.json({ success: true, ready: ok, domain: env.CF_DOMAIN || '' });
        }
        if (url.pathname === '/api/dns/replace' && request.method === 'POST') {
            try {
                const body = await request.json();
                const newDomain = String(body.domain || '').trim().toLowerCase();
                if (!newDomain) return Response.json({ success: false, error: '缺少目标域名' }, { status: 400 });
                const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;
                if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: '缺少环境变量 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN' }, { status: 400 });

                // 拉取该域名下所有 A/AAAA/CNAME 记录
                const listRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, {
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
                const listData = await listRes.json();
                if (!listData.success) return Response.json({ success: false, error: 'CF 拉取记录失败: ' + JSON.stringify(listData.errors) }, { status: 502 });

                const oldRecords = (listData.result || []).filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                // 删除旧 A/AAAA/CNAME
                for (const r of oldRecords) {
                    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${r.id}`, {
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${cfToken}` }
                    });
                }
                // 写入新 CNAME
                const postRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'CNAME', name: domain, content: newDomain, ttl: 60, proxied: false })
                });
                const postData = await postRes.json();
                if (!postData.success) return Response.json({ success: false, error: 'CF 写入失败: ' + JSON.stringify(postData.errors) }, { status: 502 });
                return Response.json({ success: true, name: domain, content: newDomain, replaced: oldRecords.length });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 500 }); }
        }

        if (url.pathname === '/api/get-dns') {
            const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;
            if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: '缺少 DNS 环境变量' });
            try {
                const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, { headers: { 'Authorization': `Bearer ${cfToken}` } });
                const getData = await getRes.json();
                return Response.json({ success: true, result: getData.result });
            } catch (error) { return Response.json({ success: false, error: error.message }); }
        }

        if (url.pathname === '/api/update-dns' && request.method === 'POST') {
            const body = await request.json(); const ips = body.ips;
            const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;

            if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: '缺少 DNS 环境变量' });
            try {
                const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, { headers: { 'Authorization': `Bearer ${cfToken}` } });
                const getData = await getRes.json();
                if (!getData.success) throw new Error('获取现有 DNS 记录失败');

                const oldRecords = getData.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                for (const record of oldRecords) {
                    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${cfToken}` } });
                }

                for (const ip of ips) {
                    const cleanItem = ip.replace(/[\[\]]/g, ''); let recordType = 'A';
                    if (cleanItem.includes(':')) recordType = 'AAAA'; else if (/[a-zA-Z]/.test(cleanItem)) recordType = 'CNAME';

                    const postRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, { method: 'POST', headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: recordType, name: domain, content: cleanItem, ttl: 60, proxied: false }) });
                    const postData = await postRes.json();
                    if (!postData.success) throw new Error(`记录提交失败: ` + JSON.stringify(postData.errors));
                }
                return Response.json({ success: true, message: `✅ 成功！` });
            } catch (error) { return Response.json({ success: false, error: error.message }); }
        }

        if (url.pathname === '/api/get-custom-api-ips') {
            try {
                const apiUrl = url.searchParams.get('url');
                if (!apiUrl) throw new Error("缺少 URL");
                const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const text = await response.text(); let validIPs = new Set();
                try {
                    const jsonObj = JSON.parse(text);
                    if (jsonObj && jsonObj.data && Array.isArray(jsonObj.data)) {
                        jsonObj.data.forEach(item => { if (item.ip) { let ip = item.ip; if (ip.includes(':') && !ip.startsWith('[')) ip = `[${ip}]`; validIPs.add(ip); } });
                    }
                } catch (e) { }

                if (validIPs.size === 0) {
                    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
                    const matchedIPv4 = text.match(ipv4Regex) || [];
                    matchedIPv4.forEach(ip => { if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) validIPs.add(ip); });

                    const ipv6Regex = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;
                    const matchedIPv6 = text.match(ipv6Regex) || [];
                    matchedIPv6.forEach(ip => { if (ip.length > 7 && ip.includes(':') && !ip.startsWith('::1')) validIPs.add(ip.startsWith('[') ? ip : `[${ip}]`); });
                }
                const uniqueIPArray = Array.from(validIPs);
                for (let i = uniqueIPArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]]; }
                return Response.json({ success: true, ips: uniqueIPArray.slice(0, 15), totalCount: uniqueIPArray.length });
            } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
        }

        if (url.pathname === '/api/get-remote-ips') {
            try {
                const reqType = (url.searchParams.get('type') || 'all').toLowerCase();
                const validIPs = new Set();

                if (['all', '电信', '联通', '移动', '多线', 'ipv6'].includes(reqType)) {
                    try {
                        const res1 = await fetch('https://api.uouin.com/cloudflare.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                        if (res1.ok) {
                            const text1 = await res1.text(); const cleanText = text1.replace(/<[^>]+>/g, ' ');
                            const regex = /(电信|联通|移动|多线|ipv6)\s+((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-fA-F0-9]{1,4}:)+[a-fA-F0-9]{1,4})/gi;
                            let match; while ((match = regex.exec(cleanText)) !== null) {
                                const lineType = match[1].toLowerCase(); let ip = match[2];
                                if (ip.includes(':') && !ip.startsWith('[')) ip = `[${ip}]`;
                                if (reqType === 'all' || reqType === lineType) validIPs.add(ip);
                            }
                        }
                    } catch (e) { }
                }

                if (['all', '优选'].includes(reqType)) {
                    try {
                        const res2 = await fetch('https://raw.githubusercontent.com/ZhiXuanWang/cf-speed-dns/refs/heads/main/ipTop10.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                        if (res2.ok) {
                            const text2 = await res2.text(); const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
                            const matched = text2.match(ipv4Regex) || []; matched.forEach(ip => { if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) validIPs.add(ip); });
                        }
                    } catch (e) { }
                }
                const uniqueIPArray = Array.from(validIPs);
                for (let i = uniqueIPArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]]; }
                return Response.json({ success: true, ips: uniqueIPArray.slice(0, 10), totalCount: uniqueIPArray.length });
            } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
        }

        // ==========================================
        // 2.5 数据库路由管理 API 
        // ==========================================
        if (url.pathname === '/api/routes/reorder' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: "未绑定 DB" });
            try {
                const items = await request.json();
                const stmts = items.map(item => env.DB.prepare('UPDATE routes SET sort_order = ? WHERE prefix = ?').bind(item.sort_order, item.prefix));
                await env.DB.batch(stmts);
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }); }
        }

        if (url.pathname === '/api/routes/import' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: "未绑定 DB" });
            try {
                const routes = await request.json();
                const skipped = []; let imported = 0;
                for (const r of routes) {
                    if (!r.prefix || !r.target) { skipped.push({ prefix: r.prefix || '(空)', reason: '缺少 prefix 或 target' }); continue; }
                    const reason = validateRoutePrefix(r.prefix);
                    if (reason) { skipped.push({ prefix: r.prefix, reason }); continue; }
                    await dbRun(env, 'INSERT OR REPLACE INTO routes (prefix, target, mode, remark, last_play, icon, cache_img, sort_order, custom_headers, backend_url, show_on_status, public_alias, media_counts_auto_auth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        r.prefix, r.target, r.mode || 'off', r.remark || '', r.last_play || '', r.icon || '', r.cache_img || 'on', r.sort_order || 0, r.custom_headers || '', r.backend_url || '', r.show_on_status ? 1 : 0, r.public_alias || '', r.media_counts_auto_auth ? 1 : 0);
                    imported++;
                }
                return Response.json({ success: true, imported, skipped });
            } catch (e) { return Response.json({ success: false, error: e.message }); }
        }

        // ==========================================
        // emby-js 监控移植：节点状态开关 + 公开分享 + 令牌撤销
        // ==========================================
        if (url.pathname === '/api/status/route-flags' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            await ensureSchema(env);
            try {
                const body = await request.json();
                const prefix = String(body.prefix || '').trim();
                if (!prefix) return Response.json({ success: false, error: '缺少 prefix' }, { status: 400 });
                const exists = await dbFirst(env, `SELECT prefix FROM routes WHERE prefix = ?`, prefix);
                if (!exists) return Response.json({ success: false, error: '节点不存在' }, { status: 404 });
                const fields = [];
                const values = [];
                if (body.show_on_status !== undefined) { fields.push('show_on_status = ?'); values.push(body.show_on_status ? 1 : 0); }
                if (body.public_alias !== undefined) { fields.push('public_alias = ?'); values.push(String(body.public_alias || '').trim()); }
                if (body.media_counts_auto_auth !== undefined) { fields.push('media_counts_auto_auth = ?'); values.push(body.media_counts_auto_auth ? 1 : 0); }
                if (!fields.length) return Response.json({ success: false, error: '无字段需要更新' }, { status: 400 });
                values.push(prefix);
                await dbRun(env, `UPDATE routes SET ${fields.join(', ')} WHERE prefix = ?`, ...values);
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
        }
        if (url.pathname === '/api/status/revoke-auth' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            await ensureSchema(env);
            try {
                const body = await request.json();
                const prefix = String(body.prefix || '').trim();
                if (!prefix) return Response.json({ success: false, error: '缺少 prefix' }, { status: 400 });
                await dbRun(env, `UPDATE routes SET emby_auth_cache = '', emby_auth_seen_at = 0, emby_auth_used_at = 0 WHERE prefix = ?`, prefix);
                HARVEST_MEM.delete(prefix);
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
        }
        // Admin probe data: same shape as /status (cards[]) — drives ECG strips on overview.
        if (url.pathname === '/api/status/probes' && request.method === 'GET') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            try {
                const data = await loadStatusData(env, {});
                return Response.json({ success: true, cards: data.cards });
            } catch (e) {
                return Response.json({ success: false, error: e.message }, { status: 500 });
            }
        }
        if (url.pathname === '/api/status/auth-state' && request.method === 'GET') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            await ensureSchema(env);
            const { results } = await dbAll(env, `
                SELECT prefix, show_on_status, public_alias, media_counts_auto_auth,
                       CASE WHEN emby_auth_cache = '' THEN 0 ELSE 1 END AS has_token,
                       emby_auth_seen_at, emby_auth_used_at
                  FROM routes
            `);
            return Response.json({ success: true, items: results || [] });
        }
        if (url.pathname === '/api/status/global-flags' && request.method === 'GET') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            await ensureSchema(env);
            const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'status_hide_node_names'`);
            const ccRow = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'proxy_country_allowlist'`);
            return Response.json({
                success: true,
                hide_node_names: (row && row.v === '1') ? 1 : 0,
                country_allowlist: (ccRow && ccRow.v) ? ccRow.v : ''
            });
        }
        if (url.pathname === '/api/status/global-flags' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            await ensureSchema(env);
            try {
                const body = await request.json();
                if (body.hide_node_names !== undefined) {
                    const v = body.hide_node_names ? '1' : '0';
                    await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('status_hide_node_names', ?, CURRENT_TIMESTAMP)`, v);
                }
                if (body.country_allowlist !== undefined) {
                    const raw = String(body.country_allowlist || '');
                    const codes = Array.from(new Set(
                        raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
                    ));
                    const v = codes.join(',');
                    await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('proxy_country_allowlist', ?, CURRENT_TIMESTAMP)`, v);
                }
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
        }
        if (url.pathname === '/api/share/dashboard' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            await ensureSchema(env);
            try {
                const token = newShareToken();
                const now = Math.floor(Date.now() / 1000);
                const expires = now + 3600;
                await env.DB.batch([
                    env.DB.prepare(`DELETE FROM emby_public_share WHERE scope = 'dashboard'`),
                    env.DB.prepare(`INSERT INTO emby_public_share(token, scope, prefix, expires_at, created_at) VALUES(?, 'dashboard', '', ?, ?)`).bind(token, expires, now)
                ]);
                const origin = new URL(request.url).origin;
                return Response.json({ success: true, token, url: `${origin}/public/${token}`, expires_at: expires });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 500 }); }
        }
        if (url.pathname === '/api/share/card' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
            await ensureSchema(env);
            try {
                const body = await request.json();
                const prefix = String(body.prefix || '').trim();
                if (!prefix) return Response.json({ success: false, error: '缺少 prefix' }, { status: 400 });
                const exists = await dbFirst(env, `SELECT show_on_status FROM routes WHERE prefix = ?`, prefix);
                if (!exists) return Response.json({ success: false, error: '节点不存在' }, { status: 404 });
                if (!exists.show_on_status) return Response.json({ success: false, error: '该节点未开启“在状态页展示”，无法生成分享卡片' }, { status: 400 });
                const token = newShareToken();
                const now = Math.floor(Date.now() / 1000);
                const expires = now + 3600;
                await env.DB.batch([
                    env.DB.prepare(`DELETE FROM emby_public_share WHERE scope = 'card' AND prefix = ?`).bind(prefix),
                    env.DB.prepare(`INSERT INTO emby_public_share(token, scope, prefix, expires_at, created_at) VALUES(?, 'card', ?, ?, ?)`).bind(token, prefix, expires, now)
                ]);
                const origin = new URL(request.url).origin;
                return Response.json({ success: true, token, url: `${origin}/card/${token}.svg`, expires_at: expires });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 500 }); }
        }

        if (url.pathname.startsWith('/api/routes')) {
            if (!env.DB) return Response.json({ error: "由于未绑定 D1 数据库，反代功能不可用。" }, { status: 500 });

            await env.DB.exec(`CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)`);
            await env.DB.exec(`CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))`);
            // 大数据记录核心表：访客日志
            await env.DB.exec(`CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)`);

            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN mode TEXT DEFAULT 'off'`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN remark TEXT DEFAULT ''`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN last_play TEXT DEFAULT ''`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN icon TEXT DEFAULT ''`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN cache_img TEXT DEFAULT 'on'`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN sort_order INTEGER DEFAULT 0`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN custom_headers TEXT DEFAULT ''`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN backend_url TEXT DEFAULT ''`); } catch (e) { }

            // 数据防爆清理策略：自动清理过去 7 天的精细日志
            try { await env.DB.exec(`DELETE FROM visitor_logs WHERE timestamp < datetime('now', '-7 days')`); } catch (e) { }

            // 🚀 【方案A修复版】：独立并发查流，完美绕过 CF 免费版复杂度限制！
            if (request.method === 'GET') {
                const todayStr = new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0];
                const { results: routes } = await dbAll(env, `
                    SELECT r.*,
                    IFNULL(s.count, 0) as todayReqs,
                    (SELECT SUM(count) FROM request_stats WHERE prefix = r.prefix) as totalReqs
                    FROM routes r
                    LEFT JOIN request_stats s ON r.prefix = s.prefix AND s.date = ?
                    ORDER BY r.sort_order ASC, r.prefix ASC
                `, todayStr);

                if (env.CF_API_TOKEN && env.CF_ZONE_ID && routes && routes.length > 0) {
                    const end = new Date();
                    const beijingTime = new Date(end.getTime() + 8 * 3600000);
                    beijingTime.setUTCHours(0, 0, 0, 0);
                    const start = new Date(beijingTime.getTime() - 8 * 3600000);

                    // 核心修复：将“一条复杂查询”拆解为 Promise.all 并发单体查询，并且 limit 设为严格的 1
                    await Promise.all(routes.map(async (r) => {
                        try {
                            const graphqlQuery = {
                                query: `query {
                                  viewer {
                                    zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                                      httpRequestsAdaptiveGroups(
                                        limit: 1,
                                        filter: {
                                          clientRequestPath_like: "/${r.prefix}%",
                                          datetime_geq: "${start.toISOString()}",
                                          datetime_leq: "${end.toISOString()}"
                                        }
                                      ) {
                                        sum { edgeResponseBytes }
                                      }
                                    }
                                  }
                                }`
                            };

                            const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify(graphqlQuery)
                            });

                            const cfData = await cfRes.json();

                            // 精准提取该节点跑出的流量字节
                            const bytes = cfData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups?.[0]?.sum?.edgeResponseBytes || 0;

                            // 自动格式化换算单位
                            let formatted = "0 B";
                            if (bytes >= 1099511627776) formatted = (bytes / 1099511627776).toFixed(2) + " TB";
                            else if (bytes >= 1073741824) formatted = (bytes / 1073741824).toFixed(2) + " GB";
                            else if (bytes >= 1048576) formatted = (bytes / 1048576).toFixed(2) + " MB";
                            else if (bytes >= 1024) formatted = (bytes / 1024).toFixed(2) + " KB";
                            else if (bytes > 0) formatted = bytes + " B";

                            r.todayBandwidth = formatted;
                        } catch (e) {
                            r.todayBandwidth = "获取异常";
                        }
                    }));
                }

                return Response.json(routes || []);
            }

            if (request.method === 'POST') {
                const data = await request.json();
                // F1: 保留前缀 + 格式校验
                const invalidReason = validateRoutePrefix(data.prefix);
                if (invalidReason) {
                    return Response.json({ success: false, error: `路由别名 "${data.prefix}" 不可用：${invalidReason}` }, { status: 400 });
                }
                let currentSortOrder = 0;
                let prevStatusFields = { show_on_status: 0, public_alias: '', media_counts_auto_auth: 0 };
                if (data.oldPrefix && data.oldPrefix !== data.prefix) {
                    const oldRow = await dbFirst(env, 'SELECT sort_order, show_on_status, public_alias, media_counts_auto_auth FROM routes WHERE prefix = ?', data.oldPrefix);
                    if (oldRow) {
                        currentSortOrder = oldRow.sort_order;
                        prevStatusFields = { show_on_status: oldRow.show_on_status | 0, public_alias: oldRow.public_alias || '', media_counts_auto_auth: oldRow.media_counts_auto_auth | 0 };
                    }
                    await dbRun(env, 'DELETE FROM routes WHERE prefix = ?', data.oldPrefix);
                } else {
                    const oldRow = await dbFirst(env, 'SELECT sort_order, show_on_status, public_alias, media_counts_auto_auth FROM routes WHERE prefix = ?', data.prefix);
                    if (oldRow) {
                        currentSortOrder = oldRow.sort_order;
                        prevStatusFields = { show_on_status: oldRow.show_on_status | 0, public_alias: oldRow.public_alias || '', media_counts_auto_auth: oldRow.media_counts_auto_auth | 0 };
                    }
                }

                const showOnStatus = data.show_on_status === undefined ? prevStatusFields.show_on_status : (data.show_on_status ? 1 : 0);
                const publicAlias = data.public_alias === undefined ? prevStatusFields.public_alias : String(data.public_alias || '').trim();
                const mediaAuto = data.media_counts_auto_auth === undefined ? prevStatusFields.media_counts_auto_auth : (data.media_counts_auto_auth ? 1 : 0);

                await dbRun(env, 'INSERT OR REPLACE INTO routes (prefix, target, mode, remark, icon, cache_img, sort_order, custom_headers, backend_url, show_on_status, public_alias, media_counts_auto_auth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    data.prefix, data.target, data.mode || 'off', data.remark || '', data.icon || '', data.cache_img || 'on', currentSortOrder, data.custom_headers || '', data.backend_url || '', showOnStatus, publicAlias, mediaAuto);
                return Response.json({ success: true });
            }

            if (request.method === 'DELETE') {
                const prefix = url.searchParams.get('prefix'); await dbRun(env, 'DELETE FROM routes WHERE prefix = ?', prefix); return Response.json({ success: true });
            }
            return new Response("Method not allowed", { status: 405 });
        }

        // ==========================================
        // 2.6 核心反代与调度引擎
        // ==========================================
        let targetUrls = []; let currentMode = 'off'; let enableCache = true; let remainingPath = '';
        let customHeadersRaw = '';
        const decodedPath = decodeURIComponent(url.pathname); let matchedPrefix = null;
        let proxyOrigin = new URL(request.url).origin;

        if (decodedPath.startsWith('/http://') || decodedPath.startsWith('/https://')) {
            targetUrls = [decodedPath.substring(1)]; remainingPath = '';
        } else {
            const pathParts = decodedPath.split('/'); const prefix = pathParts[1];
            if (!prefix) return new Response(`Not Found`, { status: 404 });

            try {
                if (!env.DB) return new Response(`404: Node not found (DB not bound)`, { status: 404 });
                const stmt = env.DB.prepare(`SELECT target, mode, cache_img, custom_headers, media_counts_auto_auth FROM routes WHERE prefix = ?`);
                const route = await stmt.bind(prefix).first();
                if (!route) return new Response(`404: Node not found`, { status: 404 });

                currentMode = route.mode || 'off'; enableCache = (route.cache_img !== 'off');
                matchedPrefix = prefix; remainingPath = '/' + pathParts.slice(2).join('/');
                targetUrls = route.target.split(',').map(s => s.trim()).filter(Boolean);
                customHeadersRaw = route.custom_headers || '';

                // emby-js 监控移植：被动令牌收割（仅当节点显式开启 media_counts_auto_auth）
                if (route.media_counts_auto_auth === 1 && ctx && ctx.waitUntil) {
                    const tok = extractEmbyToken(request);
                    if (tok) {
                        const nowSec = Math.floor(Date.now() / 1000);
                        const last = HARVEST_MEM.get(prefix);
                        if (!last || last.token !== tok || (nowSec - last.writtenAt) > EMBY_HARVEST_DEBOUNCE_S) {
                            HARVEST_MEM.set(prefix, { token: tok, writtenAt: nowSec });
                            ctx.waitUntil(persistHarvestedToken(env, prefix, tok, nowSec));
                        }
                    }
                }

                if (remainingPath.startsWith('/http://') || remainingPath.startsWith('/https://')) { targetUrls = [remainingPath.substring(1)]; remainingPath = ''; }
            } catch (e) { return new Response("DB Error: " + e.message, { status: 500 }); }
        }

        if (targetUrls.length === 0) return new Response("404: Target empty", { status: 404 });

        // 国家白名单网关：仅当 allowlist 非空时启用；未命中或缺失 cf-ipcountry 一律拦截（fail-closed）
        const _allowSet = await loadCountryAllowlist(env);
        if (_allowSet) {
            const _cc = (request.headers.get('cf-ipcountry') || '').toUpperCase();
            if (!_cc || _cc === 'XX' || !_allowSet.has(_cc)) {
                return new Response('Forbidden: country not allowed', { status: 403 });
            }
        }

        // ==========================================
        // 2.6.5 WebSocket 反代 (Emby 会话保活 / 远程控制 / SyncPlay)
        // ==========================================
        if ((request.headers.get('Upgrade') || '').toLowerCase() === 'websocket') {
            let wsLastError = null;
            for (let i = 0; i < targetUrls.length; i++) {
                const wsTarget = new URL(targetUrls[i] + remainingPath + url.search);
                const wsHeaders = buildUpstreamHeaders(request, wsTarget, currentMode, customHeadersRaw);
                try {
                    const resp = await fetch(new Request(wsTarget, { headers: wsHeaders }));
                    if (resp.webSocket) {
                        return new Response(null, { status: 101, webSocket: resp.webSocket });
                    }
                    wsLastError = new Error(`Node ${i + 1}: upstream did not upgrade (status ${resp.status})`);
                } catch (err) { wsLastError = err; }
            }
            return new Response("WebSocket upstream failed. Last Error: " + (wsLastError?.message || 'Unknown Error'), { status: 502 });
        }

        // ==========================================
        // 2.7 防爆型精准日志拦截 (修复统计虚高：仅拦截点火请求)
        // ==========================================
        const isNewPlaySession = /\/PlaybackInfo/i.test(url.pathname);

        // 核心修改：仅在点火请求时才记录 "今日播放" 和 "最后活跃"
        if (isNewPlaySession && matchedPrefix && env.DB && ctx && ctx.waitUntil) {
            try {
                const todayStr = new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0];
                const nowTime = new Date(Date.now() + 8 * 3600000).toISOString().replace('T', ' ').split('.')[0];

                let stmts = [
                    env.DB.prepare(`INSERT INTO request_stats (prefix, date, count) VALUES (?, ?, 1) ON CONFLICT(prefix, date) DO UPDATE SET count = count + 1`).bind(matchedPrefix, todayStr),
                    env.DB.prepare(`UPDATE routes SET last_play = ? WHERE prefix = ?`).bind(nowTime, matchedPrefix)
                ];

                const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "Unknown";
                const clientCountry = request.headers.get("cf-ipcountry") || "Unknown";
                const clientUa = request.headers.get("User-Agent") || "Unknown";
                stmts.push(env.DB.prepare(`INSERT INTO visitor_logs (prefix, ip, country, ua) VALUES (?, ?, ?, ?)`).bind(matchedPrefix, clientIp, clientCountry, clientUa));

                ctx.waitUntil(env.DB.batch(stmts));
            } catch (e) { }
        }

        // ==========================================
        // 2.8 无伪装模式下的源站反代 (含强力防 403 引擎)
        // ==========================================
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && !!request.body;
        let bodyBuffer = null;
        if (hasBody) {
            const buf = await request.clone().arrayBuffer();
            if (buf.byteLength <= MAX_RETRY_BODY_BYTES) { bodyBuffer = buf; }
            // 超过上限：bodyBuffer 保持 null，走单次流式发送、不做协议/403 重试
        }
        // 请求体可重放时（无体 或 已缓冲）才允许协议回退 / 403 级联重试
        const canRetry = !hasBody || bodyBuffer !== null;

        let finalResponse = null; let lastError = null;
        let triedUpstreamIndex = -1; let triedUpstreamCount = 0;

        for (let i = 0; i < targetUrls.length; i++) {
            const targetUrlStr = targetUrls[i] + remainingPath + url.search; const targetUrl = new URL(targetUrlStr);
            const newHeaders = buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw);

            const isStaticOrImage = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(targetUrl.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(targetUrl.pathname);

            // F2: 每个上游 15s 超时；超时按上游失败处理并故障转移
            const abortCtrl = new AbortController();
            const timeoutId = setTimeout(() => abortCtrl.abort(), MAX_UPSTREAM_TIMEOUT_MS);

            let fetchInit = { method: request.method, headers: newHeaders, redirect: 'manual', signal: abortCtrl.signal };

            if (isStaticOrImage && enableCache) { fetchInit.cf = { cacheEverything: true, cacheTtl: 86400 }; }

            if (hasBody) {
                if (bodyBuffer !== null) { fetchInit.body = bodyBuffer; }
                else { fetchInit.body = request.body; fetchInit.duplex = 'half'; }
            }

            triedUpstreamCount++;
            try {
                let response = await fetchWithSchemeFallback(targetUrl, fetchInit, canRetry);
                clearTimeout(timeoutId);
                // 源站 403 → 逐级调整请求头重试（同一上游内）
                if (response.status === 403 && canRetry) {
                    const cascaded = await attempt403Cascade(targetUrl, newHeaders, fetchInit, currentMode);
                    if (cascaded) response = cascaded;
                }
                if (response.status === 502 || response.status === 503 || response.status === 504) { lastError = new Error(`Node ${i + 1} returned HTTP ${response.status}`); continue; }
                triedUpstreamIndex = i;
                finalResponse = response; break;
            } catch (err) {
                clearTimeout(timeoutId);
                // AbortError 视为超时 → 故障转移
                lastError = err; continue;
            }
        }

        if (!finalResponse) return new Response("Worker Proxy Failover Exhausted. All nodes failed. Last Error: " + (lastError?.message || 'Unknown Error'), { status: 502 });

        const responseHeaders = new Headers(finalResponse.headers);

        // F2: 可选调试 header，仅在 env.DEBUG_FAILOVER === '1' 时输出
        if (env.DEBUG_FAILOVER === '1') {
            responseHeaders.set('X-Proxy-Upstream-Index', String(triedUpstreamIndex));
            responseHeaders.set('X-Proxy-Upstream-Tries', String(triedUpstreamCount));
        }

        // 统一前缀变量，确保绝对安全，不会抛出未定义错误
        // 假设你前面获取路由节点的变量叫 matchedPrefix，如果有值就带上斜杠
        const safePrefix = matchedPrefix ? `/${matchedPrefix}` : '';

        // ==========================================
        // 🚀 修复版 302 拦截：恢复 URL 编码 + F3 白名单透传
        // ==========================================
        if ([301, 302, 303, 307, 308].includes(finalResponse.status)) {
            const location = responseHeaders.get('Location');
            if (location) {
                // F3: 若 Location 指向白名单域名，则直接透传 3xx，不再套代理前缀
                let absHost = null;
                try {
                    if (/^https?:\/\//i.test(location)) absHost = new URL(location).host.toLowerCase();
                    else if (location.startsWith('//')) absHost = new URL(new URL(request.url).protocol + location).host.toLowerCase();
                } catch (e) {}
                const allowlist = await getManualRedirectHosts(env);
                if (absHost && hostMatchesAllowlist(absHost, allowlist)) {
                    responseHeaders.set('Access-Control-Allow-Origin', '*');
                    return new Response(null, { status: finalResponse.status, headers: responseHeaders });
                }

                if (/^https?:\/\//i.test(location)) {
                    // 绝对地址：套代理前缀 + encodeURIComponent，防止播放器解析重定向头时发疯
                    responseHeaders.set('Location', `${safePrefix}/${encodeURIComponent(location)}`);
                } else if (location.startsWith('//')) {
                    // 协议相对地址 //host/path：补全协议后按绝对处理
                    const abs = new URL(request.url).protocol + location;
                    responseHeaders.set('Location', `${safePrefix}/${encodeURIComponent(abs)}`);
                } else if (location.startsWith('/')) {
                    // 根相对地址 /path：补回节点前缀，避免客户端逃出代理
                    if (safePrefix) responseHeaders.set('Location', `${safePrefix}${location}`);
                } else {
                    // 裸相对地址 foo/bar：相对源站请求地址解析后按绝对处理
                    try {
                        const abs = new URL(location, targetUrls[0] + remainingPath).href;
                        responseHeaders.set('Location', `${safePrefix}/${encodeURIComponent(abs)}`);
                    } catch (e) { /* 解析失败则保持原样 */ }
                }
            }
        }

        responseHeaders.set('Access-Control-Allow-Origin', '*');

        // ==========================================
        // 2.10 响应体重写 (PlaybackInfo / M3U8 / 前后端分离自动兼容)
        // ==========================================

        // 🌟 前后端分离核心：前端 origin 已知，响应体里出现的其他 origin 就是泄露的后端地址
        let frontendOrigin = '';
        try { frontendOrigin = new URL(targetUrls[0]).origin; } catch (e) { }

        // 通用 URL 改写：把非前端、非代理自身的绝对 URL 都套上代理前缀
        // 正则只匹配到合法 URL 字符结束（不吃引号、空白、括号、逗号、分号）
        function rewriteBackendUrls(text) {
            return text.replace(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g, matched => {
                // 去掉尾部可能被误匹配的标点
                const trail = matched.match(/[.,;)]+$/)?.[0] || '';
                const clean = trail ? matched.slice(0, -trail.length) : matched;
                try {
                    const u = new URL(clean);
                    if (u.origin !== frontendOrigin && u.origin !== proxyOrigin) {
                        return proxyOrigin + safePrefix + '/' + clean + trail;
                    }
                } catch (e) { }
                return matched;
            });
        }

        const contentType = responseHeaders.get("content-type") || '';
        const pathLower = url.pathname.toLowerCase();

        // 判断是否需要做响应体重写，避免对不需要处理的请求读取 body
        const needsJsonPlayback = finalResponse.status === 200 && contentType.includes("json") && pathLower.includes("playbackinfo");
        const needsSystemInfo = finalResponse.status === 200 && contentType.includes("json") && /\/system\/info(\/public)?$/i.test(pathLower);
        const needsManifest = finalResponse.status === 200 && (
            pathLower.endsWith('.m3u8') || pathLower.endsWith('.mpd') ||
            contentType.includes('mpegurl') || contentType.includes('dash+xml')
        );
        const needsHtmlJs = finalResponse.status === 200 && frontendOrigin && (
            contentType.includes('text/html') || contentType.includes('text/javascript') || contentType.includes('application/javascript')
        );

        if (needsJsonPlayback || needsSystemInfo || needsManifest || needsHtmlJs) {
            try {
                const bodyText = await finalResponse.text();

                // ① PlaybackInfo：重写 DirectStreamUrl / TranscodingUrl
                if (needsJsonPlayback) {
                    try {
                        const data = JSON.parse(bodyText);
                        let modified = false;
                        if (data && data.MediaSources) {
                            data.MediaSources.forEach(source => {
                                ['DirectStreamUrl', 'TranscodingUrl'].forEach(key => {
                                    if (source[key] && source[key].startsWith('http') && !source[key].startsWith(proxyOrigin)) {
                                        source[key] = proxyOrigin + safePrefix + '/' + source[key];
                                        modified = true;
                                    }
                                });
                            });
                        }
                        if (modified) {
                            responseHeaders.delete("Content-Length");
                            return new Response(JSON.stringify(data), { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                        }
                    } catch (e) { console.log("PlaybackInfo 重写失败:", e.message); }
                }

                // ② System/Info(/Public)：前后端分离场景下把 Address/LocalAddress 指向代理
                if (needsSystemInfo) {
                    try {
                        const data = JSON.parse(bodyText);
                        let modified = false;
                        ['Address', 'LocalAddress'].forEach(key => {
                            if (data[key] && data[key].startsWith('http') && !data[key].startsWith(proxyOrigin)) {
                                data[key] = proxyOrigin + safePrefix;
                                modified = true;
                            }
                        });
                        if (modified) {
                            responseHeaders.delete("Content-Length");
                            return new Response(JSON.stringify(data), { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                        }
                    } catch (e) { console.log("System/Info 重写失败:", e.message); }
                }

                // ③ M3U8 / DASH 播放列表 (HLS .m3u8 + DASH .mpd)
                if (needsManifest) {
                    if (bodyText.includes('http://') || bodyText.includes('https://')) {
                        const rewritten = rewriteBackendUrls(bodyText);
                        responseHeaders.delete("Content-Length");
                        return new Response(rewritten, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                    }
                }

                // ④ HTML / JS：检测并改写泄露的后端地址
                if (needsHtmlJs) {
                    // 只有真的包含异源 URL 才做替换，避免修改无需处理的页面
                    const urls = bodyText.match(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g) || [];
                    const hasLeakedBackend = urls.some(u => {
                        try { const o = new URL(u).origin; return o !== frontendOrigin && o !== proxyOrigin; } catch (e) { return false; }
                    });
                    if (hasLeakedBackend) {
                        const rewritten = rewriteBackendUrls(bodyText);
                        responseHeaders.delete("Content-Length");
                        return new Response(rewritten, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                    }
                }

                // 没有命中任何重写逻辑，原样返回已读取的文本
                responseHeaders.delete("Content-Length");
                return new Response(bodyText, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });

            } catch (e) {
                console.log("响应体重写异常:", e.message);
                // 出错时降级：直接透传原始响应
            }
        }

        // 静态资源缓存控制保持不变
        const isStaticRes = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(url.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(url.pathname);
        if (isStaticRes && enableCache) {
            responseHeaders.set('Cache-Control', 'public, max-age=86400');
            responseHeaders.delete('Expires');
            responseHeaders.delete('Pragma');
        } else {
            responseHeaders.set('Cache-Control', 'no-store');
        }

        return new Response(finalResponse.body, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
    }
};
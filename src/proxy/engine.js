// 核心反代与调度引擎（从 index.js 抽离，行为不变）。
// 流程：前缀路由匹配 → 被动令牌收割 → 国家白名单网关 → WebSocket 反代 →
//       点火统计 → forwardToNode（多上游故障转移、3xx/响应体改写、静态缓存，见 forward.js）。
import { buildUpstreamHeaders } from '../emby/headers.js';
import { touchKeepalivePlayed, touchLastPlay } from '../routing/route.js';
import { beijingDayStr, formatBeijingTimestamp } from '../util/clock.js';
import { orderUpstreamsByHealth, markUpstreamFailure, markUpstreamSuccess } from './circuit-breaker.js';
import { guardPrefixScan } from './scan-guard.js';
import { applyRequestGate } from './request-gate.js';
import { getConfig } from './config-cache.js';
import { dbStmt, dbBatch } from '../db/helpers.js';
import { handleViewerRequest } from '../viewers/gate.js';
import { forwardToNode } from './forward.js';

// 熔断/健康调度已抽离至 circuit-breaker.js；此处 re-export 维持既有引用方（测试等）不变。
export { UPSTREAM_CB, orderUpstreamsByHealth, markUpstreamFailure, markUpstreamSuccess } from './circuit-breaker.js';

export const KEEPALIVE_MEM = new Map();
export const LASTPLAY_MEM = new Map();

export async function proxyRequest(request, env, ctx, url) {
    // ==========================================
    // 2.6 核心反代与调度引擎
    // ==========================================
    let targetUrls = []; let currentMode = 'off'; let enableCache = true; let remainingPath = '';
    let customHeadersRaw = ''; let viewersOn = false;
    const decodedPath = decodeURIComponent(url.pathname); let matchedPrefix = null;

    // 热路径配置缓存（60s TTL，单 isolate 内跨请求共享）：命中时零 D1 读；
    // 未命中时一次 batch 拉回 路由全量 + 国家/防盗链/手动重定向白名单 + schema 版本。
    // cacheHit / d1Ms 供 #14 拼装 Server-Timing 用。
    let config = null; let cacheHit = false; let d1Ms = 0;

    // #14: Server-Timing 诊断（仅 env.DEBUG_TIMING === '1' 时输出）。
    // Date.now() 本身开销可忽略不计，无论 flag 是否开启都廉价地记一次入口时间戳；
    // 真正的 header 拼装/额外计时只在 flag 开启时发生。
    const tStart = Date.now();

    if (decodedPath.startsWith('/http://') || decodedPath.startsWith('/https://')) {
        targetUrls = [decodedPath.substring(1)]; remainingPath = '';
    } else {
        const pathParts = decodedPath.split('/'); const prefix = pathParts[1];
        if (!prefix) return new Response(`Not Found`, { status: 404 });

        try {
            if (!env.DB) return new Response(`404: Node not found (DB not bound)`, { status: 404 });
            const loaded = await getConfig(env);
            config = loaded.config; cacheHit = loaded.cacheHit; d1Ms = loaded.loadMs;
            if (!config.ok) throw (config.error || new Error('config load failed'));

            const route = config.routesMap.get(prefix);
            if (!route) {
                // 代理层 Fail2ban：未知前缀 = 疑似扫描；超阈值 → 限流/封禁(复用 ip_bans)。
                const scanIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
                const blocked = await guardPrefixScan(env, scanIp, Date.now());
                if (blocked) return blocked;
                return new Response(`404: Node not found`, { status: 404 });
            }

            currentMode = route.mode || 'off'; enableCache = (route.cache_img !== 'off');
            matchedPrefix = prefix; remainingPath = '/' + pathParts.slice(2).join('/');
            targetUrls = route.target.split(',').map(s => s.trim()).filter(Boolean);
            customHeadersRaw = route.custom_headers || '';
            viewersOn = !!route.viewers_enabled;

            // 媒体计数鉴权已改为用户名/密码（AuthenticateByName），不再被动收割请求里的 token。

            if (route.keepalive_days > 0 && isPlaybackRequest(remainingPath, request.method) && ctx && ctx.waitUntil) {
                const nowSec = Math.floor(Date.now() / 1000);
                const last = KEEPALIVE_MEM.get(prefix) || 0;
                if (nowSec - last > 600) {
                    KEEPALIVE_MEM.set(prefix, nowSec);
                    ctx.waitUntil(touchKeepalivePlayed(env, prefix, nowSec));
                }
            }

            // 真实播放信号才更新 last_play（UI「最后活跃」）。比上面保号触发更严格——
            // 排除 PlaybackInfo 预检查，避免「点开但未播放」算成活跃。
            if (isRealPlayback(remainingPath, request.method) && ctx && ctx.waitUntil) {
                const nowSec = Math.floor(Date.now() / 1000);
                const last = LASTPLAY_MEM.get(prefix) || 0;
                if (nowSec - last > 60) {
                    LASTPLAY_MEM.set(prefix, nowSec);
                    const nowTime = formatBeijingTimestamp();
                    ctx.waitUntil(touchLastPlay(env, prefix, nowTime));
                }
            }

            if (remainingPath.startsWith('/http://') || remainingPath.startsWith('/https://')) { targetUrls = [remainingPath.substring(1)]; remainingPath = ''; }
        } catch (e) { return new Response("DB Error: " + e.message, { status: 500 }); }
    }

    if (targetUrls.length === 0) return new Response("404: Target empty", { status: 404 });

    // 直传分支（/https://...）没有匹配路由，前面还没取过 config；这里补一次
    // （命中缓存则零 D1 读），确保国家/防盗链网关对直传请求同样生效。
    if (!config && env.DB) {
        const loaded = await getConfig(env);
        config = loaded.config; cacheHit = loaded.cacheHit; d1Ms = loaded.loadMs;
    }
    // 未绑定 DB 或加载失败：按失败即放行处理（countrySet/hotlinkSet 为 null）。
    if (!config) config = { routesMap: null, countrySet: null, hotlinkSet: null, manualRedirectSet: new Set(), ok: false };

    const requestGateResponse = await applyRequestGate(request, env, config);
    if (requestGateResponse) return requestGateResponse;

    // Viewer 网关（仅开启了观看账号的节点）：viewer 登录 / ev_ 令牌请求在此处理，经 proxyRequest 递归以上游账号令牌转发。
    if (viewersOn && env.DB) {
        const viewerResponse = await handleViewerRequest(request, env, ctx, {
            prefix: matchedPrefix, path: remainingPath, url,
            forward: (req) => proxyRequest(req, env, ctx, new URL(req.url)),
        });
        if (viewerResponse) return viewerResponse;
    }

    // ==========================================
    // 2.6.5 WebSocket 反代 (Emby 会话保活 / 远程控制 / SyncPlay)
    // ==========================================
    if ((request.headers.get('Upgrade') || '').toLowerCase() === 'websocket') {
        let wsLastError = null;
        for (const i of orderUpstreamsByHealth(targetUrls, Date.now())) {
            const wsTarget = new URL(targetUrls[i] + remainingPath + url.search);
            const wsHeaders = buildUpstreamHeaders(request, wsTarget, currentMode, customHeadersRaw);
            try {
                const resp = await fetch(new Request(wsTarget, { headers: wsHeaders }));
                if (resp.webSocket) {
                    markUpstreamSuccess(targetUrls[i]);
                    return new Response(null, { status: 101, webSocket: resp.webSocket });
                }
                markUpstreamFailure(targetUrls[i], Date.now());
                wsLastError = new Error(`Node ${i + 1}: upstream did not upgrade (status ${resp.status})`);
            } catch (err) { markUpstreamFailure(targetUrls[i], Date.now()); wsLastError = err; }
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
            const todayStr = beijingDayStr();

            let stmts = [
                dbStmt(env, `INSERT INTO request_stats (prefix, date, count) VALUES (?, ?, 1) ON CONFLICT(prefix, date) DO UPDATE SET count = count + 1`, matchedPrefix, todayStr)
            ];

            const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "Unknown";
            const clientCountry = request.headers.get("cf-ipcountry") || "Unknown";
            const clientUa = request.headers.get("User-Agent") || "Unknown";
            stmts.push(dbStmt(env, `INSERT INTO visitor_logs (prefix, ip, country, ua) VALUES (?, ?, ?, ?)`, matchedPrefix, clientIp, clientCountry, clientUa));

            ctx.waitUntil(dbBatch(env, stmts));
        } catch (e) { }
    }

    return forwardToNode(request, env, ctx, {
        targets: targetUrls, path: remainingPath, search: url.search, mode: currentMode, customHeaders: customHeadersRaw,
        cache: enableCache, prefix: matchedPrefix, manualRedirectSet: config && config.manualRedirectSet,
        timing: { tStart, d1Ms, cacheHit },
    });
}

export function isPlaybackRequest(path, method) {
    if (method === 'POST' && /^\/(?:emby\/)?Sessions\/Playing/i.test(path)) return true;
    if (method !== 'GET') return false;
    if (/^\/(?:emby\/)?(?:Videos|Audio)\/[^/]+\/stream/i.test(path)) return true;
    if (/^\/(?:emby\/)?Items\/[^/]+\/PlaybackInfo/i.test(path)) return true;
    if (/^\/(?:emby\/)?Videos\/[^/]+\/(?:master|main|live|playlist)\.m3u8/i.test(path)) return true;
    if (/^\/(?:emby\/)?Videos\/[^/]+\/hls\d*\//i.test(path)) return true;
    if (/^\/(?:emby\/)?Videos\/[^/]+\/.+\.(?:m3u8|ts|m4s|mp4)$/i.test(path)) return true;
    if (/^\/(?:emby\/)?(?:Videos|Audio)\/[^/]+\/(?:Subtitles|original)/i.test(path)) return true;
    if (/^\/(?:emby\/)?Items\/[^/]+\/Download/i.test(path)) return true;
    if (/^\/(?:emby\/)?Sync\//i.test(path)) return true;
    return false;
}

// 严格子集：用户「确实在播」才返回 true。排除 PlaybackInfo（仅预检）、
// Subtitles/Download/Sync（辅助流量）。用于 last_play 更新，保证 UI 准确。
export function isRealPlayback(path, method) {
    if (method === 'POST' && /^\/(?:emby\/)?Sessions\/Playing/i.test(path)) return true;
    if (method !== 'GET') return false;
    if (/^\/(?:emby\/)?(?:Videos|Audio)\/[^/]+\/stream/i.test(path)) return true;
    if (/^\/(?:emby\/)?Videos\/[^/]+\/(?:master|main|live|playlist)\.m3u8/i.test(path)) return true;
    if (/^\/(?:emby\/)?Videos\/[^/]+\/hls\d*\//i.test(path)) return true;
    if (/^\/(?:emby\/)?Videos\/[^/]+\/.+\.(?:ts|m4s|mp4)$/i.test(path)) return true;
    return false;
}

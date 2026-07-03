// 核心反代与调度引擎（从 index.js 抽离，行为不变）。
// 流程：前缀路由匹配 → 被动令牌收割 → 国家白名单网关 → WebSocket 反代 →
//       点火统计 → 多上游故障转移(协议回退+403级联+超时) → 3xx/响应体改写 → 静态缓存。
import { buildUpstreamHeaders } from '../emby/headers.js';
import { getManualRedirectHosts, hostMatchesAllowlist } from '../routing/manual-redirect-allowlist.js';
import { fetchWithSchemeFallback, attempt403Cascade } from '../net/fallback.js';
import { touchKeepalivePlayed, touchLastPlay } from '../routing/route.js';
import { beijingDayStr, formatBeijingTimestamp } from '../util/clock.js';
import { orderUpstreamsByHealth, markUpstreamFailure, markUpstreamSuccess } from './circuit-breaker.js';
import { posterCacheKey, r2GetImage, r2PutImage } from './poster-cache.js';
import { guardPrefixScan } from './scan-guard.js';
import { applyRequestGate } from './request-gate.js';
import { getConfig } from './config-cache.js';
import { dbStmt, dbBatch } from '../db/helpers.js';

// 海报/图片请求识别（仅图片，不含 js/css）——用于 R2 持久缓存读写门控。
const IMG_REQ_RE = /\.(jpe?g|gif|png|svg|ico|webp|avif)$/i;
const IMG_PATH_RE = /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i;
function isImageReq(pathname) { return IMG_REQ_RE.test(pathname) || IMG_PATH_RE.test(pathname); }

// 熔断/健康调度已抽离至 circuit-breaker.js；此处 re-export 维持既有引用方（测试等）不变。
export { UPSTREAM_CB, orderUpstreamsByHealth, markUpstreamFailure, markUpstreamSuccess } from './circuit-breaker.js';

export const KEEPALIVE_MEM = new Map();
export const LASTPLAY_MEM = new Map();

// 反代核心健壮性常量
const MAX_RETRY_BODY_BYTES = 8 * 1024 * 1024; // 8MB：超过此值的请求体不缓冲、不重试
const MAX_UPSTREAM_TIMEOUT_MS = 15000;        // F2: 每个上游单次超时

export async function proxyRequest(request, env, ctx, url) {
    // ==========================================
    // 2.6 核心反代与调度引擎
    // ==========================================
    let targetUrls = []; let currentMode = 'off'; let enableCache = true; let remainingPath = '';
    let customHeadersRaw = '';
    const decodedPath = decodeURIComponent(url.pathname); let matchedPrefix = null;
    let proxyOrigin = new URL(request.url).origin;

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

    // R2 海报缓存读取：仅 GET 图片 + 本节点 + 开启缓存 + 已绑定 bucket。命中直接返回，省一次回源。
    const r2Key = (matchedPrefix && enableCache && env.POSTER_CACHE && request.method === 'GET' && isImageReq(url.pathname))
        ? posterCacheKey(matchedPrefix, remainingPath + url.search) : null;
    if (r2Key) {
        const cached = await r2GetImage(env, r2Key);
        if (cached) return cached;
    }

    let finalResponse = null; let lastError = null;
    let triedUpstreamIndex = -1; let triedUpstreamCount = 0;

    // #14: 上游故障转移循环耗时（从进入循环前到拿到 finalResponse/耗尽为止）。
    const tUpstreamStart = Date.now();

    for (const i of orderUpstreamsByHealth(targetUrls, Date.now())) {
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
            if (response.status === 502 || response.status === 503 || response.status === 504) { markUpstreamFailure(targetUrls[i], Date.now()); lastError = new Error(`Node ${i + 1} returned HTTP ${response.status}`); continue; }
            markUpstreamSuccess(targetUrls[i]);
            triedUpstreamIndex = i;
            finalResponse = response; break;
        } catch (err) {
            clearTimeout(timeoutId);
            // AbortError 视为超时 → 故障转移
            markUpstreamFailure(targetUrls[i], Date.now());
            lastError = err; continue;
        }
    }

    const upstreamMs = Date.now() - tUpstreamStart;

    if (!finalResponse) return new Response("Worker Proxy Failover Exhausted. All nodes failed. Last Error: " + (lastError?.message || 'Unknown Error'), { status: 502 });

    const responseHeaders = new Headers(finalResponse.headers);

    // F2: 可选调试 header，仅在 env.DEBUG_FAILOVER === '1' 时输出
    if (env.DEBUG_FAILOVER === '1') {
        responseHeaders.set('X-Proxy-Upstream-Index', String(triedUpstreamIndex));
        responseHeaders.set('X-Proxy-Upstream-Tries', String(triedUpstreamCount));
    }

    // #14: 可选诊断 header，仅在 env.DEBUG_TIMING === '1' 时输出（同 DEBUG_FAILOVER 的 on/off 模式）。
    // 放在这里（早于 3xx/响应体重写分支）是为了让所有共用 responseHeaders 的返回路径
    // （含 rewrite 分支的 early return）都带上该 header；total 在此刻打点，
    // 因此 rewrite 分支实际总耗时会略高于 header 里的 total（可接受的取舍，见 #14 说明）。
    if (env.DEBUG_TIMING === '1') {
        const totalMs = Date.now() - tStart;
        const d1Desc = cacheHit ? 'hit' : 'miss';
        responseHeaders.set('Server-Timing',
            `d1;dur=${d1Ms};desc="${d1Desc}", upstream;dur=${upstreamMs}, total;dur=${totalMs}`);
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
            // 显式注入的内存 allowlist（测试/特殊部署用）优先，且本身不产生 D1 读；
            // 否则用已取到的 config.manualRedirectSet（缓存命中即零 D1 读）。
            const allowlist = env?.MANUAL_REDIRECT_ALLOWLIST
                ? await getManualRedirectHosts(env)
                : ((config && config.manualRedirectSet) || new Set());
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
        // 回源命中的小图异步写入 R2（仅 image/* 且 ≤5MB，由 r2PutImage 内部把关）。
        if (r2Key) r2PutImage(env, r2Key, finalResponse, ctx);
    } else {
        responseHeaders.set('Cache-Control', 'no-store');
    }

    return new Response(finalResponse.body, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
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

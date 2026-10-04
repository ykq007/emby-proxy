// 把一个请求发给节点并整理回应。两个 Worker 共用同一份：生产 proxyRequest（路由、网关、viewer 之后）
// 与聚合端（选好副本、换好 Id 与令牌之后），节点看到的请求、客户端拿到的回应因此一致。
// 流程：多地址按健康排序故障转移（协议回退 + 403 逐级换头 + 每地址 15s 超时）→ 3xx 改写 →
//       响应体改写（PlaybackInfo / System/Info / 播放列表 / HTML·JS 里泄露的节点地址）→ 静态缓存 / R2 海报。
import { buildUpstreamHeaders } from '../emby/headers.js';
import { getManualRedirectHosts, hostMatchesAllowlist } from '../routing/manual-redirect-allowlist.js';
import { fetchWithSchemeFallback, attempt403Cascade } from '../net/fallback.js';
import { orderUpstreamsByHealth, markUpstreamFailure, markUpstreamSuccess } from './circuit-breaker.js';
import { posterCacheKey, r2GetImage, r2PutImage } from './poster-cache.js';

// 海报/图片请求识别（仅图片，不含 js/css）——用于 R2 持久缓存读写门控。
const IMG_REQ_RE = /\.(jpe?g|gif|png|svg|ico|webp|avif)$/i;
const IMG_PATH_RE = /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i;
function isImageReq(pathname) { return IMG_REQ_RE.test(pathname) || IMG_PATH_RE.test(pathname); }

// 反代核心健壮性常量
const MAX_RETRY_BODY_BYTES = 8 * 1024 * 1024; // 8MB：超过此值的请求体不缓冲、不重试
const MAX_UPSTREAM_TIMEOUT_MS = 15000;        // F2: 每个上游单次超时

// request：客户端请求（头、方法、请求体照它发；它的 URL 决定代理自身 origin 与响应改写的判定）。
// t: { targets: 节点地址[], path: 节点上的路径, search: 查询串（默认 request 的）, mode, customHeaders,
//      cache: 静态资源缓存（默认开）, prefix: 节点前缀（R2 键）, publicPrefix: 改写后地址的路径前缀（默认 /<prefix>）,
//      manualRedirectSet: 3xx 原样透传的域名, timing: { tStart, d1Ms, cacheHit }（Server-Timing 诊断） }
export async function forwardToNode(request, env, ctx, t) {
    const url = new URL(request.url);
    const proxyOrigin = url.origin;
    const targetUrls = t.targets; const remainingPath = t.path || '';
    const search = t.search ?? url.search;
    const currentMode = t.mode || 'off'; const customHeadersRaw = t.customHeaders || '';
    const enableCache = t.cache !== false; const matchedPrefix = t.prefix || null;
    const { tStart = Date.now(), d1Ms = 0, cacheHit = false } = t.timing || {};

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
        const targetUrlStr = targetUrls[i] + remainingPath + search; const targetUrl = new URL(targetUrlStr);
        const newHeaders = buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw);

        const isStaticOrImage = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(targetUrl.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(targetUrl.pathname);

        // F2: 每个上游 15s 超时；超时按上游失败处理并故障转移
        const abortCtrl = new AbortController();
        const timeoutId = setTimeout(() => abortCtrl.abort(), MAX_UPSTREAM_TIMEOUT_MS);

        let fetchInit = { method: request.method, headers: newHeaders, redirect: 'manual', signal: abortCtrl.signal };

        // 静态资源走边缘缓存；其余一律显式 cacheTtl:0 绕开缓存层——不写 cf 时
        // 部分源站（自身也在 Cloudflare 后面、每次响应都带 Set-Cookie + BYPASS）
        // 会让回源请求卡死到 15s 超时，而探测用的 cf:{cacheTtl:0} 始终 200。
        fetchInit.cf = (isStaticOrImage && enableCache)
            ? { cacheEverything: true, cacheTtl: 86400 }
            : { cacheTtl: 0 };

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
    const safePrefix = t.publicPrefix ?? (matchedPrefix ? `/${matchedPrefix}` : '');

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
                : (t.manualRedirectSet || new Set());
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

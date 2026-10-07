import { jsonResponse } from '../util/json.js';
import { sendTgStats } from '../stats/telegram.js';
import { tgSendMessage } from '../tg/client.js';
import { renderHelp, renderStart } from '../tg/commands.js';
import { handleStatus, handleKeepalive, handleMute, handleUnmute, handleNode, handleList, handleUnknownCommand } from '../stats/bot-commands.js';
import { routeCallback } from '../tg/callback-router.js';

export async function handlePublic(request, env, ctx, url, deps = {}) {
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
            // Fail closed: 必须配置 secret_token 和 chat_id，否则拒绝
            if (!env.TG_WEBHOOK_SECRET) {
                return new Response('Webhook secret not configured', { status: 500 });
            }
            if (request.headers.get('x-telegram-bot-api-secret-token') !== env.TG_WEBHOOK_SECRET) {
                return new Response('Unauthorized', { status: 401 });
            }
            const allowedChatId = Number(env.TG_CHAT_ID);
            if (!env.TG_CHAT_ID || !Number.isFinite(allowedChatId)) {
                return new Response('Chat ID not configured', { status: 500 });
            }
            const body = await request.json();
            // 统一从各种 update 类型提取 chat_id，再硬绑定
            const incomingChatId =
                body?.message?.chat?.id
                ?? body?.edited_message?.chat?.id
                ?? body?.channel_post?.chat?.id
                ?? body?.edited_channel_post?.chat?.id
                ?? body?.callback_query?.message?.chat?.id;
            if (incomingChatId !== allowedChatId) {
                return new Response('OK');
            }
            // callback_query 分支：inline button 回调
            if (body.callback_query) {
                ctx.waitUntil(routeCallback(env, ctx, body.callback_query));
                return new Response('OK');
            }
            // 普通 message 文本命令
            if (body.message && typeof body.message.text === 'string') {
                const rawText = body.message.text.trim();
                // 解析 cmd 与参数，支持 /cmd@botname 形式
                const spaceIdx = rawText.indexOf(' ');
                const head = spaceIdx === -1 ? rawText : rawText.slice(0, spaceIdx);
                const argText = spaceIdx === -1 ? '' : rawText.slice(spaceIdx + 1).trim();
                const cmd = head.split('@')[0];
                if (cmd === '/start') {
                    if (env.TG_BOT_TOKEN) {
                        ctx.waitUntil(tgSendMessage(env, { chat_id: allowedChatId, text: renderStart(), parse_mode: 'HTML' }));
                    }
                } else if (cmd === '/help') {
                    if (env.TG_BOT_TOKEN) {
                        ctx.waitUntil(tgSendMessage(env, { chat_id: allowedChatId, text: renderHelp(), parse_mode: 'HTML' }));
                    }
                } else if (cmd === '/stats') {
                    if (env.DB && env.TG_BOT_TOKEN) {
                        ctx.waitUntil(sendTgStats(env, allowedChatId));
                    }
                } else if (cmd === '/status') {
                    ctx.waitUntil(handleStatus(env, allowedChatId));
                } else if (cmd === '/keepalive') {
                    ctx.waitUntil(handleKeepalive(env, allowedChatId));
                } else if (cmd === '/mute') {
                    ctx.waitUntil(handleMute(env, allowedChatId, argText));
                } else if (cmd === '/unmute') {
                    ctx.waitUntil(handleUnmute(env, allowedChatId));
                } else if (cmd === '/node') {
                    ctx.waitUntil(handleNode(env, allowedChatId, argText));
                } else if (cmd === '/list') {
                    ctx.waitUntil(handleList(env, allowedChatId));
                } else if (cmd.startsWith('/')) {
                    ctx.waitUntil(handleUnknownCommand(env, allowedChatId, rawText));
                }
                // 非命令文本（不以 / 开头）保持静默
            }
            return new Response('OK');
        } catch (e) { return new Response("OK"); }
    }

    if (request.method === "OPTIONS") {
        return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Max-Age": "86400" } });
    }

    // ==========================================
    // emby-js 监控移植：公开页面（无需 admin 鉴权）
    // ==========================================
    // 公开 /status 状态页与 /public/<token> 分享页已下线；节点状态仅在管理面板查看。

    return null;
}

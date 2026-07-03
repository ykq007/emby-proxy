import { kvSet, kvDelete, TG_ALERTS_MUTED_UNTIL_KEY } from '../db/kv.js';
import { tgSendMessage } from '../tg/client.js';
import {
    renderStatus,
    renderKeepalive,
    renderNode,
    renderList,
    renderUnknownCommand,
    renderMuteHelp,
    renderMuteApplied,
    renderUnmuted,
} from '../tg/views.js';

// ---------------------------------------------------------------------------
// Pure utilities (kept here; no rendering logic)
// ---------------------------------------------------------------------------

function parseMuteArg(argText) {
    const t = String(argText || '').trim();
    if (!t) return null;
    const m = t.match(/^(\d+)\s*([mhd]?)$/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = (m[2] || 'm').toLowerCase();
    let minutes;
    if (unit === 'm') minutes = n;
    else if (unit === 'h') minutes = n * 60;
    else if (unit === 'd') minutes = n * 1440;
    else return null;
    if (minutes > 1440) minutes = 1440;
    return minutes;
}

// ---------------------------------------------------------------------------
// Command handlers — thin wrappers: render* → tgSendMessage
// ---------------------------------------------------------------------------

export async function handleStatus(env, chatId) {
    if (!env.DB || !env.TG_BOT_TOKEN) return;
    try {
        const rendered = await renderStatus(env);
        await tgSendMessage(env, { chat_id: chatId, ...rendered });
    } catch (e) {
        console.log('handleStatus error:', e.message);
        try { await tgSendMessage(env, { chat_id: chatId, text: '查询失败，请稍后重试' }); } catch (_) {}
    }
}

export async function handleKeepalive(env, chatId) {
    if (!env.DB || !env.TG_BOT_TOKEN) return;
    try {
        const rendered = await renderKeepalive(env);
        await tgSendMessage(env, { chat_id: chatId, ...rendered });
    } catch (e) {
        console.log('handleKeepalive error:', e.message);
        try { await tgSendMessage(env, { chat_id: chatId, text: '查询失败，请稍后重试' }); } catch (_) {}
    }
}

export async function handleNode(env, chatId, argText) {
    if (!env.DB || !env.TG_BOT_TOKEN) return;
    const prefix = String(argText || '').trim();
    if (!prefix) {
        await tgSendMessage(env, {
            chat_id: chatId,
            text: '用法: <code>/node &lt;prefix&gt;</code>\n例如: <code>/node emby1</code>',
        });
        return;
    }
    try {
        const rendered = await renderNode(env, prefix);
        await tgSendMessage(env, { chat_id: chatId, ...rendered });
    } catch (e) {
        console.log('handleNode error:', e.message);
        try { await tgSendMessage(env, { chat_id: chatId, text: '查询失败，请稍后重试' }); } catch (_) {}
    }
}

export async function handleList(env, chatId) {
    if (!env.DB || !env.TG_BOT_TOKEN) return;
    try {
        const rendered = await renderList(env);
        await tgSendMessage(env, { chat_id: chatId, ...rendered });
    } catch (e) {
        console.log('handleList error:', e.message);
        try { await tgSendMessage(env, { chat_id: chatId, text: '查询失败，请稍后重试' }); } catch (_) {}
    }
}

export async function handleMute(env, chatId, argText) {
    if (!env.DB || !env.TG_BOT_TOKEN) return;
    try {
        const minutes = parseMuteArg(argText);
        if (minutes === null) {
            const rendered = renderMuteHelp();
            await tgSendMessage(env, { chat_id: chatId, ...rendered });
            return;
        }
        const now = Math.floor(Date.now() / 1000);
        const until = now + minutes * 60;
        await kvSet(env, TG_ALERTS_MUTED_UNTIL_KEY, until);
        const rendered = renderMuteApplied(until);
        await tgSendMessage(env, { chat_id: chatId, ...rendered });
    } catch (e) {
        console.log('handleMute error:', e.message);
    }
}

export async function handleUnmute(env, chatId) {
    if (!env.DB || !env.TG_BOT_TOKEN) return;
    try {
        await kvDelete(env, TG_ALERTS_MUTED_UNTIL_KEY);
        const rendered = renderUnmuted();
        await tgSendMessage(env, { chat_id: chatId, ...rendered });
    } catch (e) {
        console.log('handleUnmute error:', e.message);
    }
}

export async function handleUnknownCommand(env, chatId, input) {
    if (!env.TG_BOT_TOKEN) return;
    try {
        const rendered = renderUnknownCommand(input);
        await tgSendMessage(env, { chat_id: chatId, ...rendered });
    } catch (e) {
        console.log('handleUnknownCommand error:', e.message);
    }
}

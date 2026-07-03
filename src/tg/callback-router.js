/**
 * Callback query router for Telegram inline keyboard interactions.
 *
 * Entry point: routeCallback(env, ctx, callback_query)
 * Dispatches parsed callback_data to the appropriate render + edit handler.
 */

import { parseCallbackData, isAllowedCallback } from './callbacks.js';
import { tgAnswerCallbackQuery, tgEditMessageText } from './client.js';
import { kvSet, kvDelete, TG_ALERTS_MUTED_UNTIL_KEY } from '../db/kv.js';
import {
    renderStatus,
    renderKeepalive,
    renderNode,
    renderList,
    renderMuteApplied,
    renderUnmuted,
} from './views.js';

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

/**
 * Route a Telegram callback_query to the appropriate handler.
 *
 * @param {object} env            Cloudflare env (DB, TG_BOT_TOKEN, TG_CHAT_ID)
 * @param {object} ctx            Cloudflare execution context (ctx.waitUntil)
 * @param {object} callback_query Telegram callback_query object
 */
export async function routeCallback(env, ctx, callback_query) {
    const { id, data, message, from } = callback_query;

    // Guard: only handle callbacks from the configured chat (W3: warn instead of silent drop)
    const chatId = message?.chat?.id;
    if (!chatId || chatId !== Number(env.TG_CHAT_ID)) {
        console.warn('[callback-router] reject: chat_id mismatch', { got: chatId, expected: env.TG_CHAT_ID, from: from?.id });
        return;
    }

    const messageId = message.message_id;

    // Acknowledge immediately — non-blocking
    ctx.waitUntil(
        tgAnswerCallbackQuery(env, { callback_query_id: id, text: '处理中…' })
    );

    // Parse and validate callback data
    const parsed = parseCallbackData(data);
    if (!parsed || !isAllowedCallback(parsed)) return;

    const { module, action, params } = parsed;

    try {
        let rendered;

        if (module === 's' && action === 'r') {
            // Refresh status
            rendered = await renderStatus(env);

        } else if (module === 'k' && action === 'r') {
            // Refresh keepalive
            rendered = await renderKeepalive(env);

        } else if (module === 'n' && (action === 'r' || action === 'v')) {
            // Refresh / view node detail
            const prefix = params[0];
            rendered = await renderNode(env, prefix);

        } else if (module === 'l' && action === 'r') {
            // Node list
            rendered = await renderList(env);

        } else if (module === 'm' && action === 'u') {
            // Unmute
            await kvDelete(env, TG_ALERTS_MUTED_UNTIL_KEY);
            rendered = renderUnmuted();

        } else if (module === 'm') {
            // Mute for N minutes: action is '30' | '120' | '1440'
            const minutes = Number(action);
            const untilTs = Math.floor(Date.now() / 1000) + minutes * 60;
            await kvSet(env, TG_ALERTS_MUTED_UNTIL_KEY, untilTs);
            rendered = renderMuteApplied(untilTs);

        } else {
            // Should never reach here given isAllowedCallback, but be safe
            return;
        }

        await tgEditMessageText(env, {
            chat_id: chatId,
            message_id: messageId,
            text: rendered.text,
            parse_mode: 'HTML',
            ...(rendered.reply_markup !== undefined && rendered.reply_markup !== null
                ? { reply_markup: rendered.reply_markup }
                : {}),
        });

    } catch (e) {
        // "message is not modified" is not a real error — already handled
        // inside tgEditMessageText, but catch anything else and log only
        if (
            typeof e?.message === 'string' &&
            e.message.includes('message is not modified')
        ) {
            return;
        }
        console.log('[callback-router] error', module, action, params, e?.message ?? e);
    }
}

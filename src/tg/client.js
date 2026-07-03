export { htmlEscape } from '../util/clock.js';

/**
 * tgApi(env, method, payload) — generic Telegram Bot API call with 429 retry
 * @param {object} env - Cloudflare env with TG_BOT_TOKEN
 * @param {string} method - Telegram API method name
 * @param {object} payload - request body
 * @returns {Promise<object>} parsed JSON response
 */
export async function tgApi(env, method, payload) {
    if (!env.TG_BOT_TOKEN) return { ok: false, error: 'no TG_BOT_TOKEN' };

    const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`;

    const doFetch = () => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    try {
        let res = await doFetch();

        if (res.ok) {
            return await res.json();
        }

        const raw = await res.text();

        if (res.status === 429) {
            let retryAfter = 1;
            try {
                const j = JSON.parse(raw);
                if (j?.parameters?.retry_after) {
                    retryAfter = j.parameters.retry_after;
                }
            } catch (_) {}
            // W1: cap to 5s — Worker CPU budget is finite; let cron retry rather than block
            if (retryAfter > 5) {
                console.warn(`tgApi ${method} 429 retry_after=${retryAfter}s > 5s, deferring`);
                return { ok: false, status: 429, description: raw, retry_after: retryAfter };
            }
            const waitMs = Math.max(0, retryAfter) * 1000;
            await new Promise(r => setTimeout(r, waitMs));

            try {
                const res2 = await doFetch();
                if (res2.ok) return await res2.json();
                const raw2 = await res2.text();
                console.warn(`tgApi ${method} retry-nok`, res2.status, raw2);
                return { ok: false, status: res2.status, description: raw2 };
            } catch (e) {
                console.warn(`tgApi ${method} retry-exception`, e.message);
                return { ok: false, error: e.message };
            }
        }

        console.warn(`tgApi ${method} nok`, res.status, raw);
        return { ok: false, status: res.status, description: raw };
    } catch (e) {
        console.warn(`tgApi ${method} exception`, e.message);
        return { ok: false, error: e.message };
    }
}

/**
 * tgSendMessage(env, payload) — send a message
 * payload: { chat_id, text, parse_mode?, reply_markup?, disable_web_page_preview? }
 */
export async function tgSendMessage(env, payload) {
    const body = {
        chat_id: payload.chat_id,
        text: payload.text,
        parse_mode: payload.parse_mode || 'HTML'
    };
    if (payload.reply_markup !== undefined) body.reply_markup = payload.reply_markup;
    if (payload.disable_web_page_preview !== undefined) {
        body.disable_web_page_preview = payload.disable_web_page_preview;
    }
    return tgApi(env, 'sendMessage', body);
}

/**
 * tgEditMessageText(env, payload) — edit an existing message
 * payload: { chat_id, message_id, text, parse_mode?, reply_markup? }
 * "message is not modified" is silently ignored
 */
export async function tgEditMessageText(env, payload) {
    const body = {
        chat_id: payload.chat_id,
        message_id: payload.message_id,
        text: payload.text,
        parse_mode: payload.parse_mode || 'HTML'
    };
    if (payload.reply_markup !== undefined) body.reply_markup = payload.reply_markup;

    try {
        const result = await tgApi(env, 'editMessageText', body);
        if (
            !result.ok &&
            typeof result.description === 'string' &&
            result.description.includes('message is not modified')
        ) {
            return result; // not an error
        }
        return result;
    } catch (e) {
        console.warn('tgEditMessageText exception', e.message);
        return { ok: false, error: e.message };
    }
}

/**
 * tgAnswerCallbackQuery(env, payload)
 * payload: { callback_query_id, text?, show_alert? }
 */
export async function tgAnswerCallbackQuery(env, payload) {
    return tgApi(env, 'answerCallbackQuery', payload);
}

/**
 * tgSetMyCommands(env, { commands, scope? })
 * commands: [{command, description}, ...]
 */
export async function tgSetMyCommands(env, { commands, scope } = {}) {
    const body = { commands };
    if (scope !== undefined) body.scope = scope;
    return tgApi(env, 'setMyCommands', body);
}

/**
 * tgSendMany(env, payloads) — send multiple messages in parallel
 */
export async function tgSendMany(env, payloads) {
    return Promise.all(payloads.map(p => tgSendMessage(env, p)));
}

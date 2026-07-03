import { htmlEscape, tgSendMessage } from './client.js';
import { formatDuration, formatBeijingTimestamp } from '../util/clock.js';
import { kbAlert, kbKeepaliveAlert, kbStatus } from './keyboards.js';
import { routeName } from '../routing/route.js';
import { kvGet, TG_ALERTS_MUTED_UNTIL_KEY } from '../db/kv.js';

export function formatUtc8Timestamp(nowSec) {
    return formatBeijingTimestamp(nowSec * 1000);
}

export function renderProbeAlertPayload(chatId, sends, now) {
    const nowTs8 = formatUtc8Timestamp(now);
    const offline = sends.filter(s => s.kind === 'offline');
    const recovered = sends.filter(s => s.kind === 'recovered');

    if (sends.length === 1) {
        const s = sends[0];
        const name = htmlEscape(s.name);
        const isOffline = s.kind === 'offline';
        const text = isOffline
            ? `🚨 <b>节点告警</b>\n\n🔴 <b>${name}</b> 已离线\n⏱️ 持续 ${formatDuration(s.duration)}\n\n━━━━━━━━━━━━━━━━━\n🕒 ${nowTs8} (UTC+8)`
            : `✅ <b>节点恢复</b>\n\n🟢 <b>${name}</b> 已恢复\n⏱️ 本次离线 ${formatDuration(s.duration)}\n\n━━━━━━━━━━━━━━━━━\n🕒 ${nowTs8} (UTC+8)`;
        const reply_markup = (isOffline && s.prefix) ? kbAlert(s.prefix) : undefined;
        return {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...(reply_markup ? { reply_markup } : {}),
        };
    }

    const lines = [];
    lines.push('🚨 <b>节点告警</b>');
    lines.push('');
    if (offline.length) {
        lines.push(`🔴 <b>离线 (${offline.length})</b>`);
        for (const s of offline) lines.push(`  • ${htmlEscape(s.name)} — ${formatDuration(s.duration)}`);
    }
    if (recovered.length) {
        if (offline.length) lines.push('');
        lines.push(`🟢 <b>已恢复 (${recovered.length})</b>`);
        for (const s of recovered) lines.push(`  • ${htmlEscape(s.name)} — 离线 ${formatDuration(s.duration)}`);
    }
    lines.push('');
    lines.push(`📊 共 ${sends.length} 条事件：离线 ${offline.length} / 恢复 ${recovered.length}`);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━');
    lines.push(`🕒 ${nowTs8} (UTC+8)`);
    return {
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        reply_markup: kbStatus(),
    };
}

export function renderKeepaliveReminderPayload(chatId, toRemind, now) {
    const sorted = [...toRemind].sort((a, b) => a.remaining - b.remaining);
    const lines = [];
    for (const { route, remaining } of sorted) {
        const name = htmlEscape(routeName(route));
        if (remaining <= 0) {
            const days = Math.ceil(Math.abs(remaining) / 86400);
            const emoji = days > 3 ? '🚨' : '⚠️';
            lines.push(`${emoji} <b>${name}</b> — 已超期 ${days} 天`);
        } else {
            const timeStr = remaining < 3600
                ? Math.ceil(remaining / 60) + ' 分钟'
                : Math.ceil(remaining / 3600) + ' 小时';
            lines.push(`⏰ <b>${name}</b> — 还剩约 ${timeStr}`);
        }
    }

    return {
        chat_id: chatId,
        text: [
            '⚠️ <b>保号提醒</b>',
            '',
            lines.join('\n'),
            '',
            '━━━━━━━━━━━━━━━',
            `🕒 ${formatUtc8Timestamp(now)} (UTC+8)`,
        ].join('\n'),
        parse_mode: 'HTML',
        reply_markup: kbKeepaliveAlert(),
    };
}

export function renderDailyStatsPayload(chatId, stats) {
    const msg =
        `📊 <b>今日反代播放数据</b>\n` +
        `━━━━━━━━━━━━━━━\n` +
        `▶️ <b>今日总播放次数:</b> ${stats.totalStr} 次\n` +
        `🌍 <b>最多访问地区:</b> ${stats.regionStr}\n` +
        `🚀 <b>最喜欢的EMBY:</b> ${stats.nodeStr}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🌐 <b>实际流量消耗</b>\n` +
        `当天内: ${htmlEscape(stats.trafficToday)}\n` +
        `七天内: ${htmlEscape(stats.traffic7d)}\n` +
        `30天内: ${htmlEscape(stats.traffic30d)}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🏆 <b>今日流量之王</b>\n` +
        `👑 ${stats.topNodeMsg}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🕒 更新于: ${stats.timestamp} (UTC+8)`;

    return {
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        reply_markup: kbStatus(),
        disable_web_page_preview: true,
    };
}

export function renderTgTestPayload(chatId, now) {
    return {
        chat_id: chatId,
        text: `🧪 telegram test ok @ ${formatUtc8Timestamp(now)} (UTC+8)`,
        parse_mode: 'HTML',
    };
}

// ---------------------------------------------------------------------------
// notify() — the single outbound-admin-notification entry point.
//
// Every "notify the admin" send (probe offline/recovered alerts, keepalive
// reminders, the daily stats digest, the panel's tg-test button) goes through
// this function instead of assembling its own render + tgSendMessage call.
// It owns, in exactly this one place:
//   - whether the notification kind respects the alert mute window
//   - dispatch to the matching render* (formatting via shared clock utils)
//   - delivery via the tg/client.js adapter (429 retry etc.)
// ---------------------------------------------------------------------------

const NOTIFICATION_KINDS = {
    'probe-alert': {
        respectsMute: true,
        render: (chatId, { sends, now }) => renderProbeAlertPayload(chatId, sends, now),
    },
    'keepalive-reminder': {
        respectsMute: true,
        render: (chatId, { toRemind, now }) => renderKeepaliveReminderPayload(chatId, toRemind, now),
    },
    'daily-stats': {
        respectsMute: false,
        render: (chatId, { stats }) => renderDailyStatsPayload(chatId, stats),
    },
    'tg-test': {
        respectsMute: false,
        render: (chatId, { now }) => renderTgTestPayload(chatId, now),
    },
};

async function isAlertsMuted(env, now) {
    try {
        const muteUntil = await kvGet(env, TG_ALERTS_MUTED_UNTIL_KEY);
        return muteUntil > now;
    } catch (e) {
        return false;
    }
}

/**
 * notify(env, kind, data, now?) — render + (mute-gate) + send one admin
 * notification.
 *
 * @param {object} env   Cloudflare env (DB, TG_BOT_TOKEN, TG_CHAT_ID)
 * @param {'probe-alert'|'keepalive-reminder'|'daily-stats'|'tg-test'} kind
 * @param {object} [data]  kind-specific render input (see NOTIFICATION_KINDS)
 * @param {number} [now]   unix seconds; defaults to Date.now()
 * @returns {Promise<{ok: boolean, muted?: boolean, skipped?: string, [k: string]: *}>}
 */
export async function notify(env, kind, data = {}, now = Math.floor(Date.now() / 1000)) {
    const spec = NOTIFICATION_KINDS[kind];
    if (!spec) throw new Error(`notify: unknown notification kind "${kind}"`);

    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
        return { ok: false, skipped: 'no-config' };
    }

    if (spec.respectsMute && await isAlertsMuted(env, now)) {
        return { ok: false, muted: true, skipped: 'muted' };
    }

    const payload = spec.render(env.TG_CHAT_ID, { ...data, now });
    return tgSendMessage(env, payload);
}

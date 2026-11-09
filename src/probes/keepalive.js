import { dbAll } from '../db/helpers.js';
import { notify } from '../tg/notifications.js';
import { KEEPALIVE_SELECT, seedKeepaliveBaseline, markKeepaliveReminded } from '../routing/route.js';

export const REMIND_LEAD_SEC = 3 * 86400;
// The hourly cron can land a little early, so allow 30 minutes of slack on the daily gap.
const REMIND_GAP_SEC = 86400 - 1800;

export function shouldRemind(remaining, lastReminded, now) {
    if (remaining > REMIND_LEAD_SEC) return false;
    return (now - lastReminded) >= REMIND_GAP_SEC;
}

export async function maybeRemindKeepalive(env, now) {
    const { results } = await dbAll(env, `
        SELECT ${KEEPALIVE_SELECT}
          FROM routes
         WHERE keepalive_days > 0
    `);

    const toRemind = [];
    for (const r of (results || [])) {
        // If no baseline has been recorded yet (feature just enabled), stamp now and skip.
        if (!r.keepalive_last_played_at) {
            await seedKeepaliveBaseline(env, r.prefix, now);
            continue;
        }

        const windowSec = r.keepalive_days * 86400;
        const deadline  = r.keepalive_last_played_at + windowSec;
        const remaining = deadline - now;
        const lastReminded = r.keepalive_last_reminded_at || 0;

        if (!shouldRemind(remaining, lastReminded, now)) continue;

        toRemind.push({ route: r, remaining });
    }

    if (!toRemind.length) return;

    const result = await notify(env, 'keepalive-reminder', { toRemind }, now);

    // Only stamp keepalive_last_reminded_at for routes whose send succeeded
    if (result && result.ok) {
        await markKeepaliveReminded(env, toRemind.map(({ route }) => route.prefix), now);
    } else if (result && result.muted) {
        // Muted: intentionally suppressed, not a failure — leave reminded_at
        // untouched so the reminder fires once the mute window lifts.
        console.log('[keepalive] reminder suppressed by mute window');
    } else {
        // W7: surface tg send failure so reminders aren't silently dropped without trace
        console.warn('[keepalive] tg send failed, skipping reminded_at stamp', result?.status ?? result?.error);
    }
}

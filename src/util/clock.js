// Single source of truth for "now in Beijing" (UTC+8) math, timestamp/duration
// formatting, and HTML escaping. Every module that used to re-derive the +8h
// offset, format a duration, or escape HTML imports from here instead.

// The one and only place the UTC+8 offset constant is allowed to live.
export const BEIJING_OFFSET_MS = 8 * 3600000;

/**
 * Current instant (or the given nowMs) shifted into Beijing wall-clock time,
 * returned as a Date whose UTC getters (getUTCHours etc.) read as Beijing
 * local time. Never call `.getHours()` on the result — always the UTC* getters.
 * @param {number} [nowMs]
 * @returns {Date}
 */
export function nowBeijing(nowMs = Date.now()) {
    return new Date(nowMs + BEIJING_OFFSET_MS);
}

/**
 * Beijing calendar day for the given instant, as YYYY-MM-DD.
 * @param {number} [nowMs]
 * @returns {string}
 */
export function beijingDayStr(nowMs = Date.now()) {
    return nowBeijing(nowMs).toISOString().split('T')[0];
}

/**
 * The [start, end] window covering the Beijing calendar day containing nowMs:
 * start = Beijing midnight for that day (expressed back in real UTC), end = nowMs.
 * @param {number} [nowMs]
 * @returns {{start: Date, end: Date, startIso: string, endIso: string, day: string}}
 */
export function beijingDayWindow(nowMs = Date.now()) {
    const end = new Date(nowMs);
    const beijingMidnight = nowBeijing(nowMs);
    beijingMidnight.setUTCHours(0, 0, 0, 0);
    const start = new Date(beijingMidnight.getTime() - BEIJING_OFFSET_MS);
    return {
        start,
        end,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        day: beijingDayStr(nowMs),
    };
}

/**
 * "YYYY-MM-DD HH:MM:SS" rendering of the given instant in Beijing time.
 * Callers append their own "(UTC+8)" suffix where desired.
 * @param {number} [nowMs]
 * @returns {string}
 */
export function formatBeijingTimestamp(nowMs = Date.now()) {
    return nowBeijing(nowMs).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Escape a value for safe inclusion in HTML (and Telegram HTML parse_mode).
 * null/undefined become the empty string; everything else is stringified.
 * @param {*} s
 * @returns {string}
 */
export function htmlEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Format a duration given in whole seconds as compact text, bucketed by
 * magnitude: "0s".."59s", "1m0s".."59m59s", "1h0m".."23h59m", "1d0h"+.
 * The single canonical duration formatter — alerts and TG views must render
 * identical text for the same duration.
 * @param {number} s  duration in seconds (negative/NaN treated as 0)
 * @returns {string}
 */
export function formatDuration(s) {
    s = Math.max(0, s | 0);
    if (s >= 86400) {
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        return `${d}d${h}h`;
    }
    if (s >= 3600) {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h${m}m`;
    }
    if (s >= 60) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}m${sec}s`;
    }
    return `${s}s`;
}

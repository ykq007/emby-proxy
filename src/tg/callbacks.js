/**
 * Callback data codec + allowlist for Telegram inline keyboard callbacks.
 *
 * Format: <module>:<action>[:<param1>[:<param2>...]]
 * Max length: 64 bytes (Telegram hard limit)
 */

// ---------------------------------------------------------------------------
// Constants — canonical callback_data strings
// ---------------------------------------------------------------------------

// W5: explicit module/action separation — avoids confusion between "m" (module) and "m:u" (full string)
export const MOD = Object.freeze({
    STATUS:    's',
    KEEPALIVE: 'k',
    NODE:      'n',
    LIST:      'l',
    MUTE:      'm',
});

export const ACT = Object.freeze({
    REFRESH: 'r',
    VIEW:    'v',
    UNMUTE:  'u',
});

// Pre-joined convenience strings for keyboards (one source of truth)
export const CB = Object.freeze({
    STATUS_REFRESH:    's:r',
    KEEPALIVE_REFRESH: 'k:r',
    NODE_VIEW:         'n:v',
    NODE_REFRESH:      'n:r',
    LIST:              'l:r',
    MUTE_30M:          'm:30',
    MUTE_2H:           'm:120',
    MUTE_1D:           'm:1440',
    UNMUTE:            'm:u',
});

// ---------------------------------------------------------------------------
// Codec
// ---------------------------------------------------------------------------

const SEP = ':';
const MAX_BYTES = 64;

/**
 * Parse a raw callback_data string into structured parts.
 *
 * @param {string} data
 * @returns {{ module: string, action: string, params: string[] } | null}
 */
export function parseCallbackData(data) {
    if (typeof data !== 'string' || !data.trim()) return null;

    const parts = data.split(SEP);
    if (parts.length < 2) return null;

    const [module, action, ...params] = parts;
    if (!module || !action) return null;

    return { module, action, params };
}

/**
 * Encode parts into a callback_data string.
 * Returns null (and logs a warning) if the result exceeds 64 bytes.
 *
 * @param {string} module
 * @param {string} action
 * @param {...string} params
 * @returns {string | null}
 */
export function encodeCallbackData(module, action, ...params) {
    const parts = [module, action, ...params.filter(p => p !== undefined && p !== null)];
    const result = parts.join(SEP);

    if (new TextEncoder().encode(result).length > MAX_BYTES) {
        console.warn(`[callbacks] encodeCallbackData: result exceeds ${MAX_BYTES} bytes: "${result}"`);
        return null;
    }

    return result;
}

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

/** Regex for valid node prefix characters */
const PREFIX_RE = /^[a-zA-Z0-9_-]+$/;

/** Valid mute durations in minutes */
const VALID_MUTE_MINUTES = new Set(['30', '120', '1440']);

/**
 * Validate a parsed callback against the allowlist.
 *
 * Allowed patterns:
 *   s:r              — refresh status
 *   k:r              — refresh keepalive
 *   n:r:<prefix>     — refresh node (prefix required, [a-zA-Z0-9_-]+)
 *   n:v:<prefix>     — view node detail
 *   l:r              — list nodes
 *   m:30             — mute 30 min
 *   m:120            — mute 2 h
 *   m:1440           — mute 1 d
 *   m:u              — unmute
 *
 * @param {{ module: string, action: string, params: string[] } | null} parsed
 * @returns {boolean}
 */
export function isAllowedCallback(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;

    const { module, action, params } = parsed;

    switch (module) {
        case 's':
            return action === 'r' && params.length === 0;

        case 'k':
            return action === 'r' && params.length === 0;

        case 'l':
            return action === 'r' && params.length === 0;

        case 'n': {
            if (action !== 'r' && action !== 'v') return false;
            if (params.length !== 1) return false;
            const prefix = params[0];
            return typeof prefix === 'string' && PREFIX_RE.test(prefix);
        }

        case 'm':
            if (action === 'u') return params.length === 0;
            if (VALID_MUTE_MINUTES.has(action)) return params.length === 0;
            return false;

        default:
            return false;
    }
}

/**
 * Convenience: parse and validate in one step.
 *
 * @param {string} data  raw callback_data from Telegram
 * @returns {boolean}
 */
export function isAllowedCallbackData(data) {
    return isAllowedCallback(parseCallbackData(data));
}

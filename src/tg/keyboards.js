/**
 * Inline keyboard builders for Telegram Bot UX.
 * Each function returns a reply_markup object: { inline_keyboard: [[...]] }
 * callback_data grammar (see src/tg/callbacks.js):
 *   s:r           — refresh status
 *   k:r           — refresh keepalive
 *   n:r:<prefix>  — refresh node detail
 *   n:v:<prefix>  — view node detail
 *   l:r           — list nodes
 *   m:<minutes>   — mute for N minutes (30 / 120 / 1440)
 *   m:u           — unmute
 */

/**
 * @param {string} text   Button label (not HTML-escaped; plain text only)
 * @param {string} data   callback_data (must be ≤ 64 bytes)
 * @returns {{ text: string, callback_data: string }}
 */
function btn(text, data) {
    return { text, callback_data: data };
}

/**
 * Status page keyboard.
 * Row 1: Refresh status | Keepalive reminder
 * Row 2: Mute 30m       | Mute 2h
 */
export function kbStatus() {
    return {
        inline_keyboard: [
            [
                btn('🔄 刷新', 's:r'),
                btn('⏰ 保号提醒', 'k:r'),
            ],
            [
                btn('🔇 静音 30m', 'm:30'),
                btn('🔇 静音 2h', 'm:120'),
            ],
        ],
    };
}

/**
 * Keepalive page keyboard.
 * Row 1: Refresh keepalive | Node status
 */
export function kbKeepalive() {
    return {
        inline_keyboard: [
            [
                btn('🔄 刷新', 'k:r'),
                btn('📊 节点状态', 's:r'),
            ],
        ],
    };
}

/**
 * Single-node detail keyboard.
 * Row 1: Refresh this node | Back to list
 * @param {string} prefix   Node prefix (short identifier, e.g. "emby1")
 */
export function kbNode(prefix) {
    return {
        inline_keyboard: [
            [
                btn('🔄 刷新节点', `n:r:${prefix}`),
                btn('📋 返回列表', 'l:r'),
            ],
        ],
    };
}

/**
 * Alert notification keyboard (single-node offline alert).
 * Row 1: Node detail
 * Row 2: Mute 30m | Mute 2h
 * @param {string} prefix   Node prefix
 */
export function kbAlert(prefix) {
    return {
        inline_keyboard: [
            [
                btn('🔍 节点详情', `n:v:${prefix}`),
            ],
            [
                btn('🔇 静音 30m', 'm:30'),
                btn('🔇 静音 2h', 'm:120'),
            ],
        ],
    };
}

/**
 * Keepalive alert notification keyboard.
 * Row 1: Refresh keepalive | Node status
 */
export function kbKeepaliveAlert() {
    return {
        inline_keyboard: [
            [
                btn('🔄 刷新保号', 'k:r'),
                btn('📊 节点状态', 's:r'),
            ],
        ],
    };
}

/**
 * Mute help quick-select keyboard (shown when /mute args are invalid).
 * Row 1: 30m | 2h | 1d
 */
export function kbMuteHelp() {
    return {
        inline_keyboard: [
            [
                btn('🔇 30m', 'm:30'),
                btn('🔇 2h', 'm:120'),
                btn('🔇 1d', 'm:1440'),
            ],
        ],
    };
}

/**
 * Fuzzy-match candidate list keyboard.
 * One button per candidate row, up to 8 rows.
 * @param {{ prefix: string, label: string }[]} rows
 *   Each element has a display label and the node prefix for callback_data.
 *   `label` is plain text (not HTML), caller is responsible for building it.
 */
export function kbNodeCandidates(rows) {
    const limited = rows.slice(0, 8);
    return {
        inline_keyboard: limited.map(({ prefix, label }) => [
            btn(`🔍 ${label}`, `n:v:${prefix}`),
        ]),
    };
}

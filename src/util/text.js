export function nowLocalDayStr() {
    return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
}

export function htmlEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

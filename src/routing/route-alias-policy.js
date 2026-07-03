// Route alias policy for operator-defined proxy paths.
export const RESERVED_ALIASES = new Set([
    'api', 'admin', '__client_rtt__',
    'login', 'logout',
    'assets', 'static', 'public',
    'health', 'healthz', 'ping', 'status',
    'emby', 'web', 'stats',
    'favicon.ico', 'robots.txt',
    'apple-touch-icon', 'sw.js', 'manifest.json', 'cdn-cgi'
]);

export const PREFIX_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function validateRoutePrefix(raw) {
    const prefix = String(raw || '').trim();
    if (!prefix) return '别名为空';
    if (!PREFIX_REGEX.test(prefix)) return '别名格式非法（仅允许字母/数字/_/-，且不超过 64 位，不能以特殊字符开头）';
    if (RESERVED_ALIASES.has(prefix.toLowerCase())) return `别名 "${prefix}" 为系统保留前缀`;
    return null;
}

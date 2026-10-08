// Pure helpers for the stats page. The server sends traffic as formatBytes() strings ('1.50 GB')
// or as a message ('未配置', 'API报错: …', '获取异常'), so the client parses them back.
const UNIT = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };

export function parseTraffic(str) {
    const m = /^(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB|B)$/i.exec(String(str ?? '').trim());
    if (!m) return null;
    const unit = m[2].toUpperCase();
    return { value: m[1], unit, bytes: Number(m[1]) * UNIT[unit] };
}

// Routes from GET /api/routes, ranked by today's traffic. Routes with no traffic are left out.
export function topByTraffic(routes, n = 5) {
    return routes
        .map(r => ({ prefix: r.prefix, name: r.remark || r.prefix, traffic: r.todayBandwidth, bytes: parseTraffic(r.todayBandwidth)?.bytes || 0 }))
        .filter(r => r.bytes > 0)
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, n);
}

export const countryLabel = code => code === 'CN' ? '中国大陆' : (code || '未知');

// The server only returns days that had plays. The chart needs every day, so missing days get 0.
// Dates are Beijing dates, as in the server's date(timestamp, '+8 hours').
export function lastDays(trend, nowMs = Date.now(), days = 7) {
    const counts = new Map(trend.map(t => [t.date, t.count]));
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(nowMs + 8 * 3600000 - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
        return { date, count: counts.get(date) || 0 };
    });
}

// The largest n countries, plus one '其他' slice for the rest so the doughnut stays readable.
export function groupLocations(locations, n = 5) {
    const rows = locations.map(l => ({ label: countryLabel(l.country), count: l.count }));
    if (rows.length <= n + 1) return rows;
    const rest = rows.slice(n).reduce((sum, r) => sum + r.count, 0);
    return [...rows.slice(0, n), { label: '其他', count: rest }];
}

export function percent(part, total) {
    const p = total ? part / total * 100 : 0;
    return (p >= 10 ? p.toFixed(0) : p.toFixed(1)) + '%';
}

// Timestamps are 'YYYY-MM-DD HH:MM:SS', so string order is time order.
export function sortByTime(rows, dir = 'desc') {
    const sign = dir === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => sign * String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
}

// Pure rules for the overview page: node status, health verdict, ordering and formatting.
// No DOM here, so test/overview-model.test.mjs can import it.

export const MODES = {
    off: { name: '保守', hint: '抹除 IP' },
    realip_only: { name: '严格', hint: '透传 IP' },
    dual: { name: '兼容', hint: '双重透传' },
    strict: { name: '强力', hint: '防 403' },
};

// Reachability comes from the server probe (card); playback only upgrades an online node.
// A node without a card has monitoring off. A card with no probe yet has not been checked.
export const STATUS = {
    down: { cls: 'err', label: '离线' },
    live: { cls: 'ok', label: '播放中' },
    up: { cls: 'ok', label: '在线' },
    wait: { cls: 'off', label: '待探测' },
    off: { cls: 'off', label: '未监控' },
};

const SLOW_MS = 500;

// last_play is Beijing time written by the server, e.g. "2026-06-05 22:21:22".
export function lastPlayTime(lastPlay) {
    if (!lastPlay || typeof lastPlay !== 'string') return NaN;
    return Date.parse(lastPlay.trim().replace(' ', 'T') + '+08:00');
}

export function nodeStatus(route, card, now = Date.now()) {
    if (!card) return 'off';
    if (!card.latest_ts) return 'wait';
    if (!card.ok) return 'down';
    return now - lastPlayTime(route.last_play) < 3600e3 ? 'live' : 'up';
}

// Offline first, then the saved order. Array.prototype.sort is stable.
export const sortNodes = nodes => [...nodes].sort((a, b) => (b.status === 'down') - (a.status === 'down'));

export function healthStats(nodes) {
    const monitored = nodes.filter(n => n.status !== 'off');
    const down = nodes.filter(n => n.status === 'down');
    return {
        total: nodes.length,
        monitored: monitored.length,
        online: monitored.filter(n => n.status === 'up' || n.status === 'live').length,
        down: down.map(n => n.route.remark || n.route.prefix),
    };
}

// One-line verdict for the top bar. level feeds setStatusLine: ok, warn, err or off.
export function healthVerdict({ total, monitored, online, down }) {
    if (!total) return { text: '尚无反代节点', level: 'off' };
    if (!monitored) return { text: '监控未开启', level: 'off' };
    if (!down.length) return { text: '全部节点在线', level: 'ok' };
    const names = down.slice(0, 3).join('、') + (down.length > 3 ? ' 等' : '');
    return { text: `${down.length} 个节点离线：${names}`, level: online / monitored >= 0.5 ? 'warn' : 'err' };
}

export function probeBars(history, n = 20) {
    const last = (history || []).slice(-n).map(p => (!p.ok ? 'f' : p.ms >= SLOW_MS ? 's' : ''));
    return [...Array(n - last.length).fill('n'), ...last];
}

// Ping result from /api/ping-node: ms >= 0, -1 for no answer, 'err' when the request failed.
export function pingView(ms) {
    if (ms === undefined) return { text: '测速中', cls: 'off' };
    if (ms === 'err') return { text: '异常', cls: 'err' };
    if (ms < 0) return { text: '断连', cls: 'err' };
    return { text: ms + ' ms', cls: ms < SLOW_MS ? 'ok' : 'warn' };
}

export function rttTone(ms) {
    return ms < 80 ? 'ok' : ms < 200 ? 'warn' : 'err';
}

export function ago(ms, now = Date.now()) {
    const sec = Math.floor((now - ms) / 1000);
    if (!Number.isFinite(sec) || sec < 0) return '';
    if (sec < 60) return '刚刚';
    if (sec < 3600) return Math.floor(sec / 60) + ' 分钟前';
    if (sec < 86400) return Math.floor(sec / 3600) + ' 小时前';
    return Math.floor(sec / 86400) + ' 天前';
}

export const pct = v => v == null ? '—' : (v * 100).toFixed(1) + '%';

export function slaGrade(avail) {
    if (avail == null) return '';
    return avail >= 0.999 ? 'A' : avail >= 0.99 ? 'B' : 'C';
}

// Keepalive reminder: days is the threshold, lastPlayedAt the last real play (unix seconds).
export function keepaliveView(days, lastPlayedAt, nowSec = Math.floor(Date.now() / 1000)) {
    if (!(days > 0)) return null;
    if (!lastPlayedAt) return { text: `${days} 天 · 未播放`, warn: false };
    const remain = lastPlayedAt + days * 86400 - nowSec;
    if (remain <= 0) return { text: `${days} 天 · 已超期`, warn: true };
    if (remain <= 86400) return { text: `${days} 天 · 余 ${Math.max(1, Math.ceil(remain / 3600))}h`, warn: true };
    return { text: `${days} 天 · 余 ${Math.floor(remain / 86400)}d`, warn: false };
}

export const splitTargets = s => String(s || '').split(/[\n,]/).map(t => t.trim().replace(/\/$/, '')).filter(Boolean);

export const headerKeys = s => String(s || '').split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#')).map(l => l.split(':')[0].trim()).filter(Boolean);

// The POST /api/routes body for the inline edit. Fields the form does not show keep their values;
// an empty emby_password means "keep the stored password".
export function editPayload(route, f) {
    return {
        oldPrefix: route.prefix,
        prefix: String(f.prefix || route.prefix).trim().replace(/^\/+/, ''),
        target: splitTargets(f.targets).join(','),
        mode: f.mode || 'off',
        remark: String(f.remark || '').trim(),
        group_name: String(f.group || '').trim(),
        icon: route.icon || '',
        cache_img: f.cache ? 'on' : 'off',
        custom_headers: f.headers || '',
        keepalive_days: parseInt(f.keepalive, 10) || 0,
        emby_username: route.emby_username || '',
        emby_password: '',
    };
}

// Drag reorder in a list shown offline-first: put moved before its new next row in the saved order,
// so the saved order never absorbs the offline-first grouping.
export function moveBefore(order, moved, before) {
    const rest = order.filter(p => p !== moved);
    const i = before ? rest.indexOf(before) : -1;
    rest.splice(i < 0 ? rest.length : i, 0, moved);
    return rest;
}

export function sparkPoints(values, w, h) {
    const v = (values || []).filter(Number.isFinite);
    if (v.length < 2) return '';
    const max = Math.max(...v), min = Math.min(...v), span = max - min || 1;
    return v.map((x, i) => `${(i * w / (v.length - 1)).toFixed(1)},${(h - 2 - (x - min) / span * (h - 4)).toFixed(1)}`).join(' ');
}

import { dbAll, dbFirst } from '../db/helpers.js';
import { htmlEscape } from '../tg/client.js';
import { formatDuration as fmtDur, formatBeijingTimestamp } from '../util/clock.js';
import { fuzzyMatchNodes } from '../tg/fuzzy.js';
import {
    kbStatus,
    kbKeepalive,
    kbNode,
    kbMuteHelp,
    kbNodeCandidates,
} from '../tg/keyboards.js';
import { routeName, NODE_IDENTITY_COLUMNS, NODE_IDENTITY_SELECT, KEEPALIVE_SELECT, NODE_DETAIL_SELECT, qualifySelect } from '../routing/route.js';
import { MEDIA_COUNT_FIELDS, countsShape } from '../emby/media-counts.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function fmtBeijing(unixSec) {
    return `${formatBeijingTimestamp(unixSec * 1000)} (UTC+8)`;
}

const SEP = '━━━━━━━━━━';

// ---------------------------------------------------------------------------
// renderStatus
// ---------------------------------------------------------------------------

/**
 * Render /status view.
 * @param {object} env  Cloudflare env (env.DB required)
 * @returns {Promise<{text: string, reply_markup: object}>}
 */
export async function renderStatus(env) {
    const { results } = await dbAll(env, `
        SELECT ${qualifySelect('r', NODE_IDENTITY_COLUMNS)},
               s.alert_kind  AS alert_kind,
               s.first_fail_at AS first_fail_at
          FROM routes r
          LEFT JOIN emby_probe_state s ON s.prefix = r.prefix
    `);
    const rows = results || [];
    const total = rows.length;
    const offline = rows.filter(r => r.alert_kind === 'offline');
    const onlineCount = total - offline.length;
    const now = Math.floor(Date.now() / 1000);

    const lines = [];
    lines.push(`📊 <b>节点在线状态</b>`);
    lines.push(SEP);
    lines.push(`✅ <b>${onlineCount}/${total}</b> 节点在线`);

    if (offline.length) {
        lines.push('');
        lines.push('🔴 <b>离线节点</b>：');
        offline.sort((a, b) => (a.first_fail_at | 0) - (b.first_fail_at | 0));
        for (const r of offline) {
            const dur = r.first_fail_at > 0 ? (now - (r.first_fail_at | 0)) : 0;
            lines.push(`• ${htmlEscape(routeName(r))} — 已离线 ${fmtDur(dur)}`);
        }
    }

    lines.push('');
    lines.push(`🕒 ${fmtBeijing(now)}`);

    return {
        text: lines.join('\n'),
        reply_markup: kbStatus(),
    };
}

// ---------------------------------------------------------------------------
// renderKeepalive
// ---------------------------------------------------------------------------

/**
 * Render /keepalive view.
 * @param {object} env
 * @returns {Promise<{text: string, reply_markup: object}>}
 */
export async function renderKeepalive(env) {
    const { results } = await dbAll(env, `
        SELECT ${KEEPALIVE_SELECT}
          FROM routes
         WHERE keepalive_days > 0
    `);
    const rows = results || [];

    if (!rows.length) {
        return {
            text: '暂无开启保号提醒的节点',
            reply_markup: kbKeepalive(),
        };
    }

    const now = Math.floor(Date.now() / 1000);
    const items = rows.map(r => {
        const windowSec = (r.keepalive_days | 0) * 86400;
        const baseline = r.keepalive_last_played_at | 0;
        const remaining = baseline > 0 ? (baseline + windowSec - now) : windowSec;
        return { r, remaining, hasBaseline: baseline > 0 };
    });
    items.sort((a, b) => a.remaining - b.remaining);

    const lines = [];
    lines.push(`⏰ <b>保号提醒状态</b>（${items.length} 个节点）`);
    lines.push(SEP);

    for (const { r, remaining, hasBaseline } of items) {
        const name = htmlEscape(routeName(r));
        if (!hasBaseline) {
            lines.push(`• ${name} — 未播放（窗口 ${r.keepalive_days} 天）`);
        } else if (remaining <= 0) {
            const overdueDays = Math.ceil(Math.abs(remaining) / 86400);
            lines.push(`• ${name} — ⚠️ 已超期 ${overdueDays} 天`);
        } else {
            lines.push(`• ${name} — 剩余 ${fmtDur(remaining)}`);
        }
    }

    lines.push('');
    lines.push(`🕒 ${fmtBeijing(now)}`);

    return {
        text: lines.join('\n'),
        reply_markup: kbKeepalive(),
    };
}

// ---------------------------------------------------------------------------
// renderNode
// ---------------------------------------------------------------------------

/**
 * Render /node <prefix> view.
 * If prefix not found, attempts fuzzy match and returns candidate view.
 * @param {object} env
 * @param {string} prefix  exact prefix query
 * @returns {Promise<{text: string, reply_markup: object}>}
 */
export async function renderNode(env, prefix) {
    const route = await dbFirst(env,
        `SELECT ${NODE_DETAIL_SELECT}
           FROM routes WHERE prefix = ?`,
        prefix
    );

    if (!route) {
        // Fuzzy fallback (I5: cap to 200 to bound CPU on large fleets)
        const { results: allRoutes } = await dbAll(env, `
            SELECT ${NODE_IDENTITY_SELECT} FROM routes LIMIT 200
        `);
        const candidates = fuzzyMatchNodes(prefix, allRoutes || []);

        if (!candidates.length) {
            return {
                text: `⚠️ <b>未找到节点</b> <code>${htmlEscape(prefix)}</code>\n\n输入 /list 查看全部节点，或 /node &lt;prefix&gt; 精确查询`,
                reply_markup: null,
            };
        }

        const candidateLines = [
            `⚠️ <b>未找到节点</b> <code>${htmlEscape(prefix)}</code>`,
            '',
            '🔍 你是不是想找：',
        ];
        for (const c of candidates) {
            const label = htmlEscape(routeName(c));
            const code = htmlEscape(c.prefix);
            candidateLines.push(`• <code>${code}</code> — ${label}`);
        }

        const kbRows = candidates.map(c => ({
            prefix: c.prefix,
            label: routeName(c),
        }));

        return {
            text: candidateLines.join('\n'),
            reply_markup: kbNodeCandidates(kbRows),
        };
    }

    // Found — render full detail
    const now = Math.floor(Date.now() / 1000);
    const window24h = now - 86400;

    const [probeState, probeHourly, mediaRow, visitorRow] = await Promise.all([
        dbFirst(env,
            `SELECT alert_kind, first_fail_at FROM emby_probe_state WHERE prefix = ?`,
            route.prefix
        ),
        dbAll(env,
            `SELECT ok_count, fail_count, p95_ms FROM emby_probe_hourly
              WHERE prefix = ? AND hour_ts >= ?`,
            route.prefix, window24h
        ),
        dbFirst(env,
            `SELECT ${MEDIA_COUNT_FIELDS.join(', ')} FROM emby_media_counts_live WHERE prefix = ?`,
            route.prefix
        ),
        dbFirst(env,
            `SELECT timestamp, country FROM visitor_logs
              WHERE prefix = ? ORDER BY timestamp DESC LIMIT 1`,
            route.prefix
        ),
    ]);

    const name = htmlEscape(routeName(route));

    // Status line
    const isOffline = probeState && probeState.alert_kind === 'offline';
    let statusStr;
    if (isOffline) {
        const dur = probeState.first_fail_at > 0 ? fmtDur(now - (probeState.first_fail_at | 0)) : '?';
        statusStr = `🔴 离线 已 ${dur}`;
    } else {
        statusStr = '✅ 在线';
    }

    // Probe stats
    const hourlyRows = (probeHourly && probeHourly.results) || [];
    let latencyStr, successStr;
    if (!hourlyRows.length) {
        latencyStr = '暂无探测';
        successStr = '暂无探测';
    } else {
        const totalOk = hourlyRows.reduce((s, r) => s + (r.ok_count | 0), 0);
        const totalFail = hourlyRows.reduce((s, r) => s + (r.fail_count | 0), 0);
        const total = totalOk + totalFail;
        const maxP95 = hourlyRows.reduce((m, r) => Math.max(m, r.p95_ms | 0), 0);
        latencyStr = maxP95 > 0 ? `${maxP95.toLocaleString('en-US')}ms` : '0ms';
        successStr = total > 0 ? `${(totalOk / total * 100).toFixed(1)}%` : '暂无探测';
    }

    // Media counts
    const {
        movies, series, episodes, artists, albums, songs,
        music_videos: musicVideos, box_sets: boxSets, books,
    } = countsShape(mediaRow) || Object.fromEntries(MEDIA_COUNT_FIELDS.map(f => [f, 0]));
    const fmtN = (n) => n.toLocaleString('en-US');
    const extraParts = [];
    if (songs > 0 || albums > 0 || artists > 0) {
        const musicBits = [];
        if (artists > 0) musicBits.push(`🎤 ${fmtN(artists)} 艺术家`);
        if (albums > 0) musicBits.push(`💿 ${fmtN(albums)} 专辑`);
        if (songs > 0) musicBits.push(`🎵 ${fmtN(songs)} 单曲`);
        extraParts.push(`音乐: ${musicBits.join(' / ')}`);
    }
    const otherBits = [];
    if (musicVideos > 0) otherBits.push(`🎞️ ${fmtN(musicVideos)} MV`);
    if (boxSets > 0) otherBits.push(`📦 ${fmtN(boxSets)} 合集`);
    if (books > 0) otherBits.push(`📚 ${fmtN(books)} 有声书`);
    if (otherBits.length) extraParts.push(otherBits.join('  ｜  '));

    // Keepalive
    let keepaliveStr;
    const kdays = route.keepalive_days | 0;
    if (kdays <= 0) {
        keepaliveStr = '未开启';
    } else {
        const baseline = route.keepalive_last_played_at | 0;
        if (!baseline) {
            keepaliveStr = `未播放（窗口 ${kdays}d）`;
        } else {
            const remaining = baseline + kdays * 86400 - now;
            if (remaining <= 0) {
                const overdueDays = Math.ceil(Math.abs(remaining) / 86400);
                keepaliveStr = `⚠️ 已超期 ${overdueDays} 天`;
            } else {
                keepaliveStr = `剩余 ${fmtDur(remaining)}`;
            }
        }
    }

    // Last play
    let lastPlayStr;
    if (route.last_play && route.last_play.trim()) {
        lastPlayStr = htmlEscape(route.last_play.trim());
    } else if (visitorRow && visitorRow.timestamp) {
        const countryPart = visitorRow.country ? ` 来自 🌍 ${htmlEscape(visitorRow.country)}` : '';
        const parsedMs = Date.parse(String(visitorRow.timestamp).replace(' ', 'T') + 'Z');
        const tsStr = Number.isFinite(parsedMs)
            ? fmtBeijing(Math.floor(parsedMs / 1000))
            : htmlEscape(String(visitorRow.timestamp));
        lastPlayStr = `${tsStr}${countryPart}`;
    } else {
        lastPlayStr = '暂无记录';
    }

    const lines = [
        `🚀 <b>${name}</b> (<code>${htmlEscape(route.prefix)}</code>)`,
        SEP,
        `状态: ${statusStr}`,
        `峰值延迟(24h): ${latencyStr}  ｜  24h 成功率: ${successStr}`,
        `媒体: 🎬 ${movies.toLocaleString('en-US')} 部  📺 ${series.toLocaleString('en-US')} 剧 / ${episodes.toLocaleString('en-US')} 集`,
        ...extraParts,
        `保号提醒: ${keepaliveStr}`,
        `最近播放: ${lastPlayStr}`,
        '',
        `🕒 ${fmtBeijing(now)}`,
    ];

    return {
        text: lines.join('\n'),
        reply_markup: kbNode(route.prefix),
    };
}

// ---------------------------------------------------------------------------
// renderList
// ---------------------------------------------------------------------------

/**
 * Render /list view — all routes sorted by prefix.
 * @param {object} env
 * @returns {Promise<{text: string, reply_markup: object}>}
 */
export async function renderList(env) {
    const { results } = await dbAll(env, `
        SELECT ${NODE_IDENTITY_SELECT}
          FROM routes
         ORDER BY prefix ASC
    `);
    const rows = results || [];

    const lines = [];
    lines.push(`📋 <b>节点列表</b>（共 ${rows.length} 个）`);
    lines.push(SEP);

    if (!rows.length) {
        lines.push('暂无节点');
    } else {
        for (const r of rows) {
            const alias = htmlEscape(r.public_alias || r.remark || '');
            const code = htmlEscape(r.prefix);
            lines.push(alias
                ? `<code>${code}</code> — ${alias}`
                : `<code>${code}</code>`
            );
        }
    }

    lines.push('');
    lines.push(`🕒 ${fmtBeijing(Math.floor(Date.now() / 1000))}`);

    return {
        text: lines.join('\n'),
        reply_markup: kbStatus(),
    };
}

// ---------------------------------------------------------------------------
// renderUnknownCommand
// ---------------------------------------------------------------------------

/**
 * Render unknown command message.
 * @param {string} input  raw command text the user sent
 * @returns {{text: string, reply_markup: null}}
 */
export function renderUnknownCommand(input) {
    return {
        text: `⚠️ <b>未知命令</b> <code>${htmlEscape(input)}</code>\n输入 /help 查看可用命令`,
        reply_markup: null,
    };
}

// ---------------------------------------------------------------------------
// renderMuteHelp
// ---------------------------------------------------------------------------

/**
 * Render mute argument error with quick-select keyboard.
 * @returns {{text: string, reply_markup: object}}
 */
export function renderMuteHelp() {
    return {
        text: '用法: <code>/mute &lt;时长&gt;</code>\n例如: <code>/mute 30</code> (30分钟), <code>/mute 2h</code>, <code>/mute 1d</code>\n上限 24h',
        reply_markup: kbMuteHelp(),
    };
}

// ---------------------------------------------------------------------------
// renderMuteApplied / renderUnmuted
// ---------------------------------------------------------------------------

/**
 * Render mute confirmation.
 * @param {number} untilTs  Unix timestamp (seconds) when mute expires
 * @returns {{text: string, reply_markup: null}}
 */
export function renderMuteApplied(untilTs) {
    return {
        text: `🔇 已静音至 ${fmtBeijing(untilTs)}`,
        reply_markup: null,
    };
}

/**
 * Render unmute confirmation.
 * @returns {{text: string, reply_markup: null}}
 */
export function renderUnmuted() {
    return {
        text: '🔔 已恢复告警',
        reply_markup: null,
    };
}

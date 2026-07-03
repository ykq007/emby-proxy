import { beijingDayStr } from '../util/clock.js';
import { refreshLiveCounts } from '../emby/counts.js';
import { countsShape, countsDelta, countsTotal } from '../emby/media-counts.js';
import { routeName, STATUS_CARD_SELECT } from '../routing/route.js';
import { dbStmt, dbBatch } from '../db/helpers.js';

// 把路由 + 按 prefix 索引的聚合切片拼成面板卡片（/api/status/probes 的 cards[]）。
function buildStatusCards(routes, slices) {
    return routes.map(route => {
        const prefix = route.prefix;
        const lastProbe = slices.lastProbeBy.get(prefix) || null;
        const ecg = slices.ecgBy.get(prefix) || [];
        const raw24 = slices.agg24By.get(prefix) || null;
        const hourly7 = slices.agg7dBy.get(prefix) || null;
        const hourly30 = slices.agg30dBy.get(prefix) || null;
        const todayCounts = slices.latestCountsBy.get(prefix) || null;
        const yesterdayCounts = todayCounts ? (slices.prevCountsBy.get(prefix) || null) : null;
        const total24 = (raw24 && raw24.total) | 0;
        const ok24 = (raw24 && raw24.ok_count) | 0;
        const total7d = (hourly7 && hourly7.total) | 0;
        const ok7d = (hourly7 && hourly7.ok_count) | 0;
        const total30d = (hourly30 && hourly30.total) | 0;
        const ok30d = (hourly30 && hourly30.ok_count) | 0;
        const ok = !!(lastProbe && lastProbe.ok);

        return {
            prefix,
            name: routeName(route),
            icon: route.icon || '',
            ok,
            latest_ms: lastProbe ? (lastProbe.ms | 0) : 0,
            latest_ts: lastProbe ? (lastProbe.ts | 0) : 0,
            avail_24h: total24 > 0 ? (ok24 / total24) : null,
            avail_7d: total7d > 0 ? (ok7d / total7d) : null,
            avail_30d: total30d > 0 ? (ok30d / total30d) : null,
            history: ecg.map(p => ({ ok: p.ok, ms: p.ms | 0 })).reverse(),
            trend: (slices.trendBy.get(prefix) || []).slice().reverse(),
            counts: countsShape(todayCounts),
            counts_delta: countsDelta(todayCounts, yesterdayCounts),
            show_counts: true,
        };
    });
}

export async function loadStatusData(env, opts) {
    opts = opts || {};
    const limitPrefix = opts.prefix || null;

    const now = Math.floor(Date.now() / 1000);
    const since24 = now - 24 * 3600;
    const since7d = now - 7 * 86400;
    const since30d = now - 30 * 86400;
    const since60 = now - 60 * 60;
    const today = beijingDayStr();

    const routesWhere = limitPrefix
        ? `WHERE monitor_enabled = 1 AND prefix = ?`
        : `WHERE monitor_enabled = 1`;
    const probeFilter = limitPrefix ? ` AND prefix = ?` : '';

    // 5 aggregate statements, submitted concurrently via D1 batch. No N+1.
    const stmtRoutes = limitPrefix
        ? dbStmt(env, `SELECT ${STATUS_CARD_SELECT}
                          FROM routes ${routesWhere} ORDER BY sort_order ASC, prefix ASC`, limitPrefix)
        : dbStmt(env, `SELECT ${STATUS_CARD_SELECT}
                          FROM routes ${routesWhere} ORDER BY sort_order ASC, prefix ASC`);
    // last 60 min of probes; rn=1 → lastProbe, rn<=60 → ECG history
    const stmtProbes = limitPrefix
        ? dbStmt(env, `SELECT prefix, ok, ms, status, ts,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY ts DESC) AS rn
                          FROM emby_probes WHERE ts >= ?${probeFilter}
                          ORDER BY prefix ASC, ts DESC`, since60, limitPrefix)
        : dbStmt(env, `SELECT prefix, ok, ms, status, ts,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY ts DESC) AS rn
                          FROM emby_probes WHERE ts >= ?
                          ORDER BY prefix ASC, ts DESC`, since60);
    // 24h 可用率改为读取已维护的小时汇总表（emby_probe_hourly），而不是扫描原始 emby_probes。
    // 原实现每次页面加载都要 COUNT(*) 全表(~67k 行/次)，一天下来轻松突破 D1 免费额度的 5M rows_read。
    // 汇总表按小时预聚合，行数是原来的 1/60，与 7d/30d 的查询方式保持一致。
    const stmt24 = limitPrefix
        ? dbStmt(env, `SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ?${probeFilter} GROUP BY prefix`, since24, limitPrefix)
        : dbStmt(env, `SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ? GROUP BY prefix`, since24);
    const stmt7d = limitPrefix
        ? dbStmt(env, `SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ?${probeFilter} GROUP BY prefix`, since7d, limitPrefix)
        : dbStmt(env, `SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ? GROUP BY prefix`, since7d);
    const stmt30d = limitPrefix
        ? dbStmt(env, `SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ?${probeFilter} GROUP BY prefix`, since30d, limitPrefix)
        : dbStmt(env, `SELECT prefix, SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total
                          FROM emby_probe_hourly WHERE hour_ts >= ? GROUP BY prefix`, since30d);
    // media counts: top-2 days per prefix; rn=1 → latest, rn=2 → previous
    const stmtCounts = limitPrefix
        ? dbStmt(env, `SELECT prefix, day, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY day DESC) AS rn
                          FROM emby_media_counts WHERE day <= ?${probeFilter}`, today, limitPrefix)
        : dbStmt(env, `SELECT prefix, day, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books,
                                 ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY day DESC) AS rn
                          FROM emby_media_counts WHERE day <= ?`, today);

    const stmtLive = limitPrefix
        ? dbStmt(env, `SELECT prefix, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books, updated_at FROM emby_media_counts_live WHERE prefix = ?`, limitPrefix)
        : dbStmt(env, `SELECT prefix, movies, series, episodes, artists, albums, songs, music_videos, box_sets, books, updated_at FROM emby_media_counts_live`);

    const [resRoutes, resProbes, res24, res7d, res30d, resCounts, resLive] =
        await dbBatch(env, [stmtRoutes, stmtProbes, stmt24, stmt7d, stmt30d, stmtCounts, stmtLive]);

    const routes = resRoutes.results || [];
    if (!routes.length) return { routes: [], cards: [] };

    // index aggregates by prefix
    const lastProbeBy = new Map();
    const ecgBy = new Map();
    for (const p of (resProbes.results || [])) {
        if (p.rn === 1) lastProbeBy.set(p.prefix, p);
        if (p.rn <= 60) {
            let arr = ecgBy.get(p.prefix);
            if (!arr) { arr = []; ecgBy.set(p.prefix, arr); }
            arr.push(p);
        }
    }
    const agg24By = new Map();
    for (const r of (res24.results || [])) agg24By.set(r.prefix, { ok_count: r.ok_count | 0, total: r.total | 0 });
    // 小时汇总只包含"已完整走完"的小时（每小时整点才 rollup 一次），当前这一小时还没被
    // 汇总进 emby_probe_hourly，会导致 24h 可用率最多滞后 1 小时。resProbes 已经把最近 60
    // 分钟的原始探测数据拉到内存里(用于上面的 ECG)，而当前小时已过去的时长必然 < 60 分钟，
    // 因此可以直接从这份数据里筛出属于"当前小时"的探测补进 agg24By，不需要额外查询、也不会
    // 与已 rollup 的历史小时重复计数（因为 hour_ts 都严格小于 currentHourStart）。
    const currentHourStart = Math.floor(now / 3600) * 3600;
    for (const p of (resProbes.results || [])) {
        if (p.ts < currentHourStart) continue;
        let agg = agg24By.get(p.prefix);
        if (!agg) { agg = { ok_count: 0, total: 0 }; agg24By.set(p.prefix, agg); }
        agg.total += 1;
        if (p.ok) agg.ok_count += 1;
    }
    const agg7dBy = new Map();
    for (const r of (res7d.results || [])) agg7dBy.set(r.prefix, r);
    const agg30dBy = new Map();
    for (const r of (res30d?.results || [])) agg30dBy.set(r.prefix, r);
    // Fallback: 今日还没抓到(跨日窗口 / 外部 cron 未跑 / token 临时挂)时,回退到最近一天已有的计数,
    // 保持 /status 永远不空白; delta 以"最近一天"对比"再前一天"。
    const latestCountsBy = new Map();
    const prevCountsBy = new Map();
    // 入库趋势：复用同一份每日计数(已按 day DESC 返回)，取最近 14 天的总条目数。
    const trendBy = new Map();
    for (const c of (resCounts.results || [])) {
        if (c.rn === 1) latestCountsBy.set(c.prefix, c);
        else if (c.rn === 2) prevCountsBy.set(c.prefix, c);
        if (c.rn <= 14) {
            let arr = trendBy.get(c.prefix);
            if (!arr) { arr = []; trendBy.set(c.prefix, arr); }
            arr.push(countsTotal(c));
        }
    }
    // Live table (per-prefix, updated within minutes of an Emby library scan)
    // overrides the daily "today" snapshot so dashboard shows near-real-time numbers.
    // The daily table is still the baseline for yesterday delta.
    for (const c of (resLive?.results || [])) {
        latestCountsBy.set(c.prefix, { prefix: c.prefix, movies: c.movies, series: c.series, episodes: c.episodes, artists: c.artists, albums: c.albums, songs: c.songs, music_videos: c.music_videos, box_sets: c.box_sets, books: c.books, updated_at: c.updated_at });
    }

    const cards = buildStatusCards(routes, {
        lastProbeBy, ecgBy, agg24By, agg7dBy, agg30dBy, latestCountsBy, prevCountsBy, trendBy,
    });
    // 管理端按需实时刷新：后台用用户名/密码登录拉取最新计数（所有节点）。
    if (opts.liveRefresh && opts.ctx && opts.ctx.waitUntil) {
        const livePrefixes = routes.map(r => r.prefix);
        if (livePrefixes.length) opts.ctx.waitUntil(refreshLiveCounts(env, livePrefixes));
    }
    return { routes, cards };
}

// 公开 /status 页与缓存包装已移除（节点状态只在管理面板展示）。
// 仅保留 loadStatusData（管理端 /api/status/probes 使用）。

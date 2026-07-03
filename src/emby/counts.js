import { dbFirst, dbAll, dbStmt, dbBatch } from '../db/helpers.js';
import { beijingDayStr } from '../util/clock.js';
import { probeTargetFor } from '../probes/probe.js';
import { getRecentUa, getEmbyToken, DEFAULT_EMBY_UA } from './auth.js';
import { fetchItemCountsFromEmby, fetchLibraryScanLastEndFromEmby } from './client.js';
import { MEDIA_COUNT_FIELDS } from './media-counts.js';
import { MEDIA_COUNTS_REFRESH_SELECT, clearEmbyAuthCache, touchEmbyAuthUsedStmt } from '../routing/route.js';

const FORCE_REFRESH_INTERVAL = 6 * 3600; // seconds — cron 兜底强刷间隔

// 清空某节点缓存的 AccessToken（登录凭据失效时调用，下次重新登录）。
async function clearAuthCache(env, prefix) {
    try { await clearEmbyAuthCache(env, prefix); } catch (e) {}
}

// 解析单个节点的媒体计数。返回：
//   { skip: true }            —— 无真实 UA / 无 base / 无 token / 库未变（scanGate 命中）
//   { unauthorized: true }    —— 凭据登录失败（已清缓存）
//   { counts, scanEnd }       —— 成功
// opts.scanGate=true 时先用 /ScheduledTasks 廉价判断库是否变化，避免无谓的重计数（cron 用）。
async function resolveCountsForRoute(env, route, now, opts) {
    const scanGate = !!(opts && opts.scanGate);
    const base = probeTargetFor(route.target);
    if (!base) return { skip: true };

    // 优先用该节点真实访客 UA；无流量节点回退到通用桌面浏览器 UA，保证也能拉计数。
    const ua = (await getRecentUa(env, route.prefix)) || DEFAULT_EMBY_UA;

    let auth = await getEmbyToken(env, route, base, { ua, now });
    if (!auth) return { skip: true };
    if (auth.unauthorized) { await clearAuthCache(env, route.prefix); return { unauthorized: true }; }

    // 廉价闸门：库自上次快照后是否有扫描完成
    let scanEnd = 0;
    if (scanGate) {
        const live = await dbFirst(env, `SELECT updated_at, last_scan_end FROM emby_media_counts_live WHERE prefix=?`, route.prefix);
        const lastUpdated = live ? (live.updated_at | 0) : 0;
        const lastScanEnd = live ? (live.last_scan_end | 0) : 0;
        const forceDue = (now - lastUpdated) >= FORCE_REFRESH_INTERVAL;
        scanEnd = await fetchLibraryScanLastEndFromEmby(base, auth.token, route.custom_headers, route.prefix, ua);
        if (scanEnd === -1) { // token 失效（多为过期缓存）→ 强制重登一次
            const relog = await getEmbyToken(env, route, base, { ua, now, forceLogin: true });
            if (!relog || relog.unauthorized) { await clearAuthCache(env, route.prefix); return relog && relog.unauthorized ? { unauthorized: true } : { skip: true }; }
            auth = relog;
            scanEnd = await fetchLibraryScanLastEndFromEmby(base, auth.token, route.custom_headers, route.prefix, ua);
            if (scanEnd < 0) scanEnd = 0;
        }
        const scanChanged = scanEnd > 0 && scanEnd > lastScanEnd;
        if (!scanChanged && !forceDue) return { skip: true, scanEnd: scanEnd > 0 ? scanEnd : lastScanEnd };
    }

    let counts = await fetchItemCountsFromEmby(base, auth.token, route.custom_headers, route.prefix, ua);
    if (counts && counts.unauthorized) {
        // 缓存 token 过期：强制重登一次再取
        const relog = await getEmbyToken(env, route, base, { ua, now, forceLogin: true });
        if (!relog || relog.unauthorized) { await clearAuthCache(env, route.prefix); return relog && relog.unauthorized ? { unauthorized: true } : { skip: true }; }
        auth = relog;
        counts = await fetchItemCountsFromEmby(base, auth.token, route.custom_headers, route.prefix, ua);
    }
    if (!counts) return { skip: true };
    if (counts.unauthorized) { await clearAuthCache(env, route.prefix); return { unauthorized: true }; }
    return { counts, scanEnd };
}

// 组装把计数写入 _live + 当日表 + emby_auth_used_at 的语句数组。
// 列名/占位符/取值全部由 MEDIA_COUNT_FIELDS 派生，与建表列同名。
const COUNT_COLS = MEDIA_COUNT_FIELDS.join(', ');
const COUNT_PLACEHOLDERS = MEDIA_COUNT_FIELDS.map(() => '?').join(',');
const COUNT_UPSERT_SET = MEDIA_COUNT_FIELDS.map(f => `${f}=excluded.${f}`).join(', ');

function buildCountWrites(env, route, counts, now, scanEnd) {
    const today = beijingDayStr();
    const vals = MEDIA_COUNT_FIELDS.map(f => counts[f]);
    return [
        dbStmt(env,
            `INSERT INTO emby_media_counts_live(prefix, ${COUNT_COLS}, updated_at, last_scan_end)
             VALUES(?,${COUNT_PLACEHOLDERS},?,?)
             ON CONFLICT(prefix) DO UPDATE SET ${COUNT_UPSERT_SET}, updated_at=excluded.updated_at, last_scan_end=excluded.last_scan_end`,
            route.prefix, ...vals, now, scanEnd | 0),
        dbStmt(env, `INSERT OR REPLACE INTO emby_media_counts(prefix, day, ${COUNT_COLS}) VALUES(?,?,${COUNT_PLACEHOLDERS})`,
            route.prefix, today, ...vals),
        touchEmbyAuthUsedStmt(env, route.prefix, now),
    ];
}

// Refresh media counts opportunistically. Called by the daily cron and /api/_counts_now.
// 用廉价 /ScheduledTasks 闸门跳过未变化的库；token 由用户名/密码登录获得（UA 取自日志）。
export async function maybeFetchMediaCounts(env, routes, now) {
    try {
        const writes = [];
        for (const r of routes) {
            // 所有节点默认都尝试拉取媒体计数；无日志 UA 或无凭据的节点会在内部自然跳过。
            const res = await resolveCountsForRoute(env, r, now, { scanGate: true });
            if (res && res.counts) {
                const scanEnd = res.scanEnd > 0 ? res.scanEnd : 0;
                writes.push(...buildCountWrites(env, r, res.counts, now, scanEnd));
            }
        }
        if (writes.length) await dbBatch(env, writes);
    } catch (e) {
        console.log('maybeFetchMediaCounts error:', e.message);
    }
}

// 后台批量刷新指定前缀的实时计数（供管理端状态面板按需调用）。
// 受 getCountsLive 内部 60s TTL + inflight 去重约束，重复调用不会反复打 Emby。
export async function refreshLiveCounts(env, prefixes) {
    const list = Array.isArray(prefixes) ? prefixes : [];
    for (const prefix of list) {
        try {
            const route = await dbFirst(env, `SELECT ${MEDIA_COUNTS_REFRESH_SELECT} FROM routes WHERE prefix = ?`, prefix);
            if (route) await getCountsLive(env, route, null, { ttl: 60 });
        } catch (e) { /* swallow per-node */ }
    }
}

// 进程内去重：避免同一节点并发触发多次后台刷新。
const REFRESH_INFLIGHT = new Set();

// 实时取计数（stale-while-revalidate）。
// route 需带：prefix, target, custom_headers, emby_auth_cache, emby_username, emby_password_enc, media_counts_auto_auth。
// 命中新鲜缓存直接返回；过期则返回旧值并后台刷新；从无缓存则阻塞刷新一次。
// 返回 { row, stale, refreshing }。
export async function getCountsLive(env, route, ctx, opts) {
    const ttl = (opts && opts.ttl) || 60;
    const now = Math.floor(Date.now() / 1000);
    const readLive = () => dbFirst(env, `SELECT prefix, ${COUNT_COLS}, updated_at FROM emby_media_counts_live WHERE prefix = ?`, route.prefix);

    const live = await readLive();
    const age = live ? (now - (live.updated_at | 0)) : Infinity;
    if (live && age < ttl) return { row: live, stale: false, refreshing: false };

    const doRefresh = async () => {
        if (REFRESH_INFLIGHT.has(route.prefix)) return;
        REFRESH_INFLIGHT.add(route.prefix);
        try {
            const res = await resolveCountsForRoute(env, route, now, { scanGate: false });
            if (res && res.counts) {
                const scanEnd = res.scanEnd > 0 ? res.scanEnd : (live ? (live.last_scan_end | 0) : 0);
                await dbBatch(env, buildCountWrites(env, route, res.counts, now, scanEnd));
            }
        } catch (e) { /* swallow */ } finally {
            REFRESH_INFLIGHT.delete(route.prefix);
        }
    };

    if (live) {
        // 有旧值：有 ctx 时立刻返回旧值、后台刷新（不阻塞页面）；
        // 无 ctx 时调用方本身已在后台循环里，直接 await 让刷新真正完成。
        if (ctx && ctx.waitUntil) {
            ctx.waitUntil(doRefresh());
            return { row: live, stale: true, refreshing: true };
        }
        await doRefresh();
        const fresh = await readLive();
        return { row: fresh || live, stale: false, refreshing: false };
    }
    // 从无缓存：阻塞刷新一次（受 fetch 超时约束），再读回。
    await doRefresh();
    const fresh = await readLive();
    return { row: fresh || null, stale: false, refreshing: false };
}

import { dbAll, dbStmt, dbBatch } from '../db/helpers.js';
import { notify } from '../tg/notifications.js';
import { routeName, idleAuthCacheCleanupStmt } from '../routing/route.js';
import { kvGet, kvSetStmt, EMBY_LAST_ROLLUP_TS_KEY } from '../db/kv.js';

const EMBY_RAW_RETENTION_S = 24 * 3600;
const EMBY_HOURLY_RETENTION_S = 7 * 86400;
const EMBY_OUTAGE_THRESHOLD_S = 900;
const EMBY_HARVEST_IDLE_DROP_S = 7 * 86400;

export async function maybeRollupHourly(env, now) {
    try {
        const lastRaw = await kvGet(env, EMBY_LAST_ROLLUP_TS_KEY);
        const last = lastRaw ? parseInt(lastRaw, 10) || 0 : 0;
        if (Math.floor(now / 3600) <= Math.floor(last / 3600)) return;
        const hourTs = Math.floor(now / 3600) * 3600 - 3600;
        const hourEnd = hourTs + 3600;
        const { results } = await dbAll(env, `
            SELECT prefix,
                   SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END) AS ok_count,
                   SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END) AS fail_count,
                   AVG(ms) AS avg_ms,
                   MAX(ms) AS max_ms
              FROM emby_probes
             WHERE ts >= ? AND ts < ?
          GROUP BY prefix
        `, hourTs, hourEnd);
        const stmts = (results || []).map(r =>
            dbStmt(env, `INSERT OR REPLACE INTO emby_probe_hourly(prefix, hour_ts, ok_count, fail_count, avg_ms, p95_ms) VALUES(?,?,?,?,?,?)`,
                r.prefix, hourTs, r.ok_count | 0, r.fail_count | 0, Math.round(r.avg_ms || 0), Math.round(r.max_ms || 0))
        );
        stmts.push(dbStmt(env, `DELETE FROM emby_probes WHERE ts < ?`, now - EMBY_RAW_RETENTION_S));
        stmts.push(dbStmt(env, `DELETE FROM emby_probe_hourly WHERE hour_ts < ?`, now - EMBY_HOURLY_RETENTION_S));
        stmts.push(kvSetStmt(env, EMBY_LAST_ROLLUP_TS_KEY, now));
        // 闲置令牌回收
        stmts.push(idleAuthCacheCleanupStmt(env, now, EMBY_HARVEST_IDLE_DROP_S));
        if (stmts.length) await dbBatch(env, stmts);
    } catch (e) {
        console.log('maybeRollupHourly error:', e.message);
    }
}

export async function runAlertFSM(env, routes, probes, now) {
    try {
        const stateRows = await dbAll(env, `SELECT prefix, first_fail_at, last_alert_at, alert_kind FROM emby_probe_state`);
        const stateMap = new Map();
        for (const r of (stateRows.results || [])) stateMap.set(r.prefix, r);
        const routeMap = new Map(routes.map(r => [r.prefix, r]));

        const upsertAlert = (prefix, firstFail, lastAlert, kind) =>
            dbStmt(env, `INSERT OR REPLACE INTO emby_probe_state(prefix, first_fail_at, last_alert_at, alert_kind) VALUES(?,?,?,?)`,
                prefix, firstFail, lastAlert, kind);
        const stmts = [];
        const sends = [];
        for (const p of probes) {
            const st = stateMap.get(p.prefix) || { first_fail_at: 0, last_alert_at: 0, alert_kind: 'none' };
            const route = routeMap.get(p.prefix);
            const name = route ? routeName(route) : p.prefix;
            if (p.ok) {
                if (st.alert_kind === 'offline') {
                    const duration = st.first_fail_at > 0 ? (now - st.first_fail_at) : 0;
                    sends.push({ kind: 'recovered', name, duration, prefix: p.prefix });
                    stmts.push(upsertAlert(p.prefix, 0, now, 'recovered'));
                } else if (st.first_fail_at !== 0 || st.alert_kind !== 'none') {
                    stmts.push(upsertAlert(p.prefix, 0, st.last_alert_at | 0, 'none'));
                }
            } else {
                const firstFail = st.first_fail_at > 0 ? st.first_fail_at : now;
                if (st.alert_kind !== 'offline' && (now - firstFail) >= EMBY_OUTAGE_THRESHOLD_S) {
                    sends.push({ kind: 'offline', name, duration: now - firstFail, prefix: p.prefix });
                    stmts.push(upsertAlert(p.prefix, firstFail, now, 'offline'));
                } else if (st.first_fail_at === 0) {
                    // 从 recovered/none 进入新的失败窗口时，alert_kind 必须 reset 为 none，
                    // 直到 (now - firstFail) >= 900s（约 3 个探测周期，且每次探测已由
                    // probe.js 内部重试确认）才会升级为 offline
                    stmts.push(upsertAlert(p.prefix, firstFail, st.last_alert_at | 0, 'none'));
                }
            }
        }
        if (stmts.length) await dbBatch(env, stmts);
        // FSM state is always written above regardless of mute; the mute
        // window itself is enforced inside notify() (src/tg/notifications.js).
        if (sends.length) {
            await notify(env, 'probe-alert', { sends }, now);
        }
    } catch (e) {
        console.log('runAlertFSM error:', e.message);
    }
}

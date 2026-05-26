import { dbRun, dbAll, dbFirst } from '../db/helpers.js';

const EMBY_RAW_RETENTION_S = 24 * 3600;
const EMBY_HOURLY_RETENTION_S = 7 * 86400;
const EMBY_OUTAGE_THRESHOLD_S = 300;
const EMBY_HARVEST_IDLE_DROP_S = 7 * 86400;

export async function maybeRollupHourly(env, now) {
    try {
        const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'emby_last_rollup_ts'`);
        const last = row ? parseInt(row.v, 10) || 0 : 0;
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
            env.DB.prepare(`INSERT OR REPLACE INTO emby_probe_hourly(prefix, hour_ts, ok_count, fail_count, avg_ms, p95_ms) VALUES(?,?,?,?,?,?)`)
                .bind(r.prefix, hourTs, r.ok_count | 0, r.fail_count | 0, Math.round(r.avg_ms || 0), Math.round(r.max_ms || 0))
        );
        stmts.push(env.DB.prepare(`DELETE FROM emby_probes WHERE ts < ?`).bind(now - EMBY_RAW_RETENTION_S));
        stmts.push(env.DB.prepare(`DELETE FROM emby_probe_hourly WHERE hour_ts < ?`).bind(now - EMBY_HOURLY_RETENTION_S));
        stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO kv_config(k, v, updated_at) VALUES('emby_last_rollup_ts', ?, CURRENT_TIMESTAMP)`).bind(String(now)));
        // 闲置令牌回收
        stmts.push(env.DB.prepare(`UPDATE routes SET emby_auth_cache='', emby_auth_seen_at=0, emby_auth_used_at=0
                                    WHERE emby_auth_cache != ''
                                      AND emby_auth_seen_at > 0 AND (? - emby_auth_seen_at) > ?
                                      AND (emby_auth_used_at = 0 OR (? - emby_auth_used_at) > ?)`)
            .bind(now, EMBY_HARVEST_IDLE_DROP_S, now, EMBY_HARVEST_IDLE_DROP_S));
        if (stmts.length) await env.DB.batch(stmts);
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
            env.DB.prepare(`INSERT OR REPLACE INTO emby_probe_state(prefix, first_fail_at, last_alert_at, alert_kind) VALUES(?,?,?,?)`)
                .bind(prefix, firstFail, lastAlert, kind);
        const stmts = [];
        const sends = [];
        for (const p of probes) {
            const st = stateMap.get(p.prefix) || { first_fail_at: 0, last_alert_at: 0, alert_kind: 'none' };
            const route = routeMap.get(p.prefix);
            const name = (route && (route.public_alias || route.remark)) || p.prefix;
            if (p.ok) {
                if (st.alert_kind === 'offline') {
                    const duration = st.first_fail_at > 0 ? (now - st.first_fail_at) : 0;
                    sends.push({ kind: 'recovered', name, duration });
                    stmts.push(upsertAlert(p.prefix, 0, now, 'recovered'));
                } else if (st.first_fail_at !== 0 || st.alert_kind !== 'none') {
                    stmts.push(upsertAlert(p.prefix, 0, st.last_alert_at | 0, 'none'));
                }
            } else {
                const firstFail = st.first_fail_at > 0 ? st.first_fail_at : now;
                if (st.alert_kind !== 'offline' && (now - firstFail) >= EMBY_OUTAGE_THRESHOLD_S) {
                    sends.push({ kind: 'offline', name, duration: now - firstFail });
                    stmts.push(upsertAlert(p.prefix, firstFail, now, 'offline'));
                } else if (st.first_fail_at === 0) {
                    stmts.push(upsertAlert(p.prefix, firstFail, st.last_alert_at | 0, st.alert_kind || 'none'));
                }
            }
        }
        if (stmts.length) await env.DB.batch(stmts);
        if (sends.length && env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
            const fmtDur = (s) => s >= 3600 ? `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m${s % 60}s`;
            for (const s of sends) {
                const msg = s.kind === 'offline'
                    ? `🔴 *节点离线告警*\n\n📍 ${s.name}\n⏱️ 持续 ${fmtDur(s.duration)}`
                    : `🟢 *节点已恢复*\n\n📍 ${s.name}\n⏱️ 本次离线 ${fmtDur(s.duration)}`;
                try {
                    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: msg, parse_mode: 'Markdown' })
                    });
                } catch (e) { /* swallow */ }
            }
        }
    } catch (e) {
        console.log('runAlertFSM error:', e.message);
    }
}


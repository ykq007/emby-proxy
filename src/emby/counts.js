import { dbRun, dbFirst } from '../db/helpers.js';
import { parseCustomHeadersForProbe, parseCustomHeaderEmbyToken, buildEmbyClientHeaders } from './headers.js';
import { encryptToken, decryptToken, persistHarvestedToken, HARVEST_MEM } from './tokens.js';
import { nowLocalDayStr } from '../util/text.js';
import { probeTargetFor } from '../probes/probe.js';

export async function fetchItemCounts(targetBase, token, customHeadersRaw, prefix) {
    if (!targetBase || !token) return null;
    const ctrl = new AbortController();
    // 与上游一致：媒体计数允许 15s（大型库 /Items/Counts 可能慢）。
    const tmr = setTimeout(() => ctrl.abort(), 15000);
    try {
        const base = targetBase.replace(/\/+$/, '');
        const qs = 'Recursive=true&IncludeItemTypes=Movie,Series,Episode&api_key=' + encodeURIComponent(token);
        const url = base + '/emby/Items/Counts?' + qs;
        const headers = buildEmbyClientHeaders(token, prefix);
        // 手动覆盖头（如 route.custom_headers 里指定的 X-Emby-Token）优先生效。
        const extra = parseCustomHeadersForProbe(customHeadersRaw);
        for (const k of Object.keys(extra)) headers[k] = extra[k];
        let res = await fetch(url, { method: 'GET', redirect: 'manual', signal: ctrl.signal, headers, cf: { cacheTtl: 0 } });
        // 兼容裸 Emby（无 /emby 前缀）部署
        if (res.status === 404) {
            const url2 = base + '/Items/Counts?' + qs;
            res = await fetch(url2, { method: 'GET', redirect: 'manual', signal: ctrl.signal, headers, cf: { cacheTtl: 0 } });
        }
        clearTimeout(tmr);
        if (res.status === 401 || res.status === 403) return { unauthorized: true };
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        if (!data) return null;
        return {
            movies: Number(data.MovieCount || 0) | 0,
            series: Number(data.SeriesCount || 0) | 0,
            episodes: Number(data.EpisodeCount || 0) | 0
        };
    } catch (e) {
        clearTimeout(tmr);
        return null;
    }
}
export async function maybeFetchMediaCounts(env, routes, now) {
    try {
        const today = nowLocalDayStr();
        const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'emby_last_media_day'`);
        const lastDay = row ? String(row.v || '') : '';
        if (lastDay === today) return;
        const writes = [];
        let wroteCounts = false;
        for (const r of routes) {
            if (!r.media_counts_auto_auth) continue;
            const base = probeTargetFor(r.target);
            if (!base) continue;
            let token = parseCustomHeaderEmbyToken(r.custom_headers);
            let source = 'manual';
            if (!token && r.emby_auth_cache) {
                token = await decryptToken(env, r.prefix, r.emby_auth_cache);
                source = 'harvested';
            }
            if (!token) continue;
            const counts = await fetchItemCounts(base, token, r.custom_headers, r.prefix);
            if (!counts) continue;
            if (counts.unauthorized) {
                if (source === 'harvested') {
                    writes.push(env.DB.prepare(`UPDATE routes SET emby_auth_cache='', emby_auth_seen_at=0 WHERE prefix=?`).bind(r.prefix));
                    HARVEST_MEM.delete(r.prefix);
                }
                continue;
            }
            writes.push(env.DB.prepare(`INSERT OR REPLACE INTO emby_media_counts(prefix, day, movies, series, episodes) VALUES(?,?,?,?,?)`)
                .bind(r.prefix, today, counts.movies, counts.series, counts.episodes));
            wroteCounts = true;
            writes.push(env.DB.prepare(`UPDATE routes SET emby_auth_used_at = ? WHERE prefix = ?`).bind(now, r.prefix));
        }
        if (wroteCounts) {
            writes.push(env.DB.prepare(`INSERT OR REPLACE INTO kv_config(k, v, updated_at) VALUES('emby_last_media_day', ?, CURRENT_TIMESTAMP)`).bind(today));
        }
        if (writes.length) await env.DB.batch(writes);
    } catch (e) {
        console.log('maybeFetchMediaCounts error:', e.message);
    }
}

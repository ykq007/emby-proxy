export function probeTargetFor(routeTarget) {
    const first = String(routeTarget || '').split(',').map(s => s.trim()).filter(Boolean)[0];
    if (!first) return null;
    return first.replace(/\/+$/, '');
}

export async function probeOne(route) {
    const base = probeTargetFor(route.target);
    if (!base) return { prefix: route.prefix, ok: false, ms: 0, status: 0 };
    const ctrl = new AbortController();
    const tmr = setTimeout(() => ctrl.abort(), EMBY_PROBE_TIMEOUT_MS);
    const start = Date.now();
    const customHeaders = parseCustomHeadersForProbe(route.custom_headers);
    const tryUrl = async (u) => fetch(u, {
        method: 'GET', redirect: 'manual', signal: ctrl.signal,
        headers: { 'User-Agent': EMBY_PROBE_UA, 'Accept': 'application/json,text/plain,*/*', 'X-Forward-Probe': '1', ...customHeaders },
        cf: { cacheTtl: 0 }
    });
    try {
        // 与上游一致的回退顺序：/emby/System/Info/Public → /System/Info/Public → /emby/Users/Public
        let res = await tryUrl(base + '/emby/System/Info/Public');
        if (res.status === 404) res = await tryUrl(base + '/System/Info/Public');
        if (res.status === 404) res = await tryUrl(base + '/emby/Users/Public');
        clearTimeout(tmr);
        const ms = Date.now() - start;
        // 与上游一致：401/403 视为 "服务器在线但需要鉴权"，仍记 ok。
        const ok = (res.status >= 200 && res.status < 400) || res.status === 401 || res.status === 403;
        return { prefix: route.prefix, ok, ms, status: res.status };
    } catch (e) {
        clearTimeout(tmr);
        return { prefix: route.prefix, ok: false, ms: Date.now() - start, status: 0 };
    }
}

export async function probeAll(env) {
    try {
        await ensureSchema(env);
        if (!env.DB) return;
        const now = Math.floor(Date.now() / 1000);
        const { results: routes } = await dbAll(env, `
            SELECT prefix, target, remark, public_alias, custom_headers,
                   show_on_status, media_counts_auto_auth, emby_auth_cache
              FROM routes WHERE show_on_status = 1
        `);
        if (!routes || !routes.length) return;
        const probes = await Promise.all(routes.map(r => probeOne(r)));
        const insertStmts = probes.map(p =>
            env.DB.prepare(`INSERT OR REPLACE INTO emby_probes(prefix, ts, ok, ms, status) VALUES(?,?,?,?,?)`)
                .bind(p.prefix, now, p.ok ? 1 : 0, p.ms | 0, p.status | 0));
        if (insertStmts.length) await env.DB.batch(insertStmts);
        await runAlertFSM(env, routes, probes, now);
        await maybeRollupHourly(env, now);
    } catch (e) {
        console.log('probeAll error:', e.message);
    }
}

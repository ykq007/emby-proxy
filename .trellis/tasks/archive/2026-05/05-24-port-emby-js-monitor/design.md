# Design — Port emby-js monitor features

## 1. Architecture

Single Cloudflare Worker (`worker.js`), single D1 binding `env.DB`. No new bindings beyond existing `env.ADMIN_TOKEN`, `env.TG_BOT_TOKEN`, `env.TG_CHAT_ID`, `env.DB`. Three new logical surfaces:

```
+----------------------- Worker (single fetch handler) ------------------------+
|                                                                              |
|   /api/routes (existing)        /status              /public/<token>         |
|   /api/share/* (new)            /card/<token>.svg                            |
|         |                              |                                     |
|         v                              v                                     |
|   routes table         emby_probes (24h raw)                                 |
|   + show_on_status     emby_probe_hourly (7d roll-up)                        |
|   + media_counts_*     emby_probe_state (per-route alert FSM)                |
|   + emby_auth_cache    emby_media_counts (daily snapshots)                   |
|   + public_alias       emby_public_share (token rotation)                    |
|                                                                              |
|   scheduled(event) discriminates by event.cron:                              |
|     "* * * * *"   → probeAll() + maybeRollupHourly() + maybeAlertOutages()   |
|     "0 0 * * *"   → sendTgStats(env, env.TG_CHAT_ID)  [existing, untouched]  |
|                                                                              |
|   Proxy hot path (existing prefix routing):                                  |
|     after route lookup, if route.media_counts_auto_auth=1:                   |
|       sync-extract token from 5 header sources                               |
|       if changed: ctx.waitUntil(persistEncryptedToken(...))                  |
|     forward as before                                                        |
+------------------------------------------------------------------------------+
```

## 2. D1 Schema

All additions guarded by `try { ALTER … } catch {}` or `CREATE TABLE IF NOT EXISTS`. Reuses column/table names from the reverted attempt so a post-revert-dirty D1 needs no manual cleanup.

### 2.1 routes (additive columns)
```sql
ALTER TABLE routes ADD COLUMN show_on_status         INTEGER DEFAULT 0;
ALTER TABLE routes ADD COLUMN public_alias           TEXT    DEFAULT '';
ALTER TABLE routes ADD COLUMN media_counts_auto_auth INTEGER DEFAULT 0;  -- new vs reverted attempt
ALTER TABLE routes ADD COLUMN emby_auth_cache        TEXT    DEFAULT '';  -- now stores AES-GCM b64
ALTER TABLE routes ADD COLUMN emby_auth_seen_at      INTEGER DEFAULT 0;   -- new
ALTER TABLE routes ADD COLUMN emby_auth_used_at      INTEGER DEFAULT 0;   -- new
```

### 2.2 emby_probes (raw, 24h retention)
```sql
CREATE TABLE IF NOT EXISTS emby_probes (
  prefix     TEXT NOT NULL,
  ts         INTEGER NOT NULL,         -- unix seconds
  ok         INTEGER NOT NULL,         -- 0/1
  ms         INTEGER NOT NULL,         -- latency
  status     INTEGER DEFAULT 0,        -- HTTP status or 0 on network error
  PRIMARY KEY (prefix, ts)
);
CREATE INDEX IF NOT EXISTS idx_emby_probes_prefix_ts ON emby_probes(prefix, ts);
```

### 2.3 emby_probe_hourly (7d retention)
```sql
CREATE TABLE IF NOT EXISTS emby_probe_hourly (
  prefix     TEXT NOT NULL,
  hour_ts    INTEGER NOT NULL,         -- unix seconds aligned to hour boundary
  ok_count   INTEGER NOT NULL,
  fail_count INTEGER NOT NULL,
  avg_ms     INTEGER NOT NULL,
  p95_ms     INTEGER NOT NULL,
  PRIMARY KEY (prefix, hour_ts)
);
```

### 2.4 emby_probe_state (alert FSM per route)
```sql
CREATE TABLE IF NOT EXISTS emby_probe_state (
  prefix         TEXT PRIMARY KEY,
  first_fail_at  INTEGER DEFAULT 0,
  last_alert_at  INTEGER DEFAULT 0,
  alert_kind     TEXT DEFAULT 'none'   -- 'none' | 'offline' | 'recovered'
);
```

### 2.5 emby_media_counts (daily snapshots)
```sql
CREATE TABLE IF NOT EXISTS emby_media_counts (
  prefix    TEXT NOT NULL,
  day       TEXT NOT NULL,             -- 'YYYY-MM-DD' in UTC+8 (matches existing visitor_logs convention)
  movies    INTEGER DEFAULT 0,
  series    INTEGER DEFAULT 0,
  episodes  INTEGER DEFAULT 0,
  PRIMARY KEY (prefix, day)
);
```

### 2.6 emby_public_share (token store)
```sql
CREATE TABLE IF NOT EXISTS emby_public_share (
  token       TEXT PRIMARY KEY,
  scope       TEXT NOT NULL,           -- 'dashboard' | 'card'
  prefix      TEXT DEFAULT '',         -- only for scope='card'
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emby_public_share_scope_prefix ON emby_public_share(scope, prefix);
```

## 3. Cron Discrimination

`wrangler.toml` / Cloudflare dashboard must have both crons:
```toml
[triggers]
crons = ["* * * * *", "0 0 * * *"]
```

`scheduled(event, env, ctx)`:
```js
async scheduled(event, env, ctx) {
  await ensureSchema(env);
  if (event.cron === "0 0 * * *") {
    if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
      ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));   // existing
    }
    return;
  }
  // "* * * * *"
  ctx.waitUntil(probeAll(env));                          // R1
  // probeAll() internally:
  //   - probes opted-in routes in parallel
  //   - writes raw rows
  //   - once-per-hour: rolls up + prunes (gated via kv_config 'last_rollup_ts')
  //   - once-per-local-day: fetches /Items/Counts for opted-in routes with cached tokens
  //   - runs alert FSM and sends TG outage/recovery
}
```

## 4. Probe Worker (probeAll)

```js
async function probeAll(env) {
  const now = Math.floor(Date.now() / 1000);
  const { results: routes } = await env.DB.prepare(`
    SELECT prefix, target, custom_headers, show_on_status,
           media_counts_auto_auth, emby_auth_cache, public_alias
      FROM routes WHERE show_on_status = 1
  `).all();
  if (!routes?.length) return;

  // 1. parallel probe — bounded concurrency (Promise.all is fine for ~tens of routes)
  const probes = await Promise.all(routes.map(r => probeOne(r, env)));

  // 2. batched D1 insert
  const stmts = probes.map(p =>
    env.DB.prepare(`INSERT OR REPLACE INTO emby_probes (prefix, ts, ok, ms, status) VALUES (?, ?, ?, ?, ?)`)
          .bind(p.prefix, now, p.ok ? 1 : 0, p.ms, p.status));
  await env.DB.batch(stmts);

  // 3. alert FSM (TG)
  await runAlertFSM(env, routes, probes, now);

  // 4. once-per-hour roll-up + prune (gated)
  await maybeRollupHourly(env, now);

  // 5. once-per-day media counts for opted-in routes (gated by local-day boundary)
  await maybeFetchMediaCounts(env, routes, now);
}
```

### 4.1 probeOne contract
- Target: `<route.target>/emby/System/Info/Public` (no auth; reachable on any Emby).
- Fallback if 404: `<route.target>` root.
- Method: `GET`, `cf: { cacheTtl: 0 }`, 6 s timeout via `AbortController`.
- Forwards `route.custom_headers` (this fixes the "auth required behind WAF" case the reverted attempt added at a46d290).
- Output: `{ prefix, ok: boolean, ms: int, status: int }`.

### 4.2 Hourly roll-up gate
- Read `kv_config['last_rollup_ts']`.
- If `floor(now/3600) > floor(last/3600)`: roll up the most recent **closed** hour (i.e. `hour_ts = floor(now/3600)*3600 - 3600`), insert/replace into `emby_probe_hourly`, then delete `emby_probes` rows older than `now - 86400` and `emby_probe_hourly` rows older than `now - 7*86400`, then write `last_rollup_ts = now`.

### 4.3 Media counts gate
- Read `kv_config['last_media_day']` (local-day, UTC+8, `YYYY-MM-DD`).
- Compute `today = nowLocalDay()`.
- If `today !== last_media_day` and the current minute is the *first* minute of the day (so we only try once near 00:00 local), fetch counts for opted-in routes that have a non-empty `emby_auth_cache`. Persist into `emby_media_counts`, then set `last_media_day = today`.
- On 401/403: clear `emby_auth_cache`, leave snapshot unwritten, continue.

## 5. Alert FSM

For each probe in this minute's batch:
```
state in emby_probe_state[prefix]:
  alert_kind = 'none' | 'offline' | 'recovered'

probe.ok=true:
  if alert_kind == 'offline':
    send TG recovery (route.remark or prefix, downtime = now - first_fail_at)
    set alert_kind='recovered', last_alert_at=now, first_fail_at=0
  else:
    set alert_kind='none', first_fail_at=0  (idempotent)

probe.ok=false:
  if first_fail_at == 0:
    set first_fail_at=now
  if alert_kind != 'offline' and (now - first_fail_at) >= 300:
    send TG offline alert
    set alert_kind='offline', last_alert_at=now
```

All FSM updates batched into a single `env.DB.batch([...])`. TG sends are `ctx.waitUntil(...)`-wrapped fire-and-forget so a slow Telegram API can't push us past the 30 s cron limit.

## 6. Token Harvest Path

### 6.1 Hot-path extractor (sync)
```js
function extractEmbyToken(request) {
  const h = request.headers;
  let t = h.get('X-Emby-Token') || h.get('X-MediaBrowser-Token');
  if (t) return t.trim();
  const ea = h.get('X-Emby-Authorization');
  if (ea) {
    const m = /Token="?([^",]+)"?/i.exec(ea);
    if (m) return m[1].trim();
  }
  const auth = h.get('Authorization');
  if (auth) {
    const m = /MediaBrowser[^,]*Token="?([^",]+)"?/i.exec(auth);
    if (m) return m[1].trim();
    if (/^[A-Za-z0-9_\-]{16,}$/.test(auth)) return auth.trim();
  }
  const u = new URL(request.url);
  const q = u.searchParams.get('api_key');
  if (q) return q.trim();
  return null;
}
```

Pure string ops. No await, no allocations beyond the one URL parse already on the proxy hot path. Call site: right after the route is matched and *before* the upstream fetch, gated by `route.media_counts_auto_auth === 1`.

### 6.2 Persistence (off hot path)
Worker-memory `Map<prefix, { token, writtenAt }>`. If extracted token differs from memory, or `now - writtenAt > 600 s`, schedule:
```js
ctx.waitUntil(persistHarvestedToken(env, prefix, token, now));
```
`persistHarvestedToken` encrypts (§ 6.3) and writes to `routes.emby_auth_cache` + `emby_auth_seen_at = now`.

### 6.3 AES-GCM encryption
```js
async function tokenKey(env, prefix) {
  const ikm = new TextEncoder().encode(env.ADMIN_TOKEN);
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  return await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256',
      salt: new TextEncoder().encode(prefix),
      info: new TextEncoder().encode('emby-proxy:harvested-token') },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  );
}
```
Ciphertext format stored in `emby_auth_cache`: `b64(iv:12) + '.' + b64(ciphertext||tag)`.
Decrypt failure (e.g. operator rotated ADMIN_TOKEN) → clear cache, treat as no token.

### 6.4 Manual override precedence
At `/Items/Counts` call time:
```
if route.custom_headers includes X-Emby-Token: use that
else if route.emby_auth_cache: decrypt and use
else: skip counts fetch
```

### 6.5 Idle expiry
During hourly roll-up: any route where `emby_auth_used_at > 0 && now - emby_auth_used_at > 7 * 86400 && now - emby_auth_seen_at > 7 * 86400`, clear `emby_auth_cache`.

## 7. Public Share

### 7.1 Token generation
```js
function newShareToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');  // 48-char hex
}
```

### 7.2 Issuing (admin)
- `POST /api/share/dashboard` (admin auth) — atomically: `DELETE FROM emby_public_share WHERE scope='dashboard'; INSERT … VALUES(token, 'dashboard', '', now+3600, now);` via `env.DB.batch([...])`. Returns `{ url: 'https://<host>/public/<token>', expires_at }`.
- `POST /api/share/card?prefix=<p>` — same pattern, scoped to `prefix`. Returns `{ url: 'https://<host>/card/<token>.svg', expires_at }`.

### 7.3 Resolving (public)
- `GET /public/<token>`:
  - `SELECT scope, expires_at FROM emby_public_share WHERE token=? AND scope='dashboard' AND expires_at > unixepoch()`
  - Hit → render dashboard HTML restricted to opted-in routes. Strip: route.prefix, public_alias (falling back to remark), counts (if any), uptime, latency.
  - Miss → 410.
- `GET /card/<token>.svg`:
  - `SELECT prefix, expires_at FROM emby_public_share WHERE token=? AND scope='card' AND expires_at > unixepoch()`
  - Hit → render SVG. `Content-Type: image/svg+xml; Cache-Control: public, max-age=60`.
  - Miss → 410 (HTML message). Choice: not 404 because we want to communicate "this share expired" distinctly.

### 7.4 Data exposed via public surfaces (allowlist, not blocklist)
The public renderer reads only:
- `routes.prefix`, `routes.public_alias`, `routes.remark`, `routes.icon` (icon for visual identification only; route.target is **never** exposed).
- `emby_probe_hourly`, `emby_probes` aggregates only — never individual probe rows beyond the last-60 strip.
- `emby_media_counts` for the last 2 days only.

`/api/share/*`, `routes.target`, `routes.custom_headers`, `routes.emby_auth_cache`, `kv_config`, DNS, optimized-domains, visitor logs are **never** dereferenced in the public render code path. Code-review gate.

## 8. UI surfaces

### 8.1 `/status` (public)
- Aurora-style consistent with existing admin pages (reuse `CSS_COMMON`).
- Top: aggregate strip (total/online/offline). 24h vs 7d tab toggle for the per-card uptime %.
- Cards: 1 per opted-in route, sorted by `sort_order`. Each card: icon, name (`public_alias || remark || prefix`), status dot, current latency, 24h%, 7d%, last-60 strip, optional movies/series/episodes + day delta.
- No nav to admin. No login form. Anonymous-cacheable HTML (`Cache-Control: public, max-age=10`).

### 8.2 Admin additions
- Per-route row gets two new toggle pills:
  - **Show on Status** (`show_on_status`).
  - **Auto-auth media counts** (`media_counts_auto_auth`). Disabled toggle unless show_on_status is on.
- Per-route action area gets: "Share card" button (issues token, copies URL to clipboard), "Revoke auth" button (clears `emby_auth_cache`).
- Topbar gets a new pill linking to `/status`.
- Sidebar gets a new nav item "节点状态" under 反代核心 that opens `/status` in a new tab.

### 8.3 Public alias UX
- Per-route "Show on Status" pill opens a small inline editor for `public_alias` (defaults to `remark`). This is the only name shown publicly. `route.prefix` is **not** rendered on public pages.

## 9. Compatibility & Migration

- `ensureSchema` is the only migration surface. Idempotent regardless of starting state.
- Pre-existing `show_on_status=1` rows (from the reverted attempt) will light up immediately on first deploy. Acceptable since those were the operator's earlier intent. Communicated in PR description.
- Pre-existing `emby_auth_cache` values (from prior attempt's PLAINTEXT scheme): we treat any value that doesn't match the new `b64(iv).b64(ct)` format as invalid and clear it on first use. Self-heal applies.
- No new env var required.

## 10. Operational notes

- Cron cost: 1/min × ~$0.50/M-invocations ≈ trivial on Workers Paid. D1 writes: ~N_routes/min raw inserts + once/hour roll-up + once/day media + ~N_routes/hour alert FSM. For 10 routes: ~864 raw + 240 rollup + 240 FSM + 10 daily-count rows per day. Well within free-tier D1 daily write budget (100k/day).
- Rollback: drop the new tables + the 5 new columns (a `migrations/drop_emby_monitor.sql` will ship with the change). Reverting the worker.js commit alone is safe; the schema additions are tolerated by the prior worker code because all new columns have defaults.
- Probe failure modes: upstream is slow → `AbortController` cuts at 6 s → recorded as fail with `status=0, ms=6000`. Telegram outage debounce of 5 min absorbs transient flaps.

## 11. Risks & Open Trade-offs

| Risk | Mitigation |
|---|---|
| Hot-path harvest adds latency | Pure sync string ops, gated by per-route opt-in default OFF, ctx.waitUntil writes. Acceptance criteria requires <0.5 ms p50 dev measurement. |
| Tokens at rest leak via D1 dump | AES-GCM at rest, HKDF-derived from ADMIN_TOKEN. ADMIN_TOKEN rotation invalidates all and self-heals. |
| Cron 1-min cost / D1 writes | Roll-up + 24h prune keeps `emby_probes` bounded. Closed-form daily write budget calculated above. |
| Pre-existing `show_on_status=1` lights up on deploy | Acceptable — those routes were already opted in. Operator can toggle off via new admin pill. PR description calls this out. |
| Prior plaintext `emby_auth_cache` blobs | Treat as invalid format → clear → re-harvest. No data loss because tokens are recoverable from the next proxied request. |
| Public alias not configured | Falls back to `remark`, then to `prefix`. Worst case the prefix leaks publicly; operator should set `public_alias` for routes opted into status. UI nudges this on first opt-in. |

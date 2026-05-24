# Design — public /status page (jypost integration)

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker (worker.js)                │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ scheduled()  │───▶│ probeAll()   │───▶│  D1 (env.DB) │       │
│  │ cron: 1 min  │    │ fan-out fetch│    │ emby_probes  │       │
│  └──────────────┘    └──────────────┘    │ emby_probe_  │       │
│                                          │   hourly     │       │
│  ┌──────────────┐    ┌──────────────┐    │ routes (ext) │       │
│  │ fetch()      │    │ /status      │◀───┤              │       │
│  │ /status      │───▶│ renderer     │    └──────────────┘       │
│  │ (no auth)    │    │ (HTML+CSS)   │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────┐       │
│  │ fetch()      │───▶│ /api/routes (existing, extended) │       │
│  │ admin UI     │    │  + show_on_status, public_alias  │       │
│  └──────────────┘    └──────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────────┐
                │  Upstream Emby/Jellyfin      │
                │   GET /System/Info           │
                │   GET /Items/Counts          │
                └──────────────────────────────┘
```

## Boundaries

- **No external monitor agent.** The Worker's own `scheduled` handler replaces `monitor.py`.
- **No new auth surface.** `/status` bypasses the existing login; admin endpoints stay behind it.
- **D1 is the single source of truth.** No KV, no Durable Objects (avoid new bindings).
- **No JS framework.** Page is a server-rendered HTML string from a JS template literal, same pattern as the existing `HTML_UI` / `LOGIN_UI` blocks.

## Data model

### Existing — `routes` table (add 2 columns via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`)

```sql
ALTER TABLE routes ADD COLUMN show_on_status INTEGER DEFAULT 0;
ALTER TABLE routes ADD COLUMN public_alias TEXT DEFAULT '';
```

SQLite's `ADD COLUMN` is non-destructive and idempotent under `IF NOT EXISTS` guard (or we wrap in try/catch — D1 may not support IF NOT EXISTS on ADD COLUMN; see Implementation note 1).

### New — `emby_probes` (raw probe samples, 48 h retention)

```sql
CREATE TABLE IF NOT EXISTS emby_probes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix        TEXT NOT NULL,
    ts            DATETIME DEFAULT CURRENT_TIMESTAMP,
    ok            INTEGER NOT NULL,               -- 1 = reachable, 0 = failed
    response_ms   INTEGER,                         -- null when ok=0
    server_name   TEXT DEFAULT '',                -- from /System/Info → ServerName
    item_counts   TEXT DEFAULT '',                -- raw JSON from /Items/Counts
    error         TEXT DEFAULT ''                 -- when ok=0
);
CREATE INDEX IF NOT EXISTS idx_emby_probes_prefix_ts ON emby_probes(prefix, ts);
```

### New — `emby_probe_hourly` (rollups, 30-day retention, seeds future history page)

```sql
CREATE TABLE IF NOT EXISTS emby_probe_hourly (
    prefix        TEXT NOT NULL,
    hour          TEXT NOT NULL,                  -- 'YYYY-MM-DD HH:00'
    probe_count   INTEGER NOT NULL,
    ok_count      INTEGER NOT NULL,
    avg_ms        INTEGER,
    PRIMARY KEY (prefix, hour)
);
```

## Contracts

### Internal: `probeRoute(env, route) → ProbeResult`

```ts
type ProbeResult = {
    ok: boolean;
    response_ms: number | null;
    server_name: string;
    item_counts: Record<string, number> | null;  // { MovieCount, SeriesCount, EpisodeCount, ... }
    error: string;
};
```

- Resolves the upstream URL from `route.target`.
- Fetches `<target>/System/Info` with 8 s `AbortSignal.timeout`.
- On success, also fetches `<target>/Items/Counts` (best-effort; if that fails, still record ok=true with `item_counts=null`).
- Never throws; failures become `{ ok: false, error: msg }`.

### HTTP: `GET /status`

- Public, no auth.
- Reads latest probe row per opted-in prefix from `emby_probes` (single SQL — see Implementation note 2).
- Computes 24 h uptime % and 24 h avg ms in the same query (or one extra query per prefix; benchmark which is cheaper for D1).
- Returns HTML string built from a `STATUS_UI` template literal sibling to `HTML_UI` / `LOGIN_UI`.
- Sets `Cache-Control: public, max-age=15` so a refresh storm is absorbed by the CF edge cache.

### HTTP: `GET /api/routes` (existing, extended)

Add `show_on_status` and `public_alias` to the JSON response.

### HTTP: `PATCH /api/routes/:prefix` (existing, extended) or new dedicated endpoint

Accept `{ show_on_status?: 0|1, public_alias?: string }`. Validate `public_alias` length ≤ 64.

### Worker: `scheduled(event, env, ctx)`

Triggered by `* * * * *` cron.

```
1. await ensureSchema(env)             // includes the new tables
2. routes = SELECT prefix, target, public_alias FROM routes WHERE show_on_status = 1
3. results = await Promise.allSettled(routes.map(r => probeRoute(env, r)))
4. INSERT all results into emby_probes (batch)
5. For each (prefix, current-hour), upsert into emby_probe_hourly
6. DELETE FROM emby_probes WHERE ts < datetime('now', '-48 hours')
7. DELETE FROM emby_probe_hourly WHERE hour < datetime('now', '-30 days')
```

`Promise.allSettled` ensures one slow upstream doesn't sink the whole tick. Total cron time ≤ 8 s timeout × parallel = bounded by upstream count and Workers' 30 s CPU budget; for >20 routes, chunk.

## Data flow (per cron tick)

```
cron → probeRoute(r1) ┐
       probeRoute(r2) ├─ Promise.allSettled → INSERT batch → upsert hourly → prune
       probeRoute(rN) ┘
```

## Data flow (per /status request)

```
GET /status → SELECT latest probe per prefix (window function or per-prefix query)
            → SELECT 24h aggregate per prefix
            → render STATUS_UI(rows) → HTML response (cached 15s at edge)
```

## Latest-row query (D1 / SQLite)

D1 supports SQLite window functions. Use:

```sql
WITH latest AS (
    SELECT prefix, ok, response_ms, server_name, item_counts, ts,
           ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY ts DESC) AS rn
    FROM emby_probes
)
SELECT l.*, r.public_alias, r.target,
       (SELECT 100.0 * SUM(ok) / COUNT(*) FROM emby_probes
        WHERE prefix = l.prefix AND ts >= datetime('now', '-24 hours')) AS uptime_pct,
       (SELECT AVG(response_ms) FROM emby_probes
        WHERE prefix = l.prefix AND ts >= datetime('now', '-24 hours') AND ok = 1) AS avg_ms_24h
FROM latest l
JOIN routes r ON r.prefix = l.prefix
WHERE l.rn = 1 AND r.show_on_status = 1;
```

If D1's optimizer is poor on this shape, fall back to one query per prefix in JS — acceptable for the expected route counts (<50).

## UI

### Public page (`STATUS_UI` template literal)

Layout:

```
┌─────────────────────────────────────────────────┐
│  Header: title · current time · refresh button  │
│  Aggregates: 3/4 online · 12k movies · ...      │
├─────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Server A   │ │ Server B   │ │ Server C   │   │
│  │ ● Online   │ │ ● Online   │ │ ○ Offline  │   │
│  │ 142 ms     │ │  89 ms     │ │   —        │   │
│  │ 99.8% 24h  │ │ 100% 24h   │ │  62% 24h   │   │
│  │ Movies 4.2k│ │ Movies 1.1k│ │   —        │   │
│  │ ...        │ │ ...        │ │            │   │
│  └────────────┘ └────────────┘ └────────────┘   │
└─────────────────────────────────────────────────┘
```

Uses the existing iOS-native v5 tokens. Reuse `--card`, `--text`, `--text-sec`, `--ok`, `--warn`, `--err`, `--radius-ios`, `--space-*`. Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`.

Status badge color: `ok` (online + uptime > 99 %), `warn` (online + uptime 90–99 %), `err` (offline or uptime < 90 %).

JS: `setInterval(() => location.reload(), 30000)` + a button that calls `location.reload()`. No fetch needed — full page reload is fine; edge cache keeps it cheap.

### Admin extension

In the routes management table (already present in `HTML_UI`):

- New column header "Status page" with a checkbox per row. Wires to `PATCH /api/routes/:prefix { show_on_status }`.
- New small text input "Alias" in the row's edit drawer (or as an inline column).
- Add a single new entry to the topbar/nav: an "↗ Public status page" link to `/status` opening in a new tab.

## Compatibility / migration

- `ALTER TABLE routes` is additive with defaults; pre-existing rows get `show_on_status=0`, so behavior pre-deploy = nothing visible publicly. Safe rollout.
- Cron registration in `wrangler.toml` is new. **Action item:** confirm the project has a `wrangler.toml` checked in or document the user must add `[triggers] crons = ["* * * * *"]`.
- If `env.DB` is unbound, the new code paths short-circuit (mirror the existing `if (!env.DB) return ...` pattern at line ~6540).

## Trade-offs considered

| Option | Chosen? | Why / why not |
|---|---|---|
| Probe on /status request (no cron) | No | Slow page; no 24 h uptime; ddos amplifier |
| Probe via cron, store in KV | No | KV writes are slow + eventually consistent; D1 already bound |
| Probe via cron, store in D1 | **Yes** | Already wired; SQLite handles window functions for latest-per-prefix |
| Separate `emby_servers` table | No | Duplicates `routes`; user explicitly rejected jypost-style model |
| Token-gated /status | No | User chose fully public |
| Live SSE updates | No | Worker constraint + complexity; 30 s reload matches jypost UX |
| Charts (sparklines) on cards | Not v1 | Belongs to follow-up history page |

## Operational

- **Observability**: cron writes a single `console.log` per tick with `{ tickMs, probed, ok, failed }`. Inspectable via `wrangler tail`.
- **Failure modes**:
    - All probes fail → cards go offline → user sees the truth. Worker keeps running.
    - D1 down → cron silently no-ops; /status returns "monitoring not yet configured".
    - Worker bundle size: STATUS_UI adds an estimated ~6–10 KB to the bundle. Current `worker.js` is 420 KB — well within Cloudflare Worker's 1 MB compressed limit.
- **Rollback**: remove `[triggers]` from wrangler.toml + redeploy. Data persists but cron stops. `/status` can be left in place or removed in a second redeploy.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| User hasn't checked in `wrangler.toml` | Medium | Implement plan calls this out as a precondition |
| Some routes are not Emby (other proxies, static sites) | High | `/System/Info` failure on a non-Emby returns ok=0 — user sees that and disables the toggle for that route. Not catastrophic |
| `/Items/Counts` requires an API token on locked-down Emby | High | Probe sends no auth; if it 401s, record ok=true with `item_counts=null` (server is up, just counts unavailable). UI hides counts gracefully |
| 30+ routes hit the 30 s worker CPU cap | Low | Chunked `Promise.allSettled` (groups of 10). Add only if a user reports it |
| D1 write rate at 60 s × 50 servers = 72k rows/day | Low | Well under D1's 100k/day free tier; 5M/day paid |

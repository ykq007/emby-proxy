# Port emby-js monitor features into worker

## Goal

Port four feature groups from [pototazhang/emby-js](https://github.com/pototazhang/emby-js) (Emby Cluster Monitor, KV-based) into the existing emby-proxy Cloudflare Worker (`worker.js`, ~7400 lines, D1-backed), giving operators a public status dashboard, smart Telegram outage alerts, daily media library snapshots, and time-limited share links — all sharing the existing `routes` table as the source of nodes rather than a parallel KV node list. Operator must never need to type Emby credentials into the worker admin UI; media-counts auth is acquired by passive harvest from proxied authenticated traffic, with hardening (per-route opt-in, at-rest encryption, idle expiry, transparent revoke).

## User Value

- One Worker, one config surface: monitored nodes are the same `routes` rows already proxied, not a separate emby-js node list.
- Public `/status` page so end users can self-check outages without operator help.
- Telegram alerts that distinguish real outages (≥5 min) from transient blips, plus recovery notify.
- Daily media-library deltas to spot library shrinkage / drift — **zero operator credential entry required**.
- Public share + per-server SVG cards for embeds / chat without exposing admin.

## Confirmed Facts (from repo inspection)

- Storage: **D1 only**. Tables in `ensureSchema()` (worker.js:6218): `routes`, `request_stats`, `visitor_logs`, `kv_config`, `optimized_domains`, `dns_config`. No KV namespace bound.
- `routes` columns: `prefix, target, mode, remark, last_play, icon, cache_img, sort_order, custom_headers, backend_url`.
- Cron exists: `scheduled()` (worker.js:6360) currently calls `sendTgStats(env, env.TG_CHAT_ID)` daily. The reverted attempt discriminated by `event.cron` — same approach required.
- Telegram already wired: `TG_BOT_TOKEN`, `TG_CHAT_ID`, `sendTgStats()` (worker.js:6017), generic send at worker.js:6127.
- Reverted prior attempt (commits 498dbd9 → f6db276, reverted in fab391f..10d5903): added `emby_probes`, `emby_probe_hourly`, route columns `show_on_status`, `public_alias`, `emby_auth_cache`. Last layer harvested Emby bearer tokens out of the proxy hot path. **`migrations/drop_status_feature.sql` is untracked**, so remote D1 most likely still carries those columns/tables.

## Locked Decisions

- **D1 Source-of-Truth**: `routes` rows are the monitored-node list. No parallel emby-js–style node table.
- **Probe cadence**: **1 min**, with two-table strategy — raw `emby_probes` (24 h retention) + hourly roll-up `emby_probe_hourly` (7 d retention).
- **Media-counts auth path**: **Passive token harvest (hardened)** — see Detailed Requirements R3.
- **Schema migration**: **Reuse + tolerate**. `ensureSchema` is idempotent against both fresh and post-revert-dirty remote D1. No separate drop migration. Pre-existing `show_on_status=1` rows auto-appear on `/status` after deploy.
- **Public share TTL**: 1 h default (matches upstream). Operator regenerates as needed.
- **/status admin discoverability**: Topbar shortcut + sidebar nav entry.
- **Token encryption key**: **HKDF-derived from `env.ADMIN_TOKEN`**. Rotating `ADMIN_TOKEN` invalidates all harvested tokens; re-harvest auto-recovers.

## Detailed Requirements

### R1 — Probing + 7-day history dashboard
- 1-min cron probes each opted-in route's upstream Emby root and `/System/Info/Public`, records `ok|fail`, latency (ms), HTTP status, and timestamp into `emby_probes`.
- Once per hour (gated by `kv_config` watermark), the cron rolls up the prior hour's rows into `emby_probe_hourly` (`ok_count`, `fail_count`, `avg_ms`, `p95_ms`) and deletes raw rows older than 24 h. Hourly roll-up older than 7 d is also pruned.
- Public dashboard `/status` (no admin auth) renders:
  - Aggregate strip: total / online / offline. **No media-count aggregate** (redundant per f6db276).
  - Per-route cards: name (route `remark` falling back to `prefix`), current status, 24h availability %, 7d availability %, latest latency, last-60 raw probes strip (sparkline-style), optional media counts + day delta.
- Admin UI: per-route opt-in pill ("show on status"). Default OFF. Topbar shortcut to `/status` + sidebar nav entry under 反代核心.
- Per-route opt-in is the *only* gate: opt-out routes are not probed, not stored, not rendered, and not harvested for tokens.

### R2 — Telegram notify with debounced outage + recovery
- Per-route state in `emby_probes`-aggregate scan (or a small `emby_probe_state` table): `first_fail_at`, `last_alert_at`, `alert_kind ∈ {none, offline, recovered}`.
- Offline alert fires when a route has been continuously failing for ≥5 min AND no prior offline alert has fired for this outage.
- Recovery alert fires on the first `ok` probe after an offline alert was sent for the current outage. Recovery clears alert state.
- Send via existing TG helper (`TG_BOT_TOKEN`, `TG_CHAT_ID`). Page-saved overrides env, matching upstream.
- Discriminated by `event.cron` so the daily `sendTgStats` cron is untouched.

### R3 — Media-library counts (passive token harvest, hardened)
- Per-route opt-in `media_counts_auto_auth` (default OFF). Without opt-in: no harvest, no `/Items/Counts` call, blank counts on the card.
- **Hot-path harvest**: when proxying a request through an opted-in route, sync-extract a bearer token from 5 sources in order: `X-Emby-Token`, `X-MediaBrowser-Token`, `X-Emby-Authorization` (parse `Token="..."`), `Authorization` (parse `MediaBrowser Token="..."` then bare value), `?api_key=` query. First hit wins. Sync string ops only; no await before forwarding the request.
- **AES-GCM encrypt-at-rest**: key derived once per request via `HKDF-SHA256(env.ADMIN_TOKEN, "emby-proxy:harvested-token", salt=route.prefix)`. Persisted to `routes.emby_auth_cache` as `b64(iv) || b64(ciphertext+tag)`. D1 write is `ctx.waitUntil(...)` with a worker-memory debounce so each token is only written when changed or stale (>10 min since last write).
- **First probe after 00:00 local (worker local = UTC+8 via `'+8 hours'` modifier matching existing stats code) per natural day**: if opted-in and a token exists, call `GET /emby/Items/Counts?Recursive=true&IncludeItemTypes=Movie,Series,Episode` with `X-Emby-Token: <decrypted>`. Store `{movies, series, episodes}` in a new `emby_media_counts` table keyed by `(prefix, day)`. Compute delta vs `(prefix, day-1)` snapshot at render time.
- **Self-heal**: 401/403 from `/Items/Counts` clears `routes.emby_auth_cache` and the worker-memory map. Next proxied request re-populates.
- **Idle expiry**: a token unused by any probe for 7 days is dropped during the hourly roll-up sweep.
- **Manual override wins**: if `route.custom_headers` contains `X-Emby-Token: ...`, that value is preferred over the harvested cache for `/Items/Counts` (kept from prior attempt).
- **Admin transparency**: per-route admin row shows "auth source: harvested / manual / none", "first seen", "last used by probe", and a **Revoke** button that clears D1 + worker-memory.

### R4 — Public share + SVG card
- New table `emby_public_share (token TEXT PRIMARY KEY, scope TEXT, prefix TEXT, expires_at INTEGER, created_at INTEGER)`. `scope ∈ {dashboard, card}`.
- `POST /api/share/dashboard` (admin) issues a new dashboard token (TTL 1 h). Issuing rotates: any prior `scope=dashboard` token is deleted in the same statement.
- `POST /api/share/card?prefix=<p>` (admin) issues a per-route card token (TTL 1 h, scope=card, prefix bound). Issuing rotates the prior token for that prefix.
- `GET /public/<token>` returns the dashboard for opted-in routes only. No admin nav, no Emby tokens, no `kv_config`, no `routes.emby_auth_cache`, no DNS settings, no operator IPs.
- `GET /card/<token>.svg` returns a route's SVG snapshot (status pill, name, 7d uptime %, latency). `Cache-Control: public, max-age=60`. Expired/unknown token → 410.

### R5 — Architectural reuse
- All node-state derives from `routes`. No second node list.
- New schema is additive: `try { ALTER TABLE routes ADD COLUMN ... } catch {}` for each new column. `CREATE TABLE IF NOT EXISTS` for new tables.
- `ensureSchema` must succeed cleanly on:
  - Fresh D1 (no orphan columns/tables).
  - Post-revert-dirty D1 (orphan `show_on_status`, `public_alias`, `emby_auth_cache`, `emby_probes`, `emby_probe_hourly` may already exist).
- Single-file `worker.js` deploy preserved; no new build step.

## Out of Scope

- Icon library import + search (emby-js feature).
- One-click GitHub self-update (`UPDATE_ENABLED` / `CF_API_TOKEN` path).
- Migrating to KV; running emby-js as a separate Worker.
- Touching reverse-proxy, DNS, optimized-domains, or speedtest features.
- Operator-typed Emby credentials path (explicitly excluded).
- Multi-tenant `/status` (single operator's routes only).

## Acceptance Criteria

- [ ] `ensureSchema` deploys cleanly on both a fresh D1 (no orphan columns) and a post-revert-dirty D1 (orphan columns + tables already present). Verified by running it twice locally on a clean DB and again on a DB with orphan columns pre-injected.
- [ ] `/status` reachable without admin auth. Aggregate strip shows total / online / offline. Cards render only for routes with `show_on_status=1`.
- [ ] Per-card shows: name, up/down dot, 24h availability %, 7d availability %, latest latency ms, last-60 raw probes strip. Media counts + delta render only when `media_counts_auto_auth=1` and a token has been harvested at least once.
- [ ] Probe cron at `* * * * *` runs alongside the existing daily `sendTgStats` cron without interference (discriminated by `event.cron`). Daily Telegram stats continues to be sent exactly once a day.
- [ ] Telegram outage debounce verified by tabletop / log replay: <5 min flap = 0 alerts; ≥5 min continuous fail = exactly 1 offline alert; first recovery = exactly 1 recovery alert; no recovery without prior offline.
- [ ] Media counts:
  - [ ] Blank on the card until first opted-in proxied request harvests a token.
  - [ ] Filled on the first probe of a new local-day (UTC+8) following harvest.
  - [ ] Day delta shows zero on day 1, computes real delta from day 2 onward.
  - [ ] 401/403 from `/Items/Counts` clears the cache; next proxied request re-populates.
- [ ] Harvested tokens stored AES-GCM-encrypted with HKDF-derived key. `wrangler d1 execute … "SELECT emby_auth_cache FROM routes"` does not return any plaintext token. Rotating `ADMIN_TOKEN` causes next probe to detect decrypt failure and clear the cache.
- [ ] `/public/<token>` valid until `expires_at`, renders the same cards as `/status` but with no admin nav, no creds, no DNS data. Expired/unknown returns 410. Issuing a new dashboard token invalidates the prior one.
- [ ] `/card/<token>.svg` returns a valid SVG with status, name, 7d uptime, latency. Cache-control 60s. Expired returns 410.
- [ ] Proxy hot path p50/p95 latency: no measurable regression with `media_counts_auto_auth` disabled on all routes; with it enabled on a route, harvest extractor adds <0.5 ms wall time at p50 (verified by adding `performance.now()` instrumentation during dev).
- [ ] Admin UI: per-route shows two pills — "show on status" and "auto-auth media counts" — plus revoke button + auth-source label.
- [ ] Single-file `worker.js` still deploys; no new build step, no new dependencies, no breaking changes to existing tables.

## Cross-References

- See `design.md` for technical architecture and contracts.
- See `implement.md` for ordered execution checklist and validation commands.

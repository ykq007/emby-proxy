# Harvest Emby auth tokens from proxied traffic for /status counts

## Goal

Make the `/status` page's media counts (电影 / 剧集 / 单集) populate without requiring the operator to have admin access on the upstream Emby — and without storing any passwords. Achieved by snooping the auth token from already-authenticated proxied requests and reusing it on the next probe.

## Why this design

- The user does NOT have admin access on the monitored Embys, so they cannot generate an API key.
- Storing an Emby username + password in D1 was rejected as too risky (D1 access = password leak; password can't be scoped/revoked without rotating).
- emby-proxy IS the reverse proxy in front of these Emby servers; every authenticated client request that flows through us already carries the user's bearer token. Harvesting it from that traffic costs us nothing and stores no new secret the user wasn't already trusting us with.

## Confirmed facts

- Predecessor commit `a46d290` already forwards `route.custom_headers` on probes. That handles the API-key case (header set manually). This task adds the auto-harvest case.
- Existing proxy hot path: `worker.js:7100-7400` handles route matching + upstream fetch. `matchedPrefix` is set by line ~7109.
- Existing D1 binding `env.DB`. Routes table has 11 columns; this task adds one.
- `ctx.waitUntil` is already used elsewhere in the proxy path for async stat writes (worker.js:~7159) — same pattern works for the token write.

## Requirements

### Functional
- **R1** When a request flows through the proxy and matches a route prefix, extract any of these auth tokens from the request:
  - Header `X-Emby-Token`
  - Header `X-MediaBrowser-Token`
  - Header `X-Emby-Authorization` (parse `Token="<value>"`)
  - Header `Authorization` (parse `MediaBrowser Token="<value>"`)
  - Query string `api_key` or `ApiKey`
- **R2** If a non-empty token is extracted AND it differs from the cached value, async-write it to `routes.emby_auth_cache` for that prefix. Must use `ctx.waitUntil`; must never block or fail the proxy response.
- **R3** Skip harvesting when the route has `show_on_status = 0` — don't store tokens for routes we're not going to probe.
- **R4** `probeRoute` uses `route.emby_auth_cache` to set `X-Emby-Token` on the `/Items/Counts` probe ONLY when no `X-Emby-Token` is already present in `route.custom_headers`. (manual setting wins.)
- **R5** If `/Items/Counts` returns 401 even with a cached token, the cache is stale. Clear it (`UPDATE routes SET emby_auth_cache='' WHERE prefix=?`) so we don't keep retrying with a dead token.

### Non-functional
- **R6** Proxy latency must not increase. Token extraction is a synchronous string read + regex; write is `ctx.waitUntil`. No new awaits in the proxy hot path.
- **R7** Token harvesting failure must NEVER 5xx the proxied request. All token logic wrapped in try/catch with silent failure (mirror existing `if (isNewPlaySession && ...) try { ... } catch (e) { }` pattern).
- **R8** Schema migration is additive: `ALTER TABLE routes ADD COLUMN emby_auth_cache TEXT DEFAULT ''`, wrapped in try/catch to be idempotent (matches existing pattern at worker.js:6979-6986).
- **R9** Token write is debounced: only `UPDATE` D1 if the extracted token actually differs from a per-worker in-memory cache of the last-written value for that prefix. Avoids one D1 write per proxied request.

## Acceptance criteria

- [ ] After deploy + one client connection through a route with `show_on_status=1`, `SELECT emby_auth_cache FROM routes WHERE prefix='<x>'` returns a non-empty string.
- [ ] On the next cron tick after R1 fires, `SELECT item_counts FROM emby_probes WHERE prefix='<x>' ORDER BY ts DESC LIMIT 1` returns a non-empty JSON with `MovieCount` / `SeriesCount` / `EpisodeCount`.
- [ ] `/status` shows the per-card library counts and the aggregate header strip.
- [ ] If the harvested token is revoked on the Emby side (logout / token deletion), the cached value clears within one cron tick (R5).
- [ ] If `custom_headers` already contains `X-Emby-Token: …`, the harvested cache is ignored on probes (manual setting wins; R4).
- [ ] Proxy p50 latency is unchanged before vs. after (sanity-check via `wrangler tail` log timings or eyeball; the harvest does <50 lines of sync work + 1 ctx.waitUntil).
- [ ] No code path can throw out of the proxy handler — token extraction is wrapped in try/catch.

## Out of scope

- Per-user analytics on the `/status` page ("which user's token are we using?"). The page stays anonymous-summary only.
- Auth flows for non-Emby/Jellyfin upstreams. If the route's target isn't Emby/Jellyfin, the harvested token is irrelevant; we still store it harmlessly.
- Token rotation alerts. If a cached token goes stale, we silently clear and wait for the next client connection.
- Encryption at rest. We rely on Cloudflare D1's at-rest encryption; no app-level crypto.
- Admin UI to inspect / clear the cached token. Can be added later if needed.

## Privacy / security note (must appear in implementation comments)

`routes.emby_auth_cache` stores a bearer token belonging to whichever Emby user most recently connected through that route. Anyone with read access to the D1 database can use this token to impersonate that user against the upstream Emby. This is the same risk profile as storing an API key, and strictly safer than storing a username + password. Operators uncomfortable with this should leave `show_on_status=0` for the affected route — harvesting is gated on that flag (R3).

## Open questions

None blocking. Ready for implementation review.

# Implementation Plan — Port emby-js monitor features

Execution is staged. Each stage must be self-contained: `worker.js` deploys cleanly after every stage, and `ensureSchema` stays idempotent. **No commits**. Final integration commit comes only after all stages and the validation checklist pass.

## Stage 0 — Pre-flight

- [ ] Re-read `worker.js:6218–6249` (`ensureSchema`) and `worker.js:6358+` (`export default`) to confirm injection points.
- [ ] Re-read `worker.js:6360–6400` (existing `scheduled`) and `worker.js:6017–6139` (existing `sendTgStats` + TG helper) to confirm reuse surface.
- [ ] Confirm `wrangler.toml` (or Cloudflare dashboard) cron triggers include both `* * * * *` and `0 0 * * *`. If only the daily exists, add the 1-min in the deploy step.
- [ ] Snapshot remote D1 schema: `wrangler d1 execute <DB> --remote --command "PRAGMA table_info(routes)"` and same for `emby_probes`, `emby_probe_hourly`. Confirm whether orphan columns/tables remain from the reverted attempt; record in task notes.
- [ ] Delete `migrations/drop_status_feature.sql` (untracked) — it's no longer the migration plan; design.md §9 supersedes.

## Stage 1 — Schema additions (idempotent)

- [ ] In `ensureSchema(env)`, after existing ALTERs, append the 6 new `routes` columns from design.md §2.1, each in its own `try { … } catch {}`.
- [ ] Add `CREATE TABLE IF NOT EXISTS` for `emby_probes`, `emby_probe_hourly`, `emby_probe_state`, `emby_media_counts`, `emby_public_share` (design.md §2.2–2.6).
- [ ] Add the two indexes (idx_emby_probes_prefix_ts, idx_emby_public_share_scope_prefix).
- [ ] **Validation**:
  - [ ] Deploy to a scratch D1 (local `wrangler d1 execute --local`). Run `ensureSchema` twice. Both succeed.
  - [ ] On a D1 manually pre-injected with the orphan reverted columns (`ALTER TABLE routes ADD COLUMN show_on_status INTEGER DEFAULT 0; CREATE TABLE emby_probes (…);`), run `ensureSchema`. Succeeds; data preserved.

## Stage 2 — Probe engine + cron discrimination

- [ ] Implement `probeOne(route, env)` → 6 s timeout, GET `<target>/emby/System/Info/Public`, fallback to `<target>`, forwards `custom_headers` (parses the JSON-or-`a:b\n…` formats already supported elsewhere in `worker.js`). Returns `{prefix, ok, ms, status}`.
- [ ] Implement `probeAll(env)` per design §4.
- [ ] Implement `maybeRollupHourly(env, now)` per design §4.2 (gated by `kv_config['last_rollup_ts']`).
- [ ] Modify `scheduled(event, env, ctx)` to discriminate by `event.cron`:
  - `"0 0 * * *"` → existing `sendTgStats(env, env.TG_CHAT_ID)` only.
  - `"* * * * *"` → `ctx.waitUntil(probeAll(env))`.
  - Other (including unset / missing event.cron in local dev): no-op.
- [ ] **Validation**:
  - [ ] Trigger probe locally via `wrangler dev --test-scheduled` and `curl 'http://127.0.0.1:8787/__scheduled?cron=*+*+*+*+*'`. Confirm rows appear in `emby_probes`.
  - [ ] Trigger daily cron locally with `?cron=0+0+*+*+*`. Confirm `sendTgStats` is called and `probeAll` is not.

## Stage 3 — Alert FSM + Telegram outage notify

- [ ] Implement `runAlertFSM(env, routes, probes, now)` per design §5. All FSM updates in a single `env.DB.batch([...])`.
- [ ] Wire into `probeAll` after the raw insert.
- [ ] Implement message templates (zh-CN, matching existing `sendTgStats` style). Offline: `[告警] <name> 已离线 <duration>`. Recovery: `[恢复] <name> 已恢复，本次离线 <duration>`.
- [ ] **Validation** (tabletop replay): write a one-off `node` harness that drives `runAlertFSM` with synthetic probes representing: <5 min flap, ≥5 min outage, recovery, repeated outages. Assert TG send is called the correct number of times. Harness lives in `.trellis/tasks/05-24-port-emby-js-monitor/research/alert-fsm-replay.mjs` and is not committed to the worker.

## Stage 4 — Token harvest + AES-GCM at-rest

- [ ] Implement `extractEmbyToken(request)` per design §6.1.
- [ ] Implement `tokenKey(env, prefix)` per design §6.3.
- [ ] Implement `persistHarvestedToken(env, prefix, token, now)` → encrypt → write `emby_auth_cache` + `emby_auth_seen_at`. Worker-memory map for debounce.
- [ ] Implement `readHarvestedToken(env, prefix, route)` → manual override (`custom_headers` X-Emby-Token) wins → else decrypt cache → updates `emby_auth_used_at` on use.
- [ ] **Wire into proxy hot path**: in the existing prefix-routed proxy block (find the spot after route lookup, before `fetch(upstream, …)`), add:
  ```js
  if (route.media_counts_auto_auth === 1) {
    const t = extractEmbyToken(request);
    if (t) {
      const last = HARVEST_MEM.get(route.prefix);
      if (!last || last.token !== t || now - last.writtenAt > 600) {
        HARVEST_MEM.set(route.prefix, { token: t, writtenAt: now });
        ctx.waitUntil(persistHarvestedToken(env, route.prefix, t, now));
      }
    }
  }
  ```
- [ ] **Validation**:
  - [ ] Local `curl` request with `X-Emby-Token: testtok123` through an opted-in route. Confirm `SELECT emby_auth_cache FROM routes WHERE prefix=?` returns a non-plaintext `b64.b64` blob. Confirm `'testtok123'` does **not** appear anywhere in the column.
  - [ ] Rotate `ADMIN_TOKEN` env, restart, probe. Confirm decrypt fails → cache cleared → next proxied request re-populates.
  - [ ] Local micro-bench: 1000 proxy requests through an opted-in route, p50/p95 wall time of `extractEmbyToken` via `performance.now()`. Confirm <0.5 ms p50.

## Stage 5 — Media counts daily fetch

- [ ] Implement `maybeFetchMediaCounts(env, routes, now)` per design §4.3.
- [ ] Implement `fetchItemCounts(target, token, customHeaders)` → GET `<target>/emby/Items/Counts?Recursive=true&IncludeItemTypes=Movie,Series,Episode`, parses `MovieCount`, `SeriesCount`, `EpisodeCount`. 6 s timeout, AbortController.
- [ ] On 401/403: clear `routes.emby_auth_cache`, log, return null. **Do not** mark probe as fail (counts and probe are independent signals).
- [ ] Persist via `INSERT OR REPLACE INTO emby_media_counts(prefix, day, movies, series, episodes) VALUES(...)`.
- [ ] **Validation**:
  - [ ] Mock Emby endpoint locally (or use a real test instance). Confirm first probe of a new local-day writes a row. Confirm subsequent same-day cron does not re-fetch.
  - [ ] Inject a 401 response. Confirm `emby_auth_cache` is cleared, no media row written, probe ok still recorded.

## Stage 6 — `/status` public dashboard

- [ ] Add route handler for `GET /status` in the main `fetch` switch. No auth required.
- [ ] Query: routes WHERE show_on_status=1 ORDER BY sort_order; per route, query 24h availability from `emby_probes`, 7d availability from `emby_probe_hourly`, latest probe row, last-60 raw rows, last 2 days from `emby_media_counts`.
- [ ] Render HTML inline (matching existing single-file `HTML_UI` pattern). Reuse `CSS_COMMON`. Aggregate strip + cards.
- [ ] Cache header: `Cache-Control: public, max-age=10`.
- [ ] **Validation**:
  - [ ] Opt-in two test routes, opt-out a third. `GET /status` lists exactly the two opted-in routes. The opt-out route does not appear and no probe rows exist for it in D1.
  - [ ] Cards render aggregate + per-card uptime/latency. With media_counts_auto_auth disabled, no counts shown.

## Stage 7 — Admin UI additions

- [ ] In the admin route editor (locate via grep for the existing route add/edit modal in `HTML_UI`), add two new toggle pills: "Show on Status" and "Auto-auth media counts" (latter disabled unless former is on).
- [ ] Add inline editor for `public_alias` (only shown when show_on_status is on; default fills from `remark`).
- [ ] Add "Revoke auth" button on rows with `emby_auth_cache != ''` → POSTs to `/api/routes/revoke-auth?prefix=<p>`.
- [ ] Add "Share card" button → POSTs to `/api/share/card?prefix=<p>` → copies URL to clipboard.
- [ ] Sidebar: add nav item "节点状态" → `target="_blank"` to `/status`.
- [ ] Topbar: add a pill `状态` linking to `/status`.
- [ ] Backend: implement `/api/routes` PATCH to set `show_on_status`, `media_counts_auto_auth`, `public_alias`. Implement `/api/routes/revoke-auth`. Both admin-auth gated.
- [ ] **Validation**:
  - [ ] Through the admin UI, flip on Show on Status for a route. Set public_alias. Confirm `/status` reflects within 10 s (cache TTL).
  - [ ] Flip on Auto-auth, send a proxied request with a fake token, confirm "auth source" label updates and Revoke clears it.

## Stage 8 — Public share endpoints

- [ ] Implement `POST /api/share/dashboard` (admin) and `POST /api/share/card?prefix=…` (admin) per design §7.2. Atomic batch: delete prior + insert new.
- [ ] Implement `GET /public/<token>` per design §7.3. Strict allowlist of fields exposed (design §7.4). **Re-uses the same renderer as /status** but reads from a function that takes an `allowlist=true` flag and refuses to query `routes.target`, `routes.custom_headers`, `routes.emby_auth_cache`, `kv_config`, `dns_config`, `optimized_domains`, `visitor_logs`.
- [ ] Implement `GET /card/<token>.svg` per design §7.3. SVG generator function. `Content-Type: image/svg+xml; Cache-Control: public, max-age=60`.
- [ ] **Validation**:
  - [ ] Issue a dashboard token. `curl /public/<token>` returns HTML; grep the response for `target=`, `custom_headers`, `emby_auth_cache`, the route prefix when public_alias is set — none of these should appear.
  - [ ] Issue a card token for prefix `p1`. Try `/card/<token>.svg` for prefix `p2` — must fail (token is prefix-bound).
  - [ ] Wait past `expires_at` (or hand-edit expires_at backward in D1). Confirm 410.
  - [ ] Issue a second dashboard token. Confirm the first token now returns 410.

## Stage 9 — Drop migration (rollback)

- [ ] Write `migrations/drop_emby_monitor.sql` that drops all 5 new tables and the 6 new columns, IF EXISTS guarded. Commit alongside the worker change so rollback is documented.

## Stage 10 — Integration verification

- [ ] Manual UI smoke through admin: add a route, opt in to status + auto-auth, verify probes appear, send a proxied request, verify token harvest, wait a minute, verify card renders on `/status`.
- [ ] Run `git diff --stat` to confirm only `worker.js`, `migrations/drop_emby_monitor.sql`, and the prd/design/implement docs are touched.
- [ ] Lint pass (no formal linter present; eyeball search for `console.log`, stray `await`s on hot path, TODOs).
- [ ] Final review per acceptance criteria in `prd.md`.

## Validation Commands

```bash
# Local dev with both crons
wrangler dev --test-scheduled

# Trigger 1-min cron
curl 'http://127.0.0.1:8787/__scheduled?cron=*+*+*+*+*'

# Trigger daily cron
curl 'http://127.0.0.1:8787/__scheduled?cron=0+0+*+*+*'

# Inspect schema after deploy
wrangler d1 execute <DB> --remote --command "PRAGMA table_info(routes)"
wrangler d1 execute <DB> --remote --command "PRAGMA table_info(emby_probes)"
wrangler d1 execute <DB> --remote --command "PRAGMA table_info(emby_probe_hourly)"

# Confirm no plaintext tokens in D1
wrangler d1 execute <DB> --remote --command "SELECT prefix, length(emby_auth_cache), substr(emby_auth_cache, 1, 5) FROM routes WHERE emby_auth_cache != ''"

# Rollback path (only if catastrophic)
wrangler d1 execute <DB> --remote --file=migrations/drop_emby_monitor.sql
```

## Risky Files & Rollback Points

- **worker.js** — single risk surface (~7400 lines). Stage 4 (hot-path harvest) is the only stage that touches the proxy critical path; isolate it as the last code-path stage and bench latency before continuing.
- **Schema additions** — additive only; no destructive ALTER. Safe to deploy independently. Rollback = `migrations/drop_emby_monitor.sql` (Stage 9).
- **Cron trigger config** — adding the 1-min cron is a deploy-time change. If it must be backed out, simply remove the 1-min cron line from `wrangler.toml`; the worker code self-no-ops on `event.cron` it doesn't recognize.

## Follow-up Checks Before `task.py start`

- [ ] User has reviewed `prd.md`, `design.md`, `implement.md`.
- [ ] User has approved the schema-reuse plan vs the orphan columns (already confirmed; record in task notes).
- [ ] User has confirmed wrangler.toml may receive a new 1-min cron entry.
- [ ] No outstanding `Open Questions` in `prd.md`.

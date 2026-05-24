# Implement — public /status page

All edits happen in **`/home/ykq001/emby-proxy/worker.js`** unless noted.

## Preconditions

- **Deploy = Cloudflare Dashboard paste (Quick Edit).** No `wrangler.toml` in repo. No `wrangler dev` for local validation. Cron trigger is added in the dashboard's "Triggers" tab post-deploy.
- D1 binding is `DB` (confirmed — `env.DB` is already used throughout worker.js).
- Local validation is limited to syntactic / structural checks (`node --check`, eyeball diff). Behavioral validation happens after the user pastes + deploys + adds the cron trigger in the dashboard.

## Ordered checklist

### Phase A — schema + cron skeleton

1. Extend `ensureSchema()` (worker.js:6218) to:
    - `CREATE TABLE IF NOT EXISTS emby_probes (...)` with index.
    - `CREATE TABLE IF NOT EXISTS emby_probe_hourly (...)`.
    - Idempotent `ALTER TABLE routes ADD COLUMN show_on_status INTEGER DEFAULT 0` wrapped in try/catch (D1's `ADD COLUMN` does not support `IF NOT EXISTS`; ignore "duplicate column" errors).
    - Same pattern for `ALTER TABLE routes ADD COLUMN public_alias TEXT DEFAULT ''`.
2. Add a top-level `async function probeRoute(env, route)` near the other helpers (~line 6200). 8 s `AbortSignal.timeout`. Sequentially calls `/System/Info` then `/Items/Counts`. Catches all errors. Returns the `ProbeResult` shape from design.md.
3. Add `async function probeAllAndStore(env)` that:
    - selects opted-in routes,
    - `Promise.allSettled` over `probeRoute`,
    - batches INSERTs into `emby_probes`,
    - upserts hourly rollups,
    - prunes `emby_probes` ts < now-48h and `emby_probe_hourly` hour < now-30d.
4. Add a `scheduled(event, env, ctx)` export alongside the existing default export (Workers ES-module syntax: `export default { fetch, scheduled }`). Calls `ctx.waitUntil(probeAllAndStore(env))`.
5. **Manual post-deploy step** (document for user, do not code): in Cloudflare dashboard → Workers → this worker → Triggers → "Add Cron Trigger" → `* * * * *`.

**Validation A:**
- `node --check worker.js` parses clean.
- Code review: `scheduled` export wired alongside `fetch`; `probeAllAndStore` is fully `try/catch`-wrapped so a thrown error never escapes the cron callback.
- After deploy + cron trigger added, user reports back that probes appear in D1 (verifiable via dashboard D1 console: `SELECT COUNT(*) FROM emby_probes;`).

### Phase B — public /status route

6. Add `STATUS_UI` template literal near `HTML_UI` (~line 2680). Pure HTML+inline CSS reusing existing v2.4.0 tokens (`--space-*`, `--text-*`, `--radius-ios`, `--card`, `--ok/warn/err`, `--aurora-grad`). Grid `repeat(auto-fill, minmax(280px, 1fr))`.
7. Inline JS at end of `STATUS_UI`: `setTimeout(() => location.reload(), 30000);` and a refresh button bound to `location.reload()`.
8. In the main `fetch()` handler routing block, add a branch for `pathname === '/status'`:
    - `if (!env.DB) return new Response(STATUS_PLACEHOLDER_HTML, { headers: {'content-type': 'text/html; charset=utf-8'} })`
    - Otherwise: run the latest-row-per-prefix SQL from design.md; render `STATUS_UI(rows)`.
    - Return with `Cache-Control: public, max-age=15`.
9. Branch placement: BEFORE the auth gate. `/status` is intentionally public.

**Validation B (post-deploy, manual):**
- `curl -i https://<worker-host>/status` → 200, HTML, `Cache-Control: public, max-age=15`.
- With cron data present, page renders cards.
- With zero opted-in routes, page renders the empty state.
- DB-unbound case is verified by code review (the early-return branch is unambiguous).

### Phase C — admin UI extension

10. Extend `GET /api/routes` (find by `grep -n "/api/routes'" worker.js`) to include `show_on_status` and `public_alias` in the returned JSON rows.
11. Extend `PATCH /api/routes/:prefix` (or whichever endpoint already handles route mutations — look at the `app.routes('/api/routes')` block) to accept and persist `show_on_status` (0/1) and `public_alias` (≤64 chars, trimmed).
12. In `HTML_UI`, find the routes-management table render code and add:
    - a new "Status page" column with a checkbox calling the existing route-update fetch with `{ show_on_status: e.target.checked ? 1 : 0 }`,
    - a small "Alias" text input that POSTs `{ public_alias }` on blur.
13. Add one entry to the existing topbar/nav: a link to `/status` with `target="_blank"`. Style as a normal nav item, no new color tokens.

**Validation C (post-deploy, manual):**
- Toggle the new checkbox in the admin UI → verify in dashboard D1 console: `SELECT prefix, show_on_status FROM routes;` reflects the change.
- After a cron tick, the toggled route appears on `/status`.

### Phase D — polish + edge cases

14. On the public page card, if `item_counts` is null (Emby that requires auth for `/Items/Counts`), HIDE the library counts row entirely instead of showing zeros.
15. For trend arrows (jypost-style), do a second SELECT for the **previous** probe row per prefix and compare counts. If previous-probe was > 1 h ago, hide arrows (stale data isn't a trend). Cheap query; if it adds latency, skip in v1.
16. Add a single line in the existing `console.log('ensureSchema error:', e.message)` style for the cron tick: `console.log('emby_probe tick', { probed, ok, failed, ms })`.
17. Sanity-check bundle size: `wc -c worker.js` should stay well under 1 MB compressed.

**Validation D (final):**
- Run the full PRD acceptance criteria checklist against the deployed worker with at least 2 opted-in routes (1 reachable, 1 deliberately broken).
- Confirm the iOS-native design-system checklist passes (`.trellis/spec/frontend/ui-design-system.md`).
- `git diff worker.js | wc -l` — expect roughly 250–400 changed lines. Anything materially larger means scope crept.

## Risky files / rollback points

- `worker.js` is the only file touched. Roll back any phase by `git checkout -- worker.js` before redeploy.
- `wrangler.toml` change (cron trigger) is independently reversible — remove the `[triggers]` block to stop probing without removing the `/status` route.
- Schema changes are additive only; data persists across a rollback.

## Review gates (before `task.py start`)

- [ ] PRD acceptance criteria all map to a checklist item above.
- [ ] User has either provided `wrangler.toml` or confirmed how the deploy currently registers crons.
- [ ] User has reviewed the iOS-native v5 design tokens we'll reuse vs. introducing any new tokens (we should introduce zero).

## Not in this task

- History page (uses `emby_probe_hourly` we're seeding).
- Telegram alert on status flip.
- Multi-page admin restructure.

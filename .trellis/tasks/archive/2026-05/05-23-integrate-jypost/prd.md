# Integrate jypost into emby-proxy — public status page

## Goal

Add a publicly shareable Emby health/stats page to emby-proxy at `/status`, inspired by jypost's `public.php`. Eliminates the need to deploy jypost's separate PHP+MySQL+Python stack.

## User value

- One URL the user can share with their Emby viewers ("is the server up? how big is the library?").
- Runs entirely inside the existing Cloudflare Worker — zero extra infra.
- Auto-discovers monitored servers from the existing `routes` table; no separate server registry to maintain.

## Confirmed facts

### emby-proxy
- Cloudflare Worker, `worker.js`, ~7400 lines, v2.6.0.
- D1 bound as `env.DB`. Schema created in `ensureSchema()` at worker.js:6218. Existing tables: `routes`, `request_stats`, `visitor_logs`, `kv_config`, `optimized_domains`, `dns_config`.
- Admin UI is a single JS template literal (`HTML_UI` at ~line 2680). Auth via `LOGIN_UI` (~line 2464).
- iOS-native v5 design tokens defined in `CSS_COMMON` (~line 12). Public page must follow the same tokens (`--space-*`, `--text-*`, `--radius-ios`, `--aurora-grad`, etc.) — spec is `.trellis/spec/frontend/ui-design-system.md`.
- Already proxies to Emby upstreams. The `routes` table maps `prefix → target` — each row is effectively "one Emby (or Jellyfin) server we know about".

### jypost data model (for reference, not copied)
- `public.php` shows per-server: name, online/offline badge, response time + latency badge, 24h uptime %, uptime bar, library counts (movies/series/episodes), trend arrows, last-check time, 24h avg response.
- Header aggregates: total/online/offline servers, total movies/series/episodes, current time.
- Auto-refresh every 30s; manual refresh button.
- `monitor.py` agent hits `/System/Info` + `/Items/Counts` every 60s and POSTs to the central API.

### Runtime constraints
- PHP cannot run in a Worker → no source-level port from jypost.
- MySQL not reachable from Workers edge → use existing D1 binding.
- Workers Cron minimum interval = **1 minute** (`* * * * *`). We probe at this rate.
- No external monitor agent needed — the Worker itself can fetch `/System/Info` and `/Items/Counts` directly because it already knows each upstream from `routes`.

## Product decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Feature scope | Public status page only (no history page, no full monitoring suite) |
| Server set | Auto: one card per row in `routes` table, with a per-route opt-in toggle |
| Access | Fully public at `/status`, no token, no auth |

## Technical defaults (recommended; correctable on review)

| Decision | Default | Rationale |
|---|---|---|
| Probe cadence | 60 s via Worker `scheduled` cron | Matches jypost; Workers Cron minimum is 1 min anyway |
| Probe timeout | 8 s per upstream | Worker has 30s CPU cap; need headroom for many routes |
| Raw retention | 48 h of probes | Enough for the 24 h uptime bar + 1-day slack. ~2880 rows per server |
| Aggregation | Hourly rollups kept 30 days (for future history page) | Cheap; future-proofs without bloating raw table |
| Admin UI placement | New column in existing routes table (toggle "Show on /status") + a small "Status page" link in the topbar | No new tab needed; minimal UI churn |
| Public-page refresh | Auto-refresh every 30 s (matches jypost) + manual refresh button | Same UX as jypost users expect |

## Requirements

### Functional
- **R1** New public route `GET /status` returns an HTML page. No auth required.
- **R2** Page renders one card per route where `show_on_status = 1`.
- **R3** Each card displays: route alias (or prefix if no alias), online/offline badge, last-check time, current response time (ms), 24 h uptime %, 24 h avg response (ms), library counts (movies / series / episodes) when available, trend arrows vs. previous probe.
- **R4** Header aggregates: total / online / offline server counts, summed movies / series / episodes, current server time.
- **R5** Page auto-refreshes every 30 s and offers a manual refresh button.
- **R6** Empty state ("no public servers configured") when zero routes are opted-in.
- **R7** Worker `scheduled` handler probes every opted-in route every minute: `GET <target>/System/Info` (availability + name) and `GET <target>/Items/Counts` (library counts). Records `(prefix, ts, ok, response_ms, server_name, item_counts_json)`.
- **R8** Admin UI gains a "Show on /status" toggle for each route, plus an optional "Public alias" text field.
- **R9** Probe data older than 48 h is pruned on each cron tick. Hourly rollup row written per route per hour into `emby_probe_hourly` for future-use.

### Non-functional
- **R10** Public page renders in ≤ 200 ms on edge (data is pre-aggregated; no live probing during page load).
- **R11** All CSS uses the existing v2.4.0 iOS-native tokens. No new color/typography vocabulary.
- **R12** Page degrades gracefully if D1 is unbound (returns a static "monitoring not yet configured" message).
- **R13** Probe failures (timeout / 5xx / DNS) are recorded as `ok=0` and never crash the cron.

## Acceptance criteria

- [ ] `GET /status` returns 200 with rendered HTML when no auth header is present.
- [ ] After enabling "Show on /status" for at least one route and waiting ≥ 2 cron ticks, the route appears as a card with non-zero `response_ms`.
- [ ] Toggling "Show on /status" to off removes the card on the next page reload.
- [ ] Stopping a monitored Emby (or pointing the route at an unreachable host) flips the badge to "Offline" within ≤ 2 minutes and the 24 h uptime % drops accordingly.
- [ ] Library counts (movies / series / episodes) display when `/Items/Counts` returns them; absent fields are hidden, not shown as 0.
- [ ] Probe table row count for a given prefix stays ≤ ~2880 (48 h × 60 probes) over time — prune works.
- [ ] Page passes the iOS-native v5 design-system checklist (`.trellis/spec/frontend/ui-design-system.md`): spacing tokens, type scale, radii, no ad-hoc colors.
- [ ] When `env.DB` is unbound, `/status` returns the "monitoring not yet configured" placeholder, not a 500.

## Out of scope

- jypost's `history.php` (long-form historical charts) — see follow-up.
- jypost's `servers.php` / `monitors.php` admin pages — we reuse the existing routes UI instead.
- Rewriting `monitor.py` as a standalone agent — the Worker cron replaces it.
- jypost's `install.php` / `login.php` / user registration — emby-proxy has its own auth.
- Multi-tenant / multi-user views — single admin context.
- Notifications (Telegram alert when a server goes down). emby-proxy already has TG plumbing; can be added later.

## Follow-ups (not this task)

- History page with multi-day uptime / response charts (would consume the `emby_probe_hourly` table we're seeding now).
- Telegram alert on status flip (online → offline) reusing `sendTgStats` infrastructure.
- Distinguishing Emby vs. Jellyfin upstreams (the `/System/Info` payload differs slightly).

## Open questions

None blocking. Technical defaults are correctable during implementation review.

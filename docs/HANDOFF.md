# Handoff: aggregate server

Open work on the aggregate Worker (`emby-aggregate`). Delete this file, and its pointer in `CLAUDE.md`,
once every step below is done.

## Where things stand (2026-10-04)

- Production `emby` runs `main` with the browser block (`6bb00aa`). The `Mozilla/` UA check of
  `visitor_logs` found no Emby app using a `Mozilla/` UA, so `isBrowserUa` was left as is.
- `emby-aggregate` is deployed at `https://emby-aggregate.ykq001.workers.dev` (account Ykq001,
  config `wrangler.aggregate.prod.toml`, gitignored, same `ADMIN_TOKEN` as production).
- The catalog sync logs in with a copy of a real viewer device (`syncIdent` in `src/aggregate/upstream.js`)
  and polls each node at most hourly after the first full pass.
- Phase 3 (series seasons/episodes, watch state, Latest TV) is on `main`; see `src/aggregate/series.js`.

## Step 1: the cron does not fire (open)

The `*/10 * * * *` trigger is registered (Cloudflare API `GET .../workers/scripts/emby-aggregate/schedules`
lists it since 02:07 UTC), but no scheduled event ran at 02:10–02:40 and `agg_sync` stayed empty.
Check the dashboard (Workers → emby-aggregate → Settings → Triggers → Cron events), and whether the
account is over the free plan's cron limit (5 per account; production `emby` uses 3).

## Step 2: real-app test (owner, with a native app)

- Merged library without duplicates; search and posters work.
- A movie on two nodes shows two versions ("… · Source 1 / Source 2").
- A series split across nodes shows every season; episodes play from the node that has them.
- Resume, played, favorites and Next Up follow the viewer; a new episode puts its series first in Latest.
- A browser login gets the "use an Emby app" error.

## Known limits

- Search matches titles only; episodes are not searchable.
- Episodes numbered 1000+ or seasons 999+ are not shown (derived ids, see `series.js`).
- A series new to a node appears after the next hourly incremental sync.
- Favorites / played filters list movies and series only, not episodes.
- A title copy shows in the version menu only after its node has answered once for that title. The title page
  waits 1.5 s per node; a slower node shows from the next visit (its answer is stored in `agg_media`).

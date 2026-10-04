# Handoff: aggregate server and browser block

Open work, picked up from a session that had no Cloudflare access. Work on branch
`claude/hopeful-euler-xjqeav`. Delete this file, and its pointer in `CLAUDE.md`, once every step
below is done.

## Where things stand

`main` (`bfc96c4`) is deployed to production and has aggregate phase 1 (browse-only), not deployed.
Three commits on the branch are **not merged and not deployed**; the owner said not to merge yet:

| Commit | What |
|---|---|
| `5c1afcd` | Aggregate phase 2: movie playback across nodes (`src/aggregate/playback.js`) |
| `6bb00aa` | Viewers may not use a browser: 403 for `Mozilla/...` UAs in both Workers |
| (this file) | Handoff notes |

`npm run verify` passes on the branch (491 pass, 2 skipped, 95 lint warnings that predate this work).

## Step 1: check which `Mozilla/` UAs viewers really use (needs Cloudflare access)

The browser block (`6bb00aa`) treats any UA starting with `Mozilla/` as a browser. Some Emby
**apps** also send `Mozilla/` UAs, and the block would lock their viewers out:

- Emby Theater (desktop, Electron): usually contains `Electron` or `Emby Theater`
- Samsung TV app (Tizen): `Tizen` or `SMART-TV`
- LG TV app (webOS): `Web0S` or `webOS`
- Android WebView-based apps: `; wv)`

Run (UAs and counts only; per `CLAUDE.md`, never copy IPs or other visitor data anywhere):

```bash
npx wrangler d1 execute emby-proxy-prod-db --remote -c wrangler.prod.toml --command \
  "SELECT prefix, ua, COUNT(*) AS n FROM visitor_logs WHERE ua LIKE 'Mozilla%'
    GROUP BY prefix, ua ORDER BY n DESC LIMIT 50"
```

For a token-only setup (no `wrangler.prod.toml`), use `CLOUDFLARE_API_TOKEN` (D1 Read),
`CLOUDFLARE_ACCOUNT_ID` and `EMBY_PROD_D1_ID` with the D1 REST API:
`POST https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database/$EMBY_PROD_D1_ID/query`
with body `{"sql": "<the query above>"}`.

Then classify each UA as a real browser or an app, show the owner the list, and ask which apps must
keep working. To allow an app, narrow `isBrowserUa` in `src/emby/headers.js`. The best signal is the
`Client="..."` field of the request's `X-Emby-Authorization` (Emby Web sends `Client="Emby Web"`),
plus the UA markers above. Add tests next to the existing browser-block tests in
`test/viewers.test.mjs` and `test/aggregate.test.mjs`, and update the "Viewers may not use a browser"
section of `CLAUDE.md`.

## Step 2: merge and deploy (only after the owner approves the merge)

- Production: `npm run deploy:prod`. On the production Worker this only switches on the browser block.
- Aggregator, first deploy: one-time setup in `DEPLOY.md` (section 聚合 Worker), then `npm run deploy:agg`.
  It must use the **same** `ADMIN_TOKEN` as production. Let a few cron runs (every 10 min) fill the
  catalog, and watch `npx wrangler tail emby-aggregate` for sync errors or CPU-limit errors
  (if those appear, lower `AGG_SYNC_REQUESTS`).

## Step 3: real-app test of the aggregator (owner does this, with a native app)

- The merged library appears with no duplicate titles; search and posters work.
- A movie on two nodes shows two versions ("… · Source 1 / Source 2").
- Playback starts and seeking works; stopping frees the slot in `playback_slots`.
- A browser login gets the "use an Emby app" error.

Fix whatever comes back before starting phase 3.

## Step 4: phase 3 (not started)

- Series: union seasons and episodes across nodes (node A has S1–S3 and node B has S4 → viewer
  sees S1–S4). Plan: derive episode ids from numbers instead of storing rows
  (`vid * 10^6 + season * 1000 + episode`), fetch seasons and episodes live from every node that
  has the series, cache in memory, and make PlaybackInfo / streams resolve an episode id to
  (node, real episode id).
- Watch state: resume position, played, favorites, Continue Watching and Next Up per viewer in the
  `vid` space, so progress follows the viewer across nodes. Reuse `src/viewers/watch.js`'s logic,
  but against a new `agg_watch_state` table (the aggregator must not write prod's `watch_state`).
  Hook it into `playing()` in `src/aggregate/playback.js` and the userData endpoints in
  `src/aggregate/api.js`, which today return defaults without saving.

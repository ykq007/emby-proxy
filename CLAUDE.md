# Agent instructions

This repo builds two Cloudflare Workers. Every rule below applies to **both**:

- **emby-proxy**: the production proxy (`src/index.js`; owner's prod Worker `emby`, D1 `emby-proxy-prod-db`).
- **emby-aggregate**: the aggregated "all nodes" Emby front (`src/aggregate/`, its own wrangler config).
  It shares the prod D1 database, and must never run prod's `ensureSchema` or write to prod tables
  other than `playback_slots`.

Domain vocabulary lives in `CONTEXT.md`; deploy steps live in `DEPLOY.md`.

## Testing against Emby nodes: User-Agent

Never test with an Emby Web / browser User-Agent (anything starting with `Mozilla/`), and never
invent a synthetic one. Upstream nodes and their WAFs block or flag browser UAs, and a fake client
puts the shared upstream account at risk.

Use a real native-client UA taken from `visitor_logs`, preferably one seen on the same node:

```bash
npx wrangler d1 execute emby-proxy-prod-db --remote -c wrangler.prod.toml --command \
  "SELECT prefix, ua, COUNT(*) AS n FROM visitor_logs
    WHERE ua NOT IN ('', 'Unknown') AND ua NOT LIKE 'Mozilla%'
    GROUP BY prefix, ua ORDER BY n DESC LIMIT 30"
```

(`visitor_logs` keeps 7 days. The dashboard's recent visitors list, `/api/analytics`, shows the same `ua` column.)

- Keep `X-Emby-Authorization` consistent with that UA: use the same client's `Client`, `Device` and
  `Version`. Don't send `Client="Emby Web"`.
- This covers every live request an agent sends to an upstream node or a deployed Worker: curl,
  scripts, `wrangler dev`, and smoke tests of either Worker.
- In unit-test fixtures, prefer a real native UA from the logs over `Mozilla/...`. The exception is
  a test that checks browser UAs are rejected or skipped.
- Never copy IPs or other visitor data from `visitor_logs` into commits. UA strings only.

## Checks

`npm run verify` (build, lint, UI snapshot check, tests) must pass before you push.

# Agent instructions

This repo builds the Cloudflare Worker **emby-proxy**, the production proxy (`src/index.js`; owner's
prod Worker `emby`, D1 `emby-proxy-prod-db`).

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
- This covers every live request an agent sends to an upstream node or the deployed Worker: curl,
  scripts, `wrangler dev`, and smoke tests.
- In unit-test fixtures, prefer a real native UA from the logs over `Mozilla/...`. The exception is
  a test that checks browser UAs are rejected or skipped.
- Never copy IPs or other visitor data from `visitor_logs` into commits. UA strings only.

## Viewers may not use a browser

Viewer logins and viewer-token requests from a browser User-Agent (`Mozilla/...`) get 403
(`isBrowserUa` in `src/emby/headers.js`, checked in `src/viewers/gate.js`). Keep it that way: it is
what guarantees a browser UA never reaches a node through a viewer login or stream. A wrong password still answers 401, so the check can't be used to probe
viewer names.

## Checks

`npm run verify` (build, lint, UI snapshot check, tests) must pass before you push.

After changing `src/ui/console/cfip.bend` (the Cloudflare IP ranges and the 优选 CDN verdict) or `src/viewers/sync.bend`
(when a viewer watch write is resent and stored), run `npm run bend:mjs` then `npm run laws`. The page imports the
compiled `cfip.mjs`, `gate.js` imports `sync.mjs`, and `laws` fails when either is stale.

After changing theme tokens, `--side`, `.sec` padding or the mobile breakpoint in `console.css`, or the `.vw-grid` cell width in
`viewers.css`, run `npm run bend:write` then `npm run laws`. `bend PROOF.bend`
must print ALL PROOFS CHECK: `LAWS.bend` holds both themes to WCAG AA and a matching `color-scheme`, and
holds the 观看账号 grid to no sideways scroll from 320px up.

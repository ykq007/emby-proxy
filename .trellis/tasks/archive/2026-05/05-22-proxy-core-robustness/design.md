# Design — proxy-core robustness improvements

## Current proxy flow (baseline)

The proxy path in `worker.js` (`fetch` handler, after admin/API routes) does:

1. Resolve `prefix` → D1 `routes` row → `targetUrls[]`, `currentMode`,
   `enableCache`, `customHeadersRaw`.
2. Fire-and-forget play-session logging on `/PlaybackInfo`.
3. `for` loop over `targetUrls`: build `newHeaders`, apply header mode, apply
   custom headers, `fetch(... redirect:'manual')`. Fail over to the next target
   only on 502/503/504 or a thrown exception. First non-failover response wins.
4. Rewrite `Location` for absolute `https?://` 3xx responses.
5. Body rewrite for PlaybackInfo / System-Info / `.m3u8` / HTML-JS.
6. Static-asset cache headers; return.

Key existing variables to reuse: `targetUrls`, `remainingPath`, `url.search`,
`newHeaders`, `currentMode`, `matchedPrefix`, `safePrefix`, `proxyOrigin`,
`bodyBuffer`, `enableCache`, `customHeadersRaw`.

## Change 1 — WebSocket proxying

**Detection:** before the target `for` loop, check
`request.headers.get('Upgrade')?.toLowerCase() === 'websocket'`.

**Approach:** Cloudflare Workers cannot create an outbound WebSocket with the
`WebSocketPair` API alone; the correct pattern is to `fetch()` the upstream URL
passing the original `Upgrade` request through and return the response — CF
relays the socket when `response.webSocket` is present. Concretely:

- Build the upstream URL exactly like a normal request (`targetUrls[i] +
  remainingPath + url.search`), but force scheme to `ws`/`wss` mirroring
  `http`/`https`. In practice CF accepts `https://` for WS fetches and upgrades
  automatically — keep the http(s) URL and just forward headers.
- `fetch(upstreamUrl, { headers: newHeaders })` with the `Upgrade` header intact
  (do NOT delete it; do still strip the `cf-*` headers as the normal path does).
- If `resp.webSocket` exists: `resp.webSocket.accept()` is handled by CF; return
  `new Response(null, { status: 101, webSocket: resp.webSocket })`.
- Apply the same multi-target failover loop (try each `targetUrls` entry).
- WebSocket requests skip body buffering, redirect rewriting, and body rewriting.

This reuses the header-construction block, so factor that into a helper
(`buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw)`) used
by both the WS path and the normal path to avoid divergence.

## Change 2 — HTTP/HTTPS protocol fallback

Wrap the per-target `fetch` in a helper `fetchWithSchemeFallback(targetUrl,
fetchInit)`:

- Attempt `fetch` with the URL as configured.
- If it throws, OR the response status is in `{525, 526, 530}`, retry once with
  the scheme flipped (`https:`↔`http:`) on a cloned URL.
- Return whichever attempt produced a usable response; if both fail, throw the
  last error so the outer target-loop failover still applies.

Body reuse: a flipped-scheme retry re-sends the request. For methods with a body
this needs the body available twice. Today `bodyBuffer` is only populated when
`targetUrls.length > 1`. Extend: also buffer the body (subject to an 8 MB cap,
`MAX_RETRY_BODY_BYTES`) when the method has a body and either multi-target OR
any retry feature is active. If body exceeds the cap, skip retry for that
request (single attempt, current behaviour) — never buffer unbounded.

## Change 3 — 403 retry cascade

After a target returns HTTP 403, retry on the **same** target with adjusted
headers before moving to the next target. Strategy ladder (stop at first
non-403):

1. As sent (baseline — already done).
2. Set `Origin`/`Referer` to the upstream origin (mirrors `strict`).
3. Delete `Origin`, `Referer`, and all `Sec-Fetch-*` headers.
4. Minimal headers: only `User-Agent`, `Accept`, and Emby auth headers
   (`X-Emby-Token`, `X-MediaBrowser-Token`, `X-Emby-Authorization`,
   `Authorization`) — drop everything else.

Implementation: a function `attempt403Cascade(targetUrl, baseInit, body)` that
returns the first response with status ≠ 403, or the last 403 if all fail.
Requires body reuse (see Change 2). Each retry rebuilds `headers` from the base
set. Bound: max 4 attempts total per target, hard-coded.

Interaction with `strict` mode: when `currentMode === 'strict'`, strategy 2 is
already the baseline, so the cascade naturally starts effectively at strategy 3 —
no special-casing needed, just skip a strategy that equals the baseline.

## Change 4 — relative redirect prefixing

Current code only rewrites `Location` matching `^https?://`. Extend the 3xx
block:

- Absolute `https?://` Location → unchanged (`safePrefix/encodeURIComponent(loc)`).
- Location starting with `/` (and not `//`) → rewrite to
  `safePrefix + location` (the node prefix is prepended; query string preserved).
- Protocol-relative `//host/...` → treat as absolute: prefix-encapsulate.
- Other relative (`foo/bar`, no leading slash) → resolve against the upstream
  request URL, then treat as absolute. Rare; handle defensively.

Guard: if `matchedPrefix` is empty (`safePrefix === ''`) the rewrite is a no-op,
matching today's behaviour.

## Change 5 — MPD/DASH + content-type playlist detection

Today: `needsM3u8 = status 200 && pathLower.endsWith('.m3u8')`.

Replace with content-type-aware detection (extension OR content-type):

- HLS: `pathLower.endsWith('.m3u8')` OR `contentType` includes
  `mpegurl` (covers `application/vnd.apple.mpegurl`, `application/x-mpegurl`,
  `audio/mpegurl`).
- DASH: `pathLower.endsWith('.mpd')` OR `contentType` includes `dash+xml`.

Both feed the existing `rewriteBackendUrls(bodyText)` — that regex-based URL
rewriter is format-agnostic (works on XML manifests too), so no separate DASH
parser is needed. Just widen the `needsM3u8` condition into `needsManifest`.

## Shared refactor

To keep the WS path and normal path from diverging, extract:

- `buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw)` →
  returns a `Headers` object (the current header block, lines ~4302–4337).

No other refactor. All new helpers are module-scope functions added near the
existing `getCFTraffic` / `sendTgStats` helpers, or inline within the handler.

## Risks & mitigations

- **Body double-send**: mitigated by the 8 MB cap; oversized bodies fall back to
  single-attempt (current behaviour) — no correctness regression, just no retry.
- **WebSocket on CF**: if `resp.webSocket` is absent (upstream didn't upgrade),
  return the response as-is so a misconfigured node degrades to an error
  response rather than a hang.
- **403 cascade latency**: bounded at 4 attempts/target; only triggered by an
  actual 403, so the happy path is unaffected.
- **Regression surface**: the normal request path keeps its exact structure;
  new behaviour is gated behind `Upgrade`, SSL-error status, 403 status, and
  redirect/manifest content-type — none fire on a normal 200 stream.

## Rollback

Single-file change. Rollback = `git checkout worker.js`. No DB schema change, no
env var migration. Each change is independently revertable (see `implement.md`
checkpoints).

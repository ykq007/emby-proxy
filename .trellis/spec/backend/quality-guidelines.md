# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

### Proxy-core upstream requests

- **Build upstream headers only via `buildUpstreamHeaders()`.** It is the single
  source of truth for `Host`, `cf-*` stripping, the four header modes
  (`off` / `realip_only` / `dual` / `strict`), and node custom headers. Never
  reconstruct upstream headers inline — the WebSocket path and the normal proxy
  path must not diverge.
- **Retries must not double-send a non-replayable body.** A request body is only
  reusable after being buffered into an `ArrayBuffer`. Buffering is capped at
  `MAX_RETRY_BODY_BYTES` (8 MB); over the cap, `bodyBuffer` stays `null`. Any
  retry feature (scheme fallback, 403 cascade) must be gated on `canRetry`
  (`!hasBody || bodyBuffer !== null`). A streamed body may be sent at most once.
- **`hasBody` means "has a body to forward"** — it requires both a non-GET/HEAD
  method *and* `request.body`. A bodyless POST/DELETE is treated as no-body so
  retries stay enabled for it.
- **WebSocket requests return early.** Detect `Upgrade: websocket` before body
  buffering, play-session logging, and response rewriting; relay
  `response.webSocket` as a `101`. Preserve `Upgrade` / `Connection` /
  `Sec-WebSocket-*` headers (only `cf-*` / forwarding headers are stripped).

### Redirect rewriting

- 3xx `Location` rewriting must handle all four forms: absolute `https?://`,
  protocol-relative `//host`, root-relative `/path` (prepend the node prefix),
  and bare-relative. Root-relative redirects without a prefix restore would let
  the client escape the proxy.
- Known limitation: bare-relative redirects resolve against `targetUrls[0]`, so
  on a multi-target route where failover picked a later target the base origin
  may be wrong. Bare-relative redirects from Emby are rare; revisit only if a
  real breakage is reported.

---

## Testing Requirements

<!-- What level of testing is expected -->

For Worker proxy changes that touch Emby playback, test the full upstream flow against a real server or a faithful mock:

- Authenticate and request `PlaybackInfo`.
- Verify rewritten playback URLs preserve every query parameter.
- Request the rewritten media URL with a `Range` header.
- If upstream returns a CDN redirect, verify the proxied request ultimately returns `206` with `Content-Range`.

Do not treat a `PlaybackInfo` JSON rewrite test as sufficient playback coverage.

For response rewriting, only request uncompressed upstream bodies on paths that may be rewritten. Normal library JSON and media streams should remain compressed or streamed through so proxy changes do not add avoidable latency.

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)

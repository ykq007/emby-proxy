# Port reference worker proxy-core robustness improvements

## Goal

Improve the proxy core of `worker.js` by adopting robustness features from the
reference worker (`chenhr454/emby---worker`). Our worker is more feature-rich at
the management/UI layer, but its proxy core has correctness gaps. This task
closes those gaps without touching the admin panel, analytics, TG, or CF-API code.

## Scope

In scope — proxy request path only (`worker.js` ~lines 4240–4499):

1. **WebSocket proxying** — currently absent. Emby clients use WebSocket for
   session keepalive, remote control, and SyncPlay; these silently fail today.
2. **HTTP/HTTPS protocol fallback** — retry the opposite scheme on SSL-class
   failures (HTTP 525/526/530 and TLS fetch exceptions).
3. **403 retry cascade** — when an upstream returns 403, retry with progressively
   adjusted headers instead of failing immediately.
4. **Relative redirect prefixing** — `Location` headers with a relative path
   (`/foo`) currently lose the node prefix; they must be rewritten to
   `/<prefix>/foo`.
5. **MPD/DASH + content-type playlist detection** — rewrite DASH manifests and
   detect HLS by `Content-Type`, not only the `.m3u8` extension.

Out of scope:

- `__raw__` direct mode + `RAW_ALLOW_HOSTS` (partially redundant with current
  absolute-Location wrapping; revisit later if needed).
- CapyPlayer UA handling (niche; revisit if users report it).
- Host-index / node-list caching (only needed for the reference's KV store; our
  D1 lookup is already O(1) on the `routes` primary key).
- Any change to admin panel, analytics, Telegram, CF-API, or self-update code.

## Constraints

- Single-file worker (`worker.js`); no build step, no new dependencies.
- Must preserve existing behaviour for non-WebSocket, non-403, non-redirect
  requests — these paths must be byte-for-byte equivalent in observable output.
- Multi-target failover, custom headers, the four header modes
  (`off`/`realip_only`/`dual`/`strict`), and response-body rewriting must keep
  working unchanged.
- No new environment variables required for the in-scope features to function;
  any new env var must be optional with a safe default.

## Acceptance Criteria

- [ ] A request with `Upgrade: websocket` to a node path is proxied end-to-end;
      client and upstream exchange messages bidirectionally.
- [ ] When an upstream target is reachable only via the opposite scheme, the
      request succeeds via fallback instead of returning 502.
- [ ] An upstream 403 triggers the retry cascade; if any strategy succeeds the
      client receives that response, otherwise the original 403 is returned.
- [ ] A relative `Location` redirect from an upstream is returned to the client
      as `/<prefix>/<path>`, preserving the node prefix.
- [ ] A DASH `.mpd` manifest and an HLS playlist served without a `.m3u8`
      extension both have their backend URLs rewritten.
- [ ] All existing proxy behaviour (multi-target failover, header modes, custom
      headers, PlaybackInfo / System/Info / M3U8 / HTML-JS rewriting, static
      caching) is unchanged for requests that do not hit the new code paths.

## Notes

- Reference proxy-core functions for guidance: `fetchWithProtocolFallback`,
  `handleWebSocket`, the 403 cascade in `handle()`, `rewriteBodyLinks`.
- Verification is manual against a live Emby node (no automated test harness in
  this repo); see `implement.md` for the manual check plan.

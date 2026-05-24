# Implementation plan — proxy-core robustness improvements

All work is in `worker.js`, proxy path only (~lines 4240–4499) plus a few
module-scope helpers. Each step is a checkpoint: commit-clean and independently
revertable.

## Step 0 — Baseline snapshot
- [ ] Confirm `git status` clean except known `.gemini/` untracked.
- [ ] Note current proxy-path line range for diff orientation.
- Rollback point: `git checkout worker.js`.

## Step 1 — Extract `buildUpstreamHeaders` helper
- [ ] Move the header-construction block (cf-* stripping, header modes,
      custom headers) into a module-scope `buildUpstreamHeaders(request,
      targetUrl, currentMode, customHeadersRaw)` returning `Headers`.
- [ ] Replace the inline block in the target loop with a call to it.
- [ ] Validation: behaviour-neutral refactor — diff must show identical header
      logic; a normal request still returns the same response.
- Review gate: confirm no semantic change before proceeding.

## Step 2 — MPD/DASH + content-type playlist detection (Change 5)
- [ ] Replace `needsM3u8` with `needsManifest` (extension OR content-type for
      HLS `mpegurl` and DASH `dash+xml`).
- [ ] Route `needsManifest` through the existing `rewriteBackendUrls`.
- [ ] Validation: an `.m3u8` still rewrites; an `.mpd` now rewrites; a normal
      JSON/HTML response is untouched.
- Lowest-risk change first; isolated to the body-rewrite block.

## Step 3 — Relative redirect prefixing (Change 4)
- [ ] Extend the `[301,302,303,307,308]` block: handle leading-`/` relative,
      protocol-relative `//`, and bare-relative Location values.
- [ ] Keep absolute `https?://` handling exactly as today.
- [ ] Guard on empty `matchedPrefix`.
- [ ] Validation: simulate each Location form; absolute case output unchanged.

## Step 4 — Body buffering cap + reuse (prereq for Steps 5–6)
- [ ] Add `MAX_RETRY_BODY_BYTES = 8 * 1024 * 1024`.
- [ ] Buffer request body into `bodyBuffer` when the method has a body and the
      size is within cap (extend the current multi-target-only condition).
- [ ] When over cap: leave `bodyBuffer` null → retry features skip, single
      attempt as today.
- [ ] Validation: GET/HEAD unaffected; small POST buffered; large POST falls
      back to single-attempt streaming.

## Step 5 — HTTP/HTTPS protocol fallback (Change 2)
- [ ] Add `fetchWithSchemeFallback(targetUrl, fetchInit)`: retry opposite scheme
      on thrown error or status in {525,526,530}.
- [ ] Use it inside the target loop in place of the direct `fetch`.
- [ ] Ensure flipped-scheme retry uses `bodyBuffer` (or skips retry if null).
- [ ] Validation: a node reachable only on the opposite scheme now succeeds;
      a healthy node makes exactly one fetch (no spurious retry).

## Step 6 — 403 retry cascade (Change 3)
- [ ] Add `attempt403Cascade(targetUrl, baseInit, body, currentMode)` with the
      4-strategy ladder; skip a strategy equal to the baseline.
- [ ] Invoke when a target returns 403; on success use that response, else fall
      through to next-target failover with the original 403.
- [ ] Bound at 4 attempts/target.
- [ ] Validation: a 403-returning node recovers if any strategy works; a
      genuinely-forbidden node still returns 403; a 200 node never enters the
      cascade.

## Step 7 — WebSocket proxying (Change 1)
- [ ] Detect `Upgrade: websocket` before the target loop.
- [ ] For each target: `fetch` upstream with `buildUpstreamHeaders` output and
      the `Upgrade` header preserved; if `resp.webSocket` present return
      `new Response(null, { status: 101, webSocket: resp.webSocket })`.
- [ ] Failover across targets; skip body/redirect/manifest rewriting for WS.
- [ ] Validation: a WebSocket client connects through a node path and exchanges
      messages; a normal HTTP request is unaffected by the new branch.
- Done last — largest new branch, benefits from the helper from Step 1.

## Step 8 — Full quality verification
- [ ] Run `/trellis:check` (spec compliance, consistency).
- [ ] Manual smoke test against a live Emby node:
      - normal browse + image load (static cache headers intact)
      - video playback (PlaybackInfo + M3U8 rewrite)
      - multi-target failover still works
      - WebSocket: session stays alive / remote control works
- [ ] Confirm all `prd.md` acceptance criteria checked.

## Validation commands

No build step or test suite in this repo. Verification is:
- `node --check worker.js` — syntax sanity after every step.
- `git diff worker.js` — review each checkpoint's surface area.
- Manual runtime test via `wrangler dev` or a deployed preview against a real
  Emby node (the only meaningful functional check).

## Rollback points

Each step is committed separately. To revert one change, revert its commit; to
abandon the whole task, `git checkout worker.js`. No DB or env migration is
involved, so rollback is always clean.

# worker.js Optimization — Design Spec

**Date:** 2026-05-26
**Scope:** Reduce code size and duplication in `worker.js` (9233 lines, ~522 KB) while preserving 100% of current behavior.

## Goals

- Shrink the codebase via dedup of repeated patterns.
- Improve maintainability by splitting the monolith into focused modules.
- Conservatively trim duplicated CSS/HTML inside the embedded UI strings.

## Non-Goals

- No feature changes.
- No UI redesign or accessibility work.
- No new runtime dependencies.
- No automated test suite (none exists today).
- No changes to the obfuscator (`scripts/obfuscate.js`).
- No changes to `wrangler.toml` deployment target.

## Current State

- Single file `worker.js`, 9233 lines:
  - `CSS_COMMON` template literal: lines 12–2531 (~2520 lines)
  - `LOGIN_UI` template literal: lines 2532–2747
  - `HTML_UI` template literal: lines 2748–6307 (~3560 lines, HTML + inline JS)
  - Backend Worker logic: lines 6308–9233 (~50 functions)
- Build chain: `worker.js` → `scripts/obfuscate.js` → `dist/worker.obf.js` → `wrangler deploy`.
- D1 binding `DB`. Two cron triggers (`* * * * *`, `0 0 * * *`).
- No existing test suite.

## Design — Phased Execution

Three sequential phases. Each phase ships as its own PR / commit set, verified independently before the next begins.

### Phase 1 — Backend dedup (in place)

Operate only on lines 6308–9233 of `worker.js`. No file split yet. No UI string changes.

**Targets** (final list confirmed during planning by grep):

- D1 boilerplate: extract `dbRun(env, sql, ...binds)`, `dbAll(...)`, `dbFirst(...)` helpers.
- JSON response builder: single `jsonResponse(body, status?, extraHeaders?)`.
- Token cipher surface: fold `b64encode`, `b64decode`, `encryptToken`, `decryptToken`, `tokenKey` into a cohesive group of helpers. **Crypto primitives (AES calls, key derivation) remain byte-identical.**
- Header builders: consolidate overlap between `buildEmbyClientHeaders`, `buildUpstreamHeaders`, `parseCustomHeadersForProbe`, `parseCustomHeaderEmbyToken`.
- Probe/alert flow: extract shared KV/D1 boilerplate from `probeOne`, `probeAll`, `runAlertFSM`, `maybeRollupHourly`.
- Misc: `htmlEscape`, `nowLocalDayStr`, `newShareToken` consolidated into a util group.

**Expected reduction:** 400–600 lines.

**Out of scope this phase:** any behavior change, any UI string change, function renames touching the public fetch/scheduled entrypoints.

**Verification gate:**
1. Snapshot harness (created at start of phase, see "Snapshot Harness" below) renders `LOGIN_UI`, `HTML_UI`, status page HTML, and card SVG with a fixed fixture before Phase 1 begins.
2. After Phase 1 changes: re-render with the same fixture, byte-diff against pre-snapshot. Required: empty diff.
3. `npm run obfuscate` succeeds.
4. Manual: deploy to a preview Worker, log in, exercise dashboard. Failure = phase rejected.

### Phase 2 — Module split + esbuild

Decompose into a `src/` tree, introduce esbuild as a pre-obfuscation build step.

**Target layout:**

```
src/
  index.js          # fetch + scheduled entrypoints, route dispatch
  ui/
    css.js          # CSS_COMMON (export const)
    login.js        # LOGIN_UI
    dashboard.js    # HTML_UI
    svg.js          # SVG_TG, ECG strip, card SVG renderer
  routing/
    validate.js     # validateRoutePrefix, hostMatchesAllowlist, probeDomain
  emby/
    tokens.js       # token cipher + persistence
    headers.js      # Emby/upstream header builders
    counts.js       # fetchItemCounts, maybeFetchMediaCounts
  probes/
    probe.js        # probeOne, probeAll
    alerts.js       # runAlertFSM, maybeRollupHourly
  stats/
    cf.js           # getCFTraffic
    telegram.js     # sendTgStats
  status/
    page.js         # loadStatusData, renderStatusHtml, renderCardSvg
  db/
    schema.js       # ensureSchema
    helpers.js      # dbRun/dbAll/dbFirst
  util/
    text.js         # htmlEscape, nowLocalDayStr
    base64.js       # b64encode/b64decode
    share.js        # newShareToken
```

**Build chain becomes:**

```
src/index.js  →  esbuild (bundle, esm, target=es2022, minify=false)  →  worker.js
worker.js     →  scripts/obfuscate.js (unchanged)                    →  dist/worker.obf.js
dist/worker.obf.js  →  wrangler deploy
```

**package.json changes:**

- Add dev dep: `esbuild`.
- Add script: `"build": "esbuild src/index.js --bundle --format=esm --target=es2022 --outfile=worker.js --legal-comments=inline"`.
- Update `deploy`: `npm run build && npm run obfuscate && wrangler deploy`.
- Update `deploy:plain`: `npm run build && wrangler deploy --main worker.js`.

**`worker.js` status:** kept committed in git as a generated artifact. Gives PR diffability and one-line rollback. Add a top-of-file banner comment indicating it's generated from `src/`.

**Verification gate:**
1. `npm run build` produces a `worker.js` whose **rendered UI output** (snapshots: login, dashboard, status, card SVG) byte-matches Phase 1's post-snapshot.
2. `npm run obfuscate` succeeds against the new `worker.js`.
3. Diff of the *generated* `worker.js` vs Phase 1's `worker.js` is allowed to differ structurally (module boundaries, import wrappers from esbuild) — only the rendered UI strings must match.
4. Manual deploy + smoke test.

### Phase 3 — Conservative UI dedup

Operate on `src/ui/css.js` and `src/ui/dashboard.js`.

**Allowed:**
- Remove exact-duplicate selector blocks (same selector, identical declarations).
- Merge rule sets with identical declarations into combined selector lists.
- Delete CSS custom properties (`--var`) for which `grep -rF "var(--name)" src/` returns zero usages.
- Inside `dashboard.js`, dedupe repeated inline `onclick="...; …"` patterns into small JS helpers defined once at the top of the embedded `<script>`.

**Disallowed (would push us past "conservative"):**
- Selector pruning based on HTML class inspection.
- CSS variable consolidation / renaming.
- Utility-class refactors.
- Any HTML structure change.

**Expected reduction:** 200–400 lines of CSS, ~50 lines of dashboard JS.

**Verification gate:**
1. Re-render snapshots after Phase 3. Diff against Phase 2 post-snapshot.
2. Diff is allowed to contain **whitespace-only differences** in `<style>` blocks. Any non-whitespace difference in rendered HTML, or any change in computed CSS rules referenced by the dashboard, rejects the phase.
3. Manual: load the dashboard in a browser before merging, eyeball compare against a screenshot taken before Phase 3.

## Snapshot Harness

A one-time setup created at the start of Phase 1.

**Location:** `scripts/snapshot-ui.mjs`
**Behavior:** imports the module(s) that produce the UI strings, calls the render functions with a fixed fixture (sample routes, sample status data), writes outputs to `snapshots/`:

```
snapshots/
  login.html
  dashboard.html
  status.html
  card.svg
```

**Usage:**
- `node scripts/snapshot-ui.mjs --write` — write current outputs.
- `node scripts/snapshot-ui.mjs --check` — re-render and `diff` against on-disk; nonzero exit on mismatch.

In Phase 1, the harness dynamically `import()`s `worker.js` as an ES module. To support this, Phase 1's *very first* change adds named `export` keywords to the constants and functions the harness needs: `CSS_COMMON`, `LOGIN_UI`, `HTML_UI`, `renderStatusHtml`, `renderCardSvg`, `loadStatusData`. No other code is touched in that first change; it's a single isolated commit so the baseline snapshot is generated against an otherwise-unchanged worker. In Phase 2+, the harness imports directly from `src/`.

Snapshots are committed to git, then updated at the *end* of each phase only if the diff is the expected allowed kind (empty for Phase 1 & 2; whitespace-only for Phase 3).

## Cross-Cutting Constraints

- **One PR per phase.** Each PR's body must include the snapshot-diff result.
- **No new runtime dependencies.** Only new dev dep is `esbuild`.
- **Obfuscator off-limits** — `scripts/obfuscate.js` not modified.
- **Crypto primitives off-limits** — actual AES/key-derivation calls in `encryptToken`/`decryptToken` remain byte-identical. Only surrounding helpers may be moved.
- **`wrangler.toml` off-limits** — same `main = "dist/worker.obf.js"`, same crons, same bindings.
- **Version constants** (`CURRENT_VERSION`, `GITHUB_RAW_URL`) preserved at the top of `src/index.js`.

## Rollback Strategy

- Each phase is a separate commit / PR. `git revert <sha>` restores prior phase.
- `worker.js` stays in git after Phase 2, so even mid-phase a bad esbuild output can be reverted by checking out the previous `worker.js` and re-running obfuscate.
- Snapshots in git serve as a behavioral baseline for any future change, not just this refactor.

## Risks

| Risk | Mitigation |
|------|------------|
| Hidden duplicate-looking code that is actually behavior-distinct (e.g., two D1 wrappers with subtly different binding logic) | Per-extraction code-read before consolidation; snapshot harness only catches UI regressions, not API regressions — supplement with manual endpoint smoke tests per phase. |
| esbuild bundling changes execution order of top-level `const` initializers | Audit top-level side effects before split; defer any side-effectful init into the `fetch` handler. |
| Obfuscator chokes on esbuild output (e.g., due to ESM `export` syntax) | esbuild output format chosen to match what the obfuscator currently consumes; verify in a throwaway commit before committing the build script change. |
| Conservative UI dedup accidentally removes a CSS variable used only inside a `style="…"` attribute in the HTML template | grep for variable name as substring across all `src/ui/*.js` before deletion, not just `var(--name)`. |

## Success Criteria

- Phase 1: `worker.js` line count drops by ≥ 400, UI snapshots byte-match.
- Phase 2: `src/` exists with the layout above, `npm run build && npm run obfuscate` produces a deployable artifact, UI snapshots byte-match Phase 1.
- Phase 3: CSS shrinks by ≥ 200 lines, snapshots differ only in whitespace, dashboard renders identically in a real browser.
- Across all phases: zero changes to the runtime feature surface.

# worker.js Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `worker.js` (9233 lines, ~522 KB) in three phases — backend dedup, module split with esbuild, conservative UI dedup — without changing any runtime behavior.

**Architecture:** Single-file Cloudflare Worker becomes a `src/`-rooted ESM project bundled by esbuild into `worker.js`, which is then obfuscated and deployed unchanged. Behavioral fidelity is enforced by a snapshot harness that diffs rendered UI strings before/after each phase.

**Tech Stack:** Cloudflare Workers (ESM), D1, vanilla JS, esbuild (new), existing `javascript-obfuscator`, wrangler 4.x.

**Spec:** `docs/superpowers/specs/2026-05-26-worker-optimization-design.md`

---

## File Structure (Target — End of Phase 2)

- `worker.js` — **generated** by esbuild from `src/index.js`. Committed for diffability. Banner comment marks it generated.
- `src/index.js` — `fetch` + `scheduled` entrypoints, route dispatch.
- `src/ui/css.js` — `CSS_COMMON` export.
- `src/ui/login.js` — `LOGIN_UI` export.
- `src/ui/dashboard.js` — `HTML_UI` export.
- `src/ui/svg.js` — `SVG_TG`, `ecgStripSvg`, `renderCardSvg`.
- `src/routing/validate.js` — `validateRoutePrefix`, `hostMatchesAllowlist`, `probeDomain`.
- `src/emby/tokens.js` — `b64encode`, `b64decode`, `tokenKey`, `encryptToken`, `decryptToken`, `extractEmbyToken`, `persistHarvestedToken`.
- `src/emby/headers.js` — `parseCustomHeaderEmbyToken`, `parseCustomHeadersForProbe`, `buildEmbyClientHeaders`, `buildUpstreamHeaders`.
- `src/emby/counts.js` — `fetchItemCounts`, `maybeFetchMediaCounts`.
- `src/probes/probe.js` — `probeTargetFor`, `probeOne`, `probeAll`.
- `src/probes/alerts.js` — `runAlertFSM`, `maybeRollupHourly`.
- `src/stats/cf.js` — `getCFTraffic`.
- `src/stats/telegram.js` — `sendTgStats`.
- `src/status/page.js` — `loadStatusData`, `renderStatusHtml`.
- `src/db/schema.js` — `ensureSchema`.
- `src/db/helpers.js` — `dbRun`, `dbAll`, `dbFirst`, `dbBatch`.
- `src/util/text.js` — `htmlEscape`, `nowLocalDayStr`.
- `src/util/base64.js` — re-exports from `emby/tokens.js` if needed (placeholder; may not be necessary).
- `src/util/share.js` — `newShareToken`.
- `src/util/json.js` — `jsonResponse`.
- `src/net/fallback.js` — `flipScheme`, `fetchWithSchemeFallback`, `attempt403Cascade`.
- `scripts/snapshot-ui.mjs` — snapshot harness, created in Phase 0.
- `snapshots/` — committed baseline outputs.
- `package.json` — gets `build` script and `esbuild` dev dep at start of Phase 2.

---

## Phase 0 — Snapshot Harness Setup

The harness must exist and produce a clean baseline before any refactor touches the file. This is **not** Phase 1 — it's a prerequisite that ships in its own commit.

### Task 0.1: Add named exports to worker.js for snapshot access

**Files:**
- Modify: `worker.js` (add `export` keywords; no logic change)

- [ ] **Step 1: Find and prefix existing declarations with `export`**

The snapshot harness needs to `import` six symbols. Add the `export` keyword to each of these existing declarations in `worker.js`. Use Edit tool, one symbol per edit:

- `const CSS_COMMON = `` → `export const CSS_COMMON = ``
- `const LOGIN_UI = `` → `export const LOGIN_UI = ``
- `const HTML_UI = `` → `export const HTML_UI = ``
- `function renderStatusHtml(data, opts) {` → `export function renderStatusHtml(data, opts) {`
- `function renderCardSvg(card) {` → `export function renderCardSvg(card) {`
- `async function loadStatusData(env, opts) {` → `export async function loadStatusData(env, opts) {`

- [ ] **Step 2: Verify worker.js still parses as ESM**

Run: `node --check worker.js`
Expected: no output, exit 0.

- [ ] **Step 3: Verify obfuscator still works**

Run: `npm run obfuscate`
Expected: succeeds, writes `dist/worker.obf.js`. No errors.

- [ ] **Step 4: Commit**

```bash
git add worker.js
git commit -m "refactor(worker): add named exports for snapshot harness"
```

### Task 0.2: Create snapshot harness

**Files:**
- Create: `scripts/snapshot-ui.mjs`
- Create: `snapshots/.gitkeep`

- [ ] **Step 1: Write the harness**

Create `scripts/snapshot-ui.mjs`:

```js
#!/usr/bin/env node
// Snapshot harness for worker UI strings.
// Usage:
//   node scripts/snapshot-ui.mjs --write   # write current outputs to snapshots/
//   node scripts/snapshot-ui.mjs --check   # diff current vs on-disk; nonzero exit on mismatch

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const snapDir = resolve(repoRoot, 'snapshots');

// Pick source: prefer src/ once it exists, else worker.js
const useSrc = existsSync(resolve(repoRoot, 'src/index.js'));
const modUrl = useSrc
    ? new URL('../src/ui/css.js', import.meta.url)
    : new URL('../worker.js', import.meta.url);

// Note: importing worker.js executes its top-level. Top-level should be side-effect free.
const mod = useSrc
    ? {
        CSS_COMMON: (await import('../src/ui/css.js')).CSS_COMMON,
        LOGIN_UI: (await import('../src/ui/login.js')).LOGIN_UI,
        HTML_UI: (await import('../src/ui/dashboard.js')).HTML_UI,
        renderStatusHtml: (await import('../src/status/page.js')).renderStatusHtml,
        renderCardSvg: (await import('../src/ui/svg.js')).renderCardSvg,
    }
    : await import('../worker.js');

// Fixture for status page / card SVG rendering
const fixture = {
    routes: [
        { prefix: '/a', target: 'https://a.example.com', remark: 'A', show_on_status: 1 },
        { prefix: '/b', target: 'https://b.example.com', remark: 'B', show_on_status: 1 },
    ],
    probes: [
        { prefix: '/a', ok: 1, ms: 120, ts: 1700000000 },
        { prefix: '/b', ok: 0, ms: 0, ts: 1700000000 },
    ],
    history: [
        { hour_ts: 1700000000, ok_count: 50, fail_count: 1, avg_ms: 110, p95_ms: 200 },
    ],
    mediaCounts: { '/a': { movies: 100, series: 20, episodes: 500 } },
    countries: ['CN', 'US'],
    now: 1700000000,
    locale: 'zh-CN',
};

const outputs = {
    'login.html': mod.LOGIN_UI,
    'dashboard.html': mod.HTML_UI,
    'css-common.css': mod.CSS_COMMON,
    'status.html': mod.renderStatusHtml(fixture, { share: false }),
    'card.svg': mod.renderCardSvg({
        prefix: '/a', remark: 'A', ok: true, ms: 120,
        history: fixture.history,
    }),
};

const mode = process.argv[2];
if (mode === '--write') {
    if (!existsSync(snapDir)) mkdirSync(snapDir, { recursive: true });
    for (const [name, content] of Object.entries(outputs)) {
        writeFileSync(resolve(snapDir, name), String(content));
        console.log(`wrote ${name} (${String(content).length} bytes)`);
    }
} else if (mode === '--check') {
    let failed = 0;
    for (const [name, content] of Object.entries(outputs)) {
        const path = resolve(snapDir, name);
        if (!existsSync(path)) {
            console.error(`MISSING ${name}`);
            failed++;
            continue;
        }
        const onDisk = readFileSync(path, 'utf8');
        if (onDisk !== String(content)) {
            console.error(`DIFF ${name}`);
            failed++;
        } else {
            console.log(`OK   ${name}`);
        }
    }
    process.exit(failed ? 1 : 0);
} else {
    console.error('usage: snapshot-ui.mjs --write | --check');
    process.exit(2);
}
```

- [ ] **Step 2: Verify it runs**

If `renderStatusHtml`'s actual signature differs from the fixture shape, adjust the fixture (read `worker.js:7072` for `loadStatusData` and `worker.js:7128` for `renderStatusHtml` to see what fields they consume). If `renderCardSvg`'s input differs, similarly adjust.

Run: `node scripts/snapshot-ui.mjs --write`
Expected: prints five `wrote X.html (N bytes)` lines, exits 0.

- [ ] **Step 3: Verify check passes on freshly-written snapshots**

Run: `node scripts/snapshot-ui.mjs --check`
Expected: prints five `OK   …` lines, exits 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/snapshot-ui.mjs snapshots/
git commit -m "build: add UI snapshot harness for refactor verification"
```

---

## Phase 1 — Backend Dedup (in `worker.js`)

All Phase 1 tasks operate **only** on lines 6308+ of `worker.js` (backend logic). UI strings (`CSS_COMMON`, `LOGIN_UI`, `HTML_UI`) are not touched. **Every task ends with a `--check` run that must pass.**

### Task 1.1: Extract `jsonResponse` helper

**Files:**
- Modify: `worker.js` (add helper near other util functions ~line 6980; replace 8 call sites)

- [ ] **Step 1: Add the helper**

Insert just before `function htmlEscape(s) {` (around line 6980):

```js
function jsonResponse(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            ...extraHeaders,
        },
    });
}
```

- [ ] **Step 2: Replace call sites**

Find every occurrence with: `grep -n "new Response(JSON.stringify" worker.js`

For each match (8 total), rewrite from:
```js
return new Response(JSON.stringify({ success: false, msg: '...' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
```
to:
```js
return jsonResponse({ success: false, msg: '...' });
```

If a call site sets a non-default status (e.g. `status: 500`), pass it as the second arg. If it sets headers beyond Content-Type + CORS, pass them as the third arg. Otherwise default behavior matches.

- [ ] **Step 3: Verify snapshots still match**

Run: `node scripts/snapshot-ui.mjs --check`
Expected: 5 OK lines, exit 0.

- [ ] **Step 4: Verify obfuscator still works**

Run: `npm run obfuscate`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add worker.js
git commit -m "refactor(worker): extract jsonResponse helper (8 call sites)"
```

### Task 1.2: Extract D1 helpers

**Files:**
- Modify: `worker.js` (add helpers near `ensureSchema`; replace high-volume call sites only)

- [ ] **Step 1: Add helpers**

Insert just before `async function ensureSchema(env) {` (around line 7634):

```js
function dbRun(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).run();
}
function dbAll(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).all();
}
function dbFirst(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).first();
}
```

- [ ] **Step 2: Replace call sites — `.first()` pattern**

For each line where `grep -n "env.DB.prepare" worker.js` matches a `.first()` call with **no `.bind(...)`** (e.g. line 6689, 6941), rewrite from:
```js
await env.DB.prepare(`SELECT v FROM kv_config WHERE k = 'emby_last_rollup_ts'`).first()
```
to:
```js
await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'emby_last_rollup_ts'`)
```

For `.first()` with `.bind(...)`:
```js
await env.DB.prepare(`SELECT ... WHERE x = ?`).bind(value).first()
```
to:
```js
await dbFirst(env, `SELECT ... WHERE x = ?`, value)
```

- [ ] **Step 3: Replace call sites — `.all()` and `.run()` patterns**

Apply the same translation for every `.all()` and `.run()` call returned synchronously to the caller (not stored in `stmts.push(...)` arrays — those need raw `env.DB.prepare(...)` because they're batched via `env.DB.batch()`).

**Do NOT touch** call sites that feed into `env.DB.batch(stmts)` arrays (lines 6705–6753, 6961–6966). They require the `D1PreparedStatement` object, not an awaited result.

- [ ] **Step 4: Verify snapshots**

Run: `node scripts/snapshot-ui.mjs --check`
Expected: 5 OK lines, exit 0.

- [ ] **Step 5: Verify obfuscator**

Run: `npm run obfuscate`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add worker.js
git commit -m "refactor(worker): extract dbRun/dbAll/dbFirst helpers"
```

### Task 1.3: Consolidate header-parsing helpers

**Files:**
- Modify: `worker.js` lines ~6779–6822

- [ ] **Step 1: Read the three functions**

Read `worker.js` lines 6779–6822 to see `parseCustomHeaderEmbyToken`, `buildEmbyClientHeaders`, and `parseCustomHeadersForProbe` (~6636).

- [ ] **Step 2: Extract shared header parsing**

If `parseCustomHeaderEmbyToken` and `parseCustomHeadersForProbe` both parse the same `customHeaders` string format (newline-separated `Key: Value` lines), extract a private helper:

```js
function parseHeaderLines(raw) {
    if (!raw) return [];
    const out = [];
    for (const line of String(raw).split(/\r?\n/)) {
        const idx = line.indexOf(':');
        if (idx <= 0) continue;
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) out.push([k, v]);
    }
    return out;
}
```

Place it just before `parseCustomHeadersForProbe`. Then refactor both `parseCustomHeaderEmbyToken` and `parseCustomHeadersForProbe` to call it. If their parse semantics differ (e.g. different separator handling), leave them and skip this task — record in commit message.

- [ ] **Step 3: Verify snapshots**

Run: `node scripts/snapshot-ui.mjs --check`
Expected: 5 OK lines, exit 0.

- [ ] **Step 4: Verify obfuscator**

Run: `npm run obfuscate`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add worker.js
git commit -m "refactor(worker): extract parseHeaderLines shared helper"
```

### Task 1.4: Consolidate probe/alert DB-write patterns

**Files:**
- Modify: `worker.js` lines 6723–6760 (`runAlertFSM`)

- [ ] **Step 1: Identify the pattern**

In `runAlertFSM` (line 6723), four call sites push variations of:
```js
stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO emby_probe_state(prefix, first_fail_at, last_alert_at, alert_kind) VALUES(?,?,?,?)`).bind(prefix, firstFail, lastAlert, kind));
```

- [ ] **Step 2: Extract a local builder**

Inside `runAlertFSM`, just after the function opens, add:

```js
const upsertAlert = (prefix, firstFail, lastAlert, kind) =>
    env.DB.prepare(`INSERT OR REPLACE INTO emby_probe_state(prefix, first_fail_at, last_alert_at, alert_kind) VALUES(?,?,?,?)`)
        .bind(prefix, firstFail, lastAlert, kind);
```

Replace the four `stmts.push(env.DB.prepare(...).bind(...))` sites with `stmts.push(upsertAlert(prefix, firstFail, lastAlert, kind));`.

- [ ] **Step 3: Verify snapshots**

Run: `node scripts/snapshot-ui.mjs --check`
Expected: 5 OK lines.

- [ ] **Step 4: Verify obfuscator**

Run: `npm run obfuscate`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add worker.js
git commit -m "refactor(worker): dedupe emby_probe_state upsert in runAlertFSM"
```

### Task 1.5: Phase 1 closeout

- [ ] **Step 1: Measure line reduction**

Run: `wc -l worker.js`
Record the number. Target: ≥ 400 lines below 9233.

- [ ] **Step 2: Manual deploy smoke test**

Deploy to a non-prod environment (or `wrangler dev`). Verify:
- Login page loads.
- After login, dashboard loads.
- Status page renders.
- One probe cycle completes without errors in `wrangler tail`.

If any check fails, do NOT proceed to Phase 2. Bisect via `git log` to find the offending commit, fix or revert.

- [ ] **Step 3: Tag Phase 1 completion**

```bash
git tag refactor/phase-1-done
```

---

## Phase 2 — Module Split + esbuild

After Phase 0+1, `worker.js` still exists as a single file with named exports. Phase 2 decomposes it into `src/` and makes `worker.js` a build output.

### Task 2.1: Add esbuild and build script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install esbuild**

Run: `npm install --save-dev esbuild`
Expected: `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Update scripts**

Edit `package.json` `scripts` block to:

```json
"scripts": {
    "build": "esbuild src/index.js --bundle --format=esm --target=es2022 --outfile=worker.js --legal-comments=inline",
    "obfuscate": "node scripts/obfuscate.js worker.js dist/worker.obf.js",
    "deploy": "npm run build && npm run obfuscate && wrangler deploy",
    "deploy:plain": "npm run build && wrangler deploy --main worker.js",
    "snapshot:write": "node scripts/snapshot-ui.mjs --write",
    "snapshot:check": "node scripts/snapshot-ui.mjs --check"
}
```

- [ ] **Step 3: Do NOT run build yet**

`src/` doesn't exist. Don't run `npm run build` until Task 2.10.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add esbuild dev dep and build/snapshot scripts"
```

### Task 2.2: Carve out `src/util/` and `src/db/helpers.js`

**Files:**
- Create: `src/util/text.js`, `src/util/share.js`, `src/util/json.js`, `src/db/helpers.js`

These are pure leaves with no dependencies on the rest of the worker.

- [ ] **Step 1: Create `src/util/text.js`**

Copy `htmlEscape` (line ~6980) and `nowLocalDayStr` (line ~6626) from `worker.js` verbatim. Prefix each with `export`.

- [ ] **Step 2: Create `src/util/share.js`**

Copy `newShareToken` (line ~7063). Prefix with `export`.

- [ ] **Step 3: Create `src/util/json.js`**

Copy the `jsonResponse` helper added in Task 1.1. Prefix with `export`.

- [ ] **Step 4: Create `src/db/helpers.js`**

Copy `dbRun`, `dbAll`, `dbFirst` added in Task 1.2. Prefix each with `export`.

- [ ] **Step 5: Commit (the files exist but are not wired in yet)**

```bash
git add src/
git commit -m "refactor: extract util and db helper modules"
```

### Task 2.3: Carve out `src/ui/`

**Files:**
- Create: `src/ui/css.js`, `src/ui/login.js`, `src/ui/dashboard.js`, `src/ui/svg.js`

- [ ] **Step 1: Create `src/ui/css.js`**

```js
export const CSS_COMMON = `
<paste exact contents of CSS_COMMON template literal from worker.js lines 12–2531>
`;
```

Be precise about backticks and `${...}` escaping. If the template literal contains any `${`, those must be either left as `${...}` (if intentional interpolation — read context) or escaped as `\${`.

- [ ] **Step 2: Create `src/ui/login.js`**

Same procedure for `LOGIN_UI` (lines 2532–2747).

- [ ] **Step 3: Create `src/ui/dashboard.js`**

Same procedure for `HTML_UI` (lines 2748–6307).

- [ ] **Step 4: Create `src/ui/svg.js`**

Copy `SVG_TG` const, `ecgStripSvg` function (line ~6989), and `renderCardSvg` function (line ~7566). Prefix each with `export`. If `renderCardSvg` calls `ecgStripSvg` or `htmlEscape`, add the necessary `import` from `./svg.js` (intra-file is fine) or `../util/text.js`.

- [ ] **Step 5: Sanity-check parse**

Run: `node --check src/ui/css.js && node --check src/ui/login.js && node --check src/ui/dashboard.js && node --check src/ui/svg.js`
Expected: silent, exit 0 for all.

- [ ] **Step 6: Commit**

```bash
git add src/ui/
git commit -m "refactor: extract UI string and SVG modules"
```

### Task 2.4: Carve out `src/db/schema.js`

**Files:**
- Create: `src/db/schema.js`

- [ ] **Step 1: Create the module**

Copy `ensureSchema` (line ~7634) into `src/db/schema.js`. Prefix `export`.

- [ ] **Step 2: Verify parse**

Run: `node --check src/db/schema.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.js
git commit -m "refactor: extract db/schema module"
```

### Task 2.5: Carve out `src/emby/`

**Files:**
- Create: `src/emby/tokens.js`, `src/emby/headers.js`, `src/emby/counts.js`

- [ ] **Step 1: Create `src/emby/tokens.js`**

Copy these from `worker.js` (lines ~6858–6936):
- `tokenKey` (~6858)
- `b64encode` (~6871)
- `b64decode` (~6876)
- `encryptToken` (~6883)
- `decryptToken` (~6890)
- `extractEmbyToken` (~6906)
- `persistHarvestedToken` (~6928)

Prefix each with `export`. **Do not touch the crypto body** — copy byte-for-byte.

- [ ] **Step 2: Create `src/emby/headers.js`**

Copy from `worker.js`:
- `parseCustomHeaderEmbyToken` (~6779)
- `parseCustomHeadersForProbe` (~6636)
- `buildEmbyClientHeaders` (~6801)
- `buildUpstreamHeaders` (~7711)
- `parseHeaderLines` (added in Task 1.3, if present)

Add at top: `import { htmlEscape } from '../util/text.js';` only if any of these reference it. If not, no imports.

- [ ] **Step 3: Create `src/emby/counts.js`**

Copy `fetchItemCounts` (~6823) and `maybeFetchMediaCounts` (~6938).

Add imports at top:
```js
import { parseCustomHeaderEmbyToken, buildEmbyClientHeaders } from './headers.js';
import { encryptToken, decryptToken, tokenKey } from './tokens.js';
```
Adjust to actual dependencies — check the function bodies.

- [ ] **Step 4: Verify parse**

Run: `node --check src/emby/tokens.js && node --check src/emby/headers.js && node --check src/emby/counts.js`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/emby/
git commit -m "refactor: extract emby/ modules (tokens, headers, counts)"
```

### Task 2.6: Carve out `src/probes/`

**Files:**
- Create: `src/probes/probe.js`, `src/probes/alerts.js`

- [ ] **Step 1: Create `src/probes/probe.js`**

Copy `probeTargetFor` (~6630), `probeOne` (~6659), `probeAll` (~7597). Add imports as the bodies require (likely none beyond fetch).

- [ ] **Step 2: Create `src/probes/alerts.js`**

Copy `maybeRollupHourly` (~6687), `runAlertFSM` (~6723).
Imports likely: `import { sendTgStats } from '../stats/telegram.js';` — verify.

- [ ] **Step 3: Verify parse**

Run: `node --check src/probes/probe.js && node --check src/probes/alerts.js`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/probes/
git commit -m "refactor: extract probes/ modules"
```

### Task 2.7: Carve out `src/stats/`, `src/status/`, `src/routing/`, `src/net/`

**Files:**
- Create: `src/stats/cf.js`, `src/stats/telegram.js`, `src/status/page.js`, `src/routing/validate.js`, `src/net/fallback.js`

- [ ] **Step 1: `src/stats/cf.js`** — copy `getCFTraffic` (~6313).
- [ ] **Step 2: `src/stats/telegram.js`** — copy `sendTgStats` (~6414). Likely imports `getCFTraffic`, `dbAll`, etc.
- [ ] **Step 3: `src/status/page.js`** — copy `loadStatusData` (~7072), `renderStatusHtml` (~7128). Imports: `CSS_COMMON` from `../ui/css.js`, `ecgStripSvg` from `../ui/svg.js`, `htmlEscape` from `../util/text.js`.
- [ ] **Step 4: `src/routing/validate.js`** — copy `validateRoutePrefix` (~6551), `hostMatchesAllowlist` (~6571), `probeDomain` (~6598).
- [ ] **Step 5: `src/net/fallback.js`** — copy `flipScheme` (~7747), `fetchWithSchemeFallback` (~7756), `attempt403Cascade` (~7778).

- [ ] **Step 6: Verify parse**

```bash
node --check src/stats/cf.js && \
node --check src/stats/telegram.js && \
node --check src/status/page.js && \
node --check src/routing/validate.js && \
node --check src/net/fallback.js
```
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "refactor: extract stats, status, routing, net modules"
```

### Task 2.8: Create `src/index.js` entrypoint

**Files:**
- Create: `src/index.js`

- [ ] **Step 1: Copy the entrypoint**

From `worker.js` line ~7811, copy the entire `export default { scheduled, async fetch(...) { ... } }` block to `src/index.js`. Also copy the top-of-file constants:
- `CURRENT_VERSION`
- `GITHUB_RAW_URL`
- Any other top-level `const`s that are not already in a `src/` module.

- [ ] **Step 2: Add imports**

At the top of `src/index.js`, add named imports for everything the body references. Build the import list by scanning the entrypoint body for function calls and matching them to their `src/` location. Example:

```js
import { CSS_COMMON } from './ui/css.js';
import { LOGIN_UI } from './ui/login.js';
import { HTML_UI } from './ui/dashboard.js';
import { SVG_TG, ecgStripSvg, renderCardSvg } from './ui/svg.js';
import { validateRoutePrefix, hostMatchesAllowlist, probeDomain } from './routing/validate.js';
import { ensureSchema } from './db/schema.js';
import { dbRun, dbAll, dbFirst } from './db/helpers.js';
import { jsonResponse } from './util/json.js';
import { htmlEscape, nowLocalDayStr } from './util/text.js';
import { newShareToken } from './util/share.js';
import { parseCustomHeaderEmbyToken, parseCustomHeadersForProbe, buildEmbyClientHeaders, buildUpstreamHeaders } from './emby/headers.js';
import { encryptToken, decryptToken, tokenKey, extractEmbyToken, persistHarvestedToken, b64encode, b64decode } from './emby/tokens.js';
import { fetchItemCounts, maybeFetchMediaCounts } from './emby/counts.js';
import { probeOne, probeAll, probeTargetFor } from './probes/probe.js';
import { runAlertFSM, maybeRollupHourly } from './probes/alerts.js';
import { getCFTraffic } from './stats/cf.js';
import { sendTgStats } from './stats/telegram.js';
import { loadStatusData, renderStatusHtml } from './status/page.js';
import { flipScheme, fetchWithSchemeFallback, attempt403Cascade } from './net/fallback.js';
```

Remove any import that the entrypoint does not actually use (esbuild will warn / fail otherwise — keep it clean).

- [ ] **Step 3: Verify parse**

Run: `node --check src/index.js`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/index.js
git commit -m "refactor: add src/index.js entrypoint with module imports"
```

### Task 2.9: Cross-module imports cleanup

Each `src/**/*.js` file likely needs imports from its peers. The previous tasks created files but may have left dangling references.

- [ ] **Step 1: Find dangling references**

Run: `node --check src/**/*.js 2>&1 | grep -v "^$"`

If parse passes but functions reference undeclared identifiers, those errors only surface at runtime. Instead, run the bundler now as the canary:

Run: `npm run build`
Expected: produces `worker.js`, exit 0. **Read the output carefully** — esbuild will list every unresolved import.

- [ ] **Step 2: Resolve each error**

For each "Could not resolve" or "X is not defined" error, add the missing `import` at the top of the offending file.

- [ ] **Step 3: Re-run build until clean**

Run: `npm run build`
Expected: exit 0, no warnings about unused imports either.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "refactor: wire cross-module imports across src/"
```

### Task 2.10: Verify Phase 2 against snapshots

- [ ] **Step 1: Build the new `worker.js`**

Run: `npm run build`
Expected: success.

- [ ] **Step 2: Confirm snapshot harness now reads from `src/`**

The harness (Task 0.2) auto-switches to `src/` once `src/index.js` exists. Verify:

Run: `node scripts/snapshot-ui.mjs --check`
Expected: 5 OK lines, exit 0.

If any snapshot DIFFs, the extraction lost or changed content. Investigate the diff (`diff snapshots/login.html <(...)`), find the lossy edit, fix it. Do not update the snapshot.

- [ ] **Step 3: Verify obfuscator**

Run: `npm run obfuscate`
Expected: success.

- [ ] **Step 4: Manual deploy smoke test**

Deploy to non-prod. Login → dashboard → status page → trigger a probe via cron or admin button. All must succeed.

- [ ] **Step 5: Add generated-file banner to `worker.js`**

After successful build, prepend a banner. Edit `src/index.js` (the entrypoint) — actually banner goes via esbuild's `--banner:js=` flag. Update the `build` script in `package.json`:

```json
"build": "esbuild src/index.js --bundle --format=esm --target=es2022 --outfile=worker.js --legal-comments=inline --banner:js=\"// AUTO-GENERATED from src/ — do not edit directly. Run 'npm run build'.\""
```

Re-run `npm run build`. Confirm `worker.js` starts with that banner line.

- [ ] **Step 6: Commit**

```bash
git add worker.js package.json
git commit -m "build: rebuild worker.js from src/ via esbuild"
git tag refactor/phase-2-done
```

---

## Phase 3 — Conservative UI Dedup

All Phase 3 changes happen in `src/ui/css.js` and `src/ui/dashboard.js`.

### Task 3.1: Identify and remove duplicate CSS rule blocks

**Files:**
- Modify: `src/ui/css.js`

- [ ] **Step 1: Find candidate duplicates**

Run a structural search. Inside the CSS string, look for two selector blocks with identical declarations:

```bash
node -e "
const css = (await import('./src/ui/css.js')).CSS_COMMON;
const rules = css.match(/[^{}]+\{[^{}]+\}/g) || [];
const byBody = new Map();
for (const r of rules) {
    const body = r.slice(r.indexOf('{')).replace(/\s+/g,' ').trim();
    const sel = r.slice(0, r.indexOf('{')).trim();
    if (!byBody.has(body)) byBody.set(body, []);
    byBody.get(body).push(sel);
}
for (const [body, sels] of byBody) {
    if (sels.length > 1) console.log(sels.join(' | '), '=>', body.slice(0,80));
}
" --input-type=module
```

Output lists candidate duplicates. Read each one — confirm the declarations are *byte-identical* (ignoring whitespace), not just similar.

- [ ] **Step 2: Merge each true duplicate**

For each confirmed duplicate group, edit `src/ui/css.js` to delete all but the first, and rewrite the surviving rule's selector list to comma-join all original selectors. Example: if `.a { color: red; }` and `.b { color: red; }` both appear, replace with `.a, .b { color: red; }` and delete the second.

- [ ] **Step 3: Verify snapshots — CSS-only diff is acceptable here**

Run: `node scripts/snapshot-ui.mjs --check`

The `css-common.css` snapshot **will** diff. That is expected for Phase 3. Verify the diff visually:

Run: `diff <(node -e "import('./src/ui/css.js').then(m=>process.stdout.write(m.CSS_COMMON))") snapshots/css-common.css | head -40`

Confirm changes are limited to selector merges and rule deletions. Then update the css snapshot only:

Run: `node scripts/snapshot-ui.mjs --write` and `git diff snapshots/css-common.css`.

The other four snapshots (login.html, dashboard.html, status.html, card.svg) must still match — if they don't, abort and investigate.

- [ ] **Step 4: Commit**

```bash
git add src/ui/css.js snapshots/css-common.css
git commit -m "refactor(ui): merge duplicate CSS rule blocks"
```

### Task 3.2: Remove unused CSS custom properties

**Files:**
- Modify: `src/ui/css.js`

- [ ] **Step 1: List defined custom properties**

```bash
grep -oE -- '--[a-zA-Z0-9_-]+:' src/ui/css.js | sort -u > /tmp/css-defs.txt
```

- [ ] **Step 2: For each, check if used**

For each var name (e.g. `--space-1`), search:

```bash
grep -F "var(--space-1)" src/ui/*.js src/status/page.js src/ui/dashboard.js
grep -F "--space-1" src/ui/dashboard.js  # also inline style="..." attrs
```

If both greps return empty, the variable is unused.

- [ ] **Step 3: Delete only the unused definitions**

Edit `src/ui/css.js`: for each confirmed-unused var, remove its single `--name: value;` line from the `:root { ... }` block. Do **not** remove anything else.

- [ ] **Step 4: Re-check snapshots**

Run: `node scripts/snapshot-ui.mjs --check`

Only `css-common.css` should diff. Inspect:

Run: `diff <(node -e "import('./src/ui/css.js').then(m=>process.stdout.write(m.CSS_COMMON))") snapshots/css-common.css`

Confirm only `--var:` deletions. Update snapshot:

Run: `node scripts/snapshot-ui.mjs --write`

- [ ] **Step 5: Commit**

```bash
git add src/ui/css.js snapshots/css-common.css
git commit -m "refactor(ui): drop unused CSS custom properties"
```

### Task 3.3: Dedupe repeated inline handlers in `dashboard.js`

**Files:**
- Modify: `src/ui/dashboard.js`

- [ ] **Step 1: Find repeated inline JS**

```bash
grep -oE 'onclick="[^"]{40,}"' src/ui/dashboard.js | sort | uniq -c | sort -rn | head -20
```

Lists frequently-repeated handler bodies.

- [ ] **Step 2: For each repeated handler**

If a handler body is repeated ≥ 3 times, define a helper inside the `<script>` block in `dashboard.js`:

```js
function fooHandler(arg) { /* original body */ }
```

Then replace each `onclick="...long body..."` with `onclick="fooHandler('arg')"`.

If handlers are repeated only 2 times, leave them.

- [ ] **Step 3: Re-check snapshots**

Run: `node scripts/snapshot-ui.mjs --check`

`dashboard.html` will diff. Inspect:

Run: `diff <(node -e "import('./src/ui/dashboard.js').then(m=>process.stdout.write(m.HTML_UI))") snapshots/dashboard.html | head -60`

Confirm differences are limited to handler attribute changes and the inserted helper definitions. No structural HTML changes.

Update snapshot:

Run: `node scripts/snapshot-ui.mjs --write`

- [ ] **Step 4: Manual browser test**

This step is non-skippable for Phase 3 because static snapshot diffing cannot prove the inlined handlers still behave identically.

Deploy to a preview Worker. Open the dashboard. Click every button whose handler was refactored. Confirm each performs the original action.

- [ ] **Step 5: Commit**

```bash
git add src/ui/dashboard.js snapshots/dashboard.html
git commit -m "refactor(ui): dedupe repeated inline onclick handlers"
```

### Task 3.4: Phase 3 closeout

- [ ] **Step 1: Build and obfuscate clean**

```bash
npm run build && npm run obfuscate
```
Expected: success.

- [ ] **Step 2: Measure CSS reduction**

```bash
wc -l src/ui/css.js
```
Target: ≥ 200 lines below original Phase 2 size.

- [ ] **Step 3: Final manual smoke test**

Full deploy + login + dashboard interaction. Compare against a screenshot taken before Phase 3 began. Visual output must be identical.

- [ ] **Step 4: Tag**

```bash
git tag refactor/phase-3-done
```

---

## Verification Summary

After all phases:

- [ ] `npm run build` succeeds.
- [ ] `npm run obfuscate` succeeds.
- [ ] `npm run snapshot:check` exits 0 (note: snapshots updated through Phase 3 reflect final expected state).
- [ ] `wc -l worker.js` shows the generated file is smaller than 9233 (it will be — esbuild output formatting alone differs, but the *source* reduction is what matters; `wc -l src/**/*.js` is the meaningful number).
- [ ] Manual end-to-end test: login → dashboard → status page → probe trigger → all functional.
- [ ] `git log --oneline refactor/phase-1-done^..HEAD` shows one commit per task, easy to bisect.

## Rollback Cheatsheet

- Bad commit inside a phase: `git revert <sha>` or `git reset --hard <previous-good-sha>` (local only).
- Bad phase: `git revert refactor/phase-N-done^..refactor/phase-N-done` reverts the whole phase as one inverse commit.
- Total bail: `git reset --hard <commit-before-phase-0>` returns to pristine `worker.js`. The `worker.js` blob is fully restored from git history.

# Implementation plan — Desktop iOS-native port (v2.5.0)

All edits are in `worker.js` (single-file Cloudflare Worker). Work top-down so the JS hooks land last, after the CSS they target exists.

## Step 0 — Pre-flight (read-only)

- [ ] `grep -n "1px solid var(--border)" worker.js` — capture a list; will revisit in Step 5.
- [ ] `grep -n 'class="ios-form-group' worker.js` — confirm no desktop markup relies on `display: contents` passthrough.
- [ ] `grep -n "border-radius: var(--radius-card)" worker.js` — list `.card` family bumps.
- [ ] Open the app in a desktop browser (≥1024px) and capture **before** screenshots: dashboard, settings/danger, login. Save under `.trellis/tasks/05-23-desktop-ios-port/research/` if useful.
- [ ] Open the app at the 769px breakpoint and at ≤768px — confirm v2.4.0 mobile baseline still reads as designed.

**Gate**: nothing below this line proceeds until pre-flight is captured.

## Step 1 — Token + version

- [ ] Add `--text-large-title-lg: 40px;` to `:root` after the existing large-title tokens (~worker.js:76).
- [ ] Bump `CURRENT_VERSION` to `'2.5.0'`.
- [ ] Add a one-line comment block before the iOS token group: `/* v2.5.0: desktop port — ios-page-header / ios-form-* / tb-section-title promoted out of mobile MQ. */`

**Validate**: `grep -n "CURRENT_VERSION\s*=" worker.js` shows `2.5.0`; `grep -n "text-large-title-lg" worker.js` returns the new token.

## Step 2 — Promote `.ios-page-header` / `.ios-large-title` / `.ios-sub`

- [ ] Replace the desktop default at `worker.js:1452` (`.ios-page-header { display: none; }`) with the desktop ruleset from design.md §1.
- [ ] Add the matching `.ios-large-title` and `.ios-sub` desktop rules at the same place (outside the mobile MQ).
- [ ] Inside `@media (max-width: 768px)` (worker.js:1464+), keep `.ios-large-title { font-size: var(--text-large-title); }` and the page-header padding override. Remove the now-redundant `display: block` from the mobile block since the default is already `block` on desktop.

**Validate**: load any section on desktop — large title appears at the top of the content area; ≤768px still renders the 34/30/28 ramp.

## Step 3 — Add `.tb-section-title` slot to glass topbar

- [ ] Locate the topbar markup (search for the `.topbar` opener HTML emission near worker.js:~1075 source and the markup elsewhere). Insert `<span class="tb-section-title" id="tbSectionTitle"></span>` between brand and the right-side controls. If the markup is built via template strings, insert there.
- [ ] Add the `.tb-section-title` CSS block from design.md §2 outside the mobile MQ.
- [ ] Inside `@media (max-width: 768px)`, add `.tb-section-title { display: none; }`.
- [ ] In the JS that builds the page header (worker.js:~4781 — `'<h1 class="ios-large-title">' + meta.title + '</h1>'`), additionally set the topbar slot: `const t = document.getElementById('tbSectionTitle'); if (t) t.textContent = meta.title;`.

**Validate**: scroll past the section title on desktop — the topbar fades the title in; scroll back to top — fades out. No layout jump in the topbar.

## Step 4 — Promote `.ios-form-group` / `.ios-form-row` family to desktop

- [ ] Remove the desktop default `.ios-form-group { display: contents; }` at worker.js:1456.
- [ ] Copy the `.ios-form-group`, `.ios-form-group-label`, `.ios-form-row`, `.ios-form-row.is-tap`, `.ios-form-row.is-tap:active`, `.ifr-label`, `.ifr-value`, `.ifr-chevron`, `.ios-form-row.is-danger` rules out of the mobile MQ to a new dedicated section just before the mobile MQ block.
- [ ] In the desktop scope, override:
  - `.ios-form-row { min-height: 40px; }`
  - Add `.ios-form-row.is-tap:hover { background: var(--ios-fill-quat); }`.
- [ ] In `@media (hover: none) and (pointer: coarse)` block (worker.js:933), add `.ios-form-row { min-height: var(--touch-min); }` so touch laptops still get 44px.
- [ ] Inside `@media (max-width: 768px)`, *remove* the duplicated `.ios-form-group` / `.ios-form-row` rules since they are now shared. Mobile may keep override-only rules (e.g., page padding).

**Validate**: CSS lints clean; existing mobile `.ios-form-row` consumers (More-sheet logout) still render identically.

## Step 4b — Rewrite desktop Danger section to use `.ios-form-row`

The Danger section markup is at worker.js:2696–2725 (3 `.danger-card` blocks inside `.danger-list`).

- [ ] Replace `.danger-list` + its `.danger-card` children with one `.ios-form-group` containing three `.ios-form-row.is-danger.is-tap` rows (or one `.ios-form-row` with the CTA inline — pick whichever reads better at 769–1440px).
- [ ] Each row layout: left column with title (`.ifr-label` styled at headline weight) + description below (re-use `.dc-desc` as a multi-line subtext under the label, or add a new `.ifr-sub` class), trailing red action button.
- [ ] Keep the existing `.danger-hero` header above the group (large icon + 危险操作区 title + subtitle) — it doubles as the section's iOS large title slot. If the new `.ios-page-header` is being added per section, decide whether `.danger-hero` collapses into it or sits below it. Recommendation: keep `.danger-hero` (it carries the warning icon) and skip the generic large title for this section.
- [ ] If a new helper class `.ifr-sub` is needed for the description line, add it minimal: `margin-top: 2px; font-size: var(--text-sm); color: var(--text-sec); line-height: 1.4;`.
- [ ] Verify each row's CTA still wires to `purgeCache()`, `openWorkerUpdate()`, `logout()` respectively.

**Validate**: desktop Danger section reads as one cohesive inset-grouped block with three hairline-separated rows, each red-tinted, with the CTAs preserved. Mobile Danger (which shares the same DOM) still looks correct.

## Step 5 — Hairline divider audit

- [ ] Walk the Step 0 grep output. For each `1px solid var(--border)` inside a list/settings/form row context, change to `0.5px solid var(--hairline)`. Skip: card outer borders, table th/td (structural), input borders, button borders.
- [ ] After substitution, eyeball each touched section to confirm dividers remain visible at both themes (hairline is intentionally subtle).

**Validate**: visual check at ≥1024px both themes — dividers read as crisp hairlines, not thicker grey lines.

## Step 6 — Continuous-corner radius bump

- [ ] In `.card { ... }`, change `border-radius` to `var(--radius-ios)`.
- [ ] In `.kpi-tile { ... }` (worker.js:1281), change `border-radius` to `var(--radius-ios)`.
- [ ] Spot-check `.kpi-tile.is-primary::before` (gradient overlay, worker.js:1303) — if corners spill, add `.kpi-tile { overflow: hidden; }` (likely already present).
- [ ] Do NOT change `.btn`, `.pill`, `.tb-icon-btn`, chip radii.

**Validate**: KPI hero and main content cards have slightly rounder, more iOS-feeling corners. No clipped corner artifacts on hover/active.

## Step 7 — Login refresh (desktop)

- [ ] Read the existing `.login-body` / `.login-box` / `.login-logo` / `.login-eyebrow` / `.login-foot` rules. Identify any mobile-only refresh from the v2.4.0 commit.
- [ ] Add the desktop login rules from design.md §6 *outside* `@media (max-width: 768px)`. Use existing class names where possible; only add new ones if the markup lacks the hook.
- [ ] If the title element lacks a class, add one in the HTML (`<h1 class="login-title">...</h1>`).
- [ ] Confirm the desktop CTA stays inside the card (the fixed-bottom rule should already be wrapped in the mobile MQ).

**Validate**: visit `/` while logged out on desktop — gradient logo medallion, large title, inset input, CTA inside card. Mobile login unchanged.

## Step 8 — Skeleton shimmer parity check

- [ ] Hard-reload the dashboard on desktop with throttled network — confirm KPI tiles show shimmer until first data write.
- [ ] No code change expected. If shimmer is absent on desktop, walk `.skeleton` rule (worker.js:1432) for an enclosing MQ.

## Step 9 — Cross-viewport regression sweep

Run all of the following manually:

- [ ] Desktop ≥1440px, light + dark — every section, scroll behavior, modals, login.
- [ ] Desktop 1024px — confirm no overflow.
- [ ] Desktop 769px (narrowest still-desktop) — confirm `.tb-section-title` does not collide with topbar controls; large title fits without wrapping awkwardly.
- [ ] ≤768px — confirm v2.4.0 mobile experience is intact.
- [ ] Touch laptop emulation (Chrome devtools → touch + 1280px) — `.ios-form-row` gets the 44px min-height via the `hover:none, pointer:coarse` block.

## Step 10 — Wrap-up

- [ ] Run `node -c worker.js` (syntax check) and any other project lint if defined.
- [ ] Update version footer / changelog comment if not yet bumped in Step 1.
- [ ] Verify all acceptance criteria in `prd.md` are checked off.
- [ ] Hand off to Phase 3 (quality verification → spec update → commit).

## Validation commands

```bash
# Syntax sanity
node -c /home/ykq001/emby-proxy/worker.js

# Regressions
grep -n "display: none" /home/ykq001/emby-proxy/worker.js | grep -E "ios-page-header|ios-form-group"   # should be empty outside mobile MQ
grep -n "CURRENT_VERSION\s*=" /home/ykq001/emby-proxy/worker.js                                        # should show 2.5.0
grep -nE "1px solid var\(--border\)" /home/ykq001/emby-proxy/worker.js | wc -l                          # should drop vs. Step 0 baseline
```

## Review gates

- [ ] Gate A (after Step 4): visual diff of Settings + Danger sections on desktop matches design.md §3 expectation; commit-ready snapshot before continuing.
- [ ] Gate B (after Step 7): full desktop walkthrough light + dark; user (or reviewer) signs off.
- [ ] Gate C (Step 10): regression sweep passes, version bumped, ready to commit.

## Rollback points

- After Step 1 (token only) — trivial revert.
- After Step 4 (form rows) — biggest single risk; isolate this commit if possible so it can be reverted independently.
- After Step 6 (radius bump) — visual-only; safe to revert individually if a card breaks.

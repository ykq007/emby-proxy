# Design — Desktop iOS-native port

## Architectural observations

The mobile overhaul (commit `6f8c35d`) emits the iOS DOM **for all viewports**, then hides it on desktop via default rules outside `@media (max-width: 768px)`:

| Element | Default (desktop) state today | File:line |
|---|---|---|
| `.ios-page-header` (large title block) | `display: none` | worker.js:1452 |
| `#mobileTopbarCompact` (sticky compact bar) | `display: none` | worker.js:1453 |
| `.mob-brand` | `display: none` | worker.js:1454 |
| `#moreSheet` | `display: none` | worker.js:1455 |
| `.ios-form-group` | `display: contents` (neutralized) | worker.js:1456 |
| `.skeleton` (KPI shimmer) | Active on every viewport | worker.js:1432–1448 |
| `body.is-scrolled` toggle | Driven by JS for every viewport | worker.js:4788–4796 |

This means the port is mostly **deleting `display: none`** for selected elements and **adding desktop-scaled rules**, not rewriting components.

## Section-title strategy (resolves PRD note)

Two layers compete for the section title at scroll time:

1. The existing desktop **glass topbar** (`.topbar`, ~line 1075) is already sticky and houses brand + nav controls.
2. The mobile **`#mobileTopbarCompact`** would, if enabled, sit at `position: sticky; top: 0` *above* the topbar.

**Decision**: do NOT promote `#mobileTopbarCompact` to desktop. Instead, give the glass topbar a new center slot, `.tb-section-title`, that:
- Stays empty/`opacity: 0` by default.
- Is populated from the same `meta.title` source used to build `.ios-page-header` (worker.js:4781).
- Fades in/out via `body.is-scrolled` (same trigger as mobile).

This avoids double chrome, reuses the existing glass treatment, and keeps the mobile sticky bar exactly as v2.4.0 shipped it.

## Token additions

Add to `:root` (after line 76):
```css
--text-large-title-lg: 40px;   /* desktop ≥769px */
```
Add to `body.dark` only if needed (current iOS dark overrides at ~123–126 are sufficient; large-title sizing is viewport-driven, not theme-driven).

No other token additions — everything else (`--radius-ios`, `--hairline`, `--ios-fill`, `--ios-fill-quat`, `--text-headline`, `--text-body-ios`) already exists at `:root`.

## CSS changes — by component

### 1. Large-title section header (desktop)

**Promote** the `.ios-page-header` + `.ios-large-title` + `.ios-sub` rules out of the mobile media query, and add a desktop scale:

```css
/* Replace worker.js:1452 default rule */
.ios-page-header {
    display: block;
    padding: var(--space-2) var(--space-1) var(--space-4);
    margin-bottom: var(--space-3);
}
.ios-large-title {
    margin: 0;
    font-size: var(--text-large-title-lg);   /* 40px on desktop */
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.1;
    color: var(--text);
    font-variant-numeric: tabular-nums;
}
.ios-sub {
    margin: var(--space-1) 0 0;
    font-size: var(--text-body-ios);
    color: var(--text-sec);
    line-height: 1.4;
}
@media (max-width: 768px) {
    /* mobile keeps the 34/30/28 ramp (existing rules retained) */
    .ios-page-header { padding: var(--space-1) var(--space-1) var(--space-3); }
    .ios-large-title { font-size: var(--text-large-title); }
}
```

Keep the existing `≤480` / `≤360` shrinks; remove the now-duplicated desktop-skipped `display: block` from inside the mobile MQ to avoid drift.

### 2. Glass topbar section-title slot

Inject a new element in the topbar markup (somewhere inside `.topbar`, between brand and controls), e.g. `<span class="tb-section-title" id="tbSectionTitle"></span>`. Mirror updates from the JS that already builds `.ios-page-header` at worker.js:4781.

```css
.tb-section-title {
    flex: 1 1 auto;
    text-align: center;
    font-size: var(--text-headline);
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
body.is-scrolled .tb-section-title {
    opacity: 1;
    transform: none;
}
@media (max-width: 768px) {
    .tb-section-title { display: none; }   /* mobile uses #mobileTopbarCompact */
}
```

JS update at worker.js:4781 (or in the section-switch handler) — when building the page header, also set `document.getElementById('tbSectionTitle').textContent = meta.title`.

### 3. Inset-grouped form rows (desktop)

**Promote** `.ios-form-group`, `.ios-form-group-label`, `.ios-form-row`, and their modifiers (`is-tap`, `is-danger`, `.ifr-*` children) out of the mobile media query. Adjustments for desktop:

- Drop `min-height: var(--touch-min)` to a desktop-appropriate `40px` while keeping 44px on touch (`@media (hover: none) and (pointer: coarse)`).
- Add a desktop hover state: `.ios-form-row.is-tap:hover { background: var(--ios-fill-quat); }`.
- Keep `:active { background: var(--ios-fill); }` cross-viewport.

The current `.ios-form-group { display: contents; }` default at worker.js:1456 must be removed; the promoted rule supersedes it.

### 4. Continuous-corner radius adoption

**Targeted bump**, not blanket rename:

- `.card` (worker.js search for `.card {`) → `border-radius: var(--radius-ios)` (was `--radius-card`/16px).
- `.kpi-tile` → `border-radius: var(--radius-ios)` (currently in the `.kpi-tile {` block ~line 1281).
- Leave `.btn`, `.pill`, and small chips at their existing radii (they read better small).
- Leave `.ios-form-group` at `--radius-ios-sm` (already correct).

If any nested visual breaks (e.g., overflow corners on `.kpi-tile.is-primary` gradient), add `overflow: hidden` rather than reverting.

### 5. Hairline dividers

In the desktop scope, replace `border-bottom: 1px solid var(--border)` with `border-bottom: 0.5px solid var(--hairline)` for:
- `.ios-form-row` (already in mobile block — comes free with §3).
- Any list rows added by the port (Settings, Danger).
- Do **not** touch `.card` outer borders or table headers (`th`/`td` borders) — those read as structure, not list rhythm.

Grep target before editing: `grep -n "1px solid var(--border)" worker.js` and audit hits inside list/settings/form contexts only.

### 6. Login chrome (desktop)

Inspect the existing `.login-body` / `.login-box` / `.login-logo` (worker.js:1868+). Apply iOS treatment by adding (outside the mobile MQ):

```css
.login-logo {
    width: 72px; height: 72px;
    border-radius: var(--radius-ios);
    background: var(--aurora-grad);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto var(--space-4);
    box-shadow: var(--card-shadow-lift);
}
.login-box h1, .login-box .login-title {
    font-size: var(--text-large-title-lg);
    font-weight: 700;
    letter-spacing: -0.025em;
    text-align: center;
}
.login-box input[type="password"] {
    background: var(--ios-fill-quat);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-headline);
}
.login-box input[type="password"]:focus {
    background: var(--card);
    border-color: var(--primary);
}
```

CTA stays inside the card (desktop), unlike mobile's fixed-bottom CTA. If the existing mobile rule pins the button to the viewport bottom, the desktop scope must not inherit it — verify in the existing CSS.

### 7. Skeleton shimmer parity

Verification only. `.skeleton` at worker.js:1432 is already viewport-agnostic. Confirm via DevTools that desktop KPI tiles show shimmer until `updateAuroraKpis` (worker.js:3528) strips the class.

## Cross-cutting

- **Version bump**: `CURRENT_VERSION` → `2.5.0`, login footer string already interpolates `${CURRENT_VERSION}`.
- **Changelog header**: prepend a brief comment block before the iOS tokens explaining "Desktop port v2.5.0 — promoted ios-page-header / ios-form-* / tb-section-title out of the mobile MQ; mobile rules retained as overrides."
- **Theme parity**: every promoted rule that uses `var(--card)`, `var(--text)`, `var(--text-sec)`, `var(--hairline)`, `var(--ios-fill*)` is already theme-aware via the existing `body.dark` overrides. No new dark-mode rules required.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Promoting `.ios-form-group` breaks an existing desktop layout that relied on `display: contents` | Grep `class="ios-form-group"` in desktop-only markup before merging; if any caller depends on contents-passthrough, gate that one usage with a modifier (`.ios-form-group.is-passthrough`). |
| `.tb-section-title` overlaps with existing topbar children at narrow desktop widths (769–900px) | Use `flex: 1 1 auto; min-width: 0; text-overflow: ellipsis` and verify at 769px. |
| Bumping `.card` to 18px clashes with internal element radii (e.g. table corners) | Walk the major card containers manually post-change; add `overflow: hidden` selectively, do not revert. |
| Login refresh collides with existing mobile login rule | Check whether mobile login rules use `body.login-body` + media query; the new desktop rules must be outside `@media (max-width: 768px)`, and mobile keeps its existing overrides. |
| Section-title slot text outdated on browser back/forward | The same JS that updates `.ios-page-header` already runs on section navigation — piggy-back on it (single source of truth). |

## Rollback

Each change is a contiguous CSS/JS block. Rollback = revert the v2.5.0 commit; v2.4.0 mobile is untouched because all new rules are either *outside* `@media (max-width: 768px)` (additive) or *promotions* that remain wrapped in the mobile MQ as overrides where needed.

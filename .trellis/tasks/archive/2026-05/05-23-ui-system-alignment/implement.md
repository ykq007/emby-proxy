# Implement: Full-system UI alignment pass

Single file in play: `/home/ykq001/emby-proxy/worker.js`. All edits inside `CSS_COMMON` (line 12 onward), `LOGIN_UI` (line 1043 area), `HTML_UI` (line 1101 area), plus the `CURRENT_VERSION` constant and the UI design system spec.

Each step lists what to change, then the verification command(s) to run before moving on.

## Step 1 — Token layer

1.1 In `CSS_COMMON`'s `:root` block (lines ~13–32), append the new tokens listed in `design.md` (spacing, type, radius, status-soft/ring, primary-soft/ring/glow, touch). Place them after the existing tokens, before the closing `}`.

1.2 In the `body.dark` block (lines ~34–52), append the dark overrides for any token whose value differs (status colors, primary alphas).

1.3 Alias `--radius-card` to `--radius-2xl`:
```css
--radius-card: var(--radius-2xl);
```
Place inside `:root`; remove the literal `16px` value.

1.4 Alias `--accent-glow` to `--primary-glow` similarly.

**Verify**
```bash
grep -nE "^\s*--(space|text|radius|primary-soft|primary-ring|primary-glow|ok-soft|warn-soft|err-soft|touch-min)" worker.js
```
Should list each new token exactly twice (once in `:root`, once in `body.dark` if applicable) — but spacing/type/radius tokens appear once (root only) since they don't change between themes.

## Step 2 — Status & primary color migration

2.1 Find every occurrence of the literal status hex codes inside `CSS_COMMON` *outside* the token blocks:

```bash
sed -n '53,900p' worker.js | grep -nE '#(34c759|ff9500|ff3b30|30d158|ff9f0a|ff453a)\b'
```

Replace each with `var(--ok)` / `var(--warn)` / `var(--err)` based on role.

2.2 Find rgba status alphas and replace with `*-soft` / `*-ring` tokens:

```bash
sed -n '53,900p' worker.js | grep -nE 'rgba\(52,199,89|rgba\(255,149,0|rgba\(255,59,48\)'
```

Mapping: `rgba(52,199,89,0.08–0.10)` → `var(--ok-soft)`; `rgba(52,199,89,0.18–0.22)` → `var(--ok-ring)`. Same shape for warn/err.

2.3 Find primary-color rgba uses:

```bash
sed -n '53,900p' worker.js | grep -nE 'rgba\(0,113,227|rgba\(47,155,255\)'
```

Mapping: alpha 0.08–0.10 → `var(--primary-soft)`; alpha 0.14–0.20 → `var(--primary-ring)`; alpha 0.30+ → `var(--primary-glow)`. (Edit `body.dark` rgbas alongside their light-mode counterparts so each component rule has one token, not two.)

**Verify (AC2 + AC3)**
```bash
sed -n '53,900p' worker.js | grep -cE '#(34c759|ff9500|ff3b30|30d158|ff9f0a|ff453a)\b|rgba\(52,199,89|rgba\(255,149,0|rgba\(255,59,48|rgba\(0,113,227|rgba\(47,155,255'
```
Expected: `0`.

## Step 3 — Radius migration (AC6)

3.1 List every `border-radius` literal:

```bash
grep -nE 'border-radius:\s*[0-9]+' worker.js
```

3.2 Map each:
- `6px` → `var(--radius-sm)`
- `8px` → `var(--radius-md)`
- `10px` → `var(--radius-md)` (rounds down; `.btn-submit` and `.search-input` align)
- `12px` → `var(--radius-lg)`
- `14px` → `var(--radius-xl)`
- `16px` → `var(--radius-2xl)` (or keep `var(--radius-card)` alias)
- `20px`, `30px` → `var(--radius-pill)` (these are pill-shaped chips/toast — confirm visually, both are >=2x line-height so `pill` reads identically)
- `999px` → `var(--radius-pill)` (no change in shape, just naming consistency)

3.3 Confirm the four card-family elements (`.card`, `.emby-card`, `.table-wrapper`, `.card-header` if it has a radius, login `.login-box`) all use `var(--radius-2xl)`.

**Verify (AC6)**
```bash
grep -nE 'border-radius:\s*[0-9]+px' worker.js
```
Expected: only matches inside the token declaration block.

## Step 4 — Spacing migration (AC4)

Work top-down through `CSS_COMMON`. For each rule, replace `padding`, `margin`, `gap` literal pixel values with `var(--space-*)` per the design.md mapping. Sweep these selectors explicitly (audit list):

```
.container, .card, .toolbar, .btn-submit, .table-wrapper, th, td,
.action-group, .icon-btn, .badge, .btn-edit, .btn-del, .btn-dns,
.search-input, .node-grid, .emby-card, .card-header, .card-title-group,
.emby-icon, .info-row, .info-label, .card-footer, .ping-badge,
.icon-item, .a-head, .a-handle, .a-cb, .a-thumb, .a-title-block,
.a-name, .a-meta, .a-mode-badge, .a-stats, .a-stat, .a-stat-label,
.a-stat-val, .a-stat-sub, .a-tags, .a-tag, .a-foot, .a-icon-btn,
.a-btn-edit, .sidebar, .sidebar-brand, .sidebar-nav, .nav-item,
.sidebar-foot, .topbar, .tb-stat, .tb-icon-btn, .content,
.danger-bar, .login-box, .login-logo, .m-pills, .m-pill,
#mobileTabBar, #mobileTabBar button
```

When a literal lies between two scale steps (the 10/14 "off-grid" cases), default to **rounding down** unless that would visibly cramp the layout — in which case round up and note the swap in a code comment.

**Verify (AC4)** — for the audited selectors, no raw pixel padding/margin/gap should remain. Spot-check:

```bash
# Quick spot for the most-renamed selectors:
awk '/^\s*\.(card|emby-card|a-stat|a-head|topbar|tb-stat|nav-item|m-pills|m-pill)\b/{flag=1} flag{print NR": "$0; if(/}$/){flag=0; print "---"}}' worker.js | grep -E '(padding|gap|margin):\s*[0-9]+px' | head -40
```
Expected: empty (or only `0` values).

## Step 5 — Type-scale migration (AC5)

5.1 Audit:

```bash
grep -nE 'font-size:\s*[0-9]+px' worker.js | head -80
```

5.2 Map each to `var(--text-*)` per design.md. Notable swap: `.a-stat-val { font-size: 19px }` → `var(--text-2xl)` (= 20px). This is the only off-grid type literal; verify the stat grid still fits at 360px mobile width (3-column layout). If a column overflows, narrow the label, do not regress the type token.

5.3 The mobile no-zoom anchor (16px inputs) MUST stay 16px exactly — `var(--text-xl)` resolves to 16px so this is preserved by definition. Sanity-check inside the `@media (max-width: 768px)` block.

**Verify (AC5)**
```bash
grep -nE 'font-size:\s*[0-9]+px' worker.js
```
Expected: zero outside the token block.

## Step 6 — Icon-button consolidation (AC7)

6.1 Rewrite `.icon-btn` to the new spec from `design.md`. Add `.icon-btn.is-sm`, `.icon-btn.is-md`, `.icon-btn.is-lg`, `.icon-btn.is-danger-hover`, `.icon-btn.is-shadow` modifiers.

6.2 Convert `.a-icon-btn` and `.tb-icon-btn` to alias selectors. Two acceptable forms:

```css
/* form A — group selector */
.icon-btn, .a-icon-btn, .tb-icon-btn { /* base rules */ }
.icon-btn.is-sm, .a-icon-btn.is-sm, .tb-icon-btn.is-sm { width: 28px; height: 28px; }
```

or

```css
/* form B — keep separate rules but force them to use the same tokens */
.a-icon-btn { /* rewrite to consume the same tokens as .icon-btn default */ }
.tb-icon-btn { /* rewrite ditto */ }
```

Form A is preferred (single source of truth). Pick form A unless a specific override in `.a-icon-btn` (e.g. its current border style) is intentional and worth preserving — in which case use form B.

6.3 Update the line-1231 logout button's inline `style="width:28px;height:28px;"` → remove the inline style, add `class="icon-btn is-sm is-danger-hover"` (or whatever class was there + the new modifier).

6.4 Audit other inline icon-size overrides:

```bash
grep -nE 'style="[^"]*\b(width|height):\s*\d+px' worker.js
```

Replace each with the appropriate `.icon-btn.is-*` modifier.

**Verify (AC7)** — `.a-icon-btn { ... }` no longer has its own width/height/border/radius/background declarations; it either shares the rule with `.icon-btn` or inherits via alias.

## Step 7 — Inline-style cleanup (AC10)

7.1 Apply the substitutions from `design.md` "Inline-style cleanup":

- Line 1138 danger card → add class `is-danger-highlight`, declare the rule in `CSS_COMMON`.
- Line 1147 deploy button → wrap in `.danger-card-foot { display:flex; justify-content:flex-end; }`.
- Line 1216 placePill `cursor:pointer` → `.tb-stat.is-clickable`.
- Line 1231 logout sizing → handled in Step 6.

7.2 Audit any remaining geometric inline styles in `HTML_UI` / `LOGIN_UI`:

```bash
sed -n '1043,3200p' worker.js | grep -nE 'style="[^"]*\b(padding|margin|gap|width|height|border-radius|background:\s*#|color:\s*#)'
```

For each surviving hit: either move to a class, or annotate why it's necessary (a small handful may legitimately stay — e.g. JS-driven inline transforms, the chart container height, the topbar-spacer flex behavior).

**Verify (AC10)** — the audit's output is either empty or all entries are JS-driven dynamic states / class-driven CSS variable assignments.

## Step 8 — Mobile touch targets (AC9)

8.1 Inside the `@media (max-width: 768px)` block(s), add:

```css
.icon-btn, .a-icon-btn, .tb-icon-btn, .btn-tier { min-height: var(--touch-min); }
.icon-btn.is-sm, .a-icon-btn.is-sm, .tb-icon-btn.is-sm { min-width: var(--touch-min); }
```

8.2 Verify the mobile tab bar buttons (`#mobileTabBar button`) and the mobile-mode pill (`.m-pill`) already reach 44px; if not, bump.

8.3 Confirm the topbar at mobile widths still fits horizontally with 44px-tall icon buttons (the topbar's height needs to accommodate). Adjust `.topbar { padding: ... }` if needed.

## Step 9 — Sibling-parity sweep (AC8)

9.1 Verify both `.card` and `.emby-card` use `padding: var(--space-6)`. If a card-internal child currently uses 20px because the parent's padding was 20px, recompute and update.

9.2 Confirm `.a-stat` columns share equal horizontal padding — today `:first-child` has `padding-left: 2px`. Either remove this asymmetry (preferred) or document why (e.g. visual centering of the first stat label).

9.3 Verify `.a-thumb` (38×38) and `.emby-icon` (42×42) — these are intentionally different (one is a thumbnail with image, the other an icon glyph), so document this in a brief code comment, not refactor.

## Step 10 — Spec update (AC11)

10.1 Edit `.trellis/spec/frontend/ui-design-system.md`. Add a new top-level section "Alignment system (v2.2.0)" after the dashboard shell section. Include:

- The token tables (spacing, type, radius, status, primary alpha, touch).
- The icon-button family (sizes, intents).
- The migration rule: new code must consume `var(--space-*)` / `var(--text-*)` / `var(--radius-*)` / status tokens / primary-alpha tokens. Raw px is reviewable as a regression.
- Backward-compat note: legacy classes (`.btn-submit`, `.btn-edit`, `.btn-del`, `.btn-dns`, `.a-btn-edit`) remain functional but are not extended.

10.2 Bump `CURRENT_VERSION` in `worker.js` (line ~3) per the existing bump rule for material `CSS_COMMON` changes.

10.3 Update `.trellis/spec/frontend/index.md` if it has a version-summary line for `ui-design-system.md`.

## Step 11 — Regression smoke check (AC12)

Run `npx wrangler dev worker.js` (or whatever launch command this repo uses — check `.trellis/spec/guides/` and `package.json` if present, otherwise just open the rendered HTML by deploying a preview).

Walk through each surface and confirm no visual regression vs. `main`:

- [ ] Login page: layout, login button hover, version footer.
- [ ] Admin overview section: cards align, node grid alignment, ping-badge hover.
- [ ] Speed section: speedtest button state, edge info chip.
- [ ] Stats section: charts render (Chart.js lazy init), log table baseline.
- [ ] Settings section: form rows, upstream chips, headers editor (KV rows + cURL modal).
- [ ] Tools section: action buttons.
- [ ] Danger bar: sticky bottom, no overlap.
- [ ] Theme cycle: auto → light → dark → auto. Icon updates per state.
- [ ] Sidebar collapse / expand. Mobile tab bar visibility on resize.
- [ ] Mobile (DevTools 390×844): tab bar 5 tabs, pills mirror live, no zoom on input focus, Face ID toast.
- [ ] Mobile landscape: tab bar adapts.

## Review gates

| Gate | When | What |
|---|---|---|
| G1 | After Step 3 | `grep` audits for AC2, AC3, AC6 all return zero — confirm before continuing Step 4. |
| G2 | After Step 6 | Manual visual diff at desktop on `overview` section — icon-button consolidation is the riskiest visual change. |
| G3 | After Step 8 | Mobile portrait + landscape walkthrough — touch-target bumps can cascade into row overflow. |
| G4 | After Step 11 | Full smoke list completed before commit. |

## Rollback points

- After Step 1 — token block is purely additive; revert by deleting the appended tokens.
- After Step 6 — icon-button consolidation is the largest cross-section change; if regressions appear, revert this step alone and ship the rest.
- After Step 11 — final rollback = revert the single commit on `main`.

## Definition of done

- All 12 ACs in `prd.md` checked.
- All `grep` audits in Steps 2–5 return zero.
- All four review gates pass.
- `ui-design-system.md` updated with the v2.2.0 alignment system section.
- `CURRENT_VERSION` bumped.
- Single commit on `main` with message `Add design tokens + align rhythm across admin + mobile`.

---

## Addendum — v2.3.0 "Aurora Console" visual pass

Extension after v2.2.0 token plumbing landed: user reported "I don't see any
difference" because v2.2.0 was a pure refactor (tokens substituted in-place,
zero visual delta). v2.3.0 layers in distinctive identity on top of the token
foundation.

### Concrete deltas in `worker.js`

1. **New tokens** (in `:root` and `body.dark`):
   `--aurora-grad`, `--aurora-grad-soft`, `--topbar-glass`,
   `--card-shadow-lift`, `--card-shadow-hover`.
2. **Sidebar brand**: radial aurora-soft backdrop via `::before`;
   `.sidebar-logo` now uses `--aurora-grad`.
3. **Nav active state**: vertical 3px gradient accent bar via `::before`
   (Linear-style). Replaces previous filled `accent-glow` background.
4. **Topbar**: frosted glass (`--topbar-glass` + `backdrop-filter: blur(14px)
   saturate(140%)`) plus bottom-edge primary-ring stripe via `::after`.
5. **Primary button (`.btn-submit`)**: aurora gradient sweep on hover
   (`background-position` transition 0% → 100%).
6. **Cards**: layered shadow via `--card-shadow-lift` (inset highlight +
   tight + soft drop) for real physical depth.
7. **Stat values**: `font-variant-numeric: tabular-nums` on `.a-stat-val` and
   `.topbar .tb-stat .val`.
8. **NEW component — Aurora KPI hero band** (`.aurora-hero` + `.kpi-tile`):
   - 4-tile bento grid (1.5fr / 1fr / 1fr / 1fr).
   - `.kpi-tile.is-primary` carries `--aurora-grad` + radial light overlay
     + animated SVG sparkline (`.kpi-spark`).
   - Health tile shows animated gradient progress bar
     (`.kpi-health-bar > span` width transition with `--aurora-grad` fill).
   - Responsive: 2-col at 980px, 1-col at 520px.
   - Injected as the first child of `#sec-overview`, before existing
     "已反代的媒体库" card.
9. **JS wiring**: new `updateAuroraKpis()` function reads existing topbar
   IDs (`tb-traffic-today`, `rttValue`) and node-list state to populate
   the hero. Hooked into `updateTopbarHealth()` and `initMobilePills().sync`
   so it refreshes on every data update — no new fetch cycles.
10. **Version**: `CURRENT_VERSION` bumped `2.2.0 → 2.3.0`.

### Smoke list for v2.3.0

- [ ] Overview loads with 4 KPI tiles visible above "已反代的媒体库" card.
- [ ] Primary KPI tile is gradient (blue → purple) with sparkline at bottom.
- [ ] Active nav item shows vertical gradient bar on left, no fill border.
- [ ] Topbar shows subtle frosted-glass effect when scrolling content under it.
- [ ] Primary submit buttons sweep gradient on hover.
- [ ] Sidebar brand area has soft aurora glow behind logo.
- [ ] Health bar inside KPI tile animates to current health %.
- [ ] All stat digits use tabular figures (no width jump on refresh).
- [ ] Mobile (≤520px) collapses hero to single column.
- [ ] Dark mode: gradients still distinctive, cards keep rim light.
- [ ] No console errors; no broken layouts on 1280px / 768px / 390px viewports.

### Spec update

`.trellis/spec/frontend/ui-design-system.md` should gain an "Aurora system v2.3.0"
section documenting: the new gradient tokens, the `.aurora-hero` / `.kpi-tile`
component contract, glass topbar pattern, and the convention that `kpi-tile.is-primary`
is reserved for one tile per hero band (avoid gradient overload).

### Addendum-2 — Danger zone relocation

User feedback after v2.3.0 hero band shipped: "that danger bar mode can place
in another tab inside bar". Translated: move the sticky-bottom destructive
actions strip into its own sidebar tab.

Changes:

- **Removed** `<div class="danger-bar">…</div>` (sticky bottom strip below
  `.content`) and its CSS (`.danger-bar`, `.db-title`, `.db-dot`, `.db-sub`,
  `.db-spacer`) including the mobile-responsive override.
- **Added** a new sidebar nav entry "危险区" with warning-triangle SVG and
  `.is-danger-tab` modifier (red text, red active accent bar, red soft hover).
- **Added** `<section id="sec-danger" data-section="danger">` containing:
  - `.danger-hero` — gradient-tinted header with icon block, title, subtitle.
  - `.danger-list` — three full-disclosure `.danger-card`s (one per action:
    purge cache, deploy worker, logout) with title + description + button.
    Left border-accent in `--err`, hover lift, mobile stacks vertical.
- **Behavior**: `showSection('danger')` is data-driven via the existing
  `data-section` plumbing — no JS wiring needed beyond the nav button's
  inline `onclick`.

Rationale: the sticky bar competed for visual weight with the new Aurora
hero band and reduced the canvas for the overview content. A dedicated tab
is also safer — destructive actions now require an intentional navigation
step, not a one-click reach from any view.

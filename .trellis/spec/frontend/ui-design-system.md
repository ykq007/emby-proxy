# UI Design System (v2.5.1)

Introduced by the UI Suggestions implementation. Applies to the admin panel rendered from `HTML_UI` in `worker.js`.

## Dashboard shell layout (v2.1.0)

The admin panel is a sidebar-nav dashboard, not a single scrolling column. Structure:

```
<body>
└── .app-shell                         (flex shell; body gets .shell-on → drops old padding)
    ├── <aside class="sidebar">         (brand + nav-item list + collapse button + version)
    └── .app-main
        ├── <header class="topbar">     (#cf-trace-card kept as id; status pills + admin area)
        ├── .content
        │   └── <section id="sec-*">    (overview / speed / stats / settings / tools)
        └── .danger-bar                 (sticky bottom; danger zone, always visible)
```

### Section navigation

- Only one `<section id="sec-*">` is visible at a time; non-active sections are `display:none`.
- `showSection(key)` toggles the section + `.nav-item.is-active`, persists to `localStorage('emby_active_section')`, syncs the mobile tab bar, and scrolls to top. `key` ∈ `overview|speed|stats|settings|tools`.
- `.nav-item` elements carry `data-section` and call `showSection(...)` on click.
- `toggleSidebar()` toggles `.sidebar.collapsed`, persists to `localStorage('emby_sidebar_collapsed')`.
- Adding a new area = add a `.nav-item`, a matching `<section id="sec-X">`, and a `showSection` case. Do not reintroduce modal overlays for primary content.

### Data stats is inline, not a modal

`#dashboardModal` was removed. Charts/logs (`#trendChart`, `#locationChart`, `#logTableBody`) live inside `section#sec-stats`. `openDashboard()` → `showSection('stats')`; `closeDashboard()` → `showSection('overview')`. Chart.js instances are **lazy-initialized on first entry** to `sec-stats` (a hidden section has zero size, so eager init produces broken charts), and `chart.resize()` is called on re-entry. Data loading lives in `loadDashboardData()`.

## Three-state theme

Theme has three states stored in `localStorage('emby_theme')`: `auto` (default) / `light` / `dark`.

- `auto` follows `window.matchMedia('(prefers-color-scheme: dark)')` and listens for its `change` event.
- The applied state is still the `body.dark` class toggle, driving the `--*` CSS variables in `:root` (light) and `body.dark` (dark).
- `toggleDarkMode()` cycles the three states; `#themeToggle` updates its icon/title per state.
- Legacy key `emby_proxy_dark` is migrated once on load, then removed. Do not read it for new code.

## Node status badge & sparkline

Node cards (`.route-item`) render a status badge and an inline-SVG mini trend chart:

- `nodeBadgeHtml(statusClass)` → `<span class="node-badge is-*">`. States: `live`→在线, `warn`→延迟, `offline`→离线, anything else (incl. `idle`)→空闲 (neutral grey — an un-pinged node is idle, **not** offline). `pingNode` rewrites the badge class from real ping latency.
- `nodeSparklineHtml(points)` → inline `<svg><polyline>`. No per-card Chart.js instance (perf). Renders a "暂无趋势数据" placeholder when no trend array is present; the routes API does not currently return trend data.

## Button tiers

Four utility classes layered on `.btn-tier`. Apply at most one tier per button. Mix sparingly: at most one Primary per visible region; Success is for "推进确认" only; Danger is for irreversible actions only; Default for everything else.

```html
<button class="btn-tier is-primary">保存并部署</button>
<button class="btn-tier is-success">提交选中至 DNS</button>
<button class="btn-tier is-danger">刷新全站海报</button>
<button class="btn-tier">导出配置</button>
<button class="btn-tier is-sm">紧凑按钮</button>
```

Do NOT add inline `style="background:#xxx"` overrides on `.btn-tier` buttons. If a new color is needed, add a new tier variant in `CSS_COMMON` first.

Legacy `.btn-submit` still exists for login/dashboard/upgrade buttons that pre-date the tier system; do not retrofit them in a single sweep.

## Dropdown menus

For long-tail actions, use `.menu-wrap > .menu` instead of stacking colored buttons:

```html
<div class="menu-wrap">
  <button type="button" class="btn-tier" onclick="toggleMenu(this)">更多 <svg><use href="#i-chevron"/></svg></button>
  <div class="menu">
    <button onclick="doX(); closeAllMenus();">动作 X</button>
    <hr/>
    <button class="danger" onclick="doDelete(); closeAllMenus();">破坏性动作</button>
  </div>
</div>
```

Helpers `toggleMenu(btn)` and `closeAllMenus()` live in the main `<script>` block; a document-level click listener handles click-away.

## Sectioned form

Multi-section forms use the `.a-*` family:

```
.a-form
├── .a-fieldset
│   ├── .a-fieldset-head (.a-field-label + .a-field-aux)
│   └── .a-row | .a-upstream-row | custom content
└── .a-footer (.a-footer-aux + .a-footer-actions)
```

Upstream/backup rows pair a small `.a-tag-pri` (主源) or `.a-tag-bk` (备 N) chip with `.a-input`. Append rows with `makeUpstreamRow(idx, value)`.

## HeadersEditor module

A vanilla-JS KV editor for `custom_headers`. Serializes to the legacy `Key: Value\n...` format; backend code (D1 schema, `/api/routes` POST, per-request header injection) is unchanged.

```js
HeadersEditor.init(initialString)   // boot
HeadersEditor.set(str)              // when editing an existing node
HeadersEditor.get()                 // when submitting the form (returns serialized string)
HeadersEditor.addRow(k?, v?, on?)
HeadersEditor.insertTemplate(k, v)  // dedup-aware; toasts if key exists
HeadersEditor.openCurlModal() / parseCurl() / closeCurlModal()
```

Sensitive keys (`Authorization`, `Cookie`, `X-Api-Key`, `X-Auth-Token`, `X-Emby-Token`, `Token`) auto-mask their value column. Disabled rows are excluded from `serialize()`. Lines starting with `#` are treated as comments and dropped.

The DOM contract is:

```html
<div class="hed" id="hed-editor">
  <div class="hed-head">…column headers…</div>
  <div class="hed-list" id="hed-list"></div>   <!-- editor renders rows here -->
  <div class="hed-footer">…add button + meta…</div>
  <div class="templates">…template chips + cURL chip…</div>
</div>
<span id="hed-count">0</span>   <!-- optional live counter -->
```

The cURL modal markup lives at the end of `<body>` as `<div class="curl-modal-bg" id="curlModal">`.

## SVG icon sprite

Reusable line icons live in a hidden inline sprite near the top of `<body>`:

| Symbol id | Use |
|-----------|-----|
| `#i-plus` | "+ 添加 …" buttons |
| `#i-x` | row delete, modal close |
| `#i-save` | save / submit buttons |
| `#i-download` / `#i-upload` | export/import |
| `#i-chevron` | dropdown toggle |
| `#i-more` | overflow menu trigger |
| `#i-eye` / `#i-eye-off` | mask toggle for sensitive header values |

Reference via `<svg><use href="#i-plus"/></svg>`. Do not paste new copies of these paths inline; extend the sprite instead.

## When to bump `CURRENT_VERSION`

`CURRENT_VERSION` (line ~3) is compared against the GitHub raw `// VERSION:` header by the in-panel updater. Bump it whenever the rendered `HTML_UI` or `CSS_COMMON` materially changes so users see "发现新版本".

## Mobile adaptation

iOS-style mobile UI lives primarily inside `@media (max-width: 768px)` blocks in `CSS_COMMON`. Mobile-only chrome (5-tab bar, sheet detents, topbar collapse, safe-area padding) MUST stay scoped to the MQ — never edit a non-media rule to adjust mobile-only behavior.

> **v2.5.0 exception**: Selected iOS components (`.ios-page-header`, `.ios-large-title`, `.ios-sub`, `.ios-form-group`, `.ios-form-row`, `.skeleton`) have been **promoted** to cross-viewport scope so desktop and mobile share one design language. See *iOS-native system v2.5.0 — desktop port* below for the promote-out-of-MQ pattern and which components qualify.

Required structural pieces (rendered for all viewports; CSS hides them on desktop):

- `<nav id="mobileTabBar">` near `</body>` — bottom Tab Bar. v2.4.0: **5 slots** (`home / speed / stats / settings / more`). Each button carries **both** `.ico-outline` and `.ico-filled` SVGs; the active button swaps which is displayed (iOS HIG pair). The `more` tab does NOT call `showSection`; it calls `openMoreSheet()`. The other four call `showSection(...)` via the tab→section map. `showSection` keeps the tab bar's `.active` state in sync, mapping `tools|danger → more` so the 更多 slot stays lit while inside an overflow section.
- `<div id="moreSheet">` (v2.4.0) — iOS action sheet sibling of `#mobileTabBar`. Hosts every section that doesn't fit in the 4 main tab slots (currently `tools` + `danger`, with `danger` rendered via `.more-sheet-row.is-danger`). Slides in via `transform: translateY(100%) → 0` on `.is-open`, with an `::before` backdrop scrim. Closing helpers: `window.openMoreSheet()` / `window.closeMoreSheet()`; ESC + backdrop click both close.
- `<div class="m-pills" id="mobilePills">` — v2.4.0: **2×2 grid** (`RTT / 健康 / 模式 / 今日`), no longer a horizontal scroller. Mirrored from `#rttValue`, `#tb-health-val`, `#placeModeLabel`, `#trafficToday` via a `MutationObserver` in `initMobilePills()`. Note `#trafficToday` only fills after `sec-stats` is opened (charts are lazy-loaded), so the 今日 cell is blank until then by design — no fabricated value.
- `<div id="mobileTopbarCompact">` (v2.4.0) — sticky 44px bar that fades in once the active section's `.ios-page-header` scrolls out of view (driven by `body.is-scrolled`). Text content is set per section from `window.__iosSectionTitles[key]`. **v2.5.0**: on desktop, the equivalent slot is `<span class="tb-section-title" id="tbSectionTitle">` inside `.topbar-spacer` — `syncCompactBarTitle()` / `showSection()` populate both elements so the same source of truth drives mobile + desktop title display.
- Per-section `<header class="ios-page-header">` (v2.4.0) — large title + sub, prepended to every `.app-section` by `injectSectionHeaders()` on boot. Title/sub mapping lives in the `IOS_SECTION_TITLES` const inside the mobile chrome IIFE. **v2.5.0**: `injectSectionHeaders()` skips sections that already own a custom hero (`.app-section[data-section="danger"]` has `.danger-hero`) — adding a generic large title on top would double the section heading.
- `<div id="iosLogoutGroup">` (v2.4.0) — auto-injected inset-grouped logout row inside `data-section="settings"`. Triggers `confirm(...)` before calling `logout()`. The legacy `.topbar-user > .tb-icon-btn.danger` logout button is hidden on mobile by the v5 topbar collapse rule. **v2.5.0**: `#iosLogoutGroup` has an outside-MQ `display: none` default + a mobile-MQ `display: block` override so the runtime-injected mobile chrome does not leak onto desktop Settings (which already has the topbar logout).

Other mobile rules to preserve:

- `body` keeps `padding-bottom: calc(72px + env(safe-area-inset-bottom))` so the Tab Bar never overlaps content.
- `#addForm #submitBtn` is `position: sticky; bottom: calc(72px + env(safe-area-inset-bottom))` so the save CTA stays above the Tab Bar.
- All inputs/selects/textareas use `font-size: 16px` to prevent iOS Safari zoom on focus.
- Tables convert to stacked cards via `td::before { content: attr(data-label); }`; new `<td>`s must include `data-label`.

`LOGIN_UI` has a parallel mobile experience: `.login-logo` (gradient block with zap SVG) and `.login-faceid` (secondary button) are in the DOM but `display: none` on desktop. The Face ID button is UI-only; its `onclick="faceIdHint()"` just toasts "Face ID 暂未启用" — no WebAuthn integration.

## Alignment system (v2.2.0)

A token layer was added on top of the existing color/radius tokens to enforce consistent rhythm across the admin shell, login, and mobile. **New CSS in `CSS_COMMON` must consume these tokens — raw px values in `padding`, `margin`, `gap`, `font-size`, `border-radius`, and status/primary alpha are reviewable as regressions.**

### Spacing scale (8-pt grid + 3 half-steps)

```
--space-1: 4px    --space-2: 8px    --space-3: 12px    --space-4: 16px
--space-5: 20px   --space-6: 24px   --space-7: 32px    --space-8: 48px
--space-1-5: 6px  --space-2-5: 10px --space-3-5: 14px   (half-steps; dense regions only)
```

Half-steps cover legitimate optical compaction (icon paddings, inline-row gaps, dense button shorthands). Prefer whole steps in new code. Sub-grid micro values (1–7 px excluding 4/6) remain literal — they're optical adjustments, not system rhythm.

### Type scale

```
--text-2xs: 9px    --text-xs: 11px   --text-sm: 12px    --text-md: 13px
--text-base: 14px  --text-lg: 15px   --text-xl: 16px    --text-2xl: 20px   --text-3xl: 28px
```

`--text-xl` is the iOS no-zoom anchor (16px); never change this value. `--text-2xl` replaced the previous off-grid `19px` for `.a-stat-val`.

### Radius scale

```
--radius-sm: 6px    --radius-md: 8px    --radius-lg: 12px
--radius-xl: 14px   --radius-2xl: 16px  --radius-pill: 999px
--radius-card: var(--radius-2xl)   (alias, preserved for backward compatibility)
```

Cards (`.card`, `.emby-card`, `.curl-modal`, `.tb-bar` etc.) all use `--radius-2xl` or `--radius-xl`. Buttons + icon buttons use `--radius-md`. Chips, badges, pills, toasts use `--radius-pill`.

### Status + primary alpha tokens

```
--ok / --warn / --err              (solid status colors — existing)
--ok-soft / --warn-soft / --err-soft   (10% alpha background fills)
--ok-ring / --warn-ring / --err-ring   (20% alpha borders / focus rings)
--primary-soft  (10%)   --primary-ring (20%)   --primary-glow (32%)
--accent-glow = var(--primary-glow)  (alias)
```

**Never** write a raw status hex (`#34c759`, `#ff3b30`, `#ff9500`, dark-mode variants) or a `rgba(0,113,227,*)` / `rgba(47,155,255,*)` inside a component rule — pick the closest token. Dark-mode overrides are already wired inside `body.dark`, so component rules don't need theme branches.

**v2.5.1 sweep**: three lingering bypasses were eliminated — `.tb-icon-btn:hover box-shadow` (now `var(--primary-ring)`), `LOGIN_UI body::before` decorative glow (now `var(--primary-glow)` + `transparent`), and the Chart.js trend dataset (now reads `--primary` / `--primary-soft` via `getComputedStyle(document.documentElement)` at both chart construction and `updateChartColors()`).

**Pattern: Chart.js color tokens** — Chart.js datasets are constructed once and cached, so they don't inherit live CSS-var changes the way DOM nodes do. Read tokens explicitly:

```js
const cs = getComputedStyle(document.documentElement);
const primary     = (cs.getPropertyValue('--primary')      || '#0071e3').trim();
const primarySoft = (cs.getPropertyValue('--primary-soft') || 'rgba(0,113,227,0.1)').trim();
new Chart(ctx, { data: { datasets: [{ borderColor: primary, backgroundColor: primarySoft, /* … */ }] } });
```

On theme toggle, also write the new values into `chartInstance.data.datasets[i]` and call `chart.update()` (or do it inside the existing `updateChartColors()` helper). The fallback literal is kept so a chart still renders if the CSS var is missing at boot.

### Touch token

```
--touch-min: 44px
```

Inside `@media (max-width: 768px)`, all primary interactive elements (`.btn-tier`, `.icon-btn`, `.a-icon-btn`, `.tb-icon-btn`, `.btn-submit`, `.btn-edit`, `.btn-del`, `.btn-dns`, `.a-btn-edit`) have `min-height: var(--touch-min)`; icon buttons also get `min-width: var(--touch-min)`. Exception: `.a-detail-actions .a-icon-btn` may stay 32×32 (it's inside an already-large card row).

### Icon button family

Three intent classes share a single base ruleset and three size modifiers:

```html
<button class="icon-btn">…</button>           <!-- generic ghost-bordered (alias of .a-icon-btn) -->
<button class="a-icon-btn">…</button>          <!-- node-card / table action -->
<button class="tb-icon-btn">…</button>         <!-- topbar borderless, hover-revealed border -->

<button class="a-icon-btn is-sm">…</button>    <!-- 28x28 -->
<button class="a-icon-btn">…</button>          <!-- 32x32 (default) -->
<button class="a-icon-btn is-lg">…</button>    <!-- 36x36 -->

<button class="a-icon-btn danger-hover">…</button>   <!-- red on hover -->
<button class="tb-icon-btn danger">…</button>        <!-- topbar variant -->
```

Do NOT set `width` / `height` inline on icon buttons — use the `.is-sm/md/lg` modifiers.

### Utility classes

| Class | Use |
|---|---|
| `.card.is-danger-highlight` | Centered modal-style card with danger left-border and lifted shadow (used by the Worker-update modal) |
| `.row-end` + `.row-end-spacer` | Flex row that pushes one child to the right edge (replaces `style="margin-left:auto"`) |
| `.tb-stat.is-clickable` | Adds `cursor: pointer` to a topbar stat that's actually interactive (e.g. `#placePill`) |

### Legacy classes (deprecated, but functional)

`.btn-submit`, `.btn-edit`, `.btn-del`, `.btn-dns`, `.a-btn-edit`, and the bare `.icon-btn` (now aliased to `.a-icon-btn`) remain renderable for existing markup. New code uses `.btn-tier` (with `.is-primary` / `.is-success` / `.is-danger` / `.is-sm`) and `.a-icon-btn` / `.tb-icon-btn` directly.

### Audit commands (regression gates)

```bash
# Status hex outside the token block — must be empty
awk 'NR>=55 && NR<=1065' worker.js | grep -nE '#(34c759|ff9500|ff3b30|30d158|ff9f0a|ff453a)\b'

# Primary rgba outside the token block — must be empty
awk 'NR>=55 && NR<=1065' worker.js | grep -nE 'rgba\((0,113,227|47,155,255)'

# border-radius literals inside CSS_COMMON — must be empty
awk 'NR>=55 && NR<=1065' worker.js | grep -nE 'border-radius:\s*[0-9]+px'

# font-size literals inside CSS_COMMON — must be empty
awk 'NR>=55 && NR<=1065' worker.js | grep -nE 'font-size:\s*[0-9]+px'
```

Run these before bumping `CURRENT_VERSION` whenever you touch `CSS_COMMON`.

---

## Aurora system v2.3.0 — distinctive visual identity

Built on top of the v2.2.0 alignment tokens. Adds **brand identity** (gradient,
glass, layered depth) and one new component pattern (Aurora KPI hero band).
Goal: same token discipline, visibly different surface.

### New tokens

Defined in both `:root` (light) and `body.dark` blocks of `CSS_COMMON`.

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `--aurora-grad` | `linear-gradient(135deg, #0071e3 0%, #5856d6 55%, #af52de 110%)` | `linear-gradient(135deg, #2f9bff 0%, #6e6ad9 55%, #c47ce0 110%)` | Brand gradient fill: `.sidebar-logo`, `.kpi-tile.is-primary`, `.btn-submit`, nav active accent bar |
| `--aurora-grad-soft` | `radial-gradient(120% 80% at 0% 0%, rgba(88,86,214,0.10), transparent 60%)` | `radial-gradient(140% 90% at 0% 0%, rgba(47,155,255,0.18), transparent 65%)` | Soft brand backdrop: `.sidebar-brand::before` |
| `--topbar-glass` | `rgba(255,255,255,0.72)` | `rgba(14,17,25,0.68)` | Frosted topbar background. Paired with `backdrop-filter: saturate(140%) blur(14px)` |
| `--card-shadow-lift` | `0 1px 0 rgba(255,255,255,0.55) inset, 0 1px 2px rgba(15,23,42,0.04), 0 10px 28px -12px rgba(15,23,42,0.12)` | `0 0 0 1px rgba(255,255,255,0.03) inset, 0 10px 30px -10px rgba(0,0,0,0.55)` | Default card depth — used by `.card`, `.kpi-tile`, `.danger-card` |
| `--card-shadow-hover` | `0 1px 0 rgba(255,255,255,0.55) inset, 0 4px 10px rgba(15,23,42,0.05), 0 18px 38px -12px rgba(15,23,42,0.18)` | `0 0 0 1px var(--primary-ring) inset, 0 14px 38px -10px rgba(0,0,0,0.7)` | Hover-lift card depth |

**Rule**: every aurora token MUST be defined in both `:root` and `body.dark`. No `var(--aurora-*)` may reference a token absent from either mode.

### Pattern: Aurora KPI hero band (`.aurora-hero`)

**Problem**: dense data dashboards need a "hero band" that summarizes core
metrics at a glance and gives the view a visual anchor.

**Solution**: 4-tile bento grid above the main content of a section. Exactly
one tile uses the brand gradient; the rest are neutral. Sparkline / progress
bar / unit-suffixed numbers carry the secondary visual interest.

```html
<div class="aurora-hero" aria-label="核心指标">
  <div class="kpi-tile is-primary">
    <div class="kpi-label">在线节点</div>
    <div class="kpi-value-row">
      <span class="kpi-value" id="kpi-online-nodes">--</span>
      <span class="kpi-unit">/ <span id="kpi-total-nodes">--</span></span>
    </div>
    <div class="kpi-sub">实时反代节点活跃度</div>
    <svg class="kpi-spark" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true">
      <path class="ks-area" d="…Z"/>
      <path class="ks-line" d="…"/>
    </svg>
  </div>
  <div class="kpi-tile">…</div>   <!-- neutral tiles -->
  <div class="kpi-tile">…</div>
  <div class="kpi-tile">…</div>
</div>
```

**Contract**:

| Element | Required | Notes |
|---|---|---|
| `.aurora-hero` | yes | Grid: `1.5fr 1fr 1fr 1fr`, gap `var(--space-4)`. Add `aria-label` describing the metrics it summarizes. |
| `.kpi-tile` | yes | Min-height `124px`. Inherits `var(--card-shadow-lift)` / `--card-shadow-hover`. |
| `.kpi-tile.is-primary` | ≤ 1 per band | Gradient fill via `--aurora-grad`. Reserved for the single most important metric. **Never** use on more than one tile per hero band — gradient overload destroys hierarchy. |
| `.kpi-label` | yes | Uppercase, `letter-spacing: 0.10em`, `var(--text-xs)` weight 700. |
| `.kpi-value` | yes | `34px` weight 700, `font-variant-numeric: tabular-nums` (mandatory — digits must not jump on refresh). |
| `.kpi-unit` | optional | Trails value with `var(--space-2)` gap; baseline-aligned. |
| `.kpi-sub` | optional | One-line caption under value. |
| `.kpi-spark` | optional, primary tile only | SVG `viewBox="0 0 240 44"` `preserveAspectRatio="none"`. Two path classes: `.ks-area` (filled `rgba(255,255,255,0.18)`) and `.ks-line` (stroked `rgba(255,255,255,0.92)` width 1.6). Positioned absolute bottom. |
| `.kpi-health-bar > span` | optional | Animated progress (`width` transition, gradient fill via `--aurora-grad`). Set the inner `span`'s `style.width` in JS. |

**Responsive breakpoints**:

| Width | Layout |
|---|---|
| `≥ 981px` | 4 columns, primary tile is wider (1.5fr) |
| `≤ 980px` | 2 columns; `.kpi-tile.is-primary` spans full width |
| `≤ 520px` | 1 column; values shrink to `28px` |

**JS wiring**: pull values from existing DOM (topbar `id`s like `tb-traffic-today`,
`rttValue`, `#list-grid .emby-card .node-badge`) — never start a new fetch loop.
Hook into existing refresh cycles (`updateTopbarHealth()`, `initMobilePills().sync`)
so the hero stays in sync without new state.

### Pattern: Glass topbar

```css
.topbar {
  background: var(--topbar-glass);
  backdrop-filter: saturate(140%) blur(14px);
  -webkit-backdrop-filter: saturate(140%) blur(14px);
  position: sticky; top: 0; z-index: 90;
}
.topbar::after {                    /* primary-ring bottom stripe */
  content: ''; position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-ring), transparent);
  opacity: 0.55; pointer-events: none;
}
```

`position: sticky` establishes the containing block for the absolutely-positioned
`::after`. The `--topbar-glass` token is intentionally semi-transparent — using
the solid `--topbar-bg` here would defeat `backdrop-filter`.

### Pattern: Linear-style nav active accent

```css
.nav-item { position: relative; }
.nav-item.is-active {
  color: var(--primary);
  background: linear-gradient(90deg, var(--primary-soft), transparent 80%);
  border-color: transparent;
}
.nav-item.is-active::before {
  content: ''; position: absolute;
  left: -1px; top: 9px; bottom: 9px;
  width: 3px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--aurora-grad);
  box-shadow: 0 0 12px var(--primary-glow);
}
.sidebar.collapsed .nav-item.is-active::before { left: 0; top: 6px; bottom: 6px; }
```

**Don't** use a filled background or a colored border for the active state —
the vertical accent bar is the canonical signal. Collapsed-sidebar state needs
its own `::before` offsets because the `.nav-item` padding changes.

### Pattern: Danger zone tab (replaces deprecated `.danger-bar`)

**Deprecation**: the sticky bottom `.danger-bar` strip is REMOVED. Don't use
`.danger-bar`, `.db-title`, `.db-dot`, `.db-sub`, or `.db-spacer` in new code.

**Replacement**: destructive actions live in a dedicated `data-section="danger"`
panel reachable from a sidebar nav entry with `.is-danger-tab`.

```html
<!-- Sidebar entry -->
<button class="nav-item is-danger-tab" data-section="danger" onclick="showSection('danger')">
  <svg viewBox="0 0 24 24">…triangle-warning…</svg>
  <span>危险区</span>
</button>

<!-- Section body -->
<section id="sec-danger" class="app-section" data-section="danger">
  <div class="danger-hero">
    <div class="dh-icon">…</div>
    <div class="dh-text">
      <h2 class="dh-title">危险操作区</h2>
      <div class="dh-sub">以下操作不可逆，请确认理解每项影响后再执行。</div>
    </div>
  </div>
  <div class="danger-list">
    <div class="danger-card">
      <div class="dc-body">
        <div class="dc-title">…action name…</div>
        <div class="dc-desc">…what it does, what breaks, recovery posture…</div>
      </div>
      <button class="btn-tier is-danger" onclick="…">…verb…</button>
    </div>
    <!-- one .danger-card per action -->
  </div>
</section>
```

**Contract**:

| Selector | Role |
|---|---|
| `.nav-item.is-danger-tab` | Red text + red soft hover. When `.is-active`, the `::before` accent bar becomes solid `var(--err)` with err-glow. |
| `.danger-hero` | Gradient-tinted header (`linear-gradient(135deg, var(--err-soft), transparent 70%)`) with err-ring border, `dh-icon` block (solid `var(--err)`, white SVG), `dh-title` (red, `var(--text-2xl)`), `dh-sub` (muted). |
| `.danger-list` | Vertical stack of `.danger-card`s, gap `var(--space-3)`. |
| `.danger-card` | Card row with 3px left `var(--err)` border. Every action MUST have `.dc-title` AND `.dc-desc` (full disclosure copy: what happens, what breaks, how to recover). |
| `.btn-tier.is-danger` | Final action button — flex-shrink: 0 in row layout, full-width on `≤ 640px`. |

**Why this replaces the bottom bar**: the sticky bar competed with the Aurora
hero band for visual weight on the overview view, and one-click destructive
actions reachable from any view is unsafe. The tab pattern forces an
intentional navigation step before any irreversible action.

### Audit commands (Aurora regression gates)

Run before bumping `CURRENT_VERSION` whenever you touch CSS_COMMON or HTML_UI
in v2.3.0+:

```bash
# Aurora tokens must be defined in BOTH :root and body.dark — count must be ≥ 2 per token
grep -c -- '--aurora-grad:' worker.js
grep -c -- '--aurora-grad-soft:' worker.js
grep -c -- '--topbar-glass:' worker.js
grep -c -- '--card-shadow-lift:' worker.js
grep -c -- '--card-shadow-hover:' worker.js

# Only one .kpi-tile.is-primary per .aurora-hero — manually verify on each section
grep -nE 'kpi-tile is-primary|kpi-tile\s+is-primary' worker.js

# Deprecated danger-bar pattern — must be empty
grep -nE '\.danger-bar|class="danger-bar"|class="db-(title|dot|sub|spacer)"' worker.js

# Topbar must be glass (semi-transparent bg) — should reference --topbar-glass not --topbar-bg
grep -nE '\.topbar\s*{' worker.js | head -3

# All KPI value spans need tabular-nums on their CSS — should be ≥ 1
grep -c 'font-variant-numeric: tabular-nums' worker.js
```

---

## iOS-native system v2.4.0 — refined mobile

Built on top of v2.2.0 alignment tokens and v2.3.0 Aurora system. **All v2.4.0
rules live inside `@media (max-width: 768px)` — desktop is unaffected.** Goal:
mobile reads as a purpose-built iOS app, not a responsive admin.

The new CSS lives in a single labeled block at the end of `CSS_COMMON`
(search marker: `=== Mobile iOS-native v5 (v2.4.0) ===`).

### New tokens

Added to `:root` (theme-independent values stay only in `:root`; theme-dependent
values also have a `body.dark` override).

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `--text-headline` | `17px` | (same) | iOS HIG headline / row label / compact-bar title |
| `--text-body-ios` | `15px` | (same) | iOS HIG body — section sub-titles, callouts |
| `--text-large-title` | `34px` | (same) | iOS HIG large title — section heroes, login hero |
| `--text-large-title-md` | `30px` | (same) | Large title at `≤ 480px` |
| `--text-large-title-sm` | `28px` | (same) | Large title at `≤ 360px` |
| `--radius-ios` | `18px` | (same) | iOS continuous-corner card radius (overrides `.card` mobile only) |
| `--radius-ios-sm` | `14px` | (same) | Inset-grouped form / sheet inner card radius |
| `--hairline` | `rgba(60,60,67,0.18)` | `rgba(84,84,88,0.55)` | iOS 0.5px hairline (form rows, sheet grip, dividers) |
| `--ios-fill` | `rgba(120,120,128,0.16)` | `rgba(118,118,128,0.24)` | Active-press fill on tappable rows |
| `--ios-fill-quat` | `rgba(120,120,128,0.08)` | `rgba(118,118,128,0.12)` | Skeleton shimmer base + soft sheet-list bg |
| `--ios-overlay` | `rgba(0,0,0,0.32)` | `rgba(0,0,0,0.55)` | Modal/sheet backdrop dim |

**Rule**: any iOS-native rule that uses a hairline / fill / overlay color MUST
go through these tokens — never write `rgba(60,60,67,0.18)` (or the dark
equivalent) directly inside a component rule.

### Pattern: 5-tab bar + 更多 action sheet

**Problem**: bottom tab bar has 4–5 visible slots but the admin has 6 sections
(`overview / speed / stats / settings / tools / danger`). Crammed 6-tab bars
break Chinese labels; 4-tab bars orphan two sections from mobile navigation.

**Solution**: keep the 4 most-used sections in main slots, add a `more` slot
that opens an iOS action sheet (`#moreSheet`) listing the remaining sections.
`showSection()` maps `tools|danger → more` so the 更多 slot stays lit while
inside an overflow section.

**Adding a new section**: if it's a top-4 destination, swap it into the tab
bar HTML directly. Otherwise add a `<button class="more-sheet-row">` inside
`#moreSheet .more-sheet-list` and extend the `IOS_SECTION_TITLES` map and the
`showSection`'s `tabMap` (`<key>: 'more'`). Destructive sections get
`.more-sheet-row.is-danger` for red affordance.

### Pattern: Large title + sticky compact bar

**Problem**: iOS-native screens lead with a 34pt large title that collapses
to a 17pt compact title on scroll. The admin's sections were unnamed inside
their viewport — no focal hook, no scroll affordance.

**Solution**:

- `injectSectionHeaders()` prepends `<header class="ios-page-header">` to
  every `.app-section` on boot.
- `<div id="mobileTopbarCompact">` sits sticky at the top of `.app-main`.
- A `scroll` listener toggles `body.is-scrolled` once the active section's
  page header crosses out of view; CSS uses `body.is-scrolled
  #mobileTopbarCompact` to fade the compact bar in.
- `showSection()` clears `body.is-scrolled` (new section starts at top) and
  sets the compact bar's text from `window.__iosSectionTitles[key]`.

**Contract**: title/sub text and tab key must be in `IOS_SECTION_TITLES` for
the section to participate. Skipping the map = no header injected, no compact
bar sync — visible regression on mobile.

### Pattern: 2×2 status pills

**Problem**: v1 m-pills row was a horizontal scroller with edge-fade mask;
information important enough to display constantly was hidden behind scroll.

**Solution**: override `.m-pills` to `display: grid; grid-template-columns:
1fr 1fr; gap: 0.5px` with a `var(--hairline)` background showing through
between cells. 4 cells: RTT / 健康 / 模式 / 今日. New cells must extend
`initMobilePills()` source array; never fabricate values for cells whose
source DOM hasn't yet rendered (return blank).

### Pattern: iOS inset-grouped form rows

For Settings-style rows (label + value or single-tap action):

```html
<div class="ios-form-group">
  <button type="button" class="ios-form-row is-tap">
    <span class="ifr-label">退出登录</span>
  </button>
  <div class="ios-form-row">
    <span class="ifr-label">主题</span>
    <span class="ifr-value">自动</span>
  </div>
  <div class="ios-form-row is-danger">…</div>
</div>
```

| Selector | Role |
|---|---|
| `.ios-form-group` | Inset card wrapper. `border-radius: var(--radius-ios-sm)`, 0.5px hairline border. |
| `.ios-form-row` | Single row. `min-height: var(--touch-min)`. Hairline bottom border auto-removed on `:last-child`. |
| `.ios-form-row.is-tap` | Cursor pointer + `:active` background `var(--ios-fill)`. Apply ONLY to actually tappable rows. |
| `.ios-form-row.is-danger` | Text color `var(--err)`. Use for destructive single-tap rows (logout, reset, delete). |
| `.ifr-label` | Row label. `flex: 0 0 auto; font-weight: 500`. |
| `.ifr-value` | Trailing value, right-aligned, `tabular-nums`. |
| `.ifr-chevron` | Right chevron for "drills into another screen" rows. |

**v2.5.0 update**: `.ios-form-group` and `.ios-form-row` were promoted out of
the mobile MQ — they now render as an inset card on **both** desktop and
mobile. The earlier "`display: contents` on desktop" pass-through was removed.
The 44pt min-height stays a touch-only behavior via
`@media (hover: none) and (pointer: coarse) { .ios-form-row { min-height: var(--touch-min); } }`;
desktop uses 40px. A `.is-tap:hover { background: var(--ios-fill-quat) }` rule
provides desktop hover affordance.

Desktop also gains an `.ifr-sub` helper for rows that stack a title
(`.ifr-label`) above a description (`.ifr-sub`) on the leading side, used by
the v2.5.0 Danger rewrite. Wrap the stacked column in `.flex-1-min0` (existing
helper) so it shares the row's horizontal space with a trailing button.

### Pattern: outside-MQ defaults for mobile-only injected chrome

Mobile-only iOS chrome (`.mob-brand`, `#mobileTopbarCompact`, `#moreSheet`,
`#iosLogoutGroup`) is injected into the DOM for ALL viewports because JS runs
once and resize-into-mobile must just work. The chrome is hidden on desktop
via **outside-the-media-query default rules**:

```css
/* v2.5.0: keep ONLY components that are still mobile-only here. */
#mobileTopbarCompact { display: none; }
.mob-brand          { display: none; }
#moreSheet          { display: none; }
#iosLogoutGroup     { display: none; }   /* runtime-injected by injectLogoutRow() */

@media (max-width: 768px) {
  #mobileTopbarCompact { display: flex; }
  .mob-brand           { display: inline-flex; }
  #moreSheet           { display: block; }   /* slide-in via transform */
  #iosLogoutGroup      { display: block; }
}
```

**Rule**: every new mobile-only DOM component MUST follow this pattern. Never
omit the default `display: none` — otherwise the component leaks onto desktop
where its layout assumptions are wrong. **Also applies to runtime-injected
chrome**: if a JS helper appends DOM that is intended only for mobile, the
target element/ID must have a CSS-level desktop-hide guard so the leak isn't
gated by what runs at boot time.

**v2.5.0 promoted-out list** (no longer mobile-only — render cross-viewport):
`.ios-page-header`, `.ios-large-title`, `.ios-sub`, `.ios-form-group`,
`.ios-form-row` and its `.ifr-*` children, `.skeleton`. These were lifted to
top-level scope; the mobile MQ retains size/padding overrides only.

### Pattern: Skeleton shimmer with strip-on-data

`.skeleton` class can be added inline to any element that displays a value
loaded asynchronously. CSS gives it a shimmering bg + transparent text. The
function that lands the real value MUST strip the class.

```html
<span class="kpi-value skeleton" id="kpi-traffic">--</span>
```

```js
function setText(id, v) {
  const el = document.getElementById(id);
  if (el) { el.textContent = v; el.classList.remove('skeleton'); }
}
```

**Contract**: any new ID added to a `setText`-style helper used by the data
hydration path is responsible for stripping its own `.skeleton` class. Do not
add `.skeleton` to elements whose value is set on first paint (it will shimmer
forever).

### Pattern: Sheet detents

`#dashboardModal > .card` now has two detents on mobile:

| State | `max-height` | Entry |
|---|---|---|
| default | `85vh` | open |
| `.is-expanded` | `96vh` | drag the grip area up `> 60px` |
| dismissed | `translateY(100%)` then `closeDashboard()` | drag the grip area down `> 120px` |

Drag origin is the top 44px of the sheet (the visual grabber zone), regardless
of scrollTop, so upward drag can intentionally fire even when content is mid-
scroll. The gesture is wired in `initSheetGesture()`.

### v5 audit commands (regression gates)

```bash
# v5 CSS block presence — must be exactly 1
grep -c "Mobile iOS-native v5" worker.js

# 5-tab bar presence — must be exactly 1
grep -c 'data-tab="more"' worker.js

# iOS tokens must be defined in :root — count must be ≥ 1 for each
for t in --text-headline --text-large-title --radius-ios --radius-ios-sm --hairline --ios-fill --ios-overlay; do
  echo -n "$t: "; grep -c -- "$t:" worker.js
done

# Theme-dependent iOS tokens must also have a body.dark override — count must be ≥ 2
for t in --hairline --ios-fill --ios-overlay; do
  echo -n "$t: "; grep -c -- "$t:" worker.js   # expect ≥ 2
done

# Default-outside-MQ display:none for the remaining mobile-only chrome — must be present.
# v2.5.0: .ios-page-header is now cross-viewport (no longer in this list).
grep -nE '^\s+(#mobileTopbarCompact|\.mob-brand|#moreSheet|#iosLogoutGroup)\s*\{\s*display:\s*none' worker.js

# Skeleton class must be stripped by data hydration — search for both
grep -c "classList.remove('skeleton')" worker.js   # at least 1 (updateAuroraKpis)
grep -c 'class="skeleton"\|class="[^"]*\bskeleton\b' worker.js   # ≥ 4 (KPI tiles)

# Version bumped
grep '^const CURRENT_VERSION' worker.js   # must read "2.4.0" or higher
```

## iOS-native system v2.5.0 — desktop port

v2.4.0 left desktop on the Aurora chrome and built iOS-native idioms only for
`@media (max-width: 768px)`. v2.5.0 closes the gap: the iOS *language*
(typography, inset-grouped rows, hairline dividers, continuous-corner radii,
skeleton shimmer, refreshed login) now applies on desktop too. Touch-only
idioms (5-tab bar, sheet detents, topbar collapse, fixed-bottom CTA, safe-area
padding) stay scoped to the mobile MQ.

### New token

```css
:root {
  --text-large-title-lg: 40px;   /* desktop ≥769px large-title scale */
}
```

Mobile keeps its 34 / 30 / 28 ramp via the existing
`--text-large-title{,-md,-sm}` tokens; the desktop value lives on its own to
keep the two surfaces independently tunable.

### Pattern: Promote-out-of-MQ for cross-viewport iOS components

**Problem**: a CSS rule that started inside `@media (max-width: 768px)` needs
to apply on desktop too without regressing mobile.

**Solution**:

1. Lift the canonical ruleset (display, layout, spacing, base typography) to
   **top-level scope** in `CSS_COMMON`.
2. Keep only **viewport-specific deltas** (font-size, padding shrinks, touch
   targets) inside `@media (max-width: 768px)`.
3. If the desktop value differs from mobile, introduce a desktop-only token
   (e.g. `--text-large-title-lg`) — do not hard-code px.
4. Add a brief inline comment `/* v2.5.0: promoted to desktop — mobile keeps
   X override below */` at the lifted block so future readers see why.

**Example** (`.ios-large-title`):

```css
/* Desktop default */
.ios-large-title {
  margin: 0;
  font-size: var(--text-large-title-lg);   /* 40px */
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  /* Mobile keeps 34/30/28 ramp */
  .ios-large-title { font-size: var(--text-large-title); }
}
@media (max-width: 480px) { .ios-large-title { font-size: var(--text-large-title-md); } }
@media (max-width: 360px) { .ios-large-title { font-size: var(--text-large-title-sm); } }
```

**Eligibility checklist** — only promote a component if all are true:
- The DOM hook is already emitted on every viewport (no JS gating).
- The visual idiom translates to desktop (not gesture- or touch-only).
- All color/spacing inputs are tokens (no literal hex / px / rgb).
- Both light and dark themes already work via existing `body.dark` overrides.

### Pattern: `.tb-section-title` — section title in the glass topbar

**Problem**: on desktop, the existing `.topbar` is already sticky and houses
brand + nav controls. Promoting `#mobileTopbarCompact` would stack two sticky
chromes — busy and redundant.

**Solution**: add a single centered slot inside `.topbar-spacer` that fades
the active section title in once `body.is-scrolled` becomes true.

```html
<!-- inside .topbar -->
<div class="topbar-spacer">
  <span class="tb-section-title" id="tbSectionTitle"></span>
</div>
```

```css
.topbar-spacer {
  flex: 1; min-width: 0;
  display: flex; align-items: center; justify-content: center;
}
.tb-section-title {
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
  max-width: 100%;
}
body.is-scrolled .tb-section-title { opacity: 1; transform: none; }
```

**Mobile-hide**: no explicit rule needed — the mobile MQ rule
`.topbar > * { display: none !important; }` (part of the v2.4.0 topbar
collapse) hides `.topbar-spacer` and its child along with everything else.

**JS contract**: `tbSectionTitle.textContent` MUST be written from the same
source of truth that drives `#mobileTopbarCompact`. Two write sites today —
both read from `IOS_SECTION_TITLES`:

| Site | When it runs | Both slots? |
|---|---|---|
| `syncCompactBarTitle()` | initial paint via `initIosChrome` | yes |
| `showSection(key)` | every user nav | yes |

Never add a third write site that hits only one slot — the two will drift.

### Pattern: Hairline dividers vs structural borders

`var(--hairline)` (defined in `:root`, themed in `body.dark`) is a half-pixel
divider tuned to mimic iOS list separators. Use it in **row-separator**
contexts; do NOT use it for structural borders.

| Context | Use | Why |
|---|---|---|
| `.ios-form-row` bottom dividers | `0.5px solid var(--hairline)` | row rhythm |
| Successive `.a-detail-row` separators | `0.5px solid var(--hairline)` | row rhythm |
| Card-header / card-body split | `0.5px solid var(--hairline)` | internal rhythm |
| Stats-row top/bottom edges | `0.5px solid var(--hairline)` | row rhythm |
| Sidebar brand / footer separator | `0.5px solid var(--hairline)` | internal rhythm |
| Sticky topbar bottom | `0.5px solid var(--hairline)` | edge rhythm |
| Menu `<hr>` | `0.5px solid var(--hairline)` | row rhythm |
| Table `th, td` borders | `1px solid var(--border)` | structural — keep |
| `.card` outer border | `1px solid var(--border)` | structural — keep |
| Input / button borders | `1px solid var(--border)` (or token-appropriate) | structural — keep |

**Rule of thumb**: if removing the divider would make a *list* feel less
organized, use `--hairline`. If removing it would make a *container* lose its
shape, use `--border`. Tables are containers (TH/TD borders define the grid),
not lists.

### Pattern: Desktop login refresh

Same DOM as the v2.4.0 mobile login (`.login-box`, `.login-logo`,
`.login-eyebrow`, `<h2>`, `.login-sub`, input, button, `.login-foot`). What
desktop adds vs. the pre-2.5.0 plain card:

- `.login-logo` is force-shown (`display: flex !important` overrides the
  `CSS_COMMON .login-logo { display: none }` default), 72×72px, gradient
  background via `var(--aurora-grad)`, `border-radius: var(--radius-ios)`.
- `<h2>` scales to `var(--text-large-title-lg)`.
- Input uses inset background (`var(--ios-fill-quat)`) with a transparent
  border; focus state flips to `var(--card)` background + primary ring.
- Button uses `var(--aurora-grad)` with `var(--primary-glow)` shadow.
- `.login-foot` is shown (subtle, `opacity: 0.7`); version string is fed by
  `${CURRENT_VERSION}`.

Mobile retains its fixed-bottom CTA + transparent card via the existing
`body.login-body` MQ block — all those rules use `!important` so they win
unconditionally.

### Pattern: Skip section-header injection when the section owns its hero

`injectSectionHeaders()` is the default carrier of the large-title pattern.
Some sections render their own bespoke hero (warning icon + red title for
Danger). Adding a generic `.ios-page-header` on top doubles the heading.

```js
function injectSectionHeaders() {
  document.querySelectorAll('.app-section').forEach(sec => {
    if (sec.querySelector(':scope > .ios-page-header')) return;
    const key = sec.getAttribute('data-section');
    const meta = IOS_SECTION_TITLES[key];
    if (!meta) return;
    // v2.5.0: skip sections that already own a custom hero.
    if (key === 'danger' && sec.querySelector(':scope > .danger-hero')) return;
    // ...inject header...
  });
}
```

**Rule**: when adding a new bespoke hero to a section, also add the skip-guard
in `injectSectionHeaders()`. The matching `IOS_SECTION_TITLES` entry still
populates `#mobileTopbarCompact` / `.tb-section-title` text — that path is
separate and shouldn't be removed.

### Danger section composition (v2.5.0)

Three destructive actions render as one `.ios-form-group.danger-group` with a
subtle `var(--err-soft)` tint:

```html
<div class="ios-form-group danger-group" role="group" aria-label="危险操作">
  <div class="ios-form-row">
    <div class="flex-1-min0">
      <div class="ifr-label">…title…</div>
      <div class="ifr-sub">…description…</div>
    </div>
    <button type="button" class="btn-tier is-danger" onclick="…">…CTA…</button>
  </div>
  …
</div>
```

The `.danger-group` modifier supplies the red ring + gradient tint; the
trailing `.btn-tier.is-danger` carries the red action color. The row itself
does NOT use `.is-danger` — that would turn the title text red, which is a
regression vs. the pre-2.5.0 danger cards where titles were dark/light.

At `≤640px` the group reflows: rows go column, button goes full-width.

### v2.5.0 audit commands (regression gates)

```bash
# New desktop large-title token must be defined
grep -c -- '--text-large-title-lg:' worker.js   # ≥ 1

# .tb-section-title slot must exist in markup AND have CSS
grep -c 'class="tb-section-title"' worker.js    # ≥ 1
grep -c '^\s*\.tb-section-title' worker.js       # ≥ 1

# Promoted-out components must NOT have a desktop display:none default
grep -nE '^\s+(\.ios-page-header|\.ios-form-group|\.ios-form-row)\s*\{\s*display:\s*none' worker.js
# (above should print nothing)

# .skeleton must remain at root scope (4-space indent in CSS_COMMON).
# Top-scope hit ≥ 1; nested (8+ space) hits = regression.
grep -cE '^[[:space:]]{4}\.skeleton[[:space:]]*\{' worker.js   # ≥ 1
grep -cE '^[[:space:]]{8,}\.skeleton[[:space:]]*\{' worker.js  # = 0

# Both compact slots must be populated from a single source — grep both
grep -c 'compact.textContent\s*=' worker.js         # ≥ 1
grep -c 'tbSlot.textContent\s*=\|tbSectionTitle.*\.textContent' worker.js   # ≥ 1

# Hairline pass should have collapsed most row-separator borders to hairline.
# Table th/td is the only legitimate remaining --border row-separator.
grep -cE 'border-(top|bottom):\s*1px solid var\(--border\)' worker.js   # expect 1 (th, td)

# Version bumped
grep '^const CURRENT_VERSION' worker.js   # must read "2.5.0" or higher
```

## A11y baseline (v2.5.1)

A single low-specificity block in `CSS_COMMON` (just before the first
`@media (max-width: 768px)`) provides keyboard focus rings and motion-safety
across the whole admin panel. Adding new interactive components no longer
requires a per-component `:focus-visible` rule.

```css
:where(button, [role="button"], a, input, select, textarea, summary):focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Why `:where()`**: zero specificity. Existing per-component focus rules
(e.g. `.tb-icon-btn:focus-visible`) win automatically — no migration needed.

**Rule**: new interactive elements do NOT need their own `:focus-visible`
unless they require a *non-default* outline (e.g. inset ring, color-shifted
to fit a colored background). The baseline covers default semantics.

**Reduced-motion scope**: applies to every animated/transitioned element,
including Aurora gradient hovers, KPI sparkline, sheet-detent drag, glass
topbar fade, `.tb-section-title` translateY, mobile compact-bar slide-in.
Do not introduce JS-driven animations that bypass CSS transitions without
also gating them on `window.matchMedia('(prefers-reduced-motion: reduce)')`.

### Audit gates (count-based — line numbers drift)

```bash
# At least the baseline + the per-component .tb-icon-btn rule
[ "$(grep -c ':focus-visible' worker.js)" -ge 2 ] && echo ok

# Existing dark-mode listener + new CSS_COMMON block
[ "$(grep -c 'prefers-reduced-motion' worker.js)" -ge 2 ] && echo ok
```

Use count-based assertions: the a11y block sits inside `CSS_COMMON` and any
edit above it shifts line numbers.

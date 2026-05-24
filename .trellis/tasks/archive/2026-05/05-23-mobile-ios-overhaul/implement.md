# Mobile UI Overhaul — Execution Plan

## Phase A — Foundation (CSS tokens + skeletons)

A1. Append a new versioned block `/* === Mobile iOS-native v5 === */` at the end of `CSS_COMMON` (before the closing backtick of the template literal — around worker.js:1399). All v5 rules live here so they win the cascade by source-order.

A2. Inside the v5 block, add the `.skeleton` shimmer class + `@keyframes shimmer`. Add the reduced-motion override.

A3. Bump `CURRENT_VERSION` from `2.3.0` to `2.4.0` (worker.js:3).

**Validation**: open admin page; no visual change yet (no rules apply until we use them). Loading desktop is unchanged.

---

## Phase B — Bottom tab bar: 5 tabs + 更多 sheet

B1. Replace `#mobileTabBar` HTML (worker.js:4106-4123) with the 5-tab version (overview, speed, stats, settings, more). Each `<button>` contains both an outline svg (`.ico-outline`) and a filled svg (`.ico-filled`) — only one shows based on `.active`.

B2. Add a new `<div id="moreSheet">` immediately after `#mobileTabBar` containing a list of "工具箱" + "危险区" rows that, when tapped, close the sheet + call `showSection('tools'|'danger')`. Danger row uses red text + light red bg.

B3. In v5 CSS:
- `#mobileTabBar` grid changes to `repeat(5, 1fr)`.
- `.ico-outline / .ico-filled` toggle rules: default outline visible, filled hidden; `.active` inverts.
- `#moreSheet` styles: fixed bottom, slides up from `transform: translateY(100%)`, shows on `.is-open`.
- Backdrop pseudo-element `#moreSheet::before` for dim layer.

B4. Extend `initMobileTabBar()` JS (worker.js:4128+):
- Map `more` tab to opening `#moreSheet` rather than `showSection`.
- `showSection()` (search for `function showSection`) — extend to update tab-bar active state for the 4 main tabs OR set `more` active when current is `tools`/`danger`.

**Validation**:
- Tap each of 5 tabs → 4 navigate, `更多` opens sheet.
- Tap "工具箱"/"危险区" in sheet → section shows, sheet closes, `更多` tab keeps `.active`.
- Active tab icon switches outline → filled.

---

## Phase C — Mobile topbar simplification

C1. v5 CSS: hide everything in `.topbar` on mobile except a new `.mob-brand` + `#themeToggle`.

C2. JS at DOMContentLoaded: if no `.mob-brand` exists, prepend one to `#cf-trace-card`:
```html
<div class="mob-brand"><svg…><span>反代核心</span></div>
```
CSS hides this on desktop (`display: none` then `display: inline-flex` only inside the mobile media query).

C3. Move logout out of topbar visually: hide `.topbar-user` on mobile, add a new "退出登录" inset row at the bottom of `#sec-settings` (worker.js:2023+) wired to existing `logout()`.

**Validation**: mobile topbar shows only brand left + theme toggle right. No horizontal scroll. Settings tab now contains a logout row.

---

## Phase D — Status strip (replace m-pills horizontal scroll)

D1. v5 CSS: override `.m-pills` mobile rules to grid 2×2 with hairline separators (overrides earlier `display: flex` + edge-fade mask).

D2. Add a 4th pill cell for 健康 — modify the `.m-pills` markup at worker.js:1639+ to add `<span class="m-pill" id="m-pill-health">`.

D3. Extend `initMobilePills()` (worker.js:4143) source array with `{ src: 'tb-health-val', dst: 'm-pill-health' }`.

**Validation**: 2×2 grid visible above content on every mobile section. All 4 cells populated. No horizontal scroll.

---

## Phase E — iOS large title + compact sticky bar

E1. JS at DOMContentLoaded: walk each `.app-section`, prepend:
```html
<header class="ios-page-header">
  <h1 class="ios-large-title">{title}</h1>
  <p class="ios-sub">{sub}</p>
</header>
```
Title/sub map per section:
- overview: 概览 / 实时状态与核心指标
- speed: 测速 & DNS / 节点延迟与解析探测
- stats: 数据统计 / 流量、并发与历史
- settings: 系统设置 / 应用、通知与账户
- tools: 工具箱 / 实用工具集合
- danger: 危险区 / 不可逆操作

E2. Add `<div id="mobileTopbarCompact" hidden></div>` near the top of `.app-main`.

E3. v5 CSS: styles for `.ios-page-header`, `.ios-large-title`, `.ios-sub`, `#mobileTopbarCompact`, and `body.scrolled #mobileTopbarCompact` reveal state. Hide page header + compact bar on desktop.

E4. JS: IntersectionObserver watching `.ios-page-header.is-active` (the one in the currently visible section). When it leaves viewport from the top, set `body.scrolled` true; when it returns, false. Re-attach observer in `showSection()`.

E5. `showSection()`: also `window.scrollTo({top:0, behavior:'instant'})` and update compact-bar text to the new section title.

**Validation**: Each section opens with a big 34pt title. Scrolling down ~80px fades in the compact 17pt title bar. Returning to top hides it.

---

## Phase F — Card + form refinements

F1. v5 CSS: mobile `.card { border-radius: 18px; padding: 18px; }` with refined shadow tokens for light + dark.

F2. Targeted markup edit in `#sec-settings` (worker.js:2023+): wrap related input rows into `.ios-form-group > .ios-form-row` containers. Don't touch other sections — they keep current card+input look with only the radius/padding upgrade.

F3. v5 CSS: `.ios-form-group`, `.ios-form-row` styles per design.md.

**Validation**: Settings section visually matches iOS Settings.app row pattern.

---

## Phase G — Sheet detents + skeletons

G1. v5 CSS: change `#dashboardModal > .card` mobile `max-height: 85vh`. Add `.card.is-expanded { max-height: 96vh; }`.

G2. Extend `initSheetGesture()` (worker.js:4169+) to also handle upward drag toward top; if `dy < -80` snap to `.is-expanded` instead of dismissing.

G3. In `aurora-hero` markup (worker.js:2175+), add `class="skeleton"` to KPI `.kpi-value` spans. JS that populates them (search `updateAuroraKpis`) strips the class on first successful write.

**Validation**: Open dashboard sheet → opens at 85vh; drag up → expands to ~96vh; drag down → dismisses. KPI tiles shimmer on first paint then populate.

---

## Phase H — Login refresh

H1. Extend mobile @media in `LOGIN_UI`'s inline `<style>` (worker.js:1411-1427) per design.md.

H2. Add a small adjustment to the existing `.login-logo` block on mobile to bump to 72×72 + larger radius.

**Validation**: Mobile login shows iOS-style hero with large title, inset input, fixed-bottom CTA respecting safe-area.

---

## Phase I — Polish + verification

I1. Visual check (manual) at widths: 360, 375, 393, 414, 480, 600, 768, 769, 900, 1280. Light + dark mode each.

I2. Smoke test all 6 sections accessible from mobile bottom nav (4 direct + 2 via 更多).

I3. Smoke test logout flow from Settings section.

I4. Check `prefers-reduced-motion`: skeleton + sheet + transitions all stilled.

I5. Run `node --check worker.js` to ensure no syntax errors in the embedded JS (template literal still parses).

I6. Bump `CURRENT_VERSION = "2.4.0"` confirmed.

---

## Validation commands

```bash
# Syntax check
node --check worker.js

# Line count sanity (should not balloon massively)
wc -l worker.js

# Spot-check that new CSS block is present
grep -n "Mobile iOS-native v5" worker.js

# Spot-check 5-tab bar
grep -n 'data-tab="more"' worker.js
```

---

## Rollback points

- After Phase B: if 5-tab navigation feels wrong on real devices, revert by replacing `#mobileTabBar` HTML back to 4-tab and removing `#moreSheet`. CSS keeps without harm.
- After Phase E: if scroll observer causes jank, comment out the observer block; large title stays static (still better than current).
- Full rollback: `git revert <commit>`.

---

## Review gates

- After Phase B: confirm tab navigation feels right before continuing.
- After Phase E: confirm large-title pattern reads well before doing the form refinements.
- Before final commit: full visual sweep at all widths, both themes.

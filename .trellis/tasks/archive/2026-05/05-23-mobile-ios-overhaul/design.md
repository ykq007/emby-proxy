# Mobile UI Overhaul — Technical Design

## Architectural premise

Everything lives in `worker.js`. Two HTML string constants — `LOGIN_UI` (1402-1458) and `HTML_UI` (1460-4229) — embed CSS in `<style>` blocks and JS in `<script>` blocks. The shared CSS lives in `CSS_COMMON` (12-1400 region) which both UIs interpolate.

All mobile changes are added as **new CSS blocks at the end of `CSS_COMMON`** (versioned "Mobile iOS v5") and a **new HTML/JS block injected near `#mobileTabBar`** (4106+) without disturbing existing desktop CSS or section content. The existing `@media (max-width: 768px)` cascade stays — new rules layer on top via specificity or `!important` where forced by legacy `!important` declarations.

## Boundary: desktop vs mobile

```
Desktop (>=769px)       Mobile (<=768px)              Phone (<=480px)
────────────────────    ────────────────────────────  ────────────────
Aurora Console v2.3     iOS-native shell (NEW v5)     Tighter spacing
  sidebar + topbar        large-title page header       ≤360 special tier
  KPI hero row            5-tab bottom bar + 更多
  6-section pivot         status: pinned 2×2 KPI strip
                          inset-grouped cards
```

## Navigation strategy — solving "6 sections, 4 tabs"

Decision: **5 tabs + "更多" overflow sheet** (overview, speed, stats, settings, 更多). The `更多` tab opens an iOS-style action sheet listing `tools` + `danger` (and any future sections). `danger` row in the sheet is tinted red to preserve the danger affordance.

Why 5 and not 6:
- 4 tabs feel sparse on 393-414px screens.
- 6 tabs at 65-69px each cramps the icon/label to ~50px usable — labels overflow ("线路测速").
- 5 + overflow is iOS-standard (App Store, Photos).

New HTML structure (replacing worker.js:4106-4123):
```html
<nav id="mobileTabBar" aria-label="底部导航">
  <button data-tab="home"     class="active"><svg class="ico-outline">…</svg><svg class="ico-filled">…</svg><span>概览</span></button>
  <button data-tab="speed"><svg class="ico-outline">…</svg><svg class="ico-filled">…</svg><span>测速</span></button>
  <button data-tab="stats"><svg class="ico-outline">…</svg><svg class="ico-filled">…</svg><span>数据</span></button>
  <button data-tab="settings"><svg class="ico-outline">…</svg><svg class="ico-filled">…</svg><span>设置</span></button>
  <button data-tab="more"><svg class="ico-outline">…</svg><svg class="ico-filled">…</svg><span>更多</span></button>
</nav>
<div id="moreSheet" class="ios-sheet" role="dialog" aria-hidden="true">…tools + danger rows…</div>
```

CSS swaps icon variants via `.active .ico-outline { display:none }` / `.active .ico-filled { display:inline }`.

## Mobile topbar redesign — kill the horizontal scroll

Current mobile topbar (worker.js:1392-1397, 1560-1604) scrolls horizontally with 7+ elements. Replace with a **compact mobile chrome** that shows only:
- Left: small brand logo + "反代核心"
- Right: theme toggle (single icon)

All other status info (RTT, node-count, today-traffic, health, placement) **moves into the page body** as a pinned status strip just above the section content, OR as part of the Aurora KPI hero on overview. Logout moves to Settings → "退出登录" inset row.

CSS:
```css
@media (max-width: 768px) {
  .topbar { overflow: visible; flex-wrap: nowrap; padding: 10px 14px; }
  .topbar > * { display: none; }
  .topbar > .mob-brand,
  .topbar > #themeToggle { display: inline-flex; }
  .topbar { justify-content: space-between; }
}
```

A new `.mob-brand` element is injected at the start of the topbar via JS on DOMContentLoaded (so we don't have to surgically edit the topbar HTML — keeps the patch additive).

## iOS large title pattern

Each `.app-section` gets a header injected at the top (also via JS, on DOMContentLoaded):
```html
<header class="ios-page-header">
  <h1 class="ios-large-title">概览</h1>
  <p class="ios-sub">实时状态与核心指标</p>
</header>
```

On scroll, an `IntersectionObserver` watching `.ios-page-header` toggles `body.scrolled` once the header crosses out of view; CSS shows a sticky compact bar (`#mobileTopbarCompact`) with the section title in 17pt semibold.

```css
@media (max-width: 768px) {
  .ios-large-title { font-size: 34px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; }
  .ios-page-header { padding: 4px 4px 12px; }
  .ios-sub { font-size: 15px; color: var(--text-sec); margin-top: 4px; }

  #mobileTopbarCompact { position: sticky; top: 0; height: 44px; backdrop-filter: blur(24px) saturate(180%);
                         background: var(--topbar-glass); border-bottom: 0.5px solid var(--border);
                         display: flex; align-items: center; padding: 0 16px;
                         font-size: 17px; font-weight: 600; opacity: 0; transform: translateY(-8px);
                         transition: opacity 0.18s, transform 0.18s; z-index: 950; }
  body.scrolled #mobileTopbarCompact { opacity: 1; transform: none; }
}
```

## Status strip — replace `.m-pills` horizontal scroll

New mobile status: 2×2 mini grid pinned just below the page header, always visible. Each cell:
```
┌──────────────┬──────────────┐
│ ● RTT  32ms  │ ● 健康  98%  │
├──────────────┼──────────────┤
│ 模式  智能 ▾ │ 今日  1.2GB  │
└──────────────┴──────────────┘
```

CSS:
```css
@media (max-width: 768px) {
  .m-pills { display: grid !important; grid-template-columns: 1fr 1fr; gap: 1px;
             background: var(--border); border-radius: 14px; overflow: hidden; margin: 8px 0 16px;
             -webkit-mask-image: none !important; mask-image: none !important; }
  .m-pill { background: var(--card); border: none; border-radius: 0; padding: 12px 14px;
            display: flex; align-items: center; justify-content: space-between;
            font-size: 14px; }
}
```

JS extends `initMobilePills()` (worker.js:4143) to populate the 健康 cell from `#tb-health-val`.

## Inset-grouped card pattern (cards + forms)

Standard mobile card upgrade:
```css
@media (max-width: 768px) {
  .card { border-radius: 18px; padding: 18px; margin: 0 0 14px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(0,0,0,0.04); }
  body.dark .card { box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4); }
}
```

Form rows (`#addForm` and `#sec-settings` rows) restructure into iOS inset-grouped:
```css
@media (max-width: 768px) {
  .ios-form-group { background: var(--card); border-radius: 14px; overflow: hidden;
                    border: 0.5px solid var(--border); margin-bottom: 22px; }
  .ios-form-row { display: flex; align-items: center; min-height: 44px;
                  padding: 8px 16px; border-bottom: 0.5px solid var(--border); gap: 12px; }
  .ios-form-row:last-child { border-bottom: none; }
  .ios-form-row > label { flex: 0 0 80px; color: var(--text); font-size: 15px; }
  .ios-form-row > input, .ios-form-row > select { flex: 1; border: none; background: transparent;
                                                  padding: 12px 0; font-size: 17px; text-align: right;
                                                  color: var(--text); }
}
```

Since we don't want to rewrite all forms manually, JS-on-DOMContentLoaded does a **soft retrofit**: any `<div class="card">` that contains a `<form>` or sequence of `<input>` rows gets a `.ios-form-card` class on mobile, and CSS handles the rest via attribute selectors. Where the existing markup is too irregular, we'll do targeted markup edits in `#sec-settings` (line ~2023).

## Bottom-sheet detents

Current modal (worker.js:615-643) opens at 92vh. Update to 85vh default with a "drag up to expand to 96vh" gesture (extend existing `initSheetGesture()` at 4169+):
```js
// Track upward drag too; snap between 0.85 and 0.96 of vh
```

CSS unchanged except `max-height: 85vh` default, expand modifier `.card.is-expanded { max-height: 96vh }`.

## Skeleton states

For initial paint, the KPI value spans get `class="skeleton"` until JS replaces their text. Single CSS class:
```css
.skeleton { display: inline-block; min-width: 64px; height: 1em; border-radius: 4px;
            background: linear-gradient(90deg, var(--surface-2) 0%, rgba(120,120,140,0.15) 50%, var(--surface-2) 100%);
            background-size: 200% 100%; animation: shimmer 1.4s linear infinite; color: transparent; }
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none } }
```

Initial admin HTML emits skeletons on KPI tile values; first successful data update strips the class.

## Login mobile redesign

`LOGIN_UI` (1402-1458) — extend mobile @media:
```css
@media (max-width: 768px) {
  body.login-body { padding: 0; background: linear-gradient(180deg, var(--bg) 0%, var(--card) 100%); }
  .login-box { padding: 72px 24px 32px !important; max-width: 100% !important; }
  .login-logo { width: 72px !important; height: 72px !important;
                border-radius: 22px !important; margin-bottom: 32px !important; }
  .login-box h2 { font-size: 34px !important; font-weight: 700 !important;
                  letter-spacing: -0.025em !important; margin-bottom: 8px !important; }
  .login-sub { font-size: 17px !important; line-height: 1.45; color: var(--text-sec); }
  .login-box input { background: var(--card); border-radius: 14px; padding: 18px 16px;
                     font-size: 17px; border: 1px solid var(--border); margin-top: 28px; }
  .login-box button { position: fixed; left: 16px; right: 16px;
                      bottom: max(env(safe-area-inset-bottom), 16px);
                      padding: 18px; font-size: 17px; font-weight: 600;
                      border-radius: 14px; background: var(--aurora-grad);
                      box-shadow: 0 12px 28px -8px var(--primary-glow); }
}
```

## Tradeoffs / risks

1. **All-CSS approach risks legacy `!important` cascade fights.** Mitigation: new rules use `!important` where legacy already does (mostly inside `@media`).
2. **Soft JS retrofits for forms** may miss edge cases. Mitigation: targeted manual edits in `#sec-settings` only; other forms keep existing card+input shape with new visual tokens.
3. **5-tab bar at ≤360px gets tight** — labels are 2-char so each ~62px works. Verified by spec, but visual check needed on iPhone SE.
4. **Large title scroll observer** runs once per section; switching sections doesn't reset scroll position — we will reset scroll-to-top in `showSection()`.
5. **No tooling/preview server** for this Worker. Verification is by reading rendered output via static checks + spot-checking with Chrome DevTools mobile emulation manually (user-driven).

## Compatibility

- All changes additive — no removal of existing classes.
- Desktop ≥769px untouched.
- Existing IDs (`#mobileTabBar`, `#mobilePills`, `#cf-trace-card`, `#dashboardModal`, etc.) preserved so existing JS keeps working.
- `showSection()` (existing) extended to also (a) update `body.scrolled` reset, (b) update tab bar active state to include `more` mapping.

## Rollout / rollback

Rollout: single commit "Mobile iOS-native v5: bottom-up redesign". Bump `CURRENT_VERSION` to `2.4.0`.

Rollback: revert the single commit. Because changes are all additive CSS + a new HTML node, partial-revert is also possible by deleting the v5 CSS block at the end of `CSS_COMMON`.

# Component Guidelines

> How components are built in this project.

The UI is a single-file Cloudflare Worker (`worker.js`); "components" are CSS classes + HTML fragments + JS helpers that share a viewport contract. There is no React/Vue framework — discipline lives in the conventions below and in [`ui-design-system.md`](./ui-design-system.md).

---

## Overview

Two surfaces, one design language:

- **Admin shell** (≥769px): sidebar + glass topbar + content area.
- **Mobile** (≤768px): 5-tab bottom bar + topbar collapse + `#moreSheet` overflow.

iOS-native components (`.ios-page-header`, `.ios-form-row`, `.kpi-tile`, `.skeleton`, login chrome) are **cross-viewport** as of v2.5.0; they consume tokens from `:root` and pick up viewport-specific overrides inside `@media (max-width: 768px)`. See *Promote-out-of-MQ pattern* in the design system doc for which components qualify.

---

## Component Structure

A reusable component is generally one of:

1. **CSS-only**: a class hierarchy (`.kpi-tile`, `.kpi-tile.is-primary`, `.kpi-tile .kpi-value`) consumed by inline HTML.
2. **CSS + injected DOM**: a JS helper appends a fixed DOM fragment on boot (`injectSectionHeaders`, `injectMobileBrand`, `injectLogoutRow`). The CSS for the fragment lives next to the rest of the design system in `CSS_COMMON`.
3. **Section-level**: a `<section class="app-section" data-section="…">` with its own layout (Settings deploy form, Danger group, Stats charts). `showSection(key)` swaps which one is visible.

Whenever a JS helper injects mobile-only DOM, the target element/ID MUST have a CSS-level desktop-hide guard (see *Runtime-injected mobile chrome* below). Don't rely on `window.matchMedia` at boot to decide whether to inject — the user can resize the window, and CSS handles the conditional cheaper.

---

## Class Naming

- BEM-ish: `.kpi-tile` (block) → `.kpi-value` (element) → `.kpi-tile.is-primary` (modifier).
- iOS components prefix `ios-` (`.ios-page-header`, `.ios-form-row`, `.ios-large-title`).
- Modifiers: `.is-active`, `.is-tap`, `.is-danger`, `.is-primary`, `.is-sm` — use `.is-` for state/variant, not `.has-` or two-class chains like `.btn--danger`.
- IDs are for elements written/read by JS (`#tbSectionTitle`, `#iosLogoutGroup`, `#mobileTopbarCompact`). Don't style off an ID if a class would also work.

---

## Styling Patterns

- Edit `CSS_COMMON` in `worker.js`, never inject a `<style>` block from JS.
- Consume tokens from `:root` — raw px in `padding`, `margin`, `gap`, `font-size`, `border-radius`, and status alpha is reviewable as a regression (see [`ui-design-system.md` § Alignment system](./ui-design-system.md#alignment-system-v220)).
- Hairline dividers (`0.5px solid var(--hairline)`) for row separators; `1px solid var(--border)` for structural borders (cards, inputs, tables). Full table in the design-system doc.
- A new mobile-only adjustment goes inside `@media (max-width: 768px)`. A new cross-viewport iOS rule goes at top scope; mobile keeps only the deltas. See the *Promote-out-of-MQ pattern*.

---

## Runtime-injected mobile chrome — desktop-hide guard

**Rule**: when a JS helper appends mobile-only DOM on boot, the target element MUST have an outside-MQ `display: none` default + a mobile-MQ `display: block/flex` override in CSS. Otherwise the chrome leaks onto desktop the first time the user resizes the window.

```css
/* outside any @media */
#iosLogoutGroup { display: none; }      /* injected by injectLogoutRow() */
#mobileTopbarCompact { display: none; } /* sticky 44px bar */
.mob-brand { display: none; }
#moreSheet { display: none; }

@media (max-width: 768px) {
  #iosLogoutGroup { display: block; }
  #mobileTopbarCompact { display: flex; }
  .mob-brand { display: inline-flex; }
  #moreSheet { display: block; }
}
```

**Why**: `initIosChrome` runs once at `DOMContentLoaded`. Without CSS gating, the injected DOM appears on whatever viewport happens to be active at boot — and any later resize bypass.

**Symptom of the bug**: a "退出登录" row showing up at the bottom of desktop Settings even though the topbar already has a logout button.

---

## Cross-viewport JS sync

When a piece of state needs to drive both mobile chrome and desktop chrome (e.g., the active section's title), write to **both slots from a single source**. The current pattern:

- `IOS_SECTION_TITLES` is the source of truth (one map, indexed by `data-section`).
- `syncCompactBarTitle()` writes both `#mobileTopbarCompact.textContent` and `#tbSectionTitle.textContent` on initial paint.
- `showSection(key)` does the same write on every user nav.

Don't add a third write site that hits only one slot — the two views drift the moment the asymmetry ships.

---

## Accessibility

- ≥44pt tap targets on touch (`var(--touch-min)` token). Enforced via `@media (hover: none) and (pointer: coarse)` for components that drop to a tighter size on desktop (e.g. `.ios-form-row` is 40px desktop / 44px touch).
- Honour `prefers-reduced-motion` — there's a top-level `@media (prefers-reduced-motion: reduce)` block in `CSS_COMMON`; new transitions/animations should be wrapped or kept short enough to not need it.
- Provide `aria-label` on icon-only buttons. `.tb-icon-btn` examples in the topbar markup are the reference.
- Group destructive actions with `role="group"` and `aria-label` (see the Danger `.ios-form-group.danger-group`).

---

## Common Mistakes

### Injecting mobile-only DOM without a CSS desktop-hide guard

**Symptom**: a mobile component appears on desktop after the user resizes.

**Fix**: add the outside-MQ `display: none` + mobile-MQ override pair. See *Runtime-injected mobile chrome* above.

### Promoting a mobile rule by simply deleting its `@media` wrapper

**Symptom**: mobile loses a font-size shrink or padding override that the rule originally provided.

**Fix**: lift the canonical ruleset out, keep only the viewport-specific delta inside the MQ. Add a comment `/* v2.5.0: promoted to desktop — mobile keeps X override below */`. Verify with the v2.5.0 audit greps in the design system doc.

### Using `--hairline` for table borders

**Symptom**: table grid loses structure; columns blur together.

**Fix**: tables are containers, not lists. Keep `th, td { border-bottom: 1px solid var(--border); }`.

### Two JS write sites for one piece of cross-viewport state

**Symptom**: mobile compact bar title updates but the desktop topbar title slot is blank, or vice versa.

**Fix**: write to both slots from one helper that reads the single source of truth. See *Cross-viewport JS sync*.

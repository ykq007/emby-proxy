# Port mobile iOS-native v5 patterns to desktop UI

## Goal

Bring the iOS-native v5 visual language (commit `6f8c35d`, currently scoped to `@media (max-width: 768px)`) to the desktop / ≥769px viewport so admin and mobile share one design system, while preserving idioms that only make sense on touch devices.

## Background

`6f8c35d` rebuilt the mobile experience as a "purpose-built iOS app" — large titles, sticky compact bars, inset-grouped forms, hairline dividers, continuous-corner radii, skeleton shimmer, refreshed login — all gated behind `@media (max-width: 768px)`. The iOS *tokens* (`--text-headline`, `--text-large-title`, `--radius-ios`, `--hairline`, `--ios-fill`, `--ios-fill-quat`, `--ios-overlay`) already live at `:root`, but the *components* that consume them are mobile-only.

Desktop today still uses the Aurora Console v2.3.0 chrome (glass topbar, KPI hero, danger tab) with `--radius-card: 16px` and ad-hoc form rows. The two surfaces have drifted apart.

## In scope (must port)

1. **iOS large-title + sticky compact bar** — section header reads as `--text-large-title` (34px → desktop may scale up modestly); on scroll, a 17px sticky bar fades in. Desktop already has a glass topbar, so the sticky compact bar should layer cooperatively (not duplicate).
2. **Inset-grouped form pattern** — `.ios-form-group`, `.ios-form-group-label`, `.ios-form-row` with hairline dividers, `.is-tap` / `.is-danger` modifiers. Lift these rules out of the mobile media query so they apply on desktop too. **Primary consumer on desktop: the Danger section** (each action becomes one `.ios-form-row` inside a single `.ios-form-group`). The Settings section is a structured deploy-node form, not a preferences list — it stays structurally as-is and only gets the radius/hairline polish.
3. **Continuous-corner radius adoption** — surface cards (and KPI tiles) move toward `--radius-ios` (18px) on desktop where it improves cohesion. Allow per-component opt-out if a tighter radius reads better.
4. **Hairline dividers** — replace ad-hoc `border-bottom: 1px solid var(--border)` inside list/form/table rows with `--hairline` so the rhythm matches mobile.
5. **iOS fill tap/hover states** — desktop hover for tappable list rows should use `--ios-fill-quat` (resting) / `--ios-fill` (pressed) instead of bespoke greys.
6. **Skeleton shimmer parity** — verify `.skeleton` shimmer applies on desktop KPI tiles before first data write (the mobile commit added it; confirm it isn't gated to mobile).
7. **Refreshed login chrome** — port the iOS login refresh (gradient logo medallion, large title, inset input field) to desktop, keeping the desktop layout (centered card, no fixed-bottom CTA).

## Out of scope (mobile-only idioms)

- 5-tab bottom tab bar (`overview/speed/stats/settings/more`) — touch nav idiom; desktop already has sidebar.
- Sheet modal with two detents + drag-to-dismiss — gesture-driven; desktop modal stays a centered overlay.
- Topbar collapse to brand + theme toggle — desktop topbar shows full toolbar.
- Active outline→filled icon swap in the tab bar — N/A without the tab bar.
- `safe-area-inset-*` padding — N/A on desktop.
- Fixed-bottom CTA in login — keep desktop CTA inside the card.

## Acceptance criteria

- [ ] At ≥769px, section headers render as iOS large titles; on scroll past the title baseline, a compact 17px sticky title shows above the content (cooperating with, not duplicating, the existing glass topbar).
- [ ] `.ios-form-group` / `.ios-form-row` styles apply at ≥769px with hairline dividers, `.is-tap` hover/press states (`--ios-fill-quat` / `--ios-fill`), and `.is-danger` red treatment.
- [ ] Desktop Danger section is rewritten as a single `.ios-form-group` containing one `.ios-form-row.is-danger` per action (title + description column, red CTA trailing). The existing `.danger-hero` heading is preserved.
- [ ] Cards and KPI tiles on desktop use `--radius-ios` (or a documented exception) and `--hairline` for internal dividers — no remaining `1px solid var(--border)` row separators in ported sections.
- [ ] KPI tiles render with `.skeleton` shimmer on first paint at all viewports, stripped by `updateAuroraKpis`.
- [ ] Login at ≥769px shows the gradient logo medallion + large title + inset input; CTA stays inside the card.
- [ ] Mobile (≤768px) visual + behavior is byte-for-byte unchanged (visual diff and the v2.4.0 overhaul still reads correctly).
- [ ] Both light and dark themes look correct on desktop after the port.
- [ ] No new horizontal-overflow, layout-shift, or tap-target regressions at the 769px / 1024px / 1440px breakpoints.
- [ ] All rules are still in `worker.js` (single-file constraint preserved); version bumped to v2.5.0 with a short changelog comment.

## Constraints

- All UI lives in `worker.js` (single-file Cloudflare Worker). Edits stay in that file.
- iOS tokens already exist at `:root` (lines ~71–82) and in `body.dark` (~123–126). Do not duplicate them.
- Mobile rules must not regress; the desktop port is additive (new rules outside `@media (max-width: 768px)`, or rules promoted out of the media query).
- No third-party CSS/JS additions; vanilla CSS only.

## Notes

- Desktop large-title sizing may need a separate token (e.g. `--text-large-title-lg: 40px`) if 34px feels small on wider canvases — decide in design.md.
- Some patterns (sticky compact bar) overlap with the existing glass topbar; the design must spell out which layer owns the title at scroll.

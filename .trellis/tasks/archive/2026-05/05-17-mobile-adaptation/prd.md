# PRD: Mobile Adaptation for admin panel

## Goal and User Value
Apply iOS-native mobile design language to the Emby Proxy admin panel so it is usable, thumb-friendly, and visually consistent on small screens. Source design: Claude Design "Mobile Adaptation.html" (handoff bundle).

## Confirmed Facts
- All UI is embedded inside `worker.js` as `CSS_COMMON`, `LOGIN_UI`, and `HTML_UI` string constants.
- The existing CSS already declares an `@media (max-width: 768px)` block (line 110+), but it only collapses grids and stacks toolbars — it does not implement iOS interaction patterns.
- The desktop UI is already Apple-system fonts, blue/gray palette, matching the design system used by the prototype.
- Design prototype is React/JSX — not a literal porting target. Per the bundle README: "Match the visual output; don't copy the prototype's internal structure unless it happens to fit."

## Requirements

### Mobile breakpoints
- Refine iOS-style rules at `max-width: 768px` (existing breakpoint).
- Add tighter rules at `max-width: 480px` for phone-only changes.

### Touch & layout
- Touch targets >= 44px on phone for buttons, switches, list rows, icon buttons.
- Page padding tightens to 12-16px on mobile; cards round to 12-14px.

### Modals -> bottom sheets
- All large modal dialogs (`#dashboardModal`, `#nodeFormModal`, `#dnsModal`, `#cnameTestModal`, etc.) become bottom sheets at `<=768px`:
  - Full width, anchored to bottom, max-height ~92vh.
  - Rounded top corners only (`border-radius: 18px 18px 0 0`).
  - Slide-up entrance animation.
  - Drag-handle indicator at top center.

### Forms (iOS Settings style)
- Form rows: left-label / right-value, min-height 44px, 0.5px hairline dividers.
- Text inputs in rows: borderless, right-aligned, transparent background.
- Sticky-bottom "save" bar with blurred background — always reachable by thumb.

### Speed test list (`#dnsModal`)
- Result rows render as cards with leading checkbox + IP/meta + latency pill with color dot.

### Login page
- Phone: eyebrow label ("反代核心 · 安全中心"), large title ("欢迎回来"), single-focus input, primary button, soft radial gradient ornaments.

### Top status bar
- Phone: redundant CF Trace / update-banner copy hides; remaining items reflow as horizontally-scrollable pills.

### Out of scope
- Bottom tab-bar navigation (no separate routes — only modals).
- Dark-mode visual tuning.
- JavaScript-level UX changes (no new modal logic).
- Backend / API changes.

## Acceptance Criteria
- [ ] Visible breakpoint changes at <=768px and <=480px.
- [ ] All modals open as bottom sheets on phone with rounded top corners + drag handle.
- [ ] Form rows in deploy modal follow iOS Settings layout on phone.
- [ ] Sticky save-bar at the bottom of the deploy modal on phone.
- [ ] Login page on phone shows large title, gradient ornaments, full-width primary button.
- [ ] Existing desktop layout (>768px) is unchanged.

## Open Questions
- None — design intent comes from the chat transcript and the JSX prototype.

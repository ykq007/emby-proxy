# Mobile UI — Refined iOS-Native Overhaul

## Background

`worker.js` is a single-file Cloudflare Worker (5,718 lines, 339KB) containing two embedded HTML UIs: `LOGIN_UI` (1402-1458) and `HTML_UI` (1460-4229). The admin shell uses a desktop sidebar + topbar + 6 sections (overview, speed, stats, settings, tools, danger); on mobile, the sidebar is hidden and replaced by a 4-slot bottom tab bar `#mobileTabBar`. Recent commits (v2.2.0 alignment tokens, v2.3.0 Aurora KPI band, glass topbar, danger tab) layered design polish on top of existing mobile work, but the mobile experience still reads as "desktop admin made narrower," not "iOS-native app."

User direction: **Refined iOS-native** — lean into the iOS HIG foundation already present (44pt touch targets, safe-area-insets, sheet modals, bottom tab bar, fluid type), but execute it with intentionality. System-app feel: frosted glass, soft depth, SF-style typography rhythm, grouped insets, large title → compact title on scroll.

## Goals

1. Mobile feels like a purpose-built iOS app, not a responsive admin.
2. Every primary action in every section reachable from the bottom tab bar (no orphaned tabs).
3. Visible-without-scroll status: RTT, health, today-traffic, mode all readable in one glance.
4. Touch targets ≥44pt, with iOS-correct feedback (filled icons on active tab, scale-press, restrained haptic-style transitions).
5. Information hierarchy: one large title per screen, supportive subtitles, then content.
6. Forms use inset-grouped iOS pattern with continuous-corner radii (16-18px).

## Non-goals

- Desktop UI redesign — desktop stays as-is (Aurora Console v2.3.0). All changes are gated behind mobile media queries `@media (max-width: 768px)` or `@media (max-width: 480px)`.
- No new backend endpoints, no API shape changes.
- No new dependencies (still vanilla CSS+JS embedded in `worker.js`).
- No login-flow logic change — only visual treatment.

## Scope

In-scope screens:
- **Login** (`LOGIN_UI`, worker.js:1402)
- **Admin shell mobile chrome**: bottom tab bar, mobile topbar, status pills (worker.js:765+, 1392+, 4106+)
- **Overview section** including Aurora KPI hero band (worker.js:2174-2253, 1254-1352)
- **Speed/DNS section** (worker.js:1679+)
- **Stats section** (worker.js:1646+)
- **Settings section** (worker.js:2023+)
- **Tools section** (worker.js:2157+)
- **Danger section** (worker.js:2254-2291, 1190-1246)
- **Dashboard sheet modal** (`#dashboardModal`, worker.js:615-643)
- **Deploy/edit form** (`#addForm`, worker.js:662+)

Out-of-scope:
- Desktop layouts (≥769px)
- Toolbar drawer for placement (already tappable from m-pill — preserve)
- Worker.js backend logic (proxy, DNS, traffic, etc.)

## Acceptance Criteria

### Navigation
- [ ] Bottom tab bar reaches **all 6 sections** (overview, speed, stats, settings, tools, danger). Either expand to 5+more, use a "更多" sheet, or merge sections — choose in design.
- [ ] Active tab uses **filled icon** variant; inactive uses outline variant.
- [ ] Tab bar respects `env(safe-area-inset-bottom)`.
- [ ] Removing topbar mobile horizontal scroll: status info is either pinned visible (no scroll) or moved into the screen body. The topbar on mobile shows ≤2 elements (brand + 1 utility).

### Pages & hierarchy
- [ ] Each section has an **iOS large title** (34px / 700 weight / -0.02em tracking) that collapses to a compact 17pt title in a sticky compact-bar when scrolled past ~52px.
- [ ] One clear focal element per screen (KPI hero on overview, big test button on speed, etc.).
- [ ] Status pills no longer horizontal-scroll: either fit in a 2×2 mini-grid above the KPI hero, or merged into the Aurora KPI hero itself.

### Visual & interaction
- [ ] All cards on mobile use continuous-corner radius (`border-radius: 18px`), with 16-20px inner padding.
- [ ] All form rows use iOS inset-grouped pattern: rounded outer card, internal rows divided by 0.5px hairlines, inset 16px from screen edge.
- [ ] Press states: every interactive element animates to `scale(0.97)` on `:active` with `transition: transform 0.08s`.
- [ ] Logout requires a confirmation prompt and lives inside the Settings section (not in topbar).
- [ ] Modals adopt iOS sheet behavior with a visible grabber (already present) AND open-detent ~85vh, drag to dismiss kept.
- [ ] Skeleton-shimmer placeholders for KPI tiles + first list before data loads.

### Typography & system feel
- [ ] Body uses `-apple-system, BlinkMacSystemFont, "SF Pro Text"` (already in place — verify).
- [ ] Tabular numerals for all stats (`font-variant-numeric: tabular-nums`) — already used on KPI, extend to pills/stats.
- [ ] Numeric stats anchored bottom-left, label uppercase 11px tracking 0.10em.

### Login
- [ ] Mobile login is full-bleed with a 64px gradient logo, 34px large title, 16px subtitle, single inset-grouped input row, fixed-bottom CTA respecting safe-area-bottom.
- [ ] No card chrome on mobile (already done — verify).

### Quality bars
- [ ] No regression on desktop (≥769px) — visual diff on overview/speed/settings looks identical.
- [ ] Renders correctly on iPhone SE width (375px), iPhone 14 Pro (393px), small Android (360px), and tablet portrait (768px boundary).
- [ ] Landscape phones (max-height: 480px) remain usable.
- [ ] `prefers-reduced-motion` honored (already done — verify).
- [ ] Light + dark themes both pass.

## Open Questions

None for now — execute on best iOS-native judgment, log decisions in design.md.

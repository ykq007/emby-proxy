# PRD: Full-system UI alignment pass (admin + mobile)

## Background

`worker.js` renders three HTML surfaces from inline templates: `LOGIN_UI` (~line 1043), `HTML_UI` admin dashboard (~line 1101), and mobile views layered via `@media (max-width: 768px)` inside the shared `CSS_COMMON` (line 12). The admin shell was recently redesigned into a sidebar-nav dashboard (commit `895383b`), the mobile UX was overhauled in v4 (commit `19fa0e9`), and the codebase already has an explicit `ui-design-system.md` spec at `.trellis/spec/frontend/`.

The visual *language* is in good shape (Apple-inspired Swiss minimalism, three-state theme, tier-based buttons, sprite icons). What's drifting is the **alignment plumbing underneath it** — the scales, tokens, and shared component vocabulary that keep the language coherent as features get added. This task closes that gap.

## Current pain points (concrete, evidence-based)

Audited from `CSS_COMMON` lines 12–~900:

1. **No spacing scale.** Padding / gap / margin values are ad-hoc: 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 30 px appear with no system. Two visually identical regions can use `gap: 12px` vs `gap: 14px`.
2. **No type scale.** Font sizes are ad-hoc: 10 / 11 / 12 / 13 / 14 / 15 / 16 / 18 / 19 / 28 px. The `.a-stat-val` is `19px` (off-grid), several labels mix `11px` vs `12px` for the same role.
3. **Anarchic radius.** `--radius-card: 16px` exists but is the only token. Buttons use 6 / 8 / 10 px; cards use 12 / 14 / 16 px; pills/badges use 20 / 30 / 999 px; the toast is `30px`. There is no `radius-sm / md / lg / pill` set.
4. **Tokens defined but bypassed.** `--ok / --warn / --err` are declared on `:root` and `body.dark` (line 28–30, 48–50) but `#34c759` / `#ff9500` / `#ff3b30` are hardcoded in ~15 component rules (`.btn-del`, `.btn-dns`, `.a-status-dot.*`, `.a-tag.good/warn/danger`, `.a-stat-val.danger`, etc.).
5. **Primary-color alpha is not tokenized.** `rgba(0,113,227,*)` appears with alpha 0.08 / 0.1 / 0.14 / 0.15 / 0.18 / 0.2 / 0.32 across hovers, focus rings, badges, and glows. No `--primary-soft / --primary-ring / --primary-glow` triad.
6. **Parallel button vocabularies.** `.btn-submit` (legacy), `.btn-edit`, `.btn-del`, `.btn-dns`, `.a-btn-edit`, `.btn-tier` (current) all coexist. The spec already calls out the tier system as canonical; the migration just hasn't propagated.
7. **Parallel icon-button vocabularies.** `.icon-btn` (28×28), `.a-icon-btn` (32×32), `.tb-icon-btn` (size varies) — three sizes, three border/shadow rhythms.
8. **Optical alignment drift.** `.card` uses `padding: 24px`; `.emby-card` uses `padding: 20px`; `.a-thumb` is 38×38 while `.emby-icon` is 42×42; the topbar mixes `.tb-stat` heights with 28×28 buttons. Adjacent rows do not share baseline.
9. **Inline `style="..."` overrides.** Multiple sites (e.g. line 1138 danger card, line 1147 deploy button, line 1216 placePill, line 1221–1231 topbar elements) carry inline geometry/colors that should live in classes.
10. **Mobile parity gaps.** Recent mobile work is good, but pills/topbar mirrors duplicate values rather than sharing token-driven sizing; touch targets on `.icon-btn` (28×28) fall below Apple's 44pt recommendation.

## Goals

G1. **A single design-token layer** for spacing, type, radius, status color, and primary-color alpha — declared once, referenced everywhere.

G2. **Visual rhythm parity.** Sibling components (cards, stat tiles, buttons, badges, icon buttons) align to the same scale on padding, gap, height, and radius.

G3. **Component vocabulary consolidation.** One canonical button system (`.btn-tier`), one canonical icon-button (with size variants), one canonical card padding token — legacy classes kept working but no new code uses them.

G4. **Cross-surface consistency.** Login, admin, mobile all consume the same tokens. Mobile pills and topbar stats share the same height/padding tokens.

G5. **Compliance with the existing UI spec.** Nothing in this pass contradicts `.trellis/spec/frontend/ui-design-system.md`; the spec is *extended* with the new token layer + alignment rules.

## Non-goals

- **Not a visual redesign.** Colors, typeface, sidebar layout, mobile tab bar, three-state theme, sparkline node cards, headers editor — all stay.
- **Not removing legacy classes in one sweep.** `.btn-submit`, `.btn-edit`, etc. remain functional; they're just demoted to "legacy, do not extend."
- **Not touching backend, routing, proxy core, D1 schema, TG bot, GraphQL.** This is CSS/HTML only inside `CSS_COMMON` and the three HTML templates.
- **Not changing the icon sprite** (`#i-plus`, `#i-x`, etc.) or replacing inline emoji buttons (`⚙️`, `🌓`, `⏻`) — separate consideration.
- **Not bumping minor UX behaviors** (showSection routing, theme cycling, lazy chart init).

## Acceptance criteria

- [ ] **AC1 — Token layer exists.** `:root` and `body.dark` declare a complete set: `--space-{1..8}`, `--text-{xs,sm,md,lg,xl,2xl,3xl}`, `--radius-{sm,md,lg,xl,pill}`, `--primary-soft`, `--primary-ring`, `--primary-glow`. (Concrete values agreed in `design.md`.)
- [ ] **AC2 — Status color tokens used everywhere.** Zero occurrences of literal `#34c759`, `#ff9500`, `#ff3b30`, `#ff453a`, `#30d158`, `#ff9f0a` inside component rules in `CSS_COMMON`. (Allowed only inside `:root` / `body.dark` token declarations.) Verifiable by `grep`.
- [ ] **AC3 — Primary-alpha tokens used.** Zero occurrences of `rgba(0,113,227,*)` and `rgba(47,155,255,*)` outside the token block. Verifiable by `grep`.
- [ ] **AC4 — Spacing scale adopted.** All `padding` / `gap` / `margin` values inside `.card`, `.emby-card`, `.a-head`, `.a-stats`, `.a-stat`, `.a-foot`, `.toolbar`, `.action-group`, `.table-wrapper`, `th/td`, `.topbar`, `.sidebar*`, `.tb-stat`, `.m-pills`, `#mobileTabBar` map onto `var(--space-*)`. (Audit script in `implement.md`.)
- [ ] **AC5 — Type scale adopted.** All `font-size` values in the same scope map onto `var(--text-*)`. `.a-stat-val` resolves to a scale step (likely `--text-xl` = 20px), no longer 19px.
- [ ] **AC6 — Radius scale adopted.** Every `border-radius` value maps onto `var(--radius-*)` or `var(--radius-pill)`. The four card-family elements (`.card`, `.emby-card`, `.table-wrapper`, `.card-header`) share the same radius token.
- [ ] **AC7 — Single icon-button family.** `.icon-btn`, `.a-icon-btn`, `.tb-icon-btn` consolidated into `.icon-btn` + size modifiers (`.is-sm` 28×28, default 32×32, `.is-md` 36×36). Old class names kept as aliases.
- [ ] **AC8 — Sibling-component padding parity.** `.card` and `.emby-card` use the same internal padding token. `.a-stat` columns share equal padding. Verified visually at desktop and mobile.
- [ ] **AC9 — Mobile touch targets ≥ 44px.** All buttons inside `@media (max-width: 768px)` resolve to `min-height: 44px` (or 44px width for icon-only). Topbar `.tb-icon-btn`, mobile `.icon-btn` updated.
- [ ] **AC10 — Inline geometry overrides removed.** No `style="padding:|margin:|width:|height:|gap:|border-radius:|background:#|color:#"` survives on elements inside the admin/login/mobile shells. (Inline `style="display:none"`, dynamic transforms from JS, and CSS variable assignments are exempt.)
- [ ] **AC11 — Spec updated.** `.trellis/spec/frontend/ui-design-system.md` adds an "Alignment system" section documenting tokens, scales, and the icon-button consolidation. `CURRENT_VERSION` is bumped (per the existing spec's bump rule).
- [ ] **AC12 — No regressions.** Login, admin (overview / speed / stats / settings / tools), mobile (each tab), and the three-state theme all render and operate as before. Manual smoke check captured in `implement.md`.

## Out of scope (deferred, not done here)

- Replacing emoji buttons (`⚙️`, `🌓`, `⏻`, `🔄`) with sprite icons.
- Migrating every `.btn-submit` / `.btn-edit` call site to `.btn-tier`.
- Rebuilding the topbar emoji avatar.
- Adding a dedicated component-preview page (`/admin/_styleguide`).
- Re-keying any localStorage values.

# Design: Full-system UI alignment pass

## Architecture

All work lives inside `worker.js` in three regions:

| Region | Lines (approx.) | Role |
|---|---|---|
| `CSS_COMMON` template literal | 12 – ~900 | The only stylesheet. Both `LOGIN_UI` and `HTML_UI` interpolate it. |
| `LOGIN_UI` HTML | 1043 – 1099 | Login page markup. |
| `HTML_UI` admin HTML | 1101 – ~3000 | Sidebar dashboard markup. |
| `CURRENT_VERSION` const | line ~3 | Bumped after `CSS_COMMON`/`HTML_UI` changes per existing spec. |

No new files. No new dependencies. No build step (this is a Worker single file).

## Token contract

Added at the top of `CSS_COMMON`, alongside existing tokens. Both `:root` (light) and `body.dark` get any token whose value differs between modes.

### Spacing scale (8-pt grid with 4-pt half-steps)

```css
--space-1:  4px;
--space-2:  8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 48px;
```

Rationale: every existing literal (4 / 8 / 10 / 12 / 14 / 16 / 20 / 24) snaps to a step within ±2px. The off-grid `10` collapses to `--space-2` (8) or `--space-3` (12) depending on visual role; the off-grid `14` collapses to `--space-3` (12) inside dense rows and `--space-4` (16) inside cards. Each migration is enumerated in `implement.md`.

### Type scale (modular, ratio ≈ 1.15)

```css
--text-xs:  11px;   /* eyebrow labels, badges, dense meta */
--text-sm:  12px;   /* table cell helper, stat sublabel */
--text-md:  13px;   /* default body in dense regions */
--text-base:14px;   /* default body */
--text-lg:  15px;   /* node card title, primary body */
--text-xl:  16px;   /* form input (also iOS no-zoom anchor) */
--text-2xl: 20px;   /* large stat value */
--text-3xl: 28px;   /* hero icon glyph */
```

Rationale: collapses 10/11→`xs`, 12→`sm`, 13→`md`, 14→`base`, 15→`lg`, 16→`xl`, 18/19→`2xl` (`.a-stat-val` snaps from 19→20), 28→`3xl`. Line-height is set per role, not per token.

### Radius scale

```css
--radius-sm:   6px;   /* chips, tiny pills, ping-badge */
--radius-md:   8px;   /* default button, icon-btn, action-group */
--radius-lg:  12px;   /* table-wrapper, search-input, tag containers */
--radius-xl:  14px;   /* node card */
--radius-2xl: 16px;   /* primary cards (= existing --radius-card) */
--radius-pill: 999px; /* badges, status pills, toast */
```

`--radius-card` is retained as an alias of `--radius-2xl` for backward compatibility (existing spec references it).

### Status color tokens (extending existing `--ok / --warn / --err`)

Add the alpha variants that currently appear as hardcoded `rgba(52,199,89,0.08)` etc.:

```css
--ok:        #34c759;   --ok-soft:    rgba(52,199,89,0.10);   --ok-ring:    rgba(52,199,89,0.20);
--warn:      #ff9500;   --warn-soft:  rgba(255,149,0,0.10);   --warn-ring:  rgba(255,149,0,0.20);
--err:       #ff3b30;   --err-soft:  rgba(255,59,48,0.10);   --err-ring:  rgba(255,59,48,0.20);
```

Dark-mode overrides reuse the dark hex (`#30d158` / `#ff9f0a` / `#ff453a`) with the same soft/ring alphas.

### Primary-color alpha tokens

```css
--primary-soft:  rgba(0,113,227,0.10);
--primary-ring:  rgba(0,113,227,0.20);
--primary-glow:  rgba(0,113,227,0.32);
```

Dark-mode swaps to `rgba(47,155,255, ...)` at the same alphas. `--accent-glow` (already declared) becomes an alias of `--primary-glow`.

### Touch tokens

```css
--touch-min: 44px;   /* iOS HIG minimum, applied to mobile interactive elements */
```

## Component consolidation

### Icon-button family

Today three classes diverge:

| Class | Size | Border | Shadow |
|---|---|---|---|
| `.icon-btn` | 28×28 | none | `0 2px 6px rgba(0,0,0,.05)` |
| `.a-icon-btn` | 32×32 | `1px solid var(--border)` | none |
| `.tb-icon-btn` | varies (28×28 or 32×32 by inline style) | inconsistent | inconsistent |

Target: a single `.icon-btn` rule + size modifiers + intent modifiers.

```css
.icon-btn { /* base: 32x32, bordered, neutral */
  width: var(--icon-btn-md, 32px); height: var(--icon-btn-md, 32px);
  border: 1px solid var(--border); background: transparent; color: var(--text-sec);
  border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.15s;
}
.icon-btn:hover { color: var(--text); background: var(--surface-2); }
.icon-btn.is-sm { width: 28px; height: 28px; }
.icon-btn.is-md { width: 32px; height: 32px; }     /* explicit, == default */
.icon-btn.is-lg { width: 36px; height: 36px; }
.icon-btn.is-danger-hover:hover { color: var(--err); border-color: var(--err); background: var(--err-soft); }
.icon-btn.is-shadow { border: none; box-shadow: 0 2px 6px rgba(0,0,0,.05); }

/* Aliases — keep existing markup working */
.a-icon-btn  { /* aliased — same rules as .icon-btn */ }
.tb-icon-btn { /* aliased — defaults to .is-sm on desktop, .is-lg on mobile */ }
```

Concretely: `.a-icon-btn` becomes an alias selector (or its rule body is replaced by `@extend`-style duplication of `.icon-btn`'s rules). `.tb-icon-btn` keeps its own selector but its rules now reference the same tokens.

### Card-family padding parity

`.card { padding: var(--space-6); }` and `.emby-card { padding: var(--space-6); }` — both 24px. The 4px loss on `.emby-card` is acceptable because the card's internal `gap: var(--space-3)` (12px) compensates.

### Status colors in components

Every literal status hex replaced:

| Pattern | Replacement |
|---|---|
| `background: #34c759` (`.btn-dns` border, status dots, etc.) | `background: var(--ok)` |
| `background: rgba(52,199,89,0.08)` | `background: var(--ok-soft)` |
| `border-color: rgba(52,199,89,0.2)` | `border-color: var(--ok-ring)` |
| `color: #ff3b30` | `color: var(--err)` |
| `box-shadow: 0 0 5px #34c759` (status dot glow) | `box-shadow: 0 0 5px var(--ok)` |

Same pattern for warn / err.

## Inline-style cleanup

Targeted inline styles to remove and replace with classes (line numbers approximate, exact map in `implement.md`):

- **Line 1138** danger card: `style="max-width: 760px; margin: 60px auto; position:relative; border-left: 4px solid #ff3b30; box-shadow: 0 10px 40px rgba(0,0,0,0.2);"` → new class `.card.is-danger-highlight` (centered, danger left-border, lifted shadow).
- **Line 1147** deploy button: `style="margin-left: auto;"` → flex-aligned via a new `.danger-card-foot { justify-content: flex-end; }` wrapper.
- **Line 1216** placePill: `style="cursor:pointer;"` → `.tb-stat.is-clickable { cursor: pointer; }`.
- **Line 1221, 1222** trace entries: `style="display:none;"` is dynamic — leave as is (it's behavioral, not geometric).
- **Line 1231** logout: `style="width:28px;height:28px;"` → `.icon-btn.is-sm` (the new sizing modifier).

## Data flow & state

None. This is purely presentational CSS. No JS handlers, no localStorage keys, no API contracts touched.

The only JS-adjacent concern: `nodeBadgeHtml()` / `nodeSparklineHtml()` / `HeadersEditor.*` render markup that uses these classes. Since we keep all existing class names valid (aliases, not removals), the renderers don't need to change.

## Backwards compatibility / rollout shape

- **Legacy class names preserved as aliases.** `.btn-submit`, `.btn-edit`, `.btn-del`, `.btn-dns`, `.a-btn-edit`, `.a-icon-btn`, `.tb-icon-btn`, `.icon-btn` — none are deleted. They all continue to render. Their internal values are rewritten to consume the new tokens, so visual rhythm tightens but the API for downstream code (which renders them by name) is unchanged.
- **No version-key migration needed** because the localStorage keys (`emby_theme`, `emby_active_section`, `emby_sidebar_collapsed`, `emby_proxy_dark` legacy) are not touched.
- **`CURRENT_VERSION` bump** triggers the existing in-panel update prompt — users see "发现新版本" and can opt to refresh; this is the documented signal for material `CSS_COMMON` changes.

## Rollback shape

This is a single-commit-level change set bundled as one PR-equivalent commit. Rollback = revert that commit. Because the change is presentational and the JS contract is unchanged, partial rollback (revert just the radius scale, keep spacing) is also viable by selecting per-token blocks — but no automated rollback step is required.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| A sibling component looks visibly different after `padding: 20px` → 24px change. | Medium | Smoke-check the four node-grid layouts at desktop + mobile in `implement.md` step 2.4. |
| Mobile `min-height: 44px` causes the topbar to overflow vertically. | Low | The topbar already accommodates 28-px chips with surrounding padding; verify in mobile portrait at 360 / 390 / 414 widths. |
| `--accent-glow` alias to `--primary-glow` changes the alpha by ±0.04 in dark mode. | Low | Acceptable; the difference is sub-perceptual. If a regression is seen, add an exact-match alpha override. |
| `--radius-card` alias breaks if a `var(--radius-card)` reader expects a literal. | Negligible | CSS `var()` resolution is identical; no JS reads CSS variables here. |
| `CURRENT_VERSION` bump triggers updater while a user is mid-session. | Low | Existing behavior, opt-in. Acceptable. |

## Done definition

All ACs in `prd.md` checked. `grep` audits in `implement.md` return zero offenders. Manual smoke check across login + admin (5 sections) + mobile (5 tabs) + theme cycling shows no regressions. Spec updated. `CURRENT_VERSION` bumped. Single commit on `main`.

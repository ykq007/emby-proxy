# UI audit fixes: token bypasses + a11y baseline

## Background

Full UI audit (2026-05-25) found three hard-coded color bypasses that defeat dark-mode theming, and two system-wide a11y gaps (focus-visible coverage, prefers-reduced-motion). Land both in a single commit.

## Scope

### Part 1 — token bypass fixes (3 sites)

| # | File:Line | Current | Replacement |
|---|---|---|---|
| 1 | `worker.js:535` `.tb-icon-btn:hover` | `box-shadow: 0 2px 8px rgba(0,113,227,0.12)` | `box-shadow: 0 2px 8px var(--primary-ring)` |
| 2 | `worker.js:2527` `LOGIN_UI body::before` | `radial-gradient(circle, rgba(0,113,227,0.22), rgba(0,113,227,0) 70%)` | `radial-gradient(circle, var(--primary-glow), transparent 70%)` |
| 3 | `worker.js:4021` Chart.js trend dataset | `borderColor: '#0071e3', backgroundColor: 'rgba(0,113,227,0.1)'` | Read from CSS vars via `getComputedStyle(document.documentElement).getPropertyValue('--primary')` inside `updateChartColors()` so the chart re-themes when the user toggles dark mode. |

### Part 2 — a11y baseline in `CSS_COMMON`

Append one block near the bottom of `CSS_COMMON` (before the mobile MQ blocks):

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

Use `:where()` so specificity stays 0 — existing rules that already define their own focus-visible (e.g. `.tb-icon-btn:focus-visible`) keep winning.

### Part 3 — bump version

`CURRENT_VERSION` "2.5.0" → "2.5.1" (per spec: bump whenever `CSS_COMMON` or rendered HTML materially changes).

## Out of scope

- Status-page fork (audit item #3 — separate task).
- Inline-style hygiene sweep (audit item #4 — opportunistic).
- aria-label coverage pass (audit item — separate task).

## Acceptance

- `grep -nE 'rgba\((0,113,227|47,155,255)' worker.js` returns only token-definition lines (47-49, 111-113, 117, 7213, 7228) — no `.tb-icon-btn` or `body::before` hits.
- Chart trend re-paints with current theme palette when toggling dark mode (no stale blue on dark bg).
- Tab-key navigating the admin panel produces a visible blue 2px outline on buttons / inputs.
- `CURRENT_VERSION` reads `2.5.1`.
- No new spec audit-gate regressions (re-run gates).

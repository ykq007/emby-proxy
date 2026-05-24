# Design

## Overview

Rework the embedded UI in `worker.js` as a single-file, no-build frontend. The design keeps the current server/API behavior intact and treats the UI as static templates plus in-page JavaScript.

## Visual Direction

Use a playful media-library aesthetic:

- Warm, cinematic palette instead of generic admin blue: cream/light theme base, ink text, coral/mango/mint accents, and a deep theater-like dark mode.
- Poster-card energy for route nodes, with richer media-card headers, soft illustrated gradients, and friendly status chips.
- Keep Chinese copy and useful emoji cues, but make hierarchy cleaner so controls remain scannable.
- Prefer distinctive font imports and CSS visuals over extra JavaScript dependencies.

## Boundaries

### In Scope

- `CSS_COMMON` redesign: tokens, typography, backgrounds, cards, buttons, forms, tables, modal, route cards, mobile adaptations.
- `LOGIN_UI` markup/styling adjustments for the same visual system.
- `HTML_UI` section-level markup and class changes for clearer layout hierarchy.
- Dynamic route-card template inside `load()` where card structure and classes affect the main library view.
- Dynamic table row styles only where required for visual consistency.

### Out of Scope

- Backend Worker request routing and API behavior.
- KV/D1/storage schema or data formats.
- Authentication behavior.
- Adding a frontend framework, bundler, or separate assets folder.

## DOM Contract

Preserve all current IDs and handler entry points used by JavaScript, including but not limited to:

- Login: `toast`, `tokenInput`, `login()`.
- Main shell: `updateAlert`, `cf-trace-card`, `dashboardModal`, `themeToggle`, `rttDot`, `rttValue`.
- Placement: `cf-mode-select`, `cf-region-select`, `cf-custom-input`, `place-status`, `updatePlacement()`, `handleModeChange()`.
- Deployment: `codeArea`, `fileInput`, `deployBtn`, `deployWorker()`.
- DNS/speed test: `dnsStatus`, `ipType`, `customApiUrl`, `customIps`, `statusText`, `testTableBody`, `selectAll`.
- Route form: `addForm`, `oldPrefix`, `remark`, `prefix`, `mode`, `iconSelectBtn`, `iconPickerPanel`, `iconGrid`, `iconUrl`, `nodeCache`, `submitBtn`, `targetInputs`, `customHeaders`.
- Library: `list-grid`, `searchNode`, `selectAllNodes`, `batch-mode-select`, `batch-status`.
- Dynamic route cards: `.route-item`, `data-prefix`, `data-search`, `.node-cb`, `.drag-handle`, `ping-*`, `p-*`, `t-*`.

## Layout Strategy

- Add a top “media cockpit” hero that groups title, RTT, dashboard, theme, and logout actions.
- Convert operational sections into visually distinct shelves:
  - status/update and Cloudflare placement,
  - dangerous deploy/update controls,
  - DNS/speed testing,
  - route create/edit form,
  - media library route grid.
- Keep dense controls compact but improve labels, spacing, and action grouping.
- Keep route nodes as cards, but make them feel like media-library posters with strong header identity, metrics strip, source/proxy actions, and footer controls.
- Keep dashboard modal functional and restyle it as a media analytics overlay.

## Responsive Strategy

- Desktop: use grid/flex section layouts to reduce vertical scanning while keeping the route library prominent.
- Tablet/mobile: collapse shelves into single-column cards, preserve full-width controls, and retain table-to-card conversion via `data-label`.
- Avoid horizontal overflow in dynamic tables, forms, route cards, and modal content.

## Compatibility Notes

- Existing inline event handlers remain valid.
- Existing SortableJS handle remains `.drag-handle`.
- Existing Chart.js canvases and modal IDs remain unchanged.
- External visual assets may be used, but avoid introducing additional JavaScript library dependencies.
- Because the file is a Cloudflare Worker module, syntax validation should parse it as ESM.

## Rollback

This is mostly contained to the UI constants and dynamic frontend templates. Rollback is restoring the previous `CSS_COMMON`, `LOGIN_UI`, `HTML_UI`, and affected dynamic HTML snippets in `load()` / test-row generation if needed.

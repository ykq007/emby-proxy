# Add option to hide node names on public status page

## Goal

Allow the operator to globally hide all node names (public_alias / remark / prefix) on the public `/status` page, so the page can be shared without exposing which downstream Emby nodes back it.

## Background

- Public status route: `worker.js` `GET /status` -> `loadStatusData` -> `renderStatusHtml`.
- Each card today renders `c.name = public_alias || remark || prefix` at `worker.js:6852`.
- A global key-value config table (`kv_config`) already exists at `worker.js:6981`; new global flags should live there rather than in a new table.
- Admin UI for status settings is in section `embyStatus` (`worker.js` ~ line 3647), driven by `loadEmbyStatusAdmin()` (~ line 4354) and `updateEmbyRouteFlag()` API at `/api/status/route-flags`.

## Requirements

- Global toggle (one switch, not per-node) that hides all node names on `/status`.
  - Default: OFF (names visible — current behavior).
- Persistence: store as a row in `kv_config` (e.g. `k = 'status_hide_node_names'`, `v = '1'/'0'`).
- Admin UI: surface the toggle inside the existing `embyStatus` admin section, above the per-route list. Saving the toggle must call a JSON API and reflect immediately.
- Public render: when the flag is on, `renderStatusHtml` must replace each card's name with `节点 1`, `节点 2`, … numbered by sort order, **and** hide the icon (render the neutral `s-icon-fallback` slot instead of the `<img>` tag).
- Scope: only the `GET /status` route. `/public/<token>` dashboard share keeps real names and icons (deliberately granted access).
- No leakage on `/status` when flag ON: rendered HTML must contain no `public_alias`, `remark`, or `prefix` value and no `icon` URL for status cards.

## Non-goals

- Per-node visibility toggle (already exists via `show_on_status`).
- Hiding icons, charts, or counts.
- Auth-gated reveal (no "click to reveal" UX).

## Acceptance Criteria

- [ ] New row in `kv_config` created on demand; default behavior unchanged when row absent.
- [ ] Admin section `embyStatus` shows a labeled toggle "公开页隐藏节点名称" with current state loaded from backend.
- [ ] Toggling the switch persists via a new (or extended) admin API and survives a page reload.
- [ ] `/status` with flag ON shows cards labeled `节点 1`, `节点 2`, … in sort order; no real names or icon URLs appear in HTML source.
- [ ] `/status` with flag OFF is byte-equivalent to current output (no regression).
- [ ] `/public/<token>` dashboard share is unaffected (real names + icons always shown there).
- [ ] Manual smoke test passes: toggle on -> reload `/status` -> names masked; toggle off -> names restored.

## Notes

- Lightweight task: PRD-only is acceptable.
- Implementation surface is small: 1 helper for reading kv_config flag, 1 patch to `renderStatusHtml` masking logic, 1 admin UI row + 1 API handler.

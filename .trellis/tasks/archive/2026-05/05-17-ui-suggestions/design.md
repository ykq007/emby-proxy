# Design — UI Suggestions implementation

## Architectural shape

`worker.js` is a single-file Cloudflare Worker. The browser UI is two big template-literal constants:

- `CSS_COMMON` (line ~14) — shared CSS used by both login and main HTML.
- `HTML_UI` (line ~326) — the full main-panel HTML + inline `<script>`.

All three R1/R2/R3 changes are edits to these two constants. No new files, no new endpoints, no schema changes. The serialization contract for `custom_headers` (KV pairs joined by `\n`) is preserved end-to-end, so the backend (`/api/routes` POST handler at ~line 2592, the column-add migration at ~line 2506, and the per-request injection at ~line 2691) is untouched.

## Component design

### Headers Editor module

Drop-in module, ported verbatim from `Headers Editor.html` (the design's "After · Pro" prototype), with minimal adaptation:

- Public API stays exactly as the prototype defines: `HeadersEditor.init / set / get / addRow / insertTemplate / openCurlModal / parseCurl / closeCurlModal`.
- Module is wrapped in an IIFE so it does not pollute the global namespace beyond `window.HeadersEditor`.
- Render target is a div `#hed-editor` inserted where the textarea used to live. The textarea itself is removed.
- Toast helper is reused from the existing global `showToast` (already defined in worker.js — confirm; if not, add a local one matching the design's style).
- The cURL modal is appended once to `document.body` (not inline inside the form) so it overlays correctly and isn't clipped by the card.
- `editNode` (~line 1158–1160) — replace the direct `document.getElementById('customHeaders').value = ...` with `HeadersEditor.set(card.getAttribute('data-custom-headers') || '')`.
- `addForm.onsubmit` (~line 1201) — replace `document.getElementById('customHeaders').value.trim()` with `HeadersEditor.get()`.
- Form reset (~line 1225) — replace `document.getElementById('customHeaders').value = ''` with `HeadersEditor.set('')`.
- Initial bootstrap: call `HeadersEditor.init('')` once after `HTML_UI` finishes DOM ready, so the empty state renders correctly on first paint.

### Form sectioning

The current form is a flat list of horizontal `div` rows mixed with two `.b-section`-style boxes. The new structure groups these into four `.a-fieldset` blocks, each with a `.a-fieldset-head` (uppercase label + right-aligned aux text). New CSS classes are added to `CSS_COMMON`:

```
.a-fieldset, .a-fieldset-head, .a-field-label, .a-field-aux,
.a-row, .a-row.two, .a-upstream-row, .a-tag-pri, .a-tag-bk,
.a-add-row, .a-card-pick, .a-thumb-mini, .a-toggle-row,
.a-footer, .switch (only if not already defined)
```

Existing JS functions referenced by the form keep their IDs/handlers:

- `#remark`, `#prefix`, `#mode`, `.target-input`, `#iconSelectBtn`, `#iconPreview`, `#iconDefault`, `#iconSelectText`, `#iconUrl`, `#iconPickerPanel`, `#nodeCache`, `#submitBtn`, `#addForm`, `#oldPrefix`.

So the markup move is pure structural rewrap; selectors stay valid. `handleTargetInputs` continues to govern auto-appending backup lines (the design's "+ 添加备用线路" button can either trigger the same handler or stay as a UI-only visual — design shows it as an explicit button, so wire it to a small helper that appends a new `.target-input` and calls `handleTargetInputs()`).

The "导出配置 / 导入配置" dropdown is a minimal menu helper. Add a generic `.menu` / `.menu-wrap` / `.menu.open` set of styles (already exists in design CSS) and a `toggleMenu(btn)` + `closeAllMenus()` helper. The click-away listener attaches once.

### Toolbar tier cleanup

Add four utility button classes to `CSS_COMMON`:

```css
.btn-tier { ... base white card with thin border, hover bg }
.btn-tier.is-primary  { blue   }
.btn-tier.is-success  { green  }
.btn-tier.is-danger   { red    }
.btn-tier.is-ghost    { transparent }
```

Rather than rewriting the existing `.btn-submit` class (used in many places we are not touching), we apply the new tier classes selectively to the buttons being rebuilt. Inline `style="background:#..."` overrides on the affected buttons are removed; the buttons inherit colors from the tier class.

The speed-test toolbar's secondary actions (`复制去 ITDog`, `直推 CNAME`, `更新 TOP3 至 DNS`, `清空列表`) get hoisted into a `<div class="menu-wrap">` containing a "更多 ▾" button and a `<div class="menu">` with the four `<button>`s (clear-list shown as `.danger` styled menu item).

## Data flow / contracts

- `HeadersEditor.get()` returns a string in the exact format the existing backend expects:
  - one line per enabled, non-empty-key row
  - `key.trim() + ": " + value`
  - duplicate keys (case-insensitive) deduped, first occurrence wins
- `HeadersEditor.set(str)` parses the string:
  - splits on `\n`, trims each line
  - skips blanks and lines starting with `#`
  - splits on first `:` only — value can contain colons
  - lines without a colon are silently dropped (matches the prototype)
- For the icon picker, the existing data attributes (`#iconUrl`) keep functioning since we keep the IDs.

## Compatibility

- Backend KV / D1 schema: no change.
- Auto-updater (the `CURRENT_VERSION` string parsed from GitHub raw) needs `2.0.7` to advertise the new build.
- Existing nodes stored in D1 with `Authorization: x\nCookie: y` load straight into the editor; saving them back produces a byte-identical string (assuming the user touches nothing — `serialize()` re-emits the same format).
- Dark mode: existing `body.dark` rules cover the new tokens because they all reuse the same `--card / --border / --text` variables.

## Rollout / rollback shape

- One commit. Diff is large but locally contained inside `worker.js`.
- Rollback = revert the commit; no migration to undo.
- Smoke checklist after deploy:
  1. Open the panel, see the four-fieldset form.
  2. Add a node with custom headers, refresh, edit it — headers reload identically.
  3. Toggle one header off, save, fetch the route via `/api/routes`, confirm the toggled row is gone from `custom_headers`.
  4. Click "更多 ▾" in the speed-test toolbar; the four collapsed actions still run their original `onclick` handlers.
  5. Mobile viewport (DevTools 390 px) — form is single-column, editor rows still tappable.

## Risks / tradeoffs

- The Headers Editor is ~220 lines of new JS dropped into `HTML_UI`. `worker.js` grows by ~300 net lines. Acceptable given the project is already a 2,800-line single-file Worker.
- Drag-and-drop is HTML5 native, which is brittle on touch. The design accepts this tradeoff (mobile users get tap-to-toggle/delete instead).
- We deliberately do not touch `.btn-submit`; the existing colored buttons elsewhere in the page (login, dashboard) keep their current look. This avoids visual blast radius beyond the scope of UI Suggestions.html.

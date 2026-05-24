# Implementation Plan

Single file (`worker.js`). All steps run in order; gates marked **REVIEW** are points to stop and verify before moving on.

## 0. Prep

- [ ] 0.1 Confirm prototypes saved locally for reference: `/tmp/design-fetch/emby-proxy/project/Headers Editor.html`, `Color and Form Cleanup.html`.
- [ ] 0.2 Sanity-check current state: `grep -n "VERSION:" worker.js` → `2.0.6` at line 1; `grep -n "customHeaders" worker.js` → textarea at ~583, edit at ~1160, submit at ~1201, reset at ~1225.

## 1. CSS additions to `CSS_COMMON`

- [ ] 1.1 Add the 4-tier `.btn-tier` system (primary/success/danger/ghost variants).
- [ ] 1.2 Add `.menu-wrap`, `.menu`, `.menu.open`, `.menu button`, `.menu .danger`, `.menu hr` styles for dropdowns.
- [ ] 1.3 Add the Headers Editor styles: `.hed`, `.hed-head`, `.hed-list`, `.hed-row` (+`.dragging`/`.disabled`), `.hed-handle`, `.hed-k`, `.hed-v`, `.hed-v-wrap`, `.mask-btn`, `.hed-del`, `.hed-footer`, `.hed-meta`, `.add-row`, `.hed-empty`, `.templates`, `.templates-label`, `.chip`, `.chip-curl`.
- [ ] 1.4 Add the iOS-style `.switch` / `.switch.on` if not already present (search first; if a `switch` class exists in the mobile block, use a more specific name to avoid clashes — call it `.ios-switch`).
- [ ] 1.5 Add fieldset styles: `.a-fieldset`, `.a-fieldset-head`, `.a-field-label`, `.a-field-aux`, `.a-row`, `.a-row.two`, `.a-upstream-row`, `.a-tag-pri`, `.a-tag-bk`, `.a-add-row` (+`.a-add-row svg{width:13px;height:13px}`), `.a-card-pick`, `.a-thumb-mini`, `.a-toggle-row`, `.a-footer`.
- [ ] 1.6 Add the cURL modal styles `.modal-bg`, `.modal-bg.show`, `.modal`, `.modal-actions`, scoped so they don't conflict with the existing `#dashboardModal` rules.

**REVIEW** after 1.x: re-render in browser, confirm no visual regressions on the existing dashboard / login / node-list cards.

## 2. SVG sprite

- [ ] 2.1 Inject a hidden `<svg>` sprite near the top of `HTML_UI` (before the first `.card`) defining symbols: `i-plus`, `i-x`, `i-save`, `i-download`, `i-upload`, `i-chevron`, `i-more`, `i-eye`, `i-eye-off`. Reuse Lucide paths from the prototype.

## 3. Headers Editor JS module

- [ ] 3.1 Inside the main `<script>` block of `HTML_UI` (around line 631+), insert the `HeadersEditor` IIFE module. Copy the prototype verbatim, adapt `eyeSvg()` / `eyeOffSvg()` to use `<use href="#i-eye"/>` / `<use href="#i-eye-off"/>` to dedup against the sprite.
- [ ] 3.2 Confirm worker.js already has a global `showToast`. If not, add a minimal one matching the design tokens.
- [ ] 3.3 Inject the cURL modal markup (the `<div class="modal-bg" id="curl-modal">…</div>`) into `HTML_UI` right before `</body>` (alongside the existing `#dashboardModal`).

## 4. Form rewrite (in `HTML_UI`)

- [ ] 4.1 Replace the entire `<div class="card">` containing `<form id="addForm">` (around lines 522–586) with the four-fieldset layout. Preserve IDs: `oldPrefix`, `remark`, `prefix`, `mode`, `addForm`, `submitBtn`, `nodeCache`, `iconSelectBtn`, `iconPreview`, `iconDefault`, `iconSelectText`, `iconUrl`, `iconPickerPanel`, `customApiUrl`, `customIconUrlInput`, `iconSearch`, `iconGrid`, `targetInputs`, `target-input` class.
- [ ] 4.2 Inside the "上游线路" fieldset, render the existing two `<input class="target-input">` rows wrapped in `.a-upstream-row` with the `主源` / `备 1` tag chips. Add a dashed `<button class="a-add-row" type="button" onclick="addBackupLine()">` whose handler appends a new `.target-input`, calls `handleTargetInputs()`.
- [ ] 4.3 Inside the "自定义请求头" fieldset, replace the old `<textarea id="customHeaders">` with the `<div id="hed-editor">…</div>` editor shell (the `.hed-head` + `.hed-list` + footer + templates).
- [ ] 4.4 Inside "显示 & 缓存" fieldset, wrap the existing icon picker into a `.a-card-pick` style box on the left, and the `#nodeCache` checkbox into a `.a-toggle-row` with an `.ios-switch` on the right. The switch must mirror the checkbox state (set up two-way binding so existing logic referencing `#nodeCache.checked` keeps working).
- [ ] 4.5 Move the "保存部署" submit button into the `.a-footer` row at the bottom of the form.
- [ ] 4.6 Replace the header-row 导出/导入 buttons with a `⋯ 配置工具` `.menu-wrap` dropdown calling `exportConfig()` / `importConfig()`.

## 5. Speed-test toolbar rewrite

- [ ] 5.1 Identify the toolbar at ~lines 466–496. Remove inline `style="background:..."` from the buttons that survive in the visible row.
- [ ] 5.2 Apply `.btn-tier .btn-tier.is-primary` to `提取预设源并测速`; `.btn-tier` (default) to `测试粘贴的节点` and `拉取 API 并测速`; `.btn-tier.is-success` to `提交选中节点至 DNS`.
- [ ] 5.3 Build a `<div class="menu-wrap">` containing a `更多 ▾` button + a `.menu` with four items: `复制去 ITDog` (calls existing `batchTcpPing()`), `直推 CNAME (免测速)` (`directSubmitCname()`), `更新 TOP3 至 DNS` (`updateTop3ToDns()`), and a `danger`-styled `清空列表` (`clearTest()`). Each item closes the menu via `closeAllMenus()`.
- [ ] 5.4 Remove the now-dead `<div style="width: 100%; height: 1px; ...">` divider that previously separated the rows of saturated buttons.

## 6. Dropdown helpers

- [ ] 6.1 Add `toggleMenu(btn)` and `closeAllMenus()` JS helpers in the `HTML_UI` script. Attach a single `document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) closeAllMenus(); })` near app init.

## 7. Wire the editor to the form lifecycle

- [ ] 7.1 At app init (right after DOM ready, near where `loadRoutes()` is first called), call `HeadersEditor.init('')`.
- [ ] 7.2 `editNode(prefix)` (~line 1158): replace the textarea-write with `HeadersEditor.set(card.getAttribute('data-custom-headers') || '')`.
- [ ] 7.3 `addForm.onsubmit` (~line 1201): replace `document.getElementById('customHeaders').value.trim()` with `HeadersEditor.get()`.
- [ ] 7.4 Form reset block (~line 1225): replace `document.getElementById('customHeaders').value = ''` with `HeadersEditor.set('')`.
- [ ] 7.5 Search the rest of `worker.js` for any other reference to `customHeaders` and migrate it. Confirm none of the backend code depends on the DOM id (it doesn't — only on the serialized string).

## 8. Version bump

- [ ] 8.1 Update `// VERSION: 2.0.6` (line 1) → `// VERSION: 2.0.7`.
- [ ] 8.2 Update `const CURRENT_VERSION = "2.0.6"` (line 3) → `"2.0.7"`.

## 9. Validation

- [ ] 9.1 `node --check worker.js` → no parse errors.
- [ ] 9.2 Boot `wrangler dev` (or just open via a local file substitution if not configured); open the panel, walk through:
  - Empty form: add headers via "+ 添加请求头" and via templates.
  - Templates dedup: clicking `+ Authorization` twice shows "「Authorization」已存在".
  - cURL paste: paste `curl 'x' -H 'A: 1' -H "B: 2"`; both rows appear.
  - Mask: type `Authorization`; the value column masks; eye toggles.
  - Disable + save: disable a row; check serialized output omits it (use console: `HeadersEditor.get()`).
  - Drag a row up/down; order changes in the output.
- [ ] 9.3 Round-trip an existing node: edit a node that has `Authorization: foo\nCookie: bar`, do not change anything, click 保存. Re-edit; rows should be unchanged.
- [ ] 9.4 Speed-test toolbar: open "更多" menu; click each item; existing handlers still fire (the underlying functions are unchanged).
- [ ] 9.5 Resize browser to 390 px (iPhone 12 width). Confirm form is single-column, editor rows operable.
- [ ] 9.6 Dark mode: toggle theme; confirm new components inherit correctly.

## 10. Rollback points

- After step 1: pure CSS additions, safely revertable.
- After step 4: form is rewritten; revert step 4 alone if styling is broken without touching the editor module.
- After step 5: toolbar rewrite is its own isolated chunk; revertable separately.

## Validation commands

```bash
node --check /home/ykq001/emby-proxy/worker.js
grep -n "customHeaders\|HeadersEditor" /home/ykq001/emby-proxy/worker.js
grep -c "btn-tier\|a-fieldset\|hed-row" /home/ykq001/emby-proxy/worker.js
```

Expected after implementation:
- `customHeaders` references → 0 (or only in legacy comments).
- `HeadersEditor` references → in module + 3 call sites = ≥4.
- New class names appear ≥ 5 times each.

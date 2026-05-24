# Implement UI Suggestions: headers split, form sections, toolbar cleanup

## Background

Claude Design handoff `UI Suggestions.html` (with companion prototypes `Headers Editor.html` and `Color and Form Cleanup.html`) proposes three concrete UI improvements to the Emby reverse-proxy admin panel rendered by `worker.js`:

1. Split the single `<textarea id="customHeaders">` into a structured Key/Value editor (the user's original ask).
2. Reorganize the "部署反代节点" form into four labeled fieldsets.
3. Reduce the rainbow of saturated button colors to a 4-tier system; collapse long-tail toolbar actions into a "更多" dropdown.

Mobile adaptation (a separate design in the same bundle) is already shipped in commit `3c4a773`. The recommendations canvas, Top Bar Redesign and Node Card Redesign are **out of scope** for this task — only the three improvements that the UI Suggestions canvas itself enumerates are in scope.

## Goal

Bring the worker.js admin panel's deploy-node card, custom-headers field, and toolbars into line with the UI Suggestions design without altering backend/API contracts.

## Requirements

### R1. Custom Headers Editor (the headline change)

Replace the existing `<textarea id="customHeaders">` (around line 583) with the "增强版 (推荐)" KV editor from `Headers Editor.html`. The editor must support:

- Two-column Key / Value rows; per-row delete button.
- Per-row enable/disable iOS-style toggle; disabled rows are excluded from serialized output.
- Automatic value masking for sensitive keys (`Authorization`, `Cookie`, `X-Api-Key`, `X-Auth-Token`, `X-Emby-Token`, `Token`); eye-icon to toggle mask.
- Drag-and-drop row reordering (via the ⋮⋮ handle).
- Quick-insert template chips: `Authorization`, `Cookie`, `X-Emby-Token`, `X-Forwarded-For`, `User-Agent`. Inserting a template that already exists shows a toast and re-enables the existing row instead of duplicating.
- "粘贴 cURL" modal that parses `-H 'key: value'` flags out of a pasted curl command.
- Empty-state hint when no rows exist.
- Counter showing "N 条已启用".

The editor must expose the contract used in the design:

```
HeadersEditor.init(str)   // bootstrap on first render
HeadersEditor.set(str)    // when editing an existing node
HeadersEditor.get()       // when submitting the form
```

The serialized output **must remain exactly `Key: Value\n...`** — same format the textarea produced — so the worker backend (`/api/routes` handler, D1 schema column `custom_headers`) is unchanged.

### R2. Deploy Form Reorganization

Rebuild the `<form id="addForm">` (around line 531) into four labeled sections, matching the "After" prototype in `Color and Form Cleanup.html`:

1. **基础信息** — 备注 / 短路径 / 模式 (3-col row).
2. **上游线路** — 主源 + 备 N rows, each prefixed by a colored tag (`主源` blue chip / `备 N` grey chip); a dashed "+ 添加备用线路" button replaces the existing dynamic line-add mechanism (UI only; preserve the existing line-add handler behavior).
3. **自定义请求头** — the Headers Editor from R1.
4. **显示 & 缓存** — two-column row: icon picker card on the left, cache toggle card (iOS switch) on the right. The existing icon picker / cache checkbox functionality must continue to work.

A footer row at the bottom of the form holds the "保存并部署" button, separated by a thin divider.

The "导出配置 / 导入配置" buttons in the card header collapse into a single `⋯ 配置工具` dropdown that exposes 导出 / 导入.

### R3. Button Color Tier Cleanup

Apply the 4-tier button system from the design:

- **Primary (blue)** — at most one per region. Saved for: 保存并部署 / 提取预设源并测速 / 查看数据大屏.
- **Success (green)** — only "推进确认" actions: 提交选中节点至 DNS, 一键升级.
- **Danger (red)** — irreversible only: 覆盖部署 Worker / 删除节点 / 退出登录.
- **Default (white + 1px border)** — everything else.

Concretely:

- The speed-test toolbar (around line 466–496) is rebuilt as: 1 Primary "提取预设源并测速" + 2 Default "测试自定义节点 / 拉取 API" + 1 Success "提交选中节点至 DNS" + a "更多 ▾" dropdown collapsing `复制去 ITDog / 直推 CNAME / 更新 TOP3 至 DNS / 清空列表`.
- 全局测速 / 刷新全站海报 in the node-list card change from saturated cyan/red boxes to Default styling (red stays Danger only if it is destructive — "刷新全站海报" is destructive cache wipe so it stays red; "全局测速" becomes Default).
- 导出配置 / 导入配置 (purple+orange) move into the form-header dropdown per R2.

The 4-tier system is exposed as four reusable CSS classes (`btn`, `btn-primary`, `btn-success`, `btn-danger`) layered on top of the existing `.btn-submit`. Inline `style="background:#..."` overrides on the affected buttons get removed.

## Constraints

- Single-file project. All edits land in `worker.js`.
- No database/schema changes. `custom_headers` is still serialized as `Key: Value\n...`.
- Desktop and mobile layouts must both keep working. The mobile CSS block (`@media (max-width: 768px)`) added in commit `3c4a773` must keep functioning; new markup must respect the existing mobile rules or extend them.
- No new external dependencies. The Headers Editor is vanilla JS, dropped inline.
- Keep all existing JS behaviors intact: `handleTargetInputs`, `toggleIconPicker`, `nodeCache` checkbox, `editNode`, `addForm.onsubmit`, form reset on success, etc.
- Preserve Chinese-language copy and the Apple-style design tokens (CSS variables already in `CSS_COMMON`).
- Bump `VERSION` / `CURRENT_VERSION` to `2.0.7` because this changes the rendered HTML the auto-updater compares against.

## Out of Scope

- Top Bar Redesign, Node Card Redesign, Mobile Adaptation revisions (separate design files; mobile is already done).
- Removing emoji from areas outside the three targets above (e.g., node-card emoji icons, status text in `statusText`).
- Backend changes (auth, KV schema, routes endpoint).
- Dark mode regressions are not required to be fixed if they pre-exist; do not introduce new ones.

## Acceptance Criteria

- [ ] AC1. Existing custom-header data round-trips through the new editor unchanged: editing a node with `Authorization: Bearer xxx\nX-Emby-Token: abc` populates two rows; saving without edits produces the byte-identical string.
- [ ] AC2. Disabling a row removes it from `HeadersEditor.get()`; re-enabling restores it.
- [ ] AC3. Sensitive keys (`Authorization` / `Cookie` / `X-Emby-Token`) render with masked values by default and unmask on eye-icon click.
- [ ] AC4. The cURL paste modal accepts `curl 'x' -H 'A: 1' -H "B: 2"` and adds both headers.
- [ ] AC5. The deploy form renders the four labeled fieldsets in the listed order; icon picker and cache toggle continue to work; "+ 添加备用线路" still appends new line inputs and `handleTargetInputs()` still runs.
- [ ] AC6. The speed-test toolbar has at most one primary-colored button. "更多 ▾" reveals exactly: 复制去 ITDog, 直推 CNAME, 更新 TOP3 至 DNS, 清空列表.
- [ ] AC7. Export/Import buttons are accessible via a `⋯ 配置工具` dropdown in the form header.
- [ ] AC8. After saving a node, the form resets, including clearing the Headers Editor (no leftover rows).
- [ ] AC9. Version string visible in login footer reads `v2.0.7`.
- [ ] AC10. Mobile viewport (≤768 px) still shows a usable single-column form; the Headers Editor rows remain operable on a touch screen.

# Implement — /status 移动端重设计

## 执行顺序
1. **建独立预览 prototype**：`/.trellis/tasks/05-24-mobile-status-redesign/preview.html`，内置 mock data（12 节点，混合 live/down/warn），完整呈现新版样式与交互；用户在浏览器/截图复核。
2. 用户确认设计后，把 prototype 中的 CSS + DOM 结构移植回 `worker.js`：
   - 替换 `renderStatusHtml(data, opts)` 的 HTML 模板与内联 CSS。
   - 服务端渲染初始 station date/time（UTC+8）。
   - 保持 `themeBoot`、`themeToggleScript` 与 localStorage key `status_theme` 不变。
   - 删除不再使用的旧变量（aurora、glass、grain）。
3. **行为脚本**：
   - segment filter（all / live / down）：纯 CSS，via `[data-filter]` 切换。
   - 每 30s 更新 masthead 时间（mobile 端可选）。
   - reduced-motion 路径在 CSS 内处理，JS 无需特判。
4. **回归验证**（手动）：
   - `npx wrangler dev` 启动 → 访问 `/status` 真机模拟 390×844 / 360 / 430 三档。
   - 切换主题 → 刷新 → 偏好保留。
   - `hideNames=1` 配置下名称变成"节点 N"。
   - 桌面 1280 宽度排版正常，无横向滚动。

## 校验命令
```bash
node -e "const w=require('./worker.js');" 2>&1 | head    # 仅检查语法
npx wrangler deploy --dry-run                              # CF Workers 体积检查
```

## 回滚点
- commit `bfc556d feat(status): redesign /status with glass aurora theme + health ring + light/dark toggle` 是上一版。如新设计被回退，`git revert <new-commit>` 即可恢复。

## 不要做的事
- 不动 `loadStatusData` SQL 与 `cards[]` schema。
- 不动 `/card/:token.svg`、`/api/status/*` 路由。
- 不在 prototype 阶段就改 worker.js（先 review 再落地）。

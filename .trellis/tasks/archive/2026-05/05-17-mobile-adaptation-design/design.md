# Design · 移动端适配

## 总体方案

继续沿用 `worker.js` 单文件、内联模板字符串方案。所有改动集中在三个区域：

1. `CSS_COMMON`（lines 12–622 当前状态）
   - 在 `Top Bar Redesign` CSS 块之后、`iOS-style mobile adaptation` 块之前/之内追加新的 CSS：
     - `.m-pills` / `.m-pill` / `.m-pill .dot` (移动端 pill 行；桌面端不展示)
     - `#mobileTabBar` 主样式 + active + dark mode
     - `.m-sheet-handle` (sheet handle bar 共用样式)
     - `.m-sticky-cta` (sticky bottom CTA 容器)
     - 适配规则放进 `@media (max-width: 768px) { ... }` 块（不影响桌面）
2. `HTML_UI`
   - 在 `cf-trace-card` 之后（约 line 805）插入 `<div class="m-pills" id="mobilePills">`（CSS 控制只在移动端展示）。
   - 在 `</body>` 之前注入 `<nav id="mobileTabBar">`。
   - 在 `#dashboardModal > .card` 内顶部插入 `<div class="m-sheet-handle"></div>`。
3. `LOGIN_UI`
   - body 内 `.login-box` 顶部插入渐变 logo 方块 (`.login-logo`)；
   - 验证按钮下方插入 Face ID 次级按钮 (`.login-faceid`)，仅在 `@media (max-width:768px)` 中展示。
4. 在 HTML_UI 末尾的 `<script>` 中注入：
   - `mobileTabBarInit()` — 安装 4 个 tab 的 click handler，更新 active、滚动锚点、`openDashboard()`。
   - `mobilePillsUpdate()` — 监听已有 `rttValue` / `placeModeLabel` / `trafficToday` 的 DOM 变化（MutationObserver）或 piggyback 现有更新调用，把值同步到 pill 行。
   - 注入 sheet handle 与 sticky CTA 不需要新 JS（CSS-only）。

为何不抽出独立 CSS/JS 文件：保持 worker.js 自包含；Cloudflare Worker 一次性下发。

## 关键设计决策

### Tab Bar 锚点映射
| Tab | 锚点 / 行为 |
|---|---|
| 节点 | `document.getElementById('list-grid')` scrollIntoView |
| 测速 | `document.querySelector('h2#speedTitle')` 之 closest('.card')（需要新增 id="speedTitle") |
| 数据 | 直接调用 `openDashboard()` (现有函数) |
| 设置 | `#addForm` 的 closest('.card') scrollIntoView |

### 状态 Pills 数据源
- RTT：现有 `#rttValue` 文本节点；observer 同步。
- 模式：现有 `#placeModeLabel` 文本节点；observer 同步。
- 今日：现有 `#trafficToday`（在 dashboard modal 内，可能未加载）。Fallback：移动端 pill 在初次未加载时显示 `--`；监听到值后再更新。

### `cf-trace-card` 移动端
当前移动端 CSS 已使其 `flex-wrap: nowrap; overflow-x: auto`。Mobile Adaptation v2 设计是"上下两张 iOS Settings 风格卡片"，但实际面板信息更多（RTT / 入口 / 落地 / 调度 / 数据大屏按钮 / 主题切换 / 退出）。折中方案：
- 移动端将 `cf-trace-card` 改为 `flex-wrap: wrap; row-gap: 8px`；
- 标题 `tb-title` 与右侧操作组（数据大屏 / 🌙 / ⏻）分两行；
- 中间 pills（RTT / 入口→落地 / 调度）独立一行可横滑。
- 移动端隐藏 `tb-divider`、`tb-spacer`。

### 移动 Pills 行 vs cf-trace-card 重复
设计中节点列表上方的 pills (RTT / 模式 / 今日) 在 cf-trace-card 已存在 RTT、placement。为避免冗余：
- 把"今日流量"作为新增独立信息源（move from dashboard modal 顶部到主屏 pill 行）。
- 在移动端把 `cf-trace-card` 的 RTT / placement pill 隐藏，由顶部 `#mobilePills` 接管；trace（入口→落地）仍保留在 cf-trace-card。

### Sticky CTA for #addForm
- 添加 `.m-sticky-cta` 包裹原 `#submitBtn` 吗？不要包裹，避免改动 form structure。
- 替代：移动端通过 CSS 把 `#submitBtn` 自身 `position: sticky; bottom: calc(72px + env(safe-area-inset-bottom))` 让它紧贴 Tab Bar 上沿。结合现有 `order: 99` 规则确保位于末尾。

### Sheet Handle
- `#dashboardModal > .card::before` 现已是 sheet handle（line 519 `content: ''`）。**已存在**；只需确认视觉与设计一致即可。无须改动。
- `#addForm` 顶部也加 sheet handle？设计原型把整张表单做成 Sheet。但实际上 #addForm 不是 modal，是常驻 card。MVP：不为 #addForm 增加 handle（保留为常规 card），避免误导用户以为可关闭。

### Login Face ID 按钮
- 仅 UI 占位：onclick 调用 `showToast('Face ID 暂未启用')`。
- 移动端 display: flex；桌面端 display: none（与设计一致：桌面不显示）。

### Dark mode
- `#mobileTabBar` 在 dark mode 下需要不同 background；按 chat2.md 「`body.dark #mobileTabBar { background: rgba(28,28,30,0.88); }`」处理。

## 兼容性 & 回退

- 所有新 CSS rules 仅在 `@media (max-width: 768px)` 中生效，桌面 0 影响。
- 新 HTML 节点（pills 行、tab bar、login logo / faceid）默认 `display: none`，由媒体查询打开。
- 新 JS 函数在 `DOMContentLoaded` / 文件末尾运行；如查找的元素不存在则提前 return，不抛错。
- 回滚：`git checkout -- worker.js`（在本次任务的提交边界内）。

## 文件改动清单

- `worker.js`
  - CSS_COMMON 内：新增约 120 行 CSS。
  - HTML_UI 内：新增 ~30 行 HTML（pills 行 + tab bar + handle）+ 在末尾 `<script>` 注入 ~50 行 JS。
  - LOGIN_UI 内：新增 ~15 行 HTML + 对应 CSS 已部分存在或补 ~25 行 CSS。
- 无其它文件改动。

## 测试

无单元测试基础设施。手动验证：
1. `wrangler dev` 启动（或 `python3 -m http.server` 渲染 `worker-rendered.html` 等价物）。
2. Chrome DevTools Device Mode 切换 iPhone 12 / Pixel 5 视口；浏览每个区块，逐条对照验收标准勾选。
3. 桌面视口刷新，确认 Tab Bar 不可见、pills 不可见、外观未变。

回归（不能用 ChromDevtools MCP 也接受文本核对）：
- `grep mobileTabBar worker.js | wc -l ≥ 3`（CSS、HTML、JS 各一处）。
- `node --check worker.js` 通过。

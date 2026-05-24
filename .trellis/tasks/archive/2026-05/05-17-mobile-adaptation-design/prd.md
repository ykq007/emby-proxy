# PRD · 移动端适配 (Mobile Adaptation.html)

## 1. 背景与目标

Claude Design 设计交接包包含 `Mobile Adaptation.html` 原型，定义了反代面板 5 个核心屏幕（登录 / 节点列表 / 部署表单 / 线路测速 / 数据大屏）的 iOS 风格移动端体验。当前 `worker.js` 已包含一轮基础移动端适配（commit `3c4a773`），但相比设计原型仍缺少底部 Tab Bar、状态 pills 行、Sheet handle、Login 页 Face ID 入口、iOS Settings 分组表单等关键元素。

本任务在保留本地未提交改动（Node Card / Top Bar 重设计 +394/-128）的前提下，按设计原型补齐移动端表现。

## 2. 范围 (in scope)

按 chat2.md 的合并方案 + 5 个屏幕 jsx 的细节，全部应用到 `worker.js`：

1. **底部 Tab Bar (mobileTabBar)** — 节点 / 测速 / 数据 / 设置 4 按钮，毛玻璃 + `env(safe-area-inset-bottom)`，桌面端隐藏；点击切换 active 状态并平滑滚动到对应锚点（节点列表 / 测速卡 / 数据大屏 modal / 设置/部署卡）。
2. **顶部状态 pills 行 (移动端)** — 在 `cf-trace-card` 下方 / 节点列表上方，移动端展示 `RTT / 模式 / 今日流量` 三个 pill；桌面端不影响。
3. **`cf-trace-card` 移动端布局** — 移动端从横向 scroll 改为上下两张 iOS Settings 风格卡片（标题行 + pills 行），保持现有桌面端外观。
4. **部署表单 (Sheet 风格)** — 移动端 `#addForm` 区块顶部加 sheet handle bar；表单分区视觉强化（iOS Settings 大写小标题 + 圆角白卡）；底部「保存并部署」按钮变 sticky bottom CTA，覆盖 safe-area。
5. **线路测速** — 滤镜从下拉变为横滑 chips（移动端）；测速结果表格已有 stacked card，新增延迟色点 + 数字组合视觉；底部已选数量与「提交至 DNS」做 sticky 强调条（仅当有勾选时）。
6. **数据大屏 modal** — 已是 bottom sheet，新增 sheet handle 视觉。
7. **登录页** — 增加渐变 logo 方块（移动端展示）+ 「使用 Face ID 登录」次级按钮（仅 UI，触发普通登录或 toast 提示）；移动端 hero 大标题与 footer 已经存在，保留并对齐设计。
8. **页面底部留白** — body 在移动端需 `padding-bottom: calc(72px + env(safe-area-inset-bottom))` 以避开 Tab Bar。

## 3. 不在范围 (out of scope)

- 桌面端布局调整（除非移动端 CSS 不可避免地影响到桌面端，则需保护桌面端）。
- 后端 API / 节点行为变化。
- 真正的 Face ID / WebAuthn 集成（仅 UI 占位）。
- 切到 React/Vue 等框架，仍保持 worker.js 内联 HTML/CSS/JS。
- 暗色模式调优（除非新增组件需要 `body.dark` 变体最小覆盖）。

## 4. 验收标准

桌面端 (`viewport > 768px`)：
- [ ] 桌面端外观与功能与改前完全一致：节点卡、cf-trace-card、Headers Editor、dashboard modal、登录页、表单提交都保持现状。
- [ ] mobileTabBar 不可见 (`display: none`)。
- [ ] 状态 pills 行不出现在桌面端布局上。

移动端 (`viewport ≤ 768px`)：
- [ ] 页面底部出现固定 Tab Bar，4 按钮可见，毛玻璃背景，safe-area 适配；点击 4 个 tab 分别滚动至节点 / 测速 / 设置 anchor，并触发 dashboard modal 打开（数据 tab）。
- [ ] Tab Bar 不被页面内容遮挡（body 有足够 padding-bottom）。
- [ ] 节点列表顶部出现 RTT / 模式 / 今日 三个 pill（数据来自现有 `rttValue` / placement / `trafficToday` 显示）。
- [ ] `cf-trace-card` 在移动端竖排或合理紧凑，无横向滚动条溢出视口。
- [ ] 部署表单（`#addForm`）保存按钮在移动端 sticky 到底部（位于 Tab Bar 上方），点击触发现有 submit 逻辑。
- [ ] dashboard modal 顶部展示 sheet handle bar。
- [ ] 登录页移动端展示渐变 logo 方块 + Face ID 按钮；普通登录按钮仍工作；Face ID 点击给出占位 toast「Face ID 暂未启用」。
- [ ] 所有触控目标 ≥ 44pt（已有规则保留）。
- [ ] iOS Safari 输入框聚焦不再 zoom（`font-size: 16px` 规则保留）。

回归：
- [ ] worker.js 仍可被 wrangler / Cloudflare Workers 解析（无语法错误，引用的 ID 都存在）。
- [ ] 桌面端 `node-grid` 仍渲染节点卡，编辑/删除/复制/测速按钮 click handler 不丢失。

## 5. 风险与约束

- worker.js 是单文件、内联模板字符串：CSS 与 JS 都在 `${CSS_COMMON}` / 内联 `<script>` 中。新增 CSS 必须严格遵守 `@media (max-width: 768px)` 范围。
- 现有 mobile CSS 块在 lines 465–608；不能整体替换，要在其上"合并叠加"。
- 本地未提交改动在 lines 107–339 (Node Card Redesign + Top Bar Redesign CSS)，必须保留。
- Tab Bar 中"设置"目标 anchor 在面板中并无明确"设置"卡：MVP 把它指向 `#addForm` 父级 card（部署/设置区），与设计原型语义一致。
- Face ID 在 Web 环境无原生实现；本任务只做 UI 占位以与设计原型一致。

## 6. 度量

- 顶部噪声：移动端 Tab Bar 出现后，主操作（数据大屏 / 退出）由顶部移到底部触达。
- 主要表单的"保存"按钮拇指可达性（sticky bottom）。
- 不引入新 JS 错误、不破坏桌面端 Layout。

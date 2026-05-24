# 技术设计 — 管理面板 UI 重设计

## 1. 范围与约束

- 目标文件：`worker.js`，仅改主面板 HTML（约 909–3044 行）内嵌的 HTML/CSS/JS 字符串。
- 登录页（851–906）保持不变（或仅同步配色），不在本次重点。
- 不改后端 API、KV/D1 数据结构、业务逻辑函数。
- 允许调整的 JS：导航/分区切换、主题初始化、节点卡片渲染函数、移动端 tab 处理。
- 注意模板字符串转义：HTML 内的反引号、`${}`、`\` 需保持现有转义方式。

## 2. 现状回顾（关键事实）

- `.container`（993–3323）内容实际只有 3 张卡：`#speed-anchor`、`#settings-anchor`、节点列表卡。
- 「数据统计」当前是弹窗 `#dashboardModal`（944–976），含 `#trendChart`、`#locationChart`、`#logTableBody`。
- 顶部状态条 `#cf-trace-card`（1003–1046）已含 RTT/Trace/落地模式/按钮。
- 主题为纯手动：`body.dark` + `localStorage('emby_proxy_dark')`，**无** `prefers-color-scheme`。
- 移动端：`#mobileTabBar` 4 个 tab，靠 `data-tab` + 滚动定位实现（2945–2960）。
- 拖拽依赖 `.route-item` / `.drag-handle` 类；图表实例 `trendChartInstance` / `locationChartInstance`。

## 3. 目标布局

```
<body>
├─ #toast / svg sprite / 各 modal（保留）
├─ .app-shell                      ← 新增最外层 flex 容器
│  ├─ <aside class="sidebar">       ← 新增侧边栏
│  │   ├─ .sidebar-brand  (logo + 产品名)
│  │   ├─ <nav> .nav-item × N (data-section=...)
│  │   └─ .sidebar-foot  (折叠按钮 + 版本号)
│  └─ .app-main
│      ├─ <header class="topbar">   ← 由 #cf-trace-card 重构而来
│      │   状态: 运行中 / 节点总数 / 今日流量 / 健康度 / admin
│      ├─ .content
│      │   ├─ section#sec-overview   (节点列表 + 网络状态)
│      │   ├─ section#sec-speed      (#speed-anchor 内容)
│      │   ├─ section#sec-stats      (#trendChart/#locationChart/#logTableBody)
│      │   ├─ section#sec-settings   (#settings-anchor 部署表单)
│      │   └─ section#sec-tools      (cURL 导入等)
│      └─ .danger-bar  (危险操作区常驻底部条)
└─ #mobileTabBar（保留，重样式）
```

## 4. 导航分区机制

- 每个 `section` 默认 `display:none`，激活项加 `.is-active` → `display:block`。
- 新增 JS：`showSection(key)`：切换 section 与 `.nav-item.is-active`，写 `localStorage('emby_active_section')`。
- 侧边栏 `.nav-item` 绑定 `click → showSection(data-section)`。
- 移动端 `#mobileTabBar` 改为调用同一个 `showSection`（不再滚动定位），tab→section 映射：
  home→overview、speed→speed、stats→stats、settings→settings。
- 「数据统计」从弹窗改为内联 section：把 `#dashboardModal` 内的图表/日志 DOM 迁入 `#sec-stats`，
  **保留所有 id**（`#trendChart`/`#locationChart`/`#logTableBody`）。原打开弹窗的入口改为
  `showSection('stats')`。图表初始化时机：首次进入 stats section 时 lazy init（避免隐藏时
  Chart.js 尺寸为 0）。

## 5. 主题系统

- 新增三态：`auto`（跟随系统）/ `light` / `dark`，存 `localStorage('emby_theme')`。
- 初始化：读 localStorage；为空则 `auto`。`auto` 时按
  `window.matchMedia('(prefers-color-scheme: dark)')` 决定，并监听其 `change`。
- 实际生效仍通过 `body.dark` 类，复用现有 `--*` CSS 变量与 `updateChartColors()`。
- 旧键 `emby_proxy_dark` 做一次性迁移（存在则映射到新键后删除）。
- CSS 变量改造：在 `:root` 保留浅色；`body.dark` 保留深色。新增科技风变量
  （`--accent-glow`、`--surface`、`--surface-2`、徽章色 `--ok/--warn/--err`）。

## 6. 视觉规范（科技风）

- 深色：背景深近黑、卡片 `--surface` 带 1px 描边 + 轻微外发光；主色霓虹蓝。
- 状态徽章：在线=绿、延迟=黄、离线=红；圆角 pill，左侧圆点。
- 节点卡片 `.route-item`：保留类名与 `data-*`；内部结构重排为
  头部(名称+徽章) / 地址 / 地区 / 延迟·流量 / 迷你折线图 / 操作按钮。
- 迷你折线图：用内联 SVG `polyline` 绘制（不引入新依赖，避免每卡一个 Chart 实例）。
  数据缺失时显示占位。
- 浅色：同布局、亮背景、柔和阴影替代发光。

## 7. 节点卡片渲染改造

- 现渲染逻辑在约 1820–1895 行（生成 `.route-item` 卡）。需要：
  - 调整生成的 HTML 结构与 class 以匹配新卡片样式；
  - **必须保留**：`.route-item`、`.drag-handle`、`data-prefix` 及操作按钮的 `onclick` 绑定；
  - 新增状态徽章：依据现有延迟/在线判定逻辑映射 在线/延迟/离线；
  - 新增迷你 SVG 折线图（数据源：现有节点流量/延迟字段，无则占位）。

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 结构调整破坏 JS 取的 DOM id | 全程保留高风险 id（见 prd/探索清单），只移动不重命名 |
| Chart 在隐藏 section 内尺寸为 0 | stats section lazy init + 进入时 `chart.resize()` |
| 模板字符串转义出错 | 改动后 `node --check worker.js`；分块小步编辑 |
| 拖拽排序失效 | 保留 `.route-item`/`.drag-handle`，Sortable 初始化不动 |
| 移动端回归 | 保留 `#mobileTabBar` 结构，仅改样式 + 切换目标 |

## 9. 验证方式

- `node --check worker.js` 通过。
- 抽取主面板 HTML 到临时文件用浏览器打开，逐项目测（见 implement.md 验证清单）。
- 三套视图（桌面深/浅、移动端）逐一核对验收标准。

# Design

视觉系统代号 **"Signal Terminal"**。设计隐喻：一台**精密仪表 / 运维终端**——近黑的蓝图基底上铺极淡点阵网格，等宽数字是绝对主角，单一电光青 (cyan) 作为唯一品牌信号色，状态用 绿/琥珀/红 三色说话。一切动效服务于"读数变化、状态反馈、层级切换"，绝不装饰。设计语言由 Web 控制台、登录页与公开状态页共享。研究依据（2026 dashboard / motion 最佳实践）：渐进式披露、Four Golden Signals 布局、CSS-native 动效（View Transitions / scroll-driven / `@property` 计数 / `linear()` 弹簧）、Emil Kowalski 克制运动法则。

核心特征：
- **蓝图基底 (blueprint)**：近黑冷中性基底 (hue 245)，叠加极淡点阵网格 (dot-grid) 模拟工程蓝图 / 示波器栅格——不再用拉丝金属噪声。
- **电光青信号色 (cyan, hue 200)**：唯一品牌色，luminous。状态色绿(150)/琥珀(75)/红(25) 与之拉开色相，状态永不只靠颜色区分（配点 + 文字）。
- **锐利仪表形态**：克制圆角 (6–8px 为主)，hairline 分隔，卡片带细角标 (corner tick)；密度有序，数字成列对齐。
- **CSS-native 动效**：`@property` 计数滚动、`linear()` 弹簧缓动、scroll-driven 交错入场、状态点呼吸脉冲、line-draw 图表——克制、可中断、尊重 `prefers-reduced-motion`。

## Theme

双主题（**dark 默认身份** + light），均达 WCAG AA。架构色为**冷中性** (hue 240–245)。品牌个性由电光青信号色、点阵蓝图、等宽数字与 CSS-native 动效承载。
- Dark（默认）：近黑深板岩基底（非纯黑，长时运维不刺眼），青色信号 luminous，焦点/活动态带青色辉光；`--on-primary` 翻为近黑（亮青按钮需暗字保 ≥4.5:1）。
- Light（蓝图纸面）：冷白纸面，墨色文字，青色加深 (L≈0.52) 以保证正文/按钮 ≥4.5:1。

## Color (OKLCH)

电光青 (hue 200/220) 为唯一品牌信号色；状态用 green(150) / amber(75) / red(25)。token **名称沿用现有契约**（`--primary` / `--bg` / `--ok` …），仅换值，确保整套 UI 零破坏重皮。

### Dark（默认）
| Role | OKLCH | 用途 |
|---|---|---|
| `--primary` | `oklch(0.80 0.13 200)` | 品牌/主操作/选中/active 信号/链接/焦点（电光青） |
| `--primary-hover` | `oklch(0.86 0.11 200)` | hover |
| `--btn-fill` | `oklch(0.80 0.14 200)` | 文字主按钮填充 |
| `--on-primary` | `oklch(0.16 0.02 230)` | 按钮填充上的文字/图标（近黑冷） |
| `--bg` | `oklch(0.16 0.008 245)` | 页面背景（深板岩，非纯黑） |
| `--surface` / `--card` | `oklch(0.195 0.009 245)` | 内容面板 |
| `--surface-2` | `oklch(0.24 0.01 245)` | 次级面/表头/工具条 |
| `--sidebar-bg` | `oklch(0.13 0.007 245)` | 侧边栏 |
| `--text` | `oklch(0.95 0.006 230)` | 正文（冷白） |
| `--text-sec` | `oklch(0.64 0.012 240)` | 次级文字 |
| `--border` | `oklch(0.95 0.006 230 / 0.09)` | hairline 边框 |
| `--ok` | `oklch(0.80 0.17 150)` | 在线/正常 |
| `--warn` | `oklch(0.82 0.15 75)` | 警告（琥珀） |
| `--err` | `oklch(0.68 0.20 25)` | 错误/离线 |
| `--primary-soft` | `oklch(0.80 0.13 200 / 0.13)` | 品牌半透 |
| `--primary-ring` | `oklch(0.80 0.13 200 / 0.30)` | 焦点环 |
| `--primary-glow` | `oklch(0.80 0.13 200 / 0.32)` | 悬浮青辉 |
| `--grid-line` | `oklch(0.95 0.006 230 / 0.05)` | 蓝图点阵网格 |

### Light（蓝图纸面）
| Role | OKLCH |
|---|---|
| `--primary` | `oklch(0.52 0.12 220)` |
| `--primary-hover` | `oklch(0.46 0.13 220)` |
| `--btn-fill` | `oklch(0.52 0.13 220)` |
| `--on-primary` | `oklch(1 0 0)` |
| `--bg` | `oklch(0.975 0.004 240)` |
| `--surface` / `--card` | `oklch(1 0 0)` |
| `--surface-2` | `oklch(0.955 0.005 240)` |
| `--sidebar-bg` | `oklch(0.965 0.005 240)` |
| `--text` | `oklch(0.20 0.012 245)` |
| `--text-sec` | `oklch(0.46 0.012 245)` |
| `--border` | `oklch(0.20 0.012 245 / 0.10)` |
| `--ok` | `oklch(0.52 0.15 150)` |
| `--warn` | `oklch(0.62 0.14 70)` |
| `--err` | `oklch(0.55 0.20 25)` |
| `--grid-line` | `oklch(0.20 0.012 245 / 0.05)` |

**规则**：信号色仅用于状态/主操作/选中/链接，绝不做装饰；inactive 态不用高饱和色；状态不以颜色为唯一区分（配点/图标/文字）。青色辉光仅用于 hover/focus/活动状态点，幅度克制。

## Typography

mono-forward：等宽 (`--font-mono`: JetBrains Mono / SF Mono …) 承载标签、键名、ID、**全部数值**（`font-variant-numeric: tabular-nums` 成列对齐）；sans (`--font-sans`: system / PingFang SC …) 仅用于中文 prose。数字是主角——大读数用等宽、负字距、`@property` 计数滚动入场。

## Spacing & Shape

- 间距：4/8/12/16/20/24/32/48（`--space-*`）。
- 圆角：`--radius-sm 6 / --radius-md 8 / --radius-lg 12 / --radius-xl 16 / --radius-2xl 20 / pill 999`。仪表语气偏锐利——卡片默认 8–12px，控件 6–8px。
- 高程：以 hairline 边框 + 角标 (corner tick) 承载层级；hover 态升起 + 青色焦点环，**不用暖色大阴影**。

## Texture

- **蓝图点阵网格**：`body::after` 叠加极淡 dot-grid（`--grid-line`，22px 栅格），模拟工程蓝图 / 示波器栅格，替代旧的拉丝金属噪声。
- **青色辉光反馈**：hover/focus/活动状态点用品牌青辉光 (box-shadow)，克制。
- **玻璃质感**：topbar / 移动 TabBar 用 `backdrop-filter` 磨砂（`--topbar-glass` 主题感知）。
- `prefers-reduced-motion` 下所有动画降级为淡入或瞬时。

## Components

- **Status dot + label**：实心信号点（ok/warn/err，live 带 `nx-breathe` 呼吸）+ 文本/数值。
- **卡片**：圆角 8–12px，hairline 边框 + 细角标 (corner tick)，hover 态青色环升起（无暖阴影）。
- **按钮**：4-tier 体系（`.btn-tier` + `.is-primary/.is-gold→青/.is-success/.is-danger/.is-ghost`），圆角 6–8px，青色填充，hover 青辉，active 轻缩放 (0.97)。
- **侧边栏**：深板岩，青色 active 指示条。
- **大读数**：等宽 tabular-nums + `@property` 计数滚动 (`nx-count`)。

## Motion

CSS-native 优先（2026）：
- `@property --count-*` → 原生数字计数滚动（Chrome/Chromium，Safari/FF 优雅降级为直接显示）。
- `linear()` 弹簧缓动 token `--ease-spring`；标准缓动 `--ease-out: cubic-bezier(0.16,1,0.3,1)`。
- scroll-driven 交错入场（`animation-timeline: view()`，渐进增强，不支持则保持终态）。
- 既有 keyframes 复用并改青：`nx-up / nx-fade / nx-scale-in / nx-breathe / nx-count / op-pulse / op-blink / forge-reveal`。
- 时长：即时反馈 <100ms，微交互 150–300ms，复杂过渡 ≤400ms（Emil Kowalski 克制法则：自定义贝塞尔、enter = opacity+translateY+blur、exit 更轻、只动 transform/opacity/filter）。
- 全部动画可中断、`prefers-reduced-motion: reduce` 下降级。

## Layout — Operations Cockpit (结构契约 v2)

信息架构从 6 分区压缩为 **3 目的地**，首屏为 verdict-first 运维看板。导航/布局稳定决策：

- **3 目的地**（`.dest-item[data-dest]` 侧边栏 + 移动 3 项底栏 `#mobileTabBar button[data-dest]`）：**监控 / 网络 / 配置**。`showDest(dest,tab)` 驱动，`#dest/tab` 深链，View Transitions 过渡。
- **内层子分区** `.subtab-bar`/`.subtab`（由 `DEST_MAP` 动态渲染）：监控=看板·统计；网络=测速&DNS(后续可拆 cdn·redirect)；配置=部署节点·工具箱·危险区。
- **运维看板** `.cockpit-board`：`.cockpit-verdict`（呼吸状态点 + 一句话裁决 + 在线/总数）+ `.signal-strip`/`.signal-cell` 四信号（**Four Golden Signals**：延迟/流量/错误/饱和），等宽数字 + count-up，错误>0 时红色。
- **节点矩阵** `.node-list` > `.node-row` > `.nr-line`（密集行：状态徽章 + 内联 ECG sparkline `.nr-spark` + 读数 + 监控开关 + 复制 + 展开 caret `.nr-expand`）。点击 caret 就地展开 `.node-row-detail`：上游/请求头/媒体计数/直达URL + 操作 + 内联编辑 `.nrd-edit`（复用 `/api/routes`，未暴露字段沿用原值）；中心 `#editModal` 保留为「高级…」回退。默认视图为矩阵(list)。
- **⌘K 命令面板** `#cmdk`：topbar `.tb-cmdk` 触发 + `⌘/Ctrl+K`；模糊过滤 目的地/动作/节点；键盘上下选择、Enter 执行、Esc 关闭、焦点困住与归还。
- 信号色用法不变：青=品牌/选中/焦点；绿/琥珀/红=状态；节点徽章 is-online/is-slow/is-offline。

## Z-index scale

`dropdown(100) → sticky(200) → modal-backdrop(300) → modal(400) → toast(500) → cmdk(600) → tooltip(600)`。

# Design

视觉系统代号 **"Aqua"**。设计隐喻：**一块被光照亮的玻璃**——内容在下，功能性浮层在上，深度靠材质与阴影表达，而不是纹理或装饰。运动不是加在像素之上的一层：**界面从当前屏幕值出发、继承手指速度、把动量投射出去、随时可被抓住并反向**。设计依据：Apple *Designing Fluid Interfaces* (WWDC 2018)、*The Details of UI Typography* (WWDC 2020)、*Principles of Great Design* (WWDC 2026)，以及 Emil Kowalski 的克制运动法则。设计语言由 Web 控制台与登录页共享。

核心特征：
- **系统色 (systemBlue)**：唯一强调色，只用于链接／主操作／选中／焦点。状态由 systemGreen / systemOrange / systemRed 说话，绝不只靠颜色区分。
- **材质与深度 (materials)**：顶栏、侧栏、底部 TabBar、菜单、面板、Sheet 都是**半透明浮层**，内容从其下方滚过。材质厚度编码层级；表面越大 → 模糊越强、阴影越深。
- **光学排版**：系统字体优先（SF 自带 optical sizing 与 tracking 表）。字距随字号变化——大字负字距，小字略正；行高反向。
- **弹簧运动**：以 damping（回弹）+ response（响应速度）描述，不是固定时长。默认临界阻尼（不过冲）；只有用户手势自己带起来的运动才允许回弹。
- **手势即动画**：Sheet 1:1 跟手、边界橡皮筋、松手按速度投射落点并交接给弹簧——拖拽与动画之间没有接缝。

## Theme

双主题（**dark 默认身份** + light），均达 WCAG AA。
- Light：iOS grouped background（`#F2F2F7` 一族）+ 白色卡片，墨色标签层级。
- Dark：抬升灰（`#1C1C1E` / `#2C2C2E` 一族）——**不用纯黑**，长时运维要的是一个表面而不是一个洞。systemBlue 提亮，状态色 luminous。
- `--btn-fill` 比 `--primary` 更深：systemBlue 本身对白字只到 3:1（够 UI 组件，不够正文），承载文字的填充按钮需要加深到 ≥4.5:1。
- 文字落在淡色底上用 **ink** 档：`--primary-ink`（选中导航 / 子 tab / 蓝色标签）、`--err-ink`（离线徽章等红底红字）、`--teal-ink`（AAAA 记录）。`--primary` / `--err-text` 在对应 `-soft` 底上只有 ~3.7–4.0:1。
- 不用透明度做弱化：`opacity` 会把次要文字拉到 AA 以下（旧的 `.node-row.idle{opacity:.82}` 就是 131 处对比度失败的主因）。弱化用颜色 token。
- 蓝色只给可点的东西。坏值、空值、计数用中性色（例：「0 / 6 节点在线」的 0 不再是蓝色）。

## Color (OKLCH)

token **名称沿用现有契约**（`--primary` / `--bg` / `--ok` …），仅换值，整套 UI 零破坏重皮。

### Light
| Role | OKLCH | 用途 |
|---|---|---|
| `--primary` | `oklch(0.56 0.21 259)` | systemBlue：链接／选中／焦点／指示 |
| `--btn-fill` | `oklch(0.50 0.20 259)` | 承载白字的主按钮填充（加深保 4.5:1） |
| `--on-primary` | `oklch(1 0 0)` | 填充上的文字 |
| `--bg` | `oklch(0.967 0.003 286)` | systemGroupedBackground |
| `--card` / `--surface` | `oklch(1 0 0)` | secondarySystemGrouped |
| `--surface-2` | `oklch(0.955 0.003 286)` | tertiarySystemGrouped |
| `--text` | `oklch(0.17 0.006 286)` | label |
| `--text-sec` | `oklch(0.47 0.008 286)` | secondaryLabel |
| `--text-ter` | `oklch(0.62 0.008 286)` | tertiaryLabel |
| `--border` / `--hairline` | `oklch(0.17 0.006 286 / 0.11 · 0.08)` | 分隔线 |
| `--ok` / `--warn` / `--err` | `0.65 0.17 147` / `0.72 0.16 62` / `0.58 0.22 27` | systemGreen / Orange / Red |

### Dark
| Role | OKLCH |
|---|---|
| `--primary` | `oklch(0.64 0.19 258)` |
| `--btn-fill` | `oklch(0.56 0.21 258)` |
| `--bg` | `oklch(0.215 0.004 286)` |
| `--card` / `--surface` | `oklch(0.265 0.004 286)` |
| `--surface-2` | `oklch(0.315 0.004 286)` |
| `--text` / `--text-sec` | `oklch(0.985 0 0)` / `oklch(0.72 0.006 286)` |
| `--border` / `--hairline` | `oklch(1 0 0 / 0.13 · 0.09)` |
| `--ok` / `--warn` / `--err` | `0.78 0.18 147` / `0.79 0.16 66` / `0.66 0.21 27` |

**规则**：强调色仅用于状态／主操作／选中／链接，绝不做装饰；状态不以颜色为唯一区分（配点／图标／文字）。**不用辉光**——焦点用实心 ring，深度用阴影。

## Materials

半透明是**功能性浮层**，不是滤镜。

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--mat-thin` | `oklch(1 0 0 / 0.62)` | `oklch(0.24 0.004 286 / 0.60)` | 小浮片 |
| `--mat-regular` | `oklch(1 0 0 / 0.76)` | `oklch(0.235 0.004 286 / 0.74)` | 顶栏 / TabBar |
| `--mat-thick` | `oklch(0.99 0.002 286 / 0.90)` | `oklch(0.21 0.004 286 / 0.88)` | 菜单 / ⌘K / 模态 / Sheet |
| `--mat-blur-*` | `blur(20/30/40px) saturate(180–190%)` | 同 | 表面越大越厚 |
| `--mat-edge` | `oklch(1 0 0 / 0.55)` | `oklch(1 0 0 / 0.10)` | 顶边高光＝材质接住的光 |

规则：**永不把一层浅材质叠在另一层浅材质上**（可读性会塌）。顶栏用 **scroll edge effect**（内容进入浮层处渐隐）替代 1px 硬分隔线。模态任务配 scrim 变暗；并行面板只用材质与偏移、不加 scrim。

## Typography

系统字体优先（`-apple-system` / SF）。等宽仅用于**数值、键名、ID**（`tabular-nums` 成列对齐）。

| Token | 值 | 适用 |
|---|---|---|
| `--tracking-large` | `-0.032em` | ≥28px 大标题 |
| `--tracking-title` | `-0.021em` | 20–27px 分区标题 |
| `--tracking-headline` | `-0.013em` | 15–19px 标题／按钮 |
| `--tracking-body` | `-0.005em` | 13–15px 正文 |
| `--tracking-caption` | `0.005em` | 11–12px 说明 |
| `--tracking-label` | `0.055em` | 仅限全大写微标签 |
| `--leading-large / title / body / dense` | `1.08 / 1.22 / 1.47 / 1.3` | 行高与字号反向 |

层级由 **字号 + 字重 + 字距 + 行高** 作为一组构成，不靠字号单打。按钮是 sentence case——全大写＋宽字距是终端腔，不是系统腔。

## Spacing & Shape

- 间距：4/8/12/16/20/24/32/48（`--space-*`）。
- 圆角（iOS 连续圆角）：`sm 8 / md 10 / lg 14 / xl 18 / 2xl 24 / sheet 22 / pill 999`。支持 `corner-shape: squircle` 的引擎上自动升级为真连续圆角（渐进增强）。
- 高程三级：`--shadow-1/2/3`（卡片 / 悬停·浮层 / 模态·Sheet）。**不用暖色大阴影，不用辉光。**

## Motion

以 Apple 的两个参数描述弹簧，采样为 `linear()` 供纯 CSS transition 使用：

| Token | damping | response | 用途 |
|---|---|---|---|
| `--spring-smooth` | 1.0 | 0.40s | 默认（临界阻尼，不过冲） |
| `--spring-snappy` | 1.0 | 0.28s | 小尺度 UI（菜单、侧栏折叠） |
| `--spring-bounce` | 0.8 | 0.35s | 手势带起来的动量 |
| `--spring-drawer` | 0.8 | 0.30s | Sheet |

其余：`--ease-out: cubic-bezier(0.16,1,0.3,1)`；`--dur-press 110ms`（按压反馈）、`--dur-micro 200ms`、`--dur-macro 320ms`。

规则：
- **按压反馈在 pointer-down 触发**（`:active` 全局 `scale(0.97)`），不是松手后。
- **只动 `transform` / `opacity` / `filter`**；`top`/`height` 之类会每帧走布局。
- **能被抓住的东西用 transition 不用 keyframes**：keyframes 被打断会从 0 重来，transition 会从当前值重新瞄准。
- **⌘K 命令面板完全不做入场动画**——键盘触发、每天几十次，任何过渡都会被读成延迟。
- **不要缓慢循环的装饰动效**（旧的 4s logo 呼吸环、8s 登录扫光、离线徽章 2.6s 脉冲、ECG 扩散环都已删除；KPI 变化只做一次底色淡出，不做辉光）：接近 0.2 Hz 的大面积振荡正是运动敏感用户要躲的东西。
- 三个无障碍信号各自独立处理：`prefers-reduced-motion`（去位移，保留透明度／颜色过渡，**不是全部关掉**）、`prefers-reduced-transparency`（材质变实、去模糊）、`prefers-contrast`（近实底 + 明确边框）。

### 手势（Sheet 拖拽关闭）

`initSheetGesture()`（`app.js`）给底部 Sheet 的完整流体链路：

1. **1:1 跟手**，尊重抓取偏移；Pointer Capture 保证指针移出元素仍跟随；10px 迟滞让点击仍是点击；拖拽开始后忽略后续手指。
2. **橡皮筋**：越过顶边后阻力递进（`over·dim·0.55 / (dim + 0.55|over|)`），不做硬停。
3. **动量投射**：按 Apple 的指数衰减 `(v/1000)·d/(1−d)`（d = 0.998）算落点，再判定关闭——快速轻扫应该能"甩"出去，而不是必须拖过某个距离。
4. **速度交接**：松手后由弹簧积分器（damping 1.0，response 0.35s）从**当前**位置、以**手指离开时的速度**继续，拖拽与动画之间没有接缝。新的按压会打断飞行中的弹簧并从当前位置接管。

## Layout — Operations Cockpit (结构契约 v2)

布局与信息架构不变（本次是重设计，不是重构）：

- **3 目的地**（`.dest-item[data-dest]` 侧边栏 + 移动 3 项底栏）：**监控 / 网络 / 配置**。`showDest(dest,tab)` 驱动，`#dest/tab` 深链，View Transitions 过渡。
- **内层子分区** `.subtab-bar`/`.subtab`（由 `DEST_MAP` 动态渲染）。
- **每个数字只出现一次。** 状态唯一来源是 `window.__nodeStats`（服务端探针）。`updateAuroraKpis()` 一处计算，写到三个地方：顶栏 `#tbStatus`（点它回看板）、裁决行、信号带。
- **运维看板** `.cockpit-board`：`.cockpit-verdict`（状态点 + 一句话裁决 + 离线节点点名 + 「更新于 N 秒前」+ 在线/总数）+ `.signal-strip` 四信号：延迟（你到边缘）/ 流量 / 离线 / 健康度。看板大标题只留给读屏（`srOnly`），裁决行就是标题。
- **看板只负责看**：批量栏 `#batchBar` 勾选节点后才出现；全局设置（国家白名单 / Referer 白名单 / 共享 Emby 账号）在 **配置 › 全局设置**；刷新全站海报、覆盖部署 Worker 只在 **危险区** 和 ⌘K。
- **节点徽章**：探针判离线 → 离线；1 小时内有播放 → 播放中；探针在线 → 在线；否则 → 空闲。
- **节点矩阵** `.node-list` > `.node-row` > `.nr-line`，caret 就地展开 `.node-row-detail` + 内联编辑；中心 `#editModal` 为「高级…」回退。
- **⌘K 命令面板** `#cmdk`：topbar 触发 + `⌘/Ctrl+K`，模糊过滤目的地/动作/节点。
- 侧栏选中态是**填充行**（`--primary-soft` + `--primary-ink` 字），不是带辉光的下划线。
- **历史**：用户点击用 `pushState`，启动与后退用 `replaceState`，`popstate` 回到上一个目的地。浏览器「返回」不会离开面板。
- **真控件**：可点的都是 `<button>` 或 `<label>`。开关是 `<button role="switch" aria-checked>`，或视觉隐藏的 checkbox（`.switch-input`）加 `.ios-switch` 外观。视觉尺寸可以小，命中区 ≥44px（伪元素或负 margin 扩展）。收起的抽屉加 `inert`。
- **确认**：用 `uiConfirm(msg, { danger, ok })`（原生 `<dialog>.showModal()`），不用 `confirm()`。危险操作默认聚焦「取消」。所有浮层共用一个 Tab 焦点环（`_activeOverlay`）。
- **第三方脚本**：Sortable 钉版本 + SRI + `defer`；Chart.js 钉版本 + SRI，由 `ensureChartJs()` 按需加载。

## Z-index scale

`dropdown(100) → sticky(200) → modal-backdrop(300) → modal(400) → toast(500) → cmdk(600) → tooltip(600)`。

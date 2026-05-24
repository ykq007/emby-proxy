# Design — 移动端 /status「Operations Bulletin」

## 美学方向
**编辑公告 × LED 行情条**。把状态页当作一份纸质日报 + 一条机场航班 LED 屏的混合体：
- 主视觉是「印章 + 头条 + 行情条」三件套，纸张/油墨质感。
- 节点采用编号目录条目（№ 01 / № 02），像股票分时榜或航班板。
- 主色：纸（cream/warm-paper）与油墨（ink-black），辅以 vermillion 朱砂红 + ink-green 印泥绿。深色模式翻转成 ink-navy 纸 + bone-cream 字。

## 字体
| 用途 | 字体 | 备注 |
|------|------|------|
| Display / 大字标题 / 数据大字 | **Fraunces** 144 700 | 可变字体；启用 `opsz`，启用 `SOFT 50`，加少量 `slnt -8` 用于副标点缀 |
| Body / 正文 / chip 文案 | **Instrument Sans** 400/500 | 现代低调 grotesque |
| Mono / 数字 / ticker / 时间戳 | **Geist Mono** 500 | tabular-nums，等宽，比 JetBrains Mono 更紧凑现代 |
| 中文回退 | "PingFang SC", "Noto Sans SC" | 系统优先 |

> 明确避开：Space Grotesk、Inter、JetBrains Mono（上一版已用）。

## 颜色变量
```
:root[data-theme="light"]
  --paper: #f3ece0
  --paper-2: #ece3d3
  --ink: #1c160f
  --ink-soft: rgba(28,22,15,.62)
  --ink-ter: rgba(28,22,15,.38)
  --rule: rgba(28,22,15,.18)
  --hair: rgba(28,22,15,.08)
  --ok: #2d5a3f       /* 印泥绿 */
  --ok-soft: rgba(45,90,63,.12)
  --bad: #b9381f      /* 朱砂红 */
  --bad-soft: rgba(185,56,31,.10)
  --warn: #b5811a
  --stamp-ring: #b9381f

:root[data-theme="dark"]
  --paper: #14161c
  --paper-2: #0d0f14
  --ink: #ece3d3
  --ink-soft: rgba(236,227,211,.62)
  --ink-ter: rgba(236,227,211,.38)
  --rule: rgba(236,227,211,.16)
  --hair: rgba(236,227,211,.06)
  --ok: #6fd49a
  --ok-soft: rgba(111,212,154,.14)
  --bad: #ff7a5c
  --bad-soft: rgba(255,122,92,.14)
  --warn: #f0c36b
  --stamp-ring: #ff7a5c
```

## 版式（mobile 390px）

```
┌────────────────────────────────────────┐
│ STATION · 2026.05.24 · 02:14   ☀/☾    │ ← masthead 32px 高，hairline 下划
├────────────────────────────────────────┤
│                                        │
│     节点状态                            │ ← Fraunces 48/52, 紧排
│     OPERATIONS BULLETIN                │ ← Geist Mono 11 letter-spacing .22em
│                                        │
│   ┌──────────────┐                    │
│   │   ╭───╮  99% │  12 NODES          │ ← 印章 (圆形 86px) + 右侧统计
│   │  │ 99│  AVAIL│  11 LIVE 1 DOWN    │
│   │   ╰───╯      │                    │
│   └──────────────┘                    │
│                                        │
│ ╔══════════════════════════════════╗  │ ← LED ticker（深色描边 + 内发光）
│ ║ ▸ ALL SYSTEMS NOMINAL · 11/12   ║  │ ← Geist Mono uppercase，缓慢横向滚动
│ ╚══════════════════════════════════╝  │
│                                        │
│ ── 全部  在线  离线 ──────────────    │ ← 分段筛选，hairline 下划当前
│                                        │
│ № 01  Node Alpha                  ●   │ ← 编号 + 名称 + 状态点
│ ─────────────────────────────────     │
│ 42 ms      99.8%     99.2%             │ ← 三个数字大字 (Fraunces 30)
│ 当前延迟   24小时    7天                │ ← Geist Mono 9 caption
│ ▮▮▮▮▮▯▮▮▮▮▮▮▯▮▮▮▮▮▮▮ history strip │
│ 电影 1240 +3   剧集 88   集数 4210     │ ← 媒体计数（开启时）
│ ─                                      │
│ LAST PROBE · 05-24 02:11               │
│                                        │
│ № 02 ...                               │
└────────────────────────────────────────┘
```

桌面 ≥1024px：masthead 横排（标题左 / 印章中 / ticker 右）+ 节点列表保持单列垂直但加大 padding。把"双列卡片网格"砍掉——`Operations Bulletin` 主题更适合长榜单。

## 核心组件
1. **Masthead bar**: `position: sticky; top: 0` 32px，含日期 / 时间 / 主题按钮，hairline 1px 下边框 + paper bg。
2. **Postmark stamp**: 86px 圆，双圈线，内层粗 6px 外层细 1px；中央 Fraunces 32 数字 + 小写 "AVAIL"，外圈用 SVG `textPath` 绕"OPERATIONS · BULLETIN · "字样形成印章感。颜色用 `--stamp-ring` 朱砂红。
3. **LED ticker**: 高 32px，圆角 4px，2px 边框深色，内嵌 1 行 horizontal scroll 文本 `▸ ALL SYSTEMS NOMINAL · 11/12 LIVE · LAST PROBE 02:11`；超过 12s 一个 cycle 的匀速滚动；reduced-motion 时静止居中显示。LED 风格通过：背景 `repeating-linear-gradient` 模拟点阵 + Geist Mono uppercase 实现。
4. **Segment filter**: 极简——文本按钮 + hairline 下划。点击切换 `data-filter`，CSS 通过 `[data-filter="down"] .s-row:not(.is-down){display:none}` 切显。
5. **Node row**: 不再是 card 阴影玻璃。改为带 hairline top/bottom 的「目录条目」。`№ XX` 用 Fraunces italic，节点名 Instrument Sans 500。三大数字字号 Fraunces 30，对齐基线，下方 caption 12。媒体计数和探测时间戳放在底栏 small caps。
6. **History strip**: 60 格，高 28px，paper-2 底；ok 用 `--ok` 实心 + 顶部 hairline，bad 用 `--bad`。

## 动效
- 入场：masthead → stamp → ticker → segment → 每条 row 60ms 间隔淡入位移（CSS animation-delay）；reduced-motion 全部跳过。
- Stamp pulse：仅在 100% 时 stamp 外环呼吸（2.6s ease-out infinite），其他百分比静止。
- LED ticker 横向 marquee：CSS keyframes `translateX(0)→translateX(-50%)`，文本复制 2 次首尾相接。
- Theme toggle：旋转 220° + crossfade。

## 可访问性
- 所有色对比 ≥ 4.5:1（已在 palette 中校验）。
- 状态点除颜色外提供形状：在线实心圆，离线带斜线划过的圆（`::after` 伪元素绘制 line）。
- ticker 文本用 `aria-live="polite"` 但 marquee 容器加 `aria-hidden`，文本另起一份 `.sr-only`。
- `prefers-reduced-motion: reduce` 关闭 marquee 与入场动画。

## 数据契约
延用 `loadStatusData()` 返回的 `cards[]`，无 schema 变更。新增渲染时计算的派生字段：
- `pctText`、`overallPct`：保持原来；
- 增加 `stationDate` / `stationTime`：服务端按 UTC+8 渲染初始值，前端 setInterval 每 30s 更新 `data-time` 属性即可。

## 包尺寸控制
- Google Fonts 单次请求合并 3 个 family；display=swap。
- 不再引入 grain SVG（节省 ~600B）。
- CSS 通过去重 `--glass-*` 旧变量、合并 selector 大约可压缩到 < 9KB。

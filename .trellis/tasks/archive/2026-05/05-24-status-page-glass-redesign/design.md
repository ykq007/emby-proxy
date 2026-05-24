# Design — /status 玻璃光感

## 改动边界
仅 `worker.js`:
- `renderStatusHtml(data, opts)` 函数内的模板字符串(包括 `<style>` 与 `<body>`)。
- 不动 `loadStatusData`、`renderCardSvg`、路由分发。

数据契约不变:`data.cards[]` 仍含 `name/icon/ok/latest_ms/latest_ts/avail_24h/avail_7d/history[]/counts/counts_delta/show_counts`。

## 视觉方向
**Dark Glass + Aurora Mesh**:深紫蓝基底 + 青绿/品红色 aurora 斑、玻璃磨砂卡、亮色细描边、grain overlay、霓虹小色点。整体感觉接近 Linear / Vercel status / Arc 的混合,但配色更鲜明、偏夜色。

## 颜色系统(双主题)

主题切换通过 `<html data-theme="dark|light">` 控制,CSS 用属性选择器覆盖根变量。

### Dark(默认深色)
```
--bg-base:    #0b0b14
--bg-deep:    #050509
--aurora-1:   rgba(120, 90, 255, .45)
--aurora-2:   rgba(0, 220, 200, .35)
--aurora-3:   rgba(255, 80, 160, .25)
--glass-bg:   rgba(255, 255, 255, .04)
--glass-bd:   rgba(255, 255, 255, .10)
--glass-hi:   rgba(255, 255, 255, .14)
--text:       #e8e8f0
--text-sec:   rgba(232, 232, 240, .62)
--text-ter:   rgba(232, 232, 240, .40)
--ring-track: rgba(255, 255, 255, .10)
--grain-op:   .045
```

### Light(浅色 — 柔和奶油基底 + 粉/青光晕)
```
--bg-base:    #f4f1ec      /* 微暖奶白 */
--bg-deep:    #ece8e1
--aurora-1:   rgba(120, 90, 255, .22)
--aurora-2:   rgba(0, 180, 200, .20)
--aurora-3:   rgba(255, 110, 170, .18)
--glass-bg:   rgba(255, 255, 255, .55)
--glass-bd:   rgba(20, 20, 40, .10)
--glass-hi:   rgba(255, 255, 255, .80)
--text:       #1b1b22
--text-sec:   rgba(27, 27, 34, .62)
--text-ter:   rgba(27, 27, 34, .42)
--ring-track: rgba(20, 20, 40, .10)
--grain-op:   .025
```

### 共用语义色(两主题相同)
```
--ok:    #34c897 (light: #16a37a)
--warn:  #f0b429 (light: #d99514)
--bad:   #ff5577 (light: #e23a5b)
```
语义色亦在 `[data-theme="light"]` 下做轻微下调以保证对比度(数值见上方括号)。

## 字体(Google Fonts)
- Display(标题、健康环大数字):`Space Grotesk` 600/700
- Body:`Inter` 400/500
- Mono(延迟数字、时间、计数 delta):`JetBrains Mono` 500

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
```

Fallback 栈:`'Space Grotesk', -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`。

## 布局
```
┌─────────────────────────────────────────────┐
│  AURORA MESH BACKGROUND + GRAIN             │
│                                             │
│   节点状态                                   │
│   ╭──────╮                                  │
│   │ 99.8%│  总节点 12   在线 11   离线 1    │
│   ╰──────╯                                  │
│                                             │
│   ┌─card─┐ ┌─card─┐ ┌─card─┐ ┌─card─┐       │
│   │      │ │      │ │      │ │      │       │
│   └──────┘ └──────┘ └──────┘ └──────┘       │
│   ...                                       │
└─────────────────────────────────────────────┘
```
- max-width 1180px,居中,padding 32px。
- header: flex row, gap 28px; ≤ 720px 改 column。
- grid: `repeat(auto-fill, minmax(300px, 1fr))`,gap 16px。

## 健康环
SVG,viewBox=`0 0 120 120`,半径 52,stroke-width 10。
- 底环:`stroke-opacity: .12`。
- 进度环:`stroke-dasharray=圆周长`,`stroke-dashoffset` 由 `(1-pct)*周长` 计算(后端预计算)。
- linecap=round,旋转 `-90deg` 起点在顶部。
- 颜色阈值:
  - pct >= .99 → `--ok`
  - pct >= .95 → `--warn`
  - else → `--bad`
- 中心 `<text>`:font-family Space Grotesk,fill `--text`,大数字 `26px` `font-weight 700`,下方一行 `font-size 9px` 写 `AVAILABILITY` text-tracking。
- 0 节点时:不渲染进度环,中心数字写 `—`。

## 卡片细节
- background: `--glass-bg`; border:1px solid `--glass-bd`; border-radius 18px。
- backdrop-filter: `blur(20px) saturate(140%)`。
- ::before 伪元素生成 inner highlight:`box-shadow: inset 0 1px 0 var(--glass-hi)` (放在 border-radius 内)。
- hover: `transform: translateY(-2px); border-color: rgba(255,255,255,.18); box-shadow: 0 12px 40px -10px rgba(120,90,255,.35);` transition 200ms ease。
- 状态点 `--ok` 时叠加 `@keyframes pulse`(scale + opacity)无限循环 2.4s。
- history bar: 圆角 2px,在线柱使用 `--ok`,离线使用 `--bad`,height 计算保留(`max(8, min(100, ms/20))`)。
- footer 时间使用 mono 字体、`--text-ter`。

## 背景 aurora
body 上 fixed 全屏 `::before` + `::after` 两个超大径向渐变 blob,`filter: blur(80px)`,`opacity: .9`,`pointer-events: none`,`z-index: -1`。再额外一层 SVG noise (data URI) 作为 grain,opacity .04。

## 响应式
- ≥ 720px:header 横向。
- < 720px:header 纵向,健康环居中。
- < 480px:grid 1 列;padding 减到 16px;健康环缩到 96×96。
- `@media (prefers-reduced-motion: reduce)`:关闭 pulse、hover transition。

## 主题切换器

放在右上角(`header` 内、`<h1>` 同一行右侧)。
- 视觉:一颗胶囊状玻璃按钮,内部一个 SVG 月亮/太阳 icon(用 inline SVG,跟随主题切换图标)。
- 行为:
  - 初始化(在 `<head>` 末尾的 inline `<script>`,先于样式应用以避免闪烁):读取 `localStorage.status_theme`;不存在则用 `matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`;写入 `document.documentElement.dataset.theme`。
  - 点击按钮:toggle `data-theme`,写入 `localStorage`(try/catch,失败忽略)。
  - 切换无过渡闪烁:仅 200ms 颜色 transition 于 `body` 与卡片背景。
- 无障碍:`aria-label="切换主题"`、`aria-pressed` 反映当前状态。

脚本预算:< 600 字节(压缩前)。

## 兼容性
- backdrop-filter 失败:玻璃卡仍是 `--glass-bg`(纯色半透明)+ 描边,不破版。
- Google Fonts 失败:fallback 字体栈完整。
- 不依赖任何 JS。

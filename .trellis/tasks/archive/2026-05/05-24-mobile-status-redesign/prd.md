# PRD — 公开 /status 页移动端重设计

## 背景
当前 `/status` 页（commit bfc556d）采用 glass-aurora 主题 + Space Grotesk + 健康环。桌面端表现不错，但移动端是 `@media (max-width: 480px)` 兜底而非 mobile-first：
- 头部 3 块（标题 / 健康环 / 3 张 chip）在窄屏垂直堆叠，首屏高度被吃光，节点卡片需要往下滚才能看见。
- 主题切换按钮 absolute 浮在右上角，会和标题挤在一起。
- 节点卡片密度未针对窄屏调优，三列 metrics 在 360px 屏接近极限。
- 视觉风格已被复用多次（Space Grotesk + glass + aurora 渐变），缺乏辨识度。

## 目标
为 `/status` 与 `/public/:token` 共用入口产出一套 **mobile-first** 的全新视觉系统：
1. 首屏在 390×844（iPhone 14 基准）内能完整展示 *标题 + 整体健康概览 + 至少 1 张节点卡顶部*。
2. 公开页气质——值得截图分享、有清晰的「这是状态公告」语义。
3. 节点信息密度提升：当前延迟 / 24h / 7d / 历史条 / 媒体计数依然完整，但布局更紧凑可读。
4. 桌面端不退化：≥720px 仍维持合理布局，整体观感统一。
5. 保留主题切换、隐藏节点名 (`hideNames`)、深浅色支持、reduced-motion 友好。

## 非目标
- 不重写后端 `loadStatusData` 数据形状。
- 不引入打包工具或框架——`renderStatusHtml` 仍是字符串拼接 + 内联 CSS。
- 不改动 `/card/:token.svg`（SVG 名片继续维持现状）。

## 验收标准
- 移动端首屏（390×844、`viewport-fit=cover`）能看见：masthead、整体可用率印章、状态 ticker、第 1 张节点条目顶部。
- 节点卡片在 320–430px 任意宽度均不溢出、不出现横向滚动条。
- 浅色 / 深色主题切换：刷新后保留 localStorage 中的偏好。
- 4 张节点 + 12 张节点两种情况都视觉协调（无单卡撑满屏、也无过密）。
- 没有 console 错误。
- 字体策略：display 使用 Fraunces，data 使用 Geist Mono，body 使用 Instrument Sans。**禁止再次使用 Space Grotesk**（与上一版拉开差距）。
- 离线 / 在线状态除颜色外辅以形状或文案区分（色盲友好）。

## 风险
- 字体来自 Google Fonts，需要 preconnect & font-display:swap；首屏闪烁要可接受。
- Cloudflare Workers 单文件 HTML 字节数已偏大（worker.js ~ 8748 行），新 CSS 需控制体积（目标 < 10KB gzip）。

# /status 公开状态页 — 玻璃光感重设计

## 背景
当前 `/status`(worker.js `renderStatusHtml`)是 Apple 风浅色卡片栅格,功能完整但视觉偏通用 dashboard。该页面公开访问(外部用户、可作为节点公开状态展示),希望提升观感、让首屏更具记忆点。

## 目标
用"深色 + 渐变 mesh + 玻璃卡 + 微动效"方向重做 `/status` 与 `/public/<token>` 的 HTML 页面,在不改信息架构与后端数据契约前提下,显著提升美感与品牌感。

## 范围
- 修改对象:`worker.js` 中的 `renderStatusHtml(data, opts)`(包括其内联 CSS / 顶部聚合区 / 卡片网格)。
- **新增**:首屏顶部一个"整体健康环"(SVG conic / stroke-dasharray):中心展示整体可用率(在线 / 总数 百分比)+ 在线/离线/总数 三个小数字。
- 字体:启用 Google Fonts CDN(display = swap)。display 用有性格的字体(候选 `Space Grotesk` / `Instrument Serif`),正文 `Inter` 备选;数字用 `JetBrains Mono` 形成对比。最终在 design.md 中固化。
- 兼容:保持原数据字段(cards、history、counts、avail_24h/7d、latest_ts 等)、`hideNames` 选项、`title` 选项不变。
- `renderCardSvg`(SVG 卡片分享)**不在本次范围**。

## 不做
- 不改 `loadStatusData` 与数据库 schema。
- 不动 admin 面板 `节点状态` 分区(那是 panel 内 UI,不是 `/status`)。
- 不引入构建步骤、不引入 JS 框架;保持单文件内联渲染。
- 不引入除 Google Fonts 之外的外部资源(无 JS 库、无图标库)。

## 验收标准
1. 访问 `/status` 与 `/public/<token>` 同时提供深色与浅色两种玻璃光感主题;首次访问按 `prefers-color-scheme` 决定;页面右上角带主题切换按钮,选择持久化到 `localStorage`(key:`status_theme`,值 `dark`/`light`)。
2. 顶部健康环:
   - 中心大数字 = 总体可用率(在线占比,1 位小数 %);0 节点时显示 `—`。
   - 环颜色随阈值变化:>=99% 绿、>=95% 黄、否则红。
   - 旁边/下方列出 `总节点 / 在线 / 离线` 三个数字。
3. 卡片:
   - 玻璃质感(`backdrop-filter: blur`、半透明背景、1px 细描边、轻微 inner highlight)。
   - 在线节点的状态点带 `pulse` 微动效。
   - 史延迟柱状图配色与圆角与整体协调;离线柱仍 100% 红色高度。
   - hover 时卡片轻微抬起 + 边缘光晕(translateY + box-shadow,过渡 ≤ 220ms)。
4. 背景:深色基底 + 至少 2 个渐变 mesh / radial-gradient 斑块,允许加 grain overlay(SVG data URI 或 CSS)。
5. 字体通过 Google Fonts 加载(`preconnect` + `display=swap`),失败时 fallback 到系统字体不破版。
6. 响应式:≤ 480px 宽度下网格变 1 列,健康环与聚合数字纵向排布,无横向滚动。
7. `hideNames=true` 时仍正确显示"节点 N"占位,无图标。
8. 性能:HTML 体积膨胀 < 14 KB(gzip 前);JS 仅为极小的主题切换脚本,无外部 JS 网络请求(字体除外)。
9. 主题切换:点击切换按钮立即生效,无闪烁;切换不依赖页面刷新;`localStorage` 不可用时降级为本次会话内 in-memory 切换。

## 风险
- backdrop-filter 在旧浏览器无效 → 必须有 fallback 背景色。
- Google Fonts 在部分地区被阻塞 → 完整 fallback 系统字体栈。
- 缓存 10s,模板必须渲染稳定。

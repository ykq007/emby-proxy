# Design

视觉系统代号 **"Instrument"**。目标来自 `PRODUCT.md`：仪器感、克制、信号清晰。界面像一块仪表盘：平面、细线、数字是主角。原型见 `docs/ui-rebuild/prototype.html`（方案 A）。

## 原则

- 平面。没有玻璃、模糊、渐变或辉光。层级靠 1px 细线和背景深浅表达。
- 一个强调色：琥珀色 `--acc`。只用于当前导航项、主按钮和焦点框。
- 状态色只表示状态：绿 `--ok` 在线，琥珀 `--warn` 变慢，红 `--err` 离线或失败。状态永远同时有文字或形状，不只靠颜色。
- 数字用等宽字体 `.num`，位数对齐，便于上下比较。
- 节点列表用表格。手机上每行收成两行，不用卡片网格。
- 动效只有 0.16 秒以内的淡入或位移。开启"减少动态效果"后全部关闭。

## 主题

深色是默认，浅色是完整的第二主题。两套都达到 WCAG AA。主题写在 `<html data-theme>` 上，偏好存在 `localStorage.emby_theme`（auto / light / dark）。首帧前由 `src/ui/head.js` 的内联脚本设定，避免闪烁。

## Token

全部定义在 `src/ui/console/console.css` 顶部。页面代码只用 token，不写颜色值。

| Token | 用途 |
|---|---|
| `--bg` | 页面背景 |
| `--panel` | 输入框、对话框、手机底栏 |
| `--raise` | 浮起的小块，例如提示消息 |
| `--line` / `--line-soft` | 分隔线；悬停和选中的底色 |
| `--tx` / `--tx2` / `--tx3` | 正文 / 次要文字 / 标签和提示 |
| `--acc` / `--on-acc` | 强调色 / 强调色上的文字 |
| `--ok` `--warn` `--err` | 状态色，配套 `-bg` 是淡底 |

`--tx3` 是最弱的文字色，在两套主题里都保持 4.5:1 以上。不要用 `opacity` 做弱化，那样会掉到 AA 以下。

## 组件

都在 `console.css` 里，页面直接用 class。

| Class | 是什么 |
|---|---|
| `.readout` | 顶部读数条，一格一个数字 |
| `.toolbar` | 页面工具栏：搜索框和按钮 |
| `.sec` `.sec-head` `.sec-actions` | 设置页的一节 |
| `.tbl` `.tbl-wrap` | 数据表格 |
| `.btn` `.btn.pri` `.btn.danger` `.btn.sm` | 按钮 |
| `.icon-btn` | 只有图标的按钮，必须带 `aria-label` |
| `.field` `.fields` | 表单字段和字段网格 |
| `input.switch` | 画成开关的复选框 |
| `.st.ok` `.st.warn` `.st.err` | 状态点加文字 |
| `.probes` | 最近 N 次探测的竖条，`i.s` 慢，`i.f` 失败 |
| `.kv` | 键值列表 |
| `.empty` | 空状态和错误状态 |
| `.note` | 页内提示条 |

对话框都用原生 `<dialog>`，由 `src/ui/console/ui.js` 创建：`confirm()` 确认框，`openPanel()` 侧边面板（手机上是整页），`openSheet()` 手机底部菜单。原生对话框自带焦点锁定和 Esc 关闭。

## 布局

- 桌面：左侧 200px 侧栏列出全部页面，分三组。顶栏 44px，显示当前位置、健康状态、⌘K、主题和退出。
- 手机（≤760px）：侧栏隐藏，底部出现 看板 / 统计 / 网络 / 更多。"更多"打开全部页面列表。触控目标不小于 44px。
- 页面地址就是 hash，例如 `#stats`。旧地址 `#monitor/stats` 自动转到新地址。

## 代码约定

- 页面列表只在 `src/ui/console/nav.js` 定义一次。侧栏、手机底栏、⌘K 和路由都从这里读。
- 一个页面一个模块，放在 `src/ui/console/pages/`，导出 `mount(root, page)`，可返回清理函数。在 `pages.js` 登记。`page.arg` 是 hash 斜杠后的部分，例如 `#nodes/hk1` 的 `hk1`；用 `pageHash(key, arg)` 生成链接。
- 页面自己的样式放在 `pages/<key>.css`，在 `console.css` 顶部 `@import`。能用公共组件就不写新样式。
- HTML 一律用 `html` 模板拼，它会转义插值。用 `render(el, value)` 写进页面，不要直接赋值 `innerHTML`。
- 按钮写 `data-action="名字"`，页面用 `on(root, { 名字: fn })` 统一处理。不写内联 `onclick`。
- 请求一律走 `api()`。它处理 JSON、错误消息，遇到 401 回到登录页。

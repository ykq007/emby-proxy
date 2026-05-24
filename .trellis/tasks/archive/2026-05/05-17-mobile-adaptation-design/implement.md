# Implement · 移动端适配

## 执行顺序

按以下 checklist 顺序提交。每完成一项后用 `node --check worker.js` 验证语法不破。

### 阶段 A — CSS 基础

- [ ] **A1** 在 `CSS_COMMON` 中、`@media (max-width:768px)` 块**之外**（默认作用域）追加：
  - `.m-pills` 容器（默认 `display: none`，移动端 `display: flex`）。
  - `.m-pill` / `.m-pill .dot` / `.m-pill .lbl` / `.m-pill .val` 样式。
  - `#mobileTabBar` 默认 `display: none`；button 子元素样式；`.active` 样式；svg 尺寸；dark-mode 覆盖。
  - `.m-sticky-cta` (容器，移动端再启用)。
  - `.login-logo` 渐变方块；`.login-faceid` 按钮；默认 desktop 隐藏。
- [ ] **A2** 在现有 `@media (max-width:768px)` 块内追加：
  - `body { padding-bottom: calc(72px + env(safe-area-inset-bottom)); }`（保留现有 padding）。
  - `#mobileTabBar { display: grid; }` 等定位规则。
  - `.m-pills { display: flex; gap: 6px; overflow-x: auto; padding: 10px 4px 4px; }`
  - `.tb-divider, .tb-spacer { display: none; }`；`#cf-trace-card { flex-wrap: wrap; row-gap: 8px; }`
  - 隐藏 cf-trace-card 内的 RTT pill 与 placement pill（被顶部 m-pills 接管）。
  - `#submitBtn { position: sticky; bottom: calc(72px + env(safe-area-inset-bottom)); z-index: 5; box-shadow: 0 -4px 16px rgba(0,0,0,0.06); }`
  - `.login-logo { display: flex; }`、`.login-faceid { display: inline-flex; }`。

### 阶段 B — HTML 注入

- [ ] **B1** 在 `HTML_UI` 内 `cf-trace-card` 闭合后插入 `<div class="m-pills" id="mobilePills">` 三个 pill（RTT / 模式 / 今日）。
- [ ] **B2** 给测速卡 `h2` 加 `id="speedTitle"`（或测速卡 wrapper 加 `id="speed-anchor"`）。给"部署/设置"卡 wrapper 加 `id="settings-anchor"`。
- [ ] **B3** 在 `</body>` 之前插入 `<nav id="mobileTabBar" aria-label="移动端导航">` 含 4 个 button，每个按钮含 SVG icon + 文字。
- [ ] **B4** 在 `LOGIN_UI` 的 `.login-box` 顶部插入 `<div class="login-logo">` 渐变方块（含 zap SVG）。在「验证登录」按钮后插入 `<button class="login-faceid" type="button" onclick="faceIdHint()">` 含 Face ID 图标。

### 阶段 C — JS 行为

- [ ] **C1** 在 `HTML_UI` 末尾 `<script>` 中追加：
  ```js
  function initMobileTabBar() {
    const bar = document.getElementById('mobileTabBar');
    if (!bar) return;
    const goto = {
      home: '#list-grid',
      speed: '#speed-anchor',
      stats: '__dashboard__',
      settings: '#settings-anchor',
    };
    bar.querySelectorAll('button[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        bar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
        const target = goto[tab];
        if (target === '__dashboard__') { if (typeof openDashboard === 'function') openDashboard(); return; }
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  function initMobilePills() {
    const rtt = document.getElementById('rttValue');
    const mode = document.getElementById('placeModeLabel');
    const traffic = document.getElementById('trafficToday');
    const setPill = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
    const sync = () => {
      if (rtt) setPill('m-pill-rtt', rtt.textContent);
      if (mode) setPill('m-pill-mode', mode.textContent);
      if (traffic) setPill('m-pill-today', traffic.textContent);
    };
    sync();
    [rtt, mode, traffic].forEach(node => {
      if (!node) return;
      new MutationObserver(sync).observe(node, { childList: true, characterData: true, subtree: true });
    });
  }
  document.addEventListener('DOMContentLoaded', () => { initMobileTabBar(); initMobilePills(); });
  ```
- [ ] **C2** 在 `LOGIN_UI` 的 `<script>` 中追加 `function faceIdHint(){ showToast('Face ID 暂未启用'); }`。

### 阶段 D — 验证

- [ ] **D1** `node --check worker.js` 通过（语法无错）。
- [ ] **D2** `grep -c 'mobileTabBar' worker.js` 至少返回 4（CSS、HTML、JS 各一处至少）。
- [ ] **D3** `grep -c 'm-pill' worker.js` 至少返回 5。
- [ ] **D4** `grep -c 'login-logo\|login-faceid' worker.js` ≥ 4。
- [ ] **D5** 视觉验证：用 `cat /home/ykq001/emby-proxy/worker.js` 渲染或部署到 wrangler 后 DevTools Device Mode 检查；至少对照"节点列表移动端"、"部署表单 sticky 保存"、"登录页 Face ID 按钮"、"桌面端不受影响" 四张截图（如条件允许）。
- [ ] **D6** 桌面视口 (1280px) `cat` 出 HTML_UI 渲染或现有部署确认 `#mobileTabBar` 不显示。

## 回滚点

- 阶段 A 完成后即可独立验证桌面端不受破坏。
- 阶段 B 是 HTML 注入，发现问题可单独 `git restore -p` 该 hunk。
- 阶段 C 的 JS 完全是新增函数 + DOMContentLoaded 钩子，移除即可关闭功能而不影响渲染。

## 评审门

- **设计一致性**：完成后用 `diff` 心智对照 `Mobile Adaptation.html` 与 jsx 中各组件的样式 token（圆角 14、padding 16、字号 22/15/13/12/11、color tokens）。
- **桌面端零回归**：用本仓库现有截图 / 手动比对。
- **node --check**：必通过。

## Spec/Research 上下文 manifest

无新增 spec 文档。check 阶段读取 `prd.md` 与 `design.md` 即可。

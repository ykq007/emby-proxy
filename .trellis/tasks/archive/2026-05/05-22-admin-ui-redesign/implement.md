# 执行计划 — 管理面板 UI 重设计

> 全程小步编辑，每完成一个阶段跑 `node --check worker.js`，并尽量浏览器目测。
> 高风险 DOM id 只移动不改名（清单见 design.md / 探索报告）。

## 阶段 0 — 准备
- [ ] 0.1 通读主面板 HTML（909–3044），确认 CSS 块、HTML 块、JS 块的行边界
- [ ] 0.2 备份意识：本任务在 git 跟踪下，改动可回退（步骤 2.3 用 `git checkout` 回滚）
- [ ] 0.3 建立临时预览：抽取主面板 HTML 到 `/tmp/admin-preview.html` 便于浏览器目测

## 阶段 1 — 主题系统（先做，后续阶段依赖配色变量）
- [ ] 1.1 扩展 CSS 变量：`:root` / `body.dark` 新增科技风变量（--surface、--surface-2、--accent-glow、--ok/--warn/--err）
- [ ] 1.2 重写主题初始化 JS：三态 `auto/light/dark` + `matchMedia` 监听 + 旧键迁移
- [ ] 1.3 主题切换按钮改为三态循环，更新图标/标签
- [ ] 校验：`node --check`；浏览器切系统深浅色验证 auto 生效

## 阶段 2 — 骨架布局
- [ ] 2.1 在 `<body>` 内层加 `.app-shell` flex 容器，包住 `.container` 内容
- [ ] 2.2 新增 `<aside class="sidebar">`：brand + nav-item 列表 + 折叠按钮 + 版本号
- [ ] 2.3 `#cf-trace-card` 重构为 `<header class="topbar">`（运行状态/节点总数/今日流量/健康度/admin）
- [ ] 2.4 加侧边栏与 topbar 的 CSS（深/浅两套）
- [ ] 校验：`node --check`；桌面布局呈现侧栏 + 顶栏

## 阶段 3 — 内容分区
- [ ] 3.1 把 3 张现有卡片包进对应 `<section id="sec-*">`，默认隐藏非激活区
- [ ] 3.2 新增 `showSection(key)` JS + nav-item 点击绑定 + localStorage 记忆
- [ ] 3.3 侧边栏折叠逻辑（`.sidebar.collapsed` + localStorage）
- [ ] 3.4 危险操作区抽为常驻底部 `.danger-bar`
- [ ] 校验：`node --check`；各导航项切换正常

## 阶段 4 — 数据统计内联化
- [ ] 4.1 将 `#dashboardModal` 内图表/日志 DOM 迁入 `#sec-stats`，保留所有 id
- [ ] 4.2 改图表为 lazy init：首次进入 stats 时初始化 + `chart.resize()`
- [ ] 4.3 原「打开数据大屏」入口改为 `showSection('stats')`
- [ ] 校验：图表正常渲染、主题切换图表配色跟随

## 阶段 5 — 节点卡片重做
- [ ] 5.1 调整节点卡渲染函数（约 1820–1895）输出新结构，保留 `.route-item`/`.drag-handle`/`data-prefix`
- [ ] 5.2 加状态徽章（在线/延迟/离线）映射现有判定
- [ ] 5.3 加内联 SVG 迷你折线图（数据缺失占位）
- [ ] 5.4 节点卡 CSS（深/浅）
- [ ] 校验：节点增删改、拖拽排序、ping、复制、编辑均正常

## 阶段 6 — 移动端
- [ ] 6.1 `#mobileTabBar` 重样式（按设计稿移动端）
- [ ] 6.2 tab 切换改调用 `showSection`，校正 tab↔section 映射
- [ ] 6.3 移动端 topbar 精简 + 节点卡紧凑布局
- [ ] 6.4 浅色移动端核对
- [ ] 校验：移动端三页切换、手势、列表显示正常

## 阶段 7 — 收尾验证
- [ ] 7.1 `node --check worker.js` 通过
- [ ] 7.2 浏览器目测：桌面深色 / 桌面浅色 / 移动端 三套视图对照验收标准
- [ ] 7.3 控制台无 JS 报错
- [ ] 7.4 回归：增删节点 / 测速 / DNS 更新 / 备份恢复 / 部署覆盖 入口可用
- [ ] 7.5 清理临时预览文件

## 验证命令
```bash
node --check worker.js          # 语法检查
# 预览：抽取主面板 HTML 后用浏览器打开 /tmp/admin-preview.html
```

## 回滚点
- 每阶段为一个 git 可回退单元；出问题用 `git checkout -- worker.js` 回到阶段前状态。
- 阶段 5（节点卡渲染）风险最高，单独小步提交意识，保留改动前的渲染函数片段备查。

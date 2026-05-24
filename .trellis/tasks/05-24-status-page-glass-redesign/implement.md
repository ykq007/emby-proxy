# Implement — /status 玻璃光感

## 执行清单

- [ ] **1. 后端预计算**  
  在 `renderStatusHtml` 顶部补充:
  - `overallPct = total === 0 ? null : online / total`
  - `ringColor` 阈值映射 → CSS var 名(`--ok` / `--warn` / `--bad`)
  - `circumference = 2 * Math.PI * 52`
  - `dashOffset = overallPct == null ? circumference : (1 - overallPct) * circumference`
  - `pctText = overallPct == null ? '—' : (overallPct * 100).toFixed(1) + '%'`

- [ ] **2. 重写 `<head>`**  
  - 注入 Google Fonts preconnect + stylesheet link。
  - 替换 `<style>` 整段:CSS variables(颜色 / 字体)、reset、aurora 背景层、grain overlay、header、健康环 SVG 样式、grid、卡片(玻璃 + hover + pulse)、history bar、counts、响应式断点、reduced-motion。

- [ ] **3. 重写 `<body>`**  
  - 根容器 `.s-wrap`。
  - 顶部 `<header>`:`<h1>` 标题 + 健康环 SVG + 聚合数字(总/在线/离线)。
  - 健康环 SVG 内嵌(2 个 circle + 1 个 text),`stroke-dashoffset` 用后端值。
  - 卡片网格逻辑保留,只换 class 命名(可沿用 `s-card` 等)与内部结构,数据字段访问不变。
  - 空状态(`total === 0`)显示居中文案。

- [ ] **4. 健康环颜色绑定**  
  通过 `<svg style="--ring:var(${ringColor})">` 或直接 `stroke="${ringColorHex}"` 注入。优先用 CSS var,降低样式表硬编码。

- [ ] **5. 字体回退验证**  
  断网模拟下 fallback 字体栈正常,布局不破。

- [ ] **6. hideNames 路径验证**  
  `/status` 默认 hideNames 视具体后端配置;手工核对 `节点 N` 占位与图标 fallback 仍生效。

- [ ] **7. 主题切换器**  
  - `<head>` 末尾内联预设脚本(读取 localStorage / matchMedia,设置 `documentElement.dataset.theme`)。
  - body 内右上角放胶囊按钮 + 太阳/月亮 SVG。
  - 内联另一段 `<script>` 绑定 click 事件 toggle + 持久化。
  - 验证两主题下健康环、玻璃卡、grain、aurora 均自然过渡。

- [ ] **8. 响应式手测**  
  在 1280 / 720 / 480 / 360 宽度查看;reduced-motion 媒体查询有效。

## 校验

- [ ] `wrangler deploy --dry-run` 或 `node -e "require('./worker.js')"` 不报语法错。
- [ ] 本地无构建,直接 grep `renderStatusHtml` 调用点 2 处(`/status`, `/public/<token>`)均使用新模板。
- [ ] 浏览器打开 `/status`:
  - 健康环颜色随阈值切换(可手动构造数据测试或截图说明)。
  - 玻璃卡 hover 抬起、状态点 pulse、grain overlay 可见。
  - 控制台无 error。
- [ ] HTML 体积增长 < 12 KB(对比修改前后 `renderStatusHtml` 返回长度估算)。

## 回滚

直接 `git revert` 该次 commit;数据契约未变,无副作用。

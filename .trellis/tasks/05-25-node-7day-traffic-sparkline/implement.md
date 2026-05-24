# Implement Plan — 节点 7 天流量 sparkline

## 顺序

1. **后端：实现 `GET /api/route-trends`**
   - 找到现有 API 路由注册位置（与 `/api/dashboard`、`/api/emby/*` 同级）。
   - 鉴权复用：与 `/api/dashboard` 相同保护层。
   - 抽一个 `fetchRouteTrend(env, prefix, days)` 辅助：构造 GraphQL，返回 `Map<dateStr, bytes>`；失败抛错由调用方 catch 后填 0 序列。
   - 总入口：`SELECT prefix FROM routes` → `Promise.all` 并发查询 → 对齐 7 日序列 → 写缓存 → 返回。
   - 模块级 `routeTrendCache = new Map()`，TTL 30 min，key = `${env.CF_ZONE_ID}|${days}|${utcHour}`。

2. **后端：错误降级**
   - 若 `!env.CF_API_TOKEN || !env.CF_ZONE_ID` → 直接 `{ ok:false, reason:'no-cf-token', items: [] }`。
   - 若 `routes` 表空 → `{ ok:false, reason:'no-routes', items: [] }`。
   - 单节点 GraphQL 失败：该节点 `bytes` 全 0、整体响应仍 `ok:true`。

3. **前端：渲染时给 sparkline 容器加锚点**
   - worker.js:4707 容器改为 `<div class="a-spark-slot" data-spark="${r.prefix}">${sparkHtml}</div>`。

4. **前端：拉取并回填**
   - 在 `loadRoutes()` 节点循环之后追加 `loadRouteTrends()` 调用。
   - `loadRouteTrends()`：fetch → 遍历 items → `document.querySelector('.a-spark-slot[data-spark="..."]')`
     → `slot.innerHTML = nodeSparklineHtml(item.bytes)`。

## 验证步骤
- `node --check worker.js` 通过。
- 本地/已部署环境配齐 `CF_API_TOKEN`/`CF_ZONE_ID`，打开管理页查看：节点卡 sparkline 出现且 hover/F12 看到 7 个数据点。
- 临时清空 `CF_API_TOKEN` 环境变量并重新 deploy 一次 → 所有卡片仍渲染、显示"暂无趋势数据"占位。
- 连续刷新两次管理页，CF Dashboard 的 GraphQL 调用数只增加一轮（验证缓存）。

## 回滚点
- 删除 `/api/route-trends` 路由分支 + `fetchRouteTrend` + `routeTrendCache`。
- 前端：删 `loadRouteTrends` 调用，恢复容器 div 写法。

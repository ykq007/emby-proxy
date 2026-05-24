# 节点卡近 7 天每日流量趋势 sparkline

## 背景
节点卡片渲染时读取 `r.trend / r.trafficHistory / r.history`，但后端从未提供这些字段，
导致 `nodeSparklineHtml`（worker.js:3873）始终走占位分支，前端显示"暂无趋势数据"。
（worker.js:4683-4685 是数据入口；worker.js:3875 是占位文案。）

## Goal
为每个节点卡片顶部显示一条近 7 天每日"出向流量字节数"的迷你折线图（sparkline）。
口径：Cloudflare GraphQL Analytics `httpRequests1dGroups.sum.bytes`，按
`clientRequestPath_like: "/<prefix>%"` 过滤，时间窗口为今天 UTC（含）往前 7 天，
按日分组、缺失日补 0、顺序为最早日 → 今日。

## Requirements
1. 后端新增 `GET /api/route-trends?days=7`：遍历 routes 表，对每个 prefix 跑一次 CF GraphQL，
   返回 `{ items: [{ prefix, bytes: [b0..b6] }], generated_at, days, source }`。
2. 内存缓存 30 分钟（key = zoneId + days + 当前 UTC 小时），避免每次刷新都打 CF。
3. 前端在节点卡批量渲染完成后异步调用 `/api/route-trends`，把对应 prefix 的字节数组挂为
   sparkline 数据并回填；保持 `nodeSparklineHtml` 现有空数据占位逻辑不变。
4. 错误降级：未配置 `CF_API_TOKEN` / `CF_ZONE_ID` 或查询失败时该节点保留"暂无趋势数据"占位，
   后端不抛未捕获异常。
5. 节点数较多时（≥ 20）页面渲染不阻塞，sparkline 数据后到再回填，期间显示占位。

## Out of Scope
- 不引入新表持久化每日字节（CF GraphQL 是权威源，本地存储成本与收益不匹配）。
- 不重写 dashboard 的"过去 7 天全站播放并发趋势"大图。
- 不修改 `getCFTraffic` 现有调用方式。
- 不做小时粒度趋势。

## Acceptance Criteria
- [ ] 配置了 `CF_API_TOKEN` + `CF_ZONE_ID` 的部署，管理页每个有流量的节点卡顶部出现 sparkline，
      内部数据顺序为旧 → 新，共 7 个数值。
- [ ] 近 7 天内零流量的节点显示"暂无趋势数据"占位（< 2 个非零样本时）。
- [ ] 未配置 CF Token 时所有卡片都显示占位且后端无未捕获异常。
- [ ] 同一进程内连续刷新两次管理页，第二次 `/api/route-trends` 在 30 分钟内命中缓存（不调 CF）。
- [ ] 节点数 ≥ 20 时页面渲染不阻塞，sparkline 后到再回填。

## Risks
- CF GraphQL 配额：N 节点 × 1 query / 30 min，可接受。
- `clientRequestPath_like` 必须与现有 TOP 1 节点查询保持一致前缀写法（`"/${prefix}%"`）。

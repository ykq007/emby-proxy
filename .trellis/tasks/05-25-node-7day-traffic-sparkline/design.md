# Design — 节点 7 天流量 sparkline

## 端到端数据流
1. 浏览器加载管理页 → `loadRoutes()` 渲染节点卡 → 末尾发起一次 `fetch('/api/route-trends?days=7')`。
2. Worker 命中 `/api/route-trends`：
   - 检查内存缓存（key = `${zoneId}|${days}|${utcHour}`），命中即返回。
   - 未命中：`SELECT prefix FROM routes` → 对每个 prefix 并发跑 GraphQL `httpRequests1dGroups`（按 `date` 维度分组、过滤路径前缀、近 7 整日范围）。
   - 把每个节点的结果对齐到固定 7 天日期序列（缺失日补 0），写缓存，返回。
3. 前端拿到响应，按 prefix 在 DOM 里找到对应卡片的 sparkline 容器，调用现有 `nodeSparklineHtml(bytes)` 重渲染。

## 后端接口
- 路径：`GET /api/route-trends?days=7`（默认/上限 7；其它值钳制）。
- 鉴权：复用已有管理 API 鉴权链（与 `/api/dashboard` 同分支判断）。
- 响应：
  ```json
  {
    "ok": true,
    "days": 7,
    "generated_at": 1716640000,
    "source": "cf-graphql",
    "items": [
      { "prefix": "misaka", "bytes": [0, 12345, 0, 98765, 0, 0, 4567] }
    ]
  }
  ```
- 失败响应：`{ ok: false, reason: "no-cf-token" | "graphql-failed" | "no-routes", items: [] }`，HTTP 200，
  让前端始终走"无数据 → 占位"路径，不打断渲染。

## GraphQL 查询
```graphql
query($zone: string, $from: Time, $to: Time, $path: string) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      httpRequests1dGroups(
        limit: 7
        filter: {
          clientRequestPath_like: $path,
          date_geq: <UTC-6>,
          date_leq: <UTC-0>
        }
      ) {
        dimensions { date }
        sum { bytes }
      }
    }
  }
}
```
- 时间窗：取 `today_utc - 6` 到 `today_utc`，共 7 天。
- 对齐：构造固定 7 个日期字符串数组，按 `dimensions.date` 回填 `sum.bytes`，没出现的日期记 0。

## 缓存
- 模块级 `Map`：`{ key, expireAt, payload }`，TTL = 30 min。
- key 含 `utcHour`，自然让缓存边界在每小时刷新；同小时内多次刷新都命中。
- Worker 实例销毁后缓存丢失是可接受的（下次再回源 CF）。

## 前端改动
- `worker.js:4683` 的 `let trendData = ...` 起初仍可能拿不到任何数据 → 渲染占位。
- 在 `loadRoutes()` 末尾追加：
  ```js
  fetch('/api/route-trends?days=7').then(r => r.json()).then(applyRouteTrends);
  ```
- `applyRouteTrends(data)`：遍历 `data.items`，按 `prefix` 在 DOM `document.querySelector('.route-item[data-prefix="..."] .a-sparkline-slot')` 找占位 `<div>` 并替换 innerHTML 为 `nodeSparklineHtml(bytes)`。
- 给当前 sparkline 容器 `<div style="margin:2px 0;">${sparkHtml}</div>`（worker.js:4707）补一个 class 或 data 属性，便于精确选中：改为
  ```html
  <div class="a-spark-slot" data-spark="${r.prefix}">${sparkHtml}</div>
  ```

## 兼容性
- 老的 `r.trend / r.trafficHistory / r.history` 取值保留，初次渲染逻辑不变；新通路只在 fetch 成功后覆盖。
- 不动数据库 schema、不动 cron、不动现有统计接口。

## 失败/回滚
- 任何后端异常 → 返回 `ok: false, items: []`，前端无动作 → 卡片维持占位 → 行为与今天等价。
- 回滚：删除 `/api/route-trends` 路由分支 + 前端 fetch 调用即可，无副作用。

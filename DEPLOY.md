# Deploy(Owner Runbook)

> 公共的一键部署（"Deploy to Cloudflare" 按钮）说明见 [README.md](README.md) / [README.en.md](README.en.md)。
> 本文件是仓库所有者（owner）自己的运维手册，不含任何密钥。

Owner 的生产 Worker: `emby`(D1: `emby-proxy-prod-db`)

## 配置拆分

- `wrangler.prod.toml`(gitignored,不进仓库)——owner 的真实配置:worker 名 `emby`、真实
  `database_id`、真实 `bucket_name`。`npm run deploy:prod` 用这份配置。
- `wrangler.toml`(已提交,公开)——按钮/公共配置:worker 名 `emby-proxy`,故意省略
  `database_id` / `bucket_name`。Cloudflare "Deploy to Cloudflare" 按钮部署时会读取这份文件,
  为每位部署者自动新建一个全新的 D1 数据库 / R2 存储桶,再写回真实 ID。
  文件里的 `[build] command`(build + obfuscate)是按钮部署能跑通的关键:dist/ 与 public/
  都不入库,Workers Builds 里 wrangler 靠这条命令在部署前现场构建出入口文件和静态资源。

**Owner 千万不要跑裸的 `npm run deploy`**——那会用公共 `wrangler.toml`(没有 owner 的真实
`database_id`/`bucket_name`),在 owner 自己的 Cloudflare 账号上新建一套全新资源,而不是部署到
现有生产环境。Owner 部署生产永远用 `npm run deploy:prod`。

## 一次性准备

```bash
npm install
wrangler login
```

环境变量(`ADMIN_TOKEN` / `CF_*`)在 Cloudflare Dashboard 已设为 plain_text bindings。
`wrangler.prod.toml` 里写了 `keep_vars = true`,deploy 不会覆盖。
**Secret 改用 `wrangler secret put <name> -c wrangler.prod.toml` 而不是 `[vars]` 写入仓库**。

## 部署生产(默认混淆)

```bash
npm run deploy:prod
```

= `build` + `obfuscate`(worker.js → dist/worker.obf.js)+ `wrangler deploy --no-bundle -c wrangler.prod.toml`

混淆配置与 <https://hx.crush.ccwu.cc/> 一致(参见 `scripts/obfuscate.js`)。

> 对比:裸 `npm run deploy`(不带 `:prod`)是公共/按钮路径,用的是提交到仓库的
> `wrangler.toml`,会在 owner 账号上自动新建资源——owner 日常操作不要用它。

## 紧急回退到非混淆版

```bash
npm run deploy:plain
```

(如需针对生产环境回退,补上 `-c wrangler.prod.toml`。)

## 后台任务调度

Cloudflare cron 不可靠时(账号级 cron 派发问题),用外部 cron-job.org / GitHub Actions
打这两个端点(需 `Cookie: admin_token=<ADMIN_TOKEN>` + `?key=<ADMIN_TOKEN>`):

- `GET /api/_probe_now`   每 1 分钟
- `GET /api/_counts_now`  每天一次(UTC 00:05 推荐)

## 聚合 Worker（emby-aggregate）

把所有开启了 viewers 的节点合并成一台虚拟 Emby 服务器：浏览合并后的媒体库，电影可播放
（每个有副本的节点在客户端里是一个版本：Source 1 / Source 2…，默认挑健康且有空闲并发槽位的节点）。
剧集的季 / 集在打开时从各节点实时取、按季号 / 集号合并（A 有 S1–S3、B 有 S4 → 看到 S1–S4），不写 D1；
观看状态（进度、已看、收藏、继续观看、Next Up）存 `agg_watch_state`，不写回节点。
首页「最新剧集」每个节点问一次最新单集，缓存 10 分钟，新一集一入库就靠前。
它是独立的 Worker，与生产 `emby` 共用 D1，但只建 / 写 `agg_*` 表，不影响生产。

一次性准备：

```bash
cp wrangler.aggregate.example.toml wrangler.aggregate.prod.toml   # 已 gitignore
# 编辑 wrangler.aggregate.prod.toml：database_id 填 wrangler.prod.toml 里生产 D1 的 database_id
npx wrangler secret put ADMIN_TOKEN -c wrangler.aggregate.prod.toml  # 必须与生产 Worker 相同
```

外部定时器（Cloudflare cron 不触发时，如 cron-job.org）：
`openssl rand -hex 32 | tee ~/.config/emby-proxy/sync_token | npx wrangler secret put SYNC_TOKEN -c wrangler.aggregate.prod.toml`，
然后让定时器每 10 分钟 `POST https://emby-aggregate.<子域>.workers.dev/admin/sync`，
请求头 `Authorization: Bearer <sync_token>`。SYNC_TOKEN 只能触发同步，不要用 ADMIN_TOKEN；两边同时触发时有锁，只跑一轮。

部署：`npm run deploy:agg`。cron 每 10 分钟跑一次，首轮全量做完后每个节点最多每小时一轮增量。
同步登录照搬一台真实 viewer 设备的身份（App 名、设备名、版本、UA），所以至少要有一个 viewer 用 App 看过任一节点，否则不同步。
首次全量受每日写入预算
（`AGG_DAILY_WRITE_BUDGET`，默认 30000 行）限制，节点多时可能要一两天才同步完。
viewer 在 Emby 客户端里添加服务器地址 `https://emby-aggregate.<子域>.workers.dev`，用自己的 viewer 账号登录。

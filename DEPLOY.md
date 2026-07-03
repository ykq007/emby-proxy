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

# Deploy

Worker: `makkapakka-emby-panel` (D1: `makkapakka-emby-panel-db`)

## 一次性准备

```bash
npm install
wrangler login
```

环境变量(`ADMIN_TOKEN` / `CF_*`)在 Cloudflare Dashboard 已设为 plain_text bindings。
`wrangler.toml` 里写了 `keep_vars = true`,deploy 不会覆盖。
**Secret 改用 `wrangler secret put <name>` 而不是 `[vars]` 写入仓库**。

## 部署(默认混淆)

```bash
npm run deploy
```

= `obfuscate` (worker.js → dist/worker.obf.js) + `wrangler deploy`

混淆配置与 <https://hx.crush.ccwu.cc/> 一致(参见 `scripts/obfuscate.js`)。

## 紧急回退到非混淆版

```bash
npm run deploy:plain
```

## 后台任务调度

Cloudflare cron 不可靠时(账号级 cron 派发问题),用外部 cron-job.org / GitHub Actions
打这两个端点(需 `Cookie: admin_token=<ADMIN_TOKEN>` + `?key=<ADMIN_TOKEN>`):

- `GET /api/_probe_now`   每 1 分钟
- `GET /api/_counts_now`  每天一次(UTC 00:05 推荐)

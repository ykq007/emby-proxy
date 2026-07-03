**中文** | [English](README.en.md)

# Emby Proxy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ykq007/emby-proxy)

一个完全运行在 Cloudflare Workers 上的自托管 **Emby 多节点反向代理控制台**。

## 界面预览

| 监控看板 | 身份验证 |
| :---: | :---: |
| ![监控看板](docs/screenshots/dashboard.png) | ![登录页](docs/screenshots/login.png) |

## 功能概览

- **多节点反向代理**：通过统一入口转发到一个或多个上游 Emby 服务器，并在 Web 控制台中管理节点与路由。
- **DNS 与优选域名管理**：从面板直接管理 DNS 记录，以及适合 Cloudflare/CDN 使用的 Emby 路由优选域名。
- **保活探针与告警**：定期探测每个节点的健康状态，节点离线时可通过 Telegram 发送告警。
- **流量与媒体统计**：按路由统计带宽/流量，并跟踪媒体库电影、剧集等数量。
- **响应式 Web 控制台**：使用 `ADMIN_TOKEN` 保护的单一管理面板，用于操作以上所有功能。
- **可选 Telegram Bot**：支持状态查询、保活检查、告警静音/取消静音、节点列表等 Bot 指令。

## 一键部署

1. 点击上方 **Deploy to Cloudflare** 按钮。
2. Cloudflare 会将本仓库 fork 到你的 GitHub 账号，并连接到 Workers Builds。
3. Cloudflare 会自动为本次部署创建新的 **D1 数据库** 和 **R2 存储桶**，无需手动准备资源。
4. 部署向导会提示你填写环境变量：至少设置 `ADMIN_TOKEN`（必填）。`CF_*` 与 `TG_*` 变量都是可选项，可以留空。
5. Cloudflare 会自动构建（含代码混淆）并部署 Worker。

不需要手动执行 SQL 或迁移命令。D1 schema 会在首次请求时通过 `ensureSchema()` 自动迁移。

## 部署完成后

1. 打开你的 `*.workers.dev` 地址。
2. 使用部署时设置的 `ADMIN_TOKEN` 登录。
3. 之后如需设置或轮换 `ADMIN_TOKEN`，可以在 Cloudflare Dashboard 中进入 **Workers & Pages → 你的 Worker → Settings → Variables and Secrets** 修改，或通过命令行执行：

```bash
wrangler secret put ADMIN_TOKEN
```

## 配置参考

| 变量 | 是否必填 | 启用能力 | 如何获取 |
|---|---|---|---|
| `ADMIN_TOKEN` | **是** | 保护管理面板和所有 `/api/*` 路由。未配置时 Worker 会拒绝所有管理请求。 | 自行生成一串足够长的随机字符串。 |
| `CF_API_TOKEN` | 否 | DNS 管理、Worker placement/部署设置，以及从 Cloudflare API 拉取流量/分析统计。 | 创建具备 **Zone: DNS (Edit)**、**Account: Workers Scripts (Edit)**、**Zone: Analytics (Read)** 权限的 Cloudflare API Token。 |
| `CF_ACCOUNT_ID` | 否 | 配合 `CF_API_TOKEN` 调用账号级接口，例如 Worker placement。 | Cloudflare Dashboard 的账号或 zone overview 页面右侧栏。 |
| `CF_ZONE_ID` | 否 | 配合 `CF_API_TOKEN` 管理指定域名的 DNS 记录。 | Cloudflare Dashboard 对应域名的 overview 页面。 |
| `CF_DOMAIN` | 否 | 创建和管理 DNS 记录、优选域名时使用的根域名。 | 已添加到 Cloudflare 的自有域名。 |
| `CF_WORKER_NAME` | 否 | 通过 Cloudflare API 管理 Worker placement/部署区域时需要。 | Cloudflare Dashboard 中显示的 Worker 脚本名称。 |
| `TG_BOT_TOKEN` | 否 | 启用 Telegram Bot：告警、状态查询、保活、静音、列表等指令。 | 从 [@BotFather](https://t.me/BotFather) 创建 Bot 获取。 |
| `TG_CHAT_ID` | 否 | Bot 发送告警和回复的 chat/user ID。 | 向 Bot 发消息后，通过 `getUpdates` 等方式查看 chat ID。 |
| `TG_WEBHOOK_SECRET` | 否 | 校验传入的 `/api/tg-webhook` 请求确实来自 Telegram。 | 自行生成任意随机字符串，并在注册 webhook 时使用同一个值。 |

留空的 `CF_*` / `TG_*` 变量只会禁用对应功能，其余功能仍可正常使用。

## 后续启用高级功能

部署时不必填写 `CF_*` / `TG_*`。需要时随时补充即可：

- **Dashboard**：Workers & Pages → 你的 Worker → Settings → Variables and Secrets → 添加变量。多数变量会在下一次请求时生效，无需重新部署。
- **CLI**：

```bash
wrangler secret put CF_API_TOKEN
wrangler secret put CF_ACCOUNT_ID
wrangler secret put CF_ZONE_ID
wrangler secret put CF_DOMAIN
wrangler secret put CF_WORKER_NAME
wrangler secret put TG_BOT_TOKEN
wrangler secret put TG_CHAT_ID
wrangler secret put TG_WEBHOOK_SECRET
```

## 架构

- **Cloudflare Worker**：整个应用以单个 Worker (`src/index.js`) 运行，负责路由、反向代理、管理 API 与 Telegram webhook。
- **D1（绑定名 `DB`）**：持久化节点/路由、DNS 记录、探针历史、媒体计数、鉴权限流等状态，schema 在运行时自动迁移。
- **R2（绑定名 `POSTER_CACHE`）**：缓存 Emby 海报/图片响应以降低源站带宽；配合 30 天对象生命周期、仅图片且不超过 5MB 的保护规则，控制在免费额度内。
- **Cron 触发器**：三条计划任务（`*/5 * * * *`、每小时、每天）驱动节点探测与媒体计数刷新（见 `src/scheduled.js`）。
- **静态资源（`public/`）**：面板 CSS/JS 通过 `[assets]` 直接由 Cloudflare 边缘返回，命中缓存时不进入 Worker 逻辑。

## Cron 可靠性

Cloudflare 会自动配置三条 cron：`*/5 * * * *`（探针）、`0 * * * *`（每小时）、`0 0 * * *`（每天）。如果你所在账号或套餐的 cron 派发不稳定，可以用外部服务驱动同样的任务，例如 GitHub Actions、监控服务或自己的 cron 主机：

```bash
# 每约 1 分钟调用一次：作为节点探针的冗余 watchdog（数据仍新鲜时会自限流）
curl "https://<your-worker>.workers.dev/api/_probe_now?key=<ADMIN_TOKEN>" \
  -H "Cookie: admin_token=<ADMIN_TOKEN>"

# 每天调用一次：刷新媒体库电影/剧集等计数
curl "https://<your-worker>.workers.dev/api/_counts_now?key=<ADMIN_TOKEN>" \
  -H "Cookie: admin_token=<ADMIN_TOKEN>"
```

## 本地开发

```bash
npm install
wrangler login
cp .dev.vars.example .dev.vars   # 填写 ADMIN_TOKEN
npm run build
wrangler dev
```

运行测试和检查：

```bash
npm test          # 单元测试
npm run verify    # 构建 + lint + UI 快照检查 + 测试
```

## 自托管 / 所有者部署（含混淆）

如果你不走一键部署流程，而是从本机部署：

```bash
npm run deploy         # 使用公开的 wrangler.toml
npm run deploy:prod    # 使用你自己的 wrangler.prod.toml
```

两个命令都会先构建 Worker，并在 `wrangler deploy --no-bundle` 前混淆最终发布的 JavaScript (`dist/worker.obf.js`)。混淆只影响部署产物，仓库源码保持可读。

## 安全提示

- 为 `ADMIN_TOKEN` 使用足够长、足够随机的字符串。它是保护面板和所有 `/api/*` 路由的唯一凭证。
- 鉴权失败会按 IP 做 D1 固定窗口限流，并对持续攻击触发 fail2ban 式自动封禁。
- 代码混淆只用于加固已部署的 Worker 产物，不能替代强 `ADMIN_TOKEN`。

## 许可证

MIT

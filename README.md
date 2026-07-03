**中文** | [English](README.en.md)

# Emby Proxy

一个基于 Cloudflare Worker 的 **Emby 多节点反向代理控制台**：集中管理节点与路由、DNS 与优选域名、保活探针与异常告警、流量与媒体统计，配有响应式 Web 面板、公开状态页，并可选接入 Telegram Bot。全部运行在 Cloudflare 边缘，无需自建服务器。

## 界面预览

| 监控看板 | 身份验证 |
| :---: | :---: |
| ![监控看板](docs/screenshots/dashboard.png) | ![登录页](docs/screenshots/login.png) |

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ykq007/emby-proxy)

## 功能概览

- **多节点 Emby 反向代理**：统一入口转发到多个后端 Emby 节点，支持路由管理。
- **DNS 与优选域名管理**：可选接入 Cloudflare API，管理域名解析与优选 IP/域名。
- **保活探针 + 告警**：定时探测节点存活状态，异常时触发告警（含 Telegram 通知）。
- **流量 / 媒体统计**：汇总访问流量与媒体使用情况，支持 Cloudflare Analytics 数据。
- **响应式 Web 控制台**：桌面与移动端均可顺手操作，另有面向访客的公开状态页。
- **可选 Telegram Bot**：通过聊天指令查看状态、接收告警推送。

## 一键部署

1. 点击上方 **Deploy to Cloudflare** 按钮。
2. 授权后，Cloudflare 会将本仓库 fork/克隆到你自己的 GitHub 账号下。
3. Cloudflare 会读取仓库中的 `wrangler.toml`，自动为你**新建一个 D1 数据库和一个 R2 存储桶**并回填 ID，无需手动创建。
4. 引导流程中会提示你填写环境变量：**`ADMIN_TOKEN`（必填）**，以及可选的 `CF_*` / `TG_*`（见下方配置表）。
5. Cloudflare 会自动执行仓库中的构建与部署脚本（含代码混淆），并将 Worker 部署上线。
6. 首次访问时，数据库表结构会**自动迁移**，无需手动执行任何 SQL。

## 部署完成后

1. 打开 Cloudflare 分配给你的 `*.workers.dev` 地址。
2. 使用你设置的 `ADMIN_TOKEN` 登录控制台面板。
3. 如需修改或轮换 `ADMIN_TOKEN`，可以：
   - 在 Cloudflare Dashboard 里进入该 Worker 的 **Settings → Variables**，编辑对应变量；或
   - 在本地执行 `wrangler secret put ADMIN_TOKEN`。

## 配置参考

| 变量 | 是否必填 | 作用 | 如何获取 |
| --- | --- | --- | --- |
| `ADMIN_TOKEN` | **必填** | 面板登录凭证，同时保护所有 `/api/*` 接口；未设置时鉴权直接失败（HTTP 500），不存在任何默认口令 | 自行生成一串足够长的随机字符串 |
| `CF_API_TOKEN` | 可选 | 启用 DNS 管理 / 故障转移 / Cloudflare 流量统计等功能 | Cloudflare Dashboard → My Profile → API Tokens，创建一个具备 **Zone:DNS**、**Zone:Analytics**、**Account:Workers Scripts** 权限的 Token |
| `CF_ACCOUNT_ID` | 可选（配合 `CF_API_TOKEN` 使用） | 用于故障转移 / Workers 相关调用时定位账号 | Cloudflare Dashboard 右侧栏 Account ID |
| `CF_ZONE_ID` | 可选（配合 `CF_API_TOKEN` 使用） | 用于 DNS 管理与流量统计时定位域名的 Zone | Cloudflare Dashboard 对应域名的 Overview 页面 |
| `CF_DOMAIN` | 可选（配合 `CF_API_TOKEN` 使用） | 声明用于 DNS / 优选域名管理的根域名 | 你自己托管在 Cloudflare 上的域名 |
| `CF_WORKER_NAME` | 可选（配合 `CF_API_TOKEN` 使用） | 用于故障转移 / Workers 相关调用时指定 Worker 名称 | 你部署的 Worker 名称 |
| `TG_BOT_TOKEN` | 可选 | 启用 Telegram Bot（状态查询、告警推送） | 从 [@BotFather](https://t.me/BotFather) 创建 Bot 获取 |
| `TG_CHAT_ID` | 可选（配合 `TG_BOT_TOKEN` 使用） | 指定接收通知/可操作 Bot 的管理员会话 | 向你的 Bot 发送消息后，通过 Telegram API 或 `getUpdates` 获取 chat id |
| `TG_WEBHOOK_SECRET` | 可选（配合 `TG_BOT_TOKEN` 使用） | 校验 Telegram Webhook 请求来源，防止伪造 | 自行生成一串随机字符串，与 Telegram Webhook 设置保持一致 |

> 未配置的可选变量不会导致报错，相关功能只是自动隐藏/禁用。

## 后续启用高级功能

一键部署时如果没有填写 `CF_*` / `TG_*`，随时可以之后再补上，无需重新部署：

- **Cloudflare Dashboard**：进入 Worker 的 **Settings → Variables**，添加对应变量（普通变量用 plain text，Token 类建议加密存储）。
- **命令行**：使用 `wrangler secret put <变量名>`，例如：

```bash
wrangler secret put CF_API_TOKEN
wrangler secret put TG_BOT_TOKEN
```

保存后功能会在下一次请求时自动生效，无需重新构建或部署。

## 架构

- **Cloudflare Worker**：承载全部路由逻辑——反向代理、管理 API、面板与状态页渲染。
- **D1（状态存储）**：节点、路由、DNS 配置、探针记录、告警与统计数据的持久化存储，schema 在运行时自动迁移。
- **R2（海报缓存）**：缓存 Emby 媒体海报等图片资源，降低回源压力。
- **Cron 触发器**：定时执行保活探针与统计汇总任务（见下方 Cron 可靠性说明）。
- **边缘静态资源（`public/`）**：面板 CSS / 客户端 JS 由 Cloudflare 边缘直接托管，命中即返回，不进入 Worker 逻辑。

## Cron 可靠性说明

仓库已自动配置三个 Cron 任务（`*/5 * * * *`、每小时一次、每天一次），分别驱动保活探针与统计汇总。

如果所在账号的 Cloudflare Cron 派发出现不稳定（账号级 Cron 已知存在偶发延迟/丢失问题），可以改用外部定时服务（如 cron-job.org、GitHub Actions 等）主动调用以下端点：

- `GET /api/_probe_now` —— 每约 1 分钟调用一次，驱动保活探针
- `GET /api/_counts_now` —— 每天调用一次，驱动统计汇总

调用时需要带上鉴权：

```
Cookie: admin_token=<ADMIN_TOKEN>
```

以及查询参数 `?key=<ADMIN_TOKEN>`。

## 本地开发

```bash
npm install
wrangler login

# 复制环境变量示例文件并填写 ADMIN_TOKEN
cp .dev.vars.example .dev.vars

npm run build
wrangler dev
```

其他常用命令：

```bash
npm test          # 运行单元测试
npm run verify     # 构建 + lint + UI 快照检查 + 单元测试
```

## 自托管 / 所有者部署（含混淆）

如果你希望在自己账号下直接用命令行部署（而不是走一键部署按钮），可以使用：

```bash
npm run deploy       # 使用仓库内公开配置（wrangler.toml）
npm run deploy:prod   # 使用你本地的 wrangler.prod.toml（所有者专属配置）
```

两者都会先构建再对产物代码进行**混淆**后部署——部署到 Cloudflare 的 Worker JS 是混淆后的版本，但仓库中的源码始终保持可读。

## 安全提示

- 请为 `ADMIN_TOKEN` 使用足够长、足够随机的字符串，避免被猜测或撞库。
- 内置**鉴权失败限流**（按来源 IP 在 D1 中做固定窗口计数）与 **fail2ban 式封禁**，抵御暴力破解登录。
- 代码混淆仅用于加固**部署产物**，不能替代妥善保管密钥与合理的访问控制。

## 许可证

[MIT](LICENSE)

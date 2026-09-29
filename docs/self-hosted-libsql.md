# 自托管数据库（VPS 上的 libSQL）

[English](self-hosted-libsql.en.md)

默认情况下 Worker 把所有数据存在 Cloudflare D1。D1 免费版有硬性日配额（读 500 万行、写 10 万行），用完后 D1 会拒绝查询直到 UTC 00:00。这个可选模式把数据库搬到**你自己的 VPS** 上，没有行数配额。Worker 仍跑在 Cloudflare 上，视频依旧走 Cloudflare 网络，不经过 VPS。

- **可选开启**：设置 `LIBSQL_URL` secret 即切到 VPS；不设置则照旧用 D1。
- **SQL、数据完全不变**：libSQL（`sqld`）就是 SQLite，应用代码无需任何改动。
- 小 VPS 足够（1 vCPU、512MB 内存），Oracle Cloud 永久免费实例即可。

## VPS 宕机时会怎样

- **反代和播放照常**：Worker 在内存里（自定义域名下还在 Cloudflare 缓存里）保留最近一份可用的路由配置并继续使用；每 10–30 秒重试一次数据库，VPS 恢复后自动接上。
- **暂停到 VPS 恢复为止**：管理面板、观看账号登录、观看进度保存、统计与日志。
- 缓存里的那份只在**自定义域名**下有效：`*.workers.dev` 上 Cloudflare 缓存不可用，数据库宕机期间新启动的 Worker 实例无法恢复路由（已加载过配置的实例不受影响）。

## 1. 生成访问令牌（在你自己的电脑上）

```bash
node scripts/libsql-keygen.mjs
```

输出两行：

- `SQLD_AUTH_JWT_KEY=…`：给 VPS 的公钥，只能验证令牌，不能签发。
- `LIBSQL_AUTH_TOKEN=…`：给 Worker 的令牌，注意保密。

私钥签完即丢弃。要换令牌就重跑一次，两边一起更新。

## 2. 在 VPS 上启动数据库

需要 Docker，以及一个指向 VPS 的域名（如 `db.example.com`，DNS **A 记录**），放行 80、443 端口。

```bash
mkdir -p /opt/emby-db && cd /opt/emby-db
# 把本仓库 deploy/libsql/ 下的 docker-compose.yml、Caddyfile、backup.sh 复制到这里，然后：
cat > .env <<'EOF'
SQLD_AUTH_JWT_KEY=<第 1 步输出>
LIBSQL_AUTH_TOKEN=<第 1 步输出>
DB_DOMAIN=db.example.com
EOF
chmod 600 .env
docker compose up -d
```

这会启动 `sqld`（数据在 `./data`）和 Caddy（自动为 `DB_DOMAIN` 申请 HTTPS 证书）。`sqld` 本身只监听 `127.0.0.1`。如果该域名在 Cloudflare 开了代理（橙色云朵），把 SSL/TLS 模式设为 **Full (strict)**。

检查：`curl https://db.example.com/health` 应返回 HTTP 200；不带令牌的查询会被 401 拒绝。

## 3. 从 D1 迁移数据

找个使用低峰期操作：导出之后再写进 D1 的数据（访客日志、观看进度）不会被带过去。

```bash
npx wrangler d1 export emby-proxy-db --remote --output d1.sql   # 换成你的 D1 库名
LIBSQL_URL=https://db.example.com LIBSQL_AUTH_TOKEN=<令牌> node scripts/libsql-import.mjs d1.sql
```

导入在一个事务里完成：要么全部导入，要么什么都不写；目标库已有表时会拒绝执行。**务必在第 4 步之前导入**：Worker 一旦连上空库，会自己先建出空表。

## 4. 让 Worker 改用 VPS

```bash
npx wrangler secret put LIBSQL_URL          # https://db.example.com
npx wrangler secret put LIBSQL_AUTH_TOKEN   # 第 1 步的令牌
```

也可以在 Cloudflare 控制台 → Workers → 你的 Worker → Settings → Variables and Secrets 里添加。下一次请求即生效，无需重新部署。`wrangler.toml` 里的 D1 绑定保留即可，设置了 `LIBSQL_URL` 时它只是不被使用。

打开管理面板，确认节点都在。

## 5. 备份

`backup.sh` 会把压缩后的 SQL 导出存到 `backups/`，保留最近 14 份。加进 VPS 的 crontab：

```bash
15 3 * * * cd /opt/emby-db && ./backup.sh >> backup.log 2>&1
```

恢复：启动一个空库，`gunzip -c backups/<日期>.sql.gz > restore.sql`，再按第 3 步用 `scripts/libsql-import.mjs` 导入。记得定期把备份复制到 VPS 之外。

## 切回 D1

```bash
npx wrangler secret delete LIBSQL_URL
```

Worker 立即改回 D1。在 VPS 期间写入的数据留在 VPS 库里；需要的话先用 `backup.sh` 备份，再：

```bash
gunzip -c backups/<日期>.sql.gz | grep -v -e '^BEGIN TRANSACTION;' -e '^COMMIT;' -e '^PRAGMA foreign_keys' > to-d1.sql
npx wrangler d1 execute <库名> --remote --file to-d1.sql   # 导入一个空的 D1 库
```

## 仍然存在的限制

- Workers 免费版限制：每天 10 万次请求、每次请求 10ms CPU、每次请求最多 50 个出站请求（每次数据库查询算一个，正常请求只用到几个）。
- 延迟：每次数据库查询都要从 Cloudflare 往返 VPS 一次。VPS 选离用户近的地区；路由查找有 60 秒缓存，正常反代很少需要等它。

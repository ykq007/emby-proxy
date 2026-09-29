#!/bin/sh
# 每日备份自托管 libSQL：导出 SQL 并压缩，保留最近 14 份。
# 在 VPS 上（docker-compose.yml 同目录）加进 crontab，例如：
#   15 3 * * * cd /opt/emby-db && ./backup.sh >> backup.log 2>&1
# 需要同目录 .env 里有 LIBSQL_AUTH_TOKEN（与 Worker 用的同一个令牌）。
# 恢复：gunzip 后用 scripts/libsql-import.mjs 导入一个空库。
set -eu
cd "$(dirname "$0")"
. ./.env
mkdir -p backups
out="backups/$(date +%F).sql.gz"
curl -sSf -H "Authorization: Bearer ${LIBSQL_AUTH_TOKEN}" http://127.0.0.1:8080/dump | gzip > "$out.tmp"
mv "$out.tmp" "$out"
ls -1t backups/*.sql.gz | tail -n +15 | xargs -r rm --
echo "$(date '+%F %T') backup ok: $out"

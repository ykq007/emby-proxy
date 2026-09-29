// 把 SQL 导出一次性导入自托管 libSQL（sqld）。整个导入在一个事务里：中途出错则什么都不写。
// 支持两种来源：D1 导出（npx wrangler d1 export <库名> --remote --output d1.sql）
// 和 sqld 自己的备份（deploy/libsql/backup.sh 产出的 /dump，先 gunzip）。
// 用法：LIBSQL_URL=https://db.example.com LIBSQL_AUTH_TOKEN=... node scripts/libsql-import.mjs d1.sql
// 目标库必须是空库——先导入，再给 Worker 配 LIBSQL_URL（否则 Worker 会先自动建出空表）。
import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';

const file = process.argv[2];
const url = process.env.LIBSQL_URL;
if (!file || !url) {
    console.error('用法: LIBSQL_URL=... LIBSQL_AUTH_TOKEN=... node scripts/libsql-import.mjs <d1-export.sql>');
    process.exit(1);
}
const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN || undefined });

const existing = await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%'`);
if (existing.rows.length) {
    console.error(`目标库不是空库（已有表: ${existing.rows.map(r => r.name).join(', ')}），已中止。`);
    process.exit(1);
}

// 两种导出都是一行一条语句。D1 的内部表（_cf_*）不属于应用数据，跳过；
// sqld 备份自带 BEGIN/COMMIT，去掉后统一包进下面这一个事务。
const sql = readFileSync(file, 'utf8')
    .split('\n')
    .filter(line => !/^(CREATE TABLE|INSERT INTO) "?_cf_/i.test(line))
    .filter(line => !/^(BEGIN TRANSACTION|COMMIT);\s*$/i.test(line))
    .join('\n');

await client.executeMultiple(`BEGIN;\n${sql}\nCOMMIT;`);
const tables = await client.execute(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%' ORDER BY name`);
for (const { name } of tables.rows) {
    const { rows } = await client.execute(`SELECT COUNT(*) AS n FROM "${name}"`);
    console.log(`${name}: ${rows[0].n} 行`);
}
client.close();

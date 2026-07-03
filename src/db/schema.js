import { dbRun, dbFirst, dbAll, dbStmt, dbBatch } from './helpers.js';
import { DEFAULT_OPTIMIZED_DOMAINS } from '../routing/validate.js';
import { DEFAULT_MANUAL_REDIRECT_DOMAINS, MANUAL_REDIRECT_DOMAINS_KEY } from '../routing/manual-redirect-allowlist.js';
import { SCHEMA_VERSION_KEY } from './kv.js';

let _schemaReady = false;

// Schema 版本号：每次新增/修改 DDL 时递增此值即可触发下次冷启重新跑一遍迁移。
// 版本号存在 kv_config(k=SCHEMA_VERSION_KEY) 里；命中且匹配时 ensureSchema 只做
// 一次 SELECT 就返回，省掉冷启时 ~50 条 DDL exec 带来的延迟。
export const SCHEMA_VERSION = 1;
// Key constant lives in db/kv.js (the kv_config registry); re-exported here
// so existing importers of SCHEMA_VERSION_KEY from this module keep working.
export { SCHEMA_VERSION_KEY };

// 仅供测试使用：重置模块级 ready 标志，让 ensureSchema 在同一进程内可重复触发。
export function __resetSchemaReadyForTest() { _schemaReady = false; }

export async function ensureSchema(env) {
    if (_schemaReady || !env.DB) return;
    try {
        // 版本探测：命中且与当前 SCHEMA_VERSION 相等则直接返回，跳过下面的全量迁移。
        // 全新空库时 kv_config 表还不存在，这条 SELECT 会抛错（no such table）——
        // 按"版本不匹配"处理，落到下面的全量迁移自愈建表 + 写入版本号。
        let storedVersion = null;
        try {
            const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = ?`, SCHEMA_VERSION_KEY);
            storedVersion = row ? row.v : null;
        } catch (e) {
            storedVersion = null;
        }
        if (storedVersion === String(SCHEMA_VERSION)) {
            _schemaReady = true;
            return;
        }

        // 既有表（避免冷启时尚未触达 /api/routes 路径）
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)`);

        // routes 基础业务列（原先散落在 /api/routes 内联 DDL，已收敛至此）
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN mode TEXT DEFAULT 'off'`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN remark TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN group_name TEXT DEFAULT ''`); } catch (e) { } // 节点分组/标签
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN last_play TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN icon TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN cache_img TEXT DEFAULT 'on'`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN sort_order INTEGER DEFAULT 0`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN custom_headers TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN backend_url TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN keepalive_days INTEGER DEFAULT 0`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN keepalive_last_played_at INTEGER DEFAULT 0`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN keepalive_last_reminded_at INTEGER DEFAULT 0`); } catch (e) { }
        // 新增表
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS kv_config (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS optimized_domains (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL UNIQUE, note TEXT DEFAULT '', builtin INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, last_ms INTEGER DEFAULT -1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS dns_config (id INTEGER PRIMARY KEY CHECK (id = 1), cf_api_token TEXT DEFAULT '', cf_zone_id TEXT DEFAULT '', cf_record_id TEXT DEFAULT '', target_alias TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        // emby-js 监控移植：节点状态、探测历史、媒体计数、公开分享
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN show_on_status INTEGER DEFAULT 0`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN public_alias TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN media_counts_auto_auth INTEGER DEFAULT 0`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_auth_cache TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_auth_seen_at INTEGER DEFAULT 0`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_auth_used_at INTEGER DEFAULT 0`); } catch (e) { }
        // 实时媒体计数：每节点可填 Emby 用户名/密码（密码 AES-GCM 加密存储）。
        // 留空则回退到全局共享凭据（kv_config: emby_shared_username / emby_shared_password_enc）。
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_username TEXT DEFAULT ''`); } catch (e) { }
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_password_enc TEXT DEFAULT ''`); } catch (e) { }
        // 每节点监控开关：是否纳入状态探测 + 媒体计数抓取/展示。
        // 默认 1（开启）——与代理 mode 解耦，已有节点升级后自动全部启用。
        try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN monitor_enabled INTEGER DEFAULT 1`); } catch (e) { }
        // 旧 /status 移植尝试可能在 D1 留下同名表但 schema 不同。自愈：探测目标列；缺失则 DROP + 重建。
        // 这两张表只放遥测数据，无用户配置，重建无副作用。
        const probeRecreate = async (table, createSql, indexSql, probeCol) => {
            try {
                await dbAll(env, `SELECT ${probeCol} FROM ${table} LIMIT 0`);
            } catch (e) {
                if (/no such column|no such table/i.test(e.message || '')) {
                    try { await env.DB.exec(`DROP TABLE IF EXISTS ${table}`); } catch (_) {}
                }
            }
            await env.DB.exec(createSql);
            if (indexSql) await env.DB.exec(indexSql);
        };
        await probeRecreate(
            'emby_probes',
            `CREATE TABLE IF NOT EXISTS emby_probes (prefix TEXT NOT NULL, ts INTEGER NOT NULL, ok INTEGER NOT NULL, ms INTEGER NOT NULL, status INTEGER DEFAULT 0, PRIMARY KEY(prefix, ts))`,
            `CREATE INDEX IF NOT EXISTS idx_emby_probes_prefix_ts ON emby_probes(prefix, ts)`,
            'ms'
        );
        await probeRecreate(
            'emby_probe_hourly',
            `CREATE TABLE IF NOT EXISTS emby_probe_hourly (prefix TEXT NOT NULL, hour_ts INTEGER NOT NULL, ok_count INTEGER NOT NULL, fail_count INTEGER NOT NULL, avg_ms INTEGER NOT NULL, p95_ms INTEGER NOT NULL, PRIMARY KEY(prefix, hour_ts))`,
            null,
            'hour_ts'
        );
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_probe_state (prefix TEXT PRIMARY KEY, first_fail_at INTEGER DEFAULT 0, last_alert_at INTEGER DEFAULT 0, alert_kind TEXT DEFAULT 'none')`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_media_counts (prefix TEXT NOT NULL, day TEXT NOT NULL, movies INTEGER DEFAULT 0, series INTEGER DEFAULT 0, episodes INTEGER DEFAULT 0, artists INTEGER DEFAULT 0, albums INTEGER DEFAULT 0, songs INTEGER DEFAULT 0, music_videos INTEGER DEFAULT 0, box_sets INTEGER DEFAULT 0, books INTEGER DEFAULT 0, PRIMARY KEY(prefix, day))`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_media_counts_live (prefix TEXT PRIMARY KEY, movies INTEGER DEFAULT 0, series INTEGER DEFAULT 0, episodes INTEGER DEFAULT 0, artists INTEGER DEFAULT 0, albums INTEGER DEFAULT 0, songs INTEGER DEFAULT 0, music_videos INTEGER DEFAULT 0, box_sets INTEGER DEFAULT 0, books INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0, last_scan_end INTEGER DEFAULT 0)`);
        for (const col of ['artists', 'albums', 'songs', 'music_videos', 'box_sets', 'books']) {
            try { await env.DB.exec(`ALTER TABLE emby_media_counts ADD COLUMN ${col} INTEGER DEFAULT 0`); } catch (e) {}
            try { await env.DB.exec(`ALTER TABLE emby_media_counts_live ADD COLUMN ${col} INTEGER DEFAULT 0`); } catch (e) {}
        }
        // 今日带宽缓存：由 cron 周期性从 CF GraphQL 抓取并写入，/api/routes 只读此表，避免页面打开时实时拉取。
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS route_bandwidth_today (prefix TEXT NOT NULL, day TEXT NOT NULL, bytes INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0, PRIMARY KEY(prefix, day))`);

        // 登录失败限流：按 IP + 60s 固定窗口计数(见 middleware/auth.js)；旧窗口由每日 cron 清理。
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS auth_rl (ip TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY(ip, win))`);
        // Fail2ban 自动封禁名单：until 为封禁到期(ms 时间戳)；过期行由每日 cron 清理。
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS ip_bans (ip TEXT PRIMARY KEY, until INTEGER NOT NULL, reason TEXT DEFAULT '')`);
        // 代理层前缀扫描限流：按 IP + 60s 固定窗口计数(见 proxy/scan-guard.js)；旧窗口由每日 cron 清理。
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS scan_rl (ip TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY(ip, win))`);

        // Seed 内置优选域名（依赖 UNIQUE(domain) 去重，幂等）
        const seedStmts = DEFAULT_OPTIMIZED_DOMAINS.map(d =>
            dbStmt(env, `INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 1, 1)`, d.domain, d.note)
        );
        if (seedStmts.length) await dbBatch(env, seedStmts);

        // Seed manual redirect domains 默认值
        const existing = await dbFirst(env, `SELECT v FROM kv_config WHERE k = '${MANUAL_REDIRECT_DOMAINS_KEY}'`);
        if (!existing) {
            await dbRun(env, `INSERT INTO kv_config (k, v) VALUES ('${MANUAL_REDIRECT_DOMAINS_KEY}', ?)`, DEFAULT_MANUAL_REDIRECT_DOMAINS.join('\n'));
        }

        // 迁移完成，写入/更新 schema 版本号，下次冷启即可命中版本匹配的快路径。
        await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`, SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
        _schemaReady = true;
    } catch (e) {
        // 不抛错：DB 失败不能阻塞 Worker
        console.log('ensureSchema error:', e.message);
    }
}

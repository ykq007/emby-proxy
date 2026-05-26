import { dbRun, dbFirst } from './helpers.js';
import { DEFAULT_MANUAL_REDIRECT_DOMAINS, DEFAULT_OPTIMIZED_DOMAINS, updateManualRedirectHosts } from '../routing/validate.js';

let _schemaReady = false;

export async function ensureSchema(env) {
    if (_schemaReady || !env.DB) return;
    try {
        // 既有表（避免冷启时尚未触达 /api/routes 路径）
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)`);
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
        // 旧 /status 移植尝试可能在 D1 留下同名表但 schema 不同。自愈：探测目标列；缺失则 DROP + 重建。
        // 这两张表只放遥测数据，无用户配置，重建无副作用。
        const probeRecreate = async (table, createSql, indexSql, probeCol) => {
            try {
                await env.DB.prepare(`SELECT ${probeCol} FROM ${table} LIMIT 0`).all();
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
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_media_counts (prefix TEXT NOT NULL, day TEXT NOT NULL, movies INTEGER DEFAULT 0, series INTEGER DEFAULT 0, episodes INTEGER DEFAULT 0, PRIMARY KEY(prefix, day))`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_public_share (token TEXT PRIMARY KEY, scope TEXT NOT NULL, prefix TEXT DEFAULT '', expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`);
        await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_emby_public_share_scope_prefix ON emby_public_share(scope, prefix)`);

        // Seed 内置优选域名（依赖 UNIQUE(domain) 去重，幂等）
        const seedStmts = DEFAULT_OPTIMIZED_DOMAINS.map(d =>
            env.DB.prepare(`INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 1, 1)`).bind(d.domain, d.note)
        );
        if (seedStmts.length) await env.DB.batch(seedStmts);

        // Seed manual redirect domains 默认值
        const existing = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'manual_redirect_domains'`);
        if (!existing) {
            await dbRun(env, `INSERT INTO kv_config (k, v) VALUES ('manual_redirect_domains', ?)`, DEFAULT_MANUAL_REDIRECT_DOMAINS.join('\n'));
            updateManualRedirectHosts(new Set(DEFAULT_MANUAL_REDIRECT_DOMAINS.map(s => s.toLowerCase())));
        } else {
            updateManualRedirectHosts(new Set(String(existing.v || '').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean)));
        }
        _schemaReady = true;
    } catch (e) {
        // 不抛错：DB 失败不能阻塞 Worker
        console.log('ensureSchema error:', e.message);
    }
}

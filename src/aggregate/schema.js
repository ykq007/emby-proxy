// 聚合 Worker 自己的表（全部 agg_ 前缀）。与生产 Worker 共用同一个 D1，但：
//   - 绝不调用生产的 ensureSchema（两边会互相重跑迁移）；
//   - 版本号存在自己的 agg_meta 里，不碰 kv_config。
// 生产表只读（routes / viewers / viewer_access / visitor_logs / kv_config），
// 例外：登录爆破封禁写 ip_bans（两个 Worker 共享封禁是有意的）。
import { dbFirst, dbRun } from '../db/helpers.js';

export const AGG_SCHEMA_VERSION = 1;
let ready = false;

export function __resetAggSchemaForTest() { ready = false; }

export async function ensureAggSchema(env) {
    if (ready) return;
    try {
        const row = await dbFirst(env, `SELECT v FROM agg_meta WHERE k = 'schema_version'`);
        if (row && row.v === String(AGG_SCHEMA_VERSION)) { ready = true; return; }
    } catch (e) { /* 表还不存在 */ }

    const stmts = [
        `CREATE TABLE IF NOT EXISTS agg_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
        // 合并后的作品（电影 / 剧集）。vid 即对客户端暴露的 Id，从 1001 起（1、2 留给虚拟媒体库）。
        `CREATE TABLE IF NOT EXISTS agg_items (
            vid INTEGER PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL, sort_name TEXT NOT NULL,
            name_key TEXT NOT NULL, year INTEGER, premiere TEXT, date_added TEXT, rating REAL, official_rating TEXT,
            runtime_ticks INTEGER, genres TEXT DEFAULT '', tmdb TEXT, imdb TEXT, tvdb TEXT,
            owner_prefix TEXT, owner_item TEXT)`,
        `CREATE INDEX IF NOT EXISTS idx_agg_items_sort ON agg_items(type, sort_name)`,
        `CREATE INDEX IF NOT EXISTS idx_agg_items_added ON agg_items(type, date_added)`,
        `CREATE INDEX IF NOT EXISTS idx_agg_items_tmdb ON agg_items(tmdb) WHERE tmdb IS NOT NULL`,
        `CREATE INDEX IF NOT EXISTS idx_agg_items_imdb ON agg_items(imdb) WHERE imdb IS NOT NULL`,
        `CREATE INDEX IF NOT EXISTS idx_agg_items_tvdb ON agg_items(tvdb) WHERE tvdb IS NOT NULL`,
        `CREATE INDEX IF NOT EXISTS idx_agg_items_namekey ON agg_items(name_key)`,
        // 每个节点上的一份副本。sig = 元数据指纹，未变化时同步不写库。
        `CREATE TABLE IF NOT EXISTS agg_sources (
            prefix TEXT NOT NULL, item_id TEXT NOT NULL, vid INTEGER NOT NULL, lib_id TEXT NOT NULL,
            image_tags TEXT DEFAULT '{}', sig TEXT DEFAULT '', PRIMARY KEY(prefix, item_id))`,
        `CREATE INDEX IF NOT EXISTS idx_agg_sources_vid ON agg_sources(vid)`,
        // 每节点同步游标（见 sync.js）。
        `CREATE TABLE IF NOT EXISTS agg_sync (
            prefix TEXT PRIMARY KEY, since TEXT DEFAULT '', pass_start TEXT DEFAULT '', libs TEXT DEFAULT '[]',
            li INTEGER DEFAULT 0, start INTEGER DEFAULT 0, reconciled_at INTEGER DEFAULT 0,
            updated_at INTEGER DEFAULT 0, error TEXT DEFAULT '')`,
        // 同步 / 详情 / 图片用的上游会话：每节点一个，密文同生产（ADMIN_TOKEN 派生密钥）。
        `CREATE TABLE IF NOT EXISTS agg_sessions (prefix TEXT PRIMARY KEY, blob TEXT NOT NULL)`,
        // 聚合端签发给 viewer 的令牌（ea_ 前缀），只存 SHA-256；pw_fp = 签发时密码哈希的指纹。
        `CREATE TABLE IF NOT EXISTS agg_tokens (token_hash TEXT PRIMARY KEY, viewer_id TEXT NOT NULL, device_id TEXT DEFAULT '', pw_fp TEXT NOT NULL, created_at INTEGER DEFAULT 0)`,
        `CREATE INDEX IF NOT EXISTS idx_agg_tokens_viewer ON agg_tokens(viewer_id)`,
        `CREATE TABLE IF NOT EXISTS agg_auth_rl (ip TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY(ip, win))`,
    ];
    for (const sql of stmts) await env.DB.exec(sql.replace(/\s+/g, ' '));
    await dbRun(env, `INSERT OR REPLACE INTO agg_meta (k, v) VALUES ('schema_version', ?)`, String(AGG_SCHEMA_VERSION));
    ready = true;
}

// 聚合 Worker 自己的表（全部 agg_ 前缀）。与生产 Worker 共用同一个 D1，但：
//   - 绝不调用生产的 ensureSchema（两边会互相重跑迁移）；
//   - 版本号存在自己的 agg_meta 里，不碰 kv_config。
// 生产表只读（routes / viewers / viewer_access / visitor_logs / kv_config），
// 例外：登录爆破封禁写 ip_bans（两个 Worker 共享封禁是有意的）。
import { dbFirst, dbRun } from '../db/helpers.js';

export const AGG_SCHEMA_VERSION = 6;
let ready = false;

export function __resetAggSchemaForTest() { ready = false; }

export async function ensureAggSchema(env) {
    if (ready) return;
    let old = 0;
    try {
        const row = await dbFirst(env, `SELECT v FROM agg_meta WHERE k = 'schema_version'`);
        if (row && row.v === String(AGG_SCHEMA_VERSION)) { ready = true; return; }
        old = Number(row && row.v) || 0;
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
            image_tags TEXT DEFAULT '{}', sig TEXT DEFAULT '', media TEXT DEFAULT '', PRIMARY KEY(prefix, item_id))`,
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
        // v2 播放：每个 (节点, viewer 设备) 一个上游会话；PlaySessionId → 节点与真实条目（流 / 进度上报找回节点用）。
        `CREATE TABLE IF NOT EXISTS agg_device_sessions (prefix TEXT NOT NULL, device_id TEXT NOT NULL, blob TEXT NOT NULL, PRIMARY KEY(prefix, device_id))`,
        `CREATE TABLE IF NOT EXISTS agg_play_sessions (play_session_id TEXT PRIMARY KEY, prefix TEXT NOT NULL, item_id TEXT NOT NULL, vid INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
        // v3 观看状态：与生产 watch_state 同结构（watch.js 共用），prefix 恒为 'agg'，item_id 是聚合 Id。
        `CREATE TABLE IF NOT EXISTS agg_watch_state (viewer_id TEXT NOT NULL, prefix TEXT NOT NULL, item_id TEXT NOT NULL,
            item_type TEXT DEFAULT '', series_id TEXT DEFAULT '', parent_index INTEGER DEFAULT 0, index_number INTEGER DEFAULT 0,
            position_ticks INTEGER DEFAULT 0, runtime_ticks INTEGER DEFAULT 0, played INTEGER DEFAULT 0, is_favorite INTEGER DEFAULT 0,
            last_played INTEGER DEFAULT 0, resume_hidden INTEGER DEFAULT 0, PRIMARY KEY(viewer_id, prefix, item_id))`,
        `CREATE TABLE IF NOT EXISTS agg_auth_rl (ip TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY(ip, win))`,
        // 副本的全部文件（版本菜单）：节点的列表接口只给默认文件，单条详情才有全部，问一次存下（catalog.js 的 loadFullMedia）。
        `CREATE TABLE IF NOT EXISTS agg_media (prefix TEXT NOT NULL, item_id TEXT NOT NULL, media TEXT NOT NULL, updated_at INTEGER DEFAULT 0, PRIMARY KEY(prefix, item_id))`,
    ];
    for (const sql of stmts) await env.DB.exec(sql.replace(/\s+/g, ' '));
    // v4：副本的文件摘要（版本菜单显示大小 / 码率 / 分辨率，不用问节点）。老库补列，已有就跳过。
    try { await env.DB.exec(`ALTER TABLE agg_sources ADD COLUMN media TEXT DEFAULT ''`); } catch (e) { }
    // v6：agg_media 改存节点原样的媒体源；v5 及以前存的是摘要，清掉，打开作品时重新问。
    if (old && old < 6) await env.DB.exec(`DELETE FROM agg_media`);
    await dbRun(env, `INSERT OR REPLACE INTO agg_meta (k, v) VALUES ('schema_version', ?)`, String(AGG_SCHEMA_VERSION));
    ready = true;
}

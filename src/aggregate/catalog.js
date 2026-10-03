// 合并目录：多节点的电影 / 剧集按 Tmdb → Imdb → Tvdb 去重成一条 agg_items，
// 每个节点的副本是一条 agg_sources。只收录电影和剧集，不收录剧集的季 / 集
// （D1 免费额度下写不起；季 / 集在播放阶段按需从节点实时取）。
import { dbAll, dbFirst, dbRun } from '../db/helpers.js';

export const LIB_MOVIES = '1';
export const LIB_SERIES = '2';
export const TYPES = { Movie: LIB_MOVIES, Series: LIB_SERIES };
const FIRST_VID = 1001;

// D1 粗略计费：每写一行 + 每个受影响的索引各算一行。
const COST_NEW_ITEM = 7;
const COST_ITEM_UPDATE = 3;
const COST_SOURCE = 2;

export function normalizeName(s) {
    return String(s || '').normalize('NFKC').toLowerCase()
        .replace(/['’`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function providerIds(it) {
    const out = { tmdb: null, imdb: null, tvdb: null };
    for (const [k, v] of Object.entries(it.ProviderIds || {})) {
        const key = k.toLowerCase();
        if (key in out && v != null && String(v).trim()) out[key] = String(v).trim().toLowerCase();
    }
    return out;
}

function imageTags(it) {
    const t = { ...(it.ImageTags || {}) };
    if (Array.isArray(it.BackdropImageTags) && it.BackdropImageTags.length) t.Backdrop = it.BackdropImageTags[0];
    return t;
}

// 写入 agg_items 的字段，由一个节点条目推出。
export function itemFields(it) {
    const year = Number(it.ProductionYear) || (it.PremiereDate ? Number(String(it.PremiereDate).slice(0, 4)) : 0) || null;
    return {
        type: it.Type,
        name: String(it.Name || ''),
        sort_name: normalizeName(it.SortName || it.Name),
        name_key: normalizeName(it.Name) + '|' + (year || ''),
        year,
        premiere: it.PremiereDate || null,
        date_added: it.DateCreated || null,
        rating: it.CommunityRating != null ? Number(it.CommunityRating) : null,
        official_rating: it.OfficialRating || null,
        runtime_ticks: Number(it.RunTimeTicks) || null,
        genres: Array.isArray(it.Genres) && it.Genres.length ? '|' + it.Genres.join('|') + '|' : '',
        ...providerIds(it),
    };
}

// 元数据指纹：同步时与 agg_sources.sig 比较，没变就不写。
export function sourceSig(libId, it) {
    const s = JSON.stringify([libId, itemFields(it), imageTags(it)]);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
}

async function findVid(env, f) {
    if (f.tmdb || f.imdb || f.tvdb) {
        // 有外部 ID 的条目只按外部 ID 合并，绝不按片名合并（同名同年的不同作品很常见）。
        return dbFirst(env,
            `SELECT * FROM agg_items WHERE type = ? AND (tmdb = ? OR imdb = ? OR tvdb = ?)
              ORDER BY (tmdb = ?) DESC, (imdb = ?) DESC LIMIT 1`,
            f.type, f.tmdb, f.imdb, f.tvdb, f.tmdb, f.imdb);
    }
    return dbFirst(env, `SELECT * FROM agg_items WHERE type = ? AND name_key = ? LIMIT 1`, f.type, f.name_key);
}

const COLS = ['type', 'name', 'sort_name', 'name_key', 'year', 'premiere', 'date_added', 'rating',
    'official_rating', 'runtime_ticks', 'genres', 'tmdb', 'imdb', 'tvdb'];

// 合并一个节点条目。existing = 该 (prefix, item_id) 已有的 agg_sources 行（或 null）。
// 返回估算的 D1 写行数（用于每日写入预算）。
export async function mergeItem(env, prefix, libId, it, existing) {
    if (!TYPES[it.Type] || !it.Id) return 0;
    const sig = sourceSig(libId, it);
    if (existing && existing.sig === sig) return 0;
    const f = itemFields(it);
    let cost = 0;
    let vid = existing ? existing.vid : null;

    if (vid === null) {
        const hit = await findVid(env, f);
        if (hit) {
            vid = hit.vid;
            // 合并进来的副本补上该条目缺的外部 ID，让后来的节点更容易命中。
            const fill = ['tmdb', 'imdb', 'tvdb'].filter(k => f[k] && !hit[k]);
            if (fill.length) {
                await dbRun(env, `UPDATE agg_items SET ${fill.map(k => `${k} = ?`).join(', ')} WHERE vid = ?`, ...fill.map(k => f[k]), vid);
                cost += COST_ITEM_UPDATE;
            }
        } else {
            const row = await dbFirst(env,
                `INSERT INTO agg_items (vid, ${COLS.join(', ')}, owner_prefix, owner_item)
                 VALUES ((SELECT COALESCE(MAX(vid), ${FIRST_VID - 1}) + 1 FROM agg_items), ${COLS.map(() => '?').join(', ')}, ?, ?)
                 RETURNING vid`,
                ...COLS.map(c => f[c]), prefix, String(it.Id));
            vid = row.vid;
            cost += COST_NEW_ITEM;
        }
    } else {
        // 已收录的副本元数据变了：只有它是该作品的「主副本」时才改作品元数据。
        const r = await dbRun(env,
            `UPDATE agg_items SET ${COLS.filter(c => c !== 'type').map(c => `${c} = ?`).join(', ')}
              WHERE vid = ? AND owner_prefix = ? AND owner_item = ?`,
            ...COLS.filter(c => c !== 'type').map(c => f[c]), vid, prefix, String(it.Id));
        if (r && r.meta && r.meta.changes) cost += COST_ITEM_UPDATE;
    }

    await dbRun(env,
        `INSERT INTO agg_sources (prefix, item_id, vid, lib_id, image_tags, sig) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(prefix, item_id) DO UPDATE SET lib_id = excluded.lib_id, image_tags = excluded.image_tags, sig = excluded.sig`,
        prefix, String(it.Id), vid, String(libId), JSON.stringify(imageTags(it)), sig);
    return cost + COST_SOURCE;
}

export async function existingSources(env, prefix, ids) {
    const res = await dbAll(env,
        `SELECT item_id, vid, sig FROM agg_sources WHERE prefix = ? AND item_id IN (SELECT value FROM json_each(?))`,
        prefix, JSON.stringify(ids.map(String)));
    return new Map((res.results || []).map(r => [String(r.item_id), r]));
}

// 删掉某节点已不存在的副本；没有副本的作品一并删除，主副本转给剩下的副本。
export async function removeSources(env, prefix, itemIds) {
    if (!itemIds.length) return 0;
    const ids = JSON.stringify(itemIds.map(String));
    const vids = (await dbAll(env, `SELECT DISTINCT vid FROM agg_sources WHERE prefix = ? AND item_id IN (SELECT value FROM json_each(?))`, prefix, ids)).results || [];
    await dbRun(env, `DELETE FROM agg_sources WHERE prefix = ? AND item_id IN (SELECT value FROM json_each(?))`, prefix, ids);
    const v = JSON.stringify(vids.map(r => r.vid));
    await dbRun(env, `DELETE FROM agg_items WHERE vid IN (SELECT value FROM json_each(?)) AND vid NOT IN (SELECT vid FROM agg_sources)`, v);
    await dbRun(env,
        `UPDATE agg_items SET (owner_prefix, owner_item) = (SELECT s.prefix, s.item_id FROM agg_sources s WHERE s.vid = agg_items.vid LIMIT 1)
          WHERE vid IN (SELECT value FROM json_each(?)) AND NOT EXISTS
                (SELECT 1 FROM agg_sources s WHERE s.vid = agg_items.vid AND s.prefix = agg_items.owner_prefix AND s.item_id = agg_items.owner_item)`, v);
    return itemIds.length * COST_SOURCE + vids.length * COST_ITEM_UPDATE;
}

// 节点退出聚合（关掉 viewers 或被删）：清掉它的全部副本。
export async function forgetPrefix(env, prefix) {
    const ids = ((await dbAll(env, `SELECT item_id FROM agg_sources WHERE prefix = ?`, prefix)).results || []).map(r => r.item_id);
    const cost = await removeSources(env, prefix, ids);
    await dbRun(env, `DELETE FROM agg_sync WHERE prefix = ?`, prefix);
    await dbRun(env, `DELETE FROM agg_sessions WHERE prefix = ?`, prefix);
    return cost;
}

// ---------------------------------------------------------------------------
// 查询（浏览端）
// ---------------------------------------------------------------------------

// scope: { prefixes: [..], hidden: Map(prefix -> Set(libId)), all: bool }
// all = 该 viewer 能看全部成员节点且没有隐藏媒体库 → 免去逐条 EXISTS 检查（省 rows_read）。
function scopeSql(scope) {
    if (scope.all) return { sql: '', binds: [] };
    const parts = []; const binds = [];
    for (const p of scope.prefixes) {
        const hidden = [...(scope.hidden.get(p) || [])];
        parts.push(hidden.length ? `(s.prefix = ? AND s.lib_id NOT IN (SELECT value FROM json_each(?)))` : `s.prefix = ?`);
        binds.push(p); if (hidden.length) binds.push(JSON.stringify(hidden));
    }
    if (!parts.length) return { sql: ' AND 0', binds: [] };
    return { sql: ` AND EXISTS (SELECT 1 FROM agg_sources s WHERE s.vid = i.vid AND (${parts.join(' OR ')}))`, binds };
}

const SORTS = {
    sortname: 'i.sort_name', name: 'i.sort_name', datecreated: 'i.date_added', dateplayed: 'i.date_added',
    premieredate: 'i.premiere', productionyear: 'i.year', communityrating: 'i.rating', officialrating: 'i.official_rating',
    runtime: 'i.runtime_ticks', random: 'RANDOM()',
};

// q: { types[], ids[], search, startsWith, genres[], years[], sortBy, desc, start, limit, count }
export async function queryItems(env, scope, q) {
    const where = ['1']; const binds = [];
    if (q.types && q.types.length) { where.push(`i.type IN (SELECT value FROM json_each(?))`); binds.push(JSON.stringify(q.types)); }
    if (q.ids && q.ids.length) { where.push(`i.vid IN (SELECT value FROM json_each(?))`); binds.push(JSON.stringify(q.ids.map(Number))); }
    if (q.search) { where.push(`i.sort_name LIKE ?`); binds.push('%' + normalizeName(q.search).replace(/[%_]/g, '') + '%'); }
    if (q.startsWith) { where.push(`i.sort_name LIKE ?`); binds.push(normalizeName(q.startsWith).replace(/[%_]/g, '') + '%'); }
    if (q.genres && q.genres.length) {
        where.push('(' + q.genres.map(() => `i.genres LIKE ?`).join(' OR ') + ')');
        binds.push(...q.genres.map(g => '%|' + g.replace(/[%_|]/g, '') + '|%'));
    }
    if (q.years && q.years.length) { where.push(`i.year IN (SELECT value FROM json_each(?))`); binds.push(JSON.stringify(q.years.map(Number))); }
    const sc = scopeSql(scope);
    const base = `FROM agg_items i WHERE ${where.join(' AND ')}${sc.sql}`;
    const allBinds = [...binds, ...sc.binds];
    const order = SORTS[(q.sortBy || 'sortname').toLowerCase()] || SORTS.sortname;
    const dir = q.desc ? 'DESC' : 'ASC';
    const rows = await dbAll(env,
        `SELECT i.* ${base} ORDER BY ${order} ${order === 'RANDOM()' ? '' : dir}, i.vid LIMIT ? OFFSET ?`,
        ...allBinds, Math.min(Math.max(Number(q.limit) || 100, 1), 500), Math.max(Number(q.start) || 0, 0));
    const items = rows.results || [];
    let total = items.length + (Number(q.start) || 0);
    if (q.count !== false) {
        const c = await dbFirst(env, `SELECT COUNT(*) AS n ${base}`, ...allBinds);
        total = Number(c && c.n) || 0;
    }
    return { items, total };
}

// 一批作品对该 viewer 可见的副本，按节点排序（routes.sort_order）。返回 Map(vid -> [source])。
export async function visibleSourcesMany(env, scope, vids) {
    const out = new Map(vids.map(v => [Number(v), []]));
    if (!vids.length) return out;
    const rows = (await dbAll(env,
        `SELECT s.vid, s.prefix, s.item_id, s.lib_id, s.image_tags, COALESCE(r.sort_order, 0) AS ord
           FROM agg_sources s LEFT JOIN routes r ON r.prefix = s.prefix
          WHERE s.vid IN (SELECT value FROM json_each(?)) ORDER BY ord, s.prefix`,
        JSON.stringify(vids.map(Number)))).results || [];
    for (const r of rows) {
        if (!scope.prefixes.includes(r.prefix)) continue;
        if ((scope.hidden.get(r.prefix) || new Set()).has(String(r.lib_id))) continue;
        out.get(Number(r.vid)).push({ ...r, image_tags: safeJson(r.image_tags, {}) });
    }
    return out;
}

export async function visibleSources(env, scope, vid) {
    return (await visibleSourcesMany(env, scope, [vid])).get(Number(vid)) || [];
}

export async function getItemRow(env, vid) {
    return dbFirst(env, `SELECT * FROM agg_items WHERE vid = ?`, Number(vid));
}

export function safeJson(s, fallback) {
    try { return JSON.parse(s); } catch (e) { return fallback; }
}

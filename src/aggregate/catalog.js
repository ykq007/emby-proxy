// 合并目录：多节点的电影 / 剧集按 Tmdb → Imdb → Tvdb 去重成一条 agg_items，
// 每个节点的副本是一条 agg_sources。只收录电影和剧集，不收录剧集的季 / 集
// （D1 免费额度下写不起；季 / 集在播放阶段按需从节点实时取）。
import { dbAll, dbFirst, dbRun, dbStmt, dbBatch } from '../db/helpers.js';

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
// 一个文件（媒体源）的摘要：版本菜单要显示的 Id / 名字 / 容器 / 大小 / 码率，加主视频与默认音频。
// 只留这几项（约 300 字节），不存整份媒体源。
const VIDEO_KEYS = ['Type', 'Codec', 'Profile', 'Width', 'Height', 'BitRate', 'BitDepth', 'VideoRange', 'ExtendedVideoType', 'ExtendedVideoSubType', 'AverageFrameRate', 'Index'];
const AUDIO_KEYS = ['Type', 'Codec', 'Channels', 'ChannelLayout', 'Language', 'DisplayTitle', 'IsDefault', 'Index'];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined && o[k] !== null).map(k => [k, o[k]]));
export function mediaSummary(ms) {
    if (!ms || typeof ms !== 'object') return null;
    const streams = ms.MediaStreams || [];
    const video = streams.find(x => x.Type === 'Video');
    const audio = streams.find(x => x.Type === 'Audio' && x.IsDefault) || streams.find(x => x.Type === 'Audio');
    return {
        ...pick(ms, ['Id', 'Name', 'Container', 'Size', 'Bitrate', 'RunTimeTicks']),
        MediaStreams: [video && pick(video, VIDEO_KEYS), audio && pick(audio, AUDIO_KEYS)].filter(Boolean),
    };
}
// 一份副本的全部文件（一个条目可以有多个媒体源，如 4K 与 1080p）。没有返回 []。
export const mediaList = (it) => (it.MediaSources || []).map(mediaSummary).filter(Boolean);
// 节点原样的媒体源（版本菜单只用它，绝不拿摘要拼）。去掉地址类字段（里面有节点令牌，播放时由节点重新给）
// 与媒体流的节点路径（外挂字幕的文件路径）。
export const realSources = (it) => (Array.isArray(it && it.MediaSources) ? it.MediaSources : [])
    .filter(ms => ms && typeof ms === 'object' && ms.Id)
    .map(({ DirectStreamUrl, TranscodingUrl, ...ms }) => ({
        ...ms, ...(Array.isArray(ms.MediaStreams) ? { MediaStreams: ms.MediaStreams.map(({ DeliveryUrl, Path, ...st }) => st) } : {}),
    }));
// 存的摘要：数组；v4 早期存的是单个对象。
export const asMediaList = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : []);
const mediaOf = (it) => { const l = mediaList(it); return l.length ? l : null; };

export function sourceSig(libId, it) {
    const s = JSON.stringify([libId, itemFields(it), imageTags(it), mediaOf(it)]);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
}

const COLS = ['type', 'name', 'sort_name', 'name_key', 'year', 'premiere', 'date_added', 'rating',
    'official_rating', 'runtime_ticks', 'genres', 'tmdb', 'imdb', 'tvdb'];
const META_COLS = COLS.filter(c => c !== 'type');
const BATCH_STMTS = 100; // 每个 D1 batch 的语句数上限（分块提交，一页约 2–4 个 batch）；一个条目的语句不拆到两个 batch

// 同类型作品里找可合并的那条（规则同以往的逐条 SQL）：有外部 ID 的条目只按外部 ID 合并，
// 绝不按片名合并（同名同年的不同作品很常见）；Tmdb 命中优先于 Imdb，再优先于 Tvdb。
function findMatch(rows, f) {
    if (f.tmdb || f.imdb || f.tvdb) {
        let best = null; let bestRank = -1;
        for (const r of rows) {
            if (r.type !== f.type) continue;
            const t = !!f.tmdb && r.tmdb === f.tmdb, i = !!f.imdb && r.imdb === f.imdb, v = !!f.tvdb && r.tvdb === f.tvdb;
            if (!t && !i && !v) continue;
            const rank = (t ? 2 : 0) + (i ? 1 : 0);
            if (rank > bestRank || (rank === bestRank && r.vid < best.vid)) { best = r; bestRank = rank; }
        }
        return best;
    }
    let best = null;
    for (const r of rows) if (r.type === f.type && r.name_key === f.name_key && (!best || r.vid < best.vid)) best = r;
    return best;
}

// 合并一个节点的一页条目。D1 往返：已有副本 1 次 + 候选作品 1 次 + 最大 vid 1 次 + 写入按 BATCH_STMTS 分块，
// 不再是每条 3–4 次（同步时间几乎全花在这些往返上）。新作品的 vid 在内存里分配：同步有锁，只有它写 agg_items。
// 返回 { cost: 估算的 D1 写行数, merged: 写入的条目数 }。
export async function mergePage(env, prefix, libId, items) {
    const list = items.filter(it => TYPES[it.Type] && it.Id);
    if (!list.length) return { cost: 0, merged: 0 };
    const have = await existingSources(env, prefix, list.map(it => it.Id));
    const work = [];
    for (const it of list) {
        const existing = have.get(String(it.Id)) || null;
        const sig = sourceSig(libId, it);
        if (existing && existing.sig === sig) continue;
        work.push({ it, existing, sig, f: itemFields(it) });
    }
    if (!work.length) return { cost: 0, merged: 0 };

    const fresh = work.filter(w => !w.existing).map(w => w.f);
    const vals = (k) => JSON.stringify([...new Set(fresh.map(f => f[k]).filter(Boolean))]);
    const rows = fresh.length ? ((await dbAll(env,
        `SELECT vid, type, name_key, tmdb, imdb, tvdb FROM agg_items
          WHERE tmdb IN (SELECT value FROM json_each(?)) OR imdb IN (SELECT value FROM json_each(?))
             OR tvdb IN (SELECT value FROM json_each(?)) OR name_key IN (SELECT value FROM json_each(?))`,
        vals('tmdb'), vals('imdb'), vals('tvdb'), vals('name_key'))).results || []) : [];
    let nextVid = fresh.length
        ? Number((await dbFirst(env, `SELECT COALESCE(MAX(vid), ${FIRST_VID - 1}) + 1 AS v FROM agg_items`)).v)
        : 0;

    const units = []; let cost = 0;
    for (const w of work) {
        const { it, f } = w;
        const stmts = []; let ownerUpdate = -1;
        let vid;
        if (w.existing) {
            vid = w.existing.vid;
            // 已收录的副本元数据变了：只有它是该作品的「主副本」时才改作品元数据（是否改到看 changes）。
            ownerUpdate = stmts.length;
            stmts.push(dbStmt(env,
                `UPDATE agg_items SET ${META_COLS.map(c => `${c} = ?`).join(', ')} WHERE vid = ? AND owner_prefix = ? AND owner_item = ?`,
                ...META_COLS.map(c => f[c]), vid, prefix, String(it.Id)));
        } else {
            const hit = findMatch(rows, f);
            if (hit) {
                vid = hit.vid;
                // 合并进来的副本补上该条目缺的外部 ID，让后来的节点更容易命中。
                const fill = ['tmdb', 'imdb', 'tvdb'].filter(k => f[k] && !hit[k]);
                if (fill.length) {
                    stmts.push(dbStmt(env, `UPDATE agg_items SET ${fill.map(k => `${k} = ?`).join(', ')} WHERE vid = ?`, ...fill.map(k => f[k]), vid));
                    for (const k of fill) hit[k] = f[k];
                    cost += COST_ITEM_UPDATE;
                }
            } else {
                vid = nextVid++;
                stmts.push(dbStmt(env,
                    `INSERT INTO agg_items (vid, ${COLS.join(', ')}, owner_prefix, owner_item) VALUES (?, ${COLS.map(() => '?').join(', ')}, ?, ?)`,
                    vid, ...COLS.map(c => f[c]), prefix, String(it.Id)));
                rows.push({ vid, type: f.type, name_key: f.name_key, tmdb: f.tmdb, imdb: f.imdb, tvdb: f.tvdb });
                cost += COST_NEW_ITEM;
            }
        }
        stmts.push(dbStmt(env,
            `INSERT INTO agg_sources (prefix, item_id, vid, lib_id, image_tags, sig, media) VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(prefix, item_id) DO UPDATE SET lib_id = excluded.lib_id, image_tags = excluded.image_tags, sig = excluded.sig,
                media = CASE WHEN excluded.media != '' THEN excluded.media ELSE agg_sources.media END`,
            prefix, String(it.Id), vid, String(libId), JSON.stringify(imageTags(it)), w.sig, mediaOf(it) ? JSON.stringify(mediaOf(it)) : ''));
        cost += COST_SOURCE;
        units.push({ stmts, ownerUpdate });
    }
    // 一个条目的作品行与副本行在同一个 batch（同一事务）里：中途失败不会留下没有副本的作品。
    let chunk = [];
    const flush = async () => {
        if (!chunk.length) return;
        const all = chunk.flatMap(u => u.stmts);
        const res = await dbBatch(env, all);
        let at = 0;
        for (const u of chunk) {
            const r = u.ownerUpdate >= 0 ? res[at + u.ownerUpdate] : null;
            if (r && r.meta && r.meta.changes) cost += COST_ITEM_UPDATE;
            at += u.stmts.length;
        }
        chunk = [];
    };
    let n = 0;
    for (const u of units) {
        if (n + u.stmts.length > BATCH_STMTS) { await flush(); n = 0; }
        chunk.push(u); n += u.stmts.length;
    }
    await flush();
    return { cost, merged: work.length };
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
    for (const t of ['agg_sync', 'agg_sessions', 'agg_device_sessions', 'agg_play_sessions']) {
        await dbRun(env, `DELETE FROM ${t} WHERE prefix = ?`, prefix);
    }
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

// q: { types[], ids[], search, startsWith, genres[], years[], sortBy, desc, start, limit, count, playedOrder }
export async function queryItems(env, scope, q) {
    const where = ['1']; const binds = [];
    if (q.types && q.types.length) { where.push(`i.type IN (SELECT value FROM json_each(?))`); binds.push(JSON.stringify(q.types)); }
    if (q.ids && q.ids.length) { where.push(`i.vid IN (SELECT value FROM json_each(?))`); binds.push(JSON.stringify(q.ids.map(Number))); }
    // 搜名字（name_key 是规整过的片名）和排序名：中文片名的 SortName 是拼音首字母（阳光先生 → ygxs），只搜它就搜不到中文。
    if (q.search) {
        const term = '%' + normalizeName(q.search).replace(/[%_]/g, '') + '%';
        where.push(`(i.name_key LIKE ? OR i.sort_name LIKE ?)`); binds.push(term, term);
    }
    if (q.startsWith) { where.push(`i.sort_name LIKE ?`); binds.push(normalizeName(q.startsWith).replace(/[%_]/g, '') + '%'); }
    if (q.genres && q.genres.length) {
        where.push('(' + q.genres.map(() => `i.genres LIKE ?`).join(' OR ') + ')');
        binds.push(...q.genres.map(g => '%|' + g.replace(/[%_|]/g, '') + '|%'));
    }
    if (q.years && q.years.length) { where.push(`i.year IN (SELECT value FROM json_each(?))`); binds.push(JSON.stringify(q.years.map(Number))); }
    const sc = scopeSql(scope);
    const base = `FROM agg_items i WHERE ${where.join(' AND ')}${sc.sql}`;
    const allBinds = [...binds, ...sc.binds];
    // q.playedOrder：ids 已按该 viewer 最近播放排好（本地观看状态），DatePlayed 照 ids 的顺序排；倒序 = 最近的在前。
    const byIds = q.playedOrder && q.sortBy === 'dateplayed' && q.ids && q.ids.length;
    const order = byIds ? '(SELECT j.key FROM json_each(?) j WHERE j.value = i.vid)' : SORTS[(q.sortBy || 'sortname').toLowerCase()] || SORTS.sortname;
    const dir = byIds ? (q.desc ? 'ASC' : 'DESC') : q.desc ? 'DESC' : 'ASC';
    const rows = await dbAll(env,
        `SELECT i.* ${base} ORDER BY ${order} ${order === 'RANDOM()' ? '' : dir}, i.vid LIMIT ? OFFSET ?`,
        ...allBinds, ...(byIds ? [JSON.stringify(q.ids.map(Number))] : []), Math.min(Math.max(Number(q.limit) || 100, 1), 500), Math.max(Number(q.start) || 0, 0));
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
        `SELECT s.vid, s.prefix, s.item_id, s.lib_id, s.image_tags, s.media, COALESCE(r.sort_order, 0) AS ord
           FROM agg_sources s LEFT JOIN routes r ON r.prefix = s.prefix
          WHERE s.vid IN (SELECT value FROM json_each(?)) ORDER BY ord, s.prefix`,
        JSON.stringify(vids.map(Number)))).results || [];
    for (const r of rows) {
        if (!scope.prefixes.includes(r.prefix)) continue;
        if ((scope.hidden.get(r.prefix) || new Set()).has(String(r.lib_id))) continue;
        out.get(Number(r.vid)).push({ ...r, image_tags: safeJson(r.image_tags, {}), media: asMediaList(safeJson(r.media, null)) });
    }
    return out;
}

// 副本的全部文件：节点的列表接口（同步页、剧集列表）只给默认那个文件，单条详情才有全部。
// 打开作品时向节点问一次详情，把节点原样的媒体源（realSources）存进 agg_media；之后用存下的，过了 FULL_MEDIA_MS 才在后台重问。
export const FULL_MEDIA_MS = 7 * 24 * 60 * 60 * 1000;
export async function loadFullMedia(env, copies) {
    const out = new Map();
    if (!copies.length) return out;
    const keys = copies.map(c => [c.prefix, String(c.item_id)]);
    const rows = (await dbAll(env,
        `SELECT m.prefix, m.item_id, m.media, m.updated_at FROM agg_media m
           JOIN json_each(?) j ON m.prefix = json_extract(j.value, '$[0]') AND m.item_id = json_extract(j.value, '$[1]')`,
        JSON.stringify(keys))).results || [];
    for (const r of rows) { const v = safeJson(r.media, null); out.set(r.prefix + '|' + r.item_id, { sources: Array.isArray(v) ? v : [], at: Number(r.updated_at) || 0 }); }
    return out;
}
export async function saveFullMedia(env, prefix, itemId, sources, now = Date.now()) {
    if (!sources || !sources.length) return;
    await dbRun(env, `INSERT OR REPLACE INTO agg_media (prefix, item_id, media, updated_at) VALUES (?, ?, ?, ?)`,
        prefix, String(itemId), JSON.stringify(sources), now);
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

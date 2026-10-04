// 阶段 3：剧集的季 / 集。目录（D1）只存到「剧集」一级；季和集在用到时从每个有副本的节点实时取，
// 按季号 / 集号合并（A 有 S1–S3、B 有 S4 → viewer 看到 S1–S4），一行不写 D1。
// Id 由编号推出，不存表（vid 从 1001 起，推出的 Id 都 ≥ 1e9，与目录 vid 不重叠）：
//   集 = vid * 1e6 + 季 * 1000 + 集号（季 0–998，集 0–999；超出范围的集不收录）
//   季 = vid * 1e6 + 999000 + 季
// 节点数据按 (节点, 节点上的剧集 Id) 在 isolate 内存里缓存 CACHE_MS；每部剧最多取 MAX_COPIES 个节点，
// 守住每次请求的外部子请求上限（Workers Paid 1000；免费版 50，用免费版时把 MAX_COPIES 调回 3）。
import { dbAll } from '../db/helpers.js';
import { memberRoutes, nodeJson } from './upstream.js';
import { visibleSources, getItemRow, mediaSummary } from './catalog.js';

const M = 1e6;
const SEASON_BASE = 999000;
const DERIVED_MIN = 1e9;
export const CACHE_MS = 5 * 60 * 1000;
export const LATEST_CACHE_MS = 10 * 60 * 1000;
export const MAX_COPIES = 20;
// 一次请求最多展开的剧集数（Next Up / 继续观看）：每部剧至多 MAX_COPIES 个节点请求，12 × 20 = 240 < 1000。
export const MAX_SERIES_PER_REQUEST = 12;
const MEM_MAX = 500;
const MEM = new Map(); // `${kind}|${prefix}|${itemId}` -> { at, items }
const LATEST = new Map(); // prefix -> { at, items }

export function __resetSeriesForTest() { MEM.clear(); LATEST.clear(); INFLIGHT.clear(); }

export function decodeId(id) {
    const n = Number(id);
    if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(n) || n < DERIVED_MIN) return null;
    const vid = Math.floor(n / M), r = n % M;
    if (r >= SEASON_BASE) return { vid, season: r - SEASON_BASE };
    return { vid, season: Math.floor(r / 1000), episode: r % 1000 };
}
export const seasonId = (vid, s) => String(Number(vid) * M + SEASON_BASE + s);
export const episodeId = (vid, s, e) => String(Number(vid) * M + s * 1000 + e);
const okSeason = (s) => Number.isInteger(s) && s >= 0 && s < 999;
const okEpisode = (e) => Number.isInteger(e) && e >= 0 && e < 1000;
const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));

function remember(map, k, items) {
    map.set(k, { at: Date.now(), items });
    if (map.size > MEM_MAX) map.delete(map.keys().next().value);
}

const INFLIGHT = new Map(); // 同一份节点数据的并发请求共用一次上游请求（一屏缩略图同时到达时）

async function nodeList(env, route, kind, itemId, deviceId = '') {
    const k = `${kind}|${route.prefix}|${itemId}`;
    const hit = MEM.get(k);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.items;
    if (INFLIGHT.has(k)) return INFLIGHT.get(k);
    const id = encodeURIComponent(itemId);
    const path = kind === 'seasons'
        ? `/Shows/${id}/Seasons?UserId={uid}&EnableUserData=false&Fields=PremiereDate,Overview`
        : `/Shows/${id}/Episodes?UserId={uid}&EnableUserData=false&Fields=Overview,PremiereDate,DateCreated,MediaSources&EnableImageTypes=Primary,Thumb&ImageTypeLimit=1`;
    const p = nodeJson(env, route, path, { deviceId }).then((r) => {
        if (r.error) return null; // 失败不缓存，下次再试
        const items = (r.data && r.data.Items) || [];
        remember(MEM, k, items);
        return items;
    }).finally(() => INFLIGHT.delete(k));
    INFLIGHT.set(k, p);
    return p;
}

const tagsOf = (it) => ({ ...(it.ImageTags || {}) });

function addCopy(map, key, it, prefix, itemId) {
    let e = map.get(key);
    if (!e) { e = { item: it, copies: [] }; map.set(key, e); }
    if (!e.copies.length && itemId) e.item = it; // 由单集推出的占位季，换成节点上真实的季
    if (itemId) e.copies.push({ prefix, item_id: String(itemId), image_tags: tagsOf(it), media: mediaSummary((it.MediaSources || [])[0]) });
    return e;
}

// 合并一部剧：{ vid, row, tags, seasons: Map(季号 -> {item, copies}), episodes: Map(集 Id -> {s, e, item, copies}) }。
// copies 按节点顺序（routes.sort_order），第一个副本出元数据。
export async function loadSeries(env, scope, vid, { seasons = true } = {}) {
    const row = await getItemRow(env, vid);
    if (!row || row.type !== 'Series') return null;
    const copies = (await visibleSources(env, scope, vid)).slice(0, MAX_COPIES);
    if (!copies.length) return null;
    const routes = new Map((await memberRoutes(env)).map(r => [r.prefix, r]));
    const got = await Promise.all(copies.map(async (c) => {
        const route = routes.get(c.prefix);
        if (!route) return null;
        const [eps, ss] = await Promise.all([
            nodeList(env, route, 'episodes', c.item_id, scope.deviceId),
            seasons ? nodeList(env, route, 'seasons', c.item_id, scope.deviceId) : null,
        ]);
        return { c, eps: eps || [], ss: ss || [] };
    }));
    const S = new Map(); const E = new Map();
    for (const g of got) {
        if (!g) continue;
        for (const it of g.ss) {
            const n = num(it.IndexNumber);
            if (okSeason(n)) addCopy(S, n, it, g.c.prefix, it.Id);
        }
        for (const it of g.eps) {
            const s = num(it.ParentIndexNumber), e = num(it.IndexNumber);
            if (!okSeason(s) || !okEpisode(e)) continue;
            const ent = addCopy(E, episodeId(vid, s, e), it, g.c.prefix, it.Id);
            ent.s = s; ent.e = e;
            if (!S.has(s)) S.set(s, { item: { IndexNumber: s, Name: it.SeasonName || '' }, copies: [] });
        }
    }
    return { vid: Number(vid), row, tags: copies[0].image_tags || {}, seasons: S, episodes: E };
}

function seriesFields(ser) {
    const f = { SeriesId: String(ser.vid), SeriesName: ser.row.name, ParentBackdropItemId: String(ser.vid) };
    if (ser.tags.Primary) f.SeriesPrimaryImageTag = ser.tags.Primary;
    if (ser.tags.Backdrop) f.ParentBackdropImageTags = [ser.tags.Backdrop];
    return f;
}

const emptyUserData = (id) => ({ PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false, Key: String(id) });

export function seasonDto(ser, n, sid) {
    const ent = ser.seasons.get(n);
    const it = ent.item; const id = seasonId(ser.vid, n);
    const tags = (ent.copies[0] || {}).image_tags || {};
    return {
        Name: it.Name || (n === 0 ? 'Specials' : `Season ${n}`), ServerId: sid, Id: id, Type: 'Season', IsFolder: true,
        IndexNumber: n, ParentId: String(ser.vid), ...seriesFields(ser),
        PremiereDate: it.PremiereDate || undefined, ProductionYear: it.ProductionYear || undefined, Overview: it.Overview || undefined,
        ImageTags: tags.Primary ? { Primary: tags.Primary } : {}, BackdropImageTags: [],
        UserData: emptyUserData(id),
    };
}

export function episodeDto(ser, id, sid) {
    const ent = ser.episodes.get(String(id));
    const it = ent.item;
    const season = ser.seasons.get(ent.s);
    return {
        Name: it.Name || `Episode ${ent.e}`, ServerId: sid, Id: String(id), Type: 'Episode', IsFolder: false,
        MediaType: 'Video', LocationType: 'FileSystem', PlayAccess: 'Full',
        ...seriesFields(ser), SeasonId: seasonId(ser.vid, ent.s), ParentId: seasonId(ser.vid, ent.s),
        SeasonName: (season && season.item.Name) || it.SeasonName || undefined,
        ParentIndexNumber: ent.s, IndexNumber: ent.e, IndexNumberEnd: it.IndexNumberEnd || undefined,
        Overview: it.Overview || undefined, PremiereDate: it.PremiereDate || undefined, DateCreated: it.DateCreated || undefined,
        ProductionYear: it.ProductionYear || undefined, RunTimeTicks: it.RunTimeTicks || undefined,
        CommunityRating: it.CommunityRating ?? undefined, OfficialRating: it.OfficialRating || undefined,
        ImageTags: (ent.copies[0] || {}).image_tags || {}, BackdropImageTags: [],
        UserData: emptyUserData(id),
    };
}

export const seasonDtos = (ser, sid) => [...ser.seasons.keys()].sort((a, b) => a - b).map(n => seasonDto(ser, n, sid));

export function episodeDtos(ser, sid, season = null) {
    return [...ser.episodes.entries()]
        .filter(([, e]) => season === null || e.s === season)
        .sort((a, b) => a[1].s - b[1].s || a[1].e - b[1].e)
        .map(([id]) => episodeDto(ser, id, sid));
}

// 推出的季 / 集 Id → DTO；不存在返回 null。
export async function derivedDto(env, scope, id, sid) {
    const d = decodeId(id);
    if (!d) return null;
    const ser = await loadSeries(env, scope, d.vid, { seasons: d.episode === undefined });
    if (!ser) return null;
    if (d.episode === undefined) return ser.seasons.has(d.season) ? seasonDto(ser, d.season, sid) : null;
    return ser.episodes.has(String(id)) ? episodeDto(ser, id, sid) : null;
}

// 任一 Id 在各节点上的副本 [{ prefix, item_id, image_tags }]：电影 / 剧集查目录，季 / 集查合并结果。
export async function copiesOf(env, scope, id) {
    const d = decodeId(id);
    if (!d) return visibleSources(env, scope, id);
    const ser = await loadSeries(env, scope, d.vid, { seasons: d.episode === undefined });
    if (!ser) return [];
    const ent = d.episode === undefined ? ser.seasons.get(d.season) : ser.episodes.get(String(id));
    return ent ? ent.copies : [];
}

// 观看状态首次记录时要的类型 / 剧集信息（watch.js 的 fetchItem）。
export async function watchMeta(env, scope, id) {
    const d = decodeId(id);
    if (!d) {
        const row = await getItemRow(env, id);
        return row ? { Type: row.type, RunTimeTicks: row.runtime_ticks || 0 } : null;
    }
    if (d.episode === undefined) return { Type: 'Season' };
    const ser = await loadSeries(env, scope, d.vid, { seasons: false });
    const ent = ser && ser.episodes.get(String(id));
    return ent ? { Type: 'Episode', SeriesId: String(d.vid), ParentIndexNumber: d.season, IndexNumber: d.episode, RunTimeTicks: ent.item.RunTimeTicks || 0 } : null;
}

// 首页「最新剧集」：每个节点问一次它自己的最新单集（与真实 App 打开时的请求相同），缓存 LATEST_CACHE_MS；
// 单集映射回目录里的剧集，按最新一集的入库时间排序。返回 vid 数组。尚未同步进目录的新剧要等下一轮同步。
export async function latestSeriesVids(env, scope, limit) {
    const routes = (await memberRoutes(env)).filter(r => scope.prefixes.includes(r.prefix));
    const lists = await Promise.all(routes.map(async (route) => {
        const hit = LATEST.get(route.prefix);
        if (hit && Date.now() - hit.at < LATEST_CACHE_MS) return { prefix: route.prefix, items: hit.items };
        const r = await nodeJson(env, route,
            '/Users/{uid}/Items/Latest?IncludeItemTypes=Episode&GroupItems=false&Limit=30&Fields=DateCreated&EnableImages=false&EnableUserData=false');
        if (r.error) return { prefix: route.prefix, items: [] };
        const items = (Array.isArray(r.data) ? r.data : (r.data && r.data.Items) || [])
            .filter(it => it.SeriesId).map(it => ({ series: String(it.SeriesId), at: String(it.DateCreated || '') }));
        remember(LATEST, route.prefix, items);
        return { prefix: route.prefix, items };
    }));
    const pairs = [];
    for (const l of lists) for (const it of l.items) pairs.push([l.prefix, it.series, it.at]);
    if (!pairs.length) return [];
    const rows = (await dbAll(env,
        `SELECT s.prefix, s.item_id, s.vid, s.lib_id FROM agg_sources s
           JOIN (SELECT DISTINCT json_extract(value, '$[0]') AS p, json_extract(value, '$[1]') AS i FROM json_each(?)) j
             ON s.prefix = j.p AND s.item_id = j.i`,
        JSON.stringify(pairs.map(p => [p[0], p[1]])))).results || [];
    const vidOf = new Map();
    for (const r of rows) {
        if ((scope.hidden.get(r.prefix) || new Set()).has(String(r.lib_id))) continue;
        vidOf.set(r.prefix + '\n' + r.item_id, Number(r.vid));
    }
    const best = new Map();
    for (const [prefix, series, at] of pairs) {
        const vid = vidOf.get(prefix + '\n' + series);
        if (vid && (!best.has(vid) || at > best.get(vid))) best.set(vid, at);
    }
    return [...best.entries()].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).slice(0, limit).map(([vid]) => vid);
}

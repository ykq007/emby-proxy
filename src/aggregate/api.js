// 聚合 Worker 对客户端呈现为一台 Emby 服务器。浏览（媒体库、搜索、详情、图片）由 D1 目录作答，
// 详情页从该作品的一个副本节点实时补全；播放见 playback.js；剧集的季 / 集见 series.js。
// 观看状态（进度、已看、收藏、继续观看、Next Up）存 agg_watch_state，与生产 viewer 网关同一套逻辑（watch.js），
// 不写回节点：节点上的共享账号看不到 viewer 的观看记录。
import { extractToken } from '../viewers/gate.js';
import { clientIdentity } from '../viewers/upstream.js';
import { login, resolveToken, revokeToken, serverId } from './auth.js';
import { memberRoutes, nodeJson, nodeRaw, browseSession, nodeFetch } from './upstream.js';
import { queryItems, visibleSources, visibleSourcesMany, getItemRow, realSources, loadFullMedia, saveFullMedia, FULL_MEDIA_MS, LIB_MOVIES, LIB_SERIES } from './catalog.js';
import { CORS, json, empty, param } from './http.js';
import { decodeId, encodeMsid, lazyUrl, parseNodeUrl } from './ids.js';
import { isBrowserUa, BROWSER_BLOCKED_MESSAGE } from '../emby/headers.js';
import { playbackInfo, videoStream, namespaced, lazyStream, rememberCapabilities, playing, byPlaySession, watchSession, rank, playableRanked, MAX_VERSIONS } from './playback.js';
import { loadSeries, seasonDtos, episodeDtos, derivedDto, copiesOf, watchMeta, latestSeriesVids, MAX_SERIES_PER_REQUEST } from './series.js';
import { setUserData, applyUserData, overlayJson, localFilterIds, resumeIds, buildNextUp } from '../viewers/watch.js';

const VERSION = '4.8.0.0';
const unauthorized = () => json({ message: 'Unauthorized' }, 401);
const LIBS = [
    { id: LIB_MOVIES, name: 'Movies', collectionType: 'movies', type: 'Movie' },
    { id: LIB_SERIES, name: 'TV Shows', collectionType: 'tvshows', type: 'Series' },
];

const serverName = (env) => env.AGG_SERVER_NAME || 'Emby Aggregate';

async function readBody(request) {
    const raw = await request.text().catch(() => '');
    try { return JSON.parse(raw); } catch (e) { return Object.fromEntries(new URLSearchParams(raw)); }
}

function publicInfo(env, url, id) {
    return { LocalAddress: url.origin, ServerName: serverName(env), Version: VERSION, ProductName: 'Emby Server', OperatingSystem: '', Id: id, StartupWizardCompleted: true };
}

function userDto(s, sid) {
    return {
        Name: s.username, ServerId: sid, Id: s.viewerId, HasPassword: true, HasConfiguredPassword: true,
        HasConfiguredEasyPassword: false, EnableAutoLogin: false,
        Policy: {
            IsAdministrator: false, IsHidden: false, IsDisabled: false, EnableUserPreferenceAccess: true,
            EnableRemoteAccess: true, EnableMediaPlayback: true, EnableAllFolders: true, EnableContentDeletion: false,
            EnableContentDownloading: false, EnableAllDevices: true, EnablePublicSharing: false,
        },
        Configuration: { PlayDefaultAudioTrack: true, DisplayMissingEpisodes: false, HidePlayedInLatest: true, EnableNextEpisodeAutoPlay: true },
    };
}

const userData = (vid) => ({ PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false, Key: String(vid) });

function libDto(lib, sid) {
    return { Name: lib.name, ServerId: sid, Id: lib.id, Type: 'CollectionFolder', CollectionType: lib.collectionType, IsFolder: true, ImageTags: {}, BackdropImageTags: [] };
}

// 目录行 → BaseItemDto。图片标签取自第一个可见副本。
function itemDto(row, sid, tags) {
    const t = tags || {};
    const { Backdrop, ...primary } = t;
    const dto = {
        Name: row.name, ServerId: sid, Id: String(row.vid), Type: row.type, IsFolder: row.type === 'Series',
        ParentId: row.type === 'Series' ? LIB_SERIES : LIB_MOVIES,
        SortName: row.sort_name, ProductionYear: row.year || undefined, PremiereDate: row.premiere || undefined,
        DateCreated: row.date_added || undefined, CommunityRating: row.rating ?? undefined, OfficialRating: row.official_rating || undefined,
        RunTimeTicks: row.runtime_ticks || undefined,
        Genres: row.genres ? row.genres.split('|').filter(Boolean) : [],
        ProviderIds: Object.fromEntries([['Tmdb', row.tmdb], ['Imdb', row.imdb], ['Tvdb', row.tvdb]].filter(([, v]) => v)),
        ImageTags: primary, BackdropImageTags: Backdrop ? [Backdrop] : [],
        UserData: userData(row.vid),
    };
    if (row.type === 'Movie') { dto.MediaType = 'Video'; dto.PlayAccess = 'Full'; dto.LocationType = 'FileSystem'; }
    return dto;
}

// 一页目录行配上各自第一个可见副本的图片标签。
async function withTags(env, s, rows) {
    const byVid = await visibleSourcesMany(env, s.scope, rows.map(r => r.vid));
    return rows.map(row => {
        const src = (byVid.get(Number(row.vid)) || [])[0];
        return { row, tags: src ? src.image_tags : {} };
    });
}

const csv = (v) => String(v || '').split(/[,|]/).map(x => x.trim()).filter(Boolean);

// /Items 查询参数 → catalog.queryItems 的条件。返回 null 表示该查询必然为空。
function itemsQueryFrom(params) {
    const lower = (k) => { for (const [kk, v] of params) if (kk.toLowerCase() === k) return v; return null; };
    let types = csv(lower('includeitemtypes')).filter(t => t === 'Movie' || t === 'Series');
    if (lower('includeitemtypes') && !types.length) return null;
    const parent = lower('parentid');
    if (parent) {
        const lib = LIBS.find(l => l.id === parent);
        if (!lib) return null; // 剧集 / 季下的子项由 childrenResponse 处理
        types = types.length ? types.filter(t => t === lib.type) : [lib.type];
        if (!types.length) return null;
    }
    const sortBy = csv(lower('sortby'))[0] || 'SortName';
    return {
        types, ids: csv(lower('ids')).filter(x => /^\d+$/.test(x)),
        search: lower('searchterm') || '', startsWith: lower('namestartswith') || '',
        genres: csv(lower('genres')), years: csv(lower('years')).filter(x => /^\d+$/.test(x)),
        sortBy: sortBy.toLowerCase(), desc: /^desc/i.test(csv(lower('sortorder'))[0] || ''),
        start: Number(lower('startindex')) || 0, limit: Number(lower('limit')) || 100,
        count: lower('enabletotalrecordcount') !== 'false',
    };
}

// 带观看状态的 JSON 响应。
const withWatch = async (env, s, data) => json(await overlayJson(env, watchSession(s), data));

// 一组 Id（目录 vid 与推出的季 / 集 Id 混合）→ DTO，保持顺序，找不到的丢掉。
async function dtosFor(env, s, sid, ids) {
    const plain = ids.filter(id => !decodeId(id));
    const byId = new Map();
    if (plain.length) {
        const { items } = await queryItems(env, s.scope, { ids: plain, limit: plain.length, count: false });
        for (const { row, tags } of await withTags(env, s, items)) byId.set(String(row.vid), itemDto(row, sid, tags));
    }
    const series = new Set();
    for (const id of ids.filter(id => decodeId(id))) {
        const v = decodeId(id).vid;
        if (!series.has(v) && series.size >= MAX_SERIES_PER_REQUEST) continue; // ponytail: 超出的剧这次不展示
        series.add(v);
        const dto = await derivedDto(env, s.scope, id, sid);
        if (dto) byId.set(String(id), dto);
    }
    return ids.map(id => byId.get(String(id))).filter(Boolean);
}

const page = (list, params) => {
    const start = Math.max(0, Number(param(params, 'StartIndex')) || 0);
    const limit = Number(param(params, 'Limit')) || list.length;
    return { Items: list.slice(start, start + limit), TotalRecordCount: list.length };
};

// /Items?ParentId=<剧集 vid> → 季；ParentId=<季 Id> → 该季的集。
async function childrenResponse(env, s, sid, parent, params) {
    const d = decodeId(parent);
    if (d && d.episode !== undefined) return json({ Items: [], TotalRecordCount: 0 });
    const ser = await loadSeries(env, s.scope, d ? d.vid : parent, { seasons: !d });
    if (!ser) return json({ Items: [], TotalRecordCount: 0 });
    const types = csv(param(params, 'IncludeItemTypes'));
    const list = !d && !types.includes('Episode') ? seasonDtos(ser, sid) : episodeDtos(ser, sid, d ? d.season : null);
    return withWatch(env, s, page(list, params));
}

// /Shows/{vid}/Seasons、/Shows/{vid}/Episodes（SeasonId / Season / StartItemId / StartIndex / Limit）
async function showsResponse(env, s, sid, vid, kind, params) {
    const seasons = kind.toLowerCase() === 'seasons';
    const ser = await loadSeries(env, s.scope, vid, { seasons: true });
    if (!ser) return json({ Items: [], TotalRecordCount: 0 });
    if (seasons) return withWatch(env, s, page(seasonDtos(ser, sid), params));
    const sd = decodeId(param(params, 'SeasonId') || '');
    const sn = param(params, 'Season');
    const season = sd && sd.episode === undefined ? sd.season : (sn !== null && /^\d+$/.test(sn) ? Number(sn) : null);
    let list = episodeDtos(ser, sid, season);
    const startItem = param(params, 'StartItemId');
    if (startItem) { const i = list.findIndex(e => e.Id === startItem); if (i > 0) list = list.slice(i); }
    return withWatch(env, s, page(list, params));
}

async function itemsResponse(env, s, sid, searchParams) {
    const params = new URLSearchParams(searchParams);
    const parent = param(params, 'ParentId');
    if (parent && !LIBS.some(l => l.id === parent)) return childrenResponse(env, s, sid, parent, params);
    // 收藏 / 已看 / 可续播 由本地观看状态给出 Id（只限目录里的电影 / 剧集）。
    const local = await localFilterIds(env, watchSession(s), params);
    if (local) {
        const ids = local.filter(id => !decodeId(id));
        if (!ids.length) return json({ Items: [], TotalRecordCount: 0 });
        params.set('Ids', ids.join(','));
    }
    const q = itemsQueryFrom(params);
    if (!q) return json({ Items: [], TotalRecordCount: 0 });
    if (local) q.playedOrder = true; // 观看历史（SortBy=DatePlayed）按该 viewer 的播放时间排
    const { items, total } = await queryItems(env, s.scope, q);
    const tagged = await withTags(env, s, items);
    return withWatch(env, s, { Items: tagged.map(({ row, tags }) => itemDto(row, sid, tags)), TotalRecordCount: total });
}

// 观看状态写（PlayedItems / FavoriteItems / UserData / HideFromResume）：只写本地。
// 观看状态写：本地为准；同时照代理那样转给一个节点（后台，不等结果）——该片的副本里，该设备已有会话的第一个节点。
// 不为此登录；设备在这些节点都没有会话就不转。build(sess, 节点条目 Id) → { path, method, body }。
async function userDataWrite(env, ctx, request, s, id, flags, build) {
    const row = await setUserData(env, watchSession(s), id, flags, (x) => watchMeta(env, s.scope, x));
    if (build) {
        const p = (async () => {
            for (const c of await rank(env, await copiesOf(env, s.scope, id))) {
                const sess = await browseSession(env, c.route, s.deviceId);
                if (!sess) continue;
                const { path, method, body } = build(sess, encodeURIComponent(c.src.item_id));
                const r = await nodeFetch(env, c.route, sess, path, { request, token: s.token, method, body, headers: body ? { 'Content-Type': 'application/json' } : {} });
                r?.body?.cancel().catch(() => {});
                return;
            }
        })().catch(e => console.log('agg user data forward failed:', e && e.message || e));
        if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
    }
    return json(applyUserData(userData(id), row));
}

// 副本在节点上的实时详情：用该设备在节点上已有的会话（和用代理浏览时一样），没有才用同步会话；取不到返回 null。
// 成功的结果在本 isolate 记 5 分钟。
const LIVE = new Map(); const LIVE_MS = 5 * 60 * 1000; const LIVE_MAX = 500;
async function liveItem(env, src, deviceId = '') {
    const k = src.prefix + '|' + src.item_id;
    const hit = LIVE.get(k);
    if (hit && Date.now() - hit.at < LIVE_MS) return hit.data;
    const route = (await memberRoutes(env)).find(r => r.prefix === src.prefix);
    const live = route ? await nodeJson(env, route, `/Users/{uid}/Items/${encodeURIComponent(src.item_id)}`, { timeoutMs: 8000, deviceId }) : null;
    const data = (live && live.data) || null;
    if (data) { LIVE.set(k, { at: Date.now(), data }); if (LIVE.size > LIVE_MAX) LIVE.delete(LIVE.keys().next().value); }
    return data;
}
export function __resetLiveForTest() { LIVE.clear(); }

const baseName = (x) => String(x || '').split(/[\\/]/).pop() || undefined;

// 版本菜单（详情与 PlaybackInfo 共用）：每份副本的每个文件一项（同一节点的多个文件、多份副本都列），按节点排序，
// 最多 MAX_VERSIONS 项；该设备起不了播的满节点不列。每一项都是节点原样的媒体源（c.src.sources：第一份副本的实时详情、
// agg_media 里存的、剧集列表带回的），只改 Id / ItemId / 名字；还没问到媒体源的副本这次不列，绝不拿摘要拼一个。
// 版本 Id = `<前缀>~<该文件的媒体源 Id>`。
function menuEntries(ranked, firstList) {
    const out = [];
    ranked.forEach((c, i) => {
        for (const ms of (i === 0 && firstList ? firstList : (c.src.sources || []))) out.push({ c, ms });
    });
    return out.slice(0, MAX_VERSIONS);
}
const versionName = (e, label) => (label ? [e.c.name, e.ms.Name].filter(Boolean).join(' · ') : e.ms.Name || e.c.name);
// 节点的媒体源 → 菜单里的版本：节点上的目录路径只留文件名。
const versionSource = (e, id, label) =>
    ({ ...e.ms, Id: encodeMsid(e.c.src.prefix, e.ms.Id), ItemId: String(id), Path: baseName(e.ms.Path), ...(label ? { Name: versionName(e, true) } : {}) });

// 菜单里各副本的全部文件：先用 agg_media 里存的；没有的（或存得太久的）向节点问一次详情
// （各等至多 MEDIA_WAIT_MS），存下来，这份副本以后不再问。迟到的答复也在后台存下。first：第一份副本已取到的详情。
// 节点的列表接口只给默认文件，所以剧集列表带回的媒体源只当没问到详情之前的那一个。
const MEDIA_WAIT_MS = 1500;
async function useFullMedia(env, copies) {
    const stored = await loadFullMedia(env, copies.map(c => c.src));
    for (const c of copies) { const h = stored.get(c.src.prefix + '|' + c.src.item_id); if (h && h.sources.length) c.src.sources = h.sources; }
    return stored;
}
async function fillMedia(env, ctx, s, copies, first) {
    const now = Date.now();
    const stored = await useFullMedia(env, copies);
    const late = () => new Promise(r => setTimeout(() => r(null), MEDIA_WAIT_MS));
    await Promise.all(copies.map((c, i) => {
        const h = stored.get(c.src.prefix + '|' + c.src.item_id);
        if (h && now - h.at < FULL_MEDIA_MS) return null;
        const p = (i === 0 && first ? Promise.resolve(first) : liveItem(env, c.src, s.deviceId)).then(async (d) => {
            const sources = realSources(d);
            if (sources.length) { c.src.sources = sources; await saveFullMedia(env, c.src.prefix, c.src.item_id, sources); }
        }).catch(() => {});
        if (ctx && ctx.waitUntil) ctx.waitUntil(p);
        return h ? null : Promise.race([p, late()]); // 有旧的就先用旧的，后台更新
    }));
}

// 详情：第一个版本节点的实时详情做底，目录字段覆盖。真 Emby 详情的字段（Etag、Path、人物 / 工作室的 Id、Chapters…）
// 一个不少：SenPlayer 这类严格解析的客户端缺一个就报「媒体库中不存在」。
// 不外传的：节点上的目录路径（Path 只留文件名）、父级 Id 与父级图片标签（客户端拿着它们来取图会取错）、人物图。
async function detailWithMenu(env, ctx, s, dto, id, ranked, playable) {
    const first = ranked[0];
    const d = first ? await liveItem(env, first.src, s.deviceId) : null;
    if (playable && d) await fillMedia(env, ctx, s, ranked.slice(0, MAX_VERSIONS), d);
    if (!d) return { ...dto, CanDelete: false, CanDownload: false };
    const out = {};
    for (const [k, v] of Object.entries(d)) if (!/^Parent\w*(ItemId|ImageTags?)$/.test(k)) out[k] = v;
    for (const [k, v] of Object.entries(dto)) if (v !== undefined) out[k] = v;
    out.Path = d.FileName || baseName(d.Path);
    if (Array.isArray(d.People)) out.People = d.People.map(({ PrimaryImageTag, ...p }) => p);
    if (playable && Array.isArray(d.MediaSources)) {
        const entries = menuEntries(ranked, realSources(d));
        const label = entries.length > 1;
        out.MediaSources = entries.map(e => versionSource(e, id, label));
    }
    out.CanDelete = false; out.CanDownload = false;
    return out;
}

async function itemDetail(env, ctx, request, url, s, sid, vid) {
    const row = await getItemRow(env, vid);
    if (!row) return null;
    const sources = await visibleSources(env, s.scope, vid);
    if (!sources.length) return null;
    const dto = itemDto(row, sid, sources[0].image_tags);
    const movie = row.type === 'Movie';
    return detailWithMenu(env, ctx, s, dto, vid, movie ? await playableRanked(env, s, request, url, sources) : await rank(env, sources.slice(0, 1)), movie);
}

// 推出的集 Id 的详情：合并结果 + 第一个版本节点的实时详情。
async function episodeDetail(env, ctx, request, url, s, sid, id) {
    const dto = await derivedDto(env, s.scope, id, sid);
    if (!dto || dto.Type !== 'Episode') return dto;
    const out = await detailWithMenu(env, ctx, s, dto, id, await playableRanked(env, s, request, url, await copiesOf(env, s.scope, id)), true);
    return out.MediaSources ? out : dto;
}

// PlaybackInfo 的媒体源：问过的那个节点（它这次的回答）在前，版本菜单里的其它文件跟在后面，Id 与菜单相同：
// Hills 不把选中的版本告诉服务器，而是在这份列表里按 Id 找，找不到就播第一个。
// 其它文件是各节点原样的媒体源，这时不问节点，只给直连地址（/n/…/ea-play/<条目>/<媒体源>/…）：
// 真播它时才向那一个节点要 PlaybackInfo（见 playback.js 的 lazyStream），不能转码。
async function playbackInfoWithVersions(env, ctx, request, url, s, id) {
    const r = await playbackInfo(env, request, url, s, id);
    if (!r.ok) return r;
    const data = await r.json();
    if (!Array.isArray(data.MediaSources) || !data.MediaSources.length) return json(data);
    const have = new Set(data.MediaSources.map(m => String(m.Id)));
    const copies = decodeId(id) ? await copiesOf(env, s.scope, id) : await visibleSources(env, s.scope, id);
    const ranked = (await playableRanked(env, s, request, url, copies)).filter(c => !c.bad);
    await useFullMedia(env, ranked);
    const entries = menuEntries(ranked);
    if (entries.length > 1) {
        for (const e of entries) {
            const { Path, ...v } = versionSource(e, id, true); // 与问过的那个节点的版本一样，不带 Path
            if (have.has(v.Id)) continue;
            have.add(v.Id);
            data.MediaSources.push({ ...v, SupportsTranscoding: false, SupportsDirectStream: true, DirectStreamUrl: lazyUrl(e.c.src.prefix, e.c.src.item_id, e.ms.Id, s.token) });
        }
    }
    return json(data);
}

// /Items/{vid}/Images/{type}[/{index}]：取有该图的可见副本；客户端带的 tag 优先匹配同一副本，缓存才稳定。
async function image(env, ctx, request, s, vid, type, index, url) {
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    if (cache) { const hit = await cache.match(cacheKey); if (hit) return hit; }
    const tag = url.searchParams.get('tag') || url.searchParams.get('Tag') || '';
    const sources = (await copiesOf(env, s ? s.scope : { prefixes: (await memberRoutes(env)).map(r => r.prefix), hidden: new Map() }, vid))
        .filter(src => src.image_tags[type]);
    const src = sources.find(x => x.image_tags[type] === tag) || sources[0];
    if (!src) return empty(404);
    const route = (await memberRoutes(env)).find(r => r.prefix === src.prefix);
    const q = new URLSearchParams();
    for (const k of ['maxWidth', 'maxHeight', 'width', 'height', 'quality', 'fillWidth', 'fillHeight', 'format']) {
        const v = url.searchParams.get(k); if (v) q.set(k, v);
    }
    q.set('tag', src.image_tags[type]);
    const r = route && await nodeRaw(env, route, `/Items/${encodeURIComponent(src.item_id)}/Images/${type}${index ? '/' + index : ''}?${q}`, s ? s.deviceId : '');
    if (!r) return empty(404);
    const headers = new Headers(CORS);
    headers.set('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=2592000');
    const resp = new Response(r.body, { status: 200, headers });
    if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
}

const E = '^\\/(?:emby\\/|mediabrowser\\/)?';
const re = (s) => new RegExp(E + s + '\\/?$', 'i');
const R = {
    publicInfo: re('System\\/Info\\/Public'),
    ping: re('System\\/Ping'),
    usersPublic: re('Users\\/Public'),
    login: re('Users\\/AuthenticateByName'),
    branding: re('Branding\\/(Configuration|Css(?:\\.css)?)'),
    image: re('Items\\/(\\d+)\\/Images\\/(\\w+)(?:\\/(\\d+))?'),
    sysInfo: re('System\\/Info'),
    endpoint: re('System\\/Endpoint'),
    logout: re('Sessions\\/Logout'),
    capabilities: re('Sessions\\/Capabilities(?:\\/Full)?'),
    sessions: re('Sessions'),
    playing: re('Sessions\\/Playing(?:\\/(Progress|Stopped))?'),
    playPing: re('Sessions\\/Playing\\/Ping'),
    activeEncodings: re('Videos\\/ActiveEncodings'),
    stream: new RegExp(E + 'Videos\\/(\\d+)\\/(.+)$', 'i'),
    displayPrefs: re('DisplayPreferences\\/[^/]+'),
    user: re('Users\\/([^/]+)'),
    views: re('(?:Users\\/[^/]+\\/Views|Library\\/MediaFolders|Library\\/VirtualFolders)'),
    latest: re('Users\\/[^/]+\\/Items\\/Latest'),
    resume: re('(?:Users\\/[^/]+\\/)?Items\\/Resume'),
    nextUp: re('Shows\\/NextUp'),
    seasons: re('Shows\\/(\\d+)\\/(Seasons|Episodes)'),
    item: re('(?:Users\\/[^/]+\\/)?Items\\/(\\d+)'),
    items: re('(?:Users\\/[^/]+\\/)?Items'),
    playbackInfo: re('Items\\/(\\d+)\\/PlaybackInfo'),
    counts: re('Items\\/Counts'),
    genres: re('(?:Genres|Studios|Persons|Artists|Years)'),
    userData: re('Users\\/[^/]+\\/(PlayedItems|FavoriteItems)\\/(\\d+)(\\/Delete)?'),
    itemUserData: re('Users\\/[^/]+\\/Items\\/(\\d+)\\/UserData'),
    hideFromResume: re('Users\\/[^/]+\\/Items\\/(\\d+)\\/HideFromResume'),
};

export async function handleAggRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === 'OPTIONS') return empty(204);
    if (path === '/' || path === '') return new Response(`${serverName(env)}: add this address as a server in your Emby app.`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if ((request.headers.get('Upgrade') || '').toLowerCase() === 'websocket') return empty(400);

    const sid = await serverId(env);
    let m;

    // ── 无需登录 ──────────────────────────────────────────
    if (R.publicInfo.test(path)) return json(publicInfo(env, url, sid));
    if (R.ping.test(path)) return new Response('Emby Server', { headers: CORS });
    if (R.usersPublic.test(path)) return json([]);
    if ((m = R.branding.exec(path))) return m[1].toLowerCase() === 'configuration' ? json({ LoginDisclaimer: '', CustomCss: '' }) : new Response('', { headers: { ...CORS, 'content-type': 'text/css' } });
    if (method === 'POST' && R.login.test(path)) {
        const ident = clientIdentity(request, url);
        const res = await login(env, request, await readBody(request), ident);
        if (!res.token) return res.response || unauthorized();
        const s = { viewerId: res.viewer.id, username: res.viewer.username };
        return json({
            User: userDto(s, sid), AccessToken: res.token, ServerId: sid,
            SessionInfo: { UserId: s.viewerId, UserName: s.username, ServerId: sid, Id: res.token.slice(-16), DeviceId: ident.deviceId, DeviceName: ident.device, Client: ident.client, ApplicationVersion: ident.version, SupportsRemoteControl: false, PlayableMediaTypes: [], SupportedCommands: [] },
        });
    }
    // 图片不带令牌也给（Emby 原生如此；多数客户端的 <img> 不带令牌），但只给成员节点的副本。
    if (method === 'GET' && (m = R.image.exec(path))) {
        const token = extractToken(request, url);
        const s = token ? await resolveToken(env, token) : null;
        return image(env, ctx, request, s, m[1], m[2], m[3], url);
    }

    // ── 需要登录 ──────────────────────────────────────────
    const token = extractToken(request, url);
    const s = await resolveToken(env, token);
    if (!s) return unauthorized();
    // viewer 不许用浏览器观看（与生产 viewer 网关一致）。
    if (isBrowserUa(request.headers.get('User-Agent'))) return json({ message: BROWSER_BLOCKED_MESSAGE }, 403);

    if (R.sysInfo.test(path)) return json({ ...publicInfo(env, url, sid), HasPendingRestart: false, IsShuttingDown: false, CanSelfRestart: false, CanSelfUpdate: false, HasUpdateAvailable: false, SupportsLibraryMonitor: false, WebSocketPortNumber: 0 });
    if (R.endpoint.test(path)) return json({ IsLocal: false, IsInNetwork: false });
    if (method === 'POST' && R.logout.test(path)) { await revokeToken(env, s.token); return empty(); }
    if (method === 'POST' && R.capabilities.test(path)) {
        rememberCapabilities(s, request, url, path.replace(/^\/(?:emby|mediabrowser)(?=\/)/i, ''), await request.text().catch(() => ''));
        return empty();
    }

    // ── 播放 ──────────────────────────────────────────────
    const node = parseNodeUrl(path);
    if (node) return node.lazy ? lazyStream(env, request, url, s, node.prefix, node.lazy.itemId, node.lazy.msid) : namespaced(env, request, url, s, node.prefix, node.rest);
    if ((m = R.playbackInfo.exec(path)) && (method === 'GET' || method === 'POST')) return playbackInfoWithVersions(env, ctx, request, url, s, m[1]);
    if (method === 'POST' && R.playPing.test(path)) return byPlaySession(env, request, url, s, '/Sessions/Playing/Ping');
    if (method === 'POST' && (m = R.playing.exec(path))) return playing(env, request, url, s, (m[1] || 'playing').toLowerCase());
    if (method === 'DELETE' && R.activeEncodings.test(path)) return byPlaySession(env, request, url, s, '/Videos/ActiveEncodings');
    if ((method === 'GET' || method === 'HEAD') && (m = R.stream.exec(path))) return videoStream(env, request, url, s, m[1], m[2]);

    if (method === 'GET' && R.sessions.test(path)) return json([]);
    if (R.displayPrefs.test(path)) {
        return method === 'GET' ? json({ Id: path.split('/').pop(), SortBy: 'SortName', SortOrder: 'Ascending', RememberIndexing: false, RememberSorting: false, CustomPrefs: {}, Client: url.searchParams.get('client') || 'emby' }) : empty();
    }
    if ((method === 'POST' || method === 'DELETE') && (m = R.userData.exec(path))) {
        const on = method === 'POST' && !m[3];
        return userDataWrite(env, ctx, request, s, m[2], m[1].toLowerCase() === 'playeditems' ? { played: on } : { favorite: on },
            (sess, item) => ({ path: `/Users/${sess.userId}/${m[1]}/${item}${m[3] || ''}`, method }));
    }
    if (method === 'POST' && (m = R.hideFromResume.exec(path))) {
        const hide = (param(url.searchParams, 'Hide') ?? 'true').toLowerCase() !== 'false';
        return userDataWrite(env, ctx, request, s, m[1], { resumeHidden: hide },
            (sess, item) => ({ path: `/Users/${sess.userId}/Items/${item}/HideFromResume?Hide=${hide}`, method: 'POST' }));
    }
    if (method === 'POST' && (m = R.itemUserData.exec(path))) {
        const b = await readBody(request); const flags = {};
        if (b.Played !== undefined) flags.played = !!b.Played;
        if (b.IsFavorite !== undefined) flags.favorite = !!b.IsFavorite;
        if (b.PlaybackPositionTicks !== undefined) flags.position = b.PlaybackPositionTicks;
        const { ItemId, Key, ...fwd } = b; // 里面的 Id 是聚合端的
        return userDataWrite(env, ctx, request, s, m[1], flags,
            (sess, item) => ({ path: `/Users/${sess.userId}/Items/${item}/UserData`, method: 'POST', body: JSON.stringify(fwd) }));
    }
    if (method !== 'GET') return json({ message: 'Not supported by the aggregate server' }, 405);

    if (R.views.test(path)) {
        const items = LIBS.map(l => libDto(l, sid));
        return json({ Items: items, TotalRecordCount: items.length });
    }
    if (R.latest.test(path)) {
        const params = new URLSearchParams(url.search);
        const limit = Math.min(Number(url.searchParams.get('Limit')) || 16, 50);
        // 剧集库：按各节点最新单集排序（新一集一入库就靠前），不足的用目录里最近入库的剧补齐。
        if (param(params, 'ParentId') === LIB_SERIES) {
            const fresh = await latestSeriesVids(env, s.scope, limit);
            const { items } = await queryItems(env, s.scope, { types: ['Series'], sortBy: 'datecreated', desc: true, limit, count: false });
            const ids = [...new Set([...fresh.map(String), ...items.map(r => String(r.vid))])].slice(0, limit);
            return withWatch(env, s, await dtosFor(env, s, sid, ids));
        }
        params.set('SortBy', 'DateCreated'); params.set('SortOrder', 'Descending');
        params.set('Limit', String(limit));
        params.set('EnableTotalRecordCount', 'false');
        const q = itemsQueryFrom(params);
        if (!q) return json([]);
        const { items } = await queryItems(env, s.scope, q);
        return withWatch(env, s, (await withTags(env, s, items)).map(({ row, tags }) => itemDto(row, sid, tags)));
    }
    if (R.resume.test(path)) {
        const { ids, total } = await resumeIds(env, watchSession(s), url.searchParams);
        return withWatch(env, s, { Items: await dtosFor(env, s, sid, ids), TotalRecordCount: total });
    }
    if (R.nextUp.test(path)) {
        const data = await buildNextUp(env, watchSession(s), url.searchParams, async (vid) => {
            const ser = await loadSeries(env, s.scope, vid, { seasons: false });
            return ser ? episodeDtos(ser, sid) : [];
        });
        return withWatch(env, s, data);
    }
    if ((m = R.seasons.exec(path))) return showsResponse(env, s, sid, m[1], m[2], url.searchParams);
    if (R.genres.test(path)) return json({ Items: [], TotalRecordCount: 0 });
    if (R.counts.test(path)) {
        const [mv, sr] = await Promise.all(['Movie', 'Series'].map(t => queryItems(env, s.scope, { types: [t], limit: 1 })));
        return json({ MovieCount: mv.total, SeriesCount: sr.total, EpisodeCount: 0, ItemCount: mv.total + sr.total });
    }
    if ((m = R.item.exec(path))) {
        const lib = LIBS.find(l => l.id === m[1]);
        if (lib) return json(libDto(lib, sid));
        const dto = decodeId(m[1]) ? await episodeDetail(env, ctx, request, url, s, sid, m[1]) : await itemDetail(env, ctx, request, url, s, sid, m[1]);
        return dto ? withWatch(env, s, dto) : json({ message: 'Not found' }, 404);
    }
    if (R.items.test(path)) return itemsResponse(env, s, sid, url.searchParams);
    if ((m = R.user.exec(path))) return json(userDto(s, sid));
    return json({ message: 'Not found' }, 404);
}

// 聚合 Worker 对客户端呈现为一台 Emby 服务器。浏览（媒体库、搜索、详情、图片）由 D1 目录作答，
// 详情页从该作品的一个副本节点实时补全；播放见 playback.js；剧集的季 / 集见 series.js。
// 观看状态（进度、已看、收藏、继续观看、Next Up）存 agg_watch_state，与生产 viewer 网关同一套逻辑（watch.js），
// 不写回节点：节点上的共享账号看不到 viewer 的观看记录。
import { extractToken } from '../viewers/gate.js';
import { clientIdentity } from '../viewers/upstream.js';
import { login, resolveToken, revokeToken, serverId } from './auth.js';
import { memberRoutes, nodeJson, nodeRaw } from './upstream.js';
import { queryItems, visibleSources, visibleSourcesMany, getItemRow, LIB_MOVIES, LIB_SERIES } from './catalog.js';
import { CORS, json, empty, param } from './http.js';
import { isBrowserUa, BROWSER_BLOCKED_MESSAGE } from '../emby/headers.js';
import { playbackInfo, videoStream, namespaced, playing, byPlaySession, watchSession } from './playback.js';
import { decodeId, loadSeries, seasonDtos, episodeDtos, derivedDto, copiesOf, watchMeta, latestSeriesVids, MAX_SERIES_PER_REQUEST } from './series.js';
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
    const { items, total } = await queryItems(env, s.scope, q);
    const tagged = await withTags(env, s, items);
    return withWatch(env, s, { Items: tagged.map(({ row, tags }) => itemDto(row, sid, tags)), TotalRecordCount: total });
}

// 观看状态写（PlayedItems / FavoriteItems / UserData / HideFromResume）：只写本地。
async function userDataWrite(env, s, id, flags) {
    const row = await setUserData(env, watchSession(s), id, flags, (x) => watchMeta(env, s.scope, x));
    return json(applyUserData(userData(id), row));
}

// 详情：目录行 + 第一个可见副本的实时详情（简介、演职员名、媒体流信息）。
// 节点专属的 Id（人物、工作室、类型、媒体源）一律去掉，避免客户端拿着它们回来找不到。
async function itemDetail(env, s, sid, vid) {
    const row = await getItemRow(env, vid);
    if (!row) return null;
    const sources = await visibleSources(env, s.scope, vid);
    if (!sources.length) return null;
    const dto = itemDto(row, sid, sources[0].image_tags);
    const route = (await memberRoutes(env)).find(r => r.prefix === sources[0].prefix);
    const live = route ? await nodeJson(env, route, `/Users/{uid}/Items/${encodeURIComponent(sources[0].item_id)}`) : null;
    const d = live && live.data;
    if (d) {
        for (const k of ['Overview', 'Taglines', 'Tags', 'CriticRating', 'EndDate', 'Status', 'AirDays', 'AirTime', 'ProductionLocations', 'MediaStreams', 'Width', 'Height']) {
            if (d[k] !== undefined) dto[k] = d[k];
        }
        if (Array.isArray(d.People)) dto.People = d.People.map(p => ({ Name: p.Name, Role: p.Role, Type: p.Type }));
        if (Array.isArray(d.Studios)) dto.Studios = d.Studios.map(x => ({ Name: x.Name }));
    }
    dto.CanDelete = false; dto.CanDownload = false;
    return dto;
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
    const r = route && await nodeRaw(env, route, `/Items/${encodeURIComponent(src.item_id)}/Images/${type}${index ? '/' + index : ''}?${q}`);
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
    ns: /^\/n\/([^/]+)(\/.*)$/,
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
    if (method === 'POST' && R.capabilities.test(path)) return empty();

    // ── 播放 ──────────────────────────────────────────────
    if ((m = R.ns.exec(path))) return namespaced(env, request, url, s, decodeURIComponent(m[1]), m[2]);
    if ((m = R.playbackInfo.exec(path)) && (method === 'GET' || method === 'POST')) return playbackInfo(env, request, url, s, m[1]);
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
        return userDataWrite(env, s, m[2], m[1].toLowerCase() === 'playeditems' ? { played: on } : { favorite: on });
    }
    if (method === 'POST' && (m = R.hideFromResume.exec(path))) {
        return userDataWrite(env, s, m[1], { resumeHidden: (param(url.searchParams, 'Hide') ?? 'true').toLowerCase() !== 'false' });
    }
    if (method === 'POST' && (m = R.itemUserData.exec(path))) {
        const b = await readBody(request); const flags = {};
        if (b.Played !== undefined) flags.played = !!b.Played;
        if (b.IsFavorite !== undefined) flags.favorite = !!b.IsFavorite;
        if (b.PlaybackPositionTicks !== undefined) flags.position = b.PlaybackPositionTicks;
        return userDataWrite(env, s, m[1], flags);
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
        const dto = decodeId(m[1]) ? await derivedDto(env, s.scope, m[1], sid) : await itemDetail(env, s, sid, m[1]);
        return dto ? withWatch(env, s, dto) : json({ message: 'Not found' }, 404);
    }
    if (R.items.test(path)) return itemsResponse(env, s, sid, url.searchParams);
    if ((m = R.user.exec(path))) return json(userDto(s, sid));
    return json({ message: 'Not found' }, 404);
}

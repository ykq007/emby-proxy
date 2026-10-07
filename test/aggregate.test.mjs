// 聚合 Worker（src/aggregate/）：目录同步去重、增量、对账、写入预算、
// viewer 登录与可见范围、浏览端点、详情、图片。真实 SQL（node:sqlite）+ 两个假 Emby 节点。
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { ensureSchema, __resetSchemaReadyForTest } from '../src/db/schema.js';
import { encryptSecret, encryptToken } from '../src/emby/tokens.js';
import { createViewer, grantAccess, updateViewer, clearResolveCache } from '../src/viewers/store.js';
import { __resetUpstreamMemForTest } from '../src/viewers/upstream.js';
import { ensureAggSchema, __resetAggSchemaForTest } from '../src/aggregate/schema.js';
import { __resetAggUpstreamForTest } from '../src/aggregate/upstream.js';
import { __resetAggAuthForTest } from '../src/aggregate/auth.js';
import { __resetPlaybackForTest, PROGRESS_WRITE_MS } from '../src/aggregate/playback.js';
import { __resetSeriesForTest, CACHE_MS, BROWSE_WAIT_MS, GRACE_MS } from '../src/aggregate/series.js';
import { __resetLiveForTest } from '../src/aggregate/api.js';
import { __resetCountsForTest } from '../src/aggregate/catalog.js';
import { UPSTREAM_CB } from '../src/proxy/circuit-breaker.js';
import { runSync } from '../src/aggregate/sync.js';
import { __resetConfigCache } from '../src/proxy/config-cache.js';
import { decodeId, seasonId, episodeId, encodeMsid, decodeMsid, nodeUrl, lazyUrl, parseNodeUrl } from '../src/aggregate/ids.js';
import worker from '../src/aggregate/index.js';
import { createD1Sqlite } from './helpers/d1-sqlite.mjs';

const ORIGIN = 'https://agg.test';
const LOG_UA = 'Hills/1.9.0 (android; 17)';
const REAL_DEV = { client: 'Hills', device: 'Pixel 8', deviceId: '7f3c9a01b2d4e6f8', version: '1.9.0', ua: LOG_UA };
const DAY = 86400000;
let env; let restoreFetch; let nodes; let calls;

const mv = (Id, Name, year, ProviderIds = {}, saved = '2026-01-01T00:00:00Z') =>
    ({ Id, Name, Type: 'Movie', ProductionYear: year, ProviderIds, DateCreated: saved, DateLastSaved: saved, ImageTags: { Primary: 'p' + Id }, BackdropImageTags: ['b' + Id], Genres: ['Drama'] });
const sr = (Id, Name, year, ProviderIds = {}) =>
    ({ ...mv(Id, Name, year, ProviderIds), Type: 'Series' });
const ss = (Id, n) => ({ Id, Name: `Season ${n}`, Type: 'Season', IndexNumber: n, ImageTags: { Primary: 'p' + Id } });
const ep = (Id, s, e, created = '2026-01-01T00:00:00Z') =>
    ({ Id, Name: `Ep ${s}x${e}`, Type: 'Episode', ParentIndexNumber: s, IndexNumber: e, RunTimeTicks: 1000, DateCreated: created, ImageTags: { Primary: 'p' + Id } });

function fixtures() {
    return {
        'a.example': {
            libs: [{ Id: 'L1', CollectionType: 'movies' }, { Id: 'L2', CollectionType: 'tvshows' }, { Id: 'L3', CollectionType: 'music' }],
            items: {
                L1: [mv('a1', 'Inception', 2010, { Tmdb: '27205', Imdb: 'tt1375666' }), mv('a2', 'Local Film', 2020), mv('a3', 'Arrival', 2016, { Tmdb: '329865' })],
                L2: [sr('a9', 'Breaking Bad', 2008, { Tvdb: '81189', Tmdb: '1396' })],
                L3: [{ Id: 'a20', Name: 'Song', Type: 'Audio' }],
            },
            shows: { a9: { seasons: [ss('a9s1', 1), ss('a9s2', 2)], episodes: [ep('a9e11', 1, 1), ep('a9e12', 1, 2), ep('a9e21', 2, 1)] } },
            latest: [],
        },
        'b.example': {
            libs: [{ Id: 'M1', CollectionType: 'movies' }, { Id: 'M2', CollectionType: 'tvshows' }],
            items: {
                M1: [mv('b1', 'Inception', 2010, { IMDB: 'tt1375666' }), mv('b2', 'Local  Film!', 2020), mv('b3', 'Dune', 2021, { Tmdb: '438631' })],
                M2: [sr('b9', 'Breaking Bad', 2008, { Tvdb: '81189' })],
            },
            shows: { b9: { seasons: [ss('b9s2', 2), ss('b9s3', 3)], episodes: [ep('b9e21', 2, 1), ep('b9e31', 3, 1, '2026-03-01T00:00:00Z')] } },
            latest: [],
        },
    };
}

const devOf = (req, u) => (/DeviceId="?([^",]+)/i.exec(req.headers.get('X-Emby-Authorization') || '') || [])[1] || u.searchParams.get('DeviceId') || '';

// 真 Emby 的列表接口只给默认那个媒体源，单条详情才有全部。
const listed = (it) => (it.MediaSources ? { ...it, MediaSources: it.MediaSources.slice(0, 1) } : it);

// 假 Emby 节点。令牌绑定登录设备（TOK-<host>-<DeviceId>），换设备用就 401——验证设备身份前后一致。
function fakeEmby(req, body) {
    const u = new URL(req.url);
    const host = u.host; const node = nodes[host];
    if (host === 'cdn.example') { // 节点 3xx 去的外部存储
        calls.push({ host, path: u.pathname, query: Object.fromEntries(u.searchParams), auth: req.headers.get('X-Emby-Authorization'), token: req.headers.get('X-Emby-Token') });
        return new Response(`CDN-${u.pathname}`, { headers: { 'content-type': 'video/x-matroska' } });
    }
    if (node.down) throw new TypeError('network down');
    const p = u.pathname.replace(/^\/emby/, '');
    const q = u.searchParams;
    calls.push({ host, auth: req.headers.get('X-Emby-Authorization'), method: req.method, path: p, query: Object.fromEntries(q), ua: req.headers.get('User-Agent'), device: devOf(req, u), range: req.headers.get('Range'), key: req.headers.get('X-Node-Key'), body });
    if (node.hang) return new Promise((_, reject) => req.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))); // 连得上但永远不回，像真 fetch 一样可中止
    const json = (d, status = 200) => Response.json(d, { status });
    if (p === '/Users/AuthenticateByName') {
        if (/^Mozilla/.test(req.headers.get('User-Agent') || '')) return json({}, 403);
        return json({ AccessToken: `TOK-${host}-${devOf(req, u)}`, User: { Id: 'UID' }, ServerId: 'S-' + host });
    }
    // 真 Emby 也认授权头里的 Token=（客户端多半这样带，聚合端照原样转发）。
    const tok = req.headers.get('X-Emby-Token') || q.get('api_key') || (/Token="?([^",]+)/i.exec(req.headers.get('X-Emby-Authorization') || '') || [])[1] || '';
    if (!tok.startsWith(`TOK-${host}-`) || node.revoked?.has(tok)) return json({}, 401);
    if (devOf(req, u) && tok !== `TOK-${host}-${devOf(req, u)}`) return json({ ErrorCode: 'invalid_token' }, 401);
    if (p === '/Users/UID/Views') return json({ Items: node.libs.map(l => ({ ...l, Type: 'CollectionFolder' })) });
    if (p === '/Users/UID/Items') {
        let list = node.items[q.get('ParentId')] || [];
        const types = (q.get('IncludeItemTypes') || '').split(',').filter(Boolean);
        if (types.length) list = list.filter(it => types.includes(it.Type));
        if (q.get('Ids')) { const ids = q.get('Ids').split(','); list = list.filter(it => ids.includes(it.Id)); }
        if (q.get('MinDateLastSaved')) list = list.filter(it => it.DateLastSaved >= q.get('MinDateLastSaved'));
        const start = Number(q.get('StartIndex')) || 0; const limit = q.has('Limit') ? Number(q.get('Limit')) : list.length;
        return json({ Items: list.slice(start, start + limit).map(listed), TotalRecordCount: list.length });
    }
    let m;
    if ((m = /^\/Shows\/(\w+)\/(Seasons|Episodes)$/.exec(p))) {
        const sh = (node.shows || {})[m[1]] || { seasons: [], episodes: [] };
        const list = m[2] === 'Seasons' ? sh.seasons : sh.episodes;
        return json({ Items: list.map(listed), TotalRecordCount: list.length });
    }
    if (p === '/Users/UID/Items/Latest') return json(node.latest || []);
    if ((m = /^\/Users\/UID\/Items\/(\w+)$/.exec(p))) {
        const it = [...Object.values(node.items).flat(), ...Object.values(node.shows || {}).flatMap(sh => sh.episodes)].find(x => x.Id === m[1]);
        return it ? json({ ...it, Overview: 'From ' + host, People: [{ Id: 'person1', Name: 'Actor', Type: 'Actor', PrimaryImageTag: 'x' }], MediaSources: it.MediaSources || [{ Id: `ms-${it.Id}`, Path: '/mnt/x.mkv', Container: 'mkv', DirectStreamUrl: '/Videos/x/stream?api_key=NODETOKEN' }] }) : json({}, 404);
    }
    if ((m = /^\/Items\/(\w+)\/Images\/Primary$/.exec(p))) return new Response(`IMG-${host}-${m[1]}-${q.get('tag')}`, { headers: { 'content-type': 'image/jpeg' } });
    if ((m = /^\/Items\/(\w+)\/PlaybackInfo$/.exec(p))) {
        const id = m[1]; const ms = q.get('MediaSourceId') || `ms-${id}`;
        return json({
            PlaySessionId: `PS-${host}`,
            MediaSources: [{
                Id: ms, ItemId: id, Name: '1080p', Path: `/mnt/media/${id}.mkv`, Container: 'mkv',
                DirectStreamUrl: `${node.absUrls ? 'https://' + host + '/emby' : ''}/videos/${id}/stream.mkv?Static=true&MediaSourceId=${ms}&api_key=${tok}`,
                TranscodingUrl: `/emby/videos/${id}/master.m3u8?MediaSourceId=${ms}&PlaySessionId=PS-${host}&api_key=${tok}`,
                MediaStreams: [{ Type: 'Subtitle', Index: 2, DeliveryUrl: `/Videos/${id}/${ms}/Subtitles/2/Stream.srt?api_key=${tok}` }],
            }],
        });
    }
    if ((m = /^\/videos\/(\w+)\/(.+)$/i.exec(p))) {
        if (m[2].startsWith('rel')) return new Response(null, { status: 302, headers: { Location: `/emby/videos/${m[1]}/stream.mkv?api_key=${tok}` } });
        if (m[2].startsWith('cdn')) return new Response(null, { status: 302, headers: { Location: `https://cdn.example/f/${m[1]}?sig=1` } });
        if (m[2].endsWith('.m3u8')) return new Response(`#EXTM3U\nmain.m3u8?MediaSourceId=${q.get('MediaSourceId')}&PlaySessionId=PS-${host}&api_key=${tok}\n`, { headers: { 'content-type': 'application/vnd.apple.mpegurl' } });
        return new Response(`VIDEO-${host}-${m[1]}-${m[2]}`, { status: req.headers.get('Range') ? 206 : 200, headers: { 'content-type': 'video/x-matroska' } });
    }
    if (/^\/Sessions\/Playing/.test(p) || p === '/Videos/ActiveEncodings') return new Response(null, { status: 204 });
    return json({}, 404);
}

beforeEach(async () => {
    __resetSchemaReadyForTest(); __resetAggSchemaForTest(); __resetAggUpstreamForTest(); __resetAggAuthForTest(); __resetPlaybackForTest(); __resetSeriesForTest(); __resetLiveForTest(); __resetCountsForTest(); __resetUpstreamMemForTest(); UPSTREAM_CB.clear(); clearResolveCache(); __resetConfigCache();
    env = { DB: createD1Sqlite(), ADMIN_TOKEN: 'admin-secret', AGG_PAGE_DELAY_MS: '0' };
    await ensureSchema(env);
    await ensureAggSchema(env);
    const pw = await encryptSecret(env, 'pw');
    // nodeA 有显示名（版本菜单用它），nodeB 没有（退回前缀）。
    for (const [prefix, host, order, remark] of [['nodeA', 'a.example', 0, '节点A'], ['nodeB', 'b.example', 1, '']]) {
        env.DB.db.prepare(`INSERT INTO routes (prefix, target, emby_username, emby_password_enc, viewers_enabled, sort_order, remark) VALUES (?, ?, 'shared', ?, 1, ?, ?)`)
            .run(prefix, 'https://' + host, pw, order, remark);
        env.DB.db.prepare(`INSERT INTO visitor_logs (prefix, ua) VALUES (?, ?), (?, 'Mozilla/5.0 Chrome')`).run(prefix, LOG_UA, prefix);
    }
    // 生产 viewer 网关存下的真实设备：同步会话照搬它的身份。nodeB 没有设备（借 nodeA 的），浏览器设备不用。
    const dev = async (prefix, ident) => env.DB.db.prepare(`INSERT INTO viewer_device_sessions (prefix, device_id, blob) VALUES (?, ?, ?)`)
        .run(prefix, ident.deviceId, await encryptToken(env, prefix, JSON.stringify({ token: 't', userId: 'UID', ident })));
    await dev('nodeA', { client: 'Emby Web', device: 'Chrome', deviceId: '0000aaaa', version: '4.8', ua: 'Mozilla/5.0 Chrome' });
    await dev('nodeA', REAL_DEV);
    nodes = fixtures(); calls = [];
    const orig = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        const req = input instanceof Request ? input : new Request(input, init);
        return fakeEmby(req, req.method === 'POST' ? await req.clone().text() : undefined);
    };
    restoreFetch = () => { globalThis.fetch = orig; };
});
afterEach(() => restoreFetch());

const rows = (sql, ...b) => env.DB.db.prepare(sql).all(...b);
const syncAll = async (now = Date.now(), opts = {}) => { let s; for (let i = 0; i < 10; i++) { s = await runSync(env, now, { maxRequests: 50, ...opts }); if (!s.stopped) break; } return s; };

async function call(path, { method = 'GET', token, body, device = 'dev1', range, bare = false, ua = LOG_UA } = {}) {
    // bare：像播放器取流那样只带 URL 里的令牌，不带 Emby 授权头。
    const headers = bare ? { 'User-Agent': ua } : { 'User-Agent': ua, 'X-Emby-Authorization': `MediaBrowser Client="Hills", Device="Pixel", DeviceId="${device}", Version="1.9.0"${token ? `, Token="${token}"` : ''}` };
    if (body) headers['content-type'] = 'application/json';
    if (range) headers['Range'] = range;
    const later = []; // ctx.waitUntil 的后台任务：等它们做完再断言（真实运行时也会做完）
    const r = await worker.fetch(new Request(ORIGIN + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil(p) { later.push(p); } });
    const ct = r.headers.get('content-type') || '';
    const out = { status: r.status, location: r.headers.get('Location'), body: /json/.test(ct) ? await r.json() : await r.text() };
    await Promise.allSettled(later);
    return out;
}

async function viewer(name, grants) {
    const id = await createViewer(env, name, 'secret1');
    for (const [prefix, hidden] of grants) await grantAccess(env, id, prefix, 1, hidden || []);
    const r = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: name, Pw: 'secret1' } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return { id, token: r.body.AccessToken };
}

const names = (r) => r.body.Items.map(i => i.Name).sort();

test('sync merges the same title across nodes by provider id, then by name+year; music libraries are skipped', async () => {
    const s = await syncAll();
    assert.equal(s.stopped, '');
    const items = rows(`SELECT name, type, tmdb, imdb, tvdb FROM agg_items ORDER BY name`);
    assert.deepEqual(items.map(i => `${i.type}:${i.name}`), ['Movie:Arrival', 'Series:Breaking Bad', 'Movie:Dune', 'Movie:Inception', 'Movie:Local Film']);
    const src = (name) => rows(`SELECT s.prefix FROM agg_sources s JOIN agg_items i USING (vid) WHERE i.name = ? ORDER BY s.prefix`, name).map(r => r.prefix);
    assert.deepEqual(src('Inception'), ['nodeA', 'nodeB'], 'imdb-only copy on B joins the tmdb+imdb item from A');
    assert.deepEqual(src('Local Film'), ['nodeA', 'nodeB'], 'no provider ids: normalized name + year');
    assert.deepEqual(src('Breaking Bad'), ['nodeA', 'nodeB']);
    assert.ok(rows(`SELECT vid FROM agg_items`).every(r => r.vid > 1000), 'ids 1 and 2 stay free for the virtual libraries');
    assert.equal(rows(`SELECT * FROM agg_sources WHERE item_id = 'a20'`).length, 0);
});

test('sync uses a real viewer device as it is (its own device id, never a made-up one, never a browser)', async () => {
    await syncAll();
    const logins = calls.filter(c => c.path === '/Users/AuthenticateByName');
    assert.deepEqual(logins.map(c => c.host).sort(), ['a.example', 'b.example'], 'nodeB borrows nodeA\'s device');
    for (const c of logins) {
        assert.equal(c.ua, REAL_DEV.ua);
        assert.equal(c.auth, `MediaBrowser Client="Hills", Device="Pixel 8", DeviceId="${REAL_DEV.deviceId}", Version="1.9.0"`);
    }
    assert.ok(calls.every(c => !/^Mozilla/.test(c.ua || '')));
    assert.ok(calls.filter(c => c.path !== '/Users/AuthenticateByName').every(c => c.device === REAL_DEV.deviceId), 'every sync request is that device');

    // 令牌失效后重新登录：还是同一台设备。
    nodes['a.example'].revoked = new Set([`TOK-a.example-${REAL_DEV.deviceId}`]);
    __resetAggUpstreamForTest(); calls = [];
    env.DB.db.exec(`UPDATE agg_sync SET since = ''`);
    await syncAll();
    assert.deepEqual([...new Set(calls.filter(c => c.path === '/Users/AuthenticateByName' && c.host === 'a.example').map(c => c.device))], [REAL_DEV.deviceId]);
});

test('sync reuses that device\'s existing session (no login); an old made-up sync device is signed out first', async () => {
    // 生产代理里这台设备在 nodeA 已有可用的会话；聚合端旧版留下的随机设备会话还在。
    env.DB.db.prepare(`UPDATE viewer_device_sessions SET blob = ? WHERE prefix = 'nodeA' AND device_id = ?`)
        .run(await encryptToken(env, 'nodeA', JSON.stringify({ token: `TOK-a.example-${REAL_DEV.deviceId}`, userId: 'UID', ident: REAL_DEV })), REAL_DEV.deviceId);
    await ensureAggSchema(env);
    env.DB.db.prepare(`INSERT INTO agg_sessions (prefix, blob) VALUES ('nodeA', ?)`)
        .run(await encryptToken(env, 'nodeA', JSON.stringify({ token: 'TOK-a.example-0badc0de', userId: 'UID', ident: { ...REAL_DEV, deviceId: '0badc0de' } })));
    await syncAll();
    assert.ok(!calls.some(c => c.host === 'a.example' && c.path === '/Users/AuthenticateByName'), 'no login on nodeA');
    assert.deepEqual(calls.filter(c => c.path === '/Sessions/Logout').map(c => [c.host, c.device]), [['a.example', '0badc0de']]);
    assert.ok(calls.filter(c => c.host === 'a.example' && c.path !== '/Sessions/Logout').every(c => c.device === REAL_DEV.deviceId));
});

test('AGG_SYNC_VIEWER: the sync only uses that viewer\'s own devices, never another viewer\'s', async () => {
    const id = await createViewer(env, 'owner', 'secret1');
    env.AGG_SYNC_VIEWER = 'owner';
    try {
        let s = await runSync(env, Date.now(), { maxRequests: 50 });
        assert.match(s.nodes.nodeA.error, /no real client identity/, 'REAL_DEV is not the owner\'s device');
        assert.equal(calls.length, 0);
        env.DB.db.prepare(`INSERT INTO viewer_tokens (token_hash, viewer_id, prefix, device_id, created_at) VALUES ('h', ?, 'nodeA', ?, 0)`).run(id, REAL_DEV.deviceId);
        __resetAggUpstreamForTest();
        s = await runSync(env, Date.now(), { maxRequests: 50 });
        assert.equal(s.nodes.nodeA.error, '');
        assert.ok(calls.length && calls.every(c => c.device === REAL_DEV.deviceId));
    } finally { delete env.AGG_SYNC_VIEWER; }
});

test('no real viewer device anywhere: sync does not log in at all', async () => {
    env.DB.db.exec(`DELETE FROM viewer_device_sessions`);
    const s = await runSync(env, Date.now(), { maxRequests: 50 });
    assert.equal(calls.length, 0);
    assert.match(s.nodes.nodeA.error, /no real client identity/);
});

test('incremental sync: second pass asks only for changes and writes nothing when nothing changed', async () => {
    const t0 = Date.parse('2026-02-01T00:00:00Z');
    await syncAll(t0);
    calls = [];
    assert.equal((await syncAll(t0 + 600000)).requests, 0, 'within the hour: nodes are not polled');
    const s = await syncAll(t0 + 3600000);
    assert.equal(s.writes, 0);
    const pages = calls.filter(c => c.path === '/Users/UID/Items');
    assert.ok(pages.length && pages.every(c => c.query.MinDateLastSaved), 'every page is incremental');
    assert.equal(calls.filter(c => c.path === '/Users/AuthenticateByName').length, 0, 'sessions are reused');

    // 强制重新全量：条目都没变，指纹相同，一行不写。
    env.DB.db.exec(`UPDATE agg_sync SET since = ''`);
    const full = await syncAll(t0 + 3600001);
    assert.equal(full.writes, 0);

    // 节点上新增一部片：下一轮增量带上它，且并入已有作品（Arrival 的 tmdb）。
    nodes['b.example'].items.M1.push(mv('b4', 'Arrival', 2016, { Tmdb: '329865' }, '2026-02-01T01:30:00Z'));
    await syncAll(t0 + 3 * 3600000);
    assert.deepEqual(rows(`SELECT s.prefix FROM agg_sources s JOIN agg_items i USING (vid) WHERE i.name = 'Arrival' ORDER BY s.prefix`).map(r => r.prefix), ['nodeA', 'nodeB']);
});

test('reconcile drops copies deleted on a node; titles with no copy left disappear', async () => {
    const t0 = Date.parse('2026-02-01T00:00:00Z');
    await syncAll(t0);
    nodes['a.example'].items.L1 = nodes['a.example'].items.L1.filter(it => !['a1', 'a3'].includes(it.Id));
    await syncAll(t0 + DAY + 1);
    const left = rows(`SELECT name FROM agg_items ORDER BY name`).map(r => r.name);
    assert.ok(!left.includes('Arrival'), 'only copy was on A');
    assert.ok(left.includes('Inception'), 'B still has it');
    const owner = rows(`SELECT owner_prefix FROM agg_items WHERE name = 'Inception'`)[0].owner_prefix;
    assert.equal(owner, 'nodeB', 'metadata owner moves to the remaining copy');
});

test('daily write budget stops the sync and the next run resumes where it left off', async () => {
    const t0 = Date.parse('2026-02-01T00:00:00Z');
    const first = await runSync(env, t0, { maxRequests: 50, dailyWrites: 10 });
    assert.equal(first.stopped, 'writes');
    assert.ok(rows(`SELECT * FROM agg_items`).length < 5);
    const again = await runSync(env, t0 + 1, { maxRequests: 50, dailyWrites: 10 });
    assert.equal(again.stopped, 'writes', 'same day: budget already spent');
    await syncAll(t0 + DAY, { dailyWrites: 1000 });
    assert.equal(rows(`SELECT * FROM agg_items`).length, 5);
});

test('a node that leaves (viewers switched off) is removed from the catalog', async () => {
    await syncAll();
    env.DB.db.exec(`UPDATE routes SET viewers_enabled = 0 WHERE prefix = 'nodeA'`);
    __resetAggUpstreamForTest();
    await syncAll();
    assert.equal(rows(`SELECT * FROM agg_sources WHERE prefix = 'nodeA'`).length, 0);
    assert.ok(!rows(`SELECT name FROM agg_items`).some(r => r.name === 'Arrival'));
});

test('viewer login, views, library listing, search, latest and counts', async () => {
    await syncAll();
    const { token } = await viewer('alice', [['nodeA'], ['nodeB']]);
    assert.match(token, /^ea_/);
    assert.equal((await call('/emby/Users/Public')).body.length, 0);
    const views = await call('/emby/Users/x/Views', { token });
    assert.deepEqual(views.body.Items.map(v => [v.Id, v.CollectionType]), [['1', 'movies'], ['2', 'tvshows']]);

    const movies = await call('/emby/Users/x/Items?ParentId=1&Recursive=true&SortBy=SortName&SortOrder=Ascending&StartIndex=0&Limit=2', { token });
    assert.equal(movies.body.TotalRecordCount, 4);
    assert.deepEqual(movies.body.Items.map(i => i.Name), ['Arrival', 'Dune']);
    assert.equal(movies.body.Items[0].ImageTags.Primary, 'pa3');

    const search = await call('/emby/Users/x/Items?SearchTerm=incep&IncludeItemTypes=Movie,Series&Recursive=true', { token });
    assert.deepEqual(names(search), ['Inception']);
    const shows = await call('/emby/Users/x/Items?IncludeItemTypes=Series&Recursive=true', { token });
    assert.deepEqual(names(shows), ['Breaking Bad']);
    const favs = await call('/emby/Users/x/Items?ParentId=1&Filters=IsFavorite', { token });
    assert.equal(favs.body.TotalRecordCount, 0);

    const latest = await call('/emby/Users/x/Items/Latest?ParentId=1&Limit=3', { token });
    assert.ok(Array.isArray(latest.body) && latest.body.length === 3);
    const counts = await call('/emby/Items/Counts', { token });
    assert.deepEqual([counts.body.MovieCount, counts.body.SeriesCount], [4, 1]);
});

test('watch history (SortBy=DatePlayed) follows the viewer\'s play order, not the date added', async () => {
    await syncAll();
    const { token } = await viewer('alice', [['nodeA'], ['nodeB']]);
    const vid = (name) => String(rows(`SELECT vid FROM agg_items WHERE name = ?`, name)[0].vid);
    for (const name of ['Dune', 'Arrival', 'Inception']) {
        await call(`/emby/Users/x/PlayedItems/${vid(name)}`, { method: 'POST', token });
        await new Promise(r => setTimeout(r, 2));
    }
    const history = async (q) => (await call(`/emby/Users/x/Items?Filters=IsPlayed&Recursive=true&IncludeItemTypes=Movie&SortBy=DatePlayed${q}`, { token })).body;
    const desc = await history('&SortOrder=Descending&StartIndex=0&Limit=2');
    assert.deepEqual([desc.Items.map(i => i.Name), desc.TotalRecordCount], [['Inception', 'Arrival'], 3]);
    assert.deepEqual((await history('&SortOrder=Descending&StartIndex=2&Limit=2')).Items.map(i => i.Name), ['Dune']);
    assert.deepEqual((await history('&SortOrder=Ascending')).Items.map(i => i.Name), ['Dune', 'Arrival', 'Inception']);
});

test('search finds a title by its name, not only by its sort name (Chinese sort names are pinyin initials)', async () => {
    nodes['b.example'].items.M1.push({ ...mv('b7', '阳光先生', 2018), SortName: 'ygxs' });
    await syncAll();
    const { token } = await viewer('alice', [['nodeA'], ['nodeB']]);
    const find = async (term) => (await call(`/emby/Users/x/Items?SearchTerm=${encodeURIComponent(term)}&IncludeItemTypes=Movie,Series&Recursive=true`, { token })).body.Items.map(i => i.Name);
    assert.deepEqual(await find('阳光先生'), ['阳光先生']);
    assert.deepEqual(await find('阳光'), ['阳光先生'], 'part of the name');
    assert.deepEqual(await find('ygxs'), ['阳光先生'], 'pinyin initials still work');
    assert.deepEqual(await find('incep'), ['Inception']);
});

test('a viewer only sees titles from nodes they can access, minus hidden libraries', async () => {
    await syncAll();
    const bob = await viewer('bob', [['nodeB']]);
    const r = await call('/emby/Users/x/Items?ParentId=1', { token: bob.token });
    assert.deepEqual(names(r), ['Dune', 'Inception', 'Local Film']);
    const carol = await viewer('carol', [['nodeA', ['L1']]]);
    assert.equal((await call('/emby/Users/x/Items?ParentId=1', { token: carol.token })).body.TotalRecordCount, 0);
    assert.deepEqual(names(await call('/emby/Users/x/Items?ParentId=2', { token: carol.token })), ['Breaking Bad']);
    await createViewer(env, 'dave', 'secret1');
    const none = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'dave', Pw: 'secret1' } });
    assert.equal(none.status, 401, 'no access to any member node');
});

test('item detail comes from the first visible copy with node-specific ids stripped', async () => {
    await syncAll();
    const { token } = await viewer('alice', [['nodeA'], ['nodeB']]);
    const vid = rows(`SELECT vid FROM agg_items WHERE name = 'Inception'`)[0].vid;
    calls = [];
    const d = await call(`/emby/Users/x/Items/${vid}`, { token });
    assert.equal(d.status, 200);
    assert.equal(d.body.Id, String(vid));
    assert.equal(d.body.Overview, 'From a.example', 'nodeA sorts first');
    assert.deepEqual(d.body.People, [{ Id: 'person1', Name: 'Actor', Type: 'Actor' }], 'Id kept (strict clients need it), image tag dropped');
    // 真 Emby 单条详情总带 MediaSources（SenPlayer 靠它）：Id 用作品 Id，路径与节点流地址不外泄。
    // 版本菜单来自详情：每个文件一项，Id 是 `<前缀>~<媒体源 Id>`。
    // nodeB 的文件摘要同步时没有：第一次打开问它一次并存下，以后不再问（和用代理一样，不每次都打扰）。
    const menu = d.body.MediaSources;
    assert.deepEqual(menu[0], { Id: 'nodeA~ms-a1', ItemId: String(vid), Container: 'mkv', Path: 'x.mkv', Name: '节点A' });
    assert.deepEqual([menu[1].Id, menu[1].Name, menu[1].Container, menu[1].ItemId], ['nodeB~ms-b1', 'nodeB', 'mkv', String(vid)]);
    assert.equal(calls.filter(c => c.host === 'b.example' && c.path === '/Users/UID/Items/b1').length, 1);
    assert.equal(JSON.parse(rows(`SELECT media FROM agg_media WHERE prefix = 'nodeB' AND item_id = 'b1'`)[0].media)[0].Container, 'mkv');
    __resetLiveForTest(); calls = [];
    assert.equal((await call(`/emby/Users/x/Items/${vid}`, { token })).body.MediaSources[1].Container, 'mkv');
    assert.equal(calls.filter(c => c.host === 'b.example').length, 0, 'never asked again');
    assert.equal(d.body.ParentId, '1');
    const bob = await viewer('bob', [['nodeB']]);
    const b = (await call(`/emby/Users/x/Items/${vid}`, { token: bob.token })).body;
    assert.equal(b.Overview, 'From b.example');
    assert.deepEqual(b.MediaSources.map(m => [m.Id, m.Name]), [['nodeB~ms-b1', undefined]], 'one version: no label');
});

test('version menu hides nodes that are full for this device; when every node is full it still lists them', async () => {
    await syncAll();
    const { token } = await viewer('alice', [['nodeA'], ['nodeB']]);
    const vid = rows(`SELECT vid FROM agg_items WHERE name = 'Inception'`)[0].vid;
    env.DB.db.exec(`UPDATE routes SET max_concurrent = 1`);
    const busy = (prefix) => env.DB.db.prepare(`INSERT INTO playback_slots (viewer_id, prefix, device_id, item_id, heartbeat_at) VALUES ('other', ?, 'tv', 'x', ?)`).run(prefix, Date.now());
    const menu = async () => (await call(`/emby/Users/x/Items/${vid}`, { token })).body.MediaSources.map(m => m.Id);
    busy('nodeA');
    assert.deepEqual(await menu(), ['nodeB~ms-b1'], 'nodeA is full: not offered');
    busy('nodeB');
    assert.deepEqual(await menu(), ['nodeA~ms-a1', 'nodeB~ms-b1'], 'all full: list stays, play answers 429');
});

test('the menu lists every file of each copy: lists give only the default file, so each copy is asked once for its detail, then never again', async () => {
    const files = (h) => [
        { Id: 'x4k', Name: '2160p', Container: 'mkv', Size: 2e9, Bitrate: 8e6, MediaStreams: [{ Type: 'Video', Codec: 'hevc', Width: 3840, Height: h, Path: '/secret' }, { Type: 'Audio', Codec: 'aac', IsDefault: true }, { Type: 'Subtitle', Codec: 'srt' }] },
        { Id: 'xhd', Name: '1080p', Container: 'mkv', Size: 9e8, MediaStreams: [{ Type: 'Video', Codec: 'h264', Height: 1080 }] }];
    nodes['b.example'].items.M1[0].MediaSources = files(2160);
    nodes['b.example'].shows.b9.episodes[0].MediaSources = files(1608);
    await syncAll();
    const { token } = await viewer('alice', [['nodeA'], ['nodeB']]);
    const vid = rows(`SELECT vid FROM agg_items WHERE name = 'Inception'`)[0].vid;
    calls = [];
    const ms = (await call(`/emby/Users/x/Items/${vid}`, { token })).body.MediaSources;
    assert.deepEqual(ms.slice(1).map(m => [m.Id, m.Name, m.Size]), [['nodeB~x4k', 'nodeB · 2160p', 2e9], ['nodeB~xhd', 'nodeB · 1080p', 9e8]]);
    // 每个版本都是节点原样的媒体源，只改 Id / 名字 / ItemId（绝不拿摘要拼：Hills 遇到缺字段的一项，整份 PlaybackInfo 都读不了）。
    // 节点上的路径不外泄（媒体流的 Path 去掉）。
    const own = ({ Id, Name, ItemId, Path, ...rest }) => rest;
    const real = files(2160).map(f => ({ ...own(f), MediaStreams: f.MediaStreams.map(({ Path, ...st }) => st) }));
    assert.deepEqual(ms.slice(1).map(own), real);
    const r = await pbi(vid, token);
    const v = r.body.MediaSources.find(m => m.Id === 'nodeB~x4k');
    const { DirectStreamUrl, SupportsTranscoding, SupportsDirectStream, ...asListed } = v;
    assert.deepEqual(own(asListed), real[0], 'PlaybackInfo carries the same real source');
    assert.equal(DirectStreamUrl, `/n/nodeB/ea-play/b1/x4k/stream?api_key=${token}`);
    env.DB.db.exec(`DELETE FROM playback_slots`);
    assert.ok(!JSON.stringify(ms).includes('/secret'), 'node paths are not passed on');
    assert.equal(calls.filter(c => c.host === 'b.example' && c.path === '/Users/UID/Items/b1').length, 1, 'asked once');
    __resetLiveForTest(); calls = [];
    assert.equal((await call(`/emby/Users/x/Items/${vid}`, { token })).body.MediaSources.length, 3);
    assert.equal(calls.filter(c => c.host === 'b.example').length, 0, 'never again');
    // 剧集一样：列表只给默认文件，打开那一集时问一次。
    const series = rows(`SELECT vid FROM agg_items WHERE name = 'Breaking Bad'`)[0].vid;
    const e = (await call(`/emby/Users/x/Items/${series * 1e6 + 2 * 1000 + 1}`, { token })).body.MediaSources;
    assert.deepEqual(e.slice(1).map(m => [m.Id, m.Name, m.MediaStreams[0].Height]), [['nodeB~x4k', 'nodeB · 2160p', 1608], ['nodeB~xhd', 'nodeB · 1080p', 1080]]);
});

test('images are fetched from a copy that has them, matching the requested tag', async () => {
    await syncAll();
    const vid = rows(`SELECT vid FROM agg_items WHERE name = 'Inception'`)[0].vid;
    assert.equal((await call(`/emby/Items/${vid}/Images/Primary?tag=pb1&maxWidth=300`)).body, 'IMG-b.example-b1-pb1');
    assert.equal((await call(`/emby/Items/${vid}/Images/Primary`)).body, 'IMG-a.example-a1-pa1');
    assert.equal((await call(`/emby/Items/999999/Images/Primary`)).status, 404);
});

test('tokens: required, revoked on logout, invalidated by a password change', async () => {
    await syncAll();
    assert.equal((await call('/emby/Users/x/Views')).status, 401);
    assert.equal((await call('/emby/Users/x/Views', { token: 'ea_bogus' })).status, 401);
    const bad = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'nobody', Pw: 'x' } });
    assert.equal(bad.status, 401);

    const a = await viewer('alice', [['nodeA']]);
    assert.equal((await call('/emby/Users/x/Views', { token: a.token })).status, 200);
    assert.equal((await call('/emby/Sessions/Logout', { method: 'POST', token: a.token })).status, 204);
    __resetAggAuthForTest();
    assert.equal((await call('/emby/Users/x/Views', { token: a.token })).status, 401);

    const r = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'secret1' } });
    await updateViewer(env, a.id, { password: 'newpass1' });
    __resetAggAuthForTest();
    assert.equal((await call('/emby/Users/x/Views', { token: r.body.AccessToken })).status, 401);
});

test('public endpoints: server info has a stable id and no login is required', async () => {
    const one = await call('/emby/System/Info/Public');
    const two = await call('/System/Info/Public');
    assert.equal(one.status, 200);
    assert.equal(one.body.Id, two.body.Id);
    assert.equal(one.body.ServerName, 'Emby Aggregate');
});


// ── 阶段 2：播放 ─────────────────────────────────────────────────────────

async function playable() {
    await syncAll();
    const alice = await viewer('alice', [['nodeA'], ['nodeB']]);
    const vid = rows(`SELECT vid FROM agg_items WHERE name = 'Inception'`)[0].vid;
    calls = [];
    return { ...alice, vid };
}
const pbi = (vid, token, qs = '') => call(`/emby/Items/${vid}/PlaybackInfo?UserId=x${qs}`, { method: 'POST', token, body: { DeviceProfile: { Name: 'Hills' } } });
const slots = () => rows(`SELECT prefix, device_id FROM playback_slots ORDER BY prefix`).map(r => ({ ...r }));

test('PlaybackInfo asks only the best node (versions are offered on the title page), routed through the aggregate server; node tokens and paths never leak', async () => {
    const { token, vid } = await playable();
    // 版本菜单还没问到 nodeB 的媒体源：不列它（绝不拼一个假的）。打开作品页问到之后才列。
    assert.deepEqual((await pbi(vid, token)).body.MediaSources.map(m => m.Id), ['nodeA~ms-a1']);
    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token, body: { ItemId: String(vid), MediaSourceId: 'nodeA~ms-a1', PositionTicks: 0 } });
    await call(`/emby/Users/x/Items/${vid}`, { token });
    calls = [];
    const r = await pbi(vid, token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const ms = r.body.MediaSources;
    // 第一个是问过的节点；其它节点按版本菜单附在后面（Hills 在这份列表里按 Id 找选中的版本），不问它们的 PlaybackInfo。
    assert.deepEqual(ms.map(m => m.Id), ['nodeA~ms-a1', 'nodeB~ms-b1']);
    assert.deepEqual(ms.map(m => m.Name), ['节点A · 1080p', 'nodeB'], 'labelled by node name');
    assert.equal(ms[1].DirectStreamUrl, `/n/nodeB/ea-play/b1/ms-b1/stream?api_key=${token}`);
    assert.equal(ms[1].SupportsTranscoding, false);
    assert.equal(ms[1].TranscodingUrl, undefined);
    assert.ok(ms.every(m => m.ItemId === String(vid) && m.Path === undefined));
    assert.equal(ms[0].DirectStreamUrl, `/n/nodeA/videos/a1/stream.mkv?Static=true&MediaSourceId=ms-a1&api_key=${token}`);
    assert.ok(ms[0].TranscodingUrl.startsWith('/n/nodeA/videos/a1/master.m3u8?'));
    assert.ok(ms[0].MediaStreams[0].DeliveryUrl.startsWith('/n/nodeA/Videos/a1/ms-a1/Subtitles/2/Stream.srt?'));
    assert.equal(r.body.PlaySessionId, 'PS-a.example');
    assert.ok(!JSON.stringify(r.body).includes('TOK-'), 'no node token in the response');

    const asked = calls.filter(c => c.path.endsWith('/PlaybackInfo'));
    assert.deepEqual(asked.map(c => [c.host, c.query.UserId, c.device]), [['a.example', 'UID', 'dev1']], 'no other node is bothered');
    assert.ok(calls.every(c => c.ua === LOG_UA), 'upstream sees the client device UA, never a browser one');
    assert.deepEqual(slots(), [{ prefix: 'nodeA', device_id: 'dev1' }], 'only the primary node takes a slot');
    // 选了附加的版本（播放器只带令牌取流）：这时才向 nodeB 要一次 PlaybackInfo（带该设备的 DeviceProfile），
    // 照它给的直连地址取流；以该设备的真实身份登录 nodeB，不是默认的 "Emby"。之后的取流不再问 PlaybackInfo。
    calls = [];
    const b = await call(ms[1].DirectStreamUrl, { bare: true, range: 'bytes=0-' });
    assert.equal(b.status, 206, String(b.body));
    const pi = calls.filter(c => c.path.endsWith('/PlaybackInfo'));
    assert.deepEqual(pi.map(c => [c.host, c.query.MediaSourceId, JSON.parse(c.body).DeviceProfile.Name]), [['b.example', 'ms-b1', 'Hills']], 'asks for that file');
    // 只带令牌的取流照客户端原样转发（和生产代理一样）；登录与聚合端自己发的请求用该设备的真实身份，绝不是 "Emby"。
    assert.ok(calls.filter(c => c.host === 'b.example' && c.auth).every(c => /Client="Hills"/.test(c.auth)), 'the device\'s real identity, never "Emby"');
    assert.ok(calls.some(c => c.host === 'b.example' && c.path === '/Users/AuthenticateByName'), 'logs in to nodeB as that device');
    assert.equal(calls.find(c => /^\/videos\//i.test(c.path)).auth, null, 'the stream goes as the client sent it: token only');
    assert.deepEqual(calls.filter(c => c.path.toLowerCase().startsWith('/videos/')).map(c => [c.host, c.path, c.query.MediaSourceId, c.query.api_key]),
        [['b.example', '/videos/b1/stream.mkv', 'ms-b1', 'TOK-b.example-dev1']], 'the node\'s own direct-stream URL');
    assert.ok(slots().some(x => x.prefix === 'nodeB' && x.device_id === 'dev1'));
    calls = [];
    await call(ms[1].DirectStreamUrl, { bare: true, range: 'bytes=100-' });
    assert.equal(calls.filter(c => c.path.endsWith('/PlaybackInfo')).length, 0, 'remembered');
    // 进度回报带的是菜单 Id 和 nodeA 的 PlaySessionId：发给 nodeB 前换成 nodeB 自己给的。
    calls = [];
    await call('/emby/Sessions/Playing/Progress', { method: 'POST', token, body: { ItemId: String(vid), MediaSourceId: 'nodeB~ms-b1', PlaySessionId: 'PS-a.example', PositionTicks: 5 } });
    const rep = calls.find(c => c.path === '/Sessions/Playing/Progress');
    assert.equal(rep.host, 'b.example');
    assert.deepEqual([JSON.parse(rep.body).MediaSourceId, JSON.parse(rep.body).PlaySessionId, JSON.parse(rep.body).ItemId], ['ms-b1', 'PS-b.example', 'b1']);
});

test('PlaybackInfo prefers healthy nodes: failing probes or a dead node move playback to the next copy', async () => {
    const { token, vid } = await playable();
    env.DB.db.exec(`INSERT INTO emby_probe_state (prefix, first_fail_at) VALUES ('nodeA', 1)`);
    let r = await pbi(vid, token);
    assert.deepEqual(r.body.MediaSources.map(m => m.Id), ['nodeB~ms-b1'], 'a failing node is not offered as an extra version');

    __resetPlaybackForTest();
    env.DB.db.exec(`DELETE FROM emby_probe_state`);
    env.DB.db.exec(`DELETE FROM playback_slots`);
    nodes['a.example'].down = true;
    r = await pbi(vid, token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.MediaSources[0].Id, 'nodeB~ms-b1');
    assert.deepEqual(slots(), [{ prefix: 'nodeB', device_id: 'dev1' }], 'the slot taken on the dead node is released');
});

test('concurrency: a full node is skipped, and slots are shared with the production proxy', async () => {
    const { id, token, vid } = await playable();
    env.DB.db.prepare(`UPDATE viewer_access SET quota = 1 WHERE viewer_id = ?`).run(id);
    __resetAggAuthForTest();
    // 同一 viewer 另一台设备正在经生产代理看 nodeA（同一张 playback_slots）。
    env.DB.db.prepare(`INSERT INTO playback_slots (viewer_id, prefix, device_id, item_id, heartbeat_at) VALUES (?, 'nodeA', 'tv', 'x', ?)`).run(id, Date.now());
    let r = await pbi(vid, token);
    assert.deepEqual(r.body.MediaSources.map(m => m.Id), ['nodeB~ms-b1']);
    env.DB.db.prepare(`INSERT INTO playback_slots (viewer_id, prefix, device_id, item_id, heartbeat_at) VALUES (?, 'nodeB', 'tv', 'x', ?)`).run(id, Date.now());
    env.DB.db.exec(`DELETE FROM playback_slots WHERE device_id = 'dev1'`);
    r = await pbi(vid, token);
    assert.equal(r.status, 429);
});

test('streams need a slot too: a late play after the PlaybackInfo hold expired, or another node\'s version, cannot pass the quota', async () => {
    const { id, token, vid } = await playable();
    // 同一 viewer 另一台设备正在看 nodeA（配额 1）。
    env.DB.db.prepare(`INSERT INTO playback_slots (viewer_id, prefix, device_id, item_id, heartbeat_at) VALUES (?, 'nodeA', 'tv', 'x', ?)`).run(id, Date.now());
    const direct = await call(`/Videos/${vid}/stream.mkv?Static=true&MediaSourceId=${encodeURIComponent('nodeA~ms-a1')}&api_key=${token}`, { bare: true });
    assert.equal(direct.status, 429);
    assert.equal((await call(`/n/nodeA/videos/a1/stream.mkv?api_key=${token}`, { bare: true })).status, 429);
    assert.ok(!calls.some(c => c.path.startsWith('/videos/') || c.path.startsWith('/Videos/')), 'nothing reached nodeA');
    // nodeB 有空位：流照常，并占下 nodeB 的槽位（不是 pending，直接算在播）。真实客户端先取过 PlaybackInfo（满的 nodeA 被跳过，落在 nodeB）。
    assert.equal((await pbi(vid, token)).body.MediaSources[0].Id, 'nodeB~ms-b1');
    const b = await call(`/Videos/${vid}/stream.mkv?Static=true&MediaSourceId=${encodeURIComponent('nodeB~ms-b1')}&api_key=${token}`, { bare: true, range: 'bytes=0-' });
    assert.equal(b.status, 206);
    assert.deepEqual(slots(), [{ prefix: 'nodeA', device_id: 'tv' }, { prefix: 'nodeB', device_id: 'dev1' }]);
    // 字幕不占槽位。
    assert.notEqual((await call(`/Videos/${vid}/${encodeURIComponent('nodeA~ms-a1')}/Subtitles/2/Stream.srt?api_key=${token}`, { bare: true })).status, 429);
});

test('picking a version pins PlaybackInfo to that node', async () => {
    const { token, vid } = await playable();
    const r = await pbi(vid, token, '&MediaSourceId=' + encodeURIComponent('nodeB~ms-b1'));
    assert.equal(r.body.MediaSources[0].Id, 'nodeB~ms-b1', 'the picked node comes first');
    const asked = calls.filter(c => c.path.endsWith('/PlaybackInfo'));
    assert.deepEqual(asked.map(c => [c.host, c.query.MediaSourceId]), [['b.example', 'ms-b1']]);
    assert.deepEqual(slots(), [{ prefix: 'nodeB', device_id: 'dev1' }]);
    // Hills 把选中的版本放在 POST 体里：一样先去那个节点，体里的 Id 换成节点自己的。
    env.DB.db.exec(`DELETE FROM playback_slots`); calls = [];
    const inBody = await call(`/emby/Items/${vid}/PlaybackInfo?UserId=x`, { method: 'POST', token, body: { DeviceProfile: { Name: 'Hills' }, MediaSourceId: 'nodeB~ms-b1' } });
    assert.equal(inBody.body.MediaSources[0].Id, 'nodeB~ms-b1');
    const sent = calls.find(c => c.path.endsWith('/PlaybackInfo'));
    assert.equal(sent.host, 'b.example');
    assert.equal(JSON.parse(sent.body).MediaSourceId, 'ms-b1', "the node gets its own id, not the aggregate's");
    // 选中的节点满了：退到其它节点，不报错；不把 nodeB 的媒体源 Id 发给 nodeA。
    env.DB.db.exec(`UPDATE routes SET max_concurrent = 1`);
    env.DB.db.prepare(`INSERT INTO playback_slots (viewer_id, prefix, device_id, item_id, heartbeat_at) VALUES ('other', 'nodeB', 'tv', 'x', ?)`).run(Date.now());
    env.DB.db.exec(`DELETE FROM playback_slots WHERE device_id = 'dev1'`);
    calls = [];
    const fb = await pbi(vid, token, '&MediaSourceId=' + encodeURIComponent('nodeB~ms-b1'));
    assert.deepEqual(fb.body.MediaSources.map(m => m.Id), ['nodeA~ms-a1']);
    assert.deepEqual(calls.filter(c => c.path.endsWith('/PlaybackInfo')).map(c => [c.host, c.query.MediaSourceId]), [['a.example', undefined]]);
});

test('client-built stream URLs are mapped to the real item on the right node, with Range passed through', async () => {
    const { token, vid } = await playable();
    // 设备先经 PlaybackInfo 登录过 nodeA；只带令牌去取 nodeB 的流时，以它在 nodeA 的真实身份登录 nodeB。
    await pbi(vid, token); calls = [];
    const r = await call(`/Videos/${vid}/stream.mkv?Static=true&MediaSourceId=${encodeURIComponent('nodeB~ms-b1')}&api_key=${token}`, { bare: true, range: 'bytes=0-99' });
    assert.equal(r.status, 206);
    assert.equal(r.body, 'VIDEO-b.example-b1-stream.mkv');
    // nodeB 没为这份副本发过 PlaySessionId：先向它要一次 PlaybackInfo，照它自己的直连地址取流（所有节点同一规则）。
    assert.deepEqual(calls.filter(c => c.path.endsWith('/PlaybackInfo')).map(c => c.host), ['b.example']);
    const up = calls.find(c => /^\/videos\//i.test(c.path));
    assert.equal(up.path, '/videos/b1/stream.mkv');
    assert.equal(up.query.MediaSourceId, 'ms-b1');
    assert.equal(up.query.api_key, 'TOK-b.example-dev1', 'viewer token swapped for the device session token');
    assert.equal(up.range, 'bytes=0-99');
    assert.ok(calls.filter(c => c.host === 'b.example' && c.auth).every(c => /Client="Hills"/.test(c.auth)), 'never the default "Emby" identity');

    // 带着 nodeA 自己发的 PlaySessionId：直接映射到 nodeA，不再问 PlaybackInfo。
    calls = [];
    const own = await call(`/Videos/${vid}/stream.mkv?Static=true&MediaSourceId=${encodeURIComponent('nodeA~ms-a1')}&PlaySessionId=PS-a.example&api_key=${token}`, { bare: true });
    assert.equal(own.body, 'VIDEO-a.example-a1-stream.mkv');
    assert.equal(calls.filter(c => c.path.endsWith('/PlaybackInfo')).length, 0);

    const sub = await call(`/Videos/${vid}/${encodeURIComponent('nodeA~ms-a1')}/Subtitles/2/Stream.srt?api_key=${token}`, { bare: true });
    assert.equal(sub.body, 'VIDEO-a.example-a1-ms-a1/Subtitles/2/Stream.srt');
});

test('a token-only stream from a device that never logged in anywhere is refused, not logged in as "Emby"', async () => {
    const { token, vid } = await playable();
    const r = await call(`/Videos/${vid}/stream.mkv?Static=true&MediaSourceId=${encodeURIComponent('nodeB~ms-b1')}&api_key=${token}`, { bare: true });
    assert.equal(r.status, 503);
    assert.ok(!calls.some(c => c.path.endsWith('/AuthenticateByName')), 'no login attempted');
});

test('node-provided transcoding URLs work through /n/, playlists come back with the viewer token; /n/ is locked down', async () => {
    const { token, vid } = await playable();
    const info = await pbi(vid, token);
    const r = await call(info.body.MediaSources[0].TranscodingUrl, { bare: true });
    assert.equal(r.status, 200);
    assert.match(r.body, new RegExp(`main\\.m3u8\\?MediaSourceId=ms-a1&PlaySessionId=PS-a\\.example&api_key=${token}`));
    assert.ok(!r.body.includes('TOK-'));
    const up = calls.find(c => c.path.endsWith('master.m3u8'));
    assert.deepEqual([up.host, up.path, up.query.api_key], ['a.example', '/videos/a1/master.m3u8', 'TOK-a.example-dev1']);

    // 只有 PlaySessionId 的 HLS 分片请求：凭 PlaybackInfo 时记下的会话找回节点。
    const seg = await call(`/Videos/${vid}/hls1/main/0.ts?PlaySessionId=PS-a.example&api_key=${token}`, { bare: true });
    assert.equal(seg.body, 'VIDEO-a.example-a1-hls1/main/0.ts');

    assert.equal((await call(`/n/nodeA/Users/UID/Items?api_key=${token}`, { bare: true })).status, 403, 'only /Videos/ is reachable');
    assert.equal((await call(`/n/nodeA/videos/a1/stream.mkv?api_key=${token}`, { method: 'POST', token })).status, 403, 'read-only');
    const bob = await viewer('bob', [['nodeB']]);
    assert.equal((await call(`/n/nodeA/videos/a1/stream.mkv?api_key=${bob.token}`, { bare: true })).status, 403, 'no access to nodeA');
    // 客户端（如 Hills）在节点流地址前加 /emby。
    const viaEmby = await call(`/emby/n/nodeB/videos/b1/stream.mkv?Static=true&api_key=${bob.token}`, { bare: true, range: 'bytes=0-' });
    assert.equal(viaEmby.status, 206, String(viaEmby.body));
});

test('playback reports reach the node playing the stream with real ids; Stopped frees the slot', async () => {
    const { token, vid } = await playable();
    await pbi(vid, token);
    assert.equal(slots().length, 1);
    const report = { ItemId: String(vid), MediaSourceId: 'nodeA~ms-a1', PlaySessionId: 'PS-a.example', PositionTicks: 50, NowPlayingQueue: [{ Id: String(vid) }] };
    for (const kind of ['', '/Progress', '/Stopped']) {
        assert.equal((await call('/emby/Sessions/Playing' + kind, { method: 'POST', token, body: report })).status, 204);
    }
    const sent = calls.filter(c => c.path.startsWith('/Sessions/Playing'));
    assert.deepEqual(sent.map(c => [c.host, c.path]), [['a.example', '/Sessions/Playing'], ['a.example', '/Sessions/Playing/Progress'], ['a.example', '/Sessions/Playing/Stopped']]);
    assert.equal(slots().length, 0);

    calls = [];
    await call(`/emby/Videos/ActiveEncodings?DeviceId=dev1&PlaySessionId=PS-a.example&api_key=${token}`, { method: 'DELETE', token });
    assert.deepEqual(calls.map(c => [c.host, c.method, c.path]), [['a.example', 'DELETE', '/Videos/ActiveEncodings']]);
});

test('viewers cannot use a browser on the aggregate server', async () => {
    await syncAll();
    const BROWSER = 'Mozilla/5.0 (Macintosh) Safari/605.1.15';
    const { token, vid } = await (async () => { const a = await viewer('alice', [['nodeA'], ['nodeB']]); return { ...a, vid: rows(`SELECT vid FROM agg_items WHERE name = 'Inception'`)[0].vid }; })();
    calls = [];
    const login = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'secret1' }, ua: BROWSER });
    assert.equal(login.status, 403);
    assert.match(login.body.message, /use an Emby app/);
    assert.equal((await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'bad' }, ua: BROWSER })).status, 401);
    assert.equal((await call('/emby/Users/x/Views', { token, ua: BROWSER })).status, 403);
    assert.equal((await call(`/emby/Items/${vid}/PlaybackInfo`, { method: 'POST', token, body: {}, ua: BROWSER })).status, 403);
    assert.equal((await call(`/Videos/${vid}/stream.mkv?api_key=${token}`, { bare: true, ua: BROWSER })).status, 403);
    assert.equal(calls.length, 0, 'nothing reached a node');
    assert.equal(rows(`SELECT * FROM playback_slots`).length, 0);
});

// ── 阶段 3：剧集与观看状态 ─────────────────────────────────────────────

async function seriesSetup() {
    await syncAll();
    const a = await viewer('alice', [['nodeA'], ['nodeB']]);
    const vid = rows(`SELECT vid FROM agg_items WHERE name = 'Breaking Bad'`)[0].vid;
    const movie = rows(`SELECT vid FROM agg_items WHERE name = 'Inception'`)[0].vid;
    const E = (s, e) => String(vid * 1e6 + s * 1000 + e);
    const S = (s) => String(vid * 1e6 + 999000 + s);
    calls = [];
    return { ...a, vid, movie, E, S };
}

test('series: seasons and episodes are merged across nodes by number (A has S1–S2, B has S2–S3)', async () => {
    const { token, vid, E, S } = await seriesSetup();
    const seasons = (await call(`/emby/Shows/${vid}/Seasons?UserId=x`, { token })).body;
    assert.deepEqual(seasons.Items.map(x => [x.Id, x.IndexNumber, x.SeriesId]), [[S(1), 1, String(vid)], [S(2), 2, String(vid)], [S(3), 3, String(vid)]]);
    const eps = (await call(`/emby/Shows/${vid}/Episodes?UserId=x`, { token })).body;
    assert.deepEqual(eps.Items.map(x => x.Id), [E(1, 1), E(1, 2), E(2, 1), E(3, 1)], 'S2E1 on both nodes appears once');
    const s3 = (await call(`/emby/Shows/${vid}/Episodes?SeasonId=${S(3)}`, { token })).body;
    assert.deepEqual(s3.Items.map(x => [x.Id, x.SeasonId, x.ParentIndexNumber, x.IndexNumber]), [[E(3, 1), S(3), 3, 1]]);
    // 按 ParentId 浏览（部分客户端这样走）：剧集 → 季，季 → 集。
    assert.deepEqual((await call(`/emby/Users/x/Items?ParentId=${vid}`, { token })).body.Items.map(x => x.Type), ['Season', 'Season', 'Season']);
    assert.deepEqual((await call(`/emby/Users/x/Items?ParentId=${S(1)}`, { token })).body.Items.map(x => x.Id), [E(1, 1), E(1, 2)]);
    // 详情与图片：推出的 Id 也能直接取。
    const d = (await call(`/emby/Users/x/Items/${E(3, 1)}`, { token })).body;
    assert.equal(d.Name, 'Ep 3x1'); assert.equal(d.SeriesName, 'Breaking Bad');
    assert.deepEqual(d.MediaSources, [{ Id: 'nodeB~ms-b9e31', ItemId: E(3, 1), Container: 'mkv', Path: 'x.mkv' }]);
    assert.deepEqual((await call(`/emby/Users/x/Items/${E(2, 1)}`, { token })).body.MediaSources.map(m => m.Id), ['nodeA~ms-a9e21', 'nodeB~ms-b9e21'], 'an episode on two nodes offers both');
    assert.equal(d.Id, E(3, 1)); assert.equal(d.SeasonId, S(3));
    assert.equal((await call(`/emby/Items/${E(3, 1)}/Images/Primary?tag=pb9e31`)).body, 'IMG-b.example-b9e31-pb9e31');
    // 一屏缩略图同时到达：共用一次上游请求。
    __resetSeriesForTest(); calls = [];
    await Promise.all([E(1, 1), E(1, 2), E(2, 1)].map(id => call(`/emby/Items/${id}/Images/Primary?tag=p`)));
    // 节点数据缓存 + 并发合并：每个节点的剧集只取了一次。
    assert.equal(calls.filter(c => c.path === '/Shows/a9/Episodes').length, 1);
    assert.equal(calls.filter(c => c.path === '/Shows/b9/Episodes').length, 1);
});

test('series: a node that never answers does not hold the list once another node answered; after BROWSE_WAIT_MS it is skipped', async (t) => {
    const { token, vid, E } = await seriesSetup();
    nodes['b.example'].hang = true;
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const turns = async (n) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
    const first = call(`/emby/Shows/${vid}/Episodes?UserId=x`, { token });
    while (!calls.some(c => c.host === 'b.example') || !calls.some(c => c.path === '/Shows/a9/Episodes')) await turns(1);
    await turns(20);
    t.mock.timers.tick(GRACE_MS);
    assert.deepEqual((await first).body.Items.map(x => x.Id), [E(1, 1), E(1, 2), E(2, 1)], 'answered GRACE_MS after node A, not BROWSE_WAIT_MS');
    t.mock.timers.tick(BROWSE_WAIT_MS);
    await turns(20);
    __resetSeriesForTest(); calls = [];
    assert.deepEqual((await call(`/emby/Shows/${vid}/Episodes?UserId=x`, { token })).body.Items.map(x => x.Id), [E(1, 1), E(1, 2), E(2, 1)]);
    assert.equal(calls.filter(c => c.host === 'b.example').length, 0, 'node B is not asked again while marked down');
});

test('image: a node that does not answer within 2.5 s is skipped for the next copy', async (t) => {
    const { movie } = await seriesSetup();
    nodes['a.example'].hang = true;
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const res = call(`/emby/Items/${movie}/Images/Primary?tag=pa1`);
    while (!calls.some(c => c.host === 'a.example')) await new Promise(r => setImmediate(r));
    t.mock.timers.tick(2500);
    assert.equal((await res).body, 'IMG-b.example-b1-pb1');
});

test('series: an episode on one node plays from that node; one on two nodes plays from the best one, or the picked one', async () => {
    const { token, E } = await seriesSetup();
    const only = await pbi(E(3, 1), token);
    assert.equal(only.status, 200, JSON.stringify(only.body));
    assert.deepEqual(only.body.MediaSources.map(m => m.Id), ['nodeB~ms-b9e31']);
    assert.ok(only.body.MediaSources.every(m => m.ItemId === E(3, 1)));
    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token, body: { ItemId: E(3, 1), MediaSourceId: 'nodeB~ms-b9e31', PositionTicks: 0 } });
    await call(`/emby/Users/x/Items/${E(2, 1)}`, { token }); // 打开这一集：问到 nodeB 的媒体源
    assert.deepEqual((await pbi(E(2, 1), token)).body.MediaSources.map(m => m.Id), ['nodeA~ms-a9e21', 'nodeB~ms-b9e21'], 'asked nodeA; nodeB offered without asking it');
    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token, body: { ItemId: E(2, 1), MediaSourceId: 'nodeA~ms-a9e21', PositionTicks: 0 } });
    const picked = await pbi(E(2, 1), token, '&MediaSourceId=' + encodeURIComponent('nodeB~b9e21'));
    assert.equal(picked.body.MediaSources[0].Id.split('~')[0], 'nodeB');
});

test('watch state: resume, 90% marks played, Next Up crosses nodes; progress writes are throttled; nothing goes to prod watch_state', async () => {
    const { token, vid, movie, E } = await seriesSetup();
    const report = (kind, ItemId, PositionTicks) => call('/emby/Sessions/Playing' + kind, { method: 'POST', token, body: { ItemId, PositionTicks } });
    await report('', String(movie), 0);
    await report('/Progress', String(movie), 100);
    await report('/Progress', String(movie), 200); // 一分钟内第二次：不写
    let resume = (await call('/emby/Users/x/Items/Resume', { token })).body;
    assert.deepEqual(resume.Items.map(i => i.Id), [String(movie)]);
    assert.equal(resume.Items[0].UserData.PlaybackPositionTicks, 100, 'second progress within a minute was not written');
    await report('/Stopped', String(movie), 150);
    assert.equal((await call('/emby/Users/x/Items/Resume', { token })).body.Items[0].UserData.PlaybackPositionTicks, 150, 'Stopped is always written');

    // 看完 A 上的 S2E1 → Next Up 是只在 B 上的 S3E1。
    await report('', E(2, 1), 0);
    await report('/Stopped', E(2, 1), 950);
    const next = (await call('/emby/Shows/NextUp?UserId=x', { token })).body;
    assert.deepEqual(next.Items.map(i => i.Id), [E(3, 1)]);
    const eps = (await call(`/emby/Shows/${vid}/Episodes`, { token })).body.Items;
    assert.equal(eps.find(e => e.Id === E(2, 1)).UserData.Played, true);
    assert.equal(rows(`SELECT COUNT(*) AS n FROM watch_state`)[0].n, 0, 'the aggregator never writes prod watch_state');
    assert.ok(PROGRESS_WRITE_MS >= 60000);
});

test('favorites and played marks are stored locally; sent to a node only where the device already has a session (like the proxy)', async () => {
    const { token, movie } = await seriesSetup();
    const r = await call(`/emby/Users/x/FavoriteItems/${movie}`, { method: 'POST', token });
    assert.equal(r.body.IsFavorite, true);
    const fav = (await call('/emby/Users/x/Items?Filters=IsFavorite&Recursive=true', { token })).body;
    assert.deepEqual(fav.Items.map(i => [i.Id, i.UserData.IsFavorite]), [[String(movie), true]]);
    await call(`/emby/Users/x/PlayedItems/${movie}`, { method: 'POST', token });
    assert.equal((await call(`/emby/Users/x/Items/${movie}`, { token })).body.UserData.Played, true);
    await call(`/emby/Users/x/FavoriteItems/${movie}`, { method: 'DELETE', token });
    assert.equal((await call('/emby/Users/x/Items?Filters=IsFavorite', { token })).body.Items.length, 0);
    assert.ok(!calls.some(c => /FavoriteItems|PlayedItems|UserData/.test(c.path)), 'no session on any node: nothing sent, no login');
    assert.ok(!calls.some(c => c.path === '/Users/AuthenticateByName'));
    await mainProxySession('nodeA', 'dev1');
    calls = [];
    await call(`/emby/Users/x/PlayedItems/${movie}`, { method: 'POST', token });
    assert.deepEqual(calls.filter(c => /PlayedItems/.test(c.path)).map(c => [c.host, c.method, c.path, c.device]), [['a.example', 'POST', '/Users/UID/PlayedItems/a1', 'dev1']]);
});

// 生产代理里该设备在节点上的会话（节点令牌 TOK-<host>-<设备>）。
async function mainProxySession(prefix, deviceId) {
    const host = prefix === 'nodeA' ? 'a.example' : 'b.example';
    env.DB.db.prepare(`INSERT OR REPLACE INTO viewer_device_sessions (prefix, device_id, blob) VALUES (?, ?, ?)`).run(prefix, deviceId,
        await encryptToken(env, prefix, JSON.stringify({ token: `TOK-${host}-${deviceId}`, userId: 'UID', ident: { client: 'Hills', device: 'Pixel', deviceId, version: '1.9.0', ua: LOG_UA } })));
}

test('the device\'s main-proxy session is reused: the node sees one login per device; browsing uses it too', async () => {
    const { token, vid } = await playable();
    await mainProxySession('nodeA', 'dev1');
    calls = [];
    assert.equal((await pbi(vid, token)).status, 200);
    assert.ok(!calls.some(c => c.path === '/Users/AuthenticateByName'), 'no second login: ' + JSON.stringify(calls.filter(c => c.path === '/Users/AuthenticateByName').map(c => [c.host, c.device])));
    assert.equal(rows(`SELECT COUNT(*) AS n FROM agg_device_sessions WHERE device_id = 'dev1'`)[0].n, 0, 'nothing stored on the aggregate side');
    // 详情：该设备在 nodeA 有会话，就用它取（节点看到的是这台设备在浏览），不是同步设备。
    calls = [];
    await call(`/emby/Users/x/Items/${vid}`, { token });
    assert.deepEqual(calls.filter(c => c.path === '/Users/UID/Items/a1').map(c => c.device), ['dev1']);
});

test('capabilities are passed to a node once, right before the device first plays there', async () => {
    const { token, vid } = await playable();
    calls = [];
    assert.equal((await call('/emby/Sessions/Capabilities/Full', { method: 'POST', token, body: { PlayableMediaTypes: ['Video'], SupportsMediaControl: true } })).status, 204);
    assert.equal(calls.length, 0, 'nothing sent until the device uses a node');
    await pbi(vid, token);
    const caps = calls.filter(c => c.path === '/Sessions/Capabilities/Full');
    assert.deepEqual(caps.map(c => [c.host, c.device, JSON.parse(c.body).PlayableMediaTypes[0]]), [['a.example', 'dev1', 'Video']]);
    assert.ok(calls.indexOf(caps[0]) < calls.findIndex(c => c.path.endsWith('/PlaybackInfo')), 'before PlaybackInfo');
    calls = [];
    await pbi(vid, token);
    assert.equal(calls.filter(c => c.path === '/Sessions/Capabilities/Full').length, 0, 'once per node');
});

test('home Latest for TV: a new episode on a node moves its series to the front; node lists are cached', async () => {
    const { token, vid } = await seriesSetup();
    nodes['b.example'].latest = [{ Id: 'b9e31', Type: 'Episode', SeriesId: 'b9', DateCreated: '2026-03-01T00:00:00Z' }];
    const latest = (await call('/emby/Users/x/Items/Latest?ParentId=2', { token })).body;
    assert.equal(latest[0].Id, String(vid));
    await call('/emby/Users/x/Items/Latest?ParentId=2', { token });
    assert.equal(calls.filter(c => c.path === '/Users/UID/Items/Latest').length, 2, 'one request per node, then cached');
    assert.ok(CACHE_MS <= 10 * 60000);
});

test('POST /admin/sync: only with SYNC_TOKEN, runs one sync at a time', async () => {
    const trigger = async (auth) => {
        const work = [];
        const r = await worker.fetch(new Request(ORIGIN + '/admin/sync', { method: 'POST', headers: auth ? { Authorization: auth } : {} }), env, { waitUntil: (p) => work.push(p) });
        await Promise.all(work);
        return r.status;
    };
    assert.equal(await trigger('Bearer x'), 404, 'no SYNC_TOKEN set: the endpoint does not exist');
    env.SYNC_TOKEN = 'sync-secret';
    assert.equal(await trigger(''), 401);
    assert.equal(await trigger('Bearer admin-secret'), 401, 'ADMIN_TOKEN does not work here');
    // 另一轮正在跑（锁未过期）：这次跳过。
    env.DB.db.prepare(`INSERT INTO agg_meta (k, v) VALUES ('sync_lock', ?)`).run(String(Date.now()));
    assert.equal(await trigger('Bearer sync-secret'), 202);
    assert.equal(rows(`SELECT * FROM agg_items`).length, 0);
    env.DB.db.exec(`DELETE FROM agg_meta WHERE k = 'sync_lock'`);
    assert.equal(await trigger('Bearer sync-secret'), 202);
    assert.ok(rows(`SELECT * FROM agg_items`).length > 0);
    assert.equal(rows(`SELECT * FROM agg_meta WHERE k = 'sync_lock'`).length, 0, 'lock released');
});

test('sync stops starting node requests once its time budget is spent, and resumes from the saved cursor', async () => {
    const first = await runSync(env, Date.now(), { maxRequests: 50, timeBudgetMs: -1 });
    assert.equal(first.stopped, 'time');
    assert.equal(calls.length, 0, 'no node request after the deadline');
    await syncAll();
    assert.equal(rows(`SELECT * FROM agg_items`).length, 5);
});

test('AGG_EXCLUDE_NODES keeps a node out of the aggregate and removes its copies', async () => {
    await syncAll();
    env.AGG_EXCLUDE_NODES = 'nodeA';
    __resetAggUpstreamForTest(); calls = [];
    await syncAll();
    assert.equal(rows(`SELECT * FROM agg_sources WHERE prefix = 'nodeA'`).length, 0);
    assert.ok(!calls.some(c => c.host === 'a.example'), 'the excluded node is not contacted');
    assert.ok(rows(`SELECT name FROM agg_items`).some(r => r.name === 'Dune'), 'nodeB titles stay');
});

test('batched merge: a page of 250 titles takes a handful of D1 round trips; duplicates inside one page still merge', async () => {
    const many = Array.from({ length: 250 }, (_, i) => mv('x' + i, 'Film ' + i, 2000 + (i % 20), { Tmdb: String(90000 + i) }));
    // 同一节点同一页里的同一部片（Tmdb 相同）和只靠片名+年份的重复。
    many.push(mv('dupA', 'Twin', 1999, { Tmdb: '777' }), mv('dupB', 'Twin Copy', 1999, { Tmdb: '777', Imdb: 'tt777' }));
    many.push(mv('nA', 'No Ids', 2011), mv('nB', 'No  Ids!', 2011));
    nodes['a.example'].items.L1 = many;
    let trips = 0; let inBatch = false;
    const prep = env.DB.prepare.bind(env.DB); const batch = env.DB.batch.bind(env.DB);
    env.DB.prepare = (sql) => { const st = prep(sql); const wrap = (f) => async (...a) => { if (!inBatch) trips++; return f(...a); }; return { bind(...a) { st.bind(...a); return this; }, first: wrap(st.first), all: wrap(st.all), run: wrap(st.run) }; };
    env.DB.batch = async (stmts) => { trips++; inBatch = true; try { return await batch(stmts); } finally { inBatch = false; } };
    await syncAll();
    env.DB.prepare = prep; env.DB.batch = batch;
    assert.ok(trips < 60, `D1 round trips for the whole sync: ${trips}`); // 逐条合并时约 1000 次
    const twin = rows(`SELECT i.vid, i.imdb FROM agg_items i JOIN agg_sources s USING (vid) WHERE s.item_id IN ('dupA', 'dupB')`);
    assert.equal(new Set(twin.map(r => r.vid)).size, 1, 'same Tmdb inside one page → one title');
    assert.equal(twin[0].imdb, 'tt777', 'the second copy fills the missing Imdb');
    const noIds = rows(`SELECT DISTINCT vid FROM agg_sources WHERE item_id IN ('nA', 'nB')`);
    assert.equal(noIds.length, 1, 'no provider ids: name+year still merges within one page');
    assert.equal(rows(`SELECT COUNT(*) AS n FROM agg_sources WHERE prefix = 'nodeA' AND lib_id = 'L1'`)[0].n, 254);
    assert.equal(new Set(rows(`SELECT vid FROM agg_items`).map(r => r.vid)).size, rows(`SELECT vid FROM agg_items`).length);
});

test('a D1 error while merging stops only that node for this run; its cursor stays and the next run finishes', async () => {
    const batch = env.DB.batch.bind(env.DB); let failed = false;
    env.DB.batch = async (stmts) => { if (!failed) { failed = true; throw new Error('D1_ERROR: Network connection lost.'); } return batch(stmts); };
    const s1 = await runSync(env, Date.now(), { maxRequests: 50 });
    env.DB.batch = batch;
    assert.match(s1.nodes.nodeA.error, /Network connection lost/);
    assert.ok(s1.nodes.nodeB && !s1.nodes.nodeB.error, 'the other node still synced in the same run');
    assert.equal(rows(`SELECT COUNT(*) AS n FROM agg_items i WHERE NOT EXISTS (SELECT 1 FROM agg_sources s WHERE s.vid = i.vid)`)[0].n, 0, 'no title without a copy');
    await syncAll();
    assert.equal(rows(`SELECT * FROM agg_items`).length, 5);
});

test('a node still on its first sync goes before the hourly checks of nodes that are done', async () => {
    const t0 = Date.parse('2026-02-01T00:00:00Z');
    await syncAll(t0);
    // nodeB 的首轮被打回未完成；nodeA 刚同步过但也到期（一小时后），排序上 nodeA 更久没同步。
    env.DB.db.exec(`UPDATE agg_sync SET since = '', libs = '[]', li = 0, start = 0, updated_at = ${t0 + 1000} WHERE prefix = 'nodeB'`);
    env.DB.db.exec(`UPDATE agg_sync SET updated_at = ${t0} WHERE prefix = 'nodeA'`);
    calls = [];
    await runSync(env, t0 + 2 * 3600000, { maxRequests: 50, pageDelayMs: 0 });
    const hosts = calls.filter(c => c.path === '/Users/UID/Items' || c.path === '/Users/UID/Views').map(c => c.host);
    assert.equal(hosts[0], 'b.example', 'the unfinished first sync starts first');
});

test('sync waits between page requests to the same node (AGG_PAGE_DELAY_MS)', async () => {
    const at = [];
    const orig = globalThis.fetch;
    globalThis.fetch = async (input, init) => { const r = input instanceof Request ? input : new Request(input, init); if (new URL(r.url).pathname.endsWith('/Users/UID/Items')) at.push(Date.now()); return orig(input, init); };
    await runSync(env, Date.now(), { maxRequests: 50, pageDelayMs: 40 });
    globalThis.fetch = orig;
    assert.ok(at.length >= 3);
    for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 35, `gap ${at[i] - at[i - 1]} ms`);
});

test('every version is listed: each file of each copy, a second copy on the same node too', async () => {
    nodes['a.example'].libs.push({ Id: 'L4', CollectionType: 'movies' });
    nodes['a.example'].items.L4 = [mv('a1dup', 'Inception', 2010, { Tmdb: '27205' })];
    nodes['b.example'].items.M1[0].MediaSources = [
        { Id: 'b-4k', Name: '2160p', Size: 9e9, Container: 'mkv', MediaStreams: [{ Type: 'Video', Codec: 'hevc', Height: 2160 }] },
        { Id: 'b-hd', Name: '1080p', Size: 3e9, Container: 'mkv', MediaStreams: [{ Type: 'Video', Codec: 'h264', Height: 1080 }] }];
    const { token, vid } = await playable();
    assert.equal(rows(`SELECT COUNT(*) AS n FROM agg_sources WHERE vid = ?`, vid)[0].n, 3, 'two copies on nodeA, one on nodeB');
    const d = (await call(`/emby/Users/x/Items/${vid}`, { token })).body;
    assert.deepEqual(d.MediaSources.map(m => m.Id).sort(), ['nodeA~ms-a1', 'nodeA~ms-a1dup', 'nodeB~b-4k', 'nodeB~b-hd']);
    assert.equal(d.MediaSources.length, 4, 'nodeA x2 copies, nodeB x2 files');
    assert.deepEqual(d.MediaSources.slice(2).map(m => m.Name), ['nodeB · 2160p', 'nodeB · 1080p']);
});


test('ids: every aggregate id round-trips to its node id', () => {
    assert.deepEqual(decodeId(seasonId(1001, 2)), { vid: 1001, season: 2 });
    assert.deepEqual(decodeId(episodeId(1001, 2, 7)), { vid: 1001, season: 2, episode: 7 });
    assert.equal(decodeId('1001'), null, 'catalog vids are not derived ids');
    assert.deepEqual(decodeMsid(encodeMsid('nodeA', 'x~y'), ['nodeA']), { prefix: 'nodeA', id: 'x~y' });
    assert.equal(decodeMsid(encodeMsid('nodeZ', 'x'), ['nodeA']), null, 'a node the viewer cannot use');
    assert.equal(nodeUrl('nodeA', '/emby/videos/1/stream?x=1'), '/n/nodeA/videos/1/stream?x=1');
    assert.equal(nodeUrl('nodeA', 'https://agg.test/n/nodeA/https://a/x'), 'https://agg.test/n/nodeA/https://a/x', 'absolute URLs are left to forward.js');
    assert.deepEqual(parseNodeUrl('/emby/n/nodeA/videos/1/stream'), { prefix: 'nodeA', rest: '/videos/1/stream' });
    assert.deepEqual(parseNodeUrl(new URL(lazyUrl('node A', 'i1', '', 'T'), 'https://x').pathname), { prefix: 'node A', lazy: { itemId: 'i1', msid: '' } });
});

test('the node is reached like through the main proxy: redirects stay inside the aggregate, allowlisted ones go straight, custom headers apply', async () => {
    await syncAll();
    const { token } = await viewer('v1', [['nodeA']]);
    env.DB.db.prepare(`UPDATE routes SET custom_headers = 'X-Node-Key: k1' WHERE prefix = 'nodeA'`).run();
    __resetAggUpstreamForTest();
    // 去节点自己路径的 3xx 留在 /n/nodeA 下，令牌换回 viewer 的；节点的自定义请求头照发。
    calls = [];
    const rel = await call('/n/nodeA/videos/a1/rel.mkv', { token });
    assert.equal(rel.status, 302);
    assert.equal(rel.location, `/n/nodeA/emby/videos/a1/stream.mkv?api_key=${token}`);
    assert.equal(calls.find(c => c.path === '/videos/a1/rel.mkv').key, 'k1');
    assert.equal((await call(rel.location, { bare: true })).body, 'VIDEO-a.example-a1-stream.mkv');
    // 去别的主机的 3xx 经聚合端转发（同生产），附上 viewer 令牌；发往那台主机时不带任何令牌。
    const cdn = await call(`/n/nodeA/videos/a1/cdn.mkv?api_key=${token}`, { bare: true });
    assert.equal(cdn.location, `/n/nodeA/${encodeURIComponent('https://cdn.example/f/a1?sig=1')}?api_key=${encodeURIComponent(token)}`);
    calls = [];
    const got = await call(cdn.location, { bare: true });
    assert.equal(got.body, 'CDN-/f/a1');
    assert.deepEqual(calls.map(c => [c.host, c.query, c.auth, c.token]), [['cdn.example', { sig: '1' }, null, null]], 'no viewer or node token reaches the CDN');
    assert.equal((await call(cdn.location.replace(/api_key=[^&]+/, 'api_key=bad'), { bare: true })).status, 401, 'still needs a viewer token');
    // 手动重定向白名单里的主机：3xx 原样给客户端。
    env.DB.db.prepare(`INSERT OR REPLACE INTO kv_config (k, v) VALUES ('manual_redirect_domains', 'cdn.example')`).run();
    __resetConfigCache();
    assert.equal((await call(`/n/nodeA/videos/a1/cdn.mkv?api_key=${token}`, { bare: true })).location, 'https://cdn.example/f/a1?sig=1');
});

test('a node that gives absolute stream URLs: PlaybackInfo points them through the aggregate, like the main proxy', async () => {
    await syncAll();
    const { token } = await viewer('v1', [['nodeA']]);
    nodes['a.example'].absUrls = true;
    const vid = rows(`SELECT vid FROM agg_items WHERE name = 'Arrival'`)[0].vid;
    const r = await pbi(vid, token);
    const url = r.body.MediaSources[0].DirectStreamUrl;
    assert.equal(url, `${ORIGIN}/n/nodeA/https://a.example/emby/videos/a3/stream.mkv?Static=true&MediaSourceId=ms-a3&api_key=${token}`);
    calls = [];
    const got = await call(url.slice(ORIGIN.length), { bare: true });
    assert.equal(got.body, 'VIDEO-a.example-a3-stream.mkv');
    assert.equal(calls[0].query.api_key, 'TOK-a.example-dev1', 'the node gets its own token back');
    assert.equal((await call(`/n/nodeA/https://a.example/emby/Users/UID/Items?api_key=${token}`, { bare: true })).status, 403, 'only /Videos/ on the node itself');
});

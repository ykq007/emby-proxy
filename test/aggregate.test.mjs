// 聚合 Worker（src/aggregate/）：目录同步去重、增量、对账、写入预算、
// viewer 登录与可见范围、浏览端点、详情、图片。真实 SQL（node:sqlite）+ 两个假 Emby 节点。
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { ensureSchema, __resetSchemaReadyForTest } from '../src/db/schema.js';
import { encryptSecret, encryptToken } from '../src/emby/tokens.js';
import { createViewer, grantAccess, updateViewer, clearResolveCache } from '../src/viewers/store.js';
import { ensureAggSchema, __resetAggSchemaForTest } from '../src/aggregate/schema.js';
import { __resetAggUpstreamForTest } from '../src/aggregate/upstream.js';
import { __resetAggAuthForTest } from '../src/aggregate/auth.js';
import { __resetPlaybackForTest, PROGRESS_WRITE_MS } from '../src/aggregate/playback.js';
import { __resetSeriesForTest, CACHE_MS } from '../src/aggregate/series.js';
import { UPSTREAM_CB } from '../src/proxy/circuit-breaker.js';
import { runSync } from '../src/aggregate/sync.js';
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

// 假 Emby 节点。令牌绑定登录设备（TOK-<host>-<DeviceId>），换设备用就 401——验证设备身份前后一致。
function fakeEmby(req) {
    const u = new URL(req.url);
    const host = u.host; const node = nodes[host];
    if (node.down) throw new TypeError('network down');
    const p = u.pathname.replace(/^\/emby/, '');
    const q = u.searchParams;
    calls.push({ host, auth: req.headers.get('X-Emby-Authorization'), method: req.method, path: p, query: Object.fromEntries(q), ua: req.headers.get('User-Agent'), device: devOf(req, u), range: req.headers.get('Range') });
    const json = (d, status = 200) => Response.json(d, { status });
    if (p === '/Users/AuthenticateByName') {
        if (/^Mozilla/.test(req.headers.get('User-Agent') || '')) return json({}, 403);
        return json({ AccessToken: `TOK-${host}-${devOf(req, u)}`, User: { Id: 'UID' }, ServerId: 'S-' + host });
    }
    const tok = req.headers.get('X-Emby-Token') || q.get('api_key') || '';
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
        return json({ Items: list.slice(start, start + limit), TotalRecordCount: list.length });
    }
    let m;
    if ((m = /^\/Shows\/(\w+)\/(Seasons|Episodes)$/.exec(p))) {
        const sh = (node.shows || {})[m[1]] || { seasons: [], episodes: [] };
        const list = m[2] === 'Seasons' ? sh.seasons : sh.episodes;
        return json({ Items: list, TotalRecordCount: list.length });
    }
    if (p === '/Users/UID/Items/Latest') return json(node.latest || []);
    if ((m = /^\/Users\/UID\/Items\/(\w+)$/.exec(p))) {
        const it = Object.values(node.items).flat().find(x => x.Id === m[1]);
        return it ? json({ ...it, Overview: 'From ' + host, People: [{ Id: 'person1', Name: 'Actor', Type: 'Actor', PrimaryImageTag: 'x' }], MediaSources: [{ Id: 'ms' }] }) : json({}, 404);
    }
    if ((m = /^\/Items\/(\w+)\/Images\/Primary$/.exec(p))) return new Response(`IMG-${host}-${m[1]}-${q.get('tag')}`, { headers: { 'content-type': 'image/jpeg' } });
    if ((m = /^\/Items\/(\w+)\/PlaybackInfo$/.exec(p))) {
        const id = m[1]; const ms = q.get('MediaSourceId') || `ms-${id}`;
        return json({
            PlaySessionId: `PS-${host}`,
            MediaSources: [{
                Id: ms, ItemId: id, Name: '1080p', Path: `/mnt/media/${id}.mkv`, Container: 'mkv',
                DirectStreamUrl: `/videos/${id}/stream.mkv?Static=true&MediaSourceId=${ms}&api_key=${tok}`,
                TranscodingUrl: `/emby/videos/${id}/master.m3u8?MediaSourceId=${ms}&PlaySessionId=PS-${host}&api_key=${tok}`,
                MediaStreams: [{ Type: 'Subtitle', Index: 2, DeliveryUrl: `/Videos/${id}/${ms}/Subtitles/2/Stream.srt?api_key=${tok}` }],
            }],
        });
    }
    if ((m = /^\/videos\/(\w+)\/(.+)$/i.exec(p))) {
        if (m[2].endsWith('.m3u8')) return new Response(`#EXTM3U\nmain.m3u8?MediaSourceId=${q.get('MediaSourceId')}&PlaySessionId=PS-${host}&api_key=${tok}\n`, { headers: { 'content-type': 'application/vnd.apple.mpegurl' } });
        return new Response(`VIDEO-${host}-${m[1]}-${m[2]}`, { status: req.headers.get('Range') ? 206 : 200, headers: { 'content-type': 'video/x-matroska' } });
    }
    if (/^\/Sessions\/Playing/.test(p) || p === '/Videos/ActiveEncodings') return new Response(null, { status: 204 });
    return json({}, 404);
}

beforeEach(async () => {
    __resetSchemaReadyForTest(); __resetAggSchemaForTest(); __resetAggUpstreamForTest(); __resetAggAuthForTest(); __resetPlaybackForTest(); __resetSeriesForTest(); UPSTREAM_CB.clear(); clearResolveCache();
    env = { DB: createD1Sqlite(), ADMIN_TOKEN: 'admin-secret' };
    await ensureSchema(env);
    await ensureAggSchema(env);
    const pw = await encryptSecret(env, 'pw');
    for (const [prefix, host, order] of [['nodeA', 'a.example', 0], ['nodeB', 'b.example', 1]]) {
        env.DB.db.prepare(`INSERT INTO routes (prefix, target, emby_username, emby_password_enc, viewers_enabled, sort_order) VALUES (?, ?, 'shared', ?, 1, ?)`)
            .run(prefix, 'https://' + host, pw, order);
        env.DB.db.prepare(`INSERT INTO visitor_logs (prefix, ua) VALUES (?, ?), (?, 'Mozilla/5.0 Chrome')`).run(prefix, LOG_UA, prefix);
    }
    // 生产 viewer 网关存下的真实设备：同步会话照搬它的身份。nodeB 没有设备（借 nodeA 的），浏览器设备不用。
    const dev = async (prefix, ident) => env.DB.db.prepare(`INSERT INTO viewer_device_sessions (prefix, device_id, blob) VALUES (?, ?, ?)`)
        .run(prefix, ident.deviceId, await encryptToken(env, prefix, JSON.stringify({ token: 't', userId: 'UID', ident })));
    await dev('nodeA', { client: 'Emby Web', device: 'Chrome', deviceId: '0000aaaa', version: '4.8', ua: 'Mozilla/5.0 Chrome' });
    await dev('nodeA', REAL_DEV);
    nodes = fixtures(); calls = [];
    const orig = globalThis.fetch;
    globalThis.fetch = async (input, init) => fakeEmby(input instanceof Request ? input : new Request(input, init));
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
    const r = await worker.fetch(new Request(ORIGIN + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() { } });
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, body: /json/.test(ct) ? await r.json() : await r.text() };
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

test('sync logins copy a real viewer device (client, device, version, UA) with a new device id, never a browser', async () => {
    await syncAll();
    const logins = calls.filter(c => c.path === '/Users/AuthenticateByName');
    assert.deepEqual(logins.map(c => c.host).sort(), ['a.example', 'b.example'], 'nodeB borrows nodeA\'s device');
    for (const c of logins) {
        assert.equal(c.ua, REAL_DEV.ua);
        assert.equal(c.auth, `MediaBrowser Client="Hills", Device="Pixel 8", DeviceId="${c.device}", Version="1.9.0"`);
        assert.match(c.device, /^[0-9a-f]{16}$/);
        assert.notEqual(c.device, REAL_DEV.deviceId, 'never the real device\'s own id');
    }
    assert.ok(calls.every(c => !/^Mozilla/.test(c.ua || '')));

    // 令牌失效后重新登录：还是同一台设备。
    const before = logins.find(c => c.host === 'a.example').device;
    nodes['a.example'].revoked = new Set([`TOK-a.example-${before}`]);
    __resetAggUpstreamForTest(); calls = [];
    env.DB.db.exec(`UPDATE agg_sync SET since = ''`);
    await syncAll();
    assert.deepEqual([...new Set(calls.filter(c => c.path === '/Users/AuthenticateByName' && c.host === 'a.example').map(c => c.device))], [before]);
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
    const d = await call(`/emby/Users/x/Items/${vid}`, { token });
    assert.equal(d.status, 200);
    assert.equal(d.body.Id, String(vid));
    assert.equal(d.body.Overview, 'From a.example', 'nodeA sorts first');
    assert.deepEqual(d.body.People, [{ Name: 'Actor', Type: 'Actor' }]);
    assert.equal(d.body.MediaSources, undefined);
    const bob = await viewer('bob', [['nodeB']]);
    assert.equal((await call(`/emby/Users/x/Items/${vid}`, { token: bob.token })).body.Overview, 'From b.example');
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

test('PlaybackInfo offers one version per node, routed through the aggregate server; node tokens and paths never leak', async () => {
    const { token, vid } = await playable();
    const r = await pbi(vid, token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const ms = r.body.MediaSources;
    assert.deepEqual(ms.map(m => m.Id), ['nodeA~ms-a1', 'nodeB~ms-b1']);
    assert.deepEqual(ms.map(m => m.Name), ['1080p · Source 1', '1080p · Source 2']);
    assert.ok(ms.every(m => m.ItemId === String(vid) && m.Path === undefined));
    assert.equal(ms[0].DirectStreamUrl, `/n/nodeA/videos/a1/stream.mkv?Static=true&MediaSourceId=ms-a1&api_key=${token}`);
    assert.ok(ms[0].TranscodingUrl.startsWith('/n/nodeA/videos/a1/master.m3u8?'));
    assert.ok(ms[1].MediaStreams[0].DeliveryUrl.startsWith('/n/nodeB/Videos/b1/ms-b1/Subtitles/2/Stream.srt?'));
    assert.equal(r.body.PlaySessionId, 'PS-a.example');
    assert.ok(!JSON.stringify(r.body).includes('TOK-'), 'no node token in the response');

    const asked = calls.filter(c => c.path.endsWith('/PlaybackInfo'));
    assert.deepEqual(asked.map(c => [c.host, c.query.UserId, c.device]), [['a.example', 'UID', 'dev1'], ['b.example', 'UID', 'dev1']]);
    assert.ok(calls.every(c => c.ua === LOG_UA), 'upstream sees the client device UA, never a browser one');
    assert.deepEqual(slots(), [{ prefix: 'nodeA', device_id: 'dev1' }], 'only the primary node takes a slot');
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

test('picking a version pins PlaybackInfo to that node', async () => {
    const { token, vid } = await playable();
    const r = await pbi(vid, token, '&MediaSourceId=' + encodeURIComponent('nodeB~ms-b1'));
    assert.deepEqual(r.body.MediaSources.map(m => m.Id), ['nodeB~ms-b1']);
    const asked = calls.filter(c => c.path.endsWith('/PlaybackInfo'));
    assert.deepEqual(asked.map(c => [c.host, c.query.MediaSourceId]), [['b.example', 'ms-b1']]);
    assert.deepEqual(slots(), [{ prefix: 'nodeB', device_id: 'dev1' }]);
});

test('client-built stream URLs are mapped to the real item on the right node, with Range passed through', async () => {
    const { token, vid } = await playable();
    const r = await call(`/Videos/${vid}/stream.mkv?Static=true&MediaSourceId=${encodeURIComponent('nodeB~ms-b1')}&api_key=${token}`, { bare: true, range: 'bytes=0-99' });
    assert.equal(r.status, 206);
    assert.equal(r.body, 'VIDEO-b.example-b1-stream.mkv');
    const up = calls.find(c => c.path.startsWith('/Videos/'));
    assert.equal(up.path, '/Videos/b1/stream.mkv');
    assert.equal(up.query.MediaSourceId, 'ms-b1');
    assert.equal(up.query.api_key, 'TOK-b.example-dev1', 'viewer token swapped for the device session token');
    assert.equal(up.range, 'bytes=0-99');

    const sub = await call(`/Videos/${vid}/${encodeURIComponent('nodeA~ms-a1')}/Subtitles/2/Stream.srt?api_key=${token}`, { bare: true });
    assert.equal(sub.body, 'VIDEO-a.example-a1-ms-a1/Subtitles/2/Stream.srt');
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
    const seg = await call(`/Videos/${vid}/hls1/main/0.ts?PlaySessionId=PS-b.example&api_key=${token}`, { bare: true });
    assert.equal(seg.body, 'VIDEO-b.example-b1-hls1/main/0.ts');

    assert.equal((await call(`/n/nodeA/Users/UID/Items?api_key=${token}`, { bare: true })).status, 403, 'only /Videos/ is reachable');
    assert.equal((await call(`/n/nodeA/videos/a1/stream.mkv?api_key=${token}`, { method: 'POST', token })).status, 403, 'read-only');
    const bob = await viewer('bob', [['nodeB']]);
    assert.equal((await call(`/n/nodeA/videos/a1/stream.mkv?api_key=${bob.token}`, { bare: true })).status, 403, 'no access to nodeA');
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
    assert.equal((await call(`/emby/Items/${E(3, 1)}/Images/Primary?tag=pb9e31`)).body, 'IMG-b.example-b9e31-pb9e31');
    // 一屏缩略图同时到达：共用一次上游请求。
    __resetSeriesForTest(); calls = [];
    await Promise.all([E(1, 1), E(1, 2), E(2, 1)].map(id => call(`/emby/Items/${id}/Images/Primary?tag=p`)));
    // 节点数据缓存 + 并发合并：每个节点的剧集只取了一次。
    assert.equal(calls.filter(c => c.path === '/Shows/a9/Episodes').length, 1);
    assert.equal(calls.filter(c => c.path === '/Shows/b9/Episodes').length, 1);
});

test('series: an episode on one node plays from that node; one on two nodes offers both versions', async () => {
    const { token, E } = await seriesSetup();
    const only = await pbi(E(3, 1), token);
    assert.equal(only.status, 200, JSON.stringify(only.body));
    assert.deepEqual(only.body.MediaSources.map(m => m.Id), ['nodeB~ms-b9e31']);
    assert.ok(only.body.MediaSources.every(m => m.ItemId === E(3, 1)));
    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token, body: { ItemId: E(3, 1), MediaSourceId: 'nodeB~ms-b9e31', PositionTicks: 0 } });
    const both = await pbi(E(2, 1), token);
    assert.deepEqual(both.body.MediaSources.map(m => m.Id), ['nodeA~ms-a9e21', 'nodeB~ms-b9e21']);
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

test('favorites and played marks are stored locally and never sent to the node', async () => {
    const { token, movie } = await seriesSetup();
    const r = await call(`/emby/Users/x/FavoriteItems/${movie}`, { method: 'POST', token });
    assert.equal(r.body.IsFavorite, true);
    const fav = (await call('/emby/Users/x/Items?Filters=IsFavorite&Recursive=true', { token })).body;
    assert.deepEqual(fav.Items.map(i => [i.Id, i.UserData.IsFavorite]), [[String(movie), true]]);
    await call(`/emby/Users/x/PlayedItems/${movie}`, { method: 'POST', token });
    assert.equal((await call(`/emby/Users/x/Items/${movie}`, { token })).body.UserData.Played, true);
    await call(`/emby/Users/x/FavoriteItems/${movie}`, { method: 'DELETE', token });
    assert.equal((await call('/emby/Users/x/Items?Filters=IsFavorite', { token })).body.Items.length, 0);
    assert.ok(!calls.some(c => /FavoriteItems|PlayedItems|UserData/.test(c.path)), JSON.stringify(calls.map(c => c.path)));
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

// 聚合 Worker（src/aggregate/）：目录同步去重、增量、对账、写入预算、
// viewer 登录与可见范围、浏览端点、详情、图片。真实 SQL（node:sqlite）+ 两个假 Emby 节点。
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { ensureSchema, __resetSchemaReadyForTest } from '../src/db/schema.js';
import { encryptSecret } from '../src/emby/tokens.js';
import { createViewer, grantAccess, updateViewer, clearResolveCache } from '../src/viewers/store.js';
import { ensureAggSchema, __resetAggSchemaForTest } from '../src/aggregate/schema.js';
import { __resetAggUpstreamForTest } from '../src/aggregate/upstream.js';
import { __resetAggAuthForTest } from '../src/aggregate/auth.js';
import { runSync } from '../src/aggregate/sync.js';
import worker from '../src/aggregate/index.js';
import { createD1Sqlite } from './helpers/d1-sqlite.mjs';

const ORIGIN = 'https://agg.test';
const LOG_UA = 'Hills/1.9.0 (android; 17)';
const DAY = 86400000;
let env; let restoreFetch; let nodes; let calls;

const mv = (Id, Name, year, ProviderIds = {}, saved = '2026-01-01T00:00:00Z') =>
    ({ Id, Name, Type: 'Movie', ProductionYear: year, ProviderIds, DateCreated: saved, DateLastSaved: saved, ImageTags: { Primary: 'p' + Id }, BackdropImageTags: ['b' + Id], Genres: ['Drama'] });
const sr = (Id, Name, year, ProviderIds = {}) =>
    ({ ...mv(Id, Name, year, ProviderIds), Type: 'Series' });

function fixtures() {
    return {
        'a.example': {
            libs: [{ Id: 'L1', CollectionType: 'movies' }, { Id: 'L2', CollectionType: 'tvshows' }, { Id: 'L3', CollectionType: 'music' }],
            items: {
                L1: [mv('a1', 'Inception', 2010, { Tmdb: '27205', Imdb: 'tt1375666' }), mv('a2', 'Local Film', 2020), mv('a3', 'Arrival', 2016, { Tmdb: '329865' })],
                L2: [sr('a9', 'Breaking Bad', 2008, { Tvdb: '81189', Tmdb: '1396' })],
                L3: [{ Id: 'a20', Name: 'Song', Type: 'Audio' }],
            },
        },
        'b.example': {
            libs: [{ Id: 'M1', CollectionType: 'movies' }, { Id: 'M2', CollectionType: 'tvshows' }],
            items: {
                M1: [mv('b1', 'Inception', 2010, { IMDB: 'tt1375666' }), mv('b2', 'Local  Film!', 2020), mv('b3', 'Dune', 2021, { Tmdb: '438631' })],
                M2: [sr('b9', 'Breaking Bad', 2008, { Tvdb: '81189' })],
            },
        },
    };
}

function fakeEmby(req) {
    const u = new URL(req.url);
    const host = u.host; const node = nodes[host];
    const p = u.pathname.replace(/^\/emby/, '');
    const q = u.searchParams;
    calls.push({ host, path: p, query: Object.fromEntries(q), ua: req.headers.get('User-Agent') });
    const json = (d, status = 200) => Response.json(d, { status });
    if (p === '/Users/AuthenticateByName') {
        if (/^Mozilla/.test(req.headers.get('User-Agent') || '')) return json({}, 403);
        return json({ AccessToken: 'TOK-' + host, User: { Id: 'UID' }, ServerId: 'S-' + host });
    }
    if (req.headers.get('X-Emby-Token') !== 'TOK-' + host) return json({}, 401);
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
    if ((m = /^\/Users\/UID\/Items\/(\w+)$/.exec(p))) {
        const it = Object.values(node.items).flat().find(x => x.Id === m[1]);
        return it ? json({ ...it, Overview: 'From ' + host, People: [{ Id: 'person1', Name: 'Actor', Type: 'Actor', PrimaryImageTag: 'x' }], MediaSources: [{ Id: 'ms' }] }) : json({}, 404);
    }
    if ((m = /^\/Items\/(\w+)\/Images\/Primary$/.exec(p))) return new Response(`IMG-${host}-${m[1]}-${q.get('tag')}`, { headers: { 'content-type': 'image/jpeg' } });
    return json({}, 404);
}

beforeEach(async () => {
    __resetSchemaReadyForTest(); __resetAggSchemaForTest(); __resetAggUpstreamForTest(); __resetAggAuthForTest(); clearResolveCache();
    env = { DB: createD1Sqlite(), ADMIN_TOKEN: 'admin-secret' };
    await ensureSchema(env);
    await ensureAggSchema(env);
    const pw = await encryptSecret(env, 'pw');
    for (const [prefix, host, order] of [['nodeA', 'a.example', 0], ['nodeB', 'b.example', 1]]) {
        env.DB.db.prepare(`INSERT INTO routes (prefix, target, emby_username, emby_password_enc, viewers_enabled, sort_order) VALUES (?, ?, 'shared', ?, 1, ?)`)
            .run(prefix, 'https://' + host, pw, order);
        env.DB.db.prepare(`INSERT INTO visitor_logs (prefix, ua) VALUES (?, ?), (?, 'Mozilla/5.0 Chrome')`).run(prefix, LOG_UA, prefix);
    }
    nodes = fixtures(); calls = [];
    const orig = globalThis.fetch;
    globalThis.fetch = async (input, init) => fakeEmby(input instanceof Request ? input : new Request(input, init));
    restoreFetch = () => { globalThis.fetch = orig; };
});
afterEach(() => restoreFetch());

const rows = (sql, ...b) => env.DB.db.prepare(sql).all(...b);
const syncAll = async (now = Date.now(), opts = {}) => { let s; for (let i = 0; i < 10; i++) { s = await runSync(env, now, { maxRequests: 50, ...opts }); if (!s.stopped) break; } return s; };

async function call(path, { method = 'GET', token, body } = {}) {
    const headers = { 'User-Agent': LOG_UA, 'X-Emby-Authorization': `MediaBrowser Client="Hills", Device="Pixel", DeviceId="dev1", Version="1.9.0"${token ? `, Token="${token}"` : ''}` };
    if (body) headers['content-type'] = 'application/json';
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

test('upstream logins use the node log UA, never a browser UA', async () => {
    await syncAll();
    const logins = calls.filter(c => c.path === '/Users/AuthenticateByName');
    assert.equal(logins.length, 2);
    assert.ok(logins.every(c => c.ua === LOG_UA), JSON.stringify(logins));
    assert.ok(calls.every(c => !/^Mozilla/.test(c.ua || '')));
});

test('incremental sync: second pass asks only for changes and writes nothing when nothing changed', async () => {
    const t0 = Date.parse('2026-02-01T00:00:00Z');
    await syncAll(t0);
    calls = [];
    const s = await syncAll(t0 + 600000);
    assert.equal(s.writes, 0);
    const pages = calls.filter(c => c.path === '/Users/UID/Items');
    assert.ok(pages.length && pages.every(c => c.query.MinDateLastSaved), 'every page is incremental');
    assert.equal(calls.filter(c => c.path === '/Users/AuthenticateByName').length, 0, 'sessions are reused');

    // 强制重新全量：条目都没变，指纹相同，一行不写。
    env.DB.db.exec(`UPDATE agg_sync SET since = ''`);
    const full = await syncAll(t0 + 700000);
    assert.equal(full.writes, 0);

    // 节点上新增一部片：下一轮增量带上它，且并入已有作品（Arrival 的 tmdb）。
    nodes['b.example'].items.M1.push(mv('b4', 'Arrival', 2016, { Tmdb: '329865' }, '2026-02-01T00:05:00Z'));
    await syncAll(t0 + 1200000);
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

test('item detail comes from the first visible copy with node-specific ids stripped; playback is not offered yet', async () => {
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
    assert.equal((await call(`/emby/Items/${vid}/PlaybackInfo`, { token })).status, 501);
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

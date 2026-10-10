// Viewers：登录、令牌替换、并发限制、独立观看状态、媒体库隐藏、管理端校验。
// 真实 SQL（node:sqlite）+ 假上游 Emby（stub fetch），走完整 proxyRequest 路径。
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { proxyRequest } from '../src/proxy/engine.js';
import { handleViewers } from '../src/api/viewers.js';
import { handleRoutes } from '../src/api/routes.js';
import { ensureSchema, __resetSchemaReadyForTest } from '../src/db/schema.js';
import { __setConfigForTest, __resetConfigCache } from '../src/proxy/config-cache.js';
import { encryptSecret } from '../src/emby/tokens.js';
import { clearResolveCache } from '../src/viewers/store.js';
import { __resetUpstreamMemForTest } from '../src/viewers/upstream.js';
import { __resetSlotsForTest } from '../src/viewers/limits.js';
import { createD1Sqlite } from './helpers/d1-sqlite.mjs';

const ORIGIN = 'https://proxy.test';
const UP = 'https://up.example';
const UPTOK = 'UPSTREAM_TOKEN_123';
let env; let expireNext = false; let seen; let restoreFetch; let upstreamLogins; let loginUas; let loginDevices; let logouts; let tokenDevice;
const devOf = (req, u) => (/DeviceId="?([^",]+)/i.exec(req.headers.get('X-Emby-Authorization') || u.searchParams.get('X-Emby-Authorization') || '') || [])[1]
    || req.headers.get('X-Emby-Device-Id') || u.searchParams.get('DeviceId') || '';

// 上游 Emby 的最小仿真：共享账号的 Played 历史是 true，用来验证覆盖不泄露。
// 像 sntp：每次登录发一个绑定到登录设备的令牌（UPTOK-<DeviceId>），换设备用就是 invalid_token。
function fakeUpstream(req) {
    const u = new URL(req.url);
    const p = u.pathname.replace(/^\/emby/, '');
    const json = (d, status = 200) => Response.json(d, { status });
    if (p === '/Users/AuthenticateByName') {
        upstreamLogins++;
        loginUas.push(req.headers.get('User-Agent'));
        const dev = devOf(req, u);
        loginDevices.push(dev);
        if (/^Mozilla/.test(req.headers.get('User-Agent') || '')) return json({}, 403);
        return req.clone().json().then(b => b.Pw === 'wrong' ? json({ message: 'bad' }, 401) : json({ AccessToken: `${UPTOK}-${dev}`, User: { Id: 'U1' }, ServerId: 'S1' }));
    }
    const tok = req.headers.get('X-Emby-Token') || u.searchParams.get('api_key') || u.searchParams.get('X-Emby-Token') || '';
    if (!tok.startsWith(UPTOK + '-')) return json({ message: 'bad token' }, 401);
    if (expireNext) { expireNext = false; return json({ message: 'expired' }, 401); }
    const tokDev = tok.slice(UPTOK.length + 1);
    const reqDev = devOf(req, u);
    if (reqDev && reqDev !== tokDev) return json({ ErrorCode: 'invalid_token' }, 401);
    if (p === '/Sessions/Logout') { logouts.push(tokDev); return new Response(null, { status: 204 }); }
    let m;
    if ((m = /^\/Users\/U1\/Items\/(\w+)$/.exec(p))) {
        const ep = { e1: [1, 1], e2: [1, 2], e3: [1, 3] }[m[1]];
        return json(ep ? { Id: m[1], Type: 'Episode', SeriesId: 'ser', ParentIndexNumber: ep[0], IndexNumber: ep[1], RunTimeTicks: 1000, UserData: { Played: true } }
            : { Id: m[1], Type: 'Movie', RunTimeTicks: 1000, UserData: { Played: true } });
    }
    if (p === '/Users/U1/Items') {
        // 像 Emby：按它自己的排序（这里按 Id）返回，不按 Ids 的顺序。
        const ids = (u.searchParams.get('Ids') || 'm1,m2').split(',').sort();
        return json({ Items: ids.map(Id => ({ Id, UserData: { Played: true, IsFavorite: true, PlaybackPositionTicks: 5 } })), TotalRecordCount: ids.length });
    }
    if (p === '/Users/U1/Views') return json({ Items: [{ Id: 'L1', Name: 'Movies', Type: 'CollectionFolder' }, { Id: 'L2', Name: 'Anime', Type: 'CollectionFolder' }], TotalRecordCount: 2 });
    if (p === '/Users/U1') return json({ Id: 'U1', Name: 'shared', Policy: { IsAdministrator: true } });
    if (/^\/Items\/\w+\/PlaybackInfo$/.test(p)) return json({ MediaSources: [{ DirectStreamUrl: `/Videos/1/stream?api_key=${tok}` }] });
    if (/^\/Videos\/\w+\/master\.m3u8$/.test(p)) return new Response(`#EXTM3U\nseg0.ts?api_key=${tok}\n`, { headers: { 'content-type': 'application/vnd.apple.mpegurl' } });
    if (/^\/Sessions\/Playing/.test(p)) return new Response(null, { status: 204 });
    if ((m = /^\/Users\/U1\/(PlayedItems|FavoriteItems)\/(\w+)(?:\/Delete)?$/.exec(p))) return json({ Played: true, IsFavorite: true, PlaybackPositionTicks: 0 });
    if (/^\/Users\/U1\/Items\/\w+\/HideFromResume$/.test(p)) return json({ Played: true, IsFavorite: true, PlaybackPositionTicks: 0 });
    if (p === '/Shows/ser/Episodes') return json({ Items: ['e1', 'e2', 'e3'].map((Id, i) => ({ Id, ParentIndexNumber: 1, IndexNumber: i + 1, UserData: {} })) });
    return json({ path: p });
}

beforeEach(async () => {
    __resetConfigCache(); __resetSchemaReadyForTest(); clearResolveCache(); __resetUpstreamMemForTest(); __resetSlotsForTest();
    env = { DB: createD1Sqlite(), ADMIN_TOKEN: 'admin-secret' };
    await ensureSchema(env);
    env.DB.db.prepare(`INSERT INTO routes (prefix, target, emby_username, emby_password_enc, max_concurrent, viewers_enabled) VALUES (?, ?, ?, ?, ?, 1)`)
        .run('node1', UP, 'shared', await encryptSecret(env, 'pw'), 2);
    __setConfigForTest({ routesMap: new Map([['node1', { prefix: 'node1', target: UP, mode: 'off', cache_img: 'on', custom_headers: '', keepalive_days: 0, viewers_enabled: 1 }]]) });
    seen = []; upstreamLogins = 0; loginUas = []; loginDevices = []; logouts = []; tokenDevice = new Map();
    const orig = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        const req = input instanceof Request ? input : new Request(input, init);
        seen.push({ url: req.url, headers: [...req.headers].map(([k, v]) => `${k}: ${v}`).join('\n') });
        return fakeUpstream(req);
    };
    restoreFetch = () => { globalThis.fetch = orig; };
});
afterEach(() => restoreFetch());

async function admin(method, path, body) {
    const req = new Request(ORIGIN + path, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } });
    const r = await handleViewers(req, env, { waitUntil() { } }, new URL(req.url));
    return { status: r.status, body: await r.json() };
}

// 真实客户端一个令牌对应一台设备：不指定 device 时沿用该令牌登录时的设备。
async function call(path, { method = 'GET', token, body, device, country, ua = 'TestClient' } = {}) {
    device = device || tokenDevice.get(token) || 'dev1';
    const headers = { 'User-Agent': ua, 'X-Emby-Authorization': `MediaBrowser Client="T", Device="D", DeviceId="${device}", Version="1"` };
    if (country) headers['cf-ipcountry'] = country;
    if (token) headers['X-Emby-Token'] = token;
    if (body) headers['content-type'] = 'application/json';
    const pending = [];
    const ctx = { waitUntil(p) { pending.push(p); } };
    const req = new Request(`${ORIGIN}/node1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const r = await proxyRequest(req, env, ctx, new URL(req.url));
    await Promise.all(pending);
    return r;
}

async function loginAs(username, device) {
    const r = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: username, Pw: 'secret1' }, device });
    assert.equal(r.status, 200);
    const d = await r.json();
    tokenDevice.set(d.AccessToken, device);
    return d;
}

async function makeViewer(username, quota = 1, hidden = []) {
    const { body } = await admin('POST', '/api/viewers', { username, password: 'secret1' });
    await admin('POST', '/api/viewers/access', { viewer_id: body.id, prefix: 'node1', quota, hidden_libraries: hidden });
    const d = await loginAs(username, 'dev-' + username);
    return { id: body.id, token: d.AccessToken, login: d };
}

test('viewer login returns an ev_ token and the upstream user id, with the viewer name', async () => {
    const { token, login } = await makeViewer('alice');
    assert.match(token, /^ev_[0-9a-f]{32}$/);
    assert.equal(login.User.Id, 'U1');
    assert.equal(login.User.Name, 'alice');
    assert.equal(login.ServerId, 'S1');
    assert.equal(login.User.Policy.IsAdministrator, false);
});

test('wrong password → 401; unknown username is forwarded to upstream', async () => {
    await makeViewer('alice');
    const bad = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'nope' } });
    assert.equal(bad.status, 401);
    const before = upstreamLogins;
    const other = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'someone', Pw: 'x' } });
    assert.equal(other.status, 200);
    assert.equal(upstreamLogins, before + 1);
});

test('viewer token is swapped for the upstream token and never leaks either way', async () => {
    const { token } = await makeViewer('alice');
    seen = [];
    const pi = await call('/emby/Items/m1/PlaybackInfo', { token });
    const piText = await pi.text();
    assert.ok(piText.includes(`api_key=${token}`), piText);
    assert.ok(!piText.includes(UPTOK));
    const hls = await call(`/emby/Videos/m1/master.m3u8?api_key=${token}`, { device: 'dev-alice' });
    const hlsText = await hls.text();
    assert.ok(hlsText.includes(token) && !hlsText.includes(UPTOK), hlsText);
    assert.ok(seen.length > 0);
    for (const s of seen) assert.ok(!s.url.includes('ev_') && !s.headers.includes('ev_'), `leaked to upstream: ${s.url}\n${s.headers}`);
});

test('unknown / revoked ev_ token → 401; revoking access takes effect', async () => {
    const { id, token } = await makeViewer('alice');
    assert.equal((await call('/emby/Users/U1/Items', { token: 'ev_' + '0'.repeat(32) })).status, 401);
    assert.equal((await call('/emby/Users/U1/Items', { token })).status, 200);
    await admin('DELETE', `/api/viewers/access?viewer_id=${id}&prefix=node1`);
    assert.equal((await call('/emby/Users/U1/Items', { token })).status, 401);
});

test('GET /Users/{id} is renamed to the viewer and loses admin', async () => {
    const { token } = await makeViewer('alice');
    const d = await (await call('/emby/Users/U1', { token })).json();
    assert.equal(d.Name, 'alice');
    assert.equal(d.Policy.IsAdministrator, false);
});

test('viewers cannot delete items or edit the shared account', async () => {
    const { token } = await makeViewer('alice');
    assert.equal((await call('/emby/Items/m1', { method: 'DELETE', token })).status, 403);
    assert.equal((await call('/emby/Users/U1/Policy', { method: 'POST', token, body: {} })).status, 403);
    assert.equal((await call('/emby/Items/m1/Delete', { method: 'POST', token })).status, 403, 'POST …/Delete form');
    assert.equal((await call('/emby/Items?Ids=m1', { method: 'DELETE', token })).status, 403, 'bulk delete');
    assert.equal((await call('/emby/Items/Delete?Ids=m1', { method: 'POST', token })).status, 403, 'bulk POST delete');
    assert.equal((await call('/emby/Users/U1/Delete', { method: 'POST', token })).status, 403, 'delete shared account');
});

test('mark unplayed / unfavorite via DELETE or the POST …/Delete form clears local watch state', async () => {
    const a = await makeViewer('alice');
    const state = async () => (await (await call('/emby/Users/U1/Items', { token: a.token })).json()).Items.map(i => [i.Id, i.UserData.Played, i.UserData.IsFavorite]);
    await call('/emby/Users/U1/PlayedItems/m1', { method: 'POST', token: a.token });
    await call('/emby/Users/U1/FavoriteItems/m2', { method: 'POST', token: a.token });
    assert.deepEqual(await state(), [['m1', true, false], ['m2', false, true]]);

    const r = await call('/emby/Users/U1/PlayedItems/m1/Delete', { method: 'POST', token: a.token });
    const ud = await r.json();
    assert.equal(ud.Played, false);
    assert.equal(ud.LastPlayedDate, undefined, 'Emby clears LastPlayedDate on mark unplayed');
    await call('/emby/Users/U1/FavoriteItems/m2/Delete', { method: 'POST', token: a.token });
    assert.deepEqual(await state(), [['m1', false, false], ['m2', false, false]]);

    await call('/emby/Users/U1/PlayedItems/m1', { method: 'POST', token: a.token });
    await call('/emby/Users/U1/PlayedItems/m1', { method: 'DELETE', token: a.token });
    assert.deepEqual(await state(), [['m1', false, false], ['m2', false, false]]);
});

test('HideFromResume hides like Emby: progress kept, whole series hidden, replay or Hide=false brings it back', async () => {
    const a = await makeViewer('alice');
    const progress = (ItemId, PositionTicks) => call('/emby/Sessions/Playing/Progress', { method: 'POST', token: a.token, body: { ItemId, PositionTicks } });
    const hide = (id, h = true) => call(`/emby/Users/U1/Items/${id}/HideFromResume?Hide=${h}`, { method: 'POST', token: a.token });
    for (const [id, pos] of [['e1', 300], ['e2', 400], ['m1', 100], ['m2', 200]]) await progress(id, pos);
    const resume = async () => (await (await call('/emby/Users/U1/Items/Resume', { token: a.token })).json()).Items.map(i => i.Id).sort();
    assert.deepEqual(await resume(), ['e2', 'm1', 'm2']);

    const r = await hide('m1');
    assert.equal((await r.json()).PlaybackPositionTicks, 100, 'position kept');
    const nextUp = async () => (await (await call('/emby/Shows/NextUp', { token: a.token })).json()).Items.map(i => i.Id);
    assert.deepEqual(await nextUp(), ['e2']);
    await hide('e1');
    assert.deepEqual(await resume(), ['m2'], 'hiding any episode hides the series');
    assert.deepEqual(await nextUp(), [], 'and drops it from Next Up');
    const m1 = await (await call('/emby/Users/U1/Items/m1', { token: a.token })).json();
    assert.equal(m1.UserData.PlaybackPositionTicks, 100, 'still resumable from where it stopped');

    await hide('m1', false);
    assert.deepEqual(await resume(), ['m1', 'm2'], 'Hide=false restores');
    await call('/emby/Sessions/Playing', { method: 'POST', token: a.token, body: { ItemId: 'e3', PositionTicks: 0 } });
    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token: a.token, body: { ItemId: 'e3', PositionTicks: 500 } });
    assert.deepEqual(await resume(), ['e3', 'm1', 'm2'], 'playing the series again brings it back');
    assert.deepEqual(await nextUp(), ['e3']);
});

test('concurrency: viewer quota and node cap → 429; same device refreshes; stop releases', async () => {
    const a = await makeViewer('alice', 1);
    const b = await makeViewer('bob', 1);
    const a2 = (await loginAs('alice', 'alice-tv')).AccessToken;
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a.token })).status, 200);
    assert.equal((await call('/emby/Items/m2/PlaybackInfo', { token: a.token })).status, 200, 'same device refreshes');
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a2 })).status, 429, 'viewer quota');
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: b.token })).status, 200);
    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token: a.token, body: { ItemId: 'm2', PositionTicks: 10 } });
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a2 })).status, 200, 'slot released');
});

test('concurrency: node cap applies across viewers and expired slots are reclaimed', async () => {
    env.DB.db.exec(`UPDATE routes SET max_concurrent = 0`);
    const a = await makeViewer('alice', 0);
    const a2 = (await loginAs('alice', 'alice-tv')).AccessToken;
    env.DB.db.exec(`UPDATE routes SET max_concurrent = 1`);
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a.token })).status, 200);
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a2 })).status, 429, 'node cap');
    env.DB.db.exec(`UPDATE playback_slots SET heartbeat_at = 0`);
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a2 })).status, 200, 'expired reclaimed');
});

test('concurrency: PlaybackInfo without playback frees the slot after the pending window', async () => {
    const a = await makeViewer('alice', 1);
    const a2 = (await loginAs('alice', 'alice-tv')).AccessToken;
    const age = (ms) => env.DB.db.exec(`UPDATE playback_slots SET heartbeat_at = heartbeat_at - ${ms}`);
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a.token })).status, 200);
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a2 })).status, 429, 'pending slot still counts');
    age(61_000);
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a2 })).status, 200, 'unplayed slot reclaimed');
    await call('/emby/Sessions/Playing', { method: 'POST', token: a2, body: { ItemId: 'm1' } });
    age(61_000);
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a.token })).status, 429, 'playing slot keeps full TTL');
});

test('concurrency: streams need a slot too, so a late play after the pending window cannot pass the quota', async () => {
    const a = await makeViewer('alice', 1);
    const a2 = (await loginAs('alice', 'alice-tv')).AccessToken;
    assert.equal((await call('/emby/Items/m1/PlaybackInfo', { token: a.token })).status, 200);
    env.DB.db.exec(`UPDATE playback_slots SET heartbeat_at = heartbeat_at - 61000`); // 详情页取了 PlaybackInfo，一分钟后才按播放
    assert.equal((await call('/emby/Videos/m1/master.m3u8', { token: a2 })).status, 200, 'the TV takes the free slot by streaming');
    assert.equal((await call('/emby/Videos/m1/master.m3u8', { token: a.token })).status, 429, 'the first device is now over quota');
    assert.notEqual((await call('/emby/Videos/m1/ms1/Subtitles/2/Stream.srt', { token: a.token })).status, 429, 'subtitles are not playback');
    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token: a2, body: { ItemId: 'm1', PositionTicks: 10 } });
    assert.equal((await call('/emby/Videos/m1/master.m3u8', { token: a.token })).status, 200, 'free again after Stopped');
});

test('watch state is per viewer and hides the shared upstream history', async () => {
    const a = await makeViewer('alice');
    const b = await makeViewer('bob');
    const fresh = await (await call('/emby/Users/U1/Items', { token: b.token })).json();
    assert.deepEqual(fresh.Items.map(i => [i.UserData.Played, i.UserData.IsFavorite, i.UserData.PlaybackPositionTicks]), [[false, false, 0], [false, false, 0]]);

    const w = await call('/emby/Users/U1/PlayedItems/m1', { method: 'POST', token: a.token });
    assert.equal((await w.json()).Played, true);
    await call('/emby/Users/U1/FavoriteItems/m2', { method: 'POST', token: a.token });

    const ai = await (await call('/emby/Users/U1/Items', { token: a.token })).json();
    assert.deepEqual(ai.Items.map(i => [i.Id, i.UserData.Played, i.UserData.IsFavorite]), [['m1', true, false], ['m2', false, true]]);
    const bi = await (await call('/emby/Users/U1/Items', { token: b.token })).json();
    assert.ok(bi.Items.every(i => !i.UserData.Played && !i.UserData.IsFavorite));

    const fav = await (await call('/emby/Users/U1/Items?Filters=IsFavorite&Recursive=true', { token: a.token })).json();
    assert.deepEqual(fav.Items.map(i => i.Id), ['m2']);
    const favB = await (await call('/emby/Users/U1/Items?Filters=IsFavorite', { token: b.token })).json();
    assert.equal(favB.TotalRecordCount, 0);
});

test('watch history (SortBy=DatePlayed) is sorted, filtered and paged locally; upstream is asked only for the page', async () => {
    const a = await makeViewer('alice');
    for (const id of ['m1', 'e1', 'm3', 'm2']) {
        await call(`/emby/Users/U1/PlayedItems/${id}`, { method: 'POST', token: a.token });
        await new Promise(r => setTimeout(r, 2)); // last_played 是毫秒
    }
    const history = async (q) => {
        seen = [];
        const d = await (await call(`/emby/Users/U1/Items?Filters=IsPlayed&Recursive=true&IncludeItemTypes=Movie&SortBy=DatePlayed,SortName${q}`, { token: a.token })).json();
        const up = new URL(seen.find(x => new URL(x.url).pathname === '/emby/Users/U1/Items').url).searchParams;
        return { ids: d.Items.map(i => i.Id), total: d.TotalRecordCount, upIds: up.get('Ids'), upPaged: up.has('StartIndex') || up.has('Limit') };
    };
    assert.deepEqual(await history('&SortOrder=Descending&StartIndex=0&Limit=2'), { ids: ['m2', 'm3'], total: 3, upIds: 'm2,m3', upPaged: false });
    assert.deepEqual(await history('&SortOrder=Descending&StartIndex=2&Limit=2'), { ids: ['m1'], total: 3, upIds: 'm1', upPaged: false });
    assert.deepEqual(await history('&SortOrder=Ascending&Limit=2'), { ids: ['m1', 'm3'], total: 3, upIds: 'm1,m3', upPaged: false });
    const past = await (await call('/emby/Users/U1/Items?Filters=IsPlayed&SortBy=DatePlayed&StartIndex=10&Limit=5', { token: a.token })).json();
    assert.deepEqual(past, { Items: [], TotalRecordCount: 4 });

    // 本地答不了的条件（ParentId）：照旧把全部 Id 交给上游筛选、排序、分页。
    seen = [];
    await call('/emby/Users/U1/Items?Filters=IsPlayed&ParentId=L1&SortBy=DatePlayed&Limit=2', { token: a.token });
    const up = new URL(seen.find(x => new URL(x.url).pathname === '/emby/Users/U1/Items').url).searchParams;
    assert.deepEqual([up.get('Ids').split(',').sort(), up.get('Limit')], [['e1', 'm1', 'm2', 'm3'], '2']);
});

test('a watch write that meets an expired upstream token reaches upstream after re-login and is stored', async () => {
    const a = await makeViewer('alice');
    for (const [path, body] of [['/emby/Sessions/Playing/Stopped', { ItemId: 'm2', PositionTicks: 950 }], ['/emby/Users/U1/FavoriteItems/m1', null]]) {
        expireNext = true; seen = [];
        const r = await call(path, { method: 'POST', token: a.token, body });
        assert.equal(r.status < 300, true, `${path} answered ${r.status}`);
        assert.equal(seen.filter(x => new URL(x.url).pathname === path).length, 2, `${path} sent twice`);
    }
    const row = env.DB.db.prepare(`SELECT played, is_favorite FROM watch_state WHERE viewer_id = ? AND item_id = ?`);
    assert.deepEqual([{ ...row.get(a.id, 'm2') }, { ...row.get(a.id, 'm1') }].map(x => [x.played, x.is_favorite]), [[1, 0], [0, 1]]);
});

test('failed upstream write stores nothing locally', async () => {
    const a = await makeViewer('alice');
    restoreFetch();
    const orig = globalThis.fetch;
    globalThis.fetch = async () => new Response('boom', { status: 500 });
    try {
        const r = await call('/emby/Users/U1/PlayedItems/m1', { method: 'POST', token: a.token });
        assert.equal(r.status, 500);
    } finally { globalThis.fetch = orig; }
    const rows = env.DB.db.prepare(`SELECT COUNT(*) AS n FROM watch_state WHERE viewer_id = ?`).get(a.id);
    assert.equal(rows.n, 0);
});

test('progress feeds Continue Watching (one per series) and 90% stop marks played', async () => {
    const a = await makeViewer('alice');
    await call('/emby/Sessions/Playing/Progress', { method: 'POST', token: a.token, body: { ItemId: 'e1', PositionTicks: 300 } });
    await call('/emby/Sessions/Playing/Progress', { method: 'POST', token: a.token, body: { ItemId: 'e2', PositionTicks: 400 } });
    await call('/emby/Sessions/Playing/Progress', { method: 'POST', token: a.token, body: { ItemId: 'm1', PositionTicks: 100 } });
    const resume = await (await call('/emby/Users/U1/Items/Resume', { token: a.token })).json();
    assert.deepEqual(resume.Items.map(i => i.Id).sort(), ['e2', 'm1']);
    assert.equal(resume.Items.find(i => i.Id === 'm1').UserData.PlaybackPositionTicks, 100);

    await call('/emby/Sessions/Playing/Stopped', { method: 'POST', token: a.token, body: { ItemId: 'e2', PositionTicks: 950 } });
    const next = await (await call('/emby/Shows/NextUp', { token: a.token })).json();
    assert.deepEqual(next.Items.map(i => i.Id), ['e3']);
    const resume2 = await (await call('/emby/Users/U1/Items/Resume', { token: a.token })).json();
    assert.deepEqual(resume2.Items.map(i => i.Id).sort(), ['e1', 'm1'], 'e2 finished; series falls back to e1 still in progress');
    const next2 = await (await call('/emby/Shows/NextUp', { token: a.token })).json();
    assert.deepEqual(next2.Items.map(i => i.Id), ['e3'], 'e2 is the most recent play');

    await new Promise(r => setTimeout(r, 2)); // last_played 是毫秒；同一毫秒内 e1 与 e2 打平
    await call('/emby/Sessions/Playing/Progress', { method: 'POST', token: a.token, body: { ItemId: 'e1', PositionTicks: 350 } });
    const next3 = await (await call('/emby/Shows/NextUp', { token: a.token })).json();
    assert.deepEqual(next3.Items.map(i => i.Id), ['e1'], 'going back to e1 makes it Next Up, like Emby');
});

test('Continue Watching still works behind a country allowlist (proxy-built requests keep cf-ipcountry)', async () => {
    const a = await makeViewer('alice');
    __setConfigForTest({ countrySet: new Set(['MY']), routesMap: new Map([['node1', { prefix: 'node1', target: UP, mode: 'off', cache_img: 'on', custom_headers: '', keepalive_days: 0, viewers_enabled: 1 }]]) });
    await call('/emby/Sessions/Playing/Progress', { method: 'POST', token: a.token, body: { ItemId: 'm1', PositionTicks: 100 }, country: 'MY' });
    const resume = await (await call('/emby/Users/U1/Items/Resume', { token: a.token, country: 'MY' })).json();
    assert.deepEqual(resume.Items.map(i => i.Id), ['m1']);
    const row = env.DB.db.prepare(`SELECT item_type FROM watch_state WHERE viewer_id = ? AND item_id = 'm1'`).get(a.id);
    assert.ok(row.item_type, 'item metadata fetched through the gate');
});

test('hidden libraries are dropped from Views only for that viewer', async () => {
    const a = await makeViewer('alice', 1, ['L2']);
    const b = await makeViewer('bob');
    const va = await (await call('/emby/Users/U1/Views', { token: a.token })).json();
    assert.deepEqual(va.Items.map(i => i.Id), ['L1']);
    assert.equal(va.TotalRecordCount, 1);
    const vb = await (await call('/emby/Users/U1/Views', { token: b.token })).json();
    assert.deepEqual(vb.Items.map(i => i.Id), ['L1', 'L2']);
});

test('admin: quota sum cannot exceed node cap; cap cannot drop below granted quotas', async () => {
    const v1 = (await admin('POST', '/api/viewers', { username: 'v1', password: 'secret1' })).body.id;
    const v2 = (await admin('POST', '/api/viewers', { username: 'v2', password: 'secret1' })).body.id;
    assert.equal((await admin('POST', '/api/viewers/access', { viewer_id: v1, prefix: 'node1', quota: 2 })).status, 200);
    const over = await admin('POST', '/api/viewers/access', { viewer_id: v2, prefix: 'node1', quota: 1 });
    assert.equal(over.status, 400);
    assert.equal((await admin('POST', '/api/viewers/access', { viewer_id: v1, prefix: 'node1', quota: 1 })).status, 200, 're-grant excludes own quota');
    assert.equal((await admin('POST', '/api/viewers/access', { viewer_id: v2, prefix: 'node1', quota: 1 })).status, 200);
    assert.equal((await admin('POST', '/api/viewers/node', { prefix: 'node1', max_concurrent: 1 })).status, 400);
    assert.equal((await admin('POST', '/api/viewers/node', { prefix: 'node1', max_concurrent: 3 })).status, 200);
    assert.equal((await admin('POST', '/api/viewers', { username: 'v1', password: 'secret1' })).status, 409);
});

test('admin: disabling a viewer revokes their tokens', async () => {
    const a = await makeViewer('alice');
    await admin('POST', '/api/viewers', { id: a.id, enabled: false });
    assert.equal((await call('/emby/Users/U1/Items', { token: a.token })).status, 401);
    const relog = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'secret1' } });
    assert.equal(relog.status, 401);
});

test('upstream 401 drops the cached upstream session and re-logs in', async () => {
    const a = await makeViewer('alice');
    __resetUpstreamMemForTest();
    const ident = { client: 'T', device: 'D', deviceId: 'dev-alice', version: '1', ua: 'TestClient' };
    env.DB.db.prepare(`UPDATE viewer_device_sessions SET blob = ? WHERE prefix = 'node1' AND device_id = 'dev-alice'`).run(
        await (await import('../src/emby/tokens.js')).encryptToken(env, 'node1', JSON.stringify({ token: 'STALE', userId: 'U1', serverId: 'S1', ident })));
    const before = upstreamLogins;
    const r = await call('/emby/Users/U1/Items', { token: a.token });
    assert.equal(r.status, 200);
    assert.equal(upstreamLogins, before + 1);
});

test('switch off: node skips the viewer gate, viewer usernames go to upstream', async () => {
    const a = await makeViewer('alice');
    __setConfigForTest({ routesMap: new Map([['node1', { prefix: 'node1', target: UP, mode: 'off', cache_img: 'on', custom_headers: '', keepalive_days: 0, viewers_enabled: 0 }]]) });
    const before = upstreamLogins;
    const login = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'secret1' } });
    assert.equal(login.status, 200);
    assert.equal(upstreamLogins, before + 1, 'login forwarded to upstream');
    assert.equal((await call('/emby/Users/U1/Items', { token: a.token })).status, 401, 'viewer token not swapped');
});

test('switch on requires a working upstream login; grants need the switch on', async () => {
    env.DB.db.exec(`INSERT INTO routes (prefix, target) VALUES ('bare', '${UP}')`);
    const v = (await admin('POST', '/api/viewers', { username: 'v1', password: 'secret1' })).body.id;
    assert.equal((await admin('POST', '/api/viewers/access', { viewer_id: v, prefix: 'bare', quota: 1 })).status, 400, 'switch off');
    const on = await admin('POST', '/api/viewers/node', { prefix: 'bare', viewers_enabled: true });
    assert.equal(on.status, 400, 'no Emby credentials on node');
    assert.match(on.body.error, /没有 Emby 账号/);
    env.DB.db.prepare(`UPDATE routes SET emby_username = 'shared', emby_password_enc = ? WHERE prefix = 'bare'`).run(await encryptSecret(env, 'wrong'));
    const bad = await admin('POST', '/api/viewers/node', { prefix: 'bare', viewers_enabled: true });
    assert.match(bad.body.error, /用户名或密码不对/);
    assert.equal(env.DB.db.prepare(`SELECT viewers_enabled FROM routes WHERE prefix = 'bare'`).get().viewers_enabled, 0);
    assert.equal((await admin('POST', '/api/viewers/node', { prefix: 'node1', viewers_enabled: false })).status, 200);
    assert.equal((await admin('POST', '/api/viewers/node', { prefix: 'node1', viewers_enabled: true })).status, 200);
});

test('editing a node keeps its viewer settings; renaming it moves viewer access', async () => {
    const a = await makeViewer('alice');
    const save = async (body) => {
        const req = new Request(ORIGIN + '/api/routes', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
        const r = await handleRoutes(req, env, { waitUntil() { } }, new URL(req.url));
        assert.equal(r.status, 200, await r.clone().text());
    };
    await save({ prefix: 'node1', oldPrefix: 'node1', target: UP, remark: 'edited' });
    let row = env.DB.db.prepare(`SELECT max_concurrent, viewers_enabled, remark FROM routes WHERE prefix = 'node1'`).get();
    assert.deepEqual({ ...row }, { max_concurrent: 2, viewers_enabled: 1, remark: 'edited' });
    await save({ prefix: 'node2', oldPrefix: 'node1', target: UP });
    row = env.DB.db.prepare(`SELECT max_concurrent, viewers_enabled FROM routes WHERE prefix = 'node2'`).get();
    assert.deepEqual({ ...row }, { max_concurrent: 2, viewers_enabled: 1 });
    const acc = env.DB.db.prepare(`SELECT prefix FROM viewer_access WHERE viewer_id = ?`).all(a.id).map(r => r.prefix);
    assert.deepEqual(acc, ['node2']);
});

test('upstream login uses a real client UA from visitor logs, never a browser UA; custom headers win', async () => {
    env.DB.db.exec(`INSERT INTO visitor_logs (prefix, ua) VALUES ('node1', 'Hills/1.9.0 (android; 17)'), ('node1', 'Mozilla/5.0 Chrome')`);
    const req = { username: 'v1', password: 'secret1' };
    await admin('POST', '/api/viewers', req);
    const off = await admin('POST', '/api/viewers/node', { prefix: 'node1', viewers_enabled: true });
    assert.equal(off.status, 200, JSON.stringify(off.body));
    assert.equal(loginUas.at(-1), 'Hills/1.9.0 (android; 17)');
    env.DB.db.exec(`UPDATE routes SET custom_headers = 'User-Agent: Custom/1' WHERE prefix = 'node1'`);
    assert.equal((await admin('POST', '/api/viewers/node', { prefix: 'node1', viewers_enabled: true })).status, 200);
    assert.equal(loginUas.at(-1), 'Custom/1');
    assert.deepEqual(logouts, ['node1-admin-check', 'node1-admin-check'], 'check logins are logged out upstream');
});

test('each viewer device is its own upstream device; identity passes through unchanged', async () => {
    const a = await makeViewer('alice');
    const b = await makeViewer('bob');
    assert.deepEqual(loginDevices.filter(d => d.startsWith('dev-')), ['dev-alice', 'dev-bob']);
    seen = [];
    assert.equal((await call('/emby/Users/U1/Items', { token: a.token })).status, 200);
    assert.equal((await call('/emby/Users/U1/Items', { token: b.token })).status, 200);
    assert.match(seen[0].headers, /DeviceId="dev-alice"/);
    assert.match(seen[0].headers, new RegExp(`x-emby-token: ${UPTOK}-dev-alice`));
    assert.match(seen[1].headers, /DeviceId="dev-bob"/);
    assert.ok(seen.every(x => !x.headers.includes('node1-viewers') && !x.headers.includes('ev_')));
});

test('identity sent only in the URL (Hills style) logs in and is forwarded as-is', async () => {
    await makeViewer('alice');
    const auth = encodeURIComponent('Emby Client="Hills", Device="PNM-N49", DeviceId="2863f15995b48bf3", Version="1.9.1"');
    const lr = new Request(`${ORIGIN}/node1/emby/Users/AuthenticateByName?X-Emby-Authorization=${auth}`,
        { method: 'POST', headers: { 'User-Agent': 'Hills/1.9.1', 'content-type': 'application/json' }, body: JSON.stringify({ Username: 'alice', Pw: 'secret1' }) });
    const login = await (await proxyRequest(lr, env, { waitUntil() { } }, new URL(lr.url))).json();
    assert.equal(loginDevices.at(-1), '2863f15995b48bf3');
    assert.equal(login.SessionInfo.Client, 'Hills');
    const req = new Request(`${ORIGIN}/node1/emby/Users/U1/Views?X-Emby-Authorization=${auth}&X-Emby-Token=${login.AccessToken}`, { headers: { 'User-Agent': 'Hills/1.9.1' } });
    const r = await proxyRequest(req, env, { waitUntil() { } }, new URL(req.url));
    assert.equal(r.status, 200);
    assert.ok(seen.at(-1).url.includes('2863f15995b48bf3') && seen.at(-1).url.includes(`${UPTOK}-2863f15995b48bf3`), seen.at(-1).url);
});

test('viewer logout signs that device out upstream too', async () => {
    const a = await makeViewer('alice');
    assert.equal((await call('/emby/Sessions/Logout', { method: 'POST', token: a.token })).status, 204);
    assert.deepEqual(logouts, ['dev-alice']);
    assert.equal(env.DB.db.prepare(`SELECT COUNT(*) AS n FROM viewer_device_sessions`).get().n, 0);
    assert.equal((await call('/emby/Users/U1/Items', { token: a.token })).status, 401);
});

test('viewers cannot use a browser: login and token requests from a browser UA get 403 and never reach upstream', async () => {
    const { token } = await makeViewer('alice');
    const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0';
    const before = upstreamLogins; seen = [];
    const login = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'secret1' }, ua: BROWSER });
    assert.equal(login.status, 403);
    assert.match((await login.json()).message, /use an Emby app/);
    const wrong = await call('/emby/Users/AuthenticateByName', { method: 'POST', body: { Username: 'alice', Pw: 'nope' }, ua: BROWSER });
    assert.equal(wrong.status, 401, 'a wrong password still says 401, so a browser cannot probe viewer names');
    const views = await call('/emby/Users/U1/Views', { token, ua: BROWSER });
    assert.equal(views.status, 403);
    assert.equal(upstreamLogins, before);
    assert.equal(seen.length, 0, 'nothing was sent upstream');
    assert.equal((await call('/emby/Users/U1/Views', { token })).status, 200, 'the same token still works from an app');
});

/**
 * Tests for src/routing/route.js — the Route module that owns routes' column
 * sets, routeName(), and the config-cache invalidation decision for every
 * write path (#16).
 *
 * Core guarantee under test: a write only invalidates proxy/config-cache.js's
 * per-isolate cache when it touches a column that cache actually reads
 * (HOT_PATH_COLUMNS == HOT_PATH_SELECT, the exact SELECT config-cache issues).
 * A write to any other column (sort_order, keepalive_*, emby_auth_*, ...)
 * must NOT force the next getConfig() to reload.
 *
 * Runner: node --test
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    HOT_PATH_COLUMNS,
    touchesHotPathColumn,
    routeName,
    updateRouteColumns,
    reorderRoutes,
    upsertRoute,
    importRoute,
    deleteRoute,
    seedKeepaliveBaseline,
    markKeepaliveReminded,
    cacheEmbyAuthToken,
    clearEmbyAuthCache,
    UPSERT_COLUMNS,
    IMPORT_COLUMNS,
} from '../src/routing/route.js';
import { getConfig, __resetConfigCache } from '../src/proxy/config-cache.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

beforeEach(() => { __resetConfigCache(); });

// ---------------------------------------------------------------------------
// Mock D1 env — minimal prepare/bind/run/all/batch chain. No handlers: every
// SELECT resolves empty (enough for a valid, if empty, warm config-cache
// load); every write is a no-op whose only observable effect is showing up
// in the fake's call log.
// ---------------------------------------------------------------------------

function makeDB() {
    const db = createD1Fake([]);
    // runCalls: writes issued via dbRun()'s .run() (not batch participants —
    // reorderRoutes/markKeepaliveReminded route through dbBatch()/.batch()).
    Object.defineProperty(db, 'runCalls', { get: () => db.log.filter(l => l.kind === 'run') });
    Object.defineProperty(db, 'batchCalls', { get: () => db.batches });
    return db;
}

// A warm getConfig() cache primed via a real (mocked) batch load, so we can
// observe whether a subsequent write forces the next getConfig() to reload.
async function primeWarmCache(db) {
    // config-cache.js issues its own env.DB.batch([routesStmt, kvStmt]); the
    // mock's prepare()/all() above returns empty results for both, which is
    // enough to produce a valid (if empty) warm cache.
    const first = await getConfig({ DB: db });
    assert.equal(first.cacheHit, false, 'sanity: first call is a cold load');
}

async function isWarm(db) {
    const r = await getConfig({ DB: db });
    return r.cacheHit;
}

// ---------------------------------------------------------------------------
// touchesHotPathColumn — pure decision function
// ---------------------------------------------------------------------------

test('touchesHotPathColumn: every HOT_PATH_COLUMNS member triggers true individually', () => {
    for (const col of HOT_PATH_COLUMNS) {
        assert.equal(touchesHotPathColumn([col]), true, `${col} should be recognized as hot-path`);
    }
});

test('touchesHotPathColumn: non-hot-path columns → false', () => {
    for (const col of ['sort_order', 'last_play', 'keepalive_last_played_at', 'keepalive_last_reminded_at', 'emby_auth_cache', 'emby_auth_seen_at', 'emby_auth_used_at', 'monitor_enabled', 'emby_username', 'emby_password_enc', 'show_on_status']) {
        assert.equal(touchesHotPathColumn([col]), false, `${col} should NOT be hot-path`);
    }
});

test('touchesHotPathColumn: mixed list is true if ANY column is hot-path', () => {
    assert.equal(touchesHotPathColumn(['sort_order', 'target']), true);
});

test('touchesHotPathColumn: empty/undefined → false', () => {
    assert.equal(touchesHotPathColumn([]), false);
    assert.equal(touchesHotPathColumn(undefined), false);
});

// ---------------------------------------------------------------------------
// routeName — the single display-name implementation
// ---------------------------------------------------------------------------

test('routeName: public_alias wins over remark and prefix', () => {
    assert.equal(routeName({ prefix: 'p', remark: 'r', public_alias: 'a' }), 'a');
});

test('routeName: falls back to remark when public_alias is empty', () => {
    assert.equal(routeName({ prefix: 'p', remark: 'r', public_alias: '' }), 'r');
});

test('routeName: falls back to prefix when both are empty', () => {
    assert.equal(routeName({ prefix: 'p', remark: '', public_alias: '' }), 'p');
});

test('routeName: null/undefined route → empty string, no throw', () => {
    assert.equal(routeName(null), '');
    assert.equal(routeName(undefined), '');
});

// ---------------------------------------------------------------------------
// CORE: updateRouteColumns invalidation decision — cached column invalidates,
// non-cached column does not.
// ---------------------------------------------------------------------------

test('updateRouteColumns: writing a cached hot-path column (target) invalidates the config cache', async () => {
    const db = makeDB();
    await primeWarmCache(db);
    assert.equal(await isWarm(db), true, 'still warm before the write');

    await updateRouteColumns({ DB: db }, 'myemby', { target: 'https://new-upstream.example.com' });

    assert.equal(await isWarm(db), false, 'writing target must force the next getConfig() to reload');
});

test('updateRouteColumns: writing a non-cached column (sort_order) does NOT invalidate the config cache', async () => {
    const db = makeDB();
    await primeWarmCache(db);
    assert.equal(await isWarm(db), true, 'still warm before the write');

    await updateRouteColumns({ DB: db }, 'myemby', { sort_order: 5 });

    assert.equal(await isWarm(db), true, 'writing sort_order must NOT force a reload');
});

test('updateRouteColumns: mixed write (sort_order + mode) invalidates because mode is hot-path', async () => {
    const db = makeDB();
    await primeWarmCache(db);

    await updateRouteColumns({ DB: db }, 'myemby', { sort_order: 5, mode: 'proxy' });

    assert.equal(await isWarm(db), false);
});

test('updateRouteColumns: no fields → no-op, no DB call, cache stays warm', async () => {
    const db = makeDB();
    await primeWarmCache(db);

    await updateRouteColumns({ DB: db }, 'myemby', {});

    assert.equal(db.runCalls.length, 0);
    assert.equal(await isWarm(db), true);
});

// ---------------------------------------------------------------------------
// Write paths that today "deliberately skip" invalidation — now correctly
// decided by the module instead of the caller.
// ---------------------------------------------------------------------------

test('reorderRoutes: sort_order-only batch write does NOT invalidate', async () => {
    const db = makeDB();
    await primeWarmCache(db);
    const batchesBefore = db.batchCalls.length;

    await reorderRoutes({ DB: db }, [{ prefix: 'a', sort_order: 1 }, { prefix: 'b', sort_order: 2 }]);

    assert.equal(db.batchCalls.length, batchesBefore + 1, 'reorder issues exactly one env.DB.batch');
    assert.equal(await isWarm(db), true, 'reordering is a display-only concern, not routing-relevant');
});

test('reorderRoutes: empty items array is a no-op', async () => {
    const db = makeDB();
    await primeWarmCache(db);
    const batchesBefore = db.batchCalls.length;
    await reorderRoutes({ DB: db }, []);
    assert.equal(db.batchCalls.length, batchesBefore, 'empty items must not issue a batch call');
});

test('seedKeepaliveBaseline / markKeepaliveReminded: keepalive bookkeeping never invalidates', async () => {
    const db = makeDB();
    await primeWarmCache(db);

    await seedKeepaliveBaseline({ DB: db }, 'a', 1000);
    assert.equal(await isWarm(db), true);

    await markKeepaliveReminded({ DB: db }, ['a', 'b'], 2000);
    assert.equal(await isWarm(db), true);
});

test('cacheEmbyAuthToken / clearEmbyAuthCache: auth-cache bookkeeping never invalidates', async () => {
    const db = makeDB();
    await primeWarmCache(db);

    await cacheEmbyAuthToken({ DB: db }, 'a', 'iv.ct', 1000);
    assert.equal(await isWarm(db), true);

    await clearEmbyAuthCache({ DB: db }, 'a', { clearUsedAt: true });
    assert.equal(await isWarm(db), true);
});

// ---------------------------------------------------------------------------
// Write paths that always touch hot-path columns — always invalidate.
// ---------------------------------------------------------------------------

test('upsertRoute: full-row write always invalidates (touches target/mode/... by construction)', async () => {
    const db = makeDB();
    await primeWarmCache(db);

    const row = Object.fromEntries(UPSERT_COLUMNS.map(c => [c, c === 'prefix' ? 'a' : '']));
    row.sort_order = 0; row.media_counts_auto_auth = 0; row.monitor_enabled = 1;
    row.emby_auth_seen_at = 0; row.emby_auth_used_at = 0; row.keepalive_days = 0;
    row.keepalive_last_played_at = 0; row.keepalive_last_reminded_at = 0;

    await upsertRoute({ DB: db }, row);
    assert.equal(await isWarm(db), false);
});

test('importRoute: full-row write always invalidates', async () => {
    const db = makeDB();
    await primeWarmCache(db);

    const row = Object.fromEntries(IMPORT_COLUMNS.map(c => [c, c === 'prefix' ? 'a' : '']));
    row.sort_order = 0; row.media_counts_auto_auth = 0; row.keepalive_days = 0;
    row.keepalive_last_played_at = 0; row.keepalive_last_reminded_at = 0;

    await importRoute({ DB: db }, row);
    assert.equal(await isWarm(db), false);
});

test('deleteRoute: always invalidates (row existence is itself hot-path)', async () => {
    const db = makeDB();
    await primeWarmCache(db);

    await deleteRoute({ DB: db }, 'a');
    assert.equal(await isWarm(db), false);
});

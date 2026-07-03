/**
 * Tests for src/proxy/config-cache.js — the per-isolate hot-path config
 * cache (#13). Verifies:
 *   - warm cache = zero D1 calls
 *   - TTL expiry triggers reload
 *   - invalidateConfigCache() forces reload (patch-on-write)
 *   - batch-load failure fails open (null gate sets) and is NOT cached
 *
 * Runner: node --test
 */

import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    getConfig,
    invalidateConfigCache,
    __resetConfigCache,
    __setConfigForTest,
} from '../src/proxy/config-cache.js';
import { SCHEMA_VERSION_KEY } from '../src/db/schema.js';
import { MANUAL_REDIRECT_DOMAINS_KEY } from '../src/routing/manual-redirect-allowlist.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

beforeEach(() => { __resetConfigCache(); });

// ---------------------------------------------------------------------------
// Mock D1 env — mirrors the two-statement batch getConfig() issues:
//   [0] SELECT ... FROM routes                       (no WHERE, full table)
//   [1] SELECT k, v FROM kv_config WHERE k IN (...)   (4 keys)
// ---------------------------------------------------------------------------

function makeDB({ routeRows = [], kvRows = {}, onBatch = null } = {}) {
    const db = createD1Fake([
        { test: /FROM routes/i, exec: () => routeRows },
        {
            test: /FROM kv_config/i,
            exec: (keys) => (keys || [])
                .filter(k => kvRows[k] !== undefined)
                .map(k => ({ k, v: kvRows[k] })),
        },
    ]);
    Object.defineProperty(db, 'batchCalls', { get: () => db.batches.length });
    if (onBatch) {
        const realBatch = db.batch.bind(db);
        db.batch = async (stmts) => {
            const res = await realBatch(stmts);
            onBatch(db.batches.length);
            return res;
        };
    }
    return db;
}

// ---------------------------------------------------------------------------
// Cache-hit / cache-miss batch accounting
// ---------------------------------------------------------------------------

test('cache miss → exactly one env.DB.batch call; warm hit within TTL → zero batch calls', async () => {
    const db = makeDB({
        routeRows: [{ prefix: 'myemby', target: 'https://up.example.com', mode: 'off', cache_img: 'on', custom_headers: '', media_counts_auto_auth: 0, keepalive_days: 0 }],
    });
    const env = { DB: db };

    const first = await getConfig(env);
    assert.equal(first.cacheHit, false);
    assert.equal(db.batchCalls, 1);
    assert.equal(first.config.ok, true);
    assert.ok(first.config.routesMap.has('myemby'));

    const second = await getConfig(env);
    assert.equal(second.cacheHit, true);
    assert.equal(db.batchCalls, 1, 'warm cache must not issue a second batch');
    assert.equal(second.loadMs, 0);
    assert.strictEqual(second.config, first.config, 'same cached object returned');
});

test('batch payload: routes SELECT has no WHERE clause (fetches all rows), kv SELECT asks for the 4 known keys', async () => {
    const db = createD1Fake([]);
    await getConfig({ DB: db });
    const capturedSqls = db.log.map(l => l.sql);
    const capturedKvArgs = db.log.find(l => /FROM kv_config/i.test(l.sql))?.binds || [];
    assert.ok(capturedSqls.some(s => /SELECT .* FROM routes\s*$/i.test(s.trim())), `routes sql: ${capturedSqls}`);
    assert.ok(capturedKvArgs.includes('proxy_country_allowlist'));
    assert.ok(capturedKvArgs.includes('hotlink_allow_hosts'));
    assert.ok(capturedKvArgs.includes(MANUAL_REDIRECT_DOMAINS_KEY));
    assert.ok(capturedKvArgs.includes(SCHEMA_VERSION_KEY));
});

// ---------------------------------------------------------------------------
// Parsing: routesMap / countrySet / hotlinkSet / manualRedirectSet / schemaVersion
// ---------------------------------------------------------------------------

test('parses routesMap, countrySet, hotlinkSet, manualRedirectSet, schemaVersion from the batch result', async () => {
    const db = makeDB({
        routeRows: [
            { prefix: 'a', target: 'https://a.example.com', mode: 'off', cache_img: 'on', custom_headers: '', media_counts_auto_auth: 0, keepalive_days: 0 },
            { prefix: 'b', target: 'https://b.example.com', mode: 'off', cache_img: 'off', custom_headers: '', media_counts_auto_auth: 1, keepalive_days: 3 },
        ],
        kvRows: {
            proxy_country_allowlist: 'cn, hk , tw',
            hotlink_allow_hosts: 'good.example.com\nother.example.com',
            [MANUAL_REDIRECT_DOMAINS_KEY]: '115.com\nmypikpak.com',
            [SCHEMA_VERSION_KEY]: '1',
        },
    });
    const { config } = await getConfig({ DB: db });
    assert.equal(config.ok, true);
    assert.equal(config.routesMap.size, 2);
    assert.deepEqual(config.routesMap.get('a').target, 'https://a.example.com');
    assert.deepEqual([...config.countrySet].sort(), ['CN', 'HK', 'TW']);
    assert.deepEqual([...config.hotlinkSet].sort(), ['good.example.com', 'other.example.com']);
    assert.deepEqual([...config.manualRedirectSet].sort(), ['115.com', 'mypikpak.com']);
    assert.equal(config.schemaVersion, '1');
});

test('empty kv values → countrySet/hotlinkSet are null (feature off), manualRedirectSet is an empty Set', async () => {
    const db = makeDB({ routeRows: [], kvRows: {} });
    const { config } = await getConfig({ DB: db });
    assert.equal(config.countrySet, null);
    assert.equal(config.hotlinkSet, null);
    assert.ok(config.manualRedirectSet instanceof Set);
    assert.equal(config.manualRedirectSet.size, 0);
});

// ---------------------------------------------------------------------------
// TTL expiry
// ---------------------------------------------------------------------------

test('TTL expiry (60s) → next getConfig reloads via a fresh batch', async (t) => {
    t.mock.timers.enable({ apis: ['Date'] });
    try {
        const db = makeDB({ routeRows: [{ prefix: 'x', target: 'https://x.example.com' }] });
        const env = { DB: db };

        const first = await getConfig(env);
        assert.equal(first.cacheHit, false);
        assert.equal(db.batchCalls, 1);

        // Still within TTL → warm hit
        t.mock.timers.tick(59000);
        const warm = await getConfig(env);
        assert.equal(warm.cacheHit, true);
        assert.equal(db.batchCalls, 1);

        // Past TTL → reload
        t.mock.timers.tick(2000); // total 61s elapsed
        const expired = await getConfig(env);
        assert.equal(expired.cacheHit, false);
        assert.equal(db.batchCalls, 2, 'TTL expiry must trigger a second batch');
    } finally {
        t.mock.timers.reset();
    }
});

// ---------------------------------------------------------------------------
// invalidateConfigCache — patch-on-write
// ---------------------------------------------------------------------------

test('invalidateConfigCache() forces the next getConfig to reload even within TTL', async () => {
    const db = makeDB({ routeRows: [{ prefix: 'x', target: 'https://x.example.com' }] });
    const env = { DB: db };

    await getConfig(env);
    assert.equal(db.batchCalls, 1);

    const warm = await getConfig(env);
    assert.equal(warm.cacheHit, true);
    assert.equal(db.batchCalls, 1);

    invalidateConfigCache();

    const reloaded = await getConfig(env);
    assert.equal(reloaded.cacheHit, false);
    assert.equal(db.batchCalls, 2, 'invalidateConfigCache must force a reload');
});

// ---------------------------------------------------------------------------
// Batch-load failure: fail-open gates, error route lookup, NOT cached
// ---------------------------------------------------------------------------

test('batch-load failure → ok:false, null gate sets (fail-open), empty manualRedirectSet, and NOT cached (next call retries)', async () => {
    let attempts = 0;
    const db = createD1Fake([]);
    db.batch = async () => { attempts++; throw new Error('D1 unavailable'); };
    const env = { DB: db };

    const first = await getConfig(env);
    assert.equal(first.cacheHit, false);
    assert.equal(first.config.ok, false);
    assert.equal(first.config.countrySet, null, 'gates fail open on load failure');
    assert.equal(first.config.hotlinkSet, null, 'gates fail open on load failure');
    assert.ok(first.config.manualRedirectSet instanceof Set);
    assert.equal(first.config.manualRedirectSet.size, 0);
    assert.equal(attempts, 1);

    // NOT cached: a second call retries the batch (not a warm hit).
    const second = await getConfig(env);
    assert.equal(second.cacheHit, false);
    assert.equal(attempts, 2, 'a failed load must not be cached — next call must retry the batch');
});

test('no env.DB → ok:false sentinel, zero batch calls, no throw', async () => {
    const { config, cacheHit, loadMs } = await getConfig({});
    assert.equal(config.ok, false);
    assert.equal(config.countrySet, null);
    assert.equal(config.hotlinkSet, null);
    assert.equal(cacheHit, false);
    assert.equal(loadMs, 0);
});

// ---------------------------------------------------------------------------
// Test hooks: __setConfigForTest / __resetConfigCache
// ---------------------------------------------------------------------------

test('__setConfigForTest seeds a warm cache with no DB dependency', async () => {
    const routesMap = new Map([['seeded', { target: 'https://seeded.example.com' }]]);
    __setConfigForTest({ routesMap, countrySet: new Set(['CN']) });

    // No env.DB at all — if getConfig tried to hit D1 it would throw.
    const { config, cacheHit } = await getConfig({});
    assert.equal(cacheHit, true);
    assert.equal(config.routesMap.get('seeded').target, 'https://seeded.example.com');
    assert.deepEqual([...config.countrySet], ['CN']);
});

test('__resetConfigCache clears state so the next getConfig treats it as a cold start', async () => {
    __setConfigForTest({ routesMap: new Map([['x', {}]]) });
    __resetConfigCache();

    const db = makeDB({ routeRows: [] });
    const { cacheHit } = await getConfig({ DB: db });
    assert.equal(cacheHit, false);
    assert.equal(db.batchCalls, 1);
});

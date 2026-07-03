/**
 * Behavioral tests for src/probes/probe.js:
 *   - probeAll uses a bounded concurrency pool (limit 6) instead of a
 *     single Promise.all([...]) so per-attempt abort timers only start
 *     once a fetch is actually dispatched.
 *   - Fail-only retry: probes that came back ok=false in the first pass
 *     are re-probed after a delay, and the retry result (success or
 *     failure) replaces the first-pass result for that prefix.
 *
 * Runner: node --test  (Node 22 built-in test runner, no extra deps)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { probeOne, probeAll } from '../src/probes/probe.js';
import { createD1Fake } from './helpers/d1-fake.mjs';
import { __resetSchemaReadyForTest } from '../src/db/schema.js';

function stubTimers() {
    // Speed up the 3s fail-retry delay in tests: fire every scheduled
    // timeout immediately instead of actually waiting.
    const origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, ms, ...rest) => origSetTimeout(fn, 0, ...rest);
    return () => { globalThis.setTimeout = origSetTimeout; };
}

function makeRoute(prefix, target = `https://${prefix}.example.com`) {
    return { prefix, target, custom_headers: '', monitor_enabled: 1 };
}

/** Build a D1 fake pre-loaded with `routes` rows for probeAll's SELECT. */
function makeDB(routes) {
    return createD1Fake([
        { test: /FROM routes WHERE monitor_enabled/i, exec: () => routes },
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// probeOne — exported signature is unchanged
// ─────────────────────────────────────────────────────────────────────────────

test('probeOne: returns {prefix, ok, ms, status} shape, using the first comma-separated target', async () => {
    const fetchImpl = async () => new Response('', { status: 200 });
    const result = await probeOne(makeRoute('a', 'https://a.example.com,https://a-backup.example.com'), { fetchImpl });
    assert.equal(result.prefix, 'a');
    assert.equal(result.ok, true);
    assert.equal(typeof result.ms, 'number');
    assert.equal(result.status, 200);
});

test('probeOne: no usable target returns ok:false without calling fetch', async () => {
    let called = false;
    const fetchImpl = async () => { called = true; return new Response('', { status: 200 }); };
    const result = await probeOne(makeRoute('a', ''), { fetchImpl });
    assert.deepEqual(result, { prefix: 'a', ok: false, ms: 0, status: 0 });
    assert.equal(called, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// probeAll — concurrency pool
// ─────────────────────────────────────────────────────────────────────────────

test('probeAll: never exceeds 6 simultaneous in-flight probes (pool limit)', async (t) => {
    __resetSchemaReadyForTest();
    const routes = Array.from({ length: 10 }, (_, i) => makeRoute(`p${i}`));
    const db = makeDB(routes);
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise(r => setTimeout(r, 5));
        inFlight--;
        return new Response('', { status: 200 });
    };
    const restoreTimers = stubTimers();
    try {
        await probeAll({ DB: db, EMBY_FETCH: fetchImpl });
    } finally {
        restoreTimers();
    }
    assert.ok(maxInFlight <= 6, `expected pool to cap concurrency at 6, saw ${maxInFlight}`);
    assert.ok(maxInFlight > 1, 'sanity: pool should still run several probes concurrently');
});

test('probeAll: batch-inserts one row per route with the pool result', async (t) => {
    __resetSchemaReadyForTest();
    const routes = [makeRoute('a'), makeRoute('b'), makeRoute('c')];
    const db = makeDB(routes);
    const fetchImpl = async () => new Response('', { status: 200 });
    const restoreTimers = stubTimers();
    try {
        await probeAll({ DB: db, EMBY_FETCH: fetchImpl });
    } finally {
        restoreTimers();
    }
    const insertBatch = db.batches.find(b => b.some(s => /INSERT OR REPLACE INTO emby_probes/i.test(s.sql)));
    assert.ok(insertBatch, 'expected an emby_probes insert batch');
    const prefixes = insertBatch
        .filter(s => /INSERT OR REPLACE INTO emby_probes/i.test(s.sql))
        .map(s => s.binds[0]);
    assert.deepEqual(prefixes.sort(), ['a', 'b', 'c']);
});

// ─────────────────────────────────────────────────────────────────────────────
// probeAll — fail-only retry
// ─────────────────────────────────────────────────────────────────────────────

test('probeAll: a route that fails first pass but succeeds on retry is recorded as ok', async (t) => {
    __resetSchemaReadyForTest();
    const routes = [makeRoute('good'), makeRoute('flaky')];
    const db = makeDB(routes);
    const attemptsByPrefix = {};
    const fetchImpl = async (url) => {
        const prefix = String(url).includes('flaky') ? 'flaky' : 'good';
        attemptsByPrefix[prefix] = (attemptsByPrefix[prefix] || 0) + 1;
        if (prefix === 'flaky' && attemptsByPrefix[prefix] === 1) {
            // First attempt fails (network error) -> ok:false.
            throw new Error('connection reset');
        }
        return new Response('', { status: 200 });
    };
    const restoreTimers = stubTimers();
    try {
        await probeAll({ DB: db, EMBY_FETCH: fetchImpl });
    } finally {
        restoreTimers();
    }
    assert.equal(attemptsByPrefix.flaky, 2, 'flaky route should have been retried exactly once');
    assert.equal(attemptsByPrefix.good, 1, 'a route that succeeded on the first pass must not be retried');

    const insertBatch = db.batches.find(b => b.some(s => /INSERT OR REPLACE INTO emby_probes/i.test(s.sql)));
    const flakyInsert = insertBatch.find(s => /INSERT OR REPLACE INTO emby_probes/i.test(s.sql) && s.binds[0] === 'flaky');
    assert.equal(flakyInsert.binds[2], 1, 'retry succeeded, so the recorded ok flag should be 1 (true)');
});

test('probeAll: a route that fails both passes keeps the retry result (still ok:false)', async (t) => {
    __resetSchemaReadyForTest();
    const routes = [makeRoute('deadnode')];
    const db = makeDB(routes);
    let attempts = 0;
    const fetchImpl = async () => {
        attempts++;
        throw new Error('connection refused');
    };
    const restoreTimers = stubTimers();
    try {
        await probeAll({ DB: db, EMBY_FETCH: fetchImpl });
    } finally {
        restoreTimers();
    }
    assert.equal(attempts, 2, 'expected exactly one retry attempt after the first failure');

    const insertBatch = db.batches.find(b => b.some(s => /INSERT OR REPLACE INTO emby_probes/i.test(s.sql)));
    const insert = insertBatch.find(s => /INSERT OR REPLACE INTO emby_probes/i.test(s.sql));
    assert.equal(insert.binds[2], 0, 'still failing after retry -> ok flag 0 (false)');
});

test('probeAll: a route ok on first pass is never re-probed', async (t) => {
    __resetSchemaReadyForTest();
    const routes = [makeRoute('a'), makeRoute('b'), makeRoute('c')];
    const db = makeDB(routes);
    let calls = 0;
    const fetchImpl = async () => { calls++; return new Response('', { status: 200 }); };
    const restoreTimers = stubTimers();
    try {
        await probeAll({ DB: db, EMBY_FETCH: fetchImpl });
    } finally {
        restoreTimers();
    }
    assert.equal(calls, 3, 'all-success first pass should not trigger any retry fetches');
});

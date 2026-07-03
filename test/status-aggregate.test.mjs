/**
 * Tests for loadStatusData (src/status/page.js).
 *
 * Verifies the 6-SQL aggregate path: a single env.DB.batch of fixed size,
 * correct per-card field derivation, prefix filtering, and — the core
 * anti-N+1 guarantee — that env.DB.prepare is called a fixed number of
 * times independent of the number of nodes.
 *
 * Runner: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadStatusData } from '../src/status/page.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

// ---------------------------------------------------------------------------
// Mock D1 env
// ---------------------------------------------------------------------------

/**
 * Build a mock env.DB. loadStatusData prepares exactly 6 statements
 * (routes, probes, 24h, 7d, counts, live) then submits them in one batch.
 *
 * `dataset` supplies the `.results` each prepared statement resolves to,
 * matched positionally by the order of prepare() calls — the agg24/agg7d/
 * agg30d statements are identical in shape (same table, different bind
 * values loadStatusData computes internally), so position is the only
 * reliable way to tell them apart from outside.
 *
 * Tracks prepareCount and batches so tests can assert the fixed-fan-out
 * property.
 */
function makeDB(dataset) {
    const order = ['routes', 'probes', 'agg24', 'agg7d', 'agg30d', 'counts', 'live'];
    let idx = 0;
    const db = createD1Fake([
        {
            test: /.*/,
            exec: () => {
                const key = order[idx % order.length];
                idx++;
                return dataset[key] || [];
            },
        },
    ]);
    Object.defineProperty(db, 'prepareCount', { get: () => db.log.length });
    Object.defineProperty(db, 'batchSizes', { get: () => db.batches.map(b => b.length) });
    return db;
}

// ROW_NUMBER() rn values are produced by SQL in the real DB; the mock just
// returns rows with explicit rn fields, mirroring what D1 would yield.
function probeRow(prefix, ok, ms, ts, rn) {
    return { prefix, ok, ms, status: 200, ts, rn };
}
function countsRow(prefix, day, movies, series, episodes, rn) {
    return { prefix, day, movies, series, episodes, rn };
}

// Three routes, each with distinct probe / aggregate / counts data.
function threeRouteDataset() {
    return {
        routes: [
            { prefix: 'a', public_alias: 'Alpha', remark: '', icon: 'a.png', sort_order: 1, media_counts_auto_auth: 1 },
            { prefix: 'b', public_alias: '', remark: 'Bravo', icon: '', sort_order: 2, media_counts_auto_auth: 0 },
            { prefix: 'c', public_alias: 'Charlie', remark: '', icon: 'c.png', sort_order: 3, media_counts_auto_auth: 1 },
        ],
        probes: [
            // a: latest ok, 50ms; one earlier probe for history
            probeRow('a', 1, 50, 2000, 1),
            probeRow('a', 1, 60, 1900, 2),
            // b: latest down
            probeRow('b', 0, 0, 2000, 1),
            // c: latest ok, 120ms
            probeRow('c', 1, 120, 2000, 1),
        ],
        agg24: [
            { prefix: 'a', ok_count: 90, total: 100 },  // 0.90
            { prefix: 'b', ok_count: 50, total: 100 },  // 0.50
            // c missing → avail_24h null
        ],
        agg7d: [
            { prefix: 'a', ok_count: 600, total: 700 },  // ~0.857
            { prefix: 'c', ok_count: 168, total: 168 },  // 1.0
        ],
        agg30d: [
            { prefix: 'a', ok_count: 2400, total: 2500 },  // 0.96
            { prefix: 'c', ok_count: 720, total: 720 },    // 1.0
        ],
        counts: [
            // a: today + yesterday → delta computed
            countsRow('a', '2026-06-06', 100, 20, 5000, 1),
            countsRow('a', '2026-06-05', 95, 19, 4900, 2),
            // c: only today → counts present, delta null
            countsRow('c', '2026-06-06', 10, 2, 30, 1),
        ],
    };
}

// ---------------------------------------------------------------------------
// 1. cards length matches routes
// ---------------------------------------------------------------------------

test('returns one card per route (3 routes → 3 cards)', async () => {
    const db = makeDB(threeRouteDataset());
    const { cards } = await loadStatusData({ DB: db });
    assert.equal(cards.length, 3);
    assert.deepEqual(cards.map(c => c.prefix), ['a', 'b', 'c']);
});

// ---------------------------------------------------------------------------
// 2. per-card field derivation
// ---------------------------------------------------------------------------

test('card fields derived correctly from aggregates', async () => {
    const db = makeDB(threeRouteDataset());
    const { cards } = await loadStatusData({ DB: db });
    const byPrefix = Object.fromEntries(cards.map(c => [c.prefix, c]));

    const a = byPrefix.a;
    assert.equal(a.name, 'Alpha', 'public_alias wins for name');
    assert.equal(a.ok, true);
    assert.equal(a.latest_ms, 50);
    assert.equal(a.avail_24h, 0.9);
    assert.ok(Math.abs(a.avail_7d - 600 / 700) < 1e-9);
    assert.equal(a.avail_30d, 0.96, '30d availability from hourly aggregate');
    // history is oldest→newest (reversed from rn DESC); 2 probes
    assert.equal(a.history.length, 2);
    assert.deepEqual(a.history.map(h => h.ms), [60, 50]);
    assert.deepEqual(a.counts, { movies: 100, series: 20, episodes: 5000, artists: 0, albums: 0, songs: 0, music_videos: 0, box_sets: 0, books: 0, updated_at: 0 });
    assert.deepEqual(a.counts_delta, { movies: 5, series: 1, episodes: 100, artists: 0, albums: 0, songs: 0, music_videos: 0, box_sets: 0, books: 0 });
    assert.deepEqual(a.trend, [5014, 5120]);

    const b = byPrefix.b;
    assert.equal(b.name, 'Bravo', 'falls back to remark when no public_alias');
    assert.equal(b.ok, false);
    assert.equal(b.latest_ms, 0);
    assert.equal(b.avail_24h, 0.5);
    assert.equal(b.avail_7d, null, 'no 7d aggregate → null');
    assert.equal(b.avail_30d, null, 'no 30d aggregate → null');
    assert.equal(b.counts, null, 'no counts row → null');
    assert.equal(b.counts_delta, null);

    const c = byPrefix.c;
    assert.equal(c.name, 'Charlie');
    assert.equal(c.ok, true);
    assert.equal(c.latest_ms, 120);
    assert.equal(c.avail_24h, null, 'no 24h aggregate → null');
    assert.equal(c.avail_7d, 1, 'full 7d availability');
    assert.deepEqual(c.counts, { movies: 10, series: 2, episodes: 30, artists: 0, albums: 0, songs: 0, music_videos: 0, box_sets: 0, books: 0, updated_at: 0 });
    assert.equal(c.counts_delta, null, 'only one day of counts → no delta');
    assert.equal(c.show_counts, true);
});

// ---------------------------------------------------------------------------
// 3. routes with no rows → empty cards, prefix absent
// ---------------------------------------------------------------------------

test('prefix with no route row does not appear in cards', async () => {
    const ds = threeRouteDataset();
    // 'z' has probe/agg data but is NOT in routes → must not surface.
    ds.probes.push(probeRow('z', 1, 10, 2000, 1));
    ds.agg24.push({ prefix: 'z', ok_count: 1, total: 1 });
    const db = makeDB(ds);
    const { cards } = await loadStatusData({ DB: db });
    assert.equal(cards.length, 3);
    assert.ok(!cards.some(c => c.prefix === 'z'), 'orphan prefix excluded');
});

test('no routes at all → empty cards and routes', async () => {
    const db = makeDB({ routes: [], probes: [], agg24: [], agg7d: [], counts: [], live: [] });
    const result = await loadStatusData({ DB: db });
    assert.deepEqual(result.cards, []);
    assert.deepEqual(result.routes, []);
});

// ---------------------------------------------------------------------------
// 4. limitPrefix returns a single card
// ---------------------------------------------------------------------------

test("limitPrefix='/a' returns only that prefix's card", async () => {
    // With a prefix filter the route query returns just that one row.
    const ds = threeRouteDataset();
    ds.routes = [ds.routes[0]]; // only 'a'
    ds.probes = ds.probes.filter(p => p.prefix === 'a');
    ds.agg24 = ds.agg24.filter(r => r.prefix === 'a');
    ds.agg7d = ds.agg7d.filter(r => r.prefix === 'a');
    ds.counts = ds.counts.filter(r => r.prefix === 'a');
    const db = makeDB(ds);
    const { cards } = await loadStatusData({ DB: db }, { prefix: 'a' });
    assert.equal(cards.length, 1);
    assert.equal(cards[0].prefix, 'a');
});

// ---------------------------------------------------------------------------
// 5. CORE: prepare fan-out is fixed (no N+1) regardless of node count
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 6. 24h availability now reads emby_probe_hourly, not raw emby_probes
//    (issue #11). Prove the hourly-rollup + current-partial-hour value
//    matches a hypothetical raw full-table scan within rounding.
// ---------------------------------------------------------------------------

test('24h availability from hourly rollup matches raw-scan calculation within ±0.1%', async () => {
    const now = Math.floor(Date.now() / 1000);
    const currentHourStart = Math.floor(now / 3600) * 3600;

    // 3 fully completed hours (already rolled into emby_probe_hourly by
    // maybeRollupHourly), 5-min probe cadence → 12 samples/hour.
    const hourlyBuckets = [];
    const rawProbes = [];
    for (let h = 3; h >= 1; h--) {
        const hourTs = currentHourStart - h * 3600;
        let ok = 0, fail = 0;
        for (let m = 0; m < 60; m += 5) {
            const isOk = (h * 13 + m) % 7 !== 0; // deterministic ok/fail mix
            if (isOk) ok++; else fail++;
            rawProbes.push({ prefix: 'x', ok: isOk ? 1 : 0, ms: isOk ? 80 : 0, status: isOk ? 200 : 0, ts: hourTs + m * 60 });
        }
        hourlyBuckets.push({ prefix: 'x', hour_ts: hourTs, ok_count: ok, fail_count: fail });
    }

    // Current in-progress hour: not yet rolled up, only present in raw probes
    // (mirrors what stmtProbes' last-60-min window would return in production).
    const elapsedS = now - currentHourStart;
    const partialProbes = [];
    for (let offset = 0; offset <= elapsedS; offset += 300) {
        const ts = currentHourStart + offset;
        const isOk = (offset / 300) % 3 !== 0;
        partialProbes.push({ prefix: 'x', ok: isOk ? 1 : 0, ms: isOk ? 90 : 0, status: isOk ? 200 : 0, ts });
    }
    rawProbes.push(...partialProbes);

    // Reference value: what the OLD implementation computed by scanning raw
    // emby_probes for ts >= since24 (all fixture probes fall inside 24h).
    let refOk = 0, refTotal = 0;
    for (const p of rawProbes) { refTotal++; if (p.ok) refOk++; }
    const refAvail = refOk / refTotal;

    // What emby_probe_hourly's SUM(ok_count)/SUM(ok_count)+SUM(fail_count)
    // query (stmt24) would return: only the 3 completed hours.
    const agg24 = [{
        prefix: 'x',
        ok_count: hourlyBuckets.reduce((s, b) => s + b.ok_count, 0),
        total: hourlyBuckets.reduce((s, b) => s + b.ok_count + b.fail_count, 0),
    }];

    // What stmtProbes (last 60 min raw) returns: only the current partial hour,
    // since its elapsed span is always < 60 min.
    const probesResult = partialProbes.map((p, i) => ({ ...p, rn: i + 1 }));

    const db = makeDB({
        routes: [{ prefix: 'x', public_alias: 'X', remark: '', icon: '', sort_order: 1, media_counts_auto_auth: 0 }],
        probes: probesResult,
        agg24,
        agg7d: [],
        agg30d: [],
        counts: [],
        live: [],
    });

    const { cards } = await loadStatusData({ DB: db });
    const x = cards.find(c => c.prefix === 'x');
    assert.ok(x.avail_24h !== null, 'avail_24h should be populated');
    assert.ok(Math.abs(x.avail_24h - refAvail) < 0.001,
        `hourly-derived avail_24h (${x.avail_24h}) should match raw scan (${refAvail}) within ±0.1%`);
});

test('avail_24h with no probes in the current partial hour still reflects completed hourly buckets', async () => {
    const db = makeDB({
        routes: [{ prefix: 'y', public_alias: 'Y', remark: '', icon: '', sort_order: 1, media_counts_auto_auth: 0 }],
        probes: [], // nothing in the last 60 minutes
        agg24: [{ prefix: 'y', ok_count: 45, total: 50 }],
        agg7d: [],
        agg30d: [],
        counts: [],
        live: [],
    });
    const { cards } = await loadStatusData({ DB: db });
    const y = cards.find(c => c.prefix === 'y');
    assert.equal(y.avail_24h, 0.9, 'falls back to the hourly-rollup-only value when no partial-hour probes exist');
});

test('env.DB.prepare call count is fixed (≤7) and independent of node count', async () => {
    // 3 nodes
    const db3 = makeDB(threeRouteDataset());
    await loadStatusData({ DB: db3 });
    assert.ok(db3.prepareCount <= 7, `3 nodes: prepare called ${db3.prepareCount} times, expected ≤7`);
    assert.equal(db3.prepareCount, 7, '3 nodes → exactly 7 prepared statements');
    assert.deepEqual(db3.batchSizes, [7], 'single batch of 7 statements');

    // 50 nodes — fan-out must NOT grow with N.
    const big = { routes: [], probes: [], agg24: [], agg7d: [], counts: [], live: [] };
    for (let i = 0; i < 50; i++) {
        const prefix = `n${i}`;
        big.routes.push({ prefix, public_alias: `Node ${i}`, remark: '', icon: '', sort_order: i, media_counts_auto_auth: 0 });
        big.probes.push(probeRow(prefix, 1, 30 + i, 2000, 1));
        big.agg24.push({ prefix, ok_count: 99, total: 100 });
        big.agg7d.push({ prefix, ok_count: 690, total: 700 });
    }
    const db50 = makeDB(big);
    const { cards } = await loadStatusData({ DB: db50 });
    assert.equal(cards.length, 50, 'all 50 nodes rendered');
    assert.equal(db50.prepareCount, 7, '50 nodes → STILL exactly 7 prepared statements (no N×7 fan-out)');
    assert.deepEqual(db50.batchSizes, [7], '50 nodes → single batch of 7');
});

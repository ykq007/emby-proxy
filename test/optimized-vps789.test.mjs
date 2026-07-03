/**
 * Tests for src/optimized/vps789.js — live vps789 cfIpTop20 sourcing for
 * optimized_domains' builtin rows (replaces the hardcoded stale list).
 *
 * Covers:
 *   - parseCfIpTop20: pure parsing/filtering of the vps789 response body
 *   - fetchCfIpTop20: network + envelope handling (ok / code!=0 / empty
 *     good[] / non-2xx / network throw), all via an injected fetchImpl
 *   - reconcileOptimizedDomains: insert-new / delete-dropped-builtin /
 *     preserve-enabled-on-survivor / never-touch-customs / write-marker,
 *     against test/helpers/d1-fake.mjs
 *   - maybeRefreshOptimizedDomains: marker=0 blocks inline, within-TTL is a
 *     no-op, past-TTL refreshes via ctx.waitUntil (non-blocking)
 *
 * Runner: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createD1Fake } from './helpers/d1-fake.mjs';
import { OPTIMIZED_VPS789_FETCHED_AT_KEY } from '../src/db/kv.js';
import {
    CFIP_TOP20_URL,
    VPS789_TTL_MS,
    parseCfIpTop20,
    fetchCfIpTop20,
    reconcileOptimizedDomains,
    maybeRefreshOptimizedDomains,
} from '../src/optimized/vps789.js';

// ---------------------------------------------------------------------------
// parseCfIpTop20 — pure
// ---------------------------------------------------------------------------

test('parseCfIpTop20: happy path — maps ip -> domain, note carries 1-based rank', () => {
    const json = {
        code: 0,
        message: 'true',
        data: { good: [{ ip: 'cf.xycf.asia', avgLatency: 89 }, { ip: 'cdn.example.com', avgLatency: 120 }] },
    };
    const out = parseCfIpTop20(json);
    assert.deepEqual(out, [
        { domain: 'cf.xycf.asia', note: 'vps789·综合排名1', rank: 1 },
        { domain: 'cdn.example.com', note: 'vps789·综合排名2', rank: 2 },
    ]);
});

test('parseCfIpTop20: drops raw IPv4 literal entries', () => {
    const json = { code: 0, data: { good: [{ ip: '1.2.3.4' }, { ip: 'good.example.com' }] } };
    const out = parseCfIpTop20(json);
    assert.deepEqual(out.map(d => d.domain), ['good.example.com']);
    assert.equal(out[0].rank, 2, 'rank reflects original source position, not compacted index');
});

test('parseCfIpTop20: drops entries containing a colon (IPv6 literals)', () => {
    const json = { code: 0, data: { good: [{ ip: '::1' }, { ip: 'fe80::1' }, { ip: 'ok.example.com' }] } };
    const out = parseCfIpTop20(json);
    assert.deepEqual(out.map(d => d.domain), ['ok.example.com']);
    assert.equal(out[0].rank, 3);
});

test('parseCfIpTop20: drops entries with characters outside [a-z0-9.-]', () => {
    const json = { code: 0, data: { good: [{ ip: 'evil_host.com' }, { ip: 'has space.com' }, { ip: 'ok-2.example.com' }] } };
    const out = parseCfIpTop20(json);
    assert.deepEqual(out.map(d => d.domain), ['ok-2.example.com']);
});

test('parseCfIpTop20: dedupes (case-insensitive), keeping the first occurrence\'s rank', () => {
    const json = {
        code: 0,
        data: { good: [{ ip: 'CF.Example.com' }, { ip: 'other.example.com' }, { ip: 'cf.example.com' }] },
    };
    const out = parseCfIpTop20(json);
    assert.deepEqual(out.map(d => d.domain), ['cf.example.com', 'other.example.com']);
    assert.equal(out.find(d => d.domain === 'cf.example.com').rank, 1);
});

test('parseCfIpTop20: missing/malformed data.good -> empty array, no throw', () => {
    assert.deepEqual(parseCfIpTop20({}), []);
    assert.deepEqual(parseCfIpTop20({ data: {} }), []);
    assert.deepEqual(parseCfIpTop20(null), []);
});

// ---------------------------------------------------------------------------
// fetchCfIpTop20 — network + envelope handling via injected fetchImpl
// ---------------------------------------------------------------------------

test('fetchCfIpTop20: ok response -> parsed domain list, hits CFIP_TOP20_URL', async () => {
    let seenUrl;
    const fetchImpl = async (url) => {
        seenUrl = url;
        return Response.json({ code: 0, message: 'true', data: { good: [{ ip: 'cf.xycf.asia', avgLatency: 89 }] } });
    };
    const out = await fetchCfIpTop20({}, { fetchImpl });
    assert.equal(seenUrl, CFIP_TOP20_URL);
    assert.deepEqual(out, [{ domain: 'cf.xycf.asia', note: 'vps789·综合排名1', rank: 1 }]);
});

test('fetchCfIpTop20: json.code !== 0 -> null', async () => {
    const fetchImpl = async () => Response.json({ code: 1, message: 'false', data: { good: [{ ip: 'x.com' }] } });
    assert.equal(await fetchCfIpTop20({}, { fetchImpl }), null);
});

test('fetchCfIpTop20: empty good[] -> null', async () => {
    const fetchImpl = async () => Response.json({ code: 0, message: 'true', data: { good: [] } });
    assert.equal(await fetchCfIpTop20({}, { fetchImpl }), null);
});

test('fetchCfIpTop20: good[] entirely filtered out (all invalid) -> null', async () => {
    const fetchImpl = async () => Response.json({ code: 0, data: { good: [{ ip: '1.2.3.4' }, { ip: '::1' }] } });
    assert.equal(await fetchCfIpTop20({}, { fetchImpl }), null);
});

test('fetchCfIpTop20: non-2xx status -> null', async () => {
    const fetchImpl = async () => new Response('server error', { status: 500 });
    assert.equal(await fetchCfIpTop20({}, { fetchImpl }), null);
});

test('fetchCfIpTop20: network throw -> null (no throw propagates)', async () => {
    const fetchImpl = async () => { throw new Error('network down'); };
    await assert.doesNotReject(async () => {
        assert.equal(await fetchCfIpTop20({}, { fetchImpl }), null);
    });
});

test('fetchCfIpTop20: non-JSON body -> null (no throw)', async () => {
    const fetchImpl = async () => new Response('not json', { status: 200 });
    assert.equal(await fetchCfIpTop20({}, { fetchImpl }), null);
});

// ---------------------------------------------------------------------------
// reconcileOptimizedDomains — against createD1Fake
// ---------------------------------------------------------------------------

function makeOptimizedDB(initialRows) {
    let rows = initialRows.map((r, i) => ({ id: i + 1, note: '', last_ms: -1, ...r }));
    let nextId = rows.length + 1;
    const kv = new Map();

    const db = createD1Fake([
        {
            test: /^INSERT OR IGNORE INTO optimized_domains/i,
            exec: ([domain, note]) => {
                const exists = rows.some(r => r.domain === domain);
                if (!exists) rows.push({ id: nextId++, domain, note, builtin: 1, enabled: 1, last_ms: -1 });
                return [];
            },
        },
        {
            test: /^DELETE FROM optimized_domains WHERE builtin = 1 AND domain NOT IN/i,
            exec: (binds) => {
                const keep = new Set(binds);
                rows = rows.filter(r => !(r.builtin === 1 && !keep.has(r.domain)));
                return [];
            },
        },
        {
            test: /INSERT OR REPLACE INTO kv_config/i,
            exec: ([key, value]) => { kv.set(key, value); return []; },
        },
        {
            test: /SELECT v FROM kv_config WHERE k\s*=\s*\?/i,
            exec: ([key]) => (kv.has(key) ? [{ v: kv.get(key) }] : []),
        },
    ]);
    db.rows = () => rows;
    db.kv = kv;
    return db;
}

test('reconcileOptimizedDomains: inserts new domains as builtin=1 enabled=1', async () => {
    const db = makeOptimizedDB([]);
    const env = { DB: db };
    await reconcileOptimizedDomains(env, [{ domain: 'new.example.com', note: 'vps789·综合排名1' }]);
    const row = db.rows().find(r => r.domain === 'new.example.com');
    assert.ok(row);
    assert.equal(row.builtin, 1);
    assert.equal(row.enabled, 1);
});

test('reconcileOptimizedDomains: deletes a builtin row no longer in the new top-20', async () => {
    const db = makeOptimizedDB([{ domain: 'dropped.example.com', builtin: 1, enabled: 1 }]);
    const env = { DB: db };
    await reconcileOptimizedDomains(env, [{ domain: 'new.example.com', note: 'r1' }]);
    assert.ok(!db.rows().some(r => r.domain === 'dropped.example.com'), 'dropped builtin row should be removed');
});

test('reconcileOptimizedDomains: a disabled survivor (still in the new list) keeps enabled=0', async () => {
    const db = makeOptimizedDB([{ domain: 'survivor.example.com', builtin: 1, enabled: 0, last_ms: 42 }]);
    const env = { DB: db };
    await reconcileOptimizedDomains(env, [{ domain: 'survivor.example.com', note: 'vps789·综合排名1' }]);
    const row = db.rows().find(r => r.domain === 'survivor.example.com');
    assert.ok(row);
    assert.equal(row.enabled, 0, 'INSERT OR IGNORE must not clobber the existing disabled toggle');
    assert.equal(row.last_ms, 42, 'existing speedtest result must be preserved too');
});

test('reconcileOptimizedDomains: a builtin=0 custom row is never touched, even if absent from the new list', async () => {
    const db = makeOptimizedDB([{ domain: 'my-custom.example.com', builtin: 0, enabled: 1 }]);
    const env = { DB: db };
    await reconcileOptimizedDomains(env, [{ domain: 'new.example.com', note: 'r1' }]);
    assert.ok(db.rows().some(r => r.domain === 'my-custom.example.com'), 'custom (builtin=0) row must survive');
});

test('reconcileOptimizedDomains: writes the fetched-at marker', async () => {
    const db = makeOptimizedDB([]);
    const env = { DB: db };
    const before = Date.now();
    await reconcileOptimizedDomains(env, [{ domain: 'new.example.com', note: 'r1' }]);
    const marker = parseInt(db.kv.get(OPTIMIZED_VPS789_FETCHED_AT_KEY), 10);
    assert.ok(marker >= before, 'marker should be a Date.now() timestamp written during reconcile');
});

test('reconcileOptimizedDomains: full mix — insert + delete + preserve + untouched-custom + marker in one call', async () => {
    const db = makeOptimizedDB([
        { domain: 'old.example.com', builtin: 1, enabled: 1 },
        { domain: 'survivor.example.com', builtin: 1, enabled: 0 },
        { domain: 'custom.example.com', builtin: 0, enabled: 1 },
    ]);
    const env = { DB: db };
    await reconcileOptimizedDomains(env, [
        { domain: 'survivor.example.com', note: 'vps789·综合排名1' },
        { domain: 'fresh.example.com', note: 'vps789·综合排名2' },
    ]);
    const domains = db.rows().map(r => r.domain).sort();
    assert.deepEqual(domains, ['custom.example.com', 'fresh.example.com', 'survivor.example.com'].sort());
    assert.equal(db.rows().find(r => r.domain === 'survivor.example.com').enabled, 0);
    assert.ok(db.kv.get(OPTIMIZED_VPS789_FETCHED_AT_KEY));
});

// ---------------------------------------------------------------------------
// maybeRefreshOptimizedDomains — TTL / marker gating
// ---------------------------------------------------------------------------

function makeCtx() { return { _p: [], waitUntil(p) { this._p.push(p); } }; }
const flush = async (ctx) => { await Promise.all(ctx._p); };

test('maybeRefreshOptimizedDomains: marker absent (0) -> blocks inline, resolves before returning', async () => {
    const db = makeOptimizedDB([]);
    const env = { DB: db };
    const ctx = makeCtx();
    let fetchCalled = false;
    const fetchImpl = async () => {
        fetchCalled = true;
        return Response.json({ code: 0, data: { good: [{ ip: 'fresh.example.com' }] } });
    };

    await maybeRefreshOptimizedDomains(env, ctx, { fetchImpl });

    assert.equal(fetchCalled, true, 'should have fetched inline');
    assert.equal(ctx._p.length, 0, 'must not defer to ctx.waitUntil when marker is absent');
    assert.ok(db.rows().some(r => r.domain === 'fresh.example.com'), 'reconcile must already be done by the time the call returns');
    assert.ok(db.kv.get(OPTIMIZED_VPS789_FETCHED_AT_KEY));
});

test('maybeRefreshOptimizedDomains: within TTL -> no-op, no fetch, no waitUntil', async () => {
    const db = makeOptimizedDB([]);
    db.kv.set(OPTIMIZED_VPS789_FETCHED_AT_KEY, String(Date.now() - 1000)); // fetched 1s ago
    const env = { DB: db };
    const ctx = makeCtx();
    let fetchCalled = false;
    const fetchImpl = async () => { fetchCalled = true; return Response.json({ code: 0, data: { good: [] } }); };

    await maybeRefreshOptimizedDomains(env, ctx, { fetchImpl, now: Date.now() });

    assert.equal(fetchCalled, false, 'still fresh — must not fetch at all');
    assert.equal(ctx._p.length, 0);
});

test('maybeRefreshOptimizedDomains: past TTL -> refreshes via ctx.waitUntil, not blocking', async () => {
    const db = makeOptimizedDB([]);
    const fetchedAt = Date.now() - VPS789_TTL_MS - 1000; // just past TTL
    db.kv.set(OPTIMIZED_VPS789_FETCHED_AT_KEY, String(fetchedAt));
    const env = { DB: db };
    const ctx = makeCtx();
    let fetchCalled = false;
    const fetchImpl = async () => {
        fetchCalled = true;
        return Response.json({ code: 0, data: { good: [{ ip: 'refreshed.example.com' }] } });
    };

    await maybeRefreshOptimizedDomains(env, ctx, { fetchImpl });

    assert.equal(ctx._p.length, 1, 'refresh should be deferred to exactly one ctx.waitUntil call');
    // Not yet necessarily reconciled synchronously — but once the deferred work
    // is flushed, the refresh must have actually happened.
    await flush(ctx);
    assert.equal(fetchCalled, true);
    assert.ok(db.rows().some(r => r.domain === 'refreshed.example.com'));
});

test('maybeRefreshOptimizedDomains: no env.DB -> no-op, does not throw', async () => {
    await assert.doesNotReject(maybeRefreshOptimizedDomains({}, makeCtx(), {}));
});

test('maybeRefreshOptimizedDomains: fetch failure past TTL leaves existing rows untouched (no reconcile)', async () => {
    const db = makeOptimizedDB([{ domain: 'stale.example.com', builtin: 1, enabled: 1 }]);
    const fetchedAt = Date.now() - VPS789_TTL_MS - 1000;
    db.kv.set(OPTIMIZED_VPS789_FETCHED_AT_KEY, String(fetchedAt));
    const env = { DB: db };
    const ctx = makeCtx();
    const fetchImpl = async () => new Response('boom', { status: 500 });

    await maybeRefreshOptimizedDomains(env, ctx, { fetchImpl });
    await flush(ctx);

    assert.ok(db.rows().some(r => r.domain === 'stale.example.com'), 'existing row must survive a failed refresh');
    assert.equal(db.kv.get(OPTIMIZED_VPS789_FETCHED_AT_KEY), String(fetchedAt), 'marker must stay unchanged on failure, so next GET retries inline');
});

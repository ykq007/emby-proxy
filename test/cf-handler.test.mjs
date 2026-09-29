/**
 * First test coverage for src/api/cf.js's /api/deploy and /api/route-trends
 * (#17) — exercised entirely through an in-memory createFakeCfApi() adapter
 * injected via handleCf(...deps), no real network traffic.
 *
 * Runner: node --test
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { handleCf } from '../src/api/cf.js';
import { createFakeCfApi } from '../src/cf/fakeApi.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

// /api/route-trends memoizes per (zone, days, UTC-hour) in a process-global
// Map; clear it so tests in the same hour don't see each other's fake data.
beforeEach(() => { globalThis.__routeTrendCache = new Map(); });

function makeUrl(path, query = '') {
    return new URL(`https://worker.example${path}${query}`);
}

function jsonRequest(method, body) {
    return new Request('https://worker.example/x', {
        method,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    });
}

function makeDB(rows) {
    return createD1Fake([{ test: /.*/, exec: () => rows }]);
}

// ---------------------------------------------------------------------------
// POST /api/deploy
// ---------------------------------------------------------------------------

function deployEnv(overrides = {}) {
    return {
        CF_API_TOKEN: 'tok',
        CF_ACCOUNT_ID: 'acct-1',
        CF_WORKER_NAME: 'my-worker',
        SOME_PLAIN_VAR: 'value',
        ...overrides,
    };
}

test('POST /api/deploy: fetches service config + bindings, then PUTs the script preserving both', async () => {
    const cfApi = createFakeCfApi({
        rest: (path, init) => {
            if (path === '/accounts/acct-1/workers/services/my-worker') {
                return { ok: true, status: 200, result: { default_environment: { script: { compatibility_date: '2025-05-01', placement: { mode: 'smart' } } } } };
            }
            if (path === '/accounts/acct-1/workers/scripts/my-worker/bindings') {
                return { ok: true, status: 200, result: [{ name: 'DB', type: 'd1' }, { name: 'SOME_PLAIN_VAR', type: 'plain_text' }] };
            }
            if (path === '/accounts/acct-1/workers/scripts/my-worker' && init.method === 'PUT') {
                return { ok: true, status: 200, result: { id: 'my-worker' } };
            }
            throw new Error('unexpected path ' + path);
        },
    });
    const req = jsonRequest('POST', { newCode: 'export default { fetch() {} }' });
    const res = await handleCf(req, deployEnv(), {}, makeUrl('/api/deploy'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, true);

    const put = cfApi.calls.rest.find(c => c.init.method === 'PUT');
    assert.ok(put, 'PUT call should have happened');
    assert.equal(put.init.isForm, true);
    const metadataEntry = put.init.body.get('metadata');
    const metadata = JSON.parse(await metadataEntry.text());
    assert.equal(metadata.compatibility_date, '2025-05-01');
    assert.deepEqual(metadata.placement, { mode: 'smart' });
    // D1 binding preserved verbatim; SOME_PLAIN_VAR re-derived from env, not duplicated from CF bindings.
    assert.ok(metadata.bindings.some(b => b.name === 'DB' && b.type === 'd1'));
    assert.equal(metadata.bindings.filter(b => b.name === 'SOME_PLAIN_VAR').length, 1);
});

test('POST /api/deploy: missing env vars short-circuits before any cfApi call', async () => {
    const cfApi = createFakeCfApi();
    const req = jsonRequest('POST', { newCode: 'x' });
    const res = await handleCf(req, deployEnv({ CF_ACCOUNT_ID: '' }), {}, makeUrl('/api/deploy'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(cfApi.calls.rest.length, 0);
});

test('POST /api/deploy: empty newCode is rejected without calling cfApi', async () => {
    const cfApi = createFakeCfApi();
    const req = jsonRequest('POST', {});
    const res = await handleCf(req, deployEnv(), {}, makeUrl('/api/deploy'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(cfApi.calls.rest.length, 0);
});

test('POST /api/deploy: service-info lookup failing does not abort the deploy (falls back to defaults)', async () => {
    const cfApi = createFakeCfApi({
        rest: (path, init) => {
            if (path.endsWith('/services/my-worker')) return { ok: false, reason: 'api-error', error: 'not found' };
            if (path.endsWith('/bindings')) return { ok: true, status: 200, result: [] };
            if (init.method === 'PUT') return { ok: true, status: 200, result: {} };
            throw new Error('unexpected ' + path);
        },
    });
    const req = jsonRequest('POST', { newCode: 'code' });
    const res = await handleCf(req, deployEnv(), {}, makeUrl('/api/deploy'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, true);
});

test('POST /api/deploy: a failing PUT surfaces the CF error and does not report success', async () => {
    const cfApi = createFakeCfApi({
        rest: (path, init) => {
            if (init.method === 'PUT') return { ok: false, reason: 'api-error', errors: [{ message: 'script too large' }] };
            return { ok: true, status: 200, result: path.endsWith('/bindings') ? [] : {} };
        },
    });
    const req = jsonRequest('POST', { newCode: 'code' });
    const res = await handleCf(req, deployEnv(), {}, makeUrl('/api/deploy'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /script too large/);
});

// ---------------------------------------------------------------------------
// GET /api/route-trends
// ---------------------------------------------------------------------------

function trendsEnv(overrides = {}) {
    return { CF_API_TOKEN: 'tok', CF_ZONE_ID: 'zone-1', DB: makeDB([{ prefix: 'movies' }, { prefix: 'tv' }]), ...overrides };
}

// Answers every aliased node `rN: httpRequestsAdaptiveGroups(... "/<prefix>%" ...)`
// in a query with today's bytesFor(prefix), or fails the whole query while failing().
function trendsFake(bytesFor, failing = () => false) {
    const today = new Date().toISOString().split('T')[0];
    return createFakeCfApi({
        graphql: (query) => {
            if (failing()) return { ok: false, reason: 'api-error', error: 'quota' };
            const zone = {};
            for (const [, alias, prefix] of query.matchAll(/(r\d+):\s*httpRequestsAdaptiveGroups\([^)]*?clientRequestPath_like:\s*"\/([^"]*)%"/g)) {
                zone[alias] = [{ dimensions: { date: today }, sum: { edgeResponseBytes: bytesFor(prefix) } }];
            }
            return { ok: true, status: 200, data: { viewer: { zones: [zone] } } };
        },
    });
}

test('GET /api/route-trends: returns per-route byte series sourced from the GraphQL fake', async () => {
    const cfApi = trendsFake(p => (p === 'movies' ? 111 : 222));
    const req = new Request('https://worker.example/api/route-trends?days=1');
    const res = await handleCf(req, trendsEnv(), {}, makeUrl('/api/route-trends', '?days=1'), { cfApi });
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.source, 'cf-graphql');
    const byPrefix = Object.fromEntries(body.items.map(i => [i.prefix, i.bytes]));
    assert.deepEqual(byPrefix.movies, [111]);
    assert.deepEqual(byPrefix.tv, [222]);
    assert.equal(cfApi.calls.graphql.length, 1);
});

// Workers Free allows 50 fetch() subrequests per invocation; one GraphQL call
// per route blew past it at 49 routes and silently zeroed the overflow.
test('GET /api/route-trends: GraphQL calls do not grow one-per-route', async () => {
    const prefixes = Array.from({ length: 60 }, (_, i) => `p${i}`);
    const cfApi = trendsFake(p => Number(p.slice(1)) + 1);
    const env = trendsEnv({ DB: makeDB(prefixes.map(prefix => ({ prefix }))) });
    const res = await handleCf(new Request('https://worker.example/api/route-trends?days=1'), env, {}, makeUrl('/api/route-trends', '?days=1'), { cfApi });
    const body = await res.json();
    assert.ok(cfApi.calls.graphql.length <= 3, `expected ≤3 GraphQL calls for 60 routes, got ${cfApi.calls.graphql.length}`);
    // The live API rejected a 60-node query ("too many nodes") and accepted 51.
    for (const { query } of cfApi.calls.graphql) {
        assert.ok(query.match(/httpRequestsAdaptiveGroups/g).length <= 50);
    }
    assert.deepEqual(body.items.map(i => [i.prefix, i.bytes[0]]), prefixes.map((p, i) => [p, i + 1]));
});

test('GET /api/route-trends: a failed GraphQL batch zero-fills its routes and is not cached', async () => {
    let failing = true;
    const cfApi = trendsFake(() => 5, () => failing);
    const call = async () => (await handleCf(new Request('https://worker.example/api/route-trends?days=1'), trendsEnv(), {}, makeUrl('/api/route-trends', '?days=1'), { cfApi })).json();

    const first = await call();
    assert.equal(first.ok, true);
    assert.deepEqual(first.items.map(i => i.bytes), [[0], [0]]);

    failing = false;
    const second = await call();
    assert.deepEqual(second.items.map(i => i.bytes), [[5], [5]]);
});

test('GET /api/route-trends: missing CF env vars short-circuits before touching cfApi', async () => {
    const cfApi = createFakeCfApi();
    const req = new Request('https://worker.example/api/route-trends');
    const res = await handleCf(req, trendsEnv({ CF_API_TOKEN: '' }), {}, makeUrl('/api/route-trends'), { cfApi });
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.reason, 'no-cf-token');
    assert.equal(cfApi.calls.graphql.length, 0);
});

test('GET /api/route-trends: no routes in DB short-circuits before any GraphQL call', async () => {
    const cfApi = createFakeCfApi();
    const req = new Request('https://worker.example/api/route-trends');
    const res = await handleCf(req, trendsEnv({ DB: makeDB([]) }), {}, makeUrl('/api/route-trends'), { cfApi });
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.reason, 'no-routes');
    assert.equal(cfApi.calls.graphql.length, 0);
});

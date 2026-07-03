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

test('GET /api/route-trends: returns per-route byte series sourced from the GraphQL fake', async () => {
    const cfApi = createFakeCfApi({
        graphql: (query) => {
            const bytes = query.includes('/movies%') ? 111 : 222;
            return { ok: true, status: 200, data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [{ dimensions: { date: new Date().toISOString().split('T')[0] }, sum: { edgeResponseBytes: bytes } }] }] } } };
        },
    });
    const req = new Request('https://worker.example/api/route-trends?days=1');
    const res = await handleCf(req, trendsEnv(), {}, makeUrl('/api/route-trends', '?days=1'), { cfApi });
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.source, 'cf-graphql');
    const byPrefix = Object.fromEntries(body.items.map(i => [i.prefix, i.bytes]));
    assert.deepEqual(byPrefix.movies, [111]);
    assert.deepEqual(byPrefix.tv, [222]);
    assert.equal(cfApi.calls.graphql.length, 2);
});

test('GET /api/route-trends: a GraphQL failure for one route degrades to a zero-filled series, not a crash', async () => {
    const cfApi = createFakeCfApi({
        graphql: (query) => {
            if (query.includes('/movies%')) return { ok: false, reason: 'api-error', error: 'rate limited' };
            return { ok: true, status: 200, data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [] }] } } };
        },
    });
    const req = new Request('https://worker.example/api/route-trends?days=1');
    const res = await handleCf(req, trendsEnv(), {}, makeUrl('/api/route-trends', '?days=1'), { cfApi });
    const body = await res.json();
    assert.equal(body.ok, true);
    const byPrefix = Object.fromEntries(body.items.map(i => [i.prefix, i.bytes]));
    assert.deepEqual(byPrefix.movies, [0]);
    assert.deepEqual(byPrefix.tv, [0]);
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

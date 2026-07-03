/**
 * Tests for src/cf/api.js (real HTTP adapter) and src/cf/fakeApi.js (in-memory
 * adapter for tests) — the single seam that owns Bearer auth, timeout, and
 * success/error envelope mapping for every api.cloudflare.com call (#17).
 *
 * Runner: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createCfApi, CF_API_BASE, DEFAULT_CF_TIMEOUT_MS } from '../src/cf/api.js';
import { createFakeCfApi } from '../src/cf/fakeApi.js';

// ---------------------------------------------------------------------------
// createCfApi() — real (fetch-backed) adapter
// ---------------------------------------------------------------------------

test('cfApi.rest: applies Bearer auth header and hits the CF REST base URL', async () => {
    let seenUrl, seenInit;
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok-123' }, {
        fetchImpl: async (url, init) => {
            seenUrl = url; seenInit = init;
            return Response.json({ success: true, result: { id: 'z1' } });
        },
    });
    const r = await cfApi.rest('/zones/abc/dns_records');
    assert.equal(seenUrl, `${CF_API_BASE}/zones/abc/dns_records`);
    assert.equal(seenInit.headers.Authorization, 'Bearer tok-123');
    assert.equal(r.ok, true);
    assert.deepEqual(r.result, { id: 'z1' });
});

test('cfApi.rest: JSON body is stringified with Content-Type application/json', async () => {
    let seenInit;
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        fetchImpl: async (url, init) => { seenInit = init; return Response.json({ success: true, result: null }); },
    });
    await cfApi.rest('/zones/z/dns_records', { method: 'POST', body: { type: 'A', name: 'x' } });
    assert.equal(seenInit.method, 'POST');
    assert.equal(seenInit.headers['Content-Type'], 'application/json');
    assert.equal(seenInit.body, JSON.stringify({ type: 'A', name: 'x' }));
});

test('cfApi.rest: isForm bodies (FormData) are passed through untouched, no Content-Type forced', async () => {
    let seenInit;
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        fetchImpl: async (url, init) => { seenInit = init; return Response.json({ success: true, result: null }); },
    });
    const fd = new FormData();
    fd.append('worker.js', new Blob(['x']), 'worker.js');
    await cfApi.rest('/accounts/a/workers/scripts/w', { method: 'PUT', body: fd, isForm: true });
    assert.equal(seenInit.body, fd);
    assert.equal(seenInit.headers['Content-Type'], undefined);
});

test('cfApi.rest: success:false envelope maps to ok:false with the CF errors array', async () => {
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        fetchImpl: async () => Response.json({ success: false, errors: [{ code: 9109, message: 'boom' }] }),
    });
    const r = await cfApi.rest('/zones/z/dns_records');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'api-error');
    assert.deepEqual(r.errors, [{ code: 9109, message: 'boom' }]);
    assert.match(r.error, /boom/);
});

test('cfApi.rest: non-2xx HTTP status maps to ok:false even without a JSON success field', async () => {
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        fetchImpl: async () => new Response('nope', { status: 502 }),
    });
    const r = await cfApi.rest('/zones/z/dns_records');
    assert.equal(r.ok, false);
    assert.equal(r.status, 502);
});

test('cfApi.rest: missing CF_API_TOKEN short-circuits without calling fetch', async () => {
    let called = false;
    const cfApi = createCfApi({}, { fetchImpl: async () => { called = true; return Response.json({ success: true }); } });
    const r = await cfApi.rest('/zones/z/dns_records');
    assert.equal(called, false);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'missing-token');
});

test('cfApi.rest: every call carries a timeout and aborts a hanging request', async () => {
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        timeoutMs: 20,
        fetchImpl: (url, init) => new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () => {
                const err = new Error('aborted'); err.name = 'AbortError'; reject(err);
            });
        }),
    });
    const r = await cfApi.rest('/zones/z/dns_records');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'timeout');
});

test('cfApi.rest: per-call timeoutMs overrides the client default', async () => {
    let signalTimedOut = false;
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        timeoutMs: DEFAULT_CF_TIMEOUT_MS,
        fetchImpl: (url, init) => new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () => {
                signalTimedOut = true;
                const err = new Error('aborted'); err.name = 'AbortError'; reject(err);
            });
        }),
    });
    await cfApi.rest('/zones/z/dns_records', { timeoutMs: 20 });
    assert.equal(signalTimedOut, true);
});

test('cfApi.graphql: posts to /graphql with Bearer auth and returns data on success', async () => {
    let seenUrl, seenBody;
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        fetchImpl: async (url, init) => {
            seenUrl = url; seenBody = JSON.parse(init.body);
            return Response.json({ data: { viewer: { zones: [{ ok: true }] } } });
        },
    });
    const r = await cfApi.graphql('query { viewer { zones { ok } } }');
    assert.equal(seenUrl, `${CF_API_BASE}/graphql`);
    assert.equal(seenBody.query, 'query { viewer { zones { ok } } }');
    assert.equal(r.ok, true);
    assert.deepEqual(r.data, { viewer: { zones: [{ ok: true }] } });
});

test('cfApi.graphql: a non-empty errors array maps to ok:false even on HTTP 200', async () => {
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        fetchImpl: async () => Response.json({ errors: [{ message: 'quota exceeded' }] }),
    });
    const r = await cfApi.graphql('query {}');
    assert.equal(r.ok, false);
    assert.match(r.error, /quota exceeded/);
});

test('cfApi.graphql: network failure surfaces as ok:false network-error, not a throw', async () => {
    const cfApi = createCfApi({ CF_API_TOKEN: 'tok' }, {
        fetchImpl: async () => { throw new Error('DNS lookup failed'); },
    });
    const r = await cfApi.graphql('query {}');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'network-error');
    assert.equal(r.error, 'DNS lookup failed');
});

// ---------------------------------------------------------------------------
// createFakeCfApi() — in-memory adapter used by handler tests
// ---------------------------------------------------------------------------

test('createFakeCfApi: records every rest()/graphql() call and defaults to an ok envelope', async () => {
    const fake = createFakeCfApi();
    const r1 = await fake.rest('/zones/z/dns_records', { method: 'GET' });
    const r2 = await fake.graphql('query {}', { foo: 1 });
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    assert.equal(fake.calls.rest.length, 1);
    assert.equal(fake.calls.rest[0].path, '/zones/z/dns_records');
    assert.equal(fake.calls.graphql.length, 1);
    assert.deepEqual(fake.calls.graphql[0].variables, { foo: 1 });
});

test('createFakeCfApi: routes calls through user-supplied handlers, never touching the network', async () => {
    const fake = createFakeCfApi({
        rest: (path, init) => {
            if (init.method === 'POST') return { ok: true, status: 200, result: { id: 'new-1' } };
            return { ok: false, reason: 'api-error', error: 'not found' };
        },
    });
    const created = await fake.rest('/zones/z/dns_records', { method: 'POST', body: {} });
    const listed = await fake.rest('/zones/z/dns_records');
    assert.deepEqual(created.result, { id: 'new-1' });
    assert.equal(listed.ok, false);
});

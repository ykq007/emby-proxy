/**
 * First test coverage for src/api/dns.js (#17) — exercised entirely through
 * an in-memory createFakeCfApi() adapter injected via handleDns(...deps),
 * no real network traffic.
 *
 * Runner: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleDns } from '../src/api/dns.js';
import { createFakeCfApi } from '../src/cf/fakeApi.js';

function makeUrl(path, query = '') {
    return new URL(`https://worker.example${path}${query}`);
}

function makeEnv(overrides = {}) {
    return {
        CF_API_TOKEN: 'tok',
        CF_ZONE_ID: 'zone-1',
        CF_DOMAIN: 'proxy.example.com',
        ...overrides,
    };
}

function jsonRequest(method, body) {
    return new Request('https://worker.example/x', {
        method,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    });
}

// ---------------------------------------------------------------------------
// /api/dns-ready — no CF call, pure env-presence check
// ---------------------------------------------------------------------------

test('GET /api/dns-ready: ready:true when all three CF env vars are set', async () => {
    const req = new Request('https://worker.example/api/dns-ready');
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/dns-ready'));
    const body = await res.json();
    assert.equal(body.ready, true);
    assert.equal(body.domain, 'proxy.example.com');
});

test('GET /api/dns-ready: ready:false when CF_ZONE_ID is missing', async () => {
    const req = new Request('https://worker.example/api/dns-ready');
    const res = await handleDns(req, makeEnv({ CF_ZONE_ID: '' }), {}, makeUrl('/api/dns-ready'));
    const body = await res.json();
    assert.equal(body.ready, false);
});

// ---------------------------------------------------------------------------
// GET /api/get-dns
// ---------------------------------------------------------------------------

test('GET /api/get-dns: returns the CF record list through the fake adapter', async () => {
    const cfApi = createFakeCfApi({
        rest: (path) => {
            assert.equal(path, `/zones/zone-1/dns_records?name=proxy.example.com`);
            return { ok: true, status: 200, result: [{ id: 'r1', type: 'A', content: '1.2.3.4' }] };
        },
    });
    const req = new Request('https://worker.example/api/get-dns');
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/get-dns'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.result, [{ id: 'r1', type: 'A', content: '1.2.3.4' }]);
    assert.equal(cfApi.calls.rest.length, 1);
});

test('GET /api/get-dns: surfaces a CF error envelope without throwing', async () => {
    const cfApi = createFakeCfApi({ rest: () => ({ ok: false, reason: 'api-error', errors: [{ message: 'invalid zone' }] }) });
    const req = new Request('https://worker.example/api/get-dns');
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/get-dns'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /invalid zone/);
});

test('GET /api/get-dns: missing DNS env vars short-circuits before touching cfApi', async () => {
    const cfApi = createFakeCfApi();
    const req = new Request('https://worker.example/api/get-dns');
    const res = await handleDns(req, makeEnv({ CF_DOMAIN: '' }), {}, makeUrl('/api/get-dns'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(cfApi.calls.rest.length, 0);
});

// ---------------------------------------------------------------------------
// POST /api/dns/replace — list, delete old A/AAAA/CNAME, create new CNAME
// ---------------------------------------------------------------------------

test('POST /api/dns/replace: deletes every old record then writes a single new CNAME', async () => {
    const cfApi = createFakeCfApi({
        rest: (path, init) => {
            if (init.method === undefined || init.method === 'GET') {
                return { ok: true, status: 200, result: [
                    { id: 'a1', type: 'A', content: '1.1.1.1' },
                    { id: 'a2', type: 'AAAA', content: '::1' },
                    { id: 'txt1', type: 'TXT', content: 'keep-me' },
                ] };
            }
            return { ok: true, status: 200, result: { id: 'new-cname' } };
        },
    });
    const req = jsonRequest('POST', { domain: 'new-target.example.net' });
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/dns/replace'), { cfApi });
    const body = await res.json();

    assert.equal(body.success, true);
    assert.equal(body.replaced, 2); // TXT record is not A/AAAA/CNAME, must survive
    assert.equal(body.content, 'new-target.example.net');

    const deletes = cfApi.calls.rest.filter(c => c.init.method === 'DELETE');
    assert.deepEqual(deletes.map(d => d.path).sort(), [
        '/zones/zone-1/dns_records/a1',
        '/zones/zone-1/dns_records/a2',
    ]);

    const posts = cfApi.calls.rest.filter(c => c.init.method === 'POST');
    assert.equal(posts.length, 1);
    assert.deepEqual(posts[0].init.body, { type: 'CNAME', name: 'proxy.example.com', content: 'new-target.example.net', ttl: 60, proxied: false });
});

test('POST /api/dns/replace: rejects with 400 when domain body field is missing', async () => {
    const cfApi = createFakeCfApi();
    const req = jsonRequest('POST', {});
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/dns/replace'), { cfApi });
    assert.equal(res.status, 400);
    assert.equal(cfApi.calls.rest.length, 0);
});

test('POST /api/dns/replace: a failed CF list call returns 502 and skips the write', async () => {
    const cfApi = createFakeCfApi({ rest: () => ({ ok: false, reason: 'timeout', error: 'timed out' }) });
    const req = jsonRequest('POST', { domain: 'x.example.net' });
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/dns/replace'), { cfApi });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /timed out/);
});

// ---------------------------------------------------------------------------
// POST /api/update-dns — list, delete old, create one record per IP
// ---------------------------------------------------------------------------

test('POST /api/update-dns: creates A/AAAA/CNAME records by sniffing each ip entry', async () => {
    const cfApi = createFakeCfApi({
        rest: (path, init) => {
            if (init.method === undefined || init.method === 'GET') {
                return { ok: true, status: 200, result: [{ id: 'old1', type: 'A', content: '9.9.9.9' }] };
            }
            return { ok: true, status: 200, result: { id: 'ok' } };
        },
    });
    const req = jsonRequest('POST', { ips: ['1.2.3.4', '2001:db8::1', 'origin.example.com'] });
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/update-dns'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, true);

    const posts = cfApi.calls.rest.filter(c => c.init.method === 'POST').map(c => c.init.body);
    assert.deepEqual(posts.map(p => p.type), ['A', 'AAAA', 'CNAME']);
    assert.deepEqual(posts.map(p => p.content), ['1.2.3.4', '2001:db8::1', 'origin.example.com']);
});

test('POST /api/update-dns: a failing create throws and reports the CF error', async () => {
    const cfApi = createFakeCfApi({
        rest: (path, init) => {
            if (init.method === undefined || init.method === 'GET') return { ok: true, status: 200, result: [] };
            return { ok: false, reason: 'api-error', errors: [{ message: 'duplicate record' }] };
        },
    });
    const req = jsonRequest('POST', { ips: ['1.2.3.4'] });
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/update-dns'), { cfApi });
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /duplicate record/);
});

// ---------------------------------------------------------------------------
// Default: no cfApi injected → falls back to the real adapter (no crash on construction)
// ---------------------------------------------------------------------------

test('handleDns: without deps.cfApi it still constructs a working default adapter', async () => {
    const req = new Request('https://worker.example/api/dns-ready');
    const res = await handleDns(req, makeEnv(), {}, makeUrl('/api/dns-ready'));
    assert.equal(res.status, 200);
});

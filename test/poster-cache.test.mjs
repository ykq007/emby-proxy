/**
 * Tests for src/proxy/poster-cache.js — R2 image cache helpers.
 * Verifies key derivation, get hit/miss/no-binding, and put gating
 * (only 200 image/* under the size cap; no-op without binding/ctx).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { posterCacheKey, r2GetImage, r2PutImage } from '../src/proxy/poster-cache.js';

function makeR2(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        _store: store,
        async get(key) {
            if (!store.has(key)) return null;
            const v = store.get(key);
            return { body: v.body, writeHttpMetadata(h) { if (v.contentType) h.set('content-type', v.contentType); } };
        },
        async put(key, buf, opts) { store.set(key, { body: buf, contentType: opts && opts.httpMetadata && opts.httpMetadata.contentType }); },
    };
}
function makeCtx() { return { _p: [], waitUntil(p) { this._p.push(p); } }; }
const flush = async (ctx) => { await Promise.all(ctx._p); };

test('posterCacheKey: prefix + path; empty prefix → "_"', () => {
    assert.equal(posterCacheKey('misaka', '/Images/1.jpg'), 'misaka/Images/1.jpg');
    assert.equal(posterCacheKey('', '/x'), '_/x');
    assert.equal(posterCacheKey(null, null), '_');
});

test('r2GetImage: no binding → null', async () => {
    assert.equal(await r2GetImage({}, 'k'), null);
});

test('r2GetImage: miss → null', async () => {
    assert.equal(await r2GetImage({ POSTER_CACHE: makeR2() }, 'absent'), null);
});

test('r2GetImage: hit → 200 Response with X-R2-Cache HIT + content-type', async () => {
    const env = { POSTER_CACHE: makeR2({ 'p/x.jpg': { body: new Uint8Array([1, 2, 3]), contentType: 'image/jpeg' } }) };
    const res = await r2GetImage(env, 'p/x.jpg');
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-R2-Cache'), 'HIT');
    assert.equal(res.headers.get('content-type'), 'image/jpeg');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('r2PutImage: 200 image under cap → stored', async () => {
    const env = { POSTER_CACHE: makeR2() };
    const ctx = makeCtx();
    const resp = new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'image/png' } });
    r2PutImage(env, 'p/a.png', resp, ctx);
    await flush(ctx);
    assert.ok(env.POSTER_CACHE._store.has('p/a.png'));
});

test('r2PutImage: non-image content-type → not stored', async () => {
    const env = { POSTER_CACHE: makeR2() };
    const ctx = makeCtx();
    const resp = new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    r2PutImage(env, 'p/a.json', resp, ctx);
    await flush(ctx);
    assert.ok(!env.POSTER_CACHE._store.has('p/a.json'));
});

test('r2PutImage: declared size over 5MB cap → not stored', async () => {
    const env = { POSTER_CACHE: makeR2() };
    const ctx = makeCtx();
    const resp = new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(6 * 1024 * 1024) } });
    r2PutImage(env, 'p/big.png', resp, ctx);
    await flush(ctx);
    assert.ok(!env.POSTER_CACHE._store.has('p/big.png'));
});

test('r2PutImage: non-200 → not stored', async () => {
    const env = { POSTER_CACHE: makeR2() };
    const ctx = makeCtx();
    r2PutImage(env, 'p/404.png', new Response('x', { status: 404, headers: { 'content-type': 'image/png' } }), ctx);
    await flush(ctx);
    assert.ok(!env.POSTER_CACHE._store.has('p/404.png'));
});

test('r2PutImage: no binding / no ctx → no-op (no throw)', async () => {
    const ctx = makeCtx();
    assert.doesNotThrow(() => r2PutImage({}, 'k', new Response('x', { status: 200, headers: { 'content-type': 'image/png' } }), ctx));
    assert.doesNotThrow(() => r2PutImage({ POSTER_CACHE: makeR2() }, 'k', new Response('x', { status: 200, headers: { 'content-type': 'image/png' } }), null));
});

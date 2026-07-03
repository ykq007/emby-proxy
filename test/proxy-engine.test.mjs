/**
 * Integration / smoke tests for src/proxy/engine.js
 *
 * Purpose: lock in CURRENT behavior of proxyRequest() so future refactors
 * cannot silently break the core proxy logic.
 *
 * Runner: node --test   (Node 22 built-in, no extra deps)
 *
 * NOTE on manual redirect domains:
 *   Tests that need allowlisted redirect passthrough inject an in-memory
 *   MANUAL_REDIRECT_ALLOWLIST adapter through env.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { proxyRequest, orderUpstreamsByHealth, markUpstreamFailure, markUpstreamSuccess, UPSTREAM_CB } from '../src/proxy/engine.js';
import { createMemoryManualRedirectAllowlist } from '../src/routing/manual-redirect-allowlist.js';
import { __setConfigForTest, __resetConfigCache } from '../src/proxy/config-cache.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

// #13: route lookup + country/hotlink/manual-redirect allowlists now come from
// the per-isolate config cache (config-cache.js), not per-request D1 reads.
// Tests seed that cache directly via __setConfigForTest so the engine tests
// stay DB-agnostic for the route/gate lookup (env.DB is still used for the
// unrelated stats/keepalive/R2 writes that some tests exercise).
beforeEach(() => { __resetConfigCache(); });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the standard ctx stub. */
function makeCtx() {
    return { waitUntil(p) { this._pending = this._pending || []; this._pending.push(p); } };
}

/**
 * Build a fake D1 statement chain that supports .prepare(sql).bind(...).first()
 * and .prepare(sql).bind(...).all() and .prepare(sql).bind(...).run() and .batch([]).
 *
 * routeRow: the row returned for the known prefix "myemby".
 *           Pass null to simulate "no route found".
 * kvRows:   map of { k -> { v } } rows returned for kv_config selects.
 */
function makeDB({ routeRow = null, kvRows = {} } = {}) {
    return createD1Fake([
        // Route lookup: SELECT … FROM routes WHERE prefix = ?  (parameterized)
        {
            test: /FROM routes WHERE prefix\s*=\s*\?/i,
            exec: ([prefix]) => (prefix === 'myemby' && routeRow !== undefined && routeRow !== null ? [routeRow] : []),
        },
        // kv_config lookup with parameterized ? (used by ensureSchema)
        {
            test: /FROM kv_config WHERE k\s*=\s*\?/i,
            exec: ([key]) => (kvRows[key] ? [kvRows[key]] : []),
        },
        // kv_config lookup with literal string (loadCountryAllowlist uses a
        // hardcoded string literal, not a ? placeholder), e.g. WHERE k = 'proxy_country_allowlist'
        {
            test: /FROM kv_config WHERE k\s*=\s*'([^']+)'/i,
            exec: (_binds, sql) => {
                const key = sql.match(/FROM kv_config WHERE k\s*=\s*'([^']+)'/i)[1];
                return kvRows[key] ? [kvRows[key]] : [];
            },
        },
    ]);
}

/** A minimal "known" route row. */
const KNOWN_ROUTE = {
    target: 'https://upstream.example.com',
    mode: 'off',
    cache_img: 'on',
    custom_headers: '',
    media_counts_auto_auth: 0,
};

/**
 * Call proxyRequest with a fake request.
 * path: the full path component, e.g. '/myemby/foo'
 * opts: additional Request init (method, headers, body, …)
 * env:  env object; defaults to one with a DB that knows about 'myemby'
 * configSeed: object passed to __setConfigForTest to seed the config cache
 *   (routesMap/countrySet/hotlinkSet/manualRedirectSet). Defaults to a cache
 *   with just the known 'myemby' route and no gates configured. Pass `null`
 *   explicitly to skip seeding and let getConfig() hit env.DB.batch for real
 *   (used by the DB-not-bound / DB-error tests).
 */
function defaultConfigSeed() {
    return { routesMap: new Map([['myemby', KNOWN_ROUTE]]) };
}

async function callEngine(path, opts = {}, env = null, configSeed = defaultConfigSeed()) {
    const fullUrl = 'https://proxy.example.com' + path;
    const request = new Request(fullUrl, opts);
    const url = new URL(request.url);
    const ctx = makeCtx();
    const resolvedEnv = env ?? { DB: makeDB({ routeRow: KNOWN_ROUTE }) };
    if (configSeed) __setConfigForTest(configSeed);
    const response = await proxyRequest(request, resolvedEnv, ctx, url);
    return { response, ctx };
}

/** Stub globalThis.fetch, return a restore function. */
function stubFetch(fn) {
    const orig = globalThis.fetch;
    globalThis.fetch = fn;
    return () => { globalThis.fetch = orig; };
}

// ---------------------------------------------------------------------------
// 1. DB not bound  →  404 "DB not bound"
// ---------------------------------------------------------------------------

test('DB not bound → 404 with "DB not bound" message', async () => {
    const { response } = await callEngine('/myemby/foo', {}, { /* no DB */ });
    assert.equal(response.status, 404);
    const text = await response.text();
    assert.ok(text.includes('DB not bound'), `body was: ${text}`);
});

// ---------------------------------------------------------------------------
// 2. Unknown prefix  →  404 "Node not found"
// ---------------------------------------------------------------------------

test('unknown prefix → 404 with "Node not found"', async () => {
    const restore = stubFetch(async () => { throw new Error('should not be called'); });
    try {
        // DB is bound but returns null for the prefix "unknown"
        const env = { DB: makeDB({ routeRow: null }) };
        const { response } = await callEngine('/unknown/foo', {}, env);
        assert.equal(response.status, 404);
        const text = await response.text();
        assert.ok(text.includes('Node not found'), `body was: ${text}`);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 3. Empty prefix (bare '/')  →  404 "Not Found"
// ---------------------------------------------------------------------------

test('empty prefix (bare /) → 404 Not Found', async () => {
    // The code: const prefix = pathParts[1]; if (!prefix) return 404
    const env = { DB: makeDB() };
    const { response } = await callEngine('/', {}, env);
    assert.equal(response.status, 404);
    const text = await response.text();
    assert.equal(text, 'Not Found');
});

// ---------------------------------------------------------------------------
// 4. Known prefix  →  engine fetches upstream, returns body + CORS header
// ---------------------------------------------------------------------------

test('known prefix /myemby/foo → fetches https://upstream.example.com/foo, returns body + CORS', async () => {
    const capturedUrls = [];
    const restore = stubFetch(async (req) => {
        capturedUrls.push(typeof req === 'string' ? req : req.url);
        return new Response('upstream-body', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    });
    try {
        const { response } = await callEngine('/myemby/foo');
        // Engine should have fetched the upstream
        assert.ok(capturedUrls.length > 0, 'fetch should have been called');
        // The actual upstream URL must include the path /foo
        assert.ok(
            capturedUrls.some(u => u.includes('upstream.example.com') && u.includes('/foo')),
            `expected upstream.example.com/foo in fetch calls, got: ${capturedUrls}`
        );
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
        const body = await response.text();
        assert.equal(body, 'upstream-body');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 5. Direct passthrough: path starts with /https://
// ---------------------------------------------------------------------------

test('path /https://other.example.com/x → fetches that URL directly (no prefix lookup)', async () => {
    const capturedUrls = [];
    const restore = stubFetch(async (req) => {
        capturedUrls.push(typeof req === 'string' ? req : req.url);
        return new Response('direct-body', { status: 200 });
    });
    try {
        // env with NO DB — the direct-path branch runs BEFORE any DB call
        const { response } = await callEngine('/https://other.example.com/x', {}, { /* no DB */ });
        assert.ok(
            capturedUrls.some(u => u.includes('other.example.com/x')),
            `expected other.example.com/x in fetch calls, got: ${capturedUrls}`
        );
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 6. Multi-upstream failover: first upstream fails, second succeeds
// ---------------------------------------------------------------------------

test('multi-upstream failover: first throws, second succeeds', async () => {
    const MULTI_ROUTE = {
        target: 'https://a.example.com,https://b.example.com',
        mode: 'off',
        cache_img: 'off',
        custom_headers: '',
        media_counts_auto_auth: 0,
    };
    const env = { DB: makeDB({ routeRow: MULTI_ROUTE }) };

    const capturedUrls = [];
    const restore = stubFetch(async (req) => {
        const url = typeof req === 'string' ? req : req.url;
        capturedUrls.push(url);
        if (url.includes('a.example.com')) {
            throw new Error('connection refused');
        }
        return new Response('from-b', { status: 200 });
    });
    try {
        const { response } = await callEngine('/myemby/video', {}, env, { routesMap: new Map([['myemby', MULTI_ROUTE]]) });
        assert.equal(response.status, 200);
        const body = await response.text();
        assert.equal(body, 'from-b');
        // Must have tried a first
        assert.ok(capturedUrls.some(u => u.includes('a.example.com')), 'should have tried a.example.com');
        // Must have fallen over to b
        assert.ok(capturedUrls.some(u => u.includes('b.example.com')), 'should have fallen over to b.example.com');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 7. Multi-upstream failover: upstream returns 502, falls over
// ---------------------------------------------------------------------------

test('multi-upstream failover: first returns 502, second returns 200', async () => {
    const MULTI_ROUTE = {
        target: 'https://a.example.com,https://b.example.com',
        mode: 'off',
        cache_img: 'off',
        custom_headers: '',
        media_counts_auto_auth: 0,
    };
    const env = { DB: makeDB({ routeRow: MULTI_ROUTE }) };

    const capturedUrls = [];
    const restore = stubFetch(async (req) => {
        const url = typeof req === 'string' ? req : req.url;
        capturedUrls.push(url);
        if (url.includes('a.example.com')) {
            return new Response('bad gateway', { status: 502 });
        }
        return new Response('from-b-ok', { status: 200 });
    });
    try {
        const { response } = await callEngine('/myemby/stream', {}, env, { routesMap: new Map([['myemby', MULTI_ROUTE]]) });
        assert.equal(response.status, 200);
        const body = await response.text();
        assert.equal(body, 'from-b-ok');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 8. All upstreams fail → 502 failover-exhausted
// ---------------------------------------------------------------------------

test('all upstreams fail → 502 failover exhausted', async () => {
    const MULTI_ROUTE = {
        target: 'https://a.example.com,https://b.example.com',
        mode: 'off',
        cache_img: 'off',
        custom_headers: '',
        media_counts_auto_auth: 0,
    };
    const env = { DB: makeDB({ routeRow: MULTI_ROUTE }) };

    const restore = stubFetch(async () => {
        throw new Error('all nodes down');
    });
    try {
        const { response } = await callEngine('/myemby/something', {}, env, { routesMap: new Map([['myemby', MULTI_ROUTE]]) });
        assert.equal(response.status, 502);
        const text = await response.text();
        assert.ok(text.includes('Failover Exhausted') || text.includes('All nodes failed'), `body: ${text}`);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 9. 3xx redirect rewriting: absolute Location → proxy prefix + encodeURIComponent
// ---------------------------------------------------------------------------

test('302 redirect: absolute Location is rewritten with proxy prefix + encodeURIComponent', async () => {
    const redirectTarget = 'https://realserver.example.com/path?token=abc';
    const restore = stubFetch(async () => {
        return new Response(null, {
            status: 302,
            headers: { 'Location': redirectTarget }
        });
    });
    try {
        const { response } = await callEngine('/myemby/video');
        assert.equal(response.status, 302);
        const loc = response.headers.get('Location');
        // The engine rewrites to: /{prefix}/{encodeURIComponent(absoluteURL)}
        // safePrefix = '/myemby', so: /myemby/<encoded>
        const expected = '/myemby/' + encodeURIComponent(redirectTarget);
        assert.equal(loc, expected, `Location was: ${loc}`);
        // CORS header still set
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 10. 3xx redirect: root-relative Location → prepend safePrefix
// ---------------------------------------------------------------------------

test('302 redirect: root-relative Location gets prefix prepended', async () => {
    const restore = stubFetch(async () => {
        return new Response(null, {
            status: 302,
            headers: { 'Location': '/some/path' }
        });
    });
    try {
        const { response } = await callEngine('/myemby/page');
        assert.equal(response.status, 302);
        const loc = response.headers.get('Location');
        // root-relative: safePrefix + location → /myemby/some/path
        assert.equal(loc, '/myemby/some/path', `Location was: ${loc}`);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 11. Static asset caching: .jpg path + cache_img 'on' → Cache-Control header
// ---------------------------------------------------------------------------

test('static .jpg path with cache_img=on → Cache-Control: public, max-age=86400', async () => {
    const restore = stubFetch(async () => {
        return new Response(new Uint8Array([0xff, 0xd8]).buffer, {
            status: 200,
            headers: { 'Content-Type': 'image/jpeg' }
        });
    });
    try {
        const { response } = await callEngine('/myemby/poster.jpg');
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'public, max-age=86400');
        // CORS still present
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 12. Static asset caching: /Images/ path → Cache-Control: public, max-age=86400
// ---------------------------------------------------------------------------

test('/Images/ path with cache_img=on → Cache-Control: public, max-age=86400', async () => {
    const restore = stubFetch(async () => {
        return new Response('img', { status: 200 });
    });
    try {
        const { response } = await callEngine('/myemby/Images/primary.jpg');
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'public, max-age=86400');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 13. Non-static path → Cache-Control: no-store
// ---------------------------------------------------------------------------

test('non-static path → Cache-Control: no-store', async () => {
    const restore = stubFetch(async () => {
        return new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    try {
        // /myemby/Users/abc is not a static asset
        const { response } = await callEngine('/myemby/Users/abc');
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 14. cache_img='off' → no Cache-Control: public, falls back to no-store
// ---------------------------------------------------------------------------

test('static .jpg path with cache_img=off → Cache-Control: no-store', async () => {
    const CACHE_OFF_ROUTE = { ...KNOWN_ROUTE, cache_img: 'off' };
    const env = { DB: makeDB({ routeRow: CACHE_OFF_ROUTE }) };
    const restore = stubFetch(async () => {
        return new Response('img', { status: 200 });
    });
    try {
        const { response } = await callEngine('/myemby/poster.jpg', {}, env, { routesMap: new Map([['myemby', CACHE_OFF_ROUTE]]) });
        assert.equal(response.status, 200);
        // enableCache is false → falls into else branch → no-store
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 15. PlaybackInfo JSON rewriting: DirectStreamUrl rewritten to proxy origin
// ---------------------------------------------------------------------------

test('PlaybackInfo response: DirectStreamUrl is rewritten through proxy', async () => {
    const upstreamOrigin = 'https://upstream.example.com';
    const originalUrl = `${upstreamOrigin}/Videos/123/stream.mp4?Token=abc`;
    const playbackInfo = {
        MediaSources: [
            { DirectStreamUrl: originalUrl, TranscodingUrl: originalUrl + '&transcoding=1' }
        ]
    };
    const restore = stubFetch(async () => {
        return new Response(JSON.stringify(playbackInfo), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    });
    try {
        const { response } = await callEngine('/myemby/Items/123/PlaybackInfo');
        assert.equal(response.status, 200);
        const data = await response.json();
        const src = data.MediaSources[0];
        // DirectStreamUrl should now start with the proxy origin
        assert.ok(
            src.DirectStreamUrl.startsWith('https://proxy.example.com'),
            `DirectStreamUrl not rewritten: ${src.DirectStreamUrl}`
        );
        // TranscodingUrl too
        assert.ok(
            src.TranscodingUrl.startsWith('https://proxy.example.com'),
            `TranscodingUrl not rewritten: ${src.TranscodingUrl}`
        );
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 16. System/Info rewriting: Address field rewritten to proxy origin
// ---------------------------------------------------------------------------

test('System/Info response: Address is rewritten to proxy origin', async () => {
    const sysInfo = {
        Address: 'https://upstream.example.com',
        LocalAddress: 'https://upstream.example.com',
        ServerName: 'TestServer'
    };
    const restore = stubFetch(async () => {
        return new Response(JSON.stringify(sysInfo), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    });
    try {
        const { response } = await callEngine('/myemby/System/Info');
        assert.equal(response.status, 200);
        const data = await response.json();
        // Both Address and LocalAddress should be rewritten to proxy origin + /myemby
        assert.ok(data.Address.startsWith('https://proxy.example.com'), `Address: ${data.Address}`);
        assert.ok(data.LocalAddress.startsWith('https://proxy.example.com'), `LocalAddress: ${data.LocalAddress}`);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 17. WebSocket upgrade: upstream upgrades → 101 passed through
// ---------------------------------------------------------------------------

test.skip('WebSocket upgrade passthrough: skipped — requires response.webSocket property only available in CF Workers runtime, not in Node', () => {});

// ---------------------------------------------------------------------------
// 18. Country allowlist gate (blocked path)
// ---------------------------------------------------------------------------

test('country allowlist: request from blocked country → 403 Forbidden', async () => {
    // DB returns a kv_config row with proxy_country_allowlist=CN,HK
    // loadCountryAllowlist uses dbFirst(env, "SELECT v FROM kv_config WHERE k = ?", key)
    const env = {
        DB: makeDB({
            routeRow: KNOWN_ROUTE,
            kvRows: { 'proxy_country_allowlist': { v: 'CN,HK' } }
        })
    };
    const restore = stubFetch(async () => {
        throw new Error('should not reach upstream');
    });
    try {
        // Request from US (not in CN,HK allowlist)
        const { response } = await callEngine('/myemby/foo', {
            headers: { 'cf-ipcountry': 'US' }
        }, env, { routesMap: new Map([['myemby', KNOWN_ROUTE]]), countrySet: new Set(['CN', 'HK']) });
        assert.equal(response.status, 403);
        const text = await response.text();
        assert.ok(text.includes('country not allowed'), `body: ${text}`);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 19. Country allowlist gate (allowed path)
// ---------------------------------------------------------------------------

test('country allowlist: request from allowed country → passes through', async () => {
    const env = {
        DB: makeDB({
            routeRow: KNOWN_ROUTE,
            kvRows: { 'proxy_country_allowlist': { v: 'CN,HK' } }
        })
    };
    const restore = stubFetch(async () => {
        return new Response('ok', { status: 200 });
    });
    try {
        // Request from CN (in allowlist)
        const { response } = await callEngine('/myemby/foo', {
            headers: { 'cf-ipcountry': 'CN' }
        }, env, { routesMap: new Map([['myemby', KNOWN_ROUTE]]), countrySet: new Set(['CN', 'HK']) });
        assert.equal(response.status, 200);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 20. Country allowlist gate: missing cf-ipcountry header → 403
// ---------------------------------------------------------------------------

test('country allowlist: missing cf-ipcountry header → 403 (fail-closed)', async () => {
    const env = {
        DB: makeDB({
            routeRow: KNOWN_ROUTE,
            kvRows: { 'proxy_country_allowlist': { v: 'CN,HK' } }
        })
    };
    const restore = stubFetch(async () => {
        throw new Error('should not reach upstream');
    });
    try {
        const { response } = await callEngine('/myemby/foo', {}, env, { routesMap: new Map([['myemby', KNOWN_ROUTE]]), countrySet: new Set(['CN', 'HK']) });
        assert.equal(response.status, 403);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 21. No country allowlist configured → no gate (passes through)
// ---------------------------------------------------------------------------

test('no country allowlist configured → no 403 gate', async () => {
    // kvRows empty → loadCountryAllowlist returns null → gate is disabled
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE, kvRows: {} }) };
    const restore = stubFetch(async () => {
        return new Response('allowed', { status: 200 });
    });
    try {
        const { response } = await callEngine('/myemby/foo', {}, env);
        assert.equal(response.status, 200);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 22. Query string is forwarded to upstream
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hotlink protection (Referer allowlist)
// ---------------------------------------------------------------------------

test('hotlink: foreign Referer + allowlist set → 403', async () => {
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE, kvRows: { 'hotlink_allow_hosts': { v: 'good.example.com' } } }) };
    const restore = stubFetch(async () => { throw new Error('should not reach upstream'); });
    try {
        const { response } = await callEngine('/myemby/Images/p.jpg', {
            headers: { 'Referer': 'https://evil.example.com/embed' }
        }, env, { routesMap: new Map([['myemby', KNOWN_ROUTE]]), hotlinkSet: new Set(['good.example.com']) });
        assert.equal(response.status, 403);
        const text = await response.text();
        assert.ok(text.includes('hotlink not allowed'), `body: ${text}`);
    } finally { restore(); }
});

test('hotlink: allowed Referer host → passes through', async () => {
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE, kvRows: { 'hotlink_allow_hosts': { v: 'good.example.com' } } }) };
    const restore = stubFetch(async () => new Response('img', { status: 200 }));
    try {
        const { response } = await callEngine('/myemby/Images/p.jpg', {
            headers: { 'Referer': 'https://good.example.com/page' }
        }, env, { routesMap: new Map([['myemby', KNOWN_ROUTE]]), hotlinkSet: new Set(['good.example.com']) });
        assert.equal(response.status, 200);
    } finally { restore(); }
});

test('hotlink: empty Referer (native player) → passes through', async () => {
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE, kvRows: { 'hotlink_allow_hosts': { v: 'good.example.com' } } }) };
    const restore = stubFetch(async () => new Response('stream', { status: 200 }));
    try {
        const { response } = await callEngine('/myemby/Videos/1/stream', {}, env, { routesMap: new Map([['myemby', KNOWN_ROUTE]]), hotlinkSet: new Set(['good.example.com']) });
        assert.equal(response.status, 200);
    } finally { restore(); }
});

test('hotlink: not configured → no gate (passes through)', async () => {
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE, kvRows: {} }) };
    const restore = stubFetch(async () => new Response('ok', { status: 200 }));
    try {
        const { response } = await callEngine('/myemby/Images/p.jpg', {
            headers: { 'Referer': 'https://anywhere.example.com/x' }
        }, env);
        assert.equal(response.status, 200);
    } finally { restore(); }
});

// ---------------------------------------------------------------------------
// R2 poster cache: hit returns cached image without contacting upstream
// ---------------------------------------------------------------------------

test('R2 cache hit: image served from R2, upstream NOT contacted', async () => {
    const r2 = {
        async get(key) { return { body: new Uint8Array([0xff, 0xd8, 0xff]), writeHttpMetadata(h) { h.set('content-type', 'image/jpeg'); } }; },
        async put() {},
    };
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE }), POSTER_CACHE: r2 };
    let upstreamCalled = false;
    const restore = stubFetch(async () => { upstreamCalled = true; return new Response('upstream', { status: 200 }); });
    try {
        const { response } = await callEngine('/myemby/Images/poster.jpg', {}, env);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('X-R2-Cache'), 'HIT');
        assert.equal(upstreamCalled, false, 'upstream must not be contacted on R2 hit');
    } finally { restore(); }
});

test('R2 cache miss: upstream fetched and image queued for R2 put', async () => {
    let putKey = null;
    const r2 = { async get() { return null; }, async put(key) { putKey = key; } };
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE }), POSTER_CACHE: r2 };
    const restore = stubFetch(async () => new Response(new Uint8Array([0xff, 0xd8]), { status: 200, headers: { 'content-type': 'image/jpeg' } }));
    try {
        const { response, ctx } = await callEngine('/myemby/Images/poster.jpg', {}, env);
        assert.equal(response.status, 200);
        await Promise.all(ctx._pending || []);
        assert.equal(putKey, 'myemby/Images/poster.jpg', 'image should be written to R2 on miss');
    } finally { restore(); }
});

test('query string is forwarded to upstream URL', async () => {
    const capturedUrls = [];
    const restore = stubFetch(async (req) => {
        capturedUrls.push(typeof req === 'string' ? req : req.url);
        return new Response('ok', { status: 200 });
    });
    try {
        const { response } = await callEngine('/myemby/Videos/1/stream?api_key=tok&quality=hd');
        assert.equal(response.status, 200);
        assert.ok(
            capturedUrls.some(u => u.includes('api_key=tok') && u.includes('quality=hd')),
            `expected query params forwarded, got: ${capturedUrls}`
        );
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 23. DB error during route lookup → 500 DB Error
// ---------------------------------------------------------------------------

test('DB error during route lookup → 500 DB Error', async () => {
    // Config cache is unseeded (configSeed=null) so getConfig() actually hits
    // env.DB.batch — which throws here, simulating a D1 outage on cache miss.
    const db = createD1Fake([]);
    db.batch = async () => { throw new Error('D1 crash'); };
    const env = { DB: db };
    const restore = stubFetch(async () => { throw new Error('should not reach'); });
    try {
        const { response } = await callEngine('/myemby/foo', {}, env, null);
        assert.equal(response.status, 500);
        const text = await response.text();
        assert.ok(text.includes('DB Error'), `body: ${text}`);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 24. DEBUG_FAILOVER header included when env.DEBUG_FAILOVER === '1'
// ---------------------------------------------------------------------------

test('env.DEBUG_FAILOVER=1 → X-Proxy-Upstream-Index and X-Proxy-Upstream-Tries headers present', async () => {
    const env = {
        DB: makeDB({ routeRow: KNOWN_ROUTE }),
        DEBUG_FAILOVER: '1'
    };
    const restore = stubFetch(async () => new Response('ok', { status: 200 }));
    try {
        const { response } = await callEngine('/myemby/foo', {}, env);
        assert.equal(response.status, 200);
        assert.ok(response.headers.get('X-Proxy-Upstream-Index') !== null, 'X-Proxy-Upstream-Index missing');
        assert.ok(response.headers.get('X-Proxy-Upstream-Tries') !== null, 'X-Proxy-Upstream-Tries missing');
        // Should be the first (index 0) and tried 1 node
        assert.equal(response.headers.get('X-Proxy-Upstream-Index'), '0');
        assert.equal(response.headers.get('X-Proxy-Upstream-Tries'), '1');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 24b. DEBUG_TIMING: Server-Timing diagnostics header (#14)
// ---------------------------------------------------------------------------

/**
 * Config-cache-shaped D1 stub: mirrors test/config-cache.test.mjs's makeDB so
 * getConfig() takes the real (uncached) batch-load path, giving us a genuine
 * cache-miss d1Ms > 0 for the "miss" assertion below.
 */
function makeConfigCacheDB({ routeRows = [], kvRows = {} } = {}) {
    return createD1Fake([
        { test: /FROM routes/i, exec: () => routeRows },
        {
            test: /FROM kv_config/i,
            exec: (keys) => (keys || [])
                .filter(k => kvRows[k] !== undefined)
                .map(k => ({ k, v: kvRows[k] })),
        },
    ]);
}

test('env.DEBUG_TIMING=1 + warm cache (hit) → Server-Timing header with d1/upstream/total and desc="hit"', async () => {
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE }), DEBUG_TIMING: '1' };
    const restore = stubFetch(async () => new Response('ok', { status: 200 }));
    try {
        // Default configSeed seeds the cache via __setConfigForTest → next getConfig() is a hit.
        const { response } = await callEngine('/myemby/foo', {}, env);
        assert.equal(response.status, 200);
        const timing = response.headers.get('Server-Timing');
        assert.ok(timing, 'Server-Timing header missing');
        assert.match(timing, /d1;dur=\d+(\.\d+)?;desc="hit"/);
        assert.match(timing, /upstream;dur=\d+(\.\d+)?/);
        assert.match(timing, /total;dur=\d+(\.\d+)?/);
    } finally {
        restore();
    }
});

test('env.DEBUG_TIMING=1 + cold cache (miss) → Server-Timing header with desc="miss"', async () => {
    __resetConfigCache();
    const db = makeConfigCacheDB({
        routeRows: [{
            prefix: 'myemby', target: 'https://upstream.example.com', mode: 'off',
            cache_img: 'on', custom_headers: '', media_counts_auto_auth: 0, keepalive_days: 0,
        }],
    });
    const env = { DB: db, DEBUG_TIMING: '1' };
    const restore = stubFetch(async () => new Response('ok', { status: 200 }));
    try {
        // configSeed=null → skip __setConfigForTest, so getConfig() must hit env.DB.batch (a real miss).
        const { response } = await callEngine('/myemby/foo', {}, env, null);
        assert.equal(response.status, 200);
        const timing = response.headers.get('Server-Timing');
        assert.ok(timing, 'Server-Timing header missing');
        assert.match(timing, /d1;dur=\d+(\.\d+)?;desc="miss"/);
        assert.match(timing, /upstream;dur=\d+(\.\d+)?/);
        assert.match(timing, /total;dur=\d+(\.\d+)?/);
    } finally {
        restore();
    }
});

test('env.DEBUG_TIMING unset → Server-Timing header absent', async () => {
    const env = { DB: makeDB({ routeRow: KNOWN_ROUTE }) };
    const restore = stubFetch(async () => new Response('ok', { status: 200 }));
    try {
        const { response } = await callEngine('/myemby/foo', {}, env);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Server-Timing'), null, 'Server-Timing should be absent when flag unset');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 25. PlaybackInfo path triggers stats recording (ctx.waitUntil called)
// ---------------------------------------------------------------------------

test('PlaybackInfo path triggers ctx.waitUntil for stats recording', async () => {
    const restore = stubFetch(async () => {
        return new Response('{"MediaSources":[]}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    });
    try {
        const fullUrl = 'https://proxy.example.com/myemby/Items/123/PlaybackInfo';
        const request = new Request(fullUrl);
        const url = new URL(request.url);
        const ctx = makeCtx();
        const env = { DB: makeDB({ routeRow: KNOWN_ROUTE }) };
        __setConfigForTest({ routesMap: new Map([['myemby', KNOWN_ROUTE]]) });
        await proxyRequest(request, env, ctx, url);
        // ctx.waitUntil should have been called (for DB batch)
        assert.ok(ctx._pending && ctx._pending.length > 0, 'waitUntil should be called on PlaybackInfo path');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// 26. 3xx redirect: allowlisted host → direct passthrough (Location not rewritten)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 27. Circuit breaker: upstream ordering by health
// ---------------------------------------------------------------------------

test('orderUpstreamsByHealth: fresh upstreams keep config order', () => {
    UPSTREAM_CB.clear();
    const urls = ['https://a.example.com', 'https://b.example.com', 'https://c.example.com'];
    assert.deepEqual(orderUpstreamsByHealth(urls, 1000), [0, 1, 2]);
});

test('orderUpstreamsByHealth: cooling upstream is moved to the end', () => {
    UPSTREAM_CB.clear();
    const urls = ['https://a.example.com', 'https://b.example.com', 'https://c.example.com'];
    const now = 100000;
    markUpstreamFailure('https://a.example.com', now); // a now cooling (failUntil > now)
    // a (index 0) is cooling → goes last; b,c keep relative order in front
    assert.deepEqual(orderUpstreamsByHealth(urls, now + 1), [1, 2, 0]);
});

test('orderUpstreamsByHealth: single cooling upstream is still tried (never hard-skipped)', () => {
    UPSTREAM_CB.clear();
    const urls = ['https://only.example.com'];
    const now = 100000;
    markUpstreamFailure('https://only.example.com', now);
    // Sole upstream stays in the try order even while cooling.
    assert.deepEqual(orderUpstreamsByHealth(urls, now + 1), [0]);
});

test('circuit breaker: cooldown expires → upstream returns to healthy front', () => {
    UPSTREAM_CB.clear();
    const urls = ['https://a.example.com', 'https://b.example.com'];
    const now = 100000;
    markUpstreamFailure('https://a.example.com', now); // cooldown = 15000ms
    assert.deepEqual(orderUpstreamsByHealth(urls, now + 1), [1, 0]); // still cooling
    assert.deepEqual(orderUpstreamsByHealth(urls, now + 15001), [0, 1]); // cooldown elapsed
});

test('circuit breaker: success clears the failure record', () => {
    UPSTREAM_CB.clear();
    const now = 100000;
    markUpstreamFailure('https://a.example.com', now);
    assert.ok(UPSTREAM_CB.has('https://a.example.com'));
    markUpstreamSuccess('https://a.example.com');
    assert.ok(!UPSTREAM_CB.has('https://a.example.com'));
});

test('circuit breaker: repeated failures back off exponentially (capped)', () => {
    UPSTREAM_CB.clear();
    const url = 'https://a.example.com';
    const now = 0;
    markUpstreamFailure(url, now); // consec 1 → 15s
    assert.equal(UPSTREAM_CB.get(url).failUntil, 15000);
    markUpstreamFailure(url, now); // consec 2 → 30s
    assert.equal(UPSTREAM_CB.get(url).failUntil, 30000);
    markUpstreamFailure(url, now); // consec 3 → 60s
    assert.equal(UPSTREAM_CB.get(url).failUntil, 60000);
    for (let k = 0; k < 20; k++) markUpstreamFailure(url, now); // saturate
    assert.equal(UPSTREAM_CB.get(url).failUntil, 300000); // capped at 5 min
    UPSTREAM_CB.clear();
});

test('302 redirect to allowlisted host → Location NOT rewritten (direct passthrough)', async () => {
    const env = {
        DB: makeDB({ routeRow: KNOWN_ROUTE }),
        MANUAL_REDIRECT_ALLOWLIST: createMemoryManualRedirectAllowlist(['115.com']),
    };
    const restore = stubFetch(async () => {
        return new Response(null, {
            status: 302,
            headers: { 'Location': 'https://115.com/signed-url?token=xyz' }
        });
    });
    try {
        const { response } = await callEngine('/myemby/redirect', {}, env);
        assert.equal(response.status, 302);
        const loc = response.headers.get('Location');
        // Should be passed through unchanged (not wrapped in proxy prefix)
        assert.equal(loc, 'https://115.com/signed-url?token=xyz', `Location was: ${loc}`);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    } finally {
        restore();
    }
});

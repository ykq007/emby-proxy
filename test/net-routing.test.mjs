/**
 * Characterization (golden-master) tests for:
 *   src/net/fallback.js
 *   src/routing/validate.js
 *
 * Purpose: lock in CURRENT behavior so an upcoming refactor cannot silently
 * change it. Test what the code actually does, not what we wish it did.
 *
 * Runner: node --test   (Node 22 built-in test runner, no extra deps)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    flipScheme,
    fetchWithSchemeFallback,
    attempt403Cascade,
} from '../src/net/fallback.js';

import {
    RESERVED_ALIASES,
    PREFIX_REGEX,
    validateRoutePrefix,
    DEFAULT_MANUAL_REDIRECT_DOMAINS,
    createMemoryManualRedirectAllowlist,
    getManualRedirectHosts,
    hostMatchesAllowlist,
    readManualRedirectDomains,
    DEFAULT_OPTIMIZED_DOMAINS,
    probeDomain,
    loadCountryAllowlist,
    writeManualRedirectDomains,
} from '../src/routing/validate.js';
import { applyRequestGate, decideCountryGate, decideHotlinkGate } from '../src/proxy/request-gate.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Swap globalThis.fetch with a stub, returning a restore function. */
function stubFetch(fn) {
    const orig = globalThis.fetch;
    globalThis.fetch = fn;
    return () => { globalThis.fetch = orig; };
}

function fakeKvDB(rows = {}) {
    return createD1Fake([{
        test: /.*/,
        exec: ([boundKey], sql) => {
            const key = boundKey || sql.match(/FROM kv_config WHERE k\s*=\s*'([^']+)'/i)?.[1];
            return rows[key] !== undefined ? [rows[key]] : [];
        },
    }]);
}

// ---------------------------------------------------------------------------
// flipScheme
// ---------------------------------------------------------------------------

test('flipScheme: https → http', () => {
    const result = flipScheme('https://example.com/path?q=1');
    // Returns a URL object (mutated in place), not a string
    assert.ok(result instanceof URL, 'should return a URL');
    assert.equal(result.protocol, 'http:');
    assert.equal(result.hostname, 'example.com');
    assert.equal(result.pathname, '/path');
    assert.equal(result.search, '?q=1');
});

test('flipScheme: http → https', () => {
    const result = flipScheme('http://example.com/api');
    assert.ok(result instanceof URL);
    assert.equal(result.protocol, 'https:');
    assert.equal(result.hostname, 'example.com');
});

test('flipScheme: preserves port', () => {
    const result = flipScheme('https://example.com:8096/emby');
    assert.ok(result instanceof URL);
    assert.equal(result.protocol, 'http:');
    assert.equal(result.port, '8096');
});

test('flipScheme: unknown protocol returns null', () => {
    // ftp:// is neither http nor https
    const result = flipScheme('ftp://example.com');
    assert.equal(result, null);
});

test('flipScheme: returns a URL not a string — caller must toString() if needed', () => {
    const result = flipScheme('https://example.com');
    assert.notEqual(typeof result, 'string');
    assert.ok(result instanceof URL);
});

// ---------------------------------------------------------------------------
// fetchWithSchemeFallback
// ---------------------------------------------------------------------------

test('fetchWithSchemeFallback: canRetry=false — single fetch, no retry', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        return new Response('ok', { status: 200 });
    });
    try {
        const resp = await fetchWithSchemeFallback('https://example.com/', {}, false);
        assert.equal(resp.status, 200);
        assert.equal(calls.length, 1, 'should call fetch exactly once when canRetry=false');
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: canRetry=true, 200 response — no retry', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        return new Response('ok', { status: 200 });
    });
    try {
        const resp = await fetchWithSchemeFallback('https://example.com/', {}, true);
        assert.equal(resp.status, 200);
        assert.equal(calls.length, 1, 'no retry on success');
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: canRetry=true, 525 SSL error — retries with flipped scheme', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        if (calls.length === 1) return new Response('ssl error', { status: 525 });
        return new Response('ok via http', { status: 200 });
    });
    try {
        const resp = await fetchWithSchemeFallback('https://example.com/path', {}, true);
        assert.equal(resp.status, 200);
        assert.equal(calls.length, 2, 'should retry once after 525');
        assert.ok(calls[1].startsWith('http://'), 'retry should flip to http');
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: canRetry=true, 526 SSL error — retries', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        if (calls.length === 1) return new Response('', { status: 526 });
        return new Response('ok', { status: 200 });
    });
    try {
        const resp = await fetchWithSchemeFallback('https://host.example/', {}, true);
        assert.equal(resp.status, 200);
        assert.equal(calls.length, 2);
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: canRetry=true, 530 SSL error — retries', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        if (calls.length === 1) return new Response('', { status: 530 });
        return new Response('ok', { status: 200 });
    });
    try {
        const resp = await fetchWithSchemeFallback('https://host.example/', {}, true);
        assert.equal(resp.status, 200);
        assert.equal(calls.length, 2);
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: 525 then retry also fails — returns retry failure response', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        if (calls.length === 1) return new Response('', { status: 525 });
        // retry throws — should catch and return original 525
        throw new Error('network error on retry');
    });
    try {
        const resp = await fetchWithSchemeFallback('https://host.example/', {}, true);
        // When the flipped retry throws, the catch block inside returns the original resp (525)
        assert.equal(resp.status, 525);
        assert.equal(calls.length, 2);
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: canRetry=true, first fetch throws — retries with flipped scheme', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        if (calls.length === 1) throw new Error('connection refused');
        return new Response('recovered', { status: 200 });
    });
    try {
        const resp = await fetchWithSchemeFallback('https://example.com/', {}, true);
        assert.equal(resp.status, 200);
        assert.equal(calls.length, 2);
        assert.ok(calls[1].startsWith('http://'), 'retry must flip scheme');
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: canRetry=true, first throws and flipped also throws — rethrows', async () => {
    const restore = stubFetch(async () => { throw new Error('permanent failure'); });
    try {
        await assert.rejects(
            () => fetchWithSchemeFallback('https://example.com/', {}, true),
            /permanent failure/
        );
    } finally {
        restore();
    }
});

test('fetchWithSchemeFallback: non-SSL error status (404) — no retry', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        return new Response('not found', { status: 404 });
    });
    try {
        const resp = await fetchWithSchemeFallback('https://example.com/', {}, true);
        assert.equal(resp.status, 404);
        assert.equal(calls.length, 1, '404 is not an SSL error, no retry');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// attempt403Cascade
// ---------------------------------------------------------------------------

test('attempt403Cascade: non-strict mode — first non-403 response is returned immediately', async () => {
    const calls = [];
    const restore = stubFetch(async (req) => {
        calls.push(req.url);
        return new Response('ok', { status: 200 });
    });
    try {
        const url = new URL('https://example.com/');
        const resp = await attempt403Cascade(url, new Headers(), {}, 'default');
        assert.equal(resp.status, 200);
        assert.equal(calls.length, 1);
    } finally {
        restore();
    }
});

test('attempt403Cascade: non-strict mode — all 403 → returns last 403', async () => {
    let callCount = 0;
    const restore = stubFetch(async () => {
        callCount++;
        return new Response('forbidden', { status: 403 });
    });
    try {
        const url = new URL('https://example.com/');
        const resp = await attempt403Cascade(url, new Headers(), {}, 'default');
        // non-strict has 3 strategies (origin, strip-sec-fetch, minimal)
        assert.equal(callCount, 3, 'should try all 3 strategies in non-strict mode');
        assert.equal(resp.status, 403);
    } finally {
        restore();
    }
});

test('attempt403Cascade: strict mode — 2 strategies (skips origin strategy)', async () => {
    let callCount = 0;
    const restore = stubFetch(async () => {
        callCount++;
        return new Response('', { status: 403 });
    });
    try {
        const url = new URL('https://example.com/');
        const resp = await attempt403Cascade(url, new Headers(), {}, 'strict');
        assert.equal(callCount, 2, 'strict mode skips origin strategy → only 2 strategies');
        assert.equal(resp.status, 403);
    } finally {
        restore();
    }
});

test('attempt403Cascade: no strategies run → returns null', async () => {
    // strict mode has 2 strategies, but let's verify null is returned when all fetches throw
    let callCount = 0;
    const restore = stubFetch(async () => {
        callCount++;
        throw new Error('network error');
    });
    try {
        const url = new URL('https://example.com/');
        const resp = await attempt403Cascade(url, new Headers(), {}, 'strict');
        // All strategies throw → lastResp stays null
        assert.equal(resp, null);
    } finally {
        restore();
    }
});

test('attempt403Cascade: second strategy succeeds after first is 403', async () => {
    let callCount = 0;
    const restore = stubFetch(async () => {
        callCount++;
        if (callCount === 1) return new Response('', { status: 403 });
        return new Response('ok', { status: 200 });
    });
    try {
        const url = new URL('https://example.com/');
        const resp = await attempt403Cascade(url, new Headers(), {}, 'default');
        assert.equal(resp.status, 200);
        assert.equal(callCount, 2, 'stops at first non-403');
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// RESERVED_ALIASES
// ---------------------------------------------------------------------------

test('RESERVED_ALIASES: is a Set', () => {
    assert.ok(RESERVED_ALIASES instanceof Set);
});

test('RESERVED_ALIASES: contains expected system values', () => {
    const expected = [
        'api', 'admin', '__client_rtt__',
        'login', 'logout',
        'assets', 'static', 'public',
        'health', 'healthz', 'ping', 'status',
        'emby', 'web', 'stats',
        'favicon.ico', 'robots.txt',
        'apple-touch-icon', 'sw.js', 'manifest.json', 'cdn-cgi'
    ];
    for (const alias of expected) {
        assert.ok(RESERVED_ALIASES.has(alias), `RESERVED_ALIASES should contain "${alias}"`);
    }
});

test('RESERVED_ALIASES: size matches defined list', () => {
    assert.equal(RESERVED_ALIASES.size, 21);
});

// ---------------------------------------------------------------------------
// PREFIX_REGEX
// ---------------------------------------------------------------------------

test('PREFIX_REGEX: valid prefix — lowercase letters', () => {
    assert.ok(PREFIX_REGEX.test('myproxy'));
});

test('PREFIX_REGEX: valid prefix — uppercase letters', () => {
    assert.ok(PREFIX_REGEX.test('MyProxy'));
});

test('PREFIX_REGEX: valid prefix — digits', () => {
    assert.ok(PREFIX_REGEX.test('abc123'));
});

test('PREFIX_REGEX: valid prefix — underscore and hyphen', () => {
    assert.ok(PREFIX_REGEX.test('my_proxy-v2'));
});

test('PREFIX_REGEX: valid prefix — single char', () => {
    assert.ok(PREFIX_REGEX.test('a'));
});

test('PREFIX_REGEX: invalid — starts with underscore', () => {
    assert.ok(!PREFIX_REGEX.test('_proxy'));
});

test('PREFIX_REGEX: invalid — starts with hyphen', () => {
    assert.ok(!PREFIX_REGEX.test('-proxy'));
});

test('PREFIX_REGEX: invalid — empty string', () => {
    assert.ok(!PREFIX_REGEX.test(''));
});

test('PREFIX_REGEX: invalid — contains dot', () => {
    assert.ok(!PREFIX_REGEX.test('my.proxy'));
});

test('PREFIX_REGEX: invalid — exceeds 64 chars', () => {
    // 65 chars (1 starting + 64 following) → too long (pattern allows 0..63 trailing = 64 total)
    const longStr = 'a' + 'b'.repeat(64); // 65 chars
    assert.ok(!PREFIX_REGEX.test(longStr));
});

test('PREFIX_REGEX: valid — exactly 64 chars', () => {
    const maxStr = 'a' + 'b'.repeat(63); // 64 chars total
    assert.ok(PREFIX_REGEX.test(maxStr));
});

// ---------------------------------------------------------------------------
// validateRoutePrefix
// ---------------------------------------------------------------------------

test('validateRoutePrefix: empty string → error about empty', () => {
    const result = validateRoutePrefix('');
    assert.equal(result, '别名为空');
});

test('validateRoutePrefix: null/undefined → treated as empty', () => {
    assert.equal(validateRoutePrefix(null), '别名为空');
    assert.equal(validateRoutePrefix(undefined), '别名为空');
});

test('validateRoutePrefix: whitespace only → empty', () => {
    assert.equal(validateRoutePrefix('   '), '别名为空');
});

test('validateRoutePrefix: invalid format — starts with underscore', () => {
    const result = validateRoutePrefix('_bad');
    assert.ok(result && result.includes('别名格式非法'), `got: ${result}`);
});

test('validateRoutePrefix: invalid format — contains dot', () => {
    const result = validateRoutePrefix('my.alias');
    assert.ok(result && result.includes('别名格式非法'), `got: ${result}`);
});

test('validateRoutePrefix: reserved alias "api"', () => {
    const result = validateRoutePrefix('api');
    assert.ok(result && result.includes('系统保留前缀'), `got: ${result}`);
    assert.ok(result.includes('"api"'));
});

test('validateRoutePrefix: reserved alias case-insensitive — "API"', () => {
    const result = validateRoutePrefix('API');
    // prefix.toLowerCase() used → should still trigger reserved
    assert.ok(result && result.includes('系统保留前缀'), `got: ${result}`);
});

test('validateRoutePrefix: reserved alias "admin"', () => {
    const result = validateRoutePrefix('admin');
    assert.ok(result && result.includes('系统保留前缀'));
});

test('validateRoutePrefix: reserved "favicon.ico" — dot is in reserved set but valid regex?', () => {
    // favicon.ico contains a dot → fails PREFIX_REGEX before reaching reserved check
    const result = validateRoutePrefix('favicon.ico');
    // Should fail regex (dot not allowed), NOT reach reserved check
    assert.ok(result && result.includes('别名格式非法'), `got: ${result}`);
});

test('validateRoutePrefix: valid prefix — returns null', () => {
    assert.equal(validateRoutePrefix('myserver'), null);
    assert.equal(validateRoutePrefix('proxy-1'), null);
    assert.equal(validateRoutePrefix('nas123'), null);
});

test('validateRoutePrefix: trims whitespace before checking', () => {
    // "  api  " → "api" → reserved
    const result = validateRoutePrefix('  api  ');
    assert.ok(result && result.includes('系统保留前缀'));
});

// ---------------------------------------------------------------------------
// DEFAULT_MANUAL_REDIRECT_DOMAINS
// ---------------------------------------------------------------------------

test('DEFAULT_MANUAL_REDIRECT_DOMAINS: is an Array', () => {
    assert.ok(Array.isArray(DEFAULT_MANUAL_REDIRECT_DOMAINS));
});

test('DEFAULT_MANUAL_REDIRECT_DOMAINS: contains expected cloud-drive domains', () => {
    assert.ok(DEFAULT_MANUAL_REDIRECT_DOMAINS.includes('115.com'));
    assert.ok(DEFAULT_MANUAL_REDIRECT_DOMAINS.includes('mypikpak.com'));
    assert.ok(DEFAULT_MANUAL_REDIRECT_DOMAINS.includes('aliyuncs.com'));
    assert.ok(DEFAULT_MANUAL_REDIRECT_DOMAINS.includes('pcs.drive.quark.cn'));
});

test('DEFAULT_MANUAL_REDIRECT_DOMAINS: 14 entries', () => {
    assert.equal(DEFAULT_MANUAL_REDIRECT_DOMAINS.length, 14);
});

// ---------------------------------------------------------------------------
// manual redirect allowlist adapter
// ---------------------------------------------------------------------------

test('createMemoryManualRedirectAllowlist: reads and writes normalized domains', async () => {
    const store = createMemoryManualRedirectAllowlist([' Example.com ', 'bad/path', 'CDN.net']);
    assert.deepEqual(await store.readDomains(), ['example.com', 'cdn.net']);

    await store.writeDomains(['115.COM', '', ' bad/path ']);
    assert.deepEqual(await store.readDomains(), ['115.com']);
    assert.deepEqual(await store.readHosts(), new Set(['115.com']));
});

test('manual redirect allowlist D1 adapter: reads and writes persisted newline domains', async () => {
    let stored = '115.com\nmypikpak.com';
    const env = {
        DB: createD1Fake([{
            test: /manual_redirect_domains/,
            exec: ([value], sql) => {
                if (/^SELECT/i.test(sql)) return [{ v: stored }];
                assert.match(sql, /INSERT OR REPLACE INTO kv_config/);
                stored = value;
                return [];
            },
        }]),
    };

    assert.deepEqual(await readManualRedirectDomains(env), ['115.com', 'mypikpak.com']);
    assert.deepEqual(await writeManualRedirectDomains(env, [' CDN.Example.com ', 'bad/path']), ['cdn.example.com']);
    assert.equal(stored, 'cdn.example.com');
});

// ---------------------------------------------------------------------------
// hostMatchesAllowlist
// ---------------------------------------------------------------------------

test('hostMatchesAllowlist: exact match', () => {
    const set = new Set(['example.com', 'other.net']);
    assert.ok(hostMatchesAllowlist('example.com', set));
});

test('hostMatchesAllowlist: subdomain match', () => {
    const set = new Set(['example.com']);
    assert.ok(hostMatchesAllowlist('sub.example.com', set));
    assert.ok(hostMatchesAllowlist('a.b.example.com', set));
});

test('hostMatchesAllowlist: no match', () => {
    const set = new Set(['example.com']);
    assert.ok(!hostMatchesAllowlist('notexample.com', set));
    assert.ok(!hostMatchesAllowlist('evil-example.com', set));
});

test('hostMatchesAllowlist: case-insensitive (host lowercased)', () => {
    const set = new Set(['example.com']);
    assert.ok(hostMatchesAllowlist('EXAMPLE.COM', set));
    assert.ok(hostMatchesAllowlist('Sub.Example.COM', set));
});

test('hostMatchesAllowlist: empty set → false', () => {
    assert.ok(!hostMatchesAllowlist('example.com', new Set()));
});

test('hostMatchesAllowlist: null host → false', () => {
    assert.ok(!hostMatchesAllowlist(null, new Set(['example.com'])));
});

test('hostMatchesAllowlist: null set → false', () => {
    assert.ok(!hostMatchesAllowlist('example.com', null));
});

test('hostMatchesAllowlist: partial suffix does NOT match (must be .domain)', () => {
    // "evilexample.com" should NOT match "example.com"
    const set = new Set(['example.com']);
    assert.ok(!hostMatchesAllowlist('evilexample.com', set));
});

// ---------------------------------------------------------------------------
// DEFAULT_OPTIMIZED_DOMAINS
// ---------------------------------------------------------------------------

test('DEFAULT_OPTIMIZED_DOMAINS: is an Array of 12 entries', () => {
    assert.ok(Array.isArray(DEFAULT_OPTIMIZED_DOMAINS));
    assert.equal(DEFAULT_OPTIMIZED_DOMAINS.length, 12);
});

test('DEFAULT_OPTIMIZED_DOMAINS: each entry has domain and note', () => {
    for (const entry of DEFAULT_OPTIMIZED_DOMAINS) {
        assert.ok(typeof entry.domain === 'string' && entry.domain.length > 0,
            `entry.domain should be non-empty string, got: ${JSON.stringify(entry)}`);
        assert.ok(typeof entry.note === 'string',
            `entry.note should be a string, got: ${JSON.stringify(entry)}`);
    }
});

test('DEFAULT_OPTIMIZED_DOMAINS: contains known domains', () => {
    const domains = DEFAULT_OPTIMIZED_DOMAINS.map(e => e.domain);
    assert.ok(domains.includes('visa.com.sg'));
    assert.ok(domains.includes('visa.com.hk'));
    assert.ok(domains.includes('icook.tw'));
    assert.ok(domains.includes('time.is'));
});

// ---------------------------------------------------------------------------
// probeDomain — fetch-dependent
// ---------------------------------------------------------------------------

test('probeDomain: returns { ms, ok } on success (status < 500)', async () => {
    const restore = stubFetch(async () => new Response('', { status: 200 }));
    try {
        const result = await probeDomain('example.com');
        assert.ok(typeof result.ms === 'number');
        assert.equal(result.ok, true);
        assert.ok(result.ms >= 0);
    } finally {
        restore();
    }
});

test('probeDomain: status >= 500 → { ms: -1, ok: false }', async () => {
    const restore = stubFetch(async () => new Response('', { status: 503 }));
    try {
        const result = await probeDomain('example.com');
        assert.equal(result.ms, -1);
        assert.equal(result.ok, false);
    } finally {
        restore();
    }
});

test('probeDomain: fetch throws → { ms: -1, ok: false }', async () => {
    const restore = stubFetch(async () => { throw new Error('network error'); });
    try {
        const result = await probeDomain('example.com');
        assert.equal(result.ms, -1);
        assert.equal(result.ok, false);
    } finally {
        restore();
    }
});

// ---------------------------------------------------------------------------
// loadCountryAllowlist — D1-dependent
// ---------------------------------------------------------------------------

test('loadCountryAllowlist: no DB in env → returns null', async () => {
    const result = await loadCountryAllowlist({});
    assert.equal(result, null);
});

// dbFirst(env, sql, ...binds) calls env.DB.prepare(sql).bind(...binds).first()
function makeDB(firstResult) {
    return createD1Fake([{ test: /.*/, exec: () => (firstResult ? [firstResult] : []) }]);
}

test('loadCountryAllowlist: DB mock returns null row → returns null', async () => {
    const fakeEnv = { DB: makeDB(null) };
    const result = await loadCountryAllowlist(fakeEnv);
    assert.equal(result, null);
});

test('loadCountryAllowlist: DB mock returns empty v → returns null', async () => {
    const fakeEnv = { DB: makeDB({ v: '' }) };
    const result = await loadCountryAllowlist(fakeEnv);
    assert.equal(result, null);
});

test('loadCountryAllowlist: DB mock returns comma-separated countries → Set of uppercase strings', async () => {
    const fakeEnv = { DB: makeDB({ v: 'cn,hk,tw' }) };
    const result = await loadCountryAllowlist(fakeEnv);
    assert.ok(result instanceof Set);
    assert.ok(result.has('CN'));
    assert.ok(result.has('HK'));
    assert.ok(result.has('TW'));
    assert.equal(result.size, 3);
});

test('loadCountryAllowlist: DB mock throws → returns null', async () => {
    const db = createD1Fake([]);
    db.prepare = () => { throw new Error('D1 error'); };
    const result = await loadCountryAllowlist({ DB: db });
    assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// getManualRedirectHosts
// ---------------------------------------------------------------------------

test('getManualRedirectHosts: uses injected in-memory allowlist adapter', async () => {
    const env = {
        MANUAL_REDIRECT_ALLOWLIST: createMemoryManualRedirectAllowlist(['115.com', 'mypikpak.com']),
    };
    assert.deepEqual(await getManualRedirectHosts(env), new Set(['115.com', 'mypikpak.com']));
});

// ---------------------------------------------------------------------------
// request gate policy
// ---------------------------------------------------------------------------

test('decideCountryGate: configured allowlist blocks missing country fail-closed', async () => {
    const request = new Request('https://proxy.example.com/myemby/stream');
    const response = decideCountryGate(request, new Set(['CN', 'HK']));
    assert.equal(response.status, 403);
    assert.equal(await response.text(), 'Forbidden: country not allowed');
});

test('decideCountryGate: unconfigured allowlist leaves request open', () => {
    const request = new Request('https://proxy.example.com/myemby/stream', {
        headers: { 'cf-ipcountry': 'US' },
    });
    assert.equal(decideCountryGate(request, null), null);
});

test('decideHotlinkGate: empty Referer is allowed for native players', () => {
    const request = new Request('https://proxy.example.com/myemby/Images/p.jpg');
    assert.equal(decideHotlinkGate(request, new Set(['good.example.com'])), null);
});

test('decideHotlinkGate: configured foreign Referer host is blocked', async () => {
    const request = new Request('https://proxy.example.com/myemby/Images/p.jpg', {
        headers: { Referer: 'https://evil.example.com/embed' },
    });
    const response = decideHotlinkGate(request, new Set(['good.example.com']));
    assert.equal(response.status, 403);
    assert.equal(await response.text(), 'Forbidden: hotlink not allowed');
});

test('applyRequestGate: loads both gate policies through one interface', async () => {
    const env = {
        DB: fakeKvDB({
            proxy_country_allowlist: { v: 'CN,HK' },
            hotlink_allow_hosts: { v: 'good.example.com' },
        }),
    };
    const request = new Request('https://proxy.example.com/myemby/Images/p.jpg', {
        headers: {
            'cf-ipcountry': 'CN',
            Referer: 'https://bad.example.com/embed',
        },
    });
    const response = await applyRequestGate(request, env);
    assert.equal(response.status, 403);
    assert.equal(await response.text(), 'Forbidden: hotlink not allowed');
});

/**
 * Characterization (golden-master) tests for:
 *   src/emby/headers.js
 *   src/emby/tokens.js
 *
 * These tests lock in CURRENT behavior. If something looks weird, that IS
 * the expected behavior — that is the whole point of golden-master tests.
 *
 * Run: node --test test/emby.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    parseCustomHeadersForProbe,
    parseCustomHeaderEmbyToken,
    buildEmbyClientHeaders,
    buildUpstreamHeaders,
} from '../src/emby/headers.js';

import {
    tokenKey,
    b64encode,
    b64decode,
    encryptToken,
    decryptToken,
    extractEmbyToken,
    persistHarvestedToken,
    HARVEST_MEM,
} from '../src/emby/tokens.js';

import {
    authenticateByNameFromEmby,
    fetchEmbyJsonWithFallback,
    fetchEmbyStatusWithFallback,
    fetchItemCountsFromEmby,
    fetchLibraryScanLastEndFromEmby,
    probeEmbyNode,
} from '../src/emby/client.js';

function cancelTrackedResponse(body, init) {
    let canceled = false;
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(body));
        },
        cancel() {
            canceled = true;
        },
    });
    const response = new Response(stream, init);
    return { response, wasCanceled: () => canceled };
}

// ─────────────────────────────────────────────────────────────────────────────
// parseCustomHeadersForProbe
// ─────────────────────────────────────────────────────────────────────────────

test('parseCustomHeadersForProbe: null/undefined returns {}', () => {
    assert.deepEqual(parseCustomHeadersForProbe(null), {});
    assert.deepEqual(parseCustomHeadersForProbe(undefined), {});
    assert.deepEqual(parseCustomHeadersForProbe(''), {});
});

test('parseCustomHeadersForProbe: valid JSON object', () => {
    const result = parseCustomHeadersForProbe('{"X-Custom":"abc","Authorization":"Bearer tok"}');
    assert.deepEqual(result, { 'X-Custom': 'abc', 'Authorization': 'Bearer tok' });
});

test('parseCustomHeadersForProbe: JSON key with invalid chars is skipped', () => {
    // Keys must match /^[A-Za-z0-9_\-]+$/ — spaces and dots are filtered out
    const result = parseCustomHeadersForProbe('{"Valid-Key":"yes","Bad Key":"no","bad.key":"no2"}');
    assert.deepEqual(result, { 'Valid-Key': 'yes' });
});

test('parseCustomHeadersForProbe: JSON values are stringified', () => {
    // Numeric value — String(123) = "123"
    const result = parseCustomHeadersForProbe('{"X-Count":123}');
    assert.equal(result['X-Count'], '123');
});

test('parseCustomHeadersForProbe: newline-delimited key: value format', () => {
    const raw = 'X-Foo: bar\nX-Baz: qux';
    const result = parseCustomHeadersForProbe(raw);
    assert.deepEqual(result, { 'X-Foo': 'bar', 'X-Baz': 'qux' });
});

test('parseCustomHeadersForProbe: CRLF newlines in key:value format', () => {
    const raw = 'X-Foo: bar\r\nX-Baz: qux';
    const result = parseCustomHeadersForProbe(raw);
    assert.deepEqual(result, { 'X-Foo': 'bar', 'X-Baz': 'qux' });
});

test('parseCustomHeadersForProbe: leading/trailing whitespace stripped in line format', () => {
    const raw = '  X-Foo  :  bar baz  ';
    const result = parseCustomHeadersForProbe(raw);
    // regex: key trimmed, value trimmed — but value is \S.* which means no leading space
    assert.deepEqual(result, { 'X-Foo': 'bar baz' });
});

test('parseCustomHeadersForProbe: lines without colon are ignored', () => {
    const raw = 'NoColonHere\nX-Good: yes';
    const result = parseCustomHeadersForProbe(raw);
    assert.deepEqual(result, { 'X-Good': 'yes' });
});

test('parseCustomHeadersForProbe: malformed JSON falls through to line parsing', () => {
    const raw = '{not json\nX-Fallback: works';
    const result = parseCustomHeadersForProbe(raw);
    assert.deepEqual(result, { 'X-Fallback': 'works' });
});

test('parseCustomHeadersForProbe: non-object JSON falls through to line parsing', () => {
    // JSON.parse('"a string"') is a string, not an object — falls through
    const raw = '"just a string"';
    const result = parseCustomHeadersForProbe(raw);
    // The raw string has no "key: value" line, so result is {}
    assert.deepEqual(result, {});
});

// ─────────────────────────────────────────────────────────────────────────────
// parseCustomHeaderEmbyToken
// ─────────────────────────────────────────────────────────────────────────────

test('parseCustomHeaderEmbyToken: null/empty returns null', () => {
    assert.equal(parseCustomHeaderEmbyToken(null), null);
    assert.equal(parseCustomHeaderEmbyToken(''), null);
});

test('parseCustomHeaderEmbyToken: finds X-Emby-Token in plain text', () => {
    const raw = 'X-Emby-Token: mytoken123\nOther: val';
    assert.equal(parseCustomHeaderEmbyToken(raw), 'mytoken123');
});

test('parseCustomHeaderEmbyToken: finds X-MediaBrowser-Token in plain text', () => {
    const raw = 'X-MediaBrowser-Token: mbtoken456';
    assert.equal(parseCustomHeaderEmbyToken(raw), 'mbtoken456');
});

test('parseCustomHeaderEmbyToken: case-insensitive header name matching', () => {
    const raw = 'x-emby-token: lowercasetoken';
    assert.equal(parseCustomHeaderEmbyToken(raw), 'lowercasetoken');
});

test('parseCustomHeaderEmbyToken: finds token in JSON object', () => {
    const raw = JSON.stringify({ 'X-Emby-Token': 'jsontoken789' });
    assert.equal(parseCustomHeaderEmbyToken(raw), 'jsontoken789');
});

test('parseCustomHeaderEmbyToken: no emby token key returns null', () => {
    const raw = 'Authorization: Bearer xyz\nX-Custom: val';
    assert.equal(parseCustomHeaderEmbyToken(raw), null);
});

test('parseCustomHeaderEmbyToken: returns trimmed value', () => {
    const raw = 'X-Emby-Token:   spaced   ';
    // regex requires \S.* after colon-whitespace, so leading spaces are consumed
    // but trailing spaces are NOT trimmed by m[2].trim()
    assert.equal(parseCustomHeaderEmbyToken(raw), 'spaced');
});

// ─────────────────────────────────────────────────────────────────────────────
// buildEmbyClientHeaders
// ─────────────────────────────────────────────────────────────────────────────

test('buildEmbyClientHeaders: returns all expected header keys', () => {
    const h = buildEmbyClientHeaders('tok123', 'myprefix', 'UA/1');
    const expected = ['Accept', 'Authorization', 'X-Emby-Authorization', 'X-Emby-Client',
        'X-Emby-Device-Name', 'X-Emby-Device-Id', 'X-Emby-Client-Version',
        'X-Emby-Token', 'User-Agent'];
    for (const k of expected) assert.ok(k in h, `missing key: ${k}`);
});

test('buildEmbyClientHeaders: Accept is application/json', () => {
    const h = buildEmbyClientHeaders('tok', 'pfx');
    assert.equal(h['Accept'], 'application/json');
});

test('buildEmbyClientHeaders: X-Emby-Token equals the token arg', () => {
    const h = buildEmbyClientHeaders('mytok', 'pfx');
    assert.equal(h['X-Emby-Token'], 'mytok');
});

test('buildEmbyClientHeaders: DeviceId uses prefix', () => {
    const h = buildEmbyClientHeaders('tok', 'mypfx');
    assert.equal(h['X-Emby-Device-Id'], 'mypfx');
    assert.ok(h['Authorization'].includes('DeviceId="mypfx"'));
});

test('buildEmbyClientHeaders: prefix defaults to "forward" when not given', () => {
    const h = buildEmbyClientHeaders('tok');
    assert.equal(h['X-Emby-Device-Id'], 'forward');
});

test('buildEmbyClientHeaders: Authorization and X-Emby-Authorization are identical', () => {
    const h = buildEmbyClientHeaders('tok', 'pfx');
    assert.equal(h['Authorization'], h['X-Emby-Authorization']);
});

test('buildEmbyClientHeaders: Authorization contains all MediaBrowser parts', () => {
    const h = buildEmbyClientHeaders('tok', 'pfx');
    const auth = h['Authorization'];
    assert.ok(auth.includes('MediaBrowser Client="Forward"'));
    assert.ok(auth.includes('Device="Forward"'));
    assert.ok(auth.includes('Version="1.0.0"'));
    assert.ok(auth.includes('Token="tok"'));
});

test('buildEmbyClientHeaders: double-quotes in token are stripped from auth header', () => {
    const h = buildEmbyClientHeaders('tok"with"quotes', 'pfx');
    assert.ok(h['Authorization'].includes('Token="tokwithquotes"'));
    // But X-Emby-Token retains the original value (no stripping there)
    assert.equal(h['X-Emby-Token'], 'tok"with"quotes');
});

test('buildEmbyClientHeaders: User-Agent equals the ua arg when provided', () => {
    const h = buildEmbyClientHeaders('tok', 'pfx', 'Mozilla/5.0 RealUA');
    assert.equal(h['User-Agent'], 'Mozilla/5.0 RealUA');
});

test('buildEmbyClientHeaders: no User-Agent key when ua omitted (UA comes from logs only)', () => {
    const h = buildEmbyClientHeaders('tok', 'pfx');
    assert.ok(!('User-Agent' in h));
});

test('buildEmbyClientHeaders: null token produces Token="" in auth', () => {
    const h = buildEmbyClientHeaders(null, 'pfx');
    assert.ok(h['Authorization'].includes('Token=""'));
    assert.equal(h['X-Emby-Token'], null);
});

// ─────────────────────────────────────────────────────────────────────────────
// Emby client reads
// ─────────────────────────────────────────────────────────────────────────────

test('fetchItemCountsFromEmby: falls back from /emby/Items/Counts to /Items/Counts and cancels 404 body', async () => {
    const urls = [];
    const first = cancelTrackedResponse('not found', { status: 404 });
    const fetchImpl = async (url) => {
        urls.push(String(url));
        if (urls.length === 1) return first.response;
        return Response.json({ MovieCount: 2, SeriesCount: 3, EpisodeCount: 4 });
    };
    const result = await fetchItemCountsFromEmby('https://emby.example.com/', 'tok', '', 'pfx', 'UA/1', { fetchImpl });
    assert.deepEqual(urls.map(u => new URL(u).pathname), ['/emby/Items/Counts', '/Items/Counts']);
    assert.equal(first.wasCanceled(), true);
    assert.equal(result.movies, 2);
    assert.equal(result.series, 3);
    assert.equal(result.episodes, 4);
});

test('fetchItemCountsFromEmby: unauthorized maps to { unauthorized: true } and cancels body', async () => {
    const unauthorized = cancelTrackedResponse('denied', { status: 401 });
    const fetchImpl = async () => unauthorized.response;
    const result = await fetchItemCountsFromEmby('https://emby.example.com', 'tok', '', 'pfx', 'UA/1', { fetchImpl });
    assert.deepEqual(result, { unauthorized: true });
    assert.equal(unauthorized.wasCanceled(), true);
});

test('fetchEmbyJsonWithFallback: abort timeout returns null', async () => {
    const fetchImpl = (url, init) => new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    const result = await fetchEmbyJsonWithFallback('https://emby.example.com', ['/emby/Items/Counts'], {
        timeoutMs: 1,
        headers: {},
        fetchImpl,
    });
    assert.equal(result, null);
});

test('fetchLibraryScanLastEndFromEmby: maps latest library task end time', async () => {
    const fetchImpl = async () => Response.json([
        { Key: 'OtherTask', LastExecutionResult: { EndTimeUtc: '2026-01-01T00:00:00Z' } },
        { Key: 'RefreshLibrary', LastExecutionResult: { EndTimeUtc: '2026-01-02T03:04:05Z' } },
        { Key: 'ScanLibrary', LastExecutionResult: { EndTimeUtc: '2026-01-03T03:04:05Z' } },
    ]);
    const result = await fetchLibraryScanLastEndFromEmby('https://emby.example.com', 'tok', '', 'pfx', 'UA/1', { fetchImpl });
    assert.equal(result, Math.floor(Date.parse('2026-01-03T03:04:05Z') / 1000));
});

test('authenticateByNameFromEmby: falls back from /emby auth path and returns token', async () => {
    const urls = [];
    const first = cancelTrackedResponse('not found', { status: 404 });
    const fetchImpl = async (url) => {
        urls.push(String(url));
        if (urls.length === 1) return first.response;
        return Response.json({ AccessToken: 'login-token' });
    };
    const result = await authenticateByNameFromEmby('https://emby.example.com/', 'user', 'pass', 'UA/1', 'pfx', { fetchImpl });
    assert.deepEqual(urls.map(u => new URL(u).pathname), ['/emby/Users/AuthenticateByName', '/Users/AuthenticateByName']);
    assert.equal(first.wasCanceled(), true);
    assert.deepEqual(result, { token: 'login-token' });
});

test('authenticateByNameFromEmby: 403 maps to unauthorized', async () => {
    const denied = cancelTrackedResponse('denied', { status: 403 });
    const fetchImpl = async () => denied.response;
    const result = await authenticateByNameFromEmby('https://emby.example.com', 'user', 'bad', 'UA/1', 'pfx', { fetchImpl });
    assert.deepEqual(result, { unauthorized: true });
    assert.equal(denied.wasCanceled(), true);
});

test('probeEmbyNode: falls back through public info paths and treats 401 as online', async () => {
    const urls = [];
    const first = cancelTrackedResponse('not found', { status: 404 });
    const second = cancelTrackedResponse('not found', { status: 404 });
    const third = cancelTrackedResponse('auth required', { status: 401 });
    const fetchImpl = async (url) => {
        urls.push(String(url));
        if (urls.length === 1) return first.response;
        if (urls.length === 2) return second.response;
        return third.response;
    };
    const result = await probeEmbyNode('https://emby.example.com/', 'X-Custom: yes', { fetchImpl });
    assert.deepEqual(urls.map(u => new URL(u).pathname), ['/emby/System/Info/Public', '/System/Info/Public', '/emby/Users/Public']);
    assert.equal(first.wasCanceled(), true);
    assert.equal(second.wasCanceled(), true);
    assert.equal(third.wasCanceled(), true);
    assert.equal(result.ok, true);
    assert.equal(result.status, 401);
});

test('fetchEmbyStatusWithFallback: 404 on first path continues to second path with a fresh, non-aborted signal', async () => {
    const urls = [];
    const signals = [];
    const first = cancelTrackedResponse('not found', { status: 404 });
    const fetchImpl = async (url, init) => {
        urls.push(String(url));
        signals.push(init.signal);
        if (urls.length === 1) return first.response;
        return cancelTrackedResponse('ok', { status: 200 }).response;
    };
    const result = await fetchEmbyStatusWithFallback('https://emby.example.com', ['/one', '/two'], { timeoutMs: 5000, fetchImpl });
    assert.equal(result.status, 200);
    assert.equal(signals.length, 2);
    assert.notEqual(signals[0], signals[1], 'each attempt should use its own AbortController/signal');
    assert.equal(signals[0].aborted, false);
    assert.equal(signals[1].aborted, false);
});

test('probeEmbyNode: default timeoutMs is 8000 (per attempt), passed through as the per-fetch abort delay', async () => {
    const origSetTimeout = globalThis.setTimeout;
    const delays = [];
    globalThis.setTimeout = (fn, ms, ...rest) => {
        delays.push(ms);
        // Fire immediately so the test doesn't actually wait out the real 8s timeout;
        // we only care that an 8000ms delay was *requested* per attempt.
        return origSetTimeout(fn, 0, ...rest);
    };
    const fetchImpl = (url, init) => new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
    try {
        // probeEmbyNode tries up to 3 fallback paths; every attempt should schedule
        // its own 8000ms abort timer (per-attempt semantics, not a shared/total budget).
        const result = await probeEmbyNode('https://emby.example.com', null, { fetchImpl });
        assert.equal(result.ok, false);
        assert.equal(result.status, 0);
        assert.ok(delays.length >= 1, 'expected at least one abort timer to be scheduled');
        for (const d of delays) assert.equal(d, 8000);
    } finally {
        globalThis.setTimeout = origSetTimeout;
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// buildUpstreamHeaders
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(url, headers = {}) {
    return new Request(url, { headers });
}

test('buildUpstreamHeaders: sets Host to targetUrl.host', () => {
    const req = makeRequest('https://client.example.com/path');
    const target = new URL('https://upstream.host:8096/path');
    const h = buildUpstreamHeaders(req, target, 'off', null);
    assert.equal(h.get('Host'), 'upstream.host:8096');
});

test('buildUpstreamHeaders: deletes Accept-Encoding', () => {
    const req = makeRequest('https://x.com/', { 'Accept-Encoding': 'gzip, br' });
    const target = new URL('https://upstream.com/');
    const h = buildUpstreamHeaders(req, target, 'off', null);
    assert.equal(h.get('Accept-Encoding'), null);
});

test('buildUpstreamHeaders: removes CF headers', () => {
    const req = makeRequest('https://x.com/', {
        'cf-connecting-ip': '1.2.3.4',
        'cf-ipcountry': 'US',
        'cf-ray': 'abc123',
        'cf-visitor': '{"scheme":"https"}',
    });
    const target = new URL('https://upstream.com/');
    const h = buildUpstreamHeaders(req, target, 'off', null);
    assert.equal(h.get('cf-connecting-ip'), null);
    assert.equal(h.get('cf-ipcountry'), null);
    assert.equal(h.get('cf-ray'), null);
    assert.equal(h.get('cf-visitor'), null);
});

test('buildUpstreamHeaders: removes x-forwarded-for and x-real-ip from source', () => {
    const req = makeRequest('https://x.com/', {
        'x-forwarded-for': '10.0.0.1',
        'x-real-ip': '10.0.0.2',
    });
    const target = new URL('https://upstream.com/');
    const h = buildUpstreamHeaders(req, target, 'off', null);
    // In 'off' mode with no realIp, these should be deleted and not re-set
    assert.equal(h.get('x-forwarded-for'), null);
    assert.equal(h.get('x-real-ip'), null);
});

test('buildUpstreamHeaders: mode=realip_only sets X-Real-IP only', () => {
    const req = makeRequest('https://x.com/', { 'cf-connecting-ip': '5.6.7.8' });
    const target = new URL('https://upstream.com/');
    const h = buildUpstreamHeaders(req, target, 'realip_only', null);
    assert.equal(h.get('X-Real-IP'), '5.6.7.8');
    assert.equal(h.get('X-Forwarded-For'), null);
});

test('buildUpstreamHeaders: mode=dual sets both X-Real-IP and X-Forwarded-For', () => {
    const req = makeRequest('https://x.com/', { 'cf-connecting-ip': '5.6.7.8' });
    const target = new URL('https://upstream.com/');
    const h = buildUpstreamHeaders(req, target, 'dual', null);
    assert.equal(h.get('X-Real-IP'), '5.6.7.8');
    assert.equal(h.get('X-Forwarded-For'), '5.6.7.8');
});

test('buildUpstreamHeaders: mode=strict sets Origin, Referer, and IP headers', () => {
    const req = makeRequest('https://x.com/', { 'cf-connecting-ip': '9.9.9.9' });
    const target = new URL('https://upstream.server/path');
    const h = buildUpstreamHeaders(req, target, 'strict', null);
    assert.equal(h.get('Origin'), 'https://upstream.server');
    assert.equal(h.get('Referer'), 'https://upstream.server/');
    assert.equal(h.get('X-Real-IP'), '9.9.9.9');
    assert.equal(h.get('X-Forwarded-For'), '9.9.9.9');
    // strict also removes X-Forwarded-Proto and X-Forwarded-Host
    assert.equal(h.get('X-Forwarded-Proto'), null);
    assert.equal(h.get('X-Forwarded-Host'), null);
});

test('buildUpstreamHeaders: mode=strict with no realIp — no IP headers set', () => {
    const req = makeRequest('https://x.com/');
    const target = new URL('https://upstream.server/');
    const h = buildUpstreamHeaders(req, target, 'strict', null);
    assert.equal(h.get('X-Real-IP'), null);
    assert.equal(h.get('X-Forwarded-For'), null);
    assert.equal(h.get('Origin'), 'https://upstream.server');
});

test('buildUpstreamHeaders: realIp extracted from x-forwarded-for first segment', () => {
    // cf-connecting-ip absent; falls back to x-forwarded-for first comma-segment
    const req = makeRequest('https://x.com/', { 'x-forwarded-for': '11.22.33.44, 55.66.77.88' });
    const target = new URL('https://upstream.com/');
    const h = buildUpstreamHeaders(req, target, 'realip_only', null);
    assert.equal(h.get('X-Real-IP'), '11.22.33.44');
});

test('buildUpstreamHeaders: customHeadersRaw applies key:value lines', () => {
    const req = makeRequest('https://x.com/');
    const target = new URL('https://upstream.com/');
    const custom = 'X-My-Header: myvalue\nX-Another: anotherval';
    const h = buildUpstreamHeaders(req, target, 'off', custom);
    assert.equal(h.get('X-My-Header'), 'myvalue');
    assert.equal(h.get('X-Another'), 'anotherval');
});

test('buildUpstreamHeaders: customHeadersRaw line without colon is ignored', () => {
    const req = makeRequest('https://x.com/');
    const target = new URL('https://upstream.com/');
    const custom = 'NoColonLine\nX-Good: yes';
    const h = buildUpstreamHeaders(req, target, 'off', custom);
    assert.equal(h.get('NoColonLine'), null);
    assert.equal(h.get('X-Good'), 'yes');
});

test('buildUpstreamHeaders: customHeadersRaw can override Host set earlier', () => {
    const req = makeRequest('https://x.com/');
    const target = new URL('https://upstream.com/');
    // A custom header line that overrides Host
    const custom = 'Host: custom-override.com';
    const h = buildUpstreamHeaders(req, target, 'off', custom);
    assert.equal(h.get('Host'), 'custom-override.com');
});

test('buildUpstreamHeaders: original request headers are forwarded (minus blocked ones)', () => {
    const req = makeRequest('https://x.com/', {
        'X-Custom-Client': 'clientval',
        'Authorization': 'Bearer clienttoken',
    });
    const target = new URL('https://upstream.com/');
    const h = buildUpstreamHeaders(req, target, 'off', null);
    assert.equal(h.get('X-Custom-Client'), 'clientval');
    assert.equal(h.get('Authorization'), 'Bearer clienttoken');
});

// ─────────────────────────────────────────────────────────────────────────────
// b64encode / b64decode (tokens.js)
// ─────────────────────────────────────────────────────────────────────────────

test('b64encode: known vector — empty bytes', () => {
    assert.equal(b64encode(new Uint8Array(0)), '');
});

test('b64encode: known vector — [72, 101, 108, 108, 111] = "Hello"', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    assert.equal(b64encode(bytes), btoa('Hello'));
});

test('b64decode: known vector — decode btoa("Hello")', () => {
    const decoded = b64decode(btoa('Hello'));
    assert.deepEqual(decoded, new Uint8Array([72, 101, 108, 108, 111]));
});

test('b64encode/b64decode: roundtrip with arbitrary bytes', () => {
    const original = new Uint8Array([0, 1, 127, 128, 200, 255, 42, 0, 99]);
    const encoded = b64encode(original);
    const decoded = b64decode(encoded);
    assert.deepEqual(decoded, original);
});

test('b64encode/b64decode: roundtrip with 12-byte IV-like data', () => {
    const iv = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
    const roundtripped = b64decode(b64encode(iv));
    assert.deepEqual(roundtripped, iv);
});

// ─────────────────────────────────────────────────────────────────────────────
// tokenKey / encryptToken / decryptToken (uses Web Crypto)
// ─────────────────────────────────────────────────────────────────────────────

const fakeEnv = { ADMIN_TOKEN: 'test-secret-for-golden-master-tests' };
const testPrefix = 'testprefix';

test('tokenKey: returns a CryptoKey object', async () => {
    const key = await tokenKey(fakeEnv, testPrefix);
    assert.ok(key instanceof CryptoKey, 'should be CryptoKey');
    assert.equal(key.type, 'secret');
    assert.ok(key.usages.includes('encrypt'));
    assert.ok(key.usages.includes('decrypt'));
});

test('tokenKey: same env+prefix yields functionally equivalent keys (encrypt/decrypt cross-verify)', async () => {
    const key1 = await tokenKey(fakeEnv, testPrefix);
    const key2 = await tokenKey(fakeEnv, testPrefix);
    // Both keys are derived from the same material — encrypt with key1, decrypt with key2
    const plaintext = new TextEncoder().encode('cross-key-verify');
    const iv = new Uint8Array(12).fill(7);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, plaintext);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key2, ct);
    assert.equal(new TextDecoder().decode(pt), 'cross-key-verify');
});

test('encryptToken/decryptToken: roundtrip returns original token', async () => {
    const token = 'my-emby-token-abc123';
    const blob = await encryptToken(fakeEnv, testPrefix, token);
    // blob should be two base64 segments separated by "."
    assert.ok(typeof blob === 'string');
    assert.ok(blob.indexOf('.') > 0, 'encrypted blob should contain "."');
    const recovered = await decryptToken(fakeEnv, testPrefix, blob);
    assert.equal(recovered, token);
});

test('encryptToken: produces different ciphertext on each call (random IV)', async () => {
    const token = 'same-token';
    const blob1 = await encryptToken(fakeEnv, testPrefix, token);
    const blob2 = await encryptToken(fakeEnv, testPrefix, token);
    // Random IV means ciphertexts differ
    assert.notEqual(blob1, blob2);
});

test('decryptToken: returns null for null/empty input', async () => {
    assert.equal(await decryptToken(fakeEnv, testPrefix, null), null);
    assert.equal(await decryptToken(fakeEnv, testPrefix, ''), null);
    assert.equal(await decryptToken(fakeEnv, testPrefix, 123), null);
});

test('decryptToken: returns null when no dot in blob', async () => {
    assert.equal(await decryptToken(fakeEnv, testPrefix, 'nodotinhere'), null);
});

test('decryptToken: returns null when blob has more than two dot-segments', async () => {
    assert.equal(await decryptToken(fakeEnv, testPrefix, 'a.b.c'), null);
});

test('decryptToken: returns null when IV segment decodes to wrong length', async () => {
    // A valid base64 segment that decodes to fewer than 12 bytes (e.g. "abc" = 3 bytes)
    const shortIvBlob = btoa('abc') + '.' + btoa('ciphertext');
    assert.equal(await decryptToken(fakeEnv, testPrefix, shortIvBlob), null);
});

test('decryptToken: returns null for tampered ciphertext (wrong key/data)', async () => {
    const token = 'valid-token';
    const blob = await encryptToken(fakeEnv, testPrefix, token);
    const parts = blob.split('.');
    // Tamper the ciphertext part (append a character)
    const tamperedBlob = parts[0] + '.' + parts[1] + 'AA==';
    const result = await decryptToken(fakeEnv, testPrefix, tamperedBlob);
    assert.equal(result, null);
});

test('decryptToken: returns null when decrypted with wrong prefix', async () => {
    const token = 'my-token';
    const blob = await encryptToken(fakeEnv, testPrefix, token);
    // Try to decrypt with a different prefix — derives a different key
    const result = await decryptToken(fakeEnv, 'wrongprefix', blob);
    assert.equal(result, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// extractEmbyToken
// ─────────────────────────────────────────────────────────────────────────────

test('extractEmbyToken: from X-Emby-Token header', () => {
    const req = new Request('https://x.com/', { headers: { 'X-Emby-Token': 'tok-from-emby' } });
    assert.equal(extractEmbyToken(req), 'tok-from-emby');
});

test('extractEmbyToken: from X-MediaBrowser-Token header', () => {
    const req = new Request('https://x.com/', { headers: { 'X-MediaBrowser-Token': 'tok-mb' } });
    assert.equal(extractEmbyToken(req), 'tok-mb');
});

test('extractEmbyToken: X-Emby-Token takes priority over X-MediaBrowser-Token', () => {
    const req = new Request('https://x.com/', {
        headers: {
            'X-Emby-Token': 'tok-emby',
            'X-MediaBrowser-Token': 'tok-mb',
        }
    });
    // Headers API coalesces duplicates; but these are different header names
    // X-Emby-Token checked first via ||
    assert.equal(extractEmbyToken(req), 'tok-emby');
});

test('extractEmbyToken: trims whitespace from X-Emby-Token', () => {
    const req = new Request('https://x.com/', { headers: { 'X-Emby-Token': '  trimmed  ' } });
    assert.equal(extractEmbyToken(req), 'trimmed');
});

test('extractEmbyToken: from X-Emby-Authorization header Token field', () => {
    const req = new Request('https://x.com/', {
        headers: { 'X-Emby-Authorization': 'MediaBrowser Client="E", Token="authz-tok"' }
    });
    assert.equal(extractEmbyToken(req), 'authz-tok');
});

test('extractEmbyToken: Authorization header MediaBrowser Token field — regex stops at first comma so commas before Token= cause null', () => {
    // ACTUAL behavior: the regex /MediaBrowser[^,]*Token=/ stops matching at the first comma.
    // "MediaBrowser Client="E", Device="D", Token="auth-tok"" has commas before Token=,
    // so the regex does NOT match and returns null. This is the golden-master behavior.
    const reqWithCommas = new Request('https://x.com/', {
        headers: { 'Authorization': 'MediaBrowser Client="E", Device="D", Token="auth-tok"' }
    });
    assert.equal(extractEmbyToken(reqWithCommas), null);

    // But if Token comes immediately after MediaBrowser (no prior commas), it DOES match.
    const reqNoCommas = new Request('https://x.com/', {
        headers: { 'Authorization': 'MediaBrowser Token="direct-tok"' }
    });
    assert.equal(extractEmbyToken(reqNoCommas), 'direct-tok');
});

test('extractEmbyToken: from api_key query parameter', () => {
    const req = new Request('https://x.com/path?api_key=querytoken');
    assert.equal(extractEmbyToken(req), 'querytoken');
});

test('extractEmbyToken: returns null when no token found', () => {
    const req = new Request('https://x.com/', { headers: { 'X-Custom': 'nope' } });
    assert.equal(extractEmbyToken(req), null);
});

test('extractEmbyToken: X-Emby-Token header takes priority over api_key query', () => {
    const req = new Request('https://x.com/?api_key=qparam', {
        headers: { 'X-Emby-Token': 'header-tok' }
    });
    assert.equal(extractEmbyToken(req), 'header-tok');
});

test('extractEmbyToken: X-Emby-Authorization checked before Authorization', () => {
    const req = new Request('https://x.com/', {
        headers: {
            'X-Emby-Authorization': 'MediaBrowser Token="xea-tok"',
            'Authorization': 'MediaBrowser Token="auth-tok"',
        }
    });
    assert.equal(extractEmbyToken(req), 'xea-tok');
});

// ─────────────────────────────────────────────────────────────────────────────
// HARVEST_MEM (exported Map — just verify it's the right type)
// ─────────────────────────────────────────────────────────────────────────────

test('HARVEST_MEM: is a Map', () => {
    assert.ok(HARVEST_MEM instanceof Map);
});

// ─────────────────────────────────────────────────────────────────────────────
// persistHarvestedToken — skipped (requires D1 database mock with prepare/bind/run)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('persistHarvestedToken: skipped — requires D1 env.DB (prepare/bind/run chain) which is a Cloudflare-specific runtime API not available in Node', () => {});

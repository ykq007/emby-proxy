/**
 * Tests for src/middleware/auth.js — D1-backed failed-auth rate limiting.
 *
 * Verifies:
 *  - correct admin_token passes through and NEVER touches the rate-limit table
 *  - wrong token under the limit → 401 (and increments the counter)
 *  - wrong token over the limit → 429
 *  - DB absent → fail-open (still 401, no crash)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { requireAuth } from '../src/middleware/auth.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

const TOKEN = 'secret-admin-token';

/**
 * Minimal D1 mock for the failed-auth limiter + Fail2ban ban flow.
 * Supports: SELECT until FROM ip_bans, INSERT auth_rl ... RETURNING n,
 *           SELECT SUM(n) AS s FROM auth_rl, INSERT OR REPLACE INTO ip_bans.
 */
function makeRlDB() {
    const counters = new Map(); // `${ip}:${win}` -> n
    const bans = new Map();     // ip -> until
    let writes = 0;
    const fake = createD1Fake([
        {
            test: /SELECT until FROM ip_bans/i,
            exec: ([ip]) => (bans.has(ip) ? [{ until: bans.get(ip) }] : []),
        },
        {
            test: /INSERT INTO auth_rl/i,
            exec: ([ip, win]) => {
                writes++;
                const key = `${ip}:${win}`;
                const n = (counters.get(key) || 0) + 1;
                counters.set(key, n);
                return [{ n }];
            },
        },
        {
            test: /SELECT SUM\(n\) AS s FROM auth_rl/i,
            exec: ([ip, winFloor]) => {
                let s = 0;
                for (const [key, n] of counters) {
                    const [kIp, kWin] = key.split(':');
                    if (kIp === ip && Number(kWin) > winFloor) s += n;
                }
                return [{ s }];
            },
        },
        {
            test: /INSERT OR REPLACE INTO ip_bans/i,
            exec: ([ip, until]) => {
                writes++;
                bans.set(ip, until);
                return [];
            },
        },
    ]);
    fake._counters = counters;
    fake._bans = bans;
    Object.defineProperty(fake, 'writes', { get: () => writes });
    return fake;
}

function makeReq(token) {
    const headers = { 'cf-connecting-ip': '203.0.113.7' };
    if (token !== undefined) headers['Cookie'] = 'admin_token=' + token;
    return new Request('https://panel.example.com/api/routes', { headers });
}
const URL_API = new URL('https://panel.example.com/api/routes');

test('correct token → passes (null) and never writes to auth_rl', async () => {
    const db = makeRlDB();
    const res = await requireAuth(makeReq(TOKEN), { ADMIN_TOKEN: TOKEN, DB: db }, URL_API);
    assert.equal(res, null);
    assert.equal(db.writes, 0, 'correct token must not consume rate-limit budget');
});

test('wrong token under limit → 401 and increments counter', async () => {
    const db = makeRlDB();
    const env = { ADMIN_TOKEN: TOKEN, DB: db };
    for (let i = 1; i <= 12; i++) {
        const res = await requireAuth(makeReq('nope-' + i), env, URL_API);
        assert.equal(res.status, 401, `attempt ${i} should be 401`);
    }
    assert.equal(db.writes, 12);
});

test('wrong token over limit (13th in window) → 429', async () => {
    const db = makeRlDB();
    const env = { ADMIN_TOKEN: TOKEN, DB: db };
    let last;
    for (let i = 1; i <= 13; i++) {
        last = await requireAuth(makeReq('nope-' + i), env, URL_API);
    }
    assert.equal(last.status, 429, '13th failed attempt should be rate-limited');
    assert.equal(last.headers.get('Retry-After'), '60');
});

test('already-banned IP → 429 immediately, without consuming counter', async () => {
    const db = makeRlDB();
    db._bans.set('203.0.113.7', Date.now() + 600000); // banned for 10 min
    const res = await requireAuth(makeReq('whatever'), { ADMIN_TOKEN: TOKEN, DB: db }, URL_API);
    assert.equal(res.status, 429);
    assert.equal(db.writes, 0, 'banned IP must not write counter rows');
});

test('sustained failures over hourly threshold → IP auto-banned (Fail2ban)', async () => {
    const db = makeRlDB();
    const env = { ADMIN_TOKEN: TOKEN, DB: db };
    let last;
    for (let i = 0; i < 101; i++) last = await requireAuth(makeReq('x' + i), env, URL_API);
    assert.equal(last.status, 429);
    assert.ok(db._bans.has('203.0.113.7'), 'IP should be auto-banned after >100 failures');
    // A subsequent attempt is now short-circuited by the ban check
    const after = await requireAuth(makeReq('again'), env, URL_API);
    assert.equal(after.status, 429);
});

test('expired ban is ignored (until in the past) → falls through to normal 401', async () => {
    const db = makeRlDB();
    db._bans.set('203.0.113.7', Date.now() - 1000); // already expired
    const res = await requireAuth(makeReq('wrong'), { ADMIN_TOKEN: TOKEN, DB: db }, URL_API);
    assert.equal(res.status, 401);
});

test('DB absent → fail-open (still 401, no crash)', async () => {
    const res = await requireAuth(makeReq('wrong'), { ADMIN_TOKEN: TOKEN }, URL_API);
    assert.equal(res.status, 401);
});

test('missing ADMIN_TOKEN env → 500 configuration error', async () => {
    const res = await requireAuth(makeReq('x'), { DB: makeRlDB() }, URL_API);
    assert.equal(res.status, 500);
});

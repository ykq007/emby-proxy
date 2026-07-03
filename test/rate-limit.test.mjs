/**
 * Tests for src/db/rate-limit.js — the shared D1 fixed-window rate limiter +
 * Fail2ban ban escalation used by both the auth abuse gate (auth_rl) and the
 * prefix-scan gate (scan_rl).
 *
 * Proves the insert / conflict / hourly-sum / ban sequence directly against
 * the shared implementation, parameterized by table + thresholds, so both
 * call sites can rely on identical behavior.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rateLimitFixedWindow } from '../src/db/rate-limit.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

function makeDB() {
    const counters = new Map(); // `${table}:${ip}:${win}` -> n
    const bans = new Map();     // ip -> { until, reason }
    let writes = 0;
    const fake = createD1Fake([
        {
            test: /SELECT until FROM ip_bans/i,
            exec: ([ip]) => (bans.has(ip) ? [{ until: bans.get(ip).until }] : []),
        },
        {
            test: /INSERT INTO (\w+)/i,
            exec: ([ip, win], sql) => {
                writes++;
                const table = sql.match(/INSERT INTO (\w+)/i)[1];
                const key = `${table}:${ip}:${win}`;
                const n = (counters.get(key) || 0) + 1;
                counters.set(key, n);
                return [{ n }];
            },
        },
        {
            test: /SELECT SUM\(n\) AS s FROM (\w+)/i,
            exec: ([ip, winFloor], sql) => {
                const table = sql.match(/SELECT SUM\(n\) AS s FROM (\w+)/i)[1];
                let s = 0;
                for (const [key, n] of counters) {
                    const [kTable, kIp, kWin] = key.split(':');
                    if (kTable === table && kIp === ip && Number(kWin) > winFloor) s += n;
                }
                return [{ s }];
            },
        },
        {
            test: /INSERT OR REPLACE INTO ip_bans/i,
            exec: ([ip, until, reason]) => {
                writes++;
                bans.set(ip, { until, reason });
                return [];
            },
        },
    ]);
    fake._counters = counters;
    fake._bans = bans;
    Object.defineProperty(fake, 'writes', { get: () => writes });
    return fake;
}

const IP = '198.51.100.42';
const now = 100000 * 60000; // arbitrary fixed ms aligned to a minute
const OPTS = { table: 'test_rl', minuteLimit: 3, hourlyLimit: 5, banMs: 3600000, reason: 'test-reason' };

test('under minute limit → null (pass), each call inserts/increments the counter', async () => {
    const db = makeDB();
    const env = { DB: db };
    for (let i = 1; i <= 3; i++) {
        assert.equal(await rateLimitFixedWindow(env, IP, now, OPTS), null, `req ${i} should pass`);
    }
    assert.equal(db.writes, 3, 'each request writes one INSERT ... ON CONFLICT counter row');
    const win = Math.floor(now / 60000);
    assert.equal(db._counters.get(`test_rl:${IP}:${win}`), 3, 'counter reflects insert+conflict increments');
});

test('over minute limit, but under hourly threshold → 429 (not banned)', async () => {
    const db = makeDB();
    const env = { DB: db };
    let last;
    for (let i = 1; i <= 4; i++) last = await rateLimitFixedWindow(env, IP, now, OPTS);
    assert.ok(last);
    assert.equal(last.status, 429);
    assert.equal(last.headers.get('Retry-After'), '60', 'minute-window 429 retries after 60s');
    assert.equal(db._bans.has(IP), false, 'hourly sum (4) is not yet over the hourly threshold (5)');
});

test('hourly sum exceeds threshold → escalates to ban with table-specific reason', async () => {
    const db = makeDB();
    const env = { DB: db };
    let last;
    for (let i = 1; i <= 6; i++) last = await rateLimitFixedWindow(env, IP, now, OPTS);
    assert.equal(last.status, 429);
    assert.ok(db._bans.has(IP), 'IP should be auto-banned once hourly sum > hourlyLimit');
    assert.equal(db._bans.get(IP).reason, 'test-reason');
    assert.equal(db._bans.get(IP).until, now + OPTS.banMs);
    assert.equal(last.headers.get('Retry-After'), String(OPTS.banMs / 1000));
});

test('already-banned IP → 429 immediately, ban check short-circuits before any counter write', async () => {
    const db = makeDB();
    db._bans.set(IP, { until: now + 600000, reason: 'test-reason' });
    const res = await rateLimitFixedWindow({ DB: db }, IP, now, OPTS);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('Retry-After'), '600');
    assert.equal(db.writes, 0, 'banned IP must not write counter rows');
});

test('expired ban is ignored → falls through to normal counting', async () => {
    const db = makeDB();
    db._bans.set(IP, { until: now - 1000, reason: 'test-reason' });
    const res = await rateLimitFixedWindow({ DB: db }, IP, now, OPTS);
    assert.equal(res, null);
    assert.equal(db.writes, 1, 'expired ban falls through to the counter insert');
});

test('different tables/thresholds are fully independent (proves parameterization)', async () => {
    const db = makeDB();
    const env = { DB: db };
    const authOpts = { table: 'auth_rl', minuteLimit: 12, hourlyLimit: 100, banMs: 3600000, reason: 'auth-bruteforce' };
    const scanOpts = { table: 'scan_rl', minuteLimit: 30, hourlyLimit: 200, banMs: 3600000, reason: 'prefix-scan' };

    for (let i = 1; i <= 12; i++) {
        assert.equal(await rateLimitFixedWindow(env, IP, now, authOpts), null);
    }
    // auth_rl is now at its minute limit; scan_rl should be entirely unaffected
    for (let i = 1; i <= 30; i++) {
        assert.equal(await rateLimitFixedWindow(env, IP, now, scanOpts), null, `scan req ${i} should still pass`);
    }
    const win = Math.floor(now / 60000);
    assert.equal(db._counters.get(`auth_rl:${IP}:${win}`), 12);
    assert.equal(db._counters.get(`scan_rl:${IP}:${win}`), 30);

    const authBlocked = await rateLimitFixedWindow(env, IP, now, authOpts);
    assert.equal(authBlocked.status, 429, 'auth_rl 13th request is now limited');
    const scanBlocked = await rateLimitFixedWindow(env, IP, now, scanOpts);
    assert.equal(scanBlocked.status, 429, 'scan_rl 31st request is now limited');
});

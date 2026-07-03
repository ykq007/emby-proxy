/**
 * Tests for src/proxy/scan-guard.js — proxy-layer Fail2ban for prefix scanning.
 * Mirrors the auth limiter: under limit → null (pass), over → 429,
 * sustained → ban (ip_bans), already-banned → 429 without counting.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { guardPrefixScan } from '../src/proxy/scan-guard.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

function makeDB() {
    const counters = new Map();
    const bans = new Map();
    let writes = 0;
    const fake = createD1Fake([
        {
            test: /SELECT until FROM ip_bans/i,
            exec: ([ip]) => (bans.has(ip) ? [{ until: bans.get(ip) }] : []),
        },
        {
            test: /INSERT INTO scan_rl/i,
            exec: ([ip, win]) => {
                writes++;
                const key = ip + ':' + win;
                const n = (counters.get(key) || 0) + 1;
                counters.set(key, n);
                return [{ n }];
            },
        },
        {
            test: /SELECT SUM\(n\) AS s FROM scan_rl/i,
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
            exec: ([ip, until]) => { writes++; bans.set(ip, until); return []; },
        },
    ]);
    fake._counters = counters;
    fake._bans = bans;
    Object.defineProperty(fake, 'writes', { get: () => writes });
    return fake;
}
const IP = '198.51.100.9';
const now = 100000 * 60000; // arbitrary fixed ms aligned to a minute

test('no DB / no ip → null (fail-open)', async () => {
    assert.equal(await guardPrefixScan({}, IP, now), null);
    assert.equal(await guardPrefixScan({ DB: makeDB() }, '', now), null);
    assert.equal(await guardPrefixScan({ DB: makeDB() }, 'Unknown', now), null);
});

test('under per-minute limit → null (pass, still counts)', async () => {
    const db = makeDB();
    const env = { DB: db };
    for (let i = 1; i <= 30; i++) {
        assert.equal(await guardPrefixScan(env, IP, now), null, `req ${i} should pass`);
    }
});

test('over per-minute limit (31st) → 429', async () => {
    const db = makeDB();
    const env = { DB: db };
    let last;
    for (let i = 1; i <= 31; i++) last = await guardPrefixScan(env, IP, now);
    assert.ok(last);
    assert.equal(last.status, 429);
});

test('sustained scanning over hourly threshold → auto-ban', async () => {
    const db = makeDB();
    const env = { DB: db };
    let last;
    for (let i = 0; i < 201; i++) last = await guardPrefixScan(env, IP, now);
    assert.equal(last.status, 429);
    assert.ok(db._bans.has(IP), 'IP should be auto-banned after >200 unknown-prefix 404s');
    assert.equal(last.headers.get('Retry-After'), '3600');
});

test('already-banned IP → 429 immediately without counting', async () => {
    const db = makeDB();
    db._bans.set(IP, now + 600000);
    const res = await guardPrefixScan({ DB: db }, IP, now);
    assert.equal(res.status, 429);
    assert.equal(db.writes, 0, 'banned IP must not write counter rows');
});

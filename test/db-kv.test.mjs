/**
 * Tests for src/db/kv.js — the kv_config key registry + typed kvGet/kvSet
 * accessors (issue #19).
 *
 * Covers:
 *   - key registry: every constant is a distinct, non-empty string
 *   - round-trip (kvSet → kvGet) for every structured codec (country
 *     allowlist, hotlink hosts, mute-until) and for raw (uncoded) keys
 *   - normalization on write (dedupe/case-fold) matches normalization on read
 *   - kvGet defaults when no env.DB / no row
 *   - kvDelete clears a row
 *   - kvSetStmt builds an unexecuted statement usable inside env.DB.batch()
 *
 * Runner: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createD1Fake } from './helpers/d1-fake.mjs';
import {
    kvGet,
    kvSet,
    kvSetStmt,
    kvDelete,
    SCHEMA_VERSION_KEY,
    MANUAL_REDIRECT_DOMAINS_KEY,
    COUNTRY_ALLOWLIST_KEY,
    HOTLINK_ALLOW_HOSTS_KEY,
    EMBY_LAST_ROLLUP_TS_KEY,
    TG_ALERTS_MUTED_UNTIL_KEY,
    EMBY_SHARED_USERNAME_KEY,
    EMBY_SHARED_PASSWORD_ENC_KEY,
    countryAllowlistCodec,
    hotlinkHostsCodec,
    muteUntilCodec,
} from '../src/db/kv.js';

// ---------------------------------------------------------------------------
// Mock D1 — a real in-memory kv_config table backing prepare/bind/first/
// run/all, so kvSet(...) followed by kvGet(...) is a genuine round trip
// through the same SQL surface the real accessors use.
// ---------------------------------------------------------------------------

function makeDB() {
    const table = new Map(); // k -> v
    const fake = createD1Fake([
        {
            test: /SELECT v FROM kv_config WHERE k\s*=\s*\?/i,
            exec: ([key]) => (table.has(key) ? [{ v: table.get(key) }] : []),
        },
        {
            test: /INSERT OR REPLACE INTO kv_config/i,
            exec: ([key, value]) => { table.set(key, value); return []; },
        },
        {
            test: /DELETE FROM kv_config WHERE k\s*=\s*\?/i,
            exec: ([key]) => { table.delete(key); return []; },
        },
    ]);
    fake.table = table;
    return fake;
}

// ---------------------------------------------------------------------------
// Key registry
// ---------------------------------------------------------------------------

test('key registry: every kv_config key is a distinct non-empty string', () => {
    const keys = [
        SCHEMA_VERSION_KEY,
        MANUAL_REDIRECT_DOMAINS_KEY,
        COUNTRY_ALLOWLIST_KEY,
        HOTLINK_ALLOW_HOSTS_KEY,
        EMBY_LAST_ROLLUP_TS_KEY,
        TG_ALERTS_MUTED_UNTIL_KEY,
        EMBY_SHARED_USERNAME_KEY,
        EMBY_SHARED_PASSWORD_ENC_KEY,
    ];
    for (const k of keys) {
        assert.equal(typeof k, 'string');
        assert.ok(k.length > 0);
    }
    assert.equal(new Set(keys).size, keys.length, 'all keys must be distinct');
});

// ---------------------------------------------------------------------------
// kvGet defaults — no env.DB / missing row
// ---------------------------------------------------------------------------

test('kvGet: no env.DB → codec default (null) for every key, does not throw', async () => {
    for (const key of [COUNTRY_ALLOWLIST_KEY, HOTLINK_ALLOW_HOSTS_KEY, TG_ALERTS_MUTED_UNTIL_KEY, SCHEMA_VERSION_KEY]) {
        assert.equal(await kvGet({}, key), key === TG_ALERTS_MUTED_UNTIL_KEY ? 0 : null);
    }
});

test('kvGet: missing row (never written) → codec default', async () => {
    const env = { DB: makeDB() };
    assert.equal(await kvGet(env, COUNTRY_ALLOWLIST_KEY), null);
    assert.equal(await kvGet(env, HOTLINK_ALLOW_HOSTS_KEY), null);
    assert.equal(await kvGet(env, TG_ALERTS_MUTED_UNTIL_KEY), 0);
    assert.equal(await kvGet(env, SCHEMA_VERSION_KEY), null);
});

// ---------------------------------------------------------------------------
// Round-trip: country allowlist
// ---------------------------------------------------------------------------

test('round-trip: country allowlist — write messy input, read back a normalized Set', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, COUNTRY_ALLOWLIST_KEY, 'cn, hk , tw,cn');
    const set = await kvGet(env, COUNTRY_ALLOWLIST_KEY);
    assert.ok(set instanceof Set);
    assert.deepEqual([...set].sort(), ['CN', 'HK', 'TW'], 'deduped + uppercased');
});

test('round-trip: country allowlist — writing a Set serializes and reads back the same Set', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, COUNTRY_ALLOWLIST_KEY, new Set(['us', 'JP', 'us']));
    const set = await kvGet(env, COUNTRY_ALLOWLIST_KEY);
    assert.deepEqual([...set].sort(), ['JP', 'US']);
});

test('round-trip: country allowlist — empty string clears the gate (null on read)', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, COUNTRY_ALLOWLIST_KEY, 'cn');
    assert.ok(await kvGet(env, COUNTRY_ALLOWLIST_KEY));
    await kvSet(env, COUNTRY_ALLOWLIST_KEY, '');
    assert.equal(await kvGet(env, COUNTRY_ALLOWLIST_KEY), null);
});

// ---------------------------------------------------------------------------
// Round-trip: hotlink allow hosts
// ---------------------------------------------------------------------------

test('round-trip: hotlink hosts — comma/newline mixed input normalizes to lowercase deduped Set', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, HOTLINK_ALLOW_HOSTS_KEY, 'Good.Example.com\nOTHER.example.com,good.example.com');
    const set = await kvGet(env, HOTLINK_ALLOW_HOSTS_KEY);
    assert.deepEqual([...set].sort(), ['good.example.com', 'other.example.com']);
});

test('round-trip: hotlink hosts — writing a Set round-trips through serialize/parse', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, HOTLINK_ALLOW_HOSTS_KEY, new Set(['A.example.com']));
    assert.deepEqual([...await kvGet(env, HOTLINK_ALLOW_HOSTS_KEY)], ['a.example.com']);
});

// ---------------------------------------------------------------------------
// Round-trip: mute-until timestamp
// ---------------------------------------------------------------------------

test('round-trip: mute-until — write a unix-seconds number, read back the same integer', async () => {
    const env = { DB: makeDB() };
    const until = Math.floor(Date.now() / 1000) + 1800;
    await kvSet(env, TG_ALERTS_MUTED_UNTIL_KEY, until);
    assert.equal(await kvGet(env, TG_ALERTS_MUTED_UNTIL_KEY), until);
});

test('round-trip: mute-until — kvDelete clears it, next kvGet returns 0 (not muted)', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, TG_ALERTS_MUTED_UNTIL_KEY, Math.floor(Date.now() / 1000) + 60);
    assert.ok(await kvGet(env, TG_ALERTS_MUTED_UNTIL_KEY) > 0);
    await kvDelete(env, TG_ALERTS_MUTED_UNTIL_KEY);
    assert.equal(await kvGet(env, TG_ALERTS_MUTED_UNTIL_KEY), 0);
});

test('mute-until codec: non-numeric / zero / negative input parses to 0', () => {
    assert.equal(muteUntilCodec.parse('not-a-number'), 0);
    assert.equal(muteUntilCodec.parse('0'), 0);
    assert.equal(muteUntilCodec.parse(null), 0);
    assert.equal(muteUntilCodec.parse(undefined), 0);
});

// ---------------------------------------------------------------------------
// Round-trip: raw (uncoded) keys — shared-credential username stays untouched
// ---------------------------------------------------------------------------

test('round-trip: raw key (emby shared username) — value passes through unchanged', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, EMBY_SHARED_USERNAME_KEY, 'alice');
    assert.equal(await kvGet(env, EMBY_SHARED_USERNAME_KEY), 'alice');
});

test('round-trip: raw key (emby shared password enc) — empty string clears it (falsy on read)', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, EMBY_SHARED_PASSWORD_ENC_KEY, 'ciphertext-blob');
    assert.equal(await kvGet(env, EMBY_SHARED_PASSWORD_ENC_KEY), 'ciphertext-blob');
    await kvSet(env, EMBY_SHARED_PASSWORD_ENC_KEY, '');
    assert.equal(await kvGet(env, EMBY_SHARED_PASSWORD_ENC_KEY), '', 'empty string round-trips to empty string');
    assert.ok(!(await kvGet(env, EMBY_SHARED_PASSWORD_ENC_KEY)), 'falsy, so has_password checks still read as "no password"');
});

test('round-trip: schema version key — string integer passes through unchanged', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, SCHEMA_VERSION_KEY, '3');
    assert.equal(await kvGet(env, SCHEMA_VERSION_KEY), '3');
});

// ---------------------------------------------------------------------------
// kvSetStmt — batch-friendly, unexecuted statement using the same codec
// ---------------------------------------------------------------------------

test('kvSetStmt: builds an unexecuted statement; running it writes through the same codec as kvSet', async () => {
    const env = { DB: makeDB() };
    const stmt = kvSetStmt(env, EMBY_LAST_ROLLUP_TS_KEY, 12345);
    assert.equal(env.DB.table.has(EMBY_LAST_ROLLUP_TS_KEY), false, 'not executed yet');
    await env.DB.batch([stmt]);
    assert.equal(await kvGet(env, EMBY_LAST_ROLLUP_TS_KEY), '12345');
});

// ---------------------------------------------------------------------------
// Shared codec exports — config-cache.js parses pre-fetched raw strings
// through the identical codec kvGet/kvSet use (no drift possible).
// ---------------------------------------------------------------------------

test('exported codecs match kvGet/kvSet behavior exactly (same parse fn is used internally)', async () => {
    const env = { DB: makeDB() };
    await kvSet(env, COUNTRY_ALLOWLIST_KEY, 'de, fr');
    const row = env.DB.table.get(COUNTRY_ALLOWLIST_KEY);
    assert.deepEqual([...countryAllowlistCodec.parse(row)].sort(), [...await kvGet(env, COUNTRY_ALLOWLIST_KEY)].sort());

    await kvSet(env, HOTLINK_ALLOW_HOSTS_KEY, 'x.example.com');
    const hrow = env.DB.table.get(HOTLINK_ALLOW_HOSTS_KEY);
    assert.deepEqual([...hotlinkHostsCodec.parse(hrow)], [...await kvGet(env, HOTLINK_ALLOW_HOSTS_KEY)]);
});

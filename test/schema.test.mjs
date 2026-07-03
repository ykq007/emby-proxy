/**
 * Tests for src/db/schema.js — version-gated ensureSchema (issue #9).
 *
 * Goal: a cold isolate whose kv_config already has the current
 * SCHEMA_VERSION should do exactly ONE D1 query (the version SELECT) and
 * skip the ~50-exec DDL migration entirely. A mismatched/missing version
 * (including a brand-new empty DB where kv_config doesn't exist yet) must
 * still run the full migration once and then persist the version.
 *
 * Runner: node --test (Node 22 built-in test runner, no extra deps)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    ensureSchema,
    SCHEMA_VERSION,
    SCHEMA_VERSION_KEY,
    __resetSchemaReadyForTest,
} from '../src/db/schema.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

// ---------------------------------------------------------------------------
// Mock D1 — records every SQL touch (exec / prepare().bind().first()/.run()/
// .all() / batch()) into queryLog so tests can assert exact query counts and
// distinguish "just the version SELECT" from "a full DDL migration".
// ---------------------------------------------------------------------------

function makeDB({ versionRow = null, throwOnVersionSelect = false } = {}) {
    const kv = new Map();
    if (versionRow) kv.set(SCHEMA_VERSION_KEY, versionRow);

    const db = createD1Fake([
        {
            test: /SELECT v FROM kv_config WHERE k\s*=\s*\?/i,
            exec: ([key]) => {
                if (throwOnVersionSelect) throw new Error('no such table: kv_config');
                const row = kv.get(key);
                return row ? [row] : [];
            },
        },
        {
            test: /FROM kv_config WHERE k\s*=\s*'([^']+)'/i,
            exec: (_binds, sql) => {
                const m = sql.match(/FROM kv_config WHERE k\s*=\s*'([^']+)'/i);
                const row = kv.get(m[1]);
                return row ? [row] : [];
            },
        },
        {
            test: /INSERT OR REPLACE INTO kv_config/i,
            exec: ([key, value]) => { kv.set(key, { v: value }); return []; },
        },
        {
            test: /INSERT INTO kv_config \(k, v\) VALUES \('([^']+)'/i,
            exec: ([value], sql) => {
                const m = sql.match(/INSERT INTO kv_config \(k, v\) VALUES \('([^']+)'/i);
                kv.set(m[1], { v: value });
                return [];
            },
        },
        // probeRecreate's "SELECT <col> FROM <table> LIMIT 0" self-heal check has no
        // handler here — the fake's default .all() → { results: [] } means "columns
        // already exist", so the self-heal DROP path isn't exercised in these tests.
    ]);
    db.kv = kv;
    Object.defineProperty(db, 'queryLog', { get: () => db.log.map(l => l.sql) });
    return db;
}

function ddlCount(queryLog) {
    return queryLog.filter(sql => /^(CREATE TABLE|CREATE INDEX|ALTER TABLE|DROP TABLE)/i.test(sql)).length;
}

test('(a) version MATCHES: exactly one query, no migration DDL', async () => {
    __resetSchemaReadyForTest();
    const db = makeDB({ versionRow: { v: String(SCHEMA_VERSION) } });
    await ensureSchema({ DB: db });

    assert.equal(db.queryLog.length, 1, `expected exactly 1 D1 query, got ${db.queryLog.length}: ${JSON.stringify(db.queryLog)}`);
    assert.match(db.queryLog[0], /SELECT v FROM kv_config WHERE k\s*=\s*\?/i);
    assert.equal(ddlCount(db.queryLog), 0, 'no CREATE/ALTER/DROP should run when version matches');
});

test('(b) version MISMATCH: full migration runs once, then version is written', async () => {
    __resetSchemaReadyForTest();
    const db = makeDB({ versionRow: { v: '0' } }); // stored version differs from current SCHEMA_VERSION
    await ensureSchema({ DB: db });

    assert.ok(db.queryLog.length > 40, `expected the full ~50-exec migration to run, only saw ${db.queryLog.length} queries`);
    assert.ok(ddlCount(db.queryLog) > 30, 'expected many CREATE/ALTER/DROP statements from the full migration');
    assert.deepEqual(db.kv.get(SCHEMA_VERSION_KEY), { v: String(SCHEMA_VERSION) }, 'schema version should be persisted after migration');

    // Calling again should now hit the fast path (module-level _schemaReady flag).
    const queriesBefore = db.queryLog.length;
    await ensureSchema({ DB: db });
    assert.equal(db.queryLog.length, queriesBefore, 'second call in the same isolate should be a no-op (_schemaReady short-circuit)');
});

test('(c) empty DB (kv_config table missing): version SELECT throws, migration self-inits', async () => {
    __resetSchemaReadyForTest();
    const db = makeDB({ throwOnVersionSelect: true });
    await ensureSchema({ DB: db });

    assert.ok(ddlCount(db.queryLog) > 30, 'expected full migration to run on a brand-new empty DB');
    assert.deepEqual(db.kv.get(SCHEMA_VERSION_KEY), { v: String(SCHEMA_VERSION) }, 'schema version should be written after self-init migration');
});

test('ensureSchema is a no-op with no env.DB (fail-open, no throw)', async () => {
    __resetSchemaReadyForTest();
    await assert.doesNotReject(ensureSchema({}));
});

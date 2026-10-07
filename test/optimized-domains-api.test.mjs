import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { handleOptimizedDomains } from '../src/api/optimized-domains.js';
import { ensureSchema, __resetSchemaReadyForTest } from '../src/db/schema.js';
import { kvSet, OPTIMIZED_VPS789_FETCHED_AT_KEY, SCHEMA_VERSION_KEY } from '../src/db/kv.js';
import { createD1Sqlite } from './helpers/d1-sqlite.mjs';

let env;
const call = (method, path, body) => {
    const url = new URL(`https://proxy.test${path}`);
    const req = new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    return handleOptimizedDomains(req, env, { waitUntil() {} }, url).then(r => r.json());
};

beforeEach(async () => {
    __resetSchemaReadyForTest();
    env = { DB: createD1Sqlite() };
    await ensureSchema(env);
    await kvSet(env, OPTIMIZED_VPS789_FETCHED_AT_KEY, Date.now());
});

test('GET lists viewer entry colos from the last 24h, busiest first', async () => {
    env.DB.db.exec(`INSERT INTO visitor_logs (prefix, colo, timestamp) VALUES
        ('n1', 'KUL', datetime('now')), ('n1', 'SIN', datetime('now')), ('n1', 'SIN', datetime('now', '-2 hours')),
        ('n1', 'HKG', datetime('now', '-2 days')), ('n1', '', datetime('now'))`);
    const body = await call('GET', '/api/optimized-domains');
    assert.deepEqual(body.colos.map(r => ({ ...r })), [{ colo: 'SIN', n: 2 }, { colo: 'KUL', n: 1 }]);
});

test('POST speedtest saves browser results to last_ms and skips malformed items', async () => {
    const [a, b] = env.DB.db.prepare(`SELECT id FROM optimized_domains ORDER BY id LIMIT 2`).all().map(r => r.id);
    const body = await call('POST', '/api/optimized-domains/speedtest', { items: [{ id: a, ms: 42 }, { id: b, ms: -1 }, { id: 'x', ms: 5 }] });
    assert.deepEqual(body, { success: true, saved: 2 });
    const rows = env.DB.db.prepare(`SELECT id, last_ms FROM optimized_domains WHERE id IN (?, ?) ORDER BY id`).all(a, b).map(r => r.last_ms);
    assert.deepEqual(rows, [42, -1]);
});

test('ensureSchema strips the China carrier rank from old vps789 notes', async () => {
    env.DB.db.exec(`INSERT INTO optimized_domains (domain, note, builtin) VALUES ('old.example.com', 'vps789·综合排名3', 1), ('mine.example.com', 'vps789·综合排名3', 0)`);
    await kvSet(env, SCHEMA_VERSION_KEY, '6');
    __resetSchemaReadyForTest();
    await ensureSchema(env);
    const notes = env.DB.db.prepare(`SELECT domain, note FROM optimized_domains WHERE domain LIKE '%.example.com' ORDER BY domain`).all().map(r => r.note);
    assert.deepEqual(notes, ['vps789·综合排名3', 'vps789']);
});

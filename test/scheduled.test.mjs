/**
 * Tests for handleScheduled (src/scheduled.js) cron dispatch.
 *
 * Issue #12: probe cadence moved from 1min → 5min to stay under the D1
 * free-tier rows_written/day cap. These tests assert the dispatch table
 * matches the new cron strings — probeAll (the node-probing loop) fires on
 * '*\/5 * * * *' and does NOT fire on a bare '* * * * *' (removed cadence).
 *
 * Runner: node --test   (Node 22 built-in test runner, no extra deps)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleScheduled } from '../src/scheduled.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

// ---------------------------------------------------------------------------
// Mock D1 env — generic stub. probeAll's route SELECT is made to return an
// empty result set so probeAll exits right after its query (no network
// probing needed to prove *dispatch*). We track every prepared SQL string
// so tests can assert which queries were attempted.
// ---------------------------------------------------------------------------

function makeEnv() {
    const db = createD1Fake([]); // no handlers match → empty rows for every query
    return { env: { DB: db }, db };
}

function makeCtx() {
    const pending = [];
    return { ctx: { waitUntil(p) { pending.push(p); } }, pending };
}

// Unique to probeAll's route SELECT (src/probes/probe.js) — distinct from
// the daily-cron media-counts route SELECT, which also targets
// "routes WHERE monitor_enabled = 1" but with a different column list.
const PROBE_ALL_SQL_MARKER = 'show_on_status, media_counts_auto_auth, emby_auth_cache';

test('handleScheduled: "*/5 * * * *" dispatches probeAll (routes query fires)', async () => {
    const { env, db } = makeEnv();
    const { ctx, pending } = makeCtx();
    await handleScheduled({ cron: '*/5 * * * *' }, env, ctx);
    await Promise.all(pending);
    const preparedSql = db.log.map(l => l.sql);
    assert.ok(
        preparedSql.some(sql => sql.includes(PROBE_ALL_SQL_MARKER)),
        'probeAll route SELECT should have fired on the 5-min cron'
    );
});

test('handleScheduled: bare "* * * * *" (old cadence) does NOT dispatch probeAll', async () => {
    const { env, db } = makeEnv();
    const { ctx, pending } = makeCtx();
    await handleScheduled({ cron: '* * * * *' }, env, ctx);
    await Promise.all(pending);
    const preparedSql = db.log.map(l => l.sql);
    assert.ok(
        !preparedSql.some(sql => sql.includes(PROBE_ALL_SQL_MARKER)),
        'probeAll route SELECT must NOT fire on the removed per-minute cron'
    );
});

test('handleScheduled: "0 * * * *" still dispatches hourly keepalive path (no probeAll)', async () => {
    const { env, db } = makeEnv();
    const { ctx, pending } = makeCtx();
    // No TG creds → keepalive branch short-circuits without any DB touch,
    // but it must still route to the hourly branch, not probeAll.
    await handleScheduled({ cron: '0 * * * *' }, env, ctx);
    await Promise.all(pending);
    const preparedSql = db.log.map(l => l.sql);
    assert.ok(
        !preparedSql.some(sql => sql.includes(PROBE_ALL_SQL_MARKER)),
        'hourly cron must not run the probe loop'
    );
});

test('handleScheduled: "0 0 * * *" still dispatches daily branch (no probeAll)', async () => {
    const { env, db } = makeEnv();
    const { ctx, pending } = makeCtx();
    await handleScheduled({ cron: '0 0 * * *' }, env, ctx);
    await Promise.all(pending);
    const preparedSql = db.log.map(l => l.sql);
    assert.ok(
        !preparedSql.some(sql => sql.includes(PROBE_ALL_SQL_MARKER)),
        'daily cron must not run the probe loop'
    );
});

/**
 * Behavioral tests for runAlertFSM (src/probes/alerts.js).
 *
 * Covers the offline/recovered/none state machine, the recovered→fail
 * regression (alert_kind must reset to 'none', never linger as 'recovered'),
 * multi-node isolation, and Telegram side-effect gating.
 *
 * Runner: node --test   (Node 22 built-in test runner, no extra deps)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runAlertFSM } from '../src/probes/alerts.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

const THRESHOLD_S = 900;

// ---------------------------------------------------------------------------
// Mock D1 env
// ---------------------------------------------------------------------------

/**
 * Build a mock env.DB whose emby_probe_state SELECT returns `stateRows`.
 * The shared fake's `batches` array captures the statements handed to each
 * env.DB.batch() call (each exposing read-only .sql/.binds) so assertions
 * can inspect the upserts runAlertFSM issued.
 */
function makeDB(stateRows) {
    return createD1Fake([
        // The only SELECT in runAlertFSM is emby_probe_state.
        { test: /FROM emby_probe_state/i, exec: () => stateRows },
    ]);
}

/** Pull the captured upsert for a given prefix from the last batch. */
function upsertFor(db, prefix) {
    const last = db.batches[db.batches.length - 1] || [];
    return last.find(s => s.binds && s.binds[0] === prefix) || null;
}

/** Decode an upsert statement's bound args into named fields. */
function decode(stmt) {
    if (!stmt) return null;
    const [p, first_fail_at, last_alert_at, alert_kind] = stmt.binds;
    return { prefix: p, first_fail_at, last_alert_at, alert_kind };
}

function stubFetch(fn) {
    const orig = globalThis.fetch;
    globalThis.fetch = fn;
    return () => { globalThis.fetch = orig; };
}

const routes = [
    { prefix: 'a', public_alias: 'Node A', remark: '' },
    { prefix: 'b', public_alias: '', remark: 'Node B remark' },
];

// ---------------------------------------------------------------------------
// Case 1: first failure, under threshold → no alert, alert_kind = 'none'
// ---------------------------------------------------------------------------

test('first failure under 900s → no alert, state alert_kind = none, first_fail_at = now', async () => {
    const db = makeDB([]); // no prior state
    let fetchCalled = false;
    const restore = stubFetch(async () => { fetchCalled = true; return new Response('', { status: 200 }); });
    const now = 1_000_000;
    try {
        await runAlertFSM(
            { DB: db, TG_BOT_TOKEN: 'tok', TG_CHAT_ID: 'chat' },
            routes,
            [{ prefix: 'a', ok: false }],
            now
        );
    } finally {
        restore();
    }
    const st = decode(upsertFor(db, 'a'));
    assert.ok(st, 'should have written a state row for a');
    assert.equal(st.alert_kind, 'none');
    assert.equal(st.first_fail_at, now, 'first_fail_at seeded to now on first failure');
    assert.equal(fetchCalled, false, 'no Telegram send under threshold');
});

// ---------------------------------------------------------------------------
// Case 2: sustained failure ≥ 900s → offline alert, alert_kind = 'offline'
// ---------------------------------------------------------------------------

test('sustained failure ≥ 900s → offline alert + state alert_kind = offline', async () => {
    const now = 1_000_000;
    const firstFail = now - THRESHOLD_S; // exactly 900s ago
    const db = makeDB([{ prefix: 'a', first_fail_at: firstFail, last_alert_at: 0, alert_kind: 'none' }]);
    const sent = [];
    const restore = stubFetch(async (url, init) => {
        sent.push({ url, body: init && init.body });
        return new Response('', { status: 200 });
    });
    try {
        await runAlertFSM(
            { DB: db, TG_BOT_TOKEN: 'tok', TG_CHAT_ID: 'chat' },
            routes,
            [{ prefix: 'a', ok: false }],
            now
        );
    } finally {
        restore();
    }
    const st = decode(upsertFor(db, 'a'));
    assert.equal(st.alert_kind, 'offline');
    assert.equal(st.first_fail_at, firstFail, 'first_fail_at preserved across the offline transition');
    assert.equal(sent.length, 1, 'one Telegram offline alert sent');
    assert.ok(String(sent[0].body).includes('离线'), 'offline message body');
});

// ---------------------------------------------------------------------------
// Case 3: offline → recovery → recovered alert, first_fail_at cleared
// ---------------------------------------------------------------------------

test('recovery from offline → recovered alert + first_fail_at cleared', async () => {
    const now = 1_000_000;
    const firstFail = now - 600;
    const db = makeDB([{ prefix: 'a', first_fail_at: firstFail, last_alert_at: now - 100, alert_kind: 'offline' }]);
    const sent = [];
    const restore = stubFetch(async (url, init) => {
        sent.push({ url, body: init && init.body });
        return new Response('', { status: 200 });
    });
    try {
        await runAlertFSM(
            { DB: db, TG_BOT_TOKEN: 'tok', TG_CHAT_ID: 'chat' },
            routes,
            [{ prefix: 'a', ok: true }],
            now
        );
    } finally {
        restore();
    }
    const st = decode(upsertFor(db, 'a'));
    assert.equal(st.alert_kind, 'recovered');
    assert.equal(st.first_fail_at, 0, 'first_fail_at cleared on recovery');
    assert.equal(sent.length, 1, 'one Telegram recovered alert sent');
    assert.ok(String(sent[0].body).includes('恢复'), 'recovered message body');
});

// ---------------------------------------------------------------------------
// Case 4 (CORE REGRESSION): recovered → fail must reset alert_kind to 'none'
// ---------------------------------------------------------------------------

test('recovered then fails again → alert_kind resets to none (no lingering recovered)', async () => {
    const now = 1_000_000;
    // Prior state: node was recovered, first_fail_at cleared.
    const db = makeDB([{ prefix: 'a', first_fail_at: 0, last_alert_at: now - 1000, alert_kind: 'recovered' }]);
    let fetchCalled = false;
    const restore = stubFetch(async () => { fetchCalled = true; return new Response('', { status: 200 }); });
    try {
        await runAlertFSM(
            { DB: db, TG_BOT_TOKEN: 'tok', TG_CHAT_ID: 'chat' },
            routes,
            [{ prefix: 'a', ok: false }],
            now
        );
    } finally {
        restore();
    }
    const st = decode(upsertFor(db, 'a'));
    assert.ok(st, 'should write state for a new failure window');
    assert.equal(st.alert_kind, 'none', 'must NOT linger as recovered');
    assert.notEqual(st.alert_kind, 'recovered', 'regression guard: never stay recovered after a fresh failure');
    assert.equal(st.first_fail_at, now, 'new failure window opens at now');
    assert.equal(fetchCalled, false, 'fresh failure under threshold sends nothing');
});

test('recovered → fail → next-tick ≥900s later escalates to offline', async () => {
    // Follows on from case 4: now the new failure window is old enough.
    const firstFail = 1_000_000;
    const now = firstFail + THRESHOLD_S;
    const db = makeDB([{ prefix: 'a', first_fail_at: firstFail, last_alert_at: 0, alert_kind: 'none' }]);
    const sent = [];
    const restore = stubFetch(async (url, init) => { sent.push(init && init.body); return new Response('', { status: 200 }); });
    try {
        await runAlertFSM(
            { DB: db, TG_BOT_TOKEN: 'tok', TG_CHAT_ID: 'chat' },
            routes,
            [{ prefix: 'a', ok: false }],
            now
        );
    } finally {
        restore();
    }
    const st = decode(upsertFor(db, 'a'));
    assert.equal(st.alert_kind, 'offline', 'second outage escalates normally');
    assert.equal(sent.length, 1);
});

// ---------------------------------------------------------------------------
// Case 5: multiple nodes — independent state, no cross-talk
// ---------------------------------------------------------------------------

test('multiple nodes do not bleed state into each other', async () => {
    const now = 1_000_000;
    const db = makeDB([
        // a: long-standing offline
        { prefix: 'a', first_fail_at: now - 600, last_alert_at: now - 100, alert_kind: 'offline' },
        // b: previously recovered
        { prefix: 'b', first_fail_at: 0, last_alert_at: now - 5000, alert_kind: 'recovered' },
    ]);
    const sent = [];
    const restore = stubFetch(async (url, init) => { sent.push(init && init.body); return new Response('', { status: 200 }); });
    try {
        await runAlertFSM(
            { DB: db, TG_BOT_TOKEN: 'tok', TG_CHAT_ID: 'chat' },
            routes,
            [
                { prefix: 'a', ok: true },   // a recovers
                { prefix: 'b', ok: false },  // b fails fresh
            ],
            now
        );
    } finally {
        restore();
    }
    const sa = decode(upsertFor(db, 'a'));
    const sb = decode(upsertFor(db, 'b'));
    assert.equal(sa.alert_kind, 'recovered', 'a recovers');
    assert.equal(sa.first_fail_at, 0, 'a first_fail_at cleared');
    assert.equal(sb.alert_kind, 'none', 'b enters fresh failure window as none, not recovered');
    assert.equal(sb.first_fail_at, now, 'b first_fail_at seeded to now');
    // Only a (recovered) triggers a send; b is under threshold.
    assert.equal(sent.length, 1, 'only the recovery alert is sent');
    assert.ok(String(sent[0]).includes('恢复'));
});

// ---------------------------------------------------------------------------
// Telegram gating: tokens absent → no fetch, but state still computed
// ---------------------------------------------------------------------------

test('no TG_BOT_TOKEN / TG_CHAT_ID → fetch never called, state still written', async () => {
    const now = 1_000_000;
    const firstFail = now - THRESHOLD_S;
    const db = makeDB([{ prefix: 'a', first_fail_at: firstFail, last_alert_at: 0, alert_kind: 'none' }]);
    let fetchCalled = false;
    const restore = stubFetch(async () => { fetchCalled = true; return new Response('', { status: 200 }); });
    try {
        await runAlertFSM(
            { DB: db }, // no TG_* env
            routes,
            [{ prefix: 'a', ok: false }],
            now
        );
    } finally {
        restore();
    }
    const st = decode(upsertFor(db, 'a'));
    assert.equal(st.alert_kind, 'offline', 'offline transition still recorded without TG creds');
    assert.equal(fetchCalled, false, 'no fetch when TG creds missing');
});

// ---------------------------------------------------------------------------
// Healthy node with clean prior state → no write, no send
// ---------------------------------------------------------------------------

test('healthy node with no prior failure → no upsert, no send', async () => {
    const now = 1_000_000;
    const db = makeDB([{ prefix: 'a', first_fail_at: 0, last_alert_at: 0, alert_kind: 'none' }]);
    let fetchCalled = false;
    const restore = stubFetch(async () => { fetchCalled = true; return new Response('', { status: 200 }); });
    try {
        await runAlertFSM(
            { DB: db, TG_BOT_TOKEN: 'tok', TG_CHAT_ID: 'chat' },
            routes,
            [{ prefix: 'a', ok: true }],
            now
        );
    } finally {
        restore();
    }
    assert.equal(upsertFor(db, 'a'), null, 'clean healthy node writes no state');
    assert.equal(fetchCalled, false);
});

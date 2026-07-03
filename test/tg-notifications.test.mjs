import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    renderDailyStatsPayload,
    renderKeepaliveReminderPayload,
    renderProbeAlertPayload,
    renderTgTestPayload,
    notify,
} from '../src/tg/notifications.js';
import { createD1Fake } from './helpers/d1-fake.mjs';

// ---------------------------------------------------------------------------
// Test helpers for notify()
// ---------------------------------------------------------------------------

function stubFetch(fn) {
    const orig = globalThis.fetch;
    globalThis.fetch = fn;
    return () => { globalThis.fetch = orig; };
}

/** Mock env.DB backing kv_config, used by notify()'s mute-window check. */
function makeKvEnv({ mutedUntil, ...rest } = {}) {
    const row = mutedUntil === undefined ? null : { v: String(mutedUntil) };
    return {
        TG_BOT_TOKEN: 'tok',
        TG_CHAT_ID: 'chat',
        DB: createD1Fake([{ test: /.*/, exec: () => (row ? [row] : []) }]),
        ...rest,
    };
}

test('renderProbeAlertPayload: single offline alert includes node keyboard', () => {
    const payload = renderProbeAlertPayload('chat', [
        { kind: 'offline', name: 'Node <A>', duration: 300, prefix: 'a' },
    ], 1_000_000);

    assert.equal(payload.chat_id, 'chat');
    assert.equal(payload.parse_mode, 'HTML');
    assert.ok(payload.text.includes('节点告警'));
    assert.ok(payload.text.includes('Node &lt;A&gt;'));
    assert.ok(payload.text.includes('持续 5m0s'));
    assert.equal(payload.reply_markup.inline_keyboard[0][0].callback_data, 'n:v:a');
});

test('renderProbeAlertPayload: merged alert uses status keyboard', () => {
    const payload = renderProbeAlertPayload('chat', [
        { kind: 'offline', name: 'Node A', duration: 600, prefix: 'a' },
        { kind: 'recovered', name: 'Node B', duration: 7200, prefix: 'b' },
    ], 1_000_000);

    assert.ok(payload.text.includes('离线 (1)'));
    assert.ok(payload.text.includes('已恢复 (1)'));
    assert.ok(payload.text.includes('共 2 条事件：离线 1 / 恢复 1'));
    assert.equal(payload.reply_markup.inline_keyboard[0][0].callback_data, 's:r');
});

test('renderKeepaliveReminderPayload: sorts overdue before imminent and escapes names', () => {
    const payload = renderKeepaliveReminderPayload('chat', [
        { route: { prefix: 'soon', public_alias: 'Soon', remark: '' }, remaining: 3600 },
        { route: { prefix: 'late', public_alias: 'Late & Loud', remark: '' }, remaining: -4 * 86400 },
    ], 1_000_000);

    const lateIndex = payload.text.indexOf('Late &amp; Loud');
    const soonIndex = payload.text.indexOf('Soon');
    assert.ok(lateIndex > -1);
    assert.ok(soonIndex > -1);
    assert.ok(lateIndex < soonIndex);
    assert.ok(payload.text.includes('已超期 4 天'));
    assert.equal(payload.reply_markup.inline_keyboard[0][0].callback_data, 'k:r');
});

test('renderDailyStatsPayload: preserves visible stats sections and send shape', () => {
    const payload = renderDailyStatsPayload('chat', {
        totalStr: '1,234',
        regionStr: 'CN (10 次)',
        nodeStr: 'Node A (9 次)',
        trafficToday: '1 GB',
        traffic7d: '7 GB',
        traffic30d: '30 GB',
        topNodeMsg: 'Node A 跑了 1 GB',
        timestamp: '2026-01-01 12:00:00',
    });

    assert.equal(payload.disable_web_page_preview, true);
    assert.ok(payload.text.includes('今日反代播放数据'));
    assert.ok(payload.text.includes('今日总播放次数:</b> 1,234 次'));
    assert.ok(payload.text.includes('今日流量之王'));
    assert.equal(payload.reply_markup.inline_keyboard[0][0].callback_data, 's:r');
});

test('renderTgTestPayload: renders Beijing timestamp via shared clock utils', () => {
    const payload = renderTgTestPayload('chat', 1_700_000_000);
    assert.equal(payload.chat_id, 'chat');
    assert.ok(payload.text.includes('telegram test ok'));
    assert.ok(payload.text.includes('(UTC+8)'));
});

// ---------------------------------------------------------------------------
// notify() — the single outbound-admin-notification entry point
// ---------------------------------------------------------------------------

const NOW = 1_000_000;

test('notify: probe-alert sends when not muted', async () => {
    const env = makeKvEnv({ mutedUntil: undefined });
    let called = false;
    const restore = stubFetch(async () => { called = true; return new Response(JSON.stringify({ ok: true }), { status: 200 }); });
    try {
        const result = await notify(env, 'probe-alert', {
            sends: [{ kind: 'offline', name: 'Node A', duration: 300, prefix: 'a' }],
        }, NOW);
        assert.equal(called, true);
        assert.equal(result.ok, true);
    } finally {
        restore();
    }
});

test('notify: probe-alert suppressed during mute window', async () => {
    const env = makeKvEnv({ mutedUntil: NOW + 3600 });
    let called = false;
    const restore = stubFetch(async () => { called = true; return new Response(JSON.stringify({ ok: true }), { status: 200 }); });
    try {
        const result = await notify(env, 'probe-alert', {
            sends: [{ kind: 'offline', name: 'Node A', duration: 300, prefix: 'a' }],
        }, NOW);
        assert.equal(called, false, 'muted → no Telegram send');
        assert.equal(result.ok, false);
        assert.equal(result.muted, true);
    } finally {
        restore();
    }
});

test('notify: keepalive-reminder suppressed during mute window', async () => {
    const env = makeKvEnv({ mutedUntil: NOW + 3600 });
    let called = false;
    const restore = stubFetch(async () => { called = true; return new Response(JSON.stringify({ ok: true }), { status: 200 }); });
    try {
        const result = await notify(env, 'keepalive-reminder', {
            toRemind: [{ route: { prefix: 'a', public_alias: 'Node A', remark: '' }, remaining: -86400 }],
        }, NOW);
        assert.equal(called, false, 'muted → no Telegram send');
        assert.equal(result.muted, true);
    } finally {
        restore();
    }
});

test('notify: keepalive-reminder sends when not muted', async () => {
    const env = makeKvEnv({ mutedUntil: undefined });
    let called = false;
    const restore = stubFetch(async () => { called = true; return new Response(JSON.stringify({ ok: true }), { status: 200 }); });
    try {
        const result = await notify(env, 'keepalive-reminder', {
            toRemind: [{ route: { prefix: 'a', public_alias: 'Node A', remark: '' }, remaining: -86400 }],
        }, NOW);
        assert.equal(called, true);
        assert.equal(result.ok, true);
    } finally {
        restore();
    }
});

test('notify: daily-stats ignores the mute window (it is a scheduled digest, not an alert)', async () => {
    const env = makeKvEnv({ mutedUntil: NOW + 3600 });
    let called = false;
    const restore = stubFetch(async () => { called = true; return new Response(JSON.stringify({ ok: true }), { status: 200 }); });
    try {
        const result = await notify(env, 'daily-stats', {
            stats: {
                totalStr: '1', regionStr: 'CN', nodeStr: 'A',
                trafficToday: '1B', traffic7d: '1B', traffic30d: '1B',
                topNodeMsg: 'A', timestamp: '2026-01-01 00:00:00',
            },
        }, NOW);
        assert.equal(called, true, 'daily stats digest is not gated by the alert mute window');
        assert.equal(result.ok, true);
    } finally {
        restore();
    }
});

test('notify: tg-test ignores the mute window (explicit connectivity check)', async () => {
    const env = makeKvEnv({ mutedUntil: NOW + 3600 });
    let called = false;
    const restore = stubFetch(async () => { called = true; return new Response(JSON.stringify({ ok: true }), { status: 200 }); });
    try {
        const result = await notify(env, 'tg-test', {}, NOW);
        assert.equal(called, true, 'tg-test must always attempt a send so the button proves connectivity');
        assert.equal(result.ok, true);
    } finally {
        restore();
    }
});

test('notify: no TG_BOT_TOKEN/TG_CHAT_ID → no fetch, skipped result', async () => {
    const env = { DB: makeKvEnv().DB }; // no TG_* creds
    let called = false;
    const restore = stubFetch(async () => { called = true; return new Response('{}', { status: 200 }); });
    try {
        const result = await notify(env, 'tg-test', {}, NOW);
        assert.equal(called, false);
        assert.equal(result.ok, false);
        assert.equal(result.skipped, 'no-config');
    } finally {
        restore();
    }
});

test('notify: unknown kind throws', async () => {
    const env = makeKvEnv();
    await assert.rejects(() => notify(env, 'not-a-real-kind', {}, NOW), /unknown notification kind/);
});

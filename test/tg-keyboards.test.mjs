import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    kbStatus, kbKeepalive, kbNode, kbAlert,
    kbKeepaliveAlert, kbMuteHelp, kbNodeCandidates,
} from '../src/tg/keyboards.js';
import { isAllowedCallbackData } from '../src/tg/callbacks.js';

function allButtons(kb) {
    return (kb?.inline_keyboard || []).flat();
}

function assertCallbackBudget(kb, label) {
    for (const btn of allButtons(kb)) {
        if (!btn.callback_data) continue;
        const bytes = new TextEncoder().encode(btn.callback_data).length;
        assert.ok(bytes <= 64, `${label}: "${btn.callback_data}" exceeds 64B (${bytes})`);
    }
}

function assertAllAllowlisted(kb, label) {
    for (const btn of allButtons(kb)) {
        if (!btn.callback_data) continue;
        assert.ok(
            isAllowedCallbackData(btn.callback_data),
            `${label}: "${btn.callback_data}" not in allowlist`,
        );
    }
}

test('kbStatus: shape, length, allowlist', () => {
    const kb = kbStatus();
    assert.ok(Array.isArray(kb.inline_keyboard));
    assertCallbackBudget(kb, 'kbStatus');
    assertAllAllowlisted(kb, 'kbStatus');
});

test('kbKeepalive', () => {
    const kb = kbKeepalive();
    assertCallbackBudget(kb, 'kbKeepalive');
    assertAllAllowlisted(kb, 'kbKeepalive');
});

test('kbNode: embeds prefix in callback_data', () => {
    const kb = kbNode('emby1');
    const buttons = allButtons(kb);
    const refresh = buttons.find(b => b.callback_data?.startsWith('n:r:'));
    assert.equal(refresh?.callback_data, 'n:r:emby1');
    assertCallbackBudget(kb, 'kbNode');
    assertAllAllowlisted(kb, 'kbNode');
});

test('kbAlert: prefix-aware', () => {
    const kb = kbAlert('emby1');
    assertCallbackBudget(kb, 'kbAlert');
    assertAllAllowlisted(kb, 'kbAlert');
});

test('kbKeepaliveAlert', () => {
    const kb = kbKeepaliveAlert();
    assertCallbackBudget(kb, 'kbKeepaliveAlert');
    assertAllAllowlisted(kb, 'kbKeepaliveAlert');
});

test('kbMuteHelp: 30/120/1440', () => {
    const kb = kbMuteHelp();
    const datas = allButtons(kb).map(b => b.callback_data).filter(Boolean);
    assert.ok(datas.includes('m:30'));
    assert.ok(datas.includes('m:120'));
    assert.ok(datas.includes('m:1440'));
    assertAllAllowlisted(kb, 'kbMuteHelp');
});

test('kbNodeCandidates: max 8 + valid callback_data', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
        prefix: `node${i}`, remark: 'x', public_alias: null,
    }));
    const kb = kbNodeCandidates(rows);
    const buttons = allButtons(kb);
    assert.ok(buttons.length <= 8, `got ${buttons.length} buttons`);
    assertCallbackBudget(kb, 'kbNodeCandidates');
    assertAllAllowlisted(kb, 'kbNodeCandidates');
});

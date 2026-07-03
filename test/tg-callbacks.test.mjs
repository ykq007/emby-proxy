import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    parseCallbackData,
    encodeCallbackData,
    isAllowedCallback,
    isAllowedCallbackData,
    CB,
    MOD,
    ACT,
} from '../src/tg/callbacks.js';

test('parseCallbackData: valid shapes', () => {
    assert.deepEqual(parseCallbackData('s:r'), { module: 's', action: 'r', params: [] });
    assert.deepEqual(parseCallbackData('n:v:emby1'), { module: 'n', action: 'v', params: ['emby1'] });
    assert.deepEqual(parseCallbackData('m:30'), { module: 'm', action: '30', params: [] });
});

test('parseCallbackData: rejects garbage', () => {
    assert.equal(parseCallbackData(''), null);
    assert.equal(parseCallbackData(null), null);
    assert.equal(parseCallbackData('justone'), null);
    assert.equal(parseCallbackData(':r'), null);
    assert.equal(parseCallbackData('s:'), null);
});

test('encodeCallbackData: assembles and length-checks', () => {
    assert.equal(encodeCallbackData('s', 'r'), 's:r');
    assert.equal(encodeCallbackData('n', 'v', 'emby1'), 'n:v:emby1');
    // 64-byte cap
    const long = 'x'.repeat(80);
    assert.equal(encodeCallbackData('n', 'v', long), null);
});

test('isAllowedCallback: whitelist', () => {
    assert.equal(isAllowedCallback(parseCallbackData('s:r')), true);
    assert.equal(isAllowedCallback(parseCallbackData('k:r')), true);
    assert.equal(isAllowedCallback(parseCallbackData('l:r')), true);
    assert.equal(isAllowedCallback(parseCallbackData('n:v:emby1')), true);
    assert.equal(isAllowedCallback(parseCallbackData('n:r:emby_1')), true);
    assert.equal(isAllowedCallback(parseCallbackData('m:30')), true);
    assert.equal(isAllowedCallback(parseCallbackData('m:120')), true);
    assert.equal(isAllowedCallback(parseCallbackData('m:1440')), true);
    assert.equal(isAllowedCallback(parseCallbackData('m:u')), true);
});

test('isAllowedCallback: rejects unknown / malformed', () => {
    assert.equal(isAllowedCallback(parseCallbackData('x:r')), false);
    assert.equal(isAllowedCallback(parseCallbackData('s:x')), false);
    assert.equal(isAllowedCallback(parseCallbackData('n:r')), false);
    assert.equal(isAllowedCallback(parseCallbackData('n:v:bad prefix')), false);
    assert.equal(isAllowedCallback(parseCallbackData('n:v:has/slash')), false);
    assert.equal(isAllowedCallback(parseCallbackData('m:99')), false);
    assert.equal(isAllowedCallback(parseCallbackData('m:r')), false);
    assert.equal(isAllowedCallback(null), false);
});

test('isAllowedCallbackData: end-to-end', () => {
    assert.equal(isAllowedCallbackData('s:r'), true);
    assert.equal(isAllowedCallbackData('x:y:z'), false);
});

test('CB / MOD / ACT constants match documented strings', () => {
    assert.equal(CB.STATUS_REFRESH, 's:r');
    assert.equal(CB.MUTE_30M, 'm:30');
    assert.equal(CB.UNMUTE, 'm:u');
    assert.equal(MOD.MUTE, 'm');
    assert.equal(ACT.REFRESH, 'r');
});

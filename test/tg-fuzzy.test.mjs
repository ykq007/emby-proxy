import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyMatchNodes } from '../src/tg/fuzzy.js';

const ROUTES = [
    { prefix: 'emby1',   remark: '香港主线', public_alias: 'HK01' },
    { prefix: 'emby2',   remark: '日本备用', public_alias: 'JP01' },
    { prefix: 'embyhk',  remark: '港岛备用', public_alias: null },
    { prefix: 'us1',     remark: '洛杉矶',   public_alias: 'LA' },
    { prefix: 'us2',     remark: '纽约',     public_alias: 'NY' },
];

test('empty query returns []', () => {
    assert.deepEqual(fuzzyMatchNodes('', ROUTES), []);
    assert.deepEqual(fuzzyMatchNodes(null, ROUTES), []);
});

test('exact prefix wins over startsWith', () => {
    const out = fuzzyMatchNodes('emby1', ROUTES);
    assert.equal(out[0].prefix, 'emby1');
});

test('prefix startsWith match', () => {
    const out = fuzzyMatchNodes('emb', ROUTES);
    const prefixes = out.map(r => r.prefix);
    assert.ok(prefixes.includes('emby1'));
    assert.ok(prefixes.includes('emby2'));
    assert.ok(prefixes.includes('embyhk'));
});

test('case-insensitive', () => {
    const out = fuzzyMatchNodes('HK01', ROUTES);
    assert.equal(out[0].prefix, 'emby1');
    const out2 = fuzzyMatchNodes('hk01', ROUTES);
    assert.equal(out2[0].prefix, 'emby1');
});

test('alias / remark substring match', () => {
    const out = fuzzyMatchNodes('洛杉矶', ROUTES);
    assert.equal(out[0].prefix, 'us1');
});

test('no match returns []', () => {
    assert.deepEqual(fuzzyMatchNodes('zzznope', ROUTES), []);
});

test('caps at 8 candidates', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
        prefix: `node${i}`, remark: 'x', public_alias: null,
    }));
    const out = fuzzyMatchNodes('node', many);
    assert.ok(out.length <= 8);
});

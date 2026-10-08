import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formFromPlacement, placementBody, placementLabel } from '../src/ui/console/pages/tools-placement.js';
import { isFull, matrixColumns, quotaRoom, usedByNode } from '../src/ui/console/pages/viewers-model.js';

test('formFromPlacement reads the live placement into the picker', () => {
    assert.deepEqual(formFromPlacement({ mode: 'smart' }), { mode: 'smart', region: '', custom: '' });
    assert.deepEqual(formFromPlacement({ mode: 'off' }), { mode: 'off', region: '', custom: '' });
    assert.deepEqual(formFromPlacement(undefined), { mode: 'off', region: '', custom: '' });
    assert.deepEqual(formFromPlacement({ region: 'gcp:asia-east2' }), { mode: 'gcp', region: 'gcp:asia-east2', custom: '' });
    assert.deepEqual(formFromPlacement({ region: 'aws:sa-east-1' }), { mode: 'custom', region: '', custom: 'aws:sa-east-1' });
});

test('placementBody builds the POST body or an error', () => {
    assert.deepEqual(placementBody({ mode: 'smart', region: '', custom: '' }), { placement: { mode: 'smart' } });
    assert.deepEqual(placementBody({ mode: 'off', region: '', custom: '' }), { placement: { mode: 'off' } });
    assert.deepEqual(placementBody({ mode: 'azure', region: 'azure:uksouth', custom: '' }), { placement: { region: 'azure:uksouth' } });
    assert.deepEqual(placementBody({ mode: 'aws', region: '', custom: '' }), { placement: { region: 'aws:ap-east-1' } });
    assert.deepEqual(placementBody({ mode: 'custom', region: '', custom: '  gcp:us-west1 ' }), { placement: { region: 'gcp:us-west1' } });
    assert.equal(placementBody({ mode: 'custom', region: '', custom: ' ' }).error, '请填写区域代码，例如 gcp:asia-east2');
});

test('placementLabel names the current setting', () => {
    assert.equal(placementLabel({ mode: 'gcp', region: 'gcp:asia-east2', custom: '' }), '中国香港');
    assert.equal(placementLabel({ mode: 'custom', region: '', custom: 'aws:sa-east-1' }), 'aws:sa-east-1');
    assert.equal(placementLabel({ mode: 'smart', region: '', custom: '' }), '智能调度');
});

const nodes = [
    { prefix: 'hk', max_concurrent: 3, viewers_enabled: 1 },
    { prefix: 'jp', max_concurrent: 0, viewers_enabled: 1 },
    { prefix: 'us', max_concurrent: 2, viewers_enabled: 0 },
    { prefix: 'sg', max_concurrent: 0, viewers_enabled: 0 },
];
const viewers = [
    { id: 'a', access: [{ prefix: 'hk', quota: 2 }, { prefix: 'us', quota: 1 }] },
    { id: 'b', access: [{ prefix: 'hk', quota: 1 }, { prefix: 'jp', quota: 0 }] },
];

test('usedByNode sums quotas per node', () => {
    assert.deepEqual(usedByNode(viewers), { hk: 3, us: 1, jp: 0 });
});

test('matrixColumns keeps enabled nodes and disabled nodes that still have grants', () => {
    assert.deepEqual(matrixColumns(nodes, viewers).map(n => n.prefix), ['hk', 'jp', 'us']);
});

test('quotaRoom and isFull respect the node cap', () => {
    const used = usedByNode(viewers);
    assert.equal(quotaRoom(nodes[0], used, 2), 2);
    assert.equal(quotaRoom(nodes[0], used, 0), 0);
    assert.equal(quotaRoom(nodes[1], used, 0), 0);
    assert.equal(isFull(nodes[0], used), true);
    assert.equal(isFull(nodes[1], used), false);
    assert.equal(isFull(nodes[2], used), false);
});

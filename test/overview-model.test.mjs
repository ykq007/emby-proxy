import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    editPayload, healthStats, healthVerdict, keepaliveView, moveBefore, nodeStatus, pingView,
    probeBars, slaGrade, sortNodes, sparkPoints,
} from '../src/ui/console/pages/overview-model.js';

const NOW = Date.parse('2026-06-05T22:30:00+08:00');

test('nodeStatus: no card is unmonitored, offline beats playback, a recent play is live', () => {
    const playing = { last_play: '2026-06-05 22:21:22' };
    const stale = { last_play: '2026-06-05 10:00:00' };
    assert.equal(nodeStatus(playing, null, NOW), 'off');
    assert.equal(nodeStatus(playing, { ok: false, latest_ts: 0 }, NOW), 'wait');
    assert.equal(nodeStatus(playing, { ok: false, latest_ts: 1 }, NOW), 'down');
    assert.equal(nodeStatus(playing, { ok: true, latest_ts: 1 }, NOW), 'live');
    assert.equal(nodeStatus(stale, { ok: true, latest_ts: 1 }, NOW), 'up');
    assert.equal(nodeStatus({ last_play: '' }, { ok: true, latest_ts: 1 }, NOW), 'up');
});

const node = (prefix, status, remark = '') => ({ route: { prefix, remark }, status });

test('sortNodes puts offline nodes first and keeps saved order otherwise', () => {
    const list = [node('a', 'up'), node('b', 'down'), node('c', 'off'), node('d', 'down')];
    assert.deepEqual(sortNodes(list).map(n => n.route.prefix), ['b', 'd', 'a', 'c']);
});

test('healthVerdict names offline nodes and picks the level by the online share', () => {
    assert.deepEqual(healthVerdict(healthStats([])), { text: '尚无反代节点', level: 'off' });
    assert.deepEqual(healthVerdict(healthStats([node('a', 'off')])), { text: '监控未开启', level: 'off' });
    assert.deepEqual(healthVerdict(healthStats([node('a', 'up'), node('b', 'live')])), { text: '全部节点在线', level: 'ok' });
    const some = [node('a', 'up'), node('b', 'down', '香港'), node('c', 'up')];
    assert.deepEqual(healthStats(some), { total: 3, monitored: 3, online: 2, down: ['香港'] });
    assert.deepEqual(healthVerdict(healthStats(some)), { text: '1 个节点离线：香港', level: 'warn' });
    const most = ['a', 'b', 'c', 'd'].map(p => node(p, 'down')).concat(node('e', 'up'));
    assert.deepEqual(healthVerdict(healthStats(most)), { text: '4 个节点离线：a、b、c 等', level: 'err' });
});

test('probeBars keeps the last n probes, marks slow and failed ones, pads the left', () => {
    assert.deepEqual(probeBars([{ ok: 1, ms: 80 }, { ok: 1, ms: 900 }, { ok: 0, ms: 0 }], 5), ['n', 'n', '', 's', 'f']);
    assert.deepEqual(probeBars(Array(30).fill({ ok: 0, ms: 0 }), 3), ['f', 'f', 'f']);
    assert.deepEqual(probeBars(undefined, 2), ['n', 'n']);
});

test('pingView maps ping results to text and tone', () => {
    assert.deepEqual(pingView(undefined), { text: '测速中', cls: 'off' });
    assert.deepEqual(pingView(-1), { text: '断连', cls: 'err' });
    assert.deepEqual(pingView('err'), { text: '异常', cls: 'err' });
    assert.deepEqual(pingView(120), { text: '120 ms', cls: 'ok' });
    assert.deepEqual(pingView(800), { text: '800 ms', cls: 'warn' });
});

test('slaGrade and keepaliveView', () => {
    assert.equal(slaGrade(0.9995), 'A');
    assert.equal(slaGrade(0.995), 'B');
    assert.equal(slaGrade(0.9), 'C');
    assert.equal(slaGrade(null), '');
    const now = 1_000_000;
    assert.equal(keepaliveView(0, 0, now), null);
    assert.deepEqual(keepaliveView(7, 0, now), { text: '7 天 · 未播放', warn: false });
    assert.deepEqual(keepaliveView(7, now - 8 * 86400, now), { text: '7 天 · 已超期', warn: true });
    assert.deepEqual(keepaliveView(7, now - 7 * 86400 + 7200, now), { text: '7 天 · 余 2h', warn: true });
    assert.deepEqual(keepaliveView(7, now - 2 * 86400, now), { text: '7 天 · 余 5d', warn: false });
});

test('moveBefore inserts before the new neighbour, or at the end', () => {
    assert.deepEqual(moveBefore(['a', 'b', 'c', 'd'], 'd', 'b'), ['a', 'd', 'b', 'c']);
    assert.deepEqual(moveBefore(['a', 'b', 'c', 'd'], 'a', undefined), ['b', 'c', 'd', 'a']);
    assert.deepEqual(moveBefore(['a', 'b', 'c'], 'b', 'b'), ['a', 'c', 'b']);
});

test('editPayload keeps fields the inline form does not show', () => {
    const route = { prefix: 'hk', icon: 'i.png', emby_username: 'u', mode: 'dual' };
    assert.deepEqual(editPayload(route, {
        prefix: '/hk2 ', targets: 'http://a:8096/\nhttp://b:8096, http://c', mode: 'strict',
        remark: ' HK ', group: '', headers: 'X: 1', keepalive: '30', cache: false,
    }), {
        oldPrefix: 'hk', prefix: 'hk2', target: 'http://a:8096,http://b:8096,http://c', mode: 'strict',
        remark: 'HK', group_name: '', icon: 'i.png', cache_img: 'off', custom_headers: 'X: 1',
        keepalive_days: 30, emby_username: 'u', emby_password: '',
    });
});

test('sparkPoints scales values into the box and needs two points', () => {
    assert.equal(sparkPoints([5], 10, 10), '');
    assert.equal(sparkPoints([0, 10, 5], 10, 10), '0.0,8.0 5.0,2.0 10.0,5.0');
});

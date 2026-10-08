import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupLocations, lastDays, parseTraffic, percent, sortByTime, topByTraffic } from '../src/ui/console/pages/stats-format.js';

test('parseTraffic reads formatBytes strings and rejects server messages', () => {
    assert.deepEqual(parseTraffic('1.50 GB'), { value: '1.50', unit: 'GB', bytes: 1610612736 });
    assert.deepEqual(parseTraffic('512 B'), { value: '512', unit: 'B', bytes: 512 });
    assert.deepEqual(parseTraffic('0 B'), { value: '0', unit: 'B', bytes: 0 });
    assert.equal(parseTraffic('2.00 TB').bytes, 2199023255552);
    assert.equal(parseTraffic('未配置'), null);
    assert.equal(parseTraffic('获取异常'), null);
    assert.equal(parseTraffic('API报错: 1.5 GB quota'), null);
    assert.equal(parseTraffic(undefined), null);
});

test('topByTraffic ranks routes by today traffic, drops zero and unknown, falls back to prefix', () => {
    const routes = [
        { prefix: 'a', remark: 'Alpha', todayBandwidth: '900.00 MB' },
        { prefix: 'b', remark: '', todayBandwidth: '1.20 GB' },
        { prefix: 'c', remark: 'C', todayBandwidth: '0 B' },
        { prefix: 'd', remark: 'D', todayBandwidth: '获取异常' },
        { prefix: 'e', remark: 'E' },
        { prefix: 'f', remark: 'F', todayBandwidth: '10.00 KB' },
    ];
    assert.deepEqual(topByTraffic(routes, 2).map(r => [r.prefix, r.name, r.traffic]),
        [['b', 'b', '1.20 GB'], ['a', 'Alpha', '900.00 MB']]);
    assert.equal(topByTraffic(routes).length, 3);
});

test('lastDays fills 7 Beijing dates ending today with zeros for missing days', () => {
    const now = Date.parse('2026-10-08T17:00:00Z'); // 01:00 on 10-09 in Beijing
    assert.deepEqual(lastDays([{ date: '2026-10-09', count: 4 }, { date: '2026-10-05', count: 2 }, { date: '2026-10-01', count: 9 }], now), [
        { date: '2026-10-03', count: 0 },
        { date: '2026-10-04', count: 0 },
        { date: '2026-10-05', count: 2 },
        { date: '2026-10-06', count: 0 },
        { date: '2026-10-07', count: 0 },
        { date: '2026-10-08', count: 0 },
        { date: '2026-10-09', count: 4 },
    ]);
});

test('groupLocations labels CN and empty codes and folds the tail into 其他', () => {
    const locs = [['CN', 50], ['US', 20], ['JP', 9], ['', 8], ['HK', 5], ['SG', 3], ['DE', 1]].map(([country, count]) => ({ country, count }));
    assert.deepEqual(groupLocations(locs), [
        { label: '中国大陆', count: 50 }, { label: 'US', count: 20 }, { label: 'JP', count: 9 },
        { label: '未知', count: 8 }, { label: 'HK', count: 5 }, { label: '其他', count: 4 },
    ]);
    assert.equal(groupLocations(locs.slice(0, 6)).at(-1).label, 'SG');
});

test('percent keeps one decimal under 10% and handles a zero total', () => {
    assert.equal(percent(1, 3), '33%');
    assert.equal(percent(1, 40), '2.5%');
    assert.equal(percent(0, 0), '0.0%');
});

test('sortByTime orders by timestamp both ways without mutating', () => {
    const rows = [{ timestamp: '2026-10-08 09:00:00' }, { timestamp: '2026-10-08 21:00:00' }, { timestamp: '2026-10-07 23:59:59' }];
    assert.deepEqual(sortByTime(rows).map(r => r.timestamp.slice(5)), ['10-08 21:00:00', '10-08 09:00:00', '10-07 23:59:59']);
    assert.deepEqual(sortByTime(rows, 'asc').map(r => r.timestamp.slice(5)), ['10-07 23:59:59', '10-08 09:00:00', '10-08 21:00:00']);
    assert.equal(rows[0].timestamp, '2026-10-08 09:00:00');
});

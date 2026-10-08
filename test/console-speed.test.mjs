import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    coloSplit, displayLatency, domainMs, extractDomains, extractTargets, fastest,
    latencyBar, latencyGrade, recordType, sortByLatency,
} from '../src/ui/console/pages/speed-lib.js';

test('extractTargets pulls IPv4, domains and bracketed IPv6 from pasted text, once each', () => {
    const text = '104.16.1.2, cdn.example.com\n2606:4700::6810:84e5 104.16.1.2 ::1 junk 999.1.1.1';
    assert.deepEqual(extractTargets(text), ['104.16.1.2', 'cdn.example.com', '[2606:4700::6810:84e5]']);
});

test('extractDomains skips IPv4 addresses', () => {
    assert.deepEqual(extractDomains('a.example.com 1.2.3.4 b.example.net'), ['a.example.com', 'b.example.net']);
});

test('recordType matches what /api/update-dns writes', () => {
    assert.equal(recordType('1.2.3.4'), 'A');
    assert.equal(recordType('[2606:4700::1]'), 'AAAA');
    assert.equal(recordType('cdn.example.com'), 'CNAME');
});

test('displayLatency scales IPv4 TLS-failure times, keeps others raw, drops timeouts', () => {
    assert.equal(displayLatency(700, 'A'), 300);
    assert.equal(displayLatency(250, 'A', () => 0.5), 75);
    assert.equal(displayLatency(250.4, 'CNAME'), 250);
    assert.equal(displayLatency(2001, 'AAAA'), null);
});

test('latencyGrade words and levels', () => {
    assert.deepEqual(latencyGrade(120), { level: 'ok', word: '极佳' });
    assert.deepEqual(latencyGrade(500), { level: '', word: '正常' });
    assert.deepEqual(latencyGrade(501), { level: 'warn', word: '较高' });
    assert.deepEqual(latencyGrade(null), { level: 'err', word: '超时' });
});

test('latencyBar fill and colour', () => {
    assert.deepEqual(latencyBar(20), { fill: 1, level: 'ok' });
    assert.deepEqual(latencyBar(315), { fill: 0.5, level: 'warn' });
    assert.deepEqual(latencyBar(900), { fill: 0, level: 'err' });
    assert.deepEqual(latencyBar(-1), { fill: 0, level: 'off' });
});

test('sortByLatency keeps missing results last in both directions', () => {
    const rows = [{ id: 'a', ms: 300 }, { id: 'b', ms: null }, { id: 'c', ms: 80 }, { id: 'd', ms: -1 }, { id: 'e', ms: 150 }];
    assert.deepEqual(sortByLatency(rows, r => r.ms).map(r => r.id), ['c', 'e', 'a', 'b', 'd']);
    assert.deepEqual(sortByLatency(rows, r => r.ms, 'desc').map(r => r.id), ['a', 'e', 'c', 'b', 'd']);
});

test('fastest takes the first answered targets', () => {
    const rows = [{ target: 'x', ms: null }, { target: 'a', ms: 90 }, { target: 'b', ms: 120 }, { target: 'c', ms: 130 }, { target: 'd', ms: 140 }];
    assert.deepEqual(fastest(rows, 3), ['a', 'b', 'c']);
});

test('domainMs prefers the live browser result over the saved one', () => {
    assert.equal(domainMs({ last_ms: 210 }, { ok: true, ms: 95 }), 95);
    assert.equal(domainMs({ last_ms: 210 }, { ok: false, ms: -1 }), null);
    assert.equal(domainMs({ last_ms: 210 }), 210);
    assert.equal(domainMs({ last_ms: -1 }), null);
});

test('coloSplit shows the share per colo', () => {
    assert.equal(coloSplit([{ colo: 'KUL', n: 3 }, { colo: 'SIN', n: 1 }]), '过去 24 小时观众入口机房：KUL 75% · SIN 25%（4 次播放）');
    assert.equal(coloSplit([]), '过去 24 小时还没有观众入口机房记录');
});

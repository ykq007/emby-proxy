/**
 * Unit tests for the single shared clock/format module (src/util/clock.js).
 * Covers day-string, the UTC 16:00 Beijing-midnight rollover boundary, and
 * duration formatting edges. Node built-in test runner only.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    BEIJING_OFFSET_MS,
    nowBeijing,
    beijingDayStr,
    beijingDayWindow,
    formatBeijingTimestamp,
    formatDuration,
    htmlEscape,
} from '../src/util/clock.js';

// ─── BEIJING_OFFSET_MS ──────────────────────────────────────────────────────

test('BEIJING_OFFSET_MS: is exactly 8 hours in ms', () => {
    assert.equal(BEIJING_OFFSET_MS, 8 * 60 * 60 * 1000);
});

// ─── beijingDayStr ──────────────────────────────────────────────────────────

test('beijingDayStr: returns YYYY-MM-DD for a given instant', () => {
    assert.equal(beijingDayStr(Date.parse('2026-01-02T01:23:45.000Z')), '2026-01-02');
});

test('beijingDayStr: defaults to Date.now() when called with no args', () => {
    const result = beijingDayStr();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('beijingDayStr: just before UTC 16:00 is still the previous Beijing day', () => {
    // 2026-01-01T15:59:59Z + 8h = 2026-01-01T23:59:59 Beijing.
    assert.equal(beijingDayStr(Date.parse('2026-01-01T15:59:59.000Z')), '2026-01-01');
});

test('beijingDayStr: UTC 16:00:00 exactly rolls over to the next Beijing day', () => {
    // 2026-01-01T16:00:00Z + 8h = 2026-01-02T00:00:00 Beijing.
    assert.equal(beijingDayStr(Date.parse('2026-01-01T16:00:00.000Z')), '2026-01-02');
});

// ─── beijingDayWindow ───────────────────────────────────────────────────────

test('beijingDayWindow: starts at Beijing midnight converted to UTC (16:00 previous day)', () => {
    const nowMs = Date.parse('2026-01-02T01:23:45.000Z');
    const window = beijingDayWindow(nowMs);
    assert.equal(window.day, '2026-01-02');
    assert.equal(window.startIso, '2026-01-01T16:00:00.000Z');
    assert.equal(window.endIso, '2026-01-02T01:23:45.000Z');
});

test('beijingDayWindow: instant at exactly UTC 16:00:00 opens a new window', () => {
    const nowMs = Date.parse('2026-01-01T16:00:00.000Z');
    const window = beijingDayWindow(nowMs);
    assert.equal(window.day, '2026-01-02');
    assert.equal(window.startIso, '2026-01-01T16:00:00.000Z');
});

test('beijingDayWindow: instant 1ms before UTC 16:00:00 is still in the prior window', () => {
    const nowMs = Date.parse('2026-01-01T15:59:59.999Z');
    const window = beijingDayWindow(nowMs);
    assert.equal(window.day, '2026-01-01');
    assert.equal(window.startIso, '2025-12-31T16:00:00.000Z');
});

// ─── nowBeijing ─────────────────────────────────────────────────────────────

test('nowBeijing: UTC getters read as Beijing local time', () => {
    const d = nowBeijing(Date.parse('2026-01-01T16:00:00.000Z'));
    assert.equal(d.getUTCFullYear(), 2026);
    assert.equal(d.getUTCMonth(), 0);
    assert.equal(d.getUTCDate(), 2);
    assert.equal(d.getUTCHours(), 0);
});

// ─── formatBeijingTimestamp ─────────────────────────────────────────────────

test('formatBeijingTimestamp: renders YYYY-MM-DD HH:MM:SS in Beijing time', () => {
    assert.equal(
        formatBeijingTimestamp(Date.parse('2026-01-01T16:05:09.000Z')),
        '2026-01-02 00:05:09'
    );
});

// ─── formatDuration ─────────────────────────────────────────────────────────

test('formatDuration: 0 seconds', () => {
    assert.equal(formatDuration(0), '0s');
});

test('formatDuration: sub-minute duration has no minute bucket', () => {
    assert.equal(formatDuration(45), '45s');
});

test('formatDuration: exactly 1 minute', () => {
    assert.equal(formatDuration(60), '1m0s');
});

test('formatDuration: under 1 hour uses m/s buckets', () => {
    assert.equal(formatDuration(300), '5m0s');
    assert.equal(formatDuration(3599), '59m59s');
});

test('formatDuration: exactly 1 hour', () => {
    assert.equal(formatDuration(3600), '1h0m');
});

test('formatDuration: hours-and-minutes bucket for >1h, <24h', () => {
    assert.equal(formatDuration(7200), '2h0m');
    assert.equal(formatDuration(86399), '23h59m');
});

test('formatDuration: >24h switches to day bucket', () => {
    assert.equal(formatDuration(86400), '1d0h');
    assert.equal(formatDuration(90000), '1d1h');
    assert.equal(formatDuration(200000), '2d7h');
});

test('formatDuration: negative/NaN durations clamp to 0', () => {
    assert.equal(formatDuration(-5), '0s');
    assert.equal(formatDuration(NaN), '0s');
});

// ─── htmlEscape ─────────────────────────────────────────────────────────────
// (Full coverage lives in test/util-svg.test.mjs; a couple of smoke checks here
// confirm the consolidated module behaves identically to the old duplicates.)

test('htmlEscape: escapes all five entities', () => {
    assert.equal(htmlEscape(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('htmlEscape: null/undefined become empty string', () => {
    assert.equal(htmlEscape(null), '');
    assert.equal(htmlEscape(undefined), '');
});

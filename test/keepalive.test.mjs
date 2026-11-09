/**
 * Unit tests for keepalive passive detection and reminder scheduling.
 *
 * Runner: node --test   (Node 22 built-in test runner, no extra deps)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isPlaybackRequest } from '../src/proxy/engine.js';
import { shouldRemind } from '../src/probes/keepalive.js';

// ---------------------------------------------------------------------------
// isPlaybackRequest — path/method matching
// ---------------------------------------------------------------------------

test('POST /Sessions/Playing → true', () => {
    assert.equal(isPlaybackRequest('/Sessions/Playing', 'POST'), true);
});

test('POST /emby/Sessions/Playing/Progress → true', () => {
    assert.equal(isPlaybackRequest('/emby/Sessions/Playing/Progress', 'POST'), true);
});

test('GET /Videos/123/stream.mp4 → true', () => {
    assert.equal(isPlaybackRequest('/Videos/123/stream.mp4', 'GET'), true);
});

test('GET /Audio/abc/stream → true', () => {
    assert.equal(isPlaybackRequest('/Audio/abc/stream', 'GET'), true);
});

test('GET /Items/x/PlaybackInfo → true', () => {
    assert.equal(isPlaybackRequest('/Items/x/PlaybackInfo', 'GET'), true);
});

test('GET /emby/Items/x/PlaybackInfo → true', () => {
    assert.equal(isPlaybackRequest('/emby/Items/x/PlaybackInfo', 'GET'), true);
});

test('GET /Users → false', () => {
    assert.equal(isPlaybackRequest('/Users', 'GET'), false);
});

test('GET /Sessions → false (no /Playing suffix)', () => {
    assert.equal(isPlaybackRequest('/Sessions', 'GET'), false);
});

test('POST /Videos/123/stream → false (wrong method)', () => {
    assert.equal(isPlaybackRequest('/Videos/123/stream', 'POST'), false);
});

// M2: new HLS/DASH/download patterns
test('GET /Videos/abc/master.m3u8 → true', () => {
    assert.equal(isPlaybackRequest('/Videos/abc/master.m3u8', 'GET'), true);
});

test('GET /emby/Videos/abc/hls1/0.ts → true', () => {
    assert.equal(isPlaybackRequest('/emby/Videos/abc/hls1/0.ts', 'GET'), true);
});

test('GET /Videos/abc/segment-001.m4s → true', () => {
    assert.equal(isPlaybackRequest('/Videos/abc/segment-001.m4s', 'GET'), true);
});

test('GET /Items/x/Download → true', () => {
    assert.equal(isPlaybackRequest('/Items/x/Download', 'GET'), true);
});

test('GET /emby/Sync/Items → true', () => {
    assert.equal(isPlaybackRequest('/emby/Sync/Items', 'GET'), true);
});

test('POST /Sessions/Playing/Stopped → true', () => {
    assert.equal(isPlaybackRequest('/Sessions/Playing/Stopped', 'POST'), true);
});

test('GET /Users → false (negative)', () => {
    assert.equal(isPlaybackRequest('/Users', 'GET'), false);
});

// ---------------------------------------------------------------------------
// shouldRemind — timing rules
// ---------------------------------------------------------------------------

const NOW = 1_000_000;

test('more than 3 days left → no reminder', () => {
    assert.equal(shouldRemind(3 * 86400 + 1, 0, NOW), false);
});

test('3 days left, never reminded → reminder', () => {
    assert.equal(shouldRemind(3 * 86400, 0, NOW), true);
});

test('2 days left, reminded 24h ago → reminder', () => {
    assert.equal(shouldRemind(2 * 86400, NOW - 86400, NOW), true);
});

test('12h left, reminded 3h ago → no reminder (once a day, not every hour)', () => {
    assert.equal(shouldRemind(43200, NOW - 3 * 3600, NOW), false);
});

test('hourly cron 10 min early still sends the next daily reminder', () => {
    assert.equal(shouldRemind(86400, NOW - (86400 - 600), NOW), true);
});

test('overdue, reminded 25h ago → reminder', () => {
    assert.equal(shouldRemind(-3600, NOW - 90000, NOW), true);
});

test('overdue, reminded 23h ago → no reminder', () => {
    assert.equal(shouldRemind(-3600, NOW - 82800, NOW), false);
});

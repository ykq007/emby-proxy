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

test('remaining > 86400 → false', () => {
    assert.equal(shouldRemind(86401, 0, NOW), false);
});

test('remaining = 43200 (12h), lastReminded 3600s ago → true', () => {
    assert.equal(shouldRemind(43200, NOW - 3600, NOW), true);
});

test('remaining = 43200, lastReminded 1800s ago → false (debounce 50min)', () => {
    assert.equal(shouldRemind(43200, NOW - 1800, NOW), false);
});

test('remaining = -3600 (overdue), lastReminded 90000s ago → true', () => {
    assert.equal(shouldRemind(-3600, NOW - 90000, NOW), true);
});

test('remaining = -3600, lastReminded 82800s ago → false (overdue debounce 86400s)', () => {
    assert.equal(shouldRemind(-3600, NOW - 82800, NOW), false);
});

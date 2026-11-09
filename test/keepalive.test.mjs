/**
 * Unit tests for keepalive passive detection and reminder scheduling.
 *
 * Runner: node --test   (Node 22 built-in test runner, no extra deps)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isRealPlayback, isUnpaused } from '../src/proxy/engine.js';
import { shouldRemind } from '../src/probes/keepalive.js';

// ---------------------------------------------------------------------------
// isRealPlayback — only actual watching resets the keepalive window
// ---------------------------------------------------------------------------

const WATCHING = [
    ['POST', '/Sessions/Playing'],
    ['POST', '/emby/Sessions/Playing/Progress'],
    ['GET', '/Videos/123/stream.mp4'],
    ['GET', '/Audio/abc/stream'],
    ['GET', '/Videos/abc/master.m3u8'],
    ['GET', '/emby/Videos/abc/hls1/0.ts'],
    ['GET', '/Videos/abc/segment-001.m4s'],
];
const NOT_WATCHING = [
    ['GET', '/Items/x/PlaybackInfo'],
    ['POST', '/emby/Items/x/PlaybackInfo'],
    ['POST', '/Sessions/Playing/Stopped'],
    ['POST', '/Sessions/Playing/Ping'],
    ['GET', '/Videos/abc/Subtitles/1/0/Stream.srt'],
    ['GET', '/Videos/abc/original'],
    ['GET', '/Items/x/Download'],
    ['GET', '/emby/Sync/Items'],
    ['GET', '/Users'],
    ['GET', '/Sessions'],
    ['POST', '/Videos/123/stream'],
];

for (const [method, path] of WATCHING) {
    test(`${method} ${path} → watching`, () => assert.equal(isRealPlayback(path, method), true));
}
for (const [method, path] of NOT_WATCHING) {
    test(`${method} ${path} → not watching`, () => assert.equal(isRealPlayback(path, method), false));
}

const progress = body => new Request('https://p.example/Sessions/Playing/Progress', { method: 'POST', body });

test('paused progress heartbeat → not watching', async () => {
    assert.equal(await isUnpaused(progress(JSON.stringify({ IsPaused: true, PositionTicks: 1 }))), false);
});

test('unpaused progress heartbeat → watching', async () => {
    assert.equal(await isUnpaused(progress(JSON.stringify({ IsPaused: false }))), true);
});

test('progress body that is not JSON → watching (fail open, the play start already counted)', async () => {
    assert.equal(await isUnpaused(progress('not json')), true);
});

test('no progress body to check (stream or play start) → watching', async () => {
    assert.equal(await isUnpaused(null), true);
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

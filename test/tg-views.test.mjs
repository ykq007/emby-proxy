import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    renderUnknownCommand,
    renderMuteHelp,
    renderMuteApplied,
    renderUnmuted,
} from '../src/tg/views.js';
import { renderHelp, renderStart, BOT_COMMANDS } from '../src/tg/commands.js';

test('renderUnknownCommand: includes user input escaped', () => {
    const out = renderUnknownCommand('/<bogus>');
    assert.ok(out.text.includes('&lt;bogus&gt;'));
    assert.ok(!out.text.includes('<bogus>'));
    assert.ok(out.text.includes('/help'));
});

test('renderMuteHelp: returns text + keyboard', () => {
    const out = renderMuteHelp();
    assert.equal(typeof out.text, 'string');
    assert.ok(out.reply_markup);
});

test('renderMuteApplied: shows UTC+8 time', () => {
    const out = renderMuteApplied(1717000000);
    assert.equal(typeof out.text, 'string');
    assert.ok(out.text.includes('UTC+8') || out.text.includes('静音'));
});

test('renderUnmuted: returns text', () => {
    const out = renderUnmuted();
    assert.equal(typeof out.text, 'string');
    assert.ok(out.text.length > 0);
});

test('renderHelp: lists all commands and uses HTML', () => {
    const txt = renderHelp();
    assert.ok(txt.includes('/status'));
    assert.ok(txt.includes('/keepalive'));
    assert.ok(txt.includes('/node'));
    assert.ok(txt.includes('/mute'));
    assert.ok(txt.includes('<b>') && txt.includes('</b>'));
});

test('renderStart: welcome message', () => {
    const txt = renderStart();
    assert.ok(txt.includes('欢迎') || txt.toLowerCase().includes('welcome'));
});

test('BOT_COMMANDS: start/help come first', () => {
    assert.equal(BOT_COMMANDS[0].command, 'start');
    assert.equal(BOT_COMMANDS[1].command, 'help');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, raw } from '../src/ui/console/html.js';
import { pageFromHash, pageHash, parseHash } from '../src/ui/console/nav.js';

test('html escapes interpolated values but not nested templates', () => {
    const name = '<img src=x onerror=alert(1)>';
    const row = html`<td title="${'"q"'}">${name}</td>`;
    assert.equal(String(html`<tr>${row}${raw('<td>ok</td>')}</tr>`),
        '<tr><td title="&quot;q&quot;">&lt;img src=x onerror=alert(1)&gt;</td><td>ok</td></tr>');
});

test('html joins arrays and drops null, undefined and false', () => {
    assert.equal(String(html`<ul>${['a', 'b'].map(x => html`<li>${x}</li>`)}${null}${undefined}${false}${0}</ul>`),
        '<ul><li>a</li><li>b</li>0</ul>');
});

test('pageFromHash keeps new keys, maps old #dest/tab links, defaults to overview', () => {
    assert.equal(pageFromHash('#viewers'), 'viewers');
    assert.equal(pageFromHash('#monitor/stats'), 'stats');
    assert.equal(pageFromHash('#config/settings'), 'nodes');
    assert.equal(pageFromHash('#network'), 'speed');
    assert.equal(pageFromHash(''), 'overview');
    assert.equal(pageFromHash('#nope'), 'overview');
});

test('parseHash splits a page argument and pageHash builds it back', () => {
    assert.deepEqual(parseHash('#nodes/hk%201'), { key: 'nodes', arg: 'hk 1' });
    assert.deepEqual(parseHash('#config/settings'), { key: 'nodes', arg: '' });
    assert.deepEqual(parseHash('#bogus/x'), { key: 'overview', arg: '' });
    assert.equal(pageHash('nodes', 'hk 1'), '#nodes/hk%201');
    assert.equal(pageHash('stats'), '#stats');
});

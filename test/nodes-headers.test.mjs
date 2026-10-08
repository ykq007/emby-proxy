import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enabledCount, isSensitiveKey, mergeHeaders, parseCurl, parseHeaders, serializeHeaders } from '../src/ui/console/pages/nodes-headers.js';

test('parseHeaders skips blanks, comments and lines with no key', () => {
    assert.deepEqual(parseHeaders('X-Emby-Token: abc\n\n# note: x\n:nokey\nbad line\n  Referer :  https://a.b/c  '), [
        { key: 'X-Emby-Token', value: 'abc', on: true },
        { key: 'Referer', value: 'https://a.b/c', on: true },
    ]);
    assert.deepEqual(parseHeaders(''), []);
});

test('serializeHeaders drops disabled and empty rows and keeps the first of a repeated key', () => {
    const rows = [
        { key: ' Cookie ', value: 'a=1', on: true },
        { key: 'X-Off', value: '1', on: false },
        { key: '', value: 'orphan', on: true },
        { key: 'cookie', value: 'b=2', on: true },
        { key: 'User-Agent', value: 'Infuse-Direct/8.1', on: true },
    ];
    assert.equal(serializeHeaders(rows), 'Cookie: a=1\nUser-Agent: Infuse-Direct/8.1');
    assert.equal(enabledCount(rows), 3);
});

test('parseCurl reads -H and --header values in single and double quotes', () => {
    const curl = `curl 'https://emby.example.com/emby/Users/AuthenticateByName' \\
  -H 'authorization: MediaBrowser Token="tok123", Client="Infuse"' \\
  -H "Cookie: a=1; b=2" \\
  --header 'x-emby-token:abc123' \\
  --data-raw '{"Username":"u"}' \\
  --compressed`;
    assert.deepEqual(parseCurl(curl), [
        { key: 'authorization', value: 'MediaBrowser Token="tok123", Client="Infuse"', on: true },
        { key: 'Cookie', value: 'a=1; b=2', on: true },
        { key: 'x-emby-token', value: 'abc123', on: true },
    ]);
    assert.deepEqual(parseCurl('curl https://a.b --compressed'), []);
});

test('mergeHeaders skips or replaces existing keys case-insensitively', () => {
    const rows = [{ key: 'Cookie', value: 'old', on: false }, { key: 'X-A', value: '1', on: true }];
    const incoming = [{ key: 'cookie', value: 'new', on: true }, { key: 'X-B', value: '2', on: true }];

    assert.deepEqual(mergeHeaders(rows, incoming, 'skip'), {
        rows: [{ key: 'Cookie', value: 'old', on: false }, { key: 'X-A', value: '1', on: true }, { key: 'X-B', value: '2', on: true }],
        added: 1, updated: 0,
    });
    assert.deepEqual(mergeHeaders(rows, incoming, 'replace'), {
        rows: [{ key: 'Cookie', value: 'new', on: true }, { key: 'X-A', value: '1', on: true }, { key: 'X-B', value: '2', on: true }],
        added: 1, updated: 1,
    });
    assert.equal(rows[0].value, 'old', 'input rows are not mutated');
});

test('isSensitiveKey matches credential headers regardless of case and spaces', () => {
    assert.equal(isSensitiveKey(' Authorization '), true);
    assert.equal(isSensitiveKey('X-EMBY-TOKEN'), true);
    assert.equal(isSensitiveKey('User-Agent'), false);
});

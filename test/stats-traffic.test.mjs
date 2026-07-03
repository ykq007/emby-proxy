import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    beijingDayWindow,
    formatBytes,
    getFormattedCFTraffic,
    queryRouteTrafficBytes,
    routeTrafficAliasEntries,
} from '../src/stats/traffic.js';

function stubFetch(fn) {
    const orig = globalThis.fetch;
    globalThis.fetch = fn;
    return () => { globalThis.fetch = orig; };
}

test('routeTrafficAliasEntries: generates safe unique aliases and skips unsafe prefixes', () => {
    const entries = routeTrafficAliasEntries(['a-b', 'a_b', 'bad.path']);
    assert.deepEqual(entries.map(e => [e.alias, e.prefix]), [
        ['p_a_b', 'a-b'],
        ['p_a_b_2', 'a_b'],
    ]);
});

test('beijingDayWindow: starts at Beijing midnight converted to UTC', () => {
    const nowMs = Date.parse('2026-01-02T01:23:45.000Z');
    const window = beijingDayWindow(nowMs);
    assert.equal(window.day, '2026-01-02');
    assert.equal(window.startIso, '2026-01-01T16:00:00.000Z');
    assert.equal(window.endIso, '2026-01-02T01:23:45.000Z');
});

test('formatBytes: preserves existing human units', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(900), '900 B');
    assert.equal(formatBytes(2048), '2.00 KB');
    assert.equal(formatBytes(1048576), '1.00 MB');
    assert.equal(formatBytes(1073741824), '1.00 GB');
});

test('queryRouteTrafficBytes: keeps successful chunks and skips failed chunks', async () => {
    const calls = [];
    const restore = stubFetch(async (url, init) => {
        const query = JSON.parse(init.body).query;
        calls.push(query);
        if (query.includes('p_b')) {
            return Response.json({ errors: [{ message: 'chunk failed' }] });
        }
        return Response.json({
            data: {
                viewer: {
                    zones: [{
                        p_a: [{ sum: { edgeResponseBytes: 1234 } }],
                    }],
                },
            },
        });
    });
    try {
        const result = await queryRouteTrafficBytes(
            { CF_API_TOKEN: 'tok', CF_ZONE_ID: 'zone' },
            ['a', 'b'],
            { nowMs: Date.parse('2026-01-02T01:00:00.000Z'), chunkSize: 1 }
        );
        assert.equal(calls.length, 2);
        assert.equal(result.anySuccess, true);
        assert.equal(result.bytesByPrefix.get('a'), 1234);
        assert.equal(result.bytesByPrefix.has('b'), false);
    } finally {
        restore();
    }
});

test('getFormattedCFTraffic: formats aggregate Cloudflare bytes', async () => {
    const restore = stubFetch(async () => Response.json({
        data: {
            viewer: {
                zones: [{
                    httpRequestsAdaptiveGroups: [{ sum: { edgeResponseBytes: 1048576 } }],
                }],
            },
        },
    }));
    try {
        const result = await getFormattedCFTraffic({ CF_API_TOKEN: 'tok', CF_ZONE_ID: 'zone' }, 'today');
        assert.equal(result, '1.00 MB');
    } finally {
        restore();
    }
});

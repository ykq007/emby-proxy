#!/usr/bin/env node
// Snapshot harness for worker UI strings.
// Usage:
//   node scripts/snapshot-ui.mjs --write   write current outputs to snapshots/
//   node scripts/snapshot-ui.mjs --check   diff current vs on-disk; nonzero exit on mismatch

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const snapDir = resolve(repoRoot, 'snapshots');

const useSrc = existsSync(resolve(repoRoot, 'src/index.js'));

const mod = useSrc
    ? {
        CSS_COMMON: (await import('../src/ui/css.js')).CSS_COMMON,
        LOGIN_UI: (await import('../src/ui/login.js')).LOGIN_UI,
        HTML_UI: (await import('../src/ui/dashboard.js')).HTML_UI,
        renderStatusHtml: (await import('../src/status/page.js')).renderStatusHtml,
        renderCardSvg: (await import('../src/ui/svg.js')).renderCardSvg,
    }
    : await import('../worker.js');

const fixtureCards = [
    {
        prefix: '/a',
        name: 'Node A',
        icon: '',
        ok: true,
        latest_ms: 120,
        latest_ts: 1700000000,
        avail_24h: 0.995,
        avail_7d: 0.992,
        history: [
            { ok: 1, ms: 110 }, { ok: 1, ms: 130 }, { ok: 1, ms: 105 },
            { ok: 0, ms: 0 },   { ok: 1, ms: 140 }, { ok: 1, ms: 120 },
        ],
        counts: { movies: 100, series: 20, episodes: 500 },
        counts_delta: { movies: 2, series: 0, episodes: 7 },
        show_counts: true,
    },
    {
        prefix: '/b',
        name: 'Node B',
        icon: '',
        ok: false,
        latest_ms: 0,
        latest_ts: 1700000000,
        avail_24h: 0.50,
        avail_7d: 0.80,
        history: [
            { ok: 0, ms: 0 }, { ok: 0, ms: 0 }, { ok: 1, ms: 300 },
        ],
        counts: null,
        counts_delta: null,
        show_counts: false,
    },
];

const outputs = {
    'login.html': mod.LOGIN_UI,
    'dashboard.html': mod.HTML_UI,
    'css-common.css': mod.CSS_COMMON,
    'status.html': mod.renderStatusHtml({ routes: [], cards: fixtureCards }, { title: '节点状态', hideNames: false }),
    'card.svg': mod.renderCardSvg(fixtureCards[0]),
};

const mode = process.argv[2];
if (mode === '--write') {
    if (!existsSync(snapDir)) mkdirSync(snapDir, { recursive: true });
    for (const [name, content] of Object.entries(outputs)) {
        writeFileSync(resolve(snapDir, name), String(content));
        console.log(`wrote ${name} (${String(content).length} bytes)`);
    }
} else if (mode === '--check') {
    let failed = 0;
    for (const [name, content] of Object.entries(outputs)) {
        const path = resolve(snapDir, name);
        if (!existsSync(path)) {
            console.error(`MISSING ${name}`);
            failed++;
            continue;
        }
        const onDisk = readFileSync(path, 'utf8');
        if (onDisk !== String(content)) {
            console.error(`DIFF ${name}`);
            failed++;
        } else {
            console.log(`OK   ${name}`);
        }
    }
    process.exit(failed ? 1 : 0);
} else {
    console.error('usage: snapshot-ui.mjs --write | --check');
    process.exit(2);
}

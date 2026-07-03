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

// CSS_COMMON is now a plain source file (issue #20), not a JS module export —
// read it straight off disk so the snapshot covers exactly what build-assets.mjs
// hashes into public/static/.
const mod = useSrc
    ? {
        CSS_COMMON: readFileSync(resolve(repoRoot, 'src/ui/dashboard/client/app.css'), 'utf8'),
        LOGIN_UI: (await import('../src/ui/login.js')).LOGIN_UI,
        HTML_UI: (await import('../src/ui/dashboard.js')).HTML_UI,
    }
    : await import('../worker.js');

const outputs = {
    'login.html': mod.LOGIN_UI,
    'dashboard.html': mod.HTML_UI,
    'css-common.css': mod.CSS_COMMON,
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

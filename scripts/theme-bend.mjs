#!/usr/bin/env node
// Writes the console theme tokens from console.css into src/ui/console/theme.bend,
// where LAWS.bend checks their contrast. Run `bend PROOF.bend` after --write.
// Usage:
//   node scripts/theme-bend.mjs --write   regenerate theme.bend
//   node scripts/theme-bend.mjs --check   nonzero exit when theme.bend is stale

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = resolve(root, 'src/ui/console/console.css');
const outPath = resolve(root, 'src/ui/console/theme.bend');

// Field order of Theme{} in contrast.bend.
const FIELDS = ['bg', 'panel', 'raise', 'tx', 'tx2', 'tx3', 'ok', 'warn', 'err', 'acc', 'on-acc', 'data'];
const SCHEME = { dark: 'C.Dark{}', light: 'C.Light{}' };

function block(css, selector) {
    const start = css.indexOf(selector + ' {');
    if (start < 0) throw new Error(`console.css has no "${selector}" block`);
    const body = css.slice(start, css.indexOf('}', start));
    const tokens = Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
    const scheme = /color-scheme:\s*([a-z]+)\s*;/.exec(body)?.[1];
    return { tokens, scheme };
}

function theme(name, { tokens, scheme }) {
    const values = FIELDS.map(f => {
        const v = tokens[f];
        if (!/^#[0-9a-f]{6}$/i.test(v ?? '')) throw new Error(`${name}: --${f} must be an opaque #rrggbb colour, got ${v}`);
        return v.toLowerCase();
    });
    return [
        `# ${FIELDS.map((f, i) => `${f} ${values[i]}`).join(', ')}`,
        `def ${name}() -> C.Theme:`,
        `  C.Theme{${[SCHEME[scheme] ?? 'C.Unset{}', ...values.map(v => parseInt(v.slice(1), 16))].join(', ')}}`,
    ].join('\n');
}

const css = readFileSync(cssPath, 'utf8');
const dark = block(css, ':root');
const lightOwn = block(css, ':root[data-theme="light"]');
const light = { tokens: { ...dark.tokens, ...lightOwn.tokens }, scheme: lightOwn.scheme };

const out = `# AUTO-GENERATED from console.css by scripts/theme-bend.mjs. Do not edit.
import Base
import ./contrast.bend as C

${theme('dark', dark)}

${theme('light', light)}
`;

const mode = process.argv[2];
if (mode === '--write') {
    writeFileSync(outPath, out);
    console.log('wrote src/ui/console/theme.bend');
} else if (mode === '--check') {
    let onDisk = '';
    try { onDisk = readFileSync(outPath, 'utf8'); } catch { /* missing counts as stale */ }
    if (onDisk !== out) {
        console.error('STALE src/ui/console/theme.bend: run npm run theme:write, then npm run laws');
        process.exit(1);
    }
    console.log('OK   theme.bend');
} else {
    console.error('usage: theme-bend.mjs --write | --check');
    process.exit(2);
}

#!/usr/bin/env node
// Copies the numbers LAWS.bend checks out of the console CSS: theme colours into
// src/ui/console/theme.bend, and the 观看账号 grid widths into src/ui/console/layout.bend.
// Run `bend PROOF.bend` after --write.
// Usage:
//   node scripts/bend-tokens.mjs --write   regenerate both files
//   node scripts/bend-tokens.mjs --check   nonzero exit when either file is stale

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = resolve(root, 'src/ui/console/console.css');
const viewersCssPath = resolve(root, 'src/ui/console/pages/viewers.css');

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

function px(css, re, what) {
    const m = re.exec(css);
    if (!m) throw new Error(`cannot find ${what}`);
    return Number(m[1]);
}

const mobile = css.indexOf('@media (max-width: ');
const viewersCss = readFileSync(viewersCssPath, 'utf8');
const layout = {
    mobile_max: px(css, /@media \(max-width: (\d+)px\)/, 'the mobile breakpoint in console.css'),
    side: px(dark.tokens.side ?? '', /^(\d+)px$/, '--side in console.css'),
    pad: px(css.slice(0, mobile), /\n\.sec \{ padding: (\d+)px;/, 'the desktop .sec padding in console.css'),
    pad_m: px(css.slice(mobile), /\n\s*\.sec \{ padding: (\d+)px;/, 'the mobile .sec padding in console.css'),
    cell: px(viewersCss, /\.vw-grid \{[^}]*minmax\((\d+)px/, 'the .vw-grid cell width in viewers.css'),
};

const files = {
    'src/ui/console/theme.bend': `# AUTO-GENERATED from console.css by scripts/bend-tokens.mjs. Do not edit.
import Base
import ./contrast.bend as C

${theme('dark', dark)}

${theme('light', light)}
`,
    'src/ui/console/layout.bend': `# AUTO-GENERATED from console.css and viewers.css by scripts/bend-tokens.mjs. Do not edit.
import Base
import ./reflow.bend as R

# ${Object.entries(layout).map(([k, v]) => `${k} ${v}px`).join(', ')}
def viewers() -> R.Layout:
  R.Layout{${Object.values(layout).join(', ')}}
`,
};

const mode = process.argv[2];
if (mode === '--write') {
    for (const [path, out] of Object.entries(files)) {
        writeFileSync(resolve(root, path), out);
        console.log(`wrote ${path}`);
    }
} else if (mode === '--check') {
    for (const [path, out] of Object.entries(files)) {
        let onDisk = '';
        try { onDisk = readFileSync(resolve(root, path), 'utf8'); } catch { /* missing counts as stale */ }
        if (onDisk !== out) {
            console.error(`STALE ${path}: run npm run bend:write, then npm run laws`);
            process.exit(1);
        }
        console.log(`OK   ${path}`);
    }
} else {
    console.error('usage: bend-tokens.mjs --write | --check');
    process.exit(2);
}

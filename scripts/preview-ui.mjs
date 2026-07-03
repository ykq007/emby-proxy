#!/usr/bin/env node
// Visual-preview generator for the dashboard + login UI.
// Emits self-contained HTML (CSS inlined, external/CDN + app scripts neutralized)
// into public/preview/ so a headless browser can screenshot the design system
// without a running Worker/D1. Not shipped — public/preview/ is dev-only.
//
//   node scripts/preview-ui.mjs
//   then serve public/ and open /preview/dashboard.html (+ ?theme=light)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const outDir = resolve(repoRoot, 'public/preview');

// CSS_COMMON is now a plain source file (issue #20), read straight off disk.
const CSS_COMMON = readFileSync(resolve(repoRoot, 'src/ui/dashboard/client/app.css'), 'utf8');
const { HTML_UI } = await import('../src/ui/dashboard.js');
const { LOGIN_UI } = await import('../src/ui/login.js');

mkdirSync(outDir, { recursive: true });

// Inline the hashed CSS link with the real stylesheet, but KEEP the real app.js
// (served from /static by the preview server) and CDN scripts so navigation is
// interactive. API calls 404 → caught gracefully; the shell + nav still run.
// ?theme=light|dark forces theme; ?dest=<d>&tab=<t> deep-links via hash so the
// real showDest() drives the view.
function selfContain(html) {
    return html
        .replace(/<link rel="stylesheet" href="[^"]*">/g, `<style>${CSS_COMMON}</style>`)
        .replace(
            /<body([^>]*)>/,
            `<body$1><script>(function(){var q=new URLSearchParams(location.search);var t=q.get('theme');try{if(t)localStorage.setItem('emby_theme',t);}catch(e){}if(t==='light')document.body.classList.remove('dark');else document.body.classList.add('dark');var d=q.get('dest');if(d){var tab=q.get('tab');location.hash=d+(tab?'/'+tab:'');}})();</script>`
        );
}

writeFileSync(resolve(outDir, 'dashboard.html'), selfContain(HTML_UI));
writeFileSync(resolve(outDir, 'login.html'), selfContain(LOGIN_UI));
console.log('preview-ui: wrote public/preview/{dashboard,login}.html');

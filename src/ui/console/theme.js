// Three-state theme: auto follows the system. The pre-paint copy of this logic lives in
// src/ui/head.js so the first frame is already in the right theme.
const KEY = 'emby_theme';
const ORDER = ['auto', 'light', 'dark'];
const LABEL = { auto: '跟随系统', light: '浅色', dark: '深色' };
const media = matchMedia('(prefers-color-scheme: light)');

export function themePref() {
    try { return ORDER.includes(localStorage.getItem(KEY)) ? localStorage.getItem(KEY) : 'auto'; } catch { return 'auto'; }
}

export function applyTheme(pref = themePref()) {
    const resolved = pref === 'auto' ? (media.matches ? 'light' : 'dark') : pref;
    document.documentElement.dataset.theme = resolved;
    document.querySelectorAll('[data-action="theme"]').forEach(b => {
        b.dataset.pref = pref;
        b.title = '主题：' + LABEL[pref];
    });
    document.dispatchEvent(new CustomEvent('themechange', { detail: resolved }));
}

export function cycleTheme() {
    const next = ORDER[(ORDER.indexOf(themePref()) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    applyTheme(next);
    return LABEL[next];
}

media.addEventListener('change', () => { if (themePref() === 'auto') applyTheme('auto'); });

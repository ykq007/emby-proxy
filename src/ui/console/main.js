import { NAV, PAGE_LIST, pageFromHash, pageHash, parseHash } from './nav.js';
import { pageModule } from './pages.js';
import { html, render } from './html.js';
import { applyTheme, cycleTheme } from './theme.js';
import { confirm, on, openSheet, toast } from './ui.js';
import { openPalette, setShellCommands } from './palette.js';
import './update.js';

let cleanup = null;

function route() {
    const { key, arg } = parseHash(location.hash);
    if (location.hash !== pageHash(key, arg)) history.replaceState(null, '', pageHash(key, arg));
    const page = { ...PAGE_LIST.find(p => p.key === key), arg };

    document.querySelectorAll('[data-nav]').forEach(a => {
        const current = a.dataset.nav === key || (a.dataset.nav === 'more' && !a.closest('.tabbar').querySelector(`[data-nav="${key}"]`));
        if (current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.getElementById('crumbGroup').textContent = page.group;
    document.getElementById('crumbPage').textContent = page.label;
    document.title = page.label + ' · Emby Proxy';

    if (cleanup) cleanup();
    cleanup = null;
    const old = document.getElementById('page');
    const root = old.cloneNode(false);
    old.replaceWith(root);
    try {
        cleanup = pageModule(key).mount(root, page) || null;
    } catch (err) {
        render(root, html`<div class="empty err" role="alert"><b>页面出错</b><span>${err.message}</span></div>`);
        console.error(err);
    }
    scrollTo(0, 0);
}

async function logout() {
    if (!await confirm({ title: '退出登录？', ok: '退出', danger: true })) return;
    document.cookie = 'admin_token=; path=/; max-age=0';
    location.reload();
}

function morePages() {
    const current = pageFromHash(location.hash);
    openSheet(html`
        <nav class="sheet-nav" aria-label="全部页面">
            ${NAV.map(g => html`<div class="nav-group">${g.group}</div>${g.pages.map(p => html`<a href="#${p.key}" class="${p.danger ? 'danger' : ''}" aria-current="${p.key === current ? 'page' : false}">${p.label}</a>`)}`)}
        </nav>
        <button type="button" class="btn block" data-close>关闭</button>`);
}

on(document, {
    theme: () => toast('主题：' + cycleTheme()),
    palette: openPalette,
    logout,
    more: morePages,
});

setShellCommands([
    { label: '切换主题', hint: '外观', run: () => toast('主题：' + cycleTheme()) },
    { label: '退出登录', hint: '账户', run: logout },
]);

addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!document.querySelector('dialog[open]')) openPalette();
    }
});

addEventListener('hashchange', route);
applyTheme();
route();

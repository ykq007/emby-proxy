import { html, render } from './html.js';
import { PAGE_LIST } from './nav.js';

// Pages add their own entries with setCommands('nodes', [{ label, hint, run }]).
const sources = new Map();
export const setCommands = (source, list) => sources.set(source, list);

let shellCommands = [];
export const setShellCommands = list => { shellCommands = list; };

function allCommands() {
    const pages = PAGE_LIST.map(p => ({ label: p.label, hint: p.group, run: () => { location.hash = p.key; } }));
    return [...pages, ...shellCommands, ...[...sources.values()].flat()];
}

export function openPalette() {
    if (document.querySelector('dialog.palette[open]')) return;
    document.querySelectorAll('dialog.palette').forEach(old => old.remove());
    const d = document.createElement('dialog');
    d.className = 'palette';
    render(d, html`
        <input type="search" placeholder="跳转页面、执行操作、搜索节点" aria-label="命令" autocomplete="off">
        <ul role="listbox" aria-label="结果"></ul>`);
    document.body.append(d);
    const input = d.querySelector('input');
    const list = d.querySelector('ul');
    let items = [];
    let active = 0;

    const draw = () => {
        const q = input.value.trim().toLowerCase();
        items = allCommands().filter(c => !q || (c.label + ' ' + (c.hint || '')).toLowerCase().includes(q)).slice(0, 50);
        active = Math.min(active, Math.max(items.length - 1, 0));
        render(list, items.length
            ? items.map((c, i) => html`<li role="option" data-i="${i}" aria-selected="${i === active}"><span>${c.label}</span><span class="muted">${c.hint || ''}</span></li>`)
            : html`<li class="muted">没有匹配项</li>`);
        list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    };
    const run = i => {
        const c = items[i];
        if (!c) return;
        d.close();
        c.run();
    };

    input.addEventListener('input', () => { active = 0; draw(); });
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(items.length, 1);
            draw();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            run(active);
        }
    });
    list.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) run(+li.dataset.i); });
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => d.remove());
    draw();
    d.showModal();
}

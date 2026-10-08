import { html, render } from './html.js';

// Delegated events: <button data-action="save"> inside root calls handlers.save(el, event).
// Pass type 'change' or 'input' with data-change / data-input attributes the same way.
export function on(root, handlers, type = 'click') {
    const attr = type === 'click' ? 'action' : type;
    const listener = e => {
        const el = e.target.closest(`[data-${attr}]`);
        if (!el || !root.contains(el)) return;
        const fn = handlers[el.dataset[attr]];
        if (fn) fn(el, e);
    };
    root.addEventListener(type, listener);
    return () => root.removeEventListener(type, listener);
}

export function toast(msg, kind = 'ok') {
    const host = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    el.textContent = msg;
    if (kind === 'err') {
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'toast-x';
        x.setAttribute('aria-label', '关闭');
        x.textContent = '×';
        x.onclick = () => el.remove();
        el.append(x);
    }
    host.append(el);
    setTimeout(() => el.remove(), kind === 'err' ? 8000 : 3000);
}

export const toastError = err => toast(err?.message || String(err), 'err');

// A <dialog> built on demand and removed on close. Native dialogs trap focus and close on Escape.
function dialog(className, content) {
    const d = document.createElement('dialog');
    d.className = className;
    render(d, content);
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    document.body.append(d);
    d.showModal();
    return d;
}

// A centered dialog. Clicking the backdrop or any [data-close] element closes it.
export const openModal = (content, className = '') => dialog(('modal ' + className).trim(), content);

// Resolves true on OK. A danger confirm puts focus on Cancel.
export function confirm({ title, body = '', ok = '确定', danger = false }) {
    return new Promise(resolve => {
        const d = dialog('modal', html`
            <form method="dialog">
                <h2>${title}</h2>
                ${body ? html`<p class="muted">${body}</p>` : ''}
                <div class="modal-actions">
                    <button class="btn" value="no" ${danger ? 'autofocus' : ''}>取消</button>
                    <button class="btn ${danger ? 'danger' : 'pri'}" value="yes" ${danger ? '' : 'autofocus'}>${ok}</button>
                </div>
            </form>`);
        d.addEventListener('close', () => resolve(d.returnValue === 'yes'));
    });
}

// Side panel on desktop, full page on a phone. Returns the <dialog>; its .body is the content element.
export function openPanel({ title, sub = '', content = '' }) {
    const d = dialog('panel', html`
        <header class="panel-head">
            <button type="button" class="icon-btn panel-back" data-close aria-label="返回">‹</button>
            <div class="panel-title"><h2>${title}</h2>${sub ? html`<div class="muted num">${sub}</div>` : ''}</div>
            <button type="button" class="icon-btn panel-x" data-close aria-label="关闭">×</button>
        </header>
        <div class="panel-body"></div>`);
    d.body = d.querySelector('.panel-body');
    render(d.body, content);
    return d;
}

// Bottom sheet listing actions or links on a phone.
export function openSheet(content) {
    const d = dialog('sheet', content);
    d.addEventListener('click', e => { if (e.target.closest('a')) d.close(); });
    return d;
}

// The one-line health summary in the top bar. level is ok, warn or err.
export function setStatusLine(text, level = 'ok') {
    const el = document.getElementById('statusLine');
    if (!el) return;
    el.hidden = !text;
    el.className = 'status-line st ' + level;
    el.querySelector('span').textContent = text;
}

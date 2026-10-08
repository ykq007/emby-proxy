import { html, render } from '../html.js';

export function mount(root, page) {
    render(root, html`<div class="empty"><b>${page.label}</b><span>尚未迁移到新界面。</span></div>`);
}

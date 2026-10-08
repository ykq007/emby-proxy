import { html, render } from '../html.js';
import { api } from '../api.js';
import { on, toast, toastError } from '../ui.js';

export function mount(root) {
    render(root, html`
        <section class="sec">
            <div class="sec-head"><h2>重定向直通白名单</h2><p>上游返回 301 / 302 时，Location 命中以下域名（或其子域名）就原样交给客户端，不经代理改写。</p></div>
            <label class="field"><span>域名，每行一个</span><textarea name="domains" rows="10" spellcheck="false" autocomplete="off" disabled placeholder="cdn.example.com"></textarea></label>
            <div class="sec-actions"><button type="button" class="btn pri" data-action="save" disabled>保存白名单</button></div>
        </section>`);

    const area = root.querySelector('textarea');
    const saveBtn = root.querySelector('[data-action="save"]');
    const fill = domains => {
        area.value = (domains || []).join('\n');
        area.disabled = false;
        saveBtn.disabled = false;
    };

    api('/api/manual-redirect-domains').then(d => fill(d.domains), err => {
        toastError(new Error('白名单读取失败：' + err.message));
        area.disabled = false;
    });

    return on(root, {
        save: async btn => {
            const domains = area.value.split('\n').map(s => s.trim()).filter(Boolean);
            btn.disabled = true;
            try {
                const d = await api('/api/manual-redirect-domains', { method: 'POST', body: { domains } });
                fill(d.domains);
                toast(`白名单已保存（${d.domains.length}）`);
            } catch (err) {
                toastError(new Error('保存失败：' + err.message));
            } finally {
                btn.disabled = false;
            }
        },
    });
}

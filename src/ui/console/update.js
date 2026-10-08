// Background check for a newer release, as the old console did: fetch the published worker from
// GITHUB_RAW_URL, read its "// VERSION: x.y.z" line, and offer a one-click redeploy when it differs.
import { html, render } from './html.js';
import { api } from './api.js';
import { confirm, toast, toastError } from './ui.js';

const CURRENT = __CURRENT_VERSION__;
const RAW_URL = __GITHUB_RAW_URL__;

async function check() {
    // The default config holds placeholder text, not a URL: skip the request rather than fail every load.
    if (!/^https?:\/\//.test(RAW_URL)) return;
    let code;
    try {
        const res = await fetch(RAW_URL + '?t=' + Date.now());
        if (!res.ok) return;
        code = await res.text();
    } catch { return; }
    const latest = code.match(/\/\/\s*VERSION:\s*v?([\d.]+)/i)?.[1];
    if (!latest || latest === CURRENT) return;

    const bar = document.createElement('div');
    bar.className = 'note update-note';
    bar.setAttribute('role', 'status');
    render(bar, html`
        <span>发现新版本 <b class="num">v${latest}</b>，当前 <span class="num">v${CURRENT}</span>。</span>
        <button type="button" class="btn pri sm" data-upgrade>一键升级</button>
        <button type="button" class="icon-btn" data-dismiss aria-label="忽略">×</button>`);
    document.getElementById('page').before(bar);
    bar.querySelector('[data-dismiss]').onclick = () => bar.remove();
    const btn = bar.querySelector('[data-upgrade]');
    btn.onclick = async () => {
        const ok = await confirm({
            title: `升级到 v${latest}？`,
            body: '会从 GitHub 拉取最新版本并覆盖当前 Worker。环境变量和数据库绑定会保留。',
            ok: '升级',
            danger: true,
        });
        if (!ok) return;
        btn.disabled = true;
        btn.textContent = '正在部署…';
        try {
            await api('/api/deploy', { method: 'POST', body: { newCode: code } });
            toast('在线更新完成，即将刷新页面');
            setTimeout(() => location.reload(), 1200);
        } catch (err) {
            toastError(new Error('更新失败：' + err.message));
            btn.disabled = false;
            btn.textContent = '一键升级';
        }
    };
}

check();

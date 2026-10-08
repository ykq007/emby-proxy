import { html, render } from '../html.js';
import { api } from '../api.js';
import { confirm, on, toast, toastError } from '../ui.js';

export function mount(root) {
    render(root, html`
        <div class="sec"><p class="muted">前两项影响所有访客。执行前会再确认一次。</p></div>
        <div class="sec danger-row">
            <div class="grow"><h2>刷新全站海报缓存</h2><p class="muted">清空 Cloudflare 上的海报和静态缓存。缓存重建前，客户端首次加载会慢 1 到 3 秒。</p></div>
            <button type="button" class="btn danger" data-action="purge">执行刷新</button>
        </div>
        <div class="sec danger-row">
            <div class="grow"><h2>覆盖部署 Worker</h2><p class="muted">用你提供的代码覆盖线上 Worker 并重启。期间所有反代请求会有 5 到 15 秒的连接抖动。</p></div>
            <button type="button" class="btn danger" data-action="openDeploy">打开部署面板</button>
        </div>
        <div class="sec danger-row">
            <div class="grow"><h2>退出登录</h2><p class="muted">清除当前会话。其他客户端不受影响，可以随时从登录页重新进入。</p></div>
            <button type="button" class="btn danger" data-action="logout">立即退出</button>
        </div>`);

    async function purge(btn) {
        const ok = await confirm({
            title: '刷新全站海报缓存？',
            body: '会清空 Cloudflare 节点上的全部海报和静态缓存。之后一段时间加载会变慢。',
            ok: '执行刷新',
            danger: true,
        });
        if (!ok) return;
        btn.disabled = true;
        btn.textContent = '正在清理…';
        try {
            await api('/api/purge-cache', { method: 'POST' });
            toast('缓存已清理，新海报已生效');
        } catch (err) {
            toastError(new Error('缓存清理失败：' + err.message));
        } finally {
            btn.disabled = false;
            btn.textContent = '执行刷新';
        }
    }

    // logout has no handler here: the shell's document-level data-action="logout" handles it.
    on(root, { purge, openDeploy: openDeployDialog });
}

function openDeployDialog() {
    const d = document.createElement('dialog');
    d.className = 'modal deploy-modal';
    render(d, html`
        <form method="dialog">
            <h2>覆盖部署 Worker</h2>
            <p class="note err">提交错误的代码会让面板立刻崩溃（500 错误），只能去 Cloudflare 后台抢修。请先在本地测试通过。</p>
            <label class="field"><span>粘贴 Worker 代码全文</span><textarea name="code" rows="10" spellcheck="false"></textarea></label>
            <label class="field"><span>或选择本地文件（.js），选了文件就用文件</span><input type="file" name="file" accept=".js,text/javascript"></label>
            <div class="modal-actions">
                <button class="btn" value="cancel">取消</button>
                <button type="button" class="btn danger pri" data-deploy>部署并重启</button>
            </div>
        </form>`);
    d.addEventListener('close', () => d.remove());
    document.body.append(d);
    d.showModal();
    const f = d.querySelector('form');
    const btn = d.querySelector('[data-deploy]');
    btn.onclick = async () => {
        const code = f.file.files[0] ? await f.file.files[0].text() : f.code.value;
        if (!code.trim()) { toastError(new Error('请先粘贴代码，或选择一个 .js 文件')); return; }
        const ok = await confirm({
            title: '覆盖线上 Worker？',
            body: '如果新代码有错误，这个面板会瘫痪，只能去 Cloudflare 后台恢复。确定代码没有问题吗？',
            ok: '覆盖部署',
            danger: true,
        });
        if (!ok) return;
        btn.disabled = true;
        btn.textContent = '正在部署…';
        try {
            const res = await api('/api/deploy', { method: 'POST', body: { newCode: code } });
            toast('部署成功' + (res.msg ? '：' + res.msg : '') + '，即将刷新页面');
            setTimeout(() => location.reload(), 1200);
        } catch (err) {
            toastError(new Error('部署失败：' + err.message));
            btn.disabled = false;
            btn.textContent = '部署并重启';
        }
    };
}

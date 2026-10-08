import { html, render } from '../html.js';
import { api } from '../api.js';
import { confirm, on, toast, toastError } from '../ui.js';
import { MODES, REGIONS, formFromPlacement, placementBody, placementLabel } from './tools-placement.js';

export function mount(root) {
    render(root, html`
        <section class="sec">
            <div class="sec-head"><h2>配置备份</h2><p>导出全部节点为 JSON 文件，或从文件导入。</p></div>
            <div class="sec-actions">
                <button type="button" class="btn" data-action="exportConfig">导出当前配置</button>
                <button type="button" class="btn" data-action="pickImport">导入配置…</button>
                <input type="file" accept=".json,application/json" data-change="importFile" hidden>
            </div>
        </section>
        <section class="sec">
            <div class="sec-head"><h2>cURL 请求头解析</h2><p>解析器在节点编辑器里。打开一个节点，在自定义请求头处粘贴 cURL 命令。</p></div>
            <div class="sec-actions"><a class="btn" href="#nodes">去部署节点</a></div>
        </section>
        <form class="sec" data-submit="placement">
            <div class="sec-head"><h2>Worker 调度</h2><p>控制 Worker 实际落地的物理机房。由后台调度，不暴露任何私钥。</p></div>
            <div class="fields">
                <label class="field"><span>调度模式</span>
                    <select name="mode" data-change="placeMode">${MODES.map(m => html`<option value="${m.value}">${m.label}</option>`)}</select>
                </label>
                <label class="field" data-show="region" hidden><span>落地区域</span><select name="region"></select></label>
                <label class="field" data-show="custom" hidden><span>区域代码</span><input name="custom" placeholder="例：gcp:us-west1" autocomplete="off"></label>
            </div>
            <div class="sec-actions">
                <button class="btn pri">提交修改</button>
                <span class="st off" id="placeStatus" role="status"><i aria-hidden="true"></i><span>正在读取当前设置…</span></span>
            </div>
        </form>`);

    const form = root.querySelector('[data-submit="placement"]');
    const status = (text, level) => {
        const el = root.querySelector('#placeStatus');
        el.className = 'st ' + level;
        el.lastElementChild.textContent = text;
    };
    const showMode = (mode, region = '') => {
        form.mode.value = mode;
        form.querySelector('[data-show="region"]').hidden = !REGIONS[mode];
        form.querySelector('[data-show="custom"]').hidden = mode !== 'custom';
        if (REGIONS[mode]) {
            render(form.region, REGIONS[mode].map(r => html`<option value="${r.value}">${r.label}</option>`));
            if (region) form.region.value = region;
        }
    };
    const current = () => ({ mode: form.mode.value, region: form.region.value, custom: form.custom.value });

    async function loadPlacement() {
        try {
            const state = formFromPlacement((await api('/api/placement')).placement);
            showMode(state.mode, state.region);
            form.custom.value = state.custom;
            status('当前：' + placementLabel(state), 'ok');
        } catch (err) {
            status('无法读取当前设置：' + err.message, 'err');
        }
    }

    async function submitPlacement(f, e) {
        e.preventDefault();
        const body = placementBody(current());
        if (body.error) { status(body.error, 'err'); form.custom.focus(); return; }
        status('正在提交…', 'warn');
        try {
            const res = await api('/api/placement', { method: 'POST', body });
            status((res.msg || '已修改') + ' 当前：' + placementLabel(current()), 'ok');
        } catch (err) {
            status(err.message, 'err');
        }
    }

    async function exportConfig() {
        try {
            const routes = await api('/api/routes');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(routes, null, 2)], { type: 'application/json' }));
            a.download = 'emby_proxy_backup.json';
            a.click();
            URL.revokeObjectURL(a.href);
            toast('配置已导出');
        } catch (err) { toastError(err); }
    }

    async function importFile(input) {
        const file = input.files[0];
        input.value = '';
        if (!file) return;
        let routes;
        try {
            routes = JSON.parse(await file.text());
            if (!Array.isArray(routes)) throw new Error('文件里不是节点列表');
        } catch (err) { toastError(new Error('无法读取文件：' + err.message)); return; }
        const ok = await confirm({
            title: `导入 ${routes.length} 个节点？`,
            body: `来自 ${file.name}。前缀相同的节点会被文件里的配置替换。`,
            ok: '导入',
            danger: true,
        });
        if (!ok) return;
        try {
            const res = await api('/api/routes/import', { method: 'POST', body: routes });
            toast(`已导入 ${res.imported} 个节点` + (res.skipped?.length ? `，跳过 ${res.skipped.length} 个` : ''));
            res.skipped?.forEach(s => toast(`跳过 ${s.prefix}：${s.reason}`, 'err'));
        } catch (err) { toastError(err); }
    }

    on(root, {
        exportConfig,
        pickImport: () => root.querySelector('[data-change="importFile"]').click(),
    });
    on(root, { importFile, placeMode: el => showMode(el.value) }, 'change');
    on(root, { placement: submitPlacement }, 'submit');

    showMode('smart');
    loadPlacement();
}

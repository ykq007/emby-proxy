import { api } from '../api.js';
import { html, raw, render } from '../html.js';
import { pageHash } from '../nav.js';
import { confirm, on, toast, toastError } from '../ui.js';
import { enabledCount, isSensitiveKey, mergeHeaders, parseCurl, parseHeaders, serializeHeaders } from './nodes-headers.js';

// '~' can never be part of a prefix (letters, digits, _ and - only), so '#nodes/~new' cannot shadow a node.
const NEW = '~new';
const DEFAULT_ICON_URL = 'https://emby-icon.vercel.app/TFEL-Emby.json';
const ICON_URL_KEY = 'custom_icon_url';

// The hints describe what src/emby/headers.js really does in each mode.
const MODES = {
    off: { short: '保守', label: '保守 (抹除IP)', hint: '不向上游传递访客 IP。' },
    realip_only: { short: '严格', label: '严格 (透传IP)', hint: '用 X-Real-IP 把访客 IP 传给上游。' },
    dual: { short: '兼容', label: '兼容 (双重透传)', hint: '同时用 X-Real-IP 和 X-Forwarded-For 传递访客 IP。' },
    strict: { short: '强力', label: '强力 (防403)', hint: '把 Origin / Referer 改成上游地址并传递访客 IP。上游返回 403 时使用。' },
};
const TEMPLATES = [['Authorization', 'Bearer '], ['Cookie', ''], ['X-Emby-Token', ''], ['X-Forwarded-For', ''], ['User-Agent', '']];

const FILM = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>');
const EYE = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>');

const splitTargets = target => String(target || '').split(',').map(s => s.trim()).filter(Boolean);
function hostOf(target) {
    const first = splitTargets(target)[0] || '';
    try { return new URL(first).host; } catch { return first; }
}
const lsGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
const lsSet = (key, value) => { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* storage blocked */ } };

export function mount(root, page) {
    const ac = new AbortController();
    render(root, html`<div class="empty"><span>加载中…</span></div>`);
    api('/api/routes', { signal: ac.signal }).then(routes => {
        if (!page.arg) listView(root, routes);
        else editorView(root, routes, page.arg);
    }).catch(err => {
        if (ac.signal.aborted) return;
        render(root, html`<div class="empty err" role="alert"><b>节点加载失败</b><span>${err.message}</span></div>`);
    });
    return () => {
        ac.abort();
        document.querySelectorAll('dialog.nodes-dlg').forEach(d => d.close());
    };
}

function listView(root, routes) {
    const add = html`<a class="btn pri nodes-add" href="${pageHash('nodes', NEW)}">添加节点</a>`;
    render(root, html`
        <div class="toolbar"><span class="muted"><span class="num">${routes.length}</span> 个节点</span><span class="grow"></span>${add}</div>
        ${routes.length ? html`
        <div class="tbl-wrap"><table class="tbl nodes-tbl">
            <thead><tr><th>名称</th><th>路径</th><th class="nd-wide">分组</th><th class="nd-wide">模式</th><th class="nd-wide">主源</th></tr></thead>
            <tbody>${routes.map(r => html`
                <tr class="clickable" data-action="open" data-prefix="${r.prefix}">
                    <td><a href="${pageHash('nodes', r.prefix)}">${r.remark || r.prefix}</a><div class="nd-narrow faint num">${hostOf(r.target)}</div></td>
                    <td class="num">/${r.prefix}</td>
                    <td class="nd-wide">${r.group_name || html`<span class="faint">—</span>`}</td>
                    <td class="nd-wide">${MODES[r.mode]?.short || r.mode}</td>
                    <td class="nd-wide num">${hostOf(r.target)}</td>
                </tr>`)}
            </tbody>
        </table></div>` : html`<div class="empty"><b>还没有节点</b><span>添加第一个反代节点后，它会出现在这里。</span></div>`}`);
    on(root, { open: el => { location.hash = pageHash('nodes', el.dataset.prefix); } });
}

function editorView(root, routes, arg) {
    const isNew = arg === NEW;
    const route = isNew ? null : routes.find(r => r.prefix === arg);
    if (!isNew && !route) {
        render(root, html`<div class="empty err" role="alert"><b>找不到节点 /${arg}</b><span>它可能已被删除或改名。</span><a class="btn nd-back" href="#nodes">返回节点列表</a></div>`);
        return;
    }
    const r = route || { prefix: '', remark: '', group_name: '', mode: 'off', target: '', custom_headers: '', keepalive_days: 0, emby_username: '', has_emby_password: 0, icon: '', cache_img: 'on' };
    const targets = splitTargets(r.target);
    while (targets.length < 2) targets.push('');
    let headers = parseHeaders(r.custom_headers).map(h => ({ ...h, masked: isSensitiveKey(h.key) }));
    let icons = null;
    const icon = { url: r.icon || '', name: r.icon ? '已选择图标' : '默认' };
    const mode = MODES[r.mode] ? r.mode : 'off';

    render(root, html`
        <div class="nd-head">
            <a class="btn sm nd-back" href="#nodes">‹ 全部节点</a>
            <h1>${isNew ? '添加节点' : r.remark || r.prefix}</h1>
            ${isNew ? '' : html`<span class="faint num">/${r.prefix}</span>`}
        </div>
        <form class="nd-form" autocomplete="off">
            <section class="sec">
                <div class="sec-head"><h2>基础信息</h2><p>备注用于显示，路径后缀决定访问路径</p></div>
                <div class="fields">
                    <label class="field"><span>备注</span><input name="remark" required placeholder="如：Misaka服" value="${r.remark}"></label>
                    <label class="field"><span>路径后缀</span><input name="prefix" class="num" required placeholder="如：misaka" value="${r.prefix}"></label>
                    <label class="field"><span>分组（可选）</span><input name="group_name" placeholder="如：家宽" value="${r.group_name || ''}"></label>
                    <label class="field"><span>反代模式</span>
                        <select name="mode" data-change="mode" aria-describedby="nd-mode-hint">
                            ${Object.entries(MODES).map(([k, m]) => html`<option value="${k}" ${k === mode ? 'selected' : ''}>${m.label}</option>`)}
                        </select>
                        <span class="field-hint" id="nd-mode-hint">${MODES[mode].hint}</span>
                    </label>
                </div>
            </section>

            <section class="sec">
                <div class="sec-head"><h2>上游线路</h2><p>主源失败时按顺序回退到备用，支持魔改分离版推流</p></div>
                <div class="nd-targets" data-part="targets"></div>
                <div class="sec-actions"><button type="button" class="btn sm" data-action="addTarget">+ 添加备用线路</button></div>
            </section>

            <section class="sec">
                <div class="sec-head"><h2>自定义请求头</h2><p>转发到上游时附加，<span class="num" data-part="count">0</span> 条已启用</p></div>
                <div class="hed-list" data-part="headers"></div>
                <div class="sec-actions">
                    <button type="button" class="btn sm" data-action="addHeader">+ 添加请求头</button>
                    <button type="button" class="btn sm" data-action="importHeaders">从节点导入</button>
                    <button type="button" class="btn sm" data-action="curl">粘贴 cURL…</button>
                </div>
                <div class="nd-templates"><span class="faint">常用模板</span>
                    ${TEMPLATES.map(([k, v]) => html`<button type="button" class="btn sm" data-action="template" data-key="${k}" data-value="${v}">+ ${k}</button>`)}
                </div>
                <p class="field-hint">保存时自动忽略空行、注释 (#) 和重复键。</p>
            </section>

            <section class="sec">
                <div class="sec-head"><h2>保号与计数账号</h2></div>
                <div class="fields">
                    <label class="field"><span>保号提醒（天）</span>
                        <input type="number" name="keepalive_days" class="num" min="0" max="365" placeholder="0" value="${parseInt(r.keepalive_days, 10) || 0}" aria-describedby="nd-ka-hint">
                        <span class="field-hint" id="nd-ka-hint">超过 N 天未观看将通过 Telegram 提醒，0 = 关闭</span>
                    </label>
                    <label class="field"><span>媒体计数用户名（可选）</span>
                        <input name="emby_username" placeholder="留空使用全局共享账号" value="${r.emby_username || ''}" aria-describedby="nd-acct-hint">
                    </label>
                    <label class="field"><span>媒体计数密码</span>
                        <input type="password" name="emby_password" autocomplete="new-password" placeholder="${r.has_emby_password ? '已设置密码（留空不改）' : '独立密码（留空不改）'}" aria-describedby="nd-acct-hint">
                    </label>
                    <p class="field-hint wide" id="nd-acct-hint">为本节点单独指定 Emby 账号拉取媒体库计数。用户名留空则使用全局共享账号。密码不会回显，留空表示不修改。</p>
                </div>
            </section>

            <section class="sec">
                <div class="sec-head"><h2>显示与缓存</h2></div>
                <div class="nd-display">
                    <div class="nd-icon">
                        <button type="button" class="nd-pick" data-action="iconToggle" aria-expanded="false" aria-controls="nd-icon-panel">
                            <span class="nd-icon-preview" data-part="iconPreview"></span>
                            <span><b>节点图标</b><span class="faint" data-part="iconName"></span></span>
                        </button>
                        <div class="nd-icon-panel" id="nd-icon-panel" hidden>
                            <div class="nd-icon-lib">
                                <input type="url" data-part="iconLib" aria-label="自定义 JSON 图标库链接" placeholder="自定义 JSON 图标库链接">
                                <button type="button" class="btn sm pri" data-action="iconLibLoad">加载</button>
                                <button type="button" class="btn sm" data-action="iconLibReset">默认库</button>
                            </div>
                            <input type="search" data-input="iconSearch" aria-label="搜索图标名称" placeholder="搜索图标名称">
                            <div class="nd-icon-grid" data-part="iconGrid"></div>
                        </div>
                    </div>
                    <label class="nd-pick nd-switch">
                        <input type="checkbox" class="switch" name="cache_img" ${r.cache_img !== 'off' ? 'checked' : ''}>
                        <span><b>海报 &amp; 静态资源缓存</b><span class="faint">降低上游压力，建议开启</span></span>
                    </label>
                </div>
            </section>

            <div class="sec nd-foot">
                <button type="submit" class="btn pri">${isNew ? '保存节点' : '保存修改'}</button>
                <a class="btn" href="#nodes">取消</a>
                <span class="faint nd-foot-note">保存到 Cloudflare D1，1 分钟内全部生效</span>
                ${isNew ? '' : html`<button type="button" class="btn danger" data-action="remove">删除节点</button>`}
            </div>
        </form>`);

    const form = root.querySelector('form');
    const part = name => root.querySelector(`[data-part="${name}"]`);

    const drawTargets = () => render(part('targets'), targets.map((t, i) => html`
        <div class="nd-target">
            <label class="nd-tag ${i ? '' : 'pri'}" for="nd-t${i}">${i ? '备 ' + i : '主源'}</label>
            <input type="url" id="nd-t${i}" class="num" data-input="target" data-i="${i}" value="${t}" ${i ? '' : 'required'}
                placeholder="${i ? `备用线路 ${i}（选填，主源挂掉时触发）` : '主线路地址（如 http://1.1.1.1:8096）'}">
            ${i ? html`<button type="button" class="icon-btn" data-action="removeTarget" data-i="${i}" aria-label="删除备用线路 ${i}">×</button>` : html`<span></span>`}
        </div>`));

    const drawCount = () => { part('count').textContent = enabledCount(headers); };
    const drawHeaders = () => {
        render(part('headers'), headers.length ? headers.map((h, i) => {
            const name = h.key || '新请求头';
            return html`
            <div class="hed-row ${h.on ? '' : 'off'}">
                <span class="hed-grip" aria-hidden="true" title="拖拽排序">⋮⋮</span>
                <input class="hed-k num" data-input="hkey" data-i="${i}" value="${h.key}" placeholder="Header-Name" aria-label="请求头名称">
                <span class="hed-v">
                    <input type="${h.masked ? 'password' : 'text'}" class="num" data-input="hval" data-i="${i}" value="${h.value}" placeholder="value" aria-label="${name} 的值">
                    <button type="button" class="icon-btn hed-mask" data-action="mask" data-i="${i}" aria-pressed="${h.masked ? 'false' : 'true'}" aria-label="显示 ${name} 的值" ${h.masked || isSensitiveKey(h.key) ? '' : 'hidden'}>${EYE}</button>
                </span>
                <label class="hed-on" title="${h.on ? '已启用' : '已停用'}"><input type="checkbox" class="switch" data-change="hon" data-i="${i}" ${h.on ? 'checked' : ''} aria-label="启用 ${name}"></label>
                <button type="button" class="icon-btn" data-action="delHeader" data-i="${i}" aria-label="删除 ${name}">×</button>
            </div>`;
        }) : html`<div class="hed-empty faint">尚未添加任何请求头。点「添加请求头」或从下方模板插入。</div>`);
        drawCount();
    };
    const setHeaders = next => { headers = next.map(h => ({ masked: isSensitiveKey(h.key), ...h })); drawHeaders(); };

    const drawIcon = () => {
        render(part('iconPreview'), icon.url ? html`<img src="${icon.url}" alt="">` : FILM);
        part('iconName').textContent = icon.url ? icon.name : '默认 · 点击选择';
    };
    const drawIconGrid = (filter = '') => {
        const q = filter.trim().toLowerCase();
        const list = (icons || []).filter(it => (it.name || '').toLowerCase().includes(q));
        render(part('iconGrid'), [
            html`<button type="button" class="nd-icon-item" data-action="pickIcon" data-url="" data-name="默认" title="使用默认图标" aria-label="使用默认图标">${FILM}</button>`,
            list.map(it => html`<button type="button" class="nd-icon-item" data-action="pickIcon" data-url="${it.url}" data-name="${it.name || '图标'}" title="${it.name || '图标'}"><img src="${it.url}" alt="${it.name || '图标'}" loading="lazy"></button>`),
        ]);
    };
    async function loadIcons(url) {
        const grid = part('iconGrid');
        render(grid, html`<div class="nd-icon-msg faint">加载图标库中…</div>`);
        part('iconLib').value = url === DEFAULT_ICON_URL ? '' : url;
        try {
            const data = await (await fetch(url)).json();
            icons = Array.isArray(data?.icons) ? data.icons
                : Array.isArray(data) ? data
                    : Object.entries(data || {}).map(([name, u]) => ({ name, url: u }));
            if (icon.url) icon.name = icons.find(it => it.url === icon.url)?.name || icon.name;
            drawIcon();
            drawIconGrid(root.querySelector('[data-input="iconSearch"]').value);
        } catch {
            icons = null;
            render(grid, html`<div class="nd-icon-msg field-err">获取图标库失败，请检查链接或网络状态</div>`);
        }
    }

    function modal(content) {
        const d = document.createElement('dialog');
        d.className = 'modal nodes-dlg';
        render(d, content);
        d.addEventListener('close', () => d.remove());
        d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
        document.body.append(d);
        d.showModal();
        return d;
    }

    function openImport() {
        const current = isNew ? '' : r.prefix;
        const sources = routes.map(n => ({ n, count: parseHeaders(n.custom_headers).length })).filter(s => s.n.prefix !== current && s.count > 0);
        const d = modal(html`
            <div class="modal-body">
                <h2>从已有节点导入请求头</h2>
                <p class="muted">选择一个源节点，把它的请求头合并到当前编辑器。同名键以源节点为准，其余追加。</p>
                ${sources.length ? html`<div class="sheet-list">${sources.map(s => html`
                    <button type="button" data-action="pick" data-prefix="${s.n.prefix}"><span class="grow">${s.n.remark || s.n.prefix}</span><span class="faint num">/${s.n.prefix} · ${s.count} 个头</span></button>`)}
                </div>` : html`<p class="faint">没有其它带自定义请求头的节点可导入。</p>`}
                <div class="modal-actions"><button type="button" class="btn" data-close>取消</button></div>
            </div>`);
        on(d, {
            pick: el => {
                const src = routes.find(n => n.prefix === el.dataset.prefix);
                const res = mergeHeaders(headers, parseHeaders(src.custom_headers), 'replace');
                setHeaders(res.rows);
                d.close();
                toast(`导入 ${res.added + res.updated} 条请求头` + (res.updated ? `（${res.updated} 条覆盖同名）` : ''));
            },
        });
    }

    function openCurl() {
        const d = modal(html`
            <form method="dialog">
                <h2>从 cURL 命令导入</h2>
                <p class="muted">粘贴浏览器 DevTools「Copy as cURL」的内容，自动提取所有 -H 请求头。已有的同名请求头保持不变。</p>
                <textarea aria-label="cURL 命令内容" placeholder="curl 'https://example.com/emby/Users/AuthenticateByName' \\&#10;  -H 'x-emby-token: abc123' \\&#10;  --compressed"></textarea>
                <div class="modal-actions">
                    <button class="btn" value="cancel">取消</button>
                    <button type="button" class="btn pri" data-action="parse">解析并导入</button>
                </div>
            </form>`);
        on(d, {
            parse: () => {
                const found = parseCurl(d.querySelector('textarea').value);
                const res = mergeHeaders(headers, found, 'skip');
                if (!res.added) {
                    toast(found.length ? '这些请求头都已存在' : '未在 cURL 中找到 -H 请求头', 'err');
                    return;
                }
                setHeaders(res.rows);
                d.close();
                toast(`导入 ${res.added} 条请求头`);
            },
        });
    }

    on(root, {
        addTarget: () => {
            targets.push('');
            drawTargets();
            root.querySelector(`#nd-t${targets.length - 1}`).focus();
        },
        removeTarget: el => { targets.splice(+el.dataset.i, 1); drawTargets(); },
        addHeader: () => {
            setHeaders([...headers, { key: '', value: '', on: true }]);
            root.querySelector('.hed-row:last-child .hed-k').focus();
        },
        template: el => {
            const { key, value } = el.dataset;
            const hit = headers.find(h => h.key.trim().toLowerCase() === key.toLowerCase());
            if (hit) {
                hit.on = true;
                toast(`「${key}」已存在`);
            } else {
                headers.push({ key, value, on: true, masked: isSensitiveKey(key) });
            }
            drawHeaders();
        },
        delHeader: el => { headers.splice(+el.dataset.i, 1); drawHeaders(); },
        mask: el => {
            const h = headers[+el.dataset.i];
            h.masked = !h.masked;
            el.closest('.hed-v').querySelector('input').type = h.masked ? 'password' : 'text';
            el.setAttribute('aria-pressed', String(!h.masked));
        },
        importHeaders: openImport,
        curl: openCurl,
        iconToggle: el => {
            const panel = root.querySelector('#nd-icon-panel');
            panel.hidden = !panel.hidden;
            el.setAttribute('aria-expanded', String(!panel.hidden));
            if (!panel.hidden && !icons) loadIcons(lsGet(ICON_URL_KEY) || DEFAULT_ICON_URL);
        },
        iconLibLoad: () => {
            const url = part('iconLib').value.trim();
            if (!/^https?:\/\//.test(url)) return toast(url ? '请输入合法的 URL' : '请输入图标库 JSON 链接', 'err');
            lsSet(ICON_URL_KEY, url);
            loadIcons(url);
        },
        iconLibReset: () => {
            lsSet(ICON_URL_KEY, '');
            toast('已恢复默认图标库');
            loadIcons(DEFAULT_ICON_URL);
        },
        pickIcon: el => {
            icon.url = el.dataset.url;
            icon.name = el.dataset.name;
            drawIcon();
            const panel = root.querySelector('#nd-icon-panel');
            panel.hidden = true;
            root.querySelector('[data-action="iconToggle"]').setAttribute('aria-expanded', 'false');
        },
        remove: async () => {
            const ok = await confirm({
                title: `删除节点「${r.remark || r.prefix}」（/${r.prefix}）？`,
                body: '该节点的上游线路、自定义请求头与独立 Emby 凭据会一并删除，且不可恢复。',
                ok: '删除节点',
                danger: true,
            });
            if (!ok) return;
            try {
                await api('/api/routes?prefix=' + encodeURIComponent(r.prefix), { method: 'DELETE' });
                toast('节点已删除');
                location.hash = '#nodes';
            } catch (err) { toastError(err); }
        },
    });

    on(root, {
        target: el => { targets[+el.dataset.i] = el.value; },
        hkey: el => {
            const h = headers[+el.dataset.i];
            h.key = el.value;
            const sensitive = isSensitiveKey(h.key);
            const row = el.closest('.hed-row');
            if (sensitive && !h.masked) {
                h.masked = true;
                row.querySelector('[data-input="hval"]').type = 'password';
            }
            row.querySelector('.hed-mask').hidden = !(h.masked || sensitive);
            drawCount();
        },
        hval: el => { headers[+el.dataset.i].value = el.value; },
        iconSearch: el => { if (icons) drawIconGrid(el.value); },
    }, 'input');

    on(root, {
        mode: el => { root.querySelector('#nd-mode-hint').textContent = MODES[el.value].hint; },
        hon: el => {
            headers[+el.dataset.i].on = el.checked;
            el.closest('.hed-row').classList.toggle('off', !el.checked);
            el.parentElement.title = el.checked ? '已启用' : '已停用';
            drawCount();
        },
    }, 'change');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(form);
        const target = targets.map(t => t.trim().replace(/\/$/, '')).filter(Boolean).join(',');
        if (!target) return toast('请至少填写一个主线路地址', 'err');
        const body = {
            oldPrefix: isNew ? '' : r.prefix,
            prefix: String(f.get('prefix')).trim().replace(/^\/+/, ''),
            target,
            mode: f.get('mode'),
            remark: String(f.get('remark')).trim(),
            group_name: String(f.get('group_name')).trim(),
            icon: icon.url,
            cache_img: f.get('cache_img') ? 'on' : 'off',
            custom_headers: serializeHeaders(headers),
            keepalive_days: parseInt(f.get('keepalive_days'), 10) || 0,
            emby_username: String(f.get('emby_username')).trim(),
            emby_password: String(f.get('emby_password')),
        };
        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
            await api('/api/routes', { method: 'POST', body });
            toast('节点已部署');
            location.hash = '#nodes';
        } catch (err) {
            toastError(err);
            btn.disabled = false;
        }
    });

    drawTargets();
    drawHeaders();
    drawIcon();
    const list = part('headers');
    window.Sortable?.create(list, {
        handle: '.hed-grip',
        draggable: '.hed-row',
        animation: 150,
        onEnd: e => {
            if (e.oldIndex === e.newIndex) return;
            const [moved] = headers.splice(e.oldIndex, 1);
            headers.splice(e.newIndex, 0, moved);
            drawHeaders();
        },
    });
    if (isNew) form.elements.remark.focus();
}

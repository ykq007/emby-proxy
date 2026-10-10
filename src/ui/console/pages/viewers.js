import { html, render } from '../html.js';
import { api } from '../api.js';
import { confirm, on, openPanel, toast, toastError, openModal } from '../ui.js';
import { isFull, matrixColumns, quotaRoom, usedByNode } from './viewers-model.js';

const nodeName = n => html`${n.remark || n.prefix} <span class="faint num">/${n.prefix}</span>`;

export function mount(root) {
    let data = { viewers: [], nodes: [] };
    let createOpen = false;
    const libs = new Map();

    async function load() {
        try {
            data = await api('/api/viewers');
        } catch (err) {
            render(root, html`<div class="empty err" role="alert"><b>读取失败</b><span>${err.message}</span><button type="button" class="btn" data-action="reload">重试</button></div>`);
            return;
        }
        draw();
    }

    function draw() {
        const used = usedByNode(data.viewers);
        const cols = matrixColumns(data.nodes, data.viewers);
        const open = createOpen || !data.viewers.length;
        render(root, html`
            <section class="sec">
                <div class="sec-head">
                    <h2>账号</h2><span class="muted num">${data.viewers.length ? data.viewers.length + ' 个' : ''}</span>
                    <span class="grow"></span>
                    <button type="button" class="btn pri sm" data-action="toggleCreate" aria-expanded="${open}" aria-controls="vwCreate">新建账号</button>
                </div>
                <p class="muted">给朋友开独立账号。共用节点的上游 Emby 账号，但观看记录、收藏和继续观看各自独立。</p>
                <form class="vw-create" id="vwCreate" data-submit="create" ${open ? '' : 'hidden'}>
                    <label class="field"><span>用户名</span><input name="username" required autocomplete="off"></label>
                    <label class="field"><span>密码</span><input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="至少 6 位"></label>
                    <button class="btn pri">创建</button>
                </form>
            </section>
            ${data.viewers.map(v => accountBlock(v, cols, used))}
            ${!cols.length ? html`<p class="sec muted">还没有开启观看账号的节点。在下方节点列表里开启后，每个账号下会多一格。</p>` : ''}
            ${!data.viewers.length ? html`<p class="sec muted">还没有观看账号。用上方表单创建第一个。</p>` : ''}
            <p class="sec muted">格子里是该账号在该节点的并发配额。点格子修改配额或隐藏首页媒体库，点 + 授权。</p>
            <section class="sec">
                <div class="sec-head"><h2>节点</h2><p>开启后，该节点才接受观看账号登录。未开启的节点照常直通上游。开启时会用节点的 Emby 账号试登录一次，账号在部署节点里填写。</p></div>
            </section>
            ${data.nodes.length ? html`
                <div class="tbl-wrap">
                    <table class="tbl">
                        <thead><tr><th scope="col">节点</th><th scope="col" class="r">已分配</th><th scope="col">并发上限</th><th scope="col">允许观看账号登录</th></tr></thead>
                        <tbody>${data.nodes.map(n => html`
                            <tr>
                                <td>${nodeName(n)}</td>
                                <td class="r num ${isFull(n, used) ? 'vw-full' : ''}">${used[n.prefix] || 0}${n.max_concurrent ? ' / ' + n.max_concurrent : ''}</td>
                                <td class="vw-capcell"><input class="num" type="number" min="0" inputmode="numeric" value="${n.max_concurrent || ''}" placeholder="不限" aria-label="/${n.prefix} 并发上限，留空不限" data-change="nodeCap" data-prefix="${n.prefix}"></td>
                                <td><label class="hit"><input type="checkbox" class="switch" ${n.viewers_enabled ? 'checked' : ''} aria-label="/${n.prefix} 允许观看账号登录" data-change="nodeEnabled" data-prefix="${n.prefix}"></label></td>
                            </tr>`)}
                        </tbody>
                    </table>
                </div>`
            : html`<div class="empty"><b>还没有节点</b><span>先部署一个节点，再给观看账号授权。</span><a class="btn" href="#nodes">去部署节点</a></div>`}`);
    }

    function accountBlock(v, cols, used) {
        const byPrefix = Object.fromEntries(v.access.map(a => [a.prefix, a]));
        const total = v.access.reduce((s, a) => s + a.quota, 0);
        const unlimited = v.access.some(a => !a.quota);
        const meta = v.access.length ? `${v.access.length} 个节点 · 并发 ${unlimited ? '不限' : total}` : '未授权节点';
        return html`
            <section class="sec" aria-label="${v.username}">
                <div class="vw-head">
                    <div><div class="vw-who"><b>${v.username}</b>${v.enabled ? '' : html`<span class="st off"><i aria-hidden="true"></i>已停用</span>`}</div><div class="faint">${meta}</div></div>
                    <div class="vw-acts">
                        <label class="hit"><input type="checkbox" class="switch" ${v.enabled ? 'checked' : ''} aria-label="启用 ${v.username}" data-change="toggleViewer" data-id="${v.id}"></label>
                        <button type="button" class="btn sm" data-action="password" data-id="${v.id}">改密码</button>
                        <button type="button" class="btn sm danger" data-action="remove" data-id="${v.id}">删除</button>
                    </div>
                </div>
                <ul class="vw-grid">
                    ${cols.map(n => html`<li><span class="vw-node ${isFull(n, used) ? 'vw-full' : ''}" title="${n.remark || n.prefix} /${n.prefix}">${nodeName(n)}</span>${cell(v, n, byPrefix[n.prefix], used)}</li>`)}
                </ul>
            </section>`;
    }

    function cell(v, n, a, used) {
        if (a) {
            const hid = a.hidden_libraries.length;
            return html`<button type="button" class="vw-cell on num" data-action="cell" data-id="${v.id}" data-prefix="${n.prefix}"
                aria-label="${v.username} 在 /${n.prefix}：并发 ${a.quota || '不限'}${hid ? `，首页隐藏 ${hid} 个媒体库` : ''}。编辑">${a.quota || '不限'}${hid ? html`<small>隐 ${hid}</small>` : ''}</button>`;
        }
        if (!n.viewers_enabled) return html`<span class="faint" aria-label="/${n.prefix} 未开启观看账号">–</span>`;
        const full = isFull(n, used);
        return html`<button type="button" class="vw-cell add" data-action="cell" data-id="${v.id}" data-prefix="${n.prefix}" ${full ? 'disabled' : ''}
            title="${full ? '节点配额已分完' : '授权该节点'}" aria-label="授权 ${v.username} 使用 /${n.prefix}${full ? '（配额已分完）' : ''}">+</button>`;
    }

    const viewer = id => data.viewers.find(v => v.id === id);

    async function call(path, opts, done) {
        try {
            const res = await api(path, opts);
            if (done) toast(done);
            return res || true;
        } catch (err) {
            toastError(err);
            return false;
        } finally {
            await load();
        }
    }

    function openCell(btn) {
        const v = viewer(btn.dataset.id);
        const n = data.nodes.find(x => x.prefix === btn.dataset.prefix);
        if (!v || !n) return;
        const a = v.access.find(x => x.prefix === n.prefix);
        const cap = n.max_concurrent || 0;
        const room = quotaRoom(n, usedByNode(data.viewers), a?.quota || 0);
        const d = openPanel({
            title: (a ? '' : '授权 ') + v.username,
            sub: `${n.remark || n.prefix} /${n.prefix}`,
            content: html`
                <form class="sec" data-submit="saveAccess">
                    <label class="field"><span>并发配额</span>
                        <input name="quota" class="num" type="number" inputmode="numeric" min="${cap ? 1 : 0}" ${cap ? html`max="${room}"` : ''} value="${a ? a.quota || '' : 1}" placeholder="不限">
                        <span class="field-hint">${cap ? `节点上限 ${cap}，这个账号最多可设 ${room}。` : '节点不限并发。留空表示这个账号也不限。'}</span>
                    </label>
                </form>
                <div class="sec">
                    <div class="sec-head"><h2>首页隐藏的媒体库</h2><p>勾选的媒体库不在首页显示。搜索和继续观看不受影响。</p></div>
                    <div class="vw-libs" role="group" aria-label="首页隐藏的媒体库"><span class="faint">读取媒体库…</span></div>
                </div>
                <div class="sec sec-actions">
                    <button type="button" class="btn pri" data-action="saveAccess">${a ? '保存' : '授权'}</button>
                    ${a ? html`<button type="button" class="btn danger" data-action="revoke">移除访问</button>` : ''}
                </div>`,
        });
        const box = d.querySelector('.vw-libs');
        const hidden = a?.hidden_libraries || [];

        (async () => {
            try {
                if (!libs.has(n.prefix)) libs.set(n.prefix, (await api('/api/viewers/libraries?prefix=' + encodeURIComponent(n.prefix))).libraries);
                const list = libs.get(n.prefix);
                render(box, list.length
                    ? list.map(l => html`<label class="vw-lib"><input type="checkbox" value="${l.id}" ${hidden.includes(l.id) ? 'checked' : ''}>${l.name}</label>`)
                    : html`<span class="faint">该节点没有媒体库</span>`);
            } catch (err) {
                render(box, html`<span class="field-err">读取失败：${err.message}</span>`);
            }
        })();

        async function save() {
            const q = d.querySelector('[name="quota"]');
            if (!q.reportValidity()) return;
            // Libraries not loaded yet: keep the current hidden list instead of clearing it.
            const ids = box.querySelector('input')
                ? [...box.querySelectorAll('input:checked')].map(c => c.value)
                : hidden;
            const ok = await call('/api/viewers/access', { method: 'POST', body: { viewer_id: v.id, prefix: n.prefix, quota: q.value === '' ? 0 : Number(q.value), hidden_libraries: ids } }, a ? '已保存' : '已授权');
            if (ok) d.close();
        }

        async function revoke() {
            if (!await confirm({ title: `移除 ${v.username} 在 /${n.prefix} 的访问？`, ok: '移除', danger: true })) return;
            if (await call(`/api/viewers/access?viewer_id=${encodeURIComponent(v.id)}&prefix=${encodeURIComponent(n.prefix)}`, { method: 'DELETE' }, '已移除')) d.close();
        }

        on(d, { saveAccess: save, revoke });
        on(d, { saveAccess: (f, e) => { e.preventDefault(); save(); } }, 'submit');
    }

    function changePassword(btn) {
        const v = viewer(btn.dataset.id);
        if (!v) return;
        const d = openModal(html`
            <form>
                <h2>修改 ${v.username} 的密码</h2>
                <label class="field"><span>新密码</span><input name="password" type="password" minlength="6" required autocomplete="new-password" placeholder="至少 6 位" autofocus></label>
                <p class="field-err" hidden></p>
                <p class="muted">改密码后，该账号所有设备都会被登出。</p>
                <div class="modal-actions">
                    <button type="button" class="btn" data-cancel>取消</button>
                    <button class="btn pri">修改密码</button>
                </div>
            </form>`);
        const f = d.querySelector('form');
        const errEl = d.querySelector('.field-err');
        d.querySelector('[data-cancel]').onclick = () => d.close();
        f.noValidate = true;
        f.onsubmit = async e => {
            e.preventDefault();
            const pw = f.password.value;
            if (pw.length < 6) {
                errEl.textContent = '密码至少 6 位';
                errEl.hidden = false;
                f.password.setAttribute('aria-invalid', 'true');
                f.password.focus();
                return;
            }
            if (await call('/api/viewers', { method: 'POST', body: { id: v.id, password: pw } }, '密码已修改')) d.close();
        };
    }

    async function remove(btn) {
        const v = viewer(btn.dataset.id);
        if (!v) return;
        if (!await confirm({ title: `删除账号 ${v.username}？`, body: '会删除该账号及其全部观看记录，不可恢复。', ok: '删除', danger: true })) return;
        call('/api/viewers?id=' + encodeURIComponent(v.id), { method: 'DELETE' }, '已删除');
    }

    async function create(f, e) {
        e.preventDefault();
        try {
            await api('/api/viewers', { method: 'POST', body: { username: f.username.value.trim(), password: f.password.value } });
        } catch (err) { toastError(err); return; }
        toast('已创建');
        createOpen = false;
        load();
    }

    on(root, {
        reload: load,
        toggleCreate: () => {
            createOpen = root.querySelector('#vwCreate').hidden;
            draw();
            if (createOpen) root.querySelector('#vwCreate input').focus();
        },
        cell: openCell,
        password: changePassword,
        remove,
    });
    on(root, {
        toggleViewer: el => { el.disabled = true; call('/api/viewers', { method: 'POST', body: { id: el.dataset.id, enabled: el.checked } }); },
        nodeEnabled: el => { el.disabled = true; call('/api/viewers/node', { method: 'POST', body: { prefix: el.dataset.prefix, viewers_enabled: el.checked } }, '已保存'); },
        nodeCap: el => call('/api/viewers/node', { method: 'POST', body: { prefix: el.dataset.prefix, max_concurrent: Number(el.value) } }, '已保存'),
    }, 'change');
    on(root, { create }, 'submit');

    load();
}

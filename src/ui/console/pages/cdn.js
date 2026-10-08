import { html, render } from '../html.js';
import { api } from '../api.js';
import { confirm, on, toast, toastError, openModal } from '../ui.js';
import { coloSplit, domainMs, latencyCell, sortByLatency } from './speed-lib.js';

const BANDWIDTH_BYTES = 10 * 1024 * 1024;

// Any HTTP response resolves a no-cors fetch; DNS, TCP or TLS failure and the timeout reject.
async function probe(domain, timeoutMs = 4000) {
    const start = performance.now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
        await fetch(`https://${domain}/cdn-cgi/trace?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal });
        return { ms: Math.round(performance.now() - start), ok: true };
    } catch {
        return { ms: -1, ok: false };
    } finally {
        clearTimeout(timer);
    }
}

// Small modal form; resolves { domain, note } or null.
function askDomain() {
    return new Promise(resolve => {
        const d = openModal(html`
            <form method="dialog">
                <h2>添加自定义优选域名</h2>
                <label class="field"><span>域名</span><input name="domain" required placeholder="example.com" pattern="[A-Za-z0-9.\\-]+" autocomplete="off" spellcheck="false"></label>
                <label class="field"><span>备注（可空）</span><input name="note" autocomplete="off"></label>
                <div class="modal-actions">
                    <button type="button" class="btn" data-close>取消</button>
                    <button class="btn pri" value="add">添加</button>
                </div>
            </form>`);
        d.addEventListener('close', () => {
            const f = d.querySelector('form');
            resolve(d.returnValue === 'add' ? { domain: f.domain.value.trim(), note: f.note.value.trim() } : null);
        });
    });
}

export function mount(root) {
    let items = [];
    let live = {};
    let sortDir = 'asc';
    const dns = { loaded: false, ready: false, domain: '', active: '' };

    render(root, html`
        <div class="toolbar cdn-tools">
            <button type="button" class="btn pri" data-action="testAll">全部测速（本地）</button>
            <button type="button" class="btn" data-action="bandwidth" title="测当前 DNS 路径的实际下载带宽">当前路径带宽</button>
            <button type="button" class="btn" data-action="add">+ 添加自定义</button>
        </div>
        <div class="sec cdn-info">
            <div class="cdn-dns" aria-live="polite"></div>
            <p class="cdn-bw muted" aria-live="polite" hidden></p>
            <p class="cdn-colo muted"></p>
        </div>
        <div class="tbl-wrap">
            <table class="tbl cdn-tbl">
                <thead><tr>
                    <th>域名</th>
                    <th>备注</th>
                    <th>启用</th>
                    <th class="cdn-sort" aria-sort="ascending"><button type="button" class="sp-th-btn" data-action="sort">延迟 <span aria-hidden="true">↑</span></button></th>
                    <th class="r">操作</th>
                </tr></thead>
                <tbody><tr><td colspan="5"><div class="empty"><span>加载中…</span></div></td></tr></tbody>
            </table>
        </div>`);

    const $ = s => root.querySelector(s);
    const msOf = it => domainMs(it, live[it.id]);

    function drawDns() {
        render($('.cdn-dns'), !dns.loaded ? html`<span class="st off"><i></i>读取 DNS 状态中…</span>` : dns.ready
            ? html`<span class="st"><i></i>DNS 替换已就绪</span> <span class="muted">域名 <span class="num">${dns.domain || '?'}</span>${dns.active ? html`，当前指向 <span class="num">${dns.active}</span>` : ''}。点表格里的「替换 DNS」切换线路。</span>`
            : html`<p class="note">缺少环境变量 <span class="num">CF_API_TOKEN</span> / <span class="num">CF_ZONE_ID</span> / <span class="num">CF_DOMAIN</span>，无法替换 DNS。请到 Cloudflare Worker 设置中补齐。</p>`);
    }

    function draw() {
        const finite = items.map(msOf).filter(m => m != null);
        const best = finite.length ? Math.min(...finite) : null;
        render($('tbody'), items.length ? sortByLatency(items, msOf, sortDir).map(it => {
            const ms = msOf(it);
            const isActive = dns.active && String(it.domain).toLowerCase() === dns.active;
            const text = live[it.id] && !live[it.id].ok ? '失败' : ms == null ? '—' : undefined;
            return html`<tr class="${isActive ? 'cdn-active' : ''}">
                <td class="cdn-dom"><span class="num">${it.domain}</span>${isActive ? html` <span class="sp-tag ok">生效中</span>` : ''}${it.builtin ? html` <span class="sp-tag">内置</span>` : ''}${ms != null && ms === best ? html` <span class="sp-tag acc">最快</span>` : ''}</td>
                <td class="cdn-note wrap muted">${it.note || ''}</td>
                <td class="cdn-en"><input type="checkbox" class="switch" data-change="toggle" data-id="${it.id}" ${it.enabled ? 'checked' : ''} aria-label="启用 ${it.domain}"></td>
                <td class="cdn-lat">${latencyCell(ms, text)}</td>
                <td class="r cdn-act">
                    ${isActive ? html`<span class="st"><i></i>当前线路</span>`
                        : html`<button type="button" class="btn sm" data-action="replace" data-domain="${it.domain}" ${dns.ready ? '' : 'disabled'}
                            title="${dns.ready ? '把 DNS 记录的 CNAME 替换为此域名' : '请先配置 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN'}">替换 DNS</button>`}
                    ${it.builtin ? '' : html`<button type="button" class="btn sm danger" data-action="del" data-id="${it.id}" data-domain="${it.domain}">删除</button>`}
                </td>
            </tr>`;
        }) : html`<tr><td colspan="5"><div class="empty"><b>暂无优选域名</b><span>点「+ 添加自定义」加一个。</span></div></td></tr>`);
        const th = $('.cdn-sort');
        th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
        th.querySelector('span').textContent = sortDir === 'asc' ? '↑' : '↓';
    }

    async function load() {
        try {
            const data = await api('/api/optimized-domains');
            items = data.items || [];
            $('.cdn-colo').textContent = coloSplit(data.colos || []);
            draw();
        } catch (err) {
            render($('tbody'), html`<tr><td colspan="5"><div class="empty err" role="alert"><b>加载失败</b><span>${err.message}</span></div></td></tr>`);
        }
    }

    async function loadDns() {
        try {
            const ready = await api('/api/dns-ready');
            Object.assign(dns, { ready: !!ready.ready, domain: ready.domain || '', active: '' });
            if (dns.ready) {
                const data = await api('/api/get-dns').catch(() => null);
                const cname = (data?.result || []).find(r => r.type === 'CNAME');
                dns.active = cname ? String(cname.content || '').trim().toLowerCase() : '';
            }
        } catch {
            dns.ready = false;
        }
        dns.loaded = true;
        drawDns();
        draw();
    }

    on(root, {
        testAll: async btn => {
            btn.disabled = true;
            btn.textContent = '测速中…';
            try {
                const data = await api('/api/optimized-domains');
                items = data.items || [];
                const measured = await Promise.all(items.filter(it => it.enabled).map(async it => ({ id: it.id, ...await probe(it.domain) })));
                live = Object.fromEntries(measured.map(m => [m.id, { ms: m.ms, ok: m.ok }]));
                sortDir = 'asc';
                draw();
                await api('/api/optimized-domains/speedtest', { method: 'POST', body: { items: measured.map(m => ({ id: m.id, ms: m.ms })) } })
                    .catch(err => toastError(new Error('测速结果保存失败：' + err.message)));
                toast('本地测速完成，已按延迟排序');
            } catch (err) {
                toastError(new Error('拉取域名列表失败：' + err.message));
            } finally {
                btn.disabled = false;
                btn.textContent = '全部测速（本地）';
            }
        },
        bandwidth: async btn => {
            const out = $('.cdn-bw');
            out.hidden = false;
            out.textContent = '测速中（下载 10 MB）…';
            btn.disabled = true;
            try {
                const start = performance.now();
                const res = await fetch(`/api/speedtest-down?bytes=${BANDWIDTH_BYTES}&_=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
                if (!res.ok) { out.textContent = '端点返回 ' + res.status; return; }
                const reader = res.body.getReader();
                let received = 0;
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    received += value.length;
                }
                const sec = (performance.now() - start) / 1000;
                const mbps = received * 8 / 1e6 / sec;
                render(out, html`下载 <span class="num">${(received / 1048576).toFixed(2)}</span> MiB，用时 <span class="num">${sec.toFixed(2)}</span> 秒，带宽 <b class="num">${mbps.toFixed(2)} Mbps</b>（<span class="num">${(received / 1048576 / sec).toFixed(2)}</span> MiB/s）`);
                toast('当前路径带宽：' + mbps.toFixed(1) + ' Mbps');
            } catch (err) {
                out.textContent = '测速失败：' + err.message;
            } finally {
                btn.disabled = false;
            }
        },
        add: async () => {
            const input = await askDomain();
            if (!input?.domain) return;
            try {
                await api('/api/optimized-domains', { method: 'POST', body: input });
                toast('已添加 ' + input.domain);
                load();
            } catch (err) { toastError(new Error('添加失败：' + err.message)); }
        },
        del: async el => {
            if (!await confirm({ title: `删除 ${el.dataset.domain}？`, body: '只能删除自定义域名。内置域名可以停用。', ok: '删除', danger: true })) return;
            try {
                await api('/api/optimized-domains/' + el.dataset.id, { method: 'DELETE' });
                toast('已删除');
                load();
            } catch (err) { toastError(new Error('删除失败：' + err.message)); }
        },
        replace: async el => {
            const domain = el.dataset.domain;
            if (!await confirm({ title: `把 DNS 的 CNAME 换成 ${domain}？`, body: `${dns.domain || '域名'} 将指向这条线路。`, ok: '替换' })) return;
            el.disabled = true;
            try {
                const data = await api('/api/dns/replace', { method: 'POST', body: { domain } });
                toast('DNS 已替换为 ' + data.content);
                await loadDns();
            } catch (err) {
                toastError(new Error('DNS 替换失败：' + err.message));
                el.disabled = false;
            }
        },
        sort: () => {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            draw();
        },
    });

    on(root, {
        toggle: async el => {
            const it = items.find(i => String(i.id) === el.dataset.id);
            try {
                await api('/api/optimized-domains/' + el.dataset.id, { method: 'PATCH', body: { enabled: el.checked } });
                if (it) it.enabled = el.checked ? 1 : 0;
                toast((el.checked ? '已启用 ' : '已停用 ') + (it?.domain || ''));
            } catch (err) {
                el.checked = !el.checked;
                toastError(err);
            }
        },
    }, 'change');

    drawDns();
    load();
    loadDns();
}

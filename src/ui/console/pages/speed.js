import { html, render } from '../html.js';
import { api } from '../api.js';
import { confirm, on, openSheet, toast, toastError } from '../ui.js';
import { setCommands } from '../palette.js';
import {
    PROBE_TIMEOUT_MS, displayLatency, extractDomains, extractTargets, fastest,
    latencyCell, latencyGrade, recordType, sortByLatency,
} from './speed-lib.js';

const TYPES = [
    { value: 'all', short: '综合', label: '综合混合源' },
    { value: '电信', short: '电信', label: '电信专属' },
    { value: '联通', short: '联通', label: '联通专属' },
    { value: '移动', short: '移动', label: '移动专属' },
    { value: '多线', short: '多线', label: '多线 BGP' },
    { value: 'ipv6', short: 'IPv6', label: 'IPv6 节点' },
    { value: '优选', short: '优选', label: '顶尖优选库' },
];
const DEFAULT_API = 'https://ip.v2too.top/api/nodes';
const DNS_ENV_HINT = '缺少 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN';

// Row ms: undefined while probing, null after a timeout, else the shown latency.
const pending = r => r.ms === undefined;

export function mount(root) {
    let rows = [];
    const selected = new Set();
    const dns = { loaded: false, ready: false, ok: false, domain: '', records: [], error: '' };
    let dnsBusy = false;
    let sortDir = 'asc';

    render(root, html`
        <div class="sp">
            <section class="sec sp-dns" aria-live="polite"></section>
            <div class="toolbar sp-tools">
                <div class="seg" role="radiogroup" aria-label="预设源类型">
                    ${TYPES.map((t, i) => html`<label title="${t.label}"><input type="radio" name="spType" value="${t.value}" ${i === 0 ? 'checked' : ''}><span>${t.short}</span></label>`)}
                </div>
                <button type="button" class="btn pri sp-main" data-action="fetchRemote">提取预设源并测速</button>
                <button type="button" class="btn" data-action="testPasted">测试粘贴节点</button>
                <button type="button" class="btn" data-action="fetchApi">拉取 API</button>
                <span class="grow only-desk"></span>
                <button type="button" class="btn only-desk" data-action="submitSelected" data-dns>提交选中至 DNS <span class="num sp-count"></span></button>
                <button type="button" class="btn only-desk sp-more" popovertarget="spMenu" aria-label="更多操作">更多 ▾</button>
                <button type="button" class="btn only-phone" data-action="moreSheet" aria-label="更多操作">更多</button>
                <div id="spMenu" class="sp-menu" popover>
                    <button type="button" data-action="itdog">复制去 ITDog</button>
                    <button type="button" data-action="cname" data-dns>直推 CNAME（免测速）</button>
                    <button type="button" data-action="top3" data-dns>更新 TOP3 至 DNS</button>
                    <button type="button" class="danger" data-action="clear">清空列表</button>
                </div>
            </div>
            <details class="sec sp-custom">
                <summary>自定义来源 <span class="faint">节点 API 链接、粘贴的 IP 或域名</span></summary>
                <div class="fields">
                    <label class="field wide"><span>节点 API 链接（拉取 API 用，JSON 或文本）</span><input type="url" name="apiUrl" value="${DEFAULT_API}" autocomplete="off"></label>
                    <label class="field wide"><span>IPv4 / IPv6 / 优选域名（测试粘贴节点、直推 CNAME 用，自动提取）</span><textarea name="pasted" rows="3" spellcheck="false"></textarea></label>
                </div>
            </details>
            <p class="sp-hint muted" aria-live="polite">测速完成后勾选节点，再点「提交选中至 DNS」。</p>
            <div class="tbl-wrap">
                <table class="tbl sp-tbl">
                    <thead><tr>
                        <th class="sp-ck"><label class="sp-hit"><input type="checkbox" data-change="all" aria-label="全选测速节点"></label></th>
                        <th>节点（点击复制）</th>
                        <th class="sp-sort" aria-sort="ascending"><button type="button" class="sp-th-btn" data-action="sort">延迟 <span aria-hidden="true">↑</span></button></th>
                        <th>状态</th>
                        <th>记录 / 归属地</th>
                        <th class="r">操作</th>
                    </tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="sp-selbar" hidden>
                <span>已选 <b class="num sp-count"></b> 个</span>
                <button type="button" class="btn pri" data-action="submitSelected" data-dns>提交选中至 DNS</button>
            </div>
        </div>`);

    const $ = s => root.querySelector(s);
    const tbody = $('tbody');
    const hint = text => { $('.sp-hint').textContent = text; };
    const typeOf = () => TYPES.find(t => t.value === root.querySelector('input[name="spType"]:checked').value);
    const dnsWhy = () => dns.ok ? '' : 'DNS 未就绪：' + (dns.error || DNS_ENV_HINT);

    function drawDns() {
        const el = $('.sp-dns');
        const state = !dns.loaded ? html`<span class="st off"><i></i>读取中</span>`
            : !dns.ready ? html`<span class="st off"><i></i>未配置</span>`
                : dns.ok ? html`<span class="st"><i></i>已就绪</span>` : html`<span class="st err"><i></i>读取失败</span>`;
        const recs = dns.records.filter(r => ['A', 'AAAA', 'CNAME'].includes(r.type));
        const body = !dns.loaded ? ''
            : !dns.ready ? html`<p class="note">${DNS_ENV_HINT}，无法读写 DNS。到 Cloudflare Worker 的环境变量里补齐后刷新本页。</p>`
                : !dns.ok ? html`<p class="note err">${dns.error}</p>`
                    : recs.length ? html`<ul class="sp-recs">${recs.map(r => html`<li><span class="sp-tag">${r.type}</span><span class="num">${r.content}</span></li>`)}</ul>`
                        : html`<p class="muted">暂无解析记录</p>`;
        render(el, html`
            <div class="sec-head"><h2>当前生效解析</h2>${state}${dns.domain ? html`<span class="num muted">${dns.domain}</span>` : ''}</div>
            ${body}`);
    }

    function draw() {
        render(tbody, rows.length ? rows.map(r => {
            const grade = latencyGrade(r.ms);
            const where = r.type === 'CNAME' ? '优选域名' : (r.geo || '等待解析');
            return html`<tr>
                <td class="sp-ck"><label class="sp-hit"><input type="checkbox" data-change="pick" value="${r.target}" aria-label="选择 ${r.target}"
                    ${selected.has(r.target) ? 'checked' : ''} ${pending(r) || r.ms === null ? html`disabled title="${pending(r) ? '测速中' : '超时的节点不能勾选'}"` : ''}></label></td>
                <td class="sp-target"><button type="button" class="sp-copy num" data-action="copy" data-t="${r.target}" title="点击复制">${r.target}</button></td>
                <td class="sp-latc">${pending(r) ? latencyCell(null, '测算中…') : r.ms === null ? latencyCell(null, `> ${PROBE_TIMEOUT_MS} ms`) : latencyCell(r.ms)}</td>
                <td class="sp-st">${pending(r) ? html`<span class="st off"><i></i>测速中</span>`
                    : html`<span class="st ${grade.level}"><i></i>${grade.word}</span>`}</td>
                <td class="sp-rec"><span class="sp-tag">${r.type}</span> <span class="muted">${r.source} · ${where}</span></td>
                <td class="r sp-act"><button type="button" class="btn sm" data-action="one" data-t="${r.target}" data-dns
                    ${!dns.ok || dnsBusy || pending(r) ? html`disabled title="${dnsWhy() || '测速中'}"` : ''}>唯一解析</button></td>
            </tr>`;
        }) : html`<tr class="sp-none"><td colspan="6"><div class="empty"><b>暂无数据</b><span>提取预设源，或在「自定义来源」里粘贴 IP / 域名后测试。</span></div></td></tr>`);

        for (const t of selected) if (!rows.some(r => r.target === t)) selected.delete(t);
        const pickable = rows.filter(r => !pending(r) && r.ms !== null);
        const all = $('[data-change="all"]');
        all.checked = pickable.length > 0 && pickable.every(r => selected.has(r.target));
        all.indeterminate = selected.size > 0 && !all.checked;
        root.querySelectorAll('.sp-count').forEach(el => { el.textContent = selected.size || ''; });
        $('.sp-selbar').hidden = selected.size === 0;
        root.querySelector('.sp').classList.toggle('has-sel', selected.size > 0);
        const th = $('.sp-sort');
        th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
        th.querySelector('span').textContent = sortDir === 'asc' ? '↑' : '↓';
        root.querySelectorAll('.toolbar [data-dns], .sp-selbar [data-dns]').forEach(b => {
            b.disabled = !dns.ok || dnsBusy;
            b.title = dnsWhy();
        });
    }

    async function loadDns() {
        try {
            const ready = await api('/api/dns-ready');
            Object.assign(dns, { ready: !!ready.ready, domain: ready.domain || '' });
            if (dns.ready) {
                const data = await api('/api/get-dns');
                Object.assign(dns, { ok: true, error: '', records: Array.isArray(data.result) ? data.result : [] });
            } else {
                Object.assign(dns, { ok: false, error: '', records: [] });
            }
        } catch (err) {
            Object.assign(dns, { ok: false, error: '读取失败：' + err.message, records: [] });
        }
        dns.loaded = true;
        drawDns();
        draw();
    }

    async function probe(row) {
        const bare = row.target.replace(/[[\]]/g, '');
        if (row.type !== 'CNAME') {
            fetch(`https://api.ip.sb/geoip/${bare}`).then(r => r.json())
                .then(d => { row.geo = d.country || '未知'; }, () => { row.geo = '解析失败'; })
                .finally(draw);
        }
        const start = performance.now();
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
        // no-cors: any response or a TLS failure (normal for a bare IP) means the edge answered. Only the timeout fails.
        try {
            await fetch(`https://${row.target}/cdn-cgi/trace`, { mode: 'no-cors', signal: ctl.signal });
            row.ms = displayLatency(performance.now() - start, row.type);
        } catch (err) {
            row.ms = err.name === 'AbortError' ? null : displayLatency(performance.now() - start, row.type);
        } finally {
            clearTimeout(timer);
        }
        draw();
    }

    // New targets go on top, replacing earlier rows for the same target; the whole table is re-sorted at the end.
    async function testTargets(targets, source) {
        const fresh = targets.map(target => ({ target, type: recordType(target), source, ms: undefined, geo: '' }));
        rows = [...fresh, ...rows.filter(r => !targets.includes(r.target))];
        fresh.forEach(r => selected.delete(r.target));
        draw();
        await Promise.all(fresh.map(probe));
        rows = sortByLatency(rows, r => r.ms, sortDir);
        draw();
    }

    async function busy(btn, label, fn) {
        const text = btn.textContent;
        btn.disabled = true;
        btn.textContent = label;
        try { await fn(); } catch (err) { toastError(err); } finally {
            btn.disabled = false;
            btn.textContent = text;
        }
    }

    function needPasted(msg) {
        const area = $('textarea[name="pasted"]');
        if (area.value.trim()) return area.value;
        $('.sp-custom').open = true;
        area.focus();
        toast(msg);
        return '';
    }

    async function pushDns(ips, { title, danger = false, btn }) {
        const ok = await confirm({
            title,
            body: html`${ips.map(ip => html`<span class="num">${ip}</span><br>`)}<br>这会替换 ${dns.domain || '域名'} 下现有的 A / AAAA / CNAME 记录。`,
            ok: '更新 DNS',
            danger,
        });
        if (!ok) return;
        dnsBusy = true;
        draw();
        const label = btn?.textContent;
        if (btn) btn.textContent = '更新 DNS 中…';
        try {
            await api('/api/update-dns', { method: 'POST', body: { ips } });
            toast('DNS 已更新：' + ips.join(', '));
            await loadDns();
        } catch (err) {
            toastError(new Error('DNS 更新失败：' + err.message));
        } finally {
            dnsBusy = false;
            if (btn && btn.isConnected) btn.textContent = label;
            draw();
        }
    }

    const submitSelected = btn => {
        const ips = rows.filter(r => selected.has(r.target)).map(r => r.target);
        if (!ips.length) return toast('请先勾选要使用的节点');
        pushDns(ips, { title: `把勾选的 ${ips.length} 个节点写入 DNS？`, btn });
    };
    const top3 = () => {
        const ips = fastest(rows, 3);
        if (!ips.length) return toast('没有可用节点，请先测速');
        pushDns(ips, { title: `把最快的 ${ips.length} 个节点写入 DNS？` });
    };
    const cname = () => {
        const text = needPasted('请先在「自定义来源」里粘贴优选域名');
        if (!text) return;
        const domains = extractDomains(text);
        if (!domains.length) return toast('没有识别到域名，请检查输入');
        pushDns(domains, { title: '直接设为 CNAME 记录？', danger: true });
    };
    const itdog = () => {
        const ips = rows.map(r => r.target.replace(/^\[|\]$/g, ''));
        if (!ips.length) return toast('请先提取节点');
        navigator.clipboard.writeText(ips.join('\n')).then(() => {
            toast('节点已复制，即将打开 ITDog…');
            setTimeout(() => open('https://www.itdog.cn/batch_tcping/', '_blank', 'noopener'), 1500);
        }, toastError);
    };
    const clear = () => {
        rows = [];
        selected.clear();
        hint('列表已清空。');
        draw();
    };
    const closeMenu = () => $('#spMenu').hidePopover?.();
    const menu = fn => (...a) => { closeMenu(); fn(...a); };

    const handlers = {
        fetchRemote: btn => busy(btn, '正在提取…', async () => {
            const type = typeOf();
            hint(`正在拉取「${type.label}」…`);
            const data = await api('/api/get-remote-ips?type=' + encodeURIComponent(type.value));
            if (!data.ips?.length) { hint('没有拿到该类型的 IP。'); return toast('没有拿到该类型的 IP'); }
            toast(`提取到 ${data.totalCount} 个 IP，抽取 ${data.ips.length} 个测速`);
            btn.textContent = '本地测速中…';
            await testTargets(data.ips, type.label);
            hint('测速完成。勾选节点后提交至 DNS。');
        }),
        testPasted: btn => {
            const text = needPasted('请先在「自定义来源」里粘贴 IP 或优选域名');
            if (!text) return;
            const targets = extractTargets(text);
            if (!targets.length) return toast('没有识别到 IP 或域名');
            busy(btn, '测试中…', async () => {
                toast(`提取到 ${targets.length} 个节点，开始测速`);
                await testTargets(targets, '自定义节点');
                hint('自定义节点测速完成。');
            });
        },
        fetchApi: btn => {
            const url = $('input[name="apiUrl"]').value.trim();
            if (!url) { $('.sp-custom').open = true; $('input[name="apiUrl"]').focus(); return toast('请先填入节点 API 链接'); }
            busy(btn, '拉取中…', async () => {
                hint('正在从自定义 API 拉取…');
                const data = await api('/api/get-custom-api-ips?url=' + encodeURIComponent(url));
                if (!data.ips?.length) { hint('自定义 API 返回为空。'); return toast('自定义 API 返回为空'); }
                toast(`提取到 ${data.totalCount} 个节点，抽取 ${data.ips.length} 个测速`);
                btn.textContent = '测速中…';
                await testTargets(data.ips, '自定义 API');
                hint('测速完成。勾选节点后提交至 DNS。');
            });
        },
        submitSelected,
        itdog: menu(itdog),
        cname: menu(cname),
        top3: menu(top3),
        clear: menu(clear),
        moreSheet: () => {
            const off = !dns.ok || dnsBusy;
            const sheet = openSheet(html`
                <div class="sheet-list" role="menu" aria-label="更多操作">
                    <button type="button" data-action="itdog" data-close>复制去 ITDog</button>
                    <button type="button" data-action="cname" data-close ${off ? 'disabled' : ''}>直推 CNAME（免测速）</button>
                    <button type="button" data-action="top3" data-close ${off ? 'disabled' : ''}>更新 TOP3 至 DNS</button>
                    <button type="button" class="danger" data-action="clear" data-close>清空列表</button>
                </div>
                ${off ? html`<p class="faint sp-sheet-why">${dnsWhy()}</p>` : ''}
                <button type="button" class="btn block" data-close>取消</button>`);
            on(sheet, { itdog, cname, top3, clear });
        },
        copy: el => navigator.clipboard.writeText(el.dataset.t).then(() => toast('已复制 ' + el.dataset.t), toastError),
        one: btn => pushDns([btn.dataset.t], { title: `把 DNS 只解析到 ${btn.dataset.t}？`, danger: true, btn }),
        sort: () => {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            rows = sortByLatency(rows, r => r.ms, sortDir);
            draw();
        },
    };

    const offClick = on(root, handlers);
    const offChange = on(root, {
        pick: el => { if (el.checked) selected.add(el.value); else selected.delete(el.value); draw(); },
        all: el => {
            selected.clear();
            if (el.checked) rows.filter(r => !pending(r) && r.ms !== null).forEach(r => selected.add(r.target));
            draw();
        },
    }, 'change');

    setCommands('speed', [
        { label: '提交选中至 DNS', hint: '测速 & DNS', run: () => submitSelected() },
        { label: '更新 TOP3 至 DNS', hint: '测速 & DNS', run: top3 },
    ]);

    // Desktop shows the custom sources open, a phone starts folded.
    $('.sp-custom').open = !matchMedia('(max-width: 760px)').matches;
    drawDns();
    draw();
    loadDns();

    return () => {
        offClick();
        offChange();
        setCommands('speed', []);
    };
}

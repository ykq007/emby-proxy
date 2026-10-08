import { html, render } from '../html.js';
import { api } from '../api.js';
import { confirm, on, setStatusLine, toast, toastError } from '../ui.js';
import { setCommands } from '../palette.js';
import { pageHash } from '../nav.js';
import {
    MODES, STATUS, ago, healthStats, healthVerdict, lastPlayTime, moveBefore, nodeStatus,
    pingView, probeBars, rttTone, sortNodes,
} from './overview-model.js';
import { openDetail, probesHtml, sparkHtml } from './overview-panel.js';

const MASK_KEY = 'emby_mask_prefix';
const readMask = () => { try { return localStorage.getItem(MASK_KEY) !== '0'; } catch { return true; } };

// The ⌘K node commands outlive the page; they reach the mounted page through this.
let openFromPalette = null;

export function mount(root, page) {
    const ac = new AbortController();
    const signal = ac.signal;
    const s = {
        routes: [], cards: new Map(), auth: new Map(), trends: null, pings: new Map(),
        traffic: null, rtt: null, edge: null, loadedAt: 0, error: null,
        query: '', mask: readMask(), selected: new Set(),
    };
    let panel = null;

    const shown = p => '/' + (s.mask ? '••••' : p);
    const nodeOf = route => {
        const card = s.cards.get(route.prefix) || null;
        return {
            route, card,
            auth: s.auth.get(route.prefix) || null,
            trend: s.trends?.get(route.prefix) || null,
            ping: s.pings.get(route.prefix),
            status: nodeStatus(route, card),
        };
    };
    const nodes = () => s.routes.map(nodeOf);
    const find = prefix => { const r = s.routes.find(x => x.prefix === prefix); return r && nodeOf(r); };

    render(root, html`
        <div class="readout ov-readout" aria-live="polite"></div>
        <div class="toolbar">
            <input type="search" class="ov-search" data-input="search" aria-label="筛选节点" autocomplete="off"
                placeholder="${matchMedia('(min-width: 761px)').matches ? '筛选节点   /' : '筛选节点'}">
            <label class="ov-mask"><input type="checkbox" class="switch" data-change="mask" ${s.mask ? 'checked' : ''}>前缀打码</label>
            <span class="grow"></span>
            <span class="faint ov-updated"></span>
            <button type="button" class="btn" data-action="pingAll">全局测速</button>
            <a class="btn pri" href="#nodes">添加节点</a>
        </div>
        <div class="toolbar ov-batch" hidden>
            <label class="ov-all"><input type="checkbox" data-change="all" aria-label="全选节点"><span class="num"></span></label>
            <select name="batchMode" aria-label="批量应用的反代模式">
                ${Object.entries(MODES).map(([k, m]) => html`<option value="${k}">${m.name}（${m.hint}）</option>`)}
            </select>
            <button type="button" class="btn pri" data-action="applyMode">应用到选中节点</button>
            <button type="button" class="btn" data-action="clearSel">取消选择</button>
        </div>
        <div class="tbl-wrap">
            <table class="tbl ov-tbl">
                <thead><tr>
                    <th class="c-cb" aria-label="选择"></th>
                    <th class="c-grip" aria-label="拖拽排序"></th>
                    <th>节点</th><th class="c-st">状态</th><th class="r">延迟</th><th class="c-pr">近 20 次探测</th>
                    <th class="r c-pl">今日播放</th><th class="r c-bw">今日流量</th><th class="c-tr">7 天流量</th>
                    <th class="c-lp">最近播放</th><th class="c-md">模式</th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <div class="ov-foot"></div>`);
    const $ = sel => root.querySelector(sel);
    const tbody = $('tbody');

    function drawReadout() {
        const st = healthStats(nodes());
        const traffic = s.traffic == null ? '…' : s.traffic;
        const edge = s.edge ? (s.edge.entryColo + (s.edge.egressColo && s.edge.egressColo !== s.edge.entryColo ? '→' + s.edge.egressColo : '')) : '';
        render($('.readout'), html`
            <div><div class="l">节点在线</div><div class="v num">${s.loadedAt ? (st.monitored ? html`${st.online}<small>/ ${st.monitored}</small>` : html`—<small>未开监控</small>`) : '…'}</div></div>
            <div><div class="l">离线</div><div class="v num ${st.down.length ? 'err' : ''}" title="${st.down.join('、')}">${s.loadedAt ? st.down.length : '…'}<small>${st.down.join(' ')}</small></div></div>
            <div><div class="l">边缘延迟</div><div class="v num" title="${s.edge ? `访客入口 ${s.edge.entryCountry} ${s.edge.entryCity || ''} (${s.edge.entryColo}) · Worker 落地 ${s.edge.egressColo}` : '你到 Cloudflare 边缘'}">${
                s.rtt == null ? '…' : s.rtt === 'err' ? html`<span class="st err">断连</span>` : html`<span class="st ${rttTone(s.rtt)}">${s.rtt}</span><small>ms${edge ? ' · ' + edge : ''}</small>`}</div></div>
            <div><div class="l">今日流量</div><div class="v num">${/\d/.test(traffic) ? traffic : html`<small class="ov-na">${traffic}</small>`}</div></div>
            <div><div class="l">今日播放</div><div class="v num">${s.loadedAt ? s.routes.reduce((n, r) => n + (r.todayReqs | 0), 0) : '…'}</div></div>`);
        if (s.loadedAt) {
            const v = healthVerdict(st);
            setStatusLine(v.text, v.level);
        }
    }

    function drawUpdated() {
        const el = $('.ov-updated');
        if (!s.loadedAt) return;
        el.textContent = '更新于 ' + ago(s.loadedAt);
        el.classList.toggle('ov-stale', Date.now() - s.loadedAt >= 300e3);
    }

    const pingCell = n => {
        const p = pingView(n.ping);
        return html`<button type="button" class="ov-ping st ${p.cls}" data-action="ping" title="点击重新测速">${p.text}</button>`;
    };

    function rowHtml(n) {
        const r = n.route;
        const st = STATUS[n.status];
        const played = lastPlayTime(r.last_play);
        return html`<tr class="clickable" data-action="open" data-prefix="${r.prefix}">
            <td class="c-cb"><label class="ov-cb" data-action="noop"><input type="checkbox" data-change="pick" ${s.selected.has(r.prefix) ? 'checked' : ''} aria-label="选择 ${r.remark || r.prefix}"></label></td>
            <td class="c-grip"><span class="grip" title="拖拽排序" aria-hidden="true">⠿</span></td>
            <td class="c-nm"><button type="button" class="ov-name" data-action="open">${r.remark || '未命名媒体库'}</button><span class="num faint ov-pfx">${shown(r.prefix)}</span>${
                st.cls !== 'ok' ? html`<span class="st ${st.cls} ov-mst"><i></i>${st.label}</span>` : ''}</td>
            <td class="c-st"><span class="st ${st.cls}"><i></i>${st.label}</span></td>
            <td class="c-rtt r num" data-ping="${r.prefix}">${pingCell(n)}</td>
            <td class="c-pr">${n.card ? probesHtml(probeBars(n.card.history)) : html`<span class="faint">—</span>`}</td>
            <td class="c-pl r num">${r.todayReqs | 0}</td>
            <td class="c-bw r num">${r.todayBandwidth || '—'}</td>
            <td class="c-tr">${sparkHtml(n.trend, 72, 18)}</td>
            <td class="c-lp muted" title="${r.last_play || ''}">${ago(played) || '—'}</td>
            <td class="c-md muted">${MODES[r.mode]?.name || '未知'}</td>
        </tr>`;
    }

    function drawRows() {
        const q = s.query.toLowerCase();
        const all = sortNodes(nodes());
        const list = q ? all.filter(n => [n.route.remark, n.route.prefix, n.route.group_name].join(' ').toLowerCase().includes(q)) : all;
        $('.ov-tbl').classList.toggle('no-trend', !s.trends);
        render(tbody, list.map(rowHtml));
        const foot = $('.ov-foot');
        if (s.error) render(foot, html`<div class="empty err" role="alert"><b>读取节点列表失败</b><span>${s.error}</span><button type="button" class="btn" data-action="reload">重试</button></div>`);
        else if (!s.loadedAt) render(foot, html`<div class="empty">读取中…</div>`);
        else if (!all.length) render(foot, html`<div class="empty"><b>还没有反代节点</b><a class="btn pri" href="#nodes">添加节点</a></div>`);
        else if (!list.length) render(foot, html`<div class="empty"><span>没有匹配「${s.query}」的节点</span><button type="button" class="btn" data-action="clearSearch">清除搜索</button></div>`);
        else render(foot, '');
    }

    function drawBatch() {
        const n = s.selected.size;
        $('.ov-batch').hidden = n === 0;
        $('.ov-all span').textContent = `已选 ${n} / ${s.routes.length}`;
        const all = $('.ov-all input');
        all.checked = n > 0 && n === s.routes.length;
        all.indeterminate = n > 0 && n < s.routes.length;
    }

    function draw() {
        if (signal.aborted) return;
        drawReadout();
        drawRows();
        drawBatch();
        drawUpdated();
        panel?.refresh();
        setCommands('overview', s.routes.map(r => ({
            label: r.remark || r.prefix,
            hint: s.mask ? '节点' : '节点 /' + r.prefix,
            run: () => openFromPalette ? openFromPalette(r.prefix) : (location.hash = pageHash('overview', r.prefix)),
        })));
    }

    async function loadRoutes() {
        const [routes, auth] = await Promise.all([
            api('/api/routes', { signal }),
            api('/api/status/auth-state', { signal }).catch(() => null),
        ]);
        s.routes = Array.isArray(routes) ? routes : [];
        s.auth = new Map((auth?.items || []).map(a => [a.prefix, a]));
        const known = new Set(s.routes.map(r => r.prefix));
        s.selected.forEach(p => { if (!known.has(p)) s.selected.delete(p); });
    }

    // The probe endpoint also starts a background media count refresh, so call it only when the
    // probe view is needed, not for a config refresh.
    async function loadProbes() {
        const p = await api('/api/status/probes', { signal }).catch(() => null);
        s.cards = new Map((p?.cards || []).map(c => [c.prefix, c]));
    }

    async function load(parts = [loadRoutes, loadProbes]) {
        try {
            await Promise.all(parts.map(f => f()));
            s.error = null;
            s.loadedAt = Date.now();
        } catch (err) {
            if (signal.aborted) return;
            s.error = err.message;
        }
        draw();
    }

    async function ping(prefix) {
        const r = s.routes.find(x => x.prefix === prefix);
        if (!r) return;
        s.pings.delete(prefix);
        drawPing(prefix);
        try {
            const d = await api('/api/ping-node?url=' + encodeURIComponent(r.target.split(',')[0].trim()), { signal });
            s.pings.set(prefix, typeof d?.ms === 'number' ? d.ms : -1);
        } catch {
            if (signal.aborted) return;
            s.pings.set(prefix, 'err');
        }
        drawPing(prefix);
    }

    // Only the delay cell changes, so a ping never re-renders rows under an active drag.
    function drawPing(prefix) {
        const cell = tbody.querySelector(`[data-ping="${CSS.escape(prefix)}"]`);
        const n = find(prefix);
        if (cell && n) render(cell, pingCell(n));
        panel?.refresh();
    }

    function pingAll(stagger) {
        s.routes.forEach((r, i) => setTimeout(() => { if (!signal.aborted) ping(r.prefix); }, i * stagger));
    }

    async function measureRtt() {
        const t0 = performance.now();
        try {
            await fetch('/__client_rtt__?t=' + Date.now(), { cache: 'no-store', signal });
            s.rtt = Math.round(performance.now() - t0);
        } catch {
            if (signal.aborted) return;
            s.rtt = 'err';
        }
        drawReadout();
    }

    let rttTimer = null;
    const startRtt = () => { if (!rttTimer) { measureRtt(); rttTimer = setInterval(measureRtt, 3000); } };
    const stopRtt = () => { clearInterval(rttTimer); rttTimer = null; };
    // A console left open all day should not probe from a background tab.
    const onVisibility = () => (document.hidden ? stopRtt() : startRtt());

    function openPanelFor(prefix) {
        if (!find(prefix)) return;
        panel?.close();
        panel = openDetail({
            find, shown, ping,
            reload: () => load(),
            refreshConfig: () => load([loadRoutes]),
            refreshProbes: () => load([loadProbes]),
        }, prefix);
        panel.addEventListener('close', () => {
            panel = null;
            if (location.hash !== '#overview' && location.hash.startsWith('#overview/')) history.replaceState(null, '', '#overview');
        });
    }

    async function saveOrder(evt) {
        const order = moveBefore(s.routes.map(r => r.prefix), evt.item.dataset.prefix, evt.item.nextElementSibling?.dataset.prefix);
        const byPrefix = new Map(s.routes.map(r => [r.prefix, r]));
        s.routes = order.map(p => byPrefix.get(p));
        draw();
        try {
            await api('/api/routes/reorder', { method: 'POST', body: order.map((prefix, sort_order) => ({ prefix, sort_order })) });
            toast('排序已保存');
        } catch (err) {
            toastError(err);
            load([loadRoutes]);
        }
    }

    async function applyMode() {
        const mode = $('[name="batchMode"]').value;
        const picked = new Set(s.selected);
        if (!await confirm({ title: `把 ${picked.size} 个节点切换为「${MODES[mode].name}」模式？`, ok: '应用' })) return;
        try {
            const fresh = await api('/api/routes', { signal });
            await Promise.all(fresh.filter(r => picked.has(r.prefix))
                .map(r => api('/api/routes', { method: 'POST', body: { ...r, oldPrefix: r.prefix, mode } })));
            toast(`已修改 ${picked.size} 个节点的模式`);
            s.selected.clear();
        } catch (err) {
            toastError(err);
        }
        load([loadRoutes]);
    }

    const offClick = on(root, {
        open: el => openPanelFor(el.closest('tr').dataset.prefix),
        ping: el => ping(el.closest('tr').dataset.prefix),
        noop: () => {},
        pingAll: () => {
            if (!s.routes.length) return toast('没有可供测速的节点');
            toast('正在对所有节点测速');
            pingAll(200);
        },
        reload: () => load(),
        clearSearch: () => { $('.ov-search').value = ''; s.query = ''; drawRows(); $('.ov-search').focus(); },
        clearSel: () => { s.selected.clear(); drawRows(); drawBatch(); },
        applyMode,
    });
    const offChange = on(root, {
        mask: el => {
            s.mask = el.checked;
            try { localStorage.setItem(MASK_KEY, s.mask ? '1' : '0'); } catch { /* private mode */ }
            draw();
        },
        pick: el => {
            const p = el.closest('tr').dataset.prefix;
            if (el.checked) s.selected.add(p); else s.selected.delete(p);
            drawBatch();
        },
        all: el => {
            s.selected = new Set(el.checked ? s.routes.map(r => r.prefix) : []);
            drawRows();
            drawBatch();
        },
    }, 'change');
    const offInput = on(root, { search: el => { s.query = el.value.trim(); drawRows(); } }, 'input');

    const onKey = e => {
        if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.target.closest?.('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return;
        e.preventDefault();
        $('.ov-search').focus();
    };
    addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    if (!document.hidden) startRtt();
    const agoTimer = setInterval(() => { if (!document.hidden) drawUpdated(); }, 10000);
    const sortable = window.Sortable?.create(tbody, { handle: '.grip', animation: 150, onEnd: saveOrder });
    openFromPalette = openPanelFor;

    draw();
    load().then(() => {
        if (signal.aborted) return;
        pingAll(500);
        if (page.arg) openPanelFor(page.arg);
    });
    api('/api/analytics', { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) })
        .then(d => { s.traffic = d.trafficToday || '未知'; })
        .catch(() => { s.traffic = '获取失败'; })
        .finally(() => { if (!signal.aborted) drawReadout(); });
    api('/api/route-trends?days=7', { signal })
        .then(d => { if (d?.ok) { s.trends = new Map(d.items.map(i => [i.prefix, i.bytes])); draw(); } })
        .catch(() => {});
    api('/api/edge-info', { signal })
        .then(d => { if (d?.success) { s.edge = d; drawReadout(); } })
        .catch(() => {});

    return () => {
        ac.abort();
        stopRtt();
        clearInterval(agoTimer);
        removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
        offClick(); offChange(); offInput();
        sortable?.destroy();
        panel?.close();
        openFromPalette = null;
    };
}

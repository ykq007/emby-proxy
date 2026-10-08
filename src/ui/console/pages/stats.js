import { api } from '../api.js';
import { html, render } from '../html.js';
import { on } from '../ui.js';
import { groupLocations, lastDays, parseTraffic, percent, sortByTime, topByTraffic, countryLabel } from './stats-format.js';

const CHART_JS = {
    src: 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js',
    integrity: 'sha384-jb8JQMbMoBUzgWatfe6COACi2ljcDdZQ2OxczGA3bGNeWe+6DChMTBJemed7ZnvJ',
};
let chartJsReq = null;

function ensureChartJs() {
    if (window.Chart) return Promise.resolve();
    chartJsReq ||= new Promise((resolve, reject) => {
        const s = Object.assign(document.createElement('script'), { src: CHART_JS.src, integrity: CHART_JS.integrity, crossOrigin: 'anonymous' });
        s.onload = resolve;
        s.onerror = () => { chartJsReq = null; s.remove(); reject(new Error('图表库加载失败')); };
        document.head.append(s);
    });
    return chartJsReq;
}

const TIMEOUT_MS = 10000;
// Slice 1 is the data colour; the rest step down a neutral ink so the biggest share reads first.
const DONUT_ALPHA = ['', 'ff', 'b3', '80', '59', '38'];

function trafficCell(label, value) {
    const t = parseTraffic(value);
    const v = value === undefined ? html`<div class="v faint">…</div>`
        : t ? html`<div class="v">${t.value}<small>${t.unit}</small></div>`
            : value === null || value === '未配置' ? html`<div class="v faint">—</div>`
                : html`<div class="v err stats-msg" title="${value}">${value}</div>`;
    return html`<div><div class="l">${label}</div>${v}</div>`;
}

const srTable = (caption, head, rows) => html`
    <table class="sr-only"><caption>${caption}</caption>
        <thead><tr>${head.map(h => html`<th>${h}</th>`)}</tr></thead>
        <tbody>${rows.map(r => html`<tr>${r.map(c => html`<td>${c}</td>`)}</tr>`)}</tbody>
    </table>`;

export function mount(root) {
    let state = { loading: true };
    let sort = 'desc';
    let ctl = null;
    let charts = [];

    root.classList.add('stats');
    render(root, html`
        <div class="readout" role="group" aria-label="流量" data-slot="readout"></div>
        <div class="toolbar">
            <span class="faint grow">流量来自 Cloudflare，播放记录来自 D1</span>
            <button type="button" class="btn sm" data-action="refresh">刷新</button>
        </div>
        <div class="sec" data-slot="env" hidden>
            <p class="note">流量统计需要 Worker 环境变量 <code>CF_API_TOKEN</code> 和 <code>CF_ZONE_ID</code>。在 Cloudflare 的 Worker 设置里补齐后再刷新。</p>
        </div>
        <div data-slot="charts"></div>
        <section class="sec tbl-sec" aria-labelledby="top5Title">
            <div class="sec-head"><h2 id="top5Title">今日节点流量 · 前 5</h2></div>
            <div data-slot="top5"></div>
        </section>
        <section class="sec tbl-sec" aria-labelledby="logTitle">
            <div class="sec-head"><h2 id="logTitle">最近播放记录</h2><p>最新 20 条，只算 PlaybackInfo 真实播放</p></div>
            <div class="tbl-wrap" data-slot="log"></div>
        </section>`);
    const slot = name => root.querySelector(`[data-slot="${name}"]`);

    function paintReadout() {
        const a = state.analytics;
        const pick = k => state.loading ? undefined : a ? a[k] : null;
        render(slot('readout'), [trafficCell('今天', pick('trafficToday')), trafficCell('近 7 天', pick('traffic7d')), trafficCell('近 30 天', pick('traffic30d'))]);
        slot('env').hidden = !a || a.trafficToday !== '未配置';
        root.querySelector('[data-action="refresh"]').disabled = state.loading;
    }

    function paintTop5() {
        const el = slot('top5');
        if (state.loading) return render(el, html`<p class="stats-pad faint">加载中…</p>`);
        if (state.routesError) return render(el, html`<p class="stats-pad st err"><i></i>${state.routesError}</p>`);
        const routes = state.routes || [];
        const top = topByTraffic(routes);
        if (!top.length) {
            const why = !routes.length ? '还没有反代节点。'
                : routes.some(r => 'todayBandwidth' in r) ? '今天还没有节点产生流量。' : '配置 Cloudflare 环境变量后才有节点流量。';
            return render(el, html`<p class="stats-pad faint">${why}</p>`);
        }
        const max = top[0].bytes;
        render(el, html`
            <table class="tbl top5">
                <thead><tr><th class="rank">#</th><th>节点</th><th class="bar-col"><span class="sr-only">占第 1 名的比例</span></th><th class="r">今日流量</th></tr></thead>
                <tbody>${top.map((r, i) => html`
                    <tr>
                        <td class="rank num faint">${i + 1}</td>
                        <td class="name">${r.name}${r.name !== r.prefix ? html` <span class="faint num">/${r.prefix}</span>` : ''}</td>
                        <td class="bar-col"><span class="bar"><i style="width:${Math.max(2, r.bytes / max * 100).toFixed(1)}%"></i></span></td>
                        <td class="r num">${r.traffic}</td>
                    </tr>`)}
                </tbody>
            </table>`);
    }

    function paintLog() {
        const el = slot('log');
        const a = state.analytics;
        const rows = a ? sortByTime(a.recents || [], sort) : [];
        const msg = state.loading ? '加载中…' : state.error ? '数据拉取失败' : rows.length ? '' : '暂无播放记录';
        render(el, html`
            <table class="tbl stats-log">
                <thead><tr>
                    <th aria-sort="${sort === 'asc' ? 'ascending' : 'descending'}">
                        <button type="button" class="th-sort" data-action="sort" title="按时间排序">时间 <span aria-hidden="true">${sort === 'asc' ? '↑' : '↓'}</span></button>
                    </th>
                    <th>节点</th><th>IP</th><th>归属地</th><th>客户端 (User-Agent)</th>
                </tr></thead>
                <tbody>${msg ? html`<tr><td colspan="5" class="none faint">${msg}</td></tr>` : rows.map(r => html`
                    <tr>
                        <td class="t num">${r.timestamp}</td>
                        <td class="n">${r.prefix}</td>
                        <td class="ip num" title="${r.ip}">${r.ip}</td>
                        <td class="g">${countryLabel(r.country)}</td>
                        <td class="ua" title="${r.ua}">${r.ua}</td>
                    </tr>`)}
                </tbody>
            </table>`);
    }

    async function paintCharts() {
        charts.forEach(c => c.destroy());
        charts = [];
        const el = slot('charts');
        if (state.loading) return render(el, '');
        if (state.error) {
            return render(el, html`<div class="sec"><div class="empty err" role="alert"><b>统计数据拉取失败</b><span>${state.error}</span>
                <button type="button" class="btn sm" data-action="refresh">重试</button></div></div>`);
        }
        const a = state.analytics;
        const days = lastDays(a.trend || []);
        const plays = days.reduce((s, d) => s + d.count, 0);
        const slices = groupLocations(a.locations || []);
        const visits = slices.reduce((s, l) => s + l.count, 0);
        const css = getComputedStyle(document.documentElement);
        const tok = n => css.getPropertyValue(n).trim();
        const colors = slices.map((_, i) => i === 0 ? tok('--data') : tok('--tx2') + DONUT_ALPHA[i]);

        render(el, html`
            <div class="stats-charts">
                <section class="sec" aria-labelledby="trendTitle">
                    <div class="sec-head"><h2 id="trendTitle">近 7 天有效播放</h2><p>共 <span class="num">${plays}</span> 次，按北京时间</p></div>
                    ${plays ? html`<div class="chart-box"><canvas data-chart="trend" role="img" aria-label="近 7 天每日有效播放次数，共 ${plays} 次"></canvas></div>`
                        : html`<div class="empty"><span>近 7 天没有播放记录</span></div>`}
                    ${srTable('近 7 天播放趋势', ['日期', '有效播放（次）'], days.map(d => [d.date, d.count]))}
                </section>
                <section class="sec" aria-labelledby="locTitle">
                    <div class="sec-head"><h2 id="locTitle">访客来源地</h2><p>近 7 天，按播放次数</p></div>
                    ${visits ? html`
                        <div class="loc">
                            <div class="chart-box donut"><canvas data-chart="loc" role="img" aria-label="访客来源地占比"></canvas></div>
                            <ul class="loc-legend" aria-hidden="true">${slices.map((l, i) => html`
                                <li><i style="background:${colors[i]}"></i><span class="grow">${l.label}</span><span class="num faint">${l.count}</span><span class="num pct">${percent(l.count, visits)}</span></li>`)}
                            </ul>
                        </div>` : html`<div class="empty"><span>近 7 天没有访客</span></div>`}
                    ${srTable('访客来源地占比', ['来源地', '播放次数'], (a.locations || []).map(l => [countryLabel(l.country), l.count]))}
                </section>
            </div>`);
        if (!plays && !visits) return;

        const data = state.analytics;
        try {
            await ensureChartJs();
        } catch (err) {
            el.querySelectorAll('.chart-box').forEach(box => render(box, html`<p class="faint">${err.message}，下方无障碍表格仍可读。</p>`));
            return;
        }
        if (state.analytics !== data || !root.isConnected) return;

        Object.assign(Chart.defaults, { color: tok('--tx3'), borderColor: tok('--line-soft'), animation: false });
        Chart.defaults.font.family = tok('--sans');
        const tooltip = { backgroundColor: tok('--raise'), titleColor: tok('--tx'), bodyColor: tok('--tx'), borderColor: tok('--line'), borderWidth: 1, padding: 10, displayColors: false };
        const acc = tok('--data');
        const trendEl = el.querySelector('[data-chart="trend"]');
        if (trendEl) charts.push(new Chart(trendEl, {
            type: 'line',
            data: {
                labels: days.map(d => d.date.slice(5)),
                datasets: [{ data: days.map(d => d.count), borderColor: acc, backgroundColor: acc + '1f', fill: true, borderWidth: 2, tension: 0,
                    pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: acc, pointBorderColor: tok('--bg'), pointBorderWidth: 2 }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: c => `有效播放 ${c.parsed.y} 次` } } },
                scales: {
                    y: { beginAtZero: true, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5 } },
                    x: { grid: { display: false }, ticks: { maxRotation: 0 } },
                },
            },
        }));
        const locEl = el.querySelector('[data-chart="loc"]');
        if (locEl) charts.push(new Chart(locEl, {
            type: 'doughnut',
            data: { labels: slices.map(l => l.label), datasets: [{ data: slices.map(l => l.count), backgroundColor: colors, borderColor: tok('--bg'), borderWidth: 2, hoverOffset: 4 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '64%',
                plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: c => `${c.label} · ${c.parsed} 次（${percent(c.parsed, visits)}）` } } },
            },
        }));
    }

    const paint = () => { paintReadout(); paintTop5(); paintLog(); paintCharts(); };

    async function load() {
        ctl?.abort();
        const mine = ctl = new AbortController();
        const timer = setTimeout(() => mine.abort('timeout'), TIMEOUT_MS);
        state = { loading: true };
        paint();
        const [analytics, routes] = await Promise.allSettled([
            api('/api/analytics', { signal: mine.signal }),
            api('/api/routes', { signal: mine.signal }),
        ]);
        clearTimeout(timer);
        if (mine !== ctl) return;
        const why = r => mine.signal.reason === 'timeout' ? '请求超时（10 秒），Cloudflare 接口可能拥堵，稍后再试。' : r.reason?.message || String(r.reason);
        state = {
            loading: false,
            analytics: analytics.status === 'fulfilled' ? analytics.value : null,
            error: analytics.status === 'rejected' ? why(analytics) : '',
            routes: routes.status === 'fulfilled' && Array.isArray(routes.value) ? routes.value : [],
            routesError: routes.status === 'rejected' ? why(routes) : '',
        };
        paint();
    }

    const off = on(root, {
        refresh: load,
        sort: () => { sort = sort === 'desc' ? 'asc' : 'desc'; paintLog(); },
    });
    const onTheme = () => { if (!state.loading) paintCharts(); };
    document.addEventListener('themechange', onTheme);
    load();

    return () => {
        off();
        document.removeEventListener('themechange', onTheme);
        ctl?.abort();
        ctl = null;
        charts.forEach(c => c.destroy());
    };
}

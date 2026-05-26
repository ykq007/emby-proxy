import { dbAll, dbFirst } from '../db/helpers.js';
import { nowLocalDayStr, htmlEscape } from '../util/text.js';
import { ecgStripSvg } from '../ui/svg.js';

export async function loadStatusData(env, opts) {
    opts = opts || {};
    const limitPrefix = opts.prefix || null;
    const where = limitPrefix
        ? `WHERE show_on_status = 1 AND prefix = ?`
        : `WHERE show_on_status = 1`;
    const stmt = env.DB.prepare(`SELECT prefix, public_alias, remark, icon, sort_order, media_counts_auto_auth
                                  FROM routes ${where} ORDER BY sort_order ASC, prefix ASC`);
    const { results: routes } = limitPrefix ? await stmt.bind(limitPrefix).all() : await stmt.all();
    if (!routes || !routes.length) return { routes: [], cards: [] };

    const now = Math.floor(Date.now() / 1000);
    const since24 = now - 24 * 3600;
    const since7d = now - 7 * 86400;
    const today = nowLocalDayStr();

    const cards = [];
    for (const r of routes) {
        const lastProbe = await dbFirst(env, `SELECT ok, ms, status, ts FROM emby_probes WHERE prefix = ? ORDER BY ts DESC LIMIT 1`, r.prefix);
        const last60 = await dbAll(env, `SELECT ok, ms, ts FROM emby_probes WHERE prefix = ? ORDER BY ts DESC LIMIT 60`, r.prefix);
        const raw24 = await dbFirst(env, `SELECT SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END) AS ok_count, COUNT(*) AS total FROM emby_probes WHERE prefix = ? AND ts >= ?`, r.prefix, since24);
        const hourly7 = await dbFirst(env, `SELECT SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total FROM emby_probe_hourly WHERE prefix = ? AND hour_ts >= ?`, r.prefix, since7d);
        // Fallback: 今日还没抓到(跨日窗口 / 外部 cron 未跑 / token 临时挂)时,回退到最近一天已有的计数,
        // 保持 /status 永远不空白; delta 以"最近一天"对比"再前一天"。
        const latestCounts = await dbFirst(env, `SELECT day, movies, series, episodes FROM emby_media_counts WHERE prefix = ? AND day <= ? ORDER BY day DESC LIMIT 1`, r.prefix, today);
        const prevCounts = latestCounts
            ? await dbFirst(env, `SELECT movies, series, episodes FROM emby_media_counts WHERE prefix = ? AND day < ? ORDER BY day DESC LIMIT 1`, r.prefix, latestCounts.day)
            : null;
        const todayCounts = latestCounts;
        const yesterdayCounts = prevCounts;
        const total24 = (raw24 && raw24.total) | 0;
        const ok24 = (raw24 && raw24.ok_count) | 0;
        const total7d = (hourly7 && hourly7.total) | 0;
        const ok7d = (hourly7 && hourly7.ok_count) | 0;
        cards.push({
            prefix: r.prefix,
            name: r.public_alias || r.remark || r.prefix,
            icon: r.icon || '',
            ok: !!(lastProbe && lastProbe.ok),
            latest_ms: lastProbe ? (lastProbe.ms | 0) : 0,
            latest_ts: lastProbe ? (lastProbe.ts | 0) : 0,
            avail_24h: total24 > 0 ? (ok24 / total24) : null,
            avail_7d: total7d > 0 ? (ok7d / total7d) : null,
            history: (last60.results || []).map(p => ({ ok: p.ok, ms: p.ms | 0 })).reverse(),
            counts: todayCounts ? { movies: todayCounts.movies | 0, series: todayCounts.series | 0, episodes: todayCounts.episodes | 0 } : null,
            counts_delta: (todayCounts && yesterdayCounts) ? {
                movies: (todayCounts.movies | 0) - (yesterdayCounts.movies | 0),
                series: (todayCounts.series | 0) - (yesterdayCounts.series | 0),
                episodes: (todayCounts.episodes | 0) - (yesterdayCounts.episodes | 0)
            } : null,
            show_counts: !!r.media_counts_auto_auth
        });
    }
    return { routes, cards };
}

export function renderStatusHtml(data, opts) {
    opts = opts || {};
    const title = htmlEscape(opts.title || '节点状态');
    const cards = data.cards;
    const total = cards.length;
    const online = cards.filter(c => c.ok).length;
    const offline = total - online;
    const pct = (v) => v == null ? '—' : (v * 100).toFixed(1) + '%';
    const fmtDelta = (n) => n === 0 ? '' : (n > 0 ? `+${n}` : String(n));
    const fmtTs = (ts) => {
        if (!ts) return '—';
        const d = new Date((ts + 8 * 3600) * 1000);
        return d.toISOString().slice(5, 16).replace('T', ' ');
    };
    const overallPct = total === 0 ? null : (online / total);
    const overallPctText = overallPct == null ? '—' : (overallPct * 100).toFixed(1);
    const overallTier = overallPct == null ? 'idle'
        : overallPct >= 0.99 ? 'ok'
        : overallPct >= 0.95 ? 'warn'
        : 'bad';
    const liveOnes = cards.filter(c => c.ok);
    const avgMs = liveOnes.length ? Math.round(liveOnes.reduce((s, c) => s + (c.latest_ms | 0), 0) / liveOnes.length) : null;

    const hideNames = !!opts.hideNames;
    const cardsHtml = cards.map((c, i) => {
        const ecgHtml = ecgStripSvg(c.history);
        const countsRow = (c.show_counts && c.counts) ? `
            <div class="s-counts">
                <span>电影 <b>${c.counts.movies}</b>${c.counts_delta && c.counts_delta.movies ? `<i class="s-delta ${c.counts_delta.movies > 0 ? 'up' : 'down'}">${fmtDelta(c.counts_delta.movies)}</i>` : ''}</span>
                <span>剧集 <b>${c.counts.series}</b>${c.counts_delta && c.counts_delta.series ? `<i class="s-delta ${c.counts_delta.series > 0 ? 'up' : 'down'}">${fmtDelta(c.counts_delta.series)}</i>` : ''}</span>
                <span>集数 <b>${c.counts.episodes}</b>${c.counts_delta && c.counts_delta.episodes ? `<i class="s-delta ${c.counts_delta.episodes > 0 ? 'up' : 'down'}">${fmtDelta(c.counts_delta.episodes)}</i>` : ''}</span>
            </div>` : '';
        const displayName = hideNames ? `节点 ${i + 1}` : c.name;
        const iconHtml = hideNames
            ? '<span class="s-icon-fallback" aria-hidden="true"></span>'
            : (c.icon ? `<img class="s-icon" src="${htmlEscape(c.icon)}" alt="" onerror="this.style.display='none'">` : '<span class="s-icon-fallback" aria-hidden="true"></span>');
        const isSlow = c.ok && (c.latest_ms | 0) >= 200;
        const pillCls = !c.ok ? 'bad' : (isSlow ? 'warn' : 'ok');
        const pillLabel = !c.ok ? '离线' : (isSlow ? '延迟' : '在线');
        const latencyHtml = c.ok
            ? `${c.latest_ms}<span class="s-u">ms</span>`
            : `<span class="is-bad">离线</span>`;
        return `<article class="node-row">
            <div class="node-head">
                ${iconHtml}
                <div class="node-name" title="${htmlEscape(displayName)}">${htmlEscape(displayName)}</div>
                <span class="status-pill ${pillCls}"><span class="dot"></span>${pillLabel}</span>
            </div>
            <div class="node-metrics">
                <div class="metric"><div class="metric-k">当前延迟</div><div class="metric-v">${latencyHtml}</div></div>
                <div class="metric"><div class="metric-k">24 小时</div><div class="metric-v">${pct(c.avail_24h)}</div></div>
                <div class="metric"><div class="metric-k">7 天</div><div class="metric-v">${pct(c.avail_7d)}</div></div>
            </div>
            <div class="ecg-strip" aria-label="近 60 次探测心电图">${ecgHtml}</div>
            ${countsRow}
            <div class="node-foot">最近探测 · ${fmtTs(c.latest_ts)}</div>
        </article>`;
    }).join('');

    const emptyHtml = total === 0
        ? `<div class="card empty-card">尚未启用任何节点状态展示</div>`
        : '';

    // Theme boot: set documentElement.dataset.theme before paint, then add body.dark inline-as-soon-as-body-parses.
    const themeBoot = `(function(){try{var legacy=localStorage.getItem('emby_proxy_dark');if(legacy!==null&&!localStorage.getItem('emby_theme')){localStorage.setItem('emby_theme',legacy==='1'?'dark':'light');localStorage.removeItem('emby_proxy_dark');}var p=localStorage.getItem('emby_theme')||'auto';var d=p==='dark'||(p==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.themePref=p;}catch(e){}})();`;

    const inlineScript = `(function(){
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  function pref(){return localStorage.getItem('emby_theme')||'auto';}
  function resolveDark(p){return p==='dark'||(p==='auto'&&mql.matches);}
  function apply(p){
    var d=resolveDark(p);
    document.documentElement.classList.toggle('dark',d);
    document.body.classList.toggle('dark',d);
    document.documentElement.dataset.themePref=p;
    var b=document.getElementById('themeToggle');
    if(b){var titles={auto:'主题: 跟随系统',light:'主题: 浅色',dark:'主题: 深色'};b.dataset.theme=p;b.title=titles[p]||'';b.setAttribute('aria-label',titles[p]||'');}
  }
  apply(pref());
  var b=document.getElementById('themeToggle');
  if(b){
    b.addEventListener('click',function(){
      var order=['auto','light','dark'];
      var cur=pref();
      var next=order[(order.indexOf(cur)+1)%order.length];
      try{localStorage.setItem('emby_theme',next);}catch(e){}
      apply(next);
    });
  }
  mql.addEventListener('change',function(){ if(pref()==='auto') apply('auto'); });
  // Auto refresh page every 60s to pull fresh probe data
  setTimeout(function(){try{location.reload();}catch(e){}}, 60000);
})();`;

    return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#07090f" media="(prefers-color-scheme: dark)">
<script>${themeBoot}</script>
<style>
:root{
  --primary:#0071e3; --primary-hover:#005cbf;
  --bg:#f5f5f7; --card:#ffffff; --text:#1d1d1f; --text-sec:#86868b; --border:#d2d2d7;
  --surface:#ffffff; --surface-2:#f0f1f4;
  --ok:#34c759; --warn:#ff9500; --err:#ff3b30;
  --ok-soft:rgba(52,199,89,.10); --warn-soft:rgba(255,149,0,.10); --err-soft:rgba(255,59,48,.10);
  --primary-soft:rgba(0,113,227,.10); --primary-glow:rgba(0,113,227,.32);
  --hairline:rgba(60,60,67,.18);
  --aurora-grad:linear-gradient(135deg,#0071e3 0%,#5856d6 55%,#af52de 110%);
  --card-shadow-lift:0 1px 0 rgba(255,255,255,.55) inset, 0 1px 2px rgba(15,23,42,.04), 0 10px 28px -12px rgba(15,23,42,.12);
  --radius-ios:18px; --radius-ios-sm:14px; --radius-md:8px; --radius-lg:12px; --radius-pill:999px;
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-7:32px;--space-2-5:10px;--space-3-5:14px;
  --text-xs:11px;--text-sm:12px;--text-md:13px;--text-base:14px;--text-lg:15px;--text-xl:16px;--text-2xl:20px;--text-3xl:28px;
  --touch-min:44px;
}
html.dark, body.dark{
  --primary:#2f9bff; --primary-hover:#5cb0ff;
  --bg:#07090f; --card:#12151d; --text:#e9edf5; --text-sec:#8b93a7; --border:#232838;
  --surface:#12151d; --surface-2:#181c27;
  --ok:#30d158; --warn:#ff9f0a; --err:#ff453a;
  --ok-soft:rgba(48,209,88,.14); --warn-soft:rgba(255,159,10,.14); --err-soft:rgba(255,69,58,.14);
  --primary-soft:rgba(47,155,255,.14); --primary-glow:rgba(47,155,255,.32);
  --hairline:rgba(84,84,88,.55);
  --aurora-grad:linear-gradient(135deg,#2f9bff 0%,#6e6ad9 55%,#c47ce0 110%);
  --card-shadow-lift:0 0 0 1px rgba(255,255,255,.03) inset, 0 10px 30px -10px rgba(0,0,0,.55);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Microsoft YaHei","Segoe UI",Roboto,sans-serif;
  background:var(--bg); color:var(--text);
  min-height:100vh;
  padding:var(--space-5);
  padding-top:max(var(--space-5), env(safe-area-inset-top));
  padding-bottom:max(var(--space-7), env(safe-area-inset-bottom));
  -webkit-text-size-adjust:100%;
  -webkit-font-smoothing:antialiased;
  transition:background-color .3s, color .3s;
}
.wrap{max-width:1200px; margin:0 auto;}

/* —— page header (matches admin .ios-page-header vibe) —— */
.page-head{
  display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-5);
}
.page-title{
  font-size:var(--text-3xl); font-weight:700; letter-spacing:-.02em; margin:0;
  flex:1; min-width:0;
}
.page-sub{ color:var(--text-sec); font-size:var(--text-md); margin-top:2px; }
.title-block{ flex:1; min-width:0; }
.tb-icon-btn{
  width:36px; height:36px; min-width:36px; min-height:36px;
  border-radius:50%;
  border:1px solid var(--border); background:var(--card); color:var(--text);
  cursor:pointer; display:inline-flex; align-items:center; justify-content:center;
  transition:.2s ease;
}
.tb-icon-btn:hover{ border-color:var(--primary); color:var(--primary); }
.tb-icon-btn svg{ width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
.tb-icon-btn[data-theme] .ico{ display:none; }
.tb-icon-btn[data-theme="auto"] .ico-auto,
.tb-icon-btn[data-theme="light"] .ico-light,
.tb-icon-btn[data-theme="dark"] .ico-dark{ display:inline-flex; }

/* —— aurora KPI hero (matches admin overview KPI grid) —— */
.aurora-hero{
  display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr;
  gap:var(--space-4); margin-bottom:var(--space-6);
}
.kpi-tile{
  position:relative; overflow:hidden;
  background:var(--card); border:1px solid var(--border);
  border-radius:var(--radius-ios); padding:var(--space-5);
  min-height:124px; box-shadow:var(--card-shadow-lift);
}
.kpi-tile.is-primary{
  color:#fff; background:var(--aurora-grad); border-color:transparent;
  box-shadow:0 1px 0 rgba(255,255,255,.22) inset, 0 14px 36px -10px var(--primary-glow);
}
.kpi-tile.is-primary::before{
  content:''; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,.28), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(0,0,0,.10), transparent 60%);
}
.kpi-tile > *{ position:relative; z-index:1; }
.kpi-label{
  font-size:var(--text-xs); font-weight:700; letter-spacing:.10em; text-transform:uppercase;
  color:var(--text-sec); margin-bottom:var(--space-2-5);
}
.kpi-tile.is-primary .kpi-label{ color:rgba(255,255,255,.85); }
.kpi-row{ display:flex; align-items:baseline; gap:var(--space-2); }
.kpi-value{
  font-size:34px; font-weight:700; letter-spacing:-.025em; line-height:1.05;
  font-variant-numeric:tabular-nums; color:var(--text);
}
.kpi-tile.is-primary .kpi-value{ color:#fff; }
.kpi-unit{
  font-size:var(--text-md); font-weight:600; color:var(--text-sec); font-variant-numeric:tabular-nums;
}
.kpi-tile.is-primary .kpi-unit{ color:rgba(255,255,255,.78); }
.kpi-sub{
  margin-top:var(--space-2); font-size:var(--text-xs); color:var(--text-sec);
}
.kpi-tile.is-primary .kpi-sub{ color:rgba(255,255,255,.78); }
.kpi-health-bar{
  margin-top:var(--space-3); height:6px; width:100%;
  background:rgba(120,120,140,.18); border-radius:var(--radius-pill); overflow:hidden;
}
.kpi-tile.is-primary .kpi-health-bar{ background:rgba(255,255,255,.22); }
.kpi-health-bar > span{
  display:block; height:100%; border-radius:var(--radius-pill);
  background:#fff; box-shadow:0 0 10px rgba(255,255,255,.35);
}
.kpi-tile:not(.is-primary) .kpi-health-bar > span{
  background:var(--aurora-grad); box-shadow:0 0 10px var(--primary-glow);
}
.kpi-tile .ks-dot{ display:inline-block; width:8px; height:8px; border-radius:50%; vertical-align:1px; margin-right:6px; }
.kpi-tile .ks-dot.ok{ background:var(--ok); box-shadow:0 0 6px var(--ok); }
.kpi-tile .ks-dot.warn{ background:var(--warn); box-shadow:0 0 6px var(--warn); }
.kpi-tile .ks-dot.bad{ background:var(--err); box-shadow:0 0 6px var(--err); }

/* —— main listing card (admin .card) —— */
.card{
  background:var(--card); border:1px solid var(--border); border-radius:var(--radius-ios);
  box-shadow:var(--card-shadow-lift); padding:var(--space-6);
  margin-bottom:var(--space-5);
}
.section-header-row{
  display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4);
}
.section-title{
  margin:0; font-size:var(--text-2xl); font-weight:700; letter-spacing:-.01em;
  flex:1; min-width:0;
}
.section-sub{
  color:var(--text-sec); font-size:var(--text-md);
  font-variant-numeric:tabular-nums;
}
.node-list{
  display:flex; flex-direction:column;
}
.node-row{
  padding:var(--space-4) 0;
  border-top:1px solid var(--hairline);
  display:flex; flex-direction:column; gap:var(--space-3);
}
.node-row:first-child{ border-top:none; padding-top:var(--space-2); }
.node-head{
  display:flex; align-items:center; gap:var(--space-3); min-width:0;
}
.s-icon, .s-icon-fallback{
  width:36px; height:36px; border-radius:10px; flex:0 0 auto;
  background:var(--surface-2); border:1px solid var(--border); object-fit:cover;
}
.node-name{
  flex:1; min-width:0;
  font-size:var(--text-xl); font-weight:600; letter-spacing:-.01em;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.status-pill{
  flex:0 0 auto;
  display:inline-flex; align-items:center; gap:6px;
  padding:5px 12px; border-radius:var(--radius-pill);
  font-size:var(--text-sm); font-weight:600;
  font-variant-numeric:tabular-nums;
}
.status-pill .dot{ width:7px; height:7px; border-radius:50%; }
.status-pill.ok{ background:var(--ok-soft); color:var(--ok); }
.status-pill.ok .dot{ background:var(--ok); box-shadow:0 0 6px var(--ok); }
.status-pill.warn{ background:var(--warn-soft); color:var(--warn); }
.status-pill.warn .dot{ background:var(--warn); }
.status-pill.bad{ background:var(--err-soft); color:var(--err); }
.status-pill.bad .dot{ background:var(--err); }

.node-metrics{
  display:grid; grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:var(--space-3);
}
.metric{ display:flex; flex-direction:column; gap:2px; min-width:0; }
.metric-k{
  font-size:var(--text-xs); font-weight:600; letter-spacing:.08em; text-transform:uppercase;
  color:var(--text-sec);
}
.metric-v{
  font-size:var(--text-2xl); font-weight:700; letter-spacing:-.015em;
  color:var(--text); font-variant-numeric:tabular-nums;
  line-height:1.15;
}
.metric-v .s-u{ font-size:var(--text-sm); font-weight:600; color:var(--text-sec); margin-left:2px; }
.metric-v .is-bad{ color:var(--err); font-size:var(--text-xl); }

/* —— ECG history strip —— */
.ecg-strip{
  background:linear-gradient(180deg, var(--surface-2) 0%, var(--card) 100%);
  border:1px solid var(--border);
  border-radius:var(--radius-md);
  padding:6px 8px;
  position:relative; overflow:hidden;
  /* faint medical-grid backdrop */
  background-image:
    linear-gradient(180deg, var(--surface-2) 0%, var(--card) 100%),
    repeating-linear-gradient(0deg, transparent 0, transparent 7px, var(--hairline) 7px, var(--hairline) 7.5px),
    repeating-linear-gradient(90deg, transparent 0, transparent 11px, var(--hairline) 11px, var(--hairline) 11.5px);
  background-blend-mode: normal, soft-light, soft-light;
}
.ecg-svg{ width:100%; height:36px; display:block; }
.ecg-svg .ecg-line{
  stroke:var(--primary); stroke-width:1.4; stroke-linecap:round; stroke-linejoin:round;
  filter:drop-shadow(0 0 2px var(--primary-glow));
}
.ecg-svg .ecg-base{
  stroke:var(--hairline); stroke-width:.6; stroke-dasharray:2 3;
}
.ecg-svg .ecg-mid{
  stroke:var(--hairline); stroke-width:.4; opacity:.5;
}
.ecg-svg .ecg-fail{
  stroke:var(--err); stroke-width:1.6; stroke-linecap:round;
  filter:drop-shadow(0 0 2px var(--err));
}
.ecg-svg .ecg-dot.ok{ fill:var(--primary); }
.ecg-svg .ecg-dot.bad{ fill:var(--err); }
.ecg-svg .ecg-empty{ font-size:9px; fill:var(--text-sec); font-family:inherit; }

.s-counts{
  display:flex; flex-wrap:wrap; gap:var(--space-3) var(--space-5);
  font-size:var(--text-sm); color:var(--text-sec);
  padding-top:var(--space-3); border-top:1px dashed var(--hairline);
}
.s-counts b{ color:var(--text); font-weight:700; margin-left:4px; font-variant-numeric:tabular-nums; }
.s-delta{ font-style:normal; margin-left:5px; font-size:var(--text-xs); font-weight:600; padding:1px 6px; border-radius:var(--radius-md); font-variant-numeric:tabular-nums; }
.s-delta.up{ color:var(--ok); background:var(--ok-soft); }
.s-delta.down{ color:var(--err); background:var(--err-soft); }

.node-foot{
  font-size:var(--text-xs); color:var(--text-sec); font-variant-numeric:tabular-nums;
}

.empty-card{ text-align:center; color:var(--text-sec); padding:var(--space-7); }

.foot-note{
  text-align:center; color:var(--text-sec); font-size:var(--text-xs);
  margin-top:var(--space-5);
}

/* —— responsive —— */
@media (max-width: 980px) {
  .aurora-hero{ grid-template-columns:1fr 1fr; }
  .aurora-hero .kpi-tile.is-primary{ grid-column:1 / -1; }
  .kpi-value{ font-size:30px; }
}
@media (max-width: 520px) {
  body{ padding:var(--space-3); padding-top:max(var(--space-3), env(safe-area-inset-top)); }
  .page-head{ margin-bottom:var(--space-4); }
  .page-title{ font-size:var(--text-3xl); }
  .aurora-hero{ grid-template-columns:1fr 1fr; gap:var(--space-3); }
  .aurora-hero .kpi-tile.is-primary{ grid-column:1 / -1; }
  .kpi-tile{ min-height:96px; padding:var(--space-4); }
  .kpi-value{ font-size:26px; }
  .card{ padding:var(--space-4); border-radius:var(--radius-ios-sm); }
  .node-metrics{ gap:var(--space-2); }
  .metric-v{ font-size:var(--text-xl); }
  .node-name{ font-size:var(--text-lg); }
  .section-title{ font-size:var(--text-xl); }
}
@media (max-width: 360px) {
  .aurora-hero{ grid-template-columns:1fr; }
  .kpi-tile.is-primary{ grid-column:auto; }
}
@media (prefers-reduced-motion: reduce){
  .tb-icon-btn{ transition:none; }
}
</style></head><body>
<div class="wrap">
  <header class="page-head">
    <div class="title-block">
      <h1 class="page-title">${title}</h1>
      <div class="page-sub">实时探测 · 每分钟刷新</div>
    </div>
    <button class="tb-icon-btn" id="themeToggle" type="button" data-theme="auto" title="切换主题" aria-label="切换主题">
      <span class="ico ico-auto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg></span>
      <span class="ico ico-light"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg></span>
      <span class="ico ico-dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
    </button>
  </header>

  <section class="aurora-hero" aria-label="整体状态">
    <div class="kpi-tile is-primary">
      <div class="kpi-label">整体可用率</div>
      <div class="kpi-row">
        <span class="kpi-value">${overallPctText}</span>
        <span class="kpi-unit">${overallPct == null ? '' : '%'}</span>
      </div>
      <div class="kpi-sub">${online} / ${total} 节点在线 · 自动每分钟探测</div>
      ${overallPct == null ? '' : `<div class="kpi-health-bar"><span style="width:${(overallPct * 100).toFixed(1)}%"></span></div>`}
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">在线节点</div>
      <div class="kpi-row">
        <span class="kpi-value"><span class="ks-dot ok"></span>${online}</span>
        <span class="kpi-unit">/ ${total}</span>
      </div>
      <div class="kpi-sub">实时反代节点活跃度</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">离线节点</div>
      <div class="kpi-row">
        <span class="kpi-value">${offline > 0 ? `<span class="ks-dot bad"></span>` : ''}${offline}</span>
      </div>
      <div class="kpi-sub">${offline > 0 ? '需关注 · 已触发监控' : '一切正常'}</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">平均延迟</div>
      <div class="kpi-row">
        <span class="kpi-value">${avgMs == null ? '—' : avgMs}</span>
        <span class="kpi-unit">${avgMs == null ? '' : 'ms'}</span>
      </div>
      <div class="kpi-sub">仅统计在线节点</div>
    </div>
  </section>

  <section class="card" aria-label="节点列表">
    <div class="section-header-row">
      <h2 class="section-title">节点列表</h2>
      <div class="section-sub">${total} 个节点</div>
    </div>
    <div class="node-list">${cardsHtml}</div>
    ${emptyHtml}
  </section>

  <div class="foot-note">由 Emby Proxy 监控 · ${overallTier === 'idle' ? '尚未启用任何节点' : '页面 60 秒后自动刷新'}</div>
</div>
<script>${inlineScript}</script>
</body></html>`;
}

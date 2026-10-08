import { html, render } from '../html.js';
import { api } from '../api.js';
import { confirm, on, openPanel, toast, toastError } from '../ui.js';
import { pageHash } from '../nav.js';
import {
    MODES, STATUS, ago, editPayload, headerKeys, keepaliveView, pct, pingView, probeBars, slaGrade,
    sparkPoints, splitTargets,
} from './overview-model.js';

export const probesHtml = bars => html`<span class="probes" aria-hidden="true">${bars.map(b => html`<i class="${b}"></i>`)}</span>`;

export const sparkHtml = (values, w, h) => {
    const pts = sparkPoints(values, w, h);
    return pts ? html`<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}"/></svg>` : '';
};

const COUNTS = [
    ['movies', '电影', true], ['series', '剧集', true], ['episodes', '集数', true],
    ['artists', '艺术家'], ['albums', '专辑'], ['songs', '单曲'],
    ['music_videos', 'MV'], ['box_sets', '合集'], ['books', '有声书'],
];

const when = ts => ts ? new Date(ts * 1000).toLocaleString() : '—';

function countsHtml(card) {
    const c = card?.counts;
    if (!c) return html`<p class="muted">暂无计数</p>`;
    const delta = card.counts_delta || {};
    return html`<dl class="kv ov-counts">${COUNTS.filter(([k, , always]) => always || c[k] > 0).map(([k, label]) => {
        const d = delta[k] | 0;
        return html`<dt>${label}</dt><dd class="num">${c[k] | 0}${d ? html` <span class="st ${d > 0 ? 'ok' : 'err'}">${d > 0 ? '+' + d : d}</span>` : ''}</dd>`;
    })}</dl>${c.updated_at ? html`<p class="faint ov-sm">更新于 ${ago(c.updated_at * 1000)}</p>` : ''}`;
}

function probeHtml(n) {
    const c = n.card;
    if (!c) return html`<p class="muted">监控已关闭。不探测状态，也不抓取媒体计数。</p>`;
    const sla = slaGrade(c.avail_30d ?? c.avail_7d);
    const trend = sparkHtml(c.trend, 240, 28);
    return html`
        <div class="ov-probes-wide">${probesHtml(probeBars(c.history, 60))}</div>
        <p class="faint ov-sm">近 60 分钟的探测，每格一次。黄色是慢于 500 ms，红色是失败。</p>
        <dl class="kv">
            <dt>最近一次</dt><dd class="num">${c.latest_ts ? html`${c.ok ? c.latest_ms + ' ms' : '失败'} · ${ago(c.latest_ts * 1000)}` : '尚未探测'}</dd>
            <dt>可用率</dt><dd class="num">24h ${pct(c.avail_24h)} · 7d ${pct(c.avail_7d)} · 30d ${pct(c.avail_30d)}</dd>
            ${sla ? html`<dt>SLA</dt><dd><span class="st ${sla === 'C' ? 'warn' : 'ok'}" title="30 天可用率">等级 ${sla}</span></dd>` : ''}
            ${trend ? html`<dt>入库趋势</dt><dd class="ov-trend">${trend}<span class="faint ov-sm">近 14 天媒体总数</span></dd>` : ''}
        </dl>`;
}

function editForm(r) {
    return html`
        <form class="sec ov-edit" data-submit="save" hidden>
            <div class="sec-head"><h2>快速编辑</h2><p>图标、独立账号和请求头编辑器在完整编辑里。</p></div>
            <div class="fields">
                <label class="field"><span>备注</span><input name="remark" value="${r.remark || ''}"></label>
                <label class="field"><span>前缀</span><input name="prefix" value="${r.prefix}" required autocapitalize="off" spellcheck="false"></label>
                <label class="field"><span>分组 / 标签</span><input name="group" value="${r.group_name || ''}" placeholder="可选"></label>
                <label class="field"><span>模式</span><select name="mode">${Object.entries(MODES).map(([k, m]) => html`<option value="${k}" ${k === r.mode ? 'selected' : ''}>${m.name}（${m.hint}）</option>`)}</select></label>
                <label class="field"><span>保号天数</span><input name="keepalive" type="number" min="0" max="365" value="${r.keepalive_days | 0}"></label>
                <label class="field wide"><span>上游线路（每行一个，第一行是主源）</span><textarea name="targets" rows="2" spellcheck="false">${splitTargets(r.target).join('\n')}</textarea></label>
                <label class="field wide"><span>自定义请求头</span><textarea name="headers" rows="2" placeholder="Header: Value" spellcheck="false">${r.custom_headers || ''}</textarea></label>
                <label class="ov-check wide"><input type="checkbox" name="cache" ${r.cache_img !== 'off' ? 'checked' : ''}>海报和静态资源缓存</label>
            </div>
            <div class="sec-actions">
                <button type="submit" class="btn pri">保存</button>
                <button type="button" class="btn" data-action="edit">取消</button>
            </div>
        </form>`;
}

function body(n, shown) {
    const r = n.route, a = n.auth || {};
    const st = STATUS[n.status];
    const p = pingView(n.ping);
    const keys = headerKeys(r.custom_headers);
    const keep = keepaliveView(r.keepalive_days | 0, r.keepalive_last_played_at | 0);
    const monOn = (r.monitor_enabled == null ? 1 : r.monitor_enabled | 0) === 1;
    const user = a.emby_username ?? r.emby_username ?? '';
    return html`
        <div class="sec">
            <div class="ov-head">
                <span class="st ${st.cls}"><i></i>${st.label}</span>
                <span class="grow"></span>
                <button type="button" class="btn sm" data-action="ping" title="重新测速">延迟 <span class="num st ${p.cls}">${p.text}</span></button>
            </div>
            <div class="sec-actions">
                <button type="button" class="btn" data-action="copy">复制直达链接</button>
                <button type="button" class="btn" data-action="edit">快速编辑</button>
                <a class="btn" href="${pageHash('nodes', r.prefix)}">完整编辑</a>
                <span class="grow"></span>
                <button type="button" class="btn danger" data-action="del">删除</button>
            </div>
        </div>
        ${editForm(r)}
        <section class="sec"><div class="sec-head"><h2>探测</h2></div>${probeHtml(n)}</section>
        <section class="sec"><div class="sec-head"><h2>节点</h2></div>
            <dl class="kv">
                ${splitTargets(r.target).map((t, i) => html`<dt>${i ? '备 ' + i : '主源'}</dt><dd class="num">${t}</dd>`)}
                <dt>直达</dt><dd class="num">${location.origin}${shown(r.prefix)}</dd>
                <dt>模式</dt><dd>${MODES[r.mode] ? `${MODES[r.mode].name}（${MODES[r.mode].hint}）` : '未知'}</dd>
                ${r.group_name ? html`<dt>分组</dt><dd>${r.group_name}</dd>` : ''}
                <dt>请求头</dt><dd>${keys.length ? keys.join(', ') : '无'}</dd>
                <dt>海报缓存</dt><dd>${r.cache_img !== 'off' ? '开' : html`<span class="st warn">已关闭</span>`}</dd>
                ${keep ? html`<dt>保号提醒</dt><dd><span class="${keep.warn ? 'st warn' : ''}" title="超期未观看会通过 Telegram 提醒">${keep.text}</span></dd>` : ''}
                <dt>今日播放</dt><dd class="num">${r.todayReqs | 0}<span class="faint"> · 累计 ${r.totalReqs | 0}</span></dd>
                <dt>今日流量</dt><dd class="num">${r.todayBandwidth || '—'}</dd>
                <dt>最后活跃</dt><dd class="num">${r.last_play || '暂无播放记录'}</dd>
            </dl>
        </section>
        <section class="sec"><div class="sec-head"><h2>媒体计数</h2></div>${countsHtml(n.card)}</section>
        <section class="sec"><div class="sec-head"><h2>监控与登录</h2></div>
            <label class="ov-switch"><input type="checkbox" class="switch" data-change="monitor" ${monOn ? 'checked' : ''}>
                <span>监控此节点<span class="faint ov-sm">关闭后不探测状态，也不抓取媒体计数</span></span></label>
            <dl class="kv">
                <dt>登录态</dt><dd>${a.has_token ? html`<span class="st ok"><i></i>已缓存</span>` : '未登录'}</dd>
                <dt>账号</dt><dd>${user || '全局共享'}</dd>
                <dt>上次登录</dt><dd class="num">${when(a.emby_auth_seen_at)}</dd>
                <dt>最近使用</dt><dd class="num">${when(a.emby_auth_used_at)}</dd>
            </dl>
            <div class="sec-actions">
                ${a.has_token ? html`<button type="button" class="btn" data-action="revoke">清除登录缓存</button>` : ''}
                <button type="button" class="btn" data-action="refresh">刷新配置</button>
            </div>
            <p class="faint ov-sm">独立账号在完整编辑里设置。</p>
        </section>`;
}

// ctx: find(prefix) → node view, shown(prefix) → masked text, ping(prefix),
// reload(), refreshConfig(), refreshProbes(). Returns the panel <dialog> with refresh().
export function openDetail(ctx, startPrefix) {
    let prefix = startPrefix;
    const n0 = ctx.find(prefix);
    const d = openPanel({ title: n0.route.remark || '未命名媒体库', sub: ctx.shown(prefix) });
    const form = () => d.body.querySelector('.ov-edit');

    d.refresh = () => {
        const n = ctx.find(prefix);
        if (!n) { d.close(); return; }
        d.querySelector('.panel-title h2').textContent = n.route.remark || '未命名媒体库';
        d.querySelector('.panel-title .muted').textContent = ctx.shown(prefix);
        if (form() && !form().hidden) return;
        const top = d.body.scrollTop;
        render(d.body, body(n, ctx.shown));
        d.body.scrollTop = top;
    };

    on(d, {
        ping: () => ctx.ping(prefix),
        copy: () => navigator.clipboard.writeText(location.origin + '/' + prefix).then(() => toast('已复制'), toastError),
        edit: () => {
            const f = form();
            f.hidden = !f.hidden;
            if (f.hidden) d.refresh();
            else f.querySelector('input').focus();
        },
        del: async () => {
            const r = ctx.find(prefix).route;
            const ok = await confirm({
                title: `删除节点「${r.remark || '未命名媒体库'}」（/${prefix}）？`,
                body: '该节点的上游线路、自定义请求头与独立 Emby 凭据会一并删除，且不可恢复。',
                ok: '删除节点',
                danger: true,
            });
            if (!ok) return;
            try {
                await api('/api/routes?prefix=' + encodeURIComponent(prefix), { method: 'DELETE' });
                toast('节点已移除');
                d.close();
                ctx.reload();
            } catch (err) { toastError(err); }
        },
        revoke: async () => {
            if (!await confirm({ title: '清除该节点已缓存的登录令牌？', body: '下次需要计数时会用账号密码重新登录。', ok: '清除' })) return;
            try {
                await api('/api/status/revoke-auth', { method: 'POST', body: { prefix } });
                toast('已清除');
                ctx.refreshConfig();
            } catch (err) { toastError(err); }
        },
        refresh: async () => { await ctx.refreshConfig(); toast('已刷新'); },
    });

    on(d, {
        monitor: async el => {
            const enabled = el.checked;
            try {
                await api('/api/routes/monitor', { method: 'POST', body: { prefix, enabled } });
                ctx.find(prefix).route.monitor_enabled = enabled ? 1 : 0;
                toast((enabled ? '已开启监控：' : '已关闭监控：') + prefix);
                ctx.refreshProbes();
            } catch (err) {
                el.checked = !enabled;
                toastError(err);
            }
        },
    }, 'change');

    on(d, {
        save: async (f, e) => {
            e.preventDefault();
            const v = Object.fromEntries(new FormData(f));
            const payload = editPayload(ctx.find(prefix).route, { ...v, cache: f.elements.cache.checked });
            if (!payload.target) return toast('请至少填写一个主线路地址', 'err');
            const btn = f.querySelector('[type="submit"]');
            btn.disabled = true;
            try {
                await api('/api/routes', { method: 'POST', body: payload });
                toast('节点已更新');
                prefix = payload.prefix;
                f.hidden = true;
                await ctx.refreshConfig();
            } catch (err) {
                toastError(err);
                btn.disabled = false;
            }
        },
    }, 'submit');

    d.refresh();
    return d;
}

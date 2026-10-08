import { html, render } from '../html.js';
import { api } from '../api.js';
import { on, toast, toastError } from '../ui.js';

export function mount(root) {
    render(root, html`
        <div class="sec"><p class="muted">每分钟探测一次。连续 5 分钟失败发出告警。开启监控的节点自动拉取媒体计数。</p></div>
        <form class="sec" data-submit="country">
            <div class="sec-head"><h2>代理国家白名单</h2><p>只允许这些国家或地区的客户端走反代。管理端点不受影响。留空即关闭。</p></div>
            <label class="field gl-list"><span>国家代码，逗号分隔</span><input name="v" placeholder="例：CN,HK,TW" autocomplete="off"></label>
            <div class="sec-actions"><button class="btn pri">保存</button></div>
        </form>
        <form class="sec" data-submit="hotlink">
            <div class="sec-head"><h2>防盗链 Referer 白名单</h2><p>允许内嵌的来源域名。带 Referer 且不在名单里的浏览器请求会被拦截。原生播放器不带 Referer，不受影响。留空即关闭。</p></div>
            <label class="field gl-list"><span>域名，逗号分隔</span><input name="v" placeholder="例：emby.example.com,my.site" autocomplete="off"></label>
            <div class="sec-actions"><button class="btn pri">保存</button></div>
        </form>
        <form class="sec" data-submit="creds">
            <div class="sec-head"><h2>全局共享 Emby 账号</h2><p>媒体计数默认用这个账号登录，所有节点共用。可以在某个节点的编辑里单独覆盖。鉴权 UA 取自该节点的访问日志，日志里没有 UA 时不发请求。</p></div>
            <div class="fields">
                <label class="field"><span>用户名</span><input name="user" autocomplete="off" placeholder="留空即关闭共享账号"></label>
                <label class="field"><span>密码</span><input name="pass" type="password" autocomplete="new-password" placeholder="留空不改"></label>
            </div>
            <div class="sec-actions"><button class="btn pri">保存</button></div>
        </form>`);

    const form = name => root.querySelector(`[data-submit="${name}"]`);

    async function load() {
        try {
            const [flags, creds] = await Promise.all([api('/api/status/global-flags'), api('/api/status/emby-creds')]);
            form('country').v.value = flags.country_allowlist || '';
            form('hotlink').v.value = flags.hotlink_allow_hosts || '';
            form('creds').user.value = creds.username || '';
            form('creds').pass.value = '';
            form('creds').pass.placeholder = creds.has_password ? '已设置（留空不改）' : '留空不改';
        } catch (err) { toastError(err); }
    }

    async function save(f, body, done = '已保存') {
        const btn = f.querySelector('button');
        btn.disabled = true;
        try {
            await api(f.dataset.submit === 'creds' ? '/api/status/emby-creds' : '/api/status/global-flags', { method: 'POST', body });
            toast(done);
            await load();
        } catch (err) { toastError(err); } finally { btn.disabled = false; }
    }

    on(root, {
        country: (f, e) => { e.preventDefault(); save(f, { country_allowlist: f.v.value.trim() }); },
        hotlink: (f, e) => { e.preventDefault(); save(f, { hotlink_allow_hosts: f.v.value.trim() }); },
        creds: (f, e) => { e.preventDefault(); save(f, { username: f.user.value.trim(), password: f.pass.value }, '共享账号已保存'); },
    }, 'submit');

    load();
}

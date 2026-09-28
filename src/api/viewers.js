// Viewer 管理端点（admin_token 鉴权后）。
//   GET    /api/viewers                  列表（含各节点授权）+ 各节点 max_concurrent
//   POST   /api/viewers                  新建 {username, password} / 修改 {id, username?, password?, enabled?}
//   DELETE /api/viewers?id=              删除 viewer 及其全部数据
//   POST   /api/viewers/access           授权 {viewer_id, prefix, quota, hidden_libraries}
//   DELETE /api/viewers/access?viewer_id=&prefix=
//   POST   /api/viewers/cap              节点并发上限 {prefix, max_concurrent}
//   GET    /api/viewers/libraries?prefix= 节点上游媒体库（隐藏选择器用）
import { dbAll } from '../db/helpers.js';
import { updateRouteColumns } from '../routing/route.js';
import { listViewers, createViewer, updateViewer, deleteViewer, grantAccess, revokeAccess, nodeCapacity } from '../viewers/store.js';
import { getUpstreamSession } from '../viewers/upstream.js';
import { proxyRequest } from '../proxy/engine.js';

const ok = (extra) => Response.json({ success: true, ...extra });
const fail = (error, status = 400) => Response.json({ success: false, error }, { status });
const USERNAME_RE = /^[\w.@-]{1,64}$/;
const nonNegInt = (x) => Number.isInteger(Number(x)) && Number(x) >= 0;

export async function handleViewers(request, env, ctx, url) {
    if (!url.pathname.startsWith('/api/viewers')) return null;
    if (!env.DB) return fail('未绑定 DB', 500);
    const p = url.pathname; const m = request.method;
    try {
        if (p === '/api/viewers' && m === 'GET') {
            const caps = await dbAll(env, `SELECT prefix, remark, max_concurrent FROM routes ORDER BY sort_order, prefix`);
            return ok({ viewers: await listViewers(env), nodes: caps.results || [] });
        }
        if (p === '/api/viewers' && m === 'POST') {
            const d = await request.json();
            if (d.username !== undefined && !USERNAME_RE.test(String(d.username))) return fail('用户名只能包含字母、数字、_ . @ -（1-64 位）');
            if (d.password && String(d.password).length < 6) return fail('密码至少 6 位');
            if (!d.id) {
                if (!d.username || !d.password) return fail('需要用户名和密码');
                try { return ok({ id: await createViewer(env, String(d.username), String(d.password)) }); }
                catch (e) { return /UNIQUE/i.test(e.message) ? fail('用户名已存在', 409) : Promise.reject(e); }
            }
            await updateViewer(env, String(d.id), {
                username: d.username === undefined ? undefined : String(d.username),
                password: d.password ? String(d.password) : '',
                enabled: d.enabled === undefined ? undefined : !!d.enabled,
            });
            return ok();
        }
        if (p === '/api/viewers' && m === 'DELETE') {
            await deleteViewer(env, url.searchParams.get('id') || '');
            return ok();
        }
        if (p === '/api/viewers/access' && m === 'POST') {
            const d = await request.json();
            const quota = Number(d.quota ?? 1);
            if (!d.viewer_id || !d.prefix || !nonNegInt(quota)) return fail('参数错误');
            const hidden = Array.isArray(d.hidden_libraries) ? d.hidden_libraries.map(String) : [];
            const cap = await nodeCapacity(env, d.prefix, d.viewer_id);
            if (!cap.exists) return fail('节点不存在', 404);
            if (cap.cap > 0) {
                if (quota < 1) return fail('节点设置了并发上限，配额至少为 1');
                if (cap.used + quota > cap.cap) return fail(`配额超出节点上限：已分配 ${cap.used}/${cap.cap}，本次最多 ${cap.cap - cap.used}`);
            }
            await grantAccess(env, String(d.viewer_id), String(d.prefix), quota, hidden);
            return ok();
        }
        if (p === '/api/viewers/access' && m === 'DELETE') {
            await revokeAccess(env, url.searchParams.get('viewer_id') || '', url.searchParams.get('prefix') || '');
            return ok();
        }
        if (p === '/api/viewers/cap' && m === 'POST') {
            const d = await request.json();
            const max = Number(d.max_concurrent);
            if (!d.prefix || !nonNegInt(max)) return fail('参数错误');
            const cap = await nodeCapacity(env, d.prefix);
            if (!cap.exists) return fail('节点不存在', 404);
            if (max > 0 && cap.used > max) return fail(`已分配配额 ${cap.used} 超过新上限 ${max}，请先调小 viewer 配额`);
            await updateRouteColumns(env, String(d.prefix), { max_concurrent: max });
            return ok();
        }
        if (p === '/api/viewers/libraries' && m === 'GET') {
            const prefix = url.searchParams.get('prefix') || '';
            const up = await getUpstreamSession(env, prefix, request.headers.get('User-Agent') || '');
            if (!up) return fail('节点上游账号不可用：请先在节点里填写 Emby 用户名/密码', 503);
            const r = await proxyRequest(new Request(`${url.origin}/${prefix}/emby/Users/${up.userId}/Views`, {
                headers: { 'X-Emby-Token': up.token, 'Accept': 'application/json', 'User-Agent': request.headers.get('User-Agent') || '' },
            }), env, ctx, new URL(`${url.origin}/${prefix}/emby/Users/${up.userId}/Views`));
            const data = r.ok ? await r.json().catch(() => null) : null;
            if (!data) return fail(`读取媒体库失败（HTTP ${r.status}）`, 502);
            return ok({ libraries: (data.Items || []).map(x => ({ id: String(x.Id), name: x.Name })) });
        }
        return new Response('Method not allowed', { status: 405 });
    } catch (e) {
        return fail(e.message, 500);
    }
}

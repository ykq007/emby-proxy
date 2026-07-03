import { ensureSchema } from '../db/schema.js';
import { dbAll, dbFirst, dbRun, dbStmt, dbBatch } from '../db/helpers.js';
import { probeDomain } from '../routing/validate.js';
import { maybeRefreshOptimizedDomains } from '../optimized/vps789.js';

export async function handleOptimizedDomains(request, env, ctx, url) {
    // ==========================================
    // 🚀 F4: 优选域名 CRUD + 测速
    // ==========================================
    if (url.pathname === '/api/optimized-domains' && request.method === 'GET') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
        await ensureSchema(env);
        // vps789 惰性刷新：首次拉取会阻塞（让首屏就是真实数据），过 TTL 后台刷新；
        // 刷新失败/异常绝不能影响列表接口本身返回。
        try { await maybeRefreshOptimizedDomains(env, ctx); } catch (e) {}
        const { results } = await dbAll(env, `SELECT id, domain, note, builtin, enabled, last_ms FROM optimized_domains ORDER BY builtin DESC, id ASC`);
        return Response.json({ success: true, items: results || [] });
    }
    if (url.pathname === '/api/optimized-domains' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
        await ensureSchema(env);
        try {
            const { domain, note } = await request.json();
            const d = String(domain || '').trim().toLowerCase();
            if (!d || !/^[a-z0-9.-]+$/.test(d)) return Response.json({ success: false, error: '域名格式非法' }, { status: 400 });
            await dbRun(env, `INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 0, 1)`, d, String(note || ''));
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
    }
    if (url.pathname.startsWith('/api/optimized-domains/') && url.pathname !== '/api/optimized-domains/speedtest') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
        await ensureSchema(env);
        const id = parseInt(url.pathname.split('/').pop(), 10);
        if (!id) return Response.json({ success: false, error: 'invalid id' }, { status: 400 });
        const row = await dbFirst(env, `SELECT * FROM optimized_domains WHERE id = ?`, id);
        if (!row) return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
        if (request.method === 'PATCH') {
            try {
                const body = await request.json();
                const enabled = body.enabled === undefined ? row.enabled : (body.enabled ? 1 : 0);
                const note = body.note === undefined ? row.note : String(body.note || '');
                await dbRun(env, `UPDATE optimized_domains SET enabled = ?, note = ? WHERE id = ?`, enabled, note, id);
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
        }
        if (request.method === 'DELETE') {
            if (row.builtin) return Response.json({ success: false, error: '内置域名不可删除（可禁用）' }, { status: 400 });
            await dbRun(env, `DELETE FROM optimized_domains WHERE id = ?`, id);
            return Response.json({ success: true });
        }
        return new Response("Method not allowed", { status: 405 });
    }
    if (url.pathname === '/api/optimized-domains/speedtest' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
        await ensureSchema(env);
        const { results } = await dbAll(env, `SELECT id, domain FROM optimized_domains WHERE enabled = 1`);
        const rows = results || [];
        const measured = await Promise.all(rows.map(async r => {
            const probe = await probeDomain(r.domain);
            return { id: r.id, domain: r.domain, ms: probe.ms, ok: probe.ok };
        }));
        // 持久化 last_ms
        try {
            const stmts = measured.map(m => dbStmt(env, `UPDATE optimized_domains SET last_ms = ? WHERE id = ?`, m.ms, m.id));
            if (stmts.length) await dbBatch(env, stmts);
        } catch (e) {}
        measured.sort((a, b) => {
            if (!a.ok && !b.ok) return 0;
            if (!a.ok) return 1;
            if (!b.ok) return -1;
            return a.ms - b.ms;
        });
        return Response.json({ success: true, items: measured });
    }

    return null;
}

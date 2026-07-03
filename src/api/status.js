import { ensureSchema } from '../db/schema.js';
import { dbAll, dbFirst } from '../db/helpers.js';
import { loadStatusData } from '../status/page.js';
import { HARVEST_MEM, encryptSecret } from '../emby/tokens.js';
import { invalidateConfigCache } from '../proxy/config-cache.js';
import { PREFIX_SELECT, ROUTE_CREDS_SELECT, updateRouteColumns, clearEmbyAuthCache } from '../routing/route.js';
import {
    kvGet,
    kvSet,
    COUNTRY_ALLOWLIST_KEY,
    HOTLINK_ALLOW_HOSTS_KEY,
    EMBY_SHARED_USERNAME_KEY,
    EMBY_SHARED_PASSWORD_ENC_KEY,
} from '../db/kv.js';

export async function handleStatusApi(request, env, ctx, url) {
    if (url.pathname === '/api/status/route-flags' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        try {
            const body = await request.json();
            const prefix = String(body.prefix || '').trim();
            if (!prefix) return Response.json({ success: false, error: '缺少 prefix' }, { status: 400 });
            const exists = await dbFirst(env, `SELECT ${PREFIX_SELECT} FROM routes WHERE prefix = ?`, prefix);
            if (!exists) return Response.json({ success: false, error: '节点不存在' }, { status: 404 });
            const fields = {};
            if (body.show_on_status !== undefined) fields.show_on_status = body.show_on_status ? 1 : 0;
            if (body.public_alias !== undefined) fields.public_alias = String(body.public_alias || '').trim();
            if (body.media_counts_auto_auth !== undefined) fields.media_counts_auto_auth = body.media_counts_auto_auth ? 1 : 0;
            if (!Object.keys(fields).length) return Response.json({ success: false, error: '无字段需要更新' }, { status: 400 });
            await updateRouteColumns(env, prefix, fields);
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
    }
    if (url.pathname === '/api/status/revoke-auth' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        try {
            const body = await request.json();
            const prefix = String(body.prefix || '').trim();
            if (!prefix) return Response.json({ success: false, error: '缺少 prefix' }, { status: 400 });
            await clearEmbyAuthCache(env, prefix, { clearUsedAt: true });
            HARVEST_MEM.delete(prefix);
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
    }
    // Admin probe data: same shape as /status (cards[]) — drives ECG strips on overview.
    if (url.pathname === '/api/status/probes' && request.method === 'GET') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        try {
            // 管理端：开启后台实时刷新，使面板计数趋近实时。
            const data = await loadStatusData(env, { liveRefresh: true, ctx });
            return Response.json({ success: true, cards: data.cards });
        } catch (e) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    }
    if (url.pathname === '/api/status/auth-state' && request.method === 'GET') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        const { results } = await dbAll(env, `
            SELECT prefix, show_on_status, public_alias, media_counts_auto_auth,
                   CASE WHEN emby_auth_cache = '' THEN 0 ELSE 1 END AS has_token,
                   emby_username,
                   CASE WHEN emby_password_enc = '' THEN 0 ELSE 1 END AS has_password,
                   emby_auth_seen_at, emby_auth_used_at
              FROM routes
        `);
        return Response.json({ success: true, items: results || [] });
    }
    if (url.pathname === '/api/status/global-flags' && request.method === 'GET') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        const countrySet = await kvGet(env, COUNTRY_ALLOWLIST_KEY);
        const hotlinkSet = await kvGet(env, HOTLINK_ALLOW_HOSTS_KEY);
        return Response.json({
            success: true,
            country_allowlist: countrySet ? [...countrySet].join(',') : '',
            hotlink_allow_hosts: hotlinkSet ? [...hotlinkSet].join(',') : ''
        });
    }
    if (url.pathname === '/api/status/global-flags' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        try {
            const body = await request.json();
            if (body.country_allowlist !== undefined) {
                await kvSet(env, COUNTRY_ALLOWLIST_KEY, body.country_allowlist);
            }
            if (body.hotlink_allow_hosts !== undefined) {
                await kvSet(env, HOTLINK_ALLOW_HOSTS_KEY, body.hotlink_allow_hosts);
            }
            invalidateConfigCache();
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
    }

    // 节点独立 Emby 凭据：用户名留空 = 回退全局共享；密码留空 = 不修改。
    if (url.pathname === '/api/status/route-creds' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        try {
            const body = await request.json();
            const prefix = String(body.prefix || '').trim();
            if (!prefix) return Response.json({ success: false, error: '缺少 prefix' }, { status: 400 });
            const prev = await dbFirst(env, `SELECT ${ROUTE_CREDS_SELECT} FROM routes WHERE prefix = ?`, prefix);
            if (!prev) return Response.json({ success: false, error: '节点不存在' }, { status: 404 });
            const username = String(body.emby_username || '').trim();
            let passEnc = prev.emby_password_enc || '';
            if (!username) {
                passEnc = '';
            } else if (typeof body.emby_password === 'string' && body.emby_password.length > 0) {
                passEnc = await encryptSecret(env, body.emby_password);
            }
            const changed = username !== (prev.emby_username || '') || passEnc !== (prev.emby_password_enc || '');
            const authCache = changed ? '' : (prev.emby_auth_cache || '');
            const fields = { emby_username: username, emby_password_enc: passEnc, emby_auth_cache: authCache };
            if (changed) fields.emby_auth_seen_at = 0;
            await updateRouteColumns(env, prefix, fields);
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
    }

    // 全局共享 Emby 凭据（媒体计数实时鉴权的默认账号；节点可单独覆盖）。
    if (url.pathname === '/api/status/emby-creds' && request.method === 'GET') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        const username = await kvGet(env, EMBY_SHARED_USERNAME_KEY);
        const passEnc = await kvGet(env, EMBY_SHARED_PASSWORD_ENC_KEY);
        return Response.json({
            success: true,
            username: username || '',
            has_password: passEnc ? 1 : 0
        });
    }
    if (url.pathname === '/api/status/emby-creds' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' }, { status: 500 });
        await ensureSchema(env);
        try {
            const body = await request.json();
            const username = String(body.username || '').trim();
            await kvSet(env, EMBY_SHARED_USERNAME_KEY, username);
            if (!username) {
                // 清空用户名 = 关闭全局共享凭据，同时清掉密码。
                await kvSet(env, EMBY_SHARED_PASSWORD_ENC_KEY, '');
            } else if (typeof body.password === 'string' && body.password.length > 0) {
                const enc = await encryptSecret(env, body.password);
                await kvSet(env, EMBY_SHARED_PASSWORD_ENC_KEY, enc);
            }
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
    }

    return null;
}

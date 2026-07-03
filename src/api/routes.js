import { dbAll, dbFirst, dbRun } from '../db/helpers.js';
import { validateRoutePrefix } from '../routing/route-alias-policy.js';
import { encryptSecret } from '../emby/tokens.js';
import { refreshBandwidth } from '../stats/bandwidth.js';
import { formatBytes } from '../stats/traffic.js';
import { beijingDayStr } from '../util/clock.js';
import {
    PREV_ROW_SELECT,
    reorderRoutes,
    updateRouteColumns,
    importRoute,
    upsertRoute,
    deleteRoute,
} from '../routing/route.js';

export async function handleRoutes(request, env, ctx, url) {
    if (url.pathname === '/api/routes/reorder' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: "未绑定 DB" });
        try {
            const items = await request.json();
            await reorderRoutes(env, items);
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }); }
    }

    // 每节点监控开关：开/关状态探测 + 媒体计数（与代理 mode 解耦）。
    if (url.pathname === '/api/routes/monitor' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: "未绑定 DB" }, { status: 500 });
        try {
            const { prefix, enabled } = await request.json();
            if (!prefix) return Response.json({ success: false, error: "缺少 prefix" }, { status: 400 });
            await updateRouteColumns(env, prefix, { monitor_enabled: enabled ? 1 : 0 });
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: String(e && e.message || e) }, { status: 500 }); }
    }

    if (url.pathname === '/api/routes/import' && request.method === 'POST') {
        if (!env.DB) return Response.json({ success: false, error: "未绑定 DB" });
        try {
            const routes = await request.json();
            const skipped = []; let imported = 0;
            for (const r of routes) {
                if (!r.prefix || !r.target) { skipped.push({ prefix: r.prefix || '(空)', reason: '缺少 prefix 或 target' }); continue; }
                const reason = validateRoutePrefix(r.prefix);
                if (reason) { skipped.push({ prefix: r.prefix, reason }); continue; }
                const row = {
                    prefix: r.prefix, target: r.target, mode: r.mode || 'off', remark: r.remark || '',
                    group_name: r.group_name || '', last_play: r.last_play || '', icon: r.icon || '',
                    cache_img: r.cache_img || 'on', sort_order: r.sort_order || 0, custom_headers: r.custom_headers || '',
                    backend_url: r.backend_url || '', show_on_status: r.show_on_status ? 1 : 0, public_alias: r.public_alias || '',
                    media_counts_auto_auth: r.media_counts_auto_auth ? 1 : 0, keepalive_days: r.keepalive_days || 0,
                    keepalive_last_played_at: r.keepalive_last_played_at || 0, keepalive_last_reminded_at: r.keepalive_last_reminded_at || 0,
                };
                // IMPORT_COLUMNS 定义了写入顺序；此处仅装配对应字段，未列出的列(如 monitor_enabled)保持表默认值。
                await importRoute(env, row);
                imported++;
            }
            return Response.json({ success: true, imported, skipped });
        } catch (e) { return Response.json({ success: false, error: e.message }); }
    }

    if (url.pathname.startsWith('/api/routes')) {
        if (!env.DB) return Response.json({ error: "由于未绑定 D1 数据库，反代功能不可用。" }, { status: 500 });

        // 表结构由 ensureSchema 统一保证（每请求前已运行）。
        // visitor_logs 清理已移至每日 cron (scheduled.js)，此处不再执行。

        if (request.method === 'GET') {
            const todayStr = beijingDayStr();
            const { results: routes } = await dbAll(env, `
                SELECT r.*,
                IFNULL(s.count, 0) as todayReqs,
                (SELECT SUM(count) FROM request_stats WHERE prefix = r.prefix) as totalReqs
                FROM routes r
                LEFT JOIN request_stats s ON r.prefix = s.prefix AND s.date = ?
                ORDER BY r.sort_order ASC, r.prefix ASC
            `, todayStr);

            if (env.CF_API_TOKEN && env.CF_ZONE_ID && routes && routes.length > 0) {
                // 今日带宽只读 D1（由 cron 周期性从 CF GraphQL 刷新写入），不在页面打开时实时拉取。
                let bwRows = await dbAll(env, `SELECT prefix, bytes FROM route_bandwidth_today WHERE day = ?`, todayStr);
                let bytesByPrefix = new Map((bwRows.results || []).map(r => [r.prefix, r.bytes]));

                // 冷启动回退：今日尚无任何带宽数据（cron 还没跑过，如刚部署或刚跨北京零点），
                // 同步抓取一次并写库，避免首屏空白；之后请求与后续 cron 都走快路径。
                if (bytesByPrefix.size === 0) {
                    try {
                        await refreshBandwidth(env);
                        bwRows = await dbAll(env, `SELECT prefix, bytes FROM route_bandwidth_today WHERE day = ?`, todayStr);
                        bytesByPrefix = new Map((bwRows.results || []).map(r => [r.prefix, r.bytes]));
                    } catch (e) { /* 抓取失败：下方按缺失处理，标记“获取异常” */ }
                }

                for (const r of routes) {
                    if (bytesByPrefix.has(r.prefix)) {
                        r.todayBandwidth = formatBytes(bytesByPrefix.get(r.prefix));
                    } else {
                        // 缺失：该 prefix 本次刷新未取到（新增节点未到下次刷新，或分块失败）。
                        r.todayBandwidth = "获取异常";
                    }
                }
            }

            // 不向前端回传加密密码 blob；改为暴露布尔“是否已配置独立密码”。
            for (const r of (routes || [])) {
                r.has_emby_password = r.emby_password_enc ? 1 : 0;
                delete r.emby_password_enc;
            }
            return Response.json(routes || []);
        }

        if (request.method === 'POST') {
            const data = await request.json();
            // F1: 保留前缀 + 格式校验
            const invalidReason = validateRoutePrefix(data.prefix);
            if (invalidReason) {
                return Response.json({ success: false, error: `路由别名 "${data.prefix}" 不可用：${invalidReason}` }, { status: 400 });
            }
            let currentSortOrder = 0;
            let prevStatusFields = { show_on_status: 0, public_alias: '', media_counts_auto_auth: 0, monitor_enabled: 1 };
            let prevRuntimeFields = { last_play: '', emby_auth_cache: '', emby_auth_seen_at: 0, emby_auth_used_at: 0, keepalive_last_played_at: 0, keepalive_last_reminded_at: 0, emby_username: '', emby_password_enc: '' };
            const absorbOldRow = (oldRow) => {
                if (!oldRow) return;
                currentSortOrder = oldRow.sort_order;
                prevStatusFields = { show_on_status: oldRow.show_on_status | 0, public_alias: oldRow.public_alias || '', media_counts_auto_auth: oldRow.media_counts_auto_auth | 0, monitor_enabled: oldRow.monitor_enabled == null ? 1 : (oldRow.monitor_enabled | 0) };
                prevRuntimeFields = {
                    last_play: oldRow.last_play || '',
                    emby_auth_cache: oldRow.emby_auth_cache || '',
                    emby_auth_seen_at: oldRow.emby_auth_seen_at | 0,
                    emby_auth_used_at: oldRow.emby_auth_used_at | 0,
                    keepalive_last_played_at: oldRow.keepalive_last_played_at | 0,
                    keepalive_last_reminded_at: oldRow.keepalive_last_reminded_at | 0,
                    emby_username: oldRow.emby_username || '',
                    emby_password_enc: oldRow.emby_password_enc || '',
                };
            };
            if (data.oldPrefix && data.oldPrefix !== data.prefix) {
                absorbOldRow(await dbFirst(env, `SELECT ${PREV_ROW_SELECT} FROM routes WHERE prefix = ?`, data.oldPrefix));
                await deleteRoute(env, data.oldPrefix);
            } else {
                absorbOldRow(await dbFirst(env, `SELECT ${PREV_ROW_SELECT} FROM routes WHERE prefix = ?`, data.prefix));
            }

            const showOnStatus = data.show_on_status === undefined ? prevStatusFields.show_on_status : (data.show_on_status ? 1 : 0);
            const publicAlias = data.public_alias === undefined ? prevStatusFields.public_alias : String(data.public_alias || '').trim();
            const mediaAuto = data.media_counts_auto_auth === undefined ? prevStatusFields.media_counts_auto_auth : (data.media_counts_auto_auth ? 1 : 0);
            const monitorEnabled = data.monitor_enabled === undefined ? prevStatusFields.monitor_enabled : (data.monitor_enabled ? 1 : 0);
            const keepaliveDays = Math.min(365, Math.max(0, parseInt(data.keepalive_days, 10) || 0));

            // 节点独立 Emby 凭据：用户名留空 = 回退全局共享凭据。
            // 密码留空表示“不改动”（保留旧密文）；提交新密码则重新加密。
            const embyUsername = data.emby_username === undefined ? prevRuntimeFields.emby_username : String(data.emby_username || '').trim();
            let embyPasswordEnc = prevRuntimeFields.emby_password_enc;
            if (!embyUsername) {
                embyPasswordEnc = ''; // 无独立用户名 → 清掉独立密码
            } else if (typeof data.emby_password === 'string' && data.emby_password.length > 0) {
                embyPasswordEnc = await encryptSecret(env, data.emby_password);
            }
            // 凭据变化时作废已缓存的 AccessToken，强制下次重新登录。
            const credsChanged = embyUsername !== prevRuntimeFields.emby_username || embyPasswordEnc !== prevRuntimeFields.emby_password_enc;
            const authCache = credsChanged ? '' : prevRuntimeFields.emby_auth_cache;
            const authSeenAt = credsChanged ? 0 : prevRuntimeFields.emby_auth_seen_at;

            await upsertRoute(env, {
                prefix: data.prefix, target: data.target, mode: data.mode || 'off', remark: data.remark || '',
                group_name: (data.group_name || '').trim(), icon: data.icon || '', cache_img: data.cache_img || 'on',
                sort_order: currentSortOrder, custom_headers: data.custom_headers || '', backend_url: data.backend_url || '',
                show_on_status: showOnStatus, public_alias: publicAlias, media_counts_auto_auth: mediaAuto,
                monitor_enabled: monitorEnabled, last_play: prevRuntimeFields.last_play, emby_auth_cache: authCache,
                emby_auth_seen_at: authSeenAt, emby_auth_used_at: prevRuntimeFields.emby_auth_used_at,
                keepalive_days: keepaliveDays, keepalive_last_played_at: prevRuntimeFields.keepalive_last_played_at,
                keepalive_last_reminded_at: prevRuntimeFields.keepalive_last_reminded_at,
                emby_username: embyUsername, emby_password_enc: embyPasswordEnc,
            });
            return Response.json({ success: true });
        }

        if (request.method === 'DELETE') {
            const prefix = url.searchParams.get('prefix');
            await deleteRoute(env, prefix);
            return Response.json({ success: true });
        }
        return new Response("Method not allowed", { status: 405 });
    }

    return null;
}

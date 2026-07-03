import { getCFTraffic } from '../stats/cf.js';
import { dbAll, dbStmt, dbBatch } from '../db/helpers.js';
import { PREFIX_SELECT } from '../routing/route.js';
import { createCfApi } from '../cf/api.js';

export async function handleCf(request, env, ctx, url, deps = {}) {
    const cfApi = deps.cfApi || createCfApi(env);
    if (url.pathname === '/api/analytics' && request.method === 'GET') {
        if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
        try {
            // 并发获取 24小时、7天、30天流量 (通过全新 GraphQL API 规避限制)
            const [trafficToday, traffic7d, traffic30d] = await Promise.all([
                getCFTraffic(env, 'today'),
                getCFTraffic(env, 7),
                getCFTraffic(env, 30)
            ]);

            const trendStmt = dbStmt(env, `SELECT date(timestamp, '+8 hours') as date, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY date(timestamp, '+8 hours') ORDER BY date ASC`);
            const locationsStmt = dbStmt(env, `SELECT country, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY country ORDER BY count DESC`);
            const recentsStmt = dbStmt(env, `SELECT prefix, datetime(timestamp, '+8 hours') as timestamp, ip, country, ua FROM visitor_logs ORDER BY timestamp DESC LIMIT 20`);
            const [trendRes, locationsRes, recentsRes] = await dbBatch(env, [trendStmt, locationsStmt, recentsStmt]);

            return Response.json({
                success: true,
                trend: trendRes.results,
                locations: locationsRes.results,
                recents: recentsRes.results,
                trafficToday, traffic7d, traffic30d
            });
        } catch (e) {
            return Response.json({ success: false, error: e.message });
        }
    }

    // ==========================================
    // 节点近 N 天每日流量趋势 (sparkline 数据源)
    // 口径：CF GraphQL httpRequestsAdaptiveGroups, 按 clientRequestPath_like "/<prefix>%" 过滤,
    //       date 维度分组, 缺失日补 0, 顺序最早 → 今日 (UTC)。
    // ==========================================
    if (url.pathname === '/api/route-trends' && request.method === 'GET') {
        const days = Math.max(1, Math.min(7, parseInt(url.searchParams.get('days') || '7', 10) || 7));

        if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
            return Response.json({ ok: false, reason: 'no-cf-token', days, items: [] });
        }
        if (!env.DB) {
            return Response.json({ ok: false, reason: 'no-db', days, items: [] });
        }

        try {
            const utcHour = Math.floor(Date.now() / 3600000);
            const cacheKey = `${env.CF_ZONE_ID}|${days}|${utcHour}`;
            globalThis.__routeTrendCache = globalThis.__routeTrendCache || new Map();
            const cached = globalThis.__routeTrendCache.get(cacheKey);
            const now = Date.now();
            if (cached && cached.expireAt > now) {
                return Response.json(cached.payload);
            }

            const { results: routes } = await dbAll(env, `SELECT ${PREFIX_SELECT} FROM routes`);
            if (!routes || routes.length === 0) {
                return Response.json({ ok: false, reason: 'no-routes', days, items: [] });
            }

            const todayUtc = new Date();
            todayUtc.setUTCHours(0, 0, 0, 0);
            const dayKeys = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(todayUtc.getTime() - i * 86400000);
                dayKeys.push(d.toISOString().split('T')[0]);
            }
            const startIso = new Date(todayUtc.getTime() - (days - 1) * 86400000).toISOString();
            const endIso = new Date(todayUtc.getTime() + 86400000 - 1).toISOString();

            const items = await Promise.all(routes.map(async (r) => {
                const empty = dayKeys.map(() => 0);
                try {
                    const query = `query {
                          viewer {
                            zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                              httpRequestsAdaptiveGroups(
                                limit: ${days},
                                filter: {
                                  clientRequestPath_like: "/${r.prefix}%",
                                  datetime_geq: "${startIso}",
                                  datetime_leq: "${endIso}"
                                },
                                orderBy: [date_ASC]
                              ) {
                                dimensions { date }
                                sum { edgeResponseBytes }
                              }
                            }
                          }
                        }`;
                    const g = await cfApi.graphql(query);
                    if (!g.ok) return { prefix: r.prefix, bytes: empty };
                    const groups = g.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
                    const byDate = new Map();
                    for (const grp of groups) {
                        byDate.set(grp.dimensions?.date, grp.sum?.edgeResponseBytes || 0);
                    }
                    const bytes = dayKeys.map(d => byDate.get(d) || 0);
                    return { prefix: r.prefix, bytes };
                } catch (e) {
                    return { prefix: r.prefix, bytes: empty };
                }
            }));

            const payload = {
                ok: true,
                days,
                generated_at: Math.floor(now / 1000),
                source: 'cf-graphql',
                items
            };
            globalThis.__routeTrendCache.set(cacheKey, { expireAt: now + 30 * 60 * 1000, payload });
            return Response.json(payload);
        } catch (e) {
            return Response.json({ ok: false, reason: 'graphql-failed', error: e.message, days, items: [] });
        }
    }

    // ==========================================
    // 🟢 后端接口：执行代码覆盖更新 (纯JSON接口无损继承：变量、数据库、兼容性、放置地区)
    // ==========================================
    if (url.pathname === '/api/deploy' && request.method === 'POST') {
        const cfToken = env.CF_API_TOKEN;
        const accountId = env.CF_ACCOUNT_ID;
        const workerName = env.CF_WORKER_NAME;
        if (!cfToken || !accountId || !workerName) {
            return Response.json({ success: false, error: '缺少 CF_API_TOKEN, CF_ACCOUNT_ID 或 CF_WORKER_NAME 环境变量' });
        }
        try {
            const body = await request.json();
            if (!body.newCode) return Response.json({ success: false, error: '代码内容为空。' });

            // 1. 🚀 终极修复：调用纯 JSON 的 services 接口获取真实配置，绝对不再崩溃！
            const serviceRes = await cfApi.rest(`/accounts/${accountId}/workers/services/${workerName}`);

            let compDate = "2024-01-01"; // 依然保留兜底，但这次绝不会用到
            let compFlags = undefined;
            let placement = undefined;

            if (serviceRes.ok && serviceRes.result) {
                // 精准从 JSON 中提取你原本的配置
                let scriptInfo = null;
                if (serviceRes.result.default_environment && serviceRes.result.default_environment.script) {
                    scriptInfo = serviceRes.result.default_environment.script;
                } else if (serviceRes.result.script) {
                    scriptInfo = serviceRes.result.script;
                }

                if (scriptInfo) {
                    if (scriptInfo.compatibility_date) compDate = scriptInfo.compatibility_date;
                    if (scriptInfo.compatibility_flags) compFlags = scriptInfo.compatibility_flags;
                    if (scriptInfo.placement) placement = scriptInfo.placement;
                }
            }

            const preservedBindings = [];
            // 2. 备份普通的字符串变量
            for (const key in env) {
                if (typeof env[key] === 'string') {
                    preservedBindings.push({ name: key, type: 'plain_text', text: env[key] });
                }
            }

            // 3. 拉取 D1、KV 等高级绑定并无损合并
            const bindingsRes = await cfApi.rest(`/accounts/${accountId}/workers/scripts/${workerName}/bindings`);
            if (bindingsRes.ok && Array.isArray(bindingsRes.result)) {
                for (const b of bindingsRes.result) {
                    if (b.type !== 'plain_text' && b.type !== 'secret_text' && b.type !== 'inherited') {
                        preservedBindings.push(b);
                    }
                }
            }

            // 4. 组装最终的部署请求
            const formData = new FormData();
            const metadata = {
                main_module: 'worker.js',
                bindings: preservedBindings,
                compatibility_date: compDate
            };
            if (compFlags) metadata.compatibility_flags = compFlags;
            if (placement) metadata.placement = placement; // 🎯 完美带上你原始的放置地区！

            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
            formData.append('worker.js', new Blob([body.newCode], { type: 'application/javascript+module' }), 'worker.js');

            const putRes = await cfApi.rest(`/accounts/${accountId}/workers/scripts/${workerName}`, {
                method: 'PUT',
                body: formData,
                isForm: true,
                timeoutMs: 30000, // 上传脚本体积可能较大，超时放宽
            });
            if (putRes.ok) {
                return Response.json({ success: true, msg: '代码更新成功，并已完美保留原有放置地区和兼容配置！' });
            } else {
                throw new Error(putRes.errors ? JSON.stringify(putRes.errors) : putRes.error);
            }
        } catch (e) {
            return Response.json({ success: false, error: e.message });
        }
    }
    // ==========================================
    // 2.4 系统级与提取工具 API
    // ==========================================
    if (url.pathname === '/api/purge-cache' && request.method === 'POST') {
        const zoneId = env.CF_ZONE_ID;
        if (!env.CF_API_TOKEN || !zoneId) return Response.json({ success: false, error: '缺少 CF_API_TOKEN 或 CF_ZONE_ID 变量' });
        try {
            const res = await cfApi.rest(`/zones/${zoneId}/purge_cache`, { method: 'POST', body: { purge_everything: true } });
            if (!res.ok) throw new Error(res.errors ? JSON.stringify(res.errors) : res.error);
            return Response.json({ success: true });
        } catch (e) { return Response.json({ success: false, error: e.message }); }
    }

    return null;
}

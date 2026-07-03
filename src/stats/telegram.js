import { dbAll, dbFirst } from '../db/helpers.js';
import { getCFTraffic } from './cf.js';
import { htmlEscape } from '../tg/client.js';
import { notify } from '../tg/notifications.js';
import { formatBytes, queryRouteTrafficBytes, selectTopTrafficRoute } from './traffic.js';
import { formatBeijingTimestamp } from '../util/clock.js';
import { PREFIX_REMARK_SELECT } from '../routing/route.js';

// `chatId` is accepted for API stability, but notify() always targets the
// single configured admin chat (env.TG_CHAT_ID); every caller already passes
// that same value.
export async function sendTgStats(env, chatId) {
    try {
        const totalQuery = await dbFirst(env, `SELECT COUNT(*) as count FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours')`);
        const topRegionQuery = await dbFirst(env, `SELECT country, COUNT(*) as c FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours') GROUP BY country ORDER BY c DESC LIMIT 1`);
        const topNodeQuery = await dbFirst(env, `
            SELECT r.remark, COUNT(v.id) as c
            FROM visitor_logs v
            LEFT JOIN routes r ON v.prefix = r.prefix
            WHERE date(v.timestamp, '+8 hours') = date('now', '+8 hours')
            GROUP BY v.prefix
            ORDER BY c DESC LIMIT 1
        `);

        // 获取多时间维度流量
        const [trafficToday, traffic7d, traffic30d] = await Promise.all([
            getCFTraffic(env, 'today'),
            getCFTraffic(env, 7),
            getCFTraffic(env, 30)
        ]);

        // ================= 新增：获取今日流量消耗 TOP 1 节点 =================
        let topNodeMsg = "暂无数据";
        if (env.CF_API_TOKEN && env.CF_ZONE_ID && env.DB) {
            try {
                // 1. 获取所有节点
                const { results: routes } = await dbAll(env, `SELECT ${PREFIX_REMARK_SELECT} FROM routes`);
                if (routes && routes.length > 0) {
                    const { bytesByPrefix } = await queryRouteTrafficBytes(env, routes);
                    const { route, bytes: maxBytes } = selectTopTrafficRoute(routes, bytesByPrefix);

                    // 4. 转换字节并组装文本
                    if (maxBytes > 0) {
                        const topNodeName = htmlEscape(route.remark || route.prefix);
                        topNodeMsg = `${topNodeName} 跑了 ${formatBytes(maxBytes)}`;
                    } else {
                        topNodeMsg = "今日全站零消耗";
                    }
                }
            } catch (e) {
                topNodeMsg = "获取失败";
            }
        }
        // ====================================================================

        const totalStr = totalQuery ? totalQuery.count.toLocaleString('en-US') : '0';
        const regionStr = topRegionQuery
            ? `${topRegionQuery.country === 'CN' ? '🇨🇳 中国大陆' : htmlEscape(topRegionQuery.country)} (${topRegionQuery.c.toLocaleString('en-US')} 次)`
            : '暂无记录';
        const nodeStr = topNodeQuery
            ? `${htmlEscape(topNodeQuery.remark || '未命名节点')} (${topNodeQuery.c.toLocaleString('en-US')} 次)`
            : '暂无记录';

        // UTC+8 时间戳
        const timestamp = formatBeijingTimestamp();

        await notify(env, 'daily-stats', {
            stats: {
                totalStr,
                regionStr,
                nodeStr,
                trafficToday,
                traffic7d,
                traffic30d,
                topNodeMsg,
                timestamp,
            },
        });
    } catch (e) {
        console.warn('sendTgStats nok', e.message);
    }
}

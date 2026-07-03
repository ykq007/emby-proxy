import { beijingDayStr, beijingDayWindow } from '../util/clock.js';
import { createCfApi } from '../cf/api.js';

export { beijingDayStr, beijingDayWindow };

export function formatBytes(bytes) {
    if (bytes >= 1099511627776) return (bytes / 1099511627776).toFixed(2) + " TB";
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes > 0) return bytes + " B";
    return "0 B";
}

export function routeTrafficAliasEntries(routes) {
    const safeRe = /^[a-zA-Z0-9\-_]+$/;
    const usedAliases = new Set();
    const entries = [];
    for (const route of (routes || [])) {
        const prefix = typeof route === 'string' ? route : route?.prefix;
        if (!prefix || !safeRe.test(prefix)) continue;
        const base = 'p_' + prefix.replace(/[^a-zA-Z0-9_]/g, '_');
        let alias = base;
        let counter = 2;
        while (usedAliases.has(alias)) {
            alias = base + '_' + counter;
            counter++;
        }
        usedAliases.add(alias);
        entries.push({ alias, prefix, route });
    }
    return entries;
}

export async function queryRouteTrafficBytes(env, routes, options = {}) {
    const result = { bytesByPrefix: new Map(), anySuccess: false };
    if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) return result;

    const aliasEntries = routeTrafficAliasEntries(routes);
    if (aliasEntries.length === 0) return result;

    const cfApi = options.cfApi || createCfApi(env);
    const { startIso, endIso } = beijingDayWindow(options.nowMs);
    const chunkSize = options.chunkSize || 25;
    const chunks = [];
    for (let i = 0; i < aliasEntries.length; i += chunkSize) {
        chunks.push(aliasEntries.slice(i, i + chunkSize));
    }

    await Promise.all(chunks.map(async (chunkEntries) => {
        const subQueries = chunkEntries.map(({ alias, prefix }) =>
            `${alias}: httpRequestsAdaptiveGroups(
                limit: 1,
                filter: {
                  clientRequestPath_like: "/${prefix}%",
                  datetime_geq: "${startIso}",
                  datetime_leq: "${endIso}"
                }
              ) { sum { edgeResponseBytes } }`
        ).join('\n');

        const query = `query {
              viewer {
                zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                  ${subQueries}
                }
              }
            }`;

        try {
            const g = await cfApi.graphql(query);
            if (!g.ok || !g.data?.viewer?.zones?.[0]) return;
            const zoneData = g.data.viewer.zones[0];
            for (const { alias, prefix } of chunkEntries) {
                const sumObj = zoneData[alias]?.[0]?.sum;
                const bytes = (sumObj && sumObj.edgeResponseBytes) || 0;
                result.bytesByPrefix.set(prefix, bytes);
                result.anySuccess = true;
            }
        } catch (e) {
            // Partial failure: skip this chunk and preserve successful chunks.
        }
    }));

    return result;
}

export async function queryAggregateTrafficBytes(env, type, options = {}) {
    if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) return { ok: false, reason: 'missing-env', message: '缺少变量' };
    try {
        const cfApi = options.cfApi || createCfApi(env);
        const nowMs = options.nowMs || Date.now();
        const end = new Date(nowMs);
        let query;

        if (type === 'today') {
            const { startIso, endIso } = beijingDayWindow(nowMs);
            query = `
                query {
                  viewer {
                    zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                      httpRequestsAdaptiveGroups(
                        limit: 1,
                        filter: {
                          datetime_geq: "${startIso}",
                          datetime_leq: "${endIso}"
                        }
                      ) {
                        sum {
                          edgeResponseBytes
                        }
                      }
                    }
                  }
                }`;
        } else {
            const start = new Date(end.getTime() - type * 24 * 3600000);
            const dateGeq = start.toISOString().split('T')[0];
            const dateLeq = end.toISOString().split('T')[0];
            query = `
                query {
                  viewer {
                    zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                      httpRequests1dGroups(
                        limit: 10000,
                        filter: {
                          date_geq: "${dateGeq}",
                          date_leq: "${dateLeq}"
                        }
                      ) {
                        sum {
                          bytes
                        }
                      }
                    }
                  }
                }`;
        }

        const gqlRes = await cfApi.graphql(query);
        if (!gqlRes.ok) {
            return { ok: false, reason: 'api-error', message: `API报错: ${(gqlRes.errors && gqlRes.errors[0]?.message) || gqlRes.error || '未知错误'}` };
        }

        const zones = gqlRes.data?.viewer?.zones;
        let totalBytes = 0;
        if (zones && zones.length > 0) {
            if (type === 'today' && zones[0].httpRequestsAdaptiveGroups) {
                totalBytes = zones[0].httpRequestsAdaptiveGroups[0]?.sum?.edgeResponseBytes || 0;
            } else if (type !== 'today' && zones[0].httpRequests1dGroups) {
                zones[0].httpRequests1dGroups.forEach(g => { totalBytes += (g.sum.bytes || 0); });
            }
        }
        return { ok: true, bytes: totalBytes };
    } catch (e) {
        return { ok: false, reason: 'exception', message: '请求异常' };
    }
}

export async function getFormattedCFTraffic(env, type) {
    const result = await queryAggregateTrafficBytes(env, type);
    if (!result.ok) return result.message;
    return formatBytes(result.bytes);
}

export function selectTopTrafficRoute(routes, bytesByPrefix) {
    let maxBytes = 0;
    let topRoute = null;
    for (const route of (routes || [])) {
        const bytes = bytesByPrefix.get(route.prefix) || 0;
        if (bytes > maxBytes) {
            maxBytes = bytes;
            topRoute = route;
        }
    }
    return { route: topRoute, bytes: maxBytes };
}

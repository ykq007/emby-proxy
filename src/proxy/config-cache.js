// 热路径配置缓存（per-isolate，60s TTL）。
// 目的：把「路由查找 + 国家白名单 + 防盗链白名单 + 手动重定向白名单 + schema 版本」
// 这 4~5 次串行 D1 读合并为「命中缓存时零 D1 读、未命中时一次 batch（一次往返）」。
// 与 db/schema.js 的 _schemaReady 一样，是模块级单例（每个 isolate 各自一份，天然隔离）。
import { MANUAL_REDIRECT_DOMAINS_KEY, parseManualRedirectDomains } from '../routing/manual-redirect-allowlist.js';
// HOT_PATH_SELECT 的列集由 routing/route.js 统一拥有（唯一 owner）；这里只引用，
// 不再手写列表 —— 与 routing/route.js 的写路径失效判定（touchesHotPathColumn）
// 保证读到的列和判定失效的列永远是同一份定义。
import { HOT_PATH_SELECT } from '../routing/route.js';
import { dbStmt, dbBatch } from '../db/helpers.js';
// kv_config 的 key 与国家/防盗链白名单的 parse/serialize 都由 db/kv.js 统一拥有
// （唯一 owner）；这里直接复用同一份 codec，读写路径不可能再产生分叉。
import {
    SCHEMA_VERSION_KEY,
    COUNTRY_ALLOWLIST_KEY,
    HOTLINK_ALLOW_HOSTS_KEY,
    countryAllowlistCodec,
    hotlinkHostsCodec,
} from '../db/kv.js';

const TTL_MS = 60000;

// _cache.data === null 表示「未加载 / 已失效，下次 getConfig 必须重新走一次 batch」。
let _cache = { data: null, loadedAt: 0 };

function emptyConfig(extra = {}) {
    return {
        routesMap: new Map(),
        countrySet: null,
        hotlinkSet: null,
        manualRedirectSet: new Set(),
        schemaVersion: null,
        ok: true,
        ...extra,
    };
}

/**
 * 获取当前配置快照。
 * - 缓存命中（<60s）：零 D1 调用，直接返回内存数据。
 * - 缓存未命中：发起一次 env.DB.batch（一次往返）加载路由表全量 + kv_config 多键。
 * - 加载失败：返回 ok:false 的哨兵对象（网关按失败即放行处理，路由按错误处理），
 *   且【不缓存】失败结果——_cache 保持原状（null 或已过期），下次请求重试。
 */
export async function getConfig(env) {
    const now = Date.now();
    if (_cache.data && (now - _cache.loadedAt) < TTL_MS) {
        return { config: _cache.data, cacheHit: true, loadMs: 0 };
    }

    if (!env || !env.DB) {
        // 未绑定 DB：网关全部按「未配置」放行（fail-open），路由视为不可解析。
        return { config: emptyConfig({ ok: false }), cacheHit: false, loadMs: 0 };
    }

    const t0 = Date.now();
    try {
        const stmts = [
            dbStmt(env, `SELECT ${HOT_PATH_SELECT} FROM routes`),
            dbStmt(env, `SELECT k, v FROM kv_config WHERE k IN (?, ?, ?, ?)`,
                COUNTRY_ALLOWLIST_KEY, HOTLINK_ALLOW_HOSTS_KEY, MANUAL_REDIRECT_DOMAINS_KEY, SCHEMA_VERSION_KEY),
        ];
        const [routesResult, kvResult] = await dbBatch(env, stmts);

        const routesMap = new Map();
        for (const r of (routesResult?.results || [])) {
            if (r && r.prefix) routesMap.set(r.prefix, r);
        }

        const kvByKey = new Map();
        for (const row of (kvResult?.results || [])) {
            if (row && row.k !== undefined) kvByKey.set(row.k, row.v);
        }

        const config = {
            routesMap,
            countrySet: countryAllowlistCodec.parse(kvByKey.get(COUNTRY_ALLOWLIST_KEY)),
            hotlinkSet: hotlinkHostsCodec.parse(kvByKey.get(HOTLINK_ALLOW_HOSTS_KEY)),
            manualRedirectSet: new Set(parseManualRedirectDomains(kvByKey.get(MANUAL_REDIRECT_DOMAINS_KEY) || '')),
            schemaVersion: kvByKey.has(SCHEMA_VERSION_KEY) ? kvByKey.get(SCHEMA_VERSION_KEY) : null,
            ok: true,
        };

        const loadedAt = Date.now();
        _cache = { data: config, loadedAt };
        return { config, cacheHit: false, loadMs: loadedAt - t0 };
    } catch (e) {
        // 加载失败：不写入 _cache（保持 null/过期状态），下次请求会重新尝试。
        return { config: emptyConfig({ ok: false, error: e }), cacheHit: false, loadMs: Date.now() - t0 };
    }
}

// 管理端写操作（路由增删改、国家/防盗链/手动重定向白名单变更）后调用：
// 让本 isolate 上「下一次」getConfig 强制重新加载，实现编辑立即生效（同 isolate），
// 其余 isolate 最多 60s 内通过自然过期收敛。
export function invalidateConfigCache() {
    _cache.data = null;
}

// 仅供测试：整体重置（含 loadedAt），避免用例间状态串扰。
export function __resetConfigCache() {
    _cache = { data: null, loadedAt: 0 };
}

// 仅供测试：直接注入一份「已加载」的配置，绕开 D1，让下游代码零 DB 依赖可测。
export function __setConfigForTest(overrides = {}) {
    _cache = { data: emptyConfig(overrides), loadedAt: Date.now() };
}

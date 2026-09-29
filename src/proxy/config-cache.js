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
// 加载失败时继续用旧快照，并在这么久之后再试（不让每个请求都去撞一次 DB 超时）。
const FAIL_RETRY_MS = 10000;
// 最近一次成功加载的配置另存一份到 Cache API（本机房），供新 isolate 在 DB 不可达时兜底。
// 只在内容变化或距上次写入超过该间隔时才写。*.workers.dev 上 Cache API 为 no-op，此兜底仅在自定义域名生效。
const SNAPSHOT_URL = 'https://emby-proxy.internal/__config_snapshot__';
const SNAPSHOT_REFRESH_MS = 5 * 60000;

// _cache.data === null 表示「未加载 / 已失效，下次 getConfig 必须重新走一次 batch」。
let _cache = { data: null, loadedAt: 0 };
// 最近一次成功加载的配置（不随 invalidateConfigCache 清空）：DB 故障时的内存兜底。
let _lastGood = null;
let _snapshot = { body: '', savedAt: 0 };

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

// 由原始行构建配置：DB 加载与快照恢复共用同一条解析路径。
function buildConfig(routeRows, kvByKey) {
    const routesMap = new Map();
    for (const r of (routeRows || [])) {
        if (r && r.prefix) routesMap.set(r.prefix, r);
    }
    return {
        routesMap,
        countrySet: countryAllowlistCodec.parse(kvByKey.get(COUNTRY_ALLOWLIST_KEY)),
        hotlinkSet: hotlinkHostsCodec.parse(kvByKey.get(HOTLINK_ALLOW_HOSTS_KEY)),
        manualRedirectSet: new Set(parseManualRedirectDomains(kvByKey.get(MANUAL_REDIRECT_DOMAINS_KEY) || '')),
        schemaVersion: kvByKey.has(SCHEMA_VERSION_KEY) ? kvByKey.get(SCHEMA_VERSION_KEY) : null,
        ok: true,
    };
}

function snapshotCache() {
    try { return (typeof caches !== 'undefined' && caches.default) || null; } catch (e) { return null; }
}

async function saveSnapshot(routeRows, kvByKey, now) {
    const cache = snapshotCache();
    if (!cache) return;
    const body = JSON.stringify({ routes: routeRows, kv: [...kvByKey] });
    if (body === _snapshot.body && now - _snapshot.savedAt < SNAPSHOT_REFRESH_MS) return;
    try {
        await cache.put(SNAPSHOT_URL, new Response(body, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=2592000' },
        }));
        _snapshot = { body, savedAt: now };
    } catch (e) { /* 快照只是兜底，写失败不影响本次请求 */ }
}

async function loadSnapshot() {
    const cache = snapshotCache();
    if (!cache) return null;
    try {
        const res = await cache.match(SNAPSHOT_URL);
        if (!res) return null;
        const { routes, kv } = await res.json();
        return buildConfig(routes, new Map(kv));
    } catch (e) { return null; }
}

/**
 * 获取当前配置快照。
 * - 缓存命中（<60s）：零 D1 调用，直接返回内存数据。
 * - 缓存未命中：发起一次 env.DB.batch（一次往返）加载路由表全量 + kv_config 多键。
 * - 加载失败：按「内存里的上一份好配置 → Cache API 快照」顺序兜底，返回 stale:true，
 *   并在 FAIL_RETRY_MS 后再试；两者都没有时返回 ok:false 的哨兵对象（网关按失败即放行
 *   处理，路由按错误处理），且【不缓存】失败结果——下次请求重试。
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

        const routeRows = (routesResult?.results || []).filter(r => r && r.prefix);
        const kvByKey = new Map();
        for (const row of (kvResult?.results || [])) {
            if (row && row.k !== undefined) kvByKey.set(row.k, row.v);
        }
        const config = buildConfig(routeRows, kvByKey);

        const loadedAt = Date.now();
        _cache = { data: config, loadedAt };
        _lastGood = config;
        await saveSnapshot(routeRows, kvByKey, loadedAt);
        return { config, cacheHit: false, loadMs: loadedAt - t0 };
    } catch (e) {
        const fallback = _lastGood || await loadSnapshot();
        if (fallback) {
            _lastGood = fallback;
            _cache = { data: fallback, loadedAt: Date.now() - TTL_MS + FAIL_RETRY_MS };
            return { config: fallback, cacheHit: false, stale: true, loadMs: Date.now() - t0 };
        }
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
    _lastGood = null;
    _snapshot = { body: '', savedAt: 0 };
}

// 仅供测试：直接注入一份「已加载」的配置，绕开 D1，让下游代码零 DB 依赖可测。
export function __setConfigForTest(overrides = {}) {
    _cache = { data: emptyConfig(overrides), loadedAt: Date.now() };
}

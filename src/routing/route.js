// 节点（routes 表）的唯一所有者模块。
//
// 之前散落在各处的三件事在这里合并为一个"深"模块：
//   1. 列集常量 —— 每一处针对 routes 的 SELECT/INSERT/UPDATE 用到的列表，
//      不再由各 caller 手写（曾经 9 处，稍有出入就会漏字段）。
//   2. routeName() —— "public_alias ∥ remark ∥ prefix" 的展示名规则，
//      曾经在 status/page.js、tg/views.js、tg/notifications.js、probes/alerts.js
//      四处各实现一遍。
//   3. 写路径 —— 所有对 routes 的写操作都通过这里，由模块内部依据
//      "本次写是否触达了 config-cache 缓存的热路径列" 决定是否需要
//      invalidateConfigCache()，调用方不再各自决定（也不会再有遗漏）。
//
// 热路径列的定义 = proxy/config-cache.js 的 getConfig() 实际 SELECT 的那几列
// （HOT_PATH_COLUMNS，同时也是 HOT_PATH_SELECT 的来源，config-cache.js 直接
// 引用后者，两边永远一致）。写一个不在这个集合里的列（如 sort_order、
// keepalive_last_played_at、emby_auth_cache…）不会、也不应该让下一次代理请求
// 多付一次 D1 读的代价。
import { dbRun, dbStmt, dbBatch } from '../db/helpers.js';
import { invalidateConfigCache } from '../proxy/config-cache.js';

// ---------------------------------------------------------------------------
// 列集常量
// ---------------------------------------------------------------------------

// proxy/config-cache.js getConfig() 缓存的列 —— 唯一影响代理转发行为的字段。
export const HOT_PATH_COLUMNS = Object.freeze([
    'prefix', 'target', 'mode', 'cache_img', 'custom_headers', 'media_counts_auto_auth', 'keepalive_days',
]);
export const HOT_PATH_SELECT = HOT_PATH_COLUMNS.join(', ');

// 展示名三件套：routeName() 的输入列。
export const DISPLAY_NAME_COLUMNS = Object.freeze(['prefix', 'public_alias', 'remark']);

// status/page.js loadStatusData：驱动 nodeHealth 卡片的路由切片。
export const STATUS_CARD_COLUMNS = Object.freeze(['prefix', 'public_alias', 'remark', 'icon', 'sort_order', 'media_counts_auto_auth']);
export const STATUS_CARD_SELECT = STATUS_CARD_COLUMNS.join(', ');

// probes/probe.js probeAll：每轮探测需要的节点字段。
export const PROBE_COLUMNS = Object.freeze(['prefix', 'target', 'remark', 'public_alias', 'custom_headers', 'show_on_status', 'media_counts_auto_auth', 'emby_auth_cache']);
export const PROBE_SELECT = PROBE_COLUMNS.join(', ');

// probes/keepalive.js maybeRemindKeepalive + tg/views.js renderKeepalive：保号提醒需要的字段。
export const KEEPALIVE_COLUMNS = Object.freeze(['prefix', 'remark', 'public_alias', 'keepalive_days', 'keepalive_last_played_at', 'keepalive_last_reminded_at']);
export const KEEPALIVE_SELECT = KEEPALIVE_COLUMNS.join(', ');

// tg/views.js renderNode：单节点详情视图。
export const NODE_DETAIL_COLUMNS = Object.freeze(['prefix', 'remark', 'public_alias', 'last_play', 'keepalive_days', 'keepalive_last_played_at', 'mode']);
export const NODE_DETAIL_SELECT = NODE_DETAIL_COLUMNS.join(', ');

// 仅节点身份 + 展示名，无其余业务字段：tg/views.js renderList、renderNode 的模糊匹配兜底、renderStatus。
export const NODE_IDENTITY_COLUMNS = Object.freeze(['prefix', 'remark', 'public_alias']);
export const NODE_IDENTITY_SELECT = NODE_IDENTITY_COLUMNS.join(', ');

// 给 JOIN 查询用：把列集展开成 "alias.col AS col" 形式（tg/views.js renderStatus 这类
// routes 与其他表联查、需要显式限定列归属的场景）。
export function qualifySelect(alias, columns) {
    return columns.map(c => `${alias}.${c} AS ${c}`).join(', ');
}

// emby/counts.js refreshLiveCounts + scheduled.js 每日任务 + api/system.js `_counts_now`：
// 媒体计数刷新一轮所需的节点字段（登录鉴权 + 目标地址）。
export const MEDIA_COUNTS_REFRESH_COLUMNS = Object.freeze(['prefix', 'target', 'custom_headers', 'emby_auth_cache', 'emby_username', 'emby_password_enc']);
export const MEDIA_COUNTS_REFRESH_SELECT = MEDIA_COUNTS_REFRESH_COLUMNS.join(', ');

// 仅需要判断节点是否存在 / 遍历全部 prefix 时的最小 SELECT。
export const PREFIX_SELECT = 'prefix';
export const PREFIX_REMARK_SELECT = 'prefix, remark';

// api/status.js `/api/status/route-creds`：读取该节点当前的独立凭据状态，用于判断本次提交是否改变了凭据。
export const ROUTE_CREDS_COLUMNS = Object.freeze(['emby_username', 'emby_password_enc', 'emby_auth_cache']);
export const ROUTE_CREDS_SELECT = ROUTE_CREDS_COLUMNS.join(', ');

// api/routes.js POST：改名/编辑时从旧行吸收的字段（不随表单提交而丢失）。
export const PREV_ROW_COLUMNS = Object.freeze([
    'sort_order', 'show_on_status', 'public_alias', 'media_counts_auto_auth', 'monitor_enabled',
    'last_play', 'emby_auth_cache', 'emby_auth_seen_at', 'emby_auth_used_at',
    'keepalive_last_played_at', 'keepalive_last_reminded_at', 'emby_username', 'emby_password_enc',
]);
export const PREV_ROW_SELECT = PREV_ROW_COLUMNS.join(', ');

// api/routes.js `/api/routes/import`：批量导入的整行写入列（历史格式，无鉴权/监控字段）。
export const IMPORT_COLUMNS = Object.freeze([
    'prefix', 'target', 'mode', 'remark', 'group_name', 'last_play', 'icon', 'cache_img', 'sort_order',
    'custom_headers', 'backend_url', 'show_on_status', 'public_alias', 'media_counts_auto_auth',
    'keepalive_days', 'keepalive_last_played_at', 'keepalive_last_reminded_at',
]);

// api/routes.js POST `/api/routes`：仪表盘新增/编辑节点的整行写入列。
export const UPSERT_COLUMNS = Object.freeze([
    'prefix', 'target', 'mode', 'remark', 'group_name', 'icon', 'cache_img', 'sort_order',
    'custom_headers', 'backend_url', 'show_on_status', 'public_alias', 'media_counts_auto_auth',
    'monitor_enabled', 'last_play', 'emby_auth_cache', 'emby_auth_seen_at', 'emby_auth_used_at',
    'keepalive_days', 'keepalive_last_played_at', 'keepalive_last_reminded_at', 'emby_username', 'emby_password_enc',
]);

// ---------------------------------------------------------------------------
// 展示名
// ---------------------------------------------------------------------------

// 唯一实现：public_alias 优先，其次 remark，最后回退 prefix。
export function routeName(route) {
    if (!route) return '';
    return route.public_alias || route.remark || route.prefix || '';
}

// ---------------------------------------------------------------------------
// 缓存失效判定 —— 纯函数，便于直接单元测试
// ---------------------------------------------------------------------------

// 本次写触达的列（数组）里，是否至少有一个属于 HOT_PATH_COLUMNS。
export function touchesHotPathColumn(changedColumns) {
    if (!changedColumns || !changedColumns.length) return false;
    return changedColumns.some(c => HOT_PATH_COLUMNS.includes(c));
}

// 内部：按判定结果决定是否让下一次 getConfig() 强制重新加载。
function invalidateIfNeeded(changedColumns) {
    if (touchesHotPathColumn(changedColumns)) invalidateConfigCache();
}

// ---------------------------------------------------------------------------
// 写路径 —— 所有对 routes 的写都应通过这里，调用方不再自行决定是否失效缓存
// ---------------------------------------------------------------------------

// 通用局部字段更新：`fields` 是 {列名: 值} 的普通对象。
// 写完后按 fields 的列名自动判定是否需要让 config-cache 失效。
export async function updateRouteColumns(env, prefix, fields) {
    const columns = Object.keys(fields || {});
    if (!columns.length) return;
    const setClause = columns.map(c => `${c} = ?`).join(', ');
    const values = columns.map(c => fields[c]);
    await dbRun(env, `UPDATE routes SET ${setClause} WHERE prefix = ?`, ...values, prefix);
    invalidateIfNeeded(columns);
}

// 批量重排（拖拽排序）：sort_order 不是热路径列，只影响仪表盘展示顺序，不影响代理转发。
export async function reorderRoutes(env, items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return;
    const stmts = list.map(item => dbStmt(env, 'UPDATE routes SET sort_order = ? WHERE prefix = ?', item.sort_order, item.prefix));
    await dbBatch(env, stmts);
    invalidateIfNeeded(['sort_order']);
}

// 整行 upsert（仪表盘新增/编辑）：row 需按 UPSERT_COLUMNS 提供全部字段。
// 始终触达 target/mode/cache_img/custom_headers 等热路径列 → 必定失效缓存。
export async function upsertRoute(env, row) {
    const values = UPSERT_COLUMNS.map(c => row[c]);
    const placeholders = UPSERT_COLUMNS.map(() => '?').join(', ');
    await dbRun(env, `INSERT OR REPLACE INTO routes (${UPSERT_COLUMNS.join(', ')}) VALUES (${placeholders})`, ...values);
    invalidateIfNeeded(UPSERT_COLUMNS);
}

// 整行导入（`/api/routes/import`）：row 需按 IMPORT_COLUMNS 提供全部字段。
export async function importRoute(env, row) {
    const values = IMPORT_COLUMNS.map(c => row[c]);
    const placeholders = IMPORT_COLUMNS.map(() => '?').join(', ');
    await dbRun(env, `INSERT OR REPLACE INTO routes (${IMPORT_COLUMNS.join(', ')}) VALUES (${placeholders})`, ...values);
    invalidateIfNeeded(IMPORT_COLUMNS);
}

// 删除节点：整行连同 prefix 一起消失，视作必定触达热路径（路由表存在性本身就是热路径）。
export async function deleteRoute(env, prefix) {
    await dbRun(env, 'DELETE FROM routes WHERE prefix = ?', prefix);
    invalidateConfigCache();
}

// ---- 以下为语义化的窄写封装，给高频/专用调用点用，内部仍走 updateRouteColumns 的判定规则 ----

// 保号：记录一次播放信号（同时清零"已提醒"标记）。proxy/engine.js 热路径 waitUntil 调用，
// 两个字段都不是热路径列，不触发缓存失效。
export async function touchKeepalivePlayed(env, prefix, nowSec) {
    return updateRouteColumns(env, prefix, { keepalive_last_played_at: nowSec, keepalive_last_reminded_at: 0 });
}

// 记录"最后活跃"时间（UI 展示用）。同样是 proxy/engine.js 热路径 waitUntil 调用。
export async function touchLastPlay(env, prefix, nowTime) {
    return updateRouteColumns(env, prefix, { last_play: nowTime });
}

// 保号提醒：首次开启但从未播放过时，为 baseline 打桩。
export async function seedKeepaliveBaseline(env, prefix, nowSec) {
    return updateRouteColumns(env, prefix, { keepalive_last_played_at: nowSec });
}

// 保号提醒：批量记录"已提醒"时间戳（仅对发送成功的节点）。
export async function markKeepaliveReminded(env, prefixes, nowSec) {
    const list = Array.isArray(prefixes) ? prefixes : [];
    if (!list.length) return;
    const updates = list.map(prefix => dbStmt(env, 'UPDATE routes SET keepalive_last_reminded_at = ? WHERE prefix = ?', nowSec, prefix));
    await dbBatch(env, updates);
    invalidateIfNeeded(['keepalive_last_reminded_at']);
}

// 缓存一个新登录到的 Emby AccessToken（emby/auth.js getEmbyToken、emby/tokens.js persistHarvestedToken 共用）。
export async function cacheEmbyAuthToken(env, prefix, encryptedBlob, nowSec) {
    return updateRouteColumns(env, prefix, { emby_auth_cache: encryptedBlob, emby_auth_seen_at: nowSec });
}

// 作废某节点已缓存的 AccessToken（凭据失效 / 凭据变更 / 管理端手动 revoke 时调用）。
export async function clearEmbyAuthCache(env, prefix, opts) {
    const fields = { emby_auth_cache: '', emby_auth_seen_at: 0 };
    if (opts && opts.clearUsedAt) fields.emby_auth_used_at = 0;
    return updateRouteColumns(env, prefix, fields);
}

// probes/alerts.js maybeRollupHourly：批量回收闲置 AccessToken 缓存的 bulk WHERE 语句，
// 与该批次内其余语句一起提交给同一个 env.DB.batch。作用范围是"按条件筛出的多行"而非单个
// prefix，因此不走 updateRouteColumns；触达的列同样都不是热路径列，天生无需失效判定。
export function idleAuthCacheCleanupStmt(env, nowSec, idleThresholdSec) {
    return dbStmt(env, `UPDATE routes SET emby_auth_cache='', emby_auth_seen_at=0, emby_auth_used_at=0
                            WHERE emby_auth_cache != ''
                              AND emby_auth_seen_at > 0 AND (? - emby_auth_seen_at) > ?
                              AND (emby_auth_used_at = 0 OR (? - emby_auth_used_at) > ?)`,
        nowSec, idleThresholdSec, nowSec, idleThresholdSec);
}

// 记录一次媒体计数刷新成功使用了该节点的登录态（emby/counts.js buildCountWrites 里第三条语句）。
// 需要和另外两条 emby_media_counts / emby_media_counts_live 写入同批 env.DB.batch 提交，
// 因此返回未执行的 Statement，而不是直接 await；不是热路径列，无需失效判定。
export function touchEmbyAuthUsedStmt(env, prefix, nowSec) {
    return dbStmt(env, 'UPDATE routes SET emby_auth_used_at = ? WHERE prefix = ?', nowSec, prefix);
}

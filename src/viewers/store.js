// Viewer 存储：账号、密码哈希、令牌、访问授权（viewer_access）。
// Viewer 令牌形如 ev_<32hex>；D1 只存其 SHA-256。
import { dbRun, dbFirst, dbAll, dbStmt, dbBatch } from '../db/helpers.js';

export const TOKEN_PREFIX = 'ev_';
const PBKDF2_ITER = 100000; // Workers WebCrypto 上限
const RESOLVE_TTL_MS = 60000;
const RESOLVE_MEM = new Map(); // `${prefix}\n${token}` -> { at, session }

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array((s.match(/../g) || []).map(h => parseInt(h, 16)));
export const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function pbkdf2(password, salt) {
    const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256));
}

export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return hex(salt) + ':' + await pbkdf2(password, salt);
}

export async function verifyPassword(password, stored) {
    const [salt, want] = String(stored || '').split(':');
    if (!salt || !want) return false;
    const got = await pbkdf2(password, unhex(salt));
    // 等长常量时间比较
    let diff = got.length ^ want.length;
    for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ (want.charCodeAt(i) || 0);
    return diff === 0;
}

export async function sha256Hex(s) {
    return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

// 登录用：viewer + 其在该节点的授权。无授权返回 null（→ 交给上游登录）。
export function findViewerForLogin(env, prefix, username) {
    return dbFirst(env,
        `SELECT v.id, v.username, v.password, v.enabled, a.quota, a.hidden_libraries
           FROM viewers v JOIN viewer_access a ON a.viewer_id = v.id AND a.prefix = ?
          WHERE v.username = ? COLLATE NOCASE`,
        prefix, String(username || ''));
}

export async function issueToken(env, viewerId, prefix, deviceId) {
    const token = TOKEN_PREFIX + randomHex(16);
    await dbRun(env, `INSERT INTO viewer_tokens (token_hash, viewer_id, prefix, device_id, created_at) VALUES (?, ?, ?, ?, ?)`,
        await sha256Hex(token), viewerId, prefix, String(deviceId || ''), Date.now());
    return token;
}

export async function revokeToken(env, token) {
    RESOLVE_MEM.clear();
    await dbRun(env, `DELETE FROM viewer_tokens WHERE token_hash = ?`, await sha256Hex(token));
}

export function revokeViewerTokensStmt(env, viewerId) {
    return dbStmt(env, `DELETE FROM viewer_tokens WHERE viewer_id = ?`, viewerId);
}

// 令牌 → 会话。每次都核对 enabled + 仍有该节点授权（60s isolate 缓存），
// 因此停用/撤销授权最迟 60s 生效，不依赖令牌签发时的快照。
export async function resolveViewer(env, prefix, token, now = Date.now()) {
    const k = prefix + '\n' + token;
    const hit = RESOLVE_MEM.get(k);
    if (hit && now - hit.at < RESOLVE_TTL_MS) return hit.session;
    const row = await dbFirst(env,
        `SELECT t.viewer_id, v.username, a.quota, a.hidden_libraries
           FROM viewer_tokens t
           JOIN viewers v ON v.id = t.viewer_id AND v.enabled = 1
           JOIN viewer_access a ON a.viewer_id = t.viewer_id AND a.prefix = t.prefix
          WHERE t.token_hash = ? AND t.prefix = ?`,
        await sha256Hex(token), prefix);
    const session = row ? toSession(row, prefix, token) : null;
    if (session) RESOLVE_MEM.set(k, { at: now, session });
    return session;
}

export function toSession(row, prefix, token) {
    let hidden = [];
    try { hidden = JSON.parse(row.hidden_libraries || '[]'); } catch (e) { }
    return {
        viewerId: row.viewer_id || row.id,
        username: row.username,
        prefix,
        token,
        quota: Number(row.quota) || 0,
        hidden: new Set((Array.isArray(hidden) ? hidden : []).map(String)),
    };
}

export function clearResolveCache() { RESOLVE_MEM.clear(); }

// ---------------------------------------------------------------------------
// 管理端
// ---------------------------------------------------------------------------

export async function listViewers(env) {
    const [viewers, access] = await Promise.all([
        dbAll(env, `SELECT id, username, enabled, created_at FROM viewers ORDER BY username`),
        dbAll(env, `SELECT viewer_id, prefix, quota, hidden_libraries FROM viewer_access ORDER BY prefix`),
    ]);
    const byViewer = new Map();
    for (const a of access.results || []) {
        let hidden = [];
        try { hidden = JSON.parse(a.hidden_libraries || '[]'); } catch (e) { }
        if (!byViewer.has(a.viewer_id)) byViewer.set(a.viewer_id, []);
        byViewer.get(a.viewer_id).push({ prefix: a.prefix, quota: a.quota, hidden_libraries: hidden });
    }
    return (viewers.results || []).map(v => ({ ...v, enabled: !!v.enabled, access: byViewer.get(v.id) || [] }));
}

export async function createViewer(env, username, password) {
    const id = randomHex(16);
    await dbRun(env, `INSERT INTO viewers (id, username, password, enabled, created_at) VALUES (?, ?, ?, 1, ?)`,
        id, username, await hashPassword(password), Date.now());
    return id;
}

// patch: { username?, password?, enabled? }。改密码或停用 → 吊销全部令牌。
export async function updateViewer(env, id, patch) {
    const stmts = [];
    if (patch.username !== undefined) stmts.push(dbStmt(env, `UPDATE viewers SET username = ? WHERE id = ?`, patch.username, id));
    if (patch.password) stmts.push(dbStmt(env, `UPDATE viewers SET password = ? WHERE id = ?`, await hashPassword(patch.password), id));
    if (patch.enabled !== undefined) stmts.push(dbStmt(env, `UPDATE viewers SET enabled = ? WHERE id = ?`, patch.enabled ? 1 : 0, id));
    if (patch.password || patch.enabled === false) stmts.push(revokeViewerTokensStmt(env, id));
    if (stmts.length) await dbBatch(env, stmts);
    RESOLVE_MEM.clear();
}

export async function deleteViewer(env, id) {
    await dbBatch(env, [
        dbStmt(env, `DELETE FROM viewers WHERE id = ?`, id),
        dbStmt(env, `DELETE FROM viewer_access WHERE viewer_id = ?`, id),
        revokeViewerTokensStmt(env, id),
        dbStmt(env, `DELETE FROM watch_state WHERE viewer_id = ?`, id),
        dbStmt(env, `DELETE FROM playback_slots WHERE viewer_id = ?`, id),
    ]);
    RESOLVE_MEM.clear();
}

// 节点并发上限 + 已授权配额总和（不含 exceptViewer），供授权/改上限时校验。
export async function nodeCapacity(env, prefix, exceptViewer = '') {
    const row = await dbFirst(env,
        `SELECT (SELECT max_concurrent FROM routes WHERE prefix = ?) AS cap,
                (SELECT viewers_enabled FROM routes WHERE prefix = ?) AS enabled,
                (SELECT COALESCE(SUM(quota), 0) FROM viewer_access WHERE prefix = ? AND viewer_id != ?) AS used`,
        prefix, prefix, prefix, exceptViewer);
    return { exists: row && row.cap !== null && row.cap !== undefined, enabled: !!Number(row?.enabled), cap: Number(row?.cap) || 0, used: Number(row?.used) || 0 };
}

export async function grantAccess(env, viewerId, prefix, quota, hiddenLibraries) {
    await dbRun(env,
        `INSERT INTO viewer_access (viewer_id, prefix, quota, hidden_libraries) VALUES (?, ?, ?, ?)
         ON CONFLICT(viewer_id, prefix) DO UPDATE SET quota = excluded.quota, hidden_libraries = excluded.hidden_libraries`,
        viewerId, prefix, quota, JSON.stringify(hiddenLibraries || []));
    RESOLVE_MEM.clear();
}

export async function revokeAccess(env, viewerId, prefix) {
    await dbBatch(env, [
        dbStmt(env, `DELETE FROM viewer_access WHERE viewer_id = ? AND prefix = ?`, viewerId, prefix),
        dbStmt(env, `DELETE FROM viewer_tokens WHERE viewer_id = ? AND prefix = ?`, viewerId, prefix),
        dbStmt(env, `DELETE FROM playback_slots WHERE viewer_id = ? AND prefix = ?`, viewerId, prefix),
    ]);
    RESOLVE_MEM.clear();
}

// viewer 在 Emby 客户端里自助改密码：只吊销其他令牌，保留当前登录。
export async function changeOwnPassword(env, s, currentPw, newPw) {
    const row = await dbFirst(env, `SELECT password FROM viewers WHERE id = ?`, s.viewerId);
    if (!row || !newPw || !(await verifyPassword(currentPw || '', row.password))) return false;
    await dbBatch(env, [
        dbStmt(env, `UPDATE viewers SET password = ? WHERE id = ?`, await hashPassword(newPw), s.viewerId),
        dbStmt(env, `DELETE FROM viewer_tokens WHERE viewer_id = ? AND token_hash != ?`, s.viewerId, await sha256Hex(s.token)),
    ]);
    RESOLVE_MEM.clear();
    return true;
}

// 节点被删除时清掉它名下的 viewer 数据。
export async function forgetNode(env, prefix) {
    await dbBatch(env, ['viewer_access', 'viewer_tokens', 'playback_slots', 'watch_state', 'viewer_upstream']
        .map(t => dbStmt(env, `DELETE FROM ${t} WHERE prefix = ?`, prefix)));
    RESOLVE_MEM.clear();
}

// 节点改前缀：viewer 数据跟着走。上游会话密文以前缀为盐，直接丢弃，下次重新登录。
export async function renameNode(env, from, to) {
    await dbBatch(env, [
        ...['viewer_access', 'viewer_tokens', 'playback_slots', 'watch_state']
            .map(t => dbStmt(env, `UPDATE ${t} SET prefix = ? WHERE prefix = ?`, to, from)),
        dbStmt(env, `DELETE FROM viewer_upstream WHERE prefix = ?`, from),
    ]);
    RESOLVE_MEM.clear();
}

// 并发播放限制：节点上限 routes.max_concurrent + 每个 viewer 在该节点的配额 viewer_access.quota。
// 槽位 = (viewer, 节点, 设备)，PlaybackInfo 与取流（holdSlot）占用，Sessions/Playing* 续心跳，Stopped 释放，
// 3 分钟无心跳自动回收。0 表示不限。
// 有的客户端（如 CapyPlayer）打开详情页就调 PlaybackInfo 却不播放：只占位、没收到 Sessions/Playing 的槽位
// 按 PENDING_TTL_MS 回收，免得它把同一 viewer 的另一台设备挡 3 分钟。
// ponytail: D1 先查后插非原子，两个设备同一瞬间起播可能超 1 个；要严格就换 Durable Object。
import { dbRun, dbFirst } from '../db/helpers.js';

const SLOT_TTL_MS = 3 * 60 * 1000;
export const PENDING_TTL_MS = 60 * 1000;
const HELD = new Map(); // `${viewerId}|${prefix}|${device}` -> 上次在 D1 确认占着槽位的时间
const HOLD_RECHECK_MS = 30000;
const NOT_PLAYBACK = /\/(subtitles|attachments|images|trickplay)\/|\.bif$/i;
export function __resetSlotsForTest() { HELD.clear(); }

// 返回 null = 已占到槽位；返回 Response(429) = 超限。
export async function acquireSlot(env, s, deviceId, itemId, now = Date.now()) {
    await dbRun(env, `DELETE FROM playback_slots WHERE prefix = ? AND heartbeat_at < ?`, s.prefix, now - SLOT_TTL_MS);
    const row = await dbFirst(env,
        `SELECT (SELECT max_concurrent FROM routes WHERE prefix = ?) AS cap,
                COUNT(*) AS total,
                COALESCE(SUM(viewer_id = ?), 0) AS mine,
                COALESCE(SUM(viewer_id = ? AND device_id = ?), 0) AS same
           FROM playback_slots WHERE prefix = ?`,
        s.prefix, s.viewerId, s.viewerId, deviceId, s.prefix);
    if (!Number(row?.same)) {
        const cap = Number(row?.cap) || 0;
        if ((s.quota > 0 && Number(row?.mine) >= s.quota) || (cap > 0 && Number(row?.total) >= cap)) {
            console.log(`slot full: ${s.prefix} total=${row?.total}/${cap} viewer=${row?.mine}/${s.quota}`);
            return Response.json({ message: 'Concurrent playback limit reached' }, { status: 429 });
        }
    }
    await dbRun(env,
        `INSERT INTO playback_slots (viewer_id, prefix, device_id, item_id, heartbeat_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(viewer_id, prefix, device_id) DO UPDATE SET item_id = excluded.item_id, heartbeat_at = MAX(heartbeat_at, excluded.heartbeat_at)`,
        s.viewerId, s.prefix, deviceId, itemId, now - SLOT_TTL_MS + PENDING_TTL_MS);
    return null;
}

export function heartbeatSlot(env, s, deviceId, now = Date.now()) {
    return dbRun(env, `UPDATE playback_slots SET heartbeat_at = ? WHERE viewer_id = ? AND prefix = ? AND device_id = ?`,
        now, s.viewerId, s.prefix, deviceId);
}

// 取流时确认该设备在该节点占着槽位，没有就现占（满了返回 429）。光靠 PlaybackInfo 占位不够：客户端可能
// 打开详情就取 PlaybackInfo、过了一分钟占位被回收才按播放，或直接用另一个节点版本的地址。
// 字幕 / 附件 / 图片 / 缩略图不算播放。
// ponytail: 同一 isolate 30 秒内不重查 D1（HLS 分片很密）；Stopped 只清本 isolate 的记录。
export async function holdSlot(env, s, deviceId, itemId, path, now = Date.now()) {
    if (NOT_PLAYBACK.test(path)) return null;
    const k = `${s.viewerId}|${s.prefix}|${deviceId}`;
    if (now - (HELD.get(k) || 0) < HOLD_RECHECK_MS) return null;
    const blocked = await acquireSlot(env, s, deviceId, itemId, now);
    if (blocked) { HELD.delete(k); return blocked; }
    await heartbeatSlot(env, s, deviceId, now);
    HELD.set(k, now);
    return null;
}

export function releaseSlot(env, s, deviceId) {
    HELD.delete(`${s.viewerId}|${s.prefix}|${deviceId}`);
    return dbRun(env, `DELETE FROM playback_slots WHERE viewer_id = ? AND prefix = ? AND device_id = ?`,
        s.viewerId, s.prefix, deviceId);
}

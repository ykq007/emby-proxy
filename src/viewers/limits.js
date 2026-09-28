// 并发播放限制：节点上限 routes.max_concurrent + 每个 viewer 在该节点的配额 viewer_access.quota。
// 槽位 = (viewer, 节点, 设备)，PlaybackInfo 占用，Sessions/Playing* 续心跳，Stopped 释放，
// 3 分钟无心跳自动回收。0 表示不限。
// ponytail: D1 先查后插非原子，两个设备同一瞬间起播可能超 1 个；要严格就换 Durable Object。
import { dbRun, dbFirst } from '../db/helpers.js';

export const SLOT_TTL_MS = 3 * 60 * 1000;

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
            return Response.json({ message: 'Concurrent playback limit reached' }, { status: 429 });
        }
    }
    await dbRun(env,
        `INSERT INTO playback_slots (viewer_id, prefix, device_id, item_id, heartbeat_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(viewer_id, prefix, device_id) DO UPDATE SET item_id = excluded.item_id, heartbeat_at = excluded.heartbeat_at`,
        s.viewerId, s.prefix, deviceId, itemId, now);
    return null;
}

export function heartbeatSlot(env, s, deviceId, now = Date.now()) {
    return dbRun(env, `UPDATE playback_slots SET heartbeat_at = ? WHERE viewer_id = ? AND prefix = ? AND device_id = ?`,
        now, s.viewerId, s.prefix, deviceId);
}

export function releaseSlot(env, s, deviceId) {
    return dbRun(env, `DELETE FROM playback_slots WHERE viewer_id = ? AND prefix = ? AND device_id = ?`,
        s.viewerId, s.prefix, deviceId);
}

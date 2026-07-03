// 上游熔断 / 健康调度（从 proxy/engine.js 抽离）。
// 按上游 URL 记录最近失败：冷却期内把该上游降级到尝试顺序末尾，避免每个请求
// 都先撞死上游、白白吃满 15s 超时。不硬跳过——单上游节点仍会尝试，永不因熔断
// 把唯一上游打成不可用。纯内存、每 isolate 私有，冷启重置，零 D1 开销。
export const UPSTREAM_CB = new Map(); // url -> { failUntil: ms, consec: int }
const CB_BASE_COOLDOWN_MS = 15000;    // 首次失败冷却（与单上游超时对齐）
const CB_MAX_COOLDOWN_MS = 300000;    // 冷却上限 5 分钟（指数退避）

// 返回“尝试顺序”索引数组：健康上游在前、冷却中的在后，组内保持原配置序。
export function orderUpstreamsByHealth(urls, now) {
    const healthy = []; const cooling = [];
    for (let i = 0; i < urls.length; i++) {
        const rec = UPSTREAM_CB.get(urls[i]);
        if (rec && rec.failUntil > now) cooling.push(i); else healthy.push(i);
    }
    return healthy.concat(cooling);
}

export function markUpstreamFailure(url, now) {
    const rec = UPSTREAM_CB.get(url) || { failUntil: 0, consec: 0 };
    rec.consec += 1;
    const cooldown = Math.min(CB_BASE_COOLDOWN_MS * (2 ** (rec.consec - 1)), CB_MAX_COOLDOWN_MS);
    rec.failUntil = now + cooldown;
    UPSTREAM_CB.set(url, rec);
}

export function markUpstreamSuccess(url) {
    if (UPSTREAM_CB.has(url)) UPSTREAM_CB.delete(url);
}

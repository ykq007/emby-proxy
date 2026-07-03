// R2 海报/图片持久缓存（跨节点共享、不受边缘 cache 驱逐）。
// 不会超免费额度的三重保障：
//   1. bucket 配 30 天对象生命周期（自动删除）→ 存储被钢性封顶，不随时间无限增长。
//   2. 仅缓存 image/* 内容且单对象 ≤ MAX_OBJECT_BYTES → 只存小海报，绝不存大图/媒体流。
//   3. 仅在未命中时写入（Class A），读取靠边缘缓存兜在前面 → R2 操作量极低。
// 绑定缺失（env.POSTER_CACHE 未配置）时全部为 no-op，安全降级。

const MAX_OBJECT_BYTES = 5 * 1024 * 1024; // 单对象上限 5MB

// 缓存键：前缀 + 路径（同一图片在不同节点下各存一份，避免串源）。
export function posterCacheKey(prefix, pathname) {
    return (prefix || '_') + (pathname || '');
}

// 命中则返回 Response，未命中/未配置/异常返回 null。
export async function r2GetImage(env, key) {
    if (!env.POSTER_CACHE) return null;
    try {
        const obj = await env.POSTER_CACHE.get(key);
        if (!obj || !obj.body) return null;
        const headers = new Headers();
        if (typeof obj.writeHttpMetadata === 'function') obj.writeHttpMetadata(headers);
        headers.set('Cache-Control', 'public, max-age=86400');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('X-R2-Cache', 'HIT');
        return new Response(obj.body, { status: 200, headers });
    } catch (e) { return null; }
}

// 异步写入（仅 200 image/* 且 ≤ 上限）。不阻塞响应；任何异常静默跳过。
export function r2PutImage(env, key, response, ctx) {
    if (!env.POSTER_CACHE || !ctx || typeof ctx.waitUntil !== 'function') return;
    if (!response || response.status !== 200) return;
    const ct = response.headers.get('content-type') || '';
    if (!/^image\//i.test(ct)) return;
    const declaredLen = parseInt(response.headers.get('content-length') || '0', 10);
    if (declaredLen > MAX_OBJECT_BYTES) return; // 声明体积已超上限：直接跳过
    let clone;
    try { clone = response.clone(); } catch (e) { return; }
    ctx.waitUntil((async () => {
        try {
            const buf = await clone.arrayBuffer();
            if (buf.byteLength === 0 || buf.byteLength > MAX_OBJECT_BYTES) return; // 实际体积兜底
            await env.POSTER_CACHE.put(key, buf, {
                httpMetadata: { contentType: ct, cacheControl: 'public, max-age=86400' },
            });
        } catch (e) { /* 写入失败不影响主响应 */ }
    })());
}

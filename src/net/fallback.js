export function flipScheme(targetUrl) {
    const u = new URL(targetUrl);
    if (u.protocol === 'https:') u.protocol = 'http:';
    else if (u.protocol === 'http:') u.protocol = 'https:';
    else return null;
    return u;
}

// fetch 包装：源站 SSL 类错误 (525/526/530) 或抛异常时，自动切换 http/https 协议重试一次
export async function fetchWithSchemeFallback(targetUrl, fetchInit, canRetry) {
    const SSL_ERR = [525, 526, 530];
    if (!canRetry) {
        // 请求体不可重放（流式 / 超限），单次发送，异常向上抛出走多节点故障转移
        return await fetch(new Request(targetUrl, fetchInit));
    }
    try {
        const resp = await fetch(new Request(targetUrl, fetchInit));
        if (!SSL_ERR.includes(resp.status)) return resp;
        const flipped = flipScheme(targetUrl);
        if (!flipped) return resp;
        try { return await fetch(new Request(flipped, fetchInit)); }
        catch (e) { return resp; }
    } catch (err) {
        const flipped = flipScheme(targetUrl);
        if (!flipped) throw err;
        return await fetch(new Request(flipped, fetchInit));
    }
}

// 源站返回 403 时，逐级调整请求头重试 (最多 3 次额外尝试)
// 返回首个非 403 响应；全部失败返回最后一次 403；无尝试返回 null
export async function attempt403Cascade(targetUrl, baseHeaders, fetchInit, currentMode) {
    const strategies = [];
    // 策略 2：对齐源站 Origin/Referer (strict 模式下已是基线，跳过避免重复)
    if (currentMode !== 'strict') {
        strategies.push((h) => {
            h.set("Origin", targetUrl.origin);
            h.set("Referer", targetUrl.origin + "/");
        });
    }
    // 策略 3：删除 Origin/Referer/Sec-Fetch-*
    strategies.push((h) => {
        h.delete("Origin"); h.delete("Referer");
        for (const k of [...h.keys()]) { if (k.toLowerCase().startsWith('sec-fetch-')) h.delete(k); }
    });
    // 策略 4：最小化请求头，仅保留 UA / Accept / 鉴权 / 内容头
    strategies.push((h) => {
        const keep = ['user-agent', 'accept', 'host', 'x-emby-token', 'x-mediabrowser-token', 'x-emby-authorization', 'authorization', 'content-type', 'content-length'];
        for (const k of [...h.keys()]) { if (!keep.includes(k.toLowerCase())) h.delete(k); }
    });

    let lastResp = null;
    for (const apply of strategies) {
        const h = new Headers(baseHeaders);
        apply(h);
        try {
            const resp = await fetch(new Request(targetUrl, { ...fetchInit, headers: h }));
            if (resp.status !== 403) return resp;
            lastResp = resp;
        } catch (e) { /* 忽略，尝试下一策略 */ }
    }
    return lastResp;
}

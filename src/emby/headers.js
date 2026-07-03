export function parseCustomHeadersForProbe(raw) {
    if (!raw) return {};
    const out = {};
    const s = String(raw);
    try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === 'object') {
            for (const k of Object.keys(parsed)) {
                if (/^[A-Za-z0-9_\-]+$/.test(k)) out[k] = String(parsed[k]);
            }
            return out;
        }
    } catch (_) { /* fall through */ }
    for (const ln of s.split(/\r?\n/)) {
        const m = /^\s*([A-Za-z0-9_\-]+)\s*:\s*(\S.*?)\s*$/.exec(ln);
        if (m) out[m[1]] = m[2];
    }
    return out;
}

// 与 emby-js (pototazhang/emby-js) 上游一致：使用真实浏览器 UA，避免被 WAF/CF 拦截。
const EMBY_PROBE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function parseCustomHeaderEmbyToken(customHeadersRaw) {
    if (!customHeadersRaw) return null;
    const raw = String(customHeadersRaw);
    let lines = [];
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            for (const k of Object.keys(parsed)) lines.push(`${k}: ${parsed[k]}`);
        }
    } catch (_) {
        lines = raw.split(/\r?\n/);
    }
    for (const ln of lines) {
        const m = /^\s*(X-Emby-Token|X-MediaBrowser-Token)\s*:\s*(\S.*)$/i.exec(ln);
        if (m) return m[2].trim();
    }
    return null;
}

// 与上游 emby-js buildEmbyClientHeaders 对齐：完整的 Emby 客户端身份头。
// UA 必须由调用方传入（来源：该节点 visitor_logs 里的真实 UA）；不再使用合成 UA。
// 同时把 token 写进 ?api_key= 查询串（上游 fetchEmbyMediaCounts 的做法），
// 兼容部分仅认 query token 或仅认 X-Emby-Token 的 Emby 反代/WAF。
export function buildEmbyClientHeaders(token, prefix, ua) {
    const deviceId = String(prefix || 'forward');
    const authHeader = [
        'MediaBrowser Client="Forward"',
        'Device="Forward"',
        'DeviceId="' + deviceId.replace(/"/g, '') + '"',
        'Version="1.0.0"',
        'Token="' + String(token || '').replace(/"/g, '') + '"'
    ].join(', ');
    const h = {
        'Accept': 'application/json',
        'Authorization': authHeader,
        'X-Emby-Authorization': authHeader,
        'X-Emby-Client': 'Forward',
        'X-Emby-Device-Name': 'Forward',
        'X-Emby-Device-Id': deviceId,
        'X-Emby-Client-Version': '1.0.0',
        'X-Emby-Token': token
    };
    if (ua) h['User-Agent'] = ua;
    return h;
}

// AuthenticateByName 用的身份头：与上方同构但不含 Token。UA 必须传入。
export function buildEmbyLoginHeaders(prefix, ua) {
    const deviceId = String(prefix || 'forward');
    const authHeader = [
        'MediaBrowser Client="Forward"',
        'Device="Forward"',
        'DeviceId="' + deviceId.replace(/"/g, '') + '"',
        'Version="1.0.0"'
    ].join(', ');
    const h = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Emby-Authorization': authHeader,
        'X-Emby-Client': 'Forward',
        'X-Emby-Device-Name': 'Forward',
        'X-Emby-Device-Id': deviceId,
        'X-Emby-Client-Version': '1.0.0'
    };
    if (ua) h['User-Agent'] = ua;
    return h;
}

export function buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw) {
    const h = new Headers(request.headers);
    h.set("Host", targetUrl.host);
    // 去掉 Accept-Encoding，让源站返回未压缩内容以便正确重写响应体
    h.delete("Accept-Encoding");

    const realIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") || "").split(',')[0].trim();
    h.delete("cf-connecting-ip"); h.delete("cf-ipcountry"); h.delete("cf-ray");
    h.delete("cf-visitor"); h.delete("x-forwarded-for"); h.delete("x-real-ip");

    if (currentMode === 'realip_only' && realIp) {
        h.set("X-Real-IP", realIp);
    } else if (currentMode === 'dual' && realIp) {
        h.set("X-Real-IP", realIp); h.set("X-Forwarded-For", realIp);
    } else if (currentMode === 'strict') {
        // 强力防 403 模式：强制清空原始端代理参数，对齐 Origin
        h.delete("X-Forwarded-Proto"); h.delete("X-Forwarded-Host");
        h.set("Origin", targetUrl.origin); h.set("Referer", targetUrl.origin + "/");
        if (realIp) { h.set("X-Real-IP", realIp); h.set("X-Forwarded-For", realIp); }
    }

    // 🌟 应用节点自定义请求头 (格式: Key: Value，每行一条)
    if (customHeadersRaw) {
        customHeadersRaw.split('\n').forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) {
                const key = line.slice(0, idx).trim();
                const val = line.slice(idx + 1).trim();
                if (key) h.set(key, val);
            }
        });
    }
    return h;
}


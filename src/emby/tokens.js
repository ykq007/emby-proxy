import { dbRun } from '../db/helpers.js';

// 进程内令牌写入去抖（prefix -> { token, writtenAt })
export const HARVEST_MEM = new Map();

export async function tokenKey(env, prefix) {
    const ikm = new TextEncoder().encode(String(env.ADMIN_TOKEN || ''));
    const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
    return await crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256',
          salt: new TextEncoder().encode(String(prefix || '')),
          info: new TextEncoder().encode('emby-proxy:harvested-token') },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt', 'decrypt']
    );
}

export function b64encode(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
}
export function b64decode(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

export async function encryptToken(env, prefix, token) {
    const key = await tokenKey(env, prefix);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
    return b64encode(iv) + '.' + b64encode(new Uint8Array(ct));
}

export async function decryptToken(env, prefix, blob) {
    if (!blob || typeof blob !== 'string' || blob.indexOf('.') < 0) return null;
    const parts = blob.split('.');
    if (parts.length !== 2) return null;
    try {
        const iv = b64decode(parts[0]);
        const ct = b64decode(parts[1]);
        if (iv.length !== 12) return null;
        const key = await tokenKey(env, prefix);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        return new TextDecoder().decode(pt);
    } catch (e) {
        return null;
    }
}

export function extractEmbyToken(request) {
    const h = request.headers;
    let t = h.get('X-Emby-Token') || h.get('X-MediaBrowser-Token');
    if (t) return t.trim();
    const ea = h.get('X-Emby-Authorization');
    if (ea) {
        const m = /Token="?([^",\s]+)"?/i.exec(ea);
        if (m) return m[1].trim();
    }
    const auth = h.get('Authorization');
    if (auth) {
        const m = /MediaBrowser[^,]*Token="?([^",\s]+)"?/i.exec(auth);
        if (m) return m[1].trim();
    }
    try {
        const u = new URL(request.url);
        const q = u.searchParams.get('api_key');
        if (q) return q.trim();
    } catch (e) { /* ignore */ }
    return null;
}

export async function persistHarvestedToken(env, prefix, token, now) {
    try {
        const blob = await encryptToken(env, prefix, token);
        await dbRun(env, `UPDATE routes SET emby_auth_cache = ?, emby_auth_seen_at = ? WHERE prefix = ?`, blob, now, prefix);
    } catch (e) {
        console.log('persistHarvestedToken error:', e.message);
    }
}

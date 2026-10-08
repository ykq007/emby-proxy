// The one fetch helper. Endpoints answer either { success: false, msg } or { error } on failure.
export async function api(path, { method = 'GET', body, signal } = {}) {
    const res = await fetch(path, {
        method,
        signal,
        credentials: 'same-origin',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    // The session is gone; a reload makes the auth gate serve the login page.
    if (res.status === 401) {
        location.reload();
        throw new Error('登录已失效');
    }
    const text = await res.text();
    let data = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* plain-text body */ }
    const failed = !res.ok || (data && typeof data === 'object' && data.success === false);
    if (failed) {
        const msg = data && typeof data === 'object' ? (data.msg || data.error || data.message) : data;
        throw new Error(msg || `HTTP ${res.status}`);
    }
    return data;
}

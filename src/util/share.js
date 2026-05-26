export function newShareToken() {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    let s = '';
    for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
}

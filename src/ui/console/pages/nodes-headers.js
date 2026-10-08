// Custom request headers: the stored form is "Key: Value" lines; the editor works on rows.
// A row is { key, value, on }. Pure functions only, so test/nodes-headers.test.mjs can import them.

const SENSITIVE = new Set(['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-emby-token', 'token']);
export const isSensitiveKey = key => SENSITIVE.has(String(key || '').trim().toLowerCase());

const lower = key => key.trim().toLowerCase();

// Blank lines, # comments and lines without a key before the colon are skipped.
export function parseHeaders(text) {
    return String(text || '').split('\n').flatMap(line => {
        const t = line.trim();
        const i = t.indexOf(':');
        if (!t || t.startsWith('#') || i < 1) return [];
        return [{ key: t.slice(0, i).trim(), value: t.slice(i + 1).trim(), on: true }];
    });
}

// Only enabled rows with a key; the first of each case-insensitive key wins.
export function serializeHeaders(rows) {
    const seen = new Set();
    return rows.filter(r => {
        if (!r.on || !r.key.trim() || seen.has(lower(r.key))) return false;
        seen.add(lower(r.key));
        return true;
    }).map(r => r.key.trim() + ': ' + r.value).join('\n');
}

export const enabledCount = rows => rows.filter(r => r.on && r.key.trim()).length;

// The -H / --header values of a pasted "Copy as cURL" command, quoted with ' or ".
export function parseCurl(text) {
    const out = [];
    for (const m of String(text || '').matchAll(/(?:-H|--header)\s+(['"])([^:]+):\s*([^]*?)\1/g)) {
        const key = m[2].trim();
        if (key) out.push({ key, value: m[3].trim(), on: true });
    }
    return out;
}

// Adds incoming rows. 'skip' keeps an existing key as it is (cURL paste); 'replace' takes the
// incoming value and enables the row (import from another node). Returns new rows and counts.
export function mergeHeaders(rows, incoming, onConflict) {
    const next = rows.map(r => ({ ...r }));
    let added = 0, updated = 0;
    for (const row of incoming) {
        const hit = next.find(r => lower(r.key) === lower(row.key));
        if (!hit) { next.push({ ...row }); added++; }
        else if (onConflict === 'replace') { hit.value = row.value; hit.on = true; updated++; }
    }
    return { rows: next, added, updated };
}

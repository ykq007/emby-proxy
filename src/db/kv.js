// kv_config seam: a key registry (every kv_config key as an exported
// constant) plus typed kvGet/kvSet/kvDelete accessors that own parse and
// serialize for structured values.
//
// Before this module, keys were bare string literals scattered across
// readers and writers (country/hotlink allowlist parsing was implemented
// three times — in config-cache.js, routing/validate.js, and api/status.js —
// with a comment ordering maintainers to keep the copies in sync by hand).
// Now every caller reads/writes through kvGet/kvSet with the exported key
// constant, so there is exactly one parse/serialize implementation per
// structured value and drift is impossible.
import { dbFirst, dbRun, dbStmt } from './helpers.js';

// ---------------------------------------------------------------------------
// Key registry — every kv_config key lives here. Callers reference the
// constant; no bare key literals belong anywhere else.
// ---------------------------------------------------------------------------
export const SCHEMA_VERSION_KEY = 'schema_version';
export const MANUAL_REDIRECT_DOMAINS_KEY = 'manual_redirect_domains';
export const COUNTRY_ALLOWLIST_KEY = 'proxy_country_allowlist';
export const HOTLINK_ALLOW_HOSTS_KEY = 'hotlink_allow_hosts';
export const EMBY_LAST_ROLLUP_TS_KEY = 'emby_last_rollup_ts';
export const TG_ALERTS_MUTED_UNTIL_KEY = 'tg_alerts_muted_until_ts';
export const EMBY_SHARED_USERNAME_KEY = 'emby_shared_username';
export const EMBY_SHARED_PASSWORD_ENC_KEY = 'emby_shared_password_enc';
// optimized_domains 的 vps789 builtin 列表最近一次成功拉取时间（ms epoch）。
// 无注册 codec，走下面的 RAW_CODEC（原样字符串往返）；0/缺失 = 从未成功拉取过。
export const OPTIMIZED_VPS789_FETCHED_AT_KEY = 'optimized_vps789_fetched_at';

// ---------------------------------------------------------------------------
// Codecs — one parse (DB string -> typed value) / serialize (typed value ->
// DB string) pair per structured key. kvGet/kvSet dispatch on the key, so
// every reader and writer for a given key shares the identical codec.
// ---------------------------------------------------------------------------

function parseCountryAllowlist(raw) {
    if (!raw) return null;
    const set = new Set(String(raw).split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
    return set.size ? set : null;
}
function serializeCountryAllowlist(codes) {
    const arr = codes instanceof Set ? [...codes]
        : Array.isArray(codes) ? codes
        : String(codes || '').split(',');
    const set = new Set(arr.map(s => String(s || '').trim().toUpperCase()).filter(Boolean));
    return [...set].join(',');
}

function parseHotlinkHosts(raw) {
    if (!raw) return null;
    const set = new Set(String(raw).split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(Boolean));
    return set.size ? set : null;
}
function serializeHotlinkHosts(hosts) {
    const arr = hosts instanceof Set ? [...hosts]
        : Array.isArray(hosts) ? hosts
        : String(hosts || '').split(/[,\n]/);
    const set = new Set(arr.map(s => String(s || '').trim().toLowerCase()).filter(Boolean));
    return [...set].join(',');
}

function parseMuteUntil(raw) {
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function serializeMuteUntil(untilTs) {
    return String(parseInt(untilTs, 10) || 0);
}

const CODECS = {
    [COUNTRY_ALLOWLIST_KEY]: { parse: parseCountryAllowlist, serialize: serializeCountryAllowlist },
    [HOTLINK_ALLOW_HOSTS_KEY]: { parse: parseHotlinkHosts, serialize: serializeHotlinkHosts },
    [TG_ALERTS_MUTED_UNTIL_KEY]: { parse: parseMuteUntil, serialize: serializeMuteUntil },
};

// Keys with no registered codec round-trip as plain strings (null when absent).
const RAW_CODEC = {
    parse: (v) => (v === undefined || v === null ? null : String(v)),
    serialize: (v) => (v === undefined || v === null ? '' : String(v)),
};

function codecFor(key) {
    return CODECS[key] || RAW_CODEC;
}

// Exported so callers that already hold a raw string (e.g. config-cache.js's
// batch loader) can reuse the exact same parse/serialize without another D1
// round trip via kvGet/kvSet.
export const countryAllowlistCodec = CODECS[COUNTRY_ALLOWLIST_KEY];
export const hotlinkHostsCodec = CODECS[HOTLINK_ALLOW_HOSTS_KEY];
export const muteUntilCodec = CODECS[TG_ALERTS_MUTED_UNTIL_KEY];

// ---------------------------------------------------------------------------
// Typed accessors
// ---------------------------------------------------------------------------

/**
 * Typed read of a kv_config row, parsed via the key's codec.
 * No env.DB / missing row → the codec's "absent" parse result
 * (null for structured keys, null for raw keys).
 */
export async function kvGet(env, key) {
    if (!env?.DB) return codecFor(key).parse(null);
    const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = ?`, key);
    return codecFor(key).parse(row ? row.v : null);
}

/**
 * Build (but don't execute) an INSERT OR REPLACE statement for a kv_config
 * row, serialized via the same codec kvGet/kvSet use. For callers that need
 * to fold the write into an env.DB.batch() alongside other statements.
 */
export function kvSetStmt(env, key, value) {
    const v = codecFor(key).serialize(value);
    return dbStmt(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`, key, v);
}

/**
 * Typed write of a kv_config row — serializes via the same codec kvGet
 * uses, so writers can never drift from readers.
 */
export async function kvSet(env, key, value) {
    return kvSetStmt(env, key, value).run();
}

/** Delete a kv_config row (e.g. clearing a mute window). */
export async function kvDelete(env, key) {
    return dbRun(env, `DELETE FROM kv_config WHERE k = ?`, key);
}

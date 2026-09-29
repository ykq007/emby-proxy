// Self-hosted libSQL (sqld) behind a D1-shaped facade.
//
// Opt-in: when LIBSQL_URL is set, withDatabase() swaps env.DB for an object
// that speaks the slice of the D1 API this codebase uses (prepare/bind/first/
// all/run, batch, exec — see db/helpers.js and db/schema.js). Every call site
// stays unchanged, and the SQL runs unchanged because libSQL is SQLite.
// Without LIBSQL_URL nothing changes: the D1 binding is used as before.
import { createClient } from '@libsql/client/web';

// A dead or slow server must not hold proxy requests hostage: every HTTP call
// to sqld is aborted after this long and surfaces as an ordinary DB error.
const QUERY_TIMEOUT_MS = 8000;
// Bound once at load so DB traffic never goes through a later-patched global
// fetch (the proxy tests stub it to fake an upstream Emby).
const nativeFetch = globalThis.fetch.bind(globalThis);

function timeoutFetch(input, init) {
    const signal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
    if (input instanceof Request) return nativeFetch(new Request(input, { signal }));
    return nativeFetch(input, { ...(init || {}), signal });
}

// libSQL rejects undefined binds; send NULL so a missing optional value
// doesn't fail the whole statement.
const toArgs = (binds) => binds.map(v => (v === undefined ? null : v));

// libSQL Row objects are array-like; D1 hands back plain {column: value} objects.
function toObjects(rs) {
    const cols = rs.columns;
    return rs.rows.map(row => {
        const o = {};
        for (let i = 0; i < cols.length; i++) o[cols[i]] = row[i];
        return o;
    });
}

function toD1Result(rs) {
    return {
        success: true,
        results: toObjects(rs),
        meta: {
            changes: rs.rowsAffected,
            last_row_id: rs.lastInsertRowid === undefined ? 0 : Number(rs.lastInsertRowid),
        },
    };
}

const STMT = Symbol('libsqlStmt');

/** Wrap a @libsql/client Client in the D1 surface the codebase uses. */
export function libsqlAsD1(client) {
    const bound = (sql, args) => ({
        [STMT]: true,
        sql,
        args,
        bind: (...binds) => bound(sql, toArgs(binds)),
        async all() { return toD1Result(await client.execute({ sql, args })); },
        async run() { return toD1Result(await client.execute({ sql, args })); },
        async first(column) {
            const row = toObjects(await client.execute({ sql, args }))[0];
            if (!row) return null;
            return column === undefined ? row : (row[column] ?? null);
        },
    });
    return {
        prepare: (sql) => bound(sql, []),
        // D1 batches are one implicit transaction; 'write' mode gives the same all-or-nothing.
        async batch(stmts) {
            if (!stmts.length) return [];
            for (const s of stmts) if (!s || !s[STMT]) throw new Error('batch(): statement was not prepared by this database');
            const results = await client.batch(stmts.map(s => ({ sql: s.sql, args: s.args })), 'write');
            return results.map(toD1Result);
        },
        async exec(sql) {
            await client.executeMultiple(sql);
            return { count: 1 };
        },
    };
}

let _cached = null; // { key, db } — one client per isolate per URL/token pair

function libsqlDb(env) {
    const key = env.LIBSQL_URL + '\n' + (env.LIBSQL_AUTH_TOKEN || '');
    if (!_cached || _cached.key !== key) {
        const client = createClient({
            url: env.LIBSQL_URL,
            authToken: env.LIBSQL_AUTH_TOKEN || undefined,
            fetch: timeoutFetch,
        });
        _cached = { key, db: libsqlAsD1(client) };
    }
    return _cached.db;
}

/**
 * Return the env the rest of the worker should see: unchanged without
 * LIBSQL_URL, otherwise a copy whose DB is the self-hosted libSQL server.
 */
export function withDatabase(env) {
    if (!env || !env.LIBSQL_URL) return env;
    return { ...env, DB: libsqlDb(env) };
}

/**
 * Shared D1 fake — the common client-shape plumbing (prepare/bind chaining,
 * batch orchestration, exec no-op, a call log) that every per-file D1 mock
 * in this suite used to reimplement by hand (issue #22).
 *
 * Domain data/behavior stays test-specific: callers supply `handlers`, an
 * ordered array of `{ test: RegExp, exec(binds, sql) }` entries matched
 * against the SQL text of each statement. `exec` runs the statement's
 * side effect (against whatever in-memory store the test built) and
 * returns an array of result rows (empty array for a typical write, the
 * matched row(s) for a SELECT, or the RETURNING row for an
 * `INSERT ... RETURNING`). The fake formats that row array to match
 * whichever D1 call the code under test used — .first() / .all() / .run() /
 * .batch() / .exec() all end up funneled through the same dispatch, so
 * there's exactly one implementation of "what shape does env.DB have".
 *
 * No handler matches → .first() returns null, .all() returns
 * { results: [] }, .run() succeeds as a no-op — mirroring the safe
 * defaults every bespoke mock already provided.
 *
 * `log` records every touch as `{ sql, binds, kind }` (kind is 'first' |
 * 'all' | 'run' | 'batch-item' | 'exec'); `batches` records each
 * env.DB.batch() call as the array of statements it was given, for tests
 * that need to assert "exactly one batch call" or inspect what was batched
 * (each statement exposes read-only `.sql` / `.binds` for that inspection).
 */
export function createD1Fake(handlers = []) {
    const log = [];
    const batches = [];

    function resolve(sql, binds, kind) {
        log.push({ sql, binds, kind });
        for (const h of handlers) {
            if (h.test.test(sql)) {
                const rows = h.exec(binds, sql);
                return Array.isArray(rows) ? rows : [];
            }
        }
        return [];
    }

    function makeStmt(sql) {
        let binds = [];
        const stmt = {
            sql,
            get binds() { return binds; },
            bind(...args) { binds = args; return stmt; },
            async first() {
                const rows = resolve(sql, binds, 'first');
                return rows.length ? rows[0] : null;
            },
            async all() {
                const rows = resolve(sql, binds, 'all');
                return { results: rows, success: true };
            },
            async run() {
                const rows = resolve(sql, binds, 'run');
                return { success: true, meta: { changes: rows.length }, results: [] };
            },
            // Used by batch(): a full-shaped D1Result regardless of statement kind,
            // so a SELECT participating in a batch still exposes .results.
            async _exec() {
                const rows = resolve(sql, binds, 'batch-item');
                return { success: true, results: rows, meta: { changes: rows.length } };
            },
        };
        return stmt;
    }

    return {
        log,
        batches,
        prepare(sql) { return makeStmt(sql); },
        async batch(stmts) {
            batches.push(stmts);
            return Promise.all(stmts.map(s => s._exec()));
        },
        async exec(sql) {
            log.push({ sql, binds: [], kind: 'exec' });
            return { count: 0, duration: 0 };
        },
    };
}

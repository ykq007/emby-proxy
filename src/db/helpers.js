// D1 seam: every env.DB.prepare()/env.DB.batch() call in the codebase goes
// through this module. Single-statement execution uses dbRun/dbAll/dbFirst;
// a statement that needs to be combined with others into one env.DB.batch()
// round trip is built with dbStmt() and submitted via dbBatch(). Keeping
// prepare/batch calls here (and nowhere else) gives D1 error/logging policy
// one home and lets tests substitute a single fake DB implementation instead
// of a bespoke stub per call site.
export function dbRun(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).run();
}
export function dbAll(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).all();
}
export function dbFirst(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).first();
}

/**
 * Build (but don't execute) a bound D1 statement — for composing a
 * multi-statement dbBatch() call, or for a caller that hands an unexecuted
 * statement to another module's batch (e.g. routing/route.js's write
 * helpers feeding emby/counts.js's batch). Pair with dbBatch().
 */
export function dbStmt(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds);
}

/** Execute a batch of statements built via dbStmt() in one D1 round trip. */
export function dbBatch(env, stmts) {
    return env.DB.batch(stmts);
}

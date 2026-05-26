export function dbRun(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).run();
}
export function dbAll(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).all();
}
export function dbFirst(env, sql, ...binds) {
    return env.DB.prepare(sql).bind(...binds).first();
}

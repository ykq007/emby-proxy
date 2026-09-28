/**
 * D1 adapter over node:sqlite (in-memory). For tests whose logic lives in
 * the SQL itself (viewers, watch state, slots), where regex handlers in
 * d1-fake.mjs would only re-implement the query.
 */
import { DatabaseSync } from 'node:sqlite';

export function createD1Sqlite() {
    const db = new DatabaseSync(':memory:');
    const prepare = (sql) => {
        let binds = [];
        const stmt = {
            bind(...args) { binds = args; return stmt; },
            async first() { return db.prepare(sql).get(...binds) ?? null; },
            async all() { return { results: db.prepare(sql).all(...binds), success: true }; },
            async run() { const r = db.prepare(sql).run(...binds); return { success: true, meta: { changes: r.changes }, results: [] }; },
        };
        return stmt;
    };
    return {
        db,
        prepare,
        async batch(stmts) {
            db.exec('BEGIN');
            try {
                const out = [];
                for (const s of stmts) out.push(await s.run());
                db.exec('COMMIT');
                return out;
            } catch (e) { db.exec('ROLLBACK'); throw e; }
        },
        async exec(sql) { db.exec(sql); return { count: 1 }; },
    };
}

// db/libsql.js：自托管 libSQL 的 D1 外观。
// 默认跑本地 libSQL 引擎（file: 库，与 sqld 同一个 SQLite 引擎）；
// 设置 LIBSQL_TEST_URL（如 http://127.0.0.1:8080，每次跑前需为空库）时，
// 同一组用例再走一遍真正的 HTTP → sqld 链路（生产用的就是这个 web 客户端）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient as createFileClient } from '@libsql/client';
import { createClient as createWebClient } from '@libsql/client/web';

import { libsqlAsD1, withDatabase } from '../src/db/libsql.js';
import { ensureSchema, SCHEMA_VERSION, SCHEMA_VERSION_KEY, __resetSchemaReadyForTest } from '../src/db/schema.js';
import { getConfig, __resetConfigCache } from '../src/proxy/config-cache.js';
import { loadStatusData } from '../src/status/page.js';
import { rateLimitFixedWindow } from '../src/db/rate-limit.js';
import { createViewer, grantAccess, issueToken, resolveViewer, findViewerForLogin, deleteViewer, clearResolveCache } from '../src/viewers/store.js';
import { recordPlayback, setUserData, loadRows, resumeIds, buildNextUp, localFilterIds } from '../src/viewers/watch.js';
import { acquireSlot, heartbeatSlot, releaseSlot } from '../src/viewers/limits.js';

const targets = [{
    name: 'file',
    open() {
        const dir = mkdtempSync(join(tmpdir(), 'libsql-test-'));
        const client = createFileClient({ url: 'file:' + join(dir, 'db.sqlite') });
        return { db: libsqlAsD1(client), close() { client.close(); rmSync(dir, { recursive: true, force: true }); } };
    },
}];
if (process.env.LIBSQL_TEST_URL) {
    targets.push({
        name: 'http',
        open() {
            const client = createWebClient({ url: process.env.LIBSQL_TEST_URL, authToken: process.env.LIBSQL_TEST_TOKEN || undefined });
            return { db: libsqlAsD1(client), close() { client.close(); } };
        },
    });
}

for (const target of targets) {
    test(`[${target.name}] D1 surface: prepare/bind/all/run/first, batch, exec`, async () => {
        const { db, close } = target.open();
        try {
            await db.exec(`DROP TABLE IF EXISTS t; CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT UNIQUE COLLATE NOCASE, n INTEGER DEFAULT 0)`);

            const ins = await db.prepare(`INSERT INTO t (k, n) VALUES (?, ?)`).bind('a', 1).run();
            assert.equal(ins.success, true);
            assert.equal(ins.meta.changes, 1);
            assert.equal(ins.meta.last_row_id, 1);

            // 编号参数 ?1 复用 + ON CONFLICT … excluded（status/page.js、routing 在用）
            await db.prepare(`INSERT INTO t (k, n) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET n = n + excluded.n`).bind('A', 5).run();
            assert.deepEqual(await db.prepare(`SELECT k, n FROM t WHERE k = ?`).bind('a').first(), { k: 'a', n: 6 });
            assert.equal(await db.prepare(`SELECT n FROM t WHERE k = ?`).bind('a').first('n'), 6);
            assert.equal(await db.prepare(`SELECT n FROM t WHERE k = ?`).bind('missing').first(), null);

            const all = await db.prepare(`SELECT k FROM t ORDER BY k`).all();
            assert.deepEqual(all.results, [{ k: 'a' }]);
            assert.equal(Object.getPrototypeOf(all.results[0]), Object.prototype, 'rows are plain objects');

            // undefined 绑定按 NULL 处理
            await db.prepare(`INSERT INTO t (k, n) VALUES (?, ?)`).bind('u', undefined).run();
            assert.equal(await db.prepare(`SELECT n FROM t WHERE k = 'u'`).first('n'), null);

            // prepare() 未 bind 也能直接执行；bind 返回新语句，不改原语句
            const base = db.prepare(`SELECT COUNT(*) AS c FROM t WHERE k = ?`);
            const bound = base.bind('a');
            assert.equal(await bound.first('c'), 1);
            assert.deepEqual(base.args, []);

            const res = await db.batch([
                db.prepare(`INSERT OR REPLACE INTO t (k, n) VALUES (?, ?)`).bind('b', 2),
                db.prepare(`SELECT COUNT(*) AS c FROM t`),
            ]);
            assert.equal(res.length, 2);
            assert.equal(res[0].meta.changes, 1);
            assert.deepEqual(res[1].results, [{ c: 3 }]);
            assert.deepEqual(await db.batch([]), []);

            // batch 是一个事务：任一语句失败则整体回滚（与 D1 一致）
            await assert.rejects(db.batch([
                db.prepare(`INSERT INTO t (k) VALUES ('rolled-back')`),
                db.prepare(`INSERT INTO no_such_table VALUES (1)`),
            ]));
            assert.equal(await db.prepare(`SELECT COUNT(*) AS c FROM t WHERE k = 'rolled-back'`).first('c'), 0);

            // schema.js 依赖「重复加列会抛错」来做幂等迁移
            await assert.rejects(db.exec(`ALTER TABLE t ADD COLUMN n INTEGER`));

            await assert.rejects(db.batch([{ sql: 'SELECT 1' }]), /not prepared by this database/);
            await db.exec(`DROP TABLE t`);
        } finally { close(); }
    });

    test(`[${target.name}] full schema migration + config, status, rate limit, viewers, watch state, slots`, async () => {
        const { db, close } = target.open();
        __resetSchemaReadyForTest(); __resetConfigCache(); clearResolveCache();
        const env = { DB: db };
        try {
            await ensureSchema(env);
            const ver = await db.prepare(`SELECT v FROM kv_config WHERE k = ?`).bind(SCHEMA_VERSION_KEY).first('v');
            assert.equal(ver, String(SCHEMA_VERSION), 'every migration statement ran');

            await db.prepare(`INSERT INTO routes (prefix, target, max_concurrent, viewers_enabled) VALUES (?, ?, ?, 1)`).bind('node1', 'https://up.example', 1).run();
            const { config } = await getConfig(env);
            assert.equal(config.ok, true);
            assert.equal(config.routesMap.get('node1').target, 'https://up.example');

            const status = await loadStatusData(env, {});
            assert.deepEqual(status.routes.map(r => r.prefix), ['node1']);

            // 失败鉴权限流：12 次/分钟内放行，第 13 次 429
            const opts = { table: 'auth_rl', minuteLimit: 12, hourlyLimit: 100, banMs: 3600000, reason: 't' };
            for (let i = 0; i < 12; i++) assert.equal(await rateLimitFixedWindow(env, '1.2.3.4', 1_000_000, opts), null);
            assert.equal((await rateLimitFixedWindow(env, '1.2.3.4', 1_000_000, opts)).status, 429);

            // viewer：建号 → 授权 → 登录查找（COLLATE NOCASE）→ 令牌解析
            const id = await createViewer(env, 'Alice', 'secret1');
            await grantAccess(env, id, 'node1', 1, ['L2']);
            assert.equal((await findViewerForLogin(env, 'node1', 'alice')).id, id);
            const token = await issueToken(env, id, 'node1', 'dev1');
            const s = await resolveViewer(env, 'node1', token);
            assert.equal(s.viewerId, id);
            assert.deepEqual([...s.hidden], ['L2']);

            // 观看状态
            const meta = { e1: [1, 1], e2: [1, 2] };
            const fetchItem = async (itemId) => ({ Id: itemId, Type: 'Episode', SeriesId: 'ser', ParentIndexNumber: meta[itemId][0], IndexNumber: meta[itemId][1], RunTimeTicks: 1000 });
            await recordPlayback(env, s, 'stopped', { ItemId: 'e1', PositionTicks: 950 }, fetchItem);
            await recordPlayback(env, s, 'progress', { ItemId: 'e2', PositionTicks: 300 }, fetchItem);
            await setUserData(env, s, 'e2', { favorite: true }, fetchItem);
            const rows = await loadRows(env, s, ['e1', 'e2', 'nope']);
            assert.equal(rows.get('e1').played, 1);
            assert.equal(rows.get('e2').position_ticks, 300);
            assert.equal(rows.get('e2').is_favorite, 1);
            assert.deepEqual((await resumeIds(env, s, new URLSearchParams())).ids, ['e2']);
            assert.deepEqual(await localFilterIds(env, s, new URLSearchParams('Filters=IsFavorite')), ['e2']);
            const next = await buildNextUp(env, s, new URLSearchParams(), async () => [
                { Id: 'e1', ParentIndexNumber: 1, IndexNumber: 1 }, { Id: 'e2', ParentIndexNumber: 1, IndexNumber: 2 },
            ]);
            assert.deepEqual(next.Items.map(i => i.Id), ['e2']);

            // 并发槽位：节点上限 1 → 第二台设备 429，释放后可占
            assert.equal(await acquireSlot(env, s, 'dev1', 'e2'), null);
            await heartbeatSlot(env, s, 'dev1');
            assert.equal((await acquireSlot(env, s, 'dev2', 'e2')).status, 429);
            await releaseSlot(env, s, 'dev1');
            assert.equal(await acquireSlot(env, s, 'dev2', 'e2'), null);

            await deleteViewer(env, id);
            assert.equal(await db.prepare(`SELECT COUNT(*) AS c FROM watch_state`).first('c'), 0);
        } finally {
            __resetSchemaReadyForTest(); __resetConfigCache(); clearResolveCache();
            close();
        }
    });
}

test('withDatabase: no LIBSQL_URL → env untouched (D1); with it → DB swapped, other bindings kept', () => {
    const d1 = { prepare() { } };
    const plain = { DB: d1, ADMIN_TOKEN: 'x' };
    assert.strictEqual(withDatabase(plain), plain);

    const env = { DB: d1, ADMIN_TOKEN: 'x', LIBSQL_URL: 'http://127.0.0.1:1', LIBSQL_AUTH_TOKEN: 't' };
    const swapped = withDatabase(env);
    assert.notStrictEqual(swapped.DB, d1);
    assert.equal(typeof swapped.DB.prepare, 'function');
    assert.equal(swapped.ADMIN_TOKEN, 'x');
    assert.strictEqual(withDatabase(env).DB, swapped.DB, 'one client per isolate, reused across requests');
    assert.strictEqual(env.DB, d1, 'the original env is not mutated');
});

test('withDatabase: unreachable server fails fast with an ordinary error (no hang)', async () => {
    const env = withDatabase({ LIBSQL_URL: 'http://127.0.0.1:9' });
    await assert.rejects(env.DB.prepare('SELECT 1').first());
});

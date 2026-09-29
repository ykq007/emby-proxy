// Worker 入口：仅做装配。cron → scheduled.js，HTTP → router.js。
// 版本号唯一真相源见 util/version.js。
// withDatabase：配置了 LIBSQL_URL 时把 env.DB 换成自托管 libSQL（见 db/libsql.js），否则原样用 D1。
import { handleScheduled } from './scheduled.js';
import { handleRequest } from './router.js';
import { withDatabase } from './db/libsql.js';

export default {
    scheduled: (event, env, ctx) => handleScheduled(event, withDatabase(env), ctx),
    fetch: (request, env, ctx) => handleRequest(request, withDatabase(env), ctx),
};

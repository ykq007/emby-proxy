// Worker 入口：仅做装配。cron → scheduled.js，HTTP → router.js。
// 版本号唯一真相源见 util/version.js。
import { handleScheduled } from './scheduled.js';
import { handleRequest } from './router.js';

export default {
    scheduled: (event, env, ctx) => handleScheduled(event, env, ctx),
    fetch: (request, env, ctx) => handleRequest(request, env, ctx),
};

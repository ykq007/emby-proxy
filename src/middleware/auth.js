import { LOGIN_UI } from '../ui/login.js';
import { rateLimitFixedWindow } from '../db/rate-limit.js';

// 失败鉴权限流阈值：同一 IP 在 60s 固定窗口内最多 N 次失败尝试，超出回 429。
const AUTH_RL_LIMIT = 12;
// Fail2ban 式自动封禁：单 IP 近 1 小时累计失败超阈值 → 封禁一段时间，挡持续/慢速穷举。
const BAN_HOURLY_THRESHOLD = 100; // 1 小时内累计失败上限
const BAN_DURATION_MS = 3600000;  // 触发封禁后的封锁时长（1 小时）

// 失败鉴权的 D1 限流 + 自动封禁。返回 429 Response 表示已限流/封禁，null 表示放行继续。
// 调用前提：仅在鉴权已失败时调用（正确 cookie 不进此路径，零 DB 开销）。
function enforceAuthAbuse(env, ip, now) {
    return rateLimitFixedWindow(env, ip, now, {
        table: 'auth_rl',
        minuteLimit: AUTH_RL_LIMIT,
        hourlyLimit: BAN_HOURLY_THRESHOLD,
        banMs: BAN_DURATION_MS,
        reason: 'auth-bruteforce',
    });
}

// 返回一个 Response 表示需要拦截(未授权/缺少 ADMIN_TOKEN)，返回 null 表示放行。
// 异步：失败鉴权按来源 IP 在 D1 固定窗口内计数限流，挡暴力穷举 admin_token（登录
// 是纯 cookie 比对、没有独立登录端点，穷举面就是这里）。用 D1 而非 Cloudflare 原生
// ratelimit 绑定：后者逐数据中心计数、无法全局聚合(实测同 IP 连发不触发)，D1 全局一致。
// 正确 cookie 直接放行、永不触发写入；DB 缺失或异常时 fail-open，不误伤正常管理操作。
export async function requireAuth(request, env, url) {
    const EXPECTED_TOKEN = env.ADMIN_TOKEN;
    if (!EXPECTED_TOKEN) return new Response("请在 Worker 变量中配置 ADMIN_TOKEN", { status: 500 });
    function getCookie(req, name) {
        const cookieString = req.headers.get("Cookie");
        if (!cookieString) return null;
        const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return decodeURIComponent(match[2]);
        return null;
    }
    const isPanelOrApi = url.pathname === '/' || url.pathname.startsWith('/api/');
    // 仅 POST /api/tg-webhook 免鉴权（其他方法走管理鉴权，避免 GET 等绕过）
    const isTgWebhookPost = url.pathname === '/api/tg-webhook' && request.method === 'POST';
    if (isPanelOrApi && !isTgWebhookPost) {
        const providedToken = getCookie(request, 'admin_token');
        if (providedToken !== EXPECTED_TOKEN) {
            // 鉴权失败 → D1 限流 + Fail2ban 自动封禁；超阈值/已封禁回 429。
            if (env.DB) {
                try {
                    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
                    const limited = await enforceAuthAbuse(env, ip, Date.now());
                    if (limited) return limited;
                } catch (e) { /* 限流/封禁写入异常：fail-open，继续走原鉴权拒绝逻辑 */ }
            }
            if (url.pathname === '/') return new Response(LOGIN_UI, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
            else return new Response('Unauthorized', { status: 401 });
        }
    }
    return null;
}

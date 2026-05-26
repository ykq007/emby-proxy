export const LOGIN_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>系统授权</title>
    <style>
        ${CSS_COMMON}
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; margin: 0; background: #f0f2f5; position: relative; overflow-x: hidden; }
        body::before, body::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
        body::before { top: -120px; right: -80px; width: 320px; height: 320px; background: radial-gradient(circle, var(--primary-glow), transparent 70%); }
        body::after { bottom: -100px; left: -100px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(88,86,214,0.18), rgba(88,86,214,0) 70%); }
        /* v2.5.0: desktop login refreshed in iOS-native voice — gradient
           medallion, large title, inset input. CTA stays inside the card. */
        .login-box {
            position: relative; z-index: 1;
            background: var(--card);
            padding: var(--space-8) var(--space-7) var(--space-7);
            border-radius: var(--radius-ios);
            box-shadow: 0 18px 48px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.05);
            text-align: center; width: 100%; max-width: 400px;
        }
        .login-logo {
            display: flex !important;
            width: 72px; height: 72px;
            border-radius: var(--radius-ios);
            background: var(--aurora-grad);
            color: #fff;
            align-items: center; justify-content: center;
            margin: 0 auto var(--space-5);
            box-shadow: 0 14px 32px -8px var(--primary-glow);
        }
        .login-logo svg { width: 34px; height: 34px; stroke: currentColor; fill: currentColor; }
        .login-eyebrow {
            display: block;
            font-size: var(--text-xs);
            font-weight: 700;
            color: var(--text-sec);
            letter-spacing: 0.10em;
            text-transform: uppercase;
            margin-bottom: var(--space-2);
        }
        .login-box h2 {
            margin: 0 0 var(--space-2) 0;
            font-size: var(--text-large-title-lg);
            font-weight: 700;
            letter-spacing: -0.025em;
            line-height: 1.1;
            color: var(--text);
        }
        .login-sub {
            display: block;
            font-size: var(--text-headline);
            line-height: 1.45;
            color: var(--text-sec);
            margin: 0 0 var(--space-6) 0;
        }
        .login-box input {
            width: 100%;
            padding: 14px var(--space-4);
            margin-bottom: var(--space-4);
            border: 1px solid transparent;
            border-radius: var(--radius-md);
            background: var(--ios-fill-quat);
            color: var(--text);
            font-size: var(--text-headline);
            box-sizing: border-box;
            transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .login-box input:focus {
            outline: none;
            background: var(--card);
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-ring);
        }
        .login-box button {
            width: 100%;
            padding: 14px;
            background: var(--aurora-grad);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-weight: 600;
            font-size: var(--text-headline);
            min-height: 44px;
            letter-spacing: 0.02em;
            box-shadow: 0 10px 24px -6px var(--primary-glow);
            transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .login-box button:hover { transform: translateY(-1px); box-shadow: 0 14px 28px -6px var(--primary-glow); }
        .login-foot {
            display: block;
            margin-top: var(--space-5);
            font-size: var(--text-xs);
            color: var(--text-sec);
            line-height: 1.6;
            opacity: 0.7;
        }

        /* On phone, show the eyebrow / sub / foot copy and drop the boxed card */
        @media (max-width: 768px) {
            .login-eyebrow, .login-sub, .login-foot { display: block; }

            /* === iOS-native login v5 (v2.4.0) === */
            body.login-body {
                background: linear-gradient(180deg, var(--bg) 0%, var(--card) 100%) !important;
                align-items: stretch !important;
                justify-content: flex-start !important;
            }
            body.login-body .login-box {
                padding: 80px 24px 120px !important;
                background: transparent !important;
                box-shadow: none !important;
                max-width: 100% !important;
                text-align: left !important;
            }
            body.login-body .login-logo {
                width: 72px !important;
                height: 72px !important;
                border-radius: var(--radius-2xl) !important;
                margin: 0 0 32px !important;
                box-shadow: 0 14px 32px -8px var(--primary-glow);
            }
            body.login-body .login-logo svg {
                width: 34px !important;
                height: 34px !important;
            }
            body.login-body .login-eyebrow {
                font-size: var(--text-xs) !important;
                font-weight: 700 !important;
                color: var(--text-sec);
                letter-spacing: 0.10em;
                text-transform: uppercase;
                margin-bottom: var(--space-2) !important;
            }
            body.login-body .login-box h2 {
                margin: 0 0 var(--space-2) 0 !important;
                font-size: var(--text-large-title) !important;
                font-weight: 700 !important;
                letter-spacing: -0.025em !important;
                text-align: left !important;
                color: var(--text);
            }
            body.login-body .login-sub {
                font-size: var(--text-headline) !important;
                line-height: 1.45;
                color: var(--text-sec);
                margin: 0 0 36px 0 !important;
            }
            body.login-body .login-box input {
                background: var(--card) !important;
                border: 0.5px solid var(--hairline) !important;
                border-radius: var(--radius-ios-sm) !important;
                padding: 18px var(--space-4) !important;
                font-size: var(--text-headline) !important;
                margin-bottom: var(--space-3) !important;
            }
            body.login-body .login-box button {
                position: fixed !important;
                left: var(--space-4);
                right: var(--space-4);
                bottom: max(env(safe-area-inset-bottom), var(--space-4));
                width: auto !important;
                padding: 18px !important;
                font-size: var(--text-headline) !important;
                border-radius: var(--radius-ios-sm) !important;
                background: var(--aurora-grad) !important;
                box-shadow: 0 14px 32px -8px var(--primary-glow);
                letter-spacing: 0.04em;
                z-index: 2;
            }
            body.login-body .login-foot {
                position: fixed !important;
                bottom: calc(max(env(safe-area-inset-bottom), var(--space-4)) + 76px);
                left: 0; right: 0;
                text-align: center !important;
                color: var(--text-sec) !important;
                font-size: var(--text-xs) !important;
                line-height: 1.6;
                opacity: 0.55;
            }
        }
    </style>
</head>
<body class="login-body">
    <div id="toast"></div>
    <div class="login-box">
        <div class="login-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div class="login-eyebrow">反代核心 · 安全中心</div>
        <h2>欢迎回来</h2>
        <p class="login-sub">输入管理员密钥继续。<br>未授权访问将被自动拒绝并记录。</p>
        <input type="password" id="tokenInput" placeholder="请输入密钥 TOKEN" onkeydown="if(event.key==='Enter') login()">
        <button onclick="login()">验 证 登 录</button>
        <div class="login-foot">v${CURRENT_VERSION} · Cloudflare Worker<br>仅供学习与技术测试使用</div>
    </div>
    <script>
        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2000);
        }
        function login() {
            const token = document.getElementById('tokenInput').value.trim();
            if(!token) return showToast('请输入正确的密钥');
            document.cookie = 'admin_token=' + encodeURIComponent(token) + '; path=/; max-age=2592000;';
            window.location.reload();
        }
    </script>
</body>
</html>
`;

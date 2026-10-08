import { CSS_HREF } from './asset-manifest.js';
import { CURRENT_VERSION } from '../util/version.js';
import { FAVICON, THEME_BOOT } from './head.js';

export const LOGIN_UI = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>登录 · Emby Proxy</title>
    ${THEME_BOOT}
    ${FAVICON}
    <link rel="stylesheet" href="${CSS_HREF}">
</head>
<body class="login">
    <main class="login-box">
        <div class="brand"><i aria-hidden="true"></i>Emby Proxy</div>
        <h1>管理员登录</h1>
        <form id="loginForm" novalidate>
            <label class="field">
                <span>管理员密钥</span>
                <input type="password" id="tokenInput" autocomplete="current-password" aria-describedby="tokenError" autofocus>
            </label>
            <p class="field-err" id="tokenError" role="alert" hidden></p>
            <button type="submit" class="btn pri block">登录</button>
        </form>
        <div class="login-foot muted num">v${CURRENT_VERSION}</div>
    </main>
    <script>
        var input = document.getElementById('tokenInput');
        var err = document.getElementById('tokenError');
        function showError(msg) {
            err.textContent = msg;
            err.hidden = false;
            input.setAttribute('aria-invalid', 'true');
            input.focus();
        }
        document.getElementById('loginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var token = input.value.trim();
            if (!token) return showError('请输入管理员密钥');
            // A wrong key re-serves this page, so this marker surviving the reload is the only failure signal.
            try { sessionStorage.setItem('emby_login_attempted', '1'); } catch (x) {}
            // Secure only over https so local HTTP dev works. HttpOnly needs a Set-Cookie header, not JS.
            document.cookie = 'admin_token=' + encodeURIComponent(token)
                + '; path=/; max-age=2592000; SameSite=Strict'
                + (location.protocol === 'https:' ? '; Secure' : '');
            location.reload();
        });
        try {
            if (sessionStorage.getItem('emby_login_attempted')) {
                sessionStorage.removeItem('emby_login_attempted');
                showError('密钥不正确，请重试');
            }
        } catch (x) {}
        input.addEventListener('input', function () {
            input.removeAttribute('aria-invalid');
            err.hidden = true;
        });
    </script>
</body>
</html>
`;

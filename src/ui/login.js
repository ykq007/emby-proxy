import { CSS_HREF } from './asset-manifest.js';
import { CURRENT_VERSION } from '../util/version.js';

export const LOGIN_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Emby Proxy · 登录</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%230a64e0'/%3E%3Cpolygon points='13 4 6 13.5 11.5 13.5 10.5 20 18 10.5 12.5 10.5 13 4' fill='%23fff'/%3E%3C/svg%3E">
    <link rel="stylesheet" href="${CSS_HREF}">
    <style>
        /* === Split-screen login — Aqua ==============================
           Same two-panel structure, rebuilt on the shared token layer:
           no noise, no sweep, no grid. The brand panel is a material
           over the app background, and the only motion is one restrained
           entrance. See DESIGN.md.
           ============================================================ */
        *, *::before, *::after { box-sizing: border-box; }
        body.login-body {
            display: flex; margin: 0; padding: 0;
            min-height: 100vh; min-height: 100dvh;
            background: var(--bg); overflow: hidden;
        }

        /* ── Brand panel (left 42%) ─────────────────────────────── */
        .forge-brand {
            flex: 0 0 42%;
            position: relative;
            background: var(--sidebar-bg);
            border-right: 1px solid var(--hairline);
            overflow: hidden;
            display: flex; align-items: flex-end;
            padding: 56px 52px;
            /* The panel used to slide the full width of itself on every
               load. It now materialises in place: a large surface moving
               across the viewport is the exact motion reduced-motion
               users are protecting themselves from. */
            animation: brand-in var(--dur-spring) var(--spring-smooth) backwards;   /* 不留 fill：结束后的 transform 动画仍会被算进可滚动宽度 */
        }
        @keyframes brand-in {
            from { opacity: 0; transform: scale(1.01); }
            to   { opacity: 1; transform: scale(1); }
        }

        /* Brand wordmark */
        .forge-wordmark { position: relative; z-index: 3; }
        .forge-wordmark .wordmark-text {
            display: block;
            font-size: clamp(56px, 7vw, 96px); font-weight: 700;
            /* Display type wants NEGATIVE tracking — the old 0.15em pushed
               96px letters apart at exactly the size they already read as
               too loose. */
            letter-spacing: var(--tracking-large);
            line-height: var(--leading-large);
            color: var(--text);
            overflow-wrap: anywhere;
        }
        .forge-wordmark .wordmark-sub {
            display: block; margin-top: 12px;
            font-family: var(--font-mono); font-size: var(--text-xs);
            letter-spacing: var(--tracking-label); text-transform: uppercase;
            color: var(--text-sec);
        }

        /* ── Form panel (right 58%) ─────────────────────────────── */
        .forge-form-panel {
            flex: 1;
            display: flex; flex-direction: column;
            justify-content: center;
            padding: 56px 64px;
            background: var(--bg);
            animation: form-enter var(--dur-spring) var(--spring-smooth) 120ms backwards;
        }
        @keyframes form-enter {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .forge-inner { max-width: 340px; }

        .forge-title {
            margin: 0 0 6px;
            font-size: 24px; font-weight: 600;
            color: var(--text);
            letter-spacing: var(--tracking-title);
            line-height: var(--leading-title);
        }
        .forge-sub {
            margin: 0 0 36px;
            font-size: var(--text-base); color: var(--text-sec);
            line-height: var(--leading-body);
        }

        /* Form */
        .forge-fields { display: flex; flex-direction: column; gap: var(--space-3); }

        .input-group { position: relative; display: flex; align-items: center; }
        .input-icon {
            position: absolute; left: var(--space-4); width: 18px; height: 18px;
            stroke: var(--text-sec); pointer-events: none;
            transition: stroke var(--dur-micro) ease;
        }
        .input-group:focus-within .input-icon { stroke: var(--primary); }

        .forge-fields input[type=password] {
            width: 100%; padding: 15px 16px 15px 48px;
            border: 1px solid var(--border); border-radius: var(--radius-lg);
            background: var(--surface); color: var(--text);
            font-family: var(--font-mono); font-size: var(--text-xl); letter-spacing: 0.08em;
            transition: border-color var(--dur-micro) ease, box-shadow var(--dur-micro) ease;
        }
        .forge-fields input::placeholder {
            /* --text-ter is 3.6:1 on --card — below AA, and PRODUCT.md
               requires placeholders to pass too. --text-sec is 6.2:1/8.0:1. */
            color: var(--text-sec);
            letter-spacing: var(--tracking-body); font-family: var(--font-sans); font-size: var(--text-base);
        }
        /* A defined focus ring, not a glow: the ring states the focus, the
           glow only decorated it. */
        .forge-fields input:focus {
            outline: none; border-color: var(--primary); background: var(--card);
            box-shadow: 0 0 0 4px var(--primary-ring);
        }
        /* 错误态：红框 + 红色光圈，替换而不是叠在蓝色焦点环上 */
        .forge-fields input[aria-invalid="true"],
        .forge-fields input[aria-invalid="true"]:focus { border-color: var(--err); box-shadow: 0 0 0 4px var(--err-ring); }
        /* 错误就写在输入框下面：出错的地方就是看的地方 */
        .forge-error {
            display: flex; align-items: center; gap: var(--space-1-5);
            margin: 0; font-size: var(--text-sm); color: var(--err-text);
        }
        .forge-error[hidden] { display: none; }
        .forge-error svg { width: 14px; height: 14px; flex-shrink: 0; }

        .forge-btn {
            display: flex; align-items: center; justify-content: center; gap: var(--space-2);
            width: 100%; padding: 15px; min-height: var(--touch-min);
            background: var(--btn-fill);
            color: var(--on-primary); border: none; border-radius: var(--radius-lg);
            cursor: pointer; font-weight: 600;
            font-size: var(--text-lg); font-family: var(--font-sans);
            letter-spacing: var(--tracking-headline);
            transition: background-color var(--dur-micro) ease, transform var(--dur-press) ease-out;
        }
        .forge-btn svg { width: 18px; height: 18px; }
        @media (hover: hover) and (pointer: fine) {
            .forge-btn:hover { background: var(--btn-fill-hover); }
        }
        .forge-btn:active { transform: scale(0.97); }
        .forge-btn:focus-visible { outline: none; box-shadow: 0 0 0 4px var(--primary-ring); }

        /* Footer */
        .forge-footer {
            display: flex; align-items: center; gap: var(--space-2);
            margin-top: 32px;
            font-family: var(--font-mono); font-size: var(--text-xs);
            color: var(--text-sec);
            font-variant-numeric: tabular-nums;
        }
        /* Static status dot. It used to pulse on a 2.4s loop, reporting
           nothing — exactly the slow decorative oscillation DESIGN.md bans
           (same reason the 8s login sweep went). */
        .live-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--ok);
            flex-shrink: 0;
        }

        /* ── Mobile (≤768px): brand becomes top strip ──────────── */
        @media (max-width: 768px) {
            body.login-body { flex-direction: column; overflow-y: auto; }

            .forge-brand {
                flex: 0 0 25vh; min-height: 160px;
                align-items: flex-end; padding: 24px 28px;
                border-right: none; border-bottom: 1px solid var(--hairline);
            }
            .forge-wordmark .wordmark-sub  { font-size: var(--text-2xs); margin-top: 6px; }

            .forge-form-panel {
                flex: 1; padding: 36px 28px;
                justify-content: flex-start;
            }
            .forge-inner { max-width: 100%; }
        }

        /* ── Reduced motion ─────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
            .forge-brand      { animation: none; }
            .forge-form-panel { animation: none; opacity: 1; }
        }
    </style>
</head>
<body class="login-body">
    <script>/* dark-first: resolve saved/system theme before paint to match the console */
    (function(){try{var legacy=localStorage.getItem('emby_proxy_dark');if(legacy!==null&&!localStorage.getItem('emby_theme')){localStorage.setItem('emby_theme',legacy==='1'?'dark':'light');}var p=localStorage.getItem('emby_theme')||'auto';var d=p==='dark'||(p==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.body.classList.add('dark');}catch(e){}})();</script>

    <!-- Brand panel — NOT aria-hidden: this is the only text naming the
         system being authenticated to. -->
    <aside class="forge-brand">
        <div class="forge-wordmark">
            <span class="wordmark-text">Emby Proxy</span>
            <span class="wordmark-sub">反向代理控制台</span>
        </div>
    </aside>

    <!-- Form panel -->
    <main class="forge-form-panel">
        <div class="forge-inner">
            <h1 class="forge-title">身份验证</h1>
            <p class="forge-sub">输入管理员密钥以验证身份</p>

            <form class="forge-fields" onsubmit="event.preventDefault(); login();">
                <div class="input-group">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                    <input type="password" id="tokenInput" autocomplete="current-password" placeholder="密钥" aria-label="管理员密钥" aria-describedby="tokenError">
                </div>
                <p class="forge-error" id="tokenError" role="alert" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span id="tokenErrorText"></span></p>
                <button type="submit" class="forge-btn">
                    <span>进入</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
            </form>

            <div class="forge-footer">
                <span class="live-dot" aria-hidden="true"></span>
                <span>TLS · v${CURRENT_VERSION}</span>
            </div>
        </div>
    </main>

    <script>
        const tokenInput = document.getElementById('tokenInput');
        const tokenError = document.getElementById('tokenError');
        function showFieldError(msg) {
            document.getElementById('tokenErrorText').textContent = msg;
            tokenError.hidden = false;
            tokenInput.setAttribute('aria-invalid', 'true');
            tokenInput.focus();
        }
        function login() {
            const token = tokenInput.value.trim();
            if(!token) return showFieldError('请输入管理员密钥');
            // A wrong key just re-serves this page, so the marker surviving the
            // reload is the only signal that the attempt failed.
            try { sessionStorage.setItem('emby_login_attempted', '1'); } catch(e) {}
            // HttpOnly is impossible from JS — a Set-Cookie response header is
            // the real fix. Secure only over https so local HTTP dev works.
            document.cookie = 'admin_token=' + encodeURIComponent(token)
                + '; path=/; max-age=2592000; SameSite=Strict'
                + (location.protocol === 'https:' ? '; Secure' : '');
            window.location.reload();
        }
        try {
            if (sessionStorage.getItem('emby_login_attempted')) {
                sessionStorage.removeItem('emby_login_attempted');
                showFieldError('密钥不正确，请重试');
            }
        } catch(e) {}
        tokenInput.addEventListener('input', () => {
            tokenInput.removeAttribute('aria-invalid');
            tokenError.hidden = true;
        });
    </script>
</body>
</html>
`;

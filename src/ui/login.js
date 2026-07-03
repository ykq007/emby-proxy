import { CSS_HREF } from './asset-manifest.js';
import { CURRENT_VERSION } from '../util/version.js';

export const LOGIN_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>控制台登录</title>
    <link rel="stylesheet" href="${CSS_HREF}">
    <style>
        /* === Forge · Split-Screen Login ============================= */
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
            background: var(--sidebar-bg, oklch(15% 0.02 75));
            overflow: hidden;
            display: flex; align-items: flex-end;
            padding: 56px 52px;
            animation: brand-slide 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes brand-slide {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
        }

        /* Hairline divider */
        .forge-brand::after {
            content: ''; position: absolute;
            top: 0; right: 0; bottom: 0; width: 1px;
            background: color-mix(in oklch, var(--primary) 22%, transparent);
            z-index: 10;
        }

        /* Subtle grid pattern */
        .forge-brand::before {
            content: ''; position: absolute; inset: 0;
            background-image:
                linear-gradient(color-mix(in oklch, var(--primary) 5%, transparent) 1px, transparent 1px),
                linear-gradient(90deg, color-mix(in oklch, var(--primary) 5%, transparent) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: 0;
        }

        /* Noise texture overlay */
        .forge-noise {
            position: absolute; inset: 0; z-index: 1; pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
            background-repeat: repeat; background-size: 200px 200px;
            opacity: 0.5;
        }

        /* Golden sweep line */
        .forge-sweep {
            position: absolute; z-index: 2; pointer-events: none;
            top: 50%; left: 0;
            width: 120px; height: 2px;
            background: linear-gradient(90deg, transparent, var(--primary), transparent);
            filter: blur(1px);
            transform-origin: left center;
            animation: forge-sweep 8s linear infinite;
        }
        @keyframes forge-sweep {
            0%   { transform: translateX(-200%) translateY(-50%) rotate(-35deg); }
            100% { transform: translateX(400%) translateY(-50%) rotate(-35deg); }
        }

        /* Brand wordmark */
        .forge-wordmark {
            position: relative; z-index: 3;
        }
        .forge-wordmark .wordmark-text {
            display: block;
            font-size: 96px; font-weight: 700;
            letter-spacing: 0.15em;
            color: var(--primary);
            line-height: 1;
            text-shadow: 0 0 60px color-mix(in oklch, var(--primary) 40%, transparent);
        }
        .forge-wordmark .wordmark-sub {
            display: block; margin-top: 12px;
            font-family: var(--font-mono); font-size: 11px;
            letter-spacing: 0.2em; text-transform: uppercase;
            color: color-mix(in oklch, var(--text-sec) 60%, transparent);
        }

        /* ── Form panel (right 58%) ─────────────────────────────── */
        .forge-form-panel {
            flex: 1;
            display: flex; flex-direction: column;
            justify-content: center;
            padding: 56px 64px;
            background: var(--bg);
            animation: form-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        @keyframes form-enter {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .forge-inner {
            max-width: 340px;
        }

        .forge-title {
            margin: 0 0 6px;
            font-size: 24px; font-weight: 600;
            color: var(--text); letter-spacing: -0.01em;
        }
        .forge-sub {
            margin: 0 0 36px;
            font-size: var(--text-sm); color: var(--text-sec);
            line-height: 1.5;
        }

        /* Form */
        .forge-fields { display: flex; flex-direction: column; gap: var(--space-3); }

        .input-group {
            position: relative; display: flex; align-items: center;
        }
        .input-icon {
            position: absolute; left: var(--space-4); width: 18px; height: 18px;
            stroke: var(--text-sec); pointer-events: none;
            transition: stroke 0.25s ease;
        }
        .input-group:focus-within .input-icon { stroke: var(--primary); }

        .forge-fields input[type=password] {
            width: 100%; padding: 15px 16px 15px 48px;
            border: 1px solid var(--border); border-radius: var(--radius-lg);
            background: var(--surface); color: var(--text);
            font-family: var(--font-mono); font-size: var(--text-xl); letter-spacing: 0.08em;
            transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        }
        .forge-fields input::placeholder {
            color: var(--text-sec); opacity: 0.5;
            letter-spacing: 0; font-family: var(--font-sans); font-size: var(--text-base);
        }
        .forge-fields input:focus {
            outline: none; border-color: var(--primary); background: var(--card);
            box-shadow: 0 0 0 3px var(--primary-ring), 0 0 20px var(--primary-glow);
        }

        .forge-btn {
            display: flex; align-items: center; justify-content: center; gap: var(--space-2);
            width: 100%; padding: 15px; min-height: var(--touch-min);
            background: linear-gradient(135deg, var(--btn-fill) 0%, color-mix(in oklch, var(--btn-fill) 85%, oklch(80% 0.12 55)) 100%);
            color: var(--on-primary); border: none; border-radius: 6px;
            cursor: pointer; font-weight: 650;
            font-size: var(--text-lg); font-family: var(--font-sans);
            transition: filter 0.2s ease, transform 0.15s ease, box-shadow 0.25s ease;
        }
        .forge-btn svg { width: 18px; height: 18px; transition: transform 0.2s ease; }
        .forge-btn:hover {
            filter: brightness(1.1);
            box-shadow: 0 6px 24px var(--primary-glow);
        }
        .forge-btn:hover svg { transform: translateX(3px); }
        .forge-btn:active { transform: scale(0.97); }
        .forge-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--primary-ring); }

        /* Footer */
        .forge-footer {
            display: flex; align-items: center; gap: var(--space-2);
            margin-top: 32px;
            font-family: var(--font-mono); font-size: var(--text-xs);
            color: var(--text-sec); opacity: 0.55;
            font-variant-numeric: tabular-nums;
        }
        .live-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--ok); box-shadow: 0 0 6px var(--ok);
            animation: nx-breathe 3s ease-in-out infinite;
            flex-shrink: 0;
        }
        @keyframes nx-breathe {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%       { transform: scale(1.5); opacity: 0.6; }
        }

        /* ── Mobile (≤768px): brand becomes top strip ──────────── */
        @media (max-width: 768px) {
            body.login-body { flex-direction: column; overflow-y: auto; }

            .forge-brand {
                flex: 0 0 25vh; min-height: 160px;
                align-items: flex-end; padding: 24px 28px;
            }
            .forge-brand::after {
                top: auto; right: 0; bottom: 0; left: 0;
                width: auto; height: 1px;
            }
            .forge-wordmark .wordmark-text { font-size: 56px; }
            .forge-wordmark .wordmark-sub  { font-size: 10px; margin-top: 6px; }

            .forge-form-panel {
                flex: 1; padding: 36px 28px;
                justify-content: flex-start;
            }
            .forge-inner { max-width: 100%; }
        }

        /* ── Reduced motion ─────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
            .forge-brand    { animation: none; }
            .forge-form-panel { animation: none; opacity: 1; }
            .forge-sweep    { animation: none; display: none; }
            .live-dot       { animation: none; }
        }
    </style>
</head>
<body class="login-body">
    <script>/* dark-first: resolve saved/system theme before paint to match the console */
    (function(){try{var legacy=localStorage.getItem('emby_proxy_dark');if(legacy!==null&&!localStorage.getItem('emby_theme')){localStorage.setItem('emby_theme',legacy==='1'?'dark':'light');}var p=localStorage.getItem('emby_theme')||'auto';var d=p==='dark'||(p==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.body.classList.add('dark');}catch(e){}})();</script>
    <div id="toast"></div>

    <!-- Brand panel -->
    <aside class="forge-brand" aria-hidden="true">
        <div class="forge-noise"></div>
        <div class="forge-sweep"></div>
        <div class="forge-wordmark">
            <span class="wordmark-text">EMBY</span>
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
                    <input type="password" id="tokenInput" autocomplete="current-password" placeholder="密钥" aria-label="管理员密钥">
                </div>
                <button type="submit" class="forge-btn">
                    <span>进入</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
            </form>

            <div class="forge-footer">
                <span class="live-dot" aria-hidden="true"></span>
                <span>TLS · v${CURRENT_VERSION}</span>
                <span id="clock">--:--</span>
            </div>
        </div>
    </main>

    <script>
        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2000);
        }
        function login() {
            const token = document.getElementById('tokenInput').value.trim();
            if(!token) return showToast('请输入管理员密钥');
            document.cookie = 'admin_token=' + encodeURIComponent(token) + '; path=/; max-age=2592000;';
            window.location.reload();
        }
        (function clock(){
            const el = document.getElementById('clock');
            const tick = () => { const d = new Date();
                el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
                    .map(n => String(n).padStart(2,'0')).join(':'); };
            tick(); setInterval(tick, 1000);
        })();
    </script>
</body>
</html>
`;

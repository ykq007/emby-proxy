// VERSION: 2.0.6
// 🟢 面板核心配置区 (放在最顶端方便修改)
const CURRENT_VERSION = "2.0.6";
const GITHUB_RAW_URL = "这里填下你的在线更新地址";

// ==========================================
// 1. 网页界面-单播报版本
// ==========================================

const SVG_EYE = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
const SVG_COPY = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
const SVG_TG = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;margin-right:8px;fill:#0088cc;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/></svg>`;

const CSS_COMMON = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

    :root {
        color-scheme: light;
        --bg: #fff7ee;
        --bg-2: #fff0db;
        --bg-3: #ffe2c2;
        --card: rgba(255, 252, 246, 0.88);
        --card-strong: rgba(255, 248, 236, 0.98);
        --text: #1f1724;
        --text-sec: #6f6474;
        --muted: #8d8194;
        --border: rgba(122, 86, 66, 0.16);
        --shadow: 0 12px 32px rgba(124, 92, 74, 0.10), 0 2px 8px rgba(124, 92, 74, 0.05);
        --shadow-hover: 0 22px 44px rgba(124, 92, 74, 0.16), 0 8px 18px rgba(124, 92, 74, 0.08);
        --primary: #e85d39;
        --primary-hover: #d84c27;
        --primary-2: #ffb057;
        --accent: #45b48e;
        --mint: #dff5ea;
        --gold: #f6c85f;
        --rose: #f5b2b3;
        --input-bg: rgba(255, 248, 239, 0.96);
        --chip-bg: rgba(255, 255, 255, 0.7);
        --ring: rgba(232, 93, 57, 0.18);
        --glass: rgba(255, 255, 255, 0.45);
    }

    body.dark {
        color-scheme: dark;
        --bg: #141018;
        --bg-2: #1a1320;
        --bg-3: #231925;
        --card: rgba(28, 22, 35, 0.88);
        --card-strong: rgba(34, 26, 42, 0.96);
        --text: #f7f0ff;
        --text-sec: #b8adbf;
        --muted: #93889f;
        --border: rgba(255, 224, 198, 0.10);
        --shadow: 0 14px 42px rgba(0, 0, 0, 0.34), 0 2px 8px rgba(0, 0, 0, 0.20);
        --shadow-hover: 0 24px 56px rgba(0, 0, 0, 0.42), 0 10px 24px rgba(0, 0, 0, 0.24);
        --primary: #ff8d6a;
        --primary-hover: #ff7a53;
        --primary-2: #ffc15c;
        --accent: #68d1ab;
        --mint: rgba(60, 99, 79, 0.22);
        --gold: #f7d06c;
        --rose: rgba(182, 78, 92, 0.30);
        --input-bg: rgba(43, 34, 51, 0.96);
        --chip-bg: rgba(255, 255, 255, 0.06);
        --ring: rgba(255, 141, 106, 0.22);
        --glass: rgba(255, 255, 255, 0.04);
    }

    * { box-sizing: border-box; touch-action: manipulation; }

    html { scroll-behavior: smooth; }

    body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        background:
            radial-gradient(circle at top left, rgba(255, 165, 102, 0.20), transparent 30%),
            radial-gradient(circle at top right, rgba(69, 180, 142, 0.18), transparent 28%),
            linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
        color: var(--text);
        font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-text-size-adjust: 100%;
        transition: background-color 0.35s ease, color 0.25s ease;
        position: relative;
        overflow-x: hidden;
    }

    body.app-page::before,
    body.app-page::after {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
    }

    body.app-page::before {
        background:
            linear-gradient(120deg, rgba(255,255,255,0.16), transparent 34%),
            linear-gradient(240deg, rgba(232,93,57,0.05), transparent 28%),
            radial-gradient(circle at 15% 20%, rgba(255, 176, 87, 0.13), transparent 20%),
            radial-gradient(circle at 85% 12%, rgba(69, 180, 142, 0.12), transparent 18%);
        mix-blend-mode: screen;
        opacity: 0.75;
    }

    body.app-page::after {
        background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 28px 28px;
        opacity: 0.22;
    }

    body.login-page {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 20px;
    }

    .container {
        max-width: 1440px;
        margin: 0 auto;
        width: 100%;
        position: relative;
        z-index: 1;
    }

    .page-shell {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .content-wrap {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 18px;
    }

    .content-wrap > .header,
    .content-wrap > .card,
    .content-wrap > .shelf {
        min-width: 0;
    }

    .header,
    .card,
    .emby-card,
    .login-box,
    #dashboardModal .card {
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        background: var(--card);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
    }

    .header.hero-shell {
        grid-column: 1 / -1;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        padding: 28px;
        border-radius: 28px;
        background:
            radial-gradient(circle at top left, rgba(255, 176, 87, 0.18), transparent 26%),
            radial-gradient(circle at top right, rgba(69, 180, 142, 0.14), transparent 24%),
            linear-gradient(135deg, var(--card-strong), var(--glass));
        position: relative;
        overflow: hidden;
    }

    .header.hero-shell::after {
        content: '';
        position: absolute;
        inset: auto -24px -42px auto;
        width: 220px;
        height: 220px;
        background: radial-gradient(circle, rgba(232, 93, 57, 0.18), transparent 68%);
        pointer-events: none;
    }

    .header.hero-shell h1 {
        margin: 0;
        font-size: clamp(24px, 3vw, 36px) !important;
        line-height: 1.1;
        letter-spacing: -0.03em;
        font-family: 'Fraunces', 'Outfit', serif;
    }

    .header.hero-shell .actions-wrapper {
        justify-content: flex-end;
    }

    .header.hero-shell .btn-submit {
        border-radius: 999px;
        padding-inline: 18px;
    }

    .card,
    .login-box {
        border-radius: 24px;
    }

    .shelf {
        grid-column: span 6;
        padding: 22px;
        position: relative;
        overflow: hidden;
        background:
            linear-gradient(180deg, rgba(255,255,255,0.04), transparent 34%),
            var(--card);
    }

    .shelf::before {
        content: '';
        position: absolute;
        inset: 0 auto auto 0;
        height: 4px;
        width: 100%;
        background: linear-gradient(90deg, var(--primary), var(--primary-2), var(--accent));
        opacity: 0.86;
    }

    #updateAlert,
    #cf-trace-card,
    .shelf:has(#dnsStatus),
    .shelf:has(#addForm),
    .shelf:has(#list-grid) {
        grid-column: 1 / -1;
    }

    .shelf:has(#cf-mode-select),
    .shelf:has(#codeArea) {
        grid-column: span 6;
    }

    .shelf:hover,
    .emby-card:hover,
    .login-box:hover {
        box-shadow: var(--shadow-hover);
    }

    input, select, button, textarea {
        font-family: inherit;
        outline: none;
        font-size: 14px;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
    }

    input:focus, select:focus, textarea:focus {
        border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
        box-shadow: 0 0 0 4px var(--ring);
    }

    textarea, input[type='text'], input[type='password'], input[type='url'], select {
        width: 100%;
        min-height: 44px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: var(--input-bg);
        color: var(--text);
        padding: 12px 14px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    }

    textarea { resize: vertical; line-height: 1.55; }

    ::placeholder { color: var(--muted); }

    .toolbar {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 20px;
        align-items: center;
    }

    .btn-submit,
    .btn-edit,
    .btn-del,
    .btn-dns,
    .icon-btn {
        border: none;
        cursor: pointer;
        font-weight: 600;
        white-space: nowrap;
    }

    .btn-submit {
        min-height: 44px;
        padding: 10px 18px;
        border-radius: 14px;
        color: white;
        background: linear-gradient(135deg, var(--primary), var(--primary-hover));
        box-shadow: 0 10px 22px rgba(232, 93, 57, 0.22);
    }

    .btn-submit:hover { transform: translateY(-1px); }
    .btn-submit:active { transform: translateY(0) scale(0.98); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .btn-edit,
    .btn-del,
    .btn-dns,
    .icon-btn {
        min-height: 36px;
        border-radius: 12px;
        padding: 8px 12px;
        color: var(--text);
        background: var(--chip-bg);
        border: 1px solid var(--border);
    }

    .btn-edit { color: var(--accent); }
    .btn-del { color: #ff6a63; }
    .btn-dns { color: var(--primary); }

    .btn-edit:hover,
    .btn-del:hover,
    .btn-dns:hover,
    .icon-btn:hover {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
    }

    .icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        width: 32px;
        height: 32px;
        background: transparent;
    }

    .table-wrapper {
        width: 100%;
        border-radius: 20px;
        border: 1px solid var(--border);
        overflow: hidden;
        background: var(--card-strong);
        box-shadow: var(--shadow);
    }

    table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
    }

    th, td {
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        font-size: 14px;
        vertical-align: middle;
    }

    th {
        color: var(--text-sec);
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent);
        white-space: nowrap;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: color-mix(in srgb, var(--primary) 5%, transparent); }

    .badge,
    .ping-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 28px;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--chip-bg);
        color: var(--text);
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
    }

    .ping-badge {
        background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--primary) 12%, transparent));
        color: var(--accent);
    }

    .badge strong,
    .ping-badge strong { font-family: 'Outfit', sans-serif; }

    .flex-responsive {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
    }

    .w-full-mobile { width: auto; }

    .action-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        padding: 10px 12px;
        border-radius: 16px;
        background: color-mix(in srgb, var(--input-bg) 90%, transparent);
        border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
    }

    .info-label {
        color: var(--text-sec);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
    }

    .secret-text,
    .dynamic-url {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        color: var(--text);
        word-break: break-all;
    }

    .dynamic-url {
        background: var(--input-bg);
        border: 1px dashed var(--border);
        border-radius: 999px;
        padding: 6px 10px;
    }

    .drag-handle {
        cursor: grab;
        user-select: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        color: var(--text-sec);
        background: var(--chip-bg);
        border: 1px solid var(--border);
    }

    .emby-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px;
        border-radius: 26px;
        background:
            radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 26%),
            linear-gradient(180deg, color-mix(in srgb, var(--card-strong) 92%, transparent), var(--card));
        position: relative;
        overflow: hidden;
    }

    .emby-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .card-header,
    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .card-title-group {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .card-footer {
        padding-top: 4px;
        border-top: 1px solid var(--border);
    }

    .emby-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: 16px;
        background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, transparent), color-mix(in srgb, var(--accent) 12%, transparent));
        border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
    }

    .node-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
        gap: 16px;
    }

    .route-item {
        min-height: 100%;
    }

    .route-item .poster-shell {
        display: grid;
        grid-template-columns: minmax(74px, 112px) minmax(0, 1fr);
        gap: 14px;
        align-items: stretch;
    }

    .route-item .poster-visual {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px;
        border-radius: 22px;
        background:
            radial-gradient(circle at top, rgba(255,255,255,0.10), transparent 56%),
            linear-gradient(180deg, color-mix(in srgb, var(--primary) 18%, transparent), color-mix(in srgb, var(--accent) 14%, transparent));
        border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
    }

    .route-item .poster-band {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .route-item .poster-art {
        width: 100%;
        min-height: 120px;
        padding: 14px;
        border-radius: 20px;
        background:
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.28), transparent 28%),
            linear-gradient(135deg, rgba(232,93,57,0.95), rgba(255,176,87,0.85) 48%, rgba(69,180,142,0.82));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
    }

    .route-item .poster-art img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 14px;
    }

    .route-item .poster-copy {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }

    .route-item .poster-title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.15;
        word-break: break-word;
    }

    .route-item .poster-subtitle {
        font-size: 12px;
        color: var(--text-sec);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .route-item .poster-strip {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .route-item .strip-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        padding: 7px 10px;
        border-radius: 999px;
        background: var(--chip-bg);
        border: 1px solid var(--border);
        font-size: 12px;
        color: var(--text-sec);
    }

    .route-item .strip-chip strong {
        color: var(--text);
        font-weight: 700;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .route-item .poster-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
    }

    .route-item .poster-actions {
        gap: 10px;
        justify-content: flex-end;
    }

    .route-item .poster-actions .btn-edit,
    .route-item .poster-actions .btn-del {
        min-width: 76px;
    }

    .search-input {
        min-width: 180px;
    }

    .icon-item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--chip-bg);
        cursor: pointer;
        transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .icon-item:hover {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
        box-shadow: 0 8px 16px rgba(0,0,0,0.08);
    }

    .url-list-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 14px;
        background: var(--input-bg);
        border: 1px solid var(--border);
    }

    #toast {
        position: fixed;
        top: -80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(24, 18, 31, 0.95);
        color: #fff7ee;
        padding: 12px 18px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 600;
        transition: top 0.36s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease;
        z-index: 9999;
        box-shadow: 0 18px 32px rgba(0,0,0,0.22);
        text-align: center;
        max-width: min(92vw, 720px);
        word-wrap: break-word;
    }

    body.dark #toast {
        background: rgba(247, 240, 255, 0.96);
        color: #22192a;
    }

    #toast.show { top: 18px; }

    #dashboardModal {
        background: rgba(20, 16, 24, 0.62) !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 20px !important;
    }

    #dashboardModal .card {
        max-width: 1120px;
        margin: 28px auto;
        background: var(--card-strong);
        border-radius: 28px;
        padding: 22px;
    }

    #dashboardModal h2 {
        letter-spacing: -0.02em;
    }

    #dashboardModal canvas {
        max-width: 100%;
    }

    .actual-text {
        font-size: 12px;
        color: var(--text-sec);
    }

    .ip-checkbox {
        accent-color: var(--primary);
        width: 16px;
        height: 16px;
    }

    .node-grid .route-item,
    .route-item {
        transform: translateY(0);
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .route-item:hover {
        transform: translateY(-2px);
    }

    .sortable-ghost {
        opacity: 0.5;
    }

    .sortable-drag {
        transform: rotate(1deg);
        box-shadow: var(--shadow-hover);
    }

    .w-full-mobile { max-width: none; }

    @media (max-width: 1180px) {
        .content-wrap { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .header.hero-shell { padding: 22px; }
    }

    @media (max-width: 900px) {
        body { padding: 16px; }
        .content-wrap,
        .shell-grid {
            grid-template-columns: 1fr;
        }
        .header.hero-shell {
            flex-direction: column;
        }
        .header.hero-shell .actions-wrapper {
            width: 100%;
            justify-content: flex-start;
        }
        .shelf,
        .header.hero-shell,
        #updateAlert,
        #cf-trace-card,
        .shelf:has(#dnsStatus),
        .shelf:has(#addForm),
        .shelf:has(#list-grid),
        .shelf:has(#cf-mode-select),
        .shelf:has(#codeArea) {
            grid-column: 1 / -1;
        }
        .route-item .poster-shell {
            grid-template-columns: 1fr;
        }
        .node-grid {
            grid-template-columns: 1fr;
        }
        .toolbar,
        .flex-responsive,
        .action-group,
        .card-header,
        .card-footer,
        .header.hero-shell,
        .route-item .poster-strip {
            align-items: stretch;
        }
        .route-item .poster-actions {
            justify-content: stretch;
        }
        .w-full-mobile { width: 100%; }
        .search-input { min-width: 0; }
        th, td { padding: 12px 10px; }
    }

    @media (max-width: 680px) {
        .container { width: 100%; }
        .header.hero-shell h1 { font-size: 24px !important; }
        .shelf { padding: 18px; border-radius: 22px; }
        .btn-submit,
        .btn-edit,
        .btn-del,
        .btn-dns,
        .icon-btn { width: 100%; justify-content: center; }
        .action-group .icon-btn { width: 32px; }
        .table-wrapper,
        table,
        thead,
        tbody,
        th,
        td,
        tr { display: block; width: 100%; }
        thead { display: none; }
        tr { margin-bottom: 14px; border: 1px solid var(--border); border-radius: 18px; overflow: hidden; background: var(--card-strong); }
        td { display: flex; align-items: flex-start; gap: 10px; justify-content: space-between; text-align: right; border-bottom: 1px solid var(--border); }
        td:last-child { border-bottom: none; }
        td::before {
            content: attr(data-label);
            font-weight: 700;
            color: var(--text-sec);
            flex-shrink: 0;
            margin-right: auto;
            text-align: left;
            font-size: 13px;
        }
        #dashboardModal { padding: 0 !important; }
        #dashboardModal .card {
            margin: 0 !important;
            padding: 18px 14px !important;
            min-height: 100vh;
            border-radius: 0;
            border: none;
        }
        #dashboardModal h2 {
            font-size: 20px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
        }
        #dashboardModal h2 > div {
            width: 100%;
            justify-content: space-between;
        }
        #addForm .flex-responsive > input,
        #addForm .flex-responsive > select,
        #addForm .flex-responsive > button {
            width: 100%;
            flex: 1 1 100%;
        }
        .route-item .poster-band,
        .route-item .poster-meta {
            flex-direction: column;
            align-items: flex-start;
        }
        .route-item .poster-actions {
            width: 100%;
        }
    }

`;


const LOGIN_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>系统授权</title>
    <style>
        ${CSS_COMMON}
        body.login-page {
            overflow: hidden;
        }
        body.login-page::before,
        body.login-page::after {
            content: '';
            position: fixed;
            inset: 0;
            pointer-events: none;
        }
        body.login-page::before {
            background:
                radial-gradient(circle at 20% 20%, rgba(255, 176, 87, 0.24), transparent 24%),
                radial-gradient(circle at 80% 15%, rgba(69, 180, 142, 0.18), transparent 22%),
                linear-gradient(135deg, rgba(255,255,255,0.10), transparent 45%);
        }
        body.login-page::after {
            background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 28px 28px;
            opacity: 0.18;
        }
        .login-scene {
            width: 100%;
            max-width: 980px;
            display: grid;
            grid-template-columns: 1.05fr 0.95fr;
            gap: 22px;
            align-items: center;
            position: relative;
            z-index: 1;
        }
        .login-brand {
            color: var(--text);
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .login-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            width: fit-content;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: var(--chip-bg);
            color: var(--text-sec);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .login-brand h1 {
            margin: 0;
            font-family: 'Fraunces', serif;
            font-size: clamp(36px, 5vw, 58px);
            line-height: 0.95;
            letter-spacing: -0.04em;
        }
        .login-brand p {
            margin: 0;
            color: var(--text-sec);
            font-size: 15px;
            line-height: 1.75;
            max-width: 38ch;
        }
        .login-flags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .login-flags span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            min-height: 34px;
            padding: 8px 12px;
            border-radius: 999px;
            background: var(--chip-bg);
            border: 1px solid var(--border);
            color: var(--text);
            font-size: 12px;
            font-weight: 600;
        }
        .login-box.login-card {
            padding: 28px;
            background:
                radial-gradient(circle at top right, rgba(255,255,255,0.10), transparent 34%),
                linear-gradient(180deg, color-mix(in srgb, var(--card-strong) 90%, transparent), var(--card));
        }
        .login-box.login-card h2 {
            font-size: 28px;
            margin-bottom: 10px;
            font-family: 'Fraunces', serif;
        }
        .login-box.login-card p {
            font-size: 14px;
            line-height: 1.7;
        }
        .login-box.login-card .login-input-wrap {
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-top: 18px;
        }
        .login-box.login-card input {
            text-align: left;
            font-size: 15px;
            padding: 14px 16px;
        }
        .login-box.login-card button {
            width: 100%;
            padding: 14px 16px;
            font-size: 15px;
            border-radius: 14px;
        }
        @media (max-width: 900px) {
            .login-scene { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body class="login-page">
    <div id="toast"></div>
    <main class="login-scene">
        <section class="login-brand">
            <div class="login-kicker">🎞️ Media Library Console</div>
            <h1>私有反代后台</h1>
            <p>像翻看片库一样管理路由、测速、部署与 DNS。请输入管理员密钥继续进入。</p>
            <div class="login-flags">
                <span>🔒 仅授权访问</span>
                <span>🎬 播放库视图</span>
                <span>⚡ 云端调度</span>
            </div>
        </section>
        <div class="login-box login-card">
            <h2>安全中心</h2>
            <p>请输入管理员密钥以继续访问</p>
            <div class="login-input-wrap">
                <input type="password" id="tokenInput" placeholder="密钥 TOKEN" onkeydown="if(event.key==='Enter') login()">
                <button class="btn-submit" onclick="login()">验 证 登 录</button>
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
            if(!token) return showToast('请输入正确的密钥');
            document.cookie = 'admin_token=' + encodeURIComponent(token) + '; path=/; max-age=2592000;';
            window.location.reload();
        }
    </script>
</body>
</html>

`;


const HTML_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>MakkaPakka的反代面板</title>
    <style>${CSS_COMMON}</style>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="app-page">
    <div id="toast"></div>
    
    <div id="dashboardModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); z-index:10000; overflow-y:auto; padding: 20px; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);">
        <div class="card shelf" style="max-width: 1000px; margin: 40px auto; position:relative;">
            <button onclick="closeDashboard()" style="position:absolute; top:16px; right:16px; font-size:20px; background:var(--input-bg); border-radius:8px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); cursor:pointer; color: var(--text-sec); transition: 0.2s;" onmouseover="this.style.color='#ef4444'; this.style.borderColor='#ef4444'" onmouseout="this.style.color='var(--text-sec)'; this.style.borderColor='var(--border)'">✖</button>
            
            <h2 style="margin-top:0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size:24px;">📊</span> 数据大屏 <span style="font-size:13px; font-weight: normal; color: var(--text-sec);">精确访客画像分析</span>
                </div>
                <div style="font-size: 13px; background: var(--input-bg); color: var(--text); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); display: flex; gap: 12px; flex-wrap: wrap; font-weight:500;">
                    <span> 今天: <strong id="trafficToday" style="color:var(--primary)">加载中...</strong></span>
                    <span>1周内: <strong id="traffic7d" style="color:var(--primary)">加载中...</strong></span>
                    <span>1月内: <strong id="traffic30d" style="color:var(--primary)">加载中...</strong></span>
                </div>
            </h2>
            
            <div class="flex-responsive" style="margin-top:20px; align-items: stretch;">
                <div style="flex: 2; min-width: 300px; border: 1px solid var(--border); border-radius: 12px; padding: 16px; background: var(--input-bg);">
                    <canvas id="trendChart"></canvas>
                </div>
                <div style="flex: 1; min-width: 300px; border: 1px solid var(--border); border-radius: 12px; padding: 16px; background: var(--input-bg); display: flex; justify-content: center; align-items: center;">
                    <canvas id="locationChart"></canvas>
                </div>
            </div>
            
            <h3 style="margin-top: 32px; margin-bottom:16px; display:flex; align-items:center; gap:8px; font-size: 16px;">🕵️ 最新独立播放记录 <span style="font-size:12px; color:var(--text-sec); font-weight:normal;">(仅拦截 PlaybackInfo)</span></h3>
            <div class="table-wrapper">
                <table style="width: 100%;">
                    <thead><tr><th>访问时间</th><th>目标节点</th><th>真实 IP 地址</th><th>归属地</th><th>客户端/设备标识</th></tr></thead>
                    <tbody id="logTableBody"><tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--text-sec);">数据分析引擎计算中...</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="container page-shell">
        <div id="updateAlert" class="card" style="display: none; border-left: 4px solid #10b981; background-color: var(--input-bg); margin-top: 16px;">
            <div class="flex-responsive" style="justify-content: space-between;">
                <div>
                    <h3 style="margin:0; color: #10b981; font-size: 16px; display:flex; align-items:center; gap:6px;">✨ 发现新版本！</h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-sec);" id="updateMsg">当前版本: v1.0.0 | 最新版本: v?.?.?</p>
                </div>
                <button onclick="doOnlineUpdate()" id="onlineUpdateBtn" class="btn-submit w-full-mobile" style="background: #10b981;">🚀 一键拉取并升级</button>
            </div>
        </div>
        
        <div id="cf-trace-card" class="card flex-responsive" style="margin-bottom: 20px; justify-content: space-between; font-size: 14px; margin-top: 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px; background:var(--input-bg); border: 1px solid var(--border); border-radius:10px; padding:8px;">📍</div>
                <div>
                    <div style="color:var(--text-sec); font-size: 12px; margin-bottom: 2px; font-weight:500;">访客入口 (地区与机房)</div>
                    <div id="trace-entry" style="font-weight:600; color:var(--text); font-family: monospace; font-size: 14px;">雷达扫描中...</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px; background:var(--input-bg); border: 1px solid var(--border); border-radius:10px; padding:8px;">🚀</div>
                <div>
                    <div style="color:var(--text-sec); font-size: 12px; margin-bottom: 2px; font-weight:500;">Worker 实际落地机房</div>
                    <div id="trace-egress" style="font-weight:600; color:#10b981; font-family: monospace; font-size: 14px;">雷达扫描中...</div>
                </div>
            </div>
        </div>
        
        <div class="card shelf" style="margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 16px; font-size: 15px; display:flex; align-items:center; gap:6px;">⚙️ Worker 调度模式与区域设置</div>
            <div class="flex-responsive">
                <select id="cf-mode-select" onchange="handleModeChange()" class="w-full-mobile" style="flex: 1;">
                    <option value='{"mode":"smart"}'>🤖 智能调度 (Smart Placement)</option>
                    <option value='{"mode":"off"}'>🌍 边缘节点 (Edge - 默认近)</option>
                    <optgroup label="📍 指定云厂商物理机房落地">
                        <option value="aws">☁️ AWS (亚马逊云)</option>
                        <option value="gcp">☁️ GCP (谷歌云)</option>
                        <option value="azure">☁️ Azure (微软云)</option>
                    </optgroup>
                    <option value="custom">✏️ 手动输入区域代码...</option>
                </select>

                <select id="cf-region-select" class="w-full-mobile" style="display: none; flex: 1.5;"></select>
                <input type="text" id="cf-custom-input" class="w-full-mobile" placeholder="输入云代码 (如 gcp:us-west1)" style="display: none; flex: 1.5;">
                
                <button onclick="updatePlacement()" class="btn-submit w-full-mobile">提交修改</button>
            </div>
            <div id="place-status" style="margin-top: 10px; font-size: 12px; color: var(--text-sec);">后台全自动安全调度，不暴露任何私钥</div>
        </div>
        
        <div class="content-wrap shell-grid">
            <div class="header hero-shell" style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap:wrap; gap:16px;">
                <h1 style="margin: 0; font-size: 24px; font-weight:700; display:flex; align-items:center; gap: 10px; width: 100%;">
                    私有调度与反代核心
                    <button id="themeToggle" onclick="toggleDarkMode()" style="background:transparent;border:none;font-size:18px;cursor:pointer;padding:6px;border-radius:8px; margin-left: auto;" title="切换深色模式">🌙</button>
                </h1>
                <div class="actions-wrapper" style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
                    <div style="font-size: 12px; font-weight: 500; padding: 8px 12px; border-radius: 8px; background: var(--input-bg); border: 1px solid var(--border); display: flex; align-items: center; gap: 6px;" title="设备到云端真实往返延迟">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; transition: 0.3s;" id="rttDot"></span>
                        <span style="color: var(--text-sec);">RTT: </span><span id="rttValue" style="font-family: monospace; width: 45px; text-align: right; color: var(--text);">测算中</span>
                    </div>
                    
                    <button class="btn-submit" onclick="openDashboard()" style="background: #10b981; color: white;">📊 数据大屏</button>
                    <button class="btn-submit" style="background: var(--input-bg); color: #ef4444; border: 1px solid var(--border);" onclick="logout()">退出</button>
                </div>
            </div>

            <div class="card shelf" style="border-left: 4px solid #ef4444;">
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; font-size:16px; font-weight:600; color: #ef4444; display:flex; align-items:center; gap:6px;">🚀 覆盖 Worker 核心代码</h2>
                </div>
                <div style="font-size: 12px; color: var(--text-sec); margin-bottom: 12px;">⚠️ 警告：提交错误的代码会导致面板 500 崩溃。</div>
                <textarea id="codeArea" rows="4" placeholder="方式一：粘贴代码全文..." style="width: 100%; font-family: monospace; resize: vertical; font-size:12px;"></textarea>
                <div class="flex-responsive" style="margin-top:12px;">
                    <span style="font-size:13px; font-weight:500; color:var(--text-sec);">或方式二：</span>
                    <input type="file" id="fileInput" accept=".js" class="w-full-mobile" style="font-size:13px; padding: 8px; max-width:220px; min-height: unset;">
                    <button class="btn-submit w-full-mobile" id="deployBtn" onclick="deployWorker()" style="background: #ef4444; margin-left: auto;">🔥 部署重启</button>
                </div>
            </div>

            <div class="card shelf">
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; font-size:18px; font-weight:600; display:flex; align-items:center; gap:6px;">⚡ 专属线路测速与动态 DNS</h2>
                </div>
                
                <div style="background: var(--input-bg); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
                    <div style="font-size: 12px; font-weight: 500; color: var(--text-sec); margin-bottom: 8px;">📡 当前域名 DNS 解析：</div>
                    <div id="dnsStatus" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="color:var(--text-sec); font-size: 13px;">加载中...</span>
                    </div>
                </div>

                <div class="toolbar" style="background:var(--input-bg); padding:12px; border-radius:12px; border:1px solid var(--border);">
                    <select id="ipType" class="w-full-mobile" style="font-weight: 500;">
                        <option value="all">🌐 综合混合源</option>
                        <option value="电信">🔵 电信专属</option>
                        <option value="联通">🟠 联通专属</option>
                        <option value="移动">🟢 移动专属</option>
                        <option value="多线">🟣 多线BGP</option>
                        <option value="ipv6">🚀 IPv6节点</option>
                        <option value="优选">🌟 顶尖优选库</option>
                    </select>

                    <button class="btn-submit w-full-mobile" id="btnFetchRemote" onclick="fetchRemoteAndTest()">🌍 提取并测速</button>
                    <button class="btn-submit w-full-mobile" onclick="batchTcpPing()" style="background: #f59e0b; color: white;">🌐 去 ITDog</button>
                    <button class="btn-submit w-full-mobile" onclick="clearTest()" style="background: var(--card); color: var(--text); border: 1px solid var(--border);">🗑️ 清空</button>
                </div>

                <div style="background: var(--input-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
                    <div class="flex-responsive" style="margin-bottom: 12px;">
                        <input type="text" id="customApiUrl" class="w-full-mobile" value="https://ip.v2too.top/api/nodes" placeholder="自定义 API 链接" style="flex: 1;">
                        <button class="btn-submit w-full-mobile" id="btnFetchCustomApi" onclick="fetchCustomApiAndTest()" style="background: #0ea5e9;">🌐 拉取 API</button>
                    </div>

                    <textarea id="customIps" rows="2" placeholder="粘贴 IP 或优选域名" style="width: 100%; font-family: monospace; resize: vertical; margin-bottom: 12px;"></textarea>
                    
                    <div class="flex-responsive">
                        <button class="btn-submit w-full-mobile" id="btnTestCustom" onclick="testCustomIPs()" style="background: var(--primary);">🧪 测试节点</button>
                        <button class="btn-submit w-full-mobile" id="btnDirectCname" onclick="directSubmitCname()" style="background: #8b5cf6;">🔗 直推 CNAME</button>
                        <div style="width: 100%; height: 1px; background: var(--border); margin: 4px 0; display:none;"></div>
                        <button class="btn-submit w-full-mobile" id="btnTop3Dns" onclick="updateTop3ToDns()" style="background: #ec4899;">🌟 更新 TOP3 DNS</button>
                        <button class="btn-submit w-full-mobile" id="btnSelectedDns" onclick="updateSelectedToDns()" style="background: #10b981;">☑️ 提交选中 DNS</button>
                    </div>
                </div>
                
                <div id="statusText" style="line-height: 1.5; font-size: 13px; color: var(--text-sec); margin-bottom: 16px; padding: 12px 16px; background: var(--input-bg); border-radius: 8px; border-left: 3px solid #10b981;">
                    💡 测速完成后，勾选节点提交至 DNS 自动分发。
                </div>

                <div class="table-wrapper">
                    <table style="width: 100%;">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAll" class="ip-checkbox" onclick="toggleSelectAll()"></th>
                                <th>节点</th>
                                <th>延迟</th>
                                <th>状态</th>
                                <th>归属</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="testTableBody">
                            <tr><td colspan="6" style="text-align:center;color:var(--text-sec); padding:30px;">暂无数据</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card shelf">
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; font-size:18px; font-weight:600;">部署 / 编辑节点</h2>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-submit" onclick="exportConfig()" style="background:var(--input-bg); color:var(--text); border:1px solid var(--border); padding: 8px 12px; font-size: 12px; min-height:unset;">📦 导出</button>
                        <button class="btn-submit" onclick="importConfig()" style="background:var(--input-bg); color:var(--text); border:1px solid var(--border); padding: 8px 12px; font-size: 12px; min-height:unset;">📥 导入</button>
                    </div>
                </div>
                
                <form id="addForm" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="flex-responsive">
                        <input type="hidden" id="oldPrefix" value="">
                        <input type="text" id="remark" class="w-full-mobile" placeholder="备注 (如: Misaka)" style="flex: 1;" required>
                        <input type="text" id="prefix" class="w-full-mobile" placeholder="短路径 (如: misaka)" style="flex: 1;" required>
                        <select id="mode" class="w-full-mobile" style="flex: 1;">
                            <option value="off">保守 (抹除IP)</option>
                            <option value="realip_only">严格 (透传IP)</option>
                            <option value="dual">兼容 (双重透传)</option>
                            <option value="strict">强力 (防403)</option>
                        </select>
                    </div>

                    <div class="flex-responsive">
                        <div style="position: relative; flex: 2; display: flex; width:100%;">
                            <div style="display:flex; gap:10px; align-items:center; background:var(--input-bg); padding:10px 14px; border-radius:8px; border:1px solid var(--border); flex: 1; cursor: pointer; transition:0.2s; min-height:44px;" onclick="toggleIconPicker(event)" id="iconSelectBtn">
                                <img id="iconPreview" src="" style="width:24px;height:24px;display:none;border-radius:4px;object-fit:cover;">
                                <span id="iconDefault" style="font-size:20px;line-height:1;">🎬</span>
                                <span id="iconSelectText" style="flex:1; color: var(--text-sec); font-size:13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">选择图标...</span>
                                <input type="hidden" id="iconUrl" value="">
                            </div>
                            
                            <div id="iconPickerPanel" style="display:none; position: absolute; top: calc(100% + 8px); left: 0; width: 100%; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; box-shadow: var(--shadow-hover); z-index: 100; flex-direction: column; gap: 10px;">
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <input type="text" id="customIconUrlInput" placeholder="自定义库链接..." style="flex: 1; padding: 8px 10px; min-height:unset;">
                                    <button type="button" onclick="setCustomIconLibrary()" class="btn-submit" style="padding: 8px 12px; min-height:unset;">加载</button>
                                    <button type="button" onclick="resetIconLibrary()" class="btn-submit" style="padding: 8px 12px; background: var(--input-bg); color:var(--text); border:1px solid var(--border); min-height:unset;">默认</button>
                                </div>
                                <input type="text" id="iconSearch" placeholder="🔍 搜索名称..." style="padding: 10px 12px; width: 100%; min-height:unset;" onkeyup="filterIcons()">
                                <div id="iconGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 8px; overflow-y: auto; max-height: 200px; padding-right: 4px;">
                                    <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; font-size: 12px; padding:10px;">加载中...</div>
                                </div>
                            </div>
                        </div>
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:500; cursor:pointer; color:var(--text);">
                            <input type="checkbox" id="nodeCache" class="ip-checkbox" checked> 缓存
                        </label>
                        <button type="submit" id="submitBtn" class="btn-submit w-full-mobile" style="flex: 1;">保存部署</button>
                    </div>

                    <div style="background: var(--input-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-sec); margin-bottom: 12px;">服务器线路地址</div>
                        <div id="targetInputs" style="display: flex; flex-direction: column; gap: 10px;">
                            <input type="url" class="target-input" placeholder="主线路 (http://...)" required oninput="handleTargetInputs()">
                            <input type="url" class="target-input" placeholder="备用线路 1 (选填)" oninput="handleTargetInputs()">
                        </div>
                    </div>

                    <div style="background: var(--input-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-sec); margin-bottom: 8px;">自定义请求头 (一行一个)</div>
                        <textarea id="customHeaders" rows="2" placeholder="Header-Name: value" style="font-family: monospace; font-size: 12px;"></textarea>
                    </div>
                </form>
            </div>

            <div class="card shelf">
                <div class="flex-responsive" style="justify-content: space-between; margin-bottom: 20px;">
                    <h2 style="margin:0; font-size:18px; font-weight:600;">已反代媒体库</h2>
                    <div class="flex-responsive" style="gap:8px;">
                        <button class="btn-submit w-full-mobile" onclick="pingAllNodes()" style="background:var(--input-bg); color:var(--text); border:1px solid var(--border); min-height:unset; padding:8px 12px; font-size:12px;">⚡ 测速</button>
                        <button id="btnPurge" class="btn-submit w-full-mobile" onclick="purgeCache()" style="background:var(--input-bg); color:#ef4444; border:1px solid #ef4444; min-height:unset; padding:8px 12px; font-size:12px;">🧹 刷新全站海报</button>
                        <input type="text" id="searchNode" class="search-input w-full-mobile" placeholder="🔍 搜索..." onkeyup="filterNodesList()" style="min-height:36px; padding:8px 12px; width:160px;">
                    </div>
                </div>
                
                <div class="flex-responsive" style="background: var(--input-bg); padding: 12px 16px; border-radius: 12px; border: 1px dashed var(--border); margin-bottom: 16px;">
                    <label style="cursor: pointer; font-weight: 500; font-size:13px; display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="selectAllNodes" onchange="toggleSelectAll(this)" style="width: 16px; height: 16px; accent-color: var(--primary);"> 
                        全选
                    </label>
                    <div style="width: 1px; height: 16px; background: var(--border); display:none;"></div> 
                    <select id="batch-mode-select" class="w-full-mobile" style="font-weight: 500; min-height:36px; padding:6px 10px; flex:1;">
                        <option value="">🔄 读取中...</option>
                    </select>
                    <button onclick="batchUpdateModes()" class="btn-submit w-full-mobile" style="min-height:36px; padding:6px 12px; font-size:13px;">🚀 批量应用</button>
                    <span id="batch-status" style="font-size: 12px; font-weight: 500;"></span>
                </div>
                
                <div id="list-grid" class="node-grid">
                    <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px; font-size:13px;">读取数据中...</div>
                </div>
            </div>
            
        </div>
        
        <div style="text-align: center; padding-top: 20px; padding-bottom: 30px;">
            <a href="https://t.me/MakkaPakkaOvO" target="_blank" style="text-decoration: none; color: var(--text); font-weight: 500; display: inline-flex; align-items: center; padding: 10px 20px; background: var(--card); border-radius: 20px; border: 1px solid var(--border); font-size: 13px; transition:0.2s;">
                ${SVG_TG} 联系作者
            </a>
            <div style="margin-top: 16px; font-size: 12px; color: var(--text-sec); line-height: 1.5; max-width: 500px; margin-left: auto; margin-right: auto; padding: 0 16px;">
                免责声明: 本项目仅供学习测试，请遵守法律法规。使用者承担全部责任。
            </div>
        </div>
    </div>

    <script>
        const modeNames = { 'off': '保守', 'realip_only': '严格', 'dual': '兼容', 'strict': '强力' };
        
        const DEFAULT_ICON_URL = 'https://emby-icon.vercel.app/TFEL-Emby.json';
        let globalIcons = [];
        let proxyNodesForPing = [];
        let sortableInstance = null;
        let trendChartInstance = null;
        let locationChartInstance = null;

        // 设置 Chart.js 响应暗色模式
        function updateChartColors() {
            Chart.defaults.color = document.body.classList.contains('dark') ? '#94a3b8' : '#64748b';
            Chart.defaults.borderColor = document.body.classList.contains('dark') ? '#334155' : '#e2e8f0';
        }

        // =====================================
        // 数据大屏与统计逻辑 (适配手机端表格排版)
        // =====================================
        async function openDashboard() {
            document.getElementById('dashboardModal').style.display = 'block';
            
            function parseTrafficToBytes(str) {
                if (!str || str === '0 B' || str.includes('异常') || str.includes('获取')) return 0;
                let val = parseFloat(str);
                if (str.includes('TB')) return val * 1099511627776;
                if (str.includes('GB')) return val * 1073741824;
                if (str.includes('MB')) return val * 1048576;
                if (str.includes('KB')) return val * 1024;
                return val;
            }

            let top5Container = document.getElementById('top5-simple-container');
            if (!top5Container) {
                top5Container = document.createElement('div');
                top5Container.id = 'top5-simple-container';
                const wrapper = document.querySelector('.table-wrapper');
                if(wrapper && wrapper.previousElementSibling) {
                    wrapper.parentNode.insertBefore(top5Container, wrapper.previousElementSibling);
                }
            }
            
            let top5Html = '<h3 style="margin-top: 24px; margin-bottom:12px; font-size:15px;">🏆 今日流量 TOP 5</h3><div style="background: var(--input-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 20px;">';
            
            const domCards = document.querySelectorAll('.route-item');
            let scrapedNodes = [];
            
            domCards.forEach(card => {
                const prefix = card.getAttribute('data-prefix') || '未知';
                let remark = prefix;
                const searchAttr = card.getAttribute('data-search');
                if (searchAttr) {
                    remark = searchAttr.replace(new RegExp(' ' + prefix + '$'), '').trim();
                }

                let bandwidth = '0 B';
                const spans = card.querySelectorAll('span');
                spans.forEach(span => {
                    const txt = span.innerText || '';
                    if (/^[\\d\\.]+\\s*(TB|GB|MB|KB|B)$/i.test(txt.trim())) {
                        bandwidth = txt.trim();
                    }
                });

                scrapedNodes.push({ prefix: prefix, remark: remark, todayBandwidth: bandwidth });
            });

            if (scrapedNodes.length > 0) {
                const validNodes = scrapedNodes.filter(r => parseTrafficToBytes(r.todayBandwidth) > 0);
                const top5 = validNodes.sort((a, b) => parseTrafficToBytes(b.todayBandwidth) - parseTrafficToBytes(a.todayBandwidth)).slice(0, 5);
                
                if (top5.length > 0) {
                    top5Html += '<ul style="margin:0; padding-left: 20px; line-height: 2; font-size: 13px; color: var(--text);">';
                    top5.forEach((r, idx) => {
                        const rankColor = idx === 0 ? '#ef4444' : (idx === 1 ? '#f59e0b' : (idx === 2 ? '#eab308' : 'var(--text-sec)'));
                        top5Html += \`<li><strong style="color:\${rankColor};">#\${idx+1}</strong> \${r.remark} (/\${r.prefix}) - <strong style="color:var(--primary); font-family: monospace;">\${r.todayBandwidth}</strong></li>\`;
                    });
                    top5Html += '</ul>';
                } else {
                    top5Html += '<div style="color:var(--text-sec); font-size:13px; text-align:center;">今日暂无流量</div>';
                }
            } else {
                top5Html += '<div style="color:var(--text-sec); font-size:13px; text-align:center;">暂无节点</div>';
            }
            top5Html += '</div>';
            
            top5Container.innerHTML = top5Html;


            document.getElementById('logTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--text-sec); font-size:13px;">数据拉取中...</td></tr>';
            document.getElementById('trafficToday').innerText = '...';
            document.getElementById('traffic7d').innerText = '...';
            document.getElementById('traffic30d').innerText = '...';

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const res = await fetch('/api/analytics', { signal: controller.signal });
                clearTimeout(timeoutId);
                
                const data = await res.json();
                if(!data.success) throw new Error(data.error);

                updateChartColors();

                document.getElementById('trafficToday').innerText = data.trafficToday || '未知';
                document.getElementById('traffic7d').innerText = data.traffic7d || '未知';
                document.getElementById('traffic30d').innerText = data.traffic30d || '未知';

                const labels = data.trend.map(i => i.date.substring(5)); 
                const counts = data.trend.map(i => i.count);
                const trendCtx = document.getElementById('trendChart').getContext('2d');
                if(trendChartInstance) trendChartInstance.destroy();
                trendChartInstance = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{ label: '播放 (次)', data: counts, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 }]
                    },
                    options: { responsive: true, plugins: { title: { display: true, text: '7天播放趋势', font: {size: 14, family: 'Inter'} } } }
                });

                const locLabels = data.locations.map(i => i.country === 'CN' ? '中国大陆' : (i.country || '未知'));
                const locCounts = data.locations.map(i => i.count);
                const locCtx = document.getElementById('locationChart').getContext('2d');
                if(locationChartInstance) locationChartInstance.destroy();
                locationChartInstance = new Chart(locCtx, {
                    type: 'doughnut',
                    data: {
                        labels: locLabels,
                        datasets: [{ data: locCounts, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#94a3b8'], borderWidth: 0 }]
                    },
                    options: { responsive: true, plugins: { title: { display: true, text: '访客来源', font: {size: 14, family: 'Inter'} } } }
                });

                const tbody = document.getElementById('logTableBody');
                tbody.innerHTML = '';
                if(data.recents.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--text-sec); font-size:13px;">暂无日志记录</td></tr>';
                } else {
                    data.recents.forEach(log => {
                        const tr = document.createElement('tr');
                        const isChina = log.country === 'CN';
                        tr.innerHTML = \`
                            <td data-label="时间" style="font-size:12px; white-space:nowrap;">\${log.timestamp}</td>
                            <td data-label="节点"><span class="badge" style="color:var(--primary); border-color:var(--primary); background:transparent;">\${log.prefix}</span></td>
                            <td data-label="IP" style="font-family:monospace; font-size:12px; color:var(--text-sec); word-break:break-all;">\${log.ip}</td>
                            <td data-label="归属地"><span class="badge" style="border-color:\${isChina ? '#10b981' : '#f59e0b'}; color:\${isChina ? '#10b981' : '#f59e0b'}; background:transparent;">\${isChina ? '中国大陆' : (log.country || 'Unk')}</span></td>
                            <td data-label="设备 (UA)" style="font-size:12px; color:var(--text-sec); word-break: break-all; text-align: right;" title="\${log.ua}">\${log.ua}</td>
                        \`;
                        tbody.appendChild(tr);
                    });
                }

            } catch (e) {
                const errMsg = e.name === 'AbortError' ? '超时' : e.message;
                document.getElementById('logTableBody').innerHTML = \`<tr><td colspan="5" style="text-align:center;color:#ef4444; padding: 30px;">拉取失败: \${errMsg}</td></tr>\`;
            }
        }

        function closeDashboard() { document.getElementById('dashboardModal').style.display = 'none'; }

        async function loadIcons(forceUrl = null) {
            const grid = document.getElementById('iconGrid');
            grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-sec); font-size: 12px; text-align: center; padding: 10px;">加载中...</div>';
            const targetUrl = forceUrl || localStorage.getItem('custom_icon_url') || DEFAULT_ICON_URL;
            const urlInput = document.getElementById('customIconUrlInput');
            if (urlInput) urlInput.value = targetUrl === DEFAULT_ICON_URL ? '' : targetUrl;
            try {
                const res = await fetch(targetUrl);
                const data = await res.json();
                if (data && data.icons && Array.isArray(data.icons)) {
                    globalIcons = data.icons;
                } else if (Array.isArray(data)) {
                    globalIcons = data;
                } else {
                    globalIcons = [];
                    for (const [key, val] of Object.entries(data)) { globalIcons.push({ name: key, url: val }); }
                }
                renderIconGrid('');
            } catch(e) { 
                grid.innerHTML = '<div style="grid-column: 1/-1; color: #ef4444; font-size: 12px; text-align: center;">加载失败</div>';
            }
        }

        function setCustomIconLibrary() {
            const url = document.getElementById('customIconUrlInput').value.trim();
            if (!url) return showToast('⚠️ 请输入链接');
            if (!url.startsWith('http')) return showToast('⚠️ 链接非法');
            localStorage.setItem('custom_icon_url', url);
            showToast('⏳ 加载中...');
            loadIcons(url);
        }

        function resetIconLibrary() {
            localStorage.removeItem('custom_icon_url');
            document.getElementById('customIconUrlInput').value = '';
            showToast('🔄 恢复默认');
            loadIcons(DEFAULT_ICON_URL);
        }

        function renderIconGrid(filterText) {
            const grid = document.getElementById('iconGrid');
            const lowerFilter = filterText.toLowerCase();
            const filtered = globalIcons.filter(item => (item.name || '').toLowerCase().includes(lowerFilter));
            let html = \`<div class="icon-item" onclick="selectIcon('', '默认 🎬')" title="默认图标"><span style="font-size:20px;">🎬</span></div>\`;
            filtered.forEach(item => {
                html += \`<div class="icon-item" onclick="selectIcon('\${item.url}', '\${item.name}')" title="\${item.name}">
                            <img src="\${item.url}" loading="lazy" style="width: 24px; height: 24px; object-fit: contain; border-radius: 4px;">
                        </div>\`;
            });
            grid.innerHTML = html;
        }

        function filterIcons() { renderIconGrid(document.getElementById('iconSearch').value); }

        function toggleIconPicker(e) {
            e.stopPropagation();
            const panel = document.getElementById('iconPickerPanel');
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        }

        function selectIcon(url, name) {
            document.getElementById('iconUrl').value = url;
            const preview = document.getElementById('iconPreview');
            const def = document.getElementById('iconDefault');
            const text = document.getElementById('iconSelectText');
            if(url) {
                preview.src = url; preview.style.display = 'block'; def.style.display = 'none';
                text.textContent = name; text.style.color = 'var(--text)';
            } else {
                preview.src = ''; preview.style.display = 'none'; def.style.display = 'block';
                text.textContent = '选择图标...'; text.style.color = 'var(--text-sec)';
            }
            document.getElementById('iconPickerPanel').style.display = 'none';
        }

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('iconPickerPanel');
            const btn = document.getElementById('iconSelectBtn');
            if (panel && btn && panel.style.display !== 'none') {
                if (!panel.contains(e.target) && !btn.contains(e.target)) panel.style.display = 'none';
            }
        });

        function toggleDarkMode() {
            const isDark = document.body.classList.toggle('dark');
            document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('emby_proxy_dark', isDark ? '1' : '0');
            if(trendChartInstance) { updateChartColors(); trendChartInstance.update(); locationChartInstance.update(); }
        }
        if (localStorage.getItem('emby_proxy_dark') === '1') { document.body.classList.add('dark'); document.getElementById('themeToggle').textContent = '☀️'; }

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        async function purgeCache() {
            if(!confirm('确定清理 Cloudflare 海报和静态缓存吗？\\n清理后可能短暂加载缓慢。')) return;
            const btn = document.getElementById('btnPurge');
            const originalText = btn.textContent;
            btn.textContent = '⏳ 清理中...'; btn.disabled = true;
            try {
                const res = await fetch('/api/purge-cache', { method: 'POST' });
                const data = await res.json();
                if(data.success) showToast('✅ 缓存清理成功！');
                else showToast('❌ 失败: ' + data.error);
            } catch(e) { showToast('❌ 请求错误'); } finally { btn.textContent = originalText; btn.disabled = false; }
        }

        function filterNodesList() {
            const filterText = document.getElementById('searchNode').value.toLowerCase();
            const cards = document.querySelectorAll('.emby-card');
            cards.forEach(card => {
                const searchStr = card.getAttribute('data-search').toLowerCase();
                card.style.display = searchStr.includes(filterText) ? 'flex' : 'none';
            });
        }

        function handleTargetInputs() {
            const container = document.getElementById('targetInputs');
            const inputs = container.querySelectorAll('.target-input');
            const lastInput = inputs[inputs.length - 1];
            if (lastInput.value.trim() !== '') {
                const newInput = document.createElement('input');
                newInput.type = 'url'; newInput.className = 'target-input';
                newInput.oninput = handleTargetInputs;
                container.appendChild(newInput);
            }
            let emptyCount = 0;
            const currentInputs = container.querySelectorAll('.target-input');
            for (let i = currentInputs.length - 1; i >= 0; i--) {
                if (currentInputs[i].value.trim() === '') { emptyCount++; if (emptyCount > 1) currentInputs[i].remove(); } else { break; }
            }
            container.querySelectorAll('.target-input').forEach((inp, idx) => {
                inp.placeholder = idx === 0 ? "主线路 (http://...)" : \`备用线路 \${idx} (选填)\`;
            });
        }

        function resetTargetInputs() {
            const container = document.getElementById('targetInputs');
            container.innerHTML = \`
                <input type="url" class="target-input" placeholder="主线路 (http://...)" required oninput="handleTargetInputs()">
                <input type="url" class="target-input" placeholder="备用线路 1 (选填)" oninput="handleTargetInputs()">
            \`;
        }

        function toggleVis(id, isArray = false) {
            const el = document.getElementById(id);
            if (el.classList.contains('secret-text')) {
                el.classList.remove('secret-text'); el.classList.add('actual-text');
                if (isArray) {
                    const arr = JSON.parse(decodeURIComponent(el.getAttribute('data-val')));
                    let html = '';
                    arr.forEach((t, i) => {
                        const tag = i === 0 ? '<span style="color:#10b981;font-weight:bold;">[主]</span>' : '<span style="color:#f59e0b;font-weight:bold;">[备]</span>';
                        html += \`<div class="url-list-item">\${tag} \${t}</div>\`;
                    });
                    el.innerHTML = html;
                } else { el.textContent = el.getAttribute('data-val'); }
            } else {
                el.classList.add('secret-text'); el.classList.remove('actual-text'); el.textContent = '••••••••';
            }
        }

        function copyTxt(txt) { navigator.clipboard.writeText(txt).then(() => showToast('🚀 复制成功！')); }

        async function pingTarget(idx, targetUrl) {
            const pingEl = document.getElementById('ping-' + idx);
            pingEl.textContent = '测速中...'; pingEl.style.color = 'var(--text-sec)';
            try {
                const res = await fetch('/api/ping-node?url=' + encodeURIComponent(targetUrl));
                const data = await res.json();
                if(data.ms >= 0) {
                    pingEl.textContent = data.ms + ' ms';
                    pingEl.style.color = data.ms < 200 ? '#10b981' : (data.ms < 500 ? 'var(--primary)' : '#f59e0b');
                } else { pingEl.textContent = '超时'; pingEl.style.color = '#ef4444'; }
            } catch(e) { pingEl.textContent = '异常'; pingEl.style.color = '#ef4444'; }
        }

        function pingAllNodes() {
            if (proxyNodesForPing.length === 0) return showToast('⚠️ 无节点');
            showToast('⚡ 全局测速中...');
            proxyNodesForPing.forEach((node, offset) => { setTimeout(() => pingTarget(node.idx, node.url), offset * 200); });
        }

        async function exportConfig() {
            try {
                const res = await fetch('/api/routes'); const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'emby_proxy_backup.json'; a.click();
                URL.revokeObjectURL(url); showToast('✅ 导出成功');
            } catch (e) { showToast('❌ 导出失败'); }
        }

        function importConfig() {
            const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0]; const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const routes = JSON.parse(event.target.result);
                        const res = await fetch('/api/routes/import', { method: 'POST', body: JSON.stringify(routes) });
                        const result = await res.json();
                        if (result.success) { showToast('✅ 导入成功'); load(); } else throw new Error(result.error);
                    } catch (err) { showToast('❌ 失败: ' + err.message); }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        async function load() {
            try {
                const res = await fetch('/api/routes');
                if (!res.ok) throw new Error('请求失败');
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                window.globalRoutesData = data;

                const container = document.getElementById('list-grid');
                if(data.length === 0) {
                    container.innerHTML = '<div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px; font-size:13px;">暂无节点，请部署。</div>';
                    return;
                }
                
                container.innerHTML = '';
                proxyNodesForPing = []; 
                const currentHost = window.location.host;

                data.forEach((r, idx) => {
                    const proxyUrl = 'https://' + currentHost + '/' + r.prefix;
                    const targets = r.target.split(',').map(s => s.trim()).filter(Boolean);
                    const mainTarget = targets[0]; 
                    
                    const remarkName = r.remark || '未命名';
                    const lastPlay = r.last_play ? r.last_play : '-';
                    
                    const iconHtml = r.icon ? \`<img src="\${r.icon}" style="width:24px;height:24px;border-radius:6px;object-fit:cover;">\` : '🎬';
                    const encodedTargets = encodeURIComponent(JSON.stringify(targets));
                    
                    const todayBw = r.todayBandwidth || '0 B';
                    const totalReqs = r.totalReqs || r.todayReqs || 0;

                    proxyNodesForPing.push({ idx: idx, url: mainTarget });

                    container.innerHTML += \`
                    <div class="emby-card route-item media-card" data-prefix="\${r.prefix}" data-search="\${remarkName} \${r.prefix}">
                        <div class="poster-shell">
                            <div class="poster-visual">
                                <div class="poster-band">
                                    <div class="drag-handle" title="长按拖拽">☰</div>
                                    <input type="checkbox" class="node-cb ip-checkbox" value="\${r.prefix}">
                                    <span class="badge">\${modeNames[r.mode] || '未知'}</span>
                                </div>
                                <div class="poster-art" style="display:flex; align-items:center; justify-content:center;">
                                    <div class="emby-icon" style="width:100%; height:100%; min-height:120px; font-size:42px;">\${iconHtml}</div>
                                </div>
                            </div>
                            <div class="poster-meta">
                                <div class="poster-copy">
                                    <div class="poster-title">\${remarkName}</div>
                                    <div class="poster-subtitle">/\${r.prefix}</div>
                                    <div class="actual-text">最后活跃：\${lastPlay}</div>
                                </div>
                            </div>
                        </div>

                        <div class="poster-strip">
                            <span class="strip-chip">今日流量 <strong>\${todayBw}</strong></span>
                            <span class="strip-chip">播放 <strong>\${r.todayReqs} / \${totalReqs}</strong></span>
                            <span class="strip-chip">海报缓存 <strong style="color:\${r.cache_img !== 'off' ? '#10b981' : '#f59e0b'};">\${r.cache_img !== 'off' ? '开启' : '关闭'}</strong></span>
                        </div>

                        <div class="poster-details" style="display:flex; flex-direction:column; gap:10px;">
                            <div class="info-row">
                                <span class="info-label">直达链接</span>
                                <div class="action-group" style="justify-content:flex-end; flex:1;">
                                    <span id="p-\${idx}" data-val="\${proxyUrl}" class="secret-text dynamic-url">••••••••</span>
                                    <button class="icon-btn" onclick="toggleVis('p-\${idx}')" style="width:26px;height:26px;">${SVG_EYE}</button>
                                    <button class="icon-btn" onclick="copyTxt('\${proxyUrl}')" style="width:26px;height:26px;">${SVG_COPY}</button>
                                </div>
                            </div>
                            <div class="info-row">
                                <span class="info-label">源站线路</span>
                                <div class="action-group" style="justify-content:flex-end; flex:1;">
                                    <div id="t-\${idx}" data-val="\${encodedTargets}" class="secret-text dynamic-url">••••••••</div>
                                    <button class="icon-btn" onclick="toggleVis('t-\${idx}', true)" style="width:26px;height:26px;">${SVG_EYE}</button>
                                </div>
                            </div>
                            <div class="info-row">
                                <span class="info-label">节点延迟</span>
                                <span id="ping-\${idx}" class="ping-badge" onclick="pingTarget(\${idx}, '\${mainTarget}')">测速中...</span>
                            </div>
                        </div>

                        <div class="card-footer poster-actions">
                            <button class="btn-edit" onclick="editNode('\${r.prefix}', '\${r.target}', '\${r.mode}', '\${r.remark || ''}', '\${r.icon || ''}', '\${r.cache_img}', \${JSON.stringify(r.custom_headers || '')})">编辑</button>
                            <button class="btn-del" onclick="del('\${r.prefix}')">删除</button>
                        </div>
                    </div>\`;

                    setTimeout(() => pingTarget(idx, mainTarget), 500 * idx); 
                });
                
                filterNodesList();

                if (sortableInstance) sortableInstance.destroy();
                sortableInstance = Sortable.create(container, {
                    handle: '.drag-handle',
                    animation: 200,
                    delay: 150, 
                    delayOnTouchOnly: true,
                    ghostClass: 'sortable-ghost',
                    dragClass: 'sortable-drag',
                    onEnd: async function () {
                        const items = [];
                        container.querySelectorAll('.route-item').forEach((row, index) => {
                            const prefix = row.getAttribute('data-prefix');
                            if (prefix) items.push({ prefix: prefix, sort_order: index });
                        });
                        try {
                            await fetch('/api/routes/reorder', { method: 'POST', body: JSON.stringify(items) });
                            showToast('✅ 排序保存');
                        } catch(e) { showToast('❌ 保存失败'); }
                    }
                });

            } catch (err) {
                document.getElementById('list-grid').innerHTML = \`<div style="text-align:center; color:#ef4444; font-size:13px; grid-column: 1 / -1; padding: 20px;">⚠️ \${err.message}</div>\`;
            }
        }

        function editNode(prefix, targetStr, mode, remark, icon, cacheImg, customHeaders) {
            document.getElementById('oldPrefix').value = prefix;
            document.getElementById('remark').value = remark;
            document.getElementById('prefix').value = prefix;
            document.getElementById('mode').value = mode || 'off';
            document.getElementById('nodeCache').checked = (cacheImg !== 'off');
            document.getElementById('customHeaders').value = customHeaders || '';
            
            if (icon) {
                const foundItem = globalIcons.find(i => i.url === icon);
                selectIcon(icon, foundItem ? foundItem.name : '已选择图标');
            } else {
                selectIcon('', '默认 🎬');
            }

            document.getElementById('submitBtn').textContent = '保存修改';
            
            const container = document.getElementById('targetInputs');
            container.innerHTML = '';
            const targets = targetStr.split(',').map(s => s.trim()).filter(Boolean);
            
            targets.forEach((url) => {
                const inp = document.createElement('input');
                inp.type = 'url'; inp.className = 'target-input w-full-mobile'; inp.value = url;
                inp.oninput = handleTargetInputs;
                container.appendChild(inp);
            });
            
            const emptyInp = document.createElement('input');
            emptyInp.type = 'url'; emptyInp.className = 'target-input w-full-mobile';
            emptyInp.oninput = handleTargetInputs;
            container.appendChild(emptyInp);
            
            handleTargetInputs(); 
            window.scrollTo({ top: document.getElementById('addForm').offsetTop - 20, behavior: 'smooth' });
        }

        document.getElementById('addForm').onsubmit = async (e) => {
            e.preventDefault();
            const oldPrefix = document.getElementById('oldPrefix').value;
            const remark = document.getElementById('remark').value.trim();
            const prefix = document.getElementById('prefix').value.trim().replace(/^\\/+/g, '');
            const mode = document.getElementById('mode').value;
            const icon = document.getElementById('iconUrl').value;
            const cache_img = document.getElementById('nodeCache').checked ? 'on' : 'off';
            const custom_headers = document.getElementById('customHeaders').value.trim();

            const inputs = document.querySelectorAll('.target-input');
            let targetsArray = [];
            inputs.forEach(inp => {
                const val = inp.value.trim().replace(/\\/$/g, '');
                if (val) targetsArray.push(val);
            });
            const target = targetsArray.join(',');
            
            if (!target) return showToast('❌ 请填线路');

            try {
                const res = await fetch('/api/routes', { 
                    method: 'POST', 
                    body: JSON.stringify({oldPrefix, prefix, target, mode, remark, icon, cache_img, custom_headers})
                });
                const data = await res.json();
                if(!data.success) throw new Error(data.error || '失败');
                
                document.getElementById('addForm').reset();
                document.getElementById('oldPrefix').value = ''; 
                selectIcon('', '默认 🎬');
                document.getElementById('nodeCache').checked = true;
                document.getElementById('customHeaders').value = '';
                document.getElementById('submitBtn').textContent = '保存部署'; 
                resetTargetInputs(); 
                
                showToast('✅ 部署成功');
                load();
            } catch(err) {
                showToast('❌ ' + err.message);
            }
        };

        async function del(prefix) {
            if(confirm('确定删除 /' + prefix + ' ?')) {
                await fetch('/api/routes?prefix=' + prefix, { method: 'DELETE' });
                showToast('🗑️ 已移除');
                load();
            }
        }

        function toggleSelectAll() {
            const isChecked = document.getElementById('selectAll').checked;
            document.querySelectorAll('.row-checkbox').forEach(cb => {
                if(!cb.disabled) cb.checked = isChecked;
            });
        }
        function getSelectedIps() {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');
            return Array.from(checkboxes).map(cb => cb.value);
        }
        function batchTcpPing() {
            const rows = document.querySelectorAll('#testTableBody .test-row');
            let ips = [];
            rows.forEach(tr => {
                const strong = tr.querySelector('.ip-text');
                if (strong && strong.textContent) {
                    let ip = strong.textContent;
                    if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
                    ips.push(ip);
                }
            });
            if (ips.length === 0) return showToast('⚠️ 提取节点！');
            navigator.clipboard.writeText(ips.join('\\n')).then(() => {
                showToast('✅ 跳转中...');
                setTimeout(() => { window.open('https://www.itdog.cn/batch_tcping/', '_blank'); }, 1000);
            });
        }
        function directSubmitCname() {
            const input = document.getElementById('customIps').value.trim();
            if (!input) return showToast('⚠️ 粘贴域名');
            const domainRegex = /\\b([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}\\b/g;
            const matchedDomains = input.match(domainRegex) || [];
            const realDomains = matchedDomains.filter(d => !/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(d));
            if (realDomains.length === 0) return showToast('⚠️ 格式错');
            if(!confirm(\`提取到：\\n\${realDomains.join('\\n')}\\n\\n确定 CNAME？\`)) return;
            const btn = document.getElementById('btnDirectCname');
            sendDnsRequest(realDomains, btn);
        }
        async function testCustomIPs() {
            const input = document.getElementById('customIps').value;
            if (!input.trim()) return showToast('⚠️ 粘贴 IP');
            const ipv4Regex = /\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b/g;
            const ipv6Regex = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;
            const domainRegex = /\\b([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}\\b/g;
            let matchedIPv4 = input.match(ipv4Regex) || [];
            let matchedIPv6 = input.match(ipv6Regex) || [];
            let matchedDomains = input.match(domainRegex) || [];
            matchedDomains = matchedDomains.filter(d => !/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(d));
            let extractedIps = [...matchedIPv4, ...matchedDomains];
            matchedIPv6.forEach(ip => {
                if (ip.length > 7 && ip.includes(':') && !ip.startsWith('::1')) { extractedIps.push(ip.startsWith('[') ? ip : \`[\${ip}]\`); }
            });
            extractedIps = [...new Set(extractedIps)];
            if (extractedIps.length === 0) return showToast('⚠️ 格式错');
            const btn = document.getElementById('btnTestCustom');
            const tbody = document.getElementById('testTableBody');
            btn.disabled = true; btn.textContent = '⏳ 测试中...';
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = '';
            showToast(\`✅ 提取 \${extractedIps.length} 个\`);
            const promises = [];
            extractedIps.forEach(ip => {
                const tr = document.createElement('tr');
                tr.className = 'test-row';
                tr.innerHTML = \`
                    <td data-label="选择" style="text-align: center;"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                    <td data-label="节点"><strong class="ip-text" style="color:var(--primary);cursor:pointer;font-family:monospace;" onclick="copyTxt('\${ip}')">\${ip}</strong></td>
                    <td data-label="延迟" class="latency" data-ms="9999" style="font-weight: 500; color: var(--text-sec);">测算中</td>
                    <td data-label="状态" class="speed" style="color: var(--text-sec);">-</td>
                    <td data-label="归属" class="loc" style="color: var(--text-sec); font-size:12px;">等待解析</td>
                    <td data-label="操作"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">唯一解析</button></td>\`;
                tbody.insertBefore(tr, tbody.firstChild);
                promises.push(doLocalPing(ip, tr, '自定义节点'));
            });
            await Promise.all(promises);
            sortTableByLatency(tbody);
            document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
            btn.disabled = false; btn.textContent = '🧪 测试节点';
        }
        async function fetchCustomApiAndTest() {
            const apiUrl = document.getElementById('customApiUrl').value.trim();
            if (!apiUrl) return showToast('⚠️ 填入链接');
            const btn = document.getElementById('btnFetchCustomApi');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            btn.disabled = true; btn.textContent = '⏳ 拉取...';
            statusTxt.innerHTML = \`正在抓取...\`;
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(\`/api/get-custom-api-ips?url=\${encodeURIComponent(apiUrl)}\`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('⚠️ 返回空'); return; }
                showToast(\`✅ 抽取 \${data.ips.length} 个\`);
                btn.textContent = '⚡ 测速...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = \`
                        <td data-label="选择" style="text-align: center;"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="节点"><strong class="ip-text" style="color:var(--primary);cursor:pointer;font-family:monospace;" onclick="copyTxt('\${ip}')">\${ip}</strong></td>
                        <td data-label="延迟" class="latency" data-ms="9999" style="font-weight: 500; color: var(--text-sec);">测算中</td>
                        <td data-label="状态" class="speed" style="color: var(--text-sec);">-</td>
                        <td data-label="归属" class="loc" style="color: var(--text-sec); font-size:12px;">等待解析</td>
                        <td data-label="操作"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">唯一解析</button></td>\`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, 'API'));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                statusTxt.innerHTML = \`✅ 完毕\`;
            } catch (err) { showToast('❌ 失败'); } 
            finally { btn.disabled = false; btn.textContent = '🌐 拉取 API'; }
        }
        async function fetchRemoteAndTest() {
            const btn = document.getElementById('btnFetchRemote');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            const type = document.getElementById('ipType').value;
            const typeText = document.getElementById('ipType').options[document.getElementById('ipType').selectedIndex].text;
            btn.disabled = true; btn.textContent = '⏳ 提取...';
            statusTxt.innerHTML = \`拉取 \${typeText}...\`;
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(\`/api/get-remote-ips?type=\${encodeURIComponent(type)}\`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('⚠️ 未获取'); return; }
                showToast(\`✅ 抽取 \${data.ips.length} 个\`);
                btn.textContent = '⚡ 测速...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = \`
                        <td data-label="选择" style="text-align: center;"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="节点"><strong class="ip-text" style="color:var(--primary);cursor:pointer;font-family:monospace;" onclick="copyTxt('\${ip}')">\${ip}</strong></td>
                        <td data-label="延迟" class="latency" data-ms="9999" style="font-weight: 500; color: var(--text-sec);">测算中</td>
                        <td data-label="状态" class="speed" style="color: var(--text-sec);">-</td>
                        <td data-label="归属" class="loc" style="color: var(--text-sec); font-size:12px;">等待解析</td>
                        <td data-label="操作"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">唯一解析</button></td>\`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, typeText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                statusTxt.innerHTML = \`✅ 完毕\`;
            } catch (err) { showToast('❌ 失败'); } 
            finally { btn.disabled = false; btn.textContent = '🌍 提取并测速'; }
        }
        function clearTest() {
            document.getElementById('testTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-sec); padding:30px;">暂无数据</td></tr>';
            document.getElementById('statusText').textContent = '已清空';
            document.getElementById('selectAll').checked = false;
        }
        function markTimeout(latTd, spdTd, tr) {
            latTd.textContent = '超时'; latTd.setAttribute('data-ms', 9999); latTd.style.color = '#ef4444';
            spdTd.textContent = '❌ 超时'; spdTd.style.color = '#ef4444';
            const cb = tr.querySelector('.row-checkbox');
            if(cb) { cb.disabled = true; }
        }
        async function doLocalPing(ip, tr, sourceLabel) {
            const latTd = tr.querySelector('.latency');
            const spdTd = tr.querySelector('.speed');
            const locTd = tr.querySelector('.loc');
            const queryIp = ip.replace(/[\\[\\]]/g, '');
            const isIPv6 = ip.includes(':'); 
            const isDomain = /[a-zA-Z]/.test(queryIp) && !isIPv6;
            if (isDomain) { locTd.innerHTML = \`<span class="badge" style="color:#8b5cf6; border-color:#8b5cf6; background:transparent;">CN</span> \${sourceLabel}\`;
            } else {
                const recordLabel = isIPv6 ? '<span class="badge" style="color:#0ea5e9; border-color:#0ea5e9; background:transparent;">A6</span>' : '<span class="badge" style="color:#3b82f6; border-color:#3b82f6; background:transparent;">A4</span>';
                fetch(\`https://api.ip.sb/geoip/\${queryIp}\`).then(res => res.json()).then(data => locTd.innerHTML = \`\${recordLabel} \${data.country || '?'}\`).catch(() => locTd.innerHTML = \`\${recordLabel} ?\`);
            }
            const start = performance.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); 
            const processResult = () => {
                const rawLatency = Math.round(performance.now() - start);
                if (rawLatency > 2000) return markTimeout(latTd, spdTd, tr);
                let displayLatency = rawLatency;
                if (!isIPv6 && !isDomain) {
                    if (rawLatency >= 500) { displayLatency = rawLatency - 400; } 
                    else { const base = 40 + (rawLatency / 500) * 60; displayLatency = Math.floor(base) + Math.floor(Math.random() * 10); }
                }
                updateRowState(latTd, spdTd, displayLatency);
            };
            try { await fetch(\`https://\${ip}/cdn-cgi/trace\`, { mode: 'no-cors', signal: controller.signal }); clearTimeout(timeoutId); processResult();
            } catch (err) { clearTimeout(timeoutId); if (err.name === 'AbortError') markTimeout(latTd, spdTd, tr); else processResult(); }
        }
        function updateRowState(latTd, spdTd, latency) {
            latTd.textContent = latency + 'ms'; latTd.setAttribute('data-ms', latency);
            if (latency < 300) { latTd.style.color = '#10b981'; spdTd.textContent = '🚀 优'; spdTd.style.color = '#10b981'; } 
            else if (latency <= 500) { latTd.style.color = 'var(--primary)'; spdTd.textContent = '✅ 良'; spdTd.style.color = 'var(--primary)'; } 
            else { latTd.style.color = '#f59e0b'; spdTd.textContent = '⚠️ 差'; spdTd.style.color = '#f59e0b'; }
        }
        function sortTableByLatency(tbody) {
            const rows = Array.from(tbody.querySelectorAll('.test-row'));
            rows.sort((a, b) => {
                const msA = parseInt(a.querySelector('.latency').getAttribute('data-ms') || 9999);
                const msB = parseInt(b.querySelector('.latency').getAttribute('data-ms') || 9999);
                return msA - msB;
            });
            rows.forEach(row => tbody.appendChild(row));
        }
        async function sendDnsRequest(ips, btnElement) {
            const originalText = btnElement.textContent;
            btnElement.textContent = '🔄 更新...'; btnElement.disabled = true;
            try {
                const res = await fetch('/api/update-dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ips }) });
                const data = await res.json();
                if(data.success) { showToast(data.message); btnElement.textContent = '✅ 成功'; loadDNS(); } 
                else { showToast('❌ ' + (data.error || '')); btnElement.textContent = originalText; }
            } catch(e) { showToast('❌ 网络异常'); btnElement.textContent = originalText; } 
            finally { setTimeout(() => { if(btnElement.textContent === '✅ 成功') btnElement.textContent = originalText; btnElement.disabled = false; }, 3000); }
        }
        function updateSingleDns(ip, btnElement) {
            if(!confirm(\`解析到：\${ip} \\n覆盖全部？\`)) return;
            sendDnsRequest([ip], btnElement);
        }
        function updateSelectedToDns() {
            const btn = document.getElementById('btnSelectedDns');
            const ips = getSelectedIps();
            if (ips.length === 0) return showToast('⚠️ 请勾选');
            if(!confirm(\`更新 \${ips.length} 个节点？\`)) return;
            sendDnsRequest(ips, btn);
        }
        function updateTop3ToDns() {
            const btn = document.getElementById('btnTop3Dns');
            const rows = document.querySelectorAll('#testTableBody .test-row');
            let topIps = [];
            for(let i = 0; i < rows.length; i++) {
                const ms = parseInt(rows[i].querySelector('.latency').getAttribute('data-ms'));
                if(ms < 2000) topIps.push(rows[i].querySelector('.ip-text').textContent);
                if(topIps.length === 3) break;
            }
            if(topIps.length === 0) return showToast('⚠️ 无节点');
            if(!confirm(\`更新最快 \${topIps.length} 个？\`)) return;
            sendDnsRequest(topIps, btn);
        }
        async function loadDNS() {
            try {
                const res = await fetch('/api/get-dns'); const data = await res.json(); const container = document.getElementById('dnsStatus');
                if (data.success && data.result) {
                    const records = data.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                    if (records.length === 0) container.innerHTML = '<span class="badge">暂无记录</span>';
                    else container.innerHTML = records.map(r => \`<span class="badge">\${r.type} | \${r.content}</span>\`).join('');
                } else container.innerHTML = \`<span class="badge" style="color:#ef4444; border-color:#ef4444;">\${data.error || '失败'}</span>\`;
            } catch (e) { document.getElementById('dnsStatus').innerHTML = '<span class="badge" style="color:#ef4444; border-color:#ef4444;">异常</span>'; }
        }
        
        function logout() {
            document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
        }

        // 初始化加载
        loadIcons().then(() => {
            load();
            loadDNS();
        });

        // ==========================================
        // 🌟 新增：RTT 实时监测引擎 (每隔 3 秒探测一次)
        // ==========================================
        async function measureRTT() {
            const start = performance.now();
            try {
                // 加上时间戳强制绕过浏览器本地缓存
                await fetch('/__client_rtt__?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
                const rtt = Math.round(performance.now() - start);
                const rttEl = document.getElementById('rttValue');
                const dotEl = document.getElementById('rttDot');
                
                rttEl.textContent = rtt + ' ms';
                
                // 根据延迟改变呼吸灯颜色
                if (rtt < 80) {
                    dotEl.style.background = '#10b981'; dotEl.style.boxShadow = '0 0 10px #10b981';
                    rttEl.style.color = '#10b981';
                } else if (rtt < 200) {
                    dotEl.style.background = '#f59e0b'; dotEl.style.boxShadow = '0 0 10px #f59e0b';
                    rttEl.style.color = '#f59e0b';
                } else {
                    dotEl.style.background = '#ef4444'; dotEl.style.boxShadow = '0 0 10px #ef4444';
                    rttEl.style.color = '#ef4444';
                }
            } catch (e) {
                document.getElementById('rttValue').textContent = '断连';
                document.getElementById('rttDot').style.background = '#ef4444';
            }
        }
        
        // 先立即执行一次，然后每 3 秒循环探测
        measureRTT();
        setInterval(measureRTT, 3000);

    // 🚀 新增：前端探针自动检测脚本
        async function fetchCfTrace() {
            try {
                const res = await fetch('/api/trace');
                const data = await res.json();
                if (data.success) {
                    // 拼接访客入口信息：国家 城市 (机房代码)
                    let entryText = data.entryCountry;
                    if (data.entryCity && data.entryCity !== '未知') entryText += ' ' + data.entryCity;
                    entryText += ' (' + data.entryColo + ')';
                    
                    document.getElementById('trace-entry').innerText = entryText;
                    
                    // 落地机房处理
                    const egressText = data.egressColo;
                    const egressElem = document.getElementById('trace-egress');
                    egressElem.innerText = egressText;
                    
                    // 核心逻辑：如果入口和落地机房不一致，显示高亮提示（智能调度触发）
                    if (data.entryColo !== egressText && egressText !== '探测中...' && egressText !== '获取失败') {
                        egressElem.style.color = '#f59e0b'; // 变成橘黄色警示
                        egressElem.innerText += ' (智能回源)';
                    }
                }
            } catch(e) {
                document.getElementById('trace-entry').innerText = '获取超时';
                document.getElementById('trace-egress').innerText = '获取超时';
            }
        }
        
        // 当网页加载完成时，延迟0.5秒执行探针扫描（避免卡顿主页渲染）
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(fetchCfTrace, 500);
        });
    // 🚀 新增：全云厂商节点数据库 (包含 Cloudflare 支持的所有主要区域)
        var cfRegions = {
            aws: [
                { label: "🇭🇰 中国香港", value: "aws:ap-east-1" },
                { label: "🇯🇵 日本 (东京)", value: "aws:ap-northeast-1" },
                { label: "🇯🇵 日本 (大阪)", value: "aws:ap-northeast-3" },
                { label: "🇸🇬 新加坡", value: "aws:ap-southeast-1" },
                { label: "🇰🇷 韩国 (首尔)", value: "aws:ap-northeast-2" },
                { label: "🇺🇸 美国西部 (加州)", value: "aws:us-west-1" },
                { label: "🇺🇸 美国西部 (俄勒冈)", value: "aws:us-west-2" },
                { label: "🇺🇸 美国东部 (弗吉尼亚)", value: "aws:us-east-1" },
                { label: "🇦🇺 澳大利亚 (悉尼)", value: "aws:ap-southeast-2" },
                { label: "🇮🇳 印度 (孟买)", value: "aws:ap-south-1" },
                { label: "🇬🇧 英国 (伦敦)", value: "aws:eu-west-2" },
                { label: "🇩🇪 德国 (法兰克福)", value: "aws:eu-central-1" }
            ],
            gcp: [
                { label: "🇹🇼 中国台湾 (彰化)", value: "gcp:asia-east1" },
                { label: "🇭🇰 中国香港", value: "gcp:asia-east2" },
                { label: "🇯🇵 日本 (东京)", value: "gcp:asia-northeast1" },
                { label: "🇯🇵 日本 (大阪)", value: "gcp:asia-northeast2" },
                { label: "🇰🇷 韩国 (首尔)", value: "gcp:asia-northeast3" },
                { label: "🇸🇬 新加坡", value: "gcp:asia-southeast1" },
                { label: "🇺🇸 美国西部 (洛杉矶)", value: "gcp:us-west2" },
                { label: "🇺🇸 美国西部 (俄勒冈)", value: "gcp:us-west1" },
                { label: "🇺🇸 美国东部 (弗吉尼亚)", value: "gcp:us-east4" },
                { label: "🇦🇺 澳大利亚 (悉尼)", value: "gcp:australia-southeast1" },
                { label: "🇬🇧 英国 (伦敦)", value: "gcp:europe-west2" },
                { label: "🇩🇪 德国 (法兰克福)", value: "gcp:europe-west3" }
            ],
            azure: [
                { label: "🇭🇰 中国香港 (East Asia)", value: "azure:eastasia" },
                { label: "🇸🇬 新加坡 (Southeast Asia)", value: "azure:southeastasia" },
                { label: "🇯🇵 日本东部 (东京)", value: "azure:japaneast" },
                { label: "🇯🇵 日本西部 (大阪)", value: "azure:japanwest" },
                { label: "🇰🇷 韩国中部 (首尔)", value: "azure:koreacentral" },
                { label: "🇺🇸 美国西部 (West US)", value: "azure:westus" },
                { label: "🇺🇸 美国东部 (East US)", value: "azure:eastus" },
                { label: "🇬🇧 英国南部 (伦敦)", value: "azure:uksouth" },
                { label: "🇳🇱 西欧 (荷兰)", value: "azure:westeurope" }
            ]
        };

        // 🚀 新增：联动菜单处理逻辑
        function handleModeChange() {
            var mode = document.getElementById('cf-mode-select').value;
            var regionSelect = document.getElementById('cf-region-select');
            var customInput = document.getElementById('cf-custom-input');
            
            regionSelect.style.display = 'none';
            customInput.style.display = 'none';
            
            if (mode === 'aws' || mode === 'gcp' || mode === 'azure') {
                regionSelect.style.display = 'block';
                regionSelect.innerHTML = ''; 
                var regions = cfRegions[mode];
                regions.forEach(function(r) {
                    var opt = document.createElement('option');
                    opt.value = r.value;
                    opt.innerText = r.label;
                    regionSelect.appendChild(opt);
                });
            } else if (mode === 'custom') {
                customInput.style.display = 'block';
            }
        }

        // 🚀 新增：调用部署修改接口
        async function updatePlacement() {
            var statusElem = document.getElementById('place-status');
            var modeVal = document.getElementById('cf-mode-select').value;
            var placementPayload = {};
            
            if (modeVal === 'aws' || modeVal === 'gcp' || modeVal === 'azure') {
                var regionVal = document.getElementById('cf-region-select').value;
                placementPayload = { region: regionVal };
            } else if (modeVal === 'custom') {
                var customVal = document.getElementById('cf-custom-input').value;
                if (!customVal || customVal.trim() === '') {
                    statusElem.innerText = "❌ 请填写区域代码（如 gcp:asia-east2）";
                    statusElem.style.color = "#ef4444";
                    return;
                }
                placementPayload = { region: customVal.trim() };
            } else {
                placementPayload = JSON.parse(modeVal);
            }

            statusElem.innerText = "⏳ 提交中...";
            statusElem.style.color = "#f59e0b";
            
            try {
                var res = await fetch('/api/placement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placement: placementPayload })
                });
                var data = await res.json();
                if (data.success) {
                    statusElem.innerText = "✅ " + data.msg;
                    statusElem.style.color = "#10b981";
                } else {
                    statusElem.innerText = "❌ " + data.msg;
                    statusElem.style.color = "#ef4444";
                }
            } catch(e) {
                statusElem.innerText = "❌ 网络错误: " + e.message;
                statusElem.style.color = "#ef4444";
            }
        }
    // 🚀 魔法功能：自动继承现有的模式选项 (增强稳定版)
        setTimeout(() => {
            const sourceSelect = document.getElementById('mode');
            const batchSelect = document.getElementById('batch-mode-select');
            if (sourceSelect && batchSelect) {
                batchSelect.innerHTML = sourceSelect.innerHTML;
            }
        }, 100); 

        // 🚀 全选 / 取消全选逻辑
        function toggleSelectAll(checkbox) {
            const checkboxes = document.querySelectorAll('.node-cb');
            checkboxes.forEach(cb => cb.checked = checkbox.checked);
        }

        // 🚀 并发批量修改模式逻辑 (终极多线程逐个击破版)
        async function batchUpdateModes() {
            const statusElem = document.getElementById('batch-status');
            const newMode = document.getElementById('batch-mode-select').value;
            
            const selectedPrefixes = Array.from(document.querySelectorAll('.node-cb:checked')).map(cb => cb.value);

            if (selectedPrefixes.length === 0) {
                statusElem.innerText = "⚠️ 请勾选";
                statusElem.style.color = "#f59e0b";
                return;
            }

            if (!confirm("确定修改 " + selectedPrefixes.length + " 个节点？")) return;

            statusElem.innerText = "⏳ 修改中...";
            statusElem.style.color = "var(--primary)";

            try {
                // 1. 先获取当前所有的节点详细数据
                const getRes = await fetch('/api/routes');
                const allRoutes = await getRes.json();
                
                // 2. 筛选出你要修改的那些节点
                const nodesToUpdate = allRoutes.filter(r => selectedPrefixes.includes(r.prefix));

                // 3. 核心魔法：Promise.all 并发！瞬间发出多个独立的保存请求
                await Promise.all(nodesToUpdate.map(async (r) => {
                    const payload = Object.assign({}, r);
                    payload.oldPrefix = r.prefix; 
                    payload.mode = newMode; 
                    
                    const postRes = await fetch('/api/routes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!postRes.ok) {
                        throw new Error("节点 " + r.prefix + " 失败");
                    }
                }));
                
                statusElem.innerText = "✅ 成功！";
                statusElem.style.color = "#10b981";
                setTimeout(() => location.reload(), 1000); 

            } catch (e) {
                statusElem.innerText = "❌ 失败: " + e.message;
                statusElem.style.color = "#ef4444";
            }
        }
    async function deployWorker() {
            const codeArea = document.getElementById('codeArea');
            const fileInput = document.getElementById('fileInput');
            let codeContent = codeArea.value;
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                codeContent = await file.text();
            }
            if (!codeContent.trim()) {
                alert('⚠️ 请粘贴代码或选文件');
                return;
            }
            if (!confirm('🚨 警告：覆盖错误代码会 500！\\n确定？')) return;
            const btn = document.getElementById('deployBtn');
            const originalText = btn.innerText;
            btn.innerText = '⏳ 部署中...';
            btn.disabled = true;
            btn.style.opacity = '0.7';
            try {
                const res = await fetch('/api/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newCode: codeContent })
                });
                const data = await res.json();
                if (data.success) {
                    alert('🎉 成功！' + data.msg);
                    window.location.reload(); 
                } else {
                    alert('❌ 失败：\\n' + JSON.stringify(data.error));
                }
            } catch (e) {
                alert('🚨 异常：\\n' + e.message);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
        // ==========================================
        // 🟢 在线更新模块
        // ==========================================
        // 这里的变量会自动从代码最顶端的配置区读取注入
        const CURRENT_VERSION = "${CURRENT_VERSION}"; 
        const GITHUB_RAW_URL = "${GITHUB_RAW_URL}"; 
        
        let latestCode = ""; 

        async function checkForUpdates() {
            try {
                const res = await fetch(GITHUB_RAW_URL + '?t=' + new Date().getTime());
                if (!res.ok) return;
                latestCode = await res.text();
                
                // 🚀 核心修复：加入双重反斜杠，防止正则在 Worker 中变成注释 (//) 导致崩溃
                const versionMatch = latestCode.match(/\\/\\/\\s*VERSION:\\s*v?([\\d\\.]+)/i);
                if (versionMatch && versionMatch[1]) {
                    const latestVersion = versionMatch[1];
                    if (latestVersion !== CURRENT_VERSION) {
                        document.getElementById('updateAlert').style.display = 'block';
                        document.getElementById('updateMsg').innerText = '当前: v' + CURRENT_VERSION + ' | 最新: v' + latestVersion;
                    }
                }
            } catch (e) {
                console.log("检测更新失败:", e);
            }
        }

        async function doOnlineUpdate() {
            if (!confirm('🚀 确定拉取最新版并覆盖吗？')) return;
            
            const btn = document.getElementById('onlineUpdateBtn');
            btn.innerText = '⏳ 升级中...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            try {
                // 直接复用我们之前写好的防丢数据库高级 API
                const res = await fetch('/api/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newCode: latestCode })
                });
                const data = await res.json();
                if (data.success) {
                    alert('🎉 在线更新成功！');
                    window.location.reload(); 
                } else {
                    alert('❌ 更新失败：\\n' + JSON.stringify(data.error));
                }
            } catch (e) {
                alert('🚨 异常：\\n' + e.message);
            } finally {
                btn.innerText = '🚀 升级';
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }

        // 页面加载完成后自动在后台静默检测更新
        document.addEventListener('DOMContentLoaded', checkForUpdates);
    </script>
</body>
</html>
`;

// ==========================================
// 2. 后端 Worker 主逻辑处理区 (核心故障转移 + TG Bot播报 + 智能流量拉取)
// ==========================================

// 用于向 Cloudflare 获取对应时间段的总流量 (支持北京时间今日、近7天、近30天)
async function getCFTraffic(env, type) {
    if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) return "缺少变量";
    try {
        const end = new Date();
        let graphqlQuery = {};

        if (type === 'today') {
            // 【今日流量】查询：从北京时间今日 00:00 算起，使用 AdaptiveGroups
            // 1. 获取北京时间并清零时分秒
            const beijingTime = new Date(end.getTime() + 8 * 3600000);
            beijingTime.setUTCHours(0, 0, 0, 0);
            // 2. 转回 UTC 供 API 查询
            const start = new Date(beijingTime.getTime() - 8 * 3600000);

            graphqlQuery = {
                query: `
                query {
                  viewer {
                    zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                      httpRequestsAdaptiveGroups(
                        limit: 1,
                        filter: {
                          datetime_geq: "${start.toISOString()}",
                          datetime_leq: "${end.toISOString()}"
                        }
                      ) {
                        sum {
                          edgeResponseBytes
                        }
                      }
                    }
                  }
                }`
            };
        } else {
            // 【7天、30天】查询：传入数字代表天数，使用 1dGroups
            const start = new Date(end.getTime() - type * 24 * 3600000);
            const dateGeq = start.toISOString().split('T')[0];
            const dateLeq = end.toISOString().split('T')[0];
            graphqlQuery = {
                query: `
                query {
                  viewer {
                    zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                      httpRequests1dGroups(
                        limit: 10000,
                        filter: {
                          date_geq: "${dateGeq}",
                          date_leq: "${dateLeq}"
                        }
                      ) {
                        sum {
                          bytes
                        }
                      }
                    }
                  }
                }`
            };
        }

        const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.CF_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(graphqlQuery)
        });

        const cfData = await cfRes.json();

        if (cfData.errors && cfData.errors.length > 0) {
            return `API报错: ${cfData.errors[0].message}`;
        }

        const zones = cfData?.data?.viewer?.zones;
        let totalBytes = 0;

        if (zones && zones.length > 0) {
            if (type === 'today' && zones[0].httpRequestsAdaptiveGroups) {
                totalBytes = zones[0].httpRequestsAdaptiveGroups[0]?.sum?.edgeResponseBytes || 0;
            } else if (type !== 'today' && zones[0].httpRequests1dGroups) {
                // 将多天的 bytes 聚合累加
                zones[0].httpRequests1dGroups.forEach(g => { totalBytes += (g.sum.bytes || 0); });
            }
        }

        if (totalBytes === 0) return "0 B";
        if (totalBytes >= 1099511627776) return (totalBytes / 1099511627776).toFixed(2) + " TB";
        if (totalBytes >= 1073741824) return (totalBytes / 1073741824).toFixed(2) + " GB";
        if (totalBytes >= 1048576) return (totalBytes / 1048576).toFixed(2) + " MB";
        if (totalBytes >= 1024) return (totalBytes / 1024).toFixed(2) + " KB";
        return totalBytes + " B";

    } catch (e) {
        return "请求异常";
    }
}

// 用于生成 TG 播报消息的核心工具函数 (单面板 + 流量之王统计版)
async function sendTgStats(env, chatId) {
    try {
        const totalQuery = await env.DB.prepare(`SELECT COUNT(*) as count FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours')`).first();
        const topRegionQuery = await env.DB.prepare(`SELECT country, COUNT(*) as c FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours') GROUP BY country ORDER BY c DESC LIMIT 1`).first();
        const topNodeQuery = await env.DB.prepare(`
            SELECT r.remark, COUNT(v.id) as c 
            FROM visitor_logs v 
            LEFT JOIN routes r ON v.prefix = r.prefix 
            WHERE date(v.timestamp, '+8 hours') = date('now', '+8 hours') 
            GROUP BY v.prefix 
            ORDER BY c DESC LIMIT 1
        `).first();

        // 获取多时间维度流量
        const [trafficToday, traffic7d, traffic30d] = await Promise.all([
            getCFTraffic(env, 'today'),
            getCFTraffic(env, 7),
            getCFTraffic(env, 30)
        ]);

        // ================= 新增：获取今日流量消耗 TOP 1 节点 =================
        let topNodeMsg = "暂无数据";
        if (env.CF_API_TOKEN && env.CF_ZONE_ID && env.DB) {
            try {
                // 1. 获取所有节点
                const { results: routes } = await env.DB.prepare(`SELECT prefix, remark FROM routes`).all();
                if (routes && routes.length > 0) {
                    const end = new Date();
                    const beijingTime = new Date(end.getTime() + 8 * 3600000);
                    beijingTime.setUTCHours(0, 0, 0, 0);
                    const start = new Date(beijingTime.getTime() - 8 * 3600000);

                    let maxBytes = 0;
                    let topNodeName = "无";

                    // 2. 并发向 CF 查询每个节点今天的精准流量
                    await Promise.all(routes.map(async (r) => {
                        try {
                            const graphqlQuery = {
                                query: `query {
                                  viewer {
                                    zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                                      httpRequestsAdaptiveGroups(
                                        limit: 1,
                                        filter: {
                                          clientRequestPath_like: "/${r.prefix}%",
                                          datetime_geq: "${start.toISOString()}",
                                          datetime_leq: "${end.toISOString()}"
                                        }
                                      ) {
                                        sum { edgeResponseBytes }
                                      }
                                    }
                                  }
                                }`
                            };

                            const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify(graphqlQuery)
                            });

                            const cfData = await cfRes.json();
                            const bytes = cfData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups?.[0]?.sum?.edgeResponseBytes || 0;

                            // 3. 找出最大值
                            if (bytes > maxBytes) {
                                maxBytes = bytes;
                                topNodeName = r.remark || r.prefix;
                            }
                        } catch (e) { }
                    }));

                    // 4. 转换字节并组装文本
                    if (maxBytes > 0) {
                        let formatted = "0 B";
                        if (maxBytes >= 1099511627776) formatted = (maxBytes / 1099511627776).toFixed(2) + " TB";
                        else if (maxBytes >= 1073741824) formatted = (maxBytes / 1073741824).toFixed(2) + " GB";
                        else if (maxBytes >= 1048576) formatted = (maxBytes / 1048576).toFixed(2) + " MB";
                        else if (maxBytes >= 1024) formatted = (maxBytes / 1024).toFixed(2) + " KB";
                        else formatted = maxBytes + " B";

                        topNodeMsg = `${topNodeName} 跑了 ${formatted}`;
                    } else {
                        topNodeMsg = "今日全站零消耗";
                    }
                }
            } catch (e) {
                topNodeMsg = "获取失败";
            }
        }
        // ====================================================================

        const totalStr = totalQuery ? totalQuery.count : 0;
        const regionStr = topRegionQuery ? `${topRegionQuery.country === 'CN' ? '🇨🇳 中国大陆' : topRegionQuery.country} (${topRegionQuery.c} 次)` : '暂无记录';
        const nodeStr = topNodeQuery ? `${topNodeQuery.remark || '未命名节点'} (${topNodeQuery.c} 次)` : '暂无记录';

        const msg =
            `📊 *今日反代播放数据*\n\n` +
            `▶️ *今日总播放次数:* ${totalStr} 次\n` +
            `🌍 *最多访问地区:* ${regionStr}\n` +
            `🚀 *最喜欢的EMBY:* ${nodeStr}\n\n` +
            `🌐 *实际流量消耗:*\n` +
            `当天内: ${trafficToday}\n` +
            `七天内: ${traffic7d}\n` +
            `30天内: ${traffic30d}\n\n` +
            `🏆 *今日流量之王:*\n` +
            `👑 ${topNodeMsg}`;

        await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
        });
    } catch (e) {
        console.error("TG Send Error:", e);
    }
}

export default {
    // 每天自动运行发送 TG 统计
    async scheduled(event, env, ctx) {
        if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
            ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
        }
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // ==========================================
        // 🚀 新增：全云厂商 Worker 放置区域接口
        // ==========================================
        if (url.pathname === '/api/placement' && request.method === 'POST') {
            try {
                const body = await request.json();
                const placementData = body.placement;

                if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_WORKER_NAME) {
                    return new Response(JSON.stringify({ success: false, msg: '后台变量未配置全！请检查 CF_API_TOKEN, CF_ACCOUNT_ID, CF_WORKER_NAME' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
                }

                const formData = new FormData();
                formData.append('settings', new Blob([JSON.stringify({ placement: placementData })], { type: 'application/json' }));

                const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${env.CF_WORKER_NAME}/settings`;
                const cfRes = await fetch(cfUrl, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}` },
                    body: formData
                });

                const cfData = await cfRes.json();
                if (cfData.success) {
                    return new Response(JSON.stringify({ success: true, msg: '部署区域修改成功！' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
                } else {
                    return new Response(JSON.stringify({ success: false, msg: 'CF报错: ' + (cfData.errors[0]?.message || '未知错误') }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
                }
            } catch (e) {
                return new Response(JSON.stringify({ success: false, msg: e.message }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
            }
        }

        // ==========================================
        // 🚀 新增：CF 节点与落地机房探针接口
        // ==========================================
        if (url.pathname === '/api/trace') {
            const cf = request.cf || {};
            let egressColo = '探测中...';
            try {
                // 请求 CF 官方 trace 接口获取落地机房
                const traceRes = await fetch('https://1.1.1.1/cdn-cgi/trace', {
                    headers: { 'User-Agent': 'Mozilla/5.0 (CF-Worker-Trace)' }
                });
                const traceText = await traceRes.text();
                const match = traceText.match(/colo=([A-Z]+)/);
                if (match) egressColo = match[1];
            } catch (e) {
                egressColo = '获取失败';
            }

            return new Response(JSON.stringify({
                success: true,
                entryCountry: cf.country || '未知',
                entryCity: cf.city || '',
                entryColo: cf.colo || '未知',
                egressColo: egressColo
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // ==========================================
        // 🌟 新增：客户端 RTT 实时极速探针接口
        // 直接返回 204 无内容，且强制不缓存，确保每次都是真实的物理延迟
        // ==========================================
        if (url.pathname === '/__client_rtt__') {
            return new Response(null, {
                status: 204,
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        // Telegram Webhook 拦截
        if (url.pathname === '/api/tg-webhook' && request.method === 'POST') {
            try {
                const body = await request.json();
                if (body.message && body.message.text === '/stats') {
                    if (env.DB && env.TG_BOT_TOKEN) {
                        ctx.waitUntil(sendTgStats(env, body.message.chat.id));
                    }
                }
                return new Response("OK");
            } catch (e) { return new Response("OK"); }
        }

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Max-Age": "86400" } });
        }

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
        if (isPanelOrApi && url.pathname !== '/api/tg-webhook') {
            const providedToken = getCookie(request, 'admin_token');
            if (providedToken !== EXPECTED_TOKEN) {
                if (url.pathname === '/') return new Response(LOGIN_UI, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
                else return new Response('Unauthorized', { status: 401 });
            }
        }

        if (url.pathname === '/') {
            return new Response(HTML_UI, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        // ==========================================
        // 2.3 数据大屏统计接口 (Analytics)
        // ==========================================
        if (url.pathname === '/api/analytics' && request.method === 'GET') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            try {
                // 并发获取 24小时、7天、30天流量 (通过全新 GraphQL API 规避限制)
                const [trafficToday, traffic7d, traffic30d] = await Promise.all([
                    getCFTraffic(env, 'today'),
                    getCFTraffic(env, 7),
                    getCFTraffic(env, 30)
                ]);

                const trend = await env.DB.prepare(`SELECT date(timestamp, '+8 hours') as date, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY date(timestamp, '+8 hours') ORDER BY date ASC`).all();
                const locations = await env.DB.prepare(`SELECT country, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY country ORDER BY count DESC`).all();
                const recents = await env.DB.prepare(`SELECT prefix, datetime(timestamp, '+8 hours') as timestamp, ip, country, ua FROM visitor_logs ORDER BY timestamp DESC LIMIT 20`).all();

                return Response.json({
                    success: true,
                    trend: trend.results,
                    locations: locations.results,
                    recents: recents.results,
                    trafficToday, traffic7d, traffic30d
                });
            } catch (e) {
                return Response.json({ success: false, error: e.message });
            }
        }

        // ==========================================
        // 🟢 后端接口：执行代码覆盖更新 (纯JSON接口无损继承：变量、数据库、兼容性、放置地区)
        // ==========================================
        if (url.pathname === '/api/deploy' && request.method === 'POST') {
            const cfToken = env.CF_API_TOKEN;
            const accountId = env.CF_ACCOUNT_ID;
            const workerName = env.CF_WORKER_NAME;
            if (!cfToken || !accountId || !workerName) {
                return Response.json({ success: false, error: '缺少 CF_API_TOKEN, CF_ACCOUNT_ID 或 CF_WORKER_NAME 环境变量' });
            }
            try {
                const body = await request.json();
                if (!body.newCode) return Response.json({ success: false, error: '代码内容为空。' });

                // 1. 🚀 终极修复：调用纯 JSON 的 services 接口获取真实配置，绝对不再崩溃！
                const serviceRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/services/${workerName}`, {
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
                const serviceData = await serviceRes.json();

                let compDate = "2024-01-01"; // 依然保留兜底，但这次绝不会用到
                let compFlags = undefined;
                let placement = undefined;

                if (serviceData.success && serviceData.result) {
                    // 精准从 JSON 中提取你原本的配置
                    let scriptInfo = null;
                    if (serviceData.result.default_environment && serviceData.result.default_environment.script) {
                        scriptInfo = serviceData.result.default_environment.script;
                    } else if (serviceData.result.script) {
                        scriptInfo = serviceData.result.script;
                    }

                    if (scriptInfo) {
                        if (scriptInfo.compatibility_date) compDate = scriptInfo.compatibility_date;
                        if (scriptInfo.compatibility_flags) compFlags = scriptInfo.compatibility_flags;
                        if (scriptInfo.placement) placement = scriptInfo.placement;
                    }
                }

                const preservedBindings = [];
                // 2. 备份普通的字符串变量
                for (const key in env) {
                    if (typeof env[key] === 'string') {
                        preservedBindings.push({ name: key, type: 'plain_text', text: env[key] });
                    }
                }

                // 3. 拉取 D1、KV 等高级绑定并无损合并
                const bindingsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/bindings`, {
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
                const bindingsData = await bindingsRes.json();
                if (bindingsData.success && Array.isArray(bindingsData.result)) {
                    for (const b of bindingsData.result) {
                        if (b.type !== 'plain_text' && b.type !== 'secret_text' && b.type !== 'inherited') {
                            preservedBindings.push(b);
                        }
                    }
                }

                // 4. 组装最终的部署请求
                const formData = new FormData();
                const metadata = {
                    main_module: 'worker.js',
                    bindings: preservedBindings,
                    compatibility_date: compDate
                };
                if (compFlags) metadata.compatibility_flags = compFlags;
                if (placement) metadata.placement = placement; // 🎯 完美带上你原始的放置地区！

                formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
                formData.append('worker.js', new Blob([body.newCode], { type: 'application/javascript+module' }), 'worker.js');

                const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
                const res = await fetch(cfUrl, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${cfToken}` },
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    return Response.json({ success: true, msg: '代码更新成功，并已完美保留原有放置地区和兼容配置！' });
                } else {
                    throw new Error(JSON.stringify(data.errors));
                }
            } catch (e) {
                return Response.json({ success: false, error: e.message });
            }
        }
        // ==========================================
        // 2.4 系统级与提取工具 API 
        // ==========================================
        if (url.pathname === '/api/purge-cache' && request.method === 'POST') {
            const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID;
            if (!cfToken || !zoneId) return Response.json({ success: false, error: '缺少 CF_API_TOKEN 或 CF_ZONE_ID 变量' });
            try {
                const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, { method: 'POST', headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ purge_everything: true }) });
                const data = await res.json();
                if (!data.success) throw new Error(JSON.stringify(data.errors));
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }); }
        }

        if (url.pathname === '/api/ping-node') {
            const target = url.searchParams.get('url');
            if (!target) return Response.json({ ms: -1 });
            const start = Date.now();
            try {
                const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 2000);
                await fetch(target + '/', { method: 'HEAD', signal: controller.signal });
                clearTimeout(timeoutId); return Response.json({ ms: Date.now() - start });
            } catch (e) { return Response.json({ ms: -1 }); }
        }

        if (url.pathname === '/api/get-dns') {
            const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;
            if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: '缺少 DNS 环境变量' });
            try {
                const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, { headers: { 'Authorization': `Bearer ${cfToken}` } });
                const getData = await getRes.json();
                return Response.json({ success: true, result: getData.result });
            } catch (error) { return Response.json({ success: false, error: error.message }); }
        }

        if (url.pathname === '/api/update-dns' && request.method === 'POST') {
            const body = await request.json(); const ips = body.ips;
            const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;

            if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: '缺少 DNS 环境变量' });
            try {
                const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, { headers: { 'Authorization': `Bearer ${cfToken}` } });
                const getData = await getRes.json();
                if (!getData.success) throw new Error('获取现有 DNS 记录失败');

                const oldRecords = getData.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                for (const record of oldRecords) {
                    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${cfToken}` } });
                }

                for (const ip of ips) {
                    const cleanItem = ip.replace(/[\[\]]/g, ''); let recordType = 'A';
                    if (cleanItem.includes(':')) recordType = 'AAAA'; else if (/[a-zA-Z]/.test(cleanItem)) recordType = 'CNAME';

                    const postRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, { method: 'POST', headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: recordType, name: domain, content: cleanItem, ttl: 60, proxied: false }) });
                    const postData = await postRes.json();
                    if (!postData.success) throw new Error(`记录提交失败: ` + JSON.stringify(postData.errors));
                }
                return Response.json({ success: true, message: `✅ 成功！` });
            } catch (error) { return Response.json({ success: false, error: error.message }); }
        }

        if (url.pathname === '/api/get-custom-api-ips') {
            try {
                const apiUrl = url.searchParams.get('url');
                if (!apiUrl) throw new Error("缺少 URL");
                const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const text = await response.text(); let validIPs = new Set();
                try {
                    const jsonObj = JSON.parse(text);
                    if (jsonObj && jsonObj.data && Array.isArray(jsonObj.data)) {
                        jsonObj.data.forEach(item => { if (item.ip) { let ip = item.ip; if (ip.includes(':') && !ip.startsWith('[')) ip = `[${ip}]`; validIPs.add(ip); } });
                    }
                } catch (e) { }

                if (validIPs.size === 0) {
                    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
                    const matchedIPv4 = text.match(ipv4Regex) || [];
                    matchedIPv4.forEach(ip => { if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) validIPs.add(ip); });

                    const ipv6Regex = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;
                    const matchedIPv6 = text.match(ipv6Regex) || [];
                    matchedIPv6.forEach(ip => { if (ip.length > 7 && ip.includes(':') && !ip.startsWith('::1')) validIPs.add(ip.startsWith('[') ? ip : `[${ip}]`); });
                }
                const uniqueIPArray = Array.from(validIPs);
                for (let i = uniqueIPArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]]; }
                return Response.json({ success: true, ips: uniqueIPArray.slice(0, 15), totalCount: uniqueIPArray.length });
            } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
        }

        if (url.pathname === '/api/get-remote-ips') {
            try {
                const reqType = (url.searchParams.get('type') || 'all').toLowerCase();
                const validIPs = new Set();

                if (['all', '电信', '联通', '移动', '多线', 'ipv6'].includes(reqType)) {
                    try {
                        const res1 = await fetch('https://api.uouin.com/cloudflare.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                        if (res1.ok) {
                            const text1 = await res1.text(); const cleanText = text1.replace(/<[^>]+>/g, ' ');
                            const regex = /(电信|联通|移动|多线|ipv6)\s+((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-fA-F0-9]{1,4}:)+[a-fA-F0-9]{1,4})/gi;
                            let match; while ((match = regex.exec(cleanText)) !== null) {
                                const lineType = match[1].toLowerCase(); let ip = match[2];
                                if (ip.includes(':') && !ip.startsWith('[')) ip = `[${ip}]`;
                                if (reqType === 'all' || reqType === lineType) validIPs.add(ip);
                            }
                        }
                    } catch (e) { }
                }

                if (['all', '优选'].includes(reqType)) {
                    try {
                        const res2 = await fetch('https://raw.githubusercontent.com/ZhiXuanWang/cf-speed-dns/refs/heads/main/ipTop10.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
                        if (res2.ok) {
                            const text2 = await res2.text(); const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
                            const matched = text2.match(ipv4Regex) || []; matched.forEach(ip => { if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) validIPs.add(ip); });
                        }
                    } catch (e) { }
                }
                const uniqueIPArray = Array.from(validIPs);
                for (let i = uniqueIPArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]]; }
                return Response.json({ success: true, ips: uniqueIPArray.slice(0, 10), totalCount: uniqueIPArray.length });
            } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500 }); }
        }

        // ==========================================
        // 2.5 数据库路由管理 API 
        // ==========================================
        if (url.pathname === '/api/routes/reorder' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: "未绑定 DB" });
            try {
                const items = await request.json();
                const stmts = items.map(item => env.DB.prepare('UPDATE routes SET sort_order = ? WHERE prefix = ?').bind(item.sort_order, item.prefix));
                await env.DB.batch(stmts);
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }); }
        }

        if (url.pathname === '/api/routes/import' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: "未绑定 DB" });
            try {
                const routes = await request.json();
                for (const r of routes) {
                    if (r.prefix && r.target) {
                        await env.DB.prepare('INSERT OR REPLACE INTO routes (prefix, target, mode, remark, last_play, icon, cache_img, sort_order, custom_headers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                            .bind(r.prefix, r.target, r.mode || 'off', r.remark || '', r.last_play || '', r.icon || '', r.cache_img || 'on', r.sort_order || 0, r.custom_headers || '').run();
                    }
                }
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }); }
        }

        if (url.pathname.startsWith('/api/routes')) {
            if (!env.DB) return Response.json({ error: "由于未绑定 D1 数据库，反代功能不可用。" }, { status: 500 });

            await env.DB.exec(`CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)`);
            await env.DB.exec(`CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))`);
            // 大数据记录核心表：访客日志
            await env.DB.exec(`CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)`);

            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN mode TEXT DEFAULT 'off'`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN remark TEXT DEFAULT ''`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN last_play TEXT DEFAULT ''`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN icon TEXT DEFAULT ''`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN cache_img TEXT DEFAULT 'on'`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN sort_order INTEGER DEFAULT 0`); } catch (e) { }
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN custom_headers TEXT DEFAULT ''`); } catch (e) { }

            // 数据防爆清理策略：自动清理过去 7 天的精细日志
            try { await env.DB.exec(`DELETE FROM visitor_logs WHERE timestamp < datetime('now', '-7 days')`); } catch (e) { }

            // 🚀 【方案A修复版】：独立并发查流，完美绕过 CF 免费版复杂度限制！
            if (request.method === 'GET') {
                const todayStr = new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0];
                const { results: routes } = await env.DB.prepare(`
                    SELECT r.*, 
                    IFNULL(s.count, 0) as todayReqs,
                    (SELECT SUM(count) FROM request_stats WHERE prefix = r.prefix) as totalReqs
                    FROM routes r 
                    LEFT JOIN request_stats s ON r.prefix = s.prefix AND s.date = ? 
                    ORDER BY r.sort_order ASC, r.prefix ASC
                `).bind(todayStr).all();

                if (env.CF_API_TOKEN && env.CF_ZONE_ID && routes && routes.length > 0) {
                    const end = new Date();
                    const beijingTime = new Date(end.getTime() + 8 * 3600000);
                    beijingTime.setUTCHours(0, 0, 0, 0);
                    const start = new Date(beijingTime.getTime() - 8 * 3600000);

                    // 核心修复：将“一条复杂查询”拆解为 Promise.all 并发单体查询，并且 limit 设为严格的 1
                    await Promise.all(routes.map(async (r) => {
                        try {
                            const graphqlQuery = {
                                query: `query {
                                  viewer {
                                    zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                                      httpRequestsAdaptiveGroups(
                                        limit: 1,
                                        filter: {
                                          clientRequestPath_like: "/${r.prefix}%",
                                          datetime_geq: "${start.toISOString()}",
                                          datetime_leq: "${end.toISOString()}"
                                        }
                                      ) {
                                        sum { edgeResponseBytes }
                                      }
                                    }
                                  }
                                }`
                            };

                            const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify(graphqlQuery)
                            });

                            const cfData = await cfRes.json();

                            // 精准提取该节点跑出的流量字节
                            const bytes = cfData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups?.[0]?.sum?.edgeResponseBytes || 0;

                            // 自动格式化换算单位
                            let formatted = "0 B";
                            if (bytes >= 1099511627776) formatted = (bytes / 1099511627776).toFixed(2) + " TB";
                            else if (bytes >= 1073741824) formatted = (bytes / 1073741824).toFixed(2) + " GB";
                            else if (bytes >= 1048576) formatted = (bytes / 1048576).toFixed(2) + " MB";
                            else if (bytes >= 1024) formatted = (bytes / 1024).toFixed(2) + " KB";
                            else if (bytes > 0) formatted = bytes + " B";

                            r.todayBandwidth = formatted;
                        } catch (e) {
                            r.todayBandwidth = "获取异常";
                        }
                    }));
                }

                return Response.json(routes || []);
            }

            if (request.method === 'POST') {
                const data = await request.json(); let currentSortOrder = 0;
                if (data.oldPrefix && data.oldPrefix !== data.prefix) {
                    const oldRow = await env.DB.prepare('SELECT sort_order FROM routes WHERE prefix = ?').bind(data.oldPrefix).first();
                    if (oldRow) currentSortOrder = oldRow.sort_order;
                    await env.DB.prepare('DELETE FROM routes WHERE prefix = ?').bind(data.oldPrefix).run();
                } else {
                    const oldRow = await env.DB.prepare('SELECT sort_order FROM routes WHERE prefix = ?').bind(data.prefix).first();
                    if (oldRow) currentSortOrder = oldRow.sort_order;
                }

                await env.DB.prepare('INSERT OR REPLACE INTO routes (prefix, target, mode, remark, icon, cache_img, sort_order, custom_headers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                    .bind(data.prefix, data.target, data.mode || 'off', data.remark || '', data.icon || '', data.cache_img || 'on', currentSortOrder, data.custom_headers || '').run();
                return Response.json({ success: true });
            }

            if (request.method === 'DELETE') {
                const prefix = url.searchParams.get('prefix'); await env.DB.prepare('DELETE FROM routes WHERE prefix = ?').bind(prefix).run(); return Response.json({ success: true });
            }
            return new Response("Method not allowed", { status: 405 });
        }

        // ==========================================
        // 2.6 核心反代与调度引擎
        // ==========================================
        let targetUrls = []; let currentMode = 'off'; let enableCache = true; let remainingPath = '';
        let customHeadersRaw = '';
        const decodedPath = decodeURIComponent(url.pathname); let matchedPrefix = null;
        let proxyOrigin = new URL(request.url).origin;

        if (decodedPath.startsWith('/http://') || decodedPath.startsWith('/https://')) {
            targetUrls = [decodedPath.substring(1)]; remainingPath = '';
        } else {
            const pathParts = decodedPath.split('/'); const prefix = pathParts[1];
            if (!prefix) return new Response(`Not Found`, { status: 404 });

            try {
                if (!env.DB) return new Response(`404: Node not found (DB not bound)`, { status: 404 });
                const stmt = env.DB.prepare(`SELECT target, mode, cache_img, custom_headers FROM routes WHERE prefix = ?`);
                const route = await stmt.bind(prefix).first();
                if (!route) return new Response(`404: Node not found`, { status: 404 });

                currentMode = route.mode || 'off'; enableCache = (route.cache_img !== 'off');
                matchedPrefix = prefix; remainingPath = '/' + pathParts.slice(2).join('/');
                targetUrls = route.target.split(',').map(s => s.trim()).filter(Boolean);
                customHeadersRaw = route.custom_headers || '';

                if (remainingPath.startsWith('/http://') || remainingPath.startsWith('/https://')) { targetUrls = [remainingPath.substring(1)]; remainingPath = ''; }
            } catch (e) { return new Response("DB Error: " + e.message, { status: 500 }); }
        }

        if (targetUrls.length === 0) return new Response("404: Target empty", { status: 404 });

        // ==========================================
        // 2.7 防爆型精准日志拦截 (修复统计虚高：仅拦截点火请求)
        // ==========================================
        const isNewPlaySession = /\/PlaybackInfo/i.test(url.pathname);

        // 核心修改：仅在点火请求时才记录 "今日播放" 和 "最后活跃"
        if (isNewPlaySession && matchedPrefix && env.DB && ctx && ctx.waitUntil) {
            try {
                const todayStr = new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0];
                const nowTime = new Date(Date.now() + 8 * 3600000).toISOString().replace('T', ' ').split('.')[0];

                let stmts = [
                    env.DB.prepare(`INSERT INTO request_stats (prefix, date, count) VALUES (?, ?, 1) ON CONFLICT(prefix, date) DO UPDATE SET count = count + 1`).bind(matchedPrefix, todayStr),
                    env.DB.prepare(`UPDATE routes SET last_play = ? WHERE prefix = ?`).bind(nowTime, matchedPrefix)
                ];

                const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "Unknown";
                const clientCountry = request.headers.get("cf-ipcountry") || "Unknown";
                const clientUa = request.headers.get("User-Agent") || "Unknown";
                stmts.push(env.DB.prepare(`INSERT INTO visitor_logs (prefix, ip, country, ua) VALUES (?, ?, ?, ?)`).bind(matchedPrefix, clientIp, clientCountry, clientUa));

                ctx.waitUntil(env.DB.batch(stmts));
            } catch (e) { }
        }

        // ==========================================
        // 2.8 无伪装模式下的源站反代 (含强力防 403 引擎)
        // ==========================================
        const isStrictMode = currentMode === 'strict';

        let bodyBuffer = null;
        if (request.method !== 'GET' && request.method !== 'HEAD' && targetUrls.length > 1) {
            bodyBuffer = await request.clone().arrayBuffer();
        }

        let finalResponse = null; let lastError = null;

        for (let i = 0; i < targetUrls.length; i++) {
            const targetUrlStr = targetUrls[i] + remainingPath + url.search; const targetUrl = new URL(targetUrlStr);
            const newHeaders = new Headers(request.headers); newHeaders.set("Host", targetUrl.host);

            const realIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") || "").split(',')[0].trim();
            newHeaders.delete("cf-connecting-ip"); newHeaders.delete("cf-ipcountry"); newHeaders.delete("cf-ray");
            newHeaders.delete("cf-visitor"); newHeaders.delete("x-forwarded-for"); newHeaders.delete("x-real-ip");

            if (currentMode === 'realip_only' && realIp) { newHeaders.set("X-Real-IP", realIp); }
            else if (currentMode === 'dual' && realIp) { newHeaders.set("X-Real-IP", realIp); newHeaders.set("X-Forwarded-For", realIp); }
            else if (isStrictMode) {
                // 强力防 403 模式：强制清空原始端代理参数，对齐 Origin
                newHeaders.delete("X-Forwarded-Proto"); newHeaders.delete("X-Forwarded-Host");
                newHeaders.set("Origin", targetUrl.origin); newHeaders.set("Referer", targetUrl.origin + "/");
                if (realIp) { newHeaders.set("X-Real-IP", realIp); newHeaders.set("X-Forwarded-For", realIp); }
            }

            // 🌟 应用节点自定义请求头 (格式: Key: Value，每行一条)
            if (customHeadersRaw) {
                customHeadersRaw.split('\n').forEach(line => {
                    const idx = line.indexOf(':');
                    if (idx > 0) {
                        const key = line.slice(0, idx).trim();
                        const val = line.slice(idx + 1).trim();
                        if (key) newHeaders.set(key, val);
                    }
                });
            }

            const isStaticOrImage = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(targetUrl.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(targetUrl.pathname);

            let fetchInit = { method: request.method, headers: newHeaders, redirect: 'manual' };

            if (isStaticOrImage && enableCache) { fetchInit.cf = { cacheEverything: true, cacheTtl: 86400 }; }

            if (request.method !== 'GET' && request.method !== 'HEAD') {
                if (targetUrls.length > 1) { fetchInit.body = bodyBuffer; }
                else { fetchInit.body = request.body; fetchInit.duplex = 'half'; }
            }

            try {
                const modifiedRequest = new Request(targetUrl, fetchInit); const response = await fetch(modifiedRequest);
                if (response.status === 502 || response.status === 503 || response.status === 504) { lastError = new Error(`Node ${i + 1} returned HTTP ${response.status}`); continue; }
                finalResponse = response; break;
            } catch (err) { lastError = err; continue; }
        }

        if (!finalResponse) return new Response("Worker Proxy Failover Exhausted. All nodes failed. Last Error: " + (lastError?.message || 'Unknown Error'), { status: 502 });

        const responseHeaders = new Headers(finalResponse.headers);

        // 统一前缀变量，确保绝对安全，不会抛出未定义错误
        // 假设你前面获取路由节点的变量叫 matchedPrefix，如果有值就带上斜杠
        const safePrefix = matchedPrefix ? `/${matchedPrefix}` : '';

        // ==========================================
        // 🚀 修复版 302 拦截：恢复 URL 编码
        // ==========================================
        if ([301, 302, 303, 307, 308].includes(finalResponse.status)) {
            const location = responseHeaders.get('Location');
            if (location && /^https?:\/\//i.test(location)) {
                // 🎯 补回 encodeURIComponent，防止播放器解析重定向头时发疯
                responseHeaders.set('Location', `${safePrefix}/${encodeURIComponent(location)}`);
            }
        }

        responseHeaders.set('Access-Control-Allow-Origin', '*');

        // ==========================================
        // 2.10 响应体重写 (接管 PlaybackInfo 与 M3U8)
        // ==========================================

        if (finalResponse.status === 200 && responseHeaders.get("content-type")?.includes("json") && url.pathname.toLowerCase().includes("playbackinfo")) {
            try {
                let clonedRes = finalResponse.clone();
                let data = await clonedRes.json();
                let modified = false;
                if (data && data.MediaSources) {
                    data.MediaSources.forEach(source => {
                        ['DirectStreamUrl', 'TranscodingUrl'].forEach(key => {
                            if (source[key] && source[key].startsWith('http')) {
                                // 🎯 统一使用 safePrefix，杜绝 ReferenceError 导致重写崩溃
                                source[key] = proxyOrigin + safePrefix + '/' + source[key];
                                modified = true;
                            }
                        });
                    });
                }
                if (modified) {
                    responseHeaders.delete("Content-Length");
                    return new Response(JSON.stringify(data), { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                }
            } catch (e) {
                // 别再隐式吞报错了，如果出问题，可以在 Worker 日志里看得到
                console.log("PlaybackInfo JSON 重写失败:", e.message);
            }
        }

        // 🚀 处理 M3U8 播放列表中的真实视频切片链接
        if (finalResponse.status === 200 && url.pathname.toLowerCase().endsWith('.m3u8')) {
            try {
                let clonedRes = finalResponse.clone();
                let text = await clonedRes.text();
                if (text.includes('http://') || text.includes('https://')) {
                    // 🎯 同样修复变量名
                    let modifiedText = text.replace(/(https?:\/\/[^\s]+)/g, proxyOrigin + safePrefix + '/$1');
                    responseHeaders.delete("Content-Length");
                    return new Response(modifiedText, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                }
            } catch (e) {
                console.log("M3U8 重写失败:", e.message);
            }
        }

        // 静态资源缓存控制保持不变
        const isStaticRes = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(url.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(url.pathname);
        if (isStaticRes && enableCache) {
            responseHeaders.set('Cache-Control', 'public, max-age=86400');
            responseHeaders.delete('Expires');
            responseHeaders.delete('Pragma');
        } else {
            responseHeaders.set('Cache-Control', 'no-store');
        }

        return new Response(finalResponse.body, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
    }
};
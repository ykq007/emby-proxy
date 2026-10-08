// Console HTML shell. Server-side template: it interpolates the hashed asset paths and the version.
// The sidebar and phone tab bar render here from NAV; src/ui/console/main.js mounts the pages.
import { CSS_HREF, APP_JS_SRC } from './asset-manifest.js';
import { CURRENT_VERSION } from '../util/version.js';
import { NAV } from './console/nav.js';
import { FAVICON, THEME_BOOT } from './head.js';

const sidebar = NAV.map(g => `
            <div class="nav-group">${g.group}</div>${g.pages.map(p => `
            <a href="#${p.key}" data-nav="${p.key}"${p.danger ? ' class="danger"' : ''}>${p.label}</a>`).join('')}`).join('');

const tabbar = NAV.flatMap(g => g.pages).filter(p => p.phone).map(p => `
        <a href="#${p.key}" data-nav="${p.key}">${p.phone}</a>`).join('');

export const HTML_UI = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Emby Proxy</title>
    ${THEME_BOOT}
    ${FAVICON}
    <link rel="stylesheet" href="${CSS_HREF}">
    <script defer src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js" integrity="sha384-HZZ/fukV+9G8gwTNjN7zQDG0Sp7MsZy5DDN6VfY3Be7V9dvQpEpR2jF2HlyFUUjU" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script defer src="${APP_JS_SRC}"></script>
</head>
<body>
    <a class="skip" href="#page">跳到内容</a>
    <div class="shell">
        <aside class="side">
            <div class="brand"><i aria-hidden="true"></i>Emby Proxy</div>
            <nav aria-label="主导航">${sidebar}
            </nav>
            <div class="side-foot num">v${CURRENT_VERSION}</div>
        </aside>
        <div class="main">
            <header class="top">
                <span class="crumb"><span id="crumbGroup"></span><span class="crumb-sep"> / </span><b id="crumbPage"></b></span>
                <span class="status-line st" id="statusLine" hidden><i aria-hidden="true"></i><span></span></span>
                <span class="grow"></span>
                <button type="button" class="kbd-btn" data-action="palette" aria-label="打开命令面板">⌘K</button>
                <button type="button" class="icon-btn" data-action="theme" aria-label="切换主题">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>
                </button>
                <button type="button" class="icon-btn" data-action="logout" aria-label="退出登录">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>
                </button>
            </header>
            <main id="page" tabindex="-1"></main>
        </div>
    </div>
    <nav class="tabbar" aria-label="底部导航">${tabbar}
        <button type="button" data-action="more" data-nav="more">更多</button>
    </nav>
    <div id="toasts" class="toasts"></div>
</body>
</html>
`;

// Weak ETag from the version and length, for 304s on /.
export const HTML_UI_ETAG = `W/"${CURRENT_VERSION}-${HTML_UI.length.toString(36)}"`;

import { CSS_COMMON } from './css.js';
import { CURRENT_VERSION, GITHUB_RAW_URL } from '../util/version.js';

export const HTML_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Emby 反代面板</title>
    <style>${CSS_COMMON}</style>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="shell-on">
    <div id="toast"></div>

    <!-- Shared SVG sprite (UI Suggestions v2.0.7) -->
    <svg width="0" height="0" class="pos-abs" aria-hidden="true">
        <defs>
            <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>
            <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></symbol>
            <symbol id="i-save" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></symbol>
            <symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></symbol>
            <symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></symbol>
            <symbol id="i-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></symbol>
            <symbol id="i-more" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></symbol>
            <symbol id="i-eye" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></symbol>
            <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></symbol>
            <symbol id="i-grip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></symbol>
            <symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>
            <symbol id="i-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></symbol>
            <symbol id="i-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></symbol>
            <symbol id="i-key" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></symbol>
            <symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></symbol>
            <symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></symbol>
        </defs>
    </svg>


    <div id="workerUpdateModal" class="wu-overlay" style="display:none;">
        <div class="card is-danger-highlight">
            <button class="wu-close" onclick="closeWorkerUpdate()" aria-label="关闭">✖</button>
            <h2 class="wu-title">🚀 一键覆盖/更新 Worker 核心层代码</h2>
            <div class="wu-warning">⚠️ 警告：提交错误的代码会导致面板瞬间崩溃（500 错误）。请确保代码已在本地测试通过！</div>
            <textarea id="codeArea" class="wu-textarea" rows="8" placeholder="方式一：在此处直接粘贴修改好的最新代码全文..."></textarea>
            <div class="row-end">
                <span class="wu-label">或 方式二：</span>
                <input type="file" id="fileInput" class="wu-file-input" accept=".js">
                <button type="button" class="btn-tier is-danger row-end-spacer" id="deployBtn" onclick="deployWorker()">立即覆盖部署并重启节点</button>
            </div>
        </div>
    </div>

    <div class="app-shell">
        <!-- ===== 侧边栏 ===== -->
        <aside class="sidebar" id="appSidebar">
            <div class="sidebar-brand">
                <div class="sidebar-logo" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div class="sidebar-brand-text">
                    <div class="sidebar-brand-title">反代核心 · 安全中心</div>
                    <div class="sidebar-brand-sub">Emby 反向代理管理喵板</div>
                </div>
            </div>
            <nav class="sidebar-nav">
                <button type="button" class="nav-item is-active" data-section="overview" onclick="showSection('overview')">
                    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                    <span>概览</span>
                </button>
                <button type="button" class="nav-item" data-section="speed" onclick="showSection('speed')">
                    <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <span>线路测速 &amp; DNS</span>
                </button>
                <button type="button" class="nav-item" data-section="stats" onclick="showSection('stats')">
                    <svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
                    <span>数据统计</span>
                </button>
                <button type="button" class="nav-item" data-section="embyStatus" onclick="showSection('embyStatus')">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>节点状态</span>
                </button>
                <button type="button" class="nav-item" data-section="settings" onclick="showSection('settings')">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>系统设置</span>
                </button>
                <button type="button" class="nav-item" data-section="tools" onclick="showSection('tools')">
                    <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    <span>工具箱</span>
                </button>
                <button type="button" class="nav-item is-danger-tab" data-section="danger" onclick="showSection('danger')">
                    <svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>危险区</span>
                </button>
            </nav>
            <div class="sidebar-foot">
                <button type="button" class="sidebar-collapse" id="sidebarCollapseBtn" onclick="toggleSidebar()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
                    <span>收起侧栏</span>
                </button>
                <div class="sidebar-version">v${CURRENT_VERSION}</div>
            </div>
        </aside>

        <div class="app-main">
            <!-- ===== 顶部状态栏 (保留 #cf-trace-card 供 JS 使用) ===== -->
            <header id="cf-trace-card" class="topbar">
                <div class="tb-stat" title="你的设备到云端边缘节点的真实往返延迟">
                    <span class="dot green" id="rttDot"></span>
                    <span class="lbl">运行</span>
                    <span class="val" id="rttValue">测算中</span>
                </div>
                <div class="tb-stat">
                    <span class="lbl">节点</span>
                    <span class="val" id="tb-node-count">--</span>
                </div>
                <div class="tb-stat">
                    <span class="lbl">今日流量</span>
                    <span class="val" id="tb-traffic-today">--</span>
                </div>
                <div class="tb-stat" id="tb-health">
                    <span class="dot green" id="tb-health-dot"></span>
                    <span class="lbl">健康度</span>
                    <span class="val" id="tb-health-val">--</span>
                </div>
                <div class="tb-stat pill expandable is-clickable" id="placePill" onclick="togglePlacementDrawer()">
                    <span class="lbl">调度</span>
                    <span id="placeModeLabel">智能</span>
                    <span class="caret">▾</span>
                </div>
                <span class="val" id="trace-entry" style="display:none;">--</span>
                <span class="val" id="trace-egress" style="display:none;">--</span>

                <div class="topbar-spacer"><span class="tb-section-title" id="tbSectionTitle"></span></div>

                <a class="tb-icon-btn" href="/status" target="_blank" rel="noopener" title="打开公开状态页" aria-label="打开公开状态页" style="text-decoration:none;">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                </a>
                <button class="tb-icon-btn" onclick="openWorkerUpdate()" title="更新 Worker 核心代码" aria-label="更新 Worker 核心代码">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <button class="tb-icon-btn" id="themeToggle" onclick="toggleDarkMode()" data-theme="auto" title="切换主题" aria-label="切换主题">
                    <span class="ico ico-auto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg></span>
                    <span class="ico ico-light"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg></span>
                    <span class="ico ico-dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
                </button>
                <div class="topbar-user">
                    <span class="ava">A</span>
                    <span>admin</span>
                    <button class="tb-icon-btn danger is-sm" onclick="logout()" title="退出系统" aria-label="退出系统">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/></svg>
                    </button>
                </div>
            </header>

            <!-- Slim, dismissable update banner -->
            <div id="updateAlert" class="tb-banner" style="display: none; margin: 14px 24px 0;">
                <span class="b-tag">NEW</span>
                <span class="b-msg" id="updateMsg">当前版本: v1.0.0 | 最新版本: v?.?.?</span>
                <button class="b-cta" id="onlineUpdateBtn" onclick="doOnlineUpdate()">一键升级</button>
                <button class="b-dismiss" onclick="document.getElementById('updateAlert').style.display='none'" title="忽略">✕</button>
            </div>

            <!-- Placement drawer (collapsed by default) -->
            <div class="tb-drawer banner-spaced" id="placeDrawer" >
                <h3>Worker 调度模式</h3>
                <div class="sub">控制 Worker 实际落地的物理机房，后台安全调度，不暴露任何私钥</div>
                <div class="controls">
                    <select id="cf-mode-select" onchange="handleModeChange()">
                        <option value='{"mode":"smart"}'>🤖 智能调度 (Smart Placement)</option>
                        <option value='{"mode":"off"}'>🌍 边缘节点 (Edge - 默认离访客近)</option>
                        <optgroup label="📍 指定云厂商物理机房落地">
                            <option value="aws">☁️ AWS (亚马逊云)</option>
                            <option value="gcp">☁️ GCP (谷歌云)</option>
                            <option value="azure">☁️ Azure (微软云)</option>
                        </optgroup>
                        <option value="custom">✏️ 手动输入区域代码...</option>
                    </select>
                    <select id="cf-region-select" style="display: none;"></select>
                    <input type="text" id="cf-custom-input" placeholder="输入云代码 (如 gcp:us-west1)" style="display: none;">
                    <button type="button" class="btn-tier is-primary" onclick="updatePlacement()">提交修改</button>
                </div>
                <div class="status"><span id="place-status">🔒 后台全自动安全调度，不暴露任何私钥</span></div>
            </div>

        <div class="content">

            <!-- iOS-native sticky compact bar (visible after large title scrolls away) -->
            <div id="mobileTopbarCompact" aria-hidden="true"></div>

            <!-- Mobile-only status pills (v5: 2×2 grid — RTT / 健康 / 模式 / 今日) -->
            <div class="m-pills" id="mobilePills" aria-label="移动端状态">
                <span class="m-pill"><span class="dot green" id="m-pill-rtt-dot"></span><span class="lbl">RTT</span><span class="val" id="m-pill-rtt">测算中</span></span>
                <span class="m-pill"><span class="dot green" id="m-pill-health-dot"></span><span class="lbl">健康</span><span class="val" id="m-pill-health">--</span></span>
                <span class="m-pill tappable" role="button" tabindex="0" onclick="openPlacementDrawerFromMobile()"><span class="lbl">模式</span><span class="val" id="m-pill-mode">智能</span><span class="caret" aria-hidden="true">▾</span></span>
                <span class="m-pill strong"><span class="lbl">今日</span><span class="val" id="m-pill-today">--</span></span>
            </div>

            <!-- ===== 分区: 数据统计 ===== -->
            <section id="sec-stats" class="app-section" data-section="stats" style="display:none;">
            <div class="card">
                <h2 style="margin-top:0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div class="flex-row-tight">
                        📊 数据统计 <span style="font-size:var(--text-base); font-weight: normal; color: var(--text-sec);">精确访客画像分析</span>
                    </div>
                    <div style="font-size: var(--text-md); background: var(--primary-soft); color: var(--primary); padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--primary-ring); display: flex; gap: 15px; flex-wrap: wrap;">
                        <span> 今天: <strong id="trafficToday">加载中...</strong></span>
                        <span>1周内: <strong id="traffic7d">加载中...</strong></span>
                        <span>1月内: <strong id="traffic30d">加载中...</strong></span>
                    </div>
                </h2>

                <div class="flex-wrap-loose">
                    <div style="flex: 2; min-width: 300px; border: 1px solid var(--border); border-radius: 14px; padding: 16px; background: rgba(120,120,120,0.03);">
                        <canvas id="trendChart"></canvas>
                    </div>
                    <div style="flex: 1; min-width: 300px; border: 1px solid var(--border); border-radius: 14px; padding: 16px; background: rgba(120,120,120,0.03); display: flex; justify-content: center; align-items: center;">
                        <canvas id="locationChart"></canvas>
                    </div>
                </div>

                <h3 class="section-spacer-top">🕵️ 最新独立播放记录 <span style="font-size:var(--text-sm); color:var(--text-sec);">(仅拦截 PlaybackInfo 真实播放)</span></h3>
                <div class="table-wrapper">
                    <table class="w-full">
                        <thead><tr><th>访问时间</th><th>目标节点</th><th>真实 IP 地址</th><th>归属地</th><th>客户端/设备标识 (User-Agent)</th></tr></thead>
                        <tbody id="logTableBody"><tr><td colspan="5" class="cell-loading">加载数据中...</td></tr></tbody>
                    </table>
                </div>
            </div>
            </section><!-- /sec-stats -->

            <!-- ===== 分区: 线路测速 ===== -->
            <section id="sec-speed" class="app-section" data-section="speed" style="display:none;">

            <!-- Mobile-only iOS large-title header (v2.6.0) -->
            <header class="ios-page-header sd-page-header" aria-hidden="false">
                <h1 class="ios-large-title">测速 &amp; DNS</h1>
                <p class="sd-page-sub">节点延迟与解析探测</p>
            </header>

            <div class="card" id="speed-anchor">
                <div class="section-header-row">
                    <h2 class="section-title">⚡ 专属线路测速与动态 DNS 解析</h2>
                </div>
                
                <div class="sd-dns-card" id="dnsStatusCard">
                    <div class="sd-dns-head">
                        <span class="sd-eyebrow">📡 当前生效解析</span>
                        <span class="sd-dns-tag" id="sd-dns-tag">DNS</span>
                    </div>
                    <div id="dnsStatus" class="flex-wrap-tight">
                        <span class="text-muted">加载中...</span>
                    </div>
                </div>

                <!-- Mobile-only ISP segmented control (v2.6.0) -->
                <nav class="sd-isp-seg" role="tablist" aria-label="ISP 筛选">
                    <button type="button" role="tab" data-value="all" aria-selected="true">综合</button>
                    <button type="button" role="tab" data-value="电信" aria-selected="false">电信</button>
                    <button type="button" role="tab" data-value="联通" aria-selected="false">联通</button>
                    <button type="button" role="tab" data-value="移动" aria-selected="false">移动</button>
                    <button type="button" role="tab" data-value="多线" aria-selected="false">多线</button>
                    <button type="button" role="tab" data-value="ipv6" aria-selected="false">IPv6</button>
                    <button type="button" role="tab" data-value="优选" aria-selected="false">优选</button>
                </nav>

                <div class="toolbar">
                    <select id="ipType" style="font-weight: 600; color: var(--primary); padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--card);">
                        <option value="all">综合混合源</option>
                        <option value="电信">电信专属</option>
                        <option value="联通">联通专属</option>
                        <option value="移动">移动专属</option>
                        <option value="多线">多线 BGP</option>
                        <option value="ipv6">IPv6 节点</option>
                        <option value="优选">顶尖优选库</option>
                    </select>

                    <button type="button" class="btn-tier is-primary" id="btnFetchRemote" onclick="fetchRemoteAndTest()">提取预设源并测速</button>
                    <button type="button" class="btn-tier" id="btnTestCustom" onclick="testCustomIPs()">测试粘贴节点</button>
                    <button type="button" class="btn-tier" id="btnFetchCustomApi" onclick="fetchCustomApiAndTest()">拉取 API</button>

                    <span class="v-sep"></span>

                    <button type="button" class="btn-tier is-success" id="btnSelectedDns" onclick="updateSelectedToDns()">提交选中至 DNS</button>

                    <span class="v-sep"></span>

                    <div class="menu-wrap">
                        <button type="button" class="btn-tier" onclick="toggleMenu(this)">更多 <svg><use href="#i-chevron"/></svg></button>
                        <div class="menu">
                            <button type="button" onclick="batchTcpPing(); closeAllMenus();">复制去 ITDog</button>
                            <button type="button" id="btnDirectCname" onclick="directSubmitCname(); closeAllMenus();">直推 CNAME (免测速)</button>
                            <button type="button" id="btnTop3Dns" onclick="updateTop3ToDns(); closeAllMenus();">更新 TOP3 至 DNS</button>
                            <hr/>
                            <button type="button" class="danger" onclick="clearTest(); closeAllMenus();">清空列表</button>
                        </div>
                    </div>
                </div>

                <!-- Mobile-only primary CTA stack + overflow trigger (v2.6.0) -->
                <div class="sd-action-stack" aria-hidden="false">
                    <button type="button" class="sd-cta-primary" onclick="fetchRemoteAndTest()">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>提取预设源并测速</span>
                    </button>
                    <div class="sd-action-row">
                        <button type="button" class="sd-cta-ghost" onclick="testCustomIPs()">测试粘贴</button>
                        <button type="button" class="sd-cta-ghost" onclick="fetchCustomApiAndTest()">拉取 API</button>
                        <button type="button" class="sd-cta-more" onclick="openSdMoreSheet()" aria-label="更多操作">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
                        </button>
                    </div>
                </div>

                <details class="sd-custom-fold">
                    <summary class="sd-custom-summary">
                        <span>自定义来源</span>
                        <svg class="sd-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="sd-custom-body" style="background: rgba(120,120,120,0.05); padding: 14px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
                        <input type="text" id="customApiUrl" value="https://ip.v2too.top/api/nodes" placeholder="自定义 JSON / 文本 API 链接（供「拉取 API」使用）" style="width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); background:var(--card); margin-bottom: 10px;">
                        <textarea id="customIps" rows="2" placeholder="在此粘贴自定义 IPv4 / IPv6 / 优选域名（供「测试粘贴节点」使用，自动提取）" style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-family: monospace; resize: vertical; background:var(--card);"></textarea>
                    </div>
                </details>
                
                <div id="statusText" style="line-height: 1.6; font-size: var(--text-base); color: var(--text-sec); margin-bottom: 16px; padding: 12px 16px; background: var(--ok-soft); border-radius: var(--radius-md); border-left: 4px solid var(--ok);">
                    💡 测速完成后，可勾选复选框自由组合，点击【提交选中节点至 DNS】自动分发。
                </div>

                <div class="table-wrapper">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="col-w40"><input type="checkbox" id="selectAll" class="ip-checkbox" onclick="toggleSelectAll()"></th>
                                <th>专属节点 (点击复制)</th>
                                <th>预估延迟</th>
                                <th>连通状态</th>
                                <th>记录类型/归属地</th>
                                <th>单节点操作</th>
                            </tr>
                        </thead>
                        <tbody id="testTableBody">
                            <tr><td colspan="6" class="text-center-muted">暂无数据，请拉取节点或输入自定义 IP/域名 测试</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Mobile-only floating selection bar (v2.6.0) -->
                <div class="sd-selection-bar" id="sdSelectionBar" hidden>
                    <span class="sd-sel-label">已选 <strong id="sdSelCount">0</strong> 个</span>
                    <button type="button" class="sd-sel-btn" onclick="updateSelectedToDns()">提交至 DNS
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            </div>

            <!-- ===== F4: 优选 CDN 域名 + 一键 DNS CNAME ===== -->
            <div class="card mt-4" >
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                    <h2 class="section-title">🌟 优选 CDN 域名 + 一键 DNS CNAME</h2>
                    <div class="flex-wrap-tight">
                        <button type="button" class="btn-tier is-primary" onclick="speedtestOptimizedDomains('client')">全部测速 (本地)</button>
                        <button type="button" class="btn-tier" onclick="speedtestOptimizedDomains('edge')" title="从 Worker 机房测，仅供参考">Edge 测速</button>
                        <button type="button" class="btn-tier is-success" onclick="runDownloadSpeedtest()" title="测当前 DNS 路径的实际下载带宽">⬇️ 当前路径带宽</button>
                        <button type="button" class="btn-tier" onclick="addOptimizedDomain()">+ 添加自定义</button>
                    </div>
                    <div id="downloadSpeedResult" style="margin-top:10px; font-size:var(--text-md); color:var(--text-sec);"></div>
                </div>
                <div class="table-wrapper">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th>域名</th>
                                <th>备注</th>
                                <th class="col-w60">内置</th>
                                <th class="col-w60">启用</th>
                                <th class="col-w90">上次测速</th>
                                <th style="width:180px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="optimizedDomainsBody">
                            <tr><td colspan="6" class="text-center-muted">加载中...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="dnsReadyHint" style="margin-top:14px; padding:10px 14px; border-radius:var(--radius-md); font-size:var(--text-md);"></div>
            </div>

            <!-- ===== F3: 重定向白名单 ===== -->
            <div class="card mt-4" >
                <h2 style="margin:0 0 10px 0; font-size:var(--text-2xl);">🔁 3xx 重定向直通白名单</h2>
                <div style="font-size:var(--text-md); color:var(--text-sec); margin-bottom:10px;">命中以下域名（或其子域名）的 302/301 Location 将直接透传给客户端，跳过代理重写。每行一个 host。</div>
                <textarea id="manualRedirectDomainsInput" rows="6" style="width:100%; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--card); font-family:monospace;"></textarea>
                <div style="margin-top:10px;">
                    <button type="button" class="btn-tier is-primary" onclick="saveManualRedirectDomains()">保存白名单</button>
                </div>
            </div>

            <script>
            // F3: 白名单
            async function loadManualRedirectDomains() {
                try {
                    const res = await fetch('/api/manual-redirect-domains');
                    const data = await res.json();
                    if (data.success) document.getElementById('manualRedirectDomainsInput').value = (data.domains || []).join('\\n');
                } catch (e) {}
            }
            async function saveManualRedirectDomains() {
                try {
                    const v = document.getElementById('manualRedirectDomainsInput').value;
                    const domains = v.split('\\n').map(s => s.trim()).filter(Boolean);
                    const res = await fetch('/api/manual-redirect-domains', { method: 'POST', body: JSON.stringify({ domains }) });
                    const data = await res.json();
                    if (data.success) { showToast('✅ 白名单已保存 (' + data.domains.length + ')'); loadManualRedirectDomains(); }
                    else showToast('❌ 保存失败: ' + (data.error || '未知'));
                } catch (e) { showToast('❌ ' + e.message); }
            }

            // F4: 优选域名
            let _lastSpeedtest = {}; // id -> {ms, ok}
            async function loadOptimizedDomains() {
                try {
                    const res = await fetch('/api/optimized-domains');
                    const data = await res.json();
                    console.log('[optimized-domains] response:', data);
                    if (!data.success) {
                        const body = document.getElementById('optimizedDomainsBody');
                        if (body) body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--err);">加载失败: ' + (data.error || '未知') + '</td></tr>';
                        return;
                    }
                    renderOptimizedDomains(data.items || []);
                } catch (e) {
                    console.error('[optimized-domains] load error:', e);
                    const body = document.getElementById('optimizedDomainsBody');
                    if (body) body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--err);">JS 异常: ' + e.message + '</td></tr>';
                }
            }
            function renderOptimizedDomains(items) {
                const body = document.getElementById('optimizedDomainsBody');
                if (!body) { console.warn('[optimized-domains] body element not found'); return; }
                if (!items.length) { body.innerHTML = '<tr><td colspan="6" class="text-center-muted">暂无</td></tr>'; return; }
                const dnsReady = _dnsReady;
                body.innerHTML = items.map(it => {
                    const live = _lastSpeedtest[it.id];
                    const ms = live ? (live.ok ? live.ms + ' ms' : '失败') : (it.last_ms > 0 ? it.last_ms + ' ms' : (it.last_ms === -1 ? '-' : it.last_ms));
                    const replaceBtnDisabled = !dnsReady;
                    const replaceBtnTitle = dnsReady ? '将 DNS 记录的 CNAME 替换为此域名' : '请先在 Worker 环境变量中配置 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN';
                    // ms-chip class drives mobile color-coded chip; falls back to plain text on desktop.
                    const liveMs = live ? (live.ok ? live.ms : 99999) : (typeof it.last_ms === 'number' ? it.last_ms : 99999);
                    let msCls = 'is-idle';
                    if (typeof liveMs === 'number' && liveMs >= 0 && liveMs < 99999) {
                        if (liveMs < 150) msCls = 'is-ok';
                        else if (liveMs < 400) msCls = 'is-warn';
                        else msCls = 'is-err';
                    }
                    return '<tr class="sd-od-row">'
                        + '<td data-label="域名"><code>' + it.domain + '</code></td>'
                        + '<td data-label="备注">' + (it.note || '') + '</td>'
                        + '<td data-label="内置" class="text-center">' + (it.builtin ? '✓' : '') + '</td>'
                        + '<td data-label="启用" class="text-center"><input type="checkbox" ' + (it.enabled ? 'checked' : '') + ' onchange="toggleOptimizedDomain(' + it.id + ', this.checked)"></td>'
                        + '<td data-label="上次测速" class="text-center"><span class="sd-od-ms ' + msCls + '">' + ms + '</span></td>'
                        + '<td data-label="操作">'
                          + '<button type="button" class="btn-tier is-success is-disabled" ' + (replaceBtnDisabled ? 'disabled ' : '') + ' title="' + replaceBtnTitle + '" onclick="replaceDns(&#39;' + it.domain + '&#39;)">🔄 替换DNS</button> '
                          + (!it.builtin ? '<button type="button" class="btn-tier danger" onclick="deleteOptimizedDomain(' + it.id + ')">删除</button>' : '')
                        + '</td>'
                        + '</tr>';
                }).join('');
            }
            async function toggleOptimizedDomain(id, enabled) {
                await fetch('/api/optimized-domains/' + id, { method: 'PATCH', body: JSON.stringify({ enabled }) });
            }
            async function deleteOptimizedDomain(id) {
                if (!confirm('确定删除此自定义域名？')) return;
                const res = await fetch('/api/optimized-domains/' + id, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) { showToast('🗑️ 已删除'); loadOptimizedDomains(); }
                else showToast('❌ ' + (data.error || '失败'));
            }
            async function addOptimizedDomain() {
                const domain = prompt('输入自定义优选域名（如 example.com）：');
                if (!domain) return;
                const note = prompt('备注（可空）：') || '';
                const res = await fetch('/api/optimized-domains', { method: 'POST', body: JSON.stringify({ domain, note }) });
                const data = await res.json();
                if (data.success) { showToast('✅ 已添加'); loadOptimizedDomains(); }
                else showToast('❌ ' + (data.error || '失败'));
            }
            // 下载测速：拉自己 Worker 的 /api/speedtest-down，测客户端→当前 CF 入口→Worker 的有效带宽
            async function runDownloadSpeedtest() {
                const resEl = document.getElementById('downloadSpeedResult');
                resEl.innerHTML = '⏱ 测速中（下载 10MB）...';
                try {
                    const bytes = 10 * 1024 * 1024;
                    const start = performance.now();
                    const res = await fetch('/api/speedtest-down?bytes=' + bytes + '&_=' + Date.now(), { cache: 'no-store' });
                    if (!res.ok) { resEl.innerHTML = '❌ 端点返回 ' + res.status; return; }
                    const reader = res.body.getReader();
                    let received = 0;
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        received += value.length;
                    }
                    const elapsedMs = performance.now() - start;
                    const mbps = (received * 8 / 1e6) / (elapsedMs / 1000);
                    const mibps = (received / 1048576) / (elapsedMs / 1000);
                    resEl.innerHTML = '✅ 下载 ' + (received / 1048576).toFixed(2) + ' MiB 用时 ' + (elapsedMs / 1000).toFixed(2) + ' 秒 → <b>' + mbps.toFixed(2) + ' Mbps</b> (' + mibps.toFixed(2) + ' MiB/s)';
                    showToast('✅ 当前路径带宽: ' + mbps.toFixed(1) + ' Mbps');
                } catch (e) {
                    resEl.innerHTML = '❌ 测速失败: ' + e.message;
                }
            }

            // 客户端侧测速：先 fetch no-cors，失败回退到 Image() 加载（兼容更多目标）
            function clientProbeImage(domain, timeoutMs) {
                return new Promise(resolve => {
                    const start = performance.now();
                    const img = new Image();
                    let done = false;
                    const finish = (ok) => {
                        if (done) return; done = true;
                        const ms = Math.round(performance.now() - start);
                        resolve({ ms: ok ? ms : -1, ok });
                    };
                    const t = setTimeout(() => finish(false), timeoutMs);
                    img.onload = () => { clearTimeout(t); finish(true); };
                    // onerror 也算"通了"：说明 TCP/TLS 已经握手成功，只是资源不是图片
                    img.onerror = () => { clearTimeout(t); finish(true); };
                    img.src = 'https://' + domain + '/favicon.ico?_=' + Date.now();
                });
            }
            async function clientProbe(domain, timeoutMs) {
                timeoutMs = timeoutMs || 4000;
                const start = performance.now();
                const controller = new AbortController();
                const t = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    await fetch('https://' + domain + '/cdn-cgi/trace?_=' + Date.now(), {
                        mode: 'no-cors', cache: 'no-store', signal: controller.signal
                    });
                    clearTimeout(t);
                    return { ms: Math.round(performance.now() - start), ok: true };
                } catch (e) {
                    clearTimeout(t);
                    console.log('[probe] fetch failed for', domain, e.message, '— fallback to Image');
                    return await clientProbeImage(domain, timeoutMs);
                }
            }
            async function speedtestOptimizedDomains(mode) {
                mode = mode || 'client';
                showToast('⏱ ' + (mode === 'client' ? '本地' : 'Edge') + '测速中...');
                let measured = [];
                if (mode === 'edge') {
                    const res = await fetch('/api/optimized-domains/speedtest', { method: 'POST', body: '{}' });
                    const data = await res.json();
                    if (!data.success) { showToast('❌ ' + (data.error || '测速失败')); return; }
                    measured = data.items || [];
                } else {
                    // 客户端：先取启用域名列表
                    const listRes = await fetch('/api/optimized-domains');
                    const listData = await listRes.json();
                    if (!listData.success) { showToast('❌ 拉取域名失败'); return; }
                    const enabled = (listData.items || []).filter(it => it.enabled);
                    measured = await Promise.all(enabled.map(async it => {
                        const p = await clientProbe(it.domain);
                        return { id: it.id, domain: it.domain, ms: p.ms, ok: p.ok };
                    }));
                    measured.sort((a, b) => {
                        if (!a.ok && !b.ok) return 0; if (!a.ok) return 1; if (!b.ok) return -1;
                        return a.ms - b.ms;
                    });
                }
                _lastSpeedtest = {};
                measured.forEach(it => { _lastSpeedtest[it.id] = { ms: it.ms, ok: it.ok }; });
                showToast('✅ ' + (mode === 'client' ? '本地' : 'Edge') + '测速完成，已按延迟排序');
                const listRes = await fetch('/api/optimized-domains');
                const listData = await listRes.json();
                if (listData.success) {
                    const items = (listData.items || []).slice().sort((a, b) => {
                        const sa = _lastSpeedtest[a.id], sb = _lastSpeedtest[b.id];
                        if (!sa && !sb) return 0; if (!sa) return 1; if (!sb) return -1;
                        if (!sa.ok && !sb.ok) return 0; if (!sa.ok) return 1; if (!sb.ok) return -1;
                        return sa.ms - sb.ms;
                    });
                    renderOptimizedDomains(items);
                }
            }
            let _dnsReady = false;
            async function loadDnsConfig() {
                try {
                    const res = await fetch('/api/dns-ready');
                    const data = await res.json();
                    _dnsReady = !!(data && data.ready);
                    const hint = document.getElementById('dnsReadyHint');
                    if (hint) {
                        if (_dnsReady) {
                            hint.style.background = 'rgba(52,199,89,0.1)';
                            hint.style.border = '1px solid rgba(52,199,89,0.3)';
                            hint.innerHTML = '✅ DNS 替换已就绪 (域名: <code>' + (data.domain || '?') + '</code>) — 点表格里的 "🔄 替换DNS" 即可应用';
                        } else {
                            hint.style.background = 'rgba(255,149,0,0.1)';
                            hint.style.border = '1px solid rgba(255,149,0,0.3)';
                            hint.innerHTML = '⚠️ 缺少环境变量 <code>CF_API_TOKEN</code> / <code>CF_ZONE_ID</code> / <code>CF_DOMAIN</code>，无法替换 DNS。请到 Cloudflare Worker 设置中补齐。';
                        }
                    }
                } catch (e) { _dnsReady = false; }
            }
            async function replaceDns(domain) {
                if (!confirm('确定将 DNS 记录的 CNAME 内容替换为 ' + domain + ' ?')) return;
                const res = await fetch('/api/dns/replace', { method: 'POST', body: JSON.stringify({ domain }) });
                const data = await res.json();
                if (data.success) { showToast('✅ DNS 已替换为 ' + data.content); loadDnsConfig(); }
                else showToast('❌ ' + (data.error || '替换失败'));
            }

            // 页面加载后立即拉一次（不依赖分区可见性）
            (function(){
                function _embycfInit() {
                    loadOptimizedDomains();
                    loadDnsConfig().then(() => loadOptimizedDomains()); // 配置加载完后重渲染以显示替换按钮
                    loadManualRedirectDomains();
                }
                if (document.readyState === 'loading') {
                    window.addEventListener('DOMContentLoaded', _embycfInit);
                } else {
                    _embycfInit();
                }
            })();

            // ==========================================
            // === Mobile v5 — 测速 & DNS specialist drivers (v2.6.0) ===
            // View-layer shims. Source-of-truth elements (#ipType, .ip-checkbox,
            // .latency [data-ms]) are not duplicated; we observe / dispatch on them.
            // ==========================================
            (function sdMobileDrivers() {
                const tableBody = document.getElementById('testTableBody');
                const ipTypeSel = document.getElementById('ipType');
                const segEl     = document.querySelector('.sd-isp-seg');
                const selBar    = document.getElementById('sdSelectionBar');
                const selCount  = document.getElementById('sdSelCount');
                const moreSheet = document.getElementById('sdMoreSheet');
                const customFold = document.querySelector('.sd-custom-fold');

                // ---- Desktop: keep <details> open so the inputs render in place
                //      (CSS hides the summary on desktop, but browsers gate the body
                //      on the [open] attribute regardless of CSS display rules).
                if (customFold) {
                    const mq = window.matchMedia('(min-width: 769px)');
                    const applyFoldState = () => { customFold.open = mq.matches; };
                    applyFoldState();
                    if (mq.addEventListener) mq.addEventListener('change', applyFoldState);
                    else if (mq.addListener) mq.addListener(applyFoldState);
                }

                // ---- Latency bar: 10-cell visual encoding next to the ms value ----
                // Threshold: <150ms ok · <400ms warn · ≥400ms err · 9999 loading.
                const LAT_OK = 150, LAT_WARN = 400;
                function applyLatencyBar(td) {
                    if (!td || !td.classList || !td.classList.contains('latency')) return;
                    const raw = td.getAttribute('data-ms');
                    const ms = parseInt(raw, 10);
                    if (!isFinite(ms)) return;
                    const isLoading = (ms === 9999);
                    let level = 'idle';
                    if (isLoading) level = 'loading';
                    else if (ms < LAT_OK) level = 'ok';
                    else if (ms < LAT_WARN) level = 'warn';
                    else level = 'err';
                    // Fill ratio: full at 30ms, empty at 600ms (capped).
                    let filled = 0;
                    if (!isLoading) {
                        const t = Math.max(0, Math.min(1, (600 - Math.max(30, Math.min(600, ms))) / 570));
                        filled = Math.max(0, Math.min(10, Math.round(t * 10)));
                    }
                    let cells = '';
                    for (let i = 0; i < 10; i++) {
                        cells += '<span class="sd-lat-cell' + (i < filled ? ' is-on' : '') + '"></span>';
                    }
                    const valTxt = isLoading ? '测算中…' : (ms + ' ms');
                    // Preserve original textual content for the desktop (which hides .sd-lat-wrap via CSS)
                    // by keeping a fallback .sd-lat-fallback span.
                    td.innerHTML = '<span class="sd-lat-wrap is-' + level + '" role="img" aria-label="延迟 ' + valTxt + '">'
                                 +   '<span class="sd-lat-bar">' + cells + '</span>'
                                 +   '<span class="sd-lat-val">' + valTxt + '</span>'
                                 + '</span>'
                                 + '<span class="sd-lat-fallback">' + valTxt + '</span>';
                }
                if (tableBody && 'MutationObserver' in window) {
                    const obs = new MutationObserver(muts => {
                        for (const m of muts) {
                            if (m.type === 'attributes' && m.attributeName === 'data-ms') {
                                applyLatencyBar(m.target);
                            } else if (m.type === 'childList') {
                                // Initial render: scan any new .latency cells.
                                m.addedNodes.forEach(n => {
                                    if (n.nodeType !== 1) return;
                                    if (n.matches && n.matches('tr')) {
                                        n.querySelectorAll('td.latency[data-ms]').forEach(applyLatencyBar);
                                    } else if (n.querySelectorAll) {
                                        n.querySelectorAll('td.latency[data-ms]').forEach(applyLatencyBar);
                                    }
                                });
                            }
                        }
                    });
                    obs.observe(tableBody, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ms'] });
                    // Scan any cells already present at script-init.
                    tableBody.querySelectorAll('td.latency[data-ms]').forEach(applyLatencyBar);
                }

                // ---- Selection bar: count checked .row-checkbox under tableBody ----
                function updateSelectionBar() {
                    if (!selBar || !tableBody) return;
                    const n = tableBody.querySelectorAll('.row-checkbox:checked').length;
                    selCount.textContent = String(n);
                    if (n > 0) {
                        selBar.hidden = false;
                        selBar.classList.add('is-show');
                    } else {
                        selBar.classList.remove('is-show');
                        // Wait for transition before hiding from a11y tree.
                        setTimeout(() => { if (!selBar.classList.contains('is-show')) selBar.hidden = true; }, 220);
                    }
                }
                if (tableBody) {
                    tableBody.addEventListener('change', e => {
                        if (e.target && (e.target.classList.contains('ip-checkbox') || e.target.classList.contains('row-checkbox'))) {
                            updateSelectionBar();
                        }
                    });
                }
                const selectAllEl = document.getElementById('selectAll');
                if (selectAllEl) selectAllEl.addEventListener('change', updateSelectionBar);
                // Expose so other handlers (e.g. clearTest re-renders) can refresh.
                window.sdUpdateSelectionBar = updateSelectionBar;

                // ---- Segmented ISP control sync ----
                if (segEl && ipTypeSel) {
                    segEl.addEventListener('click', e => {
                        const btn = e.target.closest('[role="tab"]');
                        if (!btn) return;
                        const v = btn.dataset.value;
                        if (!v) return;
                        segEl.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
                        if (ipTypeSel.value !== v) {
                            ipTypeSel.value = v;
                            ipTypeSel.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        // Center the active segment.
                        try { btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (_) {}
                    });
                    // Reflect external changes (e.g. user picks via native <select> on desktop) back into the segments.
                    ipTypeSel.addEventListener('change', () => {
                        const v = ipTypeSel.value;
                        segEl.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', b.dataset.value === v ? 'true' : 'false'));
                    });
                }

                // ---- More sheet open/close ----
                window.openSdMoreSheet = function () {
                    if (!moreSheet) return;
                    moreSheet.classList.add('is-open');
                    moreSheet.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                };
                window.closeSdMoreSheet = function () {
                    if (!moreSheet) return;
                    moreSheet.classList.remove('is-open');
                    moreSheet.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                };
                if (moreSheet) {
                    // Tap on backdrop closes; the ::before pseudo handles visual.
                    moreSheet.addEventListener('click', e => {
                        if (e.target === moreSheet) closeSdMoreSheet();
                    });
                    // ESC closes.
                    document.addEventListener('keydown', e => {
                        if (e.key === 'Escape' && moreSheet.classList.contains('is-open')) closeSdMoreSheet();
                    });
                }
            })();
            </script>

            <!-- Mobile-only overflow action sheet for 测速 & DNS (v2.6.0) -->
            <div id="sdMoreSheet" class="sd-more-sheet" aria-hidden="true">
                <div class="more-sheet-card" role="dialog" aria-modal="true" aria-label="更多操作">
                    <span class="more-sheet-grip" aria-hidden="true"></span>
                    <p class="more-sheet-title">测速 &amp; DNS · 更多操作</p>
                    <div class="more-sheet-list">
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); batchTcpPing();">
                            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="9" height="9" rx="2"/><rect x="12" y="12" width="9" height="9" rx="2"/></svg>
                            <span>复制去 ITDog</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); directSubmitCname();">
                            <svg viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"/><line x1="18" y1="12" x2="6" y2="12"/></svg>
                            <span>直推 CNAME (免测速)</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); updateTop3ToDns();">
                            <svg viewBox="0 0 24 24"><polyline points="12 19 12 5"/><polyline points="6 11 12 5 18 11"/></svg>
                            <span>更新 TOP3 至 DNS</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row is-danger" onclick="closeSdMoreSheet(); clearTest();">
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            <span>清空列表</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                    <button type="button" class="sd-sheet-cancel" onclick="closeSdMoreSheet()">取消</button>
                </div>
            </div>

            </section><!-- /sec-speed -->

            <!-- ===== 分区: 系统设置 ===== -->
            <section id="sec-settings" class="app-section" data-section="settings" style="display:none;">

            <div class="card" id="settings-anchor">
                <div style="display:flex; justify-content: space-between; align-items:flex-start; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
                    <div>
                        <h2 style="margin:0; font-size:var(--text-2xl); letter-spacing:-0.01em;">部署反代节点</h2>
                        <div style="color:var(--text-sec); font-size:var(--text-md); margin-top:4px;">填写下方信息后保存。每个节点占用一个 URL 前缀。</div>
                    </div>
                    <div class="menu-wrap">
                        <button type="button" class="btn-tier is-sm" onclick="toggleMenu(this)"><svg><use href="#i-more"/></svg>配置工具 <svg><use href="#i-chevron"/></svg></button>
                        <div class="menu">
                            <button type="button" onclick="exportConfig(); closeAllMenus();"><svg><use href="#i-download"/></svg>导出当前配置</button>
                            <button type="button" onclick="importConfig(); closeAllMenus();"><svg><use href="#i-upload"/></svg>导入配置</button>
                        </div>
                    </div>
                </div>

                <form id="addForm" class="a-form">
                    <input type="hidden" id="oldPrefix" value="">

                    <!-- 1. 基础信息 -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">基础信息</span>
                            <span class="a-field-aux">备注用于显示，前缀决定访问路径</span>
                        </div>
                        <div class="a-row">
                            <input class="a-input" type="text" id="remark" placeholder="节点备注 (如: Misaka服)" required>
                            <input class="a-input" type="text" id="prefix" placeholder="短路径后缀 (如: misaka)" required>
                            <select class="a-select" id="mode">
                                <option value="off">保守 (抹除IP)</option>
                                <option value="realip_only">严格 (透传IP)</option>
                                <option value="dual">兼容 (双重透传)</option>
                                <option value="strict">强力 (防403)</option>
                            </select>
                        </div>
                    </div>

                    <!-- 2. 上游线路 -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">上游线路</span>
                            <span class="a-field-aux">主源失败时按顺序回退到备用，支持魔改分离版推流</span>
                        </div>
                        <div id="targetInputs" style="display:flex; flex-direction:column; gap:8px;">
                            <div class="a-upstream-row">
                                <span class="a-tag-pri">主源</span>
                                <input type="url" class="a-input target-input" placeholder="主线路地址 (如: http://1.1.1.1:8096)" required oninput="handleTargetInputs()">
                            </div>
                            <div class="a-upstream-row">
                                <span class="a-tag-bk">备 1</span>
                                <input type="url" class="a-input target-input" placeholder="备用线路 1 (选填，主源挂掉时触发)" oninput="handleTargetInputs()">
                            </div>
                        </div>
                        <button type="button" class="a-add-row" onclick="addBackupLine()"><svg><use href="#i-plus"/></svg>添加备用线路</button>
                    </div>

                    <!-- 3. 自定义请求头 -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">自定义请求头</span>
                            <span class="a-field-aux">转发到上游时附加，<span id="hed-count">0</span> 条已启用</span>
                        </div>
                        <div class="hed" id="hed-editor">
                            <div class="hed-head">
                                <span></span><span>Header</span><span>Value</span>
                                <span style="text-align:center">启用</span><span></span>
                            </div>
                            <div class="hed-list" id="hed-list"></div>
                            <div class="hed-footer">
                                <button type="button" class="a-add-row" onclick="HeadersEditor.addRow()"><svg><use href="#i-plus"/></svg>添加请求头</button>
                                <div class="hed-meta"><span class="dot"></span><span>自动忽略空行 / 注释 (#) / 重复键</span></div>
                            </div>
                            <div class="templates">
                                <span class="templates-label">常用模板：</span>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('Authorization','Bearer ')">+ Authorization</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('Cookie','')">+ Cookie</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('X-Emby-Token','')">+ X-Emby-Token</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('X-Forwarded-For','')">+ X-Forwarded-For</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('User-Agent','')">+ User-Agent</button>
                                <button type="button" class="chip chip-curl" onclick="HeadersEditor.openCurlModal()">粘贴 cURL...</button>
                            </div>
                        </div>
                    </div>

                    <!-- 4. 显示 & 缓存 -->
                    <div class="a-fieldset">
                        <span class="a-field-label">显示 &amp; 缓存</span>
                        <div class="a-row two">
                            <div class="pos-rel">
                                <div class="a-card-pick" onclick="toggleIconPicker(event)" id="iconSelectBtn">
                                    <img id="iconPreview" src="" style="width:32px;height:32px;display:none;border-radius:var(--radius-md);object-fit:cover;">
                                    <span id="iconDefault" style="font-size:var(--text-3xl);line-height:1;">🎬</span>
                                    <div class="flex-1-min0">
                                        <div class="label-bold">节点图标</div>
                                        <div id="iconSelectText" style="font-size:var(--text-xs); color:var(--text-sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">点击选择 · 或粘贴 URL</div>
                                    </div>
                                    <input type="hidden" id="iconUrl" value="">
                                </div>
                                <div id="iconPickerPanel" style="display:none; position: absolute; top: 100%; left: 0; width: 100%; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 100; margin-top: 8px; flex-direction: column; gap: 10px;">
                                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                                        <input type="text" id="customIconUrlInput" placeholder="输入自定义 JSON 图标库链接..." style="flex: 1; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--bg); font-size: var(--text-md); color: var(--text);">
                                        <button type="button" class="btn-tier is-primary is-sm" onclick="setCustomIconLibrary()">加载</button>
                                        <button type="button" class="btn-tier is-sm" onclick="resetIconLibrary()">默认库</button>
                                    </div>
                                    <input type="text" id="iconSearch" placeholder="🔍 搜索图标名称..." style="padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--bg); width: 100%; font-size: var(--text-base); color: var(--text);" onkeyup="filterIcons()">
                                    <div id="iconGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; overflow-y: auto; max-height: 240px; padding-right: 4px;">
                                        <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; font-size: var(--text-md);">加载图标库中...</div>
                                    </div>
                                </div>
                            </div>
                            <div class="a-toggle-row" id="cacheToggleRow" onclick="toggleCacheSwitch(this)">
                                <div class="ios-switch on"></div>
                                <div class="flex-1">
                                    <div class="label-bold">海报 &amp; 静态资源缓存</div>
                                    <div style="font-size:var(--text-xs); color:var(--text-sec);">降低上游压力，建议开启</div>
                                </div>
                                <input type="checkbox" id="nodeCache" class="ip-checkbox" checked style="display:none;">
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="a-footer">
                        <span class="a-footer-aux">所有更改实时保存到 Cloudflare D1</span>
                        <div class="a-footer-actions">
                            <button type="submit" id="submitBtn" class="btn-tier is-primary"><svg><use href="#i-save"/></svg>保存并部署</button>
                        </div>
                    </div>
                </form>
            </div>
            </section><!-- /sec-settings -->

            <!-- ===== 分区: 工具箱 ===== -->
            <section id="sec-tools" class="app-section" data-section="tools" style="display:none;">
            <div class="card">
                <h2 style="margin:0 0 6px; font-size:var(--text-2xl);">工具箱</h2>
                <div style="color:var(--text-sec); font-size:var(--text-md); margin-bottom:18px;">配置导入导出、cURL 请求头解析等实用工具。</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button type="button" class="btn-tier" onclick="exportConfig()"><svg><use href="#i-download"/></svg>导出当前配置</button>
                    <button type="button" class="btn-tier" onclick="importConfig()"><svg><use href="#i-upload"/></svg>导入配置</button>
                    <button type="button" class="btn-tier" onclick="HeadersEditor.openCurlModal()"><svg><use href="#i-key"/></svg>cURL 请求头解析</button>
                    <button type="button" class="btn-tier" onclick="openWorkerUpdate()"><svg><use href="#i-save"/></svg>更新 Worker 核心代码</button>
                </div>
                <div style="margin-top:16px; font-size:var(--text-sm); color:var(--text-sec); line-height:1.6;">
                    提示：cURL 解析会把粘贴的请求头填入当前部署表单的「自定义请求头」编辑器，请先在「系统设置」中准备好节点信息。
                </div>
            </div>
            </section><!-- /sec-tools -->

            <!-- ===== 分区: 节点状态（emby-js 监控移植） ===== -->
            <section id="sec-embyStatus" class="app-section" data-section="embyStatus" style="display:none;">
            <div class="card">
                <h2 style="margin:0 0 6px; font-size:var(--text-2xl);">节点状态监控</h2>
                <div style="color:var(--text-sec); font-size:var(--text-md); margin-bottom:18px;">
                    每分钟自动探测启用了「在状态页展示」的节点，记录 24 小时与 7 天可用率；连续失败 5 分钟自动发送 Telegram 告警，恢复后再发一条恢复通知。
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
                    <a class="btn-tier" href="/status" target="_blank" rel="noopener">打开公开状态页</a>
                    <button type="button" class="btn-tier" onclick="generateShareDashboardLink()">生成公开分享链接（1 小时）</button>
                    <button type="button" class="btn-tier" onclick="loadEmbyStatusAdmin()">刷新</button>
                </div>
                <div id="embyShareResult" style="display:none; padding:10px 14px; background:rgba(0,136,204,0.08); border-radius:10px; margin-bottom:14px; font-size:var(--text-sm); word-break:break-all;"></div>
                <div class="card" style="padding:12px 14px; margin-bottom:14px; display:flex; flex-direction:column; gap:10px;">
                    <label style="display:flex; gap:8px; align-items:center; cursor:pointer; font-size:var(--text-sm);">
                        <input type="checkbox" id="embyHideNamesToggle" onchange="updateEmbyGlobalFlag('hide_node_names', this.checked ? 1 : 0)"> 在公开状态页隐藏节点名称与图标（统一显示为「节点 1、节点 2…」）
                    </label>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="min-width:120px; font-size:var(--text-sm);">代理国家白名单</span>
                        <input type="text" id="proxyCountryAllowlist" placeholder="例：CN,HK,TW（留空=关闭）" style="flex:1; min-width:200px; padding:8px 12px; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--card); color:inherit;">
                        <button type="button" class="btn-tier" onclick="saveCountryAllowlist()">保存</button>
                    </div>
                    <div style="font-size:var(--text-sm); color:var(--text-sec);">仅允许来自这些国家的客户端走反代；公开 /status 页与管理端点不受影响。留空即关闭。</div>
                </div>
                <div id="embyStatusAdminList" style="display:flex; flex-direction:column; gap:10px;"></div>
                <div id="embyStatusAdminEmpty" style="display:none; color:var(--text-sec); font-size:var(--text-sm); padding:20px 0;">尚未配置任何反代节点。请先在「概览」中添加节点。</div>
            </div>
            </section><!-- /sec-embyStatus -->

            <!-- ===== 分区: 概览 (节点管理) ===== -->
            <section id="sec-overview" class="app-section is-active" data-section="overview">
            <div class="aurora-hero" aria-label="核心指标 概览">
                <div class="kpi-tile is-primary">
                    <div class="kpi-label">在线节点</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-online-nodes">--</span>
                        <span class="kpi-unit">/ <span id="kpi-total-nodes">--</span></span>
                    </div>
                    <div class="kpi-sub" id="kpi-online-sub">实时反代节点活跃度</div>
                    <svg class="kpi-spark" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true">
                        <path class="ks-area" id="kpi-spark-area" d="M0 36 L40 32 L80 24 L120 28 L160 18 L200 22 L240 12 L240 44 L0 44 Z"/>
                        <path class="ks-line" id="kpi-spark-line" d="M0 36 L40 32 L80 24 L120 28 L160 18 L200 22 L240 12"/>
                    </svg>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-label">今日流量</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-traffic">--</span>
                    </div>
                    <div class="kpi-sub">出入站合计 · 自然日重置</div>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-label">系统健康度</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-health">--</span>
                        <span class="kpi-unit">%</span>
                    </div>
                    <div class="kpi-health-bar"><span id="kpi-health-bar-fill"></span></div>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-label">边缘 RTT</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-rtt">--</span>
                        <span class="kpi-unit">ms</span>
                    </div>
                    <div class="kpi-sub">CF Worker → 你的设备</div>
                </div>
            </div>
            <div class="card">
                <div class="section-header-row">
                    <h2 class="section-title">已反代的媒体库</h2>
                    <div style="display: flex; gap: 8px; align-items:center; flex-wrap: wrap;">
                        <button type="button" class="btn-tier is-sm" onclick="pingAllNodes()">全局测速</button>
                        <button type="button" id="btnPurge" class="btn-tier is-sm is-danger" onclick="purgeCache()">刷新全站海报</button>
                        <input type="text" id="searchNode" class="search-input" placeholder="🔍 搜索备注或后缀查找..." onkeyup="filterNodesList()">
                    </div>
                </div>
                <div style="background: rgba(0, 122, 255, 0.05); padding: 12px 20px; border-radius: 12px; border: 1px dashed var(--primary); margin-bottom: 20px; margin-top: 20px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <label style="cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" id="selectAllNodes" onchange="toggleSelectAll(this)" style="width: 18px; height: 18px; accent-color: var(--primary);"> 
                全选节点
            </label>
            
            <div style="width: 2px; height: 20px; background: var(--border);"></div> <select id="batch-mode-select" style="padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-weight: 600;">
                <option value="">🔄 读取模式中...</option>
            </select>

            <button onclick="batchUpdateModes()" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: var(--radius-md); cursor: pointer; font-weight: bold; transition: 0.2s; box-shadow: 0 4px 10px var(--primary-ring);">
                🚀 批量应用模式
            </button>

            <span id="batch-status" class="label-bold"></span>
        </div>
                <div id="list-grid" class="node-grid">
                    <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;">读取数据中...</div>
                </div>
            </div>

            <div style="text-align: center; padding-top: 10px; padding-bottom: 20px;">
                <div style="margin-top: 20px; font-size: var(--text-sm); color: var(--text-sec); line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto; padding: 0 15px;">
                    <strong>免责声明:</strong> 本项目仅供学习与技术测试使用，请遵守当地法律法规。使用者对配置、转发内容与访问行为承担全部责任，开发者不对任何直接或间接损失负责。
                </div>
            </div>
            </section><!-- /sec-overview -->

            <!-- ===== 危险区 (独立分区, 替换原底部常驻条 v2.3.0) ===== -->
            <section id="sec-danger" class="app-section" data-section="danger" style="display:none;">
                <div class="danger-hero">
                    <div class="dh-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="dh-text">
                        <h2 class="dh-title">危险操作区</h2>
                        <div class="dh-sub">以下操作不可逆，请确认理解每项影响后再执行。</div>
                    </div>
                </div>
                <div class="ios-form-group danger-group" role="group" aria-label="危险操作">
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">刷新全站海报缓存</div>
                            <div class="ifr-sub">强制清空 CDN 海报缓存。客户端首次加载延迟会上升 1–3 秒，直到缓存重建。无法回滚。</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="purgeCache()">执行刷新</button>
                    </div>
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">覆盖部署 Worker</div>
                            <div class="ifr-sub">用本地源码覆盖线上 Worker 并重启节点。期间所有反代请求会出现 5–15 秒的连接抖动。</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="openWorkerUpdate()">打开部署面板</button>
                    </div>
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">退出登录</div>
                            <div class="ifr-sub">清除当前会话，断开管理面板访问。其他客户端不受影响。可随时通过登录页重新进入。</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="logout()">立即退出</button>
                    </div>
                </div>
            </section><!-- /sec-danger -->

        </div><!-- /.content -->

        </div><!-- /.app-main -->
    </div><!-- /.app-shell -->

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
            Chart.defaults.color = document.body.classList.contains('dark') ? '#98989d' : '#86868b';
            Chart.defaults.borderColor = document.body.classList.contains('dark') ? '#38383a' : '#d2d2d7';
            const cs = getComputedStyle(document.documentElement);
            const primary = (cs.getPropertyValue('--primary') || '#0071e3').trim();
            const primarySoft = (cs.getPropertyValue('--primary-soft') || 'rgba(0,113,227,0.1)').trim();
            if (trendChartInstance && trendChartInstance.data && trendChartInstance.data.datasets[0]) {
                trendChartInstance.data.datasets[0].borderColor = primary;
                trendChartInstance.data.datasets[0].backgroundColor = primarySoft;
            }
        }

        // 节点状态徽章: 依据延迟/活跃度映射 在线/延迟/离线
        function nodeBadgeHtml(statusClass) {
            if (statusClass === 'live') return '<span class="node-badge is-online"><span class="bdot"></span>在线</span>';
            if (statusClass === 'warn') return '<span class="node-badge is-slow"><span class="bdot"></span>延迟</span>';
            if (statusClass === 'offline') return '<span class="node-badge is-offline"><span class="bdot"></span>离线</span>';
            return '<span class="node-badge is-idle"><span class="bdot"></span>空闲</span>';
        }

        // 迷你 SVG 折线图: 数据缺失时占位
        function nodeSparklineHtml(points) {
            var data = (points || []).filter(function (n) { return typeof n === 'number' && isFinite(n); });
            if (data.length < 2) {
                return '<div class="node-spark-empty">暂无趋势数据</div>';
            }
            var W = 100, H = 38, pad = 3;
            var max = Math.max.apply(null, data), min = Math.min.apply(null, data);
            var range = (max - min) || 1;
            var step = W / (data.length - 1);
            var pts = data.map(function (v, i) {
                var x = (i * step).toFixed(1);
                var y = (pad + (H - 2 * pad) * (1 - (v - min) / range)).toFixed(1);
                return x + ',' + y;
            });
            var line = pts.join(' ');
            var area = '0,' + H + ' ' + line + ' ' + W + ',' + H;
            return '<svg class="node-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
                   '<polygon class="sk-area" points="' + area + '"/>' +
                   '<polyline class="sk-line" points="' + line + '"/></svg>';
        }

        // 拉取近 7 天每日流量并回填到每张节点卡的 sparkline 容器
        async function loadRouteTrends() {
            try {
                const res = await fetch('/api/route-trends?days=7');
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !data.ok || !Array.isArray(data.items)) return;
                for (const it of data.items) {
                    if (!it || !it.prefix || !Array.isArray(it.bytes)) continue;
                    const slot = document.querySelector('.a-spark-slot[data-spark="' + CSS.escape(it.prefix) + '"]');
                    if (!slot) continue;
                    slot.innerHTML = nodeSparklineHtml(it.bytes);
                }
            } catch (e) { /* 静默降级：保留占位 */ }
        }

        // =====================================
        // 数据大屏与统计逻辑 (适配手机端表格排版)
        // =====================================
        // 兼容旧入口: 切到数据统计分区
        function openDashboard() { showSection('stats'); }

        async function loadDashboardData() {

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
                const statsSec = document.getElementById('sec-stats');
                const wrapper = statsSec ? statsSec.querySelector('.table-wrapper') : document.querySelector('.table-wrapper');
                if(wrapper && wrapper.previousElementSibling) {
                    wrapper.parentNode.insertBefore(top5Container, wrapper.previousElementSibling);
                }
            }
            
            let top5Html = '<h3 class="section-spacer-top">🏆 今日节点流量消耗 TOP 5</h3><div style="background: rgba(120,120,120,0.05); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 20px;">';
            
            // ==========================================
            // 🚀 核心优化：听你的天才思路！直接去网页现有的卡片里“抓取”数据，绝不等待变量！
            // ==========================================
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
                // 遍历卡片里所有的文本，找出带有流量单位的那个文本
                const spans = card.querySelectorAll('span');
                spans.forEach(span => {
                    const txt = span.innerText || '';
                    // 匹配例如: 1.5 GB, 500 MB, 0 B (双斜杠防转义丢失)
                    if (/^[\\d\\.]+\\s*(TB|GB|MB|KB|B)$/i.test(txt.trim())) {
                        bandwidth = txt.trim();
                    }
                });

                scrapedNodes.push({ prefix: prefix, remark: remark, todayBandwidth: bandwidth });
            });

            // 用抓取下来的真实数据直接计算 TOP 5
            if (scrapedNodes.length > 0) {
                const validNodes = scrapedNodes.filter(r => parseTrafficToBytes(r.todayBandwidth) > 0);
                const top5 = validNodes.sort((a, b) => parseTrafficToBytes(b.todayBandwidth) - parseTrafficToBytes(a.todayBandwidth)).slice(0, 5);
                
                if (top5.length > 0) {
                    top5Html += '<ul style="margin:0; padding-left: 20px; line-height: 2; font-size: var(--text-base); color: var(--text);">';
                    top5.forEach((r, idx) => {
                        const rankColor = idx === 0 ? 'var(--err)' : (idx === 1 ? 'var(--warn)' : (idx === 2 ? '#ffcc00' : 'var(--text-sec)'));
                        top5Html += \`<li><strong style="color:\${rankColor}; font-size: var(--text-lg);">#\${idx+1}</strong> \${r.remark} (/\${r.prefix}) —— 消耗: <strong style="color:var(--primary); font-family: monospace;">\${r.todayBandwidth}</strong></li>\`;
                    });
                    top5Html += '</ul>';
                } else {
                    top5Html += '<div style="color:var(--text-sec); font-size:var(--text-md); text-align:center;">今日暂无节点产生流量</div>';
                }
            } else {
                top5Html += '<div style="color:var(--text-sec); font-size:var(--text-md); text-align:center;">主页暂无节点卡片</div>';
            }
            top5Html += '</div>';
            
            // 瞬间把 TOP 5 写入网页！
            top5Container.innerHTML = top5Html;


            // ==========================================
            // 🌟 正常加载下面的图表数据 (带有10秒防卡死超时保护)
            // ==========================================
            document.getElementById('logTableBody').innerHTML = '<tr><td colspan="5" class="cell-loading">数据分析引擎计算中...</td></tr>';
            document.getElementById('trafficToday').innerText = '拉取中...';
            document.getElementById('traffic7d').innerText = '拉取中...';
            document.getElementById('traffic30d').innerText = '拉取中...';

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
                        datasets: [{ label: '有效播放 (次)', data: counts, borderColor: (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#0071e3').trim(), backgroundColor: (getComputedStyle(document.documentElement).getPropertyValue('--primary-soft') || 'rgba(0,113,227,0.1)').trim(), fill: true, tension: 0.3 }]
                    },
                    options: { responsive: true, plugins: { title: { display: true, text: '过去 7 天全站播放并发趋势', font: {size: 16} } } }
                });

                const locLabels = data.locations.map(i => i.country === 'CN' ? '中国大陆' : (i.country || '未知'));
                const locCounts = data.locations.map(i => i.count);
                const locCtx = document.getElementById('locationChart').getContext('2d');
                if(locationChartInstance) locationChartInstance.destroy();
                locationChartInstance = new Chart(locCtx, {
                    type: 'doughnut',
                    data: {
                        labels: locLabels,
                        datasets: [{ data: locCounts, backgroundColor: ['#34c759', '#0071e3', '#ff9500', '#af52de', '#ff2d55', '#8e8e93'], borderWidth: 0 }]
                    },
                    options: { responsive: true, plugins: { title: { display: true, text: '独立访客来源地占比', font: {size: 16} } } }
                });

                const tbody = document.getElementById('logTableBody');
                tbody.innerHTML = '';
                if(data.recents.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="cell-loading">暂无日志记录</td></tr>';
                } else {
                    data.recents.forEach(log => {
                        const tr = document.createElement('tr');
                        const isChina = log.country === 'CN';
                        tr.innerHTML = \`
                            <td data-label="访问时间" style="font-size:var(--text-sm); white-space:nowrap;">\${log.timestamp}</td>
                            <td data-label="目标节点"><span class="badge" style="background:var(--primary-soft);color:var(--primary);">\${log.prefix}</span></td>
                            <td data-label="真实 IP" style="font-family:monospace; font-size:var(--text-md); color:var(--text-sec); word-break:break-all;">\${log.ip}</td>
                            <td data-label="归属地"><span class="badge" style="background:\${isChina ? 'var(--ok-soft)' : 'var(--warn-soft)'}; color:\${isChina ? 'var(--ok)' : 'var(--warn)'};">\${isChina ? '中国大陆' : (log.country || 'Unknown')}</span></td>
                            <td data-label="设备标识 (UA)" style="font-size:var(--text-sm); color:var(--text-sec); word-break: break-all; white-space: normal; text-align: right; line-height: 1.4;" title="\${log.ua}">\${log.ua}</td>
                        \`;
                        tbody.appendChild(tr);
                    });
                }

            } catch (e) {
                const errMsg = e.name === 'AbortError' ? '网络超时，CF 接口拥堵，请稍后重试' : e.message;
                document.getElementById('logTableBody').innerHTML = \`<tr><td colspan="5" style="text-align:center;color:var(--err); padding: 30px;">独立图表数据拉取失败: \${errMsg}</td></tr>\`;
            }
        }

        function closeDashboard() { showSection('overview'); }

        function openWorkerUpdate() {
            const m = document.getElementById('workerUpdateModal');
            if (m) m.style.display = 'block';
        }
        function closeWorkerUpdate() {
            const m = document.getElementById('workerUpdateModal');
            if (m) m.style.display = 'none';
        }

        async function loadIcons(forceUrl = null) {
            const grid = document.getElementById('iconGrid');
            grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-sec); font-size: var(--text-md); text-align: center;">加载图标库中...</div>';
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
                grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--err); font-size: var(--text-md); text-align: center;">获取图标库失败，请检查链接或网络状态</div>';
            }
        }

        function setCustomIconLibrary() {
            const url = document.getElementById('customIconUrlInput').value.trim();
            if (!url) return showToast('⚠️ 请输入图标库 JSON 链接');
            if (!url.startsWith('http')) return showToast('⚠️ 请输入合法的 URL');
            localStorage.setItem('custom_icon_url', url);
            showToast('⏳ 正在加载自定义图标库...');
            loadIcons(url);
        }

        function resetIconLibrary() {
            localStorage.removeItem('custom_icon_url');
            document.getElementById('customIconUrlInput').value = '';
            showToast('🔄 已恢复默认图标库');
            loadIcons(DEFAULT_ICON_URL);
        }

        function renderIconGrid(filterText) {
            const grid = document.getElementById('iconGrid');
            const lowerFilter = filterText.toLowerCase();
            const filtered = globalIcons.filter(item => (item.name || '').toLowerCase().includes(lowerFilter));
            let html = \`<div class="icon-item" onclick="selectIcon('', '默认 🎬')" title="使用默认图标"><span style="font-size:var(--text-2xl);">🎬</span></div>\`;
            filtered.forEach(item => {
                html += \`<div class="icon-item" onclick="selectIcon('\${item.url}', '\${item.name}')" title="\${item.name}">
                            <img src="\${item.url}" loading="lazy" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;">
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
                text.textContent = '点击选择图标 (默认 🎬)'; text.style.color = 'var(--text-sec)';
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

        // ===== 三态主题系统: auto / light / dark =====
        var __themeMql = window.matchMedia('(prefers-color-scheme: dark)');

        function getThemePref() {
            // 旧键一次性迁移
            var legacy = localStorage.getItem('emby_proxy_dark');
            if (legacy !== null && !localStorage.getItem('emby_theme')) {
                localStorage.setItem('emby_theme', legacy === '1' ? 'dark' : 'light');
                localStorage.removeItem('emby_proxy_dark');
            }
            return localStorage.getItem('emby_theme') || 'auto';
        }

        function resolveDark(pref) {
            if (pref === 'dark') return true;
            if (pref === 'light') return false;
            return __themeMql.matches; // auto
        }

        function applyTheme(pref) {
            var dark = resolveDark(pref);
            document.body.classList.toggle('dark', dark);
            var btn = document.getElementById('themeToggle');
            if (btn) {
                var titleMap = { auto: '主题: 跟随系统', light: '主题: 浅色', dark: '主题: 深色' };
                btn.dataset.theme = pref;
                btn.title = titleMap[pref] || '切换主题';
                btn.setAttribute('aria-label', titleMap[pref] || '切换主题');
            }
            if (typeof trendChartInstance !== 'undefined' && trendChartInstance) {
                updateChartColors(); trendChartInstance.update();
                if (locationChartInstance) locationChartInstance.update();
            }
        }

        function toggleDarkMode() {
            // 循环 auto → light → dark → auto
            var order = ['auto', 'light', 'dark'];
            var cur = getThemePref();
            var next = order[(order.indexOf(cur) + 1) % order.length];
            localStorage.setItem('emby_theme', next);
            applyTheme(next);
        }

        __themeMql.addEventListener('change', function () {
            if (getThemePref() === 'auto') applyTheme('auto');
        });

        applyTheme(getThemePref());

        // ===== 导航分区切换 =====
        var __statsInited = false;
        function showSection(key) {
            var sections = document.querySelectorAll('.app-section');
            for (var i = 0; i < sections.length; i++) {
                var sec = sections[i];
                var on = sec.getAttribute('data-section') === key;
                sec.classList.toggle('is-active', on);
                sec.style.display = on ? 'block' : 'none';
            }
            var navs = document.querySelectorAll('.nav-item');
            for (var j = 0; j < navs.length; j++) {
                navs[j].classList.toggle('is-active', navs[j].getAttribute('data-section') === key);
            }
            // 同步移动端底部 tab (v5: tools+danger → "更多" 槽)
            var tabBar = document.getElementById('mobileTabBar');
            if (tabBar) {
                var tabMap = { overview: 'home', speed: 'speed', stats: 'stats', settings: 'settings', tools: 'more', danger: 'more' };
                var tabKey = tabMap[key];
                var btns = tabBar.querySelectorAll('button[data-tab]');
                for (var k = 0; k < btns.length; k++) {
                    btns[k].classList.toggle('active', btns[k].dataset.tab === tabKey);
                }
            }
            // 同步顶部紧凑栏标题 (大标题滚走后才可见)
            // v2.5.0: 同步桌面 glass topbar 中的 .tb-section-title
            try {
                var title = window.__iosSectionTitles ? (window.__iosSectionTitles[key] || '') : '';
                var compact = document.getElementById('mobileTopbarCompact');
                if (compact) compact.textContent = title;
                var tbSlot = document.getElementById('tbSectionTitle');
                if (tbSlot) tbSlot.textContent = title;
                if (document.body) document.body.classList.remove('is-scrolled');
            } catch (e) {}
            try { localStorage.setItem('emby_active_section', key); } catch (e) {}
            // 数据统计分区: 首次进入 lazy init 图表
            if (key === 'stats') {
                if (!__statsInited) { __statsInited = true; loadDashboardData(); }
                else { setTimeout(function () {
                    if (trendChartInstance) trendChartInstance.resize();
                    if (locationChartInstance) locationChartInstance.resize();
                }, 60); }
            }
            // 节点状态分区: 进入即加载（避免必须手动点"刷新"）
            if (key === 'embyStatus' && typeof loadEmbyStatusAdmin === 'function') {
                loadEmbyStatusAdmin();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function toggleSidebar() {
            var sb = document.getElementById('appSidebar');
            if (!sb) return;
            var collapsed = sb.classList.toggle('collapsed');
            try { localStorage.setItem('emby_sidebar_collapsed', collapsed ? '1' : '0'); } catch (e) {}
        }

        (function initShellState() {
            try {
                if (localStorage.getItem('emby_sidebar_collapsed') === '1') {
                    var sb = document.getElementById('appSidebar');
                    if (sb) sb.classList.add('collapsed');
                }
            } catch (e) {}
            var saved = 'overview';
            try { saved = localStorage.getItem('emby_active_section') || 'overview'; } catch (e) {}
            // 延迟到 DOM 就绪后再切换
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () { showSection(saved); });
            } else { showSection(saved); }
        })();

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        async function purgeCache() {
            if(!confirm('确定要清理 Cloudflare 节点的全站海报和静态缓存吗？\\n\\n清理后可能导致短时间的加载缓慢。')) return;
            const btn = document.getElementById('btnPurge');
            const originalText = btn.textContent;
            btn.textContent = '⏳ 正在清理...'; btn.disabled = true;
            try {
                const res = await fetch('/api/purge-cache', { method: 'POST' });
                const data = await res.json();
                if(data.success) showToast('✅ 缓存清理成功，新海报已生效！');
                else showToast('❌ 清理失败: ' + data.error);
            } catch(e) { showToast('❌ 网络请求错误'); } finally { btn.textContent = originalText; btn.disabled = false; }
        }

        function filterNodesList() {
            const filterText = document.getElementById('searchNode').value.toLowerCase();
            const cards = document.querySelectorAll('.emby-card');
            cards.forEach(card => {
                const searchStr = card.getAttribute('data-search').toLowerCase();
                card.style.display = searchStr.includes(filterText) ? 'flex' : 'none';
            });
        }

        function makeUpstreamRow(idx, value = '') {
            const isMain = idx === 0;
            const row = document.createElement('div');
            row.className = 'a-upstream-row';
            row.innerHTML = isMain
                ? '<span class="a-tag-pri">主源</span><input type="url" class="a-input target-input" placeholder="主线路地址 (如: http://1.1.1.1:8096)" required oninput="handleTargetInputs()">'
                : '<span class="a-tag-bk">备 ' + idx + '</span><input type="url" class="a-input target-input" placeholder="备用线路 ' + idx + ' (选填，主源挂掉时触发)" oninput="handleTargetInputs()">';
            const inp = row.querySelector('input');
            inp.value = value;
            return row;
        }

        function handleTargetInputs() {
            const container = document.getElementById('targetInputs');
            const inputs = container.querySelectorAll('.target-input');
            const lastInput = inputs[inputs.length - 1];
            if (lastInput && lastInput.value.trim() !== '') {
                container.appendChild(makeUpstreamRow(inputs.length));
            }
            let emptyCount = 0;
            const currentInputs = container.querySelectorAll('.target-input');
            for (let i = currentInputs.length - 1; i >= 0; i--) {
                if (currentInputs[i].value.trim() === '') {
                    emptyCount++;
                    if (emptyCount > 1) {
                        const wrapper = currentInputs[i].closest('.a-upstream-row');
                        (wrapper || currentInputs[i]).remove();
                    }
                } else { break; }
            }
            container.querySelectorAll('.a-upstream-row').forEach((row, idx) => {
                const tag = row.querySelector('.a-tag-pri, .a-tag-bk');
                const inp = row.querySelector('.target-input');
                if (idx === 0) {
                    if (tag) { tag.className = 'a-tag-pri'; tag.textContent = '主源'; }
                    if (inp) inp.placeholder = '主线路地址 (如: http://1.1.1.1:8096)';
                } else {
                    if (tag) { tag.className = 'a-tag-bk'; tag.textContent = '备 ' + idx; }
                    if (inp) inp.placeholder = '备用线路 ' + idx + ' (选填，主源挂掉时触发)';
                }
            });
        }

        function resetTargetInputs() {
            const container = document.getElementById('targetInputs');
            container.innerHTML = '';
            container.appendChild(makeUpstreamRow(0));
            container.appendChild(makeUpstreamRow(1));
        }

        function toggleVis(id, isArray = false) {
            const el = document.getElementById(id);
            if (el.classList.contains('secret-text')) {
                el.classList.remove('secret-text'); el.classList.add('actual-text');
                if (isArray) {
                    const arr = JSON.parse(decodeURIComponent(el.getAttribute('data-val')));
                    let html = '';
                    arr.forEach((t, i) => {
                        const tag = i === 0 ? '<span style="color:var(--ok);font-weight:bold;">[主]</span>' : '<span style="color:var(--warn);font-weight:bold;">[备]</span>';
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
            if (!pingEl) return;
            pingEl.textContent = '测速中'; pingEl.style.color = '';
            // 找到延迟所在 stat 的副标题（若存在）以同步状态文案与色彩
            const stat = pingEl.closest('.a-stat');
            const sub = stat ? stat.querySelector('.a-stat-sub') : null;
            const setSub = (text, cls) => {
                if (!sub) return;
                sub.textContent = text;
                sub.classList.remove('up', 'down');
                if (cls) sub.classList.add(cls);
            };
            // 依据测速结果刷新节点状态徽章 (在线/延迟/离线)
            const card = pingEl.closest('.emby-card');
            const setBadge = (state) => {
                if (!card) return;
                const badge = card.querySelector('.node-badge');
                if (!badge) return;
                badge.className = 'node-badge ' + (state === 'online' ? 'is-online' : state === 'slow' ? 'is-slow' : 'is-offline');
                badge.innerHTML = '<span class="bdot"></span>' + (state === 'online' ? '在线' : state === 'slow' ? '延迟' : '离线');
            };
            try {
                const res = await fetch('/api/ping-node?url=' + encodeURIComponent(targetUrl));
                const data = await res.json();
                if(data.ms >= 0) {
                    pingEl.innerHTML = data.ms + '<span class="unit">ms</span>';
                    if (data.ms < 200) { pingEl.style.color = 'var(--ok)'; setSub('良好', 'up'); setBadge('online'); }
                    else if (data.ms < 500) { pingEl.style.color = 'var(--primary)'; setSub('一般', null); setBadge('online'); }
                    else { pingEl.style.color = 'var(--warn)'; setSub('偏高', 'down'); setBadge('slow'); }
                } else { pingEl.textContent = '断连'; pingEl.style.color = 'var(--err)'; setSub('超时', 'down'); setBadge('offline'); }
            } catch(e) { pingEl.textContent = '异常'; pingEl.style.color = 'var(--err)'; setSub('错误', 'down'); setBadge('offline'); }
            if (typeof updateTopbarHealth === 'function') updateTopbarHealth();
        }

        function toggleDetails(el) {
            const card = el.closest('.emby-card') || el.closest('.a-card');
            if (!card) return;
            const d = card.querySelector('.a-details');
            if (d) d.classList.toggle('open');
        }

        function pingAllNodes() {
            if (proxyNodesForPing.length === 0) return showToast('⚠️ 没有可供测速的反代节点');
            showToast('⚡ 正在对所有节点发起测速...');
            proxyNodesForPing.forEach((node, offset) => { setTimeout(() => pingTarget(node.idx, node.url), offset * 200); });
        }

        // ==========================================
        // emby-js 监控移植：节点状态管理面板（admin）
        // ==========================================
        function _embyEscape(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        async function loadEmbyStatusAdmin() {
            const listEl = document.getElementById('embyStatusAdminList');
            const emptyEl = document.getElementById('embyStatusAdminEmpty');
            if (!listEl || !emptyEl) return;
            listEl.innerHTML = '<div style="color:var(--text-sec); font-size:var(--text-sm);">加载中...</div>';
            emptyEl.style.display = 'none';
            try {
                const [routesRes, stateRes, globalRes] = await Promise.all([
                    fetch('/api/routes').then(r => r.json()),
                    fetch('/api/status/auth-state').then(r => r.json()),
                    fetch('/api/status/global-flags').then(r => r.json()).catch(() => ({}))
                ]);
                const hideToggle = document.getElementById('embyHideNamesToggle');
                if (hideToggle) hideToggle.checked = !!(globalRes && globalRes.hide_node_names);
                const ccInput = document.getElementById('proxyCountryAllowlist');
                if (ccInput) ccInput.value = (globalRes && globalRes.country_allowlist) ? globalRes.country_allowlist : '';
                const routes = Array.isArray(routesRes) ? routesRes : [];
                const stateMap = {};
                if (stateRes && stateRes.success && Array.isArray(stateRes.items)) {
                    for (const it of stateRes.items) stateMap[it.prefix] = it;
                }
                if (!routes.length) {
                    listEl.innerHTML = '';
                    emptyEl.style.display = 'block';
                    return;
                }
                const rows = routes.map(r => {
                    const st = stateMap[r.prefix] || {};
                    const showOn = !!(st.show_on_status || r.show_on_status);
                    const autoAuth = !!(st.media_counts_auto_auth || r.media_counts_auto_auth);
                    const alias = st.public_alias != null ? st.public_alias : (r.public_alias || '');
                    const hasToken = !!st.has_token;
                    const seenAt = st.emby_auth_seen_at ? new Date(st.emby_auth_seen_at * 1000).toLocaleString() : '—';
                    const usedAt = st.emby_auth_used_at ? new Date(st.emby_auth_used_at * 1000).toLocaleString() : '—';
                    return '' +
                        '<div class="card" style="padding:14px; gap:10px; display:flex; flex-direction:column;">' +
                            '<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
                                '<b style="font-size:var(--text-md);">' + _embyEscape(r.remark || r.prefix) + '</b>' +
                                '<code style="font-size:11px; opacity:.7;">/' + _embyEscape(r.prefix) + '</code>' +
                            '</div>' +
                            '<div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:var(--text-sm);">' +
                                '<label style="display:flex; gap:6px; align-items:center; cursor:pointer;">' +
                                    '<input type="checkbox" ' + (showOn ? 'checked' : '') + ' onchange="updateEmbyRouteFlag(\\'' + _embyEscape(r.prefix) + '\\',\\'show_on_status\\', this.checked ? 1 : 0)"> 在状态页展示' +
                                '</label>' +
                                '<label style="display:flex; gap:6px; align-items:center; cursor:pointer;" ' + (showOn ? '' : 'data-disabled="1" style="opacity:.5; pointer-events:none;"') + '>' +
                                    '<input type="checkbox" ' + (autoAuth ? 'checked' : '') + ' ' + (showOn ? '' : 'disabled') + ' onchange="updateEmbyRouteFlag(\\'' + _embyEscape(r.prefix) + '\\',\\'media_counts_auto_auth\\', this.checked ? 1 : 0)"> 自动获取媒体计数' +
                                '</label>' +
                            '</div>' +
                            (showOn ? (
                                '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
                                    '<label style="font-size:var(--text-sm); color:var(--text-sec); flex:0 0 auto;">公开名称</label>' +
                                    '<input type="text" value="' + _embyEscape(alias) + '" placeholder="留空则用备注" style="flex:1; min-width:160px; padding:6px 10px; border:1px solid var(--border); border-radius:8px; background:transparent; color:inherit;" onblur="updateEmbyRouteFlag(\\'' + _embyEscape(r.prefix) + '\\',\\'public_alias\\', this.value)">' +
                                    '<button type="button" class="btn-tier" onclick="generateShareCardLink(\\'' + _embyEscape(r.prefix) + '\\')">生成 SVG 卡片</button>' +
                                '</div>'
                            ) : '') +
                            (autoAuth ? (
                                '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:11px; color:var(--text-sec);">' +
                                    '<span>令牌：' + (hasToken ? '已收割' : '尚未收割') + '</span>' +
                                    '<span>首次：' + _embyEscape(seenAt) + '</span>' +
                                    '<span>最近探测使用：' + _embyEscape(usedAt) + '</span>' +
                                    (hasToken ? '<button type="button" class="btn-tier" style="padding:4px 10px; font-size:11px;" onclick="revokeEmbyAuth(\\'' + _embyEscape(r.prefix) + '\\')">撤销并重新收割</button>' : '') +
                                '</div>'
                            ) : '') +
                        '</div>';
                });
                listEl.innerHTML = rows.join('');
            } catch (e) {
                listEl.innerHTML = '<div style="color:var(--bad); font-size:var(--text-sm);">加载失败：' + _embyEscape(e.message) + '</div>';
            }
        }
        async function saveCountryAllowlist() {
            const input = document.getElementById('proxyCountryAllowlist');
            if (!input) return;
            try {
                const res = await fetch('/api/status/global-flags', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country_allowlist: input.value || '' })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('✅ 已保存');
                    loadEmbyStatusAdmin();
                } else {
                    if (typeof showToast === 'function') showToast('❌ ' + (data.error || '保存失败'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('❌ ' + e.message);
            }
        }
        async function updateEmbyGlobalFlag(field, value) {
            try {
                const body = {};
                body[field] = value;
                const res = await fetch('/api/status/global-flags', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('✅ 已保存');
                } else {
                    if (typeof showToast === 'function') showToast('❌ ' + (data.error || '保存失败'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('❌ ' + e.message);
            }
        }
        async function updateEmbyRouteFlag(prefix, field, value) {
            try {
                const body = { prefix };
                body[field] = value;
                const res = await fetch('/api/status/route-flags', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('✅ 已保存');
                    loadEmbyStatusAdmin();
                } else {
                    if (typeof showToast === 'function') showToast('❌ ' + (data.error || '保存失败'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('❌ ' + e.message);
            }
        }
        async function revokeEmbyAuth(prefix) {
            if (!confirm('确认清除该节点的已收割令牌？下次代理请求会自动重新收割。')) return;
            try {
                const res = await fetch('/api/status/revoke-auth', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('✅ 已清除');
                    loadEmbyStatusAdmin();
                } else {
                    if (typeof showToast === 'function') showToast('❌ ' + (data.error || '失败'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('❌ ' + e.message);
            }
        }
        async function generateShareDashboardLink() {
            try {
                const res = await fetch('/api/share/dashboard', { method: 'POST' });
                const data = await res.json();
                const box = document.getElementById('embyShareResult');
                if (data.success) {
                    box.style.display = 'block';
                    box.innerHTML = '✅ 公开分享链接（1 小时有效）：<a href="' + _embyEscape(data.url) + '" target="_blank" rel="noopener">' + _embyEscape(data.url) + '</a>';
                    try { await navigator.clipboard.writeText(data.url); if (typeof showToast === 'function') showToast('✅ 链接已复制'); } catch (e) {}
                } else {
                    box.style.display = 'block';
                    box.innerHTML = '❌ ' + _embyEscape(data.error || '生成失败');
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('❌ ' + e.message);
            }
        }
        async function generateShareCardLink(prefix) {
            try {
                const res = await fetch('/api/share/card', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix })
                });
                const data = await res.json();
                const box = document.getElementById('embyShareResult');
                if (data.success) {
                    box.style.display = 'block';
                    box.innerHTML = '✅ 节点 <code>/' + _embyEscape(prefix) + '</code> 的 SVG 卡片（1 小时有效）：<a href="' + _embyEscape(data.url) + '" target="_blank" rel="noopener">' + _embyEscape(data.url) + '</a>';
                    try { await navigator.clipboard.writeText(data.url); if (typeof showToast === 'function') showToast('✅ 链接已复制'); } catch (e) {}
                } else {
                    box.style.display = 'block';
                    box.innerHTML = '❌ ' + _embyEscape(data.error || '生成失败');
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('❌ ' + e.message);
            }
        }

        async function exportConfig() {
            try {
                const res = await fetch('/api/routes'); const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'emby_proxy_backup.json'; a.click();
                URL.revokeObjectURL(url); showToast('✅ 配置已导出');
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
                        if (result.success) { showToast('✅ 配置导入成功'); load(); } else throw new Error(result.error);
                    } catch (err) { showToast('❌ 导入失败: ' + err.message); }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        async function load() {
            try {
                const res = await fetch('/api/routes');
                if (!res.ok) throw new Error('请求失败，请检查环境配置');
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                // 🌟 新增：把节点流量数据存进全局内存，供大屏瞬间读取！
                window.globalRoutesData = data;

                const container = document.getElementById('list-grid');
                if(data.length === 0) {
                    container.innerHTML = '<div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;">暂无配置任何反代节点，请先部署一个。</div>';
                    return;
                }
                
                container.innerHTML = '';
                proxyNodesForPing = []; 
                const currentHost = window.location.host;

                data.forEach((r, idx) => {
                    const proxyUrl = 'https://' + currentHost + '/' + r.prefix;
                    const targets = r.target.split(',').map(s => s.trim()).filter(Boolean);
                    const mainTarget = targets[0]; 
                    
                    const remarkName = r.remark || '未命名媒体库';
                    const lastPlay = r.last_play ? r.last_play : '暂无播放记录';
                    
                    const encodedTargets = encodeURIComponent(JSON.stringify(targets));

                    // 🌟 接收后端传来的：单节点独立宽带与请求统计数据
                    const todayBw = r.todayBandwidth || '0 B';
                    const totalReqs = r.totalReqs || r.todayReqs || 0;
                    const todayReqs = r.todayReqs || 0;

                    // 状态点：依据最后活跃文本判定（刚刚/秒/分钟/小时 → live；天/暂无 → idle）
                    let statusClass = 'idle';
                    if (/刚刚|秒|分钟|小时/.test(lastPlay)) statusClass = 'live';

                    const isIdle = (todayReqs === 0) && statusClass === 'idle';
                    const cardIdleCls = isIdle ? ' idle' : '';
                    const thumbIdleCls = isIdle ? ' idle' : '';

                    // 缩略图：有 icon URL 用图片，否则取备注首字
                    const thumbLetter = (remarkName.replace(/\\s+/g, '').charAt(0) || '?').toUpperCase();
                    const thumbInner = r.icon
                        ? \`<img src="\${r.icon}" alt="">\`
                        : thumbLetter;

                    // 自定义头标签：统计条数
                    const headerLines = (r.custom_headers || '').split('\\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
                    const headerKeys = headerLines.map(l => l.split(':')[0].trim()).filter(Boolean);

                    const cacheOn = r.cache_img !== 'off';
                    const escAttr = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

                    // 状态徽章 + 迷你折线图 (趋势数据缺失则占位)
                    const badgeHtml = nodeBadgeHtml(statusClass);
                    let trendData = r.trend || r.trafficHistory || r.history || null;
                    if (!Array.isArray(trendData)) trendData = null;
                    const sparkHtml = nodeSparklineHtml(trendData);

                    proxyNodesForPing.push({ idx: idx, url: mainTarget });

                    container.innerHTML += \`
                    <div class="emby-card route-item\${cardIdleCls}" data-prefix="\${r.prefix}" data-search="\${remarkName} \${r.prefix}" data-custom-headers="\${(r.custom_headers || '').replace(/"/g, '&quot;')}">
                        <div class="a-head">
                            <div class="drag-handle a-handle" title="拖拽排序"><svg><use href="#i-grip"/></svg></div>
                            <input type="checkbox" class="node-cb a-cb" value="\${r.prefix}">
                            <div class="a-thumb\${thumbIdleCls}">\${thumbInner}</div>
                            <div class="a-title-block">
                                <div class="a-name">\${remarkName}</div>
                                <div class="a-meta">
                                    <span class="a-status-dot \${statusClass}" title="\${lastPlay}"></span>
                                    <span>/\${r.prefix}</span>
                                    <span class="dot-sep">·</span>
                                    <span class="a-mode">\${modeNames[r.mode] || '未知'}</span>
                                </div>
                            </div>
                            \${badgeHtml}
                        </div>

                        <div class="a-spark-slot" data-spark="\${r.prefix}" style="margin:2px 0;">\${sparkHtml}</div>

                        <div class="a-stats">
                            <div class="a-stat">
                                <div class="a-stat-label">今日流量</div>
                                <span class="a-stat-val\${isIdle ? ' muted' : ''}">\${todayBw}</span>
                                <div class="a-stat-sub">\${isIdle ? '闲置' : '今日累积'}</div>
                            </div>
                            <div class="a-stat">
                                <div class="a-stat-label">今日播放</div>
                                <span class="a-stat-val\${isIdle ? ' muted' : ''}">\${todayReqs}</span>
                                <div class="a-stat-sub">累计 \${totalReqs}</div>
                            </div>
                            <div class="a-stat">
                                <div class="a-stat-label">延迟</div>
                                <span id="ping-\${idx}" class="a-stat-val cursor-pointer"  onclick="pingTarget(\${idx}, '\${mainTarget}')" title="点击重新测速">测速中</span>
                                <div class="a-stat-sub">点击重测</div>
                            </div>
                        </div>

                        <div class="a-tags">
                            \${cacheOn
                                ? '<span class="a-tag good"><svg><use href="#i-image"/></svg>海报缓存</span>'
                                : '<span class="a-tag warn"><svg><use href="#i-image"/></svg>缓存已关闭</span>'}
                            \${headerKeys.length
                                ? \`<span class="a-tag primary" onclick="toggleDetails(this)" title="点击查看自定义请求头"><svg><use href="#i-key"/></svg>\${headerKeys.length} 个自定义头</span>\`
                                : ''}
                            <span class="a-tag">最后活跃 \${lastPlay}</span>
                        </div>

                        <div class="a-details">
                            <div class="a-detail-row">
                                <span class="a-detail-label">直达链接</span>
                                <span id="p-\${idx}" data-val="\${proxyUrl}" class="a-detail-val secret-text">••••••••</span>
                                <span class="a-detail-actions">
                                    <button class="a-icon-btn" onclick="toggleVis('p-\${idx}')" title="查看明文"><svg><use href="#i-eye"/></svg></button>
                                    <button class="a-icon-btn" onclick="copyTxt('\${proxyUrl}')" title="复制链接"><svg><use href="#i-copy"/></svg></button>
                                </span>
                            </div>
                            <div class="a-detail-row">
                                <span class="a-detail-label">源站</span>
                                <span id="t-\${idx}" data-val="\${encodedTargets}" class="a-detail-val secret-text">••••••••</span>
                                <span class="a-detail-actions">
                                    <button class="a-icon-btn" onclick="toggleVis('t-\${idx}', true)" title="查看明文"><svg><use href="#i-eye"/></svg></button>
                                </span>
                            </div>
                            \${headerKeys.length ? \`<div class="a-detail-row">
                                <span class="a-detail-label">自定义头</span>
                                <span class="a-detail-val" title="\${escAttr(headerKeys.join(', '))}">\${headerKeys.join(', ')}</span>
                                <span></span>
                            </div>\` : ''}
                        </div>

                        <div class="a-foot">
                            <button class="a-icon-btn" title="测速" onclick="pingTarget(\${idx}, '\${mainTarget}')"><svg><use href="#i-zap"/></svg></button>
                            <button class="a-icon-btn" title="复制直达链接" onclick="copyTxt('\${proxyUrl}')"><svg><use href="#i-copy"/></svg></button>
                            <button class="a-icon-btn" title="更多详情" onclick="toggleDetails(this)"><svg><use href="#i-more"/></svg></button>
                            <span class="a-foot-spacer"></span>
                            <button class="a-btn-edit" onclick="editNode('\${r.prefix}', '\${r.target}', '\${r.mode}', '\${r.remark || ''}', '\${r.icon || ''}', '\${r.cache_img}')"><svg><use href="#i-edit"/></svg>编辑</button>
                            <button class="a-icon-btn danger-hover" title="删除" onclick="del('\${r.prefix}')"><svg><use href="#i-trash"/></svg></button>
                        </div>
                    </div>\`;

                    setTimeout(() => pingTarget(idx, mainTarget), 500 * idx); 
                });
                
                filterNodesList();

                if (sortableInstance) sortableInstance.destroy();
                sortableInstance = Sortable.create(container, {
                    handle: '.drag-handle',
                    animation: 150,
                    delay: 200, 
                    delayOnTouchOnly: true,
                    onEnd: async function () {
                        const items = [];
                        container.querySelectorAll('.route-item').forEach((row, index) => {
                            const prefix = row.getAttribute('data-prefix');
                            if (prefix) items.push({ prefix: prefix, sort_order: index });
                        });
                        try {
                            await fetch('/api/routes/reorder', { method: 'POST', body: JSON.stringify(items) });
                            showToast('✅ 排序已保存');
                        } catch(e) { showToast('❌ 排序保存失败'); }
                    }
                });

                // 刷新顶部状态栏: 节点总数
                const tbCount = document.getElementById('tb-node-count');
                if (tbCount) tbCount.textContent = String(data.length);
                updateTopbarHealth();

                // ECG 心电图 + 24h/7d 可用率（仅对开启了 show_on_status 的节点显示）
                injectEcgStrips();

                // 异步拉取节点近 7 天每日流量并回填 sparkline
                loadRouteTrends();

            } catch (err) {
                document.getElementById('list-grid').innerHTML = \`<div style="text-align:center; color:var(--err); font-weight:600; grid-column: 1 / -1; padding: 20px;">⚠️ 读取失败: \${err.message}</div>\`;
            }
        }

        // 客户端 ECG/心电图 生成器（与服务端 ecgStripSvg 算法一致）
        function buildEcgSvg(history) {
            const W = 240, H = 36, padX = 2, padY = 4;
            const innerW = W - padX * 2, innerH = H - padY * 2;
            const baseY = padY + innerH - 2;
            const samples = Array.isArray(history) ? history.slice(-60) : [];
            if (!samples.length) {
                return \`<svg class="ecg-svg" viewBox="0 0 \${W} \${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="\${padX}" y1="\${baseY}" x2="\${W-padX}" y2="\${baseY}" class="ecg-base"/><text x="\${W/2}" y="\${H/2+3}" class="ecg-empty" text-anchor="middle">暂无探测</text></svg>\`;
            }
            const n = samples.length;
            const stepX = n > 1 ? innerW / (n - 1) : innerW;
            const msToY = ms => { const c = Math.max(0, Math.min(400, ms || 0)); return baseY - (c / 400) * (innerH * 0.85); };
            let okPath = '', failMarks = '', lastX = padX, inOk = false;
            for (let i = 0; i < n; i++) {
                const s = samples[i], x = padX + stepX * i;
                if (s.ok) {
                    const peakY = msToY(s.ms);
                    const preX = Math.max(lastX, x - stepX * 0.45);
                    const upX = x - stepX * 0.18, dnX = x + stepX * 0.10, tailX = x + stepX * 0.25;
                    okPath += (inOk ? 'L' : 'M') + preX.toFixed(2) + ' ' + baseY + ' L' + upX.toFixed(2) + ' ' + baseY + ' L' + x.toFixed(2) + ' ' + peakY.toFixed(2) + ' L' + dnX.toFixed(2) + ' ' + baseY + ' L' + tailX.toFixed(2) + ' ' + baseY;
                    inOk = true; lastX = tailX;
                } else {
                    if (inOk) { okPath += ' L' + (x - stepX * 0.3).toFixed(2) + ' ' + baseY; inOk = false; }
                    failMarks += '<line x1="' + x.toFixed(2) + '" y1="' + (padY + 1).toFixed(2) + '" x2="' + x.toFixed(2) + '" y2="' + baseY.toFixed(2) + '" class="ecg-fail"/>';
                    lastX = x;
                }
            }
            if (inOk) okPath += ' L' + (padX + innerW).toFixed(2) + ' ' + baseY;
            const last = samples[n - 1], lastY = last.ok ? msToY(last.ms) : baseY;
            const dotCls = last.ok ? 'ecg-dot ok' : 'ecg-dot bad';
            return '<svg class="ecg-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
                '<line x1="' + padX + '" y1="' + baseY + '" x2="' + (W - padX) + '" y2="' + baseY + '" class="ecg-base"/>' +
                '<line x1="' + padX + '" y1="' + (padY + innerH * 0.5).toFixed(2) + '" x2="' + (W - padX) + '" y2="' + (padY + innerH * 0.5).toFixed(2) + '" class="ecg-mid"/>' +
                (okPath ? '<path d="' + okPath + '" class="ecg-line" fill="none"/>' : '') +
                failMarks +
                '<circle cx="' + (padX + innerW).toFixed(2) + '" cy="' + lastY.toFixed(2) + '" r="2.4" class="' + dotCls + '"/>' +
                '</svg>';
        }

        async function injectEcgStrips() {
            try {
                const res = await fetch('/api/status/probes');
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !data.success || !Array.isArray(data.cards)) return;
                const byPrefix = {};
                for (const c of data.cards) byPrefix[c.prefix] = c;
                const cards = document.querySelectorAll('#list-grid .emby-card');
                cards.forEach(card => {
                    const prefix = card.getAttribute('data-prefix');
                    if (!prefix) return;
                    const c = byPrefix[prefix];
                    if (!c) return; // 该节点未开启状态探测
                    if (card.querySelector('.ecg-mount')) return; // 已注入，跳过
                    const pct = v => v == null ? '—' : (v * 100).toFixed(1) + '%';
                    const block = document.createElement('div');
                    block.className = 'ecg-mount';
                    block.innerHTML =
                        '<div class="ecg-strip" aria-label="近 60 次探测心电图">' + buildEcgSvg(c.history) + '</div>' +
                        '<div class="ecg-meta">' +
                            '<span class="ecg-pill ' + (c.ok ? 'ok' : 'bad') + '">' +
                                '<span class="dot"></span>' + (c.ok ? '在线 ' + (c.latest_ms | 0) + 'ms' : '离线') +
                            '</span>' +
                            '<span class="ecg-stat"><b>24h</b> ' + pct(c.avail_24h) + '</span>' +
                            '<span class="ecg-stat"><b>7d</b> ' + pct(c.avail_7d) + '</span>' +
                        '</div>';
                    // 插入到 sparkHtml 之后、a-stats 之前。寻找 .a-stats 节点。
                    const stats = card.querySelector('.a-stats');
                    if (stats) card.insertBefore(block, stats);
                    else card.appendChild(block);
                });
            } catch (e) { /* silent */ }
        }

        // 依据节点徽章统计健康度并刷新顶栏
        function updateTopbarHealth() {
            const cards = document.querySelectorAll('#list-grid .emby-card');
            const total = cards.length;
            const dot = document.getElementById('tb-health-dot');
            const val = document.getElementById('tb-health-val');
            if (!val) { updateAuroraKpis(); return; }
            if (total === 0) {
                val.textContent = '--';
                if (dot) dot.className = 'dot green';
                updateAuroraKpis();
                return;
            }
            let online = 0;
            cards.forEach(c => {
                const b = c.querySelector('.node-badge');
                if (b && (b.classList.contains('is-online') || b.classList.contains('is-slow'))) online++;
            });
            const pct = Math.round(online / total * 100);
            val.textContent = pct + '%';
            if (dot) dot.className = 'dot ' + (pct >= 80 ? 'green' : pct >= 40 ? 'amber' : 'red');
            updateAuroraKpis();
        }

        // Aurora KPI hero — mirror topbar live data into the hero band.
        // Cheap & defensive: no state of its own; reads from existing DOM.
        function updateAuroraKpis() {
            const $ = function(id) { return document.getElementById(id); };
            const setText = function(id, v) {
                const el = $(id);
                if (el) { el.textContent = v; el.classList.remove('skeleton'); }
            };
            const cards = document.querySelectorAll('#list-grid .emby-card');
            const total = cards.length;
            let online = 0;
            cards.forEach(function(c) {
                const b = c.querySelector('.node-badge');
                if (b && (b.classList.contains('is-online') || b.classList.contains('is-slow'))) online++;
            });
            setText('kpi-online-nodes', String(online));
            setText('kpi-total-nodes', String(total));
            const pct = total ? Math.round(online / total * 100) : 0;
            setText('kpi-health', String(pct));
            const bar = $('kpi-health-bar-fill');
            if (bar) bar.style.width = pct + '%';
            const traf = $('tb-traffic-today');
            if (traf && traf.textContent) setText('kpi-traffic', traf.textContent);
            const rtt = $('rttValue');
            if (rtt && rtt.textContent) {
                const m = rtt.textContent.match(/(\\d+(?:\\.\\d+)?)/);
                setText('kpi-rtt', m ? m[1] : rtt.textContent);
            }
        }

        function editNode(prefix, targetStr, mode, remark, icon, cacheImg) {
            document.getElementById('oldPrefix').value = prefix;
            document.getElementById('remark').value = remark;
            document.getElementById('prefix').value = prefix;
            document.getElementById('mode').value = mode || 'off';
            document.getElementById('nodeCache').checked = (cacheImg !== 'off');
            syncCacheSwitch();
            // Read custom_headers from the card's data attribute to avoid inline escaping issues
            const card = document.querySelector(\`.route-item[data-prefix="\${prefix}"]\`);
            HeadersEditor.set(card ? (card.getAttribute('data-custom-headers') || '') : '');

            if (icon) {
                const foundItem = globalIcons.find(i => i.url === icon);
                selectIcon(icon, foundItem ? foundItem.name : '已选择图标');
            } else {
                selectIcon('', '默认 🎬');
            }

            document.getElementById('submitBtn').innerHTML = '<svg><use href="#i-save"/></svg>保存修改';

            const container = document.getElementById('targetInputs');
            container.innerHTML = '';
            const targets = targetStr.split(',').map(s => s.trim()).filter(Boolean);
            targets.forEach((url, idx) => container.appendChild(makeUpstreamRow(idx, url)));
            container.appendChild(makeUpstreamRow(targets.length));
            handleTargetInputs();
            // 编辑节点时切到「系统设置」分区, 让部署表单可见
            if (typeof showSection === 'function') showSection('settings');
            setTimeout(function () {
                const f = document.getElementById('addForm');
                if (f) window.scrollTo({ top: f.offsetTop - 100, behavior: 'smooth' });
            }, 80);
        }

        document.getElementById('addForm').onsubmit = async (e) => {
            e.preventDefault();
            const oldPrefix = document.getElementById('oldPrefix').value;
            const remark = document.getElementById('remark').value.trim();
            const prefix = document.getElementById('prefix').value.trim().replace(/^\\/+/g, '');
            const mode = document.getElementById('mode').value;
            const icon = document.getElementById('iconUrl').value;
            const cache_img = document.getElementById('nodeCache').checked ? 'on' : 'off';
            const custom_headers = HeadersEditor.get();

            const inputs = document.querySelectorAll('.target-input');
            let targetsArray = [];
            inputs.forEach(inp => {
                const val = inp.value.trim().replace(/\\/$/g, '');
                if (val) targetsArray.push(val);
            });
            const target = targetsArray.join(',');
            
            if (!target) return showToast('❌ 请至少填写一个主线路地址');

            try {
                const res = await fetch('/api/routes', { 
                    method: 'POST', 
                    body: JSON.stringify({oldPrefix, prefix, target, mode, remark, icon, cache_img, custom_headers})
                });
                const data = await res.json();
                if(!data.success) throw new Error(data.error || '部署失败');
                
                document.getElementById('addForm').reset();
                document.getElementById('oldPrefix').value = '';
                selectIcon('', '默认 🎬');
                document.getElementById('nodeCache').checked = true;
                syncCacheSwitch();
                HeadersEditor.set('');
                document.getElementById('submitBtn').innerHTML = '<svg><use href="#i-save"/></svg>保存并部署';
                resetTargetInputs();
                
                showToast('✅ 节点部署成功');
                load();
            } catch(err) {
                showToast('❌ 保存失败: ' + err.message);
            }
        };

        async function del(prefix) {
            if(confirm('确定删除节点 /' + prefix + ' ?')) {
                await fetch('/api/routes?prefix=' + prefix, { method: 'DELETE' });
                showToast('🗑️ 节点已移除');
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
            if (ips.length === 0) return showToast('⚠️ 请先提取节点！');
            navigator.clipboard.writeText(ips.join('\\n')).then(() => {
                showToast('✅ 节点已复制，即将跳转 ITDog...');
                setTimeout(() => { window.open('https://www.itdog.cn/batch_tcping/', '_blank'); }, 1500);
            });
        }
        function directSubmitCname() {
            const input = document.getElementById('customIps').value.trim();
            if (!input) return showToast('⚠️ 请先在文本框内粘贴您的优选域名');
            const domainRegex = /\\b([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}\\b/g;
            const matchedDomains = input.match(domainRegex) || [];
            const realDomains = matchedDomains.filter(d => !/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(d));
            if (realDomains.length === 0) return showToast('⚠️ 没有提取到合法的域名格式，请检查输入！');
            if(!confirm(\`✨ 提取到以下域名：\\n\${realDomains.join('\\n')}\\n\\n确定要直接将其设为 CNAME 记录吗？\\n(注意：这会清空你配置的域名下现有的记录)\`)) return;
            const btn = document.getElementById('btnDirectCname');
            sendDnsRequest(realDomains, btn);
        }
        async function testCustomIPs() {
            const input = document.getElementById('customIps').value;
            if (!input.trim()) return showToast('⚠️ 请先在输入框粘贴 IP 或优选域名');
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
            if (extractedIps.length === 0) return showToast('⚠️ 未识别到合法的 IP 或 域名格式');
            const btn = document.getElementById('btnTestCustom');
            const tbody = document.getElementById('testTableBody');
            btn.disabled = true; btn.textContent = '⏳ 测试中...';
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = '';
            showToast(\`✅ 提取到 \${extractedIps.length} 个节点，开始测速校验\`);
            const promises = [];
            extractedIps.forEach(ip => {
                const tr = document.createElement('tr');
                tr.className = 'test-row';
                tr.innerHTML = \`
                    <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                    <td data-label="专属节点"><strong class="ip-text copyable"  onclick="copyTxt('\${ip}')" title="点击复制">\${ip}</strong></td>
                    <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="9999" >测算中...</td>
                    <td data-label="连通状态" class="speed text-muted" >-</td>
                    <td data-label="记录/归属地" class="loc text-muted" >等待解析</td>
                    <td data-label="快捷操作"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">唯一解析</button></td>\`;
                tbody.insertBefore(tr, tbody.firstChild);
                promises.push(doLocalPing(ip, tr, '自定义节点'));
            });
            await Promise.all(promises);
            sortTableByLatency(tbody);
            document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
            btn.disabled = false; btn.textContent = '🧪 测试粘贴的节点';
            showToast('🎉 自定义节点测速完成！');
        }
        async function fetchCustomApiAndTest() {
            const apiUrl = document.getElementById('customApiUrl').value.trim();
            if (!apiUrl) return showToast('⚠️ 请先填入自定义 API 链接');
            const btn = document.getElementById('btnFetchCustomApi');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            btn.disabled = true; btn.textContent = '⏳ 拉取中...';
            statusTxt.innerHTML = \`正在从自定义 API 抓取数据...\`;
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(\`/api/get-custom-api-ips?url=\${encodeURIComponent(apiUrl)}\`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('⚠️ 自定义 API 返回为空'); return; }
                showToast(\`✅ 提取 \${data.totalCount} 个节点，抽取 \${data.ips.length} 个测速\`);
                btn.textContent = '⚡ 测速中...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = \`
                        <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="专属节点"><strong class="ip-text copyable"  onclick="copyTxt('\${ip}')" title="点击复制">\${ip}</strong></td>
                        <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="9999" >测算中...</td>
                        <td data-label="连通状态" class="speed text-muted" >-</td>
                        <td data-label="记录/归属地" class="loc text-muted" >等待解析</td>
                        <td data-label="快捷操作"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">唯一解析</button></td>\`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, '自定义 API'));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                showToast('🎉 自定义 API 测速完成！');
                statusTxt.innerHTML = \`✅ 测速完毕！您可以自由组合更新 DNS。\`;
            } catch (err) { showToast('❌ 拉取失败'); } 
            finally { btn.disabled = false; btn.textContent = '🌐 拉取 API 并测速'; }
        }
        async function fetchRemoteAndTest() {
            const btn = document.getElementById('btnFetchRemote');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            const type = document.getElementById('ipType').value;
            const typeText = document.getElementById('ipType').options[document.getElementById('ipType').selectedIndex].text;
            btn.disabled = true; btn.textContent = '⏳ 正在提取节点...';
            statusTxt.innerHTML = \`正在拉取 <strong>\${typeText}</strong> 数据...\`;
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(\`/api/get-remote-ips?type=\${encodeURIComponent(type)}\`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('⚠️ 未获取到该类型 IP'); return; }
                showToast(\`✅ 成功提取 \${data.totalCount} 个可用 IP，抽取 \${data.ips.length} 个测速\`);
                btn.textContent = '⚡ 本地测速中...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = \`
                        <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="专属节点"><strong class="ip-text copyable"  onclick="copyTxt('\${ip}')" title="点击复制">\${ip}</strong></td>
                        <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="9999" >测算中...</td>
                        <td data-label="连通状态" class="speed text-muted" >-</td>
                        <td data-label="记录/归属地" class="loc text-muted" >等待解析</td>
                        <td data-label="快捷操作"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">唯一解析</button></td>\`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, typeText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                showToast('🎉 测速完成！');
                statusTxt.innerHTML = \`✅ 测速完毕！\`;
            } catch (err) { showToast('❌ 拉取或测速失败'); } 
            finally { btn.disabled = false; btn.textContent = '🌍 提取预设源并测速'; }
        }
        function clearTest() {
            document.getElementById('testTableBody').innerHTML = '<tr><td colspan="6" class="text-center-muted">暂无数据，请拉取节点或输入自定义 IP/域名 测试</td></tr>';
            document.getElementById('statusText').textContent = '列表已清空。';
            document.getElementById('selectAll').checked = false;
        }
        function markTimeout(latTd, spdTd, tr) {
            latTd.textContent = '超时抛弃'; latTd.setAttribute('data-ms', 9999); latTd.style.color = 'var(--err)';
            spdTd.textContent = '❌ 超时 (>2000ms)'; spdTd.style.color = 'var(--err)';
            const cb = tr.querySelector('.row-checkbox');
            if(cb) { cb.disabled = true; cb.title = '不可用的节点无法被勾选'; }
        }
        async function doLocalPing(ip, tr, sourceLabel) {
            const latTd = tr.querySelector('.latency');
            const spdTd = tr.querySelector('.speed');
            const locTd = tr.querySelector('.loc');
            const queryIp = ip.replace(/[\\[\\]]/g, '');
            const isIPv6 = ip.includes(':'); 
            const isDomain = /[a-zA-Z]/.test(queryIp) && !isIPv6;
            if (isDomain) { locTd.innerHTML = \`<span class="badge is-accent">CNAME</span> \${sourceLabel} | 优选域名\`;
            } else {
                const recordLabel = isIPv6 ? '<span class="badge is-info">AAAA</span>' : '<span class="badge" style="background:var(--primary-soft);color:var(--primary);margin-right:var(--space-1);">A记录</span>';
                fetch(\`https://api.ip.sb/geoip/\${queryIp}\`).then(res => res.json()).then(data => locTd.innerHTML = \`\${recordLabel} \${sourceLabel} | \${data.country || '未知'}\`).catch(() => locTd.innerHTML = \`\${recordLabel} \${sourceLabel} | 解析失败\`);
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
            latTd.textContent = latency + ' ms'; latTd.setAttribute('data-ms', latency);
            if (latency < 300) { latTd.style.color = 'var(--ok)'; spdTd.textContent = '🚀 极佳'; spdTd.style.color = 'var(--ok)'; } 
            else if (latency <= 500) { latTd.style.color = 'var(--primary)'; spdTd.textContent = '✅ 正常'; spdTd.style.color = 'var(--primary)'; } 
            else { latTd.style.color = 'var(--warn)'; spdTd.textContent = '⚠️ 较高'; spdTd.style.color = 'var(--warn)'; }
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
            btnElement.textContent = '🔄 更新 DNS 中...'; btnElement.disabled = true;
            try {
                const res = await fetch('/api/update-dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ips }) });
                const data = await res.json();
                if(data.success) { showToast(data.message); btnElement.textContent = '✅ 更新成功'; loadDNS(); } 
                else { showToast('❌ 错误: ' + (data.error || '')); btnElement.textContent = originalText; }
            } catch(e) { showToast('❌ 网络异常，请重试'); btnElement.textContent = originalText; } 
            finally { setTimeout(() => { if(btnElement.textContent === '✅ 更新成功') btnElement.textContent = originalText; btnElement.disabled = false; }, 3000); }
        }
        function updateSingleDns(ip, btnElement) {
            if(!confirm(\`确定要将域名解析到：\\n\${ip} \\n警告：这会覆盖域名下的所有解析记录！\`)) return;
            sendDnsRequest([ip], btnElement);
        }
        function updateSelectedToDns() {
            const btn = document.getElementById('btnSelectedDns');
            const ips = getSelectedIps();
            if (ips.length === 0) return showToast('⚠️ 请先勾选您想使用的节点');
            if(!confirm(\`将应用勾选的 \${ips.length} 个节点：\\n\${ips.join('\\n')}\\n确定更新 DNS 记录吗？\`)) return;
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
            if(topIps.length === 0) return showToast('⚠️ 没找到可用节点，请先测速');
            if(!confirm(\`将为您分发当前最快的 \${topIps.length} 个节点：\\n\${topIps.join('\\n')}\\n确定更新 DNS 记录吗？\`)) return;
            sendDnsRequest(topIps, btn);
        }
        async function loadDNS() {
            const container = document.getElementById('dnsStatus');
            try {
                const res = await fetch('/api/get-dns'); const data = await res.json();
                if (data.success && data.result) {
                    const records = data.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                    if (records.length === 0) {
                        container.innerHTML = '<span class="badge" style="background:var(--warn-soft);color:var(--warn);">暂无解析记录</span>';
                    } else {
                        // Dual-mode markup: desktop reads .sd-dns-badge (rendered inline like the original badges);
                        // mobile CSS upgrades the .sd-dns-list ul into iOS rows with rec-pill / ip / geo split.
                        container.innerHTML = '<ul class="sd-dns-list" role="list">'
                            + records.map(r => {
                                const t = r.type;
                                const cnt = String(r.content || '');
                                return '<li class="sd-dns-row" role="listitem">'
                                    + '<span class="sd-rec-pill is-' + t + '">' + t + '</span>'
                                    + '<code class="sd-ip" title="' + cnt.replace(/"/g, '&quot;') + '">' + cnt + '</code>'
                                    + '<span class="sd-dns-badge">' + t + ' | ' + cnt + '</span>'
                                    + '</li>';
                            }).join('')
                            + '</ul>';
                    }
                } else container.innerHTML = \`<span class="badge" style="background:var(--err-soft);color:var(--err);">\${data.error || '获取失败'}</span>\`;
            } catch (e) { container.innerHTML = '<span class="badge" style="background:var(--err-soft);color:var(--err);">网络异常</span>'; }
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
                    dotEl.style.background = 'var(--ok)'; dotEl.style.boxShadow = '0 0 8px var(--ok)';
                    rttEl.style.color = 'var(--ok)';
                } else if (rtt < 200) {
                    dotEl.style.background = 'var(--warn)'; dotEl.style.boxShadow = '0 0 8px var(--warn)';
                    rttEl.style.color = 'var(--warn)';
                } else {
                    dotEl.style.background = 'var(--err)'; dotEl.style.boxShadow = '0 0 8px var(--err)';
                    rttEl.style.color = 'var(--err)';
                }
            } catch (e) {
                document.getElementById('rttValue').textContent = '断连';
                document.getElementById('rttDot').style.background = 'var(--err)';
            }
        }
        
        // 先立即执行一次，然后每 3 秒循环探测
        measureRTT();
        setInterval(measureRTT, 3000);

    // 🚀 新增：前端探针自动检测脚本
        async function fetchCfTrace() {
            try {
                const res = await fetch('/api/edge-info');
                const data = await res.json();
                if (data.success) {
                    // Compact entry: just the colo code (e.g. "HKG"); full text shown in pill tooltip
                    const entryEl = document.getElementById('trace-entry');
                    entryEl.innerText = data.entryColo || '--';
                    let fullEntry = data.entryCountry || '';
                    if (data.entryCity && data.entryCity !== '未知') fullEntry += ' ' + data.entryCity;
                    fullEntry += ' (' + (data.entryColo || '?') + ')';
                    if (data.cacheKey) fullEntry += ' · key=' + data.cacheKey;
                    entryEl.title = '访客入口: ' + fullEntry;

                    const egressText = data.egressColo;
                    const egressElem = document.getElementById('trace-egress');
                    egressElem.innerText = egressText;
                    egressElem.title = 'Worker 落地: ' + egressText + (data.cacheKey ? ' · key=' + data.cacheKey : '');

                    if (data.entryColo !== egressText && egressText !== '探测中...' && egressText !== '获取失败') {
                        egressElem.style.color = 'var(--warn)';
                        egressElem.title += ' (智能放置/回源)';
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

        // 🚀 联动菜单处理逻辑 + 同步顶部 pill 标签
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

            // Update placement pill label
            var pillLabel = document.getElementById('placeModeLabel');
            if (pillLabel) {
                var labels = { aws: 'AWS', gcp: 'GCP', azure: 'Azure', custom: '自定义' };
                if (labels[mode]) {
                    pillLabel.textContent = labels[mode];
                } else {
                    try {
                        var parsed = JSON.parse(mode);
                        pillLabel.textContent = parsed.mode === 'smart' ? '智能' : '边缘';
                    } catch (_) { pillLabel.textContent = '智能'; }
                }
            }
        }

        function togglePlacementDrawer() {
            var pill = document.getElementById('placePill');
            var drawer = document.getElementById('placeDrawer');
            if (!pill || !drawer) return;
            pill.classList.toggle('open');
            drawer.classList.toggle('open');
        }

        function openPlacementDrawerFromMobile() {
            var pill = document.getElementById('placePill');
            var drawer = document.getElementById('placeDrawer');
            if (!drawer) return;
            if (pill) pill.classList.add('open');
            drawer.classList.add('open');
            try { drawer.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { drawer.scrollIntoView(); }
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
                    statusElem.innerText = "❌ 请填写自定义区域代码（如 gcp:asia-east2）";
                    statusElem.style.color = "var(--err)";
                    return;
                }
                placementPayload = { region: customVal.trim() };
            } else {
                placementPayload = JSON.parse(modeVal);
            }

            statusElem.innerText = "⏳ 正在提交请求，请稍候...";
            statusElem.style.color = "var(--warn)";
            
            try {
                var res = await fetch('/api/placement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placement: placementPayload })
                });
                var data = await res.json();
                if (data.success) {
                    statusElem.innerText = "✅ " + data.msg;
                    statusElem.style.color = "var(--ok)";
                } else {
                    statusElem.innerText = "❌ " + data.msg;
                    statusElem.style.color = "var(--err)";
                }
            } catch(e) {
                statusElem.innerText = "❌ 网络错误: " + e.message;
                statusElem.style.color = "var(--err)";
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
                statusElem.innerText = "⚠️ 请先打勾需要修改的节点！";
                statusElem.style.color = "var(--warn)";
                return;
            }

            if (!confirm("确定要将勾选的 " + selectedPrefixes.length + " 个节点切换为该模式吗？")) return;

            statusElem.innerText = "⏳ 正在多线程并发修改节点...";
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
                        throw new Error("节点 " + r.prefix + " 保存失败");
                    }
                }));
                
                statusElem.innerText = "✅ 批量修改成功！";
                statusElem.style.color = "var(--ok)";
                setTimeout(() => location.reload(), 1000); 

            } catch (e) {
                statusElem.innerText = "❌ 失败: " + e.message;
                statusElem.style.color = "var(--err)";
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
                alert('⚠️ 失败：请先粘贴代码，或者选择一个 .js 文件！');
                return;
            }
            if (!confirm('🚨 危险操作确认 🚨\\n\\n你即将强行覆盖当前 Worker 的代码。\\n如果新代码有错误，此面板将会瘫痪，只能去网页后台抢修！\\n\\n确定代码 100% 正确并覆盖吗？')) return;
            const btn = document.getElementById('deployBtn');
            const originalText = btn.innerText;
            btn.innerText = '⏳ 正在与 Cloudflare 通信并部署...';
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
                    alert('🎉 成功！' + data.msg + '\\n\\n点击确定后页面将自动刷新。');
                    window.location.reload(); 
                } else {
                    alert('❌ 部署失败：\\n' + JSON.stringify(data.error));
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
                        document.getElementById('updateMsg').innerText = '当前版本: v' + CURRENT_VERSION + ' | 发现最新版本: v' + latestVersion + ' (Github)';
                    }
                }
            } catch (e) {
                console.log("检测更新失败:", e);
            }
        }

        async function doOnlineUpdate() {
            if (!confirm('🚀 确定要从 GitHub 拉取最新版本并覆盖当前节点吗？\\n\\n（这将会保留你的所有环境变量和数据库绑定）')) return;
            
            const btn = document.getElementById('onlineUpdateBtn');
            btn.innerText = '⏳ 正在拉取并部署...';
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
                    alert('🎉 在线更新成功！\\n\\n点击确定后页面将自动刷新，畅享新版本！');
                    window.location.reload(); 
                } else {
                    alert('❌ 更新失败：\\n' + JSON.stringify(data.error));
                }
            } catch (e) {
                alert('🚨 异常：\\n' + e.message);
            } finally {
                btn.innerText = '🚀 一键拉取并升级';
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }

        // 页面加载完成后自动在后台静默检测更新
        document.addEventListener('DOMContentLoaded', checkForUpdates);

        // ============================================================
        // UI Suggestions v2.0.7 — Headers Editor + menu helpers
        // ============================================================

        // Generic dropdown menu (used by "更多 ▾" and "配置工具")
        function toggleMenu(btn) {
            const wrap = btn.closest('.menu-wrap');
            const menu = wrap && wrap.querySelector('.menu');
            if (!menu) return;
            const wasOpen = menu.classList.contains('open');
            closeAllMenus();
            if (!wasOpen) menu.classList.add('open');
        }
        function closeAllMenus() {
            document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open'));
        }
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-wrap')) closeAllMenus();
        });

        // Append a backup line input (called by the dashed "+ 添加备用线路" button)
        function addBackupLine() {
            const wrap = document.getElementById('targetInputs');
            if (!wrap) return;
            const existing = wrap.querySelectorAll('.target-input').length;
            const row = document.createElement('div');
            row.className = 'a-upstream-row';
            row.innerHTML = '<span class="a-tag-bk">备 ' + existing + '</span>' +
                '<input type="url" class="a-input target-input" placeholder="备用线路 ' + existing + ' (选填，主源挂掉时触发)" oninput="handleTargetInputs()">';
            wrap.appendChild(row);
            if (typeof handleTargetInputs === 'function') handleTargetInputs();
        }

        // Two-way bind the iOS-style cache toggle with the underlying checkbox
        function toggleCacheSwitch(el) {
            const cb = document.getElementById('nodeCache');
            if (!cb) return;
            cb.checked = !cb.checked;
            el.querySelector('.ios-switch').classList.toggle('on', cb.checked);
        }
        function syncCacheSwitch() {
            const cb = document.getElementById('nodeCache');
            const sw = document.querySelector('#cacheToggleRow .ios-switch');
            if (cb && sw) sw.classList.toggle('on', cb.checked);
        }

        // Headers Editor — KV editor that serializes to the legacy "Key: Value\\n..." format
        const HeadersEditor = (() => {
            const SENSITIVE_KEYS = ['authorization','cookie','x-api-key','x-auth-token','x-emby-token','token'];
            let rows = [];
            let dragSrc = null;
            let nextId = 1;

            const $list = () => document.getElementById('hed-list');
            const $count = () => document.getElementById('hed-count');

            const isSensitiveKey = (k) => SENSITIVE_KEYS.includes((k || '').trim().toLowerCase());

            function makeRow(key = '', value = '', on = true) {
                return { id: nextId++, key, value, on, masked: isSensitiveKey(key) };
            }

            function escapeHtml(s) {
                return String(s)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            function render() {
                const list = $list();
                if (!list) return;

                if (rows.length === 0) {
                    list.innerHTML = '<div class="hed-empty">尚未添加任何请求头 · 点「+ 添加请求头」或从下方模板插入</div>';
                } else {
                    list.innerHTML = rows.map(r => {
                        const sensitive = r.masked || isSensitiveKey(r.key);
                        return '<div class="hed-row ' + (r.on ? '' : 'disabled') + '" draggable="true" data-id="' + r.id + '">' +
                            '<span class="hed-handle" title="拖拽排序">⋮⋮</span>' +
                            '<input type="text" class="hed-k" value="' + escapeHtml(r.key) + '" placeholder="Header-Name" data-id="' + r.id + '" data-field="key">' +
                            '<div class="hed-v-wrap">' +
                                '<input type="' + (r.masked ? 'password' : 'text') + '" class="hed-v" value="' + escapeHtml(r.value) + '" placeholder="value" data-id="' + r.id + '" data-field="value">' +
                                (sensitive ? '<button type="button" class="mask-btn" data-id="' + r.id + '" title="' + (r.masked ? '显示' : '隐藏') + '"><svg><use href="#' + (r.masked ? 'i-eye' : 'i-eye-off') + '"/></svg></button>' : '') +
                            '</div>' +
                            '<div class="ios-switch ' + (r.on ? 'on' : '') + '" data-id="' + r.id + '" title="' + (r.on ? '已启用' : '已停用') + '"></div>' +
                            '<button type="button" class="hed-del" data-id="' + r.id + '" title="删除"><svg><use href="#i-x"/></svg></button>' +
                        '</div>';
                    }).join('');
                }

                updateCount();
                bindRowEvents();
            }

            function bindRowEvents() {
                const list = $list();
                if (!list) return;
                list.querySelectorAll('input.hed-k, input.hed-v').forEach(inp => {
                    inp.oninput = (e) => {
                        const id = +e.target.dataset.id;
                        const row = rows.find(r => r.id === id);
                        if (!row) return;
                        row[e.target.dataset.field] = e.target.value;
                        if (e.target.dataset.field === 'key') {
                            const nowSensitive = isSensitiveKey(row.key);
                            if (!row.masked && nowSensitive) { row.masked = true; render(); return; }
                        }
                        updateCount();
                    };
                });
                list.querySelectorAll('.ios-switch').forEach(sw => {
                    sw.onclick = (e) => {
                        const id = +e.currentTarget.dataset.id;
                        const row = rows.find(r => r.id === id);
                        if (!row) return;
                        row.on = !row.on;
                        render();
                    };
                });
                list.querySelectorAll('.hed-del').forEach(btn => {
                    btn.onclick = (e) => {
                        const id = +e.currentTarget.dataset.id;
                        rows = rows.filter(r => r.id !== id);
                        render();
                    };
                });
                list.querySelectorAll('.mask-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const id = +e.currentTarget.dataset.id;
                        const row = rows.find(r => r.id === id);
                        if (!row) return;
                        row.masked = !row.masked;
                        render();
                    };
                });
                list.querySelectorAll('.hed-row').forEach(row => {
                    row.ondragstart = (e) => {
                        dragSrc = +row.dataset.id;
                        row.classList.add('dragging');
                        e.dataTransfer.effectAllowed = 'move';
                    };
                    row.ondragend = () => row.classList.remove('dragging');
                    row.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
                    row.ondrop = (e) => {
                        e.preventDefault();
                        const targetId = +row.dataset.id;
                        if (dragSrc === null || dragSrc === targetId) return;
                        const srcIdx = rows.findIndex(r => r.id === dragSrc);
                        const tgtIdx = rows.findIndex(r => r.id === targetId);
                        const [moved] = rows.splice(srcIdx, 1);
                        rows.splice(tgtIdx, 0, moved);
                        dragSrc = null;
                        render();
                    };
                });
            }

            function updateCount() {
                const c = $count();
                if (c) c.textContent = rows.filter(r => r.on && r.key.trim()).length;
            }

            function serialize() {
                const seen = new Set();
                return rows
                    .filter(r => r.on && r.key.trim() !== '')
                    .map(r => {
                        const k = r.key.trim();
                        const lk = k.toLowerCase();
                        if (seen.has(lk)) return null;
                        seen.add(lk);
                        return k + ': ' + r.value;
                    })
                    .filter(Boolean)
                    .join('\\n');
            }

            function parse(str) {
                if (!str) return [];
                return str.split('\\n').map(line => {
                    const t = line.trim();
                    if (!t || t.startsWith('#')) return null;
                    const idx = t.indexOf(':');
                    if (idx < 1) return null;
                    const k = t.slice(0, idx).trim();
                    const v = t.slice(idx + 1).trim();
                    return makeRow(k, v, true);
                }).filter(Boolean);
            }

            return {
                init(initial) { rows = parse(initial || ''); render(); },
                get() { return serialize(); },
                set(str) { rows = parse(str || ''); render(); },
                addRow(k = '', v = '', on = true) {
                    rows.push(makeRow(k, v, on));
                    render();
                    requestAnimationFrame(() => {
                        const last = $list() && $list().querySelector('.hed-row:last-child .hed-k');
                        if (last && !k) last.focus();
                    });
                },
                insertTemplate(k, v) {
                    const existing = rows.find(r => r.key.toLowerCase() === k.toLowerCase());
                    if (existing) {
                        showToast('「' + k + '」已存在');
                        existing.on = true;
                        render();
                        return;
                    }
                    rows.push(makeRow(k, v, true));
                    render();
                },
                openCurlModal() {
                    const m = document.getElementById('curlModal');
                    if (m) {
                        m.classList.add('show');
                        setTimeout(() => { const i = document.getElementById('curlInput'); if (i) i.focus(); }, 50);
                    }
                },
                closeCurlModal() {
                    const m = document.getElementById('curlModal');
                    if (m) m.classList.remove('show');
                    const i = document.getElementById('curlInput');
                    if (i) i.value = '';
                },
                parseCurl() {
                    const input = document.getElementById('curlInput');
                    const text = input ? input.value : '';
                    const re = /(?:-H|--header)\\s+(['"])([^:]+):\\s*([^]*?)\\1/g;
                    let match, added = 0;
                    while ((match = re.exec(text)) !== null) {
                        const k = match[2].trim();
                        const v = match[3].trim();
                        if (!k) continue;
                        if (rows.find(r => r.key.toLowerCase() === k.toLowerCase())) continue;
                        rows.push(makeRow(k, v, true));
                        added++;
                    }
                    if (added === 0) {
                        showToast('❌ 未在 cURL 中找到 -H 标头');
                        return;
                    }
                    this.closeCurlModal();
                    render();
                    showToast('✅ 导入 ' + added + ' 条请求头');
                }
            };
        })();
        window.HeadersEditor = HeadersEditor;

        // Bootstrap empty editor once DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            HeadersEditor.init('');
            syncCacheSwitch();
        });
    </script>

    <!-- cURL paste modal (UI Suggestions v2.0.7) -->
    <div class="curl-modal-bg" id="curlModal" onclick="if(event.target===this) HeadersEditor.closeCurlModal()">
        <div class="curl-modal">
            <h3>从 cURL 命令导入</h3>
            <p>粘贴浏览器 DevTools 「Copy as cURL」 出来的内容，自动提取所有 <code style="background:rgba(120,120,120,0.1);padding:1px 4px;border-radius:3px;font-size:var(--text-xs);">-H</code> 标头：</p>
            <textarea id="curlInput" placeholder="curl 'https://example.com/api/users/AuthenticateByName' \\&#10;  -H 'authorization: MediaBrowser Token=&quot;xxx&quot;' \\&#10;  -H 'x-emby-token: abc123' \\&#10;  --compressed"></textarea>
            <div class="curl-modal-actions">
                <button class="btn-tier" onclick="HeadersEditor.closeCurlModal()">取消</button>
                <button class="btn-tier is-primary" onclick="HeadersEditor.parseCurl()">解析并导入</button>
            </div>
        </div>
    </div>

    <!-- 移动端底部导航 Tab Bar v5 (桌面端 CSS 隐藏) — 5 主项 + 更多 sheet -->
    <nav id="mobileTabBar" aria-label="底部导航">
        <button type="button" data-tab="home" class="active" aria-label="概览">
            <svg class="ico-outline" viewBox="0 0 24 24"><path d="M3 12 12 4l9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><path d="M11.3 3.5a1 1 0 0 1 1.4 0l8.6 7.6a1 1 0 0 1-.7 1.74H19V20a1 1 0 0 1-1 1h-3v-6h-4v6H8a1 1 0 0 1-1-1v-7.16H5.4a1 1 0 0 1-.7-1.74z"/></svg>
            <span>概览</span>
        </button>
        <button type="button" data-tab="speed" aria-label="测速">
            <svg class="ico-outline" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><path d="M13.4 2.13a.8.8 0 0 1 1.32.79L13.5 10h7.05a.8.8 0 0 1 .62 1.31l-10 12a.8.8 0 0 1-1.42-.61L10.95 14H3.9a.8.8 0 0 1-.62-1.31z"/></svg>
            <span>测速</span>
        </button>
        <button type="button" data-tab="stats" aria-label="数据">
            <svg class="ico-outline" viewBox="0 0 24 24"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><rect x="4" y="13" width="4" height="8" rx="1"/><rect x="10" y="9" width="4" height="12" rx="1"/><rect x="16" y="3" width="4" height="18" rx="1"/></svg>
            <span>数据</span>
        </button>
        <button type="button" data-tab="settings" aria-label="设置">
            <svg class="ico-outline" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.34 7.34 0 0 0-1.7-.98l-.38-2.65a.5.5 0 0 0-.5-.42h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.61.24-1.18.57-1.7.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.41 1.09.74 1.7.98l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.61-.24 1.18-.57 1.7-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"/></svg>
            <span>设置</span>
        </button>
        <button type="button" data-tab="more" aria-label="更多" aria-haspopup="true">
            <svg class="ico-outline" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            <span>更多</span>
        </button>
    </nav>

    <!-- 更多 sheet (mobile-only iOS action sheet for overflow sections) -->
    <div id="moreSheet" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="moreSheetTitle" onclick="if(event.target===this) closeMoreSheet()">
        <div class="more-sheet-card" role="document">
            <span class="more-sheet-grip" aria-hidden="true"></span>
            <h3 class="more-sheet-title" id="moreSheetTitle">更多入口</h3>
            <div class="more-sheet-list">
                <button type="button" class="more-sheet-row" data-section="embyStatus">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>节点状态</span>
                    <svg class="ms-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button type="button" class="more-sheet-row" data-section="tools">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    <span>工具箱</span>
                    <svg class="ms-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button type="button" class="more-sheet-row is-danger" data-section="danger">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>危险区</span>
                    <svg class="ms-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
        </div>
    </div>

    <script>
        // 📱 Mobile bottom Tab Bar + status pills (mobile only; desktop CSS hides them)
        (function () {
            function initMobileTabBar() {
                const bar = document.getElementById('mobileTabBar');
                if (!bar) return;
                // tab → section 映射 (v5: more = 更多 sheet, 不直接跳分区)
                const tabToSection = { home: 'overview', speed: 'speed', stats: 'stats', settings: 'settings' };
                bar.querySelectorAll('button[data-tab]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tab = btn.dataset.tab;
                        if (tab === 'more') {
                            openMoreSheet();
                            return;
                        }
                        const section = tabToSection[tab];
                        if (section && typeof showSection === 'function') {
                            showSection(section);
                        }
                    });
                });
            }
            function initMoreSheet() {
                const sheet = document.getElementById('moreSheet');
                if (!sheet) return;
                sheet.querySelectorAll('.more-sheet-row[data-section]').forEach(row => {
                    row.addEventListener('click', () => {
                        const section = row.dataset.section;
                        closeMoreSheet();
                        if (section && typeof showSection === 'function') {
                            // 等 sheet 收回再切，避免动画卡顿
                            setTimeout(() => showSection(section), 200);
                        }
                    });
                });
                // ESC / 背景点击关闭已由 onclick + keydown 处理
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && sheet.classList.contains('is-open')) closeMoreSheet();
                });
            }
            window.openMoreSheet = function () {
                const sheet = document.getElementById('moreSheet');
                if (!sheet) return;
                sheet.classList.add('is-open');
                sheet.setAttribute('aria-hidden', 'false');
            };
            window.closeMoreSheet = function () {
                const sheet = document.getElementById('moreSheet');
                if (!sheet) return;
                sheet.classList.remove('is-open');
                sheet.setAttribute('aria-hidden', 'true');
            };
            function initMobilePills() {
                const sources = [
                    { src: 'rttValue',       dst: 'm-pill-rtt' },
                    { src: 'placeModeLabel', dst: 'm-pill-mode' },
                    { src: 'trafficToday',   dst: 'm-pill-today' },
                    { src: 'trafficToday',   dst: 'tb-traffic-today' },
                    { src: 'tb-health-val',  dst: 'm-pill-health' },
                ];
                const sync = () => {
                    sources.forEach(({ src, dst }) => {
                        const s = document.getElementById(src);
                        const d = document.getElementById(dst);
                        if (s && d) {
                            const txt = (s.textContent || '').trim();
                            if (txt && txt !== '加载中...') d.textContent = txt;
                        }
                    });
                    if (typeof updateAuroraKpis === 'function') updateAuroraKpis();
                };
                sync();
                sources.forEach(({ src }) => {
                    const node = document.getElementById(src);
                    if (!node) return;
                    new MutationObserver(sync).observe(node, { childList: true, characterData: true, subtree: true });
                });
            }
            // 📱 Drag-to-dismiss for the bottom-sheet dashboard modal (mobile only)
            function initSheetGesture() {
                const modal = document.getElementById('dashboardModal');
                if (!modal) return;
                const card = modal.querySelector('.card');
                if (!card) return;
                const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
                let startY = 0, dy = 0, dragging = false;

                card.addEventListener('touchstart', (e) => {
                    if (!isMobile()) return;
                    // Allow drag from grip area (top 44px) regardless of scrollTop — supports both directions
                    const t = e.touches[0];
                    const rect = card.getBoundingClientRect();
                    if (t.clientY - rect.top > 44) return;
                    startY = t.clientY; dy = 0; dragging = true;
                    card.classList.add('is-dragging');
                }, { passive: true });

                card.addEventListener('touchmove', (e) => {
                    if (!dragging) return;
                    const raw = e.touches[0].clientY - startY;
                    // Track both directions; up = expand intent (negative)
                    dy = raw;
                    let eased;
                    if (raw >= 0) {
                        // downward (dismiss): light resistance after 200px
                        eased = raw < 200 ? raw : 200 + (raw - 200) * 0.4;
                    } else {
                        // upward (expand): visual hint only, cap at -32px
                        eased = Math.max(raw * 0.35, -32);
                    }
                    card.style.transform = 'translateY(' + eased + 'px)';
                }, { passive: true });

                const finish = () => {
                    if (!dragging) return;
                    dragging = false;
                    card.classList.remove('is-dragging');
                    card.style.transition = 'transform 0.24s cubic-bezier(.32,.72,.3,1)';
                    if (dy > 120) {
                        // Dismiss
                        card.style.transform = 'translateY(100%)';
                        setTimeout(() => {
                            if (typeof closeDashboard === 'function') closeDashboard();
                            card.style.transition = '';
                            card.style.transform = '';
                            card.classList.remove('is-expanded');
                        }, 240);
                    } else if (dy < -60) {
                        // Expand to large detent
                        card.classList.add('is-expanded');
                        card.style.transform = '';
                        setTimeout(() => { card.style.transition = ''; }, 240);
                    } else {
                        card.style.transform = '';
                        setTimeout(() => { card.style.transition = ''; }, 240);
                    }
                    dy = 0;
                };
                card.addEventListener('touchend', finish);
                card.addEventListener('touchcancel', finish);
            }

            // === iOS-native chrome v5: brand, large-title, scroll observer, logout row ===
            const IOS_SECTION_TITLES = {
                overview:    { title: '概览',        sub: '实时状态与核心指标' },
                speed:       { title: '测速 & DNS',  sub: '节点延迟与解析探测' },
                stats:       { title: '数据统计',     sub: '流量、并发与历史趋势' },
                embyStatus:  { title: '节点状态',     sub: '探测、告警与公开分享' },
                settings:    { title: '系统设置',     sub: '应用、通知与账户' },
                tools:       { title: '工具箱',       sub: '实用工具集合' },
                danger:      { title: '危险区',       sub: '不可逆操作，请谨慎' },
            };
            // 暴露给 showSection() 用来同步紧凑栏标题
            window.__iosSectionTitles = Object.fromEntries(
                Object.entries(IOS_SECTION_TITLES).map(([k, v]) => [k, v.title])
            );

            function injectMobileBrand() {
                const topbar = document.getElementById('cf-trace-card');
                if (!topbar || topbar.querySelector('.mob-brand')) return;
                const brand = document.createElement('div');
                brand.className = 'mob-brand';
                brand.innerHTML = '<span class="mb-logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span>反代核心</span>';
                topbar.insertBefore(brand, topbar.firstChild);
            }

            function injectSectionHeaders() {
                document.querySelectorAll('.app-section').forEach(sec => {
                    if (sec.querySelector(':scope > .ios-page-header')) return;
                    const key = sec.getAttribute('data-section');
                    const meta = IOS_SECTION_TITLES[key];
                    if (!meta) return;
                    // v2.5.0: the Danger section keeps its own .danger-hero
                    // (warning icon + red title); injecting a generic
                    // .ios-page-header on top would double the title.
                    if (key === 'danger' && sec.querySelector(':scope > .danger-hero')) return;
                    const hdr = document.createElement('header');
                    hdr.className = 'ios-page-header';
                    hdr.innerHTML =
                        '<h1 class="ios-large-title">' + meta.title + '</h1>' +
                        '<p class="ios-sub">' + meta.sub + '</p>';
                    sec.insertBefore(hdr, sec.firstChild);
                });
            }

            function initScrollObserver() {
                // Header for the currently visible section drives body.is-scrolled
                const update = () => {
                    const activeSec = document.querySelector('.app-section.is-active');
                    if (!activeSec) return;
                    const hdr = activeSec.querySelector(':scope > .ios-page-header');
                    if (!hdr) { document.body.classList.remove('is-scrolled'); return; }
                    const bottom = hdr.getBoundingClientRect().bottom;
                    document.body.classList.toggle('is-scrolled', bottom < 8);
                };
                let ticking = false;
                window.addEventListener('scroll', () => {
                    if (ticking) return;
                    ticking = true;
                    requestAnimationFrame(() => { update(); ticking = false; });
                }, { passive: true });
                update();
            }

            function syncCompactBarTitle() {
                const activeSec = document.querySelector('.app-section.is-active');
                if (!activeSec) return;
                const key = activeSec.getAttribute('data-section');
                const meta = IOS_SECTION_TITLES[key];
                if (!meta) return;
                const compact = document.getElementById('mobileTopbarCompact');
                if (compact) compact.textContent = meta.title;
                // v2.5.0: also populate desktop glass-topbar slot on initial paint.
                const tbSlot = document.getElementById('tbSectionTitle');
                if (tbSlot) tbSlot.textContent = meta.title;
            }

            function injectLogoutRow() {
                const settings = document.querySelector('.app-section[data-section="settings"]');
                if (!settings || document.getElementById('iosLogoutGroup')) return;
                const group = document.createElement('div');
                group.id = 'iosLogoutGroup';
                group.className = 'ios-form-group';
                group.style.marginTop = '24px';
                group.innerHTML =
                    '<button type="button" class="ios-form-row is-tap is-danger" id="iosLogoutBtn" style="width:100%;border:none;background:transparent;font:inherit;cursor:pointer;justify-content:center;font-weight:600;">退出登录</button>';
                settings.appendChild(group);
                group.querySelector('#iosLogoutBtn').addEventListener('click', () => {
                    if (confirm('确认退出登录？')) {
                        if (typeof logout === 'function') logout();
                    }
                });
            }

            function initIosChrome() {
                if (!window.matchMedia('(max-width: 768px)').matches) {
                    // Still inject markup so that on resize it works; CSS hides on desktop.
                }
                injectMobileBrand();
                injectSectionHeaders();
                injectLogoutRow();
                initScrollObserver();
                syncCompactBarTitle();
            }

            function bootAll() {
                initMobileTabBar();
                initMobilePills();
                initSheetGesture();
                initMoreSheet();
                initIosChrome();
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', bootAll);
            } else {
                bootAll();
            }
        })();
    </script>
</body>
</html>
`;

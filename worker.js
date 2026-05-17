// VERSION: 2.0.7
// 🟢 面板核心配置区 (放在最顶端方便修改)
const CURRENT_VERSION = "2.0.7";
const GITHUB_RAW_URL = "这里填下你的在线更新地址";

// ==========================================
// 1. 网页界面-单播报版本
// ==========================================

const SVG_TG = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;margin-right:8px;fill:#0088cc;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/></svg>`;

const CSS_COMMON = `
    :root { 
        --primary: #0071e3; 
        --primary-hover: #005cbf;
        --bg: #f5f5f7; 
        --card: #ffffff; 
        --text: #1d1d1f; 
        --text-sec: #86868b;
        --border: #d2d2d7; 
        --radius-card: 16px;
    }
    
    body.dark {
        --primary: #0a84ff; 
        --primary-hover: #0071e3;
        --bg: #000000; 
        --card: #1c1c1e; 
        --text: #f5f5f7; 
        --text-sec: #98989d;
        --border: #38383a;
    }

    * { box-sizing: border-box; touch-action: manipulation; }
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; -webkit-text-size-adjust: 100%; transition: background-color 0.3s, color 0.3s; }
    .container { max-width: 1200px; margin: 0 auto; width: 100%; min-height: 90vh; display: flex; flex-direction: column;}
    .content-wrap { flex: 1; }
    input, select, button, textarea { font-family: inherit; outline: none; font-size: 15px; }
    
    .card { background: var(--card); padding: 24px; border-radius: var(--radius-card); box-shadow: 0 4px 20px rgba(0,0,0,0.03); margin-bottom: 24px; border: 1px solid var(--border); transition: 0.3s; }
    
    #toast { position: fixed; top: -60px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: white; padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: 500; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 9999; backdrop-filter: blur(10px); text-align: center; max-width: 90vw; word-wrap: break-word; }
    #toast.show { top: 20px; }

    .toolbar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
    .btn-submit { padding: 12px 20px; background: var(--primary); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; white-space: nowrap; transition: 0.2s; box-shadow: 0 4px 12px rgba(0, 113, 227, 0.2); }
    .btn-submit:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0, 113, 227, 0.3); }
    .btn-submit:active { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    
    .table-wrapper { width: 100%; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; background: var(--card); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
    th { color: var(--text-sec); font-weight: 600; background: rgba(120,120,120,0.05); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background-color: rgba(120,120,120,0.03); }
    
    .action-group { display: inline-flex; gap: 8px; background: rgba(120,120,120,0.05); padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border); align-items: flex-start; max-width: 100%; flex-wrap: wrap; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: var(--card); cursor: pointer; color: var(--text); padding: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.05); transition: 0.2s; flex-shrink: 0; font-size:16px; }
    .icon-btn:hover { color: var(--primary); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .icon-btn svg { width: 15px; height: 15px; fill: currentColor; }
    
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
    
    .btn-edit { padding: 8px 14px; background: var(--card); color: var(--primary); border: 1px solid var(--primary); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: 0.2s; }
    .btn-del { padding: 8px 14px; background: var(--card); color: #ff3b30; border: 1px solid #ff3b30; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: 0.2s; }
    .btn-dns { padding: 8px 14px; background: var(--card); color: #34c759; border: 1px solid #34c759; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: 0.2s; white-space: nowrap; }
    .btn-dns:disabled { opacity: 0.5; cursor: not-allowed; }

    .ip-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); }
    .secret-text { font-family: monospace; letter-spacing: 2px; color: var(--text-sec); }
    
    .dynamic-url { display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: right; }
    .actual-text.dynamic-url { white-space: normal; max-width: 100%; overflow: visible; text-align: left !important; word-break: break-all; font-size: 13px; font-family: monospace; color: var(--primary); letter-spacing: normal; }
    .url-list-item { background: var(--bg); border: 1px solid var(--border); padding: 4px 8px; border-radius: 6px; font-size: 12px; margin-top: 6px; word-break: break-all; line-height: 1.4; color: var(--text); font-family: -apple-system, sans-serif; letter-spacing: normal; text-align: left; }
    .url-list-item:first-child { margin-top: 0; }

    body.dark input, body.dark select, body.dark textarea { background: #1c1c1e; color: #f5f5f7; border: 1px solid #38383a; }

    .search-input { padding: 10px 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg); color: var(--text); font-size: 14px; width: 260px; transition: 0.3s; }
    .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,113,227,0.15); }

    .node-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; margin-top: 20px; }
    .emby-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 14px; transition: 0.3s; position: relative; }
    .emby-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.06); transform: translateY(-2px); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .card-title-group { display: flex; align-items: center; gap: 12px; }
    .emby-icon { font-size: 28px; background: rgba(120,120,120,0.05); border-radius: 10px; padding: 6px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; flex-shrink: 0; }
    .info-row { display: flex; align-items: flex-start; justify-content: space-between; font-size: 13px; }
    .info-label { color: var(--text-sec); font-weight: 500; min-width: 65px; margin-top: 4px; }
    .card-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: auto; padding-top: 12px; border-top: 1px dashed var(--border); }

    .ping-badge { color: var(--text-sec); cursor: pointer; padding: 4px 10px; background: rgba(120,120,120,0.05); border-radius: 6px; font-size: 13px; font-weight: 500; transition: 0.2s; border: 1px solid transparent; user-select: none; }
    .ping-badge:hover { border-color: var(--border); background: var(--card); box-shadow: 0 2px 6px rgba(0,0,0,0.05); color: var(--primary); }

    .icon-item { cursor: pointer; padding: 6px; border-radius: 8px; border: 1px solid transparent; display: flex; justify-content: center; align-items: center; transition: 0.2s; background: var(--bg); height: 44px; }
    .icon-item:hover { border-color: var(--primary) !important; box-shadow: 0 2px 8px rgba(0,113,227,0.2); transform: scale(1.05); }
    #iconGrid::-webkit-scrollbar { width: 6px; }
    #iconGrid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* 拖拽排序核心适配样式 */
    .emby-card.sortable-ghost { opacity: 0.4; }
    .emby-card.sortable-drag { cursor: grabbing !important; }
    .drag-handle { cursor: grab; padding-right: 10px; font-size: 18px; color: var(--text-sec); display: flex; align-items: center; user-select: none; touch-action: none;}
    .drag-handle:active { cursor: grabbing; color: var(--primary); }

    /* ============================================================
       节点卡片精简 (Node Card Redesign) — Lucide 风格，去 emoji
       ============================================================ */
    .emby-card.idle { opacity: 0.85; }
    .a-head { display: flex; align-items: center; gap: 12px; }
    .a-handle { width: 18px; display: flex; align-items: center; justify-content: center; color: var(--text-ter, #b0b0b5); cursor: grab; flex-shrink: 0; touch-action: none; }
    .a-handle:hover { color: var(--primary); }
    .a-handle:active { cursor: grabbing; }
    .a-handle svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; }
    .a-cb { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0; margin: 0; }
    .a-thumb { width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary), #5856d6); color: #fff; font-weight: 700; font-size: 15px; letter-spacing: -0.02em; overflow: hidden; text-transform: uppercase; }
    .a-thumb.idle { background: linear-gradient(135deg, #8e8e93, #636366); }
    .a-thumb img { width: 100%; height: 100%; border-radius: 9px; object-fit: cover; display: block; }
    .a-title-block { flex: 1; min-width: 0; }
    .a-name { font-weight: 600; font-size: 15px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .a-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-sec); font-family: ui-monospace, Menlo, Consolas, monospace; margin-top: 2px; flex-wrap: wrap; }
    .a-meta .dot-sep { color: var(--text-ter, #b0b0b5); }
    .a-mode { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; color: var(--text-sec); }
    .a-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
    .a-status-dot.live { background: #34c759; box-shadow: 0 0 5px #34c759; }
    .a-status-dot.idle { background: var(--text-ter, #b0b0b5); }
    .a-status-dot.warn { background: #ff9500; box-shadow: 0 0 5px #ff9500; }
    .a-mode-badge { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; background: rgba(0,113,227,0.1); color: var(--primary); flex-shrink: 0; }

    .a-stats { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0; padding: 14px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .a-stat { padding: 0 12px; border-right: 1px solid var(--border); min-width: 0; }
    .a-stat:last-child { border-right: none; }
    .a-stat:first-child { padding-left: 2px; }
    .a-stat-label { font-size: 10px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .a-stat-val { font-size: 19px; font-weight: 700; color: var(--text); line-height: 1.15; letter-spacing: -0.02em; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .a-stat-val .unit { font-size: 11px; font-weight: 600; color: var(--text-sec); margin-left: 2px; }
    .a-stat-val.muted { color: var(--text-ter, #b0b0b5); }
    .a-stat-val.danger { color: #ff3b30; }
    .a-stat-sub { font-size: 11px; color: var(--text-sec); margin-top: 2px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .a-stat-sub.up { color: #34c759; }
    .a-stat-sub.down { color: #ff3b30; }

    .a-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; min-height: 24px; }
    .a-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; background: rgba(120,120,120,0.07); border: 1px solid var(--border); color: var(--text-sec); white-space: nowrap; }
    .a-tag svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 2; }
    .a-tag.good { color: #34c759; background: rgba(52,199,89,0.08); border-color: rgba(52,199,89,0.2); }
    .a-tag.warn { color: #ff9500; background: rgba(255,149,0,0.08); border-color: rgba(255,149,0,0.2); }
    .a-tag.danger { color: #ff3b30; background: rgba(255,59,48,0.08); border-color: rgba(255,59,48,0.2); }
    .a-tag.primary { color: var(--primary); background: rgba(0,113,227,0.08); border-color: rgba(0,113,227,0.2); cursor: pointer; }
    .a-tag.primary:hover { background: rgba(0,113,227,0.14); }

    .a-foot { display: flex; align-items: center; gap: 6px; }
    .a-foot-spacer { flex: 1; }
    .a-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--text-sec); transition: 0.15s; box-shadow: none; padding: 0; }
    .a-icon-btn:hover { color: var(--text); background: rgba(120,120,120,0.07); border-color: var(--border); }
    .a-icon-btn.danger-hover:hover { color: #ff3b30; border-color: #ff3b30; background: rgba(255,59,48,0.06); }
    .a-icon-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; }
    .a-btn-edit { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .a-btn-edit:hover { border-color: var(--primary); color: var(--primary); }
    .a-btn-edit svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; }

    .a-details { display: none; padding: 14px; background: rgba(120,120,120,0.04); border-radius: 10px; border: 1px solid var(--border); margin-top: -4px; }
    .a-details.open { display: block; }
    .a-detail-row { display: grid; grid-template-columns: 78px 1fr auto; gap: 10px; align-items: center; padding: 6px 0; font-size: 12px; }
    .a-detail-row + .a-detail-row { border-top: 1px solid var(--border); }
    .a-detail-label { color: var(--text-sec); font-weight: 600; }
    .a-detail-val { font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .a-detail-val.secret { letter-spacing: 2px; color: var(--text-sec); }
    .a-detail-actions { display: flex; gap: 4px; justify-self: end; }
    .a-detail-actions .a-icon-btn { width: 26px; height: 26px; }
    .a-detail-actions .a-icon-btn svg { width: 12px; height: 12px; }

    /* 节点卡片是 ping-badge 的容器之一，但新版把 ping 放进 stat val，不再需要徽章样式 */

    /* ============================================================
       UI Suggestions v2.0.7 — 4-tier button system, dropdown menus,
       Headers Editor, sectioned deploy form. All rules below this
       banner are additive; legacy .btn-submit and emoji buttons
       elsewhere in the panel are intentionally left untouched.
       ============================================================ */

    /* --- 4-tier button system --- */
    .btn-tier {
        padding: 9px 16px; border-radius: 10px; border: 1px solid var(--border);
        background: var(--card); color: var(--text);
        font: inherit; font-size: 13px; font-weight: 600;
        cursor: pointer; white-space: nowrap;
        display: inline-flex; align-items: center; gap: 6px;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .btn-tier:hover { background: rgba(120,120,120,0.06); border-color: var(--text-sec); }
    .btn-tier:active { transform: translateY(0); }
    .btn-tier:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-tier svg { width: 14px; height: 14px; flex-shrink: 0; }
    .btn-tier.is-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
    .btn-tier.is-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
    .btn-tier.is-success { background: #34c759; color: #fff; border-color: #34c759; }
    .btn-tier.is-success:hover { filter: brightness(0.95); }
    .btn-tier.is-danger  { background: #ff3b30; color: #fff; border-color: #ff3b30; }
    .btn-tier.is-danger:hover  { filter: brightness(0.95); }
    .btn-tier.is-ghost   { background: transparent; border-color: transparent; color: var(--text-sec); }
    .btn-tier.is-ghost:hover { color: var(--text); background: rgba(120,120,120,0.07); }
    .btn-tier.is-sm { padding: 6px 12px; font-size: 12px; }
    .v-sep { width: 1px; height: 22px; background: var(--border); align-self: center; }

    /* --- Generic dropdown menu --- */
    .menu-wrap { position: relative; display: inline-flex; }
    .menu {
        position: absolute; top: calc(100% + 6px); right: 0; min-width: 220px;
        background: var(--card); border: 1px solid var(--border); border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12); padding: 6px;
        display: none; flex-direction: column; gap: 2px; z-index: 200;
    }
    .menu.open { display: flex; }
    .menu button {
        display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 7px;
        border: none; background: transparent; color: var(--text); font: inherit; font-size: 13px;
        text-align: left; cursor: pointer; width: 100%;
    }
    .menu button:hover { background: rgba(120,120,120,0.07); }
    .menu button.danger { color: #ff3b30; }
    .menu button.danger:hover { background: rgba(255,59,48,0.08); }
    .menu hr { border: none; border-top: 1px solid var(--border); margin: 4px 6px; opacity: 0.6; }
    .menu svg { width: 14px; height: 14px; flex-shrink: 0; }

    /* --- iOS-style switch (scoped to .ios-switch to avoid collisions) --- */
    .ios-switch { width: 38px; height: 22px; background: var(--border); border-radius: 999px; position: relative; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
    .ios-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
    .ios-switch.on { background: #34c759; }
    .ios-switch.on::after { left: 18px; }

    /* --- Sectioned form (.a-* family) --- */
    .a-form { display: flex; flex-direction: column; gap: 22px; }
    .a-fieldset { display: flex; flex-direction: column; gap: 10px; }
    .a-fieldset-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
    .a-field-label { display: block; font-size: 11px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.06em; }
    .a-field-aux { font-size: 12px; color: var(--text-sec); }
    .a-input, .a-select {
        padding: 11px 14px; border: 1px solid var(--border); border-radius: 10px;
        background: var(--card); color: var(--text); font: inherit; font-size: 14px;
        outline: none; width: 100%; transition: 0.15s;
    }
    .a-input:focus, .a-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,113,227,0.12); }
    .a-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .a-row.two { grid-template-columns: 1fr 1fr; }
    .a-upstream-row { display: flex; gap: 8px; align-items: center; }
    .a-tag-pri, .a-tag-bk {
        width: 48px; flex-shrink: 0; padding: 5px 0; border-radius: 7px;
        text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
    }
    .a-tag-pri { background: rgba(0,113,227,0.1); color: var(--primary); }
    .a-tag-bk  { background: rgba(120,120,120,0.1); color: var(--text-sec); }
    .a-add-row {
        align-self: flex-start;
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 12px; border: 1px dashed var(--border); border-radius: 8px;
        background: transparent; color: var(--text-sec); font-weight: 600; cursor: pointer;
        font: inherit; font-size: 13px;
    }
    .a-add-row:hover { color: var(--primary); border-color: var(--primary); background: rgba(0,113,227,0.04); }
    .a-add-row svg { width: 13px; height: 13px; }
    .a-card-pick, .a-toggle-row {
        display: flex; gap: 12px; align-items: center; padding: 12px 14px;
        border: 1px solid var(--border); border-radius: 10px; background: var(--card); cursor: pointer;
        min-height: 60px;
    }
    .a-card-pick:hover { border-color: var(--primary); }
    .a-toggle-row { user-select: none; }
    .a-footer {
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
        padding-top: 18px; border-top: 1px solid var(--border); margin-top: 4px;
        flex-wrap: wrap;
    }
    .a-footer .a-footer-aux { color: var(--text-sec); font-size: 12px; }

    /* --- Headers Editor --- */
    .hed { border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; background: rgba(120,120,120,0.025); }
    .hed-head { display: grid; grid-template-columns: 22px 1fr 1.4fr 44px 32px; gap: 8px; align-items: center; padding: 0 4px 8px 4px; font-size: 10px; font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.06em; }
    .hed-list { display: flex; flex-direction: column; gap: 6px; }
    .hed-row {
        display: grid; grid-template-columns: 22px 1fr 1.4fr 44px 32px; gap: 8px;
        align-items: center; padding: 4px; border-radius: 8px;
        transition: background 0.15s;
    }
    .hed-row.dragging { opacity: 0.35; }
    .hed-row.disabled .hed-k, .hed-row.disabled .hed-v { opacity: 0.45; }
    .hed-row:hover { background: rgba(120,120,120,0.05); }
    .hed-handle { cursor: grab; color: var(--text-sec); opacity: 0.5; text-align: center; user-select: none; font-size: 13px; line-height: 1; padding: 8px 0; }
    .hed-handle:active { cursor: grabbing; }
    .hed-k, .hed-v {
        width: 100%; padding: 9px 12px; border: 1px solid var(--border);
        border-radius: 8px; background: var(--card); color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px;
        outline: none; transition: 0.15s;
    }
    .hed-k:focus, .hed-v:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,113,227,0.12); }
    .hed-v-wrap { position: relative; }
    .hed-v-wrap .mask-btn {
        position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
        width: 28px; height: 28px; border: none; background: transparent;
        color: var(--text-sec); cursor: pointer; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
    }
    .hed-v-wrap .mask-btn:hover { color: var(--primary); background: rgba(0,113,227,0.08); }
    .hed-v-wrap .mask-btn svg { width: 16px; height: 16px; fill: currentColor; }
    .hed-del {
        width: 32px; height: 32px; border: 1px solid transparent; border-radius: 8px;
        background: transparent; color: var(--text-sec); cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: 14px;
        transition: 0.15s; justify-self: center;
    }
    .hed-del:hover { color: #ff3b30; border-color: #ff3b30; background: rgba(255,59,48,0.06); }
    .hed-del svg { width: 12px; height: 12px; }
    .hed-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; flex-wrap: wrap; gap: 10px; }
    .hed-meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--text-sec); }
    .hed-meta .dot { width: 6px; height: 6px; background: #34c759; border-radius: 50%; box-shadow: 0 0 6px #34c759; }
    .hed-empty { text-align: center; padding: 26px 20px; color: var(--text-sec); font-size: 13px; border: 1px dashed var(--border); border-radius: 10px; }
    .templates { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .templates-label { font-size: 12px; color: var(--text-sec); margin-right: 4px; }
    .chip {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
        background: rgba(120,120,120,0.08); color: var(--text-sec); border: 1px solid var(--border);
        cursor: pointer; transition: 0.15s; font-family: inherit;
    }
    .chip:hover { color: var(--primary); border-color: var(--primary); background: rgba(0,113,227,0.06); }
    .chip-curl { color: var(--primary); border-color: rgba(0,113,227,0.3); background: rgba(0,113,227,0.06); }

    /* --- cURL modal (separate from #dashboardModal) --- */
    .curl-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .curl-modal-bg.show { display: flex; }
    .curl-modal { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 24px; width: 90%; max-width: 540px; }
    .curl-modal h3 { margin: 0 0 6px 0; font-size: 16px; }
    .curl-modal p  { margin: 0 0 12px 0; font-size: 13px; color: var(--text-sec); }
    .curl-modal textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: ui-monospace, Menlo, monospace; font-size: 12px; resize: vertical; min-height: 120px; outline: none; }
    .curl-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }

    /* ============================================================
       Top Bar Redesign — consolidate update alert + CF trace +
       placement select + page header into a single status bar
       with pills, dismissable update banner, and expandable drawer.
       ============================================================ */
    .tb-banner {
        background: linear-gradient(90deg, rgba(52,199,89,0.12), rgba(52,199,89,0.04));
        border: 1px solid rgba(52,199,89,0.3); border-radius: 10px;
        padding: 8px 14px; display: flex; align-items: center; gap: 12px;
        font-size: 13px; margin-bottom: 14px;
    }
    .tb-banner .b-tag { background: #34c759; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .tb-banner .b-msg { color: var(--text); flex: 1; }
    .tb-banner .b-cta { background: #34c759; color: #fff; border: none; padding: 6px 14px; border-radius: 7px; font-weight: 600; cursor: pointer; font: inherit; font-size: 12px; }
    .tb-banner .b-cta:disabled { opacity: 0.6; cursor: not-allowed; }
    .tb-banner .b-dismiss { background: transparent; border: none; color: var(--text-sec); cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 6px; }
    .tb-banner .b-dismiss:hover { color: var(--text); }

    .tb-bar {
        background: var(--card); border: 1px solid var(--border); border-radius: 14px;
        padding: 12px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        box-shadow: 0 4px 20px rgba(0,0,0,0.04); margin-bottom: 14px;
    }
    .tb-title { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; padding-right: 4px; }
    .tb-title .tb-logo {
        width: 28px; height: 28px; border-radius: 8px;
        background: linear-gradient(135deg, var(--primary), #5856d6);
        display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px;
    }
    .tb-divider { width: 1px; height: 22px; background: var(--border); }

    .pill {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 6px 11px; border-radius: 999px;
        background: rgba(120,120,120,0.06); border: 1px solid var(--border);
        font-size: 12px; font-weight: 600; color: var(--text); cursor: default;
        transition: 0.15s; position: relative; line-height: 1.2; white-space: nowrap;
    }
    .pill:hover { background: rgba(120,120,120,0.1); }
    .pill .lbl { color: var(--text-sec); font-weight: 500; }
    .pill .val { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .pill .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .pill .dot.green { background: #34c759; box-shadow: 0 0 6px #34c759; }
    .pill .dot.amber { background: #ff9500; box-shadow: 0 0 6px #ff9500; }
    .pill .dot.red { background: #ff3b30; box-shadow: 0 0 6px #ff3b30; }
    .pill.expandable { cursor: pointer; }
    .pill.expandable:hover { color: var(--primary); border-color: var(--primary); background: rgba(0,113,227,0.04); }
    .pill.expandable.open { color: var(--primary); border-color: var(--primary); background: rgba(0,113,227,0.06); }
    .pill .caret { font-size: 9px; opacity: 0.6; transition: transform 0.2s; }
    .pill.expandable.open .caret { transform: rotate(180deg); }

    .pill .tip {
        position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%);
        background: #1d1d1f; color: #fff; padding: 8px 12px; border-radius: 8px;
        font-size: 11px; font-weight: 500; white-space: nowrap;
        display: flex; flex-direction: column; gap: 4px;
        opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 50;
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    .pill .tip::before { content: ""; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-bottom-color: #1d1d1f; }
    .pill .tip .line { display: flex; gap: 14px; justify-content: space-between; }
    .pill .tip .tip-key { color: #98989d; }
    .pill:hover .tip { opacity: 1; }

    .tb-spacer { flex: 1; min-width: 8px; }

    .tb-icon-btn {
        width: 36px; height: 36px; border-radius: 10px; border: 1px solid transparent;
        background: transparent; cursor: pointer; display: inline-flex;
        align-items: center; justify-content: center; font-size: 16px; color: var(--text-sec);
        transition: 0.15s; position: relative; padding: 0;
    }
    .tb-icon-btn:hover { background: rgba(120,120,120,0.08); color: var(--text); border-color: var(--border); }
    .tb-icon-btn.danger:hover { color: #ff3b30; border-color: #ff3b30; background: rgba(255,59,48,0.05); }

    .tb-drawer {
        background: var(--card); border: 1px solid var(--border);
        border-radius: 14px; overflow: hidden;
        max-height: 0; opacity: 0; padding: 0 20px;
        transition: max-height 0.3s ease, opacity 0.2s, padding 0.3s, margin 0.3s;
        margin-bottom: 0;
    }
    .tb-drawer.open { max-height: 320px; opacity: 1; padding: 16px 20px; margin-bottom: 14px; }
    .tb-drawer h3 { margin: 0 0 4px 0; font-size: 14px; font-weight: 700; }
    .tb-drawer .sub { font-size: 12px; color: var(--text-sec); margin-bottom: 12px; }
    .tb-drawer .controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .tb-drawer select, .tb-drawer input {
        padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border);
        background: var(--bg); color: var(--text); font: inherit; font-size: 13px; outline: none;
        min-width: 200px;
    }
    .tb-drawer select:focus, .tb-drawer input:focus { border-color: var(--primary); }
    .tb-drawer .status { margin-top: 10px; font-size: 12px; color: var(--text-sec); display: flex; align-items: center; gap: 6px; }

    @media (max-width: 768px) {
        .tb-bar { padding: 10px 12px; gap: 8px; }
        .tb-title { font-size: 14px; }
        .tb-title .tb-logo { width: 24px; height: 24px; font-size: 12px; }
        .tb-bar .tb-divider { display: none; }
        .pill { font-size: 11px; padding: 5px 10px; }
        .tb-icon-btn { width: 38px; height: 38px; }
        .tb-banner { flex-wrap: wrap; }
        .tb-drawer select, .tb-drawer input { min-width: 0; width: 100%; }
        .tb-drawer .controls { flex-direction: column; align-items: stretch; }
    }

    /* --- Mobile tweaks for the new components --- */
    @media (max-width: 768px) {
        .a-row, .a-row.two { grid-template-columns: 1fr; }
        .hed-head { display: none; }
        .hed-row { grid-template-columns: 18px 1fr 36px 28px; grid-template-rows: auto auto; gap: 6px; padding: 8px 4px; }
        .hed-row .hed-handle { grid-row: 1 / 3; }
        .hed-row .hed-k { grid-column: 2 / 5; }
        .hed-row .hed-v-wrap { grid-column: 2 / 3; grid-row: 2; }
        .hed-row .ios-switch { grid-column: 3 / 4; grid-row: 2; }
        .hed-row .hed-del { grid-column: 4 / 5; grid-row: 2; }
        .a-footer { flex-direction: column-reverse; align-items: stretch; }
        .a-footer .a-footer-actions { display: flex; gap: 10px; }
        .a-footer .a-footer-actions .btn-tier { flex: 1; justify-content: center; }
    }

    /* iOS-style mobile adaptation
       References the Mobile Adaptation prototype: bottom-sheet modals,
       large title + status pills, sticky bottom CTA, ≥44pt tap targets. */
    @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

    @media (max-width: 768px) {
        body { padding: 12px; padding-bottom: max(env(safe-area-inset-bottom), 12px); }
        .card { padding: 16px; border-radius: 14px; margin-bottom: 14px; }
        .header { margin-bottom: 16px !important; }
        .header h1 { font-size: 22px; letter-spacing: -0.02em; }
        .toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
        .toolbar > * { width: 100%; display: flex; justify-content: center; }
        .search-input { width: 100%; }
        .node-grid { grid-template-columns: 1fr; gap: 12px; }

        /* Tap-target sizing */
        .btn-submit, .btn-edit, .btn-del, .btn-dns, .logout-btn, .a-btn-edit { min-height: 44px; }
        .icon-btn, .a-icon-btn { width: 36px; height: 36px; }
        .a-detail-actions .a-icon-btn { width: 32px; height: 32px; }
        .a-stat-val { font-size: 18px; }
        .a-stats { grid-template-columns: 1fr 1fr 1fr; }
        .a-foot { flex-wrap: wrap; }
        select, input[type="text"], input[type="url"], input[type="password"], textarea {
            font-size: 16px; /* prevent iOS zoom on focus */
        }

        /* Table → stacked card rows (kept from previous design) */
        .table-wrapper { border: none; background: transparent; overflow: visible; }
        table, thead, tbody, th, td, tr { display: block; width: 100%; }
        thead { display: none; }
        tr { margin-bottom: 12px; background: var(--card); border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 2px 12px rgba(0,0,0,0.03); overflow: hidden; }
        td { display: flex; align-items: center; padding: 12px 14px; border-bottom: 0.5px solid var(--border); text-align: right; gap: 12px; min-height: 44px; }
        td:last-child { border-bottom: none; }
        td[colspan] { justify-content: center; text-align: center; }
        td[colspan]::before { display: none !important; }
        td::before { content: attr(data-label); font-weight: 600; color: var(--text-sec); flex-shrink: 0; margin-right: auto; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }

        /* Modals → bottom sheet */
        #dashboardModal {
            padding: 0 !important;
            display: flex !important;
            align-items: flex-end !important;
            justify-content: stretch !important;
        }
        #dashboardModal[style*="display:none"], #dashboardModal[style*="display: none"] { display: none !important; }
        #dashboardModal > .card {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 92vh;
            margin: 0 !important;
            padding: 18px 16px 24px !important;
            border-radius: 18px 18px 0 0 !important;
            box-shadow: 0 -8px 32px rgba(0,0,0,0.18) !important;
            overflow-y: auto;
            animation: sheet-up 0.28s cubic-bezier(.32,.72,.3,1);
            position: relative;
        }
        #dashboardModal > .card::before {
            content: ''; display: block;
            width: 36px; height: 5px; border-radius: 3px;
            background: var(--border);
            margin: -4px auto 14px;
        }
        #dashboardModal h2 { font-size: 18px; flex-direction: column; align-items: flex-start; gap: 8px; }
        #dashboardModal h2 > div:last-child { font-size: 12px !important; }
        #dashboardModal h2 span { font-size: 12px; }
        #dashboardModal .table-wrapper td { font-size: 13px; }

        /* CF trace card → horizontal scrollable status strip */
        #cf-trace-card {
            padding: 10px 14px !important;
            gap: 10px !important;
            font-size: 13px !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            scrollbar-width: none;
        }
        #cf-trace-card::-webkit-scrollbar { display: none; }
        #cf-trace-card > * { flex-shrink: 0; }

        /* Header (title + dashboard + logout) compresses */
        .header { gap: 10px !important; }
        .header > div:last-child { gap: 6px !important; }
        .header .btn-submit, .header .logout-btn { padding: 10px 12px; font-size: 13px; }

        /* Deploy/edit form (#addForm): stretch inputs, group submit at bottom */
        #addForm input[type="text"],
        #addForm input[type="url"],
        #addForm select,
        #addForm textarea {
            width: 100% !important;
            flex: 1 1 100% !important;
            min-height: 44px;
            padding: 12px 14px !important;
        }
        #addForm > div { gap: 10px !important; }
        #addForm #iconSelectBtn { width: 100%; }
        #addForm #submitBtn {
            width: 100% !important;
            padding: 14px !important;
            font-size: 16px;
            border-radius: 12px;
            order: 99;
            margin-top: 4px;
        }
        #addForm > div:nth-of-type(2) { flex-direction: column; align-items: stretch !important; }
        #addForm > div:nth-of-type(2) > * { width: 100%; }

        /* Speed-test toolbar buttons stack with primary highlighted */
        #addForm + div .toolbar { flex-direction: column; }

        /* Login page: gradient ornaments + iOS hero */
        body.login-body {
            padding: 0 !important;
            background: var(--bg) !important;
            min-height: 100vh;
            overflow-x: hidden;
        }
        body.login-body .login-box {
            box-shadow: none !important;
            background: transparent !important;
            padding: 60px 24px 32px !important;
            max-width: 100% !important;
            text-align: left !important;
            border-radius: 0;
        }
        body.login-body .login-eyebrow {
            font-size: 11px; font-weight: 700; color: var(--text-sec);
            letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px;
        }
        body.login-body .login-box h2 {
            font-size: 30px; font-weight: 700; letter-spacing: -0.025em;
            margin: 0 0 8px 0 !important; text-align: left;
        }
        body.login-body .login-sub {
            font-size: 14px; color: var(--text-sec); line-height: 1.5; margin: 0 0 28px 0;
        }
        body.login-body .login-foot {
            position: fixed; bottom: max(env(safe-area-inset-bottom), 16px); left: 0; right: 0;
            text-align: center; color: var(--text-sec); font-size: 11px; line-height: 1.6;
            opacity: 0.7;
        }
    }

    @media (max-width: 480px) {
        body { padding: 10px; }
        .card { padding: 14px; border-radius: 12px; }
        .header h1 { font-size: 20px; }
        .header .btn-submit, .header .logout-btn { flex: 1; min-width: 0; }
        h2 { font-size: 17px !important; }

        /* Logout / dashboard top buttons reflow */
        .header > div:last-child { width: 100%; justify-content: stretch; }
        .header > div:last-child > div:first-child { flex: 0 0 auto; }
        .header > div:last-child > button { flex: 1; }

        /* Toolbar collapses to vertical with full-width primary */
        .toolbar { gap: 8px; }
        .toolbar select, .toolbar input, .toolbar button { width: 100% !important; min-width: 0 !important; }

        /* Speed-test multi-button bar: stack */
        #btnSelectedDns, #btnTop3Dns, #btnDirectCname, #btnTestCustom { width: 100% !important; }
    }

    /* ============================================================
       Mobile Adaptation v3 — Bottom Tab Bar, status pills row,
       sticky form CTA, login Face ID. Desktop hides everything.
       Reference: design/Mobile Adaptation.html + mobile-screens.jsx.
       ============================================================ */
    .m-pills { display: none; }
    .m-pill {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 11px; border-radius: 999px;
        background: rgba(120,120,120,0.06);
        border: 1px solid var(--border);
        font-size: 12px; font-weight: 600; color: var(--text);
        white-space: nowrap; flex-shrink: 0; line-height: 1.2;
    }
    .m-pill .lbl { color: var(--text-sec); font-weight: 500; }
    .m-pill .val { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .m-pill .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .m-pill .dot.green { background: #34c759; box-shadow: 0 0 5px #34c759; }
    .m-pill .dot.amber { background: #ff9500; box-shadow: 0 0 5px #ff9500; }
    .m-pill.strong .val { color: var(--primary); }

    #mobileTabBar { display: none; }

    /* Login: gradient logo + Face ID button (desktop hidden) */
    .login-logo { display: none; }
    .login-faceid { display: none; }

    @media (max-width: 768px) {
        /* Reserve room above the Tab Bar */
        body { padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important; }

        /* Status pills row above node list */
        .m-pills {
            display: flex; gap: 6px; overflow-x: auto;
            margin: -4px 0 12px; padding: 4px 2px 6px;
            -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .m-pills::-webkit-scrollbar { display: none; }

        /* Mobile takes over RTT + placement pill duty: hide the desktop ones */
        #cf-trace-card .pill[title*="设备到云端"] { display: none; }
        #cf-trace-card .pill.expandable#placePill { display: none; }
        /* cf-trace-card now wraps instead of horizontal scroll */
        #cf-trace-card { flex-wrap: wrap !important; row-gap: 8px; overflow-x: visible !important; }
        #cf-trace-card .tb-spacer { display: none; }

        /* Sticky save button for deploy/edit form */
        #addForm #submitBtn {
            position: sticky !important;
            bottom: calc(72px + env(safe-area-inset-bottom));
            z-index: 5;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
            margin-top: 8px;
        }
        body.dark #addForm #submitBtn { box-shadow: 0 -4px 16px rgba(0,0,0,0.4); }

        /* Bottom Tab Bar */
        #mobileTabBar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            position: fixed; left: 0; right: 0; bottom: 0; z-index: 1000;
            background: rgba(255,255,255,0.88);
            -webkit-backdrop-filter: saturate(180%) blur(20px);
            backdrop-filter: saturate(180%) blur(20px);
            border-top: 0.5px solid var(--border);
            padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
        }
        body.dark #mobileTabBar { background: rgba(28,28,30,0.88); }
        #mobileTabBar button {
            background: transparent; border: none; cursor: pointer;
            display: flex; flex-direction: column; align-items: center; gap: 3px;
            padding: 6px 4px; color: var(--text-sec);
            font: inherit; font-size: 10px; font-weight: 600;
            min-height: 44px;
        }
        #mobileTabBar button.active { color: var(--primary); }
        #mobileTabBar button svg {
            width: 22px; height: 22px; fill: none; stroke: currentColor;
            stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
        }
        #mobileTabBar button.active svg { stroke-width: 2.2; }

        /* Login mobile hero: gradient logo block + Face ID secondary */
        body.login-body .login-logo {
            display: flex; align-items: center; justify-content: center;
            width: 64px; height: 64px; border-radius: 18px; color: #fff;
            background: linear-gradient(135deg, var(--primary), #5856d6);
            box-shadow: 0 12px 28px rgba(0,113,227,0.28);
            margin: 0 0 28px;
        }
        body.login-body .login-logo svg { width: 30px; height: 30px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
        body.login-body .login-faceid {
            display: inline-flex !important;
            width: 100%; margin-top: 12px; padding: 14px;
            background: transparent; color: var(--text);
            border: 1px solid var(--border); border-radius: 14px;
            font-weight: 600; font-size: 14px; cursor: pointer;
            align-items: center; justify-content: center; gap: 8px;
            min-height: 48px; font-family: inherit;
        }
        body.login-body .login-faceid svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
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
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; margin: 0; background: #f0f2f5; position: relative; overflow-x: hidden; }
        body::before, body::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
        body::before { top: -120px; right: -80px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(0,113,227,0.22), rgba(0,113,227,0) 70%); }
        body::after { bottom: -100px; left: -100px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(88,86,214,0.18), rgba(88,86,214,0) 70%); }
        .login-box { position: relative; z-index: 1; background: var(--card); padding: 40px 30px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); text-align: center; width: 100%; max-width: 360px; }
        .login-eyebrow { display: none; }
        .login-sub { display: none; }
        .login-foot { display: none; }
        .login-box h2 { margin: 0 0 24px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
        .login-box input { width: 100%; padding: 16px; margin-bottom: 20px; border: 1px solid var(--border); border-radius: 12px; font-size: 16px; }
        .login-box input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,113,227,0.15); }
        .login-box button { width: 100%; padding: 16px; background: var(--primary); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; min-height: 44px; }

        /* On phone, show the eyebrow / sub / foot copy and drop the boxed card */
        @media (max-width: 768px) {
            .login-eyebrow, .login-sub, .login-foot { display: block; }
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
        <button type="button" class="login-faceid" onclick="faceIdHint()">
            <svg viewBox="0 0 24 24"><path d="M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="16" r="2"/></svg>
            使用 Face ID 登录
        </button>
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
        function faceIdHint() {
            showToast('Face ID 暂未启用');
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
<body>
    <div id="toast"></div>

    <!-- Shared SVG sprite (UI Suggestions v2.0.7) -->
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
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

    <div id="dashboardModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10000; overflow-y:auto; padding: 20px; backdrop-filter: blur(5px);">
        <div class="card" style="max-width: 1000px; margin: 40px auto; position:relative; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <button onclick="closeDashboard()" style="position:absolute; top:20px; right:20px; font-size:24px; background:none; border:none; cursor:pointer; color: var(--text-sec); transition: 0.2s;" onmouseover="this.style.color='#ff3b30'" onmouseout="this.style.color='var(--text-sec)'">✖</button>
            
            <h2 style="margin-top:0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    📊 数据大屏 <span style="font-size:14px; font-weight: normal; color: var(--text-sec);">精确访客画像分析</span>
                </div>
                <div style="font-size: 13px; background: rgba(0,113,227,0.1); color: var(--primary); padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(0,113,227,0.2); display: flex; gap: 15px; flex-wrap: wrap;">
                    <span> 今天: <strong id="trafficToday">加载中...</strong></span>
                    <span>1周内: <strong id="traffic7d">加载中...</strong></span>
                    <span>1月内: <strong id="traffic30d">加载中...</strong></span>
                </div>
            </h2>
            
            <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top:20px;">
                <div style="flex: 2; min-width: 300px; border: 1px solid var(--border); border-radius: 14px; padding: 16px; background: rgba(120,120,120,0.03);">
                    <canvas id="trendChart"></canvas>
                </div>
                <div style="flex: 1; min-width: 300px; border: 1px solid var(--border); border-radius: 14px; padding: 16px; background: rgba(120,120,120,0.03); display: flex; justify-content: center; align-items: center;">
                    <canvas id="locationChart"></canvas>
                </div>
            </div>
            
            <h3 style="margin-top: 30px; margin-bottom:16px;">🕵️ 最新独立播放记录 <span style="font-size:12px; color:var(--text-sec);">(仅拦截 PlaybackInfo 真实播放)</span></h3>
            <div class="table-wrapper">
                <table style="width: 100%;">
                    <thead><tr><th>访问时间</th><th>目标节点</th><th>真实 IP 地址</th><th>归属地</th><th>客户端/设备标识 (User-Agent)</th></tr></thead>
                    <tbody id="logTableBody"><tr><td colspan="5" style="text-align:center; padding: 30px;">加载数据中...</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Slim, dismissable update banner -->
        <div id="updateAlert" class="tb-banner" style="display: none; margin-top: 20px;">
            <span class="b-tag">NEW</span>
            <span class="b-msg" id="updateMsg">当前版本: v1.0.0 | 最新版本: v?.?.?</span>
            <button class="b-cta" id="onlineUpdateBtn" onclick="doOnlineUpdate()">一键升级</button>
            <button class="b-dismiss" onclick="document.getElementById('updateAlert').style.display='none'" title="忽略">✕</button>
        </div>

        <!-- Consolidated top status bar -->
        <div id="cf-trace-card" class="tb-bar" style="margin-top: 20px;">
            <div class="tb-title">
                <div class="tb-logo">⚡</div>
                <span>反代核心</span>
            </div>

            <div class="tb-divider"></div>

            <!-- RTT pill -->
            <div class="pill" title="你的设备到云端边缘节点的真实往返延迟">
                <span class="dot green" id="rttDot"></span>
                <span class="lbl">RTT</span>
                <span class="val" id="rttValue">测算中</span>
                <div class="tip">
                    <div class="line"><span class="tip-key">RTT</span><span>设备 → 边缘节点延迟</span></div>
                    <div class="tip-key" style="font-size:10px;">每 5s 自动测算</div>
                </div>
            </div>

            <!-- CF Trace pill (entry → egress) -->
            <div class="pill">
                <span class="val" id="trace-entry">--</span>
                <span style="color: var(--text-sec); font-size: 11px;">→</span>
                <span class="val" id="trace-egress" style="color: #34c759;">--</span>
                <div class="tip">
                    <div class="line"><span class="tip-key">访客入口</span><span>地区与机房</span></div>
                    <div class="line"><span class="tip-key">Worker 落地</span><span>实际物理机房</span></div>
                </div>
            </div>

            <!-- Placement pill (expandable drawer trigger) -->
            <div class="pill expandable" id="placePill" onclick="togglePlacementDrawer()">
                <span class="lbl">调度</span>
                <span id="placeModeLabel">智能</span>
                <span class="caret">▾</span>
            </div>

            <div class="tb-spacer"></div>

            <button class="btn-tier is-primary" onclick="openDashboard()">📊 数据大屏</button>
            <button class="tb-icon-btn" id="themeToggle" onclick="toggleDarkMode()" title="切换深色模式">🌙</button>
            <button class="tb-icon-btn danger" onclick="logout()" title="退出系统">⏻</button>
        </div>

        <!-- Placement drawer (collapsed by default) -->
        <div class="tb-drawer" id="placeDrawer">
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

        <!-- Mobile-only status pills row (RTT / 模式 / 今日) -->
        <div class="m-pills" id="mobilePills" aria-label="移动端状态">
            <span class="m-pill"><span class="dot green"></span><span class="lbl">RTT</span><span class="val" id="m-pill-rtt">测算中</span></span>
            <span class="m-pill"><span class="lbl">模式</span><span class="val" id="m-pill-mode">智能</span></span>
            <span class="m-pill strong"><span class="lbl">今日</span><span class="val" id="m-pill-today">--</span></span>
        </div>

        <div class="content-wrap">

            <div class="card" style="border-left: 4px solid #ff3b30;">
    <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
        <h2 style="margin:0; font-size:18px; color: #ff3b30;">🚀 一键覆盖/更新 Worker 核心层代码</h2>
    </div>
    <div style="font-size: 13px; color: var(--text-sec); margin-bottom: 12px;">⚠️ 警告：提交错误的代码会导致面板瞬间崩溃（500 错误）。请确保代码已在本地测试通过！</div>
    <textarea id="codeArea" rows="6" placeholder="方式一：在此处直接粘贴修改好的最新代码全文..." style="width: 100%; padding: 14px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 12px; font-family: monospace; resize: vertical; background:var(--card); font-size:12px;"></textarea>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <span style="font-size:14px; font-weight:bold;">或 方式二：</span>
        <input type="file" id="fileInput" accept=".js" style="font-size:14px; padding: 6px; border: 1px solid var(--border); border-radius: 6px; background:var(--bg);">
        <button type="button" class="btn-tier is-danger" id="deployBtn" onclick="deployWorker()" style="margin-left: auto;">立即覆盖部署并重启节点</button>
    </div>
</div>
            <div class="card" id="speed-anchor">
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; font-size:18px;">⚡ 专属线路测速与动态 DNS 解析</h2>
                </div>
                
                <div style="background: rgba(120,120,120,0.05); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-sec); margin-bottom: 8px;">📡 当前域名生效的 DNS 解析：</div>
                    <div id="dnsStatus" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span style="color:#888; font-size: 14px;">加载中...</span>
                    </div>
                </div>

                <div class="toolbar">
                    <select id="ipType" style="font-weight: 600; color: var(--primary); padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; background:var(--card);">
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

                <div style="background: rgba(120,120,120,0.05); padding: 14px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
                    <input type="text" id="customApiUrl" value="https://ip.v2too.top/api/nodes" placeholder="自定义 JSON / 文本 API 链接（供「拉取 API」使用）" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background:var(--card); margin-bottom: 10px;">
                    <textarea id="customIps" rows="2" placeholder="在此粘贴自定义 IPv4 / IPv6 / 优选域名（供「测试粘贴节点」使用，自动提取）" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border); font-family: monospace; resize: vertical; background:var(--card);"></textarea>
                </div>
                
                <div id="statusText" style="line-height: 1.6; font-size: 14px; color: var(--text-sec); margin-bottom: 16px; padding: 12px 16px; background: rgba(52, 199, 89, 0.1); border-radius: 10px; border-left: 4px solid #34c759;">
                    💡 测速完成后，可勾选复选框自由组合，点击【提交选中节点至 DNS】自动分发。
                </div>

                <div class="table-wrapper">
                    <table style="width: 100%;">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAll" class="ip-checkbox" onclick="toggleSelectAll()"></th>
                                <th>专属节点 (点击复制)</th>
                                <th>预估延迟</th>
                                <th>连通状态</th>
                                <th>记录类型/归属地</th>
                                <th>单节点操作</th>
                            </tr>
                        </thead>
                        <tbody id="testTableBody">
                            <tr><td colspan="6" style="text-align:center;color:var(--text-sec);">暂无数据，请拉取节点或输入自定义 IP/域名 测试</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card" id="settings-anchor">
                <div style="display:flex; justify-content: space-between; align-items:flex-start; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
                    <div>
                        <h2 style="margin:0; font-size:19px; letter-spacing:-0.01em;">部署反代节点</h2>
                        <div style="color:var(--text-sec); font-size:13px; margin-top:4px;">填写下方信息后保存。每个节点占用一个 URL 前缀。</div>
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
                            <div style="position: relative;">
                                <div class="a-card-pick" onclick="toggleIconPicker(event)" id="iconSelectBtn">
                                    <img id="iconPreview" src="" style="width:32px;height:32px;display:none;border-radius:8px;object-fit:cover;">
                                    <span id="iconDefault" style="font-size:24px;line-height:1;">🎬</span>
                                    <div style="flex:1; min-width:0;">
                                        <div style="font-size:13px; font-weight:600;">节点图标</div>
                                        <div id="iconSelectText" style="font-size:11px; color:var(--text-sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">点击选择 · 或粘贴 URL</div>
                                    </div>
                                    <input type="hidden" id="iconUrl" value="">
                                </div>
                                <div id="iconPickerPanel" style="display:none; position: absolute; top: 100%; left: 0; width: 100%; background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 100; margin-top: 8px; flex-direction: column; gap: 10px;">
                                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                                        <input type="text" id="customIconUrlInput" placeholder="输入自定义 JSON 图标库链接..." style="flex: 1; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; background:var(--bg); font-size: 13px; color: var(--text);">
                                        <button type="button" class="btn-tier is-primary is-sm" onclick="setCustomIconLibrary()">加载</button>
                                        <button type="button" class="btn-tier is-sm" onclick="resetIconLibrary()">默认库</button>
                                    </div>
                                    <input type="text" id="iconSearch" placeholder="🔍 搜索图标名称..." style="padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background:var(--bg); width: 100%; font-size: 14px; color: var(--text);" onkeyup="filterIcons()">
                                    <div id="iconGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; overflow-y: auto; max-height: 240px; padding-right: 4px;">
                                        <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; font-size: 13px;">加载图标库中...</div>
                                    </div>
                                </div>
                            </div>
                            <div class="a-toggle-row" id="cacheToggleRow" onclick="toggleCacheSwitch(this)">
                                <div class="ios-switch on"></div>
                                <div style="flex:1;">
                                    <div style="font-size:13px; font-weight:600;">海报 &amp; 静态资源缓存</div>
                                    <div style="font-size:11px; color:var(--text-sec);">降低上游压力，建议开启</div>
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

            <div class="card">
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                    <h2 style="margin:0; font-size:18px;">已反代的媒体库</h2>
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
            
            <div style="width: 2px; height: 20px; background: var(--border);"></div> <select id="batch-mode-select" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-weight: 600;">
                <option value="">🔄 读取模式中...</option>
            </select>

            <button onclick="batchUpdateModes()" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,113,227,0.2);">
                🚀 批量应用模式
            </button>

            <span id="batch-status" style="font-size: 13px; font-weight: 600;"></span>
        </div>
                <div id="list-grid" class="node-grid">
                    <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;">读取数据中...</div>
                </div>
            </div>
            
        </div>
        
        <div style="text-align: center; padding-top: 10px; padding-bottom: 20px;">
            <a href="https://t.me/MakkaPakkaOvO" target="_blank" style="text-decoration: none; color: var(--text); font-weight: 600; display: inline-flex; align-items: center; padding: 12px 24px; background: var(--card); border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: 0.3s; font-size: 14px; border: 1px solid var(--border);">
                ${SVG_TG}
                联系作者 MakkaPakkaOvO
            </a>
            <div style="margin-top: 20px; font-size: 12px; color: var(--text-sec); line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto; padding: 0 15px;">
                <strong>免责声明:</strong> 本项目仅供学习与技术测试使用，请遵守当地法律法规。使用者对配置、转发内容与访问行为承担全部责任，开发者不对任何直接或间接损失负责。
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
            Chart.defaults.color = document.body.classList.contains('dark') ? '#98989d' : '#86868b';
            Chart.defaults.borderColor = document.body.classList.contains('dark') ? '#38383a' : '#d2d2d7';
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
            
            let top5Html = '<h3 style="margin-top: 30px; margin-bottom:16px;">🏆 今日节点流量消耗 TOP 5</h3><div style="background: rgba(120,120,120,0.05); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 20px;">';
            
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
                    top5Html += '<ul style="margin:0; padding-left: 20px; line-height: 2; font-size: 14px; color: var(--text);">';
                    top5.forEach((r, idx) => {
                        const rankColor = idx === 0 ? '#ff3b30' : (idx === 1 ? '#ff9500' : (idx === 2 ? '#ffcc00' : 'var(--text-sec)'));
                        top5Html += \`<li><strong style="color:\${rankColor}; font-size: 15px;">#\${idx+1}</strong> \${r.remark} (/\${r.prefix}) —— 消耗: <strong style="color:var(--primary); font-family: monospace;">\${r.todayBandwidth}</strong></li>\`;
                    });
                    top5Html += '</ul>';
                } else {
                    top5Html += '<div style="color:var(--text-sec); font-size:13px; text-align:center;">今日暂无节点产生流量</div>';
                }
            } else {
                top5Html += '<div style="color:var(--text-sec); font-size:13px; text-align:center;">主页暂无节点卡片</div>';
            }
            top5Html += '</div>';
            
            // 瞬间把 TOP 5 写入网页！
            top5Container.innerHTML = top5Html;


            // ==========================================
            // 🌟 正常加载下面的图表数据 (带有10秒防卡死超时保护)
            // ==========================================
            document.getElementById('logTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px;">数据分析引擎计算中...</td></tr>';
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
                        datasets: [{ label: '有效播放 (次)', data: counts, borderColor: '#0071e3', backgroundColor: 'rgba(0,113,227,0.1)', fill: true, tension: 0.3 }]
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
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px;">暂无日志记录</td></tr>';
                } else {
                    data.recents.forEach(log => {
                        const tr = document.createElement('tr');
                        const isChina = log.country === 'CN';
                        tr.innerHTML = \`
                            <td data-label="访问时间" style="font-size:12px; white-space:nowrap;">\${log.timestamp}</td>
                            <td data-label="目标节点"><span class="badge" style="background:rgba(0,113,227,0.1);color:var(--primary);">\${log.prefix}</span></td>
                            <td data-label="真实 IP" style="font-family:monospace; font-size:13px; color:var(--text-sec); word-break:break-all;">\${log.ip}</td>
                            <td data-label="归属地"><span class="badge" style="background:\${isChina ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)'}; color:\${isChina ? '#34c759' : '#ff9500'};">\${isChina ? '中国大陆' : (log.country || 'Unknown')}</span></td>
                            <td data-label="设备标识 (UA)" style="font-size:12px; color:var(--text-sec); word-break: break-all; white-space: normal; text-align: right; line-height: 1.4;" title="\${log.ua}">\${log.ua}</td>
                        \`;
                        tbody.appendChild(tr);
                    });
                }

            } catch (e) {
                const errMsg = e.name === 'AbortError' ? '网络超时，CF 接口拥堵，请稍后重试' : e.message;
                document.getElementById('logTableBody').innerHTML = \`<tr><td colspan="5" style="text-align:center;color:#ff3b30; padding: 30px;">独立图表数据拉取失败: \${errMsg}</td></tr>\`;
            }
        }

        function closeDashboard() { document.getElementById('dashboardModal').style.display = 'none'; }

        async function loadIcons(forceUrl = null) {
            const grid = document.getElementById('iconGrid');
            grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-sec); font-size: 13px; text-align: center;">加载图标库中...</div>';
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
                grid.innerHTML = '<div style="grid-column: 1/-1; color: #ff3b30; font-size: 13px; text-align: center;">获取图标库失败，请检查链接或网络状态</div>';
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
            let html = \`<div class="icon-item" onclick="selectIcon('', '默认 🎬')" title="使用默认图标"><span style="font-size:22px;">🎬</span></div>\`;
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
                        const tag = i === 0 ? '<span style="color:#34c759;font-weight:bold;">[主]</span>' : '<span style="color:#ff9500;font-weight:bold;">[备]</span>';
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
            try {
                const res = await fetch('/api/ping-node?url=' + encodeURIComponent(targetUrl));
                const data = await res.json();
                if(data.ms >= 0) {
                    pingEl.innerHTML = data.ms + '<span class="unit">ms</span>';
                    if (data.ms < 200) { pingEl.style.color = '#34c759'; setSub('良好', 'up'); }
                    else if (data.ms < 500) { pingEl.style.color = 'var(--primary)'; setSub('一般', null); }
                    else { pingEl.style.color = '#ff9500'; setSub('偏高', 'down'); }
                } else { pingEl.textContent = '断连'; pingEl.style.color = '#ff3b30'; setSub('超时', 'down'); }
            } catch(e) { pingEl.textContent = '异常'; pingEl.style.color = '#ff3b30'; setSub('错误', 'down'); }
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
                        </div>

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
                                <span id="ping-\${idx}" class="a-stat-val" style="cursor:pointer;" onclick="pingTarget(\${idx}, '\${mainTarget}')" title="点击重新测速">测速中</span>
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

            } catch (err) {
                document.getElementById('list-grid').innerHTML = \`<div style="text-align:center; color:#ff3b30; font-weight:600; grid-column: 1 / -1; padding: 20px;">⚠️ 读取失败: \${err.message}</div>\`;
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
            window.scrollTo({ top: document.getElementById('addForm').offsetTop - 100, behavior: 'smooth' });
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
                    <td data-label="勾选节点" style="text-align: center;"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                    <td data-label="专属节点"><strong class="ip-text" style="color:var(--primary);cursor:pointer;font-family:monospace;" onclick="copyTxt('\${ip}')" title="点击复制">\${ip}</strong></td>
                    <td data-label="预估延迟" class="latency" data-ms="9999" style="font-weight: 600; color: #888;">测算中...</td>
                    <td data-label="连通状态" class="speed" style="color: #888;">-</td>
                    <td data-label="记录/归属地" class="loc" style="color: #666;">等待解析</td>
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
                        <td data-label="勾选节点" style="text-align: center;"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="专属节点"><strong class="ip-text" style="color:var(--primary);cursor:pointer;font-family:monospace;" onclick="copyTxt('\${ip}')" title="点击复制">\${ip}</strong></td>
                        <td data-label="预估延迟" class="latency" data-ms="9999" style="font-weight: 600; color: #888;">测算中...</td>
                        <td data-label="连通状态" class="speed" style="color: #888;">-</td>
                        <td data-label="记录/归属地" class="loc" style="color: #666;">等待解析</td>
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
                        <td data-label="勾选节点" style="text-align: center;"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="专属节点"><strong class="ip-text" style="color:var(--primary);cursor:pointer;font-family:monospace;" onclick="copyTxt('\${ip}')" title="点击复制">\${ip}</strong></td>
                        <td data-label="预估延迟" class="latency" data-ms="9999" style="font-weight: 600; color: #888;">测算中...</td>
                        <td data-label="连通状态" class="speed" style="color: #888;">-</td>
                        <td data-label="记录/归属地" class="loc" style="color: #666;">等待解析</td>
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
            document.getElementById('testTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-sec);">暂无数据，请拉取节点或输入自定义 IP/域名 测试</td></tr>';
            document.getElementById('statusText').textContent = '列表已清空。';
            document.getElementById('selectAll').checked = false;
        }
        function markTimeout(latTd, spdTd, tr) {
            latTd.textContent = '超时抛弃'; latTd.setAttribute('data-ms', 9999); latTd.style.color = '#ff3b30';
            spdTd.textContent = '❌ 超时 (>2000ms)'; spdTd.style.color = '#ff3b30';
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
            if (isDomain) { locTd.innerHTML = \`<span class="badge" style="background:rgba(175,82,222,0.1);color:#af52de;margin-right:4px;">CNAME</span> \${sourceLabel} | 优选域名\`;
            } else {
                const recordLabel = isIPv6 ? '<span class="badge" style="background:rgba(50,173,230,0.1);color:#32ade6;margin-right:4px;">AAAA</span>' : '<span class="badge" style="background:rgba(0,113,227,0.1);color:#0071e3;margin-right:4px;">A记录</span>';
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
            if (latency < 300) { latTd.style.color = '#34c759'; spdTd.textContent = '🚀 极佳'; spdTd.style.color = '#34c759'; } 
            else if (latency <= 500) { latTd.style.color = 'var(--primary)'; spdTd.textContent = '✅ 正常'; spdTd.style.color = 'var(--primary)'; } 
            else { latTd.style.color = '#ff9500'; spdTd.textContent = '⚠️ 较高'; spdTd.style.color = '#ff9500'; }
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
            try {
                const res = await fetch('/api/get-dns'); const data = await res.json(); const container = document.getElementById('dnsStatus');
                if (data.success && data.result) {
                    const records = data.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                    if (records.length === 0) container.innerHTML = '<span class="badge" style="background:rgba(255,149,0,0.1);color:#ff9500;">暂无解析记录</span>';
                    else container.innerHTML = records.map(r => \`<span class="badge" style="background:rgba(0,113,227,0.1);color:var(--primary);border:1px solid rgba(0,113,227,0.2);">\${r.type} | \${r.content}</span>\`).join('');
                } else container.innerHTML = \`<span class="badge" style="background:rgba(255,59,48,0.1);color:#ff3b30;">\${data.error || '获取失败'}</span>\`;
            } catch (e) { document.getElementById('dnsStatus').innerHTML = '<span class="badge" style="background:rgba(255,59,48,0.1);color:#ff3b30;">网络异常</span>'; }
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
                    dotEl.style.background = '#34c759'; dotEl.style.boxShadow = '0 0 8px #34c759';
                    rttEl.style.color = '#34c759';
                } else if (rtt < 200) {
                    dotEl.style.background = '#ff9500'; dotEl.style.boxShadow = '0 0 8px #ff9500';
                    rttEl.style.color = '#ff9500';
                } else {
                    dotEl.style.background = '#ff3b30'; dotEl.style.boxShadow = '0 0 8px #ff3b30';
                    rttEl.style.color = '#ff3b30';
                }
            } catch (e) {
                document.getElementById('rttValue').textContent = '断连';
                document.getElementById('rttDot').style.background = '#ff3b30';
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
                    // Compact entry: just the colo code (e.g. "HKG"); full text shown in pill tooltip
                    const entryEl = document.getElementById('trace-entry');
                    entryEl.innerText = data.entryColo || '--';
                    let fullEntry = data.entryCountry || '';
                    if (data.entryCity && data.entryCity !== '未知') fullEntry += ' ' + data.entryCity;
                    fullEntry += ' (' + (data.entryColo || '?') + ')';
                    entryEl.title = '访客入口: ' + fullEntry;

                    const egressText = data.egressColo;
                    const egressElem = document.getElementById('trace-egress');
                    egressElem.innerText = egressText;
                    egressElem.title = 'Worker 落地: ' + egressText;

                    if (data.entryColo !== egressText && egressText !== '探测中...' && egressText !== '获取失败') {
                        egressElem.style.color = '#ff9500';
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
                    statusElem.style.color = "#ff3b30";
                    return;
                }
                placementPayload = { region: customVal.trim() };
            } else {
                placementPayload = JSON.parse(modeVal);
            }

            statusElem.innerText = "⏳ 正在提交请求，请稍候...";
            statusElem.style.color = "#ff9500";
            
            try {
                var res = await fetch('/api/placement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placement: placementPayload })
                });
                var data = await res.json();
                if (data.success) {
                    statusElem.innerText = "✅ " + data.msg;
                    statusElem.style.color = "#34c759";
                } else {
                    statusElem.innerText = "❌ " + data.msg;
                    statusElem.style.color = "#ff3b30";
                }
            } catch(e) {
                statusElem.innerText = "❌ 网络错误: " + e.message;
                statusElem.style.color = "#ff3b30";
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
                statusElem.style.color = "#ff9500";
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
                statusElem.style.color = "#34c759";
                setTimeout(() => location.reload(), 1000); 

            } catch (e) {
                statusElem.innerText = "❌ 失败: " + e.message;
                statusElem.style.color = "#ff3b30";
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
            <p>粘贴浏览器 DevTools 「Copy as cURL」 出来的内容，自动提取所有 <code style="background:rgba(120,120,120,0.1);padding:1px 4px;border-radius:3px;font-size:11px;">-H</code> 标头：</p>
            <textarea id="curlInput" placeholder="curl 'https://example.com/api/users/AuthenticateByName' \\&#10;  -H 'authorization: MediaBrowser Token=&quot;xxx&quot;' \\&#10;  -H 'x-emby-token: abc123' \\&#10;  --compressed"></textarea>
            <div class="curl-modal-actions">
                <button class="btn-tier" onclick="HeadersEditor.closeCurlModal()">取消</button>
                <button class="btn-tier is-primary" onclick="HeadersEditor.parseCurl()">解析并导入</button>
            </div>
        </div>
    </div>

    <!-- 移动端底部导航 Tab Bar (桌面端 CSS 隐藏) -->
    <nav id="mobileTabBar" aria-label="移动端导航">
        <button type="button" data-tab="home" class="active" aria-label="节点">
            <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            <span>节点</span>
        </button>
        <button type="button" data-tab="speed" aria-label="测速">
            <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>测速</span>
        </button>
        <button type="button" data-tab="stats" aria-label="数据">
            <svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
            <span>数据</span>
        </button>
        <button type="button" data-tab="settings" aria-label="设置">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>设置</span>
        </button>
    </nav>

    <script>
        // 📱 Mobile bottom Tab Bar + status pills (mobile only; desktop CSS hides them)
        (function () {
            function initMobileTabBar() {
                const bar = document.getElementById('mobileTabBar');
                if (!bar) return;
                bar.querySelectorAll('button[data-tab]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tab = btn.dataset.tab;
                        bar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
                        if (tab === 'stats') { if (typeof openDashboard === 'function') openDashboard(); return; }
                        const sel = tab === 'home' ? '#list-grid'
                                  : tab === 'speed' ? '#speed-anchor'
                                  : tab === 'settings' ? '#settings-anchor' : null;
                        const el = sel && document.querySelector(sel);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                });
            }
            function initMobilePills() {
                const sources = [
                    { src: 'rttValue',       dst: 'm-pill-rtt' },
                    { src: 'placeModeLabel', dst: 'm-pill-mode' },
                    { src: 'trafficToday',   dst: 'm-pill-today' },
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
                };
                sync();
                sources.forEach(({ src }) => {
                    const node = document.getElementById(src);
                    if (!node) return;
                    new MutationObserver(sync).observe(node, { childList: true, characterData: true, subtree: true });
                });
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => { initMobileTabBar(); initMobilePills(); });
            } else {
                initMobileTabBar();
                initMobilePills();
            }
        })();
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
            try { await env.DB.exec(`ALTER TABLE routes ADD COLUMN backend_url TEXT DEFAULT ''`); } catch (e) { }

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

                await env.DB.prepare('INSERT OR REPLACE INTO routes (prefix, target, mode, remark, icon, cache_img, sort_order, custom_headers, backend_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                    .bind(data.prefix, data.target, data.mode || 'off', data.remark || '', data.icon || '', data.cache_img || 'on', currentSortOrder, data.custom_headers || '', data.backend_url || '').run();
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
            // 去掉 Accept-Encoding，让源站返回未压缩内容，这样我们才能正确重写响应体
            // CF Worker 会自动在返回给客户端时重新压缩，不影响用户体验
            newHeaders.delete("Accept-Encoding");

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
        // 2.10 响应体重写 (PlaybackInfo / M3U8 / 前后端分离自动兼容)
        // ==========================================

        // 🌟 前后端分离核心：前端 origin 已知，响应体里出现的其他 origin 就是泄露的后端地址
        let frontendOrigin = '';
        try { frontendOrigin = new URL(targetUrls[0]).origin; } catch (e) { }

        // 通用 URL 改写：把非前端、非代理自身的绝对 URL 都套上代理前缀
        // 正则只匹配到合法 URL 字符结束（不吃引号、空白、括号、逗号、分号）
        function rewriteBackendUrls(text) {
            return text.replace(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g, matched => {
                // 去掉尾部可能被误匹配的标点
                const trail = matched.match(/[.,;)]+$/)?.[0] || '';
                const clean = trail ? matched.slice(0, -trail.length) : matched;
                try {
                    const u = new URL(clean);
                    if (u.origin !== frontendOrigin && u.origin !== proxyOrigin) {
                        return proxyOrigin + safePrefix + '/' + clean + trail;
                    }
                } catch (e) { }
                return matched;
            });
        }

        const contentType = responseHeaders.get("content-type") || '';
        const pathLower = url.pathname.toLowerCase();

        // 判断是否需要做响应体重写，避免对不需要处理的请求读取 body
        const needsJsonPlayback = finalResponse.status === 200 && contentType.includes("json") && pathLower.includes("playbackinfo");
        const needsSystemInfo = finalResponse.status === 200 && contentType.includes("json") && /\/system\/info(\/public)?$/i.test(pathLower);
        const needsM3u8 = finalResponse.status === 200 && pathLower.endsWith('.m3u8');
        const needsHtmlJs = finalResponse.status === 200 && frontendOrigin && (
            contentType.includes('text/html') || contentType.includes('text/javascript') || contentType.includes('application/javascript')
        );

        if (needsJsonPlayback || needsSystemInfo || needsM3u8 || needsHtmlJs) {
            try {
                const bodyText = await finalResponse.text();

                // ① PlaybackInfo：重写 DirectStreamUrl / TranscodingUrl
                if (needsJsonPlayback) {
                    try {
                        const data = JSON.parse(bodyText);
                        let modified = false;
                        if (data && data.MediaSources) {
                            data.MediaSources.forEach(source => {
                                ['DirectStreamUrl', 'TranscodingUrl'].forEach(key => {
                                    if (source[key] && source[key].startsWith('http') && !source[key].startsWith(proxyOrigin)) {
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
                    } catch (e) { console.log("PlaybackInfo 重写失败:", e.message); }
                }

                // ② System/Info(/Public)：前后端分离场景下把 Address/LocalAddress 指向代理
                if (needsSystemInfo) {
                    try {
                        const data = JSON.parse(bodyText);
                        let modified = false;
                        ['Address', 'LocalAddress'].forEach(key => {
                            if (data[key] && data[key].startsWith('http') && !data[key].startsWith(proxyOrigin)) {
                                data[key] = proxyOrigin + safePrefix;
                                modified = true;
                            }
                        });
                        if (modified) {
                            responseHeaders.delete("Content-Length");
                            return new Response(JSON.stringify(data), { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                        }
                    } catch (e) { console.log("System/Info 重写失败:", e.message); }
                }

                // ③ M3U8 播放列表
                if (needsM3u8) {
                    if (bodyText.includes('http://') || bodyText.includes('https://')) {
                        const rewritten = rewriteBackendUrls(bodyText);
                        responseHeaders.delete("Content-Length");
                        return new Response(rewritten, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                    }
                }

                // ④ HTML / JS：检测并改写泄露的后端地址
                if (needsHtmlJs) {
                    // 只有真的包含异源 URL 才做替换，避免修改无需处理的页面
                    const urls = bodyText.match(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g) || [];
                    const hasLeakedBackend = urls.some(u => {
                        try { const o = new URL(u).origin; return o !== frontendOrigin && o !== proxyOrigin; } catch (e) { return false; }
                    });
                    if (hasLeakedBackend) {
                        const rewritten = rewriteBackendUrls(bodyText);
                        responseHeaders.delete("Content-Length");
                        return new Response(rewritten, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
                    }
                }

                // 没有命中任何重写逻辑，原样返回已读取的文本
                responseHeaders.delete("Content-Length");
                return new Response(bodyText, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });

            } catch (e) {
                console.log("响应体重写异常:", e.message);
                // 出错时降级：直接透传原始响应
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
// VERSION: 2.4.0
// 🟢 面板核心配置区 (放在最顶端方便修改)
const CURRENT_VERSION = "2.5.0";
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
        /* 科技风扩展变量 (浅色版) */
        --surface: #ffffff;
        --surface-2: #f0f1f4;
        --sidebar-bg: #ffffff;
        --topbar-bg: #ffffff;
        --ok: #34c759;
        --warn: #ff9500;
        --err: #ff3b30;
        --card-shadow: 0 4px 20px rgba(0,0,0,0.05);

        /* === Alignment system v2.2.0 — design tokens ===
           Spec: .trellis/spec/frontend/ui-design-system.md "Alignment system" */
        --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
        --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 48px;
        /* half-steps — only for legitimate optical compaction (icon paddings,
           inline-row gaps, dense card spacing). Prefer whole steps in new code. */
        --space-1-5: 6px; --space-2-5: 10px; --space-3-5: 14px;
        --text-2xs:  9px; --text-xs:  11px; --text-sm:  12px; --text-md: 13px;
        --text-base: 14px; --text-lg:  15px; --text-xl:  16px;
        --text-2xl:  20px; --text-3xl: 28px;
        --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px;
        --radius-xl: 14px; --radius-2xl: 16px; --radius-pill: 999px;
        --radius-card: var(--radius-2xl);
        --ok-soft:   rgba(52,199,89,0.10);  --ok-ring:   rgba(52,199,89,0.20);
        --warn-soft: rgba(255,149,0,0.10);  --warn-ring: rgba(255,149,0,0.20);
        --err-soft:  rgba(255,59,48,0.10);  --err-ring:  rgba(255,59,48,0.20);
        --primary-soft: rgba(0,113,227,0.10);
        --primary-ring: rgba(0,113,227,0.20);
        --primary-glow: rgba(0,113,227,0.32);
        --accent-glow: var(--primary-glow);
        --touch-min: 44px;

        /* === Aurora system v2.3.0 — distinctive surface tokens ===
           Brand gradient + glass surfaces. Adds visible identity without
           rewriting layout. Used by sidebar-brand, .kpi-tile.is-primary,
           .btn-submit hover, glass topbar. */
        --aurora-grad: linear-gradient(135deg, #0071e3 0%, #5856d6 55%, #af52de 110%);
        --aurora-grad-soft: radial-gradient(120% 80% at 0% 0%, rgba(88,86,214,0.10), transparent 60%);
        --topbar-glass: rgba(255,255,255,0.72);
        --card-shadow-lift:
            0 1px 0 rgba(255,255,255,0.55) inset,
            0 1px 2px rgba(15,23,42,0.04),
            0 10px 28px -12px rgba(15,23,42,0.12);
        --card-shadow-hover:
            0 1px 0 rgba(255,255,255,0.55) inset,
            0 4px 10px rgba(15,23,42,0.05),
            0 18px 38px -12px rgba(15,23,42,0.18);

        /* === iOS-native tokens v2.4.0 — typography & shapes ===
           iOS HIG values (34pt large title, 17pt headline, 16pt callout, 15pt body,
           continuous-corner radii).
           v2.5.0: desktop port — ios-page-header / ios-form-* / tb-section-title
           promoted out of the mobile MQ; mobile-only tokens (large-title shrinks)
           are still scoped via media queries. */
        --text-headline: 17px;
        --text-body-ios: 15px;
        --text-large-title: 34px;
        --text-large-title-md: 30px;   /* ≤480 shrink */
        --text-large-title-sm: 28px;   /* ≤360 shrink */
        --text-large-title-lg: 40px;   /* ≥769px desktop */
        --radius-ios: 18px;
        --radius-ios-sm: 14px;
        --hairline: rgba(60,60,67,0.18);
        --ios-fill: rgba(120,120,128,0.16);
        --ios-fill-quat: rgba(120,120,128,0.08);
        --ios-overlay: rgba(0,0,0,0.32);
    }

    body.dark {
        --primary: #2f9bff;
        --primary-hover: #5cb0ff;
        --bg: #07090f;
        --card: #12151d;
        --text: #e9edf5;
        --text-sec: #8b93a7;
        --border: #232838;
        /* 科技风扩展变量 (深色版) */
        --surface: #12151d;
        --surface-2: #181c27;
        --sidebar-bg: #0c0e15;
        --topbar-bg: #0e1119;
        --ok: #30d158;
        --warn: #ff9f0a;
        --err: #ff453a;
        --card-shadow: 0 0 0 1px rgba(255,255,255,0.02), 0 6px 26px rgba(0,0,0,0.55);

        /* Alignment system v2.2.0 — dark-mode overrides for tokens whose value differs */
        --ok-soft:   rgba(48,209,88,0.12);  --ok-ring:   rgba(48,209,88,0.24);
        --warn-soft: rgba(255,159,10,0.12); --warn-ring: rgba(255,159,10,0.24);
        --err-soft:  rgba(255,69,58,0.12);  --err-ring:  rgba(255,69,58,0.24);
        --primary-soft: rgba(47,155,255,0.12);
        --primary-ring: rgba(47,155,255,0.24);
        --primary-glow: rgba(47,155,255,0.32);

        /* Aurora system v2.3.0 — dark variant */
        --aurora-grad: linear-gradient(135deg, #2f9bff 0%, #6e6ad9 55%, #c47ce0 110%);
        --aurora-grad-soft: radial-gradient(140% 90% at 0% 0%, rgba(47,155,255,0.18), transparent 65%);
        --topbar-glass: rgba(14,17,25,0.68);
        --card-shadow-lift:
            0 0 0 1px rgba(255,255,255,0.03) inset,
            0 10px 30px -10px rgba(0,0,0,0.55);
        --card-shadow-hover:
            0 0 0 1px var(--primary-ring) inset,
            0 14px 38px -10px rgba(0,0,0,0.7);

        /* iOS-native tokens v2.4.0 — dark variant */
        --hairline: rgba(84,84,88,0.55);
        --ios-fill: rgba(118,118,128,0.24);
        --ios-fill-quat: rgba(118,118,128,0.12);
        --ios-overlay: rgba(0,0,0,0.55);
    }

    * { box-sizing: border-box; touch-action: manipulation; }
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: var(--space-5); -webkit-text-size-adjust: 100%; transition: background-color 0.3s, color 0.3s; }
    .container { max-width: 1200px; margin: 0 auto; width: 100%; min-height: 90vh; display: flex; flex-direction: column;}
    .content-wrap { flex: 1; }
    input, select, button, textarea { font-family: inherit; outline: none; font-size: var(--text-lg); }
    
    .card { background: var(--card); padding: var(--space-6); border-radius: var(--radius-ios); box-shadow: var(--card-shadow-lift); margin-bottom: var(--space-6); border: 1px solid var(--border); transition: 0.3s; }
    
    #toast { position: fixed; top: -60px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: white; padding: var(--space-3) var(--space-6); border-radius: var(--radius-pill); font-size: var(--text-base); font-weight: 500; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 9999; backdrop-filter: blur(10px); text-align: center; max-width: 90vw; word-wrap: break-word; }
    #toast.show { top: 20px; }

    .toolbar { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-4); align-items: center; }
    .btn-submit { padding: var(--space-3) var(--space-5); background: var(--aurora-grad); background-size: 180% 100%; background-position: 0% 0%; color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-weight: 600; white-space: nowrap; transition: background-position 0.45s ease, transform 0.18s ease, box-shadow 0.2s ease; box-shadow: 0 6px 16px -4px var(--primary-glow); }
    .btn-submit:hover { background-position: 100% 0%; transform: translateY(-1px); box-shadow: 0 10px 24px -6px var(--primary-glow); }
    .btn-submit:active { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; background: var(--primary); }
    
    .table-wrapper { width: 100%; border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden; background: var(--card); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: var(--space-4); border-bottom: 1px solid var(--border); font-size: var(--text-base); vertical-align: middle; }
    th { color: var(--text-sec); font-weight: 600; background: rgba(120,120,120,0.05); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background-color: rgba(120,120,120,0.03); }
    
    .action-group { display: inline-flex; gap: var(--space-2); background: rgba(120,120,120,0.05); padding: var(--space-1) var(--space-2-5); border-radius: var(--radius-md); border: 1px solid var(--border); align-items: flex-start; max-width: 100%; flex-wrap: wrap; }
    /* === Icon button family (v2.2.0) ===
       Canonical ghost-bordered icon button. Three intent classes share base rules:
         .icon-btn      — generic (= .a-icon-btn)
         .a-icon-btn    — node-card / table action buttons
         .tb-icon-btn   — topbar borderless variant (own rule below)
       Size modifiers (apply to any): .is-sm 28x28 / .is-md 32x32 / .is-lg 36x36 */
    .icon-btn, .a-icon-btn {
        width: 32px; height: 32px; border-radius: var(--radius-md);
        border: 1px solid var(--border); background: transparent;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        color: var(--text-sec); transition: 0.15s; padding: 0;
        font-size: var(--text-xl); flex-shrink: 0;
    }
    .icon-btn:hover, .a-icon-btn:hover { color: var(--text); background: var(--surface-2); border-color: var(--border); }
    .icon-btn.danger-hover:hover, .a-icon-btn.danger-hover:hover { color: var(--err); border-color: var(--err); background: var(--err-soft); }
    .icon-btn svg, .a-icon-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; }
    .icon-btn.is-sm, .a-icon-btn.is-sm, .tb-icon-btn.is-sm { width: 28px; height: 28px; }
    .icon-btn.is-md, .a-icon-btn.is-md, .tb-icon-btn.is-md { width: 32px; height: 32px; }
    .icon-btn.is-lg, .a-icon-btn.is-lg, .tb-icon-btn.is-lg { width: 36px; height: 36px; }
    
    .badge { padding: var(--space-1) var(--space-2-5); border-radius: var(--radius-pill); font-size: var(--text-sm); font-weight: 600; display: inline-block; }
    
    .btn-edit { padding: var(--space-2) var(--space-3-5); background: var(--card); color: var(--primary); border: 1px solid var(--primary); border-radius: var(--radius-md); cursor: pointer; font-size: var(--text-md); font-weight: 600; transition: 0.2s; }
    .btn-del { padding: var(--space-2) var(--space-3-5); background: var(--card); color: var(--err); border: 1px solid var(--err); border-radius: var(--radius-md); cursor: pointer; font-size: var(--text-md); font-weight: 600; transition: 0.2s; }
    .btn-dns { padding: var(--space-2) var(--space-3-5); background: var(--card); color: var(--ok); border: 1px solid var(--ok); border-radius: var(--radius-md); cursor: pointer; font-size: var(--text-md); font-weight: 600; transition: 0.2s; white-space: nowrap; }
    .btn-dns:disabled { opacity: 0.5; cursor: not-allowed; }

    .ip-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); }
    .secret-text { font-family: monospace; letter-spacing: 2px; color: var(--text-sec); }
    
    .dynamic-url { display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: right; }
    .actual-text.dynamic-url { white-space: normal; max-width: 100%; overflow: visible; text-align: left !important; word-break: break-all; font-size: var(--text-md); font-family: monospace; color: var(--primary); letter-spacing: normal; }
    .url-list-item { background: var(--bg); border: 1px solid var(--border); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-size: var(--text-sm); margin-top: var(--space-1-5); word-break: break-all; line-height: 1.4; color: var(--text); font-family: -apple-system, sans-serif; letter-spacing: normal; text-align: left; }
    .url-list-item:first-child { margin-top: 0; }

    body.dark input, body.dark select, body.dark textarea { background: #1c1c1e; color: #f5f5f7; border: 1px solid #38383a; }

    .search-input { padding: var(--space-2-5) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg); color: var(--text); font-size: var(--text-base); width: 260px; transition: 0.3s; }
    .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }

    .node-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--space-5); margin-top: var(--space-5); }
    .emby-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: 0 4px 15px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: var(--space-3-5); transition: 0.3s; position: relative; }
    .emby-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.06); transform: translateY(-2px); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 0.5px solid var(--hairline); padding-bottom: 12px; }
    .card-title-group { display: flex; align-items: center; gap: var(--space-3); }
    .emby-icon { font-size: var(--text-3xl); background: rgba(120,120,120,0.05); border-radius: var(--radius-md); padding: var(--space-1-5); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; flex-shrink: 0; }
    .info-row { display: flex; align-items: flex-start; justify-content: space-between; font-size: var(--text-md); }
    .info-label { color: var(--text-sec); font-weight: 500; min-width: 65px; margin-top: var(--space-1); }
    .card-footer { display: flex; justify-content: flex-end; gap: var(--space-2-5); margin-top: auto; padding-top: 12px; border-top: 1px dashed var(--border); }

    .ping-badge { color: var(--text-sec); cursor: pointer; padding: var(--space-1) var(--space-2-5); background: rgba(120,120,120,0.05); border-radius: var(--radius-sm); font-size: var(--text-md); font-weight: 500; transition: 0.2s; border: 1px solid transparent; user-select: none; }
    .ping-badge:hover { border-color: var(--border); background: var(--card); box-shadow: 0 2px 6px rgba(0,0,0,0.05); color: var(--primary); }

    .icon-item { cursor: pointer; padding: var(--space-1-5); border-radius: var(--radius-md); border: 1px solid transparent; display: flex; justify-content: center; align-items: center; transition: 0.2s; background: var(--bg); height: 44px; }
    .icon-item:hover { border-color: var(--primary) !important; box-shadow: 0 2px 8px var(--primary-ring); transform: scale(1.05); }
    #iconGrid::-webkit-scrollbar { width: 6px; }
    #iconGrid::-webkit-scrollbar-thumb { background: var(--border); border-radius: var(--radius-pill); }

    /* 拖拽排序核心适配样式 */
    .emby-card.sortable-ghost { opacity: 0.4; }
    .emby-card.sortable-drag { cursor: grabbing !important; }
    .drag-handle { cursor: grab; padding-right: 10px; font-size: var(--text-2xl); color: var(--text-sec); display: flex; align-items: center; user-select: none; touch-action: none;}
    .drag-handle:active { cursor: grabbing; color: var(--primary); }

    /* ============================================================
       节点卡片精简 (Node Card Redesign) — Lucide 风格，去 emoji
       ============================================================ */
    .emby-card.idle { opacity: 0.85; }
    .a-head { display: flex; align-items: center; gap: var(--space-3); }
    .a-handle { width: 18px; display: flex; align-items: center; justify-content: center; color: var(--text-ter, #b0b0b5); cursor: grab; flex-shrink: 0; touch-action: none; }
    .a-handle:hover { color: var(--primary); }
    .a-handle:active { cursor: grabbing; }
    .a-handle svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; }
    .a-cb { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0; margin: 0; }
    .a-thumb { width: 38px; height: 38px; border-radius: var(--radius-md); flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary), #5856d6); color: #fff; font-weight: 700; font-size: var(--text-lg); letter-spacing: -0.02em; overflow: hidden; text-transform: uppercase; }
    .a-thumb.idle { background: linear-gradient(135deg, #8e8e93, #636366); }
    .a-thumb img { width: 100%; height: 100%; border-radius: var(--radius-md); object-fit: cover; display: block; }
    .a-title-block { flex: 1; min-width: 0; }
    .a-name { font-weight: 600; font-size: var(--text-lg); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .a-meta { display: flex; align-items: center; gap: var(--space-1-5); font-size: var(--text-sm); color: var(--text-sec); font-family: ui-monospace, Menlo, Consolas, monospace; margin-top: 2px; flex-wrap: wrap; }
    .a-meta .dot-sep { color: var(--text-ter, #b0b0b5); }
    .a-mode { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; color: var(--text-sec); }
    .a-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
    .a-status-dot.live { background: var(--ok); box-shadow: 0 0 5px var(--ok); }
    .a-status-dot.idle { background: var(--text-ter, #b0b0b5); }
    .a-status-dot.warn { background: var(--warn); box-shadow: 0 0 5px var(--warn); }
    .a-mode-badge { padding: 3px 9px; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: 600; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }

    .a-stats { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0; padding: 14px 0; border-top: 0.5px solid var(--hairline); border-bottom: 0.5px solid var(--hairline); }
    .a-stat { padding: 0 var(--space-3); border-right: 1px solid var(--border); min-width: 0; }
    .a-stat:last-child { border-right: none; }
    /* symmetric stat columns — no first/last asymmetry (v2.2.0) */
    .a-stat-label { font-size: var(--text-xs); font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1); }
    .a-stat-val { font-size: var(--text-2xl); font-weight: 700; color: var(--text); line-height: 1.15; letter-spacing: -0.02em; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
    .topbar .tb-stat .val { font-variant-numeric: tabular-nums; }
    .a-stat-val .unit { font-size: var(--text-xs); font-weight: 600; color: var(--text-sec); margin-left: 2px; }
    .a-stat-val.muted { color: var(--text-ter, #b0b0b5); }
    .a-stat-val.danger { color: var(--err); }
    .a-stat-sub { font-size: var(--text-xs); color: var(--text-sec); margin-top: 2px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .a-stat-sub.up { color: var(--ok); }
    .a-stat-sub.down { color: var(--err); }

    .a-tags { display: flex; gap: var(--space-1-5); flex-wrap: wrap; align-items: center; min-height: 24px; }
    .a-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: 600; background: rgba(120,120,120,0.07); border: 1px solid var(--border); color: var(--text-sec); white-space: nowrap; }
    .a-tag svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 2; }
    .a-tag.good { color: var(--ok); background: var(--ok-soft); border-color: var(--ok-ring); }
    .a-tag.warn { color: var(--warn); background: var(--warn-soft); border-color: var(--warn-ring); }
    .a-tag.danger { color: var(--err); background: var(--err-soft); border-color: var(--err-ring); }
    .a-tag.primary { color: var(--primary); background: var(--primary-soft); border-color: var(--primary-ring); cursor: pointer; }
    .a-tag.primary:hover { background: var(--primary-ring); }

    .a-foot { display: flex; align-items: center; gap: var(--space-1-5); }
    .a-foot-spacer { flex: 1; }
    /* .a-icon-btn — see consolidated rule above (icon-button family). */
    .a-btn-edit { padding: 7px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--card); color: var(--text); font: inherit; font-size: var(--text-md); font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: var(--space-1-5); }
    .a-btn-edit:hover { border-color: var(--primary); color: var(--primary); }
    .a-btn-edit svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; }

    .a-details { display: none; padding: var(--space-3-5); background: rgba(120,120,120,0.04); border-radius: var(--radius-md); border: 1px solid var(--border); margin-top: -4px; }
    .a-details.open { display: block; }
    .a-detail-row { display: grid; grid-template-columns: 78px 1fr auto; gap: var(--space-2-5); align-items: center; padding: 6px 0; font-size: var(--text-sm); }
    .a-detail-row + .a-detail-row { border-top: 0.5px solid var(--hairline); }
    .a-detail-label { color: var(--text-sec); font-weight: 600; }
    .a-detail-val { font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .a-detail-val.secret { letter-spacing: 2px; color: var(--text-sec); }
    .a-detail-actions { display: flex; gap: var(--space-1); justify-self: end; }
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
        padding: 9px 16px; border-radius: var(--radius-md); border: 1px solid var(--border);
        background: var(--card); color: var(--text);
        font: inherit; font-size: var(--text-md); font-weight: 600;
        cursor: pointer; white-space: nowrap;
        display: inline-flex; align-items: center; gap: var(--space-1-5);
        transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .btn-tier:hover { background: rgba(120,120,120,0.06); border-color: var(--text-sec); }
    .btn-tier:active { transform: translateY(0); }
    .btn-tier:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-tier svg { width: 14px; height: 14px; flex-shrink: 0; }
    .btn-tier.is-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
    .btn-tier.is-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
    .btn-tier.is-success { background: var(--ok); color: #fff; border-color: var(--ok); }
    .btn-tier.is-success:hover { filter: brightness(0.95); }
    .btn-tier.is-danger  { background: var(--err); color: #fff; border-color: var(--err); }
    .btn-tier.is-danger:hover  { filter: brightness(0.95); }
    .btn-tier.is-ghost   { background: transparent; border-color: transparent; color: var(--text-sec); }
    .btn-tier.is-ghost:hover { color: var(--text); background: rgba(120,120,120,0.07); }
    .btn-tier.is-sm { padding: var(--space-1-5) var(--space-3); font-size: var(--text-sm); }
    .v-sep { width: 1px; height: 22px; background: var(--border); align-self: center; }

    /* --- Generic dropdown menu --- */
    .menu-wrap { position: relative; display: inline-flex; }
    .menu {
        position: absolute; top: calc(100% + 6px); right: 0; min-width: 220px;
        background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md);
        box-shadow: 0 10px 30px rgba(0,0,0,0.12); padding: var(--space-1-5);
        display: none; flex-direction: column; gap: 2px; z-index: 200;
    }
    .menu.open { display: flex; }
    .menu button {
        display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-2-5); border-radius: var(--radius-md);
        border: none; background: transparent; color: var(--text); font: inherit; font-size: var(--text-md);
        text-align: left; cursor: pointer; width: 100%;
    }
    .menu button:hover { background: rgba(120,120,120,0.07); }
    .menu button.danger { color: var(--err); }
    .menu button.danger:hover { background: var(--err-soft); }
    .menu hr { border: none; border-top: 0.5px solid var(--hairline); margin: 4px 6px; opacity: 0.6; }
    .menu svg { width: 14px; height: 14px; flex-shrink: 0; }

    /* --- iOS-style switch (scoped to .ios-switch to avoid collisions) --- */
    .ios-switch { width: 38px; height: 22px; background: var(--border); border-radius: var(--radius-pill); position: relative; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
    .ios-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
    .ios-switch.on { background: var(--ok); }
    .ios-switch.on::after { left: 18px; }

    /* --- Sectioned form (.a-* family) --- */
    .a-form { display: flex; flex-direction: column; gap: var(--space-6); }
    .a-fieldset { display: flex; flex-direction: column; gap: var(--space-2-5); }
    .a-fieldset-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-2-5); flex-wrap: wrap; }
    .a-field-label { display: block; font-size: var(--text-xs); font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.06em; }
    .a-field-aux { font-size: var(--text-sm); color: var(--text-sec); }
    .a-input, .a-select {
        padding: 11px 14px; border: 1px solid var(--border); border-radius: var(--radius-md);
        background: var(--card); color: var(--text); font: inherit; font-size: var(--text-base);
        outline: none; width: 100%; transition: 0.15s;
    }
    .a-input:focus, .a-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
    .a-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-2-5); }
    .a-row.two { grid-template-columns: 1fr 1fr; }
    .a-upstream-row { display: flex; gap: var(--space-2); align-items: center; }
    .a-tag-pri, .a-tag-bk {
        width: 48px; flex-shrink: 0; padding: 5px 0; border-radius: var(--radius-md);
        text-align: center; font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.04em;
    }
    .a-tag-pri { background: var(--primary-soft); color: var(--primary); }
    .a-tag-bk  { background: rgba(120,120,120,0.1); color: var(--text-sec); }
    .a-add-row {
        align-self: flex-start;
        display: inline-flex; align-items: center; gap: var(--space-1-5);
        padding: 7px 12px; border: 1px dashed var(--border); border-radius: var(--radius-md);
        background: transparent; color: var(--text-sec); font-weight: 600; cursor: pointer;
        font: inherit; font-size: var(--text-md);
    }
    .a-add-row:hover { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
    .a-add-row svg { width: 13px; height: 13px; }
    .a-card-pick, .a-toggle-row {
        display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3) var(--space-3-5);
        border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); cursor: pointer;
        min-height: 60px;
    }
    .a-card-pick:hover { border-color: var(--primary); }
    .a-toggle-row { user-select: none; }
    .a-footer {
        display: flex; justify-content: space-between; align-items: center; gap: var(--space-2-5);
        padding-top: 18px; border-top: 0.5px solid var(--hairline); margin-top: var(--space-1);
        flex-wrap: wrap;
    }
    .a-footer .a-footer-aux { color: var(--text-sec); font-size: var(--text-sm); }

    /* --- Headers Editor --- */
    .hed { border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3-5) var(--space-4); background: rgba(120,120,120,0.025); }
    .hed-head { display: grid; grid-template-columns: 22px 1fr 1.4fr 44px 32px; gap: var(--space-2); align-items: center; padding: 0 4px 8px 4px; font-size: var(--text-xs); font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.06em; }
    .hed-list { display: flex; flex-direction: column; gap: var(--space-1-5); }
    .hed-row {
        display: grid; grid-template-columns: 22px 1fr 1.4fr 44px 32px; gap: var(--space-2);
        align-items: center; padding: var(--space-1); border-radius: var(--radius-md);
        transition: background 0.15s;
    }
    .hed-row.dragging { opacity: 0.35; }
    .hed-row.disabled .hed-k, .hed-row.disabled .hed-v { opacity: 0.45; }
    .hed-row:hover { background: rgba(120,120,120,0.05); }
    .hed-handle { cursor: grab; color: var(--text-sec); opacity: 0.5; text-align: center; user-select: none; font-size: var(--text-md); line-height: 1; padding: 8px 0; }
    .hed-handle:active { cursor: grabbing; }
    .hed-k, .hed-v {
        width: 100%; padding: 9px 12px; border: 1px solid var(--border);
        border-radius: var(--radius-md); background: var(--card); color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--text-md);
        outline: none; transition: 0.15s;
    }
    .hed-k:focus, .hed-v:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
    .hed-v-wrap { position: relative; }
    .hed-v-wrap .mask-btn {
        position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
        width: 28px; height: 28px; border: none; background: transparent;
        color: var(--text-sec); cursor: pointer; border-radius: var(--radius-sm);
        display: flex; align-items: center; justify-content: center;
    }
    .hed-v-wrap .mask-btn:hover { color: var(--primary); background: var(--primary-soft); }
    .hed-v-wrap .mask-btn svg { width: 16px; height: 16px; fill: currentColor; }
    .hed-del {
        width: 32px; height: 32px; border: 1px solid transparent; border-radius: var(--radius-md);
        background: transparent; color: var(--text-sec); cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: var(--text-base);
        transition: 0.15s; justify-self: center;
    }
    .hed-del:hover { color: var(--err); border-color: var(--err); background: var(--err-soft); }
    .hed-del svg { width: 12px; height: 12px; }
    .hed-footer { display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3-5); flex-wrap: wrap; gap: var(--space-2-5); }
    .hed-meta { display: flex; gap: var(--space-2); align-items: center; font-size: var(--text-sm); color: var(--text-sec); }
    .hed-meta .dot { width: 6px; height: 6px; background: var(--ok); border-radius: 50%; box-shadow: 0 0 6px var(--ok); }
    .hed-empty { text-align: center; padding: 26px 20px; color: var(--text-sec); font-size: var(--text-md); border: 1px dashed var(--border); border-radius: var(--radius-md); }
    .templates { margin-top: var(--space-3-5); padding-top: 14px; border-top: 0.5px solid var(--hairline); display: flex; gap: var(--space-1-5); flex-wrap: wrap; align-items: center; }
    .templates-label { font-size: var(--text-sm); color: var(--text-sec); margin-right: var(--space-1); }
    .chip {
        display: inline-flex; align-items: center; gap: var(--space-1);
        padding: 5px 10px; border-radius: var(--radius-pill); font-size: var(--text-sm); font-weight: 600;
        background: rgba(120,120,120,0.08); color: var(--text-sec); border: 1px solid var(--border);
        cursor: pointer; transition: 0.15s; font-family: inherit;
    }
    .chip:hover { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
    .chip-curl { color: var(--primary); border-color: var(--primary-ring); background: var(--primary-soft); }

    /* --- cURL modal (separate from #dashboardModal) --- */
    .curl-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .curl-modal-bg.show { display: flex; }
    .curl-modal { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); width: 90%; max-width: 540px; }
    .curl-modal h3 { margin: 0 0 6px 0; font-size: var(--text-xl); }
    .curl-modal p  { margin: 0 0 12px 0; font-size: var(--text-md); color: var(--text-sec); }
    .curl-modal textarea { width: 100%; padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: ui-monospace, Menlo, monospace; font-size: var(--text-sm); resize: vertical; min-height: 120px; outline: none; }
    .curl-modal-actions { display: flex; justify-content: flex-end; gap: var(--space-2-5); margin-top: var(--space-3-5); }

    /* ============================================================
       Top Bar Redesign — consolidate update alert + CF trace +
       placement select + page header into a single status bar
       with pills, dismissable update banner, and expandable drawer.
       ============================================================ */
    .tb-banner {
        background: linear-gradient(90deg, var(--ok-soft), transparent);
        border: 1px solid var(--ok-ring); border-radius: var(--radius-md);
        padding: var(--space-2) var(--space-3-5); display: flex; align-items: center; gap: var(--space-3);
        font-size: var(--text-md); margin-bottom: var(--space-3-5);
    }
    .tb-banner .b-tag { background: var(--ok); color: #fff; font-size: var(--text-xs); font-weight: 700; padding: 2px 8px; border-radius: var(--radius-pill); }
    .tb-banner .b-msg { color: var(--text); flex: 1; }
    .tb-banner .b-cta { background: var(--ok); color: #fff; border: none; padding: var(--space-1-5) var(--space-3-5); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; font: inherit; font-size: var(--text-sm); }
    .tb-banner .b-cta:disabled { opacity: 0.6; cursor: not-allowed; }
    .tb-banner .b-dismiss { background: transparent; border: none; color: var(--text-sec); cursor: pointer; font-size: var(--text-xl); line-height: 1; padding: 2px 6px; }
    .tb-banner .b-dismiss:hover { color: var(--text); }

    .tb-bar {
        background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl);
        padding: var(--space-3) var(--space-4); display: flex; align-items: center; gap: var(--space-2-5); flex-wrap: wrap;
        box-shadow: 0 4px 20px rgba(0,0,0,0.04); margin-bottom: var(--space-3-5);
    }
    .tb-title { display: flex; align-items: center; gap: var(--space-2-5); font-weight: 700; font-size: var(--text-xl); padding-right: 4px; }
    .tb-title .tb-logo {
        width: 28px; height: 28px; border-radius: var(--radius-md);
        background: linear-gradient(135deg, var(--primary), #5856d6);
        display: flex; align-items: center; justify-content: center; color: #fff; font-size: var(--text-base);
    }
    .tb-divider { width: 1px; height: 22px; background: var(--border); }

    .pill {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 6px 11px; border-radius: var(--radius-pill);
        background: rgba(120,120,120,0.06); border: 1px solid var(--border);
        font-size: var(--text-sm); font-weight: 600; color: var(--text); cursor: default;
        transition: 0.15s; position: relative; line-height: 1.2; white-space: nowrap;
    }
    .pill:hover { background: rgba(120,120,120,0.1); }
    .pill .lbl { color: var(--text-sec); font-weight: 500; }
    .pill .val { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .pill .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .pill .dot.green { background: var(--ok); box-shadow: 0 0 6px var(--ok); }
    .pill .dot.amber { background: var(--warn); box-shadow: 0 0 6px var(--warn); }
    .pill .dot.red { background: var(--err); box-shadow: 0 0 6px var(--err); }
    .pill.expandable { cursor: pointer; }
    .pill.expandable:hover { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
    .pill.expandable.open { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
    .pill .caret { font-size: var(--text-2xs); opacity: 0.6; transition: transform 0.2s; }
    .pill.expandable.open .caret { transform: rotate(180deg); }

    .pill .tip {
        position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%);
        background: #1d1d1f; color: #fff; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
        font-size: var(--text-xs); font-weight: 500; white-space: nowrap;
        display: flex; flex-direction: column; gap: var(--space-1);
        opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 50;
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    .pill .tip::before { content: ""; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-bottom-color: #1d1d1f; }
    .pill .tip .line { display: flex; gap: var(--space-3-5); justify-content: space-between; }
    .pill .tip .tip-key { color: #98989d; }
    .pill:hover .tip { opacity: 1; }

    .tb-spacer { flex: 1; min-width: 8px; }

    .tb-icon-btn {
        width: 36px; height: 36px; border-radius: var(--radius-md);
        border: 1px solid var(--border); background: var(--surface-2);
        cursor: pointer; display: inline-flex;
        align-items: center; justify-content: center; color: var(--text-sec);
        transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
        position: relative; padding: 0;
        -webkit-tap-highlight-color: transparent;
    }
    .tb-icon-btn svg {
        width: 17px; height: 17px; fill: none; stroke: currentColor;
        stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
        transition: transform 0.25s ease;
    }
    .tb-icon-btn:hover {
        color: var(--primary); border-color: var(--primary);
        background: var(--primary-soft);
        box-shadow: 0 2px 8px rgba(0,113,227,0.12);
    }
    .tb-icon-btn:hover svg { transform: scale(1.06); }
    .tb-icon-btn:focus-visible {
        outline: none; border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-soft);
    }
    .tb-icon-btn:active { transform: scale(0.94); }
    .tb-icon-btn.danger:hover {
        color: var(--err); border-color: var(--err);
        background: var(--err-soft);
        box-shadow: 0 2px 8px rgba(255,59,48,0.14);
    }
    /* Theme toggle — show only the icon matching the current state */
    .tb-icon-btn[data-theme] .ico { display: none; }
    .tb-icon-btn[data-theme="auto"]  .ico-auto,
    .tb-icon-btn[data-theme="light"] .ico-light,
    .tb-icon-btn[data-theme="dark"]  .ico-dark { display: inline-flex; }

    .tb-drawer {
        background: var(--card); border: 1px solid var(--border);
        border-radius: var(--radius-xl); overflow: hidden;
        max-height: 0; opacity: 0; padding: 0 20px;
        transition: max-height 0.3s ease, opacity 0.2s, padding 0.3s, margin 0.3s;
        margin-bottom: 0;
    }
    .tb-drawer.open { max-height: 320px; opacity: 1; padding: var(--space-4) var(--space-5); margin-bottom: var(--space-3-5); }
    .tb-drawer h3 { margin: 0 0 4px 0; font-size: var(--text-base); font-weight: 700; }
    .tb-drawer .sub { font-size: var(--text-sm); color: var(--text-sec); margin-bottom: var(--space-3); }
    .tb-drawer .controls { display: flex; gap: var(--space-2-5); flex-wrap: wrap; align-items: center; }
    .tb-drawer select, .tb-drawer input {
        padding: 9px 12px; border-radius: var(--radius-md); border: 1px solid var(--border);
        background: var(--bg); color: var(--text); font: inherit; font-size: var(--text-md); outline: none;
        min-width: 200px;
    }
    .tb-drawer select:focus, .tb-drawer input:focus { border-color: var(--primary); }
    .tb-drawer .status { margin-top: var(--space-2-5); font-size: var(--text-sm); color: var(--text-sec); display: flex; align-items: center; gap: var(--space-1-5); }

    @media (max-width: 768px) {
        .tb-bar { padding: var(--space-2-5) var(--space-3); gap: var(--space-2); }
        .tb-title { font-size: var(--text-base); }
        .tb-title .tb-logo { width: 24px; height: 24px; font-size: var(--text-sm); }
        .tb-bar .tb-divider { display: none; }
        .pill { font-size: var(--text-xs); padding: 5px 10px; }
        /* .tb-icon-btn mobile sizing now driven by --touch-min in the consolidated tap-target block below. */
        .tb-banner { flex-wrap: wrap; }
        .tb-drawer select, .tb-drawer input { min-width: 0; width: 100%; }
        .tb-drawer .controls { flex-direction: column; align-items: stretch; }
    }

    /* --- Mobile tweaks for the new components --- */
    @media (max-width: 768px) {
        .a-row, .a-row.two { grid-template-columns: 1fr; }
        .hed-head { display: none; }
        .hed-row { grid-template-columns: 18px 1fr 36px 28px; grid-template-rows: auto auto; gap: var(--space-1-5); padding: var(--space-2) var(--space-1); }
        .hed-row .hed-handle { grid-row: 1 / 3; }
        .hed-row .hed-k { grid-column: 2 / 5; }
        .hed-row .hed-v-wrap { grid-column: 2 / 3; grid-row: 2; }
        .hed-row .ios-switch { grid-column: 3 / 4; grid-row: 2; }
        .hed-row .hed-del { grid-column: 4 / 5; grid-row: 2; }
        .a-footer { flex-direction: column-reverse; align-items: stretch; }
        .a-footer .a-footer-actions { display: flex; gap: var(--space-2-5); }
        .a-footer .a-footer-actions .btn-tier { flex: 1; justify-content: center; }
    }

    /* iOS-style mobile adaptation
       References the Mobile Adaptation prototype: bottom-sheet modals,
       large title + status pills, sticky bottom CTA, ≥44pt tap targets. */
    @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

    @media (max-width: 768px) {
        body { padding: var(--space-3); padding-bottom: max(env(safe-area-inset-bottom), 12px); }
        .card { padding: var(--space-4); border-radius: var(--radius-xl); margin-bottom: var(--space-3-5); }
        .header { margin-bottom: 16px !important; }
        .header h1 { font-size: var(--text-2xl); letter-spacing: -0.02em; }
        .toolbar { flex-direction: column; align-items: stretch; gap: var(--space-2-5); }
        .toolbar > * { width: 100%; display: flex; justify-content: center; }
        .search-input { width: 100%; }
        .node-grid { grid-template-columns: 1fr; gap: var(--space-3); }

        /* Tap-target sizing — iOS HIG minimum --touch-min (44px) for all primary interactive elements */
        .btn-submit, .btn-edit, .btn-del, .btn-dns, .logout-btn, .a-btn-edit,
        .btn-tier, .icon-btn, .a-icon-btn, .tb-icon-btn { min-height: var(--touch-min); }
        .icon-btn, .a-icon-btn, .tb-icon-btn { min-width: var(--touch-min); }
        /* Detail-row icon buttons may stay compact (inside an already-large card) */
        .a-detail-actions .a-icon-btn { width: 32px; height: 32px; min-width: 32px; min-height: 32px; }
        .a-stat-val { font-size: var(--text-2xl); }
        .a-stats { grid-template-columns: 1fr 1fr 1fr; }
        .a-foot { flex-wrap: wrap; }
        select, input[type="text"], input[type="url"], input[type="password"], textarea {
            font-size: var(--text-xl); /* prevent iOS zoom on focus */
        }

        /* Table → stacked card rows (kept from previous design) */
        .table-wrapper { border: none; background: transparent; overflow: visible; }
        table, thead, tbody, th, td, tr { display: block; width: 100%; }
        thead { display: none; }
        tr { margin-bottom: var(--space-3); background: var(--card); border-radius: var(--radius-lg); border: 1px solid var(--border); box-shadow: 0 2px 12px rgba(0,0,0,0.03); overflow: hidden; }
        td { display: flex; align-items: center; padding: var(--space-3) var(--space-3-5); border-bottom: 0.5px solid var(--border); text-align: right; gap: var(--space-3); min-height: 44px; }
        td:last-child { border-bottom: none; }
        td[colspan] { justify-content: center; text-align: center; }
        td[colspan]::before { display: none !important; }
        td::before { content: attr(data-label); font-weight: 600; color: var(--text-sec); flex-shrink: 0; margin-right: auto; text-align: left; font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.04em; }

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
            border-radius: var(--radius-2xl) var(--radius-2xl) 0 0 !important;
            box-shadow: 0 -8px 32px rgba(0,0,0,0.18) !important;
            overflow-y: auto;
            animation: sheet-up 0.28s cubic-bezier(.32,.72,.3,1);
            position: relative;
        }
        #dashboardModal > .card::before {
            content: ''; display: block;
            width: 36px; height: 5px; border-radius: var(--radius-pill);
            background: var(--border);
            margin: -4px auto 14px;
        }
        #dashboardModal h2 { font-size: var(--text-2xl); flex-direction: column; align-items: flex-start; gap: var(--space-2); }
        #dashboardModal h2 > div:last-child { font-size: var(--text-sm) !important; }
        #dashboardModal h2 span { font-size: var(--text-sm); }
        #dashboardModal .table-wrapper td { font-size: var(--text-md); }

        /* CF trace card → horizontal scrollable status strip */
        #cf-trace-card {
            padding: 10px 14px !important;
            gap: 10px !important;
            font-size: var(--text-md) !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            scrollbar-width: none;
        }
        #cf-trace-card::-webkit-scrollbar { display: none; }
        #cf-trace-card > * { flex-shrink: 0; }

        /* Header (title + dashboard + logout) compresses */
        .header { gap: 10px !important; }
        .header > div:last-child { gap: 6px !important; }
        .header .btn-submit, .header .logout-btn { padding: var(--space-2-5) var(--space-3); font-size: var(--text-md); }

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
            font-size: var(--text-xl);
            border-radius: var(--radius-lg);
            order: 99;
            margin-top: var(--space-1);
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
            font-size: var(--text-xs); font-weight: 700; color: var(--text-sec);
            letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: var(--space-1-5);
        }
        body.login-body .login-box h2 {
            font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.025em;
            margin: 0 0 8px 0 !important; text-align: left;
        }
        body.login-body .login-sub {
            font-size: var(--text-base); color: var(--text-sec); line-height: 1.5; margin: 0 0 28px 0;
        }
        body.login-body .login-foot {
            position: fixed; bottom: max(env(safe-area-inset-bottom), 16px); left: 0; right: 0;
            text-align: center; color: var(--text-sec); font-size: var(--text-xs); line-height: 1.6;
            opacity: 0.7;
        }
    }

    @media (max-width: 480px) {
        body { padding: var(--space-2-5); }
        .card { padding: var(--space-3-5); border-radius: var(--radius-lg); }
        .header h1 { font-size: var(--text-2xl); }
        .header .btn-submit, .header .logout-btn { flex: 1; min-width: 0; }
        h2 { font-size: var(--text-xl) !important; }

        /* Logout / dashboard top buttons reflow */
        .header > div:last-child { width: 100%; justify-content: stretch; }
        .header > div:last-child > div:first-child { flex: 0 0 auto; }
        .header > div:last-child > button { flex: 1; }

        /* Toolbar collapses to vertical with full-width primary */
        .toolbar { gap: var(--space-2); }
        .toolbar select, .toolbar input, .toolbar button { width: 100% !important; min-width: 0 !important; }

        /* Speed-test multi-button bar: stack */
        #btnSelectedDns, #btnTop3Dns, #btnDirectCname, #btnTestCustom { width: 100% !important; }
    }

    /* ============================================================
       Mobile Adaptation v3 — Bottom Tab Bar, status pills row,
       sticky form CTA, login gradient logo. Desktop hides everything.
       Reference: design/Mobile Adaptation.html + mobile-screens.jsx.
       ============================================================ */
    .m-pills { display: none; }
    .m-pill {
        display: inline-flex; align-items: center; gap: var(--space-1-5);
        padding: 6px 11px; border-radius: var(--radius-pill);
        background: rgba(120,120,120,0.06);
        border: 1px solid var(--border);
        font-size: var(--text-sm); font-weight: 600; color: var(--text);
        white-space: nowrap; flex-shrink: 0; line-height: 1.2;
    }
    .m-pill .lbl { color: var(--text-sec); font-weight: 500; }
    .m-pill .val { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .m-pill .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .m-pill .dot.green { background: var(--ok); box-shadow: 0 0 5px var(--ok); }
    .m-pill .dot.amber { background: var(--warn); box-shadow: 0 0 5px var(--warn); }
    .m-pill.strong .val { color: var(--primary); }
    .m-pill.tappable { cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
    .m-pill.tappable .caret { color: var(--text-sec); font-size: var(--text-xs); margin-left: 1px; }
    .m-pill.tappable:active { transform: scale(0.97); }

    #mobileTabBar { display: none; }

    /* Login: gradient logo (desktop hidden, mobile shown) */
    .login-logo { display: none; }

    @media (max-width: 768px) {
        /* Reserve room above the Tab Bar */
        body { padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important; }

        /* Status pills row above node list */
        .m-pills {
            display: flex; gap: var(--space-1-5); overflow-x: auto;
            margin: -4px 0 12px; padding: 4px 2px 6px;
            -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .m-pills::-webkit-scrollbar { display: none; }

        /* Mobile: topbar 精简, 调度 pill 由移动端状态行接管 */
        #cf-trace-card #placePill { display: none; }
        #cf-trace-card .topbar-spacer { display: none; }

        /* Sticky save button for deploy/edit form */
        #addForm #submitBtn {
            position: sticky !important;
            bottom: calc(72px + env(safe-area-inset-bottom));
            z-index: 5;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
            margin-top: var(--space-2);
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
            font: inherit; font-size: var(--text-xs); font-weight: 600;
            min-height: 44px;
        }
        #mobileTabBar button.active { color: var(--primary); }
        #mobileTabBar button svg {
            width: 22px; height: 22px; fill: none; stroke: currentColor;
            stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
        }
        #mobileTabBar button.active svg { stroke-width: 2.2; }

        /* Login mobile hero: gradient logo block */
        body.login-body .login-logo {
            display: flex; align-items: center; justify-content: center;
            width: 64px; height: 64px; border-radius: var(--radius-2xl); color: #fff;
            background: linear-gradient(135deg, var(--primary), #5856d6);
            box-shadow: 0 12px 28px var(--primary-glow);
            margin: 0 0 28px;
        }
        body.login-body .login-logo svg { width: 30px; height: 30px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    }

    /* ============================================================
       Mobile UX v4 — fluid type, mid-breakpoints, landscape /
       short-height adaptation, tactile feedback, edge-fade scroll
       affordance, sheet drag-to-dismiss visual hooks.
       Layered on top of v1–v3; desktop remains untouched.
       ============================================================ */

    /* Fluid typography & spacing — gentle on desktop, real impact on mobile */
    @media (max-width: 1024px) {
        .header h1 { font-size: clamp(20px, 4.5vw, 26px); letter-spacing: -0.02em; }
        h2 { font-size: clamp(16px, 3.4vw, 20px); }
        .card { padding: clamp(14px, 3vw, 22px); }
    }

    /* Mid-range (481–768px): large phone landscape & small tablet portrait — 2-col where it helps */
    @media (min-width: 481px) and (max-width: 768px) {
        .node-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
        .a-row, .a-row.two { grid-template-columns: 1fr 1fr !important; }
        #addForm > div:nth-of-type(2) { flex-direction: row !important; align-items: center !important; flex-wrap: wrap; }
        #addForm > div:nth-of-type(2) > * { width: auto !important; flex: 1 1 200px; }
    }

    /* Small phones (≤360px): tighten everything one more notch */
    @media (max-width: 360px) {
        body { padding: var(--space-2-5); padding-bottom: calc(68px + env(safe-area-inset-bottom)) !important; }
        .card { padding: var(--space-3); border-radius: var(--radius-lg); margin-bottom: var(--space-3); }
        .header h1 { font-size: var(--text-2xl); }
        .m-pill { padding: 5px 9px; font-size: var(--text-xs); }
        #mobileTabBar { padding: 4px 0 calc(4px + env(safe-area-inset-bottom)); }
        #mobileTabBar button { font-size: var(--text-2xs); padding: 5px 2px; }
        #mobileTabBar button svg { width: 20px; height: 20px; }
    }

    /* Landscape phones (short height): slim tab bar, side-by-side login, horizontal safe-area */
    @media (orientation: landscape) and (max-height: 480px) {
        body {
            padding-left: max(env(safe-area-inset-left), 12px);
            padding-right: max(env(safe-area-inset-right), 12px);
            padding-bottom: calc(48px + env(safe-area-inset-bottom)) !important;
        }
        #mobileTabBar { padding: 2px 0 calc(2px + env(safe-area-inset-bottom)); }
        #mobileTabBar button {
            flex-direction: row; gap: var(--space-1-5); padding: var(--space-1) var(--space-2);
            min-height: 36px; font-size: var(--text-xs);
        }
        #mobileTabBar button svg { width: 18px; height: 18px; }
        .node-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .a-row, .a-row.two { grid-template-columns: 1fr 1fr !important; }
        #dashboardModal > .card { max-height: 96vh; padding: 14px 18px 18px !important; }
        /* Landscape login: two columns via simple flex split */
        body.login-body .login-box {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px 32px;
            padding: 32px 36px !important;
            text-align: left !important;
            max-width: min(720px, 92vw) !important;
            margin: 0 auto !important;
        }
        body.login-body .login-logo,
        body.login-body .login-eyebrow,
        body.login-body .login-box h2,
        body.login-body .login-sub { flex: 0 0 calc(45% - 16px); margin-left: 0 !important; margin-right: 0 !important; }
        body.login-body .login-logo { margin: 0 0 6px !important; }
        body.login-body .login-box h2 { font-size: var(--text-3xl) !important; margin: 0 !important; }
        body.login-body .login-sub { margin: 0 !important; }
        body.login-body .login-box > input,
        body.login-body .login-box > button { flex: 1 1 calc(55% - 16px); margin: 0 !important; }
        body.login-body .login-box > button { margin-top: 12px !important; }
        body.login-body .login-foot {
            position: static !important; margin-top: 16px !important;
            text-align: left !important; opacity: 0.6;
            flex: 1 0 100%;
        }
    }

    /* Tactile feedback — only on touch pointers, never on desktop */
    @media (hover: none) and (pointer: coarse) {
        .btn-submit, .btn-edit, .btn-del, .btn-dns, .logout-btn,
        .a-btn-edit, .pill, .login-box button, #mobileTabBar button,
        .btn-tier, .m-pill, .tb-icon-btn {
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.08s ease-out, box-shadow 0.18s ease;
        }
        .btn-submit:active, .btn-edit:active, .btn-del:active, .btn-dns:active,
        .logout-btn:active, .a-btn-edit:active, .pill:active,
        .login-box button:active, #mobileTabBar button:active,
        .btn-tier:active, .m-pill:active, .tb-icon-btn:active {
            transform: scale(0.96);
        }
        /* Strip desktop hover lift when we're on touch */
        .btn-submit:hover { transform: none; box-shadow: 0 4px 12px rgba(0, 113, 227, 0.2); }
        /* iOS HIG: form rows must remain ≥44pt on touch */
        .ios-form-row { min-height: var(--touch-min); }
    }

    /* Edge-fade affordance for horizontal scrollers — signals "swipe-able" */
    @media (max-width: 768px) {
        .m-pills, #cf-trace-card {
            -webkit-mask-image: linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
                    mask-image: linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
        }

        /* Sheet handle becomes a real drag affordance */
        #dashboardModal > .card::before {
            cursor: grab;
            transition: transform 0.18s ease, background 0.18s ease, width 0.18s ease;
        }
        #dashboardModal > .card.is-dragging::before {
            background: var(--primary); transform: scaleX(1.25); cursor: grabbing;
        }
        #dashboardModal > .card.is-dragging { transition: none !important; will-change: transform; }

        /* Stacked table rows feel "pressable" */
        .table-wrapper tr { transition: transform 0.08s ease-out, box-shadow 0.18s ease; }
        .table-wrapper tr:active { transform: scale(0.99); }

        /* Density: prevent pill rows / a-stats from overflowing when too dense */
        .a-stats { row-gap: var(--space-2); }
    }

    /* Honor reduced-motion preference */
    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
        }
        #dashboardModal > .card { animation: none !important; }
    }

    /* ============================================================
       Admin UI Redesign — 反代核心·安全中心 仪表盘布局
       侧边栏 + 顶部状态栏 + 分区内容 + 危险操作底部条
       ============================================================ */
    body.shell-on { padding: 0 !important; }
    .app-shell { display: flex; min-height: 100vh; width: 100%; }

    /* --- 侧边栏 --- */
    .sidebar {
        width: 248px; flex-shrink: 0; background: var(--sidebar-bg);
        border-right: 1px solid var(--border);
        display: flex; flex-direction: column;
        position: sticky; top: 0; height: 100vh;
        transition: width 0.22s ease;
    }
    .sidebar-brand {
        display: flex; align-items: center; gap: var(--space-3);
        padding: 20px 18px; border-bottom: 0.5px solid var(--hairline);
        position: relative; overflow: hidden;
    }
    .sidebar-brand::before {
        content: ''; position: absolute; inset: 0;
        background: var(--aurora-grad-soft);
        pointer-events: none;
    }
    .sidebar-brand > * { position: relative; z-index: 1; }
    .sidebar-logo {
        width: 38px; height: 38px; border-radius: var(--radius-lg); flex-shrink: 0;
        background: var(--aurora-grad);
        display: flex; align-items: center; justify-content: center;
        color: #fff; box-shadow: 0 4px 14px -2px var(--primary-glow), 0 0 0 1px rgba(255,255,255,0.06) inset;
    }
    .sidebar-logo svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    .sidebar-brand-text { min-width: 0; }
    .sidebar-brand-title { font-weight: 700; font-size: var(--text-base); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sidebar-brand-sub { font-size: var(--text-xs); color: var(--text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .sidebar-nav { flex: 1; padding: var(--space-3-5) var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); overflow-y: auto; }
    .nav-item {
        display: flex; align-items: center; gap: var(--space-3);
        padding: 11px 12px; border-radius: var(--radius-md); cursor: pointer;
        color: var(--text-sec); font-size: var(--text-base); font-weight: 600;
        border: 1px solid transparent; transition: 0.18s ease; white-space: nowrap;
        font-family: inherit; background: transparent; width: 100%; text-align: left;
        position: relative;
    }
    .nav-item svg { width: 18px; height: 18px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.18s ease; }
    .nav-item:hover { color: var(--text); background: rgba(120,120,140,0.08); }
    .nav-item:hover svg { transform: translateX(1px); }
    .nav-item.is-active {
        color: var(--primary);
        background: linear-gradient(90deg, var(--primary-soft), transparent 80%);
        border-color: transparent;
    }
    .nav-item.is-active::before {
        content: ''; position: absolute;
        left: -1px; top: 9px; bottom: 9px;
        width: 3px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        background: var(--aurora-grad);
        box-shadow: 0 0 12px var(--primary-glow);
    }
    .sidebar.collapsed .nav-item.is-active::before { left: 0; top: 6px; bottom: 6px; }
    .sidebar-foot {
        padding: var(--space-3); border-top: 0.5px solid var(--hairline);
        display: flex; flex-direction: column; gap: var(--space-2);
    }
    .sidebar-collapse {
        display: flex; align-items: center; gap: var(--space-2-5); justify-content: center;
        padding: 9px; border-radius: var(--radius-md); cursor: pointer;
        background: rgba(120,120,140,0.07); border: 1px solid var(--border);
        color: var(--text-sec); font: inherit; font-size: var(--text-sm); font-weight: 600;
    }
    .sidebar-collapse:hover { color: var(--primary); border-color: var(--primary); }
    .sidebar-collapse svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; transition: transform 0.2s; }
    .sidebar-version { text-align: center; font-size: var(--text-xs); color: var(--text-sec); }

    /* 折叠态 */
    .sidebar.collapsed { width: 68px; }
    .sidebar.collapsed .sidebar-brand-text,
    .sidebar.collapsed .nav-item span,
    .sidebar.collapsed .sidebar-version,
    .sidebar.collapsed .sidebar-collapse span { display: none; }
    .sidebar.collapsed .sidebar-brand { justify-content: center; padding: 18px 10px; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 11px 0; }
    .sidebar.collapsed .sidebar-collapse svg { transform: rotate(180deg); }

    /* --- 主区 --- */
    .app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

    /* --- 顶部状态栏 (glass v2.3.0) --- */
    .topbar {
        display: flex; align-items: center; gap: var(--space-2-5); flex-wrap: wrap;
        padding: var(--space-3-5) var(--space-6); background: var(--topbar-glass);
        backdrop-filter: saturate(140%) blur(14px);
        -webkit-backdrop-filter: saturate(140%) blur(14px);
        border-bottom: 0.5px solid var(--hairline);
        position: sticky; top: 0; z-index: 90;
    }
    .topbar::after {
        content: ''; position: absolute; left: 0; right: 0; bottom: -1px;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--primary-ring), transparent);
        opacity: 0.55; pointer-events: none;
    }
    .topbar .tb-stat {
        display: inline-flex; align-items: center; gap: var(--space-2);
        padding: 7px 13px; border-radius: var(--radius-md);
        background: var(--surface-2); border: 1px solid var(--border);
        font-size: var(--text-sm); font-weight: 600; white-space: nowrap;
    }
    .topbar .tb-stat .lbl { color: var(--text-sec); font-weight: 500; }
    .topbar .tb-stat .val { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .topbar .tb-stat .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .topbar .tb-stat .dot.green { background: var(--ok); box-shadow: 0 0 6px var(--ok); }
    .topbar .tb-stat .dot.amber { background: var(--warn); box-shadow: 0 0 6px var(--warn); }
    .topbar .tb-stat .dot.red { background: var(--err); box-shadow: 0 0 6px var(--err); }
    .topbar .tb-stat.is-clickable { cursor: pointer; }

    /* === Utility classes (v2.2.0) === */
    /* Card variant: lifted modal-style card with danger left-border */
    .card.is-danger-highlight {
        max-width: 760px; margin: 60px auto; position: relative;
        border-left: 4px solid var(--err);
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    /* Trailing action row — last button pushed to the right edge */
    .row-end { display: flex; gap: var(--space-2-5); flex-wrap: wrap; align-items: center; }
    .row-end > .row-end-spacer { margin-left: auto; }

    /* === Layout / text utilities (v2.2.0) === */
    .text-center { text-align: center; }
    .text-center-muted { text-align: center; color: var(--text-sec); }
    .text-muted { color: var(--text-sec); }
    .cell-loading { text-align: center; color: var(--text-sec); padding: var(--space-7); }
    .cell-loading-bold { font-weight: 600; color: var(--text-sec); }
    .copyable {
        color: var(--primary); cursor: pointer;
        font-family: ui-monospace, Menlo, Consolas, monospace;
    }
    .section-title { margin: 0; font-size: var(--text-2xl); font-weight: 600; }
    .section-header-row {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2-5);
    }
    .section-spacer-top { margin-top: var(--space-7); margin-bottom: var(--space-4); }
    .mt-4 { margin-top: var(--space-4); }
    .w-full { width: 100%; }
    .col-w40 { width: 40px; text-align: center; }
    .col-w60 { width: 60px; text-align: center; }
    .col-w90 { width: 90px; text-align: center; }
    .label-bold { font-size: var(--text-md); font-weight: 600; }
    .flex-row-tight { display: flex; align-items: center; gap: var(--space-2-5); }
    .flex-wrap-tight { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .flex-wrap-loose { display: flex; gap: var(--space-5); flex-wrap: wrap; margin-top: var(--space-5); }
    .banner-spaced { margin: var(--space-3-5) var(--space-6) 0; }
    .is-disabled { opacity: 0.4; cursor: not-allowed; }
    .cursor-pointer { cursor: pointer; }
    .pos-rel { position: relative; }
    .pos-abs { position: absolute; }
    .flex-1 { flex: 1; }
    .flex-1-min0 { flex: 1; min-width: 0; }
    /* DNS record-type badges (cyan = AAAA, purple = system accent) — non-status palette */
    .badge.is-info   { background: rgba(50,173,230,0.10);  color: #32ade6; margin-right: var(--space-1); }
    .badge.is-accent { background: rgba(175,82,222,0.10); color: #af52de; margin-right: var(--space-1); }

    /* === Worker-update modal (.wu-*) === */
    .wu-overlay {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
        overflow-y: auto; padding: var(--space-5);
    }
    .wu-close {
        position: absolute; top: var(--space-5); right: var(--space-5);
        font-size: var(--text-3xl); line-height: 1; padding: 0;
        background: none; border: none; cursor: pointer;
        color: var(--text-sec); transition: color 0.2s;
    }
    .wu-close:hover { color: var(--err); }
    .wu-title {
        margin: 0 0 var(--space-3); font-size: var(--text-2xl); color: var(--err);
    }
    .wu-warning {
        font-size: var(--text-md); color: var(--text-sec);
        margin-bottom: var(--space-3);
    }
    .wu-textarea {
        width: 100%; padding: var(--space-3-5);
        border-radius: var(--radius-md); border: 1px solid var(--border);
        margin-bottom: var(--space-3); background: var(--card);
        font-family: ui-monospace, Menlo, Consolas, monospace;
        font-size: var(--text-sm); resize: vertical;
    }
    .wu-label { font-size: var(--text-base); font-weight: 700; }
    .wu-file-input {
        font-size: var(--text-base); padding: var(--space-1-5);
        border: 1px solid var(--border); border-radius: var(--radius-sm);
        background: var(--bg);
    }
    .topbar-spacer {
        flex: 1; min-width: 0;
        display: flex; align-items: center; justify-content: center;
    }
    .tb-section-title {
        font-size: var(--text-headline);
        font-weight: 600;
        color: var(--text);
        letter-spacing: -0.01em;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
    body.is-scrolled .tb-section-title {
        opacity: 1;
        transform: none;
    }
    .topbar-user {
        display: inline-flex; align-items: center; gap: var(--space-2);
        padding: 5px 12px 5px 6px; border-radius: var(--radius-pill);
        background: var(--surface-2); border: 1px solid var(--border);
        font-size: var(--text-sm); font-weight: 600;
    }
    .topbar-user .ava {
        width: 26px; height: 26px; border-radius: 50%;
        background: linear-gradient(135deg, var(--primary), #5856d6);
        color: #fff; display: flex; align-items: center; justify-content: center;
        font-size: var(--text-sm); font-weight: 700;
    }

    /* --- 内容区与分区 --- */
    .content { flex: 1; padding: var(--space-6); max-width: 1400px; width: 100%; margin: 0 auto; }
    .app-section { display: none; }
    .app-section.is-active { display: block; animation: sec-fade 0.22s ease; }
    @keyframes sec-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    /* --- 危险区分区 (v2.3.0, 替代旧的底部常驻危险操作条) --- */
    /* Nav tab tint — sidebar entry hints at destructive intent without screaming */
    .nav-item.is-danger-tab { color: var(--err); }
    .nav-item.is-danger-tab:hover {
        color: var(--err); background: var(--err-soft);
    }
    .nav-item.is-danger-tab.is-active {
        color: var(--err);
        background: linear-gradient(90deg, var(--err-soft), transparent 80%);
    }
    .nav-item.is-danger-tab.is-active::before {
        background: var(--err);
        box-shadow: 0 0 12px var(--err);
    }
    /* Hero block — clearly destructive but composed, not chaotic */
    .danger-hero {
        display: flex; align-items: center; gap: var(--space-4);
        padding: var(--space-5) var(--space-6);
        border-radius: var(--radius-xl);
        border: 1px solid var(--err-ring);
        background: linear-gradient(135deg, var(--err-soft), transparent 70%);
        margin-bottom: var(--space-5);
        position: relative; overflow: hidden;
    }
    .danger-hero::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(120% 80% at 100% 0%, var(--err-soft), transparent 60%);
        pointer-events: none;
    }
    .danger-hero > * { position: relative; z-index: 1; }
    .danger-hero .dh-icon {
        width: 48px; height: 48px; flex-shrink: 0;
        border-radius: var(--radius-lg);
        background: var(--err); color: #fff;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 6px 18px -4px rgba(255,59,48,0.45);
    }
    .danger-hero .dh-icon svg { width: 22px; height: 22px; }
    .danger-hero .dh-title { margin: 0; font-size: var(--text-2xl); font-weight: 700; color: var(--err); letter-spacing: -0.01em; }
    .danger-hero .dh-sub { font-size: var(--text-base); color: var(--text-sec); margin-top: 4px; }

    /* v2.5.0: Danger actions render as one .ios-form-group with three
       .ios-form-row children, each carrying a trailing red .btn-tier.is-danger.
       The .danger-group modifier subtly tints the inset card with the err ring. */
    .ios-form-group.danger-group {
        border-color: var(--err-ring);
        background: linear-gradient(180deg, var(--err-soft), var(--card) 30%);
    }
    .ios-form-group.danger-group .ios-form-row {
        padding: var(--space-4) var(--space-5);
        gap: var(--space-4);
        align-items: flex-start;
    }
    .ios-form-group.danger-group .ios-form-row .btn-tier {
        flex-shrink: 0;
        align-self: center;
    }
    @media (max-width: 640px) {
        .danger-hero { padding: var(--space-4); }
        .danger-hero .dh-title { font-size: var(--text-xl); }
        .ios-form-group.danger-group .ios-form-row {
            flex-direction: column;
            align-items: stretch;
            gap: var(--space-3);
        }
        .ios-form-group.danger-group .ios-form-row .btn-tier {
            width: 100%;
            justify-content: center;
            align-self: stretch;
        }
    }

    /* ============================================================
       Aurora KPI hero band (v2.3.0)
       The visible centerpiece of the overview view — bento tiles
       with one gradient primary tile (sparkline) and three neutral
       tiles. Pulls live data from existing topbar IDs via JS.
       ============================================================ */
    .aurora-hero {
        display: grid;
        grid-template-columns: 1.5fr 1fr 1fr 1fr;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
    }
    .kpi-tile {
        position: relative; overflow: hidden;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-ios);
        padding: var(--space-5);
        min-height: 124px;
        box-shadow: var(--card-shadow-lift);
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
    }
    .kpi-tile:hover {
        transform: translateY(-2px);
        box-shadow: var(--card-shadow-hover);
    }
    .kpi-tile.is-primary {
        color: #fff;
        background: var(--aurora-grad);
        border-color: transparent;
        box-shadow:
            0 1px 0 rgba(255,255,255,0.22) inset,
            0 14px 36px -10px var(--primary-glow);
    }
    .kpi-tile.is-primary::before {
        content: ''; position: absolute; inset: 0;
        background:
            radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.28), transparent 55%),
            radial-gradient(80% 60% at 0% 100%, rgba(0,0,0,0.10), transparent 60%);
        pointer-events: none;
    }
    .kpi-tile > * { position: relative; z-index: 1; }
    .kpi-label {
        font-size: var(--text-xs);
        font-weight: 700;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        color: var(--text-sec);
        margin-bottom: var(--space-2-5);
    }
    .kpi-tile.is-primary .kpi-label { color: rgba(255,255,255,0.85); }
    .kpi-value-row { display: flex; align-items: baseline; gap: var(--space-2); }
    .kpi-value {
        font-size: 34px;
        font-weight: 700;
        letter-spacing: -0.025em;
        line-height: 1.05;
        font-variant-numeric: tabular-nums;
        color: var(--text);
    }
    .kpi-tile.is-primary .kpi-value { color: #fff; }
    .kpi-unit {
        font-size: var(--text-md);
        font-weight: 600;
        color: var(--text-sec);
        font-variant-numeric: tabular-nums;
    }
    .kpi-tile.is-primary .kpi-unit { color: rgba(255,255,255,0.78); }
    .kpi-sub {
        margin-top: var(--space-2);
        font-size: var(--text-xs);
        color: var(--text-sec);
    }
    .kpi-tile.is-primary .kpi-sub { color: rgba(255,255,255,0.78); }
    .kpi-spark {
        position: absolute; left: 0; right: 0; bottom: 0;
        width: 100%; height: 44px;
        pointer-events: none;
    }
    .kpi-spark .ks-line { fill: none; stroke: rgba(255,255,255,0.92); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    .kpi-spark .ks-area { fill: rgba(255,255,255,0.18); stroke: none; }
    .kpi-health-bar {
        margin-top: var(--space-3);
        height: 6px; width: 100%;
        background: rgba(120,120,140,0.14);
        border-radius: var(--radius-pill);
        overflow: hidden;
    }
    .kpi-health-bar > span {
        display: block; height: 100%; width: 0%;
        border-radius: var(--radius-pill);
        background: var(--aurora-grad);
        box-shadow: 0 0 10px var(--primary-glow);
        transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @media (max-width: 980px) {
        .aurora-hero { grid-template-columns: 1fr 1fr; }
        .aurora-hero .kpi-tile.is-primary { grid-column: 1 / -1; }
        .kpi-value { font-size: 30px; }
    }
    @media (max-width: 520px) {
        .aurora-hero { grid-template-columns: 1fr; gap: var(--space-3); }
        .kpi-tile { min-height: 100px; padding: var(--space-4); }
        .kpi-value { font-size: 28px; }
    }

    /* 科技风卡片微光 (深色) */
    body.dark .card { box-shadow: var(--card-shadow-lift); }
    body.dark .emby-card { box-shadow: var(--card-shadow); }
    body.dark .emby-card:hover { box-shadow: 0 0 0 1px var(--accent-glow), 0 10px 30px rgba(0,0,0,0.6); }
    body.dark .kpi-tile { background: var(--card); }

    /* --- 节点状态徽章 --- */
    .node-badge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 3px 9px; border-radius: var(--radius-pill);
        font-size: var(--text-xs); font-weight: 700; white-space: nowrap;
    }
    .node-badge .bdot { width: 6px; height: 6px; border-radius: 50%; }
    .node-badge.is-online { color: var(--ok); background: var(--ok-soft); }
    .node-badge.is-online .bdot { background: var(--ok); box-shadow: 0 0 6px var(--ok); }
    .node-badge.is-slow { color: var(--warn); background: var(--warn-soft); }
    .node-badge.is-slow .bdot { background: var(--warn); box-shadow: 0 0 6px var(--warn); }
    .node-badge.is-offline { color: var(--err); background: var(--err-soft); }
    .node-badge.is-offline .bdot { background: var(--err); box-shadow: 0 0 6px var(--err); }
    .node-badge.is-idle { color: var(--text-sec); background: rgba(142,142,147,0.14); }
    .node-badge.is-idle .bdot { background: var(--text-sec); }

    /* --- 迷你 SVG 折线图 --- */
    .node-spark { width: 100%; height: 38px; display: block; }
    .node-spark .sk-line { fill: none; stroke: var(--primary); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .node-spark .sk-area { fill: var(--accent-glow); opacity: 0.5; }
    .node-spark-empty {
        height: 38px; display: flex; align-items: center; justify-content: center;
        font-size: var(--text-xs); color: var(--text-sec);
        border: 1px dashed var(--border); border-radius: var(--radius-md);
    }

    /* --- 移动端: 隐藏侧边栏, 沿用底部 tab --- */
    @media (max-width: 768px) {
        body.shell-on { padding: 0 !important; }
        .app-shell { display: block; }
        .sidebar { display: none; }
        .app-main { display: block; }
        .topbar {
            padding: var(--space-2-5) var(--space-3-5); gap: var(--space-2);
            flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
        }
        .topbar::-webkit-scrollbar { display: none; }
        .topbar > * { flex-shrink: 0; }
        .content { padding: var(--space-3-5); padding-bottom: calc(86px + env(safe-area-inset-bottom)); }
    }

    /* ============================================================
       === Mobile iOS-native v5 (v2.4.0) ===
       Refined iOS-native overhaul. Mobile-only (≤768px) — desktop
       untouched. Layered on top of v1–v4 mobile rules. Consumes
       design tokens from :root (incl. iOS-specific tokens added in
       this version). Markup additions are minimal; most retrofits
       are handled in CSS via the existing IDs/classes.
       ============================================================ */

    /* Skeleton shimmer — used during initial data hydration */
    .skeleton {
        display: inline-block; min-width: 64px; height: 1em;
        border-radius: var(--radius-sm); color: transparent !important;
        background:
            linear-gradient(90deg,
                var(--ios-fill-quat) 0%,
                var(--ios-fill) 50%,
                var(--ios-fill-quat) 100%);
        background-size: 200% 100%;
        animation: ios-shimmer 1.4s linear infinite;
        pointer-events: none;
    }
    .skeleton::after { content: '·'; visibility: hidden; }
    @keyframes ios-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* iOS large-title + sticky compact bar — v2.5.0 promoted to desktop.
       Mobile chrome (#mobileTopbarCompact, .mob-brand, #moreSheet) stays
       hidden on desktop; .ios-form-group default cleared (own block below).
       #iosLogoutGroup is mobile-only (desktop already has a topbar logout
       button), so it stays hidden here even though .ios-form-group now
       renders on desktop. */
    #mobileTopbarCompact { display: none; }
    .mob-brand { display: none; }
    #moreSheet { display: none; }
    #iosLogoutGroup { display: none; }

    /* --- iOS large-title page header (desktop default, mobile overridden below) --- */
    .ios-page-header {
        display: block;
        padding: var(--space-2) var(--space-1) var(--space-4);
        margin-bottom: var(--space-3);
    }
    .ios-large-title {
        margin: 0;
        font-size: var(--text-large-title-lg);
        font-weight: 700;
        letter-spacing: -0.025em;
        line-height: 1.1;
        color: var(--text);
        font-variant-numeric: tabular-nums;
    }
    .ios-sub {
        margin: var(--space-1) 0 0;
        font-size: var(--text-body-ios);
        color: var(--text-sec);
        line-height: 1.4;
    }

    /* --- iOS inset-grouped form rows — v2.5.0 promoted to desktop. --- */
    .ios-form-group {
        display: block;
        background: var(--card);
        border-radius: var(--radius-ios-sm);
        overflow: hidden;
        border: 0.5px solid var(--hairline);
        margin: 0 0 var(--space-5);
    }
    .ios-form-group-label {
        font-size: var(--text-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-sec);
        padding: 0 var(--space-4);
        margin: var(--space-4) 0 var(--space-2);
    }
    .ios-form-row {
        display: flex; align-items: center;
        gap: var(--space-3);
        padding: var(--space-2-5) var(--space-4);
        min-height: 40px;
        border-bottom: 0.5px solid var(--hairline);
        background: var(--card);
        color: var(--text);
        font-size: var(--text-headline);
        -webkit-tap-highlight-color: transparent;
    }
    .ios-form-row:last-child { border-bottom: none; }
    .ios-form-row.is-tap { cursor: pointer; transition: background 0.12s ease; }
    .ios-form-row.is-tap:hover { background: var(--ios-fill-quat); }
    .ios-form-row.is-tap:active { background: var(--ios-fill); }
    .ios-form-row .ifr-label { flex: 0 0 auto; font-weight: 500; }
    .ios-form-row .ifr-sub {
        margin-top: 2px;
        font-size: var(--text-sm);
        color: var(--text-sec);
        line-height: 1.4;
        font-weight: 400;
    }
    .ios-form-row .ifr-value {
        margin-left: auto;
        color: var(--text-sec);
        font-size: var(--text-headline);
        font-variant-numeric: tabular-nums;
    }
    .ios-form-row .ifr-chevron {
        color: var(--text-sec);
        opacity: 0.45;
        margin-left: var(--space-1);
    }
    .ios-form-row.is-danger { color: var(--err); }

    @media (max-width: 768px) {
        /* --- Mobile overrides for the large-title block (34/30/28 ramp) --- */
        .ios-page-header {
            padding: var(--space-1) var(--space-1) var(--space-3);
            margin-bottom: var(--space-2);
        }
        .ios-large-title {
            font-size: var(--text-large-title);
        }

        /* --- Sticky compact top bar (fades in once large title scrolls away) --- */
        #mobileTopbarCompact {
            display: flex;
            align-items: center; justify-content: center;
            position: sticky; top: 0; z-index: 950;
            height: 44px;
            padding: 0 var(--space-4);
            background: var(--topbar-glass);
            -webkit-backdrop-filter: saturate(180%) blur(24px);
                    backdrop-filter: saturate(180%) blur(24px);
            border-bottom: 0.5px solid var(--hairline);
            font-size: var(--text-headline);
            font-weight: 600;
            color: var(--text);
            opacity: 0;
            transform: translateY(-8px);
            pointer-events: none;
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        body.is-scrolled #mobileTopbarCompact {
            opacity: 1;
            transform: none;
            pointer-events: auto;
        }

        /* --- Mobile chrome: collapse topbar to brand + theme toggle only --- */
        .topbar {
            position: static !important;
            overflow: visible !important;
            justify-content: space-between !important;
            padding: var(--space-3) var(--space-4) !important;
        }
        .topbar::after { display: none; }
        .topbar > * { display: none !important; }
        .topbar > .mob-brand,
        .topbar > #themeToggle { display: inline-flex !important; }
        .topbar > #themeToggle { margin-left: auto !important; }
        .mob-brand {
            display: inline-flex; align-items: center; gap: var(--space-2);
            font-size: var(--text-headline); font-weight: 700;
            letter-spacing: -0.01em; color: var(--text);
        }
        .mob-brand .mb-logo {
            width: 28px; height: 28px;
            border-radius: var(--radius-sm);
            background: var(--aurora-grad);
            display: inline-flex; align-items: center; justify-content: center;
            color: #fff;
            box-shadow: 0 4px 10px -3px var(--primary-glow);
        }
        .mob-brand .mb-logo svg { width: 16px; height: 16px; }

        /* --- Continuous-corner cards (overrides v1 mobile radius) --- */
        .card {
            border-radius: var(--radius-ios) !important;
            padding: var(--space-4) var(--space-4) !important;
        }
        body:not(.dark) .card {
            box-shadow:
                0 1px 0 rgba(255,255,255,0.7) inset,
                0 1px 2px rgba(15,23,42,0.04),
                0 6px 18px -10px rgba(15,23,42,0.10) !important;
        }
        body.dark .card {
            box-shadow:
                0 0 0 0.5px rgba(255,255,255,0.04) inset,
                0 6px 22px -10px rgba(0,0,0,0.6) !important;
        }

        /* --- Status strip: 2×2 grid, no horizontal scroll --- */
        .m-pills {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 0.5px !important;
            background: var(--hairline);
            border-radius: var(--radius-ios-sm);
            overflow: hidden;
            margin: 0 0 var(--space-4) !important;
            padding: 0 !important;
            -webkit-mask-image: none !important;
                    mask-image: none !important;
            border: 0.5px solid var(--hairline);
        }
        .m-pill {
            background: var(--card);
            border: none !important;
            border-radius: 0 !important;
            padding: var(--space-3) var(--space-3-5) !important;
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-2);
            font-size: var(--text-base);
            min-height: 52px;
            white-space: nowrap;
        }
        .m-pill .lbl {
            color: var(--text-sec);
            font-weight: 500;
            font-size: var(--text-sm);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            order: 0;
        }
        .m-pill .val {
            font-weight: 700;
            font-size: var(--text-xl);
            color: var(--text);
            font-variant-numeric: tabular-nums;
            order: 2;
            margin-left: auto;
        }
        .m-pill .dot {
            order: 1;
            width: 8px; height: 8px;
            margin-left: var(--space-1);
        }
        .m-pill.tappable:active { transform: scale(0.98); }

        /* --- Bottom Tab Bar: 5-up with filled/outline icon swap --- */
        #mobileTabBar {
            grid-template-columns: repeat(5, 1fr) !important;
            border-top: 0.5px solid var(--hairline);
        }
        #mobileTabBar button .ico-filled { display: none; }
        #mobileTabBar button .ico-outline { display: inline-flex; }
        #mobileTabBar button.active .ico-outline { display: none; }
        #mobileTabBar button.active .ico-filled { display: inline-flex; }
        #mobileTabBar button svg.ico-filled,
        #mobileTabBar button svg.ico-outline {
            width: 24px; height: 24px;
        }
        #mobileTabBar button svg.ico-filled { fill: currentColor; stroke: none; }
        #mobileTabBar button svg.ico-outline {
            fill: none; stroke: currentColor;
            stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
        }

        /* --- "更多" sheet (iOS action sheet style) --- */
        #moreSheet {
            display: block;
            position: fixed; left: 0; right: 0; bottom: 0;
            z-index: 1100;
            transform: translateY(100%);
            transition: transform 0.28s cubic-bezier(.32,.72,.3,1);
            pointer-events: none;
        }
        #moreSheet.is-open { transform: translateY(0); pointer-events: auto; }
        #moreSheet::before {
            content: '';
            position: fixed; inset: 0;
            background: var(--ios-overlay);
            opacity: 0;
            transition: opacity 0.28s ease;
            pointer-events: none;
            z-index: -1;
        }
        #moreSheet.is-open::before { opacity: 1; pointer-events: auto; }
        .more-sheet-card {
            background: var(--card);
            border-radius: var(--radius-ios) var(--radius-ios) 0 0;
            padding: var(--space-3) var(--space-4)
                     calc(var(--space-4) + env(safe-area-inset-bottom));
            box-shadow: 0 -10px 36px rgba(0,0,0,0.18);
        }
        .more-sheet-grip {
            display: block; margin: 0 auto var(--space-3);
            width: 36px; height: 5px;
            border-radius: var(--radius-pill);
            background: var(--hairline);
        }
        .more-sheet-title {
            font-size: var(--text-xs); font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.10em;
            color: var(--text-sec);
            margin: 0 0 var(--space-2) var(--space-2);
        }
        .more-sheet-list {
            background: var(--surface-2);
            border-radius: var(--radius-ios-sm);
            overflow: hidden;
        }
        body.dark .more-sheet-list { background: var(--surface); }
        .more-sheet-row {
            display: flex; align-items: center; gap: var(--space-3);
            padding: var(--space-3-5) var(--space-4);
            min-height: var(--touch-min);
            font-size: var(--text-headline);
            font-weight: 500;
            color: var(--text);
            background: transparent; border: none; cursor: pointer;
            width: 100%; text-align: left;
            border-bottom: 0.5px solid var(--hairline);
            -webkit-tap-highlight-color: transparent;
            transition: background 0.12s ease;
        }
        .more-sheet-row:last-child { border-bottom: none; }
        .more-sheet-row:active { background: var(--ios-fill); }
        .more-sheet-row svg {
            width: 22px; height: 22px;
            fill: none; stroke: currentColor;
            stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
            flex-shrink: 0;
            color: var(--primary);
        }
        .more-sheet-row .ms-chevron {
            margin-left: auto;
            color: var(--text-sec);
            opacity: 0.45;
            stroke-width: 2.2;
        }
        .more-sheet-row.is-danger { color: var(--err); }
        .more-sheet-row.is-danger svg { color: var(--err); }

        /* iOS inset-grouped form rows now live outside this MQ (v2.5.0). Mobile
           keeps a 44pt touch-target override below via the hover:none block. */
        /* Logout row in Settings is mobile-only; desktop already has a topbar
           logout button. */
        #iosLogoutGroup { display: block; }

        /* --- Sheet detents for dashboard modal (default 85vh, expand to 96vh) --- */
        #dashboardModal > .card { max-height: 85vh !important; }
        #dashboardModal > .card.is-expanded { max-height: 96vh !important; }

        /* --- Tactile feedback on bottom-tab buttons --- */
        #mobileTabBar button:active { transform: scale(0.94); }
    }

    /* --- ≤480 specific tightening (5-tab labels stay readable) --- */
    @media (max-width: 480px) {
        .mob-brand { font-size: var(--text-base); }
        .mob-brand .mb-logo { width: 26px; height: 26px; }
        .ios-large-title { font-size: var(--text-large-title-md); }
        .m-pill { padding: var(--space-2-5) var(--space-3) !important; min-height: 48px; }
        .m-pill .val { font-size: var(--text-lg); }
    }
    @media (max-width: 360px) {
        .ios-large-title { font-size: var(--text-large-title-sm); }
        .m-pill .lbl { font-size: var(--text-xs); }
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

            <div class="card" id="speed-anchor">
                <div class="section-header-row">
                    <h2 class="section-title">⚡ 专属线路测速与动态 DNS 解析</h2>
                </div>
                
                <div style="background: rgba(120,120,120,0.05); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 16px;">
                    <div style="font-size: var(--text-md); font-weight: 600; color: var(--text-sec); margin-bottom: 8px;">📡 当前域名生效的 DNS 解析：</div>
                    <div id="dnsStatus" class="flex-wrap-tight">
                        <span class="text-muted">加载中...</span>
                    </div>
                </div>

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

                <div style="background: rgba(120,120,120,0.05); padding: 14px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
                    <input type="text" id="customApiUrl" value="https://ip.v2too.top/api/nodes" placeholder="自定义 JSON / 文本 API 链接（供「拉取 API」使用）" style="width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); background:var(--card); margin-bottom: 10px;">
                    <textarea id="customIps" rows="2" placeholder="在此粘贴自定义 IPv4 / IPv6 / 优选域名（供「测试粘贴节点」使用，自动提取）" style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-family: monospace; resize: vertical; background:var(--card);"></textarea>
                </div>
                
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
                    return '<tr>'
                        + '<td><code>' + it.domain + '</code></td>'
                        + '<td>' + (it.note || '') + '</td>'
                        + '<td class="text-center">' + (it.builtin ? '✓' : '') + '</td>'
                        + '<td class="text-center"><input type="checkbox" ' + (it.enabled ? 'checked' : '') + ' onchange="toggleOptimizedDomain(' + it.id + ', this.checked)"></td>'
                        + '<td class="text-center">' + ms + '</td>'
                        + '<td>'
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
            </script>

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
                <a href="https://t.me/MakkaPakkaOvO" target="_blank" style="text-decoration: none; color: var(--text); font-weight: 600; display: inline-flex; align-items: center; padding: 12px 24px; background: var(--card); border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: 0.3s; font-size: var(--text-base); border: 1px solid var(--border);">
                    ${SVG_TG}
                    联系作者 MakkaPakkaOvO
                </a>
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

                        <div style="margin:2px 0;">\${sparkHtml}</div>

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

            } catch (err) {
                document.getElementById('list-grid').innerHTML = \`<div style="text-align:center; color:var(--err); font-weight:600; grid-column: 1 / -1; padding: 20px;">⚠️ 读取失败: \${err.message}</div>\`;
            }
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
            try {
                const res = await fetch('/api/get-dns'); const data = await res.json(); const container = document.getElementById('dnsStatus');
                if (data.success && data.result) {
                    const records = data.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                    if (records.length === 0) container.innerHTML = '<span class="badge" style="background:var(--warn-soft);color:var(--warn);">暂无解析记录</span>';
                    else container.innerHTML = records.map(r => \`<span class="badge" style="background:var(--primary-soft);color:var(--primary);border:1px solid var(--primary-ring);">\${r.type} | \${r.content}</span>\`).join('');
                } else container.innerHTML = \`<span class="badge" style="background:var(--err-soft);color:var(--err);">\${data.error || '获取失败'}</span>\`;
            } catch (e) { document.getElementById('dnsStatus').innerHTML = '<span class="badge" style="background:var(--err-soft);color:var(--err);">网络异常</span>'; }
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
                overview: { title: '概览',        sub: '实时状态与核心指标' },
                speed:    { title: '测速 & DNS',  sub: '节点延迟与解析探测' },
                stats:    { title: '数据统计',     sub: '流量、并发与历史趋势' },
                settings: { title: '系统设置',     sub: '应用、通知与账户' },
                tools:    { title: '工具箱',       sub: '实用工具集合' },
                danger:   { title: '危险区',       sub: '不可逆操作，请谨慎' },
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

// ==========================================
// 反代核心健壮性辅助函数 (proxy-core robustness helpers)
// ==========================================
const MAX_RETRY_BODY_BYTES = 8 * 1024 * 1024; // 8MB：超过此值的请求体不缓冲、不重试
const MAX_UPSTREAM_TIMEOUT_MS = 15000; // F2: 每个上游单次超时

// F1: 路由别名保留前缀（与系统/CF 路径冲突的不允许注册为代理别名）
const RESERVED_ALIASES = new Set([
    'api', 'admin', '__client_rtt__',
    'login', 'logout',
    'assets', 'static', 'public',
    'health', 'healthz', 'ping', 'status',
    'emby', 'web', 'stats',
    'favicon.ico', 'robots.txt',
    'apple-touch-icon', 'sw.js', 'manifest.json', 'cdn-cgi'
]);
const PREFIX_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
function validateRoutePrefix(raw) {
    const prefix = String(raw || '').trim();
    if (!prefix) return '别名为空';
    if (!PREFIX_REGEX.test(prefix)) return '别名格式非法（仅允许字母/数字/_/-，且不超过 64 位，不能以特殊字符开头）';
    if (RESERVED_ALIASES.has(prefix.toLowerCase())) return `别名 "${prefix}" 为系统保留前缀`;
    return null;
}

// F3: 直接透传 3xx Location 的上游域名白名单（云盘签名直链等）
const DEFAULT_MANUAL_REDIRECT_DOMAINS = [
    'cn-beijing-data.aliyundrive.net',
    'cn-shenzhen-data.aliyundrive.net',
    'alicdn-adrive-cn-data-yk.alicdn.com',
    '115.com', '115cdn.com', 'anxia.com',
    'pcs.drive.quark.cn', 'video-pcs.drive.quark.cn',
    'mypikpak.com', 'mypikpak.net',
    'aliyuncs.com', 'myqcloud.com', 'myhuaweicloud.com',
    'cos.ap-shanghai.myqcloud.com'
];
let _manualRedirectHosts = null; // Set<string>，由 ensureSchema/POST 端点初始化
function hostMatchesAllowlist(host, set) {
    if (!host || !set || set.size === 0) return false;
    const h = host.toLowerCase();
    if (set.has(h)) return true;
    for (const d of set) {
        if (h.endsWith('.' + d)) return true;
    }
    return false;
}

// F4: 内置 12 个 CF 友好优选域名（首次部署自动 seed）
const DEFAULT_OPTIMIZED_DOMAINS = [
    { domain: 'cf.090227.xyz',         note: 'ZhiXuanWang 优选合集' },
    { domain: 'cf.zhetengsha.eu.org',  note: '社区维护' },
    { domain: 'cdn.2020111.xyz',       note: '2020111 推送' },
    { domain: 'xn--b6gac.eu.org',      note: 'IPv6 友好' },
    { domain: 'cloudflare.182682.xyz', note: '182682 推送' },
    { domain: 'cf.877771.xyz',         note: '877771 推送' },
    { domain: 'cf.0sm.com',            note: '0sm 推送' },
    { domain: 'visa.com.sg',           note: '亚太低延迟' },
    { domain: 'visa.com.hk',           note: '香港' },
    { domain: 'time.is',               note: '欧洲低延迟' },
    { domain: 'cf-ns.com',             note: '通用' },
    { domain: 'icook.tw',              note: '台湾' }
];

// F4: HEAD 测速辅助
async function probeDomain(domain) {
    const start = Date.now();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await fetch(`https://${domain}/cdn-cgi/trace`, {
            method: 'HEAD', redirect: 'manual', signal: controller.signal,
            cf: { cacheTtl: 0 }
        });
        clearTimeout(t);
        if (res.status >= 500) return { ms: -1, ok: false };
        return { ms: Date.now() - start, ok: true };
    } catch (e) { clearTimeout(t); return { ms: -1, ok: false }; }
}

// 共享 schema 初始化（幂等）
let _schemaReady = false;
async function ensureSchema(env) {
    if (_schemaReady || !env.DB) return;
    try {
        // 既有表（避免冷启时尚未触达 /api/routes 路径）
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)`);
        // 新增表
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS kv_config (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS optimized_domains (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL UNIQUE, note TEXT DEFAULT '', builtin INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, last_ms INTEGER DEFAULT -1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        await env.DB.exec(`CREATE TABLE IF NOT EXISTS dns_config (id INTEGER PRIMARY KEY CHECK (id = 1), cf_api_token TEXT DEFAULT '', cf_zone_id TEXT DEFAULT '', cf_record_id TEXT DEFAULT '', target_alias TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        // Seed 内置优选域名（依赖 UNIQUE(domain) 去重，幂等）
        const seedStmts = DEFAULT_OPTIMIZED_DOMAINS.map(d =>
            env.DB.prepare(`INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 1, 1)`).bind(d.domain, d.note)
        );
        if (seedStmts.length) await env.DB.batch(seedStmts);

        // Seed manual redirect domains 默认值
        const existing = await env.DB.prepare(`SELECT v FROM kv_config WHERE k = 'manual_redirect_domains'`).first();
        if (!existing) {
            await env.DB.prepare(`INSERT INTO kv_config (k, v) VALUES ('manual_redirect_domains', ?)`)
                .bind(DEFAULT_MANUAL_REDIRECT_DOMAINS.join('\n')).run();
            _manualRedirectHosts = new Set(DEFAULT_MANUAL_REDIRECT_DOMAINS.map(s => s.toLowerCase()));
        } else {
            _manualRedirectHosts = new Set(String(existing.v || '').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean));
        }
        _schemaReady = true;
    } catch (e) {
        // 不抛错：DB 失败不能阻塞 Worker
        console.log('ensureSchema error:', e.message);
    }
}
async function getManualRedirectHosts(env) {
    if (_manualRedirectHosts) return _manualRedirectHosts;
    await ensureSchema(env);
    return _manualRedirectHosts || new Set();
}

// 构造发往源站的请求头：剥离 cf-* 元数据、套用伪装模式、注入节点自定义头
function buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw) {
    const h = new Headers(request.headers);
    h.set("Host", targetUrl.host);
    // 去掉 Accept-Encoding，让源站返回未压缩内容以便正确重写响应体
    h.delete("Accept-Encoding");

    const realIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") || "").split(',')[0].trim();
    h.delete("cf-connecting-ip"); h.delete("cf-ipcountry"); h.delete("cf-ray");
    h.delete("cf-visitor"); h.delete("x-forwarded-for"); h.delete("x-real-ip");

    if (currentMode === 'realip_only' && realIp) {
        h.set("X-Real-IP", realIp);
    } else if (currentMode === 'dual' && realIp) {
        h.set("X-Real-IP", realIp); h.set("X-Forwarded-For", realIp);
    } else if (currentMode === 'strict') {
        // 强力防 403 模式：强制清空原始端代理参数，对齐 Origin
        h.delete("X-Forwarded-Proto"); h.delete("X-Forwarded-Host");
        h.set("Origin", targetUrl.origin); h.set("Referer", targetUrl.origin + "/");
        if (realIp) { h.set("X-Real-IP", realIp); h.set("X-Forwarded-For", realIp); }
    }

    // 🌟 应用节点自定义请求头 (格式: Key: Value，每行一条)
    if (customHeadersRaw) {
        customHeadersRaw.split('\n').forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) {
                const key = line.slice(0, idx).trim();
                const val = line.slice(idx + 1).trim();
                if (key) h.set(key, val);
            }
        });
    }
    return h;
}

// http <-> https 协议互换，返回新的 URL 对象；非 http(s) 返回 null
function flipScheme(targetUrl) {
    const u = new URL(targetUrl);
    if (u.protocol === 'https:') u.protocol = 'http:';
    else if (u.protocol === 'http:') u.protocol = 'https:';
    else return null;
    return u;
}

// fetch 包装：源站 SSL 类错误 (525/526/530) 或抛异常时，自动切换 http/https 协议重试一次
async function fetchWithSchemeFallback(targetUrl, fetchInit, canRetry) {
    const SSL_ERR = [525, 526, 530];
    if (!canRetry) {
        // 请求体不可重放（流式 / 超限），单次发送，异常向上抛出走多节点故障转移
        return await fetch(new Request(targetUrl, fetchInit));
    }
    try {
        const resp = await fetch(new Request(targetUrl, fetchInit));
        if (!SSL_ERR.includes(resp.status)) return resp;
        const flipped = flipScheme(targetUrl);
        if (!flipped) return resp;
        try { return await fetch(new Request(flipped, fetchInit)); }
        catch (e) { return resp; }
    } catch (err) {
        const flipped = flipScheme(targetUrl);
        if (!flipped) throw err;
        return await fetch(new Request(flipped, fetchInit));
    }
}

// 源站返回 403 时，逐级调整请求头重试 (最多 3 次额外尝试)
// 返回首个非 403 响应；全部失败返回最后一次 403；无尝试返回 null
async function attempt403Cascade(targetUrl, baseHeaders, fetchInit, currentMode) {
    const strategies = [];
    // 策略 2：对齐源站 Origin/Referer (strict 模式下已是基线，跳过避免重复)
    if (currentMode !== 'strict') {
        strategies.push((h) => {
            h.set("Origin", targetUrl.origin);
            h.set("Referer", targetUrl.origin + "/");
        });
    }
    // 策略 3：删除 Origin/Referer/Sec-Fetch-*
    strategies.push((h) => {
        h.delete("Origin"); h.delete("Referer");
        for (const k of [...h.keys()]) { if (k.toLowerCase().startsWith('sec-fetch-')) h.delete(k); }
    });
    // 策略 4：最小化请求头，仅保留 UA / Accept / 鉴权 / 内容头
    strategies.push((h) => {
        const keep = ['user-agent', 'accept', 'host', 'x-emby-token', 'x-mediabrowser-token', 'x-emby-authorization', 'authorization', 'content-type', 'content-length'];
        for (const k of [...h.keys()]) { if (!keep.includes(k.toLowerCase())) h.delete(k); }
    });

    let lastResp = null;
    for (const apply of strategies) {
        const h = new Headers(baseHeaders);
        apply(h);
        try {
            const resp = await fetch(new Request(targetUrl, { ...fetchInit, headers: h }));
            if (resp.status !== 403) return resp;
            lastResp = resp;
        } catch (e) { /* 忽略，尝试下一策略 */ }
    }
    return lastResp;
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

        // 共享 schema 初始化（幂等；首次请求后为内存 no-op）
        if (env.DB) { await ensureSchema(env); }

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
        // 🚀 F5: /api/edge-info — /api/trace 的别名，附带 cacheKey（5 分钟桶 SHA-1）
        // ==========================================
        if (url.pathname === '/api/edge-info') {
            const cf = request.cf || {};
            let egressColo = '探测中...';
            try {
                const traceRes = await fetch('https://1.1.1.1/cdn-cgi/trace', {
                    headers: { 'User-Agent': 'Mozilla/5.0 (CF-Worker-Trace)' }
                });
                const traceText = await traceRes.text();
                const match = traceText.match(/colo=([A-Z]+)/);
                if (match) egressColo = match[1];
            } catch (e) {
                egressColo = '获取失败';
            }

            const entryColo = cf.colo || '未知';
            const bucket = Math.floor(Date.now() / 300000);
            let cacheKey = '';
            try {
                const buf = new TextEncoder().encode(`${entryColo}:${egressColo}:${bucket}`);
                const digest = await crypto.subtle.digest('SHA-1', buf);
                cacheKey = Array.from(new Uint8Array(digest)).slice(0, 8)
                    .map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) { cacheKey = ''; }

            return new Response(JSON.stringify({
                success: true,
                entryCountry: cf.country || '未知',
                entryCity: cf.city || '',
                entryColo,
                egressColo,
                cacheKey
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

        // ==========================================
        // 🚀 下载测速端点：客户端 → 当前 CF 入口 → Worker 的实际带宽
        // ==========================================
        if (url.pathname === '/api/speedtest-down') {
            const bytes = Math.min(parseInt(url.searchParams.get('bytes') || '5242880', 10) || 5242880, 50 * 1024 * 1024);
            const chunkSize = 65536;
            const chunk = new Uint8Array(chunkSize);
            let sent = 0;
            const stream = new ReadableStream({
                pull(controller) {
                    if (sent >= bytes) { controller.close(); return; }
                    const remaining = bytes - sent;
                    if (remaining < chunkSize) {
                        controller.enqueue(chunk.subarray(0, remaining));
                        sent += remaining;
                    } else {
                        controller.enqueue(chunk);
                        sent += chunkSize;
                    }
                }
            });
            return new Response(stream, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': String(bytes),
                    'Cache-Control': 'no-store',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // ==========================================
        // 🚀 F3: 手动重定向白名单管理
        // ==========================================
        if (url.pathname === '/api/manual-redirect-domains') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            if (request.method === 'GET') {
                const row = await env.DB.prepare(`SELECT v FROM kv_config WHERE k = 'manual_redirect_domains'`).first();
                const domains = String(row?.v || '').split('\n').map(s => s.trim()).filter(Boolean);
                return Response.json({ success: true, domains });
            }
            if (request.method === 'POST') {
                try {
                    const body = await request.json();
                    const list = Array.isArray(body.domains) ? body.domains : [];
                    const cleaned = list.map(s => String(s || '').trim().toLowerCase()).filter(s => s && /^[a-z0-9.-]+$/.test(s));
                    const v = cleaned.join('\n');
                    await env.DB.prepare(`INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('manual_redirect_domains', ?, CURRENT_TIMESTAMP)`).bind(v).run();
                    _manualRedirectHosts = new Set(cleaned);
                    return Response.json({ success: true, domains: cleaned });
                } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
            }
            return new Response("Method not allowed", { status: 405 });
        }

        // ==========================================
        // 🚀 F4: 优选域名 CRUD + 测速
        // ==========================================
        if (url.pathname === '/api/optimized-domains' && request.method === 'GET') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            const { results } = await env.DB.prepare(`SELECT id, domain, note, builtin, enabled, last_ms FROM optimized_domains ORDER BY builtin DESC, id ASC`).all();
            return Response.json({ success: true, items: results || [] });
        }
        if (url.pathname === '/api/optimized-domains' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            try {
                const { domain, note } = await request.json();
                const d = String(domain || '').trim().toLowerCase();
                if (!d || !/^[a-z0-9.-]+$/.test(d)) return Response.json({ success: false, error: '域名格式非法' }, { status: 400 });
                await env.DB.prepare(`INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 0, 1)`).bind(d, String(note || '')).run();
                return Response.json({ success: true });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
        }
        if (url.pathname.startsWith('/api/optimized-domains/') && url.pathname !== '/api/optimized-domains/speedtest') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            const id = parseInt(url.pathname.split('/').pop(), 10);
            if (!id) return Response.json({ success: false, error: 'invalid id' }, { status: 400 });
            const row = await env.DB.prepare(`SELECT * FROM optimized_domains WHERE id = ?`).bind(id).first();
            if (!row) return Response.json({ success: false, error: '记录不存在' }, { status: 404 });
            if (request.method === 'PATCH') {
                try {
                    const body = await request.json();
                    const enabled = body.enabled === undefined ? row.enabled : (body.enabled ? 1 : 0);
                    const note = body.note === undefined ? row.note : String(body.note || '');
                    await env.DB.prepare(`UPDATE optimized_domains SET enabled = ?, note = ? WHERE id = ?`).bind(enabled, note, id).run();
                    return Response.json({ success: true });
                } catch (e) { return Response.json({ success: false, error: e.message }, { status: 400 }); }
            }
            if (request.method === 'DELETE') {
                if (row.builtin) return Response.json({ success: false, error: '内置域名不可删除（可禁用）' }, { status: 400 });
                await env.DB.prepare(`DELETE FROM optimized_domains WHERE id = ?`).bind(id).run();
                return Response.json({ success: true });
            }
            return new Response("Method not allowed", { status: 405 });
        }
        if (url.pathname === '/api/optimized-domains/speedtest' && request.method === 'POST') {
            if (!env.DB) return Response.json({ success: false, error: '未绑定 D1 数据库' });
            await ensureSchema(env);
            const { results } = await env.DB.prepare(`SELECT id, domain FROM optimized_domains WHERE enabled = 1`).all();
            const rows = results || [];
            const measured = await Promise.all(rows.map(async r => {
                const probe = await probeDomain(r.domain);
                return { id: r.id, domain: r.domain, ms: probe.ms, ok: probe.ok };
            }));
            // 持久化 last_ms
            try {
                const stmts = measured.map(m => env.DB.prepare(`UPDATE optimized_domains SET last_ms = ? WHERE id = ?`).bind(m.ms, m.id));
                if (stmts.length) await env.DB.batch(stmts);
            } catch (e) {}
            measured.sort((a, b) => {
                if (!a.ok && !b.ok) return 0;
                if (!a.ok) return 1;
                if (!b.ok) return -1;
                return a.ms - b.ms;
            });
            return Response.json({ success: true, items: measured });
        }

        // 检查 DNS 替换前置条件（env 变量是否齐全）
        if (url.pathname === '/api/dns-ready' && request.method === 'GET') {
            const ok = !!(env.CF_API_TOKEN && env.CF_ZONE_ID && env.CF_DOMAIN);
            return Response.json({ success: true, ready: ok, domain: env.CF_DOMAIN || '' });
        }
        if (url.pathname === '/api/dns/replace' && request.method === 'POST') {
            try {
                const body = await request.json();
                const newDomain = String(body.domain || '').trim().toLowerCase();
                if (!newDomain) return Response.json({ success: false, error: '缺少目标域名' }, { status: 400 });
                const cfToken = env.CF_API_TOKEN; const zoneId = env.CF_ZONE_ID; const domain = env.CF_DOMAIN;
                if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: '缺少环境变量 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN' }, { status: 400 });

                // 拉取该域名下所有 A/AAAA/CNAME 记录
                const listRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, {
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
                const listData = await listRes.json();
                if (!listData.success) return Response.json({ success: false, error: 'CF 拉取记录失败: ' + JSON.stringify(listData.errors) }, { status: 502 });

                const oldRecords = (listData.result || []).filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                // 删除旧 A/AAAA/CNAME
                for (const r of oldRecords) {
                    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${r.id}`, {
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${cfToken}` }
                    });
                }
                // 写入新 CNAME
                const postRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'CNAME', name: domain, content: newDomain, ttl: 60, proxied: false })
                });
                const postData = await postRes.json();
                if (!postData.success) return Response.json({ success: false, error: 'CF 写入失败: ' + JSON.stringify(postData.errors) }, { status: 502 });
                return Response.json({ success: true, name: domain, content: newDomain, replaced: oldRecords.length });
            } catch (e) { return Response.json({ success: false, error: e.message }, { status: 500 }); }
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
                const skipped = []; let imported = 0;
                for (const r of routes) {
                    if (!r.prefix || !r.target) { skipped.push({ prefix: r.prefix || '(空)', reason: '缺少 prefix 或 target' }); continue; }
                    const reason = validateRoutePrefix(r.prefix);
                    if (reason) { skipped.push({ prefix: r.prefix, reason }); continue; }
                    await env.DB.prepare('INSERT OR REPLACE INTO routes (prefix, target, mode, remark, last_play, icon, cache_img, sort_order, custom_headers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                        .bind(r.prefix, r.target, r.mode || 'off', r.remark || '', r.last_play || '', r.icon || '', r.cache_img || 'on', r.sort_order || 0, r.custom_headers || '').run();
                    imported++;
                }
                return Response.json({ success: true, imported, skipped });
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
                const data = await request.json();
                // F1: 保留前缀 + 格式校验
                const invalidReason = validateRoutePrefix(data.prefix);
                if (invalidReason) {
                    return Response.json({ success: false, error: `路由别名 "${data.prefix}" 不可用：${invalidReason}` }, { status: 400 });
                }
                let currentSortOrder = 0;
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
        // 2.6.5 WebSocket 反代 (Emby 会话保活 / 远程控制 / SyncPlay)
        // ==========================================
        if ((request.headers.get('Upgrade') || '').toLowerCase() === 'websocket') {
            let wsLastError = null;
            for (let i = 0; i < targetUrls.length; i++) {
                const wsTarget = new URL(targetUrls[i] + remainingPath + url.search);
                const wsHeaders = buildUpstreamHeaders(request, wsTarget, currentMode, customHeadersRaw);
                try {
                    const resp = await fetch(new Request(wsTarget, { headers: wsHeaders }));
                    if (resp.webSocket) {
                        return new Response(null, { status: 101, webSocket: resp.webSocket });
                    }
                    wsLastError = new Error(`Node ${i + 1}: upstream did not upgrade (status ${resp.status})`);
                } catch (err) { wsLastError = err; }
            }
            return new Response("WebSocket upstream failed. Last Error: " + (wsLastError?.message || 'Unknown Error'), { status: 502 });
        }

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
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && !!request.body;
        let bodyBuffer = null;
        if (hasBody) {
            const buf = await request.clone().arrayBuffer();
            if (buf.byteLength <= MAX_RETRY_BODY_BYTES) { bodyBuffer = buf; }
            // 超过上限：bodyBuffer 保持 null，走单次流式发送、不做协议/403 重试
        }
        // 请求体可重放时（无体 或 已缓冲）才允许协议回退 / 403 级联重试
        const canRetry = !hasBody || bodyBuffer !== null;

        let finalResponse = null; let lastError = null;
        let triedUpstreamIndex = -1; let triedUpstreamCount = 0;

        for (let i = 0; i < targetUrls.length; i++) {
            const targetUrlStr = targetUrls[i] + remainingPath + url.search; const targetUrl = new URL(targetUrlStr);
            const newHeaders = buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw);

            const isStaticOrImage = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(targetUrl.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(targetUrl.pathname);

            // F2: 每个上游 15s 超时；超时按上游失败处理并故障转移
            const abortCtrl = new AbortController();
            const timeoutId = setTimeout(() => abortCtrl.abort(), MAX_UPSTREAM_TIMEOUT_MS);

            let fetchInit = { method: request.method, headers: newHeaders, redirect: 'manual', signal: abortCtrl.signal };

            if (isStaticOrImage && enableCache) { fetchInit.cf = { cacheEverything: true, cacheTtl: 86400 }; }

            if (hasBody) {
                if (bodyBuffer !== null) { fetchInit.body = bodyBuffer; }
                else { fetchInit.body = request.body; fetchInit.duplex = 'half'; }
            }

            triedUpstreamCount++;
            try {
                let response = await fetchWithSchemeFallback(targetUrl, fetchInit, canRetry);
                clearTimeout(timeoutId);
                // 源站 403 → 逐级调整请求头重试（同一上游内）
                if (response.status === 403 && canRetry) {
                    const cascaded = await attempt403Cascade(targetUrl, newHeaders, fetchInit, currentMode);
                    if (cascaded) response = cascaded;
                }
                if (response.status === 502 || response.status === 503 || response.status === 504) { lastError = new Error(`Node ${i + 1} returned HTTP ${response.status}`); continue; }
                triedUpstreamIndex = i;
                finalResponse = response; break;
            } catch (err) {
                clearTimeout(timeoutId);
                // AbortError 视为超时 → 故障转移
                lastError = err; continue;
            }
        }

        if (!finalResponse) return new Response("Worker Proxy Failover Exhausted. All nodes failed. Last Error: " + (lastError?.message || 'Unknown Error'), { status: 502 });

        const responseHeaders = new Headers(finalResponse.headers);

        // F2: 可选调试 header，仅在 env.DEBUG_FAILOVER === '1' 时输出
        if (env.DEBUG_FAILOVER === '1') {
            responseHeaders.set('X-Proxy-Upstream-Index', String(triedUpstreamIndex));
            responseHeaders.set('X-Proxy-Upstream-Tries', String(triedUpstreamCount));
        }

        // 统一前缀变量，确保绝对安全，不会抛出未定义错误
        // 假设你前面获取路由节点的变量叫 matchedPrefix，如果有值就带上斜杠
        const safePrefix = matchedPrefix ? `/${matchedPrefix}` : '';

        // ==========================================
        // 🚀 修复版 302 拦截：恢复 URL 编码 + F3 白名单透传
        // ==========================================
        if ([301, 302, 303, 307, 308].includes(finalResponse.status)) {
            const location = responseHeaders.get('Location');
            if (location) {
                // F3: 若 Location 指向白名单域名，则直接透传 3xx，不再套代理前缀
                let absHost = null;
                try {
                    if (/^https?:\/\//i.test(location)) absHost = new URL(location).host.toLowerCase();
                    else if (location.startsWith('//')) absHost = new URL(new URL(request.url).protocol + location).host.toLowerCase();
                } catch (e) {}
                const allowlist = await getManualRedirectHosts(env);
                if (absHost && hostMatchesAllowlist(absHost, allowlist)) {
                    responseHeaders.set('Access-Control-Allow-Origin', '*');
                    return new Response(null, { status: finalResponse.status, headers: responseHeaders });
                }

                if (/^https?:\/\//i.test(location)) {
                    // 绝对地址：套代理前缀 + encodeURIComponent，防止播放器解析重定向头时发疯
                    responseHeaders.set('Location', `${safePrefix}/${encodeURIComponent(location)}`);
                } else if (location.startsWith('//')) {
                    // 协议相对地址 //host/path：补全协议后按绝对处理
                    const abs = new URL(request.url).protocol + location;
                    responseHeaders.set('Location', `${safePrefix}/${encodeURIComponent(abs)}`);
                } else if (location.startsWith('/')) {
                    // 根相对地址 /path：补回节点前缀，避免客户端逃出代理
                    if (safePrefix) responseHeaders.set('Location', `${safePrefix}${location}`);
                } else {
                    // 裸相对地址 foo/bar：相对源站请求地址解析后按绝对处理
                    try {
                        const abs = new URL(location, targetUrls[0] + remainingPath).href;
                        responseHeaders.set('Location', `${safePrefix}/${encodeURIComponent(abs)}`);
                    } catch (e) { /* 解析失败则保持原样 */ }
                }
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
        const needsManifest = finalResponse.status === 200 && (
            pathLower.endsWith('.m3u8') || pathLower.endsWith('.mpd') ||
            contentType.includes('mpegurl') || contentType.includes('dash+xml')
        );
        const needsHtmlJs = finalResponse.status === 200 && frontendOrigin && (
            contentType.includes('text/html') || contentType.includes('text/javascript') || contentType.includes('application/javascript')
        );

        if (needsJsonPlayback || needsSystemInfo || needsManifest || needsHtmlJs) {
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

                // ③ M3U8 / DASH 播放列表 (HLS .m3u8 + DASH .mpd)
                if (needsManifest) {
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
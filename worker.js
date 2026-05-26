// AUTO-GENERATED from src/ — do not edit directly. Run 'npm run build'.

// src/util/version.js
var CURRENT_VERSION = "2.5.1";
var GITHUB_RAW_URL = "\u8FD9\u91CC\u586B\u4E0B\u4F60\u7684\u5728\u7EBF\u66F4\u65B0\u5730\u5740";

// src/util/json.js
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders
    }
  });
}

// src/util/text.js
function nowLocalDayStr() {
  return new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10);
}
function htmlEscape(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// src/util/share.js
function newShareToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

// src/db/helpers.js
function dbRun(env, sql, ...binds) {
  return env.DB.prepare(sql).bind(...binds).run();
}
function dbAll(env, sql, ...binds) {
  return env.DB.prepare(sql).bind(...binds).all();
}
function dbFirst(env, sql, ...binds) {
  return env.DB.prepare(sql).bind(...binds).first();
}

// src/routing/validate.js
var RESERVED_ALIASES = /* @__PURE__ */ new Set([
  "api",
  "admin",
  "__client_rtt__",
  "login",
  "logout",
  "assets",
  "static",
  "public",
  "health",
  "healthz",
  "ping",
  "status",
  "emby",
  "web",
  "stats",
  "favicon.ico",
  "robots.txt",
  "apple-touch-icon",
  "sw.js",
  "manifest.json",
  "cdn-cgi"
]);
var PREFIX_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
function validateRoutePrefix(raw) {
  const prefix = String(raw || "").trim();
  if (!prefix) return "\u522B\u540D\u4E3A\u7A7A";
  if (!PREFIX_REGEX.test(prefix)) return "\u522B\u540D\u683C\u5F0F\u975E\u6CD5\uFF08\u4EC5\u5141\u8BB8\u5B57\u6BCD/\u6570\u5B57/_/-\uFF0C\u4E14\u4E0D\u8D85\u8FC7 64 \u4F4D\uFF0C\u4E0D\u80FD\u4EE5\u7279\u6B8A\u5B57\u7B26\u5F00\u5934\uFF09";
  if (RESERVED_ALIASES.has(prefix.toLowerCase())) return `\u522B\u540D "${prefix}" \u4E3A\u7CFB\u7EDF\u4FDD\u7559\u524D\u7F00`;
  return null;
}
var DEFAULT_MANUAL_REDIRECT_DOMAINS = [
  "cn-beijing-data.aliyundrive.net",
  "cn-shenzhen-data.aliyundrive.net",
  "alicdn-adrive-cn-data-yk.alicdn.com",
  "115.com",
  "115cdn.com",
  "anxia.com",
  "pcs.drive.quark.cn",
  "video-pcs.drive.quark.cn",
  "mypikpak.com",
  "mypikpak.net",
  "aliyuncs.com",
  "myqcloud.com",
  "myhuaweicloud.com",
  "cos.ap-shanghai.myqcloud.com"
];
var _manualRedirectHosts = null;
function updateManualRedirectHosts(value) {
  _manualRedirectHosts = value;
}
function hostMatchesAllowlist(host, set) {
  if (!host || !set || set.size === 0) return false;
  const h = host.toLowerCase();
  if (set.has(h)) return true;
  for (const d of set) {
    if (h.endsWith("." + d)) return true;
  }
  return false;
}
var DEFAULT_OPTIMIZED_DOMAINS = [
  { domain: "cf.090227.xyz", note: "ZhiXuanWang \u4F18\u9009\u5408\u96C6" },
  { domain: "cf.zhetengsha.eu.org", note: "\u793E\u533A\u7EF4\u62A4" },
  { domain: "cdn.2020111.xyz", note: "2020111 \u63A8\u9001" },
  { domain: "xn--b6gac.eu.org", note: "IPv6 \u53CB\u597D" },
  { domain: "cloudflare.182682.xyz", note: "182682 \u63A8\u9001" },
  { domain: "cf.877771.xyz", note: "877771 \u63A8\u9001" },
  { domain: "cf.0sm.com", note: "0sm \u63A8\u9001" },
  { domain: "visa.com.sg", note: "\u4E9A\u592A\u4F4E\u5EF6\u8FDF" },
  { domain: "visa.com.hk", note: "\u9999\u6E2F" },
  { domain: "time.is", note: "\u6B27\u6D32\u4F4E\u5EF6\u8FDF" },
  { domain: "cf-ns.com", note: "\u901A\u7528" },
  { domain: "icook.tw", note: "\u53F0\u6E7E" }
];
async function probeDomain(domain) {
  const start = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 4e3);
  try {
    const res = await fetch(`https://${domain}/cdn-cgi/trace`, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      cf: { cacheTtl: 0 }
    });
    clearTimeout(t);
    if (res.status >= 500) return { ms: -1, ok: false };
    return { ms: Date.now() - start, ok: true };
  } catch (e) {
    clearTimeout(t);
    return { ms: -1, ok: false };
  }
}
async function loadCountryAllowlist(env) {
  if (!env.DB) return null;
  try {
    const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'proxy_country_allowlist'`);
    if (!row || !row.v) return null;
    const set = new Set(String(row.v).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean));
    return set.size ? set : null;
  } catch (e) {
    return null;
  }
}
async function getManualRedirectHosts(env) {
  if (_manualRedirectHosts) return _manualRedirectHosts;
  await ensureSchema(env);
  return _manualRedirectHosts || /* @__PURE__ */ new Set();
}

// src/db/schema.js
var _schemaReady = false;
async function ensureSchema(env) {
  if (_schemaReady || !env.DB) return;
  try {
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS kv_config (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS optimized_domains (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL UNIQUE, note TEXT DEFAULT '', builtin INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1, last_ms INTEGER DEFAULT -1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS dns_config (id INTEGER PRIMARY KEY CHECK (id = 1), cf_api_token TEXT DEFAULT '', cf_zone_id TEXT DEFAULT '', cf_record_id TEXT DEFAULT '', target_alias TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    try {
      await env.DB.exec(`ALTER TABLE routes ADD COLUMN show_on_status INTEGER DEFAULT 0`);
    } catch (e) {
    }
    try {
      await env.DB.exec(`ALTER TABLE routes ADD COLUMN public_alias TEXT DEFAULT ''`);
    } catch (e) {
    }
    try {
      await env.DB.exec(`ALTER TABLE routes ADD COLUMN media_counts_auto_auth INTEGER DEFAULT 0`);
    } catch (e) {
    }
    try {
      await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_auth_cache TEXT DEFAULT ''`);
    } catch (e) {
    }
    try {
      await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_auth_seen_at INTEGER DEFAULT 0`);
    } catch (e) {
    }
    try {
      await env.DB.exec(`ALTER TABLE routes ADD COLUMN emby_auth_used_at INTEGER DEFAULT 0`);
    } catch (e) {
    }
    const probeRecreate = async (table, createSql, indexSql, probeCol) => {
      try {
        await env.DB.prepare(`SELECT ${probeCol} FROM ${table} LIMIT 0`).all();
      } catch (e) {
        if (/no such column|no such table/i.test(e.message || "")) {
          try {
            await env.DB.exec(`DROP TABLE IF EXISTS ${table}`);
          } catch (_) {
          }
        }
      }
      await env.DB.exec(createSql);
      if (indexSql) await env.DB.exec(indexSql);
    };
    await probeRecreate(
      "emby_probes",
      `CREATE TABLE IF NOT EXISTS emby_probes (prefix TEXT NOT NULL, ts INTEGER NOT NULL, ok INTEGER NOT NULL, ms INTEGER NOT NULL, status INTEGER DEFAULT 0, PRIMARY KEY(prefix, ts))`,
      `CREATE INDEX IF NOT EXISTS idx_emby_probes_prefix_ts ON emby_probes(prefix, ts)`,
      "ms"
    );
    await probeRecreate(
      "emby_probe_hourly",
      `CREATE TABLE IF NOT EXISTS emby_probe_hourly (prefix TEXT NOT NULL, hour_ts INTEGER NOT NULL, ok_count INTEGER NOT NULL, fail_count INTEGER NOT NULL, avg_ms INTEGER NOT NULL, p95_ms INTEGER NOT NULL, PRIMARY KEY(prefix, hour_ts))`,
      null,
      "hour_ts"
    );
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_probe_state (prefix TEXT PRIMARY KEY, first_fail_at INTEGER DEFAULT 0, last_alert_at INTEGER DEFAULT 0, alert_kind TEXT DEFAULT 'none')`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_media_counts (prefix TEXT NOT NULL, day TEXT NOT NULL, movies INTEGER DEFAULT 0, series INTEGER DEFAULT 0, episodes INTEGER DEFAULT 0, PRIMARY KEY(prefix, day))`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS emby_public_share (token TEXT PRIMARY KEY, scope TEXT NOT NULL, prefix TEXT DEFAULT '', expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`);
    await env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_emby_public_share_scope_prefix ON emby_public_share(scope, prefix)`);
    const seedStmts = DEFAULT_OPTIMIZED_DOMAINS.map(
      (d) => env.DB.prepare(`INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 1, 1)`).bind(d.domain, d.note)
    );
    if (seedStmts.length) await env.DB.batch(seedStmts);
    const existing = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'manual_redirect_domains'`);
    if (!existing) {
      await dbRun(env, `INSERT INTO kv_config (k, v) VALUES ('manual_redirect_domains', ?)`, DEFAULT_MANUAL_REDIRECT_DOMAINS.join("\n"));
      updateManualRedirectHosts(new Set(DEFAULT_MANUAL_REDIRECT_DOMAINS.map((s) => s.toLowerCase())));
    } else {
      updateManualRedirectHosts(new Set(String(existing.v || "").split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean)));
    }
    _schemaReady = true;
  } catch (e) {
    console.log("ensureSchema error:", e.message);
  }
}

// src/ui/css.js
var CSS_COMMON = `
    :root {
        --primary: #0071e3;
        --primary-hover: #005cbf;
        --bg: #f5f5f7;
        --card: #ffffff;
        --text: #1d1d1f;
        --text-sec: #86868b;
        --border: #d2d2d7;
        /* \u79D1\u6280\u98CE\u6269\u5C55\u53D8\u91CF (\u6D45\u8272\u7248) */
        --surface: #ffffff;
        --surface-2: #f0f1f4;
        --sidebar-bg: #ffffff;
        --topbar-bg: #ffffff;
        --ok: #34c759;
        --warn: #ff9500;
        --err: #ff3b30;
        --card-shadow: 0 4px 20px rgba(0,0,0,0.05);

        /* === Alignment system v2.2.0 \u2014 design tokens ===
           Spec: .trellis/spec/frontend/ui-design-system.md "Alignment system" */
        --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
        --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 48px;
        /* half-steps \u2014 only for legitimate optical compaction (icon paddings,
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

        /* === Aurora system v2.3.0 \u2014 distinctive surface tokens ===
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

        /* === iOS-native tokens v2.4.0 \u2014 typography & shapes ===
           iOS HIG values (34pt large title, 17pt headline, 16pt callout, 15pt body,
           continuous-corner radii).
           v2.5.0: desktop port \u2014 ios-page-header / ios-form-* / tb-section-title
           promoted out of the mobile MQ; mobile-only tokens (large-title shrinks)
           are still scoped via media queries. */
        --text-headline: 17px;
        --text-body-ios: 15px;
        --text-large-title: 34px;
        --text-large-title-md: 30px;   /* \u2264480 shrink */
        --text-large-title-sm: 28px;   /* \u2264360 shrink */
        --text-large-title-lg: 40px;   /* \u2265769px desktop */
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
        /* \u79D1\u6280\u98CE\u6269\u5C55\u53D8\u91CF (\u6DF1\u8272\u7248) */
        --surface: #12151d;
        --surface-2: #181c27;
        --sidebar-bg: #0c0e15;
        --topbar-bg: #0e1119;
        --ok: #30d158;
        --warn: #ff9f0a;
        --err: #ff453a;
        --card-shadow: 0 0 0 1px rgba(255,255,255,0.02), 0 6px 26px rgba(0,0,0,0.55);

        /* Alignment system v2.2.0 \u2014 dark-mode overrides for tokens whose value differs */
        --ok-soft:   rgba(48,209,88,0.12);  --ok-ring:   rgba(48,209,88,0.24);
        --warn-soft: rgba(255,159,10,0.12); --warn-ring: rgba(255,159,10,0.24);
        --err-soft:  rgba(255,69,58,0.12);  --err-ring:  rgba(255,69,58,0.24);
        --primary-soft: rgba(47,155,255,0.12);
        --primary-ring: rgba(47,155,255,0.24);
        --primary-glow: rgba(47,155,255,0.32);

        /* Aurora system v2.3.0 \u2014 dark variant */
        --aurora-grad: linear-gradient(135deg, #2f9bff 0%, #6e6ad9 55%, #c47ce0 110%);
        --aurora-grad-soft: radial-gradient(140% 90% at 0% 0%, rgba(47,155,255,0.18), transparent 65%);
        --topbar-glass: rgba(14,17,25,0.68);
        --card-shadow-lift:
            0 0 0 1px rgba(255,255,255,0.03) inset,
            0 10px 30px -10px rgba(0,0,0,0.55);
        --card-shadow-hover:
            0 0 0 1px var(--primary-ring) inset,
            0 14px 38px -10px rgba(0,0,0,0.7);

        /* iOS-native tokens v2.4.0 \u2014 dark variant */
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
         .icon-btn      \u2014 generic (= .a-icon-btn)
         .a-icon-btn    \u2014 node-card / table action buttons
         .tb-icon-btn   \u2014 topbar borderless variant (own rule below)
       Size modifiers (apply to any): .is-sm 28x28 / .is-md 32x32 / .is-lg 36x36 */
    .icon-btn, .a-icon-btn {
        width: 32px; height: 32px; border-radius: var(--radius-md);
        border: 1px solid var(--border); background: transparent;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        color: var(--text-sec); transition: 0.15s; padding: 0;
        font-size: var(--text-xl); flex-shrink: 0;
    }
    .icon-btn:hover, .a-icon-btn:hover { color: var(--text); background: var(--surface-2); border-color: var(--border); }
    .icon-btn.danger-hover:hover, .a-icon-btn.danger-hover:hover, .hed-del:hover { color: var(--err); border-color: var(--err); background: var(--err-soft); }
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
    .search-input:focus, .a-input:focus, .a-select:focus, .hed-k:focus, .hed-v:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }

    .node-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--space-5); margin-top: var(--space-5); }
    .emby-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: 0 4px 15px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: var(--space-3-5); transition: 0.3s; position: relative; }
    .emby-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.06); transform: translateY(-2px); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 0.5px solid var(--hairline); padding-bottom: 12px; }
    .card-title-group, .a-head { display: flex; align-items: center; gap: var(--space-3); }
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

    /* \u62D6\u62FD\u6392\u5E8F\u6838\u5FC3\u9002\u914D\u6837\u5F0F */
    .emby-card.sortable-ghost { opacity: 0.4; }
    .emby-card.sortable-drag { cursor: grabbing !important; }
    .drag-handle { cursor: grab; padding-right: 10px; font-size: var(--text-2xl); color: var(--text-sec); display: flex; align-items: center; user-select: none; touch-action: none;}
    .drag-handle:active { cursor: grabbing; color: var(--primary); }

    /* ============================================================
       \u8282\u70B9\u5361\u7247\u7CBE\u7B80 (Node Card Redesign) \u2014 Lucide \u98CE\u683C\uFF0C\u53BB emoji
       ============================================================ */
    .emby-card.idle { opacity: 0.85; }
    .a-handle { width: 18px; display: flex; align-items: center; justify-content: center; color: var(--text-ter, #b0b0b5); cursor: grab; flex-shrink: 0; touch-action: none; }
    .a-handle:hover { color: var(--primary); }
    .a-handle:active, .hed-handle:active { cursor: grabbing; }
    .a-handle svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; }
    .a-cb { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0; margin: 0; }
    .a-thumb { width: 38px; height: 38px; border-radius: var(--radius-md); flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--primary), #5856d6); color: #fff; font-weight: 700; font-size: var(--text-lg); letter-spacing: -0.02em; overflow: hidden; text-transform: uppercase; }
    .a-thumb.idle { background: linear-gradient(135deg, #8e8e93, #636366); }
    .a-thumb img { width: 100%; height: 100%; border-radius: var(--radius-md); object-fit: cover; display: block; }
    .a-title-block { flex: 1; min-width: 0; }
    .a-name { font-weight: 600; font-size: var(--text-lg); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .a-meta { display: flex; align-items: center; gap: var(--space-1-5); font-size: var(--text-sm); color: var(--text-sec); font-family: ui-monospace, Menlo, Consolas, monospace; margin-top: 2px; flex-wrap: wrap; }
    .a-meta .dot-sep, .a-stat-val.muted { color: var(--text-ter, #b0b0b5); }
    .a-mode { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; color: var(--text-sec); }
    .a-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
    .a-status-dot.live, .m-pill .dot.green { background: var(--ok); box-shadow: 0 0 5px var(--ok); }
    .a-status-dot.idle { background: var(--text-ter, #b0b0b5); }
    .a-status-dot.warn, .m-pill .dot.amber { background: var(--warn); box-shadow: 0 0 5px var(--warn); }
    .a-mode-badge { padding: 3px 9px; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: 600; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }

    .a-stats { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0; padding: 14px 0; border-top: 0.5px solid var(--hairline); border-bottom: 0.5px solid var(--hairline); }
    .a-stat { padding: 0 var(--space-3); border-right: 1px solid var(--border); min-width: 0; }
    .a-stat:last-child { border-right: none; }
    /* symmetric stat columns \u2014 no first/last asymmetry (v2.2.0) */
    .a-stat-label { font-size: var(--text-xs); font-weight: 700; color: var(--text-sec); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1); }
    .a-stat-val { font-size: var(--text-2xl); font-weight: 700; color: var(--text); line-height: 1.15; letter-spacing: -0.02em; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
    .topbar .tb-stat .val { font-variant-numeric: tabular-nums; }
    .a-stat-val .unit { font-size: var(--text-xs); font-weight: 600; color: var(--text-sec); margin-left: 2px; }
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
    /* .a-icon-btn \u2014 see consolidated rule above (icon-button family). */
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
    .a-detail-actions .a-icon-btn svg, .hed-del svg { width: 12px; height: 12px; }

    /* \u8282\u70B9\u5361\u7247\u662F ping-badge \u7684\u5BB9\u5668\u4E4B\u4E00\uFF0C\u4F46\u65B0\u7248\u628A ping \u653E\u8FDB stat val\uFF0C\u4E0D\u518D\u9700\u8981\u5FBD\u7AE0\u6837\u5F0F */

    /* ============================================================
       UI Suggestions v2.0.7 \u2014 4-tier button system, dropdown menus,
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
    .btn-tier svg, .menu svg { width: 14px; height: 14px; flex-shrink: 0; }
    .btn-tier.is-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
    .btn-tier.is-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
    .btn-tier.is-success { background: var(--ok); color: #fff; border-color: var(--ok); }
    .btn-tier.is-success:hover, .btn-tier.is-danger:hover { filter: brightness(0.95); }
    .btn-tier.is-danger  { background: var(--err); color: #fff; border-color: var(--err); }
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
    .menu.open, .curl-modal-bg.show { display: flex; }
    .menu button {
        display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-2-5); border-radius: var(--radius-md);
        border: none; background: transparent; color: var(--text); font: inherit; font-size: var(--text-md);
        text-align: left; cursor: pointer; width: 100%;
    }
    .menu button:hover { background: rgba(120,120,120,0.07); }
    .menu button.danger { color: var(--err); }
    .menu button.danger:hover { background: var(--err-soft); }
    .menu hr { border: none; border-top: 0.5px solid var(--hairline); margin: 4px 6px; opacity: 0.6; }

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
    .a-add-row:hover, .chip:hover, .pill.expandable:hover, .pill.expandable.open { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
    .a-add-row svg { width: 13px; height: 13px; }
    .a-card-pick, .a-toggle-row {
        display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3) var(--space-3-5);
        border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); cursor: pointer;
        min-height: 60px;
    }
    .a-card-pick:hover, .tb-drawer select:focus, .tb-drawer input:focus { border-color: var(--primary); }
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
    .hed-k, .hed-v {
        width: 100%; padding: 9px 12px; border: 1px solid var(--border);
        border-radius: var(--radius-md); background: var(--card); color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: var(--text-md);
        outline: none; transition: 0.15s;
    }
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
    .chip-curl { color: var(--primary); border-color: var(--primary-ring); background: var(--primary-soft); }

    /* --- cURL modal (separate from #dashboardModal) --- */
    .curl-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .curl-modal { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); width: 90%; max-width: 540px; }
    .curl-modal h3 { margin: 0 0 6px 0; font-size: var(--text-xl); }
    .curl-modal p  { margin: 0 0 12px 0; font-size: var(--text-md); color: var(--text-sec); }
    .curl-modal textarea { width: 100%; padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: ui-monospace, Menlo, monospace; font-size: var(--text-sm); resize: vertical; min-height: 120px; outline: none; }
    .curl-modal-actions { display: flex; justify-content: flex-end; gap: var(--space-2-5); margin-top: var(--space-3-5); }

    /* ============================================================
       Top Bar Redesign \u2014 consolidate update alert + CF trace +
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
    .pill .lbl, .m-pill .lbl, .topbar .tb-stat .lbl { color: var(--text-sec); font-weight: 500; }
    .pill .val, .m-pill .val, .topbar .tb-stat .val { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .pill .dot, .m-pill .dot, .topbar .tb-stat .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .pill .dot.green, .topbar .tb-stat .dot.green, .ecg-pill.ok .dot, .node-badge.is-online .bdot { background: var(--ok); box-shadow: 0 0 6px var(--ok); }
    .pill .dot.amber, .topbar .tb-stat .dot.amber, .node-badge.is-slow .bdot { background: var(--warn); box-shadow: 0 0 6px var(--warn); }
    .pill .dot.red, .topbar .tb-stat .dot.red, .node-badge.is-offline .bdot { background: var(--err); box-shadow: 0 0 6px var(--err); }
    .pill.expandable, .topbar .tb-stat.is-clickable, .cursor-pointer { cursor: pointer; }
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
        box-shadow: 0 2px 8px var(--primary-ring);
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
    /* Theme toggle \u2014 show only the icon matching the current state */
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
    .tb-drawer .status { margin-top: var(--space-2-5); font-size: var(--text-sm); color: var(--text-sec); display: flex; align-items: center; gap: var(--space-1-5); }

    /* === A11y baseline (v2.5.1) ===
       Keyboard focus ring + reduced-motion. Uses :where() so specificity is 0,
       leaving existing per-component :focus-visible rules (e.g. .tb-icon-btn)
       untouched. */
    :where(button, [role="button"], a, input, select, textarea, summary):focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
    }
    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
        }
    }

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
       large title + status pills, sticky bottom CTA, \u226544pt tap targets. */
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

        /* Tap-target sizing \u2014 iOS HIG minimum --touch-min (44px) for all primary interactive elements */
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

        /* Table \u2192 stacked card rows (kept from previous design) */
        .table-wrapper { border: none; background: transparent; overflow: visible; }
        table, thead, tbody, th, td, tr { display: block; width: 100%; }
        thead { display: none; }
        tr { margin-bottom: var(--space-3); background: var(--card); border-radius: var(--radius-lg); border: 1px solid var(--border); box-shadow: 0 2px 12px rgba(0,0,0,0.03); overflow: hidden; }
        td { display: flex; align-items: center; padding: var(--space-3) var(--space-3-5); border-bottom: 0.5px solid var(--border); text-align: right; gap: var(--space-3); min-height: 44px; }
        td:last-child { border-bottom: none; }
        td[colspan] { justify-content: center; text-align: center; }
        td[colspan]::before { display: none !important; }
        td::before { content: attr(data-label); font-weight: 600; color: var(--text-sec); flex-shrink: 0; margin-right: auto; text-align: left; font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.04em; }

        /* Modals \u2192 bottom sheet */
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

        /* CF trace card \u2192 horizontal scrollable status strip */
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
       Mobile Adaptation v3 \u2014 Bottom Tab Bar, status pills row,
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

        /* Mobile: topbar \u7CBE\u7B80, \u8C03\u5EA6 pill \u7531\u79FB\u52A8\u7AEF\u72B6\u6001\u884C\u63A5\u7BA1 */
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
       Mobile UX v4 \u2014 fluid type, mid-breakpoints, landscape /
       short-height adaptation, tactile feedback, edge-fade scroll
       affordance, sheet drag-to-dismiss visual hooks.
       Layered on top of v1\u2013v3; desktop remains untouched.
       ============================================================ */

    /* Fluid typography & spacing \u2014 gentle on desktop, real impact on mobile */
    @media (max-width: 1024px) {
        .header h1 { font-size: clamp(20px, 4.5vw, 26px); letter-spacing: -0.02em; }
        h2 { font-size: clamp(16px, 3.4vw, 20px); }
        .card { padding: clamp(14px, 3vw, 22px); }
    }

    /* Mid-range (481\u2013768px): large phone landscape & small tablet portrait \u2014 2-col where it helps */
    @media (min-width: 481px) and (max-width: 768px) {
        .node-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
        .a-row, .a-row.two { grid-template-columns: 1fr 1fr !important; }
        #addForm > div:nth-of-type(2) { flex-direction: row !important; align-items: center !important; flex-wrap: wrap; }
        #addForm > div:nth-of-type(2) > * { width: auto !important; flex: 1 1 200px; }
    }

    /* Small phones (\u2264360px): tighten everything one more notch */
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

    /* Tactile feedback \u2014 only on touch pointers, never on desktop */
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
        /* iOS HIG: form rows must remain \u226544pt on touch */
        .ios-form-row { min-height: var(--touch-min); }
    }

    /* Edge-fade affordance for horizontal scrollers \u2014 signals "swipe-able" */
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
        #dashboardModal > .card { animation: none !important; }
    }

    /* ============================================================
       Admin UI Redesign \u2014 \u53CD\u4EE3\u6838\u5FC3\xB7\u5B89\u5168\u4E2D\u5FC3 \u4EEA\u8868\u76D8\u5E03\u5C40
       \u4FA7\u8FB9\u680F + \u9876\u90E8\u72B6\u6001\u680F + \u5206\u533A\u5185\u5BB9 + \u5371\u9669\u64CD\u4F5C\u5E95\u90E8\u6761
       ============================================================ */
    body.shell-on { padding: 0 !important; }
    .app-shell { display: flex; min-height: 100vh; width: 100%; }

    /* --- \u4FA7\u8FB9\u680F --- */
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
    .sidebar-brand > *, .danger-hero > *, .kpi-tile > * { position: relative; z-index: 1; }
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

    /* \u6298\u53E0\u6001 */
    .sidebar.collapsed { width: 68px; }
    .sidebar.collapsed .sidebar-brand-text,
    .sidebar.collapsed .nav-item span,
    .sidebar.collapsed .sidebar-version,
    .sidebar.collapsed .sidebar-collapse span { display: none; }
    .sidebar.collapsed .sidebar-brand { justify-content: center; padding: 18px 10px; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 11px 0; }
    .sidebar.collapsed .sidebar-collapse svg { transform: rotate(180deg); }

    /* --- \u4E3B\u533A --- */
    .app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

    /* --- \u9876\u90E8\u72B6\u6001\u680F (glass v2.3.0) --- */
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

    /* === Utility classes (v2.2.0) === */
    /* Card variant: lifted modal-style card with danger left-border */
    .card.is-danger-highlight {
        max-width: 760px; margin: 60px auto; position: relative;
        border-left: 4px solid var(--err);
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    /* Trailing action row \u2014 last button pushed to the right edge */
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
    .pos-rel { position: relative; }
    .pos-abs { position: absolute; }
    .flex-1 { flex: 1; }
    .flex-1-min0 { flex: 1; min-width: 0; }
    /* DNS record-type badges (cyan = AAAA, purple = system accent) \u2014 non-status palette */
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

    /* --- \u5185\u5BB9\u533A\u4E0E\u5206\u533A --- */
    .content { flex: 1; padding: var(--space-6); max-width: 1400px; width: 100%; margin: 0 auto; }
    .app-section { display: none; }
    .app-section.is-active { display: block; animation: sec-fade 0.22s ease; }
    @keyframes sec-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    /* --- \u5371\u9669\u533A\u5206\u533A (v2.3.0, \u66FF\u4EE3\u65E7\u7684\u5E95\u90E8\u5E38\u9A7B\u5371\u9669\u64CD\u4F5C\u6761) --- */
    /* Nav tab tint \u2014 sidebar entry hints at destructive intent without screaming */
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
    /* Hero block \u2014 clearly destructive but composed, not chaotic */
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
       The visible centerpiece of the overview view \u2014 bento tiles
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
    .kpi-tile.is-primary .kpi-unit, .kpi-tile.is-primary .kpi-sub { color: rgba(255,255,255,0.78); }
    .kpi-sub {
        margin-top: var(--space-2);
        font-size: var(--text-xs);
        color: var(--text-sec);
    }
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

    /* \u79D1\u6280\u98CE\u5361\u7247\u5FAE\u5149 (\u6DF1\u8272) */
    body.dark .card { box-shadow: var(--card-shadow-lift); }
    body.dark .emby-card { box-shadow: var(--card-shadow); }
    body.dark .emby-card:hover { box-shadow: 0 0 0 1px var(--accent-glow), 0 10px 30px rgba(0,0,0,0.6); }
    body.dark .kpi-tile { background: var(--card); }

    /* --- ECG \u5FC3\u7535\u56FE strip (overview + status) --- */
    .ecg-strip {
        background: linear-gradient(180deg, var(--surface-2) 0%, var(--card) 100%);
        background-image:
            linear-gradient(180deg, var(--surface-2) 0%, var(--card) 100%),
            repeating-linear-gradient(0deg, transparent 0, transparent 7px, var(--hairline) 7px, var(--hairline) 7.5px),
            repeating-linear-gradient(90deg, transparent 0, transparent 11px, var(--hairline) 11px, var(--hairline) 11.5px);
        background-blend-mode: normal, soft-light, soft-light;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 6px 8px;
        position: relative; overflow: hidden;
    }
    .ecg-strip .ecg-svg { width: 100%; height: 36px; display: block; }
    .ecg-strip .ecg-line {
        stroke: var(--primary); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round;
        filter: drop-shadow(0 0 2px var(--primary-glow));
    }
    .ecg-strip .ecg-base { stroke: var(--hairline); stroke-width: .6; stroke-dasharray: 2 3; }
    .ecg-strip .ecg-mid  { stroke: var(--hairline); stroke-width: .4; opacity: .5; }
    .ecg-strip .ecg-fail {
        stroke: var(--err); stroke-width: 1.6; stroke-linecap: round;
        filter: drop-shadow(0 0 2px var(--err));
    }
    .ecg-strip .ecg-dot.ok  { fill: var(--primary); }
    .ecg-strip .ecg-dot.bad { fill: var(--err); }
    .ecg-strip .ecg-empty   { font-size: 9px; fill: var(--text-sec); font-family: inherit; }

    .ecg-mount {
        margin: 6px 0 8px;
        display: flex; flex-direction: column; gap: 8px;
    }
    .ecg-meta {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        font-size: var(--text-xs); color: var(--text-sec);
        font-variant-numeric: tabular-nums;
    }
    .ecg-pill {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 2px 9px; border-radius: var(--radius-pill);
        font-size: var(--text-xs); font-weight: 700;
    }
    .ecg-pill .dot, .node-badge .bdot { width: 6px; height: 6px; border-radius: 50%; }
    .ecg-pill.ok  { color: var(--ok);  background: var(--ok-soft); }
    .ecg-pill.bad { color: var(--err); background: var(--err-soft); }
    .ecg-pill.bad .dot { background: var(--err); }
    .ecg-stat b {
        color: var(--text-sec); font-weight: 700; margin-right: 4px;
        letter-spacing: .04em; text-transform: uppercase; font-size: 10px;
    }

    /* --- \u8282\u70B9\u72B6\u6001\u5FBD\u7AE0 --- */
    .node-badge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 3px 9px; border-radius: var(--radius-pill);
        font-size: var(--text-xs); font-weight: 700; white-space: nowrap;
    }
    .node-badge.is-online { color: var(--ok); background: var(--ok-soft); }
    .node-badge.is-slow { color: var(--warn); background: var(--warn-soft); }
    .node-badge.is-offline { color: var(--err); background: var(--err-soft); }
    .node-badge.is-idle { color: var(--text-sec); background: rgba(142,142,147,0.14); }
    .node-badge.is-idle .bdot { background: var(--text-sec); }

    /* --- \u8FF7\u4F60 SVG \u6298\u7EBF\u56FE --- */
    .node-spark { width: 100%; height: 38px; display: block; }
    .node-spark .sk-line { fill: none; stroke: var(--primary); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .node-spark .sk-area { fill: var(--accent-glow); opacity: 0.5; }
    .node-spark-empty {
        height: 38px; display: flex; align-items: center; justify-content: center;
        font-size: var(--text-xs); color: var(--text-sec);
        border: 1px dashed var(--border); border-radius: var(--radius-md);
    }

    /* --- \u79FB\u52A8\u7AEF: \u9690\u85CF\u4FA7\u8FB9\u680F, \u6CBF\u7528\u5E95\u90E8 tab --- */
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
       Refined iOS-native overhaul. Mobile-only (\u2264768px) \u2014 desktop
       untouched. Layered on top of v1\u2013v4 mobile rules. Consumes
       design tokens from :root (incl. iOS-specific tokens added in
       this version). Markup additions are minimal; most retrofits
       are handled in CSS via the existing IDs/classes.
       ============================================================ */

    /* Skeleton shimmer \u2014 used during initial data hydration */
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
    .skeleton::after { content: '\xB7'; visibility: hidden; }
    @keyframes ios-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* iOS large-title + sticky compact bar \u2014 v2.5.0 promoted to desktop.
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

    /* --- iOS inset-grouped form rows \u2014 v2.5.0 promoted to desktop. --- */
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

        /* --- Status strip: 2\xD72 grid, no horizontal scroll --- */
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

        /* --- "\u66F4\u591A" sheet (iOS action sheet style) --- */
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

        /* ============================================================
           === Mobile v5 \u2014 \u6D4B\u901F & DNS specialist (v2.6.0) ===
           Purpose-built layout for #sec-speed. Layered on top of the
           generic v5 mobile rules above. All selectors scoped to
           #sec-speed; desktop guards live outside the MQ further down.
           ============================================================ */

        /* 7.1 \u2014 Large-title page header (mobile only) */
        #sec-speed .sd-page-header {
            display: block;
            padding: var(--space-2) var(--space-1) var(--space-3);
        }
        #sec-speed .sd-page-header .ios-large-title {
            font-size: var(--text-large-title);
            margin: 0;
        }
        #sec-speed .sd-page-header .sd-page-sub {
            margin: var(--space-1) 0 0;
            font-size: var(--text-md);
            color: var(--text-sec);
            font-weight: 500;
            letter-spacing: -0.005em;
        }
        /* Hide in-card legacy H2 since the large title carries context */
        #sec-speed .card .section-title,
        #sec-speed .card .section-header-row { display: none; }
        #sec-speed .card > div[style*="display:flex"][style*="space-between"] > h2.section-title { display: none; }

        /* 7.2 \u2014 Current effective DNS resolution hero card */
        #sec-speed .sd-dns-card {
            background: var(--card);
            border: 0.5px solid var(--hairline);
            border-radius: var(--radius-ios-sm);
            padding: var(--space-3) var(--space-3-5) var(--space-2);
            margin-bottom: var(--space-4);
            box-shadow:
                0 1px 0 rgba(255,255,255,0.5) inset,
                0 4px 14px -8px rgba(15,23,42,0.10);
        }
        body.dark #sec-speed .sd-dns-card {
            box-shadow:
                0 0 0 0.5px rgba(255,255,255,0.04) inset,
                0 6px 18px -10px rgba(0,0,0,0.6);
        }
        #sec-speed .sd-dns-head {
            display: flex; align-items: center; justify-content: space-between;
            gap: var(--space-2);
            margin-bottom: var(--space-2);
        }
        #sec-speed .sd-eyebrow {
            font-size: var(--text-xs); font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.10em;
            color: var(--text-sec);
        }
        #sec-speed .sd-dns-tag {
            font-size: 9px; font-weight: 800;
            letter-spacing: 0.14em;
            color: var(--primary);
            background: var(--primary-soft);
            padding: 3px 7px;
            border-radius: var(--radius-pill);
            border: 0.5px solid var(--primary-ring);
        }
        #sec-speed .sd-dns-list {
            list-style: none; margin: 0; padding: 0;
            display: flex; flex-direction: column;
            gap: 0;
        }
        #sec-speed .sd-dns-row {
            display: flex; align-items: center;
            gap: var(--space-2-5);
            padding: var(--space-2) 0;
            border-top: 0.5px solid var(--hairline);
            min-height: 36px;
        }
        #sec-speed .sd-dns-row:first-child { border-top: none; }
        #sec-speed .sd-dns-badge { display: none; }  /* desktop-only fallback */
        #sec-speed .sd-rec-pill {
            display: inline-flex; align-items: center; justify-content: center;
            min-width: 44px;
            padding: 2px 6px;
            font-size: 10px; font-weight: 800;
            letter-spacing: 0.06em;
            border-radius: var(--radius-sm);
            font-variant-numeric: tabular-nums;
        }
        #sec-speed .sd-rec-pill.is-A    { color: var(--primary); background: var(--primary-soft); }
        #sec-speed .sd-rec-pill.is-AAAA { color: #0aa3a3;       background: rgba(10,163,163,0.12); }
        body.dark #sec-speed .sd-rec-pill.is-AAAA { color: #5fd1d1; background: rgba(95,209,209,0.16); }
        #sec-speed .sd-rec-pill.is-CNAME{ color: var(--warn);    background: var(--warn-soft); }
        #sec-speed .sd-ip {
            flex: 1 1 auto; min-width: 0;
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            font-size: var(--text-md);
            color: var(--text);
            font-variant-numeric: tabular-nums;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        #sec-speed .sd-dns-card .text-muted { color: var(--text-sec); font-size: var(--text-md); }

        /* 7.3 \u2014 ISP segmented control (horizontally scrollable) */
        #sec-speed .sd-isp-seg {
            display: flex;
            gap: var(--space-1-5);
            padding: var(--space-1);
            margin: 0 calc(-1 * var(--space-4)) var(--space-3);
            padding-left: var(--space-4); padding-right: var(--space-4);
            overflow-x: auto;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x proximity;
            overscroll-behavior-x: contain;
        }
        #sec-speed .sd-isp-seg::-webkit-scrollbar { display: none; }
        #sec-speed .sd-isp-seg [role="tab"] {
            flex: 0 0 auto;
            min-width: 56px;
            min-height: 34px;
            padding: 6px 14px;
            border: 0.5px solid var(--hairline);
            border-radius: var(--radius-pill);
            background: var(--ios-fill-quat);
            color: var(--text);
            font-size: var(--text-md);
            font-weight: 600;
            letter-spacing: -0.005em;
            cursor: pointer;
            scroll-snap-align: center;
            transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
            -webkit-tap-highlight-color: transparent;
        }
        #sec-speed .sd-isp-seg [role="tab"][aria-selected="true"] {
            background: var(--primary);
            border-color: transparent;
            color: #fff;
            box-shadow: 0 4px 12px -4px var(--primary-glow);
        }
        #sec-speed .sd-isp-seg [role="tab"]:active { transform: scale(0.96); }

        /* 7.4 \u2014 Action stack (primary CTA + secondary ghosts + overflow) */
        #sec-speed .sd-action-stack {
            display: flex; flex-direction: column;
            gap: var(--space-2);
            margin-bottom: var(--space-4);
        }
        #sec-speed .sd-cta-primary {
            display: inline-flex; align-items: center; justify-content: center;
            gap: var(--space-2);
            width: 100%;
            min-height: 50px;
            padding: 0 var(--space-5);
            border: none;
            border-radius: var(--radius-ios-sm);
            background: var(--aurora-grad);
            background-size: 180% 100%;
            background-position: 0% 0%;
            color: #fff;
            font-size: var(--text-headline);
            font-weight: 700;
            letter-spacing: -0.005em;
            cursor: pointer;
            box-shadow: 0 8px 22px -8px var(--primary-glow);
            transition: background-position 0.4s ease, transform 0.12s ease, box-shadow 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        }
        #sec-speed .sd-cta-primary:active {
            transform: scale(0.985);
            background-position: 100% 0%;
            box-shadow: 0 4px 14px -6px var(--primary-glow);
        }
        #sec-speed .sd-action-row {
            display: grid;
            grid-template-columns: 1fr 1fr 48px;
            gap: var(--space-2);
        }
        #sec-speed .sd-cta-ghost,
        #sec-speed .sd-cta-more {
            display: inline-flex; align-items: center; justify-content: center;
            min-height: var(--touch-min);
            padding: 0 var(--space-3);
            border: 0.5px solid var(--hairline);
            border-radius: var(--radius-ios-sm);
            background: var(--ios-fill-quat);
            color: var(--text);
            font-size: var(--text-md);
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s ease, transform 0.12s ease;
            -webkit-tap-highlight-color: transparent;
        }
        #sec-speed .sd-cta-ghost:active,
        #sec-speed .sd-cta-more:active {
            background: var(--ios-fill);
            transform: scale(0.97);
        }
        #sec-speed .sd-cta-more svg { color: var(--text-sec); }

        /* 7.5 \u2014 Floating selection bar (slides up from bottom of #speed-anchor) */
        #sec-speed #speed-anchor { position: relative; }
        #sec-speed .sd-selection-bar {
            position: fixed;
            left: var(--space-4); right: var(--space-4);
            bottom: calc(72px + env(safe-area-inset-bottom) + var(--space-3));
            z-index: 900;
            display: flex; align-items: center; justify-content: space-between;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--topbar-glass);
            -webkit-backdrop-filter: saturate(180%) blur(24px);
                    backdrop-filter: saturate(180%) blur(24px);
            border: 0.5px solid var(--hairline);
            border-radius: var(--radius-ios);
            box-shadow: 0 12px 36px -10px rgba(0,0,0,0.32);
            transform: translateY(20px); opacity: 0;
            transition: transform 0.22s cubic-bezier(.32,.72,.3,1), opacity 0.18s ease;
            pointer-events: none;
        }
        #sec-speed .sd-selection-bar.is-show {
            transform: translateY(0); opacity: 1;
            pointer-events: auto;
        }
        #sec-speed .sd-sel-label {
            font-size: var(--text-base);
            color: var(--text);
            font-weight: 500;
        }
        #sec-speed .sd-sel-label strong {
            font-weight: 700; color: var(--primary);
            font-variant-numeric: tabular-nums;
            margin: 0 2px;
        }
        #sec-speed .sd-sel-btn {
            display: inline-flex; align-items: center; gap: var(--space-1-5);
            min-height: 38px;
            padding: 0 var(--space-3-5);
            border: none;
            border-radius: var(--radius-pill);
            background: var(--ok);
            color: #fff;
            font-size: var(--text-md);
            font-weight: 700;
            letter-spacing: -0.005em;
            cursor: pointer;
            box-shadow: 0 6px 16px -4px rgba(52,199,89,0.5);
            transition: transform 0.12s ease, box-shadow 0.18s ease;
            -webkit-tap-highlight-color: transparent;
        }
        #sec-speed .sd-sel-btn:active { transform: scale(0.96); }
        body.dark #sec-speed .sd-sel-btn { box-shadow: 0 6px 16px -4px rgba(48,209,88,0.45); }

        /* 7.6 \u2014 Collapsible custom source */
        #sec-speed .sd-custom-fold {
            margin-bottom: var(--space-3);
        }
        #sec-speed .sd-custom-summary {
            list-style: none;
            display: flex; align-items: center; justify-content: space-between;
            gap: var(--space-2);
            padding: var(--space-3) var(--space-3-5);
            min-height: var(--touch-min);
            background: var(--ios-fill-quat);
            border: 0.5px solid var(--hairline);
            border-radius: var(--radius-ios-sm);
            font-size: var(--text-md);
            font-weight: 600;
            color: var(--text);
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
        }
        #sec-speed .sd-custom-summary::-webkit-details-marker { display: none; }
        #sec-speed .sd-custom-summary::marker { content: ''; }
        #sec-speed .sd-chev {
            color: var(--text-sec);
            transition: transform 0.22s ease;
        }
        #sec-speed .sd-custom-fold[open] .sd-chev { transform: rotate(180deg); }
        #sec-speed .sd-custom-fold[open] .sd-custom-summary {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            border-bottom-color: transparent;
        }
        #sec-speed .sd-custom-fold .sd-custom-body {
            margin-top: 0 !important;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
        }

        /* 7.7 \u2014 Node row redesign \u2014 grid layout via display:contents on cells */
        /* Override generic \u2264768 table-stacking for the speed table only */
        #sec-speed #testTableBody tr {
            display: grid !important;
            grid-template-columns: 24px 1fr auto;
            grid-template-areas:
                "check  ip     chip"
                "bar    bar    bar"
                "stat   acts   acts";
            gap: var(--space-2-5);
            padding: var(--space-3) var(--space-3-5);
            margin-bottom: var(--space-2-5);
            background: var(--card);
            border: 0.5px solid var(--hairline);
            border-radius: var(--radius-ios-sm);
            box-shadow:
                0 1px 0 rgba(255,255,255,0.5) inset,
                0 3px 10px -6px rgba(15,23,42,0.08);
        }
        body.dark #sec-speed #testTableBody tr {
            box-shadow:
                0 0 0 0.5px rgba(255,255,255,0.04) inset,
                0 4px 14px -8px rgba(0,0,0,0.55);
        }
        #sec-speed #testTableBody td {
            display: contents !important;
        }
        /* Hide the generic data-label ::before labels \u2014 our grid has its own visual hierarchy */
        #sec-speed #testTableBody td::before { display: none !important; content: '' !important; }
        /* Slot each cell's children into the grid */
        #sec-speed #testTableBody td[data-label="\u52FE\u9009\u8282\u70B9"] { contain: layout; }
        #sec-speed #testTableBody td[data-label="\u52FE\u9009\u8282\u70B9"] > * { grid-area: check; align-self: center; justify-self: start; }
        #sec-speed #testTableBody td[data-label="\u4E13\u5C5E\u8282\u70B9"] > * { grid-area: ip; align-self: center; }
        #sec-speed #testTableBody td[data-label="\u9884\u4F30\u5EF6\u8FDF"] > * { grid-area: bar; align-self: center; }
        #sec-speed #testTableBody td[data-label="\u8FDE\u901A\u72B6\u6001"] > * { grid-area: stat; align-self: center; justify-self: start; }
        #sec-speed #testTableBody td[data-label="\u8BB0\u5F55/\u5F52\u5C5E\u5730"] > * { grid-area: chip; align-self: center; justify-self: end; }
        #sec-speed #testTableBody td[data-label="\u5FEB\u6377\u64CD\u4F5C"] > * { grid-area: acts; align-self: center; justify-self: end; }
        /* Empty-state row keeps colspan-style centering */
        #sec-speed #testTableBody td[colspan] {
            display: block !important;
            grid-column: 1 / -1 !important;
            text-align: center;
            color: var(--text-sec);
            padding: var(--space-5) var(--space-3);
        }
        #sec-speed #testTableBody tr:has(td[colspan]) {
            display: block !important;
            padding: 0;
            background: transparent;
            border: 0.5px dashed var(--hairline);
        }
        /* IP cell typography */
        #sec-speed #testTableBody td[data-label="\u4E13\u5C5E\u8282\u70B9"] .ip-text,
        #sec-speed #testTableBody td[data-label="\u4E13\u5C5E\u8282\u70B9"] strong {
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            font-size: var(--text-base);
            font-weight: 700;
            color: var(--text);
            font-variant-numeric: tabular-nums;
            letter-spacing: -0.005em;
        }
        /* Latency bar styles */
        #sec-speed .sd-lat-fallback { display: none; }  /* mobile uses .sd-lat-wrap */
        #sec-speed .sd-lat-wrap {
            display: flex; align-items: center; gap: var(--space-2-5);
            width: 100%;
        }
        #sec-speed .sd-lat-bar {
            display: inline-flex; flex: 1 1 auto;
            gap: 2px;
            min-width: 0;
        }
        #sec-speed .sd-lat-cell {
            flex: 1 1 0;
            height: 8px;
            border-radius: 2px;
            background: var(--ios-fill-quat);
            transition: background 0.2s ease;
        }
        #sec-speed .sd-lat-wrap.is-ok   .sd-lat-cell.is-on { background: var(--ok); }
        #sec-speed .sd-lat-wrap.is-warn .sd-lat-cell.is-on { background: var(--warn); }
        #sec-speed .sd-lat-wrap.is-err  .sd-lat-cell.is-on { background: var(--err); }
        #sec-speed .sd-lat-wrap.is-loading .sd-lat-bar {
            background: linear-gradient(90deg, var(--ios-fill-quat) 0%, var(--ios-fill) 50%, var(--ios-fill-quat) 100%);
            background-size: 200% 100%;
            animation: ios-shimmer 1.4s linear infinite;
            border-radius: 4px;
            height: 8px;
        }
        #sec-speed .sd-lat-wrap.is-loading .sd-lat-cell { background: transparent; }
        #sec-speed .sd-lat-val {
            flex: 0 0 auto;
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            font-size: var(--text-sm);
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: var(--text);
            min-width: 64px;
            text-align: right;
            letter-spacing: -0.01em;
        }
        #sec-speed .sd-lat-wrap.is-ok   .sd-lat-val { color: var(--ok); }
        #sec-speed .sd-lat-wrap.is-warn .sd-lat-val { color: var(--warn); }
        #sec-speed .sd-lat-wrap.is-err  .sd-lat-val { color: var(--err); }
        #sec-speed .sd-lat-wrap.is-loading .sd-lat-val { color: var(--text-sec); }
        /* Connectivity status cell \u2014 strip down inline styles */
        #sec-speed #testTableBody td[data-label="\u8FDE\u901A\u72B6\u6001"] {
            font-size: var(--text-sm);
        }
        /* Region/record-type chip cell */
        #sec-speed #testTableBody td[data-label="\u8BB0\u5F55/\u5F52\u5C5E\u5730"] {
            font-size: var(--text-xs);
            color: var(--text-sec);
            text-align: right;
        }
        /* Action cell \u2014 keep the existing button compact */
        #sec-speed #testTableBody td[data-label="\u5FEB\u6377\u64CD\u4F5C"] .btn-dns {
            padding: 6px 12px;
            font-size: var(--text-sm);
            border-radius: var(--radius-pill);
            min-height: 32px;
            min-width: auto;
        }
        /* Checkbox \u2014 chunkier touch surface */
        #sec-speed #testTableBody .ip-checkbox {
            width: 20px; height: 20px;
        }
        /* Hide the legacy status hint banner on mobile \u2014 info is now contextual */
        #sec-speed #statusText {
            font-size: var(--text-sm) !important;
            padding: var(--space-2-5) var(--space-3) !important;
            border-left-width: 3px !important;
            margin-bottom: var(--space-3) !important;
        }

        /* 7.8 \u2014 \u4F18\u9009 CDN \u57DF\u540D card */
        #sec-speed #optimizedDomainsBody tr.sd-od-row {
            display: grid !important;
            grid-template-columns: 1fr auto;
            grid-template-areas:
                "domain  toggle"
                "note    note"
                "ms      actions";
            gap: var(--space-2);
            padding: var(--space-3) var(--space-3-5);
            margin-bottom: var(--space-2-5);
            background: var(--card);
            border: 0.5px solid var(--hairline);
            border-radius: var(--radius-ios-sm);
            box-shadow:
                0 1px 0 rgba(255,255,255,0.5) inset,
                0 3px 10px -6px rgba(15,23,42,0.08);
        }
        body.dark #sec-speed #optimizedDomainsBody tr.sd-od-row {
            box-shadow:
                0 0 0 0.5px rgba(255,255,255,0.04) inset,
                0 4px 14px -8px rgba(0,0,0,0.55);
        }
        #sec-speed #optimizedDomainsBody td { display: contents !important; }
        #sec-speed #optimizedDomainsBody td::before { display: none !important; content: '' !important; }
        #sec-speed #optimizedDomainsBody td[data-label="\u57DF\u540D"] > * { grid-area: domain; }
        #sec-speed #optimizedDomainsBody td[data-label="\u57DF\u540D"] code {
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            font-size: var(--text-base);
            font-weight: 700;
            color: var(--text);
            font-variant-numeric: tabular-nums;
            word-break: break-all;
        }
        #sec-speed #optimizedDomainsBody td[data-label="\u5907\u6CE8"] {
            display: block !important;
            grid-area: note;
            color: var(--text-sec);
            font-size: var(--text-sm);
            line-height: 1.4;
            padding: 0;
            border: none;
        }
        #sec-speed #optimizedDomainsBody td[data-label="\u5907\u6CE8"]:empty { display: none !important; }
        #sec-speed #optimizedDomainsBody td[data-label="\u5185\u7F6E"] { display: none !important; }
        #sec-speed #optimizedDomainsBody td[data-label="\u542F\u7528"] > * { grid-area: toggle; justify-self: end; align-self: center; }
        #sec-speed #optimizedDomainsBody td[data-label="\u542F\u7528"] input[type="checkbox"] {
            width: 20px; height: 20px;
            accent-color: var(--primary);
        }
        #sec-speed #optimizedDomainsBody td[data-label="\u4E0A\u6B21\u6D4B\u901F"] > * { grid-area: ms; justify-self: start; }
        #sec-speed #optimizedDomainsBody td[data-label="\u64CD\u4F5C"] > * { grid-area: actions; justify-self: end; }
        #sec-speed .sd-od-ms {
            display: inline-flex; align-items: center;
            padding: 4px 10px;
            border-radius: var(--radius-pill);
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            font-size: var(--text-sm);
            font-weight: 700;
            letter-spacing: -0.005em;
            background: var(--ios-fill-quat);
            color: var(--text-sec);
        }
        #sec-speed .sd-od-ms.is-ok   { color: var(--ok);   background: var(--ok-soft); }
        #sec-speed .sd-od-ms.is-warn { color: var(--warn); background: var(--warn-soft); }
        #sec-speed .sd-od-ms.is-err  { color: var(--err);  background: var(--err-soft); }
        /* Empty-state row */
        #sec-speed #optimizedDomainsBody tr:has(td[colspan]) {
            display: block !important;
            padding: var(--space-5) var(--space-3);
            text-align: center;
            background: transparent;
            border: 0.5px dashed var(--hairline);
            border-radius: var(--radius-ios-sm);
        }
        #sec-speed #optimizedDomainsBody tr:has(td[colspan]) td {
            display: block !important;
            color: var(--text-sec);
        }
        /* Collapse the CDN card action toolbar into a primary CTA + overflow on mobile.
           Implementation kept tiny: just stack them and let the first 'is-primary' button stretch. */
        #sec-speed .card.mt-4 > div[style*="display:flex"][style*="space-between"] {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: var(--space-2) !important;
            margin-bottom: var(--space-3) !important;
        }
        #sec-speed .card.mt-4 > div[style*="display:flex"][style*="space-between"] .flex-wrap-tight {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-2);
        }
        #sec-speed .card.mt-4 .flex-wrap-tight .btn-tier {
            width: 100%;
            justify-content: center;
            min-height: var(--touch-min);
            font-size: var(--text-md);
        }
        #sec-speed .card.mt-4 .flex-wrap-tight .btn-tier.is-primary {
            grid-column: 1 / -1;
        }
        #sec-speed #downloadSpeedResult:not(:empty) {
            display: inline-block;
            margin-top: var(--space-2) !important;
            padding: 4px 12px;
            border-radius: var(--radius-pill);
            background: var(--ios-fill-quat);
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--text);
        }
        #sec-speed #dnsReadyHint {
            font-size: var(--text-sm) !important;
            line-height: 1.5;
        }

        /* 7.9 \u2014 Overflow sheet (#sdMoreSheet) \u2014 mirrors #moreSheet pattern */
        #sec-speed #sdMoreSheet,
        #sdMoreSheet {
            display: block;
            position: fixed; left: 0; right: 0; bottom: 0; top: 0;
            z-index: 1100;
            pointer-events: none;
        }
        #sdMoreSheet::before {
            content: '';
            position: fixed; inset: 0;
            background: var(--ios-overlay);
            opacity: 0;
            transition: opacity 0.28s ease;
            pointer-events: none;
        }
        #sdMoreSheet > .more-sheet-card {
            position: absolute; left: 0; right: 0; bottom: 0;
            transform: translateY(100%);
            transition: transform 0.28s cubic-bezier(.32,.72,.3,1);
            background: var(--card);
            border-radius: var(--radius-ios) var(--radius-ios) 0 0;
            padding: var(--space-3) var(--space-4)
                     calc(var(--space-4) + env(safe-area-inset-bottom));
            box-shadow: 0 -10px 36px rgba(0,0,0,0.18);
        }
        #sdMoreSheet.is-open { pointer-events: auto; }
        #sdMoreSheet.is-open::before { opacity: 1; pointer-events: auto; }
        #sdMoreSheet.is-open > .more-sheet-card { transform: translateY(0); pointer-events: auto; }
        #sdMoreSheet .sd-sheet-cancel {
            display: block; width: 100%;
            margin-top: var(--space-3);
            min-height: 50px;
            padding: 0;
            border: none;
            border-radius: var(--radius-ios-sm);
            background: var(--surface-2);
            color: var(--primary);
            font-size: var(--text-headline);
            font-weight: 600;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }
        body.dark #sdMoreSheet .sd-sheet-cancel { background: var(--surface); }
        #sdMoreSheet .sd-sheet-cancel:active { background: var(--ios-fill); }

        /* 7.10 \u2014 Hide legacy desktop controls on mobile inside #sec-speed */
        #sec-speed #speed-anchor > .toolbar { display: none !important; }
        #sec-speed #ipType { display: none !important; }
    }

    /* --- \u2264480 specific tightening (5-tab labels stay readable) --- */
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

    /* ============================================================
       === Desktop guards for \u6D4B\u901F & DNS mobile-only chrome (v2.6.0) ===
       Everything below renders only on mobile; on desktop we collapse
       the new elements to display:none so the original desktop layout
       is byte-identical to pre-v2.6.0.
       ============================================================ */
    @media (min-width: 769px) {
        .sd-page-header { display: none !important; }
        #sec-speed .sd-dns-card {
            background: rgba(120,120,120,0.05);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 12px 16px;
            margin-bottom: 16px;
        }
        #sec-speed .sd-dns-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        #sec-speed .sd-eyebrow { font-size: var(--text-md); font-weight: 600; color: var(--text-sec); text-transform: none; letter-spacing: 0; }
        #sec-speed .sd-dns-tag { display: none; }
        #sec-speed .sd-dns-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
        #sec-speed .sd-dns-row { display: contents; }
        #sec-speed .sd-rec-pill,
        #sec-speed .sd-ip { display: none; }
        #sec-speed .sd-dns-badge {
            display: inline-block;
            padding: var(--space-1) var(--space-2-5);
            border-radius: var(--radius-pill);
            font-size: var(--text-sm);
            font-weight: 600;
            background: var(--primary-soft);
            color: var(--primary);
            border: 1px solid var(--primary-ring);
        }
        .sd-isp-seg { display: none !important; }
        .sd-action-stack { display: none !important; }
        .sd-selection-bar { display: none !important; }
        #sdMoreSheet { display: none !important; }
        /* details/summary: keep inputs visible by hiding the summary chrome and
           letting the body render as if it were the plain div it replaced. */
        #sec-speed .sd-custom-fold > .sd-custom-summary { display: none !important; }
        #sec-speed .sd-custom-fold .sd-custom-body { display: block !important; }
        #sec-speed .sd-custom-fold[open] .sd-custom-body,
        #sec-speed .sd-custom-fold:not([open]) .sd-custom-body { display: block !important; }
        /* Latency-bar markup is added by the mobile shim; on desktop, fall back
           to the plain text the original code expected. */
        #sec-speed .sd-lat-wrap { display: none !important; }
        #sec-speed .sd-lat-fallback { display: inline; color: inherit; }
        /* \u4F18\u9009CDN ms chip looks fine on desktop \u2014 strip the pill background so
           it reads as plain text in the original layout. */
        #sec-speed .sd-od-ms {
            display: inline; padding: 0; background: transparent !important; color: inherit;
            font-family: inherit; font-weight: inherit; font-size: inherit;
        }
    }
`;

// src/ui/login.js
var LOGIN_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>\u7CFB\u7EDF\u6388\u6743</title>
    <style>
        ${CSS_COMMON}
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; margin: 0; background: #f0f2f5; position: relative; overflow-x: hidden; }
        body::before, body::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
        body::before { top: -120px; right: -80px; width: 320px; height: 320px; background: radial-gradient(circle, var(--primary-glow), transparent 70%); }
        body::after { bottom: -100px; left: -100px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(88,86,214,0.18), rgba(88,86,214,0) 70%); }
        /* v2.5.0: desktop login refreshed in iOS-native voice \u2014 gradient
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
        <div class="login-eyebrow">\u53CD\u4EE3\u6838\u5FC3 \xB7 \u5B89\u5168\u4E2D\u5FC3</div>
        <h2>\u6B22\u8FCE\u56DE\u6765</h2>
        <p class="login-sub">\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u94A5\u7EE7\u7EED\u3002<br>\u672A\u6388\u6743\u8BBF\u95EE\u5C06\u88AB\u81EA\u52A8\u62D2\u7EDD\u5E76\u8BB0\u5F55\u3002</p>
        <input type="password" id="tokenInput" placeholder="\u8BF7\u8F93\u5165\u5BC6\u94A5 TOKEN" onkeydown="if(event.key==='Enter') login()">
        <button onclick="login()">\u9A8C \u8BC1 \u767B \u5F55</button>
        <div class="login-foot">v${CURRENT_VERSION} \xB7 Cloudflare Worker<br>\u4EC5\u4F9B\u5B66\u4E60\u4E0E\u6280\u672F\u6D4B\u8BD5\u4F7F\u7528</div>
    </div>
    <script>
        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2000);
        }
        function login() {
            const token = document.getElementById('tokenInput').value.trim();
            if(!token) return showToast('\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u5BC6\u94A5');
            document.cookie = 'admin_token=' + encodeURIComponent(token) + '; path=/; max-age=2592000;';
            window.location.reload();
        }
    <\/script>
</body>
</html>
`;

// src/ui/dashboard.js
var HTML_UI = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Emby \u53CD\u4EE3\u9762\u677F</title>
    <style>${CSS_COMMON}</style>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
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
            <button class="wu-close" onclick="closeWorkerUpdate()" aria-label="\u5173\u95ED">\u2716</button>
            <h2 class="wu-title">\u{1F680} \u4E00\u952E\u8986\u76D6/\u66F4\u65B0 Worker \u6838\u5FC3\u5C42\u4EE3\u7801</h2>
            <div class="wu-warning">\u26A0\uFE0F \u8B66\u544A\uFF1A\u63D0\u4EA4\u9519\u8BEF\u7684\u4EE3\u7801\u4F1A\u5BFC\u81F4\u9762\u677F\u77AC\u95F4\u5D29\u6E83\uFF08500 \u9519\u8BEF\uFF09\u3002\u8BF7\u786E\u4FDD\u4EE3\u7801\u5DF2\u5728\u672C\u5730\u6D4B\u8BD5\u901A\u8FC7\uFF01</div>
            <textarea id="codeArea" class="wu-textarea" rows="8" placeholder="\u65B9\u5F0F\u4E00\uFF1A\u5728\u6B64\u5904\u76F4\u63A5\u7C98\u8D34\u4FEE\u6539\u597D\u7684\u6700\u65B0\u4EE3\u7801\u5168\u6587..."></textarea>
            <div class="row-end">
                <span class="wu-label">\u6216 \u65B9\u5F0F\u4E8C\uFF1A</span>
                <input type="file" id="fileInput" class="wu-file-input" accept=".js">
                <button type="button" class="btn-tier is-danger row-end-spacer" id="deployBtn" onclick="deployWorker()">\u7ACB\u5373\u8986\u76D6\u90E8\u7F72\u5E76\u91CD\u542F\u8282\u70B9</button>
            </div>
        </div>
    </div>

    <div class="app-shell">
        <!-- ===== \u4FA7\u8FB9\u680F ===== -->
        <aside class="sidebar" id="appSidebar">
            <div class="sidebar-brand">
                <div class="sidebar-logo" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div class="sidebar-brand-text">
                    <div class="sidebar-brand-title">\u53CD\u4EE3\u6838\u5FC3 \xB7 \u5B89\u5168\u4E2D\u5FC3</div>
                    <div class="sidebar-brand-sub">Emby \u53CD\u5411\u4EE3\u7406\u7BA1\u7406\u55B5\u677F</div>
                </div>
            </div>
            <nav class="sidebar-nav">
                <button type="button" class="nav-item is-active" data-section="overview" onclick="showSection('overview')">
                    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                    <span>\u6982\u89C8</span>
                </button>
                <button type="button" class="nav-item" data-section="speed" onclick="showSection('speed')">
                    <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <span>\u7EBF\u8DEF\u6D4B\u901F &amp; DNS</span>
                </button>
                <button type="button" class="nav-item" data-section="stats" onclick="showSection('stats')">
                    <svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
                    <span>\u6570\u636E\u7EDF\u8BA1</span>
                </button>
                <button type="button" class="nav-item" data-section="embyStatus" onclick="showSection('embyStatus')">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>\u8282\u70B9\u72B6\u6001</span>
                </button>
                <button type="button" class="nav-item" data-section="settings" onclick="showSection('settings')">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>\u7CFB\u7EDF\u8BBE\u7F6E</span>
                </button>
                <button type="button" class="nav-item" data-section="tools" onclick="showSection('tools')">
                    <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    <span>\u5DE5\u5177\u7BB1</span>
                </button>
                <button type="button" class="nav-item is-danger-tab" data-section="danger" onclick="showSection('danger')">
                    <svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>\u5371\u9669\u533A</span>
                </button>
            </nav>
            <div class="sidebar-foot">
                <button type="button" class="sidebar-collapse" id="sidebarCollapseBtn" onclick="toggleSidebar()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
                    <span>\u6536\u8D77\u4FA7\u680F</span>
                </button>
                <div class="sidebar-version">v${CURRENT_VERSION}</div>
            </div>
        </aside>

        <div class="app-main">
            <!-- ===== \u9876\u90E8\u72B6\u6001\u680F (\u4FDD\u7559 #cf-trace-card \u4F9B JS \u4F7F\u7528) ===== -->
            <header id="cf-trace-card" class="topbar">
                <div class="tb-stat" title="\u4F60\u7684\u8BBE\u5907\u5230\u4E91\u7AEF\u8FB9\u7F18\u8282\u70B9\u7684\u771F\u5B9E\u5F80\u8FD4\u5EF6\u8FDF">
                    <span class="dot green" id="rttDot"></span>
                    <span class="lbl">\u8FD0\u884C</span>
                    <span class="val" id="rttValue">\u6D4B\u7B97\u4E2D</span>
                </div>
                <div class="tb-stat">
                    <span class="lbl">\u8282\u70B9</span>
                    <span class="val" id="tb-node-count">--</span>
                </div>
                <div class="tb-stat">
                    <span class="lbl">\u4ECA\u65E5\u6D41\u91CF</span>
                    <span class="val" id="tb-traffic-today">--</span>
                </div>
                <div class="tb-stat" id="tb-health">
                    <span class="dot green" id="tb-health-dot"></span>
                    <span class="lbl">\u5065\u5EB7\u5EA6</span>
                    <span class="val" id="tb-health-val">--</span>
                </div>
                <div class="tb-stat pill expandable is-clickable" id="placePill" onclick="togglePlacementDrawer()">
                    <span class="lbl">\u8C03\u5EA6</span>
                    <span id="placeModeLabel">\u667A\u80FD</span>
                    <span class="caret">\u25BE</span>
                </div>
                <span class="val" id="trace-entry" style="display:none;">--</span>
                <span class="val" id="trace-egress" style="display:none;">--</span>

                <div class="topbar-spacer"><span class="tb-section-title" id="tbSectionTitle"></span></div>

                <a class="tb-icon-btn" href="/status" target="_blank" rel="noopener" title="\u6253\u5F00\u516C\u5F00\u72B6\u6001\u9875" aria-label="\u6253\u5F00\u516C\u5F00\u72B6\u6001\u9875" style="text-decoration:none;">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                </a>
                <button class="tb-icon-btn" onclick="openWorkerUpdate()" title="\u66F4\u65B0 Worker \u6838\u5FC3\u4EE3\u7801" aria-label="\u66F4\u65B0 Worker \u6838\u5FC3\u4EE3\u7801">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <button class="tb-icon-btn" id="themeToggle" onclick="toggleDarkMode()" data-theme="auto" title="\u5207\u6362\u4E3B\u9898" aria-label="\u5207\u6362\u4E3B\u9898">
                    <span class="ico ico-auto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg></span>
                    <span class="ico ico-light"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg></span>
                    <span class="ico ico-dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
                </button>
                <div class="topbar-user">
                    <span class="ava">A</span>
                    <span>admin</span>
                    <button class="tb-icon-btn danger is-sm" onclick="logout()" title="\u9000\u51FA\u7CFB\u7EDF" aria-label="\u9000\u51FA\u7CFB\u7EDF">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/></svg>
                    </button>
                </div>
            </header>

            <!-- Slim, dismissable update banner -->
            <div id="updateAlert" class="tb-banner" style="display: none; margin: 14px 24px 0;">
                <span class="b-tag">NEW</span>
                <span class="b-msg" id="updateMsg">\u5F53\u524D\u7248\u672C: v1.0.0 | \u6700\u65B0\u7248\u672C: v?.?.?</span>
                <button class="b-cta" id="onlineUpdateBtn" onclick="doOnlineUpdate()">\u4E00\u952E\u5347\u7EA7</button>
                <button class="b-dismiss" onclick="document.getElementById('updateAlert').style.display='none'" title="\u5FFD\u7565">\u2715</button>
            </div>

            <!-- Placement drawer (collapsed by default) -->
            <div class="tb-drawer banner-spaced" id="placeDrawer" >
                <h3>Worker \u8C03\u5EA6\u6A21\u5F0F</h3>
                <div class="sub">\u63A7\u5236 Worker \u5B9E\u9645\u843D\u5730\u7684\u7269\u7406\u673A\u623F\uFF0C\u540E\u53F0\u5B89\u5168\u8C03\u5EA6\uFF0C\u4E0D\u66B4\u9732\u4EFB\u4F55\u79C1\u94A5</div>
                <div class="controls">
                    <select id="cf-mode-select" onchange="handleModeChange()">
                        <option value='{"mode":"smart"}'>\u{1F916} \u667A\u80FD\u8C03\u5EA6 (Smart Placement)</option>
                        <option value='{"mode":"off"}'>\u{1F30D} \u8FB9\u7F18\u8282\u70B9 (Edge - \u9ED8\u8BA4\u79BB\u8BBF\u5BA2\u8FD1)</option>
                        <optgroup label="\u{1F4CD} \u6307\u5B9A\u4E91\u5382\u5546\u7269\u7406\u673A\u623F\u843D\u5730">
                            <option value="aws">\u2601\uFE0F AWS (\u4E9A\u9A6C\u900A\u4E91)</option>
                            <option value="gcp">\u2601\uFE0F GCP (\u8C37\u6B4C\u4E91)</option>
                            <option value="azure">\u2601\uFE0F Azure (\u5FAE\u8F6F\u4E91)</option>
                        </optgroup>
                        <option value="custom">\u270F\uFE0F \u624B\u52A8\u8F93\u5165\u533A\u57DF\u4EE3\u7801...</option>
                    </select>
                    <select id="cf-region-select" style="display: none;"></select>
                    <input type="text" id="cf-custom-input" placeholder="\u8F93\u5165\u4E91\u4EE3\u7801 (\u5982 gcp:us-west1)" style="display: none;">
                    <button type="button" class="btn-tier is-primary" onclick="updatePlacement()">\u63D0\u4EA4\u4FEE\u6539</button>
                </div>
                <div class="status"><span id="place-status">\u{1F512} \u540E\u53F0\u5168\u81EA\u52A8\u5B89\u5168\u8C03\u5EA6\uFF0C\u4E0D\u66B4\u9732\u4EFB\u4F55\u79C1\u94A5</span></div>
            </div>

        <div class="content">

            <!-- iOS-native sticky compact bar (visible after large title scrolls away) -->
            <div id="mobileTopbarCompact" aria-hidden="true"></div>

            <!-- Mobile-only status pills (v5: 2\xD72 grid \u2014 RTT / \u5065\u5EB7 / \u6A21\u5F0F / \u4ECA\u65E5) -->
            <div class="m-pills" id="mobilePills" aria-label="\u79FB\u52A8\u7AEF\u72B6\u6001">
                <span class="m-pill"><span class="dot green" id="m-pill-rtt-dot"></span><span class="lbl">RTT</span><span class="val" id="m-pill-rtt">\u6D4B\u7B97\u4E2D</span></span>
                <span class="m-pill"><span class="dot green" id="m-pill-health-dot"></span><span class="lbl">\u5065\u5EB7</span><span class="val" id="m-pill-health">--</span></span>
                <span class="m-pill tappable" role="button" tabindex="0" onclick="openPlacementDrawerFromMobile()"><span class="lbl">\u6A21\u5F0F</span><span class="val" id="m-pill-mode">\u667A\u80FD</span><span class="caret" aria-hidden="true">\u25BE</span></span>
                <span class="m-pill strong"><span class="lbl">\u4ECA\u65E5</span><span class="val" id="m-pill-today">--</span></span>
            </div>

            <!-- ===== \u5206\u533A: \u6570\u636E\u7EDF\u8BA1 ===== -->
            <section id="sec-stats" class="app-section" data-section="stats" style="display:none;">
            <div class="card">
                <h2 style="margin-top:0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div class="flex-row-tight">
                        \u{1F4CA} \u6570\u636E\u7EDF\u8BA1 <span style="font-size:var(--text-base); font-weight: normal; color: var(--text-sec);">\u7CBE\u786E\u8BBF\u5BA2\u753B\u50CF\u5206\u6790</span>
                    </div>
                    <div style="font-size: var(--text-md); background: var(--primary-soft); color: var(--primary); padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--primary-ring); display: flex; gap: 15px; flex-wrap: wrap;">
                        <span> \u4ECA\u5929: <strong id="trafficToday">\u52A0\u8F7D\u4E2D...</strong></span>
                        <span>1\u5468\u5185: <strong id="traffic7d">\u52A0\u8F7D\u4E2D...</strong></span>
                        <span>1\u6708\u5185: <strong id="traffic30d">\u52A0\u8F7D\u4E2D...</strong></span>
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

                <h3 class="section-spacer-top">\u{1F575}\uFE0F \u6700\u65B0\u72EC\u7ACB\u64AD\u653E\u8BB0\u5F55 <span style="font-size:var(--text-sm); color:var(--text-sec);">(\u4EC5\u62E6\u622A PlaybackInfo \u771F\u5B9E\u64AD\u653E)</span></h3>
                <div class="table-wrapper">
                    <table class="w-full">
                        <thead><tr><th>\u8BBF\u95EE\u65F6\u95F4</th><th>\u76EE\u6807\u8282\u70B9</th><th>\u771F\u5B9E IP \u5730\u5740</th><th>\u5F52\u5C5E\u5730</th><th>\u5BA2\u6237\u7AEF/\u8BBE\u5907\u6807\u8BC6 (User-Agent)</th></tr></thead>
                        <tbody id="logTableBody"><tr><td colspan="5" class="cell-loading">\u52A0\u8F7D\u6570\u636E\u4E2D...</td></tr></tbody>
                    </table>
                </div>
            </div>
            </section><!-- /sec-stats -->

            <!-- ===== \u5206\u533A: \u7EBF\u8DEF\u6D4B\u901F ===== -->
            <section id="sec-speed" class="app-section" data-section="speed" style="display:none;">

            <!-- Mobile-only iOS large-title header (v2.6.0) -->
            <header class="ios-page-header sd-page-header" aria-hidden="false">
                <h1 class="ios-large-title">\u6D4B\u901F &amp; DNS</h1>
                <p class="sd-page-sub">\u8282\u70B9\u5EF6\u8FDF\u4E0E\u89E3\u6790\u63A2\u6D4B</p>
            </header>

            <div class="card" id="speed-anchor">
                <div class="section-header-row">
                    <h2 class="section-title">\u26A1 \u4E13\u5C5E\u7EBF\u8DEF\u6D4B\u901F\u4E0E\u52A8\u6001 DNS \u89E3\u6790</h2>
                </div>
                
                <div class="sd-dns-card" id="dnsStatusCard">
                    <div class="sd-dns-head">
                        <span class="sd-eyebrow">\u{1F4E1} \u5F53\u524D\u751F\u6548\u89E3\u6790</span>
                        <span class="sd-dns-tag" id="sd-dns-tag">DNS</span>
                    </div>
                    <div id="dnsStatus" class="flex-wrap-tight">
                        <span class="text-muted">\u52A0\u8F7D\u4E2D...</span>
                    </div>
                </div>

                <!-- Mobile-only ISP segmented control (v2.6.0) -->
                <nav class="sd-isp-seg" role="tablist" aria-label="ISP \u7B5B\u9009">
                    <button type="button" role="tab" data-value="all" aria-selected="true">\u7EFC\u5408</button>
                    <button type="button" role="tab" data-value="\u7535\u4FE1" aria-selected="false">\u7535\u4FE1</button>
                    <button type="button" role="tab" data-value="\u8054\u901A" aria-selected="false">\u8054\u901A</button>
                    <button type="button" role="tab" data-value="\u79FB\u52A8" aria-selected="false">\u79FB\u52A8</button>
                    <button type="button" role="tab" data-value="\u591A\u7EBF" aria-selected="false">\u591A\u7EBF</button>
                    <button type="button" role="tab" data-value="ipv6" aria-selected="false">IPv6</button>
                    <button type="button" role="tab" data-value="\u4F18\u9009" aria-selected="false">\u4F18\u9009</button>
                </nav>

                <div class="toolbar">
                    <select id="ipType" style="font-weight: 600; color: var(--primary); padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--card);">
                        <option value="all">\u7EFC\u5408\u6DF7\u5408\u6E90</option>
                        <option value="\u7535\u4FE1">\u7535\u4FE1\u4E13\u5C5E</option>
                        <option value="\u8054\u901A">\u8054\u901A\u4E13\u5C5E</option>
                        <option value="\u79FB\u52A8">\u79FB\u52A8\u4E13\u5C5E</option>
                        <option value="\u591A\u7EBF">\u591A\u7EBF BGP</option>
                        <option value="ipv6">IPv6 \u8282\u70B9</option>
                        <option value="\u4F18\u9009">\u9876\u5C16\u4F18\u9009\u5E93</option>
                    </select>

                    <button type="button" class="btn-tier is-primary" id="btnFetchRemote" onclick="fetchRemoteAndTest()">\u63D0\u53D6\u9884\u8BBE\u6E90\u5E76\u6D4B\u901F</button>
                    <button type="button" class="btn-tier" id="btnTestCustom" onclick="testCustomIPs()">\u6D4B\u8BD5\u7C98\u8D34\u8282\u70B9</button>
                    <button type="button" class="btn-tier" id="btnFetchCustomApi" onclick="fetchCustomApiAndTest()">\u62C9\u53D6 API</button>

                    <span class="v-sep"></span>

                    <button type="button" class="btn-tier is-success" id="btnSelectedDns" onclick="updateSelectedToDns()">\u63D0\u4EA4\u9009\u4E2D\u81F3 DNS</button>

                    <span class="v-sep"></span>

                    <div class="menu-wrap">
                        <button type="button" class="btn-tier" onclick="toggleMenu(this)">\u66F4\u591A <svg><use href="#i-chevron"/></svg></button>
                        <div class="menu">
                            <button type="button" onclick="batchTcpPing(); closeAllMenus();">\u590D\u5236\u53BB ITDog</button>
                            <button type="button" id="btnDirectCname" onclick="directSubmitCname(); closeAllMenus();">\u76F4\u63A8 CNAME (\u514D\u6D4B\u901F)</button>
                            <button type="button" id="btnTop3Dns" onclick="updateTop3ToDns(); closeAllMenus();">\u66F4\u65B0 TOP3 \u81F3 DNS</button>
                            <hr/>
                            <button type="button" class="danger" onclick="clearTest(); closeAllMenus();">\u6E05\u7A7A\u5217\u8868</button>
                        </div>
                    </div>
                </div>

                <!-- Mobile-only primary CTA stack + overflow trigger (v2.6.0) -->
                <div class="sd-action-stack" aria-hidden="false">
                    <button type="button" class="sd-cta-primary" onclick="fetchRemoteAndTest()">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>\u63D0\u53D6\u9884\u8BBE\u6E90\u5E76\u6D4B\u901F</span>
                    </button>
                    <div class="sd-action-row">
                        <button type="button" class="sd-cta-ghost" onclick="testCustomIPs()">\u6D4B\u8BD5\u7C98\u8D34</button>
                        <button type="button" class="sd-cta-ghost" onclick="fetchCustomApiAndTest()">\u62C9\u53D6 API</button>
                        <button type="button" class="sd-cta-more" onclick="openSdMoreSheet()" aria-label="\u66F4\u591A\u64CD\u4F5C">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
                        </button>
                    </div>
                </div>

                <details class="sd-custom-fold">
                    <summary class="sd-custom-summary">
                        <span>\u81EA\u5B9A\u4E49\u6765\u6E90</span>
                        <svg class="sd-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </summary>
                    <div class="sd-custom-body" style="background: rgba(120,120,120,0.05); padding: 14px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px;">
                        <input type="text" id="customApiUrl" value="https://ip.v2too.top/api/nodes" placeholder="\u81EA\u5B9A\u4E49 JSON / \u6587\u672C API \u94FE\u63A5\uFF08\u4F9B\u300C\u62C9\u53D6 API\u300D\u4F7F\u7528\uFF09" style="width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); background:var(--card); margin-bottom: 10px;">
                        <textarea id="customIps" rows="2" placeholder="\u5728\u6B64\u7C98\u8D34\u81EA\u5B9A\u4E49 IPv4 / IPv6 / \u4F18\u9009\u57DF\u540D\uFF08\u4F9B\u300C\u6D4B\u8BD5\u7C98\u8D34\u8282\u70B9\u300D\u4F7F\u7528\uFF0C\u81EA\u52A8\u63D0\u53D6\uFF09" style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-family: monospace; resize: vertical; background:var(--card);"></textarea>
                    </div>
                </details>
                
                <div id="statusText" style="line-height: 1.6; font-size: var(--text-base); color: var(--text-sec); margin-bottom: 16px; padding: 12px 16px; background: var(--ok-soft); border-radius: var(--radius-md); border-left: 4px solid var(--ok);">
                    \u{1F4A1} \u6D4B\u901F\u5B8C\u6210\u540E\uFF0C\u53EF\u52FE\u9009\u590D\u9009\u6846\u81EA\u7531\u7EC4\u5408\uFF0C\u70B9\u51FB\u3010\u63D0\u4EA4\u9009\u4E2D\u8282\u70B9\u81F3 DNS\u3011\u81EA\u52A8\u5206\u53D1\u3002
                </div>

                <div class="table-wrapper">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="col-w40"><input type="checkbox" id="selectAll" class="ip-checkbox" onclick="toggleSelectAll()"></th>
                                <th>\u4E13\u5C5E\u8282\u70B9 (\u70B9\u51FB\u590D\u5236)</th>
                                <th>\u9884\u4F30\u5EF6\u8FDF</th>
                                <th>\u8FDE\u901A\u72B6\u6001</th>
                                <th>\u8BB0\u5F55\u7C7B\u578B/\u5F52\u5C5E\u5730</th>
                                <th>\u5355\u8282\u70B9\u64CD\u4F5C</th>
                            </tr>
                        </thead>
                        <tbody id="testTableBody">
                            <tr><td colspan="6" class="text-center-muted">\u6682\u65E0\u6570\u636E\uFF0C\u8BF7\u62C9\u53D6\u8282\u70B9\u6216\u8F93\u5165\u81EA\u5B9A\u4E49 IP/\u57DF\u540D \u6D4B\u8BD5</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Mobile-only floating selection bar (v2.6.0) -->
                <div class="sd-selection-bar" id="sdSelectionBar" hidden>
                    <span class="sd-sel-label">\u5DF2\u9009 <strong id="sdSelCount">0</strong> \u4E2A</span>
                    <button type="button" class="sd-sel-btn" onclick="updateSelectedToDns()">\u63D0\u4EA4\u81F3 DNS
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            </div>

            <!-- ===== F4: \u4F18\u9009 CDN \u57DF\u540D + \u4E00\u952E DNS CNAME ===== -->
            <div class="card mt-4" >
                <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                    <h2 class="section-title">\u{1F31F} \u4F18\u9009 CDN \u57DF\u540D + \u4E00\u952E DNS CNAME</h2>
                    <div class="flex-wrap-tight">
                        <button type="button" class="btn-tier is-primary" onclick="speedtestOptimizedDomains('client')">\u5168\u90E8\u6D4B\u901F (\u672C\u5730)</button>
                        <button type="button" class="btn-tier" onclick="speedtestOptimizedDomains('edge')" title="\u4ECE Worker \u673A\u623F\u6D4B\uFF0C\u4EC5\u4F9B\u53C2\u8003">Edge \u6D4B\u901F</button>
                        <button type="button" class="btn-tier is-success" onclick="runDownloadSpeedtest()" title="\u6D4B\u5F53\u524D DNS \u8DEF\u5F84\u7684\u5B9E\u9645\u4E0B\u8F7D\u5E26\u5BBD">\u2B07\uFE0F \u5F53\u524D\u8DEF\u5F84\u5E26\u5BBD</button>
                        <button type="button" class="btn-tier" onclick="addOptimizedDomain()">+ \u6DFB\u52A0\u81EA\u5B9A\u4E49</button>
                    </div>
                    <div id="downloadSpeedResult" style="margin-top:10px; font-size:var(--text-md); color:var(--text-sec);"></div>
                </div>
                <div class="table-wrapper">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th>\u57DF\u540D</th>
                                <th>\u5907\u6CE8</th>
                                <th class="col-w60">\u5185\u7F6E</th>
                                <th class="col-w60">\u542F\u7528</th>
                                <th class="col-w90">\u4E0A\u6B21\u6D4B\u901F</th>
                                <th style="width:180px;">\u64CD\u4F5C</th>
                            </tr>
                        </thead>
                        <tbody id="optimizedDomainsBody">
                            <tr><td colspan="6" class="text-center-muted">\u52A0\u8F7D\u4E2D...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="dnsReadyHint" style="margin-top:14px; padding:10px 14px; border-radius:var(--radius-md); font-size:var(--text-md);"></div>
            </div>

            <!-- ===== F3: \u91CD\u5B9A\u5411\u767D\u540D\u5355 ===== -->
            <div class="card mt-4" >
                <h2 style="margin:0 0 10px 0; font-size:var(--text-2xl);">\u{1F501} 3xx \u91CD\u5B9A\u5411\u76F4\u901A\u767D\u540D\u5355</h2>
                <div style="font-size:var(--text-md); color:var(--text-sec); margin-bottom:10px;">\u547D\u4E2D\u4EE5\u4E0B\u57DF\u540D\uFF08\u6216\u5176\u5B50\u57DF\u540D\uFF09\u7684 302/301 Location \u5C06\u76F4\u63A5\u900F\u4F20\u7ED9\u5BA2\u6237\u7AEF\uFF0C\u8DF3\u8FC7\u4EE3\u7406\u91CD\u5199\u3002\u6BCF\u884C\u4E00\u4E2A host\u3002</div>
                <textarea id="manualRedirectDomainsInput" rows="6" style="width:100%; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--card); font-family:monospace;"></textarea>
                <div style="margin-top:10px;">
                    <button type="button" class="btn-tier is-primary" onclick="saveManualRedirectDomains()">\u4FDD\u5B58\u767D\u540D\u5355</button>
                </div>
            </div>

            <script>
            // F3: \u767D\u540D\u5355
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
                    if (data.success) { showToast('\u2705 \u767D\u540D\u5355\u5DF2\u4FDD\u5B58 (' + data.domains.length + ')'); loadManualRedirectDomains(); }
                    else showToast('\u274C \u4FDD\u5B58\u5931\u8D25: ' + (data.error || '\u672A\u77E5'));
                } catch (e) { showToast('\u274C ' + e.message); }
            }

            // F4: \u4F18\u9009\u57DF\u540D
            let _lastSpeedtest = {}; // id -> {ms, ok}
            async function loadOptimizedDomains() {
                try {
                    const res = await fetch('/api/optimized-domains');
                    const data = await res.json();
                    console.log('[optimized-domains] response:', data);
                    if (!data.success) {
                        const body = document.getElementById('optimizedDomainsBody');
                        if (body) body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--err);">\u52A0\u8F7D\u5931\u8D25: ' + (data.error || '\u672A\u77E5') + '</td></tr>';
                        return;
                    }
                    renderOptimizedDomains(data.items || []);
                } catch (e) {
                    console.error('[optimized-domains] load error:', e);
                    const body = document.getElementById('optimizedDomainsBody');
                    if (body) body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--err);">JS \u5F02\u5E38: ' + e.message + '</td></tr>';
                }
            }
            function renderOptimizedDomains(items) {
                const body = document.getElementById('optimizedDomainsBody');
                if (!body) { console.warn('[optimized-domains] body element not found'); return; }
                if (!items.length) { body.innerHTML = '<tr><td colspan="6" class="text-center-muted">\u6682\u65E0</td></tr>'; return; }
                const dnsReady = _dnsReady;
                body.innerHTML = items.map(it => {
                    const live = _lastSpeedtest[it.id];
                    const ms = live ? (live.ok ? live.ms + ' ms' : '\u5931\u8D25') : (it.last_ms > 0 ? it.last_ms + ' ms' : (it.last_ms === -1 ? '-' : it.last_ms));
                    const replaceBtnDisabled = !dnsReady;
                    const replaceBtnTitle = dnsReady ? '\u5C06 DNS \u8BB0\u5F55\u7684 CNAME \u66FF\u6362\u4E3A\u6B64\u57DF\u540D' : '\u8BF7\u5148\u5728 Worker \u73AF\u5883\u53D8\u91CF\u4E2D\u914D\u7F6E CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN';
                    // ms-chip class drives mobile color-coded chip; falls back to plain text on desktop.
                    const liveMs = live ? (live.ok ? live.ms : 99999) : (typeof it.last_ms === 'number' ? it.last_ms : 99999);
                    let msCls = 'is-idle';
                    if (typeof liveMs === 'number' && liveMs >= 0 && liveMs < 99999) {
                        if (liveMs < 150) msCls = 'is-ok';
                        else if (liveMs < 400) msCls = 'is-warn';
                        else msCls = 'is-err';
                    }
                    return '<tr class="sd-od-row">'
                        + '<td data-label="\u57DF\u540D"><code>' + it.domain + '</code></td>'
                        + '<td data-label="\u5907\u6CE8">' + (it.note || '') + '</td>'
                        + '<td data-label="\u5185\u7F6E" class="text-center">' + (it.builtin ? '\u2713' : '') + '</td>'
                        + '<td data-label="\u542F\u7528" class="text-center"><input type="checkbox" ' + (it.enabled ? 'checked' : '') + ' onchange="toggleOptimizedDomain(' + it.id + ', this.checked)"></td>'
                        + '<td data-label="\u4E0A\u6B21\u6D4B\u901F" class="text-center"><span class="sd-od-ms ' + msCls + '">' + ms + '</span></td>'
                        + '<td data-label="\u64CD\u4F5C">'
                          + '<button type="button" class="btn-tier is-success is-disabled" ' + (replaceBtnDisabled ? 'disabled ' : '') + ' title="' + replaceBtnTitle + '" onclick="replaceDns(&#39;' + it.domain + '&#39;)">\u{1F504} \u66FF\u6362DNS</button> '
                          + (!it.builtin ? '<button type="button" class="btn-tier danger" onclick="deleteOptimizedDomain(' + it.id + ')">\u5220\u9664</button>' : '')
                        + '</td>'
                        + '</tr>';
                }).join('');
            }
            async function toggleOptimizedDomain(id, enabled) {
                await fetch('/api/optimized-domains/' + id, { method: 'PATCH', body: JSON.stringify({ enabled }) });
            }
            async function deleteOptimizedDomain(id) {
                if (!confirm('\u786E\u5B9A\u5220\u9664\u6B64\u81EA\u5B9A\u4E49\u57DF\u540D\uFF1F')) return;
                const res = await fetch('/api/optimized-domains/' + id, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) { showToast('\u{1F5D1}\uFE0F \u5DF2\u5220\u9664'); loadOptimizedDomains(); }
                else showToast('\u274C ' + (data.error || '\u5931\u8D25'));
            }
            async function addOptimizedDomain() {
                const domain = prompt('\u8F93\u5165\u81EA\u5B9A\u4E49\u4F18\u9009\u57DF\u540D\uFF08\u5982 example.com\uFF09\uFF1A');
                if (!domain) return;
                const note = prompt('\u5907\u6CE8\uFF08\u53EF\u7A7A\uFF09\uFF1A') || '';
                const res = await fetch('/api/optimized-domains', { method: 'POST', body: JSON.stringify({ domain, note }) });
                const data = await res.json();
                if (data.success) { showToast('\u2705 \u5DF2\u6DFB\u52A0'); loadOptimizedDomains(); }
                else showToast('\u274C ' + (data.error || '\u5931\u8D25'));
            }
            // \u4E0B\u8F7D\u6D4B\u901F\uFF1A\u62C9\u81EA\u5DF1 Worker \u7684 /api/speedtest-down\uFF0C\u6D4B\u5BA2\u6237\u7AEF\u2192\u5F53\u524D CF \u5165\u53E3\u2192Worker \u7684\u6709\u6548\u5E26\u5BBD
            async function runDownloadSpeedtest() {
                const resEl = document.getElementById('downloadSpeedResult');
                resEl.innerHTML = '\u23F1 \u6D4B\u901F\u4E2D\uFF08\u4E0B\u8F7D 10MB\uFF09...';
                try {
                    const bytes = 10 * 1024 * 1024;
                    const start = performance.now();
                    const res = await fetch('/api/speedtest-down?bytes=' + bytes + '&_=' + Date.now(), { cache: 'no-store' });
                    if (!res.ok) { resEl.innerHTML = '\u274C \u7AEF\u70B9\u8FD4\u56DE ' + res.status; return; }
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
                    resEl.innerHTML = '\u2705 \u4E0B\u8F7D ' + (received / 1048576).toFixed(2) + ' MiB \u7528\u65F6 ' + (elapsedMs / 1000).toFixed(2) + ' \u79D2 \u2192 <b>' + mbps.toFixed(2) + ' Mbps</b> (' + mibps.toFixed(2) + ' MiB/s)';
                    showToast('\u2705 \u5F53\u524D\u8DEF\u5F84\u5E26\u5BBD: ' + mbps.toFixed(1) + ' Mbps');
                } catch (e) {
                    resEl.innerHTML = '\u274C \u6D4B\u901F\u5931\u8D25: ' + e.message;
                }
            }

            // \u5BA2\u6237\u7AEF\u4FA7\u6D4B\u901F\uFF1A\u5148 fetch no-cors\uFF0C\u5931\u8D25\u56DE\u9000\u5230 Image() \u52A0\u8F7D\uFF08\u517C\u5BB9\u66F4\u591A\u76EE\u6807\uFF09
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
                    // onerror \u4E5F\u7B97"\u901A\u4E86"\uFF1A\u8BF4\u660E TCP/TLS \u5DF2\u7ECF\u63E1\u624B\u6210\u529F\uFF0C\u53EA\u662F\u8D44\u6E90\u4E0D\u662F\u56FE\u7247
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
                    console.log('[probe] fetch failed for', domain, e.message, '\u2014 fallback to Image');
                    return await clientProbeImage(domain, timeoutMs);
                }
            }
            async function speedtestOptimizedDomains(mode) {
                mode = mode || 'client';
                showToast('\u23F1 ' + (mode === 'client' ? '\u672C\u5730' : 'Edge') + '\u6D4B\u901F\u4E2D...');
                let measured = [];
                if (mode === 'edge') {
                    const res = await fetch('/api/optimized-domains/speedtest', { method: 'POST', body: '{}' });
                    const data = await res.json();
                    if (!data.success) { showToast('\u274C ' + (data.error || '\u6D4B\u901F\u5931\u8D25')); return; }
                    measured = data.items || [];
                } else {
                    // \u5BA2\u6237\u7AEF\uFF1A\u5148\u53D6\u542F\u7528\u57DF\u540D\u5217\u8868
                    const listRes = await fetch('/api/optimized-domains');
                    const listData = await listRes.json();
                    if (!listData.success) { showToast('\u274C \u62C9\u53D6\u57DF\u540D\u5931\u8D25'); return; }
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
                showToast('\u2705 ' + (mode === 'client' ? '\u672C\u5730' : 'Edge') + '\u6D4B\u901F\u5B8C\u6210\uFF0C\u5DF2\u6309\u5EF6\u8FDF\u6392\u5E8F');
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
                            hint.innerHTML = '\u2705 DNS \u66FF\u6362\u5DF2\u5C31\u7EEA (\u57DF\u540D: <code>' + (data.domain || '?') + '</code>) \u2014 \u70B9\u8868\u683C\u91CC\u7684 "\u{1F504} \u66FF\u6362DNS" \u5373\u53EF\u5E94\u7528';
                        } else {
                            hint.style.background = 'rgba(255,149,0,0.1)';
                            hint.style.border = '1px solid rgba(255,149,0,0.3)';
                            hint.innerHTML = '\u26A0\uFE0F \u7F3A\u5C11\u73AF\u5883\u53D8\u91CF <code>CF_API_TOKEN</code> / <code>CF_ZONE_ID</code> / <code>CF_DOMAIN</code>\uFF0C\u65E0\u6CD5\u66FF\u6362 DNS\u3002\u8BF7\u5230 Cloudflare Worker \u8BBE\u7F6E\u4E2D\u8865\u9F50\u3002';
                        }
                    }
                } catch (e) { _dnsReady = false; }
            }
            async function replaceDns(domain) {
                if (!confirm('\u786E\u5B9A\u5C06 DNS \u8BB0\u5F55\u7684 CNAME \u5185\u5BB9\u66FF\u6362\u4E3A ' + domain + ' ?')) return;
                const res = await fetch('/api/dns/replace', { method: 'POST', body: JSON.stringify({ domain }) });
                const data = await res.json();
                if (data.success) { showToast('\u2705 DNS \u5DF2\u66FF\u6362\u4E3A ' + data.content); loadDnsConfig(); }
                else showToast('\u274C ' + (data.error || '\u66FF\u6362\u5931\u8D25'));
            }

            // \u9875\u9762\u52A0\u8F7D\u540E\u7ACB\u5373\u62C9\u4E00\u6B21\uFF08\u4E0D\u4F9D\u8D56\u5206\u533A\u53EF\u89C1\u6027\uFF09
            (function(){
                function _embycfInit() {
                    loadOptimizedDomains();
                    loadDnsConfig().then(() => loadOptimizedDomains()); // \u914D\u7F6E\u52A0\u8F7D\u5B8C\u540E\u91CD\u6E32\u67D3\u4EE5\u663E\u793A\u66FF\u6362\u6309\u94AE
                    loadManualRedirectDomains();
                }
                if (document.readyState === 'loading') {
                    window.addEventListener('DOMContentLoaded', _embycfInit);
                } else {
                    _embycfInit();
                }
            })();

            // ==========================================
            // === Mobile v5 \u2014 \u6D4B\u901F & DNS specialist drivers (v2.6.0) ===
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
                // Threshold: <150ms ok \xB7 <400ms warn \xB7 \u2265400ms err \xB7 9999 loading.
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
                    const valTxt = isLoading ? '\u6D4B\u7B97\u4E2D\u2026' : (ms + ' ms');
                    // Preserve original textual content for the desktop (which hides .sd-lat-wrap via CSS)
                    // by keeping a fallback .sd-lat-fallback span.
                    td.innerHTML = '<span class="sd-lat-wrap is-' + level + '" role="img" aria-label="\u5EF6\u8FDF ' + valTxt + '">'
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
            <\/script>

            <!-- Mobile-only overflow action sheet for \u6D4B\u901F & DNS (v2.6.0) -->
            <div id="sdMoreSheet" class="sd-more-sheet" aria-hidden="true">
                <div class="more-sheet-card" role="dialog" aria-modal="true" aria-label="\u66F4\u591A\u64CD\u4F5C">
                    <span class="more-sheet-grip" aria-hidden="true"></span>
                    <p class="more-sheet-title">\u6D4B\u901F &amp; DNS \xB7 \u66F4\u591A\u64CD\u4F5C</p>
                    <div class="more-sheet-list">
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); batchTcpPing();">
                            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="9" height="9" rx="2"/><rect x="12" y="12" width="9" height="9" rx="2"/></svg>
                            <span>\u590D\u5236\u53BB ITDog</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); directSubmitCname();">
                            <svg viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"/><line x1="18" y1="12" x2="6" y2="12"/></svg>
                            <span>\u76F4\u63A8 CNAME (\u514D\u6D4B\u901F)</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row" onclick="closeSdMoreSheet(); updateTop3ToDns();">
                            <svg viewBox="0 0 24 24"><polyline points="12 19 12 5"/><polyline points="6 11 12 5 18 11"/></svg>
                            <span>\u66F4\u65B0 TOP3 \u81F3 DNS</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="more-sheet-row is-danger" onclick="closeSdMoreSheet(); clearTest();">
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            <span>\u6E05\u7A7A\u5217\u8868</span>
                            <svg class="ms-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                    <button type="button" class="sd-sheet-cancel" onclick="closeSdMoreSheet()">\u53D6\u6D88</button>
                </div>
            </div>

            </section><!-- /sec-speed -->

            <!-- ===== \u5206\u533A: \u7CFB\u7EDF\u8BBE\u7F6E ===== -->
            <section id="sec-settings" class="app-section" data-section="settings" style="display:none;">

            <div class="card" id="settings-anchor">
                <div style="display:flex; justify-content: space-between; align-items:flex-start; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
                    <div>
                        <h2 style="margin:0; font-size:var(--text-2xl); letter-spacing:-0.01em;">\u90E8\u7F72\u53CD\u4EE3\u8282\u70B9</h2>
                        <div style="color:var(--text-sec); font-size:var(--text-md); margin-top:4px;">\u586B\u5199\u4E0B\u65B9\u4FE1\u606F\u540E\u4FDD\u5B58\u3002\u6BCF\u4E2A\u8282\u70B9\u5360\u7528\u4E00\u4E2A URL \u524D\u7F00\u3002</div>
                    </div>
                    <div class="menu-wrap">
                        <button type="button" class="btn-tier is-sm" onclick="toggleMenu(this)"><svg><use href="#i-more"/></svg>\u914D\u7F6E\u5DE5\u5177 <svg><use href="#i-chevron"/></svg></button>
                        <div class="menu">
                            <button type="button" onclick="exportConfig(); closeAllMenus();"><svg><use href="#i-download"/></svg>\u5BFC\u51FA\u5F53\u524D\u914D\u7F6E</button>
                            <button type="button" onclick="importConfig(); closeAllMenus();"><svg><use href="#i-upload"/></svg>\u5BFC\u5165\u914D\u7F6E</button>
                        </div>
                    </div>
                </div>

                <form id="addForm" class="a-form">
                    <input type="hidden" id="oldPrefix" value="">

                    <!-- 1. \u57FA\u7840\u4FE1\u606F -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u57FA\u7840\u4FE1\u606F</span>
                            <span class="a-field-aux">\u5907\u6CE8\u7528\u4E8E\u663E\u793A\uFF0C\u524D\u7F00\u51B3\u5B9A\u8BBF\u95EE\u8DEF\u5F84</span>
                        </div>
                        <div class="a-row">
                            <input class="a-input" type="text" id="remark" placeholder="\u8282\u70B9\u5907\u6CE8 (\u5982: Misaka\u670D)" required>
                            <input class="a-input" type="text" id="prefix" placeholder="\u77ED\u8DEF\u5F84\u540E\u7F00 (\u5982: misaka)" required>
                            <select class="a-select" id="mode">
                                <option value="off">\u4FDD\u5B88 (\u62B9\u9664IP)</option>
                                <option value="realip_only">\u4E25\u683C (\u900F\u4F20IP)</option>
                                <option value="dual">\u517C\u5BB9 (\u53CC\u91CD\u900F\u4F20)</option>
                                <option value="strict">\u5F3A\u529B (\u9632403)</option>
                            </select>
                        </div>
                    </div>

                    <!-- 2. \u4E0A\u6E38\u7EBF\u8DEF -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u4E0A\u6E38\u7EBF\u8DEF</span>
                            <span class="a-field-aux">\u4E3B\u6E90\u5931\u8D25\u65F6\u6309\u987A\u5E8F\u56DE\u9000\u5230\u5907\u7528\uFF0C\u652F\u6301\u9B54\u6539\u5206\u79BB\u7248\u63A8\u6D41</span>
                        </div>
                        <div id="targetInputs" style="display:flex; flex-direction:column; gap:8px;">
                            <div class="a-upstream-row">
                                <span class="a-tag-pri">\u4E3B\u6E90</span>
                                <input type="url" class="a-input target-input" placeholder="\u4E3B\u7EBF\u8DEF\u5730\u5740 (\u5982: http://1.1.1.1:8096)" required oninput="handleTargetInputs()">
                            </div>
                            <div class="a-upstream-row">
                                <span class="a-tag-bk">\u5907 1</span>
                                <input type="url" class="a-input target-input" placeholder="\u5907\u7528\u7EBF\u8DEF 1 (\u9009\u586B\uFF0C\u4E3B\u6E90\u6302\u6389\u65F6\u89E6\u53D1)" oninput="handleTargetInputs()">
                            </div>
                        </div>
                        <button type="button" class="a-add-row" onclick="addBackupLine()"><svg><use href="#i-plus"/></svg>\u6DFB\u52A0\u5907\u7528\u7EBF\u8DEF</button>
                    </div>

                    <!-- 3. \u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934 -->
                    <div class="a-fieldset">
                        <div class="a-fieldset-head">
                            <span class="a-field-label">\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934</span>
                            <span class="a-field-aux">\u8F6C\u53D1\u5230\u4E0A\u6E38\u65F6\u9644\u52A0\uFF0C<span id="hed-count">0</span> \u6761\u5DF2\u542F\u7528</span>
                        </div>
                        <div class="hed" id="hed-editor">
                            <div class="hed-head">
                                <span></span><span>Header</span><span>Value</span>
                                <span style="text-align:center">\u542F\u7528</span><span></span>
                            </div>
                            <div class="hed-list" id="hed-list"></div>
                            <div class="hed-footer">
                                <button type="button" class="a-add-row" onclick="HeadersEditor.addRow()"><svg><use href="#i-plus"/></svg>\u6DFB\u52A0\u8BF7\u6C42\u5934</button>
                                <div class="hed-meta"><span class="dot"></span><span>\u81EA\u52A8\u5FFD\u7565\u7A7A\u884C / \u6CE8\u91CA (#) / \u91CD\u590D\u952E</span></div>
                            </div>
                            <div class="templates">
                                <span class="templates-label">\u5E38\u7528\u6A21\u677F\uFF1A</span>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('Authorization','Bearer ')">+ Authorization</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('Cookie','')">+ Cookie</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('X-Emby-Token','')">+ X-Emby-Token</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('X-Forwarded-For','')">+ X-Forwarded-For</button>
                                <button type="button" class="chip" onclick="HeadersEditor.insertTemplate('User-Agent','')">+ User-Agent</button>
                                <button type="button" class="chip chip-curl" onclick="HeadersEditor.openCurlModal()">\u7C98\u8D34 cURL...</button>
                            </div>
                        </div>
                    </div>

                    <!-- 4. \u663E\u793A & \u7F13\u5B58 -->
                    <div class="a-fieldset">
                        <span class="a-field-label">\u663E\u793A &amp; \u7F13\u5B58</span>
                        <div class="a-row two">
                            <div class="pos-rel">
                                <div class="a-card-pick" onclick="toggleIconPicker(event)" id="iconSelectBtn">
                                    <img id="iconPreview" src="" style="width:32px;height:32px;display:none;border-radius:var(--radius-md);object-fit:cover;">
                                    <span id="iconDefault" style="font-size:var(--text-3xl);line-height:1;">\u{1F3AC}</span>
                                    <div class="flex-1-min0">
                                        <div class="label-bold">\u8282\u70B9\u56FE\u6807</div>
                                        <div id="iconSelectText" style="font-size:var(--text-xs); color:var(--text-sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\u70B9\u51FB\u9009\u62E9 \xB7 \u6216\u7C98\u8D34 URL</div>
                                    </div>
                                    <input type="hidden" id="iconUrl" value="">
                                </div>
                                <div id="iconPickerPanel" style="display:none; position: absolute; top: 100%; left: 0; width: 100%; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 100; margin-top: 8px; flex-direction: column; gap: 10px;">
                                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                                        <input type="text" id="customIconUrlInput" placeholder="\u8F93\u5165\u81EA\u5B9A\u4E49 JSON \u56FE\u6807\u5E93\u94FE\u63A5..." style="flex: 1; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--bg); font-size: var(--text-md); color: var(--text);">
                                        <button type="button" class="btn-tier is-primary is-sm" onclick="setCustomIconLibrary()">\u52A0\u8F7D</button>
                                        <button type="button" class="btn-tier is-sm" onclick="resetIconLibrary()">\u9ED8\u8BA4\u5E93</button>
                                    </div>
                                    <input type="text" id="iconSearch" placeholder="\u{1F50D} \u641C\u7D22\u56FE\u6807\u540D\u79F0..." style="padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background:var(--bg); width: 100%; font-size: var(--text-base); color: var(--text);" onkeyup="filterIcons()">
                                    <div id="iconGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; overflow-y: auto; max-height: 240px; padding-right: 4px;">
                                        <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; font-size: var(--text-md);">\u52A0\u8F7D\u56FE\u6807\u5E93\u4E2D...</div>
                                    </div>
                                </div>
                            </div>
                            <div class="a-toggle-row" id="cacheToggleRow" onclick="toggleCacheSwitch(this)">
                                <div class="ios-switch on"></div>
                                <div class="flex-1">
                                    <div class="label-bold">\u6D77\u62A5 &amp; \u9759\u6001\u8D44\u6E90\u7F13\u5B58</div>
                                    <div style="font-size:var(--text-xs); color:var(--text-sec);">\u964D\u4F4E\u4E0A\u6E38\u538B\u529B\uFF0C\u5EFA\u8BAE\u5F00\u542F</div>
                                </div>
                                <input type="checkbox" id="nodeCache" class="ip-checkbox" checked style="display:none;">
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="a-footer">
                        <span class="a-footer-aux">\u6240\u6709\u66F4\u6539\u5B9E\u65F6\u4FDD\u5B58\u5230 Cloudflare D1</span>
                        <div class="a-footer-actions">
                            <button type="submit" id="submitBtn" class="btn-tier is-primary"><svg><use href="#i-save"/></svg>\u4FDD\u5B58\u5E76\u90E8\u7F72</button>
                        </div>
                    </div>
                </form>
            </div>
            </section><!-- /sec-settings -->

            <!-- ===== \u5206\u533A: \u5DE5\u5177\u7BB1 ===== -->
            <section id="sec-tools" class="app-section" data-section="tools" style="display:none;">
            <div class="card">
                <h2 style="margin:0 0 6px; font-size:var(--text-2xl);">\u5DE5\u5177\u7BB1</h2>
                <div style="color:var(--text-sec); font-size:var(--text-md); margin-bottom:18px;">\u914D\u7F6E\u5BFC\u5165\u5BFC\u51FA\u3001cURL \u8BF7\u6C42\u5934\u89E3\u6790\u7B49\u5B9E\u7528\u5DE5\u5177\u3002</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button type="button" class="btn-tier" onclick="exportConfig()"><svg><use href="#i-download"/></svg>\u5BFC\u51FA\u5F53\u524D\u914D\u7F6E</button>
                    <button type="button" class="btn-tier" onclick="importConfig()"><svg><use href="#i-upload"/></svg>\u5BFC\u5165\u914D\u7F6E</button>
                    <button type="button" class="btn-tier" onclick="HeadersEditor.openCurlModal()"><svg><use href="#i-key"/></svg>cURL \u8BF7\u6C42\u5934\u89E3\u6790</button>
                    <button type="button" class="btn-tier" onclick="openWorkerUpdate()"><svg><use href="#i-save"/></svg>\u66F4\u65B0 Worker \u6838\u5FC3\u4EE3\u7801</button>
                </div>
                <div style="margin-top:16px; font-size:var(--text-sm); color:var(--text-sec); line-height:1.6;">
                    \u63D0\u793A\uFF1AcURL \u89E3\u6790\u4F1A\u628A\u7C98\u8D34\u7684\u8BF7\u6C42\u5934\u586B\u5165\u5F53\u524D\u90E8\u7F72\u8868\u5355\u7684\u300C\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934\u300D\u7F16\u8F91\u5668\uFF0C\u8BF7\u5148\u5728\u300C\u7CFB\u7EDF\u8BBE\u7F6E\u300D\u4E2D\u51C6\u5907\u597D\u8282\u70B9\u4FE1\u606F\u3002
                </div>
            </div>
            </section><!-- /sec-tools -->

            <!-- ===== \u5206\u533A: \u8282\u70B9\u72B6\u6001\uFF08emby-js \u76D1\u63A7\u79FB\u690D\uFF09 ===== -->
            <section id="sec-embyStatus" class="app-section" data-section="embyStatus" style="display:none;">
            <div class="card">
                <h2 style="margin:0 0 6px; font-size:var(--text-2xl);">\u8282\u70B9\u72B6\u6001\u76D1\u63A7</h2>
                <div style="color:var(--text-sec); font-size:var(--text-md); margin-bottom:18px;">
                    \u6BCF\u5206\u949F\u81EA\u52A8\u63A2\u6D4B\u542F\u7528\u4E86\u300C\u5728\u72B6\u6001\u9875\u5C55\u793A\u300D\u7684\u8282\u70B9\uFF0C\u8BB0\u5F55 24 \u5C0F\u65F6\u4E0E 7 \u5929\u53EF\u7528\u7387\uFF1B\u8FDE\u7EED\u5931\u8D25 5 \u5206\u949F\u81EA\u52A8\u53D1\u9001 Telegram \u544A\u8B66\uFF0C\u6062\u590D\u540E\u518D\u53D1\u4E00\u6761\u6062\u590D\u901A\u77E5\u3002
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
                    <a class="btn-tier" href="/status" target="_blank" rel="noopener">\u6253\u5F00\u516C\u5F00\u72B6\u6001\u9875</a>
                    <button type="button" class="btn-tier" onclick="generateShareDashboardLink()">\u751F\u6210\u516C\u5F00\u5206\u4EAB\u94FE\u63A5\uFF081 \u5C0F\u65F6\uFF09</button>
                    <button type="button" class="btn-tier" onclick="loadEmbyStatusAdmin()">\u5237\u65B0</button>
                </div>
                <div id="embyShareResult" style="display:none; padding:10px 14px; background:rgba(0,136,204,0.08); border-radius:10px; margin-bottom:14px; font-size:var(--text-sm); word-break:break-all;"></div>
                <div class="card" style="padding:12px 14px; margin-bottom:14px; display:flex; flex-direction:column; gap:10px;">
                    <label style="display:flex; gap:8px; align-items:center; cursor:pointer; font-size:var(--text-sm);">
                        <input type="checkbox" id="embyHideNamesToggle" onchange="updateEmbyGlobalFlag('hide_node_names', this.checked ? 1 : 0)"> \u5728\u516C\u5F00\u72B6\u6001\u9875\u9690\u85CF\u8282\u70B9\u540D\u79F0\u4E0E\u56FE\u6807\uFF08\u7EDF\u4E00\u663E\u793A\u4E3A\u300C\u8282\u70B9 1\u3001\u8282\u70B9 2\u2026\u300D\uFF09
                    </label>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="min-width:120px; font-size:var(--text-sm);">\u4EE3\u7406\u56FD\u5BB6\u767D\u540D\u5355</span>
                        <input type="text" id="proxyCountryAllowlist" placeholder="\u4F8B\uFF1ACN,HK,TW\uFF08\u7559\u7A7A=\u5173\u95ED\uFF09" style="flex:1; min-width:200px; padding:8px 12px; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--card); color:inherit;">
                        <button type="button" class="btn-tier" onclick="saveCountryAllowlist()">\u4FDD\u5B58</button>
                    </div>
                    <div style="font-size:var(--text-sm); color:var(--text-sec);">\u4EC5\u5141\u8BB8\u6765\u81EA\u8FD9\u4E9B\u56FD\u5BB6\u7684\u5BA2\u6237\u7AEF\u8D70\u53CD\u4EE3\uFF1B\u516C\u5F00 /status \u9875\u4E0E\u7BA1\u7406\u7AEF\u70B9\u4E0D\u53D7\u5F71\u54CD\u3002\u7559\u7A7A\u5373\u5173\u95ED\u3002</div>
                </div>
                <div id="embyStatusAdminList" style="display:flex; flex-direction:column; gap:10px;"></div>
                <div id="embyStatusAdminEmpty" style="display:none; color:var(--text-sec); font-size:var(--text-sm); padding:20px 0;">\u5C1A\u672A\u914D\u7F6E\u4EFB\u4F55\u53CD\u4EE3\u8282\u70B9\u3002\u8BF7\u5148\u5728\u300C\u6982\u89C8\u300D\u4E2D\u6DFB\u52A0\u8282\u70B9\u3002</div>
            </div>
            </section><!-- /sec-embyStatus -->

            <!-- ===== \u5206\u533A: \u6982\u89C8 (\u8282\u70B9\u7BA1\u7406) ===== -->
            <section id="sec-overview" class="app-section is-active" data-section="overview">
            <div class="aurora-hero" aria-label="\u6838\u5FC3\u6307\u6807 \u6982\u89C8">
                <div class="kpi-tile is-primary">
                    <div class="kpi-label">\u5728\u7EBF\u8282\u70B9</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-online-nodes">--</span>
                        <span class="kpi-unit">/ <span id="kpi-total-nodes">--</span></span>
                    </div>
                    <div class="kpi-sub" id="kpi-online-sub">\u5B9E\u65F6\u53CD\u4EE3\u8282\u70B9\u6D3B\u8DC3\u5EA6</div>
                    <svg class="kpi-spark" viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true">
                        <path class="ks-area" id="kpi-spark-area" d="M0 36 L40 32 L80 24 L120 28 L160 18 L200 22 L240 12 L240 44 L0 44 Z"/>
                        <path class="ks-line" id="kpi-spark-line" d="M0 36 L40 32 L80 24 L120 28 L160 18 L200 22 L240 12"/>
                    </svg>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-label">\u4ECA\u65E5\u6D41\u91CF</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-traffic">--</span>
                    </div>
                    <div class="kpi-sub">\u51FA\u5165\u7AD9\u5408\u8BA1 \xB7 \u81EA\u7136\u65E5\u91CD\u7F6E</div>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-label">\u7CFB\u7EDF\u5065\u5EB7\u5EA6</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-health">--</span>
                        <span class="kpi-unit">%</span>
                    </div>
                    <div class="kpi-health-bar"><span id="kpi-health-bar-fill"></span></div>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-label">\u8FB9\u7F18 RTT</div>
                    <div class="kpi-value-row">
                        <span class="kpi-value skeleton" id="kpi-rtt">--</span>
                        <span class="kpi-unit">ms</span>
                    </div>
                    <div class="kpi-sub">CF Worker \u2192 \u4F60\u7684\u8BBE\u5907</div>
                </div>
            </div>
            <div class="card">
                <div class="section-header-row">
                    <h2 class="section-title">\u5DF2\u53CD\u4EE3\u7684\u5A92\u4F53\u5E93</h2>
                    <div style="display: flex; gap: 8px; align-items:center; flex-wrap: wrap;">
                        <button type="button" class="btn-tier is-sm" onclick="pingAllNodes()">\u5168\u5C40\u6D4B\u901F</button>
                        <button type="button" id="btnPurge" class="btn-tier is-sm is-danger" onclick="purgeCache()">\u5237\u65B0\u5168\u7AD9\u6D77\u62A5</button>
                        <input type="text" id="searchNode" class="search-input" placeholder="\u{1F50D} \u641C\u7D22\u5907\u6CE8\u6216\u540E\u7F00\u67E5\u627E..." onkeyup="filterNodesList()">
                    </div>
                </div>
                <div style="background: rgba(0, 122, 255, 0.05); padding: 12px 20px; border-radius: 12px; border: 1px dashed var(--primary); margin-bottom: 20px; margin-top: 20px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <label style="cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" id="selectAllNodes" onchange="toggleSelectAll(this)" style="width: 18px; height: 18px; accent-color: var(--primary);"> 
                \u5168\u9009\u8282\u70B9
            </label>
            
            <div style="width: 2px; height: 20px; background: var(--border);"></div> <select id="batch-mode-select" style="padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-weight: 600;">
                <option value="">\u{1F504} \u8BFB\u53D6\u6A21\u5F0F\u4E2D...</option>
            </select>

            <button onclick="batchUpdateModes()" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: var(--radius-md); cursor: pointer; font-weight: bold; transition: 0.2s; box-shadow: 0 4px 10px var(--primary-ring);">
                \u{1F680} \u6279\u91CF\u5E94\u7528\u6A21\u5F0F
            </button>

            <span id="batch-status" class="label-bold"></span>
        </div>
                <div id="list-grid" class="node-grid">
                    <div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;">\u8BFB\u53D6\u6570\u636E\u4E2D...</div>
                </div>
            </div>

            <div style="text-align: center; padding-top: 10px; padding-bottom: 20px;">
                <div style="margin-top: 20px; font-size: var(--text-sm); color: var(--text-sec); line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto; padding: 0 15px;">
                    <strong>\u514D\u8D23\u58F0\u660E:</strong> \u672C\u9879\u76EE\u4EC5\u4F9B\u5B66\u4E60\u4E0E\u6280\u672F\u6D4B\u8BD5\u4F7F\u7528\uFF0C\u8BF7\u9075\u5B88\u5F53\u5730\u6CD5\u5F8B\u6CD5\u89C4\u3002\u4F7F\u7528\u8005\u5BF9\u914D\u7F6E\u3001\u8F6C\u53D1\u5185\u5BB9\u4E0E\u8BBF\u95EE\u884C\u4E3A\u627F\u62C5\u5168\u90E8\u8D23\u4EFB\uFF0C\u5F00\u53D1\u8005\u4E0D\u5BF9\u4EFB\u4F55\u76F4\u63A5\u6216\u95F4\u63A5\u635F\u5931\u8D1F\u8D23\u3002
                </div>
            </div>
            </section><!-- /sec-overview -->

            <!-- ===== \u5371\u9669\u533A (\u72EC\u7ACB\u5206\u533A, \u66FF\u6362\u539F\u5E95\u90E8\u5E38\u9A7B\u6761 v2.3.0) ===== -->
            <section id="sec-danger" class="app-section" data-section="danger" style="display:none;">
                <div class="danger-hero">
                    <div class="dh-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div class="dh-text">
                        <h2 class="dh-title">\u5371\u9669\u64CD\u4F5C\u533A</h2>
                        <div class="dh-sub">\u4EE5\u4E0B\u64CD\u4F5C\u4E0D\u53EF\u9006\uFF0C\u8BF7\u786E\u8BA4\u7406\u89E3\u6BCF\u9879\u5F71\u54CD\u540E\u518D\u6267\u884C\u3002</div>
                    </div>
                </div>
                <div class="ios-form-group danger-group" role="group" aria-label="\u5371\u9669\u64CD\u4F5C">
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">\u5237\u65B0\u5168\u7AD9\u6D77\u62A5\u7F13\u5B58</div>
                            <div class="ifr-sub">\u5F3A\u5236\u6E05\u7A7A CDN \u6D77\u62A5\u7F13\u5B58\u3002\u5BA2\u6237\u7AEF\u9996\u6B21\u52A0\u8F7D\u5EF6\u8FDF\u4F1A\u4E0A\u5347 1\u20133 \u79D2\uFF0C\u76F4\u5230\u7F13\u5B58\u91CD\u5EFA\u3002\u65E0\u6CD5\u56DE\u6EDA\u3002</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="purgeCache()">\u6267\u884C\u5237\u65B0</button>
                    </div>
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">\u8986\u76D6\u90E8\u7F72 Worker</div>
                            <div class="ifr-sub">\u7528\u672C\u5730\u6E90\u7801\u8986\u76D6\u7EBF\u4E0A Worker \u5E76\u91CD\u542F\u8282\u70B9\u3002\u671F\u95F4\u6240\u6709\u53CD\u4EE3\u8BF7\u6C42\u4F1A\u51FA\u73B0 5\u201315 \u79D2\u7684\u8FDE\u63A5\u6296\u52A8\u3002</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="openWorkerUpdate()">\u6253\u5F00\u90E8\u7F72\u9762\u677F</button>
                    </div>
                    <div class="ios-form-row">
                        <div class="flex-1-min0">
                            <div class="ifr-label">\u9000\u51FA\u767B\u5F55</div>
                            <div class="ifr-sub">\u6E05\u9664\u5F53\u524D\u4F1A\u8BDD\uFF0C\u65AD\u5F00\u7BA1\u7406\u9762\u677F\u8BBF\u95EE\u3002\u5176\u4ED6\u5BA2\u6237\u7AEF\u4E0D\u53D7\u5F71\u54CD\u3002\u53EF\u968F\u65F6\u901A\u8FC7\u767B\u5F55\u9875\u91CD\u65B0\u8FDB\u5165\u3002</div>
                        </div>
                        <button type="button" class="btn-tier is-danger" onclick="logout()">\u7ACB\u5373\u9000\u51FA</button>
                    </div>
                </div>
            </section><!-- /sec-danger -->

        </div><!-- /.content -->

        </div><!-- /.app-main -->
    </div><!-- /.app-shell -->

    <script>
        const modeNames = { 'off': '\u4FDD\u5B88', 'realip_only': '\u4E25\u683C', 'dual': '\u517C\u5BB9', 'strict': '\u5F3A\u529B' };
        
        const DEFAULT_ICON_URL = 'https://emby-icon.vercel.app/TFEL-Emby.json';
        let globalIcons = [];
        let proxyNodesForPing = [];
        let sortableInstance = null;
        let trendChartInstance = null;
        let locationChartInstance = null;

        // \u8BBE\u7F6E Chart.js \u54CD\u5E94\u6697\u8272\u6A21\u5F0F
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

        // \u8282\u70B9\u72B6\u6001\u5FBD\u7AE0: \u4F9D\u636E\u5EF6\u8FDF/\u6D3B\u8DC3\u5EA6\u6620\u5C04 \u5728\u7EBF/\u5EF6\u8FDF/\u79BB\u7EBF
        function nodeBadgeHtml(statusClass) {
            if (statusClass === 'live') return '<span class="node-badge is-online"><span class="bdot"></span>\u5728\u7EBF</span>';
            if (statusClass === 'warn') return '<span class="node-badge is-slow"><span class="bdot"></span>\u5EF6\u8FDF</span>';
            if (statusClass === 'offline') return '<span class="node-badge is-offline"><span class="bdot"></span>\u79BB\u7EBF</span>';
            return '<span class="node-badge is-idle"><span class="bdot"></span>\u7A7A\u95F2</span>';
        }

        // \u8FF7\u4F60 SVG \u6298\u7EBF\u56FE: \u6570\u636E\u7F3A\u5931\u65F6\u5360\u4F4D
        function nodeSparklineHtml(points) {
            var data = (points || []).filter(function (n) { return typeof n === 'number' && isFinite(n); });
            if (data.length < 2) {
                return '<div class="node-spark-empty">\u6682\u65E0\u8D8B\u52BF\u6570\u636E</div>';
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

        // \u62C9\u53D6\u8FD1 7 \u5929\u6BCF\u65E5\u6D41\u91CF\u5E76\u56DE\u586B\u5230\u6BCF\u5F20\u8282\u70B9\u5361\u7684 sparkline \u5BB9\u5668
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
            } catch (e) { /* \u9759\u9ED8\u964D\u7EA7\uFF1A\u4FDD\u7559\u5360\u4F4D */ }
        }

        // =====================================
        // \u6570\u636E\u5927\u5C4F\u4E0E\u7EDF\u8BA1\u903B\u8F91 (\u9002\u914D\u624B\u673A\u7AEF\u8868\u683C\u6392\u7248)
        // =====================================
        // \u517C\u5BB9\u65E7\u5165\u53E3: \u5207\u5230\u6570\u636E\u7EDF\u8BA1\u5206\u533A
        function openDashboard() { showSection('stats'); }

        async function loadDashboardData() {

            function parseTrafficToBytes(str) {
                if (!str || str === '0 B' || str.includes('\u5F02\u5E38') || str.includes('\u83B7\u53D6')) return 0;
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
            
            let top5Html = '<h3 class="section-spacer-top">\u{1F3C6} \u4ECA\u65E5\u8282\u70B9\u6D41\u91CF\u6D88\u8017 TOP 5</h3><div style="background: rgba(120,120,120,0.05); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 20px;">';
            
            // ==========================================
            // \u{1F680} \u6838\u5FC3\u4F18\u5316\uFF1A\u542C\u4F60\u7684\u5929\u624D\u601D\u8DEF\uFF01\u76F4\u63A5\u53BB\u7F51\u9875\u73B0\u6709\u7684\u5361\u7247\u91CC\u201C\u6293\u53D6\u201D\u6570\u636E\uFF0C\u7EDD\u4E0D\u7B49\u5F85\u53D8\u91CF\uFF01
            // ==========================================
            const domCards = document.querySelectorAll('.route-item');
            let scrapedNodes = [];
            
            domCards.forEach(card => {
                const prefix = card.getAttribute('data-prefix') || '\u672A\u77E5';
                let remark = prefix;
                const searchAttr = card.getAttribute('data-search');
                if (searchAttr) {
                    remark = searchAttr.replace(new RegExp(' ' + prefix + '$'), '').trim();
                }

                let bandwidth = '0 B';
                // \u904D\u5386\u5361\u7247\u91CC\u6240\u6709\u7684\u6587\u672C\uFF0C\u627E\u51FA\u5E26\u6709\u6D41\u91CF\u5355\u4F4D\u7684\u90A3\u4E2A\u6587\u672C
                const spans = card.querySelectorAll('span');
                spans.forEach(span => {
                    const txt = span.innerText || '';
                    // \u5339\u914D\u4F8B\u5982: 1.5 GB, 500 MB, 0 B (\u53CC\u659C\u6760\u9632\u8F6C\u4E49\u4E22\u5931)
                    if (/^[\\d\\.]+\\s*(TB|GB|MB|KB|B)$/i.test(txt.trim())) {
                        bandwidth = txt.trim();
                    }
                });

                scrapedNodes.push({ prefix: prefix, remark: remark, todayBandwidth: bandwidth });
            });

            // \u7528\u6293\u53D6\u4E0B\u6765\u7684\u771F\u5B9E\u6570\u636E\u76F4\u63A5\u8BA1\u7B97 TOP 5
            if (scrapedNodes.length > 0) {
                const validNodes = scrapedNodes.filter(r => parseTrafficToBytes(r.todayBandwidth) > 0);
                const top5 = validNodes.sort((a, b) => parseTrafficToBytes(b.todayBandwidth) - parseTrafficToBytes(a.todayBandwidth)).slice(0, 5);
                
                if (top5.length > 0) {
                    top5Html += '<ul style="margin:0; padding-left: 20px; line-height: 2; font-size: var(--text-base); color: var(--text);">';
                    top5.forEach((r, idx) => {
                        const rankColor = idx === 0 ? 'var(--err)' : (idx === 1 ? 'var(--warn)' : (idx === 2 ? '#ffcc00' : 'var(--text-sec)'));
                        top5Html += \`<li><strong style="color:\${rankColor}; font-size: var(--text-lg);">#\${idx+1}</strong> \${r.remark} (/\${r.prefix}) \u2014\u2014 \u6D88\u8017: <strong style="color:var(--primary); font-family: monospace;">\${r.todayBandwidth}</strong></li>\`;
                    });
                    top5Html += '</ul>';
                } else {
                    top5Html += '<div style="color:var(--text-sec); font-size:var(--text-md); text-align:center;">\u4ECA\u65E5\u6682\u65E0\u8282\u70B9\u4EA7\u751F\u6D41\u91CF</div>';
                }
            } else {
                top5Html += '<div style="color:var(--text-sec); font-size:var(--text-md); text-align:center;">\u4E3B\u9875\u6682\u65E0\u8282\u70B9\u5361\u7247</div>';
            }
            top5Html += '</div>';
            
            // \u77AC\u95F4\u628A TOP 5 \u5199\u5165\u7F51\u9875\uFF01
            top5Container.innerHTML = top5Html;


            // ==========================================
            // \u{1F31F} \u6B63\u5E38\u52A0\u8F7D\u4E0B\u9762\u7684\u56FE\u8868\u6570\u636E (\u5E26\u670910\u79D2\u9632\u5361\u6B7B\u8D85\u65F6\u4FDD\u62A4)
            // ==========================================
            document.getElementById('logTableBody').innerHTML = '<tr><td colspan="5" class="cell-loading">\u6570\u636E\u5206\u6790\u5F15\u64CE\u8BA1\u7B97\u4E2D...</td></tr>';
            document.getElementById('trafficToday').innerText = '\u62C9\u53D6\u4E2D...';
            document.getElementById('traffic7d').innerText = '\u62C9\u53D6\u4E2D...';
            document.getElementById('traffic30d').innerText = '\u62C9\u53D6\u4E2D...';

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const res = await fetch('/api/analytics', { signal: controller.signal });
                clearTimeout(timeoutId);
                
                const data = await res.json();
                if(!data.success) throw new Error(data.error);

                updateChartColors();

                document.getElementById('trafficToday').innerText = data.trafficToday || '\u672A\u77E5';
                document.getElementById('traffic7d').innerText = data.traffic7d || '\u672A\u77E5';
                document.getElementById('traffic30d').innerText = data.traffic30d || '\u672A\u77E5';

                const labels = data.trend.map(i => i.date.substring(5)); 
                const counts = data.trend.map(i => i.count);
                const trendCtx = document.getElementById('trendChart').getContext('2d');
                if(trendChartInstance) trendChartInstance.destroy();
                trendChartInstance = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{ label: '\u6709\u6548\u64AD\u653E (\u6B21)', data: counts, borderColor: (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#0071e3').trim(), backgroundColor: (getComputedStyle(document.documentElement).getPropertyValue('--primary-soft') || 'rgba(0,113,227,0.1)').trim(), fill: true, tension: 0.3 }]
                    },
                    options: { responsive: true, plugins: { title: { display: true, text: '\u8FC7\u53BB 7 \u5929\u5168\u7AD9\u64AD\u653E\u5E76\u53D1\u8D8B\u52BF', font: {size: 16} } } }
                });

                const locLabels = data.locations.map(i => i.country === 'CN' ? '\u4E2D\u56FD\u5927\u9646' : (i.country || '\u672A\u77E5'));
                const locCounts = data.locations.map(i => i.count);
                const locCtx = document.getElementById('locationChart').getContext('2d');
                if(locationChartInstance) locationChartInstance.destroy();
                locationChartInstance = new Chart(locCtx, {
                    type: 'doughnut',
                    data: {
                        labels: locLabels,
                        datasets: [{ data: locCounts, backgroundColor: ['#34c759', '#0071e3', '#ff9500', '#af52de', '#ff2d55', '#8e8e93'], borderWidth: 0 }]
                    },
                    options: { responsive: true, plugins: { title: { display: true, text: '\u72EC\u7ACB\u8BBF\u5BA2\u6765\u6E90\u5730\u5360\u6BD4', font: {size: 16} } } }
                });

                const tbody = document.getElementById('logTableBody');
                tbody.innerHTML = '';
                if(data.recents.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="cell-loading">\u6682\u65E0\u65E5\u5FD7\u8BB0\u5F55</td></tr>';
                } else {
                    data.recents.forEach(log => {
                        const tr = document.createElement('tr');
                        const isChina = log.country === 'CN';
                        tr.innerHTML = \`
                            <td data-label="\u8BBF\u95EE\u65F6\u95F4" style="font-size:var(--text-sm); white-space:nowrap;">\${log.timestamp}</td>
                            <td data-label="\u76EE\u6807\u8282\u70B9"><span class="badge" style="background:var(--primary-soft);color:var(--primary);">\${log.prefix}</span></td>
                            <td data-label="\u771F\u5B9E IP" style="font-family:monospace; font-size:var(--text-md); color:var(--text-sec); word-break:break-all;">\${log.ip}</td>
                            <td data-label="\u5F52\u5C5E\u5730"><span class="badge" style="background:\${isChina ? 'var(--ok-soft)' : 'var(--warn-soft)'}; color:\${isChina ? 'var(--ok)' : 'var(--warn)'};">\${isChina ? '\u4E2D\u56FD\u5927\u9646' : (log.country || 'Unknown')}</span></td>
                            <td data-label="\u8BBE\u5907\u6807\u8BC6 (UA)" style="font-size:var(--text-sm); color:var(--text-sec); word-break: break-all; white-space: normal; text-align: right; line-height: 1.4;" title="\${log.ua}">\${log.ua}</td>
                        \`;
                        tbody.appendChild(tr);
                    });
                }

            } catch (e) {
                const errMsg = e.name === 'AbortError' ? '\u7F51\u7EDC\u8D85\u65F6\uFF0CCF \u63A5\u53E3\u62E5\u5835\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5' : e.message;
                document.getElementById('logTableBody').innerHTML = \`<tr><td colspan="5" style="text-align:center;color:var(--err); padding: 30px;">\u72EC\u7ACB\u56FE\u8868\u6570\u636E\u62C9\u53D6\u5931\u8D25: \${errMsg}</td></tr>\`;
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
            grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-sec); font-size: var(--text-md); text-align: center;">\u52A0\u8F7D\u56FE\u6807\u5E93\u4E2D...</div>';
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
                grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--err); font-size: var(--text-md); text-align: center;">\u83B7\u53D6\u56FE\u6807\u5E93\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u94FE\u63A5\u6216\u7F51\u7EDC\u72B6\u6001</div>';
            }
        }

        function setCustomIconLibrary() {
            const url = document.getElementById('customIconUrlInput').value.trim();
            if (!url) return showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u56FE\u6807\u5E93 JSON \u94FE\u63A5');
            if (!url.startsWith('http')) return showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u5408\u6CD5\u7684 URL');
            localStorage.setItem('custom_icon_url', url);
            showToast('\u23F3 \u6B63\u5728\u52A0\u8F7D\u81EA\u5B9A\u4E49\u56FE\u6807\u5E93...');
            loadIcons(url);
        }

        function resetIconLibrary() {
            localStorage.removeItem('custom_icon_url');
            document.getElementById('customIconUrlInput').value = '';
            showToast('\u{1F504} \u5DF2\u6062\u590D\u9ED8\u8BA4\u56FE\u6807\u5E93');
            loadIcons(DEFAULT_ICON_URL);
        }

        function renderIconGrid(filterText) {
            const grid = document.getElementById('iconGrid');
            const lowerFilter = filterText.toLowerCase();
            const filtered = globalIcons.filter(item => (item.name || '').toLowerCase().includes(lowerFilter));
            let html = \`<div class="icon-item" onclick="selectIcon('', '\u9ED8\u8BA4 \u{1F3AC}')" title="\u4F7F\u7528\u9ED8\u8BA4\u56FE\u6807"><span style="font-size:var(--text-2xl);">\u{1F3AC}</span></div>\`;
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
                text.textContent = '\u70B9\u51FB\u9009\u62E9\u56FE\u6807 (\u9ED8\u8BA4 \u{1F3AC})'; text.style.color = 'var(--text-sec)';
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

        // ===== \u4E09\u6001\u4E3B\u9898\u7CFB\u7EDF: auto / light / dark =====
        var __themeMql = window.matchMedia('(prefers-color-scheme: dark)');

        function getThemePref() {
            // \u65E7\u952E\u4E00\u6B21\u6027\u8FC1\u79FB
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
                var titleMap = { auto: '\u4E3B\u9898: \u8DDF\u968F\u7CFB\u7EDF', light: '\u4E3B\u9898: \u6D45\u8272', dark: '\u4E3B\u9898: \u6DF1\u8272' };
                btn.dataset.theme = pref;
                btn.title = titleMap[pref] || '\u5207\u6362\u4E3B\u9898';
                btn.setAttribute('aria-label', titleMap[pref] || '\u5207\u6362\u4E3B\u9898');
            }
            if (typeof trendChartInstance !== 'undefined' && trendChartInstance) {
                updateChartColors(); trendChartInstance.update();
                if (locationChartInstance) locationChartInstance.update();
            }
        }

        function toggleDarkMode() {
            // \u5FAA\u73AF auto \u2192 light \u2192 dark \u2192 auto
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

        // ===== \u5BFC\u822A\u5206\u533A\u5207\u6362 =====
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
            // \u540C\u6B65\u79FB\u52A8\u7AEF\u5E95\u90E8 tab (v5: tools+danger \u2192 "\u66F4\u591A" \u69FD)
            var tabBar = document.getElementById('mobileTabBar');
            if (tabBar) {
                var tabMap = { overview: 'home', speed: 'speed', stats: 'stats', settings: 'settings', tools: 'more', danger: 'more' };
                var tabKey = tabMap[key];
                var btns = tabBar.querySelectorAll('button[data-tab]');
                for (var k = 0; k < btns.length; k++) {
                    btns[k].classList.toggle('active', btns[k].dataset.tab === tabKey);
                }
            }
            // \u540C\u6B65\u9876\u90E8\u7D27\u51D1\u680F\u6807\u9898 (\u5927\u6807\u9898\u6EDA\u8D70\u540E\u624D\u53EF\u89C1)
            // v2.5.0: \u540C\u6B65\u684C\u9762 glass topbar \u4E2D\u7684 .tb-section-title
            try {
                var title = window.__iosSectionTitles ? (window.__iosSectionTitles[key] || '') : '';
                var compact = document.getElementById('mobileTopbarCompact');
                if (compact) compact.textContent = title;
                var tbSlot = document.getElementById('tbSectionTitle');
                if (tbSlot) tbSlot.textContent = title;
                if (document.body) document.body.classList.remove('is-scrolled');
            } catch (e) {}
            try { localStorage.setItem('emby_active_section', key); } catch (e) {}
            // \u6570\u636E\u7EDF\u8BA1\u5206\u533A: \u9996\u6B21\u8FDB\u5165 lazy init \u56FE\u8868
            if (key === 'stats') {
                if (!__statsInited) { __statsInited = true; loadDashboardData(); }
                else { setTimeout(function () {
                    if (trendChartInstance) trendChartInstance.resize();
                    if (locationChartInstance) locationChartInstance.resize();
                }, 60); }
            }
            // \u8282\u70B9\u72B6\u6001\u5206\u533A: \u8FDB\u5165\u5373\u52A0\u8F7D\uFF08\u907F\u514D\u5FC5\u987B\u624B\u52A8\u70B9"\u5237\u65B0"\uFF09
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
            // \u5EF6\u8FDF\u5230 DOM \u5C31\u7EEA\u540E\u518D\u5207\u6362
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
            if(!confirm('\u786E\u5B9A\u8981\u6E05\u7406 Cloudflare \u8282\u70B9\u7684\u5168\u7AD9\u6D77\u62A5\u548C\u9759\u6001\u7F13\u5B58\u5417\uFF1F\\n\\n\u6E05\u7406\u540E\u53EF\u80FD\u5BFC\u81F4\u77ED\u65F6\u95F4\u7684\u52A0\u8F7D\u7F13\u6162\u3002')) return;
            const btn = document.getElementById('btnPurge');
            const originalText = btn.textContent;
            btn.textContent = '\u23F3 \u6B63\u5728\u6E05\u7406...'; btn.disabled = true;
            try {
                const res = await fetch('/api/purge-cache', { method: 'POST' });
                const data = await res.json();
                if(data.success) showToast('\u2705 \u7F13\u5B58\u6E05\u7406\u6210\u529F\uFF0C\u65B0\u6D77\u62A5\u5DF2\u751F\u6548\uFF01');
                else showToast('\u274C \u6E05\u7406\u5931\u8D25: ' + data.error);
            } catch(e) { showToast('\u274C \u7F51\u7EDC\u8BF7\u6C42\u9519\u8BEF'); } finally { btn.textContent = originalText; btn.disabled = false; }
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
                ? '<span class="a-tag-pri">\u4E3B\u6E90</span><input type="url" class="a-input target-input" placeholder="\u4E3B\u7EBF\u8DEF\u5730\u5740 (\u5982: http://1.1.1.1:8096)" required oninput="handleTargetInputs()">'
                : '<span class="a-tag-bk">\u5907 ' + idx + '</span><input type="url" class="a-input target-input" placeholder="\u5907\u7528\u7EBF\u8DEF ' + idx + ' (\u9009\u586B\uFF0C\u4E3B\u6E90\u6302\u6389\u65F6\u89E6\u53D1)" oninput="handleTargetInputs()">';
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
                    if (tag) { tag.className = 'a-tag-pri'; tag.textContent = '\u4E3B\u6E90'; }
                    if (inp) inp.placeholder = '\u4E3B\u7EBF\u8DEF\u5730\u5740 (\u5982: http://1.1.1.1:8096)';
                } else {
                    if (tag) { tag.className = 'a-tag-bk'; tag.textContent = '\u5907 ' + idx; }
                    if (inp) inp.placeholder = '\u5907\u7528\u7EBF\u8DEF ' + idx + ' (\u9009\u586B\uFF0C\u4E3B\u6E90\u6302\u6389\u65F6\u89E6\u53D1)';
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
                        const tag = i === 0 ? '<span style="color:var(--ok);font-weight:bold;">[\u4E3B]</span>' : '<span style="color:var(--warn);font-weight:bold;">[\u5907]</span>';
                        html += \`<div class="url-list-item">\${tag} \${t}</div>\`;
                    });
                    el.innerHTML = html;
                } else { el.textContent = el.getAttribute('data-val'); }
            } else {
                el.classList.add('secret-text'); el.classList.remove('actual-text'); el.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
            }
        }

        function copyTxt(txt) { navigator.clipboard.writeText(txt).then(() => showToast('\u{1F680} \u590D\u5236\u6210\u529F\uFF01')); }

        async function pingTarget(idx, targetUrl) {
            const pingEl = document.getElementById('ping-' + idx);
            if (!pingEl) return;
            pingEl.textContent = '\u6D4B\u901F\u4E2D'; pingEl.style.color = '';
            // \u627E\u5230\u5EF6\u8FDF\u6240\u5728 stat \u7684\u526F\u6807\u9898\uFF08\u82E5\u5B58\u5728\uFF09\u4EE5\u540C\u6B65\u72B6\u6001\u6587\u6848\u4E0E\u8272\u5F69
            const stat = pingEl.closest('.a-stat');
            const sub = stat ? stat.querySelector('.a-stat-sub') : null;
            const setSub = (text, cls) => {
                if (!sub) return;
                sub.textContent = text;
                sub.classList.remove('up', 'down');
                if (cls) sub.classList.add(cls);
            };
            // \u4F9D\u636E\u6D4B\u901F\u7ED3\u679C\u5237\u65B0\u8282\u70B9\u72B6\u6001\u5FBD\u7AE0 (\u5728\u7EBF/\u5EF6\u8FDF/\u79BB\u7EBF)
            const card = pingEl.closest('.emby-card');
            const setBadge = (state) => {
                if (!card) return;
                const badge = card.querySelector('.node-badge');
                if (!badge) return;
                badge.className = 'node-badge ' + (state === 'online' ? 'is-online' : state === 'slow' ? 'is-slow' : 'is-offline');
                badge.innerHTML = '<span class="bdot"></span>' + (state === 'online' ? '\u5728\u7EBF' : state === 'slow' ? '\u5EF6\u8FDF' : '\u79BB\u7EBF');
            };
            try {
                const res = await fetch('/api/ping-node?url=' + encodeURIComponent(targetUrl));
                const data = await res.json();
                if(data.ms >= 0) {
                    pingEl.innerHTML = data.ms + '<span class="unit">ms</span>';
                    if (data.ms < 200) { pingEl.style.color = 'var(--ok)'; setSub('\u826F\u597D', 'up'); setBadge('online'); }
                    else if (data.ms < 500) { pingEl.style.color = 'var(--primary)'; setSub('\u4E00\u822C', null); setBadge('online'); }
                    else { pingEl.style.color = 'var(--warn)'; setSub('\u504F\u9AD8', 'down'); setBadge('slow'); }
                } else { pingEl.textContent = '\u65AD\u8FDE'; pingEl.style.color = 'var(--err)'; setSub('\u8D85\u65F6', 'down'); setBadge('offline'); }
            } catch(e) { pingEl.textContent = '\u5F02\u5E38'; pingEl.style.color = 'var(--err)'; setSub('\u9519\u8BEF', 'down'); setBadge('offline'); }
            if (typeof updateTopbarHealth === 'function') updateTopbarHealth();
        }

        function toggleDetails(el) {
            const card = el.closest('.emby-card') || el.closest('.a-card');
            if (!card) return;
            const d = card.querySelector('.a-details');
            if (d) d.classList.toggle('open');
        }

        function pingAllNodes() {
            if (proxyNodesForPing.length === 0) return showToast('\u26A0\uFE0F \u6CA1\u6709\u53EF\u4F9B\u6D4B\u901F\u7684\u53CD\u4EE3\u8282\u70B9');
            showToast('\u26A1 \u6B63\u5728\u5BF9\u6240\u6709\u8282\u70B9\u53D1\u8D77\u6D4B\u901F...');
            proxyNodesForPing.forEach((node, offset) => { setTimeout(() => pingTarget(node.idx, node.url), offset * 200); });
        }

        // ==========================================
        // emby-js \u76D1\u63A7\u79FB\u690D\uFF1A\u8282\u70B9\u72B6\u6001\u7BA1\u7406\u9762\u677F\uFF08admin\uFF09
        // ==========================================
        function _embyEscape(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        async function loadEmbyStatusAdmin() {
            const listEl = document.getElementById('embyStatusAdminList');
            const emptyEl = document.getElementById('embyStatusAdminEmpty');
            if (!listEl || !emptyEl) return;
            listEl.innerHTML = '<div style="color:var(--text-sec); font-size:var(--text-sm);">\u52A0\u8F7D\u4E2D...</div>';
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
                    const seenAt = st.emby_auth_seen_at ? new Date(st.emby_auth_seen_at * 1000).toLocaleString() : '\u2014';
                    const usedAt = st.emby_auth_used_at ? new Date(st.emby_auth_used_at * 1000).toLocaleString() : '\u2014';
                    return '' +
                        '<div class="card" style="padding:14px; gap:10px; display:flex; flex-direction:column;">' +
                            '<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
                                '<b style="font-size:var(--text-md);">' + _embyEscape(r.remark || r.prefix) + '</b>' +
                                '<code style="font-size:11px; opacity:.7;">/' + _embyEscape(r.prefix) + '</code>' +
                            '</div>' +
                            '<div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:var(--text-sm);">' +
                                '<label style="display:flex; gap:6px; align-items:center; cursor:pointer;">' +
                                    '<input type="checkbox" ' + (showOn ? 'checked' : '') + ' onchange="updateEmbyRouteFlag(\\'' + _embyEscape(r.prefix) + '\\',\\'show_on_status\\', this.checked ? 1 : 0)"> \u5728\u72B6\u6001\u9875\u5C55\u793A' +
                                '</label>' +
                                '<label style="display:flex; gap:6px; align-items:center; cursor:pointer;" ' + (showOn ? '' : 'data-disabled="1" style="opacity:.5; pointer-events:none;"') + '>' +
                                    '<input type="checkbox" ' + (autoAuth ? 'checked' : '') + ' ' + (showOn ? '' : 'disabled') + ' onchange="updateEmbyRouteFlag(\\'' + _embyEscape(r.prefix) + '\\',\\'media_counts_auto_auth\\', this.checked ? 1 : 0)"> \u81EA\u52A8\u83B7\u53D6\u5A92\u4F53\u8BA1\u6570' +
                                '</label>' +
                            '</div>' +
                            (showOn ? (
                                '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
                                    '<label style="font-size:var(--text-sm); color:var(--text-sec); flex:0 0 auto;">\u516C\u5F00\u540D\u79F0</label>' +
                                    '<input type="text" value="' + _embyEscape(alias) + '" placeholder="\u7559\u7A7A\u5219\u7528\u5907\u6CE8" style="flex:1; min-width:160px; padding:6px 10px; border:1px solid var(--border); border-radius:8px; background:transparent; color:inherit;" onblur="updateEmbyRouteFlag(\\'' + _embyEscape(r.prefix) + '\\',\\'public_alias\\', this.value)">' +
                                    '<button type="button" class="btn-tier" onclick="generateShareCardLink(\\'' + _embyEscape(r.prefix) + '\\')">\u751F\u6210 SVG \u5361\u7247</button>' +
                                '</div>'
                            ) : '') +
                            (autoAuth ? (
                                '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:11px; color:var(--text-sec);">' +
                                    '<span>\u4EE4\u724C\uFF1A' + (hasToken ? '\u5DF2\u6536\u5272' : '\u5C1A\u672A\u6536\u5272') + '</span>' +
                                    '<span>\u9996\u6B21\uFF1A' + _embyEscape(seenAt) + '</span>' +
                                    '<span>\u6700\u8FD1\u63A2\u6D4B\u4F7F\u7528\uFF1A' + _embyEscape(usedAt) + '</span>' +
                                    (hasToken ? '<button type="button" class="btn-tier" style="padding:4px 10px; font-size:11px;" onclick="revokeEmbyAuth(\\'' + _embyEscape(r.prefix) + '\\')">\u64A4\u9500\u5E76\u91CD\u65B0\u6536\u5272</button>' : '') +
                                '</div>'
                            ) : '') +
                        '</div>';
                });
                listEl.innerHTML = rows.join('');
            } catch (e) {
                listEl.innerHTML = '<div style="color:var(--bad); font-size:var(--text-sm);">\u52A0\u8F7D\u5931\u8D25\uFF1A' + _embyEscape(e.message) + '</div>';
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
                    if (typeof showToast === 'function') showToast('\u2705 \u5DF2\u4FDD\u5B58');
                    loadEmbyStatusAdmin();
                } else {
                    if (typeof showToast === 'function') showToast('\u274C ' + (data.error || '\u4FDD\u5B58\u5931\u8D25'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('\u274C ' + e.message);
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
                    if (typeof showToast === 'function') showToast('\u2705 \u5DF2\u4FDD\u5B58');
                } else {
                    if (typeof showToast === 'function') showToast('\u274C ' + (data.error || '\u4FDD\u5B58\u5931\u8D25'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('\u274C ' + e.message);
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
                    if (typeof showToast === 'function') showToast('\u2705 \u5DF2\u4FDD\u5B58');
                    loadEmbyStatusAdmin();
                } else {
                    if (typeof showToast === 'function') showToast('\u274C ' + (data.error || '\u4FDD\u5B58\u5931\u8D25'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('\u274C ' + e.message);
            }
        }
        async function revokeEmbyAuth(prefix) {
            if (!confirm('\u786E\u8BA4\u6E05\u9664\u8BE5\u8282\u70B9\u7684\u5DF2\u6536\u5272\u4EE4\u724C\uFF1F\u4E0B\u6B21\u4EE3\u7406\u8BF7\u6C42\u4F1A\u81EA\u52A8\u91CD\u65B0\u6536\u5272\u3002')) return;
            try {
                const res = await fetch('/api/status/revoke-auth', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('\u2705 \u5DF2\u6E05\u9664');
                    loadEmbyStatusAdmin();
                } else {
                    if (typeof showToast === 'function') showToast('\u274C ' + (data.error || '\u5931\u8D25'));
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('\u274C ' + e.message);
            }
        }
        async function generateShareDashboardLink() {
            try {
                const res = await fetch('/api/share/dashboard', { method: 'POST' });
                const data = await res.json();
                const box = document.getElementById('embyShareResult');
                if (data.success) {
                    box.style.display = 'block';
                    box.innerHTML = '\u2705 \u516C\u5F00\u5206\u4EAB\u94FE\u63A5\uFF081 \u5C0F\u65F6\u6709\u6548\uFF09\uFF1A<a href="' + _embyEscape(data.url) + '" target="_blank" rel="noopener">' + _embyEscape(data.url) + '</a>';
                    try { await navigator.clipboard.writeText(data.url); if (typeof showToast === 'function') showToast('\u2705 \u94FE\u63A5\u5DF2\u590D\u5236'); } catch (e) {}
                } else {
                    box.style.display = 'block';
                    box.innerHTML = '\u274C ' + _embyEscape(data.error || '\u751F\u6210\u5931\u8D25');
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('\u274C ' + e.message);
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
                    box.innerHTML = '\u2705 \u8282\u70B9 <code>/' + _embyEscape(prefix) + '</code> \u7684 SVG \u5361\u7247\uFF081 \u5C0F\u65F6\u6709\u6548\uFF09\uFF1A<a href="' + _embyEscape(data.url) + '" target="_blank" rel="noopener">' + _embyEscape(data.url) + '</a>';
                    try { await navigator.clipboard.writeText(data.url); if (typeof showToast === 'function') showToast('\u2705 \u94FE\u63A5\u5DF2\u590D\u5236'); } catch (e) {}
                } else {
                    box.style.display = 'block';
                    box.innerHTML = '\u274C ' + _embyEscape(data.error || '\u751F\u6210\u5931\u8D25');
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('\u274C ' + e.message);
            }
        }

        async function exportConfig() {
            try {
                const res = await fetch('/api/routes'); const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'emby_proxy_backup.json'; a.click();
                URL.revokeObjectURL(url); showToast('\u2705 \u914D\u7F6E\u5DF2\u5BFC\u51FA');
            } catch (e) { showToast('\u274C \u5BFC\u51FA\u5931\u8D25'); }
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
                        if (result.success) { showToast('\u2705 \u914D\u7F6E\u5BFC\u5165\u6210\u529F'); load(); } else throw new Error(result.error);
                    } catch (err) { showToast('\u274C \u5BFC\u5165\u5931\u8D25: ' + err.message); }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        async function load() {
            try {
                const res = await fetch('/api/routes');
                if (!res.ok) throw new Error('\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u73AF\u5883\u914D\u7F6E');
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                // \u{1F31F} \u65B0\u589E\uFF1A\u628A\u8282\u70B9\u6D41\u91CF\u6570\u636E\u5B58\u8FDB\u5168\u5C40\u5185\u5B58\uFF0C\u4F9B\u5927\u5C4F\u77AC\u95F4\u8BFB\u53D6\uFF01
                window.globalRoutesData = data;

                const container = document.getElementById('list-grid');
                if(data.length === 0) {
                    container.innerHTML = '<div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;">\u6682\u65E0\u914D\u7F6E\u4EFB\u4F55\u53CD\u4EE3\u8282\u70B9\uFF0C\u8BF7\u5148\u90E8\u7F72\u4E00\u4E2A\u3002</div>';
                    return;
                }
                
                container.innerHTML = '';
                proxyNodesForPing = []; 
                const currentHost = window.location.host;

                data.forEach((r, idx) => {
                    const proxyUrl = 'https://' + currentHost + '/' + r.prefix;
                    const targets = r.target.split(',').map(s => s.trim()).filter(Boolean);
                    const mainTarget = targets[0]; 
                    
                    const remarkName = r.remark || '\u672A\u547D\u540D\u5A92\u4F53\u5E93';
                    const lastPlay = r.last_play ? r.last_play : '\u6682\u65E0\u64AD\u653E\u8BB0\u5F55';
                    
                    const encodedTargets = encodeURIComponent(JSON.stringify(targets));

                    // \u{1F31F} \u63A5\u6536\u540E\u7AEF\u4F20\u6765\u7684\uFF1A\u5355\u8282\u70B9\u72EC\u7ACB\u5BBD\u5E26\u4E0E\u8BF7\u6C42\u7EDF\u8BA1\u6570\u636E
                    const todayBw = r.todayBandwidth || '0 B';
                    const totalReqs = r.totalReqs || r.todayReqs || 0;
                    const todayReqs = r.todayReqs || 0;

                    // \u72B6\u6001\u70B9\uFF1A\u4F9D\u636E\u6700\u540E\u6D3B\u8DC3\u6587\u672C\u5224\u5B9A\uFF08\u521A\u521A/\u79D2/\u5206\u949F/\u5C0F\u65F6 \u2192 live\uFF1B\u5929/\u6682\u65E0 \u2192 idle\uFF09
                    let statusClass = 'idle';
                    if (/\u521A\u521A|\u79D2|\u5206\u949F|\u5C0F\u65F6/.test(lastPlay)) statusClass = 'live';

                    const isIdle = (todayReqs === 0) && statusClass === 'idle';
                    const cardIdleCls = isIdle ? ' idle' : '';
                    const thumbIdleCls = isIdle ? ' idle' : '';

                    // \u7F29\u7565\u56FE\uFF1A\u6709 icon URL \u7528\u56FE\u7247\uFF0C\u5426\u5219\u53D6\u5907\u6CE8\u9996\u5B57
                    const thumbLetter = (remarkName.replace(/\\s+/g, '').charAt(0) || '?').toUpperCase();
                    const thumbInner = r.icon
                        ? \`<img src="\${r.icon}" alt="">\`
                        : thumbLetter;

                    // \u81EA\u5B9A\u4E49\u5934\u6807\u7B7E\uFF1A\u7EDF\u8BA1\u6761\u6570
                    const headerLines = (r.custom_headers || '').split('\\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
                    const headerKeys = headerLines.map(l => l.split(':')[0].trim()).filter(Boolean);

                    const cacheOn = r.cache_img !== 'off';
                    const escAttr = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

                    // \u72B6\u6001\u5FBD\u7AE0 + \u8FF7\u4F60\u6298\u7EBF\u56FE (\u8D8B\u52BF\u6570\u636E\u7F3A\u5931\u5219\u5360\u4F4D)
                    const badgeHtml = nodeBadgeHtml(statusClass);
                    let trendData = r.trend || r.trafficHistory || r.history || null;
                    if (!Array.isArray(trendData)) trendData = null;
                    const sparkHtml = nodeSparklineHtml(trendData);

                    proxyNodesForPing.push({ idx: idx, url: mainTarget });

                    container.innerHTML += \`
                    <div class="emby-card route-item\${cardIdleCls}" data-prefix="\${r.prefix}" data-search="\${remarkName} \${r.prefix}" data-custom-headers="\${(r.custom_headers || '').replace(/"/g, '&quot;')}">
                        <div class="a-head">
                            <div class="drag-handle a-handle" title="\u62D6\u62FD\u6392\u5E8F"><svg><use href="#i-grip"/></svg></div>
                            <input type="checkbox" class="node-cb a-cb" value="\${r.prefix}">
                            <div class="a-thumb\${thumbIdleCls}">\${thumbInner}</div>
                            <div class="a-title-block">
                                <div class="a-name">\${remarkName}</div>
                                <div class="a-meta">
                                    <span class="a-status-dot \${statusClass}" title="\${lastPlay}"></span>
                                    <span>/\${r.prefix}</span>
                                    <span class="dot-sep">\xB7</span>
                                    <span class="a-mode">\${modeNames[r.mode] || '\u672A\u77E5'}</span>
                                </div>
                            </div>
                            \${badgeHtml}
                        </div>

                        <div class="a-spark-slot" data-spark="\${r.prefix}" style="margin:2px 0;">\${sparkHtml}</div>

                        <div class="a-stats">
                            <div class="a-stat">
                                <div class="a-stat-label">\u4ECA\u65E5\u6D41\u91CF</div>
                                <span class="a-stat-val\${isIdle ? ' muted' : ''}">\${todayBw}</span>
                                <div class="a-stat-sub">\${isIdle ? '\u95F2\u7F6E' : '\u4ECA\u65E5\u7D2F\u79EF'}</div>
                            </div>
                            <div class="a-stat">
                                <div class="a-stat-label">\u4ECA\u65E5\u64AD\u653E</div>
                                <span class="a-stat-val\${isIdle ? ' muted' : ''}">\${todayReqs}</span>
                                <div class="a-stat-sub">\u7D2F\u8BA1 \${totalReqs}</div>
                            </div>
                            <div class="a-stat">
                                <div class="a-stat-label">\u5EF6\u8FDF</div>
                                <span id="ping-\${idx}" class="a-stat-val cursor-pointer"  onclick="pingTarget(\${idx}, '\${mainTarget}')" title="\u70B9\u51FB\u91CD\u65B0\u6D4B\u901F">\u6D4B\u901F\u4E2D</span>
                                <div class="a-stat-sub">\u70B9\u51FB\u91CD\u6D4B</div>
                            </div>
                        </div>

                        <div class="a-tags">
                            \${cacheOn
                                ? '<span class="a-tag good"><svg><use href="#i-image"/></svg>\u6D77\u62A5\u7F13\u5B58</span>'
                                : '<span class="a-tag warn"><svg><use href="#i-image"/></svg>\u7F13\u5B58\u5DF2\u5173\u95ED</span>'}
                            \${headerKeys.length
                                ? \`<span class="a-tag primary" onclick="toggleDetails(this)" title="\u70B9\u51FB\u67E5\u770B\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934"><svg><use href="#i-key"/></svg>\${headerKeys.length} \u4E2A\u81EA\u5B9A\u4E49\u5934</span>\`
                                : ''}
                            <span class="a-tag">\u6700\u540E\u6D3B\u8DC3 \${lastPlay}</span>
                        </div>

                        <div class="a-details">
                            <div class="a-detail-row">
                                <span class="a-detail-label">\u76F4\u8FBE\u94FE\u63A5</span>
                                <span id="p-\${idx}" data-val="\${proxyUrl}" class="a-detail-val secret-text">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>
                                <span class="a-detail-actions">
                                    <button class="a-icon-btn" onclick="toggleVis('p-\${idx}')" title="\u67E5\u770B\u660E\u6587"><svg><use href="#i-eye"/></svg></button>
                                    <button class="a-icon-btn" onclick="copyTxt('\${proxyUrl}')" title="\u590D\u5236\u94FE\u63A5"><svg><use href="#i-copy"/></svg></button>
                                </span>
                            </div>
                            <div class="a-detail-row">
                                <span class="a-detail-label">\u6E90\u7AD9</span>
                                <span id="t-\${idx}" data-val="\${encodedTargets}" class="a-detail-val secret-text">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>
                                <span class="a-detail-actions">
                                    <button class="a-icon-btn" onclick="toggleVis('t-\${idx}', true)" title="\u67E5\u770B\u660E\u6587"><svg><use href="#i-eye"/></svg></button>
                                </span>
                            </div>
                            \${headerKeys.length ? \`<div class="a-detail-row">
                                <span class="a-detail-label">\u81EA\u5B9A\u4E49\u5934</span>
                                <span class="a-detail-val" title="\${escAttr(headerKeys.join(', '))}">\${headerKeys.join(', ')}</span>
                                <span></span>
                            </div>\` : ''}
                        </div>

                        <div class="a-foot">
                            <button class="a-icon-btn" title="\u6D4B\u901F" onclick="pingTarget(\${idx}, '\${mainTarget}')"><svg><use href="#i-zap"/></svg></button>
                            <button class="a-icon-btn" title="\u590D\u5236\u76F4\u8FBE\u94FE\u63A5" onclick="copyTxt('\${proxyUrl}')"><svg><use href="#i-copy"/></svg></button>
                            <button class="a-icon-btn" title="\u66F4\u591A\u8BE6\u60C5" onclick="toggleDetails(this)"><svg><use href="#i-more"/></svg></button>
                            <span class="a-foot-spacer"></span>
                            <button class="a-btn-edit" onclick="editNode('\${r.prefix}', '\${r.target}', '\${r.mode}', '\${r.remark || ''}', '\${r.icon || ''}', '\${r.cache_img}')"><svg><use href="#i-edit"/></svg>\u7F16\u8F91</button>
                            <button class="a-icon-btn danger-hover" title="\u5220\u9664" onclick="del('\${r.prefix}')"><svg><use href="#i-trash"/></svg></button>
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
                            showToast('\u2705 \u6392\u5E8F\u5DF2\u4FDD\u5B58');
                        } catch(e) { showToast('\u274C \u6392\u5E8F\u4FDD\u5B58\u5931\u8D25'); }
                    }
                });

                // \u5237\u65B0\u9876\u90E8\u72B6\u6001\u680F: \u8282\u70B9\u603B\u6570
                const tbCount = document.getElementById('tb-node-count');
                if (tbCount) tbCount.textContent = String(data.length);
                updateTopbarHealth();

                // ECG \u5FC3\u7535\u56FE + 24h/7d \u53EF\u7528\u7387\uFF08\u4EC5\u5BF9\u5F00\u542F\u4E86 show_on_status \u7684\u8282\u70B9\u663E\u793A\uFF09
                injectEcgStrips();

                // \u5F02\u6B65\u62C9\u53D6\u8282\u70B9\u8FD1 7 \u5929\u6BCF\u65E5\u6D41\u91CF\u5E76\u56DE\u586B sparkline
                loadRouteTrends();

            } catch (err) {
                document.getElementById('list-grid').innerHTML = \`<div style="text-align:center; color:var(--err); font-weight:600; grid-column: 1 / -1; padding: 20px;">\u26A0\uFE0F \u8BFB\u53D6\u5931\u8D25: \${err.message}</div>\`;
            }
        }

        // \u5BA2\u6237\u7AEF ECG/\u5FC3\u7535\u56FE \u751F\u6210\u5668\uFF08\u4E0E\u670D\u52A1\u7AEF ecgStripSvg \u7B97\u6CD5\u4E00\u81F4\uFF09
        function buildEcgSvg(history) {
            const W = 240, H = 36, padX = 2, padY = 4;
            const innerW = W - padX * 2, innerH = H - padY * 2;
            const baseY = padY + innerH - 2;
            const samples = Array.isArray(history) ? history.slice(-60) : [];
            if (!samples.length) {
                return \`<svg class="ecg-svg" viewBox="0 0 \${W} \${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="\${padX}" y1="\${baseY}" x2="\${W-padX}" y2="\${baseY}" class="ecg-base"/><text x="\${W/2}" y="\${H/2+3}" class="ecg-empty" text-anchor="middle">\u6682\u65E0\u63A2\u6D4B</text></svg>\`;
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
                    if (!c) return; // \u8BE5\u8282\u70B9\u672A\u5F00\u542F\u72B6\u6001\u63A2\u6D4B
                    if (card.querySelector('.ecg-mount')) return; // \u5DF2\u6CE8\u5165\uFF0C\u8DF3\u8FC7
                    const pct = v => v == null ? '\u2014' : (v * 100).toFixed(1) + '%';
                    const block = document.createElement('div');
                    block.className = 'ecg-mount';
                    block.innerHTML =
                        '<div class="ecg-strip" aria-label="\u8FD1 60 \u6B21\u63A2\u6D4B\u5FC3\u7535\u56FE">' + buildEcgSvg(c.history) + '</div>' +
                        '<div class="ecg-meta">' +
                            '<span class="ecg-pill ' + (c.ok ? 'ok' : 'bad') + '">' +
                                '<span class="dot"></span>' + (c.ok ? '\u5728\u7EBF ' + (c.latest_ms | 0) + 'ms' : '\u79BB\u7EBF') +
                            '</span>' +
                            '<span class="ecg-stat"><b>24h</b> ' + pct(c.avail_24h) + '</span>' +
                            '<span class="ecg-stat"><b>7d</b> ' + pct(c.avail_7d) + '</span>' +
                        '</div>';
                    // \u63D2\u5165\u5230 sparkHtml \u4E4B\u540E\u3001a-stats \u4E4B\u524D\u3002\u5BFB\u627E .a-stats \u8282\u70B9\u3002
                    const stats = card.querySelector('.a-stats');
                    if (stats) card.insertBefore(block, stats);
                    else card.appendChild(block);
                });
            } catch (e) { /* silent */ }
        }

        // \u4F9D\u636E\u8282\u70B9\u5FBD\u7AE0\u7EDF\u8BA1\u5065\u5EB7\u5EA6\u5E76\u5237\u65B0\u9876\u680F
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

        // Aurora KPI hero \u2014 mirror topbar live data into the hero band.
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
                selectIcon(icon, foundItem ? foundItem.name : '\u5DF2\u9009\u62E9\u56FE\u6807');
            } else {
                selectIcon('', '\u9ED8\u8BA4 \u{1F3AC}');
            }

            document.getElementById('submitBtn').innerHTML = '<svg><use href="#i-save"/></svg>\u4FDD\u5B58\u4FEE\u6539';

            const container = document.getElementById('targetInputs');
            container.innerHTML = '';
            const targets = targetStr.split(',').map(s => s.trim()).filter(Boolean);
            targets.forEach((url, idx) => container.appendChild(makeUpstreamRow(idx, url)));
            container.appendChild(makeUpstreamRow(targets.length));
            handleTargetInputs();
            // \u7F16\u8F91\u8282\u70B9\u65F6\u5207\u5230\u300C\u7CFB\u7EDF\u8BBE\u7F6E\u300D\u5206\u533A, \u8BA9\u90E8\u7F72\u8868\u5355\u53EF\u89C1
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
            
            if (!target) return showToast('\u274C \u8BF7\u81F3\u5C11\u586B\u5199\u4E00\u4E2A\u4E3B\u7EBF\u8DEF\u5730\u5740');

            try {
                const res = await fetch('/api/routes', { 
                    method: 'POST', 
                    body: JSON.stringify({oldPrefix, prefix, target, mode, remark, icon, cache_img, custom_headers})
                });
                const data = await res.json();
                if(!data.success) throw new Error(data.error || '\u90E8\u7F72\u5931\u8D25');
                
                document.getElementById('addForm').reset();
                document.getElementById('oldPrefix').value = '';
                selectIcon('', '\u9ED8\u8BA4 \u{1F3AC}');
                document.getElementById('nodeCache').checked = true;
                syncCacheSwitch();
                HeadersEditor.set('');
                document.getElementById('submitBtn').innerHTML = '<svg><use href="#i-save"/></svg>\u4FDD\u5B58\u5E76\u90E8\u7F72';
                resetTargetInputs();
                
                showToast('\u2705 \u8282\u70B9\u90E8\u7F72\u6210\u529F');
                load();
            } catch(err) {
                showToast('\u274C \u4FDD\u5B58\u5931\u8D25: ' + err.message);
            }
        };

        async function del(prefix) {
            if(confirm('\u786E\u5B9A\u5220\u9664\u8282\u70B9 /' + prefix + ' ?')) {
                await fetch('/api/routes?prefix=' + prefix, { method: 'DELETE' });
                showToast('\u{1F5D1}\uFE0F \u8282\u70B9\u5DF2\u79FB\u9664');
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
            if (ips.length === 0) return showToast('\u26A0\uFE0F \u8BF7\u5148\u63D0\u53D6\u8282\u70B9\uFF01');
            navigator.clipboard.writeText(ips.join('\\n')).then(() => {
                showToast('\u2705 \u8282\u70B9\u5DF2\u590D\u5236\uFF0C\u5373\u5C06\u8DF3\u8F6C ITDog...');
                setTimeout(() => { window.open('https://www.itdog.cn/batch_tcping/', '_blank'); }, 1500);
            });
        }
        function directSubmitCname() {
            const input = document.getElementById('customIps').value.trim();
            if (!input) return showToast('\u26A0\uFE0F \u8BF7\u5148\u5728\u6587\u672C\u6846\u5185\u7C98\u8D34\u60A8\u7684\u4F18\u9009\u57DF\u540D');
            const domainRegex = /\\b([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}\\b/g;
            const matchedDomains = input.match(domainRegex) || [];
            const realDomains = matchedDomains.filter(d => !/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(d));
            if (realDomains.length === 0) return showToast('\u26A0\uFE0F \u6CA1\u6709\u63D0\u53D6\u5230\u5408\u6CD5\u7684\u57DF\u540D\u683C\u5F0F\uFF0C\u8BF7\u68C0\u67E5\u8F93\u5165\uFF01');
            if(!confirm(\`\u2728 \u63D0\u53D6\u5230\u4EE5\u4E0B\u57DF\u540D\uFF1A\\n\${realDomains.join('\\n')}\\n\\n\u786E\u5B9A\u8981\u76F4\u63A5\u5C06\u5176\u8BBE\u4E3A CNAME \u8BB0\u5F55\u5417\uFF1F\\n(\u6CE8\u610F\uFF1A\u8FD9\u4F1A\u6E05\u7A7A\u4F60\u914D\u7F6E\u7684\u57DF\u540D\u4E0B\u73B0\u6709\u7684\u8BB0\u5F55)\`)) return;
            const btn = document.getElementById('btnDirectCname');
            sendDnsRequest(realDomains, btn);
        }
        async function testCustomIPs() {
            const input = document.getElementById('customIps').value;
            if (!input.trim()) return showToast('\u26A0\uFE0F \u8BF7\u5148\u5728\u8F93\u5165\u6846\u7C98\u8D34 IP \u6216\u4F18\u9009\u57DF\u540D');
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
            if (extractedIps.length === 0) return showToast('\u26A0\uFE0F \u672A\u8BC6\u522B\u5230\u5408\u6CD5\u7684 IP \u6216 \u57DF\u540D\u683C\u5F0F');
            const btn = document.getElementById('btnTestCustom');
            const tbody = document.getElementById('testTableBody');
            btn.disabled = true; btn.textContent = '\u23F3 \u6D4B\u8BD5\u4E2D...';
            if(tbody.innerHTML.includes('\u6682\u65E0\u6570\u636E')) tbody.innerHTML = '';
            showToast(\`\u2705 \u63D0\u53D6\u5230 \${extractedIps.length} \u4E2A\u8282\u70B9\uFF0C\u5F00\u59CB\u6D4B\u901F\u6821\u9A8C\`);
            const promises = [];
            extractedIps.forEach(ip => {
                const tr = document.createElement('tr');
                tr.className = 'test-row';
                tr.innerHTML = \`
                    <td data-label="\u52FE\u9009\u8282\u70B9" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                    <td data-label="\u4E13\u5C5E\u8282\u70B9"><strong class="ip-text copyable"  onclick="copyTxt('\${ip}')" title="\u70B9\u51FB\u590D\u5236">\${ip}</strong></td>
                    <td data-label="\u9884\u4F30\u5EF6\u8FDF" class="latency cell-loading-bold" data-ms="9999" >\u6D4B\u7B97\u4E2D...</td>
                    <td data-label="\u8FDE\u901A\u72B6\u6001" class="speed text-muted" >-</td>
                    <td data-label="\u8BB0\u5F55/\u5F52\u5C5E\u5730" class="loc text-muted" >\u7B49\u5F85\u89E3\u6790</td>
                    <td data-label="\u5FEB\u6377\u64CD\u4F5C"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">\u552F\u4E00\u89E3\u6790</button></td>\`;
                tbody.insertBefore(tr, tbody.firstChild);
                promises.push(doLocalPing(ip, tr, '\u81EA\u5B9A\u4E49\u8282\u70B9'));
            });
            await Promise.all(promises);
            sortTableByLatency(tbody);
            document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
            btn.disabled = false; btn.textContent = '\u{1F9EA} \u6D4B\u8BD5\u7C98\u8D34\u7684\u8282\u70B9';
            showToast('\u{1F389} \u81EA\u5B9A\u4E49\u8282\u70B9\u6D4B\u901F\u5B8C\u6210\uFF01');
        }
        async function fetchCustomApiAndTest() {
            const apiUrl = document.getElementById('customApiUrl').value.trim();
            if (!apiUrl) return showToast('\u26A0\uFE0F \u8BF7\u5148\u586B\u5165\u81EA\u5B9A\u4E49 API \u94FE\u63A5');
            const btn = document.getElementById('btnFetchCustomApi');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            btn.disabled = true; btn.textContent = '\u23F3 \u62C9\u53D6\u4E2D...';
            statusTxt.innerHTML = \`\u6B63\u5728\u4ECE\u81EA\u5B9A\u4E49 API \u6293\u53D6\u6570\u636E...\`;
            if(tbody.innerHTML.includes('\u6682\u65E0\u6570\u636E')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(\`/api/get-custom-api-ips?url=\${encodeURIComponent(apiUrl)}\`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('\u26A0\uFE0F \u81EA\u5B9A\u4E49 API \u8FD4\u56DE\u4E3A\u7A7A'); return; }
                showToast(\`\u2705 \u63D0\u53D6 \${data.totalCount} \u4E2A\u8282\u70B9\uFF0C\u62BD\u53D6 \${data.ips.length} \u4E2A\u6D4B\u901F\`);
                btn.textContent = '\u26A1 \u6D4B\u901F\u4E2D...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = \`
                        <td data-label="\u52FE\u9009\u8282\u70B9" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="\u4E13\u5C5E\u8282\u70B9"><strong class="ip-text copyable"  onclick="copyTxt('\${ip}')" title="\u70B9\u51FB\u590D\u5236">\${ip}</strong></td>
                        <td data-label="\u9884\u4F30\u5EF6\u8FDF" class="latency cell-loading-bold" data-ms="9999" >\u6D4B\u7B97\u4E2D...</td>
                        <td data-label="\u8FDE\u901A\u72B6\u6001" class="speed text-muted" >-</td>
                        <td data-label="\u8BB0\u5F55/\u5F52\u5C5E\u5730" class="loc text-muted" >\u7B49\u5F85\u89E3\u6790</td>
                        <td data-label="\u5FEB\u6377\u64CD\u4F5C"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">\u552F\u4E00\u89E3\u6790</button></td>\`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, '\u81EA\u5B9A\u4E49 API'));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                showToast('\u{1F389} \u81EA\u5B9A\u4E49 API \u6D4B\u901F\u5B8C\u6210\uFF01');
                statusTxt.innerHTML = \`\u2705 \u6D4B\u901F\u5B8C\u6BD5\uFF01\u60A8\u53EF\u4EE5\u81EA\u7531\u7EC4\u5408\u66F4\u65B0 DNS\u3002\`;
            } catch (err) { showToast('\u274C \u62C9\u53D6\u5931\u8D25'); } 
            finally { btn.disabled = false; btn.textContent = '\u{1F310} \u62C9\u53D6 API \u5E76\u6D4B\u901F'; }
        }
        async function fetchRemoteAndTest() {
            const btn = document.getElementById('btnFetchRemote');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            const type = document.getElementById('ipType').value;
            const typeText = document.getElementById('ipType').options[document.getElementById('ipType').selectedIndex].text;
            btn.disabled = true; btn.textContent = '\u23F3 \u6B63\u5728\u63D0\u53D6\u8282\u70B9...';
            statusTxt.innerHTML = \`\u6B63\u5728\u62C9\u53D6 <strong>\${typeText}</strong> \u6570\u636E...\`;
            if(tbody.innerHTML.includes('\u6682\u65E0\u6570\u636E')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(\`/api/get-remote-ips?type=\${encodeURIComponent(type)}\`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('\u26A0\uFE0F \u672A\u83B7\u53D6\u5230\u8BE5\u7C7B\u578B IP'); return; }
                showToast(\`\u2705 \u6210\u529F\u63D0\u53D6 \${data.totalCount} \u4E2A\u53EF\u7528 IP\uFF0C\u62BD\u53D6 \${data.ips.length} \u4E2A\u6D4B\u901F\`);
                btn.textContent = '\u26A1 \u672C\u5730\u6D4B\u901F\u4E2D...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = \`
                        <td data-label="\u52FE\u9009\u8282\u70B9" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="\${ip}"></td>
                        <td data-label="\u4E13\u5C5E\u8282\u70B9"><strong class="ip-text copyable"  onclick="copyTxt('\${ip}')" title="\u70B9\u51FB\u590D\u5236">\${ip}</strong></td>
                        <td data-label="\u9884\u4F30\u5EF6\u8FDF" class="latency cell-loading-bold" data-ms="9999" >\u6D4B\u7B97\u4E2D...</td>
                        <td data-label="\u8FDE\u901A\u72B6\u6001" class="speed text-muted" >-</td>
                        <td data-label="\u8BB0\u5F55/\u5F52\u5C5E\u5730" class="loc text-muted" >\u7B49\u5F85\u89E3\u6790</td>
                        <td data-label="\u5FEB\u6377\u64CD\u4F5C"><button class="btn-dns" disabled onclick="updateSingleDns('\${ip}', this)">\u552F\u4E00\u89E3\u6790</button></td>\`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, typeText.replace(/[^\u4E00-\u9FA5a-zA-Z0-9]/g, '')));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                showToast('\u{1F389} \u6D4B\u901F\u5B8C\u6210\uFF01');
                statusTxt.innerHTML = \`\u2705 \u6D4B\u901F\u5B8C\u6BD5\uFF01\`;
            } catch (err) { showToast('\u274C \u62C9\u53D6\u6216\u6D4B\u901F\u5931\u8D25'); } 
            finally { btn.disabled = false; btn.textContent = '\u{1F30D} \u63D0\u53D6\u9884\u8BBE\u6E90\u5E76\u6D4B\u901F'; }
        }
        function clearTest() {
            document.getElementById('testTableBody').innerHTML = '<tr><td colspan="6" class="text-center-muted">\u6682\u65E0\u6570\u636E\uFF0C\u8BF7\u62C9\u53D6\u8282\u70B9\u6216\u8F93\u5165\u81EA\u5B9A\u4E49 IP/\u57DF\u540D \u6D4B\u8BD5</td></tr>';
            document.getElementById('statusText').textContent = '\u5217\u8868\u5DF2\u6E05\u7A7A\u3002';
            document.getElementById('selectAll').checked = false;
        }
        function markTimeout(latTd, spdTd, tr) {
            latTd.textContent = '\u8D85\u65F6\u629B\u5F03'; latTd.setAttribute('data-ms', 9999); latTd.style.color = 'var(--err)';
            spdTd.textContent = '\u274C \u8D85\u65F6 (>2000ms)'; spdTd.style.color = 'var(--err)';
            const cb = tr.querySelector('.row-checkbox');
            if(cb) { cb.disabled = true; cb.title = '\u4E0D\u53EF\u7528\u7684\u8282\u70B9\u65E0\u6CD5\u88AB\u52FE\u9009'; }
        }
        async function doLocalPing(ip, tr, sourceLabel) {
            const latTd = tr.querySelector('.latency');
            const spdTd = tr.querySelector('.speed');
            const locTd = tr.querySelector('.loc');
            const queryIp = ip.replace(/[\\[\\]]/g, '');
            const isIPv6 = ip.includes(':'); 
            const isDomain = /[a-zA-Z]/.test(queryIp) && !isIPv6;
            if (isDomain) { locTd.innerHTML = \`<span class="badge is-accent">CNAME</span> \${sourceLabel} | \u4F18\u9009\u57DF\u540D\`;
            } else {
                const recordLabel = isIPv6 ? '<span class="badge is-info">AAAA</span>' : '<span class="badge" style="background:var(--primary-soft);color:var(--primary);margin-right:var(--space-1);">A\u8BB0\u5F55</span>';
                fetch(\`https://api.ip.sb/geoip/\${queryIp}\`).then(res => res.json()).then(data => locTd.innerHTML = \`\${recordLabel} \${sourceLabel} | \${data.country || '\u672A\u77E5'}\`).catch(() => locTd.innerHTML = \`\${recordLabel} \${sourceLabel} | \u89E3\u6790\u5931\u8D25\`);
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
            if (latency < 300) { latTd.style.color = 'var(--ok)'; spdTd.textContent = '\u{1F680} \u6781\u4F73'; spdTd.style.color = 'var(--ok)'; } 
            else if (latency <= 500) { latTd.style.color = 'var(--primary)'; spdTd.textContent = '\u2705 \u6B63\u5E38'; spdTd.style.color = 'var(--primary)'; } 
            else { latTd.style.color = 'var(--warn)'; spdTd.textContent = '\u26A0\uFE0F \u8F83\u9AD8'; spdTd.style.color = 'var(--warn)'; }
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
            btnElement.textContent = '\u{1F504} \u66F4\u65B0 DNS \u4E2D...'; btnElement.disabled = true;
            try {
                const res = await fetch('/api/update-dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ips }) });
                const data = await res.json();
                if(data.success) { showToast(data.message); btnElement.textContent = '\u2705 \u66F4\u65B0\u6210\u529F'; loadDNS(); } 
                else { showToast('\u274C \u9519\u8BEF: ' + (data.error || '')); btnElement.textContent = originalText; }
            } catch(e) { showToast('\u274C \u7F51\u7EDC\u5F02\u5E38\uFF0C\u8BF7\u91CD\u8BD5'); btnElement.textContent = originalText; } 
            finally { setTimeout(() => { if(btnElement.textContent === '\u2705 \u66F4\u65B0\u6210\u529F') btnElement.textContent = originalText; btnElement.disabled = false; }, 3000); }
        }
        function updateSingleDns(ip, btnElement) {
            if(!confirm(\`\u786E\u5B9A\u8981\u5C06\u57DF\u540D\u89E3\u6790\u5230\uFF1A\\n\${ip} \\n\u8B66\u544A\uFF1A\u8FD9\u4F1A\u8986\u76D6\u57DF\u540D\u4E0B\u7684\u6240\u6709\u89E3\u6790\u8BB0\u5F55\uFF01\`)) return;
            sendDnsRequest([ip], btnElement);
        }
        function updateSelectedToDns() {
            const btn = document.getElementById('btnSelectedDns');
            const ips = getSelectedIps();
            if (ips.length === 0) return showToast('\u26A0\uFE0F \u8BF7\u5148\u52FE\u9009\u60A8\u60F3\u4F7F\u7528\u7684\u8282\u70B9');
            if(!confirm(\`\u5C06\u5E94\u7528\u52FE\u9009\u7684 \${ips.length} \u4E2A\u8282\u70B9\uFF1A\\n\${ips.join('\\n')}\\n\u786E\u5B9A\u66F4\u65B0 DNS \u8BB0\u5F55\u5417\uFF1F\`)) return;
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
            if(topIps.length === 0) return showToast('\u26A0\uFE0F \u6CA1\u627E\u5230\u53EF\u7528\u8282\u70B9\uFF0C\u8BF7\u5148\u6D4B\u901F');
            if(!confirm(\`\u5C06\u4E3A\u60A8\u5206\u53D1\u5F53\u524D\u6700\u5FEB\u7684 \${topIps.length} \u4E2A\u8282\u70B9\uFF1A\\n\${topIps.join('\\n')}\\n\u786E\u5B9A\u66F4\u65B0 DNS \u8BB0\u5F55\u5417\uFF1F\`)) return;
            sendDnsRequest(topIps, btn);
        }
        async function loadDNS() {
            const container = document.getElementById('dnsStatus');
            try {
                const res = await fetch('/api/get-dns'); const data = await res.json();
                if (data.success && data.result) {
                    const records = data.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                    if (records.length === 0) {
                        container.innerHTML = '<span class="badge" style="background:var(--warn-soft);color:var(--warn);">\u6682\u65E0\u89E3\u6790\u8BB0\u5F55</span>';
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
                } else container.innerHTML = \`<span class="badge" style="background:var(--err-soft);color:var(--err);">\${data.error || '\u83B7\u53D6\u5931\u8D25'}</span>\`;
            } catch (e) { container.innerHTML = '<span class="badge" style="background:var(--err-soft);color:var(--err);">\u7F51\u7EDC\u5F02\u5E38</span>'; }
        }
        
        function logout() {
            document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
        }

        // \u521D\u59CB\u5316\u52A0\u8F7D
        loadIcons().then(() => {
            load();
            loadDNS();
        });

        // ==========================================
        // \u{1F31F} \u65B0\u589E\uFF1ARTT \u5B9E\u65F6\u76D1\u6D4B\u5F15\u64CE (\u6BCF\u9694 3 \u79D2\u63A2\u6D4B\u4E00\u6B21)
        // ==========================================
        async function measureRTT() {
            const start = performance.now();
            try {
                // \u52A0\u4E0A\u65F6\u95F4\u6233\u5F3A\u5236\u7ED5\u8FC7\u6D4F\u89C8\u5668\u672C\u5730\u7F13\u5B58
                await fetch('/__client_rtt__?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
                const rtt = Math.round(performance.now() - start);
                const rttEl = document.getElementById('rttValue');
                const dotEl = document.getElementById('rttDot');
                
                rttEl.textContent = rtt + ' ms';
                
                // \u6839\u636E\u5EF6\u8FDF\u6539\u53D8\u547C\u5438\u706F\u989C\u8272
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
                document.getElementById('rttValue').textContent = '\u65AD\u8FDE';
                document.getElementById('rttDot').style.background = 'var(--err)';
            }
        }
        
        // \u5148\u7ACB\u5373\u6267\u884C\u4E00\u6B21\uFF0C\u7136\u540E\u6BCF 3 \u79D2\u5FAA\u73AF\u63A2\u6D4B
        measureRTT();
        setInterval(measureRTT, 3000);

    // \u{1F680} \u65B0\u589E\uFF1A\u524D\u7AEF\u63A2\u9488\u81EA\u52A8\u68C0\u6D4B\u811A\u672C
        async function fetchCfTrace() {
            try {
                const res = await fetch('/api/edge-info');
                const data = await res.json();
                if (data.success) {
                    // Compact entry: just the colo code (e.g. "HKG"); full text shown in pill tooltip
                    const entryEl = document.getElementById('trace-entry');
                    entryEl.innerText = data.entryColo || '--';
                    let fullEntry = data.entryCountry || '';
                    if (data.entryCity && data.entryCity !== '\u672A\u77E5') fullEntry += ' ' + data.entryCity;
                    fullEntry += ' (' + (data.entryColo || '?') + ')';
                    if (data.cacheKey) fullEntry += ' \xB7 key=' + data.cacheKey;
                    entryEl.title = '\u8BBF\u5BA2\u5165\u53E3: ' + fullEntry;

                    const egressText = data.egressColo;
                    const egressElem = document.getElementById('trace-egress');
                    egressElem.innerText = egressText;
                    egressElem.title = 'Worker \u843D\u5730: ' + egressText + (data.cacheKey ? ' \xB7 key=' + data.cacheKey : '');

                    if (data.entryColo !== egressText && egressText !== '\u63A2\u6D4B\u4E2D...' && egressText !== '\u83B7\u53D6\u5931\u8D25') {
                        egressElem.style.color = 'var(--warn)';
                        egressElem.title += ' (\u667A\u80FD\u653E\u7F6E/\u56DE\u6E90)';
                    }
                }
            } catch(e) {
                document.getElementById('trace-entry').innerText = '\u83B7\u53D6\u8D85\u65F6';
                document.getElementById('trace-egress').innerText = '\u83B7\u53D6\u8D85\u65F6';
            }
        }
        
        // \u5F53\u7F51\u9875\u52A0\u8F7D\u5B8C\u6210\u65F6\uFF0C\u5EF6\u8FDF0.5\u79D2\u6267\u884C\u63A2\u9488\u626B\u63CF\uFF08\u907F\u514D\u5361\u987F\u4E3B\u9875\u6E32\u67D3\uFF09
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(fetchCfTrace, 500);
        });
    // \u{1F680} \u65B0\u589E\uFF1A\u5168\u4E91\u5382\u5546\u8282\u70B9\u6570\u636E\u5E93 (\u5305\u542B Cloudflare \u652F\u6301\u7684\u6240\u6709\u4E3B\u8981\u533A\u57DF)
        var cfRegions = {
            aws: [
                { label: "\u{1F1ED}\u{1F1F0} \u4E2D\u56FD\u9999\u6E2F", value: "aws:ap-east-1" },
                { label: "\u{1F1EF}\u{1F1F5} \u65E5\u672C (\u4E1C\u4EAC)", value: "aws:ap-northeast-1" },
                { label: "\u{1F1EF}\u{1F1F5} \u65E5\u672C (\u5927\u962A)", value: "aws:ap-northeast-3" },
                { label: "\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761", value: "aws:ap-southeast-1" },
                { label: "\u{1F1F0}\u{1F1F7} \u97E9\u56FD (\u9996\u5C14)", value: "aws:ap-northeast-2" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u897F\u90E8 (\u52A0\u5DDE)", value: "aws:us-west-1" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u897F\u90E8 (\u4FC4\u52D2\u5188)", value: "aws:us-west-2" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u4E1C\u90E8 (\u5F17\u5409\u5C3C\u4E9A)", value: "aws:us-east-1" },
                { label: "\u{1F1E6}\u{1F1FA} \u6FB3\u5927\u5229\u4E9A (\u6089\u5C3C)", value: "aws:ap-southeast-2" },
                { label: "\u{1F1EE}\u{1F1F3} \u5370\u5EA6 (\u5B5F\u4E70)", value: "aws:ap-south-1" },
                { label: "\u{1F1EC}\u{1F1E7} \u82F1\u56FD (\u4F26\u6566)", value: "aws:eu-west-2" },
                { label: "\u{1F1E9}\u{1F1EA} \u5FB7\u56FD (\u6CD5\u5170\u514B\u798F)", value: "aws:eu-central-1" }
            ],
            gcp: [
                { label: "\u{1F1F9}\u{1F1FC} \u4E2D\u56FD\u53F0\u6E7E (\u5F70\u5316)", value: "gcp:asia-east1" },
                { label: "\u{1F1ED}\u{1F1F0} \u4E2D\u56FD\u9999\u6E2F", value: "gcp:asia-east2" },
                { label: "\u{1F1EF}\u{1F1F5} \u65E5\u672C (\u4E1C\u4EAC)", value: "gcp:asia-northeast1" },
                { label: "\u{1F1EF}\u{1F1F5} \u65E5\u672C (\u5927\u962A)", value: "gcp:asia-northeast2" },
                { label: "\u{1F1F0}\u{1F1F7} \u97E9\u56FD (\u9996\u5C14)", value: "gcp:asia-northeast3" },
                { label: "\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761", value: "gcp:asia-southeast1" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u897F\u90E8 (\u6D1B\u6749\u77F6)", value: "gcp:us-west2" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u897F\u90E8 (\u4FC4\u52D2\u5188)", value: "gcp:us-west1" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u4E1C\u90E8 (\u5F17\u5409\u5C3C\u4E9A)", value: "gcp:us-east4" },
                { label: "\u{1F1E6}\u{1F1FA} \u6FB3\u5927\u5229\u4E9A (\u6089\u5C3C)", value: "gcp:australia-southeast1" },
                { label: "\u{1F1EC}\u{1F1E7} \u82F1\u56FD (\u4F26\u6566)", value: "gcp:europe-west2" },
                { label: "\u{1F1E9}\u{1F1EA} \u5FB7\u56FD (\u6CD5\u5170\u514B\u798F)", value: "gcp:europe-west3" }
            ],
            azure: [
                { label: "\u{1F1ED}\u{1F1F0} \u4E2D\u56FD\u9999\u6E2F (East Asia)", value: "azure:eastasia" },
                { label: "\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761 (Southeast Asia)", value: "azure:southeastasia" },
                { label: "\u{1F1EF}\u{1F1F5} \u65E5\u672C\u4E1C\u90E8 (\u4E1C\u4EAC)", value: "azure:japaneast" },
                { label: "\u{1F1EF}\u{1F1F5} \u65E5\u672C\u897F\u90E8 (\u5927\u962A)", value: "azure:japanwest" },
                { label: "\u{1F1F0}\u{1F1F7} \u97E9\u56FD\u4E2D\u90E8 (\u9996\u5C14)", value: "azure:koreacentral" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u897F\u90E8 (West US)", value: "azure:westus" },
                { label: "\u{1F1FA}\u{1F1F8} \u7F8E\u56FD\u4E1C\u90E8 (East US)", value: "azure:eastus" },
                { label: "\u{1F1EC}\u{1F1E7} \u82F1\u56FD\u5357\u90E8 (\u4F26\u6566)", value: "azure:uksouth" },
                { label: "\u{1F1F3}\u{1F1F1} \u897F\u6B27 (\u8377\u5170)", value: "azure:westeurope" }
            ]
        };

        // \u{1F680} \u8054\u52A8\u83DC\u5355\u5904\u7406\u903B\u8F91 + \u540C\u6B65\u9876\u90E8 pill \u6807\u7B7E
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
                var labels = { aws: 'AWS', gcp: 'GCP', azure: 'Azure', custom: '\u81EA\u5B9A\u4E49' };
                if (labels[mode]) {
                    pillLabel.textContent = labels[mode];
                } else {
                    try {
                        var parsed = JSON.parse(mode);
                        pillLabel.textContent = parsed.mode === 'smart' ? '\u667A\u80FD' : '\u8FB9\u7F18';
                    } catch (_) { pillLabel.textContent = '\u667A\u80FD'; }
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

        // \u{1F680} \u65B0\u589E\uFF1A\u8C03\u7528\u90E8\u7F72\u4FEE\u6539\u63A5\u53E3
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
                    statusElem.innerText = "\u274C \u8BF7\u586B\u5199\u81EA\u5B9A\u4E49\u533A\u57DF\u4EE3\u7801\uFF08\u5982 gcp:asia-east2\uFF09";
                    statusElem.style.color = "var(--err)";
                    return;
                }
                placementPayload = { region: customVal.trim() };
            } else {
                placementPayload = JSON.parse(modeVal);
            }

            statusElem.innerText = "\u23F3 \u6B63\u5728\u63D0\u4EA4\u8BF7\u6C42\uFF0C\u8BF7\u7A0D\u5019...";
            statusElem.style.color = "var(--warn)";
            
            try {
                var res = await fetch('/api/placement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placement: placementPayload })
                });
                var data = await res.json();
                if (data.success) {
                    statusElem.innerText = "\u2705 " + data.msg;
                    statusElem.style.color = "var(--ok)";
                } else {
                    statusElem.innerText = "\u274C " + data.msg;
                    statusElem.style.color = "var(--err)";
                }
            } catch(e) {
                statusElem.innerText = "\u274C \u7F51\u7EDC\u9519\u8BEF: " + e.message;
                statusElem.style.color = "var(--err)";
            }
        }
    // \u{1F680} \u9B54\u6CD5\u529F\u80FD\uFF1A\u81EA\u52A8\u7EE7\u627F\u73B0\u6709\u7684\u6A21\u5F0F\u9009\u9879 (\u589E\u5F3A\u7A33\u5B9A\u7248)
        setTimeout(() => {
            const sourceSelect = document.getElementById('mode');
            const batchSelect = document.getElementById('batch-mode-select');
            if (sourceSelect && batchSelect) {
                batchSelect.innerHTML = sourceSelect.innerHTML;
            }
        }, 100); 

        // \u{1F680} \u5168\u9009 / \u53D6\u6D88\u5168\u9009\u903B\u8F91
        function toggleSelectAll(checkbox) {
            const checkboxes = document.querySelectorAll('.node-cb');
            checkboxes.forEach(cb => cb.checked = checkbox.checked);
        }

        // \u{1F680} \u5E76\u53D1\u6279\u91CF\u4FEE\u6539\u6A21\u5F0F\u903B\u8F91 (\u7EC8\u6781\u591A\u7EBF\u7A0B\u9010\u4E2A\u51FB\u7834\u7248)
        async function batchUpdateModes() {
            const statusElem = document.getElementById('batch-status');
            const newMode = document.getElementById('batch-mode-select').value;
            
            const selectedPrefixes = Array.from(document.querySelectorAll('.node-cb:checked')).map(cb => cb.value);

            if (selectedPrefixes.length === 0) {
                statusElem.innerText = "\u26A0\uFE0F \u8BF7\u5148\u6253\u52FE\u9700\u8981\u4FEE\u6539\u7684\u8282\u70B9\uFF01";
                statusElem.style.color = "var(--warn)";
                return;
            }

            if (!confirm("\u786E\u5B9A\u8981\u5C06\u52FE\u9009\u7684 " + selectedPrefixes.length + " \u4E2A\u8282\u70B9\u5207\u6362\u4E3A\u8BE5\u6A21\u5F0F\u5417\uFF1F")) return;

            statusElem.innerText = "\u23F3 \u6B63\u5728\u591A\u7EBF\u7A0B\u5E76\u53D1\u4FEE\u6539\u8282\u70B9...";
            statusElem.style.color = "var(--primary)";

            try {
                // 1. \u5148\u83B7\u53D6\u5F53\u524D\u6240\u6709\u7684\u8282\u70B9\u8BE6\u7EC6\u6570\u636E
                const getRes = await fetch('/api/routes');
                const allRoutes = await getRes.json();
                
                // 2. \u7B5B\u9009\u51FA\u4F60\u8981\u4FEE\u6539\u7684\u90A3\u4E9B\u8282\u70B9
                const nodesToUpdate = allRoutes.filter(r => selectedPrefixes.includes(r.prefix));

                // 3. \u6838\u5FC3\u9B54\u6CD5\uFF1APromise.all \u5E76\u53D1\uFF01\u77AC\u95F4\u53D1\u51FA\u591A\u4E2A\u72EC\u7ACB\u7684\u4FDD\u5B58\u8BF7\u6C42
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
                        throw new Error("\u8282\u70B9 " + r.prefix + " \u4FDD\u5B58\u5931\u8D25");
                    }
                }));
                
                statusElem.innerText = "\u2705 \u6279\u91CF\u4FEE\u6539\u6210\u529F\uFF01";
                statusElem.style.color = "var(--ok)";
                setTimeout(() => location.reload(), 1000); 

            } catch (e) {
                statusElem.innerText = "\u274C \u5931\u8D25: " + e.message;
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
                alert('\u26A0\uFE0F \u5931\u8D25\uFF1A\u8BF7\u5148\u7C98\u8D34\u4EE3\u7801\uFF0C\u6216\u8005\u9009\u62E9\u4E00\u4E2A .js \u6587\u4EF6\uFF01');
                return;
            }
            if (!confirm('\u{1F6A8} \u5371\u9669\u64CD\u4F5C\u786E\u8BA4 \u{1F6A8}\\n\\n\u4F60\u5373\u5C06\u5F3A\u884C\u8986\u76D6\u5F53\u524D Worker \u7684\u4EE3\u7801\u3002\\n\u5982\u679C\u65B0\u4EE3\u7801\u6709\u9519\u8BEF\uFF0C\u6B64\u9762\u677F\u5C06\u4F1A\u762B\u75EA\uFF0C\u53EA\u80FD\u53BB\u7F51\u9875\u540E\u53F0\u62A2\u4FEE\uFF01\\n\\n\u786E\u5B9A\u4EE3\u7801 100% \u6B63\u786E\u5E76\u8986\u76D6\u5417\uFF1F')) return;
            const btn = document.getElementById('deployBtn');
            const originalText = btn.innerText;
            btn.innerText = '\u23F3 \u6B63\u5728\u4E0E Cloudflare \u901A\u4FE1\u5E76\u90E8\u7F72...';
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
                    alert('\u{1F389} \u6210\u529F\uFF01' + data.msg + '\\n\\n\u70B9\u51FB\u786E\u5B9A\u540E\u9875\u9762\u5C06\u81EA\u52A8\u5237\u65B0\u3002');
                    window.location.reload(); 
                } else {
                    alert('\u274C \u90E8\u7F72\u5931\u8D25\uFF1A\\n' + JSON.stringify(data.error));
                }
            } catch (e) {
                alert('\u{1F6A8} \u5F02\u5E38\uFF1A\\n' + e.message);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
        // ==========================================
        // \u{1F7E2} \u5728\u7EBF\u66F4\u65B0\u6A21\u5757
        // ==========================================
        // \u8FD9\u91CC\u7684\u53D8\u91CF\u4F1A\u81EA\u52A8\u4ECE\u4EE3\u7801\u6700\u9876\u7AEF\u7684\u914D\u7F6E\u533A\u8BFB\u53D6\u6CE8\u5165
        const CURRENT_VERSION = "${CURRENT_VERSION}"; 
        const GITHUB_RAW_URL = "${GITHUB_RAW_URL}"; 
        
        let latestCode = ""; 

        async function checkForUpdates() {
            try {
                const res = await fetch(GITHUB_RAW_URL + '?t=' + new Date().getTime());
                if (!res.ok) return;
                latestCode = await res.text();
                
                // \u{1F680} \u6838\u5FC3\u4FEE\u590D\uFF1A\u52A0\u5165\u53CC\u91CD\u53CD\u659C\u6760\uFF0C\u9632\u6B62\u6B63\u5219\u5728 Worker \u4E2D\u53D8\u6210\u6CE8\u91CA (//) \u5BFC\u81F4\u5D29\u6E83
                const versionMatch = latestCode.match(/\\/\\/\\s*VERSION:\\s*v?([\\d\\.]+)/i);
                if (versionMatch && versionMatch[1]) {
                    const latestVersion = versionMatch[1];
                    if (latestVersion !== CURRENT_VERSION) {
                        document.getElementById('updateAlert').style.display = 'block';
                        document.getElementById('updateMsg').innerText = '\u5F53\u524D\u7248\u672C: v' + CURRENT_VERSION + ' | \u53D1\u73B0\u6700\u65B0\u7248\u672C: v' + latestVersion + ' (Github)';
                    }
                }
            } catch (e) {
                console.log("\u68C0\u6D4B\u66F4\u65B0\u5931\u8D25:", e);
            }
        }

        async function doOnlineUpdate() {
            if (!confirm('\u{1F680} \u786E\u5B9A\u8981\u4ECE GitHub \u62C9\u53D6\u6700\u65B0\u7248\u672C\u5E76\u8986\u76D6\u5F53\u524D\u8282\u70B9\u5417\uFF1F\\n\\n\uFF08\u8FD9\u5C06\u4F1A\u4FDD\u7559\u4F60\u7684\u6240\u6709\u73AF\u5883\u53D8\u91CF\u548C\u6570\u636E\u5E93\u7ED1\u5B9A\uFF09')) return;
            
            const btn = document.getElementById('onlineUpdateBtn');
            btn.innerText = '\u23F3 \u6B63\u5728\u62C9\u53D6\u5E76\u90E8\u7F72...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            try {
                // \u76F4\u63A5\u590D\u7528\u6211\u4EEC\u4E4B\u524D\u5199\u597D\u7684\u9632\u4E22\u6570\u636E\u5E93\u9AD8\u7EA7 API
                const res = await fetch('/api/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newCode: latestCode })
                });
                const data = await res.json();
                if (data.success) {
                    alert('\u{1F389} \u5728\u7EBF\u66F4\u65B0\u6210\u529F\uFF01\\n\\n\u70B9\u51FB\u786E\u5B9A\u540E\u9875\u9762\u5C06\u81EA\u52A8\u5237\u65B0\uFF0C\u7545\u4EAB\u65B0\u7248\u672C\uFF01');
                    window.location.reload(); 
                } else {
                    alert('\u274C \u66F4\u65B0\u5931\u8D25\uFF1A\\n' + JSON.stringify(data.error));
                }
            } catch (e) {
                alert('\u{1F6A8} \u5F02\u5E38\uFF1A\\n' + e.message);
            } finally {
                btn.innerText = '\u{1F680} \u4E00\u952E\u62C9\u53D6\u5E76\u5347\u7EA7';
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }

        // \u9875\u9762\u52A0\u8F7D\u5B8C\u6210\u540E\u81EA\u52A8\u5728\u540E\u53F0\u9759\u9ED8\u68C0\u6D4B\u66F4\u65B0
        document.addEventListener('DOMContentLoaded', checkForUpdates);

        // ============================================================
        // UI Suggestions v2.0.7 \u2014 Headers Editor + menu helpers
        // ============================================================

        // Generic dropdown menu (used by "\u66F4\u591A \u25BE" and "\u914D\u7F6E\u5DE5\u5177")
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

        // Append a backup line input (called by the dashed "+ \u6DFB\u52A0\u5907\u7528\u7EBF\u8DEF" button)
        function addBackupLine() {
            const wrap = document.getElementById('targetInputs');
            if (!wrap) return;
            const existing = wrap.querySelectorAll('.target-input').length;
            const row = document.createElement('div');
            row.className = 'a-upstream-row';
            row.innerHTML = '<span class="a-tag-bk">\u5907 ' + existing + '</span>' +
                '<input type="url" class="a-input target-input" placeholder="\u5907\u7528\u7EBF\u8DEF ' + existing + ' (\u9009\u586B\uFF0C\u4E3B\u6E90\u6302\u6389\u65F6\u89E6\u53D1)" oninput="handleTargetInputs()">';
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

        // Headers Editor \u2014 KV editor that serializes to the legacy "Key: Value\\n..." format
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
                    list.innerHTML = '<div class="hed-empty">\u5C1A\u672A\u6DFB\u52A0\u4EFB\u4F55\u8BF7\u6C42\u5934 \xB7 \u70B9\u300C+ \u6DFB\u52A0\u8BF7\u6C42\u5934\u300D\u6216\u4ECE\u4E0B\u65B9\u6A21\u677F\u63D2\u5165</div>';
                } else {
                    list.innerHTML = rows.map(r => {
                        const sensitive = r.masked || isSensitiveKey(r.key);
                        return '<div class="hed-row ' + (r.on ? '' : 'disabled') + '" draggable="true" data-id="' + r.id + '">' +
                            '<span class="hed-handle" title="\u62D6\u62FD\u6392\u5E8F">\u22EE\u22EE</span>' +
                            '<input type="text" class="hed-k" value="' + escapeHtml(r.key) + '" placeholder="Header-Name" data-id="' + r.id + '" data-field="key">' +
                            '<div class="hed-v-wrap">' +
                                '<input type="' + (r.masked ? 'password' : 'text') + '" class="hed-v" value="' + escapeHtml(r.value) + '" placeholder="value" data-id="' + r.id + '" data-field="value">' +
                                (sensitive ? '<button type="button" class="mask-btn" data-id="' + r.id + '" title="' + (r.masked ? '\u663E\u793A' : '\u9690\u85CF') + '"><svg><use href="#' + (r.masked ? 'i-eye' : 'i-eye-off') + '"/></svg></button>' : '') +
                            '</div>' +
                            '<div class="ios-switch ' + (r.on ? 'on' : '') + '" data-id="' + r.id + '" title="' + (r.on ? '\u5DF2\u542F\u7528' : '\u5DF2\u505C\u7528') + '"></div>' +
                            '<button type="button" class="hed-del" data-id="' + r.id + '" title="\u5220\u9664"><svg><use href="#i-x"/></svg></button>' +
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
                        showToast('\u300C' + k + '\u300D\u5DF2\u5B58\u5728');
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
                        showToast('\u274C \u672A\u5728 cURL \u4E2D\u627E\u5230 -H \u6807\u5934');
                        return;
                    }
                    this.closeCurlModal();
                    render();
                    showToast('\u2705 \u5BFC\u5165 ' + added + ' \u6761\u8BF7\u6C42\u5934');
                }
            };
        })();
        window.HeadersEditor = HeadersEditor;

        // Bootstrap empty editor once DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            HeadersEditor.init('');
            syncCacheSwitch();
        });
    <\/script>

    <!-- cURL paste modal (UI Suggestions v2.0.7) -->
    <div class="curl-modal-bg" id="curlModal" onclick="if(event.target===this) HeadersEditor.closeCurlModal()">
        <div class="curl-modal">
            <h3>\u4ECE cURL \u547D\u4EE4\u5BFC\u5165</h3>
            <p>\u7C98\u8D34\u6D4F\u89C8\u5668 DevTools \u300CCopy as cURL\u300D \u51FA\u6765\u7684\u5185\u5BB9\uFF0C\u81EA\u52A8\u63D0\u53D6\u6240\u6709 <code style="background:rgba(120,120,120,0.1);padding:1px 4px;border-radius:3px;font-size:var(--text-xs);">-H</code> \u6807\u5934\uFF1A</p>
            <textarea id="curlInput" placeholder="curl 'https://example.com/api/users/AuthenticateByName' \\&#10;  -H 'authorization: MediaBrowser Token=&quot;xxx&quot;' \\&#10;  -H 'x-emby-token: abc123' \\&#10;  --compressed"></textarea>
            <div class="curl-modal-actions">
                <button class="btn-tier" onclick="HeadersEditor.closeCurlModal()">\u53D6\u6D88</button>
                <button class="btn-tier is-primary" onclick="HeadersEditor.parseCurl()">\u89E3\u6790\u5E76\u5BFC\u5165</button>
            </div>
        </div>
    </div>

    <!-- \u79FB\u52A8\u7AEF\u5E95\u90E8\u5BFC\u822A Tab Bar v5 (\u684C\u9762\u7AEF CSS \u9690\u85CF) \u2014 5 \u4E3B\u9879 + \u66F4\u591A sheet -->
    <nav id="mobileTabBar" aria-label="\u5E95\u90E8\u5BFC\u822A">
        <button type="button" data-tab="home" class="active" aria-label="\u6982\u89C8">
            <svg class="ico-outline" viewBox="0 0 24 24"><path d="M3 12 12 4l9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><path d="M11.3 3.5a1 1 0 0 1 1.4 0l8.6 7.6a1 1 0 0 1-.7 1.74H19V20a1 1 0 0 1-1 1h-3v-6h-4v6H8a1 1 0 0 1-1-1v-7.16H5.4a1 1 0 0 1-.7-1.74z"/></svg>
            <span>\u6982\u89C8</span>
        </button>
        <button type="button" data-tab="speed" aria-label="\u6D4B\u901F">
            <svg class="ico-outline" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><path d="M13.4 2.13a.8.8 0 0 1 1.32.79L13.5 10h7.05a.8.8 0 0 1 .62 1.31l-10 12a.8.8 0 0 1-1.42-.61L10.95 14H3.9a.8.8 0 0 1-.62-1.31z"/></svg>
            <span>\u6D4B\u901F</span>
        </button>
        <button type="button" data-tab="stats" aria-label="\u6570\u636E">
            <svg class="ico-outline" viewBox="0 0 24 24"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><rect x="4" y="13" width="4" height="8" rx="1"/><rect x="10" y="9" width="4" height="12" rx="1"/><rect x="16" y="3" width="4" height="18" rx="1"/></svg>
            <span>\u6570\u636E</span>
        </button>
        <button type="button" data-tab="settings" aria-label="\u8BBE\u7F6E">
            <svg class="ico-outline" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.34 7.34 0 0 0-1.7-.98l-.38-2.65a.5.5 0 0 0-.5-.42h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.61.24-1.18.57-1.7.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.41 1.09.74 1.7.98l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.61-.24 1.18-.57 1.7-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"/></svg>
            <span>\u8BBE\u7F6E</span>
        </button>
        <button type="button" data-tab="more" aria-label="\u66F4\u591A" aria-haspopup="true">
            <svg class="ico-outline" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>
            <svg class="ico-filled" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            <span>\u66F4\u591A</span>
        </button>
    </nav>

    <!-- \u66F4\u591A sheet (mobile-only iOS action sheet for overflow sections) -->
    <div id="moreSheet" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="moreSheetTitle" onclick="if(event.target===this) closeMoreSheet()">
        <div class="more-sheet-card" role="document">
            <span class="more-sheet-grip" aria-hidden="true"></span>
            <h3 class="more-sheet-title" id="moreSheetTitle">\u66F4\u591A\u5165\u53E3</h3>
            <div class="more-sheet-list">
                <button type="button" class="more-sheet-row" data-section="embyStatus">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>\u8282\u70B9\u72B6\u6001</span>
                    <svg class="ms-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button type="button" class="more-sheet-row" data-section="tools">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    <span>\u5DE5\u5177\u7BB1</span>
                    <svg class="ms-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button type="button" class="more-sheet-row is-danger" data-section="danger">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>\u5371\u9669\u533A</span>
                    <svg class="ms-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
        </div>
    </div>

    <script>
        // \u{1F4F1} Mobile bottom Tab Bar + status pills (mobile only; desktop CSS hides them)
        (function () {
            function initMobileTabBar() {
                const bar = document.getElementById('mobileTabBar');
                if (!bar) return;
                // tab \u2192 section \u6620\u5C04 (v5: more = \u66F4\u591A sheet, \u4E0D\u76F4\u63A5\u8DF3\u5206\u533A)
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
                            // \u7B49 sheet \u6536\u56DE\u518D\u5207\uFF0C\u907F\u514D\u52A8\u753B\u5361\u987F
                            setTimeout(() => showSection(section), 200);
                        }
                    });
                });
                // ESC / \u80CC\u666F\u70B9\u51FB\u5173\u95ED\u5DF2\u7531 onclick + keydown \u5904\u7406
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
                            if (txt && txt !== '\u52A0\u8F7D\u4E2D...') d.textContent = txt;
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
            // \u{1F4F1} Drag-to-dismiss for the bottom-sheet dashboard modal (mobile only)
            function initSheetGesture() {
                const modal = document.getElementById('dashboardModal');
                if (!modal) return;
                const card = modal.querySelector('.card');
                if (!card) return;
                const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
                let startY = 0, dy = 0, dragging = false;

                card.addEventListener('touchstart', (e) => {
                    if (!isMobile()) return;
                    // Allow drag from grip area (top 44px) regardless of scrollTop \u2014 supports both directions
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
                overview:    { title: '\u6982\u89C8',        sub: '\u5B9E\u65F6\u72B6\u6001\u4E0E\u6838\u5FC3\u6307\u6807' },
                speed:       { title: '\u6D4B\u901F & DNS',  sub: '\u8282\u70B9\u5EF6\u8FDF\u4E0E\u89E3\u6790\u63A2\u6D4B' },
                stats:       { title: '\u6570\u636E\u7EDF\u8BA1',     sub: '\u6D41\u91CF\u3001\u5E76\u53D1\u4E0E\u5386\u53F2\u8D8B\u52BF' },
                embyStatus:  { title: '\u8282\u70B9\u72B6\u6001',     sub: '\u63A2\u6D4B\u3001\u544A\u8B66\u4E0E\u516C\u5F00\u5206\u4EAB' },
                settings:    { title: '\u7CFB\u7EDF\u8BBE\u7F6E',     sub: '\u5E94\u7528\u3001\u901A\u77E5\u4E0E\u8D26\u6237' },
                tools:       { title: '\u5DE5\u5177\u7BB1',       sub: '\u5B9E\u7528\u5DE5\u5177\u96C6\u5408' },
                danger:      { title: '\u5371\u9669\u533A',       sub: '\u4E0D\u53EF\u9006\u64CD\u4F5C\uFF0C\u8BF7\u8C28\u614E' },
            };
            // \u66B4\u9732\u7ED9 showSection() \u7528\u6765\u540C\u6B65\u7D27\u51D1\u680F\u6807\u9898
            window.__iosSectionTitles = Object.fromEntries(
                Object.entries(IOS_SECTION_TITLES).map(([k, v]) => [k, v.title])
            );

            function injectMobileBrand() {
                const topbar = document.getElementById('cf-trace-card');
                if (!topbar || topbar.querySelector('.mob-brand')) return;
                const brand = document.createElement('div');
                brand.className = 'mob-brand';
                brand.innerHTML = '<span class="mb-logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span>\u53CD\u4EE3\u6838\u5FC3</span>';
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
                    '<button type="button" class="ios-form-row is-tap is-danger" id="iosLogoutBtn" style="width:100%;border:none;background:transparent;font:inherit;cursor:pointer;justify-content:center;font-weight:600;">\u9000\u51FA\u767B\u5F55</button>';
                settings.appendChild(group);
                group.querySelector('#iosLogoutBtn').addEventListener('click', () => {
                    if (confirm('\u786E\u8BA4\u9000\u51FA\u767B\u5F55\uFF1F')) {
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
    <\/script>
</body>
</html>
`;

// src/ui/svg.js
function ecgStripSvg(history, opts) {
  opts = opts || {};
  const W = 240, H = 36;
  const padX = 2, padY = 4;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const baseY = padY + innerH - 2;
  const samples = Array.isArray(history) ? history.slice(-60) : [];
  if (!samples.length) {
    return `<svg class="ecg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <line x1="${padX}" y1="${baseY}" x2="${W - padX}" y2="${baseY}" class="ecg-base"/>
            <text x="${W / 2}" y="${H / 2 + 3}" class="ecg-empty" text-anchor="middle">\u6682\u65E0\u63A2\u6D4B</text>
        </svg>`;
  }
  const n = samples.length;
  const stepX = n > 1 ? innerW / (n - 1) : innerW;
  const msToY = (ms) => {
    const capped = Math.max(0, Math.min(400, ms || 0));
    return baseY - capped / 400 * (innerH * 0.85);
  };
  let okPath = "";
  let failMarks = "";
  let lastX = padX;
  let cursor = padX;
  let inOkRun = false;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const x = padX + stepX * i;
    if (s.ok) {
      const peakY = msToY(s.ms);
      const preX = Math.max(lastX, x - stepX * 0.45);
      const upX = x - stepX * 0.18;
      const dnX = x + stepX * 0.1;
      const tailX = x + stepX * 0.25;
      if (!inOkRun) {
        okPath += `M${preX.toFixed(2)} ${baseY}`;
        inOkRun = true;
      } else {
        okPath += `L${preX.toFixed(2)} ${baseY}`;
      }
      okPath += ` L${upX.toFixed(2)} ${baseY} L${x.toFixed(2)} ${peakY.toFixed(2)} L${dnX.toFixed(2)} ${baseY} L${tailX.toFixed(2)} ${baseY}`;
      lastX = tailX;
    } else {
      if (inOkRun) {
        okPath += ` L${(x - stepX * 0.3).toFixed(2)} ${baseY}`;
        inOkRun = false;
      }
      failMarks += `<line x1="${x.toFixed(2)}" y1="${(padY + 1).toFixed(2)}" x2="${x.toFixed(2)}" y2="${baseY.toFixed(2)}" class="ecg-fail"/>`;
      lastX = x;
    }
  }
  if (inOkRun) {
    okPath += ` L${(padX + innerW).toFixed(2)} ${baseY}`;
  }
  const lastSample = samples[n - 1];
  const lastX2 = padX + innerW;
  const lastY = lastSample.ok ? msToY(lastSample.ms) : baseY;
  const lastClass = lastSample.ok ? "ecg-dot ok" : "ecg-dot bad";
  return `<svg class="ecg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <line x1="${padX}" y1="${baseY}" x2="${W - padX}" y2="${baseY}" class="ecg-base"/>
        <line x1="${padX}" y1="${(padY + innerH * 0.5).toFixed(2)}" x2="${W - padX}" y2="${(padY + innerH * 0.5).toFixed(2)}" class="ecg-mid"/>
        ${okPath ? `<path d="${okPath}" class="ecg-line" fill="none"/>` : ""}
        ${failMarks}
        <circle cx="${lastX2.toFixed(2)}" cy="${lastY.toFixed(2)}" r="2.4" class="${lastClass}"/>
    </svg>`;
}
function renderCardSvg(card) {
  const w = 360, h = 120;
  const ok = card.ok;
  const dotColor = ok ? "#30d158" : "#ff3b30";
  const statusText = ok ? "\u5728\u7EBF" : "\u79BB\u7EBF";
  const pct = (v) => v == null ? "\u2014" : (v * 100).toFixed(1) + "%";
  const name = String(card.name || "").slice(0, 40);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      .bg { fill:#1c1c1e; }
      .text { fill:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; }
      .name { font-size:16px; font-weight:600; }
      .label { font-size:11px; fill:#98989d; }
      .value { font-size:14px; font-weight:600; }
    </style>
  </defs>
  <rect class="bg" x="0" y="0" width="${w}" height="${h}" rx="14"/>
  <circle cx="22" cy="24" r="6" fill="${dotColor}"/>
  <text class="text name" x="38" y="29">${htmlEscape(name)}</text>
  <text class="text label" x="20" y="60">\u72B6\u6001</text>
  <text class="text value" x="20" y="78" fill="${dotColor}">${statusText}</text>
  <text class="text label" x="130" y="60">7\u5929\u53EF\u7528</text>
  <text class="text value" x="130" y="78">${pct(card.avail_7d)}</text>
  <text class="text label" x="240" y="60">\u5EF6\u8FDF</text>
  <text class="text value" x="240" y="78">${ok ? card.latest_ms + " ms" : "\u2014"}</text>
  <text class="text label" x="20" y="104">\u7531 emby-proxy \u76D1\u63A7</text>
</svg>`;
}

// src/emby/tokens.js
var HARVEST_MEM = /* @__PURE__ */ new Map();
async function tokenKey(env, prefix) {
  const ikm = new TextEncoder().encode(String(env.ADMIN_TOKEN || ""));
  const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(String(prefix || "")),
      info: new TextEncoder().encode("emby-proxy:harvested-token")
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
function b64encode(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function encryptToken(env, prefix, token) {
  const key = await tokenKey(env, prefix);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return b64encode(iv) + "." + b64encode(new Uint8Array(ct));
}
async function decryptToken(env, prefix, blob) {
  if (!blob || typeof blob !== "string" || blob.indexOf(".") < 0) return null;
  const parts = blob.split(".");
  if (parts.length !== 2) return null;
  try {
    const iv = b64decode(parts[0]);
    const ct = b64decode(parts[1]);
    if (iv.length !== 12) return null;
    const key = await tokenKey(env, prefix);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch (e) {
    return null;
  }
}
function extractEmbyToken(request) {
  const h = request.headers;
  let t = h.get("X-Emby-Token") || h.get("X-MediaBrowser-Token");
  if (t) return t.trim();
  const ea = h.get("X-Emby-Authorization");
  if (ea) {
    const m = /Token="?([^",\s]+)"?/i.exec(ea);
    if (m) return m[1].trim();
  }
  const auth = h.get("Authorization");
  if (auth) {
    const m = /MediaBrowser[^,]*Token="?([^",\s]+)"?/i.exec(auth);
    if (m) return m[1].trim();
  }
  try {
    const u = new URL(request.url);
    const q = u.searchParams.get("api_key");
    if (q) return q.trim();
  } catch (e) {
  }
  return null;
}
async function persistHarvestedToken(env, prefix, token, now) {
  try {
    const blob = await encryptToken(env, prefix, token);
    await dbRun(env, `UPDATE routes SET emby_auth_cache = ?, emby_auth_seen_at = ? WHERE prefix = ?`, blob, now, prefix);
  } catch (e) {
    console.log("persistHarvestedToken error:", e.message);
  }
}

// src/emby/headers.js
function parseCustomHeadersForProbe(raw) {
  if (!raw) return {};
  const out = {};
  const s = String(raw);
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === "object") {
      for (const k of Object.keys(parsed)) {
        if (/^[A-Za-z0-9_\-]+$/.test(k)) out[k] = String(parsed[k]);
      }
      return out;
    }
  } catch (_) {
  }
  for (const ln of s.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_\-]+)\s*:\s*(\S.*?)\s*$/.exec(ln);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
function parseCustomHeaderEmbyToken(customHeadersRaw) {
  if (!customHeadersRaw) return null;
  const raw = String(customHeadersRaw);
  let lines = [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const k of Object.keys(parsed)) lines.push(`${k}: ${parsed[k]}`);
    }
  } catch (_) {
    lines = raw.split(/\r?\n/);
  }
  for (const ln of lines) {
    const m = /^\s*(X-Emby-Token|X-MediaBrowser-Token)\s*:\s*(\S.*)$/i.exec(ln);
    if (m) return m[2].trim();
  }
  return null;
}
function buildEmbyClientHeaders(token, prefix) {
  const deviceId = String(prefix || "forward");
  const authHeader = [
    'MediaBrowser Client="Forward"',
    'Device="Forward"',
    'DeviceId="' + deviceId.replace(/"/g, "") + '"',
    'Version="1.0.0"',
    'Token="' + String(token || "").replace(/"/g, "") + '"'
  ].join(", ");
  return {
    "Accept": "application/json",
    "Authorization": authHeader,
    "X-Emby-Authorization": authHeader,
    "X-Emby-Client": "Forward",
    "X-Emby-Device-Name": "Forward",
    "X-Emby-Device-Id": deviceId,
    "X-Emby-Client-Version": "1.0.0",
    "X-Emby-Token": token,
    "User-Agent": "Forward/1.0.0"
  };
}
function buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw) {
  const h = new Headers(request.headers);
  h.set("Host", targetUrl.host);
  h.delete("Accept-Encoding");
  const realIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  h.delete("cf-connecting-ip");
  h.delete("cf-ipcountry");
  h.delete("cf-ray");
  h.delete("cf-visitor");
  h.delete("x-forwarded-for");
  h.delete("x-real-ip");
  if (currentMode === "realip_only" && realIp) {
    h.set("X-Real-IP", realIp);
  } else if (currentMode === "dual" && realIp) {
    h.set("X-Real-IP", realIp);
    h.set("X-Forwarded-For", realIp);
  } else if (currentMode === "strict") {
    h.delete("X-Forwarded-Proto");
    h.delete("X-Forwarded-Host");
    h.set("Origin", targetUrl.origin);
    h.set("Referer", targetUrl.origin + "/");
    if (realIp) {
      h.set("X-Real-IP", realIp);
      h.set("X-Forwarded-For", realIp);
    }
  }
  if (customHeadersRaw) {
    customHeadersRaw.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (key) h.set(key, val);
      }
    });
  }
  return h;
}

// src/probes/alerts.js
var EMBY_RAW_RETENTION_S = 24 * 3600;
var EMBY_HOURLY_RETENTION_S = 7 * 86400;
var EMBY_OUTAGE_THRESHOLD_S = 300;
var EMBY_HARVEST_IDLE_DROP_S = 7 * 86400;
async function maybeRollupHourly(env, now) {
  try {
    const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'emby_last_rollup_ts'`);
    const last = row ? parseInt(row.v, 10) || 0 : 0;
    if (Math.floor(now / 3600) <= Math.floor(last / 3600)) return;
    const hourTs = Math.floor(now / 3600) * 3600 - 3600;
    const hourEnd = hourTs + 3600;
    const { results } = await dbAll(env, `
            SELECT prefix,
                   SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END) AS ok_count,
                   SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END) AS fail_count,
                   AVG(ms) AS avg_ms,
                   MAX(ms) AS max_ms
              FROM emby_probes
             WHERE ts >= ? AND ts < ?
          GROUP BY prefix
        `, hourTs, hourEnd);
    const stmts = (results || []).map(
      (r) => env.DB.prepare(`INSERT OR REPLACE INTO emby_probe_hourly(prefix, hour_ts, ok_count, fail_count, avg_ms, p95_ms) VALUES(?,?,?,?,?,?)`).bind(r.prefix, hourTs, r.ok_count | 0, r.fail_count | 0, Math.round(r.avg_ms || 0), Math.round(r.max_ms || 0))
    );
    stmts.push(env.DB.prepare(`DELETE FROM emby_probes WHERE ts < ?`).bind(now - EMBY_RAW_RETENTION_S));
    stmts.push(env.DB.prepare(`DELETE FROM emby_probe_hourly WHERE hour_ts < ?`).bind(now - EMBY_HOURLY_RETENTION_S));
    stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO kv_config(k, v, updated_at) VALUES('emby_last_rollup_ts', ?, CURRENT_TIMESTAMP)`).bind(String(now)));
    stmts.push(env.DB.prepare(`UPDATE routes SET emby_auth_cache='', emby_auth_seen_at=0, emby_auth_used_at=0
                                    WHERE emby_auth_cache != ''
                                      AND emby_auth_seen_at > 0 AND (? - emby_auth_seen_at) > ?
                                      AND (emby_auth_used_at = 0 OR (? - emby_auth_used_at) > ?)`).bind(now, EMBY_HARVEST_IDLE_DROP_S, now, EMBY_HARVEST_IDLE_DROP_S));
    if (stmts.length) await env.DB.batch(stmts);
  } catch (e) {
    console.log("maybeRollupHourly error:", e.message);
  }
}
async function runAlertFSM(env, routes, probes, now) {
  try {
    const stateRows = await dbAll(env, `SELECT prefix, first_fail_at, last_alert_at, alert_kind FROM emby_probe_state`);
    const stateMap = /* @__PURE__ */ new Map();
    for (const r of stateRows.results || []) stateMap.set(r.prefix, r);
    const routeMap = new Map(routes.map((r) => [r.prefix, r]));
    const upsertAlert = (prefix, firstFail, lastAlert, kind) => env.DB.prepare(`INSERT OR REPLACE INTO emby_probe_state(prefix, first_fail_at, last_alert_at, alert_kind) VALUES(?,?,?,?)`).bind(prefix, firstFail, lastAlert, kind);
    const stmts = [];
    const sends = [];
    for (const p of probes) {
      const st = stateMap.get(p.prefix) || { first_fail_at: 0, last_alert_at: 0, alert_kind: "none" };
      const route = routeMap.get(p.prefix);
      const name = route && (route.public_alias || route.remark) || p.prefix;
      if (p.ok) {
        if (st.alert_kind === "offline") {
          const duration = st.first_fail_at > 0 ? now - st.first_fail_at : 0;
          sends.push({ kind: "recovered", name, duration });
          stmts.push(upsertAlert(p.prefix, 0, now, "recovered"));
        } else if (st.first_fail_at !== 0 || st.alert_kind !== "none") {
          stmts.push(upsertAlert(p.prefix, 0, st.last_alert_at | 0, "none"));
        }
      } else {
        const firstFail = st.first_fail_at > 0 ? st.first_fail_at : now;
        if (st.alert_kind !== "offline" && now - firstFail >= EMBY_OUTAGE_THRESHOLD_S) {
          sends.push({ kind: "offline", name, duration: now - firstFail });
          stmts.push(upsertAlert(p.prefix, firstFail, now, "offline"));
        } else if (st.first_fail_at === 0) {
          stmts.push(upsertAlert(p.prefix, firstFail, st.last_alert_at | 0, st.alert_kind || "none"));
        }
      }
    }
    if (stmts.length) await env.DB.batch(stmts);
    if (sends.length && env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
      const fmtDur = (s) => s >= 3600 ? `${Math.floor(s / 3600)}h${Math.floor(s % 3600 / 60)}m` : `${Math.floor(s / 60)}m${s % 60}s`;
      for (const s of sends) {
        const msg = s.kind === "offline" ? `\u{1F534} *\u8282\u70B9\u79BB\u7EBF\u544A\u8B66*

\u{1F4CD} ${s.name}
\u23F1\uFE0F \u6301\u7EED ${fmtDur(s.duration)}` : `\u{1F7E2} *\u8282\u70B9\u5DF2\u6062\u590D*

\u{1F4CD} ${s.name}
\u23F1\uFE0F \u672C\u6B21\u79BB\u7EBF ${fmtDur(s.duration)}`;
        try {
          await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: msg, parse_mode: "Markdown" })
          });
        } catch (e) {
        }
      }
    }
  } catch (e) {
    console.log("runAlertFSM error:", e.message);
  }
}

// src/probes/probe.js
var EMBY_PROBE_TIMEOUT_MS = 6e3;
var EMBY_PROBE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function probeTargetFor(routeTarget) {
  const first = String(routeTarget || "").split(",").map((s) => s.trim()).filter(Boolean)[0];
  if (!first) return null;
  return first.replace(/\/+$/, "");
}
async function probeOne(route) {
  const base = probeTargetFor(route.target);
  if (!base) return { prefix: route.prefix, ok: false, ms: 0, status: 0 };
  const ctrl = new AbortController();
  const tmr = setTimeout(() => ctrl.abort(), EMBY_PROBE_TIMEOUT_MS);
  const start = Date.now();
  const customHeaders = parseCustomHeadersForProbe(route.custom_headers);
  const tryUrl = async (u) => fetch(u, {
    method: "GET",
    redirect: "manual",
    signal: ctrl.signal,
    headers: { "User-Agent": EMBY_PROBE_UA, "Accept": "application/json,text/plain,*/*", "X-Forward-Probe": "1", ...customHeaders },
    cf: { cacheTtl: 0 }
  });
  try {
    let res = await tryUrl(base + "/emby/System/Info/Public");
    if (res.status === 404) res = await tryUrl(base + "/System/Info/Public");
    if (res.status === 404) res = await tryUrl(base + "/emby/Users/Public");
    clearTimeout(tmr);
    const ms = Date.now() - start;
    const ok = res.status >= 200 && res.status < 400 || res.status === 401 || res.status === 403;
    return { prefix: route.prefix, ok, ms, status: res.status };
  } catch (e) {
    clearTimeout(tmr);
    return { prefix: route.prefix, ok: false, ms: Date.now() - start, status: 0 };
  }
}
async function probeAll(env) {
  try {
    await ensureSchema(env);
    if (!env.DB) return;
    const now = Math.floor(Date.now() / 1e3);
    const { results: routes } = await dbAll(env, `
            SELECT prefix, target, remark, public_alias, custom_headers,
                   show_on_status, media_counts_auto_auth, emby_auth_cache
              FROM routes WHERE show_on_status = 1
        `);
    if (!routes || !routes.length) return;
    const probes = await Promise.all(routes.map((r) => probeOne(r)));
    const insertStmts = probes.map((p) => env.DB.prepare(`INSERT OR REPLACE INTO emby_probes(prefix, ts, ok, ms, status) VALUES(?,?,?,?,?)`).bind(p.prefix, now, p.ok ? 1 : 0, p.ms | 0, p.status | 0));
    if (insertStmts.length) await env.DB.batch(insertStmts);
    await runAlertFSM(env, routes, probes, now);
    await maybeRollupHourly(env, now);
  } catch (e) {
    console.log("probeAll error:", e.message);
  }
}

// src/emby/counts.js
async function fetchItemCounts(targetBase, token, customHeadersRaw, prefix) {
  if (!targetBase || !token) return null;
  const ctrl = new AbortController();
  const tmr = setTimeout(() => ctrl.abort(), 15e3);
  try {
    const base = targetBase.replace(/\/+$/, "");
    const qs = "Recursive=true&IncludeItemTypes=Movie,Series,Episode&api_key=" + encodeURIComponent(token);
    const url = base + "/emby/Items/Counts?" + qs;
    const headers = buildEmbyClientHeaders(token, prefix);
    const extra = parseCustomHeadersForProbe(customHeadersRaw);
    for (const k of Object.keys(extra)) headers[k] = extra[k];
    let res = await fetch(url, { method: "GET", redirect: "manual", signal: ctrl.signal, headers, cf: { cacheTtl: 0 } });
    if (res.status === 404) {
      const url2 = base + "/Items/Counts?" + qs;
      res = await fetch(url2, { method: "GET", redirect: "manual", signal: ctrl.signal, headers, cf: { cacheTtl: 0 } });
    }
    clearTimeout(tmr);
    if (res.status === 401 || res.status === 403) return { unauthorized: true };
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data) return null;
    return {
      movies: Number(data.MovieCount || 0) | 0,
      series: Number(data.SeriesCount || 0) | 0,
      episodes: Number(data.EpisodeCount || 0) | 0
    };
  } catch (e) {
    clearTimeout(tmr);
    return null;
  }
}
async function maybeFetchMediaCounts(env, routes, now) {
  try {
    const today = nowLocalDayStr();
    const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'emby_last_media_day'`);
    const lastDay = row ? String(row.v || "") : "";
    if (lastDay === today) return;
    const writes = [];
    let wroteCounts = false;
    for (const r of routes) {
      if (!r.media_counts_auto_auth) continue;
      const base = probeTargetFor(r.target);
      if (!base) continue;
      let token = parseCustomHeaderEmbyToken(r.custom_headers);
      let source = "manual";
      if (!token && r.emby_auth_cache) {
        token = await decryptToken(env, r.prefix, r.emby_auth_cache);
        source = "harvested";
      }
      if (!token) continue;
      const counts = await fetchItemCounts(base, token, r.custom_headers, r.prefix);
      if (!counts) continue;
      if (counts.unauthorized) {
        if (source === "harvested") {
          writes.push(env.DB.prepare(`UPDATE routes SET emby_auth_cache='', emby_auth_seen_at=0 WHERE prefix=?`).bind(r.prefix));
          HARVEST_MEM.delete(r.prefix);
        }
        continue;
      }
      writes.push(env.DB.prepare(`INSERT OR REPLACE INTO emby_media_counts(prefix, day, movies, series, episodes) VALUES(?,?,?,?,?)`).bind(r.prefix, today, counts.movies, counts.series, counts.episodes));
      wroteCounts = true;
      writes.push(env.DB.prepare(`UPDATE routes SET emby_auth_used_at = ? WHERE prefix = ?`).bind(now, r.prefix));
    }
    if (wroteCounts) {
      writes.push(env.DB.prepare(`INSERT OR REPLACE INTO kv_config(k, v, updated_at) VALUES('emby_last_media_day', ?, CURRENT_TIMESTAMP)`).bind(today));
    }
    if (writes.length) await env.DB.batch(writes);
  } catch (e) {
    console.log("maybeFetchMediaCounts error:", e.message);
  }
}

// src/stats/cf.js
async function getCFTraffic(env, type) {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) return "\u7F3A\u5C11\u53D8\u91CF";
  try {
    const end = /* @__PURE__ */ new Date();
    let graphqlQuery = {};
    if (type === "today") {
      const beijingTime = new Date(end.getTime() + 8 * 36e5);
      beijingTime.setUTCHours(0, 0, 0, 0);
      const start = new Date(beijingTime.getTime() - 8 * 36e5);
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
      const start = new Date(end.getTime() - type * 24 * 36e5);
      const dateGeq = start.toISOString().split("T")[0];
      const dateLeq = end.toISOString().split("T")[0];
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
    const cfRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    });
    const cfData = await cfRes.json();
    if (cfData.errors && cfData.errors.length > 0) {
      return `API\u62A5\u9519: ${cfData.errors[0].message}`;
    }
    const zones = cfData?.data?.viewer?.zones;
    let totalBytes = 0;
    if (zones && zones.length > 0) {
      if (type === "today" && zones[0].httpRequestsAdaptiveGroups) {
        totalBytes = zones[0].httpRequestsAdaptiveGroups[0]?.sum?.edgeResponseBytes || 0;
      } else if (type !== "today" && zones[0].httpRequests1dGroups) {
        zones[0].httpRequests1dGroups.forEach((g) => {
          totalBytes += g.sum.bytes || 0;
        });
      }
    }
    if (totalBytes === 0) return "0 B";
    if (totalBytes >= 1099511627776) return (totalBytes / 1099511627776).toFixed(2) + " TB";
    if (totalBytes >= 1073741824) return (totalBytes / 1073741824).toFixed(2) + " GB";
    if (totalBytes >= 1048576) return (totalBytes / 1048576).toFixed(2) + " MB";
    if (totalBytes >= 1024) return (totalBytes / 1024).toFixed(2) + " KB";
    return totalBytes + " B";
  } catch (e) {
    return "\u8BF7\u6C42\u5F02\u5E38";
  }
}

// src/stats/telegram.js
async function sendTgStats(env, chatId) {
  try {
    const totalQuery = await dbFirst(env, `SELECT COUNT(*) as count FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours')`);
    const topRegionQuery = await dbFirst(env, `SELECT country, COUNT(*) as c FROM visitor_logs WHERE date(timestamp, '+8 hours') = date('now', '+8 hours') GROUP BY country ORDER BY c DESC LIMIT 1`);
    const topNodeQuery = await dbFirst(env, `
            SELECT r.remark, COUNT(v.id) as c
            FROM visitor_logs v
            LEFT JOIN routes r ON v.prefix = r.prefix
            WHERE date(v.timestamp, '+8 hours') = date('now', '+8 hours')
            GROUP BY v.prefix
            ORDER BY c DESC LIMIT 1
        `);
    const [trafficToday, traffic7d, traffic30d] = await Promise.all([
      getCFTraffic(env, "today"),
      getCFTraffic(env, 7),
      getCFTraffic(env, 30)
    ]);
    let topNodeMsg = "\u6682\u65E0\u6570\u636E";
    if (env.CF_API_TOKEN && env.CF_ZONE_ID && env.DB) {
      try {
        const { results: routes } = await dbAll(env, `SELECT prefix, remark FROM routes`);
        if (routes && routes.length > 0) {
          const end = /* @__PURE__ */ new Date();
          const beijingTime = new Date(end.getTime() + 8 * 36e5);
          beijingTime.setUTCHours(0, 0, 0, 0);
          const start = new Date(beijingTime.getTime() - 8 * 36e5);
          let maxBytes = 0;
          let topNodeName = "\u65E0";
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
              const cfRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
                method: "POST",
                headers: { "Authorization": `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify(graphqlQuery)
              });
              const cfData = await cfRes.json();
              const bytes = cfData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups?.[0]?.sum?.edgeResponseBytes || 0;
              if (bytes > maxBytes) {
                maxBytes = bytes;
                topNodeName = r.remark || r.prefix;
              }
            } catch (e) {
            }
          }));
          if (maxBytes > 0) {
            let formatted = "0 B";
            if (maxBytes >= 1099511627776) formatted = (maxBytes / 1099511627776).toFixed(2) + " TB";
            else if (maxBytes >= 1073741824) formatted = (maxBytes / 1073741824).toFixed(2) + " GB";
            else if (maxBytes >= 1048576) formatted = (maxBytes / 1048576).toFixed(2) + " MB";
            else if (maxBytes >= 1024) formatted = (maxBytes / 1024).toFixed(2) + " KB";
            else formatted = maxBytes + " B";
            topNodeMsg = `${topNodeName} \u8DD1\u4E86 ${formatted}`;
          } else {
            topNodeMsg = "\u4ECA\u65E5\u5168\u7AD9\u96F6\u6D88\u8017";
          }
        }
      } catch (e) {
        topNodeMsg = "\u83B7\u53D6\u5931\u8D25";
      }
    }
    const totalStr = totalQuery ? totalQuery.count : 0;
    const regionStr = topRegionQuery ? `${topRegionQuery.country === "CN" ? "\u{1F1E8}\u{1F1F3} \u4E2D\u56FD\u5927\u9646" : topRegionQuery.country} (${topRegionQuery.c} \u6B21)` : "\u6682\u65E0\u8BB0\u5F55";
    const nodeStr = topNodeQuery ? `${topNodeQuery.remark || "\u672A\u547D\u540D\u8282\u70B9"} (${topNodeQuery.c} \u6B21)` : "\u6682\u65E0\u8BB0\u5F55";
    const msg = `\u{1F4CA} *\u4ECA\u65E5\u53CD\u4EE3\u64AD\u653E\u6570\u636E*

\u25B6\uFE0F *\u4ECA\u65E5\u603B\u64AD\u653E\u6B21\u6570:* ${totalStr} \u6B21
\u{1F30D} *\u6700\u591A\u8BBF\u95EE\u5730\u533A:* ${regionStr}
\u{1F680} *\u6700\u559C\u6B22\u7684EMBY:* ${nodeStr}

\u{1F310} *\u5B9E\u9645\u6D41\u91CF\u6D88\u8017:*
\u5F53\u5929\u5185: ${trafficToday}
\u4E03\u5929\u5185: ${traffic7d}
30\u5929\u5185: ${traffic30d}

\u{1F3C6} *\u4ECA\u65E5\u6D41\u91CF\u4E4B\u738B:*
\u{1F451} ${topNodeMsg}`;
    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" })
    });
  } catch (e) {
    console.error("TG Send Error:", e);
  }
}

// src/status/page.js
async function loadStatusData(env, opts) {
  opts = opts || {};
  const limitPrefix = opts.prefix || null;
  const where = limitPrefix ? `WHERE show_on_status = 1 AND prefix = ?` : `WHERE show_on_status = 1`;
  const stmt = env.DB.prepare(`SELECT prefix, public_alias, remark, icon, sort_order, media_counts_auto_auth
                                  FROM routes ${where} ORDER BY sort_order ASC, prefix ASC`);
  const { results: routes } = limitPrefix ? await stmt.bind(limitPrefix).all() : await stmt.all();
  if (!routes || !routes.length) return { routes: [], cards: [] };
  const now = Math.floor(Date.now() / 1e3);
  const since24 = now - 24 * 3600;
  const since7d = now - 7 * 86400;
  const today = nowLocalDayStr();
  const cards = [];
  for (const r of routes) {
    const lastProbe = await dbFirst(env, `SELECT ok, ms, status, ts FROM emby_probes WHERE prefix = ? ORDER BY ts DESC LIMIT 1`, r.prefix);
    const last60 = await dbAll(env, `SELECT ok, ms, ts FROM emby_probes WHERE prefix = ? ORDER BY ts DESC LIMIT 60`, r.prefix);
    const raw24 = await dbFirst(env, `SELECT SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END) AS ok_count, COUNT(*) AS total FROM emby_probes WHERE prefix = ? AND ts >= ?`, r.prefix, since24);
    const hourly7 = await dbFirst(env, `SELECT SUM(ok_count) AS ok_count, SUM(ok_count) + SUM(fail_count) AS total FROM emby_probe_hourly WHERE prefix = ? AND hour_ts >= ?`, r.prefix, since7d);
    const latestCounts = await dbFirst(env, `SELECT day, movies, series, episodes FROM emby_media_counts WHERE prefix = ? AND day <= ? ORDER BY day DESC LIMIT 1`, r.prefix, today);
    const prevCounts = latestCounts ? await dbFirst(env, `SELECT movies, series, episodes FROM emby_media_counts WHERE prefix = ? AND day < ? ORDER BY day DESC LIMIT 1`, r.prefix, latestCounts.day) : null;
    const todayCounts = latestCounts;
    const yesterdayCounts = prevCounts;
    const total24 = (raw24 && raw24.total) | 0;
    const ok24 = (raw24 && raw24.ok_count) | 0;
    const total7d = (hourly7 && hourly7.total) | 0;
    const ok7d = (hourly7 && hourly7.ok_count) | 0;
    cards.push({
      prefix: r.prefix,
      name: r.public_alias || r.remark || r.prefix,
      icon: r.icon || "",
      ok: !!(lastProbe && lastProbe.ok),
      latest_ms: lastProbe ? lastProbe.ms | 0 : 0,
      latest_ts: lastProbe ? lastProbe.ts | 0 : 0,
      avail_24h: total24 > 0 ? ok24 / total24 : null,
      avail_7d: total7d > 0 ? ok7d / total7d : null,
      history: (last60.results || []).map((p) => ({ ok: p.ok, ms: p.ms | 0 })).reverse(),
      counts: todayCounts ? { movies: todayCounts.movies | 0, series: todayCounts.series | 0, episodes: todayCounts.episodes | 0 } : null,
      counts_delta: todayCounts && yesterdayCounts ? {
        movies: (todayCounts.movies | 0) - (yesterdayCounts.movies | 0),
        series: (todayCounts.series | 0) - (yesterdayCounts.series | 0),
        episodes: (todayCounts.episodes | 0) - (yesterdayCounts.episodes | 0)
      } : null,
      show_counts: !!r.media_counts_auto_auth
    });
  }
  return { routes, cards };
}
function renderStatusHtml(data, opts) {
  opts = opts || {};
  const title = htmlEscape(opts.title || "\u8282\u70B9\u72B6\u6001");
  const cards = data.cards;
  const total = cards.length;
  const online = cards.filter((c) => c.ok).length;
  const offline = total - online;
  const pct = (v) => v == null ? "\u2014" : (v * 100).toFixed(1) + "%";
  const fmtDelta = (n) => n === 0 ? "" : n > 0 ? `+${n}` : String(n);
  const fmtTs = (ts) => {
    if (!ts) return "\u2014";
    const d = new Date((ts + 8 * 3600) * 1e3);
    return d.toISOString().slice(5, 16).replace("T", " ");
  };
  const overallPct = total === 0 ? null : online / total;
  const overallPctText = overallPct == null ? "\u2014" : (overallPct * 100).toFixed(1);
  const overallTier = overallPct == null ? "idle" : overallPct >= 0.99 ? "ok" : overallPct >= 0.95 ? "warn" : "bad";
  const liveOnes = cards.filter((c) => c.ok);
  const avgMs = liveOnes.length ? Math.round(liveOnes.reduce((s, c) => s + (c.latest_ms | 0), 0) / liveOnes.length) : null;
  const hideNames = !!opts.hideNames;
  const cardsHtml = cards.map((c, i) => {
    const ecgHtml = ecgStripSvg(c.history);
    const countsRow = c.show_counts && c.counts ? `
            <div class="s-counts">
                <span>\u7535\u5F71 <b>${c.counts.movies}</b>${c.counts_delta && c.counts_delta.movies ? `<i class="s-delta ${c.counts_delta.movies > 0 ? "up" : "down"}">${fmtDelta(c.counts_delta.movies)}</i>` : ""}</span>
                <span>\u5267\u96C6 <b>${c.counts.series}</b>${c.counts_delta && c.counts_delta.series ? `<i class="s-delta ${c.counts_delta.series > 0 ? "up" : "down"}">${fmtDelta(c.counts_delta.series)}</i>` : ""}</span>
                <span>\u96C6\u6570 <b>${c.counts.episodes}</b>${c.counts_delta && c.counts_delta.episodes ? `<i class="s-delta ${c.counts_delta.episodes > 0 ? "up" : "down"}">${fmtDelta(c.counts_delta.episodes)}</i>` : ""}</span>
            </div>` : "";
    const displayName = hideNames ? `\u8282\u70B9 ${i + 1}` : c.name;
    const iconHtml = hideNames ? '<span class="s-icon-fallback" aria-hidden="true"></span>' : c.icon ? `<img class="s-icon" src="${htmlEscape(c.icon)}" alt="" onerror="this.style.display='none'">` : '<span class="s-icon-fallback" aria-hidden="true"></span>';
    const isSlow = c.ok && (c.latest_ms | 0) >= 200;
    const pillCls = !c.ok ? "bad" : isSlow ? "warn" : "ok";
    const pillLabel = !c.ok ? "\u79BB\u7EBF" : isSlow ? "\u5EF6\u8FDF" : "\u5728\u7EBF";
    const latencyHtml = c.ok ? `${c.latest_ms}<span class="s-u">ms</span>` : `<span class="is-bad">\u79BB\u7EBF</span>`;
    return `<article class="node-row">
            <div class="node-head">
                ${iconHtml}
                <div class="node-name" title="${htmlEscape(displayName)}">${htmlEscape(displayName)}</div>
                <span class="status-pill ${pillCls}"><span class="dot"></span>${pillLabel}</span>
            </div>
            <div class="node-metrics">
                <div class="metric"><div class="metric-k">\u5F53\u524D\u5EF6\u8FDF</div><div class="metric-v">${latencyHtml}</div></div>
                <div class="metric"><div class="metric-k">24 \u5C0F\u65F6</div><div class="metric-v">${pct(c.avail_24h)}</div></div>
                <div class="metric"><div class="metric-k">7 \u5929</div><div class="metric-v">${pct(c.avail_7d)}</div></div>
            </div>
            <div class="ecg-strip" aria-label="\u8FD1 60 \u6B21\u63A2\u6D4B\u5FC3\u7535\u56FE">${ecgHtml}</div>
            ${countsRow}
            <div class="node-foot">\u6700\u8FD1\u63A2\u6D4B \xB7 ${fmtTs(c.latest_ts)}</div>
        </article>`;
  }).join("");
  const emptyHtml = total === 0 ? `<div class="card empty-card">\u5C1A\u672A\u542F\u7528\u4EFB\u4F55\u8282\u70B9\u72B6\u6001\u5C55\u793A</div>` : "";
  const themeBoot = `(function(){try{var legacy=localStorage.getItem('emby_proxy_dark');if(legacy!==null&&!localStorage.getItem('emby_theme')){localStorage.setItem('emby_theme',legacy==='1'?'dark':'light');localStorage.removeItem('emby_proxy_dark');}var p=localStorage.getItem('emby_theme')||'auto';var d=p==='dark'||(p==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.themePref=p;}catch(e){}})();`;
  const inlineScript = `(function(){
  var mql=window.matchMedia('(prefers-color-scheme: dark)');
  function pref(){return localStorage.getItem('emby_theme')||'auto';}
  function resolveDark(p){return p==='dark'||(p==='auto'&&mql.matches);}
  function apply(p){
    var d=resolveDark(p);
    document.documentElement.classList.toggle('dark',d);
    document.body.classList.toggle('dark',d);
    document.documentElement.dataset.themePref=p;
    var b=document.getElementById('themeToggle');
    if(b){var titles={auto:'\u4E3B\u9898: \u8DDF\u968F\u7CFB\u7EDF',light:'\u4E3B\u9898: \u6D45\u8272',dark:'\u4E3B\u9898: \u6DF1\u8272'};b.dataset.theme=p;b.title=titles[p]||'';b.setAttribute('aria-label',titles[p]||'');}
  }
  apply(pref());
  var b=document.getElementById('themeToggle');
  if(b){
    b.addEventListener('click',function(){
      var order=['auto','light','dark'];
      var cur=pref();
      var next=order[(order.indexOf(cur)+1)%order.length];
      try{localStorage.setItem('emby_theme',next);}catch(e){}
      apply(next);
    });
  }
  mql.addEventListener('change',function(){ if(pref()==='auto') apply('auto'); });
  // Auto refresh page every 60s to pull fresh probe data
  setTimeout(function(){try{location.reload();}catch(e){}}, 60000);
})();`;
  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#07090f" media="(prefers-color-scheme: dark)">
<script>${themeBoot}<\/script>
<style>
:root{
  --primary:#0071e3; --primary-hover:#005cbf;
  --bg:#f5f5f7; --card:#ffffff; --text:#1d1d1f; --text-sec:#86868b; --border:#d2d2d7;
  --surface:#ffffff; --surface-2:#f0f1f4;
  --ok:#34c759; --warn:#ff9500; --err:#ff3b30;
  --ok-soft:rgba(52,199,89,.10); --warn-soft:rgba(255,149,0,.10); --err-soft:rgba(255,59,48,.10);
  --primary-soft:rgba(0,113,227,.10); --primary-glow:rgba(0,113,227,.32);
  --hairline:rgba(60,60,67,.18);
  --aurora-grad:linear-gradient(135deg,#0071e3 0%,#5856d6 55%,#af52de 110%);
  --card-shadow-lift:0 1px 0 rgba(255,255,255,.55) inset, 0 1px 2px rgba(15,23,42,.04), 0 10px 28px -12px rgba(15,23,42,.12);
  --radius-ios:18px; --radius-ios-sm:14px; --radius-md:8px; --radius-lg:12px; --radius-pill:999px;
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-7:32px;--space-2-5:10px;--space-3-5:14px;
  --text-xs:11px;--text-sm:12px;--text-md:13px;--text-base:14px;--text-lg:15px;--text-xl:16px;--text-2xl:20px;--text-3xl:28px;
  --touch-min:44px;
}
html.dark, body.dark{
  --primary:#2f9bff; --primary-hover:#5cb0ff;
  --bg:#07090f; --card:#12151d; --text:#e9edf5; --text-sec:#8b93a7; --border:#232838;
  --surface:#12151d; --surface-2:#181c27;
  --ok:#30d158; --warn:#ff9f0a; --err:#ff453a;
  --ok-soft:rgba(48,209,88,.14); --warn-soft:rgba(255,159,10,.14); --err-soft:rgba(255,69,58,.14);
  --primary-soft:rgba(47,155,255,.14); --primary-glow:rgba(47,155,255,.32);
  --hairline:rgba(84,84,88,.55);
  --aurora-grad:linear-gradient(135deg,#2f9bff 0%,#6e6ad9 55%,#c47ce0 110%);
  --card-shadow-lift:0 0 0 1px rgba(255,255,255,.03) inset, 0 10px 30px -10px rgba(0,0,0,.55);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Microsoft YaHei","Segoe UI",Roboto,sans-serif;
  background:var(--bg); color:var(--text);
  min-height:100vh;
  padding:var(--space-5);
  padding-top:max(var(--space-5), env(safe-area-inset-top));
  padding-bottom:max(var(--space-7), env(safe-area-inset-bottom));
  -webkit-text-size-adjust:100%;
  -webkit-font-smoothing:antialiased;
  transition:background-color .3s, color .3s;
}
.wrap{max-width:1200px; margin:0 auto;}

/* \u2014\u2014 page header (matches admin .ios-page-header vibe) \u2014\u2014 */
.page-head{
  display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-5);
}
.page-title{
  font-size:var(--text-3xl); font-weight:700; letter-spacing:-.02em; margin:0;
  flex:1; min-width:0;
}
.page-sub{ color:var(--text-sec); font-size:var(--text-md); margin-top:2px; }
.title-block{ flex:1; min-width:0; }
.tb-icon-btn{
  width:36px; height:36px; min-width:36px; min-height:36px;
  border-radius:50%;
  border:1px solid var(--border); background:var(--card); color:var(--text);
  cursor:pointer; display:inline-flex; align-items:center; justify-content:center;
  transition:.2s ease;
}
.tb-icon-btn:hover{ border-color:var(--primary); color:var(--primary); }
.tb-icon-btn svg{ width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
.tb-icon-btn[data-theme] .ico{ display:none; }
.tb-icon-btn[data-theme="auto"] .ico-auto,
.tb-icon-btn[data-theme="light"] .ico-light,
.tb-icon-btn[data-theme="dark"] .ico-dark{ display:inline-flex; }

/* \u2014\u2014 aurora KPI hero (matches admin overview KPI grid) \u2014\u2014 */
.aurora-hero{
  display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr;
  gap:var(--space-4); margin-bottom:var(--space-6);
}
.kpi-tile{
  position:relative; overflow:hidden;
  background:var(--card); border:1px solid var(--border);
  border-radius:var(--radius-ios); padding:var(--space-5);
  min-height:124px; box-shadow:var(--card-shadow-lift);
}
.kpi-tile.is-primary{
  color:#fff; background:var(--aurora-grad); border-color:transparent;
  box-shadow:0 1px 0 rgba(255,255,255,.22) inset, 0 14px 36px -10px var(--primary-glow);
}
.kpi-tile.is-primary::before{
  content:''; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,.28), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(0,0,0,.10), transparent 60%);
}
.kpi-tile > *{ position:relative; z-index:1; }
.kpi-label{
  font-size:var(--text-xs); font-weight:700; letter-spacing:.10em; text-transform:uppercase;
  color:var(--text-sec); margin-bottom:var(--space-2-5);
}
.kpi-tile.is-primary .kpi-label{ color:rgba(255,255,255,.85); }
.kpi-row{ display:flex; align-items:baseline; gap:var(--space-2); }
.kpi-value{
  font-size:34px; font-weight:700; letter-spacing:-.025em; line-height:1.05;
  font-variant-numeric:tabular-nums; color:var(--text);
}
.kpi-tile.is-primary .kpi-value{ color:#fff; }
.kpi-unit{
  font-size:var(--text-md); font-weight:600; color:var(--text-sec); font-variant-numeric:tabular-nums;
}
.kpi-tile.is-primary .kpi-unit{ color:rgba(255,255,255,.78); }
.kpi-sub{
  margin-top:var(--space-2); font-size:var(--text-xs); color:var(--text-sec);
}
.kpi-tile.is-primary .kpi-sub{ color:rgba(255,255,255,.78); }
.kpi-health-bar{
  margin-top:var(--space-3); height:6px; width:100%;
  background:rgba(120,120,140,.18); border-radius:var(--radius-pill); overflow:hidden;
}
.kpi-tile.is-primary .kpi-health-bar{ background:rgba(255,255,255,.22); }
.kpi-health-bar > span{
  display:block; height:100%; border-radius:var(--radius-pill);
  background:#fff; box-shadow:0 0 10px rgba(255,255,255,.35);
}
.kpi-tile:not(.is-primary) .kpi-health-bar > span{
  background:var(--aurora-grad); box-shadow:0 0 10px var(--primary-glow);
}
.kpi-tile .ks-dot{ display:inline-block; width:8px; height:8px; border-radius:50%; vertical-align:1px; margin-right:6px; }
.kpi-tile .ks-dot.ok{ background:var(--ok); box-shadow:0 0 6px var(--ok); }
.kpi-tile .ks-dot.warn{ background:var(--warn); box-shadow:0 0 6px var(--warn); }
.kpi-tile .ks-dot.bad{ background:var(--err); box-shadow:0 0 6px var(--err); }

/* \u2014\u2014 main listing card (admin .card) \u2014\u2014 */
.card{
  background:var(--card); border:1px solid var(--border); border-radius:var(--radius-ios);
  box-shadow:var(--card-shadow-lift); padding:var(--space-6);
  margin-bottom:var(--space-5);
}
.section-header-row{
  display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4);
}
.section-title{
  margin:0; font-size:var(--text-2xl); font-weight:700; letter-spacing:-.01em;
  flex:1; min-width:0;
}
.section-sub{
  color:var(--text-sec); font-size:var(--text-md);
  font-variant-numeric:tabular-nums;
}
.node-list{
  display:flex; flex-direction:column;
}
.node-row{
  padding:var(--space-4) 0;
  border-top:1px solid var(--hairline);
  display:flex; flex-direction:column; gap:var(--space-3);
}
.node-row:first-child{ border-top:none; padding-top:var(--space-2); }
.node-head{
  display:flex; align-items:center; gap:var(--space-3); min-width:0;
}
.s-icon, .s-icon-fallback{
  width:36px; height:36px; border-radius:10px; flex:0 0 auto;
  background:var(--surface-2); border:1px solid var(--border); object-fit:cover;
}
.node-name{
  flex:1; min-width:0;
  font-size:var(--text-xl); font-weight:600; letter-spacing:-.01em;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.status-pill{
  flex:0 0 auto;
  display:inline-flex; align-items:center; gap:6px;
  padding:5px 12px; border-radius:var(--radius-pill);
  font-size:var(--text-sm); font-weight:600;
  font-variant-numeric:tabular-nums;
}
.status-pill .dot{ width:7px; height:7px; border-radius:50%; }
.status-pill.ok{ background:var(--ok-soft); color:var(--ok); }
.status-pill.ok .dot{ background:var(--ok); box-shadow:0 0 6px var(--ok); }
.status-pill.warn{ background:var(--warn-soft); color:var(--warn); }
.status-pill.warn .dot{ background:var(--warn); }
.status-pill.bad{ background:var(--err-soft); color:var(--err); }
.status-pill.bad .dot{ background:var(--err); }

.node-metrics{
  display:grid; grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:var(--space-3);
}
.metric{ display:flex; flex-direction:column; gap:2px; min-width:0; }
.metric-k{
  font-size:var(--text-xs); font-weight:600; letter-spacing:.08em; text-transform:uppercase;
  color:var(--text-sec);
}
.metric-v{
  font-size:var(--text-2xl); font-weight:700; letter-spacing:-.015em;
  color:var(--text); font-variant-numeric:tabular-nums;
  line-height:1.15;
}
.metric-v .s-u{ font-size:var(--text-sm); font-weight:600; color:var(--text-sec); margin-left:2px; }
.metric-v .is-bad{ color:var(--err); font-size:var(--text-xl); }

/* \u2014\u2014 ECG history strip \u2014\u2014 */
.ecg-strip{
  background:linear-gradient(180deg, var(--surface-2) 0%, var(--card) 100%);
  border:1px solid var(--border);
  border-radius:var(--radius-md);
  padding:6px 8px;
  position:relative; overflow:hidden;
  /* faint medical-grid backdrop */
  background-image:
    linear-gradient(180deg, var(--surface-2) 0%, var(--card) 100%),
    repeating-linear-gradient(0deg, transparent 0, transparent 7px, var(--hairline) 7px, var(--hairline) 7.5px),
    repeating-linear-gradient(90deg, transparent 0, transparent 11px, var(--hairline) 11px, var(--hairline) 11.5px);
  background-blend-mode: normal, soft-light, soft-light;
}
.ecg-svg{ width:100%; height:36px; display:block; }
.ecg-svg .ecg-line{
  stroke:var(--primary); stroke-width:1.4; stroke-linecap:round; stroke-linejoin:round;
  filter:drop-shadow(0 0 2px var(--primary-glow));
}
.ecg-svg .ecg-base{
  stroke:var(--hairline); stroke-width:.6; stroke-dasharray:2 3;
}
.ecg-svg .ecg-mid{
  stroke:var(--hairline); stroke-width:.4; opacity:.5;
}
.ecg-svg .ecg-fail{
  stroke:var(--err); stroke-width:1.6; stroke-linecap:round;
  filter:drop-shadow(0 0 2px var(--err));
}
.ecg-svg .ecg-dot.ok{ fill:var(--primary); }
.ecg-svg .ecg-dot.bad{ fill:var(--err); }
.ecg-svg .ecg-empty{ font-size:9px; fill:var(--text-sec); font-family:inherit; }

.s-counts{
  display:flex; flex-wrap:wrap; gap:var(--space-3) var(--space-5);
  font-size:var(--text-sm); color:var(--text-sec);
  padding-top:var(--space-3); border-top:1px dashed var(--hairline);
}
.s-counts b{ color:var(--text); font-weight:700; margin-left:4px; font-variant-numeric:tabular-nums; }
.s-delta{ font-style:normal; margin-left:5px; font-size:var(--text-xs); font-weight:600; padding:1px 6px; border-radius:var(--radius-md); font-variant-numeric:tabular-nums; }
.s-delta.up{ color:var(--ok); background:var(--ok-soft); }
.s-delta.down{ color:var(--err); background:var(--err-soft); }

.node-foot{
  font-size:var(--text-xs); color:var(--text-sec); font-variant-numeric:tabular-nums;
}

.empty-card{ text-align:center; color:var(--text-sec); padding:var(--space-7); }

.foot-note{
  text-align:center; color:var(--text-sec); font-size:var(--text-xs);
  margin-top:var(--space-5);
}

/* \u2014\u2014 responsive \u2014\u2014 */
@media (max-width: 980px) {
  .aurora-hero{ grid-template-columns:1fr 1fr; }
  .aurora-hero .kpi-tile.is-primary{ grid-column:1 / -1; }
  .kpi-value{ font-size:30px; }
}
@media (max-width: 520px) {
  body{ padding:var(--space-3); padding-top:max(var(--space-3), env(safe-area-inset-top)); }
  .page-head{ margin-bottom:var(--space-4); }
  .page-title{ font-size:var(--text-3xl); }
  .aurora-hero{ grid-template-columns:1fr 1fr; gap:var(--space-3); }
  .aurora-hero .kpi-tile.is-primary{ grid-column:1 / -1; }
  .kpi-tile{ min-height:96px; padding:var(--space-4); }
  .kpi-value{ font-size:26px; }
  .card{ padding:var(--space-4); border-radius:var(--radius-ios-sm); }
  .node-metrics{ gap:var(--space-2); }
  .metric-v{ font-size:var(--text-xl); }
  .node-name{ font-size:var(--text-lg); }
  .section-title{ font-size:var(--text-xl); }
}
@media (max-width: 360px) {
  .aurora-hero{ grid-template-columns:1fr; }
  .kpi-tile.is-primary{ grid-column:auto; }
}
@media (prefers-reduced-motion: reduce){
  .tb-icon-btn{ transition:none; }
}
</style></head><body>
<div class="wrap">
  <header class="page-head">
    <div class="title-block">
      <h1 class="page-title">${title}</h1>
      <div class="page-sub">\u5B9E\u65F6\u63A2\u6D4B \xB7 \u6BCF\u5206\u949F\u5237\u65B0</div>
    </div>
    <button class="tb-icon-btn" id="themeToggle" type="button" data-theme="auto" title="\u5207\u6362\u4E3B\u9898" aria-label="\u5207\u6362\u4E3B\u9898">
      <span class="ico ico-auto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg></span>
      <span class="ico ico-light"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg></span>
      <span class="ico ico-dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
    </button>
  </header>

  <section class="aurora-hero" aria-label="\u6574\u4F53\u72B6\u6001">
    <div class="kpi-tile is-primary">
      <div class="kpi-label">\u6574\u4F53\u53EF\u7528\u7387</div>
      <div class="kpi-row">
        <span class="kpi-value">${overallPctText}</span>
        <span class="kpi-unit">${overallPct == null ? "" : "%"}</span>
      </div>
      <div class="kpi-sub">${online} / ${total} \u8282\u70B9\u5728\u7EBF \xB7 \u81EA\u52A8\u6BCF\u5206\u949F\u63A2\u6D4B</div>
      ${overallPct == null ? "" : `<div class="kpi-health-bar"><span style="width:${(overallPct * 100).toFixed(1)}%"></span></div>`}
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">\u5728\u7EBF\u8282\u70B9</div>
      <div class="kpi-row">
        <span class="kpi-value"><span class="ks-dot ok"></span>${online}</span>
        <span class="kpi-unit">/ ${total}</span>
      </div>
      <div class="kpi-sub">\u5B9E\u65F6\u53CD\u4EE3\u8282\u70B9\u6D3B\u8DC3\u5EA6</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">\u79BB\u7EBF\u8282\u70B9</div>
      <div class="kpi-row">
        <span class="kpi-value">${offline > 0 ? `<span class="ks-dot bad"></span>` : ""}${offline}</span>
      </div>
      <div class="kpi-sub">${offline > 0 ? "\u9700\u5173\u6CE8 \xB7 \u5DF2\u89E6\u53D1\u76D1\u63A7" : "\u4E00\u5207\u6B63\u5E38"}</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">\u5E73\u5747\u5EF6\u8FDF</div>
      <div class="kpi-row">
        <span class="kpi-value">${avgMs == null ? "\u2014" : avgMs}</span>
        <span class="kpi-unit">${avgMs == null ? "" : "ms"}</span>
      </div>
      <div class="kpi-sub">\u4EC5\u7EDF\u8BA1\u5728\u7EBF\u8282\u70B9</div>
    </div>
  </section>

  <section class="card" aria-label="\u8282\u70B9\u5217\u8868">
    <div class="section-header-row">
      <h2 class="section-title">\u8282\u70B9\u5217\u8868</h2>
      <div class="section-sub">${total} \u4E2A\u8282\u70B9</div>
    </div>
    <div class="node-list">${cardsHtml}</div>
    ${emptyHtml}
  </section>

  <div class="foot-note">\u7531 Emby Proxy \u76D1\u63A7 \xB7 ${overallTier === "idle" ? "\u5C1A\u672A\u542F\u7528\u4EFB\u4F55\u8282\u70B9" : "\u9875\u9762 60 \u79D2\u540E\u81EA\u52A8\u5237\u65B0"}</div>
</div>
<script>${inlineScript}<\/script>
</body></html>`;
}

// src/net/fallback.js
function flipScheme(targetUrl) {
  const u = new URL(targetUrl);
  if (u.protocol === "https:") u.protocol = "http:";
  else if (u.protocol === "http:") u.protocol = "https:";
  else return null;
  return u;
}
async function fetchWithSchemeFallback(targetUrl, fetchInit, canRetry) {
  const SSL_ERR = [525, 526, 530];
  if (!canRetry) {
    return await fetch(new Request(targetUrl, fetchInit));
  }
  try {
    const resp = await fetch(new Request(targetUrl, fetchInit));
    if (!SSL_ERR.includes(resp.status)) return resp;
    const flipped = flipScheme(targetUrl);
    if (!flipped) return resp;
    try {
      return await fetch(new Request(flipped, fetchInit));
    } catch (e) {
      return resp;
    }
  } catch (err) {
    const flipped = flipScheme(targetUrl);
    if (!flipped) throw err;
    return await fetch(new Request(flipped, fetchInit));
  }
}
async function attempt403Cascade(targetUrl, baseHeaders, fetchInit, currentMode) {
  const strategies = [];
  if (currentMode !== "strict") {
    strategies.push((h) => {
      h.set("Origin", targetUrl.origin);
      h.set("Referer", targetUrl.origin + "/");
    });
  }
  strategies.push((h) => {
    h.delete("Origin");
    h.delete("Referer");
    for (const k of [...h.keys()]) {
      if (k.toLowerCase().startsWith("sec-fetch-")) h.delete(k);
    }
  });
  strategies.push((h) => {
    const keep = ["user-agent", "accept", "host", "x-emby-token", "x-mediabrowser-token", "x-emby-authorization", "authorization", "content-type", "content-length"];
    for (const k of [...h.keys()]) {
      if (!keep.includes(k.toLowerCase())) h.delete(k);
    }
  });
  let lastResp = null;
  for (const apply of strategies) {
    const h = new Headers(baseHeaders);
    apply(h);
    try {
      const resp = await fetch(new Request(targetUrl, { ...fetchInit, headers: h }));
      if (resp.status !== 403) return resp;
      lastResp = resp;
    } catch (e) {
    }
  }
  return lastResp;
}

// src/index.js
var MAX_RETRY_BODY_BYTES = 8 * 1024 * 1024;
var MAX_UPSTREAM_TIMEOUT_MS = 15e3;
var EMBY_HARVEST_DEBOUNCE_S = 600;
var index_default = {
  // 定时触发器：1 分钟 cron 跑节点探测；每日 0 点 cron 推送 TG 统计
  async scheduled(event, env, ctx) {
    const cron = event && event.cron || "";
    if (cron === "0 0 * * *") {
      if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
        ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
      }
      if (env.DB) {
        ctx.waitUntil((async () => {
          try {
            await ensureSchema(env);
            const { results: routes } = await dbAll(env, `
                            SELECT prefix, target, custom_headers, media_counts_auto_auth, emby_auth_cache
                              FROM routes WHERE show_on_status = 1 AND media_counts_auto_auth = 1
                        `);
            await maybeFetchMediaCounts(env, routes || [], Math.floor(Date.now() / 1e3));
          } catch (e) {
            console.log("scheduled maybeFetchMediaCounts error:", e && e.message || e);
          }
        })());
      }
      return;
    }
    if (cron === "* * * * *") {
      if (env.DB) ctx.waitUntil(probeAll(env));
      return;
    }
    if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
      ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
    }
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (env.DB) {
      await ensureSchema(env);
    }
    if (url.pathname === "/api/placement" && request.method === "POST") {
      try {
        const body = await request.json();
        const placementData = body.placement;
        if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_WORKER_NAME) {
          return jsonResponse({ success: false, msg: "\u540E\u53F0\u53D8\u91CF\u672A\u914D\u7F6E\u5168\uFF01\u8BF7\u68C0\u67E5 CF_API_TOKEN, CF_ACCOUNT_ID, CF_WORKER_NAME" });
        }
        const formData = new FormData();
        formData.append("settings", new Blob([JSON.stringify({ placement: placementData })], { type: "application/json" }));
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${env.CF_WORKER_NAME}/settings`;
        const cfRes = await fetch(cfUrl, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${env.CF_API_TOKEN}` },
          body: formData
        });
        const cfData = await cfRes.json();
        if (cfData.success) {
          return jsonResponse({ success: true, msg: "\u90E8\u7F72\u533A\u57DF\u4FEE\u6539\u6210\u529F\uFF01" });
        } else {
          return jsonResponse({ success: false, msg: "CF\u62A5\u9519: " + (cfData.errors[0]?.message || "\u672A\u77E5\u9519\u8BEF") });
        }
      } catch (e) {
        return jsonResponse({ success: false, msg: e.message });
      }
    }
    if (url.pathname === "/api/trace") {
      const cf = request.cf || {};
      let egressColo = "\u63A2\u6D4B\u4E2D...";
      try {
        const traceRes = await fetch("https://1.1.1.1/cdn-cgi/trace", {
          headers: { "User-Agent": "Mozilla/5.0 (CF-Worker-Trace)" }
        });
        const traceText = await traceRes.text();
        const match = traceText.match(/colo=([A-Z]+)/);
        if (match) egressColo = match[1];
      } catch (e) {
        egressColo = "\u83B7\u53D6\u5931\u8D25";
      }
      return jsonResponse({
        success: true,
        entryCountry: cf.country || "\u672A\u77E5",
        entryCity: cf.city || "",
        entryColo: cf.colo || "\u672A\u77E5",
        egressColo
      });
    }
    if (url.pathname === "/api/edge-info") {
      const cf = request.cf || {};
      let egressColo = "\u63A2\u6D4B\u4E2D...";
      try {
        const traceRes = await fetch("https://1.1.1.1/cdn-cgi/trace", {
          headers: { "User-Agent": "Mozilla/5.0 (CF-Worker-Trace)" }
        });
        const traceText = await traceRes.text();
        const match = traceText.match(/colo=([A-Z]+)/);
        if (match) egressColo = match[1];
      } catch (e) {
        egressColo = "\u83B7\u53D6\u5931\u8D25";
      }
      const entryColo = cf.colo || "\u672A\u77E5";
      const bucket = Math.floor(Date.now() / 3e5);
      let cacheKey = "";
      try {
        const buf = new TextEncoder().encode(`${entryColo}:${egressColo}:${bucket}`);
        const digest = await crypto.subtle.digest("SHA-1", buf);
        cacheKey = Array.from(new Uint8Array(digest)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        cacheKey = "";
      }
      return jsonResponse({
        success: true,
        entryCountry: cf.country || "\u672A\u77E5",
        entryCity: cf.city || "",
        entryColo,
        egressColo,
        cacheKey
      });
    }
    if (url.pathname === "/__client_rtt__") {
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
    if (url.pathname === "/api/tg-webhook" && request.method === "POST") {
      try {
        const body = await request.json();
        if (body.message && body.message.text === "/stats") {
          if (env.DB && env.TG_BOT_TOKEN) {
            ctx.waitUntil(sendTgStats(env, body.message.chat.id));
          }
        }
        return new Response("OK");
      } catch (e) {
        return new Response("OK");
      }
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Max-Age": "86400" } });
    }
    if (url.pathname === "/status" && request.method === "GET") {
      if (!env.DB) return new Response("DB not bound", { status: 500 });
      try {
        const data = await loadStatusData(env, {});
        const hideRow = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'status_hide_node_names'`);
        const hideNames = !!(hideRow && hideRow.v === "1");
        return new Response(renderStatusHtml(data, { title: "\u8282\u70B9\u72B6\u6001", hideNames }), {
          headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=10" }
        });
      } catch (e) {
        return new Response("Status error: " + e.message, { status: 500 });
      }
    }
    if (url.pathname.startsWith("/public/") && request.method === "GET") {
      if (!env.DB) return new Response("DB not bound", { status: 500 });
      const token = url.pathname.slice("/public/".length);
      if (!/^[a-f0-9]{32,80}$/.test(token)) {
        return new Response("Invalid token", { status: 410, headers: { "Content-Type": "text/plain;charset=UTF-8" } });
      }
      try {
        const row = await dbFirst(env, `SELECT scope, expires_at FROM emby_public_share WHERE token = ? AND scope = 'dashboard'`, token);
        if (!row || (row.expires_at | 0) <= Math.floor(Date.now() / 1e3)) {
          return new Response("\u94FE\u63A5\u5DF2\u8FC7\u671F\u6216\u5931\u6548", { status: 410, headers: { "Content-Type": "text/plain;charset=UTF-8" } });
        }
        const data = await loadStatusData(env, {});
        return new Response(renderStatusHtml(data, { title: "\u8282\u70B9\u72B6\u6001\uFF08\u516C\u5F00\uFF09" }), {
          headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "public, max-age=10" }
        });
      } catch (e) {
        return new Response("Public status error: " + e.message, { status: 500 });
      }
    }
    if (url.pathname.startsWith("/card/") && url.pathname.endsWith(".svg") && request.method === "GET") {
      if (!env.DB) return new Response("DB not bound", { status: 500 });
      const token = url.pathname.slice("/card/".length, -".svg".length);
      if (!/^[a-f0-9]{32,80}$/.test(token)) {
        return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">\u94FE\u63A5\u65E0\u6548</text></svg>', {
          status: 410,
          headers: { "Content-Type": "image/svg+xml;charset=UTF-8" }
        });
      }
      try {
        const row = await dbFirst(env, `SELECT scope, prefix, expires_at FROM emby_public_share WHERE token = ? AND scope = 'card'`, token);
        if (!row || (row.expires_at | 0) <= Math.floor(Date.now() / 1e3)) {
          return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">\u94FE\u63A5\u5DF2\u8FC7\u671F</text></svg>', {
            status: 410,
            headers: { "Content-Type": "image/svg+xml;charset=UTF-8" }
          });
        }
        const data = await loadStatusData(env, { prefix: row.prefix });
        if (!data.cards.length) {
          return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">\u8282\u70B9\u5DF2\u4E0B\u7EBF\u6216\u672A\u5F00\u542F\u72B6\u6001</text></svg>', {
            status: 410,
            headers: { "Content-Type": "image/svg+xml;charset=UTF-8" }
          });
        }
        return new Response(renderCardSvg(data.cards[0]), {
          headers: { "Content-Type": "image/svg+xml;charset=UTF-8", "Cache-Control": "public, max-age=60" }
        });
      } catch (e) {
        return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="10" y="25" fill="#888">\u6E32\u67D3\u5931\u8D25</text></svg>', {
          status: 500,
          headers: { "Content-Type": "image/svg+xml;charset=UTF-8" }
        });
      }
    }
    const EXPECTED_TOKEN = env.ADMIN_TOKEN;
    if (!EXPECTED_TOKEN) return new Response("\u8BF7\u5728 Worker \u53D8\u91CF\u4E2D\u914D\u7F6E ADMIN_TOKEN", { status: 500 });
    function getCookie(req, name) {
      const cookieString = req.headers.get("Cookie");
      if (!cookieString) return null;
      const match = cookieString.match(new RegExp("(^| )" + name + "=([^;]+)"));
      if (match) return decodeURIComponent(match[2]);
      return null;
    }
    const isPanelOrApi = url.pathname === "/" || url.pathname.startsWith("/api/");
    if (isPanelOrApi && url.pathname !== "/api/tg-webhook") {
      const providedToken = getCookie(request, "admin_token");
      if (providedToken !== EXPECTED_TOKEN) {
        if (url.pathname === "/") return new Response(LOGIN_UI, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        else return new Response("Unauthorized", { status: 401 });
      }
    }
    if (url.pathname === "/") {
      return new Response(HTML_UI, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (url.pathname === "/api/analytics" && request.method === "GET") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" });
      try {
        const [trafficToday, traffic7d, traffic30d] = await Promise.all([
          getCFTraffic(env, "today"),
          getCFTraffic(env, 7),
          getCFTraffic(env, 30)
        ]);
        const trend = await dbAll(env, `SELECT date(timestamp, '+8 hours') as date, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY date(timestamp, '+8 hours') ORDER BY date ASC`);
        const locations = await dbAll(env, `SELECT country, COUNT(*) as count FROM visitor_logs WHERE timestamp >= datetime('now', '-7 days') GROUP BY country ORDER BY count DESC`);
        const recents = await dbAll(env, `SELECT prefix, datetime(timestamp, '+8 hours') as timestamp, ip, country, ua FROM visitor_logs ORDER BY timestamp DESC LIMIT 20`);
        return Response.json({
          success: true,
          trend: trend.results,
          locations: locations.results,
          recents: recents.results,
          trafficToday,
          traffic7d,
          traffic30d
        });
      } catch (e) {
        return Response.json({ success: false, error: e.message });
      }
    }
    if (url.pathname === "/api/route-trends" && request.method === "GET") {
      const days = Math.max(1, Math.min(7, parseInt(url.searchParams.get("days") || "7", 10) || 7));
      if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
        return Response.json({ ok: false, reason: "no-cf-token", days, items: [] });
      }
      if (!env.DB) {
        return Response.json({ ok: false, reason: "no-db", days, items: [] });
      }
      try {
        const utcHour = Math.floor(Date.now() / 36e5);
        const cacheKey = `${env.CF_ZONE_ID}|${days}|${utcHour}`;
        globalThis.__routeTrendCache = globalThis.__routeTrendCache || /* @__PURE__ */ new Map();
        const cached = globalThis.__routeTrendCache.get(cacheKey);
        const now = Date.now();
        if (cached && cached.expireAt > now) {
          return Response.json(cached.payload);
        }
        const { results: routes } = await dbAll(env, `SELECT prefix FROM routes`);
        if (!routes || routes.length === 0) {
          return Response.json({ ok: false, reason: "no-routes", days, items: [] });
        }
        const todayUtc = /* @__PURE__ */ new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);
        const dayKeys = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(todayUtc.getTime() - i * 864e5);
          dayKeys.push(d.toISOString().split("T")[0]);
        }
        const startIso = new Date(todayUtc.getTime() - (days - 1) * 864e5).toISOString();
        const endIso = new Date(todayUtc.getTime() + 864e5 - 1).toISOString();
        const items = await Promise.all(routes.map(async (r) => {
          const empty = dayKeys.map(() => 0);
          try {
            const q = {
              query: `query {
                              viewer {
                                zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
                                  httpRequestsAdaptiveGroups(
                                    limit: ${days},
                                    filter: {
                                      clientRequestPath_like: "/${r.prefix}%",
                                      datetime_geq: "${startIso}",
                                      datetime_leq: "${endIso}"
                                    },
                                    orderBy: [date_ASC]
                                  ) {
                                    dimensions { date }
                                    sum { edgeResponseBytes }
                                  }
                                }
                              }
                            }`
            };
            const cfRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
              method: "POST",
              headers: { "Authorization": `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify(q)
            });
            const cfData = await cfRes.json();
            const groups = cfData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
            const byDate = /* @__PURE__ */ new Map();
            for (const g of groups) {
              byDate.set(g.dimensions?.date, g.sum?.edgeResponseBytes || 0);
            }
            const bytes = dayKeys.map((d) => byDate.get(d) || 0);
            return { prefix: r.prefix, bytes };
          } catch (e) {
            return { prefix: r.prefix, bytes: empty };
          }
        }));
        const payload = {
          ok: true,
          days,
          generated_at: Math.floor(now / 1e3),
          source: "cf-graphql",
          items
        };
        globalThis.__routeTrendCache.set(cacheKey, { expireAt: now + 30 * 60 * 1e3, payload });
        return Response.json(payload);
      } catch (e) {
        return Response.json({ ok: false, reason: "graphql-failed", error: e.message, days, items: [] });
      }
    }
    if (url.pathname === "/api/deploy" && request.method === "POST") {
      const cfToken = env.CF_API_TOKEN;
      const accountId = env.CF_ACCOUNT_ID;
      const workerName = env.CF_WORKER_NAME;
      if (!cfToken || !accountId || !workerName) {
        return Response.json({ success: false, error: "\u7F3A\u5C11 CF_API_TOKEN, CF_ACCOUNT_ID \u6216 CF_WORKER_NAME \u73AF\u5883\u53D8\u91CF" });
      }
      try {
        const body = await request.json();
        if (!body.newCode) return Response.json({ success: false, error: "\u4EE3\u7801\u5185\u5BB9\u4E3A\u7A7A\u3002" });
        const serviceRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/services/${workerName}`, {
          headers: { "Authorization": `Bearer ${cfToken}` }
        });
        const serviceData = await serviceRes.json();
        let compDate = "2024-01-01";
        let compFlags = void 0;
        let placement = void 0;
        if (serviceData.success && serviceData.result) {
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
        for (const key in env) {
          if (typeof env[key] === "string") {
            preservedBindings.push({ name: key, type: "plain_text", text: env[key] });
          }
        }
        const bindingsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/bindings`, {
          headers: { "Authorization": `Bearer ${cfToken}` }
        });
        const bindingsData = await bindingsRes.json();
        if (bindingsData.success && Array.isArray(bindingsData.result)) {
          for (const b of bindingsData.result) {
            if (b.type !== "plain_text" && b.type !== "secret_text" && b.type !== "inherited") {
              preservedBindings.push(b);
            }
          }
        }
        const formData = new FormData();
        const metadata = {
          main_module: "worker.js",
          bindings: preservedBindings,
          compatibility_date: compDate
        };
        if (compFlags) metadata.compatibility_flags = compFlags;
        if (placement) metadata.placement = placement;
        formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }), "metadata.json");
        formData.append("worker.js", new Blob([body.newCode], { type: "application/javascript+module" }), "worker.js");
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
        const res = await fetch(cfUrl, {
          method: "PUT",
          headers: { "Authorization": `Bearer ${cfToken}` },
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          return Response.json({ success: true, msg: "\u4EE3\u7801\u66F4\u65B0\u6210\u529F\uFF0C\u5E76\u5DF2\u5B8C\u7F8E\u4FDD\u7559\u539F\u6709\u653E\u7F6E\u5730\u533A\u548C\u517C\u5BB9\u914D\u7F6E\uFF01" });
        } else {
          throw new Error(JSON.stringify(data.errors));
        }
      } catch (e) {
        return Response.json({ success: false, error: e.message });
      }
    }
    if (url.pathname === "/api/purge-cache" && request.method === "POST") {
      const cfToken = env.CF_API_TOKEN;
      const zoneId = env.CF_ZONE_ID;
      if (!cfToken || !zoneId) return Response.json({ success: false, error: "\u7F3A\u5C11 CF_API_TOKEN \u6216 CF_ZONE_ID \u53D8\u91CF" });
      try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, { method: "POST", headers: { "Authorization": `Bearer ${cfToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ purge_everything: true }) });
        const data = await res.json();
        if (!data.success) throw new Error(JSON.stringify(data.errors));
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false, error: e.message });
      }
    }
    if (url.pathname === "/api/ping-node") {
      const target = url.searchParams.get("url");
      if (!target) return Response.json({ ms: -1 });
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2e3);
        await fetch(target + "/", { method: "HEAD", signal: controller.signal });
        clearTimeout(timeoutId);
        return Response.json({ ms: Date.now() - start });
      } catch (e) {
        return Response.json({ ms: -1 });
      }
    }
    if (url.pathname === "/api/_probe_now") {
      const key = url.searchParams.get("key") || "";
      if (!env.ADMIN_TOKEN || key !== env.ADMIN_TOKEN) {
        return new Response("forbidden", { status: 403 });
      }
      if (!env.DB) return new Response("no DB", { status: 500 });
      const t0 = Date.now();
      try {
        await probeAll(env);
        return Response.json({ ok: true, ms: Date.now() - t0 });
      } catch (e) {
        return Response.json({ ok: false, error: String(e && e.message || e), ms: Date.now() - t0 }, { status: 500 });
      }
    }
    if (url.pathname === "/api/_counts_now") {
      const key = url.searchParams.get("key") || "";
      if (!env.ADMIN_TOKEN || key !== env.ADMIN_TOKEN) {
        return new Response("forbidden", { status: 403 });
      }
      if (!env.DB) return new Response("no DB", { status: 500 });
      const t0 = Date.now();
      try {
        await ensureSchema(env);
        const { results: routes } = await dbAll(env, `
                    SELECT prefix, target, custom_headers, media_counts_auto_auth, emby_auth_cache
                      FROM routes WHERE show_on_status = 1 AND media_counts_auto_auth = 1
                `);
        const now = Math.floor(Date.now() / 1e3);
        await maybeFetchMediaCounts(env, routes || [], now);
        return Response.json({ ok: true, routes: (routes || []).length, ms: Date.now() - t0 });
      } catch (e) {
        return Response.json({ ok: false, error: String(e && e.message || e), ms: Date.now() - t0 }, { status: 500 });
      }
    }
    if (url.pathname === "/api/speedtest-down") {
      const bytes = Math.min(parseInt(url.searchParams.get("bytes") || "5242880", 10) || 5242880, 50 * 1024 * 1024);
      const chunkSize = 65536;
      const chunk = new Uint8Array(chunkSize);
      let sent = 0;
      const stream = new ReadableStream({
        pull(controller) {
          if (sent >= bytes) {
            controller.close();
            return;
          }
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
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes),
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (url.pathname === "/api/manual-redirect-domains") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" });
      await ensureSchema(env);
      if (request.method === "GET") {
        const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'manual_redirect_domains'`);
        const domains = String(row?.v || "").split("\n").map((s) => s.trim()).filter(Boolean);
        return Response.json({ success: true, domains });
      }
      if (request.method === "POST") {
        try {
          const body = await request.json();
          const list = Array.isArray(body.domains) ? body.domains : [];
          const cleaned = list.map((s) => String(s || "").trim().toLowerCase()).filter((s) => s && /^[a-z0-9.-]+$/.test(s));
          const v = cleaned.join("\n");
          await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('manual_redirect_domains', ?, CURRENT_TIMESTAMP)`, v);
          updateManualRedirectHosts(new Set(cleaned));
          return Response.json({ success: true, domains: cleaned });
        } catch (e) {
          return Response.json({ success: false, error: e.message }, { status: 400 });
        }
      }
      return new Response("Method not allowed", { status: 405 });
    }
    if (url.pathname === "/api/optimized-domains" && request.method === "GET") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" });
      await ensureSchema(env);
      const { results } = await dbAll(env, `SELECT id, domain, note, builtin, enabled, last_ms FROM optimized_domains ORDER BY builtin DESC, id ASC`);
      return Response.json({ success: true, items: results || [] });
    }
    if (url.pathname === "/api/optimized-domains" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" });
      await ensureSchema(env);
      try {
        const { domain, note } = await request.json();
        const d = String(domain || "").trim().toLowerCase();
        if (!d || !/^[a-z0-9.-]+$/.test(d)) return Response.json({ success: false, error: "\u57DF\u540D\u683C\u5F0F\u975E\u6CD5" }, { status: 400 });
        await dbRun(env, `INSERT OR IGNORE INTO optimized_domains (domain, note, builtin, enabled) VALUES (?, ?, 0, 1)`, d, String(note || ""));
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 400 });
      }
    }
    if (url.pathname.startsWith("/api/optimized-domains/") && url.pathname !== "/api/optimized-domains/speedtest") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" });
      await ensureSchema(env);
      const id = parseInt(url.pathname.split("/").pop(), 10);
      if (!id) return Response.json({ success: false, error: "invalid id" }, { status: 400 });
      const row = await dbFirst(env, `SELECT * FROM optimized_domains WHERE id = ?`, id);
      if (!row) return Response.json({ success: false, error: "\u8BB0\u5F55\u4E0D\u5B58\u5728" }, { status: 404 });
      if (request.method === "PATCH") {
        try {
          const body = await request.json();
          const enabled = body.enabled === void 0 ? row.enabled : body.enabled ? 1 : 0;
          const note = body.note === void 0 ? row.note : String(body.note || "");
          await dbRun(env, `UPDATE optimized_domains SET enabled = ?, note = ? WHERE id = ?`, enabled, note, id);
          return Response.json({ success: true });
        } catch (e) {
          return Response.json({ success: false, error: e.message }, { status: 400 });
        }
      }
      if (request.method === "DELETE") {
        if (row.builtin) return Response.json({ success: false, error: "\u5185\u7F6E\u57DF\u540D\u4E0D\u53EF\u5220\u9664\uFF08\u53EF\u7981\u7528\uFF09" }, { status: 400 });
        await dbRun(env, `DELETE FROM optimized_domains WHERE id = ?`, id);
        return Response.json({ success: true });
      }
      return new Response("Method not allowed", { status: 405 });
    }
    if (url.pathname === "/api/optimized-domains/speedtest" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" });
      await ensureSchema(env);
      const { results } = await dbAll(env, `SELECT id, domain FROM optimized_domains WHERE enabled = 1`);
      const rows = results || [];
      const measured = await Promise.all(rows.map(async (r) => {
        const probe = await probeDomain(r.domain);
        return { id: r.id, domain: r.domain, ms: probe.ms, ok: probe.ok };
      }));
      try {
        const stmts = measured.map((m) => env.DB.prepare(`UPDATE optimized_domains SET last_ms = ? WHERE id = ?`).bind(m.ms, m.id));
        if (stmts.length) await env.DB.batch(stmts);
      } catch (e) {
      }
      measured.sort((a, b) => {
        if (!a.ok && !b.ok) return 0;
        if (!a.ok) return 1;
        if (!b.ok) return -1;
        return a.ms - b.ms;
      });
      return Response.json({ success: true, items: measured });
    }
    if (url.pathname === "/api/dns-ready" && request.method === "GET") {
      const ok = !!(env.CF_API_TOKEN && env.CF_ZONE_ID && env.CF_DOMAIN);
      return Response.json({ success: true, ready: ok, domain: env.CF_DOMAIN || "" });
    }
    if (url.pathname === "/api/dns/replace" && request.method === "POST") {
      try {
        const body = await request.json();
        const newDomain = String(body.domain || "").trim().toLowerCase();
        if (!newDomain) return Response.json({ success: false, error: "\u7F3A\u5C11\u76EE\u6807\u57DF\u540D" }, { status: 400 });
        const cfToken = env.CF_API_TOKEN;
        const zoneId = env.CF_ZONE_ID;
        const domain = env.CF_DOMAIN;
        if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: "\u7F3A\u5C11\u73AF\u5883\u53D8\u91CF CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN" }, { status: 400 });
        const listRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, {
          headers: { "Authorization": `Bearer ${cfToken}` }
        });
        const listData = await listRes.json();
        if (!listData.success) return Response.json({ success: false, error: "CF \u62C9\u53D6\u8BB0\u5F55\u5931\u8D25: " + JSON.stringify(listData.errors) }, { status: 502 });
        const oldRecords = (listData.result || []).filter((r) => r.type === "A" || r.type === "AAAA" || r.type === "CNAME");
        for (const r of oldRecords) {
          await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${r.id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${cfToken}` }
          });
        }
        const postRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${cfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "CNAME", name: domain, content: newDomain, ttl: 60, proxied: false })
        });
        const postData = await postRes.json();
        if (!postData.success) return Response.json({ success: false, error: "CF \u5199\u5165\u5931\u8D25: " + JSON.stringify(postData.errors) }, { status: 502 });
        return Response.json({ success: true, name: domain, content: newDomain, replaced: oldRecords.length });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/get-dns") {
      const cfToken = env.CF_API_TOKEN;
      const zoneId = env.CF_ZONE_ID;
      const domain = env.CF_DOMAIN;
      if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: "\u7F3A\u5C11 DNS \u73AF\u5883\u53D8\u91CF" });
      try {
        const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, { headers: { "Authorization": `Bearer ${cfToken}` } });
        const getData = await getRes.json();
        return Response.json({ success: true, result: getData.result });
      } catch (error) {
        return Response.json({ success: false, error: error.message });
      }
    }
    if (url.pathname === "/api/update-dns" && request.method === "POST") {
      const body = await request.json();
      const ips = body.ips;
      const cfToken = env.CF_API_TOKEN;
      const zoneId = env.CF_ZONE_ID;
      const domain = env.CF_DOMAIN;
      if (!cfToken || !zoneId || !domain) return Response.json({ success: false, error: "\u7F3A\u5C11 DNS \u73AF\u5883\u53D8\u91CF" });
      try {
        const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${domain}`, { headers: { "Authorization": `Bearer ${cfToken}` } });
        const getData = await getRes.json();
        if (!getData.success) throw new Error("\u83B7\u53D6\u73B0\u6709 DNS \u8BB0\u5F55\u5931\u8D25");
        const oldRecords = getData.result.filter((r) => r.type === "A" || r.type === "AAAA" || r.type === "CNAME");
        for (const record of oldRecords) {
          await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${cfToken}` } });
        }
        for (const ip of ips) {
          const cleanItem = ip.replace(/[\[\]]/g, "");
          let recordType = "A";
          if (cleanItem.includes(":")) recordType = "AAAA";
          else if (/[a-zA-Z]/.test(cleanItem)) recordType = "CNAME";
          const postRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, { method: "POST", headers: { "Authorization": `Bearer ${cfToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: recordType, name: domain, content: cleanItem, ttl: 60, proxied: false }) });
          const postData = await postRes.json();
          if (!postData.success) throw new Error(`\u8BB0\u5F55\u63D0\u4EA4\u5931\u8D25: ` + JSON.stringify(postData.errors));
        }
        return Response.json({ success: true, message: `\u2705 \u6210\u529F\uFF01` });
      } catch (error) {
        return Response.json({ success: false, error: error.message });
      }
    }
    if (url.pathname === "/api/get-custom-api-ips") {
      try {
        const apiUrl = url.searchParams.get("url");
        if (!apiUrl) throw new Error("\u7F3A\u5C11 URL");
        const response = await fetch(apiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        const text = await response.text();
        let validIPs = /* @__PURE__ */ new Set();
        try {
          const jsonObj = JSON.parse(text);
          if (jsonObj && jsonObj.data && Array.isArray(jsonObj.data)) {
            jsonObj.data.forEach((item) => {
              if (item.ip) {
                let ip = item.ip;
                if (ip.includes(":") && !ip.startsWith("[")) ip = `[${ip}]`;
                validIPs.add(ip);
              }
            });
          }
        } catch (e) {
        }
        if (validIPs.size === 0) {
          const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
          const matchedIPv4 = text.match(ipv4Regex) || [];
          matchedIPv4.forEach((ip) => {
            if (!ip.startsWith("10.") && !ip.startsWith("192.168.") && !ip.startsWith("127.")) validIPs.add(ip);
          });
          const ipv6Regex = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;
          const matchedIPv6 = text.match(ipv6Regex) || [];
          matchedIPv6.forEach((ip) => {
            if (ip.length > 7 && ip.includes(":") && !ip.startsWith("::1")) validIPs.add(ip.startsWith("[") ? ip : `[${ip}]`);
          });
        }
        const uniqueIPArray = Array.from(validIPs);
        for (let i = uniqueIPArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]];
        }
        return Response.json({ success: true, ips: uniqueIPArray.slice(0, 15), totalCount: uniqueIPArray.length });
      } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/get-remote-ips") {
      try {
        const reqType = (url.searchParams.get("type") || "all").toLowerCase();
        const validIPs = /* @__PURE__ */ new Set();
        if (["all", "\u7535\u4FE1", "\u8054\u901A", "\u79FB\u52A8", "\u591A\u7EBF", "ipv6"].includes(reqType)) {
          try {
            const res1 = await fetch("https://api.uouin.com/cloudflare.html", { headers: { "User-Agent": "Mozilla/5.0" } });
            if (res1.ok) {
              const text1 = await res1.text();
              const cleanText = text1.replace(/<[^>]+>/g, " ");
              const regex = /(电信|联通|移动|多线|ipv6)\s+((?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-fA-F0-9]{1,4}:)+[a-fA-F0-9]{1,4})/gi;
              let match;
              while ((match = regex.exec(cleanText)) !== null) {
                const lineType = match[1].toLowerCase();
                let ip = match[2];
                if (ip.includes(":") && !ip.startsWith("[")) ip = `[${ip}]`;
                if (reqType === "all" || reqType === lineType) validIPs.add(ip);
              }
            }
          } catch (e) {
          }
        }
        if (["all", "\u4F18\u9009"].includes(reqType)) {
          try {
            const res2 = await fetch("https://raw.githubusercontent.com/ZhiXuanWang/cf-speed-dns/refs/heads/main/ipTop10.html", { headers: { "User-Agent": "Mozilla/5.0" } });
            if (res2.ok) {
              const text2 = await res2.text();
              const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
              const matched = text2.match(ipv4Regex) || [];
              matched.forEach((ip) => {
                if (!ip.startsWith("10.") && !ip.startsWith("192.168.") && !ip.startsWith("127.")) validIPs.add(ip);
              });
            }
          } catch (e) {
          }
        }
        const uniqueIPArray = Array.from(validIPs);
        for (let i = uniqueIPArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [uniqueIPArray[i], uniqueIPArray[j]] = [uniqueIPArray[j], uniqueIPArray[i]];
        }
        return Response.json({ success: true, ips: uniqueIPArray.slice(0, 10), totalCount: uniqueIPArray.length });
      } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/routes/reorder" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A DB" });
      try {
        const items = await request.json();
        const stmts = items.map((item) => env.DB.prepare("UPDATE routes SET sort_order = ? WHERE prefix = ?").bind(item.sort_order, item.prefix));
        await env.DB.batch(stmts);
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false, error: e.message });
      }
    }
    if (url.pathname === "/api/routes/import" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A DB" });
      try {
        const routes = await request.json();
        const skipped = [];
        let imported = 0;
        for (const r of routes) {
          if (!r.prefix || !r.target) {
            skipped.push({ prefix: r.prefix || "(\u7A7A)", reason: "\u7F3A\u5C11 prefix \u6216 target" });
            continue;
          }
          const reason = validateRoutePrefix(r.prefix);
          if (reason) {
            skipped.push({ prefix: r.prefix, reason });
            continue;
          }
          await dbRun(
            env,
            "INSERT OR REPLACE INTO routes (prefix, target, mode, remark, last_play, icon, cache_img, sort_order, custom_headers, backend_url, show_on_status, public_alias, media_counts_auto_auth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            r.prefix,
            r.target,
            r.mode || "off",
            r.remark || "",
            r.last_play || "",
            r.icon || "",
            r.cache_img || "on",
            r.sort_order || 0,
            r.custom_headers || "",
            r.backend_url || "",
            r.show_on_status ? 1 : 0,
            r.public_alias || "",
            r.media_counts_auto_auth ? 1 : 0
          );
          imported++;
        }
        return Response.json({ success: true, imported, skipped });
      } catch (e) {
        return Response.json({ success: false, error: e.message });
      }
    }
    if (url.pathname === "/api/status/route-flags" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      await ensureSchema(env);
      try {
        const body = await request.json();
        const prefix = String(body.prefix || "").trim();
        if (!prefix) return Response.json({ success: false, error: "\u7F3A\u5C11 prefix" }, { status: 400 });
        const exists = await dbFirst(env, `SELECT prefix FROM routes WHERE prefix = ?`, prefix);
        if (!exists) return Response.json({ success: false, error: "\u8282\u70B9\u4E0D\u5B58\u5728" }, { status: 404 });
        const fields = [];
        const values = [];
        if (body.show_on_status !== void 0) {
          fields.push("show_on_status = ?");
          values.push(body.show_on_status ? 1 : 0);
        }
        if (body.public_alias !== void 0) {
          fields.push("public_alias = ?");
          values.push(String(body.public_alias || "").trim());
        }
        if (body.media_counts_auto_auth !== void 0) {
          fields.push("media_counts_auto_auth = ?");
          values.push(body.media_counts_auto_auth ? 1 : 0);
        }
        if (!fields.length) return Response.json({ success: false, error: "\u65E0\u5B57\u6BB5\u9700\u8981\u66F4\u65B0" }, { status: 400 });
        values.push(prefix);
        await dbRun(env, `UPDATE routes SET ${fields.join(", ")} WHERE prefix = ?`, ...values);
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 400 });
      }
    }
    if (url.pathname === "/api/status/revoke-auth" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      await ensureSchema(env);
      try {
        const body = await request.json();
        const prefix = String(body.prefix || "").trim();
        if (!prefix) return Response.json({ success: false, error: "\u7F3A\u5C11 prefix" }, { status: 400 });
        await dbRun(env, `UPDATE routes SET emby_auth_cache = '', emby_auth_seen_at = 0, emby_auth_used_at = 0 WHERE prefix = ?`, prefix);
        HARVEST_MEM.delete(prefix);
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 400 });
      }
    }
    if (url.pathname === "/api/status/probes" && request.method === "GET") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      try {
        const data = await loadStatusData(env, {});
        return Response.json({ success: true, cards: data.cards });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/status/auth-state" && request.method === "GET") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      await ensureSchema(env);
      const { results } = await dbAll(env, `
                SELECT prefix, show_on_status, public_alias, media_counts_auto_auth,
                       CASE WHEN emby_auth_cache = '' THEN 0 ELSE 1 END AS has_token,
                       emby_auth_seen_at, emby_auth_used_at
                  FROM routes
            `);
      return Response.json({ success: true, items: results || [] });
    }
    if (url.pathname === "/api/status/global-flags" && request.method === "GET") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      await ensureSchema(env);
      const row = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'status_hide_node_names'`);
      const ccRow = await dbFirst(env, `SELECT v FROM kv_config WHERE k = 'proxy_country_allowlist'`);
      return Response.json({
        success: true,
        hide_node_names: row && row.v === "1" ? 1 : 0,
        country_allowlist: ccRow && ccRow.v ? ccRow.v : ""
      });
    }
    if (url.pathname === "/api/status/global-flags" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      await ensureSchema(env);
      try {
        const body = await request.json();
        if (body.hide_node_names !== void 0) {
          const v = body.hide_node_names ? "1" : "0";
          await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('status_hide_node_names', ?, CURRENT_TIMESTAMP)`, v);
        }
        if (body.country_allowlist !== void 0) {
          const raw = String(body.country_allowlist || "");
          const codes = Array.from(new Set(
            raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
          ));
          const v = codes.join(",");
          await dbRun(env, `INSERT OR REPLACE INTO kv_config (k, v, updated_at) VALUES ('proxy_country_allowlist', ?, CURRENT_TIMESTAMP)`, v);
        }
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 400 });
      }
    }
    if (url.pathname === "/api/share/dashboard" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      await ensureSchema(env);
      try {
        const token = newShareToken();
        const now = Math.floor(Date.now() / 1e3);
        const expires = now + 3600;
        await env.DB.batch([
          env.DB.prepare(`DELETE FROM emby_public_share WHERE scope = 'dashboard'`),
          env.DB.prepare(`INSERT INTO emby_public_share(token, scope, prefix, expires_at, created_at) VALUES(?, 'dashboard', '', ?, ?)`).bind(token, expires, now)
        ]);
        const origin = new URL(request.url).origin;
        return Response.json({ success: true, token, url: `${origin}/public/${token}`, expires_at: expires });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
      }
    }
    if (url.pathname === "/api/share/card" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93" }, { status: 500 });
      await ensureSchema(env);
      try {
        const body = await request.json();
        const prefix = String(body.prefix || "").trim();
        if (!prefix) return Response.json({ success: false, error: "\u7F3A\u5C11 prefix" }, { status: 400 });
        const exists = await dbFirst(env, `SELECT show_on_status FROM routes WHERE prefix = ?`, prefix);
        if (!exists) return Response.json({ success: false, error: "\u8282\u70B9\u4E0D\u5B58\u5728" }, { status: 404 });
        if (!exists.show_on_status) return Response.json({ success: false, error: "\u8BE5\u8282\u70B9\u672A\u5F00\u542F\u201C\u5728\u72B6\u6001\u9875\u5C55\u793A\u201D\uFF0C\u65E0\u6CD5\u751F\u6210\u5206\u4EAB\u5361\u7247" }, { status: 400 });
        const token = newShareToken();
        const now = Math.floor(Date.now() / 1e3);
        const expires = now + 3600;
        await env.DB.batch([
          env.DB.prepare(`DELETE FROM emby_public_share WHERE scope = 'card' AND prefix = ?`).bind(prefix),
          env.DB.prepare(`INSERT INTO emby_public_share(token, scope, prefix, expires_at, created_at) VALUES(?, 'card', ?, ?, ?)`).bind(token, prefix, expires, now)
        ]);
        const origin = new URL(request.url).origin;
        return Response.json({ success: true, token, url: `${origin}/card/${token}.svg`, expires_at: expires });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
      }
    }
    if (url.pathname.startsWith("/api/routes")) {
      if (!env.DB) return Response.json({ error: "\u7531\u4E8E\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93\uFF0C\u53CD\u4EE3\u529F\u80FD\u4E0D\u53EF\u7528\u3002" }, { status: 500 });
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS routes (prefix TEXT PRIMARY KEY, target TEXT NOT NULL)`);
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS request_stats (prefix TEXT, date TEXT, count INTEGER DEFAULT 0, PRIMARY KEY(prefix, date))`);
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS visitor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, prefix TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ip TEXT, country TEXT, ua TEXT)`);
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN mode TEXT DEFAULT 'off'`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN remark TEXT DEFAULT ''`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN last_play TEXT DEFAULT ''`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN icon TEXT DEFAULT ''`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN cache_img TEXT DEFAULT 'on'`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN sort_order INTEGER DEFAULT 0`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN custom_headers TEXT DEFAULT ''`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`ALTER TABLE routes ADD COLUMN backend_url TEXT DEFAULT ''`);
      } catch (e) {
      }
      try {
        await env.DB.exec(`DELETE FROM visitor_logs WHERE timestamp < datetime('now', '-7 days')`);
      } catch (e) {
      }
      if (request.method === "GET") {
        const todayStr = new Date(Date.now() + 8 * 36e5).toISOString().split("T")[0];
        const { results: routes } = await dbAll(env, `
                    SELECT r.*,
                    IFNULL(s.count, 0) as todayReqs,
                    (SELECT SUM(count) FROM request_stats WHERE prefix = r.prefix) as totalReqs
                    FROM routes r
                    LEFT JOIN request_stats s ON r.prefix = s.prefix AND s.date = ?
                    ORDER BY r.sort_order ASC, r.prefix ASC
                `, todayStr);
        if (env.CF_API_TOKEN && env.CF_ZONE_ID && routes && routes.length > 0) {
          const end = /* @__PURE__ */ new Date();
          const beijingTime = new Date(end.getTime() + 8 * 36e5);
          beijingTime.setUTCHours(0, 0, 0, 0);
          const start = new Date(beijingTime.getTime() - 8 * 36e5);
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
              const cfRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
                method: "POST",
                headers: { "Authorization": `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify(graphqlQuery)
              });
              const cfData = await cfRes.json();
              const bytes = cfData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups?.[0]?.sum?.edgeResponseBytes || 0;
              let formatted = "0 B";
              if (bytes >= 1099511627776) formatted = (bytes / 1099511627776).toFixed(2) + " TB";
              else if (bytes >= 1073741824) formatted = (bytes / 1073741824).toFixed(2) + " GB";
              else if (bytes >= 1048576) formatted = (bytes / 1048576).toFixed(2) + " MB";
              else if (bytes >= 1024) formatted = (bytes / 1024).toFixed(2) + " KB";
              else if (bytes > 0) formatted = bytes + " B";
              r.todayBandwidth = formatted;
            } catch (e) {
              r.todayBandwidth = "\u83B7\u53D6\u5F02\u5E38";
            }
          }));
        }
        return Response.json(routes || []);
      }
      if (request.method === "POST") {
        const data = await request.json();
        const invalidReason = validateRoutePrefix(data.prefix);
        if (invalidReason) {
          return Response.json({ success: false, error: `\u8DEF\u7531\u522B\u540D "${data.prefix}" \u4E0D\u53EF\u7528\uFF1A${invalidReason}` }, { status: 400 });
        }
        let currentSortOrder = 0;
        let prevStatusFields = { show_on_status: 0, public_alias: "", media_counts_auto_auth: 0 };
        if (data.oldPrefix && data.oldPrefix !== data.prefix) {
          const oldRow = await dbFirst(env, "SELECT sort_order, show_on_status, public_alias, media_counts_auto_auth FROM routes WHERE prefix = ?", data.oldPrefix);
          if (oldRow) {
            currentSortOrder = oldRow.sort_order;
            prevStatusFields = { show_on_status: oldRow.show_on_status | 0, public_alias: oldRow.public_alias || "", media_counts_auto_auth: oldRow.media_counts_auto_auth | 0 };
          }
          await dbRun(env, "DELETE FROM routes WHERE prefix = ?", data.oldPrefix);
        } else {
          const oldRow = await dbFirst(env, "SELECT sort_order, show_on_status, public_alias, media_counts_auto_auth FROM routes WHERE prefix = ?", data.prefix);
          if (oldRow) {
            currentSortOrder = oldRow.sort_order;
            prevStatusFields = { show_on_status: oldRow.show_on_status | 0, public_alias: oldRow.public_alias || "", media_counts_auto_auth: oldRow.media_counts_auto_auth | 0 };
          }
        }
        const showOnStatus = data.show_on_status === void 0 ? prevStatusFields.show_on_status : data.show_on_status ? 1 : 0;
        const publicAlias = data.public_alias === void 0 ? prevStatusFields.public_alias : String(data.public_alias || "").trim();
        const mediaAuto = data.media_counts_auto_auth === void 0 ? prevStatusFields.media_counts_auto_auth : data.media_counts_auto_auth ? 1 : 0;
        await dbRun(
          env,
          "INSERT OR REPLACE INTO routes (prefix, target, mode, remark, icon, cache_img, sort_order, custom_headers, backend_url, show_on_status, public_alias, media_counts_auto_auth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          data.prefix,
          data.target,
          data.mode || "off",
          data.remark || "",
          data.icon || "",
          data.cache_img || "on",
          currentSortOrder,
          data.custom_headers || "",
          data.backend_url || "",
          showOnStatus,
          publicAlias,
          mediaAuto
        );
        return Response.json({ success: true });
      }
      if (request.method === "DELETE") {
        const prefix = url.searchParams.get("prefix");
        await dbRun(env, "DELETE FROM routes WHERE prefix = ?", prefix);
        return Response.json({ success: true });
      }
      return new Response("Method not allowed", { status: 405 });
    }
    let targetUrls = [];
    let currentMode = "off";
    let enableCache = true;
    let remainingPath = "";
    let customHeadersRaw = "";
    const decodedPath = decodeURIComponent(url.pathname);
    let matchedPrefix = null;
    let proxyOrigin = new URL(request.url).origin;
    if (decodedPath.startsWith("/http://") || decodedPath.startsWith("/https://")) {
      targetUrls = [decodedPath.substring(1)];
      remainingPath = "";
    } else {
      const pathParts = decodedPath.split("/");
      const prefix = pathParts[1];
      if (!prefix) return new Response(`Not Found`, { status: 404 });
      try {
        if (!env.DB) return new Response(`404: Node not found (DB not bound)`, { status: 404 });
        const stmt = env.DB.prepare(`SELECT target, mode, cache_img, custom_headers, media_counts_auto_auth FROM routes WHERE prefix = ?`);
        const route = await stmt.bind(prefix).first();
        if (!route) return new Response(`404: Node not found`, { status: 404 });
        currentMode = route.mode || "off";
        enableCache = route.cache_img !== "off";
        matchedPrefix = prefix;
        remainingPath = "/" + pathParts.slice(2).join("/");
        targetUrls = route.target.split(",").map((s) => s.trim()).filter(Boolean);
        customHeadersRaw = route.custom_headers || "";
        if (route.media_counts_auto_auth === 1 && ctx && ctx.waitUntil) {
          const tok = extractEmbyToken(request);
          if (tok) {
            const nowSec = Math.floor(Date.now() / 1e3);
            const last = HARVEST_MEM.get(prefix);
            if (!last || last.token !== tok || nowSec - last.writtenAt > EMBY_HARVEST_DEBOUNCE_S) {
              HARVEST_MEM.set(prefix, { token: tok, writtenAt: nowSec });
              ctx.waitUntil(persistHarvestedToken(env, prefix, tok, nowSec));
            }
          }
        }
        if (remainingPath.startsWith("/http://") || remainingPath.startsWith("/https://")) {
          targetUrls = [remainingPath.substring(1)];
          remainingPath = "";
        }
      } catch (e) {
        return new Response("DB Error: " + e.message, { status: 500 });
      }
    }
    if (targetUrls.length === 0) return new Response("404: Target empty", { status: 404 });
    const _allowSet = await loadCountryAllowlist(env);
    if (_allowSet) {
      const _cc = (request.headers.get("cf-ipcountry") || "").toUpperCase();
      if (!_cc || _cc === "XX" || !_allowSet.has(_cc)) {
        return new Response("Forbidden: country not allowed", { status: 403 });
      }
    }
    if ((request.headers.get("Upgrade") || "").toLowerCase() === "websocket") {
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
        } catch (err) {
          wsLastError = err;
        }
      }
      return new Response("WebSocket upstream failed. Last Error: " + (wsLastError?.message || "Unknown Error"), { status: 502 });
    }
    const isNewPlaySession = /\/PlaybackInfo/i.test(url.pathname);
    if (isNewPlaySession && matchedPrefix && env.DB && ctx && ctx.waitUntil) {
      try {
        const todayStr = new Date(Date.now() + 8 * 36e5).toISOString().split("T")[0];
        const nowTime = new Date(Date.now() + 8 * 36e5).toISOString().replace("T", " ").split(".")[0];
        let stmts = [
          env.DB.prepare(`INSERT INTO request_stats (prefix, date, count) VALUES (?, ?, 1) ON CONFLICT(prefix, date) DO UPDATE SET count = count + 1`).bind(matchedPrefix, todayStr),
          env.DB.prepare(`UPDATE routes SET last_play = ? WHERE prefix = ?`).bind(nowTime, matchedPrefix)
        ];
        const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "Unknown";
        const clientCountry = request.headers.get("cf-ipcountry") || "Unknown";
        const clientUa = request.headers.get("User-Agent") || "Unknown";
        stmts.push(env.DB.prepare(`INSERT INTO visitor_logs (prefix, ip, country, ua) VALUES (?, ?, ?, ?)`).bind(matchedPrefix, clientIp, clientCountry, clientUa));
        ctx.waitUntil(env.DB.batch(stmts));
      } catch (e) {
      }
    }
    const hasBody = request.method !== "GET" && request.method !== "HEAD" && !!request.body;
    let bodyBuffer = null;
    if (hasBody) {
      const buf = await request.clone().arrayBuffer();
      if (buf.byteLength <= MAX_RETRY_BODY_BYTES) {
        bodyBuffer = buf;
      }
    }
    const canRetry = !hasBody || bodyBuffer !== null;
    let finalResponse = null;
    let lastError = null;
    let triedUpstreamIndex = -1;
    let triedUpstreamCount = 0;
    for (let i = 0; i < targetUrls.length; i++) {
      const targetUrlStr = targetUrls[i] + remainingPath + url.search;
      const targetUrl = new URL(targetUrlStr);
      const newHeaders = buildUpstreamHeaders(request, targetUrl, currentMode, customHeadersRaw);
      const isStaticOrImage = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(targetUrl.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(targetUrl.pathname);
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), MAX_UPSTREAM_TIMEOUT_MS);
      let fetchInit = { method: request.method, headers: newHeaders, redirect: "manual", signal: abortCtrl.signal };
      if (isStaticOrImage && enableCache) {
        fetchInit.cf = { cacheEverything: true, cacheTtl: 86400 };
      }
      if (hasBody) {
        if (bodyBuffer !== null) {
          fetchInit.body = bodyBuffer;
        } else {
          fetchInit.body = request.body;
          fetchInit.duplex = "half";
        }
      }
      triedUpstreamCount++;
      try {
        let response = await fetchWithSchemeFallback(targetUrl, fetchInit, canRetry);
        clearTimeout(timeoutId);
        if (response.status === 403 && canRetry) {
          const cascaded = await attempt403Cascade(targetUrl, newHeaders, fetchInit, currentMode);
          if (cascaded) response = cascaded;
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          lastError = new Error(`Node ${i + 1} returned HTTP ${response.status}`);
          continue;
        }
        triedUpstreamIndex = i;
        finalResponse = response;
        break;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        continue;
      }
    }
    if (!finalResponse) return new Response("Worker Proxy Failover Exhausted. All nodes failed. Last Error: " + (lastError?.message || "Unknown Error"), { status: 502 });
    const responseHeaders = new Headers(finalResponse.headers);
    if (env.DEBUG_FAILOVER === "1") {
      responseHeaders.set("X-Proxy-Upstream-Index", String(triedUpstreamIndex));
      responseHeaders.set("X-Proxy-Upstream-Tries", String(triedUpstreamCount));
    }
    const safePrefix = matchedPrefix ? `/${matchedPrefix}` : "";
    if ([301, 302, 303, 307, 308].includes(finalResponse.status)) {
      const location = responseHeaders.get("Location");
      if (location) {
        let absHost = null;
        try {
          if (/^https?:\/\//i.test(location)) absHost = new URL(location).host.toLowerCase();
          else if (location.startsWith("//")) absHost = new URL(new URL(request.url).protocol + location).host.toLowerCase();
        } catch (e) {
        }
        const allowlist = await getManualRedirectHosts(env);
        if (absHost && hostMatchesAllowlist(absHost, allowlist)) {
          responseHeaders.set("Access-Control-Allow-Origin", "*");
          return new Response(null, { status: finalResponse.status, headers: responseHeaders });
        }
        if (/^https?:\/\//i.test(location)) {
          responseHeaders.set("Location", `${safePrefix}/${encodeURIComponent(location)}`);
        } else if (location.startsWith("//")) {
          const abs = new URL(request.url).protocol + location;
          responseHeaders.set("Location", `${safePrefix}/${encodeURIComponent(abs)}`);
        } else if (location.startsWith("/")) {
          if (safePrefix) responseHeaders.set("Location", `${safePrefix}${location}`);
        } else {
          try {
            const abs = new URL(location, targetUrls[0] + remainingPath).href;
            responseHeaders.set("Location", `${safePrefix}/${encodeURIComponent(abs)}`);
          } catch (e) {
          }
        }
      }
    }
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    let frontendOrigin = "";
    try {
      frontendOrigin = new URL(targetUrls[0]).origin;
    } catch (e) {
    }
    function rewriteBackendUrls(text) {
      return text.replace(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g, (matched) => {
        const trail = matched.match(/[.,;)]+$/)?.[0] || "";
        const clean = trail ? matched.slice(0, -trail.length) : matched;
        try {
          const u = new URL(clean);
          if (u.origin !== frontendOrigin && u.origin !== proxyOrigin) {
            return proxyOrigin + safePrefix + "/" + clean + trail;
          }
        } catch (e) {
        }
        return matched;
      });
    }
    const contentType = responseHeaders.get("content-type") || "";
    const pathLower = url.pathname.toLowerCase();
    const needsJsonPlayback = finalResponse.status === 200 && contentType.includes("json") && pathLower.includes("playbackinfo");
    const needsSystemInfo = finalResponse.status === 200 && contentType.includes("json") && /\/system\/info(\/public)?$/i.test(pathLower);
    const needsManifest = finalResponse.status === 200 && (pathLower.endsWith(".m3u8") || pathLower.endsWith(".mpd") || contentType.includes("mpegurl") || contentType.includes("dash+xml"));
    const needsHtmlJs = finalResponse.status === 200 && frontendOrigin && (contentType.includes("text/html") || contentType.includes("text/javascript") || contentType.includes("application/javascript"));
    if (needsJsonPlayback || needsSystemInfo || needsManifest || needsHtmlJs) {
      try {
        const bodyText = await finalResponse.text();
        if (needsJsonPlayback) {
          try {
            const data = JSON.parse(bodyText);
            let modified = false;
            if (data && data.MediaSources) {
              data.MediaSources.forEach((source) => {
                ["DirectStreamUrl", "TranscodingUrl"].forEach((key) => {
                  if (source[key] && source[key].startsWith("http") && !source[key].startsWith(proxyOrigin)) {
                    source[key] = proxyOrigin + safePrefix + "/" + source[key];
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
            console.log("PlaybackInfo \u91CD\u5199\u5931\u8D25:", e.message);
          }
        }
        if (needsSystemInfo) {
          try {
            const data = JSON.parse(bodyText);
            let modified = false;
            ["Address", "LocalAddress"].forEach((key) => {
              if (data[key] && data[key].startsWith("http") && !data[key].startsWith(proxyOrigin)) {
                data[key] = proxyOrigin + safePrefix;
                modified = true;
              }
            });
            if (modified) {
              responseHeaders.delete("Content-Length");
              return new Response(JSON.stringify(data), { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
            }
          } catch (e) {
            console.log("System/Info \u91CD\u5199\u5931\u8D25:", e.message);
          }
        }
        if (needsManifest) {
          if (bodyText.includes("http://") || bodyText.includes("https://")) {
            const rewritten = rewriteBackendUrls(bodyText);
            responseHeaders.delete("Content-Length");
            return new Response(rewritten, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
          }
        }
        if (needsHtmlJs) {
          const urls = bodyText.match(/https?:\/\/[^\s"'`<>{}|\\^[\]#,;)]+/g) || [];
          const hasLeakedBackend = urls.some((u) => {
            try {
              const o = new URL(u).origin;
              return o !== frontendOrigin && o !== proxyOrigin;
            } catch (e) {
              return false;
            }
          });
          if (hasLeakedBackend) {
            const rewritten = rewriteBackendUrls(bodyText);
            responseHeaders.delete("Content-Length");
            return new Response(rewritten, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
          }
        }
        responseHeaders.delete("Content-Length");
        return new Response(bodyText, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
      } catch (e) {
        console.log("\u54CD\u5E94\u4F53\u91CD\u5199\u5F02\u5E38:", e.message);
      }
    }
    const isStaticRes = /\.(jpg|jpeg|gif|png|svg|ico|webp|js|css|woff2?|ttf|otf|map|webmanifest|srt|ass|vtt|sub)$/i.test(url.pathname) || /(\/Images\/|\/Icons\/|\/Branding\/|\/emby\/covers\/)/i.test(url.pathname);
    if (isStaticRes && enableCache) {
      responseHeaders.set("Cache-Control", "public, max-age=86400");
      responseHeaders.delete("Expires");
      responseHeaders.delete("Pragma");
    } else {
      responseHeaders.set("Cache-Control", "no-store");
    }
    return new Response(finalResponse.body, { status: finalResponse.status, statusText: finalResponse.statusText, headers: responseHeaders });
  }
};
export {
  index_default as default
};

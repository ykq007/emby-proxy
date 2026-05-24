# Design: Port 5 EMBY_CF Features into worker.js

Scope reference: prd.md
Source file: /home/ykq001/emby-proxy/worker.js (4622 lines)

All admin endpoints in this project live under `/api/...` (already cookie-token gated at lines 3947-3954); keep that convention. PRD references to `/admin/api/...` are renamed to `/api/...` to match existing code.

---

## Cross-cutting: schema migrations

Land all new `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` calls inside the existing init block at worker.js lines 4234-4249 (immediately after the `visitor_logs` ALTER chain). Pattern is already idempotent (try/catch around ALTER).

Additions (exact SQL):

```sql
-- F3 storage (single-row key/value table; reuse for other singletons later)
CREATE TABLE IF NOT EXISTS kv_config (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- F4: optimized CF-friendly domain candidates
CREATE TABLE IF NOT EXISTS optimized_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
    note TEXT DEFAULT '',
    builtin INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- F4: DNS replace configuration (single logical row, id=1)
CREATE TABLE IF NOT EXISTS dns_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    cf_api_token TEXT DEFAULT '',
    cf_zone_id TEXT DEFAULT '',
    cf_record_id TEXT DEFAULT '',
    target_alias TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Seeding: `INSERT OR IGNORE` of the 12 defaults relies on UNIQUE(domain).

Placement: extract the four `CREATE TABLE` + ALTER chains into `async function ensureSchema(env)` near line 3725, and call it once at the top of `fetch()` (right after `const url = new URL(...)` at line 3836) when `env.DB` is bound. Wrap in try/catch.

---

## F1. RESERVED_ALIASES prefix guard

**Reserved alias list**:
```js
const RESERVED_ALIASES = new Set([
    'api', 'admin', '__client_rtt__',
    'login', 'logout',
    'assets', 'static', 'public',
    'health', 'healthz', 'ping', 'status',
    'emby', 'web', 'stats',
    'favicon.ico', 'robots.txt',
    'apple-touch-icon', 'sw.js', 'manifest.json', 'cdn-cgi'
]);
```
Case-insensitive bare-prefix match. Also reject: empty, contains `/?# ` or non-printable, starts with `.`/`_`, length >64.

**Where**: worker.js line 4320, inside POST of `/api/routes`, before INSERT at 4331:
```js
const cleaned = String(data.prefix || '').trim().toLowerCase();
if (!cleaned || RESERVED_ALIASES.has(cleaned) || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(data.prefix.trim())) {
    return Response.json({ success: false, error: `路由别名 "${data.prefix}" 不可用（系统保留或格式非法）` }, { status: 400 });
}
```

Also apply at `/api/routes/import` (line 4217) — collect invalid entries in `result.skipped`.

**Admin UI**: route create/edit at line 2424 — branch on `json.success===false`, show toast with `json.error`. Add a tiny client regex pre-check. In route list render (~line 2269), badge rows whose prefix is in the reserved set as "保留前缀，建议改名".

**Edge cases**: existing rows with reserved aliases are not deleted; only block new/edited rows.

---

## F2. Multi-upstream failover loop

**Current state** (worker.js 4364, 4432-4457): `targetUrls` is already comma-split, the loop already iterates and treats 502/503/504 as failover triggers. Network/timeout errors already escalate via the catch at line 4456. Order is already deterministic. So F2 is polish:

1. **Per-upstream timeout**. Add `MAX_UPSTREAM_TIMEOUT_MS = 15000` near line 3724. Use `AbortController` per iteration; on `AbortError`, treat as upstream failure and continue.

2. **Order of operations** (load-bearing):
   ```
   for each upstream i:
       resp = fetchWithSchemeFallback(...)        // SSL 525/526/530 flip
       if resp.status == 403 and canRetry:
           resp = attempt403Cascade(...)          // header-strip cascade on SAME upstream
       if resp.status in {502,503,504}:           // ONLY here move to next upstream
           continue
       if resp.status in 3xx and host allowlisted:  // F3
           return resp directly
       finalResponse = resp; break
   ```
   403 cascade stays per-upstream. Scheme fallback stays inside `fetchWithSchemeFallback`. Only 5xx-gateway + network/timeout escalates upstream.

3. **Debug header**. Gate by `env.DEBUG_FAILOVER === '1'`. Set `X-Proxy-Upstream-Index` and `X-Proxy-Upstream-Tries` on `responseHeaders` before final `return new Response(...)` around line 4621. Don't leak upstream URLs.

**Edge case — un-replayable body**: when body >8MB (line 4424), `canRetry===false`. If first upstream 5xx's, return that 5xx (do NOT re-fetch with empty body). Document with a code comment.

WebSocket path (4376-4389) already has its own loop. Leave untouched.

---

## F3. MANUAL_REDIRECT_DOMAINS 3xx passthrough

**Default allow-list**:
```js
const DEFAULT_MANUAL_REDIRECT_DOMAINS = [
    // 阿里云盘 / OSS
    'cn-beijing-data.aliyundrive.net',
    'cn-shenzhen-data.aliyundrive.net',
    'alicdn-adrive-cn-data-yk.alicdn.com',
    // 115
    '115.com', '115cdn.com', 'anxia.com',
    // Quark
    'pcs.drive.quark.cn', 'video-pcs.drive.quark.cn',
    // PikPak
    'mypikpak.com', 'mypikpak.net',
    // 通用 OSS / OBS
    'aliyuncs.com', 'myqcloud.com', 'myhuaweicloud.com',
    'cos.ap-shanghai.myqcloud.com'
];
```
Storage: `kv_config` row `k='manual_redirect_domains'`, `v=` newline-separated. Seed on first read if missing. Match is **suffix match** (`host === d || host.endsWith('.' + d)`), case-insensitive.

**API**:
- `GET /api/manual-redirect-domains` → `{ success: true, domains: [...] }`
- `POST /api/manual-redirect-domains` body `{ domains: [...] }` → upsert.

Both gated by existing cookie-token check.

**Proxy core change**: in the 302-handling block (worker.js 4470-4491), before applying prefix-wrap rewrite, check absolute Location host. If matched, skip rewrite — return 3xx with original Location. Module-level cache `let manualRedirectHosts = null`, populated by `ensureSchema`; invalidate on POST.

**Order with F2**: allowlist bypass happens AFTER upstream loop chose `finalResponse`. We do NOT retry to next upstream because of 3xx.

**Edge cases**:
- Relative Location (`/foo`) or scheme-relative (`//host/foo`): resolve to absolute host; if not resolvable, fall through to existing rewrite.
- Multiple hops: not our problem — client follows.

---

## F4. Optimized domains + speedtest → one-click DNS CNAME swap

**12 seed defaults**:
```js
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
```
All `builtin=1, enabled=1`.

**API** (all gated):
- `GET  /api/optimized-domains`
- `POST /api/optimized-domains` `{domain, note}` → builtin=0
- `PATCH /api/optimized-domains/:id` `{enabled?, note?}` (built-ins editable only on enabled/note)
- `DELETE /api/optimized-domains/:id` (non-builtin only)
- `POST /api/optimized-domains/speedtest` `{ids?}` → `[{id,domain,ms,ok}]` sorted asc
- `GET  /api/dns-config` (mask token)
- `POST /api/dns-config` `{cf_api_token, cf_zone_id, cf_record_id, target_alias}`
- `POST /api/dns/replace` `{domain}` → CF API PATCH

**Speedtest helper** near line 3725:
```js
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
    } catch { clearTimeout(t); return { ms: -1, ok: false }; }
}
```
Parallel via `Promise.all` (~12 entries — well under sub-request limit).

**DNS replace flow**: GET CF record to copy `name`, then PUT full body `{type:'CNAME', name, content:domain, ttl:60, proxied:false}`. Return CF's `{success, errors}` verbatim.

**Where**: insert handlers between `/api/get-dns` (line 4104) and `/api/update-dns` (line 4114).

**Admin UI**: new card in `sec-speed` (line 1308) titled "🌟 优选 CDN 域名 + 一键 DNS CNAME". Columns: 域名 / 备注 / 内置 / 启用 / 上次测速 ms / 操作. "全部测速" button. Below: dns_config form (token/zone/record/alias). After speedtest, top `ok===true` rows show "🔄 一键替换 DNS" button, visible only when `dns_config` is fully set.

**Edge cases**:
- Zero enabled domains: empty result, UI prompt.
- CF API rate limit: surface error verbatim, no auto-retry.
- Token storage: D1 plaintext (consistent with project); mask last-4 in GET response.

---

## F5. /api/edge-info

**Current state**: `/api/trace` (line 3874) already returns entry/egress COLO; dashboard chips at lines 2757-2789 already highlight on mismatch. **F5 is 90% done.**

Plan: add `/api/edge-info` as an alias of `/api/trace` (do not delete `/api/trace`). Response includes a `cacheKey` built from SHA-1 over `${entryColo}:${egressColo}:${Math.floor(Date.now()/300000)}`, truncated to 16 hex chars.

Swap admin fetch at line 2759 from `/api/trace` to `/api/edge-info`. Add `cacheKey` to tooltip.

Auth: gated by existing cookie-token (PRD open question resolved: yes).

---

## Files touched summary

Single file: `/home/ykq001/emby-proxy/worker.js`.

| Block | Approx. lines | Purpose |
|---|---|---|
| Module top (~3722) | new helpers + consts | `ensureSchema`, `probeDomain`, `RESERVED_ALIASES`, defaults, caches, timeout const |
| `fetch()` top (3836) | call `ensureSchema(env)` once | migrations + seeds |
| 3874 | `/api/edge-info` handler | F5 |
| 4104-4140 | new endpoint handlers | F3 + F4 |
| 4217 (routes import) | F1 validation | F1 |
| 4320 (route POST) | F1 validation | F1 |
| 4432-4459 (proxy loop) | timeout + debug header + F3 branch | F2, F3 |
| 4470-4491 (302 wrap) | F3 allowlist branch | F3 |
| 1308 sec-speed HTML | new card | F4 UI |
| 2424 (route POST UI) | branch on success:false | F1 UI |
| 2759 (fetchCfTrace) | swap to /api/edge-info | F5 UI |
| 2269 (route row render) | reserved-prefix badge | F1 UI |

---

## Open questions resolved
- MANUAL_REDIRECT_DOMAINS defaults: 14 entries listed in F3.
- Reserved alias list: see F1 set.
- Speedtest endpoint auth: gated.

## Acceptance-criteria mapping
- AC1 → F1 server validation + UI toast
- AC2 → F2 loop + timeout
- AC3 → F3 allowlist branch
- AC4 → F4 schema + seed + endpoints + UI
- AC5 → F5 `/api/edge-info` + chip
- AC6 → smoke checks in implement.md
- AC7 → all SQL is `CREATE TABLE IF NOT EXISTS` + `INSERT OR IGNORE` + try/catch ALTER

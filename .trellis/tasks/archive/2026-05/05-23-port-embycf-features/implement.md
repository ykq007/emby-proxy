# Implementation Plan: Port 5 EMBY_CF Features

Pair file: design.md. All work in `/home/ykq001/emby-proxy/worker.js`.

## Ordering rationale
**F5 → F1 → F2 → F3 → F4**.
- F5 smallest (single endpoint alias + one fetch URL swap).
- F1 pure server-side validation.
- F2 in-place loop polish — do before adding F3 branch in same area.
- F3 redirect allowlist branch — sits adjacent to F2 changes.
- F4 last (biggest: new tables, 7 endpoints, admin UI).

Each feature is its own commit.

## Step 0 — Shared schema bootstrap (before F1)

- [ ] Extract the four `CREATE TABLE IF NOT EXISTS` + try/catch `ALTER TABLE` block at lines 4234-4249 into `async function ensureSchema(env)` near line 3725.
- [ ] Append new `CREATE TABLE IF NOT EXISTS` for `kv_config`, `optimized_domains`, `dns_config` (SQL in design.md).
- [ ] Append seed: `INSERT OR IGNORE INTO optimized_domains (domain, note, builtin) VALUES (?, ?, 1)` for each of 12 defaults.
- [ ] Call `ensureSchema(env).catch(()=>{})` near line 3837 (after `const url = new URL(request.url);`), guarded by `if (env.DB)`.
- [ ] Leave existing in-handler block at 4234-4249 as fallback (avoid risk if ensureSchema throws). Cleanup deferred.

Validate (manual, in `wrangler dev` or deploy):
- [ ] `.tables` shows new three tables.
- [ ] `SELECT COUNT(*) FROM optimized_domains` → 12.
- [ ] Re-deploy: counts and schema unchanged (idempotent).

## Step 1 — F5: `/api/edge-info`

Backend:
- [ ] Add handler near line 3874 (after `/api/trace`). Reuse `request.cf` + `1.1.1.1/cdn-cgi/trace` logic; add `cacheKey` = first 16 hex of SHA-1 over `${entryColo}:${egressColo}:${Math.floor(Date.now()/300000)}`.
- [ ] Keep `/api/trace` untouched.

Admin UI:
- [ ] Line 2759: change `fetch('/api/trace')` → `fetch('/api/edge-info')`.
- [ ] Extend `trace-egress` tooltip to include `cacheKey`.

Validate:
- [ ] Admin panel chips render entry/egress.
- [ ] `curl -H 'Cookie: admin_token=...' https://<worker>/api/edge-info` returns expected JSON.

Gate: no regression of `/api/trace`.

## Step 2 — F1: RESERVED_ALIASES guard

Backend:
- [ ] Add `RESERVED_ALIASES` Set near line 3724.
- [ ] `/api/routes` POST (line 4320), before INSERT at 4331: validate `data.prefix`; 400 with `{success:false, error}` on failure.
- [ ] `/api/routes/import` (line 4217): filter invalid, return `result.skipped:[{prefix, reason}]`.

Admin UI:
- [ ] Line 2424: branch on `json.success===false` → toast `json.error`, keep dialog open.
- [ ] Lightweight client regex pre-check on submit handler.
- [ ] Route list render (~line 2269): badge reserved-prefix rows.

Validate:
- [ ] Create alias `admin` / `api` / `stats` → blocked.
- [ ] Create alias `movies` → succeeds.
- [ ] Import JSON with valid+reserved → reserved listed in `skipped`.

Gate: existing routes still proxy.

## Step 3 — F2: failover loop polish

Backend:
- [ ] Add `MAX_UPSTREAM_TIMEOUT_MS = 15000` near line 3724.
- [ ] In proxy loop (4432-4457):
  - [ ] `AbortController` per iteration; pass `signal` into `fetchInit`.
  - [ ] On `AbortError`, `continue`.
  - [ ] If `env.DEBUG_FAILOVER === '1'`, set `X-Proxy-Upstream-Index` + `X-Proxy-Upstream-Tries` before final `return new Response(...)` ~line 4621.

Validate:
- [ ] Route `https://unreachable.invalid,https://real-emby.example` → second serves.
- [ ] `DEBUG_FAILOVER=1` → debug headers present.
- [ ] 403 cascade still triggers on 403 (does not escalate upstream).

Gate: single-upstream routes unchanged.

## Step 4 — F3: MANUAL_REDIRECT_DOMAINS passthrough

Backend:
- [ ] Add `DEFAULT_MANUAL_REDIRECT_DOMAINS` const + module-level cache `manualRedirectHosts` near line 3724.
- [ ] In `ensureSchema`: seed `kv_config` row `k='manual_redirect_domains'` if missing.
- [ ] Lazy-init `manualRedirectHosts` (lowercased Set).
- [ ] `GET /api/manual-redirect-domains` + `POST /api/manual-redirect-domains` near line 4112. POST invalidates cache.

Proxy core (line 4470, 302 block):
```js
if ([301,302,303,307,308].includes(finalResponse.status)) {
    const loc = responseHeaders.get('Location');
    let absHost = null;
    try {
        if (/^https?:\/\//i.test(loc)) absHost = new URL(loc).host.toLowerCase();
        else if (loc.startsWith('//')) absHost = new URL(new URL(request.url).protocol + loc).host.toLowerCase();
    } catch {}
    if (absHost && hostMatchesAllowlist(absHost, manualRedirectHosts)) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(null, { status: finalResponse.status, headers: responseHeaders });
    }
    // else: existing rewrite logic
}
```
- [ ] Define `hostMatchesAllowlist(host, set)`: `set.has(host) || some d => host.endsWith('.' + d)`.

Admin UI:
- [ ] New panel under `data-section="settings"` (or sec-speed): textarea bound to `/api/manual-redirect-domains`, one host per line, save button.

Validate:
- [ ] 302 to `https://cn-beijing-data.aliyundrive.net/...` → client sees 302 unchanged.
- [ ] 302 to `https://random-host.example/...` → existing rewrite applied.
- [ ] Remove `aliyundrive.net` from list → that host now wrapped.

Gate: F2 + F3 compose: multi-upstream + 503 first → failover → 302 to allowlisted host → passthrough.

## Step 5 — F4: optimized domains + DNS replace

Backend handlers (near line 4112, before `/api/update-dns`):
- [ ] `GET /api/optimized-domains`
- [ ] `POST /api/optimized-domains`
- [ ] `PATCH /api/optimized-domains/:id`
- [ ] `DELETE /api/optimized-domains/:id`
- [ ] `POST /api/optimized-domains/speedtest`
- [ ] `GET /api/dns-config` (mask token)
- [ ] `POST /api/dns-config` (INSERT OR REPLACE id=1)
- [ ] `POST /api/dns/replace` (CF API GET-then-PUT)

Helpers:
- [ ] `async function probeDomain(domain)` near line 3725 (HEAD + AbortController 4s + 5xx→fail).

Admin UI in `sec-speed` (~line 1308):
- [ ] Card "🌟 优选 CDN 域名 + 一键 DNS CNAME": table (域名/备注/内置/启用/上次测速/操作) + "全部测速" + "+ 添加自定义".
- [ ] Card "DNS 替换配置": four inputs (token/zone/record/alias) + save.
- [ ] After speedtest, top `ok===true` rows show "🔄 一键替换 DNS" — visible only when dns_config is fully set.

Validate:
- [ ] Fresh deploy → 12 builtin rows listed.
- [ ] Add custom row → appears `builtin=0`.
- [ ] "全部测速" → rows sort by ms.
- [ ] Save DNS config with real CF token → "一键替换 DNS" appears.
- [ ] Click → CF record content updates (verify in CF dashboard).
- [ ] Disable builtin → next speedtest skips it.
- [ ] Delete builtin → blocked.

Gate: existing speedtest UI (~line 2646) untouched.

## Smoke-test checklist (AC6 — after every commit)

Manual:
- [ ] Login with admin cookie.
- [ ] `/api/routes` GET returns expected rows.
- [ ] Create normal route, proxy a request → 200.
- [ ] `PlaybackInfo` endpoint rewrite: `DirectStreamUrl` wrapped with proxy prefix.
- [ ] `/api/analytics` returns stats.
- [ ] TG stats path trusted (unchanged code).
- [ ] `/api/deploy` self-update endpoint loads (don't trigger).

## Rollback points

Each feature is a self-contained commit.
- F5 revert: UI falls back to /api/trace.
- F1 revert: validation removed; no data loss.
- F2 revert: loop reverts to pre-timeout.
- F3 revert: 302 → prefix-wrap. `kv_config` table harmless to leave.
- F4 revert: tables `optimized_domains`/`dns_config` remain (harmless or drop manually). **CF DNS record changes are NOT auto-reverted** — operator must manually re-point.

## Review gates between features

After each commit:
1. Hard refresh admin panel.
2. Re-run smoke checklist.
3. Tail Worker logs for exceptions in `ensureSchema` or new endpoints.
4. Then proceed to next feature.

# PRD: Port 5 EMBY_CF Features into worker.js

## Background
Comparison between this project (`worker.js`, ~4622 lines) and the public reference `Dirige/EMBY_CF` (v3.3, ~1700 lines) identified 5 capabilities the reference handles better. Port them into our worker without regressing existing features (TG bot, GraphQL stats, self-update, PlaybackInfo/M3U8 rewrite, 403 cascade, scheme fallback, backend_url, admin sidebar dashboard, etc.).

## Scope — 5 features to port

### F1. RESERVED_ALIASES prefix guard
- Reject creating/updating a route whose alias collides with reserved system prefixes (`admin`, `api`, `stats`, `health`, `emby`, `web`, `assets`, `login`, `logout`, plus anything already used by our handlers).
- Validation runs server-side in the route create/update endpoint AND surfaces a clean error in the admin UI.

### F2. Multi-upstream failover loop
- `routes.target` already accepts comma-separated URLs. Today proxy core uses only one. Change behavior: on `502/503/504` (and network error / timeout), iterate to the next upstream in the list. Keep order deterministic; do not shuffle.
- Must coexist with existing 403 cascade and scheme fallback (compose, do not duplicate).
- Cap retries at `len(upstreams)`; optional debug header when admin debug flag is on.

### F3. MANUAL_REDIRECT_DOMAINS 3xx passthrough
- Configurable allow-list of upstream hostnames (seed from the reference's defaults for aliyundrive / 115 / quark / pikpak CDNs).
- When upstream returns 3xx with a `Location` whose host matches the allow-list, pass the redirect directly to the client (do NOT re-proxy / rewrite). Otherwise existing rewrite behavior applies.
- List editable via admin UI (new section under 反代核心 or 安全中心).

### F4. Optimized-domains table + speedtest → one-click DNS CNAME swap
- New D1 tables: `optimized_domains` (id, domain, note, builtin, enabled, created_at) and `dns_config` (cf_api_token, cf_zone_id, cf_record_id, target_alias, updated_at).
- Seed 12 default CF-friendly domains on first boot (port from reference).
- Edge-side speedtest endpoint (HEAD, `redirect:'manual'`, treat 5xx as fail).
- New admin endpoint `POST /admin/api/dns/replace` that updates the configured CF DNS record's content to the chosen best domain via CF API.
- UI: 测速结果旁出现 "🔄 一键替换 DNS" 按钮，仅在配置了 DNS 且有候选域名时显示。

### F5. /api/edge-info endpoint + admin display
- Server endpoint returning entry COLO (from request CF object) + egress COLO (via fetch to `https://1.1.1.1/cdn-cgi/trace` from within worker) + a stable cacheKey.
- Admin dashboard 顶部 chip 显示 "入口 XXX → 出口 YYY"，当两者不同时高亮（提示跨 COLO 转发）。

## Non-goals
- Not rewriting the proxy core architecture.
- Not removing or changing existing features.
- Not changing auth model.

## Acceptance Criteria
- [ ] AC1: Creating a route with alias `admin` / `api` / `stats` / `health` / `emby` / `web` returns 4xx with a clear error; admin UI surfaces it.
- [ ] AC2: With route `https://a,https://b`, if `a` returns 503, request is transparently retried against `b` and client sees `b`'s 200. Cap = upstream count.
- [ ] AC3: Upstream `302 Location: https://<allowlisted-host>/...` passes through to client unchanged; non-allowlisted host keeps existing rewrite behavior.
- [ ] AC4: Fresh deploy auto-seeds 12 optimized domains. Admin UI lists them with enable/disable/edit/add. After configuring CF token+zone+record, "一键替换 DNS" updates the record content; UI shows success/failure.
- [ ] AC5: `/api/edge-info` (admin-auth gated) returns `{entryColo, egressColo, cacheKey}`. Admin chip shows both, highlighted when differing.
- [ ] AC6: All existing features still work — smoke: login, route CRUD, proxy a normal route, PlaybackInfo rewrite path unaffected, TG stats endpoint, self-update endpoint untouched.
- [ ] AC7: Schema migration is additive and idempotent (matches existing `ALTER TABLE ... ADD COLUMN` style or try/catch). No destructive change to existing tables.

## Open questions (resolve in design.md)
- Exact final list of `MANUAL_REDIRECT_DOMAINS` defaults.
- Reserved alias list — collect by grepping our handler routes.
- Whether edge speedtest endpoint requires admin auth (likely yes).

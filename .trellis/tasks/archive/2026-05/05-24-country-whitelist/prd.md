# PRD — Country Whitelist for Reverse Proxy

## Goal

Restrict the reverse-proxy traffic served by this Worker to clients whose
`cf-ipcountry` is in an admin-configurable allowlist. Non-allowed countries
receive `403`. Public status surfaces (`/status`, share pages) and admin /
control-plane endpoints remain reachable from any country.

## User value

- Operator can constrain costly upstream traffic (Emby reverse-proxy) to the
  intended user geography (e.g. CN-only) without losing observability:
  the public status page and remote admin still work globally.

## Confirmed facts (from code inspection)

- `worker.js` single-file Worker; entry `export default { fetch }` at L7199.
- Proxy route lookup by first path segment `prefix` against `routes` table
  occurs at L8136–L8160. Only requests whose `prefix` matches a row in
  `routes` enter the reverse-proxy branch.
- Public `/status` GET handler at L7348 is matched before the proxy branch
  and reads from D1 directly.
- D1 `kv_config(k TEXT PK, v TEXT, updated_at)` already exists and is the
  pattern used for global flags (e.g. `status_hide_node_names` at L7352).
- Existing admin global-flags API pair at L7954/L7960 — natural place to
  add the new fields.
- `cf-ipcountry` is already available on every request (used at L8218 for
  visitor logging).

## Requirements

1. **Gate location**: country check runs *inside* the proxy-matched branch
   (after the `routes` row is found, before media-counts persistence and
   the upstream fetch). Requests that never match a proxy prefix
   (`/status`, `/api/*`, `/public/*`, `/card/*`, root, etc.) are therefore
   exempt without explicit allow-list logic.
2. **Allowlist storage**: global, single allowlist stored as a
   comma-separated `cf-ipcountry`-style ISO-2 list in `kv_config` under a
   new key (e.g. `proxy_country_allowlist`). Empty / unset value means
   feature disabled (allow all).
3. **Admin UI**: extend the existing "全局开关" section that owns
   `status_hide_node_names`; add a plain comma-separated text input for
   the country list (`<input type="text">` with placeholder hint
   `例：CN,HK,TW（留空=关闭）`) and wire it to `/api/status/global-flags`
   GET/POST. ISO-2 codes, case-insensitive on save (normalize to upper).
4. **Block response**: `403` with a short plain-text body (e.g.
   `Forbidden: country not allowed`). No upstream call made.
   **Fail-closed**: when the allowlist is non-empty and `cf-ipcountry` is
   missing or `"XX"`, treat as not-in-list and block.
5. **Special path forms**: the direct URL passthrough form `/http://...`
   and `/https://...` (L8145) is also part of the reverse-proxy surface
   and MUST be gated when the allowlist is active.
6. **Observability**: blocked requests should not pollute `request_stats`
   or `visitor_logs` (they never reach the existing logging block, which
   is downstream of the gate — confirm in implementation).

## Acceptance criteria

- AC1: With `proxy_country_allowlist = "CN"`, a request to `/embytest/...`
  from `cf-ipcountry: US` returns `403` and no upstream fetch is made.
- AC2: Same setup, request from `cf-ipcountry: CN` proxies normally.
- AC3: `/status` returns 200 from any country regardless of allowlist
  value.
- AC4: Admin endpoints (`/api/status/global-flags`, `/api/routes`, …)
  return their normal responses from any country.
- AC5: Empty / unset allowlist disables the gate (current behavior — all
  countries allowed).
- AC6: Admin UI exposes the allowlist field next to the existing global
  toggles; saving persists via the existing global-flags POST endpoint.

## Out of scope

- Per-route country allowlists (single global list only for v1).
- Blocklist mode (we only do allowlist).
- IP-based or ASN-based filtering.

## Open questions

(none — all planning questions resolved)

## Decisions log

- Fail-closed on missing/`XX` `cf-ipcountry` when allowlist is active.
- Admin UI: single comma-separated text input (no chips, no presets).
- No "blocked today" counter in v1 — operators verify via VPN/spot-check.

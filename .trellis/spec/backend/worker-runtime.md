# Worker Runtime Guidelines

Patterns specific to the Cloudflare Worker runtime that powers `worker.js`. Add new entries here when a runtime gotcha or convention is discovered.

---

## Scenario: scheduled() must discriminate by event.cron

### 1. Scope / Trigger

This worker may register **more than one cron trigger** in the Cloudflare dashboard (e.g., a daily `0 0 * * *` for Telegram digests AND a minute `* * * * *` for health probes). All triggers invoke the same `scheduled(event, env, ctx)` export. Without discrimination, every action runs on every cadence.

### 2. Signatures

```js
// Cloudflare Workers scheduled handler
async scheduled(event, env, ctx) { /* ... */ }

// event shape (relevant fields):
// {
//   cron: string,           // "* * * * *", "0 0 * * *", etc.
//   scheduledTime: number   // epoch ms of the tick
// }
```

### 3. Contracts

- `event.cron` is the exact cron expression string registered in the dashboard.
- The handler runs once per matched trigger per scheduled time.
- All actions must use `ctx.waitUntil(...)` to extend the lifetime past the handler return.

### 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Multiple cron triggers registered | Each branch in `scheduled()` MUST gate on `event.cron` before invoking expensive or user-visible side effects |
| User-visible side effect (TG, email, push) | MUST only fire on the cadence intended by the operator |
| Cheap idempotent maintenance (probe, prune, cache warm) | MAY fire unconditionally; document it as such |

### 5. Good / Base / Bad cases

- **Good**: `if (cronExpr === '0 0 * * *') ctx.waitUntil(sendDigest(env))` — explicit cadence binding.
- **Base**: `if (cronExpr !== '* * * * *') ctx.waitUntil(sendDigest(env))` — allowlist-by-exclusion. Acceptable when only one user-visible cadence exists.
- **Bad**: `ctx.waitUntil(sendDigest(env))` — fires on every registered cron. If a minute cron is later added for any reason, this spams users.

### 6. Tests Required

Manual post-deploy verification:

- Register both crons in the dashboard. Confirm via `wrangler tail` that the minute cron's `console.log` shows ONLY the intended minute-cadence work; the daily cron's tick shows BOTH the minute work AND the daily work.
- Toggle off the minute cron and confirm the daily cadence is unaffected.

### 7. Wrong vs Correct

#### Wrong

```js
async scheduled(event, env, ctx) {
    if (env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
        ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
    }
}
```

Adding a minute cron later causes a TG message every minute.

#### Correct

```js
async scheduled(event, env, ctx) {
    const cronExpr = (event && event.cron) || '';
    const isMinutely = cronExpr === '* * * * *';

    // Cheap + idempotent: any cron tick may run it.
    if (env.DB) ctx.waitUntil(probeAllAndStore(env));

    // User-visible: gate to non-minute cadences.
    if (!isMinutely && env.TG_BOT_TOKEN && env.TG_CHAT_ID && env.DB) {
        ctx.waitUntil(sendTgStats(env, env.TG_CHAT_ID));
    }
}
```

---

## Scenario: Public render paths use field allowlists, not blocklists

### 1. Scope / Trigger

Anything reachable without admin auth (`/status`, `/public/<token>`, `/card/<token>.svg`, and any future public surface) MUST source data via a function that lists every field it reads. Do not "render whatever's on the route row" and then try to redact sensitive fields.

### 2. Why

Routes table aggregates a mix of public (display name, icon, sort order) and private (`target`, `custom_headers`, `emby_auth_cache`, operator IPs) fields. As features get added, new private columns will land in the same table. A blocklist of "do not render X" silently fails the next time someone adds column Y. An allowlist of "only read these N columns" forces a deliberate review when a new field becomes public.

### 3. Pattern

```js
// Public renderer's data loader. The SELECT itself is the allowlist.
async function loadStatusData(env, opts) {
    const { results: routes } = await env.DB.prepare(`
        SELECT prefix, public_alias, remark, icon, sort_order, media_counts_auto_auth
          FROM routes WHERE show_on_status = 1
    `).all();
    // ...assemble cards from this whitelist of columns only.
}
```

Forbidden inside any public render path:

- `SELECT *` from routes / any table that may grow private columns.
- Reading `kv_config`, `dns_config`, `optimized_domains`, `visitor_logs`, or anything in the admin sphere.
- Dereferencing `routes.target`, `routes.custom_headers`, `routes.emby_auth_cache`, `routes.backend_url`.

### 4. Code review gate

When reviewing a PR that touches a public render path, the reviewer's first question is: "Show me the SELECT. What columns does it read?" If the answer is `SELECT *` or "we read everything and filter in JS", that's a blocker. The SELECT itself is the allowlist contract; nothing else.

---

## Scenario: At-rest encryption for harvested secrets

### 1. Scope / Trigger

When the Worker passively captures user-supplied secrets (e.g. Emby bearer tokens harvested from proxied traffic) and persists them in D1 for later use by background tasks, plaintext at rest is unacceptable — a D1 dump or admin readout must not yield raw secrets.

### 2. Pattern: HKDF from `env.ADMIN_TOKEN`

```js
async function tokenKey(env, recordId) {
    const ikm = new TextEncoder().encode(String(env.ADMIN_TOKEN || ''));
    const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
    return await crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256',
          salt: new TextEncoder().encode(String(recordId || '')),  // per-record salt
          info: new TextEncoder().encode('emby-proxy:<purpose>') },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
}
```

### 3. Contracts

- **Key source**: `env.ADMIN_TOKEN` (already required by this Worker). No new env var.
- **Salt**: per-record identifier (e.g. `route.prefix`). Forces a unique derived key per record so a bulk dump cannot be brute-forced once for all rows.
- **Info**: namespace string (`'emby-proxy:<purpose>'`) so the same ADMIN_TOKEN can serve multiple unrelated purposes without colliding.
- **Storage format**: `b64(iv:12) + '.' + b64(ciphertext+tag)`. Fresh random IV per encrypt via `crypto.getRandomValues`.
- **Decrypt failure handling**: return `null`. **Never throw.** Caller treats null as "no token" and self-heals (re-harvest, re-issue, etc.). This makes ADMIN_TOKEN rotation safe — old ciphertext just becomes unreadable, not crash-inducing.

### 4. Wrong vs Correct

#### Wrong

```js
// Plaintext at rest.
await env.DB.prepare(`UPDATE routes SET secret_cache = ? WHERE prefix = ?`).bind(token, prefix).run();
```

#### Wrong

```js
// Single key derived from a constant string, no per-record salt.
// A single CPU-bound break compromises every row.
const key = await deriveKey('some-constant', '');
```

#### Correct

```js
const key = await tokenKey(env, route.prefix);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
const blob = b64encode(iv) + '.' + b64encode(new Uint8Array(ct));
await env.DB.prepare(`UPDATE routes SET secret_cache = ? WHERE prefix = ?`).bind(blob, route.prefix).run();
```

### 5. Verification

```bash
# After enabling the feature and a proxied request lands, confirm no plaintext:
wrangler d1 execute <DB> --remote --command \
  "SELECT prefix, length(secret_cache), substr(secret_cache, 1, 5) FROM routes WHERE secret_cache != ''"
# Expected: the substr is a short base64 prefix, NOT the raw token.
```

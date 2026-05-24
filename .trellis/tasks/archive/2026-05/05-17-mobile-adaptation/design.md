# Design: Mobile Adaptation for admin panel

## Approach
Adapt the existing `CSS_COMMON` style block inside `worker.js` plus the `LOGIN_UI` markup to follow iOS-native mobile conventions. The desktop DOM structure is preserved; only CSS and a small amount of `LOGIN_UI` HTML change. This keeps the diff focused and avoids breaking the existing JS hooks that bind to current ids/classes.

## File touch list
- `worker.js`
  - `CSS_COMMON` (line 14): expand the mobile `@media` block, add a phone `@media (max-width: 480px)` block, and add bottom-sheet keyframes/utility classes that target the modal containers used today.
  - `LOGIN_UI` (line 135): add gradient ornaments, uppercase eyebrow label, large title, and section label so it matches the prototype while keeping `login()` JS and `tokenInput` id intact.

## CSS structure to add (inside `CSS_COMMON`)

```
@keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

/* ===== Mobile refinement (<=768px) ===== */
@media (max-width: 768px) {
  body { padding: 12px; padding-bottom: max(env(safe-area-inset-bottom), 12px); }

  /* iOS-style modal → bottom sheet */
  .modal { /* the generic modal class used by #dashboardModal/#nodeFormModal/etc. */
    align-items: flex-end !important;     /* anchor to bottom of viewport */
    padding: 0 !important;
  }
  .modal > .card,
  .modal > .modal-content,
  .modal-sheet {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 92vh;
    border-radius: 18px 18px 0 0 !important;
    margin: 0 !important;
    padding: 0 16px 24px !important;
    animation: sheet-up 0.28s cubic-bezier(.32,.72,.3,1);
    overflow-y: auto;
    position: relative;
  }
  .modal > .card::before,
  .modal > .modal-content::before,
  .modal-sheet::before {
    content: ''; display: block; width: 36px; height: 5px; border-radius: 3px;
    background: var(--border); margin: 8px auto 14px;
  }

  /* iOS Settings form rows */
  .form-row, .info-row {
    min-height: 44px; display: flex; align-items: center;
    padding: 10px 0; border-bottom: 0.5px solid var(--border);
    gap: 12px;
  }
  .form-row > label { min-width: 80px; font-weight: 500; color: var(--text); flex-shrink: 0; }
  .form-row > input, .form-row > select {
    border: none !important; background: transparent !important;
    text-align: right; flex: 1; padding: 8px 0 !important;
    font-size: 15px;
  }

  /* Sticky bottom save bar */
  .sticky-save {
    position: sticky; bottom: 0; left: 0; right: 0;
    padding: 12px 0 max(env(safe-area-inset-bottom), 16px);
    background: linear-gradient(180deg, transparent, var(--card) 30%);
  }
  .sticky-save .btn-submit { width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; }

  /* Buttons & toolbar */
  .btn-submit, .btn-edit, .btn-del, .btn-dns { min-height: 44px; }
  .icon-btn { width: 36px; height: 36px; }
  .toolbar { gap: 8px; }

  /* Status pills strip (CF Trace / mode / RTT collapse) */
  .mobile-pill-strip { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 8px; }
  .mobile-pill-strip > * { white-space: nowrap; flex-shrink: 0; }
}

/* ===== Phone (<=480px) ===== */
@media (max-width: 480px) {
  .header h1 { font-size: 20px; }
  .card { padding: 14px; }
  .node-grid { gap: 12px; }
  .toolbar > .btn-submit { width: 100%; }
}
```

## Bottom-sheet selector strategy
The codebase exposes modals through ad-hoc inline styles (`position: fixed`, `display: flex`) without a single shared `.modal` class. To avoid grepping/patching every modal id individually, the implement step will:
1. Identify the modal containers (`#dashboardModal`, `#nodeFormModal`, `#dnsModal`, `#cnameTestModal`, `#iconPickerModal`, etc.) by scanning `HTML_UI`.
2. Either (a) add a shared class like `app-modal` to each in `HTML_UI`, or (b) target them by id list in the CSS. Option (a) is cleaner; pick that.
3. Inner content cards inside those modals will receive a shared `app-sheet` class so the CSS can radius/animate them safely.

## Login page changes (HTML side)
Wrap the login-box children in a Section-style layout:
```
<div class="login-box">
  <div class="login-eyebrow">反代核心 · 安全中心</div>
  <h2>欢迎回来</h2>
  <p class="login-sub">输入管理员密钥继续。</p>
  <!-- existing input + button -->
  <div class="login-foot">v2.0.x · Cloudflare Worker</div>
</div>
```
And add CSS for `.login-eyebrow`, `.login-sub`, `.login-foot`, and two radial-gradient pseudo-elements on `body` (mobile-only). Existing `tokenInput` id and `login()` JS stay untouched.

## Risk / rollback
- All changes are additive CSS or HTML structure inside existing template strings; rollback = `git checkout worker.js`.
- JS bindings rely on `id`/element selectors that are preserved.
- No new dependencies, no new endpoints.

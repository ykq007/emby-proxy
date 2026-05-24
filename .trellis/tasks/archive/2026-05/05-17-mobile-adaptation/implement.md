# Implement: Mobile Adaptation for admin panel

## Ordered checklist

1. **Inventory existing modal containers in `HTML_UI`**
   - Grep `worker.js` for `id="...Modal"` and `position: ?fixed` inline styles.
   - Record the modal element ids; confirm each has a top-level wrapper + inner card.

2. **Inject shared classes**
   - Add `app-modal` to each modal wrapper element in `HTML_UI`.
   - Add `app-sheet` to the inner content card of each modal.
   - Keep all existing classes intact (do not remove `.card`, etc.).

3. **Extend `CSS_COMMON` with mobile rules**
   - Add `@keyframes sheet-up`.
   - Inside the existing `@media (max-width: 768px)` block, append:
     - `.app-modal { align-items: flex-end !important; padding: 0 !important; }`
     - `.app-sheet { width:100% !important; max-width:100% !important; max-height:92vh; border-radius: 18px 18px 0 0 !important; margin:0 !important; padding:16px 16px 24px !important; animation: sheet-up .28s cubic-bezier(.32,.72,.3,1); overflow-y:auto; }`
     - `.app-sheet::before { /* drag handle */ }`
     - Form-row iOS-Settings rules.
     - `.sticky-save` rules.
     - Min-height for tap targets.
     - `.mobile-pill-strip` overflow-x rules.
   - Add new `@media (max-width: 480px)` block with phone-only refinements.

4. **Refine login page (`LOGIN_UI`)**
   - Replace the inner `.login-box` content with eyebrow + h2 + sub + input + button + foot.
   - Add CSS for eyebrow / sub / foot.
   - Add radial-gradient ornaments via `body::before` / `body::after` (mobile-only).
   - Verify `tokenInput` id and `login()` JS are unchanged.

5. **Header strip mobile collapse**
   - In `HTML_UI`, wrap the existing top trace/mode/title strip elements so the redundant labels can be hidden on phone via `display:none` rules inside the mobile `@media`.
   - Keep desktop behavior intact.

6. **Deploy-form sticky save**
   - Identify the deploy modal's save button container; add class `sticky-save` so the mobile CSS pins it.

7. **Smoke-test viewport**
   - Boot worker locally (or just open `worker.js` markup via curl to a dev wrangler if available); otherwise render the HTML string in a static html file to inspect at 390×844 and 768×1024.
   - If `wrangler dev` is not configured, document this in the check note and rely on CSS review.

## Validation commands
- `grep -nE 'app-modal|app-sheet|sheet-up|sticky-save|mobile-pill-strip' worker.js` — confirm new classes inserted.
- `grep -nE '@media \(max-width: (480|768)px\)' worker.js` — confirm two breakpoints.
- `node -e "const s=require('fs').readFileSync('worker.js','utf8'); /* basic sanity: template literals still closed */"` to ensure no broken backticks.
- Manual: open the served HTML in browser devtools mobile preview at 390×844.

## Review gates
- After step 3 (CSS done): re-read CSS for selector correctness; ensure no `!important` collisions with desktop rules.
- After step 4 (login): paste login HTML into a scratch file to confirm structure renders.
- Before commit: run `git diff --stat worker.js` — diff should be additive CSS + a handful of class attributes; no JS logic touched.

## Rollback points
- Each step is a separate edit; revert with `git checkout worker.js` at any time.
- No DB / persistence implications.

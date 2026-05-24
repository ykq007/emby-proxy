# Quality Guidelines

> Code quality standards for frontend development.

---

## Embedded Worker UI Templates

### Convention: Escape nested client-side template literals

**What**: `worker.js` embeds HTML and client JavaScript inside outer JavaScript template literals such as `HTML_UI`. Any client-side template literal that must run in the browser must escape runtime interpolations in source as `\${...}`.

**Why**: Unescaped `${...}` inside the outer template is evaluated when the Worker module loads. This can crash the Worker before it handles requests, even if `node --check` passes syntax validation.

**Example**:
```javascript
// Wrong: evaluated while building HTML_UI; r is not defined at module load.
const HTML_UI = `
<script>
container.innerHTML += `<div data-prefix="${r.prefix}"></div>`;
</script>`;

// Correct: delivered HTML contains ${r.prefix}, and the browser evaluates it later.
const HTML_UI = `
<script>
container.innerHTML += \`<div data-prefix="\${r.prefix}"></div>\`;
</script>`;
```

**Required validation**:
- Run syntax validation: `node --input-type=module --check < worker.js`.
- Run module evaluation: `node --input-type=module -e "await import('file://' + process.cwd() + '/worker.js')"`.
- Fetch authenticated `/` from a local Worker harness and verify delivered HTML contains browser-side markers like `${r.prefix}` without source backslashes.

### Good/Base/Bad cases

- Good: Source uses `\${r.prefix}` inside `HTML_UI`; delivered HTML contains `${r.prefix}`; module import passes.
- Base: Static HTML/CSS changes do not introduce nested browser template literals.
- Bad: Source uses `${r.prefix}` directly inside `HTML_UI`; `node --check` passes but module import fails with `ReferenceError`.

---

## Mobile-Only CSS Overrides vs JS-Driven `style.display`

### Convention: Guard `display: ... !important` against inline-style toggles

**What**: The admin panel uses inline `style.display = 'block' | 'none'` (via plain JS) to open and close `#dashboardModal` (and similar elements). A mobile CSS rule that sets `#dashboardModal { display: flex !important }` will fight `closeDashboard()`'s `style.display = 'none'` and leave the modal visible.

**Why**: `!important` declarations in a stylesheet beat non-`!important` inline styles. The only way to keep the JS open/close path working while also reshaping the modal on mobile is to use a higher-specificity selector that re-asserts the closed state.

**Pattern**: pair the mobile rule with an attribute-selector guard that covers both inline-style serializations:

```css
@media (max-width: 768px) {
  #dashboardModal { display: flex !important; align-items: flex-end !important; }
  /* Restore closed state when JS sets style.display = 'none' (with or without space) */
  #dashboardModal[style*="display:none"],
  #dashboardModal[style*="display: none"] { display: none !important; }
}
```

The attribute-selector form has higher specificity (0,1,1,0 vs 0,1,0,0), so it wins regardless of source order. Cover both `display:none` (template-literal source) and `display: none` (DOM serialization after `el.style.display = 'none'`).

**Required validation**:
- Manually open and close the modal at ≤768px viewport and confirm both states render correctly.
- Search for any other element with `style="display:none; position:fixed; ..."` in `HTML_UI` before adding a new mobile rule for it.

---

## Forbidden Patterns

- Do not rely on `node --check` alone for embedded UI edits in `worker.js`; it validates syntax but not top-level template evaluation.
- Do not add `display: ... !important` mobile rules to elements that JS toggles via `el.style.display`, without the matching `[style*="display:none"]` close-state guard.

---

## Testing Requirements

- Embedded UI edits must include both Worker module import/evaluation and delivered HTML checks when nested browser templates are touched.

---

## Code Review Checklist

- [ ] Nested browser template literal interpolations inside `HTML_UI` are escaped as `\${...}` in source.
- [ ] Worker module import/evaluation passes, not just syntax validation.
- [ ] Delivered authenticated `/` HTML contains expected browser-side runtime markers and required IDs/classes.

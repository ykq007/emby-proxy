# Implementation Plan

## Checklist

1. Refresh project frontend guidance with `trellis-before-dev` before editing.
2. Update `CSS_COMMON` with the playful media-library visual system:
   - theme tokens for light/dark,
   - typography imports and fallbacks,
   - page background/texture,
   - buttons, badges, cards, forms, tables, modal, route-card components,
   - responsive rules.
3. Rework `LOGIN_UI` markup/classes while preserving `tokenInput`, `toast`, and `login()` behavior.
4. Rework the static `HTML_UI` sections into clearer shelves while preserving IDs and inline handler entry points.
5. Rework dynamic route-card HTML in `load()` to match the new media-card layout while preserving `.route-item`, `data-prefix`, `data-search`, `.node-cb`, `.drag-handle`, copy/reveal buttons, edit/delete handlers, and ping IDs.
6. Adjust dynamic test/log row visual classes or inline styles only where needed for consistency; keep `data-label` attributes for mobile table cards.
7. Verify that all required IDs/selectors still exist in the embedded templates or generated markup.
8. Validate Worker syntax as an ES module.
9. If practical in this no-build project, create a temporary local HTML preview from the embedded template and inspect it in a browser; otherwise report that runtime UI testing was limited by the lack of a local Worker/dev-server setup.
10. Run Trellis quality check after editing.

## Validation Commands

- `node --input-type=module --check < /home/ykq001/emby-proxy/worker.js`
- Targeted selector/contract scan with a small local script or grep for required IDs/classes after editing.
- Browser preview if a local static extraction or Worker preview can be run without adding project files.

## Review Gates

- Do not start implementation until the task is activated with `task.py start` after planning review.
- Before reporting complete, verify syntax and DOM contract preservation.
- Run `trellis-check` after implementation.

## Risk Points

- Breaking existing JavaScript selectors by renaming IDs/classes.
- Template-literal escaping mistakes inside `worker.js` embedded HTML.
- Mobile overflow from richer visual treatment.
- Dark-mode regressions if CSS variables are incomplete.
- External font/asset loading failures; provide sensible fallbacks.

## Rollback Points

- CSS-only problems can be rolled back by restoring `CSS_COMMON`.
- Structural regressions can be rolled back by restoring `LOGIN_UI`, `HTML_UI`, or the route-card template independently.

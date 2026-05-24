# Rework worker.js UI

## Goal

Rework the self-contained admin UI embedded in `worker.js` into a more distinctive, production-grade interface while preserving the current Cloudflare Worker behavior and all existing admin workflows.

## User Value

The admin panel should feel easier to scan and more polished for managing Emby reverse-proxy routes, DNS updates, Worker placement, traffic telemetry, and code deployment from a single page.

## Confirmed Facts

- `worker.js` contains both backend Worker logic and two embedded HTML interfaces: `LOGIN_UI` and `HTML_UI`.
- The current interface is Chinese (`lang="zh-CN"`) and uses inline HTML templates, CSS in `CSS_COMMON`, and in-page JavaScript.
- Current UI areas include:
  - Token login screen.
  - Update alert and online update action.
  - Cloudflare trace/placement controls.
  - Main header with dark-mode toggle, RTT indicator, dashboard button, and logout.
  - Worker code override/deploy panel.
  - DNS status, IP extraction/speed test tools, and DNS update actions.
  - Route deployment/edit form with icon picker, target URLs, cache toggle, custom headers, import/export.
  - Existing route cards with drag sorting, ping, copy/reveal links, edit/delete, and batch mode updates.
  - Analytics dashboard modal using Chart.js.
- The current design uses a generic blue card UI, Google-hosted Inter font import, many inline styles, emoji-heavy labels, light/dark variables, and mobile adaptations that convert tables to stacked cards.
- Existing external frontend libraries are SortableJS and Chart.js via jsDelivr.
- This project currently has only `AGENTS.md` and `worker.js` at the repository root; no package/test config was found.
- Trellis frontend specs are placeholders and do not provide project-specific UI conventions yet.

## Product Decisions

- Visual direction: playful media-library personality. The redesign should feel warmer and more media-centric, with poster-card energy and friendlier controls rather than a stark enterprise console.
- Layout scope: section-level re-layout is allowed. The implementation may reorganize visible HTML sections and route cards into clearer groupings, but must preserve existing IDs, handler entry points, data attributes, API calls, and workflows.
- External assets: fonts and visual assets are allowed. Prefer purposeful additions that support the media-library aesthetic and avoid unnecessary new JavaScript dependencies.

## Requirements

- Preserve all existing element IDs, event handler entry points, data attributes, API calls, and user workflows unless explicitly changed later.
- Redesign both the login screen and main admin panel with a cohesive, memorable visual direction.
- Use a playful media-library aesthetic with warmer color, richer cards, and friendlier operational controls.
- Improve scanability across dense operational sections without removing capabilities.
- Keep Chinese UI copy and the friendly emoji tone where it supports scanability.
- Maintain responsive behavior for mobile and desktop.
- Maintain dark-mode support.
- Avoid generic AI-style UI tropes and overused font/palette choices.
- Do not change backend Worker routing, API behavior, storage schema, or authentication behavior as part of the UI rework.

## Acceptance Criteria

- [ ] Login screen and main panel share a cohesive playful media-library visual system.
- [ ] All current admin workflows remain accessible: login, logout, dark-mode toggle, dashboard modal, route create/edit/delete, route reorder, import/export, icon picker, DNS status/update actions, speed tests, placement update, online update, Worker deploy, cache purge, and batch mode updates.
- [ ] Existing JavaScript selectors and handlers continue to resolve the expected DOM elements.
- [ ] Desktop layout improves hierarchy for the dense admin controls and route cards.
- [ ] Mobile layout remains usable without horizontal overflow for forms, route cards, dashboard, and test tables.
- [ ] Light and dark themes both render with sufficient contrast.
- [ ] No backend/API logic changes are required for the redesign.

## Out of Scope

- Rewriting the Worker backend or changing API contracts.
- Adding a build system, framework, or separate frontend bundle.
- Removing admin capabilities from the current panel.
- Changing authentication semantics or secret/token storage.

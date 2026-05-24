# Implementation Plan: UI Revamp

## Phase 1: CSS Foundation
- [ ] Define new CSS variable system in `CSS_COMMON`.
- [ ] Implement base reset and utility classes (flex-col, grid-cols, etc.).
- [ ] Create skeleton styles for Sidebar, Header, and Content Area.

## Phase 2: Login Page
- [ ] Redesign `LOGIN_UI` with minimal professional aesthetic.
- [ ] Verify login flow and error handling UI.

## Phase 3: Dashboard Layout
- [ ] Implement the Shell (Sidebar + Header).
- [ ] Integrate Theme Toggle functionality.
- [ ] Build responsive "Mobile Drawer" for the sidebar.

## Phase 4: Component Overhaul
- [ ] **Nodes**: Redesign node cards as high-density list items/cards.
- [ ] **Analytics**: Integrate Chart.js into a "Tab" or dedicated dashboard section.
- [ ] **Tools**: Re-style IP testing tables and DNS status badges.
- [ ] **Deployment**: Redesign the "Redeploy" card with better code area focus.

## Phase 5: Polish & Validation
- [ ] Audit all SVGs and replace with a unified set (Lucide).
- [ ] Final check on mobile responsiveness across all sections.
- [ ] Performance check (ensure no regression in JS execution).

## Validation Commands
- Manual visual inspection of all views.
- `grep -r "btn-" worker.js` to ensure all buttons are migrated.
- Check browser console for Chart.js/SortableJS errors in the new layout.

# PRD: Revamp worker.js UI

## Goal and User Value
Completely redesign the user interface of the Emby Proxy Worker to provide a more modern, professional, and efficient management experience.

## Confirmed Facts
- **Architecture**: The UI is currently embedded directly in `worker.js` as string constants (`CSS_COMMON`, `LOGIN_UI`, `HTML_UI`).
- **Functionality**:
    - Administrator login (token-based).
    - Node management: Add, Edit, Delete, Reorder (SortableJS).
    - Traffic analytics: Charts (Chart.js), recent logs.
    - Utility tools: IP/CNAME testing, DNS status, Cloudflare Trace.
    - Worker management: Code deployment/redeploy.
- **Styling**: Current aesthetic is "Media Library" inspired with posters, glassmorphism, and a warm/purple palette.

## Requirements
- **Visual Redesign**: Replace the current "Media Library" aesthetic with a **modern, clean, high-density dashboard aesthetic** (Professional SaaS look).
- **Layout**: Transition from a centered card layout to a **Sidebar + Header + Content Area** structure.
- **Node View**: Move away from large posters to a more compact list or data-grid view for nodes.
- **Functional Parity**: All existing features (analytics, node management, tools) must remain fully functional.
- **Responsiveness**: The UI must be fully responsive, maintaining professional layout on mobile.
- **Dark Mode**: Implement a sleek "Dark/Night" mode using Slate/Zinc neutrals.
- **Maintainability**: Organize CSS and HTML strings more logically in `worker.js`.

## Acceptance Criteria
- [ ] Login page redesigned with a professional, minimal look.
- [ ] Dashboard features a sidebar for navigation (Nodes, Analytics, Tools, Deployment).
- [ ] Node cards are replaced with high-density data cards or a list view.
- [ ] Charts and logs are integrated into a cohesive "Analytics" view.
- [ ] All interactive components (modals, forms) use the new design system.
- [ ] Mobile view uses a bottom-nav or hamburger menu for the sidebar.

## Out of Scope
- Migrating the worker to a different platform.
- Adding major new features not related to UI/UX.

## Open Questions
- None. (Resolved: Design direction is modern SaaS; sticking to Vanilla CSS with a strong variable system).

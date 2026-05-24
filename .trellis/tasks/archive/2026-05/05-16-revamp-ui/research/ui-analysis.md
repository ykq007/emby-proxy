# Research: UI Analysis

- **Query**: Research the current UI structure in worker.js and identify key components to revamp.
- **Scope**: Internal
- **Date**: 2024-05-16

## Findings

### 1. UI Structure in `worker.js`

The current UI is embedded directly within `worker.js` as string constants and template literals.

#### Constants Found

| Constant | Description |
|---|---|
| `CSS_COMMON` | Contains global styles, CSS variables, and responsive layout rules. |
| `LOGIN_UI` | HTML template for the login screen. |
| `HTML_UI` | HTML template for the main dashboard (App Page). |

#### CSS Highlights
- **Variables**: Defines a comprehensive set of variables for colors (light/dark), shadows, and spacing.
- **Typography**: Uses `Outfit` and `Fraunces` fonts from Google Fonts.
- **Layout**: Uses CSS Grid (`grid-template-columns: repeat(12, 1fr)`) and Flexbox for responsiveness.
- **Components**: Styled components for cards (`.shelf`, `.emby-card`), buttons (`.btn-submit`, `.icon-btn`), and forms.

### 2. UI-related JavaScript Functions

These functions are located within the `<script>` tags of `LOGIN_UI` and `HTML_UI`.

| Function | UI Interaction |
|---|---|
| `showToast(msg)` | Displays a temporary toast notification. |
| `login()` | Validates and sets the `admin_token` cookie. |
| `openDashboard()` | Populates and displays the analytics modal using Chart.js. |
| `loadIcons()` | Fetches and renders the icon selection grid. |
| `toggleDarkMode()` | Toggles the `.dark` class on `body` and persists setting to `localStorage`. |
| `pingTarget()` / `pingAllNodes()` | Updates latency badges in the UI. |
| `editNode()` | Fills the node deployment form with existing data. |
| `deployWorker()` | Triggers a worker redeploy with provided code. |
| `measureRTT()` | Periodically updates the RTT monitor in the header. |
| `fetchCfTrace()` | Updates the Cloudflare trace info (region/colo). |
| `batchUpdateModes()` | Performs batch operations on selected nodes. |

### 3. Styling & Script Libraries

The UI currently relies on several external libraries and resources:

- **Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js` - Used for traffic and location visualization.
- **SortableJS**: `https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js` - Used for reordering nodes in the dashboard.
- **Google Fonts**: `https://fonts.googleapis.com/css2?family=Outfit...&family=Fraunces...` - Typography.
- **Lucide/SVGs**: Inline SVG icons (e.g., `SVG_EYE`, `SVG_COPY`, `SVG_TG`).

### 4. Existing Design Specs

- **Status**: Placeholders only.
- **Location**: `.trellis/spec/frontend/` contains files like `component-guidelines.md` and `index.md`, but they are currently empty "To be filled by the team" templates.
- **Implicit Design**: The current UI follows a "modern glassmorphism" aesthetic with a warm palette in light mode and a deep purple/dark theme.

## Revamp Recommendations

- **Componentization**: The UI is currently a giant string literal. Revamping should consider breaking this into modular components or using a build step.
- **Styling**: Consider moving from raw CSS strings to a more maintainable solution (Tailwind or CSS-in-JS if moving to a framework).
- **Icons**: Transition from mixed inline SVGs and image-based icons to a unified icon library (e.g., Lucide React if applicable).

## Caveats / Not Found

- No formal Figma or design documents found in the repository.
- No unit tests for UI logic.
- UI state management is handled via raw DOM manipulation and `localStorage`.

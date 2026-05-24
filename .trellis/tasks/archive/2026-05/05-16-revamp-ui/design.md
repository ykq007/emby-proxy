# Design: Modern Dashboard Revamp

## Architecture & Layout
The UI will shift from a multi-column card-shelf layout to a **Sidebar + Header + Content Area** pattern common in professional SaaS tools.

### 1. Sidebar (Navigation)
- **Logo/Brand**: Top section with a minimal icon.
- **Nav Items**:
    - **Nodes**: Primary node management view.
    - **Analytics**: Traffic charts and logs.
    - **Tools**: IP/CNAME testing, DNS status.
    - **Settings/Deploy**: Worker code management and system settings.
- **Theme Toggle**: Located at the bottom of the sidebar.

### 2. Header
- **Context Title**: Shows current view name (e.g., "Manage Nodes").
- **RTT Monitor**: Real-time latency display.
- **User Action**: Logout button.

### 3. Content Area
- Uses a **Bento Grid** or **List View** for data.
- **Node Cards**: Transition from `112px` posters to `48px` circular icons with multi-line metadata (Prefix, Mode, Traffic).

## Visual System
- **Palette (Light)**:
    - Background: `Slate-50` (`#f8fafc`)
    - Cards: White
    - Primary: `Indigo-600` (`#4f46e5`)
    - Text: `Slate-900`
- **Palette (Dark)**:
    - Background: `Slate-950` (`#020617`)
    - Cards: `Slate-900`
    - Primary: `Indigo-500`
    - Text: `Slate-50`
- **Typography**: `Inter` for primary UI, `JetBrains Mono` for code/IPs.
- **Shadows**: Soft, layered shadows (`ring` shadows) for a "floating card" feel.

## Technical Implementation
- **Vanilla CSS**: Heavily utilizing CSS Variables (`--p-primary`, `--p-bg`, etc.).
- **Componentization**: String literals in `worker.js` will be broken down into functions if possible to improve readability, but primarily will remain as template tags.
- **Icons**: Transition to **Lucide Icons** via CDN (SVG `use` or direct injection) for consistency.

## Operational Considerations
- **Rollback**: Keep a backup of the original `CSS_COMMON` and `HTML_UI` constants.
- **Compatibility**: Ensure `SortableJS` and `Chart.js` integrations work seamlessly with the new layout containers.

# Console UI rebuild plan

We are rebuilding the operator console and the login page in the "A · Instrument" style. You can see that style in `prototype.html` (press 1).

The goals are a new look, flatter navigation and a usable phone layout. Every feature in `inventory.md` must still work at the end.

The public status page and share cards were removed earlier (`src/api/public.js:166`), so this plan does not rebuild them.

Work happens on the branch `ui-rebuild` as 7 stacked PRs, U1 to U7. `main` keeps the old UI until U7 lands. Nothing is deployed until you say so.

## Design rules

These rules come from the prototype and `PRODUCT.md`. U1 writes them into a new `DESIGN.md`, which replaces the "Aqua" glass system.

- Dark is the default theme. Light is a full second theme. Both meet WCAG AA.
- One accent colour, amber. It marks the selected item and the main button only. Green, amber and red mean status, and each status also has a word.
- Use flat surfaces and hairline borders. No glass, blur or glow.
- Numbers use a monospace font with even digit widths.
- Lists of nodes are tables. On a phone, each row shrinks to two lines.
- Motion is limited to short fades. With reduced motion turned on, nothing moves.

## Navigation

One sidebar lists all 10 pages in 3 groups. Every page is one click away, and the sub-tab bar goes away.

| Group | Pages |
|---|---|
| 监控 | 看板, 统计 |
| 网络 | 测速 & DNS, 优选 CDN, 重定向白名单 |
| 配置 | 部署节点, 全局设置, 观看账号, 工具箱, 危险区 |

On a phone, a bottom bar shows 看板, 统计 and 网络, plus 更多. 更多 opens the full list.

The URL hash is the page key, for example `#stats`. Old links such as `#monitor/stats` still open the right page.

## Code shape

The client becomes ES modules in `src/ui/console/`. esbuild bundles them into one hashed file.

One table drives the sidebar, the phone bar, the ⌘K palette and the router.

```js
// src/ui/console/pages.js
export const PAGES = [
  { key: 'overview', group: '监控', label: '看板', phoneTab: true, load: () => import('./pages/overview.js') },
  { key: 'stats',    group: '监控', label: '统计', phoneTab: true, load: () => import('./pages/stats.js') },
  // ... one row per page
];
// Each page module exports mount(root, ctx) and returns an optional cleanup function.
```

Buttons carry `data-action="..."` attributes. One click listener on the document routes each action to the current page's handler.

This removes the inline `onclick=` handlers. These handlers are why `scripts/build-assets.mjs` must keep top-level function names today.

Shared modules:

| Module | Job |
|---|---|
| `api.js` | One fetch helper. It parses JSON and shows errors. On a 401 it sends you back to the login page. Today there is no global 401 handling. |
| `html.js` | One tagged template that escapes values. It replaces the 4 separate escape functions. |
| `ui.js` | Toast messages, the confirm dialog, the side panel and the phone sheet. |
| `theme.js` | The auto, light and dark modes. It keeps the `emby_theme` key. |
| `palette.js` | The ⌘K palette, built from `PAGES` plus page actions and nodes. |

The new code drops the old `localStorage` keys `emby_active_section`, `emby_active_dest`, `emby_sidebar_collapsed` and `emby_node_view`. The hash replaces the first two. The new layout has no collapse and no grid view.

## The stack

Each PR passes `npm run verify` before push.

Each PR is also checked in `wrangler dev` with a local D1 and test nodes. We take screenshots at 1440 px and 390 px wide, in both themes. Each affected row of `inventory.md` gets a check mark with its evidence.

A live request to an Emby node follows `CLAUDE.md`. It uses a real client User-Agent from `visitor_logs`, never a browser one.

### U1. Build the shell and the login page

- Add `src/ui/console/` with `main.js`, `pages.js`, the shared modules above and `console.css`.
- Change `scripts/build-assets.mjs` from `transform` to `bundle`. Drop the `purgeCache` name check.
- Rewrite `src/ui/dashboard.js` as a thin HTML shell with the sidebar, top bar and phone bar.
- Restyle `src/ui/login.js`. The cookie and the form behave the same as today.
- Delete `src/ui/dashboard/client/app.js` and `app.css`. Pages that U2 to U6 have not built yet show "尚未迁移" (not moved yet). This is fine because the branch is not deployed.
- Update `eslint.config.mjs` and the `lint` script to the new folder. Rewrite `snapshots/`.
- Write the new `DESIGN.md`.
- Check that login, logout, theme switching, every nav link, ⌘K, the back button and an old-style `#monitor/stats` link all work.

### U2. Build 看板 (overview)

This covers the readout strip, the node table, the probe bars, the 14-day trend and edge latency.

It also covers search, prefix masking, ping one node, ping all nodes, the monitor switch, drag to reorder, batch mode change and copy link.

Clicking a row opens a side panel with node detail, inline edit, delete, revoke Emby auth and refresh config. On a phone, the panel opens as a full page.

### U3. Build 部署节点 (nodes)

This covers the add and edit form, backup lines, the proxy mode hints, the headers editor, cURL import, importing headers from another node, the icon picker, keepalive, the Emby login and image cache.

It also covers config import and export.

### U4. Build 统计 (stats)

This covers the traffic totals, the 7-day chart, the visitor map chart, the top 5 nodes and the playback log. Chart.js still loads only when this page opens, with its integrity hash.

### U5. Build the 网络 pages

This covers 测速 & DNS, 优选 CDN and 重定向白名单, with every action in the inventory. The phone sheet replaces the current 更多 menu.

### U6. Build the 配置 pages

This covers 全局设置, 观看账号, 工具箱 and 危险区.

It also covers the placement picker, the update banner and the Worker deploy dialog.

### U7. Finish and land

- Walk the whole of `inventory.md`. Every row must be checked or marked as dropped on purpose.
- Replace `docs/screenshots/*.png` and update both READMEs.
- Ask you before any deploy. `CLAUDE.md` and `DEPLOY.md` cover the deploy steps.

## Open choices with defaults

1. Status page and share cards. They do not exist, so the default is to leave them out. Say so if you want a new public status page. It would become U8.
2. Grid view. The old 看板 had a card grid and a list toggle. The default keeps only the table. Say so if you still use the cards.
3. Sidebar collapse. The default has no collapse. The sidebar is 200 px wide.


## Routing and server surfaces

| Route | Serves | Source |
|---|---|---|
| `GET /` (authed) | Dashboard HTML with ETag/304 | `src/router.js:35-48` → `HTML_UI` |
| `GET /` (unauthed) | Login page, from the auth gate | `src/middleware/auth.js:37,51` → `LOGIN_UI` |
| `/api/*` unauthed | 401 `Unauthorized` text | `src/middleware/auth.js:52` |
| Pre-auth public | `/api/trace` (`public.js:12`), `/api/edge-info` (`:39`), `/__client_rtt__` (`:77`), `POST /api/tg-webhook` (`:90`), OPTIONS (`:160`) | `src/api/public.js` |
| Removed | `/status`, `/public/<token>`, `/card` (comment at `public.js:166-167`; `router.js:9` comment is stale) | none |
| Admin API groups | `handleCf`, `handlePlacement`, `handleSystem`, `handleOptimizedDomains`, `handleDns`, `handleRoutes`, `handleStatusApi`, `handleViewers` | `src/router.js:50-57` |
| Fallback | Reverse proxy | `src/router.js:60` |

Auth limits: 12 failed tries per 60 s, auto-ban at 100 failures per hour for 1 h (`auth.js:8-13`).

## Shell and global chrome (`src/ui/dashboard.js`)

| Item (line) | Shows / does | Client handler | API |
|---|---|---|---|
| Skip link, `#toast` / `#toastAlert` (23-25) | Accessibility, toasts | `showToast` `app.js:1457`, `showError` `1468` | none |
| SVG sprite `#i-*` (28-54) | Icons | n/a | n/a |
| `#confirmDialog` (58-66) | Native `<dialog>` confirm; danger defaults focus to Cancel | `uiConfirm` `app.js:2691` | none |
| Topbar `#tbStatus` (145) | One-line health; click → overview | `showDest` `:1139` | text from `updateAuroraKpis` `:2513` |
| `#placePill` (149-153) | Placement mode label, toggles drawer | `togglePlacementDrawer` `:3285` | GET `/api/placement` `:3304` |
| `#trace-entry`, `#trace-egress` (154-155, hidden) | Edge info | `fetchCfTrace` `:3161` | GET `/api/edge-info` `:3163` |
| `#tbSectionTitle` (157) | Current tab title | set inside `showDest` | none |
| ⌘K button (159-162) | Opens palette | `openCmdK` (`:4127`) | none |
| `#themeToggle` (163-167) | Cycles auto→light→dark | `toggleDarkMode` `:1097` | none |
| Logout icon (171) | Logs out | `logout` `:3101` | none |
| `#updateAlert` banner (178-183) | Shows new version; one-click upgrade; dismiss | `checkForUpdates` `:3513`, `doOnlineUpdate` `:3535`, inline dismiss | GET GitHub raw URL `:3517`; POST `/api/deploy` `:3545` |
| `#placeDrawer` (186-205) | Placement mode/region picker, submit | `handleModeChange` `:3239`, `updatePlacement` `:3330`, `loadPlacement` `:3301` | GET `/api/placement` `:3304`; POST `/api/placement` `:3354` |
| `#workerUpdateModal` (68-80) | Paste or upload Worker code, deploy | `openWorkerUpdate` `:954`, `closeWorkerUpdate` `:960`, `deployWorker` `:3465` | POST `/api/deploy` `:3484` |
| `#editModal` (82-92) | Edit-node form container | `editNode` `:2572`, `openEditModal` `:2624`, `closeEditModal` `:2640` | none directly |
| `#cmdk` palette (95-104) | Search and run commands | IIFE `app.js:4037-4130` | none directly |
| Sidebar nav (108-139) | Monitor / Network / Config; collapse | `showDest` `:1139`, `toggleSidebar` `:1416` | none |
| `#subtabBar` (213) | Subtabs for current destination | `renderSubtabs` `:1127` | none |
| `#curlModal` (843-853) | Parse pasted cURL into headers | `HeadersEditor.openCurlModal`, `.parseCurl`, `.closeCurlModal` (`window.HeadersEditor` `:3869`; called from `dashboard.js:557`, `:681`, `:850`) | none |
| `#importHeadersModal` (856-865) | Merge headers from another node | `HeadersEditor.openImportModal` (`dashboard.js:556`), `.closeImportModal` | none |
| `#mobileTabBar` (868-881) | Mobile 3-tab nav | `initMobileTabBar` `app.js:3877`, click → `showDest` `:3880-3884` | none |
| Disclaimer footer (831-835) | Static text | none | none |

Modal focus and Escape handling: `app.js:2618-2740` (`_focusableIn`, `_activeOverlay`, `modalOpened`, `modalClosed`). Escape closes `#editModal` (`:2678`) and the three overlay modals (`:2734-2735`).

## Section: overview (`sec-overview`, `dashboard.js:715-792`)

Default landing view. Heavy data load runs in `load()` (`app.js:2142`).

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| Verdict `#cockpitVerdict` (718-726) | Overall health headline, online/total nodes | `updateAuroraKpis` `app.js:2513`, `renderUpdatedAgo` `:2563` | via `load()` |
| Signal strip (728-749): `#kpi-rtt` | Latency to edge | `measureRTT` `:3123`, `startRTT` `:3145` (every 3 s, per `:3119`) | GET `/__client_rtt__` `:3127` |
| `#kpi-traffic` | Today's traffic | from `loadDashboardData` `:760` | GET `/api/analytics` `:858` |
| `#kpi-errors` | Offline count | `updateAuroraKpis` | via `load()` |
| `#kpi-health` + bar | Health % | `updateAuroraKpis` | via `load()` |
| View toggle grid/list (756-762) | Card vs list rendering, persisted | `setNodeView` `:1966` | none |
| Prefix mask (764-766) | Masks URL prefix, persisted, on by default | `togglePrefixMask` `:1996` | none |
| 全局测速 (768) | Ping all nodes | `pingAllNodes` `:1653` | GET `/api/ping-node?url=` `:1634` per node |
| Search (769) | Filter node list | `filterNodesList` `:1502`, `clearNodeSearch` `:1497` | none |
| Batch bar (775-786): select-all | Check all nodes | `toggleSelectAllNodes` `:3383`, `updateBatchBar` `:3389` | none |
| Batch mode select + apply (781-784) | Apply one reverse-proxy mode to checked nodes | `batchUpdateModes` `:3414` | GET `/api/routes` `:3433`; POST `/api/routes` `:3445` per node |
| `#list-grid` node list (787-789) | Node rows or cards | `load` `:2142`, `renderNodeRow` `:2009` (list), card template `:2290-2350` | GET `/api/routes` `:2145`; GET `/api/status/auth-state` `:2146`; GET `/api/status/probes` `:1677`; GET `/api/status/global-flags` `:1684` |
| Drag reorder (handle in row) | Persist order | `Sortable.create` `:2363`, save at `:2375` | POST `/api/routes/reorder` `:2375` |
| Row: monitor switch (`.nr-mon`) | Enable monitoring for node | `toggleNodeMonitor` `:1767` | POST `/api/routes/monitor` `:1773` |
| Row: ping (`.ping-btn`, `:2028`) | Re-test latency | `pingTarget` `:1603` | GET `/api/ping-node` `:1634` |
| Row: copy link (`:2035`) | Copy direct URL | `copyTxt` `:1601` | none |
| Row: expand (`:2036`) | Lazy-build detail | `toggleNodeRow` `:2045`, `buildNodeDetail` `:2059` | none |
| Detail: 编辑 inline (`:2076`) | Toggle inline form | `toggleInlineEdit` `:2100` | none |
| Detail: inline save (`:2082`) | Save node fields | `saveInlineEdit` `:2107` | POST `/api/routes` `:2131` |
| Detail: 删除 (`:2079`, `:2347`) | Delete node | `del` `:2805` | DELETE `/api/routes?prefix=` `:2812` |
| Detail/card: 编辑 (`:2078`, `:2346`) | Open editor in settings form | `editNode` `:2572` | none |
| Monitor card: revoke Emby auth (`:1761`) | Revoke upstream auth | `revokeEmbyAuth` `:1917` | POST `/api/status/revoke-auth` `:1920` |
| Monitor card: refresh config (`:1791`) | Re-read node config | `refreshNodeConfig` `:1791` | GET `/api/routes` `:1794`; GET `/api/status/auth-state` `:1795` |
| ECG and trend (`:2402`, `:2444`) | Health strip and trend sparkline | `buildEcgSvg`, `buildTrendSvg`, `injectEcgStrips` `:2462` | data from `/api/status/probes` and `loadRouteTrends` `:685` (`GET /api/route-trends?days=7` `:687`) |

## Section: stats (`sec-stats`, `dashboard.js:216-268`, DEST `monitor/stats`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| Refresh 刷新 (220) | Reload stats | `loadDashboardData` `app.js:760` | GET `/api/analytics` `:858` (10 s abort) |
| `#statsEnvNote` (223, hidden) | Shows if CF_API_TOKEN / CF_ZONE_ID missing | set at `:868-870` | none |
| Stat strip `#trafficToday`, `#traffic7d`, `#traffic30d` (226-228) | Traffic totals | `loadDashboardData` `:872-876` | `/api/analytics` `:858` |
| `#trendChart` (234) | 7-day plays line | `new Chart` `:887`; Chart.js lazy-loaded with SRI by `ensureChartJs` `:625` (called `:873`) | `/api/analytics` |
| `#trendTable` sr-only (235) | Accessible table | `buildSrTable` `:716` | none |
| `#locationChart` + `#locLegend` (240-241) | Visitor geography doughnut | `new Chart` `:916`, `updateChartColors` `:638`, `pieColors` `:708` | `/api/analytics` |
| `#top5-simple-container` (249) | Top 5 nodes by traffic | inside `loadDashboardData` | `/api/analytics` |
| Log table `#logTableBody` (253-265) | Recent playback records | `renderLogRows` `:734` | `/api/analytics` |
| Log sort (257) | Sort by time | `setLogSort` `:730`, `updateLogSortInd` `:726` | none |
| Count-up animations | Number animations | `LiveMotion` `:539-613` (`countUp` `:556`, `flash` `:580`, `enliven` `:589`) | none |

## Section: network, speed panel (`sec-speed` `data-net-panel="speed"`, `dashboard.js:271-391`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| DNS status card `#dnsStatusCard` (279-287) | Current resolved IPs and DNS state | `loadDnsConfig` `app.js:209`, `loadDNS` `:3064`, `setDnsActionsEnabled` `:3092` | GET `/api/dns-ready` `:211`; GET `/api/get-dns` `:217`, `:3067` |
| ISP segmented control (290-298) | Filter by ISP; syncs `#ipType` | `_embycfInit` `:267-400` | none |
| `#ipType` select (301-309) | Preset source type | same | none |
| 提取预设源并测速 `#btnFetchRemote` (311; mobile `:335`) | Fetch preset IPs and test | `fetchRemoteAndTest` `:2933` | GET `/api/get-remote-ips?type=` `:2943` |
| 测试粘贴节点 `#btnTestCustom` (312; `:340`) | Test pasted IPs/domains | `testCustomIPs` `:2854`, `doLocalPing` `:2982` | none; browser fetches `https://<ip>/cdn-cgi/trace` `:3007`; geo lookup `https://api.ip.sb/geoip/` `:2992` |
| 拉取 API `#btnFetchCustomApi` (313; `:341`) | Fetch from custom API URL | `fetchCustomApiAndTest` `:2895` | GET `/api/get-custom-api-ips?url=` `:2905` |
| 提交选中至 DNS `#btnSelectedDns` (317) | Push checked IPs to DNS | `updateSelectedToDns` `:3044`, `sendDnsRequest` `:3029` | POST `/api/update-dns` `:3033` |
| 更多 menu (321-330) | Overflow actions | `batchTcpPing` `:2826` (ITDog copy), `directSubmitCname` `:2843` (CNAME direct), `updateTop3ToDns` `:3051`, `clearTest` `:2971` | `directSubmitCname` → `/api/update-dns` |
| Mobile CTA stack (334-346) and more sheet `#sdMoreSheet` (442-470) | Same actions on mobile | `openSdMoreSheet` `:402`, `closeSdMoreSheet` `:408`, `initSheetGesture` `:434` | same as above |
| Custom fold (348-357): `#customApiUrl`, `#customIps` | Input sources (default API URL is hardcoded) | read in the handlers above | none |
| Results table `#testTableBody` (364-380) | Latency, status, record type, per-row copy and DNS | `doLocalPing` `:2982`, `updateRowState` `:3010`, `sortTableByLatency` `:3020`, `applyLatencyBar` `:293`, `updateSingleDns` `:3040` | POST `/api/update-dns` `:3033` |
| Select-all `#selectAll` (368) | Toggle all rows | `toggleSelectAllIps` `:3403`, `getSelectedIps` `:2822` | none |
| Floating selection bar `#sdSelectionBar` (383-388) | Count and submit (mobile) | `updateSelectionBar` `:347` | `/api/update-dns` |

## Section: network, CDN panel (`data-net-panel="cdn"`, `dashboard.js:393-426`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| 全部测速 (399) | Test every optimized domain in browser | `speedtestOptimizedDomains` `app.js:189`, `clientProbe` `:173` | GET `/api/optimized-domains` `:191`; POST `/api/optimized-domains/speedtest` `:202`; browser fetches `https://<domain>/cdn-cgi/trace` `:179` |
| 当前路径带宽 (400) | Measure current download bandwidth | `runDownloadSpeedtest` `:147` | GET `/api/speedtest-down?bytes=` `:153` |
| + 添加自定义 (401) | Add domain | `addOptimizedDomain` `:137` | POST `/api/optimized-domains` `:141` |
| `#downloadSpeedResult`, `#odColoSplit`, `#dnsReadyHint` (403-407) | Result text, colo split, DNS readiness | `renderColoSplit` `:47` | none |
| Table `#optimizedDomainsBody` (420-422) | Domain, note, built-in flag, enable toggle, latency, actions | `loadOptimizedDomains` `:28`, `renderOptimizedDomains` `:74` | GET `/api/optimized-domains` `:30` |
| Enable toggle (render at `:113`) | Enable or disable | `toggleOptimizedDomain` `:127` | PATCH `/api/optimized-domains/:id` `:128` |
| Row 删除 (render at `:120`) | Delete | `deleteOptimizedDomain` `:130` | DELETE `/api/optimized-domains/:id` `:132` |
| Row 替换 DNS (render at `:119`) | Point DNS at this domain | `replaceDns` `:239` | POST `/api/dns/replace` `:241` |
| Latency sort `#odSortTh` (416) | Sort by ms | `setOdSort` `:65`, `odMsOf` `:59` | none |

## Section: network, redirect panel (`data-net-panel="redirect"`, `dashboard.js:428-437`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| `#manualRedirectDomainsInput` (432) | Host allowlist, one per line | `loadManualRedirectDomains` `app.js:8` | GET `/api/manual-redirect-domains` `:10` |
| 保存白名单 (434) | Save allowlist | `saveManualRedirectDomains` `:15` | POST `/api/manual-redirect-domains` `:19` |

## Section: config, settings / 部署节点 (`sec-settings`, `dashboard.js:475-633`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| 配置工具 menu (480-484) | Export / import config | `exportConfig` `app.js:1934`, `importConfig` `:1944` | GET `/api/routes` `:1936`; POST `/api/routes/import` `:1951` |
| `#addForm` submit (489, `#submitBtn` 627) | Create node, or update when editing | `form.onsubmit` `app.js:2744` | POST `/api/routes` `:2775` |
| `#oldPrefix` hidden (490) | Edit-mode marker | set in `editNode` `:2572` | none |
| 备注 `#remark`, 路径后缀 `#prefix`, 分组 `#groupName` (499-501) | Basic fields | `editNode` fills; `:2744+` reads | none |
| 反代模式 `#mode` (503-508) | Four proxy modes | `syncModeHint` `:3609`, `MODE_HINTS` `:3603` | none |
| 主源 `#targetPrimary`, 备 1 `#targetBackup1` (523, 527) | Upstream URLs; oninput | `handleTargetInputs` `:1545`, `makeUpstreamRow` `:1533`, `resetTargetInputs` `:1576` | none |
| 添加备用线路 (530) | Add backup row | `addBackupLine` `:3590` | none |
| Headers editor `#hed-editor` (539-559): rows, enable toggles, templates, count `#hed-count` | Custom request headers | `HeadersEditor` `:3620-3869`: `addRow`, `insertTemplate`, `set`, `serialize` `:3721`, `parse` `:3736`, `updateCount` `:3716` | none |
| 保号提醒 `#keepaliveDays` (569) | Keepalive days (0 off) | `editNode` `:2580` | sent in POST `/api/routes` |
| 媒体计数账号 `#embyUsername`, `#embyPassword` (581-582) | Per-node Emby login; password never read back | `editNode` `:2597-2601` | sent in POST `/api/routes` |
| 节点图标 picker `#iconSelectBtn`, `#iconPickerPanel` (591-609) | Choose icon; custom icon library | `toggleIconPicker` `:1022`, `selectIcon` `:1031`, `renderIconGrid` `:1006`, `filterIcons` `:1020`, `loadIcons` `:967`, `setCustomIconLibrary` `:990`, `resetIconLibrary` `:999` | GET icon library JSON `:970` (default or custom URL) |
| Icon library URL `#customIconUrlInput` (601) | Custom library | `setCustomIconLibrary` `:990` | none |
| 海报 & 静态资源缓存 `#nodeCache` (612-613) | Cache images switch | read in submit `:2753` | sent in POST `/api/routes` |

## Section: config, global settings / 全局设置 (`sec-global`, `dashboard.js:636-673`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| Fact line (638) | Static: probe every minute, alert after 5 min failures | none | none |
| 代理国家白名单 `#proxyCountryAllowlist` 保存 (646-647) | Country allowlist for proxy | `saveCountryAllowlist` `app.js:1844` | POST `/api/status/global-flags` `:1848` |
| 防盗链 Referer `#hotlinkAllowHosts` 保存 (656-657) | Hotlink allowlist | `saveHotlinkHosts` `:1863` | POST `/api/status/global-flags` `:1867` |
| 全局共享 Emby 账号 `#embySharedUser`, `#embySharedPass` 保存 (666-668) | Shared Emby login for counts | `loadEmbySharedCreds` `:1816`, `saveEmbySharedCreds` `:1825` | GET `/api/status/emby-creds` `:1818`; POST `/api/status/emby-creds` `:1829` |
| Global and per-node flag helpers (no static control in this section) | Shared with node cards | `updateEmbyGlobalFlag` `:1882`, `updateEmbyRouteFlag` `:1899` | POST `/api/status/global-flags` `:1886`; POST `/api/status/route-flags` `:1903` |

## Section: tools / 工具箱 (`sec-tools`, `dashboard.js:676-688`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| 导出当前配置 (679) | Download JSON | `exportConfig` `app.js:1934` | GET `/api/routes` `:1936` |
| 导入配置 (680) | Upload JSON | `importConfig` `:1944` | POST `/api/routes/import` `:1951` |
| cURL 请求头解析 (681) | Opens cURL modal | `HeadersEditor.openCurlModal` | none |
| Worker 调度模式 (682) | Opens placement drawer | `openPlacementDrawerFromMobile` `:3290` | GET `/api/placement` |

## Section: viewers / 观看账号 (`sec-viewers`, `dashboard.js:691-712`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| Account matrix `#viewerMatrix` (704) | Accounts × nodes grid with quota and hidden libs | `loadViewers` `app.js:1207`, `renderViewers` `:1229`, `vwEditor` `:1283` | GET `/api/viewers` `:1208` |
| 新建账号 `#viewerNewBtn` (697) | Toggle create form | `toggleViewerCreate` `:1362`, `showViewerCreate` `:1357` | none |
| Create form `#viewerCreate` (699-703) | Username and password (≥6) | `createViewer` `:1367` | POST `/api/viewers` `:1369` |
| Enable/disable switch (render `:1217`) | Toggle viewer | `toggleViewer` `:1372` | POST `/api/viewers` `:1373` |
| Reset password (render `:1291`) | Change password | `resetViewerPassword` `:1376` | POST `/api/viewers` `:1377` |
| Delete account (render `:1294`) | Delete | `deleteViewer` `:1380` | DELETE `/api/viewers?id=` `:1382` |
| Quota and access editor (render `:1261-1271`, `:1305`) | Per-node quota, hidden libraries | `vwOpen` `:1310`, `vwLoadLibs` `:1317`, `vwSaveAccess` `:1331`, `vwGrant` `:1340`, `grantViewer` `:1389` | GET `/api/viewers/libraries?prefix=` `:1321`; POST `/api/viewers/access` `:1393` |
| Revoke access (render `:1306`) | Remove grant | `revokeViewer` `:1398` | DELETE `/api/viewers/access?viewer_id=&prefix=` `:1400` |
| Nodes list `#viewerNodes` (710) | Per-node enable for viewer login | `renderViewerNodes` `:1344`, `saveNode` `:1403` (switch at `:1353`) | POST `/api/viewers/node` `:1404` |
| Empty state → 去部署节点 (`:1346`) | Jump to settings | `showDest('config','settings')` | none |
| Viewer helpers | Escaping, usage counts | `vEsc` `:1200`, `viewerApi` `:1201-1206` (only generic fetch wrapper), `vwUsage` `:1224`, `vwSwitch` `:1214` | all viewer endpoints |

## Section: danger / 危险区 (`sec-danger`, `dashboard.js:795-828`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| 执行刷新 `#btnPurge` (811) | Purge global poster and static cache | `purgeCache` `app.js:1483` | POST `/api/purge-cache` `:1490` |
| 打开部署面板 (818) | Open Worker code modal | `openWorkerUpdate` `:954` | POST `/api/deploy` `:3484` (via modal) |
| 立即退出 (825) | Logout | `logout` `:3101` | none |

## Login page (`src/ui/login.js`)

| Item (line) | Shows / does | Handler | API |
|---|---|---|---|
| Brand panel (202-207) | Name and subtitle | none | none |
| Pre-paint theme script (197-198) | Applies theme; migrates legacy key | none | none |
| `#tokenInput` (218) | Admin key | `login()` `login.js:243` | none |
| Error `#tokenError` (220) | Empty input or wrong key | `showFieldError` `login.js:237` | none |
| 进入 button (221) | Submit | `login()` `login.js:243` | none; sets cookie and reloads (`:254`) |
| Footer version (229) | Version text | none | none |

Cookie details: `admin_token`, path `/`, 30 days, `SameSite=Strict`, `Secure` on https, not HttpOnly (`login.js:251-253`).

## Status page (`src/status/page.js`)

No HTML. The file exports only `loadStatusData` (`:45`), which builds card data (routes, probes, hourly aggregates, media counts) for `GET /api/status/probes` (`src/api/status.js:48-53`). The header comment (`:174`) says the public page was removed. Its only test is `test/status-aggregate.test.mjs:15`.

## Share card and SVG

- There is no share card. `grep` for "share" and "card" under `src/api` and `src/status` finds only "shared" Emby credential names (`src/api/status.js:12-148`).
- SVG in the UI: icon sprite (`dashboard.js:28-54`), ECG and trend (`app.js:2402`, `:2444`), favicon data-URI (`dashboard.js:16`), CSS icon (`app.css:111`).


## Cross-cutting

**Hash routing.** Format `#<dest>/<tab>`. `showDest` writes it with `pushState` or `replaceState` (`app.js:1186-1188`). The initial load reads a deep link (`:1433-1437`), then falls back to `localStorage` (`:1438-1441`). Browser back and forward are handled by `popstate` (`:1447-1450`). Valid destinations and tabs are in `DEST_MAP` (`:1115-1119`). The Network sub-tabs share the `speed` section and switch `.net-panel`s. View Transitions are used when allowed (`:1180-1184`), and scroll resets to top (`:1192`).

**localStorage and sessionStorage.**

| Key | Store | Purpose | Cite |
|---|---|---|---|
| `emby_theme` | local | auto / light / dark | `app.js:1072`, `:1102`; `login.js:198` |
| `emby_proxy_dark` | local | legacy theme key, migrated | `app.js:1067-1070`; `login.js:198` |
| `emby_active_section`, `emby_active_dest` | local | last tab and destination | `app.js:1176`, `:1438` |
| `emby_sidebar_collapsed` | local | sidebar state | `app.js:1420`, `:1425` |
| `emby_node_view` | local | grid or list | `app.js:1964`, `:1968` |
| `emby_mask_prefix` | local | prefix mask, default on | `app.js:1976`, `:1979` |
| `custom_icon_url` | local | custom icon library | `app.js:970`, `:994`, `:1000` |
| `emby_login_attempted` | session | flags a failed login | `login.js:248`, `:257-258` |
| `admin_token` | cookie | auth | `login.js:251`; cleared at `app.js:3103` |

**Keyboard shortcuts.**

| Key | Where | Cite |
|---|---|---|
| ⌘K / Ctrl+K | Toggle palette (suppressed if another modal is open) | `app.js:4130-4136`, `otherModalOpen` `:4084` |
| ArrowUp / ArrowDown, Enter | Palette navigation and execute | `app.js:4059-4063` |
| Escape | Close palette | `app.js:4066-4067` |
| Tab | Focus trap in palette | `app.js:4068-4075` |
| Escape | Close sdMoreSheet | `app.js:420-421` |
| Escape | Close viewer editor | `app.js:1407-1408` |
| Escape | Close editModal and overlays | `app.js:2675-2678`, `:2734-2736` |
| Tab | Focus trap in modals | `app.js:2675-2690` |

Palette commands (`app.js:4015-4044`): 10 destinations, 9 actions (add node, global ping, purge cache, Worker update, placement, DNS submit, DNS TOP3, theme, logout), and one command per node.

**Auth and logout (client side).** Login writes the cookie and reloads (`login.js:251-254`). Logout asks for confirmation (`app.js:3102`), expires the cookie (`:3103`), and reloads (`:3104`). The client has no global 401 handler; `viewerApi` (`:1201-1206`) and a few other callers handle errors individually, so a 401 on other calls surfaces as a generic failure.

**Global helpers to keep (rewrite candidates):**

| Helper | Cite | Notes |
|---|---|---|
| `viewerApi` (fetch wrapper) | `app.js:1201-1206` | JSON parse, `showError`, throws on failure |
| `showToast` / `showError` | `app.js:1457-1466`, `:1468-1480` | 3 s success, 8 s dismissable error |
| `uiConfirm` | `app.js:2691-2712` | Native `<dialog>`, danger-default focus |
| `vEsc` / `_embyEscape` / `nrdEsc` / `HeadersEditor.escapeHtml` | `app.js:1200`, `:1663`, `:2043`, `:3629` | Four escapers; inline HTML built by string concat |
| `copyTxt` | `app.js:1601` | Clipboard plus toast |
| `LiveMotion` (`countUp`, `flash`, `enliven`) | `app.js:539-613` | Count-up animations |
| `getThemePref` / `resolveDark` / `applyTheme` / `toggleDarkMode` | `app.js:1065-1102` | Three-state theme |
| Modal focus helpers | `app.js:2618-2740` | `_focusableIn`, `_activeOverlay`, `modalOpened`, `modalClosed` |
| Sheet gesture | `app.js:434-537` | Drag-to-dismiss on mobile |
| Formatters | `app.js:762` (`parseTrafficToBytes`), `:1700` (`_fmtCountAge`), `:1711` (`isLastPlayLive`), `:1982` (`pfxDisplay`), `:554` (`fmt`) | |
| `ensureChartJs` | `app.js:625-636` | Lazy Chart.js with SRI |
| `HeadersEditor` | `app.js:3620-3869` | Parse and serialize headers, cURL parse |
| Command palette | `app.js:4037-4130` | Self-contained IIFE |


## Build, assets, and checks

- **Pipeline** (`scripts/build-assets.mjs`): reads `app.css` and `app.js`; replaces `__CURRENT_VERSION__` and `__GITHUB_RAW_URL__` (`:25-29`); minifies with esbuild `transform`, not `bundle` (`:37-38`); fails if `purgeCache` is renamed (`:49-52`), because inline `onclick=` handlers need top-level globals.
- **Hashing and output**: 10-char sha256 (`:54-56`). Writes `public/static/app.<hash>.{css,js}` (`:62-64`). Writes `src/ui/asset-manifest.js` (`:66-71`). `public/*` is gitignored (`.gitignore:15`). The current manifest points at `app.aca50d3d26.css` and `app.847e8cd539.js`.
- **Served by**: the shell links `CSS_HREF` and `APP_JS_SRC` (`dashboard.js:6`, `:17`, `:20`). The dashboard `ETag` is `W/"<version>-<length>"` (`dashboard.js:890`).
- **Third-party scripts**: Sortable 1.15.6 from jsDelivr with SRI (`dashboard.js:19`). Chart.js 4.5.1 with SRI (`app.js:629-630`).
- **npm scripts** (`package.json`): `build` (assets, then esbuild bundle to `worker.js`), `snapshot:write` / `snapshot:check`, `lint` (`eslint src/ui/dashboard/client`), `test` (`node --test`), and `verify` (chains all of these).
- **Snapshot harness** (`scripts/snapshot-ui.mjs`): compares raw `LOGIN_UI`, `HTML_UI`, and `app.css` against committed `snapshots/login.html`, `snapshots/dashboard.html`, `snapshots/css-common.css`. Changes to `dashboard.js`, `login.js`, or `app.css` break `snapshot:check`. `app.js` is not snapshotted.
- **Preview**: `scripts/preview-ui.mjs` imports `HTML_UI` and `LOGIN_UI` to write `public/preview/*.html`. It is not a test.

## Tests that touch UI code

- `test/status-aggregate.test.mjs:15` imports `loadStatusData` from `src/status/page.js`.
- No test imports `dashboard.js`, `login.js`, or `app.css`, and none asserts element ids, `data-section`, or markup.
- `snapshots/` is the only markup dependency, through `snapshot:check`.

## Items that will break a rewrite if missed

1. Inline `onclick=` and `onchange=` handlers rely on global functions (`showDest`, `openCmdK`, `toggleDarkMode`, `logout`, `purgeCache`, `HeadersEditor`, and others). `build-assets.mjs:49-52` enforces that a minifier keeps `purgeCache`.
2. `app.js` is a single global script with `var` and function declarations; `showDest` must still set `data-section` visibility, `.net-panel` visibility, and `#tbSectionTitle`.
3. The `#` hash format and `emby_active_*` keys are the only persistence of location.
4. `src/api/status.js:99` exposes `POST /api/status/route-creds`, which no client code calls.
5. `public/static` is generated and gitignored, so a rewrite has to produce its own hashed bundle and manifest.

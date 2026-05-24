# 测速 & DNS 移动端 iOS-native v5 设计重构

## Goal

Lift the mobile (`≤768px`) experience of the **测速 & DNS** page (`#sec-speed`) from
the current generic "table → stacked card rows" fallback into a purpose-built
iOS-native v5 layout that matches the chrome already shipped in v2.4.0/v2.5.0
(`#mobileTopbarCompact`, large-title header, inset-grouped cards, hairlines,
glass surfaces, 44pt touch targets, sticky CTA, bottom-sheet patterns).

The redesign covers **both** cards inside `#sec-speed`:

1. `#speed-anchor` — 专属线路测速与动态 DNS 解析
2. The 🌟 优选 CDN 域名 + 一键 DNS CNAME card

The 🔁 3xx 重定向白名单 card is **out of scope** (no rich data, already simple).

Desktop (`>768px`) layout must be **untouched** — all rules scoped under
`@media (max-width: 768px)` and additive to the existing `Mobile iOS-native v5`
block at worker.js:1453+.

## Background

Current state on mobile (worker.js:628–637):

- Tables collapse via `display: block` per cell with a `td::before` `data-label`
  pseudo-element. Every IP node renders as ~6 stacked rows
  (勾选 / 专属节点 / 预估延迟 / 连通状态 / 记录/归属地 / 快捷操作), eating ~280px
  of vertical space per node and burying the primary signal (latency).
- The toolbar (worker.js:2273) wraps to a vertical stack of ≥6 same-size buttons,
  no visual hierarchy between primary (提取并测速 / 提交至 DNS) and secondary actions.
- 当前生效 DNS 解析 block (worker.js:2266) is a flat text panel; it is the
  *most important* read on this page but visually weakest.
- `<select id="ipType">` is a native dropdown — feels foreign next to the
  rest of the iOS-native chrome.
- 优选 CDN 域名 card has the same problems plus an extra horizontal action
  row that wraps awkwardly.

## Requirements

### R1 — Hero: 当前生效 DNS 解析

- The "📡 当前域名生效的 DNS 解析" block becomes a **prominent inset card**
  (radius `--radius-ios`, hairline border, soft surface) that sits directly
  under the section header.
- Each record is shown as a row inside the card: `[record-type pill] [IP/host]
  [region badge]`, tap-to-copy.
- Loading state uses the existing `.skeleton` shimmer.
- When `_dnsReady` is false, show a single muted line ("DNS API 未配置") instead
  of empty rows.

### R2 — Filter: ISP segmented control

- Replace `<select id="ipType">` with an iOS-style **segmented control** on
  mobile only. Desktop keeps the native select.
- Options: 综合 / 电信 / 联通 / 移动 / 多线 / IPv6 / 优选 — same 7 values as
  current `<option>` set; horizontally scrollable if it overflows, with snap.
- Selected segment uses `--primary` fill on a `--ios-fill` track; updates the
  underlying `<select>` value via JS so existing handlers (`fetchRemoteAndTest`)
  keep working unchanged.

### R3 — Action layout: primary CTA + overflow

- Primary action on mobile = **"⚡ 提取预设源并测速"** (full-width pill,
  `--aurora-grad` background, sticky to the bottom of the speed card while
  scrolling within the card area — *not* page-sticky, to avoid clashing with
  `#mobileTabBar`).
- "测试粘贴节点" and "拉取 API" move into a **secondary row** of two equal
  ghost buttons directly under the primary CTA.
- Everything else (复制去 ITDog / 直推 CNAME / 更新 TOP3 / 清空列表) moves into
  the existing iOS **更多 / action sheet** (`#moreSheet`-style), opened by a
  single "更多操作" trigger. Sheet uses `.more-sheet-*` classes already defined
  at worker.js:1736–1790.
- "提交选中至 DNS" only appears once at least one row is selected, as a
  floating action-bar at the bottom of the card (above the primary CTA), with
  selection count: `已选 3 个 · 提交至 DNS →`.

### R4 — Custom-source inputs

- The `customApiUrl` / `customIps` block becomes a **collapsible inset section**
  ("自定义来源 ▾"), closed by default. Saves ~120px when not in use.
- When expanded: iOS-style stacked inputs (full-width, `--radius-ios-sm`,
  `--ios-fill-quat` background, ≥44pt touch height).

### R5 — Node row: card with latency bar

- Each row in `#testTableBody` renders on mobile as a **single condensed card**,
  *not* 6 stacked label/value rows. Target ~92–104px tall.
- Layout (vertical stack within the card):
  - Row 1: `[checkbox] [IP/host monospace, tap-to-copy] [record-type chip]
    [region badge]`
  - Row 2: **horizontal latency bar** (10 cells filled proportionally to
    `data-ms`; color shifts ok→warn→err at fixed thresholds:
    `<150ms` ok, `<400ms` warn, `≥400ms` err) + `124 ms` label right-aligned.
  - Row 3: status badge (在线/离线/超时) + ghost icon-button row
    (重新测速 / 提交单条 / 复制) using `.a-icon-btn.is-sm`.
- Empty state ("暂无数据") stays as a centered muted line, full card width.
- Loading state ("测算中...") shows the `.skeleton` shimmer in place of the
  latency bar.

### R6 — 优选 CDN 域名 card (same language)

- Action row collapses to one primary pill **全部测速 (本地)** + an overflow
  trigger for Edge 测速 / 当前路径带宽 / 添加自定义.
- Each domain row becomes a card: `[domain monospace] [启用 toggle]` →
  `[备注 small]` → `[上次测速 ms in colored chip] [🔄 替换DNS] [删除 if not builtin]`.
- "替换DNS" button stays disabled when `!_dnsReady` and shows the same tooltip
  text inline as a muted hint (since tooltips don't work on touch).
- `dnsReadyHint` becomes a soft callout strip with `--ok-soft` / `--warn-soft`
  fills matching its current semantic.
- 当前路径带宽 result (`#downloadSpeedResult`) renders as a chip pill, not a
  raw text line.

### R7 — Section header & spacing

- Page heading uses the existing `.ios-page-header` + `.ios-large-title` chrome
  (already promoted to desktop in v2.5.0). The string is "**测速 & DNS**"
  on mobile (shorter than the desktop "⚡ 专属线路测速与动态 DNS 解析" inline
  H2). Mobile hides the in-card `<h2 class="section-title">`.
- Card-to-card gap reuses `--space-4` (16px), consistent with other v5 pages.
- Card outer padding is `--space-4` on mobile (matches existing v5 override at
  worker.js:1631–1634).

### R8 — Accessibility & touch

- All interactive targets ≥`--touch-min` (44pt) per existing tokens.
- Segmented control: keyboard focusable, `role="tablist"`/`tab` ARIA.
- Latency bars include `aria-label="延迟 124ms"` and `role="img"`.
- Color is never the sole signal: badge text labels accompany every status color.
- `prefers-reduced-motion` honored — the redesign adds no new always-on
  animation; only one-shot transitions on tap states.

## Non-goals

- No changes to desktop layout (>768px).
- No changes to the underlying API endpoints, JS speedtest logic, or DOM IDs
  that JS reads (`testTableBody`, `optimizedDomainsBody`, `dnsStatus`,
  `customApiUrl`, `customIps`, `statusText`, `selectAll`, `ipType`, etc.).
- No changes to the 🔁 3xx 重定向白名单 card.
- No new framework / library — pure HTML/CSS/vanilla JS, same worker.js file.
- No changes to dark-mode tokens (existing dark variants must continue working).

## Constraints

- **Single-file Cloudflare Worker** (`worker.js`, 6496 lines). All CSS lives in
  the `CSS_COMMON` template literal; HTML lives in the page template; JS lives
  in inline `<script>` blocks. Keep the same structure.
- Must not break existing JS that reads/writes elements by ID. New markup may
  be added (e.g., a `<div class="iso-segmented">` wrapper around `#ipType`)
  but the existing inputs must remain in the DOM (can be visually hidden on
  mobile only).
- All new CSS classes prefixed `.sd-` (speed-dns) or extend the existing
  `.ios-*` family to avoid collisions.
- Reuse design tokens (`--radius-ios`, `--ios-fill`, `--hairline`, etc.) — do
  not introduce new color or spacing constants.
- Light *and* dark themes must both look intentional.

## Acceptance Criteria

- [ ] At ≤768px viewport, the 测速 & DNS section visually matches the agreed
      mockup direction (inset DNS card, segmented ISP control, single primary
      CTA, latency-bar node cards).
- [ ] At >768px viewport, the page renders byte-identically to the current
      desktop layout (visual diff = 0 against current main).
- [ ] Each node row on mobile fits in ≤120px vertical (down from current ~280px).
- [ ] All existing JS interactions still work end-to-end on mobile:
      提取预设源并测速, 测试粘贴节点, 拉取 API, 提交选中至 DNS, 单条 唯一解析,
      复制 IP, 切换 ipType, 优选CDN 全部测速, 替换DNS, toggle 启用, 添加自定义.
- [ ] Light and dark themes both render with no visible regressions; toggling
      via the existing theme button updates the new chrome live.
- [ ] No new console errors, no new layout-shift on initial render (CLS
      not worse than current).
- [ ] Touch-target audit: every tap target in the redesigned section is
      ≥44×44pt (verified against `--touch-min`).
- [ ] Reduced-motion: with `prefers-reduced-motion: reduce`, no new continuous
      animations play.
- [ ] No changes to worker.js outside the necessary CSS additions inside
      `CSS_COMMON`, markup edits inside the `#sec-speed` section, and any small
      JS hook needed to drive the segmented control / overflow sheet / selected
      count badge.

## Open Questions

None at this point — direction and scope confirmed by the user before PRD.

# Implementation Plan — 测速 & DNS 移动端 iOS-native v5

All work in `worker.js`. Ordered for safe incremental verification.

## Pre-flight

- [ ] Confirm dev preview available (`wrangler dev` / Cloudflare local) or
      ability to render the worker output locally. If not, plan to verify by
      static analysis + opening the rendered HTML response in a browser.
- [ ] Take baseline screenshots of the current mobile + desktop 测速 & DNS
      page in both light & dark themes, saved under
      `.trellis/tasks/05-23-mobile-speedtest-dns-redesign/research/baseline/`.

## Step 1 — Add page header + collapsible custom source (low risk)

Files: `worker.js` (HTML inside `#sec-speed`).

- [ ] Inject `<header class="ios-page-header sd-page-header">` at the top of
      `<section id="sec-speed">` (worker.js:2259), before `<div class="card"
      id="speed-anchor">`.
- [ ] Wrap the existing `customApiUrl` + `customIps` block (worker.js:2306–2309)
      in `<details class="sd-custom-fold"><summary>自定义来源<svg
      class="sd-chev">…</svg></summary><div class="sd-custom-body">…</div></details>`.
- [ ] Verify desktop: page header is hidden via CSS (mobile-only), `<details>`
      summary is visually hidden so the inputs render as before.

Validation: `wrangler dev` → load `/` on desktop, no visual diff.

## Step 2 — Add ISP segmented control markup (HTML)

Files: `worker.js` (HTML inside `#sec-speed`).

- [ ] Above `.toolbar` (worker.js:2273), add `<nav class="sd-isp-seg"
      role="tablist" aria-label="ISP 筛选">` with 7 `<button role="tab">`
      children matching the 7 `<option>` values in `<select id="ipType">`.
- [ ] Mark the `all` button `aria-selected="true"` by default.

## Step 3 — Add action stack + overflow trigger + selection bar markup

Files: `worker.js` (HTML inside `#sec-speed`).

- [ ] Add new `<div class="sd-action-stack">` block directly under the
      existing `.toolbar` div (which will be `display:none` on mobile),
      containing the primary CTA, two ghost buttons, the "更多 …" trigger.
- [ ] Add `<div class="sd-selection-bar" id="sdSelectionBar" hidden>` at the
      bottom of `#speed-anchor` (just before its closing `</div>`).
- [ ] Add `<div id="sdMoreSheet" class="sd-more-sheet">` at the very end of
      `<section id="sec-speed">` (before its closing tag), with
      `.more-sheet-card` markup matching `#moreSheet` (worker.js:1716–1790).
      Sheet rows reuse the existing onclick handlers
      (`batchTcpPing()`, `directSubmitCname()`, `updateTop3ToDns()`,
      `clearTest()`).

## Step 4 — DNS hero card rendering (JS)

Files: `worker.js` (JS).

- [ ] Locate existing `loadDnsConfig` / dns-status render path (grep
      `dnsStatus` in worker.js). Modify the render function so each record
      emits `<li class="sd-dns-row"><span class="sd-rec-pill is-A">A</span>
      <code class="sd-ip">…</code><span class="sd-geo">…</span></li>`.
- [ ] Wrap the rendered list in `<ul class="sd-dns-list">` if not already.
- [ ] On desktop, the new classes are passive — the surrounding card chrome
      is suppressed via `display: contents` in the desktop CSS scope.

## Step 5 — 优选 CDN 域名 row data-labels (JS)

Files: `worker.js` (JS).

- [ ] Edit `renderOptimizedDomains` at worker.js:2415–2437 to add
      `data-label="域名"`, `data-label="备注"`, `data-label="内置"`,
      `data-label="启用"`, `data-label="上次测速"`, `data-label="操作"` to
      every `<td>` in the row template.
- [ ] On desktop, `data-label` is inert (no `::before` on desktop because
      the existing rule at worker.js:637 is mobile-only).

## Step 6 — Latency-bar shim + selection-count + segmented sync (JS)

Files: `worker.js` (JS).

- [ ] Add a small `<script>` block inside `#sec-speed` (after the existing
      F4 script) named `// === Mobile v5 — 测速 & DNS specialist drivers ===`.
- [ ] Implement `attachLatencyBarObserver()`:
      ```
      new MutationObserver(muts => {
        for (const m of muts) {
          if (m.attributeName !== 'data-ms') continue;
          applyLatencyBar(m.target);
        }
      }).observe(testTableBody, {subtree: true, attributes: true,
                                  attributeFilter: ['data-ms']});
      ```
- [ ] Implement `applyLatencyBar(td)`:
      - Read `parseInt(td.dataset.ms, 10)`.
      - Compute level: `9999 → loading`, `<150 → ok`, `<400 → warn`, `else err`.
      - Replace inner HTML with `<span class="sd-lat-bar is-${level}">`
        containing 10 cell `<span>`s with the first `Math.round(min(10,
        max(0, (1 - ms/600) * 10)))` filled, plus a `<span class="sd-lat-val">${ms}
        ms</span>`.
- [ ] Implement `updateSelectionBar()`: count `.row-checkbox:checked` in
      `#testTableBody`; toggle `#sdSelectionBar[hidden]` accordingly; write
      count into `#sdSelCount`.
      Delegated listener: `testTableBody.addEventListener('change', e => {
        if (e.target.matches('.ip-checkbox')) updateSelectionBar(); })`
      Also listen on `#selectAll`.
- [ ] Implement segmented sync: each `.sd-isp-seg [role=tab]` click sets
      `aria-selected`, updates `#ipType.value`, dispatches `change` event,
      scrolls itself into view.
- [ ] Implement `openSdMoreSheet()` / `closeSdMoreSheet()` mirroring the
      existing more-sheet open/close (toggle `.is-open` class, focus trap
      not required — short list).

## Step 7 — CSS: append fenced block at end of v5 mobile MQ

Files: `worker.js` (CSS inside `CSS_COMMON`).

Append a single new block at the end of the existing
`/* === Mobile iOS-native v5 (v2.4.0) === */` region (around worker.js:1804
just before the closing `}` of the `@media (max-width: 768px)`). Subsections,
in order:

- [ ] **7.1** `.sd-page-header` — show only inside `#sec-speed` on mobile.
- [ ] **7.2** `.sd-dns-card` + `.sd-dns-list` + `.sd-dns-row` + `.sd-rec-pill`
      (with `.is-A` / `.is-AAAA` / `.is-CNAME` color variants) + `.sd-geo`.
- [ ] **7.3** `.sd-isp-seg` — horizontal scroll, snap, pill segments,
      `[aria-selected=true]` filled state.
- [ ] **7.4** `.sd-action-stack` + `.sd-cta-primary` (aurora-grad) +
      `.sd-cta-ghost` + `.sd-cta-more`.
- [ ] **7.5** `.sd-selection-bar` — position absolute inside `#speed-anchor`,
      slides up via `transform` when `:not([hidden])`.
- [ ] **7.6** `.sd-custom-fold` — hide native marker, rotate chevron on
      `[open]`, animate body height.
- [ ] **7.7** `#sec-speed tbody tr` — grid layout (areas as in design.md).
      Suppress the generic `td::before` data-label labels inside this section.
      Add `.sd-lat-bar` (10 cells, currentColor-friendly), `.sd-lat-val`.
- [ ] **7.8** `#optimizedDomainsBody tr` — grid layout for the CDN domain
      card.
- [ ] **7.9** `#sdMoreSheet` — reuse `.more-sheet-card` styling; the sheet
      itself uses the same open/close pattern as `#moreSheet`.
- [ ] **7.10** Hide on mobile: the original `.toolbar` inside `#speed-anchor`,
      the in-card `<h2 class="section-title">`, the native `<select id="ipType">`.
- [ ] **7.11** Desktop guards (outside the MQ): `.sd-page-header { display:
      none; }`, `.sd-isp-seg { display: none; }`, `.sd-action-stack { display:
      none; }`, `.sd-selection-bar { display: none; }`, `#sdMoreSheet {
      display: none; }`, `.sd-custom-fold summary { display: none; }`,
      `.sd-custom-fold[open] .sd-custom-body, .sd-custom-fold .sd-custom-body
      { display: contents; }` (so desktop renders inputs at their natural
      level).

## Step 8 — Tighten ≤480 and landscape paths

- [ ] Inside `@media (max-width: 480px)`, shrink `.sd-page-header`
      `.ios-large-title` ramp to `--text-large-title-md`.
- [ ] Inside `@media (orientation: landscape) and (max-height: 480px)`,
      collapse the segmented control row to a chip dropdown if it overflows
      (cheap: make it horizontally scrollable already covers this).

## Step 9 — Verify

- [ ] Reload worker locally (`wrangler dev`); open on a real mobile device
      via LAN URL (or Chrome DevTools device emulation at iPhone 14 Pro /
      Pixel 7) in both light and dark themes.
- [ ] Walk the full happy-path:
      1. Open 测速 & DNS tab → page header visible, DNS hero card visible.
      2. Tap a segment → `ipType` value updates (verify in console).
      3. Tap **提取预设源并测速** → rows appear, latency bars animate from
         loading to color-coded bar.
      4. Check a row → selection bar slides up with "已选 1 个".
      5. Tap **提交至 DNS →** → existing flow runs.
      6. Tap **更多 …** → sheet opens with the 4 secondary actions; tap
         **清空列表** → table clears, sheet closes.
      7. Expand **自定义来源** → inputs reveal; paste IPs → 测试粘贴 runs.
      8. Scroll down to 优选 CDN card → each domain renders as a card; toggle
         启用 → API hit confirmed; tap 替换DNS (if `_dnsReady`) → existing flow.
- [ ] Desktop diff: open the same URL at ≥1024px, screenshot, compare against
      baseline — no visible changes.
- [ ] Run any existing static check (lint, type) that applies to worker.js.
      If none, document that no automated check exists.

## Step 10 — Spec/journal update + commit

- [ ] Update `.trellis/spec/frontend/index.md` if there's a mobile-design
      spec entry (or create one entry referencing the new `.sd-*` namespace
      and the design decisions made here).
- [ ] Append to the active journal a one-paragraph summary + before/after
      screenshots.
- [ ] Single commit titled
      `Mobile 测速 & DNS: iOS-native v5 redesign (v2.6.0)`.
- [ ] Do **not** bump `CURRENT_VERSION` unless the user asks — version is
      tracked at worker.js:3 and changing it has implications beyond CSS.

## Review gates

After Step 1–3 (markup only): visually confirm desktop is untouched and
that mobile shows the new structural elements with default browser styles
(no CSS yet) — proves the HTML scaffolding is sound.

After Step 6 (JS shims): confirm console has no errors on page load even
with empty `#testTableBody`; segmented click changes `ipType.value`.

After Step 7 (CSS): visual review of all redesigned components against the
mockup direction agreed in the PRD; iterate per micro-feedback.

## Rollback points

- After Step 3: revert by deleting the three fenced HTML additions.
- After Step 6: revert by deleting the new `<script>` block (no other JS
  touched apart from `renderOptimizedDomains` data-labels + dns render
  function — both easily reverted).
- After Step 7: revert by deleting the single fenced CSS block.

## Validation commands

- `wrangler dev` (or local node test harness if present) to render the page.
- DevTools Lighthouse mobile audit (a11y + performance) — should not regress.
- Manual `grep` on `worker.js`: confirm new classes are only used in this
  section; confirm no stray `console.log` left behind.

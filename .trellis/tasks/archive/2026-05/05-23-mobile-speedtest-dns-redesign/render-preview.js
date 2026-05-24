// Standalone preview renderer.
// Extracts CSS_COMMON and the speed section HTML from worker.js and writes
// a self-contained HTML file you can open in a browser at any viewport.
//
// Usage:  node .trellis/tasks/05-23-mobile-speedtest-dns-redesign/render-preview.js
// Output: .trellis/tasks/05-23-mobile-speedtest-dns-redesign/preview.html

const fs = require('fs');
const path = require('path');

const workerPath = path.resolve(__dirname, '..', '..', '..', 'worker.js');
const outPath    = path.resolve(__dirname, 'preview.html');

const src = fs.readFileSync(workerPath, 'utf8');

// Extract CSS_COMMON literal content (between the first backticks after `const CSS_COMMON = `)
const cssMatch = src.match(/const CSS_COMMON = `([\s\S]*?)`;/);
if (!cssMatch) { console.error('Could not find CSS_COMMON'); process.exit(1); }
const css = cssMatch[1];

// Extract the speed section HTML — from `<!-- ===== 分区: 线路测速 ===== -->`
// through `</section><!-- /sec-speed -->`. We also need the surrounding chrome:
// mobile topbar compact + bottom tab bar to keep the page feeling right. For a
// quick preview we just take the section alone in a minimal shell.
const speedStart = src.indexOf('<!-- ===== 分区: 线路测速 ===== -->');
const speedEnd   = src.indexOf('</section><!-- /sec-speed -->', speedStart);
if (speedStart < 0 || speedEnd < 0) { console.error('Could not find speed section'); process.exit(1); }
const speedHtml = src.slice(speedStart, speedEnd + '</section><!-- /sec-speed -->'.length);

// Strip server-side template interpolations like ${log.ip} that won't run here.
const cleanedHtml = speedHtml
  // Inline scripts inside the section refer to runtime fns we don't have. Drop them for preview.
  .replace(/<script>[\s\S]*?<\/script>/g, '<!-- runtime script omitted in preview -->');

// Minimal mocked rows so the redesign has data to render.
const mockRows = `
  <tr>
    <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="104.16.124.99"></td>
    <td data-label="专属节点"><strong class="ip-text copyable">104.16.124.99</strong></td>
    <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="68">68 ms</td>
    <td data-label="连通状态" class="speed"><span class="badge" style="background:var(--ok-soft);color:var(--ok);">在线</span></td>
    <td data-label="记录/归属地" class="loc">A · 香港 CN</td>
    <td data-label="快捷操作"><button class="btn-dns">唯一解析</button></td>
  </tr>
  <tr>
    <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="172.67.128.55"></td>
    <td data-label="专属节点"><strong class="ip-text copyable">172.67.128.55</strong></td>
    <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="248">248 ms</td>
    <td data-label="连通状态" class="speed"><span class="badge" style="background:var(--warn-soft);color:var(--warn);">较慢</span></td>
    <td data-label="记录/归属地" class="loc">A · 美国 US</td>
    <td data-label="快捷操作"><button class="btn-dns">唯一解析</button></td>
  </tr>
  <tr>
    <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="2606:4700:abcd::1"></td>
    <td data-label="专属节点"><strong class="ip-text copyable">2606:4700:abcd::1</strong></td>
    <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="9999">测算中...</td>
    <td data-label="连通状态" class="speed text-muted">-</td>
    <td data-label="记录/归属地" class="loc text-muted">等待解析</td>
    <td data-label="快捷操作"><button class="btn-dns" disabled>唯一解析</button></td>
  </tr>
  <tr>
    <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="104.18.32.10"></td>
    <td data-label="专属节点"><strong class="ip-text copyable">104.18.32.10</strong></td>
    <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="512">512 ms</td>
    <td data-label="连通状态" class="speed"><span class="badge" style="background:var(--err-soft);color:var(--err);">超时</span></td>
    <td data-label="记录/归属地" class="loc">A · 日本 JP</td>
    <td data-label="快捷操作"><button class="btn-dns">唯一解析</button></td>
  </tr>
`;
const mockOdRows = `
  <tr class="sd-od-row">
    <td data-label="域名"><code>cf.090227.xyz</code></td>
    <td data-label="备注">中转优选，更新频繁</td>
    <td data-label="内置" class="text-center">✓</td>
    <td data-label="启用" class="text-center"><input type="checkbox" checked></td>
    <td data-label="上次测速" class="text-center"><span class="sd-od-ms is-ok">82 ms</span></td>
    <td data-label="操作"><button type="button" class="btn-tier is-success is-disabled">🔄 替换DNS</button></td>
  </tr>
  <tr class="sd-od-row">
    <td data-label="域名"><code>visa.com.sg</code></td>
    <td data-label="备注"></td>
    <td data-label="内置" class="text-center">✓</td>
    <td data-label="启用" class="text-center"><input type="checkbox"></td>
    <td data-label="上次测速" class="text-center"><span class="sd-od-ms is-warn">216 ms</span></td>
    <td data-label="操作"><button type="button" class="btn-tier is-success is-disabled">🔄 替换DNS</button></td>
  </tr>
  <tr class="sd-od-row">
    <td data-label="域名"><code>my-edge.example.com</code></td>
    <td data-label="备注">自定义</td>
    <td data-label="内置" class="text-center"></td>
    <td data-label="启用" class="text-center"><input type="checkbox" checked></td>
    <td data-label="上次测速" class="text-center"><span class="sd-od-ms is-idle">—</span></td>
    <td data-label="操作">
      <button type="button" class="btn-tier is-success is-disabled">🔄 替换DNS</button>
      <button type="button" class="btn-tier danger">删除</button>
    </td>
  </tr>
`;
const mockDnsList = `
  <ul class="sd-dns-list" role="list">
    <li class="sd-dns-row" role="listitem">
      <span class="sd-rec-pill is-A">A</span>
      <code class="sd-ip">104.16.124.99</code>
      <span class="sd-dns-badge">A | 104.16.124.99</span>
    </li>
    <li class="sd-dns-row" role="listitem">
      <span class="sd-rec-pill is-A">A</span>
      <code class="sd-ip">172.67.128.55</code>
      <span class="sd-dns-badge">A | 172.67.128.55</span>
    </li>
    <li class="sd-dns-row" role="listitem">
      <span class="sd-rec-pill is-AAAA">AAAA</span>
      <code class="sd-ip">2606:4700::6810:7c63</code>
      <span class="sd-dns-badge">AAAA | 2606:4700::6810:7c63</span>
    </li>
  </ul>
`;

const filledHtml = cleanedHtml
  .replace(
    /<tbody id="testTableBody">[\s\S]*?<\/tbody>/,
    `<tbody id="testTableBody">${mockRows}</tbody>`
  )
  .replace(
    /<tbody id="optimizedDomainsBody">[\s\S]*?<\/tbody>/,
    `<tbody id="optimizedDomainsBody">${mockOdRows}</tbody>`
  )
  .replace(
    /<div id="dnsStatus"[^>]*>[\s\S]*?<\/div>/,
    `<div id="dnsStatus" class="flex-wrap-tight">${mockDnsList}</div>`
  )
  // Show the section even though the template has style="display:none;"
  .replace('style="display:none;"', '');

// Minimal driver for the new mobile shims (segments + selection bar + sheet).
const previewShim = `
<script>
(function () {
  const tableBody = document.getElementById('testTableBody');
  const ipTypeSel = document.getElementById('ipType');
  const segEl     = document.querySelector('.sd-isp-seg');
  const selBar    = document.getElementById('sdSelectionBar');
  const selCount  = document.getElementById('sdSelCount');
  const moreSheet = document.getElementById('sdMoreSheet');
  const customFold = document.querySelector('.sd-custom-fold');
  if (customFold) {
    const mq = window.matchMedia('(min-width: 769px)');
    const apply = () => { customFold.open = mq.matches; };
    apply();
    mq.addEventListener('change', apply);
  }
  function applyLatencyBar(td) {
    if (!td || !td.classList || !td.classList.contains('latency')) return;
    const ms = parseInt(td.getAttribute('data-ms'), 10);
    if (!isFinite(ms)) return;
    const isLoading = ms === 9999;
    let level = isLoading ? 'loading' : (ms < 150 ? 'ok' : (ms < 400 ? 'warn' : 'err'));
    let filled = 0;
    if (!isLoading) {
      const t = Math.max(0, Math.min(1, (600 - Math.max(30, Math.min(600, ms))) / 570));
      filled = Math.max(0, Math.min(10, Math.round(t * 10)));
    }
    let cells = '';
    for (let i = 0; i < 10; i++) cells += '<span class="sd-lat-cell' + (i < filled ? ' is-on' : '') + '"></span>';
    const valTxt = isLoading ? '测算中…' : (ms + ' ms');
    td.innerHTML = '<span class="sd-lat-wrap is-' + level + '" role="img" aria-label="延迟 ' + valTxt + '">'
                 +   '<span class="sd-lat-bar">' + cells + '</span>'
                 +   '<span class="sd-lat-val">' + valTxt + '</span>'
                 + '</span>'
                 + '<span class="sd-lat-fallback">' + valTxt + '</span>';
  }
  tableBody.querySelectorAll('td.latency[data-ms]').forEach(applyLatencyBar);
  function updateSel() {
    const n = tableBody.querySelectorAll('.row-checkbox:checked').length;
    selCount.textContent = String(n);
    if (n > 0) { selBar.hidden = false; selBar.classList.add('is-show'); }
    else { selBar.classList.remove('is-show'); setTimeout(() => { if (!selBar.classList.contains('is-show')) selBar.hidden = true; }, 220); }
  }
  tableBody.addEventListener('change', e => { if (e.target.classList.contains('ip-checkbox') || e.target.classList.contains('row-checkbox')) updateSel(); });
  if (segEl && ipTypeSel) {
    segEl.addEventListener('click', e => {
      const b = e.target.closest('[role="tab"]'); if (!b) return;
      segEl.querySelectorAll('[role="tab"]').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
      ipTypeSel.value = b.dataset.value;
    });
  }
  window.openSdMoreSheet = () => { moreSheet.classList.add('is-open'); moreSheet.setAttribute('aria-hidden', 'false'); };
  window.closeSdMoreSheet = () => { moreSheet.classList.remove('is-open'); moreSheet.setAttribute('aria-hidden', 'true'); };
  moreSheet.addEventListener('click', e => { if (e.target === moreSheet) closeSdMoreSheet(); });
  // Stub the global handlers the buttons call, so taps don't error.
  ['fetchRemoteAndTest','testCustomIPs','fetchCustomApiAndTest','updateSelectedToDns','toggleMenu','closeAllMenus','batchTcpPing','directSubmitCname','updateTop3ToDns','clearTest','speedtestOptimizedDomains','runDownloadSpeedtest','addOptimizedDomain','replaceDns','deleteOptimizedDomain','toggleOptimizedDomain','toggleSelectAll','copyTxt','saveManualRedirectDomains','updateSingleDns']
    .forEach(name => { if (!window[name]) window[name] = (...args) => console.log('[stub]', name, args); });
})();
</script>
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>测速 &amp; DNS — preview</title>
<style>${css}</style>
<style>
  /* Preview-only chrome: simple bg + container */
  body { background: var(--bg); margin: 0; padding: 0; }
  .preview-shell { max-width: 100%; margin: 0 auto; padding: 0; }
  .preview-toolbar { position: fixed; top: 8px; right: 8px; z-index: 99999;
    display: flex; gap: 6px; background: rgba(0,0,0,0.7); color: #fff;
    padding: 6px 10px; border-radius: 999px; font-size: 12px; font-family: ui-monospace, monospace; }
  .preview-toolbar button { background: transparent; color: inherit; border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; padding: 2px 8px; font: inherit; cursor: pointer; }
  .preview-toolbar button.active { background: rgba(255,255,255,0.2); }
</style>
</head>
<body>
  <div class="preview-toolbar">
    <span>theme:</span>
    <button onclick="document.body.classList.remove('dark');this.classList.add('active');this.nextElementSibling.classList.remove('active')" class="active">light</button>
    <button onclick="document.body.classList.add('dark');this.classList.add('active');this.previousElementSibling.classList.remove('active')">dark</button>
  </div>
  <div class="preview-shell">${filledHtml}</div>
  ${previewShim}
</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf8');
console.log('Wrote', outPath, '(' + html.length + ' bytes)');
console.log('Open it in a browser. Resize to ≤768px to see the mobile layout.');

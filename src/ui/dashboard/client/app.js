/* Dashboard client script — real source file (issue #20): promoted out of
 * template-literal chunk files. Edit here directly; scripts/build-assets.mjs
 * fills in the two version placeholders below (see the "CURRENT_VERSION ="
 * assignment further down) from src/util/version.js, hashes the result into
 * public/static/, and regenerates the asset manifest.
 */
            // F3: 白名单
            async function loadManualRedirectDomains() {
                try {
                    const res = await fetch('/api/manual-redirect-domains');
                    const data = await res.json();
                    if (data.success) document.getElementById('manualRedirectDomainsInput').value = (data.domains || []).join('\n');
                } catch (e) {}
            }
            async function saveManualRedirectDomains() {
                try {
                    const v = document.getElementById('manualRedirectDomainsInput').value;
                    const domains = v.split('\n').map(s => s.trim()).filter(Boolean);
                    const res = await fetch('/api/manual-redirect-domains', { method: 'POST', body: JSON.stringify({ domains }) });
                    const data = await res.json();
                    if (data.success) { showToast('白名单已保存 (' + data.domains.length + ')'); loadManualRedirectDomains(); }
                    else showError('保存失败：' + (data.error || '未知错误'));
                } catch (e) { showError('操作失败（' + e.message + '）'); }
            }

            // F4: 优选域名
            let _lastSpeedtest = {}; // id -> {ms, ok}
            async function loadOptimizedDomains() {
                try {
                    const res = await fetch('/api/optimized-domains');
                    const data = await res.json();
                    console.log('[optimized-domains] response:', data);
                    if (!data.success) {
                        const body = document.getElementById('optimizedDomainsBody');
                        if (body) body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--err);">加载失败: ' + (data.error || '未知') + '</td></tr>';
                        return;
                    }
                    renderOptimizedDomains(data.items || []);
                } catch (e) {
                    console.error('[optimized-domains] load error:', e);
                    const body = document.getElementById('optimizedDomainsBody');
                    if (body) body.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--err);">JS 异常: ' + e.message + '</td></tr>';
                }
            }
            // Sort state + cache. Latency is the table's decision data, so it owns
            // the default order (fastest first); idle/failed rows sink to the bottom.
            let _odItems = [];
            let _odSort = { key: 'ms', dir: 'asc' };
            function odMsOf(it) {
                const live = _lastSpeedtest[it.id];
                if (live) return live.ok ? live.ms : Infinity;
                if (typeof it.last_ms === 'number' && it.last_ms > 0) return it.last_ms;
                return Infinity;
            }
            function setOdSort(key) {
                if (_odSort.key === key) _odSort.dir = (_odSort.dir === 'asc' ? 'desc' : 'asc');
                else { _odSort.key = key; _odSort.dir = 'asc'; }
                renderOptimizedDomains(_odItems);
            }
            function updateOdSortIndicator() {
                const th = document.getElementById('odSortTh');
                if (th) th.setAttribute('aria-sort', _odSort.dir === 'asc' ? 'ascending' : 'descending');
            }
            function renderOptimizedDomains(items) {
                _odItems = items || [];
                const body = document.getElementById('optimizedDomainsBody');
                if (!body) { console.warn('[optimized-domains] body element not found'); return; }
                if (!_odItems.length) { body.innerHTML = '<tr><td colspan="6" class="text-center-muted">暂无</td></tr>'; updateOdSortIndicator(); return; }
                const dnsReady = _dnsReady;
                // Fastest finite latency drives the "最快" emphasis.
                let minMs = Infinity;
                _odItems.forEach(it => { const m = odMsOf(it); if (isFinite(m) && m < minMs) minMs = m; });
                const sorted = _odItems.slice().sort((a, b) => {
                    const ma = odMsOf(a), mb = odMsOf(b);
                    let d = 0; if (ma !== mb) d = (ma < mb ? -1 : 1);
                    return _odSort.dir === 'asc' ? d : -d;
                });
                body.innerHTML = sorted.map(it => {
                    const live = _lastSpeedtest[it.id];
                    const ms = live ? (live.ok ? live.ms + ' ms' : '失败') : (it.last_ms > 0 ? it.last_ms + ' ms' : (it.last_ms === -1 ? '-' : it.last_ms));
                    const liveMs = odMsOf(it);
                    let msCls = 'is-idle';
                    if (isFinite(liveMs)) {
                        if (liveMs < 150) msCls = 'is-ok';
                        else if (liveMs < 400) msCls = 'is-warn';
                        else msCls = 'is-err';
                    }
                    // Gauge fill ratio: full at ≤30ms, empty at ≥600ms. Driven via
                    // transform:scaleX (not width) so it never animates a layout property.
                    let fillRatio = 0;
                    if (isFinite(liveMs)) {
                        fillRatio = Math.max(0, Math.min(1, (600 - Math.max(30, Math.min(600, liveMs))) / 570));
                    }
                    const fillScale = (Math.round(fillRatio * 1000) / 1000);
                    const isActive = !!(_dnsActive && String(it.domain).toLowerCase() === _dnsActive);
                    const isFastest = isFinite(liveMs) && liveMs === minMs;
                    const replaceBtnDisabled = !dnsReady;
                    const replaceBtnTitle = dnsReady ? '将 DNS 记录的 CNAME 替换为此域名' : '请先在 Worker 环境变量中配置 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN';
                    return '<tr class="sd-od-row' + (isActive ? ' is-active' : '') + (isFastest ? ' is-fastest' : '') + '">'
                        + '<td data-label="域名"><span class="od-domain">' + (isActive ? '<span class="od-active-dot" aria-hidden="true"></span>' : '') + '<code>' + it.domain + '</code>' + (isActive ? '<span class="od-active-badge">生效中</span>' : '') + '</span></td>'
                        + '<td data-label="备注">' + (it.note || '') + '</td>'
                        + '<td data-label="内置" class="text-center">' + (it.builtin ? '<span class="od-builtin">内置</span>' : '') + '</td>'
                        + '<td data-label="启用" class="text-center"><input type="checkbox" ' + (it.enabled ? 'checked' : '') + ' onchange="toggleOptimizedDomain(' + it.id + ', this.checked)" aria-label="启用 ' + it.domain + '"></td>'
                        + '<td data-label="上次测速" class="text-center"><span class="sd-od-ms ' + msCls + '" data-ms="' + (isFinite(liveMs) ? liveMs : '') + '"><span class="sd-od-gauge" aria-hidden="true"><span class="sd-od-gauge-fill" style="transform:scaleX(' + fillScale + ')"></span></span><span class="sd-od-msval">' + ms + '</span></span></td>'
                        + '<td data-label="操作">'
                          + '<div class="sd-od-actions">'
                          + (isActive
                              ? '<span class="od-current-pill" title="DNS 当前指向此线路">● 当前线路</span>'
                              : '<button type="button" class="btn-tier is-gold is-sm" ' + (replaceBtnDisabled ? 'disabled ' : '') + 'title="' + replaceBtnTitle + '" onclick="replaceDns(&#39;' + it.domain + '&#39;)">替换DNS</button>')
                          + (!it.builtin ? '<button type="button" class="btn-tier is-sm is-ghost od-del" onclick="deleteOptimizedDomain(' + it.id + ')">删除</button>' : '')
                          + '</div>'
                        + '</td>'
                        + '</tr>';
                }).join('');
                updateOdSortIndicator();
            }
            async function toggleOptimizedDomain(id, enabled) {
                await fetch('/api/optimized-domains/' + id, { method: 'PATCH', body: JSON.stringify({ enabled }) });
            }
            async function deleteOptimizedDomain(id) {
                if (!await uiConfirm('确定删除此自定义域名？', { danger: true })) return;
                const res = await fetch('/api/optimized-domains/' + id, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) { showToast('已删除'); loadOptimizedDomains(); }
                else showError('删除失败：' + (data.error || '未知错误'));
            }
            async function addOptimizedDomain() {
                const domain = prompt('输入自定义优选域名（如 example.com）：');
                if (!domain) return;
                const note = prompt('备注（可空）：') || '';
                const res = await fetch('/api/optimized-domains', { method: 'POST', body: JSON.stringify({ domain, note }) });
                const data = await res.json();
                if (data.success) { showToast('已添加'); loadOptimizedDomains(); }
                else showError('添加失败：' + (data.error || '未知错误'));
            }
            // 下载测速：拉自己 Worker 的 /api/speedtest-down，测客户端→当前 CF 入口→Worker 的有效带宽
            async function runDownloadSpeedtest() {
                const resEl = document.getElementById('downloadSpeedResult');
                resEl.innerHTML = '测速中（下载 10MB）...';
                try {
                    const bytes = 10 * 1024 * 1024;
                    const start = performance.now();
                    const res = await fetch('/api/speedtest-down?bytes=' + bytes + '&_=' + Date.now(), { cache: 'no-store' });
                    if (!res.ok) { resEl.innerHTML = '端点返回 ' + res.status; return; }
                    const reader = res.body.getReader();
                    let received = 0;
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        received += value.length;
                    }
                    const elapsedMs = performance.now() - start;
                    const mbps = (received * 8 / 1e6) / (elapsedMs / 1000);
                    const mibps = (received / 1048576) / (elapsedMs / 1000);
                    resEl.innerHTML = '下载 ' + (received / 1048576).toFixed(2) + ' MiB 用时 ' + (elapsedMs / 1000).toFixed(2) + ' 秒 → <b>' + mbps.toFixed(2) + ' Mbps</b> (' + mibps.toFixed(2) + ' MiB/s)';
                    showToast('当前路径带宽: ' + mbps.toFixed(1) + ' Mbps');
                } catch (e) {
                    resEl.innerHTML = '测速失败: ' + e.message;
                }
            }

            // 客户端侧测速：先 fetch no-cors，失败回退到 Image() 加载（兼容更多目标）
            function clientProbeImage(domain, timeoutMs) {
                return new Promise(resolve => {
                    const start = performance.now();
                    const img = new Image();
                    let done = false;
                    const finish = (ok) => {
                        if (done) return; done = true;
                        const ms = Math.round(performance.now() - start);
                        resolve({ ms: ok ? ms : -1, ok });
                    };
                    const t = setTimeout(() => finish(false), timeoutMs);
                    img.onload = () => { clearTimeout(t); finish(true); };
                    // onerror 也算"通了"：说明 TCP/TLS 已经握手成功，只是资源不是图片
                    img.onerror = () => { clearTimeout(t); finish(true); };
                    img.src = 'https://' + domain + '/favicon.ico?_=' + Date.now();
                });
            }
            async function clientProbe(domain, timeoutMs) {
                timeoutMs = timeoutMs || 4000;
                const start = performance.now();
                const controller = new AbortController();
                const t = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    await fetch('https://' + domain + '/cdn-cgi/trace?_=' + Date.now(), {
                        mode: 'no-cors', cache: 'no-store', signal: controller.signal
                    });
                    clearTimeout(t);
                    return { ms: Math.round(performance.now() - start), ok: true };
                } catch (e) {
                    clearTimeout(t);
                    console.log('[probe] fetch failed for', domain, e.message, '— fallback to Image');
                    return await clientProbeImage(domain, timeoutMs);
                }
            }
            async function speedtestOptimizedDomains(mode) {
                mode = mode || 'client';
                showToast((mode === 'client' ? '本地' : 'Edge') + '测速中...');
                let measured;
                if (mode === 'edge') {
                    const res = await fetch('/api/optimized-domains/speedtest', { method: 'POST', body: '{}' });
                    const data = await res.json();
                    if (!data.success) { showError('测速失败：' + (data.error || '未知错误')); return; }
                    measured = data.items || [];
                } else {
                    // 客户端：先取启用域名列表
                    const listRes = await fetch('/api/optimized-domains');
                    const listData = await listRes.json();
                    if (!listData.success) { showError('拉取域名列表失败'); return; }
                    const enabled = (listData.items || []).filter(it => it.enabled);
                    measured = await Promise.all(enabled.map(async it => {
                        const p = await clientProbe(it.domain);
                        return { id: it.id, domain: it.domain, ms: p.ms, ok: p.ok };
                    }));
                    measured.sort((a, b) => {
                        if (!a.ok && !b.ok) return 0; if (!a.ok) return 1; if (!b.ok) return -1;
                        return a.ms - b.ms;
                    });
                }
                _lastSpeedtest = {};
                measured.forEach(it => { _lastSpeedtest[it.id] = { ms: it.ms, ok: it.ok }; });
                showToast((mode === 'client' ? '本地' : 'Edge') + '测速完成，已按延迟排序');
                const listRes = await fetch('/api/optimized-domains');
                const listData = await listRes.json();
                if (listData.success) {
                    const items = (listData.items || []).slice().sort((a, b) => {
                        const sa = _lastSpeedtest[a.id], sb = _lastSpeedtest[b.id];
                        if (!sa && !sb) return 0; if (!sa) return 1; if (!sb) return -1;
                        if (!sa.ok && !sb.ok) return 0; if (!sa.ok) return 1; if (!sb.ok) return -1;
                        return sa.ms - sb.ms;
                    });
                    renderOptimizedDomains(items);
                }
            }
            let _dnsReady = false;
            let _dnsActive = ''; // 当前 DNS CNAME 实际指向的域名（小写），用于"生效中"标记
            async function loadDnsConfig() {
                try {
                    const res = await fetch('/api/dns-ready');
                    const data = await res.json();
                    _dnsReady = !!(data && data.ready);
                    // 拉一次当前 CNAME 记录，得知 DNS 现在真实指向哪条线路（非伪造指示器）。
                    if (_dnsReady) {
                        try {
                            const dres = await fetch('/api/get-dns');
                            const ddata = await dres.json();
                            if (ddata.success && Array.isArray(ddata.result)) {
                                const cname = ddata.result.find(r => r.type === 'CNAME');
                                _dnsActive = cname ? String(cname.content || '').trim().toLowerCase() : '';
                            } else { _dnsActive = ''; }
                        } catch (e) { _dnsActive = ''; }
                    } else { _dnsActive = ''; }
                    const hint = document.getElementById('dnsReadyHint');
                    if (hint) {
                        if (_dnsReady) {
                            hint.className = 'dns-ready-hint ok';
                            hint.innerHTML = 'DNS 替换已就绪 (域名: <code>' + (data.domain || '?') + '</code>)'
                                + (_dnsActive ? ' · 当前指向 <code>' + _dnsActive + '</code>' : '')
                                + ' — 点表格里的 "替换DNS" 即可切换线路';
                        } else {
                            hint.className = 'dns-ready-hint warn';
                            hint.innerHTML = '缺少环境变量 <code>CF_API_TOKEN</code> / <code>CF_ZONE_ID</code> / <code>CF_DOMAIN</code>，无法替换 DNS。请到 Cloudflare Worker 设置中补齐。';
                        }
                    }
                } catch (e) { _dnsReady = false; }
            }
            async function replaceDns(domain) {
                if (!await uiConfirm('确定将 DNS 记录的 CNAME 内容替换为 ' + domain + ' ?')) return;
                const res = await fetch('/api/dns/replace', { method: 'POST', body: JSON.stringify({ domain }) });
                const data = await res.json();
                if (data.success) {
                    showToast('DNS 已替换为 ' + data.content);
                    // 重新拉取当前指向并重渲染，让"生效中"标记落到新线路上。
                    loadDnsConfig().then(() => renderOptimizedDomains(_odItems));
                }
                else showError('DNS 替换失败：' + (data.error || '未知错误'));
            }

            // 页面加载后立即拉一次（不依赖分区可见性）
            (function(){
                function _embycfInit() {
                    loadOptimizedDomains();
                    loadDnsConfig().then(() => loadOptimizedDomains()); // 配置加载完后重渲染以显示替换按钮
                    loadManualRedirectDomains();
                }
                if (document.readyState === 'loading') {
                    window.addEventListener('DOMContentLoaded', _embycfInit);
                } else {
                    _embycfInit();
                }
            })();

            // ==========================================
            // === Mobile v5 — 测速 & DNS specialist drivers (v2.6.0) ===
            // View-layer shims. Source-of-truth elements (#ipType, .ip-checkbox,
            // .latency [data-ms]) are not duplicated; we observe / dispatch on them.
            // ==========================================
            (function sdMobileDrivers() {
                const tableBody = document.getElementById('testTableBody');
                const ipTypeSel = document.getElementById('ipType');
                const segEl     = document.querySelector('.sd-isp-seg');
                const selBar    = document.getElementById('sdSelectionBar');
                const selCount  = document.getElementById('sdSelCount');
                const moreSheet = document.getElementById('sdMoreSheet');
                const customFold = document.querySelector('.sd-custom-fold');

                // ---- Desktop: keep <details> open so the inputs render in place
                //      (CSS hides the summary on desktop, but browsers gate the body
                //      on the [open] attribute regardless of CSS display rules).
                if (customFold) {
                    const mq = window.matchMedia('(min-width: 769px)');
                    const applyFoldState = () => { customFold.open = mq.matches; };
                    applyFoldState();
                    if (mq.addEventListener) mq.addEventListener('change', applyFoldState);
                    else if (mq.addListener) mq.addListener(applyFoldState);
                }

                // ---- Latency bar: 10-cell visual encoding next to the ms value ----
                // Threshold: <150ms ok · <400ms warn · ≥400ms err · 9999 loading.
                const LAT_OK = 150, LAT_WARN = 400;
                function applyLatencyBar(td) {
                    if (!td || !td.classList || !td.classList.contains('latency')) return;
                    const raw = td.getAttribute('data-ms');
                    const ms = parseInt(raw, 10);
                    if (!isFinite(ms)) return;
                    const isLoading = (ms === 9999);
                    let level;
                    if (isLoading) level = 'loading';
                    else if (ms < LAT_OK) level = 'ok';
                    else if (ms < LAT_WARN) level = 'warn';
                    else level = 'err';
                    // Fill ratio: full at 30ms, empty at 600ms (capped).
                    let filled = 0;
                    if (!isLoading) {
                        const t = Math.max(0, Math.min(1, (600 - Math.max(30, Math.min(600, ms))) / 570));
                        filled = Math.max(0, Math.min(10, Math.round(t * 10)));
                    }
                    let cells = '';
                    for (let i = 0; i < 10; i++) {
                        cells += '<span class="sd-lat-cell' + (i < filled ? ' is-on' : '') + '"></span>';
                    }
                    const valTxt = isLoading ? '测算中…' : (ms + ' ms');
                    // Preserve original textual content for the desktop (which hides .sd-lat-wrap via CSS)
                    // by keeping a fallback .sd-lat-fallback span.
                    td.innerHTML = '<span class="sd-lat-wrap is-' + level + '" role="img" aria-label="延迟 ' + valTxt + '">'
                                 +   '<span class="sd-lat-bar">' + cells + '</span>'
                                 +   '<span class="sd-lat-val">' + valTxt + '</span>'
                                 + '</span>'
                                 + '<span class="sd-lat-fallback">' + valTxt + '</span>';
                }
                if (tableBody && 'MutationObserver' in window) {
                    const obs = new MutationObserver(muts => {
                        for (const m of muts) {
                            if (m.type === 'attributes' && m.attributeName === 'data-ms') {
                                applyLatencyBar(m.target);
                            } else if (m.type === 'childList') {
                                // Initial render: scan any new .latency cells.
                                m.addedNodes.forEach(n => {
                                    if (n.nodeType !== 1) return;
                                    if (n.matches && n.matches('tr')) {
                                        n.querySelectorAll('td.latency[data-ms]').forEach(applyLatencyBar);
                                    } else if (n.querySelectorAll) {
                                        n.querySelectorAll('td.latency[data-ms]').forEach(applyLatencyBar);
                                    }
                                });
                            }
                        }
                    });
                    obs.observe(tableBody, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ms'] });
                    // Scan any cells already present at script-init.
                    tableBody.querySelectorAll('td.latency[data-ms]').forEach(applyLatencyBar);
                }

                // ---- Selection bar: count checked .row-checkbox under tableBody ----
                function updateSelectionBar() {
                    if (!tableBody) return;
                    const n = tableBody.querySelectorAll('.row-checkbox:checked').length;
                    // Desktop toolbar "提交选中至 DNS" — armed (filled) only when rows are
                    // selected, so it never competes with the single gold primary at rest.
                    const deskBtn = document.getElementById('btnSelectedDns');
                    const deskPill = document.getElementById('sdSelDeskCount');
                    if (deskBtn) deskBtn.setAttribute('data-armed', n > 0 ? '1' : '0');
                    if (deskPill) { deskPill.textContent = String(n); deskPill.hidden = n === 0; }
                    if (!selBar || !selCount) return;
                    selCount.textContent = String(n);
                    if (n > 0) {
                        selBar.hidden = false;
                        selBar.classList.add('is-show');
                    } else {
                        selBar.classList.remove('is-show');
                        // Wait for transition before hiding from a11y tree.
                        setTimeout(() => { if (!selBar.classList.contains('is-show')) selBar.hidden = true; }, 220);
                    }
                }
                if (tableBody) {
                    tableBody.addEventListener('change', e => {
                        if (e.target && (e.target.classList.contains('ip-checkbox') || e.target.classList.contains('row-checkbox'))) {
                            updateSelectionBar();
                        }
                    });
                }
                const selectAllEl = document.getElementById('selectAll');
                if (selectAllEl) selectAllEl.addEventListener('change', updateSelectionBar);
                // Expose so other handlers (e.g. clearTest re-renders) can refresh.
                window.sdUpdateSelectionBar = updateSelectionBar;

                // ---- Segmented ISP control sync ----
                if (segEl && ipTypeSel) {
                    segEl.addEventListener('click', e => {
                        const btn = e.target.closest('[role="tab"]');
                        if (!btn) return;
                        const v = btn.dataset.value;
                        if (!v) return;
                        segEl.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
                        if (ipTypeSel.value !== v) {
                            ipTypeSel.value = v;
                            ipTypeSel.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        // Center the active segment.
                        try { btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (_) {}
                    });
                    // Reflect external changes (e.g. user picks via native <select> on desktop) back into the segments.
                    ipTypeSel.addEventListener('change', () => {
                        const v = ipTypeSel.value;
                        segEl.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', b.dataset.value === v ? 'true' : 'false'));
                    });
                }

                // ---- More sheet open/close ----
                window.openSdMoreSheet = function () {
                    if (!moreSheet) return;
                    moreSheet.classList.add('is-open');
                    moreSheet.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                };
                window.closeSdMoreSheet = function () {
                    if (!moreSheet) return;
                    moreSheet.classList.remove('is-open');
                    moreSheet.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                };
                if (moreSheet) {
                    // Tap on backdrop closes; the ::before pseudo handles visual.
                    moreSheet.addEventListener('click', e => {
                        if (e.target === moreSheet) window.closeSdMoreSheet();
                    });
                    // ESC closes.
                    document.addEventListener('keydown', e => {
                        if (e.key === 'Escape' && moreSheet.classList.contains('is-open')) window.closeSdMoreSheet();
                    });
                }

                // ---- Drag-to-dismiss ----------------------------------------
                // The sheet tracks the finger 1:1 from wherever it was grabbed,
                // resists past its own top edge rather than hitting a wall, and
                // on release continues at the finger's exact velocity into a
                // spring — so there is no seam between dragging and animating.
                // A new press grabs it mid-flight and takes over from the live
                // position, which is why this is a spring integrator and not a
                // CSS transition: a transition cannot inherit release velocity
                // and restarts from its own start value when interrupted.
                function initSheetGesture(sheet) {
                    const card = sheet.querySelector('.more-sheet-card');
                    if (!card || !window.PointerEvent) return;
                    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
                    const DISMISS_RATIO = 0.35;   // a third of its own height…
                    const FLICK_PX_S = 350;       // …or a flick faster than this
                    const GRAB_SLOP = 10;         // hysteresis, so taps stay taps
                    let pointerId = null, startY = 0, y = 0;
                    let dragging = false, moved = false, history = [], raf = 0, vel = 0;
                    // 按下时量一次高度并缓存：在 pointermove 里读 offsetHeight 会在每个
                    // 指针采样上强制同步布局(读-写-读)，手指还在屏幕上时这是最贵的一笔。
                    let cardH = 0;

                    const setY = px => { y = px; card.style.transform = 'translateY(' + px + 'px)'; };
                    const clearY = () => { y = 0; card.style.transform = ''; };
                    const stopSpring = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

                    // Progressive resistance past the top edge. Real things slow
                    // before they stop; a hard stop reads as frozen, not as
                    // "responsive, but there is nothing more here".
                    const rubberband = (over, dim) => (over * dim * 0.55) / (dim + 0.55 * Math.abs(over));

                    // Apple's momentum projection (exponential decay — not the
                    // textbook v²/2a): where would this coast to a rest?
                    const project = v => (v / 1000) * 0.998 / (1 - 0.998);

                    // damping ratio 1.0, response 0.35s — critically damped, so
                    // a dismissal settles without wobbling back at the user.
                    function springTo(target, velocity, done) {
                        stopSpring();
                        if (reduce.matches) { setY(target); if (done) done(); return; }
                        const w = 2 * Math.PI / 0.35;
                        vel = velocity;
                        let last = performance.now();
                        raf = requestAnimationFrame(function step(now) {
                            const dt = Math.min((now - last) / 1000, 1 / 30);
                            last = now;
                            vel += (-w * w * (y - target) - 2 * w * vel) * dt;
                            setY(y + vel * dt);
                            if (Math.abs(y - target) < 0.5 && Math.abs(vel) < 20) {
                                setY(target); raf = 0; if (done) done(); return;
                            }
                            raf = requestAnimationFrame(step);
                        });
                    }

                    card.addEventListener('pointerdown', e => {
                        // Ignore extra fingers once a drag owns the sheet — without
                        // this, switching fingers mid-drag teleports the surface.
                        if (pointerId !== null) return;
                        if (e.pointerType === 'mouse' && e.button !== 0) return;
                        stopSpring();                    // grab it mid-flight
                        cardH = card.offsetHeight;       // 本次手势期间高度不变，量一次就够
                        pointerId = e.pointerId;
                        startY = e.clientY - y;          // respect the grab offset
                        dragging = false; moved = false;
                        history = [{ t: e.timeStamp, y: e.clientY }];
                    });

                    card.addEventListener('pointermove', e => {
                        if (e.pointerId !== pointerId) return;
                        const raw = e.clientY - startY;
                        if (!dragging) {
                            if (Math.abs(raw - y) < GRAB_SLOP) return;
                            dragging = true; moved = true;
                            // Capture so the drag survives the pointer leaving the card.
                            card.setPointerCapture(e.pointerId);
                            card.classList.add('is-dragging');
                        }
                        history.push({ t: e.timeStamp, y: e.clientY });
                        if (history.length > 5) history.shift();
                        setY(raw < 0 ? -rubberband(-raw, cardH) : raw);
                    });

                    function release(e) {
                        if (e.pointerId !== pointerId) return;
                        pointerId = null;
                        if (!dragging) return;
                        dragging = false;
                        card.classList.remove('is-dragging');
                        const a = history[0], b = history[history.length - 1];
                        const velocity = (b.y - a.y) / Math.max(b.t - a.t, 1) * 1000;
                        const h = cardH || card.offsetHeight;
                        // Judge against where the gesture is going, not where the
                        // finger happened to stop: a short fast flick should throw.
                        const dismiss = (y + project(velocity)) > h * DISMISS_RATIO
                                        || velocity > FLICK_PX_S;
                        if (dismiss) {
                            springTo(h, velocity, () => { window.closeSdMoreSheet(); clearY(); });
                        } else {
                            springTo(0, velocity, clearY);
                        }
                    }
                    card.addEventListener('pointerup', release);
                    card.addEventListener('pointercancel', release);
                    // A drag must not also fire the row it ended on.
                    card.addEventListener('click', e => {
                        if (!moved) return;
                        moved = false;
                        e.stopPropagation();
                        e.preventDefault();
                    }, true);
                }
                if (moreSheet) initSheetGesture(moreSheet);
            })();
        const modeNames = { 'off': '保守', 'realip_only': '严格', 'dual': '兼容', 'strict': '强力' };

        // ── Live Instrument 动效层：数字滚动 / KPI 脉冲 / 队列雷达扫描 ──
        // 纯前端、无状态、尊重 prefers-reduced-motion。所有动作服务于"信号"。
        const LiveMotion = (function () {
            const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            // 把 "1280" / "1,280" / "98%" / "240156" 解析为 {num, prefix, suffix}；非纯数值返回 null。
            function parse(text) {
                const m = String(text).match(/^(\D*?)([\d,]+)(\D*)$/);
                if (!m) return null;
                const digits = m[2].replace(/,/g, '');
                if (!digits.length || digits.length > 12) return null;
                const grouped = m[2].indexOf(',') !== -1;
                return { num: parseInt(digits, 10), prefix: m[1], suffix: m[3], grouped: grouped };
            }
            function fmt(n, grouped) { return grouped ? n.toLocaleString('en-US') : String(n); }
            // 把 el 的数字从当前值滚动到 finalText 表示的目标值。非数值则直接写入。
            function countUp(el, finalText, opts) {
                if (!el) return;
                opts = opts || {};
                const target = parse(finalText);
                if (reduce || !target) { el.textContent = finalText; return; }
                const fromText = parse(el.textContent);
                const from = (fromText && fromText.num) || 0;
                const to = target.num;
                if (from === to) { el.textContent = finalText; return; }
                if (el._nxRAF) cancelAnimationFrame(el._nxRAF);
                const dur = opts.duration || Math.min(900, 360 + Math.abs(to - from) * 0.6);
                const t0 = performance.now();
                el.classList.add('nx-counting');
                const ease = function (p) { return 1 - Math.pow(1 - p, 3); }; // easeOutCubic
                function step(now) {
                    const p = Math.min(1, (now - t0) / dur);
                    const val = Math.round(from + (to - from) * ease(p));
                    el.textContent = target.prefix + fmt(val, target.grouped) + target.suffix;
                    if (p < 1) { el._nxRAF = requestAnimationFrame(step); }
                    else { el.textContent = finalText; el.classList.remove('nx-counting'); el._nxRAF = null; }
                }
                el._nxRAF = requestAnimationFrame(step);
            }
            // KPI 瓦片在数值真正变化时闪一圈金环。
            function flash(el) {
                if (reduce || !el) return;
                const tile = el.closest && (el.closest('.signal-cell') || el.closest('.kpi-tile'));
                if (!tile) return;
                tile.classList.remove('kpi-flash');
                void tile.offsetWidth; // 重启动画
                tile.classList.add('kpi-flash');
            }
            // 对一张卡内的整数读数（媒体计数、今日播放等）做滚动入场。
            function enliven(scope) {
                if (reduce || !scope) return;
                scope.querySelectorAll('.a-count b').forEach(function (b) {
                    const fin = b.textContent;
                    if (parse(fin)) { b.textContent = '0'; countUp(b, fin); }
                });
                scope.querySelectorAll('.a-stat-val').forEach(function (v) {
                    const fin = v.textContent.trim();
                    // 仅滚动纯整数（如 今日播放 1842）；带单位/文案的（如 "12.4 GB"、"测速中"）跳过。
                    if (/^[\d,]+$/.test(fin)) { v.textContent = '0'; countUp(v, fin); }
                });
            }
            // 全队列操作时，金色扫描线掠过整片节点栅格一次。
            function gridScan() {
                if (reduce) return;
                const grid = document.getElementById('list-grid');
                if (!grid) return;
                grid.classList.remove('is-scanning');
                void grid.offsetWidth;
                grid.classList.add('is-scanning');
                setTimeout(function () { grid.classList.remove('is-scanning'); }, 1250);
            }
            return { countUp: countUp, flash: flash, enliven: enliven, gridScan: gridScan };
        })();
        window.LiveMotion = LiveMotion;

        const DEFAULT_ICON_URL = 'https://emby-icon.vercel.app/TFEL-Emby.json';
        let globalIcons = [];
        let proxyNodesForPing = [];
        let sortableInstance = null;
        let trendChartInstance = null;
        let locationChartInstance = null;

        // 设置 Chart.js 响应暗色模式
        // Chart.js 只在统计里用到：按需加载、钉死版本并带 SRI，不再阻塞每个页面的首屏。
        let _chartJsReq = null;
        function ensureChartJs() {
            if (window.Chart) return Promise.resolve();
            if (!_chartJsReq) _chartJsReq = new Promise(function (resolve, reject) {
                const sc = document.createElement('script');
                sc.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js';
                sc.integrity = 'sha384-jb8JQMbMoBUzgWatfe6COACi2ljcDdZQ2OxczGA3bGNeWe+6DChMTBJemed7ZnvJ';
                sc.crossOrigin = 'anonymous';
                sc.onload = resolve;
                sc.onerror = function () { _chartJsReq = null; reject(new Error('图表库加载失败')); };
                document.head.appendChild(sc);
            });
            return _chartJsReq;
        }
        function updateChartColors() {
            if (!window.Chart) return;
            const cs = getComputedStyle(document.body);
            // 刻度文字用 --text-sec（两套主题都过 AA），网格线用 hairline token。
            Chart.defaults.color = cs.getPropertyValue('--text-sec').trim() || '#6e6e73';
            Chart.defaults.borderColor = cs.getPropertyValue('--hairline').trim() || 'rgba(0,0,0,0.06)';
            // 图表字体跟随 App 字体栈，不再用 Chart.js 默认无衬线。
            Chart.defaults.font.family = cs.getPropertyValue('--font-sans').trim()
                || '-apple-system, "SF Pro SC", "PingFang SC", system-ui, sans-serif';
            const primary = (cs.getPropertyValue('--primary') || '#0074cf').trim();
            const primarySoft = (cs.getPropertyValue('--primary-soft') || 'rgba(0,116,207,0.1)').trim();
            if (trendChartInstance && trendChartInstance.data && trendChartInstance.data.datasets[0]) {
                trendChartInstance.data.datasets[0].borderColor = primary;
                trendChartInstance.data.datasets[0].backgroundColor = primarySoft;
            }
        }

        // 节点状态徽章：可达性优先（服务端探针判离线 → 离线），其次才是播放活跃度。
        function nodeBadgeHtml(statusClass) {
            if (statusClass === 'live') return '<span class="node-badge is-online"><span class="bdot"></span>播放中</span>';
            if (statusClass === 'up') return '<span class="node-badge is-online"><span class="bdot"></span>在线</span>';
            if (statusClass === 'warn') return '<span class="node-badge is-slow"><span class="bdot"></span>延迟</span>';
            if (statusClass === 'offline') return '<span class="node-badge is-offline"><span class="bdot"></span>离线</span>';
            return '<span class="node-badge is-idle"><span class="bdot"></span>空闲</span>';
        }

        // 迷你 SVG 折线图: 数据缺失时占位
        function nodeSparklineHtml(points) {
            var data = (points || []).filter(function (n) { return typeof n === 'number' && isFinite(n); });
            if (data.length < 2) return '';   // 没有趋势就不画占位框：六个虚线「暂无数据」只是噪音
            var W = 100, H = 38, pad = 3;
            var max = Math.max.apply(null, data), min = Math.min.apply(null, data);
            var range = (max - min) || 1;
            var step = W / (data.length - 1);
            var pts = data.map(function (v, i) {
                var x = (i * step).toFixed(1);
                var y = (pad + (H - 2 * pad) * (1 - (v - min) / range)).toFixed(1);
                return x + ',' + y;
            });
            var line = pts.join(' ');
            var area = '0,' + H + ' ' + line + ' ' + W + ',' + H;
            return '<svg class="node-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
                   '<polygon class="sk-area" points="' + area + '"/>' +
                   '<polyline class="sk-line" points="' + line + '"/></svg>';
        }

        // 拉取近 7 天每日流量并回填到每张节点卡的 sparkline 容器
        async function loadRouteTrends() {
            try {
                const res = await fetch('/api/route-trends?days=7');
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !data.ok || !Array.isArray(data.items)) return;
                for (const it of data.items) {
                    if (!it || !it.prefix || !Array.isArray(it.bytes)) continue;
                    const sel = '[data-spark="' + CSS.escape(it.prefix) + '"]';
                    const slot = document.querySelector('.a-spark-slot' + sel + ', .nr-spark' + sel);
                    if (!slot) continue;
                    slot.innerHTML = nodeSparklineHtml(it.bytes);
                }
            } catch (e) { /* 静默降级：保留占位 */ }
        }

        // =====================================
        // 数据大屏与统计逻辑 (适配手机端表格排版)
        // =====================================
        // 兼容旧入口: 切到数据统计分区
        function openDashboard() { showSection('stats'); }

        // Doughnut palette — azure signal + status hues, theme-aware, no off-palette purple/pink.
        function pieColors() {
            const cs = getComputedStyle(document.body);
            const v = (n, f) => (cs.getPropertyValue(n) || f).trim();
            return [ v('--primary','#0074cf'), v('--ok','#1e9e57'), v('--warn','#c47d12'),
                     v('--err','#d70015'), v('--text-sec','#6e6e73'), v('--text-ter','#8e8e93') ];
        }

        // 屏幕阅读器专用的图表数据表替代（caption/headers 为静态安全串，单元格转义）。
        function buildSrTable(caption, headers, rows) {
            let h = '<table><caption>' + caption + '</caption><thead><tr>'
                + headers.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>';
            h += rows.map(r => '<tr>' + r.map(c => '<td>' + _embyEscape(String(c)) + '</td>').join('') + '</tr>').join('');
            return h + '</tbody></table>';
        }

        // 日志表：缓存最近记录 + 时间列可排序，无需重新拉取。
        let _statsRecents = [];
        let _logSortDir = 'desc'; // 默认最新在前
        function updateLogSortInd() {
            const th = document.getElementById('logSortTh');
            if (th) th.setAttribute('aria-sort', _logSortDir === 'asc' ? 'ascending' : 'descending');
        }
        function setLogSort() {
            _logSortDir = (_logSortDir === 'desc' ? 'asc' : 'desc');
            renderLogRows();
        }
        function renderLogRows() {
            const tbody = document.getElementById('logTableBody');
            if (!tbody) return;
            if (!_statsRecents.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="cell-loading">暂无日志记录</td></tr>';
                updateLogSortInd(); return;
            }
            const rows = _statsRecents.slice().sort((a, b) => {
                const ta = String(a.timestamp || ''), tb = String(b.timestamp || '');
                const d = ta < tb ? -1 : (ta > tb ? 1 : 0);
                return _logSortDir === 'asc' ? d : -d;
            });
            tbody.innerHTML = rows.map(log => {
                const isChina = log.country === 'CN';
                const geo = isChina ? '中国大陆' : _embyEscape(log.country || 'Unknown');
                return '<tr>'
                    + '<td data-label="访问时间" class="log-time">' + _embyEscape(log.timestamp) + '</td>'
                    + '<td data-label="目标节点"><span class="badge is-accent">' + _embyEscape(log.prefix) + '</span></td>'
                    + '<td data-label="真实 IP" class="log-ip">' + _embyEscape(log.ip) + '</td>'
                    + '<td data-label="归属地"><span class="badge is-neutral">' + geo + '</span></td>'
                    + '<td data-label="设备标识 (UA)" class="log-ua" title="' + _embyEscape(log.ua) + '">' + _embyEscape(log.ua) + '</td>'
                    + '</tr>';
            }).join('');
            updateLogSortInd();
        }

        async function loadDashboardData() {

            function parseTrafficToBytes(str) {
                if (!str || str === '0 B' || str.includes('异常') || str.includes('获取')) return 0;
                let val = parseFloat(str);
                if (str.includes('TB')) return val * 1099511627776;
                if (str.includes('GB')) return val * 1073741824;
                if (str.includes('MB')) return val * 1048576;
                if (str.includes('KB')) return val * 1024;
                return val;
            }

            let top5Container = document.getElementById('top5-simple-container');
            if (!top5Container) {
                top5Container = document.createElement('div');
                top5Container.id = 'top5-simple-container';
                const statsSec = document.getElementById('sec-stats');
                const wrapper = statsSec ? statsSec.querySelector('.table-wrapper') : document.querySelector('.table-wrapper');
                if(wrapper && wrapper.previousElementSibling) {
                    wrapper.parentNode.insertBefore(top5Container, wrapper.previousElementSibling);
                }
            }
            
            let top5Html = '';

            // ==========================================
            // 核心优化：听你的天才思路直接去网页现有的卡片里“抓取”数据，绝不等待变量
            // ==========================================
            const domCards = document.querySelectorAll('.route-item');
            let scrapedNodes = [];
            
            domCards.forEach(card => {
                const prefix = card.getAttribute('data-prefix') || '未知';
                let remark = prefix;
                const searchAttr = card.getAttribute('data-search');
                if (searchAttr) {
                    remark = searchAttr.replace(new RegExp(' ' + prefix + '$'), '').trim();
                }

                let bandwidth = '0 B';
                // 遍历卡片里所有的文本，找出带有流量单位的那个文本
                const spans = card.querySelectorAll('span');
                spans.forEach(span => {
                    const txt = span.innerText || '';
                    // 匹配例如: 1.5 GB, 500 MB, 0 B (双斜杠防转义丢失)
                    if (/^[\d.]+\s*(TB|GB|MB|KB|B)$/i.test(txt.trim())) {
                        bandwidth = txt.trim();
                    }
                });

                scrapedNodes.push({ prefix: prefix, remark: remark, todayBandwidth: bandwidth });
            });

            // 用抓取下来的真实数据直接计算 TOP 5，渲染成水平带宽条排行（数字即主角）
            if (scrapedNodes.length > 0) {
                const validNodes = scrapedNodes.filter(r => parseTrafficToBytes(r.todayBandwidth) > 0);
                const top5 = validNodes.sort((a, b) => parseTrafficToBytes(b.todayBandwidth) - parseTrafficToBytes(a.todayBandwidth)).slice(0, 5);

                if (top5.length > 0) {
                    const maxBytes = parseTrafficToBytes(top5[0].todayBandwidth) || 1;
                    top5Html = '<div class="top5-box">';
                    top5.forEach((r, idx) => {
                        const bytes = parseTrafficToBytes(r.todayBandwidth);
                        const ratio = Math.max(0.03, Math.min(1, bytes / maxBytes));
                        const scale = Math.round(ratio * 1000) / 1000;
                        top5Html += '<div class="top5-row' + (idx === 0 ? ' is-top' : '') + '">'
                            + '<span class="top5-rank">' + (idx + 1) + '</span>'
                            + '<div class="top5-main">'
                            +   '<div class="top5-name">' + _embyEscape(r.remark) + ' <span class="top5-prefix">/' + _embyEscape(r.prefix) + '</span></div>'
                            +   '<div class="top5-bar"><div class="top5-bar-fill" style="transform:scaleX(' + scale + ')"></div></div>'
                            + '</div>'
                            + '<span class="top5-value">' + _embyEscape(r.todayBandwidth) + '</span>'
                            + '</div>';
                    });
                    top5Html += '</div>';
                } else {
                    top5Html = '<div class="top5-box"><div class="top5-empty">今日暂无节点产生流量</div></div>';
                }
            } else {
                top5Html = '<div class="top5-box"><div class="top5-empty">还没有反代节点</div></div>';
            }

            // 瞬间把 TOP 5 写入网页
            top5Container.innerHTML = top5Html;


            // ==========================================
            // 🌟 正常加载下面的图表数据 (带有10秒防卡死超时保护)
            // ==========================================
            document.getElementById('logTableBody').innerHTML = '<tr><td colspan="5" class="cell-loading">数据分析引擎计算中...</td></tr>';
            document.getElementById('trafficToday').innerText = '拉取中...';
            document.getElementById('traffic7d').innerText = '拉取中...';
            document.getElementById('traffic30d').innerText = '拉取中...';

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const res = await fetch('/api/analytics', { signal: controller.signal });
                clearTimeout(timeoutId);
                
                const data = await res.json();
                if(!data.success) throw new Error(data.error);

                document.getElementById('trafficToday').innerText = data.trafficToday || '未知';
                document.getElementById('traffic7d').innerText = data.traffic7d || '未知';
                document.getElementById('traffic30d').innerText = data.traffic30d || '未知';
                // 三格都「未配置」时，一条说明代替三个谜语。
                const envNote = document.getElementById('statsEnvNote');
                if (envNote) envNote.hidden = !(/未配置/.test(data.trafficToday || '') && /未配置/.test(data.traffic30d || ''));
                // 统计数据到位后刷新运维看板「今日流量」信号(看板预取/懒加载完成时回填)
                if (typeof updateAuroraKpis === 'function') updateAuroraKpis();

                await ensureChartJs();
                updateChartColors();

                const cs2 = getComputedStyle(document.body);
                const primaryCol = (cs2.getPropertyValue('--primary') || '#0074cf').trim();

                // ---- 趋势折线：竖向渐变面积 + 克制网格 + hover 索引 tooltip ----
                const labels = data.trend.map(i => i.date.substring(5));
                const counts = data.trend.map(i => i.count);
                const trendCtx = document.getElementById('trendChart').getContext('2d');
                const grad = trendCtx.createLinearGradient(0, 0, 0, 240);
                grad.addColorStop(0, (cs2.getPropertyValue('--primary-soft') || 'rgba(0,116,207,0.18)').trim());
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                if(trendChartInstance) trendChartInstance.destroy();
                trendChartInstance = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{ label: '有效播放', data: counts, borderColor: primaryCol, backgroundColor: grad, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2.5, pointHoverRadius: 5, pointBackgroundColor: primaryCol, pointBorderWidth: 0 }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { display: false }, title: { display: false },
                            tooltip: { displayColors: false, padding: 10, callbacks: { label: (c) => ' 有效播放 ' + c.parsed.y + ' 次' } }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 5 }, grid: { drawTicks: false } },
                            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } }
                        }
                    }
                });
                const trendTbl = document.getElementById('trendTable');
                if (trendTbl) trendTbl.innerHTML = buildSrTable('近 7 天播放趋势', ['日期', '有效播放(次)'], data.trend.map(i => [i.date, i.count]));

                // ---- 来源地环形：自定义图例 + 百分比，颜色不作唯一区分 ----
                const locLabels = data.locations.map(i => i.country === 'CN' ? '中国大陆' : (i.country || '未知'));
                const locCounts = data.locations.map(i => i.count);
                const locCols = pieColors();
                const locTotal = locCounts.reduce((a, b) => a + b, 0) || 1;
                const locCtx = document.getElementById('locationChart').getContext('2d');
                if(locationChartInstance) locationChartInstance.destroy();
                locationChartInstance = new Chart(locCtx, {
                    type: 'doughnut',
                    data: {
                        labels: locLabels,
                        datasets: [{ data: locCounts, backgroundColor: locCols, borderWidth: 0, hoverOffset: 6 }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false, cutout: '62%',
                        plugins: {
                            legend: { display: false }, title: { display: false },
                            tooltip: { callbacks: { label: (c) => ' ' + c.label + ' · ' + c.parsed + ' (' + ((c.parsed / locTotal) * 100).toFixed(1) + '%)' } }
                        }
                    }
                });
                const locLegend = document.getElementById('locLegend');
                if (locLegend) {
                    locLegend.innerHTML = locLabels.map((name, i) => {
                        const pct = (locCounts[i] / locTotal) * 100;
                        const pctStr = pct >= 10 ? pct.toFixed(0) : pct.toFixed(1);
                        return '<div class="leg-row"><span class="leg-sw" style="background:' + locCols[i % locCols.length] + '"></span>'
                            + '<span class="leg-name">' + _embyEscape(name) + '</span><span class="leg-pct">' + pctStr + '%</span></div>';
                    }).join('');
                }
                const locTbl = document.getElementById('locTable');
                if (locTbl) locTbl.innerHTML = buildSrTable('访客来源地占比', ['来源地', '访客数'], data.locations.map(i => [i.country === 'CN' ? '中国大陆' : (i.country || '未知'), i.count]));

                // ---- 日志：缓存 + 渲染（可排序）----
                _statsRecents = Array.isArray(data.recents) ? data.recents : [];
                renderLogRows();

            } catch (e) {
                const errMsg = e.name === 'AbortError' ? '网络超时，CF 接口拥堵，请稍后重试' : e.message;
                document.getElementById('logTableBody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--err); padding: 30px;">独立图表数据拉取失败: ${errMsg}</td></tr>`;
            }
        }

        function closeDashboard() { showSection('overview'); }

        function openWorkerUpdate() {
            const m = document.getElementById('workerUpdateModal');
            if (!m) return;
            m.style.display = 'block';
            modalOpened('workerUpdateModal', '#codeArea');
        }
        function closeWorkerUpdate() {
            const m = document.getElementById('workerUpdateModal');
            if (!m) return;
            m.style.display = 'none';
            modalClosed('workerUpdateModal');
        }

        async function loadIcons(forceUrl = null) {
            const grid = document.getElementById('iconGrid');
            grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-sec); font-size: var(--text-md); text-align: center;">加载图标库中...</div>';
            const targetUrl = forceUrl || localStorage.getItem('custom_icon_url') || DEFAULT_ICON_URL;
            const urlInput = document.getElementById('customIconUrlInput');
            if (urlInput) urlInput.value = targetUrl === DEFAULT_ICON_URL ? '' : targetUrl;
            try {
                const res = await fetch(targetUrl);
                const data = await res.json();
                if (data && data.icons && Array.isArray(data.icons)) {
                    globalIcons = data.icons;
                } else if (Array.isArray(data)) {
                    globalIcons = data;
                } else {
                    globalIcons = [];
                    for (const [key, val] of Object.entries(data)) { globalIcons.push({ name: key, url: val }); }
                }
                renderIconGrid('');
            } catch(e) { 
                grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--err); font-size: var(--text-md); text-align: center;">获取图标库失败，请检查链接或网络状态</div>';
            }
        }

        function setCustomIconLibrary() {
            const url = document.getElementById('customIconUrlInput').value.trim();
            if (!url) return showToast('请输入图标库 JSON 链接');
            if (!url.startsWith('http')) return showToast('请输入合法的 URL');
            localStorage.setItem('custom_icon_url', url);
            showToast('正在加载自定义图标库...');
            loadIcons(url);
        }

        function resetIconLibrary() {
            localStorage.removeItem('custom_icon_url');
            document.getElementById('customIconUrlInput').value = '';
            showToast('已恢复默认图标库');
            loadIcons(DEFAULT_ICON_URL);
        }

        function renderIconGrid(filterText) {
            const grid = document.getElementById('iconGrid');
            const lowerFilter = filterText.toLowerCase();
            const filtered = globalIcons.filter(item => (item.name || '').toLowerCase().includes(lowerFilter));
            let html = `<div class="icon-item" onclick="selectIcon('', '默认')" title="使用默认图标"><svg class="icon-item-default" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-film"/></svg></div>`;
            filtered.forEach(item => {
                const url = _embyEscape(item.url || ''), name = _embyEscape(item.name || '图标');
                html += `<div class="icon-item" onclick="selectIcon('${url}', '${name}')" title="${name}">
                            <img src="${url}" alt="${name}" loading="lazy" class="icon-item-img">
                        </div>`;
            });
            grid.innerHTML = html;
        }

        function filterIcons() { renderIconGrid(document.getElementById('iconSearch').value); }

        function toggleIconPicker(e) {
            e.stopPropagation();
            const panel = document.getElementById('iconPickerPanel');
            const open = panel.style.display === 'none';
            panel.style.display = open ? 'flex' : 'none';
            const btn = document.getElementById('iconSelectBtn');
            if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        function selectIcon(url, name) {
            document.getElementById('iconUrl').value = url;
            const def = document.getElementById('iconDefault');
            const text = document.getElementById('iconSelectText');
            // 预览图只在真有 URL 时才创建：空 src 的 <img> 会发一次无效请求。
            let preview = document.getElementById('iconPreview');
            if (url && !preview) {
                preview = document.createElement('img');
                preview.id = 'iconPreview'; preview.alt = ''; preview.className = 'a-pick-img';
                def.before(preview);
            }
            if(url) {
                preview.src = url; def.style.display = 'none';
                text.textContent = name; text.style.color = 'var(--text)';
            } else {
                if (preview) preview.remove();
                def.style.display = 'block';
                text.textContent = '点击选择图标 (默认)'; text.style.color = 'var(--text-sec)';
            }
            document.getElementById('iconPickerPanel').style.display = 'none';
            const _ib = document.getElementById('iconSelectBtn'); if (_ib) _ib.setAttribute('aria-expanded', 'false');
        }

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('iconPickerPanel');
            const btn = document.getElementById('iconSelectBtn');
            if (panel && btn && panel.style.display !== 'none') {
                if (!panel.contains(e.target) && !btn.contains(e.target)) panel.style.display = 'none';
            }
        });

        // ===== 三态主题系统: auto / light / dark =====
        var __themeMql = window.matchMedia('(prefers-color-scheme: dark)');

        function getThemePref() {
            // 旧键一次性迁移
            var legacy = localStorage.getItem('emby_proxy_dark');
            if (legacy !== null && !localStorage.getItem('emby_theme')) {
                localStorage.setItem('emby_theme', legacy === '1' ? 'dark' : 'light');
                localStorage.removeItem('emby_proxy_dark');
            }
            return localStorage.getItem('emby_theme') || 'auto';
        }

        function resolveDark(pref) {
            if (pref === 'dark') return true;
            if (pref === 'light') return false;
            return __themeMql.matches; // auto
        }

        function applyTheme(pref) {
            var dark = resolveDark(pref);
            document.body.classList.toggle('dark', dark);
            var btn = document.getElementById('themeToggle');
            if (btn) {
                var titleMap = { auto: '主题: 跟随系统', light: '主题: 浅色', dark: '主题: 深色' };
                btn.dataset.theme = pref;
                btn.title = titleMap[pref] || '切换主题';
                btn.setAttribute('aria-label', titleMap[pref] || '切换主题');
            }
            if (typeof trendChartInstance !== 'undefined' && trendChartInstance) {
                updateChartColors(); trendChartInstance.update();
                if (locationChartInstance) locationChartInstance.update();
            }
        }

        function toggleDarkMode() {
            // 循环 auto → light → dark → auto
            var order = ['auto', 'light', 'dark'];
            var cur = getThemePref();
            var next = order[(order.indexOf(cur) + 1) % order.length];
            localStorage.setItem('emby_theme', next);
            applyTheme(next);
        }

        __themeMql.addEventListener('change', function () {
            if (getThemePref() === 'auto') applyTheme('auto');
        });

        applyTheme(getThemePref());

        // ===== Operations Cockpit 导航：3 目的地 + 内层 tab =====
        var __statsInited = false;
        // 目的地 → 子分区(沿用现有 .app-section data-section key)
        var DEST_MAP = {
            monitor: { label: '监控', tabs: [ { key: 'overview', label: '看板' }, { key: 'stats', label: '统计' } ] },
            network: { label: '网络', tabs: [ { key: 'speed', label: '测速 & DNS', section: 'speed', panel: 'speed' }, { key: 'cdn', label: '优选 CDN', section: 'speed', panel: 'cdn' }, { key: 'redirect', label: '重定向白名单', section: 'speed', panel: 'redirect' } ] },
            config:  { label: '配置', tabs: [ { key: 'settings', label: '部署节点' }, { key: 'global', label: '全局设置' }, { key: 'viewers', label: '观看账号' }, { key: 'tools', label: '工具箱' }, { key: 'danger', label: '危险区' } ] }
        };
        function destOfSection(key) {
            for (var d in DEST_MAP) {
                var tabs = DEST_MAP[d].tabs;
                for (var i = 0; i < tabs.length; i++) if (tabs[i].key === key) return d;
            }
            return 'monitor';
        }
        function renderSubtabs(dest, activeTab) {
            var bar = document.getElementById('subtabBar');
            if (!bar) return;
            var tabs = DEST_MAP[dest] ? DEST_MAP[dest].tabs : [];
            bar.innerHTML = tabs.map(function (t) {
                var on = t.key === activeTab;
                return '<button type="button" class="subtab' + (on ? ' is-active' : '') + '" role="tab" aria-selected="' + (on ? 'true' : 'false') + '" data-tab="' + t.key + '" onclick="showDest(\'' + dest + '\',\'' + t.key + '\')">' + t.label + '</button>';
            }).join('');
            // 单 tab 目的地(网络)暂不显示 tab 条，留到 task6 拆分子 tab
            bar.style.display = tabs.length > 1 ? 'flex' : 'none';
        }
        // opts.replace：启动/后退时改写当前历史项；用户点击则压入新项，让「返回」回到上一个视图。
        function showDest(dest, tab, opts) {
            if (!DEST_MAP[dest]) dest = 'monitor';
            var tabs = DEST_MAP[dest].tabs;
            var tabObj = null;
            for (var i = 0; i < tabs.length; i++) if (tabs[i].key === tab) tabObj = tabs[i];
            if (!tabObj) { tabObj = tabs[0]; tab = tabObj.key; }
            var section = tabObj.section || tab;   // 子tab 可映射到同一 .app-section（如网络的 speed/cdn/redirect）
            var __apply = function () {
                document.querySelectorAll('.app-section').forEach(function (sec) {
                    var on = sec.getAttribute('data-section') === section;
                    sec.classList.toggle('is-active', on);
                    sec.style.display = on ? 'block' : 'none';
                });
                // 网络目的地：同一 speed 分区内按子tab 切换 .net-panel
                document.querySelectorAll('.net-panel').forEach(function (p) {
                    p.style.display = (p.getAttribute('data-net-panel') === (tabObj.panel || tab)) ? '' : 'none';
                });
                document.querySelectorAll('.dest-item').forEach(function (n) {
                    var on = n.getAttribute('data-dest') === dest;
                    n.classList.toggle('is-active', on);
                    if (on) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
                });
                var bar = document.getElementById('mobileTabBar');
                if (bar) bar.querySelectorAll('button[data-dest]').forEach(function (b) {
                    var on = b.getAttribute('data-dest') === dest;
                    b.classList.toggle('active', on);
                    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
                });
                renderSubtabs(dest, tab);
                try {
                    var title = window.__iosSectionTitles ? (window.__iosSectionTitles[tab] || '') : '';
                    var compact = document.getElementById('mobileTopbarCompact');
                    if (compact) compact.textContent = title;
                    var tbSlot = document.getElementById('tbSectionTitle');
                    if (tbSlot) tbSlot.textContent = title;
                    if (document.body) document.body.classList.remove('is-scrolled');
                } catch (e) {}
                try { localStorage.setItem('emby_active_section', tab); localStorage.setItem('emby_active_dest', dest); } catch (e) {}
                if (tab === 'viewers') loadViewers();
                if (tab === 'stats') {
                    if (!window.__statsLoaded) { window.__statsLoaded = true; loadDashboardData(); }
                    else { setTimeout(function () {
                        if (trendChartInstance) trendChartInstance.resize();
                        if (locationChartInstance) locationChartInstance.resize();
                    }, 60); }
                }
                var h = dest + '/' + tab;
                if (location.hash.slice(1) !== h) {
                    if (opts && opts.replace) history.replaceState(null, '', '#' + h);
                    else history.pushState(null, '', '#' + h);
                }
            };
            // View Transitions API: 跨视图淡入(渐进增强，reduced-motion / 不支持时瞬切)
            var __vtReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (document.startViewTransition && !__vtReduce) {
                try { document.startViewTransition(__apply); } catch (e) { __apply(); }
            } else { __apply(); }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // ===== 观看账号 (Viewers) =====
        var __viewers = { viewers: [], nodes: [] };
        function vEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
        async function viewerApi(method, path, body) {
            var res = await fetch(path, { method: method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
            var data = await res.json().catch(function () { return { success: false, error: 'HTTP ' + res.status }; });
            if (!data.success) { showError(data.error || '操作失败'); throw new Error(data.error || 'failed'); }
            return data;
        }
        async function loadViewers() {
            try { __viewers = await viewerApi('GET', '/api/viewers'); } catch (e) {
                document.getElementById('viewerList').innerHTML = '<div class="vw-group vw-empty">读取失败<button type="button" class="btn-tier is-sm" onclick="loadViewers()">重试</button></div>';
                return;
            }
            renderViewers();
        }
        function vwSwitch(label, checked, onchange, text) {
            // 真复选框（视觉隐藏）+ .ios-switch 外观；请求期间禁用，重新渲染时恢复。
            return '<label class="vw-switch">' + (text ? '<span>' + text + '</span>' : '') + '<input type="checkbox" class="switch-input" role="switch" aria-label="' + label + '"' + (checked ? ' checked' : '') +
                ' onchange="this.disabled=true; ' + onchange + '"><span class="ios-switch" aria-hidden="true"></span></label>';
        }
        function vwNodeName(n, prefix) {
            return '<span class="vw-node-name"><span class="vw-name">' + vEsc(n && n.remark || prefix) + '</span><span class="vw-prefix">/' + vEsc(prefix) + '</span></span>';
        }
        function renderViewers() {
            var used = {}, byPrefix = {};
            __viewers.nodes.forEach(function (n) { byPrefix[n.prefix] = n; });
            __viewers.viewers.forEach(function (v) { v.access.forEach(function (a) { used[a.prefix] = (used[a.prefix] || 0) + a.quota; }); });

            document.getElementById('viewerNodes').innerHTML = __viewers.nodes.map(function (n) {
                var p = vEsc(n.prefix), cap = n.max_concurrent || 0, u = used[n.prefix] || 0;
                var load = cap > 0
                    ? '<span class="vw-meter' + (u >= cap ? ' is-full' : '') + '" aria-hidden="true"><i style="width:' + Math.min(100, u / cap * 100) + '%"></i></span><span class="vw-cap-num">已分配 <b>' + u + '</b> / ' + cap + '</span>'
                    : '<span class="vw-cap-num vw-grow">已分配 <b>' + u + '</b> · 不限</span>';
                return '<div class="vw-node' + (n.viewers_enabled ? '' : ' is-off') + '">' +
                    '<div class="vw-node-top">' + vwNodeName(n, n.prefix) + vwSwitch('/' + p + ' 开启观看账号', n.viewers_enabled, 'saveNode(\'' + p + '\', { viewers_enabled: this.checked })') + '</div>' +
                    '<div class="vw-node-cap">' + load +
                    '<label class="vw-field">上限<input class="ns-input vw-num" type="number" min="0" inputmode="numeric" value="' + cap + '" aria-label="/' + p + ' 并发上限" onchange="saveNode(\'' + p + '\', { max_concurrent: Number(this.value) })"></label></div>' +
                    '</div>';
            }).join('') || '<div class="vw-empty">还没有节点<button type="button" class="btn-tier is-sm" onclick="showDest(\'config\', \'settings\')">去部署节点</button></div>';

            var enabled = __viewers.nodes.filter(function (n) { return n.viewers_enabled; });
            document.getElementById('viewerCount').textContent = __viewers.viewers.length ? __viewers.viewers.length + ' 个' : '';
            document.getElementById('viewerList').innerHTML = __viewers.viewers.map(function (v) {
                var id = vEsc(v.id), name = vEsc(v.username), total = 0;
                var access = v.access.map(function (a) {
                    var p = vEsc(a.prefix), hid = a.hidden_libraries.length;
                    total += a.quota;
                    return '<div class="vw-acc">' + vwNodeName(byPrefix[a.prefix], a.prefix) +
                        '<label class="vw-field vw-acc-q">并发<input class="ns-input vw-num" type="number" min="0" inputmode="numeric" value="' + a.quota + '" aria-label="' + name + ' 在 /' + p + ' 的并发配额" onchange="grantViewer(\'' + id + '\', \'' + p + '\', this.value)"></label>' +
                        '<button type="button" class="btn-tier is-sm is-ghost vw-acc-libs" aria-expanded="false" onclick="editViewerLibraries(\'' + id + '\', \'' + p + '\', this)"><svg><use href="#i-film"/></svg>首页媒体库' + (hid ? '<span class="vw-hid">隐藏 ' + hid + '</span>' : '') + '</button>' +
                        '<button type="button" class="a-icon-btn is-md danger-hover vw-acc-rm" aria-label="移除 ' + name + ' 在 /' + p + ' 的访问" title="移除访问" onclick="revokeViewer(\'' + id + '\', \'' + p + '\')"><svg><use href="#i-x"/></svg></button>' +
                        '</div><div class="vw-libs" data-for="' + id + '|' + p + '" hidden></div>';
                }).join('');
                // 只列出还没授权的已开启节点：对已授权节点再授权会把配额重置为 1。
                var granted = v.access.map(function (a) { return a.prefix; });
                var opts = enabled.filter(function (n) { return granted.indexOf(n.prefix) < 0; }).map(function (n) {
                    return '<option value="' + vEsc(n.prefix) + '">' + vEsc(n.remark || n.prefix) + ' /' + vEsc(n.prefix) + '</option>';
                }).join('');
                var grant = opts
                    ? '<select class="ns-input" id="grant-' + id + '" aria-label="为 ' + name + ' 授权节点">' + opts + '</select>' +
                      '<button type="button" class="btn-tier is-sm" onclick="grantViewer(\'' + id + '\', document.getElementById(\'grant-' + id + '\').value, 1)"><svg><use href="#i-plus"/></svg>授权节点</button>'
                    : '<span class="vw-note">' + (enabled.length ? '已开启的节点均已授权' : '还没有开启观看账号的节点，先在「节点」里开启') + '</span>';
                var meta = v.access.length ? v.access.length + ' 个节点 · 并发 ' + total : '未授权任何节点';
                return '<article class="vw-group vw-card' + (v.enabled ? '' : ' is-off') + '">' +
                    '<header class="vw-card-head"><div class="vw-who"><span class="vw-user">' + name + (v.enabled ? '' : '<span class="badge is-neutral">已停用</span>') + '</span><span class="vw-meta">' + meta + '</span></div>' +
                    '<div class="vw-actions">' + vwSwitch('启用 ' + name, v.enabled, 'toggleViewer(\'' + id + '\', this.checked)', '启用') +
                    '<button type="button" class="btn-tier is-sm is-ghost" aria-expanded="false" onclick="toggleViewerPw(\'' + id + '\', this)"><svg><use href="#i-key"/></svg>改密码</button>' +
                    '<button type="button" class="btn-tier is-sm is-ghost vw-danger" onclick="deleteViewer(\'' + id + '\')"><svg><use href="#i-trash"/></svg>删除</button></div></header>' +
                    '<form class="vw-pw" id="vwpw-' + id + '" hidden onsubmit="event.preventDefault(); resetViewerPassword(\'' + id + '\', this);">' +
                    '<input class="ns-input" type="password" minlength="6" required autocomplete="new-password" aria-label="' + name + ' 的新密码" placeholder="新密码（至少 6 位）">' +
                    '<button type="submit" class="btn-tier is-sm is-primary">保存</button><span class="vw-note">该账号所有设备将被登出</span></form>' +
                    access + '<div class="vw-grant">' + grant + '</div></article>';
            }).join('') || '<div class="vw-group vw-empty">还没有观看账号，在上方填写用户名和密码创建第一个</div>';
        }
        async function createViewer() {
            var name = document.getElementById('viewerNewName'); var pass = document.getElementById('viewerNewPass');
            try { await viewerApi('POST', '/api/viewers', { username: name.value.trim(), password: pass.value }); } catch (e) { return; }
            name.value = ''; pass.value = ''; showToast('已创建'); loadViewers();
        }
        async function toggleViewer(id, enabled) {
            try { await viewerApi('POST', '/api/viewers', { id: id, enabled: enabled }); } catch (e) { loadViewers(); return; }
            loadViewers();
        }
        function toggleViewerPw(id, btn) {
            var f = document.getElementById('vwpw-' + id);
            f.hidden = !f.hidden; btn.setAttribute('aria-expanded', String(!f.hidden));
            if (!f.hidden) f.querySelector('input').focus();
        }
        async function resetViewerPassword(id, form) {
            try { await viewerApi('POST', '/api/viewers', { id: id, password: form.querySelector('input').value }); } catch (e) { return; }
            form.reset(); form.hidden = true; showToast('密码已修改');
        }
        async function deleteViewer(id) {
            if (!await uiConfirm('删除该账号及其全部观看记录？不可恢复。', { danger: true })) return;
            try { await viewerApi('DELETE', '/api/viewers?id=' + encodeURIComponent(id)); } catch (e) { return; }
            loadViewers();
        }
        function viewerAccess(id, prefix) {
            var v = __viewers.viewers.find(function (x) { return x.id === id; });
            return v && v.access.find(function (a) { return a.prefix === prefix; });
        }
        async function grantViewer(id, prefix, quota, hidden) {
            if (!prefix) return;
            var cur = viewerAccess(id, prefix);
            try {
                await viewerApi('POST', '/api/viewers/access', { viewer_id: id, prefix: prefix, quota: Number(quota),
                    hidden_libraries: hidden || (cur ? cur.hidden_libraries : []) });
            } catch (e) { loadViewers(); return; }
            showToast('已保存'); loadViewers();
        }
        async function revokeViewer(id, prefix) {
            if (!await uiConfirm('移除该账号在 /' + prefix + ' 的访问权限？')) return;
            try { await viewerApi('DELETE', '/api/viewers/access?viewer_id=' + encodeURIComponent(id) + '&prefix=' + encodeURIComponent(prefix)); } catch (e) { return; }
            loadViewers();
        }
        async function saveNode(prefix, fields) {
            try { await viewerApi('POST', '/api/viewers/node', Object.assign({ prefix: prefix }, fields)); } catch (e) { loadViewers(); return; }
            showToast('已保存'); loadViewers();
        }
        async function editViewerLibraries(id, prefix, btn) {
            var box = document.querySelector('.vw-libs[data-for="' + id + '|' + prefix + '"]');
            if (!box) return;
            var show = function (on) { box.hidden = !on; btn.setAttribute('aria-expanded', String(on)); };
            if (!box.hidden) { show(false); return; }
            box.innerHTML = '<span class="vw-note">读取媒体库...</span>'; show(true);
            var data;
            try { data = await viewerApi('GET', '/api/viewers/libraries?prefix=' + encodeURIComponent(prefix)); } catch (e) { show(false); return; }
            var cur = viewerAccess(id, prefix);
            var hidden = cur ? cur.hidden_libraries : [];
            if (!data.libraries.length) { box.innerHTML = '<span class="vw-note">该节点没有媒体库</span>'; return; }
            box.innerHTML = '<p class="vw-note">勾选 = 在该账号的首页隐藏（搜索、继续观看不受影响）</p><div class="vw-lib-list">' +
                data.libraries.map(function (l) {
                    return '<label class="vw-lib"><input type="checkbox" value="' + vEsc(l.id) + '"' + (hidden.indexOf(l.id) >= 0 ? ' checked' : '') + '>' + vEsc(l.name) + '</label>';
                }).join('') + '</div><button type="button" class="btn-tier is-sm is-primary">保存</button>';
            box.querySelector('button').onclick = function () {
                var ids = Array.prototype.map.call(box.querySelectorAll('input:checked'), function (c) { return c.value; });
                grantViewer(id, prefix, cur ? cur.quota : 1, ids);
            };
        }

        // 兼容旧调用：showSection(sectionKey) → 解析所属目的地后切换
        function showSection(key) { showDest(destOfSection(key), key); }
        window.showDest = showDest;
        window.showSection = showSection;

        function toggleSidebar() {
            var sb = document.getElementById('appSidebar');
            if (!sb) return;
            var collapsed = sb.classList.toggle('collapsed');
            try { localStorage.setItem('emby_sidebar_collapsed', collapsed ? '1' : '0'); } catch (e) {}
        }

        (function initShellState() {
            try {
                if (localStorage.getItem('emby_sidebar_collapsed') === '1') {
                    var sb = document.getElementById('appSidebar');
                    if (sb) sb.classList.add('collapsed');
                }
            } catch (e) {}
            // 恢复目的地/子分区：优先 #dest/tab 深链，其次 localStorage，最后默认 monitor/overview
            var startDest = 'monitor', startTab = 'overview';
            try {
                var hash = (location.hash || '').slice(1);
                if (hash.indexOf('/') !== -1) {
                    var parts = hash.split('/');
                    if (DEST_MAP[parts[0]]) { startDest = parts[0]; startTab = parts[1] || DEST_MAP[parts[0]].tabs[0].key; }
                } else {
                    var savedTab = localStorage.getItem('emby_active_section');
                    if (savedTab) { startTab = savedTab; startDest = destOfSection(savedTab); }
                }
            } catch (e) {}
            // 延迟到 DOM 就绪后再切换
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () { showDest(startDest, startTab, { replace: true }); });
            } else { showDest(startDest, startTab, { replace: true }); }
            // 浏览器「返回」/ Android 返回手势：回到上一个目的地，而不是离开面板。
            window.addEventListener('popstate', function () {
                var p = (location.hash || '').slice(1).split('/');
                if (DEST_MAP[p[0]]) showDest(p[0], p[1], { replace: true });
            });
        })();

        // 成功 / 中性反馈 → #toast (role="status")，3 秒自动消隐。
        // 计时器句柄是模块级的：两条提示在 3 秒内相继出现时，后一条不会被前一条的
        // 定时器提前掐断。
        var _toastTimer = null;
        function showToast(msg) {
            const t = document.getElementById('toast');
            if (!t) return;
            t.classList.remove('is-error');
            t.textContent = msg; t.classList.add('show');
            clearTimeout(_toastTimer);
            _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
        }
        // 失败反馈 → #toastAlert (role="alert")，8 秒停留、可点击关闭。
        // 与成功提示分流：失败不该和"已保存"长得一样、也不该只停 3 秒。
        var _errTimer = null;
        function showError(msg) {
            const t = document.getElementById('toastAlert') || document.getElementById('toast');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show', 'is-error');
            if (!t.dataset.dismissWired) {
                t.dataset.dismissWired = '1';
                t.title = '点击关闭';
                t.addEventListener('click', function () { clearTimeout(_errTimer); t.classList.remove('show'); });
            }
            clearTimeout(_errTimer);
            _errTimer = setTimeout(() => t.classList.remove('show'), 8000);
        }
        window.showError = showError;

        async function purgeCache() {
            if(!await uiConfirm('确定要清理 Cloudflare 节点的全站海报和静态缓存吗？\n\n清理后可能导致短时间的加载缓慢。', { danger: true })) return;
            const btn = document.getElementById('btnPurge');
            const originalText = btn.textContent;
            btn.textContent = '正在清理...'; btn.disabled = true;
            LiveMotion.gridScan(); // 队列雷达扫描：全站海报刷新正在执行
            try {
                const res = await fetch('/api/purge-cache', { method: 'POST' });
                const data = await res.json();
                if(data.success) showToast('缓存已清理，新海报已生效');
                else showError('缓存清理失败：' + (data.error || '未知错误'));
            } catch(e) { showError('网络请求错误（' + e.message + '）'); } finally { btn.textContent = originalText; btn.disabled = false; }
        }

        function clearNodeSearch() {
            const box = document.getElementById('searchNode');
            if (box) { box.value = ''; box.focus(); }
            filterNodesList();
        }
        function filterNodesList() {
            const box = document.getElementById('searchNode');
            const raw = box ? box.value.trim() : '';
            const filterText = raw.toLowerCase();
            const cards = document.querySelectorAll('.route-item');
            let shown = 0;
            cards.forEach(card => {
                const searchStr = (card.getAttribute('data-search') || '').toLowerCase();
                const hit = searchStr.includes(filterText);
                card.style.display = hit ? '' : 'none';
                if (hit) shown++;
            });
            // 零命中不留白：说清搜的是什么，并给一个出口(沿用节点列表的空状态形态)。
            const grid = document.getElementById('list-grid');
            if (!grid) return;
            let empty = document.getElementById('nodeSearchEmpty');
            if (cards.length && shown === 0) {
                if (!empty) {
                    empty = document.createElement('div');
                    empty.id = 'nodeSearchEmpty';
                    empty.style.cssText = 'text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;';
                    grid.appendChild(empty);
                }
                empty.innerHTML = '没有匹配「' + _embyEscape(raw) + '」的节点'
                    + '<div style="margin-top:12px;"><button type="button" class="btn-tier is-sm" onclick="clearNodeSearch()">清除搜索</button></div>';
            } else if (empty) {
                empty.remove();
            }
        }
        window.clearNodeSearch = clearNodeSearch;

        function makeUpstreamRow(idx, value = '') {
            const isMain = idx === 0;
            const row = document.createElement('div');
            row.className = 'a-upstream-row';
            row.innerHTML = isMain
                ? '<span class="a-tag-pri">主源</span><input type="url" class="a-input target-input" placeholder="主线路地址 (如: http://1.1.1.1:8096)" required oninput="handleTargetInputs()">'
                : '<span class="a-tag-bk">备 ' + idx + '</span><input type="url" class="a-input target-input" placeholder="备用线路 ' + idx + ' (选填，主源挂掉时触发)" oninput="handleTargetInputs()">';
            const inp = row.querySelector('input');
            inp.value = value;
            return row;
        }

        function handleTargetInputs() {
            const container = document.getElementById('targetInputs');
            const inputs = container.querySelectorAll('.target-input');
            const lastInput = inputs[inputs.length - 1];
            if (lastInput && lastInput.value.trim() !== '') {
                container.appendChild(makeUpstreamRow(inputs.length));
            }
            let emptyCount = 0;
            const currentInputs = container.querySelectorAll('.target-input');
            for (let i = currentInputs.length - 1; i >= 0; i--) {
                if (currentInputs[i].value.trim() === '') {
                    emptyCount++;
                    if (emptyCount > 1) {
                        const wrapper = currentInputs[i].closest('.a-upstream-row');
                        (wrapper || currentInputs[i]).remove();
                    }
                } else { break; }
            }
            container.querySelectorAll('.a-upstream-row').forEach((row, idx) => {
                const tag = row.querySelector('.a-tag-pri, .a-tag-bk');
                const inp = row.querySelector('.target-input');
                if (idx === 0) {
                    if (tag) { tag.className = 'a-tag-pri'; tag.textContent = '主源'; }
                    if (inp) inp.placeholder = '主线路地址 (如: http://1.1.1.1:8096)';
                } else {
                    if (tag) { tag.className = 'a-tag-bk'; tag.textContent = '备 ' + idx; }
                    if (inp) inp.placeholder = '备用线路 ' + idx + ' (选填，主源挂掉时触发)';
                }
            });
        }

        function resetTargetInputs() {
            const container = document.getElementById('targetInputs');
            container.innerHTML = '';
            container.appendChild(makeUpstreamRow(0));
            container.appendChild(makeUpstreamRow(1));
        }

        function toggleVis(id, isArray = false) {
            const el = document.getElementById(id);
            if (el.classList.contains('secret-text')) {
                el.classList.remove('secret-text'); el.classList.add('actual-text');
                if (isArray) {
                    const arr = JSON.parse(decodeURIComponent(el.getAttribute('data-val')));
                    let html = '';
                    arr.forEach((t, i) => {
                        const tag = i === 0 ? '<span style="color:var(--ok);font-weight:bold;">[主]</span>' : '<span style="color:var(--warn);font-weight:bold;">[备]</span>';
                        html += `<div class="url-list-item">${tag} ${t}</div>`;
                    });
                    el.innerHTML = html;
                } else { el.textContent = el.getAttribute('data-val'); }
            } else {
                el.classList.add('secret-text'); el.classList.remove('actual-text'); el.textContent = '••••••••';
            }
        }

        function copyTxt(txt) { navigator.clipboard.writeText(txt).then(() => showToast('已复制')); }

        async function pingTarget(idx, targetUrl) {
            const pingEl = document.getElementById('ping-' + idx);
            if (!pingEl) return;
            pingEl.textContent = '测速中'; pingEl.style.color = '';
            // 找到延迟所在 stat 的副标题（若存在）以同步状态文案与色彩
            const stat = pingEl.closest('.a-stat');
            const sub = stat ? stat.querySelector('.a-stat-sub') : null;
            const setSub = (text, cls) => {
                if (!sub) return;
                sub.textContent = text;
                sub.classList.remove('up', 'down');
                if (cls) sub.classList.add(cls);
            };
            // 依据测速结果刷新节点状态徽章 (在线/延迟/离线)
            const card = pingEl.closest('.route-item');
            const setBadge = (state) => {
                if (!card) return;
                const badge = card.querySelector('.node-badge');
                if (!badge) return;
                const nextCls = state === 'online' ? 'is-online' : state === 'slow' ? 'is-slow' : 'is-offline';
                const changed = !badge.classList.contains(nextCls);
                badge.className = 'node-badge ' + nextCls;
                badge.innerHTML = '<span class="bdot"></span>' + (state === 'online' ? '在线' : state === 'slow' ? '延迟' : '离线');
                // 状态真正发生变化时给一次脉冲反馈（颜色已变，再叠加一圈光环确认）。
                if (changed) {
                    badge.classList.remove('state-flash');
                    void badge.offsetWidth; // 重排以重启动画
                    badge.classList.add('state-flash');
                }
            };
            try {
                const res = await fetch('/api/ping-node?url=' + encodeURIComponent(targetUrl));
                const data = await res.json();
                if(data.ms >= 0) {
                    pingEl.innerHTML = data.ms + '<span class="unit">ms</span>';
                    if (data.ms < 200) { pingEl.style.color = 'var(--ok-text)'; setSub('良好', 'up'); setBadge('online'); }
                    else if (data.ms < 500) { pingEl.style.color = ''; setSub('一般', null); setBadge('online'); }
                    else { pingEl.style.color = 'var(--warn-text)'; setSub('偏高', 'down'); setBadge('slow'); }
                } else { pingEl.textContent = '断连'; pingEl.style.color = 'var(--err-text)'; setSub('超时', 'down'); setBadge('offline'); }
            } catch(e) { pingEl.textContent = '异常'; pingEl.style.color = 'var(--err-text)'; setSub('错误', 'down'); setBadge('offline'); }
            if (typeof updateTopbarHealth === 'function') updateTopbarHealth();
        }

        function toggleDetails(el) {
            const card = el.closest('.emby-card') || el.closest('.a-card');
            if (!card) return;
            const d = card.querySelector('.a-details');
            if (d) d.classList.toggle('open');
        }

        function pingAllNodes() {
            if (proxyNodesForPing.length === 0) return showToast('没有可供测速的反代节点');
            showToast('⚡ 正在对所有节点发起测速...');
            LiveMotion.gridScan(); // 队列雷达扫描：全局测速正在执行
            proxyNodesForPing.forEach((node, offset) => { setTimeout(() => pingTarget(node.idx, node.url), offset * 200); });
        }

        // ==========================================
        // emby-js 监控移植：节点状态管理面板（admin）
        // ==========================================
        function _embyEscape(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
        // 每节点登录态/鉴权元数据（auth-state），供卡片内的「媒体计数」块使用。
        window.__embyAuthState = window.__embyAuthState || {};
        // 监控与媒体计数：把全局设置（国家白名单 / 共享账号）灌入概览页折叠面板，并刷新「在线 X/Y」摘要。
        // /api/status/probes 每次都在服务端跑多张表的聚合查询并触发全节点计数刷新；
        // 一次页面加载里 load() / initMonitorControls() / injectEcgStrips() 各要一份，
        // 5s 内共用同一个请求。force=true（刚开关某节点监控）时强制重新拉取。
        let _probesReq = null, _probesAt = 0;
        function fetchStatusProbes(force) {
            const now = Date.now();
            if (force || !_probesReq || now - _probesAt > 5000) {
                _probesAt = now;
                _probesReq = fetch('/api/status/probes').then(r => (r.ok ? r.json() : {})).catch(() => ({}));
            }
            return _probesReq;
        }
        async function initMonitorControls() {
            try {
                const [globalRes, stateRes] = await Promise.all([
                    fetch('/api/status/global-flags').then(r => r.json()).catch(() => ({})),
                    fetch('/api/status/auth-state').then(r => r.json()).catch(() => ({}))
                ]);
                const ccInput = document.getElementById('proxyCountryAllowlist');
                if (ccInput) ccInput.value = (globalRes && globalRes.country_allowlist) ? globalRes.country_allowlist : '';
                const hlInput = document.getElementById('hotlinkAllowHosts');
                if (hlInput) hlInput.value = (globalRes && globalRes.hotlink_allow_hosts) ? globalRes.hotlink_allow_hosts : '';
                loadEmbySharedCreds();

                if (stateRes && stateRes.success && Array.isArray(stateRes.items)) {
                    const map = {};
                    for (const it of stateRes.items) map[it.prefix] = it;
                    window.__embyAuthState = map;
                }
            } catch (e) { /* 非致命 */ }
        }
        function _fmtCountAge(ts) {
            const sec = Math.floor(Date.now() / 1000) - (ts | 0);
            if (!ts || sec < 0) return '';
            if (sec < 60) return '刚刚';
            if (sec < 3600) return Math.floor(sec / 60) + ' 分钟前';
            if (sec < 86400) return Math.floor(sec / 3600) + ' 小时前';
            return Math.floor(sec / 86400) + ' 天前';
        }
        // 「最后活跃」状态点判定：last_play 是后端写入的北京时间(UTC+8)绝对时间戳
        // （形如 "2026-06-05 22:21:22"）。1 小时内有真实播放才算 live；
        // 空值 / 占位文案 / 解析失败 / 过旧一律 idle。
        function isLastPlayLive(lastPlay) {
            if (!lastPlay || typeof lastPlay !== 'string') return false;
            const t = Date.parse(lastPlay.trim().replace(' ', 'T') + '+08:00');
            return !isNaN(t) && (Date.now() - t) < 3600000;
        }
        // 媒体库计数条（卡片正面）：电影/剧集/集数 常显，其余有值才显示，带较昨日增量。
        function renderCountsStrip(prefix) {
            const c = (window.__embyCounts || {})[prefix];
            if (!c || !c.counts) return '';
            const counts = c.counts, delta = c.counts_delta || {};
            const item = (label, key, always) => {
                const v = counts[key] | 0;
                if (!always && v <= 0) return '';
                const d = delta[key] | 0;
                const dh = d ? ('<i class="a-count-delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' + d : d) + '</i>') : '';
                return '<span class="a-count"><span class="a-count-k">' + label + '</span><b>' + v + '</b>' + dh + '</span>';
            };
            const items = [
                item('电影', 'movies', true), item('剧集', 'series', true), item('集数', 'episodes', true),
                item('艺术家', 'artists'), item('专辑', 'albums'), item('单曲', 'songs'),
                item('MV', 'music_videos'), item('合集', 'box_sets'), item('有声书', 'books')
            ].join('');
            const age = _fmtCountAge(counts.updated_at);
            return '<div class="a-counts">' +
                '<div class="a-counts-head"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>媒体库' +
                    (age ? '<span class="a-counts-age">' + age + '</span>' : '') + '</div>' +
                '<div class="a-counts-grid">' + items + '</div>' +
            '</div>';
        }
        // 渲染卡片内「媒体计数」块：所有节点都拉取计数，这里展示登录态。
        // r = route 对象；st = 该节点 auth-state（登录态/凭据元数据）。
        function renderNodeStatusConfig(r, st) {
            st = st || {};
            const pfx = _embyEscape(r.prefix);
            const hasToken = !!st.has_token;
            const embyUser = st.emby_username != null ? st.emby_username : (r.emby_username || '');
            const seenAt = st.emby_auth_seen_at ? new Date(st.emby_auth_seen_at * 1000).toLocaleString() : '—';
            const usedAt = st.emby_auth_used_at ? new Date(st.emby_auth_used_at * 1000).toLocaleString() : '—';
            const monOn = (r.monitor_enabled == null ? 1 : (r.monitor_enabled | 0)) === 1;
            return '' +
                '<div class="a-node-config">' +
                    '<div class="ns-monitor-row">' +
                        '<div class="ns-monitor-label">监控此节点<span class="ns-meta-hint">关闭后不探测状态、不抓取媒体计数</span></div>' +
                        '<button type="button" class="ios-switch ' + (monOn ? 'on' : '') + '" role="switch" aria-checked="' + (monOn ? 'true' : 'false') + '" aria-label="监控节点 ' + _embyEscape(r.remark || r.prefix) + '" title="' + (monOn ? '监控已开启' : '监控已关闭') + '" onclick="toggleNodeMonitor(\'' + pfx + '\', this)"></button>' +
                    '</div>' +
                    '<div class="ns-auth-meta">' +
                        '<span class="ns-meta-item">登录态 <b class="' + (hasToken ? 'is-ok' : '') + '">' + (hasToken ? '已缓存' : '未登录') + '</b></span>' +
                        '<span class="ns-meta-item">账号 <b>' + (embyUser ? _embyEscape(embyUser) : '全局共享') + '</b></span>' +
                        '<span class="ns-meta-item">上次登录 <b>' + _embyEscape(seenAt) + '</b></span>' +
                        '<span class="ns-meta-item">最近使用 <b>' + _embyEscape(usedAt) + '</b></span>' +
                        (hasToken ? '<button type="button" class="btn-tier is-sm" onclick="revokeEmbyAuth(\'' + pfx + '\')">清除登录缓存</button>' : '') +
                        '<span class="ns-meta-hint">独立账号在「编辑」里设置</span>' +
                    '</div>' +
                '</div>';
        }
        // 切换单节点监控开关（状态探测 + 媒体计数）。乐观更新 UI，失败回滚。
        async function toggleNodeMonitor(prefix, el) {
            const enable = !el.classList.contains('on');
            el.classList.toggle('on', enable);
            el.setAttribute('aria-checked', enable ? 'true' : 'false');
            el.title = enable ? '监控已开启' : '监控已关闭';
            try {
                const res = await fetch('/api/routes/monitor', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prefix: prefix, enabled: enable })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.error || '保存失败');
                showToast(enable ? '已开启监控：' + prefix : '已关闭监控：' + prefix);
                const card = document.querySelector('.route-item[data-prefix="' + prefix + '"]');
                if (!enable && card) { const m = card.querySelector('.ecg-mount'); if (m) m.remove(); }
                if (enable && typeof injectEcgStrips === 'function') injectEcgStrips(true);
                if (typeof updateTopbarHealth === 'function') updateTopbarHealth();
            } catch (e) {
                el.classList.toggle('on', !enable); // 回滚
                el.setAttribute('aria-checked', !enable ? 'true' : 'false');
                showError('操作失败（' + (e.message || '未知错误') + '）');
            }
        }
        // 局部刷新单个节点卡片的配置块（避免整页重载/重测速）。
        async function refreshNodeConfig(prefix) {
            try {
                const [routes, stateRes] = await Promise.all([
                    fetch('/api/routes').then(r => r.json()),
                    fetch('/api/status/auth-state').then(r => r.json()).catch(() => ({}))
                ]);
                const list = Array.isArray(routes) ? routes : [];
                const r = list.find(x => x.prefix === prefix);
                const map = {};
                if (stateRes && stateRes.success && Array.isArray(stateRes.items)) {
                    for (const it of stateRes.items) map[it.prefix] = it;
                    window.__embyAuthState = map;
                }
                if (window.globalRoutesData) window.globalRoutesData = list;
                const sel = (window.CSS && CSS.escape) ? CSS.escape(prefix) : prefix.replace(/"/g, '\\"');
                const card = document.querySelector('.route-item[data-prefix="' + sel + '"]');
                if (r && card) {
                    const slot = card.querySelector('.a-node-config');
                    if (slot) slot.outerHTML = renderNodeStatusConfig(r, map[prefix]);
                    card.setAttribute('data-emby-username', (r.emby_username || '').replace(/"/g, '&quot;'));
                    card.setAttribute('data-has-emby-password', r.has_emby_password ? 1 : 0);
                }
                if (typeof initMonitorControls === 'function') initMonitorControls();
            } catch (e) { /* 非致命 */ }
        }
        async function loadEmbySharedCreds() {
            try {
                const res = await fetch('/api/status/emby-creds').then(r => r.json()).catch(() => ({}));
                const userEl = document.getElementById('embySharedUser');
                const passEl = document.getElementById('embySharedPass');
                if (userEl) userEl.value = (res && res.username) ? res.username : '';
                if (passEl) { passEl.value = ''; passEl.placeholder = (res && res.has_password) ? '已设置密码（留空不改）' : '共享密码（留空不改）'; }
            } catch (e) {}
        }
        async function saveEmbySharedCreds() {
            const userEl = document.getElementById('embySharedUser');
            const passEl = document.getElementById('embySharedPass');
            try {
                const res = await fetch('/api/status/emby-creds', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: userEl ? userEl.value.trim() : '', password: passEl ? passEl.value : '' })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('共享凭据已保存');
                    loadEmbySharedCreds();
                } else {
                    if (typeof showError === 'function') showError('保存失败：' + (data.error || '未知错误'));
                }
            } catch (e) {
                if (typeof showError === 'function') showError('操作失败（' + e.message + '）');
            }
        }
        async function saveCountryAllowlist() {
            const input = document.getElementById('proxyCountryAllowlist');
            if (!input) return;
            try {
                const res = await fetch('/api/status/global-flags', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country_allowlist: input.value || '' })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('已保存');
                    initMonitorControls();
                } else {
                    if (typeof showError === 'function') showError('保存失败：' + (data.error || '未知错误'));
                }
            } catch (e) {
                if (typeof showError === 'function') showError('操作失败（' + e.message + '）');
            }
        }
        async function saveHotlinkHosts() {
            const input = document.getElementById('hotlinkAllowHosts');
            if (!input) return;
            try {
                const res = await fetch('/api/status/global-flags', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hotlink_allow_hosts: input.value || '' })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('已保存');
                    initMonitorControls();
                } else {
                    if (typeof showError === 'function') showError('保存失败：' + (data.error || '未知错误'));
                }
            } catch (e) {
                if (typeof showError === 'function') showError('操作失败（' + e.message + '）');
            }
        }
        async function updateEmbyGlobalFlag(field, value) {
            try {
                const body = {};
                body[field] = value;
                const res = await fetch('/api/status/global-flags', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('已保存');
                } else {
                    if (typeof showError === 'function') showError('保存失败：' + (data.error || '未知错误'));
                }
            } catch (e) {
                if (typeof showError === 'function') showError('操作失败（' + e.message + '）');
            }
        }
        async function updateEmbyRouteFlag(prefix, field, value) {
            try {
                const body = { prefix };
                body[field] = value;
                const res = await fetch('/api/status/route-flags', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('已保存');
                    refreshNodeConfig(prefix);
                } else {
                    if (typeof showError === 'function') showError('保存失败：' + (data.error || '未知错误'));
                }
            } catch (e) {
                if (typeof showError === 'function') showError('操作失败（' + e.message + '）');
            }
        }
        async function revokeEmbyAuth(prefix) {
            if (!await uiConfirm('确认清除该节点已缓存的登录令牌？下次需要计数时会用账号密码重新登录。')) return;
            try {
                const res = await fetch('/api/status/revoke-auth', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast('已清除');
                    refreshNodeConfig(prefix);
                } else {
                    if (typeof showError === 'function') showError('清除失败：' + (data.error || '未知错误'));
                }
            } catch (e) {
                if (typeof showError === 'function') showError('操作失败（' + e.message + '）');
            }
        }
        async function exportConfig() {
            try {
                const res = await fetch('/api/routes'); const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'emby_proxy_backup.json'; a.click();
                URL.revokeObjectURL(url); showToast('配置已导出');
            } catch (e) { showError('导出失败（' + e.message + '）'); }
        }

        function importConfig() {
            const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0]; const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const routes = JSON.parse(event.target.result);
                        const res = await fetch('/api/routes/import', { method: 'POST', body: JSON.stringify(routes) });
                        const result = await res.json();
                        if (result.success) { showToast('配置已导入'); load(); } else throw new Error(result.error);
                    } catch (err) { showError('导入失败（' + err.message + '）'); }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        // 视图偏好（卡片 / 列表），持久化到 localStorage。
        function getNodeView() {
            // Operations Cockpit 默认密集矩阵(list)；仅当用户显式选 grid 才用卡片
            try { return localStorage.getItem('emby_node_view') === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; }
        }
        function setNodeView(view) {
            const v = view === 'list' ? 'list' : 'grid';
            try { localStorage.setItem('emby_node_view', v); } catch (e) {}
            const gb = document.getElementById('view-grid'), lb = document.getElementById('view-list');
            if (gb) { gb.classList.toggle('is-active', v === 'grid'); gb.setAttribute('aria-pressed', v === 'grid'); }
            if (lb) { lb.classList.toggle('is-active', v === 'list'); lb.setAttribute('aria-pressed', v === 'list'); }
            if (typeof load === 'function') load();
        }
        // 前缀（访问后缀）打码偏好，持久化到 localStorage。默认开启，避免肩窥泄露访问路径。
        function getPrefixMask() {
            try { return localStorage.getItem('emby_mask_prefix') !== '0'; } catch (e) { return true; }
        }
        function setPrefixMask(on) {
            try { localStorage.setItem('emby_mask_prefix', on ? '1' : '0'); } catch (e) {}
        }
        // 渲染期内联取值：根据当前打码状态返回展示用前缀文本。
        function pfxDisplay(pfx) { return getPrefixMask() ? '••••' : String(pfx); }
        // 就地刷新所有已渲染的前缀标签 + 顶部开关态，无需整表重渲染。
        function applyPrefixMask() {
            const on = getPrefixMask();
            document.querySelectorAll('.node-pfx[data-pfx]').forEach(function (el) {
                el.textContent = '/' + (on ? '••••' : el.getAttribute('data-pfx'));
            });
            const btn = document.getElementById('mask-prefix-btn');
            if (btn) {
                btn.classList.toggle('is-active', on);
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
                btn.title = on ? '前缀已打码 · 点击显示明文' : '前缀明文 · 点击打码';
            }
        }
        function togglePrefixMask() { setPrefixMask(!getPrefixMask()); applyPrefixMask(); }
        // 列表视图：媒体库计数压缩成一行（电影/剧集/集，无增量）。
        function renderCountsInline(prefix) {
            const c = (window.__embyCounts || {})[prefix];
            if (!c || !c.counts) return '<span class="nr-counts-empty">暂无计数</span>';
            const k = c.counts, parts = [];
            if (k.movies | 0) parts.push('电影 ' + (k.movies | 0));
            if (k.series | 0) parts.push('剧集 ' + (k.series | 0));
            if (k.episodes | 0) parts.push('集 ' + (k.episodes | 0));
            return parts.length ? parts.join('<span class="nr-dot">·</span>') : '<span class="nr-counts-empty">暂无计数</span>';
        }
        // Operations Cockpit · 节点矩阵单行：密集行 + 内联 sparkline + 展开 caret。
        // 点击 caret 就地展开 .node-row-detail（详情 + 内联编辑，见 buildNodeDetail）。
        function renderNodeRow(r, idx, h) {
            const pfx = r.prefix;
            const monOn = (r.monitor_enabled == null ? 1 : (r.monitor_enabled | 0)) === 1;
            const statusDot = isLastPlayLive(h.lastPlay) ? 'live' : 'idle';
            const grp = (r.group_name || '').trim();
            const grpChip = grp ? '<span class="grp-tag" title="分组">' + nrdEsc(grp) + '</span>' : '';
            return '' +
                '<div class="node-row route-item' + h.cardIdleCls + '" data-prefix="' + pfx + '" data-group-name="' + nrdEsc(grp) + '" data-search="' + h.remarkName + ' ' + pfx + ' ' + nrdEsc(grp) + '" data-custom-headers="' + (r.custom_headers || '').replace(/"/g, '&quot;') + '" data-emby-username="' + (r.emby_username || '').replace(/"/g, '&quot;') + '" data-has-emby-password="' + (r.has_emby_password ? 1 : 0) + '">' +
                    '<div class="nr-line">' +
                        '<div class="nr-drag drag-handle" title="拖拽排序"><svg><use href="#i-grip"/></svg></div>' +
                        '<label class="cb-hit"><input type="checkbox" class="node-cb nr-cb" value="' + pfx + '" aria-label="选择 ' + h.remarkName + '"></label>' +
                        '<div class="nr-thumb' + h.thumbIdleCls + '">' + h.thumbInner + '</div>' +
                        '<div class="nr-id">' +
                            '<div class="nr-name">' + h.remarkName + grpChip + '</div>' +
                            '<div class="nr-sub"><span class="a-status-dot ' + statusDot + '"></span><span class="node-pfx" data-pfx="' + nrdEsc(pfx) + '" title="访问后缀">/' + pfxDisplay(pfx) + '</span><span class="nr-dot">·</span>' + (modeNames[r.mode] || '未知') + '</div>' +
                        '</div>' +
                        '<div class="nr-badge">' + h.badgeHtml + '</div>' +
                        '<div class="nr-spark" data-spark="' + pfx + '" aria-hidden="true">' + (h.sparkHtml || '') + '</div>' +
                        '<div class="nr-metrics">' +
                            '<div class="nr-metric"><span class="nr-k">延迟</span><button type="button" id="ping-' + idx + '" class="nr-v ping-btn" title="点击重新测速" onclick="pingTarget(' + idx + ', \'' + h.mainTarget + '\')">测速中</button></div>' +
                            '<div class="nr-metric"><span class="nr-k">今日流量</span><span class="nr-v' + (h.isIdle ? ' muted' : '') + '">' + h.todayBw + '</span></div>' +
                            '<div class="nr-metric"><span class="nr-k">今日播放</span><span class="nr-v' + (h.isIdle ? ' muted' : '') + '">' + h.todayReqs + '</span></div>' +
                        '</div>' +
                        '<div class="nr-counts">' + renderCountsInline(pfx) + '</div>' +
                        '<div class="nr-actions">' +
                            '<button type="button" class="ios-switch nr-mon ' + (monOn ? 'on' : '') + '" role="switch" aria-checked="' + (monOn ? 'true' : 'false') + '" aria-label="监控节点 ' + h.remarkName + '" title="' + (monOn ? '监控已开启' : '监控已关闭') + '" onclick="toggleNodeMonitor(\'' + pfx + '\', this)"></button>' +
                            '<button type="button" class="a-icon-btn" onclick="copyTxt(\'' + h.proxyUrl + '\')" title="复制直达链接" aria-label="复制 ' + h.remarkName + ' 的直达链接"><svg aria-hidden="true"><use href="#i-copy"/></svg></button>' +
                            '<button type="button" class="nr-expand" aria-expanded="false" aria-label="展开详情与编辑" onclick="toggleNodeRow(this)"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="node-row-detail" hidden></div>' +
                '</div>';
        }
        // 行内 HTML 转义 (属性/文本)
        function nrdEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
        // 展开/收起行内详情；首次展开懒构建详情内容。
        function toggleNodeRow(btn) {
            const row = btn.closest && btn.closest('.node-row');
            if (!row) return;
            const open = !row.classList.contains('is-open');
            row.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            const detail = row.querySelector('.node-row-detail');
            if (!detail) return;
            if (open) {
                if (!detail.dataset.built) { detail.innerHTML = buildNodeDetail(row.getAttribute('data-prefix')); detail.dataset.built = '1'; }
                detail.hidden = false;
            } else { detail.hidden = true; }
        }
        // 构建行内详情：上游/请求头/媒体计数/直达URL + 操作 + (隐藏)内联编辑表单。
        function buildNodeDetail(prefix) {
            const r = (window.globalRoutesData || []).find(function (x) { return x.prefix === prefix; });
            if (!r) return '<div class="nrd-empty">无详情数据</div>';
            const targets = String(r.target || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            const proxyUrl = 'https://' + window.location.host + '/' + r.prefix;
            const headerLines = String(r.custom_headers || '').split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s && !s.startsWith('#'); });
            const headerKeys = headerLines.map(function (l) { return l.split(':')[0].trim(); }).filter(Boolean);
            const c = (window.__embyCounts || {})[prefix];
            const k = c && c.counts ? c.counts : null;
            const countsTxt = k ? [ (k.movies | 0) ? '电影 ' + (k.movies | 0) : '', (k.series | 0) ? '剧集 ' + (k.series | 0) : '', (k.episodes | 0) ? '集 ' + (k.episodes | 0) : '' ].filter(Boolean).join(' · ') || '暂无计数' : '暂无计数';
            const ups = targets.map(function (t, i) { return '<div class="nrd-row"><span class="nrd-k">' + (i === 0 ? '主源' : '备 ' + i) + '</span><code class="nrd-v">' + nrdEsc(t) + '</code></div>'; }).join('');
            const read = '<div class="nrd-grid">' + ups +
                '<div class="nrd-row"><span class="nrd-k">直达</span><code class="nrd-v">' + nrdEsc(proxyUrl) + '</code></div>' +
                '<div class="nrd-row"><span class="nrd-k">请求头</span><span class="nrd-v2">' + (headerKeys.length ? nrdEsc(headerKeys.join(', ')) : '无') + '</span></div>' +
                '<div class="nrd-row"><span class="nrd-k">媒体计数</span><span class="nrd-v2">' + nrdEsc(countsTxt) + '</span></div>' +
                '</div>';
            const actions = '<div class="nrd-actions">' +
                '<button type="button" class="btn-tier is-primary is-sm" onclick="toggleInlineEdit(\'' + prefix + '\')"><svg><use href="#i-edit"/></svg>编辑</button>' +
                '<button type="button" class="btn-tier is-sm" onclick="copyTxt(\'' + proxyUrl + '\')"><svg><use href="#i-copy"/></svg>复制直达</button>' +
                '<button type="button" class="btn-tier is-sm" onclick="editNode(\'' + prefix + '\', \'' + nrdEsc(r.target) + '\', \'' + r.mode + '\', \'' + nrdEsc((r.remark || '')) + '\', \'' + nrdEsc((r.icon || '')) + '\', \'' + r.cache_img + '\', ' + (r.keepalive_days || 0) + ')" title="完整编辑(图标/独立账号/请求头编辑器)">高级…</button>' +
                '<button type="button" class="btn-tier is-sm is-danger" onclick="del(\'' + prefix + '\')"><svg><use href="#i-trash"/></svg>删除</button>' +
                '</div>';
            const modeOpts = Object.keys(modeNames).map(function (mk) { return '<option value="' + mk + '"' + (mk === r.mode ? ' selected' : '') + '>' + modeNames[mk] + '</option>'; }).join('');
            const edit = '<form class="nrd-edit" id="nrd-edit-' + prefix + '" hidden onsubmit="return saveInlineEdit(event, \'' + prefix + '\')">' +
                '<div class="nrd-edit-grid">' +
                    '<label class="nrd-f"><span>备注</span><input class="a-input" name="remark" value="' + nrdEsc(r.remark || '') + '"></label>' +
                    '<label class="nrd-f"><span>前缀</span><input class="a-input" name="prefix" value="' + nrdEsc(r.prefix) + '"></label>' +
                    '<label class="nrd-f"><span>分组/标签</span><input class="a-input" name="group" value="' + nrdEsc(r.group_name || '') + '" placeholder="可选"></label>' +
                    '<label class="nrd-f"><span>模式</span><select class="a-select" name="mode">' + modeOpts + '</select></label>' +
                    '<label class="nrd-f"><span>保号天数</span><input class="a-input" type="number" min="0" max="365" name="keepalive" value="' + (r.keepalive_days | 0) + '"></label>' +
                    '<label class="nrd-f nrd-full"><span>上游线路 (每行一个)</span><textarea class="a-input" name="targets" rows="2">' + nrdEsc(targets.join('\n')) + '</textarea></label>' +
                    '<label class="nrd-f nrd-full"><span>自定义请求头</span><textarea class="a-input" name="headers" rows="2" placeholder="Header: Value">' + nrdEsc(r.custom_headers || '') + '</textarea></label>' +
                    '<label class="nrd-check"><input type="checkbox" name="cache"' + (r.cache_img !== 'off' ? ' checked' : '') + '><span>海报 &amp; 静态资源缓存</span></label>' +
                '</div>' +
                '<div class="nrd-edit-actions">' +
                    '<button type="button" class="btn-tier is-sm" onclick="toggleInlineEdit(\'' + prefix + '\')">取消</button>' +
                    '<button type="submit" class="btn-tier is-primary is-sm"><svg><use href="#i-save"/></svg>保存</button>' +
                '</div>' +
                '</form>';
            return read + actions + edit;
        }
        function toggleInlineEdit(prefix) {
            const form = document.getElementById('nrd-edit-' + prefix);
            if (!form) return;
            form.hidden = !form.hidden;
            if (!form.hidden) { const f = form.querySelector('input,select,textarea'); if (f) setTimeout(function () { f.focus(); }, 30); }
        }
        // 行内保存：复用 /api/routes 端点与负载结构；未在行内表单暴露的字段沿用原值。
        async function saveInlineEdit(ev, prefix) {
            ev.preventDefault();
            const form = ev.target;
            const r = (window.globalRoutesData || []).find(function (x) { return x.prefix === prefix; }) || {};
            const get = function (n) { const el = form.elements[n]; return el ? el.value : ''; };
            const targets = String(get('targets') || '').split(/[\n,]/).map(function (s) { return s.trim().replace(/\/$/, ''); }).filter(Boolean);
            if (!targets.length) { showToast('请至少填写一个主线路地址'); return false; }
            const payload = {
                oldPrefix: prefix,
                prefix: String(get('prefix') || prefix).trim().replace(/^\/+/, ''),
                target: targets.join(','),
                mode: get('mode') || 'off',
                remark: String(get('remark') || '').trim(),
                group_name: String(get('group') || '').trim(),
                icon: r.icon || '',
                cache_img: (form.elements['cache'] && form.elements['cache'].checked) ? 'on' : 'off',
                custom_headers: get('headers') || '',
                keepalive_days: parseInt(get('keepalive'), 10) || 0,
                emby_username: r.emby_username || '',
                emby_password: ''
            };
            const btn = form.querySelector('button[type="submit"]');
            if (btn) btn.disabled = true;
            try {
                const res = await fetch('/api/routes', { method: 'POST', body: JSON.stringify(payload) });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || '保存失败');
                showToast('节点已更新');
                load();
            } catch (err) {
                showError('保存失败（' + err.message + '）');
                if (btn) btn.disabled = false;
            }
            return false;
        }
        async function load() {
            try {
                const [res, stateRes, probesRes] = await Promise.all([
                    fetch('/api/routes'),
                    fetch('/api/status/auth-state').then(r => r.json()).catch(() => ({})),
                    fetchStatusProbes()
                ]);
                if (!res.ok) throw new Error('请求失败，请检查环境配置');
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                // 节点登录态/凭据元数据，供卡片内「状态页与媒体计数」块渲染。
                const authState = {};
                if (stateRes && stateRes.success && Array.isArray(stateRes.items)) {
                    for (const it of stateRes.items) authState[it.prefix] = it;
                }
                window.__embyAuthState = authState;

                // 媒体库计数（含较昨日增量）+ 监控摘要，来自 /api/status/probes（实时 SWR）。
                const countsBy = {};
                let _online = 0, _probed = 0;
                const _downPrefixes = [];
                if (probesRes && probesRes.success && Array.isArray(probesRes.cards)) {
                    for (const c of probesRes.cards) {
                        countsBy[c.prefix] = c;
                        _probed++; if (c.ok) _online++; else _downPrefixes.push(c.prefix);
                    }
                }
                const _down = _downPrefixes.map(p => { const r = data.find(x => x.prefix === p); return (r && r.remark) || p; });
                window.__embyCounts = countsBy;
                // 运维看板用的权威在线/离线 = 服务端探针(probesRes)，不依赖浏览器对上游的客户端 ping
                // (浏览器无法直连私网/明文 http 上游，客户端 ping 会全部失败误判为离线)。
                window.__nodeStats = { total: data.length, probed: _probed, online: _online, offline: Math.max(0, _probed - _online), down: _down };

                // 🌟 新增：把节点流量数据存进全局内存，供大屏瞬间读取
                window.globalRoutesData = data;

                const container = document.getElementById('list-grid');
                if(data.length === 0) {
                    container.innerHTML = '<div style="text-align:center; color:var(--text-sec); grid-column: 1 / -1; padding: 40px;">暂无配置任何反代节点，请先部署一个。</div>';
                    return;
                }
                
                container.innerHTML = '';
                proxyNodesForPing = [];
                const currentHost = window.location.host;
                const nodeView = getNodeView();
                container.className = (nodeView === 'list') ? 'node-list' : 'node-grid';

                data.forEach((r, idx) => {
                    const proxyUrl = 'https://' + currentHost + '/' + r.prefix;
                    const targets = r.target.split(',').map(s => s.trim()).filter(Boolean);
                    const mainTarget = targets[0]; 
                    
                    const remarkNameRaw = r.remark || '未命名媒体库';
                    const remarkName = _embyEscape(remarkNameRaw);
                    const lastPlay = _embyEscape(r.last_play ? r.last_play : '暂无播放记录');
                    
                    const encodedTargets = encodeURIComponent(JSON.stringify(targets));

                    // 🌟 接收后端传来的：单节点独立宽带与请求统计数据
                    const todayBw = r.todayBandwidth || '0 B';
                    const totalReqs = r.totalReqs || r.todayReqs || 0;
                    const todayReqs = r.todayReqs || 0;

                    // 徽章：探针判离线 → offline；1 小时内有真实播放 → live；探针在线 → up；否则 idle。
                    const probe = countsBy[r.prefix];
                    const playing = isLastPlayLive(r.last_play);
                    const statusClass = (probe && !probe.ok) ? 'offline' : playing ? 'live' : (probe && probe.ok) ? 'up' : 'idle';

                    const isIdle = (todayReqs === 0) && statusClass === 'idle';
                    const cardIdleCls = isIdle ? ' idle' : '';
                    const thumbIdleCls = isIdle ? ' idle' : '';

                    // 缩略图：有 icon URL 用图片，否则取备注首字
                    const thumbLetter = _embyEscape((remarkNameRaw.replace(/\s+/g, '').charAt(0) || '?').toUpperCase());
                    const thumbInner = r.icon
                        ? `<img src="${r.icon}" alt="">`
                        : thumbLetter;

                    // 自定义头标签：统计条数
                    const headerLines = (r.custom_headers || '').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
                    const headerKeys = headerLines.map(l => l.split(':')[0].trim()).filter(Boolean);

                    const cacheOn = r.cache_img !== 'off';
                    const escAttr = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

                    const keepDays = r.keepalive_days | 0;
                    let keepaliveTag = '';
                    if (keepDays > 0) {
                        const lastPlayedAt = r.keepalive_last_played_at | 0;
                        const nowSec = Math.floor(Date.now() / 1000);
                        let tone, extra;
                        if (lastPlayedAt > 0) {
                            const remainSec = (lastPlayedAt + keepDays * 86400) - nowSec;
                            const remainDays = Math.floor(remainSec / 86400);
                            if (remainSec <= 0) { tone = ' warn'; extra = ' · 已超期'; }
                            else if (remainSec <= 86400) { tone = ' warn'; extra = ' · 余 ' + Math.max(1, Math.ceil(remainSec / 3600)) + 'h'; }
                            else { tone = ' good'; extra = ' · 余 ' + remainDays + 'd'; }
                        } else {
                            tone = ' good';
                            extra = ' · 未播放';
                        }
                        keepaliveTag = '<span class="a-tag' + tone + '" title="保号提醒阈值 ' + keepDays + ' 天，超期未观看会通过 Telegram 提醒"><svg><use href="#i-shield"/></svg>保号提醒 ' + keepDays + ' 天' + extra + '</span>';
                    }

                    // 状态徽章 + 迷你折线图 (趋势数据缺失则占位)
                    const badgeHtml = nodeBadgeHtml(statusClass);
                    let trendData = r.trend || r.trafficHistory || r.history || null;
                    if (!Array.isArray(trendData)) trendData = null;
                    const sparkHtml = nodeSparklineHtml(trendData);

                    proxyNodesForPing.push({ idx: idx, url: mainTarget });

                    if (nodeView === 'list') {
                        container.innerHTML += renderNodeRow(r, idx, { remarkName, proxyUrl, mainTarget, thumbInner, thumbIdleCls, cardIdleCls, todayBw, todayReqs, totalReqs, isIdle, badgeHtml, lastPlay, sparkHtml });
                        setTimeout(() => pingTarget(idx, mainTarget), 500 * idx);
                        return;
                    }

                    container.innerHTML += `
                    <div class="emby-card route-item${cardIdleCls}" data-prefix="${r.prefix}" data-group-name="${(r.group_name || '').trim().replace(/"/g, '&quot;')}" data-search="${remarkName} ${r.prefix} ${_embyEscape((r.group_name || '').trim())}" data-custom-headers="${(r.custom_headers || '').replace(/"/g, '&quot;')}" data-emby-username="${(r.emby_username || '').replace(/"/g, '&quot;')}" data-has-emby-password="${r.has_emby_password ? 1 : 0}">
                        <div class="a-head">
                            <div class="drag-handle a-handle" title="拖拽排序"><svg><use href="#i-grip"/></svg></div>
                            <label class="cb-hit"><input type="checkbox" class="node-cb a-cb" value="${r.prefix}" aria-label="选择 ${remarkName}"></label>
                            <div class="a-thumb${thumbIdleCls}">${thumbInner}</div>
                            <div class="a-title-block">
                                <div class="a-name">${remarkName}</div>
                                <div class="a-meta">
                                    <span class="a-status-dot ${playing ? 'live' : 'idle'}" title="${lastPlay}"></span>
                                    <span class="node-pfx" data-pfx="${r.prefix}" title="访问后缀">/${pfxDisplay(r.prefix)}</span>
                                    <span class="dot-sep">·</span>
                                    <span class="a-mode">${modeNames[r.mode] || '未知'}</span>
                                </div>
                            </div>
                            ${badgeHtml}
                        </div>

                        <div class="a-spark-slot" data-spark="${r.prefix}" style="margin:2px 0;">${sparkHtml}</div>

                        <div class="a-stats">
                            <div class="a-stat">
                                <div class="a-stat-label">今日流量</div>
                                <span class="a-stat-val${isIdle ? ' muted' : ''}">${todayBw}</span>
                                <div class="a-stat-sub">${isIdle ? '闲置' : '今日累积'}</div>
                            </div>
                            <div class="a-stat">
                                <div class="a-stat-label">今日播放</div>
                                <span class="a-stat-val${isIdle ? ' muted' : ''}">${todayReqs}</span>
                                <div class="a-stat-sub">累计 ${totalReqs}</div>
                            </div>
                            <div class="a-stat">
                                <div class="a-stat-label">延迟</div>
                                <button type="button" id="ping-${idx}" class="a-stat-val ping-btn" onclick="pingTarget(${idx}, '${mainTarget}')" title="点击重新测速">测速中</button>
                                <div class="a-stat-sub">点击重测</div>
                            </div>
                        </div>

                        ${renderCountsStrip(r.prefix)}

                        <div class="a-tags">
                            ${(r.group_name || '').trim()
                                ? '<span class="a-tag grp"><svg><use href="#i-grip"/></svg>' + (r.group_name || '').trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>'
                                : ''}
                            ${cacheOn
                                ? '<span class="a-tag good"><svg><use href="#i-image"/></svg>海报缓存</span>'
                                : '<span class="a-tag warn"><svg><use href="#i-image"/></svg>缓存已关闭</span>'}
                            ${headerKeys.length
                                ? `<button type="button" class="a-tag primary" onclick="toggleDetails(this)" title="点击查看自定义请求头"><svg><use href="#i-key"/></svg>${headerKeys.length} 个自定义头</button>`
                                : ''}
                            ${keepaliveTag}
                            <span class="a-tag">最后活跃 ${lastPlay}</span>
                        </div>

                        <div class="a-details">
                            <div class="a-detail-row">
                                <span class="a-detail-label">直达链接</span>
                                <span id="p-${idx}" data-val="${proxyUrl}" class="a-detail-val secret-text">••••••••</span>
                                <span class="a-detail-actions">
                                    <button class="a-icon-btn" onclick="toggleVis('p-${idx}')" title="查看明文"><svg><use href="#i-eye"/></svg></button>
                                    <button class="a-icon-btn" onclick="copyTxt('${proxyUrl}')" title="复制链接"><svg><use href="#i-copy"/></svg></button>
                                </span>
                            </div>
                            <div class="a-detail-row">
                                <span class="a-detail-label">源站</span>
                                <span id="t-${idx}" data-val="${encodedTargets}" class="a-detail-val secret-text">••••••••</span>
                                <span class="a-detail-actions">
                                    <button class="a-icon-btn" onclick="toggleVis('t-${idx}', true)" title="查看明文"><svg><use href="#i-eye"/></svg></button>
                                </span>
                            </div>
                            ${headerKeys.length ? `<div class="a-detail-row">
                                <span class="a-detail-label">自定义头</span>
                                <span class="a-detail-val" title="${escAttr(headerKeys.join(', '))}">${headerKeys.join(', ')}</span>
                                <span></span>
                            </div>` : ''}
                            <div class="a-config-head">媒体计数</div>
                            ${renderNodeStatusConfig(r, authState[r.prefix])}
                        </div>

                        <div class="a-foot">
                            <button class="a-icon-btn" title="测速" onclick="pingTarget(${idx}, '${mainTarget}')"><svg><use href="#i-zap"/></svg></button>
                            <button class="a-icon-btn" title="复制直达链接" onclick="copyTxt('${proxyUrl}')"><svg><use href="#i-copy"/></svg></button>
                            <button class="a-icon-btn" title="更多详情" onclick="toggleDetails(this)"><svg><use href="#i-more"/></svg></button>
                            <span class="a-foot-spacer"></span>
                            <button class="a-btn-edit" onclick="editNode('${r.prefix}', '${r.target}', '${r.mode}', '${r.remark || ''}', '${r.icon || ''}', '${r.cache_img}', ${r.keepalive_days || 0})"><svg><use href="#i-edit"/></svg>编辑</button>
                            <button class="a-icon-btn danger-hover" title="删除" onclick="del('${r.prefix}')"><svg><use href="#i-trash"/></svg></button>
                        </div>
                    </div>`;

                    setTimeout(() => pingTarget(idx, mainTarget), 500 * idx); 
                });

                filterNodesList();

                // 同步前缀打码态到顶部开关 + 刚渲染的前缀标签（初次渲染已内联取态，这里同步按钮）。
                applyPrefixMask();

                // 卡片渲染完毕：整数读数（媒体计数、今日播放）滚动入场。
                LiveMotion.enliven(container);

                if (sortableInstance) sortableInstance.destroy();
                sortableInstance = Sortable.create(container, {
                    handle: '.drag-handle',
                    animation: 150,
                    delay: 200, 
                    delayOnTouchOnly: true,
                    onEnd: async function () {
                        const items = [];
                        container.querySelectorAll('.route-item').forEach((row, index) => {
                            const prefix = row.getAttribute('data-prefix');
                            if (prefix) items.push({ prefix: prefix, sort_order: index });
                        });
                        try {
                            await fetch('/api/routes/reorder', { method: 'POST', body: JSON.stringify(items) });
                            showToast('排序已保存');
                        } catch(e) { showError('排序保存失败（' + e.message + '）'); }
                    }
                });

                // 刷新顶部状态栏: 节点总数
                window.__loadedAt = Date.now();
                updateBatchBar();
                updateTopbarHealth();

                // ECG 心电图 + 24h/7d 可用率（仅对开启了 show_on_status 的节点显示）
                injectEcgStrips();

                // 异步拉取节点近 7 天每日流量并回填 sparkline
                loadRouteTrends();

                // 运维看板的「今日流量」信号需要统计数据；统计默认懒加载(仅访问统计tab)，
                // 这里在节点加载后预取一次，让看板流量立即有值，并标记避免访问统计tab时重复拉取。
                if (!window.__statsLoaded) { window.__statsLoaded = true; loadDashboardData(); }

            } catch (err) {
                document.getElementById('list-grid').innerHTML = `<div class="load-error" role="alert"><strong>读取节点列表失败</strong><span>面板没能取到节点数据，可能是网络中断或 Worker 未就绪。</span><button type="button" class="btn-tier is-sm" onclick="load()">重试</button><span class="load-error-detail">${_embyEscape(err.message)}</span></div>`;
            }
        }

        // 客户端 ECG/心电图 生成器（唯一实现；服务端副本已随公开分享卡片一并移除）
        function buildEcgSvg(history) {
            const W = 240, H = 36, padX = 2, padY = 4;
            const innerW = W - padX * 2, innerH = H - padY * 2;
            const baseY = padY + innerH - 2;
            const samples = Array.isArray(history) ? history.slice(-60) : [];
            if (!samples.length) {
                return `<svg class="ecg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="${padX}" y1="${baseY}" x2="${W-padX}" y2="${baseY}" class="ecg-base"/><text x="${W/2}" y="${H/2+3}" class="ecg-empty" text-anchor="middle">暂无探测</text></svg>`;
            }
            const n = samples.length;
            const stepX = n > 1 ? innerW / (n - 1) : innerW;
            const msToY = ms => { const c = Math.max(0, Math.min(400, ms || 0)); return baseY - (c / 400) * (innerH * 0.85); };
            let okPath = '', failMarks = '', lastX = padX, inOk = false;
            for (let i = 0; i < n; i++) {
                const s = samples[i], x = padX + stepX * i;
                if (s.ok) {
                    const peakY = msToY(s.ms);
                    const preX = Math.max(lastX, x - stepX * 0.45);
                    const upX = x - stepX * 0.18, dnX = x + stepX * 0.10, tailX = x + stepX * 0.25;
                    okPath += (inOk ? 'L' : 'M') + preX.toFixed(2) + ' ' + baseY + ' L' + upX.toFixed(2) + ' ' + baseY + ' L' + x.toFixed(2) + ' ' + peakY.toFixed(2) + ' L' + dnX.toFixed(2) + ' ' + baseY + ' L' + tailX.toFixed(2) + ' ' + baseY;
                    inOk = true; lastX = tailX;
                } else {
                    if (inOk) { okPath += ' L' + (x - stepX * 0.3).toFixed(2) + ' ' + baseY; inOk = false; }
                    failMarks += '<line x1="' + x.toFixed(2) + '" y1="' + (padY + 1).toFixed(2) + '" x2="' + x.toFixed(2) + '" y2="' + baseY.toFixed(2) + '" class="ecg-fail"/>';
                    lastX = x;
                }
            }
            if (inOk) okPath += ' L' + (padX + innerW).toFixed(2) + ' ' + baseY;
            const last = samples[n - 1], lastY = last.ok ? msToY(last.ms) : baseY;
            const dotCls = last.ok ? 'ecg-dot ok' : 'ecg-dot bad';
            const pingCls = last.ok ? 'ecg-ping ok' : 'ecg-ping bad';
            const cx = (padX + innerW).toFixed(2);
            return '<svg class="ecg-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
                '<line x1="' + padX + '" y1="' + baseY + '" x2="' + (W - padX) + '" y2="' + baseY + '" class="ecg-base"/>' +
                '<line x1="' + padX + '" y1="' + (padY + innerH * 0.5).toFixed(2) + '" x2="' + (W - padX) + '" y2="' + (padY + innerH * 0.5).toFixed(2) + '" class="ecg-mid"/>' +
                (okPath ? '<path d="' + okPath + '" class="ecg-line" pathLength="1" fill="none"/>' : '') +
                failMarks +
                '<circle cx="' + cx + '" cy="' + lastY.toFixed(2) + '" r="2.4" class="' + pingCls + '"/>' +
                '<circle cx="' + cx + '" cy="' + lastY.toFixed(2) + '" r="2.4" class="' + dotCls + '"/>' +
                '</svg>';
        }

        // 媒体入库趋势 sparkline：最近 ≤14 天总条目数折线。少于 2 个点则不渲染。
        function buildTrendSvg(trend) {
            const pts = Array.isArray(trend) ? trend.filter(v => typeof v === 'number') : [];
            if (pts.length < 2) return '';
            const W = 240, H = 28, padX = 2, padY = 3;
            const innerW = W - padX * 2, innerH = H - padY * 2;
            const min = Math.min(...pts), max = Math.max(...pts);
            const span = (max - min) || 1;
            const stepX = innerW / (pts.length - 1);
            const xy = pts.map((v, i) => (padX + stepX * i).toFixed(2) + ' ' + (padY + innerH - ((v - min) / span) * innerH).toFixed(2));
            const grew = pts[pts.length - 1] >= pts[0];
            const lastX = (padX + innerW).toFixed(2);
            const lastY = (padY + innerH - ((pts[pts.length - 1] - min) / span) * innerH).toFixed(2);
            return '<svg class="trend-svg ' + (grew ? 'up' : 'down') + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
                '<polyline points="' + xy.join(' ') + '" class="trend-line" fill="none" pathLength="1"/>' +
                '<circle cx="' + lastX + '" cy="' + lastY + '" r="2.2" class="trend-dot"/>' +
                '</svg>';
        }

        async function injectEcgStrips(force) {
            try {
                const data = await fetchStatusProbes(force);
                if (!data || !data.success || !Array.isArray(data.cards)) return;
                const byPrefix = {};
                for (const c of data.cards) byPrefix[c.prefix] = c;
                const cards = document.querySelectorAll('#list-grid .emby-card');
                let ecgIndex = 0;
                cards.forEach(card => {
                    const prefix = card.getAttribute('data-prefix');
                    if (!prefix) return;
                    const c = byPrefix[prefix];
                    if (!c) return; // 该节点未开启状态探测
                    if (card.querySelector('.ecg-mount')) return; // 已注入，跳过
                    const pct = v => v == null ? '—' : (v * 100).toFixed(1) + '%';
                    const slaBadge = v => {
                        if (v == null) return '';
                        const p = v * 100;
                        const tier = p >= 99.9 ? 'sla-a' : (p >= 99 ? 'sla-b' : 'sla-c');
                        const label = p >= 99.9 ? 'SLA A' : (p >= 99 ? 'SLA B' : 'SLA C');
                        return '<span class="sla-badge ' + tier + '" title="30 天可用率 ' + p.toFixed(2) + '%">' + label + '</span>';
                    };
                    const block = document.createElement('div');
                    block.className = 'ecg-mount';
                    // 错开扫描光束/描线起始相位，避免所有节点同步闪烁。
                    block.style.setProperty('--ecg-i', String(ecgIndex++));
                    const trendSvg = buildTrendSvg(c.trend);
                    block.innerHTML =
                        '<div class="ecg-strip" aria-label="近 1 小时探测心电图">' + buildEcgSvg(c.history) + '</div>' +
                        (trendSvg ? '<div class="trend-strip" aria-label="近 14 天入库趋势"><span class="trend-cap">入库趋势</span>' + trendSvg + '</div>' : '') +
                        '<div class="ecg-meta">' +
                            '<span class="ecg-pill ' + (c.ok ? 'ok' : 'bad') + '">' +
                                '<span class="dot"></span>' + (c.ok ? '在线 ' + (c.latest_ms | 0) + 'ms' : '离线') +
                            '</span>' +
                            '<span class="ecg-stat"><b>24h</b> ' + pct(c.avail_24h) + '</span>' +
                            '<span class="ecg-stat"><b>7d</b> ' + pct(c.avail_7d) + '</span>' +
                            '<span class="ecg-stat"><b>30d</b> ' + pct(c.avail_30d) + '</span>' +
                            slaBadge(c.avail_30d != null ? c.avail_30d : c.avail_7d) +
                        '</div>';
                    // 插入到 sparkHtml 之后、a-stats 之前。寻找 .a-stats 节点。
                    const stats = card.querySelector('.a-stats');
                    if (stats) card.insertBefore(block, stats);
                    else card.appendChild(block);
                });
            } catch (e) { /* silent */ }
        }

        // 顶栏状态与看板裁决同源（window.__nodeStats，服务端探针），一处算、两处显示。
        function updateTopbarHealth() { updateAuroraKpis(); }

        // 运维看板：裁决行 + 三个信号。每个数字只出现一次（在线数在裁决行右侧）。
        function updateAuroraKpis() {
            const $ = function(id) { return document.getElementById(id); };
            const setText = function(id, v) {
                const el = $(id);
                if (!el) return;
                const had = !el.classList.contains('skeleton');
                const changed = el.textContent !== String(v);
                el.classList.remove('skeleton');
                el.classList.toggle('is-na', !/\d/.test(String(v)));   // 未配置 / 测算中：安静文字、隐藏单位
                LiveMotion.countUp(el, String(v));
                if (had && changed) LiveMotion.flash(el);
            };
            // 权威在线/离线来自服务端探针(window.__nodeStats)，不依赖客户端 ping 徽章。
            // 未开监控的节点没有探针数据 → 不计入离线，只计入总数。
            const ns = window.__nodeStats || { total: document.querySelectorAll('#list-grid .route-item').length, probed: 0, online: 0, offline: 0, down: [] };
            const total = ns.total | 0;
            const monitored = ns.probed | 0;
            const online = ns.online | 0;
            const offline = ns.offline | 0;
            setText('kpi-online-nodes', String(online));
            setText('kpi-total-nodes', String(monitored || total));
            setText('kpi-errors', String(offline));
            const pct = monitored ? Math.round(online / monitored * 100) : 0;
            setText('kpi-health', monitored ? String(pct) : '--');
            const bar = $('kpi-health-bar-fill');
            if (bar) bar.style.width = (monitored ? pct : 0) + '%';
            const trafSrc = $('trafficToday');
            const trafTxt = trafSrc ? (trafSrc.textContent || '') : '';
            if (trafTxt && !/加载|拉取/.test(trafTxt)) setText('kpi-traffic', trafTxt);
            // 裁决：一句结论 + 一句「下一步看哪里」（离线时直接点名离线节点）
            const down = (ns.down || []).slice(0, 3).join('、') + ((ns.down || []).length > 3 ? ' 等' : '');
            let tone, headline, subline;
            if (total === 0) { tone = 'idle'; headline = '尚无反代节点'; subline = '前往「配置 · 部署节点」添加第一个节点'; }
            else if (monitored === 0) { tone = 'idle'; headline = '监控未开启'; subline = '共 ' + total + ' 个节点 · 在节点行打开监控开关后显示在线状态'; }
            else if (offline === 0) { tone = 'ok'; headline = '全部节点在线'; subline = online + ' 个监控节点运行正常'; }
            else if (pct >= 50) { tone = 'warn'; headline = offline + ' 个节点离线'; subline = '离线：' + down; }
            else { tone = 'err'; headline = offline + ' 个节点离线'; subline = '离线：' + down; }
            const dot = $('cv-dot');
            if (dot) dot.className = 'cv-dot ' + tone;
            if ($('cv-headline')) $('cv-headline').textContent = headline;
            if ($('cv-sub')) $('cv-sub').textContent = subline;
            const errEl = $('kpi-errors');
            if (errEl) errEl.classList.toggle('is-bad', offline > 0);
            // 顶栏：同一句结论，任何目的地都看得到
            const tbDot = $('tb-health-dot'), tbText = $('tbStatusText');
            if (tbDot) tbDot.className = 'dot ' + ({ ok: 'green', warn: 'amber', err: 'red' }[tone] || '');
            if (tbText) tbText.textContent = headline;
            renderUpdatedAgo();
        }
        // 「更新于 N 秒前」：让过期数据看起来就是过期的。
        function renderUpdatedAgo() {
            const el = document.getElementById('cv-updated');
            if (!el || !window.__loadedAt) return;
            const sec = Math.max(0, Math.round((Date.now() - window.__loadedAt) / 1000));
            el.textContent = '更新于 ' + (sec < 5 ? '刚刚' : sec < 60 ? sec + ' 秒前' : Math.floor(sec / 60) + ' 分钟前');
            el.classList.toggle('is-stale', sec >= 300);
        }
        setInterval(function () { if (!document.hidden) renderUpdatedAgo(); }, 10000);

        function editNode(prefix, targetStr, mode, remark, icon, cacheImg, keepaliveDays) {
            document.getElementById('oldPrefix').value = prefix;
            document.getElementById('remark').value = remark;
            document.getElementById('prefix').value = prefix;
            const _gnEl = document.getElementById('groupName');
            const _gnCard = document.querySelector(`.route-item[data-prefix="${prefix}"]`);
            if (_gnEl) _gnEl.value = _gnCard ? (_gnCard.getAttribute('data-group-name') || '') : '';
            document.getElementById('mode').value = mode || 'off';
            document.getElementById('nodeCache').checked = (cacheImg !== 'off');
            syncModeHint();
            const keepaliveDaysEl = document.getElementById('keepaliveDays');
            if (keepaliveDaysEl) keepaliveDaysEl.value = parseInt(keepaliveDays, 10) || 0;
            // Read custom_headers from the card's data attribute to avoid inline escaping issues
            const card = document.querySelector(`.route-item[data-prefix="${prefix}"]`);
            HeadersEditor.set(card ? (card.getAttribute('data-custom-headers') || '') : '');

            // 媒体计数账号：回填独立用户名；密码不回传，按是否已设置给占位提示。
            const _euEl = document.getElementById('embyUsername');
            const _epEl = document.getElementById('embyPassword');
            if (_euEl) _euEl.value = card ? (card.getAttribute('data-emby-username') || '') : '';
            if (_epEl) {
                _epEl.value = '';
                _epEl.placeholder = (card && card.getAttribute('data-has-emby-password') === '1') ? '已设置密码（留空不改）' : '独立密码（留空不改）';
            }


            if (icon) {
                const foundItem = globalIcons.find(i => i.url === icon);
                selectIcon(icon, foundItem ? foundItem.name : '已选择图标');
            } else {
                selectIcon('', '默认');
            }

            document.getElementById('submitBtn').innerHTML = '<svg><use href="#i-save"/></svg>保存修改';

            const container = document.getElementById('targetInputs');
            container.innerHTML = '';
            const targets = targetStr.split(',').map(s => s.trim()).filter(Boolean);
            targets.forEach((url, idx) => container.appendChild(makeUpstreamRow(idx, url)));
            container.appendChild(makeUpstreamRow(targets.length));
            handleTargetInputs();
            openEditModal();
        }

        let _emPrevFocus = null;
        let _emPrevBodyOverflow = '';
        function _focusableIn(modal) {
            if (!modal) return [];
            return Array.from(modal.querySelectorAll(
                'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(el => el.offsetParent !== null);
        }
        function openEditModal() {
            const form = document.getElementById('addForm');
            const body = document.getElementById('editModalBody');
            const modal = document.getElementById('editModal');
            if (!form || !body || !modal) return;
            _emPrevFocus = document.activeElement;
            _emPrevBodyOverflow = document.body.style.overflow;
            if (form.parentElement !== body) body.appendChild(form);
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            setTimeout(function () {
                const first = document.getElementById('remark');
                if (first && typeof first.focus === 'function') first.focus();
            }, 30);
        }

        function closeEditModal() {
            const form = document.getElementById('addForm');
            const host = document.getElementById('formHost');
            const modal = document.getElementById('editModal');
            if (!modal) return;
            modal.style.display = 'none';
            document.body.style.overflow = _emPrevBodyOverflow || '';
            if (form && host && form.parentElement !== host) host.appendChild(form);
            if (form) {
                form.reset();
                const oldP = document.getElementById('oldPrefix'); if (oldP) oldP.value = '';
                if (typeof selectIcon === 'function') selectIcon('', '默认');
                const nc = document.getElementById('nodeCache'); if (nc) nc.checked = true;
                syncModeHint();
                if (typeof HeadersEditor !== 'undefined' && HeadersEditor.set) HeadersEditor.set('');
                const ka = document.getElementById('keepaliveDays'); if (ka) ka.value = '0';
                const eu = document.getElementById('embyUsername'); if (eu) eu.value = '';
                const ep = document.getElementById('embyPassword'); if (ep) { ep.value = ''; ep.placeholder = '独立密码（留空不改）'; }
                const sb = document.getElementById('submitBtn');
                if (sb) sb.innerHTML = '<svg><use href="#i-save"/></svg>保存节点';
                if (typeof resetTargetInputs === 'function') resetTargetInputs();
            }
            if (_emPrevFocus && typeof _emPrevFocus.focus === 'function') {
                try { _emPrevFocus.focus(); } catch (e) {}
            }
            _emPrevFocus = null;
        }

        // 当前最上层的浮层：cURL / 导入 叠在编辑框之上，所以先查它们。
        function _activeOverlay() {
            const shown = function (id) { const m = document.getElementById(id); return m && m.classList.contains('show') ? m : null; };
            const vis = function (id) { const m = document.getElementById(id); return m && m.style.display && m.style.display !== 'none' ? m : null; };
            return shown('curlModal') || shown('importHeadersModal') || vis('workerUpdateModal') || vis('editModal');
        }
        // 所有浮层共用一套焦点环：Tab 不会溜到背后的页面（#workerUpdateModal 装着能把面板打瘫的按钮）。
        document.addEventListener('keydown', function (e) {
            const modal = _activeOverlay();
            if (!modal) return;
            if (e.key === 'Escape' && modal.id === 'editModal') { closeEditModal(); return; }
            if (e.key === 'Tab') {
                const items = _focusableIn(modal);
                if (!items.length) return;
                const first = items[0], last = items[items.length - 1];
                const active = document.activeElement;
                if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
                else if (!modal.contains(active)) { e.preventDefault(); first.focus(); }
            }
        });

        // 应用内确认框：替代原生 confirm()，跟随主题。<dialog>.showModal() 负责焦点环、Esc 与背景 inert。
        function uiConfirm(message, opts) {
            opts = opts || {};
            const dlg = document.getElementById('confirmDialog');
            if (!dlg || typeof dlg.showModal !== 'function') return Promise.resolve(window.confirm(message));
            const ok = document.getElementById('cfDialogOk');
            const cancel = document.getElementById('cfDialogCancel');
            document.getElementById('cfDialogMsg').textContent = message;
            ok.textContent = opts.ok || '确定';
            ok.className = 'btn-tier ' + (opts.danger ? 'is-danger' : 'is-primary');
            if (!dlg.dataset.wired) {
                dlg.dataset.wired = '1';
                dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close('cancel'); });
            }
            dlg.returnValue = '';
            dlg.showModal();
            // 危险操作默认聚焦「取消」：习惯性回车不会直接执行。
            (opts.danger ? cancel : ok).focus();
            return new Promise(function (resolve) {
                dlg.addEventListener('close', function () { resolve(dlg.returnValue === 'ok'); }, { once: true });
            });
        }
        window.uiConfirm = uiConfirm;

        // 其余浮层(#workerUpdateModal / #curlModal / #importHeadersModal)：记住来处、关闭时还回去。
        // 焦点环见上方 _activeOverlay。
        var _ovPrevFocus = {};
        function modalOpened(id, firstFocusSel) {
            const m = document.getElementById(id);
            if (!m) return;
            _ovPrevFocus[id] = document.activeElement;
            setTimeout(function () {
                const el = (firstFocusSel && m.querySelector(firstFocusSel))
                        || m.querySelector('button:not([disabled]), input:not([disabled]), textarea, select');
                if (el && el.focus) el.focus();
            }, 30);
        }
        function modalClosed(id) {
            const prev = _ovPrevFocus[id];
            _ovPrevFocus[id] = null;
            if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
        }
        // Escape 关闭这三个浮层。#workerUpdateModal 装着能把面板打瘫的那个按钮，
        // 更需要一条不用瞄准鼠标的退路。
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            const wu = document.getElementById('workerUpdateModal');
            if (wu && wu.style.display && wu.style.display !== 'none') { closeWorkerUpdate(); return; }
            const curl = document.getElementById('curlModal');
            if (curl && curl.classList.contains('show')) { HeadersEditor.closeCurlModal(); return; }
            const imp = document.getElementById('importHeadersModal');
            if (imp && imp.classList.contains('show')) { HeadersEditor.closeImportModal(); }
        });

        document.getElementById('addForm').onsubmit = async (e) => {
            e.preventDefault();
            const oldPrefix = document.getElementById('oldPrefix').value;
            const remark = document.getElementById('remark').value.trim();
            const _gnInput = document.getElementById('groupName');
            const group_name = _gnInput ? _gnInput.value.trim() : '';
            const prefix = document.getElementById('prefix').value.trim().replace(/^\/+/g, '');
            const mode = document.getElementById('mode').value;
            const icon = document.getElementById('iconUrl').value;
            const cache_img = document.getElementById('nodeCache').checked ? 'on' : 'off';
            const custom_headers = HeadersEditor.get();

            const inputs = document.querySelectorAll('.target-input');
            let targetsArray = [];
            inputs.forEach(inp => {
                const val = inp.value.trim().replace(/\/$/g, '');
                if (val) targetsArray.push(val);
            });
            const target = targetsArray.join(',');
            
            if (!target) return showToast('请至少填写一个主线路地址');

            const keepaliveDaysEl = document.getElementById('keepaliveDays');
            const keepalive_days = parseInt(keepaliveDaysEl ? keepaliveDaysEl.value : '0', 10) || 0;

            const _euEl = document.getElementById('embyUsername');
            const _epEl = document.getElementById('embyPassword');
            const emby_username = _euEl ? _euEl.value.trim() : '';
            const emby_password = _epEl ? _epEl.value : '';

            try {
                const res = await fetch('/api/routes', {
                    method: 'POST',
                    body: JSON.stringify({oldPrefix, prefix, target, mode, remark, group_name, icon, cache_img, custom_headers, keepalive_days, emby_username, emby_password})
                });
                const data = await res.json();
                if(!data.success) throw new Error(data.error || '部署失败');
                
                const _em = document.getElementById('editModal');
                const _inModal = _em && _em.style.display !== 'none';
                if (_inModal) {
                    closeEditModal();
                } else {
                    document.getElementById('addForm').reset();
                    document.getElementById('oldPrefix').value = '';
                    selectIcon('', '默认');
                    document.getElementById('nodeCache').checked = true;
                    syncModeHint();
                    HeadersEditor.set('');
                    const _kaEl = document.getElementById('keepaliveDays');
                    if (_kaEl) _kaEl.value = '0';
                    document.getElementById('submitBtn').innerHTML = '<svg><use href="#i-save"/></svg>保存节点';
                    resetTargetInputs();
                }
                showToast('节点已部署');
                load();
            } catch(err) {
                showError('保存失败（' + err.message + '）');
            }
        };

        async function del(prefix) {
            // 运维者按「备注」认节点，不按 URL 前缀 —— 两个都念出来，再说清代价。
            const r = (window.globalRoutesData || []).find(function (x) { return x.prefix === prefix; });
            const remark = (r && r.remark) ? r.remark : '未命名媒体库';
            if (!await uiConfirm('确定删除节点「' + remark + '」（/' + prefix + '）？\n\n'
                + '该节点的上游线路、自定义请求头与独立 Emby 凭据会一并删除，且不可恢复。', { danger: true, ok: '删除节点' })) return;
            try {
                const res = await fetch('/api/routes?prefix=' + encodeURIComponent(prefix), { method: 'DELETE' });
                const data = await res.json().catch(function () { return {}; });
                if (!res.ok || data.success === false) throw new Error(data.error || ('HTTP ' + res.status));
                showToast('节点已移除');
                load();
            } catch (e) {
                showError('删除失败（' + e.message + '）');
            }
        }

        function getSelectedIps() {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');
            return Array.from(checkboxes).map(cb => cb.value);
        }
        function batchTcpPing() {
            const rows = document.querySelectorAll('#testTableBody .test-row');
            let ips = [];
            rows.forEach(tr => {
                const strong = tr.querySelector('.ip-text');
                if (strong && strong.textContent) {
                    let ip = strong.textContent;
                    if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
                    ips.push(ip);
                }
            });
            if (ips.length === 0) return showToast('请先提取节点');
            navigator.clipboard.writeText(ips.join('\n')).then(() => {
                showToast('节点已复制，即将跳转 ITDog...');
                setTimeout(() => { window.open('https://www.itdog.cn/batch_tcping/', '_blank'); }, 1500);
            });
        }
        async function directSubmitCname() {
            const input = document.getElementById('customIps').value.trim();
            if (!input) return showToast('请先在文本框内粘贴您的优选域名');
            const domainRegex = /\b([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g;
            const matchedDomains = input.match(domainRegex) || [];
            const realDomains = matchedDomains.filter(d => !/^\d+\.\d+\.\d+\.\d+$/.test(d));
            if (realDomains.length === 0) return showToast('未识别到合法域名，请检查输入');
            if(!await uiConfirm(`提取到以下域名：\n${realDomains.join('\n')}\n\n确定要直接将其设为 CNAME 记录吗？\n(注意：这会清空你配置的域名下现有的记录)`, { danger: true })) return;
            const btn = document.getElementById('btnDirectCname');
            sendDnsRequest(realDomains, btn);
        }
        async function testCustomIPs() {
            const input = document.getElementById('customIps').value;
            if (!input.trim()) return showToast('请先在输入框粘贴 IP 或优选域名');
            const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
            const ipv6Regex = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}|(?:[A-F0-9]{1,4}:)*:[A-F0-9]{1,4}(?::[A-F0-9]{1,4})*/gi;
            const domainRegex = /\b([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g;
            let matchedIPv4 = input.match(ipv4Regex) || [];
            let matchedIPv6 = input.match(ipv6Regex) || [];
            let matchedDomains = input.match(domainRegex) || [];
            matchedDomains = matchedDomains.filter(d => !/^\d+\.\d+\.\d+\.\d+$/.test(d));
            let extractedIps = [...matchedIPv4, ...matchedDomains];
            matchedIPv6.forEach(ip => {
                if (ip.length > 7 && ip.includes(':') && !ip.startsWith('::1')) { extractedIps.push(ip.startsWith('[') ? ip : `[${ip}]`); }
            });
            extractedIps = [...new Set(extractedIps)];
            if (extractedIps.length === 0) return showToast('未识别到合法的 IP 或 域名格式');
            const btn = document.getElementById('btnTestCustom');
            const tbody = document.getElementById('testTableBody');
            btn.disabled = true; btn.textContent = '测试中...';
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = '';
            showToast(`提取到 ${extractedIps.length} 个节点，开始测速校验`);
            const promises = [];
            extractedIps.forEach(ip => {
                const tr = document.createElement('tr');
                tr.className = 'test-row';
                tr.innerHTML = `
                    <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="${ip}"></td>
                    <td data-label="专属节点"><strong class="ip-text copyable"  onclick="copyTxt('${ip}')" title="点击复制">${ip}</strong></td>
                    <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="9999" >测算中...</td>
                    <td data-label="连通状态" class="speed text-muted" >-</td>
                    <td data-label="记录/归属地" class="loc text-muted" >等待解析</td>
                    <td data-label="快捷操作"><button class="btn-dns" disabled onclick="updateSingleDns('${ip}', this)">唯一解析</button></td>`;
                tbody.insertBefore(tr, tbody.firstChild);
                promises.push(doLocalPing(ip, tr, '自定义节点'));
            });
            await Promise.all(promises);
            sortTableByLatency(tbody);
            document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
            btn.disabled = false; btn.textContent = '测试粘贴的节点';
            showToast('自定义节点测速完成');
        }
        async function fetchCustomApiAndTest() {
            const apiUrl = document.getElementById('customApiUrl').value.trim();
            if (!apiUrl) return showToast('请先填入自定义 API 链接');
            const btn = document.getElementById('btnFetchCustomApi');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            btn.disabled = true; btn.textContent = '拉取中...';
            statusTxt.innerHTML = `正在从自定义 API 抓取数据...`;
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(`/api/get-custom-api-ips?url=${encodeURIComponent(apiUrl)}`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('自定义 API 返回为空'); return; }
                showToast(`提取 ${data.totalCount} 个节点，抽取 ${data.ips.length} 个测速`);
                btn.textContent = '⚡ 测速中...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = `
                        <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="${ip}"></td>
                        <td data-label="专属节点"><strong class="ip-text copyable"  onclick="copyTxt('${ip}')" title="点击复制">${ip}</strong></td>
                        <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="9999" >测算中...</td>
                        <td data-label="连通状态" class="speed text-muted" >-</td>
                        <td data-label="记录/归属地" class="loc text-muted" >等待解析</td>
                        <td data-label="快捷操作"><button class="btn-dns" disabled onclick="updateSingleDns('${ip}', this)">唯一解析</button></td>`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, '自定义 API'));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                showToast('自定义 API 测速完成');
                statusTxt.innerHTML = `测速完成 · 可勾选节点更新 DNS`;
            } catch (err) { showError('拉取自定义 API 失败（' + err.message + '）'); } 
            finally { btn.disabled = false; btn.textContent = '🌐 拉取 API 并测速'; }
        }
        async function fetchRemoteAndTest() {
            const btn = document.getElementById('btnFetchRemote');
            const tbody = document.getElementById('testTableBody');
            const statusTxt = document.getElementById('statusText');
            const type = document.getElementById('ipType').value;
            const typeText = document.getElementById('ipType').options[document.getElementById('ipType').selectedIndex].text;
            btn.disabled = true; btn.textContent = '正在提取节点...';
            statusTxt.innerHTML = `正在拉取 <strong>${typeText}</strong> 数据...`;
            if(tbody.innerHTML.includes('暂无数据')) tbody.innerHTML = ''; 
            try {
                const res = await fetch(`/api/get-remote-ips?type=${encodeURIComponent(type)}`);
                const data = await res.json();
                if (!data.ips || data.ips.length === 0) { showToast('未获取到该类型 IP'); return; }
                showToast(`已提取 ${data.totalCount} 个可用 IP，抽取 ${data.ips.length} 个测速`);
                btn.textContent = '⚡ 本地测速中...';
                const promises = [];
                data.ips.forEach(ip => {
                    const tr = document.createElement('tr');
                    tr.className = 'test-row';
                    tr.innerHTML = `
                        <td data-label="勾选节点" class="text-center"><input type="checkbox" class="ip-checkbox row-checkbox" value="${ip}"></td>
                        <td data-label="专属节点"><strong class="ip-text copyable"  onclick="copyTxt('${ip}')" title="点击复制">${ip}</strong></td>
                        <td data-label="预估延迟" class="latency cell-loading-bold" data-ms="9999" >测算中...</td>
                        <td data-label="连通状态" class="speed text-muted" >-</td>
                        <td data-label="记录/归属地" class="loc text-muted" >等待解析</td>
                        <td data-label="快捷操作"><button class="btn-dns" disabled onclick="updateSingleDns('${ip}', this)">唯一解析</button></td>`;
                    tbody.insertBefore(tr, tbody.firstChild);
                    promises.push(doLocalPing(ip, tr, typeText.replace(/[^一-龥a-zA-Z0-9]/g, '')));
                });
                await Promise.all(promises);
                sortTableByLatency(tbody);
                document.querySelectorAll('.btn-dns').forEach(b => b.disabled = false);
                document.getElementById('selectAll').checked = false;
                showToast('测速完成');
                statusTxt.innerHTML = `测速完成`;
            } catch (err) { showError('拉取或测速失败（' + err.message + '）'); } 
            finally { btn.disabled = false; btn.textContent = '提取预设源并测速'; }
        }
        function clearTest() {
            document.getElementById('testTableBody').innerHTML = '<tr><td colspan="6" class="text-center-muted">暂无数据，请拉取节点或输入自定义 IP/域名 测试</td></tr>';
            document.getElementById('statusText').textContent = '列表已清空。';
            document.getElementById('selectAll').checked = false;
        }
        function markTimeout(latTd, spdTd, tr) {
            latTd.textContent = '超时抛弃'; latTd.setAttribute('data-ms', 9999); latTd.style.color = 'var(--err)';
            spdTd.innerHTML = '<span class="conn-dot" style="background:var(--err)"></span>超时 (&gt;2000ms)'; spdTd.style.color = 'var(--err)';
            const cb = tr.querySelector('.row-checkbox');
            if(cb) { cb.disabled = true; cb.title = '不可用的节点无法被勾选'; }
        }
        async function doLocalPing(ip, tr, sourceLabel) {
            const latTd = tr.querySelector('.latency');
            const spdTd = tr.querySelector('.speed');
            const locTd = tr.querySelector('.loc');
            const queryIp = ip.replace(/[[\]]/g, '');
            const isIPv6 = ip.includes(':'); 
            const isDomain = /[a-zA-Z]/.test(queryIp) && !isIPv6;
            if (isDomain) { locTd.innerHTML = `<div class="loc-inner"><span class="badge is-accent">CNAME</span> <span style="white-space:nowrap">${sourceLabel}</span> · <span style="white-space:nowrap">优选域名</span></div>`;
            } else {
                const recordLabel = isIPv6 ? '<span class="badge is-info">AAAA</span>' : '<span class="badge" style="background:var(--primary-soft);color:var(--primary);margin-right:var(--space-1);">A记录</span>';
                fetch(`https://api.ip.sb/geoip/${queryIp}`).then(res => res.json()).then(data => locTd.innerHTML = `<div class="loc-inner">${recordLabel} <span style="white-space:nowrap">${sourceLabel}</span> · <span style="white-space:nowrap">${data.country || '未知'}</span></div>`).catch(() => locTd.innerHTML = `<div class="loc-inner">${recordLabel} <span style="white-space:nowrap">${sourceLabel}</span> · <span style="white-space:nowrap">解析失败</span></div>`);
            }
            const start = performance.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); 
            const processResult = () => {
                const rawLatency = Math.round(performance.now() - start);
                if (rawLatency > 2000) return markTimeout(latTd, spdTd, tr);
                let displayLatency = rawLatency;
                if (!isIPv6 && !isDomain) {
                    if (rawLatency >= 500) { displayLatency = rawLatency - 400; } 
                    else { const base = 40 + (rawLatency / 500) * 60; displayLatency = Math.floor(base) + Math.floor(Math.random() * 10); }
                }
                updateRowState(latTd, spdTd, displayLatency);
            };
            try { await fetch(`https://${ip}/cdn-cgi/trace`, { mode: 'no-cors', signal: controller.signal }); clearTimeout(timeoutId); processResult();
            } catch (err) { clearTimeout(timeoutId); if (err.name === 'AbortError') markTimeout(latTd, spdTd, tr); else processResult(); }
        }
        function updateRowState(latTd, spdTd, latency) {
            latTd.textContent = latency + ' ms'; latTd.setAttribute('data-ms', latency);
            let color, word;
            if (latency < 300) { color = 'var(--ok)'; word = '极佳'; }
            else if (latency <= 500) { color = 'var(--primary)'; word = '正常'; }
            else { color = 'var(--warn)'; word = '较高'; }
            latTd.style.color = color;
            spdTd.style.color = color;
            spdTd.innerHTML = '<span class="conn-dot" style="background:' + color + '"></span>' + word;
        }
        function sortTableByLatency(tbody) {
            const rows = Array.from(tbody.querySelectorAll('.test-row'));
            rows.sort((a, b) => {
                const msA = parseInt(a.querySelector('.latency').getAttribute('data-ms') || 9999);
                const msB = parseInt(b.querySelector('.latency').getAttribute('data-ms') || 9999);
                return msA - msB;
            });
            rows.forEach(row => tbody.appendChild(row));
        }
        async function sendDnsRequest(ips, btnElement) {
            const originalText = btnElement.textContent;
            btnElement.textContent = '更新 DNS 中...'; btnElement.disabled = true;
            try {
                const res = await fetch('/api/update-dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ips }) });
                const data = await res.json();
                if(data.success) { showToast(data.message); btnElement.textContent = '已更新'; loadDNS(); } 
                else { showError('DNS 更新失败：' + (data.error || '未知错误')); btnElement.textContent = originalText; }
            } catch(e) { showError('网络异常，请重试（' + e.message + '）'); btnElement.textContent = originalText; } 
            finally { setTimeout(() => { if(btnElement.textContent === '已更新') btnElement.textContent = originalText; btnElement.disabled = false; }, 3000); }
        }
        async function updateSingleDns(ip, btnElement) {
            if(!await uiConfirm(`确定要将域名解析到：\n${ip} \n警告：这会覆盖域名下的所有解析记录`, { danger: true })) return;
            sendDnsRequest([ip], btnElement);
        }
        async function updateSelectedToDns() {
            const btn = document.getElementById('btnSelectedDns');
            const ips = getSelectedIps();
            if (ips.length === 0) return showToast('请先勾选您想使用的节点');
            if(!await uiConfirm(`将应用勾选的 ${ips.length} 个节点：\n${ips.join('\n')}\n确定更新 DNS 记录吗？`)) return;
            sendDnsRequest(ips, btn);
        }
        async function updateTop3ToDns() {
            const btn = document.getElementById('btnTop3Dns');
            const rows = document.querySelectorAll('#testTableBody .test-row');
            let topIps = [];
            for(let i = 0; i < rows.length; i++) {
                const ms = parseInt(rows[i].querySelector('.latency').getAttribute('data-ms'));
                if(ms < 2000) topIps.push(rows[i].querySelector('.ip-text').textContent);
                if(topIps.length === 3) break;
            }
            if(topIps.length === 0) return showToast('没找到可用节点，请先测速');
            if(!await uiConfirm(`将为您分发当前最快的 ${topIps.length} 个节点：\n${topIps.join('\n')}\n确定更新 DNS 记录吗？`)) return;
            sendDnsRequest(topIps, btn);
        }
        async function loadDNS() {
            const container = document.getElementById('dnsStatus');
            try {
                const res = await fetch('/api/get-dns'); const data = await res.json();
                if (data.success && data.result) {
                    const records = data.result.filter(r => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
                    if (records.length === 0) {
                        container.innerHTML = '<span class="badge" style="background:var(--warn-soft);color:var(--warn-text);">暂无解析记录</span>';
                    } else {
                        // Dual-mode markup: desktop reads .sd-dns-badge (rendered inline like the original badges);
                        // mobile CSS upgrades the .sd-dns-list ul into iOS rows with rec-pill / ip / geo split.
                        container.innerHTML = '<ul class="sd-dns-list" role="list">'
                            + records.map(r => {
                                const t = r.type;
                                const cnt = String(r.content || '');
                                return '<li class="sd-dns-row" role="listitem">'
                                    + '<span class="sd-rec-pill is-' + t + '">' + t + '</span>'
                                    + '<code class="sd-ip" title="' + cnt.replace(/"/g, '&quot;') + '">' + cnt + '</code>'
                                    + '<span class="sd-dns-badge">' + t + ' | ' + cnt + '</span>'
                                    + '</li>';
                            }).join('')
                            + '</ul>';
                    }
                } else container.innerHTML = `<span class="badge" style="background:var(--err-soft);color:var(--err-ink);">${data.error || '获取失败'}</span>`;
                setDnsActionsEnabled(!!data.success, data.error);
            } catch (e) { container.innerHTML = '<span class="badge" style="background:var(--err-soft);color:var(--err-ink);">网络异常</span>'; }
        }
        // DNS 没配好时，所有「写 DNS」的按钮都不可点，并说明原因 —— 而不是点了才报错。
        function setDnsActionsEnabled(ok, reason) {
            const why = ok ? '' : ('DNS 未就绪：' + (reason || '缺少 CF_API_TOKEN / CF_ZONE_ID / CF_DOMAIN'));
            document.querySelectorAll('#btnSelectedDns, #btnDirectCname, #btnTop3Dns, .sd-sel-btn, [data-dns-action]').forEach(function (b) {
                b.disabled = !ok;
                if (why) b.title = why; else b.removeAttribute('title');
            });
        }
        
        // 确认收在这里，四个入口(顶栏图标 / 危险区 / ⌘K / 移动端行)都继承同一道闸。
        async function logout() {
            if (!await uiConfirm('确认退出登录？其他客户端不受影响，可随时重新登录。')) return;
            document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
        }

        // 初始化加载
        (function syncViewToggle() {
            const v = getNodeView();
            const gb = document.getElementById('view-grid'), lb = document.getElementById('view-list');
            if (gb) { gb.classList.toggle('is-active', v === 'grid'); gb.setAttribute('aria-pressed', v === 'grid'); }
            if (lb) { lb.classList.toggle('is-active', v === 'list'); lb.setAttribute('aria-pressed', v === 'list'); }
        })();
        loadIcons().then(() => {
            load();
            loadDNS();
            if (typeof initMonitorControls === 'function') initMonitorControls();
        });

        // ==========================================
        // 🌟 新增：RTT 实时监测引擎 (每隔 3 秒探测一次)
        // ==========================================
        async function measureRTT() {
            const start = performance.now();
            try {
                // 加上时间戳强制绕过浏览器本地缓存
                await fetch('/__client_rtt__?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
                const rtt = Math.round(performance.now() - start);
                // 直接写看板的延迟信号：不做滚动数字、不闪框 —— 它每 3 秒就会抖一下，那是噪音不是事件。
                const el = document.getElementById('kpi-rtt');
                if (el) {
                    el.classList.remove('skeleton', 'is-na');
                    el.textContent = String(rtt);
                    el.dataset.tone = rtt < 80 ? 'ok' : rtt < 200 ? 'warn' : 'err';
                }
            } catch (e) {
                const el = document.getElementById('kpi-rtt');
                if (el) { el.classList.remove('skeleton'); el.classList.add('is-na'); el.textContent = '断连'; el.dataset.tone = 'err'; }
            }
        }
        
        // 先立即执行一次，然后每 3 秒循环探测。标签页隐藏时停表：这块面板会被整天开着，
        // 后台标签没有理由每小时再打 1200 个请求。
        var _rttTimer = null;
        function startRTT() {
            if (_rttTimer) return;
            measureRTT();
            _rttTimer = setInterval(measureRTT, 3000);
        }
        function stopRTT() {
            if (!_rttTimer) return;
            clearInterval(_rttTimer);
            _rttTimer = null;
        }
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stopRTT(); else startRTT();   // 回到前台立刻补测一次
        });
        if (!document.hidden) startRTT();

    // 新增：前端探针自动检测脚本
        async function fetchCfTrace() {
            try {
                const res = await fetch('/api/edge-info');
                const data = await res.json();
                if (data.success) {
                    // Compact entry: just the colo code (e.g. "HKG"); full text shown in pill tooltip
                    const entryEl = document.getElementById('trace-entry');
                    entryEl.innerText = data.entryColo || '--';
                    let fullEntry = data.entryCountry || '';
                    if (data.entryCity && data.entryCity !== '未知') fullEntry += ' ' + data.entryCity;
                    fullEntry += ' (' + (data.entryColo || '?') + ')';
                    if (data.cacheKey) fullEntry += ' · key=' + data.cacheKey;
                    entryEl.title = '访客入口: ' + fullEntry;

                    const egressText = data.egressColo;
                    const egressElem = document.getElementById('trace-egress');
                    egressElem.innerText = egressText;
                    egressElem.title = 'Worker 落地: ' + egressText + (data.cacheKey ? ' · key=' + data.cacheKey : '');

                    if (data.entryColo !== egressText && egressText !== '探测中...' && egressText !== '获取失败') {
                        egressElem.style.color = 'var(--warn)';
                        egressElem.title += ' (智能放置/回源)';
                    }
                }
            } catch(e) {
                document.getElementById('trace-entry').innerText = '获取超时';
                document.getElementById('trace-egress').innerText = '获取超时';
            }
        }
        
        // 当网页加载完成时，延迟0.5秒执行探针扫描（避免卡顿主页渲染）
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(fetchCfTrace, 500);
        });
    // 新增：全云厂商节点数据库 (包含 Cloudflare 支持的所有主要区域)
        var cfRegions = {
            aws: [
                { label: "🇭🇰 中国香港", value: "aws:ap-east-1" },
                { label: "🇯🇵 日本 (东京)", value: "aws:ap-northeast-1" },
                { label: "🇯🇵 日本 (大阪)", value: "aws:ap-northeast-3" },
                { label: "🇸🇬 新加坡", value: "aws:ap-southeast-1" },
                { label: "🇰🇷 韩国 (首尔)", value: "aws:ap-northeast-2" },
                { label: "🇺🇸 美国西部 (加州)", value: "aws:us-west-1" },
                { label: "🇺🇸 美国西部 (俄勒冈)", value: "aws:us-west-2" },
                { label: "🇺🇸 美国东部 (弗吉尼亚)", value: "aws:us-east-1" },
                { label: "🇦🇺 澳大利亚 (悉尼)", value: "aws:ap-southeast-2" },
                { label: "🇮🇳 印度 (孟买)", value: "aws:ap-south-1" },
                { label: "🇬🇧 英国 (伦敦)", value: "aws:eu-west-2" },
                { label: "🇩🇪 德国 (法兰克福)", value: "aws:eu-central-1" }
            ],
            gcp: [
                { label: "🇹🇼 中国台湾 (彰化)", value: "gcp:asia-east1" },
                { label: "🇭🇰 中国香港", value: "gcp:asia-east2" },
                { label: "🇯🇵 日本 (东京)", value: "gcp:asia-northeast1" },
                { label: "🇯🇵 日本 (大阪)", value: "gcp:asia-northeast2" },
                { label: "🇰🇷 韩国 (首尔)", value: "gcp:asia-northeast3" },
                { label: "🇸🇬 新加坡", value: "gcp:asia-southeast1" },
                { label: "🇺🇸 美国西部 (洛杉矶)", value: "gcp:us-west2" },
                { label: "🇺🇸 美国西部 (俄勒冈)", value: "gcp:us-west1" },
                { label: "🇺🇸 美国东部 (弗吉尼亚)", value: "gcp:us-east4" },
                { label: "🇦🇺 澳大利亚 (悉尼)", value: "gcp:australia-southeast1" },
                { label: "🇬🇧 英国 (伦敦)", value: "gcp:europe-west2" },
                { label: "🇩🇪 德国 (法兰克福)", value: "gcp:europe-west3" }
            ],
            azure: [
                { label: "🇭🇰 中国香港 (East Asia)", value: "azure:eastasia" },
                { label: "🇸🇬 新加坡 (Southeast Asia)", value: "azure:southeastasia" },
                { label: "🇯🇵 日本东部 (东京)", value: "azure:japaneast" },
                { label: "🇯🇵 日本西部 (大阪)", value: "azure:japanwest" },
                { label: "🇰🇷 韩国中部 (首尔)", value: "azure:koreacentral" },
                { label: "🇺🇸 美国西部 (West US)", value: "azure:westus" },
                { label: "🇺🇸 美国东部 (East US)", value: "azure:eastus" },
                { label: "🇬🇧 英国南部 (伦敦)", value: "azure:uksouth" },
                { label: "🇳🇱 西欧 (荷兰)", value: "azure:westeurope" }
            ]
        };

        // 联动菜单处理逻辑 + 同步顶部 pill 标签
        function handleModeChange() {
            var mode = document.getElementById('cf-mode-select').value;
            var regionSelect = document.getElementById('cf-region-select');
            var customInput = document.getElementById('cf-custom-input');

            regionSelect.style.display = 'none';
            customInput.style.display = 'none';

            if (mode === 'aws' || mode === 'gcp' || mode === 'azure') {
                regionSelect.style.display = 'block';
                regionSelect.innerHTML = '';
                var regions = cfRegions[mode];
                regions.forEach(function(r) {
                    var opt = document.createElement('option');
                    opt.value = r.value;
                    opt.innerText = r.label;
                    regionSelect.appendChild(opt);
                });
            } else if (mode === 'custom') {
                customInput.style.display = 'block';
            }

            // Update placement pill label
            var pillLabel = document.getElementById('placeModeLabel');
            if (pillLabel) {
                var labels = { aws: 'AWS', gcp: 'GCP', azure: 'Azure', custom: '自定义' };
                if (labels[mode]) {
                    pillLabel.textContent = labels[mode];
                } else {
                    try {
                        var parsed = JSON.parse(mode);
                        pillLabel.textContent = parsed.mode === 'smart' ? '智能' : '边缘';
                    } catch (_) { pillLabel.textContent = '智能'; }
                }
            }
        }

        // 收起时 inert：看不见的控件不该吃到 Tab 焦点，也不该被读屏念出来。
        function setPlacementDrawer(open) {
            var pill = document.getElementById('placePill');
            var drawer = document.getElementById('placeDrawer');
            if (!drawer) return;
            drawer.classList.toggle('open', open);
            drawer.inert = !open;
            if (pill) { pill.classList.toggle('open', open); pill.setAttribute('aria-expanded', open ? 'true' : 'false'); }
        }
        function togglePlacementDrawer() {
            var drawer = document.getElementById('placeDrawer');
            setPlacementDrawer(!(drawer && drawer.classList.contains('open')));
        }

        function openPlacementDrawerFromMobile() {
            var drawer = document.getElementById('placeDrawer');
            if (!drawer) return;
            setPlacementDrawer(true);
            try { drawer.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { drawer.scrollIntoView(); }
            var sel = document.getElementById('cf-mode-select');
            if (sel) sel.focus({ preventScroll: true });
        }

        // 新增：调用部署修改接口
        async function updatePlacement() {
            var statusElem = document.getElementById('place-status');
            var modeVal = document.getElementById('cf-mode-select').value;
            var placementPayload;
            
            if (modeVal === 'aws' || modeVal === 'gcp' || modeVal === 'azure') {
                var regionVal = document.getElementById('cf-region-select').value;
                placementPayload = { region: regionVal };
            } else if (modeVal === 'custom') {
                var customVal = document.getElementById('cf-custom-input').value;
                if (!customVal || customVal.trim() === '') {
                    statusElem.innerText = "请填写自定义区域代码（如 gcp:asia-east2）";
                    statusElem.style.color = "var(--err)";
                    return;
                }
                placementPayload = { region: customVal.trim() };
            } else {
                placementPayload = JSON.parse(modeVal);
            }

            statusElem.innerText = "正在提交请求，请稍候...";
            statusElem.style.color = "var(--warn)";
            
            try {
                var res = await fetch('/api/placement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placement: placementPayload })
                });
                var data = await res.json();
                if (data.success) {
                    statusElem.innerText = "" + data.msg;
                    statusElem.style.color = "var(--ok)";
                } else {
                    statusElem.innerText = "" + data.msg;
                    statusElem.style.color = "var(--err)";
                }
            } catch(e) {
                statusElem.innerText = "网络错误: " + e.message;
                statusElem.style.color = "var(--err)";
            }
        }
    // 魔法功能：自动继承现有的模式选项 (增强稳定版)
        setTimeout(() => {
            const sourceSelect = document.getElementById('mode');
            const batchSelect = document.getElementById('batch-mode-select');
            if (sourceSelect && batchSelect) {
                batchSelect.innerHTML = sourceSelect.innerHTML;
            }
        }, 100); 

        // 全选 / 取消全选 —— 概览节点矩阵(.node-cb) 与测速表(#testTableBody .row-checkbox)
        // 是两套互不相干的选择集，各自一个显式入口。
        function toggleSelectAllNodes(checkbox) {
            if (!checkbox) return;
            document.querySelectorAll('.node-cb').forEach(cb => { cb.checked = checkbox.checked; });
            updateBatchBar();
        }
        // 批量栏只在有勾选时出现，并报出选中数量。
        function updateBatchBar() {
            const bar = document.getElementById('batchBar');
            if (!bar) return;
            const all = document.querySelectorAll('#list-grid .node-cb');
            const n = document.querySelectorAll('#list-grid .node-cb:checked').length;
            bar.hidden = n === 0;
            const lbl = document.getElementById('batchSelCount');
            if (lbl) lbl.textContent = '已选 ' + n + ' / ' + all.length;
            const sa = document.getElementById('selectAllNodes');
            if (sa) { sa.checked = n > 0 && n === all.length; sa.indeterminate = n > 0 && n < all.length; }
        }
        document.addEventListener('change', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('node-cb')) updateBatchBar();
        });
        function toggleSelectAllIps(checkbox) {
            if (!checkbox) return;
            document.querySelectorAll('#testTableBody .row-checkbox').forEach(cb => {
                if (!cb.disabled) cb.checked = checkbox.checked;   // 超时行不可选
            });
            if (typeof window.sdUpdateSelectionBar === 'function') window.sdUpdateSelectionBar();
        }
        window.toggleSelectAllNodes = toggleSelectAllNodes;
        window.toggleSelectAllIps = toggleSelectAllIps;

        // 并发批量修改模式逻辑 (终极多线程逐个击破版)
        async function batchUpdateModes() {
            const statusElem = document.getElementById('batch-status');
            const newMode = document.getElementById('batch-mode-select').value;
            
            const selectedPrefixes = Array.from(document.querySelectorAll('.node-cb:checked')).map(cb => cb.value);

            if (selectedPrefixes.length === 0) {
                statusElem.innerText = "请先打勾需要修改的节点";
                statusElem.style.color = "var(--warn)";
                return;
            }

            if (!await uiConfirm("确定要将勾选的 " + selectedPrefixes.length + " 个节点切换为该模式吗？")) return;

            statusElem.innerText = "正在多线程并发修改节点...";
            statusElem.style.color = "var(--primary)";

            try {
                // 1. 先获取当前所有的节点详细数据
                const getRes = await fetch('/api/routes');
                const allRoutes = await getRes.json();
                
                // 2. 筛选出你要修改的那些节点
                const nodesToUpdate = allRoutes.filter(r => selectedPrefixes.includes(r.prefix));

                // 3. 核心魔法：Promise.all 并发瞬间发出多个独立的保存请求
                await Promise.all(nodesToUpdate.map(async (r) => {
                    const payload = Object.assign({}, r);
                    payload.oldPrefix = r.prefix; 
                    payload.mode = newMode; 
                    
                    const postRes = await fetch('/api/routes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!postRes.ok) {
                        throw new Error("节点 " + r.prefix + " 保存失败");
                    }
                }));
                
                statusElem.innerText = "已批量修改";
                statusElem.style.color = "var(--ok)";
                setTimeout(() => location.reload(), 1000); 

            } catch (e) {
                statusElem.innerText = "失败: " + e.message;
                statusElem.style.color = "var(--err)";
            }
        }
    async function deployWorker() {
            const codeArea = document.getElementById('codeArea');
            const fileInput = document.getElementById('fileInput');
            let codeContent = codeArea.value;
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                codeContent = await file.text();
            }
            if (!codeContent.trim()) {
                showError('请先粘贴代码，或选择一个 .js 文件');
                return;
            }
            if (!await uiConfirm('危险操作确认 \n\n你即将强行覆盖当前 Worker 的代码。\n如果新代码有错误，此面板将会瘫痪，只能去网页后台抢修\n\n确定代码 100% 正确并覆盖吗？', { danger: true })) return;
            const btn = document.getElementById('deployBtn');
            const originalText = btn.innerText;
            btn.innerText = '正在与 Cloudflare 通信并部署...';
            btn.disabled = true;
            btn.style.opacity = '0.7';
            try {
                const res = await fetch('/api/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newCode: codeContent })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('部署成功' + (data.msg || '') + ' · 即将刷新页面');
                    setTimeout(() => window.location.reload(), 1200);
                } else {
                    showError('部署失败：' + (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)));
                }
            } catch (e) {
                showError('操作失败（' + e.message + '）');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
        // ==========================================
        // 在线更新模块
        // ==========================================
        // 这里的变量会自动从代码最顶端的配置区读取注入
        const CURRENT_VERSION = "__CURRENT_VERSION__"; 
        const GITHUB_RAW_URL = "__GITHUB_RAW_URL__"; 
        
        let latestCode = ""; 

        async function checkForUpdates() {
            // 未配置在线更新地址（仍是占位文案）时不发请求，免得每次加载都白白失败一次。
            if (!/^https?:\/\//.test(GITHUB_RAW_URL)) return;
            try {
                const res = await fetch(GITHUB_RAW_URL + '?t=' + new Date().getTime());
                if (!res.ok) return;
                latestCode = await res.text();
                
                // 核心修复：加入双重反斜杠，防止正则在 Worker 中变成注释 (//) 导致崩溃
                const versionMatch = latestCode.match(/\/\/\s*VERSION:\s*v?([\d.]+)/i);
                if (versionMatch && versionMatch[1]) {
                    const latestVersion = versionMatch[1];
                    if (latestVersion !== CURRENT_VERSION) {
                        document.getElementById('updateAlert').style.display = 'block';
                        document.getElementById('updateMsg').innerText = '当前版本: v' + CURRENT_VERSION + ' | 发现最新版本: v' + latestVersion + ' (Github)';
                    }
                }
            } catch (e) {
                console.log("检测更新失败:", e);
            }
        }

        async function doOnlineUpdate() {
            if (!await uiConfirm('确定要从 GitHub 拉取最新版本并覆盖当前节点吗？\n\n（这将会保留你的所有环境变量和数据库绑定）', { danger: true })) return;
            
            const btn = document.getElementById('onlineUpdateBtn');
            btn.innerText = '正在拉取并部署...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            try {
                // 直接复用我们之前写好的防丢数据库高级 API
                const res = await fetch('/api/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newCode: latestCode })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('在线更新完成 · 即将刷新页面');
                    setTimeout(() => window.location.reload(), 1200);
                } else {
                    showError('更新失败：' + (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)));
                }
            } catch (e) {
                showError('操作失败（' + e.message + '）');
            } finally {
                btn.innerText = '一键拉取并升级';
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }

        // 页面加载完成后自动在后台静默检测更新
        document.addEventListener('DOMContentLoaded', checkForUpdates);

        // ============================================================
        // UI Suggestions v2.0.7 — Headers Editor + menu helpers
        // ============================================================

        // Generic dropdown menu (used by "更多 ▾" and "配置工具")
        function toggleMenu(btn) {
            const wrap = btn.closest('.menu-wrap');
            const menu = wrap && wrap.querySelector('.menu');
            if (!menu) return;
            const wasOpen = menu.classList.contains('open');
            closeAllMenus();
            if (!wasOpen) menu.classList.add('open');
        }
        function closeAllMenus() {
            document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open'));
        }
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-wrap')) closeAllMenus();
        });

        // Append a backup line input (called by the dashed "+ 添加备用线路" button)
        function addBackupLine() {
            const wrap = document.getElementById('targetInputs');
            if (!wrap) return;
            const existing = wrap.querySelectorAll('.target-input').length;
            const row = document.createElement('div');
            row.className = 'a-upstream-row';
            row.innerHTML = '<span class="a-tag-bk">备 ' + existing + '</span>' +
                '<input type="url" class="a-input target-input" placeholder="备用线路 ' + existing + ' (选填，主源挂掉时触发)" oninput="handleTargetInputs()">';
            wrap.appendChild(row);
            if (typeof handleTargetInputs === 'function') handleTargetInputs();
        }

        // 反代模式说明：选中哪个就解释哪个（内容对应 src/emby/headers.js 的实际行为）。
        const MODE_HINTS = {
            off: '不向上游传递访客 IP。',
            realip_only: '用 X-Real-IP 把访客 IP 传给上游。',
            dual: '同时用 X-Real-IP 和 X-Forwarded-For 传递访客 IP。',
            strict: '把 Origin / Referer 改成上游地址并传递访客 IP。上游返回 403 时使用。'
        };
        function syncModeHint() {
            const sel = document.getElementById('mode'), hint = document.getElementById('modeHint');
            if (sel && hint) hint.textContent = MODE_HINTS[sel.value] || '';
        }

        // Headers Editor — KV editor that serializes to the legacy "Key: Value\n..." format
        const HeadersEditor = (() => {
            const SENSITIVE_KEYS = ['authorization','cookie','x-api-key','x-auth-token','x-emby-token','token'];
            let rows = [];
            let nextId = 1;

            const $list = () => document.getElementById('hed-list');
            const $count = () => document.getElementById('hed-count');

            const isSensitiveKey = (k) => SENSITIVE_KEYS.includes((k || '').trim().toLowerCase());

            function makeRow(key = '', value = '', on = true) {
                return { id: nextId++, key, value, on, masked: isSensitiveKey(key) };
            }

            function escapeHtml(s) {
                return String(s)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            function render() {
                const list = $list();
                if (!list) return;

                if (rows.length === 0) {
                    list.innerHTML = '<div class="hed-empty">尚未添加任何请求头 · 点「+ 添加请求头」或从下方模板插入</div>';
                } else {
                    list.innerHTML = rows.map(r => {
                        const sensitive = r.masked || isSensitiveKey(r.key);
                        const name = escapeHtml(r.key) || '新请求头';
                        return '<div class="hed-row ' + (r.on ? '' : 'disabled') + '" data-id="' + r.id + '">' +
                            '<span class="hed-handle" title="拖拽排序" aria-hidden="true"><svg><use href="#i-grip"/></svg></span>' +
                            '<input type="text" class="hed-k" value="' + escapeHtml(r.key) + '" placeholder="Header-Name" aria-label="请求头名称" data-id="' + r.id + '" data-field="key">' +
                            '<div class="hed-v-wrap">' +
                                '<input type="' + (r.masked ? 'password' : 'text') + '" class="hed-v" value="' + escapeHtml(r.value) + '" placeholder="value" aria-label="' + name + ' 的值" data-id="' + r.id + '" data-field="value">' +
                                (sensitive ? '<button type="button" class="mask-btn" data-id="' + r.id + '" title="' + (r.masked ? '显示' : '隐藏') + '" aria-label="' + (r.masked ? '显示' : '隐藏') + ' ' + name + '"><svg aria-hidden="true"><use href="#' + (r.masked ? 'i-eye' : 'i-eye-off') + '"/></svg></button>' : '') +
                            '</div>' +
                            '<button type="button" class="ios-switch ' + (r.on ? 'on' : '') + '" role="switch" aria-checked="' + (r.on ? 'true' : 'false') + '" aria-label="启用 ' + name + '" data-id="' + r.id + '" title="' + (r.on ? '已启用' : '已停用') + '"></button>' +
                            '<button type="button" class="hed-del" data-id="' + r.id + '" title="删除" aria-label="删除 ' + name + '"><svg aria-hidden="true"><use href="#i-x"/></svg></button>' +
                        '</div>';
                    }).join('');
                }

                updateCount();
                bindRowEvents();
            }

            function bindRowEvents() {
                const list = $list();
                if (!list) return;
                list.querySelectorAll('input.hed-k, input.hed-v').forEach(inp => {
                    inp.oninput = (e) => {
                        const id = +e.target.dataset.id;
                        const row = rows.find(r => r.id === id);
                        if (!row) return;
                        row[e.target.dataset.field] = e.target.value;
                        if (e.target.dataset.field === 'key') {
                            const nowSensitive = isSensitiveKey(row.key);
                            if (!row.masked && nowSensitive) { row.masked = true; render(); return; }
                        }
                        updateCount();
                    };
                });
                list.querySelectorAll('.ios-switch').forEach(sw => {
                    sw.onclick = (e) => {
                        const id = +e.currentTarget.dataset.id;
                        const row = rows.find(r => r.id === id);
                        if (!row) return;
                        row.on = !row.on;
                        render();
                    };
                });
                list.querySelectorAll('.hed-del').forEach(btn => {
                    btn.onclick = (e) => {
                        const id = +e.currentTarget.dataset.id;
                        rows = rows.filter(r => r.id !== id);
                        render();
                    };
                });
                list.querySelectorAll('.mask-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const id = +e.currentTarget.dataset.id;
                        const row = rows.find(r => r.id === id);
                        if (!row) return;
                        row.masked = !row.masked;
                        render();
                    };
                });
                // 排序用已加载的 Sortable：原生 HTML5 拖放在触屏上不工作。
                if (window.Sortable && !list._sortable) {
                    list._sortable = Sortable.create(list, {
                        handle: '.hed-handle', animation: 150, ghostClass: 'dragging',
                        onEnd: function (e) {
                            if (e.oldIndex === e.newIndex) return;
                            const [moved] = rows.splice(e.oldIndex, 1);
                            rows.splice(e.newIndex, 0, moved);
                            render();
                        }
                    });
                }
            }

            function updateCount() {
                const c = $count();
                if (c) c.textContent = rows.filter(r => r.on && r.key.trim()).length;
            }

            function serialize() {
                const seen = new Set();
                return rows
                    .filter(r => r.on && r.key.trim() !== '')
                    .map(r => {
                        const k = r.key.trim();
                        const lk = k.toLowerCase();
                        if (seen.has(lk)) return null;
                        seen.add(lk);
                        return k + ': ' + r.value;
                    })
                    .filter(Boolean)
                    .join('\n');
            }

            function parse(str) {
                if (!str) return [];
                return str.split('\n').map(line => {
                    const t = line.trim();
                    if (!t || t.startsWith('#')) return null;
                    const idx = t.indexOf(':');
                    if (idx < 1) return null;
                    const k = t.slice(0, idx).trim();
                    const v = t.slice(idx + 1).trim();
                    return makeRow(k, v, true);
                }).filter(Boolean);
            }

            return {
                init(initial) { rows = parse(initial || ''); render(); },
                get() { return serialize(); },
                set(str) { rows = parse(str || ''); render(); },
                addRow(k = '', v = '', on = true) {
                    rows.push(makeRow(k, v, on));
                    render();
                    requestAnimationFrame(() => {
                        const last = $list() && $list().querySelector('.hed-row:last-child .hed-k');
                        if (last && !k) last.focus();
                    });
                },
                insertTemplate(k, v) {
                    const existing = rows.find(r => r.key.toLowerCase() === k.toLowerCase());
                    if (existing) {
                        showToast('「' + k + '」已存在');
                        existing.on = true;
                        render();
                        return;
                    }
                    rows.push(makeRow(k, v, true));
                    render();
                },
                // 合并另一节点的请求头到当前编辑器：同名键以源为准并启用，新键追加
                mergeFrom(str) {
                    const incoming = parse(str || '');
                    let added = 0, updated = 0;
                    incoming.forEach(nr => {
                        const lk = nr.key.trim().toLowerCase();
                        const existing = rows.find(r => r.key.trim().toLowerCase() === lk);
                        if (existing) {
                            existing.value = nr.value;
                            existing.on = true;
                            existing.masked = isSensitiveKey(existing.key);
                            updated++;
                        } else {
                            rows.push(nr);
                            added++;
                        }
                    });
                    render();
                    return { added, updated };
                },
                openImportModal() {
                    const modal = document.getElementById('importHeadersModal');
                    const listEl = document.getElementById('importNodeList');
                    if (!modal || !listEl) return;
                    const currentPrefix = (document.getElementById('oldPrefix') || {}).value || '';
                    const items = Array.from(document.querySelectorAll('.route-item')).map(card => {
                        const prefix = card.getAttribute('data-prefix') || '';
                        const nameEl = card.querySelector('.a-name');
                        const name = nameEl ? nameEl.textContent.trim() : prefix;
                        const headers = card.getAttribute('data-custom-headers') || '';
                        const count = parse(headers).length;
                        return { prefix, name, headers, count };
                    }).filter(it => it.prefix && it.prefix !== currentPrefix && it.count > 0);

                    if (items.length === 0) {
                        listEl.innerHTML = '<div class="hed-empty">没有其它带自定义请求头的节点可导入</div>';
                    } else {
                        listEl.innerHTML = items.map(it =>
                            '<button type="button" class="import-node-row" data-headers="' + escapeHtml(it.headers) + '">' +
                                '<span class="import-node-name">' + escapeHtml(it.name) + '</span>' +
                                '<span class="import-node-meta">/' + escapeHtml(it.prefix) + ' · ' + it.count + ' 个头</span>' +
                            '</button>'
                        ).join('');
                        listEl.querySelectorAll('.import-node-row').forEach(btn => {
                            btn.onclick = () => {
                                const res = this.mergeFrom(btn.getAttribute('data-headers'));
                                this.closeImportModal();
                                showToast('导入 ' + (res.added + res.updated) + ' 条请求头' +
                                    (res.updated ? '（' + res.updated + ' 条覆盖同名）' : ''));
                            };
                        });
                    }
                    modal.classList.add('show');
                    modalOpened('importHeadersModal', '.import-node-row');
                },
                closeImportModal() {
                    const m = document.getElementById('importHeadersModal');
                    if (m) m.classList.remove('show');
                    modalClosed('importHeadersModal');
                },
                openCurlModal() {
                    const m = document.getElementById('curlModal');
                    if (m) {
                        m.classList.add('show');
                        modalOpened('curlModal', '#curlInput');
                    }
                },
                closeCurlModal() {
                    const m = document.getElementById('curlModal');
                    if (m) m.classList.remove('show');
                    const i = document.getElementById('curlInput');
                    if (i) i.value = '';
                    modalClosed('curlModal');
                },
                parseCurl() {
                    const input = document.getElementById('curlInput');
                    const text = input ? input.value : '';
                    const re = /(?:-H|--header)\s+(['"])([^:]+):\s*([^]*?)\1/g;
                    let match, added = 0;
                    while ((match = re.exec(text)) !== null) {
                        const k = match[2].trim();
                        const v = match[3].trim();
                        if (!k) continue;
                        if (rows.find(r => r.key.toLowerCase() === k.toLowerCase())) continue;
                        rows.push(makeRow(k, v, true));
                        added++;
                    }
                    if (added === 0) {
                        showToast('未在 cURL 中找到 -H 标头');
                        return;
                    }
                    this.closeCurlModal();
                    render();
                    showToast('导入 ' + added + ' 条请求头');
                }
            };
        })();
        window.HeadersEditor = HeadersEditor;

        // Bootstrap empty editor once DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            HeadersEditor.init('');
        });
        // 📱 Mobile bottom Tab Bar + status pills (mobile only; desktop CSS hides them)
        (function () {
            function initMobileTabBar() {
                const bar = document.getElementById('mobileTabBar');
                if (!bar) return;
                // Operations Cockpit: 3 目的地底部 tab → showDest
                bar.querySelectorAll('button[data-dest]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const dest = btn.dataset.dest;
                        if (dest && typeof showDest === 'function') showDest(dest);
                    });
                });
            }
            // 统计里的「今日流量」到位后回填看板信号。
            function initMobilePills() {
                const src = document.getElementById('trafficToday');
                if (src) new MutationObserver(function () { updateAuroraKpis(); }).observe(src, { childList: true, characterData: true, subtree: true });
            }
            // === iOS-native chrome v5: brand, large-title, scroll observer, logout row ===
            const IOS_SECTION_TITLES = {
                // 按子 tab 键索引，标题与子 tab 标签同名（一处学会，处处一致）。
                overview:    { title: '看板',         sub: '实时状态与核心指标', srOnly: true },   // 裁决行就是这一页的标题，大标题只留给读屏
                stats:       { title: '统计',         sub: '流量、访客与历史趋势' },
                speed:       { title: '测速 & DNS',   sub: '节点延迟与解析探测' },
                cdn:         { title: '优选 CDN',     sub: '优选域名测速与一键 DNS CNAME' },
                redirect:    { title: '重定向白名单', sub: '3xx 直通，跳过代理重写' },
                settings:    { title: '部署节点',     sub: '填写下方信息后保存，每个节点占用一个 URL 前缀' },
                global:      { title: '全局设置',     sub: '所有节点共用的访问限制与媒体计数账号' },
                viewers:     { title: '观看账号',     sub: '独立观看记录与并发配额' },
                tools:       { title: '工具箱',       sub: '配置导入导出与 cURL 请求头解析' },
                danger:      { title: '危险区',       sub: '不可逆操作，请谨慎' },
            };
            // 暴露给 showSection() 用来同步紧凑栏标题
            window.__iosSectionTitles = Object.fromEntries(
                Object.entries(IOS_SECTION_TITLES).map(([k, v]) => [k, v.title])
            );

            function injectMobileBrand() {
                const topbar = document.getElementById('cf-trace-card');
                if (!topbar || topbar.querySelector('.mob-brand')) return;
                const brand = document.createElement('div');
                brand.className = 'mob-brand';
                brand.innerHTML = '<span class="mb-logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span>Emby Proxy</span>';
                topbar.insertBefore(brand, topbar.firstChild);
            }

            function injectSectionHeaders() {
                // 网络的三个子 tab 共用 #sec-speed、按 .net-panel 切换：标题注入到各面板内，随面板显隐。
                document.querySelectorAll('.app-section, .net-panel').forEach(sec => {
                    if (sec.querySelector(':scope > .ios-page-header, :scope > .net-panel')) return;
                    const key = sec.getAttribute('data-section') || sec.getAttribute('data-net-panel');
                    const meta = IOS_SECTION_TITLES[key];
                    if (!meta) return;
                    // v2.5.0: the Danger section keeps its own .danger-hero
                    // (warning icon + red title); injecting a generic
                    // .ios-page-header on top would double the title.
                    if (key === 'danger' && sec.querySelector(':scope > .danger-hero')) return;
                    const hdr = document.createElement('header');
                    hdr.className = 'ios-page-header' + (meta.srOnly ? ' sr-only' : '');
                    hdr.innerHTML =
                        '<h1 class="ios-large-title">' + meta.title + '</h1>' +
                        '<p class="ios-sub">' + meta.sub + '</p>';
                    sec.insertBefore(hdr, sec.firstChild);
                });
            }

            function initScrollObserver() {
                // Header for the currently visible section drives body.is-scrolled
                const update = () => {
                    const activeSec = document.querySelector('.app-section.is-active');
                    if (!activeSec) return;
                    // 网络子 tab 的标题在 .net-panel 内；隐藏面板的标题 getClientRects() 为空，跳过。
                    const hdr = [...activeSec.querySelectorAll('.ios-page-header')].find(h => h.getClientRects().length);
                    if (!hdr) { document.body.classList.remove('is-scrolled'); return; }
                    const bottom = hdr.getBoundingClientRect().bottom;
                    document.body.classList.toggle('is-scrolled', bottom < 8);
                };
                let ticking = false;
                window.addEventListener('scroll', () => {
                    if (ticking) return;
                    ticking = true;
                    requestAnimationFrame(() => { update(); ticking = false; });
                }, { passive: true });
                update();
            }

            function syncCompactBarTitle() {
                const activeTab = document.querySelector('.subtab.is-active');
                const activeSec = document.querySelector('.app-section.is-active');
                const key = activeTab ? activeTab.getAttribute('data-tab') : activeSec && activeSec.getAttribute('data-section');
                const meta = IOS_SECTION_TITLES[key];
                if (!meta) return;
                const compact = document.getElementById('mobileTopbarCompact');
                if (compact) compact.textContent = meta.title;
                // v2.5.0: also populate desktop glass-topbar slot on initial paint.
                const tbSlot = document.getElementById('tbSectionTitle');
                if (tbSlot) tbSlot.textContent = meta.title;
            }

            function injectLogoutRow() {
                const settings = document.querySelector('.app-section[data-section="settings"]');
                if (!settings || document.getElementById('iosLogoutGroup')) return;
                const group = document.createElement('div');
                group.id = 'iosLogoutGroup';
                group.className = 'ios-form-group';
                group.style.marginTop = '24px';
                group.innerHTML =
                    '<button type="button" class="ios-form-row is-tap is-danger" id="iosLogoutBtn" style="width:100%;border:none;background:transparent;font:inherit;cursor:pointer;justify-content:center;font-weight:600;">退出登录</button>';
                settings.appendChild(group);
                group.querySelector('#iosLogoutBtn').addEventListener('click', () => {
                    if (typeof logout === 'function') logout();   // 确认已收敛进 logout()
                });
            }

            function initIosChrome() {
                if (!window.matchMedia('(max-width: 768px)').matches) {
                    // Still inject markup so that on resize it works; CSS hides on desktop.
                }
                injectMobileBrand();
                injectSectionHeaders();
                injectLogoutRow();
                initScrollObserver();
                syncCompactBarTitle();
            }

            function bootAll() {
                initMobileTabBar();
                initMobilePills();
                initIosChrome();
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', bootAll);
            } else {
                bootAll();
            }
        })();

        // ===== ⌘K 命令面板 (Operations Cockpit) =====
        (function () {
            var DESTS = [
                { label: '监控 · 看板', kw: 'monitor board overview gaikuang 概览 看板 监控', run: function () { showDest('monitor', 'overview'); } },
                { label: '监控 · 统计', kw: 'stats tongji 统计 数据', run: function () { showDest('monitor', 'stats'); } },
                { label: '网络 · 测速 & DNS', kw: 'network speed dns ceshe 测速 网络 解析', run: function () { showDest('network', 'speed'); } },
                { label: '网络 · 优选 CDN', kw: 'network cdn youxuan 优选 域名 加速', run: function () { showDest('network', 'cdn'); } },
                { label: '网络 · 重定向白名单', kw: 'network redirect whitelist chongdingxiang 重定向 白名单 直连', run: function () { showDest('network', 'redirect'); } },
                { label: '配置 · 部署节点', kw: 'config deploy settings bushu 部署 配置 设置', run: function () { showDest('config', 'settings'); } },
                { label: '配置 · 全局设置', kw: 'global allowlist referer country quanju 全局 白名单 国家 防盗链 共享账号', run: function () { showDest('config', 'global'); } },
                { label: '配置 · 观看账号', kw: 'viewers accounts guankan 观看 账号 朋友 并发', run: function () { showDest('config', 'viewers'); } },
                { label: '配置 · 工具箱', kw: 'tools gongju 工具', run: function () { showDest('config', 'tools'); } },
                { label: '配置 · 危险区', kw: 'danger weixian 危险', run: function () { showDest('config', 'danger'); } }
            ];
            var ACTIONS = [
                { label: '新增节点', hint: '部署一个反代节点', kw: 'add new node xinzeng 新增 节点 部署', run: function () { showDest('config', 'settings'); setTimeout(function () { var el = document.getElementById('remark'); if (el) el.focus(); }, 260); } },
                { label: '全局测速', hint: '测试所有节点延迟', kw: 'speed test ping ceshe 全局 测速', run: function () { if (typeof pingAllNodes === 'function') pingAllNodes(); } },
                { label: '刷新全站海报缓存', hint: '清空 CDN 海报', kw: 'purge cache poster shuaxin 刷新 海报 缓存', run: function () { if (typeof purgeCache === 'function') purgeCache(); } },
                { label: '更新 Worker 核心代码', hint: '覆盖部署', kw: 'worker update gengxin 更新 核心', run: function () { if (typeof openWorkerUpdate === 'function') openWorkerUpdate(); } },
                { label: 'Worker 调度模式', hint: '选择 Worker 落地机房', kw: 'placement smart region diaodu 调度 机房 落地', run: function () { openPlacementDrawerFromMobile(); } },
                { label: '提交选中至 DNS', hint: '测速页勾选的节点', kw: 'dns submit selected tijiao 提交 解析 选中', run: function () { showDest('network', 'speed'); updateSelectedToDns(); } },
                { label: '更新 TOP3 至 DNS', hint: '最快的 3 个测速节点', kw: 'dns top3 fastest zuikuai 最快 解析', run: function () { showDest('network', 'speed'); updateTop3ToDns(); } },
                { label: '切换主题', hint: '明 / 暗 / 自动', kw: 'theme dark light zhuti 主题 切换', run: function () { if (typeof toggleDarkMode === 'function') toggleDarkMode(); } },
                { label: '退出登录', hint: '断开管理会话', kw: 'logout signout tuichu 退出 登出', run: function () { if (typeof logout === 'function') logout(); } }
            ];
            function nodeCommands() {
                return (window.globalRoutesData || []).map(function (r) {
                    return { label: '节点 · ' + (r.remark || r.prefix), hint: '/' + r.prefix, kw: 'node jiedian ' + (r.remark || '') + ' ' + r.prefix, run: function () {
                        showDest('monitor', 'overview');
                        setTimeout(function () { var row = document.querySelector('.node-row[data-prefix="' + r.prefix + '"]'); if (row) { var c = row.querySelector('.nr-expand'); if (c && !row.classList.contains('is-open')) toggleNodeRow(c); row.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 280);
                    } };
                });
            }
            function allCommands() { return DESTS.concat(ACTIONS).concat(nodeCommands()); }
            var overlay, input, list, items = [], active = 0, prevFocus = null;
            function build() {
                overlay = document.getElementById('cmdk'); if (!overlay || overlay._wired) return; overlay._wired = 1;
                input = overlay.querySelector('.cmdk-input');
                list = overlay.querySelector('.cmdk-list');
                if (!list.id) list.id = 'cmdkList';
                // listbox 要有一个 combobox 来指它，方向键移动才会被读出来。
                input.setAttribute('role', 'combobox');
                input.setAttribute('aria-controls', list.id);
                input.setAttribute('aria-autocomplete', 'list');
                input.setAttribute('aria-expanded', 'false');
                overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
                input.addEventListener('input', function () { render(input.value); });
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
                    else if (e.key === 'Enter') { e.preventDefault(); exec(active); }
                });
                // Escape 与 Tab 绑在浮层层级：焦点一旦落到某个选项按钮上，绑在 input 上的
                // 处理器就再也收不到键了。焦点环形状沿用 #editModal 那一套。
                overlay.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
                    if (e.key !== 'Tab') return;
                    var f = focusable();
                    if (!f.length) return;
                    var first = f[0], last = f[f.length - 1], act = document.activeElement;
                    if (e.shiftKey && act === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
                    else if (!overlay.contains(act)) { e.preventDefault(); first.focus(); }
                });
            }
            function focusable() {
                if (!overlay) return [];
                return Array.prototype.slice.call(overlay.querySelectorAll(
                    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )).filter(function (el) { return el.offsetParent !== null; });
            }
            // 其它模态开着时不抢 ⌘K：面板会盖在它上面，且背后那个仍然可被 Tab 到。
            function otherModalOpen() {
                var wu = document.getElementById('workerUpdateModal');
                if (wu && wu.style.display && wu.style.display !== 'none') return true;
                var em = document.getElementById('editModal');
                if (em && em.style.display && em.style.display !== 'none') return true;
                var curl = document.getElementById('curlModal');
                if (curl && curl.classList.contains('show')) return true;
                var imp = document.getElementById('importHeadersModal');
                return !!(imp && imp.classList.contains('show'));
            }
            function match(cmd, q) { if (!q) return true; q = q.toLowerCase(); return (cmd.label + ' ' + (cmd.kw || '')).toLowerCase().indexOf(q) !== -1; }
            function render(q) {
                items = allCommands().filter(function (c) { return match(c, q); }); active = 0;
                if (!items.length) {
                    list.innerHTML = '<div class="cmdk-empty">无匹配命令</div>';
                    if (input) input.removeAttribute('aria-activedescendant');
                    return;
                }
                // label / hint 里有运维者自己填的备注(globalRoutesData)，一律转义后再拼。
                list.innerHTML = items.map(function (c, i) {
                    return '<button type="button" class="cmdk-item" role="option" id="cmdk-opt-' + i + '" aria-selected="false" data-i="' + i + '">'
                        + '<span class="cmdk-label">' + _embyEscape(c.label) + '</span>'
                        + (c.hint ? '<span class="cmdk-hint">' + _embyEscape(c.hint) + '</span>' : '')
                        + '</button>';
                }).join('');
                Array.prototype.forEach.call(list.querySelectorAll('.cmdk-item'), function (el) {
                    el.addEventListener('mousemove', function () { setActive(+el.dataset.i); });
                    el.addEventListener('click', function () { exec(+el.dataset.i); });
                });
                setActive(0);
            }
            function setActive(i) {
                active = i;
                Array.prototype.forEach.call(list.querySelectorAll('.cmdk-item'), function (el) {
                    var on = +el.dataset.i === i;
                    el.classList.toggle('is-active', on);
                    el.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                // 焦点留在输入框，由 aria-activedescendant 把"当前项"念出来。
                if (input) input.setAttribute('aria-activedescendant', 'cmdk-opt-' + i);
            }
            function move(d) { if (!items.length) return; var n = (active + d + items.length) % items.length; setActive(n); var el = list.querySelector('.cmdk-item[data-i="' + n + '"]'); if (el) el.scrollIntoView({ block: 'nearest' }); }
            function exec(i) { var c = items[i]; close(); if (c && c.run) setTimeout(c.run, 0); }
            function open() { build(); if (!overlay) return; prevFocus = document.activeElement; overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); input.setAttribute('aria-expanded', 'true'); input.value = ''; render(''); setTimeout(function () { input.focus(); }, 20); }
            function close() { if (!overlay) return; overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); if (input) { input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); } if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) {} } }
            window.openCmdK = open; window.closeCmdK = close;
            document.addEventListener('keydown', function (e) {
                if (!((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K'))) return;
                var o = document.getElementById('cmdk');
                var isOpen = !!(o && o.classList.contains('is-open'));
                if (!isOpen && otherModalOpen()) return;
                e.preventDefault();
                if (isOpen) close(); else open();
            });
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
        })();
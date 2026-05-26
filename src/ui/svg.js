import { htmlEscape } from '../util/text.js';

export const SVG_TG = `<svg viewBox="0 0 24 24" style="width:20px;height:20px;margin-right:8px;fill:#0088cc;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/></svg>`;

// ECG/心电图-style history strip. Takes [{ok, ms}, …] (oldest→newest, up to ~60 samples).
// Returns inline SVG string. Static — no animation, baseline + QRS-like spikes.
// Width 240, height 36, ok line uses currentColor or var(--primary), fail spikes use var(--err).
export function ecgStripSvg(history, opts) {
    opts = opts || {};
    const W = 240, H = 36;
    const padX = 2, padY = 4;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const baseY = padY + innerH - 2; // isoelectric baseline near bottom
    const samples = Array.isArray(history) ? history.slice(-60) : [];
    if (!samples.length) {
        return `<svg class="ecg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <line x1="${padX}" y1="${baseY}" x2="${W - padX}" y2="${baseY}" class="ecg-base"/>
            <text x="${W / 2}" y="${H / 2 + 3}" class="ecg-empty" text-anchor="middle">暂无探测</text>
        </svg>`;
    }
    const n = samples.length;
    const stepX = n > 1 ? innerW / (n - 1) : innerW;
    // map ms to y (lower y = higher spike). Cap at 400ms for visual range.
    const msToY = (ms) => {
        const capped = Math.max(0, Math.min(400, ms || 0));
        // base = baseY; peak height = up to innerH * 0.85
        return baseY - (capped / 400) * (innerH * 0.85);
    };
    // Build path: small baseline jitter + QRS-like spike per sample
    // Each sample is rendered as: baseline → tiny pre-tick → spike up to y → drop back to baseline → next
    let okPath = '';
    let failMarks = '';
    let lastX = padX;
    let cursor = padX;
    let inOkRun = false;
    for (let i = 0; i < n; i++) {
        const s = samples[i];
        const x = padX + stepX * i;
        if (s.ok) {
            const peakY = msToY(s.ms);
            // Lead-in flat segment, then a QRS spike (up-tick, peak, down-tick), then return to baseline.
            const preX = Math.max(lastX, x - stepX * 0.45);
            const upX  = x - stepX * 0.18;
            const dnX  = x + stepX * 0.10;
            const tailX = x + stepX * 0.25;
            if (!inOkRun) {
                okPath += `M${preX.toFixed(2)} ${baseY}`;
                inOkRun = true;
            } else {
                okPath += `L${preX.toFixed(2)} ${baseY}`;
            }
            okPath += ` L${upX.toFixed(2)} ${baseY} L${x.toFixed(2)} ${peakY.toFixed(2)} L${dnX.toFixed(2)} ${baseY} L${tailX.toFixed(2)} ${baseY}`;
            lastX = tailX;
        } else {
            // Render failure as a tall red spike + close prior ok run.
            if (inOkRun) {
                okPath += ` L${(x - stepX * 0.3).toFixed(2)} ${baseY}`;
                inOkRun = false;
            }
            failMarks += `<line x1="${x.toFixed(2)}" y1="${(padY + 1).toFixed(2)}" x2="${x.toFixed(2)}" y2="${baseY.toFixed(2)}" class="ecg-fail"/>`;
            lastX = x;
        }
    }
    if (inOkRun) {
        okPath += ` L${(padX + innerW).toFixed(2)} ${baseY}`;
    }
    // Current-sample marker
    const lastSample = samples[n - 1];
    const lastX2 = padX + innerW;
    const lastY = lastSample.ok ? msToY(lastSample.ms) : baseY;
    const lastClass = lastSample.ok ? 'ecg-dot ok' : 'ecg-dot bad';
    return `<svg class="ecg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <line x1="${padX}" y1="${baseY}" x2="${W - padX}" y2="${baseY}" class="ecg-base"/>
        <line x1="${padX}" y1="${(padY + innerH * 0.5).toFixed(2)}" x2="${W - padX}" y2="${(padY + innerH * 0.5).toFixed(2)}" class="ecg-mid"/>
        ${okPath ? `<path d="${okPath}" class="ecg-line" fill="none"/>` : ''}
        ${failMarks}
        <circle cx="${lastX2.toFixed(2)}" cy="${lastY.toFixed(2)}" r="2.4" class="${lastClass}"/>
    </svg>`;
}

export function renderCardSvg(card) {
    const w = 360, h = 120;
    const ok = card.ok;
    const dotColor = ok ? '#30d158' : '#ff3b30';
    const statusText = ok ? '在线' : '离线';
    const pct = (v) => v == null ? '—' : (v * 100).toFixed(1) + '%';
    const name = String(card.name || '').slice(0, 40);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <style>
      .bg { fill:#1c1c1e; }
      .text { fill:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; }
      .name { font-size:16px; font-weight:600; }
      .label { font-size:11px; fill:#98989d; }
      .value { font-size:14px; font-weight:600; }
    </style>
  </defs>
  <rect class="bg" x="0" y="0" width="${w}" height="${h}" rx="14"/>
  <circle cx="22" cy="24" r="6" fill="${dotColor}"/>
  <text class="text name" x="38" y="29">${htmlEscape(name)}</text>
  <text class="text label" x="20" y="60">状态</text>
  <text class="text value" x="20" y="78" fill="${dotColor}">${statusText}</text>
  <text class="text label" x="130" y="60">7天可用</text>
  <text class="text value" x="130" y="78">${pct(card.avail_7d)}</text>
  <text class="text label" x="240" y="60">延迟</text>
  <text class="text value" x="240" y="78">${ok ? card.latest_ms + ' ms' : '—'}</text>
  <text class="text label" x="20" y="104">由 emby-proxy 监控</text>
</svg>`;
}

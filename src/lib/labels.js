//===============================================================
//Script Name: labels.js
//Script Location: src/lib/labels.js
//Date: 02/25/2026
//Created By: T03KNEE
//Version: 2.0.0 — Redesigned for Precision Engineering aesthetic
//About: Generates printable labels (Dymo 30334 / 2.25" x 1.25").
//       Both label types: Batch (loaded ammo) and Purchase (component LOT).
//===============================================================

import QRCode from 'qrcode'

/* ── SHARED STYLES ──────────────────────────────────────────── */
const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

  @page { size: 2.25in 1.25in; margin: 0; }

  html, body { margin: 0; padding: 0; background: #1a1a1a; }

  /* ── SCREEN PREVIEW ── */
  @media screen and (min-width: 500px) {
    body { display: flex; flex-direction: column; align-items: flex-start; padding: 40px 50px; gap: 12px; }
    .label-card { transform: scale(2.8); transform-origin: top left; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
    .print-hint {
      font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
      color: #888; letter-spacing: 0.08em; text-transform: uppercase;
    }
    .close-btn {
      position: fixed; top: 14px; right: 14px;
      background: #2a2a2a; color: #ccc; padding: 6px 14px;
      border-radius: 4px; font-family: 'Inter', sans-serif; font-weight: 700;
      font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
      text-decoration: none; border: 1px solid #3a3a3a; cursor: pointer;
    }
  }
  @media screen and (max-width: 499px) {
    body { display: flex; flex-direction: column; align-items: center; padding-top: 56px; gap: 8px; background: #111; }
    .label-card { transform: scale(1.5); transform-origin: top center; }
    .print-hint {
      position: fixed; top: 0; left: 0; right: 0;
      font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700;
      color: #fff; background: #c0392b; padding: 8px 12px;
      text-align: center; letter-spacing: 0.05em;
    }
    .close-btn { display: none; }
  }

  @media print {
    body { background: white; padding: 0; }
    .print-hint, .close-btn { display: none !important; }
    .label-card { transform: none !important; box-shadow: none !important; }
  }

  /* ── LABEL BASE ── */
  .label-card {
    width: 2.25in; height: 1.25in;
    background: #0a0a0a;
    font-family: 'Inter', sans-serif;
    overflow: hidden;
    display: flex;
    box-sizing: border-box;
    position: relative;
    border: 1px solid #2a2a2a;
  }

  /* Copper top-line accent */
  .label-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent 0%, #b87333 30%, #d4a843 50%, #b87333 70%, transparent 100%);
    z-index: 10;
  }

  /* ── LAYOUT ── */
  .label-left {
    width: 0.75in; display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    padding: 4px; border-right: 1px solid #1e1e1e; flex-shrink: 0;
    background: #060606;
  }
  .qr-img { width: 0.62in; height: 0.62in; }
  .label-right {
    flex: 1; padding: 5px 6px 4px 6px;
    display: flex; flex-direction: column; justify-content: space-between;
    overflow: hidden;
  }

  /* ── TYPOGRAPHY ── */
  .eyebrow {
    font-size: 5.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.22em; color: #b87333;
    margin-bottom: 1px;
  }
  .main-title {
    font-size: 9.5px; font-weight: 900; text-transform: uppercase;
    color: #f0ece4; line-height: 1.1; letter-spacing: -0.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sub-title {
    font-size: 7.5px; font-weight: 600; color: #9a9590;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.2; margin-top: 1px;
  }
  .detail-row {
    font-family: 'JetBrains Mono', monospace;
    font-size: 6.5px; color: #d4a843; letter-spacing: 0.04em;
    white-space: nowrap; overflow: hidden;
  }
  .footer-row {
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .lot-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 5.5px; font-weight: 700;
    color: #b87333; letter-spacing: 0.12em; text-transform: uppercase;
  }
  .type-badge {
    font-size: 5px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.18em; color: #555c6a;
    border: 0.5px solid #2a2a2a; padding: 1px 3px; border-radius: 1px;
  }
  .rt-logo {
    font-family: 'JetBrains Mono', monospace;
    font-size: 4.5px; color: #2a2a2a; letter-spacing: 0.2em; text-transform: uppercase;
  }
`

/* ── OPEN POPUP HELPER ─────────────────────────────────────── */
function openLabelWindow(html, title = 'Label') {
  const win = window.open('', '_blank', 'width=620,height=440')
  if (win) {
    win.document.write(html)
    win.document.close()
  } else {
    alert('Please allow popups to print labels.')
  }
}

/* ── BATCH LABEL ────────────────────────────────────────────── */
export async function printBatchLabel(batch) {
  if (!batch) return

  const appUrl = window.location.origin
  const qrUrl  = `${appUrl}?batchId=${batch.id}`
  const qrDataUri = await QRCode.toDataURL(qrUrl, { width: 80, margin: 0, errorCorrectionLevel: 'L',
    color: { dark: '#d4a843', light: '#060606' } })

  const components = batch.components?.split(',')[0]?.trim() || 'Load Data'
  const dateStr    = batch.date || ''

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Batch #${batch.id}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${SHARED_CSS}</style>
</head>
<body>
  <button onclick="window.close()" class="close-btn">✕ Close</button>
  <span class="print-hint">DYMO 30334 · 2.25" × 1.25" · No Margins</span>
  <div class="label-card">
    <div class="label-left">
      <img src="${qrDataUri}" class="qr-img" />
      <div class="rt-logo" style="margin-top:3px">RT</div>
    </div>
    <div class="label-right">
      <div>
        <div class="eyebrow">Loaded Ammunition</div>
        <div class="main-title">${batch.recipe?.split('(')[0]?.trim() || 'Batch'}</div>
        <div class="sub-title">${components}</div>
      </div>
      <div>
        <div class="detail-row">${batch.rounds} RDS · ${dateStr}</div>
        <div class="footer-row">
          <span class="lot-badge">ID: ${batch.id}</span>
          <span class="type-badge">AMMO</span>
        </div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 600); }<\/script>
</body>
</html>`

  openLabelWindow(html, `Batch #${batch.id}`)
}

/* ── PURCHASE / LOT LABEL ───────────────────────────────────── */
export async function printPurchaseLabel(purchase) {
  if (!purchase) return

  const appUrl = window.location.origin
  const qrUrl  = `${appUrl}?purchaseId=${purchase.id}`
  const qrDataUri = await QRCode.toDataURL(qrUrl, { width: 80, margin: 0, errorCorrectionLevel: 'L',
    color: { dark: '#d4a843', light: '#060606' } })

  const type      = (purchase.componentType || 'Component').toUpperCase()
  const brand     = purchase.brand || ''
  const name      = purchase.name  || ''
  const qty       = `${purchase.qty} ${purchase.unit}`
  const caliber   = purchase.caliber ? ` · ${purchase.caliber}` : ''
  const dateStr   = purchase.purchaseDate ? String(purchase.purchaseDate).substring(0, 10) : ''
  const lotId     = purchase.lotId || `ID:${purchase.id}`

  const html = `<!DOCTYPE html>
<html>
<head>
<title>LOT ${lotId}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${SHARED_CSS}</style>
</head>
<body>
  <button onclick="window.close()" class="close-btn">✕ Close</button>
  <span class="print-hint">DYMO 30334 · 2.25" × 1.25" · No Margins</span>
  <div class="label-card">
    <div class="label-left">
      <img src="${qrDataUri}" class="qr-img" />
      <div class="rt-logo" style="margin-top:3px">RT</div>
    </div>
    <div class="label-right">
      <div>
        <div class="eyebrow">${type}${purchase.caliber ? ' · ' + purchase.caliber : ''}</div>
        <div class="main-title">${brand}</div>
        <div class="sub-title">${name}</div>
      </div>
      <div>
        <div class="detail-row">${qty}${dateStr ? ' · ' + dateStr : ''}</div>
        <div class="footer-row">
          <span class="lot-badge">${lotId}</span>
          <span class="type-badge">${type.substring(0, 6)}</span>
        </div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 600); }<\/script>
</body>
</html>`

  openLabelWindow(html, `LOT ${lotId}`)
}


import QRCode from 'qrcode'

/* ── SHARED STYLES ──────────────────────────────────────────── */
const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');

  @page { size: 2.25in 1.25in; margin: 0; }

  html, body { margin: 0; padding: 0; }

  /* ── SCREEN PREVIEW (inside overlay iframe) ── */
  @media screen {
    body {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: transparent;
    }
    .label-card { zoom: 3.5; box-shadow: 0 16px 60px rgba(0,0,0,0.85), 0 0 0 1px #2a2a2a; }
  }

  @media print {
    body { background: white; padding: 0; margin: 0; }
    .label-card { transform: none !important; zoom: 1 !important; box-shadow: none !important; }
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

  /* Red top-line accent */
  .label-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent 0%, #c42b21 30%, #e05252 50%, #c42b21 70%, transparent 100%);
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
    letter-spacing: 0.22em; color: #c42b21;
    margin-bottom: 1px;
  }
  .main-title {
    font-size: 9.5px; font-weight: 900; text-transform: uppercase;
    color: #f2f2f4; line-height: 1.1; letter-spacing: -0.01em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sub-title {
    font-size: 7.5px; font-weight: 600; color: #82828e;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.2; margin-top: 1px;
  }
  .detail-row {
    font-family: 'JetBrains Mono', monospace;
    font-size: 6.5px; color: #f2f2f4; letter-spacing: 0.04em;
    white-space: nowrap; overflow: hidden;
  }
  .footer-row {
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .lot-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 5.5px; font-weight: 700;
    color: #c42b21; letter-spacing: 0.12em; text-transform: uppercase;
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

/* ── LABEL OVERLAY (no popup permissions needed) ───────────── */
function openLabelWindow(html) {
  const existing = document.getElementById('rt-label-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'rt-label-overlay'
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:9999',
    'background:var(--scrim-bg)',
    'backdrop-filter:blur(4px)',
    'display:flex;flex-direction:column',
  ].join(';')

  const bar = document.createElement('div')
  bar.style.cssText = [
    'flex-shrink:0;display:flex;align-items:center;justify-content:space-between',
    'padding:12px 20px;background:var(--surface);border-bottom:1px solid var(--border-md)',
    'font-family:Inter,sans-serif;font-size:11px;color:var(--text-md)',
    'letter-spacing:0.1em;text-transform:uppercase',
  ].join(';')
  bar.innerHTML = `
    <span>DYMO 30334 &middot; 2.25&quot; &times; 1.25&quot; &middot; No Margins &middot; No Scaling</span>
    <div style="display:flex;gap:8px">
      <button id="rt-lbl-print" style="font-size:10px;font-weight:700;background:var(--overlay);color:var(--text-hi);padding:5px 14px;border-radius:3px;border:1px solid var(--border-md);cursor:pointer;letter-spacing:0.08em;text-transform:uppercase;font-family:Inter,sans-serif">Print</button>
      <button id="rt-lbl-close" style="font-size:10px;font-weight:700;background:#c42b21;color:#fff;padding:5px 14px;border-radius:3px;border:none;cursor:pointer;letter-spacing:0.08em;text-transform:uppercase;font-family:Inter,sans-serif">&#x2715; Close</button>
    </div>
  `

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'flex:1;border:none;background:var(--bg)'
  iframe.srcdoc = html

  overlay.appendChild(bar)
  overlay.appendChild(iframe)
  document.body.appendChild(overlay)

  document.getElementById('rt-lbl-close').onclick = () => overlay.remove()
  document.getElementById('rt-lbl-print').onclick = () => iframe.contentWindow?.print()
}

/* ── BATCH LABEL ────────────────────────────────────────────── */
export async function printBatchLabel(batch) {
  if (!batch) return

  const appUrl = window.location.origin
  const qrUrl  = `${appUrl}?batchId=${batch.id}`
  const qrDataUri = await QRCode.toDataURL(qrUrl, { width: 80, margin: 0, errorCorrectionLevel: 'L',
    color: { dark: '#c42b21', light: '#060606' } })

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
    color: { dark: '#c42b21', light: '#060606' } })

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
</body>
</html>`

  openLabelWindow(html, `LOT ${lotId}`)
}

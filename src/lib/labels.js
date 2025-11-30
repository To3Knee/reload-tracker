//===============================================================
//Script Name: labels.js
//Script Location: src/lib/labels.js
//Date: 11/30/2025
//Created By: T03KNEE
//Version: 1.3.0
//About: Generates printable labels (Dymo/Zebra style).
//       Updated: Added "Close" button for Mobile PWA support.
//===============================================================

import QRCode from 'qrcode'

const CLOSE_BTN_STYLE = `
  .close-btn {
    position: fixed; bottom: 10px; right: 10px; z-index: 9999;
    background: rgba(0,0,0,0.8); color: #fff; padding: 8px 16px;
    border-radius: 20px; font-family: sans-serif; font-weight: bold; font-size: 10px;
    text-decoration: none; border: 1px solid rgba(255,255,255,0.2); cursor: pointer;
  }
  @media print { .close-btn, .print-hint { display: none !important; } }
`

/**
 * Generate a printable label for a specific batch (Loaded Ammo).
 */
export async function printBatchLabel(batch) {
  if (!batch) return

  const appUrl = window.location.origin
  const qrUrl = `${appUrl}?batchId=${batch.id}`
  
  const qrDataUri = await QRCode.toDataURL(qrUrl, {
    width: 100,
    margin: 0,
    errorCorrectionLevel: 'L'
  })

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Batch #${batch.id}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;900&display=swap');
  @page { size: 2.25in 1.25in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #eee; }

  .label-card {
    width: 2.25in; height: 1.25in;
    background: white; color: black;
    font-family: 'Inter', sans-serif; 
    overflow: hidden;
    display: flex; box-sizing: border-box; position: relative;
  }

  @media screen and (min-width: 500px) {
    .label-card { transform: scale(3); transform-origin: top left; margin: 50px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .print-hint { position: fixed; top: 10px; left: 50px; font-size: 14px; font-weight: bold; color: #444; background: #ddd; padding: 4px 10px; border-radius: 4px; font-family: sans-serif; }
  }
  @media screen and (max-width: 499px) {
    .label-card { transform: scale(1.4); transform-origin: top center; margin: 60px auto 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.4); }
    .print-hint { position: fixed; top: 0; left: 0; right: 0; font-size: 12px; font-weight: bold; color: #fff; background: #b33c3c; padding: 8px; text-align: center; font-family: sans-serif; }
  }
  
  /* Shared Close Button Style */
  ${CLOSE_BTN_STYLE}

  .label-container { width: 100%; height: 100%; display: flex; padding: 0.1in; box-sizing: border-box; align-items: center; }
  .qr-section { width: 0.8in; display: flex; justify-content: center; align-items: center; }
  .qr-img { width: 100%; height: auto; }
  .info-section { flex: 1; padding-left: 0.1in; display: flex; flex-direction: column; justify-content: center; line-height: 1.1; }
  .date { font-size: 8px; font-weight: 600; color: #555; margin-bottom: 2px; }
  .recipe-name { font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; word-break: break-word; }
  .details { font-size: 8px; font-weight: 600; color: #000; }
  .batch-id { font-size: 7px; margin-top: 4px; color: #999; }
</style>
</head>
<body>
  <button onclick="window.close()" class="close-btn">Close X</button>
  <div class="print-hint">🖨️ Size 30334 (2.25" x 1.25") • Margins: None</div>
  <div class="label-card">
    <div class="label-container">
      <div class="qr-section"><img src="${qrDataUri}" class="qr-img" /></div>
      <div class="info-section">
        <div class="date">${batch.date}</div>
        <div class="recipe-name">${batch.recipe.split('(')[0]}</div>
        <div class="details">
          ${batch.components.split(',')[0] || 'Load Data'} <br/>
          ${batch.rounds} Rounds
        </div>
        <div class="batch-id">ID: ${batch.id}</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=500,height=400')
  if (win) {
      win.document.write(html)
      win.document.close()
  } else {
      alert('Please allow popups to print labels.')
  }
}

/**
 * Generate a printable label for a Purchase/Inventory Item.
 */
export async function printPurchaseLabel(purchase) {
  if (!purchase) return

  const appUrl = window.location.origin
  const qrUrl = `${appUrl}?purchaseId=${purchase.id}`
  
  const qrDataUri = await QRCode.toDataURL(qrUrl, {
    width: 100,
    margin: 0,
    errorCorrectionLevel: 'L'
  })

  const dateStr = purchase.purchaseDate || ''

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Lot ${purchase.lotId || purchase.id}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;900&display=swap');
  @page { size: 2.25in 1.25in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #eee; }

  .label-card {
    width: 2.25in; height: 1.25in;
    background: white; color: black;
    font-family: 'Inter', sans-serif; 
    overflow: hidden;
    display: flex;
    box-sizing: border-box;
    position: relative;
  }

  @media screen and (min-width: 500px) {
    .label-card { transform: scale(3); transform-origin: top left; margin: 50px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .print-hint { position: fixed; top: 10px; left: 50px; font-size: 14px; font-weight: bold; color: #444; background: #ddd; padding: 4px 10px; border-radius: 4px; font-family: sans-serif; }
  }
  @media screen and (max-width: 499px) {
    .label-card { transform: scale(1.4); transform-origin: top center; margin: 60px auto 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.4); }
    .print-hint { position: fixed; top: 0; left: 0; right: 0; font-size: 12px; font-weight: bold; color: #fff; background: #b33c3c; padding: 8px; text-align: center; font-family: sans-serif; }
  }
  
  /* Shared Close Button Style */
  ${CLOSE_BTN_STYLE}

  .label-container { width: 100%; height: 100%; display: flex; padding: 0.1in; box-sizing: border-box; align-items: center; }
  .qr-section { width: 0.8in; display: flex; justify-content: center; align-items: center; }
  .qr-img { width: 100%; height: auto; }
  .info-section { flex: 1; padding-left: 0.1in; display: flex; flex-direction: column; justify-content: center; line-height: 1.1; }
  .type { font-size: 7px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; border-bottom: 1px solid #ccc; padding-bottom: 1px; }
  .brand-name { font-size: 10px; font-weight: 900; text-transform: uppercase; margin-top: 2px; }
  .product-name { font-size: 9px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .details { font-size: 8px; color: #333; }
  .lot-row { font-size: 8px; font-weight: 900; margin-top: 4px; background: #eee; padding: 1px 4px; border-radius: 2px; display: inline-block; }
</style>
</head>
<body>
  <button onclick="window.close()" class="close-btn">Close X</button>
  <div class="print-hint">🖨️ Size 30334 (2.25" x 1.25") • Margins: None</div>
  <div class="label-card">
    <div class="label-container">
      <div class="qr-section"><img src="${qrDataUri}" class="qr-img" /></div>
      <div class="info-section">
        <div class="type">${purchase.componentType || 'COMPONENT'}</div>
        <div class="brand-name">${purchase.brand || ''}</div>
        <div class="product-name">${purchase.name || ''}</div>
        <div class="details">
          ${purchase.qty} ${purchase.unit} ${dateStr ? '• ' + dateStr : ''}
        </div>
        <div class="lot-row">LOT: ${purchase.lotId || 'N/A'}</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=500,height=400')
  if (win) {
      win.document.write(html)
      win.document.close()
  } else {
      alert('Please allow popups to print labels.')
  }
}
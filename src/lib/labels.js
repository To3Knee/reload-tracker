//===============================================================
//Script Name: labels.js
//Script Location: src/lib/labels.js
//Date: 11/29/2025
//Created By: T03KNEE
//About: Generates printable labels (Dymo/Zebra style) with
//       embedded QR codes for Batches AND Inventory.
//===============================================================

import QRCode from 'qrcode'

/**
 * Generate a printable label for a specific batch (Loaded Ammo).
 * Target Size: 2-1/4" x 1-1/4" (Standard Dymo 30334)
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
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;900&display=swap');
  @page { size: 2.25in 1.25in; margin: 0; }
  body {
    margin: 0; padding: 0; width: 2.25in; height: 1.25in;
    font-family: 'Inter', sans-serif; overflow: hidden;
    display: flex; background: white; color: black;
  }
  .label-container {
    width: 100%; height: 100%; display: flex;
    padding: 0.1in; box-sizing: border-box; align-items: center;
  }
  .qr-section {
    width: 0.8in; display: flex; justify-content: center; align-items: center;
  }
  .qr-img { width: 100%; height: auto; }
  .info-section {
    flex: 1; padding-left: 0.1in; display: flex;
    flex-direction: column; justify-content: center; line-height: 1.1;
  }
  .date { font-size: 8px; font-weight: 600; color: #555; margin-bottom: 2px; }
  .recipe-name {
    font-size: 11px; font-weight: 900; text-transform: uppercase;
    margin-bottom: 4px; word-break: break-word;
  }
  .details { font-size: 8px; font-weight: 600; color: #000; }
  .batch-id { font-size: 7px; margin-top: 4px; color: #999; }
</style>
</head>
<body>
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
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=400,height=300')
  win.document.write(html)
  win.document.close()
}

/**
 * Generate a printable label for a Purchase/Inventory Item.
 * Target Size: 2-1/4" x 1-1/4"
 */
export async function printPurchaseLabel(purchase) {
  if (!purchase) return

  const appUrl = window.location.origin
  // Link to the purchase ID so scanning opens the app to this item
  const qrUrl = `${appUrl}?purchaseId=${purchase.id}`
  
  const qrDataUri = await QRCode.toDataURL(qrUrl, {
    width: 100,
    margin: 0,
    errorCorrectionLevel: 'L'
  })

  // Format date slightly for display
  const dateStr = purchase.purchaseDate || ''

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Lot ${purchase.lotId || purchase.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;900&display=swap');
  @page { size: 2.25in 1.25in; margin: 0; }
  body {
    margin: 0; padding: 0; width: 2.25in; height: 1.25in;
    font-family: 'Inter', sans-serif; overflow: hidden;
    display: flex; background: white; color: black;
  }
  .label-container {
    width: 100%; height: 100%; display: flex;
    padding: 0.1in; box-sizing: border-box; align-items: center;
  }
  .qr-section {
    width: 0.8in; display: flex; justify-content: center; align-items: center;
  }
  .qr-img { width: 100%; height: auto; }
  .info-section {
    flex: 1; padding-left: 0.1in; display: flex;
    flex-direction: column; justify-content: center; line-height: 1.1;
  }
  .type {
    font-size: 7px; font-weight: 700; color: #666; text-transform: uppercase;
    letter-spacing: 0.05em; margin-bottom: 2px; border-bottom: 1px solid #ccc; padding-bottom: 1px;
  }
  .brand-name {
    font-size: 10px; font-weight: 900; text-transform: uppercase;
    margin-top: 2px;
  }
  .product-name {
    font-size: 9px; font-weight: 600; margin-bottom: 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .details { font-size: 8px; color: #333; }
  .lot-row { 
    font-size: 8px; font-weight: 900; margin-top: 4px; 
    background: #eee; padding: 1px 4px; border-radius: 2px; display: inline-block;
  }
</style>
</head>
<body>
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
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=400,height=300')
  win.document.write(html)
  win.document.close()
}
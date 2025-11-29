//===============================================================
//Script Name: Reload Tracker Analytics Service
//Script Location: backend/analyticsService.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Business logic for aggregating cost and trend data.
//===============================================================

import { query } from './dbClient.js'

export async function getMonthlySpend(currentUser) {
  // Sums up (Price + Shipping + Tax) grouped by Month (YYYY-MM)
  const sql = `
    SELECT 
      TO_CHAR(purchase_date, 'YYYY-MM') as month,
      SUM(price + shipping + tax) as total
    FROM purchases
    WHERE purchase_date IS NOT NULL
    GROUP BY 1
    ORDER BY 1 ASC
    LIMIT 24
  `
  const res = await query(sql)
  return res.rows.map(r => ({ 
    month: r.month, 
    total: Number(r.total) 
  }))
}

export async function getComponentPriceTrends(currentUser) {
  // Fetches all purchases to calculate unit cost trends
  const sql = `
    SELECT 
      id, purchase_date, component_type, brand, name, 
      qty, unit, price, shipping, tax
    FROM purchases
    WHERE purchase_date IS NOT NULL
    ORDER BY purchase_date ASC
  `
  const res = await query(sql)
  
  return res.rows.map(r => {
     const total = Number(r.price) + Number(r.shipping) + Number(r.tax)
     const qty = Number(r.qty)
     if (qty <= 0) return null

     let unitCost = total / qty
     let displayUnit = r.unit

     // Normalize Powder to $/lb
     if (r.component_type === 'powder') {
        const u = (r.unit || '').toLowerCase()
        if (u === 'kg') {
           unitCost = total / (qty * 2.20462)
           displayUnit = 'lb'
        } else if (u === 'gr' || u === 'grains') {
           unitCost = total / (qty / 7000)
           displayUnit = 'lb'
        }
     }

     // Normalize Primers/Bullets to cents per piece if desired, 
     // but raw $/unit is usually fine for graphs.

     return {
       id: r.id,
       date: r.purchase_date.toISOString().slice(0,10),
       type: r.component_type,
       label: `${r.brand} ${r.name}`,
       unitCost: Number(unitCost.toFixed(4)),
       unit: displayUnit
     }
  }).filter(Boolean)
}
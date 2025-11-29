//===============================================================
//Script Name: Reload Tracker Analytics Service
//Script Location: backend/analyticsService.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.1.0
//About: Business logic for aggregating cost and trend data.
//       Updated: Added distribution, velocity, and cost history.
//===============================================================

import { query } from './dbClient.js'

// --- HELPER: Standard Math Constants ---
const GRAINS_PER_LB = 7000
const GRAINS_PER_KG = 15432.3584

export async function getMonthlySpend(currentUser) {
  const sql = `
    SELECT TO_CHAR(purchase_date, 'YYYY-MM') as month, SUM(price + shipping + tax) as total
    FROM purchases WHERE purchase_date IS NOT NULL
    GROUP BY 1 ORDER BY 1 ASC LIMIT 24
  `
  const res = await query(sql)
  return res.rows.map(r => ({ month: r.month, total: Number(r.total) }))
}

export async function getComponentPriceTrends(currentUser) {
  const sql = `
    SELECT id, purchase_date, component_type, brand, name, qty, unit, price, shipping, tax
    FROM purchases WHERE purchase_date IS NOT NULL ORDER BY purchase_date ASC
  `
  const res = await query(sql)
  
  return res.rows.map(r => {
     const total = Number(r.price) + Number(r.shipping) + Number(r.tax)
     const qty = Number(r.qty)
     if (qty <= 0) return null
     let unitCost = total / qty
     if (r.component_type === 'powder') {
        const u = (r.unit || '').toLowerCase()
        if (u === 'kg') unitCost = total / (qty * 2.20462)
        else if (u === 'gr' || u === 'grains') unitCost = total / (qty / 7000)
     }
     return {
       id: r.id,
       date: r.purchase_date.toISOString().slice(0,10),
       type: r.component_type,
       unitCost: Number(unitCost.toFixed(4))
     }
  }).filter(Boolean)
}

// 1. COMPONENT DISTRIBUTION ("Where's my Money?")
export async function getInventoryDistribution(currentUser) {
  const sql = `
    SELECT component_type, SUM(price + shipping + tax) as total_value
    FROM purchases
    WHERE status = 'active'
    GROUP BY 1
  `
  const res = await query(sql)
  return res.rows.map(r => ({
    name: r.component_type.charAt(0).toUpperCase() + r.component_type.slice(1),
    value: Number(r.total_value)
  }))
}

// 2. USAGE VELOCITY ("The Burn Rate")
export async function getLoadVelocity(currentUser) {
  const sql = `
    SELECT TO_CHAR(load_date, 'YYYY-MM') as month, SUM(rounds_loaded) as rounds
    FROM batches
    GROUP BY 1 ORDER BY 1 ASC LIMIT 12
  `
  const res = await query(sql)
  return res.rows.map(r => ({
    month: r.month,
    rounds: Number(r.rounds)
  }))
}

// 3. BATCH COST HISTORY ("Inflation Buster")
// Calculates the actual cost-per-round of every batch logged
export async function getBatchCostHistory(currentUser) {
  // We need to fetch batches and join their components to calculate cost
  const sql = `
    SELECT 
      b.load_date, 
      r.charge_grains,
      p.price as p_price, p.qty as p_qty, p.unit as p_unit,
      bu.price as bu_price, bu.qty as bu_qty,
      pr.price as pr_price, pr.qty as pr_qty,
      ca.price as ca_price, ca.qty as ca_qty
    FROM batches b
    JOIN recipes r ON b.recipe_id = r.id
    LEFT JOIN purchases p ON b.powder_lot_id = p.id
    LEFT JOIN purchases bu ON b.bullet_lot_id = bu.id
    LEFT JOIN purchases pr ON b.primer_lot_id = pr.id
    LEFT JOIN purchases ca ON b.case_lot_id = ca.id
    ORDER BY b.load_date ASC
  `
  const res = await query(sql)

  return res.rows.map(row => {
    let cost = 0
    
    // Powder Cost
    if (row.p_price && row.charge_grains) {
      const pTotal = Number(row.p_price)
      const pQty = Number(row.p_qty)
      let grainsInLot = 0
      if (row.p_unit === 'lb') grainsInLot = pQty * GRAINS_PER_LB
      else if (row.p_unit === 'kg') grainsInLot = pQty * GRAINS_PER_KG
      else grainsInLot = pQty // assume grains
      
      if (grainsInLot > 0) {
        cost += (pTotal / grainsInLot) * Number(row.charge_grains)
      }
    }

    // Discrete Items (Bullet/Primer/Case)
    if (row.bu_price && row.bu_qty) cost += Number(row.bu_price) / Number(row.bu_qty)
    if (row.pr_price && row.pr_qty) cost += Number(row.pr_price) / Number(row.pr_qty)
    if (row.ca_price && row.ca_qty) cost += (Number(row.ca_price) / Number(row.ca_qty)) / 5 // Assumed reuse factor of 5

    return {
      date: row.load_date.toISOString().slice(0,10),
      cost: Number(cost.toFixed(3))
    }
  }).filter(r => r.cost > 0)
}
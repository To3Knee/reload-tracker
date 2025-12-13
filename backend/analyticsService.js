//===============================================================
//Script Name: Reload Tracker Analytics Service
//Script Location: backend/analyticsService.js
//Date: 12/12/2025
//Created By: T03KNEE
//Version: 2.6.0 (Burn Rate & Math Safety)
//About: Business logic for aggregating cost and trend data.
//       - FEATURE: Added 'burnRate' (rounds/month) to Supply Forecast.
//       - FIX: Hardened unit conversion (lb/lbs/kg) to match frontend math.js.
//===============================================================

import { query } from './dbClient.js'

const GRAINS_PER_LB = 7000
const GRAINS_PER_KG = 15432.3584
const GRAMS_PER_GRAIN = 0.06479891

// Helper: robustly convert any unit string to grains
function normalizeToGrains(qty, unit) {
    const amount = Number(qty) || 0
    const u = (unit || '').toLowerCase().trim()
    
    if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return amount * GRAINS_PER_LB
    if (u === 'kg' || u === 'kilogram' || u === 'kgs') return amount * GRAINS_PER_KG
    if (u === 'gr' || u === 'grain' || u === 'grains') return amount
    if (u === 'g' || u === 'gram' || u === 'grams') return amount / GRAMS_PER_GRAIN
    
    return amount
}

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
    const totalCost = Number(r.price) + Number(r.shipping) + Number(r.tax)
    const qty = Number(r.qty) || 1
    let unitCost = 0
    
    if (r.component_type === 'powder') {
        const grains = normalizeToGrains(qty, r.unit)
        const lbs = grains / GRAINS_PER_LB
        unitCost = lbs > 0 ? totalCost / lbs : 0
    } else {
        unitCost = (totalCost / qty) * 1000
    }

    return {
        date: r.purchase_date.toISOString().split('T')[0],
        type: r.component_type,
        cost: Number(unitCost.toFixed(2)),
        label: `${r.brand} ${r.name}`
    }
  })
}

export async function getInventoryDistribution(currentUser) {
  const sql = `
    SELECT component_type, SUM(price + shipping + tax) as value
    FROM purchases
    WHERE status != 'depleted'
    GROUP BY 1
  `
  const res = await query(sql)
  return res.rows.map(r => ({ name: r.component_type, value: Number(r.value) }))
}

export async function getLoadVelocity(currentUser) {
  const sql = `
    SELECT r.name, r.caliber, l.sd, l.es, l.date
    FROM range_logs l
    JOIN recipes r ON l.recipe_id = r.id
    WHERE l.sd IS NOT NULL AND l.sd > 0
    ORDER BY l.date ASC
  `
  const res = await query(sql)
  return res.rows.map(r => ({
      name: r.name,
      caliber: r.caliber,
      sd: Number(r.sd),
      es: Number(r.es),
      date: r.date.toISOString().split('T')[0]
  }))
}

export async function getBatchCostHistory(currentUser) {
  const sql = `
    SELECT b.created_at, b.rounds_loaded, 
           r.charge_grains, r.name as recipe_name, r.caliber,
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
    ORDER BY b.created_at ASC
  `
  const res = await query(sql)

  return res.rows.map(row => {
    let unitCost = 0
    
    if (row.p_price && row.charge_grains) {
      const pTotal = Number(row.p_price)
      const grainsInLot = normalizeToGrains(row.p_qty, row.p_unit)
      if (grainsInLot > 0) {
          unitCost += (pTotal / grainsInLot) * Number(row.charge_grains)
      }
    }
    if (row.bu_price && row.bu_qty) unitCost += Number(row.bu_price) / Number(row.bu_qty)
    if (row.pr_price && row.pr_qty) unitCost += Number(row.pr_price) / Number(row.pr_qty)
    if (row.ca_price && row.ca_qty) unitCost += (Number(row.ca_price) / Number(row.ca_qty)) / 5

    return {
        date: row.created_at.toISOString().split('T')[0],
        cost: Number(unitCost.toFixed(3)),
        recipe: row.recipe_name,
        caliber: row.caliber
    }
  })
}

export async function getVolumeByCaliber(currentUser) {
    const sql = `
        SELECT r.caliber, SUM(b.rounds_loaded) as count
        FROM batches b
        JOIN recipes r ON b.recipe_id = r.id
        GROUP BY 1 ORDER BY 2 DESC
    `
    const res = await query(sql)
    return res.rows.map(r => ({ name: r.caliber || 'Unknown', value: Number(r.count) }))
}

export async function getSupplyForecast(currentUser) {
    // 1. Calculate burn rate (Rounds per day) based on last 90 days
    const usageSql = `
        SELECT r.caliber, SUM(b.rounds_loaded) as volume, 
               EXTRACT(EPOCH FROM (MAX(b.created_at) - MIN(b.created_at)))/86400 as days_span
        FROM batches b
        JOIN recipes r ON b.recipe_id = r.id
        WHERE b.created_at > NOW() - INTERVAL '90 days'
        GROUP BY 1
    `
    const usageRes = await query(usageSql)
    const rates = {}
    usageRes.rows.forEach(r => {
        const days = Math.max(Number(r.days_span), 30)
        rates[r.caliber] = Number(r.volume) / days
    })

    // 2. Calculate current inventory potential
    const invSql = `SELECT component_type, caliber, qty, unit, name FROM purchases WHERE status != 'depleted'`
    const invRes = await query(invSql)
    
    const supply = {}
    
    invRes.rows.forEach(row => {
        const cal = row.caliber || 'Generic'
        if (!supply[cal]) supply[cal] = { bullets: 0, primers: 0, powder_grains: 0 }
        
        if (row.component_type === 'bullet') supply[cal].bullets += Number(row.qty)
        if (row.component_type === 'primer') supply[cal].primers += Number(row.qty)
        if (row.component_type === 'powder') supply[cal].powder_grains += normalizeToGrains(row.qty, row.unit)
    })

    // 3. Match Supply to Demand
    const forecast = []
    
    Object.keys(rates).forEach(cal => {
        const s = supply[cal] || { bullets: 0, primers: 0, powder_grains: 0 }
        const gen = supply['Generic'] || { bullets: 0, primers: 0, powder_grains: 0 }
        
        const totalBullets = s.bullets + gen.bullets
        const totalPrimers = s.primers + gen.primers
        const totalPowder = s.powder_grains + gen.powder_grains
        
        const roundsPossible = Math.min(
            totalBullets,
            totalPrimers,
            totalPowder / 25 
        )
        
        const daysLeft = roundsPossible / rates[cal]
        
        if (daysLeft < 3650) { 
            forecast.push({
                name: cal,
                days: Math.round(daysLeft),
                rounds: Math.round(roundsPossible),
                burnRate: Math.round(rates[cal] * 30) // Monthly Burn Rate
            })
        }
    })
    
    return forecast.sort((a,b) => a.days - b.days)
}
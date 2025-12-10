//===============================================================
//Script Name: Reload Tracker Analytics Service
//Script Location: backend/analyticsService.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 2.4.0
//About: Business logic for aggregating cost and trend data.
//       - FIX: Smart Fallback for Supply Forecast (Recent vs All-Time).
//===============================================================

import { query } from './dbClient.js'

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

export async function getVolumeByCaliber(currentUser) {
  const sql = `
    SELECT r.caliber, SUM(b.rounds_loaded) as total_rounds
    FROM batches b
    JOIN recipes r ON b.recipe_id = r.id
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  `
  const res = await query(sql)
  return res.rows.map(r => ({
    name: r.caliber || 'Unknown',
    value: Number(r.total_rounds)
  }))
}

// SMART SUPPLY FORECAST
export async function getSupplyForecast(currentUser) {
    const invSql = `SELECT component_type, qty, unit FROM purchases WHERE status = 'active'`
    const invRes = await query(invSql)
    
    let stock = { powder: 0, primer: 0, bullet: 0, case: 0 }
    invRes.rows.forEach(r => {
        const type = r.component_type
        const qty = Number(r.qty)
        if (type === 'powder') {
            const u = (r.unit || '').toLowerCase()
            if (u === 'lb' || u === 'lbs') stock.powder += qty * GRAINS_PER_LB
            else if (u === 'kg' || u === 'kgs') stock.powder += qty * GRAINS_PER_KG
            else stock.powder += qty 
        } else if (stock[type] !== undefined) {
            stock[type] += qty
        }
    })

    const usageSql = `
        SELECT b.rounds_loaded, r.charge_grains, b.load_date
        FROM batches b
        JOIN recipes r ON b.recipe_id = r.id
    `
    const usageRes = await query(usageSql)
    
    let usage90 = { powder: 0, primer: 0, bullet: 0, case: 0 }
    let usageAll = { powder: 0, primer: 0, bullet: 0, case: 0 }
    
    const now = new Date()
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(now.getDate() - 90)
    
    let firstDate = now
    
    usageRes.rows.forEach(r => {
        const date = new Date(r.load_date)
        if (date < firstDate) firstDate = date
        const rounds = Number(r.rounds_loaded)
        const isRecent = date >= ninetyDaysAgo
        
        usageAll.primer += rounds
        usageAll.bullet += rounds
        usageAll.case += rounds
        if (r.charge_grains) usageAll.powder += (rounds * Number(r.charge_grains))
        
        if (isRecent) {
            usage90.primer += rounds
            usage90.bullet += rounds
            usage90.case += rounds
            if (r.charge_grains) usage90.powder += (rounds * Number(r.charge_grains))
        }
    })

    const totalMonths = Math.max(1, (now - firstDate) / (1000 * 60 * 60 * 24 * 30))

    const forecast = []
    const types = ['powder', 'primer', 'bullet', 'case']
    
    types.forEach(type => {
        let monthlyBurn = usage90[type] / 3
        let mode = 'Recent'
        
        if (monthlyBurn === 0 && usageAll[type] > 0) {
            monthlyBurn = usageAll[type] / totalMonths
            mode = 'Long Term'
        }

        let months = null 
        if (monthlyBurn > 0) months = stock[type] / monthlyBurn
        else if (stock[type] === 0) months = 0
        
        forecast.push({
            type: type.charAt(0).toUpperCase() + type.slice(1),
            stock: stock[type],
            burnRate: monthlyBurn,
            months: months !== null ? Number(months.toFixed(1)) : null,
            mode: mode
        })
    })

    return forecast
}

export async function getBatchCostHistory(currentUser) {
  const sql = `
    SELECT 
      TO_CHAR(b.load_date, 'YYYY-MM') as month,
      b.rounds_loaded,
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
    ORDER BY 1 ASC
  `
  const res = await query(sql)

  const monthMap = new Map()

  res.rows.forEach(row => {
    let unitCost = 0
    if (row.p_price && row.charge_grains) {
      const pTotal = Number(row.p_price)
      const pQty = Number(row.p_qty)
      let grainsInLot = 0
      if (row.p_unit === 'lb') grainsInLot = pQty * GRAINS_PER_LB
      else if (row.p_unit === 'kg') grainsInLot = pQty * GRAINS_PER_KG
      else grainsInLot = pQty
      
      if (grainsInLot > 0) unitCost += (pTotal / grainsInLot) * Number(row.charge_grains)
    }
    if (row.bu_price && row.bu_qty) unitCost += Number(row.bu_price) / Number(row.bu_qty)
    if (row.pr_price && row.pr_qty) unitCost += Number(row.pr_price) / Number(row.pr_qty)
    if (row.ca_price && row.ca_qty) unitCost += (Number(row.ca_price) / Number(row.ca_qty)) / 5

    if (unitCost > 0) {
        const rounds = Number(row.rounds_loaded) || 0
        const current = monthMap.get(row.month) || { totalCost: 0, totalRounds: 0 }
        monthMap.set(row.month, { totalCost: current.totalCost + (unitCost * rounds), totalRounds: current.totalRounds + rounds })
    }
  })

  return Array.from(monthMap.entries()).map(([month, data]) => {
      const avgCost = data.totalRounds > 0 ? (data.totalCost / data.totalRounds) : 0
      return { date: month, cost: Number(avgCost.toFixed(3)) }
  })
}
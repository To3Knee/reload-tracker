//===============================================================
//Script Name: math.js
//Script Location: src/lib/math.js
//Date: 12/12/2025
//Created By: T03KNEE
//Version: 3.1.0 (Safe Rounding)
//About: Complete mathematical engine.
//       - INCLUDES: Financials (Cost/Unit, Lot Totals).
//       - INCLUDES: Statistics (Avg, SD, ES for Range Logs).
//       - INCLUDES: Conversions (Grains/Lbs/Kg).
//       - FEATURE: Added Currency Formatting helpers.
//===============================================================

// --- CONSTANTS ---
export const GRAINS_PER_LB = 7000
export const GRAINS_PER_KG = 15432.3584
export const GRAMS_PER_GRAIN = 0.06479891

// --- CONVERSIONS ---
export function convertToGrains(qty, unit) {
  const amount = Number(qty) || 0
  const u = (unit || '').toLowerCase().trim()
  
  if (u === 'lb' || u === 'lbs' || u === 'pound') return amount * GRAINS_PER_LB
  if (u === 'kg' || u === 'kilogram') return amount * GRAINS_PER_KG
  if (u === 'gr' || u === 'grain' || u === 'grains') return amount
  if (u === 'g' || u === 'gram') return amount / GRAMS_PER_GRAIN
  
  return amount 
}

// --- FINANCIAL ENGINE ---

// Used by Inventory to calculate total value of a partial jug
export function calculateLotTotalCost(lot) {
  if (!lot) return 0
  const price = Number(lot.price) || 0
  const shipping = Number(lot.shipping) || 0
  const tax = Number(lot.tax) || 0
  return price + shipping + tax
}

// Used by Purchases/Dashboard for per-unit pricing
export function calculateCostPerUnit(price, shipping, tax, qty) {
    const p = Number(price) || 0
    const s = Number(shipping) || 0
    const t = Number(tax) || 0
    const q = Number(qty) || 0
    
    if (q <= 0) return 0
    return (p + s + t) / q
}

export function calculatePowderCostPerRound(powderLot, chargeGrains) {
    if (!powderLot || !chargeGrains) return 0
    
    const totalCost = calculateLotTotalCost(powderLot)
    const totalGrains = convertToGrains(powderLot.qty, powderLot.unit)
    
    if (totalGrains <= 0) return 0
    
    const costPerGrain = totalCost / totalGrains
    return costPerGrain * Number(chargeGrains)
}

export function calculateBrassCostPerRound(caseLot, reuseTimes) {
    if (!caseLot) return 0
    
    const totalCost = calculateLotTotalCost(caseLot)
    const qty = Number(caseLot.qty) || 0
    
    if (qty <= 0) return 0
    
    const costPerPiece = totalCost / qty
    const uses = Number(reuseTimes) || 1
    return costPerPiece / uses
}

// --- FORMATTERS (Human Readable Output) ---

/**
 * Rounds a number to 2 decimal places for currency display
 * Resolves floating point quirks (e.g. 1.005 -> 1.01)
 */
export function roundCurrency(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100
}

/**
 * Formats a number as USD currency string
 * Example: 1234.5 -> "$1,234.50"
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount)
}

// --- STATISTICAL ENGINE (Range Logs) ---

export function calculateStatistics(shots) {
  // Filter invalid inputs (non-numbers or zero)
  const data = shots.map(Number).filter(n => !isNaN(n) && n > 0)
  const n = data.length

  if (n === 0) return { count: 0, avg: 0, sd: 0, es: 0, min: 0, max: 0, mad: 0 }

  // 1. Average (Mean)
  const sum = data.reduce((a, b) => a + b, 0)
  const avg = sum / n

  // 2. Min / Max / ES
  const min = Math.min(...data)
  const max = Math.max(...data)
  const es = max - min

  // 3. Standard Deviation (Sample)
  let sd = 0
  if (n > 1) {
    const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (n - 1)
    sd = Math.sqrt(variance)
  }

  // 4. Median Absolute Deviation (MAD)
  const mad = data.reduce((acc, val) => acc + Math.abs(val - avg), 0) / n

  return {
    count: n,
    avg: avg, 
    sd: sd,
    es: es,
    min: min,
    max: max,
    mad: mad
  }
}
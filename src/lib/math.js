//===============================================================
//Script Name: math.js
//Script Location: src/lib/math.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 3.0.0
//About: Precision Math Engine.
//       - Financials: Integer-based (Cents) to prevent float drift.
//       - Stats: High-precision standard deviation (no pre-rounding).
//       - Conversions: Exact scientific constants.
//===============================================================

// --- CONSTANTS ---
export const GRAINS_PER_LB = 7000
export const GRAINS_PER_KG = 15432.3584
export const GRAMS_PER_GRAIN = 0.06479891

// --- PRECISE CONVERSIONS ---

export function convertToGrains(qty, unit) {
  const amount = Number(qty) || 0
  const u = (unit || '').toLowerCase().trim()
  
  if (u === 'lb' || u === 'lbs' || u === 'pound') return amount * GRAINS_PER_LB
  if (u === 'kg' || u === 'kilogram') return amount * GRAINS_PER_KG
  if (u === 'gr' || u === 'grain' || u === 'grains') return amount
  if (u === 'g' || u === 'gram') return amount / GRAMS_PER_GRAIN
  
  return amount 
}

// --- FINANCIAL ENGINE (INTEGER MATH) ---
// We operate in CENTS to avoid IEEE 754 floating point errors.
// e.g. $29.99 -> 2999 cents.

const toCents = (val) => Math.round((Number(val) || 0) * 100)
const fromCents = (val) => val / 100

export function calculateLotTotalCost(lot) {
  if (!lot) return 0
  const price = toCents(lot.price)
  const shipping = toCents(lot.shipping)
  const tax = toCents(lot.tax)
  
  // Sum integers, then convert back to float for display
  return fromCents(price + shipping + tax)
}

export function calculateCostPerUnit(price, shipping, tax, qty) {
  const totalCents = toCents(price) + toCents(shipping) + toCents(tax)
  const quantity = Number(qty) || 0
  
  if (quantity <= 0) return 0
  
  // Result is in Dollars (float) with high precision
  // We do NOT round here; rounding happens at UI rendering.
  return fromCents(totalCents) / quantity
}

export function calculatePowderCostPerRound(powderLot, chargeGrains) {
  if (!powderLot || !chargeGrains) return 0
  
  // 1. Get total cost in cents
  const totalCents = toCents(powderLot.price) + toCents(powderLot.shipping) + toCents(powderLot.tax)
  
  // 2. Get total grains available
  const totalGrains = convertToGrains(powderLot.qty, powderLot.unit)
  
  if (totalGrains <= 0) return 0
  
  // 3. Cost per single grain (High precision float)
  const centsPerGrain = totalCents / totalGrains
  
  // 4. Cost for the charge
  const costInCents = centsPerGrain * Number(chargeGrains)
  
  return fromCents(costInCents)
}

export function calculateBrassCostPerRound(brassLot, reuseCount) {
  if (!brassLot) return 0
  
  const reloads = Math.max(1, Number(reuseCount) || 1)
  const totalCents = toCents(brassLot.price) + toCents(brassLot.shipping) + toCents(brassLot.tax)
  const qty = Number(brassLot.qty) || 0
  
  if (qty <= 0) return 0
  
  const centsPerCase = totalCents / qty
  
  return fromCents(centsPerCase / reloads)
}

// --- STATISTICAL ENGINE (HIGH PRECISION) ---

export function calculateStatistics(shots) {
  // Filter invalid inputs
  const data = shots.map(Number).filter(n => !isNaN(n) && n > 0)
  const n = data.length

  if (n === 0) return { count: 0, avg: 0, sd: 0, es: 0, min: 0, max: 0, mad: 0 }

  // 1. Average (Mean) - High Precision
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

  // 4. Median Absolute Deviation (MAD) - Robust outlier detection
  const mad = data.reduce((acc, val) => acc + Math.abs(val - avg), 0) / n

  // Return full precision floats. UI decides how to round (usually to 1 or 2 decimals).
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
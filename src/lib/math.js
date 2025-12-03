//===============================================================
//Script Name: math.js
//Script Location: src/lib/math.js
//Date: 12/01/2025
//Created By: T03KNEE
//Version: 2.1.0
//About: Centralized precision math for Reload Tracker.
//       Updated: Added Miller Stability & Twist Rate parsers.
//===============================================================

export const GRAINS_PER_LB = 7000
export const GRAINS_PER_KG = 15432.3584

// --- CONVERSIONS ---

export function convertToGrains(qty, unit) {
  const amount = Number(qty) || 0
  const u = (unit || '').toLowerCase()
  if (u === 'lb' || u === 'lbs' || u === 'pound') return amount * GRAINS_PER_LB
  if (u === 'kg' || u === 'kilogram') return amount * GRAINS_PER_KG
  if (u === 'gr' || u === 'grain' || u === 'grains') return amount
  return amount 
}

// --- FINANCIAL MATH ---

export function calculateLotTotalCost(lot) {
  if (!lot) return 0
  const price = Number(lot.price) || 0
  const shipping = Number(lot.shipping) || 0
  const tax = Number(lot.tax) || 0
  return price + shipping + tax
}

export function calculateCostPerUnit(price, shipping, tax, qty) {
  const totalCost = (Number(price) || 0) + (Number(shipping) || 0) + (Number(tax) || 0)
  const quantity = Number(qty) || 0
  if (quantity <= 0) return 0
  return totalCost / quantity
}

export function calculatePowderCostPerRound(powderLot, chargeGrains) {
  if (!powderLot || !chargeGrains) return 0
  const totalCost = calculateLotTotalCost(powderLot)
  const totalGrains = convertToGrains(powderLot.qty, powderLot.unit)
  if (totalGrains <= 0) return 0
  const costPerGrain = totalCost / totalGrains
  return costPerGrain * chargeGrains
}

export function calculateBrassCostPerRound(brassLot, reuseCount) {
  if (!brassLot) return 0
  const reloads = Math.max(1, Number(reuseCount) || 1)
  const costPerCase = calculateCostPerUnit(brassLot.price, brassLot.shipping, brassLot.tax, brassLot.qty)
  return costPerCase / reloads
}

// --- BALLISTICS STATISTICS (Shot Strings) ---

export function calculateStatistics(shots) {
  const data = shots.map(Number).filter(n => !isNaN(n) && n > 0)
  const n = data.length

  if (n === 0) return { count: 0, avg: 0, sd: 0, es: 0, min: 0, max: 0, mad: 0 }

  const sum = data.reduce((a, b) => a + b, 0)
  const avg = sum / n
  const min = Math.min(...data)
  const max = Math.max(...data)
  const es = max - min

  let sd = 0
  if (n > 1) {
    const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (n - 1)
    sd = Math.sqrt(variance)
  }

  const mad = data.reduce((acc, val) => acc + Math.abs(val - avg), 0) / n

  return {
    count: n,
    avg: Math.round(avg),
    sd: parseFloat(sd.toFixed(2)),
    es: Math.round(es),
    min,
    max,
    mad: parseFloat(mad.toFixed(2))
  }
}

// --- STABILITY ENGINE (The Miller Formula) ---

/**
 * Parses a twist rate string (e.g. "1:8", "1/8", "8") into a number.
 */
export function parseTwistRate(input) {
    if (!input) return null
    const s = String(input).replace(/\s/g, '')
    
    // Handle "1:8" or "1/8" format
    if (s.includes(':')) return Number(s.split(':')[1])
    if (s.includes('/')) return Number(s.split('/')[1])
    
    return Number(s)
}

/**
 * Calculates Gyroscopic Stability Factor (Sg) using Miller Formula.
 * Sg < 1.0 = Unstable
 * Sg 1.0 - 1.4 = Marginal
 * Sg > 1.4 = Stable
 * * @param {number} weightGr - Bullet weight in grains
 * @param {number} lengthIn - Bullet length in inches
 * @param {number} diameterIn - Bullet diameter (caliber) in inches
 * @param {number} twistIn - Twist rate in inches per turn (e.g. 8)
 * @param {number} velocityFps - Muzzle velocity (optional, defaults to 2800 for estimation)
 */
export function calculateStability(weightGr, lengthIn, diameterIn, twistIn, velocityFps = 2800) {
    if (!weightGr || !lengthIn || !diameterIn || !twistIn) return null

    const m = weightGr
    const t = twistIn
    const d = diameterIn
    const l = lengthIn / d // Length in calibers

    // Miller Formula (Simplified for standard conditions)
    // Sg = (30 * m) / (t^2 * d^3 * l * (1 + l^2))
    // Note: This is the base formula. Temperature/Pressure affect it, but this is the "Base Sg".
    
    let sg = (30 * m) / (Math.pow(t, 2) * Math.pow(d, 3) * l * (1 + Math.pow(l, 2)))
    
    // Velocity Correction (Miller approximation)
    // Stability increases slightly with velocity
    // Correction = (v / 2800)^(1/3)
    if (velocityFps) {
        sg = sg * Math.pow(velocityFps / 2800, 1/3)
    }

    return parseFloat(sg.toFixed(2))
}
//===============================================================
//Script Name: math.js
//Script Location: src/lib/math.js
//Date: 11/28/2025
//Created By: T03KNEE
//Version: 1.1.0
//About: Centralized precision math for Reload Tracker.
//       Includes constants and helpers for all component types.
//===============================================================

export const GRAINS_PER_LB = 7000
export const GRAINS_PER_KG = 15432.3584

/**
 * Convert any quantity to grains based on its unit.
 * Essential for Powder calculations.
 */
export function convertToGrains(qty, unit) {
  const amount = Number(qty) || 0
  const u = (unit || '').toLowerCase()

  if (u === 'lb' || u === 'lbs' || u === 'pound') return amount * GRAINS_PER_LB
  if (u === 'kg' || u === 'kilogram') return amount * GRAINS_PER_KG
  if (u === 'gr' || u === 'grain' || u === 'grains') return amount
  
  // For bullets/primers/brass where 'grains' doesn't apply to Qty, return amount
  return amount 
}

/**
 * Calculate the Total Investment for a single Lot.
 * (Price + Shipping + Tax)
 */
export function calculateLotTotalCost(lot) {
  if (!lot) return 0
  const price = Number(lot.price) || 0
  const shipping = Number(lot.shipping) || 0
  const tax = Number(lot.tax) || 0
  return price + shipping + tax
}

/**
 * Calculate cost per single round/item (bullets, primers, cases).
 */
export function calculateCostPerUnit(price, shipping, tax, qty) {
  const totalCost = (Number(price) || 0) + (Number(shipping) || 0) + (Number(tax) || 0)
  const quantity = Number(qty) || 0
  if (quantity <= 0) return 0
  return totalCost / quantity
}

/**
 * Calculate cost of powder for a specific charge weight.
 */
export function calculatePowderCostPerRound(powderLot, chargeGrains) {
  if (!powderLot || !chargeGrains) return 0
  
  const totalCost = calculateLotTotalCost(powderLot)
  
  // Get total grains in the jug/container
  const totalGrains = convertToGrains(powderLot.qty, powderLot.unit)
  
  if (totalGrains <= 0) return 0

  // Cost per grain * grains needed
  const costPerGrain = totalCost / totalGrains
  return costPerGrain * chargeGrains
}

/**
 * Calculate Brass cost per round (amortized over reuse).
 */
export function calculateBrassCostPerRound(brassLot, reuseCount) {
  if (!brassLot) return 0
  
  // Reuse count of 1 means "Single use". Defaults to 1 for safety.
  const reloads = Math.max(1, Number(reuseCount) || 1)
  
  const costPerCase = calculateCostPerUnit(
    brassLot.price, 
    brassLot.shipping, 
    brassLot.tax, 
    brassLot.qty
  )
  
  return costPerCase / reloads
}
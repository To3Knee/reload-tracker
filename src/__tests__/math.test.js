import { describe, it, expect } from 'vitest'
import {
  GRAINS_PER_LB,
  GRAINS_PER_KG,
  GRAMS_PER_GRAIN,
  convertToGrains,
  calculateLotTotalCost,
  calculateCostPerUnit,
  calculatePowderCostPerRound,
  calculateBrassCostPerRound,
  roundCurrency,
  formatCurrency,
  calculateStatistics,
} from '../lib/math'

// ─── convertToGrains ───────────────────────────────────────────────────────

describe('convertToGrains', () => {
  it('converts pounds to grains', () => {
    expect(convertToGrains(1, 'lb')).toBe(GRAINS_PER_LB)
    expect(convertToGrains(1, 'lbs')).toBe(GRAINS_PER_LB)
    expect(convertToGrains(1, 'pound')).toBe(GRAINS_PER_LB)
    expect(convertToGrains(2, 'lb')).toBe(GRAINS_PER_LB * 2)
  })

  it('converts kilograms to grains', () => {
    expect(convertToGrains(1, 'kg')).toBe(GRAINS_PER_KG)
    expect(convertToGrains(1, 'kilogram')).toBe(GRAINS_PER_KG)
  })

  it('passes grains through unchanged', () => {
    expect(convertToGrains(100, 'gr')).toBe(100)
    expect(convertToGrains(100, 'grain')).toBe(100)
    expect(convertToGrains(100, 'grains')).toBe(100)
  })

  it('converts grams to grains', () => {
    expect(convertToGrains(1, 'g')).toBeCloseTo(1 / GRAMS_PER_GRAIN, 6)
    expect(convertToGrains(1, 'gram')).toBeCloseTo(1 / GRAMS_PER_GRAIN, 6)
  })

  it('handles uppercase/mixed-case units', () => {
    expect(convertToGrains(1, 'LB')).toBe(GRAINS_PER_LB)
    expect(convertToGrains(1, 'KG')).toBe(GRAINS_PER_KG)
    expect(convertToGrains(1, 'GR')).toBe(1)
  })

  it('returns 0 for null/undefined qty', () => {
    expect(convertToGrains(null, 'lb')).toBe(0)
    expect(convertToGrains(undefined, 'lb')).toBe(0)
  })

  it('returns amount as-is for unknown units', () => {
    expect(convertToGrains(42, 'each')).toBe(42)
    expect(convertToGrains(42, 'rounds')).toBe(42)
  })
})

// ─── calculateLotTotalCost ─────────────────────────────────────────────────

describe('calculateLotTotalCost', () => {
  it('sums price + shipping + tax', () => {
    expect(calculateLotTotalCost({ price: 100, shipping: 10, tax: 5 })).toBe(115)
  })

  it('handles missing fields as 0', () => {
    expect(calculateLotTotalCost({ price: 50 })).toBe(50)
    expect(calculateLotTotalCost({})).toBe(0)
  })

  it('returns 0 for null/undefined lot', () => {
    expect(calculateLotTotalCost(null)).toBe(0)
    expect(calculateLotTotalCost(undefined)).toBe(0)
  })

  it('handles string numbers', () => {
    expect(calculateLotTotalCost({ price: '20', shipping: '5', tax: '1' })).toBe(26)
  })
})

// ─── calculateCostPerUnit ──────────────────────────────────────────────────

describe('calculateCostPerUnit', () => {
  it('divides total cost by qty', () => {
    expect(calculateCostPerUnit(100, 10, 5, 100)).toBeCloseTo(1.15, 5)
  })

  it('returns 0 when qty is 0', () => {
    expect(calculateCostPerUnit(100, 10, 5, 0)).toBe(0)
  })

  it('returns 0 for negative qty', () => {
    expect(calculateCostPerUnit(100, 0, 0, -1)).toBe(0)
  })

  it('handles string inputs', () => {
    expect(calculateCostPerUnit('50', '0', '0', '100')).toBe(0.5)
  })

  it('handles missing values as 0', () => {
    expect(calculateCostPerUnit(null, null, null, 10)).toBe(0)
  })
})

// ─── calculatePowderCostPerRound ───────────────────────────────────────────

describe('calculatePowderCostPerRound', () => {
  const powderLot = { price: 70, shipping: 0, tax: 0, qty: 1, unit: 'lb' }

  it('calculates cost per grain correctly', () => {
    const costPerGrain = 70 / GRAINS_PER_LB
    expect(calculatePowderCostPerRound(powderLot, 42)).toBeCloseTo(costPerGrain * 42, 8)
  })

  it('returns 0 for missing lot', () => {
    expect(calculatePowderCostPerRound(null, 42)).toBe(0)
    expect(calculatePowderCostPerRound(undefined, 42)).toBe(0)
  })

  it('returns 0 for zero charge weight', () => {
    expect(calculatePowderCostPerRound(powderLot, 0)).toBe(0)
    expect(calculatePowderCostPerRound(powderLot, null)).toBe(0)
  })

  it('returns 0 for lot with zero grains', () => {
    expect(calculatePowderCostPerRound({ price: 70, qty: 0, unit: 'lb' }, 42)).toBe(0)
  })
})

// ─── calculateBrassCostPerRound ────────────────────────────────────────────

describe('calculateBrassCostPerRound', () => {
  const caseLot = { price: 50, shipping: 0, tax: 0, qty: 100 }

  it('calculates cost per piece with 1 use', () => {
    expect(calculateBrassCostPerRound(caseLot, 1)).toBe(0.5)
  })

  it('amortizes cost over reuse count', () => {
    expect(calculateBrassCostPerRound(caseLot, 5)).toBe(0.1)
    expect(calculateBrassCostPerRound(caseLot, 10)).toBe(0.05)
  })

  it('returns 0 for null lot', () => {
    expect(calculateBrassCostPerRound(null, 5)).toBe(0)
  })

  it('returns 0 for zero qty', () => {
    expect(calculateBrassCostPerRound({ price: 50, qty: 0 }, 1)).toBe(0)
  })

  it('defaults reuse to 1 for null/undefined', () => {
    expect(calculateBrassCostPerRound(caseLot, null)).toBe(0.5)
    expect(calculateBrassCostPerRound(caseLot, 0)).toBe(0.5)
  })
})

// ─── roundCurrency ─────────────────────────────────────────────────────────

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    // Note: 1.005 has a floating-point representation slightly below 1.005,
    // so Math.round(1.005 * 100) / 100 = 1.00, not 1.01 — this is expected JS behavior
    expect(roundCurrency(1.005)).toBe(1.00)
    expect(roundCurrency(1.004)).toBe(1.00)
    expect(roundCurrency(1.235)).toBe(1.24)
    expect(roundCurrency(1.125)).toBe(1.13)
  })

  it('handles integers', () => {
    expect(roundCurrency(5)).toBe(5)
  })

  it('returns 0 for null/undefined', () => {
    expect(roundCurrency(null)).toBe(0)
    expect(roundCurrency(undefined)).toBe(0)
  })
})

// ─── formatCurrency ────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats to USD with 2 decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
    expect(formatCurrency(0.5)).toBe('$0.50')
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('includes comma separators for thousands', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })
})

// ─── calculateStatistics ───────────────────────────────────────────────────

describe('calculateStatistics', () => {
  it('returns zero stats for empty array', () => {
    const result = calculateStatistics([])
    expect(result).toEqual({ count: 0, avg: 0, sd: 0, es: 0, min: 0, max: 0, mad: 0 })
  })

  it('filters out invalid (non-numeric, zero) values', () => {
    const result = calculateStatistics(['abc', 0, NaN, 100])
    expect(result.count).toBe(1)
    expect(result.avg).toBe(100)
  })

  it('calculates average correctly', () => {
    expect(calculateStatistics([2900, 2920, 2910]).avg).toBeCloseTo(2910, 2)
  })

  it('calculates extreme spread (es = max - min)', () => {
    expect(calculateStatistics([2900, 2950, 2925]).es).toBe(50)
  })

  it('calculates min and max', () => {
    const { min, max } = calculateStatistics([3000, 2850, 2975])
    expect(min).toBe(2850)
    expect(max).toBe(3000)
  })

  it('calculates sample standard deviation (divides by n-1)', () => {
    // [2,4,4,4,5,5,7,9] mean=5, sum-sq-diff=32, sample-var=32/7≈4.571, sd≈2.138
    // Population SD would be 2 (divides by n) but this function uses sample SD (n-1)
    const { sd } = calculateStatistics([2, 4, 4, 4, 5, 5, 7, 9])
    expect(sd).toBeCloseTo(2.138, 2)
  })

  it('returns sd of 0 for single value', () => {
    expect(calculateStatistics([2900]).sd).toBe(0)
  })

  it('calculates MAD (mean absolute deviation)', () => {
    const shots = [2900, 2910, 2920]
    const avg = 2910
    const expectedMad = (Math.abs(2900 - avg) + Math.abs(2910 - avg) + Math.abs(2920 - avg)) / 3
    expect(calculateStatistics(shots).mad).toBeCloseTo(expectedMad, 5)
  })
})

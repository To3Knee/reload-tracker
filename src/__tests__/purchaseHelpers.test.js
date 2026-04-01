import { describe, it, expect } from 'vitest'
import { formatMoney, getSmartPrice, renderPurchaseOptionLabel } from '../components/Purchases/purchaseHelpers'

// ─── formatMoney ───────────────────────────────────────────────────────────

describe('formatMoney', () => {
  it('formats values >= $1 to 2 decimal places', () => {
    expect(formatMoney(1.5)).toBe('$1.50')
    expect(formatMoney(10)).toBe('$10.00')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('formats sub-dollar values to 4 decimal places', () => {
    // Any value between 0 and 1 (exclusive) uses 4dp — useful for per-grain powder costs
    expect(formatMoney(0.5)).toBe('$0.5000')
    expect(formatMoney(0.001)).toBe('$0.0010')
    expect(formatMoney(0.9999)).toBe('$0.9999')
  })

  it('returns $0.00 for NaN', () => {
    expect(formatMoney('abc')).toBe('$0.00')
    expect(formatMoney(null)).toBe('$0.00')
    expect(formatMoney(undefined)).toBe('$0.00')
  })
})

// ─── getSmartPrice ─────────────────────────────────────────────────────────

describe('getSmartPrice', () => {
  it('returns cost per 1000 for primers', () => {
    const result = getSmartPrice('primer', 0.05)
    expect(result.label).toBe('Cost / 1k')
    expect(result.val).toBeCloseTo(50, 5)
  })

  it('returns cost per 100 for bullets', () => {
    const result = getSmartPrice('bullet', 0.30)
    expect(result.label).toBe('Cost / 100')
    expect(result.val).toBeCloseTo(30, 5)
  })

  it('returns cost per 100 for cases', () => {
    const result = getSmartPrice('case', 0.25)
    expect(result.label).toBe('Cost / 100')
    expect(result.val).toBeCloseTo(25, 5)
  })

  it('returns cost per unit for all other types', () => {
    expect(getSmartPrice('powder', 0.42).label).toBe('Cost / Unit')
    expect(getSmartPrice('other', 1.00).label).toBe('Cost / Unit')
    expect(getSmartPrice('powder', 0.42).val).toBe(0.42)
  })
})

// ─── renderPurchaseOptionLabel ─────────────────────────────────────────────

describe('renderPurchaseOptionLabel', () => {
  it('renders full label with lotId, brand, name, and cost', () => {
    const p = { lotId: 'LOT-001', brand: 'Hodgdon', name: 'H4350', price: 30, shipping: 0, tax: 0, qty: 1 }
    const label = renderPurchaseOptionLabel(p)
    expect(label).toContain('LOT-001')
    expect(label).toContain('Hodgdon')
    expect(label).toContain('H4350')
    expect(label).toContain('/u)')
  })

  it('falls back to LOT when lotId missing', () => {
    const p = { brand: 'Nosler', name: '168gr', price: 50, shipping: 0, tax: 0, qty: 100 }
    expect(renderPurchaseOptionLabel(p)).toContain('LOT —')
  })

  it('falls back to Unknown when brand missing', () => {
    const p = { lotId: 'A1', name: 'HP', price: 20, shipping: 0, tax: 0, qty: 50 }
    expect(renderPurchaseOptionLabel(p)).toContain('Unknown')
  })

  it('includes formatted cost per unit', () => {
    const p = { lotId: 'X', brand: 'CCI', name: '500', price: 50, shipping: 0, tax: 0, qty: 1000 }
    const label = renderPurchaseOptionLabel(p)
    expect(label).toContain('$0.05/u)')
  })
})

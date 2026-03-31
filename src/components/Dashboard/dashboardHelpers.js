import { calculateCostPerUnit } from '../../lib/math'

export const toPrecisionMoney = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(val || 0)

export const toStandardMoney = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)

export const renderOptionLabel = p =>
  `${p.lotId || 'LOT'} — ${p.brand || 'Unknown'}${p.name ? ` • ${p.name}` : ''} (${p.qty} ${p.unit}, ${toPrecisionMoney(calculateCostPerUnit(p.price, p.shipping, p.tax, p.qty))}/unit)`

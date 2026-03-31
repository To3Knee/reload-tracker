export const COMPONENT_TYPES = [
  { value: 'powder', label: 'Powder' },
  { value: 'bullet', label: 'Bullet / Projectile' },
  { value: 'primer', label: 'Primer' },
  { value: 'case',   label: 'Brass / Case' },
  { value: 'other',  label: 'Other' },
]

export const UNITS = [
  { value: 'lb',     label: 'Pounds (lb)' },
  { value: 'kg',     label: 'Kilograms (kg)' },
  { value: 'gr',     label: 'Grains (gr)' },
  { value: 'each',   label: 'Each / Pieces' },
  { value: 'rounds', label: 'Rounds' },
]

export const CASE_CONDITIONS = [
  { value: 'new',         label: 'New' },
  { value: 'once-fired',  label: 'Once fired' },
  { value: 'mixed',       label: 'Mixed / Unknown' },
]

export function getLocalDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - (offset * 60 * 1000))
  return local.toISOString().split('T')[0]
}

export const DEFAULT_FORM = {
  componentType: 'powder', caliber: '', brand: '', name: '', typeDetail: '',
  lotId: '', qty: '', unit: 'lb', price: '', shipping: '', tax: '',
  vendor: '', date: getLocalDate(), notes: '', url: '', imageUrl: '',
  status: 'active', caseCondition: '',
}

export function formatMoney(val) {
  const num = Number(val)
  if (isNaN(num)) return '$0.00'
  if (num < 1 && num > 0) return '$' + num.toFixed(4)
  return '$' + num.toFixed(2)
}

export function getSmartPrice(type, unitCost) {
  if (type === 'primer')                     return { label: 'Cost / 1k',  val: unitCost * 1000 }
  if (type === 'bullet' || type === 'case')  return { label: 'Cost / 100', val: unitCost * 100 }
  return                                            { label: 'Cost / Unit', val: unitCost }
}

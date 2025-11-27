// src/components/Purchases.jsx
import { useEffect, useMemo, useState } from 'react'
import {
  addPurchase,
  deletePurchase,
  getAllPurchases,
  calculatePerUnit,
  formatCurrency,
} from '../lib/db'

const COMPONENT_TYPES = [
  { value: 'powder', label: 'Powder' },
  { value: 'bullet', label: 'Bullets' },
  { value: 'primer', label: 'Primers' },
  { value: 'case', label: 'Cases / Brass' },
]

const UNITS = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'gr', label: 'Grains (gr)' },
  { value: 'each', label: 'Each / Pieces' },
  { value: 'rounds', label: 'Rounds' },
]

const CASE_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'once-fired', label: 'Once fired' },
  { value: 'mixed', label: 'Mixed / Unknown' },
]

export function Purchases({ onChanged }) {
  const [purchases, setPurchases] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    componentType: 'powder',
    caliber: '',
    brand: '',
    name: '',
    lotId: '',
    qty: '',
    unit: '',
    price: '',
    shipping: '',
    tax: '',
    vendor: '',
    date: '',
    notes: '',
    url: '',
    status: 'active',
    caseCondition: '',
  })

  useEffect(() => {
    const load = async () => {
      const data = await getAllPurchases()
      setPurchases(data)
    }
    load()
  }, [])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await addPurchase({
        ...form,
        qty: Number(form.qty) || 0,
        price: Number(form.price) || 0,
        shipping: Number(form.shipping) || 0,
        tax: Number(form.tax) || 0,
      })
      const data = await getAllPurchases()
      setPurchases(data)
      if (onChanged) onChanged()
      setForm(prev => ({
        ...prev,
        brand: '',
        name: '',
        lotId: '',
        qty: '',
        unit: '',
        price: '',
        shipping: '',
        tax: '',
        vendor: '',
        date: '',
        notes: '',
        url: '',
        caseCondition: '',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async id => {
    if (!window.confirm('Delete this purchase?')) return
    await deletePurchase(id)
    const data = await getAllPurchases()
    setPurchases(data)
    if (onChanged) onChanged()
  }

  const lotsByType = useMemo(() => {
    const groups = {
      powder: [],
      bullet: [],
      primer: [],
      case: [],
    }

    for (const p of purchases) {
      if (!groups[p.componentType]) continue
      groups[p.componentType].push(p)
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const aBrand = (a.brand || '').toLowerCase()
        const bBrand = (b.brand || '').toLowerCase()
        if (aBrand < bBrand) return -1
        if (aBrand > bBrand) return 1
        const aName = (a.name || '').toLowerCase()
        const bName = (b.name || '').toLowerCase()
        if (aName < bName) return -1
        if (aName > bName) return 1
        return (a.lotId || '').localeCompare(b.lotId || '')
      })
    }

    return groups
  }, [purchases])

  const sectionLabelClass =
    'text-xs uppercase tracking-[0.25em] text-slate-500 mb-2'

  const inputClass =
    'w-full bg-black/40 border border-red-500/30 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60'

  const labelClass =
    'block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-[0.16em]'

  const renderPerUnit = p => {
    const per = calculatePerUnit(p.price, p.shipping, p.tax, p.qty)
    return `${formatCurrency(per)} / ${p.unit || 'unit'}`
  }

  const hasAny = purchases.length > 0

  return (
    <div className="space-y-8">
      <section className="glass rounded-2xl p-6">
        <p className={sectionLabelClass}>ADD PURCHASE</p>
        <p className="text-slate-300 text-sm mb-4">
          Record powders, bullets, primers, and brass as you buy them. The live
          calculator will use these lots to drive cost per round and inventory
          capacity.
        </p>

        <form
          onSubmit={handleSubmit}
          className="grid md:grid-cols-2 gap-4 md:gap-6"
        >
          {/* Component type */}
          <div>
            <label className={labelClass}>Component type</label>
            <select
              name="componentType"
              value={form.componentType}
              onChange={handleChange}
              className={inputClass}
            >
              {COMPONENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Caliber */}
          <div>
            <label className={labelClass}>Caliber (optional)</label>
            <input
              name="caliber"
              value={form.caliber}
              onChange={handleChange}
              className={inputClass}
              placeholder="9mm, .308, 6.5 Creedmoor…"
            />
          </div>

          {/* Brand */}
          <div>
            <label className={labelClass}>Brand</label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              className={inputClass}
              placeholder="Hodgdon, Hornady, CCI…"
              required
            />
          </div>

          {/* Name */}
          <div>
            <label className={labelClass}>Product name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              placeholder="H4350, 147gr RN, Small Rifle…"
              required
            />
          </div>

          {/* Lot ID */}
          <div>
            <label className={labelClass}>Lot ID (optional)</label>
            <input
              name="lotId"
              value={form.lotId}
              onChange={handleChange}
              className={inputClass}
              placeholder="Lot code from jug / box"
            />
          </div>

          {/* Case condition (only for brass) */}
          <div>
            <label className={labelClass}>
              Case condition (if component is brass)
            </label>
            <select
              name="caseCondition"
              value={form.caseCondition}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Not brass / not set</option>
              {CASE_CONDITIONS.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              name="qty"
              value={form.qty}
              onChange={handleChange}
              className={inputClass}
              min="0"
              step="1"
              required
            />
          </div>

          {/* Unit */}
          <div>
            <label className={labelClass}>Unit</label>
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="">Select unit…</option>
              {UNITS.map(u => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className={labelClass}>Price</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              className={inputClass}
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Shipping */}
          <div>
            <label className={labelClass}>Shipping</label>
            <input
              type="number"
              name="shipping"
              value={form.shipping}
              onChange={handleChange}
              className={inputClass}
              min="0"
              step="0.01"
            />
          </div>

          {/* Tax */}
          <div>
            <label className={labelClass}>Tax</label>
            <input
              type="number"
              name="tax"
              value={form.tax}
              onChange={handleChange}
              className={inputClass}
              min="0"
              step="0.01"
            />
          </div>

          {/* Vendor */}
          <div>
            <label className={labelClass}>Vendor</label>
            <input
              name="vendor"
              value={form.vendor}
              onChange={handleChange}
              className={inputClass}
              placeholder="Where you bought it"
            />
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Purchase date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* URL */}
          <div>
            <label className={labelClass}>Product URL (optional)</label>
            <input
              name="url"
              value={form.url}
              onChange={handleChange}
              className={inputClass}
              placeholder="Paste product link here"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className={inputClass}
              rows={2}
              placeholder="Any details you want to remember about this lot."
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-xs md:text-sm font-semibold tracking-[0.18em] uppercase"
            >
              {isSubmitting ? 'Saving…' : 'Add purchase'}
            </button>
          </div>
        </form>
      </section>

      <section className="glass rounded-2xl p-6">
        <p className={sectionLabelClass}>LOTS BY COMPONENT</p>
        {!hasAny ? (
          <p className="text-slate-400 text-sm">
            No purchases recorded yet. Add your first powder, bullets, primers,
            or brass above.
          </p>
        ) : (
          <div className="space-y-6">
            {COMPONENT_TYPES.map(type => {
              const lots = lotsByType[type.value]
              if (!lots || lots.length === 0) return null

              return (
                <div key={type.value}>
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">
                    {type.label}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {lots.map(p => {
                      const depleted = p.status === 'depleted'
                      return (
                        <div
                          key={p.id}
                          className="bg-black/40 border border-red-500/20 rounded-xl px-3 py-3 flex flex-col gap-2"
                        >
                          <div className="flex justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                {p.caliber || 'General'}
                              </div>
                              <div className="font-semibold text-sm text-slate-100">
                                {p.brand}{' '}
                                <span className="text-slate-400">
                                  {p.name}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Lot {p.lotId || '—'} • {p.qty} {p.unit} •{' '}
                                {renderPerUnit(p)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="self-start text-[10px] px-2 py-[2px] rounded-full border border-red-700/70 text-red-300 hover:bg-red-900/40 transition"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {p.vendor && (
                              <span className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700">
                                {p.vendor}
                              </span>
                            )}
                            {p.date && (
                              <span className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700">
                                {p.date}
                              </span>
                            )}
                            {p.url && (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition"
                              >
                                Product page ↗
                              </a>
                            )}
                            {p.caseCondition && p.componentType === 'case' && (
                              <span className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700">
                                {
                                  CASE_CONDITIONS.find(
                                    c => c.value === p.caseCondition
                                  )?.label
                                }
                              </span>
                            )}
                            <span
                              className={`px-2 py-[2px] rounded-full border ${
                                depleted
                                  ? 'border-slate-600 text-slate-400'
                                  : 'border-emerald-500/70 text-emerald-300'
                              }`}
                            >
                              {depleted ? 'Depleted' : 'Active'}
                            </span>
                          </div>

                          {p.notes && (
                            <div className="text-[11px] text-slate-400">
                              {p.notes}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

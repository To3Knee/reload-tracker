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
  { value: 'other', label: 'Other' },
]

const CASE_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'once_fired', label: 'Shot once' },
  { value: 'field', label: 'Field brass' },
]

const DEFAULT_FORM = {
  componentType: 'powder',
  caseCondition: 'new',
  status: 'active',
  brand: '',
  name: '',
  caliber: '',
  qty: '',
  unit: 'ea',
  price: '',
  shipping: '',
  tax: '',
  vendor: '',
  date: '',
  url: '',
  imageUrl: '',
  notes: '',
}

export function Purchases({ onChanged }) {
  const [purchases, setPurchases] = useState([])
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [metaMessage, setMetaMessage] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCaliber, setFilterCaliber] = useState('')

  useEffect(() => {
    loadPurchases()
  }, [])

  async function loadPurchases() {
    const data = await getAllPurchases()
    setPurchases(data)
    if (onChanged) {
      onChanged()
    }
  }

  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(DEFAULT_FORM)
    setEditingPurchase(null)
    setMetaMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
      }

      if (editingPurchase?.id != null) {
        payload.id = editingPurchase.id
        // Preserve existing lotId / createdAt if present
        if (editingPurchase.lotId != null) {
          payload.lotId = editingPurchase.lotId
        }
        if (editingPurchase.createdAt) {
          payload.createdAt = editingPurchase.createdAt
        }
      }

      await addPurchase(payload)
      resetForm()
      await loadPurchases()
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(p) {
    setEditingPurchase(p)
    setForm({
      componentType: p.componentType || 'other',
      caseCondition: p.caseCondition || 'new',
      status: p.status || 'active',
      brand: p.brand || '',
      name: p.name || '',
      caliber: p.caliber || '',
      qty: p.qty != null ? String(p.qty) : '',
      unit: p.unit || 'ea',
      price: p.price != null ? String(p.price) : '',
      shipping: p.shipping != null ? String(p.shipping) : '',
      tax: p.tax != null ? String(p.tax) : '',
      vendor: p.vendor || '',
      date: p.date || '',
      url: p.url || '',
      imageUrl: p.imageUrl || '',
      notes: p.notes || '',
    })
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this purchase / LOT permanently?')) return
    setDeletingId(id)
    try {
      await deletePurchase(id)
      await loadPurchases()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleStatus(p) {
    const newStatus = p.status === 'depleted' ? 'active' : 'depleted'
    await addPurchase({ ...p, status: newStatus })
    await loadPurchases()
  }

  async function handleFetchMeta() {
    if (!form.url) {
      setMetaMessage('Enter a product URL first.')
      return
    }

    setFetchingMeta(true)
    setMetaMessage(
      'Metadata helper is not fully wired yet — for now paste an image URL directly into the Image URL field.'
    )
    setTimeout(() => {
      setFetchingMeta(false)
    }, 1200)
  }

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (filterType !== 'all' && p.componentType !== filterType) {
        return false
      }
      if (
        filterCaliber &&
        (!p.caliber ||
          !p.caliber.toLowerCase().includes(filterCaliber.toLowerCase()))
      ) {
        return false
      }
      return true
    })
  }, [purchases, filterType, filterCaliber])

  const stats = useMemo(() => {
    const totalLots = purchases.length
    const activeLots = purchases.filter(
      p => (p.status || 'active') !== 'depleted'
    ).length
    const totalSpent = purchases.reduce((sum, p) => {
      const price = Number(p.price) || 0
      const shipping = Number(p.shipping) || 0
      const tax = Number(p.tax) || 0
      return sum + price + shipping + tax
    }, 0)

    return { totalLots, activeLots, totalSpent }
  }, [purchases])

  const sectionLabelClass =
    'text-xs uppercase tracking-[0.25em] text-slate-500 mb-2'

  const inputClass =
    'w-full bg-black/40 border border-red-500/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60'

  const lotsByType = useMemo(() => {
    const map = {
      powder: [],
      bullet: [],
      primer: [],
      case: [],
      other: [],
    }
    for (const p of filteredPurchases) {
      if (map[p.componentType]) {
        map[p.componentType].push(p)
      } else {
        map.other.push(p)
      }
    }
    return map
  }, [filteredPurchases])

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold glow-red">Purchases & LOTs</h2>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className={sectionLabelClass}>TOTAL LOTS</p>
          <p className="text-3xl font-black text-slate-100">
            {stats.totalLots}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.activeLots} active,{' '}
            {stats.totalLots - stats.activeLots} depleted
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className={sectionLabelClass}>TOTAL SPENT</p>
          <p className="text-3xl font-black text-emerald-400">
            {formatCurrency(stats.totalSpent || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Includes price, shipping, and tax.
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className={sectionLabelClass}>FILTERS</p>
          <div className="flex flex-col gap-2">
            <select
              className={inputClass}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All components</option>
              {COMPONENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Filter by caliber (e.g. 9mm, .308)…"
              value={filterCaliber}
              onChange={e => setFilterCaliber(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Left: purchase form */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <div>
            <p className={sectionLabelClass}>ADD / EDIT LOT</p>
            <p className="text-sm text-slate-400">
              Capture every purchase with brand, caliber, quantity, and full
              cost including shipping, HazMat, and tax.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Component type */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Component type
                </label>
                <select
                  className={inputClass}
                  value={form.componentType}
                  onChange={e => updateField('componentType', e.target.value)}
                >
                  {COMPONENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* LOT status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  LOT status
                </label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={e => updateField('status', e.target.value)}
                >
                  <option value="active">Active (available)</option>
                  <option value="depleted">Depleted / historical</option>
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Brand
                </label>
                <input
                  className={inputClass}
                  value={form.brand}
                  onChange={e => updateField('brand', e.target.value)}
                  placeholder="Hodgdon, Hornady, Starline…"
                />
              </div>

              {/* Name / model */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Name / model
                </label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Titegroup, 124gr XTP, Small pistol…"
                />
              </div>

              {/* Caliber */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Caliber (optional)
                </label>
                <input
                  className={inputClass}
                  value={form.caliber}
                  onChange={e => updateField('caliber', e.target.value)}
                  placeholder="9mm, 9mm Subsonic, .308, 6.5 Creedmoor…"
                />
              </div>

              {/* Case condition */}
              {form.componentType === 'case' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Case condition
                  </label>
                  <select
                    className={inputClass}
                    value={form.caseCondition}
                    onChange={e =>
                      updateField('caseCondition', e.target.value)
                    }
                  >
                    {CASE_CONDITIONS.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Quantity
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={form.qty}
                    onChange={e => updateField('qty', e.target.value)}
                  />
                  <select
                    className="w-28 bg-black/40 border border-red-500/30 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60"
                    value={form.unit}
                    onChange={e => updateField('unit', e.target.value)}
                  >
                    <option value="ea">ea</option>
                    <option value="lb">lb</option>
                    <option value="gr">gr</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.price}
                  onChange={e => updateField('price', e.target.value)}
                  placeholder="Base item price"
                />
              </div>

              {/* Shipping */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Shipping / HazMat
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.shipping}
                  onChange={e => updateField('shipping', e.target.value)}
                  placeholder="Shipping & HazMat fees"
                />
              </div>

              {/* Tax */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tax
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.tax}
                  onChange={e => updateField('tax', e.target.value)}
                  placeholder="Sales tax paid"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Vendor / Store
                </label>
                <input
                  className={inputClass}
                  value={form.vendor}
                  onChange={e => updateField('vendor', e.target.value)}
                  placeholder="Local shop, Online retailer…"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Purchase date
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.date}
                  onChange={e => updateField('date', e.target.value)}
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Product URL (optional)
                </label>
                <input
                  className={inputClass}
                  value={form.url}
                  onChange={e => updateField('url', e.target.value)}
                  placeholder="For reference or future metadata scrape"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Image URL (optional)
                </label>
                <input
                  className={inputClass}
                  value={form.imageUrl}
                  onChange={e => updateField('imageUrl', e.target.value)}
                  placeholder="Direct link to product image"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.notes}
                  onChange={e => updateField('notes', e.target.value)}
                  placeholder="Lot notes, temp sensitivity, favorite load, etc."
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-full bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {editingPurchase ? 'Update LOT' : 'Add LOT'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-full border border-slate-600 text-sm text-slate-200 hover:bg-slate-800/60"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleFetchMeta}
                disabled={fetchingMeta}
                className="px-4 py-2 rounded-full border border-emerald-500/60 text-sm text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-60"
              >
                {fetchingMeta ? 'Fetching…' : 'Helper: use URL'}
              </button>
              {metaMessage && (
                <span className="text-xs text-slate-400">
                  {metaMessage}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Right: LOT list */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <div>
            <p className={sectionLabelClass}>LOTS BY COMPONENT</p>
            <p className="text-sm text-slate-400">
              LOT cards below power the Inventory, Live Calculator, and Recipes
              tabs. Mark depleted lots to keep history without using them in
              future math.
            </p>
          </div>

          {COMPONENT_TYPES.map(type => {
            const lots = lotsByType[type.value]
            if (!lots || lots.length === 0) return null

            return (
              <div key={type.value} className="space-y-2">
                <h3 className="text-xs font-semibold tracking-[0.2em] text-slate-500 mt-4 mb-1">
                  {type.label}
                </h3>
                <div className="space-y-2">
                  {lots.map(p => {
                    const perUnit = calculatePerUnit(
                      p.price,
                      p.shipping,
                      p.tax,
                      p.qty
                    )
                    const depleted = (p.status || 'active') === 'depleted'
                    return (
                      <div
                        key={p.id}
                        className={`flex gap-3 items-start rounded-2xl border px-3 py-3 bg-black/40 ${
                          depleted
                            ? 'border-slate-700 opacity-60'
                            : 'border-red-500/40'
                        }`}
                      >
                        {p.imageUrl && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/60 flex-shrink-0">
                            <img
                              src={p.imageUrl}
                              alt={p.name || p.brand || 'LOT image'}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-100">
                                {p.brand || 'Unknown brand'}
                              </div>
                              <div className="text-xs text-slate-400">
                                {p.name || 'No name'}{' '}
                                {p.caliber && (
                                  <>
                                    •{' '}
                                    <span className="text-slate-300">
                                      {p.caliber}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-slate-400 space-y-1">
                              <div>
                                Qty{' '}
                                <span className="font-semibold text-slate-100">
                                  {p.qty} {p.unit}
                                </span>
                              </div>
                              <div>
                                Per unit:{' '}
                                <span className="font-semibold text-emerald-400">
                                  {formatCurrency(perUnit || 0)}
                                </span>
                              </div>
                              <div>
                                Total:{' '}
                                <span className="font-semibold text-slate-100">
                                  {formatCurrency(
                                    (Number(p.price) || 0) +
                                      (Number(p.shipping) || 0) +
                                      (Number(p.tax) || 0)
                                  )}
                                </span>
                              </div>
                            </div>
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
                            <p className="text-[11px] text-slate-400 mt-1">
                              {p.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleEdit(p)}
                            className="px-3 py-1 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800/60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            className={`px-3 py-1 rounded-full border ${
                              depleted
                                ? 'border-emerald-500/70 text-emerald-300 hover:bg-emerald-900/40'
                                : 'border-amber-500/70 text-amber-300 hover:bg-amber-900/40'
                            }`}
                          >
                            {depleted ? 'Mark active' : 'Mark depleted'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="px-3 py-1 rounded-full border border-red-700 text-red-300 hover:bg-red-900/40 disabled:opacity-60"
                          >
                            {deletingId === p.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

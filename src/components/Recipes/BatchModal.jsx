import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { createBatch } from '../../lib/batches'
import { HAPTIC } from '../../lib/haptics'
import { InfoTip } from '../InfoTip'
import { useAppStore } from '../../lib/store'
import { renderPurchaseOptionLabel } from '../Purchases/purchaseHelpers'

export function BatchModal({ recipe, purchases, onClose, onSuccess }) {
  const refresh = useAppStore(s => s.refresh)

  const activePurchases = useMemo(() => purchases.filter(p => p.status !== 'depleted'), [purchases])

  const getSmartList = (type) => {
    const items = activePurchases.filter(p => p.componentType === type)
    if (!recipe.caliber) return items
    const cal = recipe.caliber.toLowerCase()
    const rank1 = items.filter(p => p.caliber?.toLowerCase() === cal)
    const rank2 = items.filter(p => !rank1.includes(p) && (p.name?.toLowerCase().includes(cal) || p.brand?.toLowerCase().includes(cal)))
    const rank3 = items.filter(p => !rank1.includes(p) && !rank2.includes(p) && !p.caliber)
    const rank4 = items.filter(p => !rank1.includes(p) && !rank2.includes(p) && !rank3.includes(p))
    return [...rank1, ...rank2, ...rank3, ...rank4]
  }

  const powders = useMemo(() => getSmartList('powder'), [activePurchases])
  const bullets = useMemo(() => getSmartList('bullet'), [activePurchases])
  const primers = useMemo(() => getSmartList('primer'), [activePurchases])
  const cases   = useMemo(() => getSmartList('case'),   [activePurchases])

  const filterCaliber = (p) => !p.caliber || !recipe.caliber || p.caliber === recipe.caliber
  const active = (p) => p.status !== 'depleted'
  const fallback = (type) => purchases.find(p => p.componentType === type && active(p) && filterCaliber(p))

  const [form, setForm] = useState({
    rounds:      recipe.lotSize || 100,
    powderLotId: recipe.powderLotId || (fallback('powder')?.id || ''),
    bulletLotId: recipe.bulletLotId || (fallback('bullet')?.id || ''),
    primerLotId: recipe.primerLotId || (fallback('primer')?.id || ''),
    caseLotId:   recipe.caseLotId   || (fallback('case')?.id   || ''),
    notes:       '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const inputClass = 'rt-input'
  const labelClass = 'rt-label'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createBatch({ recipeId: recipe.id, ...form })
      HAPTIC.success()
      refresh()
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save batch. Check API connection.')
      HAPTIC.error()
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)]">
      <div className="glass border border-steel-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-steel-700 flex justify-between items-center bg-black/40">
          <h3 className="text-sm font-bold text-steel-200 flex items-center">
            Load Batch: {recipe.name}
            <InfoTip variant="tip" title="Load Batch" text="Records a production run — links rounds loaded to this recipe and specific component lots for quality traceability and per-round cost accuracy." side="bottom" />
          </h3>
          <button onClick={onClose} className="text-steel-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Rounds Loaded</label>
              <input type="number" className={inputClass} value={form.rounds} onChange={set('rounds')} />
            </div>
            <div>
              <label className={labelClass}>Powder Lot</label>
              <select className={inputClass} value={form.powderLotId} onChange={set('powderLotId')}>
                <option value="">Select Powder...</option>
                {powders.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Bullet Lot</label>
              <select className={inputClass} value={form.bulletLotId} onChange={set('bulletLotId')}>
                <option value="">Select...</option>
                {bullets.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Primer Lot</label>
              <select className={inputClass} value={form.primerLotId} onChange={set('primerLotId')}>
                <option value="">Select...</option>
                {primers.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Brass Lot</label>
              <select className={inputClass} value={form.caseLotId} onChange={set('caseLotId')}>
                <option value="">Select Brass...</option>
                {cases.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea className={inputClass + ' h-16 resize-none'} value={form.notes} onChange={set('notes')} placeholder="Any notes about this batch..." />
          </div>
          {error && (
            <div className="p-3 rounded-md bg-red-900/20 border border-red-900/50 text-[11px] text-red-400">{error}</div>
          )}
          <button type="submit" disabled={submitting} className="rt-btn rt-btn-primary w-full justify-center disabled:opacity-50">
            {submitting ? 'Saving...' : 'Log Batch'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { Edit, Trash2, Printer, User, Clock } from 'lucide-react'
import { calculatePerUnit } from '../../lib/db'
import { printPurchaseLabel } from '../../lib/labels'
import { HAPTIC } from '../../lib/haptics'
import { InfoTip } from '../InfoTip'
import { CASE_CONDITIONS, formatMoney, getSmartPrice } from './purchaseHelpers'

export function PurchaseCard({ purchase: p, highlightId, canEdit, onEdit, onDelete }) {
  const unitCost     = calculatePerUnit(Number(p.price) || 0, Number(p.shipping) || 0, Number(p.tax) || 0, Number(p.qty) || 1)
  const isHighlighted = String(highlightId) === String(p.id)
  const depleted     = p.status === 'depleted'
  const attribution  = p.updatedByUsername
    ? `Updated by ${p.updatedByUsername}`
    : p.createdByUsername ? `Added by ${p.createdByUsername}` : null

  const smartPrice = getSmartPrice(p.componentType, unitCost)
  const isPowder   = p.componentType === 'powder' && p.unit === 'lb'
  const grainCost  = isPowder ? (unitCost / 7000) : 0

  return (
    <div
      id={`purchase-${p.id}`}
      className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-panel-sm border transition ${
        isHighlighted
          ? 'border-copper-500 ring-1 ring-copper-500/50 shadow-lg shadow-copper-900/20'
          : 'border-steel-700 hover:border-steel-600'
      }`}
    >
      <div className="flex-1 flex gap-4">
        {p.imageUrl && (
          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-steel-600 bg-[var(--bg)]">
            <img src={p.imageUrl} alt="Lot" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${depleted ? 'bg-steel-800 text-steel-400 border-steel-700' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
              {p.componentType}
            </span>
            <span className="text-xs text-steel-400 font-mono">{p.lotId}</span>
          </div>
          <h4 className="text-sm font-bold text-steel-100 mt-1">{p.brand} {p.name}</h4>
          <div className="text-[11px] text-steel-400 mt-1 flex flex-wrap gap-2">
            {p.caliber      && <span className="text-steel-300">{p.caliber}</span>}
            {p.typeDetail   && <span className="text-steel-300 italic">{p.typeDetail}</span>}
            {p.vendor       && <span className="px-2 py-[1px] bg-panel border border-steel-700 rounded">{p.vendor}</span>}
            {p.purchaseDate && <span className="px-2 py-[1px] bg-panel border border-steel-700 rounded">{p.purchaseDate.substring(0, 10)}</span>}
            {p.caseCondition && <span className="px-2 py-[1px] bg-panel border border-steel-700 rounded">{CASE_CONDITIONS.find(c => c.value === p.caseCondition)?.label || p.caseCondition}</span>}
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer" className="px-2 py-[1px] bg-panel border border-copper-900/50 text-copper-400 hover:text-copper-300 hover:border-copper-500/50 rounded transition">
                Page ↗
              </a>
            )}
          </div>
          {attribution && (
            <div className="mt-2 flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] text-steel-400 px-2 py-0.5 bg-panel-sm rounded border border-steel-700">
                {p.updatedByUsername ? <Clock size={10} /> : <User size={10} />} {attribution}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 md:mt-0 flex flex-wrap items-center justify-between md:justify-end gap-x-6 gap-y-4">
        <div className="text-left md:text-right flex flex-col justify-center">
          <span className="text-sm font-bold text-steel-100 leading-none">
            {p.qty} <span className="text-xs font-normal text-steel-400">{p.unit}</span>
          </span>
          <span className="text-xs font-bold text-steel-100 mt-1 flex items-center gap-0.5">
            {formatMoney(smartPrice.val)}
            <span className="text-[10px] font-normal text-steel-400"> / {smartPrice.label.split(' / ')[1]}</span>
            <InfoTip
              variant="tip"
              title="Smart Price"
              text="Auto-normalized unit: per 1,000 for primers, per 100 for bullets, per unit for powder — makes comparison across lot sizes intuitive."
              size={9}
              align="right"
            />
          </span>
          {isPowder && <span className="block text-[9px] text-steel-400 mt-0.5 font-mono">(${grainCost.toFixed(4)}/gr)</span>}
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[70px]">
          {canEdit && (
            <>
              <button onClick={() => onEdit(p)} className="rt-btn rt-btn-ghost w-full justify-center"><Edit size={12} /> Edit</button>
              <button onClick={() => onDelete(p)} className="rt-btn rt-btn-danger w-full justify-center"><Trash2 size={12} /> Remove</button>
            </>
          )}
          <button
            onClick={() => { HAPTIC.click(); printPurchaseLabel(p) }}
            className="rt-btn rt-btn-ghost w-full justify-center text-copper-400 hover:text-copper-300 hover:border-copper-700"
          >
            <Printer size={12} /> Label
          </button>
        </div>
      </div>
    </div>
  )
}

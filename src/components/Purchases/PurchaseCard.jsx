import { Edit, Trash2, Printer, User, Clock, ExternalLink } from 'lucide-react'
import { calculatePerUnit } from '../../lib/db'
import { printPurchaseLabel } from '../../lib/labels'
import { HAPTIC } from '../../lib/haptics'
import { InfoTip } from '../InfoTip'
import { CASE_CONDITIONS, formatMoney, getSmartPrice } from './purchaseHelpers'

// Left-edge accent color per component type
const ACCENT = {
  powder: 'border-l-amber-700',
  bullet: 'border-l-blue-800',
  primer: 'border-l-violet-800',
  case:   'border-l-emerald-800',
  other:  'border-l-steel-600',
}

const CHIP_CLASS = {
  powder: 'rt-chip rt-chip-powder',
  bullet: 'rt-chip rt-chip-bullet',
  primer: 'rt-chip rt-chip-primer',
  case:   'rt-chip rt-chip-brass',
  other:  'rt-chip rt-chip-other',
}

export function PurchaseCard({ purchase: p, highlightId, canEdit, onEdit, onDelete }) {
  const unitCost      = calculatePerUnit(Number(p.price) || 0, Number(p.shipping) || 0, Number(p.tax) || 0, Number(p.qty) || 1)
  const isHighlighted = String(highlightId) === String(p.id)
  const depleted      = p.status === 'depleted'
  const attribution   = p.updatedByUsername
    ? `Updated by ${p.updatedByUsername}`
    : p.createdByUsername ? `Added by ${p.createdByUsername}` : null

  const smartPrice = getSmartPrice(p.componentType, unitCost)
  const isPowder   = p.componentType === 'powder' && p.unit === 'lb'
  const grainCost  = isPowder ? (unitCost / 7000) : 0
  const accent     = ACCENT[p.componentType] || ACCENT.other
  const chip       = CHIP_CLASS[p.componentType] || CHIP_CLASS.other

  return (
    <div
      id={`purchase-${p.id}`}
      className={`group flex items-stretch border-l-[3px] rounded-r rt-card transition-all duration-150 ${accent} ${
        depleted ? 'opacity-50 grayscale' : 'hover:border-[var(--border-md)]'
      } ${isHighlighted ? 'ring-1 ring-[var(--red)]/40 shadow-lg' : ''}`}
    >
      {/* Thumbnail */}
      {p.imageUrl && (
        <div className="w-12 flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg)] overflow-hidden rounded-none">
          <img src={p.imageUrl} alt="Lot" className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition" />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 p-3 min-w-0">

        {/* Left: identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={chip}>{p.componentType}</span>
            <span className="text-[9px] font-mono text-[var(--text-lo)] tracking-widest">{p.lotId}</span>
            {depleted && <span className="text-[9px] px-1.5 py-[1px] rounded-sm bg-[var(--overlay)] border border-[var(--border)] text-[var(--text-lo)] uppercase tracking-widest">Depleted</span>}
          </div>

          <p className="text-xs font-bold text-[var(--text-hi)] mt-1 truncate">
            {p.brand} {p.name}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {p.caliber      && <span className="text-[10px] text-[var(--text-md)] font-mono">{p.caliber}</span>}
            {p.typeDetail   && <span className="text-[10px] text-[var(--text-md)] italic">{p.typeDetail}</span>}
            {p.vendor       && <span className="text-[9px] px-1.5 py-[1px] bg-[var(--overlay)] border border-[var(--border)] rounded-sm text-[var(--text-lo)]">{p.vendor}</span>}
            {p.purchaseDate && <span className="text-[9px] text-[var(--text-lo)] font-mono">{p.purchaseDate.substring(0, 10)}</span>}
            {p.caseCondition && <span className="text-[9px] px-1.5 py-[1px] bg-[var(--overlay)] border border-[var(--border)] rounded-sm text-[var(--text-lo)]">{CASE_CONDITIONS.find(c => c.value === p.caseCondition)?.label || p.caseCondition}</span>}
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer" className="text-[9px] flex items-center gap-0.5 text-[var(--text-lo)] hover:text-[var(--red)] transition">
                <ExternalLink size={8} /> Link
              </a>
            )}
            {attribution && (
              <span className="flex items-center gap-1 text-[9px] text-[var(--text-lo)]">
                {p.updatedByUsername ? <Clock size={8} /> : <User size={8} />} {attribution}
              </span>
            )}
          </div>
        </div>

        {/* Right: pricing + actions */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Pricing block */}
          <div className="text-right">
            <p className="text-xs font-bold text-[var(--text-hi)] leading-none">
              {p.qty} <span className="text-[10px] font-normal text-[var(--text-lo)]">{p.unit}</span>
            </p>
            <p className="text-xs font-bold text-[var(--text-hi)] mt-1 flex items-center justify-end gap-0.5">
              {formatMoney(smartPrice.val)}
              <span className="text-[9px] font-normal text-[var(--text-lo)]">/{smartPrice.label.split(' / ')[1]}</span>
              <InfoTip
                variant="tip"
                title="Smart Price"
                text="Auto-normalized unit: per 1,000 for primers, per 100 for bullets, per unit for powder — makes comparison across lot sizes intuitive."
                size={9}
                align="right"
              />
            </p>
            {isPowder && (
              <p className="text-[9px] text-[var(--text-lo)] font-mono mt-0.5">${grainCost.toFixed(4)}/gr</p>
            )}
          </div>

          {/* Actions — always visible on mobile, hover on desktop */}
          <div className="flex flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <>
                <button onClick={() => onEdit(p)} title="Edit" className="rt-btn rt-btn-icon"><Edit size={12} /></button>
                <button onClick={() => onDelete(p)} title="Remove" className="rt-btn rt-btn-icon hover:text-red-400 hover:border-red-800"><Trash2 size={12} /></button>
              </>
            )}
            <button
              onClick={() => { HAPTIC.click(); printPurchaseLabel(p) }}
              title="Print Label"
              className="rt-btn rt-btn-icon hover:text-[var(--red)] hover:border-[var(--red)]/40"
            >
              <Printer size={12} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

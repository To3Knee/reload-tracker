import { Edit, Trash2, Printer, User, Clock, ExternalLink } from 'lucide-react'
import { calculatePerUnit } from '../../lib/db'
import { printPurchaseLabel } from '../../lib/labels'
import { HAPTIC } from '../../lib/haptics'
import { InfoTip } from '../InfoTip'
import { CASE_CONDITIONS, formatMoney, getSmartPrice } from './purchaseHelpers'

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
      className={`border-l-[3px] rounded-r rt-card transition-all duration-150 ${accent} ${
        depleted ? 'opacity-50 grayscale' : 'hover:border-[var(--border-md)]'
      } ${isHighlighted ? 'ring-1 ring-[var(--red)]/40 shadow-lg' : ''}`}
    >
      {/* ── CONTENT ── */}
      <div className="p-3 space-y-2">

        {/* Chip + lot + name */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={chip}>{p.componentType}</span>
            <span className="text-[9px] font-mono text-[var(--text-lo)] tracking-widest">{p.lotId}</span>
            {depleted && (
              <span className="text-[9px] px-1.5 py-[1px] rounded-sm bg-[var(--overlay)] border border-[var(--border)] text-[var(--text-lo)] uppercase tracking-widest">
                Depleted
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-[var(--text-hi)] mt-1 truncate">
            {p.brand} {p.name}
          </p>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {p.caliber       && <span className="text-[10px] text-[var(--text-md)] font-mono">{p.caliber}</span>}
          {p.typeDetail    && <span className="text-[10px] text-[var(--text-md)] italic">{p.typeDetail}</span>}
          {p.vendor        && <span className="text-[9px] px-1.5 py-[1px] bg-[var(--overlay)] border border-[var(--border)] rounded-sm text-[var(--text-lo)]">{p.vendor}</span>}
          {p.purchaseDate  && <span className="text-[9px] text-[var(--text-lo)] font-mono">{p.purchaseDate.substring(0, 10)}</span>}
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

        {/* Pricing row */}
        <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--text-hi)]">
            {p.qty} <span className="text-[10px] font-normal text-[var(--text-lo)]">{p.unit}</span>
          </span>
          <span className="text-xs font-bold text-[var(--text-hi)] flex items-center gap-0.5">
            {formatMoney(smartPrice.val)}
            <span className="text-[9px] font-normal text-[var(--text-lo)]">/{smartPrice.label.split(' / ')[1]}</span>
            <InfoTip
              variant="tip"
              title="Smart Price"
              text="Auto-normalized unit: per 1,000 for primers, per 100 for bullets, per unit for powder — makes comparison across lot sizes intuitive."
              size={9}
              align="right"
            />
          </span>
          {isPowder && (
            <span className="text-[9px] text-[var(--text-lo)] font-mono">${grainCost.toFixed(4)}/gr</span>
          )}
        </div>
      </div>

      {/* ── ACTIONS ── full-width tap-friendly strip */}
      <div className="flex border-t border-[var(--border)]">
        {canEdit && (
          <>
            <button
              onClick={() => onEdit(p)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[var(--text-md)] hover:text-[var(--text-hi)] hover:bg-[var(--overlay)] transition border-r border-[var(--border)]"
            >
              <Edit size={12} /> Edit
            </button>
            <button
              onClick={() => onDelete(p)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[var(--text-md)] hover:text-red-400 hover:bg-red-950/20 transition border-r border-[var(--border)]"
            >
              <Trash2 size={12} /> Delete
            </button>
          </>
        )}
        <button
          onClick={() => { HAPTIC.click(); printPurchaseLabel(p) }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[var(--text-md)] hover:text-[var(--red)] hover:bg-[var(--overlay)] transition"
        >
          <Printer size={12} /> Label
        </button>
      </div>
    </div>
  )
}

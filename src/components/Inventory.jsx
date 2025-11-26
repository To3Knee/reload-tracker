// src/components/Inventory.jsx
import { useMemo } from 'react'
import { calculatePerUnit, formatCurrency } from '../lib/db'

const COMPONENT_TYPES = [
  { value: 'powder', label: 'Powder' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'primer', label: 'Primer' },
  { value: 'case', label: 'Case / Brass' },
  { value: 'other', label: 'Other' },
]

const CASE_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'once_fired', label: 'Shot once' },
  { value: 'field', label: 'Field brass' },
]

const PROFILE_TYPES = [
  { value: 'range', label: 'Range' },
  { value: 'subsonic', label: 'Subsonic' },
  { value: 'defense', label: 'Defense' },
  { value: 'competition', label: 'Competition' },
]

function matchesRecipeCaliber(purchase, recipe) {
  if (!recipe?.caliber) return true
  if (!purchase.caliber) return true
  return purchase.caliber === recipe.caliber
}

function lbToGrains(lb) {
  return lb * 7000
}

export function Inventory({ purchases = [], selectedRecipe }) {
  const list = purchases || []

  const {
    totalInvestment,
    totalLots,
    totalQty,
    capacityRounds,
  } = useMemo(() => {
    const totalInvestment = list.reduce((sum, p) => {
      const price = Number(p.price) || 0
      const shipping = Number(p.shipping) || 0
      const tax = Number(p.tax) || 0
      return sum + price + shipping + tax
    }, 0)

    const totalLots = list.length
    const totalQty = list.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)

    if (!selectedRecipe) {
      return {
        totalInvestment,
        totalLots,
        totalQty,
        capacityRounds: null,
      }
    }

    const activeLots = list.filter(
      p => p.status === undefined || p.status === 'active'
    )

    const powders = activeLots.filter(
      p =>
        p.componentType === 'powder' &&
        matchesRecipeCaliber(p, selectedRecipe)
    )
    const bullets = activeLots.filter(
      p =>
        p.componentType === 'bullet' &&
        matchesRecipeCaliber(p, selectedRecipe)
    )
    const primers = activeLots.filter(
      p =>
        p.componentType === 'primer' &&
        matchesRecipeCaliber(p, selectedRecipe)
    )
    const cases = activeLots.filter(
      p =>
        p.componentType === 'case' &&
        matchesRecipeCaliber(p, selectedRecipe)
    )

    const chargeGrains = Number(selectedRecipe.chargeGrains) || 0
    const brassReuse = Number(selectedRecipe.brassReuse) || 1

    const totalPowderGrains = powders.reduce((sum, p) => {
      const qty = Number(p.qty) || 0
      if (p.unit === 'lb') return sum + lbToGrains(qty)
      if (p.unit === 'gr') return sum + qty
      return sum
    }, 0)

    const totalBulletCount = bullets.reduce(
      (sum, p) => sum + (Number(p.qty) || 0),
      0
    )
    const totalPrimerCount = primers.reduce(
      (sum, p) => sum + (Number(p.qty) || 0),
      0
    )
    const totalCaseCount = cases.reduce(
      (sum, p) => sum + (Number(p.qty) || 0),
      0
    )

    const powderLimited =
      chargeGrains > 0 ? Math.floor(totalPowderGrains / chargeGrains) : 0
    const bulletLimited = totalBulletCount
    const primerLimited = totalPrimerCount
    const caseLimited =
      brassReuse > 0 ? Math.floor(totalCaseCount * brassReuse) : 0

    const max = Math.min(
      powderLimited || Infinity,
      bulletLimited || Infinity,
      primerLimited || Infinity,
      caseLimited || Infinity
    )
    const maxRounds =
      !Number.isFinite(max) || max === Infinity ? 0 : max

    return {
      totalInvestment,
      totalLots,
      totalQty,
      capacityRounds: {
        powderLimited,
        bulletLimited,
        primerLimited,
        caseLimited,
        maxRounds,
      },
    }
  }, [list, selectedRecipe])

  const profileLabel =
    PROFILE_TYPES.find(p => p.value === 'range')?.label || 'Range'

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Investment"
          value={formatCurrency(totalInvestment)}
          sub="Including price, shipping, and tax across all LOTs"
        />
        <SummaryCard
          label="LOTs Tracked"
          value={totalLots}
          sub="Each purchase batch is its own LOT"
        />
        <SummaryCard
          label="Total Pieces"
          value={totalQty}
          sub="Bullets, primers, cases, or equivalent units"
        />
        <SummaryCard
          label="Profile"
          value={profileLabel}
          sub="Visual preference (does not affect math yet)"
        />
      </div>

      {/* Capacity row */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-500/70 mb-1">
              Inventory Capacity
            </p>
            <p className="text-[11px] text-slate-400">
              How many rounds you can build from current active inventory
              for your selected recipe.
            </p>
          </div>
        </div>

        {selectedRecipe && capacityRounds ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-[11px] text-slate-300">
            <CapacityPill
              label="Powder-limited"
              rounds={capacityRounds.powderLimited}
            />
            <CapacityPill
              label="Bullet-limited"
              rounds={capacityRounds.bulletLimited}
            />
            <CapacityPill
              label="Primer-limited"
              rounds={capacityRounds.primerLimited}
            />
            <CapacityPill
              label="Case-limited"
              rounds={capacityRounds.caseLimited}
            />
            <CapacityPill
              label="Max Buildable"
              rounds={capacityRounds.maxRounds}
              highlight
            />
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            Select a recipe in the Dashboard to see capacity from active
            inventory.
          </p>
        )}
      </div>

      {/* LOT Cards */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-500/70 mb-1">
              LOT Cards
            </p>
            <p className="text-[11px] text-slate-400">
              Each card is a LOT: brand, description, per-unit cost, and status.
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No LOTs yet. Add purchases in the Purchases tab first.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map(p => (
              <LotCard key={p.id} lot={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="glass rounded-2xl p-3 flex flex-col justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-1">
          {label}
        </p>
        <p className="text-lg font-semibold text-slate-50">{value}</p>
      </div>
      {sub && (
        <p className="mt-1 text-[11px] text-slate-500 leading-snug">{sub}</p>
      )}
    </div>
  )
}

function CapacityPill({ label, rounds, highlight = false }) {
  const val = rounds != null ? rounds : 0
  const formatted =
    val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString()

  return (
    <div
      className={
        'rounded-xl border px-3 py-2 flex flex-col justify-center ' +
        (highlight
          ? 'border-emerald-500/80 bg-emerald-900/30'
          : 'border-slate-700/80 bg-black/30')
      }
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-50">{formatted}</p>
      <p className="text-[10px] text-slate-500 mt-1">Rounds</p>
    </div>
  )
}

function LotCard({ lot }) {
  const perUnit = calculatePerUnit(
    lot.price,
    lot.shipping,
    lot.tax,
    lot.qty
  )

  const typeLabel =
    COMPONENT_TYPES.find(t => t.value === lot.componentType)?.label ||
    'Other'

  const caseLabel =
    lot.componentType === 'case' && lot.caseCondition
      ? CASE_CONDITIONS.find(c => c.value === lot.caseCondition)?.label || ''
      : ''

  const isDepleted = lot.status === 'depleted'
  const cardClass = [
    'bg-black/40 rounded-2xl overflow-hidden flex flex-col border',
    isDepleted ? 'border-slate-800/80 opacity-80' : 'border-red-500/20',
  ].join(' ')

  return (
    <div className={cardClass}>
      <div className="relative h-28 bg-gradient-to-br from-slate-900 via-black to-slate-900">
        {lot.imageUrl ? (
          <img
            src={lot.imageUrl}
            alt={lot.name || lot.brand || 'Component image'}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        ) : (
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_#ef4444_0,_transparent_55%),radial-gradient(circle_at_bottom,_#22c55e_0,_transparent_55%)]" />
        )}
        <div className="relative z-10 flex items-start justify-between px-3 pt-2">
          <span className="inline-flex items-center text-[10px] px-2 py-[1px] rounded-full bg-black/60 border border-red-500/70 text-red-300">
            {lot.lotId || 'LOT'}
          </span>
          <span className="text-[10px] px-2 py-[1px] rounded-full bg-black/40 border border-slate-500/60 text-slate-200">
            {typeLabel}
          </span>
        </div>
        {caseLabel && (
          <div className="relative z-10 px-3 pt-1 text-[10px] text-slate-300">
            {caseLabel}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1 text-xs text-slate-300">
        <div className="font-semibold text-slate-100">
          {lot.brand || 'Unknown'} {lot.name && <span>• {lot.name}</span>}
        </div>
        <div className="text-[11px] text-slate-400 space-x-2">
          {lot.caliber && <span>{lot.caliber}</span>}
          <span>
            {lot.qty} {lot.unit}
          </span>
          {lot.vendor && <span>• {lot.vendor}</span>}
        </div>
        <div className="text-[11px] text-slate-400 space-x-2">
          <span>
            Total:{' '}
            <span className="font-semibold text-slate-100">
              {formatCurrency(
                (Number(lot.price) || 0) +
                  (Number(lot.shipping) || 0) +
                  (Number(lot.tax) || 0)
              )}
            </span>
          </span>
          <span>
            Per unit:{' '}
            <span className="font-semibold text-slate-100">
              {formatCurrency(perUnit)}
            </span>
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Status:{' '}
          <span className={isDepleted ? 'text-amber-300' : 'text-emerald-300'}>
            {isDepleted ? 'Depleted' : 'Active'}
          </span>
        </div>
        {lot.date && (
          <div className="text-[11px] text-slate-500">Purchased: {lot.date}</div>
        )}
        {lot.notes && (
          <div className="text-[11px] text-slate-500">{lot.notes}</div>
        )}
      </div>
    </div>
  )
}

export default Inventory

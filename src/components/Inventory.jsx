//===============================================================
//Script Name: Inventory.jsx
//Script Location: src/components/Inventory.jsx
//Date: 12/02/2025
//Created By: T03KNEE
//Version: 2.1.0
//About: Inventory overview and capacity planning.
//       Updated: Added HUD Header for symmetry.
//===============================================================

import { useMemo } from 'react'
import { formatCurrency } from '../lib/db'
import { 
  calculateCostPerUnit, 
  calculateLotTotalCost, 
  convertToGrains 
} from '../lib/math'

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
  { value: 'custom', label: 'Custom' },
]

function matchesRecipeCaliber(purchase, recipe) {
  if (!recipe?.caliber) return true
  if (!purchase.caliber) return true
  return purchase.caliber === recipe.caliber
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
      return sum + calculateLotTotalCost(p)
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

    const powders = activeLots.filter(p => p.componentType === 'powder' && matchesRecipeCaliber(p, selectedRecipe))
    const bullets = activeLots.filter(p => p.componentType === 'bullet' && matchesRecipeCaliber(p, selectedRecipe))
    const primers = activeLots.filter(p => p.componentType === 'primer' && matchesRecipeCaliber(p, selectedRecipe))
    const cases = activeLots.filter(p => p.componentType === 'case' && matchesRecipeCaliber(p, selectedRecipe))

    const chargeGrains = Number(selectedRecipe.chargeGrains) || 0
    const brassReuse = Number(selectedRecipe.brassReuse) || 1

    const totalPowderGrains = powders.reduce((sum, p) => {
      return sum + convertToGrains(p.qty, p.unit)
    }, 0)

    const totalBulletCount = bullets.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)
    const totalPrimerCount = primers.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)
    const totalCaseCount = cases.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)

    const powderLimited = chargeGrains > 0 ? Math.floor(totalPowderGrains / chargeGrains) : 0
    const bulletLimited = totalBulletCount
    const primerLimited = totalPrimerCount
    const caseLimited = brassReuse > 0 ? Math.floor(totalCaseCount * brassReuse) : 0

    const limits = []
    if (chargeGrains > 0) limits.push(powderLimited)
    if (totalBulletCount > 0) limits.push(bulletLimited)
    if (totalPrimerCount > 0) limits.push(primerLimited)
    if (totalCaseCount > 0) limits.push(caseLimited)

    const maxRounds = limits.length > 0 ? Math.min(...limits) : 0

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

  const profileLabel = selectedRecipe
    ? PROFILE_TYPES.find(p => p.value === selectedRecipe.profileType)?.label || 'Custom'
    : 'N/A'

  const profileSub = selectedRecipe
    ? `Based on recipe: ${selectedRecipe.name}`
    : 'Select a recipe to see profile'

  return (
    <div className="space-y-6">
      {/* HUD HEADER */}
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Supply Chain</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">INVENTORY</h2>
        </div>
      </div>

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
          value={totalQty.toLocaleString()}
          sub="Bullets, primers, cases, or equivalent units"
        />
        <SummaryCard
          label="Profile"
          value={profileLabel}
          sub={profileSub}
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
            <CapacityPill label="Powder-limited" rounds={capacityRounds.powderLimited} />
            <CapacityPill label="Bullet-limited" rounds={capacityRounds.bulletLimited} />
            <CapacityPill label="Primer-limited" rounds={capacityRounds.primerLimited} />
            <CapacityPill label="Case-limited" rounds={capacityRounds.caseLimited} />
            <CapacityPill label="Max Buildable" rounds={capacityRounds.maxRounds} highlight />
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 border border-dashed border-slate-800 p-3 rounded-lg">
            Select a recipe in the Dashboard or Recipes tab to see capacity calculations here.
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
    <div className="glass rounded-2xl p-3 flex flex-col justify-between min-h-[100px]">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-1">
          {label}
        </p>
        <p className="text-lg font-semibold text-slate-50">{value}</p>
      </div>
      {sub && (
        <p className="mt-2 text-[10px] text-slate-500 leading-relaxed opacity-70">{sub}</p>
      )}
    </div>
  )
}

function CapacityPill({ label, rounds, highlight = false }) {
  const val = rounds != null ? rounds : 0
  const formatted = val.toLocaleString()

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
  const perUnit = calculateCostPerUnit(lot.price, lot.shipping, lot.tax, lot.qty)
  const totalCost = calculateLotTotalCost(lot)

  const typeLabel = COMPONENT_TYPES.find(t => t.value === lot.componentType)?.label || 'Other'
  const caseLabel = lot.componentType === 'case' && lot.caseCondition
      ? CASE_CONDITIONS.find(c => c.value === lot.caseCondition)?.label || ''
      : ''

  const isDepleted = lot.status === 'depleted'
  const cardClass = [
    'bg-black/40 rounded-2xl overflow-hidden flex flex-col border transition hover:border-slate-600',
    isDepleted ? 'border-slate-800/80 opacity-60 grayscale' : 'border-red-500/20',
  ].join(' ')

  return (
    <div className={cardClass}>
      <div className="relative h-24 bg-gradient-to-br from-slate-900 via-black to-slate-900">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#b33c3c_0,_transparent_60%)]" />
        
        <div className="relative z-10 flex items-start justify-between px-3 pt-2">
          <span className="inline-flex items-center text-[9px] font-mono px-2 py-[1px] rounded-full bg-black/80 border border-red-500/40 text-red-200">
            {lot.lotId || 'LOT'}
          </span>
          <span className="text-[9px] px-2 py-[1px] rounded-full bg-black/60 border border-slate-700 text-slate-300">
            {typeLabel}
          </span>
        </div>
        {caseLabel && (
          <div className="relative z-10 px-3 pt-1 text-[9px] text-slate-400 uppercase tracking-wide">
            {caseLabel}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5 text-xs text-slate-300">
        <div className="font-semibold text-slate-100 leading-tight">
          {lot.brand || 'Unknown'} <span className="text-slate-400">{lot.name}</span>
        </div>
        
        <div className="flex justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
          <span>{lot.qty} {lot.unit} {lot.caliber ? `(${lot.caliber})` : ''}</span>
          <span>{lot.vendor}</span>
        </div>

        <div className="flex justify-between text-[11px] pt-1">
          <span className="text-slate-500">Total Cost</span>
          <span className="font-mono text-slate-200">{formatCurrency(totalCost)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-500">Cost / Unit</span>
          <span className="font-mono text-emerald-400">{formatCurrency(perUnit)}</span>
        </div>

        <div className="pt-2 flex items-center justify-between">
           <span className={`text-[10px] uppercase tracking-wider ${isDepleted ? 'text-amber-500' : 'text-emerald-500'}`}>
            {isDepleted ? 'Depleted' : 'Active'}
          </span>
          {lot.date && <span className="text-[10px] text-slate-600">{lot.date}</span>}
        </div>
      </div>
    </div>
  )
}
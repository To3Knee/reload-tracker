
import { useMemo, useState } from 'react'
import { formatCurrency } from '../lib/db'
import {
  calculateCostPerUnit,
  calculateLotTotalCost,
  convertToGrains
} from '../lib/math'
import { COMPONENT_TYPES, CASE_CONDITIONS } from './Purchases/purchaseHelpers'
import { PROFILE_TYPES } from './Recipes/recipeHelpers'
import { Package, Crosshair, Flame, Shield, Layers, AlertTriangle, TrendingDown, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

// ── TYPE CONFIG ────────────────────────────────────────────────────
// All chips are red (monochrome system) — differentiate with icons only
const TYPE_CONFIG = {
  powder: { icon: Flame,    accentFrom: 'from-amber-700',   accentVia: 'via-amber-600',   chip: 'rt-chip rt-chip-powder' },
  bullet: { icon: Crosshair,accentFrom: 'from-blue-800',    accentVia: 'via-blue-700',    chip: 'rt-chip rt-chip-bullet' },
  primer: { icon: Layers,   accentFrom: 'from-violet-800',  accentVia: 'via-violet-700',  chip: 'rt-chip rt-chip-primer' },
  case:   { icon: Shield,   accentFrom: 'from-emerald-800', accentVia: 'via-emerald-700', chip: 'rt-chip rt-chip-brass'  },
  other:  { icon: Package,  accentFrom: 'from-steel-700',   accentVia: 'via-steel-600',   chip: 'rt-chip rt-chip-other'  },
}

// Low-stock thresholds (units are per-type — powder in lbs, others in count)
const LOW_STOCK = { powder: 2, bullet: 200, primer: 200, case: 100, other: 5 }

function isLow(lot) {
  if (lot.status === 'depleted') return false
  const threshold = LOW_STOCK[lot.componentType] ?? 5
  const qty = Number(lot.qty) || 0
  // For powder (lbs/kg/gr), convert to grains and compare ~2lb = 13720gr
  if (lot.componentType === 'powder') {
    return convertToGrains(qty, lot.unit) < convertToGrains(threshold, 'lb')
  }
  return qty < threshold
}

function matchesRecipeCaliber(purchase, recipe) {
  if (!recipe?.caliber) return true
  if (!purchase.caliber) return true
  return purchase.caliber === recipe.caliber
}

// ── CAPACITY BAR ───────────────────────────────────────────────────
function CapacityBar({ label, rounds, maxRounds, type, isBottleneck }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other
  const Icon = cfg.icon
  const pct = maxRounds > 0 ? Math.min(100, Math.round((rounds / maxRounds) * 100)) : (rounds > 0 ? 100 : 0)

  return (
    <div className={`rt-card p-3 flex flex-col gap-2 transition-all ${isBottleneck ? 'border-[var(--red)]/40' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={11} className={isBottleneck ? 'text-[var(--red)]' : 'text-[var(--text-lo)]'} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-md)]">{label}</span>
        </div>
        {isBottleneck && (
          <span className="text-[8px] px-1.5 py-[1px] rounded-sm bg-red-950/50 border border-red-900/40 text-red-400 font-bold uppercase tracking-widest">
            Bottleneck
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-black font-mono text-[var(--text-hi)] leading-none">
          {rounds.toLocaleString()}
        </span>
        <span className="text-[9px] text-[var(--text-lo)] uppercase tracking-wide mb-0.5">rds</span>
      </div>
      <div className="h-1 w-full bg-[var(--overlay)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${cfg.accentFrom} ${cfg.accentVia} to-transparent transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── LOT CARD ───────────────────────────────────────────────────────
function LotCard({ lot }) {
  const perUnit   = calculateCostPerUnit(lot.price, lot.shipping, lot.tax, lot.qty)
  const totalCost = calculateLotTotalCost(lot)
  const typeLabel = COMPONENT_TYPES.find(t => t.value === lot.componentType)?.label || 'Other'
  const cfg       = TYPE_CONFIG[lot.componentType] || TYPE_CONFIG.other
  const Icon      = cfg.icon
  const caseLabel = lot.componentType === 'case' && lot.caseCondition
    ? CASE_CONDITIONS.find(c => c.value === lot.caseCondition)?.label || ''
    : ''
  const isDepleted = lot.status === 'depleted'
  const low        = isLow(lot)

  return (
    <div className={`rt-card group flex flex-col overflow-hidden transition-all duration-150 hover:border-[var(--border-md)] ${isDepleted ? 'opacity-50 grayscale' : ''}`}>
      {/* Accent line — colored per type */}
      <div className={`h-[2px] w-full bg-gradient-to-r ${cfg.accentFrom} ${cfg.accentVia} to-transparent`} />

      {/* Header band */}
      <div className="relative px-3 pt-2.5 pb-2 bg-gradient-to-br from-[var(--surface)] to-[var(--card)] flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[9px] font-mono px-2 py-[2px] rounded bg-[var(--card)] border border-[var(--red)]/30 text-[var(--red)] tracking-widest">
            {lot.lotId || 'LOT'}
          </span>
          <span className={cfg.chip}>{typeLabel}</span>
        </div>
        {(lot.caliber || caseLabel) && (
          <div className="mt-1.5 flex items-center gap-2">
            {lot.caliber && <span className="text-[9px] font-mono text-[var(--text-lo)] tracking-widest">{lot.caliber}</span>}
            {caseLabel   && <span className="text-[9px] text-[var(--text-lo)] uppercase tracking-wide">{caseLabel}</span>}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <div>
          <div className="text-sm font-bold text-[var(--text-hi)] leading-tight">
            {lot.brand || 'Unknown Brand'}
          </div>
          {lot.name && (
            <div className="text-[11px] text-[var(--text-md)] leading-tight mt-0.5 line-clamp-1">{lot.name}</div>
          )}
        </div>

        <div className="flex justify-between text-[11px] border-b border-[var(--border)] pb-2">
          <span className="font-mono text-[var(--text-hi)]">{lot.qty} {lot.unit}</span>
          {lot.vendor && <span className="truncate ml-2 text-right text-[var(--text-lo)]">{lot.vendor}</span>}
        </div>

        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--text-lo)]">Total Cost</span>
          <span className="font-mono text-[var(--text-hi)]">{formatCurrency(totalCost)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--text-lo)]">Per Unit</span>
          <span className="font-mono text-[var(--text-hi)]">{formatCurrency(perUnit)}</span>
        </div>

        {lot.notes && (
          <div className="text-[10px] text-[var(--text-lo)] italic border-t border-[var(--border)] pt-1.5 mt-auto line-clamp-2">
            {lot.notes}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)] mt-auto">
          <div className="flex items-center gap-1.5">
            {isDepleted ? (
              <>
                <span className="rt-dot rt-dot-empty" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Depleted</span>
              </>
            ) : low ? (
              <>
                <span className="rt-dot rt-dot-low" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Low Stock</span>
              </>
            ) : (
              <>
                <span className="rt-dot rt-dot-active" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active</span>
              </>
            )}
          </div>
          {lot.purchaseDate && (
            <span className="text-[9px] text-[var(--text-lo)] font-mono">
              {String(lot.purchaseDate).substring(0, 10)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TYPE GROUP ─────────────────────────────────────────────────────
function TypeGroup({ type, lots }) {
  const [collapsed, setCollapsed] = useState(false)
  const cfg  = TYPE_CONFIG[type.value] || TYPE_CONFIG.other
  const Icon = cfg.icon
  const activeLots   = lots.filter(l => l.status !== 'depleted')
  const depletedLots = lots.filter(l => l.status === 'depleted')
  const lowCount     = activeLots.filter(isLow).length

  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 mb-4 group/hdr bg-transparent border-0 p-0 cursor-pointer text-left appearance-none"
      >
        <div className={`w-[2px] self-stretch bg-gradient-to-b ${cfg.accentFrom} to-transparent rounded-full`} />
        <Icon size={13} className="text-[var(--text-md)] group-hover/hdr:text-[var(--text-hi)] transition" />
        <h3 className="text-xs font-bold text-[var(--text-md)] uppercase tracking-[0.2em] group-hover/hdr:text-[var(--text-hi)] transition">
          {type.label}
        </h3>
        <span className="text-[10px] font-mono text-[var(--text-lo)]">{lots.length}</span>
        {lowCount > 0 && (
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-[1px] rounded-sm bg-amber-950/40 border border-amber-900/30 text-amber-400 font-bold uppercase tracking-widest">
            <AlertTriangle size={8} /> {lowCount} Low
          </span>
        )}
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[var(--text-lo)] opacity-0 group-hover/hdr:opacity-100 transition">
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </span>
      </button>

      {!collapsed && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Active first, depleted after */}
          {[...activeLots, ...depletedLots].map(lot => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────
export function Inventory({ purchases = [], selectedRecipe }) {
  const list = purchases || []

  const {
    totalInvestment,
    totalLots,
    activeLots,
    lowCount,
    capacityRounds,
    typeStats,
  } = useMemo(() => {
    const totalInvestment = list.reduce((sum, p) => sum + calculateLotTotalCost(p), 0)
    const totalLots  = list.length
    const activeLots = list.filter(p => p.status !== 'depleted').length
    const lowCount   = list.filter(p => p.status !== 'depleted' && isLow(p)).length

    // Per-type investment breakdown for stats
    const typeStats = COMPONENT_TYPES.map(t => ({
      ...t,
      lots:  list.filter(p => p.componentType === t.value).length,
      value: list.filter(p => p.componentType === t.value).reduce((s, p) => s + calculateLotTotalCost(p), 0),
    })).filter(t => t.lots > 0)

    if (!selectedRecipe) {
      return { totalInvestment, totalLots, activeLots, lowCount, capacityRounds: null, typeStats }
    }

    const active = list.filter(p => p.status === undefined || p.status === 'active')
    const powders = active.filter(p => p.componentType === 'powder' && matchesRecipeCaliber(p, selectedRecipe))
    const bullets = active.filter(p => p.componentType === 'bullet' && matchesRecipeCaliber(p, selectedRecipe))
    const primers = active.filter(p => p.componentType === 'primer' && matchesRecipeCaliber(p, selectedRecipe))
    const cases   = active.filter(p => p.componentType === 'case'   && matchesRecipeCaliber(p, selectedRecipe))

    const chargeGrains = Number(selectedRecipe.chargeGrains) || 0
    const brassReuse   = Number(selectedRecipe.brassReuse)   || 1

    const totalPowderGrains = powders.reduce((sum, p) => sum + convertToGrains(p.qty, p.unit), 0)
    const totalBulletCount  = bullets.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)
    const totalPrimerCount  = primers.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)
    const totalCaseCount    = cases.reduce((sum,   p) => sum + (Number(p.qty) || 0), 0)

    const powderLimited = chargeGrains > 0 ? Math.floor(totalPowderGrains / chargeGrains) : 0
    const bulletLimited = totalBulletCount
    const primerLimited = totalPrimerCount
    const caseLimited   = brassReuse > 0 ? Math.floor(totalCaseCount * brassReuse) : 0

    const limits = []
    if (chargeGrains > 0)       limits.push(powderLimited)
    if (totalBulletCount > 0)   limits.push(bulletLimited)
    if (totalPrimerCount > 0)   limits.push(primerLimited)
    if (totalCaseCount > 0)     limits.push(caseLimited)

    const maxRounds = limits.length > 0 ? Math.min(...limits) : 0

    return {
      totalInvestment, totalLots, activeLots, lowCount, typeStats,
      capacityRounds: { powderLimited, bulletLimited, primerLimited, caseLimited, maxRounds },
    }
  }, [list, selectedRecipe])

  const profileLabel = selectedRecipe
    ? PROFILE_TYPES.find(p => p.value === selectedRecipe.profileType)?.label || 'Custom'
    : null
  const profileSub = selectedRecipe ? selectedRecipe.name : null

  // Group lots by component type for display
  const groupedLots = COMPONENT_TYPES.reduce((acc, type) => {
    const matches = list.filter(p => (p.componentType || 'other') === type.value)
    if (matches.length > 0) acc.push({ type, lots: matches })
    return acc
  }, [])
  const orphans = list.filter(p => !COMPONENT_TYPES.some(t => t.value === p.componentType))
  if (orphans.length > 0) {
    const og = groupedLots.find(g => g.type.value === 'other')
    if (og) og.lots.push(...orphans)
    else groupedLots.push({ type: COMPONENT_TYPES.find(t => t.value === 'other'), lots: orphans })
  }

  // Bottleneck = the limiting factor in capacity
  const bottleneck = capacityRounds ? (() => {
    const { powderLimited, bulletLimited, primerLimited, caseLimited, maxRounds } = capacityRounds
    if (maxRounds === 0) return null
    if (powderLimited === maxRounds) return 'powder'
    if (bulletLimited === maxRounds) return 'bullet'
    if (primerLimited === maxRounds) return 'primer'
    if (caseLimited   === maxRounds) return 'case'
    return null
  })() : null

  return (
    <div className="space-y-6 pb-12">

      {/* ── HEADER ── */}
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Supply Chain</span>
          <h2 className="rt-section-title">INVENTORY</h2>
        </div>
      </div>

      {/* ── STAT STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rt-stat rt-card-accent">
          <span className="rt-stat-label">Investment</span>
          <span className="rt-stat-value rt-data text-xl">{formatCurrency(totalInvestment)}</span>
          <span className="rt-stat-sub">Total value on hand</span>
        </div>
        <div className="rt-stat">
          <span className="rt-stat-label">Active LOTs</span>
          <span className="rt-stat-value">{activeLots}</span>
          <span className="rt-stat-sub">of {totalLots} tracked</span>
        </div>
        <div className={`rt-stat ${lowCount > 0 ? 'border-amber-900/40' : ''}`}>
          <span className="rt-stat-label">Low Stock</span>
          <span className={`rt-stat-value ${lowCount > 0 ? 'text-amber-400' : ''}`}>{lowCount}</span>
          <span className="rt-stat-sub">{lowCount > 0 ? 'Needs restocking' : 'All stocked'}</span>
        </div>
        <div className="rt-stat">
          <span className="rt-stat-label">Profile</span>
          <span className="rt-stat-value text-lg">{profileLabel || '—'}</span>
          <span className="rt-stat-sub">{profileSub || 'No recipe selected'}</span>
        </div>
      </div>

      {/* ── CAPACITY ── */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center gap-3">
          <BarChart2 size={14} className="text-[var(--text-md)]" />
          <div>
            <p className="rt-section-eyebrow mb-0">Inventory Capacity</p>
            <p className="text-[10px] text-[var(--text-lo)] mt-0.5">
              {selectedRecipe
                ? `Rounds buildable from active stock · ${selectedRecipe.name}`
                : 'Select a recipe to calculate buildable rounds'
              }
            </p>
          </div>
        </div>
        <hr className="rt-rule" />

        {selectedRecipe && capacityRounds ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CapacityBar label="Powder" rounds={capacityRounds.powderLimited} maxRounds={capacityRounds.maxRounds} type="powder" isBottleneck={bottleneck === 'powder'} />
              <CapacityBar label="Bullet" rounds={capacityRounds.bulletLimited} maxRounds={capacityRounds.maxRounds} type="bullet" isBottleneck={bottleneck === 'bullet'} />
              <CapacityBar label="Primer" rounds={capacityRounds.primerLimited} maxRounds={capacityRounds.maxRounds} type="primer" isBottleneck={bottleneck === 'primer'} />
              <CapacityBar label="Brass"  rounds={capacityRounds.caseLimited}   maxRounds={capacityRounds.maxRounds} type="case"   isBottleneck={bottleneck === 'case'}   />
            </div>

            {/* Max buildable callout */}
            <div className="flex items-center gap-4 p-4 rounded bg-[var(--overlay)] border border-[var(--red)]/20">
              <div className="w-[3px] self-stretch bg-[var(--red)] rounded-full" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-md)]">Max Buildable</p>
                <p className="text-3xl font-black font-mono text-[var(--text-hi)] leading-none mt-0.5">
                  {capacityRounds.maxRounds.toLocaleString()}
                  <span className="text-sm font-normal text-[var(--text-lo)] ml-1.5">rounds</span>
                </p>
              </div>
              {bottleneck && (
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-[var(--text-lo)] uppercase tracking-widest">Limited by</p>
                  <p className="text-sm font-bold text-[var(--red)] capitalize mt-0.5">{bottleneck}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-[var(--text-lo)] border border-dashed border-[var(--border)] p-4 rounded-lg">
            Select a recipe in the Dashboard or Recipes tab to see capacity calculations.
          </p>
        )}
      </div>

      {/* ── LOT GROUPS ── */}
      {list.length === 0 ? (
        <div className="glass p-12 flex flex-col items-center text-center gap-4">
          <Package size={32} className="text-[var(--text-lo)]" />
          <div>
            <p className="text-sm font-bold text-[var(--text-hi)]">No inventory yet</p>
            <p className="text-xs text-[var(--text-md)] mt-1">Add purchases in the Purchases tab to start tracking LOTs.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedLots.map(({ type, lots }) => (
            <TypeGroup key={type.value} type={type} lots={lots} />
          ))}
        </div>
      )}

    </div>
  )
}

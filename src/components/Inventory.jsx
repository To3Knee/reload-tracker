//===============================================================
//Script Name: Inventory.jsx
//Script Location: src/components/Inventory.jsx
//Date: 02/25/2026
//Created By: T03KNEE
//Version: 3.0.0 — Design system v4 applied
//About: Inventory overview and capacity planning.
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
  { value: 'case',   label: 'Brass' },
  { value: 'other',  label: 'Other' },
]

const CASE_CONDITIONS = [
  { value: 'new',        label: 'New' },
  { value: 'once_fired', label: 'Once Fired' },
  { value: 'field',      label: 'Field Brass' },
]

const PROFILE_TYPES = [
  { value: 'range',       label: 'Range' },
  { value: 'subsonic',    label: 'Subsonic' },
  { value: 'defense',     label: 'Defense' },
  { value: 'competition', label: 'Competition' },
  { value: 'custom',      label: 'Custom' },
]

// Map component type to rt-chip class
const CHIP_CLASS = {
  powder: 'rt-chip rt-chip-powder',
  bullet: 'rt-chip rt-chip-bullet',
  primer: 'rt-chip rt-chip-primer',
  case:   'rt-chip rt-chip-brass',
  other:  'rt-chip rt-chip-other',
}

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
    const totalInvestment = list.reduce((sum, p) => sum + calculateLotTotalCost(p), 0)
    const totalLots = list.length
    const totalQty  = list.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)

    if (!selectedRecipe) {
      return { totalInvestment, totalLots, totalQty, capacityRounds: null }
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
    if (chargeGrains > 0) limits.push(powderLimited)
    if (totalBulletCount > 0) limits.push(bulletLimited)
    if (totalPrimerCount > 0) limits.push(primerLimited)
    if (totalCaseCount > 0)   limits.push(caseLimited)

    const maxRounds = limits.length > 0 ? Math.min(...limits) : 0

    return {
      totalInvestment, totalLots, totalQty,
      capacityRounds: { powderLimited, bulletLimited, primerLimited, caseLimited, maxRounds },
    }
  }, [list, selectedRecipe])

  const profileLabel = selectedRecipe
    ? PROFILE_TYPES.find(p => p.value === selectedRecipe.profileType)?.label || 'Custom'
    : 'N/A'
  const profileSub = selectedRecipe
    ? `Recipe: ${selectedRecipe.name}`
    : 'Select a recipe in Dashboard or Recipes'

  return (
    <div className="space-y-6">

      {/* SECTION HEADER */}
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Supply Chain</span>
          <h2 className="rt-section-title">INVENTORY</h2>
        </div>
      </div>

      {/* STAT BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rt-stat rt-card-accent">
          <span className="rt-stat-label">Investment</span>
          <span className="rt-stat-value rt-data text-2xl">{formatCurrency(totalInvestment)}</span>
          <span className="rt-stat-sub">All active LOTs</span>
        </div>
        <div className="rt-stat">
          <span className="rt-stat-label">LOTs Tracked</span>
          <span className="rt-stat-value">{totalLots}</span>
          <span className="rt-stat-sub">Purchase batches</span>
        </div>
        <div className="rt-stat">
          <span className="rt-stat-label">Total Pieces</span>
          <span className="rt-stat-value">{totalQty.toLocaleString()}</span>
          <span className="rt-stat-sub">Units in stock</span>
        </div>
        <div className="rt-stat">
          <span className="rt-stat-label">Profile</span>
          <span className="rt-stat-value text-lg">{profileLabel}</span>
          <span className="rt-stat-sub">{profileSub}</span>
        </div>
      </div>

      {/* CAPACITY */}
      <div className="glass p-5 space-y-4">
        <div>
          <p className="rt-section-eyebrow mb-0.5">Inventory Capacity</p>
          <p className="text-[11px] text-steel-500">
            Rounds buildable from active stock for the selected recipe.
          </p>
        </div>
        <hr className="rt-rule" />
        {selectedRecipe && capacityRounds ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <CapacityCard label="Powder" rounds={capacityRounds.powderLimited} type="powder" />
            <CapacityCard label="Bullet" rounds={capacityRounds.bulletLimited} type="bullet" />
            <CapacityCard label="Primer" rounds={capacityRounds.primerLimited} type="primer" />
            <CapacityCard label="Brass"  rounds={capacityRounds.caseLimited}   type="case" />
            <CapacityCard label="Max Buildable" rounds={capacityRounds.maxRounds} highlight />
          </div>
        ) : (
          <p className="text-[11px] text-steel-500 border border-dashed border-[#2a2a2a] p-4 rounded-lg">
            Select a recipe in the Dashboard or Recipes tab to see capacity calculations.
          </p>
        )}
      </div>

      {/* LOT CARDS */}
      <div className="glass p-5 space-y-4">
        <div>
          <p className="rt-section-eyebrow mb-0.5">LOT Cards</p>
          <p className="text-[11px] text-steel-500">
            Each card is a purchase LOT — brand, specs, per-unit cost, and status.
          </p>
        </div>
        <hr className="rt-rule" />
        {list.length === 0 ? (
          <p className="text-[11px] text-steel-500">
            No LOTs yet. Add purchases in the Purchases tab.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map(p => <LotCard key={p.id} lot={p} />)}
          </div>
        )}
      </div>

    </div>
  )
}

/* ── SUB-COMPONENTS ─────────────────────────────────────────── */

function CapacityCard({ label, rounds, type, highlight = false }) {
  const chipClass = type ? CHIP_CLASS[type] || CHIP_CLASS.other : null
  const val = rounds != null ? rounds : 0
  return (
    <div className={`rt-card p-3 flex flex-col justify-between ${highlight ? 'rt-card-accent' : ''}`}>
      {chipClass
        ? <span className={chipClass}>{label}</span>
        : <span className="text-[9px] uppercase tracking-[0.22em] font-bold text-[#b87333]">{label}</span>
      }
      <div className="mt-2">
        <span className="text-xl font-black text-[#f0ece4] rt-data leading-none">
          {val.toLocaleString()}
        </span>
        <span className="text-[9px] text-steel-500 ml-1 uppercase tracking-wider">rds</span>
      </div>
    </div>
  )
}

function LotCard({ lot }) {
  const perUnit   = calculateCostPerUnit(lot.price, lot.shipping, lot.tax, lot.qty)
  const totalCost = calculateLotTotalCost(lot)
  const typeLabel = COMPONENT_TYPES.find(t => t.value === lot.componentType)?.label || 'Other'
  const chipClass = CHIP_CLASS[lot.componentType] || CHIP_CLASS.other
  const caseLabel = lot.componentType === 'case' && lot.caseCondition
    ? CASE_CONDITIONS.find(c => c.value === lot.caseCondition)?.label || ''
    : ''
  const isDepleted = lot.status === 'depleted'

  return (
    <div className={`rt-card flex flex-col overflow-hidden transition-all hover:border-[#3a3a3a] ${isDepleted ? 'opacity-55 grayscale' : 'rt-card-accent'}`}>
      {/* Card header band */}
      <div className="relative h-20 bg-gradient-to-br from-[#0f0f0f] via-[#0a0a0a] to-[#141414] flex-shrink-0">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,_#b87333_0,_transparent_60%)]" />
        <div className="relative z-10 flex items-start justify-between px-3 pt-2.5">
          <span className="text-[9px] font-mono px-2 py-[2px] rounded bg-black/80 border border-[#b87333]/30 text-[#b87333]/80 tracking-widest">
            {lot.lotId || 'LOT'}
          </span>
          <span className={chipClass}>{typeLabel}</span>
        </div>
        {caseLabel && (
          <div className="relative z-10 px-3 pt-1 text-[9px] text-steel-400 uppercase tracking-wide">
            {caseLabel}
          </div>
        )}
        {/* Caliber badge bottom-left */}
        {lot.caliber && (
          <div className="absolute bottom-2 left-3">
            <span className="text-[8px] font-mono text-steel-500 tracking-widest">{lot.caliber}</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <div>
          <div className="text-xs font-bold text-[#f0ece4] leading-tight">
            {lot.brand || 'Unknown'}
          </div>
          {lot.name && (
            <div className="text-[11px] text-steel-400 leading-tight mt-0.5">{lot.name}</div>
          )}
        </div>

        <div className="flex justify-between text-[11px] text-steel-500 border-b border-[#1e1e1e] pb-2">
          <span className="font-mono">{lot.qty} {lot.unit}</span>
          {lot.vendor && <span className="truncate ml-2 text-right">{lot.vendor}</span>}
        </div>

        <div className="flex justify-between text-[11px] mt-auto">
          <span className="text-steel-500">Total Cost</span>
          <span className="font-mono text-[#f0ece4]">{formatCurrency(totalCost)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-steel-500">Per Unit</span>
          <span className="font-mono text-[#d4a843]">{formatCurrency(perUnit)}</span>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-[#1e1e1e] mt-1">
          <div className="flex items-center gap-1.5">
            <span className={`rt-dot ${isDepleted ? 'rt-dot-empty' : 'rt-dot-active'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDepleted ? 'text-red-400' : 'text-emerald-500'}`}>
              {isDepleted ? 'Depleted' : 'Active'}
            </span>
          </div>
          {lot.purchaseDate && (
            <span className="text-[9px] text-steel-600 font-mono">
              {String(lot.purchaseDate).substring(0, 10)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

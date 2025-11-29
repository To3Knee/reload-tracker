//===============================================================
//Script Name: Dashboard.jsx
//Script Location: src/components/Dashboard.jsx
//Date: 11/27/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.0.3
//About: Live Round Calculator dashboard. Ties recipes, purchases,
//       cost math, and inventory capacity into a single view.
//===============================================================

import { useEffect, useMemo, useState } from 'react'
import {
  calculatePerUnit,
  formatCurrency,
  getAllRecipes,
  saveRecipe,
} from '../lib/db'

export default function Dashboard({
  purchases = [],
  selectedRecipe,
  onSelectRecipe,
}) {
  const [chargeGrains, setChargeGrains] = useState('')
  const [lotSize, setLotSize] = useState(1000)
  const [caseReuse, setCaseReuse] = useState(5)
  const [caliber, setCaliber] = useState('9mm')

  const [recipes, setRecipes] = useState([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [scenarios, setScenarios] = useState([])
  const [savingRecipeId, setSavingRecipeId] = useState(null)

  // Load recipes once
  useEffect(() => {
    const load = async () => {
      const data = await getAllRecipes()
      setRecipes(data)
    }
    load()
  }, [])

  // Sync selected recipe from outside (Recipes tab "Use in calculator")
  useEffect(() => {
    if (selectedRecipe) {
      setSelectedRecipeId(String(selectedRecipe.id || ''))
      if (selectedRecipe.caliber) {
        setCaliber(selectedRecipe.caliber)
      }
      if (selectedRecipe.chargeGrains) {
        setChargeGrains(String(selectedRecipe.chargeGrains))
      }
      if (selectedRecipe.brassReuse) {
        setCaseReuse(Number(selectedRecipe.brassReuse) || 1)
      }
      if (selectedRecipe.lotSize) {
        setLotSize(Number(selectedRecipe.lotSize) || 0)
      }
    }
  }, [selectedRecipe])

  // Filter lots by type, non-depleted, and (optionally) caliber
  const powderLots = purchases.filter(
    p =>
      p.componentType === 'powder' &&
      p.status !== 'depleted' &&
      (!caliber || !p.caliber || p.caliber === caliber)
  )

  const bulletLots = purchases.filter(
    p =>
      p.componentType === 'bullet' &&
      p.status !== 'depleted' &&
      (!caliber || !p.caliber || p.caliber === caliber)
  )

  const primerLots = purchases.filter(
    p =>
      p.componentType === 'primer' &&
      p.status !== 'depleted' &&
      (!caliber || !p.caliber || p.caliber === caliber)
  )

  const caseLots = purchases.filter(
    p =>
      p.componentType === 'case' &&
      p.status !== 'depleted' &&
      (!caliber || !p.caliber || p.caliber === caliber)
  )

  // Current selected lot ids
  const [powderId, setPowderId] = useState('')
  const [bulletId, setBulletId] = useState('')
  const [primerId, setPrimerId] = useState('')
  const [caseId, setCaseId] = useState('')

  const findById = (id, lots) =>
    lots.find(l => String(l.id) === String(id)) || null

  // When caliber or recipes change, try to keep a matching recipe selected
  useEffect(() => {
    if (!caliber || recipes.length === 0) return

    // If currently selected recipe doesn't match caliber, clear it
    const current = recipes.find(r => String(r.id) === selectedRecipeId)
    if (current && current.caliber && current.caliber !== caliber) {
      setSelectedRecipeId('')
    }

    // Auto-select a recipe matching this caliber when none chosen
    if (!selectedRecipeId) {
      const firstForCaliber = recipes.find(r => r.caliber === caliber)
      if (firstForCaliber) {
        setSelectedRecipeId(String(firstForCaliber.id))
        if (onSelectRecipe) {
          onSelectRecipe(firstForCaliber)
        }
      }
    }
  }, [caliber, recipes, selectedRecipeId, onSelectRecipe])

  const activeRecipe =
    selectedRecipe ||
    recipes.find(r => String(r.id) === String(selectedRecipeId)) ||
    null

  const activeRecipeLabel = activeRecipe
    ? `${activeRecipe.name}${
        activeRecipe.caliber ? ` • ${activeRecipe.caliber}` : ''
      }`
    : ''

  // Auto-select sensible defaults for each component when lots change
  useEffect(() => {
    if (!caliber && recipes.length > 0 && !selectedRecipeId) {
      const firstWithCaliber = recipes.find(r => r.caliber)
      if (firstWithCaliber) {
        setCaliber(firstWithCaliber.caliber)
      }
    }

    const ensureSelection = (currentId, lots, setter) => {
      if (currentId && lots.some(l => String(l.id) === String(currentId))) {
        return
      }
      if (!lots.length) {
        setter('')
        return
      }
      // Prefer first lot that matches recipe's brand/name if we have a recipe
      if (activeRecipe) {
        const match = lots.find(
          l =>
            (activeRecipe.powderBrand &&
              l.brand &&
              l.brand.toLowerCase() ===
                activeRecipe.powderBrand.toLowerCase()) ||
            (activeRecipe.bulletBrand &&
              l.brand &&
              l.brand.toLowerCase() ===
                activeRecipe.bulletBrand.toLowerCase())
        )
        if (match) {
          setter(String(match.id))
          return
        }
      }
      // Otherwise, fall back to the first available lot
      setter(String(lots[0].id))
    }

    ensureSelection(powderId, powderLots, setPowderId)
    ensureSelection(bulletId, bulletLots, setBulletId)
    ensureSelection(primerId, primerLots, setPrimerId)
    ensureSelection(caseId, caseLots, setCaseId)
  }, [caliber, activeRecipe, powderLots, bulletLots, primerLots, caseLots])

  // Cost breakdown
  const breakdown = useMemo(() => {
    if (!purchases.length) return null

    const powder = findById(powderId, powderLots)
    const bullet = findById(bulletId, bulletLots)
    const primer = findById(primerId, primerLots)
    const brass = findById(caseId, caseLots)

    const numericCharge = Number(chargeGrains) || 0
    const numericLotSize = Number(lotSize) || 0
    const numericReuse = Number(caseReuse) || 1

    const powderPerUnit =
      powder &&
      calculatePerUnit(
        powder.price,
        powder.shipping,
        powder.tax,
        powder.qty
      )

    const bulletPerUnit =
      bullet &&
      calculatePerUnit(
        bullet.price,
        bullet.shipping,
        bullet.tax,
        bullet.qty
      )

    const primerPerUnit =
      primer &&
      calculatePerUnit(
        primer.price,
        primer.shipping,
        primer.tax,
        primer.qty
      )

    const brassPerUnit =
      brass &&
      calculatePerUnit(
        brass.price,
        brass.shipping,
        brass.tax,
        brass.qty
      )

    const powderPerRound = powderPerUnit
      ? // convert grains → cost: if unit is "gr" or similar, direct multiply
        (() => {
          const unit = (powder.unit || '').toLowerCase()
          const perUnit = powderPerUnit
          if (unit === 'gr' || unit === 'grain' || unit === 'grains') {
            return perUnit * numericCharge
          }
          if (unit === 'lb' || unit === 'pound' || unit === 'pounds') {
            return (perUnit / 7000) * numericCharge
          }
          if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
            return (perUnit / 15432) * numericCharge
          }
          return perUnit * numericCharge
        })()
      : 0

    const bulletPerRound = bulletPerUnit || 0
    const primerPerRound = primerPerUnit || 0
    const brassPerRound =
      brassPerUnit && numericReuse > 0
        ? brassPerUnit / numericReuse
        : brassPerUnit || 0

    const totalPerRound =
      powderPerRound + bulletPerRound + primerPerRound + brassPerRound

    const per50 = totalPerRound * 50
    const per100 = totalPerRound * 100
    const per1000 = totalPerRound * 1000
    const lotCost = totalPerRound * (numericLotSize || 0)

    return {
      powder: {
        perRound: powderPerRound,
      },
      bullet: {
        perRound: bulletPerRound,
      },
      primer: {
        perRound: primerPerRound,
      },
      brass: {
        perRound: brassPerRound,
      },
      total: {
        perRound: totalPerRound,
        per50,
        per100,
        per1000,
        lot: lotCost,
      },
    }
  }, [
    purchases.length,
    powderId,
    bulletId,
    primerId,
    caseId,
    powderLots,
    bulletLots,
    primerLots,
    caseLots,
    chargeGrains,
    lotSize,
    caseReuse,
  ])

  // Inventory capacity for this recipe
  const capacity = useMemo(() => {
    if (!activeRecipe || !purchases.length) return null

    const numericCharge = Number(chargeGrains) || 0
    if (!numericCharge) {
      return { needsCharge: true }
    }

    const powder = findById(powderId, powderLots)
    const bullet = findById(bulletId, bulletLots)
    const primer = findById(primerId, primerLots)
    const brass = findById(caseId, caseLots)

    const powderPerUnit =
      powder &&
      calculatePerUnit(
        powder.price,
        powder.shipping,
        powder.tax,
        powder.qty
      )

    const powderRounds = (() => {
      if (!powder || !powderPerUnit) return 0
      const unit = (powder.unit || '').toLowerCase()
      const qty = Number(powder.qty) || 0
      if (!qty) return 0

      if (unit === 'gr' || unit === 'grain' || unit === 'grains') {
        return qty / numericCharge
      }
      if (unit === 'lb' || unit === 'pound' || unit === 'pounds') {
        return (qty * 7000) / numericCharge
      }
      if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
        return (qty * 15432) / numericCharge
      }
      // Fallback – treat as "per unit" unknown, assume qty is grains
      return qty / numericCharge
    })()

    const bulletRounds = bullet ? Number(bullet.qty) || 0 : 0
    const primerRounds = primer ? Number(primer.qty) || 0 : 0
    const brassQty = brass ? Number(brass.qty) || 0 : 0
    const numericReuse = Number(caseReuse) || 1
    const brassRounds = brassQty * numericReuse

    const candidates = [
      { key: 'powderRounds', value: Math.floor(powderRounds), label: 'powder on hand' },
      { key: 'bulletRounds', value: bulletRounds, label: 'bullet count' },
      { key: 'primerRounds', value: primerRounds, label: 'primer count' },
      { key: 'brassRounds', value: brassRounds, label: 'brass (with reuse)' },
    ]

    const nonZero = candidates.filter(c => c.value > 0)
    if (!nonZero.length) return null

    const limiting = nonZero.reduce((min, c) =>
      c.value < min.value ? c : min
    )

    return {
      powderRounds: Math.floor(powderRounds),
      bulletRounds,
      primerRounds,
      brassRounds,
      limiting,
      roundsPossible: limiting.value,
      needsCharge: false,
    }
  }, [
    activeRecipe,
    purchases.length,
    powderId,
    bulletId,
    primerId,
    caseId,
    powderLots,
    bulletLots,
    primerLots,
    caseLots,
    chargeGrains,
    caseReuse,
  ])

  // Header line: always label the value, never render a bare `0` on its own
  const headerRounds =
    activeRecipe && capacity && !capacity.needsCharge
      ? typeof capacity.roundsPossible === 'number'
        ? capacity.roundsPossible
        : 0
      : null

  function handleSaveScenario() {
    if (!breakdown || !breakdown.total || !breakdown.total.perRound) {
      return
    }

    const id = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`
    const name = activeRecipe
      ? activeRecipe.name
      : `Manual - ${caliber || 'Unknown'}`

    const scenario = {
      id,
      name,
      caliber,
      chargeGrains: Number(chargeGrains) || 0,
      lotSize: Number(lotSize) || 0,
      caseReuse: Number(caseReuse) || 1,
      cost: {
        perRound: breakdown.total.perRound,
        per100: breakdown.total.per100,
        per1000: breakdown.total.per1000,
        lot: breakdown.total.lot,
      },
    }

    setScenarios(prev => [scenario, ...prev])
  }

  function handleDeleteScenario(id) {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }

  async function handleSaveScenarioAsRecipe(scenario) {
    if (!scenario || !scenario.cost || !scenario.cost.perRound) return
    setSavingRecipeId(scenario.id)
    try {
      const recipeName =
        scenario.name || `Saved config (${scenario.caliber || 'Unknown'})`

      const payload = {
        name: recipeName,
        caliber: scenario.caliber || '',
        profileType: 'custom',
        chargeGrains: scenario.chargeGrains || 0,
        brassReuse: scenario.caseReuse || 1,
        lotSize: scenario.lotSize || 0,
        notes: 'Saved from Live Round Calculator config.',
        bulletWeightGr: '',
        muzzleVelocityFps: '',
        zeroDistanceYards: '',
        groupSizeInches: '',
        rangeNotes: '',
      }

      await saveRecipe(payload)
      const data = await getAllRecipes()
      setRecipes(data)
    } finally {
      setSavingRecipeId(null)
    }
  }

  const sectionLabelClass =
    'text-xs uppercase tracking-[0.25em] text-slate-500 mb-2'

  // Smaller input text and padding for compact look
  const inputClass =
    'w-full bg-black/60 border border-slate-700/70 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/60'

  const renderOptionLabel = p =>
    `${p.lotId || 'LOT'} — ${p.brand || 'Unknown'}${
      p.name ? ` • ${p.name}` : ''
    } (${p.qty} ${p.unit}, ${formatCurrency(
      calculatePerUnit(p.price, p.shipping, p.tax, p.qty)
    )}/unit)`

  const calibers = Array.from(
    new Set(
      recipes
        .map(r => r.caliber)
        .filter(c => c && c.trim().length > 0)
    )
  ).sort()

  const recipesForCaliber = recipes.filter(r => {
    if (!caliber) return true
    if (!r.caliber) return true
    return r.caliber === caliber
  })

  const hasBallistics =
    !!activeRecipe &&
    (activeRecipe.bulletWeightGr ||
      activeRecipe.muzzleVelocityFps ||
      activeRecipe.zeroDistanceYards ||
      activeRecipe.groupSizeInches)

  function handleRecipeSelect(e) {
    const id = e.target.value
    setSelectedRecipeId(id)
    const recipe = recipes.find(r => String(r.id) === id)
    if (recipe && onSelectRecipe) {
      onSelectRecipe(recipe)
    }
  }

  // Common button styles for pill action buttons
  const saveConfigButtonClass = 'px-2 py-[2px] rounded-full bg-black/60 border border-emerald-400/70 text-emerald-300 hover:bg-emerald-900/40 transition text-[11px] cursor-pointer'
  const removeButtonClass = 'px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-300 hover:bg-red-900/40 transition text-[11px] cursor-pointer'
  const saveRecipeButtonClass = 'px-2 py-[2px] rounded-full bg-black/60 border border-emerald-400/70 text-emerald-300 hover:bg-emerald-900/40 transition text-[11px] cursor-pointer disabled:opacity-50'


  return (
    <div className="space-y-6">
      {/* HEADER – TIGHTEST SPACING APPLIED: space-y-0 leading-none */}
      <h2 className="text-3xl font-bold">
        <span className="block glow-red mb-1">Live Round Calculator</span>

        {/* FIX: Grouping for separate lines with tightest vertical spacing */}
        <div className="space-y-0 leading-none"> 
          {activeRecipeLabel && (
            <span className="block text-xs text-slate-400"> 
              Recipe:{' '}
              <span className="font-semibold text-slate-100">
                {activeRecipeLabel}
              </span>
            </span>
          )}

          {headerRounds !== null && (
            <span className="block text-xs text-slate-400"> 
              Max rounds with selected recipe:{' '}
              <span className="font-semibold text-slate-100">
                {headerRounds.toLocaleString()}
              </span>
            </span>
          )}

          {hasBallistics && (
            <span className="block text-[11px] text-slate-500"> 
              Ballistics:{' '}
              <span className="text-slate-300">
                {activeRecipe.bulletWeightGr
                  ? `${activeRecipe.bulletWeightGr} gr`
                  : '—'}{' '}
                @{' '}
                {activeRecipe.muzzleVelocityFps
                  ? `${activeRecipe.muzzleVelocityFps} fps`
                  : '—'}
                , zero{' '}
                {activeRecipe.zeroDistanceYards
                  ? `${activeRecipe.zeroDistanceYards} yds`
                  : '—'}
                {activeRecipe.groupSizeInches
                  ? ` • ${activeRecipe.groupSizeInches}" group`
                  : ''}
              </span>
            </span>
          )}
        </div>
      </h2>

      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 items-start">
        {/* LEFT SIDE: inputs & recipe link */}
        <div className="glass rounded-2xl p-6 space-y-6">
          {/* Group 1: Caliber and Recipe */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* 1. Caliber */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Caliber
              </label>
              {calibers.length === 0 ? (
                <input
                  type="text"
                  className={inputClass}
                  value={caliber}
                  onChange={e => setCaliber(e.target.value)}
                  placeholder="e.g. 9mm, .223 Rem"
                />
              ) : (
                <select
                  className={inputClass}
                  value={caliber}
                  onChange={e => setCaliber(e.target.value)}
                >
                  <option value="">All calibers</option>
                  {calibers.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                Filters component lots and recipes by caliber.
              </p>
            </div>

            {/* 2. Recipe selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Recipe (optional)
              </label>
              {recipes.length === 0 ? (
                <div className="text-[11px] text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl px-3 py-1.5">
                  No recipes found yet. Create or edit them on the{' '}
                  <span className="font-semibold text-red-400">
                    Recipes
                  </span>{' '}
                  tab.
                </div>
              ) : (
                <select
                  className={inputClass}
                  value={selectedRecipeId}
                  onChange={handleRecipeSelect}
                >
                  <option value="">
                    Select a recipe for this caliber…
                  </option>
                  {recipesForCaliber.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.caliber ? ` • ${r.caliber}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                A recipe will auto-fill other required fields.
              </p>
            </div>
          </div>

          {/* Group 2: Charge Weight and Lot Size */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            {/* 3. Charge weight */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Charge weight (gr)
              </label>
              <input
                type="number"
                className={inputClass}
                value={chargeGrains}
                onChange={e => setChargeGrains(e.target.value)}
                placeholder="e.g. 4.3"
                min="0"
                step="0.01"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Used with selected powder lot to compute cost per round.
              </p>
            </div>

            {/* 4. Lot size */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Lot size (rounds)
              </label>
              <input
                type="number"
                className={inputClass}
                value={lotSize}
                onChange={e => setLotSize(e.target.value)}
                min="0"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Used to compute total cost for a batch of rounds.
              </p>
            </div>
          </div>

          {/* Group 3: Component Lots (Powder, Bullet, Primer, Brass Lot) */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            {/* 5. Powder lot */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Powder lot
              </label>
              <select
                className={inputClass}
                value={powderId}
                onChange={e => setPowderId(e.target.value)}
              >
                <option value="">Select powder…</option>
                {powderLots.map(p => (
                  <option key={p.id} value={p.id}>
                    {renderOptionLabel(p)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Cost adjusts automatically based on charge weight.
              </p>
            </div>

            {/* 6. Bullet lot */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Bullet lot
              </label>
              <select
                className={inputClass}
                value={bulletId}
                onChange={e => setBulletId(e.target.value)}
              >
                <option value="">Select bullet…</option>
                {bulletLots.map(p => (
                  <option key={p.id} value={p.id}>
                    {renderOptionLabel(p)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Bullet cost per round is based on your purchase data.
              </p>
            </div>

            {/* 7. Primer lot */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Primer lot
              </label>
              <select
                className={inputClass}
                value={primerId}
                onChange={e => setPrimerId(e.target.value)}
              >
                <option value="">Select primer…</option>
                {primerLots.map(p => (
                  <option key={p.id} value={p.id}>
                    {renderOptionLabel(p)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Primer cost per round is fully captured here.
              </p>
            </div>

            {/* 8. Brass lot */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Brass lot
              </label>
              <select
                className={inputClass}
                value={caseId}
                onChange={e => setCaseId(e.target.value)}
              >
                <option value="">Select brass…</option>
                {caseLots.map(p => (
                  <option key={p.id} value={p.id}>
                    {renderOptionLabel(p)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Select brass lot and set the reuse factor below.
              </p>
            </div>
          </div>

          {/* Group 4: Brass Reuse Factor (Constrained width) */}
          <div className="pt-4 border-t border-slate-800/80">
            {/* Constrained width for the input field */}
            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Brass reuse factor
              </label>
              <input
                type="number"
                className={inputClass}
                value={caseReuse}
                onChange={e => setCaseReuse(e.target.value)}
                min="1"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              How many times you expect to reload this brass on average.
            </p>
          </div>

          {/* Scenario save */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-2">
            <p className="text-[11px] text-slate-500 min-w-0 mr-2">
              Save this setup as a configuration to compare later, or push
              it into Recipes when you’re happy with it.
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                onClick={handleSaveScenario}
                className={saveConfigButtonClass}
              >
                + Save config
              </span>
            </div>
          </div>

          {/* INVENTORY CAPACITY */}
          {activeRecipe && (
            <div className="border-t border-red-500/20 pt-4 space-y-2">
              <p className={sectionLabelClass}>
                INVENTORY CAPACITY (THIS RECIPE)
              </p>

              {capacity?.needsCharge ? (
                <p className="text-xs text-amber-300">
                  Enter a charge weight to compute how many rounds you can
                  build from your current {caliber || 'selected'} inventory.
                </p>
              ) : capacity &&
                (capacity.powderRounds ||
                  capacity.bulletRounds ||
                  capacity.primerRounds ||
                  capacity.brassRounds) ? (
                // FIX: Removed the misplaced JSX comment that caused the syntax error.
                <div className="grid grid-cols-2 gap-4"> 
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p className="whitespace-nowrap">
                      Powder capacity:{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.powderRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                    <p className="whitespace-nowrap">
                      Bullet capacity:{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.bulletRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                    <p className="whitespace-nowrap">
                      Primer capacity:{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.primerRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                    <p className="whitespace-nowrap">
                      Brass (with reuse):{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.brassRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                  </div>
                  {capacity.limiting && (
                    <div className="text-[11px] text-slate-500 text-right">
                      <p className='text-slate-500 whitespace-nowrap'>
                        Max rounds value shown in the header is limited by:
                      </p>
                      <p className="font-semibold text-slate-100 text-sm">
                        {capacity.limiting.label}
                      </p>
                      <p className="text-slate-400 mt-1">
                        {capacity.limiting.value.toLocaleString()} rounds
                        available.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No sufficient component data to compute capacity for this
                  recipe yet.
                </p>
              )}
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="border-t border-red-500/20 pt-4 space-y-2">
              <p className={sectionLabelClass}>SAVED CONFIGURATIONS</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {scenarios.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-2 text-[11px] text-slate-300"
                  >
                    <div>
                      <div className="font-semibold text-slate-100">
                        {s.name}{' '}
                        {s.caliber && (
                          <span className="text-slate-400">
                            ({s.caliber})
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 space-x-2">
                        <span>
                          Charge {s.chargeGrains} gr • Lot{' '}
                          {s.lotSize} rnds • Brass x{s.caseReuse}
                        </span>
                      </div>
                      <div className="text-slate-400 space-x-2">
                        <span>
                          {formatCurrency(s.cost.perRound)} /rnd •{' '}
                          {formatCurrency(s.cost.per100)} /100 •{' '}
                          {formatCurrency(s.cost.per1000)} /1000
                        </span>
                        {s.cost.lot > 0 && (
                          <span>
                            • Lot:{' '}
                            {formatCurrency(s.cost.lot)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        onClick={() => handleDeleteScenario(s.id)}
                        className={removeButtonClass}
                      >
                        Remove
                      </span>
                      <span
                        onClick={() => handleSaveScenarioAsRecipe(s)}
                        disabled={savingRecipeId === s.id}
                        className={saveRecipeButtonClass}
                      >
                        {savingRecipeId === s.id ? 'Saving…' : 'Save recipe'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: breakdown + capacity + scenarios */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <div>
            <p className={sectionLabelClass}>COST PER ROUND</p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Per round</p>
                <p className="text-4xl font-black text-emerald-400">
                  {formatCurrency(breakdown?.total.perRound || 0)}
                </p>
              </div>
              <div className="text-right text-xs text-slate-400 space-y-1">
                <p>
                  Per 50:{' '}
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(breakdown?.total.per50 || 0)}
                  </span>
                </p>
                <p>
                  Per 100:{' '}
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(breakdown?.total.per100 || 0)}
                  </span>
                </p>
                <p>
                  Per 1,000:{' '}
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(breakdown?.total.per1000 || 0)}
                  </span>
                </p>
                <p>
                  Lot total:{' '}
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(breakdown?.total.lot || 0)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabelClass}>
              COMPONENT BREAKDOWN (PER ROUND)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <BreakdownRow
                label="Powder"
                value={breakdown?.powder.perRound}
              />
              <BreakdownRow
                label="Bullet"
                value={breakdown?.bullet.perRound}
              />
              <BreakdownRow
                label="Primer"
                value={breakdown?.primer.perRound}
              />
              <BreakdownRow
                label="Brass"
                value={breakdown?.brass.perRound}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BreakdownRow({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">
        {formatCurrency(value || 0)}
      </span>
    </div>
  )
}
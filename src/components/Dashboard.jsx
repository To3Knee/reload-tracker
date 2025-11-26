// src/components/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import {
  calculatePerUnit,
  formatCurrency,
  getAllRecipes,
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

  // Load recipes once
  useEffect(() => {
    const load = async () => {
      const data = await getAllRecipes()
      setRecipes(data)
    }
    load()
  }, [])

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

  const [powderId, setPowderId] = useState('')
  const [bulletId, setBulletId] = useState('')
  const [primerId, setPrimerId] = useState('')
  const [caseId, setCaseId] = useState('')

  const findById = (id, list) =>
    list.find(p => String(p.id) === String(id))

  // When a recipe is selected externally (Recipes tab -> "Use in calculator"),
  // sync local fields (caliber, charge, lot size, brass reuse).
  useEffect(() => {
    if (!selectedRecipe) return

    if (selectedRecipe.id != null) {
      setSelectedRecipeId(String(selectedRecipe.id))
    }
    if (selectedRecipe.caliber) {
      setCaliber(selectedRecipe.caliber)
    }
    if (selectedRecipe.chargeGrains != null) {
      setChargeGrains(String(selectedRecipe.chargeGrains))
    }
    if (selectedRecipe.lotSize) {
      setLotSize(selectedRecipe.lotSize)
    }
    if (selectedRecipe.brassReuse) {
      setCaseReuse(selectedRecipe.brassReuse)
    }
  }, [selectedRecipe])

  // Smarter LOT auto-pick: re-evaluate when caliber / recipe / inventory changes
  useEffect(() => {
    const ensureSelection = (currentId, lots, setter) => {
      // No lots for this type: clear selection
      if (!lots.length) {
        if (currentId !== '') {
          setter('')
        }
        return
      }

      // If the current selection is still valid, leave it alone
      const exists = lots.some(p => String(p.id) === String(currentId))
      if (exists) return

      // Otherwise, fall back to the first available lot
      setter(String(lots[0].id))
    }

    ensureSelection(powderId, powderLots, setPowderId)
    ensureSelection(bulletId, bulletLots, setBulletId)
    ensureSelection(primerId, primerLots, setPrimerId)
    ensureSelection(caseId, caseLots, setCaseId)
  }, [caliber, selectedRecipe, powderLots, bulletLots, primerLots, caseLots])

  // Cost breakdown
  const breakdown = useMemo(() => {
    if (!purchases.length) return null

    const powder = findById(powderId, powderLots)
    const bullet = findById(bulletId, bulletLots)
    const primer = findById(primerId, primerLots)
    const brass = findById(caseId, caseLots)

    const numericCharge = Number(chargeGrains) || 0
    const numericReuse = Math.max(Number(caseReuse) || 1, 1)
    const numericLot = Math.max(Number(lotSize) || 0, 0)

    const per = p =>
      p
        ? calculatePerUnit(p.price, p.shipping, p.tax, p.qty)
        : 0

    const powderPerRound = (() => {
      if (!powder) return 0
      const perUnit = per(powder)
      const unit = (powder.unit || '').toLowerCase()

      if (!numericCharge) return 0

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

    const bulletPerRound = per(bullet)
    const primerPerRound = per(primer)
    const brassPerRound = brass ? per(brass) / numericReuse : 0

    const totalPerRound =
      powderPerRound +
      bulletPerRound +
      primerPerRound +
      brassPerRound

    const mk = perRound => ({
      perRound,
      per50: perRound * 50,
      per100: perRound * 100,
      per1000: perRound * 1000,
      lot: perRound * numericLot,
    })

    return {
      powder: mk(powderPerRound),
      bullet: mk(bulletPerRound),
      primer: mk(primerPerRound),
      brass: mk(brassPerRound),
      total: mk(totalPerRound),
    }
  }, [
    purchases,
    powderLots,
    bulletLots,
    primerLots,
    caseLots,
    powderId,
    bulletId,
    primerId,
    caseId,
    chargeGrains,
    caseReuse,
    lotSize,
  ])

  // Capacity (how many rounds possible from all inventory with this recipe)
  const capacity = useMemo(() => {
    if (!selectedRecipe) return null

    const numericCharge = Number(chargeGrains) || 0
    if (!numericCharge) {
      return { needsCharge: true }
    }

    const numericReuse = Math.max(Number(caseReuse) || 1, 1)

    const totalPowderGrains = powderLots.reduce((sum, p) => {
      const qty = Number(p.qty) || 0
      const unit = (p.unit || '').toLowerCase()

      if (unit === 'lb' || unit === 'pound' || unit === 'pounds') {
        return sum + qty * 7000
      }
      if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
        return sum + qty * 15432
      }
      if (unit === 'gr' || unit === 'grain' || unit === 'grains') {
        return sum + qty
      }
      return sum
    }, 0)

    const totalBullets = bulletLots.reduce(
      (sum, p) => sum + (Number(p.qty) || 0),
      0
    )
    const totalPrimers = primerLots.reduce(
      (sum, p) => sum + (Number(p.qty) || 0),
      0
    )
    const totalCases = caseLots.reduce(
      (sum, p) => sum + (Number(p.qty) || 0),
      0
    )

    const powderRounds =
      totalPowderGrains > 0 && numericCharge > 0
        ? Math.floor(totalPowderGrains / numericCharge)
        : 0
    const bulletRounds = totalBullets
    const primerRounds = totalPrimers
    const brassRounds = totalCases * numericReuse

    const components = [
      { key: 'powder', label: 'Powder', rounds: powderRounds },
      { key: 'bullets', label: 'Bullets', rounds: bulletRounds },
      { key: 'primers', label: 'Primers', rounds: primerRounds },
      { key: 'brass', label: 'Brass (with reuse)', rounds: brassRounds },
    ]

    let roundsPossible = 0
    let limiting = null

    for (const c of components) {
      if (c.rounds === 0) {
        if (!limiting || limiting.rounds > 0) {
          limiting = c
        }
        continue
      }
      if (roundsPossible === 0) {
        roundsPossible = c.rounds
        limiting = c
      } else if (c.rounds < roundsPossible) {
        roundsPossible = c.rounds
        limiting = c
      }
    }

    return {
      needsCharge: false,
      roundsPossible,
      powderRounds,
      bulletRounds,
      primerRounds,
      brassRounds,
      limiting,
    }
  }, [
    selectedRecipe,
    powderLots,
    bulletLots,
    primerLots,
    caseLots,
    chargeGrains,
    caseReuse,
  ])

  // Header line: always label the value, never render a bare `0` on its own
  const headerRounds =
    selectedRecipe && capacity && !capacity.needsCharge
      ? (typeof capacity.roundsPossible === 'number'
          ? capacity.roundsPossible
          : 0)
      : null

  function handleSaveScenario() {
    if (!breakdown || !breakdown.total || !breakdown.total.perRound) {
      return
    }

    const id = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`
    const name = selectedRecipe
      ? selectedRecipe.name
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

  const sectionLabelClass =
    'text-xs uppercase tracking-[0.25em] text-slate-500 mb-2'

  const inputClass =
    'w-full bg-black/40 border border-red-500/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60'

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

  const activeRecipeLabel = selectedRecipe
    ? `${selectedRecipe.name}${
        selectedRecipe.caliber ? ` • ${selectedRecipe.caliber}` : ''
      }`
    : null

  const hasBallistics =
    !!selectedRecipe &&
    (selectedRecipe.bulletWeightGr ||
      selectedRecipe.muzzleVelocityFps ||
      (selectedRecipe.powerFactor &&
        selectedRecipe.powerFactor > 0) ||
      (selectedRecipe.zeroDistanceYards &&
        selectedRecipe.zeroDistanceYards > 0) ||
      (selectedRecipe.groupSizeInches &&
        selectedRecipe.groupSizeInches > 0))

  function handleRecipeSelect(e) {
    const id = e.target.value
    setSelectedRecipeId(id)
    const recipe = recipes.find(r => String(r.id) === id)
    if (recipe && onSelectRecipe) {
      onSelectRecipe(recipe)
    }
  }

  if (!purchases.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center mt-8">
        <h2 className="text-3xl font-bold mb-4">Live Round Calculator</h2>
        <p className="text-slate-400">
          Add your first powder, bullets, primers, and brass on the
          <span className="text-red-400 font-semibold"> Purchases </span>
          tab and the calculator will light up automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold flex flex-col gap-1">
        <span className="glow-red">Live Round Calculator</span>

        {activeRecipeLabel && (
          <span className="text-xs text-slate-400">
            Recipe:{' '}
            <span className="font-semibold text-slate-100">
              {activeRecipeLabel}
            </span>
          </span>
        )}

        {/* Only shows when we have a usable capacity object */}
        {headerRounds !== null && (
          <span className="text-xs text-slate-400">
            Max rounds with selected recipe:{' '}
            <span className="font-semibold text-slate-100">
              {headerRounds.toLocaleString()}
            </span>
          </span>
        )}

        {hasBallistics && (
          <span className="text-[11px] text-slate-500">
            Ballistics:
            {selectedRecipe.bulletWeightGr && (
              <> {selectedRecipe.bulletWeightGr}gr</>
            )}
            {selectedRecipe.muzzleVelocityFps && (
              <> @ {selectedRecipe.muzzleVelocityFps} fps</>
            )}
            {selectedRecipe.powerFactor &&
              selectedRecipe.powerFactor > 0 && (
                <>
                  {' '}
                  • PF{' '}
                  <span className="font-semibold text-slate-200">
                    {selectedRecipe.powerFactor.toFixed
                      ? selectedRecipe.powerFactor.toFixed(1)
                      : Number(
                          selectedRecipe.powerFactor
                        ).toFixed(1)}
                  </span>
                </>
              )}
            {selectedRecipe.zeroDistanceYards &&
              selectedRecipe.zeroDistanceYards > 0 && (
                <> • Zero {selectedRecipe.zeroDistanceYards} yd</>
              )}
            {selectedRecipe.groupSizeInches &&
              selectedRecipe.groupSizeInches > 0 && (
                <> • Group {selectedRecipe.groupSizeInches}"</>
              )}
          </span>
        )}
      </h2>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Left: inputs */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <div>
            <p className={sectionLabelClass}>LOAD SETUP</p>
            <p className="text-slate-300 text-sm">
              Choose caliber, recipe, component lots, and your charge weight to
              see exact cost per round.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Caliber */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Caliber
              </label>
              <input
                list="caliberOptions"
                className={inputClass}
                placeholder="9mm, 9mm Subsonic, .308, 6.5 Creedmoor…"
                value={caliber}
                onChange={e => setCaliber(e.target.value)}
              />
              <datalist id="caliberOptions">
                {calibers.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Charge */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Charge weight (grains)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={chargeGrains}
                onChange={e => setChargeGrains(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                auto fills from recipe, or manually editable here
              </p>
            </div>

            {/* Recipe selector */}
            {recipes.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Recipe (optional)
                </label>
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
              </div>
            )}

            {/* Powder lot */}
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
            </div>

            {/* Bullet lot */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Bullet lot
              </label>
              <select
                className={inputClass}
                value={bulletId}
                onChange={e => setBulletId(e.target.value)}
              >
                <option value="">Select bullets…</option>
                {bulletLots.map(p => (
                  <option key={p.id} value={p.id}>
                    {renderOptionLabel(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Primer lot */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Primer lot
              </label>
              <select
                className={inputClass}
                value={primerId}
                onChange={e => setPrimerId(e.target.value)}
              >
                <option value="">Select primers…</option>
                {primerLots.map(p => (
                  <option key={p.id} value={p.id}>
                    {renderOptionLabel(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Case lot */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Case lot
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
            </div>

            {/* Brass reuse */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Brass reuse (reloads per case)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className={inputClass}
                value={caseReuse}
                onChange={e => setCaseReuse(e.target.value)}
              />
            </div>

            {/* Lot size */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Lot size (rounds)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className={inputClass}
                value={lotSize}
                onChange={e => setLotSize(e.target.value)}
              />
            </div>
          </div>
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
              </div>
            </div>
          </div>

          <div className="border-t border-red-500/20 pt-4 space-y-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
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
                label="Brass (amortized)"
                value={breakdown?.brass.perRound}
              />
            </div>
          </div>

          <div className="border-t border-red-500/20 pt-4">
            <p className={sectionLabelClass}>LOT COST</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg text-slate-300">
                Lot of{' '}
                <span className="font-semibold text-slate-100">
                  {lotSize}
                </span>{' '}
                rounds:{' '}
                <span className="font-bold text-emerald-400">
                  {formatCurrency(breakdown?.total.lot || 0)}
                </span>
              </p>
              <button
                type="button"
                onClick={handleSaveScenario}
                className="text-[10px] px-2 py-[2px] rounded-full border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/40 transition"
              >
                + Save config
              </button>
            </div>
          </div>

          {/* INVENTORY CAPACITY – details-only, no bare `0` line */}
          {selectedRecipe && (
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
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p>
                      Powder capacity:{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.powderRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                    <p>
                      Bullet capacity:{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.bulletRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                    <p>
                      Primer capacity:{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.primerRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                    <p>
                      Brass (with reuse):{' '}
                      <span className="font-semibold text-slate-100">
                        {(capacity.brassRounds || 0).toLocaleString()}
                      </span>{' '}
                      rounds
                    </p>
                  </div>
                  {capacity.limiting && (
                    <div className="text-[11px] text-slate-500 text-right">
                      <p>
                        Max rounds value shown in the header (when present) is
                        limited by:
                      </p>
                      <p className="font-semibold text-slate-100">
                        {capacity.limiting.label}
                      </p>
                      {capacity.limiting.rounds > 0 && (
                        <p>
                          ({capacity.limiting.rounds.toLocaleString()}{' '}
                          rounds worth)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  With your current {caliber || 'selected'} inventory, this
                  recipe cannot produce any rounds yet. You may be missing one
                  or more components, or component quantities are zero.
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
                          /rd{' '}
                          <span className="font-semibold text-slate-100">
                            {formatCurrency(s.cost.perRound)}
                          </span>
                        </span>
                        <span>
                          /100{' '}
                          <span className="font-semibold text-slate-100">
                            {formatCurrency(s.cost.per100)}
                          </span>
                        </span>
                        <span>
                          /1000{' '}
                          <span className="font-semibold text-slate-100">
                            {formatCurrency(s.cost.per1000)}
                          </span>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteScenario(s.id)}
                      className="ml-3 text-[10px] px-2 py-1 rounded-full border border-red-700/70 text-red-300 hover:bg-red-900/40 transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

import { useEffect, useMemo, useState } from 'react'
import { saveRecipe } from '../../lib/db'
import { getMarketListings } from '../../lib/market'
import {
  calculateCostPerUnit,
  calculatePowderCostPerRound,
  calculateBrassCostPerRound,
  convertToGrains,
} from '../../lib/math'
import { AlertTriangle, X, DollarSign } from 'lucide-react'
import { renderOptionLabel, toStandardMoney, toPrecisionMoney } from './dashboardHelpers'
import { CostResults } from './CostResults'

const inputClass = 'rt-input'

export default function Dashboard({ purchases = [], recipes: recipesProp = [], selectedRecipe, onSelectRecipe }) {
  const [chargeGrains,      setChargeGrains]      = useState('')
  const [lotSize,           setLotSize]           = useState(20)
  const [caseReuse,         setCaseReuse]         = useState(5)
  const [caliber,           setCaliber]           = useState('9mm')
  const [marketItems,       setMarketItems]       = useState([])
  const [selectedFactoryId, setSelectedFactoryId] = useState('')
  const [manualFactoryCost, setManualFactoryCost] = useState('')
  const [selectedRecipeId,  setSelectedRecipeId]  = useState('')
  const [scenarios,         setScenarios]         = useState([])
  const [savingRecipeId,    setSavingRecipeId]    = useState(null)
  const [error,             setError]             = useState(null)
  const [powderId,          setPowderId]          = useState('')
  const [bulletId,          setBulletId]          = useState('')
  const [primerId,          setPrimerId]          = useState('')
  const [caseId,            setCaseId]            = useState('')

  useEffect(() => {
    let mounted = true
    getMarketListings().catch(() => []).then(data => { if (mounted) setMarketItems(data) })
    return () => { mounted = false }
  }, [])

  const filterByCaliber = (p) => !caliber || !p.caliber || p.caliber === caliber
  const activeOnly = (p) => p.status !== 'depleted'

  const powderLots = useMemo(() => purchases.filter(p => p.componentType === 'powder' && activeOnly(p) && filterByCaliber(p)), [purchases, caliber])
  const bulletLots = useMemo(() => purchases.filter(p => p.componentType === 'bullet' && activeOnly(p) && filterByCaliber(p)), [purchases, caliber])
  const primerLots = useMemo(() => purchases.filter(p => p.componentType === 'primer' && activeOnly(p) && filterByCaliber(p)), [purchases, caliber])
  const caseLots   = useMemo(() => purchases.filter(p => p.componentType === 'case'   && activeOnly(p) && filterByCaliber(p)), [purchases, caliber])

  const findById = (id, lots) => lots.find(l => String(l.id) === String(id)) || null

  useEffect(() => {
    if (selectedRecipe) {
      setSelectedRecipeId(String(selectedRecipe.id || ''))
      if (selectedRecipe.caliber) setCaliber(selectedRecipe.caliber)
    }
  }, [selectedRecipe])

  const activeRecipe = useMemo(() =>
    selectedRecipe || recipesProp.find(r => String(r.id) === String(selectedRecipeId)) || null,
    [selectedRecipe, selectedRecipeId, recipesProp]
  )

  const activeRecipeLabel = activeRecipe
    ? `${activeRecipe.name}${activeRecipe.caliber ? ` • ${activeRecipe.caliber}` : ''}`
    : ''

  useEffect(() => {
    if (activeRecipe) {
      if (activeRecipe.chargeGrains) setChargeGrains(String(activeRecipe.chargeGrains))
      if (activeRecipe.lotSize)      setLotSize(Number(activeRecipe.lotSize))
      if (activeRecipe.brassReuse)   setCaseReuse(Number(activeRecipe.brassReuse))
      const resolveId = (recipeId, lots) => {
        if (recipeId && lots.some(l => String(l.id) === String(recipeId))) return String(recipeId)
        return lots.length > 0 ? String(lots[0].id) : ''
      }
      setPowderId(resolveId(activeRecipe.powderLotId, powderLots))
      setBulletId(resolveId(activeRecipe.bulletLotId, bulletLots))
      setPrimerId(resolveId(activeRecipe.primerLotId, primerLots))
      setCaseId(resolveId(activeRecipe.caseLotId, caseLots))
    } else {
      const ensureValid = (currentId, lots, setter) => {
        const isValid = currentId && lots.some(l => String(l.id) === String(currentId))
        if (!isValid) setter(lots.length > 0 ? String(lots[0].id) : '')
      }
      ensureValid(powderId, powderLots, setPowderId)
      ensureValid(bulletId, bulletLots, setBulletId)
      ensureValid(primerId, primerLots, setPrimerId)
      ensureValid(caseId,   caseLots,   setCaseId)
    }
  }, [activeRecipe, caliber, powderLots, bulletLots, primerLots, caseLots])

  const factoryOptions = useMemo(() =>
    marketItems.filter(m => (m.category === 'ammo' || m.category === 'other') && m.price > 0),
    [marketItems]
  )

  useEffect(() => {
    if (!selectedFactoryId) return
    const item = marketItems.find(m => String(m.id) === selectedFactoryId)
    if (item?.qty_per_unit > 0) setManualFactoryCost((item.price / item.qty_per_unit).toFixed(2))
  }, [selectedFactoryId, marketItems])

  const breakdown = useMemo(() => {
    if (!purchases.length) return null
    const powder = findById(powderId, powderLots)
    const bullet = findById(bulletId, bulletLots)
    const primer = findById(primerId, primerLots)
    const brass  = findById(caseId,   caseLots)
    const numericCharge  = Number(chargeGrains) || 0
    const numericLotSize = Number(lotSize)      || 0
    const numericReuse   = Number(caseReuse)    || 1
    const powderPerRound = calculatePowderCostPerRound(powder, numericCharge)
    const bulletPerRound = bullet ? calculateCostPerUnit(bullet.price, bullet.shipping, bullet.tax, bullet.qty) : 0
    const primerPerRound = primer ? calculateCostPerUnit(primer.price, primer.shipping, primer.tax, primer.qty) : 0
    const brassPerRound  = calculateBrassCostPerRound(brass, numericReuse)
    const totalPerRound  = powderPerRound + bulletPerRound + primerPerRound + brassPerRound
    return {
      powder: { perRound: powderPerRound },
      bullet: { perRound: bulletPerRound },
      primer: { perRound: primerPerRound },
      brass:  { perRound: brassPerRound },
      total: {
        perRound: totalPerRound,
        per20: totalPerRound * 20, per50: totalPerRound * 50,
        per100: totalPerRound * 100, per1000: totalPerRound * 1000,
        lot: totalPerRound * numericLotSize,
      },
    }
  }, [powderId, bulletId, primerId, caseId, powderLots, bulletLots, primerLots, caseLots, chargeGrains, lotSize, caseReuse])

  const roiStats = useMemo(() => {
    const factoryCost = Number(manualFactoryCost) || 0
    if (!breakdown || factoryCost <= 0) return null
    const handloadCost = breakdown.total.perRound
    const diff = factoryCost - handloadCost
    const isSavings = diff >= 0
    const factoryItem = marketItems.find(m => String(m.id) === selectedFactoryId)
    const suspiciousMath = factoryItem && factoryItem.qty_per_unit === 1 && factoryItem.price > 5
    let label = ''
    if (isSavings) {
      const percent = factoryCost > 0 ? (Math.abs(diff) / factoryCost) * 100 : 0
      label = `${percent.toFixed(0)}%`
    } else {
      label = `${(factoryCost > 0 ? handloadCost / factoryCost : 0).toFixed(2)}x Cost`
    }
    return {
      factoryCost, diff: Math.abs(diff), label, isSavings,
      name: selectedFactoryId ? (marketItems.find(m => String(m.id) === selectedFactoryId)?.name || 'Custom Price') : 'Manual Price',
      suspiciousMath,
    }
  }, [breakdown, manualFactoryCost, selectedFactoryId, marketItems])

  const capacity = useMemo(() => {
    if (!activeRecipe || !purchases.length) return null
    const numericCharge = Number(chargeGrains) || 0
    if (!numericCharge) return { needsCharge: true }
    const powder = findById(powderId, powderLots)
    const bullet = findById(bulletId, bulletLots)
    const primer = findById(primerId, primerLots)
    const brass  = findById(caseId,   caseLots)
    const powderTotalGrains = powder ? convertToGrains(powder.qty, powder.unit) : 0
    const powderRounds = numericCharge > 0 ? powderTotalGrains / numericCharge : 0
    const bulletRounds = bullet ? Number(bullet.qty) || 0 : 0
    const primerRounds = primer ? Number(primer.qty) || 0 : 0
    const brassQty = brass ? Number(brass.qty) || 0 : 0
    const numericReuse = Number(caseReuse) || 1
    const brassRounds = brassQty * numericReuse
    const candidates = [
      { key: 'powderRounds', value: Math.floor(powderRounds), label: 'powder on hand' },
      { key: 'bulletRounds', value: bulletRounds,             label: 'bullet count' },
      { key: 'primerRounds', value: primerRounds,             label: 'primer count' },
      { key: 'brassRounds',  value: brassRounds,              label: 'brass (with reuse)' },
    ]
    const nonZero = candidates.filter(c => c.value > 0)
    if (!nonZero.length) return null
    const limiting = nonZero.reduce((min, c) => c.value < min.value ? c : min)
    return { powderRounds: Math.floor(powderRounds), bulletRounds, primerRounds, brassRounds, limiting, roundsPossible: limiting.value, needsCharge: false }
  }, [activeRecipe, powderId, bulletId, primerId, caseId, powderLots, bulletLots, primerLots, caseLots, chargeGrains, caseReuse])

  const recipesForCaliber = recipesProp.filter(r => !caliber || !r.caliber || r.caliber === caliber)
  const calibers = Array.from(new Set(recipesProp.map(r => r.caliber).filter(c => c?.trim().length > 0))).sort()

  function handleRecipeSelect(e) {
    const id = e.target.value
    setSelectedRecipeId(id)
    if (onSelectRecipe) {
      const r = recipesProp.find(x => String(x.id) === String(id))
      if (r) onSelectRecipe(r)
    }
  }

  function handleSaveScenario() {
    if (!breakdown?.total?.perRound) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const name = activeRecipe ? activeRecipe.name : `Manual - ${caliber || 'Unknown'}`
    setScenarios(prev => [{ id, name, caliber, chargeGrains: Number(chargeGrains) || 0, lotSize: Number(lotSize) || 0, caseReuse: Number(caseReuse) || 1, cost: { perRound: breakdown.total.perRound } }, ...prev])
  }

  function handleDeleteScenario(id) { setScenarios(prev => prev.filter(s => s.id !== id)) }

  async function handleSaveScenarioAsRecipe(scenario) {
    setSavingRecipeId(scenario.id); setError(null)
    try {
      await saveRecipe({ name: scenario.name || 'Saved config', caliber: scenario.caliber || '', profileType: 'custom', chargeGrains: scenario.chargeGrains || 0, brassReuse: scenario.caseReuse || 1, lotSize: scenario.lotSize || 0, notes: 'Saved from Live Round Calculator config.' })
    } catch (err) { setError(`Failed to save recipe: ${err.message}`) }
    finally { setSavingRecipeId(null) }
  }

  return (
    <div className="space-y-6">
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Live Round</span>
          <h2 className="rt-section-title">CALCULATOR</h2>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
          <div className="flex-1"><p className="text-xs font-bold text-red-400">System Notification</p><p className="text-xs text-red-200/80">{error}</p></div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16} /></button>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Left column: inputs */}
        <div className="glass p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="rt-label">Caliber</label>
              {calibers.length === 0 ? (
                <input type="text" className={inputClass} value={caliber} onChange={e => setCaliber(e.target.value)} placeholder="e.g. 9mm, .223 Rem" />
              ) : (
                <select className={inputClass} value={caliber} onChange={e => setCaliber(e.target.value)}>
                  <option value="">All calibers</option>
                  {calibers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="rt-label">Recipe (optional)</label>
              {recipesProp.length === 0 ? (
                <div className="text-[11px] text-steel-500 bg-steel-800/40 border border-dashed border-steel-600/60 rounded-xl px-3 py-1.5">No recipes found.</div>
              ) : (
                <select className={inputClass} value={selectedRecipeId} onChange={handleRecipeSelect}>
                  <option value="">Select a recipe...</option>
                  {recipesForCaliber.map(r => <option key={r.id} value={r.id}>{r.name}{r.caliber ? ` • ${r.caliber}` : ''}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-steel-700/80">
            <div><label className="rt-label">Charge weight (gr)</label><input type="number" className={inputClass} value={chargeGrains} onChange={e => setChargeGrains(e.target.value)} min="0" step="0.01" /></div>
            <div><label className="rt-label">Lot size (rounds)</label><input type="number" className={inputClass} value={lotSize} onChange={e => setLotSize(e.target.value)} min="0" /></div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-steel-700/80">
            <div><label className="rt-label">Powder lot</label><select className={inputClass} value={powderId} onChange={e => setPowderId(e.target.value)}><option value="">Select powder...</option>{powderLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>
            <div><label className="rt-label">Bullet lot</label><select className={inputClass} value={bulletId} onChange={e => setBulletId(e.target.value)}><option value="">Select bullet...</option>{bulletLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>
            <div><label className="rt-label">Primer lot</label><select className={inputClass} value={primerId} onChange={e => setPrimerId(e.target.value)}><option value="">Select primer...</option>{primerLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>
            <div><label className="rt-label">Brass lot</label><select className={inputClass} value={caseId} onChange={e => setCaseId(e.target.value)}><option value="">Select brass...</option>{caseLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>
          </div>

          <div className="pt-4 border-t border-steel-700/80">
            <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-1 flex items-center gap-1"><DollarSign size={12} /> Compare vs Factory Ammo</label>
            <div className="grid grid-cols-2 gap-3">
              <select className={inputClass + ' border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/50'} value={selectedFactoryId} onChange={e => setSelectedFactoryId(e.target.value)} disabled={factoryOptions.length === 0}>
                <option value="">{factoryOptions.length === 0 ? 'No tracked prices' : 'Quick Fill from Market'}</option>
                {factoryOptions.map(m => <option key={m.id} value={m.id}>{m.name} (${(m.price / m.qty_per_unit).toFixed(2)})</option>)}
              </select>
              <input type="number" step="0.01" className={inputClass + ' border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/50'} placeholder="Or enter $ per round..." value={manualFactoryCost} onChange={e => { setManualFactoryCost(e.target.value); setSelectedFactoryId('') }} />
            </div>
            <p className="text-[9px] text-steel-500 mt-1">Select a tracked item OR type a price manually to calculate ROI.</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-steel-700/80 mt-4">
            <p className="text-[11px] text-steel-500 min-w-0 mr-2">Save this setup to compare later.</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span onClick={handleSaveScenario} className="rt-btn rt-btn-confirm">+ Save config</span>
            </div>
          </div>

          {scenarios.length > 0 && (
            <div className="border-t border-red-500/20 pt-4 space-y-2">
              <p className="rt-section-eyebrow mb-2">SAVED CONFIGURATIONS</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {scenarios.map(s => (
                  <div key={s.id} className="rt-card flex items-center justify-between px-3 py-2 text-[11px] text-steel-300">
                    <div>
                      <div className="font-semibold text-steel-100">{s.name}</div>
                      <div className="text-steel-400">{toStandardMoney(s.cost.perRound)} /rnd</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span onClick={() => handleDeleteScenario(s.id)} className="rt-btn rt-btn-danger">Remove</span>
                      <span onClick={() => handleSaveScenarioAsRecipe(s)} className="rt-btn rt-btn-confirm disabled:opacity-50">{savingRecipeId === s.id ? 'Saving…' : 'Save recipe'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: results */}
        <CostResults
          breakdown={breakdown}
          roiStats={roiStats}
          lotSize={lotSize}
          activeRecipe={activeRecipe}
          activeRecipeLabel={activeRecipeLabel}
          capacity={capacity}
        />
      </div>
    </div>
  )
}

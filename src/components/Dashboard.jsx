//===============================================================
//Script Name: Dashboard.jsx
//Script Location: src/components/Dashboard.jsx
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 4.5.0
//About: Live Round Calculator + ROI Engine.
//       - FIX: Removed 'Brass Reuse' UI.
//       - FIX: Clarified ROI Multiplier label.
//===============================================================

import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, getAllRecipes, saveRecipe } from '../lib/db'
import { getMarketListings } from '../lib/market'
import { 
  calculateCostPerUnit, 
  calculatePowderCostPerRound, 
  calculateBrassCostPerRound,
  convertToGrains
} from '../lib/math'
import { Info, AlertTriangle, X, TrendingUp, DollarSign, TrendingDown } from 'lucide-react'

// FORMATTER: 4 Decimals (For single primers, powder grains, per-round cost)
const toPrecisionMoney = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(val || 0)
}

// FORMATTER: 2 Decimals (For totals, boxes, human reading)
const toStandardMoney = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)
}

export default function Dashboard({ purchases = [], selectedRecipe, onSelectRecipe }) {
  const [chargeGrains, setChargeGrains] = useState('')
  const [lotSize, setLotSize] = useState(1000)
  const [caseReuse, setCaseReuse] = useState(5) // Default kept for math, but UI hidden
  const [caliber, setCaliber] = useState('9mm')
  
  const [recipes, setRecipes] = useState([])
  const [marketItems, setMarketItems] = useState([]) 
  const [selectedFactoryId, setSelectedFactoryId] = useState('')

  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [scenarios, setScenarios] = useState([])
  const [savingRecipeId, setSavingRecipeId] = useState(null)
  
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [rData, mData] = await Promise.all([getAllRecipes(), getMarketListings().catch(()=>[])])
        setRecipes(rData)
        setMarketItems(mData)
      } catch (err) {
        console.error("Dashboard Load Error:", err)
        setError("Could not load recipes. Check connection.")
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedRecipe) {
      setSelectedRecipeId(String(selectedRecipe.id || ''))
      if (selectedRecipe.caliber) setCaliber(selectedRecipe.caliber)
      if (selectedRecipe.chargeGrains) setChargeGrains(String(selectedRecipe.chargeGrains))
      if (selectedRecipe.brassReuse) setCaseReuse(Number(selectedRecipe.brassReuse) || 1)
      if (selectedRecipe.lotSize) setLotSize(Number(selectedRecipe.lotSize) || 0)
    }
  }, [selectedRecipe])

  const filterByCaliber = (p) => !caliber || !p.caliber || p.caliber === caliber
  const activeOnly = (p) => p.status !== 'depleted'

  const powderLots = purchases.filter(p => p.componentType === 'powder' && activeOnly(p) && filterByCaliber(p))
  const bulletLots = purchases.filter(p => p.componentType === 'bullet' && activeOnly(p) && filterByCaliber(p))
  const primerLots = purchases.filter(p => p.componentType === 'primer' && activeOnly(p) && filterByCaliber(p))
  const caseLots = purchases.filter(p => p.componentType === 'case' && activeOnly(p) && filterByCaliber(p))

  const [powderId, setPowderId] = useState('')
  const [bulletId, setBulletId] = useState('')
  const [primerId, setPrimerId] = useState('')
  const [caseId, setCaseId] = useState('')

  const findById = (id, lots) => lots.find(l => String(l.id) === String(id)) || null

  useEffect(() => {
    if (!caliber || recipes.length === 0) return
    const current = recipes.find(r => String(r.id) === selectedRecipeId)
    if (current && current.caliber && current.caliber !== caliber) setSelectedRecipeId('')
    if (!selectedRecipeId) {
      const firstForCaliber = recipes.find(r => r.caliber === caliber)
      if (firstForCaliber) {
        setSelectedRecipeId(String(firstForCaliber.id))
        if (onSelectRecipe) onSelectRecipe(firstForCaliber)
      }
    }
  }, [caliber, recipes, selectedRecipeId, onSelectRecipe])

  const activeRecipe = selectedRecipe || recipes.find(r => String(r.id) === String(selectedRecipeId)) || null
  const activeRecipeLabel = activeRecipe ? `${activeRecipe.name}${activeRecipe.caliber ? ` • ${activeRecipe.caliber}` : ''}` : ''

  const factoryOptions = useMemo(() => {
      return marketItems.filter(m => (m.category === 'ammo' || m.category === 'other') && m.price > 0)
  }, [marketItems])

  useEffect(() => {
    if (!caliber && recipes.length > 0 && !selectedRecipeId) {
      const firstWithCaliber = recipes.find(r => r.caliber)
      if (firstWithCaliber) setCaliber(firstWithCaliber.caliber)
    }
    const ensureSelection = (currentId, lots, setter) => {
      if (currentId && lots.some(l => String(l.id) === String(currentId))) return
      if (!lots.length) { setter(''); return }
      if (activeRecipe) {
        const match = lots.find(l => 
          (activeRecipe.powderBrand && l.brand && l.brand.toLowerCase() === activeRecipe.powderBrand.toLowerCase()) ||
          (activeRecipe.bulletBrand && l.brand && l.brand.toLowerCase() === activeRecipe.bulletBrand.toLowerCase())
        )
        if (match) { setter(String(match.id)); return }
      }
      setter(String(lots[0].id))
    }
    ensureSelection(powderId, powderLots, setPowderId)
    ensureSelection(bulletId, bulletLots, setBulletId)
    ensureSelection(primerId, primerLots, setPrimerId)
    ensureSelection(caseId, caseLots, setCaseId)
  }, [caliber, activeRecipe, powderLots, bulletLots, primerLots, caseLots])

  const breakdown = useMemo(() => {
    if (!purchases.length) return null
    const powder = findById(powderId, powderLots)
    const bullet = findById(bulletId, bulletLots)
    const primer = findById(primerId, primerLots)
    const brass = findById(caseId, caseLots)
    const numericCharge = Number(chargeGrains) || 0
    const numericLotSize = Number(lotSize) || 0
    const numericReuse = Number(caseReuse) || 1

    const powderPerRound = calculatePowderCostPerRound(powder, numericCharge)
    const bulletPerRound = bullet ? calculateCostPerUnit(bullet.price, bullet.shipping, bullet.tax, bullet.qty) : 0
    const primerPerRound = primer ? calculateCostPerUnit(primer.price, primer.shipping, primer.tax, primer.qty) : 0
    const brassPerRound = calculateBrassCostPerRound(brass, numericReuse)
    const totalPerRound = powderPerRound + bulletPerRound + primerPerRound + brassPerRound

    return {
      powder: { perRound: powderPerRound },
      bullet: { perRound: bulletPerRound },
      primer: { perRound: primerPerRound },
      brass: { perRound: brassPerRound },
      total: {
        perRound: totalPerRound,
        per50: totalPerRound * 50,
        per100: totalPerRound * 100,
        per1000: totalPerRound * 1000,
        lot: totalPerRound * (numericLotSize || 0),
      },
    }
  }, [purchases.length, powderId, bulletId, primerId, caseId, powderLots, bulletLots, primerLots, caseLots, chargeGrains, lotSize, caseReuse])

  // --- ROI CALCULATION ---
  const roiStats = useMemo(() => {
      if (!breakdown || !selectedFactoryId) return null
      const factoryItem = marketItems.find(m => String(m.id) === selectedFactoryId)
      if (!factoryItem) return null

      const factoryCostPerRound = factoryItem.qty_per_unit > 0 ? (factoryItem.price / factoryItem.qty_per_unit) : 0
      const handloadCost = breakdown.total.perRound
      
      const diff = factoryCostPerRound - handloadCost
      const isSavings = diff >= 0
      
      let label = ''
      
      if (isSavings) {
          const percent = factoryCostPerRound > 0 ? (Math.abs(diff) / factoryCostPerRound) * 100 : 0
          label = `${percent.toFixed(0)}%`
      } else {
          // Changed "x" to "x Cost" for clarity
          const multiplier = factoryCostPerRound > 0 ? (handloadCost / factoryCostPerRound) : 0
          label = `${multiplier.toFixed(1)}x Cost`
      }
      
      return {
          factoryCost: factoryCostPerRound,
          diff: Math.abs(diff),
          label: label,
          isSavings,
          name: factoryItem.name
      }
  }, [breakdown, selectedFactoryId, marketItems])

  const capacity = useMemo(() => {
    if (!activeRecipe || !purchases.length) return null
    const numericCharge = Number(chargeGrains) || 0
    if (!numericCharge) return { needsCharge: true }
    const powder = findById(powderId, powderLots)
    const bullet = findById(bulletId, bulletLots)
    const primer = findById(primerId, primerLots)
    const brass = findById(caseId, caseLots)
    const powderTotalGrains = powder ? convertToGrains(powder.qty, powder.unit) : 0
    const powderRounds = numericCharge > 0 ? powderTotalGrains / numericCharge : 0
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
    const limiting = nonZero.reduce((min, c) => c.value < min.value ? c : min)
    return {
      powderRounds: Math.floor(powderRounds),
      bulletRounds,
      primerRounds,
      brassRounds,
      limiting,
      roundsPossible: limiting.value,
      needsCharge: false,
    }
  }, [activeRecipe, purchases.length, powderId, bulletId, primerId, caseId, powderLots, bulletLots, primerLots, caseLots, chargeGrains, caseReuse])

  const headerRounds = activeRecipe && capacity && !capacity.needsCharge ? (typeof capacity.roundsPossible === 'number' ? capacity.roundsPossible : 0) : null
  
  function handleSaveScenario() {
    if (!breakdown || !breakdown.total || !breakdown.total.perRound) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const name = activeRecipe ? activeRecipe.name : `Manual - ${caliber || 'Unknown'}`
    setScenarios(prev => [{ id, name, caliber, chargeGrains: Number(chargeGrains)||0, lotSize: Number(lotSize)||0, caseReuse: Number(caseReuse)||1, cost: { perRound: breakdown.total.perRound } }, ...prev])
  }

  function handleDeleteScenario(id) { setScenarios(prev => prev.filter(s => s.id !== id)) }

  async function handleSaveScenarioAsRecipe(scenario) {
    setSavingRecipeId(scenario.id)
    setError(null)
    try {
      await saveRecipe({
        name: scenario.name || `Saved config`,
        caliber: scenario.caliber || '',
        profileType: 'custom',
        chargeGrains: scenario.chargeGrains || 0,
        brassReuse: scenario.caseReuse || 1,
        lotSize: scenario.lotSize || 0,
        notes: 'Saved from Live Round Calculator config.',
      })
      const data = await getAllRecipes()
      setRecipes(data)
    } catch (err) {
      setError(`Failed to save recipe: ${err.message}`)
    } finally { setSavingRecipeId(null) }
  }

  const inputClass = 'w-full bg-black/60 border border-slate-700/70 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/60'
  const renderOptionLabel = p => `${p.lotId || 'LOT'} — ${p.brand || 'Unknown'}${p.name ? ` • ${p.name}` : ''} (${p.qty} ${p.unit}, ${toPrecisionMoney(calculateCostPerUnit(p.price, p.shipping, p.tax, p.qty))}/unit)`
  const calibers = Array.from(new Set(recipes.map(r => r.caliber).filter(c => c && c.trim().length > 0))).sort()
  const recipesForCaliber = recipes.filter(r => { if (!caliber) return true; if (!r.caliber) return true; return r.caliber === caliber })
  const hasBallistics = !!activeRecipe && (activeRecipe.bulletWeightGr || activeRecipe.muzzleVelocityFps || activeRecipe.zeroDistanceYards || activeRecipe.groupSizeInches)
  
  function handleRecipeSelect(e) {
    const id = e.target.value
    setSelectedRecipeId(id)
    const recipe = recipes.find(r => String(r.id) === id)
    if (recipe && onSelectRecipe) onSelectRecipe(recipe)
  }
  
  const saveConfigButtonClass = 'px-2 py-[2px] rounded-full bg-black/60 border border-emerald-400/70 text-emerald-300 hover:bg-emerald-900/40 transition text-[11px] cursor-pointer'
  const removeButtonClass = 'px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-300 hover:bg-red-900/40 transition text-[11px] cursor-pointer'
  const saveRecipeButtonClass = 'px-2 py-[2px] rounded-full bg-black/60 border border-emerald-400/70 text-emerald-300 hover:bg-emerald-900/40 transition text-[11px] cursor-pointer disabled:opacity-50'

  return (
    <div className="space-y-6">
      {/* MAIN HEADER */}
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Live Round</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">CALCULATOR</h2>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
            <div className="flex-1">
                <p className="text-xs font-bold text-red-400">System Notification</p>
                <p className="text-xs text-red-200/80">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16}/></button>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 items-start">
        {/* LEFT COLUMN: INPUTS */}
        <div className="glass rounded-2xl p-6 space-y-6">
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Caliber</label>
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">Recipe (optional)</label>
              {recipes.length === 0 ? (
                <div className="text-[11px] text-slate-500 bg-slate-900/40 border border-dashed border-slate-700/60 rounded-xl px-3 py-1.5">No recipes found.</div>
              ) : (
                <select className={inputClass} value={selectedRecipeId} onChange={handleRecipeSelect}>
                  <option value="">Select a recipe...</option>
                  {recipesForCaliber.map(r => <option key={r.id} value={r.id}>{r.name}{r.caliber ? ` • ${r.caliber}` : ''}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Inputs Group 2 */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Charge weight (gr)</label>
              <input type="number" className={inputClass} value={chargeGrains} onChange={e => setChargeGrains(e.target.value)} min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Lot size (rounds)</label>
              <input type="number" className={inputClass} value={lotSize} onChange={e => setLotSize(e.target.value)} min="0" />
            </div>
          </div>

          {/* Inputs Group 3 */}
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Powder lot</label>
              <select className={inputClass} value={powderId} onChange={e => setPowderId(e.target.value)}>
                <option value="">Select powder...</option>
                {powderLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Bullet lot</label>
              <select className={inputClass} value={bulletId} onChange={e => setBulletId(e.target.value)}>
                <option value="">Select bullet...</option>
                {bulletLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Primer lot</label>
              <select className={inputClass} value={primerId} onChange={e => setPrimerId(e.target.value)}>
                <option value="">Select primer...</option>
                {primerLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Brass lot</label>
              <select className={inputClass} value={caseId} onChange={e => setCaseId(e.target.value)}>
                <option value="">Select brass...</option>
                {caseLots.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
             <label className="block text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1"><DollarSign size={12}/> Compare vs Factory Ammo</label>
             <select 
                className={inputClass + " border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/50"} 
                value={selectedFactoryId} 
                onChange={e => setSelectedFactoryId(e.target.value)}
                disabled={factoryOptions.length === 0}
             >
                <option value="">{factoryOptions.length === 0 ? "No ammo in Supply Chain" : "Select Factory Load..."}</option>
                {factoryOptions.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - {toStandardMoney(m.price / m.qty_per_unit)}/rd</option>
                ))}
             </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-4">
            <p className="text-[11px] text-slate-500 min-w-0 mr-2">Save this setup to compare later.</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span onClick={handleSaveScenario} className={saveConfigButtonClass}>+ Save config</span>
            </div>
          </div>

          {scenarios.length > 0 && (
            <div className="border-t border-red-500/20 pt-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">SAVED CONFIGURATIONS</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {scenarios.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-2 text-[11px] text-slate-300">
                    <div>
                      <div className="font-semibold text-slate-100">{s.name}</div>
                      <div className="text-slate-400">{toStandardMoney(s.cost.perRound)} /rnd</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span onClick={() => handleDeleteScenario(s.id)} className={removeButtonClass}>Remove</span>
                      <span onClick={() => handleSaveScenarioAsRecipe(s)} className={saveRecipeButtonClass}>{savingRecipeId === s.id ? 'Saving…' : 'Save recipe'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: BREAKDOWN & STATS */}
        <div className="space-y-6">
          
          {activeRecipe && (
              <div className="bg-black/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl rounded-full"></div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">Loadout Profile</p>
                  
                  <div className="mb-4">
                      <h3 className="text-xl font-bold text-white">{activeRecipeLabel}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                      {headerRounds !== null && (
                          <div className="bg-black/40 rounded-xl p-3 border border-slate-800/60">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Capacity</p>
                              <p className="text-2xl font-black text-slate-100">{headerRounds.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-600">Rounds possible</p>
                          </div>
                      )}
                      
                      {hasBallistics && (
                          <div className="bg-black/40 rounded-xl p-3 border border-slate-800/60">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Ballistics</p>
                              <div className="text-xs text-slate-300 space-y-0.5 mt-1">
                                  {activeRecipe.bulletWeightGr && <div>{activeRecipe.bulletWeightGr} gr</div>}
                                  {activeRecipe.muzzleVelocityFps && <div>{activeRecipe.muzzleVelocityFps} fps</div>}
                                  {activeRecipe.zeroDistanceYards && <div>{activeRecipe.zeroDistanceYards} yd Zero</div>}
                              </div>
                          </div>
                      )}
                  </div>

                  {capacity && capacity.limiting && (
                       <div className="mt-3 text-[10px] text-red-400/80 bg-red-900/10 px-3 py-2 rounded-lg border border-red-900/30">
                           Limited by <strong>{capacity.limiting.label}</strong>
                       </div>
                  )}
              </div>
          )}

          {/* 2. COST CARD */}
          <div className="glass rounded-2xl p-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                   <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Cost Analysis</p>
                   <div className="group relative">
                       <Info size={14} className="text-slate-600 hover:text-slate-400 cursor-help"/>
                       <div className="absolute right-0 bottom-6 w-48 bg-black border border-slate-700 p-2 rounded text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                           Exact: {toPrecisionMoney(breakdown?.total.perRound || 0)} / round
                       </div>
                   </div>
              </div>
              
              <div className="flex items-end justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
                <div>
                  <p className="text-sm text-slate-400">Per round</p>
                  <p className="text-5xl font-black text-emerald-400 tracking-tight">
                      {toStandardMoney(breakdown?.total.perRound)}
                  </p>
                </div>
              </div>
              
              {/* ROI GAUGE */}
              {roiStats && (
                  <div className={`mb-6 p-4 rounded-xl border relative overflow-hidden ${roiStats.isSavings ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                      <div className={`absolute -right-4 -top-4 w-20 h-20 blur-2xl rounded-full ${roiStats.isSavings ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}></div>
                      <div className="flex justify-between items-start mb-2 relative z-10">
                          <div className="flex-1 min-w-0 pr-4">
                              <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${roiStats.isSavings ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {roiStats.isSavings ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                  {roiStats.isSavings ? ' Value Created' : ' Cost Increase'}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-tight" title={roiStats.name}>{roiStats.name}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                              <p className="text-2xl font-black text-white leading-none">{roiStats.label}</p>
                              <p className={`text-[9px] ${roiStats.isSavings ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {roiStats.isSavings ? 'Savings' : 'Multiplier'}
                              </p>
                          </div>
                      </div>
                      <div className={`text-sm border-t pt-2 mt-2 ${roiStats.isSavings ? 'text-emerald-200/80 border-emerald-500/20' : 'text-red-200/80 border-red-500/20'}`}>
                          {roiStats.isSavings ? 'Save ' : 'Spend '} 
                          {/* FIX: Use 2-decimal formatter */}
                          <span className="font-bold text-white">{toStandardMoney(roiStats.diff)}</span> 
                          {roiStats.isSavings ? ' every time you pull the trigger.' : ' more per shot than factory.'}
                      </div>
                  </div>
              )}

              {/* COST TABLE (2 Decimals for Clean Look) */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                    <span>Per 50</span>
                    <span className="font-semibold text-slate-200">{toStandardMoney(breakdown?.total.per50)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                    <span>Per 100</span>
                    <span className="font-semibold text-slate-200">{toStandardMoney(breakdown?.total.per100)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                    <span>Per 1,000</span>
                    <span className="font-semibold text-slate-200">{toStandardMoney(breakdown?.total.per1000)}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2 mt-2">
                    <span>Cost for {lotSize.toLocaleString()} rounds</span>
                    <span className="font-bold text-emerald-500">{toStandardMoney(breakdown?.total.lot)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. COMPONENT BREAKDOWN (3-4 Decimals for Precision) */}
          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">Components (Unit Cost)</p>
            <div className="grid grid-cols-2 gap-3">
              <BreakdownRow label="Powder" value={breakdown?.powder.perRound} />
              <BreakdownRow label="Bullet" value={breakdown?.bullet.perRound} />
              <BreakdownRow label="Primer" value={breakdown?.primer.perRound} />
              <BreakdownRow label="Brass" value={breakdown?.brass.perRound} />
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
      <span className="text-slate-400 text-xs">{label}</span>
      {/* Use Precision Money here (3-4 decimals) because $0.035 matters for primers */}
      <span className="font-semibold text-slate-100 text-xs" title={toPrecisionMoney(value)}>{toPrecisionMoney(value)}</span>
    </div>
  )
}
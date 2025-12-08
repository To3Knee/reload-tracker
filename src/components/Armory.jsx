//===============================================================
//Script Name: Armory.jsx
//Script Location: src/components/Armory.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.6.0
//About: The Digital Armory. 
//       - FIX: Solved "Gear Not Attaching" bug (Type Mismatch).
//===============================================================

import { useEffect, useState } from 'react'
import { getFirearms, saveFirearm, deleteFirearm } from '../lib/armory'
import { getGear } from '../lib/gear'
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, Crosshair, Info, User, Box, Wand2, Loader2, Link, X } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import UploadButton from './UploadButton'
import { GearLocker } from './GearLocker'

const PLATFORMS = [
    { value: 'bolt', label: 'Bolt Action Rifle' },
    { value: 'ar15', label: 'AR / Modern Sporting' },
    { value: 'pistol', label: 'Pistol / Handgun' },
    { value: 'lever', label: 'Lever Action' },
    { value: 'other', label: 'Other / Custom' }
]

export function Armory({ canEdit }) {
  const [activeSubTab, setActiveSubTab] = useState('firearms')
  const [guns, setGuns] = useState([])
  const [gear, setGear] = useState([]) 
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [verifyDeleteId, setVerifyDeleteId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  
  // Scraper State
  const [scraping, setScraping] = useState(false)
  const [scrapeUrl, setScrapeUrl] = useState('')

  const DEFAULT_FORM = {
    name: '', platform: 'bolt', caliber: '', manufacturer: '', model: '', 
    roundCount: 0, imageUrl: '',
    twistRate: '', barrelLength: '', optic: '', opticHeight: '', trigger: '', notes: '',
    gearIds: [] 
  }
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
        const [gData, gearData] = await Promise.all([getFirearms(), getGear()])
        setGuns(gData)
        setGear(gearData)
    } catch(e) { console.error(e) }
  }

  // --- SMART AUTO-FILL ENGINE ---
  async function handleAutoFill() {
      if (!scrapeUrl) return alert("Enter a URL first.")
      setScraping(true)
      try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
          const res = await fetch(`${API_BASE}/scrape?url=${encodeURIComponent(scrapeUrl)}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.message)
          
          setForm(prev => {
              let smartName = data.title
              if (data.brand && data.specs?.model) {
                  smartName = `${data.brand} ${data.specs.model}`
                  if (data.caliber) smartName += ` ${data.caliber}`
              } else if (data.title && data.title.length > 40) {
                   smartName = data.title.split(' ').slice(0, 4).join(' ')
              }

              return {
                  ...prev,
                  name: smartName || prev.name,
                  manufacturer: data.brand || prev.manufacturer,
                  model: data.specs?.model || prev.model,
                  caliber: data.caliber || prev.caliber,
                  imageUrl: data.image || prev.imageUrl,
                  twistRate: data.specs?.twist || prev.twistRate,
                  barrelLength: data.specs?.barrel || prev.barrelLength,
                  trigger: data.specs?.trigger || prev.trigger,
              }
          })
          HAPTIC.success()
      } catch (err) { alert("Scrape failed: " + err.message) }
      finally { setScraping(false) }
  }

  function handleAddNew() { setEditingId(null); setForm(DEFAULT_FORM); setIsFormOpen(true); HAPTIC.click(); }
  
  function handleEdit(gun) { 
      setEditingId(gun.id); 
      // Ensure gearIds is always an array of Numbers
      const safeGearIds = (gun.gearIds || []).map(id => Number(id));
      
      setForm({ 
          name: gun.name, platform: gun.platform, caliber: gun.caliber||'', manufacturer: gun.manufacturer||'', model: gun.model||'', 
          roundCount: gun.roundCount||0, imageUrl: gun.imageUrl||'', 
          twistRate: gun.specs?.twistRate||'', barrelLength: gun.specs?.barrelLength||'', optic: gun.specs?.optic||'', opticHeight: gun.specs?.opticHeight||'', trigger: gun.specs?.trigger||'', notes: gun.specs?.notes||'',
          gearIds: safeGearIds
      }); 
      setIsFormOpen(true); 
      HAPTIC.click(); 
  }

  // Add Gear to List
  function addGear(id) {
      if (!id) return
      const numericId = Number(id)
      
      setForm(prev => {
          if (prev.gearIds.includes(numericId)) return prev
          return { ...prev, gearIds: [...prev.gearIds, numericId] }
      })
      HAPTIC.click()
  }

  // Remove Gear from List
  function removeGear(id) {
      const numericId = Number(id)
      setForm(prev => ({ ...prev, gearIds: prev.gearIds.filter(g => g !== numericId) }))
      HAPTIC.soft()
  }

  async function handleSubmit(e) { e.preventDefault(); setLoading(true); try { const payload = { id: editingId, name: form.name, platform: form.platform, caliber: form.caliber, manufacturer: form.manufacturer, model: form.model, roundCount: form.roundCount, imageUrl: form.imageUrl, specs: { twistRate: form.twistRate, barrelLength: form.barrelLength, optic: form.optic, opticHeight: form.opticHeight, trigger: form.trigger, notes: form.notes }, gearIds: form.gearIds }; await saveFirearm(payload); setIsFormOpen(false); HAPTIC.success(); loadData(); } catch (err) { alert(err.message); } finally { setLoading(false); } }
  async function handleDelete(id) { setVerifyDeleteId(null); HAPTIC.error(); await deleteFirearm(id); loadData(); }
  const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); HAPTIC.soft(); }

  const inputClass = "w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 placeholder:text-slate-600"
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1"
  const tabBtnClass = (active) => `flex-1 py-2 text-xs font-bold uppercase tracking-wider transition ${active ? 'bg-slate-800 text-white border-b-2 border-red-500' : 'text-slate-500 hover:text-slate-300'}`

  // Safe Filtering: Compare IDs as Strings to avoid Type Mismatches
  const availableGear = gear.filter(g => !form.gearIds.some(fid => String(fid) === String(g.id)))
  const selectedGear = gear.filter(g => form.gearIds.some(fid => String(fid) === String(g.id)))

  return (
    <div className="space-y-6">
       <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Asset Management</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">THE ARMORY</h2>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex border-b border-slate-800">
          <button onClick={() => setActiveSubTab('firearms')} className={tabBtnClass(activeSubTab === 'firearms')}>
              <Crosshair size={14} className="inline mr-2 mb-0.5"/>Firearms
          </button>
          <button onClick={() => setActiveSubTab('gear')} className={tabBtnClass(activeSubTab === 'gear')}>
              <Box size={14} className="inline mr-2 mb-0.5"/>Gear Locker
          </button>
      </div>

      {activeSubTab === 'gear' ? (
          <GearLocker />
      ) : (
          <>
            <div className="flex justify-end">
                {canEdit && !isFormOpen && (
                    <button onClick={handleAddNew} className="px-4 py-2 rounded-full bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 hover:bg-red-600 transition">
                        <Plus size={14} /> Add Firearm
                    </button>
                )}
            </div>

            {isFormOpen && (
                <div className="glass rounded-2xl p-6 border border-red-500/30 animation-fade-in">
                    <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-widest border-b border-slate-800 pb-2">
                        {editingId ? 'Modify Specs' : 'New Acquisition'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* URL AUTO-FILL */}
                        <div>
                            <label className={labelClass}>Product Link (Auto-Fill)</label>
                            <div className="flex gap-2">
                                <input className={inputClass} value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="Paste URL..." />
                                <button type="button" onClick={handleAutoFill} disabled={scraping || !scrapeUrl} className="px-3 rounded-xl bg-purple-900/30 border border-purple-500/50 text-purple-300 hover:bg-purple-900/50 transition flex items-center gap-2 disabled:opacity-50">
                                    {scraping ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Nickname / ID</label><input className={inputClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. 'The Deer Rifle'" required /></div>
                            <div><label className={labelClass}>Platform</label><select className={inputClass} value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>{PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div><label className={labelClass}>Caliber</label><input className={inputClass} value={form.caliber} onChange={e => setForm({...form, caliber: e.target.value})} placeholder="e.g. 6.5 CM" /></div>
                            <div><label className={labelClass}>Manufacturer</label><input className={inputClass} value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} placeholder="e.g. Tikka" /></div>
                            <div><label className={labelClass}>Model</label><input className={inputClass} value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="e.g. T3x" /></div>
                        </div>

                        <div className="bg-black/20 rounded-xl p-3 border border-slate-800 flex flex-col justify-between">
                            <label className={labelClass}>Reference Photo</label>
                            <div className="flex-1 flex flex-col justify-center">
                                <UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} />
                            </div>
                        </div>
                        
                        {/* GEAR LINKING SECTION (IMPROVED) */}
                        <div className="bg-black/20 rounded-xl p-3 border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <label className={labelClass}><Link size={12} className="inline mr-1"/> Attached Gear</label>
                                <span className="text-[9px] text-slate-500">{selectedGear.length} Items</span>
                            </div>
                            
                            <div className="mb-3">
                                <select 
                                    className={inputClass} 
                                    onChange={(e) => { addGear(e.target.value); e.target.value = ''; }}
                                    disabled={availableGear.length === 0}
                                >
                                    <option value="">{availableGear.length === 0 ? 'All gear attached' : 'Select gear to attach...'}</option>
                                    {availableGear.map(g => (
                                        <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Chips */}
                            {selectedGear.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedGear.map(g => (
                                        <div key={g.id} className="flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] shadow-sm animate-in fade-in zoom-in duration-200">
                                            <span>{g.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => removeGear(g.id)}
                                                className="text-zinc-500 hover:text-red-400 transition"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[10px] text-zinc-600 italic text-center py-2">No gear linked. Select items above.</div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-800/50">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Technical Specifications</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><label className={labelClass}>Twist Rate</label><input className={inputClass} value={form.twistRate} onChange={e => setForm({...form, twistRate: e.target.value})} placeholder="1:8" /></div>
                                <div><label className={labelClass}>Barrel Len (in)</label><input className={inputClass} value={form.barrelLength} onChange={e => setForm({...form, barrelLength: e.target.value})} placeholder='24"' /></div>
                                <div><label className={labelClass}>Current Odometer</label><input type="number" className={inputClass} value={form.roundCount} onChange={e => setForm({...form, roundCount: e.target.value})} /></div>
                                <div><label className={labelClass}>Trigger Weight</label><input className={inputClass} value={form.trigger} onChange={e => setForm({...form, trigger: e.target.value})} placeholder="1.5 lbs" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div><label className={labelClass}>Optic / Scope</label><input className={inputClass} value={form.optic} onChange={e => setForm({...form, optic: e.target.value})} placeholder="e.g. Vortex Viper 5-25x" /></div>
                                <div><label className={labelClass}>Build Notes</label><input className={inputClass} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Muzzle brake, bedding, etc." /></div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800/60 text-xs font-bold transition">Cancel</button>
                            <button type="submit" disabled={loading} className="px-6 py-2 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition">{loading ? 'Saving...' : 'Save to Armory'}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass rounded-2xl p-6">
                {guns.length === 0 && !isFormOpen && (
                    <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl">
                        <Crosshair className="mx-auto text-slate-700 mb-3" size={48} />
                        <p className="text-slate-500 text-sm">The Armory is empty.</p>
                    </div>
                )}
                
                <div className="space-y-3">
                    {guns.map((gun, idx) => {
                        const isExpanded = expandedId === gun.id
                        // Filter for display
                        const linkedGear = gear.filter(g => gun.gearIds && gun.gearIds.map(String).includes(String(g.id)))
                        
                        return (
                            <div key={gun.id} className={`bg-black/40 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-800 hover:border-slate-700'}`}>
                                <div onClick={() => toggleExpand(gun.id)} className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer select-none gap-4 md:gap-0">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpanded ? 'bg-red-900/20 text-red-500 border border-red-900/50' : 'bg-slate-800 text-slate-500'}`}>
                                            <Crosshair size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-200 truncate">{gun.name}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{gun.caliber || 'N/A'} • {gun.manufacturer} {gun.model}</p>
                                                {linkedGear.length > 0 && (
                                                    <div className="flex -space-x-1">
                                                        {linkedGear.slice(0, 3).map(g => (
                                                            <div key={g.id} className="w-4 h-4 rounded-full bg-slate-700 border border-black flex items-center justify-center text-[8px] text-white" title={g.name}>{g.name[0]}</div>
                                                        ))}
                                                        {linkedGear.length > 3 && <div className="w-4 h-4 rounded-full bg-slate-800 border border-black flex items-center justify-center text-[8px] text-white">+{linkedGear.length - 3}</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 self-end md:self-auto">
                                        <div className="text-right">
                                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Rounds</span>
                                            <span className="block text-xs font-mono font-bold text-emerald-500">{gun.roundCount}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-4 border-t border-slate-800/50 bg-black/20">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {gun.imageUrl && (
                                                <div className="w-full md:w-1/3 max-w-sm flex-shrink-0">
                                                    <div className="rounded-lg overflow-hidden border border-slate-800 bg-black/50 shadow-lg h-48 md:h-full min-h-[160px] relative group">
                                                        <img src={gun.imageUrl} alt={gun.name} className="w-full h-full object-cover" />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4 text-[11px] mb-4">
                                                    <div><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Platform</span><span className="text-slate-300 font-medium">{PLATFORMS.find(p=>p.value===gun.platform)?.label || gun.platform}</span></div>
                                                    <div><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Twist Rate</span><span className="text-slate-300 font-medium">{gun.specs.twistRate || '--'}</span></div>
                                                    <div><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Barrel</span><span className="text-slate-300 font-medium">{gun.specs.barrelLength ? `${gun.specs.barrelLength} in` : '--'}</span></div>
                                                    
                                                    {/* LINKED GEAR (Expanded View) */}
                                                    <div className="col-span-2 md:col-span-3 border-t border-slate-800/50 pt-2 mt-1">
                                                        <span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-1">Attached Gear</span>
                                                        {linkedGear.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {linkedGear.map(g => (
                                                                    <span key={g.id} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] shadow-sm">{g.name}</span>
                                                                ))}
                                                            </div>
                                                        ) : <span className="text-slate-600 italic text-[10px]">None linked.</span>}
                                                    </div>

                                                    <div className="col-span-2 md:col-span-3 pt-2"><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Notes</span><span className="text-slate-400 italic leading-relaxed">{gun.specs.notes || 'No build notes recorded.'}</span></div>
                                                </div>
                                                {canEdit && (
                                                    <div className="flex gap-3 pt-4 mt-auto border-t border-slate-800/50 md:border-none md:pt-0">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(gun); }} className="px-3 py-1.5 rounded-full bg-black/60 border border-slate-700 text-slate-300 text-[10px] hover:text-white hover:bg-slate-800 transition flex items-center gap-1"><Edit size={12}/> Edit Specs</button>
                                                        {verifyDeleteId === gun.id ? (
                                                            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(gun.id); }} className="px-3 py-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition">Confirm Delete</button>
                                                                <button onClick={(e) => { e.stopPropagation(); setVerifyDeleteId(null); }} className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[10px] hover:bg-slate-700 transition">Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={(e) => { e.stopPropagation(); setVerifyDeleteId(gun.id); }} className="px-3 py-1.5 rounded-full bg-black/60 border border-red-900/40 text-red-400 text-[10px] hover:text-red-300 hover:bg-red-900/20 transition flex items-center gap-1"><Trash2 size={12}/> Decommission</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
          </>
      )}
    </div>
  )
}
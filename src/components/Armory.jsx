//===============================================================
//Script Name: Armory.jsx
//Script Location: src/components/Armory.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 1.9.0
//About: The Digital Armory. 
//       Updated: Removed browser popups (iOS/PWA Safe).
//===============================================================

import { useEffect, useState } from 'react'
import { getFirearms, saveFirearm, deleteFirearm } from '../lib/armory'
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, Crosshair, Info, User } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import UploadButton from './UploadButton'

const PLATFORMS = [
    { value: 'bolt', label: 'Bolt Action Rifle' },
    { value: 'ar15', label: 'AR / Modern Sporting' },
    { value: 'pistol', label: 'Pistol / Handgun' },
    { value: 'lever', label: 'Lever Action' },
    { value: 'other', label: 'Other / Custom' }
]

export function Armory({ canEdit }) {
  const [guns, setGuns] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // No-Popup Delete State
  const [verifyDeleteId, setVerifyDeleteId] = useState(null)
  
  const DEFAULT_FORM = {
    name: '', platform: 'bolt', caliber: '', manufacturer: '', model: '', roundCount: 0, imageUrl: '',
    twistRate: '', barrelLength: '', optic: '', opticHeight: '', trigger: '', notes: ''
  }
  const [form, setForm] = useState(DEFAULT_FORM)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
        const data = await getFirearms()
        setGuns(data)
    } catch(e) { console.error(e) }
  }

  function handleAddNew() {
      setEditingId(null)
      setForm(DEFAULT_FORM)
      setIsFormOpen(true)
      HAPTIC.click()
  }

  function handleEdit(gun) {
      setEditingId(gun.id)
      setForm({
          name: gun.name,
          platform: gun.platform,
          caliber: gun.caliber || '',
          manufacturer: gun.manufacturer || '',
          model: gun.model || '',
          roundCount: gun.roundCount || 0,
          imageUrl: gun.imageUrl || '',
          twistRate: gun.specs?.twistRate || '',
          barrelLength: gun.specs?.barrelLength || '',
          optic: gun.specs?.optic || '',
          opticHeight: gun.specs?.opticHeight || '',
          trigger: gun.specs?.trigger || '',
          notes: gun.specs?.notes || ''
      })
      setIsFormOpen(true)
      HAPTIC.click()
  }

  async function handleSubmit(e) {
      e.preventDefault()
      setLoading(true)
      try {
          const payload = {
              id: editingId,
              name: form.name,
              platform: form.platform,
              caliber: form.caliber,
              manufacturer: form.manufacturer,
              model: form.model,
              roundCount: form.roundCount,
              imageUrl: form.imageUrl,
              specs: {
                  twistRate: form.twistRate,
                  barrelLength: form.barrelLength,
                  optic: form.optic,
                  opticHeight: form.opticHeight,
                  trigger: form.trigger,
                  notes: form.notes
              }
          }
          await saveFirearm(payload)
          setIsFormOpen(false)
          HAPTIC.success()
          loadData()
      } catch (err) {
          // Fallback error display if needed, but avoiding alert()
          console.error(err)
      } finally {
          setLoading(false)
      }
  }

  async function handleDelete(id) {
      // Inline Verification Logic
      setVerifyDeleteId(null) // Reset
      HAPTIC.error()
      await deleteFirearm(id)
      loadData()
  }

  const toggleExpand = (id) => {
      setExpandedId(expandedId === id ? null : id)
      HAPTIC.soft()
  }

  const inputClass = "w-full bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 placeholder:text-slate-600"
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1"

  return (
    <div className="space-y-6">
       <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Asset Management</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">THE ARMORY</h2>
        </div>
        <div className="ml-auto flex items-end">
             {canEdit && !isFormOpen && (
                <button onClick={handleAddNew} className="px-4 py-2 rounded-full bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 hover:bg-red-600 transition">
                    <Plus size={14} /> Add Firearm
                </button>
            )}
        </div>
      </div>

      {isFormOpen && (
          <div className="glass rounded-2xl p-6 border border-red-500/30 animation-fade-in">
              <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-widest border-b border-slate-800 pb-2">
                  {editingId ? 'Modify Specs' : 'New Acquisition'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
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

                  <div className="pt-4 border-t border-slate-800/50">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Technical Specifications</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><label className={labelClass} title="Required for stability calculations">Twist Rate <Info size={10} className="text-slate-600"/></label><input className={inputClass} value={form.twistRate} onChange={e => setForm({...form, twistRate: e.target.value})} placeholder="1:8" /></div>
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
                  <p className="text-[10px] text-slate-600 mt-1">Add your first firearm to start tracking barrel life.</p>
              </div>
          )}
          
          <div className="space-y-3">
            {guns.map((gun, idx) => {
                const isExpanded = expandedId === gun.id
                return (
                    <div key={gun.id} className={`bg-black/40 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-800 hover:border-slate-700'}`}>
                        
                        {/* HEADER ROW */}
                        <div onClick={() => toggleExpand(gun.id)} className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer select-none gap-4 md:gap-0">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpanded ? 'bg-red-900/20 text-red-500 border border-red-900/50' : 'bg-slate-800 text-slate-500'}`}>
                                    <Crosshair size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-200 truncate">{gun.name}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                                            {gun.caliber || 'N/A'} • {gun.manufacturer} {gun.model}
                                        </p>
                                        {gun.ownerName && (
                                            <span className="hidden sm:flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                                <User size={10} /> {gun.ownerName}
                                            </span>
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
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                                                <div className="absolute bottom-2 left-3 text-[10px] text-white font-mono uppercase tracking-widest opacity-80">
                                                    {gun.platform}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4 text-[11px] mb-4">
                                            <div><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Platform</span><span className="text-slate-300 font-medium">{PLATFORMS.find(p=>p.value===gun.platform)?.label || gun.platform}</span></div>
                                            <div><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Twist Rate</span><span className="text-slate-300 font-medium">{gun.specs.twistRate || '--'}</span></div>
                                            <div><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Barrel</span><span className="text-slate-300 font-medium">{gun.specs.barrelLength ? `${gun.specs.barrelLength} in` : '--'}</span></div>
                                            <div><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Trigger</span><span className="text-slate-300 font-medium">{gun.specs.trigger || '--'}</span></div>
                                            <div className="col-span-2 md:col-span-2"><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Optic</span><span className="text-slate-300 font-medium">{gun.specs.optic || 'Iron Sights'}</span></div>
                                            <div className="col-span-2 md:col-span-3 border-t border-slate-800/50 pt-2 mt-1"><span className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Notes</span><span className="text-slate-400 italic leading-relaxed">{gun.specs.notes || 'No build notes recorded.'}</span></div>
                                        </div>

                                        {canEdit && (
                                            <div className="flex gap-3 pt-4 mt-auto border-t border-slate-800/50 md:border-none md:pt-0">
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(gun); }} className="px-3 py-1.5 rounded-full bg-black/60 border border-slate-700 text-slate-300 text-[10px] hover:text-white hover:bg-slate-800 transition flex items-center gap-1"><Edit size={12}/> Edit Specs</button>
                                                
                                                {/* SAFE DELETE UI */}
                                                {verifyDeleteId === gun.id ? (
                                                    <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                                        <span className="text-[10px] text-red-400 font-bold">Sure?</span>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(gun.id); }} className="px-3 py-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition">Yes</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setVerifyDeleteId(null); }} className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-[10px] hover:bg-slate-700 transition">No</button>
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
    </div>
  )
}
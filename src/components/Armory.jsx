//===============================================================
//Script Name: Armory.jsx
//Script Location: src/components/Armory.jsx
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 3.0.0 (Data Saving Fix)
//About: The Digital Armory. 
//       - FIX: Ensures Round Count is sent as integer.
//       - FIX: Ensures Specs are mapped correctly.
//===============================================================

import { useEffect, useState, useMemo } from 'react'
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
  const [scraping, setScraping] = useState(false)
  const [scrapeUrl, setScrapeUrl] = useState('')

  const DEFAULT_FORM = {
    name: '', platform: 'bolt', caliber: '', manufacturer: '', model: '', 
    roundCount: 0, imageUrl: '',
    twistRate: '', barrelLength: '', optic: '', opticHeight: '', trigger: '', notes: '',
    gearIds: [] 
  }
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [])

  async function loadData(signal) {
    try {
        const [gData, gearData] = await Promise.all([getFirearms(signal), getGear(signal)])
        setGuns(gData)
        setGear(gearData)
    } catch(e) {
      if (e?.name !== 'AbortError') console.error(e)
    }
  }

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
      const safeGearIds = (gun.gearIds || []).map(id => Number(id)); 
      setForm({ 
          name: gun.name, 
          platform: gun.platform, 
          caliber: gun.caliber||'', 
          manufacturer: gun.manufacturer||'', 
          model: gun.model||'', 
          roundCount: gun.roundCount||0, 
          imageUrl: gun.imageUrl||'', 
          twistRate: gun.specs?.twistRate||'', 
          barrelLength: gun.specs?.barrelLength||'', 
          optic: gun.specs?.optic||'', 
          opticHeight: gun.specs?.opticHeight||'', 
          trigger: gun.specs?.trigger||'', 
          notes: gun.specs?.notes||'', 
          gearIds: safeGearIds 
      }); 
      setIsFormOpen(true); 
      HAPTIC.click(); 
  }

  function addGear(id) { if (!id) return; const numericId = Number(id); setForm(prev => { if (prev.gearIds.includes(numericId)) return prev; return { ...prev, gearIds: [...prev.gearIds, numericId] } }); HAPTIC.click(); }
  function removeGear(id) { const numericId = Number(id); setForm(prev => ({ ...prev, gearIds: prev.gearIds.filter(g => g !== numericId) })); HAPTIC.soft(); }
  
  async function handleSubmit(e) { 
      e.preventDefault(); 
      setLoading(true); 
      try { 
          const payload = { 
              id: editingId, 
              name: form.name, 
              platform: form.platform, 
              caliber: form.caliber, 
              manufacturer: form.manufacturer, 
              model: form.model, 
              roundCount: Number(form.roundCount) || 0, // Ensure Number 
              imageUrl: form.imageUrl, 
              specs: { 
                  twistRate: form.twistRate, 
                  barrelLength: form.barrelLength, 
                  optic: form.optic, 
                  opticHeight: form.opticHeight, 
                  trigger: form.trigger, 
                  notes: form.notes 
              }, 
              gearIds: form.gearIds 
          }; 
          await saveFirearm(payload); 
          setIsFormOpen(false); 
          HAPTIC.success(); 
          loadData(); 
      } catch (err) { alert(err.message); } 
      finally { setLoading(false); } 
  }

  async function handleDelete(id) { setVerifyDeleteId(null); HAPTIC.error(); await deleteFirearm(id); loadData(); }
  const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); HAPTIC.soft(); }

  const inputClass = "rt-input"
  const labelClass = "rt-label flex items-center gap-1"
  const tabBtnClass = (active) => `pb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] transition border-b-2 flex items-center gap-2 ${active ? 'border-[#b87333] text-[#f0ece4]' : 'border-transparent text-[#4a4844] hover:text-[#9a9590]'}`

  const availableGear = useMemo(
    () => gear.filter(g => !form.gearIds.includes(Number(g.id))),
    [gear, form.gearIds]
  )
  const selectedGear = useMemo(
    () => gear.filter(g => form.gearIds.includes(Number(g.id))),
    [gear, form.gearIds]
  )

  return (
    <div className="space-y-6">
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Asset Management</span>
          <h2 className="rt-section-title">THE ARMORY</h2>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex flex-wrap items-end justify-between border-b border-steel-700 gap-4">
          <div className="flex gap-6">
              <button onClick={() => setActiveSubTab('firearms')} className={tabBtnClass(activeSubTab === 'firearms')}><Crosshair size={14} className="inline mr-2 mb-0.5"/>Firearms</button>
              <button onClick={() => setActiveSubTab('gear')} className={tabBtnClass(activeSubTab === 'gear')}><Box size={14} className="inline mr-2 mb-0.5"/>Gear Locker</button>
          </div>

          {activeSubTab === 'firearms' && canEdit && !isFormOpen && (
              <button onClick={handleAddNew} className="mb-2 rt-btn rt-btn-secondary">
                  <Plus size={12} /> New Firearm
              </button>
          )}
      </div>

      {activeSubTab === 'gear' ? (
          <GearLocker />
      ) : (
          <>
            {isFormOpen && (
                <div className="glass p-6 border border-red-500/30 animation-fade-in mb-6">
                    <h3 className="text-sm font-bold text-steel-100 mb-4 uppercase tracking-widest border-b border-steel-700 pb-2">
                        {editingId ? 'Modify Specs' : 'New Acquisition'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className={labelClass}>Product Link (Auto-Fill)</label><div className="flex gap-2"><input className={inputClass} value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="Paste URL..." /><button type="button" onClick={handleAutoFill} disabled={scraping || !scrapeUrl} className="rt-btn border-purple-500/50 bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 hover:text-white disabled:opacity-50">{scraping ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}</button></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={labelClass}>Nickname / ID</label><input className={inputClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. 'The Deer Rifle'" required /></div><div><label className={labelClass}>Platform</label><select className={inputClass} value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>{PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4"><div><label className={labelClass}>Caliber</label><input className={inputClass} value={form.caliber} onChange={e => setForm({...form, caliber: e.target.value})} placeholder="e.g. 6.5 CM" /></div><div><label className={labelClass}>Manufacturer</label><input className={inputClass} value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} placeholder="e.g. Tikka" /></div><div><label className={labelClass}>Model</label><input className={inputClass} value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="e.g. T3x" /></div></div>
                        <div className="rt-card p-3 flex flex-col justify-between"><label className={labelClass}>Reference Photo</label><div className="flex-1 flex flex-col justify-center"><UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} /></div></div>
                        <div className="rt-card p-3"><div className="flex justify-between items-center mb-2"><label className={labelClass}><Link size={12} className="inline mr-1"/> Attached Gear</label><span className="text-[9px] text-steel-400">{selectedGear.length} Items</span></div><div className="mb-3"><select className={inputClass} onChange={(e) => { addGear(e.target.value); e.target.value = ''; }} disabled={availableGear.length === 0}><option value="">{availableGear.length === 0 ? 'All gear attached' : 'Select gear to attach...'}</option>{availableGear.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.type}) {g.ownerName ? ` - ${g.ownerName}` : ''}</option>))}</select></div><div className="flex flex-wrap gap-2">{selectedGear.map(g => (<div key={g.id} className="flex items-center gap-2 px-3 py-1 rounded-md bg-steel-800 border border-steel-600 text-steel-200 text-[10px] shadow-sm animate-in fade-in zoom-in duration-200"><span>{g.name}</span><button type="button" onClick={() => removeGear(Number(g.id))} className="text-steel-400 hover:text-red-400 transition"><X size={12} /></button></div>))}</div></div>
                        <div className="pt-4 border-t border-steel-700/50"><p className="text-[10px] uppercase tracking-[0.2em] text-steel-400 mb-3">Technical Specifications</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className={labelClass}>Twist Rate</label><input className={inputClass} value={form.twistRate} onChange={e => setForm({...form, twistRate: e.target.value})} placeholder="1:8" /></div><div><label className={labelClass}>Barrel Len (in)</label><input className={inputClass} value={form.barrelLength} onChange={e => setForm({...form, barrelLength: e.target.value})} placeholder='24"' /></div><div><label className={labelClass}>Current Odometer</label><input type="number" className={inputClass} value={form.roundCount} onChange={e => setForm({...form, roundCount: parseInt(e.target.value) || 0})} /></div><div><label className={labelClass}>Trigger Weight</label><input className={inputClass} value={form.trigger} onChange={e => setForm({...form, trigger: e.target.value})} placeholder="1.5 lbs" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><div><label className={labelClass}>Optic / Scope</label><input className={inputClass} value={form.optic} onChange={e => setForm({...form, optic: e.target.value})} placeholder="e.g. Vortex Viper 5-25x" /></div><div><label className={labelClass}>Build Notes</label><input className={inputClass} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Muzzle brake, bedding, etc." /></div></div></div>
                        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsFormOpen(false)} className="rt-btn rt-btn-secondary">Cancel</button><button type="submit" disabled={loading} className="rt-btn rt-btn-primary">{loading ? 'Saving...' : 'Save to Armory'}</button></div>
                    </form>
                </div>
            )}

            <div className="glass p-6">
                {guns.length === 0 && !isFormOpen && (<div className="p-12 text-center border border-dashed border-steel-700 rounded-xl"><Crosshair className="mx-auto text-steel-600 mb-3" size={48} /><p className="text-steel-400 text-sm">The Armory is empty.</p></div>)}
                <div className="space-y-3">{guns.map((gun, idx) => { const isExpanded = expandedId === gun.id; const linkedGear = gear.filter(g => gun.gearIds && gun.gearIds.map(Number).includes(Number(g.id))); return (
                    <div key={gun.id} className={`rt-card overflow-hidden transition-all ${isExpanded ? 'border-red-500/50 ring-1 ring-red-500/20' : 'hover:border-steel-600'}`}>
                        <div onClick={() => toggleExpand(gun.id)} className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer select-none gap-4 md:gap-0"><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpanded ? 'bg-red-900/20 text-red-500 border border-red-900/50' : 'bg-steel-700 text-steel-400'}`}><Crosshair size={20} /></div><div className="min-w-0"><h4 className="text-sm font-bold text-steel-100 truncate">{gun.name}</h4><div className="flex flex-wrap items-center gap-2 mt-0.5"><p className="text-[10px] text-steel-400 uppercase tracking-wider">{gun.caliber || 'N/A'} • {gun.manufacturer} {gun.model}</p>{gun.ownerName && (<span className="hidden sm:flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-steel-800 border border-steel-600 text-steel-400"><User size={10} /> {gun.ownerName}</span>)}</div></div></div><div className="flex items-center gap-4 self-end md:self-auto"><div className="text-right"><span className="block text-[9px] text-steel-400 uppercase tracking-wider">Rounds</span><span className="block text-xs font-mono font-bold text-emerald-500">{gun.roundCount}</span></div>{isExpanded ? <ChevronUp size={18} className="text-steel-400" /> : <ChevronDown size={18} className="text-steel-400" />}</div></div>
                        {isExpanded && (<div className="px-4 pb-4 pt-4 border-t border-steel-700/50 bg-black/20"><div className="flex flex-col md:flex-row gap-6">{gun.imageUrl && (<div className="w-full md:w-1/3 max-w-sm flex-shrink-0"><div className="rounded-lg overflow-hidden border border-steel-700 bg-black/50 shadow-lg h-48 md:h-full min-h-[160px] relative group"><img src={gun.imageUrl} alt={gun.name} className="w-full h-full object-cover" /></div></div>)}<div className="flex-1 flex flex-col justify-between"><div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4 text-[11px] mb-4"><div><span className="text-steel-400 block uppercase tracking-wider text-[9px] mb-0.5">Platform</span><span className="text-steel-200 font-medium">{PLATFORMS.find(p=>p.value===gun.platform)?.label || gun.platform}</span></div><div><span className="text-steel-400 block uppercase tracking-wider text-[9px] mb-0.5">Twist Rate</span><span className="text-steel-200 font-medium">{gun.specs.twistRate || '--'}</span></div><div><span className="text-steel-400 block uppercase tracking-wider text-[9px] mb-0.5">Barrel</span><span className="text-steel-200 font-medium">{gun.specs.barrelLength ? `${gun.specs.barrelLength} in` : '--'}</span></div><div className="col-span-2 md:col-span-3 border-t border-steel-700/50 pt-2 mt-1"><span className="text-steel-400 block uppercase tracking-wider text-[9px] mb-1">Attached Gear</span>{linkedGear.length > 0 ? (<div className="flex flex-wrap gap-2">{linkedGear.map(g => (<span key={g.id} className="px-2 py-0.5 rounded bg-steel-800 border border-steel-600 text-steel-200 text-[10px] shadow-sm">{g.name}</span>))}</div>) : <span className="text-steel-500 italic text-[10px]">None linked.</span>}</div><div className="col-span-2 md:col-span-3 pt-2"><span className="text-steel-400 block uppercase tracking-wider text-[9px] mb-0.5">Notes</span><span className="text-steel-300 italic leading-relaxed">{gun.specs.notes || 'No build notes recorded.'}</span></div></div>{canEdit && (<div className="flex gap-3 pt-4 mt-auto border-t border-steel-700/50 md:border-none md:pt-0"><button onClick={(e) => { e.stopPropagation(); handleEdit(gun); }} className="rt-btn rt-btn-ghost"><Edit size={12}/> Edit Specs</button>{verifyDeleteId === gun.id ? (<div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200"><button onClick={(e) => { e.stopPropagation(); handleDelete(gun.id); }} className="rt-btn rt-btn-primary">Confirm Delete</button><button onClick={(e) => { e.stopPropagation(); setVerifyDeleteId(null); }} className="rt-btn rt-btn-ghost">Cancel</button></div>) : (<button onClick={(e) => { e.stopPropagation(); setVerifyDeleteId(gun.id); }} className="rt-btn rt-btn-danger"><Trash2 size={12}/> Decommission</button>)}</div>)}</div></div></div>)}</div>);
                    })}
                </div>
            </div>
          </>
      )}
    </div>
  )
}
//===============================================================
//Script Name: GearLocker.jsx
//Script Location: src/components/GearLocker.jsx
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.6.0
//About: Manage accessories.
//       - FIX: Removed browser alerts (Added Error Banner).
//===============================================================

import { useState, useEffect } from 'react'
import { getGear, saveGear, deleteGear } from '../lib/gear'
import { Plus, Trash2, Edit, ExternalLink, Box, Wand2, Loader2, AlertTriangle, X, User } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import UploadButton from './UploadButton'
import { formatCurrency } from '../lib/db'

const TYPES = [
    { value: 'suppressor', label: 'Suppressor / Muzzle' },
    { value: 'optic', label: 'Optic / Scope' },
    { value: 'electronics', label: 'Electronics (Chrono/Kestrel)' },
    { value: 'support', label: 'Tripod / Bipod' },
    { value: 'tool', label: 'Tool / Press' },
    { value: 'other', label: 'Other Gear' }
]

const DEFAULT_FORM = { name: '', type: 'other', brand: '', model: '', price: '', url: '', imageUrl: '', notes: '' }

export function GearLocker() {
  const [gearList, setGearList] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [verifyDeleteId, setVerifyDeleteId] = useState(null)
  
  // NEW: Error State
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [])

  async function loadData(signal) {
    try {
      setGearList(await getGear(signal))
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.error(e)
        setError('Failed to load gear. Check your connection and try again.')
      }
    }
  }

  function handleAddNew() {
      setEditingId(null)
      setForm(DEFAULT_FORM)
      setError(null)
      setIsFormOpen(true)
      HAPTIC.click()
  }

  function handleEdit(item) {
      setEditingId(item.id)
      setForm({ ...item, price: item.price || '' })
      setError(null)
      setIsFormOpen(true)
      HAPTIC.click()
  }

  // --- AUTO-FILL ENGINE ---
  async function handleAutoFill() {
      if (!form.url) {
          setError("Please enter a Product URL first.")
          HAPTIC.error()
          return
      }
      setScraping(true)
      setError(null)
      HAPTIC.click()
      
      try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
          const res = await fetch(`${API_BASE}/scrape?url=${encodeURIComponent(form.url)}`)
          const data = await res.json()
          
          if (!res.ok) throw new Error(data.message || "Failed to scrape")
          
          // Merge found data
          setForm(prev => ({
              ...prev,
              name: data.title || prev.name,
              brand: data.brand || prev.brand,
              type: data.type || prev.type,
              imageUrl: data.image || prev.imageUrl,
              price: data.price ? data.price : prev.price,
              notes: data.description ? data.description.slice(0, 200) + '...' : prev.notes
          }))
          
          HAPTIC.success()
      } catch (err) {
          setError(err.message)
          HAPTIC.error()
      } finally {
          setScraping(false)
      }
  }

  async function handleSubmit(e) {
      e.preventDefault()
      setLoading(true)
      setError(null)
      try {
          await saveGear({ ...form, id: editingId })
          setIsFormOpen(false)
          HAPTIC.success()
          loadData()
      } catch (err) { 
          setError(err.message)
          HAPTIC.error()
      }
      finally { setLoading(false) }
  }

  async function handleDelete(id) {
      setVerifyDeleteId(null)
      try { await deleteGear(id); HAPTIC.success(); loadData() } catch (e) { HAPTIC.error() }
  }

  const inputClass = "w-full bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-[11px] text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 placeholder:text-zinc-600"
  const labelClass = "block text-xs font-semibold text-zinc-400 mb-1"

  return (
    <div className="space-y-6">

        {/* TOP-LEVEL ERROR BANNER (load failures shown here) */}
        {error && !isFormOpen && (
            <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in">
                <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
                <p className="text-xs text-red-200/80 flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={14}/></button>
            </div>
        )}

        {/* ADD BUTTON (Only visible when form closed) */}
        {!isFormOpen && (
            <button onClick={handleAddNew} className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/50 hover:bg-red-900/10 transition flex items-center justify-center gap-2 text-xs font-bold">
                <Plus size={16} /> Add New Gear
            </button>
        )}

        {isFormOpen && (
            <div className="glass p-6 border border-red-500/30 animation-fade-in">
                <h3 className="text-sm font-bold text-zinc-200 mb-4 uppercase tracking-widest border-b border-zinc-800 pb-2">
                    {editingId ? 'Edit Gear' : 'New Gear'}
                </h3>
                
                {/* ERROR BANNER */}
                {error && (
                    <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                        <div className="flex-1"><p className="text-xs font-bold text-red-400">System Notification</p><p className="text-xs text-red-200/80">{error}</p></div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16}/></button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* URL INPUT */}
                    <div>
                        <label className={labelClass}>Product Link (Auto-Fill Source)</label>
                        <div className="flex gap-2">
                            <input 
                                className={inputClass} 
                                value={form.url} 
                                onChange={e => setForm({...form, url: e.target.value})} 
                                placeholder="https://www.midwayusa.com/product/..." 
                            />
                            <button 
                                type="button" 
                                onClick={handleAutoFill} 
                                disabled={scraping || !form.url}
                                className="px-3 rounded-xl bg-purple-900/30 border border-purple-500/50 text-purple-300 hover:bg-purple-900/50 hover:text-white transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {scraping ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                                <span className="text-[10px] font-bold hidden sm:inline">Auto-Fill</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>Name</label><input className={inputClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Omega 300" required /></div>
                        <div><label className={labelClass}>Type</label><select className={inputClass} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Brand</label><input className={inputClass} value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="e.g. SilencerCo" /></div>
                        <div><label className={labelClass}>Price</label><input type="number" className={inputClass} value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" /></div>
                    </div>
                    
                    <div className="rt-card p-3 flex flex-col justify-between">
                        <label className={labelClass}>Photo</label>
                        <UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} />
                    </div>

                    <div><label className={labelClass}>Notes</label><textarea className={inputClass + ' h-20 resize-none'} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="rt-btn rt-btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="rt-btn rt-btn-primary shadow-lg shadow-red-900/20">{loading ? 'Saving...' : 'Save Gear'}</button>
                    </div>
                </form>
            </div>
        )}

        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {gearList.map(item => (
                <div key={item.id} className="bg-black/40 border border-zinc-800 rounded-xl overflow-hidden flex flex-col hover:border-zinc-600 transition group min-h-[96px]">
                    <div className="flex h-full">
                        <div className="w-24 bg-black flex-shrink-0 border-r border-zinc-800 relative">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700"><Box size={24}/></div>
                            )}
                            {item.price > 0 && <div className="absolute bottom-1 right-1 bg-black/80 text-[9px] text-emerald-400 px-1.5 rounded border border-emerald-900/50">{formatCurrency(item.price)}</div>}
                        </div>
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-sm font-bold text-zinc-200 truncate pr-1">{item.name}</h4>
                                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 border border-zinc-800 px-1.5 rounded bg-black/20 whitespace-nowrap flex-shrink-0">{TYPES.find(t=>t.value===item.type)?.label.split(' ')[0]}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] text-zinc-400 truncate flex-1">{item.brand} {item.model}</p>
                                    {item.ownerName && (
                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-700 text-zinc-500 flex items-center gap-1 flex-shrink-0" title={`Added by ${item.ownerName}`}>
                                            <User size={8} /> {item.ownerName}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end mt-2">
                                <div className="flex gap-2">
                                    {item.url && <a href={item.url} target="_blank" className="text-zinc-500 hover:text-red-400 transition"><ExternalLink size={12}/></a>}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"><Edit size={12}/></button>
                                    {verifyDeleteId === item.id ? (
                                        <button onClick={() => handleDelete(item.id)} className="px-2 py-1 rounded bg-red-600 text-[9px] text-white font-bold animate-in fade-in zoom-in">Confirm</button>
                                    ) : (
                                        <button onClick={() => setVerifyDeleteId(item.id)} className="p-1.5 rounded bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"><Trash2 size={12}/></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  )
}
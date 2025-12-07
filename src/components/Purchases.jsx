//===============================================================
//Script Name: Purchases.jsx
//Script Location: src/components/Purchases.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.32.0
//About: Manage component LOT purchases. 
//       Updated: Local Date + Safe Area on Modals.
//===============================================================

import { useState, useEffect, useMemo } from 'react'
import { getAllPurchases, addPurchase, deletePurchase, formatCurrency, calculatePerUnit } from '../lib/db'
import { Trash2, Plus, ShoppingCart, Search, Printer, X, Edit, User, Clock, Image as ImageIcon, AlertTriangle } from 'lucide-react'
import { printPurchaseLabel } from '../lib/labels' 
import { HAPTIC } from '../lib/haptics'
import UploadButton from './UploadButton'

const COMPONENT_TYPES = [ { value: 'powder', label: 'Powder' }, { value: 'bullet', label: 'Bullet / Projectile' }, { value: 'primer', label: 'Primer' }, { value: 'case', label: 'Brass / Case' }, { value: 'other', label: 'Other' } ]
const UNITS = [ { value: 'lb', label: 'Pounds (lb)' }, { value: 'kg', label: 'Kilograms (kg)' }, { value: 'gr', label: 'Grains (gr)' }, { value: 'each', label: 'Each / Pieces' }, { value: 'rounds', label: 'Rounds' } ]
const CASE_CONDITIONS = [ { value: 'new', label: 'New' }, { value: 'once-fired', label: 'Once fired' }, { value: 'mixed', label: 'Mixed / Unknown' } ]

// FIX: Local Date String to prevent "yesterday" bugs
const getLocalDate = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - (offset*60*1000))
    return local.toISOString().split('T')[0]
}

const DEFAULT_FORM = { componentType: 'powder', caliber: '', brand: '', name: '', typeDetail: '', lotId: '', qty: '', unit: 'lb', price: '', shipping: '', tax: '', vendor: '', date: getLocalDate(), notes: '', url: '', imageUrl: '', status: 'active', caseCondition: '' }

export function Purchases({ onChanged, canEdit = true, highlightId }) {
  const [purchases, setPurchases] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (highlightId && purchases.length > 0) { const targetId = String(highlightId); setTimeout(() => { const el = document.getElementById(`purchase-${targetId}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 600) } }, [highlightId, purchases])

  async function loadData() { try { const data = await getAllPurchases(); setPurchases(data); if (onChanged) onChanged(); } catch (err) { console.error("Failed to load purchases", err); setError("Failed to sync inventory data."); } }
  function handleAddNew() { setEditingId(null); setForm(DEFAULT_FORM); setError(null); setIsFormOpen(true); HAPTIC.click(); }
  function handleEdit(item) { setEditingId(item.id); setForm({ componentType: item.componentType || 'powder', date: item.purchaseDate ? item.purchaseDate.substring(0, 10) : getLocalDate(), vendor: item.vendor || '', brand: item.brand || '', name: item.name || '', typeDetail: item.typeDetail || '', lotId: item.lotId || '', qty: item.qty != null ? String(item.qty) : '', unit: item.unit || '', price: item.price != null ? String(item.price) : '', shipping: item.shipping != null ? String(item.shipping) : '', tax: item.tax != null ? String(item.tax) : '', notes: item.notes || '', status: item.status || 'active', url: item.url || '', imageUrl: item.imageUrl || '', caseCondition: item.caseCondition || '' }); setError(null); setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); HAPTIC.click(); }
  function promptDelete(item) { if (!canEdit) return; setItemToDelete(item); setDeleteModalOpen(true); HAPTIC.click(); }
  async function executeDelete() { if (!itemToDelete) return; setIsDeleting(true); try { await deletePurchase(itemToDelete.id); HAPTIC.success(); loadData(); setDeleteModalOpen(false); setItemToDelete(null); } catch (err) { setError(`Failed to delete: ${err.message}`); HAPTIC.error(); setDeleteModalOpen(false); } finally { setIsDeleting(false); } }
  async function handleSubmit(e) { e.preventDefault(); setLoading(true); setError(null); try { const payload = { ...form, id: editingId, qty: Number(form.qty), price: Number(form.price), shipping: Number(form.shipping), tax: Number(form.tax), purchaseDate: form.date }; await addPurchase(payload); HAPTIC.success(); setIsFormOpen(false); loadData(); } catch (err) { setError(`Failed to save: ${err.message}`); HAPTIC.error(); } finally { setLoading(false); } }

  const liveUnitCost = calculatePerUnit(form.price, form.shipping, form.tax, form.qty)
  const filteredPurchases = purchases.filter(p => { const term = searchTerm.toLowerCase(); return `${p.brand} ${p.name} ${p.lotId} ${p.vendor} ${p.componentType}`.toLowerCase().includes(term) })
  const lotsByType = useMemo(() => { const groups = { powder: [], bullet: [], primer: [], case: [], other: [] }; for (const p of filteredPurchases) { const type = groups[p.componentType] ? p.componentType : 'other'; groups[type].push(p); } return groups; }, [filteredPurchases])

  const inputClass = "w-full bg-[#1a1a1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-slate-600"
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1"
  const helpClass = "text-[9px] text-slate-600 mt-0.5 italic"
  const sectionLabelClass = "text-xs uppercase tracking-[0.25em] text-slate-500 mb-4 block"

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div><span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Supply Chain</span><h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">PURCHASES</h2></div>
        <div className="ml-auto flex items-end">{canEdit && !isFormOpen && (<button onClick={handleAddNew} className="px-4 py-2 rounded-full bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 hover:bg-red-600 transition"><Plus size={14} /> New Lot</button>)}</div>
      </div>

      {error && (<div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2"><AlertTriangle className="text-red-500 flex-shrink-0" size={20} /><div className="flex-1"><p className="text-xs font-bold text-red-400">System Notification</p><p className="text-xs text-red-200/80">{error}</p></div><button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16}/></button></div>)}

      {isFormOpen && (
        <div className="glass rounded-2xl p-6 border border-red-500/30 animation-fade-in relative">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={18} /></button>
            <span className={sectionLabelClass}>{editingId ? 'EDIT PURCHASE' : 'ADD PURCHASE'}</span>
            <p className="text-xs text-slate-400 mb-6">Record powders, bullets, primers, and brass as you buy them. The live calculator will use these lots to drive cost per round and inventory capacity.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className={labelClass}>Type</label><select className={inputClass} value={form.componentType} onChange={e => setForm({...form, componentType: e.target.value})}>{COMPONENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div><div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div><div className="md:col-span-2"><label className={labelClass}>Vendor</label><input className={inputClass} value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} placeholder="e.g. Brownells, Local Shop" /><p className={helpClass}>Where did you buy this?</p></div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className={labelClass}>Brand</label><input className={inputClass} value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="e.g. CCI" /></div><div className="md:col-span-2"><label className={labelClass}>Product Name</label><input className={inputClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. #400 Small Rifle" /></div><div><label className={labelClass}>Lot #</label><input className={inputClass} value={form.lotId} onChange={e => setForm({...form, lotId: e.target.value})} placeholder="Auto-generated if empty" /><p className={helpClass}>Found on the box/jug.</p></div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className={labelClass}>Caliber (Opt)</label><input className={inputClass} value={form.caliber} onChange={e => setForm({...form, caliber: e.target.value})} placeholder="Specific cal?" /></div><div className="md:col-span-2"><label className={labelClass}>Type Details (Opt)</label><input className={inputClass} value={form.typeDetail} onChange={e => setForm({...form, typeDetail: e.target.value})} placeholder="e.g. Match, Magnum, Extruded" /><p className={helpClass}>Extra details (e.g. 'Match Grade' or 'Spherical')</p></div><div><label className={labelClass}>Condition</label><select className={inputClass} value={form.caseCondition} onChange={e => setForm({...form, caseCondition: e.target.value})}><option value="">N/A</option>{CASE_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/50 bg-black/20 p-3 rounded-xl"><div><label className={labelClass}>Quantity</label><input type="number" step="0.01" className={inputClass} value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} placeholder="e.g. 1000" /></div><div><label className={labelClass}>Unit</label><select className={inputClass} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>{UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div><div><label className={labelClass}>Total Price</label><input type="number" step="0.01" className={inputClass} value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" /><p className={helpClass}>Price for the whole lot</p></div><div><label className={labelClass}>Tax/Ship</label><div className="flex gap-1"><input type="number" step="0.01" className={inputClass} placeholder="Ship" value={form.shipping} onChange={e => setForm({...form, shipping: e.target.value})} /><input type="number" step="0.01" className={inputClass} placeholder="Tax" value={form.tax} onChange={e => setForm({...form, tax: e.target.value})} /></div></div><div className="col-span-2 md:col-span-4 flex justify-end mt-1"><span className="text-[10px] text-slate-400">Calculated Unit Cost: <span className="text-emerald-400 font-mono font-bold">{formatCurrency(liveUnitCost)} / {form.unit || 'unit'}</span></span></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-black/20 rounded-xl p-3 border border-slate-800 flex flex-col justify-between"><label className={labelClass}>Reference Photo</label><div className="flex-1 flex flex-col justify-center"><UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} /></div></div><div className="space-y-3"><div><label className={labelClass}>Product URL</label><input className={inputClass} value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." /></div><div><label className={labelClass}>Notes</label><textarea className={inputClass + " h-20 resize-none"} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Performance notes, where stored, etc." /></div><div><label className={labelClass}>Status</label><select className={inputClass} value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="active">Active</option><option value="depleted">Depleted</option></select></div></div></div>
                <div className="pt-2 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-full border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition">Cancel</button><button type="submit" disabled={loading} className="px-6 py-2 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition">{loading ? 'Saving...' : 'Save Record'}</button></div>
            </form>
        </div>
      )}

      <div className="glass rounded-2xl p-6">
         <div className="flex items-center gap-2 mb-6 bg-black/40 p-2 rounded-xl border border-slate-800"><Search size={16} className="text-slate-500 ml-2" /><input className="bg-transparent border-none focus:outline-none text-xs text-slate-200 w-full placeholder:text-slate-600" placeholder="Search purchases..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
         <div className="space-y-8">
            {COMPONENT_TYPES.map(type => {
              const lots = lotsByType[type.value]
              if (!lots || lots.length === 0) return null
              return (
                <div key={type.value}>
                  <h3 className="text-sm font-semibold text-slate-200 mb-2 uppercase tracking-wider border-b border-slate-800 pb-1 inline-block pr-4">{type.label}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {lots.map(p => {
                        const unitCost = calculatePerUnit(p.price, p.shipping, p.tax, p.qty)
                        const isHighlighted = String(highlightId) === String(p.id)
                        const depleted = p.status === 'depleted'
                        const attribution = p.updatedByUsername ? `Updated by ${p.updatedByUsername}` : p.createdByUsername ? `Added by ${p.createdByUsername}` : null
                        return (
                            <div id={`purchase-${p.id}`} key={p.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-black/20 border transition ${isHighlighted ? 'border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-900/20' : 'border-slate-800/50 hover:border-slate-700'}`}>
                                <div className="flex-1 flex gap-4">
                                    {p.imageUrl && (<div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-black"><img src={p.imageUrl} alt="Lot" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition" /></div>)}
                                    <div>
                                        <div className="flex items-center gap-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${depleted ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>{p.componentType}</span><span className="text-xs text-slate-500 font-mono">{p.lotId}</span></div>
                                        <h4 className="text-sm font-bold text-slate-200 mt-1">{p.brand} {p.name}</h4>
                                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-2">{p.caliber && <span className="text-slate-400">{p.caliber}</span>}{p.typeDetail && <span className="text-slate-400 italic">{p.typeDetail}</span>}{p.vendor && <span className="px-2 py-[1px] bg-black/40 border border-slate-700 rounded-full">{p.vendor}</span>}{p.purchaseDate && <span className="px-2 py-[1px] bg-black/40 border border-slate-700 rounded-full">{p.purchaseDate.substring(0,10)}</span>}{p.caseCondition && <span className="px-2 py-[1px] bg-black/40 border border-slate-700 rounded-full">{CASE_CONDITIONS.find(c=>c.value===p.caseCondition)?.label || p.caseCondition}</span>}{p.url && <a href={p.url} target="_blank" rel="noreferrer" className="px-2 py-[1px] bg-black/40 border border-emerald-900/50 text-emerald-500 hover:text-emerald-300 hover:border-emerald-500/50 rounded-full transition">Page ↗</a>}</div>
                                        {attribution && (<div className="mt-2 flex items-center gap-2"><span className="flex items-center gap-1 text-[9px] text-slate-500 px-2 py-0.5 bg-black/20 rounded-full border border-slate-800">{p.updatedByUsername ? <Clock size={10}/> : <User size={10}/>} {attribution}</span></div>)}
                                    </div>
                                </div>
                                <div className="mt-3 md:mt-0 flex items-center justify-between md:justify-end gap-6">
                                    <div className="text-right flex flex-col justify-center"><span className="text-sm font-bold text-slate-200 leading-none">{p.qty} <span className="text-xs font-normal text-slate-500">{p.unit}</span></span><span className="text-xs font-bold text-emerald-400 mt-1">{formatCurrency(unitCost)} <span className="text-[10px] font-normal text-emerald-600/80">/ unit</span></span></div>
                                    <div className="flex flex-col items-end gap-2 min-w-[70px]">{canEdit && (<><button onClick={() => handleEdit(p)} className="px-3 py-1 rounded-full bg-black/60 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center"><Edit size={12} /> Edit</button><button onClick={() => promptDelete(p)} className="px-3 py-1 rounded-full bg-black/60 border border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center"><Trash2 size={12} /> Remove</button></>)}<button onClick={() => { HAPTIC.click(); printPurchaseLabel(p); }} className="px-3 py-1 rounded-full bg-black/60 border border-emerald-900/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center"><Printer size={12} /> Label</button></div>
                                </div>
                            </div>
                        )
                    })}
                  </div>
                </div>
              )
            })}
         </div>
      </div>

      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
            <div className="bg-[#0f0f10] border border-red-900/50 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto"><Trash2 className="text-red-500" size={24} /></div>
                <div><h3 className="text-lg font-bold text-white">Delete Lot?</h3><p className="text-sm text-slate-400 mt-1">Are you sure you want to delete <span className="text-white font-medium">{itemToDelete.brand} {itemToDelete.name}</span>?<br/>This action cannot be undone.</p></div>
                <div className="grid grid-cols-2 gap-3 pt-2"><button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm transition">Cancel</button><button onClick={executeDelete} disabled={isDeleting} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 font-bold text-sm shadow-lg shadow-red-900/20 transition">{isDeleting ? 'Deleting...' : 'Delete Forever'}</button></div>
            </div>
        </div>
      )}
    </div>
  )
}
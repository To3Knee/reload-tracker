//===============================================================
//Script Name: SupplyChain.jsx
//Script Location: src/components/SupplyChain.jsx
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 2.5.0
//About: Market Intelligence.
//       - FIX: Removed browser alerts (Added Error Banner).
//       - FIX: Preserved Icon-Only layout.
//===============================================================

import { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, Edit, ExternalLink, Loader2, AlertTriangle, X } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import { formatCurrency } from '../lib/db'

const CATEGORIES = ['powder', 'primer', 'bullet', 'case', 'ammo', 'gear', 'other']

export function SupplyChain() {
    const [items, setItems] = useState([])
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [refreshingId, setRefreshingId] = useState(null)
    
    // NEW: Error State
    const [error, setError] = useState(null)
    
    // Modal States
    const [editItem, setEditItem] = useState(null)
    const [deleteId, setDeleteId] = useState(null)

    useEffect(() => { load() }, [])

    async function load() {
        try {
            const res = await fetch('/api/market')
            if (res.ok) setItems(await res.json())
        } catch (e) { console.error(e) }
    }

    async function handleAdd() {
        if (!url) return
        setLoading(true)
        setError(null)
        HAPTIC.click()
        try {
            await fetch('/api/market', { method: 'POST', body: JSON.stringify({ url }) })
            setUrl('')
            load()
            HAPTIC.success()
        } catch (e) { 
            setError('Failed to track URL. Check link validity.')
            HAPTIC.error()
        } finally {
            setLoading(false)
        }
    }

    async function handleRefresh(id) {
        setRefreshingId(id)
        setError(null)
        HAPTIC.click()
        try {
            await fetch(`/api/market/${id}/refresh`, { method: 'POST' })
            load()
            HAPTIC.success()
        } catch (e) { 
            setError('Refresh failed. Site may be blocking bots.')
            HAPTIC.error()
        } finally { setRefreshingId(null) }
    }

    async function handleSaveEdit() {
        if (!editItem) return
        setError(null)
        try {
            await fetch(`/api/market/${editItem.id}`, { method: 'PUT', body: JSON.stringify(editItem) })
            setEditItem(null)
            load()
            HAPTIC.success()
        } catch (e) { 
            setError('Save failed.')
            HAPTIC.error()
        }
    }

    async function confirmDelete() {
        if (!deleteId) return
        await fetch(`/api/market/${deleteId}`, { method: 'DELETE' })
        setDeleteId(null)
        load()
        HAPTIC.success()
    }

    const grouped = items.reduce((acc, item) => {
        const cat = item.category || 'other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
    }, {})

    return (
        <div className="space-y-8 relative">
            
            {/* ERROR BANNER */}
            {error && (
                <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                    <div className="flex-1"><p className="text-xs font-bold text-red-400">System Notification</p><p className="text-xs text-red-200/80">{error}</p></div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16}/></button>
                </div>
            )}
            
            {/* Input */}
            <div className="glass p-6 rounded-2xl flex gap-2 border border-red-500/30">
                <input 
                    className="flex-1 bg-black/50 border border-zinc-700 rounded-xl px-4 text-sm text-white focus:border-red-500 focus:outline-none" 
                    placeholder="Paste Product URL (Midway, Brownells, etc)..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                />
                <button 
                    onClick={handleAdd} 
                    disabled={loading}
                    className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-lg shadow-red-900/20"
                >
                    {loading ? <RefreshCw className="animate-spin" size={18}/> : <Plus size={18}/>}
                    <span>Track</span>
                </button>
            </div>

            {/* Categorized Lists */}
            {CATEGORIES.map(cat => {
                if (!grouped[cat]?.length) return null
                return (
                    <div key={cat}>
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">{cat}</h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {grouped[cat].map(item => {
                                const isRefreshing = refreshingId === item.id
                                return (
                                    <div key={item.id} className="bg-black/40 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-red-500/30 transition group">
                                        <div className="flex h-28 relative">
                                            {/* Image */}
                                            <div className="w-28 bg-white/5 flex-shrink-0 relative border-r border-zinc-800">
                                                {item.image_url ? (
                                                    <img src={item.image_url} className={`w-full h-full object-cover transition ${isRefreshing ? 'opacity-50 blur-sm' : ''}`} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-700"><ShoppingCart size={24}/></div>
                                                )}
                                                {isRefreshing && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" size={24}/></div>}
                                                <div className={`absolute top-0 left-0 w-full h-1 ${item.in_stock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            </div>
                                            
                                            {/* Details */}
                                            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                                <div>
                                                    <div className="flex justify-between items-start gap-3">
                                                        <h4 className="text-xs font-bold text-zinc-100 line-clamp-2 leading-tight flex-1" title={item.name}>{item.name}</h4>
                                                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap ${item.in_stock ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}>
                                                            {item.in_stock ? 'In Stock' : 'OOS'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 mt-2">{item.vendor}</div>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="text-lg font-black text-white">{formatCurrency(item.price)}</div>
                                                    {(item.qty_per_unit > 1 || item.price === 0) && (
                                                        <div className="text-[10px] text-zinc-500">
                                                            {item.price > 0 ? formatCurrency(item.price / item.qty_per_unit) : '$--'} / unit
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex border-t border-zinc-800 divide-x divide-zinc-800 bg-black/60">
                                            <a href={item.url} target="_blank" className="flex-1 py-2 flex items-center justify-center text-zinc-500 hover:text-blue-400 hover:bg-blue-900/10 transition" title="Visit Link"><ExternalLink size={14}/></a>
                                            <button onClick={() => handleRefresh(item.id)} disabled={isRefreshing} className="flex-1 py-2 flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-900/10 transition" title="Refresh Price"><RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""}/></button>
                                            <button onClick={() => setEditItem(item)} className="flex-1 py-2 flex items-center justify-center text-zinc-500 hover:text-amber-400 hover:bg-amber-900/10 transition" title="Edit Item"><Edit size={14}/></button>
                                            <button onClick={() => setDeleteId(item.id)} className="flex-1 py-2 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-900/10 transition" title="Delete Tracker"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}

            {/* EDIT MODAL */}
            {editItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0f0f10] border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-white">Edit Listing</h3>
                        
                        <div><label className="text-xs text-zinc-500 block mb-1">Name</label>
                        <input className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} /></div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-zinc-500 block mb-1">Price ($)</label>
                            <input type="number" step="0.01" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editItem.price} onChange={e => setEditItem({...editItem, price: e.target.value})} /></div>
                            
                            <div><label className="text-xs text-zinc-500 block mb-1">Stock Status</label>
                            <select className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editItem.in_stock} onChange={e => setEditItem({...editItem, in_stock: e.target.value === 'true'})}>
                                <option value="true">In Stock</option>
                                <option value="false">Out of Stock</option>
                            </select></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-zinc-500 block mb-1">Quantity (in Pack)</label>
                            <input type="number" step="0.01" className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editItem.qty_per_unit} onChange={e => setEditItem({...editItem, qty_per_unit: e.target.value})} />
                            <p className="text-[9px] text-zinc-600 mt-1">e.g. 8 for 8lbs, 1000 for primers</p>
                            </div>
                            
                            <div><label className="text-xs text-zinc-500 block mb-1">Category</label>
                            <select className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editItem.category} onChange={e => setEditItem({...editItem, category: e.target.value})}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                            </select></div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setEditItem(null)} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition">Cancel</button>
                            <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-red-700 text-white font-bold hover:bg-red-600 transition">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0f0f10] border border-red-900/50 rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-xl">
                        <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500"><Trash2 size={24}/></div>
                        <div><h3 className="text-lg font-bold text-white">Stop Tracking?</h3><p className="text-sm text-zinc-400 mt-1">This will remove the item from your Supply Chain.</p></div>
                        <div className="flex gap-3 justify-center pt-2">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition text-sm font-bold">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition text-sm shadow-lg shadow-red-900/20">Remove Tracker</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
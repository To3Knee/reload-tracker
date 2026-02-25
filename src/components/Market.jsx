//===============================================================
//Script Name: Market.jsx
//Script Location: src/components/Market.jsx
//Date: 12/19/2025
//Created By: T03KNEE
//Version: 5.5.0 (Red Badge UI)
//About: Market Watch Dashboard.
//       - UI: Changed Classification Badge to Red (App Theme).
//===============================================================

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMarketListings, createMarketListing, deleteMarketListing, refreshMarketListing, updateMarketListing } from '../lib/market'
import { Plus, Trash2, RefreshCw, Edit, ExternalLink, Search, Globe, Lock, AlertTriangle } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import { formatCurrency } from '../lib/db'

// Matches Inventory.jsx structure + 'ammo' for factory rounds
const COMPONENT_TYPES = [
  { value: 'powder', label: 'Powder' },
  { value: 'bullet', label: 'Bullets' },
  { value: 'primer', label: 'Primers' },
  { value: 'case', label: 'Cases / Brass' },
  { value: 'ammo', label: 'Factory Ammo' },
  { value: 'other', label: 'Other' },
]

export function Market({ user }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [newItemUrl, setNewItemUrl] = useState('')
  const [refreshingId, setRefreshingId] = useState(null)
  
  // MODAL STATES
  const [editingItem, setEditingItem] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { 
      if (user) {
          loadData() 
      }
  }, [user])

  async function loadData() {
      try {
          const data = await getMarketListings()
          setItems(data)
      } catch (e) { console.error(e) }
  }

  async function handleAdd(e) {
      e.preventDefault()
      if (!newItemUrl) return
      setLoading(true)
      try {
          await createMarketListing({ url: newItemUrl, name: 'Scanning...', componentType: 'other' })
          setNewItemUrl('')
          HAPTIC.success()
          await loadData()
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
  }

  async function handleRefresh(id) {
      setRefreshingId(id)
      HAPTIC.click()
      try {
          await refreshMarketListing(id)
          HAPTIC.success()
          await loadData() 
      } catch (e) { 
          console.error("Scan failed: " + e.message) 
          HAPTIC.error()
      } finally { 
          setRefreshingId(null) 
      }
  }

  function promptDelete(item) {
      setItemToDelete(item)
      HAPTIC.click()
  }

  async function executeDelete() {
      if (!itemToDelete) return
      setIsDeleting(true)
      
      const previousItems = [...items]
      setItems(current => current.filter(i => i.id !== itemToDelete.id))
      
      try {
          await deleteMarketListing(itemToDelete.id)
          HAPTIC.success()
          setItemToDelete(null)
      } catch (e) {
          setItems(previousItems)
          console.error("Delete failed", e)
          HAPTIC.error()
      } finally {
          setIsDeleting(false)
      }
  }

  async function handleSaveEdit() {
      if (!editingItem) return
      
      setItems(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...editingItem } : item
      ))
      
      setEditingItem(null)
      HAPTIC.success()

      try {
          await updateMarketListing(editingItem.id, editingItem)
          await loadData()
      } catch (e) { 
          console.error("Update failed", e) 
          HAPTIC.error()
      }
  }

  // --- RENDER HELPERS ---

  if (!user) {
    return (
        <div className="space-y-6 mt-6">
            <div className="glass p-8 rounded-2xl border border-red-500/20 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                    <Lock size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Authentication Required</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
                        You must be logged in to access the Market Watch features and track real-time pricing.
                    </p>
                </div>
            </div>
        </div>
    )
  }

  const groupedItems = COMPONENT_TYPES.reduce((acc, type) => {
      const matches = items.filter(i => (i.componentType || 'other') === type.value)
      if (matches.length > 0) {
          acc.push({ type, items: matches })
      }
      return acc
  }, [])

  const knownTypes = COMPONENT_TYPES.map(t => t.value)
  const orphanItems = items.filter(i => !knownTypes.includes(i.componentType || 'other'))
  if (orphanItems.length > 0) {
      const otherGroup = groupedItems.find(g => g.type.value === 'other')
      if (otherGroup) {
          otherGroup.items.push(...orphanItems)
      } else {
          groupedItems.push({ type: COMPONENT_TYPES.find(t => t.value === 'other'), items: orphanItems })
      }
  }

  return (
    <div className="space-y-6 mt-4">

      {/* ADD BAR */}
      <div className="glass p-4 rounded-xl border border-zinc-800">
          <form onSubmit={handleAdd} className="flex gap-2">
              <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                      className="w-full bg-black/60 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 placeholder:text-zinc-600"
                      placeholder="Paste Product URL (Midway, Brownells, etc)..."
                      value={newItemUrl}
                      onChange={e => setNewItemUrl(e.target.value)}
                  />
              </div>
              <button disabled={loading} type="submit" className="bg-red-700 hover:bg-red-600 text-white font-bold px-3 md:px-6 rounded-xl transition flex items-center gap-2 text-sm">
                  {loading ? <RefreshCw size={16} className="animate-spin"/> : <Plus size={16}/>} <span className="hidden md:inline">Track</span>
              </button>
          </form>
      </div>

      {/* EMPTY STATE */}
      {items.length === 0 && !loading && (
           <p className="text-center text-zinc-500 py-10">No items tracked. Paste a URL above to start.</p>
      )}

      {/* GROUPED LIST */}
      <div className="space-y-8">
        {groupedItems.map(group => (
            <div key={group.type.value}>
                {/* SECTION HEADER */}
                <h3 className="text-sm font-semibold text-zinc-200 mb-2 uppercase tracking-wider border-b border-zinc-800 pb-1 inline-block pr-4">
                    {group.type.label}
                </h3>

                {/* GRID */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map(item => {
                        const typeLabel = COMPONENT_TYPES.find(t => t.value === (item.componentType || 'other'))?.label || 'Other'
                        
                        return (
                            <div key={item.id} className="bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden group transition-all">
                                <div className="h-32 bg-black relative">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-700"><Search size={32}/></div>
                                    )}
                                    
                                    {/* TYPE BADGE - UPDATED TO RED */}
                                    <div className="absolute top-2 left-2 z-10">
                                         <span className="text-[9px] px-2 py-[1px] rounded-full bg-red-900/60 border border-red-500/40 text-red-200 backdrop-blur-md uppercase tracking-wide font-bold shadow-lg shadow-black/50">
                                            {typeLabel}
                                        </span>
                                    </div>

                                    {/* ACTIONS (Top Right) */}
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button onClick={() => handleRefresh(item.id)} className={`p-2 rounded-full bg-black/60 text-zinc-300 hover:text-white backdrop-blur-md border border-zinc-700 ${refreshingId === item.id ? 'animate-spin text-emerald-400' : ''}`}>
                                            <RefreshCw size={14} />
                                        </button>
                                        <button onClick={() => setEditingItem(item)} className="p-2 rounded-full bg-black/60 text-zinc-300 hover:text-amber-400 backdrop-blur-md border border-zinc-700">
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => promptDelete(item)} className="p-2 rounded-full bg-black/60 text-zinc-300 hover:text-red-400 backdrop-blur-md border border-zinc-700">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {/* STATUS BADGE */}
                                    <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${item.in_stock ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-300' : 'bg-red-900/80 border-red-500/50 text-red-300'}`}>
                                        {item.in_stock ? 'In Stock' : 'Out of Stock'}
                                    </div>
                                </div>
                                
                                <div className="p-4">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-zinc-200 line-clamp-1 flex-1" title={item.name}>{item.name}</h3>
                                        {item.vendor && <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 border border-zinc-700 whitespace-nowrap">{item.vendor}</span>}
                                    </div>
                                    
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Price</p>
                                            <p className="text-lg font-mono font-bold text-emerald-400">{formatCurrency(item.price)}</p>
                                        </div>
                                        {(item.qty_per_unit > 1 && item.price > 0) && (
                                            <div className="text-right">
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Per Unit</p>
                                                <p className="text-xs font-bold text-zinc-300">{formatCurrency(item.price / item.qty_per_unit)}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* FOOTER: Store Link (Emerald Pill) */}
                                    <div className="mt-3 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-600">
                                        <a 
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="px-3 py-1 bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 rounded-full font-bold uppercase tracking-wide hover:bg-emerald-900/40 hover:border-emerald-500/50 hover:text-emerald-300 transition flex items-center gap-1"
                                        >
                                            Store Page <ExternalLink size={10} />
                                        </a>
                                        <span>{new Date(item.last_scraped_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editingItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
            <div className="bg-[#0f0f10] border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
                
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Edit size={18} className="text-red-500"/> Edit Listing
                </h3>
                
                <div>
                    <label className="text-xs text-zinc-500 block mb-1">Product Name</label>
                    <input className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Component Type</label>
                        <select 
                            className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none"
                            value={editingItem.componentType || 'other'}
                            onChange={e => setEditingItem({...editingItem, componentType: e.target.value})}
                        >
                            {COMPONENT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Price ($)</label>
                        <input type="number" step="0.01" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Pack Quantity</label>
                        <input type="number" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.qty_per_unit} onChange={e => setEditingItem({...editingItem, qty_per_unit: e.target.value})} />
                        <p className="text-[9px] text-zinc-600 mt-1">e.g. 1000 for primers</p>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Status</label>
                        <select className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.in_stock ? 'true' : 'false'} onChange={e => setEditingItem({...editingItem, in_stock: e.target.value === 'true'})}>
                            <option value="true">In Stock</option>
                            <option value="false">Out of Stock</option>
                        </select>
                    </div>
                </div>

                <div>
                     <label className="text-xs text-zinc-500 block mb-1">Vendor Name</label>
                     <input className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.vendor || ''} onChange={e => setEditingItem({...editingItem, vendor: e.target.value})} placeholder="e.g. MidwayUSA" />
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingItem(null)} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition text-sm">Cancel</button>
                    <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-red-700 text-white font-bold hover:bg-red-600 transition text-sm">Save Changes</button>
                </div>
            </div>
        </div>, document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
            <div className="bg-[#0f0f10] border border-red-900/50 rounded-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="text-red-500" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Stop Tracking?</h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        Are you sure you want to remove <span className="text-white font-medium">{itemToDelete.name}</span> from your watch list?
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => setItemToDelete(null)} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium text-sm transition">Cancel</button>
                    <button onClick={executeDelete} disabled={isDeleting} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 font-bold text-sm shadow-lg shadow-red-900/20 transition">
                        {isDeleting ? 'Removing...' : 'Remove Item'}
                    </button>
                </div>
            </div>
        </div>, document.body
      )}

    </div>
  )
}
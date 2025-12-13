//===============================================================
//Script Name: Market.jsx
//Script Location: src/components/Market.jsx
//Date: 12/12/2025
//Created By: T03KNEE
//Version: 3.4.0 (Optimistic Updates)
//About: Market Watch Dashboard.
//       - FEATURE: Optimistic Deletion (Instant removal from UI).
//       - FEATURE: Auto-Rollback (Restores item if delete fails).
//===============================================================

import { useEffect, useState } from 'react'
import { getMarketListings, createMarketListing, deleteMarketListing, refreshMarketListing, updateMarketListing } from '../lib/market'
import { Plus, Trash2, RefreshCw, Edit, ExternalLink, Search, Globe } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import { formatCurrency } from '../lib/db'

export function Market() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [newItemUrl, setNewItemUrl] = useState('')
  const [refreshingId, setRefreshingId] = useState(null)
  
  // EDIT STATE
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => { loadData() }, [])

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
          await createMarketListing({ url: newItemUrl, name: 'Scanning...' })
          setNewItemUrl('')
          HAPTIC.success()
          await loadData()
      } catch (e) { alert(e.message) }
      finally { setLoading(false) }
  }

  // OPTIMIZED: Instant UI feedback for refresh
  async function handleRefresh(id) {
      setRefreshingId(id)
      HAPTIC.click()
      try {
          await refreshMarketListing(id)
          HAPTIC.success()
          await loadData() // Re-fetch to get the new price/status
      } catch (e) { 
          alert("Scan failed: " + e.message) 
      } finally { 
          setRefreshingId(null) 
      }
  }

  // OPTIMIZED: Optimistic Deletion
  async function handleDelete(id) {
      if(!confirm("Stop tracking this item?")) return
      HAPTIC.error()

      // 1. Snapshot current state (in case we need to undo)
      const previousItems = [...items]

      // 2. Optimistic Update: Remove it from screen IMMEDIATELY
      setItems(current => current.filter(i => i.id !== id))

      try {
          // 3. Send request to server silently
          await deleteMarketListing(id)
          // Success! We don't need to do anything else because it's already gone.
      } catch (e) {
          // 4. Rollback: If server failed, put it back
          setItems(previousItems)
          alert("Could not delete item. Network error?")
      }
  }

  async function handleSaveEdit() {
      if (!editingItem) return
      try {
          // Optimistic Update for Edits could go here too, but simple await is usually fine for edits
          await updateMarketListing(editingItem.id, editingItem)
          setEditingItem(null)
          await loadData()
          HAPTIC.success()
      } catch (e) { alert(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Supply Chain</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">MARKET WATCH</h2>
        </div>
      </div>

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

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
              <div key={item.id} className="bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden group transition-all">
                  <div className="h-32 bg-black relative">
                      {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700"><Search size={32}/></div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                          <button onClick={() => handleRefresh(item.id)} className={`p-2 rounded-full bg-black/60 text-zinc-300 hover:text-white backdrop-blur-md border border-zinc-700 ${refreshingId === item.id ? 'animate-spin text-emerald-400' : ''}`}>
                              <RefreshCw size={14} />
                          </button>
                          <button onClick={() => setEditingItem(item)} className="p-2 rounded-full bg-black/60 text-zinc-300 hover:text-amber-400 backdrop-blur-md border border-zinc-700">
                              <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-full bg-black/60 text-zinc-300 hover:text-red-400 backdrop-blur-md border border-zinc-700">
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
                      
                      <div className="mt-3 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-600">
                          <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition">
                              Store Page <ExternalLink size={10} />
                          </a>
                          <span>{new Date(item.last_scraped_at).toLocaleDateString()}</span>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-[#0f0f10] border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                <h3 className="text-lg font-bold text-white">Edit Listing</h3>
                
                <div>
                    <label className="text-xs text-zinc-500 block mb-1">Product Name</label>
                    <input className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Price ($)</label>
                        <input type="number" step="0.01" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Status</label>
                        <select className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.in_stock} onChange={e => setEditingItem({...editingItem, in_stock: e.target.value === 'true'})}>
                            <option value="true">In Stock</option>
                            <option value="false">Out of Stock</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Pack Quantity</label>
                        <input type="number" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.qty_per_unit} onChange={e => setEditingItem({...editingItem, qty_per_unit: e.target.value})} />
                        <p className="text-[9px] text-zinc-600 mt-1">e.g. 1000 for primers, 500 for bullets</p>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Vendor Name</label>
                        <input className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-red-500 focus:outline-none" value={editingItem.vendor || ''} onChange={e => setEditingItem({...editingItem, vendor: e.target.value})} placeholder="e.g. MidwayUSA" />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingItem(null)} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition text-sm">Cancel</button>
                    <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-red-700 text-white font-bold hover:bg-red-600 transition text-sm">Save Changes</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
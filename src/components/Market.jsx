//===============================================================
//Script Name: Market.jsx
//Script Location: src/components/Market.jsx
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 3.0.0 (Tactical UI)
//About: Market Watch Dashboard.
//===============================================================

import { useEffect, useState } from 'react'
import { getMarketListings, createMarketListing, deleteMarketListing, refreshMarketListing, updateMarketListing } from '../lib/market'
import { Plus, Trash2, RefreshCw, ExternalLink, Tag, AlertCircle, CheckCircle, Search, Globe } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import { formatCurrency } from '../lib/db'

export function Market() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [newItemUrl, setNewItemUrl] = useState('')
  const [refreshingId, setRefreshingId] = useState(null)

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

  async function handleRefresh(id) {
      setRefreshingId(id)
      HAPTIC.click()
      try {
          await refreshMarketListing(id)
          HAPTIC.success()
          await loadData()
      } catch (e) { alert("Scan failed: " + e.message) }
      finally { setRefreshingId(null) }
  }

  async function handleDelete(id) {
      if(!confirm("Stop tracking this item?")) return
      HAPTIC.error()
      await deleteMarketListing(id)
      await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-emerald-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold mb-0.5">Supply Chain</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">MARKET WATCH</h2>
        </div>
      </div>

      {/* ADD BAR */}
      <div className="glass p-4 rounded-xl border border-zinc-800">
          <form onSubmit={handleAdd} className="flex gap-2">
              <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                      className="w-full bg-black/60 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-zinc-600"
                      placeholder="Paste Product URL (Midway, Brownells, etc)..."
                      value={newItemUrl}
                      onChange={e => setNewItemUrl(e.target.value)}
                  />
              </div>
              <button disabled={loading} type="submit" className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-6 rounded-xl transition flex items-center gap-2 text-sm">
                  {loading ? <RefreshCw size={16} className="animate-spin"/> : <Plus size={16}/>} Track
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
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-full bg-black/60 text-zinc-300 hover:text-red-400 backdrop-blur-md border border-zinc-700">
                              <Trash2 size={14} />
                          </button>
                      </div>
                      <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${item.in_stock ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-300' : 'bg-red-900/80 border-red-500/50 text-red-300'}`}>
                          {item.in_stock ? 'In Stock' : 'Out of Stock'}
                      </div>
                  </div>
                  
                  <div className="p-4">
                      <h3 className="text-sm font-bold text-zinc-200 line-clamp-1 mb-1" title={item.name}>{item.name}</h3>
                      <div className="flex justify-between items-end">
                          <div>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Price</p>
                              <p className="text-lg font-mono font-bold text-emerald-400">{formatCurrency(item.price)}</p>
                          </div>
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 text-zinc-500 hover:text-emerald-400 transition">
                              Visit Store <ExternalLink size={10} />
                          </a>
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[10px] text-zinc-600">
                          <span>Scanned: {new Date(item.last_scraped_at).toLocaleDateString()}</span>
                          {item.status === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10}/> Error</span>}
                      </div>
                  </div>
              </div>
          ))}
          {items.length === 0 && (
              <div className="col-span-full p-12 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-600">
                  <Tag size={48} className="mx-auto mb-4 opacity-50"/>
                  <p>No items tracked. Add a URL to begin monitoring.</p>
              </div>
          )}
      </div>
    </div>
  )
}
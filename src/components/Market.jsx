
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMarketListings, createMarketListing, deleteMarketListing, refreshMarketListing, updateMarketListing } from '../lib/market'
import { Plus, Trash2, RefreshCw, Edit, ExternalLink, Search, Globe, Lock, AlertTriangle } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import { formatCurrency } from '../lib/db'

// Known scraper compatibility by domain
const DOMAIN_COMPAT = {
  'midwayusa.com':        { level: 'blocked',  msg: 'MidwayUSA actively blocks scrapers — tracking will likely fail.' },
  'ammoseek.com':         { level: 'blocked',  msg: 'AmmoSeek is an aggregator, not a product page — tracking not supported.' },
  'brownells.com':        { level: 'ok',       msg: null },
  'grafs.com':            { level: 'ok',       msg: null },
  'powdervalleyinc.com':  { level: 'ok',       msg: null },
  'natchezss.com':        { level: 'ok',       msg: null },
  'midsouthshooterssupply.com': { level: 'warn', msg: 'Midsouth may return limited data — price and image may be incomplete.' },
  'cabelas.com':          { level: 'warn',     msg: 'Cabela\'s has bot protection — results may be incomplete.' },
  'basspro.com':          { level: 'warn',     msg: 'Bass Pro has bot protection — results may be incomplete.' },
  'amazon.com':           { level: 'blocked',  msg: 'Amazon blocks all scrapers — tracking will fail.' },
}

function getDomainCompat(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return DOMAIN_COMPAT[host] || null
  } catch { return null }
}

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
  const [addError, setAddError] = useState('')
  const [urlWarning, setUrlWarning] = useState(null)
  const [refreshingId, setRefreshingId] = useState(null)
  const [refreshErrors, setRefreshErrors] = useState({}) // id → error message
  const [editError, setEditError] = useState('')

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
      setAddError('')
      setLoading(true)
      try {
          await createMarketListing({ url: newItemUrl, name: 'Scanning...', componentType: 'other' })
          setNewItemUrl('')
          HAPTIC.success()
          await loadData()
      } catch (e) {
          setAddError(e.message || 'Failed to track item. Check the URL and try again.')
          HAPTIC.error()
      } finally { setLoading(false) }
  }

  async function handleRefresh(id) {
      setRefreshingId(id)
      setRefreshErrors(prev => { const n = {...prev}; delete n[id]; return n })
      HAPTIC.click()
      try {
          await refreshMarketListing(id)
          HAPTIC.success()
          await loadData()
      } catch (e) {
          setRefreshErrors(prev => ({ ...prev, [id]: e.message || 'Scan failed' }))
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
      setEditError('')

      const previousItems = [...items]
      setItems(prev => prev.map(item =>
          item.id === editingItem.id ? { ...item, ...editingItem } : item
      ))

      try {
          await updateMarketListing(editingItem.id, editingItem)
          setEditingItem(null)
          HAPTIC.success()
          await loadData()
      } catch (e) {
          setItems(previousItems)
          setEditError(e.message || 'Failed to save changes.')
          HAPTIC.error()
      }
  }

  // --- RENDER HELPERS ---

  if (!user) {
    return (
        <div className="space-y-6 mt-6">
            <div className="glass p-8 border border-red-500/20 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                    <Lock size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-[var(--text-hi)]">Authentication Required</h3>
                    <p className="text-steel-400 text-sm mt-2 max-w-md mx-auto">
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
      <div className="glass p-4 rounded-xl border border-steel-700">
          <form onSubmit={handleAdd} className="flex gap-2">
              <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" size={16} />
                  <input
                      className="w-full bg-black/60 border border-steel-600 rounded-xl pl-10 pr-4 py-3 text-sm text-steel-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 placeholder:text-steel-500"
                      placeholder="Paste Product URL (Midway, Brownells, etc)..."
                      value={newItemUrl}
                      onChange={e => {
                          setNewItemUrl(e.target.value)
                          if (addError) setAddError('')
                          setUrlWarning(getDomainCompat(e.target.value))
                      }}
                  />
              </div>
              <button disabled={loading} type="submit" className="bg-red-700 hover:bg-red-600 text-white font-bold px-3 md:px-6 rounded-xl transition flex items-center gap-2 text-sm">
                  {loading ? <RefreshCw size={16} className="animate-spin"/> : <Plus size={16}/>} <span className="hidden md:inline">Track</span>
              </button>
          </form>
          {urlWarning && urlWarning.msg && (
              <div className={`mt-2 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                  urlWarning.level === 'blocked'
                      ? 'text-red-400 bg-red-900/20 border border-red-800/40'
                      : 'text-amber-400 bg-amber-900/20 border border-amber-800/40'
              }`}>
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{urlWarning.msg}</span>
              </div>
          )}
          {addError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{addError}</span>
              </div>
          )}
      </div>

      {/* EMPTY STATE */}
      {items.length === 0 && !loading && (
           <p className="text-center text-steel-400 py-10">No items tracked. Paste a URL above to start.</p>
      )}

      {/* GROUPED LIST */}
      <div className="space-y-8">
        {groupedItems.map(group => (
            <div key={group.type.value}>
                {/* SECTION HEADER */}
                <h3 className="text-sm font-semibold text-steel-100 mb-2 uppercase tracking-wider border-b border-steel-700 pb-1 inline-block pr-4">
                    {group.type.label}
                </h3>

                {/* GRID */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map(item => {
                        const typeLabel = COMPONENT_TYPES.find(t => t.value === (item.componentType || 'other'))?.label || 'Other'
                        
                        const isError = item.status === 'error'
                        const refreshErr = refreshErrors[item.id]

                        return (
                            <div key={item.id} className={`border rounded-xl overflow-hidden group transition-all ${isError ? 'bg-red-950/20 border-red-800/50 hover:border-red-700/70' : 'bg-steel-800/40 border-steel-700 hover:border-steel-600'}`}>
                                <div className="h-32 bg-black relative">
                                    {isError ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-500/60 bg-red-950/30">
                                            <AlertTriangle size={28} />
                                            <span className="text-[10px] text-red-400/70 uppercase tracking-wider font-bold">Scan Failed</span>
                                        </div>
                                    ) : item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-steel-600"><Search size={32}/></div>
                                    )}

                                    {/* TYPE BADGE */}
                                    <div className="absolute top-2 left-2 z-10">
                                        <span className="text-[9px] px-2 py-[1px] rounded bg-red-900/60 border border-red-500/40 text-red-200 backdrop-blur-md uppercase tracking-wide font-bold shadow-lg shadow-black/50">
                                            {typeLabel}
                                        </span>
                                    </div>

                                    {/* ACTIONS (Top Right) */}
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button onClick={() => handleRefresh(item.id)} className={`rt-btn rt-btn-icon backdrop-blur-md ${refreshingId === item.id ? 'animate-spin text-steel-300' : ''}`}>
                                            <RefreshCw size={14} />
                                        </button>
                                        <button onClick={() => setEditingItem(item)} className="rt-btn rt-btn-icon backdrop-blur-md hover:text-steel-200 hover:border-steel-500">
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => promptDelete(item)} className="rt-btn rt-btn-icon backdrop-blur-md hover:text-red-400 hover:border-red-700">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* STATUS BADGE */}
                                    {!isError && (
                                        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${item.in_stock ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-300' : 'bg-red-900/80 border-red-500/50 text-red-300'}`}>
                                            {item.in_stock ? 'In Stock' : 'Out of Stock'}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h3 className={`text-sm font-bold line-clamp-1 flex-1 ${isError ? 'text-red-300' : 'text-steel-100'}`} title={item.name}>{item.name}</h3>
                                        {item.vendor && <span className="text-[9px] px-1.5 py-0.5 bg-steel-700 rounded text-steel-300 border border-steel-600 whitespace-nowrap">{item.vendor}</span>}
                                    </div>

                                    {isError ? (
                                        <p className="text-xs text-red-400/80 mt-1 mb-2">Could not retrieve price data. Try refreshing or check the URL.</p>
                                    ) : (
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] text-steel-400 uppercase tracking-wide">Price</p>
                                                <p className="text-lg font-mono font-bold text-steel-100">{formatCurrency(item.price)}</p>
                                            </div>
                                            {(item.qty_per_unit > 1 && item.price > 0) && (
                                                <div className="text-right">
                                                    <p className="text-[10px] text-steel-400 uppercase tracking-wide">Per Unit</p>
                                                    <p className="text-xs font-bold text-steel-200">{formatCurrency(item.price / item.qty_per_unit)}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {refreshErr && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2 py-1 mt-2">
                                            <AlertTriangle size={10} className="shrink-0" />
                                            <span className="truncate">{refreshErr}</span>
                                        </div>
                                    )}

                                    {/* FOOTER */}
                                    <div className="mt-3 pt-3 border-t border-steel-700/50 flex justify-between items-center text-[10px] text-steel-500">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rt-btn rt-btn-ghost hover:text-steel-200 hover:border-steel-500"
                                        >
                                            Store Page <ExternalLink size={10} />
                                        </a>
                                        <span>{item.last_scraped_at ? new Date(item.last_scraped_at).toLocaleDateString() : 'Never'}</span>
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
            <div className="glass border border-steel-600 w-full max-w-md p-6 space-y-4 shadow-2xl relative">
                
                <h3 className="text-lg font-bold text-[var(--text-hi)] flex items-center gap-2">
                    <Edit size={18} className="text-red-500"/> Edit Listing
                </h3>
                
                <div>
                    <label className="text-xs text-steel-400 block mb-1">Product Name</label>
                    <input className="w-full bg-[var(--bg)] border border-steel-700 rounded-lg p-2 text-sm text-[var(--text-hi)] focus:border-red-500 focus:outline-none" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-steel-400 block mb-1">Component Type</label>
                        <select 
                            className="w-full bg-[var(--bg)] border border-steel-700 rounded-lg p-2 text-sm text-[var(--text-hi)] focus:border-red-500 focus:outline-none"
                            value={editingItem.componentType || 'other'}
                            onChange={e => setEditingItem({...editingItem, componentType: e.target.value})}
                        >
                            {COMPONENT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-steel-400 block mb-1">Price ($)</label>
                        <input type="number" step="0.01" className="w-full bg-[var(--bg)] border border-steel-700 rounded-lg p-2 text-sm text-[var(--text-hi)] focus:border-red-500 focus:outline-none" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-steel-400 block mb-1">Pack Quantity</label>
                        <input type="number" className="w-full bg-[var(--bg)] border border-steel-700 rounded-lg p-2 text-sm text-[var(--text-hi)] focus:border-red-500 focus:outline-none" value={editingItem.qty_per_unit} onChange={e => setEditingItem({...editingItem, qty_per_unit: e.target.value})} />
                        <p className="text-[9px] text-steel-500 mt-1">e.g. 1000 for primers</p>
                    </div>
                    <div>
                        <label className="text-xs text-steel-400 block mb-1">Status</label>
                        <select className="w-full bg-[var(--bg)] border border-steel-700 rounded-lg p-2 text-sm text-[var(--text-hi)] focus:border-red-500 focus:outline-none" value={editingItem.in_stock ? 'true' : 'false'} onChange={e => setEditingItem({...editingItem, in_stock: e.target.value === 'true'})}>
                            <option value="true">In Stock</option>
                            <option value="false">Out of Stock</option>
                        </select>
                    </div>
                </div>

                <div>
                     <label className="text-xs text-steel-400 block mb-1">Vendor Name</label>
                     <input className="w-full bg-[var(--bg)] border border-steel-700 rounded-lg p-2 text-sm text-[var(--text-hi)] focus:border-red-500 focus:outline-none" value={editingItem.vendor || ''} onChange={e => setEditingItem({...editingItem, vendor: e.target.value})} placeholder="e.g. MidwayUSA" />
                </div>

                {editError && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>{editError}</span>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button onClick={() => { setEditingItem(null); setEditError('') }} className="flex-1 py-2 rounded-lg border border-steel-600 text-steel-300 hover:text-white transition text-sm">Cancel</button>
                    <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-red-700 text-white font-bold hover:bg-red-600 transition text-sm">Save Changes</button>
                </div>
            </div>
        </div>, document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
            <div className="glass border border-red-900/50 w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="text-red-500" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[var(--text-hi)]">Stop Tracking?</h3>
                    <p className="text-sm text-steel-300 mt-1">
                        Are you sure you want to remove <span className="text-[var(--text-hi)] font-medium">{itemToDelete.name}</span> from your watch list?
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => setItemToDelete(null)} className="px-4 py-2 rounded-xl border border-steel-600 text-steel-200 hover:bg-steel-700 font-medium text-sm transition">Cancel</button>
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

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getMarketListings, createMarketListing, deleteMarketListing, refreshMarketListing, updateMarketListing } from '../lib/market'
import { Plus, Trash2, RefreshCw, Edit, ExternalLink, Search, Globe, Lock, AlertTriangle, TrendingDown, Package, ShieldAlert, Eye } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import { formatCurrency } from '../lib/db'

// ── DOMAIN COMPATIBILITY ─────────────────────────────────────────
const DOMAIN_COMPAT = {
  'midwayusa.com':              { level: 'blocked', msg: 'MidwayUSA actively blocks scrapers — tracking will likely fail.' },
  'amazon.com':                 { level: 'blocked', msg: 'Amazon blocks all scrapers — tracking will fail.' },
  'ammoseek.com':               { level: 'blocked', msg: 'AmmoSeek is an aggregator, not a product page.' },
  'midsouthshooterssupply.com': { level: 'warn',    msg: 'Midsouth may return limited data — price or image may be incomplete.' },
  'cabelas.com':                { level: 'warn',    msg: "Cabela's has bot protection — results may be incomplete." },
  'basspro.com':                { level: 'warn',    msg: 'Bass Pro has bot protection — results may be incomplete.' },
  'brownells.com':              { level: 'ok',      msg: null },
  'grafs.com':                  { level: 'ok',      msg: null },
  'powdervalleyinc.com':        { level: 'ok',      msg: null },
  'natchezss.com':              { level: 'ok',      msg: null },
}

function getDomainCompat(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return DOMAIN_COMPAT[host] || null
  } catch { return null }
}

// ── CONSTANTS ─────────────────────────────────────────────────────
const COMPONENT_TYPES = [
  { value: 'powder', label: 'Powder' },
  { value: 'bullet', label: 'Bullets' },
  { value: 'primer', label: 'Primers' },
  { value: 'case',   label: 'Cases / Brass' },
  { value: 'ammo',   label: 'Factory Ammo' },
  { value: 'other',  label: 'Other' },
]

function timeAgo(dateStr) {
  if (!dateStr) return 'Never scanned'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'Just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── INPUT CLASSES ─────────────────────────────────────────────────
const inputCls = 'w-full bg-[var(--bg)] border border-steel-700 rounded p-2 text-sm text-[var(--text-hi)] focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20'
const selectCls = inputCls

// ── MARKET CARD ───────────────────────────────────────────────────
function MarketCard({ item, refreshingId, refreshErrors, onRefresh, onEdit, onDelete }) {
  const isError    = item.status === 'error'
  const isSpinning = refreshingId === item.id
  const refreshErr = refreshErrors[item.id]
  const typeLabel  = COMPONENT_TYPES.find(t => t.value === (item.componentType || 'other'))?.label || 'Other'
  const qty        = parseInt(item.qty_per_unit) || 1
  const perUnit    = qty > 1 && item.price > 0
    ? formatCurrency(item.price / qty)
    : null

  return (
    <div className={`rt-card group flex flex-col transition-all duration-150 ${isError ? 'border-red-900/60' : ''}`}>
      {/* Accent line */}
      <div className={`h-[2px] w-full ${isError ? 'bg-red-900/60' : item.in_stock ? 'bg-gradient-to-r from-emerald-700 via-emerald-500 to-transparent' : 'bg-gradient-to-r from-steel-700 via-steel-600 to-transparent'}`} />

      {/* IMAGE */}
      <div className="relative h-36 bg-[var(--bg)] overflow-hidden">
        {isError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-700/60">
            <ShieldAlert size={28} />
            <span className="text-[10px] uppercase tracking-widest font-bold text-red-600/50">Scan Failed</span>
          </div>
        ) : item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-contain p-3 opacity-90 group-hover:opacity-100 transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-steel-700">
            <Package size={36} />
          </div>
        )}

        {/* TYPE BADGE */}
        <div className="absolute top-2 left-2">
          <span className="text-[9px] px-2 py-[2px] rounded-sm bg-[var(--bg)]/90 border border-[var(--border-md)] text-[var(--text-md)] uppercase tracking-widest font-bold backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>

        {/* ACTION BUTTONS */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onRefresh(item.id)}
            title="Re-scan"
            className="rt-btn rt-btn-icon backdrop-blur-sm bg-[var(--bg)]/80"
          >
            <RefreshCw size={13} className={isSpinning ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => onEdit(item)}
            title="Edit"
            className="rt-btn rt-btn-icon backdrop-blur-sm bg-[var(--bg)]/80"
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => onDelete(item)}
            title="Remove"
            className="rt-btn rt-btn-icon backdrop-blur-sm bg-[var(--bg)]/80 hover:text-red-400 hover:border-red-800"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* STOCK BADGE */}
        {!isError && (
          <div className={`absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-[3px] rounded-sm text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm
            ${item.in_stock
              ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400'
              : 'bg-[var(--bg)]/80 border-[var(--border)] text-[var(--text-md)]'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.in_stock ? 'bg-emerald-400 shadow-[0_0_4px_var(--dot-active)]' : 'bg-steel-600'}`} />
            {item.in_stock ? 'In Stock' : 'Out of Stock'}
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex flex-col flex-1 p-4">
        {/* NAME + VENDOR */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[var(--text-hi)] line-clamp-2 leading-snug flex-1" title={item.name}>
            {item.name}
          </h3>
          {item.vendor && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[var(--overlay)] border border-[var(--border)] text-[var(--text-md)] whitespace-nowrap shrink-0 uppercase tracking-wide">
              {item.vendor}
            </span>
          )}
        </div>

        {/* PRICE */}
        {isError ? (
          <p className="text-xs text-red-500/70 mb-3">Could not retrieve data. Try refreshing or check the URL.</p>
        ) : (
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="rt-label mb-0.5">Price</p>
              <p className="text-xl font-mono font-black text-[var(--text-hi)] leading-none">{formatCurrency(item.price)}</p>
            </div>
            {perUnit && (
              <div className="text-right">
                <p className="rt-label mb-0.5">Per Unit</p>
                <p className="text-sm font-mono font-bold text-[var(--text-md)]">{perUnit}</p>
              </div>
            )}
          </div>
        )}

        {/* REFRESH ERROR */}
        {refreshErr && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-950/30 border border-red-900/40 rounded px-2 py-1.5 mb-3">
            <AlertTriangle size={10} className="shrink-0" />
            <span className="truncate">{refreshErr}</span>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="rt-btn rt-btn-ghost text-[10px] flex items-center gap-1"
          >
            Store <ExternalLink size={9} />
          </a>
          <span className="text-[10px] text-[var(--text-lo)] font-mono">{timeAgo(item.last_scraped_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export function Market({ user }) {
  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshAllProgress, setRefreshAllProgress] = useState({ done: 0, total: 0 })
  const [newItemUrl,   setNewItemUrl]   = useState('')
  const [addError,     setAddError]     = useState('')
  const [urlWarning,   setUrlWarning]   = useState(null)
  const [refreshingId, setRefreshingId] = useState(null)
  const [refreshErrors, setRefreshErrors] = useState({})
  const [editingItem,  setEditingItem]  = useState(null)
  const [editError,    setEditError]    = useState('')
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting,   setIsDeleting]   = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

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
      setUrlWarning(null)
      HAPTIC.success()
      await loadData()
    } catch (e) {
      setAddError(e.message || 'Failed to track item. Check the URL and try again.')
      HAPTIC.error()
    } finally { setLoading(false) }
  }

  async function handleRefresh(id) {
    setRefreshingId(id)
    setRefreshErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    HAPTIC.click()
    try {
      await refreshMarketListing(id)
      HAPTIC.success()
      await loadData()
    } catch (e) {
      setRefreshErrors(prev => ({ ...prev, [id]: e.message || 'Scan failed' }))
      HAPTIC.error()
    } finally { setRefreshingId(null) }
  }

  async function handleRefreshAll() {
    if (refreshingAll || items.length === 0) return
    setRefreshingAll(true)
    setRefreshErrors({})
    setRefreshAllProgress({ done: 0, total: items.length })
    HAPTIC.click()

    const errors = {}
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        await refreshMarketListing(item.id)
      } catch (e) {
        errors[item.id] = e.message || 'Scan failed'
      }
      setRefreshAllProgress({ done: i + 1, total: items.length })
    }

    setRefreshErrors(errors)
    setRefreshingAll(false)
    HAPTIC.success()
    await loadData()
  }

  function promptDelete(item) { setItemToDelete(item); HAPTIC.click() }

  async function executeDelete() {
    if (!itemToDelete) return
    setIsDeleting(true)
    const previousItems = [...items]
    setItems(cur => cur.filter(i => i.id !== itemToDelete.id))
    try {
      await deleteMarketListing(itemToDelete.id)
      HAPTIC.success()
      setItemToDelete(null)
    } catch (e) {
      setItems(previousItems)
      HAPTIC.error()
    } finally { setIsDeleting(false) }
  }

  async function handleSaveEdit() {
    if (!editingItem) return
    setEditError('')
    const previousItems = [...items]
    setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...editingItem } : i))
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

  // ── AUTH GATE ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="space-y-6 mt-6">
        <div className="rt-section">
          <div className="rt-section-bar" />
          <div>
            <span className="rt-section-eyebrow">Pricing Intelligence</span>
            <h2 className="rt-section-title">MARKET WATCH</h2>
          </div>
        </div>
        <div className="glass p-10 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-900/40 flex items-center justify-center">
            <Lock size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-hi)]">Sign In Required</h3>
            <p className="text-sm text-[var(--text-md)] mt-1 max-w-xs mx-auto">
              Log in to track real-time component pricing from your favorite retailers.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── DERIVED STATE ──────────────────────────────────────────────
  const inStockCount  = items.filter(i => i.in_stock).length
  const outStockCount = items.filter(i => !i.in_stock && i.status !== 'error').length
  const errorCount    = items.filter(i => i.status === 'error').length

  const knownTypes  = COMPONENT_TYPES.map(t => t.value)
  const groupedItems = COMPONENT_TYPES.reduce((acc, type) => {
    const matches = items.filter(i => (i.componentType || 'other') === type.value)
    if (matches.length > 0) acc.push({ type, items: matches })
    return acc
  }, [])
  const orphans = items.filter(i => !knownTypes.includes(i.componentType || 'other'))
  if (orphans.length > 0) {
    const og = groupedItems.find(g => g.type.value === 'other')
    if (og) og.items.push(...orphans)
    else groupedItems.push({ type: COMPONENT_TYPES.find(t => t.value === 'other'), items: orphans })
  }

  return (
    <div className="space-y-6 pb-12">

      {/* ── HEADER ── */}
      <div className="flex items-end justify-between gap-4">
        <div className="rt-section mb-0">
          <div className="rt-section-bar" />
          <div>
            <span className="rt-section-eyebrow">Pricing Intelligence</span>
            <h2 className="rt-section-title">MARKET WATCH</h2>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll}
            className="rt-btn flex items-center gap-2 text-xs font-bold shrink-0 mb-1"
          >
            <RefreshCw size={13} className={refreshingAll ? 'animate-spin' : ''} />
            {refreshingAll
              ? `Scanning ${refreshAllProgress.done}/${refreshAllProgress.total}…`
              : 'Refresh All'
            }
          </button>
        )}
      </div>

      {/* ── STATS STRIP ── */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <div className="rt-card p-3 text-center">
            <p className="rt-label">Tracked</p>
            <p className="text-lg font-mono font-black text-[var(--text-hi)]">{items.length}</p>
          </div>
          <div className="rt-card p-3 text-center">
            <p className="rt-label">In Stock</p>
            <p className="text-lg font-mono font-black text-emerald-500">{inStockCount}</p>
          </div>
          <div className="rt-card p-3 text-center">
            <p className="rt-label">Out of Stock</p>
            <p className="text-lg font-mono font-black text-[var(--text-md)]">{outStockCount}</p>
          </div>
          {errorCount > 0 && (
            <div className="rt-card p-3 text-center border-red-900/40">
              <p className="rt-label">Errors</p>
              <p className="text-lg font-mono font-black text-red-500">{errorCount}</p>
            </div>
          )}
        </div>
      )}

      {/* ── ADD BAR ── */}
      <div className="glass p-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-lo)]" size={15} />
            <input
              className="w-full bg-[var(--bg)] border border-[var(--border-md)] rounded pl-9 pr-4 py-2.5 text-sm text-[var(--text-hi)] placeholder:text-[var(--text-lo)] focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600/20"
              placeholder="Paste product URL to track (Brownells, Powder Valley, Graf's…)"
              value={newItemUrl}
              onChange={e => {
                setNewItemUrl(e.target.value)
                if (addError) setAddError('')
                setUrlWarning(getDomainCompat(e.target.value))
              }}
            />
          </div>
          <button
            disabled={loading}
            type="submit"
            className="bg-[var(--red)] hover:bg-[var(--red-dim)] text-white font-bold px-3 sm:px-5 rounded transition flex items-center gap-2 text-sm shrink-0"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            <span className="hidden sm:inline">Track</span>
          </button>
        </form>

        {urlWarning?.msg && (
          <div className={`mt-2 flex items-start gap-2 text-xs rounded px-3 py-2 ${
            urlWarning.level === 'blocked'
              ? 'text-red-400 bg-red-950/40 border border-red-900/40'
              : 'text-amber-400 bg-amber-950/30 border border-amber-900/30'
          }`}>
            <AlertTriangle size={12} className="shrink-0 mt-[1px]" />
            <span>{urlWarning.msg}</span>
          </div>
        )}
        {addError && (
          <div className="mt-2 flex items-start gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded px-3 py-2">
            <AlertTriangle size={12} className="shrink-0 mt-[1px]" />
            <span>{addError}</span>
          </div>
        )}
      </div>

      {/* ── EMPTY STATE ── */}
      {items.length === 0 && !loading && (
        <div className="glass p-12 flex flex-col items-center text-center gap-4">
          <Eye size={32} className="text-[var(--text-lo)]" />
          <div>
            <p className="text-sm font-bold text-[var(--text-hi)]">Nothing tracked yet</p>
            <p className="text-xs text-[var(--text-md)] mt-1">Paste a product URL above to start watching prices.</p>
          </div>
        </div>
      )}

      {/* ── GROUPED CARDS ── */}
      <div className="space-y-8">
        {groupedItems.map(group => (
          <div key={group.type.value}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[2px] self-stretch bg-gradient-to-b from-[var(--red)] to-transparent rounded-full" />
              <h3 className="text-xs font-bold text-[var(--text-md)] uppercase tracking-[0.2em]">
                {group.type.label}
              </h3>
              <span className="text-[10px] font-mono text-[var(--text-lo)]">{group.items.length}</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.items.map(item => (
                <MarketCard
                  key={item.id}
                  item={item}
                  refreshingId={refreshingId}
                  refreshErrors={refreshErrors}
                  onRefresh={handleRefresh}
                  onEdit={setEditingItem}
                  onDelete={promptDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── EDIT MODAL ── */}
      {editingItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[var(--scrim-bg)] backdrop-blur-sm p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="glass w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-[var(--text-hi)] flex items-center gap-2 uppercase tracking-widest">
              <Edit size={14} className="text-[var(--red)]" /> Edit Listing
            </h3>

            <div>
              <label className="rt-label block mb-1">Product Name</label>
              <input className={inputCls} value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="rt-label block mb-1">Type</label>
                <select className={selectCls} value={editingItem.componentType || 'other'} onChange={e => setEditingItem({ ...editingItem, componentType: e.target.value })}>
                  {COMPONENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="rt-label block mb-1">Price ($)</label>
                <input type="number" step="0.01" className={inputCls} value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="rt-label block mb-1">Pack Qty</label>
                <input type="number" step="1" className={inputCls} value={parseInt(editingItem.qty_per_unit) || 1} onChange={e => setEditingItem({ ...editingItem, qty_per_unit: parseInt(e.target.value) || 1 })} />
                <p className="text-[10px] text-[var(--text-lo)] mt-1">e.g. 1000 for primers</p>
              </div>
              <div>
                <label className="rt-label block mb-1">Status</label>
                <select className={selectCls} value={editingItem.in_stock ? 'true' : 'false'} onChange={e => setEditingItem({ ...editingItem, in_stock: e.target.value === 'true' })}>
                  <option value="true">In Stock</option>
                  <option value="false">Out of Stock</option>
                </select>
              </div>
            </div>

            <div>
              <label className="rt-label block mb-1">Vendor</label>
              <input className={inputCls} value={editingItem.vendor || ''} onChange={e => setEditingItem({ ...editingItem, vendor: e.target.value })} placeholder="e.g. Brownells" />
            </div>

            {editError && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded px-3 py-2">
                <AlertTriangle size={12} className="shrink-0 mt-[1px]" />
                <span>{editError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setEditingItem(null); setEditError('') }} className="flex-1 py-2 rounded border border-[var(--border-md)] text-[var(--text-md)] hover:text-[var(--text-hi)] transition text-sm">Cancel</button>
              <button onClick={handleSaveEdit} className="flex-1 py-2 rounded bg-[var(--red)] hover:bg-[var(--red-dim)] text-white font-bold transition text-sm">Save</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── DELETE MODAL ── */}
      {itemToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[var(--scrim-bg)] backdrop-blur-sm p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="glass w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-hi)]">Stop Tracking?</h3>
              <p className="text-sm text-[var(--text-md)] mt-1">
                Remove <span className="text-[var(--text-hi)] font-semibold">{itemToDelete.name}</span> from your watch list?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setItemToDelete(null)} className="py-2 rounded border border-[var(--border-md)] text-[var(--text-md)] hover:text-[var(--text-hi)] font-medium text-sm transition">Cancel</button>
              <button onClick={executeDelete} disabled={isDeleting} className="py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition">
                {isDeleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

    </div>
  )
}

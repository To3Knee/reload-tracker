//===============================================================
//Script Name: Batches.jsx
//Script Location: src/components/Batches.jsx
//Date: 02/25/2026
//Created By: T03KNEE
//Version: 3.0.0 (Production Log Redesign)
//About: Production Log — stats banner + timeline layout.
//  - Lifetime rounds, monthly production, top caliber stats
//  - Timeline entry cards with component type chips
//  - Inline note editing with confirmation
//===============================================================

import { useEffect, useState, useMemo } from 'react'
import { getBatches, deleteBatch, updateBatch } from '../lib/batches'
import { printBatchLabel } from '../lib/labels'
import { getCurrentUser, ROLE_ADMIN } from '../lib/auth'
import { Printer, Edit2, Trash2, Check, X, ChevronDown, ChevronUp, Layers } from 'lucide-react'

/* ── COMPONENT TYPE CHIP ────────────────────────────────────── */
function ComponentChips({ components = '' }) {
  if (!components) return null
  // "Varget / Hornady 147gr / Fed GM210M / Lapua"  → split by / or ,
  const parts = components.split(/[/,]/).map(s => s.trim()).filter(Boolean)
  if (!parts.length) return null
  // Guess type from position (powder, bullet, primer, brass)
  const types = ['powder', 'bullet', 'primer', 'brass']
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {parts.map((p, i) => (
        <span key={i} className={`rt-chip rt-chip-${types[i] || 'other'}`}>{p}</span>
      ))}
    </div>
  )
}

/* ── ROUND COUNT BAR ────────────────────────────────────────── */
function RoundBar({ count, max }) {
  const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0
  return (
    <div className="mt-2 h-[2px] w-full rounded-full bg-[#1e1e1e] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #b87333, #d4a843)',
        }}
      />
    </div>
  )
}

/* ── MAIN COMPONENT ─────────────────────────────────────────── */
export function Batches({ highlightId }) {
  const [batches,       setBatches]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [isAdmin,       setIsAdmin]       = useState(false)
  const [editingId,     setEditingId]     = useState(null)
  const [editNotes,     setEditNotes]     = useState('')
  const [verifyDeleteId, setVerifyDeleteId] = useState(null)
  const [expanded,      setExpanded]      = useState({})

  useEffect(() => {
    const controller = new AbortController()
    checkAdmin()
    loadHistory(controller.signal)
    return () => controller.abort()
  }, [])

  // Scroll-to-highlight
  useEffect(() => {
    if (highlightId && batches.length > 0) {
      const el = document.getElementById(`batch-${highlightId}`)
      if (el) {
        const id = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600)
        return () => clearTimeout(id)
      }
    }
  }, [highlightId, batches])

  async function checkAdmin() {
    const user = await getCurrentUser()
    setIsAdmin(user && user.role === ROLE_ADMIN)
  }

  async function loadHistory(signal) {
    try {
      setLoading(true)
      const data = await getBatches(signal)
      setBatches(data)
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Unable to load batch history.')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(batch) {
    setEditingId(batch.id)
    setEditNotes(batch.notes || '')
    setVerifyDeleteId(null)
  }

  function cancelEdit() { setEditingId(null); setEditNotes('') }

  async function saveEdit(id) {
    try {
      await updateBatch(id, { notes: editNotes })
      setBatches(prev => prev.map(b => b.id === id ? { ...b, notes: editNotes } : b))
      setEditingId(null)
    } catch (err) { console.error(err) }
  }

  async function handleRemove(id) {
    setVerifyDeleteId(null)
    try {
      await deleteBatch(id)
      setBatches(prev => prev.filter(b => b.id !== id))
    } catch (err) { console.error(err) }
  }

  const handlePrint = (batch) => printBatchLabel({ ...batch, recipe: batch.recipe || 'Custom Load', components: batch.components || '', date: batch.date })

  /* ── STATS ── */
  const stats = useMemo(() => {
    if (!batches.length) return null
    const total = batches.reduce((s, b) => s + (Number(b.rounds) || 0), 0)
    const now   = new Date()
    const thisMonth = batches
      .filter(b => { const d = new Date(b.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
      .reduce((s, b) => s + (Number(b.rounds) || 0), 0)
    // Top caliber from recipe name heuristic
    const caliberMap = {}
    batches.forEach(b => {
      const cal = (b.caliber || b.recipe || '').split(' ')[0] || 'Unknown'
      caliberMap[cal] = (caliberMap[cal] || 0) + (Number(b.rounds) || 0)
    })
    const topCal = Object.entries(caliberMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const maxBatch = Math.max(...batches.map(b => Number(b.rounds) || 0))
    return { total, thisMonth, topCal, maxBatch }
  }, [batches])

  /* ── FORMAT DATE ── */
  const fmtDate = (d) => {
    if (!d) return '—'
    const date = new Date(d.includes('T') ? d : d + 'T12:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">

      {/* ── SECTION HEADER ── */}
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Production</span>
          <h2 className="rt-section-title">BATCH LOG</h2>
        </div>
      </div>

      {/* ── STATS BANNER ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rt-stat rt-card-accent">
            <span className="rt-stat-label">Total Produced</span>
            <span className="rt-stat-value rt-data">{stats.total.toLocaleString()}</span>
            <span className="rt-stat-sub">rounds lifetime</span>
          </div>
          <div className="rt-stat">
            <span className="rt-stat-label">This Month</span>
            <span className="rt-stat-value rt-data">{stats.thisMonth.toLocaleString()}</span>
            <span className="rt-stat-sub">rounds loaded</span>
          </div>
          <div className="rt-stat">
            <span className="rt-stat-label">Top Load</span>
            <span className="rt-stat-value text-[1.1rem] leading-tight text-[#b87333] tracking-tight">{stats.topCal}</span>
            <span className="rt-stat-sub">by volume</span>
          </div>
        </div>
      )}

      {/* ── BATCH LIST ── */}
      <div className="rt-card p-0 overflow-hidden">
        {loading && (
          <div className="px-6 py-8 text-center text-[11px] text-[#4a4844] uppercase tracking-[0.2em] animate-pulse">
            Loading production log…
          </div>
        )}
        {error && (
          <div className="px-6 py-4 text-[11px] text-red-400 border-b border-[#1e1e1e]">{error}</div>
        )}
        {!loading && batches.length === 0 && !error && (
          <div className="px-6 py-12 text-center space-y-2">
            <Layers size={28} className="mx-auto text-[#2a2a2a]" />
            <p className="text-[11px] text-[#3a3a3a] uppercase tracking-[0.2em]">No batches recorded</p>
            <p className="text-[10px] text-[#2a2a2a]">Save a recipe and press "Load Batch" to begin.</p>
          </div>
        )}

        {/* Timeline */}
        <div className="divide-y divide-steel-600">
          {batches.map((batch, idx) => {
            const isEditing    = editingId === batch.id
            const isHighlighted = String(highlightId) === String(batch.id)
            const isExpanded   = expanded[batch.id]
            const attribution  = batch.updatedBy
              ? `Updated · ${batch.updatedBy}`
              : batch.createdBy ? `${batch.createdBy}` : null

            return (
              <div
                id={`batch-${batch.id}`}
                key={batch.id}
                className={`relative transition-colors duration-300 ${isHighlighted ? 'bg-[#1a1400]' : 'hover:bg-[#0f0f0f]'}`}
              >
                {/* Highlight accent */}
                {isHighlighted && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#d4a843]" />
                )}

                {/* Main row */}
                <div className="flex items-start gap-4 px-5 py-4">

                  {/* Round count column */}
                  <div className="flex-shrink-0 text-center w-16">
                    <div className="text-[1.6rem] font-black leading-none rt-data">
                      {batch.rounds}
                    </div>
                    <div className="text-[7px] text-[#4a4844] uppercase tracking-[0.18em] mt-0.5">rds</div>
                    <RoundBar count={Number(batch.rounds)} max={stats?.maxBatch || 1} />
                  </div>

                  {/* Info column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[8px] text-[#3a3a3a] font-mono">#{batch.id}</span>
                      <h3 className="text-[13px] font-bold text-[#f0ece4] truncate leading-tight">
                        {batch.recipe || 'Custom Load'}
                      </h3>
                    </div>
                    <ComponentChips components={batch.components} />
                    {!isExpanded && batch.notes && (
                      <p className="text-[10px] text-[#4a4844] italic mt-1.5 line-clamp-1 pl-2 border-l border-[#2a2a2a]">
                        {batch.notes}
                      </p>
                    )}
                  </div>

                  {/* Date + actions column */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <span className="text-[9px] text-[#4a4844] font-mono tracking-wide whitespace-nowrap">
                      {fmtDate(batch.date)}
                    </span>
                    {attribution && (
                      <span className="text-[8px] text-[#2a2a2a] tracking-wide">{attribution}</span>
                    )}
                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePrint(batch)}
                          className="rt-btn rt-btn-ghost rt-btn-icon"
                          title="Print Label"
                        >
                          <Printer size={11} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setExpanded(p => ({ ...p, [batch.id]: !p[batch.id] }))}
                              className="rt-btn rt-btn-ghost rt-btn-icon"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                            {verifyDeleteId === batch.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleRemove(batch.id)} className="rt-btn rt-btn-danger" style={{ padding: '4px 8px', fontSize: '9px' }}>
                                  Confirm
                                </button>
                                <button onClick={() => setVerifyDeleteId(null)} className="rt-btn rt-btn-ghost" style={{ padding: '4px 8px', fontSize: '9px' }}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setVerifyDeleteId(batch.id)}
                                className="rt-btn rt-btn-ghost rt-btn-icon text-[#5a1515] hover:text-[#e05252] hover:border-[#5a1515]"
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded edit panel */}
                {isExpanded && isAdmin && (
                  <div className="px-5 pb-4 border-t border-[#1a1a1a] bg-[#0c0c0c]">
                    {isEditing ? (
                      <div className="pt-3 space-y-2">
                        <label className="rt-label">Notes</label>
                        <textarea
                          className="rt-input text-[11px]"
                          rows={3}
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Add production notes…"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(batch.id)} className="rt-btn rt-btn-confirm">
                            <Check size={10} /> Save
                          </button>
                          <button onClick={cancelEdit} className="rt-btn rt-btn-ghost">
                            <X size={10} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 flex items-start justify-between gap-4">
                        <p className="text-[11px] text-[#6a6460] italic flex-1">
                          {batch.notes || <span className="text-[#3a3a3a]">No notes recorded.</span>}
                        </p>
                        <button onClick={() => startEdit(batch)} className="rt-btn rt-btn-ghost" style={{ padding: '5px 10px' }}>
                          <Edit2 size={10} /> Edit Notes
                        </button>
                      </div>
                    )}
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

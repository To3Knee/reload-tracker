//===============================================================
//Script Name: Batches.jsx
//Script Location: src/components/Batches.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.5.1
//About: Displays the history of loaded ammo batches.
//       Updated: Fixed ID type mismatch & added Pulse animation.
//===============================================================

import { useEffect, useState } from 'react'
import { getBatches, deleteBatch, updateBatch } from '../lib/batches'
import { printBatchLabel } from '../lib/labels'
import { getCurrentUser, ROLE_ADMIN } from '../lib/auth'
import { History, Printer } from 'lucide-react'

export function Batches({ highlightId }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    checkAdmin()
    loadHistory()
  }, [])

  useEffect(() => {
    if (highlightId && batches.length > 0) {
      // FIX: Ensure string-to-string comparison for ID
      const targetId = String(highlightId)
      const el = document.getElementById(`batch-${targetId}`)
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 600)
      }
    }
  }, [highlightId, batches])

  async function checkAdmin() {
    const user = await getCurrentUser()
    setIsAdmin(user && user.role === ROLE_ADMIN)
  }

  async function loadHistory() {
    try {
      setLoading(true)
      const data = await getBatches()
      setBatches(data)
    } catch (err) {
      console.error(err)
      setError('Unable to load batch history. Are you logged in?')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(batch) {
    setEditingId(batch.id)
    setEditNotes(batch.notes || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditNotes('')
  }

  async function saveEdit(id) {
    try {
        await updateBatch(id, { notes: editNotes })
        setBatches(prev => prev.map(b => b.id === id ? { ...b, notes: editNotes } : b))
        setEditingId(null)
    } catch (err) {
        alert(err.message)
    }
  }

  async function handleRemove(id) {
    if (!window.confirm('Remove this batch entry? (Inventory will NOT be refunded)')) return
    try {
        await deleteBatch(id)
        setBatches(prev => prev.filter(b => b.id !== id))
    } catch (err) {
        alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-3">
        <span className="block glow-red">Batch Log</span>
      </h2>
      
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
            <History className="text-slate-500" />
            <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recent Activity</p>
                <p className="text-sm text-slate-400">A record of every round you have ever loaded.</p>
            </div>
        </div>

        {loading && <div className="text-sm text-slate-500 animate-pulse">Loading history...</div>}
        {error && <div className="text-sm text-red-400">{error}</div>}
        
        {!loading && !error && batches.length === 0 && (
            <div className="text-sm text-slate-500 border border-dashed border-slate-800 p-4 rounded-xl">
                No batches found. Go to <strong>Recipes</strong> and click "Load Batch" to log your first session.
            </div>
        )}

        <div className="space-y-3">
          {batches.map(batch => {
            const isEditing = editingId === batch.id
            // FIX: Loose equality for ID comparison
            const isHighlighted = String(highlightId) === String(batch.id)

            return (
                <div 
                    id={`batch-${batch.id}`} // ID for scrolling
                    key={batch.id} 
                    className={`bg-black/40 border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition duration-500 ${
                        isHighlighted
                          ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-[1.02]'
                          : 'border-slate-800 hover:border-slate-600'
                    }`}
                >
                {/* Date & Quantity */}
                <div className="flex items-center gap-4 min-w-[120px]">
                    <div className="text-center bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800">
                        <span className="block text-[10px] uppercase text-slate-500 tracking-wider">Date</span>
                        <span className="block text-sm font-bold text-slate-200">{batch.date}</span>
                    </div>
                    <div>
                        <span className="block text-2xl font-black text-emerald-400">{batch.rounds}</span>
                        <span className="text-[10px] text-emerald-500/70 uppercase tracking-wider">Rounds</span>
                    </div>
                </div>

                {/* Recipe Info & Notes */}
                <div className="flex-1 w-full">
                    <h3 className="text-sm font-bold text-slate-100">{batch.recipe}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        <span className="text-slate-600">Components:</span> {batch.components || 'Unknown'}
                    </p>
                    
                    {isEditing ? (
                        <div className="mt-2">
                            <textarea 
                                className="w-full bg-black/50 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Add notes..."
                            />
                            <div className="flex gap-2 mt-2">
                                <span onClick={() => saveEdit(batch.id)} className="px-2 py-[2px] rounded-full bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 cursor-pointer text-[10px]">Save</span>
                                <span onClick={cancelEdit} className="px-2 py-[2px] rounded-full bg-black/40 border border-slate-700 text-slate-400 hover:bg-slate-800 cursor-pointer text-[10px]">Cancel</span>
                            </div>
                        </div>
                    ) : (
                        batch.notes && (
                            <p className="text-xs text-slate-500 mt-1 italic">"{batch.notes}"</p>
                        )
                    )}
                </div>

                {/* Actions */}
                {!isEditing && (
                    <div className="flex items-center gap-2 self-start md:self-center">
                        <span 
                            onClick={() => printBatchLabel(batch)}
                            className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 text-slate-300 hover:text-emerald-300 transition cursor-pointer text-[10px] flex items-center gap-1"
                        >
                            <Printer size={10} /> Label
                        </span>

                        {isAdmin && (
                            <>
                                <span 
                                    onClick={() => startEdit(batch)}
                                    className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 text-slate-400 transition cursor-pointer text-[10px]"
                                >
                                    Edit
                                </span>
                                <span 
                                    onClick={() => handleRemove(batch.id)}
                                    className="px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-300 hover:bg-red-900/40 transition cursor-pointer text-[10px]"
                                >
                                    Remove
                                </span>
                            </>
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
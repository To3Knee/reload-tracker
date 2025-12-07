//===============================================================
//Script Name: Batches.jsx
//Script Location: src/components/Batches.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.1.0
//About: Displays the history of loaded ammo batches.
//       Updated: Removed popups, fixed mobile date issues.
//===============================================================

import { useEffect, useState } from 'react'
import { getBatches, deleteBatch, updateBatch } from '../lib/batches'
import { printBatchLabel } from '../lib/labels'
import { getCurrentUser, ROLE_ADMIN } from '../lib/auth'
import { Printer, Edit, Trash2, User, Clock } from 'lucide-react'

export function Batches({ highlightId }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editNotes, setEditNotes] = useState('')
  
  // Safe Delete State
  const [verifyDeleteId, setVerifyDeleteId] = useState(null)

  useEffect(() => {
    checkAdmin()
    loadHistory()
  }, [])

  useEffect(() => {
    if (highlightId && batches.length > 0) {
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
      setError('Unable to load batch history.')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(batch) {
    setEditingId(batch.id)
    setEditNotes(batch.notes || '')
    setVerifyDeleteId(null)
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
        loadHistory() 
    } catch (err) {
        console.error(err)
    }
  }

  async function handleRemove(id) {
    setVerifyDeleteId(null)
    try {
        await deleteBatch(id)
        setBatches(prev => prev.filter(b => b.id !== id))
    } catch (err) {
        console.error(err)
    }
  }

  const handlePrint = (batch) => {
    const labelData = {
        ...batch,
        recipe: batch.recipe || 'Custom Load',
        components: batch.components || '',
        date: batch.date
    }
    printBatchLabel(labelData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Production</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">BATCHES</h2>
        </div>
      </div>
      
      <div className="glass rounded-2xl p-6">
        {loading && <div className="text-sm text-slate-500 animate-pulse">Loading history...</div>}
        {!loading && batches.length === 0 && <div className="text-sm text-slate-500 text-center py-8">No batches found.</div>}

        <div className="space-y-3">
          {batches.map(batch => {
            const isEditing = editingId === batch.id
            const isHighlighted = String(highlightId) === String(batch.id)
            const attribution = batch.updatedBy ? `Updated by ${batch.updatedBy}` : batch.createdBy ? `Created by ${batch.createdBy}` : null

            return (
                <div 
                    id={`batch-${batch.id}`}
                    key={batch.id} 
                    className={`bg-black/40 border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start justify-between transition duration-500 ${
                        isHighlighted ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-slate-800 hover:border-slate-700'
                    }`}
                >
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

                <div className="flex-1 w-full">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span className="text-slate-500">#{batch.id}</span> <span className="text-slate-600">-</span> {batch.recipe}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1"><span className="text-slate-600">Components:</span> {batch.components || 'Unknown'}</p>
                    
                    {isEditing ? (
                        <div className="mt-2">
                            <textarea 
                                className="w-full bg-black/50 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-red-500 focus:outline-none"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Add notes..."
                            />
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => saveEdit(batch.id)} className="px-3 py-1 rounded-full bg-red-900/40 border border-red-500/40 text-red-200 hover:bg-red-900/60 cursor-pointer text-[10px]">Save</button>
                                <button onClick={cancelEdit} className="px-3 py-1 rounded-full bg-black/40 border border-slate-700 text-slate-400 hover:bg-slate-800 cursor-pointer text-[10px]">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        batch.notes && <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-800 pl-2">"{batch.notes}"</p>
                    )}

                    {attribution && (
                        <div className="mt-2 pt-2 border-t border-slate-800/50 flex">
                             <span className="flex items-center gap-1 text-[9px] text-slate-500 px-2 py-0.5 bg-black/20 rounded-full border border-slate-800">
                                {batch.updatedBy ? <Clock size={10}/> : <User size={10}/>} {attribution}
                            </span>
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex items-center gap-2 self-start md:self-center">
                        <button onClick={() => handlePrint(batch)} className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 text-slate-300 hover:text-emerald-300 transition cursor-pointer text-[10px] flex items-center gap-1"><Printer size={10} /> Label</button>
                        {isAdmin && (
                            <>
                                <button onClick={() => startEdit(batch)} className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 text-slate-400 transition cursor-pointer text-[10px] flex items-center gap-1"><Edit size={10} /> Edit</button>
                                
                                {/* INLINE DELETE CONFIRMATION */}
                                {verifyDeleteId === batch.id ? (
                                    <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                        <button onClick={() => handleRemove(batch.id)} className="px-2 py-[2px] rounded-full bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition">Yes</button>
                                        <button onClick={() => setVerifyDeleteId(null)} className="px-2 py-[2px] rounded-full bg-slate-800 text-slate-400 text-[10px] hover:bg-slate-700 transition">No</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setVerifyDeleteId(batch.id)} className="px-2 py-[2px] rounded-full bg-black/60 border border-red-900/50 text-red-400 hover:bg-red-900/30 transition cursor-pointer text-[10px] flex items-center gap-1"><Trash2 size={10} /> Remove</button>
                                )}
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
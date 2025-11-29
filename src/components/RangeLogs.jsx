//===============================================================
//Script Name: RangeLogs.jsx
//Script Location: src/components/RangeLogs.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.1.0
//About: Interface for logging and viewing range performance.
//       Updated: Added Edit/Update functionality.
//===============================================================

import { useEffect, useState } from 'react'
import { getRangeLogs, createRangeLog, updateRangeLog, deleteRangeLog } from '../lib/range'
import { getBatches } from '../lib/batches'
import { Target, Plus, Trash2, Wind, Thermometer } from 'lucide-react'

export function RangeLogs({ recipes = [], canEdit }) {
  const [logs, setLogs] = useState([])
  const [batchList, setBatchList] = useState([])
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const DEFAULT_FORM = {
    recipeId: '', 
    batchId: '', 
    date: new Date().toISOString().slice(0,10),
    distance: 100, 
    groupSize: '', 
    velocity: '', 
    sd: '', 
    es: '',
    weather: '', 
    temp: '', 
    notes: '',
    imageUrl: ''
  }

  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const logData = await getRangeLogs()
      setLogs(logData)
      const batchData = await getBatches()
      setBatchList(batchData)
    } catch (e) { console.error(e) }
  }

  function handleStartEdit(log) {
    setEditingId(log.id)
    setForm({
        recipeId: log.recipeId || '',
        batchId: log.batchId || '',
        date: log.date || '',
        distance: log.distance || '',
        groupSize: log.groupSize || '',
        velocity: log.velocity || '',
        sd: log.sd || '',
        es: log.es || '',
        weather: log.weather || '',
        temp: log.temp || '',
        notes: log.notes || '',
        imageUrl: log.imageUrl || ''
    })
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setIsFormOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingId) {
          await updateRangeLog(editingId, form)
      } else {
          await createRangeLog(form)
      }
      handleCancel()
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDelete(id) {
    if(!window.confirm('Delete this range log?')) return
    await deleteRangeLog(id)
    loadData()
  }

  const calculateMoa = (group, dist) => {
    const g = Number(group)
    const d = Number(dist)
    if (!g || !d) return '—'
    const moa = (g / (d / 100)) * 0.955 
    return moa.toFixed(2) + ' MOA'
  }

  const inputClass = "w-full bg-[#1a1a1a] border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-slate-600"
  const labelClass = "block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <span className="block glow-red">Range Log</span>
        </h2>
        {canEdit && !isFormOpen && (
            <button 
                onClick={() => { setForm(DEFAULT_FORM); setIsFormOpen(true); }} 
                className="px-4 py-2 rounded-full bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 hover:bg-red-600 transition"
            >
                <Plus size={14} /> Add Log
            </button>
        )}
      </div>

      {/* ADD/EDIT FORM */}
      {isFormOpen && (
        <div className="glass rounded-2xl p-6 border border-red-500/30">
            <h3 className="text-sm font-bold text-slate-200 mb-4">
                {editingId ? 'Edit Range Log' : 'New Range Session'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Recipe</label>
                        <select className={inputClass} value={form.recipeId} onChange={e => setForm({...form, recipeId: e.target.value})} required>
                            <option value="">Select Recipe...</option>
                            {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.caliber})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Batch (Optional)</label>
                        <select className={inputClass} value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})}>
                            <option value="">No specific batch</option>
                            {batchList.map(b => (
                                <option key={b.id} value={b.id}>
                                    #{b.id} - {b.recipe.split('(')[0]} ({b.date})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Date</label>
                        <input type="date" className={inputClass} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
                    <div>
                        <label className={labelClass}>Distance (yds)</label>
                        <input type="number" className={inputClass} value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} />
                    </div>
                    <div>
                        <label className={labelClass}>Group Size (in)</label>
                        <input type="number" step="0.01" className={inputClass} value={form.groupSize} onChange={e => setForm({...form, groupSize: e.target.value})} />
                    </div>
                    <div>
                        <label className={labelClass}>Velocity (fps)</label>
                        <input type="number" className={inputClass} value={form.velocity} onChange={e => setForm({...form, velocity: e.target.value})} />
                    </div>
                    <div>
                        <label className={labelClass}>SD / ES</label>
                        <div className="flex gap-2">
                            <input placeholder="SD" className={inputClass} value={form.sd} onChange={e => setForm({...form, sd: e.target.value})} />
                            <input placeholder="ES" className={inputClass} value={form.es} onChange={e => setForm({...form, es: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Weather / Temp</label>
                        <div className="flex gap-2">
                            <input placeholder="Sunny..." className={inputClass} value={form.weather} onChange={e => setForm({...form, weather: e.target.value})} />
                            <input placeholder="°F" className={inputClass} type="number" value={form.temp} onChange={e => setForm({...form, temp: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Target Image URL</label>
                        <input placeholder="Paste link..." className={inputClass} value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
                    </div>
                </div>
                
                <div>
                    <label className={labelClass}>Notes</label>
                    <textarea className={inputClass + " min-h-[60px]"} placeholder="How did it shoot?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={handleCancel} className="px-4 py-2 rounded-full border border-slate-700 text-slate-400 text-xs hover:text-white transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 rounded-full bg-emerald-900/40 border border-emerald-500/50 text-emerald-400 text-xs font-bold hover:bg-emerald-900/60 transition">
                        {editingId ? 'Save Changes' : 'Save Log'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* LIST VIEW */}
      <div className="grid gap-4">
        {logs.length === 0 && !isFormOpen && (
             <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">No range logs recorded yet.</div>
        )}
        
        {logs.map(log => (
            <div key={log.id} className="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100">{log.recipeName} <span className="text-slate-500 font-normal">({log.caliber})</span></h3>
                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                {log.date} 
                                {log.batchId && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Batch #{log.batchId}</span>
                                )}
                            </p>
                        </div>
                        {/* ACTION PILLS */}
                        {canEdit && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleStartEdit(log)} 
                                    className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 text-slate-400 text-[10px] transition"
                                >
                                    Edit
                                </button>
                                <button 
                                    onClick={() => handleDelete(log.id)} 
                                    className="px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-400 hover:bg-red-900/40 text-[10px] transition"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-black/40 rounded p-2 border border-slate-800 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Group</span>
                            <span className="block text-sm font-bold text-slate-200">{log.groupSize || '--'}"</span>
                            <span className="block text-[9px] text-emerald-500">{calculateMoa(log.groupSize, log.distance)}</span>
                        </div>
                        <div className="bg-black/40 rounded p-2 border border-slate-800 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Velocity</span>
                            <span className="block text-sm font-bold text-slate-200">{log.velocity || '--'}</span>
                            <span className="block text-[9px] text-slate-500">fps</span>
                        </div>
                        <div className="bg-black/40 rounded p-2 border border-slate-800 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Stats</span>
                            <div className="flex flex-col justify-center h-full">
                                <span className="text-[10px] text-slate-300">SD: {log.sd || '-'}</span>
                                <span className="text-[10px] text-slate-300">ES: {log.es || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                         {log.distance && <span className="flex items-center gap-1"><Target size={12} /> {log.distance} yds</span>}
                         {log.weather && <span className="flex items-center gap-1"><Wind size={12} /> {log.weather}</span>}
                         {log.temp && <span className="flex items-center gap-1"><Thermometer size={12} /> {log.temp}°</span>}
                    </div>
                    
                    {log.notes && <p className="mt-2 text-[11px] text-slate-500 italic">"{log.notes}"</p>}
                </div>

                {log.imageUrl && (
                    <div className="w-full md:w-32 h-32 bg-black rounded-lg overflow-hidden border border-slate-800 flex-shrink-0">
                        <img src={log.imageUrl} alt="Target" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition" />
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  )
}
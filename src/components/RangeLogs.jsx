//===============================================================
//Script Name: RangeLogs.jsx
//Script Location: src/components/RangeLogs.jsx
//Date: 11/30/2025
//Created By: T03KNEE
//Version: 2.2.0 (GOLD MASTER)
//About: Range Logs. Merged features: Haptics + PWA Close Button.
//===============================================================

import { useEffect, useState } from 'react'
import { getRangeLogs, createRangeLog, updateRangeLog, deleteRangeLog } from '../lib/range'
import { getBatches } from '../lib/batches' 
import { Target, Plus, Wind, Thermometer, ExternalLink, Calendar, MapPin, Printer } from 'lucide-react'
import UploadButton from './UploadButton'
import QRCode from 'qrcode'
import { HAPTIC } from '../lib/haptics'

export function RangeLogs({ recipes = [], canEdit, highlightId }) {
  const [logs, setLogs] = useState([])
  const [batchList, setBatchList] = useState([])
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (highlightId && logs.length > 0) {
      const targetId = String(highlightId)
      setTimeout(() => {
        const el = document.getElementById(`rangelog-${targetId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 600)
    }
  }, [highlightId, logs])

  async function loadData() {
    try {
      const logData = await getRangeLogs()
      setLogs(logData)
      try {
        const batchData = await getBatches()
        if (Array.isArray(batchData)) setBatchList(batchData)
      } catch (batchError) {
        console.warn("Could not load batches:", batchError)
      }
    } catch (e) { 
        console.error("Error loading range data:", e) 
    }
  }

  function handleStartEdit(log) {
    setEditingId(log.id)
    setForm({
        recipeId: log.recipeId || '',
        batchId: log.batchId || '',
        date: log.date ? log.date.split('T')[0] : '',
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
    HAPTIC.click()
  }

  function handleCancel() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setIsFormOpen(false)
    HAPTIC.soft()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingId) {
          await updateRangeLog(editingId, form)
      } else {
          await createRangeLog(form)
      }
      HAPTIC.success()
      handleCancel()
      loadData()
    } catch (err) {
      HAPTIC.error()
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if(!window.confirm('Delete this range log?')) return
    HAPTIC.error()
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

  const getRecipeDisplay = (log) => {
    if (log.recipeName) return `${log.recipeName} (${log.caliber})`
    const r = recipes.find(x => String(x.id) === String(log.recipeId))
    return r ? `${r.name} (${r.caliber})` : 'Unknown Load'
  }

  // --- PDF EXPORT (WITH CLOSE BUTTON & QR) ---
  const handlePrintLog = async (log) => {
    HAPTIC.click()
    const title = getRecipeDisplay(log)
    const [recipeName, caliber] = title.includes('(') ? title.split('(') : [title, '']
    const cleanCaliber = caliber ? caliber.replace(')', '') : ''

    const moa = calculateMoa(log.groupSize, log.distance)
    const dateStr = log.date ? log.date.split('T')[0] : 'Unknown Date'
    const logoUrl = `${window.location.origin}/logo.png`

    const appUrl = window.location.origin
    const qrUrl = `${appUrl}/?rangeLogId=${log.id}`
    let qrDataUri = ''
    try {
        qrDataUri = await QRCode.toDataURL(qrUrl, { width: 150, margin: 0, color: { dark: '#000000', light: '#ffffff' } })
    } catch (e) { console.error('QR Gen failed', e) }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Range Log - ${dateStr}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          @page { margin: 0; size: 4in 6in; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #fff; color: #111; }
          .card { width: 4in; height: 6in; display: flex; flex-direction: column; overflow: hidden; position: relative; background: #fff; }
          .header { background-color: #0f0f0f !important; color: white !important; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 5px solid #b33c3c !important; }
          .header-left { flex: 1; }
          .header-left h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 0.05em; line-height:1.1; }
          .header-left h2 { font-size: 11px; font-weight: 600; color: #b33c3c !important; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.1em; }
          .header-left p { font-size: 9px; color: #aaa !important; margin: 4px 0 0 0; font-weight:400; }
          .header-right { display: flex; align-items: center; gap: 15px; }
          .logo { height: 40px; width: auto; }
          .header-qr { background: white !important; padding: 3px; border-radius: 3px; display: flex; flex-direction: column; align-items: center; }
          .qr-img { width: 38px; height: 38px; display: block; }
          .qr-label { font-size: 4px; color: black; font-weight: 900; text-transform: uppercase; margin-top: 1px; letter-spacing: 0.05em; }
          .content { padding: 15px 20px; flex: 1; display: flex; flex-direction: column; }
          .target-container { width: 100%; height: 2.2in; background: #f0f0f0 !important; border-radius: 6px; overflow: hidden; margin-bottom: 15px; border: 1px solid #ddd; position: relative; }
          .main-img { width: 100%; height: 100%; object-fit: cover; }
          .no-img { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px; font-weight: 600; text-transform: uppercase; }
          .grid-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
          .stat-box { background-color: #f4f4f4 !important; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #ddd !important; }
          .stat-box.highlight { border-left-color: #b33c3c !important; background-color: #fff0f0 !important; }
          .stat-label { font-size: 7px; text-transform: uppercase; color: #666; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 1px; }
          .stat-val { font-size: 12px; font-weight: 800; color: #111; display: block; }
          .stat-unit { font-size: 8px; font-weight: 500; color: #888; margin-left: 1px; }
          .notes-section { margin-top: 8px; background: #fff; border: 1px dashed #ccc; padding: 10px; border-radius: 4px; flex: 1; }
          .notes-label { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #b33c3c; margin-bottom: 4px; display: block; }
          .notes-text { font-size: 9px; line-height: 1.4; color: #333; }
          .footer { padding: 10px 20px; background: #f4f4f4 !important; border-top: 1px solid #e0e0e0; font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; display: flex; justify-content: space-between; }
          
          /* === MOBILE CLOSE BUTTON === */
          .close-btn {
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: rgba(0,0,0,0.8); color: #fff; padding: 12px 24px;
            border-radius: 50px; font-family: sans-serif; font-weight: bold; font-size: 14px;
            text-decoration: none; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2); cursor: pointer;
            backdrop-filter: blur(10px);
          }
          @media print { 
            .print-warning, .close-btn { display: none !important; } 
          }
        </style>
      </head>
      <body>
        <button onclick="window.close()" class="close-btn">Done / Close</button>
        <div class="print-warning">⚠️ IMPORTANT: Check "Background graphics" in print settings!</div>
        <div class="card">
          <div class="header">
            <div class="header-left"><h1>${recipeName}</h1><h2>${cleanCaliber}</h2><p>${dateStr} • ${log.location || 'Range'}</p></div>
            <div class="header-right"><div class="header-qr"><img src="${qrDataUri}" class="qr-img" /><span class="qr-label">Scan</span></div><img src="${logoUrl}" class="logo" /></div>
          </div>
          <div class="content">
            <div class="target-container">${log.imageUrl ? `<img src="${log.imageUrl}" class="main-img" />` : '<div class="no-img">No Image</div>'}</div>
            <div class="grid-row">
                <div class="stat-box highlight"><span class="stat-label">Group Size</span><span class="stat-val">${log.groupSize || '--'}<span class="stat-unit">IN</span></span></div>
                <div class="stat-box"><span class="stat-label">MOA</span><span class="stat-val">${moa}</span></div>
                <div class="stat-box"><span class="stat-label">Distance</span><span class="stat-val">${log.distance || '--'}<span class="stat-unit">YDS</span></span></div>
            </div>
            <div class="grid-row">
                <div class="stat-box"><span class="stat-label">Avg Velocity</span><span class="stat-val">${log.velocity || '--'}<span class="stat-unit">FPS</span></span></div>
                <div class="stat-box"><span class="stat-label">SD</span><span class="stat-val">${log.sd || '--'}</span></div>
                <div class="stat-box"><span class="stat-label">ES</span><span class="stat-val">${log.es || '--'}</span></div>
            </div>
            <div class="notes-section"><span class="notes-label">Session Notes</span><div class="notes-text">${log.notes || 'No notes recorded.'}${log.weather ? `<br/><br/><strong>Conditions:</strong> ${log.weather} ${log.temp ? `(${log.temp}°F)` : ''}` : ''}</div></div>
          </div>
          <div class="footer"><span>Log ID: ${log.id}</span><span>Reload Tracker</span></div>
        </div>
        <script>window.onload = () => { setTimeout(() => window.print(), 500); };</script>
      </body>
      </html>
    `
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  const inputClass = "w-full bg-black/60 border border-slate-700/70 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/60 placeholder:text-slate-600"
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-1">Performance Tracking</p>
           <h2 className="text-3xl font-bold flex items-center gap-3">
             <span className="block glow-red">Range Log</span>
           </h2>
        </div>
        
        {canEdit && !isFormOpen && (
            <button 
                onClick={() => { setForm(DEFAULT_FORM); setIsFormOpen(true); HAPTIC.click(); }} 
                className="px-4 py-2 rounded-full bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 hover:bg-red-600 transition"
            >
                <Plus size={14} /> Log Session
            </button>
        )}
      </div>

      {isFormOpen && (
        <div className="glass rounded-2xl p-6 border border-red-500/30 animation-fade-in">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex justify-between items-center">
                <span>{editingId ? 'Edit Range Log' : 'New Range Session'}</span>
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
                                    #{b.id} - {b.recipeName || 'Batch'} ({b.date ? b.date.substring(0,10) : ''})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Date</label>
                        <input type="date" className={inputClass} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Weather / Temp</label>
                            <div className="flex gap-2">
                                <input placeholder="Sunny, overcast..." className={inputClass} value={form.weather} onChange={e => setForm({...form, weather: e.target.value})} />
                                <input placeholder="°F" className={inputClass} type="number" value={form.temp} onChange={e => setForm({...form, temp: e.target.value})} />
                            </div>
                        </div>
                        <div>
                             <label className={labelClass}>Notes</label>
                             <textarea 
                                className={inputClass + " min-h-[85px] resize-none"} 
                                placeholder="How did it shoot?" 
                                value={form.notes} 
                                onChange={e => setForm({...form, notes: e.target.value})} 
                             />
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-3 border border-slate-800 flex flex-col justify-between">
                         <label className={labelClass}>Target Image</label>
                         <div className="flex-1 flex flex-col justify-center">
                             <UploadButton 
                                currentImageUrl={form.imageUrl}
                                onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))}
                             />
                         </div>
                         <p className="text-[10px] text-slate-500 mt-2 text-center">
                           Tap above to snap a photo or upload from library.
                         </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={handleCancel} className="px-4 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800/60 text-[11px] font-semibold transition">Cancel</button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-5 py-1.5 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-[11px] font-semibold shadow-lg shadow-red-900/40 transition"
                    >
                        {loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Save Log')}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* LIST VIEW */}
      <div className="grid gap-4">
        {logs.length === 0 && !isFormOpen && (
             <div className="text-center p-12 border border-dashed border-slate-800 rounded-2xl">
                 <Target size={48} className="mx-auto mb-3 text-slate-700" />
                 <p className="text-slate-500 text-sm">No range logs recorded yet.</p>
                 <p className="text-[11px] text-slate-600 mt-1">Log your first trip to track groups and velocity.</p>
             </div>
        )}
        
        {logs.map(log => {
            const isHighlighted = String(highlightId) === String(log.id)
            return (
            <div 
                id={`rangelog-${log.id}`} 
                key={log.id} 
                className={`glass rounded-xl p-0 flex flex-col md:flex-row items-stretch overflow-hidden group transition duration-500 ${
                    isHighlighted
                     ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                     : 'border-red-500/20'
                }`}
            >
                
                {/* Image Section (Left) */}
                <div className="w-full md:w-48 h-48 md:h-auto bg-black/40 relative flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800">
                    {log.imageUrl ? (
                      <div className="relative w-full h-full group-image">
                          <img 
                            src={log.imageUrl} 
                            alt="Target" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" 
                          />
                          <a 
                             href={log.imageUrl} 
                             target="_blank" 
                             rel="noreferrer"
                             className="absolute bottom-2 right-2 bg-black/60 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition opacity-0 group-hover:opacity-100"
                          >
                              <ExternalLink size={12} />
                          </a>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800">
                        <Target size={32} />
                      </div>
                    )}
                    
                    {log.groupSize && (
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur border border-emerald-500/30 px-2 py-1 rounded-md shadow-lg">
                        <span className="text-xs font-bold text-emerald-400">{log.groupSize}"</span>
                      </div>
                    )}
                </div>

                {/* Content Section (Right) */}
                <div className="flex-1 p-4 md:p-5 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100">{getRecipeDisplay(log)}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                   <Calendar size={10} /> {log.date ? log.date.split('T')[0] : 'No Date'}
                                </span>
                                {log.batchId && (
                                    <span className="px-1.5 py-[1px] rounded bg-slate-800 text-slate-400 border border-slate-700 text-[9px]">
                                        Batch #{log.batchId}
                                    </span>
                                )}
                                {log.location && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 ml-2">
                                       <MapPin size={10} /> {log.location}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* ACTION PILLS */}
                        <div className="flex gap-2">
                             <button 
                                onClick={() => handlePrintLog(log)} 
                                className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 text-slate-400 text-[10px] transition flex items-center gap-1"
                            >
                                <Printer size={10} /> Print
                            </button>
                            {canEdit && (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-black/40 rounded p-2 border border-slate-800/60 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Performance</span>
                            <span className="block text-[10px] font-mono text-emerald-500">
                                {calculateMoa(log.groupSize, log.distance)}
                            </span>
                        </div>
                        <div className="bg-black/40 rounded p-2 border border-slate-800/60 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Velocity</span>
                            <span className="block text-sm font-bold text-slate-200">{log.velocity || '---'}</span>
                            <span className="block text-[9px] text-slate-600">fps</span>
                        </div>
                        <div className="bg-black/40 rounded p-2 border border-slate-800/60 text-center flex flex-col justify-center">
                            <div className="flex justify-between px-2 text-[10px] border-b border-slate-800/50 pb-0.5 mb-0.5">
                                <span className="text-slate-500">SD</span>
                                <span className="text-slate-300 font-mono">{log.sd || '-'}</span>
                            </div>
                            <div className="flex justify-between px-2 text-[10px]">
                                <span className="text-slate-500">ES</span>
                                <span className="text-slate-300 font-mono">{log.es || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 border-t border-slate-800/50 pt-2 mt-auto">
                         {log.distance && <span className="flex items-center gap-1.5"><Target size={12} className="text-slate-600" /> {log.distance} yds</span>}
                         {(log.weather || log.temp) && (
                            <span className="flex items-center gap-1.5">
                                <Thermometer size={12} className="text-slate-600" /> 
                                {log.weather ? `${log.weather}, ` : ''}{log.temp ? `${log.temp}°` : ''}
                            </span>
                         )}
                    </div>
                    
                    {log.notes && <p className="mt-2 text-[11px] text-slate-500 italic border-l-2 border-slate-800 pl-2">"{log.notes}"</p>}
                </div>
            </div>
            )
        })}
      </div>
    </div>
  )
}
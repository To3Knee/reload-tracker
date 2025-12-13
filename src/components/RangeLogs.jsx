//===============================================================
//Script Name: RangeLogs.jsx
//Script Location: src/components/RangeLogs.jsx
//Date: 12/12/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 5.6.0 (Adaptive PDF)
//About: Range Logs management.
//       - FIX: PDF now auto-extends height based on content (no text cutoff).
//       - FIX: Footer sticks to bottom of dynamic height content.
//===============================================================

import { useEffect, useState } from 'react'
import { getRangeLogs, createRangeLog, updateRangeLog, deleteRangeLog } from '../lib/range'
import { getBatches } from '../lib/batches' 
import { getFirearms } from '../lib/armory'
import { calculateStatistics } from '../lib/math'
import { Target, Plus, Thermometer, ExternalLink, Calendar, MapPin, Printer, Crosshair, Calculator, Trash2, User, Clock, AlertTriangle } from 'lucide-react'
import UploadButton from './UploadButton'
import QRCode from 'qrcode'
import { HAPTIC } from '../lib/haptics'

export function RangeLogs({ recipes = [], canEdit, highlightId }) {
  const [logs, setLogs] = useState([])
  const [batchList, setBatchList] = useState([])
  const [guns, setGuns] = useState([]) 
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Safe Delete & Error State
  const [verifyDeleteId, setVerifyDeleteId] = useState(null)
  const [weatherError, setWeatherError] = useState(null)

  const [shotInput, setShotInput] = useState('')
  const [shotString, setShotString] = useState([])

  const getLocalDate = () => {
      const now = new Date()
      const offset = now.getTimezoneOffset()
      const local = new Date(now.getTime() - (offset*60*1000))
      return local.toISOString().split('T')[0]
  }

  const [lastUsedValues, setLastUsedValues] = useState({
    firearmId: '',
    batchId: '',
    recipeId: '',
    date: getLocalDate(),
    weather: '',
    temp: ''
  })

  const DEFAULT_FORM = { 
    recipeId: '', 
    batchId: '', 
    firearmId: '', 
    roundsFired: '',
    date: getLocalDate(), 
    distance: 100, 
    groupSize: '', 
    velocity: '', sd: '', es: '', shots: [],
    weather: '', temp: '', 
    notes: '', imageUrl: '' 
  }
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (shotString.length > 0) {
      const stats = calculateStatistics(shotString)
      setForm(prev => ({
        ...prev,
        velocity: stats.avg,
        sd: stats.sd,
        es: stats.es,
        shots: shotString
      }))
    }
  }, [shotString])

  useEffect(() => {
    if (highlightId && logs.length > 0) {
      const targetId = String(highlightId)
      setTimeout(() => {
        const el = document.getElementById(`rangelog-${targetId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 600)
    }
  }, [highlightId, logs])

  async function loadData() {
    setLoading(true)
    try {
      const [logData, batchData, gunData] = await Promise.all([
          getRangeLogs().catch(()=>[]),
          getBatches().catch(()=>[]),
          getFirearms().catch(()=>[])
      ])
      setLogs(logData)
      setBatchList(batchData)
      setGuns(gunData)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  function handleNewLog() {
      setEditingId(null)
      setForm({ ...DEFAULT_FORM, ...lastUsedValues })
      setShotString([])
      setWeatherError(null)
      setIsFormOpen(true)
      HAPTIC.click()
  }

  function handleStartEdit(log) {
    setEditingId(log.id)
    setWeatherError(null)
    const shots = log.shots || []
    setShotString(shots)
    setForm({ 
        recipeId: log.recipeId || '', 
        batchId: log.batchId || '', 
        firearmId: log.firearmId || '',
        roundsFired: log.roundsFired || '',
        date: log.date ? log.date.split('T')[0] : getLocalDate(), 
        distance: log.distance || '', 
        groupSize: log.groupSize || '', 
        velocity: log.velocity || '', 
        sd: log.sd || '', 
        es: log.es || '', 
        shots: shots,
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
    setIsFormOpen(false)
    HAPTIC.soft()
  }

  function addShot() {
    const val = Number(shotInput)
    if (!val || val <= 0) return
    HAPTIC.click()
    setShotString(prev => [...prev, val])
    setShotInput('')
  }

  function removeShot(index) {
    HAPTIC.soft()
    setShotString(prev => prev.filter((_, i) => i !== index))
  }

  // --- WEATHER ENGINE ---
  async function handleAutoWeather() {
    setWeatherError(null)
    if (!navigator.geolocation) {
        setWeatherError("Geolocation not supported")
        return
    }
    HAPTIC.click()
    
    setForm(prev => ({...prev, weather: 'Locating...'}))

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
            const res = await fetch(url)
            if (!res.ok) throw new Error("Weather API Error")
            const data = await res.json()
            const cur = data.current
            
            const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
            const windDir = directions[Math.round(cur.wind_direction_10m / 45) % 8]
            
            // Format: "Wind: 4.4mph SE, Baro: 1021.5hPa, Hum: 47%"
            const desc = `Wind: ${cur.wind_speed_10m}mph ${windDir}, Baro: ${cur.surface_pressure}hPa, Hum: ${cur.relative_humidity_2m}%`
            
            setForm(prev => ({ 
                ...prev, 
                temp: Math.round(cur.temperature_2m),
                weather: desc 
            }))
            HAPTIC.success()
        } catch (e) {
            console.error(e)
            setForm(prev => ({...prev, weather: ''}))
            setWeatherError("Weather service unavailable.")
            HAPTIC.error()
        }
    }, (err) => {
        console.warn(err)
        setForm(prev => ({...prev, weather: ''})) 
        setWeatherError("Location denied. Check browser settings.")
        HAPTIC.error()
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, shots: shotString }
      if (editingId) {
          await updateRangeLog(editingId, payload)
      } else {
          await createRangeLog(payload)
          setLastUsedValues({
              firearmId: form.firearmId,
              batchId: form.batchId,
              recipeId: form.recipeId,
              date: form.date,
              weather: form.weather,
              temp: form.temp
          })
      }
      HAPTIC.success()
      handleCancel()
      loadData()
    } catch (err) {
      HAPTIC.error()
      console.error(err)
    } finally { setLoading(false) }
  }

  async function handleDelete(id) {
    setVerifyDeleteId(null)
    HAPTIC.error()
    await deleteRangeLog(id)
    loadData()
  }

  const calculateMoa = (group, dist) => {
    const g = Number(group); const d = Number(dist); if (!g || !d) return '—'
    return ((g / (d / 100)) * 0.955).toFixed(2) + ' MOA'
  }

  const getRecipeDisplay = (log) => {
    if (log.recipeName) return `${log.recipeName} (${log.caliber})`
    const r = recipes.find(x => String(x.id) === String(log.recipeId))
    return r ? `${r.name} (${r.caliber})` : 'Unknown Load'
  }

  // --- PDF GENERATOR (UPDATED CSS) ---
  const handlePrintLog = async (log) => {
    HAPTIC.click()
    const win = window.open('', '_blank')
    if (!win) { alert('Popup blocked. Please allow popups.'); return }
    win.document.write('<html><body><p>Generating Ballistic Certificate...</p></body></html>')

    const title = getRecipeDisplay(log)
    const [recipeName, caliber] = title.includes('(') ? title.split('(') : [title, '']
    const cleanCaliber = caliber ? caliber.replace(')', '') : ''
    const moa = calculateMoa(log.groupSize, log.distance)
    const dateStr = log.date ? log.date.split('T')[0] : 'Unknown Date'
    const logoUrl = `${window.location.origin}/logo.png`
    const appUrl = window.location.origin
    const qrUrl = `${appUrl}/?rangeLogId=${log.id}`
    let qrDataUri = ''
    try { qrDataUri = await QRCode.toDataURL(qrUrl, { width: 150, margin: 0, color: { dark: '#000000', light: '#ffffff' } }) } catch (e) {}

    const r = recipes.find(x => String(x.id) === String(log.recipeId)) || {}
    const bullet = r.bulletName ? `${r.bulletWeightGr || '?'}gr ${r.bulletName}` : 'Unknown Bullet'
    const powder = r.powderName ? `${r.chargeGrains || '?'}gr ${r.powderName}` : 'Unknown Powder'
    const primer = r.primerName || 'Unknown Primer'
    const coal = r.coal ? `COAL: ${r.coal}"` : ''

    const firearmLine = log.firearmName ? `<p style="margin-top:4px;"><strong>RIFLE:</strong> ${log.firearmName}</p>` : ''
    const batchLine = log.batchId ? `<p style="margin-top:2px;"><strong>BATCH:</strong> #${log.batchId}</p>` : ''
    const shotsDisplay = (log.shots && log.shots.length > 0) ? `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed #ccc;"><span class="stat-label">Shot Data (n=${log.shots.length})</span><div style="font-size:9px; color:#444; margin-top:4px; font-family:monospace; word-wrap:break-word;">${log.shots.join(', ')}</div></div>` : ''

    // Weather Formatter
    let weatherHtml = ''
    if (log.weather) {
        const parts = log.weather.split(',')
        if (parts.length >= 3 && !log.weather.includes('Wind:')) {
             weatherHtml = `
                <div style="margin-top:8px; padding:6px; background:#f9f9f9; border:1px solid #eee; border-radius:4px; display:flex; gap:12px; align-items:center;">
                    <span style="font-weight:700; color:#b33c3c; font-size:9px; text-transform:uppercase;">Conditions</span>
                    <span style="font-size:9px; color:#333;"><strong>Wind:</strong> ${parts[0].trim()}</span>
                    <span style="font-size:9px; color:#333;"><strong>Baro:</strong> ${parts[1].trim()}</span>
                    <span style="font-size:9px; color:#333;"><strong>Hum:</strong> ${parts[2].trim()}</span>
                    ${log.temp ? `<span style="font-size:9px; color:#333;"><strong>Temp:</strong> ${log.temp}°F</span>` : ''}
                </div>
             `
        } else {
            weatherHtml = `
                <div style="margin-top:8px; padding:6px; background:#f9f9f9; border:1px solid #eee; border-radius:4px;">
                    <span style="font-weight:700; color:#b33c3c; font-size:9px; text-transform:uppercase;">Conditions:</span> 
                    <span style="font-size:9px; color:#333;">${log.weather} ${log.temp ? `(${log.temp}°F)` : ''}</span>
                </div>
            `
        }
    }

    // FIX: CSS Changes for Adaptive Height
    // 1. @page { size: 4in auto; } -> Allows PDF to grow longer than 6in if needed.
    // 2. .card { height: auto; min-height: 6in; overflow: visible; } -> Prevents clipping.
    // 3. .footer { margin-top: auto; } -> Ensures footer stays at the bottom of content.
    const html = `<!DOCTYPE html><html><head><title>Range Log #${log.id}</title><style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
    @page { margin: 0; size: 4in auto; } 
    *{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body{ margin:0; padding:0; font-family:'Inter', sans-serif; background:#000; color:#111; }
    .card{ width:4in; min-height:6in; height:auto; display:flex; flex-direction:column; position:relative; background:#fff; overflow: visible; }
    .header{ background-color:#0f0f0f !important; color:white !important; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:5px solid #b33c3c !important; }
    .header-left h1{ font-size:16px; font-weight:900; text-transform:uppercase; margin:0; }
    .header-left h2{ font-size:11px; font-weight:600; color:#b33c3c !important; margin:2px 0 0 0; text-transform:uppercase; }
    .header-left p{ font-size:9px; color:#aaa !important; margin:4px 0 0 0; }
    .header-right{ display:flex; align-items:center; gap:12px; }
    .logo{ height:40px; width:auto; }
    .header-qr{ background:white !important; padding:3px; border-radius:3px; display:flex; flex-direction:column; align-items:center; }
    .qr-img{ width:38px; height:38px; }
    .qr-label{ font-size:4px; color:black; font-weight:900; text-transform:uppercase; margin-top:1px; }
    .load-strip { background-color:#f4f4f4 !important; padding:8px 20px; border-bottom:1px solid #e0e0e0; display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center; }
    .load-item { font-size:8px; color:#333; display:flex; flex-direction:column; }
    .load-label { font-size:6px; font-weight:900; color:#b33c3c; text-transform:uppercase; margin-bottom:1px; }
    .load-val { font-weight:700; font-family:monospace; font-size:9px; }
    .content{ padding:15px 20px; flex:1; display:flex; flex-direction:column; }
    .target-container{ width:100%; height:2.0in; background:#fff !important; border-radius:6px; overflow:hidden; margin-bottom:15px; border:1px solid #ddd; position:relative; }
    .main-img{ width:100%; height:100%; object-fit:contain; }
    .no-img{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:10px; font-weight:600; text-transform:uppercase; }
    .grid-row{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:8px; }
    .stat-box{ background-color:#f4f4f4 !important; padding:6px 8px; border-radius:4px; border-left:3px solid #ddd !important; }
    .stat-box.highlight{ border-left-color:#b33c3c !important; background-color:#fff0f0 !important; }
    .stat-label{ font-size:7px; text-transform:uppercase; color:#666; font-weight:700; display:block; }
    .stat-val{ font-size:12px; font-weight:800; color:#111; display:block; }
    .stat-unit{ font-size:8px; font-weight:500; color:#888; margin-left:1px; }
    .notes-section{ margin-top:8px; background:#fff; border:1px dashed #ccc; padding:10px; border-radius:4px; flex:1 0 auto; }
    .notes-label{ font-size:8px; font-weight:900; text-transform:uppercase; color:#b33c3c; margin-bottom:4px; display:block; }
    .notes-text{ font-size:9px; line-height:1.4; color:#333; }
    .footer{ padding:10px 20px; background:#f4f4f4 !important; border-top:1px solid #e0e0e0; font-size:8px; color:#888; text-transform:uppercase; letter-spacing:0.1em; display:flex; justify-content:space-between; margin-top: auto; }
    .close-btn{ position:fixed; top:20px; right:20px; z-index:9999; background:rgba(0,0,0,0.8); color:#fff; padding:12px 24px; border-radius:50px; font-family:sans-serif; font-weight:bold; font-size:14px; text-decoration:none; box-shadow:0 4px 15px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2); cursor:pointer; backdrop-filter:blur(10px); }
    @media print{ .close-btn { display:none !important; } }
    </style></head><body><button onclick="window.close()" class="close-btn">Done / Close</button>
    <div class="card">
        <div class="header">
            <div class="header-left"><h1>${recipeName}</h1><h2>${cleanCaliber}</h2><p>${dateStr} • ${log.location || 'Range'}</p>${firearmLine}${batchLine}</div>
            <div class="header-right"><div class="header-qr"><img src="${qrDataUri}" class="qr-img" /><span class="qr-label">Scan</span></div><img src="${logoUrl}" class="logo" /></div>
        </div>
        <div class="load-strip">
            <div class="load-item"><span class="load-label">Bullet</span><span class="load-val">${bullet}</span></div>
            <div class="load-item"><span class="load-label">Powder</span><span class="load-val">${powder}</span></div>
            <div class="load-item"><span class="load-label">Primer</span><span class="load-val">${primer}</span></div>
            ${coal ? `<div class="load-item"><span class="load-label">COAL</span><span class="load-val">${r.coal}"</span></div>` : ''}
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
            <div class="notes-section">
                <span class="notes-label">Session Notes</span>
                <div class="notes-text">${log.notes || 'No notes recorded.'}</div>
                ${weatherHtml}
                ${shotsDisplay}
            </div>
        </div>
        <div class="footer"><span>Log ID: ${log.id}</span><span>Reload Tracker</span></div>
    </div>
    <script>window.onload = () => { setTimeout(() => window.print(), 500); };</script></body></html>`
    
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const inputClass = "w-full bg-black/60 border border-slate-700/70 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/60 placeholder:text-slate-600"
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1"

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Performance</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">RANGE LOGS</h2>
        </div>
      </div>
      
      <div className="flex justify-end border-b border-zinc-800 pb-2 mb-6">
            {canEdit && !isFormOpen && (
                <button onClick={handleNewLog} className="px-4 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-red-500/50 hover:text-white transition flex items-center gap-2">
                    <Plus size={12} /> New Session
                </button>
            )}
      </div>

      {isFormOpen && (
        <div className="glass rounded-2xl p-6 border border-red-500/30 animation-fade-in">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex justify-between items-center">
                <span>{editingId ? 'Edit Range Log' : 'New Range Session'}</span>
            </h3>

            {/* ERROR DISPLAY AREA */}
            {weatherError && (
                <div className="mb-4 p-2 bg-red-900/30 border border-red-500/30 rounded flex items-center gap-2 text-xs text-red-300">
                    <AlertTriangle size={14} /> {weatherError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Recipe</label>
                        <select className={inputClass} value={form.recipeId} onChange={e => setForm({...form, recipeId: e.target.value})} required>
                            <option value="">Select Recipe...</option>
                            {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.caliber})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Firearm Used</label>
                        <select className={inputClass} value={form.firearmId} onChange={e => setForm({...form, firearmId: e.target.value})}>
                            <option value="">Select Firearm...</option>
                            {(guns || []).map(g => <option key={g.id} value={g.id}>{g.name} ({g.caliber})</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Batch (Optional)</label>
                        <select className={inputClass} value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})}>
                            <option value="">No specific batch</option>
                            {batchList.map(b => (<option key={b.id} value={b.id}>#{b.id} - {b.recipe}</option>))}
                        </select>
                    </div>
                    <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                </div>
                
                <div className="bg-black/30 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <label className={labelClass}><Calculator size={12} className="inline mr-1"/> Shot String Calculator</label>
                        <span className="text-[9px] text-slate-500">{shotString.length} shots recorded</span>
                    </div>
                    <div className="flex gap-2">
                        <input type="number" className={inputClass.replace("w-full", "") + " flex-1 min-w-0"} placeholder="Enter velocity (fps)..." value={shotInput} onChange={e => setShotInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addShot())} />
                        <button type="button" onClick={addShot} className="px-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition flex-shrink-0"><Plus size={14}/></button>
                    </div>
                    {shotString.length > 0 && (<div className="flex flex-wrap gap-2 mt-2 max-h-20 overflow-y-auto custom-scrollbar">{shotString.map((s, i) => (<span key={i} onClick={() => removeShot(i)} className="px-2 py-1 rounded bg-slate-800/50 text-[10px] text-slate-300 border border-slate-700 hover:border-red-500/50 hover:text-red-400 cursor-pointer transition flex items-center gap-1">{s}</span>))}</div>)}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                         <label className={labelClass}>Rounds Fired</label>
                         <input type="number" className={inputClass} value={form.roundsFired} onChange={e => setForm({...form, roundsFired: e.target.value})} placeholder="Rounds Fired" />
                    </div>
                    <div><label className={labelClass}>Distance (yds)</label><input type="number" className={inputClass} value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} /></div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div><label className={labelClass}>Group (in)</label><input type="number" step="0.01" className={inputClass} value={form.groupSize} onChange={e => setForm({...form, groupSize: e.target.value})} /></div>
                    <div><label className={labelClass}>Avg Velocity</label><input type="number" className={inputClass} value={form.velocity} readOnly placeholder="Auto-calc" /></div>
                    <div>
                        <label className={labelClass}>SD / ES</label>
                        <div className="flex gap-1">
                            <input placeholder="SD" className={inputClass.replace("w-full", "") + " flex-1 min-w-0"} value={form.sd} readOnly />
                            <input placeholder="ES" className={inputClass.replace("w-full", "") + " flex-1 min-w-0"} value={form.es} readOnly />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Weather / Temp</label>
                            <div className="flex gap-2 items-center">
                                {/* Flex-1 prevents layout fighting */}
                                <input placeholder="Conditions (Auto-fill)" className={inputClass.replace("w-full", "") + " flex-1 min-w-0"} value={form.weather} onChange={e => setForm({...form, weather: e.target.value})} />
                                <button type="button" onClick={handleAutoWeather} className="w-10 h-[34px] flex-shrink-0 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition shadow-sm" title="Auto-Locate Weather">
                                    <MapPin size={16}/>
                                </button>
                                <input placeholder="°F" className={inputClass.replace("w-full", "") + " w-20 flex-shrink-0 text-center"} type="number" value={form.temp} onChange={e => setForm({...form, temp: e.target.value})} />
                            </div>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Target Image</label>
                            <div className="bg-black/20 rounded-xl p-3 border border-slate-800 flex flex-col justify-center h-[100px]">
                                <UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} />
                            </div>
                        </div>
                    </div>
                    <div><label className={labelClass}>Notes</label><textarea className={inputClass + " h-full min-h-[120px] resize-none"} placeholder="How did it shoot?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                </div>

                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={handleCancel} className="px-4 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800/60 text-[11px] font-semibold transition">Cancel</button><button type="submit" disabled={loading} className="px-5 py-1.5 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-[11px] font-semibold shadow-lg shadow-red-900/40 transition">{loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Save Log')}</button></div>
            </form>
        </div>
      )}
      
      <div className="grid gap-4">
        {logs.length === 0 && !isFormOpen && (<div className="text-center p-12 border border-dashed border-slate-800 rounded-2xl"><Target size={48} className="mx-auto mb-3 text-slate-700" /><p className="text-slate-500 text-sm">No range logs recorded yet.</p><p className="text-[11px] text-slate-600 mt-1">Log your first trip to track groups and velocity.</p></div>)}
        {logs.map(log => {
            const isHighlighted = String(highlightId) === String(log.id)
            return (<div id={`rangelog-${log.id}`} key={log.id} className={`glass rounded-xl p-0 flex flex-col md:flex-row items-stretch overflow-hidden group transition duration-500 ${isHighlighted ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'border-red-500/20'}`}><div className="w-full md:w-48 h-48 md:h-auto bg-black/40 relative flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800">{log.imageUrl ? (<div className="relative w-full h-full group-image"><img src={log.imageUrl} alt="Target" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" /><a href={log.imageUrl} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-black/60 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-black/90 transition opacity-0 group-hover:opacity-100"><ExternalLink size={12} /></a></div>) : (<div className="w-full h-full flex items-center justify-center text-slate-800"><Target size={32} /></div>)}{log.groupSize && (<div className="absolute top-2 left-2 bg-black/80 backdrop-blur border border-emerald-500/30 px-2 py-1 rounded-md shadow-lg"><span className="text-xs font-bold text-emerald-400">{log.groupSize}"</span></div>)}</div>
            <div className="flex-1 p-4 md:p-5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-100">{getRecipeDisplay(log)}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar size={10} /> {log.date ? log.date.split('T')[0] : 'No Date'}</span>
                            {log.batchId && (<span className="px-1.5 py-[1px] rounded bg-slate-800 text-slate-400 border border-slate-700 text-[9px]">Batch #{log.batchId}</span>)}
                            {log.firearmName && (<span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-red-900/20 text-red-400 border border-red-900/30"><Crosshair size={10} /> {log.firearmName}</span>)}
                            {log.location && (<span className="text-[10px] text-slate-500 flex items-center gap-1 ml-2"><MapPin size={10} /> {log.location}</span>)}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => handlePrintLog(log)} className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 text-slate-400 text-[10px] transition flex items-center gap-1"><Printer size={10} /> Print</button>
                        {canEdit && (<>
                            <button onClick={() => handleStartEdit(log)} className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 text-slate-400 text-[10px] transition">Edit</button>
                            
                            {verifyDeleteId === log.id ? (
                                <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                    <button onClick={() => handleDelete(log.id)} className="px-2 py-[2px] rounded-full bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition">Yes</button>
                                    <button onClick={() => setVerifyDeleteId(null)} className="px-2 py-[2px] rounded-full bg-slate-800 text-slate-400 text-[10px] hover:bg-slate-700 transition">No</button>
                                </div>
                            ) : (
                                <button onClick={() => setVerifyDeleteId(log.id)} className="px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-400 hover:bg-red-900/40 text-[10px] transition">Remove</button>
                            )}
                        </>)}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-black/40 rounded p-2 border border-slate-800/60 text-center"><span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Performance</span><span className="block text-[10px] font-mono text-emerald-500">{calculateMoa(log.groupSize, log.distance)}</span></div>
                    <div className="bg-black/40 rounded p-2 border border-slate-800/60 text-center"><span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Velocity</span><span className="block text-sm font-bold text-slate-200">{log.velocity || '---'}</span><span className="block text-[9px] text-slate-600">fps</span></div>
                    <div className="bg-black/40 rounded p-2 border border-slate-800/60 text-center flex flex-col justify-center"><div className="flex justify-between px-2 text-[10px] border-b border-slate-800/50 pb-0.5 mb-0.5"><span className="text-slate-500">SD</span><span className="text-slate-300 font-mono">{log.sd || '-'}</span></div><div className="flex justify-between px-2 text-[10px]"><span className="text-slate-500">ES</span><span className="text-slate-300 font-mono">{log.es || '-'}</span></div></div>
                </div>
                <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 border-t border-slate-800/50 pt-2 mt-auto">
                    {log.distance && <span className="flex items-center gap-1.5"><Target size={12} className="text-slate-600" /> {log.distance} yds</span>}
                    {(log.weather || log.temp) && (<span className="flex items-center gap-1.5"><Thermometer size={12} className="text-slate-600" /> {log.weather ? `${log.weather}, ` : ''}{log.temp ? `${log.temp}°` : ''}</span>)}
                </div>
                {log.notes && <p className="mt-2 text-[11px] text-slate-500 italic border-l-2 border-slate-800 pl-2">"{log.notes}"</p>}
                
                <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-slate-800/50">
                    {log.createdBy && (<span className="flex items-center gap-1 text-[9px] text-slate-500"><User size={10} /> Created by {log.createdBy}</span>)}
                    {log.updatedBy && (<span className="flex items-center gap-1 text-[9px] text-slate-500"><Clock size={10} /> Modified by {log.updatedBy}</span>)}
                </div>
            </div>
            </div>)
        })}
      </div>
    </div>
  )
}
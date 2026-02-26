//===============================================================
//Script Name: RangeLogs.jsx
//Script Location: src/components/RangeLogs.jsx
//Date: 12/12/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 5.7.1 (Instructional Error Messages)
//About: Range Logs management.
//       - FIX: Updated GPS Error messages to guide user to iOS Settings manually
//              (since PWAs cannot deep-link to system settings).
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

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [])

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

  async function loadData(signal) {
    setLoading(true)
    const safe = fn => fn.catch(e => { if (e?.name === 'AbortError') throw e; return [] })
    try {
      const [logData, batchData, gunData] = await Promise.all([
          safe(getRangeLogs(signal)),
          safe(getBatches(signal)),
          safe(getFirearms(signal)),
      ])
      setLogs(logData)
      setBatchList(batchData)
      setGuns(gunData)
    } catch (e) {
      if (e?.name !== 'AbortError') console.error(e)
    } finally { setLoading(false) }
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

  // --- WEATHER ENGINE (Instructional Update) ---
  async function handleAutoWeather() {
    setWeatherError(null)
    if (!navigator.geolocation) {
        setWeatherError("GPS hardware not found.")
        return
    }
    HAPTIC.click()
    setForm(prev => ({...prev, weather: 'Locating...'}))

    const geoOptions = {
        enableHighAccuracy: false, 
        timeout: 15000,            
        maximumAge: 300000         
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
            const res = await fetch(url)
            if (!res.ok) throw new Error("Weather API Error")
            const data = await res.json()
            const cur = data.current
            
            const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
            const DEGREES_PER_DIRECTION = 360 / directions.length
            const windDir = directions[Math.round(cur.wind_direction_10m / DEGREES_PER_DIRECTION) % directions.length]
            
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
        console.warn("Geo Error", err)
        setForm(prev => ({...prev, weather: ''})) 
        
        let msg = "Location access denied."
        // INSTRUCTIONAL ERROR MESSAGES FOR iOS
        if (err.code === 1) msg = "🚫 Blocked. Go to Settings > Privacy > Location to enable."
        else if (err.code === 2) msg = "⚠️ Signal Lost. Move outdoors."
        else if (err.code === 3) msg = "⏱️ Timeout. Please try again."
        
        setWeatherError(msg)
        HAPTIC.error()
    }, geoOptions)
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

  // Escape user-supplied strings before injecting into PDF innerHTML
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const calculateMoa = (group, dist) => {
    const g = Number(group); const d = Number(dist); if (!g || !d) return '—'
    return ((g / (d / 100)) * 0.955).toFixed(2) + ' MOA'
  }

  const getRecipeDisplay = (log) => {
    if (log.recipeName) return `${log.recipeName} (${log.caliber})`
    const r = recipes.find(x => String(x.id) === String(log.recipeId))
    return r ? `${r.name} (${r.caliber})` : 'Unknown Load'
  }

  const handlePrintLog = async (log) => {
    HAPTIC.click()
    const win = window.open('', '_blank')
    if (!win) { alert('Popup blocked. Please allow popups.'); return }
    win.document.write('<html><body style="background:#fff"><p style="color:#aaa;font-family:monospace;padding:20px;font-size:12px">Generating Ballistic Certificate...</p></body></html>')

    const title = getRecipeDisplay(log)
    const [recipeName, caliber] = title.includes('(') ? title.split('(') : [title, '']
    const cleanCaliber = caliber ? caliber.replace(')', '') : ''
    const moa = calculateMoa(log.groupSize, log.distance)
    const dateStr = log.date ? log.date.split('T')[0] : 'Unknown Date'
    const logoUrl = `${window.location.origin}/logo.png`
    const qrUrl = `${window.location.origin}/?rangeLogId=${log.id}`
    let qrDataUri = ''
    try { qrDataUri = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } }) } catch (e) {}

    const r = recipes.find(x => String(x.id) === String(log.recipeId)) || {}
    const bullet = r.bulletName ? `${r.bulletWeightGr || '?'}gr ${r.bulletName}` : '---'
    const powder = r.powderName ? `${r.chargeGrains || '?'}gr ${r.powderName}` : '---'
    const primer = r.primerName || '---'
    const coal   = r.coal ? `${r.coal}"` : '---'

    const shotsDisplay = (log.shots && log.shots.length > 0)
      ? `<div class="sect">Shot String (n=${log.shots.length})</div><div class="shots-wrap"><span class="shots-data">${log.shots.map(s => esc(String(s))).join(' · ')}</span></div>`
      : ''

    let weatherHtml = ''
    if (log.weather) {
      const wParts = log.weather.split(',')
      const tempStr = log.temp ? ` · ${esc(String(log.temp))}°F` : ''
      if (wParts.length >= 3 && !log.weather.includes('Wind:')) {
        weatherHtml = `<div class="wx-row"><span class="wx-tag">Conditions</span><span class="wx-val">Wind: ${esc(wParts[0].trim())} · Baro: ${esc(wParts[1].trim())} · Hum: ${esc(wParts[2].trim())}${tempStr}</span></div>`
      } else {
        weatherHtml = `<div class="wx-row"><span class="wx-tag">Conditions</span><span class="wx-val">${esc(log.weather)}${tempStr}</span></div>`
      }
    }

    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><title>Ballistic Certificate — Log #${log.id}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page { size: letter portrait; margin: 0.5in; }
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Inter', sans-serif; background: #fff; color: #111; font-size: 10px; }
/* HEADER */
.hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #b87333; margin-bottom: 16px; }
.hdr-l { flex: 1; min-width: 0; }
.eyebrow { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; color: #b87333; margin-bottom: 4px; }
.rname { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #111; line-height: 1; letter-spacing: -0.01em; }
.rcal { font-size: 9px; font-weight: 700; color: #b87333; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 3px; }
.rmeta { font-size: 8px; color: #777; margin-top: 3px; letter-spacing: 0.04em; }
.hdr-r { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: 16px; }
.logo { height: 44px; width: auto; filter: invert(1) brightness(0); }
.qr-img { width: 54px; height: 54px; display: block; border: 1px solid #ddd; padding: 2px; }
/* LOAD STRIP */
.load-strip { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 8px 14px; display: flex; flex-wrap: wrap; gap: 6px 24px; margin-bottom: 16px; }
.load-item { display: flex; flex-direction: column; }
.load-label { font-size: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #b87333; margin-bottom: 2px; }
.load-val { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: #111; }
/* TARGET IMAGE */
.target-wrap { border: 1px solid #e0d8cf; border-radius: 3px; height: 2.8in; overflow: hidden; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; background: #faf8f6; }
.target-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.no-img { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #ccc; }
/* SECTION EYEBROW */
.sect { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: #b87333; display: flex; align-items: center; gap: 8px; margin: 14px 0 8px; }
.sect:first-child { margin-top: 0; }
.sect::after { content: ''; flex: 1; height: 1px; background: #e0d8cf; }
/* STAT GRID */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.stat-box { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 8px 10px; }
.stat-box.hi { border-left: 3px solid #b87333; }
.slabel { font-size: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #999; display: block; margin-bottom: 3px; }
.sval { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 900; color: #111; display: block; line-height: 1; }
.sval.cu { color: #b87333; }
.sunit { font-size: 8px; font-weight: 500; color: #aaa; margin-left: 2px; }
/* WEATHER */
.wx-row { display: flex; align-items: baseline; gap: 8px; background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 6px 10px; margin-bottom: 8px; }
.wx-tag { font-size: 6.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #b87333; flex-shrink: 0; }
.wx-val { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #444; }
/* SHOTS */
.shots-wrap { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 7px 10px; margin-bottom: 8px; }
.shots-data { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #555; line-height: 1.6; word-break: break-all; }
/* NOTES */
.notes-box { background: #faf8f6; border: 1px solid #e0d8cf; border-left: 3px solid #b87333; border-radius: 0 3px 3px 0; padding: 8px 12px; }
.notes-txt { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; color: #444; line-height: 1.6; white-space: pre-wrap; }
/* FOOTER */
.footer { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e0d8cf; margin-top: 18px; font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #aaa; text-transform: uppercase; letter-spacing: 0.12em; }
/* CLOSE BTN */
.close-btn { position: fixed; top: 12px; right: 12px; background: #f0ede8; color: #333; padding: 5px 12px; border-radius: 4px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid #d0c8bf; cursor: pointer; }
@media print { .close-btn { display: none !important; } }
</style>
</head><body>
<button onclick="window.close()" class="close-btn">✕ Close</button>
<div class="hdr">
  <div class="hdr-l">
    <div class="eyebrow">Ballistic Certificate · Reload Tracker</div>
    <div class="rname">${esc(recipeName)}</div>
    <div class="rcal">${esc(cleanCaliber)}</div>
    <div class="rmeta">${dateStr}${log.location ? ' · ' + esc(log.location) : ''}${log.firearmName ? ' · ' + esc(log.firearmName) : ''}${log.batchId ? ' · Batch #' + log.batchId : ''}</div>
  </div>
  <div class="hdr-r">
    ${qrDataUri ? `<img src="${qrDataUri}" class="qr-img"/>` : ''}
    <img src="${logoUrl}" class="logo"/>
  </div>
</div>
<div class="load-strip">
  <div class="load-item"><span class="load-label">Bullet</span><span class="load-val">${esc(bullet)}</span></div>
  <div class="load-item"><span class="load-label">Powder</span><span class="load-val">${esc(powder)}</span></div>
  <div class="load-item"><span class="load-label">Primer</span><span class="load-val">${esc(primer)}</span></div>
  <div class="load-item"><span class="load-label">C.O.A.L.</span><span class="load-val">${esc(coal)}</span></div>
</div>
${log.imageUrl ? `<div class="target-wrap"><img src="${log.imageUrl}" class="target-img"/></div>` : ''}
<div class="sect">Accuracy</div>
<div class="stat-grid" style="margin-bottom:14px">
  <div class="stat-box hi"><span class="slabel">Group Size</span><span class="sval cu">${esc(String(log.groupSize || '--'))}<span class="sunit">IN</span></span></div>
  <div class="stat-box"><span class="slabel">MOA</span><span class="sval">${moa}</span></div>
  <div class="stat-box"><span class="slabel">Distance</span><span class="sval">${esc(String(log.distance || '--'))}<span class="sunit">YDS</span></span></div>
</div>
<div class="sect">Velocity</div>
<div class="stat-grid" style="margin-bottom:14px">
  <div class="stat-box hi"><span class="slabel">Avg Velocity</span><span class="sval cu">${esc(String(log.velocity || '--'))}<span class="sunit">FPS</span></span></div>
  <div class="stat-box"><span class="slabel">Std Dev (SD)</span><span class="sval">${esc(String(log.sd || '--'))}</span></div>
  <div class="stat-box"><span class="slabel">Ext Spread (ES)</span><span class="sval">${esc(String(log.es || '--'))}</span></div>
</div>
${weatherHtml}
${shotsDisplay}
${log.notes ? `<div class="sect">Session Notes</div><div class="notes-box"><div class="notes-txt">${esc(log.notes)}</div></div>` : ''}
<div class="footer"><span>Log #${log.id} · Reload Tracker</span><span>${dateStr}</span></div>
<script>window.onload = () => { setTimeout(() => window.print(), 600); };<\/script>
</body></html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const inputClass = "rt-input"
  const labelClass = "rt-label"

  return (
    <div className="space-y-6">
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Performance</span>
          <h2 className="rt-section-title">RANGE LOGS</h2>
        </div>
      </div>
      
      <div className="flex justify-end border-b border-steel-700 pb-2 mb-6">
            {canEdit && !isFormOpen && (
                <button onClick={handleNewLog} className="rt-btn rt-btn-secondary">
                    <Plus size={12} /> New Session
                </button>
            )}
      </div>

      {isFormOpen && (
        <div className="glass p-6 border border-red-500/30 animation-fade-in">
            <h3 className="text-sm font-bold text-steel-200 mb-4 flex justify-between items-center">
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
                
                <div className="bg-black/30 p-3 rounded-xl border border-steel-700">
                    <div className="flex items-center justify-between mb-2">
                        <label className={labelClass}><Calculator size={12} className="inline mr-1"/> Shot String Calculator</label>
                        <span className="text-[9px] text-steel-500">{shotString.length} shots recorded</span>
                    </div>
                    <div className="flex gap-2">
                        <input type="number" className={inputClass.replace("w-full", "") + " flex-1 min-w-0"} placeholder="Enter velocity (fps)..." value={shotInput} onChange={e => setShotInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addShot())} />
                        <button type="button" onClick={addShot} className="rt-btn rt-btn-icon flex-shrink-0"><Plus size={14}/></button>
                    </div>
                    {shotString.length > 0 && (<div className="flex flex-wrap gap-2 mt-2 max-h-20 overflow-y-auto custom-scrollbar">{shotString.map((s, i) => (<span key={i} onClick={() => removeShot(i)} className="px-2 py-1 rounded bg-steel-700/50 text-[10px] text-steel-300 border border-steel-600 hover:border-red-500/50 hover:text-red-400 cursor-pointer transition flex items-center gap-1">{s}</span>))}</div>)}
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
                                <button type="button" onClick={handleAutoWeather} className="rt-btn rt-btn-icon w-10 h-[34px] flex-shrink-0" title="Auto-Locate Weather">
                                    <MapPin size={16}/>
                                </button>
                                <input placeholder="°F" className={inputClass.replace("w-full", "") + " w-20 flex-shrink-0 text-center"} type="number" value={form.temp} onChange={e => setForm({...form, temp: e.target.value})} />
                            </div>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Target Image</label>
                            <div className="bg-black/20 rounded-xl p-3 border border-steel-700 flex flex-col justify-center h-[100px]">
                                <UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} />
                            </div>
                        </div>
                    </div>
                    <div><label className={labelClass}>Notes</label><textarea className={inputClass + " h-full min-h-[120px] resize-none"} placeholder="How did it shoot?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                </div>

                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={handleCancel} className="rt-btn rt-btn-secondary">Cancel</button><button type="submit" disabled={loading} className="rt-btn rt-btn-primary disabled:opacity-60">{loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Save Log')}</button></div>
            </form>
        </div>
      )}
      
      <div className="grid gap-4">
        {logs.length === 0 && !isFormOpen && (<div className="text-center p-12 border border-dashed border-steel-700 rounded-2xl"><Target size={48} className="mx-auto mb-3 text-steel-600" /><p className="text-steel-500 text-sm">No range logs recorded yet.</p><p className="text-[11px] text-steel-500 mt-1">Log your first trip to track groups and velocity.</p></div>)}
        {logs.map(log => {
            const isHighlighted = String(highlightId) === String(log.id)
            return (<div id={`rangelog-${log.id}`} key={log.id} className={`glass p-0 flex flex-col md:flex-row items-stretch overflow-hidden group transition duration-500 ${isHighlighted ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'border-red-500/20'}`}><div className="w-full md:w-48 h-48 md:h-auto bg-black/40 relative flex-shrink-0 border-b md:border-b-0 md:border-r border-steel-700">{log.imageUrl ? (<div className="relative w-full h-full group-image"><img src={log.imageUrl} alt="Target" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" /><a href={log.imageUrl} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-black/60 p-1.5 rounded-full text-steel-300 hover:text-white hover:bg-black/90 transition opacity-0 group-hover:opacity-100"><ExternalLink size={12} /></a></div>) : (<div className="w-full h-full flex items-center justify-center text-steel-700"><Target size={32} /></div>)}{log.groupSize && (<div className="absolute top-2 left-2 bg-black/80 backdrop-blur border border-emerald-500/30 px-2 py-1 rounded-md shadow-lg"><span className="text-xs font-bold text-emerald-400">{log.groupSize}"</span></div>)}</div>
            <div className="flex-1 p-4 md:p-5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-steel-100">{getRecipeDisplay(log)}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-steel-500 flex items-center gap-1"><Calendar size={10} /> {log.date ? log.date.split('T')[0] : 'No Date'}</span>
                            {log.batchId && (<span className="px-1.5 py-[1px] rounded bg-steel-700 text-steel-400 border border-steel-600 text-[9px]">Batch #{log.batchId}</span>)}
                            {log.firearmName && (<span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-red-900/20 text-red-400 border border-red-900/30"><Crosshair size={10} /> {log.firearmName}</span>)}
                            {log.location && (<span className="text-[10px] text-steel-500 flex items-center gap-1 ml-2"><MapPin size={10} /> {log.location}</span>)}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => handlePrintLog(log)} className="rt-btn rt-btn-ghost hover:text-emerald-400 hover:border-emerald-700"><Printer size={10} /> Print</button>
                        {canEdit && (<>
                            <button onClick={() => handleStartEdit(log)} className="rt-btn rt-btn-ghost">Edit</button>
                            
                            {verifyDeleteId === log.id ? (
                                <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                    <button onClick={() => handleDelete(log.id)} className="rt-btn rt-btn-danger">Yes, Delete</button>
                                    <button onClick={() => setVerifyDeleteId(null)} className="rt-btn rt-btn-ghost">No</button>
                                </div>
                            ) : (
                                <button onClick={() => setVerifyDeleteId(log.id)} className="rt-btn rt-btn-danger">Remove</button>
                            )}
                        </>)}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-black/40 rounded p-2 border border-steel-700/60 text-center"><span className="block text-[9px] text-steel-500 uppercase tracking-wider mb-0.5">Performance</span><span className="block text-[10px] font-mono text-emerald-500">{calculateMoa(log.groupSize, log.distance)}</span></div>
                    <div className="bg-black/40 rounded p-2 border border-steel-700/60 text-center"><span className="block text-[9px] text-steel-500 uppercase tracking-wider mb-0.5">Velocity</span><span className="block text-sm font-bold text-steel-200">{log.velocity || '---'}</span><span className="block text-[9px] text-steel-500">fps</span></div>
                    <div className="bg-black/40 rounded p-2 border border-steel-700/60 text-center flex flex-col justify-center"><div className="flex justify-between px-2 text-[10px] border-b border-steel-700/50 pb-0.5 mb-0.5"><span className="text-steel-500">SD</span><span className="text-steel-300 font-mono">{log.sd || '-'}</span></div><div className="flex justify-between px-2 text-[10px]"><span className="text-steel-500">ES</span><span className="text-steel-300 font-mono">{log.es || '-'}</span></div></div>
                </div>
                <div className="flex flex-wrap gap-4 text-[10px] text-steel-400 border-t border-steel-700/50 pt-2 mt-auto">
                    {log.distance && <span className="flex items-center gap-1.5"><Target size={12} className="text-steel-500" /> {log.distance} yds</span>}
                    {(log.weather || log.temp) && (<span className="flex items-center gap-1.5"><Thermometer size={12} className="text-steel-500" /> {log.weather ? `${log.weather}, ` : ''}{log.temp ? `${log.temp}°` : ''}</span>)}
                </div>
                {log.notes && <p className="mt-2 text-[11px] text-steel-500 italic border-l-2 border-steel-700 pl-2">"{log.notes}"</p>}
                
                <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-steel-700/50">
                    {log.createdBy && (<span className="flex items-center gap-1 text-[9px] text-steel-500"><User size={10} /> Created by {log.createdBy}</span>)}
                    {log.updatedBy && (<span className="flex items-center gap-1 text-[9px] text-steel-500"><Clock size={10} /> Modified by {log.updatedBy}</span>)}
                </div>
            </div>
            </div>)
        })}
      </div>
    </div>
  )
}
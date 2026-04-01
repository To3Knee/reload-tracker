import { useEffect, useState } from 'react'
import { createRangeLog, updateRangeLog, deleteRangeLog } from '../../lib/range'
import { getFirearms } from '../../lib/armory'
import { useAppStore } from '../../lib/store'
import { calculateStatistics } from '../../lib/math'
import { Target, Plus, MapPin, Calculator, AlertTriangle } from 'lucide-react'
import UploadButton from '../UploadButton'
import QRCode from 'qrcode'
import { HAPTIC } from '../../lib/haptics'
import { RangeLogCard, calculateMoa } from './RangeLogCard'
import { ErrorBanner } from '../ErrorBanner'
import { getLocalDate } from '../Purchases/purchaseHelpers'

const DEFAULT_FORM = {
  recipeId: '', batchId: '', firearmId: '', roundsFired: '',
  date: getLocalDate(), distance: 100, groupSize: '', velocity: '',
  sd: '', es: '', shots: [], weather: '', temp: '', notes: '', imageUrl: '',
}

export function RangeLogs({ recipes = [], canEdit, highlightId }) {
  const { rangeLogs: logs, batches: batchList, loading, refresh } = useAppStore()
  const [guns,           setGuns]           = useState([])
  const [isFormOpen,     setIsFormOpen]     = useState(false)
  const [editingId,      setEditingId]      = useState(null)
  const [verifyDeleteId, setVerifyDeleteId] = useState(null)
  const [error,          setError]          = useState(null)
  const [weatherError,   setWeatherError]   = useState(null)
  const [shotInput,      setShotInput]      = useState('')
  const [shotString,     setShotString]     = useState([])
  const [form,           setForm]           = useState(DEFAULT_FORM)
  const [lastUsedValues, setLastUsedValues] = useState({
    firearmId: '', batchId: '', recipeId: '', date: getLocalDate(), weather: '', temp: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    getFirearms(controller.signal).then(setGuns).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (shotString.length > 0) {
      const stats = calculateStatistics(shotString)
      setForm(prev => ({ ...prev, velocity: stats.avg, sd: stats.sd, es: stats.es, shots: shotString }))
    }
  }, [shotString])

  useEffect(() => {
    if (highlightId && logs.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`rangelog-${String(highlightId)}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 600)
    }
  }, [highlightId, logs])

  function handleNewLog() {
    setEditingId(null)
    setForm({ ...DEFAULT_FORM, ...lastUsedValues })
    setShotString([]); setWeatherError(null); setIsFormOpen(true); HAPTIC.click()
  }

  function handleStartEdit(log) {
    setEditingId(log.id); setWeatherError(null)
    const shots = log.shots || []
    setShotString(shots)
    setForm({
      recipeId: log.recipeId || '', batchId: log.batchId || '', firearmId: log.firearmId || '',
      roundsFired: log.roundsFired || '',
      date: log.date ? log.date.split('T')[0] : getLocalDate(),
      distance: log.distance || '', groupSize: log.groupSize || '',
      velocity: log.velocity || '', sd: log.sd || '', es: log.es || '', shots,
      weather: log.weather || '', temp: log.temp || '',
      notes: log.notes || '', imageUrl: log.imageUrl || '',
    })
    setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); HAPTIC.click()
  }

  function handleCancel() { setEditingId(null); setIsFormOpen(false); HAPTIC.soft() }

  function addShot() {
    const val = Number(shotInput)
    if (!val || val <= 0) return
    HAPTIC.click(); setShotString(prev => [...prev, val]); setShotInput('')
  }

  function removeShot(index) {
    HAPTIC.soft(); setShotString(prev => prev.filter((_, i) => i !== index))
  }

  async function handleAutoWeather() {
    setWeatherError(null)
    if (!navigator.geolocation) { setWeatherError('GPS hardware not found.'); return }
    HAPTIC.click()
    setForm(prev => ({ ...prev, weather: 'Locating...' }))
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Weather API Error')
        const data = await res.json(), cur = data.current
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        const windDir = dirs[Math.round(cur.wind_direction_10m / (360 / dirs.length)) % dirs.length]
        const desc = `Wind: ${cur.wind_speed_10m}mph ${windDir}, Baro: ${cur.surface_pressure}hPa, Hum: ${cur.relative_humidity_2m}%`
        setForm(prev => ({ ...prev, temp: Math.round(cur.temperature_2m), weather: desc }))
        HAPTIC.success()
      } catch (e) {
        setForm(prev => ({ ...prev, weather: '' })); setWeatherError('Weather service unavailable.'); HAPTIC.error()
      }
    }, (err) => {
      setForm(prev => ({ ...prev, weather: '' }))
      let msg = 'Location access denied.'
      if (err.code === 1) msg = '🚫 Blocked. Go to Settings > Privacy > Location to enable.'
      else if (err.code === 2) msg = '⚠️ Signal Lost. Move outdoors.'
      else if (err.code === 3) msg = '⏱️ Timeout. Please try again.'
      setWeatherError(msg); HAPTIC.error()
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { ...form, shots: shotString }
      if (editingId) {
        await updateRangeLog(editingId, payload)
      } else {
        await createRangeLog(payload)
        setLastUsedValues({ firearmId: form.firearmId, batchId: form.batchId, recipeId: form.recipeId, date: form.date, weather: form.weather, temp: form.temp })
      }
      HAPTIC.success(); handleCancel(); refresh()
    } catch (err) { setError(`Failed to save: ${err.message || 'Unknown error'}`); HAPTIC.error() }
  }

  async function handleDelete(id) {
    setVerifyDeleteId(null); HAPTIC.soft()
    try {
      await deleteRangeLog(id); HAPTIC.success(); refresh()
    } catch (err) { setError(`Failed to delete: ${err.message || 'Unknown error'}`); HAPTIC.error() }
  }

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const getRecipeDisplay = (log) => {
    if (log.recipeName) return `${log.recipeName} (${log.caliber})`
    const r = recipes.find(x => String(x.id) === String(log.recipeId))
    return r ? `${r.name} (${r.caliber})` : 'Unknown Load'
  }

  async function handlePrintLog(log) {
    HAPTIC.click()
    const win = window.open('', '_blank')
    if (!win) { setError('Pop-up blocked. Please allow popups for this site.'); return }
    win.document.write('<html><body style="background:#fff"><p style="color:#aaa;font-family:monospace;padding:20px;font-size:12px">Generating Ballistic Certificate...</p></body></html>')

    const title = getRecipeDisplay(log)
    const [recipeName, caliber] = title.includes('(') ? title.split('(') : [title, '']
    const cleanCaliber = caliber ? caliber.replace(')', '') : ''
    const moa = calculateMoa(log.groupSize, log.distance)
    const dateStr = log.date ? log.date.split('T')[0] : 'Unknown Date'
    const logoUrl = `${window.location.origin}/logo.png`
    let qrDataUri = ''
    try { qrDataUri = await QRCode.toDataURL(`${window.location.origin}/?rangeLogId=${log.id}`, { width: 120, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } }) } catch (e) {}

    const r = recipes.find(x => String(x.id) === String(log.recipeId)) || {}
    const bullet = r.bulletName ? `${r.bulletWeightGr || '?'}gr ${r.bulletName}` : '---'
    const powder = r.powderName ? `${r.chargeGrains  || '?'}gr ${r.powderName}`  : '---'
    const primer = r.primerName || '---'
    const coal   = r.coal ? `${r.coal}"` : '---'

    const shotsDisplay = (log.shots?.length > 0)
      ? `<div class="sect">Shot String (n=${log.shots.length})</div><div class="shots-wrap"><span class="shots-data">${log.shots.map(s => esc(String(s))).join(' · ')}</span></div>`
      : ''

    let weatherHtml = ''
    if (log.weather) {
      const wParts = log.weather.split(',')
      const tempStr = log.temp ? ` · ${esc(String(log.temp))}°F` : ''
      weatherHtml = wParts.length >= 3 && !log.weather.includes('Wind:')
        ? `<div class="wx-row"><span class="wx-tag">Conditions</span><span class="wx-val">Wind: ${esc(wParts[0].trim())} · Baro: ${esc(wParts[1].trim())} · Hum: ${esc(wParts[2].trim())}${tempStr}</span></div>`
        : `<div class="wx-row"><span class="wx-tag">Conditions</span><span class="wx-val">${esc(log.weather)}${tempStr}</span></div>`
    }

    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><title>Ballistic Certificate — Log #${log.id}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page { size: letter portrait; margin: 0.5in; }
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Inter', sans-serif; background: #fff; color: #111; font-size: 10px; }
.hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #c42b21; margin-bottom: 16px; }
.hdr-l { flex: 1; min-width: 0; }
.eyebrow { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; color: #c42b21; margin-bottom: 4px; }
.rname { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #111; line-height: 1; letter-spacing: -0.01em; }
.rcal { font-size: 9px; font-weight: 700; color: #c42b21; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 3px; }
.rmeta { font-size: 8px; color: #777; margin-top: 3px; letter-spacing: 0.04em; }
.hdr-r { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: 16px; }
.logo { height: 44px; width: auto; } .qr-img { width: 54px; height: 54px; display: block; border: 1px solid #ddd; padding: 2px; }
.load-strip { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 8px 14px; display: flex; flex-wrap: wrap; gap: 6px 24px; margin-bottom: 16px; }
.load-item { display: flex; flex-direction: column; }
.load-label { font-size: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #c42b21; margin-bottom: 2px; }
.load-val { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; color: #111; }
.target-wrap { border: 1px solid #e0d8cf; border-radius: 3px; height: 2.8in; overflow: hidden; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; background: #faf8f6; }
.target-img { max-width: 100%; max-height: 100%; object-fit: contain; } .no-img { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #ccc; }
.sect { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: #c42b21; display: flex; align-items: center; gap: 8px; margin: 14px 0 8px; padding-top: 14px; border-top: 1px solid #222; }
.sect:first-child { margin-top: 0; padding-top: 0; border-top: none; } .sect::after { content: ''; flex: 1; height: 1px; background: #333; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.stat-box { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 8px 10px; } .stat-box.hi { border-left: 3px solid #c42b21; }
.slabel { font-size: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #999; display: block; margin-bottom: 3px; }
.sval { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 900; color: #111; display: block; line-height: 1; } .sval.cu { color: #c42b21; } .sunit { font-size: 8px; font-weight: 500; color: #aaa; margin-left: 2px; }
.wx-row { display: flex; align-items: baseline; gap: 8px; background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 6px 10px; margin-bottom: 8px; }
.wx-tag { font-size: 6.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #c42b21; flex-shrink: 0; } .wx-val { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #444; }
.shots-wrap { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 7px 10px; margin-bottom: 8px; } .shots-data { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #555; line-height: 1.6; word-break: break-all; }
.notes-box { background: #faf8f6; border: 1px solid #e0d8cf; border-left: 3px solid #c42b21; border-radius: 0 3px 3px 0; padding: 8px 12px; } .notes-txt { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; color: #444; line-height: 1.6; white-space: pre-wrap; }
.footer { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e0d8cf; margin-top: 18px; font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #aaa; text-transform: uppercase; letter-spacing: 0.12em; }
.close-btn { position: fixed; top: 12px; right: 12px; background: #f0ede8; color: #333; padding: 5px 12px; border-radius: 4px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid #d0c8bf; cursor: pointer; }
@media print { .close-btn { display: none !important; } }
</style></head><body>
<button onclick="window.close()" class="close-btn">✕ Close</button>
<div class="hdr">
  <div class="hdr-l"><div class="eyebrow">Ballistic Certificate · Reload Tracker</div><div class="rname">${esc(recipeName)}</div><div class="rcal">${esc(cleanCaliber)}</div><div class="rmeta">${dateStr}${log.location ? ' · ' + esc(log.location) : ''}${log.firearmName ? ' · ' + esc(log.firearmName) : ''}${log.batchId ? ' · Batch #' + log.batchId : ''}</div></div>
  <div class="hdr-r">${qrDataUri ? `<img src="${qrDataUri}" class="qr-img"/>` : ''}<img src="${logoUrl}" class="logo"/></div>
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

    win.document.open(); win.document.write(html); win.document.close()
  }

  const inputClass = 'rt-input'
  const labelClass = 'rt-label'

  return (
    <div className="space-y-6">
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Performance</span>
          <h2 className="rt-section-title">RANGE LOGS</h2>
        </div>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <div className="flex justify-end border-b border-steel-700 pb-2 mb-6">
        {canEdit && !isFormOpen && (
          <button onClick={handleNewLog} className="rt-btn rt-btn-secondary"><Plus size={12} /> New Session</button>
        )}
      </div>

      {isFormOpen && (
        <div className="glass p-6 border border-red-500/30 animation-fade-in">
          <h3 className="text-sm font-bold text-steel-200 mb-4 flex justify-between items-center">
            <span>{editingId ? 'Edit Range Log' : 'New Range Session'}</span>
          </h3>

          {weatherError && (
            <div className="mb-4 p-2 bg-red-900/30 border border-red-500/30 rounded flex items-center gap-2 text-xs text-red-300">
              <AlertTriangle size={14} /> {weatherError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Recipe</label>
                <select className={inputClass} value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e.target.value })} required>
                  <option value="">Select Recipe...</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.caliber})</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Firearm Used</label>
                <select className={inputClass} value={form.firearmId} onChange={e => setForm({ ...form, firearmId: e.target.value })}>
                  <option value="">Select Firearm...</option>
                  {(guns || []).map(g => <option key={g.id} value={g.id}>{g.name} ({g.caliber})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Batch (Optional)</label>
                <select className={inputClass} value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                  <option value="">No specific batch</option>
                  {batchList.map(b => <option key={b.id} value={b.id}>#{b.id} - {b.recipe}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-steel-700">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}><Calculator size={12} className="inline mr-1" /> Shot String Calculator</label>
                <span className="text-[9px] text-steel-500">{shotString.length} shots recorded</span>
              </div>
              <div className="flex gap-2">
                <input type="number" className={inputClass.replace('w-full', '') + ' flex-1 min-w-0'} placeholder="Enter velocity (fps)..." value={shotInput} onChange={e => setShotInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addShot())} />
                <button type="button" onClick={addShot} className="rt-btn rt-btn-icon flex-shrink-0"><Plus size={14} /></button>
              </div>
              {shotString.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 max-h-20 overflow-y-auto custom-scrollbar">
                  {shotString.map((s, i) => (
                    <span key={i} onClick={() => removeShot(i)} className="px-2 py-1 rounded bg-steel-700/50 text-[10px] text-steel-300 border border-steel-600 hover:border-red-500/50 hover:text-red-400 cursor-pointer transition flex items-center gap-1">{s}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div><label className={labelClass}>Rounds Fired</label><input type="number" className={inputClass} value={form.roundsFired} onChange={e => setForm({ ...form, roundsFired: e.target.value })} placeholder="Rounds Fired" /></div>
              <div><label className={labelClass}>Distance (yds)</label><input type="number" className={inputClass} value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelClass}>Group (in)</label><input type="number" step="0.01" className={inputClass} value={form.groupSize} onChange={e => setForm({ ...form, groupSize: e.target.value })} /></div>
              <div><label className={labelClass}>Avg Velocity</label><input type="number" className={inputClass} value={form.velocity} readOnly placeholder="Auto-calc" /></div>
              <div>
                <label className={labelClass}>SD / ES</label>
                <div className="flex gap-1">
                  <input placeholder="SD" className={inputClass.replace('w-full', '') + ' flex-1 min-w-0'} value={form.sd} readOnly />
                  <input placeholder="ES" className={inputClass.replace('w-full', '') + ' flex-1 min-w-0'} value={form.es} readOnly />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Weather / Temp</label>
                  <div className="flex gap-2 items-center">
                    <input placeholder="Conditions (Auto-fill)" className={inputClass.replace('w-full', '') + ' flex-1 min-w-0'} value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })} />
                    <button type="button" onClick={handleAutoWeather} className="rt-btn rt-btn-icon w-10 h-[34px] flex-shrink-0" title="Auto-Locate Weather"><MapPin size={16} /></button>
                    <input placeholder="°F" className={inputClass.replace('w-full', '') + ' w-20 flex-shrink-0 text-center'} type="number" value={form.temp} onChange={e => setForm({ ...form, temp: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Target Image</label>
                  <div className="bg-black/20 rounded-xl p-3 border border-steel-700 flex flex-col justify-center h-[100px]">
                    <UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} />
                  </div>
                </div>
              </div>
              <div><label className={labelClass}>Notes</label><textarea className={inputClass + ' h-full min-h-[120px] resize-none'} placeholder="How did it shoot?" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleCancel} className="rt-btn rt-btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="rt-btn rt-btn-primary disabled:opacity-60">{loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Save Log')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {logs.length === 0 && !isFormOpen && (
          <div className="text-center p-12 border border-dashed border-steel-700 rounded-lg">
            <Target size={48} className="mx-auto mb-3 text-steel-600" />
            <p className="text-steel-500 text-sm">No range logs recorded yet.</p>
            <p className="text-[11px] text-steel-500 mt-1">Log your first trip to track groups and velocity.</p>
          </div>
        )}
        {logs.map(log => (
          <RangeLogCard
            key={log.id}
            log={log}
            highlightId={highlightId}
            canEdit={canEdit}
            verifyDeleteId={verifyDeleteId}
            recipes={recipes}
            onPrint={handlePrintLog}
            onEdit={handleStartEdit}
            onPromptDelete={setVerifyDeleteId}
            onConfirmDelete={handleDelete}
            onCancelDelete={() => setVerifyDeleteId(null)}
          />
        ))}
      </div>
    </div>
  )
}

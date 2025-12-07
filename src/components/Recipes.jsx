//===============================================================
//Script Name: Recipes.jsx
//Script Location: src/components/Recipes.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 4.7.0
//About: Manage recipes. 
//       Updated: Fixed mobile blowout (overflow) & Modal Safe Areas.
//===============================================================

import { useEffect, useState, useMemo } from 'react'
import {
  getAllRecipes,
  saveRecipe,
  deleteRecipe,
  formatCurrency
} from '../lib/db'
import { getFirearms } from '../lib/armory'
import { downloadExcel } from '../lib/excel'
import { createBatch } from '../lib/batches'
import { 
  ClipboardList, X, User, Clock, Printer, FileText, 
  Crosshair, HelpCircle, AlertTriangle, Trash2, AlignLeft
} from 'lucide-react'
import { HAPTIC } from '../lib/haptics'
import { calculateCostPerUnit } from '../lib/math'

// --- INTERNAL MATH HELPERS ---
function parseTwistRate(twist) {
  if (!twist) return null
  const match = String(twist).match(/(\d+(\.\d+)?)$/)
  return match ? parseFloat(match[0]) : null
}

function calculateStability(weight, length, diameter, twist, velocity) {
  if (!weight || !length || !diameter || !twist || !velocity) return 0
  const t = twist / diameter
  const s = (30 * weight) / (Math.pow(t, 2) * Math.pow(diameter, 3) * length * (1 + Math.pow(length / diameter, 2)))
  return s
}

function guessDiameter(caliberName) {
    const c = (caliberName || '').toLowerCase()
    if (c.includes('6.5') || c.includes('260') || c.includes('creedmoor')) return 0.264
    if (c.includes('308') || c.includes('7.62') || c.includes('30-06') || c.includes('300 win')) return 0.308
    if (c.includes('223') || c.includes('5.56')) return 0.224
    if (c.includes('9mm')) return 0.355
    if (c.includes('45 acp')) return 0.451
    return 0
}
// -----------------------------------------------------------

const PROFILE_TYPES = [
  { value: 'range', label: 'Range / Plinking' },
  { value: 'subsonic', label: 'Subsonic' },
  { value: 'defense', label: 'Home / Self Defense' },
  { value: 'competition', label: 'Competition' },
  { value: 'custom', label: 'Custom / Other' },
]

const DEFAULT_FORM = {
  name: '', caliber: '', profileType: 'range', source: '', chargeGrains: '', notes: '', rangeNotes: '',
  bulletWeightGr: '', muzzleVelocityFps: '', zeroDistanceYards: '', groupSizeInches: '',
  powderLotId: '', bulletLotId: '', primerLotId: '', caseLotId: ''
}

export function Recipes({ onUseRecipe, canEdit = true, purchases = [] }) {
  const [recipes, setRecipes] = useState([])
  const [guns, setGuns] = useState([]) 
  const [form, setForm] = useState(DEFAULT_FORM)
  
  // UI States
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [archivingId, setArchivingId] = useState(null)
  
  // Custom Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // --- STABILITY STATE ---
  const [selectedFirearmId, setSelectedFirearmId] = useState('')
  const [bulletLength, setBulletLength] = useState('')
  const [showStabilityHelp, setShowStabilityHelp] = useState(false)

  // --- BATCH MODAL STATE ---
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchRecipe, setBatchRecipe] = useState(null)
  const [batchForm, setBatchForm] = useState({ rounds: '', powderLotId: '', bulletLotId: '', primerLotId: '', caseLotId: '', notes: '' })
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  // --- INVENTORY FILTERS ---
  const activePurchases = useMemo(() => purchases.filter(p => p.status !== 'depleted'), [purchases])
  const powders = useMemo(() => activePurchases.filter(p => p.componentType === 'powder'), [activePurchases])
  const bullets = useMemo(() => activePurchases.filter(p => p.componentType === 'bullet'), [activePurchases])
  const primers = useMemo(() => activePurchases.filter(p => p.componentType === 'primer'), [activePurchases])
  const cases = useMemo(() => activePurchases.filter(p => p.componentType === 'case'), [activePurchases])

  const renderOptionLabel = p => {
      const cost = calculateCostPerUnit(p.price, p.shipping, p.tax, p.qty)
      return `${p.lotId || 'LOT'} — ${p.brand || 'Unknown'}${p.name ? ` • ${p.name}` : ''} (${p.qty} ${p.unit}, ${formatCurrency(cost)}/u)`
  }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
        const rData = await getAllRecipes()
        setRecipes(rData)
        try { const gData = await getFirearms(); setGuns(gData); } catch (e) { console.warn(e) }
    } catch (err) { setError("Failed to connect to server. Data may be stale.") }
  }

  const stability = useMemo(() => {
    const weight = Number(form.bulletWeightGr)
    const velocity = Number(form.muzzleVelocityFps) || 2800 
    const activeGun = guns.find(g => String(g.id) === String(selectedFirearmId))
    const twist = activeGun ? parseTwistRate(activeGun.specs?.twistRate) : null
    const length = Number(bulletLength)
    const diameter = guessDiameter(form.caliber)
    if (!weight || !twist || !length || !diameter) return null
    const sg = calculateStability(weight, length, diameter, twist, velocity)
    if (sg < 1.0) return { sg: sg.toFixed(2), status: 'Unstable', color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-900/10' }
    if (sg < 1.4) return { sg: sg.toFixed(2), status: 'Marginal', color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-900/10' }
    return { sg: sg.toFixed(2), status: 'Stable', color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-900/10' }
  }, [form.bulletWeightGr, form.muzzleVelocityFps, form.caliber, selectedFirearmId, bulletLength, guns])

  function updateField(field, value) { setForm(prev => ({ ...prev, [field]: value })); if (error) setError(null); }
  function resetForm() { setForm(DEFAULT_FORM); setEditingRecipe(null); setBulletLength(''); setSelectedFirearmId(''); setError(null); }

  async function handleSubmit(e) {
    e.preventDefault(); if (!canEdit) return; setSaving(true); setError(null);
    try {
      const base = {
        name: form.name?.trim() || '', caliber: form.caliber?.trim() || '', profileType: form.profileType || 'custom', source: form.source?.trim() || '',
        chargeGrains: form.chargeGrains !== '' ? Number(form.chargeGrains) : null, notes: form.notes || '', rangeNotes: form.rangeNotes || '',
        bulletWeightGr: form.bulletWeightGr !== '' ? Number(form.bulletWeightGr) : null, muzzleVelocityFps: form.muzzleVelocityFps !== '' ? Number(form.muzzleVelocityFps) : null,
        zeroDistanceYards: form.zeroDistanceYards !== '' ? Number(form.zeroDistanceYards) : null, groupSizeInches: form.groupSizeInches !== '' ? Number(form.groupSizeInches) : null,
        powderLotId: form.powderLotId || null, bulletLotId: form.bulletLotId || null, primerLotId: form.primerLotId || null, caseLotId: form.caseLotId || null
      }
      const payload = editingRecipe ? { ...editingRecipe, ...base, archived: typeof editingRecipe.archived === 'boolean' ? editingRecipe.archived : false } : { ...base, archived: false }
      await saveRecipe(payload); HAPTIC.success(); resetForm(); await loadData();
    } catch (err) { setError(`Failed to save: ${err.message || "Unknown error"}`); HAPTIC.error(); } finally { setSaving(false); }
  }

  function handleEdit(recipe) {
    if (!canEdit) return; setEditingRecipe(recipe);
    setForm({
      name: recipe.name || '', caliber: recipe.caliber || '', profileType: recipe.profileType || 'custom', source: recipe.source || '',
      chargeGrains: recipe.chargeGrains != null ? String(recipe.chargeGrains) : '', notes: recipe.notes || '', rangeNotes: recipe.rangeNotes || '',
      bulletWeightGr: recipe.bulletWeightGr != null ? String(recipe.bulletWeightGr) : '', muzzleVelocityFps: recipe.muzzleVelocityFps != null ? String(recipe.muzzleVelocityFps) : '',
      zeroDistanceYards: recipe.zeroDistanceYards != null ? String(recipe.zeroDistanceYards) : '', groupSizeInches: recipe.groupSizeInches != null ? String(recipe.groupSizeInches) : '',
      powderLotId: recipe.powderLotId || '', bulletLotId: recipe.bulletLotId || '', primerLotId: recipe.primerLotId || '', caseLotId: recipe.caseLotId || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' }); HAPTIC.click();
  }

  function promptDelete(recipe) { if (!canEdit) return; setRecipeToDelete(recipe); setDeleteModalOpen(true); HAPTIC.click(); }
  async function executeDelete() {
    if (!recipeToDelete) return; setIsDeleting(true);
    try {
      await deleteRecipe(recipeToDelete.id); HAPTIC.success(); if (editingRecipe && editingRecipe.id === recipeToDelete.id) resetForm();
      await loadData(); setDeleteModalOpen(false); setRecipeToDelete(null);
    } catch (err) { setError(`Failed to delete: ${err.message}`); setDeleteModalOpen(false); HAPTIC.error(); } finally { setIsDeleting(false); }
  }

  async function handleArchiveToggle(recipe) {
    if (!canEdit || !recipe) return; setArchivingId(recipe.id);
    try { const updated = { ...recipe, archived: !recipe.archived }; await saveRecipe(updated); HAPTIC.soft(); if (editingRecipe && editingRecipe.id === recipe.id) setEditingRecipe(updated); await loadData(); } catch (err) { setError(`Failed: ${err.message}`); } finally { setArchivingId(null); }
  }

  function handleExportExcel(dataToExport = recipes, filenameSuffix = 'all') {
    HAPTIC.click(); const timestamp = new Date().toISOString().slice(0, 10);
    const columns = [ { header: 'Recipe Name', key: 'name', width: 25 }, { header: 'Caliber', key: 'caliber', width: 15 }, { header: 'Powder', key: 'powderName', width: 20 }, { header: 'Charge (gr)', key: 'chargeGrains', width: 15 }, { header: 'Bullet', key: 'bulletName', width: 20 }, { header: 'Velocity (fps)', key: 'muzzleVelocityFps', width: 15 }, { header: 'Notes', key: 'notes', width: 40 } ];
    downloadExcel(dataToExport, columns, `reload-tracker-recipes-${filenameSuffix}-${timestamp}`);
  }

  function handleExportPdf(recipe) {
    if (!recipe) return; HAPTIC.click();
    try {
        const resolve = (lotId, type) => { if (!lotId) return '---'; const p = purchases.find(i => String(i.id) === String(lotId)); return p ? `${p.brand || ''} ${p.name || type}`.trim() : `Lot #${lotId}`; }
        const powderName = recipe.powderName || resolve(recipe.powderLotId, 'Powder'); const bulletName = recipe.bulletName || resolve(recipe.bulletLotId, 'Bullet');
        const primerName = recipe.primerName || resolve(recipe.primerLotId, 'Primer'); const caseName = recipe.caseName || resolve(recipe.caseLotId, 'Brass');
        const logoUrl = `${window.location.origin}/logo.png`; const name = recipe.name || 'Untitled'; const caliber = recipe.caliber || 'Unknown'; const source = recipe.source || ''; const charge = recipe.chargeGrains ? `${recipe.chargeGrains} gr` : '---';
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');@page{margin:0;size:6in 4in}body{margin:0;padding:0;font-family:'Inter',sans-serif;background:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#111}.card{width:6in;height:4in;background:#fdfbf7;position:relative;overflow:hidden;display:flex;flex-direction:column}.header{background:#111;color:#fff;padding:.8rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #b33c3c}.header-text h1{margin:0;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.header-text h2{margin:2px 0 0 0;font-size:11px;font-weight:500;color:#999;text-transform:uppercase;letter-spacing:.2em}.logo{width:110px;height:auto}.content{padding:.8rem 2rem;flex:1;display:flex;gap:1.5rem}.main-specs{flex:1;display:flex;flex-direction:column;gap:8px}.stat-row{display:flex;flex-direction:column;border-bottom:1px solid #e5e5e5;padding-bottom:3px}.stat-row:last-child{border-bottom:none}.stat-label{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:1px}.stat-value{font-size:11px;font-weight:700;color:#000;line-height:1.2;text-align:left}.notes-section{flex:1.3;background:#f5f5f5;border-radius:8px;padding:.75rem;border:1px solid #ddd;display:flex;flex-direction:column}.notes-label{font-size:9px;font-weight:700;color:#b33c3c;text-transform:uppercase;letter-spacing:.15em;margin-bottom:.25rem;display:block}.notes-body{font-size:10px;line-height:1.3;color:#333;flex:1;white-space:pre-wrap}.footer{padding:.3rem 2rem;background:#e5e5e5;text-align:center;font-size:8px;color:#666;text-transform:uppercase;letter-spacing:.1em}.close-btn{position:fixed;top:10px;right:10px;z-index:9999;background:rgba(0,0,0,.8);color:#fff;padding:12px 24px;border-radius:50px;font-family:sans-serif;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 4px 15px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.2);cursor:pointer;backdrop-filter:blur(10px)}@media print{.close-btn{display:none!important}}</style></head><body><button onclick="window.close()" class="close-btn">Done / Close</button><div class="card"><div class="header"><div class="header-text"><h1>${name}</h1><h2>${caliber}</h2></div><img src="${logoUrl}" class="logo" alt="Reload Tracker"/></div><div class="content"><div class="main-specs"><div class="stat-row"><span class="stat-label">Bullet</span><span class="stat-value">${bulletName}</span></div><div class="stat-row"><span class="stat-label">Powder</span><span class="stat-value">${powderName}</span></div><div class="stat-row"><span class="stat-label">Charge</span><span class="stat-value">${charge}</span></div><div class="stat-row"><span class="stat-label">Primer</span><span class="stat-value">${primerName}</span></div><div class="stat-row"><span class="stat-label">Brass</span><span class="stat-value">${caseName}</span></div>${source?`<div class="stat-row"><span class="stat-label">Source</span><span class="stat-value">${source}</span></div>`:''}</div><div class="notes-section"><span class="notes-label">Load Notes</span><div class="notes-body">${recipe.notes||'No specific load notes.'}</div></div></div><div class="footer">Generated by Reload Tracker • Safety First • Verify All Loads</div></div><script>window.onload=()=>setTimeout(()=>window.print(),500);</script></body></html>`;
        const win = window.open('', '_blank'); if (!win) { setError('Pop-up blocked.'); return; }
        win.document.open(); win.document.write(html); win.document.close();
    } catch (e) { setError(`Failed to generate PDF: ${e.message}`); }
  }

  function openBatchModal(recipe) {
    if (!canEdit) return; setBatchRecipe(recipe); HAPTIC.click();
    const filterCaliber = (p) => !p.caliber || !recipe.caliber || p.caliber === recipe.caliber; const active = (p) => p.status !== 'depleted';
    const fallback = (type) => purchases.find(p => p.componentType === type && active(p) && filterCaliber(p));
    setBatchForm({ rounds: recipe.lotSize || 100, powderLotId: recipe.powderLotId || (fallback('powder')?.id || ''), bulletLotId: recipe.bulletLotId || (fallback('bullet')?.id || ''), primerLotId: recipe.primerLotId || (fallback('primer')?.id || ''), caseLotId: recipe.caseLotId || (fallback('case')?.id || ''), notes: '' });
    setBatchModalOpen(true);
  }

  async function handleBatchSubmit(e) {
    e.preventDefault(); if (!batchRecipe) return; setBatchSubmitting(true);
    try { await createBatch({ recipeId: batchRecipe.id, ...batchForm }); HAPTIC.success(); setBatchModalOpen(false); setBatchRecipe(null); } catch (err) { setError(`Batch failed: ${err.message}`); setBatchModalOpen(false); } finally { setBatchSubmitting(false); }
  }

  const inputClass = 'w-full bg-black/60 border border-slate-700/70 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/60 placeholder:text-slate-600'
  const labelClass = 'block text-xs font-semibold text-slate-400 mb-1'

  return (
    <div className="space-y-6">
      
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Load Data</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">RECIPES</h2>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div><h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">{editingRecipe ? 'MODIFY LOAD DATA' : 'NEW LOAD DEFINITION'}</h3></div>
        {error && (<div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2"><AlertTriangle className="text-red-500 flex-shrink-0" size={20} /><div className="flex-1"><p className="text-xs font-bold text-red-400">System Notification</p><p className="text-xs text-red-200/80">{error}</p></div><button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16}/></button></div>)}

        {canEdit ? (
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2 lg:col-span-3"><label className={labelClass}>Recipe Name</label><input className={inputClass} placeholder="e.g. 9mm Range Plinker" value={form.name} onChange={e => updateField('name', e.target.value)} /></div>
            <div><label className={labelClass}>Caliber</label><input className={inputClass} placeholder="9mm, .223..." value={form.caliber} onChange={e => updateField('caliber', e.target.value)} /></div>
            <div><label className={labelClass}>Profile Type</label><select className={inputClass} value={form.profileType} onChange={e => updateField('profileType', e.target.value)}>{PROFILE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            <div><label className={labelClass}>Source (Manual/Data)</label><input className={inputClass} placeholder="e.g. Hornady 11th Ed" value={form.source} onChange={e => updateField('source', e.target.value)} /></div>
            
            <div className="md:col-span-2 lg:col-span-3 pt-2 border-t border-slate-800/50"><p className="text-[10px] uppercase text-slate-500 tracking-[0.2em]">Ingredients (Inventory Link)</p></div>
            <div><label className={labelClass}>Powder</label><select className={inputClass} value={form.powderLotId} onChange={e => updateField('powderLotId', e.target.value)}><option value="">Select Powder...</option>{powders.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>
            <div><label className={labelClass}>Charge (gr)</label><input type="number" min="0" step="0.01" className={inputClass} value={form.chargeGrains} onChange={e => updateField('chargeGrains', e.target.value)} /></div>
            <div className="hidden lg:block"></div>
            <div><label className={labelClass}>Bullet</label><select className={inputClass} value={form.bulletLotId} onChange={e => updateField('bulletLotId', e.target.value)}><option value="">Select Bullet...</option>{bullets.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>
            <div><label className={labelClass}>Primer</label><select className={inputClass} value={form.primerLotId} onChange={e => updateField('primerLotId', e.target.value)}><option value="">Select Primer...</option>{primers.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>
            <div><label className={labelClass}>Brass</label><select className={inputClass} value={form.caseLotId} onChange={e => updateField('caseLotId', e.target.value)}><option value="">Select Brass...</option>{cases.map(p => <option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>)}</select></div>

            <div className="md:col-span-2 lg:col-span-3 pt-4">
                <div className={`border rounded-xl transition-all duration-300 ${stability ? stability.border + ' ' + stability.bg : 'border-slate-800 bg-black/40'}`}>
                    <div className="p-3 flex items-center justify-between border-b border-slate-800/50">
                        <div className="flex items-center gap-2"><Crosshair size={14} className={stability ? stability.color : "text-slate-500"} /><span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Stability Analysis</span></div>
                        <div className="flex items-center gap-2">{stability && (<span className={`text-[10px] font-black uppercase tracking-wider ${stability.color}`}>{stability.status} (SG: {stability.sg})</span>)}<button type="button" onClick={() => setShowStabilityHelp(!showStabilityHelp)} className="text-slate-600 hover:text-white transition"><HelpCircle size={14}/></button></div>
                    </div>
                    {showStabilityHelp && (<div className="px-3 py-2 bg-black/40 text-[10px] text-slate-400 border-b border-slate-800/50"><strong>How it works:</strong> Select a rifle from your Armory to pull its Twist Rate. Enter the Bullet Length. We calculate Miller Stability (SG). <br/><span className="text-emerald-400">Green (1.4+)</span> = Safe. <span className="text-red-400">Red (&lt;1.0)</span> = Unstable (Keyholing Risk).</div>)}
                    <div className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div><label className={labelClass}>Bullet Wt (gr)</label><input type="number" className={inputClass} placeholder="e.g. 168" value={form.bulletWeightGr} onChange={e => updateField('bulletWeightGr', e.target.value)} /></div>
                        <div><label className={labelClass}>Velocity (fps)</label><input type="number" className={inputClass} placeholder="e.g. 2650" value={form.muzzleVelocityFps} onChange={e => updateField('muzzleVelocityFps', e.target.value)} /></div>
                        <div className="lg:col-span-2 flex gap-3"><div className="flex-1"><label className={labelClass}>Check Against Rifle</label><select className={inputClass} value={selectedFirearmId} onChange={e => setSelectedFirearmId(e.target.value)}><option value="">Select Rifle (Twist)...</option>{guns.map(g => <option key={g.id} value={g.id}>{g.name} (1:{g.specs?.twistRate || '?'})</option>)}</select></div><div className="w-24"><label className={labelClass}>Len (in)</label><input type="number" step="0.01" className={inputClass} placeholder="1.2" value={bulletLength} onChange={e => setBulletLength(e.target.value)} /></div></div>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3"><label className={labelClass}>Notes</label><textarea className={inputClass + ' resize-none min-h-[60px]'} placeholder="Intended use, COAL, etc." value={form.notes} onChange={e => updateField('notes', e.target.value)} /></div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              {editingRecipe ? (<button type="button" onClick={resetForm} className="inline-flex items-center px-4 py-2 rounded-full border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition">Cancel edit</button>) : (<button type="button" onClick={resetForm} className="inline-flex items-center px-4 py-2 rounded-full border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition">Clear</button>)}
              <button type="submit" disabled={saving} className="inline-flex items-center px-5 py-2 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold shadow-lg shadow-red-900/40 transition disabled:opacity-60 text-white">{saving ? 'Saving…' : 'Save Recipe'}</button>
            </div>
          </form>
        ) : (<div className="mt-3 text-xs text-slate-400 border border-dashed border-slate-700/70 rounded-xl px-3 py-3 bg-black/30">Read-only mode. Sign in as a Reloader.</div>)}
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div><p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-1">Saved Recipes</p><p className="text-xs text-slate-400">{recipes.length === 0 ? 'No recipes yet.' : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} saved.`}</p></div>
          {recipes.length > 0 && (<span onClick={() => handleExportExcel(recipes, 'all')} className="px-3 py-1 rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer text-[10px] text-slate-400 flex items-center gap-1"><FileText size={10} /> Download All (Excel)</span>)}
        </div>

        {recipes.length > 0 && (
          <div className="grid gap-3">
            {recipes.map(r => {
              const profileLabel = PROFILE_TYPES.find(p => p.value === r.profileType)?.label || 'Custom'
              const isArchived = typeof r.archived === 'boolean' && r.archived
              const isArchiving = archivingId === r.id
              const isEditing = editingRecipe?.id === r.id
              const powder = r.powderName || (r.powderLotId ? `Powder #${r.powderLotId}` : '')
              const bullet = r.bulletName || (r.bulletLotId ? `Bullet #${r.bulletLotId}` : '')
              const createdStr = r.createdByUsername ? `Added by ${r.createdByUsername}` : null
              const updatedStr = r.updatedByUsername ? `Mod by ${r.updatedByUsername}` : null

              return (
                <div key={r.id} className={`group bg-black/40 border rounded-xl p-4 flex flex-col gap-3 transition-all hover:bg-black/60 ${isEditing ? 'border-red-500 ring-1 ring-red-500/50 shadow-red-900/20 shadow-lg' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                        <div className="text-sm font-bold text-slate-100 flex flex-wrap items-center gap-2">
                            <span>{r.name}</span>
                            {r.caliber && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium">{r.caliber}</span>}
                            {isArchived && <span className="px-1.5 py-0.5 rounded bg-amber-900/30 border border-amber-700/50 text-[9px] uppercase tracking-wider text-amber-500">Archived</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-2 items-center"><span className="text-slate-500">{profileLabel}</span><span className="w-1 h-1 rounded-full bg-slate-700"></span><span className="text-slate-300 font-medium">{r.chargeGrains} gr Charge</span></div>
                    </div>
                    {r.source && <div className="text-[9px] text-slate-600 uppercase tracking-wide border border-slate-800 px-2 py-0.5 rounded-full">{r.source}</div>}
                  </div>

                  {(powder || bullet) && (<div className="text-[10px] text-slate-500 bg-black/20 rounded-lg px-2 py-1.5 border border-slate-800/50">{powder && <span>{powder}</span>}{powder && bullet && <span className="mx-1.5 text-slate-700">•</span>}{bullet && <span>{bullet}</span>}</div>)}

                  {(r.notes || r.rangeNotes) && (
                      <div className="bg-black/20 rounded-lg p-2 border border-slate-800/50 text-[10px] text-slate-400">
                          {r.notes && (<div className="flex items-start gap-1.5 mb-1 last:mb-0"><AlignLeft size={10} className="mt-0.5 text-slate-600 flex-shrink-0" /><span className="line-clamp-2">{r.notes}</span></div>)}
                          {r.rangeNotes && (<div className="flex items-start gap-1.5 border-t border-slate-800/50 pt-1 mt-1"><Crosshair size={10} className="mt-0.5 text-emerald-600 flex-shrink-0" /><span className="line-clamp-2 text-emerald-500/80">{r.rangeNotes}</span></div>)}
                      </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/50 mt-1 gap-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {onUseRecipe && !isArchived && (<span onClick={() => onUseRecipe(r)} className="px-2 py-[2px] rounded-full bg-black/60 border border-emerald-500/40 text-emerald-300 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer text-[10px]">Use in Calculator</span>)}
                        {canEdit && (<span onClick={() => openBatchModal(r)} className="px-2 py-[2px] rounded-full bg-black/60 border border-red-500/40 text-red-300 hover:border-red-500/70 hover:text-red-200 transition cursor-pointer flex items-center gap-1 text-[10px]"><ClipboardList size={12} /> Load Batch</span>)}
                        <span onClick={() => handleExportPdf(r)} className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1 text-[10px]"><Printer size={12}/> Export PDF</span>
                        <span onClick={() => handleExportExcel([r], `single-${r.name.replace(/\s+/g,'-')}`)} className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1 text-[10px]"><FileText size={12}/> Export Excel</span>
                        {canEdit && (<><span onClick={() => handleEdit(r)} className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 transition cursor-pointer text-[10px]">Edit</span><span onClick={() => { if (!isArchiving) handleArchiveToggle(r) }} className={'px-2 py-[2px] rounded-full bg-black/60 border border-amber-400 text-amber-300 hover:bg-amber-500/10 transition cursor-pointer text-[10px] ' + (isArchiving ? 'opacity-50 pointer-events-none' : '')}>{isArchiving ? (isArchived ? 'Unarchiving…' : 'Archiving…') : (isArchived ? 'Unarchive' : 'Archive')}</span><span onClick={() => promptDelete(r)} className="px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-300 hover:bg-red-900/40 transition cursor-pointer text-[10px]">Delete</span></>)}
                    </div>
                    
                    {/* MOBILE FIX: Truncation for Attribution to prevent blowout */}
                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity min-w-0">
                        {createdStr && (<span className="flex items-center gap-1 px-2 py-[2px] rounded-full border border-slate-800 text-slate-500 bg-black/40 text-[9px] truncate max-w-[150px]"><User size={9} /> {createdStr}</span>)}
                        {updatedStr && (<span className="flex items-center gap-1 px-2 py-[2px] rounded-full border border-slate-800 text-slate-500 bg-black/40 text-[9px] truncate max-w-[150px]"><Clock size={9} /> {updatedStr}</span>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MOBILE FIX: Added P-4 padding and env(safe-area) top padding to Fixed Modals */}
      {deleteModalOpen && recipeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
            <div className="bg-[#0f0f10] border border-red-900/50 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto"><Trash2 className="text-red-500" size={24} /></div>
                <div><h3 className="text-lg font-bold text-white">Delete Recipe?</h3><p className="text-sm text-slate-400 mt-1">Are you sure you want to delete <span className="text-white font-medium">"{recipeToDelete.name}"</span>?<br/>This action cannot be undone.</p></div>
                <div className="grid grid-cols-2 gap-3 pt-2"><button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm transition">Cancel</button><button onClick={executeDelete} disabled={isDeleting} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 font-bold text-sm shadow-lg shadow-red-900/20 transition">{isDeleting ? 'Deleting...' : 'Delete Forever'}</button></div>
            </div>
        </div>
      )}

      {batchModalOpen && batchRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)]">
            <div className="bg-[#0f0f10] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-black/40"><h3 className="text-sm font-bold text-slate-200">Load Batch: {batchRecipe.name}</h3><button onClick={() => setBatchModalOpen(false)} className="text-slate-500 hover:text-white"><X size={16} /></button></div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>Rounds Loaded</label><input type="number" className={inputClass} value={batchForm.rounds} onChange={e => setBatchForm(p => ({ ...p, rounds: e.target.value }))} /></div><div><label className={labelClass}>Powder Lot</label><select className={inputClass} value={batchForm.powderLotId} onChange={e => setBatchForm(p => ({ ...p, powderLotId: e.target.value }))}><option value="">Select Powder...</option>{powders.map(p => (<option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>))}</select></div></div>
                     <div className="grid grid-cols-3 gap-4"><div><label className={labelClass}>Bullet Lot</label><select className={inputClass} value={batchForm.bulletLotId} onChange={e => setBatchForm(p => ({ ...p, bulletLotId: e.target.value }))}><option value="">Select...</option>{bullets.map(p => (<option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>))}</select></div><div><label className={labelClass}>Primer Lot</label><select className={inputClass} value={batchForm.primerLotId} onChange={e => setBatchForm(p => ({ ...p, primerLotId: e.target.value }))}><option value="">Select...</option>{primers.map(p => (<option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>))}</select></div><div><label className={labelClass}>Brass Lot</label><select className={inputClass} value={batchForm.caseLotId} onChange={e => setBatchForm(p => ({ ...p, caseLotId: e.target.value }))}><option value="">Select Brass...</option>{cases.map(p => (<option key={p.id} value={p.id}>{renderOptionLabel(p)}</option>))}</select></div></div>
                    <button onClick={handleBatchSubmit} disabled={batchSubmitting} className="w-full py-2 rounded-full bg-red-700 text-white font-bold text-xs hover:bg-red-600 transition shadow-lg shadow-red-900/20">Log Batch</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
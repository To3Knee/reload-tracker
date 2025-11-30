//===============================================================
//Script Name: Recipes.jsx
//Script Location: src/components/Recipes.jsx
//Date: 11/30/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 2.3.0
//About: Manage recipes. Features Haptic feedback for interactions.
//===============================================================

import { useEffect, useState } from 'react'
import {
  getAllRecipes,
  saveRecipe,
  deleteRecipe,
  formatCurrency,
  calculatePerUnit
} from '../lib/db'
import { downloadExcel } from '../lib/excel'
import { createBatch } from '../lib/batches' 
import { ClipboardList, X } from 'lucide-react'
import { HAPTIC } from '../lib/haptics' // NEW: Haptics

const PROFILE_TYPES = [
  { value: 'range', label: 'Range / Plinking' },
  { value: 'subsonic', label: 'Subsonic' },
  { value: 'defense', label: 'Home / Self Defense' },
  { value: 'competition', label: 'Competition' },
  { value: 'custom', label: 'Custom / Other' },
]

const DEFAULT_FORM = {
  name: '',
  caliber: '',
  profileType: 'range',
  source: '', 
  chargeGrains: '',
  brassReuse: 5,
  lotSize: 200,
  notes: '',
  bulletWeightGr: '',
  muzzleVelocityFps: '',
  zeroDistanceYards: '',
  groupSizeInches: '',
  rangeNotes: '',
}

export function Recipes({ onUseRecipe, canEdit = true, purchases = [] }) {
  const [recipes, setRecipes] = useState([])
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [archivingId, setArchivingId] = useState(null)

  // --- BATCH MODAL STATE ---
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchRecipe, setBatchRecipe] = useState(null)
  const [batchForm, setBatchForm] = useState({
    rounds: '',
    powderLotId: '',
    bulletLotId: '',
    primerLotId: '',
    caseLotId: '',
    notes: ''
  })
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  useEffect(() => {
    loadRecipes()
  }, [])

  async function loadRecipes() {
    const data = await getAllRecipes()
    setRecipes(data)
  }

  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(DEFAULT_FORM)
    setEditingRecipe(null)
  }

  const computedPowerFactor =
    form.bulletWeightGr && form.muzzleVelocityFps
      ? ((Number(form.bulletWeightGr) || 0) *
          (Number(form.muzzleVelocityFps) || 0)) /
        1000
      : 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)

    try {
      const base = {
        name: form.name?.trim() || '',
        caliber: form.caliber?.trim() || '',
        profileType: form.profileType || 'custom',
        source: form.source?.trim() || '',
        chargeGrains:
          form.chargeGrains !== '' ? Number(form.chargeGrains) : null,
        brassReuse:
          form.brassReuse !== '' ? Number(form.brassReuse) : null,
        lotSize:
          form.lotSize !== '' ? Number(form.lotSize) : null,
        notes: form.notes || '',
        bulletWeightGr:
          form.bulletWeightGr !== '' ? Number(form.bulletWeightGr) : null,
        muzzleVelocityFps:
          form.muzzleVelocityFps !== ''
            ? Number(form.muzzleVelocityFps)
            : null,
        zeroDistanceYards:
          form.zeroDistanceYards !== ''
            ? Number(form.zeroDistanceYards)
            : null,
        groupSizeInches:
          form.groupSizeInches !== ''
            ? Number(form.groupSizeInches)
            : null,
        rangeNotes: form.rangeNotes || '',
      }

      const powerFactor =
        base.bulletWeightGr && base.muzzleVelocityFps
          ? (base.bulletWeightGr * base.muzzleVelocityFps) / 1000
          : 0

      const payload = editingRecipe
        ? {
            ...editingRecipe,
            ...base,
            archived:
              typeof editingRecipe.archived === 'boolean'
                ? editingRecipe.archived
                : false,
            powerFactor,
          }
        : {
            ...base,
            archived: false,
            powerFactor,
          }

      await saveRecipe(payload)
      HAPTIC.success() // Success vibration
      resetForm()
      await loadRecipes()
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(recipe) {
    if (!canEdit) return
    setEditingRecipe(recipe)
    setForm({
      name: recipe.name || '',
      caliber: recipe.caliber || '',
      profileType: recipe.profileType || 'custom',
      source: recipe.source || '',
      chargeGrains:
        recipe.chargeGrains != null ? String(recipe.chargeGrains) : '',
      brassReuse: recipe.brassReuse != null ? recipe.brassReuse : 5,
      lotSize: recipe.lotSize != null ? recipe.lotSize : 200,
      notes: recipe.notes || '',
      bulletWeightGr:
        recipe.bulletWeightGr != null
          ? String(recipe.bulletWeightGr)
          : '',
      muzzleVelocityFps:
        recipe.muzzleVelocityFps != null
          ? String(recipe.muzzleVelocityFps)
          : '',
      zeroDistanceYards:
        recipe.zeroDistanceYards != null
          ? String(recipe.zeroDistanceYards)
          : '',
      groupSizeInches:
        recipe.groupSizeInches != null
          ? String(recipe.groupSizeInches)
          : '',
      rangeNotes: recipe.rangeNotes || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    HAPTIC.click()
  }

  async function handleDelete(id) {
    if (!canEdit) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this recipe? This cannot be undone.')
    ) {
      return
    }
    HAPTIC.error() // Warning buzz
    setDeletingId(id)
    try {
      await deleteRecipe(id)
      if (editingRecipe && editingRecipe.id === id) resetForm()
      await loadRecipes()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleArchiveToggle(recipe) {
    if (!canEdit || !recipe) return
    setArchivingId(recipe.id)
    try {
      const updated = {
        ...recipe,
        archived: !recipe.archived,
      }
      await saveRecipe(updated)
      HAPTIC.soft()
      if (editingRecipe && editingRecipe.id === recipe.id) {
        setEditingRecipe(updated)
      }
      await loadRecipes()
    } finally {
      setArchivingId(null)
    }
  }

  function escapeHtml(value) {
    if (value == null) return ''
    return String(value).replace(/[&<>"]/g, ch => {
      if (ch === '&') return '&amp;'
      if (ch === '<') return '&lt;'
      if (ch === '>') return '&gt;'
      if (ch === '"') return '&quot;'
      return ch
    })
  }

  function handleExportExcel(dataToExport = recipes, filenameSuffix = 'all') {
    HAPTIC.click()
    const timestamp = new Date().toISOString().slice(0, 10)
    
    const columns = [
      { header: 'Recipe Name', key: 'name', width: 25 },
      { header: 'Caliber', key: 'caliber', width: 15 },
      { header: 'Profile', key: 'profileType', width: 15 },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Bullet (gr)', key: 'bulletWeightGr', width: 12 },
      { header: 'Velocity (fps)', key: 'muzzleVelocityFps', width: 15 },
      { header: 'Power Factor', key: 'powerFactor', width: 15 },
      { header: 'Powder Charge (gr)', key: 'chargeGrains', width: 20 },
      { header: 'Zero (yd)', key: 'zeroDistanceYards', width: 10 },
      { header: 'Group (in)', key: 'groupSizeInches', width: 12 },
      { header: 'Load Notes', key: 'notes', width: 40 },
      { header: 'Range Notes', key: 'rangeNotes', width: 40 },
      { header: 'Date Created', key: 'createdAt', width: 15 }
    ]

    downloadExcel(dataToExport, columns, `reload-tracker-recipes-${filenameSuffix}-${timestamp}`)
  }

  function handleExportPdf(recipe) {
    if (!recipe) return
    HAPTIC.click()

    const logoUrl = `${window.location.origin}/logo.png`
    
    const name = recipe.name || 'Untitled Load'
    const caliber = recipe.caliber || 'Unknown Caliber'
    const bullet = recipe.bulletWeightGr ? `${recipe.bulletWeightGr}gr` : 'Unknown Bullet'
    const charge = recipe.chargeGrains ? `${recipe.chargeGrains} gr` : '---'
    const fps = recipe.muzzleVelocityFps ? `${recipe.muzzleVelocityFps} fps` : '---'
    const pf = recipe.powerFactor ? recipe.powerFactor.toFixed(1) : '---'
    const source = recipe.source || ''
    
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Recipe Card - ${escapeHtml(name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  @page { margin: 0; size: 6in 4in; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    background: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color: #111;
  }
  .card {
    width: 6in;
    height: 4in;
    background: #fdfbf7; 
    position: relative;
    overflow: visible;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: #111;
    color: #fff;
    padding: 0.8rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 4px solid #b33c3c; 
  }
  .header-text h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .header-text h2 {
    margin: 2px 0 0 0;
    font-size: 11px;
    font-weight: 500;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }
  .logo {
    width: 110px;
    height: auto;
  }
  .content {
    padding: 0.8rem 2rem;
    flex: 1;
    display: flex;
    gap: 1.5rem;
  }
  .main-specs {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .stat-row {
    display: flex;
    justify-content: space-between;
    border-bottom: 2px solid #e5e5e5;
    padding: 5px 0;
    align-items: baseline;
  }
  .stat-label {
    font-size: 10px;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .stat-value {
    font-size: 13px;
    font-weight: 700;
    color: #000;
  }
  .notes-section {
    flex: 1.3;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 0.75rem;
    border: 1px solid #ddd;
    display: flex;
    flex-direction: column;
  }
  .notes-label {
    font-size: 9px;
    font-weight: 700;
    color: #b33c3c;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 0.25rem;
    display: block;
  }
  .notes-body {
    font-size: 10px;
    line-height: 1.3;
    color: #333;
    flex: 1;
  }
  .footer {
    padding: 0.3rem 2rem;
    background: #e5e5e5;
    text-align: center;
    font-size: 8px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-text">
        <h1>${escapeHtml(name)}</h1>
        <h2>${escapeHtml(caliber)}</h2>
      </div>
      <img src="${logoUrl}" class="logo" alt="Reload Tracker" />
    </div>
    
    <div class="content">
      <div class="main-specs">
        <div class="stat-row">
          <span class="stat-label">Bullet</span>
          <span class="stat-value">${escapeHtml(bullet)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Charge</span>
          <span class="stat-value">${escapeHtml(charge)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Velocity</span>
          <span class="stat-value">${escapeHtml(fps)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Power Factor</span>
          <span class="stat-value">${escapeHtml(pf)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Zero</span>
            <span class="stat-value">${escapeHtml(recipe.zeroDistanceYards || '--')} yd</span>
        </div>
        ${source ? `<div class="stat-row"><span class="stat-label">Source</span><span class="stat-value" style="font-size:11px">${escapeHtml(source)}</span></div>` : ''}
      </div>
      
      <div class="notes-section">
        <span class="notes-label">Load Notes</span>
        <div class="notes-body">
          ${escapeHtml(recipe.notes || 'No load notes recorded.')}
          <br/><br/>
          <span style="font-weight:700">Range Notes:</span> ${escapeHtml(recipe.rangeNotes || 'No range data.')}
        </div>
      </div>
    </div>
    
    <div class="footer">
      Generated by Reload Tracker • Always verify load data.
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) {
      alert('Unable to open PDF window. Please allow pop-ups for this site.')
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  // --- BATCH MODAL HELPERS ---
  function openBatchModal(recipe) {
    if (!canEdit) return
    setBatchRecipe(recipe)
    HAPTIC.click()
    
    const filterCaliber = (p) => !p.caliber || !recipe.caliber || p.caliber === recipe.caliber
    const active = (p) => p.status !== 'depleted'

    const recPowder = purchases.find(p => p.componentType === 'powder' && active(p) && filterCaliber(p))
    const recBullet = purchases.find(p => p.componentType === 'bullet' && active(p) && filterCaliber(p))
    const recPrimer = purchases.find(p => p.componentType === 'primer' && active(p) && filterCaliber(p))
    const recCase = purchases.find(p => p.componentType === 'case' && active(p) && filterCaliber(p))

    setBatchForm({
      rounds: recipe.lotSize || 100,
      powderLotId: recPowder ? recPowder.id : '',
      bulletLotId: recBullet ? recBullet.id : '',
      primerLotId: recPrimer ? recPrimer.id : '',
      caseLotId: recCase ? recCase.id : '',
      notes: ''
    })
    setBatchModalOpen(true)
  }

  async function handleBatchSubmit(e) {
    e.preventDefault()
    if (!batchRecipe) return
    setBatchSubmitting(true)
    try {
      await createBatch({
        recipeId: batchRecipe.id,
        rounds: batchForm.rounds,
        powderLotId: batchForm.powderLotId,
        bulletLotId: batchForm.bulletLotId,
        primerLotId: batchForm.primerLotId,
        caseLotId: batchForm.caseLotId,
        notes: batchForm.notes
      })
      HAPTIC.success() // Vibrate on success
      setBatchModalOpen(false)
      setBatchRecipe(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setBatchSubmitting(false)
    }
  }

  const inputClass =
    'w-full bg-black/60 border border-slate-700/70 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/60 placeholder:text-slate-600'
  const labelClass =
    'block text-xs font-semibold text-slate-400 mb-1'

  return (
    <div className="space-y-8">
      {/* Form */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-2">
            Round Configurations
          </p>
          <h2 className="text-2xl font-bold glow-red">
            {editingRecipe ? 'Edit recipe' : 'Define your recipes'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Give each load a name, caliber, and baseline charge so you can
            snap the calculator to it in one click. Attach ballistics and
            range notes so you know how it really shoots.
          </p>
        </div>

        {canEdit ? (
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {/* Name */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className={labelClass}>Recipe Name</label>
              <input
                className={inputClass}
                placeholder="9mm – Range, 9mm – Subsonic, .308 – Match, etc."
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
              />
            </div>

            {/* Caliber */}
            <div>
              <label className={labelClass}>Caliber</label>
              <input
                className={inputClass}
                placeholder="9mm, 9mm Subsonic, .308, 6.5 Creedmoor, 45 ACP…"
                value={form.caliber}
                onChange={e => updateField('caliber', e.target.value)}
              />
            </div>

            {/* Profile type */}
            <div>
              <label className={labelClass}>Profile Type</label>
              <select
                className={inputClass}
                value={form.profileType}
                onChange={e =>
                  updateField('profileType', e.target.value)
                }
              >
                {PROFILE_TYPES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source (NEW) */}
            <div>
              <label className={labelClass}>Source (Manual/Data)</label>
              <input
                className={inputClass}
                placeholder="e.g. Hornady 11th Ed, pg 405"
                value={form.source || ''}
                onChange={e => updateField('source', e.target.value)}
              />
            </div>

            {/* Charge */}
            <div>
              <label className={labelClass}>
                Charge Weight (grains)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.chargeGrains}
                onChange={e =>
                  updateField('chargeGrains', e.target.value)
                }
              />
            </div>

            {/* Brass reuse */}
            <div>
              <label className={labelClass}>
                Brass Reuse (reloads per case)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className={inputClass}
                value={form.brassReuse}
                onChange={e =>
                  updateField('brassReuse', e.target.value)
                }
              />
            </div>

            {/* Lot size */}
            <div>
              <label className={labelClass}>Default Lot Size</label>
              <input
                type="number"
                min="1"
                step="1"
                className={inputClass}
                value={form.lotSize}
                onChange={e =>
                  updateField('lotSize', e.target.value)
                }
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className={labelClass}>Notes</label>
              <textarea
                className={inputClass + ' resize-none min-h-[60px]'}
                placeholder="Intended use, powder / bullet brand, COAL, anything else."
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
              />
            </div>

            {/* Ballistics header */}
            <div className="md:col-span-2 lg:col-span-3 pt-2 border-t border-red-500/20 mt-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-red-500/70 mb-2">
                Ballistics & Range Data (optional)
              </p>
            </div>

            {/* Bullet weight */}
            <div>
              <label className={labelClass}>
                Bullet Weight (grains)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={form.bulletWeightGr}
                onChange={e =>
                  updateField('bulletWeightGr', e.target.value)
                }
              />
            </div>

            {/* Muzzle velocity */}
            <div>
              <label className={labelClass}>
                Muzzle Velocity (fps)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={form.muzzleVelocityFps}
                onChange={e =>
                  updateField('muzzleVelocityFps', e.target.value)
                }
              />
            </div>

            {/* Power factor display */}
            <div>
              <label className={labelClass}>Power Factor</label>
              <div className="flex items-center h-[30px] rounded-xl bg-black/40 border border-slate-700/70 px-3 text-[11px] text-slate-100">
                {computedPowerFactor
                  ? computedPowerFactor.toFixed(1)
                  : 'Enter bullet & velocity'}
              </div>
            </div>

            {/* Zero distance */}
            <div>
              <label className={labelClass}>
                Zero Distance (yards)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={form.zeroDistanceYards}
                onChange={e =>
                  updateField('zeroDistanceYards', e.target.value)
                }
              />
            </div>

            {/* Group size */}
            <div>
              <label className={labelClass}>
                Group Size (inches, best group)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={form.groupSizeInches}
                onChange={e =>
                  updateField('groupSizeInches', e.target.value)
                }
              />
            </div>

            {/* Range notes */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className={labelClass}>Range Notes</label>
              <textarea
                className={inputClass + ' resize-none min-h-[60px]'}
                placeholder="Chrono data, ES/SD, recoil feel, POI, environmental conditions, etc."
                value={form.rangeNotes}
                onChange={e =>
                  updateField('rangeNotes', e.target.value)
                }
              />
            </div>

            {/* Buttons */}
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              {editingRecipe && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 rounded-full border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition"
                >
                  Cancel edit
                </button>
              )}
              {!editingRecipe && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 rounded-full border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-5 py-2 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold shadow-lg shadow-red-900/40 transition disabled:opacity-60"
              >
                {saving
                  ? 'Saving…'
                  : editingRecipe
                  ? 'Save Recipe'
                  : 'Save Recipe'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 text-xs text-slate-400 border border-dashed border-slate-700/70 rounded-xl px-3 py-3 bg-black/30">
            You are currently in{' '}
            <span className="font-semibold text-slate-100">
              Shooter (read-only)
            </span>{' '}
            mode. Sign in as a{' '}
            <span className="font-semibold text-red-400">
              Reloader (admin)
            </span>{' '}
            using the gear icon to add or edit recipes. You can still
            view saved recipes below and use them in the calculator.
          </div>
        )}
      </div>

      {/* List */}
      <div className="glass rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-1">
              Saved Recipes
            </p>
            <p className="text-xs text-slate-400">
              {recipes.length === 0
                ? 'No recipes yet. Add one above to get started.'
                : `${recipes.length} recipe${
                    recipes.length !== 1 ? 's' : ''
                  } saved.`}
            </p>
          </div>
          {/* Global Excel Export Button */}
          {recipes.length > 0 && (
            <span
              onClick={() => handleExportExcel(recipes, 'all')}
              className="px-3 py-1 rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer text-[10px] text-slate-400"
            >
              Download All (Excel)
            </span>
          )}
        </div>

        {recipes.length > 0 && (
          <div className="space-y-2 mt-2">
            {recipes.map(r => {
              const profileLabel =
                PROFILE_TYPES.find(p => p.value === r.profileType)
                  ?.label || 'Custom'

              const pfLabel =
                r.powerFactor && r.powerFactor > 0
                  ? r.powerFactor.toFixed(1)
                  : null

              const isArchived =
                typeof r.archived === 'boolean' && r.archived
              const isArchiving = archivingId === r.id
              const isDeleting = deletingId === r.id
              const isEditing = editingRecipe?.id === r.id

              // Calculate attribution
              const attribution = r.updatedByUsername 
                ? `Updated by ${r.updatedByUsername}` 
                : r.createdByUsername 
                  ? `Added by ${r.createdByUsername}` 
                  : null

              return (
                <div
                  key={r.id}
                  className={`bg-black/40 border rounded-xl px-3 py-3 flex flex-col gap-2 transition ${
                    isEditing
                      ? 'border-red-500 ring-1 ring-red-500/50'
                      : 'border-red-500/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100 flex flex-wrap items-center gap-1">
                      <span>{r.name}</span>
                      {r.caliber && (
                        <span className="text-[11px] text-slate-400">
                          ({r.caliber})
                        </span>
                      )}
                      {isArchived && (
                        <span className="ml-1 text-[10px] uppercase tracking-[0.15em] text-amber-300">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {profileLabel} • Charge {r.chargeGrains} gr • Brass x
                      {r.brassReuse} • Lot size {r.lotSize}
                    </div>
                    {r.source && (
                      <div className="text-[10px] text-slate-500 mt-1 italic">
                        Source: {r.source}
                      </div>
                    )}
                    {(r.bulletWeightGr || r.muzzleVelocityFps) && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        Ballistics:{' '}
                        {r.bulletWeightGr && (
                          <span>{r.bulletWeightGr}gr </span>
                        )}
                        {r.muzzleVelocityFps && (
                          <span>@ {r.muzzleVelocityFps} fps </span>
                        )}
                        {pfLabel && (
                          <span>
                            {' '}
                            • PF{' '}
                            <span className="font-semibold text-slate-200">
                              {pfLabel}
                            </span>
                          </span>
                        )}
                        {r.zeroDistanceYards > 0 && (
                          <span> • Zero {r.zeroDistanceYards} yd</span>
                        )}
                        {r.groupSizeInches > 0 && (
                          <span> • Group {r.groupSizeInches}"</span>
                        )}
                      </div>
                    )}
                    {r.rangeNotes && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Range Notes: {r.rangeNotes}
                      </div>
                    )}
                  </div>

                  {/* ACTION PILLS & ATTRIBUTION IN ONE ROW */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 border-t border-slate-700/50 pt-2 mt-1 w-full">
                    {/* Actions on Left */}
                    <div className="flex flex-wrap items-center gap-2">
                        {onUseRecipe && !isArchived && (
                        <span
                            onClick={() => onUseRecipe(r)}
                            className="px-2 py-[2px] rounded-full bg-black/60 border border-emerald-500/40 text-emerald-300 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer"
                        >
                            Use in Calculator
                        </span>
                        )}
                        
                        {canEdit && (
                        <span
                            onClick={() => openBatchModal(r)}
                            className="px-2 py-[2px] rounded-full bg-black/60 border border-red-500/40 text-red-300 hover:border-red-500/70 hover:text-red-200 transition cursor-pointer flex items-center gap-1"
                        >
                            <ClipboardList size={12} /> Load Batch
                        </span>
                        )}

                        <span
                        onClick={() => handleExportPdf(r)}
                        className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer"
                        >
                        Export PDF
                        </span>
                        <span
                        onClick={() => handleExportExcel([r], `single-${r.name.replace(/\s+/g,'-')}`)}
                        className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer"
                        >
                        Export Excel
                        </span>
                        {canEdit && (
                        <>
                            <span
                            onClick={() => handleEdit(r)}
                            className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 transition cursor-pointer"
                            >
                            Edit
                            </span>
                            <span
                            onClick={() => {
                                if (!isArchiving) handleArchiveToggle(r)
                            }}
                            className={
                                'px-2 py-[2px] rounded-full bg-black/60 border border-amber-400 text-amber-300 hover:bg-amber-500/10 transition cursor-pointer ' +
                                (isArchiving
                                ? 'opacity-50 pointer-events-none'
                                : '')
                            }
                            >
                            {isArchiving
                                ? isArchived
                                ? 'Unarchiving…'
                                : 'Archiving…'
                            : isArchived
                                ? 'Unarchive'
                                : 'Archive'}
                            </span>
                            <span
                            onClick={() => {
                                if (!isDeleting) handleDelete(r.id)
                            }}
                            className={
                                'px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-300 hover:bg-red-900/40 transition cursor-pointer ' +
                                (isDeleting
                                ? 'opacity-50 pointer-events-none'
                                : '')
                            }
                            >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                            </span>
                        </>
                        )}
                    </div>

                    {/* Attribution on Right - STYLED AS PILL */}
                    {attribution && (
                        <span className="ml-auto px-2 py-[2px] rounded-full border border-slate-800 text-slate-500 bg-black/40 text-[10px]">
                        {attribution}
                        </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* BATCH LOADING MODAL */}
      {batchModalOpen && batchRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f0f10] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-black/40">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <ClipboardList className="text-red-500" size={16} />
                        Load Batch: {batchRecipe.name}
                    </h3>
                    <button onClick={() => setBatchModalOpen(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-400">
                        Record a loading session. This will deduct components from your inventory based on the recipe charge ({batchRecipe.chargeGrains} gr).
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Rounds Loaded</label>
                            <input type="number" className={inputClass} value={batchForm.rounds} onChange={e => setBatchForm(p => ({ ...p, rounds: e.target.value }))} />
                        </div>
                        <div>
                             <label className={labelClass}>Powder Lot</label>
                             <select className={inputClass} value={batchForm.powderLotId} onChange={e => setBatchForm(p => ({ ...p, powderLotId: e.target.value }))}>
                                 <option value="">Select Powder...</option>
                                 {purchases.filter(p => p.componentType === 'powder' && p.status !== 'depleted').map(p => (
                                     <option key={p.id} value={p.id}>{p.brand} {p.name} (Lot {p.lotId})</option>
                                 ))}
                             </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                             <label className={labelClass}>Bullet Lot</label>
                             <select className={inputClass} value={batchForm.bulletLotId} onChange={e => setBatchForm(p => ({ ...p, bulletLotId: e.target.value }))}>
                                 <option value="">Select...</option>
                                 {purchases.filter(p => p.componentType === 'bullet' && p.status !== 'depleted').map(p => (
                                     <option key={p.id} value={p.id}>{p.brand} (Lot {p.lotId})</option>
                                 ))}
                             </select>
                        </div>
                        <div>
                             <label className={labelClass}>Primer Lot</label>
                             <select className={inputClass} value={batchForm.primerLotId} onChange={e => setBatchForm(p => ({ ...p, primerLotId: e.target.value }))}>
                                 <option value="">Select...</option>
                                 {purchases.filter(p => p.componentType === 'primer' && p.status !== 'depleted').map(p => (
                                     <option key={p.id} value={p.id}>{p.brand} (Lot {p.lotId})</option>
                                 ))}
                             </select>
                        </div>
                        <div>
                             <label className={labelClass}>Brass Lot</label>
                             <select className={inputClass} value={batchForm.caseLotId} onChange={e => setBatchForm(p => ({ ...p, caseLotId: e.target.value }))}>
                                 <option value="">Select...</option>
                                 {purchases.filter(p => p.componentType === 'case' && p.status !== 'depleted').map(p => (
                                     <option key={p.id} value={p.id}>{p.brand} (Lot {p.lotId})</option>
                                 ))}
                             </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className={labelClass}>Batch Notes</label>
                        <textarea 
                            className={inputClass + " resize-none min-h-[60px]"} 
                            placeholder="Weather, specific seating depth tweaks, etc."
                            value={batchForm.notes} 
                            onChange={e => setBatchForm(p => ({ ...p, notes: e.target.value }))}
                        />
                    </div>

                    <div className="pt-2 flex justify-end">
                        {/* UPDATED BUTTON STYLE to match 'Save Recipe' */}
                        <button 
                            onClick={handleBatchSubmit} 
                            disabled={batchSubmitting}
                            className="inline-flex items-center px-5 py-2 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold shadow-lg shadow-red-900/40 transition disabled:opacity-60 text-white"
                        >
                            {batchSubmitting ? 'Logging...' : 'Log Batch & Update Inventory'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
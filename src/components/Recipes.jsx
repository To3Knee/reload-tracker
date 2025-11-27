//===============================================================
//Script Name: Recipes.jsx
//Script Location: src/components/Recipes.jsx
//Date: 11/27/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.0.1
//About: Manage saved load recipes, attach ballistics/range data,
//       use them in the Live Round Calculator, archive, and
//       export a clean PDF recipe card.
//===============================================================

import { useEffect, useState } from 'react'
import {
  getAllRecipes,
  saveRecipe,
  deleteRecipe,
  formatCurrency,
} from '../lib/db'

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

export function Recipes({ onUseRecipe }) {
  const [recipes, setRecipes] = useState([])
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [archivingId, setArchivingId] = useState(null)

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
    setSaving(true)

    try {
      const base = {
        name: form.name?.trim() || '',
        caliber: form.caliber?.trim() || '',
        profileType: form.profileType || 'custom',
        chargeGrains:
          form.chargeGrains !== '' ? Number(form.chargeGrains) : null,
        brassReuse:
          form.brassReuse !== '' ? Number(form.brassReuse) : null,
        lotSize: form.lotSize !== '' ? Number(form.lotSize) : null,
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
      resetForm()
      await loadRecipes()
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(recipe) {
    setEditingRecipe(recipe)
    setForm({
      name: recipe.name || '',
      caliber: recipe.caliber || '',
      profileType: recipe.profileType || 'custom',
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
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return
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
    if (!recipe) return
    setArchivingId(recipe.id)
    try {
      const updated = {
        ...recipe,
        archived: !recipe.archived,
      }
      await saveRecipe(updated)
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

  function handleExportPdf(recipe) {
    if (!recipe) return

    const profileLabel =
      PROFILE_TYPES.find(p => p.value === recipe.profileType)?.label ||
      'Custom'

    const pfLabel =
      recipe.powerFactor && recipe.powerFactor > 0
        ? recipe.powerFactor.toFixed(1)
        : ''

    const bulletText = recipe.bulletWeightGr
      ? `${recipe.bulletWeightGr}gr${
          recipe.caliber ? ` • ${recipe.caliber}` : ''
        }`
      : recipe.caliber || ''

    const powderText = recipe.notes || ''

    const velocityText =
      recipe.muzzleVelocityFps != null &&
      recipe.muzzleVelocityFps !== ''
        ? `${recipe.muzzleVelocityFps} fps`
        : ''

    const zeroText =
      recipe.zeroDistanceYards != null &&
      recipe.zeroDistanceYards !== ''
        ? `${recipe.zeroDistanceYards} yd`
        : ''

    const groupText =
      recipe.groupSizeInches != null &&
      recipe.groupSizeInches !== ''
        ? `${recipe.groupSizeInches}"`
        : ''

    const energy =
      recipe.bulletWeightGr && recipe.muzzleVelocityFps
        ? ((Number(recipe.bulletWeightGr) || 0) *
            Math.pow(
              Number(recipe.muzzleVelocityFps) || 0,
              2
            )) /
          450240
        : 0
    const energyText = energy ? `${energy.toFixed(0)} ft-lbs` : ''

    const usesText = profileLabel
    const rangeNotesText = recipe.rangeNotes || ''
    const nameText = recipe.name || 'Recipe'

    const bulletRow = `<div class="row"><span class="label">Bullet:</span> ${escapeHtml(
      bulletText
    )}</div>`
    const powderRow = `<div class="row"><span class="label">Powder:</span> ${escapeHtml(
      powderText
    )}</div>`
    const chargeRow = `<div class="row"><span class="label">Charge (grains):</span> ${escapeHtml(
      recipe.chargeGrains != null ? recipe.chargeGrains : ''
    )}</div>`
    const pfRow = pfLabel
      ? `<div class="row"><span class="label">Power Factor:</span> ${escapeHtml(
          pfLabel
        )}</div>`
      : ''
    const velocityRow = velocityText
      ? `<div class="row"><span class="label">Velocity (fps):</span> ${escapeHtml(
          velocityText
        )}</div>`
      : ''
    const energyRow = energyText
      ? `<div class="row"><span class="label">Muzzle Energy (ft-lbs):</span> ${escapeHtml(
          energyText
        )}</div>`
      : ''
    const zeroRow = zeroText
      ? `<div class="row"><span class="label">Zero Distance:</span> ${escapeHtml(
          zeroText
        )}</div>`
      : ''
    const groupRow = groupText
      ? `<div class="row"><span class="label">Group Size:</span> ${escapeHtml(
          groupText
        )}</div>`
      : ''
    const usesRow = `<div class="row"><span class="label">Uses:</span> ${escapeHtml(
      usesText
    )}</div>`
    const rangeNotesRow = rangeNotesText
      ? `<div class="row notes"><span class="label">Range Notes:</span> ${escapeHtml(
          rangeNotesText
        )}</div>`
      : ''

    const logoUrl = `${window.location.origin}/logo.png`

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(nameText)} - Reload Tracker Recipe</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 0.5in;
    }
    body {
      margin: 0;
      background: radial-gradient(circle at top, #281219 0, #0d0b10 40%, #050406 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card {
      background: #f4f0e9;
      color: #221b16;
      max-width: 320px;
      margin: 0 auto;
      padding: 12px 14px 14px;
      box-sizing: border-box;
      font-size: 11px;
      line-height: 1.4;
      border-radius: 6px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.45);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .banner {
      display: inline-block;
      background: #b3342a;
      color: #fff;
      padding: 3px 9px;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .logo {
      height: 26px;
    }
    .title {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .row {
      margin: 1px 0;
    }
    .label {
      font-weight: 700;
      text-transform: uppercase;
    }
    .notes {
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="banner">RECIPE</div>
      <img src="${logoUrl}" alt="Reload Tracker" class="logo" />
    </div>
    <div class="title">${escapeHtml(nameText)}</div>
    ${bulletRow}
    ${powderRow}
    ${chargeRow}
    ${pfRow}
    ${velocityRow}
    ${energyRow}
    ${zeroRow}
    ${groupRow}
    ${usesRow}
    ${rangeNotesRow}
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 250);
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

  const inputClass =
    'w-full bg-black/40 border border-red-500/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60'
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

          {/* Charge */}
          <div>
            <label className={labelClass}>Charge Weight (grains)</label>
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
            <div className="flex items-center h-[38px] rounded-xl bg-black/40 border border-red-500/30 px-3 text-sm text-slate-100">
              {computedPowerFactor
                ? computedPowerFactor.toFixed(1)
                : 'Enter bullet weight & velocity'}
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
      </div>

      {/* Saved recipes list */}
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

              return (
                <div
                  key={r.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-black/40 rounded-xl px-3 py-2"
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
                        {r.rangeNotes}
                      </div>
                    )}
                  </div>

                  {/* ACTION PILLS — now <span> pills, matching Purchases */}
                  <div className="flex flex-wrap items-center gap-2 justify-end text-[11px] text-slate-500">
                    {onUseRecipe && !isArchived && (
                      <span
                        onClick={() => onUseRecipe(r)}
                        className="px-2 py-[2px] rounded-full bg-black/60 border border-emerald-500/40 text-emerald-300 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer"
                      >
                        Use in Calculator
                      </span>
                    )}
                    <span
                      onClick={() => handleExportPdf(r)}
                      className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer"
                    >
                      Export PDF
                    </span>
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

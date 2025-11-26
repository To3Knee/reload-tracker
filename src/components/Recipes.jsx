// src/components/Recipes.jsx
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

  // ballistics
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
      if (editingRecipe) {
        await saveRecipe({
          ...editingRecipe,
          ...form,
        })
      } else {
        await saveRecipe(form)
      }
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
        recipe.chargeGrains != null
          ? String(recipe.chargeGrains)
          : '',
      brassReuse:
        recipe.brassReuse != null ? recipe.brassReuse : 5,
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
    if (!window.confirm('Delete this recipe? This cannot be undone.')) {
      return
    }
    setDeletingId(id)
    try {
      await deleteRecipe(id)
      if (editingRecipe && editingRecipe.id === id) {
        resetForm()
      }
      await loadRecipes()
    } finally {
      setDeletingId(null)
    }
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
              onChange={e => updateField('lotSize', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className={labelClass}>Notes</label>
            <textarea
              className={inputClass + ' resize-none min-h-[60px]'}
              placeholder="Intended use, COAL, powder / bullet combo, anything else."
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
            <label className={labelClass}>Muzzle Velocity (fps)</label>
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
              placeholder="Chrono data, ES/SD, recoil feel, point of impact, environmental conditions, etc."
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
                className="px-4 py-2 rounded-full border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition"
              >
                Cancel edit
              </button>
            )}
            {!editingRecipe && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-full border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold shadow-lg shadow-red-900/40 transition disabled:opacity-60"
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
        </div>

        {recipes.length > 0 && (
          <div className="space-y-2 mt-2">
            {recipes.map(r => {
              const profileLabel =
                PROFILE_TYPES.find(
                  p => p.value === r.profileType
                )?.label || 'Custom'

              const pfLabel =
                r.powerFactor && r.powerFactor > 0
                  ? r.powerFactor.toFixed(1)
                  : null

              return (
                <div
                  key={r.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-black/40 rounded-xl px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      {r.name}{' '}
                      {r.caliber && (
                        <span className="text-[11px] text-slate-400 ml-1">
                          ({r.caliber})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {profileLabel} • Charge {r.chargeGrains} gr •
                      {' Brass x'}
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
                          <span>
                            {' '}
                            • Group {r.groupSizeInches}"
                          </span>
                        )}
                      </div>
                    )}
                    {r.rangeNotes && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        {r.rangeNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    {onUseRecipe && (
                      <button
                        type="button"
                        onClick={() => onUseRecipe(r)}
                        className="text-[11px] px-3 py-1 rounded-full border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/40 transition"
                      >
                        Use in Calculator
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(r)}
                      className="text-[11px] px-3 py-1 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800/60 transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={() => handleDelete(r.id)}
                      className="text-[11px] px-3 py-1 rounded-full border border-red-700/70 text-red-300 hover:bg-red-900/40 transition disabled:opacity-50"
                    >
                      {deletingId === r.id ? 'Deleting…' : 'Delete'}
                    </button>
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

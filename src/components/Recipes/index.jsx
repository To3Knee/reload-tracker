import { useEffect, useState, useMemo } from 'react'
import { saveRecipe } from '../../lib/db'
import { getFirearms } from '../../lib/armory'
import { downloadExcel } from '../../lib/excel'
import { HAPTIC } from '../../lib/haptics'
import { calculateStability, parseTwistRate, guessDiameter } from '../../lib/ballistics'
import { CartridgeVisualizer } from '../CartridgeVisualizer'
import { useAppStore } from '../../lib/store'
import QRCode from 'qrcode'
import {
  X, HelpCircle, Trash2, Crosshair, FileText, Archive
} from 'lucide-react'
import { ErrorBanner } from '../ErrorBanner'
import {
  PROFILE_TYPES, DEFAULT_FORM, FieldLabel,
  guessCaseLength, getCaliberDefaults, apiDeleteRecipe
} from './recipeHelpers.jsx'
import { renderPurchaseOptionLabel } from '../Purchases/purchaseHelpers'
import { BatchModal } from './BatchModal'
import { RecipeCard } from './RecipeCard'

export function Recipes({ onUseRecipe, canEdit = true, purchases = [] }) {
  const { recipes, refresh } = useAppStore()
  const [guns, setGuns] = useState([])
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [archivingId, setArchivingId] = useState(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [selectedFirearmId, setSelectedFirearmId] = useState('')
  const [showStabilityHelp, setShowStabilityHelp] = useState(false)

  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchRecipe, setBatchRecipe] = useState(null)

  const activePurchases = useMemo(() => purchases.filter(p => p.status !== 'depleted'), [purchases])

  const getSmartList = (type, currentCaliber) => {
    const items = activePurchases.filter(p => p.componentType === type)
    if (!currentCaliber) return items
    const cal = currentCaliber.toLowerCase()
    const rank1 = items.filter(p => p.caliber && p.caliber.toLowerCase() === cal)
    const rank2 = items.filter(p => !rank1.includes(p) && (p.name?.toLowerCase().includes(cal) || p.brand?.toLowerCase().includes(cal)))
    const rank3 = items.filter(p => !rank1.includes(p) && !rank2.includes(p) && !p.caliber)
    const rank4 = items.filter(p => !rank1.includes(p) && !rank2.includes(p) && !rank3.includes(p))
    return [...rank1, ...rank2, ...rank3, ...rank4]
  }

  const powders = useMemo(() => getSmartList('powder', form.caliber), [activePurchases, form.caliber])
  const bullets = useMemo(() => getSmartList('bullet', form.caliber), [activePurchases, form.caliber])
  const primers = useMemo(() => getSmartList('primer', form.caliber), [activePurchases, form.caliber])
  const cases   = useMemo(() => getSmartList('case',   form.caliber), [activePurchases, form.caliber])

  useEffect(() => {
    getFirearms().then(setGuns).catch(e => console.warn(e))
  }, [])

  useEffect(() => {
    if (editingRecipe || !form.caliber) return
    const defaults = getCaliberDefaults(form.caliber)
    if (defaults) {
      setForm(prev => ({
        ...prev,
        coal:         prev.coal         ? prev.coal         : defaults.coal,
        bulletLength: prev.bulletLength ? prev.bulletLength : defaults.bulletLength,
        caseCapacity: prev.caseCapacity ? prev.caseCapacity : defaults.caseCapacity,
      }))
    }
  }, [form.caliber, editingRecipe])

  const stability = useMemo(() => {
    const weight   = Number(form.bulletWeightGr)
    const velocity = Number(form.muzzleVelocityFps) || 2800
    const activeGun = guns.find(g => String(g.id) === String(selectedFirearmId))
    const twist    = activeGun ? parseTwistRate(activeGun.specs?.twistRate) : null
    const length   = Number(form.bulletLength) || 1.2
    const diameter = guessDiameter(form.caliber)
    if (!weight || !twist || !diameter) return null
    const sg = calculateStability(weight, length, diameter, twist, velocity)
    if (sg < 1.0) return { sg: sg.toFixed(2), status: 'Unstable', color: 'text-red-500',    border: 'border-red-500/50',    bg: 'bg-red-900/10' }
    if (sg < 1.4) return { sg: sg.toFixed(2), status: 'Marginal', color: 'text-amber-400',  border: 'border-amber-500/50',  bg: 'bg-amber-900/10' }
    return           { sg: sg.toFixed(2), status: 'Stable',   color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-900/10' }
  }, [form.bulletWeightGr, form.muzzleVelocityFps, form.caliber, selectedFirearmId, form.bulletLength, guns])

  function updateField(field, value) { setForm(prev => ({ ...prev, [field]: value })); if (error) setError(null) }
  function resetForm() { setForm(DEFAULT_FORM); setEditingRecipe(null); setSelectedFirearmId(''); setError(null) }

  async function handleSubmit(e) {
    e.preventDefault(); if (!canEdit) return; setSaving(true); setError(null)
    try {
      const base = {
        name: form.name?.trim() || '', caliber: form.caliber?.trim() || '',
        profileType: form.profileType || 'custom', source: form.source?.trim() || '',
        chargeGrains:      form.chargeGrains      !== '' ? Number(form.chargeGrains)      : null,
        notes: form.notes || '', rangeNotes: form.rangeNotes || '',
        bulletWeightGr:    form.bulletWeightGr    !== '' ? Number(form.bulletWeightGr)    : null,
        muzzleVelocityFps: form.muzzleVelocityFps !== '' ? Number(form.muzzleVelocityFps) : null,
        zeroDistanceYards: form.zeroDistanceYards !== '' ? Number(form.zeroDistanceYards) : null,
        groupSizeInches:   form.groupSizeInches   !== '' ? Number(form.groupSizeInches)   : null,
        coal:         form.coal         !== '' ? Number(form.coal)         : null,
        caseCapacity: form.caseCapacity !== '' ? Number(form.caseCapacity) : null,
        bulletLength: form.bulletLength !== '' ? Number(form.bulletLength) : null,
        powderLotId: form.powderLotId || null, bulletLotId: form.bulletLotId || null,
        primerLotId: form.primerLotId || null, caseLotId:   form.caseLotId   || null,
      }
      const payload = editingRecipe
        ? { ...editingRecipe, ...base, archived: typeof editingRecipe.archived === 'boolean' ? editingRecipe.archived : false }
        : { ...base, archived: false }
      await saveRecipe(payload); HAPTIC.success(); resetForm(); refresh()
    } catch (err) { setError(`Failed to save: ${err.message || 'Unknown error'}`); HAPTIC.error() }
    finally { setSaving(false) }
  }

  function handleEdit(recipe) {
    if (!canEdit) return; setEditingRecipe(recipe)
    setForm({
      name: recipe.name || '', caliber: recipe.caliber || '',
      profileType: recipe.profileType || 'custom', source: recipe.source || '',
      chargeGrains:      recipe.chargeGrains      != null ? String(recipe.chargeGrains)      : '',
      notes: recipe.notes || '', rangeNotes: recipe.rangeNotes || '',
      bulletWeightGr:    recipe.bulletWeightGr    != null ? String(recipe.bulletWeightGr)    : '',
      muzzleVelocityFps: recipe.muzzleVelocityFps != null ? String(recipe.muzzleVelocityFps) : '',
      zeroDistanceYards: recipe.zeroDistanceYards != null ? String(recipe.zeroDistanceYards) : '',
      groupSizeInches:   recipe.groupSizeInches   != null ? String(recipe.groupSizeInches)   : '',
      coal:         recipe.coal         != null ? String(recipe.coal)         : '',
      caseCapacity: recipe.caseCapacity != null ? String(recipe.caseCapacity) : '',
      bulletLength: recipe.bulletLength != null ? String(recipe.bulletLength) : '',
      powderLotId: recipe.powderLotId || '', bulletLotId: recipe.bulletLotId || '',
      primerLotId: recipe.primerLotId || '', caseLotId:   recipe.caseLotId   || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' }); HAPTIC.click()
  }

  function promptDelete(recipe) { if (!canEdit) return; setRecipeToDelete(recipe); setDeleteModalOpen(true); HAPTIC.click() }

  async function executeDelete(cascade = false) {
    if (!recipeToDelete) return
    setIsDeleting(true)
    try {
      await apiDeleteRecipe(recipeToDelete.id, cascade)
      HAPTIC.success()
      if (editingRecipe && editingRecipe.id === recipeToDelete.id) resetForm()
      refresh()
      setDeleteModalOpen(false); setConflictModalOpen(false); setRecipeToDelete(null)
    } catch (err) {
      if (err.message === 'RECIPE_IN_USE') {
        setDeleteModalOpen(false); setConflictModalOpen(true); HAPTIC.soft()
      } else {
        setError(`Failed to delete: ${err.message}`)
        setDeleteModalOpen(false); setConflictModalOpen(false); HAPTIC.error()
      }
    } finally { setIsDeleting(false) }
  }

  async function handleArchiveToggle(recipe) {
    if (!canEdit || !recipe) return; setArchivingId(recipe.id)
    try {
      const updated = { ...recipe, archived: !recipe.archived }
      await saveRecipe(updated); HAPTIC.soft()
      if (editingRecipe && editingRecipe.id === recipe.id) setEditingRecipe(updated)
      refresh()
    } catch (err) { setError(`Failed: ${err.message}`) }
    finally { setArchivingId(null) }
  }

  async function handleResolveConflict(action) {
    if (!recipeToDelete) return
    if (action === 'archive') {
      await handleArchiveToggle(recipeToDelete)
      setConflictModalOpen(false); setRecipeToDelete(null)
    } else if (action === 'cascade') {
      await executeDelete(true)
    }
  }

  function handleExportExcel(dataToExport = recipes, filenameSuffix = 'all') {
    HAPTIC.click()
    const timestamp = new Date().toISOString().slice(0, 10)
    const columns = [
      { header: 'Recipe Name', key: 'name', width: 25 }, { header: 'Caliber', key: 'caliber', width: 15 },
      { header: 'Powder', key: 'powderName', width: 20 }, { header: 'Charge (gr)', key: 'chargeGrains', width: 15 },
      { header: 'Bullet', key: 'bulletName', width: 20 }, { header: 'COAL', key: 'coal', width: 10 },
      { header: 'Velocity (fps)', key: 'muzzleVelocityFps', width: 15 }, { header: 'Notes', key: 'notes', width: 40 },
    ]
    downloadExcel(dataToExport, columns, `reload-tracker-recipes-${filenameSuffix}-${timestamp}`)
  }

  async function handleExportPdf(recipe) {
    if (!recipe) return
    HAPTIC.click()
    let qrImg = ''
    try {
      const qrUrl = `${window.location.origin}?recipeId=${recipe.id}`
      qrImg = await QRCode.toDataURL(qrUrl, { margin: 1, width: 80, color: { dark: '#1a1a1a', light: '#ffffff' } })
    } catch (e) { console.warn('QR Gen Failed', e) }

    const win = window.open('', '_blank')
    if (!win) { setError('Pop-up blocked. Please allow popups.'); return }
    win.document.write('<html><body style="background:#fff"><p style="color:#aaa;font-family:monospace;padding:20px;font-size:12px">Generating Data Sheet...</p></body></html>')

    setTimeout(() => {
      try {
        const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        const resolve    = (lotId, type) => { if (!lotId) return '---'; const p = purchases.find(i => String(i.id) === String(lotId)); return p ? `${p.brand || ''} ${p.name || type}`.trim() : `Lot #${lotId}` }
        const resolveLotId = (lotId)    => { if (!lotId) return null;  const p = purchases.find(i => String(i.id) === String(lotId)); return p ? (p.lotId || `LOT-${p.id}`) : `ID:${lotId}` }

        const powderName   = esc(recipe.powderName || resolve(recipe.powderLotId, 'Powder'))
        const bulletName   = esc(recipe.bulletName || resolve(recipe.bulletLotId, 'Bullet'))
        const primerName   = esc(recipe.primerName || resolve(recipe.primerLotId, 'Primer'))
        const caseName     = esc(recipe.caseName   || resolve(recipe.caseLotId,   'Brass'))
        const powderLotRef = resolveLotId(recipe.powderLotId)
        const bulletLotRef = resolveLotId(recipe.bulletLotId)
        const primerLotRef = resolveLotId(recipe.primerLotId)
        const caseLotRef   = resolveLotId(recipe.caseLotId)
        const hasLots      = powderLotRef || bulletLotRef || primerLotRef || caseLotRef

        const logoUrl = `${window.location.origin}/logo.png`
        const name    = esc(recipe.name    || 'Untitled')
        const caliber = esc(recipe.caliber || 'Unknown')
        const date    = new Date().toLocaleDateString()
        const profile = recipe.profileType ? recipe.profileType.charAt(0).toUpperCase() + recipe.profileType.slice(1) : ''

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${name} — Load Data Sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page { size: letter portrait; margin: 0.5in; }
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #fff; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px; }
.hdr { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #c42b21; margin-bottom: 16px; }
.eyebrow { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; color: #c42b21; margin-bottom: 4px; }
.rname { font-size: 22px; font-weight: 900; color: #111; line-height: 1; text-transform: uppercase; letter-spacing: -0.02em; }
.rsub { font-size: 10px; color: #777; margin-top: 4px; letter-spacing: 0.04em; }
.hdr-r { display: flex; align-items: center; gap: 12px; }
.logo { height: 50px; width: auto; }
.qr-img { width: 54px; height: 54px; display: block; border: 1px solid #ddd; padding: 2px; }
.sect { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.28em; color: #c42b21; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px solid #222; }
.sect:first-child { margin-top: 0; padding-top: 0; border-top: none; }
.sect::after { content: ''; flex: 1; height: 1px; background: #333; }
.comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.comp-card { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 8px 10px; }
.clabel { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #999; margin-bottom: 3px; }
.cval { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #111; }
.cval.cu { color: #c42b21; } .cval.wn { color: #c42b21; }
.blt-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.blt-card { background: #faf8f6; border: 1px solid #e0d8cf; border-top: 2px solid #c42b21; border-radius: 3px; padding: 7px 8px; text-align: center; }
.blabel { font-size: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #999; margin-bottom: 3px; }
.bval { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: #c42b21; }
.spec-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.spec-card { background: #faf8f6; border: 1px solid #e0d8cf; border-radius: 3px; padding: 7px 10px; }
.lot-row { display: flex; gap: 6px; flex-wrap: wrap; }
.lot-tag { font-family: 'JetBrains Mono', monospace; font-size: 7.5px; font-weight: 700; color: #111; border: 1px solid #c8b89a; border-radius: 2px; padding: 3px 7px; background: #faf8f6; letter-spacing: 0.06em; }
.lot-tag span { color: #c42b21; margin-right: 4px; font-weight: 400; }
.tbl-wrap { border: 1px solid #e0d8cf; border-radius: 3px; overflow: hidden; }
.ws-table { width: 100%; border-collapse: collapse; }
.ws-table th { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #777; text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0d8cf; background: #faf8f6; }
.ws-table td { height: 30px; border-bottom: 1px solid #ece7e0; padding: 0 8px; }
.ws-table tr:last-child td { border-bottom: none; }
.notes-box { background: #faf8f6; border: 1px solid #e0d8cf; border-left: 3px solid #c42b21; border-radius: 0 3px 3px 0; padding: 10px 14px; }
.notes-body { font-family: 'JetBrains Mono', monospace; font-size: 9px; line-height: 1.7; color: #444; white-space: pre-wrap; }
.footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e0d8cf; margin-top: 18px; }
.footer-l { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #aaa; text-transform: uppercase; letter-spacing: 0.15em; }
.footer-r { font-size: 7px; color: #c0392b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
.close-btn { position: fixed; top: 12px; right: 12px; background: #f0ede8; color: #333; padding: 6px 14px; border-radius: 4px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid #d0c8bf; cursor: pointer; }
@media print { .close-btn { display: none !important; } }
</style></head><body>
<button onclick="window.close()" class="close-btn">✕ Close</button>
<div class="hdr">
  <div><div class="eyebrow">Precision Load Data Sheet · Reload Tracker</div><div class="rname">${name}</div><div class="rsub">${caliber}${profile ? ' · ' + profile : ''} · Generated ${date}</div></div>
  <div class="hdr-r">${qrImg ? `<img src="${qrImg}" class="qr-img"/>` : ''}<img src="${logoUrl}" class="logo" alt="Reload Tracker"/></div>
</div>
<div class="sect">Component Specifications</div>
<div class="comp-grid">
  <div class="comp-card"><div class="clabel">Bullet</div><div class="cval">${bulletName}</div></div>
  <div class="comp-card"><div class="clabel">Powder</div><div class="cval">${powderName}</div></div>
  <div class="comp-card"><div class="clabel">Charge Weight</div><div class="cval cu">${recipe.chargeGrains ? esc(String(recipe.chargeGrains)) + ' gr' : '---'}</div></div>
  <div class="comp-card"><div class="clabel">Primer ⚠</div><div class="cval wn">${primerName}</div></div>
  <div class="comp-card"><div class="clabel">Brass / Case</div><div class="cval">${caseName}</div></div>
  <div class="comp-card"><div class="clabel">C.O.A.L.</div><div class="cval cu">${recipe.coal ? esc(String(recipe.coal)) + '"' : '---'}</div></div>
</div>
<div class="sect">Ballistic Parameters</div>
<div class="blt-grid">
  <div class="blt-card"><div class="blabel">Bullet Wt</div><div class="bval">${recipe.bulletWeightGr ? esc(String(recipe.bulletWeightGr)) + ' gr' : '---'}</div></div>
  <div class="blt-card"><div class="blabel">Target Vel</div><div class="bval">${recipe.muzzleVelocityFps ? esc(String(recipe.muzzleVelocityFps)) + ' fps' : '---'}</div></div>
  <div class="blt-card"><div class="blabel">Zero Dist</div><div class="bval">${recipe.zeroDistanceYards ? esc(String(recipe.zeroDistanceYards)) + ' yds' : '---'}</div></div>
  <div class="blt-card"><div class="blabel">Case Cap</div><div class="bval">${recipe.caseCapacity ? esc(String(recipe.caseCapacity)) + ' gr H₂O' : '---'}</div></div>
</div>
<div class="sect">Load Specs</div>
<div class="spec-row">
  <div class="spec-card"><div class="clabel">Std Lot Size</div><div class="cval cu">${recipe.lotSize ? esc(String(recipe.lotSize)) + ' rds' : '---'}</div></div>
  <div class="spec-card"><div class="clabel">Brass Reuse</div><div class="cval">${recipe.brassReuse ? esc(String(recipe.brassReuse)) + 'x' : '---'}</div></div>
  <div class="spec-card"><div class="clabel">Profile</div><div class="cval">${profile || '---'}</div></div>
</div>
${hasLots ? `<div class="sect">Component LOT IDs</div><div class="lot-row">${powderLotRef ? `<div class="lot-tag"><span>PWD</span>${esc(powderLotRef)}</div>` : ''}${bulletLotRef ? `<div class="lot-tag"><span>BLT</span>${esc(bulletLotRef)}</div>` : ''}${primerLotRef ? `<div class="lot-tag"><span>PRM</span>${esc(primerLotRef)}</div>` : ''}${caseLotRef ? `<div class="lot-tag"><span>BRS</span>${esc(caseLotRef)}</div>` : ''}</div>` : ''}
<div class="sect">Range Results (Write-In)</div>
<div class="tbl-wrap"><table class="ws-table"><thead><tr><th width="20%">Date / Temp</th><th width="16%">Avg Vel (fps)</th><th width="10%">SD</th><th width="10%">ES</th><th width="16%">Group Size</th><th>Notes</th></tr></thead><tbody><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table></div>
${recipe.notes ? `<div class="sect">Load Notes</div><div class="notes-box"><div class="notes-body">${esc(recipe.notes)}</div></div>` : ''}
<div class="footer"><div class="footer-l">Recipe ID: ${recipe.id || '—'} · Reload Tracker · ${date}</div><div class="footer-r">⚠ Verify all loads · Never exceed max charge</div></div>
<script>window.onload = () => { setTimeout(() => window.print(), 600); }<\/script>
</body></html>`

        win.document.open(); win.document.write(html); win.document.close()
      } catch (e) { setError(`Failed to generate PDF: ${e.message}`) }
    }, 100)
  }

  function openBatchModal(recipe) {
    if (!canEdit) return
    setBatchRecipe(recipe); HAPTIC.click(); setBatchModalOpen(true)
  }

  const visCaseLength = guessCaseLength(form.caliber)
  const inputClass = 'rt-input'
  const labelClass = 'rt-label'

  return (
    <div className="space-y-6">

      {/* Section Header */}
      <div className="rt-section">
        <div className="rt-section-bar" />
        <div>
          <span className="rt-section-eyebrow">Load Data</span>
          <h2 className="rt-section-title">RECIPES</h2>
        </div>
      </div>

      {/* Form */}
      <div className="glass p-6 space-y-4">
        <div><h3 className="text-sm font-bold text-steel-200 uppercase tracking-widest border-b border-steel-700 pb-2 mb-4">{editingRecipe ? 'MODIFY LOAD DATA' : 'NEW LOAD DEFINITION'}</h3></div>
        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {canEdit ? (
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {/* Left col: visualizer + ingredients */}
            <div className="lg:row-span-3 order-first lg:order-none flex flex-col gap-6">
              <div className="h-48 md:h-52 lg:h-64 min-h-[192px]">
                <CartridgeVisualizer
                  diameter={guessDiameter(form.caliber)}
                  bulletLength={Number(form.bulletLength) || 0}
                  caseLength={visCaseLength}
                  coal={Number(form.coal) || 0}
                  charge={Number(form.chargeGrains) || 0}
                  capacity={Number(form.caseCapacity) || 0}
                />
              </div>
              <div className="flex-1 space-y-4 rt-card p-4">
                <p className="text-[10px] uppercase text-steel-500 tracking-[0.2em] mb-2 border-b border-steel-700 pb-1">Ingredients</p>
                <div><FieldLabel label="Powder" help="Select from Inventory." /><select className={inputClass} value={form.powderLotId} onChange={e => updateField('powderLotId', e.target.value)}><option value="">Select Powder...</option>{powders.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}</select></div>
                <div><FieldLabel label="Charge (gr)" help="Powder weight." /><input type="number" min="0" step="0.01" className={inputClass} value={form.chargeGrains} onChange={e => updateField('chargeGrains', e.target.value)} /></div>
                <div><FieldLabel label="Bullet" help="Select projectile." /><select className={inputClass} value={form.bulletLotId} onChange={e => updateField('bulletLotId', e.target.value)}><option value="">Select Bullet...</option>{bullets.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}</select></div>
                <div><FieldLabel label="Bullet Len (in)" help="Length of projectile." /><input type="number" step="0.001" className={inputClass} placeholder="1.200" value={form.bulletLength} onChange={e => updateField('bulletLength', e.target.value)} /></div>
                <div><FieldLabel label="Primer" help="Select Primer." /><select className={inputClass} value={form.primerLotId} onChange={e => updateField('primerLotId', e.target.value)}><option value="">Select Primer...</option>{primers.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}</select></div>
                <div><FieldLabel label="Brass" help="Select Case/Brass." /><select className={inputClass} value={form.caseLotId} onChange={e => updateField('caseLotId', e.target.value)}><option value="">Select Brass...</option>{cases.map(p => <option key={p.id} value={p.id}>{renderPurchaseOptionLabel(p)}</option>)}</select></div>
              </div>
            </div>

            {/* Right cols: data + physics */}
            <div className="md:col-span-2 lg:col-span-2 flex flex-col gap-4 h-full">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2"><FieldLabel label="Recipe Name" help="A unique name for this load." /><input className={inputClass} placeholder="e.g. 9mm Range Plinker" value={form.name} onChange={e => updateField('name', e.target.value)} /></div>
                <div><FieldLabel label="Caliber" help="The cartridge type." /><input className={inputClass} placeholder="9mm, .223..." value={form.caliber} onChange={e => updateField('caliber', e.target.value)} /></div>
                <div><FieldLabel label="Profile Type" help="Categorizes the load." /><select className={inputClass} value={form.profileType} onChange={e => updateField('profileType', e.target.value)}>{PROFILE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                <div className="md:col-span-2 pt-2 border-t border-steel-700/50"><p className="text-[10px] uppercase text-steel-500 tracking-[0.2em]">Geometry &amp; Ballistics</p></div>
                <div><FieldLabel label="C.O.A.L (in)" help="Cartridge Overall Length." /><input type="number" step="0.001" className={inputClass} placeholder="2.800" value={form.coal} onChange={e => updateField('coal', e.target.value)} /></div>
                <div><FieldLabel label="Case Vol (gr H2O)" help="Internal capacity." /><input type="number" step="0.1" className={inputClass} placeholder="56.0" value={form.caseCapacity} onChange={e => updateField('caseCapacity', e.target.value)} /></div>
                <div><FieldLabel label="Intended Zero (yds)" help="Distance aimed for." /><input type="number" className={inputClass} placeholder="100" value={form.zeroDistanceYards} onChange={e => updateField('zeroDistanceYards', e.target.value)} /></div>
                <div><FieldLabel label="Est. Group (in)" help="Expected accuracy." /><input type="number" step="0.1" className={inputClass} placeholder="1.0" value={form.groupSizeInches} onChange={e => updateField('groupSizeInches', e.target.value)} /></div>
              </div>

              {/* Stability analysis */}
              <div className="pt-2">
                <div className={`border rounded-xl transition-all duration-300 ${stability ? stability.border + ' ' + stability.bg : 'border-steel-700 bg-black/40'}`}>
                  <div className="p-3 flex items-center justify-between border-b border-steel-700/50">
                    <div className="flex items-center gap-2"><Crosshair size={14} className={stability ? stability.color : 'text-steel-500'} /><span className="text-[10px] uppercase tracking-[0.2em] font-bold text-steel-400">Stability Analysis</span></div>
                    <div className="flex items-center gap-2">{stability && (<span className={`text-[10px] font-black uppercase tracking-wider ${stability.color}`}>{stability.status} (SG: {stability.sg})</span>)}<button type="button" onClick={() => setShowStabilityHelp(!showStabilityHelp)} className="text-steel-500 hover:text-white transition"><HelpCircle size={14} /></button></div>
                  </div>
                  {showStabilityHelp && (<div className="px-3 py-2 bg-black/40 text-[10px] text-steel-400 border-b border-steel-700/50"><strong>Miller Stability:</strong> Uses Bullet Length, Weight, and Twist Rate.<br /><span className="text-emerald-400">1.4+ (Green)</span> = Safe. <span className="text-red-400">&lt;1.0 (Red)</span> = Unstable.</div>)}
                  <div className="p-3 grid grid-cols-2 gap-3">
                    <div><FieldLabel label="Bullet Wt (gr)" help="Weight of projectile." /><input type="number" className={inputClass} placeholder="e.g. 168" value={form.bulletWeightGr} onChange={e => updateField('bulletWeightGr', e.target.value)} /></div>
                    <div><FieldLabel label="Velocity (fps)" help="Estimated muzzle velocity." /><input type="number" className={inputClass} placeholder="e.g. 2650" value={form.muzzleVelocityFps} onChange={e => updateField('muzzleVelocityFps', e.target.value)} /></div>
                    <div className="col-span-2"><FieldLabel label="Check Against Rifle" help="Select a rifle from Armory to test stability." /><select className={inputClass} value={selectedFirearmId} onChange={e => setSelectedFirearmId(e.target.value)}><option value="">Select Rifle (Twist)...</option>{guns.map(g => <option key={g.id} value={g.id}>{g.name} (1:{g.specs?.twistRate || '?'})</option>)}</select></div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="flex-1 flex flex-col min-h-[100px]">
                <FieldLabel label="Notes" help="Performance data, weather conditions, or load details." />
                <textarea className={inputClass + ' h-full resize-none'} placeholder="Intended use, COAL, etc." value={form.notes} onChange={e => updateField('notes', e.target.value)} />
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2 border-t border-steel-700/50">
              {editingRecipe
                ? <button type="button" onClick={resetForm} className="inline-flex items-center rt-btn rt-btn-secondary">Cancel edit</button>
                : <button type="button" onClick={resetForm} className="inline-flex items-center rt-btn rt-btn-secondary">Clear</button>}
              <button type="submit" disabled={saving} className="rt-btn rt-btn-primary disabled:opacity-60">{saving ? 'Saving…' : 'Save Recipe'}</button>
            </div>
          </form>
        ) : (
          <div className="mt-3 text-xs text-steel-400 border border-dashed border-steel-600/70 rounded-xl px-3 py-3 bg-black/30">Read-only mode. Sign in as a Reloader.</div>
        )}
      </div>

      {/* Recipe list */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-steel-700 pb-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-1">Saved Recipes</p>
            <p className="text-xs text-steel-400">{recipes.length === 0 ? 'No recipes yet.' : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} saved.`}</p>
          </div>
          {recipes.length > 0 && (
            <button type="button" onClick={() => handleExportExcel(recipes, 'all')} className="rt-btn rt-btn-ghost hover:text-steel-200 hover:border-steel-500">
              <FileText size={10} /> Download All (Excel)
            </button>
          )}
        </div>

        {recipes.length > 0 && (
          <div className="grid gap-3">
            {recipes.map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                canEdit={canEdit}
                archivingId={archivingId}
                editingId={editingRecipe?.id}
                onUseRecipe={onUseRecipe}
                onEdit={handleEdit}
                onDelete={promptDelete}
                onArchiveToggle={handleArchiveToggle}
                onLoadBatch={openBatchModal}
                onExportPdf={handleExportPdf}
                onExportExcel={(r) => handleExportExcel([r], `single-${r.name.replace(/\s+/g, '-')}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteModalOpen && recipeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
          <div className="glass border border-red-900/50 shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto"><Trash2 className="text-red-500" size={24} /></div>
            <div><h3 className="text-lg font-bold text-white">Delete Recipe?</h3><p className="text-sm text-steel-400 mt-1">Are you sure you want to delete <span className="text-white font-medium">"{recipeToDelete.name}"</span>?<br />This action cannot be undone.</p></div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 rounded-md border border-steel-600 text-steel-300 hover:bg-steel-700 font-medium text-sm transition">Cancel</button>
              <button onClick={() => executeDelete(false)} disabled={isDeleting} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 font-bold text-sm shadow-lg shadow-red-900/20 transition">{isDeleting ? 'Deleting...' : 'Delete Forever'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict resolution modal */}
      {conflictModalOpen && recipeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 pt-[env(safe-area-inset-top)] animate-in zoom-in-95 duration-200">
          <div className="glass border border-red-900/50 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 relative">
            <button onClick={() => setConflictModalOpen(false)} className="absolute top-4 right-4 text-steel-500 hover:text-white"><X size={20} /></button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0 border border-red-900/50"><AlertTriangle className="text-red-400" size={28} /></div>
              <div>
                <h3 className="text-lg font-bold text-white">Recipe In Use</h3>
                <p className="text-xs text-steel-400 leading-relaxed mt-1">The recipe <span className="text-steel-100 font-medium">"{recipeToDelete.name}"</span> has batches associated with it. You cannot delete it without losing that history.</p>
              </div>
            </div>
            <div className="rt-card p-4 border border-steel-700 text-sm text-steel-300">
              <p className="mb-2 font-bold text-steel-200">Recommended Action:</p>
              <p className="text-xs text-steel-400 mb-4">Archive the recipe instead. It will be hidden from the active list but your batch history will be preserved.</p>
              <button onClick={() => handleResolveConflict('archive')} className="w-full py-3 rounded-md bg-steel-700 hover:bg-steel-600 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition shadow-lg"><Archive size={14} /> Archive Recipe (Safe)</button>
            </div>
            <div className="pt-2 border-t border-steel-700/50">
              <button onClick={() => handleResolveConflict('cascade')} className="w-full py-2 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-900/20 hover:text-red-400 font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-2">I don't care, delete everything (Destructive)</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch modal */}
      {batchModalOpen && batchRecipe && (
        <BatchModal
          recipe={batchRecipe}
          purchases={purchases}
          onClose={() => { setBatchModalOpen(false); setBatchRecipe(null) }}
          onSuccess={() => refresh()}
        />
      )}
    </div>
  )
}

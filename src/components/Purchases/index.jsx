import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getAllPurchases, addPurchase, deletePurchase, calculatePerUnit } from '../../lib/db'
import { fetchSettings } from '../../lib/settings'
import {
  Trash2, Plus, Search, X, Edit,
  Globe, Package, ScanBarcode, Camera, Loader2, Image as ImageIcon, Info,
  Flame, Crosshair, Layers, Shield,
} from 'lucide-react'
import { ErrorBanner } from '../ErrorBanner'
import { InfoTip } from '../InfoTip'
import { HAPTIC } from '../../lib/haptics'
import UploadButton from '../UploadButton'
import { Market } from '../Market'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import {
  COMPONENT_TYPES, UNITS, CASE_CONDITIONS, DEFAULT_FORM,
  getLocalDate, formatMoney, getSmartPrice,
} from './purchaseHelpers'
import { PurchaseCard } from './PurchaseCard'

export function Purchases({ onChanged, canEdit = false, highlightId, user }) {
  const [activeSubTab,   setActiveSubTab]   = useState('inventory')
  const [purchases,      setPurchases]      = useState([])
  const [isFormOpen,     setIsFormOpen]     = useState(false)
  const [editingId,      setEditingId]      = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [searchTerm,     setSearchTerm]     = useState('')
  const [form,           setForm]           = useState(DEFAULT_FORM)
  const [error,          setError]          = useState(null)
  const [scanStatus,     setScanStatus]     = useState('')

  const [showScanner,    setShowScanner]    = useState(false)
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [cameraLoading,  setCameraLoading]  = useState(false)
  const [scannerActive,  setScannerActive]  = useState(false)
  const html5QrCodeRef = useRef(null)
  const fileInputRef   = useRef(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete,    setItemToDelete]    = useState(null)
  const [isDeleting,      setIsDeleting]      = useState(false)

  const showCaliber   = ['bullet', 'case', 'other'].includes(form.componentType)
  const showCondition = ['case'].includes(form.componentType)
  const qtyLabel      = ['lb', 'kg', 'gr'].includes(form.unit) ? 'Weight' : 'Count'

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    checkScannerConfig(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (highlightId && purchases.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`purchase-${String(highlightId)}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 600)
    }
  }, [highlightId, purchases])

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.warn('Scanner stop error', e))
        html5QrCodeRef.current.clear()
      }
    }
  }, [])

  async function checkScannerConfig(signal) {
    try {
      const settings = await fetchSettings(signal)
      setScannerEnabled(String(settings.barcode_enabled).toLowerCase().trim() === 'true')
    } catch (e) {
      if (e?.name !== 'AbortError') setScannerEnabled(false)
    }
  }

  const startScanner = async () => {
    try {
      if (html5QrCodeRef.current?.isScanning) return
      setCameraLoading(true); setError(null)
      setTimeout(async () => {
        if (!document.getElementById('reader')) return
        const html5QrCode = new Html5Qrcode('reader')
        html5QrCodeRef.current = html5QrCode
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => { HAPTIC.success(); stopScanner(); setShowScanner(false); fetchProductData(decodedText) },
          () => {}
        )
        setScannerActive(true); setCameraLoading(false)
      }, 100)
    } catch (err) {
      console.error('Camera Start Failed:', err)
      setCameraLoading(false); setScannerActive(false)
      setError('Camera failed. Please check permissions or use \'Photo File\'.')
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try { if (html5QrCodeRef.current.isScanning) await html5QrCodeRef.current.stop(); html5QrCodeRef.current.clear() }
      catch (err) { console.warn('Stop warning:', err) }
      html5QrCodeRef.current = null; setScannerActive(false)
    }
  }

  const handleSystemCamera = () => { stopScanner(); fileInputRef.current?.click() }

  const processImageFile = (file, options = {}) => {
    const { rotation = 0, contrastStretch = false, invert = false, resizeTo = 1200, padding = 100 } = options
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width, height = img.height
        const maxDim = Math.max(width, height)
        if (resizeTo > 0) {
          if (maxDim > resizeTo) { const s = resizeTo / maxDim; width *= s; height *= s }
          else if (maxDim < 600) { const s = 1000 / maxDim; width *= s; height *= s }
        }
        const canvas = document.createElement('canvas')
        let finalW = width + padding * 2, finalH = height + padding * 2
        if (rotation === 90 || rotation === 270) { canvas.width = finalH; canvas.height = finalW }
        else { canvas.width = finalW; canvas.height = finalH }
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate((rotation * Math.PI) / 180)
        ctx.drawImage(img, -width / 2, -height / 2, width, height); ctx.restore()
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height), data = imageData.data
        let min = 255, max = 0
        if (contrastStretch) { for (let i = 0; i < data.length; i += 4) { const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; if (g < min) min = g; if (g > max) max = g } }
        for (let i = 0; i < data.length; i += 4) {
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          if (contrastStretch && max > min) gray = ((gray - min) / (max - min)) * 255
          if (invert) gray = 255 - gray
          data[i] = data[i + 1] = data[i + 2] = gray
        }
        ctx.putImageData(imageData, 0, 0)
        canvas.toBlob(blob => blob ? resolve(new File([blob], 'scan.png', { type: 'image/png' })) : reject(new Error('Processing failed')), 'image/png')
      }
      img.onerror = reject; img.src = URL.createObjectURL(file)
    })
  }

  const handleFileScan = async (e) => {
    if (!e.target.files?.length) return
    const originalFile = e.target.files[0]
    setLoading(true); setError(null); setShowScanner(false); setScanStatus('Scanning...')
    let foundCode = null, html5QrCode = null
    const formats = [
      Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.RSS_14,
    ]
    const attemptScan = async (fileToScan, useRendered, config) => {
      try { if (html5QrCode) { try { await html5QrCode.clear() } catch(e) {} } html5QrCode = new Html5Qrcode('reader-hidden', config); return await html5QrCode.scanFileV2(fileToScan, useRendered) }
      catch (err) { return null }
    }
    try {
      foundCode = await attemptScan(originalFile, true,  { experimentalFeatures: { useBarCodeDetectorIfSupported: true  }, formatsToSupport: formats, verbose: false })
      if (!foundCode) { setScanStatus('Deep Scan...'); foundCode = await attemptScan(originalFile, false, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false }) }
      if (!foundCode) { setScanStatus('Enhancing...'); const p3 = await processImageFile(originalFile, { padding: 80 }); foundCode = await attemptScan(p3, true, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false }) }
      if (!foundCode) { setScanStatus('Rotating...');  const p4 = await processImageFile(originalFile, { rotation: 90, padding: 80 }); foundCode = await attemptScan(p4, true, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false }) }
      if (!foundCode) { setScanStatus('De-glaring...'); const p5 = await processImageFile(originalFile, { contrastStretch: true, padding: 80 }); foundCode = await attemptScan(p5, true, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false }) }
      if (foundCode) { HAPTIC.success(); fetchProductData(foundCode) } else throw new Error('NotFound')
    } catch (err) {
      setError('No barcode detected. Please try \'Live Camera\' mode for better results.'); HAPTIC.error()
    } finally {
      if (html5QrCode) { try { await html5QrCode.clear() } catch(e) {} }
      setLoading(false); setScanStatus(''); e.target.value = ''
    }
  }

  async function fetchProductData(code) {
    setLoading(true); setError(null); setScanStatus('Searching...')
    if (!isFormOpen) handleAddNew()
    try {
      const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ code }) })
      const autoLotId = `SCAN-${Date.now().toString().slice(-6)}`
      if (res.status === 404) { setForm(prev => ({ ...prev, lotId: autoLotId })); throw new Error('Product not found. Enter details manually.') }
      if (res.status === 401) throw new Error('Scanner config error.')
      if (!res.ok) throw new Error('Lookup failed.')
      const json = await res.json(), data = json.data
      let type = 'other'
      const fullText = (data.category + ' ' + data.name + ' ' + data.description).toLowerCase()
      if (fullText.includes('powder') || fullText.includes('propellant')) type = 'powder'
      else if (fullText.includes('bullet') || fullText.includes('projectile') || fullText.includes('head')) type = 'bullet'
      else if (fullText.includes('primer')) type = 'primer'
      else if (fullText.includes('brass') || fullText.includes('case')) type = 'case'
      let brand = data.brand || '', name = data.name || ''
      if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) name = name.slice(brand.length).trim()
      setForm(prev => ({ ...prev, brand, name, componentType: type, imageUrl: data.imageUrl || prev.imageUrl, unit: type === 'powder' ? 'lb' : 'each', notes: data.description ? data.description.substring(0, 150) + '...' : '', lotId: autoLotId }))
      HAPTIC.success()
    } catch (err) { setError(err.message); HAPTIC.error() }
    finally { setLoading(false); setScanStatus('') }
  }

  async function loadData(signal) {
    try {
      const data = await getAllPurchases(signal)
      setPurchases(data)
      if (onChanged) onChanged()
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Failed to sync inventory data.')
    }
  }

  function handleAddNew() {
    setEditingId(null)
    setForm({ ...DEFAULT_FORM, lotId: `LOT-${Date.now().toString().slice(-6)}` })
    setError(null); setIsFormOpen(true); HAPTIC.click()
  }

  function handleEdit(item) {
    setEditingId(item.id)
    setForm({
      componentType: item.componentType || 'powder',
      date: item.purchaseDate ? item.purchaseDate.substring(0, 10) : getLocalDate(),
      vendor: item.vendor || '', brand: item.brand || '', name: item.name || '',
      typeDetail: item.typeDetail || '', lotId: item.lotId || '',
      qty: item.qty != null ? String(item.qty) : '',
      unit: item.unit || '', price: item.price != null ? String(item.price) : '',
      shipping: item.shipping != null ? String(item.shipping) : '',
      tax: item.tax != null ? String(item.tax) : '',
      notes: item.notes || '', status: item.status || 'active',
      url: item.url || '', imageUrl: item.imageUrl || '',
      caseCondition: item.caseCondition || '', caliber: item.caliber || '',
    })
    setError(null); setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); HAPTIC.click()
  }

  function promptDelete(item) { if (!canEdit) return; setItemToDelete(item); setDeleteModalOpen(true); HAPTIC.click() }

  async function executeDelete() {
    if (!itemToDelete) return; setIsDeleting(true)
    try { await deletePurchase(itemToDelete.id); HAPTIC.success(); loadData(); setDeleteModalOpen(false); setItemToDelete(null) }
    catch (err) { setError(`Failed to delete: ${err.message}`); HAPTIC.error(); setDeleteModalOpen(false) }
    finally { setIsDeleting(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError(null)
    try {
      const dateObj = new Date(form.date)
      const validDate = !isNaN(dateObj.getTime()) ? form.date : new Date().toISOString().split('T')[0]
      let finalLotId = String(form.lotId || '').trim()
      if (!finalLotId) finalLotId = `AUTO-${Date.now()}`
      const payload = {
        ...(editingId && { id: editingId }),
        lot_id: finalLotId, component_type: String(form.componentType || 'powder'),
        case_condition: String(form.caseCondition || ''), caliber: String(form.caliber || '').trim(),
        brand: String(form.brand || '').trim(), name: String(form.name || '').trim(),
        type_detail: String(form.typeDetail || '').trim(), qty: parseFloat(form.qty) || 0,
        unit: String(form.unit || 'lb'), price: parseFloat(form.price) || 0,
        shipping: parseFloat(form.shipping) || 0, tax: parseFloat(form.tax) || 0,
        vendor: String(form.vendor || '').trim(), purchase_date: validDate,
        url: String(form.url || ''), image_url: String(form.imageUrl || ''),
        status: String(form.status || 'active'), notes: String(form.notes || ''),
      }
      await addPurchase(payload); HAPTIC.success(); setIsFormOpen(false); loadData()
    } catch (err) {
      const msg = err.body ? JSON.stringify(err.body) : err.message
      setError(msg.includes('unique constraint') || msg.includes('lot_id') ? 'Error: This Lot ID already exists.' : `Failed to save: ${msg}`)
      HAPTIC.error()
    } finally { setLoading(false) }
  }

  const safeFloat = (val) => { const n = parseFloat(val); return isNaN(n) ? 0 : n }
  const liveUnitCost   = calculatePerUnit(safeFloat(form.price), safeFloat(form.shipping), safeFloat(form.tax), safeFloat(form.qty))
  const liveSmartPrice = getSmartPrice(form.componentType, liveUnitCost)

  const filteredPurchases = purchases.filter(p => {
    const term = searchTerm.toLowerCase()
    return `${p.brand} ${p.name} ${p.lotId} ${p.vendor} ${p.componentType}`.toLowerCase().includes(term)
  })
  const lotsByType = useMemo(() => {
    const groups = { powder: [], bullet: [], primer: [], case: [], other: [] }
    for (const p of filteredPurchases) {
      const type = groups[p.componentType] ? p.componentType : 'other'
      groups[type].push(p)
    }
    return groups
  }, [filteredPurchases])

  const inputClass       = 'rt-input'
  const labelClass       = 'rt-label'
  const helpClass        = 'text-[9px] text-steel-500 mt-0.5 italic flex items-center gap-1'
  const sectionLabelClass = 'rt-label block mb-4'
  const tabBtnClass = (active) => `pb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] transition border-b-2 flex items-center gap-2 ${active ? 'border-[#c42b21] text-[var(--text-hi)]' : 'border-transparent text-[var(--text-lo)] hover:text-[var(--text-md)]'}`

  return (
    <>
      <div id="reader-hidden" className="fixed top-0 left-0 w-px h-px opacity-0 overflow-hidden pointer-events-none" />
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileScan} />

      <div className="space-y-6">
        {/* Header */}
        <div className="rt-section">
          <div className="rt-section-bar" />
          <div>
            <span className="rt-section-eyebrow">Supply Chain</span>
            <h2 className="rt-section-title flex items-center">
              PURCHASES
              <InfoTip variant="info" title="Component Lots" text="Each purchase is a numbered lot — linking component cost to batches and inventory for accurate per-round cost tracking." side="bottom" />
            </h2>
          </div>
        </div>

        {/* Tab toolbar */}
        <div className="flex flex-wrap items-end justify-between border-b border-steel-700 gap-4">
          <div className="flex gap-6">
            <button onClick={() => setActiveSubTab('inventory')} className={tabBtnClass(activeSubTab === 'inventory')}><Package size={14} className="inline mr-2 mb-0.5" />Inventory</button>
            <button onClick={() => setActiveSubTab('supply')}    className={tabBtnClass(activeSubTab === 'supply')}><Globe size={14} className="inline mr-2 mb-0.5" />Market Watch</button>
          </div>
          {activeSubTab === 'inventory' && canEdit && !isFormOpen && (
            <div className="flex gap-2 mb-2">
              {scannerEnabled && canEdit && (
                <button onClick={() => { setShowScanner(true); HAPTIC.click() }} className="rt-btn rt-btn-secondary"><ScanBarcode size={14} /> Scan Barcode</button>
              )}
              <button onClick={handleAddNew} className="rt-btn rt-btn-primary"><Plus size={12} /> New Lot</button>
            </div>
          )}
        </div>

        {activeSubTab === 'supply' ? <Market user={user} /> : (
          <>
            <ErrorBanner error={error} onDismiss={() => setError(null)} />

            {loading && scanStatus && (
              <div className="flex items-center gap-3 bg-steel-800 border border-steel-700 rounded-md p-3 animate-in fade-in">
                <Loader2 size={16} className="text-red-500 animate-spin" />
                <span className="text-xs text-steel-200 font-mono">{scanStatus}</span>
              </div>
            )}

            {/* Scanner modal */}
            {showScanner && createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-scrim backdrop-blur-md p-4 animate-in fade-in duration-200">
                <div className="glass w-full max-w-sm overflow-hidden p-6 relative flex flex-col items-center shadow-2xl">
                  <button onClick={() => { stopScanner(); setShowScanner(false) }} className="absolute top-4 right-4 text-steel-400 hover:text-white bg-panel p-2 rounded-full z-20 cursor-pointer"><X size={20} /></button>
                  <h3 className="text-lg font-bold text-[var(--text-hi)] mb-4 text-center flex items-center justify-center gap-2"><ScanBarcode className="text-[var(--copper)]" /> Scanner</h3>
                  <div className="relative w-full h-[300px] bg-[var(--bg)] rounded-lg overflow-hidden border-2 border-[var(--copper)]/30 flex flex-col items-center justify-center group">
                    {!scannerActive && !cameraLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-steel-800 z-50 space-y-4 animate-in fade-in">
                        <button onClick={startScanner} className="w-48 px-4 py-3 bg-red-700 hover:bg-red-600 text-white rounded-md font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer relative z-50"><Camera size={18} /> Live Camera</button>
                        <span className="text-[10px] text-steel-400 uppercase tracking-widest font-bold">- OR -</span>
                        <button onClick={handleSystemCamera} className="w-48 px-4 py-3 bg-steel-700 hover:bg-steel-600 text-steel-100 rounded-md font-bold shadow-lg transition flex items-center justify-center gap-2 border border-steel-600 cursor-pointer relative z-50"><ImageIcon size={18} /> Photo / File</button>
                      </div>
                    )}
                    {cameraLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-scrim z-40">
                        <Loader2 className="animate-spin text-[var(--copper)] mb-2" size={32} />
                        <span className="text-xs text-steel-300">Starting Camera...</span>
                      </div>
                    )}
                    <div id="reader" className="w-full h-full" />
                    {scannerActive && !cameraLoading && (
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500/80 z-10 shadow-[0_0_15px_rgba(239,68,68,1)] animate-[scan_2s_infinite]" />
                    )}
                    <style>{`@keyframes scan { 0% { top: 10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 90%; opacity: 0; } } #reader video { object-fit: cover; width: 100% !important; height: 100% !important; }`}</style>
                  </div>
                  <p className="text-center text-[10px] text-steel-400 mt-4 h-4">{scannerActive ? 'Point camera at barcode.' : 'Choose scanning method.'}</p>
                </div>
              </div>,
              document.body
            )}

            {/* Add / Edit form */}
            {isFormOpen && (
              <div className="glass p-6 border border-red-500/30 animation-fade-in relative mb-6">
                <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-steel-400 hover:text-white"><X size={18} /></button>
                <span className={sectionLabelClass}>{editingId ? 'EDIT PURCHASE' : 'ADD PURCHASE'}</span>

                {form.brand && !editingId && form.imageUrl && (
                  <div className="mb-4 text-[10px] text-[var(--copper)] flex items-center gap-1.5 bg-copper-900/20 px-3 py-2 rounded-md border border-copper-900/50 animate-in fade-in slide-in-from-top-2">
                    <Loader2 size={10} /> Product data retrieved from barcode scan.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className={labelClass}>Type</label><select className={inputClass} value={form.componentType} onChange={e => setForm({ ...form, componentType: e.target.value })}>{COMPONENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                    <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Vendor</label><input className={inputClass} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Brownells" /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className={labelClass}>Brand</label><input className={inputClass} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. CCI" /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Product Name</label><input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. #400 Small Rifle" /></div>
                    <div><label className={labelClass}>Lot #</label><input className={inputClass} value={form.lotId} onChange={e => setForm({ ...form, lotId: e.target.value })} placeholder="Batch Code" /><p className={helpClass} title="Manufacturing Lot ID found on box/jug."><Info size={10} /> On box sticker</p></div>
                  </div>

                  {(showCaliber || showCondition) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1">
                      {showCaliber && <div><label className={labelClass}>Caliber</label><input className={inputClass} value={form.caliber} onChange={e => setForm({ ...form, caliber: e.target.value })} placeholder="e.g. 9mm" /></div>}
                      <div className="md:col-span-2"><label className={labelClass}>Type Details</label><input className={inputClass} value={form.typeDetail} onChange={e => setForm({ ...form, typeDetail: e.target.value })} placeholder="e.g. Match, Magnum, Ball" /></div>
                      {showCondition && <div><label className={labelClass}>Condition</label><select className={inputClass} value={form.caseCondition} onChange={e => setForm({ ...form, caseCondition: e.target.value })}><option value="">N/A</option>{CASE_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-steel-700 bg-panel-sm p-3 rounded-xl">
                    <div><label className={labelClass}>{qtyLabel}</label><input type="number" step="0.01" className={inputClass} value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} placeholder="e.g. 1000" /></div>
                    <div><label className={labelClass}>Unit</label><select className={inputClass} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
                    <div><label className={labelClass}>Total Paid</label><input type="number" step="0.01" className={inputClass} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" /><p className={helpClass}>Pre-tax price</p></div>
                    <div><label className={labelClass}>Tax/Ship</label><div className="flex gap-1"><input type="number" step="0.01" className={inputClass} placeholder="Ship" value={form.shipping} onChange={e => setForm({ ...form, shipping: e.target.value })} /><input type="number" step="0.01" className={inputClass} placeholder="Tax" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} /></div></div>
                    <div className="col-span-2 md:col-span-4 flex flex-col items-end mt-1">
                      <span className="text-[10px] text-steel-300">Cost per Unit: <span className="text-steel-100 font-mono">{formatMoney(liveUnitCost)}</span></span>
                      {liveSmartPrice.val !== liveUnitCost && (
                        <span className="text-xs text-steel-200 font-bold">{liveSmartPrice.label}: {formatMoney(liveSmartPrice.val)}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rt-card p-3 flex flex-col justify-between"><label className={labelClass}>Reference Photo</label><div className="flex-1 flex flex-col justify-center"><UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} /></div></div>
                    <div className="space-y-3">
                      <div><label className={labelClass}>Product URL</label><input className={inputClass} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
                      <div><label className={labelClass}>Notes</label><textarea className={inputClass + ' h-20 resize-none'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Performance notes, etc." /></div>
                      <div><label className={labelClass}>Status</label><select className={inputClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="depleted">Depleted</option></select></div>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="rt-btn rt-btn-secondary">Cancel</button>
                    <button type="submit" disabled={loading} className="rt-btn rt-btn-primary">{loading ? 'Saving...' : 'Save Record'}</button>
                  </div>
                </form>
              </div>
            )}

            {/* Inventory list */}
            <div className="space-y-2">
              {/* Search */}
              <div className="flex items-center gap-2 glass px-3 py-2.5 border border-[var(--border-md)]">
                <Search size={14} className="text-[var(--text-lo)] flex-shrink-0" />
                <input
                  className="bg-transparent border-none focus:outline-none text-xs text-[var(--text-hi)] w-full placeholder:text-[var(--text-lo)]"
                  placeholder="Search by brand, name, lot, vendor…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-[var(--text-lo)] hover:text-[var(--text-hi)] transition flex-shrink-0">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Groups */}
              <div className="space-y-6 pt-2">
                {COMPONENT_TYPES.map(type => {
                  const lots = lotsByType[type.value]
                  if (!lots?.length) return null
                  const icons = { powder: Flame, bullet: Crosshair, primer: Layers, case: Shield, other: Package }
                  const accents = { powder: 'from-amber-700', bullet: 'from-blue-800', primer: 'from-violet-800', case: 'from-emerald-800', other: 'from-steel-700' }
                  const Icon = icons[type.value] || Package
                  const accentFrom = accents[type.value] || accents.other
                  return (
                    <div key={type.value}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-[2px] self-stretch bg-gradient-to-b ${accentFrom} to-transparent rounded-full`} />
                        <Icon size={12} className="text-[var(--text-md)]" />
                        <h3 className="text-xs font-bold text-[var(--text-md)] uppercase tracking-[0.2em]">{type.label}</h3>
                        <span className="text-[10px] font-mono text-[var(--text-lo)]">{lots.length}</span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-2">
                        {lots.map(p => (
                          <PurchaseCard
                            key={p.id}
                            purchase={p}
                            highlightId={highlightId}
                            canEdit={canEdit}
                            onEdit={handleEdit}
                            onDelete={promptDelete}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
                {filteredPurchases.length === 0 && (
                  <div className="glass p-10 flex flex-col items-center text-center gap-3">
                    <Package size={28} className="text-[var(--text-lo)]" />
                    <div>
                      <p className="text-sm font-bold text-[var(--text-hi)]">{searchTerm ? 'No matches' : 'No purchases yet'}</p>
                      <p className="text-xs text-[var(--text-md)] mt-1">{searchTerm ? 'Try a different search term.' : 'Add your first lot with the New Lot button above.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Delete modal */}
        {deleteModalOpen && itemToDelete && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[var(--scrim-bg)] backdrop-blur-sm p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="glass w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-hi)]">Delete Lot?</h3>
                <p className="text-sm text-[var(--text-md)] mt-1">
                  Remove <span className="text-[var(--text-hi)] font-semibold">{itemToDelete.brand} {itemToDelete.name}</span>? This cannot be undone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDeleteModalOpen(false)} className="py-2 rounded border border-[var(--border-md)] text-[var(--text-md)] hover:text-[var(--text-hi)] font-medium text-sm transition">Cancel</button>
                <button onClick={executeDelete} disabled={isDeleting} className="py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition">
                  {isDeleting ? 'Removing…' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  )
}

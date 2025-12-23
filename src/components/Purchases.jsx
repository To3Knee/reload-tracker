//===============================================================
//Script Name: Purchases.jsx
//Script Location: src/components/Purchases.jsx
//Date: 12/14/2025
//Created By: T03KNEE
//Version: 12.2.0 (Market Auth Wired)
//About: Manage component LOT purchases.
//       - FEATURE: Added 'Info' icons and helper text for Lot #.
//       - FEATURE: Dynamic Labels (Weight vs Count).
//       - FIX: Passing user prop to Market component.
//===============================================================

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getAllPurchases, addPurchase, deletePurchase, calculatePerUnit } from '../lib/db'
import { fetchSettings } from '../lib/settings'
import { Trash2, Plus, Search, Printer, X, Edit, User, Clock, AlertTriangle, Globe, Package, ScanBarcode, Sparkles, Camera, Loader2, Image as ImageIcon, Info, HelpCircle } from 'lucide-react'
import { printPurchaseLabel } from '../lib/labels' 
import { HAPTIC } from '../lib/haptics'
import UploadButton from './UploadButton'
import { Market } from './Market'
import { Html5Qrcode } from 'html5-qrcode'

const COMPONENT_TYPES = [ { value: 'powder', label: 'Powder' }, { value: 'bullet', label: 'Bullet / Projectile' }, { value: 'primer', label: 'Primer' }, { value: 'case', label: 'Brass / Case' }, { value: 'other', label: 'Other' } ]
const UNITS = [ { value: 'lb', label: 'Pounds (lb)' }, { value: 'kg', label: 'Kilograms (kg)' }, { value: 'gr', label: 'Grains (gr)' }, { value: 'each', label: 'Each / Pieces' }, { value: 'rounds', label: 'Rounds' } ]
const CASE_CONDITIONS = [ { value: 'new', label: 'New' }, { value: 'once-fired', label: 'Once fired' }, { value: 'mixed', label: 'Mixed / Unknown' } ]

const getLocalDate = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - (offset*60*1000))
    return local.toISOString().split('T')[0]
}

const DEFAULT_FORM = { componentType: 'powder', caliber: '', brand: '', name: '', typeDetail: '', lotId: '', qty: '', unit: 'lb', price: '', shipping: '', tax: '', vendor: '', date: getLocalDate(), notes: '', url: '', imageUrl: '', status: 'active', caseCondition: '' }

// STRICT FORMATTER
const formatMoney = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '$0.00';
    if (num < 1 && num > 0) return '$' + num.toFixed(4);
    return '$' + num.toFixed(2);
}

// FIX: Added 'user' to props
export function Purchases({ onChanged, canEdit = false, highlightId, user }) {
  const [activeSubTab, setActiveSubTab] = useState('inventory') 
  const [purchases, setPurchases] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState(null)
  
  // SCANNER STATE
  const [showScanner, setShowScanner] = useState(false)
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const html5QrCodeRef = useRef(null)
  const fileInputRef = useRef(null) 

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // FIELD VISIBILITY LOGIC
  const showCaliber = ['bullet', 'case', 'other'].includes(form.componentType);
  const showCondition = ['case'].includes(form.componentType);
  const qtyLabel = ['lb', 'kg', 'gr'].includes(form.unit) ? 'Weight' : 'Count';

  useEffect(() => { 
      loadData();
      checkScannerConfig();
  }, [])

  useEffect(() => { if (highlightId && purchases.length > 0) { const targetId = String(highlightId); setTimeout(() => { const el = document.getElementById(`purchase-${targetId}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 600) } }, [highlightId, purchases])

  async function checkScannerConfig() {
      try {
          const settings = await fetchSettings();
          const isEnabled = String(settings.barcode_enabled).toLowerCase().trim() === 'true';
          setScannerEnabled(isEnabled);
      } catch (e) {
          setScannerEnabled(false);
      }
  }

  // --- CAMERA LIFECYCLE ---
  useEffect(() => {
      let timer;
      if (showScanner) {
          timer = setTimeout(() => { startScanner(); }, 300);
      } else {
          stopScanner();
      }
      return () => { clearTimeout(timer); stopScanner(); };
  }, [showScanner]);

  const startScanner = async () => {
      try {
          if (html5QrCodeRef.current) return;
          const scannerId = "reader";
          if (!document.getElementById(scannerId)) return;

          setCameraLoading(true);
          setError(null);

          const html5QrCode = new Html5Qrcode(scannerId);
          html5QrCodeRef.current = html5QrCode;

          const safetyTimer = setTimeout(() => {
              if (html5QrCode.isScanning) return;
              stopScanner();
              setError("Camera timed out. Use 'System Camera'.");
          }, 5000);

          await html5QrCode.start(
              { facingMode: "environment" }, 
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              onScanSuccess,
              onScanFailure
          );
          
          clearTimeout(safetyTimer);
          setScannerActive(true);
          setCameraLoading(false);
      } catch (err) {
          console.error("Camera Failed:", err);
          try {
              if (html5QrCodeRef.current) {
                  await html5QrCodeRef.current.start(
                      { facingMode: "user" }, 
                      { fps: 10 },
                      onScanSuccess,
                      onScanFailure
                  );
                  setScannerActive(true);
                  setCameraLoading(false);
                  return;
              }
          } catch(e2) {}
          stopScanner();
          setError("Camera failed. Try 'System Camera'.");
      }
  };

  const onScanSuccess = (decodedText) => {
      HAPTIC.success();
      stopScanner();
      setShowScanner(false);
      fetchProductData(decodedText);
  };

  const onScanFailure = (error) => { /* Ignore */ }

  const stopScanner = async () => {
      if (html5QrCodeRef.current) {
          try {
              if (html5QrCodeRef.current.isScanning) {
                  await html5QrCodeRef.current.stop();
              }
              html5QrCodeRef.current.clear();
          } catch (err) { console.warn("Stop warning:", err); }
          html5QrCodeRef.current = null;
          setScannerActive(false);
          setCameraLoading(false);
      }
  };

  const handleSystemCamera = () => { fileInputRef.current?.click(); }

  const handleFileScan = async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setLoading(true); 
      setShowScanner(false); 
      try {
          const html5QrCode = new Html5Qrcode("reader-hidden"); 
          const decodedText = await html5QrCode.scanFileV2(file, true);
          HAPTIC.success();
          fetchProductData(decodedText);
      } catch (err) {
          setError("Could not read barcode. Try again.");
          HAPTIC.error();
      } finally {
          setLoading(false);
          e.target.value = ''; 
      }
  }

  async function fetchProductData(code) {
      setLoading(true);
      setError(null);
      if (!isFormOpen) handleAddNew();
      try {
          const res = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ code })
          });
          
          if (res.status === 404) throw new Error("Product not found. Enter details manually.");
          if (res.status === 401) throw new Error("Scanner config error.");
          if (!res.ok) throw new Error("Lookup failed.");

          const json = await res.json();
          const data = json.data;

          // AUTO-DETECT TYPE
          let type = 'other';
          const fullText = (data.category + " " + data.name + " " + data.description).toLowerCase();
          if (fullText.includes('powder') || fullText.includes('propellant')) type = 'powder';
          else if (fullText.includes('bullet') || fullText.includes('projectile') || fullText.includes('head')) type = 'bullet';
          else if (fullText.includes('primer')) type = 'primer';
          else if (fullText.includes('brass') || fullText.includes('case')) type = 'case';

          let brand = data.brand || "";
          let name = data.name || "";
          if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
              name = name.slice(brand.length).trim();
          }

          setForm(prev => ({
              ...prev,
              brand: brand,
              name: name,
              componentType: type,
              imageUrl: data.imageUrl || prev.imageUrl,
              // Smart Unit Defaulting
              unit: type === 'powder' ? 'lb' : type === 'primer' ? 'each' : 'each',
              notes: data.description ? data.description.substring(0, 150) + "..." : ""
          }));
          
          HAPTIC.success();
      } catch (err) {
          setError(err.message);
          HAPTIC.error();
      } finally {
          setLoading(false);
      }
  }

  async function loadData() { try { const data = await getAllPurchases(); setPurchases(data); if (onChanged) onChanged(); } catch (err) { console.error("Failed to load purchases", err); setError("Failed to sync inventory data."); } }
  function handleAddNew() { setEditingId(null); setForm(DEFAULT_FORM); setError(null); setIsFormOpen(true); HAPTIC.click(); }
  function handleEdit(item) { setEditingId(item.id); setForm({ componentType: item.componentType || 'powder', date: item.purchaseDate ? item.purchaseDate.substring(0, 10) : getLocalDate(), vendor: item.vendor || '', brand: item.brand || '', name: item.name || '', typeDetail: item.typeDetail || '', lotId: item.lotId || '', qty: item.qty != null ? String(item.qty) : '', unit: item.unit || '', price: item.price != null ? String(item.price) : '', shipping: item.shipping != null ? String(item.shipping) : '', tax: item.tax != null ? String(item.tax) : '', notes: item.notes || '', status: item.status || 'active', url: item.url || '', imageUrl: item.imageUrl || '', caseCondition: item.caseCondition || '' }); setError(null); setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); HAPTIC.click(); }
  function promptDelete(item) { if (!canEdit) return; setItemToDelete(item); setDeleteModalOpen(true); HAPTIC.click(); }
  async function executeDelete() { if (!itemToDelete) return; setIsDeleting(true); try { await deletePurchase(itemToDelete.id); HAPTIC.success(); loadData(); setDeleteModalOpen(false); setItemToDelete(null); } catch (err) { setError(`Failed to delete: ${err.message}`); HAPTIC.error(); setDeleteModalOpen(false); } finally { setIsDeleting(false); } }
  async function handleSubmit(e) { e.preventDefault(); setLoading(true); setError(null); try { const payload = { ...form, id: editingId, qty: parseFloat(form.qty), price: parseFloat(form.price), shipping: parseFloat(form.shipping), tax: parseFloat(form.tax), purchaseDate: form.date }; await addPurchase(payload); HAPTIC.success(); setIsFormOpen(false); loadData(); } catch (err) { setError(`Failed to save: ${err.message}`); HAPTIC.error(); } finally { setLoading(false); } }

  const safeFloat = (val) => { const num = parseFloat(val); return isNaN(num) ? 0 : num; }
  const liveUnitCost = calculatePerUnit(safeFloat(form.price), safeFloat(form.shipping), safeFloat(form.tax), safeFloat(form.qty));
  
  const filteredPurchases = purchases.filter(p => { const term = searchTerm.toLowerCase(); return `${p.brand} ${p.name} ${p.lotId} ${p.vendor} ${p.componentType}`.toLowerCase().includes(term) })
  const lotsByType = useMemo(() => { const groups = { powder: [], bullet: [], primer: [], case: [], other: [] }; for (const p of filteredPurchases) { const type = groups[p.componentType] ? p.componentType : 'other'; groups[type].push(p); } return groups; }, [filteredPurchases])

  const inputClass = "w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-semibold text-zinc-400 mb-1"
  const helpClass = "text-[9px] text-zinc-600 mt-0.5 italic flex items-center gap-1"
  const sectionLabelClass = "text-xs uppercase tracking-[0.25em] text-zinc-500 mb-4 block"
  const tabBtnClass = (active) => `pb-2 px-1 text-xs font-bold uppercase tracking-wider transition border-b-2 ${active ? 'border-red-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`

  // --- SMART PRICING HELPER ---
  const getSmartPrice = (type, unitCost) => {
      if (type === 'primer') return { label: 'Cost / 1k', val: unitCost * 1000 };
      if (type === 'bullet' || type === 'case') return { label: 'Cost / 100', val: unitCost * 100 };
      return { label: 'Cost / Unit', val: unitCost };
  }

  const liveSmartPrice = getSmartPrice(form.componentType, liveUnitCost);

  return (
    <div className="space-y-6">
      <div id="reader-hidden" className="hidden"></div>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileScan} />

      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div><span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Supply Chain</span><h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">PURCHASES</h2></div>
      </div>

      <div className="flex flex-wrap items-end justify-between border-b border-zinc-800 gap-4">
          <div className="flex gap-6">
            <button onClick={() => setActiveSubTab('inventory')} className={tabBtnClass(activeSubTab === 'inventory')}><Package size={14} className="inline mr-2 mb-0.5"/>Inventory</button>
            <button onClick={() => setActiveSubTab('supply')} className={tabBtnClass(activeSubTab === 'supply')}><Globe size={14} className="inline mr-2 mb-0.5"/>Market Watch</button>
          </div>
          {activeSubTab === 'inventory' && canEdit && !isFormOpen && (
              <div className="flex gap-2 mb-2">
                  {scannerEnabled && canEdit && <button onClick={() => { setShowScanner(true); HAPTIC.click(); }} className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-emerald-500/50 hover:text-white transition flex items-center gap-2"><ScanBarcode size={14} /> Scan Barcode</button>}
                  <button onClick={handleAddNew} className="px-4 py-1.5 rounded-full bg-red-700 border border-red-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition flex items-center gap-2"><Plus size={12} /> New Lot</button>
              </div>
          )}
      </div>

      {/* FIX: Passing 'user' prop down to Market */}
      {activeSubTab === 'supply' ? ( <Market user={user} /> ) : (
          <>
            {error && (<div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2"><AlertTriangle className="text-red-500 flex-shrink-0" size={20} /><div className="flex-1"><p className="text-xs font-bold text-red-400">System Notification</p><p className="text-xs text-red-200/80">{error}</p></div><button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16}/></button></div>)}

            {showScanner && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0f0f10] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden p-6 relative flex flex-col items-center shadow-2xl">
                        <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-black/50 p-2 rounded-full z-20 cursor-pointer"><X size={20} /></button>
                        <h3 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2"><ScanBarcode className="text-emerald-500" /> Scanner</h3>
                        <div className="relative w-full h-[300px] bg-black rounded-xl overflow-hidden border-2 border-emerald-500/30 flex flex-col items-center justify-center">
                            {!scannerActive && !cameraLoading && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-50 space-y-4"><button onClick={startScanner} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold shadow-lg transition flex items-center gap-2 cursor-pointer relative z-50"><Camera size={18} /> Start Live Scanner</button><span className="text-[10px] text-zinc-500 uppercase tracking-widest">- OR -</span><button onClick={handleSystemCamera} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-full font-bold shadow-lg transition flex items-center gap-2 border border-zinc-600 cursor-pointer relative z-50"><ImageIcon size={18} /> Use System Camera</button></div>)}
                            {cameraLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>}
                            <div id="reader" className="w-full h-full"></div>
                            <style>{`#reader video { object-fit: cover; width: 100% !important; height: 100% !important; }`}</style>
                            {scannerActive && !cameraLoading && <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 z-10 shadow-[0_0_10px_rgba(239,68,68,0.8)] pointer-events-none"></div>}
                        </div>
                        <p className="text-center text-[10px] text-zinc-500 mt-4">{scannerActive ? "Align barcode with red line." : "Select a scanning method."}</p>
                        <button onClick={() => setShowScanner(false)} className="mt-4 px-6 py-2 rounded-full border border-zinc-700 text-zinc-400 text-xs font-bold hover:text-white transition cursor-pointer">Cancel</button>
                    </div>
                </div>, document.body
            )}

            {isFormOpen && (
                <div className="glass rounded-2xl p-6 border border-red-500/30 animation-fade-in relative mb-6">
                    <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={18} /></button>
                    <span className={sectionLabelClass}>{editingId ? 'EDIT PURCHASE' : 'ADD PURCHASE'}</span>
                    
                    {form.brand && !editingId && form.imageUrl && (
                        <div className="mb-4 text-[10px] text-emerald-400 flex items-center gap-1.5 bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-900/50 animate-in fade-in slide-in-from-top-2">
                            <Sparkles size={10} /> Product data retrieved from barcode scan.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className={labelClass}>Type</label><select className={inputClass} value={form.componentType} onChange={e => setForm({...form, componentType: e.target.value})}>{COMPONENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                            <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                            <div className="md:col-span-2"><label className={labelClass}>Vendor</label><input className={inputClass} value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} placeholder="e.g. Brownells" /></div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className={labelClass}>Brand</label><input className={inputClass} value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="e.g. CCI" /></div>
                            <div className="md:col-span-2"><label className={labelClass}>Product Name</label><input className={inputClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. #400 Small Rifle" /></div>
                            <div><label className={labelClass}>Lot #</label><input className={inputClass} value={form.lotId} onChange={e => setForm({...form, lotId: e.target.value})} placeholder="Batch Code" /><p className={helpClass} title="Manufacturing Lot ID found on box/jug."><Info size={10}/> On box sticker</p></div>
                        </div>

                        {/* DYNAMIC FIELDS: Hide irrelevant options */}
                        {(showCaliber || showCondition) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1">
                                {showCaliber && <div><label className={labelClass}>Caliber</label><input className={inputClass} value={form.caliber} onChange={e => setForm({...form, caliber: e.target.value})} placeholder="e.g. 9mm" /></div>}
                                <div className="md:col-span-2"><label className={labelClass}>Type Details</label><input className={inputClass} value={form.typeDetail} onChange={e => setForm({...form, typeDetail: e.target.value})} placeholder="e.g. Match, Magnum, Ball" /></div>
                                {showCondition && <div><label className={labelClass}>Condition</label><select className={inputClass} value={form.caseCondition} onChange={e => setForm({...form, caseCondition: e.target.value})}><option value="">N/A</option>{CASE_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>}
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-800 bg-black/20 p-3 rounded-xl">
                            <div><label className={labelClass}>{qtyLabel}</label><input type="number" step="0.01" className={inputClass} value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} placeholder="e.g. 1000" /></div>
                            <div><label className={labelClass}>Unit</label><select className={inputClass} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>{UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
                            <div><label className={labelClass}>Total Paid</label><input type="number" step="0.01" className={inputClass} value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" /><p className={helpClass}>Pre-tax price</p></div>
                            <div><label className={labelClass}>Tax/Ship</label><div className="flex gap-1"><input type="number" step="0.01" className={inputClass} placeholder="Ship" value={form.shipping} onChange={e => setForm({...form, shipping: e.target.value})} /><input type="number" step="0.01" className={inputClass} placeholder="Tax" value={form.tax} onChange={e => setForm({...form, tax: e.target.value})} /></div></div>
                            <div className="col-span-2 md:col-span-4 flex flex-col items-end mt-1">
                                <span className="text-[10px] text-zinc-400">Cost per Unit: <span className="text-zinc-200 font-mono">{formatMoney(liveUnitCost)}</span></span>
                                {liveSmartPrice.val !== liveUnitCost && (
                                    <span className="text-xs text-emerald-400 font-bold">{liveSmartPrice.label}: {formatMoney(liveSmartPrice.val)}</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/20 rounded-xl p-3 border border-zinc-800 flex flex-col justify-between"><label className={labelClass}>Reference Photo</label><div className="flex-1 flex flex-col justify-center"><UploadButton currentImageUrl={form.imageUrl} onUploadComplete={(url) => setForm(prev => ({ ...prev, imageUrl: url }))} /></div></div>
                            <div className="space-y-3">
                                <div><label className={labelClass}>Product URL</label><input className={inputClass} value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." /></div>
                                <div><label className={labelClass}>Notes</label><textarea className={inputClass + " h-20 resize-none"} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Performance notes, etc." /></div>
                                <div><label className={labelClass}>Status</label><select className={inputClass} value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="active">Active</option><option value="depleted">Depleted</option></select></div>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition">Cancel</button><button type="submit" disabled={loading} className="px-6 py-2 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition">{loading ? 'Saving...' : 'Save Record'}</button></div>
                    </form>
                </div>
            )}

            <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6 bg-black/40 p-2 rounded-xl border border-zinc-800"><Search size={16} className="text-zinc-500 ml-2" /><input className="bg-transparent border-none focus:outline-none text-xs text-zinc-200 w-full placeholder:text-zinc-600" placeholder="Search purchases..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <div className="space-y-8">
                    {COMPONENT_TYPES.map(type => {
                    const lots = lotsByType[type.value]
                    if (!lots || lots.length === 0) return null
                    return (
                        <div key={type.value}>
                        <h3 className="text-sm font-semibold text-zinc-200 mb-2 uppercase tracking-wider border-b border-zinc-800 pb-1 inline-block pr-4">{type.label}</h3>
                        <div className="grid md:grid-cols-2 gap-3">
                            {lots.map(p => {
                                const unitCost = calculatePerUnit(Number(p.price)||0, Number(p.shipping)||0, Number(p.tax)||0, Number(p.qty)||1)
                                const isHighlighted = String(highlightId) === String(p.id)
                                const depleted = p.status === 'depleted'
                                const attribution = p.updatedByUsername ? `Updated by ${p.updatedByUsername}` : p.createdByUsername ? `Added by ${p.createdByUsername}` : null
                                
                                // SMART DISPLAY LOGIC
                                const smartPrice = getSmartPrice(p.componentType, unitCost);
                                const isPowder = p.componentType === 'powder' && p.unit === 'lb';
                                const grainCost = isPowder ? (unitCost / 7000) : 0;

                                return (
                                    <div id={`purchase-${p.id}`} key={p.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-black/20 border transition ${isHighlighted ? 'border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-900/20' : 'border-zinc-800 hover:border-zinc-700'}`}>
                                        <div className="flex-1 flex gap-4">
                                            {p.imageUrl && (<div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-zinc-700 bg-black"><img src={p.imageUrl} alt="Lot" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition" /></div>)}
                                            <div>
                                                <div className="flex items-center gap-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${depleted ? 'bg-zinc-900 text-zinc-500 border-zinc-800' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>{p.componentType}</span><span className="text-xs text-zinc-500 font-mono">{p.lotId}</span></div>
                                                <h4 className="text-sm font-bold text-zinc-200 mt-1">{p.brand} {p.name}</h4>
                                                <div className="text-[11px] text-zinc-500 mt-1 flex flex-wrap gap-2">{p.caliber && <span className="text-zinc-400">{p.caliber}</span>}{p.typeDetail && <span className="text-zinc-400 italic">{p.typeDetail}</span>}{p.vendor && <span className="px-2 py-[1px] bg-black/40 border border-zinc-800 rounded-full">{p.vendor}</span>}{p.purchaseDate && <span className="px-2 py-[1px] bg-black/40 border border-zinc-800 rounded-full">{p.purchaseDate.substring(0,10)}</span>}{p.caseCondition && <span className="px-2 py-[1px] bg-black/40 border border-zinc-800 rounded-full">{CASE_CONDITIONS.find(c=>c.value===p.caseCondition)?.label || p.caseCondition}</span>}{p.url && <a href={p.url} target="_blank" rel="noreferrer" className="px-2 py-[1px] bg-black/40 border border-emerald-900/50 text-emerald-500 hover:text-emerald-300 hover:border-emerald-500/50 rounded-full transition">Page ↗</a>}</div>
                                                {attribution && (<div className="mt-2 flex items-center gap-2"><span className="flex items-center gap-1 text-[9px] text-zinc-500 px-2 py-0.5 bg-black/20 rounded-full border border-zinc-800">{p.updatedByUsername ? <Clock size={10}/> : <User size={10}/>} {attribution}</span></div>)}
                                            </div>
                                        </div>
                                        <div className="mt-3 md:mt-0 flex flex-wrap items-center justify-between md:justify-end gap-x-6 gap-y-4">
                                            <div className="text-left md:text-right flex flex-col justify-center">
                                                <span className="text-sm font-bold text-zinc-200 leading-none">{p.qty} <span className="text-xs font-normal text-zinc-500">{p.unit}</span></span>
                                                
                                                {/* SMART PRICE DISPLAY */}
                                                <span className="text-xs font-bold text-emerald-400 mt-1">
                                                    {formatMoney(smartPrice.val)} 
                                                    <span className="text-[10px] font-normal text-emerald-600/80"> / {smartPrice.label.split(' / ')[1]}</span>
                                                </span>
                                                
                                                {/* POWDER GRAIN COST */}
                                                {isPowder && (<span className="block text-[9px] text-zinc-500 mt-0.5 font-mono">(${grainCost.toFixed(4)}/gr)</span>)}
                                            </div>
                                            <div className="flex flex-col items-end gap-2 min-w-[70px]">{canEdit && (<><button onClick={() => handleEdit(p)} className="px-3 py-1 rounded-full bg-black/60 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center"><Edit size={12} /> Edit</button><button onClick={() => promptDelete(p)} className="px-3 py-1 rounded-full bg-black/60 border border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center"><Trash2 size={12} /> Remove</button></>)}<button onClick={() => { HAPTIC.click(); printPurchaseLabel(p); }} className="px-3 py-1 rounded-full bg-black/60 border border-emerald-900/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center"><Printer size={12} /> Label</button></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        </div>
                    )
                    })}
                </div>
            </div>
          </>
      )}
      
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
            <div className="bg-[#0f0f10] border border-red-900/50 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto"><Trash2 className="text-red-500" size={24} /></div>
                <div><h3 className="text-lg font-bold text-white">Delete Lot?</h3><p className="text-sm text-zinc-400 mt-1">Are you sure you want to delete <span className="text-white font-medium">{itemToDelete.brand} {itemToDelete.name}</span>?<br/>This action cannot be undone.</p></div>
                <div className="grid grid-cols-2 gap-3 pt-2"><button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium text-sm transition">Cancel</button><button onClick={executeDelete} disabled={isDeleting} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 font-bold text-sm shadow-lg shadow-red-900/20 transition">{isDeleting ? 'Deleting...' : 'Delete Forever'}</button></div>
            </div>
        </div>
      )}
    </div>
  )
}
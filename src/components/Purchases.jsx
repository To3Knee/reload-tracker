//===============================================================
//Script Name: Purchases.jsx
//Script Location: src/components/Purchases.jsx
//Date: 12/23/2025
//Created By: T03KNEE
//Version: 30.0.0 (Snake_Case Payload Fix)
//About: Manage component LOT purchases.
//       - CRITICAL FIX: Mapped payload keys to snake_case (e.g., lot_id) to match DB schema.
//                       Sending camelCase (lotId) likely caused "Column cannot be null" errors.
//       - LOGIC: Retains all previous scanner fixes (Auto-Gen ID, 5-Pass Scan).
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
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

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

export function Purchases({ onChanged, canEdit = false, highlightId, user }) {
  const [activeSubTab, setActiveSubTab] = useState('inventory') 
  const [purchases, setPurchases] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState(null)
  const [scanStatus, setScanStatus] = useState('') 
  
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

  // CLEANUP
  useEffect(() => {
      return () => {
          if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
              html5QrCodeRef.current.stop().catch(err => console.warn("Scanner stop error", err));
              html5QrCodeRef.current.clear();
          }
      }
  }, [])

  async function checkScannerConfig() {
      try {
          const settings = await fetchSettings();
          const isEnabled = String(settings.barcode_enabled).toLowerCase().trim() === 'true';
          setScannerEnabled(isEnabled);
      } catch (e) {
          setScannerEnabled(false);
      }
  }

  // --- LIVE SCANNER (VIDEO) ---
  const startScanner = async () => {
      try {
          if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) return;

          setCameraLoading(true);
          setError(null);

          const scannerId = "reader";
          setTimeout(async () => {
            if (!document.getElementById(scannerId)) return;

            const html5QrCode = new Html5Qrcode(scannerId);
            html5QrCodeRef.current = html5QrCode;

            const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
            
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config,
                (decodedText) => {
                    HAPTIC.success();
                    stopScanner();
                    setShowScanner(false);
                    fetchProductData(decodedText);
                },
                (errorMessage) => { /* Ignore frame errors */ }
            );
            setScannerActive(true);
            setCameraLoading(false);
          }, 100);

      } catch (err) {
          console.error("Camera Start Failed:", err);
          setCameraLoading(false);
          setScannerActive(false);
          setError("Camera failed. Please check permissions or use 'Photo File'.");
      }
  };

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
      }
  };

  const handleSystemCamera = () => { 
      stopScanner();
      fileInputRef.current?.click(); 
  }

  // --- HELPER: ROBUST IMAGE PROCESSOR ---
  const processImageFile = (file, options = {}) => {
      const { rotation = 0, contrastStretch = false, invert = false, resizeTo = 1200, padding = 100 } = options;

      return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
              let width = img.width;
              let height = img.height;
              
              const maxDim = Math.max(width, height);
              if (resizeTo > 0) {
                  if (maxDim > resizeTo) {
                      const scale = resizeTo / maxDim;
                      width *= scale;
                      height *= scale;
                  } else if (maxDim < 600) {
                      const scale = 1000 / maxDim; 
                      width *= scale;
                      height *= scale;
                  }
              }

              const canvas = document.createElement('canvas');
              let finalW = width + (padding * 2);
              let finalH = height + (padding * 2);
              
              if (rotation === 90 || rotation === 270) {
                  canvas.width = finalH;
                  canvas.height = finalW;
              } else {
                  canvas.width = finalW;
                  canvas.height = finalH;
              }
              
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((rotation * Math.PI) / 180);
              ctx.drawImage(img, -width / 2, -height / 2, width, height);
              ctx.restore();

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              
              let min = 255, max = 0;
              if (contrastStretch) {
                  for (let i = 0; i < data.length; i += 4) {
                      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                      if (gray < min) min = gray;
                      if (gray > max) max = gray;
                  }
              }

              for (let i = 0; i < data.length; i += 4) {
                  let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                  if (contrastStretch && max > min) gray = ((gray - min) / (max - min)) * 255;
                  if (invert) gray = 255 - gray;
                  data[i] = gray;     
                  data[i + 1] = gray; 
                  data[i + 2] = gray; 
              }
              ctx.putImageData(imageData, 0, 0);

              canvas.toBlob((blob) => {
                  if (blob) resolve(new File([blob], "scan.png", { type: "image/png" }));
                  else reject(new Error("Processing failed"));
              }, 'image/png');
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
      });
  };

  // --- FILE SCAN HANDLER ---
  const handleFileScan = async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const originalFile = e.target.files[0];
      setLoading(true); 
      setError(null);
      setShowScanner(false); // Close modal
      setScanStatus("Scanning...");

      let foundCode = null;
      let html5QrCode = null;

      const formats = [
          Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.RSS_14
      ];

      const attemptScan = async (fileToScan, useRendered, config) => {
          try {
              if (html5QrCode) { try { await html5QrCode.clear(); } catch(e) {} }
              html5QrCode = new Html5Qrcode("reader-hidden", config);
              return await html5QrCode.scanFileV2(fileToScan, useRendered);
          } catch (err) { return null; }
      };

      try {
          // PASS 1: NATIVE
          foundCode = await attemptScan(originalFile, true, { experimentalFeatures: { useBarCodeDetectorIfSupported: true }, formatsToSupport: formats, verbose: false });

          // PASS 2: RAW
          if (!foundCode) {
              setScanStatus("Deep Scan...");
              foundCode = await attemptScan(originalFile, false, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false });
          }

          // PASS 3: PROCESSED
          if (!foundCode) {
              setScanStatus("Enhancing...");
              const p3 = await processImageFile(originalFile, { padding: 80 });
              foundCode = await attemptScan(p3, true, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false });
          }

          // PASS 4: ROTATED
          if (!foundCode) {
              setScanStatus("Rotating...");
              const p4 = await processImageFile(originalFile, { rotation: 90, padding: 80 });
              foundCode = await attemptScan(p4, true, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false });
          }

          // PASS 5: GLARE FIX
          if (!foundCode) {
              setScanStatus("De-glaring...");
              const p5 = await processImageFile(originalFile, { contrastStretch: true, padding: 80 });
              foundCode = await attemptScan(p5, true, { experimentalFeatures: { useBarCodeDetectorIfSupported: false }, formatsToSupport: formats, verbose: false });
          }

          if (foundCode) {
              HAPTIC.success();
              fetchProductData(foundCode);
          } else {
              throw new Error("NotFound");
          }

      } catch (err) {
          console.error("All scans failed");
          setError("No barcode detected. Please try 'Live Camera' mode for better results.");
          HAPTIC.error();
      } finally {
          if (html5QrCode) { try { await html5QrCode.clear(); } catch(e) {} }
          setLoading(false);
          setScanStatus("");
          e.target.value = ''; 
      }
  }

  async function fetchProductData(code) {
      setLoading(true);
      setError(null);
      setScanStatus("Searching...");
      if (!isFormOpen) handleAddNew();
      try {
          const res = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ code })
          });
          
          const autoLotId = `SCAN-${Date.now().toString().slice(-6)}`; 

          if (res.status === 404) {
              setForm(prev => ({ ...prev, lotId: autoLotId }));
              throw new Error("Product not found. Enter details manually.");
          }
          if (res.status === 401) throw new Error("Scanner config error.");
          if (!res.ok) throw new Error("Lookup failed.");

          const json = await res.json();
          const data = json.data;

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
              unit: type === 'powder' ? 'lb' : type === 'primer' ? 'each' : 'each',
              notes: data.description ? data.description.substring(0, 150) + "..." : "",
              lotId: autoLotId 
          }));
          
          HAPTIC.success();
      } catch (err) {
          setError(err.message);
          HAPTIC.error();
      } finally {
          setLoading(false);
          setScanStatus("");
      }
  }

  async function loadData() { try { const data = await getAllPurchases(); setPurchases(data); if (onChanged) onChanged(); } catch (err) { console.error("Failed to load purchases", err); setError("Failed to sync inventory data."); } }
  
  function handleAddNew() { 
      setEditingId(null); 
      const autoId = `LOT-${Date.now().toString().slice(-6)}`;
      setForm({ ...DEFAULT_FORM, lotId: autoId }); 
      setError(null); 
      setIsFormOpen(true); 
      HAPTIC.click(); 
  }

  function handleEdit(item) { setEditingId(item.id); setForm({ componentType: item.componentType || 'powder', date: item.purchaseDate ? item.purchaseDate.substring(0, 10) : getLocalDate(), vendor: item.vendor || '', brand: item.brand || '', name: item.name || '', typeDetail: item.typeDetail || '', lotId: item.lotId || '', qty: item.qty != null ? String(item.qty) : '', unit: item.unit || '', price: item.price != null ? String(item.price) : '', shipping: item.shipping != null ? String(item.shipping) : '', tax: item.tax != null ? String(item.tax) : '', notes: item.notes || '', status: item.status || 'active', url: item.url || '', imageUrl: item.imageUrl || '', caseCondition: item.caseCondition || '' }); setError(null); setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); HAPTIC.click(); }
  function promptDelete(item) { if (!canEdit) return; setItemToDelete(item); setDeleteModalOpen(true); HAPTIC.click(); }
  async function executeDelete() { if (!itemToDelete) return; setIsDeleting(true); try { await deletePurchase(itemToDelete.id); HAPTIC.success(); loadData(); setDeleteModalOpen(false); setItemToDelete(null); } catch (err) { setError(`Failed to delete: ${err.message}`); HAPTIC.error(); setDeleteModalOpen(false); } finally { setIsDeleting(false); } }
  
  // --- SUBMIT HANDLER: SNAKE_CASE PAYLOAD (DB Schema Match) ---
  async function handleSubmit(e) { 
      e.preventDefault(); 
      setLoading(true); 
      setError(null); 
      
      try { 
          // 1. Sanitize Date
          const dateObj = new Date(form.date);
          const validDate = !isNaN(dateObj.getTime()) ? form.date : new Date().toISOString().split('T')[0];

          // 2. Ensure Lot ID
          let finalLotId = String(form.lotId || '').trim();
          if (!finalLotId) {
              finalLotId = `AUTO-${Date.now()}`; 
          }

          // 3. Construct Payload with SNAKE_CASE keys
          // This matches the database schema column names exactly.
          const payload = { 
              ...(editingId && { id: editingId }),
              
              lot_id: finalLotId,
              component_type: String(form.componentType || 'powder'),
              case_condition: String(form.caseCondition || ''),
              caliber: String(form.caliber || '').trim(),
              brand: String(form.brand || '').trim(),
              name: String(form.name || '').trim(),
              type_detail: String(form.typeDetail || '').trim(),
              
              qty: parseFloat(form.qty) || 0, 
              unit: String(form.unit || 'lb'),
              
              price: parseFloat(form.price) || 0, 
              shipping: parseFloat(form.shipping) || 0, 
              tax: parseFloat(form.tax) || 0, 
              
              vendor: String(form.vendor || '').trim(),
              purchase_date: validDate,
              
              url: String(form.url || ''),
              image_url: String(form.imageUrl || ''),
              status: String(form.status || 'active'),
              notes: String(form.notes || '')
          }; 
          
          console.log("Submitting Payload (Snake Case):", payload); 

          await addPurchase(payload); 
          HAPTIC.success(); 
          setIsFormOpen(false); 
          loadData(); 
      } catch (err) { 
          console.error("Save Error:", err);
          const msg = err.body ? JSON.stringify(err.body) : err.message;
          if (msg.includes("unique constraint") || msg.includes("lot_id")) {
             setError("Error: This Lot ID already exists.");
          } else {
             setError(`Failed to save: ${msg}`); 
          }
          HAPTIC.error(); 
      } finally { 
          setLoading(false); 
      } 
  }

  const safeFloat = (val) => { const num = parseFloat(val); return isNaN(num) ? 0 : num; }
  const liveUnitCost = calculatePerUnit(safeFloat(form.price), safeFloat(form.shipping), safeFloat(form.tax), safeFloat(form.qty));
  
  const filteredPurchases = purchases.filter(p => { const term = searchTerm.toLowerCase(); return `${p.brand} ${p.name} ${p.lotId} ${p.vendor} ${p.componentType}`.toLowerCase().includes(term) })
  const lotsByType = useMemo(() => { const groups = { powder: [], bullet: [], primer: [], case: [], other: [] }; for (const p of filteredPurchases) { const type = groups[p.componentType] ? p.componentType : 'other'; groups[type].push(p); } return groups; }, [filteredPurchases])

  const inputClass = "w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-semibold text-zinc-400 mb-1"
  const helpClass = "text-[9px] text-zinc-600 mt-0.5 italic flex items-center gap-1"
  const sectionLabelClass = "text-xs uppercase tracking-[0.25em] text-zinc-500 mb-4 block"
  const tabBtnClass = (active) => `pb-2 px-1 text-xs font-bold uppercase tracking-wider transition border-b-2 ${active ? 'border-red-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`

  const getSmartPrice = (type, unitCost) => {
      if (type === 'primer') return { label: 'Cost / 1k', val: unitCost * 1000 };
      if (type === 'bullet' || type === 'case') return { label: 'Cost / 100', val: unitCost * 100 };
      return { label: 'Cost / Unit', val: unitCost };
  }

  const liveSmartPrice = getSmartPrice(form.componentType, liveUnitCost);

  return (
    <div className="space-y-6">
      {/* HIDDEN READER (Invisible but Renderable) */}
      <div id="reader-hidden" className="fixed top-0 left-0 w-px h-px opacity-0 overflow-hidden pointer-events-none"></div>
      
      {/* FILE INPUT (System Camera Trigger) */}
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileScan} />

      {/* HEADER */}
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div><span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Supply Chain</span><h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">PURCHASES</h2></div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-end justify-between border-b border-zinc-800 gap-4">
          <div className="flex gap-6">
            <button onClick={() => setActiveSubTab('inventory')} className={tabBtnClass(activeSubTab === 'inventory')}><Package size={14} className="inline mr-2 mb-0.5"/>Inventory</button>
            <button onClick={() => setActiveSubTab('supply')} className={tabBtnClass(activeSubTab === 'supply')}><Globe size={14} className="inline mr-2 mb-0.5"/>Market Watch</button>
          </div>
          {activeSubTab === 'inventory' && canEdit && !isFormOpen && (
              <div className="flex gap-2 mb-2">
                  {scannerEnabled && canEdit && (
                    <button onClick={() => { setShowScanner(true); HAPTIC.click(); }} className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-emerald-500/50 hover:text-white transition flex items-center gap-2">
                      <ScanBarcode size={14} /> Scan Barcode
                    </button>
                  )}
                  <button onClick={handleAddNew} className="px-4 py-1.5 rounded-full bg-red-700 border border-red-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition flex items-center gap-2"><Plus size={12} /> New Lot</button>
              </div>
          )}
      </div>

      {activeSubTab === 'supply' ? ( <Market user={user} /> ) : (
          <>
            {error && (<div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2"><AlertTriangle className="text-red-500 flex-shrink-0" size={20} /><div className="flex-1"><p className="text-xs font-bold text-red-400">System Notification</p><p className="text-xs text-red-200/80">{error}</p></div><button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16}/></button></div>)}
            
            {loading && scanStatus && (
               <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 animate-in fade-in">
                   <Loader2 size={16} className="text-red-500 animate-spin" />
                   <span className="text-xs text-zinc-300 font-mono">{scanStatus}</span>
               </div>
            )}

            {/* UNIFIED SCANNER MODAL */}
            {showScanner && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0f0f10] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden p-6 relative flex flex-col items-center shadow-2xl">
                        <button onClick={() => { stopScanner(); setShowScanner(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-black/50 p-2 rounded-full z-20 cursor-pointer"><X size={20} /></button>
                        <h3 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2"><ScanBarcode className="text-emerald-500" /> Scanner</h3>
                        
                        <div className="relative w-full h-[300px] bg-black rounded-xl overflow-hidden border-2 border-emerald-500/30 flex flex-col items-center justify-center group">
                            {/* OVERLAY UI */}
                            {!scannerActive && !cameraLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-50 space-y-4 animate-in fade-in">
                                    <button onClick={startScanner} className="w-48 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer relative z-50">
                                        <Camera size={18} /> Live Camera
                                    </button>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">- OR -</span>
                                    <button onClick={handleSystemCamera} className="w-48 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer relative z-50">
                                        <ImageIcon size={18} /> Photo / File
                                    </button>
                                </div>
                            )}
                            
                            {/* LOADING SPINNER */}
                            {cameraLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40">
                                    <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} />
                                    <span className="text-xs text-zinc-400">Starting Camera...</span>
                                </div>
                            )}

                            {/* LIVE READER ELEMENT */}
                            <div id="reader" className="w-full h-full"></div>
                            
                            {/* SCANNING LINE ANIMATION */}
                            {scannerActive && !cameraLoading && (
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500/80 z-10 shadow-[0_0_15px_rgba(239,68,68,1)] animate-[scan_2s_infinite]"></div>
                            )}
                            <style>{`
                                @keyframes scan { 0% { top: 10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 90%; opacity: 0; } }
                                #reader video { object-fit: cover; width: 100% !important; height: 100% !important; }
                            `}</style>
                        </div>

                        <p className="text-center text-[10px] text-zinc-500 mt-4 h-4">
                            {scannerActive ? "Point camera at barcode." : "Choose scanning method."}
                        </p>
                    </div>
                </div>, 
                document.body
            )}

            {/* FORM AND INVENTORY LIST */}
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
                                                <span className="text-xs font-bold text-emerald-400 mt-1">
                                                    {formatMoney(smartPrice.val)} 
                                                    <span className="text-[10px] font-normal text-emerald-600/80"> / {smartPrice.label.split(' / ')[1]}</span>
                                                </span>
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
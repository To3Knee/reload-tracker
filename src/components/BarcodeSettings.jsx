//===============================================================
//Script Name: BarcodeSettings.jsx
//Script Location: src/components/BarcodeSettings.jsx
//Date: 12/13/2025
//Created By: T03KNEE
//Version: 2.3.0 (UI Polish)
//About: Admin settings for Barcode Provider configuration.
//       - FIX: Changed Toggle to a Visual Switch for clarity.
//===============================================================

import { useState, useEffect } from 'react'
import { Save, ScanBarcode, Zap, ChevronDown, Key, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'

export function BarcodeSettings({ settings, onSave }) {
    const [enabled, setEnabled] = useState(false)
    const [provider, setProvider] = useState('go-upc')
    const [apiKey, setApiKey] = useState('')
    const [customUrl, setCustomUrl] = useState('')
    
    const [showApiKey, setShowApiKey] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        if (settings) {
            setEnabled(String(settings.barcode_enabled) === 'true')
            setProvider(settings.barcode_provider || 'go-upc')
            setApiKey(settings.barcode_api_key || '')
            setCustomUrl(settings.barcode_custom_url || '')
        }
    }, [settings])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        HAPTIC.click()
        
        const updates = {
            barcode_enabled: String(enabled),
            barcode_provider: provider,
            barcode_api_key: apiKey,
            barcode_custom_url: customUrl
        }

        try {
            await onSave(updates)
            setMessage({ type: 'success', text: 'Saved. Reloading...' })
            HAPTIC.success()
            setTimeout(() => { window.location.reload() }, 1000)
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to save.' })
            HAPTIC.error()
            setSaving(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        setMessage(null)
        HAPTIC.click()

        try {
            const TEST_UPC = "039288771234"; 
            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code: TEST_UPC })
            });

            if (res.status === 401) throw new Error("Unauthorized: Invalid API Key.");
            if (res.status === 404) {
                setMessage({ type: 'success', text: `Connected! Service Active (Test Item Not Found)` });
                HAPTIC.success();
                return;
            }
            if (!res.ok) throw new Error(`Provider Error: ${res.statusText}`);

            const json = await res.json();
            if (json.success) {
                setMessage({ type: 'success', text: `Success! Found: ${json.data.brand} ${json.data.name}` });
                HAPTIC.success();
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || "Connection failed." });
            HAPTIC.error();
        } finally {
            setTesting(false)
        }
    }

    const inputClass = "w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-zinc-600"
    const labelClass = "block text-xs font-semibold text-zinc-400 mb-1"
    const subLabelClass = "text-[10px] text-zinc-600 font-normal ml-2 italic tracking-normal"

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/60">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4">
                    <ScanBarcode size={16} className="text-red-500" />
                    Scanner Configuration
                </h3>

                {/* STATUS CARD */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-black/20 border border-zinc-800 rounded-lg mb-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-500 mt-1">
                            <ScanBarcode size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-zinc-200">Barcode Lookup Service</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                                Enable UPC scanning for instant inventory data entry.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end">
                        {/* TOGGLE SWITCH UI */}
                        <button 
                            onClick={() => setEnabled(!enabled)}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out border ${enabled ? 'bg-emerald-900/50 border-emerald-500/50' : 'bg-zinc-800 border-zinc-700'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6 bg-emerald-400' : 'translate-x-0.5 bg-zinc-500'}`} />
                        </button>
                        <span className={`ml-3 text-[10px] font-bold uppercase tracking-wider ${enabled ? 'text-emerald-400' : 'text-zinc-600'}`}>
                            {enabled ? 'Active' : 'Off'}
                        </span>
                    </div>
                </div>

                {/* CONFIG FORM */}
                <div className={`p-4 bg-black/20 border border-zinc-800 rounded-lg space-y-4 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div>
                        <label className={labelClass}>Provider <span className={subLabelClass}>(Service API)</span></label>
                        <div className="relative">
                            <select className={`${inputClass} appearance-none`} value={provider} onChange={(e) => setProvider(e.target.value)}>
                                <option value="go-upc">Go-UPC (Recommended)</option>
                                <option value="barcodelookup">Barcode Lookup</option>
                                <option value="upcitemdb">UPCitemdb</option>
                                <option value="custom">Custom Endpoint</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><ChevronDown size={14} /></div>
                        </div>
                    </div>

                    {provider !== 'custom' && (
                        <div>
                            <label className={labelClass}>API Key <span className={subLabelClass}>(Provided by service)</span></label>
                            <div className="relative">
                                <input type={showApiKey ? "text" : "password"} className={`${inputClass} pr-10`} placeholder="sk_live_..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition z-10">{showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            </div>
                        </div>
                    )}

                    {provider === 'custom' && (
                        <div>
                            <label className={labelClass}>Custom URL Template</label>
                            <input className={inputClass} value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://api.myserver.com/lookup?code={code}" />
                            <p className="text-[9px] text-zinc-600 mt-1">Use <span className="font-mono text-zinc-400">{'{code}'}</span> as placeholder.</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                        <div className="flex-1 mr-4">
                            {message && <span className={`text-[10px] font-medium ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</span>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleTest} disabled={saving || testing || !enabled} className="rt-btn rt-btn-ghost disabled:opacity-50"><Zap size={12}/> {testing ? 'Testing...' : 'Test'}</button>
                            <button onClick={handleSave} disabled={saving} className="rt-btn rt-btn-secondary disabled:opacity-50"><Save size={12}/> {saving ? 'Saving...' : 'Save Config'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
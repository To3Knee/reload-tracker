//===============================================================
//Script Name: ScannerModal.jsx
//Script Location: src/components/ScannerModal.jsx
//Date: 12/23/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Bulletproof Mobile Barcode Scanner.
//       - FIX: Handles React Strict Mode (prevents "Camera Busy" flashing).
//       - FIX: Proper cleanup on close.
//===============================================================

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, AlertTriangle, Loader2 } from 'lucide-react'

export function ScannerModal({ isOpen, onClose, onScan }) {
    const [error, setError] = useState(null)
    const [initializing, setInitializing] = useState(true)
    const scannerRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return

        // 1. SETUP: Unique ID for the scanner element
        const elementId = "html5-qrcode-reader"
        let scanner = null

        // 2. INIT FUNCTION
        const startScanner = async () => {
            try {
                setInitializing(true)
                setError(null)

                // Give the DOM a moment to paint the div
                await new Promise(r => setTimeout(r, 100))

                scanner = new Html5Qrcode(elementId)
                scannerRef.current = scanner

                await scanner.start(
                    { facingMode: "environment" }, // Rear camera
                    { 
                        fps: 10, 
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        // SUCCESS: Pause immediately to prevent duplicate reads
                        if (scanner) {
                            scanner.pause(true) 
                        }
                        onScan(decodedText)
                        onClose()
                    },
                    (errorMessage) => {
                        // Ignore frame-by-frame errors (scanning...)
                    }
                )
                setInitializing(false)
            } catch (err) {
                console.error("Scanner Error:", err)
                setInitializing(false)
                // Only show error if it's not a "stop()" interruption
                if (isOpen) {
                    setError("Camera access failed. Please ensure permissions are granted.")
                }
            }
        }

        startScanner()

        // 3. CLEANUP: This runs when you close the modal
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current.clear()
                }).catch(err => {
                    console.warn("Failed to stop scanner", err)
                })
            }
        }
    }, [isOpen, onScan, onClose])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-steel-800 rounded-2xl overflow-hidden border border-steel-700 shadow-2xl relative">
                
                {/* HEADER */}
                <div className="p-4 flex items-center justify-between border-b border-steel-700 bg-black/40">
                    <h3 className="text-sm font-bold text-steel-100 flex items-center gap-2">
                        <Camera size={16} className="text-red-500"/> Scan Barcode
                    </h3>
                    <button onClick={onClose} className="p-2 bg-steel-700 rounded-full text-steel-300 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                {/* CAMERA VIEWPORT */}
                <div className="relative bg-black h-[350px] flex items-center justify-center overflow-hidden">
                    {/* The Library Hooks into this DIV */}
                    <div id="html5-qrcode-reader" className="w-full h-full"></div>

                    {/* OVERLAYS */}
                    {initializing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
                            <Loader2 className="animate-spin text-red-500 mb-2" size={32} />
                            <p className="text-xs text-steel-400">Starting Camera...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-steel-800/90 z-30 p-6 text-center">
                            <AlertTriangle className="text-amber-500 mb-2" size={32} />
                            <p className="text-sm text-steel-100 font-bold mb-1">Scanner Error</p>
                            <p className="text-xs text-steel-400">{error}</p>
                            <button onClick={onClose} className="mt-4 px-4 py-2 bg-steel-700 rounded-lg text-xs font-bold text-steel-200">Close</button>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-steel-800 text-center">
                    <p className="text-[10px] text-steel-400">
                        Point camera at a UPC or Component Label
                    </p>
                </div>
            </div>
        </div>,
        document.body
    )
}
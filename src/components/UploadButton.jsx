//===============================================================
//Script Name: UploadButton.jsx
//Script Location: src/components/UploadButton.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.0.0
//About: UI Component for Camera Capture & Cloudinary Upload.
//       States: Idle -> Uploading (Progress) -> Preview
//===============================================================

import { useState, useRef } from 'react'
import { Camera, UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { uploadImage } from '../lib/cloudinary'

export default function UploadButton({ onUploadComplete, currentImageUrl }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  
  // Hidden input ref to trigger file dialog programmatically
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Reset state
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Perform Upload
      const url = await uploadImage(file, (percent) => {
        setProgress(percent)
      })

      // Success: Pass URL back to parent form
      if (onUploadComplete) {
        onUploadComplete(url)
      }
    } catch (err) {
      console.error(err)
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
      // Reset input so user can re-upload same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = (e) => {
    e.stopPropagation() // Prevent triggering upload click
    e.preventDefault()
    if (onUploadComplete) {
      onUploadComplete('') // Clear URL in parent
    }
  }

  // --- STATE 1: IMAGE EXISTS (PREVIEW MODE) ---
  if (currentImageUrl) {
    return (
      <div className="relative group w-full h-32 bg-black/40 rounded-xl border border-steel-600/50 overflow-hidden flex items-center justify-center">
        {/* Background Blur Image */}
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-50 blur-sm"
            style={{ backgroundImage: `url(${currentImageUrl})` }} 
        />
        
        {/* Crisp Foreground Image */}
        <img 
          src={currentImageUrl} 
          alt="Target Preview" 
          className="relative h-full w-auto object-contain z-10"
        />

        {/* Remove Button (Hover) */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
          <button
            onClick={handleRemove}
            className="rt-btn rt-btn-danger"
          >
            <X size={14} /> Remove Photo
          </button>
        </div>
      </div>
    )
  }

  // --- STATE 2: UPLOADING (PROGRESS BAR) ---
  if (uploading) {
    return (
      <div className="w-full h-12 bg-black/40 rounded-xl border border-steel-600/50 flex items-center px-4 gap-3 relative overflow-hidden">
        {/* Progress Fill */}
        <div 
          className="absolute left-0 top-0 bottom-0 bg-emerald-900/30 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
        
        <Loader2 className="animate-spin text-emerald-400 z-10" size={18} />
        <div className="flex-1 z-10 flex justify-between items-center text-xs">
          <span className="text-emerald-300 font-medium">Uploading target...</span>
          <span className="text-steel-400">{progress}%</span>
        </div>
      </div>
    )
  }

  // --- STATE 3: IDLE (CAMERA BUTTON) ---
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment" // Forces rear camera on mobile
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <div className="flex gap-2">
        {/* Main Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 h-12 bg-black/40 hover:bg-steel-800/60 border border-steel-600/70 hover:border-emerald-500/50 border-dashed rounded-xl flex items-center justify-center gap-2 text-steel-400 hover:text-emerald-400 transition group"
        >
          <Camera size={18} className="group-hover:scale-110 transition" />
          <span className="text-xs font-semibold">Snap Photo / Upload</span>
        </button>

        {/* Optional: Error Message Display */}
        {error && (
            <div className="absolute mt-14 text-[10px] text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/50">
                {error}
            </div>
        )}
      </div>
    </div>
  )
}
//===============================================================
//Script Name: ErrorBoundary.jsx
//Script Location: src/components/ErrorBoundary.jsx
//Date: 02/25/2026
//Created By: T03KNEE
//Version: 1.0.0
//About: React Error Boundary. Catches uncaught component errors
//       so the whole app doesn't go blank. Shows a reload prompt.
//===============================================================

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Reload Tracker] Uncaught component error:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100dvh] bg-black text-gray-100 flex items-center justify-center p-8">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wide mb-2">System Fault</h2>
              <p className="text-sm text-steel-300">An unexpected error occurred. Your data is safe.</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl transition active:scale-95"
            >
              <RefreshCw size={16} />
              Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

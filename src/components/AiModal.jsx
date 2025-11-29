//===============================================================
//Script Name: AiModal.jsx
//Script Location: src/components/AiModal.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 2.2.0
//About: Chat interface for the AI Ballistics Expert.
//       Updated: Now supports multi-turn conversation memory.
//===============================================================

import { useState, useEffect, useRef } from 'react'
import { X, Bot, Send, AlertTriangle } from 'lucide-react'
import { askBallisticsExpert } from '../lib/ai'

export default function AiModal({ open, onClose }) {
  const [query, setQuery] = useState('')
  // Updated intro text to be shorter
  const [history, setHistory] = useState([{ role: 'ai', text: 'Ballistics Expert online. Ready for data.' }])
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  if (!open) return null

  async function handleSend(e) {
    e.preventDefault()
    if (!query.trim()) return

    const userMsg = { role: 'user', text: query }
    
    // Create the new history state immediately so we can pass it to the API
    const newHistory = [...history, userMsg]
    
    setHistory(newHistory)
    setQuery('')
    setLoading(true)

    try {
      // Pass the ENTIRE conversation so it remembers context
      const answer = await askBallisticsExpert(newHistory)
      setHistory(prev => [...prev, { role: 'ai', text: answer }])
    } catch (err) {
      setHistory(prev => [...prev, { role: 'error', text: 'Error: ' + err.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0f0f10] border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[600px]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-2">
            <Bot className="text-emerald-400" size={20} />
            <div>
              <h3 className="text-sm font-bold text-slate-200">Ballistics Expert</h3>
              <p className="text-[10px] text-slate-500">Powered by Google Gemini • Verify all data</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* UPDATED CLASS: whitespace-pre-wrap preserves line breaks and lists */}
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-slate-200 rounded-tr-none' 
                  : msg.role === 'error' 
                    ? 'bg-red-900/20 text-red-300 border border-red-900/50'
                    : 'bg-emerald-900/10 text-emerald-100 border border-emerald-900/30 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-emerald-900/10 rounded-2xl px-4 py-2 text-xs text-emerald-400 animate-pulse">Analyzing...</div></div>}
          <div ref={endRef} />
        </div>

        {/* Disclaimer */}
        <div className="px-4 py-2 bg-amber-900/10 border-t border-amber-900/20 flex items-center gap-2 text-[10px] text-amber-500/80">
          <AlertTriangle size={12} />
          <span>Always cross-reference load data with published manuals.</span>
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-black/40">
          <div className="relative">
            <input
              className="w-full bg-[#1a1a1a] border border-slate-700 rounded-full pl-4 pr-12 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 transition placeholder:text-slate-600"
              placeholder="Ask about load data, conversions, or theory..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
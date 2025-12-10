//===============================================================
//Script Name: AiModal.jsx
//Script Location: src/components/AiModal.jsx
//Date: 12/09/2025
//Created By: T03KNEE
//Version: 2.0.0
//About: Floating AI Ballistics Assistant.
//       - FIX: Restored correct code (was overwritten by AuthModal).
//===============================================================

import { useState, useEffect, useRef } from 'react'
import { X, Send, Bot, User, Trash2, StopCircle, RefreshCw } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'

export default function AiModal({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'BallisticsOS Online. Ready for queries.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) scrollToBottom()
  }, [open, messages])

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    HAPTIC.click()

    try {
      // Send context if needed, or just the prompt
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: input,
            history: messages.filter(m => m.role !== 'system') // Send recent history
        })
      })

      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || "AI Core Failure")

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      HAPTIC.success()
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.message}` }])
      HAPTIC.error()
    } finally {
      setLoading(false)
    }
  }

  function clearHistory() {
      if(!confirm("Clear chat history?")) return
      setMessages([{ role: 'system', content: 'Memory Purged. Systems Nominal.' }])
      HAPTIC.soft()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)]">
      <div className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-lg h-[80vh] max-h-[800px] rounded-2xl flex flex-col shadow-2xl relative overflow-hidden ring-1 ring-white/10">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0f0f10]">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-900/20 rounded-lg border border-emerald-500/20 text-emerald-400">
                    <Bot size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Ballistics Expert</h3>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> Online
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={clearHistory} className="p-2 text-zinc-600 hover:text-red-400 transition" title="Clear History"><Trash2 size={16}/></button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition"><X size={20}/></button>
            </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/50">
            {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed ${
                        m.role === 'user' 
                        ? 'bg-zinc-800 text-white rounded-br-none border border-zinc-700' 
                        : m.role === 'system'
                        ? 'bg-red-900/10 text-red-400 border border-red-900/30 text-center w-full my-2'
                        : 'bg-zinc-900/80 text-zinc-300 rounded-bl-none border border-zinc-800/50'
                    }`}>
                        {m.content}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex justify-start">
                    <div className="bg-zinc-900/50 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2 border border-zinc-800">
                        <RefreshCw size={14} className="animate-spin text-emerald-500"/>
                        <span className="text-xs text-zinc-500 animate-pulse">Computing...</span>
                    </div>
                </div>
            )}
            <div ref={bottomRef} />
        </div>

        {/* INPUT AREA */}
        <form onSubmit={handleSend} className="p-4 bg-[#0f0f10] border-t border-zinc-800">
            <div className="flex gap-2">
                <input 
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-zinc-600"
                    placeholder="Ask about burn rates, coefficients, or load data..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                />
                <button 
                    type="submit" 
                    disabled={loading || !input.trim()}
                    className="bg-zinc-100 hover:bg-white text-black rounded-xl px-4 flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={18} />
                </button>
            </div>
            <p className="text-[9px] text-zinc-600 mt-2 text-center">AI can make mistakes. Always verify load data with manuals.</p>
        </form>

      </div>
    </div>
  )
}
//===============================================================
//Script Name: AiModal.jsx
//Script Location: src/components/AiModal.jsx
//Date: 12/12/2025
//Created By: T03KNEE
//Version: 5.4.0 (Mobile UX Patch)
//About: Chat interface.
//       - FIX: Mobile Input set to 16px (text-base) to prevent iOS auto-zoom.
//       - FIX: Container uses 100dvh to handle mobile browser address bars.
//===============================================================

import { useState, useEffect, useRef } from 'react'
import { X, Send, Bot, Trash2, RefreshCw, Cpu, ShieldCheck, TerminalSquare, ChevronRight } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'

export default function AiModal({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'BALLISTICS ENGINE: ONLINE. AWAITING INPUT.' }
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
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: input,
            history: messages.filter(m => m.role !== 'system')
        })
      })

      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || "Connection Failed")

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      HAPTIC.success()
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', content: `[SYSTEM ERROR]: ${err.message}` }])
      HAPTIC.error()
    } finally {
      setLoading(false)
    }
  }

  function clearHistory() {
      if(!confirm("Purge session data?")) return
      setMessages([{ role: 'system', content: 'MEMORY PURGED' }])
      HAPTIC.soft()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-0 md:p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">
      
      {/* MAIN CONTAINER: Uses 100dvh for proper mobile height */}
      <div className="bg-[#050505] border border-zinc-800 w-full max-w-3xl h-[100dvh] md:h-[85vh] md:rounded-sm flex flex-col shadow-2xl relative overflow-hidden ring-1 ring-white/5 font-mono">
        
        {/* HEADER: Minimal Terminal Style */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/90 z-10">
            <div className="flex items-center gap-2">
                <div className="text-red-500 animate-pulse">
                    <TerminalSquare size={16} />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-zinc-100 tracking-[0.2em] uppercase">BALLISTICS<span className="text-red-600">OS</span></h3>
                    <div className="flex items-center gap-1.5 opacity-60">
                        <span className="w-1 h-1 bg-emerald-500 rounded-sm"/> 
                        <span className="text-[9px] text-zinc-500 uppercase">v3.0.0 Connected</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-1">
                <button onClick={clearHistory} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-sm transition border border-transparent hover:border-zinc-800"><Trash2 size={14}/></button>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-sm transition border border-transparent hover:border-zinc-800"><X size={16}/></button>
            </div>
        </div>

        {/* CHAT AREA: Clean Background (No Texture) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-black/20 pb-20 md:pb-3">
            {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-1 duration-200`}>
                    
                    {/* MESSAGE BOX */}
                    <div className={`max-w-[90%] md:max-w-[85%] rounded-sm px-3 py-2 text-xs md:text-sm leading-relaxed border backdrop-blur-sm ${
                        m.role === 'user' 
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700' 
                        : m.role === 'system'
                        ? 'bg-transparent text-red-500 text-[10px] w-full text-center border-none font-bold opacity-80 py-1 tracking-widest'
                        : 'bg-[#0a0a0a] text-zinc-300 border-zinc-800 shadow-sm'
                    }`}>
                        {m.role === 'assistant' && (
                            <div className="flex items-center gap-1.5 mb-1 text-[9px] text-zinc-600 border-b border-zinc-800/50 pb-1 uppercase tracking-wider">
                                <Cpu size={10} /> Calculation
                            </div>
                        )}
                        <span className="whitespace-pre-wrap">{m.content}</span>
                    </div>
                </div>
            ))}
            
            {loading && (
                <div className="flex justify-start">
                    <div className="bg-[#0a0a0a] rounded-sm px-3 py-2 flex items-center gap-2 border border-zinc-800">
                        <RefreshCw size={12} className="animate-spin text-red-600"/>
                        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Processing...</span>
                    </div>
                </div>
            )}
            <div ref={bottomRef} />
        </div>

        {/* INPUT AREA: Slimmer & Technical */}
        {/* FIX: pb-safe added for iPhone home bar */}
        <div className="p-2 bg-zinc-950 border-t border-zinc-800 z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <form onSubmit={handleSend} className="relative flex items-center gap-0">
                <div className="absolute left-3 text-zinc-600 pointer-events-none">
                    <ChevronRight size={14} />
                </div>
                <input 
                    /* FIX: text-base on mobile prevents zoom */
                    className="flex-1 bg-[#0a0a0a] border border-zinc-800 rounded-sm pl-8 pr-12 py-2.5 text-base md:text-sm text-zinc-200 focus:border-red-900 focus:bg-black focus:outline-none focus:ring-1 focus:ring-red-900/20 transition placeholder:text-zinc-700 font-mono"
                    placeholder="Enter command..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={loading}
                    autoFocus
                />
                <button 
                    type="submit" 
                    disabled={loading || !input.trim()}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-sm border border-zinc-700 transition disabled:opacity-0 disabled:scale-75 transform duration-150"
                >
                    <Send size={12} />
                </button>
            </form>
            <div className="flex justify-between items-center mt-1.5 px-1">
                <p className="text-[8px] text-zinc-700 font-mono">SECURE CONNECTION</p>
                <p className="text-[8px] text-zinc-600 flex items-center gap-1 opacity-50 font-mono">
                    <ShieldCheck size={8} /> VERIFY DATA
                </p>
            </div>
        </div>

      </div>
    </div>
  )
}
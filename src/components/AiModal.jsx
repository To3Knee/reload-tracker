//===============================================================
//Script Name: AiModal.jsx
//Script Location: src/components/AiModal.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 1.2.0
//About: Chat interface. Updated with iOS Safe Area support.
//===============================================================

import { useState, useEffect, useRef } from 'react'
import { X, Send, Bot, User, Trash2, Loader2 } from 'lucide-react'
import { sendAiMessage } from '../lib/ai'
import { HAPTIC } from '../lib/haptics'

export default function AiModal({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Hello! I am your Reload Tracker assistant. I can help you analyze your load data, estimate costs, or answer ballistics questions. How can I help?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight } }, [messages])

  if (!open) return null

  async function handleSend(e) {
    e.preventDefault(); if (!input.trim() || loading) return; HAPTIC.click();
    const userMsg = { role: 'user', content: input }; const newHistory = [...messages, userMsg];
    setMessages(newHistory); setInput(''); setLoading(true);
    try { const response = await sendAiMessage(newHistory); setMessages(prev => [...prev, { role: 'assistant', content: response }]); HAPTIC.success(); } catch (err) { setMessages(prev => [...prev, { role: 'system', content: 'Error: ' + err.message }]); HAPTIC.error(); } finally { setLoading(false); }
  }

  function clearChat() { if(confirm('Clear chat history?')) { setMessages([{ role: 'system', content: 'Chat cleared. How can I help?' }]); HAPTIC.error(); } }

  return (
    // MOBILE FIX: Added padding-top for Safe Area
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 md:p-4 pt-[env(safe-area-inset-top)]">
      <div className="bg-[#0f0f10] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden relative">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 bg-black/40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-400 border border-emerald-500/30"><Bot size={20} /></div>
            <div><h3 className="text-sm font-bold text-slate-100">Ballistics Assistant</h3><p className="text-[10px] text-slate-500">Powered by Gemini 2.0 Flash</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-red-400 transition"><Trash2 size={18} /></button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition"><X size={18} /></button>
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
            {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-700 text-slate-300' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'}`}>{m.role === 'user' ? <User size={14} /> : <Bot size={14} />}</div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-slate-800 text-slate-100 rounded-tr-none' : m.role === 'system' ? 'bg-red-900/10 text-red-300 border border-red-900/30 w-full text-center' : 'bg-black/40 border border-slate-800 text-slate-300 rounded-tl-none'}`}>{m.content}</div>
                </div>
            ))}
            {loading && (<div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center"><Bot size={14} /></div><div className="bg-black/40 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2"><Loader2 size={14} className="animate-spin text-emerald-500" /><span className="text-xs text-slate-500">Thinking...</span></div></div>)}
        </div>

        {/* INPUT AREA */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-black/60">
            <div className="relative flex gap-2">
                <input className="flex-1 bg-[#1a1a1a] border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition placeholder:text-slate-600" placeholder="Ask about powder, pressure, or costs..." value={input} onChange={e => setInput(e.target.value)} disabled={loading} />
                <button type="submit" disabled={loading || !input.trim()} className="px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-700 text-white rounded-xl transition flex items-center justify-center"><Send size={18} /></button>
            </div>
        </form>
      </div>
    </div>
  )
}
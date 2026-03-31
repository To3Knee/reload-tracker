//===============================================================
//Script Name: AiModal.jsx
//Script Location: src/components/AiModal.jsx
//Date: 12/12/2025
//Created By: T03KNEE
//Version: 6.0.0 (Design System v5 — Terminal Redesign)
//About: Ballistics AI chat terminal interface.
//       - FIX: Mobile Input set to 16px (text-base) to prevent iOS auto-zoom.
//       - FIX: Container uses 100dvh to handle mobile browser address bars.
//       - v6: JetBrains Mono force-applied via terminal-ui class.
//             Copper/brass accent system. Immersive terminal aesthetic.
//===============================================================

import { useState, useEffect, useRef } from 'react'
import { X, Send, Bot, Trash2, RefreshCw, Cpu, ShieldCheck, TerminalSquare, ChevronRight, Zap } from 'lucide-react'
import { HAPTIC } from '../lib/haptics'

export default function AiModal({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'BALLISTICS ENGINE: ONLINE. AWAITING INPUT.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    return () => clearTimeout(id)
  }, [open, messages])

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
      setMessages(prev => [...prev, { role: 'system', content: `[ERR]: ${err.message}` }])
      HAPTIC.error()
    } finally {
      setLoading(false)
    }
  }

  function clearHistory() {
      if(!confirm("Purge session data?")) return
      setMessages([{ role: 'system', content: 'SESSION PURGED. READY.' }])
      HAPTIC.soft()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-0 md:p-4 pt-[env(safe-area-inset-top)] animate-in fade-in duration-200">

      {/* terminal-ui forces JetBrains Mono across all children */}
      <div className="terminal-ui bg-[#050507] border border-steel-700 w-full max-w-3xl h-[100dvh] md:h-[85vh] md:rounded-sm flex flex-col shadow-2xl relative overflow-hidden"
           style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 25px 50px rgba(0,0,0,0.8)' }}>

        {/* ── HEADER ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-steel-800 bg-black/60 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Accent bar */}
            <div className="w-0.5 h-7 rounded-sm" style={{ background: 'var(--copper)' }} />
            <div>
              <div className="flex items-center gap-2">
                <TerminalSquare size={13} style={{ color: 'var(--red)' }} />
                <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-steel-100">
                  BALLISTICS<span style={{ color: 'var(--red)' }}>OS</span>
                </span>
                <span className="text-[9px] tracking-[0.2em] text-steel-600 uppercase">v3.0</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Green = connected/online — semantic, keep */}
                <span className="rt-dot rt-dot-active" />
                <span className="text-[9px] text-steel-500 tracking-widest uppercase">Secure Channel Active</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={clearHistory}
              title="Purge session"
              className="p-2 text-steel-600 hover:text-red-400 hover:bg-steel-900 rounded-sm transition border border-transparent hover:border-steel-700"
            >
              <Trash2 size={13}/>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-steel-600 hover:text-steel-200 hover:bg-steel-900 rounded-sm transition border border-transparent hover:border-steel-700"
            >
              <X size={15}/>
            </button>
          </div>
        </div>

        {/* ── CHAT AREA ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#050507] pb-20 md:pb-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-1 duration-200`}
            >
              {/* USER MESSAGE */}
              {m.role === 'user' && (
                <div className="max-w-[88%] md:max-w-[80%]">
                  <div className="text-[8px] text-steel-600 tracking-[0.2em] uppercase text-right mb-1 pr-1">OPERATOR INPUT</div>
                  <div
                    className="px-3 py-2 text-[11px] md:text-xs leading-relaxed text-steel-100 rounded-sm"
                    style={{
                      background: 'rgba(60,60,70,0.6)',
                      border: '1px solid var(--border-md)',
                      borderRight: '2px solid var(--copper)',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              )}

              {/* ASSISTANT MESSAGE */}
              {m.role === 'assistant' && (
                <div className="max-w-[92%] md:max-w-[88%]">
                  <div className="flex items-center gap-1.5 mb-1 pl-1">
                    <Cpu size={9} style={{ color: 'var(--copper)' }} />
                    <span className="text-[8px] tracking-[0.2em] uppercase" style={{ color: 'var(--copper)' }}>
                      CALCULATION COMPLETE
                    </span>
                  </div>
                  <div
                    className="px-3 py-2.5 text-[11px] md:text-xs leading-relaxed text-steel-200 rounded-sm whitespace-pre-wrap"
                    style={{
                      background: '#0a0a0d',
                      border: '1px solid var(--border)',
                      borderLeft: '2px solid var(--copper)',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              )}

              {/* SYSTEM MESSAGE */}
              {m.role === 'system' && (
                <div className="w-full flex items-center gap-3 py-0.5">
                  <div className="flex-1 h-px bg-steel-800" />
                  <span
                    className="text-[9px] tracking-[0.25em] uppercase px-2"
                    style={{ color: 'var(--red)' }}
                  >
                    {m.content}
                  </span>
                  <div className="flex-1 h-px bg-steel-800" />
                </div>
              )}
            </div>
          ))}

          {/* LOADING */}
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-sm"
                style={{ background: '#0a0a0d', border: '1px solid var(--border)', borderLeft: '2px solid var(--copper)' }}
              >
                <RefreshCw size={11} className="animate-spin" style={{ color: 'var(--copper)' }} />
                <span className="text-[10px] tracking-[0.2em] uppercase text-steel-500">
                  Processing ballistics data...
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── INPUT AREA ────────────────────────────────────────── */}
        <div
          className="p-3 border-t border-steel-800 bg-black/70 z-20 flex-shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <form onSubmit={handleSend} className="relative flex items-center">
            {/* Prompt symbol */}
            <div className="absolute left-3 pointer-events-none" style={{ color: 'var(--copper)' }}>
              <ChevronRight size={13} />
            </div>
            <input
              /* text-base prevents iOS auto-zoom */
              className="flex-1 rounded-sm pl-8 pr-12 py-2.5 text-base md:text-[12px] text-steel-100 placeholder:text-steel-700 outline-none transition"
              style={{
                background: '#0c0c10',
                border: '1px solid var(--border-md)',
                caretColor: 'var(--copper)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--copper)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
              placeholder="Enter query..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-1 top-1 bottom-1 px-3 rounded-sm border transition disabled:opacity-0 disabled:scale-90 transform duration-150"
              style={{
                background: 'var(--copper-dim)',
                borderColor: 'var(--copper)',
                color: 'var(--copper)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--copper)'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--copper-dim)'; e.currentTarget.style.color = 'var(--copper)'; }}
            >
              <Send size={11} />
            </button>
          </form>

          {/* Footer meta */}
          <div className="flex justify-between items-center mt-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <Zap size={7} style={{ color: 'var(--copper)' }} />
              <span className="text-[8px] tracking-widest text-steel-700 uppercase">AI-Assisted — Verify Critical Data</span>
            </div>
            <div className="flex items-center gap-1 text-steel-700">
              <ShieldCheck size={8} />
              <span className="text-[8px] tracking-widest uppercase">Secure</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

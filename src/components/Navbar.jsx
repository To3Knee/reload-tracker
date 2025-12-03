//===============================================================
//Script Name: Navbar.jsx
//Script Location: src/components/Navbar.jsx
//Date: 12/01/2025
//Created By: T03KNEE
//Version: 2.6.0
//About: Navbar. Accepts menuItems prop for dynamic ordering.
//===============================================================

import { Settings, Bot } from 'lucide-react'

export default function Navbar({ 
    activeTab, 
    setActiveTab, 
    currentUser, 
    onOpenSettings, 
    onOpenAi, 
    isAiEnabled,
    menuItems // NEW PROP
}) {
  const isAdmin = currentUser?.role === 'admin'
  const sessionLabel = currentUser ? isAdmin ? 'Reloader' : 'Shooter' : 'Shooter'
  const sessionDetail = currentUser?.username || ''

  return (
    <nav className="fixed z-50 bg-black/80 backdrop-blur-xl border border-[#b33c3c44] rounded-full flex items-center top-3 left-2 right-2 px-3 py-2 gap-2 md:top-6 md:right-4 md:left-auto md:w-auto md:px-4 md:gap-3">
      <div className="flex-1 flex items-center gap-1 md:gap-3 overflow-x-auto no-scrollbar mask-gradient">
        {menuItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-2 rounded-full font-bold transition-all whitespace-nowrap px-3 py-2 text-xs md:px-4 md:py-3 md:text-base ${activeTab === item.id ? 'bg-red-900/70 text-red-400 shadow-lg' : 'hover:bg-white/10 hover:text-red-400 text-slate-400'}`}>
            <item.icon size={18} className={activeTab === item.id ? "text-red-400" : ""} />
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-shrink-0 flex items-center gap-2 pl-2 md:pl-3 border-l border-red-500/30">
        {isAdmin && isAiEnabled && (
          <button onClick={() => onOpenAi && onOpenAi()} className="p-2 rounded-full border border-emerald-500/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/30 transition flex items-center justify-center mr-1"><Bot size={16} /></button>
        )}
        <span className="hidden lg:inline text-[10px] text-slate-500">{sessionLabel} <span className="text-slate-300">{sessionDetail ? `• ${sessionDetail}` : '(read-only)'}</span></span>
        <button onClick={() => onOpenSettings && onOpenSettings()} className="p-2 rounded-full border border-slate-700/80 bg-black/60 hover:bg-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/70 transition flex items-center justify-center"><Settings size={16} /></button>
      </div>
    </nav>
  )
}
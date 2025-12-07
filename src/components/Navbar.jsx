//===============================================================
//Script Name: Navbar.jsx
//Script Location: src/components/Navbar.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 3.5.0
//About: Unified Command Bar. 
//       Updated: Mobile Logo REMOVED (Keeps nav sleek/compact).
//===============================================================

import { Settings, Bot } from 'lucide-react'
import logo from '../assets/logo.png' 

export default function Navbar({ 
    activeTab, 
    setActiveTab, 
    currentUser, 
    onOpenSettings, 
    onOpenAi, 
    isAiEnabled,
    menuItems 
}) {
  const isAdmin = currentUser?.role === 'admin'
  const sessionLabel = currentUser ? isAdmin ? 'Reloader' : 'Shooter' : 'Shooter'
  const sessionDetail = currentUser?.username || ''

  return (
    <nav className="fixed z-50 transition-all duration-300 
      top-[max(0.75rem,env(safe-area-inset-top))] left-2 right-2 rounded-full border border-[#b33c3c44] bg-black/80 backdrop-blur-xl px-3 py-2 flex items-center justify-between shadow-2xl
      md:top-0 md:left-0 md:right-0 md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-zinc-800 md:bg-[#050505]/80 md:px-6 md:py-0 md:h-20
    ">
      
      {/* BRANDING (Desktop Only) */}
      <div className="hidden md:flex items-center gap-3 w-48 flex-shrink-0">
        <img 
            src={logo} 
            alt="RT" 
            className="h-16 w-auto opacity-100 hover:scale-105 transition-transform duration-300 object-contain" 
        />
      </div>

      {/* CENTER: NAVIGATION ITEMS */}
      <div className="flex-1 flex items-center justify-start md:justify-center gap-1 md:gap-6 overflow-x-auto no-scrollbar mask-gradient md:mask-none h-full">
        {menuItems.map(item => {
           const isActive = activeTab === item.id
           return (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`
                flex items-center gap-2 font-bold transition-all whitespace-nowrap
                /* Mobile Styles: Pill */
                px-3 py-2 rounded-full text-xs
                ${isActive ? 'bg-red-900/70 text-red-400 shadow-lg md:bg-transparent md:shadow-none' : 'text-slate-400 hover:text-zinc-200'}
                
                /* Desktop Styles: Underline / Pro Link */
                md:rounded-none md:px-1 md:py-0 md:h-full md:border-b-4 md:text-sm
                ${isActive ? 'md:border-red-500 md:text-white' : 'md:border-transparent md:hover:border-zinc-700'}
              `}
            >
              <item.icon size={18} className={isActive ? "text-red-400 md:text-red-500" : ""} />
              <span className="hidden md:inline">{item.label}</span>
            </button>
           )
        })}
      </div>

      {/* RIGHT: ACTIONS & SESSION */}
      <div className="flex-shrink-0 flex items-center gap-3 pl-2 md:pl-0 border-l border-red-500/30 md:border-none w-auto md:w-48 md:justify-end">
        
        {/* AI Toggle */}
        {isAdmin && isAiEnabled && (
          <button 
            onClick={() => onOpenAi && onOpenAi()} 
            className="p-2 rounded-full border border-emerald-500/20 bg-emerald-900/10 text-emerald-500 hover:text-emerald-300 hover:bg-emerald-900/30 hover:border-emerald-500/50 transition flex items-center justify-center"
            title="Ballistics AI"
          >
            <Bot size={20} />
          </button>
        )}

        {/* User Info */}
        <div className="hidden lg:flex flex-col items-end leading-tight">
             <span className="text-[10px] font-bold text-zinc-300">{sessionDetail || 'Guest'}</span>
             <span className="text-[9px] text-zinc-500 uppercase tracking-wider">{sessionLabel}</span>
        </div>

        {/* Settings / Profile */}
        <button onClick={() => onOpenSettings && onOpenSettings()} className="p-2 rounded-full border border-slate-700/80 bg-black/60 hover:bg-zinc-800 text-slate-400 hover:text-white hover:border-zinc-500 transition flex items-center justify-center">
            <Settings size={20} />
        </button>
      </div>
    </nav>
  )
}
//===============================================================
//Script Name: Navbar.jsx
//Script Location: src/components/Navbar.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 2.3.0
//About: Top-right navigation bar for Reload Tracker. Provides
//       tab switching and Admin tools (AI, Settings).
//       Updated: Conditionally renders AI button based on settings.
//===============================================================

import {
  Gauge,
  ShoppingCart,
  Package,
  Beaker,
  Settings,
  ClipboardList,
  Activity,
  Bot,
} from 'lucide-react'

const MENU_ITEMS = [
  { id: 'calculator', label: 'Calculator', icon: Gauge },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'recipes', label: 'Recipes', icon: Beaker },
  { id: 'batches', label: 'Batches', icon: ClipboardList },
  { id: 'analytics', label: 'Analytics', icon: Activity },
]

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenSettings,
  onOpenAi,
  isAiEnabled, // NEW PROP
}) {
  const isAdmin = currentUser?.role === 'admin'
  
  const sessionLabel = currentUser
    ? isAdmin
      ? 'Reloader'
      : 'Shooter'
    : 'Shooter'

  const sessionDetail = currentUser?.username || ''

  return (
    <nav className="fixed top-6 right-4 z-50 bg-black/80 backdrop-blur-xl border border-[#b33c3c44] rounded-full px-4 py-2 flex items-center gap-3">
      {/* Main nav pills */}
      <div className="flex gap-3">
        {MENU_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm md:text-base font-bold transition-all
            ${
              activeTab === item.id
                ? 'bg-red-900/70 text-red-400 shadow-lg'
                : 'hover:bg-white/10 hover:text-red-400'
            }`}
          >
            <item.icon size={18} />
            <span className="hidden md:inline">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Session + Tools */}
      <div className="flex items-center gap-2 pl-3 border-l border-red-500/30">
        {/* ASK AI BUTTON (Admins Only AND Enabled in Settings) */}
        {isAdmin && isAiEnabled && (
          <button
            type="button"
            onClick={() => onOpenAi && onOpenAi()}
            className="p-2 rounded-full border border-emerald-500/30 bg-emerald-900/10 text-emerald-400 hover:bg-emerald-900/30 transition flex items-center justify-center mr-1"
            aria-label="Ask Ballistics AI"
          >
            <Bot size={16} />
          </button>
        )}

        <span className="hidden md:inline text-[10px] text-slate-500">
          {sessionLabel}{' '}
          <span className="text-slate-300">
            {sessionDetail
              ? `• ${sessionDetail}`
              : '(read-only)'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => onOpenSettings && onOpenSettings()}
          className="p-2 rounded-full border border-slate-700/80 bg-black/60 hover:bg-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/70 transition flex items-center justify-center"
          aria-label="Access & roles settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </nav>
  )
}
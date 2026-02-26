//===============================================================
//Script Name: Navbar.jsx
//Script Location: src/components/Navbar.jsx
//Date: 02/25/2026
//Created By: T03KNEE
//Version: 4.0.0 (Precision Engineering Redesign)
//About: Unified nav. Desktop = top bar. Mobile = slim header + bottom tabs.
//===============================================================

import { Settings, Bot } from 'lucide-react'
import logo from '../assets/logo.png'

// Short labels for the cramped mobile bottom bar
const SHORT_LABELS = {
  calculator: 'Calc',
  purchases:  'Lots',
  inventory:  'Stock',
  recipes:    'Loads',
  batches:    'Log',
  range:      'Range',
  armory:     'Armory',
  analytics:  'Stats',
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenSettings,
  onOpenAi,
  isAiEnabled,
  menuItems
}) {
  const isAdmin      = currentUser?.role === 'admin'
  const sessionName  = currentUser?.username || 'Guest'
  const sessionRole  = isAdmin ? 'Reloader' : 'Shooter'

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          DESKTOP — Full top bar (md and up)
      ═══════════════════════════════════════════════════════ */}
      <nav className="hidden lg:flex fixed z-50 top-0 left-0 right-0 h-[72px] items-center px-6 gap-4
                      bg-[#080808]/96 backdrop-blur-xl border-b border-[#1e1e1e]
                      shadow-[0_1px_0_#2a2a2a,0_4px_24px_rgba(0,0,0,0.6)]">

        {/* Branding */}
        <div className="flex items-center w-48 flex-shrink-0">
          <img src={logo} alt="Reload Tracker" className="h-[64px] w-auto object-contain opacity-95 hover:opacity-100 transition-opacity duration-200" />
        </div>

        {/* Navigation links */}
        <div className="flex-1 flex items-stretch justify-center h-full">
          {menuItems.map(item => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3 h-full text-[11px] font-bold uppercase tracking-[0.12em] transition-colors whitespace-nowrap
                  ${active ? 'text-[#f0ece4]' : 'text-[#4a4844] hover:text-[#9a9590]'}`}
              >
                <item.icon
                  size={14}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? 'text-[#b87333]' : ''}
                />
                {item.label}
                {/* Copper underline for active tab */}
                {active && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t-sm"
                        style={{ background: 'linear-gradient(90deg, transparent, #b87333 30%, #d4a843 50%, #b87333 70%, transparent)' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 w-48 justify-end flex-shrink-0">
          {isAdmin && isAiEnabled && (
            <button
              onClick={() => onOpenAi?.()}
              title="Ballistics AI"
              className="rt-btn rt-btn-ghost rt-btn-icon border-emerald-900/60 text-emerald-600 hover:text-emerald-400 hover:border-emerald-700 hover:bg-emerald-950/40"
            >
              <Bot size={16} />
            </button>
          )}
          <div className="hidden lg:flex flex-col items-end leading-tight">
            <span className="text-[11px] font-bold text-[#f0ece4] tracking-wide">{sessionName}</span>
            <span className="text-[8px] text-[#4a4844] uppercase tracking-[0.2em]">{sessionRole}</span>
          </div>
          <button
            onClick={() => onOpenSettings?.()}
            title="Settings"
            className="rt-btn rt-btn-ghost rt-btn-icon"
          >
            <Settings size={16} />
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          MOBILE — Slim top header (branding + utility only)
      ═══════════════════════════════════════════════════════ */}
      <header
        className="lg:hidden fixed z-50 top-0 left-0 right-0
                   flex items-center justify-between px-4
                   bg-[#080808]/97 backdrop-blur-xl border-b border-[#1e1e1e]"
        style={{ height: 'calc(48px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <img src={logo} alt="Reload Tracker" className="h-11 w-auto object-contain opacity-95" />

        <div className="flex items-center gap-2">
          {isAdmin && isAiEnabled && (
            <button
              onClick={() => onOpenAi?.()}
              className="p-2 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-600 active:scale-95 transition-transform"
            >
              <Bot size={18} />
            </button>
          )}
          <button
            onClick={() => onOpenSettings?.()}
            className="p-2 rounded border border-[#1e1e1e] bg-[#0f0f0f] text-[#4a4844] active:scale-95 transition-transform"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          MOBILE — Fixed bottom tab bar
      ═══════════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed z-50 bottom-0 left-0 right-0
                   flex items-stretch
                   bg-[#080808]/98 backdrop-blur-xl border-t border-[#1e1e1e]
                   overflow-x-auto no-scrollbar"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(58px + env(safe-area-inset-bottom))' }}
      >
        {menuItems.map(item => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-w-[52px] flex flex-col items-center justify-center gap-[3px] pt-2 pb-1 relative transition-colors
                ${active ? 'text-[#b87333]' : 'text-[#3a3a3a]'}`}
            >
              {/* Copper top tick for active */}
              {active && (
                <span className="absolute top-0 left-2 right-2 h-[1.5px] rounded-b-sm bg-[#b87333]" />
              )}
              <item.icon
                size={20}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span className={`text-[8px] font-bold uppercase tracking-[0.1em] leading-none
                ${active ? 'text-[#b87333]' : 'text-[#3a3a3a]'}`}>
                {SHORT_LABELS[item.id] || item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

import { useState } from 'react'
import { Settings, Bot, MoreHorizontal, X } from 'lucide-react'
import logo from '../assets/logo.png'

// Primary 5 tabs always visible in mobile bottom bar
const PRIMARY_IDS = ['calculator', 'purchases', 'recipes', 'batches', 'range']

// Short labels for mobile bottom bar
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
  const [moreOpen, setMoreOpen] = useState(false)

  const isAdmin      = currentUser?.role === 'admin'
  const sessionName  = currentUser?.username || 'Guest'
  const sessionRole  = isAdmin ? 'Reloader' : 'Shooter'

  const primaryItems  = menuItems.filter(m => PRIMARY_IDS.includes(m.id))
  const overflowItems = menuItems.filter(m => !PRIMARY_IDS.includes(m.id))
  const overflowActive = overflowItems.some(m => m.id === activeTab)

  const handleTabChange = (id) => {
    setActiveTab(id)
    setMoreOpen(false)
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          DESKTOP — Full top bar (lg and up)
      ═══════════════════════════════════════════════════════ */}
      <nav className="hidden lg:flex fixed z-50 top-0 left-0 right-0 h-[72px] items-center px-6 gap-4
                      bg-[#080808]/96 backdrop-blur-xl border-b border-[#1e1e1e]
                      shadow-[0_1px_0_#2a2a2a,0_4px_24px_rgba(0,0,0,0.6)]">

        {/* Branding */}
        <div className="flex items-center w-48 flex-shrink-0">
          <img src={logo} alt="Reload Tracker" className="h-[72px] w-auto object-contain opacity-95 hover:opacity-100 transition-opacity duration-200" />
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
                  ${active ? 'text-[#f2f2f4]' : 'text-[#484854] hover:text-[#82828e]'}`}
              >
                <item.icon size={14} strokeWidth={active ? 2.5 : 1.5} className={active ? 'text-[#c42b21]' : ''} />
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t-sm"
                        style={{ background: 'linear-gradient(90deg, transparent, #c42b21 30%, #f2f2f4 50%, #c42b21 70%, transparent)' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 w-48 justify-end flex-shrink-0">
          {isAdmin && isAiEnabled && (
            <button onClick={() => onOpenAi?.()} title="Ballistics AI"
              className="rt-btn rt-btn-ghost rt-btn-icon border-copper-900/60 text-copper-500 hover:text-copper-300 hover:border-copper-700 hover:bg-red-900/40">
              <Bot size={16} />
            </button>
          )}
          <div className="hidden lg:flex flex-col items-end leading-tight">
            <span className="text-[11px] font-bold text-[#f2f2f4] tracking-wide">{sessionName}</span>
            <span className="text-[8px] text-[#484854] uppercase tracking-[0.2em]">{sessionRole}</span>
          </div>
          <button onClick={() => onOpenSettings?.()} title="Settings" className="rt-btn rt-btn-ghost rt-btn-icon">
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
        <img src={logo} alt="Reload Tracker" className="h-12 w-auto object-contain opacity-95" />
        <div className="flex items-center gap-2">
          {isAdmin && isAiEnabled && (
            <button onClick={() => onOpenAi?.()}
              className="p-2 rounded border border-copper-900/60 bg-red-900/30 text-copper-500 active:scale-95 transition-transform">
              <Bot size={18} />
            </button>
          )}
          <button onClick={() => onOpenSettings?.()}
            className="p-2 rounded border border-[#1e1e1e] bg-[#0f0f0f] text-[#484854] active:scale-95 transition-transform">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          MOBILE — Fixed bottom tab bar (5 primary + More)
      ═══════════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed z-50 bottom-0 left-0 right-0 flex items-stretch
                   bg-[#080808]/98 backdrop-blur-xl border-t border-[#1e1e1e]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(58px + env(safe-area-inset-bottom))' }}
      >
        {primaryItems.map(item => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-[3px] pt-2 pb-1 relative transition-colors
                ${active ? 'text-[#c42b21]' : 'text-[#3a3a3a]'}`}
            >
              {active && <span className="absolute top-0 left-2 right-2 h-[1.5px] rounded-b-sm bg-[#c42b21]" />}
              <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[8px] font-bold uppercase tracking-[0.1em] leading-none ${active ? 'text-[#c42b21]' : 'text-[#3a3a3a]'}`}>
                {SHORT_LABELS[item.id] || item.label}
              </span>
            </button>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`flex-1 flex flex-col items-center justify-center gap-[3px] pt-2 pb-1 relative transition-colors
            ${overflowActive || moreOpen ? 'text-[#c42b21]' : 'text-[#3a3a3a]'}`}
        >
          {(overflowActive || moreOpen) && <span className="absolute top-0 left-2 right-2 h-[1.5px] rounded-b-sm bg-[#c42b21]" />}
          {moreOpen ? <X size={20} strokeWidth={2} /> : <MoreHorizontal size={20} strokeWidth={1.5} />}
          <span className={`text-[8px] font-bold uppercase tracking-[0.1em] leading-none ${overflowActive || moreOpen ? 'text-[#c42b21]' : 'text-[#3a3a3a]'}`}>
            More
          </span>
        </button>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          MOBILE — More sheet (slides up from bottom bar)
      ═══════════════════════════════════════════════════════ */}
      {moreOpen && (
        <div
          className="lg:hidden fixed z-40 left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-xl border-t border-[#1e1e1e]
                     animate-in slide-in-from-bottom-2 duration-150"
          style={{ bottom: 'calc(58px + env(safe-area-inset-bottom))' }}
        >
          <div className="px-4 py-3 grid grid-cols-3 gap-2">
            {overflowItems.map(item => {
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border transition-colors
                    ${active
                      ? 'bg-red-900/20 border-red-900/40 text-[#c42b21]'
                      : 'bg-[#111] border-[#1e1e1e] text-[#484854] active:bg-[#1a1a1a]'
                    }`}
                >
                  <item.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] leading-none">
                    {SHORT_LABELS[item.id] || item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tap-outside-to-close backdrop for More sheet */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setMoreOpen(false)}
        />
      )}
    </>
  )
}

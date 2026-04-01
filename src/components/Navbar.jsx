import { useState } from 'react'
import { Settings, Bot, MoreHorizontal, X, Sun, Moon } from 'lucide-react'
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
  menuItems,
  isDark = true,
  onToggleTheme,
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
      <nav className="nav-bg hidden lg:flex fixed z-50 top-0 left-0 right-0 h-[72px] items-center px-6 gap-4
                      backdrop-blur-xl border-b shadow-[0_1px_0_var(--border),0_4px_24px_rgba(0,0,0,0.3)]">

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
                  ${active ? 'text-[var(--text-hi)]' : 'text-[var(--text-lo)] hover:text-[var(--text-md)]'}`}
              >
                <item.icon size={14} strokeWidth={active ? 2.5 : 1.5} className={active ? 'text-red-500' : ''} />
                {item.label}
                {active && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t-sm"
                        style={{ background: 'linear-gradient(90deg, transparent, var(--red) 30%, var(--text-hi) 50%, var(--red) 70%, transparent)' }} />
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
            <span className="text-[11px] font-bold text-[var(--text-hi)] tracking-wide">{sessionName}</span>
            <span className="text-[8px] text-[var(--text-lo)] uppercase tracking-[0.2em]">{sessionRole}</span>
          </div>
          <button onClick={onToggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rt-btn rt-btn-ghost rt-btn-icon">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => onOpenSettings?.()} title="Settings" className="rt-btn rt-btn-ghost rt-btn-icon">
            <Settings size={16} />
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          MOBILE — Slim top header (branding + utility only)
      ═══════════════════════════════════════════════════════ */}
      <header
        className="nav-bg lg:hidden fixed z-50 top-0 left-0 right-0
                   flex items-center justify-between px-4
                   backdrop-blur-xl border-b"
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
          <button onClick={onToggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-lo)] active:scale-95 transition-transform">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => onOpenSettings?.()}
            className="p-2 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-lo)] active:scale-95 transition-transform">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          MOBILE — Fixed bottom tab bar (5 primary + More)
      ═══════════════════════════════════════════════════════ */}
      <nav
        className="nav-bg lg:hidden fixed z-50 bottom-0 left-0 right-0 flex items-stretch
                   backdrop-blur-xl border-t"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(58px + env(safe-area-inset-bottom))' }}
      >
        {primaryItems.map(item => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-[3px] pt-2 pb-1 relative transition-colors
                ${active ? 'text-red-500' : 'text-[var(--text-lo)]'}`}
            >
              {active && <span className="absolute top-0 left-2 right-2 h-[1.5px] rounded-b-sm bg-red-500" />}
              <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[8px] font-bold uppercase tracking-[0.1em] leading-none ${active ? 'text-red-500' : 'text-[var(--text-lo)]'}`}>
                {SHORT_LABELS[item.id] || item.label}
              </span>
            </button>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`flex-1 flex flex-col items-center justify-center gap-[3px] pt-2 pb-1 relative transition-colors
            ${overflowActive || moreOpen ? 'text-red-500' : 'text-[var(--text-lo)]'}`}
        >
          {(overflowActive || moreOpen) && <span className="absolute top-0 left-2 right-2 h-[1.5px] rounded-b-sm bg-red-500" />}
          {moreOpen ? <X size={20} strokeWidth={2} /> : <MoreHorizontal size={20} strokeWidth={1.5} />}
          <span className={`text-[8px] font-bold uppercase tracking-[0.1em] leading-none ${overflowActive || moreOpen ? 'text-red-500' : 'text-[var(--text-lo)]'}`}>
            More
          </span>
        </button>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          MOBILE — More sheet (slides up from bottom bar)
      ═══════════════════════════════════════════════════════ */}
      {moreOpen && (
        <div
          className="nav-bg lg:hidden fixed z-40 left-0 right-0 backdrop-blur-xl border-t
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
                      ? 'bg-red-900/20 border-red-900/40 text-red-500'
                      : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-lo)] active:bg-[var(--overlay)]'
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

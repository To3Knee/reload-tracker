import { useEffect, useState, useRef, lazy, Suspense, useCallback } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
const Inventory = lazy(() => import('./components/Inventory').then(m => ({ default: m.Inventory })))
const Recipes   = lazy(() => import('./components/Recipes').then(m => ({ default: m.Recipes })))
const Batches   = lazy(() => import('./components/Batches').then(m => ({ default: m.Batches })))
const RangeLogs = lazy(() => import('./components/RangeLogs').then(m => ({ default: m.RangeLogs })))
const Armory    = lazy(() => import('./components/Armory').then(m => ({ default: m.Armory })))
import { useAppStore } from './lib/store'
import { logoutUser, ROLE_ADMIN } from './lib/auth'
import { APP_VERSION_LABEL } from './version'
import { HAPTIC } from './lib/haptics'
import logo from './assets/logo.png'
import {
  Gauge, ShoppingCart, Package, Beaker, ClipboardList, Activity, Target, Crosshair, RefreshCw
} from 'lucide-react'

const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })))
const Purchases = lazy(() => import('./components/Purchases').then(m => ({ default: m.Purchases })))
const AuthModal  = lazy(() => import('./components/AuthModal'))
const AiModal    = lazy(() => import('./components/AiModal'))

const REQUIRE_LOGIN = import.meta.env.VITE_REQUIRE_LOGIN === 'true'

const MENU_ITEMS = [
  { id: 'calculator', label: 'Calculator', icon: Gauge },
  { id: 'purchases',  label: 'Purchases',  icon: ShoppingCart },
  { id: 'inventory',  label: 'Inventory',  icon: Package },
  { id: 'recipes',    label: 'Recipes',    icon: Beaker },
  { id: 'batches',    label: 'Batches',    icon: ClipboardList },
  { id: 'range',      label: 'Range',      icon: Target },
  { id: 'armory',     label: 'Armory',     icon: Crosshair },
  { id: 'analytics',  label: 'Analytics',  icon: Activity },
]

export default function App() {
  const VALID_TABS = MENU_ITEMS.map(m => m.id)
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeTab')
    return saved && VALID_TABS.includes(saved) ? saved : 'calculator'
  })
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [isAuthOpen,  setIsAuthOpen]  = useState(false)
  const [isAiOpen,    setIsAiOpen]    = useState(false)
  const [scannedId,   setScannedId]   = useState(null)

  // Pull-To-Refresh state
  const [pullStartY,   setPullStartY]   = useState(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const mainRef = useRef(null)

  const [ageConfirmed, setAgeConfirmed] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('ageConfirmed') === 'true' : false
  )
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline  = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline) }
  }, [])

  // Zustand store
  const { purchases, recipes, currentUser, aiEnabled, refresh, setCurrentUser, clearCurrentUser } = useAppStore()
  const isAdmin = currentUser?.role === ROLE_ADMIN

  useEffect(() => {
    const controller = new AbortController()
    loadInitialData(controller.signal)
    return () => controller.abort()
  }, [])

  const loadInitialData = async (signal) => {
    await refresh(signal)

    // Auth gate
    const user = useAppStore.getState().currentUser
    if (user) {
      setIsAuthOpen(false)
    } else if (REQUIRE_LOGIN) {
      setIsAuthOpen(true)
    }

    const params = new URLSearchParams(window.location.search)
    const batchId    = params.get('batchId')
    const purchaseId = params.get('purchaseId')
    const rangeLogId = params.get('rangeLogId')
    if (batchId)    { setActiveTab('batches');   setScannedId(Number(batchId)) }
    else if (purchaseId) { setActiveTab('purchases'); setScannedId(Number(purchaseId)) }
    else if (rangeLogId) { setActiveTab('range');     setScannedId(Number(rangeLogId)) }
  }

  const handlePullRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(60)
    HAPTIC.success()
    await refresh()
    setTimeout(() => { setIsRefreshing(false); setPullDistance(0) }, 500)
  }

  const confirmAge       = () => { localStorage.setItem('ageConfirmed', 'true'); setAgeConfirmed(true); HAPTIC.click() }
  const handleUseRecipe  = useCallback((recipe) => { setSelectedRecipe(recipe); setActiveTab('calculator'); HAPTIC.soft() }, [])
  const handleTabChange  = useCallback((t) => { setActiveTab(t); localStorage.setItem('activeTab', t); HAPTIC.soft() }, [])
  const handleOpenSettings = useCallback(() => { setIsAuthOpen(true); HAPTIC.click() }, [])
  const handleOpenAi     = useCallback(() => { setIsAiOpen(true); HAPTIC.click() }, [])
  const handleLogin      = useCallback((user) => { setCurrentUser(user); setIsAuthOpen(false); HAPTIC.success() }, [])
  const handleLogout     = useCallback(async () => {
    await logoutUser()
    clearCurrentUser()
    if (!REQUIRE_LOGIN) setIsAuthOpen(false)
    setIsAiOpen(false)
    HAPTIC.soft()
  }, [])
  const handleCloseAuth  = useCallback(() => { if (!REQUIRE_LOGIN || currentUser) setIsAuthOpen(false) }, [currentUser])

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (e) => {
    if (window.scrollY === 0 && !isRefreshing) setPullStartY(e.touches[0].clientY)
  }
  const handleTouchMove = (e) => {
    if (pullStartY > 0 && window.scrollY === 0 && !isRefreshing) {
      const diff = e.touches[0].clientY - pullStartY
      if (diff > 0) setPullDistance(Math.min(diff * 0.4, 120))
    }
  }
  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      await handlePullRefresh()
    } else {
      setPullDistance(0)
    }
    setPullStartY(0)
  }

  if (!ageConfirmed) return (
    <div className="min-h-[100dvh] bg-[#080808] text-gray-100 flex items-center justify-center px-4">
      <div className="glass max-w-lg w-full text-center p-10">
        <div className="relative mb-6 flex justify-center">
          <div className="absolute inset-0 blur-3xl rounded-full bg-red-900/25 scale-150" />
          <img src={logo} alt="Reload Tracker" className="relative h-32 w-auto object-contain opacity-95" />
        </div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.35em] text-red-500/70 mb-5">Reload Tracker</h2>
        <h1 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-[0.06em] text-white leading-tight">For Responsible <span className="text-red-600">Adult Reloaders</span> Only.</h1>
        <p className="text-sm text-steel-400 mb-8">By continuing you confirm you are of legal age.</p>
        <button onClick={confirmAge} className="rt-btn rt-btn-primary px-8 py-3 text-sm font-semibold shadow-lg shadow-red-900/40 active:scale-95">I am 21 or older</button>
        <div className="mt-6 text-[10px] text-steel-600 uppercase tracking-widest">Reload Tracker {APP_VERSION_LABEL}</div>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-[100dvh] bg-[#080808] text-gray-100"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-900/90 backdrop-blur border-b border-amber-600/50 px-4 py-2 flex items-center justify-center gap-2 text-[11px] font-bold text-amber-200 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Offline — showing cached data
        </div>
      )}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        onOpenSettings={handleOpenSettings}
        onOpenAi={handleOpenAi}
        isAiEnabled={aiEnabled}
        menuItems={MENU_ITEMS}
      />

      {/* Pull To Refresh indicator */}
      <div
        className="fixed left-0 right-0 flex justify-center z-[60] pointer-events-none transition-transform duration-200"
        style={{
          top: 'calc(48px + env(safe-area-inset-top))',
          transform: `translateY(${pullDistance - 50}px)`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div className="rt-card p-2 shadow-xl shadow-black/60">
          <RefreshCw
            className={`w-5 h-5 text-[#c42b21] ptr-spinner ${isRefreshing ? 'refreshing' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)`, willChange: 'transform' }}
          />
        </div>
      </div>

      <main
        ref={mainRef}
        className="max-w-6xl mx-auto px-4
          pt-[calc(56px+env(safe-area-inset-top))]
          pb-[calc(72px+env(safe-area-inset-bottom))]
          lg:pt-[88px] lg:pb-10
          transition-transform duration-200"
        style={pullDistance > 0 ? { transform: `translateY(${pullDistance / 2}px)` } : undefined}
      >
        {activeTab === 'calculator' && <Dashboard purchases={purchases} recipes={recipes} selectedRecipe={selectedRecipe} onSelectRecipe={handleUseRecipe} canEdit={!!isAdmin} />}
        {activeTab === 'armory'     && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-steel-500 animate-pulse">Loading Armory...</div>}>
            <Armory canEdit={!!isAdmin} />
          </Suspense>
        )}
        {activeTab === 'purchases'  && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-steel-500 animate-pulse">Loading Purchases...</div>}>
            <Purchases onChanged={refresh} canEdit={!!isAdmin} highlightId={scannedId} user={currentUser} />
          </Suspense>
        )}
        {activeTab === 'inventory'  && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-steel-500 animate-pulse">Loading Inventory...</div>}>
            <Inventory purchases={purchases} selectedRecipe={selectedRecipe} />
          </Suspense>
        )}
        {activeTab === 'recipes'    && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-steel-500 animate-pulse">Loading Recipes...</div>}>
            <Recipes onUseRecipe={handleUseRecipe} canEdit={!!isAdmin} purchases={purchases} />
          </Suspense>
        )}
        {activeTab === 'batches'    && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-steel-500 animate-pulse">Loading Batches...</div>}>
            <Batches highlightId={scannedId} />
          </Suspense>
        )}
        {activeTab === 'range'      && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-steel-500 animate-pulse">Loading Range Logs...</div>}>
            <RangeLogs recipes={recipes} canEdit={!!isAdmin} highlightId={scannedId} />
          </Suspense>
        )}
        {activeTab === 'analytics'  && (
          <Suspense fallback={<div className="p-8 text-center text-xs text-steel-500 animate-pulse">Running Ballistics Calculations...</div>}>
            <Analytics />
          </Suspense>
        )}
      </main>

      <Suspense fallback={null}>
        {isAuthOpen && (
          <AuthModal
            open={isAuthOpen}
            onClose={handleCloseAuth}
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            canClose={!REQUIRE_LOGIN || !!currentUser}
          />
        )}
        {isAiOpen && <AiModal open={isAiOpen} onClose={() => setIsAiOpen(false)} />}
      </Suspense>

      <div className="hidden lg:block fixed bottom-2 right-3 z-50 text-[10px] text-steel-500">
        <span className="px-2 py-[2px] rounded border border-red-600/30 bg-black/70 backdrop-blur font-mono tracking-wider">
          Reload Tracker {APP_VERSION_LABEL}
        </span>
      </div>
    </div>
  )
}

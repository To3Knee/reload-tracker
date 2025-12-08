//===============================================================
//Script Name: App.jsx
//Script Location: src/App.jsx
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 3.5.0
//About: Root shell. 
//       Updated: Removed top-level Supply Chain tab (Moved to Purchases).
//===============================================================

import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import { Purchases } from './components/Purchases'
import { Inventory } from './components/Inventory'
import { Recipes } from './components/Recipes'
import { Batches } from './components/Batches'
import { Analytics } from './components/Analytics'
import { RangeLogs } from './components/RangeLogs'
import { Armory } from './components/Armory' 
import { getAllPurchases, getAllRecipes, seedData } from './lib/db'
import { APP_VERSION_LABEL } from './version'
import AuthModal from './components/AuthModal'
import AiModal from './components/AiModal'
import { fetchSettings } from './lib/settings'
import { getCurrentUser, logoutUser, ROLE_ADMIN } from './lib/auth'
import { HAPTIC } from './lib/haptics'
import logo from './assets/logo.png'
import {
  Gauge, ShoppingCart, Package, Beaker, ClipboardList, Activity, Target, Crosshair
} from 'lucide-react'

// CONFIG: Access Control
const REQUIRE_LOGIN = import.meta.env.VITE_REQUIRE_LOGIN === 'true'

const MENU_ITEMS = [
  { id: 'calculator', label: 'Calculator', icon: Gauge },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart }, // Now includes Supply Chain
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'recipes', label: 'Recipes', icon: Beaker },
  { id: 'batches', label: 'Batches', icon: ClipboardList },
  { id: 'range', label: 'Range', icon: Target },
  { id: 'armory', label: 'Armory', icon: Crosshair },
  { id: 'analytics', label: 'Analytics', icon: Activity },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('calculator')
  const [purchases, setPurchases] = useState([])
  const [recipes, setRecipes] = useState([]) 
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  
  // Auth State
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [scannedId, setScannedId] = useState(null)

  const [ageConfirmed, setAgeConfirmed] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('ageConfirmed') === 'true' : false
  )

  useEffect(() => {
    const load = async () => {
      await seedData()
      const [purchasesData, recipesData] = await Promise.all([getAllPurchases(), getAllRecipes()])
      setPurchases(purchasesData)
      setRecipes(recipesData)
      
      const user = await getCurrentUser()
      if (user) {
          setCurrentUser(user)
          setIsAuthOpen(false) 
      } else if (REQUIRE_LOGIN) {
          setIsAuthOpen(true) 
      }

      try {
        const settings = await fetchSettings()
        setAiEnabled(settings.ai_enabled === 'true' && (settings.hasAiKey || settings.ai_api_key))
      } catch (e) {}

      const params = new URLSearchParams(window.location.search)
      const batchId = params.get('batchId')
      const purchaseId = params.get('purchaseId')
      const rangeLogId = params.get('rangeLogId')

      if (batchId) { setActiveTab('batches'); setScannedId(Number(batchId)) }
      else if (purchaseId) { setActiveTab('purchases'); setScannedId(Number(purchaseId)) }
      else if (rangeLogId) { setActiveTab('range'); setScannedId(Number(rangeLogId)) }
    }
    load()
  }, [])

  const refreshPurchases = async () => { setPurchases(await getAllPurchases()) }
  const confirmAge = () => { localStorage.setItem('ageConfirmed', 'true'); setAgeConfirmed(true); HAPTIC.click(); }
  const handleUseRecipe = recipe => { setSelectedRecipe(recipe); setActiveTab('calculator'); HAPTIC.soft(); }
  const isAdmin = currentUser && currentUser.role === ROLE_ADMIN

  if (!ageConfirmed) return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-black via-zinc-950 to-black text-gray-100 flex items-center justify-center px-4">
        <div className="glass max-w-lg w-full text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-4">Reload Tracker</p>
          <h1 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-[0.1em] text-white">For Responsible <span className="text-red-600">Adult Reloaders</span> Only.</h1>
          <p className="text-sm text-slate-400 mb-8">By continuing you confirm you are of legal age.</p>
          <button onClick={confirmAge} className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-red-700 hover:bg-red-600 text-sm font-semibold shadow-lg shadow-red-900/40 transition active:scale-95">I am 21 or older</button>
          <div className="mt-4 text-[10px] text-slate-600">Reload Tracker {APP_VERSION_LABEL}</div>
        </div>
      </div>
  )

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-black via-zinc-950 to-black text-gray-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(t) => { setActiveTab(t); HAPTIC.soft(); }}
        currentUser={currentUser}
        onOpenSettings={() => { setIsAuthOpen(true); HAPTIC.click(); }}
        onOpenAi={() => { setIsAiOpen(true); HAPTIC.click(); }}
        isAiEnabled={aiEnabled}
        menuItems={MENU_ITEMS}
      />

      <main className="max-w-6xl mx-auto px-4 pt-[calc(5rem+env(safe-area-inset-top))] md:pt-28 pb-24">
        <div className="flex justify-center mb-6 md:hidden">
           <img src={logo} alt="Reload Tracker" className="w-40 opacity-90 drop-shadow-2xl" />
        </div>

        {activeTab === 'calculator' && <Dashboard purchases={purchases} selectedRecipe={selectedRecipe} onSelectRecipe={handleUseRecipe} canEdit={!!isAdmin} />}
        {activeTab === 'armory' && <Armory canEdit={!!isAdmin} />}
        {activeTab === 'purchases' && <Purchases onChanged={refreshPurchases} canEdit={!!isAdmin} highlightId={scannedId} />}
        {activeTab === 'inventory' && <Inventory purchases={purchases} selectedRecipe={selectedRecipe} />}
        {activeTab === 'recipes' && <Recipes onUseRecipe={handleUseRecipe} canEdit={!!isAdmin} purchases={purchases} />}
        {activeTab === 'batches' && <Batches highlightId={scannedId} />}
        {activeTab === 'range' && <RangeLogs recipes={recipes} canEdit={!!isAdmin} highlightId={scannedId} />}
        {activeTab === 'analytics' && <Analytics />}
      </main>

      {isAuthOpen && (
          <AuthModal 
            open={isAuthOpen} 
            onClose={() => { if (!REQUIRE_LOGIN || currentUser) setIsAuthOpen(false) }} 
            currentUser={currentUser} 
            onLogin={user => { setCurrentUser(user); setIsAuthOpen(false); HAPTIC.success(); }} 
            onLogout={async () => { await logoutUser(); setCurrentUser(null); if (!REQUIRE_LOGIN) setIsAuthOpen(false); setIsAiOpen(false); HAPTIC.soft(); }} 
            canClose={!REQUIRE_LOGIN || !!currentUser}
          />
      )}
      
      {isAiOpen && <AiModal open={isAiOpen} onClose={() => setIsAiOpen(false)} />}

      <div className="hidden md:block fixed bottom-2 right-3 z-50 text-[10px] text-slate-500"><span className="px-2 py-[2px] rounded-full border border-red-600/40 bg-black/70 backdrop-blur">Reload Tracker {APP_VERSION_LABEL}</span></div>
    </div>
  )
}
// src/App.jsx
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import { Purchases } from './components/Purchases'
import { Inventory } from './components/Inventory'
import { Recipes } from './components/Recipes'
import { getAllPurchases, seedData } from './lib/db'
import logo from './assets/logo.png'
import { APP_VERSION_LABEL } from './version'

export default function App() {
  const [activeTab, setActiveTab] = useState('calculator')
  const [purchases, setPurchases] = useState([])
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [ageConfirmed, setAgeConfirmed] = useState(
    typeof window !== 'undefined'
      ? localStorage.getItem('ageConfirmed') === 'true'
      : false
  )

  useEffect(() => {
    const load = async () => {
      await seedData()
      const data = await getAllPurchases()
      setPurchases(data)
    }
    load()
  }, [])

  const refreshPurchases = async () => {
    const data = await getAllPurchases()
    setPurchases(data)
  }

  const confirmAge = () => {
    localStorage.setItem('ageConfirmed', 'true')
    setAgeConfirmed(true)
  }

  const handleUseRecipe = recipe => {
    setSelectedRecipe(recipe)
    setActiveTab('calculator')
  }

  const handleResetLocalData = () => {
    if (typeof window === 'undefined') return

    const ok = window.confirm(
      'This will clear Reload Tracker data on THIS device (purchases, recipes, age gate) and reload the app. It will NOT affect other devices. Continue?'
    )
    if (!ok) return

    try {
      if (window.indexedDB) {
        // DB name used by the app (matches db.js)
        window.indexedDB.deleteDatabase('reload-tracker')
      }
      // Clear local storage keys for this origin
      window.localStorage.clear()
    } catch (err) {
      console.error('Failed to reset local data', err)
      alert(
        'Error clearing local data. You may need to clear site data from your browser settings.'
      )
    } finally {
      window.location.reload()
    }
  }

  if (!ageConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-gray-100 flex items-center justify-center px-4">
        <div className="glass max-w-lg w-full text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-4">
            Reload Tracker
          </p>
          <h1 className="text-3xl md:text-4xl font-black mb-4 glow-red">
            For responsible adult reloaders only.
          </h1>
          <p className="text-sm text-slate-400 mb-8">
            By continuing you confirm you are of legal age to purchase and handle
            reloading components in your jurisdiction.
          </p>
          <button
            onClick={confirmAge}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-red-700 hover:bg-red-600 text-sm font-semibold shadow-lg shadow-red-900/40 transition"
          >
            I am 21 or older
          </button>

          {/* Optional: show version even on age gate */}
          <div className="mt-4 text-[10px] text-slate-600">
            Reload Tracker {APP_VERSION_LABEL}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-gray-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-6xl mx-auto px-4 pt-24 pb-24">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-10">
          {/* Logo on the LEFT */}
          <div className="flex justify-center md:justify-start">
            <img
              src={logo}
              alt="Reload Tracker"
              className="inline-block w-40 md:w-56 drop-shadow-2xl"
            />
          </div>

          {/* Text on the RIGHT */}
          <div className="text-center md:text-right md:flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-red-500/60 mb-3">
              Reload Tracker
            </p>
            <h1 className="text-3xl md:text-4xl font-black glow-red">
              Your Reloading Process Updated
            </h1>
            <p className="text-sm md:text-base text-slate-400 mt-3 md:ml-auto md:pl-10">
              Track your Recipes, Inventory and every penny you spend.
            </p>
          </div>
        </header>

        {activeTab === 'calculator' && (
          <Dashboard
            purchases={purchases}
            selectedRecipe={selectedRecipe}
            onSelectRecipe={handleUseRecipe}
          />
        )}
        {activeTab === 'purchases' && (
          <Purchases onChanged={refreshPurchases} />
        )}
        {activeTab === 'inventory' && <Inventory purchases={purchases} />}
        {activeTab === 'recipes' && (
          <Recipes onUseRecipe={handleUseRecipe} />
        )}
      </main>

      {/* Fixed version + reset badge – small, bottom-right */}
      <div className="fixed bottom-2 right-3 z-50 text-[10px] text-slate-500">
        <div className="flex flex-col items-end gap-1">
          <span className="px-2 py-[2px] rounded-full border border-red-600/40 bg-black/70 backdrop-blur">
            Reload Tracker {APP_VERSION_LABEL}
          </span>
          <button
            type="button"
            onClick={handleResetLocalData}
            className="px-2 py-[2px] rounded-full border border-slate-600/50 bg-black/60 text-[10px] text-slate-400 hover:border-red-600/60 hover:text-red-300 transition"
          >
            Reset local data (this device)
          </button>
        </div>
      </div>
    </div>
  )
}

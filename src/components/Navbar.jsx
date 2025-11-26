// src/components/Navbar.jsx
import { Gauge, ShoppingCart, Package, Beaker } from 'lucide-react'

const MENU_ITEMS = [
  { id: 'calculator', label: 'Calculator', icon: Gauge },
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'recipes', label: 'Recipes', icon: Beaker },
]

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed top-6 right-4 z-50 bg-black/80 backdrop-blur-xl border border-[#b33c3c44] rounded-full px-6 py-3 flex gap-4">
      {MENU_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm md:text-base font-bold transition-all
            ${activeTab === item.id ? 'bg-red-900/70 text-red-400 shadow-lg' : 'hover:bg-white/10 hover:text-red-400'}`}
        >
          <item.icon size={18} />
          <span className="hidden md:inline">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
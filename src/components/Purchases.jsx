import { useState, useEffect } from 'react'
import { openDB } from 'idb'
import { ShoppingCart, Plus } from 'lucide-react'
import { calculatePerUnit } from '../lib/utils'

export function Purchases() {
  const [purchases, setPurchases] = useState([])

  useEffect(() => {
    loadPurchases()
  }, [])

  const loadPurchases = async () => {
    const db = await openDB('reload-tracker')
    const all = await db.getAll('purchases')
    setPurchases(all)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Purchases</h2>
        <button className="glass px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-cyan-500/20 transition">
          <Plus size={20} /> New Purchase
        </button>
      </div>

      <div className="grid gap-4">
        {purchases.map(p => {
          const perUnit = calculatePerUnit(p.price, p.shipping, p.tax, p.qty)
          return (
            <div key={p.id} className="glass rounded-xl p-6">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{p.brand} {p.name}</h3>
                  <p className="text-sm text-slate-400">{p.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-cyan-400">${perUnit.toFixed(3)} / {p.unit === 'lb' ? 'lb' : 'ea'}</p>
                  <p className="text-sm text-slate-400">
                    {p.qty} × ${p.price} + ${p.shipping||0} ship + ${p.tax||0} tax
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
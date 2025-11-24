import { useState, useEffect } from 'react'
import { openDB } from 'idb'
import { Beaker, Plus, Trash2 } from 'lucide-react'

export function Recipes() {
  const [recipes, setRecipes] = useState([])

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    const db = await openDB('reload-tracker')
    const all = await db.getAll('recipes')
    setRecipes(all)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Recipes</h2>
        <button className="glass px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-cyan-500/20 transition">
          <Plus size={20} /> Add Recipe
        </button>
      </div>

      <div className="grid gap-4">
        {recipes.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No recipes yet. Add your first!</p>
        ) : (
          recipes.map(r => (
            <div key={r.id} className="glass rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-cyan-400">{r.caliber} — {r.name}</h3>
                  <div className="mt-3 space-y-1 text-sm">
                    <p><span className="text-slate-400">Powder:</span> {r.powder} @ {r.charge} gr</p>
                    <p><span className="text-slate-400">Bullet:</span> {r.bullet}</p>
                    <p><span className="text-slate-400">Primer:</span> {r.primer}</p>
                    {r.notes && <p className="text-emerald-400 mt-2">→ {r.notes}</p>}
                  </div>
                </div>
                <button className="text-red-400 hover:text-red-300">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
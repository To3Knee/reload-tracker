import { Layers } from 'lucide-react'

export function Lots() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-3">
        <Layers /> Lots
      </h2>
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-6xl font-bold text-emerald-400">$0.142</p>
        <p className="text-xl text-slate-400 mt-4">Cost per 9mm round (current lot)</p>
        <p className="text-sm text-slate-500 mt-8">Lot tracking + historical costs coming in v2</p>
      </div>
    </div>
  )
}
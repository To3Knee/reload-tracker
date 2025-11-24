import { Package } from 'lucide-react'

export function Inventory() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-3">
        <Package /> Inventory
      </h2>
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-6xl font-bold text-cyan-400">2,847</p>
        <p className="text-xl text-slate-400 mt-4">9mm 147gr Subsonic rounds possible</p>
        <p className="text-sm text-slate-500 mt-8">Full inventory tracking coming in v2</p>
      </div>
    </div>
  )
}
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { InfoTip } from '../InfoTip'
import { toPrecisionMoney, toStandardMoney } from './dashboardHelpers'

function BreakdownRow({ label, value }) {
  return (
    <div className="rt-card flex items-center justify-between p-2">
      <span className="text-steel-500 text-[11px]">{label}</span>
      <span className="rt-data text-[11px]" title={toPrecisionMoney(value)}>{toPrecisionMoney(value)}</span>
    </div>
  )
}

export function CostResults({ breakdown, roiStats, lotSize, activeRecipe, activeRecipeLabel, capacity }) {
  return (
    <div className="space-y-6">
      {/* Loadout profile */}
      {activeRecipe && (
        <div className="rt-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl rounded-full" />
          <p className="rt-section-eyebrow mb-2">Loadout Profile</p>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white">{activeRecipeLabel}</h3>
          </div>
          {capacity?.limiting && (
            <div className="mt-3 text-[10px] text-red-400/80 bg-red-900/10 px-3 py-2 rounded-lg border border-red-900/30">
              Limited by <strong>{capacity.limiting.label}</strong>
            </div>
          )}
        </div>
      )}

      {/* Cost card */}
      <div className="glass p-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="rt-section-eyebrow">Cost Analysis</p>
            <InfoTip
              variant="info"
              title="Cost Precision"
              text={`Exact: ${toPrecisionMoney(breakdown?.total.perRound || 0)} / round. Proportioned from component lot prices.`}
              align="right"
            />
          </div>

          <div className="flex items-end justify-between gap-4 border-b border-steel-700 pb-6 mb-6">
            <div>
              <p className="text-sm text-steel-400 flex items-center">
                Per round
                <InfoTip variant="tip" title="Per Round Cost" text="True loaded round cost proportioned from lot prices: powder by grain weight used, bullet/primer/brass by per-unit cost." align="left" />
              </p>
              <p className="text-5xl font-black tracking-tight" style={{ color: 'var(--text-hi)' }}>
                {toStandardMoney(breakdown?.total.perRound)}
              </p>
            </div>
          </div>

          {/* ROI gauge */}
          {roiStats && (
            <div className={`mb-6 p-4 rounded-xl border relative overflow-hidden ${roiStats.isSavings ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
              {roiStats.suspiciousMath && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-500/30 z-20">
                  <AlertTriangle size={10} /> Check Qty
                </div>
              )}
              <div className={`absolute -right-4 -top-4 w-20 h-20 blur-2xl rounded-full ${roiStats.isSavings ? 'bg-emerald-500/20' : 'bg-red-500/20'}`} />
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex-1 min-w-0 pr-4">
                  <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${roiStats.isSavings ? 'text-emerald-400' : 'text-red-400'}`}>
                    {roiStats.isSavings ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {roiStats.isSavings ? ' Value Created' : ' Cost Increase'}
                  </p>
                  <p className="text-xs text-steel-400 mt-0.5 line-clamp-2 leading-tight" title={roiStats.name}>{roiStats.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-black text-white leading-none">{roiStats.label}</p>
                  <p className={`text-[9px] ${roiStats.isSavings ? 'text-emerald-400' : 'text-red-400'}`}>
                    {roiStats.isSavings ? 'Savings' : 'Multiplier'}
                  </p>
                </div>
              </div>
              <div className={`text-sm border-t pt-2 mt-2 ${roiStats.isSavings ? 'text-emerald-200/80 border-emerald-500/20' : 'text-red-200/80 border-red-500/20'}`}>
                {roiStats.isSavings ? 'Save ' : 'Spend '}
                <span className="font-bold text-white">{toStandardMoney(roiStats.diff)}</span>
                {roiStats.isSavings ? ' every time you pull the trigger.' : ' more per shot than factory.'}
              </div>
            </div>
          )}

          {/* Cost table */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-steel-400"><span>Per 20</span><span className="font-semibold text-steel-200">{toStandardMoney(breakdown?.total.per20)}</span></div>
            <div className="flex justify-between text-steel-400"><span>Per 50</span><span className="font-semibold text-steel-200">{toStandardMoney(breakdown?.total.per50)}</span></div>
            <div className="flex justify-between text-steel-400"><span>Per 100</span><span className="font-semibold text-steel-200">{toStandardMoney(breakdown?.total.per100)}</span></div>
            <div className="flex justify-between text-steel-400"><span>Per 1,000</span><span className="font-semibold text-steel-200">{toStandardMoney(breakdown?.total.per1000)}</span></div>
            <div className="flex justify-between text-steel-400 border-t border-steel-700 pt-2 mt-2">
              <span>Cost for {Number(lotSize).toLocaleString()} rounds</span>
              <span className="font-bold" style={{ color: 'var(--text-hi)' }}>{toStandardMoney(breakdown?.total.lot)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="glass p-6">
        <p className="rt-section-eyebrow mb-3 flex items-center">
          Components (Unit Cost)
          <InfoTip variant="info" text="Each component's per-round cost contribution. Powder is priced by grain weight used per charge; bullet, primer, and brass by per-unit lot cost." />
        </p>
        <div className="grid grid-cols-2 gap-3">
          <BreakdownRow label="Powder" value={breakdown?.powder.perRound} />
          <BreakdownRow label="Bullet" value={breakdown?.bullet.perRound} />
          <BreakdownRow label="Primer" value={breakdown?.primer.perRound} />
          <BreakdownRow label="Brass"  value={breakdown?.brass.perRound} />
        </div>
      </div>
    </div>
  )
}

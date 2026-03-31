import { Target, Thermometer, ExternalLink, Calendar, MapPin, Printer, Crosshair, User, Clock } from 'lucide-react'
import { InfoTip } from '../InfoTip'

export function calculateMoa(group, dist) {
  const g = Number(group), d = Number(dist)
  if (!g || !d) return '—'
  return ((g / (d / 100)) * 0.955).toFixed(2) + ' MOA'
}

export function RangeLogCard({
  log,
  highlightId,
  canEdit,
  verifyDeleteId,
  recipes,
  onPrint,
  onEdit,
  onPromptDelete,
  onConfirmDelete,
  onCancelDelete,
}) {
  const isHighlighted = String(highlightId) === String(log.id)

  const getRecipeDisplay = () => {
    if (log.recipeName) return `${log.recipeName} (${log.caliber})`
    const r = recipes.find(x => String(x.id) === String(log.recipeId))
    return r ? `${r.name} (${r.caliber})` : 'Unknown Load'
  }

  return (
    <div
      id={`rangelog-${log.id}`}
      className={`glass p-0 flex flex-col md:flex-row items-stretch overflow-hidden group transition duration-500 ${
        isHighlighted
          ? 'border-copper-500 ring-2 ring-copper-500/50 shadow-[0_0_30px_rgba(196,43,33,0.15)]'
          : 'border-red-500/20'
      }`}
    >
      {/* Image panel */}
      <div className="w-full md:w-48 h-48 md:h-auto bg-black/40 relative flex-shrink-0 border-b md:border-b-0 md:border-r border-steel-700">
        {log.imageUrl ? (
          <div className="relative w-full h-full group-image">
            <img src={log.imageUrl} alt="Target" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
            <a href={log.imageUrl} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-black/60 p-1.5 rounded-full text-steel-300 hover:text-white hover:bg-black/90 transition opacity-0 group-hover:opacity-100">
              <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-steel-700"><Target size={32} /></div>
        )}
        {log.groupSize && (
          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur border border-copper-500/30 px-2 py-1 rounded-md shadow-lg">
            <span className="text-xs font-bold text-steel-200">{log.groupSize}"</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-5 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-bold text-steel-100">{getRecipeDisplay()}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] text-steel-500 flex items-center gap-1"><Calendar size={10} /> {log.date ? log.date.split('T')[0] : 'No Date'}</span>
              {log.batchId    && <span className="px-1.5 py-[1px] rounded bg-steel-700 text-steel-400 border border-steel-600 text-[9px]">Batch #{log.batchId}</span>}
              {log.firearmName && <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-red-900/20 text-red-400 border border-red-900/30"><Crosshair size={10} /> {log.firearmName}</span>}
              {log.location   && <span className="text-[10px] text-steel-500 flex items-center gap-1 ml-2"><MapPin size={10} /> {log.location}</span>}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => onPrint(log)} className="rt-btn rt-btn-ghost hover:text-steel-200 hover:border-steel-500"><Printer size={10} /> Print</button>
            {canEdit && (
              <>
                <button onClick={() => onEdit(log)} className="rt-btn rt-btn-ghost">Edit</button>
                {verifyDeleteId === log.id ? (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => onConfirmDelete(log.id)} className="rt-btn rt-btn-danger">Yes, Delete</button>
                    <button onClick={onCancelDelete} className="rt-btn rt-btn-ghost">No</button>
                  </div>
                ) : (
                  <button onClick={() => onPromptDelete(log.id)} className="rt-btn rt-btn-danger">Remove</button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-black/40 rounded p-2 border border-steel-700/60 text-center">
            <span className="flex items-center justify-center text-[9px] text-steel-500 uppercase tracking-wider mb-0.5">
              Performance
              <InfoTip variant="info" title="MOA" text="Minutes of Angle — 1 MOA ≈ 1 inch at 100 yards. Calculated from group size and distance. Lower is better." size={9} />
            </span>
            <span className="block text-[10px] font-mono text-steel-200">{calculateMoa(log.groupSize, log.distance)}</span>
          </div>
          <div className="bg-black/40 rounded p-2 border border-steel-700/60 text-center">
            <span className="flex items-center justify-center text-[9px] text-steel-500 uppercase tracking-wider mb-0.5">
              Velocity
              <InfoTip variant="info" text="Muzzle velocity in fps measured by chronograph. Used to calculate SD and ES for load consistency analysis." size={9} />
            </span>
            <span className="block text-sm font-bold text-steel-200">{log.velocity || '---'}</span>
            <span className="block text-[9px] text-steel-500">fps</span>
          </div>
          <div className="bg-black/40 rounded p-2 border border-steel-700/60 text-center flex flex-col justify-center">
            <div className="flex justify-between px-2 text-[10px] border-b border-steel-700/50 pb-0.5 mb-0.5">
              <span className="text-steel-500 flex items-center gap-0.5">SD<InfoTip variant="tip" title="Standard Deviation" text="Under 15 fps = excellent. Under 30 fps = acceptable. High SD means inconsistent pressure — check powder charge and seating depth." size={9} side="bottom" /></span>
              <span className="text-steel-300 font-mono">{log.sd || '-'}</span>
            </div>
            <div className="flex justify-between px-2 text-[10px]">
              <span className="text-steel-500 flex items-center gap-0.5">ES<InfoTip variant="info" title="Extreme Spread" text="Difference between fastest and slowest rounds. Under 50 fps is good. High ES points to charge weight inconsistency." size={9} side="bottom" /></span>
              <span className="text-steel-300 font-mono">{log.es || '-'}</span>
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div className="flex flex-wrap gap-4 text-[10px] text-steel-400 border-t border-steel-700/50 pt-2 mt-auto">
          {log.distance && <span className="flex items-center gap-1.5"><Target size={12} className="text-steel-500" /> {log.distance} yds</span>}
          {(log.weather || log.temp) && (
            <span className="flex items-center gap-1.5">
              <Thermometer size={12} className="text-steel-500" />
              {log.weather ? `${log.weather}, ` : ''}{log.temp ? `${log.temp}°` : ''}
            </span>
          )}
        </div>
        {log.notes && <p className="mt-2 text-[11px] text-steel-500 italic border-l-2 border-steel-700 pl-2">"{log.notes}"</p>}

        <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-steel-700/50">
          {log.createdBy && <span className="flex items-center gap-1 text-[9px] text-steel-500"><User size={10} /> Created by {log.createdBy}</span>}
          {log.updatedBy && <span className="flex items-center gap-1 text-[9px] text-steel-500"><Clock size={10} /> Modified by {log.updatedBy}</span>}
        </div>
      </div>
    </div>
  )
}

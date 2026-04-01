import { AlignLeft, Crosshair, User, Clock, ClipboardList, Printer, FileText } from 'lucide-react'
import { PROFILE_TYPES } from './recipeHelpers.jsx'

export function RecipeCard({
  recipe: r,
  canEdit,
  archivingId,
  editingId,
  onUseRecipe,
  onEdit,
  onDelete,
  onArchiveToggle,
  onLoadBatch,
  onExportPdf,
  onExportExcel,
}) {
  const profileLabel = PROFILE_TYPES.find(p => p.value === r.profileType)?.label || 'Custom'
  const isArchived   = typeof r.archived === 'boolean' && r.archived
  const isArchiving  = archivingId === r.id
  const isEditing    = editingId === r.id
  const powder       = r.powderName || (r.powderLotId ? `Powder #${r.powderLotId}` : '')
  const bullet       = r.bulletName || (r.bulletLotId ? `Bullet #${r.bulletLotId}` : '')
  const createdStr   = r.createdByUsername ? `Added by ${r.createdByUsername}` : null
  const updatedStr   = r.updatedByUsername ? `Mod by ${r.updatedByUsername}` : null

  return (
    <div className={`group bg-panel border rounded-xl p-4 flex flex-col gap-3 transition-all hover:bg-scrim min-w-0 ${
      isEditing
        ? 'border-red-500 ring-1 ring-red-500/50 shadow-red-900/20 shadow-lg'
        : 'border-steel-700 hover:border-steel-600'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start min-w-0">
        <div className="min-w-0">
          <div className="text-sm font-bold text-steel-100 flex flex-wrap items-center gap-2">
            <span className="truncate">{r.name}</span>
            {r.caliber && (
              <span className="px-1.5 py-0.5 rounded bg-steel-700 text-[10px] text-steel-300 font-medium whitespace-nowrap">
                {r.caliber}
              </span>
            )}
            {isArchived && (
              <span className="px-1.5 py-0.5 rounded bg-steel-700/50 border border-steel-600/50 text-[9px] uppercase tracking-wider text-steel-400">
                Archived
              </span>
            )}
          </div>
          <div className="text-[11px] text-steel-400 mt-1 flex flex-wrap gap-2 items-center">
            <span className="text-steel-500">{profileLabel}</span>
            <span className="w-1 h-1 rounded-full bg-steel-600" />
            <span className="text-steel-300 font-medium">{r.chargeGrains} gr Charge</span>
          </div>
        </div>
        {r.source && (
          <div className="text-[9px] text-steel-500 uppercase tracking-wide border border-steel-700 px-2 py-0.5 rounded whitespace-nowrap ml-2">
            {r.source}
          </div>
        )}
      </div>

      {/* Components summary */}
      {(powder || bullet) && (
        <div className="text-[10px] text-steel-500 bg-panel-sm rounded-lg px-2 py-1.5 border border-steel-700/50">
          {powder && <span>{powder}</span>}
          {powder && bullet && <span className="mx-1.5 text-steel-600">•</span>}
          {bullet && <span>{bullet}</span>}
        </div>
      )}

      {/* Notes */}
      {(r.notes || r.rangeNotes) && (
        <div className="bg-panel-sm rounded-lg p-2 border border-steel-700/50 text-[10px] text-steel-400 min-w-0">
          {r.notes && (
            <div className="flex items-start gap-1.5 mb-1 last:mb-0">
              <AlignLeft size={10} className="mt-0.5 text-steel-500 flex-shrink-0" />
              <span className="line-clamp-2 break-all">{r.notes}</span>
            </div>
          )}
          {r.rangeNotes && (
            <div className="flex items-start gap-1.5 border-t border-steel-700/50 pt-1 mt-1">
              <Crosshair size={10} className="mt-0.5 text-steel-500 flex-shrink-0" />
              <span className="line-clamp-2 text-steel-400 break-all">{r.rangeNotes}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-steel-700/50 mt-1 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {onUseRecipe && !isArchived && (
            <span onClick={() => onUseRecipe(r)} className="rt-btn rt-btn-confirm">Use in Calculator</span>
          )}
          {canEdit && (
            <span onClick={() => onLoadBatch(r)} className="rt-btn rt-btn-danger">
              <ClipboardList size={12} /> Load Batch
            </span>
          )}
          <span onClick={() => onExportPdf(r)} className="rt-btn rt-btn-ghost hover:text-steel-200 hover:border-steel-500">
            <Printer size={12} /> Export PDF
          </span>
          <span onClick={() => onExportExcel(r)} className="rt-btn rt-btn-ghost hover:text-steel-200 hover:border-steel-500">
            <FileText size={12} /> Export Excel
          </span>
          {canEdit && (
            <>
              <span onClick={() => onEdit(r)} className="rt-btn rt-btn-ghost">Edit</span>
              <span
                onClick={() => { if (!isArchiving) onArchiveToggle(r) }}
                className={`rt-btn rt-btn-ghost border-steel-600 text-steel-400 hover:text-steel-200 ${isArchiving ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isArchiving
                  ? (isArchived ? 'Unarchiving…' : 'Archiving…')
                  : (isArchived ? 'Unarchive' : 'Archive')
                }
              </span>
              <span onClick={() => onDelete(r)} className="rt-btn rt-btn-danger">Delete</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity min-w-0">
          {createdStr && (
            <span className="flex items-center gap-1 px-2 py-[2px] rounded border border-steel-700 text-steel-500 bg-panel text-[9px] truncate max-w-[150px]">
              <User size={9} /> {createdStr}
            </span>
          )}
          {updatedStr && (
            <span className="flex items-center gap-1 px-2 py-[2px] rounded border border-steel-700 text-steel-500 bg-panel text-[9px] truncate max-w-[150px]">
              <Clock size={9} /> {updatedStr}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

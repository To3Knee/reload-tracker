import { useState } from 'react'
import { Info } from 'lucide-react'

export const PROFILE_TYPES = [
  { value: 'range',       label: 'Range / Plinking' },
  { value: 'subsonic',    label: 'Subsonic' },
  { value: 'defense',     label: 'Home / Self Defense' },
  { value: 'competition', label: 'Competition' },
  { value: 'custom',      label: 'Custom / Other' },
]

export const DEFAULT_FORM = {
  name: '', caliber: '', profileType: 'range', source: '', chargeGrains: '', notes: '', rangeNotes: '',
  bulletWeightGr: '', muzzleVelocityFps: '', zeroDistanceYards: '', groupSizeInches: '',
  coal: '', caseCapacity: '', bulletLength: '',
  powderLotId: '', bulletLotId: '', primerLotId: '', caseLotId: ''
}

export function FieldLabel({ label, help }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-1 mb-1">
      <label className="block text-xs font-semibold text-steel-400">{label}</label>
      <div className="relative">
        <Info
          size={10}
          className="text-steel-500 hover:text-cyan-400 cursor-help transition"
          onClick={(e) => { e.stopPropagation(); setShow(!show) }}
        />
        {show && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
            <div className="absolute left-0 bottom-4 w-48 bg-steel-800 border border-steel-600 p-2 rounded-lg shadow-xl z-50 text-[10px] text-steel-300 leading-relaxed">
              {help}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function guessCaseLength(caliber) {
  if (!caliber) return 2.035
  const c = caliber.toLowerCase().replace(/\s+/g, '')
  if (c.includes('9mm') || c.includes('380') || c.includes('makarov')) return 0.754
  if (c.includes('40s&w') || c.includes('40sw')) return 0.850
  if (c.includes('45acp') || c.includes('45auto')) return 0.898
  if (c.includes('10mm')) return 0.992
  if (c.includes('38spl') || c.includes('38special')) return 1.155
  if (c.includes('357mag')) return 1.290
  if (c.includes('300blk') || c.includes('blackout')) return 1.368
  if (c.includes('7.62x39')) return 1.524
  if (c.includes('223') || c.includes('5.56')) return 1.760
  if (c.includes('6.5') || c.includes('creedmoor')) return 1.920
  if (c.includes('308') || c.includes('7.62x51')) return 2.015
  if (c.includes('30-06')) return 2.494
  if (c.includes('300win')) return 2.620
  if (c.includes('338lap')) return 2.724
  return 2.015
}

export function getCaliberDefaults(input) {
  if (!input) return null
  const c = input.toLowerCase().replace(/\s+/g, '')
  if (c.includes('9mm') || c.includes('380') || c.includes('makarov')) return { coal: 1.169, bulletLength: 0.600, caseCapacity: 13.0 }
  if (c.includes('40s&w') || c.includes('40sw'))  return { coal: 1.135, bulletLength: 0.620, caseCapacity: 19.0 }
  if (c.includes('45acp') || c.includes('45auto')) return { coal: 1.275, bulletLength: 0.680, caseCapacity: 25.0 }
  if (c.includes('10mm'))   return { coal: 1.260, bulletLength: 0.650, caseCapacity: 24.0 }
  if (c.includes('357mag')) return { coal: 1.590, bulletLength: 0.700, caseCapacity: 26.0 }
  if (c.includes('38spl'))  return { coal: 1.550, bulletLength: 0.680, caseCapacity: 23.0 }
  if (c.includes('300blk') || c.includes('blackout')) return { coal: 2.260, bulletLength: 1.300, caseCapacity: 24.0 }
  if (c.includes('223') || c.includes('5.56'))    return { coal: 2.260, bulletLength: 0.900, caseCapacity: 28.0 }
  if (c.includes('308') || c.includes('7.62x51')) return { coal: 2.800, bulletLength: 1.200, caseCapacity: 56.0 }
  if (c.includes('6.5') || c.includes('creedmoor')) return { coal: 2.800, bulletLength: 1.350, caseCapacity: 52.0 }
  if (c.includes('30-06'))  return { coal: 3.340, bulletLength: 1.250, caseCapacity: 68.0 }
  if (c.includes('300win')) return { coal: 3.340, bulletLength: 1.400, caseCapacity: 90.0 }
  if (c.includes('338lap')) return { coal: 3.680, bulletLength: 1.700, caseCapacity: 114.0 }
  return null
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
export async function apiDeleteRecipe(id, cascade = false) {
  const res = await fetch(`${API_BASE}/recipes/${id}${cascade ? '?cascade=true' : ''}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (res.status === 409) throw new Error('RECIPE_IN_USE')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Delete failed')
  }
  return true
}

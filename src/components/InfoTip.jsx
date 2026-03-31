//===============================================================
//Script Name: InfoTip.jsx
//Script Location: src/components/InfoTip.jsx
//Date: 2026-03-31
//Created By: T03KNEE / Claude
//About: Reusable tooltip/info tip component.
//       Four color-coded variants signal info type at a glance.
//       Opens on hover (desktop) and tap (mobile).
//===============================================================

import { useState } from 'react'
import { HelpCircle, Zap, AlertTriangle, Info } from 'lucide-react'

const VARIANTS = {
  // steel — general "what is this?" explanations
  info: {
    Icon: HelpCircle,
    iconCls: 'text-steel-500 hover:text-steel-300',
    border: 'border-steel-700',
    tagBg:  'bg-steel-800/60',
    tagTxt: 'text-steel-400',
  },
  // blue — pro tips, workflow hints
  tip: {
    Icon: Zap,
    iconCls: 'text-blue-400/70 hover:text-blue-300',
    border: 'border-blue-900/60',
    tagBg:  'bg-blue-950/60',
    tagTxt: 'text-blue-300',
  },
  // amber — important caveats, things to pay attention to
  caution: {
    Icon: AlertTriangle,
    iconCls: 'text-amber-500/80 hover:text-amber-400',
    border: 'border-amber-900/60',
    tagBg:  'bg-amber-950/60',
    tagTxt: 'text-amber-300',
  },
  // red — safety-critical or data-accuracy warnings
  critical: {
    Icon: Info,
    iconCls: 'text-red-500/80 hover:text-red-400',
    border: 'border-red-900/60',
    tagBg:  'bg-red-950/60',
    tagTxt: 'text-red-300',
  },
}

/**
 * InfoTip — inline icon with a styled tooltip.
 *
 * @param {string}  text     — Body copy shown in the tooltip.
 * @param {string}  [title]  — Optional bold heading row.
 * @param {string}  [variant]  — 'info' | 'tip' | 'caution' | 'critical'
 * @param {number}  [size]   — Icon size in px (default 12).
 * @param {string}  [align]  — 'left' | 'center' | 'right' (tooltip edge relative to icon).
 * @param {string}  [side]   — 'top' | 'bottom' (which side of the icon the tooltip appears).
 */
export function InfoTip({
  text,
  title,
  variant = 'info',
  size = 12,
  align = 'center',
  side = 'top',
}) {
  const [open, setOpen] = useState(false)
  const v = VARIANTS[variant] || VARIANTS.info
  const { Icon, iconCls, border, tagBg, tagTxt } = v

  const posStyle =
    align === 'right' ? { right: 0 } :
    align === 'left'  ? { left: 0 } :
    { left: '50%', transform: 'translateX(-50%)' }

  const sideStyle =
    side === 'bottom'
      ? { top: '100%', marginTop: '8px', bottom: 'auto' }
      : { bottom: '100%', marginBottom: '8px', top: 'auto' }

  return (
    <span
      className="relative inline-flex items-center flex-shrink-0 ml-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
    >
      <Icon
        size={size}
        className={`cursor-help transition-colors duration-150 ${iconCls}`}
      />

      {open && (
        <div
          className={`absolute z-[400] w-64 rounded-md bg-[#06060a] border ${border} shadow-2xl pointer-events-none overflow-hidden`}
          style={{ ...posStyle, ...sideStyle }}
        >
          {title && (
            <div className={`px-3 py-1.5 ${tagBg} border-b ${border} flex items-center gap-1.5`}>
              <Icon size={9} className={tagTxt} />
              <span className={`text-[9px] font-bold uppercase tracking-[0.22em] ${tagTxt}`}>
                {title}
              </span>
            </div>
          )}
          <p className="px-3 py-2.5 text-[11px] text-steel-300 leading-relaxed">{text}</p>
        </div>
      )}
    </span>
  )
}

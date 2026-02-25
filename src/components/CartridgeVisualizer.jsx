//===============================================================
//Script Name: CartridgeVisualizer.jsx
//Script Location: src/components/CartridgeVisualizer.jsx
//Date: 02/25/2026
//Created By: T03KNEE
//Version: 4.1.0 (Fixed orientation — bullet tip at top)
//About: Real-time SVG cutaway diagram engine.
//  Coordinate system: y=0 = bullet TIP (top), y=totalH = case BASE (bottom)
//  LEFT HALF: External profile with extractor groove & rim
//  RIGHT HALF: Internal cross-section (powder grains, primer, bullet core)
//  Accurate ogive geometry per bullet type (Spitzer, RN, BTHP)
//  Deterministic powder grain scatter (density tracks charge/capacity)
//  SAAMI-style dimension callouts (COAL, case length)
//===============================================================

import { useMemo } from 'react'

/* ── CONSTANTS ─────────────────────────────────────────────── */
const W     = 200   // SVG viewport width (user units)
const CX    = 100   // centre-x
const SCALE = 68    // pixels per inch

/* ── BULLET TYPE CLASSIFIER ────────────────────────────────── */
function classifyBullet(caliber = '', bulletLen = 0, diameter = 0.308) {
  const c = caliber.toLowerCase()
  const ratio = diameter > 0 ? bulletLen / diameter : 3
  const isRifle = ratio > 2.5
    || c.includes('.22') || c.includes('.223') || c.includes('.308')
    || c.includes('6.5') || c.includes('300') || c.includes('.30')
    || c.includes('7.62') || c.includes('338') || c.includes('30-06')
  if (!isRifle) return 'rn'
  if (ratio > 3.8) return 'bthp'
  return 'spitzer'
}

/* ── GEOMETRY CALCULATOR ───────────────────────────────────── */
// All y values use the corrected system: y=0 = bullet tip, y=totalH = case base
function calcGeometry(bulletLen, caseLen, diameter, coal, charge, capacity, caliber) {
  const dia  = Math.max(0.172, Number(diameter) || 0.308)
  const cLen = Math.max(0.5,   Number(caseLen)  || estimateCaseLen(caliber, dia))
  const bLen = Math.max(0.15,  Number(bulletLen) || dia * 3.2)
  const ovr  = Math.max(cLen + bLen * 0.4, Number(coal) || cLen + bLen * 0.6)
  const chg  = Math.max(0,    Number(charge)    || 0)
  const cap  = Math.max(1,    Number(capacity)  || estimateCapacity(dia, cLen))

  const isPistol = cLen < 1.5 && dia >= 0.355

  // Scaled pixel dimensions
  const totalH  = ovr  * SCALE   // y=0 → tip, y=totalH → case base
  const caseH   = cLen * SCALE
  const bulletH = bLen * SCALE
  const baseW   = (isPistol ? dia + 0.02 : 0.470) * SCALE
  const neckW   = (dia + 0.012) * SCALE
  const rimW    = (isPistol ? dia + 0.04 : 0.480) * SCALE
  const rimH    = 0.06 * SCALE
  const grooveH = 0.06 * SCALE
  const grooveW = (isPistol ? dia - 0.02 : 0.450) * SCALE
  const neckLen = isPistol ? 0 : Math.min(dia, cLen * 0.18)

  // In OLD system: shoulderY = (cLen - neckLen - 0.05)*SCALE measured from case BASE
  // In NEW system: these are y-values from bullet tip downward
  const caseTopY    = totalH - caseH     // y of case mouth
  const neckStartY  = isPistol ? caseTopY : (totalH - (cLen - neckLen) * SCALE)
  const shoulderY   = isPistol ? caseTopY : (totalH - (cLen - neckLen - 0.05) * SCALE)

  // Powder fill (fills from case base upward)
  const fillRatio  = cap > 0 ? Math.min(1.1, chg / cap) : 0
  const powderTopY = totalH - caseH * 0.88 * Math.min(1.0, fillRatio)  // y of powder top

  const seatingDepth = Math.max(0, cLen - (ovr - bLen))
  const bulletType   = classifyBullet(caliber, bLen / SCALE, dia)

  return {
    totalH, caseH, bulletH, baseW, neckW, rimW, rimH,
    grooveH, grooveW, caseTopY, neckStartY, shoulderY,
    powderTopY, fillRatio, seatingDepth,
    isPistol, bulletType, dia,
    fillPct:  Math.round(fillRatio * 100),
    coalIn:   ovr.toFixed(3),
    seatIn:   seatingDepth.toFixed(3),
  }
}

function estimateCaseLen(caliber = '', dia = 0.308) {
  const c = caliber.toLowerCase()
  if (c.includes('9mm') || c.includes('9x19'))         return 0.754
  if (c.includes('45acp') || c.includes('45 acp'))     return 0.898
  if (c.includes('40s&w') || c.includes('.40'))        return 0.850
  if (c.includes('10mm'))                               return 0.992
  if (c.includes('357mag'))                             return 1.290
  if (c.includes('38spl'))                              return 1.155
  if (c.includes('.223') || c.includes('5.56'))        return 1.760
  if (c.includes('300blk') || c.includes('blackout'))  return 1.368
  if (c.includes('.308') || c.includes('7.62x51'))     return 2.015
  if (c.includes('6.5') || c.includes('creedmoor'))    return 1.920
  if (c.includes('30-06'))                              return 2.494
  if (c.includes('300win'))                             return 2.620
  if (c.includes('338lap'))                             return 2.724
  return dia < 0.35 ? 1.76 : 2.015
}

function estimateCapacity(dia = 0.308, cLen = 2.0) {
  const r = dia / 2
  return Math.round(Math.PI * r * r * cLen * 25 * 0.85)
}

/* ── DETERMINISTIC PRNG ─────────────────────────────────────── */
function seededRandom(seed) {
  let s = seed + 2654435761
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5
    return ((s >>> 0) / 0xFFFFFFFF)
  }
}

/* ── POWDER GRAINS ─────────────────────────────────────────── */
// Grains scatter in the right-half interior, from powderTopY down to totalH
function buildPowderGrains(powderTopY, totalH, neckW, baseW, fillRatio, chargeKey) {
  if (fillRatio <= 0 || (totalH - powderTopY) <= 4) return []
  const rand   = seededRandom(Math.round((chargeKey || 0) * 100))
  const count  = Math.min(120, Math.round(fillRatio * 90 + 10))
  const margin = 6
  const innerW = baseW * 0.5 - margin
  const grains = []
  for (let i = 0; i < count; i++) {
    const rx = CX + margin + rand() * innerW
    const ry = powderTopY + rand() * (totalH - powderTopY - 4) + 2
    if (ry < powderTopY + 1 || ry > totalH - 3) continue
    grains.push({ x: rx, y: ry, r: 1.3 + rand() * 0.8 })
  }
  return grains
}

/* ── BULLET PATH BUILDER ────────────────────────────────────── */
// y=0 = bullet TIP, y=bulletH = bullet BASE (contacts case mouth / seated in neck)
function buildBulletPaths(g) {
  const { bulletH, neckW, bulletType } = g
  const bW   = neckW * 0.5
  const bTop = 0          // tip at y=0 (top of SVG)
  const bBase = bulletH   // base at y=bulletH
  const midY  = bulletH * 0.62   // dome / ogive transition point
  const jacketThick = Math.max(1.5, bW * 0.12)

  let leftPath = '', rightJacket = '', rightCore = ''

  if (bulletType === 'rn') {
    // Round-nose dome (pistol)
    leftPath = `M ${CX - bW} ${bBase} L ${CX - bW} ${midY} Q ${CX} ${bW * 0.18} ${CX} ${bTop} Z`
    rightJacket = `M ${CX} ${bTop} Q ${CX} ${bW * 0.18} ${CX + bW} ${midY}
      L ${CX + bW} ${bBase} L ${CX + bW - jacketThick} ${bBase}
      L ${CX + bW - jacketThick} ${midY + jacketThick * 0.6}
      Q ${CX} ${bW * 0.18 + jacketThick * 1.4} ${CX + jacketThick} ${jacketThick} Z`
    rightCore = `M ${CX + jacketThick} ${jacketThick}
      Q ${CX} ${bW * 0.18 + jacketThick * 1.4}
      ${CX + bW - jacketThick} ${midY + jacketThick * 0.6}
      L ${CX + bW - jacketThick} ${bBase} L ${CX} ${bBase} Z`

  } else if (bulletType === 'spitzer') {
    // Spitzer tangent ogive
    const ogiveKnee = bulletH * 0.52
    leftPath = `M ${CX - bW} ${bBase} L ${CX - bW} ${ogiveKnee} L ${CX - 1} ${bTop} L ${CX} ${bTop} Z`
    rightJacket = `M ${CX} ${bTop} L ${CX + 1} ${bTop} L ${CX + bW} ${ogiveKnee}
      L ${CX + bW} ${bBase} L ${CX + bW - jacketThick} ${bBase}
      L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick}
      L ${CX + jacketThick} ${jacketThick * 2} Z`
    rightCore = `M ${CX + jacketThick} ${jacketThick * 2}
      L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick}
      L ${CX + bW - jacketThick} ${bBase} L ${CX} ${bBase} Z`

  } else {
    // BTHP — boat-tail hollow point
    const boatH   = bulletH * 0.12
    const boatW   = bW * 0.78
    const hpDepth = bulletH * 0.20
    const hpW     = bW * 0.44
    const ogiveKnee = bulletH * 0.46
    leftPath = `M ${CX - boatW} ${bBase} L ${CX - bW} ${bBase - boatH}
      L ${CX - bW} ${ogiveKnee} L ${CX - 1} ${bTop} L ${CX} ${bTop} Z`
    rightJacket = `M ${CX} ${bTop} L ${CX + 1} ${bTop}
      L ${CX + bW} ${ogiveKnee} L ${CX + bW} ${bBase - boatH}
      L ${CX + boatW} ${bBase} L ${CX + boatW - jacketThick} ${bBase}
      L ${CX + bW - jacketThick} ${bBase - boatH}
      L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick}
      L ${CX + hpW} ${hpDepth} L ${CX + jacketThick * 0.6} ${hpDepth} Z`
    rightCore = `M ${CX + jacketThick * 0.6} ${hpDepth} L ${CX + hpW} ${hpDepth}
      L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick}
      L ${CX + bW - jacketThick} ${bBase - boatH}
      L ${CX + boatW - jacketThick} ${bBase} L ${CX} ${bBase} Z`
  }

  return { leftPath, rightJacket, rightCore }
}

/* ── CASE PATH BUILDER ──────────────────────────────────────── */
// Case mouth at y=caseTopY, case base at y=totalH, rim below at y > totalH
function buildCasePaths(g) {
  const { totalH, caseH, baseW, neckW, rimW, rimH, grooveH, grooveW,
          caseTopY, neckStartY, shoulderY, isPistol } = g
  const bHalf = baseW  / 2
  const nHalf = neckW  / 2
  const rHalf = rimW   / 2
  const gHalf = grooveW / 2

  // External left profile (case mouth at top, rim at bottom)
  const extLeft = [
    `M ${CX} ${caseTopY}`,
    `L ${CX - nHalf} ${caseTopY}`,
    isPistol
      ? `L ${CX - nHalf} ${totalH}`
      : `L ${CX - nHalf} ${neckStartY} L ${CX - bHalf} ${shoulderY} L ${CX - bHalf} ${totalH}`,
    `L ${CX - bHalf} ${totalH + grooveH}`,
    `L ${CX - gHalf} ${totalH + grooveH}`,
    `L ${CX - gHalf} ${totalH + grooveH * 1.6}`,
    `L ${CX - rHalf} ${totalH + grooveH * 1.6}`,
    `L ${CX - rHalf} ${totalH + rimH + grooveH * 1.6}`,
    `L ${CX} ${totalH + rimH + grooveH * 1.6}`,
    'Z',
  ].join(' ')

  // External right profile (for partial outer wall visibility in cutaway)
  const extRight = [
    `M ${CX} ${caseTopY}`,
    `L ${CX + nHalf} ${caseTopY}`,
    isPistol
      ? `L ${CX + nHalf} ${totalH}`
      : `L ${CX + nHalf} ${neckStartY} L ${CX + bHalf} ${shoulderY} L ${CX + bHalf} ${totalH}`,
    `L ${CX + bHalf} ${totalH + grooveH}`,
    `L ${CX + gHalf} ${totalH + grooveH}`,
    `L ${CX + gHalf} ${totalH + grooveH * 1.6}`,
    `L ${CX + rHalf} ${totalH + grooveH * 1.6}`,
    `L ${CX + rHalf} ${totalH + rimH + grooveH * 1.6}`,
    `L ${CX} ${totalH + rimH + grooveH * 1.6}`,
    'Z',
  ].join(' ')

  // Interior cavity (right/cutaway side, inset by wall thickness)
  const wallThick = 3.5
  const intRight = [
    `M ${CX} ${caseTopY + 2}`,
    `L ${CX + nHalf - wallThick} ${caseTopY + 2}`,
    isPistol
      ? `L ${CX + nHalf - wallThick} ${totalH - 2}`
      : `L ${CX + nHalf - wallThick} ${neckStartY} L ${CX + bHalf - wallThick} ${shoulderY} L ${CX + bHalf - wallThick} ${totalH - 2}`,
    `L ${CX} ${totalH - 2}`,
    'Z',
  ].join(' ')

  const primerR = Math.max(2, grooveW * 0.22)
  return { extLeft, extRight, intRight, primerR }
}

/* ── DIMENSION LINE ─────────────────────────────────────────── */
function DimLine({ x, y1, y2, label, side = 'right', color = '#555c6a' }) {
  const xOff   = side === 'right' ? x + 8 : x - 8
  const textX  = side === 'right' ? xOff + 3 : xOff - 3
  const anchor = side === 'right' ? 'start' : 'end'
  const midY   = (y1 + y2) / 2
  return (
    <g>
      <line x1={x} y1={y1} x2={xOff} y2={y1} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={x} y1={y2} x2={xOff} y2={y2} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={xOff} y1={y1} x2={xOff} y2={y2} stroke={color} strokeWidth="0.7" />
      <line x1={xOff - 2} y1={y1} x2={xOff + 2} y2={y1} stroke={color} strokeWidth="0.7" />
      <line x1={xOff - 2} y1={y2} x2={xOff + 2} y2={y2} stroke={color} strokeWidth="0.7" />
      <text x={textX} y={midY} fontSize="6" fill={color} textAnchor={anchor} dominantBaseline="middle"
            style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.03em' }}>
        {label}
      </text>
    </g>
  )
}

/* ── MAIN COMPONENT ─────────────────────────────────────────── */
export function CartridgeVisualizer({
  bulletLength = 0,
  caseLength   = 0,
  diameter     = 0.308,
  coal         = 0,
  charge       = 0,
  capacity     = 56,
  caliber      = '',
}) {
  const g = useMemo(
    () => calcGeometry(bulletLength, caseLength, diameter, coal, charge, capacity, caliber),
    [bulletLength, caseLength, diameter, coal, charge, capacity, caliber]
  )

  const bullets = useMemo(() => buildBulletPaths(g), [g])
  const cases   = useMemo(() => buildCasePaths(g),   [g])
  const grains  = useMemo(
    () => buildPowderGrains(g.powderTopY, g.totalH, g.neckW, g.baseW, g.fillRatio, charge),
    [g.powderTopY, g.totalH, g.neckW, g.baseW, g.fillRatio, charge]
  )

  // ViewBox: y=−4 (just above bullet tip) → y=totalH+rimTotal+8 (below rim)
  const rimTotal   = g.rimH + g.grooveH * 2.6
  const viewTop    = -4
  const viewBottom = g.totalH + rimTotal + 8
  const viewH      = viewBottom - viewTop
  const clipY      = viewTop - 6
  const clipH      = viewH + 12

  const fillWarning = g.fillRatio > 0.95
  const seatWarning = g.seatingDepth < 0.05 && g.seatingDepth > 0

  return (
    <div className="w-full h-full flex flex-col bg-[#080808] rounded-lg border border-[#1e1e1e] overflow-hidden relative">

      {/* ── HUD OVERLAY ── */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10 pointer-events-none">
        <div className="space-y-0.5">
          <div className="text-[8px] font-mono font-bold text-[#555c6a] uppercase tracking-[0.15em]">
            LOAD <span className="text-[#d4a843]">{Number(charge || 0).toFixed(1)} gr</span>
          </div>
          <div className={`text-[8px] font-mono font-bold uppercase tracking-[0.15em] ${fillWarning ? 'text-red-500 animate-pulse' : 'text-[#22c55e]'}`}>
            FILL <span>{g.fillPct}%</span>
          </div>
        </div>
        <div className="space-y-0.5 text-right">
          <div className="text-[8px] font-mono font-bold text-[#555c6a] uppercase tracking-[0.15em]">
            COAL <span className="text-[#d4a843]">{g.coalIn}"</span>
          </div>
          <div className={`text-[8px] font-mono font-bold uppercase tracking-[0.15em] ${seatWarning ? 'text-amber-400' : 'text-[#555c6a]'}`}>
            GRIP <span className="text-[#d4a843]">{g.seatIn}"</span>
          </div>
        </div>
      </div>

      {/* ── SVG DIAGRAM ── */}
      <svg
        width="100%"
        height="100%"
        viewBox={`${CX - g.baseW / 2 - 28} ${viewTop} ${g.baseW + 56} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Brass gradient — warm metallic */}
          <linearGradient id="cvBrass" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#4a2e08" />
            <stop offset="18%"  stopColor="#9a6820" />
            <stop offset="40%"  stopColor="#d4a843" />
            <stop offset="60%"  stopColor="#c49528" />
            <stop offset="82%"  stopColor="#9a6820" />
            <stop offset="100%" stopColor="#4a2e08" />
          </linearGradient>

          {/* Copper bullet jacket */}
          <linearGradient id="cvCopper" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#3a1a04" />
            <stop offset="25%"  stopColor="#8b4a18" />
            <stop offset="50%"  stopColor="#c87941" />
            <stop offset="75%"  stopColor="#8b4a18" />
            <stop offset="100%" stopColor="#3a1a04" />
          </linearGradient>

          {/* Lead core */}
          <linearGradient id="cvLead" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#1a1a1a" />
            <stop offset="35%"  stopColor="#4a4a4a" />
            <stop offset="60%"  stopColor="#686868" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>

          {/* Interior cavity background */}
          <linearGradient id="cvInterior" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#0e0e0e" />
            <stop offset="50%"  stopColor="#181410" />
            <stop offset="100%" stopColor="#0e0e0e" />
          </linearGradient>

          {/* Primer (radial) */}
          <radialGradient id="cvPrimer" cx="50%" cy="40%" r="50%">
            <stop offset="0%"   stopColor="#888" />
            <stop offset="60%"  stopColor="#555" />
            <stop offset="100%" stopColor="#222" />
          </radialGradient>

          {/* Clip: right half only (x ≥ CX) */}
          <clipPath id="cvRightHalf">
            <rect x={CX} y={clipY} width={W} height={clipH} />
          </clipPath>
          {/* Clip: left half only (x < CX) */}
          <clipPath id="cvLeftHalf">
            <rect x={CX - W} y={clipY} width={W} height={clipH} />
          </clipPath>
        </defs>

        {/* ── BACKGROUND ── */}
        <rect x={CX - g.baseW / 2 - 28} y={viewTop} width={g.baseW + 56} height={viewH}
              fill="url(#cvInterior)" />
        <pattern id="cvGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#181818" strokeWidth="0.4" />
        </pattern>
        <rect x={CX - g.baseW / 2 - 28} y={viewTop} width={g.baseW + 56} height={viewH}
              fill="url(#cvGrid)" />

        {/* ── CENTRE DIVIDER ── */}
        <line x1={CX} y1={viewTop} x2={CX} y2={viewBottom}
              stroke="#2a2a2a" strokeWidth="0.5" strokeDasharray="3,3" />

        {/* ── CASE — LEFT external profile ── */}
        <path d={cases.extLeft} fill="url(#cvBrass)" stroke="#9a6820" strokeWidth="0.8"
              clipPath="url(#cvLeftHalf)" />

        {/* ── CASE — RIGHT outer wall (ghost, cutaway side) ── */}
        <path d={cases.extRight} fill="url(#cvBrass)" stroke="#9a6820" strokeWidth="0.8"
              clipPath="url(#cvRightHalf)" opacity="0.30" />

        {/* ── CASE INTERIOR — right cutaway ── */}
        <path d={cases.intRight} fill="#0c0a08" clipPath="url(#cvRightHalf)" />

        {/* ── POWDER GRAINS ── */}
        {grains.map((gr, i) => (
          <circle key={i} cx={gr.x} cy={gr.y} r={gr.r} fill="#d8d4d0" opacity="0.65" />
        ))}

        {/* Powder surface line */}
        {g.fillRatio > 0.02 && (
          <line x1={CX + 3} y1={g.powderTopY} x2={CX + g.neckW / 2 - 5} y2={g.powderTopY}
                stroke="#b87333" strokeWidth="0.6" opacity="0.4" />
        )}

        {/* ── PRIMER POCKET ── */}
        <ellipse cx={CX + cases.primerR * 1.5} cy={g.totalH - 3}
                 rx={cases.primerR} ry={cases.primerR * 0.55}
                 fill="url(#cvPrimer)" clipPath="url(#cvRightHalf)" />
        {/* Flash hole */}
        <line x1={CX + cases.primerR * 1.5} y1={g.totalH - 3}
              x2={CX + cases.primerR * 1.5} y2={g.totalH - 12}
              stroke="#1a1a1a" strokeWidth="1.2" clipPath="url(#cvRightHalf)" />

        {/* ── BULLET — LEFT external ── */}
        <path d={bullets.leftPath} fill="url(#cvCopper)" stroke="#7a4010" strokeWidth="0.8"
              clipPath="url(#cvLeftHalf)" />

        {/* ── BULLET — RIGHT jacket ── */}
        <path d={bullets.rightJacket} fill="url(#cvCopper)" stroke="#7a4010" strokeWidth="0.6"
              clipPath="url(#cvRightHalf)" opacity="0.9" />

        {/* ── BULLET — RIGHT core (lead) ── */}
        <path d={bullets.rightCore} fill="url(#cvLead)" clipPath="url(#cvRightHalf)" />

        {/* ── CASE MOUTH EDGE ── */}
        <line x1={CX - g.neckW / 2} y1={g.caseTopY}
              x2={CX + g.neckW / 2} y2={g.caseTopY}
              stroke="#d4a843" strokeWidth="1" opacity="0.6" />

        {/* ── DIMENSION CALLOUTS ── */}
        {/* COAL — right side: tip (y=0) to base (y=totalH) */}
        <DimLine
          x={CX + g.baseW / 2 + 4}
          y1={0}
          y2={g.totalH}
          label={`${g.coalIn}"`}
          side="right"
          color="#b87333"
        />
        {/* Case length — left side: case mouth to case base */}
        <DimLine
          x={CX - g.baseW / 2 - 4}
          y1={g.caseTopY}
          y2={g.totalH}
          label={`${(g.caseH / SCALE).toFixed(3)}"`}
          side="left"
          color="#555c6a"
        />

        {/* ── EXT / CUT LABELS ── */}
        <text x={CX - 3} y={g.caseTopY + 8} fontSize="5" fill="#333" textAnchor="end"
              style={{ fontFamily: 'monospace' }}>EXT</text>
        <text x={CX + 3} y={g.caseTopY + 8} fontSize="5" fill="#333" textAnchor="start"
              style={{ fontFamily: 'monospace' }}>CUT</text>
      </svg>

      {/* ── BOTTOM STATUS BAR ── */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between pointer-events-none">
        <span className="text-[7px] font-mono text-[#333] uppercase tracking-[0.2em]">
          {caliber ? caliber.toUpperCase() : 'NO CALIBER'}
        </span>
        <span className={`text-[7px] font-mono font-bold uppercase tracking-[0.15em]
          ${fillWarning ? 'text-red-600' : g.fillRatio > 0 ? 'text-[#22c55e]/60' : 'text-[#333]'}`}>
          {fillWarning ? '⚠ COMPRESSED' : g.fillRatio > 0 ? 'NOMINAL' : 'EMPTY'}
        </span>
      </div>
    </div>
  )
}

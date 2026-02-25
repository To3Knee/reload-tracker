//===============================================================
//Script Name: CartridgeVisualizer.jsx
//Script Location: src/components/CartridgeVisualizer.jsx
//Date: 02/25/2026
//Created By: T03KNEE
//Version: 4.0.0 (Technical Cutaway Diagram)
//About: Real-time SVG cutaway diagram engine.
//  - LEFT HALF: External profile with extractor groove & rim
//  - RIGHT HALF: Internal cross-section (powder grains, primer, bullet core)
//  - Accurate ogive geometry per bullet type (Spitzer, RN, FP, BTHP)
//  - Deterministic powder grain scatter (density tracks charge/capacity)
//  - SAAMI-style dimension callouts (COAL, case length, seating depth)
//  - Straight-wall pistol vs bottleneck rifle detection
//===============================================================

import { useMemo } from 'react'

/* ── CONSTANTS ─────────────────────────────────────────────── */
const W  = 200   // SVG viewport width  (user units)
const CX = 100   // centre-x
const SCALE = 68 // pixels per inch (governs all proportions)

/* ── BULLET TYPE CLASSIFIER ────────────────────────────────── */
function classifyBullet(caliber = '', bulletLen = 0, diameter = 0.308) {
  const c = caliber.toLowerCase()
  const ratio = diameter > 0 ? bulletLen / diameter : 3
  // Rifle check
  const isRifle = ratio > 2.5 || c.includes('.22') || c.includes('.223') || c.includes('.308')
    || c.includes('6.5') || c.includes('300') || c.includes('.30') || c.includes('7.62')
    || c.includes('338') || c.includes('30-06')
  if (!isRifle) return 'rn'         // pistol → round-nose dome
  if (ratio > 3.8) return 'bthp'   // long heavy match bullet
  return 'spitzer'                   // standard rifle spitzer
}

/* ── GEOMETRY CALCULATOR ───────────────────────────────────── */
function calcGeometry(bulletLen, caseLen, diameter, coal, charge, capacity, caliber) {
  const dia  = Math.max(0.172, Number(diameter) || 0.308)
  const cLen = Math.max(0.5,  Number(caseLen)  || estimateCaseLen(caliber, dia))
  const bLen = Math.max(0.15, Number(bulletLen) || dia * 3.2)
  const ovr  = Math.max(cLen + bLen * 0.4, Number(coal) || cLen + bLen * 0.6)
  const chg  = Math.max(0, Number(charge)   || 0)
  const cap  = Math.max(1, Number(capacity) || estimateCapacity(dia, cLen))

  // Pistol: neck ≈ body width, no real shoulder taper
  const isPistol = cLen < 1.5 && dia >= 0.355
  const isRimless = true  // most modern cartridges

  // Scaled dimensions
  const totalH     = ovr  * SCALE
  const caseH      = cLen * SCALE
  const bulletH    = bLen * SCALE
  const baseW      = (isPistol ? dia + 0.02 : 0.470) * SCALE
  const neckW      = (dia + 0.012) * SCALE
  const rimW       = (isPistol ? dia + 0.04 : 0.480) * SCALE
  const rimH       = 0.06  * SCALE
  const grooveH    = 0.06  * SCALE
  const grooveW    = (isPistol ? dia - 0.02 : 0.450) * SCALE
  const neckLen    = isPistol ? 0 : Math.min(dia, cLen * 0.18)
  const shoulderY  = isPistol ? caseH : (cLen - neckLen - 0.05) * SCALE
  const neckStartY = isPistol ? caseH : (cLen - neckLen) * SCALE

  // Powder fill
  const fillRatio   = cap > 0 ? Math.min(1.1, chg / cap) : 0
  const powderTopY  = caseH * 0.88 * Math.min(1.0, fillRatio)

  // Seating depth
  const bulletBaseInCase = ovr - bLen
  const seatingDepth     = Math.max(0, cLen - bulletBaseInCase)

  const bulletType = classifyBullet(caliber, bLen / SCALE, dia)

  return {
    totalH, caseH, bulletH, baseW, neckW, rimW, rimH,
    grooveH, grooveW, neckLen, shoulderY, neckStartY,
    powderTopY, fillRatio, seatingDepth,
    isPistol, bulletType, dia,
    fillPct: Math.round(fillRatio * 100),
    coalIn:  ovr.toFixed(3),
    seatIn:  seatingDepth.toFixed(3),
  }
}

function estimateCaseLen(caliber = '', dia = 0.308) {
  const c = caliber.toLowerCase()
  if (c.includes('9mm') || c.includes('9x19'))  return 0.754
  if (c.includes('45acp') || c.includes('45 acp')) return 0.898
  if (c.includes('40s&w') || c.includes('.40'))  return 0.850
  if (c.includes('10mm'))                         return 0.992
  if (c.includes('357mag'))                       return 1.290
  if (c.includes('38spl'))                        return 1.155
  if (c.includes('.223') || c.includes('5.56'))   return 1.760
  if (c.includes('300blk') || c.includes('blackout')) return 1.368
  if (c.includes('.308') || c.includes('7.62x51')) return 2.015
  if (c.includes('6.5') || c.includes('creedmoor')) return 1.920
  if (c.includes('30-06'))                        return 2.494
  if (c.includes('300win'))                       return 2.620
  if (c.includes('338lap'))                       return 2.724
  return dia < 0.35 ? 1.76 : 2.015
}

function estimateCapacity(dia = 0.308, cLen = 2.0) {
  // Rough approximation: πr²·cLen * fill fraction
  const r = dia / 2
  return Math.round(Math.PI * r * r * cLen * 25 * 0.85)
}

/* ── DETERMINISTIC PSEUDO-RANDOM ────────────────────────────── */
// Seeded by charge weight so grain positions are stable between renders
function seededRandom(seed) {
  let s = seed + 2654435761
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5
    return ((s >>> 0) / 0xFFFFFFFF)
  }
}

function buildPowderGrains(powderTopY, caseH, neckW, baseW, fillRatio, chargeKey) {
  if (fillRatio <= 0 || powderTopY <= 4) return []
  const rand  = seededRandom(Math.round((chargeKey || 0) * 100))
  const grains = []
  const count  = Math.min(120, Math.round(fillRatio * 90 + 10))
  const margin = 6
  const innerW = baseW * 0.5 - margin   // half-width of case interior at body

  for (let i = 0; i < count; i++) {
    // scatter within the right-half interior (x > CX)
    const rx = CX + margin + rand() * innerW
    const ry = (rand() * powderTopY * 0.94) + 3
    if (ry < 3 || ry > powderTopY) continue
    grains.push({ x: rx, y: ry, r: 1.3 + rand() * 0.8 })
  }
  return grains
}

/* ── BULLET PATH BUILDER ────────────────────────────────────── */
function buildBulletPaths(g) {
  const { bulletH, neckW, totalH, caseH, isPistol, bulletType } = g
  const bW = neckW * 0.5   // bullet half-width = neck half-width
  const bTop = totalH       // tip of bullet (SVG y=0 is top)
  const bBase = totalH - bulletH  // base of bullet
  const midY  = bBase + bulletH * 0.35

  // Left half (external profile, mirror of right)
  // Right half (interior cutaway — jacket wall + lead core)
  const jacketThick = Math.max(1.5, bW * 0.12)

  let leftPath = '', rightJacket = '', rightCore = ''

  if (bulletType === 'rn') {
    // Round-nose dome: hemispherical tip
    const ctrlY = bTop + bW * 0.2  // control point slightly above bTop for dome
    leftPath = `M ${CX - bW} ${bBase} L ${CX - bW} ${midY} Q ${CX} ${bTop + bW * 0.15} ${CX} ${bTop} Z`
    rightJacket = `M ${CX} ${bTop} Q ${CX} ${bTop + bW * 0.15} ${CX + bW} ${midY} L ${CX + bW} ${bBase} L ${CX + bW - jacketThick} ${bBase} L ${CX + bW - jacketThick} ${midY + jacketThick} Q ${CX} ${bTop + bW * 0.15 + jacketThick * 1.5} ${CX + jacketThick} ${bTop + jacketThick} Z`
    rightCore = `M ${CX + jacketThick} ${bTop + jacketThick} Q ${CX} ${bTop + bW * 0.15 + jacketThick * 1.5} ${CX + bW - jacketThick} ${midY + jacketThick} L ${CX + bW - jacketThick} ${bBase} L ${CX} ${bBase} Z`

  } else if (bulletType === 'spitzer') {
    // Spitzer: tangent ogive — straight taper to near-tip, then rounded point
    const ogiveKnee = bBase + bulletH * 0.5  // where taper starts to curve
    leftPath = `M ${CX - bW} ${bBase} L ${CX - bW} ${ogiveKnee} L ${CX - 1} ${bTop} L ${CX} ${bTop} Z`
    rightJacket = `M ${CX} ${bTop} L ${CX + 1} ${bTop} L ${CX + bW} ${ogiveKnee} L ${CX + bW} ${bBase} L ${CX + bW - jacketThick} ${bBase} L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick} L ${CX + jacketThick} ${bTop + jacketThick * 2} Z`
    rightCore = `M ${CX + jacketThick} ${bTop + jacketThick * 2} L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick} L ${CX + bW - jacketThick} ${bBase} L ${CX} ${bBase} Z`

  } else {
    // BTHP: boat-tail base + hollow point cavity
    const boatH   = bulletH * 0.12
    const boatW   = bW * 0.78   // narrower at heel
    const hpDepth = bulletH * 0.22
    const hpW     = bW * 0.45
    const ogiveKnee = bBase + bulletH * 0.55

    leftPath  = `M ${CX - boatW} ${bBase} L ${CX - bW} ${bBase + boatH} L ${CX - bW} ${ogiveKnee} L ${CX - 1} ${bTop} L ${CX} ${bTop} Z`
    rightJacket = `M ${CX} ${bTop} L ${CX + 1} ${bTop} L ${CX + bW} ${ogiveKnee} L ${CX + bW} ${bBase + boatH} L ${CX + boatW} ${bBase}
      L ${CX + boatW - jacketThick} ${bBase} L ${CX + bW - jacketThick} ${bBase + boatH} L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick}
      L ${CX + hpW} ${bTop + hpDepth} L ${CX + jacketThick * 0.6} ${bTop + hpDepth} Z`
    // HP cavity
    rightCore = `M ${CX + jacketThick * 0.6} ${bTop + hpDepth} L ${CX + hpW} ${bTop + hpDepth} L ${CX + bW - jacketThick} ${ogiveKnee + jacketThick} L ${CX + bW - jacketThick} ${bBase + boatH} L ${CX + boatW - jacketThick} ${bBase} L ${CX} ${bBase} Z`
  }

  return { leftPath, rightJacket, rightCore }
}

/* ── CASE PATH BUILDER ──────────────────────────────────────── */
function buildCasePaths(g) {
  const { caseH, baseW, neckW, rimW, rimH, grooveH, grooveW,
          shoulderY, neckStartY, isPistol, totalH, bulletH } = g
  const bHalf = baseW / 2
  const nHalf = neckW / 2
  const rHalf = rimW  / 2
  const gHalf = grooveW / 2

  // External left profile (mirrored on left side of CX)
  // Draw from base up, left side only (right side = cutaway)
  const extLeft = [
    `M ${CX} ${caseH}`,           // top of case (case mouth) — start centre
    `L ${CX - nHalf} ${caseH}`,   // case mouth left edge
    isPistol
      ? `L ${CX - nHalf} 0`       // straight wall left
      : `L ${CX - nHalf} ${neckStartY} L ${CX - bHalf} ${shoulderY} L ${CX - bHalf} 0`, // neck→shoulder→body
    // Extractor groove
    `L ${CX - bHalf} ${-grooveH}`,
    `L ${CX - gHalf} ${-grooveH}`,
    `L ${CX - gHalf} ${-grooveH - grooveH * 0.6}`,
    // Rim
    `L ${CX - rHalf} ${-grooveH - grooveH * 0.6}`,
    `L ${CX - rHalf} ${-rimH - grooveH - grooveH * 0.6}`,
    `L ${CX} ${-rimH - grooveH - grooveH * 0.6}`,
    'Z',
  ].join(' ')

  // Right profile (right half, also external — will be clipped in render)
  const extRight = [
    `M ${CX} ${caseH}`,
    `L ${CX + nHalf} ${caseH}`,
    isPistol
      ? `L ${CX + nHalf} 0`
      : `L ${CX + nHalf} ${neckStartY} L ${CX + bHalf} ${shoulderY} L ${CX + bHalf} 0`,
    `L ${CX + bHalf} ${-grooveH}`,
    `L ${CX + gHalf} ${-grooveH}`,
    `L ${CX + gHalf} ${-grooveH - grooveH * 0.6}`,
    `L ${CX + rHalf} ${-grooveH - grooveH * 0.6}`,
    `L ${CX + rHalf} ${-rimH - grooveH - grooveH * 0.6}`,
    `L ${CX} ${-rimH - grooveH - grooveH * 0.6}`,
    'Z',
  ].join(' ')

  // Interior cavity for cutaway (right side, slightly inset)
  const wallThick = 3.5
  const intRight = [
    `M ${CX} ${caseH - 2}`,
    `L ${CX + nHalf - wallThick} ${caseH - 2}`,
    isPistol
      ? `L ${CX + nHalf - wallThick} ${2}`
      : `L ${CX + nHalf - wallThick} ${neckStartY} L ${CX + bHalf - wallThick} ${shoulderY} L ${CX + bHalf - wallThick} ${2}`,
    `L ${CX} ${2}`,
    'Z',
  ].join(' ')

  // Primer pocket circle (at base center, right side)
  const primerR = Math.max(2, grooveW * 0.22)

  return { extLeft, extRight, intRight, primerR }
}

/* ── DIMENSION LINE HELPERS ─────────────────────────────────── */
function DimLine({ x, y1, y2, label, side = 'right', color = '#555c6a' }) {
  const xOff  = side === 'right' ? x + 8 : x - 8
  const textX = side === 'right' ? xOff + 3 : xOff - 3
  const anchor = side === 'right' ? 'start' : 'end'
  return (
    <g>
      <line x1={x} y1={y1} x2={xOff} y2={y1} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={x} y1={y2} x2={xOff} y2={y2} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={xOff} y1={y1} x2={xOff} y2={y2} stroke={color} strokeWidth="0.7" />
      <line x1={xOff - 2} y1={y1} x2={xOff + 2} y2={y1} stroke={color} strokeWidth="0.7" />
      <line x1={xOff - 2} y1={y2} x2={xOff + 2} y2={y2} stroke={color} strokeWidth="0.7" />
      <text x={textX} y={(y1 + y2) / 2} fontSize="6" fill={color} textAnchor={anchor} dominantBaseline="middle"
            style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>
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
    () => buildPowderGrains(g.powderTopY, g.caseH, g.neckW, g.baseW, g.fillRatio, charge),
    [g.powderTopY, g.caseH, g.neckW, g.baseW, g.fillRatio, charge]
  )

  // SVG viewport: cartridge sits between y=0 (tip) and y=totalH+rim
  const rimOffset  = g.rimH + g.grooveH * 2 + 4
  const viewTop    = -g.bulletH * 0.08         // small bleed above tip
  const viewBottom = g.caseH + rimOffset + 4   // below rim
  const viewH      = viewBottom - viewTop
  const dimRightX  = CX + g.baseW / 2 + 2
  const dimLeftX   = CX - g.baseW / 2 - 2

  const fillWarning = g.fillRatio > 0.95
  const seatWarning = g.seatingDepth < 0.05 && g.seatingDepth > 0

  return (
    <div className="w-full h-full flex flex-col bg-[#080808] rounded-lg border border-[#1e1e1e] overflow-hidden relative">

      {/* ── HUD OVERLAY ── */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10 pointer-events-none">
        {/* Left: charge + fill */}
        <div className="space-y-0.5">
          <div className="text-[8px] font-mono font-bold text-[#555c6a] uppercase tracking-[0.15em]">
            LOAD <span className="text-[#d4a843]">{Number(charge || 0).toFixed(1)} gr</span>
          </div>
          <div className={`text-[8px] font-mono font-bold uppercase tracking-[0.15em] ${fillWarning ? 'text-red-500 animate-pulse' : 'text-[#22c55e]'}`}>
            FILL <span>{g.fillPct}%</span>
          </div>
        </div>
        {/* Right: COAL + seating */}
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
          {/* Brass gradient — warm left-to-right metallic */}
          <linearGradient id="cvBrass" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#4a2e08" />
            <stop offset="18%"  stopColor="#9a6820" />
            <stop offset="40%"  stopColor="#d4a843" />
            <stop offset="60%"  stopColor="#c49528" />
            <stop offset="82%"  stopColor="#9a6820" />
            <stop offset="100%" stopColor="#4a2e08" />
          </linearGradient>

          {/* Copper bullet jacket gradient */}
          <linearGradient id="cvCopper" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#3a1a04" />
            <stop offset="25%"  stopColor="#8b4a18" />
            <stop offset="50%"  stopColor="#c87941" />
            <stop offset="75%"  stopColor="#8b4a18" />
            <stop offset="100%" stopColor="#3a1a04" />
          </linearGradient>

          {/* Lead core (darker grey-silver) */}
          <linearGradient id="cvLead" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#1a1a1a" />
            <stop offset="35%"  stopColor="#4a4a4a" />
            <stop offset="60%"  stopColor="#686868" />
            <stop offset="100%" stopColor="#2a2a2a" />
          </linearGradient>

          {/* Interior wall (slightly lighter brass for cutaway) */}
          <linearGradient id="cvInterior" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#0e0e0e" />
            <stop offset="50%"  stopColor="#181410" />
            <stop offset="100%" stopColor="#0e0e0e" />
          </linearGradient>

          {/* Primer flash */}
          <radialGradient id="cvPrimer" cx="50%" cy="40%" r="50%">
            <stop offset="0%"   stopColor="#888" />
            <stop offset="60%"  stopColor="#555" />
            <stop offset="100%" stopColor="#222" />
          </radialGradient>

          {/* Clip: right half only (cutaway side) */}
          <clipPath id="cvRightHalf">
            <rect x={CX} y={viewTop - 10} width={W} height={viewH + 20} />
          </clipPath>
          {/* Clip: left half only (external profile side) */}
          <clipPath id="cvLeftHalf">
            <rect x={CX - W} y={viewTop - 10} width={W} height={viewH + 20} />
          </clipPath>
        </defs>

        {/* ── BACKGROUND GRID (faint) ── */}
        <rect x={CX - g.baseW / 2 - 28} y={viewTop} width={g.baseW + 56} height={viewH}
              fill="url(#cvInterior)" />
        {/* Subtle crosshatch */}
        <pattern id="cvGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#181818" strokeWidth="0.4" />
        </pattern>
        <rect x={CX - g.baseW / 2 - 28} y={viewTop} width={g.baseW + 56} height={viewH}
              fill="url(#cvGrid)" />

        {/* ── CENTRE DIVIDER LINE ── */}
        <line x1={CX} y1={viewTop} x2={CX} y2={viewBottom}
              stroke="#2a2a2a" strokeWidth="0.5" strokeDasharray="3,3" />

        {/* ── CASE — LEFT (external profile) ── */}
        <path d={cases.extLeft} fill="url(#cvBrass)" stroke="#9a6820" strokeWidth="0.8" clipPath="url(#cvLeftHalf)" />

        {/* ── CASE — RIGHT (external shell, partially visible) ── */}
        <path d={cases.extRight} fill="url(#cvBrass)" stroke="#9a6820" strokeWidth="0.8"
              clipPath="url(#cvRightHalf)" opacity="0.35" />

        {/* ── CASE INTERIOR — right cutaway ── */}
        <path d={cases.intRight} fill="#0c0a08" clipPath="url(#cvRightHalf)" />

        {/* ── POWDER GRAINS (right/cutaway half only) ── */}
        {grains.map((gr, i) => (
          <circle key={i} cx={gr.x} cy={gr.y} r={gr.r}
                  fill="#d8d4d0" opacity="0.65" />
        ))}

        {/* Powder top surface line */}
        {g.fillRatio > 0.02 && (
          <line x1={CX + 3} y1={g.powderTopY} x2={CX + g.neckW / 2 - 5} y2={g.powderTopY}
                stroke="#b87333" strokeWidth="0.6" opacity="0.4" />
        )}

        {/* ── PRIMER POCKET (right/cutaway base) ── */}
        <ellipse cx={CX + cases.primerR * 1.5} cy={3} rx={cases.primerR} ry={cases.primerR * 0.55}
                 fill="url(#cvPrimer)" clipPath="url(#cvRightHalf)" />
        {/* Flash hole (tiny) */}
        <line x1={CX + cases.primerR * 1.5} y1={3} x2={CX + cases.primerR * 1.5} y2={10}
              stroke="#1a1a1a" strokeWidth="1.2" clipPath="url(#cvRightHalf)" />

        {/* ── BULLET — LEFT external ── */}
        <path d={bullets.leftPath} fill="url(#cvCopper)" stroke="#7a4010" strokeWidth="0.8"
              clipPath="url(#cvLeftHalf)" />

        {/* ── BULLET — RIGHT jacket (cutaway) ── */}
        <path d={bullets.rightJacket} fill="url(#cvCopper)" stroke="#7a4010" strokeWidth="0.6"
              clipPath="url(#cvRightHalf)" opacity="0.9" />

        {/* ── BULLET — RIGHT core (lead) ── */}
        <path d={bullets.rightCore} fill="url(#cvLead)" clipPath="url(#cvRightHalf)" />

        {/* ── CASE NECK/MOUTH EDGE ── */}
        <line x1={CX - g.neckW / 2} y1={g.caseH} x2={CX + g.neckW / 2} y2={g.caseH}
              stroke="#d4a843" strokeWidth="1" opacity="0.6" />

        {/* ── DIMENSION CALLOUTS ── */}
        {/* COAL — right side */}
        <DimLine
          x={CX + g.baseW / 2 + 4}
          y1={g.totalH}
          y2={0}
          label={`${g.coalIn}"`}
          side="right"
          color="#b87333"
        />
        {/* Case length — left side */}
        <DimLine
          x={CX - g.baseW / 2 - 4}
          y1={g.caseH}
          y2={0}
          label={`${(g.caseH / SCALE).toFixed(3)}"`}
          side="left"
          color="#555c6a"
        />

        {/* ── LABELS ── */}
        <text x={CX - 3} y={viewTop + 5} fontSize="5" fill="#2a2a2a" textAnchor="end"
              style={{ fontFamily: 'monospace' }}>EXT</text>
        <text x={CX + 3} y={viewTop + 5} fontSize="5" fill="#2a2a2a" textAnchor="start"
              style={{ fontFamily: 'monospace' }}>CUT</text>
      </svg>

      {/* ── BOTTOM STATUS BAR ── */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between pointer-events-none">
        <span className="text-[7px] font-mono text-[#2a2a2a] uppercase tracking-[0.2em]">
          {caliber ? caliber.toUpperCase() : 'NO CALIBER'}
        </span>
        <span className={`text-[7px] font-mono font-bold uppercase tracking-[0.15em]
          ${fillWarning ? 'text-red-600' : g.fillRatio > 0 ? 'text-[#22c55e]/60' : 'text-[#2a2a2a]'}`}>
          {fillWarning ? '⚠ COMPRESSED' : g.fillRatio > 0 ? 'NOMINAL' : 'EMPTY'}
        </span>
      </div>
    </div>
  )
}

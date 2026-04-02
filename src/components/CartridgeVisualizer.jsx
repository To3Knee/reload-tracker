
import { useMemo, useState, useEffect } from 'react'

/* ── THEME HOOK ─────────────────────────────────────────────── */
// Watches documentElement class changes so the visualizer re-renders
// immediately when the user toggles light/dark mode — no hard refresh needed.
function useIsDark() {
  const [isDark, setIsDark] = useState(() => !document.documentElement.classList.contains('light'))
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(!document.documentElement.classList.contains('light'))
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

/* ── CONSTANTS ─────────────────────────────────────────────── */
const CX    = 100   // centre-x (SVG user units)
const SCALE = 68    // SVG units per inch

/* ── PRIMER RADIUS (SAAMI) ──────────────────────────────────── */
function getPrimerRadius(dia, isPistol) {
  const isLarge = isPistol ? dia >= 0.400 : dia >= 0.308
  return ((isLarge ? 0.210 : 0.175) / 2) * SCALE
}

/* ── BULLET TYPE CLASSIFIER ─────────────────────────────────── */
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

/* ── BULLET LENGTH LOOKUP ───────────────────────────────────── */
function estimateBulletLen(caliber = '', dia = 0.308, isPistol = false) {
  const c = caliber.toLowerCase()
  if (isPistol) {
    if (c.includes('9mm') || c.includes('9x19'))         return 0.590
    if (c.includes('45acp') || c.includes('45 acp'))     return 0.680
    if (c.includes('40s&w') || c.includes('.40'))        return 0.615
    if (c.includes('10mm'))                               return 0.630
    if (c.includes('357mag') || c.includes('357 mag'))   return 0.650
    if (c.includes('38spl'))                              return 0.630
    return dia * 1.75   // generic pistol
  }
  if (c.includes('.223') || c.includes('5.56'))          return 0.720
  if (c.includes('300blk') || c.includes('blackout'))    return 0.920
  if (c.includes('.308') || c.includes('7.62x51'))       return 1.120
  if (c.includes('6.5') || c.includes('creedmoor'))      return 1.350
  if (c.includes('30-06'))                               return 1.150
  if (c.includes('300win'))                              return 1.250
  if (c.includes('338lap'))                              return 1.650
  return dia * 3.5    // generic rifle
}

/* ── CASE LENGTH LOOKUP ─────────────────────────────────────── */
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

// Estimate case water capacity in grains.
// Uses case BODY diameter (not bullet diameter) for volume, then applies a
// shape factor to account for shoulder taper, primer pocket, and web.
// 1 cubic inch = 252.89 grains of water.
function estimateCapacity(dia = 0.308, cLen = 2.0, isPistol = false) {
  let bodyOuter
  if (isPistol) {
    bodyOuter = dia + 0.040          // straight-wall: body ≈ bullet dia + 40thou
  } else if (dia <= 0.228) {
    bodyOuter = 0.376                // .22 cal rifle (.223, .22-250)
  } else if (dia <= 0.310) {
    bodyOuter = 0.470                // 6mm–.30 cal (.243, .308, 6.5CM, .30-06)
  } else if (dia <= 0.375) {
    bodyOuter = 0.550                // .338–.375 class (.338 Lapua etc.)
  } else {
    bodyOuter = dia * 1.45           // large bore estimate
  }
  const bodyR = (bodyOuter - 0.036) / 2   // subtract 2× ~18thou wall thickness
  const vol   = Math.PI * bodyR * bodyR * cLen  // cubic inches (cylinder)
  // Shape factor 0.78: accounts for shoulder taper, neck narrowing, primer pocket, web
  return Math.round(vol * 252.89 * 0.78)
}

/* ── GEOMETRY CALCULATOR ────────────────────────────────────── */
// y = 0 at bullet tip · y = totalH at case base
function calcGeometry(bulletLen, caseLen, diameter, coal, charge, capacity, caliber) {
  const dia  = Math.max(0.172, Number(diameter) || 0.308)
  const cLen = Math.max(0.5,   Number(caseLen)  || estimateCaseLen(caliber, dia))
  const isPistol = cLen < 1.5 && dia >= 0.355
  const bLen = Math.max(0.15,  Number(bulletLen) || estimateBulletLen(caliber, dia, isPistol))
  const ovr  = Math.max(cLen + bLen * 0.4, Number(coal) || cLen + bLen * 0.6)
  const chg  = Math.max(0, Number(charge)   || 0)
  const cap  = Math.max(1, Number(capacity) || estimateCapacity(dia, cLen, isPistol))

  const totalH  = ovr  * SCALE
  const caseH   = cLen * SCALE
  const bulletH = bLen * SCALE
  const baseW   = (isPistol ? dia + 0.020 : 0.470) * SCALE
  const neckW   = (dia + 0.012) * SCALE
  const rimW    = (isPistol ? dia + 0.060 : 0.480) * SCALE
  const rimH    = 0.060 * SCALE
  const grooveH = 0.060 * SCALE
  const grooveW = (isPistol ? dia - 0.020 : 0.450) * SCALE

  // Neck and shoulder geometry
  const neckLen = isPistol ? 0 : Math.min(dia * 0.8, cLen * 0.18)
  const caseTopY   = totalH - caseH
  const neckStartY = isPistol ? caseTopY : totalH - (cLen - neckLen) * SCALE

  // Shoulder angle: 22° average for bottle-neck rifle cartridges
  const shoulderAngleRad = 22 * Math.PI / 180
  const halfWidthDiff = (baseW - neckW) / 2
  const shoulderHPx = isPistol ? 0 : Math.min(halfWidthDiff / Math.tan(shoulderAngleRad), caseH * 0.20)
  const shoulderY = isPistol ? caseTopY : neckStartY + shoulderHPx

  // Wall thickness scales with caliber
  const wallThick = Math.max(2.0, dia * 0.13 * SCALE)

  // Case web (solid brass base, above primer pocket)
  const webH = (isPistol ? 0.085 : 0.110) * SCALE
  const interiorFloor = totalH - webH

  // Primer (SAAMI, centered on case axis)
  const primerR       = getPrimerRadius(dia, isPistol)
  const primerDepthPx = (isPistol ? 0.123 : 0.128) * SCALE
  const primerCY      = totalH - primerDepthPx / 2

  // Flash hole width (SAAMI: ~0.080" small, ~0.125" large — use 0.080" visual)
  const flashHoleHW = Math.max(1.0, 0.040 * SCALE)  // half-width

  // Powder fill level relative to interior space
  const interiorH  = interiorFloor - caseTopY
  const fillRatio  = cap > 0 ? Math.min(1.1, chg / cap) : 0
  const powderTopY = interiorFloor - interiorH * 0.88 * Math.min(1.0, fillRatio)

  const seatingDepth = Math.max(0, cLen - (ovr - bLen))
  const bulletType   = classifyBullet(caliber, bLen / SCALE, dia)

  return {
    totalH, caseH, bulletH, baseW, neckW, rimW, rimH, grooveH, grooveW,
    caseTopY, neckStartY, shoulderY, wallThick,
    webH, interiorFloor, primerR, primerCY, primerDepthPx, flashHoleHW,
    powderTopY, fillRatio, seatingDepth,
    isPistol, bulletType, dia,
    fillPct:   Math.round(fillRatio * 100),
    coalIn:    ovr.toFixed(3),
    seatIn:    seatingDepth.toFixed(3),
    caseLenIn: cLen.toFixed(3),
  }
}

/* ── DETERMINISTIC PRNG ─────────────────────────────────────── */
function seededRandom(seed) {
  let s = seed + 2654435761
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5
    return ((s >>> 0) / 0xFFFFFFFF)
  }
}

/* ── POWDER GRAINS ──────────────────────────────────────────── */
function buildPowderGrains(g, chargeKey) {
  const { powderTopY, interiorFloor, baseW, wallThick, fillRatio } = g
  if (fillRatio <= 0 || (interiorFloor - powderTopY) <= 4) return []
  const rand   = seededRandom(Math.round((chargeKey || 0) * 100))
  const count  = Math.min(120, Math.round(fillRatio * 90 + 10))
  const innerHW = baseW / 2 - wallThick - 2
  const grains = []
  for (let i = 0; i < count; i++) {
    const rx = CX + 2 + rand() * innerHW
    const ry = powderTopY + rand() * (interiorFloor - powderTopY - 4) + 2
    if (ry < powderTopY + 1 || ry > interiorFloor - 2) continue
    grains.push({ x: rx, y: ry, r: 1.3 + rand() * 0.8 })
  }
  return grains
}

/* ── BULLET PATHS ───────────────────────────────────────────── */
// y = 0 = tip · y = bulletH = base
// bW uses actual bullet radius (dia/2), not case neck radius
function buildBulletPaths(g) {
  const { bulletH, dia, bulletType } = g
  const bW = (dia / 2) * SCALE              // actual bullet radius
  const jT = Math.max(1.5, bW * 0.11)      // jacket wall thickness

  if (bulletType === 'rn') {
    // Round-nose pistol: cylindrical body with smooth hemispherical dome
    // Dome starts at ~45% from base, blends into the cylinder via a cubic bezier
    const domeY = bulletH * 0.55  // ogive shoulder
    // Outer profile bezier: from (CX±bW, domeY) curving to tip (CX, 0)
    // CP1 stays on the cylinder tangent, CP2 approaches tip horizontally
    return {
      leftPath: `M ${CX - bW} ${bulletH}
        L ${CX - bW} ${domeY}
        C ${CX - bW} ${domeY * 0.45} ${CX - bW * 0.12} ${bulletH * 0.03} ${CX} 0 Z`,
      rightJacket: `M ${CX} 0
        C ${CX + bW * 0.12} ${bulletH * 0.03} ${CX + bW} ${domeY * 0.45} ${CX + bW} ${domeY}
        L ${CX + bW} ${bulletH} L ${CX + bW - jT} ${bulletH}
        L ${CX + bW - jT} ${domeY + jT * 0.5}
        C ${CX + bW - jT} ${domeY * 0.48 + jT} ${CX + bW * 0.12} ${bulletH * 0.04 + jT} ${CX + jT} ${jT * 0.8} Z`,
      rightCore: `M ${CX + jT} ${jT * 0.8}
        C ${CX + bW * 0.12} ${bulletH * 0.04 + jT} ${CX + bW - jT} ${domeY * 0.48 + jT} ${CX + bW - jT} ${domeY + jT * 0.5}
        L ${CX + bW - jT} ${bulletH} L ${CX} ${bulletH} Z`,
    }
  }

  if (bulletType === 'spitzer') {
    // Spitzer tangent ogive: sharp tip, smooth curved profile
    const ogiveBase = bulletH * 0.56  // ogive shoulder (where cylinder meets ogive)
    // Cubic bezier: starts tangent to cylinder (vertical), sweeps to sharp tip
    return {
      leftPath: `M ${CX - bW} ${bulletH}
        L ${CX - bW} ${ogiveBase}
        C ${CX - bW} ${ogiveBase * 0.38} ${CX - bW * 0.15} ${bulletH * 0.04} ${CX} 0 Z`,
      rightJacket: `M ${CX} 0
        C ${CX + bW * 0.15} ${bulletH * 0.04} ${CX + bW} ${ogiveBase * 0.38} ${CX + bW} ${ogiveBase}
        L ${CX + bW} ${bulletH} L ${CX + bW - jT} ${bulletH}
        L ${CX + bW - jT} ${ogiveBase + jT}
        C ${CX + bW - jT} ${ogiveBase * 0.40 + jT * 1.2} ${CX + bW * 0.15} ${bulletH * 0.05 + jT * 1.5} ${CX + jT} ${jT * 1.5} Z`,
      rightCore: `M ${CX + jT} ${jT * 1.5}
        C ${CX + bW * 0.15} ${bulletH * 0.05 + jT * 1.5} ${CX + bW - jT} ${ogiveBase * 0.40 + jT * 1.2} ${CX + bW - jT} ${ogiveBase + jT}
        L ${CX + bW - jT} ${bulletH} L ${CX} ${bulletH} Z`,
    }
  }

  // BTHP — boat-tail hollow point
  const boatH  = bulletH * 0.10        // boat-tail taper height
  const boatW  = bW * 0.82             // boat-tail base width
  const hpDepth = bulletH * 0.17       // hollow-point cavity depth
  const hpW    = bW * 0.38             // hollow-point cavity radius
  const ogiveBase = bulletH * 0.52
  return {
    leftPath: `M ${CX - boatW} ${bulletH}
      L ${CX - bW} ${bulletH - boatH}
      L ${CX - bW} ${ogiveBase}
      C ${CX - bW} ${ogiveBase * 0.38} ${CX - bW * 0.15} ${bulletH * 0.04} ${CX} 0 Z`,
    rightJacket: `M ${CX} 0
      C ${CX + bW * 0.15} ${bulletH * 0.04} ${CX + bW} ${ogiveBase * 0.38} ${CX + bW} ${ogiveBase}
      L ${CX + bW} ${bulletH - boatH} L ${CX + boatW} ${bulletH}
      L ${CX + boatW - jT} ${bulletH}
      L ${CX + bW - jT} ${bulletH - boatH}
      L ${CX + bW - jT} ${ogiveBase + jT}
      C ${CX + bW - jT} ${ogiveBase * 0.40 + jT * 1.2} ${CX + hpW + jT * 0.3} ${hpDepth + jT * 0.5} ${CX + hpW} ${hpDepth}
      L ${CX + jT * 0.6} ${hpDepth} Z`,
    rightCore: `M ${CX + jT * 0.6} ${hpDepth} L ${CX + hpW} ${hpDepth}
      C ${CX + hpW + jT * 0.3} ${hpDepth + jT * 0.5} ${CX + bW - jT} ${ogiveBase * 0.40 + jT * 1.2} ${CX + bW - jT} ${ogiveBase + jT}
      L ${CX + bW - jT} ${bulletH - boatH}
      L ${CX + boatW - jT} ${bulletH} L ${CX} ${bulletH} Z`,
  }
}

/* ── CASE PATHS ─────────────────────────────────────────────── */
function buildCasePaths(g) {
  const { totalH, baseW, neckW, rimW, rimH, grooveH, grooveW,
          caseTopY, neckStartY, shoulderY, wallThick, interiorFloor, isPistol } = g
  const bH = baseW  / 2
  const nH = neckW  / 2
  const rH = rimW   / 2
  const gH = grooveW / 2

  const extLeft = [
    `M ${CX} ${caseTopY}`, `L ${CX - nH} ${caseTopY}`,
    isPistol
      ? `L ${CX - nH} ${totalH}`
      : `L ${CX - nH} ${neckStartY} L ${CX - bH} ${shoulderY} L ${CX - bH} ${totalH}`,
    `L ${CX - bH} ${totalH + grooveH}`, `L ${CX - gH} ${totalH + grooveH}`,
    `L ${CX - gH} ${totalH + grooveH * 1.6}`, `L ${CX - rH} ${totalH + grooveH * 1.6}`,
    `L ${CX - rH} ${totalH + rimH + grooveH * 1.6}`,
    `L ${CX} ${totalH + rimH + grooveH * 1.6}`, 'Z',
  ].join(' ')

  const extRight = [
    `M ${CX} ${caseTopY}`, `L ${CX + nH} ${caseTopY}`,
    isPistol
      ? `L ${CX + nH} ${totalH}`
      : `L ${CX + nH} ${neckStartY} L ${CX + bH} ${shoulderY} L ${CX + bH} ${totalH}`,
    `L ${CX + bH} ${totalH + grooveH}`, `L ${CX + gH} ${totalH + grooveH}`,
    `L ${CX + gH} ${totalH + grooveH * 1.6}`, `L ${CX + rH} ${totalH + grooveH * 1.6}`,
    `L ${CX + rH} ${totalH + rimH + grooveH * 1.6}`,
    `L ${CX} ${totalH + rimH + grooveH * 1.6}`, 'Z',
  ].join(' ')

  // Interior cavity: from case mouth down to web top (interiorFloor)
  const intRight = [
    `M ${CX} ${caseTopY + 2}`, `L ${CX + nH - wallThick} ${caseTopY + 2}`,
    isPistol
      ? `L ${CX + nH - wallThick} ${interiorFloor}`
      : `L ${CX + nH - wallThick} ${neckStartY} L ${CX + bH - wallThick} ${shoulderY} L ${CX + bH - wallThick} ${interiorFloor}`,
    `L ${CX} ${interiorFloor}`, 'Z',
  ].join(' ')

  return { extLeft, extRight, intRight }
}

/* ── DIMENSION LINE ──────────────────────────────────────────── */
function DimLine({ x, y1, y2, label, side = 'right', color }) {
  const xOff   = side === 'right' ? x + 8 : x - 8
  const textX  = side === 'right' ? xOff + 3 : xOff - 3
  const anchor = side === 'right' ? 'start' : 'end'
  const midY   = (y1 + y2) / 2
  return (
    <g>
      <line x1={x}        y1={y1} x2={xOff} y2={y1} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={x}        y1={y2} x2={xOff} y2={y2} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={xOff}     y1={y1} x2={xOff} y2={y2} stroke={color} strokeWidth="0.7" />
      <line x1={xOff - 2} y1={y1} x2={xOff + 2} y2={y1} stroke={color} strokeWidth="0.7" />
      <line x1={xOff - 2} y1={y2} x2={xOff + 2} y2={y2} stroke={color} strokeWidth="0.7" />
      <text x={textX} y={midY} fontSize="6" fill={color} textAnchor={anchor} dominantBaseline="middle"
            style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.03em' }}>
        {label}
      </text>
    </g>
  )
}

/* ── MAIN COMPONENT ──────────────────────────────────────────── */
export function CartridgeVisualizer({
  bulletLength = 0,
  caseLength   = 0,
  diameter     = 0.308,
  coal         = 0,
  charge       = 0,
  capacity     = 56,
  caliber      = '',
}) {
  const isDark = useIsDark()

  // Theme-conditional color palette
  const clr = {
    grid:       isDark ? '#1c1c1c' : '#d8d4ce',
    divider:    isDark ? '#252525' : '#ccc5bc',
    interior:   isDark ? '#0a0a0c' : '#f5f5f7',
    interiorMid:isDark ? '#111113' : '#ebebee',
    dimCoal:    isDark ? '#b87333' : '#9a5c1a',
    dimCase:    isDark ? '#555c6a' : '#8a8a9a',
    label:      isDark ? '#444c58' : '#989898',
    hudMuted:   isDark ? '#555c6a' : '#8a8a9a',
    hudValue:   isDark ? '#d4a843' : '#9a6820',
    hudFill:    'var(--dot-active)',
    hudWarn:    '#ef4444',
    caseMouth:  isDark ? '#d4a843' : '#9a6820',
    powderSurf: isDark ? '#b87333' : '#8b6020',
    flashHole:  isDark ? '#050403' : '#b0a898',
    grainColor: isDark ? '#d8d4d0' : '#6a5a48',
  }

  const g = useMemo(
    () => calcGeometry(bulletLength, caseLength, diameter, coal, charge, capacity, caliber),
    [bulletLength, caseLength, diameter, coal, charge, capacity, caliber]
  )

  const bullets = useMemo(() => buildBulletPaths(g), [g])
  const cases   = useMemo(() => buildCasePaths(g),   [g])
  const grains  = useMemo(() => buildPowderGrains(g, charge), [g, charge])

  const rimTotal   = g.rimH + g.grooveH * 2.6
  const viewTop    = -4
  const viewBottom = g.totalH + rimTotal + 8
  const viewH      = viewBottom - viewTop
  const clipY      = viewTop - 6
  const clipH      = viewH + 12

  const fillWarn = g.fillRatio > 0.95
  const seatWarn = g.seatingDepth < 0.05 && g.seatingDepth > 0

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg)] rounded-lg border border-[var(--border)] overflow-hidden relative">

      {/* ── HUD OVERLAY ── */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10 pointer-events-none">
        <div className="space-y-0.5">
          <div className="text-[8px] font-mono font-bold uppercase tracking-[0.15em]"
               style={{ color: clr.hudMuted }}>
            LOAD <span style={{ color: clr.hudValue }}>{Number(charge || 0).toFixed(1)} gr</span>
          </div>
          <div className="text-[8px] font-mono font-bold uppercase tracking-[0.15em]"
               style={{ color: fillWarn ? clr.hudWarn : clr.hudFill }}>
            FILL <span>{g.fillPct}%</span>
          </div>
        </div>
        <div className="space-y-0.5 text-right">
          <div className="text-[8px] font-mono font-bold uppercase tracking-[0.15em]"
               style={{ color: clr.hudMuted }}>
            COAL <span style={{ color: clr.hudValue }}>{g.coalIn}"</span>
          </div>
          <div className="text-[8px] font-mono font-bold uppercase tracking-[0.15em]"
               style={{ color: seatWarn ? '#f59e0b' : clr.hudMuted }}>
            GRIP <span style={{ color: seatWarn ? '#f59e0b' : clr.hudValue }}>{g.seatIn}"</span>
          </div>
        </div>
      </div>

      {/* ── SVG DIAGRAM ── */}
      <svg
        width="100%"
        height="100%"
        viewBox={`${CX - g.baseW / 2 - 40} ${viewTop} ${g.baseW + 80} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Brass case */}
          <linearGradient id="cvBrass" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#4a2e08" />
            <stop offset="18%"  stopColor="#9a6820" />
            <stop offset="40%"  stopColor="#d4a843" />
            <stop offset="60%"  stopColor="#c49528" />
            <stop offset="82%"  stopColor="#9a6820" />
            <stop offset="100%" stopColor="#4a2e08" />
          </linearGradient>

          {/* Copper jacket */}
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

          {/* Interior cavity (theme-aware) */}
          <linearGradient id="cvInterior" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor={clr.interior} />
            <stop offset="40%"  stopColor={clr.interiorMid} />
            <stop offset="100%" stopColor={clr.interior} />
          </linearGradient>

          {/* Primer pocket (radial) */}
          <radialGradient id="cvPrimer" cx="50%" cy="40%" r="50%">
            <stop offset="0%"   stopColor={isDark ? '#888' : '#888'} />
            <stop offset="60%"  stopColor={isDark ? '#555' : '#777'} />
            <stop offset="100%" stopColor={isDark ? '#222' : '#555'} />
          </radialGradient>

          {/* Grid */}
          <pattern id="cvGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke={clr.grid} strokeWidth="0.4" />
          </pattern>

          {/* Clip: right half (x ≥ CX) */}
          <clipPath id="cvRightHalf">
            <rect x={CX} y={clipY} width={200} height={clipH} />
          </clipPath>
          {/* Clip: left half (x < CX) */}
          <clipPath id="cvLeftHalf">
            <rect x={CX - 200} y={clipY} width={200} height={clipH} />
          </clipPath>
          {/* Clip: left half AND above case mouth — for external bullet profile only */}
          <clipPath id="cvBulletLeft">
            <rect x={CX - 200} y={clipY} width={200} height={g.caseTopY - clipY} />
          </clipPath>
        </defs>

        {/* ── GRID OVERLAY (no background — container CSS bg shows through) ── */}
        <rect x={CX - g.baseW / 2 - 40} y={viewTop} width={g.baseW + 80} height={viewH}
              fill="url(#cvGrid)" opacity="0.7" />

        {/* ── CENTRE DIVIDER ── */}
        <line x1={CX} y1={viewTop} x2={CX} y2={viewBottom}
              stroke={clr.divider} strokeWidth="0.5" strokeDasharray="3,3" />

        {/* ── CASE — LEFT external profile ── */}
        <path d={cases.extLeft} fill="url(#cvBrass)" stroke="#9a6820" strokeWidth="0.8"
              clipPath="url(#cvLeftHalf)" />

        {/* ── CASE — RIGHT outer wall (ghost/translucent, cutaway side) ── */}
        <path d={cases.extRight} fill="url(#cvBrass)" stroke="#9a6820" strokeWidth="0.8"
              clipPath="url(#cvRightHalf)" opacity="0.28" />

        {/* ── INTERIOR CAVITY (powder space) ── */}
        <path d={cases.intRight} fill="url(#cvInterior)" clipPath="url(#cvRightHalf)" />

        {/* ── POWDER GRAINS ── */}
        {grains.map((gr, i) => (
          <circle key={i} cx={gr.x} cy={gr.y} r={gr.r}
                  fill={clr.grainColor} opacity="0.65" />
        ))}

        {/* ── POWDER SURFACE LINE ── */}
        {g.fillRatio > 0.02 && (
          <line x1={CX + 3} y1={g.powderTopY}
                x2={CX + g.neckW / 2 - g.wallThick - 2} y2={g.powderTopY}
                stroke={clr.powderSurf} strokeWidth="0.6" opacity="0.5" />
        )}

        {/* ── FLASH HOLE (centered on case axis, cross-section view) ── */}
        <rect
          x={CX - g.flashHoleHW}
          y={g.primerCY - g.primerR * 0.25}
          width={g.flashHoleHW * 2}
          height={g.interiorFloor - (g.primerCY - g.primerR * 0.25)}
          fill={clr.flashHole}
          clipPath="url(#cvRightHalf)"
        />

        {/* ── PRIMER POCKET (SAAMI-centered, right-half cutaway) ── */}
        <ellipse
          cx={CX}
          cy={g.primerCY}
          rx={g.primerR}
          ry={g.primerDepthPx / 2}
          fill="url(#cvPrimer)"
          clipPath="url(#cvRightHalf)"
        />

        {/* ── BULLET — LEFT external (only shows above case mouth; brass covers seated portion) ── */}
        <path d={bullets.leftPath} fill="url(#cvCopper)" stroke="#7a4010" strokeWidth="0.8"
              clipPath="url(#cvBulletLeft)" />

        {/* ── BULLET — RIGHT jacket ── */}
        <path d={bullets.rightJacket} fill="url(#cvCopper)" stroke="#7a4010" strokeWidth="0.6"
              clipPath="url(#cvRightHalf)" opacity="0.9" />

        {/* ── BULLET — RIGHT lead core ── */}
        <path d={bullets.rightCore} fill="url(#cvLead)" clipPath="url(#cvRightHalf)" />

        {/* ── CASE MOUTH EDGE ── */}
        <line x1={CX - g.neckW / 2} y1={g.caseTopY}
              x2={CX + g.neckW / 2} y2={g.caseTopY}
              stroke={clr.caseMouth} strokeWidth="1" opacity="0.7" />

        {/* ── DIMENSION CALLOUTS ── */}
        {/* COAL: bullet tip → case base */}
        <DimLine
          x={CX + g.baseW / 2 + 4} y1={0} y2={g.totalH}
          label={`${g.coalIn}"`} side="right" color={clr.dimCoal}
        />
        {/* Case length: case mouth → case base */}
        <DimLine
          x={CX - g.baseW / 2 - 4} y1={g.caseTopY} y2={g.totalH}
          label={`${g.caseLenIn}"`} side="left" color={clr.dimCase}
        />

        {/* ── EXT / CUT LABELS ── */}
        <text x={CX - 3} y={g.caseTopY + 8} fontSize="5" fill={clr.label}
              textAnchor="end" style={{ fontFamily: 'monospace' }}>EXT</text>
        <text x={CX + 3} y={g.caseTopY + 8} fontSize="5" fill={clr.label}
              textAnchor="start" style={{ fontFamily: 'monospace' }}>CUT</text>
      </svg>

      {/* ── BOTTOM STATUS BAR ── */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between pointer-events-none">
        <span className="text-[7px] font-mono uppercase tracking-[0.2em]"
              style={{ color: clr.hudMuted }}>
          {caliber ? caliber.toUpperCase() : 'NO CALIBER'}
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-[0.15em]"
              style={{ color: fillWarn ? clr.hudWarn : g.fillRatio > 0 ? clr.hudFill : clr.hudMuted }}>
          {fillWarn ? '⚠ COMPRESSED' : g.fillRatio > 0 ? 'NOMINAL' : 'EMPTY'}
        </span>
      </div>
    </div>
  )
}

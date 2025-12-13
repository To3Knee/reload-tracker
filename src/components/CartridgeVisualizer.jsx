//===============================================================
//Script Name: CartridgeVisualizer.jsx
//Script Location: src/components/CartridgeVisualizer.jsx
//Date: 12/12/2025
//Created By: T03KNEE
//Version: 3.0.0 (Physics Geometry Engine)
//About: Real-time SVG Geometry Engine for Cartridges.
//       - FEATURE: Caliber-based geometry (Neck = 1x Diameter).
//       - FEATURE: Adaptive Bullet Shapes (Round Nose vs Spitzer).
//       - FIX: Correct proportions for .223, .300BLK, and Pistols.
//===============================================================

import { useMemo } from 'react'

/**
 * Renders the Visualizer Component for the UI.
 */
export function CartridgeVisualizer({ 
    bulletLength = 0, 
    caseLength = 0, 
    diameter = 0.308, 
    coal = 0, 
    charge = 0, 
    capacity = 56 
}) {
    
  const dims = useMemo(() => calculateDims(bulletLength, caseLength, diameter, coal, charge, capacity), 
    [bulletLength, caseLength, diameter, coal, charge, capacity])

  // --- SVG PATH GENERATION ---

  // 1. BULLET SHAPE ENGINE
  // We change the drawing based on the aspect ratio (Length / Diameter)
  // Ratio < 2.0 = Pistol/Round Nose. Ratio > 2.0 = Rifle/Spitzer.
  const bulletRatio = dims.bulletH / dims.bulletW
  let bulletPath = ''

  if (bulletRatio < 2.2) {
      // PISTOL / ROUND NOSE (Simple Dome)
      bulletPath = `
        M ${-dims.bulletW/2}, ${dims.totalH - dims.bulletH} 
        L ${-dims.bulletW/2}, ${dims.totalH - dims.bulletH * 0.3} 
        Q ${0}, ${dims.totalH} ${dims.bulletW/2}, ${dims.totalH - dims.bulletH * 0.3}
        L ${dims.bulletW/2}, ${dims.totalH - dims.bulletH} 
        Z
      `
  } else {
      // RIFLE / SPITZER (Secant Ogive + Boat Tail Hint)
      bulletPath = `
        M ${-dims.bulletW/2}, ${dims.totalH - dims.bulletH} 
        L ${-dims.bulletW/2}, ${dims.totalH - dims.bulletH * 0.6} 
        Q ${0}, ${dims.totalH} ${dims.bulletW/2}, ${dims.totalH - dims.bulletH * 0.6}
        L ${dims.bulletW/2}, ${dims.totalH - dims.bulletH} 
        Z
      `
  }

  // 2. CASE SHAPE ENGINE
  // Uses calculated Shoulder/Neck positions
  const casePath = `
    M ${-dims.baseW/2}, 0 
    L ${-dims.baseW/2}, ${dims.shoulderStart}
    L ${-dims.neckW/2}, ${dims.neckStart}
    L ${-dims.neckW/2}, ${dims.caseH}
    L ${dims.neckW/2}, ${dims.caseH}
    L ${dims.neckW/2}, ${dims.neckStart}
    L ${dims.baseW/2}, ${dims.shoulderStart}
    L ${dims.baseW/2}, 0
    Z
  `

  // 3. POWDER ENGINE
  const powderPath = `
     M ${-dims.baseW/2 + 5}, 5
     L ${-dims.baseW/2 + 5}, ${Math.min(dims.shoulderStart, dims.powderH)}
     ${dims.powderH > dims.shoulderStart ? `L ${-dims.neckW/2 + 2}, ${Math.min(dims.powderH, dims.caseH)}` : ''}
     ${dims.powderH > dims.shoulderStart ? `L ${dims.neckW/2 - 2}, ${Math.min(dims.powderH, dims.caseH)}` : ''}
     L ${dims.baseW/2 - 5}, ${Math.min(dims.shoulderStart, dims.powderH)}
     L ${dims.baseW/2 - 5}, 5
     Z
  `

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-slate-950/50 rounded-xl border border-slate-800">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>
        
        {/* HUD Data Overlay */}
        <div className="absolute top-2 left-3 text-[9px] font-mono font-bold space-y-1 z-10">
            <div className="text-slate-400">
                LOAD: <span className="text-slate-200">{Number(charge || 0).toFixed(1)} gr</span>
            </div>
            <div className={dims.fillRatio > 1.0 ? "text-red-500 animate-pulse" : "text-emerald-500"}>
                FILL: {dims.fillPercent}%
            </div>
            <div className={dims.seatingDepth < 0.05 ? "text-amber-500" : "text-cyan-500"}>
                GRIP: {dims.seatingDepth}"
            </div>
        </div>

        <svg 
            width="100%" 
            height="100%" 
            viewBox={`-150 -20 ${dims.baseW + 300} ${dims.totalH + 100}`}
            className="drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            style={{ transform: 'scale(1, -1)' }} 
        >
            <defs>
                <linearGradient id="caseGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="20%" stopColor="#d97706" />
                    <stop offset="50%" stopColor="#fcd34d" />
                    <stop offset="80%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id="bulletGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#451a03" />
                    <stop offset="30%" stopColor="#b45309" />
                    <stop offset="50%" stopColor="#d97706" />
                    <stop offset="70%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#451a03" />
                </linearGradient>
                <pattern id="powderPat" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                    <rect width="4" height="4" fill="#0c0a09" /> 
                    <circle cx="2" cy="2" r="1.5" fill="#e7e5e4" /> 
                </pattern>
            </defs>

            <g transform={`translate(0, 20)`}>
                <path d={powderPath} fill="url(#powderPat)" stroke="#44403c" strokeWidth="0.5" />
                <path d={bulletPath} fill="url(#bulletGrad)" stroke="#713f12" strokeWidth="1" />
                <path d={casePath} fill="url(#caseGrad)" opacity="0.5" stroke="#fcd34d" strokeWidth="2" />
                
                <g transform="scale(1, -1)">
                    <line x1="80" y1={-dims.totalH} x2="80" y2="0" stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
                    <text x="90" y={-dims.totalH/2} fontSize="10" fill="#94a3b8" transform={`rotate(90 90 ${-dims.totalH/2})`} textAnchor="middle">COAL {coal}"</text>
                    <line x1="-80" y1={-dims.caseH} x2="-80" y2={-(dims.totalH - dims.bulletH)} stroke="#64748b" strokeWidth="1" />
                    <text x="-90" y={-((dims.caseH + (dims.totalH - dims.bulletH))/2)} fontSize="10" fill="#94a3b8" transform={`rotate(-90 -90 ${-((dims.caseH + (dims.totalH - dims.bulletH))/2)})`} textAnchor="middle">GRIP</text>
                </g>
            </g>
        </svg>
    </div>
  )
}

function calculateDims(bLenInput, cLenInput, diaInput, coalInput, chargeInput, capacityInput) {
    const SCALE = 120 
    
    // 1. INPUT NORMALIZATION
    // Smart guessing if inputs are missing (0 or null)
    let cLen = Number(cLenInput)
    let dia = Number(diaInput) || 0.308
    
    if (!cLen || cLen < 0.1) cLen = 2.0 // Default fallback
    
    // 2. SMART GEOMETRY DEFAULTS
    // "Rule of Thumb": Rifle bullets are ~4x diameter. Pistol bullets ~1.6x.
    const isPistolCase = cLen < 1.4 && dia > 0.34
    const defaultBulletLen = isPistolCase ? (dia * 1.6) : (dia * 4.0)
    
    const bLen = Math.max(0.1, Number(bLenInput) || defaultBulletLen)
    const ovr = Math.max(cLen, Number(coalInput) || (cLen + (bLen * 0.6)))
    
    const chg = Number(chargeInput) || 0
    const cap = Number(capacityInput) || 56 

    // 3. CASE SHAPE PHYSICS
    // Neck Length ≈ 1 Caliber (Standard engineering rule for cartridges)
    const neckLen = dia 
    const shoulderHeight = 0.15 // Standard shoulder vertical rise
    
    // Straight Wall Detection (Neck Width ≈ Base Width)
    const rawNeckW = (dia + 0.03) * SCALE
    const baseW = (isPistolCase) ? rawNeckW : (0.470 * SCALE)
    
    // Calculate key Y-positions (Bottom-Up)
    const shoulderStartH = isPistolCase 
        ? cLen * SCALE // Pistol has no shoulder
        : Math.max(cLen * 0.5, cLen - neckLen - shoulderHeight) * SCALE
        
    const neckStartH = (cLen - neckLen) * SCALE

    // 4. SEATING & FILL
    const tipPos = ovr
    const basePos = ovr - bLen
    const seatingDepth = Math.max(0, cLen - basePos)
    
    const fillRatio = cap > 0 ? (chg / cap) : 0
    const powderHeight = cLen * 0.85 * Math.min(1.05, fillRatio) // Visually approximate 85% case volume

    return {
        scale: SCALE,
        caseH: cLen * SCALE,
        bulletH: bLen * SCALE,
        totalH: ovr * SCALE,
        powderH: powderHeight * SCALE,
        baseW: baseW,
        neckW: rawNeckW, 
        bulletW: dia * SCALE,
        seatingDepth: seatingDepth.toFixed(3),
        fillPercent: (fillRatio * 100).toFixed(0),
        fillRatio,
        shoulderStart: shoulderStartH,
        neckStart: isPistolCase ? cLen * SCALE : neckStartH // Straight wall: Neck start = Top
    }
}
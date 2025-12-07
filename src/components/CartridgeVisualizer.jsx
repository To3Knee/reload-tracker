//===============================================================
//Script Name: CartridgeVisualizer.jsx
//Script Location: src/components/CartridgeVisualizer.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.1.0
//About: Real-time SVG Geometry Engine for Cartridges.
//       - Fixed: Powder visibility (Contrast) + Added Charge Label.
//===============================================================

import { useMemo } from 'react'

/**
 * Renders the Visualizer Component for the UI.
 */
export function CartridgeVisualizer({ 
    bulletLength = 1.2, 
    caseLength = 2.015, 
    diameter = 0.308, 
    coal = 2.800, 
    charge = 0, 
    capacity = 56 
}) {
    
  const dims = useMemo(() => calculateDims(bulletLength, caseLength, diameter, coal, charge, capacity), 
    [bulletLength, caseLength, diameter, coal, charge, capacity])

  // --- SVG PATH GENERATION ---
  // Bullet: Ogive shape approximation
  const bulletPath = `
    M ${-dims.bulletW/2}, ${dims.totalH - dims.bulletH} 
    L ${-dims.bulletW/2}, ${dims.totalH - dims.bulletH * 0.4} 
    Q ${0}, ${dims.totalH} ${dims.bulletW/2}, ${dims.totalH - dims.bulletH * 0.4}
    L ${dims.bulletW/2}, ${dims.totalH - dims.bulletH} 
    Z
  `

  // Case: Bottleneck shape (Generic)
  const shoulderStart = dims.caseH * 0.75
  const neckStart = dims.caseH * 0.88
  
  const casePath = `
    M ${-dims.baseW/2}, 0 
    L ${-dims.baseW/2}, ${shoulderStart}
    L ${-dims.neckW/2}, ${neckStart}
    L ${-dims.neckW/2}, ${dims.caseH}
    L ${dims.neckW/2}, ${dims.caseH}
    L ${dims.neckW/2}, ${neckStart}
    L ${dims.baseW/2}, ${shoulderStart}
    L ${dims.baseW/2}, 0
    Z
  `

  // Powder Column: Dynamic height based on fill ratio
  const powderPath = `
     M ${-dims.baseW/2 + 5}, 5
     L ${-dims.baseW/2 + 5}, ${Math.min(shoulderStart, dims.powderH)}
     ${dims.powderH > shoulderStart ? `L ${-dims.neckW/2 + 2}, ${Math.min(dims.powderH, dims.caseH)}` : ''}
     ${dims.powderH > shoulderStart ? `L ${dims.neckW/2 - 2}, ${Math.min(dims.powderH, dims.caseH)}` : ''}
     L ${dims.baseW/2 - 5}, ${Math.min(shoulderStart, dims.powderH)}
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
                LOAD: <span className="text-slate-200">{charge || 0} gr</span>
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
                {/* Metallic Case Gradient */}
                <linearGradient id="caseGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="20%" stopColor="#d97706" />
                    <stop offset="50%" stopColor="#fcd34d" />
                    <stop offset="80%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                
                {/* Copper Bullet Gradient */}
                <linearGradient id="bulletGrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#451a03" />
                    <stop offset="30%" stopColor="#b45309" />
                    <stop offset="50%" stopColor="#d97706" />
                    <stop offset="70%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#451a03" />
                </linearGradient>

                {/* Powder Pattern - Brightened for visibility */}
                <pattern id="powderPat" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                    <rect width="4" height="4" fill="#292524" /> {/* Dark background */}
                    <circle cx="2" cy="2" r="1" fill="#78716c" /> {/* Lighter grain */}
                </pattern>
            </defs>

            <g transform={`translate(0, 20)`}>
                {/* Powder (Solid fill first, then pattern if needed, but pattern handles BG now) */}
                <path d={powderPath} fill="url(#powderPat)" stroke="#44403c" strokeWidth="0.5" />
                
                {/* Bullet (Behind case neck) */}
                <path d={bulletPath} fill="url(#bulletGrad)" stroke="#713f12" strokeWidth="1" />
                
                {/* Case (Semi-transparent to show powder/bullet) */}
                <path d={casePath} fill="url(#caseGrad)" opacity="0.6" stroke="#fcd34d" strokeWidth="2" />
                
                {/* Dimension Lines */}
                <g transform="scale(1, -1)">
                    {/* COAL Line */}
                    <line x1="80" y1={-dims.totalH} x2="80" y2="0" stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
                    <text x="90" y={-dims.totalH/2} fontSize="10" fill="#94a3b8" transform={`rotate(90 90 ${-dims.totalH/2})`} textAnchor="middle">COAL {coal}"</text>
                    
                    {/* Bullet Seating Line */}
                    <line x1="-80" y1={-dims.caseH} x2="-80" y2={-(dims.totalH - dims.bulletH)} stroke="#64748b" strokeWidth="1" />
                    <text x="-90" y={-((dims.caseH + (dims.totalH - dims.bulletH))/2)} fontSize="10" fill="#94a3b8" transform={`rotate(-90 -90 ${-((dims.caseH + (dims.totalH - dims.bulletH))/2)})`} textAnchor="middle">GRIP</text>
                </g>
            </g>
        </svg>
    </div>
  )
}

/**
 * Shared Math Logic for Visualizer
 */
function calculateDims(bLenInput, cLenInput, diaInput, coalInput, chargeInput, capacityInput) {
    const SCALE = 120 
    
    // Normalize Inputs
    const bLen = Math.max(0.1, Number(bLenInput) || 1.2)
    const cLen = Math.max(0.1, Number(cLenInput) || 2.0)
    const dia = Math.max(0.1, Number(diaInput) || 0.308)
    const ovr = Math.max(cLen, Number(coalInput) || 2.8)
    
    const chg = Number(chargeInput) || 0
    const cap = Number(capacityInput) || 56 // Default ~308 capacity
    
    // Calculate Seating (Intrusion)
    const tipPos = ovr
    const basePos = ovr - bLen
    const seatingDepth = Math.max(0, cLen - basePos)
    
    // Powder Fill
    const fillRatio = cap > 0 ? (chg / cap) : 0
    // Powder height approximation (linear vs bottleneck scaling is complex, simple linear for visualizer)
    const powderHeight = cLen * 0.85 * Math.min(1.05, fillRatio)
    
    return {
        scale: SCALE,
        caseH: cLen * SCALE,
        bulletH: bLen * SCALE,
        totalH: ovr * SCALE,
        powderH: powderHeight * SCALE,
        baseW: 0.470 * SCALE, // Generic base width
        neckW: (dia + 0.03) * SCALE, 
        bulletW: dia * SCALE,
        seatingDepth: seatingDepth.toFixed(3),
        fillPercent: (fillRatio * 100).toFixed(0),
        fillRatio
    }
}
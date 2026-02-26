//===============================================================
//Script Name: Analytics.jsx
//Script Location: src/components/Analytics.jsx
//Date: 12/12/2025
//Created By: T03KNEE
//Version: 4.6.0 (Visual Polish)
//About: Visualizes cost history and production metrics. 
//       - FIX: "Inventory Value" tooltip text is now white/readable.
//       - FIX: "Production Volume" tooltip now formats numbers (e.g. 1,000 rnds).
//       - FIX: Explicit text contrast styles for all charts.
//===============================================================

import { useEffect, useState } from 'react'
import { 
    getMonthlySpendData, 
    getPriceTrendData, 
    getInventoryDistributionData, 
    getLoadVelocityData, 
    getBatchCostHistoryData, 
    getVolumeByCaliberData,
    getSupplyForecastData
} from '../lib/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend, ReferenceLine } from 'recharts'
import { formatCurrency } from '../lib/db'
import { AlertCircle, Clock, Package, Flame, Coins, Crosshair, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']

// Defined outside component — stable object references prevent Recharts
// re-rendering tooltip on every parent render cycle.
const tooltipStyle = {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
    borderRadius: '8px',
    fontSize: '11px',
    color: '#f4f4f5',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    outline: 'none',
}
const itemStyle = { color: '#f4f4f5' }

// --- SUB-COMPONENTS ---

function NoData({ message = "No data recorded" }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-steel-500 space-y-2">
            <AlertCircle size={24} className="opacity-50" />
            <span className="text-xs font-mono uppercase">{message}</span>
        </div>
    )
}

function ForecastItem({ item }) {
    let colorClass = "bg-emerald-500"
    if (item.days < 30) colorClass = "bg-red-600 animate-pulse"
    else if (item.days < 90) colorClass = "bg-amber-500"

    return (
        <div className="flex items-center justify-between p-3 bg-black/40 border border-steel-700 rounded-xl mb-2 last:mb-0">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                <div>
                    <div className="text-xs font-bold text-steel-200">{item.name}</div>
                    <div className="text-[10px] text-steel-500 flex items-center gap-2">
                        <span>{item.rounds.toLocaleString()} rnds left</span>
                        <span className="text-steel-500">•</span>
                        <span className="text-orange-400 font-mono flex items-center gap-0.5">
                            <Flame size={8}/> {item.burnRate}/mo
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs font-mono font-bold text-steel-300">{item.days} Days</div>
                <div className="text-[10px] text-steel-500">Supply</div>
            </div>
        </div>
    )
}

// --- MAIN COMPONENT ---

export function Analytics() {
  const [spendData, setSpendData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [distData, setDistData] = useState([])
  const [velocityData, setVelocityData] = useState([])
  const [costHistory, setCostHistory] = useState([])
  const [volumeData, setVolumeData] = useState([])
  const [forecastData, setForecastData] = useState([])
  
  const [loading, setLoading] = useState(true)

  // Factory Comparison State
  const [factoryPrice, setFactoryPrice] = useState(0.40) 
  const [showFactoryLine, setShowFactoryLine] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    // Swallow per-chart errors but propagate AbortError so Promise.all exits cleanly
    const safe = fn => fn.catch(e => { if (e?.name === 'AbortError') throw e; return [] })

    async function load() {
        try {
            const [spend, trends, dist, vel, costs, vol, forecast] = await Promise.all([
                safe(getMonthlySpendData(signal)),
                safe(getPriceTrendData(signal)),
                safe(getInventoryDistributionData(signal)),
                safe(getLoadVelocityData(signal)),
                safe(getBatchCostHistoryData(signal)),
                safe(getVolumeByCaliberData(signal)),
                safe(getSupplyForecastData(signal)),
            ])
            setSpendData(spend)
            setTrendData(trends)
            setDistData(dist)
            setVelocityData(vel)
            setCostHistory(costs)
            setVolumeData(vol)
            setForecastData(forecast)
        } catch (e) {
            if (e?.name !== 'AbortError') console.error("Analytics Load Error:", e)
        } finally {
            setLoading(false)
        }
    }
    load()
    return () => controller.abort()
  }, [])

  if (loading) return <div className="p-8 text-center text-xs text-steel-500 animate-pulse">Running Ballistics Calculations...</div>

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER */}
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Intelligence</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">ANALYTICS</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
          
          {/* 1. SPEND HISTORY */}
          <div className="glass rounded-2xl p-6 border border-steel-700/50">
            <h3 className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Coins size={14} className="text-emerald-500"/> Monthly Spend
            </h3>
            <div className="h-[250px] w-full">
                {spendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={spendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="month" stroke="#555" fontSize={10} tickMargin={10} />
                            <YAxis stroke="#555" fontSize={10} tickFormatter={(val) => `$${val}`} />
                            <Tooltip 
                                contentStyle={tooltipStyle}
                                itemStyle={itemStyle}
                                formatter={(val) => formatCurrency(val)}
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            />
                            <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <NoData message="No Purchase History" />}
            </div>
          </div>

          {/* 2. COST PER ROUND */}
          <div className="glass rounded-2xl p-6 border border-steel-700/50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-steel-500 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-500"/> Cost Per Round History
                </h3>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowFactoryLine(!showFactoryLine)}
                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition ${showFactoryLine ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'bg-steel-700 text-steel-400 border border-steel-600'}`}
                    >
                        Vs Factory
                    </button>
                    {showFactoryLine && (
                        <div className="flex items-center bg-black/40 border border-blue-900/50 rounded px-2">
                            <span className="text-[10px] text-blue-500 mr-1">$</span>
                            <input 
                                type="number" 
                                step="0.01" 
                                className="w-10 bg-transparent text-[10px] text-blue-300 focus:outline-none font-mono"
                                value={factoryPrice}
                                onChange={(e) => setFactoryPrice(Number(e.target.value))}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="h-[250px] w-full">
                {costHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={costHistory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <defs>
                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="date" stroke="#555" fontSize={10} tickFormatter={(str) => str.substring(5)} />
                            <YAxis stroke="#555" fontSize={10} tickFormatter={(val) => `$${val}`} />
                            <Tooltip 
                                contentStyle={tooltipStyle} 
                                itemStyle={itemStyle}
                                formatter={(val) => [`$${val.toFixed(3)}`, 'Cost/Rnd']} 
                            />
                            <Area type="monotone" dataKey="cost" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
                            
                            {showFactoryLine && (
                                <ReferenceLine
                                    y={factoryPrice}
                                    stroke="#60a5fa"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{ value: `Factory $${factoryPrice.toFixed(2)}`, fill: '#60a5fa', fontSize: 9, position: 'insideTopRight' }}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <NoData message="No Batches Logged" />}
            </div>
          </div>

          {/* 3. INVENTORY VALUE (Pie) */}
          <div className="glass rounded-2xl p-6 border border-steel-700/50">
            <h3 className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package size={14} className="text-amber-500"/> Inventory Value
            </h3>
            <div className="h-[250px] w-full flex items-center justify-center">
                {distData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie
                                data={distData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                                stroke="none"
                            >
                                {distData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={tooltipStyle} 
                                itemStyle={itemStyle} // FIX: Ensures white text
                                formatter={(val) => formatCurrency(val)} 
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : <NoData message="Inventory Empty" />}
            </div>
          </div>

          {/* 4. SUPPLY FORECAST */}
          <div className="glass rounded-2xl p-6 border border-steel-700/50 flex flex-col">
            <h3 className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Flame size={14} className="text-orange-500"/> Supply Forecast
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[250px]">
                {forecastData.length > 0 ? (
                    forecastData.map((item, i) => (
                        <ForecastItem key={item.name} item={item} />
                    ))
                ) : <NoData message="Not Enough Usage Data" />}
            </div>
          </div>

          {/* 5. VELOCITY CONSISTENCY */}
          <div className="glass rounded-2xl p-6 border border-steel-700/50 lg:col-span-2">
            <h3 className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={14} className="text-purple-500"/> Velocity Consistency (SD)
            </h3>
            <div className="h-[250px] w-full">
                {velocityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <LineChart data={velocityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="date" stroke="#555" fontSize={10} tickFormatter={(str) => str.substring(5)} />
                            <YAxis stroke="#555" fontSize={10} label={{ value: 'SD (fps)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 9 }} />
                            <Tooltip 
                                contentStyle={tooltipStyle}
                                itemStyle={itemStyle}
                                labelFormatter={(label, payload) => {
                                    if (!payload || !payload.length) return label;
                                    return `${payload[0].payload.name} (${payload[0].payload.caliber})`;
                                }}
                            />
                            <Line type="monotone" dataKey="sd" stroke="#8b5cf6" strokeWidth={2} dot={{r: 3, fill: '#8b5cf6'}} activeDot={{r: 5}} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : <NoData message="No Range Data" />}
            </div>
          </div>

          {/* 6. TOP CALIBERS */}
          <div className="glass rounded-2xl p-6 border border-steel-700/50 lg:col-span-2">
            <h3 className="text-xs font-bold text-steel-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Crosshair size={14} className="text-red-500"/> Production Volume
            </h3>
            <div className="h-[200px] w-full">
                {volumeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={volumeData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={true} vertical={false} />
                            <XAxis type="number" stroke="#555" fontSize={10} />
                            <YAxis dataKey="name" type="category" stroke="#999" fontSize={10} width={60} />
                            <Tooltip 
                                contentStyle={tooltipStyle} 
                                itemStyle={itemStyle}
                                cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                formatter={(value) => [`${value.toLocaleString()} rnds`, 'Total Loaded']} // FIX: Formatted nicely
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <NoData message="No Production History" />}
            </div>
          </div>

      </div>
    </div>
  )
}
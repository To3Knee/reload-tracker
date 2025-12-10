//===============================================================
//Script Name: Analytics.jsx
//Script Location: src/components/Analytics.jsx
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 4.3.0 (Interactive Factory Compare)
//About: Visualizes cost history and production metrics. 
//       - FEATURE: Clickable 'Compare vs Factory' with adjustable price.
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts'
import { formatCurrency } from '../lib/db'
import { AlertCircle, Clock, Package, Flame, Coins, Crosshair, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']

function NoData({ message = "No data recorded" }) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-xl bg-black/20">
            <AlertCircle size={24} className="mb-2 opacity-50" />
            <span className="text-xs font-medium uppercase tracking-wider">{message}</span>
        </div>
    )
}

function ForecastItem({ type, months, mode }) {
    let color = 'bg-slate-700';
    let text = 'text-slate-500';
    let label = 'Idle / No Usage';
    let percent = 0;

    if (months !== null) {
        if (months === 0) {
            color = 'bg-red-900';
            text = 'text-red-500';
            label = 'Empty';
            percent = 5;
        } else {
            percent = Math.min((months / 12) * 100, 100);
            label = `${months} Months`;
            
            if (months < 3) { color = 'bg-red-500'; text = 'text-red-400'; }
            else if (months < 6) { color = 'bg-amber-500'; text = 'text-amber-400'; }
            else { color = 'bg-emerald-500'; text = 'text-emerald-400'; }
        }
    } else {
        color = 'bg-slate-600';
        text = 'text-slate-400';
        percent = 100; 
    }
    
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{type}</span>
                <span className={`text-xs font-mono font-bold ${text}`}>{label} {mode === 'Long Term' && <span className="text-[8px] text-slate-600 ml-1">(LTA)</span>}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    )
}

export function Analytics() {
  const [distData, setDistData] = useState([])
  const [velocityData, setVelocityData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [volumeData, setVolumeData] = useState([])
  const [forecastData, setForecastData] = useState([])
  const [loading, setLoading] = useState(true)

  // Factory Compare State
  const [showFactory, setShowFactory] = useState(false)
  const [factoryPrice, setFactoryPrice] = useState(1.20) // Default $1.20

  const avgCost = historyData.length > 0 ? historyData[historyData.length - 1].cost : 0;
  const savingsPerRound = Math.max(0, factoryPrice - avgCost);
  const savingsPercent = avgCost > 0 ? Math.round((savingsPerRound / factoryPrice) * 100) : 0;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [dist, velocity, history, volume, forecast] = await Promise.all([
            getInventoryDistributionData().catch(()=>[]), 
            getLoadVelocityData().catch(()=>[]), 
            getBatchCostHistoryData().catch(()=>[]),
            getVolumeByCaliberData().catch(()=>[]),
            getSupplyForecastData().catch(()=>[])
        ])
        setDistData(dist || [])
        setVelocityData(velocity || [])
        setHistoryData(history || [])
        setVolumeData(volume || [])
        setForecastData(forecast || [])
      } catch (e) {
         console.error("Analytics Load Error", e)
      } finally { 
        setLoading(false) 
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading Intelligence...</div>

  const tooltipStyle = {
      backgroundColor: '#09090b', 
      border: '1px solid #333', 
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      color: '#fff',
      fontSize: '11px',
      padding: '8px 12px'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Intelligence</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">ANALYTICS</h2>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. BURN RATE */}
          <div className="glass rounded-2xl p-6 border border-zinc-800/50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Flame size={14} className="text-red-500"/> Burn Rate (Rounds/Mo)
            </h3>
            <div className="h-[200px] w-full">
                {velocityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={velocityData}>
                            <defs><linearGradient id="colorRounds" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="month" stroke="#555" fontSize={10} tickMargin={10} />
                            <YAxis stroke="#555" fontSize={10} />
                            <Tooltip contentStyle={tooltipStyle} itemStyle={{color: '#f59e0b'}} />
                            <Area type="monotone" dataKey="rounds" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRounds)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <NoData message="No Batches Logged" />}
            </div>
          </div>

          {/* 2. SUPPLY ENDURANCE */}
          <div className="glass rounded-2xl p-6 border border-zinc-800/50 flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={14} className="text-red-500"/> Supply Endurance
            </h3>
            <div className="flex-1 flex flex-col justify-center">
                {forecastData.length > 0 ? (
                    forecastData.map(f => <ForecastItem key={f.type} type={f.type} months={f.months} mode={f.mode} />)
                ) : <NoData message="Need Data" />}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/50 text-[9px] text-slate-500 text-center">
                Based on 90-day activity (or Long Term).
            </div>
          </div>

          {/* 3. INVENTORY VALUE */}
          <div className="glass rounded-2xl p-6 border border-zinc-800/50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package size={14} className="text-red-500"/> Inventory Value
            </h3>
            <div className="h-[200px] w-full">
                {distData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                            <Pie data={distData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                {distData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} itemStyle={{color: '#ccc'}} formatter={(val) => formatCurrency(val)} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '10px', color: '#888'}} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <NoData message="Empty Inventory" />}
            </div>
          </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
          {/* 4. COST TREND (INTERACTIVE) */}
          <div className="glass rounded-2xl p-6 border border-zinc-800/50 md:col-span-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-white transition" onClick={() => setShowFactory(!showFactory)}>
                    <Coins size={14} className="text-red-500"/> Avg Cost Per Round
                    {showFactory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </h3>
                
                {showFactory && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-700">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Compare vs Factory ($):</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            className="w-16 bg-black border border-zinc-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500"
                            value={factoryPrice}
                            onChange={(e) => setFactoryPrice(Number(e.target.value))}
                        />
                    </div>
                )}

                {avgCost > 0 && !showFactory && (
                    <div className="text-right cursor-pointer" onClick={() => setShowFactory(true)}>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">vs Factory (${factoryPrice.toFixed(2)})</span>
                        <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 justify-end">
                            <TrendingUp size={12} /> {savingsPercent}% Savings
                        </span>
                    </div>
                )}
            </div>
            
            <div className="h-[250px] w-full">
                {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="date" stroke="#555" fontSize={10} tickMargin={10} />
                            <YAxis stroke="#555" fontSize={10} tickFormatter={(val) => `$${val}`} />
                            <Tooltip contentStyle={tooltipStyle} itemStyle={{color: '#ef4444'}} formatter={(val) => formatCurrency(val)} />
                            <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 0}} activeDot={{r: 6}} />
                            {/* Comparison Line */}
                            {showFactory && (
                                <Line type="monotone" dataKey={() => factoryPrice} stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} name="Factory Price" />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                ) : <NoData message="No History" />}
            </div>
          </div>

          {/* 5. TOP CALIBERS */}
          <div className="glass rounded-2xl p-6 border border-zinc-800/50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Crosshair size={14} className="text-red-500"/> Top Calibers
            </h3>
            <div className="h-[250px] w-full">
                {volumeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={volumeData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={true} vertical={false} />
                            <XAxis type="number" stroke="#555" fontSize={10} />
                            <YAxis dataKey="name" type="category" stroke="#999" fontSize={10} width={60} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <NoData message="No Volume Data" />}
            </div>
          </div>
      </div>
    </div>
  )
}
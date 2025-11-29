//===============================================================
//Script Name: Analytics.jsx
//Script Location: src/components/Analytics.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 2.0.0
//About: Visualizes cost history, inventory value, and trends.
//===============================================================

import { useEffect, useState } from 'react'
import { 
  getMonthlySpendData, 
  getPriceTrendData, 
  getInventoryDistributionData, 
  getLoadVelocityData, 
  getBatchCostHistoryData 
} from '../lib/analytics'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { formatCurrency } from '../lib/db'
import { TrendingUp, DollarSign, PieChart as PieIcon, Activity, Zap } from 'lucide-react'

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

export function Analytics() {
  const [spendData, setSpendData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [distData, setDistData] = useState([])
  const [velocityData, setVelocityData] = useState([])
  const [historyData, setHistoryData] = useState([])
  
  const [trendType, setTrendType] = useState('powder')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [spend, trends, dist, velocity, history] = await Promise.all([
        getMonthlySpendData(),
        getPriceTrendData(),
        getInventoryDistributionData(),
        getLoadVelocityData(),
        getBatchCostHistoryData()
      ])
      setSpendData(spend)
      setTrendData(trends)
      setDistData(dist)
      setVelocityData(velocity)
      setHistoryData(history)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeTrends = trendData.filter(d => d.type === trendType)

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading Analytics...</div>

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold flex items-center gap-3">
        <span className="block glow-red">Analytics</span>
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
          {/* 1. INVENTORY DISTRIBUTION (PIE) */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-900/20 rounded-full text-purple-400"><PieIcon size={20} /></div>
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Inventory Value</p>
                    <p className="text-sm text-slate-400">Where is your money tied up?</p>
                </div>
            </div>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={distData}
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {distData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                            ))}
                        </Pie>
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="bg-black/90 border border-slate-700 p-2 rounded text-xs">
                                        <span className="font-bold" style={{color: payload[0].payload.fill}}>{payload[0].name}:</span> {formatCurrency(payload[0].value)}
                                    </div>
                                )
                                }
                                return null
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 flex-wrap mt-[-20px]">
                {distData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1 text-[10px] text-slate-400">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                        {entry.name}
                    </div>
                ))}
            </div>
          </div>

          {/* 2. LOAD VELOCITY (AREA) */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-900/20 rounded-full text-amber-400"><Zap size={20} /></div>
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Burn Rate</p>
                    <p className="text-sm text-slate-400">Rounds loaded per month.</p>
                </div>
            </div>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={velocityData}>
                        <defs>
                            <linearGradient id="colorRounds" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="month" stroke="#666" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                        <Area type="monotone" dataKey="rounds" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRounds)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
      </div>

      {/* 3. COST PER ROUND HISTORY (LINE) */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-900/20 rounded-full text-red-400"><Activity size={20} /></div>
            <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Inflation Tracker</p>
                <p className="text-sm text-slate-400">Actual cost-per-round of batches over time.</p>
            </div>
        </div>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickMargin={10} />
                    <YAxis stroke="#666" fontSize={10} tickFormatter={(val) => `$${val}`} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} formatter={(val) => formatCurrency(val)} />
                    <Line type="stepAfter" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* 4. COMPONENT PRICE TRENDS (EXISTING) */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/20 rounded-full text-blue-400"><TrendingUp size={20} /></div>
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Market Prices</p>
                    <p className="text-sm text-slate-400">Unit cost history.</p>
                </div>
            </div>
            <div className="flex bg-black/40 rounded-full p-1 border border-slate-800">
                {['powder', 'primer', 'bullet'].map(type => (
                    <button
                        key={type}
                        onClick={() => setTrendType(type)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                            trendType === type ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" fontSize={10} tickMargin={10} />
                  <YAxis stroke="#666" fontSize={10} tickFormatter={(val) => `$${val}`} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                  <Line type="monotone" dataKey="unitCost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 2, stroke: '#000' }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
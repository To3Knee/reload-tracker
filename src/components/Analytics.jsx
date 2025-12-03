//===============================================================
//Script Name: Analytics.jsx
//Script Location: src/components/Analytics.jsx
//Date: 12/02/2025
//Created By: T03KNEE
//Version: 2.3.1 (Recharts Layout Fix)
//About: Visualizes cost history. 
//       - FIX: Added minWidth={0} to ResponsiveContainers to prevent grid layout warnings.
//===============================================================

import { useEffect, useState } from 'react'
import { getMonthlySpendData, getPriceTrendData, getInventoryDistributionData, getLoadVelocityData, getBatchCostHistoryData } from '../lib/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { formatCurrency } from '../lib/db'
import { TrendingUp, DollarSign, PieChart as PieIcon, Activity, Zap } from 'lucide-react'

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

export function Analytics() {
  const [trendData, setTrendData] = useState([])
  const [distData, setDistData] = useState([])
  const [velocityData, setVelocityData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)
  const [trendType, setTrendType] = useState('powder')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [trends, dist, velocity, history] = await Promise.all([
            getPriceTrendData(), getInventoryDistributionData(), getLoadVelocityData(), getBatchCostHistoryData()
        ])
        setTrendData(trends)
        setDistData(dist)
        setVelocityData(velocity)
        setHistoryData(history)
      } catch (e) {
        // Silent fail or log
      } finally { 
        setLoading(false) 
      }
    }
    load()
  }, [])

  const activeTrends = trendData.filter(d => d.type === trendType)

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading Analytics...</div>

  return (
    <div className="space-y-8">
      {/* HUD HEADER */}
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-red-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-0.5">Intelligence</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">ANALYTICS</h2>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Inventory Value</h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                        <Pie data={distData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {distData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />)}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Burn Rate (Rounds/Month)</h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={velocityData}>
                        <defs><linearGradient id="colorRounds" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="month" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} />
                        <Area type="monotone" dataKey="rounds" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRounds)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
      </div>
      
      {/* Trend Chart */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Cost Per Round History</h3>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} formatter={(val) => formatCurrency(val)} />
                    <Line type="stepAfter" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
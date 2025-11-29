//===============================================================
//Script Name: Analytics.jsx
//Script Location: src/components/Analytics.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Visualizes cost history and trends using Recharts.
//===============================================================

import { useEffect, useState } from 'react'
import { getMonthlySpendData, getPriceTrendData } from '../lib/analytics'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { formatCurrency } from '../lib/db'
import { TrendingUp, DollarSign } from 'lucide-react'

export function Analytics() {
  const [spendData, setSpendData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [trendType, setTrendType] = useState('powder') // powder | primer | bullet
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [spend, trends] = await Promise.all([
        getMonthlySpendData(),
        getPriceTrendData()
      ])
      setSpendData(spend)
      setTrendData(trends)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter trends for the active chart
  const activeTrends = trendData.filter(d => d.type === trendType)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-slate-200">{label}</p>
          <p className="text-emerald-400">
            {payload[0].value}
          </p>
          {payload[0].payload.label && (
             <p className="text-slate-400 mt-1 italic">{payload[0].payload.label}</p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading Analytics...</div>

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold flex items-center gap-3">
        <span className="block glow-red">Analytics</span>
      </h2>

      {/* SPEND CHART */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-900/20 rounded-full text-emerald-400"><DollarSign size={20} /></div>
            <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Monthly Spend</p>
                <p className="text-sm text-slate-400">Total investment over time (Price + Ship + Tax).</p>
            </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#666" 
                fontSize={10} 
                tickMargin={10}
              />
              <YAxis 
                stroke="#666" 
                fontSize={10} 
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                cursor={{fill: '#ffffff10'}}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                    return (
                        <div className="bg-black/90 border border-slate-700 p-3 rounded-lg text-xs">
                        <p className="font-bold text-slate-200">{label}</p>
                        <p className="text-emerald-400 font-mono text-sm">
                            {formatCurrency(payload[0].value)}
                        </p>
                        </div>
                    )
                    }
                    return null
                }}
              />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TRENDS CHART */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/20 rounded-full text-blue-400"><TrendingUp size={20} /></div>
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Price Trends</p>
                    <p className="text-sm text-slate-400">Unit cost history ({trendType === 'powder' ? '$/lb' : '$/unit'}).</p>
                </div>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex bg-black/40 rounded-full p-1 border border-slate-800">
                {['powder', 'primer', 'bullet'].map(type => (
                    <button
                        key={type}
                        onClick={() => setTrendType(type)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                            trendType === type 
                            ? 'bg-slate-700 text-white shadow-lg' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>

        <div className="h-[300px] w-full">
             {activeTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" fontSize={10} tickMargin={10} />
                  <YAxis 
                    stroke="#666" 
                    fontSize={10} 
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="unitCost" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 2, stroke: '#000' }} 
                    activeDot={{ r: 6, fill: '#60a5fa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
             ) : (
                 <div className="h-full flex items-center justify-center text-slate-600 text-xs italic border border-dashed border-slate-800 rounded-xl">
                     No purchase history for {trendType} yet.
                 </div>
             )}
        </div>
      </div>
    </div>
  )
}
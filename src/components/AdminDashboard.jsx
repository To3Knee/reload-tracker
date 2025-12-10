//===============================================================
//Script Name: AdminDashboard.jsx
//Script Location: src/components/AdminDashboard.jsx
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.0.1
//About: The "Command Center" for System Administration.
//       - FIX: Corrected HTML syntax error (closed thead tag).
//===============================================================

import { useState, useEffect } from 'react'
import { Terminal, Users, Settings, Play, Database, AlertTriangle, CheckCircle } from 'lucide-react'
import { listAdminUsers, registerUser, updateUser, removeUser } from '../lib/auth'
import { fetchSettings, saveSetting } from '../lib/settings'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-1.5 self-stretch bg-purple-600 rounded-sm"></div>
        <div>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-purple-500 font-bold mb-0.5">System Core</span>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-wide">COMMAND CENTER</h2>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-zinc-800">
          <TabButton id="users" label="User Management" icon={Users} active={activeTab} set={setActiveTab} />
          <TabButton id="sql" label="SQL Console" icon={Terminal} active={activeTab} set={setActiveTab} />
          <TabButton id="config" label="Configuration" icon={Settings} active={activeTab} set={setActiveTab} />
      </div>

      <div className="glass p-6 rounded-2xl min-h-[500px]">
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'sql' && <SqlConsole />}
          {activeTab === 'config' && <ConfigManager />}
      </div>
    </div>
  )
}

function TabButton({ id, label, icon: Icon, active, set }) {
    return (
        <button 
            onClick={() => set(id)}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${active === id ? 'border-purple-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
            <Icon size={16} /> {label}
        </button>
    )
}

// --- SUB-COMPONENT: SQL CONSOLE ---
function SqlConsole() {
    const [query, setQuery] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    async function runQuery() {
        if(!query) return
        setLoading(true)
        setResult(null)
        try {
            const res = await fetch('/api/system', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'sql', query })
            })
            const data = await res.json()
            setResult(data)
        } catch(e) {
            setResult({ success: false, error: e.message })
        } finally { setLoading(false) }
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                <div>
                    <h4 className="text-xs font-bold text-red-400">Danger Zone</h4>
                    <p className="text-[10px] text-red-400/70">Raw SQL access. Irreversible actions. Use caution.</p>
                </div>
            </div>

            <textarea 
                className="w-full h-48 bg-zinc-950 border border-zinc-700 rounded-xl p-4 font-mono text-xs text-emerald-400 focus:border-purple-500 focus:outline-none"
                placeholder="SELECT * FROM users;"
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            
            <div className="flex justify-end">
                <button onClick={runQuery} disabled={loading} className="px-6 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg flex items-center gap-2 transition">
                    <Play size={16} fill="currentColor" /> Execute
                </button>
            </div>

            {/* RESULTS */}
            {result && (
                <div className={`p-4 rounded-xl border ${result.success ? 'bg-zinc-900/50 border-zinc-700' : 'bg-red-900/20 border-red-500/50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        {result.success ? <CheckCircle size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-red-500"/>}
                        <span className="text-xs font-bold text-zinc-200">{result.success ? 'Success' : 'Error'}</span>
                        <span className="text-[10px] text-zinc-500 ml-auto">{result.message || ''}</span>
                    </div>
                    
                    {result.error && <pre className="text-[10px] text-red-400 whitespace-pre-wrap">{result.error}</pre>}
                    
                    {result.rows && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[10px] text-zinc-300">
                                <thead className="border-b border-zinc-700 text-zinc-500">
                                    <tr>{Object.keys(result.rows[0] || {}).map(k => <th key={k} className="p-2">{k}</th>)}</tr>
                                </thead> {/* FIXED CLOSING TAG */}
                                <tbody>
                                    {result.rows.map((row, i) => (
                                        <tr key={i} className="border-b border-zinc-800/50 hover:bg-white/5">
                                            {Object.values(row).map((v, j) => <td key={j} className="p-2 truncate max-w-[200px]">{String(v)}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// --- PLACEHOLDERS FOR OTHER TABS ---
function UserManager() { return <div className="text-zinc-500 text-sm">User Management Module Loading...</div> }
function ConfigManager() { return <div className="text-zinc-500 text-sm">System Config Module Loading...</div> }
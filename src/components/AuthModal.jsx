//===============================================================
//Script Name: AuthModal.jsx
//Script Location: src/components/AuthModal.jsx
//Date: 11/29/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 2.8.1
//About: Professional "Access & Roles" modal.
//       Features: Admin-led management, System Settings.
//       Updated: Tabs now use "Pro Pill" styling for mobile fit.
//===============================================================

import { useEffect, useState } from 'react'
import { X, Shield, UserCircle2, Users, LogIn, Lock, Settings, Bot, AlertTriangle, Info, ChevronDown } from 'lucide-react'
import {
  ROLE_ADMIN,
  ROLE_SHOOTER,
  listAdminUsers,
  registerUser,
  updateUser,
  loginUser,
  resetUserPassword,
  removeUser,
} from '../lib/auth'
import { fetchSettings, saveSetting } from '../lib/settings'

export default function AuthModal({
  open,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) {
  // --- STATE ---
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  
  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER,
  })
  const [editingUserId, setEditingUserId] = useState(null)
  
  const [resetForm, setResetForm] = useState({ username: '', newPassword: '' })
  const [adminUsers, setAdminUsers] = useState([])
  
  const [systemSettings, setSystemSettings] = useState({ ai_enabled: 'false', ai_model: 'gemini-2.0-flash', hasAiKey: false })
  const [newModelName, setNewModelName] = useState('')

  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState('manage') 

  const isAdmin = currentUser?.role === ROLE_ADMIN

  useEffect(() => {
    if (!open) return
    if (isAdmin) {
      loadUsers()
      loadSettings()
    } else {
      setAdminUsers([])
    }
    clearMessages()
    handleCancelEdit()
  }, [open, currentUser, isAdmin])

  async function loadUsers() {
    try {
      const users = await listAdminUsers()
      setAdminUsers(users)
    } catch (err) { console.log(err) }
  }

  async function loadSettings() {
    try {
      const data = await fetchSettings()
      setSystemSettings(data)
      setNewModelName(data.ai_model || 'gemini-2.0-flash')
    } catch (err) { console.log(err) }
  }

  function clearMessages() {
    setStatusMessage('')
    setErrorMessage('')
  }

  function handleEditUser(user) {
    setEditingUserId(user.id)
    setNewUser({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      phone: user.phone || '',
      email: user.email || '',
      password: '', 
      role: user.role || ROLE_SHOOTER
    })
    setActiveTab('manage')
    setStatusMessage(`Editing user "${user.username}".`)
    setErrorMessage('')
  }

  function handleCancelEdit() {
    setEditingUserId(null)
    setNewUser({
      firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER,
    })
  }

  async function handleLoginSubmit(e) {
    e.preventDefault()
    setBusy(true)
    clearMessages()
    try {
      const user = await loginUser({
        username: loginForm.username,
        password: loginForm.password,
      })
      setStatusMessage(`Welcome back, ${user.firstName || user.username}.`)
      setLoginForm({ username: '', password: '' })
      if (onLogin) onLogin(user)
    } catch (err) {
      setErrorMessage(err?.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegisterOrUpdateSubmit(e) {
    e.preventDefault()
    setBusy(true)
    clearMessages()

    try {
      if (editingUserId) {
        const payload = { ...newUser }
        if (!payload.password) delete payload.password
        await updateUser(editingUserId, payload)
        setStatusMessage(`User "${newUser.username}" updated.`)
        handleCancelEdit()
      } else {
        await registerUser(newUser)
        setStatusMessage(`User "${newUser.username}" created successfully.`)
        handleCancelEdit()
      }
      if (isAdmin) loadUsers()
    } catch (err) {
      setErrorMessage(err?.message || 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    setBusy(true)
    clearMessages()
    try {
      await resetUserPassword({
        username: resetForm.username,
        newPassword: resetForm.newPassword,
      })
      setStatusMessage(`Password reset for "${resetForm.username}".`)
      setResetForm({ username: '', newPassword: '' })
    } catch (err) {
      setErrorMessage(err?.message || 'Unable to reset password.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveUser(id) {
    if (!window.confirm('Are you sure you want to remove this user? This cannot be undone.')) return
    setBusy(true)
    clearMessages()
    try {
      await removeUser(id)
      await loadUsers()
      setStatusMessage('User removed.')
      if (currentUser && currentUser.id === id && onLogout) {
        onLogout()
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Unable to remove user.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAi(enabled) {
    setBusy(true)
    try {
        await saveSetting('ai_enabled', enabled)
        setSystemSettings(prev => ({ ...prev, ai_enabled: String(enabled) }))
        window.location.reload() 
    } catch (err) {
        setErrorMessage(err.message)
    } finally {
        setBusy(false)
    }
  }
  
  async function saveModelName() {
    setBusy(true)
    try {
        await saveSetting('ai_model', newModelName)
        setSystemSettings(prev => ({ ...prev, ai_model: newModelName }))
        setStatusMessage('AI Model updated.')
    } catch (err) {
        setErrorMessage(err.message)
    } finally {
        setBusy(false)
    }
  }

  if (!open) return null

  const inputClass = "w-full bg-[#1a1a1a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-slate-600"
  const labelClass = "block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider"
  
  // UPDATED: "Pro Pill" Style for Tabs
  const tabClass = (active) => `
    px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition whitespace-nowrap flex-shrink-0
    ${active 
      ? 'bg-red-900/20 border-red-500/50 text-red-200 shadow-sm' 
      : 'bg-black/40 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
    }
  `

  const containerClass = isAdmin 
    ? "w-full max-w-4xl flex-col md:flex-row" 
    : "w-full max-w-md flex-col"

  const leftPaneClass = isAdmin
    ? "w-full md:w-[35%] border-b md:border-b-0 md:border-r border-slate-800"
    : "w-full"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 md:p-4">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #1a1a1a inset !important;
            -webkit-text-fill-color: white !important;
            caret-color: white !important;
            border: 1px solid #334155 !important;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div className={`bg-[#0f0f10] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex ${containerClass} max-h-[85vh]`}>
        
        {/* === LEFT PANE: LOGIN & SESSION === */}
        <div className={`${leftPaneClass} bg-black/40 p-4 md:p-6 flex flex-col relative flex-shrink-0`}>
            
          {!isAdmin && (
             <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition">
               <X size={20} />
             </button>
          )}

          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-red-500" size={20} />
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Access & Roles</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authenticate to unlock editing capabilities.
            </p>
          </div>

          {/* Current Session */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-4 md:mb-6">
            <p className={labelClass}>Current Session</p>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${currentUser?.role === ROLE_ADMIN ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                <UserCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {currentUser ? (currentUser.username || currentUser.email) : 'Guest User'}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {currentUser?.role === ROLE_ADMIN ? 'Reloader (Admin)' : 'Shooter (Read-only)'}
                </p>
              </div>
            </div>
          </div>

          {!currentUser ? (
            <div className="flex-1">
                <p className={labelClass}>Sign In</p>
                <form onSubmit={handleLoginSubmit} className="space-y-3 mt-2">
                <input
                    className={inputClass}
                    placeholder="Username or Email"
                    value={loginForm.username}
                    onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                />
                <input
                    type="password"
                    className={inputClass}
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                />
                <div className="pt-2 flex flex-col gap-2">
                    <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white transition shadow-lg shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                    <LogIn size={14} />
                    {busy ? 'Verifying...' : 'Sign In'}
                    </button>
                </div>
                </form>
            </div>
          ) : (
             <div className="mt-auto">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition"
                  >
                    Sign Out
                  </button>
             </div>
          )}

          {(statusMessage || errorMessage) && (
            <div className="mt-4 p-3 rounded-lg bg-black/40 border border-slate-800">
              {statusMessage && <p className="text-[10px] text-emerald-400">{statusMessage}</p>}
              {errorMessage && <p className="text-[10px] text-red-400">{errorMessage}</p>}
            </div>
          )}
        </div>

        {/* === RIGHT PANE: MANAGEMENT (ADMIN ONLY) === */}
        {isAdmin && (
          <div className="w-full md:w-[65%] p-4 md:p-6 bg-gradient-to-br from-[#121214] to-[#0a0a0a] flex flex-col overflow-hidden relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition">
              <X size={20} />
            </button>

            {/* Tabs - "Pro Pill" Style */}
            <div className="w-full max-w-full flex gap-2 mb-6 border-b border-slate-800 pb-4 overflow-x-auto no-scrollbar p-1">
              <button onClick={() => setActiveTab('manage')} className={tabClass(activeTab === 'manage')}>
                Users
              </button>
              <button onClick={() => setActiveTab('reset')} className={tabClass(activeTab === 'reset')}>
                Passwords
              </button>
              <button onClick={() => setActiveTab('system')} className={tabClass(activeTab === 'system')}>
                System
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {/* View: User Management */}
              {activeTab === 'manage' && (
                <div className="space-y-6">
                  <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-800/60">
                    {/* HEADER: Responsive Layout */}
                    <div className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:items-center mb-4 w-full">
                      <h3 className="text-xs md:text-sm font-bold text-slate-300 flex items-center gap-2">
                        <Users size={16} className="text-red-500" />
                        {editingUserId ? 'Edit User' : 'Create New User'}
                      </h3>
                      {editingUserId && (
                        <button onClick={handleCancelEdit} className="text-[10px] text-red-400 hover:underline">
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleRegisterOrUpdateSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>First Name</label>
                          <input className={inputClass} value={newUser.firstName} onChange={e => setNewUser(p => ({ ...p, firstName: e.target.value }))} />
                        </div>
                        <div>
                          <label className={labelClass}>Last Name</label>
                          <input className={inputClass} value={newUser.lastName} onChange={e => setNewUser(p => ({ ...p, lastName: e.target.value }))} />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Username</label>
                          <input className={inputClass} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
                        </div>
                        <div>
                          <label className={labelClass}>Phone</label>
                          <input className={inputClass} value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className={labelClass}>Email</label>
                          <input type="email" className={inputClass} value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>{editingUserId ? 'New Password (Optional)' : 'Password'}</label>
                          <input type="password" className={inputClass} value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                        </div>
                        <div>
                          <label className={labelClass}>Role</label>
                          <div className="relative">
                            <select 
                              className={`${inputClass} appearance-none`}
                              value={newUser.role}
                              onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                            >
                              <option value={ROLE_SHOOTER}>Shooter (Read-only)</option>
                              <option value={ROLE_ADMIN}>Reloader (Admin)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2 flex justify-end">
                        <button type="submit" disabled={busy} className="px-5 py-2 rounded-full bg-red-900/40 text-red-200 border border-red-500/30 hover:bg-red-900/60 text-xs font-bold transition">
                          {busy ? 'Saving...' : editingUserId ? 'Save Changes' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* User List */}
                  <div>
                    <p className={labelClass}>User Directory</p>
                    {adminUsers.length === 0 ? (
                      <div className="text-center p-4 border border-dashed border-slate-800 rounded-lg text-xs text-slate-600">
                        No users found.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {adminUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-slate-800/50 group hover:border-slate-700 transition">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.role === ROLE_ADMIN ? 'bg-red-500' : 'bg-slate-600'}`} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate">{u.username}</p>
                                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handleEditUser(u)} className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white transition">Edit</button>
                              <button onClick={() => handleRemoveUser(u.id)} className="px-2 py-1 rounded bg-red-900/30 text-[10px] text-red-400 hover:bg-red-900/50 transition">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: PASSWORDS */}
              {activeTab === 'reset' && (
                <div className="space-y-6">
                  <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-800/60">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
                      <Lock size={16} className="text-red-500" />
                      Admin Password Reset
                    </h3>
                    <form onSubmit={handleResetSubmit} className="space-y-3">
                      <div>
                        <label className={labelClass}>Target Username</label>
                        <input className={inputClass} value={resetForm.username} onChange={e => setResetForm(p => ({ ...p, username: e.target.value }))} />
                      </div>
                      <div>
                        <label className={labelClass}>New Password</label>
                        <input type="password" className={inputClass} value={resetForm.newPassword} onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} />
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button type="submit" disabled={busy} className="px-5 py-2 rounded-full bg-red-900/40 text-red-200 border border-red-500/30 hover:bg-red-900/60 text-xs font-bold transition">
                          Reset Password
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB: SYSTEM SETTINGS */}
              {activeTab === 'system' && (
                  <div className="space-y-6">
                      <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-800/60">
                          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4"><Settings size={16} className="text-red-500" />System Configuration</h3>
                          
                          {/* Responsive System Row */}
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3 bg-black/20 border border-slate-800 rounded-lg mb-4">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${systemSettings.ai_enabled === 'true' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                      <Bot size={18} />
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-200">AI Ballistics Expert</p>
                                      <p className="text-[10px] text-slate-500">Enable the 'Ask AI' button in the navbar.</p>
                                  </div>
                              </div>
                              {systemSettings.hasAiKey ? (
                                  <button 
                                    onClick={() => toggleAi(systemSettings.ai_enabled === 'true' ? 'false' : 'true')}
                                    disabled={busy}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition self-end md:self-center ${systemSettings.ai_enabled === 'true' ? 'border-red-500/50 text-red-400 bg-red-900/20 hover:bg-red-900/30' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                                  >
                                    {systemSettings.ai_enabled === 'true' ? 'Enabled' : 'Disabled'}
                                  </button>
                              ) : (
                                  <span className="text-[10px] text-red-400 flex items-center gap-1 self-end md:self-center"><AlertTriangle size={10} /> Missing Key</span>
                              )}
                          </div>

                          {/* Model Configuration */}
                          <div className="space-y-2">
                              <label className={labelClass}>AI Model Name</label>
                              <div className="flex gap-2">
                                  <input 
                                    className={inputClass} 
                                    value={newModelName} 
                                    onChange={e => setNewModelName(e.target.value)}
                                    placeholder="e.g. gemini-2.0-flash"
                                  />
                                  <button 
                                    onClick={saveModelName}
                                    disabled={busy}
                                    className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                                  >
                                    Save
                                  </button>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Updates the model used by the backend.
                              </p>
                          </div>

                          {/* Instructions */}
                          <div className="mt-6 pt-6 border-t border-slate-800">
                              <div className="flex items-center gap-2 mb-2 text-slate-400">
                                  <Info size={14} />
                                  <span className="text-xs font-bold uppercase tracking-wider">Setup Instructions</span>
                              </div>
                              <div className="p-3 bg-black/40 rounded-lg text-[11px] text-slate-400 leading-relaxed space-y-2">
                                  <p>To enable the AI assistant, you must provide a Google Gemini API Key.</p>
                                  <ol className="list-decimal list-inside space-y-1 text-slate-500 ml-1">
                                      <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-red-400 hover:underline">Google AI Studio</a>.</li>
                                      <li>Create an API Key (Free tier available).</li>
                                      <li>In <strong>Netlify Dashboard</strong>, go to Site Settings &gt; Environment Variables.</li>
                                      <li>Add a variable named <code>GEMINI_API_KEY</code> with your key.</li>
                                      <li>Redeploy your site.</li>
                                      <li>Come back here and click <strong>Enable</strong>.</li>
                                  </ol>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
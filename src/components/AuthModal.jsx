//===============================================================
//Script Name: AuthModal.jsx
//Script Location: src/components/AuthModal.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.31.0
//About: Login/Admin Modal.
//       Updated: 'canClose' prop to lock modal for Gatekeeping.
//===============================================================

import { useEffect, useState } from 'react'
import { X, Shield, UserCircle2, Users, LogIn, Lock, Settings, Bot, AlertTriangle, ChevronDown, Eye, EyeOff, Ban, Trash2, Power, Save, Key } from 'lucide-react'
import {
  ROLE_ADMIN,
  ROLE_SHOOTER,
  listAdminUsers,
  registerUser,
  updateUser,
  loginUser,
  resetUserPassword,
  removeUser,
  permanentlyDeleteUser
} from '../lib/auth'
import { fetchSettings, saveSetting } from '../lib/settings'

// --- HELPER COMPONENTS ---
const PasswordInput = ({ value, onChange, show, onToggle, placeholder = "Password" }) => (
  <div className="relative">
      <input 
          type={show ? "text" : "password"} 
          className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-zinc-600 pr-10" 
          placeholder={placeholder} 
          value={value} 
          onChange={onChange}
          autoComplete="new-password" 
      />
      <button 
          type="button" 
          onClick={onToggle} 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition z-10"
      >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
  </div>
)

export default function AuthModal({
  open,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  canClose = true // Default to true (Standard behavior)
}) {
  // Login State
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [showLoginPass, setShowLoginPass] = useState(false)

  // Registration State
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER })
  const [showRegPass, setShowRegPass] = useState(false)
  
  // Reset Password State
  const [resetForm, setResetForm] = useState({ username: '', newPassword: '' })
  const [showResetPass, setShowResetPass] = useState(false)

  // User Management State
  const [editingUserId, setEditingUserId] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  
  // Delete/Deactivate Confirmation State
  const [verifyActionId, setVerifyActionId] = useState(null)
  const [verifyType, setVerifyType] = useState(null) // 'soft' or 'hard'
  
  // System Settings State
  const [systemSettings, setSystemSettings] = useState({ ai_enabled: 'false', ai_model: 'gemini-2.5-flash', hasAiKey: false })
  const [aiModel, setAiModel] = useState('gemini-2.5-flash')
  const [customModel, setCustomModel] = useState('') 
  const [apiKeyOverride, setApiKeyOverride] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  
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
    }
    clearMessages()
    handleCancelEdit()
    setVerifyActionId(null)
    setShowLoginPass(false)
    setShowRegPass(false)
    setShowResetPass(false)
    setShowApiKey(false)
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
      const presets = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
      if (data.ai_model && !presets.includes(data.ai_model)) {
          setAiModel('custom')
          setCustomModel(data.ai_model)
      } else {
          setAiModel(data.ai_model || 'gemini-2.5-flash')
          setCustomModel('')
      }
      
      if (data.ai_api_key) setApiKeyOverride(data.ai_api_key)
    } catch (err) { console.log(err) }
  }

  function clearMessages() { setStatusMessage(''); setErrorMessage(''); }

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
    setVerifyActionId(null)
    setActiveTab('manage')
  }

  function handleCancelEdit() {
    setEditingUserId(null)
    setNewUser({ firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER })
  }

  async function handleLoginSubmit(e) {
    e.preventDefault(); setBusy(true); clearMessages()
    try {
      const user = await loginUser({ username: loginForm.username, password: loginForm.password })
      setLoginForm({ username: '', password: '' }); if (onLogin) onLogin(user)
    } catch (err) { setErrorMessage(err?.message || 'Login failed.') } finally { setBusy(false) }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault(); setBusy(true); clearMessages()
    try {
      if (editingUserId) {
        const payload = { ...newUser }; if (!payload.password) delete payload.password
        await updateUser(editingUserId, payload); handleCancelEdit(); if (isAdmin) loadUsers(); setStatusMessage(`User updated.`)
      } else {
        await registerUser(newUser); handleCancelEdit(); if (isAdmin) loadUsers(); setStatusMessage(`User created.`)
      }
    } catch (err) { setErrorMessage(err?.message || 'Operation failed.') } finally { setBusy(false) }
  }

  async function handleResetSubmit(e) {
    e.preventDefault(); setBusy(true)
    try {
      await resetUserPassword({ username: resetForm.username, newPassword: resetForm.newPassword })
      setStatusMessage(`Password reset.`); setResetForm({ username: '', newPassword: '' })
    } catch (err) { setErrorMessage(err?.message || 'Failed.') } finally { setBusy(false) }
  }

  // --- DELETE HANDLING ---
  function initiateDelete(id, type) { setVerifyActionId(id); setVerifyType(type); }
  function cancelDelete() { setVerifyActionId(null); setVerifyType(null); }

  async function confirmAction(id) {
    setBusy(true); setVerifyActionId(null)
    try {
        if (verifyType === 'hard') { await permanentlyDeleteUser(id) } 
        else { await removeUser(id); if (currentUser && currentUser.id === id && onLogout) onLogout() }
        await loadUsers()
    } catch (err) { setErrorMessage('Action failed.') } finally { setBusy(false) }
  }

  // --- SYSTEM SETTINGS HANDLERS ---
  async function toggleAi(enabled) {
    setBusy(true)
    try {
        await saveSetting('ai_enabled', enabled)
        setSystemSettings(prev => ({ ...prev, ai_enabled: String(enabled) }))
    } catch (err) { setErrorMessage(err.message) } 
    finally { setBusy(false) }
  }

  async function saveAiConfig() {
      setBusy(true); clearMessages();
      try {
          const finalModel = aiModel === 'custom' ? customModel.trim() : aiModel
          if (!finalModel) throw new Error("Model name is required.")
          await saveSetting('ai_model', finalModel)
          if (apiKeyOverride) await saveSetting('ai_api_key', apiKeyOverride)
          setStatusMessage('AI Configuration Saved.')
          setTimeout(() => window.location.reload(), 1000)
      } catch (err) { setErrorMessage(err.message) }
      finally { setBusy(false) }
  }
  
  if (!open) return null

  const inputClass = "w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-semibold text-zinc-400 mb-1"
  const subLabelClass = "text-[10px] text-zinc-600 font-normal ml-2 italic tracking-normal"
  const tabClass = (active) => `flex-1 md:flex-none text-center px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border transition whitespace-nowrap ${active ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-black/40 border-zinc-800 text-zinc-500'}`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4 pt-[env(safe-area-inset-top)]">
      
      <div className={`bg-[#0f0f10] border-zinc-800 md:border rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex ${isAdmin ? "w-full max-w-4xl flex-col md:flex-row" : "w-full max-w-md flex-col"} h-full md:h-auto md:max-h-[90vh] relative`}>
        
        {/* CLOSE BUTTON (CONDITIONAL) */}
        {canClose && (
            <button onClick={onClose} className="absolute top-2 right-2 md:top-4 md:right-4 z-50 p-2 bg-[#1a1a1a] rounded-full text-zinc-400 hover:text-white hover:bg-red-900/50 border border-transparent md:border-zinc-800 transition shadow-lg">
                <X size={18} />
            </button>
        )}

        {/* LEFT PANEL */}
        <div className={`bg-black/40 p-6 flex flex-col relative border-b border-zinc-800 md:border-b-0 md:border-r ${isAdmin ? "w-full md:w-[35%] shrink-0" : "w-full flex-1"} ${isAdmin ? "min-h-[auto]" : ""}`}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1"><Shield className="text-red-500" size={20} /><h2 className="text-lg font-bold text-zinc-100">Access & Roles</h2></div>
            {!isAdmin && <p className="text-xs text-zinc-500">Authenticate to unlock editing capabilities.</p>}
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-3 md:p-4 border border-zinc-800 mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${currentUser?.role === ROLE_ADMIN ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}><UserCircle2 size={20} /></div>
              <div><p className="text-sm font-semibold text-zinc-200">{currentUser ? (currentUser.username || currentUser.email) : 'Guest User'}</p><p className="text-[10px] text-zinc-500 uppercase">{currentUser?.role === ROLE_ADMIN ? 'Reloader (Admin)' : 'Shooter (Read-only)'}</p></div>
            </div>
          </div>

          {!currentUser ? (
            <div className="flex-1 animation-fade-in">
                <p className={labelClass}>Sign In</p>
                <form onSubmit={handleLoginSubmit} className="space-y-3 mt-2">
                    <input className={inputClass} placeholder="Username or Email" value={loginForm.username} onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))} />
                    <PasswordInput value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} show={showLoginPass} onToggle={() => setShowLoginPass(!showLoginPass)} />
                    <div className="pt-2"><button type="submit" disabled={busy} className="w-full py-3 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white transition"><LogIn size={14} className="inline mr-2"/>{busy ? 'Verifying...' : 'Sign In'}</button></div>
                </form>
            </div>
          ) : (
             <div className="mt-auto"><button type="button" onClick={onLogout} className="w-full py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 transition">Sign Out</button></div>
          )}
          {(statusMessage || errorMessage) && (<div className="mt-4 p-3 rounded-lg bg-black/40 border border-zinc-800">{statusMessage && <p className="text-[10px] text-emerald-400">{statusMessage}</p>}{errorMessage && <p className="text-[10px] text-red-400">{errorMessage}</p>}</div>)}
        </div>

        {/* RIGHT PANEL: ADMIN TOOLS */}
        {isAdmin && (
          <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-[#121214] to-[#0a0a0a]">
            <div className="flex-shrink-0 border-b border-zinc-800 p-2 bg-[#0f0f10]/95 backdrop-blur z-10">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('manage')} className={tabClass(activeTab === 'manage')}>Users</button>
                    <button onClick={() => setActiveTab('reset')} className={tabClass(activeTab === 'reset')}>Passwords</button>
                    <button onClick={() => setActiveTab('system')} className={tabClass(activeTab === 'system')}>Systems</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'manage' && (
                <div className="space-y-6 pb-20 md:pb-0">
                  <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/60">
                    <h3 className="text-xs md:text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><Users size={16} className="text-red-500" />{editingUserId ? 'Edit User' : 'Create New User'}</h3>
                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className={labelClass}>First Name</label><input className={inputClass} value={newUser.firstName} onChange={e => setNewUser(p => ({ ...p, firstName: e.target.value }))} /></div>
                        <div><label className={labelClass}>Last Name</label><input className={inputClass} value={newUser.lastName} onChange={e => setNewUser(p => ({ ...p, lastName: e.target.value }))} /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className={labelClass}>Username</label><input className={inputClass} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} /></div>
                        <div><label className={labelClass}>Phone</label><input className={inputClass} value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} /></div>
                      </div>
                      <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className={labelClass}>{editingUserId ? 'New Password' : 'Password'}</label><PasswordInput value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} show={showRegPass} onToggle={() => setShowRegPass(!showRegPass)} /></div>
                        <div><label className={labelClass}>Role</label><div className="relative"><select className={`${inputClass} appearance-none`} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}><option value={ROLE_SHOOTER}>Shooter</option><option value={ROLE_ADMIN}>Reloader (Admin)</option></select><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><ChevronDown size={14} /></div></div></div>
                      </div>
                      <div className="pt-2 flex justify-end gap-2">
                        {editingUserId && <button type="button" onClick={handleCancelEdit} className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs font-bold transition">Cancel</button>}
                        <button type="submit" disabled={busy} className="px-5 py-2 rounded-full bg-red-900/40 text-red-200 border border-red-500/30 hover:bg-red-900/60 text-xs font-bold transition">{busy ? 'Saving...' : editingUserId ? 'Save Changes' : 'Create User'}</button>
                      </div>
                    </form>
                  </div>
                  <div><p className={labelClass + " mb-2"}>User Directory</p>
                    <div className="grid gap-2">
                        {adminUsers.map(u => (
                            <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${u.isActive ? 'bg-black/20 border-zinc-800/50' : 'bg-red-900/10 border-red-900/30 opacity-70 grayscale-[0.5]'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.role === ROLE_ADMIN ? 'bg-red-500' : 'bg-zinc-600'}`} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-bold truncate ${u.isActive ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>{u.username}</p>
                                            {!u.isActive && (<span className="flex items-center gap-1 text-[9px] bg-red-900/60 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"><Ban size={8} /> Deactivated</span>)}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {verifyActionId === u.id ? (
                                        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                            <span className="text-[10px] text-zinc-400 font-bold hidden sm:inline">Sure?</span>
                                            <button onClick={() => confirmAction(u.id)} className="px-3 py-1.5 rounded bg-red-600 text-[10px] text-white font-bold shadow-lg hover:bg-red-500 transition">Yes</button>
                                            <button onClick={cancelDelete} className="px-3 py-1.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-medium hover:bg-zinc-700 transition">No</button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEditUser(u)} className="px-3 py-1.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-medium border border-zinc-700/50 hover:border-zinc-600 transition">Edit</button>
                                            {u.isActive ? (
                                                <button onClick={() => initiateDelete(u.id, 'soft')} className="px-3 py-1.5 rounded bg-amber-900/20 text-[10px] text-amber-500 font-medium border border-amber-900/30 hover:bg-amber-900/30 transition flex items-center gap-1"><Power size={10} /> Disable</button>
                                            ) : (
                                                <button onClick={() => initiateDelete(u.id, 'hard')} className="px-3 py-1.5 rounded bg-red-900/20 text-[10px] text-red-400 font-medium border border-red-900/30 hover:bg-red-900/30 transition flex items-center gap-1"><Trash2 size={10} /> Delete</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'reset' && (
                  <div className="space-y-6">
                     <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/60">
                        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><Lock size={16} className="text-red-500" />Admin Password Reset</h3>
                        <form onSubmit={handleResetSubmit} className="space-y-3">
                           <div><label className={labelClass}>Target Username</label><input className={inputClass} value={resetForm.username} onChange={e => setResetForm(p => ({ ...p, username: e.target.value }))} /></div>
                           <div><label className={labelClass}>New Password</label><PasswordInput value={resetForm.newPassword} onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} show={showResetPass} onToggle={() => setShowResetPass(!showResetPass)} /></div>
                           <div className="pt-2 flex justify-end"><button type="submit" disabled={busy} className="px-5 py-2 rounded-full bg-red-900/40 text-red-200 border border-red-500/30 hover:bg-red-900/60 text-xs font-bold transition">Reset Password</button></div>
                        </form>
                     </div>
                  </div>
              )}
              
              {/* SYSTEM TAB - UPDATED WITH MODEL SELECTOR */}
              {activeTab === 'system' && (
                  <div className="space-y-6">
                     <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/60">
                        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><Settings size={16} className="text-red-500" />System Configuration</h3>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-black/20 border border-zinc-800 rounded-lg mb-4">
                            <div className="flex items-start gap-3"><div className="p-2 rounded-lg bg-zinc-800 text-zinc-500 mt-1"><Bot size={18} /></div><div><p className="text-xs font-bold text-zinc-200">AI Ballistics Expert</p><p className="text-[10px] text-zinc-500 leading-relaxed mt-1">Enable the generative AI chat assistant.</p></div></div>
                            <div className="flex items-center justify-end">{systemSettings.hasAiKey || systemSettings.ai_api_key ? (<button onClick={() => toggleAi(systemSettings.ai_enabled === 'true' ? 'false' : 'true')} className={`px-4 py-2 rounded-full text-[10px] font-bold border transition w-full sm:w-auto ${systemSettings.ai_enabled === 'true' ? 'border-red-500/50 text-red-400 bg-red-900/20' : 'border-zinc-600 text-zinc-400 bg-black/40'}`}>{systemSettings.ai_enabled === 'true' ? 'Enabled' : 'Disabled'}</button>) : (<span className="px-3 py-1 rounded bg-amber-900/20 text-amber-500 text-[10px] border border-amber-900/50 flex items-center gap-1"><AlertTriangle size={10} /> Missing API Key</span>)}</div>
                        </div>

                        <div className="p-4 bg-black/20 border border-zinc-800 rounded-lg space-y-4">
                            <div>
                                <label className={labelClass}>
                                    AI Model 
                                    <span className={subLabelClass}>(Choose '001' versions for stability)</span>
                                </label>
                                <div className="relative">
                                    <select className={`${inputClass} appearance-none`} value={aiModel === 'custom' ? 'custom' : aiModel} onChange={e => setAiModel(e.target.value)}>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (New Standard)</option>
                                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Fastest)</option>
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Most Intelligent)</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Legacy)</option>
                                        <option value="custom">Custom Model ID...</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><ChevronDown size={14} /></div>
                                </div>
                                {aiModel === 'custom' && (
                                    <input 
                                        className={`${inputClass} mt-2`} 
                                        placeholder="e.g. gemini-3.0-future" 
                                        value={customModel} 
                                        onChange={e => setCustomModel(e.target.value)} 
                                    />
                                )}
                            </div>
                            
                            <div>
                                <label className={labelClass}>
                                    API Key Override
                                    <span className={subLabelClass}>(Optional)</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showApiKey ? "text" : "password"} 
                                        className={`${inputClass} pr-10`} 
                                        placeholder="Use System Env Var" 
                                        value={apiKeyOverride} 
                                        onChange={e => setApiKeyOverride(e.target.value)} 
                                    />
                                     <button 
                                        type="button" 
                                        onClick={() => setShowApiKey(!showApiKey)} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition z-10"
                                    >
                                        {showApiKey ? <EyeOff size={14} /> : <Key size={14} />}
                                    </button>
                                </div>
                                <p className="text-[9px] text-zinc-600 mt-1 italic">Leave blank to use the server's environment variable.</p>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button onClick={saveAiConfig} disabled={busy} className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-[10px] font-bold border border-zinc-700 transition flex items-center gap-2"><Save size={12}/> Save Config</button>
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
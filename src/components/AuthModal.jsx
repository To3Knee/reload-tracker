//===============================================================
//Script Name: AuthModal.jsx
//Script Location: src/components/AuthModal.jsx
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.23.0
//About: Login/Admin Modal. Updated with iOS Safe Area support.
//===============================================================

import { useEffect, useState } from 'react'
import { X, Shield, UserCircle2, Users, LogIn, Lock, Settings, Bot, AlertTriangle, ChevronDown, Eye, EyeOff } from 'lucide-react'
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

const PasswordInput = ({ value, onChange, show, onToggle, placeholder = "Password" }) => (
  <div className="relative">
      <input type={show ? "text" : "password"} className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-zinc-600 pr-10" placeholder={placeholder} value={value} onChange={onChange} autoComplete="new-password" />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition z-10">{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
  </div>
)

export default function AuthModal({ open, onClose, currentUser, onLogin, onLogout }) {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER })
  const [showRegPass, setShowRegPass] = useState(false)
  const [resetForm, setResetForm] = useState({ username: '', newPassword: '' })
  const [showResetPass, setShowResetPass] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [systemSettings, setSystemSettings] = useState({ ai_enabled: 'false', ai_model: 'gemini-2.0-flash', hasAiKey: false })
  const [newModelName, setNewModelName] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState('manage') 
  const isAdmin = currentUser?.role === ROLE_ADMIN

  useEffect(() => { if (!open) return; if (isAdmin) { loadUsers(); loadSettings(); } clearMessages(); handleCancelEdit(); setShowLoginPass(false); setShowRegPass(false); setShowResetPass(false); }, [open, currentUser, isAdmin])

  async function loadUsers() { try { const users = await listAdminUsers(); setAdminUsers(users); } catch (err) { console.log(err); } }
  async function loadSettings() { try { const data = await fetchSettings(); setSystemSettings(data); setNewModelName(data.ai_model || 'gemini-2.0-flash'); } catch (err) { console.log(err); } }
  function clearMessages() { setStatusMessage(''); setErrorMessage(''); }
  function handleEditUser(user) { setEditingUserId(user.id); setNewUser({ firstName: user.firstName || '', lastName: user.lastName || '', username: user.username || '', phone: user.phone || '', email: user.email || '', password: '', role: user.role || ROLE_SHOOTER }); setActiveTab('manage'); }
  function handleCancelEdit() { setEditingUserId(null); setNewUser({ firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER }); }

  async function handleLoginSubmit(e) { e.preventDefault(); setBusy(true); clearMessages(); try { const user = await loginUser({ username: loginForm.username, password: loginForm.password }); setLoginForm({ username: '', password: '' }); if (onLogin) onLogin(user); } catch (err) { setErrorMessage(err?.message || 'Login failed.'); } finally { setBusy(false); } }
  async function handleRegisterSubmit(e) { e.preventDefault(); setBusy(true); clearMessages(); try { if (editingUserId) { const payload = { ...newUser }; if (!payload.password) delete payload.password; await updateUser(editingUserId, payload); handleCancelEdit(); if (isAdmin) loadUsers(); setStatusMessage(`User updated.`); } else { await registerUser(newUser); handleCancelEdit(); if (isAdmin) loadUsers(); setStatusMessage(`User created.`); } } catch (err) { setErrorMessage(err?.message || 'Operation failed.'); } finally { setBusy(false); } }
  async function handleResetSubmit(e) { e.preventDefault(); setBusy(true); try { await resetUserPassword({ username: resetForm.username, newPassword: resetForm.newPassword }); setStatusMessage(`Password reset.`); setResetForm({ username: '', newPassword: '' }); } catch (err) { setErrorMessage(err?.message || 'Failed.'); } finally { setBusy(false); } }
  async function handleRemoveUser(id) { if (!window.confirm('Remove user?')) return; setBusy(true); try { await removeUser(id); await loadUsers(); if (currentUser && currentUser.id === id && onLogout) onLogout(); } catch (err) { setErrorMessage('Failed.'); } finally { setBusy(false); } }
  async function toggleAi(enabled) { setBusy(true); try { await saveSetting('ai_enabled', enabled); setSystemSettings(prev => ({ ...prev, ai_enabled: String(enabled) })); setTimeout(() => window.location.reload(), 500); } catch (err) { setErrorMessage(err.message); } finally { setBusy(false); } }
  
  if (!open) return null
  const inputClass = "w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-semibold text-zinc-400 mb-1"
  const tabClass = (active) => `flex-1 md:flex-none text-center px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border transition whitespace-nowrap ${active ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-black/40 border-zinc-800 text-zinc-500'}`

  return (
    // MOBILE FIX: Added padding-top for Safe Area
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4 pt-[env(safe-area-inset-top)]">
      
      <div className={`bg-[#0f0f10] border-zinc-800 md:border rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex ${isAdmin ? "w-full max-w-4xl flex-col md:flex-row" : "w-full max-w-md flex-col"} h-full md:h-auto md:max-h-[90vh] relative`}>
        
        <button onClick={onClose} className="absolute top-2 right-2 md:top-4 md:right-4 z-50 p-2 bg-[#1a1a1a] rounded-full text-zinc-400 hover:text-white hover:bg-red-900/50 border border-transparent md:border-zinc-800 transition shadow-lg">
            <X size={18} />
        </button>

        {/* LEFT PANEL */}
        <div className={`bg-black/40 p-6 flex flex-col relative border-b border-zinc-800 md:border-b-0 md:border-r ${isAdmin ? "w-full md:w-[35%] shrink-0" : "w-full flex-1"} ${isAdmin ? "min-h-[auto]" : ""}`}>
          <div className="mb-4"><div className="flex items-center gap-2 mb-1"><Shield className="text-red-500" size={20} /><h2 className="text-lg font-bold text-zinc-100">Access & Roles</h2></div>{!isAdmin && <p className="text-xs text-zinc-500">Authenticate to unlock editing capabilities.</p>}</div>
          <div className="bg-zinc-900/50 rounded-xl p-3 md:p-4 border border-zinc-800 mb-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${currentUser?.role === ROLE_ADMIN ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}><UserCircle2 size={20} /></div><div><p className="text-sm font-semibold text-zinc-200">{currentUser ? (currentUser.username || currentUser.email) : 'Guest User'}</p><p className="text-[10px] text-zinc-500 uppercase">{currentUser?.role === ROLE_ADMIN ? 'Reloader (Admin)' : 'Shooter (Read-only)'}</p></div></div></div>
          {!currentUser ? (<div className="flex-1 animation-fade-in"><p className={labelClass}>Sign In</p><form onSubmit={handleLoginSubmit} className="space-y-3 mt-2"><input className={inputClass} placeholder="Username or Email" value={loginForm.username} onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))} /><PasswordInput value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} show={showLoginPass} onToggle={() => setShowLoginPass(!showLoginPass)} /><div className="pt-2"><button type="submit" disabled={busy} className="w-full py-3 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white transition"><LogIn size={14} className="inline mr-2"/>{busy ? 'Verifying...' : 'Sign In'}</button></div></form></div>) : (<div className="mt-auto"><button type="button" onClick={onLogout} className="w-full py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 transition">Sign Out</button></div>)}
          {(statusMessage || errorMessage) && (<div className="mt-4 p-3 rounded-lg bg-black/40 border border-zinc-800">{statusMessage && <p className="text-[10px] text-emerald-400">{statusMessage}</p>}{errorMessage && <p className="text-[10px] text-red-400">{errorMessage}</p>}</div>)}
        </div>

        {/* RIGHT PANEL: ADMIN TOOLS */}
        {isAdmin && (
          <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-[#121214] to-[#0a0a0a]">
            <div className="flex-shrink-0 border-b border-zinc-800 p-2 bg-[#0f0f10]/95 backdrop-blur z-10"><div className="flex gap-2 overflow-x-auto no-scrollbar"><button onClick={() => setActiveTab('manage')} className={tabClass(activeTab === 'manage')}>Users</button><button onClick={() => setActiveTab('reset')} className={tabClass(activeTab === 'reset')}>Passwords</button><button onClick={() => setActiveTab('system')} className={tabClass(activeTab === 'system')}>Systems</button></div></div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'manage' && (
                <div className="space-y-6 pb-20 md:pb-0">
                  <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/60">
                    <h3 className="text-xs md:text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><Users size={16} className="text-red-500" />{editingUserId ? 'Edit User' : 'Create New User'}</h3>
                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className={labelClass}>First Name</label><input className={inputClass} value={newUser.firstName} onChange={e => setNewUser(p => ({ ...p, firstName: e.target.value }))} /></div><div><label className={labelClass}>Last Name</label><input className={inputClass} value={newUser.lastName} onChange={e => setNewUser(p => ({ ...p, lastName: e.target.value }))} /></div></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className={labelClass}>Username</label><input className={inputClass} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} /></div><div><label className={labelClass}>Phone</label><input className={inputClass} value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} /></div></div>
                      <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className={labelClass}>{editingUserId ? 'New Password' : 'Password'}</label><PasswordInput value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} show={showRegPass} onToggle={() => setShowRegPass(!showRegPass)} /></div><div><label className={labelClass}>Role</label><div className="relative"><select className={`${inputClass} appearance-none`} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}><option value={ROLE_SHOOTER}>Shooter</option><option value={ROLE_ADMIN}>Reloader (Admin)</option></select><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><ChevronDown size={14} /></div></div></div></div>
                      <div className="pt-2 flex justify-end gap-2">{editingUserId && <button type="button" onClick={handleCancelEdit} className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs font-bold transition">Cancel</button>}<button type="submit" disabled={busy} className="px-5 py-2 rounded-full bg-red-900/40 text-red-200 border border-red-500/30 hover:bg-red-900/60 text-xs font-bold transition">{busy ? 'Saving...' : editingUserId ? 'Save Changes' : 'Create User'}</button></div>
                    </form>
                  </div>
                  <div><p className={labelClass + " mb-2"}>User Directory</p><div className="grid gap-2">{adminUsers.map(u => (<div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-zinc-800/50"><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.role === ROLE_ADMIN ? 'bg-red-500' : 'bg-zinc-600'}`} /><div className="min-w-0"><p className="text-xs font-bold text-zinc-200 truncate">{u.username}</p><p className="text-[10px] text-zinc-500 truncate">{u.email}</p></div></div><div className="flex gap-2"><button onClick={() => handleEditUser(u)} className="px-3 py-1.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-medium border border-zinc-700/50 hover:border-zinc-600 transition">Edit</button><button onClick={() => handleRemoveUser(u.id)} className="px-3 py-1.5 rounded bg-red-900/20 text-[10px] text-red-400 font-medium border border-red-900/30 hover:bg-red-900/30 transition">Delete</button></div></div>))}</div></div>
                </div>
              )}
              {activeTab === 'reset' && (<div className="space-y-6"><div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/60"><h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><Lock size={16} className="text-red-500" />Admin Password Reset</h3><form onSubmit={handleResetSubmit} className="space-y-3"><div><label className={labelClass}>Target Username</label><input className={inputClass} value={resetForm.username} onChange={e => setResetForm(p => ({ ...p, username: e.target.value }))} /></div><div><label className={labelClass}>New Password</label><PasswordInput value={resetForm.newPassword} onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} show={showResetPass} onToggle={() => setShowResetPass(!showResetPass)} /></div><div className="pt-2 flex justify-end"><button type="submit" disabled={busy} className="px-5 py-2 rounded-full bg-red-900/40 text-red-200 border border-red-500/30 hover:bg-red-900/60 text-xs font-bold transition">Reset Password</button></div></form></div></div>)}
              {activeTab === 'system' && (<div className="space-y-6"><div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/60"><h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4"><Settings size={16} className="text-red-500" />System Configuration</h3><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-black/20 border border-zinc-800 rounded-lg"><div className="flex items-start gap-3"><div className="p-2 rounded-lg bg-zinc-800 text-zinc-500 mt-1"><Bot size={18} /></div><div><p className="text-xs font-bold text-zinc-200">AI Ballistics Expert</p><p className="text-[10px] text-zinc-500 leading-relaxed mt-1">Enable the generative AI chat assistant.</p></div></div><div className="flex items-center justify-end">{systemSettings.hasAiKey ? (<button onClick={() => toggleAi(systemSettings.ai_enabled === 'true' ? 'false' : 'true')} className={`px-4 py-2 rounded-full text-[10px] font-bold border transition w-full sm:w-auto ${systemSettings.ai_enabled === 'true' ? 'border-red-500/50 text-red-400 bg-red-900/20' : 'border-zinc-600 text-zinc-400 bg-black/40'}`}>{systemSettings.ai_enabled === 'true' ? 'Enabled' : 'Disabled'}</button>) : (<span className="px-3 py-1 rounded bg-amber-900/20 text-amber-500 text-[10px] border border-amber-900/50 flex items-center gap-1"><AlertTriangle size={10} /> Missing API Key</span>)}</div></div></div></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
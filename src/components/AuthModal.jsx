//===============================================================
//Script Name: AuthModal.jsx
//Script Location: src/components/AuthModal.jsx
//Date: 12/13/2025
//Created By: T03KNEE
//Version: 6.1.0 (Scanner Tab Added)
//About: Login/Admin Modal.
//       - FEATURE: Added 'Scanner' tab to integrate BarcodeSettings.
//===============================================================

import { useEffect, useState } from 'react'
import { X, Shield, UserCircle2, Users, LogIn, Lock, Settings, Bot, AlertTriangle, ChevronDown, Eye, EyeOff, Ban, Trash2, Power, Save, Key, Terminal, Play, CheckCircle, Database, Zap, ScanBarcode } from 'lucide-react'
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
import logo from '../assets/logo.png' 
// NEW IMPORT
import { BarcodeSettings } from './BarcodeSettings'

const PasswordInput = ({ value, onChange, show, onToggle, placeholder = "Password" }) => (
  <div className="relative">
      <input 
          type={show ? "text" : "password"} 
          className="w-full bg-[#1a1a1a] border border-steel-700 rounded-lg px-3 py-2 text-[11px] text-steel-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-steel-500 pr-10" 
          placeholder={placeholder} 
          value={value} 
          onChange={onChange}
          autoComplete="new-password" 
      />
      <button 
          type="button" 
          onClick={onToggle} 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 transition z-10"
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
  canClose = true
}) {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [showLoginPass, setShowLoginPass] = useState(false)
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER })
  const [showRegPass, setShowRegPass] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [verifyActionId, setVerifyActionId] = useState(null)
  const [verifyType, setVerifyType] = useState(null) 
  const [resetForm, setResetForm] = useState({ username: '', newPassword: '' })
  const [showResetPass, setShowResetPass] = useState(false)
  
  // CONFIG STATE
  const [systemSettings, setSystemSettings] = useState({ 
      ai_enabled: 'false', 
      ai_model: 'google/gemini-2.0-flash-exp:free', 
      hasAiKey: false,
      // Barcode defaults
      barcode_enabled: 'false',
      barcode_provider: 'go-upc',
      barcode_api_key: '',
      barcode_custom_url: ''
  })
  const [aiModel, setAiModel] = useState('google/gemini-2.0-flash-exp:free')
  const [customModel, setCustomModel] = useState('') 
  const [apiKeyOverride, setApiKeyOverride] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  
  const [sqlQuery, setSqlQuery] = useState('')
  const [sqlResult, setSqlResult] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)
  
  // TAB STATE
  const [activeTab, setActiveTab] = useState('manage') 
  const isAdmin = currentUser?.role === ROLE_ADMIN

  useEffect(() => { 
      if (!open) return; 
      if (isAdmin) { loadUsers(); loadSettings(); } 
      clearMessages(); 
      handleCancelEdit(); 
      setVerifyActionId(null); 
      setSqlResult(null);
  }, [open, currentUser, isAdmin])

  async function loadUsers() { try { const users = await listAdminUsers(); setAdminUsers(users); } catch (err) { console.error(err) } }
  
  async function loadSettings() { 
      try { 
          const data = await fetchSettings(); 
          setSystemSettings(prev => ({ ...prev, ...data })); // Merge new data
          
          // AI Setup
          const presets = [
              'google/gemini-2.0-flash-exp:free', 
              'meta-llama/llama-3.3-70b-instruct:free',
              'meta-llama/llama-3.2-3b-instruct:free',
              'mistralai/mistral-7b-instruct:free',
              'microsoft/phi-3-medium-128k-instruct:free'
          ]; 
          if (data.ai_model && !presets.includes(data.ai_model)) { 
              setAiModel('custom'); 
              setCustomModel(data.ai_model); 
          } else { 
              setAiModel(data.ai_model || 'google/gemini-2.0-flash-exp:free'); 
              setCustomModel(''); 
          } 
          if (data.ai_api_key) setApiKeyOverride(data.ai_api_key);
      } catch (err) { console.error(err) }
  }

  function clearMessages() { setStatusMessage(''); setErrorMessage(''); }
  function handleEditUser(user) { setEditingUserId(user.id); setNewUser({ firstName: user.firstName||'', lastName: user.lastName||'', username: user.username||'', phone: user.phone||'', email: user.email||'', password: '', role: user.role||ROLE_SHOOTER }); setVerifyActionId(null); setActiveTab('manage'); }
  function handleCancelEdit() { setEditingUserId(null); setNewUser({ firstName: '', lastName: '', username: '', phone: '', email: '', password: '', role: ROLE_SHOOTER }); }
  
  async function handleLoginSubmit(e) { e.preventDefault(); setBusy(true); clearMessages(); try { const user = await loginUser({ username: loginForm.username, password: loginForm.password }); setLoginForm({ username: '', password: '' }); if (onLogin) onLogin(user); } catch (err) { setErrorMessage(err?.message || 'Login failed.'); } finally { setBusy(false); } }
  async function handleRegisterSubmit(e) { e.preventDefault(); setBusy(true); clearMessages(); try { if (editingUserId) { const payload = { ...newUser }; if (!payload.password) delete payload.password; await updateUser(editingUserId, payload); handleCancelEdit(); if (isAdmin) loadUsers(); setStatusMessage(`User updated.`); } else { await registerUser(newUser); handleCancelEdit(); if (isAdmin) loadUsers(); setStatusMessage(`User created.`); } } catch (err) { setErrorMessage(err?.message || 'Operation failed.'); } finally { setBusy(false); } }
  async function handleResetSubmit(e) { e.preventDefault(); setBusy(true); try { await resetUserPassword({ username: resetForm.username, newPassword: resetForm.newPassword }); setStatusMessage(`Password reset.`); setResetForm({ username: '', newPassword: '' }); } catch (err) { setErrorMessage(err?.message || 'Failed.'); } finally { setBusy(false); } }
  
  function initiateDelete(id, type) { setVerifyActionId(id); setVerifyType(type); }
  function cancelDelete() { setVerifyActionId(null); setVerifyType(null); }
  async function confirmAction(id) { setBusy(true); setVerifyActionId(null); try { if (verifyType === 'hard') { await permanentlyDeleteUser(id) } else { await removeUser(id); if (currentUser && currentUser.id === id && onLogout) onLogout() } await loadUsers() } catch (err) { setErrorMessage('Action failed.') } finally { setBusy(false) } }
  
  async function toggleAi(enabled) { setBusy(true); try { await saveSetting('ai_enabled', enabled); setSystemSettings(prev => ({ ...prev, ai_enabled: String(enabled) })) } catch (err) { setErrorMessage(err.message) } finally { setBusy(false) } }
  
  async function saveAiConfig() { 
      setBusy(true); 
      clearMessages(); 
      try { 
          const finalModel = aiModel === 'custom' ? customModel.trim() : aiModel; 
          if (!finalModel) throw new Error("Model name is required."); 
          await saveSetting('ai_model', finalModel); 
          if (apiKeyOverride) await saveSetting('ai_api_key', apiKeyOverride); 
          setStatusMessage('AI Configuration Saved.'); 
          setTimeout(() => window.location.reload(), 1000); 
      } catch (err) { setErrorMessage(err.message) } 
      finally { setBusy(false) } 
  }

  // Generic Save Handler for Child Components (BarcodeSettings)
  async function handleGenericSave(updates) {
      setBusy(true);
      try {
          // Iterate and save each setting
          for (const [key, value] of Object.entries(updates)) {
              await saveSetting(key, value);
          }
          // Update local state to reflect changes immediately
          setSystemSettings(prev => ({ ...prev, ...updates }));
          setStatusMessage("Settings saved successfully.");
      } catch (err) {
          console.error(err);
          setErrorMessage("Failed to save settings.");
          throw err;
      } finally {
          setBusy(false);
      }
  }

  async function testAiConnection() {
      setBusy(true);
      clearMessages();
      try {
          const finalModel = aiModel === 'custom' ? customModel.trim() : aiModel;
          const res = await fetch('/api/ai', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ prompt: "Hello", history: [] })
          });
          
          if(!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || "Connection Failed");
          }
          setStatusMessage(`Success! Connected to ${finalModel}`);
      } catch(err) {
          setErrorMessage(`${err.message}`);
      } finally { setBusy(false); }
  }

  async function runQuery() {
      if(!sqlQuery) return
      setBusy(true)
      setSqlResult(null)
      try {
          const res = await fetch('/api/system', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ action: 'sql', query: sqlQuery })
          })
          const data = await res.json()
          setSqlResult(data)
      } catch(e) {
          setSqlResult({ success: false, error: e.message })
      } finally { setBusy(false) }
  }
  
  if (!open) return null

  const inputClass = "w-full bg-[#1a1a1a] border border-steel-700 rounded-lg px-3 py-2 text-[11px] text-steel-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition placeholder:text-steel-500"
  const labelClass = "block text-xs font-semibold text-steel-300 mb-1"
  const subLabelClass = "text-[10px] text-steel-500 font-normal ml-2 italic tracking-normal"
  const tabBtnClass = (active) => `px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition whitespace-nowrap flex-shrink-0 ${active ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-black/40 border-steel-700 text-steel-400 hover:text-steel-200'}`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4 pt-[env(safe-area-inset-top)]">
      <div className={`bg-[#0f0f10] border-steel-700 md:border shadow-2xl overflow-hidden flex flex-col md:flex-row 
          w-full h-full md:w-full md:max-w-5xl md:h-auto md:max-h-[90vh] 
          rounded-none md:rounded-2xl relative`}>
        
        {/* LEFT PANEL */}
        <div className={`bg-black/40 p-6 flex flex-col relative border-b border-steel-700 md:border-b-0 md:border-r ${isAdmin ? "w-full md:w-[30%] shrink-0" : "w-full flex-1"}`}>
          {canClose && !isAdmin && (<button onClick={onClose} className="absolute top-4 right-4 rt-btn rt-btn-icon"><X size={16} /></button>)}
          <div className="mb-6 flex flex-col items-center md:items-start text-center md:text-left border-b border-steel-700/50 pb-6">
            <img src={logo} alt="Reload Tracker" className="h-16 w-auto mb-4 object-contain opacity-90" />
            <div>
                <h2 className="text-xl font-black text-white tracking-wide">RELOAD <span className="text-steel-500">TRACKER</span></h2>
                <p className="text-[10px] text-steel-400 font-medium uppercase tracking-[0.2em] mt-1">System Access Control</p>
            </div>
          </div>
          {currentUser && (
              <div className="bg-steel-800/50 rounded-xl p-3 md:p-4 border border-steel-700 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${currentUser?.role === ROLE_ADMIN ? 'bg-red-500/10 text-red-400' : 'bg-steel-700 text-steel-300'}`}><UserCircle2 size={20} /></div>
                  <div><p className="text-sm font-semibold text-steel-100">{currentUser.username}</p><p className="text-[10px] text-steel-400 uppercase">{currentUser?.role === ROLE_ADMIN ? 'Reloader (Admin)' : 'Shooter (Read-only)'}</p></div>
                </div>
              </div>
          )}
          {!currentUser ? (
            <div className="flex-1 animation-fade-in">
                <div className="bg-red-900/10 border border-red-900/30 p-3 rounded-lg mb-4"><p className="text-[10px] text-red-400 font-bold flex items-center gap-2"><Shield size={12} /> AUTHORIZED PERSONNEL ONLY</p></div>
                <form onSubmit={handleLoginSubmit} className="space-y-3 mt-2">
                    <div><label className={labelClass}>Username</label><input className={inputClass} value={loginForm.username} onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))} /></div>
                    <div><label className={labelClass}>Password</label><PasswordInput value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} show={showLoginPass} onToggle={() => setShowLoginPass(!showLoginPass)} /></div>
                    <div className="pt-2"><button type="submit" disabled={busy} className="w-full py-3 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-bold text-white transition shadow-lg shadow-red-900/20"><LogIn size={14} className="inline mr-2"/>{busy ? 'Verifying...' : 'Authenticate'}</button></div>
                </form>
            </div>
          ) : (
             <div className="mt-auto"><button type="button" onClick={onLogout} className="w-full py-2 rounded-lg border border-steel-600 hover:bg-steel-700 text-xs font-semibold text-steel-300 transition">Sign Out</button></div>
          )}
          {(statusMessage || errorMessage) && (<div className="mt-4 p-3 rounded-lg bg-black/40 border border-steel-700">{statusMessage && <p className="text-[10px] text-emerald-400">{statusMessage}</p>}{errorMessage && <p className="text-[10px] text-red-400">{errorMessage}</p>}</div>)}
        </div>

        {/* RIGHT PANEL: ADMIN FEATURES */}
        {isAdmin && (
          <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-[#121214] to-[#0a0a0a]">
            
            {/* ADMIN HEADER */}
            <div className="flex-shrink-0 border-b border-steel-700 p-4 bg-[#0f0f10]/95 backdrop-blur z-10 flex items-center justify-between">
                <div className="flex gap-2 overflow-x-auto min-w-0 pr-2 custom-scrollbar">
                    <button onClick={() => setActiveTab('manage')} className={tabBtnClass(activeTab === 'manage')}><Users size={12} className="inline mr-1"/> Users</button>
                    <button onClick={() => setActiveTab('reset')} className={tabBtnClass(activeTab === 'reset')}><Lock size={12} className="inline mr-1"/> Security</button>
                    <button onClick={() => setActiveTab('config')} className={tabBtnClass(activeTab === 'config')}><Bot size={12} className="inline mr-1"/> AI Config</button>
                    {/* NEW SCANNER TAB */}
                    <button onClick={() => setActiveTab('scanner')} className={tabBtnClass(activeTab === 'scanner')}><ScanBarcode size={12} className="inline mr-1"/> Scanner</button>
                    <button onClick={() => setActiveTab('console')} className={tabBtnClass(activeTab === 'console')}><Terminal size={12} className="inline mr-1"/> Console</button>
                </div>
                {canClose && (<button onClick={onClose} className="p-2 bg-steel-800 rounded-lg text-steel-300 hover:text-white hover:bg-steel-700 border border-steel-600 transition flex-shrink-0 ml-2" title="Close Panel"><X size={16} /></button>)}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-20 md:pb-4">
              
              {/* 1. MANAGE USERS */}
              {activeTab === 'manage' && (
                <div className="space-y-6">
                  <div className="bg-steel-800/30 rounded-xl p-4 border border-steel-700/60">
                    <h3 className="text-xs md:text-sm font-bold text-steel-200 flex items-center gap-2 mb-4"><Users size={16} className="text-red-500" />{editingUserId ? 'Edit User' : 'Create New User'}</h3>
                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className={labelClass}>First Name</label><input className={inputClass} value={newUser.firstName} onChange={e => setNewUser(p => ({ ...p, firstName: e.target.value }))} /></div><div><label className={labelClass}>Last Name</label><input className={inputClass} value={newUser.lastName} onChange={e => setNewUser(p => ({ ...p, lastName: e.target.value }))} /></div></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className={labelClass}>Username</label><input className={inputClass} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} /></div><div><label className={labelClass}>Phone</label><input className={inputClass} value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} /></div></div>
                      <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className={labelClass}>{editingUserId ? 'New Password' : 'Password'}</label><PasswordInput value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} show={showRegPass} onToggle={() => setShowRegPass(!showRegPass)} /></div><div><label className={labelClass}>Role</label><div className="relative"><select className={`${inputClass} appearance-none`} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}><option value={ROLE_SHOOTER}>Shooter</option><option value={ROLE_ADMIN}>Reloader (Admin)</option></select><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-steel-300"><ChevronDown size={14} /></div></div></div></div>
                      <div className="pt-2 flex justify-end gap-2">{editingUserId && <button type="button" onClick={handleCancelEdit} className="rt-btn rt-btn-ghost">Cancel</button>}<button type="submit" disabled={busy} className="rt-btn rt-btn-danger disabled:opacity-50">{busy ? 'Saving...' : editingUserId ? 'Save Changes' : 'Create User'}</button></div>
                    </form>
                  </div>
                  <div><p className={labelClass + " mb-2"}>User Directory</p><div className="grid gap-2">{adminUsers.map(u => (<div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${u.isActive ? 'bg-black/20 border-steel-700/50' : 'bg-red-900/10 border-red-900/30 opacity-70 grayscale-[0.5]'}`}><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.role === ROLE_ADMIN ? 'bg-red-500' : 'bg-steel-500'}`} /><div className="min-w-0"><div className="flex items-center gap-2"><p className={`text-xs font-bold truncate ${u.isActive ? 'text-steel-100' : 'text-steel-400 line-through'}`}>{u.username}</p>{!u.isActive && (<span className="flex items-center gap-1 text-[9px] bg-red-900/60 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"><Ban size={8} /> Deactivated</span>)}</div><p className="text-[10px] text-steel-400 truncate">{u.email}</p></div></div><div className="flex gap-2">{verifyActionId === u.id ? (<div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200"><span className="text-[10px] text-steel-300 font-bold hidden sm:inline">Sure?</span><button onClick={() => confirmAction(u.id)} className="px-3 py-1.5 rounded bg-red-600 text-[10px] text-white font-bold shadow-lg hover:bg-red-500 transition">Yes</button><button onClick={cancelDelete} className="px-3 py-1.5 rounded bg-steel-700 text-[10px] text-steel-300 font-medium hover:bg-steel-600 transition">No</button></div>) : (<><button onClick={() => handleEditUser(u)} className="px-3 py-1.5 rounded bg-steel-700 text-[10px] text-steel-200 font-medium border border-steel-600/50 hover:border-steel-500 transition">Edit</button>{u.isActive ? (<button onClick={() => initiateDelete(u.id, 'soft')} className="px-3 py-1.5 rounded bg-amber-900/20 text-[10px] text-amber-500 font-medium border border-amber-900/30 hover:bg-amber-900/30 transition flex items-center gap-1"><Power size={10} /> Disable</button>) : (<button onClick={() => initiateDelete(u.id, 'hard')} className="px-3 py-1.5 rounded bg-red-900/20 text-[10px] text-red-400 font-medium border border-red-900/30 hover:bg-red-900/30 transition flex items-center gap-1"><Trash2 size={10} /> Delete</button>)}</>)}</div></div>))}</div></div>
                </div>
              )}

              {/* 2. PASSWORD RESET */}
              {activeTab === 'reset' && (
                  <div className="space-y-6">
                     <div className="bg-steel-800/30 rounded-xl p-4 border border-steel-700/60">
                        <h3 className="text-sm font-bold text-steel-200 flex items-center gap-2 mb-4"><Lock size={16} className="text-red-500" />Admin Password Reset</h3>
                        <form onSubmit={handleResetSubmit} className="space-y-3">
                           <div><label className={labelClass}>Target Username</label><input className={inputClass} value={resetForm.username} onChange={e => setResetForm(p => ({ ...p, username: e.target.value }))} /></div>
                           <div><label className={labelClass}>New Password</label><PasswordInput value={resetForm.newPassword} onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} show={showResetPass} onToggle={() => setShowResetPass(!showResetPass)} /></div>
                           <div className="pt-2 flex justify-end"><button type="submit" disabled={busy} className="rt-btn rt-btn-danger disabled:opacity-50">Reset Password</button></div>
                        </form>
                     </div>
                  </div>
              )}

              {/* 3. AI CONFIG TAB */}
              {activeTab === 'config' && (
                  <div className="space-y-6">
                     <div className="bg-steel-800/30 rounded-xl p-4 border border-steel-700/60">
                        <h3 className="text-sm font-bold text-steel-200 flex items-center gap-2 mb-4"><Settings size={16} className="text-red-500" />System Configuration</h3>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-black/20 border border-steel-700 rounded-lg mb-4">
                            <div className="flex items-start gap-3"><div className="p-2 rounded-lg bg-steel-700 text-steel-400 mt-1"><Bot size={18} /></div><div><p className="text-xs font-bold text-steel-100">AI Ballistics Expert</p><p className="text-[10px] text-steel-400 leading-relaxed mt-1">Enable the generative AI chat assistant via OpenRouter.</p></div></div>
                            <div className="flex items-center justify-end">{systemSettings.hasAiKey || systemSettings.ai_api_key ? (<button onClick={() => toggleAi(systemSettings.ai_enabled === 'true' ? 'false' : 'true')} className={`rt-btn w-full sm:w-auto ${systemSettings.ai_enabled === 'true' ? 'rt-btn-danger' : 'rt-btn-ghost'}`}>{systemSettings.ai_enabled === 'true' ? 'Enabled' : 'Disabled'}</button>) : (<span className="px-3 py-1 rounded bg-amber-900/20 text-amber-500 text-[10px] border border-amber-900/50 flex items-center gap-1"><AlertTriangle size={10} /> Missing API Key</span>)}</div>
                        </div>

                        <div className="p-4 bg-black/20 border border-steel-700 rounded-lg space-y-4">
                            <div>
                                <label className={labelClass}>AI Model <span className={subLabelClass}>(OpenRouter Free Tier)</span></label>
                                <div className="relative">
                                    <select className={`${inputClass} appearance-none`} value={aiModel === 'custom' ? 'custom' : aiModel} onChange={e => setAiModel(e.target.value)}>
                                        <option value="google/gemini-2.0-flash-exp:free">Google Gemini 2.0 Flash (Recommended)</option>
                                        <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (Powerful/New)</option>
                                        <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B (Fast)</option>
                                        <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Uncensored)</option>
                                        <option value="microsoft/phi-3-medium-128k-instruct:free">Microsoft Phi-3 Medium</option>
                                        <option value="custom">Custom Model ID...</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-steel-300"><ChevronDown size={14} /></div>
                                </div>
                                {aiModel === 'custom' && (<input className={`${inputClass} mt-2`} placeholder="e.g. deepseek/deepseek-r1:free" value={customModel} onChange={e => setCustomModel(e.target.value)} />)}
                            </div>
                            
                            <div>
                                <label className={labelClass}>OpenRouter API Key <span className={subLabelClass}>(sk-or-v1...)</span></label>
                                <div className="relative">
                                    <input type={showApiKey ? "text" : "password"} className={`${inputClass} pr-10`} placeholder="Use System Env Var" value={apiKeyOverride} onChange={e => setApiKeyOverride(e.target.value)} />
                                     <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 transition z-10">{showApiKey ? <EyeOff size={14} /> : <Key size={14} />}</button>
                                </div>
                                <p className="text-[9px] text-steel-500 mt-1 italic">Leave blank to use OPENROUTER_API_KEY from .env</p>
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button onClick={testAiConnection} disabled={busy} className="rt-btn rt-btn-ghost disabled:opacity-50"><Zap size={12}/> Test</button>
                                <button onClick={saveAiConfig} disabled={busy} className="rt-btn rt-btn-secondary disabled:opacity-50"><Save size={12}/> Save Config</button>
                            </div>
                        </div>
                     </div>
                  </div>
              )}

              {/* 4. NEW SCANNER TAB */}
              {activeTab === 'scanner' && (
                  <BarcodeSettings 
                      settings={systemSettings} 
                      onSave={handleGenericSave} 
                  />
              )}

              {/* 5. SQL CONSOLE */}
              {activeTab === 'console' && (
                  <div className="space-y-4 h-full flex flex-col">
                      <div className="bg-amber-900/10 border border-amber-900/30 p-3 rounded-lg flex items-start gap-3">
                          <Database className="text-amber-500 shrink-0" size={20} />
                          <div><h4 className="text-xs font-bold text-amber-400">Database Console</h4><p className="text-[10px] text-amber-400/70">Execute raw SQL commands. USE CAUTION.</p></div>
                      </div>
                      <textarea className="w-full h-48 bg-steel-900 border border-steel-600 rounded-xl p-4 font-mono text-xs text-emerald-400 focus:border-red-500 focus:outline-none resize-none" placeholder="SELECT * FROM users;" value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} spellCheck={false} />
                      <div className="flex justify-end"><button onClick={runQuery} disabled={busy} className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg flex items-center gap-2 transition text-xs"><Play size={14} fill="currentColor" /> Execute Query</button></div>
                      {sqlResult && (<div className={`p-4 rounded-xl border flex-1 overflow-hidden flex flex-col ${sqlResult.success ? 'bg-steel-800/50 border-steel-600' : 'bg-red-900/20 border-red-500/50'}`}><div className="flex items-center gap-2 mb-2 flex-shrink-0">{sqlResult.success ? <CheckCircle size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-red-500"/>}<span className="text-xs font-bold text-steel-100">{sqlResult.success ? 'Success' : 'Error'}</span><span className="text-[10px] text-steel-400 ml-auto">{sqlResult.message || ''}</span></div>{sqlResult.error && <pre className="text-[10px] text-red-400 whitespace-pre-wrap font-mono">{sqlResult.error}</pre>}{sqlResult.rows && (<div className="overflow-auto custom-scrollbar flex-1"><table className="w-full text-left text-[10px] text-steel-200 border-collapse"><thead className="sticky top-0 bg-steel-800 text-steel-400 font-bold border-b border-steel-600"><tr>{Object.keys(sqlResult.rows[0] || {}).map(k => <th key={k} className="p-2 whitespace-nowrap">{k}</th>)}</tr></thead><tbody>{sqlResult.rows.map((row, i) => (<tr key={i} className="border-b border-steel-700/50 hover:bg-white/5">{Object.values(row).map((v, j) => <td key={j} className="p-2 whitespace-nowrap max-w-[200px] truncate">{v === null ? 'NULL' : String(v)}</td>)}</tr>))}</tbody></table></div>)}</div>)}
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
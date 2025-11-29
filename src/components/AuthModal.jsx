//===============================================================
//Script Name: AuthModal.jsx
//Script Location: src/components/AuthModal.jsx
//Date: 11/28/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.1.1
//About: Role / account management modal.
//       Updated to use REAL backend API via ../lib/auth.js
//       Added: Edit User functionality.
//       Updated: Button styling to match Purchases/Recipes pills.
//===============================================================

import { useEffect, useState } from 'react'
import { X, Shield, UserCircle2 } from 'lucide-react'
import {
  ROLE_ADMIN,
  ROLE_SHOOTER,
  listAdminUsers,
  registerUser,
  updateUser,
  loginUser,
  resetUserPassword,
  requestPasswordReset,
  removeUser,
} from '../lib/auth'

export default function AuthModal({
  open,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) {
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  })
  
  // "newUser" state is used for both Add and Edit
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    role: ROLE_SHOOTER,
  })
  
  // Track which user is being edited (null = adding new)
  const [editingUserId, setEditingUserId] = useState(null)

  const [resetForm, setResetForm] = useState({
    username: '',
    newPassword: '',
  })
  const [recoverEmail, setRecoverEmail] = useState('')
  const [adminUsers, setAdminUsers] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // On open, fetch user list (only works if we are currently an admin)
  useEffect(() => {
    if (!open) return
    if (currentUser?.role === ROLE_ADMIN) {
        loadUsers()
    } else {
        setAdminUsers([])
    }
    setStatusMessage('')
    setErrorMessage('')
    handleCancelEdit()
  }, [open, currentUser])

  async function loadUsers() {
      try {
          const users = await listAdminUsers()
          setAdminUsers(users)
      } catch (err) {
          console.log("Could not list users:", err)
      }
  }

  function handleEditUser(user) {
    setEditingUserId(user.id)
    setNewUser({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        phone: user.phone || '',
        email: user.email || '',
        password: '', // Don't populate password
        role: user.role || ROLE_SHOOTER
    })
    setStatusMessage(`Editing user "${user.username}".`)
    setErrorMessage('')
  }

  function handleCancelEdit() {
    setEditingUserId(null)
    setNewUser({
        firstName: '',
        lastName: '',
        username: '',
        phone: '',
        email: '',
        password: '',
        role: ROLE_SHOOTER,
    })
  }

  if (!open) return null

  const sessionLabel = currentUser
    ? currentUser.role === ROLE_ADMIN
      ? 'Reloader (Admin)'
      : 'Shooter (Read-only)'
    : 'Shooter (Read-only)'

  const sessionName =
    currentUser?.username ||
    currentUser?.firstName ||
    currentUser?.email ||
    ''

  const inputClass =
    'w-full bg-black/40 border border-red-500/30 rounded-xl px-3 py-2 text-[11px] md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60'

  const labelClass =
    'block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-[0.16em]'

  async function handleLoginSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatusMessage('')
    setErrorMessage('')
    try {
      const user = await loginUser({
        username: loginForm.username,
        password: loginForm.password,
      })
      setStatusMessage(
        `Signed in as ${user.username || user.email}.`
      )
      setLoginForm({ username: '', password: '' })
      if (onLogin) onLogin(user)
      if (onClose) onClose()
    } catch (err) {
      setErrorMessage(err?.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegisterOrUpdateSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      if (editingUserId) {
          // UPDATE EXISTING
          const payload = { ...newUser }
          if (!payload.password) delete payload.password // Don't send empty string if unchanged
          
          await updateUser(editingUserId, payload)
          setStatusMessage(`User "${newUser.username}" updated successfully.`)
          handleCancelEdit() // Clear form
      } else {
          // CREATE NEW
          await registerUser(newUser)
          setStatusMessage(
            `User "${newUser.username}" created as ${
              newUser.role === ROLE_ADMIN ? 'Reloader (Admin)' : 'Shooter'
            }.`
          )
          handleCancelEdit() // Clear form
      }
      
      if (currentUser?.role === ROLE_ADMIN) loadUsers()
    } catch (err) {
      setErrorMessage(err?.message || 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      await resetUserPassword({
        username: resetForm.username,
        newPassword: resetForm.newPassword,
      })
      setStatusMessage(
        `Password reset for "${resetForm.username}".`
      )
      setResetForm({ username: '', newPassword: '' })
    } catch (err) {
      setErrorMessage(err?.message || 'Unable to reset password.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRecoverSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      await requestPasswordReset({ email: recoverEmail })
      setStatusMessage(
        'If that email exists, a recovery link has been sent (Stub).'
      )
      setRecoverEmail('')
    } catch (err) {
      setErrorMessage(
        err?.message || 'Unable to request password recovery.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveUser(id) {
    if (!window.confirm('Remove this user?')) return

    setBusy(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      await removeUser(id)
      loadUsers()
      setStatusMessage('User removed.')
      
      // If we removed ourselves
      if (currentUser && currentUser.id === id && onLogout) {
        onLogout()
      }
    } catch (err) {
      setErrorMessage(
        err?.message || 'Unable to remove user.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="glass max-w-3xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/70 transition"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3 mb-3 pr-8">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-900/60 border border-red-500/60 text-red-200 mr-1">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-500/70 mb-1">
              Access &amp; Roles
            </p>
            <h2 className="text-xl font-bold glow-red">
              Reloader (admin) vs Shooter (read-only)
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Admins can add, edit, and delete data. Shooters can browse only.
            </p>
          </div>
        </div>

        <div className="mb-3 text-[11px] text-slate-400 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-slate-700">
            <UserCircle2 size={14} className="text-slate-300" />
            <span className="uppercase tracking-[0.16em] text-slate-500">
              Current session:
            </span>
            <span className="font-semibold text-slate-100">
              {sessionLabel}
            </span>
            {sessionName && (
              <span className="text-slate-400">
                • {sessionName}
              </span>
            )}
          </div>
        </div>

        {(statusMessage || errorMessage) && (
          <div className="mb-3 text-[11px]">
            {statusMessage && (
              <div className="text-emerald-300">
                {statusMessage}
              </div>
            )}
            {errorMessage && (
              <div className="text-red-300">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5 mt-2 text-[11px]">
          {/* LEFT: Login */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Login
            </p>
            
            <form onSubmit={handleLoginSubmit} className="space-y-3 mt-2">
              <div>
                <label className={labelClass}>Username / Email</label>
                <input
                  className={inputClass}
                  value={loginForm.username}
                  onChange={e =>
                    setLoginForm(prev => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={loginForm.password}
                  onChange={e =>
                    setLoginForm(prev => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-[11px] font-semibold shadow-md shadow-red-900/40 transition"
                >
                  {busy ? 'Working…' : 'Sign in'}
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-3 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800/60 text-[11px] font-semibold transition"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT: User management */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              User Management
            </p>
            <p className="text-[11px] text-slate-400">
              {currentUser?.role === ROLE_ADMIN 
                ? "Manage users below." 
                : "Login as Admin to create new users."}
            </p>

            <form onSubmit={handleRegisterOrUpdateSubmit} className="space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input
                    className={inputClass}
                    value={newUser.firstName}
                    onChange={e => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input
                    className={inputClass}
                    value={newUser.lastName}
                    onChange={e => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    className={inputClass}
                    value={newUser.username}
                    onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    className={inputClass}
                    value={newUser.phone}
                    onChange={e => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  className={inputClass}
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {editingUserId ? "Password (leave empty to keep)" : "Password"}
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={newUser.password}
                  onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelClass}>Account Type</label>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setNewUser(prev => ({ ...prev, role: ROLE_ADMIN }))}
                    className={
                      'px-3 py-1 rounded-full border text-xs transition ' +
                      (newUser.role === ROLE_ADMIN
                        ? 'border-emerald-500/70 text-emerald-300 bg-black/60'
                        : 'border-slate-700 text-slate-300 bg-black/40')
                    }
                  >
                    Reloader (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUser(prev => ({ ...prev, role: ROLE_SHOOTER }))}
                    className={
                      'px-3 py-1 rounded-full border text-xs transition ' +
                      (newUser.role === ROLE_SHOOTER
                        ? 'border-slate-400 text-slate-200 bg-black/60'
                        : 'border-slate-700 text-slate-300 bg-black/40')
                    }
                  >
                    Shooter (Read-only)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {editingUserId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800/60 text-[11px] font-semibold transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-[11px] font-semibold shadow-md shadow-red-900/40 transition"
                >
                  {busy ? 'Working…' : editingUserId ? 'Update User' : 'Add User'}
                </button>
              </div>
            </form>

            {/* Admin users list */}
            {currentUser?.role === ROLE_ADMIN && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                  Existing Users
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {adminUsers.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between bg-black/40 rounded-xl px-3 py-1 text-[11px] text-slate-300"
                    >
                      <span className="truncate max-w-[120px]" title={u.email}>
                        {u.username}
                        {u.role === ROLE_ADMIN && <span className="text-emerald-400 ml-1">(Admin)</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* EDIT BUTTON PILL - MATCHING PURCHASES STYLE */}
                        <span
                          onClick={() => handleEditUser(u)}
                          className="px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 transition cursor-pointer text-[10px] text-slate-300"
                        >
                          Edit
                        </span>
                        {/* REMOVE BUTTON PILL - MATCHING PURCHASES STYLE */}
                        <span
                          onClick={() => handleRemoveUser(u.id)}
                          className="px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-300 hover:bg-red-900/40 transition cursor-pointer text-[10px]"
                        >
                          Remove
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
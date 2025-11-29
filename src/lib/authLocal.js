//===============================================================
//Script Name: authLocal.js
//Script Location: src/lib/authLocal.js
//Date: 11/27/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.0.0
//About: Minimal local auth/role helper for Reload Tracker.
//       Stores user accounts + current session in localStorage.
//       Designed so it can later be swapped with a real DB/API
//       implementation without changing the UI components.
//===============================================================

export const ROLE_ADMIN = 'admin'
export const ROLE_VIEWER = 'viewer'

const USERS_KEY = 'rt_auth_users_v1'
const CURRENT_KEY = 'rt_auth_current_user_v1'

function hasStorage() {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  )
}

function safeParse(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function getUsers() {
  if (!hasStorage()) return []
  const raw = window.localStorage.getItem(USERS_KEY)
  const data = safeParse(raw, [])
  return Array.isArray(data) ? data : []
}

function saveUsers(users) {
  if (!hasStorage()) return
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users || []))
}

export function getCurrentUser() {
  if (!hasStorage()) return null
  const raw = window.localStorage.getItem(CURRENT_KEY)
  const user = safeParse(raw, null)
  if (!user || typeof user !== 'object') return null
  return user
}

export function setCurrentUser(user) {
  if (!hasStorage()) return
  if (!user) {
    window.localStorage.removeItem(CURRENT_KEY)
    return
  }
  const { password, ...safe } = user
  window.localStorage.setItem(CURRENT_KEY, JSON.stringify(safe))
}

export function logoutUser() {
  if (!hasStorage()) return
  window.localStorage.removeItem(CURRENT_KEY)
}

/**
 * Register a new user account on this device.
 * NOTE: This implementation is intentionally simple and stores
 * the password in clear text in localStorage. In production
 * you should replace this with a server-side auth system that
 * hashes passwords and issues tokens.
//===============================================================
//Script Name: authLocal.js
//Script Location: src/lib/authLocal.js
//Date: 11/27/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.0.0
//About: Minimal local auth/role helper for Reload Tracker.
//       Stores user accounts + current session in localStorage.
//       Designed so it can later be swapped with a real DB/API
//       implementation without changing the UI components.
//===============================================================

export const ROLE_ADMIN = 'admin'
export const ROLE_VIEWER = 'viewer'

const USERS_KEY = 'rt_auth_users_v1'
const CURRENT_KEY = 'rt_auth_current_user_v1'

function hasStorage() {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  )
}

function safeParse(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function getUsers() {
  if (!hasStorage()) return []
  const raw = window.localStorage.getItem(USERS_KEY)
  const data = safeParse(raw, [])
  return Array.isArray(data) ? data : []
}

function saveUsers(users) {
  if (!hasStorage()) return
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users || []))
}

export function getCurrentUser() {
  if (!hasStorage()) return null
  const raw = window.localStorage.getItem(CURRENT_KEY)
  const user = safeParse(raw, null)
  if (!user || typeof user !== 'object') return null
  return user
}

export function setCurrentUser(user) {
  if (!hasStorage()) return
  if (!user) {
    window.localStorage.removeItem(CURRENT_KEY)
    return
  }
  const { password, ...safe } = user
  window.localStorage.setItem(CURRENT_KEY, JSON.stringify(safe))
}

export function logoutUser() {
  if (!hasStorage()) return
  window.localStorage.removeItem(CURRENT_KEY)
}

/**
 * Register a new user account on this device.
 * NOTE: This implementation is intentionally simple and stores
 * the password in clear text in localStorage. In production
 * you should replace this with a server-side auth system that
 * hashes passwords and issues tokens.
 */
export async function registerUser(fields) {
  if (!hasStorage()) {
    throw new Error(
      'Browser storage is not available. Auth needs localStorage or a backend.'
    )
  }

  const users = getUsers()

  const firstName = (fields.firstName || '').trim()
  const lastName = (fields.lastName || '').trim()
  const username = (fields.username || '').trim()
  const email = (fields.email || '').trim()
  const phone = (fields.phone || '').trim()
  const password = fields.password || ''
  const role =
    fields.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_VIEWER

  if (!username || !password) {
    throw new Error('Username and password are required.')
  }

  const usernameLower = username.toLowerCase()
  const emailLower = email.toLowerCase()

  const duplicate = users.find(u => {
    const uNameLower = (u.usernameLower || u.username || '')
      .toString()
      .toLowerCase()
    const uEmailLower = (u.emailLower || u.email || '')
      .toString()
      .toLowerCase()

    return (
      uNameLower === usernameLower ||
      (emailLower && uEmailLower === emailLower)
    )
  })

  if (duplicate) {
    throw new Error('That username or email is already in use.')
  }

  const user = {
    id:
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7),
    firstName,
    lastName,
    username,
    usernameLower,
    email,
    emailLower,
    phone,
    password,
    role,
    createdAt: new Date().toISOString(),
  }

  users.push(user)
  saveUsers(users)

  const { password: _pw, ...safe } = user
  return safe
}

export async function loginUser({ username, password }) {
  if (!hasStorage()) {
    throw new Error(
      'Browser storage is not available. Auth needs localStorage or a backend.'
    )
  }

  const uname = (username || '').trim().toLowerCase()
  const pw = password || ''

  if (!uname || !pw) {
    throw new Error('Enter username and password.')
  }

  const users = getUsers()
  const user = users.find(u => {
    const storedName = (u.usernameLower || u.username || '')
      .toString()
      .toLowerCase()
    return storedName === uname
  })

  if (!user || user.password !== pw) {
    throw new Error('Invalid username or password.')
  }

  const { password: _pw, ...safe } = user
  setCurrentUser(safe)
  return safe
}

export async function resetUserPassword({
  username,
  newPassword,
}) {
  if (!hasStorage()) {
    throw new Error(
      'Browser storage is not available. Auth needs localStorage or a backend.'
    )
  }

  const uname = (username || '').trim().toLowerCase()
  const pw = newPassword || ''

  if (!uname || !pw) {
    throw new Error('Username and new password are required.')
  }

  const users = getUsers()
  const idx = users.findIndex(u => {
    const storedName = (u.usernameLower || u.username || '')
      .toString()
      .toLowerCase()
    return storedName === uname
  })

  if (idx === -1) {
    throw new Error('User not found.')
  }

  users[idx] = {
    ...users[idx],
    password: pw,
  }
  saveUsers(users)
  return true
}

/**
 * Placeholder for password recovery. In a DB/API-backed version
 * this would trigger an email. For now it just validates that
 * the email exists locally and returns success.
 */
export async function requestPasswordReset({ email }) {
  if (!hasStorage()) {
    throw new Error(
      'Browser storage is not available. Auth needs localStorage or a backend.'
    )
  }

  const emailLower = (email || '').trim().toLowerCase()
  if (!emailLower) {
    throw new Error('Email is required.')
  }

  const users = getUsers()
  const exists = users.some(u => {
    const stored = (u.emailLower || u.email || '')
      .toString()
      .toLowerCase()
    return stored === emailLower
  })

  if (!exists) {
    throw new Error('No account found for that email.')
  }

  // No-op: caller can show a "check your email" message.
  return true
}

export async function removeUser(userId) {
  if (!hasStorage()) {
    throw new Error(
      'Browser storage is not available. Auth needs localStorage or a backend.'
    )
  }

  const users = getUsers()
  const next = users.filter(u => u.id !== userId)

  if (next.length === users.length) {
    throw new Error('User not found.')
  }

  saveUsers(next)

  const current = getCurrentUser()
  if (current && current.id === userId) {
    logoutUser()
  }

  return true
}

export function listAdminUsers() {
  return getUsers().filter(u => u.role === ROLE_ADMIN)
}

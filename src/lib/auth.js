//===============================================================
//Script Name: Reload Tracker Frontend Auth Client
//Script Location: src/lib/auth.js
//Date: 12/07/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.2.0
//About: Client-side authentication helper.
//       Updated: Added permanentlyDeleteUser function.
//===============================================================

const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  '/api'

export const ROLE_ADMIN = 'admin'
export const ROLE_SHOOTER = 'shooter'

async function authRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', 
  }

  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${API_BASE_URL}${endpoint}`, options)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || 'Authentication request failed.')
  }

  return data
}

export async function loginUser({ username, password }) {
  const response = await authRequest('/auth/login', 'POST', { identifier: username, password })
  return response.user
}

export async function logoutUser() {
  try { await authRequest('/auth/logout', 'POST') } catch (err) { console.warn(err) }
  return true
}

export async function getCurrentUser() {
  try {
    const response = await authRequest('/auth/me', 'GET')
    return response.user
  } catch (err) { return null }
}

export async function requestPasswordReset({ email }) {
  return await authRequest('/auth/recover', 'POST', { email })
}

// --- ADMIN MANAGEMENT FUNCTIONS ---

export async function listAdminUsers() {
  const response = await authRequest('/auth/users', 'GET')
  return response.users || []
}

export async function registerUser(payload) {
  const response = await authRequest('/auth/users', 'POST', payload)
  return response.user
}

export async function updateUser(id, payload) {
  const response = await authRequest('/auth/users/update', 'POST', { id, ...payload })
  return response.user
}

// Deactivate (Soft Delete)
export async function removeUser(userId) {
  const response = await authRequest('/auth/users/remove', 'POST', { userId })
  return response.user
}

// Permanent Delete (Hard Delete)
export async function permanentlyDeleteUser(userId) {
  const response = await authRequest('/auth/users/delete', 'POST', { userId })
  return response.success
}

export async function resetUserPassword({ username, newPassword }) {
  const response = await authRequest('/auth/users/reset-password', 'POST', { username, newPassword })
  return response.user
}
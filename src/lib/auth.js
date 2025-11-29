//===============================================================
//Script Name: Reload Tracker Frontend Auth Client
//Script Location: src/lib/auth.js
//Date: 11/28/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.1.0
//About: Client-side authentication helper. Replaces the old
//       localStorage auth with real HTTP calls to the backend
//       API (/api/auth/*).
//       Added: updateUser() support.
//===============================================================

// Use the same base URL logic as db.js
const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  '/api'

export const ROLE_ADMIN = 'admin'
export const ROLE_SHOOTER = 'shooter'

/**
 * Helper for making JSON requests with credentials (cookies) included.
 */
async function authRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    // IMPORTANT: This tells the browser to send/receive HttpOnly cookies
    credentials: 'include', 
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, options)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || 'Authentication request failed.')
  }

  return data
}

/**
 * Log in with username (or email) and password.
 * Returns { user }.
 */
export async function loginUser({ username, password }) {
  const response = await authRequest('/auth/login', 'POST', {
    identifier: username,
    password,
  })
  return response.user
}

/**
 * Log out the current session.
 */
export async function logoutUser() {
  try {
    await authRequest('/auth/logout', 'POST')
  } catch (err) {
    console.warn('Logout failed or session already invalid', err)
  }
  return true
}

/**
 * Get the current session user from the server (validate cookie).
 * Returns user object or null if not logged in.
 */
export async function getCurrentUser() {
  try {
    const response = await authRequest('/auth/me', 'GET')
    return response.user
  } catch (err) {
    // 401 or network error means no valid session
    return null
  }
}

/**
 * Request a password reset email (Stub).
 */
export async function requestPasswordReset({ email }) {
  return await authRequest('/auth/recover', 'POST', { email })
}

// --- ADMIN MANAGEMENT FUNCTIONS ---

/**
 * List all users (Admin only).
 */
export async function listAdminUsers() {
  const response = await authRequest('/auth/users', 'GET')
  return response.users || []
}

/**
 * Create a new user (Admin only).
 */
export async function registerUser(payload) {
  const response = await authRequest('/auth/users', 'POST', payload)
  return response.user
}

/**
 * Update an existing user (Admin only).
 */
export async function updateUser(id, payload) {
  const response = await authRequest('/auth/users/update', 'POST', { id, ...payload })
  return response.user
}

/**
 * Remove/Deactivate a user (Admin only).
 */
export async function removeUser(userId) {
  const response = await authRequest('/auth/users/remove', 'POST', { userId })
  return response.user
}

/**
 * Reset a user's password (Admin only).
 */
export async function resetUserPassword({ username, newPassword }) {
  const response = await authRequest('/auth/users/reset-password', 'POST', {
    username,
    newPassword,
  })
  return response.user
}
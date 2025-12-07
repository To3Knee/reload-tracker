//===============================================================
//Script Name: Reload Tracker Auth Function
//Script Location: netlify/functions/auth.js
//Date: 12/07/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.2.0
//About: Netlify Function HTTP handler for Reload Tracker auth.
//       Updated: Added Hard Delete endpoint.
//===============================================================

import {
  authenticateUser,
  createSessionForUser,
  getUserForSessionToken,
  revokeSessionToken,
  listUsers,
  createUser,
  updateUser,
  setUserPassword,
  deactivateUser,
  permanentlyDeleteUser,
  SESSION_COOKIE_NAME,
} from '../../backend/authService.js'
import { ValidationError, NotFoundError } from '../../backend/errors.js'

function jsonResponse(statusCode, body, extraHeaders = {}) {
  const baseHeaders = { 'Content-Type': 'application/json' }
  return {
    statusCode,
    headers: { ...baseHeaders, ...extraHeaders },
    body: JSON.stringify(body),
  }
}

function parseJsonBody(event) {
  if (!event.body) return {}
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new ValidationError('Invalid JSON payload.')
  }
}

function getCookies(event) {
  const header = event.headers.cookie || event.headers.Cookie || ''
  const out = {}
  if (!header) return out
  const parts = header.split(';')
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=')
    if (!name) continue
    out[name] = decodeURIComponent(rest.join('=') || '')
  }
  return out
}

function makeSessionCookie(token, expiresAt) {
  const pieces = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (process.env.NODE_ENV === 'production') pieces.push('Secure')
  if (expiresAt) pieces.push(`Expires=${new Date(expiresAt).toUTCString()}`)
  return pieces.join('; ')
}

function clearSessionCookie() {
  const pieces = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    `Expires=${new Date(0).toUTCString()}`
  ]
  if (process.env.NODE_ENV === 'production') pieces.push('Secure')
  return pieces.join('; ')
}

function getSubPath(event) {
  const rawPath = event.path || ''
  const idx = rawPath.indexOf('/auth')
  if (idx === -1) return '/'
  const sub = rawPath.slice(idx + '/auth'.length) || '/'
  return sub.startsWith('/') ? sub : `/${sub}`
}

async function requireAdmin(event) {
  const cookies = getCookies(event)
  const token = cookies[SESSION_COOKIE_NAME]
  if (!token) throw new ValidationError('Authentication required.')
  
  const user = await getUserForSessionToken(token)
  if (!user || user.role !== 'admin' || user.isActive === false) {
    throw new ValidationError('Admin privileges required.')
  }
  return { user, token }
}

async function handleLogin(event) {
  const body = parseJsonBody(event)
  const identifier = body.identifier || body.username || body.email
  const user = await authenticateUser(identifier, body.password)
  const session = await createSessionForUser(user.id)
  const setCookie = makeSessionCookie(session.token, session.expiresAt)
  return jsonResponse(200, { user }, { 'Set-Cookie': setCookie })
}

async function handleMe(event) {
  const cookies = getCookies(event)
  const token = cookies[SESSION_COOKIE_NAME]
  if (!token) return jsonResponse(401, { message: 'Not authenticated.' })
  
  const user = await getUserForSessionToken(token)
  if (!user) return jsonResponse(401, { message: 'Not authenticated.' })
  
  return jsonResponse(200, { user })
}

async function handleLogout(event) {
  const cookies = getCookies(event)
  const token = cookies[SESSION_COOKIE_NAME]
  if (token) await revokeSessionToken(token)
  return jsonResponse(200, { success: true }, { 'Set-Cookie': clearSessionCookie() })
}

async function handleListUsers(event) {
  await requireAdmin(event)
  const users = await listUsers()
  return jsonResponse(200, { users })
}

async function handleCreateUser(event) {
  const existingUsers = await listUsers()
  if (existingUsers.length > 0) {
    await requireAdmin(event)
  }

  const body = parseJsonBody(event)
  const user = await createUser({
    firstName: body.firstName,
    lastName: body.lastName,
    username: body.username,
    phone: body.phone,
    email: body.email,
    password: body.password,
    role: body.role,
  })
  return jsonResponse(201, { user })
}

async function handleUpdateUser(event) {
  await requireAdmin(event)
  const body = parseJsonBody(event)
  const id = body.id || body.userId
  if (!id) throw new ValidationError('User ID is required for update.')
  const { id: _id, userId: _uid, ...updates } = body
  const user = await updateUser(id, updates)
  return jsonResponse(200, { user })
}

async function handleDeactivateUser(event) {
  await requireAdmin(event)
  const body = parseJsonBody(event)
  const user = await deactivateUser(Number(body.userId || body.id))
  return jsonResponse(200, { user })
}

async function handlePermanentDelete(event) {
  await requireAdmin(event)
  const body = parseJsonBody(event)
  const result = await permanentlyDeleteUser(Number(body.userId || body.id))
  return jsonResponse(200, result)
}

async function handleResetPassword(event) {
  await requireAdmin(event)
  const body = parseJsonBody(event)
  const user = await setUserPassword(body.username, body.newPassword || body.password)
  return jsonResponse(200, { user })
}

export async function handler(event, context) {
  const method = event.httpMethod || 'GET'
  const subPath = getSubPath(event)

  try {
    if (method === 'POST' && subPath === '/login') return await handleLogin(event)
    if (method === 'GET' && subPath === '/me') return await handleMe(event)
    if (method === 'POST' && subPath === '/logout') return await handleLogout(event)
    
    // Admin User Routes
    if (subPath === '/users') {
      if (method === 'GET') return await handleListUsers(event)
      if (method === 'POST') return await handleCreateUser(event)
    }
    
    if (method === 'POST' && subPath === '/users/update') return await handleUpdateUser(event)
    if (method === 'POST' && subPath === '/users/remove') return await handleDeactivateUser(event)
    if (method === 'POST' && subPath === '/users/delete') return await handlePermanentDelete(event)
    if (method === 'POST' && subPath === '/users/reset-password') return await handleResetPassword(event)
    
    if (method === 'POST' && subPath === '/recover') {
      return jsonResponse(200, { message: 'Recovery stub.' })
    }

    return jsonResponse(404, { message: `Route not found.` })
  } catch (err) {
    const status = err instanceof ValidationError ? 400 : 500
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('authentication') || msg.includes('privileges')) {
      return jsonResponse(401, { message: err.message })
    }
    return jsonResponse(status, { message: err.message })
  }
}
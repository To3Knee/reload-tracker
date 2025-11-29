//===============================================================
//Script Name: Reload Tracker Auth Service
//Script Location: backend/authService.js
//Date: 11/28/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.1.0
//About: User accounts and session management logic.
//       Handles password hashing (PBKDF2) and DB operations.
//       Added: updateUser() support.
//===============================================================

import crypto from 'node:crypto'
import { query } from './dbClient.js'
import { ValidationError, NotFoundError } from './errors.js'

const SESSION_TTL_HOURS = 168 // 7 days
export const SESSION_COOKIE_NAME = 'rt_session'
const MIN_PASSWORD_LENGTH = 8

// --- Helpers ---

function normalizeUserRow(row) {
  if (!row) return null
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  }
}

function assertNonEmpty(value, fieldName) {
  if (!value || String(value).trim() === '') {
    throw new ValidationError(`Field "${fieldName}" is required.`)
  }
}

// --- Hashing ---

export function hashPassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} chars.`)
  }
  const salt = crypto.randomBytes(16)
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')
  return ['pbkdf2', '100000', salt.toString('base64'), hash.toString('base64')].join('$')
}

export function verifyPassword(password, stored) {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 4) return false
  const salt = Buffer.from(parts[2], 'base64')
  const expected = Buffer.from(parts[3], 'base64')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')
  return crypto.timingSafeEqual(hash, expected)
}

// --- User Operations ---

export async function listUsers() {
  const res = await query(`SELECT * FROM users ORDER BY id ASC`)
  return res.rows.map(normalizeUserRow)
}

export async function createUser(payload) {
  assertNonEmpty(payload.username, 'username')
  assertNonEmpty(payload.password, 'password')
  
  const role = payload.role === 'admin' ? 'admin' : 'shooter'
  const hash = hashPassword(payload.password)

  // Check duplicates
  const existing = await query(
    `SELECT id FROM users WHERE username = $1 OR email = $2`,
    [payload.username, payload.email]
  )
  if (existing.rows.length > 0) throw new ValidationError('Username or Email already taken.')

  const res = await query(
    `INSERT INTO users (first_name, last_name, username, email, phone, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
     RETURNING *`,
    [payload.firstName, payload.lastName, payload.username, payload.email, payload.phone, hash, role]
  )
  return normalizeUserRow(res.rows[0])
}

/**
 * Update an existing user.
 * Supports partial updates (only fields present in payload are changed).
 */
export async function updateUser(id, payload) {
  if (!id) throw new ValidationError('User ID is required.')

  // 1. Check if user exists
  const check = await query(`SELECT id FROM users WHERE id = $1`, [id])
  if (check.rows.length === 0) throw new NotFoundError('User not found.')

  // 2. Check uniqueness if identifiers are changing
  if (payload.username || payload.email) {
    const existing = await query(
      `SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3`,
      [payload.username || '', payload.email || '', id]
    )
    if (existing.rows.length > 0) throw new ValidationError('Username or Email is already in use by another user.')
  }

  // 3. Build dynamic update query
  const updates = []
  const values = []
  let idx = 1

  const map = {
    firstName: 'first_name',
    lastName: 'last_name',
    username: 'username',
    email: 'email',
    phone: 'phone',
    role: 'role'
  }

  for (const [key, col] of Object.entries(map)) {
    if (payload[key] !== undefined) {
      updates.push(`${col} = $${idx++}`)
      values.push(payload[key])
    }
  }

  // Handle password separately if present
  if (payload.password) {
    const hash = hashPassword(payload.password)
    updates.push(`password_hash = $${idx++}`)
    values.push(hash)
  }

  if (updates.length === 0) {
    // No fields provided? Just return the user as-is.
    const res = await query(`SELECT * FROM users WHERE id = $1`, [id])
    return normalizeUserRow(res.rows[0])
  }

  values.push(id)
  const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`
  
  const res = await query(sql, values)
  return normalizeUserRow(res.rows[0])
}

export async function authenticateUser(identifier, password) {
  const res = await query(
    `SELECT * FROM users WHERE is_active = TRUE AND (username = $1 OR email = $1)`,
    [identifier]
  )
  if (res.rows.length === 0) throw new ValidationError('Invalid credentials.')
  
  const user = res.rows[0]
  if (!verifyPassword(password, user.password_hash)) {
    throw new ValidationError('Invalid credentials.')
  }
  
  // Update last login (fire and forget)
  query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]).catch(() => {})
  
  return normalizeUserRow(user)
}

export async function setUserPassword(username, newPassword) {
  const hash = hashPassword(newPassword)
  const res = await query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() 
     WHERE username = $2 RETURNING *`,
    [hash, username]
  )
  if (res.rows.length === 0) throw new NotFoundError('User not found.')
  return normalizeUserRow(res.rows[0])
}

export async function deactivateUser(userId) {
  const res = await query(
    `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [userId]
  )
  return normalizeUserRow(res.rows[0])
}

// --- Session Operations ---

export async function createSessionForUser(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000)
  
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()]
  )
  
  return { token, expiresAt }
}

export async function getUserForSessionToken(token) {
  if (!token) return null
  const res = await query(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.is_active = TRUE`,
    [token]
  )
  return normalizeUserRow(res.rows[0])
}

export async function revokeSessionToken(token) {
  if (!token) return
  await query(`UPDATE sessions SET revoked_at = NOW() WHERE token = $1`, [token])
}
//===============================================================
//Script Name: Reload Tracker Gear Function
//Script Location: netlify/functions/gear.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: API Endpoint for the Gear Locker.
//===============================================================

import { listGear, createGear, updateGear, deleteGear } from '../../backend/gearService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'
import { ValidationError, NotFoundError } from '../../backend/errors.js'

const baseHeaders = { 'Content-Type': 'application/json' }

function jsonResponse(statusCode, body) {
  return { statusCode, headers: baseHeaders, body: JSON.stringify(body) }
}

async function getCurrentUser(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || ''
  const cookies = {}
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(v || '');
  });
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return await getUserForSessionToken(token);
}

function extractId(path) {
  const parts = path.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return !isNaN(last) ? Number(last) : null
}

export async function handler(event) {
  const method = event.httpMethod || 'GET'
  if (method === 'OPTIONS') return { statusCode: 204, headers: baseHeaders }

  try {
    const currentUser = await getCurrentUser(event)
    if (!currentUser) return jsonResponse(401, { message: 'Authentication required.' })
    if (currentUser.role !== 'admin') {
        return jsonResponse(403, { message: 'Gear access restricted to Reloaders.' })
    }

    const id = extractId(event.path)

    if (method === 'GET') {
      const gear = await listGear(currentUser)
      return jsonResponse(200, gear)
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const item = await createGear(body, currentUser)
      return jsonResponse(201, item)
    }

    if (method === 'PUT') {
      if (!id) return jsonResponse(400, { message: 'ID required' })
      const body = JSON.parse(event.body || '{}')
      const updated = await updateGear(id, body, currentUser)
      return jsonResponse(200, updated)
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { message: 'ID required' })
      await deleteGear(id, currentUser)
      return jsonResponse(200, { success: true })
    }

    return jsonResponse(405, { message: 'Method Not Allowed' })

  } catch (err) {
    const status = err instanceof ValidationError ? 400 : (err instanceof NotFoundError ? 404 : 500)
    return jsonResponse(status, { message: err.message })
  }
}
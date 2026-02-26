//===============================================================
//Script Name: Reload Tracker Range Function
//Script Location: netlify/functions/range.js
//Date: 12/01/2025
//Created By: T03KNEE
//Version: 2.1.0
//About: API Endpoint for Range Logs.
//       Updated: Connects to the Service Layer (Fixes "Gone" logs).
//===============================================================

import { 
  listRangeLogs, 
  createRangeLog, 
  updateRangeLog, 
  deleteRangeLog 
} from '../../backend/rangeService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'
import { ValidationError, NotFoundError } from '../../backend/errors.js'

const baseHeaders = { 'Content-Type': 'application/json' }

function jsonResponse(statusCode, body) {
  return { statusCode, headers: baseHeaders, body: JSON.stringify(body) }
}

async function getCurrentUser(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || ''
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const [k, ...rest] = c.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(rest.join('=') || '');
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
    
    // Ensure user is logged in
    if (!currentUser) return jsonResponse(401, { message: 'Authentication required.' })

    const id = extractId(event.path)

    if (method === 'GET') {
      // This calls the Service, which does the JOINs correctly
      const logs = await listRangeLogs()
      return jsonResponse(200, { logs })
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const result = await createRangeLog(body, currentUser)
      return jsonResponse(201, result)
    }

    if (method === 'PUT') {
      if (!id) return jsonResponse(400, { message: 'ID required' })
      const body = JSON.parse(event.body || '{}')
      const result = await updateRangeLog(id, body, currentUser)
      return jsonResponse(200, result)
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { message: 'ID required' })
      const result = await deleteRangeLog(id, currentUser)
      return jsonResponse(200, result)
    }

    return jsonResponse(405, { message: 'Method Not Allowed' })

  } catch (err) {
    console.error('Range Function Error:', err)
    const status = err instanceof ValidationError ? 400 : (err instanceof NotFoundError ? 404 : 500)
    return jsonResponse(status, { message: err.message })
  }
}
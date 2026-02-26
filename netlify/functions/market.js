//===============================================================
//Script Name: Reload Tracker Market Function
//Script Location: netlify/functions/market.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: API Endpoint for Market Watch.
//===============================================================

import { listMarket, addListing, updateListing, deleteListing, refreshListing } from '../../backend/marketService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'
import { toHttpError } from '../../backend/errors.js'

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
  // Check for 'refresh' action
  if (parts[parts.length - 1] === 'refresh') return { id: Number(parts[parts.length - 2]), action: 'refresh' }
  const last = parts[parts.length - 1]
  return { id: !isNaN(last) ? Number(last) : null, action: null }
}

export async function handler(event) {
  const method = event.httpMethod || 'GET'
  if (method === 'OPTIONS') return { statusCode: 204, headers: baseHeaders }

  try {
    const currentUser = await getCurrentUser(event)
    if (!currentUser) return jsonResponse(401, { message: 'Auth required' })

    const { id, action } = extractId(event.path)

    if (method === 'GET') {
      const items = await listMarket(currentUser.id)
      return jsonResponse(200, items)
    }

    if (method === 'POST') {
      if (id && action === 'refresh') {
          const updated = await refreshListing(id, currentUser.id)
          return jsonResponse(200, updated)
      }
      const body = JSON.parse(event.body || '{}')
      const created = await addListing(body, currentUser.id)
      return jsonResponse(201, created)
    }

    if (method === 'PUT') {
      if (!id) return jsonResponse(400, { message: 'ID required' })
      const body = JSON.parse(event.body || '{}')
      const updated = await updateListing(id, body, currentUser.id)
      return jsonResponse(200, updated)
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { message: 'ID required' })
      await deleteListing(id, currentUser.id)
      return jsonResponse(200, { success: true })
    }

    return jsonResponse(405, { message: 'Method Not Allowed' })

  } catch (err) {
    return toHttpError(err)
  }
}
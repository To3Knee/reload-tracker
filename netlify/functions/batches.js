//===============================================================
//Script Name: Reload Tracker Batches Function
//Script Location: netlify/functions/batches.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.1.1
//About: Endpoint for logging/deleting batches (/api/batches).
//       Updated: Added PUT support for edits.
//===============================================================

import { createBatch, listBatches, updateBatch, deleteBatch } from '../../backend/batchesService.js'
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

function extractIdFromPath(path) {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1];
  const n = Number(lastPart);
  return Number.isNaN(n) ? null : n;
}

export async function handler(event) {
  try {
    const method = event.httpMethod || 'GET'
    if (method === 'OPTIONS') return { statusCode: 204, headers: baseHeaders }

    const currentUser = await getCurrentUser(event)
    const id = extractIdFromPath(event.path || '');

    if (method === 'GET') {
      const batches = await listBatches(currentUser)
      return jsonResponse(200, { batches })
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}')
      // Support "Action Delete" via POST if needed, though DELETE verb preferred
      if (body.action === 'delete' && body.id) {
         await deleteBatch(body.id, currentUser)
         return jsonResponse(200, { success: true })
      }
      const result = await createBatch(body, currentUser)
      return jsonResponse(201, result)
    }

    if (method === 'PUT') {
       if (!id) return jsonResponse(400, { message: 'Missing batch ID.' })
       const body = JSON.parse(event.body || '{}')
       await updateBatch(id, body, currentUser)
       return jsonResponse(200, { success: true })
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { message: 'Missing batch ID.' })
      await deleteBatch(id, currentUser)
      return jsonResponse(200, { success: true })
    }

    return jsonResponse(405, { message: 'Method not allowed' })

  } catch (err) {
    const status = err instanceof ValidationError ? 400 : (err instanceof NotFoundError ? 404 : 500)
    return jsonResponse(status, { message: err.message })
  }
}
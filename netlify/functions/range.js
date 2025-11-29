//===============================================================
//Script Name: Reload Tracker Range Function
//Script Location: netlify/functions/range.js
//Date: 11/29/2025
//Created By: T03KNEE
//About: API Endpoint for Range Logs.
//===============================================================

import { listRangeLogs, createRangeLog, updateRangeLog, deleteRangeLog } from '../../backend/rangeService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'

const baseHeaders = { 'Content-Type': 'application/json' }

async function getCurrentUser(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || ''
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(v || '')
  })
  const token = cookies[SESSION_COOKIE_NAME]
  if (!token) return null
  return await getUserForSessionToken(token)
}

function extractId(path) {
  const parts = path.split('/')
  const id = parts[parts.length - 1]
  return !isNaN(id) ? id : null
}

export async function handler(event) {
  try {
    const currentUser = await getCurrentUser(event)
    const method = event.httpMethod

    if (method === 'GET') {
      const logs = await listRangeLogs()
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ logs }) }
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body)
      const result = await createRangeLog(body, currentUser)
      return { statusCode: 201, headers: baseHeaders, body: JSON.stringify(result) }
    }

    if (method === 'PUT') {
      const id = extractId(event.path)
      const body = JSON.parse(event.body)
      if (!id) return { statusCode: 400, body: 'Missing ID' }
      const result = await updateRangeLog(id, body, currentUser)
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(result) }
    }

    if (method === 'DELETE') {
      const id = extractId(event.path)
      if (!id) return { statusCode: 400, body: 'Missing ID' }
      await deleteRangeLog(id, currentUser)
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ success: true }) }
    }

    return { statusCode: 405, body: 'Method Not Allowed' }
  } catch (err) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ message: err.message }) }
  }
}
//===============================================================
//Script Name: Reload Tracker Settings Function
//Script Location: netlify/functions/settings.js
//Date: 11/29/2025
//Created By: T03KNEE
//About: API Endpoint for global settings.
//===============================================================

import { getSettings, updateSetting } from '../../backend/settingsService.js'
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

export async function handler(event) {
  try {
    const currentUser = await getCurrentUser(event)

    if (event.httpMethod === 'GET') {
      const settings = await getSettings()
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(settings) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body)
      // Expecting { key: 'ai_enabled', value: 'true' }
      const updated = await updateSetting(body.key, body.value, currentUser)
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(updated) }
    }

    return { statusCode: 405, headers: baseHeaders, body: 'Method Not Allowed' }
  } catch (err) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ message: err.message }) }
  }
}
//===============================================================
//Script Name: Reload Tracker Analytics Function
//Script Location: netlify/functions/analytics.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.0.1
//About: API Endpoint for fetching chart data.
//       Updated: Fixed currentUser definition bug.
//===============================================================

import { 
  getMonthlySpend, 
  getComponentPriceTrends,
  getInventoryDistribution,
  getLoadVelocity,
  getBatchCostHistory
} from '../../backend/analyticsService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'
import { ValidationError } from '../../backend/errors.js'

const baseHeaders = { 'Content-Type': 'application/json' }

function jsonResponse(statusCode, body) {
  return { statusCode, headers: baseHeaders, body: JSON.stringify(body) }
}

async function getCurrentUser(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || ''
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(v || '');
  });
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return await getUserForSessionToken(token);
}

export async function handler(event) {
  try {
    const method = event.httpMethod || 'GET'
    if (method === 'OPTIONS') return { statusCode: 204, headers: baseHeaders }

    // FIX: Define currentUser here!
    const currentUser = await getCurrentUser(event)
    
    // Analytics are viewable by everyone (Shooters/Admins), 
    // or restrict if you prefer: if (!currentUser) return 401...

    const path = event.path || ''
    
    if (path.endsWith('/spend')) {
      const data = await getMonthlySpend(currentUser)
      return jsonResponse(200, { data })
    }
    
    if (path.endsWith('/trends')) {
      const data = await getComponentPriceTrends(currentUser)
      return jsonResponse(200, { data })
    }

    if (path.endsWith('/distribution')) {
      const data = await getInventoryDistribution(currentUser)
      return jsonResponse(200, { data })
    }

    if (path.endsWith('/velocity')) {
      const data = await getLoadVelocity(currentUser)
      return jsonResponse(200, { data })
    }

    if (path.endsWith('/history')) {
      const data = await getBatchCostHistory(currentUser)
      return jsonResponse(200, { data })
    }

    return jsonResponse(404, { message: 'Analytics route not found' })

  } catch (err) {
    return jsonResponse(500, { message: err.message })
  }
}
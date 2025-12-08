//===============================================================
//Script Name: Reload Tracker Market Function
//Script Location: netlify/functions/market.js
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.2.0
//About: API Endpoint for Supply Chain.
//       - NEW: /refresh endpoint.
//===============================================================

import { addListing, listMarket, deleteListing, updateListing, refreshListing } from '../../backend/marketService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'

const headers = { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*' 
}

async function getUser(event) {
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

export async function handler(event) {
    const user = await getUser(event)
    if (!user) return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) }

    try {
        const id = event.path.split('/').pop()

        // 1. REFRESH: Re-scrape specific item
        if (event.path.endsWith('/refresh') && event.httpMethod === 'POST') {
            const realId = event.path.split('/')[event.path.split('/').length - 2]
            if (!realId) return { statusCode: 400, headers, body: JSON.stringify({ message: 'ID required' }) }
            
            const updated = await refreshListing(realId)
            return { statusCode: 200, headers, body: JSON.stringify(updated) }
        }

        // 2. GET: List all
        if (event.httpMethod === 'GET') {
            const data = await listMarket()
            return { statusCode: 200, headers, body: JSON.stringify(data) }
        }

        // 3. POST: Add new
        if (event.httpMethod === 'POST') {
            const { url } = JSON.parse(event.body)
            const item = await addListing(url, user.id)
            return { statusCode: 200, headers, body: JSON.stringify(item) }
        }

        // 4. PUT: Manual Edit
        if (event.httpMethod === 'PUT') {
            const updates = JSON.parse(event.body)
            await updateListing(id, updates)
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
        }

        // 5. DELETE
        if (event.httpMethod === 'DELETE') {
            await deleteListing(id)
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
        }

        return { statusCode: 405, headers, body: 'Method Not Allowed' }

    } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
    }
}
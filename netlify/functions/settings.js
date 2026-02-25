//===============================================================
//Script Name: Reload Tracker Settings Function
//Script Location: netlify/functions/settings.js
//Date: 12/09/2025
//Created By: T03KNEE
//Version: 1.0.0
//===============================================================

import { getSettings, saveSetting } from '../../backend/settingsService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'

const headers = { 'Content-Type': 'application/json' }

async function getUser(event) {
    const cookies = event.headers.cookie || ''
    const match = cookies.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))
    if (!match) return null
    return await getUserForSessionToken(decodeURIComponent(match[1]))
}

export async function handler(event) {
    // 1. Auth Check (Admins Only)
    const user = await getUser(event)
    if (!user || user.role !== 'admin') {
        return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) }
    }

    try {
        // GET: Fetch all settings
        if (event.httpMethod === 'GET') {
            const data = await getSettings()
            
            // Security: Mask the API Key when sending to frontend?
            // For the Admin Panel, we usually want to see it, or at least know it exists.
            // Let's send a flag for safety if it's there.
            const safeData = { ...data }
            if (safeData.ai_api_key) {
                safeData.hasAiKey = true
                // Uncomment next line to hide the actual key in the UI (User preference)
                // safeData.ai_api_key = '••••••••' 
            }
            
            return { statusCode: 200, headers, body: JSON.stringify(safeData) }
        }

        // POST: Save a setting
        if (event.httpMethod === 'POST') {
            if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing request body' }) }
            const { key, value } = JSON.parse(event.body)
            if (!key) return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing key' }) }
            
            await saveSetting(key, value)
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
        }
        
        return { statusCode: 405, body: 'Method Not Allowed' }

    } catch (e) {
        console.error("Settings Error:", e)
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
    }
}
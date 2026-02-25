//===============================================================
//Script Name: Reload Tracker System Function
//Script Location: netlify/functions/system.js
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.0.0
//===============================================================

import { executeRawSql } from '../../backend/systemService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'

const headers = { 'Content-Type': 'application/json' }

async function getUser(event) {
    const cookies = event.headers.cookie || ''
    const match = cookies.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))
    if (!match) return null
    return await getUserForSessionToken(decodeURIComponent(match[1]))
}

export async function handler(event) {
    const user = await getUser(event)
    if (!user || user.role !== 'admin') return { statusCode: 401, body: 'Unauthorized' }

    try {
        if (event.httpMethod === 'POST') {
            if (!event.body) return { statusCode: 400, headers, body: 'Missing request body' }
            const body = JSON.parse(event.body)
            
            // ACTION: RUN SQL
            if (body.action === 'sql') {
                const result = await executeRawSql(body.query, user)
                return { statusCode: 200, headers, body: JSON.stringify(result) }
            }
        }
        
        return { statusCode: 400, headers, body: 'Invalid Action' }

    } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
    }
}
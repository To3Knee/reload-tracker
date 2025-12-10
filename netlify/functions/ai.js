//===============================================================
//Script Name: Reload Tracker AI Function
//Script Location: netlify/functions/ai.js
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.1.0
//===============================================================

import { chatWithAi } from '../../backend/aiService.js'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'

const headers = { 'Content-Type': 'application/json' }

async function getUser(event) {
    const cookies = event.headers.cookie || ''
    const match = cookies.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))
    if (!match) return null
    return await getUserForSessionToken(decodeURIComponent(match[1]))
}

export async function handler(event) {
    // 1. Auth Check (Admins Only for now, or all users?)
    // Currently limiting AI to Admins to save costs/abuse
    const user = await getUser(event)
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' }
    }

    try {
        const { prompt, history } = JSON.parse(event.body)
        if (!prompt) return { statusCode: 400, body: JSON.stringify({ error: "Prompt required" }) }

        const response = await chatWithAi(prompt, history)
        return { statusCode: 200, headers, body: JSON.stringify({ response }) }

    } catch (e) {
        console.error("AI Function Error:", e)
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
    }
}
//===============================================================
//Script Name: ai.js
//Script Location: netlify/functions/ai.js
//Date: 11/30/2025
//Created By: T03KNEE
//Version: 1.2.0
//About: Backend handler for AI Chat. 
//       Updated: Tuned system prompt for conciseness (Mobile).
//===============================================================

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSettings } from '../../backend/settingsService.js' 
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'

const baseHeaders = { 'Content-Type': 'application/json' }

async function getCurrentUser(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || ''
  const cookies = {}
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.trim().split('=')
    if (k) cookies[k] = decodeURIComponent(v || '')
  })
  const token = cookies[SESSION_COOKIE_NAME]
  if (!token) return null
  return await getUserForSessionToken(token)
}

export async function handler(event) {
  // 1. Method Check
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: baseHeaders, body: 'Method Not Allowed' }
  }

  try {
    // 2. Auth Check (Must be logged in to use AI tokens)
    const user = await getCurrentUser(event)
    if (!user) {
      return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ message: 'Unauthorized' }) }
    }

    // 3. Feature Flag Check
    const settings = await getSettings()
    
    if (settings.ai_enabled !== 'true') {
      return { statusCode: 403, headers: baseHeaders, body: JSON.stringify({ message: 'AI Chat is currently disabled in Admin Settings.' }) }
    }

    // 4. Input Validation
    const body = JSON.parse(event.body || '{}')
    const history = body.history || []
    if (!Array.isArray(history) || history.length === 0) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ message: 'Invalid history format.' }) }
    }

    // 5. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY')
      return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ message: 'Server configuration error: Missing API Key.' }) }
    }

    const modelName = settings.ai_model || 'gemini-2.0-flash'
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: modelName })

    // 6. Format History
    const lastMsg = history[history.length - 1]
    const prompt = lastMsg.content

    const chatHistory = history.slice(0, -1)
      .filter(msg => msg.role !== 'system') 
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))

    // 7. Inject System Context (TUNED FOR MOBILE/CONCISENESS)
    const systemPrompt = `You are an expert Ballistics and Reloading Assistant. 
    1. Be extremely concise. Keep answers short and optimized for mobile screens.
    2. Do not provide bulleted lists of "things you can do" unless explicitly asked.
    3. Do not add generic safety disclaimers to every message. Only warn if a specific load exceeds SAAMI specs or looks dangerous.
    4. Speak directly to the user (no "Hello! I am ready...").`
    
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood. I will be concise, direct, and only warn when necessary." }] },
        ...chatHistory
      ]
    })

    // 8. Generate Response
    const result = await chat.sendMessage(prompt)
    const response = await result.response
    const reply = response.text()

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify({ reply })
    }

  } catch (err) {
    console.error('AI Service Error:', err)
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ message: 'AI Service Error: ' + err.message })
    }
  }
}
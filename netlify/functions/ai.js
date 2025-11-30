//===============================================================
//Script Name: AI Proxy Function (Gemini Edition)
//Script Location: netlify/functions/ai.js
//Date: 11/29/2025
//Created By: T03KNEE
//About: Securely calls Google Gemini for reloading advice.
//       Updated: Fetches Model Name from DB settings for future-proofing.
//===============================================================

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'
import { getSettings } from '../../backend/settingsService.js' // NEW IMPORT

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
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    // 1. Security Check: Admin Only
    const user = await getCurrentUser(event)
    if (!user || user.role !== 'admin') {
      return { statusCode: 403, headers: baseHeaders, body: JSON.stringify({ message: 'Admin access required.' }) }
    }

    // 2. Get Settings (for Model Name)
    const settings = await getSettings()
    // Default to 2.0-flash if DB is empty/missing key
    const modelName = settings.ai_model || 'gemini-2.0-flash' 

    // 3. Get History
    const { history } = JSON.parse(event.body)
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ 
        model: modelName, // DYNAMIC MODEL NAME
        systemInstruction: `
          You are a precision Ballistics Assistant.
          Rules:
          1. Be concise. No fluff.
          2. Answer technical questions directly.
          3. Format data in lists.
          4. Only warn about safety if providing specific load data.
          5. If asked about prices, explain that you cannot browse live markets.
        `
    })

    // 4. Prepare History
    let chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }))

    if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
        chatHistory.shift()
    }

    const chat = model.startChat({ history: chatHistory })

    // 5. Send Message
    const lastMessage = history[history.length - 1].text
    const result = await chat.sendMessage(lastMessage)
    const response = await result.response
    const text = response.text()

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify({ answer: text })
    }

  } catch (err) {
    console.error("AI Error:", err)
    
    let msg = err.message
    if (msg.includes('404') && msg.includes('models/')) {
       msg = `Model '${settings?.ai_model}' not found. Update the Model Name in Admin Settings.`
    }

    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ message: "AI Error: " + msg }) }
  }
}
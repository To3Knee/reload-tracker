//===============================================================
//Script Name: ai.js
//Script Location: netlify/functions/ai.js
//Date: 11/30/2025
//Created By: T03KNEE
//About: Connects to Google Gemini with Full Chat History context.
//===============================================================

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js'
import { getSetting } from '../../backend/settingsService.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' }

  try {
    // 1. Check Auth (Admins Only)
    const cookies = event.headers.cookie || ''
    const token = cookies.split(';').find(c => c.trim().startsWith(SESSION_COOKIE_NAME + '='))?.split('=')[1]
    if (!token) return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) }
    
    const user = await getUserForSessionToken(token)
    if (!user || user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ message: 'Admins only' }) }

    // 2. Get Settings
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ message: 'Server missing API Key' }) }
    
    const modelName = await getSetting('ai_model') || 'gemini-2.0-flash'
    const enabled = await getSetting('ai_enabled')

    if (enabled !== 'true') {
        return { statusCode: 400, headers, body: JSON.stringify({ message: 'AI is currently disabled in settings.' }) }
    }

    // 3. Prepare the Chat
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: modelName })

    const body = JSON.parse(event.body)
    const incomingHistory = body.history || []

    // 4. Construct the Chat History for Gemini
    // We filter out system messages from the frontend and replace them with our server-side instruction
    const chatHistory = incomingHistory
      .filter(msg => msg.role !== 'system') // Remove UI system messages
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

    // Start the chat with the history
    const chat = model.startChat({
      history: chatHistory.slice(0, -1), // All messages except the last one
      generationConfig: {
        maxOutputTokens: 500,
      },
    })

    // 5. Send the System Prompt + Latest Message
    const lastMessage = chatHistory[chatHistory.length - 1].parts[0].text
    
    const systemInstruction = `
      SYSTEM CONTEXT:
      You are the expert ballistics assistant for "Reload Tracker".
      Your tone is helpful, precise, and safety-conscious but friendly.
      
      CAPABILITIES:
      - Explain concepts like Standard Deviation (SD) vs Extreme Spread (ES).
      - Estimate costs based on component prices provided by the user.
      - Analyze group sizes (MOA).
      
      SAFETY RULES:
      - NEVER provide specific load data (powder charges) for unverified wildcat cartridges.
      - ALWAYS advise consulting official manuals (Hornady, Lyman, Hodgdon).
      
      USER QUESTION:
      ${lastMessage}
    `

    const result = await chat.sendMessage(systemInstruction)
    const response = await result.response
    const text = response.text()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: text })
    }

  } catch (err) {
    console.error('AI Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'AI Service Error: ' + err.message })
    }
  }
}
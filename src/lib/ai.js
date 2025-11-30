//===============================================================
//Script Name: ai.js
//Script Location: src/lib/ai.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 2.0.0
//About: Client-side helper for the AI Proxy.
//       Updated: Sends full conversation history for context.
//===============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function askBallisticsExpert(history) {
  const res = await fetch(`${API_BASE_URL}/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history }), // Sending the whole chat log
    credentials: 'include'
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'AI request failed')
  return data.answer
}
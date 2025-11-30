//===============================================================
//Script Name: ai.js
//Script Location: src/lib/ai.js
//Date: 11/30/2025
//Created By: T03KNEE
//About: Client-side helper to talk to the AI Netlify Function.
//===============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function sendAiMessage(history) {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Sends auth cookies
    body: JSON.stringify({ history })
  }

  const res = await fetch(`${API_BASE_URL}/ai`, options)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || 'AI Request failed')
  }

  return data.reply
}
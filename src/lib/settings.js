//===============================================================
//Script Name: settings.js
//Script Location: src/lib/settings.js
//Date: 11/29/2025
//Created By: T03KNEE
//About: Client-side fetchers for system settings.
//===============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function fetchSettings() {
  const res = await fetch(`${API_BASE_URL}/settings`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load settings')
  return await res.json()
}

export async function saveSetting(key, value) {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Failed to save setting')
  return await res.json()
}
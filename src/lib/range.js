//===============================================================
//Script Name: range.js
//Script Location: src/lib/range.js
//Date: 12/01/2025
//Created By: T03KNEE
//Version: 2.0.0
//About: Client-side API for Range Logs.
//===============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function getRangeLogs(signal) {
  const opts = { credentials: 'include' }
  if (signal) opts.signal = signal
  const res = await fetch(`${API_BASE_URL}/range`, opts)
  if (!res.ok) throw new Error('Failed to load logs')
  const data = await res.json()
  return data.logs || []
}

export async function createRangeLog(log) {
  const res = await fetch(`${API_BASE_URL}/range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(log)
  })
  if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to create log')
  }
  return await res.json()
}

export async function updateRangeLog(id, log) {
  const res = await fetch(`${API_BASE_URL}/range/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(log)
  })
  if (!res.ok) throw new Error('Failed to update log')
  return await res.json()
}

export async function deleteRangeLog(id) {
  const res = await fetch(`${API_BASE_URL}/range/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Failed to delete log')
  return await res.json()
}
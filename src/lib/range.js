//===============================================================
//Script Name: range.js
//Script Location: src/lib/range.js
//Date: 11/29/2025
//Created By: T03KNEE
//About: Client-side helper for Range API.
//===============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function rangeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${API_BASE_URL}${endpoint}`, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export async function getRangeLogs() {
  const data = await rangeRequest('/range', 'GET')
  return data.logs || []
}

export async function createRangeLog(payload) {
  return await rangeRequest('/range', 'POST', payload)
}

export async function updateRangeLog(id, payload) {
  return await rangeRequest(`/range/${id}`, 'PUT', payload)
}

export async function deleteRangeLog(id) {
  return await rangeRequest(`/range/${id}`, 'DELETE')
}
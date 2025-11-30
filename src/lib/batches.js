//===============================================================
//Script Name: batches.js
//Script Location: src/lib/batches.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.2.0
//About: Client-side helper for Batches API.
//       Standardized to match Range/Cloudinary implementation.
//===============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function batchRequest(endpoint, method = 'GET', body = null) {
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

export async function getBatches() {
  const data = await batchRequest('/batches', 'GET')
  return data.batches || []
}

export async function createBatch(payload) {
  return await batchRequest('/batches', 'POST', payload)
}

export async function updateBatch(id, payload) {
  return await batchRequest(`/batches/${id}`, 'PUT', payload)
}

export async function deleteBatch(id) {
  return await batchRequest(`/batches/${id}`, 'DELETE')
}
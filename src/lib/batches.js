//===============================================================
//Script Name: batches.js
//Script Location: src/lib/batches.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.1.1
//About: Client-side helper for the Batches API.
//       Updated: Added updateBatch function.
//===============================================================

const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  '/api'

async function batchRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', 
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, options)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || 'Batch request failed.')
  }

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
//===============================================================
//Script Name: market.js
//Script Location: src/lib/market.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Client-side API for Market Watch.
//===============================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function getMarketListings() {
  const res = await fetch(`${API_BASE}/market`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load market')
  return await res.json()
}

export async function createMarketListing(item) {
  const res = await fetch(`${API_BASE}/market`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(item)
  })
  if (!res.ok) throw new Error('Failed to create listing')
  return await res.json()
}

export async function updateMarketListing(id, updates) {
  const res = await fetch(`${API_BASE}/market/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates)
  })
  if (!res.ok) throw new Error('Failed to update')
  return await res.json()
}

export async function deleteMarketListing(id) {
  const res = await fetch(`${API_BASE}/market/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Failed to delete')
  return true
}

export async function refreshMarketListing(id) {
  const res = await fetch(`${API_BASE}/market/${id}/refresh`, {
    method: 'POST',
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Failed to refresh')
  return await res.json()
}
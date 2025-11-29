//===============================================================
//Script Name: analytics.js
//Script Location: src/lib/analytics.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.1.0
//About: Client-side fetchers for analytics data.
//===============================================================

const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  '/api'

async function fetchJson(endpoint) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch analytics')
  const json = await res.json()
  return json.data
}

export async function getMonthlySpendData() {
  return await fetchJson('/analytics/spend')
}

export async function getPriceTrendData() {
  return await fetchJson('/analytics/trends')
}

// NEW EXPORTS
export async function getInventoryDistributionData() {
  return await fetchJson('/analytics/distribution')
}

export async function getLoadVelocityData() {
  return await fetchJson('/analytics/velocity')
}

export async function getBatchCostHistoryData() {
  return await fetchJson('/analytics/history')
}
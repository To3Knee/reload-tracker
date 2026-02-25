//===============================================================
//Script Name: analytics.js
//Script Location: src/lib/analytics.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 1.2.0
//About: Client-side API for Analytics.
//       - FIX: Restored exports for Volume and Forecast.
//===============================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(endpoint, signal) {
    const opts = { credentials: 'include' }
    if (signal) opts.signal = signal
    const res = await fetch(`${API_BASE}${endpoint}`, opts)
    if (!res.ok) throw new Error('Failed to fetch analytics data')
    const json = await res.json()
    return json.data
}

export async function getMonthlySpendData(signal)          { return request('/analytics/spend',        signal) }
export async function getPriceTrendData(signal)             { return request('/analytics/trends',       signal) }
export async function getInventoryDistributionData(signal)  { return request('/analytics/distribution', signal) }
export async function getLoadVelocityData(signal)           { return request('/analytics/velocity',     signal) }
export async function getBatchCostHistoryData(signal)       { return request('/analytics/history',      signal) }
export async function getVolumeByCaliberData(signal)        { return request('/analytics/volume',       signal) }
export async function getSupplyForecastData(signal)         { return request('/analytics/forecast',     signal) }
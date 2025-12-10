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

async function request(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch analytics data')
    const json = await res.json()
    return json.data
}

export async function getMonthlySpendData() {
    return request('/analytics/spend')
}

export async function getPriceTrendData() {
    return request('/analytics/trends')
}

export async function getInventoryDistributionData() {
    return request('/analytics/distribution')
}

export async function getLoadVelocityData() {
    return request('/analytics/velocity')
}

export async function getBatchCostHistoryData() {
    return request('/analytics/history')
}

export async function getVolumeByCaliberData() {
    return request('/analytics/volume')
}

export async function getSupplyForecastData() {
    return request('/analytics/forecast')
}
//===============================================================
//Script Name: market.js
//Script Location: src/lib/market.js
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Client-side API for Supply Chain data.
//===============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(endpoint, method = 'GET', body = null) {
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

export async function getMarketListings() {
  return await request('/market', 'GET')
}
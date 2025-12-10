//===============================================================
//Script Name: settings.js
//Script Location: src/lib/settings.js
//Date: 12/09/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Client-side API for System Config.
//===============================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Important for Admin Auth Cookie
    }
    if (body) options.body = JSON.stringify(body)
    
    const res = await fetch(`${API_BASE}${endpoint}`, options)
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed: ${res.status}`)
    }
    return res.json()
}

export async function fetchSettings() {
    return request('/settings')
}

export async function saveSetting(key, value) {
    return request('/settings', 'POST', { key, value })
}
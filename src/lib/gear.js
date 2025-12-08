//===============================================================
//Script Name: gear.js
//Script Location: src/lib/gear.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Client-side API for Gear Locker.
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

export async function getGear() {
  return await request('/gear', 'GET')
}

export async function saveGear(gear) {
  const method = gear.id ? 'PUT' : 'POST'
  const url = gear.id ? `/gear/${gear.id}` : '/gear'
  return await request(url, method, gear)
}

export async function deleteGear(id) {
  return await request(`/gear/${id}`, 'DELETE')
}
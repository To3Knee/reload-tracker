
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function getFirearms(signal) {
  const opts = { credentials: 'include' }
  if (signal) opts.signal = signal
  const res = await fetch(`${API_BASE_URL}/firearms`, opts)
  if (!res.ok) throw new Error('Failed to load armory')
  return await res.json()
}

export async function saveFirearm(firearm) {
  const method = firearm.id ? 'PUT' : 'POST'
  const url = firearm.id ? `${API_BASE_URL}/firearms/${firearm.id}` : `${API_BASE_URL}/firearms`
  
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(firearm)
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Failed to save firearm')
  }
  
  return await res.json()
}

export async function deleteFirearm(id) {
  const res = await fetch(`${API_BASE_URL}/firearms/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Failed to remove firearm')
  return await res.json()
}
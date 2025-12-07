//===============================================================
//Script Name: Reload Tracker Frontend DB Client
//Script Location: src/lib/db.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 0.3.1
//About: Frontend data access layer.
//       Updated: Removed Simulation Logic.
//===============================================================

const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  '/api'

async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const finalOptions = {
    method: 'GET',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include' 
  }

  let res
  try { res = await fetch(url, finalOptions) } catch (err) { throw new Error('Network error talking to API.') }

  let data = null
  const contentType = res.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    try { data = await res.json() } catch (err) { throw new Error('Invalid JSON response.') }
  }

  if (!res.ok) throw new Error(data && data.message ? data.message : `API error (${res.status})`)
  return data
}

export function calculatePerUnit(price = 0, shipping = 0, tax = 0, qty = 0) {
  const total = (Number(price) || 0) + (Number(shipping) || 0) + (Number(tax) || 0)
  const amount = Number(qty) || 0
  return amount > 0 ? total / amount : 0
}

export function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(Number(value))
}

export async function getAllPurchases() {
  const data = await apiRequest('/purchases')
  return Array.isArray(data) ? data : []
}

export async function addPurchase(purchase) {
  const method = purchase.id ? 'PUT' : 'POST'
  const path = purchase.id ? `/purchases/${purchase.id}` : '/purchases'
  await apiRequest(path, { method, body: JSON.stringify(purchase) })
}

export async function deletePurchase(id) {
  if (id) await apiRequest(`/purchases/${id}`, { method: 'DELETE' })
}

export async function getAllRecipes() {
  const data = await apiRequest('/recipes')
  return Array.isArray(data) ? data : []
}

export async function saveRecipe(recipe) {
  const method = recipe.id ? 'PUT' : 'POST'
  const path = recipe.id ? `/recipes/${recipe.id}` : '/recipes'
  await apiRequest(path, { method, body: JSON.stringify(recipe) })
}

export async function deleteRecipe(id) {
  if (id) await apiRequest(`/recipes/${id}`, { method: 'DELETE' })
}

export async function getSetting(key) {
  try { return JSON.parse(window.localStorage.getItem(`rt_setting_${key}`)) } catch { return null }
}
export async function setSetting(key, value) {
  try { window.localStorage.setItem(`rt_setting_${key}`, JSON.stringify(value)) } catch {}
}

const DEMO_PURCHASES = [
  { componentType: 'powder', brand: 'Hodgdon', name: 'Titegroup', caliber: '9mm', qty: 1, unit: 'lb', price: 29.99, shipping: 12, tax: 3, vendor: 'Powder Valley', notes: 'Demo Data', status: 'active' },
  { componentType: 'bullet', brand: 'Berrys', name: '115gr RN', caliber: '9mm', qty: 1000, unit: 'ea', price: 98.99, shipping: 10, tax: 8, vendor: 'Demo Shop', notes: 'Demo Data', status: 'active' },
  { componentType: 'primer', brand: 'CCI', name: 'Small Pistol', caliber: '9mm', qty: 1000, unit: 'ea', price: 80.00, shipping: 0, tax: 5, vendor: 'Local', notes: 'Demo Data', status: 'active' },
  { componentType: 'case', brand: 'Mixed', name: 'Range Brass', caliber: '9mm', qty: 2000, unit: 'ea', price: 0, shipping: 0, tax: 0, vendor: 'Floor', notes: 'Demo Data', status: 'active' },
]

const DEMO_RECIPES = [
  { name: '9mm - Demo Load', caliber: '9mm', profileType: 'range', chargeGrains: 4.1, brassReuse: 10, lotSize: 100, bulletWeightGr: 115, muzzleVelocityFps: 1100, zeroDistanceYards: 15, groupSizeInches: 1.5, notes: 'Auto-generated demo recipe.' }
]

export async function seedData() {
  try {
    const [purchases, recipes] = await Promise.all([getAllPurchases(), getAllRecipes()])
    if (purchases.length === 0) {
      console.log('Seeding Inventory...')
      for (const p of DEMO_PURCHASES) await addPurchase(p)
    }
    if (recipes.length === 0) {
       console.log('Seeding Recipes...')
       for (const r of DEMO_RECIPES) await saveRecipe(r)
    }
  } catch (err) {
    console.error('[Reload Tracker] seedData failed:', err)
  }
}
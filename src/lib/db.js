//===============================================================
//Script Name: Reload Tracker Frontend DB Client
//Script Location: src/lib/db.js
//Date: 11/26/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 0.2.0
//About: Frontend data access layer for Reload Tracker. This module
//       replaces the old IndexedDB logic with a REST API client
//       that talks to the Netlify Functions + Postgres backend.
//       The public function signatures (getAllPurchases, addPurchase,
//       getAllRecipes, saveRecipe, etc.) are preserved so that the
//       existing UI components continue to work without layout or
//       behavior changes.
//===============================================================

// NOTE ABOUT ARCHITECTURE
// ------------------------
// - All reads and writes now go through HTTP calls to the backend.
// - API_BASE_URL defaults to '/api', which Netlify redirects to the
//   appropriate Netlify Function (e.g. /.netlify/functions/purchases).
//   In local dev and production, ensure VITE_API_BASE_URL is set
//   consistently (Netlify environment + .env for netlify dev).
// - The backend is the single source of truth; there is no more
//   IndexedDB storage for purchases/recipes.
//
// Critical safety invariant: cost-per-round and inventory math rely
// on precise numeric handling. This file keeps the original helpers
// (calculatePerUnit, formatCurrency) exactly as they existed in the
// IndexedDB implementation.

const API_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  '/api'

// ---------------------------------------------------------------------------
// Low-level HTTP helper
// ---------------------------------------------------------------------------

/**
 * Thin wrapper around fetch that applies the API base URL, JSON
 * headers, and consistent error handling. All API calls go through
 * here so behavior is centralized.
 *
 * @param {string} path - e.g. '/purchases', '/recipes/123'
 * @param {RequestInit} [options]
 * @returns {Promise<any>} Parsed JSON response body.
 */
async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  const finalOptions = {
    method: 'GET',
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  }

  let res
  try {
    res = await fetch(url, finalOptions)
  } catch (err) {
    console.error('[Reload Tracker API] Network error for', url, err)
    throw new Error('Network error talking to Reload Tracker API.')
  }

  let data = null
  const contentType = res.headers.get('Content-Type') || ''

  if (contentType.includes('application/json')) {
    try {
      data = await res.json()
    } catch (err) {
      console.error('[Reload Tracker API] Failed to parse JSON from', url, err)
      throw new Error('Invalid JSON response from Reload Tracker API.')
    }
  } else {
    // Some endpoints might return no body; treat as null.
    data = null
  }

  if (!res.ok) {
    const message =
      data && data.message
        ? data.message
        : `API error (${res.status}) calling ${url}`
    console.error('[Reload Tracker API] Error response', res.status, data)
    throw new Error(message)
  }

  return data
}

// ---------------------------------------------------------------------------
// Shared helpers (unchanged from original IndexedDB version)
// ---------------------------------------------------------------------------

/**
 * Calculate the effective per-unit cost of a component, including
 * price, shipping, and tax.
 *
 * @param {number} price
 * @param {number} shipping
 * @param {number} tax
 * @param {number} qty
 * @returns {number}
 */
export function calculatePerUnit(price = 0, shipping = 0, tax = 0, qty = 0) {
  const total =
    (Number(price) || 0) + (Number(shipping) || 0) + (Number(tax) || 0)
  const amount = Number(qty) || 0
  if (!amount || amount <= 0) return 0
  return total / amount
}

/**
 * Format a numeric value as USD currency, up to 4 decimal places.
 *
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '$0.00'
  const num = Number(value) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(num)
}

// ---------------------------------------------------------------------------
// Purchases (LOTs)
// ---------------------------------------------------------------------------

/**
 * Normalize a purchase object returned by the API. The backend already
 * returns camelCase fields, but this ensures numeric types are sane.
 *
 * @param {any} p
 * @returns {any}
 */
function normalizePurchase(p) {
  if (!p) return p
  return {
    ...p,
    qty: p.qty != null ? Number(p.qty) : 0,
    price: p.price != null ? Number(p.price) : 0,
    shipping: p.shipping != null ? Number(p.shipping) : 0,
    tax: p.tax != null ? Number(p.tax) : 0,
  }
}

/**
 * Fetch all purchases / LOTs from the backend.
 *
 * @returns {Promise<Array<any>>}
 */
export async function getAllPurchases() {
  const data = await apiRequest('/purchases', {
    method: 'GET',
  })

  if (!Array.isArray(data)) {
    console.warn(
      '[Reload Tracker API] Expected array from GET /purchases, got',
      data
    )
    return []
  }

  return data.map(normalizePurchase)
}

/**
 * Create or update a purchase / LOT.
 *
 * The UI passes a payload shaped like the old IndexedDB records:
 * {
 *   id?: number,
 *   lotId?: string,
 *   componentType: 'powder' | 'bullet' | 'primer' | 'case' | 'other',
 *   caseCondition?: string,
 *   caliber?: string,
 *   brand?: string,
 *   name?: string,
 *   typeDetail?: string,
 *   qty: number,
 *   unit: string,
 *   price: number,
 *   shipping: number,
 *   tax: number,
 *   vendor?: string,
 *   date?: string,
 *   url?: string,
 *   imageUrl?: string,
 *   status?: string,
 *   notes?: string
 * }
 *
 * The backend functions are responsible for generating lotId (if missing)
 * and mapping camelCase keys into SQL column names.
 *
 * @param {any} purchase
 */
export async function addPurchase(purchase) {
  const payload = {
    ...purchase,
  }

  // POST creates a new purchase; PUT updates if an id is present.
  if (payload.id) {
    await apiRequest(`/purchases/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  } else {
    await apiRequest('/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

/**
 * Delete a purchase / LOT by id.
 *
 * @param {number} id
 */
export async function deletePurchase(id) {
  if (id == null) return
  await apiRequest(`/purchases/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Clear ALL purchases. Currently unused by the UI but kept for parity
 * with the original API surface.
 */
export async function clearAllPurchases() {
  await apiRequest('/purchases', {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------------------
// Recipes (round configurations + ballistics metadata)
// ---------------------------------------------------------------------------

/**
 * Normalize a recipe object returned by the API.
 *
 * @param {any} r
 * @returns {any}
 */
function normalizeRecipe(r) {
  if (!r) return r
  return {
    ...r,
    chargeGrains:
      r.chargeGrains != null ? Number(r.chargeGrains) : r.chargeGrains,
    brassReuse: r.brassReuse != null ? Number(r.brassReuse) : r.brassReuse,
    lotSize: r.lotSize != null ? Number(r.lotSize) : r.lotSize,
    bulletWeightGr:
      r.bulletWeightGr != null ? Number(r.bulletWeightGr) : r.bulletWeightGr,
    muzzleVelocityFps:
      r.muzzleVelocityFps != null
        ? Number(r.muzzleVelocityFps)
        : r.muzzleVelocityFps,
    powerFactor:
      r.powerFactor != null ? Number(r.powerFactor) : r.powerFactor,
    zeroDistanceYards:
      r.zeroDistanceYards != null
        ? Number(r.zeroDistanceYards)
        : r.zeroDistanceYards,
    groupSizeInches:
      r.groupSizeInches != null
        ? Number(r.groupSizeInches)
        : r.groupSizeInches,
  }
}

/**
 * Fetch all recipes from the backend.
 *
 * @returns {Promise<Array<any>>}
 */
export async function getAllRecipes() {
  const data = await apiRequest('/recipes', {
    method: 'GET',
  })

  if (!Array.isArray(data)) {
    console.warn(
      '[Reload Tracker API] Expected array from GET /recipes, got',
      data
    )
    return []
  }

  const normalized = data.map(normalizeRecipe)

  // Preserve original sort: by caliber then name
  return normalized.sort((a, b) => {
    const aCal = a.caliber || ''
    const bCal = b.caliber || ''
    if (aCal && bCal && aCal !== bCal) {
      return aCal.localeCompare(bCal)
    }
    return (a.name || '').localeCompare(b.name || '')
  })
}

/**
 * Create or update a recipe.
 *
 * The UI passes a payload shaped like the original IndexedDB records:
 * {
 *   id?: number,
 *   name: string,
 *   caliber: string,
 *   profileType: string,
 *   chargeGrains: number,
 *   brassReuse: number,
 *   lotSize: number,
 *   notes?: string,
 *   bulletWeightGr?: number,
 *   muzzleVelocityFps?: number,
 *   powerFactor?: number,
 *   zeroDistanceYards?: number,
 *   groupSizeInches?: number,
 *   rangeNotes?: string
 * }
 *
 * The backend is responsible for upserting and computing powerFactor
 * if it prefers to do so server-side. The frontend also computes PF
 * for display, but server-calculated PF is authoritative.
 *
 * @param {any} recipe
 * @returns {Promise<void>}
 */
export async function saveRecipe(recipe) {
  const payload = {
    ...recipe,
  }

  if (payload.id) {
    await apiRequest(`/recipes/${payload.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  } else {
    await apiRequest('/recipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

/**
 * Add a recipe (alias of saveRecipe, kept for backward compatibility).
 */
export async function addRecipe(recipe) {
  await saveRecipe(recipe)
}

/**
 * Delete a recipe by id.
 *
 * @param {number} id
 */
export async function deleteRecipe(id) {
  if (id == null) return
  await apiRequest(`/recipes/${id}`, {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------------------
// Settings + Seed data
// ---------------------------------------------------------------------------

// The original IndexedDB implementation had a 'settings' store with
// getSetting/setSetting helpers plus a seedData() function that
// populated demo purchases + recipes for first-time users.
//
// In the Postgres-backed version, settings are a future extension
// (likely backed by the 'configs' table). For now we keep these
// helpers as no-ops / simple localStorage wrappers so the rest of
// the UI doesn't break, and we implement seedData() in terms of
// the new API helpers.

/**
 * Get a UI setting. Currently backed by localStorage only, since we
 * haven't fully wired the configs table yet.
 *
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getSetting(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`rt_setting_${key}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Set a UI setting in localStorage.
 *
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`rt_setting_${key}`, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// ---- Seed Data ------------------------------------------------------------

// Minimal demo data so a fresh database isn't empty. This mirrors the
// spirit (not necessarily the exact rows) of the old IndexedDB seeding.

const DEMO_PURCHASES = [
  // 9mm powder
  {
    componentType: 'powder',
    brand: 'Hodgdon',
    name: 'Titegroup',
    caliber: '9mm',
    qty: 1,
    unit: 'lb',
    price: 29.99,
    shipping: 12,
    tax: 3,
    vendor: 'Powder Valley',
    notes: 'Baseline 9mm powder. Great for range loads.',
  },
  // 9mm bullets
  {
    componentType: 'bullet',
    brand: 'Berry’s',
    name: '115gr RN Plated',
    caliber: '9mm',
    qty: 1000,
    unit: 'ea',
    price: 109.99,
    shipping: 10,
    tax: 8.5,
    vendor: 'Online Vendor',
    notes: 'Bulk 9mm range bullets.',
  },
  // 9mm primers
  {
    componentType: 'primer',
    brand: 'CCI',
    name: '#500 Small Pistol',
    caliber: '9mm',
    qty: 1000,
    unit: 'ea',
    price: 79.99,
    shipping: 15,
    tax: 7.25,
    vendor: 'Online Vendor',
    notes: 'Standard small pistol primers.',
  },
  // 9mm brass
  {
    componentType: 'case',
    caseCondition: 'field',
    brand: 'Mixed',
    name: 'Range pickup brass',
    caliber: '9mm',
    qty: 800,
    unit: 'ea',
    price: 0,
    shipping: 0,
    tax: 0,
    vendor: 'Local Range',
    notes: 'Tumbled range brass, mixed headstamp.',
  },
]

const DEMO_RECIPES = [
  {
    name: '9mm – Range',
    caliber: '9mm',
    profileType: 'range',
    chargeGrains: 3.8,
    brassReuse: 5,
    lotSize: 100,
    notes: 'Soft-shooting general range load.',
    bulletWeightGr: 115,
    muzzleVelocityFps: 1100,
    zeroDistanceYards: 15,
    groupSizeInches: 1.5,
    rangeNotes: 'Runs clean, cycles everything.',
  },
  {
    name: '9mm – Subsonic',
    caliber: '9mm',
    profileType: 'subsonic',
    chargeGrains: 3.1,
    brassReuse: 5,
    lotSize: 100,
    notes: 'Subsonic suppressed load.',
    bulletWeightGr: 147,
    muzzleVelocityFps: 950,
    zeroDistanceYards: 25,
    groupSizeInches: 1.75,
    rangeNotes: 'Very quiet, minor soot on brass.',
  },
]

/**
 * Seed the database with minimal demo data if both purchases and
 * recipes tables are empty. This is called once on app load by App.jsx.
 *
 * It is intentionally idempotent: if there is *any* data present, it
 * does nothing.
 */
export async function seedData() {
  try {
    const [purchases, recipes] = await Promise.all([
      getAllPurchases(),
      getAllRecipes(),
    ])

    if (purchases.length > 0 || recipes.length > 0) {
      // Existing data present — do NOT overwrite.
      return
    }

    // Insert demo purchases
    for (const p of DEMO_PURCHASES) {
      await addPurchase(p)
    }

    // Insert demo recipes
    for (const r of DEMO_RECIPES) {
      await saveRecipe(r)
    }
  } catch (err) {
    console.error('[Reload Tracker] seedData failed:', err)
    // Fail silently from the caller's perspective; this should never
    // prevent the app from loading.
  }
}

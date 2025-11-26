// src/lib/db.js
import { openDB } from 'idb'

const DB_NAME = 'reload-tracker'
const DB_VERSION = 9

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('purchases')) {
      db.createObjectStore('purchases', {
        keyPath: 'id',
        autoIncrement: true,
      })
    }

    if (!db.objectStoreNames.contains('inventory')) {
      db.createObjectStore('inventory', {
        keyPath: 'id',
        autoIncrement: true,
      })
    }

    if (!db.objectStoreNames.contains('recipes')) {
      db.createObjectStore('recipes', {
        keyPath: 'id',
        autoIncrement: true,
      })
    }

    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', {
        keyPath: 'key',
      })
    }
  },
})

// ---------------------------------------------------------------------------
// Currency + per-unit helpers
// ---------------------------------------------------------------------------

export function calculatePerUnit(price = 0, shipping = 0, tax = 0, qty = 0) {
  const total = (Number(price) || 0) + (Number(shipping) || 0) + (Number(tax) || 0)
  const amount = Number(qty) || 0
  if (!amount || amount <= 0) return 0
  return total / amount
}

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
// Purchases / LOTs
// ---------------------------------------------------------------------------

export async function getAllPurchases() {
  const db = await dbPromise
  const all = await db.getAll('purchases')

  return all.sort((a, b) => {
    const aDate = a.date || a.createdAt || ''
    const bDate = b.date || b.createdAt || ''
    if (aDate && bDate && aDate !== bDate) {
      return aDate.localeCompare(bDate)
    }
    return (a.id || 0) - (b.id || 0)
  })
}

function generateLotId(componentType, existing = []) {
  const prefix =
    {
      powder: 'POW',
      bullet: 'BLT',
      primer: 'PRI',
      case: 'CAS',
      other: 'LOT',
    }[componentType] || 'LOT'

  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  let base = `${prefix}-${rand}`

  // Ensure uniqueness vs existing purchases.
  const existingIds = new Set(existing.map(p => p.lotId))
  while (existingIds.has(base)) {
    const r = Math.random().toString(36).substring(2, 7).toUpperCase()
    base = `${prefix}-${r}`
  }

  return base
}

export async function addPurchase(purchase) {
  const db = await dbPromise
  const nowIso = new Date().toISOString()

  const existing = await db.getAll('purchases')

  const record = {
    ...purchase,
    status: purchase.status || 'active', // active | depleted
    createdAt: purchase.createdAt || nowIso,
    updatedAt: nowIso,
  }

  if (!record.lotId) {
    record.lotId = generateLotId(record.componentType, existing)
  }

  const id = await db.put('purchases', record)
  return { ...record, id }
}

export async function deletePurchase(id) {
  const db = await dbPromise
  await db.delete('purchases', id)
}

export async function clearAllPurchases() {
  const db = await dbPromise
  await db.clear('purchases')
}

// ---------------------------------------------------------------------------
// Recipes (round configurations + ballistics metadata)
// ---------------------------------------------------------------------------

export async function getAllRecipes() {
  const db = await dbPromise
  const all = await db.getAll('recipes')

  return all.sort((a, b) => {
    const aCal = a.caliber || ''
    const bCal = b.caliber || ''
    if (aCal && bCal && aCal !== bCal) {
      return aCal.localeCompare(bCal)
    }
    return (a.name || '').localeCompare(b.name || '')
  })
}

/**
 * Create or update a recipe / round configuration
 * with optional ballistics / range data.
 */
export async function saveRecipe(recipe) {
  const db = await dbPromise
  const nowIso = new Date().toISOString()

  const brassReuse = Math.max(Number(recipe.brassReuse) || 1, 1)
  const lotSize = Math.max(Number(recipe.lotSize) || 0, 0)
  const bulletWeightGr = Number(recipe.bulletWeightGr) || 0
  const muzzleVelocityFps = Number(recipe.muzzleVelocityFps) || 0

  // Compute power factor if we have both values
  let powerFactor = Number(recipe.powerFactor) || 0
  if (bulletWeightGr > 0 && muzzleVelocityFps > 0) {
    powerFactor = (bulletWeightGr * muzzleVelocityFps) / 1000
  }

  const record = {
    id: recipe.id,
    name: (recipe.name || '').trim(),
    caliber: (recipe.caliber || '').trim(),
    profileType: recipe.profileType || 'range',

    // core load data
    chargeGrains: Number(recipe.chargeGrains) || 0,
    brassReuse,
    lotSize,

    notes: recipe.notes?.trim?.() || '',

    // ballistics / range data
    bulletWeightGr,
    muzzleVelocityFps,
    powerFactor,
    zeroDistanceYards: Math.max(
      Number(recipe.zeroDistanceYards) || 0,
      0
    ),
    groupSizeInches: Math.max(
      Number(recipe.groupSizeInches) || 0,
      0
    ),
    rangeNotes: recipe.rangeNotes?.trim?.() || '',

    createdAt: recipe.createdAt || nowIso,
    updatedAt: nowIso,
  }

  const id = await db.put('recipes', record)
  return { ...record, id }
}

/**
 * Backwards-compatible alias for creating a new recipe.
 */
export async function addRecipe(recipe) {
  return saveRecipe(recipe)
}

export async function deleteRecipe(id) {
  const db = await dbPromise
  await db.delete('recipes', id)
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSetting(key) {
  const db = await dbPromise
  const row = await db.get('settings', key)
  return row ? row.value : null
}

export async function setSetting(key, value) {
  const db = await dbPromise
  await db.put('settings', { key, value })
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

export async function seedRecipes() {
  const db = await dbPromise
  const existing = await db.getAll('recipes')
  if (existing && existing.length > 0) {
    return
  }

  const defaults = [
    {
      name: '9mm – Range',
      caliber: '9mm',
      profileType: 'range',
      chargeGrains: 3.8,
      brassReuse: 5,
      lotSize: 200,
      notes: 'General plinking / range load.',
    },
    {
      name: '9mm – Subsonic',
      caliber: '9mm Subsonic',
      profileType: 'subsonic',
      chargeGrains: 3.4,
      brassReuse: 5,
      lotSize: 200,
      notes: 'Subsonic 147gr focus, suppressor-friendly.',
    },
    {
      name: '.308 – Range',
      caliber: '.308',
      profileType: 'range',
      chargeGrains: 42,
      brassReuse: 8,
      lotSize: 100,
      notes: 'Baseline .308 range recipe.',
    },
    {
      name: '6.5 Creedmoor – Match',
      caliber: '6.5 Creedmoor',
      profileType: 'competition',
      chargeGrains: 41.5,
      brassReuse: 8,
      lotSize: 100,
      notes: 'Match / competition focus.',
    },
    {
      name: '45 ACP – Range',
      caliber: '45 ACP',
      profileType: 'range',
      chargeGrains: 5.4,
      brassReuse: 5,
      lotSize: 200,
      notes: 'Standard 230gr ball equivalent.',
    },
  ]

  for (const r of defaults) {
    await saveRecipe(r)
  }
}

// Completely initialize DB with some demo purchases and recipes.
export async function seedData() {
  const db = await dbPromise

  const [pCount, rCount] = await Promise.all([
    db.count('purchases'),
    db.count('recipes'),
  ])

  if (pCount === 0) {
    const now = new Date().toISOString().slice(0, 10)

    // Powders
    await addPurchase({
      componentType: 'powder',
      brand: 'Hodgdon',
      name: 'Titegroup',
      caliber: '9mm',
      qty: 1,
      unit: 'lb',
      price: 36.99,
      shipping: 5,
      tax: 3.2,
      vendor: 'Local Shop',
      date: now,
      notes: 'General 9mm powder.',
    })

    await addPurchase({
      componentType: 'powder',
      brand: 'Hodgdon',
      name: 'H4895',
      caliber: '.308',
      qty: 1,
      unit: 'lb',
      price: 45.99,
      shipping: 8,
      tax: 4.1,
      vendor: 'Online Vendor',
      date: now,
      notes: 'Rifle powder for .308 / 6.5.',
    })

    // Bullets
    await addPurchase({
      componentType: 'bullet',
      brand: 'Hornady',
      name: '124gr FMJ',
      caliber: '9mm',
      qty: 500,
      unit: 'ea',
      price: 79.99,
      shipping: 10,
      tax: 6.5,
      vendor: 'Online Vendor',
      date: now,
      notes: 'Bulk 9mm range bullets.',
    })

    await addPurchase({
      componentType: 'bullet',
      brand: 'Hornady',
      name: '147gr XTP',
      caliber: '9mm',
      qty: 250,
      unit: 'ea',
      price: 59.99,
      shipping: 10,
      tax: 5,
      vendor: 'Online Vendor',
      date: now,
      notes: '147gr defensive / subsonic bullets.',
    })

    await addPurchase({
      componentType: 'bullet',
      brand: 'Hornady',
      name: '168gr ELD-M',
      caliber: '.308',
      qty: 200,
      unit: 'ea',
      price: 79.99,
      shipping: 10,
      tax: 6.5,
      vendor: 'Online Vendor',
      date: now,
      notes: 'Match bullets for .308.',
    })

    // Primers
    await addPurchase({
      componentType: 'primer',
      brand: 'CCI',
      name: 'Small Pistol',
      qty: 1000,
      unit: 'ea',
      price: 89.99,
      shipping: 15,
      tax: 7,
      vendor: 'Online Vendor',
      date: now,
      notes: 'SP primers for 9mm.',
    })

    await addPurchase({
      componentType: 'primer',
      brand: 'CCI',
      name: 'Large Rifle',
      qty: 1000,
      unit: 'ea',
      price: 99.99,
      shipping: 15,
      tax: 7.5,
      vendor: 'Online Vendor',
      date: now,
      notes: 'LR primers for .308 / 6.5.',
    })

    // Brass
    await addPurchase({
      componentType: 'case',
      caseCondition: 'new',
      brand: 'Starline',
      name: '9mm New Brass',
      caliber: '9mm',
      qty: 500,
      unit: 'ea',
      price: 89.99,
      shipping: 12,
      tax: 7.5,
      vendor: 'Online Vendor',
      date: now,
      notes: 'New brass for 9mm.',
    })

    await addPurchase({
      componentType: 'case',
      caseCondition: 'once_fired',
      brand: 'Mixed Range',
      name: '9mm Once-fired Brass',
      caliber: '9mm',
      qty: 1000,
      unit: 'ea',
      price: 60,
      shipping: 10,
      tax: 5,
      vendor: 'Local Range',
      date: now,
      notes: 'Range pickup brass, sorted.',
    })

    await addPurchase({
      componentType: 'case',
      caseCondition: 'new',
      brand: 'Lapua',
      name: '6.5 Creedmoor Brass',
      caliber: '6.5 Creedmoor',
      qty: 200,
      unit: 'ea',
      price: 139.99,
      shipping: 12,
      tax: 9.5,
      vendor: 'Online Vendor',
      date: now,
      notes: 'Match brass for 6.5.',
    })

    await addPurchase({
      componentType: 'case',
      caseCondition: 'field',
      brand: 'Mixed Range',
      name: '45 ACP field brass',
      caliber: '45 ACP',
      qty: 600,
      unit: 'ea',
      price: 55,
      shipping: 10,
      tax: 4,
      vendor: 'Local Range',
      notes: 'Mixed once-fired and unknown history.',
    })
  }

  await seedRecipes()
}

//===============================================================
//Script Name: Reload Tracker Gear Service
//Script Location: backend/gearService.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 1.1.0
//About: Business logic for the Gear Locker.
//       - Updated: GLOBAL ACCESS (Shared Gear).
//       - Updated: Added User Attribution (Owner Name).
//===============================================================

import { query } from './dbClient.js'
import { ValidationError, NotFoundError } from './errors.js'

function mapGearRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    ownerName: row.owner_name, // NEW
    name: row.name,
    type: row.type,
    brand: row.brand,
    model: row.model,
    serial: row.serial_number,
    price: row.price ? Number(row.price) : 0,
    purchaseDate: row.purchase_date ? row.purchase_date.toISOString().slice(0, 10) : null,
    url: row.product_url,
    imageUrl: row.image_url,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listGear(currentUser) {
  // GLOBAL READ: Show gear from ALL users
  const sql = `
    SELECT g.*, u.username as owner_name 
    FROM gear g
    LEFT JOIN users u ON g.user_id = u.id
    WHERE g.status != 'deleted'
    ORDER BY g.type ASC, g.name ASC
  `
  const res = await query(sql)
  return res.rows.map(mapGearRow)
}

export async function createGear(payload, currentUser) {
  const { name, type, brand, model, serial, price, purchaseDate, url, imageUrl, notes } = payload
  
  if (!name) throw new ValidationError('Gear name is required.')

  const sql = `
    INSERT INTO gear (
      user_id, name, type, brand, model, serial_number, 
      price, purchase_date, product_url, image_url, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *, (SELECT username FROM users WHERE id = $1) as owner_name
  `
  const params = [
    currentUser.id,
    name.trim(),
    type || 'other',
    brand || '',
    model || '',
    serial || '',
    Number(price) || 0,
    purchaseDate || null,
    url || null,
    imageUrl || null,
    notes || ''
  ]

  const res = await query(sql, params)
  return mapGearRow(res.rows[0])
}

export async function updateGear(id, updates, currentUser) {
  // SHARED WRITE: Any Admin can edit any gear
  const check = await query('SELECT id FROM gear WHERE id = $1 AND status != \'deleted\'', [id])
  if (check.rows.length === 0) throw new NotFoundError('Gear not found.')

  const fields = ['name', 'type', 'brand', 'model', 'serial', 'price', 'purchaseDate', 'url', 'imageUrl', 'notes', 'status']
  const setParts = []
  const values = []
  let idx = 1

  for (const key of Object.keys(updates)) {
    if (fields.includes(key)) {
      let col = key
      if (key === 'serial') col = 'serial_number'
      if (key === 'purchaseDate') col = 'purchase_date'
      if (key === 'url') col = 'product_url'
      if (key === 'imageUrl') col = 'image_url'
      
      setParts.push(`${col} = $${idx++}`)
      values.push(updates[key])
    }
  }

  if (setParts.length === 0) return { message: 'No changes.' }

  setParts.push(`updated_at = NOW()`)
  values.push(id)

  const sql = `
    UPDATE gear 
    SET ${setParts.join(', ')}
    WHERE id = $${idx}
    RETURNING *, (SELECT username FROM users WHERE id = gear.user_id) as owner_name
  `
  const res = await query(sql, values)
  return mapGearRow(res.rows[0])
}

export async function deleteGear(id, currentUser) {
  // Soft delete — keeps FK relationships intact (firearm_gear links, etc.)
  const res = await query(
    `UPDATE gear SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND status != 'deleted'`,
    [id]
  )
  if (res.rowCount === 0) throw new NotFoundError('Gear not found.')
  return { success: true }
}
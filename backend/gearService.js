//===============================================================
//Script Name: Reload Tracker Gear Service
//Script Location: backend/gearService.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Business logic for the Gear Locker.
//===============================================================

import { query } from './dbClient.js'
import { ValidationError, NotFoundError } from './errors.js'

function mapGearRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
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
  const sql = `
    SELECT * FROM gear 
    WHERE user_id = $1 AND status != 'deleted'
    ORDER BY type ASC, name ASC
  `
  const res = await query(sql, [currentUser.id])
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
    RETURNING *
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
  const check = await query('SELECT id FROM gear WHERE id = $1 AND user_id = $2', [id, currentUser.id])
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
    RETURNING *
  `
  const res = await query(sql, values)
  return mapGearRow(res.rows[0])
}

export async function deleteGear(id, currentUser) {
  const res = await query(
    `DELETE FROM gear WHERE id = $1 AND user_id = $2`,
    [id, currentUser.id]
  )
  if (res.rowCount === 0) throw new NotFoundError('Gear not found.')
  return { success: true }
}
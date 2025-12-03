//===============================================================
//Script Name: Reload Tracker Firearms Service
//Script Location: backend/firearmsService.js
//Date: 12/01/2025
//Created By: T03KNEE
//Version: 1.2.0
//About: Business logic for "The Armory" (Firearms Database).
//       Updated: Added support for image_url.
//===============================================================

import { query } from './dbClient.js'
import { ValidationError, NotFoundError } from './errors.js'

function mapFirearmRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    ownerName: row.owner_name,
    name: row.name,
    platform: row.platform,
    caliber: row.caliber,
    manufacturer: row.manufacturer,
    model: row.model,
    specs: row.specs || {}, 
    roundCount: row.round_count,
    imageUrl: row.image_url, // NEW
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listFirearms(currentUser) {
  const sql = `
    SELECT f.*, u.username as owner_name 
    FROM firearms f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.status != 'deleted'
    ORDER BY f.platform ASC, f.name ASC
  `
  const res = await query(sql)
  return res.rows.map(mapFirearmRow)
}

export async function createFirearm(payload, currentUser) {
  const { name, platform, caliber, manufacturer, model, specs, roundCount, imageUrl } = payload
  
  if (!name) throw new ValidationError('Firearm name is required.')

  const sql = `
    INSERT INTO firearms (
      user_id, name, platform, caliber, manufacturer, model, specs, round_count, image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `
  const params = [
    currentUser.id,
    name.trim(),
    platform || 'other',
    caliber || '',
    manufacturer || '',
    model || '',
    specs || {},
    Number(roundCount) || 0,
    imageUrl || null // NEW
  ]

  const res = await query(sql, params)
  const row = res.rows[0]
  row.owner_name = currentUser.username
  return mapFirearmRow(row)
}

export async function updateFirearm(id, updates, currentUser) {
  const check = await query('SELECT id FROM firearms WHERE id = $1 AND status != \'deleted\'', [id])
  if (check.rows.length === 0) throw new NotFoundError('Firearm not found.')

  // Added 'imageUrl' (mapped to 'image_url') to allowed fields
  const fields = ['name', 'platform', 'caliber', 'manufacturer', 'model', 'specs', 'roundCount', 'imageUrl', 'status']
  const setParts = []
  const values = []
  let idx = 1

  for (const key of Object.keys(updates)) {
    if (fields.includes(key)) {
      let col = key
      if (key === 'roundCount') col = 'round_count'
      if (key === 'imageUrl') col = 'image_url' // Map to snake_case
      
      setParts.push(`${col} = $${idx++}`)
      values.push(updates[key])
    }
  }

  if (setParts.length === 0) return { message: 'No changes detected.' }

  setParts.push(`updated_at = NOW()`)
  values.push(id)

  const sql = `
    UPDATE firearms 
    SET ${setParts.join(', ')}
    WHERE id = $${idx}
    RETURNING *, (SELECT username FROM users WHERE id = firearms.user_id) as owner_name
  `
  
  const res = await query(sql, values)
  return mapFirearmRow(res.rows[0])
}

export async function deleteFirearm(id, currentUser) {
  const res = await query(
    `UPDATE firearms SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
    [id]
  )
  if (res.rowCount === 0) throw new NotFoundError('Firearm not found.')
  return { success: true }
}
//===============================================================
//Script Name: Reload Tracker Firearms Service
//Script Location: backend/firearmsService.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 2.2.0 (Type-Safe Fix)
//About: Business logic for "The Armory".
//       - FIX: Explicitly casts roundCount to Integer in updates.
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
    imageUrl: row.image_url,
    status: row.status,
    gearIds: row.gear_ids || [], 
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SELECT_SQL = `
    SELECT f.*, u.username as owner_name,
    (SELECT COALESCE(array_agg(gear_id), '{}') FROM firearm_gear WHERE firearm_id = f.id) as gear_ids
    FROM firearms f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.status != 'deleted'
`

export async function listFirearms(currentUser) {
  const sql = `${SELECT_SQL} ORDER BY f.platform ASC, f.name ASC`
  const res = await query(sql)
  return res.rows.map(mapFirearmRow)
}

export async function createFirearm(payload, currentUser) {
  const { name, platform, caliber, manufacturer, model, specs, roundCount, imageUrl, gearIds } = payload
  
  if (!name) throw new ValidationError('Firearm name is required.')

  const sql = `
    INSERT INTO firearms (
      user_id, name, platform, caliber, manufacturer, model, specs, round_count, image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `
  const params = [
    currentUser.id, name.trim(), platform || 'other', caliber || '',
    manufacturer || '', model || '', specs || {}, Number(roundCount) || 0, imageUrl || null
  ]

  const res = await query(sql, params)
  const newId = res.rows[0].id

  // Link Gear
  if (Array.isArray(gearIds) && gearIds.length > 0) {
      for (const gid of gearIds) {
          await query('INSERT INTO firearm_gear (firearm_id, gear_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newId, gid])
      }
  }

  const full = await query(`${SELECT_SQL} AND f.id = $1`, [newId])
  return mapFirearmRow(full.rows[0])
}

export async function updateFirearm(id, updates, currentUser) {
  // 1. Verify existence
  const check = await query('SELECT id FROM firearms WHERE id = $1 AND status != \'deleted\'', [id])
  if (check.rows.length === 0) throw new NotFoundError('Firearm not found.')

  const fields = ['name', 'platform', 'caliber', 'manufacturer', 'model', 'specs', 'roundCount', 'imageUrl', 'status']
  const setParts = []
  const values = []
  let idx = 1

  for (const key of Object.keys(updates)) {
    if (fields.includes(key)) {
      let col = key
      let val = updates[key]

      // --- CRITICAL FIX: Force Type Casting ---
      if (key === 'roundCount') {
          col = 'round_count'
          val = Number(val) // Convert string "100" to number 100
          if (isNaN(val)) val = 0; // Fallback safety
      }
      if (key === 'imageUrl') col = 'image_url'
      // ----------------------------------------

      setParts.push(`${col} = $${idx++}`)
      values.push(val)
    }
  }

  // Handle Gear Links
  if (updates.gearIds !== undefined && Array.isArray(updates.gearIds)) {
      await query('DELETE FROM firearm_gear WHERE firearm_id = $1', [id])
      for (const gid of updates.gearIds) {
          await query('INSERT INTO firearm_gear (firearm_id, gear_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, gid])
      }
  }

  if (setParts.length > 0) {
      setParts.push(`updated_at = NOW()`)
      values.push(id)
      const sql = `UPDATE firearms SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING id`
      await query(sql, values)
  }

  const full = await query(`${SELECT_SQL} AND f.id = $1`, [id])
  return mapFirearmRow(full.rows[0])
}

export async function deleteFirearm(id, currentUser) {
  await query(`UPDATE firearms SET status = 'deleted', updated_at = NOW() WHERE id = $1`, [id])
  return { success: true }
}
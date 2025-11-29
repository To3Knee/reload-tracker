//===============================================================
//Script Name: Reload Tracker Range Service
//Script Location: backend/rangeService.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.1.0
//About: Business logic for managing Range / Performance Logs.
//       Updated: Added updateRangeLog support.
//===============================================================

import { query } from './dbClient.js'
import { ValidationError, NotFoundError } from './errors.js'

function normalizeNumber(val) {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

export async function listRangeLogs(filters = {}) {
  const sql = `
    SELECT 
      rl.*,
      r.name as recipe_name, r.caliber,
      b.load_date as batch_date
    FROM range_logs rl
    JOIN recipes r ON rl.recipe_id = r.id
    LEFT JOIN batches b ON rl.batch_id = b.id
    ORDER BY rl.log_date DESC, rl.id DESC
    LIMIT 50
  `
  const res = await query(sql)
  
  return res.rows.map(row => ({
    id: row.id,
    date: row.log_date.toISOString().slice(0, 10),
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    caliber: row.caliber,
    batchId: row.batch_id,
    batchDate: row.batch_date ? row.batch_date.toISOString().slice(0, 10) : null,
    
    distance: Number(row.distance_yards),
    groupSize: Number(row.group_size_inches),
    velocity: Number(row.avg_velocity_fps),
    sd: Number(row.sd_velocity),
    es: Number(row.es_velocity),
    
    weather: row.weather,
    temp: Number(row.temperature),
    notes: row.notes,
    imageUrl: row.image_url
  }))
}

export async function createRangeLog(payload, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can log range sessions.')
  }

  const {
    recipeId, batchId, date,
    distance, groupSize,
    velocity, sd, es,
    weather, temp, notes, imageUrl
  } = payload

  if (!recipeId) throw new ValidationError('Recipe is required.')

  // Insert
  const sql = `
    INSERT INTO range_logs (
      recipe_id, batch_id, log_date, 
      distance_yards, group_size_inches, 
      avg_velocity_fps, sd_velocity, es_velocity,
      weather, temperature, notes, image_url,
      created_by_user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    )
    RETURNING id
  `
  
  const params = [
    recipeId, 
    batchId || null, 
    date || new Date(),
    normalizeNumber(distance),
    normalizeNumber(groupSize),
    normalizeNumber(velocity),
    normalizeNumber(sd),
    normalizeNumber(es),
    weather,
    normalizeNumber(temp),
    notes,
    imageUrl,
    currentUser.id
  ]

  const res = await query(sql, params)
  return { id: res.rows[0].id, message: 'Range session logged.' }
}

export async function updateRangeLog(id, updates, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can edit logs.')
  }
  
  // Build dynamic update query
  const fields = {
    recipeId: 'recipe_id',
    batchId: 'batch_id',
    date: 'log_date',
    distance: 'distance_yards',
    groupSize: 'group_size_inches',
    velocity: 'avg_velocity_fps',
    sd: 'sd_velocity',
    es: 'es_velocity',
    weather: 'weather',
    temp: 'temperature',
    notes: 'notes',
    imageUrl: 'image_url'
  }

  const setParts = []
  const values = []
  let idx = 1

  for (const [key, val] of Object.entries(updates)) {
    const dbCol = fields[key]
    if (!dbCol) continue

    setParts.push(`${dbCol} = $${idx++}`)
    
    // Normalize numbers/dates based on key
    if (['distance','groupSize','velocity','sd','es','temp'].includes(key)) {
      values.push(normalizeNumber(val))
    } else if (key === 'batchId') {
      values.push(val || null) // Allow clearing batch
    } else {
      values.push(val)
    }
  }

  if (setParts.length === 0) return { message: 'No changes.' }

  values.push(id)
  const sql = `UPDATE range_logs SET ${setParts.join(', ')} WHERE id = $${idx}`
  
  const res = await query(sql, values)
  if (res.rowCount === 0) throw new NotFoundError('Log not found.')
  
  return { success: true }
}

export async function deleteRangeLog(id, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can delete logs.')
  }
  const res = await query('DELETE FROM range_logs WHERE id = $1', [id])
  if (res.rowCount === 0) throw new NotFoundError('Log not found.')
  return { success: true }
}
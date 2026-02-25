//===============================================================
//Script Name: Reload Tracker Range Service
//Script Location: backend/rangeService.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.3.0
//About: Business logic for Range Logs.
//       Updated: SQL JOINs reinforced.
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
      rl.id, rl.date, rl.rounds_fired, rl.distance_yards, rl.group_size_inches,
      rl.velocity_fps, rl.sd, rl.es, rl.shots, rl.weather, rl.temp_f, rl.notes, rl.image_url,
      rl.recipe_id, rl.batch_id, rl.firearm_id, rl.created_at, rl.updated_at,
      r.name as recipe_name, r.caliber as recipe_caliber,
      f.name as firearm_name, f.platform as firearm_platform,
      b.load_date as batch_date,
      uc.username as created_by,
      uu.username as updated_by
    FROM range_logs rl
    JOIN recipes r ON rl.recipe_id = r.id
    LEFT JOIN firearms f ON rl.firearm_id = f.id
    LEFT JOIN batches b ON rl.batch_id = b.id
    LEFT JOIN users uc ON rl.created_by_user_id = uc.id
    LEFT JOIN users uu ON rl.updated_by_user_id = uu.id
    ORDER BY rl.date DESC, rl.id DESC
    LIMIT 50
  `
  const res = await query(sql)
  
  return res.rows.map(row => ({
    id: row.id,
    date: row.date ? new Date(row.date).toISOString().slice(0, 10) : null,
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    caliber: row.recipe_caliber,
    firearmId: row.firearm_id,
    firearmName: row.firearm_name,
    roundsFired: row.rounds_fired || 0,
    batchId: row.batch_id,
    batchDate: row.batch_date ? new Date(row.batch_date).toISOString().slice(0, 10) : null,
    distance: normalizeNumber(row.distance_yards),
    groupSize: normalizeNumber(row.group_size_inches),
    velocity: normalizeNumber(row.velocity_fps),
    sd: normalizeNumber(row.sd),
    es: normalizeNumber(row.es),
    shots: Array.isArray(row.shots) ? row.shots : (row.shots ? JSON.parse(row.shots) : []),
    weather: row.weather,
    temp: normalizeNumber(row.temp_f),
    notes: row.notes,
    imageUrl: row.image_url,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at
  }))
}

export async function createRangeLog(payload, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can log range sessions.')
  }

  const {
    recipeId, batchId, firearmId, date,
    roundsFired, distance, groupSize,
    velocity, sd, es, shots,
    weather, temp, notes, imageUrl
  } = payload

  if (!recipeId) throw new ValidationError('Recipe is required.')

  const sql = `
    INSERT INTO range_logs (
      recipe_id, batch_id, firearm_id, date, rounds_fired,
      distance_yards, group_size_inches, 
      velocity_fps, sd, es, shots,
      weather, temp_f, notes, image_url,
      created_by_user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
    RETURNING id
  `
  
  const rCount = normalizeNumber(roundsFired) || 0
  const params = [
    recipeId, batchId || null, firearmId || null, date || new Date(), rCount,
    normalizeNumber(distance), normalizeNumber(groupSize), normalizeNumber(velocity),
    normalizeNumber(sd), normalizeNumber(es), JSON.stringify(shots || []),
    weather, normalizeNumber(temp), notes, imageUrl, currentUser.id
  ]

  const res = await query(sql, params)

  if (firearmId && rCount > 0) {
    await query(
      `UPDATE firearms SET round_count = round_count + $1, updated_at = NOW() WHERE id = $2`,
      [rCount, firearmId]
    )
  }
  return { id: res.rows[0].id, message: 'Range session logged.' }
}

export async function updateRangeLog(id, updates, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can edit logs.')
  }
  
  const fields = {
    recipeId: 'recipe_id', batchId: 'batch_id', firearmId: 'firearm_id', roundsFired: 'rounds_fired',
    date: 'date', distance: 'distance_yards', groupSize: 'group_size_inches', velocity: 'velocity_fps',
    sd: 'sd', es: 'es', shots: 'shots', weather: 'weather', temp: 'temp_f', notes: 'notes', imageUrl: 'image_url'
  }

  const setParts = []
  const values = []
  let idx = 1

  for (const [key, val] of Object.entries(updates)) {
    const dbCol = fields[key]
    if (!dbCol) continue

    setParts.push(`${dbCol} = $${idx++}`)
    
    if (['distance','groupSize','velocity','sd','es','temp','roundsFired'].includes(key)) {
      values.push(normalizeNumber(val))
    } else if (['batchId', 'firearmId'].includes(key)) {
      values.push(val || null)
    } else if (key === 'shots') {
      values.push(JSON.stringify(val || []))
    } else {
      values.push(val)
    }
  }

  if (setParts.length === 0) return { message: 'No changes.' }

  setParts.push(`updated_by_user_id = $${idx++}`)
  values.push(currentUser.id)
  setParts.push(`updated_at = NOW()`)

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
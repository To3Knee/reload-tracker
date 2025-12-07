//===============================================================
//Script Name: Reload Tracker Batches Service
//Script Location: backend/batchesService.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 1.5.0
//About: Business logic for logging loaded batches.
//       Updated: SQL JOINs reinforced to prevent data loss.
//===============================================================

import { query } from './dbClient.js'
import { ValidationError, NotFoundError } from './errors.js'

const GRAINS_PER_LB = 7000
const GRAINS_PER_KG = 15432.3584

function getAvailableGrains(qty, unit) {
  const q = Number(qty) || 0
  const u = (unit || '').toLowerCase()
  if (u === 'lb') return q * GRAINS_PER_LB
  if (u === 'kg') return q * GRAINS_PER_KG
  if (u === 'gr' || u === 'grain' || u === 'grains') return q
  return 0
}

function convertGrainsToUnit(grains, unit) {
  const u = (unit || '').toLowerCase()
  if (u === 'lb') return grains / GRAINS_PER_LB
  if (u === 'kg') return grains / GRAINS_PER_KG
  return grains
}

export async function listBatches(currentUser) {
  // CRITICAL FIX: Explicitly select columns to prevent ambiguity
  const sql = `
    SELECT 
      b.id, 
      b.load_date, 
      b.rounds_loaded, 
      b.notes,
      b.created_at, 
      b.updated_at,
      r.name as recipe_name, 
      r.caliber,
      p.brand as powder_brand,
      bu.brand as bullet_brand,
      pr.brand as primer_brand,
      ca.brand as case_brand,
      uc.username as created_by,
      uu.username as updated_by
    FROM batches b
    JOIN recipes r ON b.recipe_id = r.id
    LEFT JOIN purchases p ON b.powder_lot_id = p.id
    LEFT JOIN purchases bu ON b.bullet_lot_id = bu.id
    LEFT JOIN purchases pr ON b.primer_lot_id = pr.id
    LEFT JOIN purchases ca ON b.case_lot_id = ca.id
    LEFT JOIN users uc ON b.created_by_user_id = uc.id
    LEFT JOIN users uu ON b.updated_by_user_id = uu.id
    ORDER BY b.load_date DESC, b.id DESC
    LIMIT 50
  `
  const res = await query(sql)
  return res.rows.map(row => ({
    id: row.id,
    date: row.load_date ? new Date(row.load_date).toISOString().slice(0,10) : 'Unknown',
    rounds: row.rounds_loaded,
    recipe: `${row.recipe_name} (${row.caliber})`,
    components: [row.powder_brand, row.bullet_brand, row.primer_brand, row.case_brand].filter(Boolean).join(', '),
    notes: row.notes,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export async function createBatch(payload, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can log batches.')
  }

  const { recipeId, rounds, powderLotId, bulletLotId, primerLotId, caseLotId, notes } = payload
  const roundsLoaded = Number(rounds)
  
  if (!recipeId || roundsLoaded <= 0) {
    throw new ValidationError('Valid Recipe and Round Count required.')
  }

  const recipeRes = await query('SELECT * FROM recipes WHERE id = $1', [recipeId])
  if (recipeRes.rows.length === 0) throw new NotFoundError('Recipe not found.')
  const recipe = recipeRes.rows[0]

  if (powderLotId) {
    const powRes = await query('SELECT * FROM purchases WHERE id = $1', [powderLotId])
    if (powRes.rows.length > 0) {
      const lot = powRes.rows[0]
      const charge = Number(recipe.charge_grains) || 0
      const totalGrainsNeeded = charge * roundsLoaded
      const currentGrains = getAvailableGrains(lot.qty, lot.unit)
      
      const remainingGrains = currentGrains - totalGrainsNeeded
      const newQty = convertGrainsToUnit(remainingGrains, lot.unit)
      const newStatus = newQty <= 0.01 ? 'depleted' : 'active'

      await query(
        'UPDATE purchases SET qty = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [newQty, newStatus, powderLotId]
      )
    }
  }

  async function decrementDiscrete(lotId, amount) {
    if (!lotId) return
    const res = await query('SELECT * FROM purchases WHERE id = $1', [lotId])
    if (res.rows.length > 0) {
      const lot = res.rows[0]
      const newQty = (Number(lot.qty) || 0) - amount
      const newStatus = newQty <= 0 ? 'depleted' : 'active'
      await query(
        'UPDATE purchases SET qty = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [newQty, newStatus, lotId]
      )
    }
  }

  await decrementDiscrete(bulletLotId, roundsLoaded)
  await decrementDiscrete(primerLotId, roundsLoaded)

  const insertSql = `
    INSERT INTO batches 
    (recipe_id, load_date, rounds_loaded, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, notes, created_by_user_id)
    VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `
  const res = await query(insertSql, [
    recipeId, roundsLoaded, powderLotId, bulletLotId, primerLotId, caseLotId, notes, currentUser.id
  ])

  return { id: res.rows[0].id, message: 'Batch logged.' }
}

export async function updateBatch(id, updates, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can edit batches.')
  }
  
  const notes = updates.notes !== undefined ? updates.notes : null
  
  const res = await query(
    `UPDATE batches 
     SET notes = $1, updated_by_user_id = $2, updated_at = NOW() 
     WHERE id = $3 RETURNING *`,
    [notes, currentUser.id, id]
  )
  
  if (res.rowCount === 0) throw new NotFoundError('Batch not found.')
  return res.rows[0]
}

export async function deleteBatch(id, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new ValidationError('Only Reloaders can delete batches.')
  }
  const res = await query('DELETE FROM batches WHERE id = $1', [id])
  if (res.rowCount === 0) throw new NotFoundError('Batch not found.')
  return { success: true }
}
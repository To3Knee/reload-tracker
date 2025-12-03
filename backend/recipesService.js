//===============================================================
//Script Name: Reload Tracker Recipes Service
//Script Location: backend/recipesService.js
//Date: 12/02/2025
//Created By: T03KNEE
//Version: 1.7.0
//About: Business logic for managing load recipes.
//       Updated: Joins with Inventory to fetch Ingredient Names.
//===============================================================

import { query } from './dbClient.js';
import { ValidationError, NotFoundError } from './errors.js';

function assertAdmin(user) {
  if (!user || user.role !== 'admin' || user.isActive === false) {
    throw new ValidationError('You must be a Reloader (admin) to perform this action.');
  }
}

function mapRecipeRowToJson(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    caliber: row.caliber,
    profileType: row.profile_type,
    chargeGrains: row.charge_grains !== null ? Number(row.charge_grains) : null,
    brassReuse: row.brass_reuse !== null ? Number(row.brass_reuse) : null,
    lotSize: row.lot_size !== null ? Number(row.lot_size) : null,
    notes: row.notes,
    
    // Ballistics (Results)
    bulletWeightGr: row.bullet_weight_gr !== null ? Number(row.bullet_weight_gr) : null,
    muzzleVelocityFps: row.muzzle_velocity_fps !== null ? Number(row.muzzle_velocity_fps) : null,
    powerFactor: row.power_factor !== null ? Number(row.power_factor) : null,
    zeroDistanceYards: row.zero_distance_yards !== null ? Number(row.zero_distance_yards) : null,
    groupSizeInches: row.group_size_inches !== null ? Number(row.group_size_inches) : null,
    rangeNotes: row.range_notes,
    source: row.source,
    status: row.status,
    
    // Ingredients (IDs)
    powderLotId: row.powder_lot_id || '',
    bulletLotId: row.bullet_lot_id || '',
    primerLotId: row.primer_lot_id || '',
    caseLotId: row.case_lot_id || '',

    // Ingredient Names (For Display/PDF)
    powderName: row.powder_brand ? `${row.powder_brand} ${row.powder_name}` : null,
    bulletName: row.bullet_brand ? `${row.bullet_brand} ${row.bullet_name}` : null,
    primerName: row.primer_brand ? `${row.primer_brand} ${row.primer_name}` : null,
    caseName: row.case_brand ? `${row.case_brand} ${row.case_name}` : null,

    // Attribution
    createdByUserId: row.created_by_user_id || null,
    createdByUsername: row.created_by_username || null,
    updatedByUserId: row.updated_by_user_id || null,
    updatedByUsername: row.updated_by_username || null,
    createdAt: row.created_at ? row.created_at.toISOString() : null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) throw new ValidationError(`Invalid numeric value: ${value}`);
  return n;
}

function normalizeId(value) {
  if (!value || value === '') return null;
  return Number(value);
}

export async function listRecipes(filters = {}) {
  const values = [];
  // JOINs to get component details
  const sql = `
    SELECT
      r.*,
      uc.username AS created_by_username,
      uu.username AS updated_by_username,
      p.brand as powder_brand, p.name as powder_name,
      b.brand as bullet_brand, b.name as bullet_name,
      pr.brand as primer_brand, pr.name as primer_name,
      c.brand as case_brand, c.name as case_name
    FROM recipes r
    LEFT JOIN users uc ON r.created_by_user_id = uc.id
    LEFT JOIN users uu ON r.updated_by_user_id = uu.id
    LEFT JOIN purchases p ON r.powder_lot_id = p.id
    LEFT JOIN purchases b ON r.bullet_lot_id = b.id
    LEFT JOIN purchases pr ON r.primer_lot_id = pr.id
    LEFT JOIN purchases c ON r.case_lot_id = c.id
    ORDER BY r.caliber ASC, r.name ASC
  `;
  const result = await query(sql, values);
  return result.rows.map(mapRecipeRowToJson);
}

export async function createRecipe(payload, currentUser) {
  assertAdmin(currentUser);
  
  const sql = `
    INSERT INTO recipes (
      name, caliber, profile_type, charge_grains, brass_reuse, lot_size, notes,
      bullet_weight_gr, muzzle_velocity_fps, power_factor, zero_distance_yards,
      group_size_inches, range_notes, source, status, 
      powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id,
      created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *
  `;

  const params = [
    payload.name, payload.caliber, payload.profileType,
    normalizeNumber(payload.chargeGrains), normalizeNumber(payload.brassReuse), normalizeNumber(payload.lotSize),
    payload.notes, normalizeNumber(payload.bulletWeightGr), normalizeNumber(payload.muzzleVelocityFps),
    normalizeNumber(payload.powerFactor), normalizeNumber(payload.zeroDistanceYards), normalizeNumber(payload.groupSizeInches),
    payload.rangeNotes, payload.source, 'active',
    normalizeId(payload.powderLotId), normalizeId(payload.bulletLotId), normalizeId(payload.primerLotId), normalizeId(payload.caseLotId),
    currentUser.id
  ];

  const result = await query(sql, params);
  // Re-fetch to populate joined names immediately
  const fullList = await listRecipes(); 
  return fullList.find(r => r.id === result.rows[0].id);
}

export async function updateRecipe(id, updates, currentUser) {
  assertAdmin(currentUser);
  const setParts = [];
  const values = [];
  let idx = 1;

  const keyMap = {
    name: 'name', caliber: 'caliber', profileType: 'profile_type',
    chargeGrains: 'charge_grains', brassReuse: 'brass_reuse', lotSize: 'lot_size',
    notes: 'notes', bulletWeightGr: 'bullet_weight_gr', muzzleVelocityFps: 'muzzle_velocity_fps',
    powerFactor: 'power_factor', zeroDistanceYards: 'zero_distance_yards',
    groupSizeInches: 'group_size_inches', rangeNotes: 'range_notes', source: 'source',
    powderLotId: 'powder_lot_id', bulletLotId: 'bullet_lot_id',
    primerLotId: 'primer_lot_id', caseLotId: 'case_lot_id', status: 'status'
  };

  for (const [key, val] of Object.entries(updates)) {
    const dbCol = keyMap[key];
    if (dbCol) {
      setParts.push(`${dbCol} = $${idx++}`);
      if (key.endsWith('LotId')) values.push(normalizeId(val));
      else if (['chargeGrains','brassReuse','lotSize','bulletWeightGr','muzzleVelocityFps','powerFactor','zeroDistanceYards','groupSizeInches'].includes(key)) values.push(normalizeNumber(val));
      else values.push(val);
    }
  }

  if (setParts.length === 0) return { message: 'No changes' };
  setParts.push(`updated_at = NOW()`);
  setParts.push(`updated_by_user_id = $${idx++}`);
  values.push(currentUser.id);
  values.push(id);

  const sql = `UPDATE recipes SET ${setParts.join(', ')} WHERE id = $${idx}`;
  await query(sql, values);
  
  const all = await listRecipes();
  return all.find(r => String(r.id) === String(id));
}

export async function deleteRecipe(id, currentUser) {
  assertAdmin(currentUser);
  await query('DELETE FROM recipes WHERE id = $1', [id]);
  return { success: true };
}
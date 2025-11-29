//===============================================================
//Script Name: Reload Tracker Recipes Service
//Script Location: backend/recipesService.js
//Date: 11/28/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.1.0
//About: Business logic for managing load recipes.
//       Updated to include User Tracking and Admin Role enforcement.
//===============================================================

import { query } from './dbClient.js';
import { ValidationError, NotFoundError } from './errors.js';

/**
 * Helper: Check if user is admin. Throws if not.
 */
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
    bulletWeightGr:
      row.bullet_weight_gr !== null ? Number(row.bullet_weight_gr) : null,
    muzzleVelocityFps:
      row.muzzle_velocity_fps !== null
        ? Number(row.muzzle_velocity_fps)
        : null,
    powerFactor:
      row.power_factor !== null ? Number(row.power_factor) : null,
    zeroDistanceYards:
      row.zero_distance_yards !== null
        ? Number(row.zero_distance_yards)
        : null,
    groupSizeInches:
      row.group_size_inches !== null ? Number(row.group_size_inches) : null,
    rangeNotes: row.range_notes,
    status: row.status,
    
    // User tracking fields
    createdByUserId: row.created_by_user_id || null,
    createdByUsername: row.created_by_username || null,
    updatedByUserId: row.updated_by_user_id || null,
    updatedByUsername: row.updated_by_username || null,

    createdAt: row.created_at ? row.created_at.toISOString() : null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

function normalizeNumber(value, { allowNull = true } = {}) {
  if (value === undefined || value === null || value === '') {
    return allowNull ? null : 0;
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new ValidationError(`Invalid numeric value: ${value}`);
  }
  return n;
}

function validateRecipePayload(data, { partial = false } = {}) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Payload must be a JSON object.');
  }

  if (!partial) {
    const required = ['name', 'caliber'];
    for (const f of required) {
      const v = data[f];
      if (!v || String(v).trim() === '') {
        throw new ValidationError(`Field "${f}" is required.`);
      }
    }
  }
}

export async function listRecipes(filters = {}) {
  const whereParts = [];
  const values = [];
  let idx = 1;

  if (filters.status) {
    whereParts.push(`r.status = $${idx}`);
    values.push(filters.status);
    idx += 1;
  }

  if (filters.caliber) {
    whereParts.push(`r.caliber = $${idx}`);
    values.push(filters.caliber);
    idx += 1;
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  // UPDATED SQL: Joins with users table to get creator/updater names
  const sql = `
    SELECT
      r.id,
      r.name,
      r.caliber,
      r.profile_type,
      r.charge_grains,
      r.brass_reuse,
      r.lot_size,
      r.notes,
      r.bullet_weight_gr,
      r.muzzle_velocity_fps,
      r.power_factor,
      r.zero_distance_yards,
      r.group_size_inches,
      r.range_notes,
      r.status,
      r.created_at,
      r.updated_at,
      r.created_by_user_id,
      c.username AS created_by_username,
      r.updated_by_user_id,
      u.username AS updated_by_username
    FROM recipes r
    LEFT JOIN users c ON c.id = r.created_by_user_id
    LEFT JOIN users u ON u.id = r.updated_by_user_id
    ${whereClause}
    ORDER BY r.caliber ASC, r.name ASC
  `;

  const result = await query(sql, values);
  return result.rows.map(mapRecipeRowToJson);
}

export async function createRecipe(payload, currentUser) {
  assertAdmin(currentUser); // Security Check
  validateRecipePayload(payload, { partial: false });

  const name = payload.name?.trim?.() || '';
  const caliber = payload.caliber?.trim?.() || '';
  const profileType = payload.profileType || 'range';

  const chargeGrains = normalizeNumber(payload.chargeGrains);
  const brassReuse = normalizeNumber(payload.brassReuse);
  const lotSize = normalizeNumber(payload.lotSize);

  const bulletWeightGr = normalizeNumber(payload.bulletWeightGr);
  const muzzleVelocityFps = normalizeNumber(payload.muzzleVelocityFps);

  let powerFactor = normalizeNumber(payload.powerFactor);
  if (
    (powerFactor === null || powerFactor === 0) &&
    bulletWeightGr &&
    muzzleVelocityFps
  ) {
    powerFactor = (bulletWeightGr * muzzleVelocityFps) / 1000;
  }

  const zeroDistanceYards = normalizeNumber(payload.zeroDistanceYards);
  const groupSizeInches = normalizeNumber(payload.groupSizeInches);

  const notes = payload.notes?.trim?.() || null;
  const rangeNotes = payload.rangeNotes?.trim?.() || null;
  const status = payload.status || 'active';
  
  // Track who created it
  const createdByUserId = currentUser.id;

  const sql = `
    INSERT INTO recipes (
      name,
      caliber,
      profile_type,
      charge_grains,
      brass_reuse,
      lot_size,
      notes,
      bullet_weight_gr,
      muzzle_velocity_fps,
      power_factor,
      zero_distance_yards,
      group_size_inches,
      range_notes,
      status,
      created_by_user_id
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15
    )
    RETURNING *
  `;

  const params = [
    name,
    caliber,
    profileType,
    chargeGrains,
    brassReuse,
    lotSize,
    notes,
    bulletWeightGr,
    muzzleVelocityFps,
    powerFactor,
    zeroDistanceYards,
    groupSizeInches,
    rangeNotes,
    status,
    createdByUserId,
  ];

  const result = await query(sql, params);
  
  // Return mapped object immediately (username will be null until re-fetch, which is fine)
  const row = result.rows[0];
  // Manually attach username for instant UI feedback if desired
  row.created_by_username = currentUser.username;
  
  return mapRecipeRowToJson(row);
}

export async function updateRecipe(id, updates, currentUser) {
  assertAdmin(currentUser); // Security Check
  
  if (!id) {
    throw new ValidationError('id is required for update.');
  }
  validateRecipePayload(updates, { partial: true });

  const setParts = [];
  const values = [];
  let idx = 1;

  const fieldMap = {
    name: 'name',
    caliber: 'caliber',
    profileType: 'profile_type',
    chargeGrains: 'charge_grains',
    brassReuse: 'brass_reuse',
    lotSize: 'lot_size',
    notes: 'notes',
    bulletWeightGr: 'bullet_weight_gr',
    muzzleVelocityFps: 'muzzle_velocity_fps',
    powerFactor: 'power_factor',
    zeroDistanceYards: 'zero_distance_yards',
    groupSizeInches: 'group_size_inches',
    rangeNotes: 'range_notes',
    status: 'status',
  };

  const numericFields = [
    'chargeGrains',
    'brassReuse',
    'lotSize',
    'bulletWeightGr',
    'muzzleVelocityFps',
    'powerFactor',
    'zeroDistanceYards',
    'groupSizeInches',
  ];

  for (const [key, value] of Object.entries(updates)) {
    const column = fieldMap[key];
    if (!column) continue;

    let normalizedValue = value;

    if (numericFields.includes(key)) {
      normalizedValue = normalizeNumber(value);
    } else if (typeof value === 'string') {
      normalizedValue =
        value && value.trim().length > 0 ? value.trim() : null;
    }

    setParts.push(`${column} = $${idx}`);
    values.push(normalizedValue);
    idx += 1;
  }

  if (setParts.length === 0) {
    throw new ValidationError('No valid fields provided for update.');
  }

  // Always update the 'updated_by' fields
  setParts.push(`updated_at = NOW()`);
  setParts.push(`updated_by_user_id = $${idx}`);
  values.push(currentUser.id);
  idx += 1;

  values.push(Number(id)); // ID is the last param

  const sql = `
    UPDATE recipes
    SET ${setParts.join(', ')}
    WHERE id = $${idx}
    RETURNING *
  `;

  const result = await query(sql, values);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Recipe with id ${id} not found.`);
  }

  const row = result.rows[0];
  row.updated_by_username = currentUser.username; // Instant UI feedback
  return mapRecipeRowToJson(row);
}

export async function deleteRecipe(id, currentUser) {
  assertAdmin(currentUser); // Security Check
  
  if (!id) {
    throw new ValidationError('id is required for delete.');
  }

  const sql = 'DELETE FROM recipes WHERE id = $1';
  const result = await query(sql, [Number(id)]);

  if (result.rowCount === 0) {
    throw new NotFoundError(`Recipe with id ${id} not found.`);
  }
}
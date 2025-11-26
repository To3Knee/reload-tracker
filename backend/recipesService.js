//===============================================================
//Script Name: Reload Tracker Recipes Service
//Script Location: backend/recipesService.js
//Date: 11/26/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 0.1.1
//About: Business logic for managing load recipes (round configs)
//       in the Reload Tracker backend. Provides CRUD operations
//       on the "recipes" table and converts between DB rows and
//       API JSON shapes.
//===============================================================

import { query } from './dbClient.js';
import { ValidationError, NotFoundError } from './errors.js';

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
    whereParts.push(`status = $${idx}`);
    values.push(filters.status);
    idx += 1;
  }

  if (filters.caliber) {
    whereParts.push(`caliber = $${idx}`);
    values.push(filters.caliber);
    idx += 1;
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  const sql = `
    SELECT
      id,
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
      created_at,
      updated_at
    FROM recipes
    ${whereClause}
    ORDER BY caliber ASC, name ASC
  `;

  const result = await query(sql, values);
  return result.rows.map(mapRecipeRowToJson);
}

export async function createRecipe(payload) {
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
      status
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14
    )
    RETURNING
      id,
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
      created_at,
      updated_at
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
  ];

  const result = await query(sql, params);
  return mapRecipeRowToJson(result.rows[0]);
}

export async function updateRecipe(id, updates) {
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

  const sql = `
    UPDATE recipes
    SET
      ${setParts.join(', ')},
      updated_at = NOW()
    WHERE id = $${idx}
    RETURNING
      id,
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
      created_at,
      updated_at
  `;

  values.push(Number(id));

  const result = await query(sql, values);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Recipe with id ${id} not found.`);
  }

  return mapRecipeRowToJson(result.rows[0]);
}

export async function deleteRecipe(id) {
  if (!id) {
    throw new ValidationError('id is required for delete.');
  }

  const sql = 'DELETE FROM recipes WHERE id = $1';
  const result = await query(sql, [Number(id)]);

  if (result.rowCount === 0) {
    throw new NotFoundError(`Recipe with id ${id} not found.`);
  }
}

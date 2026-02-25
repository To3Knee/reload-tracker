//===============================================================
//Script Name: Reload Tracker Purchases Service
//Script Location: backend/purchasesService.js
//Date: 12/23/2025
//Created By: T03KNEE
//Version: 1.3.0 (Auto-ID Generation)
//About: Business logic for managing LOTs / purchases.
//       - FEATURE: Auto-generates unique System IDs (e.g. "PRI-X92B") 
//         if Lot ID is missing (Safety Net).
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

/**
 * Helper: Generates a short, unique System ID if one isn't provided.
 * Format: PRE-XXXXX (e.g., POW-8H2KA)
 */
function generateSystemLotId(componentType) {
  const map = {
    'powder': 'POW',
    'primer': 'PRI',
    'bullet': 'BUL',
    'case': 'CAS',
    'brass': 'CAS',
    'ammo': 'AMO',
    'projectile': 'BUL'
  };
  
  // 1. Determine Prefix (Default to GEN for Generic)
  const typeKey = (componentType || '').toLowerCase().trim();
  const prefix = map[typeKey] || 'GEN';
  
  // 2. Generate Random 5-char Suffix (Base36 uppercased)
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  
  return `${prefix}-${suffix}`;
}

/**
 * Map a database row (snake_case) to API/React JSON shape (camelCase).
 */
function mapPurchaseRowToJson(row) {
  if (!row) return null;
  return {
    id: row.id,
    lotId: row.lot_id,
    componentType: row.component_type,
    caseCondition: row.case_condition,
    caliber: row.caliber,
    brand: row.brand,
    name: row.name,
    typeDetail: row.type_detail,
    qty: row.qty,
    unit: row.unit,
    price: row.price,
    shipping: row.shipping,
    tax: row.tax,
    vendor: row.vendor,
    purchaseDate: row.purchase_date,
    notes: row.notes,
    status: row.status,
    imageUrl: row.image_url,
    url: row.url,
    createdByUserId: row.created_by_user_id,
    createdByUsername: row.created_by_username, // Joined field
    updatedByUserId: row.updated_by_user_id,
    updatedByUsername: row.updated_by_username, // Joined field
    updatedAt: row.updated_at
  };
}

export async function listPurchases(filters = {}) {
  let sql = `
    SELECT p.*, 
           u.username as created_by_username,
           u2.username as updated_by_username
    FROM purchases p
    LEFT JOIN users u ON p.created_by_user_id = u.id
    LEFT JOIN users u2 ON p.updated_by_user_id = u2.id
  `;
  const conditions = [];
  const values = [];

  // Filter by User logic can go here if needed...
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY p.purchase_date DESC';

  const result = await query(sql, values);
  return result.rows.map(mapPurchaseRowToJson);
}

export async function createPurchase(data, currentUser) {
  assertAdmin(currentUser);

  // --- AUTO-ID LOGIC ---
  // If the user/scanner provided an ID, use it.
  // If NOT, generate a System ID (e.g. "PRI-5X92").
  let finalLotId = data.lotId && data.lotId.trim().length > 0 
      ? data.lotId.trim() 
      : generateSystemLotId(data.componentType);

  const sql = `
    INSERT INTO purchases (
      user_id, lot_id, component_type, case_condition, caliber, brand, name, type_detail,
      qty, unit, price, shipping, tax, vendor, purchase_date, notes, status,
      image_url, url, created_by_user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $1
    ) RETURNING *
  `;

  const values = [
    currentUser.id,
    finalLotId, // Uses the generated ID instead of NULL/Empty
    data.componentType, 
    data.caseCondition, 
    data.caliber, 
    data.brand, 
    data.name, 
    data.typeDetail,
    data.qty, 
    data.unit, 
    data.price, 
    data.shipping, 
    data.tax, 
    data.vendor, 
    data.purchaseDate, 
    data.notes, 
    data.status || 'active',
    data.imageUrl, 
    data.url
  ];

  try {
    const res = await query(sql, values);
    return mapPurchaseRowToJson(res.rows[0]);
  } catch (err) {
    // Retry Logic: If we accidentally generated a duplicate (1 in a million), try one more time
    if (err.code === '23505' && !data.lotId) {
         console.warn("Collision detected on Auto-ID, retrying...");
         values[1] = generateSystemLotId(data.componentType); // New random ID
         const retryRes = await query(sql, values);
         return mapPurchaseRowToJson(retryRes.rows[0]);
    }
    // Real Duplicate Error (User typed a duplicate)
    if (err.code === '23505') {
        throw new ValidationError(`A Lot with ID "${finalLotId}" already exists.`);
    }
    throw err;
  }
}

export async function updatePurchase(id, updates, currentUser) {
  assertAdmin(currentUser);

  const allowedColumns = [
    'lot_id', 'component_type', 'case_condition', 'caliber', 'brand', 'name', 
    'type_detail', 'qty', 'unit', 'price', 'shipping', 'tax', 'vendor', 
    'purchase_date', 'notes', 'status', 'image_url', 'url'
  ];
  const dateFields = ['purchase_date'];

  const setParts = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    
    if (!allowedColumns.includes(column)) continue;

    let normalizedValue = value;
    
    // Logic: If user specifically CLEARS the box (sends empty string) on update,
    // we allow it to be NULL rather than forcing a new ID, 
    // unless you want to force generation here too. 
    // For safety, let's keep it NULL if they clear it manually.
    if (key === 'lotId') {
        normalizedValue = value && value.trim().length > 0 ? value.trim() : null;
    } 
    else if (dateFields.includes(column)) {
        normalizedValue = value ? new Date(value) : null;
    }

    setParts.push(`${column} = $${idx}`);
    values.push(normalizedValue);
    idx += 1;
  }

  if (setParts.length === 0) throw new ValidationError('No valid fields provided for update.');

  setParts.push(`updated_at = NOW()`);
  setParts.push(`updated_by_user_id = $${idx}`);
  values.push(currentUser.id);
  idx += 1;

  values.push(Number(id)); 

  const sql = `
    UPDATE purchases
    SET ${setParts.join(', ')}
    WHERE id = $${idx}
    RETURNING *
  `;

  try {
    const result = await query(sql, values);
    if (result.rows.length === 0) throw new NotFoundError(`Purchase with id ${id} not found.`);

    // RETURNING * doesn't include JOINed username columns — fetch them now
    const row = result.rows[0];
    if (row.created_by_user_id) {
      const creatorRes = await query('SELECT username FROM users WHERE id = $1', [row.created_by_user_id]);
      row.created_by_username = creatorRes.rows[0]?.username || null;
    }
    row.updated_by_username = currentUser.username;
    return mapPurchaseRowToJson(row);
  } catch (err) {
      if (err.code === '23505') {
          throw new ValidationError("Cannot update: This Lot ID is already in use.");
      }
      throw err;
  }
}

export async function deletePurchase(id, currentUser) {
  assertAdmin(currentUser);
  
  const sql = `DELETE FROM purchases WHERE id = $1 RETURNING id`;
  const result = await query(sql, [id]);

  if (result.rowCount === 0) {
    throw new NotFoundError(`Purchase with id ${id} not found.`);
  }
  return true;
}
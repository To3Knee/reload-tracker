//===============================================================
//Script Name: Reload Tracker Purchases Service
//Script Location: backend/purchasesService.js
//Date: 11/28/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.1.1
//About: Business logic for managing LOTs / purchases.
//       Updated: listPurchases now JOINS users to get names.
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
    qty: row.qty !== null ? Number(row.qty) : null,
    unit: row.unit,
    price: row.price !== null ? Number(row.price) : null,
    shipping: row.shipping !== null ? Number(row.shipping) : null,
    tax: row.tax !== null ? Number(row.tax) : null,
    vendor: row.vendor,
    purchaseDate: row.purchase_date
      ? row.purchase_date.toISOString().slice(0, 10)
      : null,
    url: row.url,
    imageUrl: row.image_url,
    status: row.status,
    notes: row.notes,
    
    // User tracking fields - The JOINs below populate these!
    createdByUserId: row.created_by_user_id || null,
    createdByUsername: row.created_by_username || null,
    updatedByUserId: row.updated_by_user_id || null,
    updatedByUsername: row.updated_by_username || null,

    createdAt: row.created_at ? row.created_at.toISOString() : null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

function generateLotId(componentType) {
  const prefixMap = {
    powder: 'POW',
    bullet: 'BUL',
    primer: 'PRI',
    case: 'CAS',
    other: 'OTH',
  };
  const prefix = prefixMap[componentType] || 'LOT';
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

function normalizeNumber(value, { allowNull = true } = {}) {
  if (value === undefined || value === null || value === '') {
    return allowNull ? null : 0;
  }
  const n = Number(value);
  if (Number.isNaN(n)) throw new ValidationError(`Invalid numeric value: ${value}`);
  return n;
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ValidationError(`Invalid date value: ${value}`);
  return d;
}

function validatePurchasePayload(data, { partial = false } = {}) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Payload must be a JSON object.');
  }
  const requiredFields = ['componentType', 'unit', 'qty'];
  if (!partial) {
    for (const f of requiredFields) {
      const v = data[f];
      if (v === undefined || v === null || String(v).trim() === '') {
        throw new ValidationError(`Field "${f}" is required.`);
      }
    }
  }
  // (Validation logic continues...)
}

export async function listPurchases(filters = {}) {
  const whereParts = [];
  const values = [];
  let idx = 1;

  if (filters.status) {
    whereParts.push(`p.status = $${idx}`);
    values.push(filters.status);
    idx += 1;
  }
  if (filters.componentType) {
    whereParts.push(`p.component_type = $${idx}`);
    values.push(filters.componentType);
    idx += 1;
  }
  if (filters.caliber) {
    whereParts.push(`p.caliber = $${idx}`);
    values.push(filters.caliber);
    idx += 1;
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  // --- THIS SQL WAS MISSING THE JOINS IN YOUR PREVIOUS VERSION ---
  const sql = `
    SELECT
      p.id,
      p.lot_id,
      p.component_type,
      p.case_condition,
      p.caliber,
      p.brand,
      p.name,
      p.type_detail,
      p.qty,
      p.unit,
      p.price,
      p.shipping,
      p.tax,
      p.vendor,
      p.purchase_date,
      p.url,
      p.image_url,
      p.status,
      p.notes,
      p.created_at,
      p.updated_at,
      p.created_by_user_id,
      c.username AS created_by_username,
      p.updated_by_user_id,
      u.username AS updated_by_username
    FROM purchases p
    LEFT JOIN users c ON c.id = p.created_by_user_id
    LEFT JOIN users u ON u.id = p.updated_by_user_id
    ${whereClause}
    ORDER BY p.created_at DESC, p.id DESC
  `;

  const result = await query(sql, values);
  return result.rows.map(mapPurchaseRowToJson);
}

export async function createPurchase(payload, currentUser) {
  assertAdmin(currentUser);
  validatePurchasePayload(payload, { partial: false });

  const componentType = String(payload.componentType).toLowerCase().trim();
  const lotId = payload.lotId ? String(payload.lotId).trim() : generateLotId(componentType);
  const caseCondition = payload.caseCondition ? String(payload.caseCondition).toLowerCase().trim() : null;
  const caliber = payload.caliber ? String(payload.caliber).trim() : null;
  const brand = payload.brand ? String(payload.brand).trim() : null;
  const name = payload.name ? String(payload.name).trim() : null;
  const typeDetail = payload.typeDetail ? String(payload.typeDetail).trim() : null;
  const unit = String(payload.unit).trim();
  const qty = normalizeNumber(payload.qty, { allowNull: false });
  const price = normalizeNumber(payload.price);
  const shipping = normalizeNumber(payload.shipping);
  const tax = normalizeNumber(payload.tax);
  const vendor = payload.vendor ? String(payload.vendor).trim() : null;
  const purchaseDate = normalizeDate(payload.purchaseDate);
  const url = payload.url ? String(payload.url).trim() : null;
  const imageUrl = payload.imageUrl ? String(payload.imageUrl).trim() : null;
  const status = payload.status ? String(payload.status).trim().toLowerCase() : 'active';
  const notes = payload.notes ? String(payload.notes).trim() : null;
  
  const createdByUserId = currentUser.id;

  const sql = `
    INSERT INTO purchases (
      lot_id, component_type, case_condition, caliber, brand, name, type_detail, 
      qty, unit, price, shipping, tax, vendor, purchase_date, url, image_url, status, notes, 
      created_by_user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
    RETURNING *
  `;

  const params = [
    lotId, componentType, caseCondition, caliber, brand, name, typeDetail,
    qty, unit, price, shipping, tax, vendor, purchaseDate, url, imageUrl, status, notes,
    createdByUserId
  ];

  const result = await query(sql, params);
  const row = result.rows[0];
  row.created_by_username = currentUser.username;
  return mapPurchaseRowToJson(row);
}

export async function updatePurchase(id, updates, currentUser) {
  assertAdmin(currentUser);
  if (!id) throw new ValidationError('id is required for update.');
  validatePurchasePayload(updates, { partial: true });

  const setParts = [];
  const values = [];
  let idx = 1;

  const fieldMap = {
    lotId: 'lot_id',
    componentType: 'component_type',
    caseCondition: 'case_condition',
    caliber: 'caliber',
    brand: 'brand',
    name: 'name',
    typeDetail: 'type_detail',
    qty: 'qty',
    unit: 'unit',
    price: 'price',
    shipping: 'shipping',
    tax: 'tax',
    vendor: 'vendor',
    purchaseDate: 'purchase_date',
    url: 'url',
    imageUrl: 'image_url',
    status: 'status',
    notes: 'notes',
  };

  const numericFields = ['qty', 'price', 'shipping', 'tax'];
  const dateFields = ['purchaseDate'];

  for (const [key, value] of Object.entries(updates)) {
    const column = fieldMap[key];
    if (!column) continue;

    let normalizedValue = value;
    if (numericFields.includes(key)) normalizedValue = normalizeNumber(value, { allowNull: true });
    else if (dateFields.includes(key)) normalizedValue = normalizeDate(value);
    else if (key === 'componentType' || key === 'caseCondition') normalizedValue = value ? String(value).trim().toLowerCase() : null;
    else if (typeof value === 'string') normalizedValue = value && value.trim().length > 0 ? value.trim() : null;

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

  const result = await query(sql, values);
  if (result.rows.length === 0) throw new NotFoundError(`Purchase with id ${id} not found.`);

  const row = result.rows[0];
  row.updated_by_username = currentUser.username;
  return mapPurchaseRowToJson(row);
}

export async function deletePurchase(id, currentUser) {
  assertAdmin(currentUser);
  if (!id) throw new ValidationError('id is required for delete.');
  const sql = 'DELETE FROM purchases WHERE id = $1';
  const result = await query(sql, [Number(id)]);
  if (result.rowCount === 0) throw new NotFoundError(`Purchase with id ${id} not found.`);
}
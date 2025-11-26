//===============================================================
//Script Name: Reload Tracker Purchases Service
//Script Location: backend/purchasesService.js
//Date: 11/26/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 0.1.2
//About: Business logic for managing LOTs / purchases in the
//       Reload Tracker backend. Provides CRUD operations on the
//       "purchases" table and converts between DB rows and API
//       JSON shapes.
//===============================================================

import { query } from './dbClient.js';
import { ValidationError, NotFoundError } from './errors.js';

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
    createdAt: row.created_at ? row.created_at.toISOString() : null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

/**
 * Generate a human-friendly LOT ID based on component type.
 * Example: POW-ABC12, BUL-X9ZQ7, etc.
 */
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
    const idx = Math.floor(Math.random() * alphabet.length);
    suffix += alphabet[idx];
  }
  return `${prefix}-${suffix}`;
}

/**
 * Normalize numeric input:
 * - undefined / null / '' -> null if allowNull is true, else 0.
 * - otherwise parse as Number and throw on NaN.
 */
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

/**
 * Normalize a date string into a JS Date or null.
 * Accepts ISO-like strings (yyyy-mm-dd).
 */
function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`Invalid date value: ${value}`);
  }
  return d;
}

/**
 * Validate a purchase payload for create/update operations.
 * This is intentionally strict about core fields but tolerant
 * about optional metadata (notes, URLs, etc.).
 *
 * @param {object} data - Incoming JSON payload.
 * @param {object} options - { partial: boolean }
 */
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

  if (data.componentType) {
    const allowedTypes = ['powder', 'bullet', 'primer', 'case', 'other'];
    const ct = String(data.componentType).toLowerCase();
    if (!allowedTypes.includes(ct)) {
      throw new ValidationError(
        `componentType must be one of: ${allowedTypes.join(', ')}`
      );
    }
  }

  if (data.caseCondition) {
    // IMPORTANT: matches UI values: new | once_fired | field
    const allowedConditions = ['new', 'once_fired', 'field'];
    const cc = String(data.caseCondition).toLowerCase();
    if (!allowedConditions.includes(cc)) {
      throw new ValidationError(
        `caseCondition must be one of: ${allowedConditions.join(', ')}`
      );
    }
  }

  if (data.unit) {
    const unit = String(data.unit).trim();
    if (!unit) {
      throw new ValidationError('unit cannot be empty.');
    }
  }

  // Numeric validation is done in normalizeNumber when mapping.
}

/**
 * List purchases (LOTS) with optional filters by status/componentType/caliber.
 */
export async function listPurchases(filters = {}) {
  const whereParts = [];
  const values = [];
  let idx = 1;

  if (filters.status) {
    whereParts.push(`status = $${idx}`);
    values.push(filters.status);
    idx += 1;
  }

  if (filters.componentType) {
    whereParts.push(`component_type = $${idx}`);
    values.push(filters.componentType);
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
      lot_id,
      component_type,
      case_condition,
      caliber,
      brand,
      name,
      type_detail,
      qty,
      unit,
      price,
      shipping,
      tax,
      vendor,
      purchase_date,
      url,
      image_url,
      status,
      notes,
      created_at,
      updated_at
    FROM purchases
    ${whereClause}
    ORDER BY created_at DESC, id DESC
  `;

  const result = await query(sql, values);
  return result.rows.map(mapPurchaseRowToJson);
}

/**
 * Create a new purchase (LOT).
 */
export async function createPurchase(payload) {
  validatePurchasePayload(payload, { partial: false });

  const componentType = String(payload.componentType).toLowerCase().trim();
  const lotId =
    payload.lotId && String(payload.lotId).trim().length > 0
      ? String(payload.lotId).trim()
      : generateLotId(componentType);

  const caseCondition = payload.caseCondition
    ? String(payload.caseCondition).toLowerCase().trim()
    : null;

  const caliber =
    payload.caliber && String(payload.caliber).trim().length > 0
      ? String(payload.caliber).trim()
      : null;

  const brand =
    payload.brand && String(payload.brand).trim().length > 0
      ? String(payload.brand).trim()
      : null;

  const name =
    payload.name && String(payload.name).trim().length > 0
      ? String(payload.name).trim()
      : null;

  const typeDetail =
    payload.typeDetail && String(payload.typeDetail).trim().length > 0
      ? String(payload.typeDetail).trim()
      : null;

  const unit = String(payload.unit).trim();

  const qty = normalizeNumber(payload.qty, { allowNull: false });
  const price = normalizeNumber(payload.price);
  const shipping = normalizeNumber(payload.shipping);
  const tax = normalizeNumber(payload.tax);

  const vendor =
    payload.vendor && String(payload.vendor).trim().length > 0
      ? String(payload.vendor).trim()
      : null;

  const purchaseDate = normalizeDate(payload.purchaseDate);
  const url =
    payload.url && String(payload.url).trim().length > 0
      ? String(payload.url).trim()
      : null;

  const imageUrl =
    payload.imageUrl && String(payload.imageUrl).trim().length > 0
      ? String(payload.imageUrl).trim()
      : null;

  const status =
    payload.status && String(payload.status).trim().length > 0
      ? String(payload.status).trim().toLowerCase()
      : 'active';

  const notes =
    payload.notes && String(payload.notes).trim().length > 0
      ? String(payload.notes).trim()
      : null;

  const sql = `
    INSERT INTO purchases (
      lot_id,
      component_type,
      case_condition,
      caliber,
      brand,
      name,
      type_detail,
      qty,
      unit,
      price,
      shipping,
      tax,
      vendor,
      purchase_date,
      url,
      image_url,
      status,
      notes
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18
    )
    RETURNING
      id,
      lot_id,
      component_type,
      case_condition,
      caliber,
      brand,
      name,
      type_detail,
      qty,
      unit,
      price,
      shipping,
      tax,
      vendor,
      purchase_date,
      url,
      image_url,
      status,
      notes,
      created_at,
      updated_at
  `;

  const params = [
    lotId,
    componentType,
    caseCondition,
    caliber,
    brand,
    name,
    typeDetail,
    qty,
    unit,
    price,
    shipping,
    tax,
    vendor,
    purchaseDate,
    url,
    imageUrl,
    status,
    notes,
  ];

  const result = await query(sql, params);
  return mapPurchaseRowToJson(result.rows[0]);
}

/**
 * Update an existing purchase by numeric ID.
 * Partial updates are allowed (only provided fields are changed).
 */
export async function updatePurchase(id, updates) {
  if (!id) {
    throw new ValidationError('id is required for update.');
  }
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
    if (!column) {
      continue; // ignore unknown keys so API can send extra fields safely
    }

    let normalizedValue = value;

    if (numericFields.includes(key)) {
      normalizedValue = normalizeNumber(value, { allowNull: true });
    } else if (dateFields.includes(key)) {
      normalizedValue = normalizeDate(value);
    } else if (key === 'componentType' || key === 'caseCondition') {
      normalizedValue =
        value && String(value).trim().length > 0
          ? String(value).trim().toLowerCase()
          : null;
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
    UPDATE purchases
    SET
      ${setParts.join(', ')},
      updated_at = NOW()
    WHERE id = $${idx}
    RETURNING
      id,
      lot_id,
      component_type,
      case_condition,
      caliber,
      brand,
      name,
      type_detail,
      qty,
      unit,
      price,
      shipping,
      tax,
      vendor,
      purchase_date,
      url,
      image_url,
      status,
      notes,
      created_at,
      updated_at
  `;

  values.push(Number(id));

  const result = await query(sql, values);

  if (result.rows.length === 0) {
    throw new NotFoundError(`Purchase with id ${id} not found.`);
  }

  return mapPurchaseRowToJson(result.rows[0]);
}

/**
 * Delete a purchase by ID.
 * NOTE: In most cases, you may prefer using status='depleted'
 * via updatePurchase instead of hard delete.
 */
export async function deletePurchase(id) {
  if (!id) {
    throw new ValidationError('id is required for delete.');
  }

  const sql = 'DELETE FROM purchases WHERE id = $1';
  const result = await query(sql, [Number(id)]);

  if (result.rowCount === 0) {
    throw new NotFoundError(`Purchase with id ${id} not found.`);
  }
}

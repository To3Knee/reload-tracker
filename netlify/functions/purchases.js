//===============================================================
//Script Name: Reload Tracker Purchases Function
//Script Location: netlify/functions/purchases.js
//Date: 11/26/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 0.1.1
//About: Netlify Function HTTP handler for Reload Tracker LOTs /
//       purchases API. Routes HTTP methods to the backend
//       purchasesService and returns JSON responses.
//===============================================================

import {
  listPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../../backend/purchasesService.js';
import { ValidationError, NotFoundError } from '../../backend/errors.js';

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(statusCode, payload) {
  if (statusCode === 204) {
    return {
      statusCode,
      headers: baseHeaders,
      body: '',
    };
  }

  return {
    statusCode,
    headers: baseHeaders,
    body: JSON.stringify(payload ?? {}),
  };
}

/**
 * Extract numeric ID from Netlify’s internal path.
 *
 * Incoming paths look like:
 *   /.netlify/functions/purchases
 *   /.netlify/functions/purchases/123
 */
function extractIdFromPath(path) {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  const idx = parts.indexOf('purchases');
  if (idx === -1) return null;
  const maybeId = parts[idx + 1];
  if (!maybeId) return null;
  const n = Number(maybeId);
  return Number.isNaN(n) ? null : n;
}

export async function handler(event /*, context */) {
  try {
    const method = event.httpMethod || 'GET';

    // Basic CORS / preflight
    if (method === 'OPTIONS') {
      return jsonResponse(204, null);
    }

    const id = extractIdFromPath(event.path || '');
    const query = event.queryStringParameters || {};

    if (method === 'GET') {
      // List purchases; optional filters: status, componentType, caliber
      const filters = {
        status: query.status || undefined,
        componentType: query.componentType || undefined,
        caliber: query.caliber || undefined,
      };
      const purchases = await listPurchases(filters);
      return jsonResponse(200, purchases);
    }

    // Parse JSON body for write operations
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'POST') {
      const created = await createPurchase(body);
      return jsonResponse(201, created);
    }

    if (method === 'PUT') {
      if (!id) {
        return jsonResponse(400, { message: 'Missing id in path.' });
      }
      const updated = await updatePurchase(id, body);
      return jsonResponse(200, updated);
    }

    if (method === 'DELETE') {
      if (!id) {
        return jsonResponse(400, { message: 'Missing id in path.' });
      }
      await deletePurchase(id);
      return jsonResponse(204, null);
    }

    return jsonResponse(405, { message: `Method ${method} not allowed.` });
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse(400, { message: err.message });
    }
    if (err instanceof NotFoundError) {
      return jsonResponse(404, { message: err.message });
    }

    console.error('[purchases] Internal error:', err);
    return jsonResponse(500, { message: 'Internal server error.' });
  }
}

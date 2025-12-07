//===============================================================
//Script Name: Reload Tracker Purchases Function
//Script Location: netlify/functions/purchases.js
//Date: 12/07/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.2.0
//About: Netlify Function HTTP handler for Reload Tracker LOTs.
//       - Fix: DELETE now returns 200 OK with JSON to prevent client parsing errors.
//===============================================================

import {
  listPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../../backend/purchasesService.js';
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js';
import { ValidationError, NotFoundError } from '../../backend/errors.js';

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(statusCode, payload) {
  // Even for 204, we must be careful with headers, but switching to 200 
  // is the most robust fix for clients expecting JSON.
  return {
    statusCode,
    headers: baseHeaders,
    body: JSON.stringify(payload ?? {}),
  };
}

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

// Helper to get current user from cookies
async function getCurrentUser(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(v || '');
  });

  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  
  return await getUserForSessionToken(token);
}

export async function handler(event /*, context */) {
  try {
    const method = event.httpMethod || 'GET';

    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: baseHeaders, body: '' };
    }

    const id = extractIdFromPath(event.path || '');
    const query = event.queryStringParameters || {};
    const currentUser = await getCurrentUser(event);

    if (method === 'GET') {
      const filters = {
        status: query.status || undefined,
        componentType: query.componentType || undefined,
        caliber: query.caliber || undefined,
      };
      // Read-only access is public
      const purchases = await listPurchases(filters);
      return jsonResponse(200, purchases);
    }

    const body = event.body ? JSON.parse(event.body) : {};

    // Pass currentUser for write operations (enforced in service layer)
    if (method === 'POST') {
      const created = await createPurchase(body, currentUser);
      return jsonResponse(201, created);
    }

    if (method === 'PUT') {
      if (!id) return jsonResponse(400, { message: 'Missing id in path.' });
      const updated = await updatePurchase(id, body, currentUser);
      return jsonResponse(200, updated);
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { message: 'Missing id in path.' });
      await deletePurchase(id, currentUser);
      // FIX: Return 200 with JSON body instead of 204 Empty to satisfy client parsers
      return jsonResponse(200, { success: true });
    }

    return jsonResponse(405, { message: `Method ${method} not allowed.` });
  } catch (err) {
    if (err instanceof ValidationError) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('must be a reloader')) {
        return jsonResponse(403, { message: err.message });
      }
      return jsonResponse(400, { message: err.message });
    }
    if (err instanceof NotFoundError) {
      return jsonResponse(404, { message: err.message });
    }

    console.error('[purchases] Internal error:', err);
    return jsonResponse(500, { message: 'Internal server error.' });
  }
}
//===============================================================
//Script Name: Reload Tracker Recipes Function
//Script Location: netlify/functions/recipes.js
//Date: 11/28/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.1.0
//About: Netlify Function HTTP handler for Reload Tracker recipes
//       API. Now wires up Auth to enforce Admin access.
//===============================================================

import {
  listRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from '../../backend/recipesService.js';
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js';
import { ValidationError, NotFoundError } from '../../backend/errors.js';

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(statusCode, payload) {
  if (statusCode === 204) {
    return { statusCode, headers: baseHeaders, body: '' };
  }
  return {
    statusCode,
    headers: baseHeaders,
    body: JSON.stringify(payload ?? {}),
  };
}

function extractIdFromPath(path) {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  const idx = parts.indexOf('recipes');
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
      return jsonResponse(204, null);
    }

    const id = extractIdFromPath(event.path || '');
    const query = event.queryStringParameters || {};
    const currentUser = await getCurrentUser(event);

    if (method === 'GET') {
      const filters = {
        status: query.status || undefined,
        caliber: query.caliber || undefined,
      };
      // Read-only access is allowed for everyone (Shooters + Reloaders)
      const recipes = await listRecipes(filters);
      return jsonResponse(200, recipes);
    }

    const body = event.body ? JSON.parse(event.body) : {};

    // For write operations, currentUser is passed. The Service layer enforces Admin role.
    if (method === 'POST') {
      const created = await createRecipe(body, currentUser);
      return jsonResponse(201, created);
    }

    if (method === 'PUT') {
      if (!id) return jsonResponse(400, { message: 'Missing id in path.' });
      const updated = await updateRecipe(id, body, currentUser);
      return jsonResponse(200, updated);
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { message: 'Missing id in path.' });
      await deleteRecipe(id, currentUser);
      return jsonResponse(204, null);
    }

    return jsonResponse(405, { message: `Method ${method} not allowed.` });
  } catch (err) {
    if (err instanceof ValidationError) {
      // If auth failure message, return 401/403
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('must be a reloader')) {
        return jsonResponse(403, { message: err.message });
      }
      return jsonResponse(400, { message: err.message });
    }
    if (err instanceof NotFoundError) {
      return jsonResponse(404, { message: err.message });
    }

    console.error('[recipes] Internal error:', err);
    return jsonResponse(500, { message: 'Internal server error.' });
  }
}
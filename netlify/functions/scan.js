//===============================================================
//Script Name: Scan Function
//Script Location: netlify/functions/scan.js
//Date: 12/13/2025
//Created By: T03KNEE
//Version: 2.2.0 (Auth Fix & Crash Proof)
//About: Proxy for Barcode Lookup Services.
//       - FIX: Added Manual Cookie Parsing to solve "Unauthorized" errors.
//===============================================================

import { lookupBarcode } from '../../backend/barcodeService.js';
import { getUserForSessionToken, SESSION_COOKIE_NAME } from '../../backend/authService.js';
import { query } from '../../backend/dbClient.js'; // Needed for fallback auth

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper: Manually parse cookies if standard auth fails
function parseCookies(header) {
    const list = {};
    if (!header) return list;
    header.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
}

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: baseHeaders, body: '' };

  try {
      // 1. ROBUST AUTH CHECK
      const cookieHeader = event.headers.cookie || event.headers.Cookie;
      let user = null;

      // Attempt A: Standard Auth Service — extract token from cookie header first
      if (cookieHeader) {
          const parsedCookies = parseCookies(cookieHeader);
          const sessionToken = parsedCookies[SESSION_COOKIE_NAME];
          if (sessionToken) {
              user = await getUserForSessionToken(sessionToken);
          }
      }

      // Attempt B: Manual Fallback (Fixes "Unauthorized" on Dev)
      if (!user && cookieHeader) {
          console.warn("[SCAN] Standard Auth failed. Trying fallback...");
          const cookies = parseCookies(cookieHeader);
          const token = cookies[SESSION_COOKIE_NAME] || cookies['reload_tracker_session'];
          
          if (token) {
              const res = await query(
                  `SELECT u.id, u.username, u.role FROM sessions s 
                   JOIN users u ON s.user_id = u.id 
                   WHERE s.token = $1 AND s.expires_at > NOW()`, 
                  [token]
              );
              if (res.rows.length > 0) user = res.rows[0];
          }
      }

      if (!user) {
          console.error("[SCAN] Auth Failed: No valid session found.");
          // This 401 is for the USER, not the API Key
          return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ message: 'User session invalid. Please log in again.' }) };
      }

      // 2. INPUT VALIDATION
      if (!event.body) throw new Error("Missing request body");
      const body = JSON.parse(event.body);
      const code = body.code;

      if (!code) throw new Error("No barcode provided");

      // 3. EXECUTE LOOKUP
      const data = await lookupBarcode(code);

      if (!data) {
          return { statusCode: 404, headers: baseHeaders, body: JSON.stringify({ message: 'Product not found in database' }) };
      }

      return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify({ success: true, data }),
      };

  } catch (error) {
    console.error('[SCAN] Error:', error);
    // If the error comes from the Provider (e.g. Invalid API Key), pass it through
    const status = error.message.includes("API Key") ? 403 : 500;
    return {
      statusCode: status,
      headers: baseHeaders,
      body: JSON.stringify({ message: error.message || 'Scan failed.' }),
    };
  }
}
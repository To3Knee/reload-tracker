//===============================================================
//Script Name: market.js
//Script Location: src/lib/market.js
//Date: 12/12/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 1.1.0 (Mobile Optimized)
//About: Client-side API for Market Watch with timeouts & robust error handling.
//===============================================================

// Ensure no trailing slash to prevent double-slash issues (e.g. //api/market)
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

/**
 * Internal helper to handle Fetch requests with timeouts and error parsing.
 * Mobile Optimization: Auto-aborts after 15s to prevent hanging on bad networks.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // 1. Mobile Network Timeout (15 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const config = {
    ...options,
    credentials: 'include', // Essential for your session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: controller.signal,
  };

  try {
    const res = await fetch(url, config);
    clearTimeout(timeoutId); // Clear timer on success

    // 2. Smart Error Parsing
    if (!res.ok) {
      let errorMessage = `Request failed: ${res.status} ${res.statusText}`;
      try {
        // Try to get the actual message from the backend JSON
        const errorBody = await res.json();
        if (errorBody.message) errorMessage = errorBody.message;
        else if (errorBody.error) errorMessage = errorBody.error;
      } catch (e) {
        // If parsing fails, stick to the status text
      }
      throw new Error(errorMessage);
    }

    // 3. Handle Empty Responses (204 No Content)
    if (res.status === 204) return null;

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    // Transform AbortError into a user-friendly timeout message
    if (err.name === 'AbortError') {
      throw new Error('Network timeout. Please check your signal and try again.');
    }
    throw err;
  }
}

/**
 * Get all market listings.
 * @returns {Promise<Array>} List of items
 */
export async function getMarketListings() {
  return await request('/market');
}

/**
 * Create a new market listing.
 * @param {Object} item - The item data
 * @returns {Promise<Object>} The created item
 */
export async function createMarketListing(item) {
  return await request('/market', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

/**
 * Update an existing listing.
 * @param {number|string} id - Item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} The updated item
 */
export async function updateMarketListing(id, updates) {
  return await request(`/market/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a listing.
 * @param {number|string} id - Item ID
 * @returns {Promise<boolean>} True on success
 */
export async function deleteMarketListing(id) {
  await request(`/market/${id}`, {
    method: 'DELETE',
  });
  return true;
}

/**
 * Refresh a listing (e.g. re-scrape price).
 * @param {number|string} id - Item ID
 * @returns {Promise<Object>} The refreshed item
 */
export async function refreshMarketListing(id) {
  return await request(`/market/${id}/refresh`, {
    method: 'POST',
  });
}
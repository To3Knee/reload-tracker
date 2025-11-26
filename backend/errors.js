//===============================================================
//Script Name: Reload Tracker Backend Errors
//Script Location: backend/errors.js
//Date: 11/26/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 0.1.1
//About: Common error classes and helpers used by the Reload
//       Tracker backend (Netlify Functions or self-hosted API).
//       ES-module version compatible with `type: "module"`.
//===============================================================

/**
 * ValidationError is thrown when incoming data fails validation.
 * It should map to HTTP 400 Bad Request.
 */
class ValidationError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} [details] - Optional extra info (field names, payload, etc.)
   */
  constructor(message, details = undefined) {
    super(message);
    this.name = 'ValidationError';
    if (details !== undefined) {
      this.details = details;
    }
  }
}

/**
 * NotFoundError is thrown when a requested resource doesn't exist.
 * It should map to HTTP 404 Not Found.
 */
class NotFoundError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {object} [details] - Optional extra info (ids, filters, etc.)
   */
  constructor(message, details = undefined) {
    super(message);
    this.name = 'NotFoundError';
    if (details !== undefined) {
      this.details = details;
    }
  }
}

/**
 * Map an error object to an HTTP response shape. This is a generic
 * helper you can use from any handler if you prefer centralized
 * error-to-response mapping instead of per-function catch blocks.
 *
 * NOTE:
 * Netlify Functions expect an object: { statusCode, headers?, body }
 * where body is a string (usually JSON).
 *
 * @param {unknown} err - Error instance or unknown thrown value.
 * @param {object} [opts] - Optional overrides.
 * @param {Record<string,string>} [opts.headers] - Extra headers to merge.
 * @returns {{ statusCode: number, headers: Record<string,string>, body: string }}
 */
function toHttpError(err, opts = {}) {
  const baseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const headers = {
    ...baseHeaders,
    ...(opts.headers || {}),
  };

  // Default values
  let statusCode = 500;
  let name = 'Error';
  let message = 'An error occurred.';

  if (err instanceof ValidationError) {
    statusCode = 400;
    name = err.name;
    message = err.message || 'Validation error.';
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    name = err.name;
    message = err.message || 'Resource not found.';
  } else if (err instanceof Error) {
    // Generic Error, keep stack internal but surface message
    name = err.name || 'Error';
    message = err.message || message;
  } else if (typeof err === 'string') {
    // Non-Error thrown (string)
    message = err;
  }

  const bodyPayload = {
    error: name,
    message,
  };

  // Attach details if present on our custom errors
  if (err && typeof err === 'object' && 'details' in err && err.details) {
    bodyPayload.details = err.details;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(bodyPayload),
  };
}

// ES module exports
export { ValidationError, NotFoundError, toHttpError };

//===============================================================
//Script Name: Reload Tracker DB Client
//Script Location: backend/dbClient.js
//Date: 11/26/2025
//Created By: T03KNEE
//Github: https://github.com/To3Knee/reload-tracker
//Version: 0.1.2
//About: PostgreSQL client wrapper used by Reload Tracker backend
//       services. Works on Netlify Functions (including Netlify
//       DB / Neon) or self-hosted environments.
//
//       Connection-string resolution priority:
//         1) DATABASE_URL (portable / self-host friendly)
//         2) NETLIFY_DATABASE_URL (Netlify DB pooled)
//         3) NETLIFY_DATABASE_URL_UNPOOLED (fallback)
//===============================================================

import { Pool } from 'pg';

let poolInstance = null;

/**
 * Resolve the Postgres connection string from environment variables.
 *
 * Priority:
 *   1. DATABASE_URL
 *   2. NETLIFY_DATABASE_URL
 *   3. NETLIFY_DATABASE_URL_UNPOOLED
 */
function resolveConnectionString() {
  const explicit =
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
  if (explicit) {
    return explicit;
  }

  const netlifyPooled =
    process.env.NETLIFY_DATABASE_URL &&
    process.env.NETLIFY_DATABASE_URL.trim();
  if (netlifyPooled) {
    console.log(
      '[Reload Tracker DB] Using NETLIFY_DATABASE_URL as connection string.'
    );
    return netlifyPooled;
  }

  const netlifyUnpooled =
    process.env.NETLIFY_DATABASE_URL_UNPOOLED &&
    process.env.NETLIFY_DATABASE_URL_UNPOOLED.trim();
  if (netlifyUnpooled) {
    console.log(
      '[Reload Tracker DB] Using NETLIFY_DATABASE_URL_UNPOOLED as connection string.'
    );
    return netlifyUnpooled;
  }

  console.error(
    '[Reload Tracker DB] No database connection string found. ' +
      'Set DATABASE_URL, or ensure Netlify DB exposes NETLIFY_DATABASE_URL.'
  );
  throw new Error(
    'No Postgres connection string configured for Reload Tracker backend.'
  );
}

/**
 * Build SSL configuration for Postgres.
 *
 * - If PGSSLMODE=disable → SSL disabled.
 * - Otherwise → use SSL with rejectUnauthorized=false to play nice
 *   with managed providers (Neon, etc.).
 */
function getSslConfig() {
  const mode = (process.env.PGSSLMODE || '').toLowerCase();
  if (mode === 'disable') {
    return false;
  }
  return { rejectUnauthorized: false };
}

/**
 * Lazily-initialized Pool instance so that serverless environments
 * (Netlify Functions) can reuse connections between invocations.
 */
function getPool() {
  if (poolInstance) {
    return poolInstance;
  }

  const connectionString = resolveConnectionString();

  poolInstance = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    ssl: getSslConfig(),
  });

  poolInstance.on('error', (err) => {
    console.error('[Reload Tracker DB] Pool error:', err);
  });

  return poolInstance;
}

/**
 * Execute a parameterized SQL query.
 *
 * @param {string} text SQL with $1, $2 placeholders
 * @param {Array<any>} params Parameter values
 */
export async function query(text, params = []) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

//===============================================================
//Script Name: Reload Tracker Settings Service
//Script Location: backend/settingsService.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Manage global app settings (feature flags).
//===============================================================

import { query } from './dbClient.js'

export async function getSettings() {
  const sql = `SELECT key, value FROM settings`
  const res = await query(sql)
  
  // Convert rows to object { key: value }
  const settings = {}
  res.rows.forEach(r => {
    settings[r.key] = r.value
  })
  
  // Check if API Key is physically present in Env (for status checks)
  settings.hasAiKey = !!process.env.GEMINI_API_KEY
  
  return settings
}

export async function updateSetting(key, value, currentUser) {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Admin access required to change settings.')
  }

  const sql = `
    INSERT INTO settings (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, updated_at = NOW()
    RETURNING key, value
  `
  const res = await query(sql, [key, String(value)])
  return { [res.rows[0].key]: res.rows[0].value }
}
//===============================================================
//Script Name: Reload Tracker Settings Service
//Script Location: backend/settingsService.js
//Date: 12/09/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Manage system-wide configuration (AI Keys, etc).
//===============================================================

import { query } from './dbClient.js'

export async function getSettings() {
    const res = await query('SELECT key, value FROM settings')
    const settings = {}
    res.rows.forEach(row => {
        settings[row.key] = row.value
    })
    return settings
}

export async function saveSetting(key, value) {
    if (!key) throw new Error("Setting key is required")
    
    // Upsert logic (Insert if new, Update if exists)
    const sql = `
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, NOW()) 
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        RETURNING *;
    `
    const res = await query(sql, [key, String(value)])
    return res.rows[0]
}
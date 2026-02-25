//===============================================================
//Script Name: Reload Tracker System Service
//Script Location: backend/systemService.js
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Super Admin capabilities (SQL Execution, Config).
//===============================================================

import { query } from './dbClient.js'
import { ValidationError } from './errors.js'

export async function executeRawSql(sqlString, currentUser) {
    // 1. Security Check: Only specific Admins (ID 1 or strict role check)
    // For now, we trust the 'admin' role, but in enterprise this is dangerous.
    if (currentUser.role !== 'admin') {
        throw new ValidationError('Unauthorized: Super Admin access required.')
    }

    // 2. Safety Block — normalize whitespace to defeat spacing/newline bypasses
    const normalized = sqlString.toLowerCase().replace(/\s+/g, ' ')
    const blocked = [
        'drop table', 'drop database', 'drop schema', 'drop index',
        'truncate', 'pg_read_file', 'pg_write_file', 'copy ', 'lo_import', 'lo_export'
    ]
    const hit = blocked.find(b => normalized.includes(b))
    if (hit) {
        throw new ValidationError(`Safety Block: "${hit.trim().toUpperCase()}" is not allowed via Web Console.`)
    }

    // 3. Execution
    try {
        const start = Date.now()
        const res = await query(sqlString)
        const duration = Date.now() - start
        
        return {
            success: true,
            message: `Executed in ${duration}ms`,
            rowCount: res.rowCount,
            rows: res.rows // Return data if it was a SELECT
        }
    } catch (err) {
        return {
            success: false,
            error: err.message,
            position: err.position
        }
    }
}
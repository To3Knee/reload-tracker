//===============================================================
//Script Name: range.js
//Script Location: netlify/functions/range.js
//Date: 11/29/2025
//Created By: T03KNEE
//Version: 1.0.1
//About: Serverless function for Range Logs (ESM Version).
//===============================================================

import pg from 'pg'
const { Client } = pg

// Database connection config
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

export const handler = async (event, context) => {
  // 1. Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const client = new Client(dbConfig)
  
  try {
    await client.connect()
    
    // 2. GET: List all logs
    if (event.httpMethod === 'GET') {
      const result = await client.query(`
        SELECT 
          rl.*,
          r.name as recipe_name,
          r.caliber,
          rl.distance_yards as distance,
          rl.group_size_inches as "groupSize",
          rl.velocity_fps as velocity,
          rl.temp_f as temp,
          rl.image_url as "imageUrl",
          rl.recipe_id as "recipeId",
          rl.batch_id as "batchId"
        FROM range_logs rl
        LEFT JOIN recipes r ON rl.recipe_id = r.id
        ORDER BY rl.date DESC, rl.created_at DESC
      `)
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ logs: result.rows })
      }
    }

    // 3. POST: Create new log
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body)
      
      const query = `
        INSERT INTO range_logs 
        (recipe_id, batch_id, date, location, distance_yards, group_size_inches, velocity_fps, sd, es, weather, temp_f, notes, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `
      
      const values = [
        data.recipeId || null,
        data.batchId || null,
        data.date,
        data.location || '',
        data.distance || null,
        data.groupSize || null,
        data.velocity || null,
        data.sd || null,
        data.es || null,
        data.weather || '',
        data.temp || null,
        data.notes || '',
        data.imageUrl || ''
      ]

      const result = await client.query(query, values)
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, id: result.rows[0].id })
      }
    }

    // 4. PUT: Update existing log
    if (event.httpMethod === 'PUT') {
      const pathParts = event.path.split('/')
      const id = pathParts[pathParts.length - 1]
      const data = JSON.parse(event.body)

      const query = `
        UPDATE range_logs SET
          recipe_id = $1,
          batch_id = $2,
          date = $3,
          location = $4,
          distance_yards = $5,
          group_size_inches = $6,
          velocity_fps = $7,
          sd = $8,
          es = $9,
          weather = $10,
          temp_f = $11,
          notes = $12,
          image_url = $13,
          updated_at = NOW()
        WHERE id = $14
      `
      
      const values = [
        data.recipeId || null,
        data.batchId || null,
        data.date,
        data.location || '',
        data.distance || null,
        data.groupSize || null,
        data.velocity || null,
        data.sd || null,
        data.es || null,
        data.weather || '',
        data.temp || null,
        data.notes || '',
        data.imageUrl || '',
        id
      ]

      await client.query(query, values)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    // 5. DELETE: Remove log
    if (event.httpMethod === 'DELETE') {
      const pathParts = event.path.split('/')
      const id = pathParts[pathParts.length - 1]

      await client.query('DELETE FROM range_logs WHERE id = $1', [id])

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' }

  } catch (err) {
    console.error('Range API Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: err.message })
    }
  } finally {
    await client.end()
  }
}
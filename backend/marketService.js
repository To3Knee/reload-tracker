//===============================================================
//Script Name: Reload Tracker Market Service
//Script Location: backend/marketService.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 3.1.0 (Robust AI Parsing)
//About: Scrapes web data for reloading components.
//       - FIX: Added Regex to extract JSON from chatty AI responses.
//===============================================================

import { query } from './dbClient.js'
import { chatWithAi } from './aiService.js'

export async function listMarket(userId) {
    const res = await query(
        `SELECT * FROM market_listings WHERE user_id = $1 ORDER BY last_scraped_at DESC`,
        [userId]
    )
    return res.rows
}

export async function addListing(item, userId) {
    const { url, name } = item
    const res = await query(
        `INSERT INTO market_listings (user_id, url, name, price, in_stock, status) 
         VALUES ($1, $2, $3, 0, false, 'pending') 
         RETURNING *`,
        [userId, url, name || 'New Item']
    )
    return res.rows[0]
}

export async function deleteListing(id, userId) {
    await query(`DELETE FROM market_listings WHERE id = $1 AND user_id = $2`, [id, userId])
    return { success: true }
}

export async function updateListing(id, data, userId) {
    const { name, price, in_stock, notes } = data
    const res = await query(
        `UPDATE market_listings 
         SET name = COALESCE($1, name), 
             price = COALESCE($2, price), 
             in_stock = COALESCE($3, in_stock),
             notes = COALESCE($4, notes)
         WHERE id = $5 AND user_id = $6 
         RETURNING *`,
        [name, price, in_stock, notes, id, userId]
    )
    return res.rows[0]
}

// --- INTELLIGENT SCRAPER ---
export async function refreshListing(id, userId) {
    const itemRes = await query(`SELECT url FROM market_listings WHERE id = $1 AND user_id = $2`, [id, userId])
    if (itemRes.rows.length === 0) throw new Error("Item not found")
    const url = itemRes.rows[0].url

    try {
        // 1. Fetch Raw HTML (Fake User Agent to avoid blocks)
        const response = await fetch(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        })
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`)
        const html = await response.text()

        // 2. Truncate to save tokens (Head + Body start is usually enough)
        const cleanHtml = html.substring(0, 40000).replace(/\s+/g, ' ');

        // 3. Ask AI to extract data
        const prompt = `
            Analyze this HTML snippet from a product page.
            Extract the following fields into a strict JSON object:
            {
                "name": "Exact Product Title",
                "price": 0.00 (Number, numeric value only),
                "in_stock": true/false (Boolean),
                "image_url": "Full HTTP URL to main product image"
            }
            HTML: ${cleanHtml}
            
            IMPORTANT: Return ONLY the raw JSON. No markdown, no conversational text.
        `;

        const aiResponse = await chatWithAi(prompt);
        
        // 4. ROBUST PARSING (The Fix)
        // Find the JSON object starting with { and ending with }
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            console.error("AI Response was not JSON:", aiResponse);
            throw new Error("AI returned invalid data format.");
        }

        const data = JSON.parse(jsonMatch[0]);

        // 5. Update Database
        const updateRes = await query(
            `UPDATE market_listings 
             SET name = $1, price = $2, in_stock = $3, image_url = $4, status = 'active', last_scraped_at = NOW() 
             WHERE id = $5 AND user_id = $6 
             RETURNING *`,
            [data.name, data.price, data.in_stock, data.image_url, id, userId]
        )

        return updateRes.rows[0];

    } catch (err) {
        console.error("Scrape Error:", err);
        await query(`UPDATE market_listings SET status = 'error' WHERE id = $1`, [id]);
        throw new Error("Scrape failed: " + err.message);
    }
}
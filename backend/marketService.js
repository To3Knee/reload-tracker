//===============================================================
//Script Name: Reload Tracker Market Service
//Script Location: backend/marketService.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 2.1.0 (Fixed Exports)
//About: Scrapes web data for reloading components.
//       - FIX: Restored function names to match API requirements.
//       - FEATURE: Uses OpenRouter via aiService for scraping.
//===============================================================

import { query } from './dbClient.js'
import { chatWithAi } from './aiService.js'

// --- DATABASE FUNCTIONS (Exported with names expected by market.js) ---

export async function listMarket(userId) {
    const res = await query(
        `SELECT * FROM market_listings WHERE user_id = $1 ORDER BY last_scraped_at DESC`,
        [userId]
    )
    return res.rows
}

export async function addListing(item, userId) {
    const { url, name } = item
    // Insert with 'pending' status; the scraper will populate the rest later
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
    // Manually update fields if needed (not via scraper)
    const { name, price, in_stock } = data
    const res = await query(
        `UPDATE market_listings 
         SET name = COALESCE($1, name), 
             price = COALESCE($2, price), 
             in_stock = COALESCE($3, in_stock) 
         WHERE id = $4 AND user_id = $5 
         RETURNING *`,
        [name, price, in_stock, id, userId]
    )
    return res.rows[0]
}

// --- SCRAPING ENGINE (Mapped to refreshListing) ---

export async function refreshListing(id, userId) {
    // 1. Get the item URL
    const itemRes = await query(`SELECT url FROM market_listings WHERE id = $1 AND user_id = $2`, [id, userId])
    if (itemRes.rows.length === 0) throw new Error("Item not found")
    const url = itemRes.rows[0].url

    try {
        // 2. Fetch Raw HTML
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReloadTracker/1.0)' }
        })
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`)
        const html = await response.text()

        // 3. Truncate HTML to fit in AI context (Save tokens)
        const cleanHtml = html.substring(0, 50000).replace(/\s+/g, ' ');

        // 4. Ask AI to extract data
        const prompt = `
            Analyze this raw HTML from a reloading supply website.
            Extract the following details into a strict JSON format:
            {
                "name": "Product Title",
                "price": 0.00 (Number only),
                "in_stock": true/false (Boolean),
                "image_url": "URL to main product image"
            }
            
            Rules:
            - If "Add to Cart" is present, in_stock is true.
            - If "Out of Stock" or "Notify Me", in_stock is false.
            - Return ONLY the JSON string. No markdown.
            
            HTML:
            ${cleanHtml}
        `;

        // Use the new OpenRouter Service
        const aiResponse = await chatWithAi(prompt);
        
        // Clean the response
        const jsonStr = aiResponse.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonStr);

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
        throw new Error("Failed to scrape: " + err.message);
    }
}
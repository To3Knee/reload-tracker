//===============================================================
//Script Name: Reload Tracker Market Service
//Script Location: backend/marketService.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 4.2.0 (Full Data Extraction)
//About: Scrapes web data.
//       - FIX: Saves Qty, Vendor, Category on Edit.
//       - FIX: AI now guesses Qty and Vendor automatically.
//===============================================================

import { query } from './dbClient.js'
import { chatWithAi } from './aiService.js'
import * as cheerio from 'cheerio'

// Bypass SSL for scraping
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    // FIX: Added missing fields (qty, category, vendor)
    const { name, price, in_stock, notes, qty_per_unit, category, vendor } = data
    const res = await query(
        `UPDATE market_listings 
         SET name = COALESCE($1, name), 
             price = COALESCE($2, price), 
             in_stock = COALESCE($3, in_stock),
             notes = COALESCE($4, notes),
             qty_per_unit = COALESCE($5, qty_per_unit),
             category = COALESCE($6, category),
             vendor = COALESCE($7, vendor)
         WHERE id = $8 AND user_id = $9 
         RETURNING *`,
        [name, price, in_stock, notes, qty_per_unit, category, vendor, id, userId]
    )
    return res.rows[0]
}

// --- HYBRID INTELLIGENT SCRAPER ---
export async function refreshListing(id, userId) {
    const itemRes = await query(`SELECT url FROM market_listings WHERE id = $1 AND user_id = $2`, [id, userId])
    if (itemRes.rows.length === 0) throw new Error("Item not found")
    const url = itemRes.rows[0].url

    try {
        // 1. SETUP FETCH
        const scraperKey = process.env.SCRAPER_API_KEY
        let fetchUrl = url
        if (scraperKey) {
            fetchUrl = `http://api.scrape.do?token=${scraperKey}&url=${encodeURIComponent(url)}`
        }

        const response = await fetch(fetchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        })
        
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`)
        const html = await response.text()

        // 2. PARSE WITH CHEERIO
        const $ = cheerio.load(html)
        
        let title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Unknown Item';
        let image = $('meta[property="og:image"]').attr('content');
        
        if (!image) {
            image = $('img[id*="product"], img[class*="product"], img[class*="main"]').first().attr('src');
        }
        if (image && image.startsWith('/')) {
            const u = new URL(url);
            image = `${u.protocol}//${u.host}${image}`;
        }

        // 3. GUESS VENDOR FROM URL
        let vendor = '';
        try {
            const hostname = new URL(url).hostname.replace('www.', '');
            vendor = hostname.split('.')[0]; // e.g. midwayusa.com -> midwayusa
            vendor = vendor.charAt(0).toUpperCase() + vendor.slice(1);
        } catch (e) {}

        // 4. CLEAN HTML FOR AI
        $('script').remove(); $('style').remove(); $('nav').remove(); $('footer').remove(); $('svg').remove();
        const cleanText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);

        // 5. ASK AI FOR DATA
        const prompt = `
            Analyze this product page. Extract:
            1. PRICE (Number).
            2. IN_STOCK (Boolean).
            3. QUANTITY (Number of items in this pack). E.g. "1000 primers" = 1000. "8 lbs" = 8. "500 rounds" = 500. Default to 1 if unknown.
            
            JSON Format:
            {
                "price": 0.00,
                "in_stock": true,
                "qty": 1
            }

            Page Text:
            ${cleanText}
        `;

        const aiResponse = await chatWithAi(prompt);
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI parsing failed.");
        
        const data = JSON.parse(jsonMatch[0]);

        // 6. UPDATE DATABASE
        const updateRes = await query(
            `UPDATE market_listings 
             SET name = $1, price = $2, in_stock = $3, image_url = $4, qty_per_unit = $5, vendor = $6, status = 'active', last_scraped_at = NOW() 
             WHERE id = $7 AND user_id = $8 
             RETURNING *`,
            [title.trim(), data.price || 0, data.in_stock, image, data.qty || 1, vendor, id, userId]
        )

        return updateRes.rows[0];

    } catch (err) {
        console.error("Scrape Error:", err);
        await query(`UPDATE market_listings SET status = 'error' WHERE id = $1`, [id]);
        throw new Error("Scan failed: " + err.message);
    }
}
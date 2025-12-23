//===============================================================
//Script Name: Reload Tracker Market Service
//Script Location: backend/marketService.js
//Date: 12/19/2025
//Created By: T03KNEE
//Version: 5.3.0 (Field Mapping Fix)
//About: Scrapes web data.
//       - FIX: Mapped DB 'category' to Frontend 'componentType'.
//       - FIX: Ensures classification persists after refresh.
//===============================================================

import { query } from './dbClient.js'
import { chatWithAi } from './aiService.js'
import * as cheerio from 'cheerio'

// Bypass SSL for scraping
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function listMarket(userId) {
    // FIX: Aliased 'category' as 'componentType' so the frontend recognizes it
    const res = await query(
        `SELECT *, category as "componentType" FROM market_listings ORDER BY last_scraped_at DESC LIMIT 100`
    )
    return res.rows
}

export async function addListing(item, userId) {
    const { url, name, componentType } = item 
    
    // Insert using 'componentType' as 'category'
    const res = await query(
        `INSERT INTO market_listings (user_id, url, name, price, in_stock, status, category) 
         VALUES ($1, $2, $3, 0, false, 'pending', $4) 
         RETURNING *, category as "componentType"`,
        [userId, url, name || 'Scanning...', componentType || 'other']
    )
    const newItem = res.rows[0]

    try {
        console.log(`[Market] Auto-scraping new item: ${newItem.id}`);
        return await refreshListing(newItem.id, userId);
    } catch (err) {
        console.error("[Market] Auto-scrape failed, returning placeholder:", err);
        return newItem;
    }
}

export async function deleteListing(id, userId) {
    const res = await query(`DELETE FROM market_listings WHERE id = $1 RETURNING id`, [id])
    if (res.rowCount === 0) throw new Error("Item Not Found")
    return { success: true }
}

export async function updateListing(id, data, userId) {
    // Handle both field names to be safe
    const { name, price, in_stock, notes, qty_per_unit, componentType, category, vendor } = data
    
    // Use componentType if present, fallback to category
    const finalCategory = componentType || category;

    const res = await query(
        `UPDATE market_listings 
         SET name = COALESCE($1, name), 
             price = COALESCE($2, price), 
             in_stock = COALESCE($3, in_stock),
             notes = COALESCE($4, notes),
             qty_per_unit = COALESCE($5, qty_per_unit),
             category = COALESCE($6, category),
             vendor = COALESCE($7, vendor)
         WHERE id = $8 
         RETURNING *, category as "componentType"`,
        [name, price, in_stock, notes, qty_per_unit, finalCategory, vendor, id]
    )
    if (res.rowCount === 0) {
        throw new Error("Item Not Found")
    }
    return res.rows[0]
}

// --- HYBRID INTELLIGENT SCRAPER ---
export async function refreshListing(id, userId) {
    const itemRes = await query(`SELECT url FROM market_listings WHERE id = $1`, [id])
    if (itemRes.rows.length === 0) throw new Error("Item not found")
    const url = itemRes.rows[0].url

    try {
        const scraperKey = process.env.SCRAPER_API_KEY
        let fetchUrl = url
        
        const headers = { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Referer': 'https://www.google.com/',
            'Cache-Control': 'max-age=0'
        }

        if (scraperKey) {
            fetchUrl = `http://api.scrape.do?token=${scraperKey}&url=${encodeURIComponent(url)}`
        }

        const response = await fetch(fetchUrl, { headers })
        
        if (!response.ok) {
            if (response.status === 403) throw new Error("Access Denied (403) - Anti-Bot Blocked");
            throw new Error(`HTTP Error ${response.status}`);
        }
        const html = await response.text()
        const $ = cheerio.load(html)
        
        let title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Unknown Item';
        let image = $('meta[property="og:image"]').attr('content');
        
        const badTitles = ['Access Denied', 'Just a moment', 'Attention Required', 'Security Check', '403 Forbidden', 'Cloudflare'];
        if (badTitles.some(t => title.includes(t))) {
            throw new Error("Scraper Blocked (Soft 403)");
        }

        if (!image) {
            image = $('img[id*="product"], img[class*="product"], img[class*="main"]').first().attr('src');
        }
        if (image && image.startsWith('/')) {
            const u = new URL(url);
            image = `${u.protocol}//${u.host}${image}`;
        }

        let vendor = '';
        try {
            const hostname = new URL(url).hostname;
            const parts = hostname.split('.');
            if (parts.length >= 2) vendor = parts[parts.length - 2]; 
            else vendor = parts[0];
            vendor = vendor.charAt(0).toUpperCase() + vendor.slice(1);
            if (vendor === 'Co' || vendor === 'Com') vendor = parts[0];
        } catch (e) {}

        $('script').remove(); $('style').remove(); $('nav').remove(); $('footer').remove(); $('svg').remove();
        const cleanText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);

        const prompt = `
            Analyze this product page text. Extract:
            1. PRICE (Number).
            2. IN_STOCK (Boolean).
            3. QUANTITY (Number of items in this pack). 
            4. CATEGORY (String). Strictly one of: "powder", "primer", "bullet", "case", "ammo", "gear", "other".
            
            JSON Format: { "price": 0.00, "in_stock": true, "qty": 1, "category": "other" }
            Page Text: ${cleanText}
        `;

        const aiResponse = await chatWithAi(prompt);
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI parsing failed.");
        
        const data = JSON.parse(jsonMatch[0]);

        const updateRes = await query(
            `UPDATE market_listings 
             SET name = $1, price = $2, in_stock = $3, image_url = $4, qty_per_unit = $5, vendor = $6, category = $7, status = 'active', last_scraped_at = NOW() 
             WHERE id = $8 
             RETURNING *, category as "componentType"`,
            [title.trim(), data.price || 0, data.in_stock, image, data.qty || 1, vendor, data.category || 'other', id]
        )

        return updateRes.rows[0];

    } catch (err) {
        console.error("Scrape Error:", err);
        await query(`UPDATE market_listings SET status = 'error' WHERE id = $1`, [id]);
        return { id, status: 'error', name: 'Scrape Failed (Access Denied)' };
    }
}
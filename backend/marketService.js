//===============================================================
//Script Name: Reload Tracker Market Service
//Script Location: backend/marketService.js
//Date: 12/08/2025
//Created By: T03KNEE
//Version: 1.5.0
//About: Manages the Supply Chain watchlist.
//       - FIX: Added "Dumb Scraper" fallback for AI Rate Limits (429).
//===============================================================

import { query } from './dbClient.js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as cheerio from 'cheerio'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// Default to 1.5-flash-001 (Most stable/generous free tier)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" })

async function parseWithAI(htmlText, url) {
    const prompt = `
    You are a data extraction machine. Output ONLY raw JSON.
    
    Target URL: ${url}
    
    Extract these fields from the text below:
    {
      "name": "Product Title (Keep it short/clean)",
      "price": 0.00 (Number. If 'Out of Stock' but price is listed, use that price. If 0, try harder to find the price),
      "inStock": true (Boolean. Look for 'Add to Cart', 'Available', 'In Stock'. False if 'Out of Stock', 'Backorder', 'Notify Me'),
      "vendor": "Website Name",
      "category": "powder" (Enum: 'powder', 'primer', 'bullet', 'case', 'ammo', 'gear'),
      "quantity": 1 (Number of units in this pack. e.g. 8 for 8lb jug, 1000 for primers. Default 1)
    }
    
    HTML CONTENT:
    ${htmlText.substring(0, 20000)}
    `

    try {
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error("No JSON found")
        return JSON.parse(jsonMatch[0])
    } catch (e) {
        console.warn("AI Parse Failed (Rate Limit or Error). Switching to Fallback.")
        return null // Signal to use fallback
    }
}

// Helper: Manual Scraping Fallback
function parseManually($, url) {
    let title = $('meta[property="og:title"]').attr('content') || $('title').text()
    title = title.split('|')[0].split(':')[0].trim()

    let price = 0
    // Hunt for price
    const priceSelectors = ['.price', '.product-price', '.amount', '.offer-price', '#price_inside_buybox', '.a-price .a-offscreen']
    for (const sel of priceSelectors) {
        const txt = $(sel).first().text().trim()
        const match = txt.match(/[\d,]+\.?\d{2}/)
        if (match) {
            price = parseFloat(match[0].replace(/,/g, ''))
            break
        }
    }

    // Guess stock
    const text = $('body').text().toLowerCase()
    const inStock = text.includes('in stock') || text.includes('add to cart')

    return {
        name: title || "Unknown Item",
        price: price || 0,
        inStock: inStock,
        vendor: new URL(url).hostname.replace('www.', '').split('.')[0],
        category: 'other',
        quantity: 1
    }
}

export async function addListing(url, userId) {
    // 1. Scrape Raw HTML
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    
    // 2. Image Hunter (Always use Cheerio for this)
    let image = $('meta[property="og:image"]').attr('content')
    if (!image) {
        $('img').each((i, el) => {
            const src = $(el).attr('src')
            if (src && src.startsWith('http') && src.includes('product')) {
                image = src
                return false // break
            }
        })
    }

    // Clean for AI
    $('script, style, svg, path, footer, nav, iframe').remove() 
    const cleanText = $('body').text().replace(/\s+/g, ' ').trim()

    // 3. Try AI -> Fallback to Manual
    let data = await parseWithAI(cleanText, url)
    if (!data) {
        data = parseManually($, url)
    }

    // 4. Save
    const sql = `
        INSERT INTO market_listings (
            user_id, url, name, vendor, price, in_stock, qty_per_unit, category, image_url, last_scraped_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (url) DO UPDATE SET
            price = EXCLUDED.price,
            in_stock = EXCLUDED.in_stock,
            qty_per_unit = COALESCE(EXCLUDED.qty_per_unit, market_listings.qty_per_unit),
            image_url = COALESCE(EXCLUDED.image_url, market_listings.image_url),
            last_scraped_at = NOW()
        RETURNING *
    `
    const dbRes = await query(sql, [
        userId, url, data.name, data.vendor, data.price, data.inStock, data.quantity, data.category || 'other', image
    ])
    return dbRes.rows[0]
}

export async function refreshListing(id) {
    const lookup = await query(`SELECT url, user_id FROM market_listings WHERE id = $1`, [id])
    if (lookup.rows.length === 0) throw new Error("Listing not found")
    const { url, user_id } = lookup.rows[0]
    return await addListing(url, user_id)
}

export async function listMarket() {
    const res = await query(`SELECT * FROM market_listings ORDER BY category, price ASC`)
    return res.rows
}

export async function deleteListing(id) {
    await query(`DELETE FROM market_listings WHERE id = $1`, [id])
    return { success: true }
}

export async function updateListing(id, updates) {
    const fields = ['name', 'price', 'in_stock', 'category', 'qty_per_unit']
    const setParts = []
    const values = []
    let idx = 1
    
    for (const key of Object.keys(updates)) {
        if (fields.includes(key)) {
            let col = key
            if (key === 'in_stock') col = 'in_stock'
            setParts.push(`${col} = $${idx++}`)
            values.push(updates[key])
        }
    }
    
    if (setParts.length === 0) return
    values.push(id)
    
    await query(`UPDATE market_listings SET ${setParts.join(', ')} WHERE id = $${idx}`, values)
    return { success: true }
}
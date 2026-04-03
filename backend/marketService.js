
import { query } from './dbClient.js'
import { chatWithAi } from './aiService.js'
import * as cheerio from 'cheerio'

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
         VALUES ($1, $2, $3, 0, true, 'pending', $4)
         RETURNING *, category as "componentType"`,
        [userId, url, name || 'Scanning...', componentType || 'other']
    )
    const newItem = res.rows[0]

    // Attempt immediate scrape — if it fails, delete the placeholder and throw
    // so the frontend shows the real error instead of a broken "Scrape Failed" card
    try {
        return await refreshListing(newItem.id, userId)
    } catch (err) {
        await query(`DELETE FROM market_listings WHERE id = $1`, [newItem.id]).catch(() => {})
        throw err
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

// --- JSON-LD structured data extractor (schema.org/Product) ---
function parseJsonLd($) {
    const result = {}
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            let data = JSON.parse($(el).html())
            // Handle @graph array or direct object
            if (data['@graph']) data = data['@graph']
            const items = Array.isArray(data) ? data : [data]
            const product = items.find(d => d['@type'] === 'Product' || d['@type'] === 'IndividualProduct')
            if (!product) return
            if (product.name && !result.name) result.name = product.name
            if (product.image && !result.image) {
                result.image = Array.isArray(product.image) ? product.image[0] : product.image
            }
            const offers = product.offers
            const offer = Array.isArray(offers) ? offers[0] : offers
            if (offer) {
                if (offer.price != null && result.price == null) result.price = parseFloat(offer.price)
                if (offer.availability != null && result.inStock == null) {
                    result.inStock = offer.availability.toLowerCase().includes('instock')
                }
            }
        } catch (e) {}
    })
    return result
}

// --- Regex price fallback ---
// Takes the median of plausible product prices (> $3) to avoid grabbing shipping costs.
function extractPriceRegex(text) {
    const matches = text.match(/\$\s*(\d{1,4}(?:\.\d{1,2})?)/g)
    if (!matches) return null
    const prices = matches
        .map(m => parseFloat(m.replace(/[$\s]/g, '')))
        .filter(p => p > 3 && p < 9999)
    if (!prices.length) return null
    const sorted = [...prices].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
}

// --- Qty/pack-size extraction ---
function extractQtyRegex(text) {
    const patterns = [
        /(\d[\d,]*)\s*(?:count|ct\.?|rounds?|rds?|pieces?|pcs?)\b/i,
        /(?:box|pack|pkg\.?|package)\s+of\s+(\d[\d,]*)/i,
        /(?:per|\/)\s*box[^0-9]*(\d[\d,]*)/i,
        /(?:quantity|qty)[:\s]+(\d[\d,]*)/i,
        /(\d[\d,]*)\/(?:box|case|pack|pkg)/i,
    ]
    for (const pat of patterns) {
        const m = text.match(pat)
        if (m) {
            const n = parseInt(m[1].replace(/,/g, ''), 10)
            if (n >= 20 && n <= 10000) return n
        }
    }
    return null
}

// --- In-stock text detection ---
// Returns true/false/null. null means "can't tell" — caller should keep existing DB value.
function detectInStock(html) {
    const t = html.toLowerCase()
    // Explicit in-stock: JSON-LD value, "add to cart" button, visible "in stock" text
    // Avoid matching substrings like data-in-stock="false" by requiring word boundaries / quotes
    const inStockSignals = [
        /"instock"/,           // JSON-LD: "availability":"InStock"
        /\badd[\s-]to[\s-]cart\b/,
        /\bin\s+stock\b/,      // text: "In Stock", "2 in stock"
        /"availability"\s*:\s*"instock"/i,
    ]
    const outOfStockSignals = [
        /"outofstock"/,        // JSON-LD: "availability":"OutOfStock"
        /\bout\s+of\s+stock\b/,
        /\bsold\s+out\b/,
        /\bnotify\s+me\s+when\b/,
        /"availability"\s*:\s*"outofstock"/i,
    ]
    const isInStock  = inStockSignals.some(r  => r.test(t))
    const isOutStock = outOfStockSignals.some(r => r.test(t))

    if (isInStock  && !isOutStock) return true
    if (isOutStock && !isInStock)  return false
    // Conflicting or no signals — let caller keep existing value
    return null
}

// --- Category from URL + title keywords ---
function inferCategory(title, url) {
    const t = (title + ' ' + url).toLowerCase()
    if (t.match(/\bpowder\b|\bimr\b|\bhodgdon\b|\bvv\b|\bvihtavuori\b|\bh4350\b|\bvarget\b/)) return 'powder'
    if (t.match(/\bprimer\b|\blrp\b|\bsrp\b|\bsrm\b|\bcci 4\d\d\b|\bfederal 2\d\d\b/)) return 'primer'
    if (t.match(/\bbullet\b|\bprojectile\b|\bfmj\b|\bjhp\b|\bhpbt\b|\bboat.?tail\b/)) return 'bullet'
    if (t.match(/\bbrass\b|\bcase\b|\bcasings\b|\bshell\b|\bhull\b/)) return 'case'
    if (t.match(/\bammo\b|\bammunition\b|\bcartridge\b|\bround\b/)) return 'ammo'
    return 'other'
}

// --- Vendor from hostname ---
function extractVendor(url) {
    try {
        const hostname = new URL(url).hostname
        const parts = hostname.replace(/^www\./, '').split('.')
        const name = parts[0]
        return name.charAt(0).toUpperCase() + name.slice(1)
    } catch (e) { return '' }
}

// --- HYBRID SCRAPER: JSON-LD → Regex → AI (if key available) ---
export async function refreshListing(id, userId) {
    const itemRes = await query(`SELECT url, in_stock FROM market_listings WHERE id = $1`, [id])
    if (itemRes.rows.length === 0) throw new Error("Item not found")
    const url = itemRes.rows[0].url
    const existingInStock = itemRes.rows[0].in_stock

    try {
        let html

        const firecrawlUrl = process.env.FIRECRAWL_URL
        const firecrawlKey = process.env.FIRECRAWL_API_KEY

        if (firecrawlUrl) {
            // Firecrawl path — JS-rendered HTML, handles bot protection
            const fcRes = await fetch(`${firecrawlUrl}/v1/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(firecrawlKey && { 'X-Api-Key': firecrawlKey }),
                },
                body: JSON.stringify({ url, formats: ['html'] }),
            })
            if (!fcRes.ok) throw new Error(`Firecrawl HTTP ${fcRes.status}`)
            const fcData = await fcRes.json()
            if (!fcData.success) throw new Error(fcData.error || 'Firecrawl scrape failed')
            html = fcData.data?.html
            if (!html) throw new Error('Firecrawl returned no HTML')
        } else {
            // Fallback: direct fetch (works for simple sites, blocked by Cloudflare on major retailers)
            const scraperKey = process.env.SCRAPER_API_KEY
            const fetchUrl = scraperKey
                ? `http://api.scrape.do?token=${scraperKey}&url=${encodeURIComponent(url)}`
                : url
            const response = await fetch(fetchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.google.com/',
                },
            })
            if (!response.ok) throw new Error(`HTTP ${response.status} from site`)
            html = await response.text()
        }

        const $ = cheerio.load(html)

        // Bot-block detection (still relevant for fallback path)
        const rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
        const badTitles = ['Access Denied', 'Just a moment', 'Attention Required', 'Security Check', '403 Forbidden', 'Cloudflare']
        if (badTitles.some(t => rawTitle.includes(t))) throw new Error("Site blocked the request. Try again later.")

        // PASS 1: JSON-LD structured data (most reliable)
        const ld = parseJsonLd($)
        let title   = ld.name   || $('meta[property="og:title"]').attr('content') || rawTitle || 'Unknown Item'
        let image   = ld.image  || $('meta[property="og:image"]').attr('content') || ''
        let price   = ld.price  ?? null
        let inStock = ld.inStock ?? null
        const vendor = extractVendor(url)

        // Fix relative image URLs
        if (image && image.startsWith('/')) {
            const u = new URL(url)
            image = `${u.protocol}//${u.host}${image}`
        }

        // PASS 2: Regex/text fallback for missing price, stock, or qty
        $('script, style, nav, footer, svg').remove()
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
        let qty = extractQtyRegex(bodyText)

        if (price == null || inStock == null) {
            if (price == null)   price   = extractPriceRegex(bodyText)
            if (inStock == null) inStock = detectInStock(html) ?? false

            // PASS 3: AI fallback — only if key is configured and still missing price
            if (price == null) {
                try {
                    const snippet = bodyText.substring(0, 8000)
                    const prompt = `Extract from this product page text. Return ONLY valid JSON with no commentary:
{"price": <number or null>, "in_stock": <true|false>, "qty": <pack size number or null>}
Page: ${snippet}`
                    const aiResponse = await chatWithAi(prompt)
                    const match = aiResponse.match(/\{[\s\S]*?\}/)
                    if (match) {
                        const parsed = JSON.parse(match[0])
                        if (parsed.price != null) price   = parseFloat(parsed.price)
                        if (parsed.in_stock != null) inStock = parsed.in_stock
                        if (parsed.qty != null && qty == null) qty = parseInt(parsed.qty)
                    }
                } catch (aiErr) {
                    console.warn('[Market] AI fallback skipped:', aiErr.message)
                }
            }
        }

        const category = inferCategory(title, url)
        qty = qty || 1 // default to 1 if no pack size detected

        // inStock null means we couldn't determine it — keep the existing DB value via COALESCE
        const finalInStock = inStock !== null ? inStock : existingInStock
        const updateRes = await query(
            `UPDATE market_listings
             SET name = $1, price = $2, in_stock = $3, image_url = $4, qty_per_unit = $5, vendor = $6, category = $7, status = 'active', last_scraped_at = NOW()
             WHERE id = $8
             RETURNING *, category as "componentType"`,
            [title.trim(), price || 0, finalInStock ?? false, image, qty, vendor, category, id]
        )
        return updateRes.rows[0]

    } catch (err) {
        console.error('[Market] Scrape failed:', err.message)
        await query(`UPDATE market_listings SET status = 'error' WHERE id = $1`, [id])
        throw err  // propagate so addListing / handler can surface the real message
    }
}
//===============================================================
//Script Name: Scrape Metadata Function
//Script Location: netlify/functions/scrape.js
//Date: 12/07/2025
//Created By: T03KNEE
//Version: 2.9.0
//About: Advanced Metadata Harvester.
//       - FIX: Deep nested list parsing for Ruger/Legacy sites.
//===============================================================

import * as cheerio from 'cheerio'

const baseHeaders = { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*' 
}

// ... (Keep existing helpers determineType, toTitleCase, cleanText, guessBrand, extractCaliber) ...
function determineType(title) {
    const t = (title || '').toLowerCase()
    if (t.includes('rifle') || t.includes('pistol') || t.includes('shotgun') || t.includes('revolver')) return 'firearm'
    if (t.includes('suppressor') || t.includes('silencer') || t.includes('brake')) return 'suppressor'
    if (t.includes('scope') || t.includes('sight') || t.includes('optic') || t.includes('dot')) return 'optic'
    if (t.includes('chronograph') || t.includes('radar') || t.includes('kestrel') || t.includes('rangefinder')) return 'electronics'
    if (t.includes('tripod') || t.includes('bipod') || t.includes('rest')) return 'support'
    return 'other'
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase());
}

function cleanText(text) {
    if (!text) return ''
    return text.split('|')[0].split(' - ')[0].replace(/Amazon\.com\s*:?/i, '').replace(/\s+/g, ' ').trim()
}

function guessBrand(title, url) {
    const t = (title || '').toLowerCase()
    const u = (url || '').toLowerCase()
    if (u.includes('ruger') || t.includes('ruger')) return 'Ruger'
    if (u.includes('sig') || t.includes('sig sauer')) return 'Sig Sauer'
    if (u.includes('glock') || t.includes('glock')) return 'Glock'
    if (u.includes('vortex') || t.includes('vortex')) return 'Vortex'
    if (u.includes('leupold') || t.includes('leupold')) return 'Leupold'
    if (u.includes('hornady') || t.includes('hornady')) return 'Hornady'
    if (u.includes('sierra') || t.includes('sierra')) return 'Sierra'
    if (u.includes('nosler') || t.includes('nosler')) return 'Nosler'
    if (u.includes('hk-usa') || t.includes('hk') || t.includes('heckler')) return 'HK'
    return ''
}

function extractCaliber(text) {
    const t = text.toUpperCase()
    if (t.includes('6.5') && (t.includes('CREED') || t.includes('CM'))) return '6.5 Creedmoor'
    if (t.includes('308') || t.includes('7.62')) return '.308 Win'
    if (t.includes('223') || t.includes('5.56')) return '.223 Rem'
    if (t.includes('9MM')) return '9mm'
    return ''
}

export async function handler(event) {
    if (event.httpMethod !== 'GET') return { statusCode: 405, headers: baseHeaders, body: 'Method Not Allowed' }

    const targetUrl = event.queryStringParameters?.url
    if (!targetUrl) return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ message: 'URL required' }) }

    try {
        const scraperKey = process.env.SCRAPER_API_KEY
        let fetchUrl = targetUrl
        if (scraperKey) {
            fetchUrl = `http://api.scrape.do?token=${scraperKey}&url=${encodeURIComponent(targetUrl)}`
        }

        const res = await fetch(fetchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
        })

        if (!res.ok) throw new Error(`Remote site returned ${res.status} ${res.statusText}`)

        const html = await res.text()
        const $ = cheerio.load(html)
        
        let title = '', image = '', description = '', price = null, brand = ''
        let specs = { twist: '', barrel: '', trigger: '', weight: '', model: '' }

        // 1. METADATA
        title = $('meta[property="og:title"]').attr('content') || $('title').text()
        image = $('meta[property="og:image"]').attr('content')
        description = $('meta[property="og:description"]').attr('content')

        // 2. IMAGE FALLBACK (Find Largest)
        if (!image) {
            let maxArea = 0
            $('img').each((i, el) => {
                const src = $(el).attr('src')
                // Fix relative URLs
                const absoluteSrc = src && src.startsWith('/') ? new URL(src, targetUrl).toString() : src
                
                // Heuristic: Check size attributes or class names for "hero" / "main"
                if (absoluteSrc && (absoluteSrc.includes('product') || absoluteSrc.includes('gallery'))) {
                     image = absoluteSrc // Good candidate
                }
            })
        }

        // 3. DEEP SPEC HUNTER
        // Iterate over ALL text nodes in tables and lists
        $('*').each((i, el) => {
            // Skip script/style tags
            if (el.tagName === 'script' || el.tagName === 'style') return

            const text = $(el).text().replace(/\s+/g, ' ').trim()
            
            // Regex Hunters
            // Look for "Twist: 1:8" or "Twist 1:8"
            const twistMatch = text.match(/Twist[:\s]+(1:[\d\.]+)/i)
            if (twistMatch) specs.twist = twistMatch[1]

            // Look for "Barrel Length: 24""
            const barrelMatch = text.match(/Barrel(?: Length)?[:\s]+([\d\.]+)"?/i)
            if (barrelMatch) specs.barrel = barrelMatch[1]

            // Look for "Trigger: Match"
            if (text.includes('Trigger') && text.length < 50) {
                 specs.trigger = text.replace(/Trigger[:\s]*/i, '').trim()
            }
            
            // Look for Model Number (Ruger specific)
            if (text.includes('Model Number') && text.length < 30) {
                 specs.model = text.replace(/Model Number[:\s]*/i, '').trim()
            }
        })

        // 4. CLEANUP
        title = cleanText(title)
        if (!brand) brand = guessBrand(title, targetUrl)
        if (brand) brand = toTitleCase(brand)

        if (brand && title.toLowerCase().startsWith(brand.toLowerCase())) {
            title = title.substring(brand.length).trim()
        }
        
        let caliber = extractCaliber(title + ' ' + description)

        return {
            statusCode: 200,
            headers: baseHeaders,
            body: JSON.stringify({
                title: title || '',
                image: image || '',
                description: description || '',
                price: price ? Number(price) : null,
                brand: brand,
                caliber: caliber,
                type: determineType(title),
                specs: specs
            })
        }

    } catch (err) {
        console.error("Scrape Error:", err)
        return {
            statusCode: 500,
            headers: baseHeaders,
            body: JSON.stringify({ message: "Failed to scrape URL." })
        }
    }
}
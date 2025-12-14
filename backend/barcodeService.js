//===============================================================
//Script Name: Barcode Scanner Service (Multi-Provider)
//Script Location: backend/barcodeService.js
//Date: 12/13/2025
//Created By: T03KNEE
//Version: 2.0.0
//About: Unified adapter for multiple Barcode API providers.
//===============================================================

import { query } from './dbClient.js'

async function getBarcodeConfig() {
    try {
        const res = await query(`SELECT key, value FROM settings WHERE key IN ('barcode_enabled', 'barcode_provider', 'barcode_api_key', 'barcode_custom_url')`);
        const s = {};
        res.rows.forEach(r => s[r.key] = r.value);
        
        return {
            enabled: s.barcode_enabled === 'true',
            provider: s.barcode_provider || 'go-upc',
            apiKey: s.barcode_api_key || process.env.BARCODE_API_KEY,
            customUrl: s.barcode_custom_url // For custom provider
        };
    } catch (e) {
        return { enabled: false, provider: 'go-upc', apiKey: '' };
    }
}

// --- PROVIDER STRATEGIES ---

async function fetchGoUpc(code, apiKey) {
    const res = await fetch(`https://go-upc.com/api/v1/code/${code}`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Go-UPC Error: ${res.status}`);
    const json = await res.json();
    const p = json.product;
    return {
        brand: p.brand || "",
        name: p.name || "",
        imageUrl: p.imageUrl || "",
        description: p.description || "",
        category: p.category || ""
    };
}

async function fetchBarcodeLookup(code, apiKey) {
    const res = await fetch(`https://api.barcodelookup.com/v3/products?barcode=${code}&formatted=y&key=${apiKey}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`BarcodeLookup Error: ${res.status}`);
    const json = await res.json();
    const p = json.products[0];
    return {
        brand: p.brand || p.manufacturer || "",
        name: p.title || "",
        imageUrl: p.images && p.images.length > 0 ? p.images[0] : "",
        description: p.description || "",
        category: p.category || ""
    };
}

async function fetchUpcItemDb(code, apiKey) {
    // Note: Free tier of UPCitemdb is limited and doesn't always need a key, 
    // but the Pro tier does via headers.
    const headers = apiKey ? { "user_key": apiKey } : {};
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, { headers });
    if (!res.ok) {
        if (res.status === 429) throw new Error("UPCitemdb Rate Limited");
        return null; 
    }
    const json = await res.json();
    if (json.items.length === 0) return null;
    const p = json.items[0];
    return {
        brand: p.brand || "",
        name: p.title || "",
        imageUrl: p.images && p.images.length > 0 ? p.images[0] : "",
        description: p.description || "",
        category: p.category || ""
    };
}

async function fetchCustom(code, urlTemplate) {
    if (!urlTemplate) throw new Error("Custom URL not configured");
    const url = urlTemplate.replace('{code}', code);
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    // Assumes custom endpoint returns { brand, name, image }
    return {
        brand: json.brand || "",
        name: json.name || "",
        imageUrl: json.image || json.imageUrl || "",
        description: json.description || "",
        category: json.category || ""
    };
}

// --- MAIN LOOKUP FUNCTION ---

export async function lookupBarcode(code) {
    const config = await getBarcodeConfig();
    
    if (!config.enabled) {
        throw new Error("Barcode scanning is disabled by Admin.");
    }
    if (!config.apiKey && config.provider !== 'upcitemdb') {
        throw new Error(`API Key required for ${config.provider}`);
    }

    console.log(`[BARCODE] Lookup ${code} via ${config.provider}`);

    switch (config.provider) {
        case 'go-upc': return await fetchGoUpc(code, config.apiKey);
        case 'barcodelookup': return await fetchBarcodeLookup(code, config.apiKey);
        case 'upcitemdb': return await fetchUpcItemDb(code, config.apiKey);
        case 'custom': return await fetchCustom(code, config.customUrl);
        default: throw new Error("Unknown provider selected.");
    }
}
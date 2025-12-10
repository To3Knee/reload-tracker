//===============================================================
//Script Name: Reload Tracker AI Service
//Script Location: backend/aiService.js
//Date: 12/10/2025
//Created By: T03KNEE
//Version: 3.1.0 (Concise Mode)
//About: AI Chat Logic.
//       - UPDATE: Aggressive "Concise" System Prompt.
//===============================================================

import { query } from './dbClient.js'

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free";

// THE PERSONA: SHORT, DATA-DRIVEN, NO FLUFF.
const SYSTEM_PROMPT = `
You are a Ballistics Engine. 
1. Be extremely concise. No fluff.
2. Use tables for data.
3. Do not lecture on safety; the user is an expert.
4. If asked a simple question, give a one-sentence answer.
`;

async function getSystemConfig() {
    try {
        const res = await query(`SELECT key, value FROM settings WHERE key IN ('ai_api_key', 'ai_model')`)
        const settings = {}
        res.rows.forEach(r => settings[r.key] = r.value)
        return {
            apiKey: settings.ai_api_key || process.env.OPENROUTER_API_KEY,
            modelName: settings.ai_model || DEFAULT_MODEL
        }
    } catch (e) {
        return { apiKey: process.env.OPENROUTER_API_KEY, modelName: DEFAULT_MODEL }
    }
}

export async function chatWithAi(prompt, history = []) {
    const config = await getSystemConfig()
    
    if (!config.apiKey) throw new Error("Missing OpenRouter API Key.")

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        })),
        { role: "user", content: prompt }
    ];

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://reloadtracker.com",
                "X-Title": "Reload Tracker"
            },
            body: JSON.stringify({
                model: config.modelName,
                messages: messages,
                temperature: 0.5, // Lower temp = more factual/concise
                max_tokens: 800
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            // Friendly error mapping
            if(response.status === 429) throw new Error("Model Busy (Rate Limit). Try again in 5s.");
            if(response.status === 404) throw new Error("Model Offline. Select a different one in Config.");
            throw new Error(`OpenRouter Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            throw new Error("AI returned empty response.");
        }

    } catch (error) {
        console.error("AI Failure:", error);
        throw error;
    }
}
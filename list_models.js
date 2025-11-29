// list_models.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// PASTE YOUR KEY HERE
const API_KEY = 'AIzaSyB5CAPLfcKNWCXSdWmc2p8Mp-DG4s0aDUw'; 

const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
  try {
    // This special 'getGenerativeModel' call isn't needed for listing, 
    // but we need the client initialized.
    // Unfortunately, the SDK method to list models is hidden in some versions,
    // so we will try to brute force the common ones.
    
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    console.log("Testing Model Access...\n");

    for (const modelName of candidates) {
        process.stdout.write(`Checking ${modelName}... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            console.log("✅ SUCCESS!");
        } catch (e) {
            if (e.message.includes("404")) console.log("❌ Not Found (404)");
            else console.log(`❌ Error: ${e.message.split(' ')[0]}...`);
        }
    }

  } catch (error) {
    console.error("Global Error:", error);
  }
}

run();
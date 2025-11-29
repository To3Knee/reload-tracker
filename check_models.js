// check_models.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// PASTE YOUR KEY HERE DIRECTLY FOR THIS TEST
const API_KEY = 'AIzaSyB5CAPLfcKNWCXSdWmc2p8Mp-DG4s0aDUw'; 

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Attempting to fetch model list...");
    
    // Note: The SDK doesn't have a direct "listModels" helper exposed easily in all versions,
    // so we test a simple prompt to see if the connection works at all.
    const result = await model.generateContent("Hello");
    console.log("Success! 'gemini-1.5-flash' works.");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("\n❌ ERROR DETECTED:");
    console.error(error.message);
    
    if (error.message.includes("404")) {
        console.log("\n--- DIAGNOSIS ---");
        console.log("The API Key is valid, but it cannot find the model.");
        console.log("1. Ensure you created the key in Google AI Studio (aistudio.google.com), NOT Google Cloud Vertex AI.");
        console.log("2. Verify the project linked to this key has the 'Generative Language API' enabled.");
    }
  }
}

listModels();
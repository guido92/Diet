const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function list() {
    let key = '';
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GOOGLE_API_KEY=(.*)/);
        if (match) key = match[1].trim();
    } catch (e) {
        // Ignored
    }

    if (!key) {
        console.error("❌ No GOOGLE_API_KEY found in .env.local");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    try {
        // Direct fetch because SDK might wrap it weirdly or I want raw list
        // actually SDK doesn't expose listModels easily in the main class? 
        // Checking documentation memory: genAI.getGenerativeModel is the main entry.
        // Let's try to just hit a known existing older model or try to fetch the list via REST if SDK fails.

        // Attempting REST call for absolute certainty on what the key sees
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log("Models:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

list();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

function getApiKey() {
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/GOOGLE_API_KEY=(.*)/);
            if (match && match[1]) {
                return match[1].trim().replace(/"/g, ''); // simple cleanup
            }
        }
    } catch (e) {
        console.error("Error reading env:", e);
    }
    return process.env.GOOGLE_API_KEY;
}

async function listModels() {
    const key = getApiKey();
    if (!key) {
        console.error("CRITICAL: No API KEY found in .env.local or process.env");
        return;
    }
    console.log(`Using Key: ${key.substring(0, 5)}...`);

    const genAI = new GoogleGenerativeAI(key);
    try {
        // Direct REST call as SDK listModels might vary
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error ${response.status}: ${response.statusText}`);
            const txt = await response.text();
            console.error(txt);
            return;
        }
        const data = await response.json();
        console.log("\n--- AVAILABLE GEMINI MODELS ---");
        const models = data.models || [];
        models.forEach(m => {
            if (m.name.includes('gemini')) {
                console.log(`${m.name.replace('models/', '')} \t| ${m.displayName}`);
            }
        });
        console.log("-------------------------------\n");
    } catch (e) {
        console.error("Exception listing models:", e);
    }
}

listModels();

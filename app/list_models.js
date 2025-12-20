const { GoogleGenerativeAI } = require("@google/generative-ai");

async function list() {
    const key = "AIzaSyBRCi43hDCv0Ih9eYA7RwprFxcARuZ-ZmQ";
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

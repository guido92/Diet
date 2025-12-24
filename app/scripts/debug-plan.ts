
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 1. Load Env Vars using dotenv (must do before import ai)
const envPath = path.resolve(__dirname, '../../.env.local'); // Fix path if needed, or just ..
// Actually file is in app/scripts, so ../.env.local is correct.
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Import after env vars are loaded
import { generateWeeklyPlanAI } from '../src/lib/ai';

// 2. Set Data Path to local file
process.env.DATA_FILE_PATH = path.resolve(__dirname, '../tracker_data.json');
process.env.NODE_ENV = 'development'; // Ensure we default to localhost for Ollama if needed

async function runDebug() {
    console.log('--- STARTING AI PLAN GENERATION DEBUG ---');
    console.log('API Key Present:', !!process.env.GOOGLE_API_KEY);
    console.log('Ollama URL:', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
    console.log('Target User: Michael');

    try {
        const start = Date.now();
        const plan = await generateWeeklyPlanAI('Michael');
        const duration = (Date.now() - start) / 1000;

        console.log(`\n✅ PLAN GENERATED in ${duration}s`);
        console.log(JSON.stringify(plan, null, 2).substring(0, 500) + '... [TRUNCATED]');
    } catch (e) {
        console.error('\n❌ PLAN GENERATION FAILED:', e);
    }
}

runDebug();

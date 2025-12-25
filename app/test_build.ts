
import { getData } from './src/lib/data';
import { getRecipeAI } from './src/lib/ai';

async function test() {
    console.log("Testing imports...");
    try {
        const data = await getData();
        console.log("Data loaded, users:", Object.keys(data.users));
        console.log("SUCCESS");
    } catch (e) {
        console.error("FAIL", e);
    }
}

test();

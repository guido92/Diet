
import { getConadFlyers } from './src/lib/conad';

async function test() {
    console.log("Testing Conad Scraper...");
    const flyers = await getConadFlyers();
    console.log("Results:", JSON.stringify(flyers, null, 2));
}

test();

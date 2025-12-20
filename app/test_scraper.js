const { searchGialloZafferano } = require('./src/lib/scraper');

async function test() {
    console.log("Testing scraper for 'Pasta al tonno'...");
    const result = await searchGialloZafferano('Pasta al tonno');
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();

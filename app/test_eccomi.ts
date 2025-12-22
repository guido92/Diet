const { getEccomiFlyerUrl } = require('./src/lib/eccomi');

async function test() {
    console.log("Testing Eccomi Scraper...");
    try {
        const url = await getEccomiFlyerUrl();
        console.log("Result URL:", url);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();

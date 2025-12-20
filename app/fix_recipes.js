const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const DATA_FILE = path.resolve(__dirname, '../tracker_data.json');

async function searchGialloZafferano(query) {
    try {
        const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '+');
        if (!cleanQuery) return null;
        const searchUrl = `https://www.giallozafferano.it/ricerca-ricette/${cleanQuery}`;
        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (!response.ok) return null;
        const html = await response.text();
        const $ = cheerio.load(html);
        const firstCard = $('article.gz-card').first();
        if (!firstCard.length) return null;
        const titleLink = firstCard.find('.gz-title a');
        return {
            url: titleLink.attr('href'),
            imageUrl: firstCard.find('img').attr('data-src') || firstCard.find('img').attr('src')
        };
    } catch (e) { return null; }
}

async function fix() {
    console.log("Reading data...");
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    for (const username in data.users) {
        const user = data.users[username];
        const plan = user.plan;
        const guidelines = user.guidelines;
        console.log(`Enriching plan for ${username}...`);

        for (const day in plan) {
            const daily = plan[day];
            const mealKeys = ['lunch', 'dinner'];

            for (const key of mealKeys) {
                const mealId = daily[key];
                if (!mealId) continue;

                // Get detail object name or create it
                const detailKey = `${key}_details`;
                if (!daily[detailKey]) daily[detailKey] = { name: '', recipe: '' };

                const meal = daily[detailKey];

                // If name is empty, look it up in guidelines
                if (!meal.name) {
                    const guide = guidelines.find(g => g.id === mealId);
                    if (guide) meal.name = guide.name;
                }

                if (meal.name && !meal.recipeUrl && !meal.name.includes('Libera') && !meal.name.includes('Suoceri')) {
                    console.log(`  Searching for: ${meal.name}`);
                    const res = await searchGialloZafferano(meal.name);
                    if (res) {
                        meal.recipeUrl = res.url;
                        meal.imageUrl = res.imageUrl;
                        console.log(`    FOUND: ${res.url}`);
                    }
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("Done! Data saved.");
}

fix();

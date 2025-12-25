import * as cheerio from 'cheerio';

export type RecipeResult = {
    url: string;
    title: string;
    imageUrl?: string;
};

export async function searchGialloZafferano(query: string): Promise<RecipeResult | null> {
    try {
        const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '+');
        if (!cleanQuery) return null;

        const searchUrl = `https://www.giallozafferano.it/ricerca-ricette/${cleanQuery}`;

        console.log(`[SCRAPER] DEBUG: Fetching ${searchUrl}...`);
        // Fetch Search Page
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        console.log(`[SCRAPER] DEBUG: Response status: ${response.status}`);
        if (!response.ok) {
            console.warn(`[SCRAPER] Failed to fetch ${searchUrl}: ${response.status} ${response.statusText}`);
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Find first result card
        // GialloZafferano structure changes, but typically: .gz-card or article
        // Updated selector strategy:
        const firstCard = $('.gz-card').first();
        if (!firstCard.length) return null;

        const titleParams = firstCard.find('.gz-title a');
        let link = titleParams.attr('href');
        const title = titleParams.text().trim();
        const img = firstCard.find('img').attr('data-src') || firstCard.find('img').attr('src');

        if (link && title) {
            // Fix absolute URL
            if (link.startsWith('/')) {
                link = `https://www.giallozafferano.it${link}`;
            }

            return {
                url: link,
                title: title,
                imageUrl: img
            };
        }

        return null;

    } catch (e) {
        console.error(`Error scraping GZ for ${query}:`, e);
        return null;
    }
}

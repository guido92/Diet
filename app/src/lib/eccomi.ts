
import * as cheerio from 'cheerio';

export async function getEccomiFlyerImages(): Promise<string[]> {
    try {
        const flyerUrl = await getEccomiFlyerUrl();
        if (!flyerUrl) return [];

        console.log(`Found Issuu URL: ${flyerUrl}`);

        // 1. Extract Username and Docname from URL
        // Example: https://issuu.com/coal-srl/docs/promozione_dal_27_dicembre_all_8_ge_9e1da87d8c59dc
        const urlMatch = flyerUrl.match(/issuu\.com\/([^\/]+)\/docs\/([^\/?#]+)/);

        if (!urlMatch) {
            console.warn('Could not parse Issuu URL structure.');
            return [];
        }

        const username = urlMatch[1];
        const docname = urlMatch[2];

        // 2. Fetch Reader Config
        const configUrl = `https://publication.issuu.com/${username}/${docname}/reader4.json`;
        console.log(`Fetching Issuu Config: ${configUrl}`);

        const configResponse = await fetch(configUrl);
        if (!configResponse.ok) {
            console.error('Failed to fetch Issuu config:', configResponse.status);
            return [];
        }

        const config = await configResponse.json();
        const pubId = config.publicationId;
        const revId = config.revisionId; // e.g., "251222111200"

        if (pubId && revId) {
            console.log(`Issuu Config Found! PubID: ${pubId}, Rev: ${revId}`);

            // 3. Generate Image URLs
            const pageCount = config.pageCount || 20;
            const images = [];

            // Limit to first 15 pages for AI to save token/bandwidth
            const limit = Math.min(pageCount, 15);

            for (let i = 1; i <= limit; i++) {
                // Format: https://image.issuu.com/{revisionId}-{publicationId}/jpg/page_{n}.jpg
                const imgUrl = `https://image.issuu.com/${revId}-${pubId}/jpg/page_${i}.jpg`;
                images.push(imgUrl);
            }
            return images;
        } else {
            console.warn('Issuu Config missing IDs.');
            return [];
        }

    } catch (error) {
        console.error('Error getting Eccomi images:', error);
        return [];
    }
}

export async function getEccomiFlyerUrl(): Promise<string | null> {
    try {
        console.log('Scraping Eccomi offers page...');
        const response = await fetch('https://www.eccomisupermercati.it/offerte/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            console.error('Failed to fetch Eccomi page:', response.status);
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let flyerUrl: string | null = null;

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('issuu.com') && href.includes('coal')) {
                // Ensure we clean query params if any, though regex above handles them
                flyerUrl = href;
                return false; // break
            }
        });

        if (flyerUrl) {
            console.log('Found Eccomi Flyer URL:', flyerUrl);
            return flyerUrl;
        }

        console.warn('Eccomi Flyer not found via standard scraping.');
        return null;

    } catch (error) {
        console.error('Error scraping Eccomi:', error);
        return null;
    }
}

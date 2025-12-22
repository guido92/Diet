
import * as cheerio from 'cheerio';

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

        // Logic: Find the "Cesena" section or general flyer.
        // Based on previous analysis, we look for Issuu links or "Sfoglia volantino"
        // typically associated with the store list or main slider.

        // 1. Look for specific Cesena link if possible
        // (Simplified strategy from previous success: search for Issuu link in likely containers)

        let flyerUrl: string | null = null;

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('issuu.com') && href.includes('coal')) {
                // Check if it's near "Cesena" text if possible, but usually there's one main flyer
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

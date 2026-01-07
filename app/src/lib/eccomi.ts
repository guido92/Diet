
import * as cheerio from 'cheerio';

export async function getEccomiFlyerImages(): Promise<string[]> {
    try {
        const flyerUrl = await getEccomiFlyerUrl();
        if (!flyerUrl) return [];

        console.log(`Fetching Issuu page: ${flyerUrl}`);
        const response = await fetch(flyerUrl);
        const html = await response.text();

        // Extract Document ID from og:image
        // Pattern: https://image.issuu.com/251223103558-997ff782d6cfcb77b396bf7074adec5c/jpg/page_1.jpg
        // Regex: image.issuu.com/([ID])/jpg/page_
        const match = html.match(/image\.issuu\.com\/([a-zA-Z0-9-]+)\/jpg\/page_/);

        if (match && match[1]) {
            const docId = match[1];
            console.log(`Found Issuu Document ID: ${docId}`);

            // Generate links for first 15 pages
            const images = [];
            for (let i = 1; i <= 15; i++) {
                const imgUrl = `https://image.issuu.com/${docId}/jpg/page_${i}.jpg`;
                images.push(imgUrl);
            }
            return images;
        } else {
            console.warn('Could not extract Issuu Document ID from page HTML.');
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

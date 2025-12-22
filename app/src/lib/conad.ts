
import * as cheerio from 'cheerio';

type FlyerResult = {
    label: string;
    url: string | null;
};

const STORES = [
    {
        label: 'Conad Ponte abbadesse', // Bessarione
        url: 'https://www.conad.it/ricerca-negozi/conad-piazzale-cardinal-bessarione-99-47521-cesena--008400'
    },
    {
        label: 'Conad Montefiore', // Lucchi
        url: 'https://www.conad.it/ricerca-negozi/spazio-conad-via-leopoldo-lucchi-525-47521-cesena--007226'
    }
];

export async function getConadFlyers(): Promise<FlyerResult[]> {
    const results: FlyerResult[] = [];

    for (const store of STORES) {
        try {
            console.log(`Scraping Conad Store: ${store.label}...`);
            const response = await fetch(store.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                next: { revalidate: 3600 }
            });

            if (!response.ok) {
                console.error(`Failed to fetch ${store.label}: ${response.status}`);
                results.push({ label: store.label, url: null });
                continue;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Strategy: Look for "Scarica" button or link
            // Often Conad has a button with text "Scarica Volantino" or similar.
            // We search for anchors containing "Scarica"

            let pdfUrl: string | null = null;

            // 1. Try finding 'a' tag with text 'Scarica' AND 'Volantino'
            const downloadLink = $('a').filter((i, el) => {
                const text = $(el).text().toLowerCase();
                const href = $(el).attr('href');
                if (!href) return false;

                const isPdf = href.toLowerCase().endsWith('.pdf') || href.includes('v1.public');
                const isIrrelevant = href.includes('fiscale') || href.includes('privacy') || href.includes('cookie') || href.includes('regolamento');

                if (!isPdf || isIrrelevant) return false;

                // Strong signal: text contains "volantino" or "scarica"
                return text.includes('volantino') || text.includes('scarica');
            }).first();

            if (downloadLink.length) {
                pdfUrl = downloadLink.attr('href') || null;
            }

            // 2. Fallback: Search any href ending in pdf NOT irrelevant, prioritizing those in main content
            if (!pdfUrl) {
                // specific container often used: .flyer, .promo, .offer
                const candidates = $('a[href$=".pdf"]').not('[href*="fiscale"]').not('[href*="privacy"]').not('[href*="regolamento"]');
                if (candidates.length) {
                    pdfUrl = candidates.first().attr('href') || null;
                }
            }

            // 3. Fallback: Look for "Sfoglia" link which might be a viewer (like Eccomi)
            if (!pdfUrl) {
                const viewerLink = $('a:contains("Sfoglia")').first();
                if (viewerLink.length) pdfUrl = viewerLink.attr('href') || null;
            }


            if (pdfUrl) {
                // Ensure absolute URL if relative
                if (pdfUrl.startsWith('/')) {
                    pdfUrl = `https://www.conad.it${pdfUrl}`;
                }
                console.log(`Found flyer for ${store.label}: ${pdfUrl}`);
                results.push({ label: store.label, url: pdfUrl });
            } else {
                console.warn(`No flyer found for ${store.label}. Using Store URL as fallback.`);
                results.push({ label: store.label, url: store.url });
            }

        } catch (e) {
            console.error(`Error scraping ${store.label}:`, e);
            // Fallback on error too
            results.push({ label: store.label, url: store.url });
        }
    }

    return results;
}


import { smartSyncOffersAction } from './src/lib/ai';
import { getData } from './src/lib/data';

async function test() {
    console.log("Running smartSyncOffersAction...");
    const result = await smartSyncOffersAction();
    console.log("Result:", result);

    const data = await getData();
    const flyers = data.conadFlyers;
    console.log("Flyers:", flyers);

    const eccomi = flyers.find(f => f.label === 'Eccomi (Cesena)');
    if (eccomi) {
        console.log("SUCCESS: Eccomi flyer found:", eccomi);
    } else {
        console.error("FAILURE: Eccomi flyer NOT found.");
    }
}

test();

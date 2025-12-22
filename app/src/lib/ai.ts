'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { MealOption, generateLocalPlan, getSeasonalFruit, getSeasonalVeg } from './guidelines';
import { WeeklyPlan, updateUserGuidelines, getData, updateActiveOffers, ConadOffer, saveData, DailyPlan } from './data';
import { searchGialloZafferano } from './scraper';
import { revalidatePath } from 'next/cache';

const pdf = require('pdf-parse/lib/pdf-parse.js');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Team GOURMET: High Logic & Creativity (Prioritize Quality)
const CHEF_MODELS = [
  'gemini-2.0-flash',       // Stable & High Quality
  'gemini-flash-latest',    // Fast & Reliable
  'gemini-pro-latest',      // Pro logic
  'gemini-3-flash-preview', // experimental
  'gemini-2.0-flash-exp'    // Experimental
];

// Team WORKER: High Speed & Quota
const WORKER_MODELS = [
  'gemini-flash-latest',           // Best Quota/Speed
  'gemini-flash-lite-latest',      // Very high quota
  'gemini-2.0-flash-lite-preview'  // Lite Model
];

/**
 * Robust AI Caller with Fallback Rotation
 */
async function callGeminiSafe(prompt: string, modelList: string[]): Promise<string> {
  const errors: string[] = [];

  for (const modelId of modelList) {
    try {
      // console.log(`[AI ROTATION] Trying model: ${modelId}...`);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e: any) {
      const msg = e.message || String(e);
      console.warn(`[AI ROTATION] Failed on ${modelId}: ${msg.substring(0, 150)}...`);
      errors.push(`${modelId}: ${msg}`);

      if (msg.includes('API key') || msg.includes('permission')) {
        throw e;
      }

      // Check for Retry-After time in error message
      // Matches: "retry in 56.10s" or "retryDelay":"56s"
      let waitTime = 2000; // Default 2s
      const retryMatch = msg.match(/retry in (\d+(\.\d+)?)s/) || msg.match(/"retryDelay":"(\d+)s"/);

      if (retryMatch) {
        const seconds = parseFloat(retryMatch[1]);
        waitTime = (seconds + 1) * 1000; // Add 1s buffer
        console.log(`[AI RATE LIMIT] HIT 429. Waiting ${Math.ceil(waitTime / 1000)}s before next attempt... ⏳`);
      } else if (msg.includes('429') || msg.includes('Too Many Requests')) {
        waitTime = 10000; // Default 10s backoff for unparsed 429
        console.log(`[AI RATE LIMIT] HIT 429 (Unknown time). Waiting 10s... ⏳`);
      }

      await new Promise(r => setTimeout(r, waitTime));
    }
  }

  throw new Error(`ALL MODELS FAILED. Details: \n${errors.join('\n')}`);
}

/**
 * Generates a weekly plan, now considering current offers if available.
 */
export async function generateWeeklyPlanAI(targetUser?: 'Michael' | 'Jessica'): Promise<WeeklyPlan> {
  const data = await getData();
  const user = targetUser || data.currentUser;
  const userGuidelines = data.users[user].guidelines;
  const activeOffers = data.activeOffers || [];
  const pantryItems = data.pantryItems || []; // Fetch Pantry
  const seasonalFruit = getSeasonalFruit();
  const seasonalVeg = getSeasonalVeg();

  console.log(`Generating plan for ${user} considering ${activeOffers.length} offers and ${pantryItems.length} pantry items...`);

  const prompt = `
      Sei un assistente nutrizionista e Chef stellato ("Chef Zero Sprechi").
      Devi generare un piano settimanale di 7 giorni per ${user}.
      
      OBIETTIVI:
      1. Rispettare le Linee Guida (Calorie/Macro).
      2. **MINIMIZZARE GLI SPRECHI**: Usa PRIORITARIAMENTE gli ingredienti in Dispensa.
      3. **RISPARMIARE**: Usa le Offerte del supermercato.
      4. **GUSTO**: Mai piatti tristi. Se è dieta, deve sembrare gourmet.

      DATI A DISPOSIZIONE:
      - Linee Guida (VINCOLANTI): ${JSON.stringify(userGuidelines)}
      - **DISPENSA (COSA ABBIAMO IN CASA - USARE PRIMA DI TUTTO)**: ${JSON.stringify(pantryItems)}
      - Offerte Volantino (OPZIONALI MA CONSIGLIATE): ${JSON.stringify(activeOffers)}
      - Frutta Stagione: ${JSON.stringify(seasonalFruit)}
      - Verdura Stagione: ${JSON.stringify(seasonalVeg)}
      
      REGOLE FONDAMENTALI:
      1. **DIETA RIGIDA MA CREATIVA**:
         - Niente sgarri Lun-Ven.
         - Sabato/Domenica: Max 1 "Pranzo dai Suoceri" e Max 1 "Cena Libera/Amici".
      
      2. **COMPATIBILITÀ COPPIA**:
         - CENA (Tutti i giorni) & PRANZO (Weekend): Cibo condiviso (owners include sia Michael che Jessica).
         - PRANZO (Lun-Ven): Cibo individuale (owners include ${user}).

      3. **ALLENAMENTO**:
         ${user === 'Michael' ?
      '- MICHAEL: Training TRUE solo Martedì e Giovedì. (Riposo gli altri giorni).' :
      '- JESSICA: Training FALSE (o variabile, ma default false).'}

      4. **INTELLIGENZA "CHEF MODE" (CRUCIALE)**:
         - **VIETATO IL GENERICO**:
           > Se scegli l'ID "sam1" (Frutta) o simili, NON lasciare i dettagli vuoti.
           > Devi COMPILARE \`specificFruit\` con una scelta reale (es. "Mela Pink Lady", non "Frutta").
           > Se scegli "Verdura", scrivi "Spinaci al limone", non "Verdura".
         
         - **USA LA DISPENSA**:
           > Se in dispensa c'è "Tonno", cerca di inserire un pasto col Tonno (se le linee guida lo permettono).
           > Se c'è "Riso", usa il Riso come carboidrato.
         
         - **USA LE OFFERTE**:
           > Se c'è un'offerta sul "Pollo", scrivi "Pollo in offerta" o crea una ricetta ad hoc.

         - **NOMING ACCATTIVANTE**:
           > Nel campo \`lunch_details.name\` o \`dinner_details.name\`, non scrivere solo "Pollo". Scrivi "Tagliata di Pollo al Rosmarino".
           > Rendi il piano desiderabile!

      5. **STRUTTURA JSON OUTPUT**:
         Restituisci SOLO un JSON valido (WeeklyPlan).
         Format:
         { 
           "Monday": { 
             "breakfast": "id...", "breakfast_details": { "name": "...", "specificFruit": "..." },
             "lunch": "id...", "lunch_details": { "name": "...", "specificVeg": "...", "specificProtein": "...", "specificCarb": "..." },
             ...
           }
         }
  `;

  let plan: WeeklyPlan;

  try {
    const responseText = (await callGeminiSafe(prompt, CHEF_MODELS)).trim();
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    plan = JSON.parse(jsonStr);
  } catch (e) {
    console.error('AI Plan Generation Error (Fallback to Local):', e);
    // Fallback logic enabled: Local Random Plan
    plan = generateLocalPlan(userGuidelines);
  }

  // 1. Sanitize (Strict Rules)
  const sanitizedPlan = sanitizePlan(plan, user);

  // 2. Enrich with Recipes (GialloZafferano) - Batch Mode
  console.log('Fetching Recipes from GialloZafferano...');
  await enrichPlanWithRecipes(sanitizedPlan);

  return sanitizedPlan;
}

/**
 * Scrapes GialloZafferano for every Lunch/Dinner meal in the plan.
 * Modifies the plan in-place.
 */
async function enrichPlanWithRecipes(plan: WeeklyPlan) {
  const days = Object.values(plan);

  // Create a list of tasks to run
  // We process Lunch and Dinner.
  for (const day of days) {
    const mealsToEnrich = [
      day.lunch_details,
      day.dinner_details
    ].filter(m => m && m.name && !m.name.includes('Libera') && !m.name.includes('Suoceri'));

    for (const meal of mealsToEnrich) {
      if (!meal) continue;
      // Simple sequential scraping to avoid rate limits/blocks
      const result = await searchGialloZafferano(meal.name);
      if (result) {
        meal.recipeUrl = result.url;
        meal.imageUrl = result.imageUrl;
        console.log(`[RECIPE] Found for "${meal.name}": ${result.url}`);
      } else {
        console.log(`[RECIPE] Not found for "${meal.name}"`);
      }
      // Small delay between requests
      await new Promise(r => setTimeout(r, 500));
    }
  }
}


/**
 * Enforces strict rules on ANY plan (AI generated or Local fallback).
 */
function sanitizePlan(plan: WeeklyPlan, user: string): WeeklyPlan {
  const KEY_MAP: Record<string, string> = {
    'lunedi': 'Monday', 'lunedì': 'Monday', 'monday': 'Monday',
    'martedi': 'Tuesday', 'martedì': 'Tuesday', 'tuesday': 'Tuesday',
    'mercoledi': 'Wednesday', 'mercoledì': 'Wednesday', 'wednesday': 'Wednesday',
    'giovedi': 'Thursday', 'giovedì': 'Thursday', 'thursday': 'Thursday',
    'venerdi': 'Friday', 'venerdì': 'Friday', 'friday': 'Friday',
    'sabato': 'Saturday', 'saturday': 'Saturday',
    'domenica': 'Sunday', 'sunday': 'Sunday'
  };

  const newPlan: WeeklyPlan = {};
  // 1. Normalize Days
  Object.keys(plan).forEach(k => {
    const norm = KEY_MAP[k.toLowerCase()] || k;
    const cleanKey = norm.charAt(0).toUpperCase() + norm.slice(1);
    if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(cleanKey)) {
      newPlan[cleanKey] = plan[k as keyof WeeklyPlan];
    }
  });

  // 2. Ensure all days exist
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
    if (!newPlan[day]) {
      // Basic placeholder if missing
      newPlan[day] = { breakfast: 'b1', snack_am: 'sam1', lunch: 'l1', snack_pm: 'spm1', dinner: 'd1_pollo', training: false };
    }
  });

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const WEEKEND = ['Saturday', 'Sunday'];
  const ALL_DAYS = [...WEEKDAYS, ...WEEKEND];

  // 3. PURGE WEEKDAYS (No Social)
  WEEKDAYS.forEach(day => {
    // No Suoceri Lunch
    if (newPlan[day].lunch === 'l_suoceri') {
      console.log(`[SANITIZER] Removing weekday 'l_suoceri' on ${day}`);
      const fallbackL3 = user === 'Jessica' ? 'l3_j_pollo' : 'l3_m_pollo';
      const fallbackL1 = user === 'Jessica' ? 'l1_j' : 'l1_m';
      newPlan[day].lunch = Math.random() > 0.5 ? fallbackL3 : fallbackL1;
      newPlan[day].lunch_details = undefined;
    }
    // No Social Dinner
    if (['d_amici', 'd2'].includes(newPlan[day].dinner as string)) {
      console.log(`[SANITIZER] Removing weekday social '${newPlan[day].dinner}' on ${day}`);
      newPlan[day].dinner = Math.random() > 0.5 ? 'd1_pollo' : 'd1_merluzzo';
      newPlan[day].dinner_details = undefined;
    }
  });

  // 4. LIMIT WEEKEND (Max 1 social each type)
  let suoceriCount = 0;
  let socialDinnerCount = 0;

  // We iterate weekend days to count and limit
  WEEKEND.forEach(day => {
    if (newPlan[day].lunch === 'l_suoceri') {
      suoceriCount++;
      if (suoceriCount > 1) {
        console.log(`[SANITIZER] Correcting extra 'l_suoceri' on ${day}`);
        const fallbackL2 = user === 'Jessica' ? 'l2_j' : 'l2_m';
        newPlan[day].lunch = fallbackL2; // Fallback
        newPlan[day].lunch_details = undefined;
      }
    }
    if (['d_amici', 'd2'].includes(newPlan[day].dinner as string)) {
      socialDinnerCount++;
      if (socialDinnerCount > 1) {
        console.log(`[SANITIZER] Correcting extra social dinner on ${day}`);
        const fallbackDinner = user === 'Jessica' ? 'd1_j_manzo' : 'd1_m_manzo';
        newPlan[day].dinner = fallbackDinner; // Fallback
        newPlan[day].dinner_details = undefined;
      }
    }
  });

  // 5. FORCE TRAINING
  ALL_DAYS.forEach(day => {
    if (user === 'Michael') {
      newPlan[day].training = (day === 'Tuesday' || day === 'Thursday');
    } else if (user === 'Jessica') {
      newPlan[day].training = false;
    }

    // 6. OWNERSHIP & ID CORRECTION (More Robust)
    const MEAL_KEYS: (keyof DailyPlan)[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'];
    MEAL_KEYS.forEach(mealKey => {
      let mealId = newPlan[day][mealKey] as string;

      if (!mealId || typeof mealId !== 'string') return;

      // Check for Michael's marker in Jessica's plan
      // Pattern: Ends with "_m" OR contains "_m_"
      if (user === 'Jessica' && (mealId.endsWith('_m') || mealId.includes('_m_'))) {
        console.log(`[SANITIZER] Fixing ownership mismatch for Jessica: ${mealId} -> _j`);
        const correctId = mealId.replace(/_m($|_)/, (match) => match.replace('m', 'j'));
        (newPlan[day] as any)[mealKey] = correctId; // update ID
        (newPlan[day] as any)[`${mealKey}_details`] = undefined;
      }
      // Check for Jessica's marker in Michael's plan
      else if (user === 'Michael' && (mealId.endsWith('_j') || mealId.includes('_j_'))) {
        console.log(`[SANITIZER] Fixing ownership mismatch for Michael: ${mealId} -> _m`);
        const correctId = mealId.replace(/_j($|_)/, (match) => match.replace('j', 'm'));
        (newPlan[day] as any)[mealKey] = correctId;
        (newPlan[day] as any)[`${mealKey}_details`] = undefined;
      }

      // Fallback: AI forgot to specify fruit for sam1
      if (mealId === 'sam1' && !(newPlan[day] as any)[`${mealKey}_details`]?.specificFruit) {
        const fruit = getSeasonalFruit();
        const randomFruit = fruit[Math.floor(Math.random() * fruit.length)];
        if (!(newPlan[day] as any)[`${mealKey}_details`]) {
          (newPlan[day] as any)[`${mealKey}_details`] = { name: 'Frutta Fresca', specificFruit: randomFruit };
        } else {
          (newPlan[day] as any)[`${mealKey}_details`].specificFruit = randomFruit;
        }
      }
    });
  });

  return newPlan;
}

/**
 * Generates plans for BOTH users, syncing shared meals.
 */
export async function generateBothPlansAction(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Generating Combined Plan for Michael & Jessica...');

    // 1. Generate INDEPENDENT SAFE PLANS
    const planMichael = await generateWeeklyPlanAI('Michael');
    const planJessica = await generateWeeklyPlanAI('Jessica');

    // 3. SYNCHRONIZE SHARED MEALS
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const WEEKEND = ['Saturday', 'Sunday'];

    const data = await getData();
    const allGuidelines: MealOption[] = [...(data.users.Michael.guidelines || []), ...(data.users.Jessica.guidelines || [])];

    const isSharedMeal = (mealId: string) => {
      const meal = allGuidelines.find(g => g.id === mealId);
      if (!meal) return false;
      return meal.owners?.includes('Michael') && meal.owners?.includes('Jessica');
    };

    DAYS.forEach(day => {
      if (!planMichael[day] || !planJessica[day]) return;

      // SYNC DINNER (Every day) - FORCE MICHAEL'S CHOICE ON JESSICA
      // SYNC DINNER (Every day) - MAP MICHAEL'S CHOICE TO JESSICA'S
      const michaelDinner = planMichael[day].dinner;
      if (michaelDinner) {
        // Double check safety: Don't sync a weekday "social" meal even if AI somehow validated it
        const isWeekday = !WEEKEND.includes(day);
        const isSocial = ['d_amici', 'd2'].includes(michaelDinner);

        if (isWeekday && isSocial) {
          // Safety: Do not sync
        }
        // 1. Map Michael Version -> Jessica Version (e.g. d1_m_pollo -> d1_j_pollo)
        else if (michaelDinner.includes('_m')) {
          const jVariant = michaelDinner.replace('_m', '_j');
          planJessica[day].dinner = jVariant;
        }
        // 2. Direct Shared Dinner (e.g. d_amici, d2 - if allowed)
        else if (isSharedMeal(michaelDinner)) {
          planJessica[day].dinner = michaelDinner;
        }
      }

      // SYNC LUNCH (Weekend only)
      if (WEEKEND.includes(day)) {
        const michaelLunch = planMichael[day].lunch;
        if (michaelLunch) {
          // 1. Direct Shared Lunch (e.g. Suoceri)
          if (['l_suoceri'].includes(michaelLunch)) {
            planJessica[day].lunch = michaelLunch;
          }
          // 2. Map Michael Version -> Jessica Version (e.g. l1_m -> l1_j)
          else if (michaelLunch.includes('_m')) {
            const jVariant = michaelLunch.replace('_m', '_j');
            planJessica[day].lunch = jVariant;
          }
          // 3. Fallback: If shared ID (mostly dinners, but just in case)
          else if (isSharedMeal(michaelLunch)) {
            planJessica[day].lunch = michaelLunch;
          }
        }
      }
    });

    data.users.Michael.plan = planMichael;
    data.users.Jessica.plan = planJessica;
    await saveData(data);

    return { success: true, message: 'Piani Sincronizzati Generati! Cene e Weekend allineati.' };
  } catch (e) {
    console.error('Combined Plan Generation Error:', e);
    return { success: false, message: 'Errore nella generazione dei piani combinati.' };
  }
}
const CONAD_STORES = [
  { id: '008400', key: 'Bessarione', name: 'Conad Ponte Abbadesse', url: 'https://www.conad.it/ricerca-negozi/conad-piazzale-cardinal-bessarione-99-47521-cesena--008400' },
  { id: '007226', key: 'Lucchi', name: 'Conad Montefiore', url: 'https://www.conad.it/ricerca-negozi/spazio-conad-via-leopoldo-lucchi-525-47521-cesena--007226' }
];

const ECCOMI_SOURCE = {
  name: 'Eccomi Cesena',
  indexUrl: 'https://www.offertevolantini.it/negozi/eccomi/volantino-offerte',
  baseUrl: 'https://www.offertevolantini.it'
};

export async function smartSyncOffersAction(): Promise<{ success: boolean; message: string; count: number }> {
  // 1. Set Status to RUNNING immediately
  try {
    const data = await getData();
    data.syncStatus = { state: 'running', message: 'Sincronizzazione avviata...', lastUpdate: Date.now() };
    await saveData(data);
  } catch (e) {
    console.error('Failed to set sync status:', e);
    return { success: false, message: 'Errore avvio sync', count: 0 };
  }

  // 2. Start Background Logic (Floating Promise)
  (async () => {
    try {
      console.log('--- START BACKGROUND SYNC ---');
      const data = await getData(); // Re-fetch mostly safe

      let newActiveOffers: ConadOffer[] = [];
      data.conadFlyers = [];

      let totalOffers = 0;
      let flyersFound = 0;

      // 1. STANDARD CONAD PDF SYNC
      for (const store of CONAD_STORES) {
        console.log(`Smart Sync: Checking store ${store.name}...`);
        const storePage = await fetch(store.url).then(r => r.text());
        const flyerLinks = storePage.match(/\/volantini\/cia-[^"'\s<>]+/g);
        if (!flyerLinks) continue;

        const uniqueLinks = Array.from(new Set(flyerLinks));
        for (const link of uniqueLinks) {
          const viewerUrl = link.startsWith('http') ? link : `https://www.conad.it${link}`;
          const viewerPage = await fetch(viewerUrl).then(r => r.text());
          const titleMatch = viewerPage.match(/<title>([^<]+)<\/title>/i);
          const flyerTitle = titleMatch ? titleMatch[1].split('|')[0].trim() : 'Volantino';

          const pdfMatches = viewerPage.match(/https:\/\/www\.conad\.it\/assets\/common\/volantini\/cia\/[^\s"'>]+\.pdf(?:\?[^\s"'>\/]+)?/g);

          if (pdfMatches && pdfMatches[0]) {
            const pdfUrl = pdfMatches[0].replace(/\\u0026/g, '&');
            const IGNORED_KEYWORDS = ['CONAD_PAY', 'CaseCura', 'viaggi', 'assicurazioni', 'manuale', 'regolamento', 'flyer_scelte_stagione', 'distributore', 'A4_Mipremio', 'A4_HeyCND', 'WEB_Leaflet_CaseCura', 'scelte_stagione', 'A4_Distributore'];
            if (IGNORED_KEYWORDS.some(k => pdfUrl.includes(k))) continue;
            if (pdfUrl.includes('/renditions/') || pdfUrl.includes('/thumbs/') || pdfUrl.toLowerCase().endsWith('.webp')) continue;

            const flyerInfo = { url: pdfUrl, lastSync: new Date().toISOString(), label: `${store.name} - ${flyerTitle}`, storeId: store.id };
            data.conadFlyers.push(flyerInfo);
            flyersFound++;

            // Parse
            console.log(`Parsing PDF ${pdfUrl}...`);
            try {
              const pdfResponse = await fetch(pdfUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'application/pdf' }
              });
              if (pdfResponse.ok) {
                const buffer = Buffer.from(await pdfResponse.arrayBuffer());
                if (typeof pdf === 'function') {
                  const pdfData = await pdf(buffer);
                  if (pdfData.text && pdfData.text.length > 200) {
                    const offers = await extractOffersAI(pdfData.text, store.name);
                    if (offers && offers.length > 0) {
                      newActiveOffers = [...newActiveOffers, ...offers];
                      totalOffers += offers.length;
                    }
                  }
                }
              }
            } catch (err) { console.error('PDF Parse Error', err); }
            // Throttle
            await new Promise(r => setTimeout(r, 6000));
          }
        }
      }

      // 2. ECCOMI SYNC
      console.log(`Smart Sync: Checking ${ECCOMI_SOURCE.name}...`);
      try {
        const indexHtml = await fetch(ECCOMI_SOURCE.indexUrl).then(r => r.text());
        const flyerMatch = indexHtml.match(/\/visualizza\/offerte\/volantino-[^"']+/);
        if (flyerMatch) {
          const flyerUrl = `${ECCOMI_SOURCE.baseUrl}${flyerMatch[0]}`;
          console.log(`Found Eccomi Flyer: ${flyerUrl}`);
          const webOffers = await processWebViewerAction(flyerUrl, 'Eccomi Cesena');
          if (webOffers.length > 0) {
            newActiveOffers = [...newActiveOffers, ...webOffers];
            totalOffers += webOffers.length;
            data.conadFlyers.push({ url: flyerUrl, lastSync: new Date().toISOString(), label: 'Eccomi Cesena (Web)', storeId: 'eccomi-cesena' });
            flyersFound++;
          }
        }
      } catch (e) { console.error('Eccomi fail', e); }

      // SAVE SUCCESS
      const finalData = await getData(); // Re-read to be safe
      finalData.conadFlyers = data.conadFlyers;
      if (totalOffers > 0) {
        finalData.activeOffers = newActiveOffers;
        finalData.syncStatus = { state: 'success', message: `Finito! Trovati ${flyersFound} volantini e ${totalOffers} offerte.`, lastUpdate: Date.now() };
      } else {
        finalData.syncStatus = { state: 'success', message: 'Nessuna nuova offerta trovata (mantenute precedenti).', lastUpdate: Date.now() };
      }
      await saveData(finalData);
      revalidatePath('/shopping');
      console.log('--- BACKGROUND SYNC FINISHED ---');

    } catch (bgError: any) {
      console.error('--- BACKGROUND SYNC ERROR ---', bgError);
      const errData = await getData();
      errData.syncStatus = { state: 'error', message: 'Errore durante la sincronizzazione.', lastUpdate: Date.now() };
      await saveData(errData);
    }
  })();

  return { success: true, message: 'Ricerca Offerte avviata in background... Torna tra poco!', count: 0 };
}

export async function processFlyerUrlAction(url: string): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Impossibile scaricare il volantino');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (typeof pdf !== 'function') {
      return { success: false, message: 'Sistema PDF non pronto.', count: 0 };
    }

    const pdfData = await pdf(buffer);
    const text = pdfData.text;

    const appData = await getData();
    const flyer = appData.conadFlyers.find(f => f.url === url);
    const storeLabel = flyer?.label || (url.includes('spazio') ? 'Spazio Conad Lucchi' : 'Conad Bessarione');

    const offers = await extractOffersAI(text, storeLabel);
    if (offers && offers.length > 0) {
      // Update flyers list
      const flyerIndex = appData.conadFlyers.findIndex(f => f.url === url);
      if (flyerIndex >= 0) {
        appData.conadFlyers[flyerIndex].lastSync = new Date().toISOString();
      } else {
        appData.conadFlyers.push({ url, lastSync: new Date().toISOString(), label: storeLabel });
      }

      await saveData(appData);
      await updateActiveOffers(offers);

      return { success: true, message: `Caricate ${offers.length} offerte!`, count: offers.length };
    }
    return { success: false, message: 'Nessuna offerta trovata nel volantino.', count: 0 };
  } catch (error) {
    console.error('Flyer Processing Error:', error);
    return { success: false, message: 'Errore nel caricamento del volantino PDF.', count: 0 };
  }
}



/**
 * Scrapes a Web Viewer (images) and uses Multimodal AI.
 */
async function processWebViewerAction(url: string, storeName: string): Promise<ConadOffer[]> {
  try {
    console.log(`Scraping Web Viewer: ${url}`);
    const html = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.text());

    // EXTRACT IMAGE URLs (Naive scrape of all JPGs served from CDN)
    // We look for the 'img.offers-cdn.net/...' pattern
    const regex = /https:\/\/img\.offers-cdn\.net\/[a-zA-Z0-9\/\.\-_]+\.jpg/g;
    const matches = html.match(regex);

    if (!matches || matches.length === 0) {
      console.log('No images found in web viewer.');
      return [];
    }

    // De-duplicate and filter (maybe top 10 unique large images?)
    // Often these sites have thumbnails and full res. We try to grab them all 
    // and let AI sort it, or check for size indicators in URL if possible.
    const uniqueImages = Array.from(new Set(matches)).slice(0, 8); // Limit to first 8 pages to save tokens/time

    console.log(`Found ${uniqueImages.length} images. Analyzing with Gemini Vision...`);

    // Download Images
    const imageBuffers: Buffer[] = [];
    for (const imgUrl of uniqueImages) {
      try {
        const buff = await fetch(imgUrl).then(r => r.arrayBuffer());
        imageBuffers.push(Buffer.from(buff));
      } catch (e) {
        console.error(`Failed to download image ${imgUrl}`);
      }
    }

    if (imageBuffers.length === 0) return [];

    return await extractOffersFromImagesAI(imageBuffers);

  } catch (e) {
    console.error('Web Viewer Scraping Error:', e);
    return [];
  }
}

// 2. Extract Offers using Gemini Vision
async function extractOffersFromImagesAI(images: Buffer[]): Promise<ConadOffer[]> {
  if (images.length === 0) return [];
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  // 'gemini-1.5-flash' sometimes has versioning issues in beta. Using 'gemini-1.5-flash-latest' or 'gemini-1.5-pro' might be safer.
  // Updated to 'gemini-1.5-flash-latest' to fix 404 error.
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const prompt = `
    Analizza queste immagini del volantino "Eccomi".
    Estrai TUTTE le offerte di prodotti alimentari (Carne, Pesce, Frutta, Verdura, Yogurt, Latte).
    Ignora prodotti per la casa o non alimentari se non rilevanti.
    
    Restituisci un ARRAY JSON con oggetti:
    {
      "categoria": "Carne" | "Pesce" | "Frutta" | "Verdura" | "Latticini" | "Dispensa/Altro",
      "prodotto": "Nome esatto prodotto",
      "prezzo": "Prezzo (es. 1.50)",
      "unita": "Unità (es. al kg, al pezzo, conf. 300g)",
      "sconto": "Sconto se presente (es. -20%)",
      "negozio": "Eccomi Cesena"
    }

    REGOLE:
    - Restituisci SOLO il JSON raw. Nessun markdown.
    - Se l'immagine è sfocata o non contiene offerte, ignorala.
  `;

  // Prepare Parts
  const parts: any[] = [prompt];
  images.forEach(buff => {
    parts.push({
      inlineData: {
        data: buff.toString('base64'),
        mimeType: 'image/jpeg'
      }
    });
  });

  try {
    const result = await model.generateContent(parts);
    const responseText = result.response.text();
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Gemini Vision Error:', e);
    return [];
  }
}

async function extractOffersAI(text: string, storeName: string): Promise<ConadOffer[]> {
  const prompt = `
    Analizza questo testo estratto da un volantino Conad del negozio: ${storeName}.
    Estrai le offerte più interessanti (Nome prodotto, Prezzo, Unità, Sconto, Categoria).
    Focalizzati su carne, pesce, verdura, frutta e latticini (yogurt).
    Restituisci un array JSON di oggetti che seguono l'interfaccia ConadOffer:
    
    interface ConadOffer {
      categoria: string;
      prodotto: string;
      prezzo: string;
      unita: string; 
      note?: string;
      sconto?: string;
      negozio: string; // Imposta questo valore su "${storeName}"
    }

    REGOLE:
    - Sii conciso.
    - Estrai solo prodotti alimentari rilevanti per una dieta (evita snack, bibite zuccherate, alcolici).
    - Restituisci SOLO il JSON raw.
    - Testo volantino:
    ---
    ${text}
    ---
  `;

  try {
    const responseText = (await callGeminiSafe(prompt, WORKER_MODELS)).trim();
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Offers Extraction Error:', e);
    return [];
  }
}

export async function processPDFAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  const file = formData.get('file') as File;
  if (!file) return { success: false, message: 'Nessun file caricato' };

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const data = await pdf(buffer);
    const text = data.text;

    const extractedGuidelines = await extractGuidelinesAI(text);
    if (extractedGuidelines && extractedGuidelines.length > 0) {
      await updateUserGuidelines(extractedGuidelines);
      return { success: true, message: `Caricate ${extractedGuidelines.length} nuove opzioni pasto dalla tua dieta!` };
    }
    return { success: false, message: 'Non sono riuscito ad estrarre pasti validi dal PDF.' };
  } catch (error) {
    console.error('PDF Processing Error:', error);
    return { success: false, message: 'Errore nel caricamento o parsing del PDF.' };
  }
}

async function extractGuidelinesAI(text: string): Promise<MealOption[]> {
  const prompt = `
    Analizza questo testo estratto da un PDF di una dieta nutrizionale.
    Estrai tutte le opzioni di pasto (Colazione, Spuntini, Pranzo, Cena).
    Restituisci un array JSON di oggetti che seguono ESATTAMENTE questa interfaccia TypeScript:
    
    interface Ingredient { name: string; amount: number; unit: string; }
    interface MealOption {
      id: string; 
      name: string; 
      description: string; 
      ingredients: Ingredient[]; 
      type: 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner';
      condition: 'training' | 'rest' | 'always'; 
      season: 'always' | 'winter' | 'summer' | 'spring' | 'autumn'; 
    }

    REGOLE:
    - Sii estremamente preciso con i grammi.
    - Se un pasto ha più opzioni (es. Carne o Pesce), crea due oggetti MealOption diversi.
    - Restituisci SOLO il JSON raw, senza markdown blocchi o altro. Solo l'array [ { ... }, ... ].
    - Testo della dieta:
    ---
    ${text}
    ---
  `;

  try {
    const responseText = (await callGeminiSafe(prompt, WORKER_MODELS)).trim();
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('AI Extraction Error:', e);
    return [];
  }
}

export async function getRecipeAI(mealName: string, description: string, user: 'Michael' | 'Jessica' = 'Michael'): Promise<string> {
  const data = await getData();
  const activeOffers = data.activeOffers || [];
  const currentMonth = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(new Date());

  const prompt = `
    Sei un Top Chef stile "Giallo Zafferano", esperto nel rendere deliziosi i piatti dietetici.
    Utente: ${user}. Mese: ${currentMonth}.
    Offerte Conad: ${JSON.stringify(activeOffers)}
    
    RICETTA PER: "${mealName}"
    INGREDIENTI E QUANTITÀ (Dalla Dieta): "${description}"
    
    REGOLE TASSATIVE:
    1. **STRICT INGREDIENTS**: Usa SOLO gli ingredienti elencati. Non aggiungere altro.
    2. **ZERO OLIO IN COTTURA**: Regola ferrea.
    3. **FORMATTAZIONE & SPAZIATURA (IMPORTANTE)**: 
       - Usa TITOLI GRANDI (## Titolo).
       - Usa Sottotitoli in grassetto o ### per le sezioni (Ingredienti, Procedimento).
       - **LASCIA UNA RIGA VUOTA TRA OGNI PARAGRAFO O STEP**. Il testo deve respirare.
       - Usa elenchi puntati per gli ingredienti.
       - Usa elenchi numerati per il procedimento.
    4. **STILE**: 
       - ⏱️ Tempi in evidenza.
       - 👩‍🍳 Procedimento dettagliato ma ben spaziato.
       - 💡 Tocco dello Chef ben separato alla fine.
    5. **OFFERTE**: Segnala con 🏷️.
  `;

  try {
    let text = await callGeminiSafe(prompt, CHEF_MODELS);

    // Force extra spacing for mobile clarity
    text = text.replace(/(\r\n|\r|\n)/g, '\n\n');
    text = text.replace(/\n\n\n+/g, '\n\n'); // Avoid triple newlines

    return text;
  } catch (error) {
    console.error('Recipe AI Error:', error);
    return 'Non sono riuscito a trovare una ricetta. Ricorda: No Olio!';
  }
}

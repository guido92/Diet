'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { MealOption, generateLocalPlan, getSeasonalFruit, getSeasonalVeg } from './guidelines';
import { WeeklyPlan, updateUserGuidelines, getData, updateActiveOffers, ConadOffer, saveData, DailyPlan } from './data';
import { searchGialloZafferano } from './scraper';

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
  const seasonalFruit = getSeasonalFruit();
  const seasonalVeg = getSeasonalVeg();

  console.log(`Generating plan for ${user} considering ${activeOffers.length} current offers...`);

  const prompt = `
      Sei un assistente nutrizionista rigoroso. Devi generare un piano settimanale di 7 giorni per ${user} seguendo le Linee Guida.
      Linee guida disponibili(VINCOLANTI): ${JSON.stringify(userGuidelines)}
      Offerte correnti al Conad(OPZIONALI): ${JSON.stringify(activeOffers)}
      
      Lista Frutta di Stagione(DA CUI SCEGLIERE): ${JSON.stringify(seasonalFruit)}
      Lista Verdura di Stagione(DA CUI SCEGLIERE): ${JSON.stringify(seasonalVeg)}
      
      REGOLE FONDAMENTALI(DA RISPETTARE AL 100 %):
  1. ** DIETA RIGIDA **: ${user} è a dieta.Niente sgarri non previsti.
      2. ** ORARI SACRI **:
         - ** LUNEDÌ - VENERDÌ **: SOLO pasti sani da dieta(NO \`l_suoceri\`, NO \`d_amici\`, NO \`d2\`). 
            > È VIETATO inserire pranzi dai suoceri o cene fuori in settimana.
         - **SABATO - DOMENICA**: Concessi ma limitati. 
            > MAX 1 "Pranzo dai Suoceri" (\`l_suoceri\`) in tutto il weekend.
            > MAX 1 "Uscita con Amici" (\`d_amici\`) O "Pasto Libero" (\`d2\`) in tutto il weekend.
      
      3. **COMPATIBILITÀ COPPIA**:
         - **CENA (Lun-Dom)** e **PRANZO (Sab-Dom)**: Scegli SOLO pasti che hanno \`owners\` che include SIA "Michael" CHE "Jessica". (Mangiano insieme).
         - **PRANZO (Lun-Ven)**: Scegli pasti dove \`owners\` include "${user}".
      
      4. **ALLENAMENTO (Training)**:
         ${user === 'Michael' ?
      '- **MICHAEL**: Si allena TASSATIVAMENTE e SOLO **Martedì** e **Giovedì**. (Imposta `training: true` martedì/giovedì, `false` altri giorni).' :
      '- **JESSICA**: Allenamento variabile o riposo.'}

      5. **CHEF MODE & SPECIFICITÀ TOTALE (CRUCIALE)**:
         - **BASTA GENERALITÀ**: È VIETATO scrivere solo "Frutta" o "Verdura" generica.
         - **SELEZIONE OBBLIGATORIA**:
           > Per OGNI pasto che include verdure, SCEGLI 1 VERDURA SPECIFICA dalla lista fornita (es. "Spinaci").
           > Per OGNI pasto che include frutta, SCEGLI 1 FRUTTO SPECIFICO dalla lista fornita (es. "Mele").
           > Inserisci queste scelte nei campi \`specificVeg\` e \`specificFruit\` del JSON.

         - **INTEGRAZIONE OFFERTE (SMART SHOPPER)**:
           > Analizza 'Offerte correnti'. Se un ingrediente della dieta (es. "Carne") corrisponde a un'offerta (es. "Macinato magro"), USA QUELL'OFFERTA per creare la ricetta.
           > Se l'offerta è una Proteina (es. Orata, Merluzzo, Tacchino), scrivila nel campo \`specificProtein\`.
           > Sii molto specifico nei nomi dei piatti se usi un'offerta (es. "Orata al forno" se Orata è in offerta).

         - **VARIETÀ CARBOIDRATI (NOIA ZERO)**:
           > Il 'Pane' NON deve essere l'unico carboidrato.
           > Se il pasto prevede 'Pane', SOSTITUISCILO nel 40% dei casi con:
             - Patate (3 volte il peso del pane, es. 50g pane -> 150g patate).
             - Cereali (Riso, Farro, Orzo) o Gallette.
           > Scrivi la sostituzione nel campo \`specificCarb\` (es. "Patate al forno", "Riso Basmati").

          - **ABBINAMENTI DI GUSTO (ARMONIA)**:
            > Lo Chef deve avere GUSTO. Evita abbinamenti che stonano.
            > **Pesce Bianco/Salmone**: Abbina con verdure delicate (Zucchine, Fagiolini, Patate, Pomodorini, Finocchi).
              - **VIETATO**: Pesce con Radicchio o Cavoli amari (Disgustoso!).
            > **Carne Rossa**: Abbina con verdure decise (Radicchio, Spinaci, Funghi, Rucola).
            > **Uova**: Abbina con Asparagi, Zucchine, Spinaci.
            > **Pollo/Tacchino**: Sta bene con tutto, ma varia i colori.

          - **SOCIAL E CHIACCHIERE (TIPS SALUTARI)**:
            > Se il pasto è LIBERO o SOCIALE (\`d2\`, \`d_amici\`, \`l_suoceri\`), non lasciare vuoto.
            > Scrivi un consiglio simpatico e utile nel campo 'recipe':
              - "Pizza Stasera? 🍕 Provala con verdure grigliate o Salsiccia e Friarielli (senza esagerare col bordo)."
              - "Sushi? 🍣 Punta su Sashimi e Tartare, limita Rolls fritti e salse dolci."
              - "Pub/Burger? 🍔 Meglio senza bacon, abbonda con insalata e pomodoro."
              - "Dai Suoceri? 🍝 Goditi la pasta ma evita il tris di dolci!"
            > Rendi il consiglio specifico per il giorno (es. Venerdì -> probabile Sushi/Pub, Sabato -> Pizza).

         - **VARIETÀ PASTA & CEREALI**:
           > Se il pasto è 'l2' (Pasta/Riso), ALTERNA i formati e i cereali.
           > Scrivi sempre il condimento (es. "Spaghetti aglio olio e peperoncino" se olio permesso).

         - **Dettagli (_details)**:
           > Compila SEMPRE i campi '_details' per ogni pasto (colazione inclusa).
           > Usa nomi di piatti reali e invitanti.

      6. **OUTPUT JSON (STRUTTURA OBBLIGATORIA)**:
         Restituisci SOLO il JSON raw del piano settimanale (WeeklyPlan).
         Struttura: 
         { 
           "Monday": { 
             "breakfast": "id...", "breakfast_details": { "name": "...", "recipe": "...", "specificFruit": "Mela", "specificVeg": "" },
             "snack_am": "id...", "snack_am_details": { "name": "...", "recipe": "...", "specificFruit": "Kiwi" },
             "lunch": "id...", "lunch_details": { "name": "...", "recipe": "...", "specificVeg": "Broccoli", "specificProtein": "Petto di Pollo", "specificCarb": "Riso Venere" },
             "snack_pm": "id...", "snack_pm_details": { "name": "...", "recipe": "..." },
             "dinner": "id...", "dinner_details": { "name": "...", "recipe": "...", "specificVeg": "Spinaci", "specificProtein": "Orata", "specificCarb": "Patate al Forno" },
             "training": true/false
           }, 
           ... 
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

export async function smartSyncOffersAction(): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const data = await getData();

    // We will accumulate new offers here and only replace if we find something
    let newActiveOffers: ConadOffer[] = [];
    // Clear FLYERS list to start fresh detection, but keep offers until we have new ones
    data.conadFlyers = [];

    let totalOffers = 0;
    let flyersFound = 0;

    for (const store of CONAD_STORES) {
      console.log(`Smart Sync: Checking store ${store.name}...`);
      const storePage = await fetch(store.url).then(r => r.text());

      const flyerLinks = storePage.match(/\/volantini\/cia-[^"'\s<>]+/g);
      if (!flyerLinks) continue;

      const uniqueLinks = Array.from(new Set(flyerLinks));

      for (const link of uniqueLinks) {
        const viewerUrl = link.startsWith('http') ? link : `https://www.conad.it${link}`;
        const viewerPage = await fetch(viewerUrl).then(r => r.text());

        // Extract title
        const titleMatch = viewerPage.match(/<title>([^<]+)<\/title>/i);
        const flyerTitle = titleMatch ? titleMatch[1].split('|')[0].trim() : 'Volantino';

        // Match URLs that look like PDFs in the Conad assets
        // This regex is more robust: it looks for .pdf and stops at the first delimiter
        const pdfMatches = viewerPage.match(/https:\/\/www\.conad\.it\/assets\/common\/volantini\/cia\/[^\s"'>]+\.pdf(?:\?[^\s"'>\/]+)?/g);

        if (pdfMatches && pdfMatches[0]) {
          const pdfUrl = pdfMatches[0].replace(/\\u0026/g, '&');

          // Blacklist di URL sicuramente inutili per la spesa
          const IGNORED_KEYWORDS = [
            'CONAD_PAY', 'CaseCura', 'viaggi', 'assicurazioni', 'accumulo',
            'manuale', 'regolamento', 'flyer_scelte_stagione', 'distributore',
            'A4_Mipremio', 'A4_HeyCND', 'WEB_Leaflet_CaseCura', 'scelte_stagione', 'A4_Distributore'
          ];

          if (IGNORED_KEYWORDS.some(k => pdfUrl.includes(k))) {
            console.log(`SKIP IRRELEVANT PDF: ${pdfUrl}`);
            continue;
          }

          if (pdfUrl.includes('/renditions/') || pdfUrl.includes('/thumbs/') || pdfUrl.toLowerCase().endsWith('.webp')) {
            console.log(`Skipping non-pdf URL: ${pdfUrl}`);
            continue;
          }

          // Update or Add flyer info
          const flyerIndex = data.conadFlyers.findIndex(f => f.url === pdfUrl);
          const flyerInfo = {
            url: pdfUrl,
            lastSync: new Date().toISOString(),
            label: `${store.name} - ${flyerTitle}`,
            storeId: store.id
          };

          if (flyerIndex >= 0) {
            data.conadFlyers[flyerIndex] = flyerInfo;
          } else {
            data.conadFlyers.push(flyerInfo);
          }

          flyersFound++;

          // Parse this flyer immediately using a raw fetch to avoid bot detection issues
          console.log(`Parsing ${pdfUrl}...`);
          try {
            // Mimic a browser to avoid 403 Forbidden on some CDNs
            const pdfResponse = await fetch(pdfUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/pdf'
              }
            });

            if (pdfResponse.ok) {
              const buffer = Buffer.from(await pdfResponse.arrayBuffer());

              if (typeof pdf === 'function') {
                const pdfData = await pdf(buffer);
                const textLen = pdfData.text ? pdfData.text.length : 0;
                console.log(`EXTRACTED_TEXT_DEBUG: URL=${pdfUrl} LEN=${textLen}`);

                if (textLen < 200) {
                  console.warn(`SKIP: Text mostly empty for ${pdfUrl}. Possible Image PDF.`);
                  continue;
                }

                const offers = await extractOffersAI(pdfData.text, store.name);
                console.log(`AI_OFFERS_DEBUG: Found ${offers.length} offers for ${store.name}`);

                if (offers && offers.length > 0) {
                  newActiveOffers = [...newActiveOffers, ...offers];
                  totalOffers += offers.length;
                }

                // THROTTLING to avoid Rate Limit (429)
                console.log('Throttling... waiting 6s before next PDF...');
                await new Promise(r => setTimeout(r, 6000));

              } else {
                console.error('CRITICAL: pdf-parse is not a function despite check');
              }
            } else {
              console.error(`PDF Fetch Failed: ${pdfUrl} Status: ${pdfResponse.status}`);
            }
          } catch (err) {
            console.error(`Failed to parse PDF ${pdfUrl}:`, err);
          }
        }
      }
    }

    if (totalOffers > 0) {
      data.activeOffers = newActiveOffers;
      await saveData(data);
      return {
        success: true,
        message: `Sincronizzazione completata! Trovati ${flyersFound} volantini e ${totalOffers} offerte.`,
        count: totalOffers
      };
    } else {
      // If we found NO offers, maybe keep the old ones to be safe?
      // But we still save the new flyers list.
      await saveData(data);
      return { success: false, message: 'Non ho trovato nuove offerte valide (mantenute le precedenti se presenti).', count: data.activeOffers.length };
    }
    return { success: false, message: 'Non ho trovato nuovi volantini validi al momento.', count: 0 };
  } catch (error) {
    console.error('Smart Sync Error:', error);
    return { success: false, message: 'Errore durante la sincronizzazione automatica.', count: 0 };
  }
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

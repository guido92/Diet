'use server';

// Force Rebuild Action Hash


import fs from 'fs/promises';
import path from 'path';
import { GUIDELINES, MealOption, getSeasonalFruit, getSeasonalVeg, getCurrentSeason } from './guidelines';
import { revalidatePath } from 'next/cache';

const DATA_FILE = process.env.DATA_FILE_PATH || path.resolve(process.cwd(), '../tracker_data.json');

// ... existing types ...

// ... existing code ...

import { getUserSession as getUserSessionAction } from './actions';

export async function getUserSession() {
    return getUserSessionAction();
}

// ...

export async function updateUserGuidelines(guidelines: MealOption[]) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    data.users[userRole].guidelines = guidelines;
    await saveData(data);
}

export async function updateUserProfile(profileData: Partial<UserProfile>) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    const user = data.users[userRole];

    if (profileData.birthDate) user.birthDate = profileData.birthDate;
    if (profileData.sex) user.sex = profileData.sex;
    if (profileData.activityLevel) user.activityLevel = profileData.activityLevel;
    if (profileData.intolerances !== undefined) user.intolerances = profileData.intolerances;
    if (profileData.dislikes !== undefined) user.dislikes = profileData.dislikes;
    if (profileData.allergies !== undefined) user.allergies = profileData.allergies;
    if (profileData.height) user.height = profileData.height;
    if (profileData.startWeight) user.startWeight = profileData.startWeight;
    if (profileData.targetWeight) user.targetWeight = profileData.targetWeight;

    await saveData(data);
    revalidatePath('/profile');
    revalidatePath('/');
}

export async function removeHistoryItem(date: string, user: string, mealType: string) {
    const data = await getData();
    if (!data.history) return;

    data.history = data.history.filter(h => !(h.date === date && h.user === user && h.mealType === mealType));
    await saveData(data);
    revalidatePath('/tracker');
}

export async function refreshSingleMeal(dayName: string, mealType: string) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    const user = data.users[userRole];

    // ... (Rest of function remains same, just ensuring userRole is correct)

    // Safety check
    if (!user.plan || !user.plan[dayName]) return;

    const currentPlan = user.plan[dayName];
    const currentMealId = (currentPlan as Record<string, any>)[mealType];
    const isTraining = currentPlan.training;
    const season = getCurrentSeason();

    // Find all valid candidates
    const validOptions = GUIDELINES.filter(g => {
        // Must match meal type (lunch, dinner, etc.)
        if (g.type !== mealType) return false;

        // Must belong to user (or both)
        if (g.owners && !g.owners.includes(userRole)) return false;

        // Season check
        if (g.season !== 'always' && g.season !== season) return false;

        // Training check
        if (g.condition === 'training' && !isTraining) return false;
        if (g.condition === 'rest' && isTraining) return false;

        return true;
    });

    // Filter out current if possible (unless it's the only one)
    const otherOptions = validOptions.filter(o => o.id !== currentMealId);
    if (otherOptions.length === 0 && validOptions.length === 0) return; // No options at all?

    // Pick random
    const pool = otherOptions.length > 0 ? otherOptions : validOptions;
    const newMeal = pool[Math.floor(Math.random() * pool.length)];

    // Generate Details (with specific Fruit/Veg)
    const newDetails: MealDetails = {
        name: newMeal.name,
        recipe: newMeal.description,
        recipeUrl: '',
        imageUrl: ''
    };

    // Auto-Select Specifics
    const seasonalFruit = getSeasonalFruit();
    const seasonalVeg = getSeasonalVeg();

    const hasFruit = newMeal.ingredients.some(i => i.name === 'Frutta di Stagione');
    const hasVeg = newMeal.ingredients.some(i => i.name.includes('Verdura di Stagione'));

    if (hasFruit) {
        newDetails.specificFruit = seasonalFruit[Math.floor(Math.random() * seasonalFruit.length)];
    }
    if (hasVeg) {
        newDetails.specificVeg = seasonalVeg[Math.floor(Math.random() * seasonalVeg.length)];
    }

    // Update Plan
    if (user.plan && user.plan[dayName]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user.plan[dayName] as Record<string, any>)[mealType] = newMeal.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (user.plan[dayName] as Record<string, any>)[`${mealType}_details`] = newDetails;
    }

    await saveData(data);
    revalidatePath('/');
    return { success: true, mealName: newMeal.name };
}

// ...

// function moved to end of file

export async function rateMeal(dayName: string, mealType: string, rating: 'up' | 'down' | undefined) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    const details = data.users[userRole].plan[dayName][`${mealType}_details` as keyof DailyPlan] as MealDetails | undefined;
    if (details) {
        // Toggle off if clicking same rating
        if (details.rating === rating) details.rating = undefined;
        else details.rating = rating;

        await saveData(data);
        revalidatePath('/');
    }
}

export async function getData(): Promise<AppData> {
    try {
        const content = await fs.readFile(DATA_FILE, 'utf-8');
        const data = JSON.parse(content);
        if (!data.users) return DEFAULT_DATA;
        if (!data.manualShoppingItems) data.manualShoppingItems = [];
        if (!data.activeOffers) data.activeOffers = [];
        if (!data.recipes) data.recipes = {};
        if (!data.conadFlyers) data.conadFlyers = [];
        if (!data.syncStatus) data.syncStatus = { state: 'idle', message: '', lastUpdate: 0 };
        if (!data.history) data.history = [];

        // Force update guidelines to match latest code definitions
        data.users.Michael.guidelines = GUIDELINES;
        data.users.Jessica.guidelines = GUIDELINES;

        // Override currentUser with session if available
        const session = await getUserSession();
        if (session) {
            data.currentUser = session;
        }

        return data;
    } catch (error) {
        console.error("CRITICAL ERROR LOADING DATA:", error);
        console.log("Attempting to load FROM:", DATA_FILE);
        try {
            await saveData(DEFAULT_DATA);
        } catch (saveError) {
            console.warn('Could not save default data (likely build environment):', saveError);
        }
        return DEFAULT_DATA;
    }
}

// ...

export async function setCurrentUser(userName: 'Michael' | 'Jessica') {
    const data = await getData();
    data.currentUser = userName;
    await saveData(data);
    revalidatePath('/');
    revalidatePath('/planner');
    revalidatePath('/shopping');
    revalidatePath('/tracker');
}

export async function updateWeight(weight: number, notes?: string) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    const user = data.users[userRole];
    user.currentWeight = weight;
    user.logs.push({
        date: new Date().toISOString().split('T')[0],
        weight,
        notes
    });
    await saveData(data);
    revalidatePath('/tracker');
}

export async function updateTargetWeight(weight: number) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    data.users[userRole].targetWeight = weight;
    await saveData(data);
    revalidatePath('/tracker');
}

export async function addSgarro(sgarro: string) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    const user = data.users[userRole];
    const today = new Date().toISOString().split('T')[0];
    const logIndex = user.logs.findIndex(l => l.date === today);
    if (logIndex >= 0) {
        const existing = user.logs[logIndex].notes || '';
        user.logs[logIndex].notes = existing ? `${existing}, ${sgarro}` : sgarro;
    } else {
        user.logs.push({ date: today, notes: sgarro });
    }
    await saveData(data);
}

export async function removeSgarro(date: string, noteFragment: string) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    const user = data.users[userRole];

    // Find log by date
    const logIndex = user.logs.findIndex(l => l.date === date);
    if (logIndex >= 0) {
        // If exact match of notes, remove log. If partial, maybe remove sub-part? 
        // For simplicity, if we pass the full note content, we remove the log or clear it.
        // User asked to remove "items".
        // If sgarro is "Pizza, Birra", and we want to remove "Birra"?
        // Complexity. current UI shows one line. Let's just remove the day's sgarro for now or specific log entry if we had IDs.
        // We don't have IDs for logs. We have Date.
        const notes = user.logs[logIndex].notes || '';
        if (notes === noteFragment) {
            user.logs.splice(logIndex, 1);
        } else {
            // Try to remove split by comma?
            // Simple approach: Remove the whole log for that date if the user confirms.
            // But the UI iterates over logs.
            // Let's assume we remove the log entry found at that index.
            user.logs.splice(logIndex, 1);
        }
    }
    await saveData(data);
    revalidatePath('/tracker');
}

export async function saveWeeklyPlan(plan: WeeklyPlan) {
    const data = await getData();
    const userRole = (await getUserSession()) || 'Michael';
    data.users[userRole].plan = plan;
    await saveData(data);
    revalidatePath('/');
    revalidatePath('/planner');
    revalidatePath('/shopping');
}

export type MealDetails = {
    name: string;
    recipe: string;
    recipeUrl?: string; // Link to external recipe (e.g. GialloZafferano)
    imageUrl?: string;  // Scraped Image URL
    specificFruit?: string; // e.g. "Mele" instead of "Frutta"
    specificVeg?: string;   // e.g. "Broccoli" instead of "Verdura"
    specificProtein?: string;   // e.g. "Orata" instead of "Pesce Bianco"
    specificCarb?: string;      // e.g. "Patate" instead of "Pane"
    eaten?: boolean;
    rating?: 'up' | 'down';
    photoUrl?: string;
    aiAnalysis?: string;
    aiRating?: number;
};

// ... existing code ...

export type UserProfile = {
    startWeight: number;
    currentWeight: number;
    targetWeight: number;
    height: number;
    plan: WeeklyPlan;
    logs: LogEntry[];
    guidelines: MealOption[];
    // Profile Fields
    birthDate?: string; // YYYY-MM-DD
    sex?: 'M' | 'F';
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    intolerances?: string;
    dislikes?: string;
    allergies?: string;
};

export type WeeklyPlan = Record<string, DailyPlan>;

export type DailyPlan = {
    breakfast: string;
    breakfast_details?: MealDetails;
    snack_am: string;
    snack_am_details?: MealDetails;
    lunch: string;
    lunch_details?: MealDetails;
    snack_pm: string;
    snack_pm_details?: MealDetails;
    dinner: string;
    dinner_details?: MealDetails;
    training: boolean;
};

export type LogEntry = {
    date: string; // ISO Date YYYY-MM-DD
    weight?: number;
    notes?: string;
    completed?: boolean;
};

export type ManualItem = {
    id: string;
    name: string;
    amount: string;
    price: number;
    checked: boolean;
};

export type ConadOffer = {
    categoria: string;
    prodotto: string;
    prezzo: string;
    unita: string;
    note?: string;
    sconto?: string;
    negozio?: string;
};

export type FlyerInfo = {
    url: string;
    lastSync: string;
    label?: string;
    storeId?: string;
};

export type MealHistory = {
    date: string;
    user: string;
    mealType: string;
    mealName: string;
    photoUrl?: string;
    rating?: 'up' | 'down';
};

export type AppData = {
    currentUser: 'Michael' | 'Jessica';
    users: {
        Michael: UserProfile;
        Jessica: UserProfile;
    };
    manualShoppingItems: ManualItem[];
    pantryItems: string[]; // List of ingredient names in pantry
    conadFlyers: FlyerInfo[];
    activeOffers: ConadOffer[];
    lastOfferUpdate?: string;
    recipes?: Record<string, RecipeCacheItem>; // Cache for scraped recipes
    message: string;
    lastUpdate: number;
    history: MealHistory[];
    lastAutoRoutine?: string;
    syncStatus: {
        state: 'idle' | 'running' | 'success' | 'error';
        message: string;
        lastUpdate: number;
    };
};

export type RecipeCacheItem = {
    url: string;
    imageUrl?: string;
    aiContent?: string;
    lastChecked: string;
};

// ... existing code ...

const DEFAULT_USER: UserProfile = {
    startWeight: 111,
    currentWeight: 111,
    targetWeight: 85,
    height: 170,
    plan: {},
    logs: [],
    guidelines: GUIDELINES,
    sex: 'M',
    activityLevel: 'sedentary'
};

const DEFAULT_JESSICA: UserProfile = {
    startWeight: 70,
    currentWeight: 70,
    targetWeight: 58,
    height: 165,
    plan: {},
    logs: [],
    guidelines: GUIDELINES,
    sex: 'F',
    activityLevel: 'moderate'
};

const DEFAULT_DATA: AppData = {
    currentUser: 'Michael',
    users: {
        Michael: DEFAULT_USER,
        Jessica: DEFAULT_JESSICA,
    },
    manualShoppingItems: [],
    pantryItems: ['Sale', 'Pepe', 'Olio EVO', 'Aceto', 'Caffè', 'Zucchero', 'Spezie'],
    conadFlyers: [
        { url: 'https://www.conad.it/assets/common/volantini/cia/v2526p/2526P_NATALE_15_24dic_CONAD_RM.pdf', lastSync: '', label: 'Conad Bessarione (Natale)', storeId: '008400' },
        { url: 'https://www.conad.it/assets/common/volantini/cia/vspazi/SPAZIO_CESENA_2528A_NATALE_15DIC_24DIC_WEB.pdf', lastSync: '', label: 'Spazio Conad Lucchi (Natale)', storeId: '007226' }
    ],
    activeOffers: [],
    recipes: {},
    syncStatus: { state: 'idle', message: '', lastUpdate: 0 },
    history: [],
    message: '',
    lastUpdate: 0
};


function archiveMealHelper(data: AppData, entry: MealHistory) {
    if (!data.history) data.history = [];
    const existingIndex = data.history.findIndex(h => h.date === entry.date && h.user === entry.user && h.mealType === entry.mealType);
    if (existingIndex >= 0) {
        data.history[existingIndex] = entry;
    } else {
        data.history.push(entry);
    }
}

export async function togglePantryItem(item: string) {
    const data = await getData();
    if (!data.pantryItems) data.pantryItems = [];

    if (data.pantryItems.includes(item)) {
        data.pantryItems = data.pantryItems.filter(i => i !== item);
    } else {
        data.pantryItems.push(item);
    }
    await saveData(data);
}


export async function toggleMealEaten(dayName: string, mealType: string, photoUrl?: string, aiAnalysis?: string, aiRating?: number) {
    const data = await getData();
    const userRole = data.currentUser;
    const details = data.users[userRole].plan[dayName][`${mealType}_details` as keyof DailyPlan] as MealDetails | undefined;
    if (details) {
        // If we are marking as eaten (turning true) and have new data, update it
        if (!details.eaten && photoUrl) {
            details.photoUrl = photoUrl;
            details.aiAnalysis = aiAnalysis;
            details.aiRating = aiRating;
        }

        details.eaten = !details.eaten;

        // Auto-Archive internally if eaten is true (No double save/race condition)
        if (details.eaten) {
            archiveMealHelper(data, {
                date: new Date().toISOString().split('T')[0],
                user: userRole,
                mealType: mealType,
                mealName: details.name,
                photoUrl: details.photoUrl,
                rating: details.rating
            });
        }

        await saveData(data);
        revalidatePath('/');
    }
}

export async function archiveMealAction(entry: MealHistory) {
    const data = await getData();
    archiveMealHelper(data, entry);
    await saveData(data);
}

export async function cleanupOldDataAction() {
    const data = await getData();
    if (!data.history) return;

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. Filter History
    const initialCount = data.history.length;
    data.history = data.history.filter(h => {
        const d = new Date(h.date).getTime();
        return (now - d) < THIRTY_DAYS_MS;
    });

    if (data.history.length < initialCount) {
        console.log(`[CLEANUP] Removed ${initialCount - data.history.length} old history entries.`);
        await saveData(data);
    }

    // 2. Clean Orphans in Public Uploads (Optional: requires file system scan)
    // We can do this later.
}

export async function updateAutoRoutineDate() {
    const data = await getData();
    data.lastAutoRoutine = new Date().toISOString().split('T')[0];
    await saveData(data);
}









export async function getSyncStatusAction() {
    const data = await getData();
    // Return a subset or just the status to be safe/lightweight
    return data.syncStatus || { state: 'idle', message: '', lastUpdate: 0 };
}

export async function saveData(data: AppData): Promise<void> {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function updateActiveOffers(offers: ConadOffer[]) {
    const data = await getData();
    // Unique by product name
    const existingNames = new Set(data.activeOffers.map(o => o.prodotto.toLowerCase()));
    const newUniqueOffers = offers.filter(o => !existingNames.has(o.prodotto.toLowerCase()));
    data.activeOffers = [...data.activeOffers, ...newUniqueOffers];
    data.lastOfferUpdate = new Date().toISOString();
    await saveData(data);
    revalidatePath('/shopping');
}

export async function clearActiveOffers() {
    const data = await getData();
    data.activeOffers = [];
    data.conadFlyers = data.conadFlyers.map(f => ({ ...f, lastSync: '' }));
    data.lastOfferUpdate = undefined;
    await saveData(data);
    revalidatePath('/shopping');
}

export async function addManualShoppingItem(name: string, amount: string, price: number) {
    const data = await getData();
    const newItem: ManualItem = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        amount,
        price,
        checked: false
    };
    data.manualShoppingItems.push(newItem);
    await saveData(data);
    revalidatePath('/shopping');
}

export async function removeManualShoppingItem(id: string) {
    const data = await getData();
    data.manualShoppingItems = data.manualShoppingItems.filter(i => i.id !== id);
    await saveData(data);
    revalidatePath('/shopping');
}

export async function toggleManualShoppingItem(id: string) {
    const data = await getData();
    const item = data.manualShoppingItems.find(i => i.id === id);
    if (item) item.checked = !item.checked;
    await saveData(data);
    revalidatePath('/shopping');
}

// Duplicates removed (these functions were already defined/updated earlier in the file)

export async function saveCouplePlansAction(michaelPlan: WeeklyPlan, jessicaPlan: WeeklyPlan) {
    const data = await getData();
    data.users.Michael.plan = michaelPlan;
    data.users.Jessica.plan = jessicaPlan;
    await saveData(data);
    revalidatePath('/');
    revalidatePath('/planner');
    revalidatePath('/shopping');
    revalidatePath('/summary');
}

export async function getRecipeAction(mealName: string): Promise<RecipeCacheItem | null> {
    const data = await getData();
    if (data.recipes && data.recipes[mealName]) {
        return data.recipes[mealName];
    }
    return null;
}

export async function saveRecipeAction(mealName: string, recipe: RecipeCacheItem) {
    const data = await getData();
    if (!data.recipes) data.recipes = {};

    // Merge with existing to preserve AI content if we are just updating link/image, or vice versa
    const existing = data.recipes[mealName] || {};
    data.recipes[mealName] = { ...existing, ...recipe };

    await saveData(data);
}



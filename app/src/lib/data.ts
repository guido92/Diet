'use server';

// Force Rebuild Action Hash


import fs from 'fs/promises';
import path from 'path';
import { GUIDELINES, MealOption, getSeasonalFruit, getSeasonalVeg, getCurrentSeason } from './guidelines';
import { revalidatePath } from 'next/cache';

const DATA_FILE = process.env.DATA_FILE_PATH || path.resolve(process.cwd(), '../tracker_data.json');

// ... existing types ...

// ... existing code ...

export async function updateUserGuidelines(guidelines: MealOption[]) {
    const data = await getData();
    data.users[data.currentUser].guidelines = guidelines;
    await saveData(data);
}

export async function refreshSingleMeal(dayName: string, mealType: string) {
    const data = await getData();
    const userRole = data.currentUser;
    const user = data.users[userRole];

    // Safety check
    if (!user.plan || !user.plan[dayName]) return;

    const currentPlan = user.plan[dayName];
    // @ts-ignore
    const currentMealId = currentPlan[mealType];
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
    // @ts-ignore
    user.plan[dayName][mealType] = newMeal.id;
    // @ts-ignore
    user.plan[dayName][`${mealType}_details`] = newDetails;

    await saveData(data);
    revalidatePath('/');
    return { success: true, mealName: newMeal.name };
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
    syncStatus?: {
        state: 'idle' | 'running' | 'success' | 'error';
        message: string;
        lastUpdate: number;
    };
};

export type RecipeCacheItem = {
    url: string;
    imageUrl?: string;
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
};

const DEFAULT_JESSICA: UserProfile = {
    startWeight: 70,
    currentWeight: 70,
    targetWeight: 58,
    height: 165,
    plan: {},
    logs: [],
    guidelines: GUIDELINES,
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
    syncStatus: { state: 'idle', message: '', lastUpdate: 0 }
};

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

export async function toggleMealEaten(dayName: string, mealType: string) {
    const data = await getData();
    const userRole = data.currentUser;
    const details = data.users[userRole].plan[dayName][`${mealType}_details` as keyof DailyPlan] as MealDetails | undefined;
    if (details) {
        details.eaten = !details.eaten;
        await saveData(data);
        revalidatePath('/');
    }
}

export async function rateMeal(dayName: string, mealType: string, rating: 'up' | 'down' | undefined) {
    const data = await getData();
    const userRole = data.currentUser;
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

        // Force update guidelines to match latest code definitions
        data.users.Michael.guidelines = GUIDELINES;
        data.users.Jessica.guidelines = GUIDELINES;

        return data;
    } catch (error) {
        try {
            await saveData(DEFAULT_DATA);
        } catch (writeError) {
            console.warn('Could not save default data (likely build environment):', writeError);
        }
        return DEFAULT_DATA;
    }
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
    const user = data.users[data.currentUser];
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
    data.users[data.currentUser].targetWeight = weight;
    await saveData(data);
    revalidatePath('/tracker');
}

export async function addSgarro(sgarro: string) {
    const data = await getData();
    const user = data.users[data.currentUser];
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

export async function saveWeeklyPlan(plan: WeeklyPlan) {
    const data = await getData();
    data.users[data.currentUser].plan = plan;
    await saveData(data);
    revalidatePath('/');
    revalidatePath('/planner');
    revalidatePath('/shopping');
}

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
    data.recipes[mealName] = recipe;
    await saveData(data);
}



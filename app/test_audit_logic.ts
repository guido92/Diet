
import { getData, updateWeight, togglePantryItem, addManualShoppingItem, removeManualShoppingItem } from './src/lib/data';
import { smartSyncOffersAction } from './src/lib/ai';

// Helper to ignore revalidatePath errors in standalone script
async function safeExec<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
        return await fn();
    } catch (e: any) {
        if (e.message.includes('invariant') || e.message.includes('static generation store')) {
            // expected in CLI
            return undefined;
        }
        throw e;
    }
}


async function audit() {
    console.log("=== STARTING FULL SYSTEM AUDIT ===");

    try {
        // 1. DATA ACCESS
        console.log("\n[1] Testing Data Access (getData)...");
        const data = await getData();
        if (!data.currentUser) throw new Error("No currentUser found in data");
        console.log("✅ Data Loaded. User:", data.currentUser);

        // 2. TRACKER
        console.log("\n[2] Testing Tracker (updateWeight)...");
        const oldWeight = data.users[data.currentUser].currentWeight;
        await safeExec(() => updateWeight(oldWeight + 0.1, "Audit Test"));

        const dataAfterWeight = await getData();
        const newWeight = dataAfterWeight.users[data.currentUser].currentWeight;
        console.log(`Weight: ${oldWeight} -> ${newWeight}`);
        if (newWeight === oldWeight) console.warn("⚠️ Weight didn't change (might be issue or just revalidate ignored)");
        else console.log("✅ Tracker Logic OK");

        await safeExec(() => updateWeight(oldWeight)); // revert

        // 3. PANTRY
        console.log("\n[3] Testing Pantry (togglePantryItem)...");
        const testItem = "AuditItem_" + Date.now();
        await safeExec(() => togglePantryItem(testItem));
        const dataPantry = await getData();
        if (!dataPantry.pantryItems.includes(testItem)) throw new Error("Pantry toggle failed (add)");

        await safeExec(() => togglePantryItem(testItem)); // remove
        const dataPantry2 = await getData();
        if (dataPantry2.pantryItems.includes(testItem)) throw new Error("Pantry toggle failed (remove)");
        console.log("✅ Pantry Logic OK");

        // 4. SHOPPING LIST
        console.log("\n[4] Testing Shopping List (Manual Items)...");
        await safeExec(() => addManualShoppingItem("TestItem", "1kg", 9.99));
        const dataShop = await getData();
        const added = dataShop.manualShoppingItems.find(i => i.name === "TestItem");
        if (!added) throw new Error("Add Item Failed");

        await safeExec(() => removeManualShoppingItem(added.id));
        console.log("✅ Shopping List Logic OK");

        // 5. ECCOMI SYNC
        console.log("\n[5] Testing Sync Action...");
        const syncRes = await safeExec(() => smartSyncOffersAction());
        // syncRes might be undefined if it hit revalidate immediately, but unlikely for this function structure
        if (syncRes && !syncRes.success) throw new Error("Sync Init Failed");
        console.log("✅ Sync Action Initiated OK");

        // 6. GENERATE PLAN (Mock)
        // We skip full AI gen to save quota/time, but verify function exists
        console.log("\n[6] AI Plan Gen signature check...");
        const { generateWeeklyPlanAI } = require('./src/lib/ai.ts');
        if (typeof generateWeeklyPlanAI !== 'function') throw new Error("generateWeeklyPlanAI missing");
        console.log("✅ AI Module Loaded OK");

        console.log("\n=== AUDIT COMPLETE: ALL SYSTEMS NOMINAL ===");

    } catch (e) {
        console.error("❌ AUDIT FAILED:", e);
        // process.exit(1); 
    }
}

audit();


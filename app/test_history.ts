
import { toggleMealEaten, getData, archiveMealAction, MealHistory } from './src/lib/data';
import { setCurrentUser } from './src/lib/data';

async function testArchiving() {
    console.log("--- Starting History Archive Test ---");

    // 1. Setup Wrapper
    // Ensure we are Michael for test
    // Assuming we can't easily mock cookies in this simple script if getUserSession relies on headers
    // But data.ts actions call getUserSession(). In a node script this will fail or return null?
    // Let's check actions.ts to see what getUserSession does in non-request context.

    // Actually, toggleMealEaten calls getUserSession(). If it fails, it defaults to 'Michael'.
    // "const userRole = (await getUserSession()) || 'Michael';" 
    // So this script should default to Michael, which is fine.

    // 2. Identify a meal to test
    const day = 'Monday';
    const meal = 'lunch';

    console.log(`Toggling ${day} ${meal}...`);

    try {
        // Toggle ON (Mark as eaten)
        // We'll pass some test data to ensure it propagates
        await toggleMealEaten(day, meal, 'http://fake.url/photo.jpg', 'AI Good Job', 9);
        console.log("Toggled ON.");

        // 3. Check Data
        const data = await getData();
        const history = data.history || [];
        const lastEntry = history[history.length - 1];

        console.log("History Length:", history.length);
        if (lastEntry) {
            console.log("Last Entry:", JSON.stringify(lastEntry, null, 2));

            if (lastEntry.photoUrl === 'http://fake.url/photo.jpg') {
                console.log("SUCCESS: Photo URL saved in history.");
            } else {
                console.error("FAIL: Photo URL NOT found in history.");
            }
        } else {
            console.error("FAIL: No history saved.");
        }

        // 4. Toggle OFF (Cleanup)
        // toggleMealEaten toggles. So calling it again should uncheck it.
        // But what about history? Logic says "Auto-Archive if eaten is true". 
        // It doesn't say "Remove from history if uneaten". This is expected behavior (history is a log of actions).
        await toggleMealEaten(day, meal);
        console.log("Toggled OFF (Cleanup).");

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    }
}

testArchiving();

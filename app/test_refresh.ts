
import { refreshSingleMeal, getData } from './src/lib/data';

async function test() {
    console.log("Testing refreshSingleMeal...");
    const data = await getData();
    const user = data.currentUser;
    console.log(`Current User: ${user}`);

    // Pick a day and meal to test
    const day = "Monday";
    const type = "lunch";

    console.log(`Refreshing ${day} ${type}...`);
    const result = await refreshSingleMeal(day, type);

    if (result) {
        console.log("✅ Success! New meal:", result.mealName);
    } else {
        console.log("❌ Failed! Returned undefined.");
    }
}

test();

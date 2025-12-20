import { NextResponse } from 'next/server';
import { getData } from '@/lib/data';
import { GUIDELINES } from '@/lib/guidelines';
import { ENGLISH_DAYS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getData();

        // Calculate Today and Tomorrow
        const dayIndex = new Date().getDay();
        const todayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        const tomorrowIndex = (todayIndex + 1) % 7;

        const todayKey = ENGLISH_DAYS[todayIndex];
        const tomorrowKey = ENGLISH_DAYS[tomorrowIndex];

        // Helper to get Meal Name
        const getMealName = (id?: string) => {
            if (!id) return 'Nessun pasto';
            const allGuidelines = [...data.users.Michael.guidelines, ...data.users.Jessica.guidelines, ...GUIDELINES];
            const found = allGuidelines.find(g => g.id === id);
            return found ? found.name : id;
        };

        const michaelToday = data.users.Michael.plan[todayKey];
        const jessicaToday = data.users.Jessica.plan[todayKey];
        const michaelTomorrow = data.users.Michael.plan[tomorrowKey];

        const response = {
            today: {
                day: todayKey,
                michael: {
                    lunch: getMealName(michaelToday?.lunch),
                    dinner: getMealName(michaelToday?.dinner),
                    training: michaelToday?.training || false
                },
                jessica: {
                    lunch: getMealName(jessicaToday?.lunch),
                    dinner: getMealName(jessicaToday?.dinner),
                    training: jessicaToday?.training || false
                }
            },
            tomorrow: {
                day: tomorrowKey,
                michael: {
                    lunch: getMealName(michaelTomorrow?.lunch),
                    dinner: getMealName(michaelTomorrow?.dinner),
                },
                // Shared dinner usually, so same for Jessica
            },
            offers_count: data.activeOffers?.length || 0,
            last_update: new Date().toISOString()
        };

        return NextResponse.json(response);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

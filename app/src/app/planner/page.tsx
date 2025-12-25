export const dynamic = 'force-dynamic';

import PlannerEditor from '@/components/PlannerEditor';
import { getData } from '@/lib/data';
import UserSwitcher from '@/components/UserSwitcher';
import DietUploader from '@/components/DietUploader';

export default async function PlannerPage({
    searchParams,
}: {
    searchParams: { view?: string };
}) {
    const data = await getData();

    // Determine which user to VIEW (from URL param or default to session user)
    // We await searchParams access
    const { view } = await searchParams;
    const viewUser = (view === 'Michael' || view === 'Jessica') ? view : data.currentUser;
    const activeUser = data.users[viewUser];

    return (
        <div style={{ paddingTop: '2rem' }}>
            <UserSwitcher currentUser={data.currentUser} />

            <div style={{ marginBottom: '2rem' }}>
                <DietUploader userName={viewUser} />
            </div>

            <PlannerEditor
                initialPlan={activeUser.plan}
                userName={viewUser}
                userGuidelines={activeUser.guidelines}
                activeOffers={data.activeOffers || []}
            />
        </div>
    );
}

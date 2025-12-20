import PlannerEditor from '@/components/PlannerEditor';
import { getData } from '@/lib/data';
import UserSwitcher from '@/components/UserSwitcher';
import DietUploader from '@/components/DietUploader';

export default async function PlannerPage() {
    const data = await getData();
    const activeUser = data.users[data.currentUser];

    return (
        <div style={{ paddingTop: '2rem' }}>
            <UserSwitcher currentUser={data.currentUser} />

            <div style={{ marginBottom: '2rem' }}>
                <DietUploader userName={data.currentUser} />
            </div>

            <PlannerEditor
                initialPlan={activeUser.plan}
                userName={data.currentUser}
                userGuidelines={activeUser.guidelines}
                activeOffers={data.activeOffers || []}
            />
        </div>
    );
}

import Tracker from '@/components/Tracker';

export const dynamic = 'force-dynamic';

import { getData, updateWeight, updateTargetWeight, addSgarro } from '@/lib/data';
import UserSwitcher from '@/components/UserSwitcher';

export default async function TrackerPage({
    searchParams,
}: {
    searchParams: { view?: string };
}) {
    const data = await getData();
    const { view } = await searchParams;
    const viewUser = (view === 'Michael' || view === 'Jessica') ? view : data.currentUser;

    // Create a modified data object for the view to trick the Tracker component
    // or better, update Tracker component to accept a user prop.
    // For now, let's just override currentUser in the data passed to Client Component
    const viewData = { ...data, currentUser: viewUser };

    return (
        <div style={{ paddingTop: '2rem' }}>
            <UserSwitcher currentUser={data.currentUser} />
            <Tracker data={viewData} />
        </div>
    );
}

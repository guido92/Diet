import Tracker from '@/components/Tracker';
import { getData } from '@/lib/data';
import UserSwitcher from '@/components/UserSwitcher';

export default async function TrackerPage() {
    const data = await getData();

    return (
        <div style={{ paddingTop: '2rem' }}>
            <UserSwitcher currentUser={data.currentUser} />
            <Tracker data={data} />
        </div>
    );
}

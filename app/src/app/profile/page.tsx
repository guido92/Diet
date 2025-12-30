import { getData, getUserSession } from '@/lib/data';
import ProfileEditor from '@/components/ProfileEditor';

export default async function ProfilePage() {
    const data = await getData();
    const role = (await getUserSession() || 'Michael') as 'Michael' | 'Jessica';
    const profile = data.users[role];

    return (
        <ProfileEditor initialData={profile} />
    );
}

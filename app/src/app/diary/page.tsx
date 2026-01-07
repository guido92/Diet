import DiaryManager from '@/components/DiaryManager';
import { getData, cleanupOldDataAction } from '@/lib/data';
import UserSwitcher from '@/components/UserSwitcher';

export const dynamic = 'force-dynamic';

export default async function DiaryPage({
    searchParams,
}: {
    searchParams: { view?: string };
}) {
    // Auto-maintenance on visit
    await cleanupOldDataAction();

    const data = await getData();
    const { view } = await searchParams;

    // Support user switching for viewing partner's diary if needed
    const viewUser = (view === 'Michael' || view === 'Jessica') ? view : data.currentUser;
    const viewData = { ...data, currentUser: viewUser };

    return (
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="title" style={{ marginBottom: '1rem' }}>Diario Alimentare</h1>
            <UserSwitcher currentUser={data.currentUser} />
            <div style={{ marginTop: '1rem' }}>
                <DiaryManager data={viewData} />
            </div>
        </div>
    );
}

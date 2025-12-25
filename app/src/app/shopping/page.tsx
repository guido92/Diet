export const dynamic = 'force-dynamic';

import ShoppingList from '@/components/ShoppingList';
import { getData } from '@/lib/data';
import UserSwitcher from '@/components/UserSwitcher';

export default async function ShoppingPage() {
    const data = await getData();
    const profiles = [
        { name: 'Michael', plan: data.users.Michael.plan, guidelines: data.users.Michael.guidelines },
        { name: 'Jessica', plan: data.users.Jessica.plan, guidelines: data.users.Jessica.guidelines }
    ];

    return (
        <div style={{ paddingTop: '2rem' }}>
            <UserSwitcher currentUser={data.currentUser} />
            <ShoppingList
                profiles={profiles}
                manualItems={data.manualShoppingItems || []}
                conadFlyers={data.conadFlyers || []}
                activeOffers={data.activeOffers || []}
                lastUpdate={data.lastOfferUpdate}
                pantryItems={data.pantryItems || []}
            />
        </div>
    );
}

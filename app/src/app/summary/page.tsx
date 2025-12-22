import React from 'react';
import { getData } from '@/lib/data';
import CoupleManager from '../../components/CoupleManager';

export const dynamic = 'force-dynamic';

export default async function SummaryPage() {
    const data = await getData();
    const michael = data.users.Michael;
    const jessica = data.users.Jessica;

    return (
        <div style={{ padding: '2rem 1rem 5rem' }}>
            <h1 className="title">Schema di Coppia 👫</h1>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>Tabella comparativa Michael & Jessica.</p>

            <CoupleManager
                initialMichaelPlan={michael.plan}
                initialJessicaPlan={jessica.plan}
            />
        </div>
    );
}

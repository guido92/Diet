import React from 'react';
import { getData } from '@/lib/data';
import { GUIDELINES } from '@/lib/guidelines';
import CoupleGeneratorButton from '@/components/CoupleGeneratorButton';
import { DAYS_MAP, ENGLISH_DAYS } from '@/lib/constants';

const MEALS = [
    { key: 'breakfast', label: 'Colazione' },
    { key: 'snack_am', label: 'Spuntino' },
    { key: 'lunch', label: 'Pranzo' },
    { key: 'snack_pm', label: 'Merenda' },
    { key: 'dinner', label: 'Cena' },
];

export default async function SummaryPage() {
    const data = await getData();
    const michael = data.users.Michael;
    const jessica = data.users.Jessica;

    const getMealName = (mealValue: any, user: 'Michael' | 'Jessica') => {
        if (!mealValue || typeof mealValue !== 'string') return '-';
        const guidelines = data.users[user].guidelines || GUIDELINES;
        const meal = guidelines.find(g => g.id === mealValue);
        return meal ? meal.name : mealValue;
    };

    return (
        <div style={{ padding: '2rem 1rem 5rem' }}>
            <h1 className="title">Schema di Coppia 👫</h1>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>Tabella comparativa Michael & Jessica.</p>

            <CoupleGeneratorButton />

            <div style={{ overflowX: 'auto', background: '#111827', borderRadius: '12px', border: '1px solid #334155' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '400px' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '12px', borderBottom: '2px solid #334155', textAlign: 'left', background: '#1e293b' }}>PASTO</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #334155', textAlign: 'left', background: '#1e293b', color: '#3b82f6' }}>MICHAEL</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #334155', textAlign: 'left', background: '#1e293b', color: '#ec4899' }}>JESSICA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ENGLISH_DAYS.map(day => (
                            <React.Fragment key={day}>
                                <tr style={{ background: '#0f172a' }}>
                                    <td colSpan={3} style={{ padding: '12px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #1e293b', textAlign: 'center' }}>
                                        {DAYS_MAP[day] || day} {michael.plan[day]?.training ? '🏋️' : ''} / {jessica.plan[day]?.training ? '🏋️' : ''}
                                    </td>
                                </tr>
                                {MEALS.map(meal => (
                                    <tr key={`${day}-${meal.key}`} style={{ borderBottom: '1px solid #1e293b' }}>
                                        <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>{meal.label}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            {getMealName(michael.plan[day]?.[meal.key as keyof typeof michael.plan[string]], 'Michael')}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            {getMealName(jessica.plan[day]?.[meal.key as keyof typeof jessica.plan[string]], 'Jessica')}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

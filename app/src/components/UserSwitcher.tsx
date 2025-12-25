'use client';

import { Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
    currentUser: 'Michael' | 'Jessica';
};

export default function UserSwitcher({ currentUser }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const viewUser = searchParams.get('view') as 'Michael' | 'Jessica' | null;

    // The active view is either the URL param OR the logged-in user if no param
    const activeView = viewUser || currentUser;

    const handleSwitch = (name: 'Michael' | 'Jessica') => {
        if (name === activeView) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('view', name);
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="card" style={{ padding: '0.75rem', marginBottom: '1.5rem', background: '#334155', border: 'none' }}>
            <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="#94a3b8" />
                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>Profilo visualizzato:</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(['Michael', 'Jessica'] as const).map((name) => (
                        <button
                            key={name}
                            onClick={() => handleSwitch(name)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                transition: 'all 0.2s',
                                backgroundColor: activeView === name ? '#10b981' : '#1e293b',
                                color: activeView === name ? 'white' : '#94a3b8',
                                boxShadow: activeView === name ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

'use client';

import { Users } from 'lucide-react';
import { setCurrentUser } from '@/lib/data';

type Props = {
    currentUser: 'Michael' | 'Jessica';
};

export default function UserSwitcher({ currentUser }: Props) {
    const handleSwitch = async (name: 'Michael' | 'Jessica') => {
        if (name === currentUser) return;
        await setCurrentUser(name);
        window.location.reload();
    };

    return (
        <div className="card" style={{ padding: '0.75rem', marginBottom: '1.5rem', background: '#334155', border: 'none' }}>
            <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="#94a3b8" />
                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>Profilo attivo:</span>
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
                                backgroundColor: currentUser === name ? '#10b981' : '#1e293b',
                                color: currentUser === name ? 'white' : '#94a3b8',
                                boxShadow: currentUser === name ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
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

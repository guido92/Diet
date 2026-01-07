'use client';

import { Droplets, AlertTriangle } from 'lucide-react';
import { addWaterGlass } from '@/lib/data'; // We'll need a way to call this server action
import { useState } from 'react';

export default function QuickActions({ waterCount }: { waterCount: number }) {
    const [optimisticWater, setOptimisticWater] = useState(waterCount);
    const [loading, setLoading] = useState(false);

    const handleAddWater = async () => {
        setLoading(true);
        setOptimisticWater(prev => prev + 1);
        await addWaterGlass();
        setLoading(false);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

            {/* Water Button */}
            <button
                onClick={handleAddWater}
                disabled={loading}
                className="card btn-press"
                style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    padding: '1.2rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    color: 'white', cursor: 'pointer', position: 'relative', overflow: 'hidden'
                }}
            >
                <Droplets size={32} />
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Acqua ({optimisticWater})</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>+1 Bicchiere</div>
            </button>

            {/* Sgarro Button */}
            <button
                className="card btn-press"
                style={{
                    background: '#334155',
                    border: 'none',
                    padding: '1.2rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    color: '#fca5a5', cursor: 'pointer'
                }}
                onClick={() => alert('Funzionalità Sgarro in arrivo!')}
            >
                <AlertTriangle size={32} />
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Sgarro</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Logga Extra</div>
            </button>

        </div>
    );
}

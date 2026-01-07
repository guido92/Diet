'use client';

import { Droplets, AlertTriangle, History } from 'lucide-react';
import { addWaterGlass, addSgarro } from '@/lib/data';
import { useState } from 'react';
import Link from 'next/link';

export default function QuickActions({ waterCount }: { waterCount: number }) {
    const [optimisticWater, setOptimisticWater] = useState(waterCount);
    const [loading, setLoading] = useState(false);
    const [sgarroLoading, setSgarroLoading] = useState(false);

    // HYDRATION GOAL CONFIG
    const GOAL_GLASSES = 8; // Approx 2 Liters
    const percentage = Math.min((optimisticWater / GOAL_GLASSES) * 100, 100);
    const missingGlasses = Math.max(GOAL_GLASSES - optimisticWater, 0);

    const handleAddWater = async () => {
        setLoading(true);
        setOptimisticWater(prev => prev + 1);
        await addWaterGlass();
        setLoading(false);
    };

    const handleAddSgarro = async () => {
        const note = prompt("Cosa hai mangiato fuori programma?");
        if (!note) return;

        setSgarroLoading(true);
        await addSgarro(note);
        setSgarroLoading(false);
        alert("Sgarro registrato! 📝");
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
                    color: 'white', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    justifyContent: 'center'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Droplets size={28} />
                    <div style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>{optimisticWater} <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>/ {GOAL_GLASSES}</span></div>
                </div>

                {/* Progress Bar Container */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px', marginTop: '5px' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: 'white', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                </div>

                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '5px' }}>
                    {missingGlasses > 0 ? `Mancano ${missingGlasses} bicchieri` : 'Obiettivo raggiunto! 🎉'}
                </div>
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
                onClick={handleAddSgarro}
                disabled={sgarroLoading}
            >
                <AlertTriangle size={32} />
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Sgarro</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{sgarroLoading ? 'Salvataggio...' : 'Logga Extra'}</div>
            </button>

            {/* History Link */}
            <Link href="/tracker" style={{ gridColumn: '1 / -1', textDecoration: 'none' }}>
                <div className="card btn-press" style={{
                    background: '#1e293b', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94a3b8', border: '1px solid #334155'
                }}>
                    <History size={18} />
                    <span>Vedi Diario Completo</span>
                </div>
            </Link>

        </div>
    );
}

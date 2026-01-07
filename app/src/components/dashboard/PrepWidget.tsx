'use client';

import { Wand2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function PrepWidget({ prepInstructions, tomLunchName }: { prepInstructions: string | null, tomLunchName?: string }) {
    if (!prepInstructions) return null;

    return (
        <div className="card" style={{
            background: '#334155',
            border: 'none',
            borderLeft: '4px solid #a855f7',
            marginBottom: '1.5rem',
            padding: '1.2rem'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', marginBottom: '8px' }}>
                        <Wand2 size={18} color="#a855f7" />
                        <span>Prep per Domani</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {prepInstructions}
                    </div>
                    {tomLunchName && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px' }}>
                            Per: {tomLunchName}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

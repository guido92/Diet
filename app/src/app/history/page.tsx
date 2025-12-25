'use server';


export const dynamic = 'force-dynamic';

import { getData, cleanupOldDataAction } from '@/lib/data';

import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Image from 'next/image';

export default async function HistoryPage() {
    // Auto-Cleanup on visit
    await cleanupOldDataAction();
    const data = await getData();
    const history = (data.history || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <Link href="/" className="btn" style={{ width: 'auto' }}>
                    <ArrowLeft size={18} /> Torna al Piano
                </Link>
                <h1 className="title" style={{ margin: 0 }}>📜 Storico Pasti (Ultimi 30gg)</h1>
            </div>

            {history.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '12px' }}>
                    Nessun pasto registrato negli ultimi 30 giorni. <br />
                    Spunta i pasti come "Mangiati" nel piano per vederli qui!
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {history.map((entry, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', background: '#1e293b', padding: '1rem', borderRadius: '12px', border: '1px solid #334155' }}>
                            {/* Photo Thumbnail */}
                            <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {entry.photoUrl ? (
                                    <img
                                        src={entry.photoUrl}
                                        alt={entry.mealName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '2rem' }}>🍽️</span>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#facc15', margin: 0 }}>
                                        {entry.mealName}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#334155', padding: '2px 8px', borderRadius: '12px' }}>
                                        {entry.date}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginTop: '0.5rem' }}>
                                    <strong style={{ color: entry.user === 'Michael' ? '#3b82f6' : '#ec4899' }}>{entry.user}</strong> • {entry.mealType}
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '10px' }}>
                                    {entry.rating === 'up' && <span style={{ color: '#22c55e' }}>👍 Piaciuto</span>}
                                    {entry.rating === 'down' && <span style={{ color: '#ef4444' }}>👎 Non Piaciuto</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

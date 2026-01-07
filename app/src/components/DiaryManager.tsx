'use client';

import { useState, useMemo } from 'react';
import { AppData, updateWeight, removeSgarro, removeHistoryItem, LogEntry, MealHistory } from '@/lib/data';
import { Line } from 'react-chartjs-2';
import { Trash2, TrendingUp, Calendar, Utensils, AlertTriangle } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

type Props = {
    data: AppData;
};

type TimelineEvent = {
    type: 'meal' | 'sgarro' | 'weight';
    date: string; // ISO or YYYY-MM-DD
    title: string;
    subtitle?: string;
    id?: string; // For deletion
    user: string;
    details?: any; // Extra payload
    timestamp: number;
};

export default function DiaryManager({ data }: Props) {
    const [activeTab, setActiveTab] = useState<'timeline' | 'stats'>('timeline');
    const [weight, setWeight] = useState('');
    const [loading, setLoading] = useState(false);

    const activeUser = data.users[data.currentUser];
    const userRole = data.currentUser;

    // --- MERGE DATA FOR TIMELINE ---
    const timeline = useMemo(() => {
        const events: TimelineEvent[] = [];

        // 1. MEAL HISTORY
        (data.history || []).forEach(h => {
            // Filter for current user? Or show both? User asked for "Bio green", "Red". 
            // Usually users want to see THEIR execution, but maybe couple stuff?
            // Let's show filtered by current user for consistency with Profile/Tracker, or maybe all if requested?
            // "Il mio diario" implies personal.
            if (h.user === userRole) {
                events.push({
                    type: 'meal',
                    date: h.date,
                    title: h.mealName,
                    subtitle: h.mealType,
                    user: h.user,
                    timestamp: new Date(h.date).getTime(),
                    details: h
                });
            }
        });

        // 2. LOGS (Weight & Sgarri)
        activeUser.logs.forEach(l => {
            if (l.weight) {
                events.push({
                    type: 'weight',
                    date: l.date,
                    title: `Peso: ${l.weight} Kg`,
                    user: userRole,
                    timestamp: new Date(l.date).getTime(),
                    id: l.id,
                    details: l
                });
            }
            if (l.notes) {
                events.push({
                    type: 'sgarro',
                    date: l.date,
                    title: l.notes, // "Pizza"
                    subtitle: 'Sgarro',
                    user: userRole,
                    timestamp: new Date(l.date).getTime(),
                    id: l.id,
                    details: l
                });
            }
        });

        // Sort descending
        return events.sort((a, b) => b.timestamp - a.timestamp);
    }, [data.history, activeUser.logs, userRole]);

    // --- ACTIONS ---
    const handleWeightSave = async () => {
        if (!weight) return;
        setLoading(true);
        await updateWeight(parseFloat(weight));
        setWeight('');
        setLoading(false);
        // Ideally optimistic update, but reload is safer for sync
        window.location.reload();
    };

    const handleDelete = async (item: TimelineEvent) => {
        if (!confirm('Eliminare questo elemento?')) return;
        setLoading(true);

        if (item.type === 'sgarro' && item.id) {
            await removeSgarro(item.id);
        } else if (item.type === 'meal' && item.details) {
            await removeHistoryItem(item.details.date, item.details.user, item.details.mealType);
        } else {
            alert('Impossibile eliminare (manca ID o tipo non supportato)');
        }

        setLoading(false);
        window.location.reload();
    };


    // --- CHART CONFIG ---
    const chartData = {
        labels: activeUser.logs.filter(l => l.weight).map(l => l.date),
        datasets: [
            {
                label: `Peso (Kg)`,
                data: activeUser.logs.filter(l => l.weight).map(l => l.weight),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.3
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { labels: { color: '#94a3b8' } },
            title: { display: true, text: 'Andamento Peso', color: '#f8fafc' },
        },
        scales: {
            y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
        }
    };


    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* TABS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab('timeline')}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'timeline' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'timeline' ? 'white' : '#94a3b8',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <Calendar size={18} /> Cronologia
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'stats' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'stats' ? 'white' : '#94a3b8',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <TrendingUp size={18} /> Peso
                </button>
            </div>

            {/* CONTENT */}
            {activeTab === 'timeline' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {timeline.length === 0 && <div className="text-center opacity-50 py-10">Nessuna attività recente.</div>}

                    {timeline.map((item, i) => (
                        <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderColor: item.type === 'sgarro' ? '#fca5a5' : '#334155' }}>
                            {/* Icon Box */}
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: item.type === 'meal' ? 'rgba(34, 197, 94, 0.2)' : item.type === 'sgarro' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                color: item.type === 'meal' ? '#4ade80' : item.type === 'sgarro' ? '#f87171' : '#60a5fa'
                            }}>
                                {item.type === 'meal' && <Utensils size={24} />}
                                {item.type === 'sgarro' && <AlertTriangle size={24} />}
                                {item.type === 'weight' && <TrendingUp size={24} />}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.date}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{item.title}</div>
                                {item.subtitle && <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{item.subtitle}</div>}
                            </div>

                            {(item.type === 'sgarro' || item.type === 'meal') && (
                                <button
                                    onClick={() => handleDelete(item)}
                                    disabled={loading}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'stats' && (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Input Weight */}
                    <div className="card">
                        <h3 className="subtitle">Aggiorna Peso</h3>
                        <div className="flex-between" style={{ gap: '1rem' }}>
                            <input
                                type="number"
                                placeholder="Kg"
                                className="w-full"
                                style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', flex: 1 }}
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                            />
                            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleWeightSave} disabled={loading}>
                                {loading ? '...' : 'Salva'}
                            </button>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="card">
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { AppData, updateWeight, addSgarro, removeSgarro } from '@/lib/data';
import { Line } from 'react-chartjs-2';
import { Trash2 } from 'lucide-react';
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

export default function Tracker({ data }: Props) {
    const [weight, setWeight] = useState('');
    const [sgarro, setSgarro] = useState('');
    const [loading, setLoading] = useState(false);

    const activeUser = data.users[data.currentUser];

    const handleWeightSave = async () => {
        if (!weight) return;
        setLoading(true);
        await updateWeight(parseFloat(weight));
        setWeight('');
        setLoading(false);
        window.location.reload();
    };

    const handleSgarroSave = async () => {
        if (!sgarro) return;
        setLoading(true);
        await addSgarro(sgarro);
        setSgarro('');
        setLoading(false);
        window.location.reload();
    };

    const chartData = {
        labels: activeUser.logs.map(l => l.date),
        datasets: [
            {
                label: `Peso ${data.currentUser} (Kg)`,
                data: activeUser.logs.map(l => l.weight || null),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                segment: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    borderColor: (ctx: any) => ctx.p0.parsed.y > ctx.p1.parsed.y ? '#10b981' : '#ef4444',
                }
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#94a3b8' }
            },
            title: {
                display: true,
                text: `Andamento Peso: ${data.currentUser}`,
                color: '#f8fafc'
            },
        },
        scales: {
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#334155' }
            },
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#334155' }
            }
        }
    };

    return (
        <div>
            <h2 className="title">Progressi di {data.currentUser}</h2>

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

            <div className="card">
                <Line options={options} data={chartData} />
            </div>

            <div className="card" style={{ borderColor: '#ef4444' }}>
                <h3 className="subtitle" style={{ color: '#ef4444' }}>Hai sgarrato?</h3>
                <div className="flex-between" style={{ gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Cosa hai mangiato? es. Pizza"
                        className="w-full"
                        style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', flex: 1 }}
                        value={sgarro}
                        onChange={(e) => setSgarro(e.target.value)}
                    />
                    <button className="btn" style={{ width: 'auto', background: '#ef4444', color: 'white' }} onClick={handleSgarroSave} disabled={loading}>
                        Segna
                    </button>
                </div>
            </div>

            <div className="card">
                <h3 className="subtitle">Diario Sgarri</h3>
                <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: '#94a3b8' }}>
                    {activeUser.logs.filter(l => l.notes).map((l, i) => (
                        <li key={i} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid #334155' }}>
                            <div>
                                <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{l.date}:</span> <span style={{ color: '#cbd5e1' }}>{l.notes}</span>
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm('Eliminare questo sgarro?')) {
                                        setLoading(true);
                                        await removeSgarro(l.date, l.notes || '');
                                        setLoading(false);
                                        window.location.reload();
                                    }
                                }}
                                style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

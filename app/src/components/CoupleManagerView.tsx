'use client';

import React, { useState } from 'react';
import { generateCouplePlanPreviewAction } from '@/lib/ai';
import { saveCouplePlansAction, WeeklyPlan } from '@/lib/data';
import { Wand2, Save, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DAYS_MAP, ENGLISH_DAYS } from '@/lib/constants';

type Props = {
    initialMichaelPlan: WeeklyPlan;
    initialJessicaPlan: WeeklyPlan;
};

const MEALS = [
    { key: 'breakfast', label: 'Colazione' },
    { key: 'snack_am', label: 'Spuntino' },
    { key: 'lunch', label: 'Pranzo' },
    { key: 'snack_pm', label: 'Merenda' },
    { key: 'dinner', label: 'Cena' },
];

export default function CoupleManagerView({ initialMichaelPlan, initialJessicaPlan }: Props) {
    const [michaelPlan, setMichaelPlan] = useState<WeeklyPlan>(initialMichaelPlan);
    const [jessicaPlan, setJessicaPlan] = useState<WeeklyPlan>(initialJessicaPlan);

    // Preview Mode State
    const [previewMode, setPreviewMode] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const router = useRouter();

    const handleGeneratePreview = async () => {
        const confirm = window.confirm(`Generare una NUOVA bozza per entrambi? I piani attuali non verranno sovrascritti finché non clicchi "Salva".`);
        if (!confirm) return;

        setGenerating(true);
        try {
            const result = await generateCouplePlanPreviewAction();
            if (result.success && result.michaelPlan && result.jessicaPlan) {
                setMichaelPlan(result.michaelPlan);
                setJessicaPlan(result.jessicaPlan);
                setPreviewMode(true);
            } else {
                alert('Errore generazione: ' + result.message);
            }
        } catch (e) {
            alert('Errore imprevisto durante la generazione.');
        }
        setGenerating(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveCouplePlansAction(michaelPlan, jessicaPlan);
            setPreviewMode(false);
            alert('Piani salvati correttamente!');
            router.refresh();
        } catch (e) {
            alert('Errore nel salvataggio.');
        }
        setSaving(false);
    };

    const handleCancel = () => {
        if (confirm('Annullare le modifiche e tornare ai piani originali?')) {
            setMichaelPlan(initialMichaelPlan);
            setJessicaPlan(initialJessicaPlan);
            setPreviewMode(false);
        }
    };

    const getMealName = (plan: WeeklyPlan, day: string, type: string) => {
        const dayPlan = plan[day];
        if (!dayPlan) return '-';
        // @ts-ignore
        const mealId = dayPlan[type];

        // @ts-ignore
        const details = dayPlan[type + '_details'];
        if (details && details.name) return details.name;

        // Fallback to ID if no details (should likely have details from AI plan)
        return mealId || '-';
    };

    return (
        <div>
            {/* CONTROLS */}
            <div style={{ marginBottom: '1.5rem', background: '#1e293b', padding: '1rem', borderRadius: '12px', border: previewMode ? '2px solid #eab308' : '1px solid #334155' }}>
                <div className="flex-between">
                    <div>
                        {previewMode ? (
                            <h3 style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚠️ ANTEPRIMA - NON SALVATO
                            </h3>
                        ) : (
                            <h3 style={{ color: '#94a3b8' }}>Piano Attuale</h3>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!previewMode ? (
                            <button
                                className="btn"
                                onClick={handleGeneratePreview}
                                disabled={generating}
                                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)', border: 'none', color: 'white' }}
                            >
                                <Wand2 size={18} style={{ marginRight: '6px' }} />
                                {generating ? 'Generazione...' : 'Genera Nuovi Piani'}
                            </button>
                        ) : (
                            <>
                                <button
                                    className="btn"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    style={{ background: '#ef4444', color: 'white' }}
                                >
                                    <X size={18} style={{ marginRight: '6px' }} />
                                    Annulla
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{ background: '#22c55e', color: 'white' }}
                                >
                                    <Check size={18} style={{ marginRight: '6px' }} />
                                    {saving ? 'Salvataggio...' : 'CONFERMA E SALVA'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div style={{ overflowX: 'auto', background: '#111827', borderRadius: '12px', border: '1px solid #334155' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '600px' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '12px', borderBottom: '2px solid #334155', textAlign: 'left', background: '#1e293b' }}>GIORNO / PASTO</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #334155', textAlign: 'left', background: '#1e293b', color: '#3b82f6' }}>MICHAEL</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #334155', textAlign: 'left', background: '#1e293b', color: '#ec4899' }}>JESSICA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ENGLISH_DAYS.map(day => (
                            <React.Fragment key={day}>
                                <tr style={{ background: '#0f172a' }}>
                                    <td colSpan={3} style={{ padding: '10px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #1e293b', textAlign: 'center', background: '#1e293b' }}>
                                        {DAYS_MAP[day] || day}
                                        <span style={{ marginLeft: '10px', fontSize: '0.75rem', opacity: 0.7 }}>
                                            (M: {michaelPlan[day]?.training ? 'Allenamento' : 'Riposo'} | J: {jessicaPlan[day]?.training ? 'Allenamento' : 'Riposo'})
                                        </span>
                                    </td>
                                </tr>
                                {MEALS.map(meal => (
                                    <tr key={`${day}-${meal.key}`} style={{ borderBottom: '1px solid #1e293b' }}>
                                        <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, width: '150px' }}>{meal.label}</td>
                                        <td style={{ padding: '10px 12px', background: previewMode ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                                            {getMealName(michaelPlan, day, meal.key)}
                                        </td>
                                        <td style={{ padding: '10px 12px', background: previewMode ? 'rgba(236, 72, 153, 0.05)' : 'transparent' }}>
                                            {getMealName(jessicaPlan, day, meal.key)}
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

'use client';

import { useState } from 'react';
import { UserProfile, updateUserProfile } from '@/lib/data';
import { User, Activity, AlertCircle, Save } from 'lucide-react';

type Props = {
    initialData: UserProfile;
};

export default function ProfileEditor({ initialData }: Props) {
    const [formData, setFormData] = useState({
        startWeight: initialData.startWeight,
        targetWeight: initialData.targetWeight,
        height: initialData.height,
        birthDate: initialData.birthDate || '',
        sex: initialData.sex || 'M',
        activityLevel: initialData.activityLevel || 'sedentary',
        intolerances: initialData.intolerances || '',
        dislikes: initialData.dislikes || '',
        allergies: initialData.allergies || ''
    });
    const [loading, setLoading] = useState(false);

    const bmi = formData.height > 0 ? (initialData.currentWeight / ((formData.height / 100) * (formData.height / 100))).toFixed(1) : 'N/A';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        await updateUserProfile({
            ...formData,
            startWeight: Number(formData.startWeight),
            targetWeight: Number(formData.targetWeight),
            height: Number(formData.height)
        });
        setLoading(false);
        alert('Profilo aggiornato!');
    };

    return (
        <div style={{ paddingBottom: '5rem' }}>
            <h2 className="title flex items-center gap-2"><User /> Profilo Utente</h2>

            {/* BMI Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', border: 'none' }}>
                <div className="flex-between">
                    <div>
                        <h3 className="font-bold text-lg">BMI Calculator</h3>
                        <p className="opacity-90 text-sm">Indice di Massa Corporea</p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-black">{bmi}</span>
                    </div>
                </div>
            </div>

            {/* General Info */}
            <div className="card">
                <h3 className="subtitle">Dati Fisici</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="text-xs text-slate-400">Peso Iniziale (Kg)</label>
                        <input type="number" value={formData.startWeight} onChange={e => handleChange('startWeight', e.target.value)} className="input-field" />
                    </div>
                    <div className="form-group">
                        <label className="text-xs text-slate-400">Peso Obiettivo (Kg)</label>
                        <input type="number" value={formData.targetWeight} onChange={e => handleChange('targetWeight', e.target.value)} className="input-field" />
                    </div>
                    <div className="form-group">
                        <label className="text-xs text-slate-400">Altezza (cm)</label>
                        <input type="number" value={formData.height} onChange={e => handleChange('height', e.target.value)} className="input-field" />
                    </div>
                    <div className="form-group">
                        <label className="text-xs text-slate-400">Data di Nascita</label>
                        <input type="date" value={formData.birthDate.split('T')[0]} onChange={e => handleChange('birthDate', e.target.value)} className="input-field" />
                    </div>
                    <div className="form-group">
                        <label className="text-xs text-slate-400">Sesso</label>
                        <select value={formData.sex} onChange={e => handleChange('sex', e.target.value)} className="input-field">
                            <option value="M">Uomo</option>
                            <option value="F">Donna</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="text-xs text-slate-400">Attività</label>
                        <select value={formData.activityLevel} onChange={e => handleChange('activityLevel', e.target.value)} className="input-field">
                            <option value="sedentary">Sedentario (Ufficio)</option>
                            <option value="light">Leggera (1-2 allenamenti)</option>
                            <option value="moderate">Moderata (3-4 allenamenti)</option>
                            <option value="active">Attiva (Lavoro fisico/Sport)</option>
                            <option value="very_active">Molto Attiva (Atleta)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="card" style={{ borderColor: '#eab308' }}>
                <h3 className="subtitle flex items-center gap-2" style={{ color: '#eab308' }}><AlertCircle size={18} /> Preferenze Alimentari</h3>

                <div className="space-y-4">
                    <div className="form-group">
                        <label className="text-xs text-slate-400 mb-1 block">Cosa non ti piace? (es. Sedano, Broccoli)</label>
                        <textarea
                            value={formData.dislikes}
                            onChange={e => handleChange('dislikes', e.target.value)}
                            className="input-field w-full h-20"
                            placeholder="Elenca i cibi che vuoi evitare..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="text-xs text-slate-400 mb-1 block">Allergie o Intolleranze</label>
                        <textarea
                            value={formData.allergies}
                            onChange={e => handleChange('allergies', e.target.value)}
                            className="input-field w-full h-20"
                            placeholder="Lattosio, Glutine, Arachidi..."
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                className="btn btn-primary w-full py-4 text-lg font-bold flex justify-center items-center gap-2 sticky bottom-24 shadow-xl"
                disabled={loading}
            >
                {loading ? 'Salvataggio...' : <><Save /> Salva Profilo</>}
            </button>

            <style jsx>{`
                .form-group { display: flex; flexDirection: column; }
                .input-field { 
                    background: #1e293b; 
                    border: 1px solid #334155; 
                    color: white; 
                    padding: 10px; 
                    border-radius: 8px; 
                    width: 100%;
                }
            `}</style>
        </div>
    );
}

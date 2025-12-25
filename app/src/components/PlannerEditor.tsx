'use client';

import { useState, useRef } from 'react';
import { MealOption, getCurrentSeason } from '@/lib/guidelines';
import { DailyPlan, WeeklyPlan, saveWeeklyPlan } from '@/lib/data';
import { ChevronDown, ChevronUp, Save, Wand2, BookOpen, ShoppingCart, ExternalLink, Edit3, List, RefreshCcw, Camera, Upload } from 'lucide-react';
import { generateWeeklyPlanAI, regenerateMealAI, analyzeMealPhotoAction } from '@/lib/ai';
import { uploadImageAction } from '@/lib/upload';
import { getPieceLabel } from '@/lib/conversions';
import Link from 'next/link';
import { ConadOffer } from '@/lib/data';
import { DAYS_MAP, ENGLISH_DAYS } from '@/lib/constants';

const MEAL_TYPES = [
    { key: 'breakfast', label: 'Colazione' },
    { key: 'snack_am', label: 'Spuntino Mattina' },
    { key: 'lunch', label: 'Pranzo (No Olio)' },
    { key: 'snack_pm', label: 'Merenda' },
    { key: 'dinner', label: 'Cena' },
];

type Props = {
    initialPlan: WeeklyPlan;
    userName: string;
    userGuidelines: MealOption[];
    activeOffers: ConadOffer[];
};

export default function PlannerEditor({ initialPlan, userName, userGuidelines, activeOffers }: Props) {
    const [plan, setPlan] = useState<WeeklyPlan>(initialPlan);
    const [expandedDay, setExpandedDay] = useState<string | null>(ENGLISH_DAYS[new Date().getDay() - 1] || 'Monday');
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [showOffers, setShowOffers] = useState(false);
    const [customOverrides, setCustomOverrides] = useState<Record<string, boolean>>({});

    const handleSelect = (day: string, type: keyof DailyPlan, value: string) => {
        setPlan((prev) => ({
            ...prev,
            [day]: {
                ...prev[day] || { training: false },
                [type]: value,
            },
        }));
    };

    const toggleCustom = (day: string, type: string) => {
        const key = `${day}-${type}`;
        setCustomOverrides(prev => {
            const newState = !prev[key];
            // If switching back to List mode, and current value is NOT a valid option, strict users might want it cleared.
            // But we'll leave it to the user to change it.
            return { ...prev, [key]: newState };
        });
    };

    const toggleTraining = (day: string) => {
        setPlan((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                training: !prev[day]?.training,
            },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        await saveWeeklyPlan(plan);
        setSaving(false);
        alert(`Piano salvato per ${userName}!`);
    };

    const handleRefresh = async (day: string, type: string) => {
        if (!confirm('Rigenerare questo pasto con l\'Intelligenza Artificiale (Chef Zero Sprechi)?')) return;
        setSaving(true);
        try {
            const result = await regenerateMealAI(day, type);
            if (result.success) {
                // Refresh logic using window reload to catch new data from server action
                window.location.reload();
            } else {
                alert('Errore: Impossibile trovare alternative per questo pasto.');
            }
        } catch {
            alert('Errore aggiornamento pasto');
        }
        setSaving(false);
    };

    const [uploading, setUploading] = useState<string | null>(null); // "Day-Meal" key
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = (day: string, type: string) => {
        // Trigger file input
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('data-context', `${day}:${type}`);
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const context = e.target.getAttribute('data-context'); // "Monday:lunch"
        if (!file || !context) return;

        const [day, type] = context.split(':');
        const comboKey = `${day}-${type}`;

        setUploading(comboKey);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // 1. Upload
            const upRes = await uploadImageAction(formData);
            if (!upRes.success || !upRes.url) throw new Error(upRes.message);

            // 2. Analyze (Optional: immediately analyze)
            const expectedMealName = (plan[day] as any)[type + '_details']?.name || 'Pasto';
            const analysis = await analyzeMealPhotoAction(upRes.url, expectedMealName);

            // 3. Update Plan State (Optimistic)
            setPlan(prev => {
                const dayPlan = prev[day];
                const details = (dayPlan as any)[type + '_details'] || {};
                details.photoUrl = upRes.url;
                details.aiAnalysis = analysis.feedback;
                details.aiRating = analysis.rating;

                return {
                    ...prev,
                    [day]: {
                        ...dayPlan,
                        [type + '_details']: details
                    }
                };
            });

            alert(`Foto Caricata! AI: ${analysis.rating}/10 - ${analysis.feedback}`);
        } catch (err) {
            alert('Upload fallito: ' + err);
        }
        setUploading(null);
        // Reset input
        e.target.value = '';
    };

    const handleGenerate = async () => {
        const confirm = window.confirm(`Sei sicuro? Questo sovrascriverà il piano di ${userName}.`);
        if (!confirm) return;

        setGenerating(true);
        try {
            const newPlan = await generateWeeklyPlanAI();
            setPlan(newPlan);
            alert(`Piano Generato per ${userName}! Rivedilo e clicca "Salva".`);
        } catch (e) {
            alert('Errore AI: ' + e);
        }
        setGenerating(false);
    };



    const getOptions = (type: string, isTraining: boolean): MealOption[] => {
        const currentSeason = getCurrentSeason();
        return userGuidelines.filter((opt) =>
            opt.type === type &&
            (opt.condition === 'always' || (isTraining ? opt.condition === 'training' : opt.condition === 'rest')) &&
            (opt.season === 'always' || opt.season === currentSeason)
        );
    };

    // New function to help showing details
    const getMealDetails = (mealId: string) => {
        return userGuidelines.find(g => g.id === mealId);
    };


    return (
        <div>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <h2 className="title">Piano di {userName}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <Link href="/history" className="btn" style={{ width: 'auto', background: '#475569', color: 'white' }}>
                        📜 Storico
                    </Link>
                    <button className="btn" style={{ width: 'auto', background: showOffers ? '#ca8a04' : '#334155', color: 'white' }} onClick={() => setShowOffers(!showOffers)}>
                        ⚡ Offerte ({activeOffers.length})
                    </button>
                    <button className="btn" style={{ width: 'auto', background: '#334155', color: 'white' }} onClick={handleGenerate} disabled={generating || saving}>
                        <Wand2 size={18} style={{ marginRight: '8px' }} />
                        {generating ? '...' : 'AI ' + userName}
                    </button>
                    <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving || generating}>
                        <Save size={18} style={{ marginRight: '8px' }} />
                        {saving ? '...' : 'Salva'}
                    </button>
                </div>
            </div>

            {/* Active Offers Panel */}
            {showOffers && activeOffers.length > 0 && (
                <div style={{ marginBottom: '1.5rem', background: '#0f172a', padding: '1rem', borderRadius: '12px', border: '1px solid #ca8a04' }}>
                    <h4 style={{ color: '#ca8a04', fontWeight: 'bold', marginBottom: '1rem' }}>⚡ Offerte Disponibili</h4>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {activeOffers.map((offer, i) => (
                            <div key={i} style={{ minWidth: '150px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{offer.prodotto}</div>
                                <div style={{ fontSize: '1.1rem', color: '#10b981', fontWeight: '800' }}>{offer.prezzo}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{offer.unita}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid">
                {ENGLISH_DAYS.map((day) => {
                    const isExpanded = expandedDay === day;
                    const dayPlan = plan[day] || {};

                    return (
                        <div key={day} className="card" style={{ padding: '1rem' }}>
                            <div
                                className="flex-between"
                                onClick={() => setExpandedDay(isExpanded ? null : day)}
                                style={{ cursor: 'pointer' }}
                            >
                                <h3 style={{ fontWeight: 600 }}>{DAYS_MAP[day] || day} {dayPlan.training ? '🏋️' : ''}</h3>
                                {isExpanded ? <ChevronUp /> : <ChevronDown />}
                            </div>

                            {isExpanded && (
                                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <label className="flex-between" style={{ padding: '0.5rem', background: '#334155', borderRadius: '8px' }}>
                                        <span>Allenamento oggi?</span>
                                        <input
                                            type="checkbox"
                                            checked={!!dayPlan.training}
                                            onChange={() => toggleTraining(day)}
                                            style={{ transform: 'scale(1.5)' }}
                                        />
                                    </label>

                                    {MEAL_TYPES.map(({ key, label }) => {
                                        const options = getOptions(key, !!dayPlan.training);
                                        const selectedMealId = dayPlan[key as keyof DailyPlan] as string;

                                        // Custom Mode Logic
                                        const modeKey = `${day}-${key}`;
                                        // It is custom if explicitly set OR if value exists but is not in options (and not empty)
                                        const valueExistsButInvalid = selectedMealId && !options.some(o => o.id === selectedMealId);
                                        const isCustom = customOverrides[modeKey] !== undefined ? customOverrides[modeKey] : valueExistsButInvalid;

                                        const mealDetails = getMealDetails(selectedMealId);

                                        // Access chef details if available
                                        let chefDetails: { name: string; recipe: string; recipeUrl?: string; imageUrl?: string; specificFruit?: string; specificVeg?: string; specificProtein?: string; specificCarb?: string } | undefined;
                                        if (key === 'breakfast') chefDetails = dayPlan.breakfast_details;
                                        else if (key === 'snack_am') chefDetails = dayPlan.snack_am_details;
                                        else if (key === 'lunch') chefDetails = dayPlan.lunch_details;
                                        else if (key === 'snack_pm') chefDetails = dayPlan.snack_pm_details;
                                        else if (key === 'dinner') chefDetails = dayPlan.dinner_details;

                                        return (
                                            <div key={key}>
                                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
                                                    {label}
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {!isCustom && (
                                                        <button
                                                            onClick={() => handleRefresh(day, key)}
                                                            style={{
                                                                background: '#334155',
                                                                color: '#e2e8f0',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                width: '42px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Cambia pasto (Shuffle)"
                                                            disabled={saving}
                                                        >
                                                            <RefreshCcw size={16} />
                                                        </button>
                                                    )}
                                                    {isCustom ? (
                                                        <input
                                                            type="text"
                                                            className="w-full"
                                                            placeholder="Scrivi pasto manuale (es. Pizza)"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '8px',
                                                                background: '#1e293b',
                                                                color: '#facc15',
                                                                border: '1px solid #eab308'
                                                            }}
                                                            value={selectedMealId || ''}
                                                            onChange={(e) => handleSelect(day, key as keyof DailyPlan, e.target.value)}
                                                        />
                                                    ) : (
                                                        <select
                                                            className="w-full"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '8px',
                                                                background: '#0f172a',
                                                                color: 'white',
                                                                border: '1px solid #334155'
                                                            }}
                                                            value={selectedMealId || ''}
                                                            onChange={(e) => handleSelect(day, key as keyof DailyPlan, e.target.value)}
                                                        >
                                                            <option value="">Seleziona...</option>
                                                            {options.map((opt) => (
                                                                <option key={opt.id} value={opt.id}>
                                                                    {opt.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    <button
                                                        onClick={() => toggleCustom(day, key)}
                                                        style={{
                                                            background: isCustom ? '#eab308' : '#334155',
                                                            color: isCustom ? 'black' : 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            width: '42px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer'
                                                        }}
                                                        title={isCustom ? "Torna alla lista" : "Scrivi a mano"}
                                                    >
                                                        {isCustom ? <List size={18} /> : <Edit3 size={18} />}
                                                    </button>
                                                </div>

                                                {/* SHOW SPECIFIC FRUIT/VEG CHOICE */}
                                                {(chefDetails?.specificFruit || chefDetails?.specificVeg) && (
                                                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {chefDetails.specificFruit && (
                                                            <span style={{ fontSize: '0.7rem', background: 'rgba(132, 204, 22, 0.15)', color: '#a3e635', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(132, 204, 22, 0.3)' }}>
                                                                🍎 {chefDetails.specificFruit} {(() => {
                                                                    const fruitIng = mealDetails?.ingredients.find(i => i.name === 'Frutta di Stagione');
                                                                    return fruitIng ? getPieceLabel(chefDetails.specificFruit!, fruitIng.amount) : '';
                                                                })()}
                                                            </span>
                                                        )}
                                                        {chefDetails.specificVeg && (
                                                            <span style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                                                🥦 {chefDetails.specificVeg} {(() => {
                                                                    const vegIng = mealDetails?.ingredients.find(i => i.name.includes('Verdura'));
                                                                    return vegIng ? getPieceLabel(chefDetails.specificVeg!, vegIng.amount) : '';
                                                                })()}
                                                            </span>
                                                        )}
                                                        {chefDetails.specificProtein && (
                                                            <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                                🐟/🥩 {chefDetails.specificProtein}
                                                            </span>
                                                        )}
                                                        {chefDetails.specificCarb && (
                                                            <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                                                🥖/🥔 {chefDetails.specificCarb}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* PHOTO UPLOAD / AI CHECK */}
                                                <div style={{ marginTop: '5px' }}>
                                                    {chefDetails?.photoUrl ? (
                                                        <div style={{ position: 'relative', width: '100%', height: '100px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #475569', marginTop: '5px' }}>
                                                            <img src={chefDetails.photoUrl} alt="Meal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            {chefDetails.aiRating && (
                                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', color: '#a3e635', fontSize: '0.7rem', padding: '2px 5px', textAlign: 'center' }}>
                                                                    ✅ AI: {chefDetails.aiRating}/10
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUploadClick(day, key)}
                                                            disabled={uploading === `${day}-${key}`}
                                                            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px dashed #475569', color: '#94a3b8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                                                        >
                                                            <Camera size={14} />
                                                            {uploading === `${day}-${key}` ? 'Caricamento...' : 'Foto'}
                                                        </button>
                                                    )}
                                                </div>


                                                {/* CHEF PREVIEW (New) */}
                                                {chefDetails && (
                                                    <div style={{ marginTop: '8px', padding: '10px', background: 'linear-gradient(to right, #1e293b, #0f172a)', borderRadius: '6px', borderLeft: '4px solid #facc15' }}>
                                                        <div className="flex-between" style={{ marginBottom: '4px' }}>
                                                            <div style={{ color: '#facc15', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                                👨‍🍳 {chefDetails.name}
                                                            </div>
                                                            {(chefDetails.recipeUrl) && (
                                                                <a
                                                                    href={chefDetails.recipeUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#facc15', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold', textDecoration: 'none' }}
                                                                >
                                                                    Vedi Ricetta 💛 <ExternalLink size={12} />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <p style={{ fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic', lineHeight: '1.4' }}>
                                                            {chefDetails.recipe}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* INGREDIENT PREVIEW */}
                                                {mealDetails && (
                                                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                                        {/* Only show description if no chef details, to avoid clutter? Or show both? Keep both for strictness check. */}
                                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '4px' }}>
                                                            {mealDetails.description}
                                                        </p>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {mealDetails.ingredients.map((ing, i) => (
                                                                <span key={i} style={{ fontSize: '0.75rem', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#e2e8f0' }}>
                                                                    {ing.amount}{ing.unit} {ing.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                            }
                        </div>
                    );
                })}
            </div>

            {/* REVIEW SECTION */}
            <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #475569' }}>
                <h3 className="title flex-between" style={{ borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BookOpen color="#facc15" />
                        Riepilogo Settimanale & Spesa
                    </span>
                    <Link href="/shopping" className="btn btn-primary" style={{ width: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingCart size={18} />
                        Vai alla Lista Spesa
                    </Link>
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Controlla qui sotto se i pasti selezionati ti soddisfano. <br />
                    La lista della spesa sarà generata automaticamente basandosi <strong>esclusivamente sugli ingredienti</strong> elencati qui.
                    Modifica il piano sopra se vuoi cambiare qualcosa.
                </p>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {ENGLISH_DAYS.map(day => {
                        const dayPlan = plan[day];
                        if (!dayPlan) return null;

                        // Show Lunch and Dinner details specifically 
                        const lunch = getMealDetails(dayPlan.lunch);
                        const dinner = getMealDetails(dayPlan.dinner);

                        if (!lunch && !dinner) return null;

                        return (
                            <div key={day} style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', border: '1px solid #334155' }}>
                                <h4 style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.8rem', textTransform: 'uppercase', fontSize: '0.9rem' }}>{DAYS_MAP[day] || day}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {lunch && (
                                        <div>
                                            <strong style={{ color: '#fbbf24', fontSize: '0.9rem' }}>☀️ Pranzo: {lunch.name}</strong>
                                            <ul style={{ margin: '0.3rem 0', paddingLeft: '1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                                {lunch.ingredients.map((ing, i) => (
                                                    <li key={i}>{ing.amount}{ing.unit} {ing.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {dinner && (
                                        <div style={{ borderTop: '1px dashed #334155', paddingTop: '0.8rem' }}>
                                            <strong style={{ color: '#818cf8', fontSize: '0.9rem' }}>🌙 Cena: {dinner.name}</strong>
                                            <ul style={{ margin: '0.3rem 0', paddingLeft: '1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                                {dinner.ingredients.map((ing, i) => (
                                                    <li key={i}>{ing.amount}{ing.unit} {ing.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div >
    );
}

'use client';

import { useState, useRef } from 'react';
import { getRecipeAI } from '@/lib/ai';
import Image from 'next/image';
import { toggleMealEaten, rateMeal } from '@/lib/data';
import { ChefHat, X, ExternalLink, ThumbsUp, ThumbsDown, CheckCircle, Circle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Props = {
    mealName: string;
    description: string;
    user: 'Michael' | 'Jessica';
    recipeUrl?: string;
    imageUrl?: string;
    // New Props for Feedback
    eaten?: boolean;
    rating?: 'up' | 'down';
    day?: string;
    type?: string;
    specificProtein?: string;
    compact?: boolean;
};

export default function RecipeCard({ mealName, description, user, recipeUrl, imageUrl, eaten, rating, day, type, specificProtein, compact }: Props) {
    const [recipe, setRecipe] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Import these dynamically or ensure they are imported at top
    // import { uploadImageAction } from '@/lib/upload';
    // import { analyzeMealPhotoAction } from '@/lib/ai';

    // We need to import them at the top of the file, assuming I will handle imports in a separate Edit or use the existing ones if available (RecipeCard didn't have them).
    // Wait, I need to add imports first or replacing this block will fail compilation if imports are missing.
    // I will add imports in a separate block or include them here if I replace the top.

    const handleAskChef = async () => {
        setOpen(true);
        if (recipe) return; // Already loaded

        setLoading(true);
        try {
            // Determine if shared
            // Dinner is always shared.
            // Lunch is shared only on Saturday and Sunday.
            const isDinner = type === 'dinner';
            const isWeekendLunch = type === 'lunch' && (day === 'Saturday' || day === 'Sunday' || day === 'Sabato' || day === 'Domenica');
            const isShared = isDinner || isWeekendLunch;

            // Enhance description with specific protein if available
            const fullDescription = specificProtein ? `${description} (Usa: ${specificProtein})` : description;
            const result = await getRecipeAI(mealName, fullDescription, user, isShared);
            setRecipe(result);
        } catch {
            setRecipe("Scusa, lo chef è in pausa. Riprova dopo.");
        }
        setLoading(false);
    };

    const handleEaten = async () => {
        if (!day || !type) return;

        // If giving a check (currently false), ask for photo
        if (!eaten) {
            if (confirm("📸 Hai scattato una foto al piatto? \n\nClicca OK per caricarla e analizzarla con l'IA.\nClicca ANNULLA per segnare solo come mangiato.")) {
                fileInputRef.current?.click();
                return;
            }
        }

        // Default toggle without photo
        await toggleMealEaten(day, type);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !day || !type) return;

        setUploading(true);
        try {
            // Dynamic Imports to avoid circular deps / clutter if not present?
            // No, better to have them at top. I will add them in a separate chunk.
            const { uploadImageAction } = await import('@/lib/upload');
            const { analyzeMealPhotoAction } = await import('@/lib/ai');

            const formData = new FormData();
            formData.append('file', file);

            const upRes = await uploadImageAction(formData);
            if (!upRes.success || !upRes.url) throw new Error(upRes.message);

            const analysis = await analyzeMealPhotoAction(upRes.url, mealName);

            alert(`✅ Analisi Completata!\nVoto: ${analysis.rating}/10\nChef: ${analysis.feedback}`);

            await toggleMealEaten(day, type, upRes.url, analysis.feedback, analysis.rating);

        } catch (err) {
            console.error(err);
            alert('Errore caricamento foto. Il pasto verrà segnato comunque.');
            await toggleMealEaten(day, type);
        }
        setUploading(false);
    };

    const handleRate = async (r: 'up' | 'down') => {
        if (!day || !type) return;
        await rateMeal(day, type, r);
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: compact ? '4px' : '8px' }}>
                <button
                    className="btn"
                    style={{
                        fontSize: compact ? '0.7rem' : '0.8rem',
                        padding: compact ? '4px 8px' : '6px 12px',
                        background: '#334155',
                        color: 'white',
                        height: compact ? '28px' : 'auto'
                    }}
                    onClick={handleAskChef}
                >
                    <ChefHat size={compact ? 14 : 16} style={{ marginRight: '6px' }} />
                    {compact ? 'Chef' : 'Chiedi allo Chef'}
                </button>

                {day && type && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Eaten Toggle */}
                        <button onClick={handleEaten} disabled={uploading} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: eaten ? '#22c55e' : '#64748b', opacity: uploading ? 0.5 : 1 }} title="Hai mangiato questo pasto?">
                            {uploading ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                eaten ? <CheckCircle size={22} fill="rgba(34, 197, 94, 0.2)" /> : <Circle size={22} />
                            )}
                        </button>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '16px', background: '#334155' }}></div>

                        {/* Rating */}
                        <button onClick={() => handleRate('up')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: rating === 'up' ? '#eab308' : '#64748b' }}>
                            <ThumbsUp size={18} fill={rating === 'up' ? '#eab308' : 'none'} />
                        </button>
                        <button onClick={() => handleRate('down')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: rating === 'down' ? '#ef4444' : '#64748b' }}>
                            <ThumbsDown size={18} fill={rating === 'down' ? '#ef4444' : 'none'} />
                        </button>
                    </div>
                )}
            </div>

            {open && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
                    }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="card"
                        style={{
                            width: '90%', maxWidth: '500px', maxHeight: '80vh',
                            overflowY: 'auto', position: 'relative',
                            background: '#1e293b', // Ensure background is set
                            borderRadius: '16px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setOpen(false)}
                            style={{
                                position: 'absolute', top: '15px', right: '15px',
                                background: 'rgba(0,0,0,0.3)', color: '#fff',
                                border: 'none', borderRadius: '50%',
                                width: '32px', height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', zIndex: 10
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ padding: '1.5rem' }}>
                            <h3 className="title" style={{ fontSize: '1.2rem', paddingRight: '20px', marginTop: 0 }}>Chef AI 👨‍🍳</h3>
                            <p className="subtitle" style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#94a3b8' }}>{mealName}</p>

                            {imageUrl && (
                                <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid #334155', position: 'relative' }}>
                                    <Image
                                        src={imageUrl}
                                        alt={mealName}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                            )}

                            {recipeUrl && (
                                <a
                                    href={recipeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        background: '#eab308',
                                        color: '#000',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        marginBottom: '1.5rem',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <ExternalLink size={18} />
                                    Vedi Ricetta Originale (GialloZafferano)
                                </a>
                            )}

                            <div className="markdown-body" style={{ marginTop: '1rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <div className="animate-spin" style={{ display: 'inline-block', fontSize: '2rem', marginBottom: '1rem' }}>🍳</div>
                                        <p style={{ color: '#94a3b8' }}>Sto preparando i consigli per {user}...</p>
                                    </div>
                                ) : (
                                    <ReactMarkdown>{recipe || ''}</ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

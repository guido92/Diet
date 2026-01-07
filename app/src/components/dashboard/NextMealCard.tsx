'use client';

import { Utensils } from 'lucide-react';
import RecipeCard from '@/components/RecipeCard';

export default function NextMealCard({ meal, type, time }: { meal: any, type: string, time: string }) {
    if (!meal) {
        return (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.7 }}>
                <p>Nessun altro pasto in programma oggi.</p>
            </div>
        );
    }

    return (
        <div className="card highlight-card" style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid #334155',
            padding: '0',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                        background: '#e2e8f0', color: '#0f172a',
                        fontSize: '0.75rem', fontWeight: 'bold',
                        padding: '2px 8px', borderRadius: '12px'
                    }}>
                        {time}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {type}
                    </span>
                </div>

                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', lineHeight: '1.2', marginBottom: '0.5rem', color: 'white' }}>
                    {meal.name}
                </h2>

                {meal.description && (
                    <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: '1.4' }}>
                        {meal.description}
                    </p>
                )}
            </div>

            {/* Embedded Recipe Card Actions - Simplified/integrated if possible, or just the card itself */}
            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                <RecipeCard
                    mealName={meal.name}
                    description={meal.description}
                    user={'Michael'} // Default, will need prop
                    recipeUrl={meal.recipeUrl}
                    day={'Monday'} // Dummy, needs prop
                    type={type.toLowerCase()}
                    compact={false}
                />
            </div>
        </div>
    );
}

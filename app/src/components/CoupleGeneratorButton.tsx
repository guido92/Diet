'use client';

import { useState } from 'react';
import { generateBothPlansAction } from '@/lib/ai';
import { Wand2 } from 'lucide-react';

export default function CoupleGeneratorButton() {
    const [generating, setGenerating] = useState(false);

    const handleGenerateBoth = async () => {
        const confirm = window.confirm(`Generare il piano per SIA Michael CHE Jessica? Sovrascriverà entrambi i piani attuali!`);
        if (!confirm) return;

        setGenerating(true);
        try {
            const result = await generateBothPlansAction();
            if (result.success) {
                alert(result.message);
                window.location.reload(); // Refresh to see changes
            } else {
                alert(result.message);
            }
        } catch (e) {
            alert('Errore AI: ' + e);
        }
        setGenerating(false);
    };

    return (
        <button
            className="btn"
            style={{
                width: '100%',
                marginBottom: '1.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                padding: '1rem'
            }}
            onClick={handleGenerateBoth}
            disabled={generating}
        >
            <Wand2 size={20} style={{ marginRight: '8px' }} />
            {generating ? 'Sto generando...' : '✨ Genera Piano di Coppia con AI'}
        </button>
    );
}

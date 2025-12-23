'use client';

import { useState } from 'react';
import { processPDFAction } from '@/lib/ai';
import { FileUp, Loader2, CheckCircle, AlertCircle, ChevronDown, X } from 'lucide-react';

type Props = {
    userName: string;
};

export default function DietUploader({ userName }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const result = await processPDFAction(formData);
            if (result.success) {
                setStatus({ type: 'success', msg: result.message });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setStatus({ type: 'error', msg: result.message });
            }
        } catch {
            setStatus({ type: 'error', msg: 'Errore imprevisto durante il caricamento.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="btn"
                style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px dashed #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px'
                }}
            >
                <FileUp size={18} />
                <span>Aggiorna Dieta {userName} (PDF)</span>
                <ChevronDown size={16} />
            </button>
        );
    }

    return (
        <div className="card" style={{ borderStyle: 'dashed', borderColor: '#334155', background: '#0f172a', position: 'relative' }}>
            <button
                onClick={() => setIsExpanded(false)}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', color: '#64748b' }}
            >
                <X size={20} />
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', paddingTop: '10px' }}>
                <div style={{ background: '#1e293b', padding: '12px', borderRadius: '50%' }}>
                    {loading ? <Loader2 className="animate-spin" color="#10b981" /> : <FileUp color="#94a3b8" />}
                </div>

                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Carica Linee Guida PDF</h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Aggiorna la dieta di <strong>{userName}</strong>.
                    </p>
                </div>

                <label className="btn btn-primary" style={{ cursor: 'pointer', width: 'auto' }}>
                    {loading ? 'Analisi in corso...' : 'Seleziona PDF'}
                    <input
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={handleUpload}
                        disabled={loading}
                    />
                </label>

                {status && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem',
                        color: status.type === 'success' ? '#10b981' : '#ef4444',
                        padding: '8px 16px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '8px'
                    }}>
                        {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {status.msg}
                    </div>
                )}
            </div>
        </div>
    );
}

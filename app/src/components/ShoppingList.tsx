'use client';

import { useState, useMemo } from 'react';
import { WeeklyPlan, ManualItem, ConadOffer, addManualShoppingItem, removeManualShoppingItem, toggleManualShoppingItem, clearActiveOffers, togglePantryItem, getSyncStatusAction } from '@/lib/data';
import { MealOption, getSeasonalFruit, getSeasonalVeg } from '@/lib/guidelines';
import { CheckSquare, Square, Plus, Trash2, ExternalLink, Zap, Percent, RefreshCcw, Search, Sparkles, ChevronDown, ChevronUp, Package, Share2, Archive } from 'lucide-react';
import { processFlyerUrlAction, smartSyncOffersAction } from '@/lib/ai';
import { PIECE_WEIGHTS } from '@/lib/conversions';

const CONAD_PACKS: Record<string, { size: number; label: string }> = {
    'Uova': { size: 6, label: 'conf.' },
    'Tonno': { size: 3, label: 'lattine' },
    'Yocci': { size: 2, label: 'vasetti' },
    'Yogurt': { size: 2, label: 'vasetti' },
};

type Props = {
    profiles: { name: string; plan: WeeklyPlan; guidelines: MealOption[] }[];
    manualItems: ManualItem[];
    conadFlyers: { url: string; lastSync: string }[];
    activeOffers: ConadOffer[];
    lastUpdate?: string;
    pantryItems: string[];
};

export default function ShoppingList({ profiles, manualItems, conadFlyers, activeOffers, lastUpdate, pantryItems = [] }: Props) {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [newItemName, setNewItemName] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [flyerInput, setFlyerInput] = useState('');

    // Pantry Logic UI State
    const [showPantry, setShowPantry] = useState(false);

    // UX Overhaul States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [isOffersExpanded, setIsOffersExpanded] = useState(false);

    const uniqueCategories = useMemo(() => {
        const cats = new Set(activeOffers.map(o => o.categoria));
        return Array.from(cats).sort();
    }, [activeOffers]);

    const filteredOffers = useMemo(() => {
        return activeOffers.filter(offer => {
            const matchesSearch = offer.prodotto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offer.categoria.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'ALL' || offer.categoria === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [activeOffers, searchTerm, selectedCategory]);

    const aggregatedIngredients = useMemo(() => {
        const totals: Record<string, { amount: number; unit: string; owners: Set<string>; subItems?: Record<string, number> }> = {};
        const seasonalFruit = getSeasonalFruit();
        const seasonalVeg = getSeasonalVeg();

        profiles.forEach(({ name: userName, plan, guidelines }) => {
            Object.values(plan).forEach((day: any) => {
                const mealTypes = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'] as const;
                mealTypes.forEach(type => {
                    const mealId = day[type];
                    // @ts-ignore
                    const details = day[`${type}_details`];

                    if (mealId && typeof mealId === 'string') {
                        const meal = guidelines.find(g => g.id === mealId);
                        meal?.ingredients.forEach(ing => {
                            let itemName = ing.name;
                            let subList: string[] = [];

                            // --- SMART SHOPPING LOGIC ---

                            // 1. Specific Overrides (E.g. "Riso" instead of "Carboidrati", "Orata" instead of "Pesce")
                            if (details) {
                                if (ing.name === 'Frutta di Stagione' && details.specificFruit) itemName = details.specificFruit;
                                else if (ing.name.includes('Verdura') && details.specificVeg) itemName = details.specificVeg;
                                else if (ing.name === 'Carboidrati' && details.specificCarb) itemName = details.specificCarb;
                                else if (ing.name.includes('Proteina') && details.specificProtein) itemName = details.specificProtein;
                                // Fallback: If generic name matches a category we have specific detail for
                                else if (ing.name === 'Carboidrati' && details.name && (details.name.includes('Riso') || details.name.includes('Pasta'))) {
                                    // Weak inference if specificCarb is missing but name hints it
                                }
                            }

                            // 2. Seasonal Fallbacks if still generic
                            if (itemName === 'Frutta di Stagione') { itemName = 'Frutta Mista'; subList = seasonalFruit; }
                            else if (itemName.includes('Verdura di Stagione')) { itemName = 'Verdure Miste'; subList = seasonalVeg; }

                            // 3. Normalization (Start Case + Trim)
                            // "Petto di pollo" -> "Petto Di Pollo"
                            itemName = itemName
                                .toLowerCase()
                                .split(' ')
                                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(' ')
                                .trim();

                            // 4. Accumulate
                            if (!totals[itemName]) totals[itemName] = { amount: 0, unit: ing.unit, owners: new Set(), subItems: {} };
                            totals[itemName].amount += ing.amount;
                            totals[itemName].owners.add(userName);

                            if (subList.length > 0) {
                                const perItemAmount = Math.round(ing.amount / subList.length);
                                subList.forEach(s => { totals[itemName].subItems![s] = (totals[itemName].subItems![s] || 0) + perItemAmount; });
                            }
                        });
                    }
                });
            });
        });
        return Object.entries(totals).sort((a, b) => a[0].localeCompare(b[0]));
    }, [profiles]);

    const activeList = useMemo(() => aggregatedIngredients.filter(([name]) => !pantryItems.includes(name)), [aggregatedIngredients, pantryItems]);
    const inPantryList = useMemo(() => aggregatedIngredients.filter(([name]) => pantryItems.includes(name)), [aggregatedIngredients, pantryItems]);

    const handleAddItem = async () => {
        // ... existing implementation ...
        if (!newItemName) return;
        setLoading(true);
        await addManualShoppingItem(newItemName, newItemAmount || '1', parseFloat(newItemPrice) || 0);
        setNewItemName(''); setNewItemAmount(''); setNewItemPrice('');
        setLoading(false);
        // window.location.reload(); // handled by props update usually, but trigger standard reload for simplicity
        window.location.reload();
    };

    const handleShareWhatsApp = () => {
        let text = "*GRANDE SPESA MICHAEL & JESSICA* 🛒\n\n";

        const toBuy = activeList.filter(([name]) => !checkedItems[name]);
        const manualToBuy = manualItems.filter(i => !i.checked);

        if (toBuy.length > 0) {
            text += "*Dalla Dieta:*\n";
            toBuy.forEach(([name, data]) => {
                text += `- ${name} (${data.amount}${data.unit})\n`;
            });
            text += "\n";
        }

        if (manualToBuy.length > 0) {
            text += "*Extra & Offerte:*\n";
            manualToBuy.forEach(i => {
                text += `- ${i.name} (${i.amount})\n`;
            });
        }

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const togglePantry = async (item: string) => {
        setLoading(true);
        await togglePantryItem(item);
        window.location.reload();
    };

    // ... Rest of handles ...

    const handleRemoveItem = async (id: string) => {
        await removeManualShoppingItem(id);
        window.location.reload();
    };

    const handleToggleManual = async (id: string) => {
        await toggleManualShoppingItem(id);
        window.location.reload();
    };

    const handleSyncFlyer = async () => {
        if (!flyerInput) return;
        setLoading(true);
        try {
            const res = await processFlyerUrlAction(flyerInput);
            alert(res.message);
        } catch (e) {
            alert('Errore durante la scansione del volantino');
        }
        setLoading(false);
        window.location.reload();
    };

    const handleAddOffer = async (offer: ConadOffer) => {
        setLoading(true);
        const price = parseFloat(offer.prezzo.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        await addManualShoppingItem(offer.prodotto, offer.unita || '1', price);
        setLoading(false);
        window.location.reload();
    };

    const handleSmartSync = async () => {
        setLoading(true);
        try {
            const res = await smartSyncOffersAction();
            if (res.success) {
                // Polling Loop
                while (true) {
                    await new Promise(r => setTimeout(r, 2000));
                    const status = await getSyncStatusAction();

                    if (status.state === 'success') {
                        alert(status.message);
                        window.location.reload();
                        break;
                    }
                    if (status.state === 'error') {
                        alert(`Errore: ${status.message}`);
                        setLoading(false);
                        break;
                    }
                    // Continue polling if 'running' or 'idle' (assuming running)
                }
            } else {
                alert(res.message);
                setLoading(false);
            }
        } catch (e) {
            alert('Errore durante la comunicazione col server.');
            setLoading(false);
        }
    };

    const getPackInfo = (name: string, amount: number, subItems?: Record<string, number>) => {
        if (subItems && Object.keys(subItems).length > 0) {
            const lines = Object.entries(subItems).map(([item, weight]) => {
                const count = Math.ceil(weight / (PIECE_WEIGHTS[item] || 200));
                return `${count} ${item}`;
            });
            return `Circa: ${lines.join(', ')}`;
        }
        const pack = CONAD_PACKS[name];
        if (!pack) return null;
        const count = Math.ceil(amount / pack.size);
        const plural = count > 1 && !pack.label.endsWith('.') ? (pack.label.endsWith('a') ? 'e' : pack.label.endsWith('o') ? 'i' : '') : '';
        return `${count} ${pack.label}${plural}`;
    };

    const totalPrice = manualItems.reduce((acc, item) => acc + (item.checked ? 0 : item.price), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
            {/* Header & Flyer */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Conad Cesena Autopilot 🚀</h2>
                            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Bessarione & Spazio Lucchi integrati</p>
                        </div>
                        <button
                            onClick={handleSmartSync}
                            disabled={loading}
                            className="btn"
                            style={{
                                background: 'white',
                                color: '#2563eb',
                                padding: '10px 16px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        >
                            {loading ? <RefreshCcw size={18} className="spin" /> : <Sparkles size={18} />}
                            {loading ? 'Sincronizzazione...' : 'Aggiorna Offerte'}
                        </button>
                    </div>

                    {conadFlyers.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                            {conadFlyers.map((f: any, i) => (
                                <a
                                    key={i}
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(255,255,255,0.15)',
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap',
                                        color: 'white',
                                        textDecoration: 'none',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <ExternalLink size={12} /> {f.label || `Volantino ${i + 1}`}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Active Offers from AI Scan (Collapsible) */}
            {activeOffers.length > 0 && (
                <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(234, 179, 8, 0.4)', background: 'rgba(234, 179, 8, 0.05)' }}>
                    <div
                        className="flex-between"
                        style={{ padding: '16px', cursor: 'pointer', background: isOffersExpanded ? 'rgba(234, 179, 8, 0.1)' : 'transparent' }}
                        onClick={() => setIsOffersExpanded(!isOffersExpanded)}
                    >
                        <h3 className="subtitle" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#eab308' }}>
                            <Zap size={18} fill="#eab308" /> Offerte Volantino
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#eab308', fontWeight: 600 }}>{activeOffers.length} attive</span>
                            {isOffersExpanded ? <ChevronUp size={18} color="#eab308" /> : <ChevronDown size={18} color="#eab308" />}
                        </div>
                    </div>

                    {/* Collapsible Content */}
                    {isOffersExpanded && (
                        <div style={{ padding: '16px', borderTop: '1px solid rgba(234, 179, 8, 0.2)' }}>
                            {/* Search & Filters */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                {/* Search Bar */}
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Cerca offerte (es. Tonno, Pasta...)"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            background: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontSize: '0.95rem'
                                        }}
                                    />
                                </div>

                                {/* Category Chips */}
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                                    <button
                                        onClick={() => setSelectedCategory('ALL')}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            background: selectedCategory === 'ALL' ? '#eab308' : '#334155',
                                            color: selectedCategory === 'ALL' ? '#000' : '#fff',
                                            border: 'none'
                                        }}
                                    >
                                        Tutto
                                    </button>
                                    {uniqueCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                background: selectedCategory === cat ? '#eab308' : 'rgba(255,255,255,0.1)',
                                                color: selectedCategory === cat ? '#000' : '#cbd5e1',
                                                border: '1px solid ' + (selectedCategory === cat ? '#eab308' : 'rgba(255,255,255,0.1)')
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Responsive Grid Layout */}
                            {Object.entries(
                                filteredOffers.reduce((acc, offer) => {
                                    const store = offer.negozio || 'Altro';
                                    if (!acc[store]) acc[store] = [];
                                    acc[store].push(offer);
                                    return acc;
                                }, {} as Record<string, typeof filteredOffers>)
                            ).sort((a, b) => a[0].localeCompare(b[0])).map(([storeName, offers]) => (
                                <div key={storeName} style={{ marginBottom: '20px' }}>
                                    <h4 style={{
                                        color: '#94a3b8',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '10px',
                                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        paddingBottom: '4px'
                                    }}>
                                        {storeName}
                                    </h4>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                        gap: '12px'
                                    }}>
                                        {offers.map((offer, idx) => (
                                            <div key={idx} className="card" style={{
                                                padding: '12px',
                                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                                background: 'rgba(234, 179, 8, 0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                position: 'relative',
                                                margin: 0
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#eab308', textTransform: 'uppercase', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                                                        {offer.categoria}
                                                    </span>
                                                </div>
                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '6px 0', flex: 1, lineHeight: '1.3', minHeight: '2.6em' }}>
                                                    {offer.prodotto}
                                                </h4>
                                                <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>{offer.prezzo}</span>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{offer.unita}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddOffer(offer)}
                                                        className="btn btn-primary"
                                                        style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                                {offer.sconto && <div style={{ position: 'absolute', top: '8px', right: '8px' }}><span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{offer.sconto}</span></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {filteredOffers.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                                    Nessuna offerta trovata per "{searchTerm}" in questa categoria.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Manual Add Form */}
            <div className="card">
                <h3 className="subtitle" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Aggiungi extra (es. detersivo, offerte volantino)
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '1rem' }}>
                    <input type="text" placeholder="Nome" value={newItemName} onChange={e => setNewItemName(e.target.value)} style={{ flex: '2 1 150px', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }} />
                    <input type="text" placeholder="Q.tà" value={newItemAmount} onChange={e => setNewItemAmount(e.target.value)} style={{ flex: '1 1 80px', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }} />
                    <input type="number" placeholder="€" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} style={{ flex: '1 1 80px', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }} />
                    <button className="btn btn-primary" onClick={handleAddItem} disabled={loading} style={{ flex: '0 0 auto', width: 'auto', padding: '10px 20px', borderRadius: '8px' }}>Aggiungi</button>
                </div>
            </div>

            {/* Aggregated List (from Diet) */}
            <div>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <h3 className="subtitle" style={{ marginLeft: '0.5rem', marginBottom: 0 }}>Dalla vostra Dieta 🥗</h3>
                    <button className="btn" style={{ background: '#22c55e', color: 'white', width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleShareWhatsApp}>
                        <Share2 size={16} style={{ marginRight: '6px' }} /> Share WhatsApp
                    </button>
                </div>

                <div className="card">
                    {activeList.map(([name, data]) => {
                        const isChecked = checkedItems[name];
                        const packSuggestion = getPackInfo(name, data.amount, data.subItems);
                        const matchingOffer = activeOffers.find(o => o.prodotto.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(o.prodotto.toLowerCase()));

                        return (
                            <div key={name} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid #334155', opacity: isChecked ? 0.5 : 1 }}>
                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCheckedItems(p => ({ ...p, [name]: !p[name] }))}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ textDecoration: isChecked ? 'line-through' : 'none', fontWeight: 600 }}>{name}</span>
                                        {matchingOffer && <Percent size={14} color="#eab308" />}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>{data.amount}{data.unit}</span>
                                        {packSuggestion && <span style={{ fontSize: '0.75rem', background: '#0f172a', padding: '2px 8px', borderRadius: '4px', border: '1px solid #334155' }}>💡 {packSuggestion}</span>}
                                        {matchingOffer && (
                                            <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 700 }}>
                                                PROMO {matchingOffer.negozio ? `(${matchingOffer.negozio})` : ''}: {matchingOffer.prezzo}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>({Array.from(data.owners).join(' + ')})</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <button onClick={(e) => { e.stopPropagation(); togglePantry(name); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }} title="Metti in dispensa">
                                        <Archive size={18} />
                                    </button>
                                    <div onClick={() => setCheckedItems(p => ({ ...p, [name]: !p[name] }))} style={{ cursor: 'pointer' }}>
                                        {isChecked ? <CheckSquare color="#10b981" /> : <Square color="#94a3b8" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {activeList.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Nulla da comprare (tutto in dispensa?)</div>}
                </div>
            </div>

            {/* Pantry List (Hidden by default) */}
            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #334155' }}>
                <div className="flex-between" onClick={() => setShowPantry(!showPantry)} style={{ cursor: 'pointer' }}>
                    <h3 className="subtitle" style={{ fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                        <Package size={16} /> Dispensa ({inPantryList.length})
                    </h3>
                    {showPantry ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                </div>

                {showPantry && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {inPantryList.map(([name, data]) => (
                            <div key={name} style={{ background: '#1e293b', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #334155' }}>
                                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{name}</span>
                                <button onClick={() => togglePantry(name)} style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', display: 'flex' }}>
                                    <Plus size={14} />
                                </button>
                            </div>
                        ))}
                        {inPantryList.length === 0 && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Dispensa vuota.</span>}
                    </div>
                )}
            </div>

            {/* Manual List */}
            {manualItems.length > 0 && (
                <div>
                    <h3 className="subtitle" style={{ marginLeft: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Extra & Offerte 🏷️</span>
                        <span style={{ color: '#10b981' }}>Est. Totale: €{totalPrice.toFixed(2)}</span>
                    </h3>
                    <div className="card">
                        {manualItems.map((item) => (
                            <div key={item.id} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid #334155', opacity: item.checked ? 0.5 : 1 }}>
                                <div style={{ flex: 1 }} onClick={() => handleToggleManual(item.id)}>
                                    <span style={{ textDecoration: item.checked ? 'line-through' : 'none', fontWeight: 600 }}>{item.name}</span>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Q.tà: {item.amount}</span>
                                        {item.price > 0 && <span style={{ fontSize: '0.8rem', color: '#eab308' }}>€{item.price.toFixed(2)}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div onClick={() => handleToggleManual(item.id)}>
                                        {item.checked ? <CheckSquare color="#10b981" /> : <Square color="#94a3b8" />}
                                    </div>
                                    <button onClick={() => handleRemoveItem(item.id)} style={{ background: 'transparent', color: '#ef4444', padding: '4px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

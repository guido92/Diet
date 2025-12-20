
export const PIECE_WEIGHTS: Record<string, number> = {
    // Frutta
    'Arance': 200,
    'Mandarini': 70,
    'Mele': 180,
    'Pere': 180,
    'Kiwi': 70,
    'Banane': 150,
    'Pesche': 140,
    'Albicocche': 45,
    'Susine': 50,
    'Fichi': 40,
    'Ciliegie': 9, // 1 ciliegia
    'Fragole': 15,
    'Nespole': 40,
    'Melograno': 250,
    'Cachi': 200,
    'Uva': 10, // chicco
    'Melone': 1200, // intero, ma slice? gestiremo dopo
    'Anguria': 5000,

    // Verdura
    'Patate': 120,
    'Zucchine': 180,
    'Carote': 80,
    'Cetrioli': 250,
    'Pomodori': 140, // insalataro
    'Pomodorini': 20,
    'Finocchi': 300,
    'Peperoni': 250,
    'Melanzane': 350,
    'Carciofi': 120, // pulito circa 60-70? Mettiamo lordo pezzo
    'Asparagi': 30, // singolo asparago
    'Broccoli': 400, // testa
    'Cavolfiore': 600, // testa

    // Altro
    'Uova': 55,
    'Toast': 25, // fetta
    'Sottiletta': 25,
};

export const ALIAS_MAP: Record<string, string[]> = {
    'Mele': ['mela', 'mele'],
    'Arance': ['arancia', 'arance'],
    // ... basic mapping if needed for smart matching
};

export function getPieceLabel(itemName: string, grams: number): string {
    // 1. Normalize name (remove plural/singular logic if strict, but our keys are mostly plural uppercase)
    // Try exact match
    const singleWeight = PIECE_WEIGHTS[itemName];

    if (!singleWeight) return ''; // No conversion available

    // Special case for big fruits usually eaten by slice?
    if (itemName === 'Anguria' || itemName === 'Melone' || itemName === 'Zucca') {
        return ''; // Difficile quantificare a pezzi
    }

    const count = grams / singleWeight;
    const rounded = Math.round(count);

    if (rounded < 1) {
        // E.g. 20g of Apple (impossible? maybe dried). Or 100g of Anguria.
        return '';
    }

    if (rounded === 1) return '(~1 pz)';

    // Small variance handling
    // If it's close to X.5, maybe say "2-3"? For now keep simple:
    return `(~${rounded} pz)`;
}

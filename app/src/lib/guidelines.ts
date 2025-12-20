import { WeeklyPlan } from './data';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn' | 'always';

export type Ingredient = {
  name: string;
  amount: number;
  unit: string;
};

export type MealOption = {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  type: 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner';
  condition?: 'training' | 'rest' | 'always';
  season?: Season;
  owners?: ('Michael' | 'Jessica')[];
};

// Seasonal Map
const SEASONAL_DATA = {
  winter: {
    fruit: ['Arance', 'Mandarini', 'Mele', 'Pere', 'Kiwi'],
    veg: ['Broccoli', 'Cavolfiore', 'Finocchi', 'Spinaci', 'Bietole', 'Radicchio'],
  },
  spring: {
    fruit: ['Fragole', 'Ciliegie', 'Nespole', 'Kiwi'],
    veg: ['Asparagi', 'Carciofi', 'Piselli', 'Fave', 'Zucchine'],
  },
  summer: {
    fruit: ['Pesche', 'Albicocche', 'Melone', 'Anguria', 'Susine', 'Fichi'],
    veg: ['Pomodori', 'Peperoni', 'Melanzane', 'Zucchine', 'Cetrioli', 'Fagiolini'],
  },
  autumn: {
    fruit: ['Uva', 'Melograno', 'Mele', 'Pere', 'Cachi'],
    veg: ['Zucca', 'Funghi', 'Cavolo Nero', 'Spinaci', 'Porri'],
  }
};

export function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function getSeasonalFruit() {
  const s = getCurrentSeason();
  return s === 'always' ? SEASONAL_DATA.summer.fruit : SEASONAL_DATA[s].fruit;
}

export function getSeasonalVeg() {
  const s = getCurrentSeason();
  return s === 'always' ? SEASONAL_DATA.summer.veg : SEASONAL_DATA[s].veg;
}

export const GUIDELINES: MealOption[] = [
  // COLAZIONE
  // COLAZIONE - STRICT SPLIT
  {
    id: 'b1_m',
    name: 'Toast Proteico + Marmellata (Michael)',
    description: '2 Fette pane toast + 100g Philadelphia Protein + 10g Marmellata',
    ingredients: [
      { name: 'Pane Toast', amount: 50, unit: 'g' },
      { name: 'Philadelphia Protein', amount: 100, unit: 'g' },
      { name: 'Marmellata', amount: 10, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'b1_j',
    name: 'Toast Proteico + Marmellata (Jessica)',
    description: '1 Fetta grande pane toast (30g) + 100g Philadelphia Protein + 10g Marmellata',
    ingredients: [
      { name: 'Pane Toast', amount: 30, unit: 'g' },
      { name: 'Philadelphia Protein', amount: 100, unit: 'g' },
      { name: 'Marmellata', amount: 10, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'b2_m',
    name: 'Biscotti e Frutta (Michael)',
    description: '35g Biscotti Integrali + 200g Frutta Fresca di stagione',
    ingredients: [
      { name: 'Biscotti Integrali', amount: 35, unit: 'g' },
      { name: 'Frutta di Stagione', amount: 200, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'b2_j',
    name: 'Biscotti e Frutta (Jessica)',
    description: '35g Biscotti Integrali + 200g Frutta Fresca di stagione',
    ingredients: [
      { name: 'Biscotti Integrali', amount: 35, unit: 'g' },
      { name: 'Frutta di Stagione', amount: 200, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'b3_m',
    name: 'Toast Salato Light (Michael)',
    description: '2 Fette pane toast + 1 Fetta Sottiletta Light + 100g Affettato magro',
    ingredients: [
      { name: 'Pane Toast', amount: 50, unit: 'g' },
      { name: 'Sottiletta Light', amount: 20, unit: 'g' },
      { name: 'Affettato Magro (Fesa/Bresaola)', amount: 100, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'winter',
    owners: ['Michael'],
  },
  {
    id: 'b3_j',
    name: 'Toast Salato Light (Jessica)',
    description: '1 Fetta grande pane toast (30g) + 1 Fetta Sottiletta Light + 100g Affettato magro',
    ingredients: [
      { name: 'Pane Toast', amount: 30, unit: 'g' },
      { name: 'Sottiletta Light', amount: 20, unit: 'g' },
      { name: 'Affettato Magro (Fesa/Bresaola)', amount: 100, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'winter',
    owners: ['Jessica'],
  },
  {
    id: 'b4_m',
    name: 'Yogurt Greco e Avena (Michael)',
    description: '200g Yogurt Greco Magro + 30g Granola + 10g Miele',
    ingredients: [
      { name: 'Yogurt Greco Magro', amount: 200, unit: 'g' },
      { name: 'Granola/Fiocchi d\'Avena', amount: 30, unit: 'g' },
      { name: 'Miele', amount: 10, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'summer',
    owners: ['Michael'],
  },
  {
    id: 'b4_j',
    name: 'Yogurt Greco e Avena (Jessica)',
    description: '150g Yogurt Greco Magro + 30g Granola + 10g Miele',
    ingredients: [
      { name: 'Yogurt Greco Magro', amount: 150, unit: 'g' },
      { name: 'Granola/Fiocchi d\'Avena', amount: 30, unit: 'g' },
      { name: 'Miele', amount: 10, unit: 'g' }
    ],
    type: 'breakfast',
    condition: 'always',
    season: 'summer',
    owners: ['Jessica'],
  },

  // SPUNTINO MATTINA
  {
    id: 'sam1',
    name: 'Frutta Fresca',
    description: '200g Frutta fresca di stagione',
    ingredients: [
      { name: 'Frutta di Stagione', amount: 200, unit: 'g' }
    ],
    type: 'snack_am',
    condition: 'rest',
    season: 'always',
    owners: ['Michael', 'Jessica'],
  },
  {
    id: 'sam2',
    name: 'Toast Burro Arachidi (Pre-Workout)',
    description: '1 Fetta pane tostato + 10g Burro d\'Arachidi + 10g Marmellata',
    ingredients: [
      { name: 'Pane Toast', amount: 25, unit: 'g' },
      { name: 'Burro d\'Arachidi', amount: 10, unit: 'g' },
      { name: 'Marmellata', amount: 10, unit: 'g' }
    ],
    type: 'snack_am',
    condition: 'training',
    season: 'always',
    owners: ['Michael'],
  },

  // PRANZO - INDIVIDUALI MA COMPATIBILI
  {
    id: 'l1_m',
    name: 'Legumi e Verdure (Michael)',
    description: '240g Legumi sgocciolati + 300g Verdure di stagione. NO OLIO.',
    ingredients: [
      { name: 'Ceci/Fagioli/Lenticchie', amount: 240, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'l1_j',
    name: 'Legumi e Verdure (Jessica)',
    description: '240g Legumi + 300g Verdure + 10g Olio.',
    ingredients: [
      { name: 'Ceci/Fagioli/Lenticchie', amount: 240, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'l2_m',
    name: 'Pasta/Riso/Cereali (Michael)',
    description: '80g Pasta/Riso/Farro/Orzo + 100g Passata/Verdure. NO OLIO.',
    ingredients: [
      { name: 'Pasta/Riso/Farro/Orzo', amount: 80, unit: 'g' },
      { name: 'Passata di Pomodoro', amount: 100, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 200, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'l2_j',
    name: 'Pasta/Riso/Cereali (Jessica)',
    description: '60g Pasta/Riso/Farro/Orzo + 100g Passata/Verdure + 10g Olio.',
    ingredients: [
      { name: 'Pasta/Riso/Farro/Orzo', amount: 60, unit: 'g' },
      { name: 'Passata di Pomodoro', amount: 100, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 200, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'l3_m_pollo',
    name: 'Petto di Pollo e Verdure (Michael)',
    description: '200g Petto di Pollo + 50g Pane + 300g Verdure. NO OLIO.',
    ingredients: [
      { name: 'Petto di Pollo', amount: 200, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'l3_j_pollo',
    name: 'Petto di Pollo e Verdure (Jessica)',
    description: '200g Petto di Pollo + 50g Pane + 300g Verdure + 10g Olio.',
    ingredients: [
      { name: 'Petto di Pollo', amount: 200, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'l3_m_tacchino',
    name: 'Fesa di Tacchino e Verdure (Michael)',
    description: '200g Fesa di Tacchino + 50g Pane + 300g Verdure.',
    ingredients: [
      { name: 'Fesa di Tacchino', amount: 200, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'l3_j_tacchino',
    name: 'Fesa di Tacchino e Verdure (Jessica)',
    description: '200g Fesa di Tacchino + 50g Pane + 300g Verdure + 10g Olio.',
    ingredients: [
      { name: 'Fesa di Tacchino', amount: 200, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'l3_m_bresaola',
    name: 'Bresaola e Verdure (Michael)',
    description: '150g Bresaola + 50g Pane + 300g Verdure.',
    ingredients: [
      { name: 'Bresaola', amount: 150, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'l3_j_bresaola',
    name: 'Bresaola e Verdure (Jessica)',
    description: '150g Bresaola + 50g Pane + 300g Verdure + 10g Olio.',
    ingredients: [
      { name: 'Bresaola', amount: 150, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'l3_m_merluzzo',
    name: 'Merluzzo e Verdure (Michael)',
    description: '250g Merluzzo + 50g Pane + 300g Verdure.',
    ingredients: [
      { name: 'Merluzzo/Nasello', amount: 250, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'l3_j_merluzzo',
    name: 'Merluzzo e Verdure (Jessica)',
    description: '250g Merluzzo + 50g Pane + 300g Verdure + 10g Olio.',
    ingredients: [
      { name: 'Merluzzo/Nasello', amount: 250, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'l_minestra_m',
    name: 'Minestra calda di Verdure (Michael)',
    description: 'Passato o minestra di verdura (300g) + 50g Pane. NO OLIO.',
    ingredients: [
      { name: 'Verdura di Stagione (Zuppa)', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'winter',
    owners: ['Michael'],
  },
  {
    id: 'l_minestra_j',
    name: 'Minestra calda di Verdure (Jessica)',
    description: 'Passato o minestra di verdura (300g) + 50g Pane + 10g Olio.',
    ingredients: [
      { name: 'Verdura di Stagione (Zuppa)', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'lunch',
    condition: 'always',
    season: 'winter',
    owners: ['Jessica'],
  },

  // CENA - SHARED DINNERS (Michael & Jessica)
  // CENA - SPLIT DINNERS
  {
    id: 'd1_m_pollo',
    name: 'Pollo alla Piastra (Michael)',
    description: '200g Pollo + 300g Verdure + 50g Pane + 10g Olio.',
    ingredients: [
      { name: 'Petto di Pollo', amount: 200, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'd1_j_pollo',
    name: 'Pollo alla Piastra (Jessica)',
    description: '200g Pollo + 300g Verdure + 30g Pane + 10g Olio.',
    ingredients: [
      { name: 'Petto di Pollo', amount: 200, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 30, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'd1_m_manzo',
    name: 'Tagliata di Manzo (Michael)',
    description: '200g Manzo + 300g Verdure + 50g Pane + 10g Olio.',
    ingredients: [
      { name: 'Manzo Magro', amount: 200, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'd1_j_manzo',
    name: 'Tagliata di Manzo (Jessica)',
    description: '200g Manzo + 300g Verdure + 30g Pane + 10g Olio.',
    ingredients: [
      { name: 'Manzo Magro', amount: 200, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 30, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'd1_m_salmone',
    name: 'Salmone (Michael)',
    description: '200g Salmone + 300g Verdure + 50g Pane + 10g Olio.',
    ingredients: [
      { name: 'Salmone', amount: 200, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'd1_m_pesce_bianco',
    name: 'Pesce Bianco (Michael)',
    description: '250g Pesce Bianco (Orata, Merluzzo, Spigola) + 300g Verdure + 50g Pane + 10g Olio.',
    ingredients: [
      { name: 'Pesce Bianco / Merluzzo', amount: 250, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'd1_j_salmone',
    name: 'Salmone (Jessica)',
    description: '200g Salmone + 300g Verdure + 30g Pane + 10g Olio.',
    ingredients: [
      { name: 'Salmone', amount: 200, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 30, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'd1_j_pesce_bianco',
    name: 'Pesce Bianco (Jessica)',
    description: '250g Pesce Bianco (Orata, Merluzzo, Spigola) + 300g Verdure + 30g Pane + 10g Olio.',
    ingredients: [
      { name: 'Pesce Bianco / Merluzzo', amount: 250, unit: 'g' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 30, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'd_uova_m',
    name: 'Uova (Michael)',
    description: '3 Uova + 300g Verdure + 50g Pane + 10g Olio.',
    ingredients: [
      { name: 'Uova', amount: 3, unit: 'pz' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 50, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Michael'],
  },
  {
    id: 'd_uova_j',
    name: 'Uova (Jessica)',
    description: '2 Uova + 300g Verdure + 30g Pane + 10g Olio.',
    ingredients: [
      { name: 'Uova', amount: 2, unit: 'pz' },
      { name: 'Verdura di Stagione', amount: 300, unit: 'g' },
      { name: 'Pane', amount: 30, unit: 'g' },
      { name: 'Olio EVO', amount: 10, unit: 'g' }
    ],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Jessica'],
  },
  {
    id: 'd2',
    name: 'Social / Pasto Libero (Controllato)',
    description: 'Cena fuori? Niente alcool/aperitivo. Primo semplice o Secondo di carne magra.',
    ingredients: [],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Michael', 'Jessica'],
  },

  // MERENDA
  {
    id: 'spm_frutta',
    name: 'Frutta Fresca',
    description: '200g Frutta Fresca di stagione',
    ingredients: [
      { name: 'Frutta di Stagione', amount: 200, unit: 'g' }
    ],
    type: 'snack_pm',
    condition: 'always',
    season: 'always',
    owners: ['Michael', 'Jessica'],
  },
  {
    id: 'spm_yogurt',
    name: 'Yogurt Greco',
    description: '150g Yogurt Greco Magro',
    ingredients: [
      { name: 'Yogurt Greco Magro', amount: 150, unit: 'g' }
    ],
    type: 'snack_pm',
    condition: 'always',
    season: 'always',
    owners: ['Michael', 'Jessica'],
  },

  // SPECIALS
  {
    id: 'l_suoceri',
    name: 'Pranzo dai Suoceri 🏠',
    description: 'Gestisci le porzioni: preferisci proteine e verdure, evita bis e salse pesanti.',
    ingredients: [],
    type: 'lunch',
    condition: 'always',
    season: 'always',
    owners: ['Michael', 'Jessica'],
  },
  {
    id: 'd_amici',
    name: 'Uscita con Amici 🍻',
    description: 'Scegli opzioni magre, evita fritti e salse. Max 1 calice di vino.',
    ingredients: [],
    type: 'dinner',
    condition: 'always',
    season: 'always',
    owners: ['Michael', 'Jessica'],
  },
];

export function generateLocalPlan(sourceGuidelines?: MealOption[]): WeeklyPlan {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const plan: WeeklyPlan = {};
  const currentSeason = getCurrentSeason();
  const pool = sourceGuidelines || GUIDELINES;

  const shuffledDays = [...days].sort(() => 0.5 - Math.random());
  const trainingDays = new Set(shuffledDays.slice(0, 3));

  days.forEach(day => {
    const isTraining = trainingDays.has(day);

    const pick = (type: string, forceId?: string) => {
      if (forceId) {
        // Verify forceId exists in pool
        const exists = pool.find(g => g.id === forceId);
        if (exists) return forceId;
      }
      const opts = pool.filter(g =>
        g.type === type &&
        (g.condition === 'always' || (isTraining ? g.condition === 'training' : g.condition === 'rest')) &&
        (g.season === 'always' || g.season === currentSeason)
      );
      if (opts.length === 0) {
        const fallback = pool.filter(g => g.type === type && g.season === 'always');
        return fallback.length > 0 ? fallback[0].id : '';
      }
      return opts[Math.floor(Math.random() * opts.length)].id;
    };


    let forcedLunch = undefined;
    let forcedDinner = undefined;

    if (day === 'Saturday' || day === 'Sunday') forcedLunch = 'l_suoceri';
    if (day === 'Saturday') forcedDinner = 'd_amici';

    plan[day] = {
      training: isTraining,
      breakfast: pick('breakfast'),
      snack_am: pick('snack_am'),
      lunch: pick('lunch', forcedLunch),
      snack_pm: pick('snack_pm'),
      dinner: pick('dinner', forcedDinner),
    };
  });

  return plan;
}

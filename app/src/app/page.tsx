export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getData } from "@/lib/data";
import { getUserSession, loginAction } from "@/lib/actions";
import { GUIDELINES } from '@/lib/guidelines';
import { ENGLISH_DAYS } from '@/lib/constants';
import NextMealCard from "@/components/dashboard/NextMealCard";
import QuickActions from "@/components/dashboard/QuickActions";
import PrepWidget from "@/components/dashboard/PrepWidget";
import { ChevronRight } from 'lucide-react';

export default async function ControlCenter() {
  const session = await getUserSession();
  const data = await getData();

  // Redirect/Login Logic (Same as before)
  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '2rem', background: '#0f172a', color: 'white' }}>
        <h1 className="title" style={{ fontSize: '2rem' }}>Chi sta usando questo dispositivo?</h1>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <form action={async () => { 'use server'; await loginAction('Michael'); }}>
            <button className="btn" style={{ fontSize: '1.5rem', padding: '2rem' }}>👨‍💻 Michael</button>
          </form>
          <form action={async () => { 'use server'; await loginAction('Jessica'); }}>
            <button className="btn" style={{ fontSize: '1.5rem', padding: '2rem', background: '#ec4899' }}>👩‍🦰 Jessica</button>
          </form>
        </div>
      </div>
    );
  }

  const currentUser = session;
  const userRole = session as 'Michael' | 'Jessica';
  const activeUser = data.users[userRole];

  if (!activeUser || !activeUser.plan) {
    return <div>Errore caricamento profilo utente. Riprova.</div>;
  }

  const waterGlasses = activeUser.waterGlasses || 0;

  // --- LOGIC: NEXT MEAL & PREP ---
  const now = new Date();
  const currentHour = now.getHours();
  const dayIndex = now.getDay();
  const todayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const today = ENGLISH_DAYS[todayIndex];
  const todayPlan = activeUser.plan[today];

  const tomorrowIndex = (todayIndex + 1) % 7;
  const tomorrow = ENGLISH_DAYS[tomorrowIndex];
  const tomorrowPlan = activeUser.plan[tomorrow];

  const getMeal = (id: string) => GUIDELINES.find(g => g.id === id);

  // Determine Next Meal
  let nextMealType = 'Cena';
  let nextMealId = todayPlan?.dinner;

  if (currentHour < 10) {
    nextMealType = 'Colazione'; nextMealId = todayPlan?.breakfast;
  } else if (currentHour < 12) {
    nextMealType = 'Spuntino Mattina'; nextMealId = todayPlan?.snack_am;
  } else if (currentHour < 15) {
    nextMealType = 'Pranzo'; nextMealId = todayPlan?.lunch;
  } else if (currentHour < 19) {
    nextMealType = 'Merenda'; nextMealId = todayPlan?.snack_pm;
  }
  // After 19: Keep Cena as default until midnight loop? Or show tomorrow breakfast? 
  // For simplicity: after 21 show Tomorrow Breakfast? 
  if (currentHour >= 22) {
    nextMealType = 'Colazione (Domani)';
    nextMealId = tomorrowPlan?.breakfast;
  }

  const nextMeal = nextMealId ? getMeal(nextMealId) : null;


  // Determine Prep
  // 1. Dinner overlaps Lunch tomorrow?
  const dinnerId = todayPlan?.dinner;
  const tomorrowLunchId = tomorrowPlan?.lunch;
  const cookingDouble = dinnerId && tomorrowLunchId && dinnerId === tomorrowLunchId;
  const tomorrowLunchMeal = tomorrowLunchId ? getMeal(tomorrowLunchId) : null;

  // 2. Explicit Prep Instructions for tomorrow lunch
  const prepInstructions = tomorrowPlan?.lunch_details?.prepInstructions;

  let prepMessage = null;
  if (cookingDouble) {
    prepMessage = `Cucina x2 stasera! Lo mangerai anche domani a pranzo (${tomorrowLunchMeal?.name}).`;
  } else if (prepInstructions && currentHour > 14) { // Show prep instructions only in afternoon/evening
    prepMessage = prepInstructions;
  }


  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>

      {/* HEADER */}
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', opacity: 0.7 }}>Tutto sotto controllo</div>
          <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>Ciao, {currentUser}</h1>
        </div>
        {/* Profile Link Mini */}
        <Link href="/profile" style={{
          width: '40px', height: '40px', borderRadius: '50%', background: '#334155',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👤</span>
        </Link>
      </header>

      {/* QUICK ACTIONS */}
      {/* Placed prominently for easy daily access */}
      <section>
        <h3 style={{ fontSize: '1rem', opacity: 0.6, marginBottom: '10px', textTransform: 'uppercase' }}>Azioni Rapide</h3>
        <QuickActions waterCount={waterGlasses} />
      </section>

      {/* NEXT MEAL */}
      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', opacity: 0.6, marginBottom: '10px', textTransform: 'uppercase' }}>Ora di Mangiare</h3>
        <NextMealCard meal={nextMeal} type={nextMealType} time={nextMealType === 'Colazione' ? '08:00' : '...'} />
      </section>

      {/* PREP WIDGET */}
      {prepMessage && (
        <section style={{ marginBottom: '2rem' }}>
          <PrepWidget prepInstructions={prepMessage} tomLunchName={tomorrowLunchMeal?.name} />
        </section>
      )}

      {/* LINK TO FULL PLAN */}
      <Link href="/plan" style={{ textDecoration: 'none' }}>
        <div className="card btn-press" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem', background: '#1e293b', border: '1px solid #334155'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white' }}>Vedi Piano Completo</div>
            <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Controlla tutti i pasti di oggi e domani</div>
          </div>
          <ChevronRight color="#94a3b8" />
        </div>
      </Link>

    </div>
  );
}

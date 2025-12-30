export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getData, updateAutoRoutineDate } from "@/lib/data";
import { smartSyncOffersAction, generateBothPlansAction } from "@/lib/ai";
import PlannerEditor from "@/components/PlannerEditor";
import { Utensils, User, Users, Wand2, History as HistoryIcon, LogOut } from "lucide-react";
import { DAYS_MAP, ENGLISH_DAYS } from '@/lib/constants';
import { getPieceLabel } from '@/lib/conversions';
import RecipeCard from '@/components/RecipeCard';
import { GUIDELINES } from '@/lib/guidelines';
import { getUserSession, loginAction, logoutAction } from "@/lib/actions";

export default async function Home() {
  const session = await getUserSession();
  const data = await getData();

  // If no session, show Login
  if (!session) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f172a',
        color: 'white',
        flexDirection: 'column',
        gap: '2rem'
      }}>
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

  const currentWeight = activeUser.currentWeight;
  const waterGlasses = activeUser.waterGlasses || 0;

  // Date Logic
  const now = new Date();
  const currentHour = now.getHours();
  const dayIndex = now.getDay(); // 0=Sun, 1=Mon...
  const todayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // 0=Mon, 6=Sun
  const today = ENGLISH_DAYS[todayIndex];
  const todayPlan = activeUser.plan[today];

  // Tomorrow Logic
  const tomorrowIndex = (todayIndex + 1) % 7;
  const tomorrow = ENGLISH_DAYS[tomorrowIndex];
  const tomorrowPlan = activeUser.plan[tomorrow];

  const getMeal = (id: string) => GUIDELINES.find(g => g.id === id);

  // LOGIC: Meal Prep Assistant
  // Check if Dinner Today == Lunch Tomorrow -> "Cook x2"
  const dinnerId = todayPlan?.dinner;
  const tomorrowLunchId = tomorrowPlan?.lunch;
  const shouldCookDouble = dinnerId && tomorrowLunchId && dinnerId === tomorrowLunchId;
  const tomorrowLunchMeal = tomorrowLunchId ? getMeal(tomorrowLunchId) : null;

  // LOGIC: Next Meal
  // Simple time-based heuristic
  let nextMealType = 'Cena';
  let nextMealId = todayPlan?.dinner;
  let nextMealDetails = todayPlan?.dinner_details;

  if (currentHour < 10) {
    nextMealType = 'Colazione'; nextMealId = todayPlan?.breakfast; nextMealDetails = todayPlan?.breakfast_details;
  } else if (currentHour < 12) {
    nextMealType = 'Spuntino Mattina'; nextMealId = todayPlan?.snack_am; nextMealDetails = todayPlan?.snack_am_details;
  } else if (currentHour < 15) {
    nextMealType = 'Pranzo'; nextMealId = todayPlan?.lunch; nextMealDetails = todayPlan?.lunch_details;
  } else if (currentHour < 19) {
    nextMealType = 'Merenda'; nextMealId = todayPlan?.snack_pm; nextMealDetails = todayPlan?.snack_pm_details;
  }

  const nextMeal = nextMealId ? getMeal(nextMealId) : null;


  // SATURDAY AUTOMATION CHECK
  let autoRoutineRan = false;
  const isSaturday = dayIndex === 6;
  const todayStr = now.toISOString().split('T')[0];

  if (isSaturday && data.lastAutoRoutine !== todayStr) {
    console.log('✨ TRIGGERING SATURDAY ROUTINE...');
    await smartSyncOffersAction();
    await generateBothPlansAction();
    await updateAutoRoutineDate();
    autoRoutineRan = true;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
      {autoRoutineRan && (
        <div style={{ background: '#22c55e', color: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
          ✨ Routine del Sabato Completata!
        </div>
      )}

      {/* HEADER: Dynamic Greeting */}
      <header className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.9rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>{DAYS_MAP[today]}</div>
          <h1 className="title" style={{ margin: 0, fontSize: '1.8rem' }}>Ciao, {currentUser} 👋</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/profile" className="btn-icon" style={{ background: '#334155', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="white" />
          </Link>
          <form action={async () => { 'use server'; await logoutAction(); }}>
            <button className="btn-icon" style={{ background: '#334155', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
              <LogOut size={20} color="white" />
            </button>
          </form>
        </div>
      </header>

      {/* SMART WIDGETS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>

        {/* WIDGET 1: Water Tracker */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: 1 }}>{waterGlasses}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '0.5rem' }}>Bicchieri d'Acqua</div>
          <form action={async () => { 'use server'; await import("@/lib/data").then(m => m.addWaterGlass()); }}>
            <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer', fontSize: '0.9rem' }}>
              + Aggiungi
            </button>
          </form>
        </div>

        {/* WIDGET 2: Up Next */}
        <div className="card" style={{ border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Prossimo Pasto</div>
          {nextMeal ? (
            <>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1.2, marginBottom: '5px' }}>{nextMeal.name}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{nextMealType}</div>
            </>
          ) : (
            <div style={{ opacity: 0.5 }}>Tutto fatto per oggi!</div>
          )}
        </div>

      </div>

      {/* MEAL PREP ALERT (Conditional) */}
      {shouldCookDouble && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ fontSize: '2rem' }}>👨‍🍳</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Cucina X 2 Stasera!</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>Domani a pranzo hai lo stesso piatto: <b>{tomorrowLunchMeal?.name}</b>.</div>
          </div>
        </div>
      )}

      {/* TOMORROW PREP (AI Suggestion) */}
      {!shouldCookDouble && tomorrowLunchMeal && tomorrowPlan?.lunch_details?.prepInstructions && (
        <div className="card" style={{ background: '#334155', color: '#e2e8f0', border: 'none', marginBottom: '20px', borderLeft: '4px solid #a855f7' }}>
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wand2 size={16} color="#a855f7" /> Prep per Domani
          </div>
          <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>
            {tomorrowPlan.lunch_details.prepInstructions}
          </div>
        </div>
      )}


      {/* TODAY'S FULL PLAN */}
      <h2 className="title" style={{ marginTop: '30px', marginBottom: '15px', fontSize: '1.3rem' }}>Programma di Oggi</h2>

      {todayPlan ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {[
            { id: todayPlan.breakfast, details: todayPlan.breakfast_details, type: 'Colazione', key: 'breakfast', time: '08:00' },
            { id: todayPlan.snack_am, details: todayPlan.snack_am_details, type: 'Spuntino', key: 'snack_am', time: '11:00' },
            { id: todayPlan.lunch, details: todayPlan.lunch_details, type: 'Pranzo', key: 'lunch', time: '13:00' },
            { id: todayPlan.snack_pm, details: todayPlan.snack_pm_details, type: 'Merenda', key: 'snack_pm', time: '17:00' },
            { id: todayPlan.dinner, details: todayPlan.dinner_details, type: 'Cena', key: 'dinner', time: '20:00' }
          ].map((item, idx) => {
            const meal = getMeal(item.id);
            if (!meal) return null;
            const isDone = item.details?.eaten;

            return (
              <div key={idx} className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: isDone ? 0.6 : 1, filter: isDone ? 'grayscale(0.5)' : 'none' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{item.time}</span>
                    <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>{item.type}</span>
                  </div>
                  {isDone && <span style={{ fontSize: '1.2rem' }}>✅</span>}
                </div>

                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.details?.name || meal.name}</div>

                {meal.description && (
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{meal.description}</div>
                )}

                {/* Tags/Specifics */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                  {item.details?.specificFruit && <span className="tag-fruit">🍎 {item.details.specificFruit}</span>}
                  {item.details?.specificVeg && <span className="tag-veg">🥦 {item.details.specificVeg}</span>}
                  {item.details?.specificProtein && <span className="tag-protein">🥩 {item.details.specificProtein}</span>}
                  {item.details?.specificCarb && <span className="tag-carb">🥖 {item.details.specificCarb}</span>}
                </div>

                {/* Actions */}
                <RecipeCard
                  mealName={item.details?.name || meal.name}
                  description={meal.description}
                  user={userRole}
                  recipeUrl={item.details?.recipeUrl}
                  imageUrl={item.details?.imageUrl}
                  eaten={item.details?.eaten}
                  rating={item.details?.rating}
                  day={today}
                  type={item.key}
                  specificProtein={item.details?.specificProtein}
                  compact={true} // Hint to RecipeCard to be smaller if possible, or just default behavior
                />

              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <p>Nessun piano per oggi.</p>
          <Link href="/planner" className="btn btn-primary">Crea Piano</Link>
        </div>
      )}

      {/* Quick Links Footer */}
      <div style={{ marginTop: '40px', display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
        <Link href="/shopping" className="btn" style={{ background: '#334155', minWidth: '120px', justifyContent: 'center' }}>🛒 Spesa</Link>
        <Link href="/tracker" className="btn" style={{ background: '#334155', minWidth: '120px', justifyContent: 'center' }}>⚖️ Peso</Link>
        <Link href="/planner" className="btn" style={{ background: '#334155', minWidth: '120px', justifyContent: 'center' }}>📅 Calendario</Link>
      </div>

    </div>
  );
}

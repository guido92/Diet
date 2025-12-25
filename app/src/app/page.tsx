import Link from "next/link";
import { getData, updateAutoRoutineDate } from "@/lib/data";
import { smartSyncOffersAction, generateBothPlansAction } from "@/lib/ai";
import PlannerEditor from "@/components/PlannerEditor";
import { Utensils, User, Users, Wand2, History as HistoryIcon } from "lucide-react";
import { DAYS_MAP, ENGLISH_DAYS } from '@/lib/constants';
import { getPieceLabel } from '@/lib/conversions';
import RecipeCard from '@/components/RecipeCard';
import { GUIDELINES } from '@/lib/guidelines';

export default async function Home() {
  const data = await getData();
  const currentUser = data.currentUser;
  const userRole = data.currentUser;
  const plan = data.users[userRole].plan || {};
  const activeOffers = data.activeOffers || [];

  const activeUser = data.users[userRole];
  const startWeight = activeUser.startWeight;
  const currentWeight = activeUser.currentWeight;
  const lost = (startWeight - currentWeight).toFixed(1);

  const getMeal = (id: string) => GUIDELINES.find(g => g.id === id);

  // SATURDAY AUTOMATION CHECK
  let autoRoutineRan = false;
  const today = new Date();
  const isSaturday = today.getDay() === 6;
  const todayStr = today.toISOString().split('T')[0];

  if (isSaturday && data.lastAutoRoutine !== todayStr) {
    console.log('✨ TRIGGERING SATURDAY ROUTINE...');
    // 1. Sync Offers
    await smartSyncOffersAction();
    // 2. Generate Plans
    await generateBothPlansAction();
    // 3. Mark as Done
    await updateAutoRoutineDate();
    autoRoutineRan = true;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      {autoRoutineRan && (
        <div style={{ background: '#22c55e', color: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
          ✨ Routine del Sabato Completata: Volantini Sincronizzati e Piani Generati!
        </div>
      )}

      {/* HEADER */}
      <header className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Utensils size={32} color="#22c55e" />
          Diet Planner <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>v2.2 AI</span>
        </h1>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/history" className="btn" style={{ background: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HistoryIcon size={18} /> Storico
          </Link>
          <Link href="/noi" className="btn" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #ec4899 100%)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> Noi
          </Link>
        </div>
      </header>

      <div className="grid">
        {/* Progress Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
          <h3 style={{ color: 'white', opacity: 0.9 }}>Obiettivo Peso (kg)</h3>
          <div className="flex-between" style={{ marginTop: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{currentWeight}</span>
              <span style={{ fontSize: '1rem', opacity: 0.8 }}> kg</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Persi</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>-{lost} kg</div>
            </div>
          </div>
        </div>

        {/* Today's Plan */}
        <h2 className="title">Oggi ({DAYS_MAP[today]})</h2>
        {todayPlan ? (
          <div className="card">
            {[
              { id: todayPlan.breakfast, details: todayPlan.breakfast_details, type: 'Colazione', key: 'breakfast' },
              { id: todayPlan.snack_am, details: todayPlan.snack_am_details, type: 'Spuntino', key: 'snack_am' },
              { id: todayPlan.lunch, details: todayPlan.lunch_details, type: 'Pranzo', key: 'lunch' },
              { id: todayPlan.snack_pm, details: todayPlan.snack_pm_details, type: 'Merenda', key: 'snack_pm' },
              { id: todayPlan.dinner, details: todayPlan.dinner_details, type: 'Cena', key: 'dinner' }
            ].map((item, idx) => {
              const meal = getMeal(item.id);
              if (!meal) return null;
              return (
                <div key={idx} className="plan-item" style={{ marginBottom: '16px', borderBottom: idx < 4 ? '1px solid #334155' : 'none', paddingBottom: '12px' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="subtitle" style={{ fontSize: '0.8rem', margin: 0 }}>{item.type}</div>
                    {(item.details?.eaten) && <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 'bold' }}>COMPLETATO ✔️</span>}
                  </div>

                  <div style={{ fontWeight: 600, opacity: item.details?.eaten ? 0.6 : 1 }}>{meal.name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8', opacity: item.details?.eaten ? 0.6 : 1 }}>{meal.description}</div>

                  {/* Specifics Display */}
                  {(item.details?.specificFruit || item.details?.specificVeg) && (
                    <div style={{ marginTop: '4px', display: 'flex', gap: '5px' }}>
                      {item.details.specificFruit && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(132, 204, 22, 0.15)', color: '#a3e635', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(132, 204, 22, 0.3)' }}>
                          🍎 {item.details.specificFruit} {(() => {
                            const fruitIng = meal?.ingredients.find(i => i.name === 'Frutta di Stagione');
                            return fruitIng ? getPieceLabel(item.details.specificFruit!, fruitIng.amount) : '';
                          })()}
                        </span>
                      )}
                      {item.details.specificVeg && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                          🥦 {item.details.specificVeg} {(() => {
                            const vegIng = meal?.ingredients.find(i => i.name.includes('Verdura'));
                            return vegIng ? getPieceLabel(item.details.specificVeg!, vegIng.amount) : '';
                          })()}
                        </span>
                      )}
                      {item.details.specificVeg && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                          🥦 {item.details.specificVeg} {(() => {
                            const vegIng = meal?.ingredients.find(i => i.name.includes('Verdura'));
                            return vegIng ? getPieceLabel(item.details.specificVeg!, vegIng.amount) : '';
                          })()}
                        </span>
                      )}
                      {item.details.specificProtein && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          🐟/🥩 {item.details.specificProtein}
                        </span>
                      )}
                      {item.details.specificCarb && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          🥖/🥔 {item.details.specificCarb}
                        </span>
                      )}
                    </div>
                  )}

                  <RecipeCard
                    mealName={item.details?.name || meal.name}
                    description={meal.description}
                    user={data.currentUser as 'Michael' | 'Jessica'}
                    recipeUrl={item.details?.recipeUrl}
                    imageUrl={item.details?.imageUrl}
                    eaten={item.details?.eaten}
                    rating={item.details?.rating}
                    day={today}
                    type={item.key}
                    specificProtein={item.details?.specificProtein}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <p style={{ marginBottom: '1rem' }}>Non hai ancora pianificato la giornata di oggi.</p>
            <Link href="/planner" className="btn btn-primary">
              Vai al Piano
            </Link>
          </div>
        )}

        <div className="card">
          <h3 className="title" style={{ fontSize: '1.2rem' }}>Utility</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="/shopping" className="btn" style={{ background: '#334155', color: 'white' }}>
              🛒 Lista Spesa
            </Link>
            <Link href="/tracker" className="btn" style={{ background: '#334155', color: 'white' }}>
              ⚖️ Aggiorna Peso
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

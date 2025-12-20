import { getData, AppData } from '@/lib/data';
import { GUIDELINES } from '@/lib/guidelines';
import Link from 'next/link';
import RecipeCard from '@/components/RecipeCard';
import UserSwitcher from '@/components/UserSwitcher';
import { DAYS_MAP, ENGLISH_DAYS } from '@/lib/constants';
import { getPieceLabel } from '@/lib/conversions';

export default async function Home() {
  const data: AppData = await getData();
  // ENGLISH_DAYS is Mon-Sun (0-6).
  // getDay() is Sun=0, Mon=1...
  // So Monday(1) -> Index 0. Sunday(0) -> Index 6.
  const dayIndex = new Date().getDay();
  const todayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const today = ENGLISH_DAYS[todayIndex];

  const activeUser = data.users[data.currentUser];
  const todayPlan = activeUser.plan[today];

  const getMeal = (id: string) => GUIDELINES.find(g => g.id === id);

  const startWeight = activeUser.startWeight;
  const currentWeight = activeUser.currentWeight;
  const lost = (startWeight - currentWeight).toFixed(1);

  return (
    <div style={{ paddingTop: '2rem' }}>
      <UserSwitcher currentUser={data.currentUser} />

      <header style={{ marginBottom: '2rem' }}>
        <h1 className="title" style={{ fontSize: '2rem' }}>Ciao {data.currentUser}! 👋</h1>
        <p className="subtitle">Continua così, sei sulla strada giusta.</p>
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

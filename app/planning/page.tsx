'use client';

/**
 * PAGINA: Planning Calendario
 * * PERCORSO: /app/planning/page.tsx
 * URL: https://reping.app/planning
 * * DESCRIZIONE:
 * Vista calendario mensile per gestire i piani di visita giornalieri.
 * Mostra i piani esistenti e permette di crearne di nuovi.
 * * FUNZIONALITÀ:
 * - Calendario mese corrente
 * - Lista piani esistenti
 * - Indicatori status per ogni giorno
 * - Navigazione a editor piano giornaliero
 * - Filtro per mese (prev/next)
 * - Blocco date passate (sola lettura)
 */

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDrawers, DrawersWithBackdrop } from '@/components/Drawers';
import TopBar from '@/components/home/TopBar';
import { supabase } from '@/lib/supabase/client';

type DailyPlan = {
  id: string;
  data: string; // formato YYYY-MM-DD
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  account_ids: string[];
  notes: string | null;
};

export default function PlanningPage() {
  const router = useRouter();
  const { leftOpen, rightOpen, rightContent, openLeft, closeLeft, openDati, openDocs, openImpostazioni, closeRight } = useDrawers();

  async function logout() {
    try { sessionStorage.removeItem("repping:pph"); } catch {}
    try { localStorage.removeItem("repping:pph"); } catch {}
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Stato
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Carica piani del mese corrente
  useEffect(() => {
    loadPlans();
  }, [currentMonth]);

  async function loadPlans() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Calcola primo e ultimo giorno del mese
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const firstDayStr = firstDay.toISOString().split('T')[0];
      const lastDayStr = lastDay.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_plans')
        .select('id, data, status, account_ids, notes')
        .eq('user_id', user.id)
        .gte('data', firstDayStr)
        .lte('data', lastDayStr)
        .order('data', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (e: any) {
      console.error('Errore caricamento piani:', e);
      alert(`Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Genera giorni del mese per il calendario
  function getCalendarDays() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    
    // Giorni del mese precedente per riempire la prima settimana
    const firstDayOfWeek = firstDay.getDay(); // 0 = domenica, 1 = lunedì, ...
    const startDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // lunedì = 0
    
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevDate = new Date(year, month, -i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Giorni del mese corrente
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    
    // Giorni del mese successivo per riempire l'ultima settimana
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextDate = new Date(year, month + 1, i);
        days.push({ date: nextDate, isCurrentMonth: false });
      }
    }
    
    return days;
  }

  // Ottieni giorni della settimana corrente
  function getCurrentWeekDays() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = domenica
    const monday = new Date(today);
    
    // Calcola lunedì della settimana corrente
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(today.getDate() + diff);
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      weekDays.push(day);
    }
    
    return weekDays;
  }

  // Trova piano per una data
  function getPlanForDate(date: Date): DailyPlan | undefined {
    const dateStr = date.toISOString().split('T')[0];
    return plans.find(p => p.data === dateStr);
  }

  // Badge status
  function getStatusBadge(status: string) {
    const badges = {
      draft: { emoji: '📝', label: 'Bozza', color: '#9ca3af' },
      active: { emoji: '▶️', label: 'Attivo', color: '#3b82f6' },
      completed: { emoji: '✅', label: 'Completato', color: '#10b981' },
      cancelled: { emoji: '❌', label: 'Annullato', color: '#ef4444' },
    };
    return badges[status as keyof typeof badges] || badges.draft;
  }

  // Vai al mese precedente
  function prevMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  // Vai al mese successivo
  function nextMonth() {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  // Vai a oggi
  function goToToday() {
    setCurrentMonth(new Date());
  }

  // Formatta mese
  function formatMonth(date: Date) {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Click su un giorno
  function handleDayClick(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 🔒 Controllo: non permettere modifiche nel passato
    if (dateStr < todayStr) {
      // Cerca se c'è un piano esistente per quella data
      const plan = getPlanForDate(date);
      
      if (!plan) {
        alert('⛔ Non puoi creare piani per date passate.');
        return;
      }
      
      // Se c'è un piano, permetti di vederlo ma avvisa che è storico
      // (La logica di readonly sarà gestita all'interno della pagina del piano se necessario, 
      // ma qui permettiamo l'accesso per consultazione/report)
    }
    
    router.push(`/planning/${dateStr}`);
  }

  const calendarDays = getCalendarDays();
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <TopBar
          title="📅 Planning Visite"
          onOpenLeft={openLeft}
          onOpenDati={openDati}
          onOpenDocs={openDocs}
          onOpenImpostazioni={openImpostazioni}
          onLogout={logout}
        />
      </div>

      <DrawersWithBackdrop
        leftOpen={leftOpen}
        onCloseLeft={closeLeft}
        rightOpen={rightOpen}
        rightContent={rightContent}
        onCloseRight={closeRight}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 24px 24px' }}>
        {/* Header con navigazione mese */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
              {formatMonth(currentMonth)}
            </h1>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={prevMonth}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                ← Mese Prec.
              </button>
              
              <button
                onClick={goToToday}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                📍 Oggi
              </button>
              
              <button
                onClick={nextMonth}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Mese Succ. →
              </button>
            </div>
          </div>

          <p style={{ color: '#6b7280', fontSize: 14 }}>
            Click su un giorno per pianificare o modificare le visite
          </p>
        </div>

        {/* Legenda status */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span>📝</span>
            <span style={{ color: '#6b7280' }}>Bozza</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span>▶️</span>
            <span style={{ color: '#6b7280' }}>Attivo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span>✅</span>
            <span style={{ color: '#6b7280' }}>Completato</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span>⚪</span>
            <span style={{ color: '#6b7280' }}>Nessun piano</span>
          </div>
        </div>

        {/* Tabs Vista */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
          <button
            onClick={() => setViewMode('month')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
              color: viewMode === 'month' ? '#2563eb' : '#6b7280',
              borderBottom: viewMode === 'month' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -2,
            }}
          >
            📅 Vista Mese
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
              color: viewMode === 'week' ? '#2563eb' : '#6b7280',
              borderBottom: viewMode === 'week' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -2,
            }}
          >
            📊 Vista Settimana
          </button>
        </div>

        {/* Calendario */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            ⏳ Caricamento piani...
          </div>
        ) : viewMode === 'month' ? (
          /* VISTA MESE */
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* Header giorni settimana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} style={{ padding: 12, textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Giorni del mese */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {calendarDays.map((day, idx) => {
                const plan = getPlanForDate(day.date);
                const isToday = day.date.toISOString().split('T')[0] === today;
                const dateStr = day.date.toISOString().split('T')[0];
                const isPast = dateStr < today;
                
                return (
                  <div
                    key={idx}
                    onClick={() => day.isCurrentMonth && handleDayClick(day.date)}
                    style={{
                      minHeight: 100,
                      padding: 8,
                      borderRight: (idx + 1) % 7 !== 0 ? '1px solid #e5e7eb' : 'none',
                      borderBottom: idx < calendarDays.length - 7 ? '1px solid #e5e7eb' : 'none',
                      cursor: day.isCurrentMonth ? 'pointer' : 'default',
                      background: isToday ? '#eff6ff' : (isPast && day.isCurrentMonth ? '#f9fafb' : 'white'),
                      opacity: day.isCurrentMonth ? 1 : 0.4,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (day.isCurrentMonth) {
                        e.currentTarget.style.background = isToday ? '#dbeafe' : '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (day.isCurrentMonth) {
                        e.currentTarget.style.background = isToday ? '#eff6ff' : (isPast ? '#f9fafb' : 'white');
                      }
                    }}
                  >
                    {/* Numero giorno */}
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: isToday ? 700 : 500, 
                      color: isToday ? '#2563eb' : (day.isCurrentMonth ? (isPast ? '#6b7280' : '#111827') : '#9ca3af'),
                      marginBottom: 4,
                    }}>
                      {day.date.getDate()}
                    </div>

                    {/* Indicatore piano */}
                    {plan && day.isCurrentMonth && (
                      <div style={{ fontSize: 11 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <span>{getStatusBadge(plan.status).emoji}</span>
                          <span style={{ fontWeight: 500, color: '#374151' }}>
                            {plan.account_ids?.length || 0} visite
                          </span>
                        </div>
                        {plan.notes && (
                          <div style={{ 
                            fontSize: 10, 
                            color: '#6b7280', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            marginTop: 2,
                          }}>
                            {plan.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Indicatore nessun piano */}
                    {!plan && day.isCurrentMonth && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        {isPast ? '' : '⚪ Pianifica'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VISTA SETTIMANA */
          <div>
            <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 600, color: '#374151' }}>
              Settimana {getCurrentWeekDays()[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - {getCurrentWeekDays()[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {getCurrentWeekDays().map((date) => {
                const dateStr = date.toISOString().split('T')[0];
                const plan = getPlanForDate(date);
                const isToday = dateStr === today;
                const isPast = dateStr < today;
                const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDayClick(date)}
                    style={{
                      padding: 20,
                      background: isToday ? '#eff6ff' : (isPast ? '#f9fafb' : 'white'),
                      borderRadius: 12,
                      border: isToday ? '2px solid #2563eb' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: isPast && !plan ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: isToday ? '#2563eb' : '#111827', marginBottom: 4 }}>
                          {dayNames[date.getDay()]} {date.getDate()}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          {date.toLocaleDateString('it-IT', { month: 'long' })}
                        </div>
                      </div>

                      {plan && (
                        <div style={{ 
                          padding: '4px 12px', 
                          borderRadius: 6, 
                          background: getStatusBadge(plan.status).color + '20',
                          fontSize: 13,
                          fontWeight: 600,
                        }}>
                          {getStatusBadge(plan.status).emoji} {getStatusBadge(plan.status).label}
                        </div>
                      )}
                    </div>

                    {plan ? (
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                          📍 {plan.account_ids?.length || 0} {plan.account_ids?.length === 1 ? 'visita' : 'visite'}
                        </div>
                        {plan.notes && (
                          <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                            "{plan.notes}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, color: '#9ca3af' }}>
                        {isPast ? 'Nessun piano registrato' : <>Nessun piano • <span style={{ color: '#2563eb', fontWeight: 500 }}>Clicca per pianificare</span></>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary Settimana */}
            <div style={{ marginTop: 32, padding: 24, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📊 Summary Settimana</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                    {getCurrentWeekDays().reduce((sum, date) => {
                      const plan = getPlanForDate(date);
                      return sum + (plan?.account_ids?.length || 0);
                    }, 0)}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Visite Pianificate</div>
                </div>

                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
                    {getCurrentWeekDays().reduce((sum, date) => {
                      const plan = getPlanForDate(date);
                      return sum + (plan?.status === 'completed' ? plan.account_ids?.length || 0 : 0);
                    }, 0)}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Visite Completate</div>
                </div>

                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>
                    {getCurrentWeekDays().filter(date => getPlanForDate(date)).length}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Giorni con Piano</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Riepilogo piani del mese */}
        {!loading && plans.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>📊 Riepilogo Mese</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                  {plans.length}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>Piani totali</div>
              </div>

              <div style={{ padding: 16, background: '#dbeafe', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>
                  {plans.filter(p => p.status === 'active').length}
                </div>
                <div style={{ fontSize: 13, color: '#1e40af' }}>Attivi</div>
              </div>

              <div style={{ padding: 16, background: '#dcfce7', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>
                  {plans.filter(p => p.status === 'completed').length}
                </div>
                <div style={{ fontSize: 13, color: '#15803d' }}>Completati</div>
              </div>

              <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>
                  {plans.reduce((sum, p) => sum + (p.account_ids?.length || 0), 0)}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>Visite pianificate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

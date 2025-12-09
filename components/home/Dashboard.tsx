/**
 * ============================================================================
 * COMPONENTE: HomeDashboard
 * ============================================================================
 * 
 * Dashboard riepilogativa per la home page.
 * Mostra KPI giornalieri, azioni rapide, e riepilogo attività recenti.
 * 
 * ============================================================================
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import GettingStartedChecklist from './GettingStartedChecklist';
import { fetchPromemoria } from '@/lib/promemoria';

type DashboardStats = {
  visiteOggi: number;
  visiteMese: number;
  chiamateOggi: number;
  chiamateMese: number;
  venduteOggi: number;
  venduteMese: number;
  clientiTotali: number;
  nuoviClientiMese: number;
  promemoriaCount: number;
  ultimaAttivita: { tipo: string; cliente: string; data: string } | null;
};

type MonthlyStats = {
  month: number;
  year: number;
  label: string;
  visite: number;
  chiamate: number;
  vendite: number;
  nuoviClienti: number;
};

type RecentActivity = {
  id: string;
  tipo: 'visita' | 'chiamata';
  cliente_nome: string;
  data_visita: string;
  esito: string;
  importo_vendita: number | null;
};

export default function HomeDashboard({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    visiteOggi: 0,
    visiteMese: 0,
    chiamateOggi: 0,
    chiamateMese: 0,
    venduteOggi: 0,
    venduteMese: 0,
    clientiTotali: 0,
    nuoviClientiMese: 0,
    promemoriaCount: 0,
    ultimaAttivita: null,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  
  // Storico mesi
  const [showMonthHistory, setShowMonthHistory] = useState(false);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyStats[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);
  
  // Nome mese corrente dinamico (es. "Dicembre 2025")
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase()); // Prima lettera maiuscola
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Date per filtri
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Carica visite
      const { data: visits } = await supabase
        .from('visits')
        .select('id, tipo, data_visita, esito, importo_vendita, account_id')
        .eq('user_id', user.id)
        .order('data_visita', { ascending: false })
        .limit(100);

      // Carica conteggio clienti totali
      const { count: clientiCount } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Carica nuovi clienti del mese (creati da monthStart in poi)
      const { count: nuoviClientiCount } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString());

      // Carica conteggio promemoria
      let promemoriaCount = 0;
      try {
        const promemoriaList = await fetchPromemoria();
        promemoriaCount = promemoriaList.length;
      } catch (e) {
        console.warn('[Dashboard] Errore caricamento promemoria:', e);
      }

      // Calcola statistiche
      const visitsData = visits || [];
      
      const visiteOggi = visitsData.filter(v => 
        v.tipo === 'visita' && new Date(v.data_visita) >= today
      ).length;
      
      const visiteMese = visitsData.filter(v => 
        v.tipo === 'visita' && new Date(v.data_visita) >= monthStart
      ).length;
      
      const chiamateOggi = visitsData.filter(v => 
        v.tipo === 'chiamata' && new Date(v.data_visita) >= today
      ).length;
      
      const chiamateMese = visitsData.filter(v => 
        v.tipo === 'chiamata' && new Date(v.data_visita) >= monthStart
      ).length;

      const venduteOggi = visitsData
        .filter(v => new Date(v.data_visita) >= today)
        .reduce((sum, v) => sum + (v.importo_vendita || 0), 0);

      const venduteMese = visitsData
        .filter(v => new Date(v.data_visita) >= monthStart)
        .reduce((sum, v) => sum + (v.importo_vendita || 0), 0);

      // Ultime 5 attività (per la lista)
      const recent: RecentActivity[] = visitsData.slice(0, 5).map(v => ({
        id: v.id,
        tipo: v.tipo,
        cliente_nome: 'Cliente', // TODO: decrypt nome cliente
        data_visita: v.data_visita,
        esito: v.esito || '—',
        importo_vendita: v.importo_vendita,
      }));

      setStats({
        visiteOggi,
        visiteMese,
        chiamateOggi,
        chiamateMese,
        venduteOggi,
        venduteMese,
        clientiTotali: clientiCount || 0,
        nuoviClientiMese: nuoviClientiCount || 0,
        promemoriaCount,
        ultimaAttivita: visitsData.length > 0 ? {
          tipo: visitsData[0].tipo,
          cliente: 'Cliente',
          data: visitsData[0].data_visita,
        } : null,
      });

      setRecentActivities(recent);

    } catch (e) {
      console.error('[Dashboard] Errore caricamento:', e);
    } finally {
      setLoading(false);
    }
  }
  
  // Carica storico mesi (ultimi 12 mesi)
  const loadMonthlyHistory = useCallback(async () => {
    if (monthlyHistory.length > 0) return; // Già caricato
    
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const now = new Date();
      const months: MonthlyStats[] = [];
      
      // Carica tutte le visite degli ultimi 12 mesi
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      
      const { data: allVisits } = await supabase
        .from('visits')
        .select('tipo, data_visita, importo_vendita')
        .eq('user_id', user.id)
        .gte('data_visita', oneYearAgo.toISOString())
        .order('data_visita', { ascending: false });
      
      const { data: allClients } = await supabase
        .from('accounts')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', oneYearAgo.toISOString());
      
      // Calcola stats per ogni mese (ultimi 12)
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        
        const monthVisits = (allVisits || []).filter(v => {
          const d = new Date(v.data_visita);
          return d >= monthDate && d <= monthEnd;
        });
        
        const monthClients = (allClients || []).filter(c => {
          const d = new Date(c.created_at);
          return d >= monthDate && d <= monthEnd;
        });
        
        months.push({
          month: monthDate.getMonth(),
          year: monthDate.getFullYear(),
          label: monthDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
            .replace(/^\w/, c => c.toUpperCase()),
          visite: monthVisits.filter(v => v.tipo === 'visita').length,
          chiamate: monthVisits.filter(v => v.tipo === 'chiamata').length,
          vendite: monthVisits.reduce((sum, v) => sum + (v.importo_vendita || 0), 0),
          nuoviClienti: monthClients.length,
        });
      }
      
      setMonthlyHistory(months);
    } catch (e) {
      console.error('[Dashboard] Errore storico mesi:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [monthlyHistory.length]);
  
  // Export CSV storico mesi
  const exportMonthlyCSV = useCallback(() => {
    if (monthlyHistory.length === 0) return;
    
    const headers = ['Mese', 'Visite', 'Chiamate', 'Vendite (€)', 'Nuovi Clienti'];
    const rows = monthlyHistory.map(m => [
      m.label,
      m.visite.toString(),
      m.chiamate.toString(),
      m.vendite.toFixed(2),
      m.nuoviClienti.toString(),
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM per Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storico_mesi_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [monthlyHistory]);

  // Saluto dinamico
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  // Giorno della settimana
  const dayName = useMemo(() => {
    return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', marginTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 16, color: '#6b7280' }}>Caricamento dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxWidth: 800, margin: '0 auto' }}>
      
      {/* Header con saluto */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
          {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
          {greeting}, {userName.split(' ')[0]}! 👋
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>
          Ecco il riepilogo della tua giornata
        </p>
      </div>

      {/* === BANNER PRINCIPALI (subito dopo saluto) === */}
      
      {/* 1. Driving Mode - Sfondo scuro */}
      <a 
        href="/driving"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          marginBottom: 12,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 14,
          textDecoration: 'none',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🚗</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Modalità Guida</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Hands-free per guidare</div>
          </div>
        </div>
        <span style={{ fontSize: 20, opacity: 0.7 }}>→</span>
      </a>

      {/* 2. Promemoria - Sfondo bianco */}
      <a 
        href="#"
        onClick={(e) => {
          e.preventDefault();
          // Dispatch evento per aprire drawer docs con promemoria
          window.dispatchEvent(new CustomEvent('open-promemoria'));
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          marginBottom: 12,
          background: 'white',
          borderRadius: 14,
          textDecoration: 'none',
          color: '#111827',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📌</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Promemoria</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Le tue note importanti</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stats.promemoriaCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 20,
              minWidth: 28,
              textAlign: 'center',
            }}>
              {stats.promemoriaCount}
            </span>
          )}
          <span style={{ fontSize: 20, color: '#9ca3af' }}>→</span>
        </div>
      </a>

      {/* 3. Planning Giornata - Sfondo bianco */}
      <a 
        href="/planning"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          marginBottom: 24,
          background: 'white',
          borderRadius: 14,
          textDecoration: 'none',
          color: '#111827',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🗺️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Pianifica la Giornata</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Ottimizza il giro visite</div>
          </div>
        </div>
        <span style={{ fontSize: 20, color: '#9ca3af' }}>→</span>
      </a>

      {/* === FINE BANNER PRINCIPALI === */}

      {/* 🚀 Checklist Primi Passi (onboarding) */}
      <GettingStartedChecklist />

      {/* KPI Cards - Oggi */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>📌 Oggi</div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: 12 
        }}>
          <KPICard 
            icon="🚗" 
            label="Visite" 
            value={stats.visiteOggi} 
            color="#2563eb" 
            bgColor="#eff6ff"
          />
          <KPICard 
            icon="📞" 
            label="Chiamate" 
            value={stats.chiamateOggi} 
            color="#d97706" 
            bgColor="#fffbeb"
          />
          <KPICard 
            icon="💰" 
            label="Vendite" 
            value={`€${stats.venduteOggi.toFixed(0)}`} 
            color="#059669" 
            bgColor="#f0fdf4"
          />
        </div>
      </div>

      {/* KPI Cards - Mese (cliccabile per storico) */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => {
            setShowMonthHistory(true);
            loadMonthlyHistory();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 12,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <span>📅 {currentMonthLabel}</span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>▼ storico</span>
        </button>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: 12 
        }}>
          <KPICard 
            icon="🚗" 
            label="Visite" 
            value={stats.visiteMese} 
            color="#6366f1" 
            bgColor="#eef2ff"
          />
          <KPICard 
            icon="📞" 
            label="Chiamate" 
            value={stats.chiamateMese} 
            color="#8b5cf6" 
            bgColor="#f5f3ff"
          />
          <KPICard 
            icon="💰" 
            label="Vendite" 
            value={`€${stats.venduteMese.toFixed(0)}`} 
            color="#059669" 
            bgColor="#f0fdf4"
          />
          <KPICard 
            icon="👥" 
            label="Nuovi Clienti" 
            value={stats.nuoviClientiMese} 
            color="#10b981" 
            bgColor="#ecfdf5"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>⚡ Azioni rapide</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <QuickAction 
            icon="➕" 
            label="Nuova Visita" 
            href="/tools/add-visit"
            color="#2563eb"
          />
          <QuickAction 
            icon="👤" 
            label="Nuovo Cliente" 
            href="/tools/quick-add-client"
            color="#059669"
          />
          <QuickAction 
            icon="📋" 
            label="Lista Clienti" 
            href="/clients"
            color="#6366f1"
          />
          <QuickAction 
            icon="📅" 
            label="Storico Visite" 
            href="/visits"
            color="#d97706"
          />
        </div>
      </div>

      {/* Ultime Attività */}
      {recentActivities.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>🕐 Ultime attività</div>
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            {recentActivities.map((activity, idx) => (
              <div 
                key={activity.id}
                style={{ 
                  padding: '12px 16px',
                  borderBottom: idx < recentActivities.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 20 }}>
                    {activity.tipo === 'visita' ? '🚗' : '📞'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                      {activity.esito}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(activity.data_visita).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  </div>
                </div>
                {activity.importo_vendita && activity.importo_vendita > 0 && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                    €{activity.importo_vendita.toFixed(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Modal Storico Mesi */}
      {showMonthHistory && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowMonthHistory(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                  📅 Storico Mesi
                </h2>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
                  Ultimi 12 mesi di attività
                </p>
              </div>
              <button
                onClick={() => setShowMonthHistory(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: '#f3f4f6',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 32 }}>⏳</div>
                  <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>Caricamento...</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monthlyHistory.map((m, idx) => (
                    <div
                      key={`${m.year}-${m.month}`}
                      style={{
                        padding: '12px 16px',
                        background: idx === 0 ? '#eef2ff' : '#f9fafb',
                        borderRadius: 10,
                        border: idx === 0 ? '2px solid #6366f1' : '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: idx === 0 ? '#4f46e5' : '#374151',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        {m.label}
                        {idx === 0 && <span style={{ fontSize: 10, background: '#6366f1', color: 'white', padding: '2px 6px', borderRadius: 4 }}>ATTUALE</span>}
                      </div>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: 8,
                        fontSize: 12,
                      }}>
                        <div>
                          <div style={{ color: '#6b7280' }}>Visite</div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{m.visite}</div>
                        </div>
                        <div>
                          <div style={{ color: '#6b7280' }}>Chiamate</div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{m.chiamate}</div>
                        </div>
                        <div>
                          <div style={{ color: '#6b7280' }}>Vendite</div>
                          <div style={{ fontWeight: 600, color: '#059669' }}>€{m.vendite.toFixed(0)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#6b7280' }}>Nuovi</div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{m.nuoviClienti}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer con Export */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 12,
            }}>
              <button
                onClick={exportMonthlyCSV}
                disabled={loadingHistory || monthlyHistory.length === 0}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loadingHistory ? 'not-allowed' : 'pointer',
                  opacity: loadingHistory ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                📥 Esporta CSV
              </button>
              <button
                onClick={() => setShowMonthHistory(false)}
                style={{
                  padding: '12px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componenti helper
function KPICard({ icon, label, value, color, bgColor }: { 
  icon: string; 
  label: string; 
  value: string | number; 
  color: string;
  bgColor: string;
}) {
  return (
    <div style={{ 
      padding: 16, 
      background: bgColor, 
      borderRadius: 12,
      border: `1px solid ${color}20`,
    }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function QuickAction({ icon, label, href, color }: {
  icon: string;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        textDecoration: 'none',
        color: '#111827',
        fontWeight: 500,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 10,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
      }}>
        {icon}
      </div>
      <span>{label}</span>
    </a>
  );
}


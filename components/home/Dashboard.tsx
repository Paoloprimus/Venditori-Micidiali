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

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';

type DashboardStats = {
  visiteOggi: number;
  visiteMese: number;
  chiamateOggi: number;
  chiamateMese: number;
  venduteOggi: number;
  venduteMese: number;
  clientiTotali: number;
  ultimaAttivita: { tipo: string; cliente: string; data: string } | null;
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
    ultimaAttivita: null,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadDashboardData();
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

      // Carica conteggio clienti
      const { count: clientiCount } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

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
      <div style={{ marginBottom: 24 }}>
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

      {/* KPI Cards - Mese */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>📅 Questo mese</div>
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
            label="Clienti" 
            value={stats.clientiTotali} 
            color="#6b7280" 
            bgColor="#f9fafb"
          />
        </div>
      </div>

      {/* Driving Mode - In evidenza */}
      <a 
        href="/driving"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 16,
          textDecoration: 'none',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>🚗</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Modalità Guida</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Hands-free per guidare in sicurezza</div>
          </div>
        </div>
        <span style={{ fontSize: 24, opacity: 0.7 }}>→</span>
      </a>

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


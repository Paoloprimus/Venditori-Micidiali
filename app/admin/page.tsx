import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  const { data: me } = await supabase.from('profiles').select('role, first_name').eq('id', session.user.id).single();
  if (me?.role !== 'admin') redirect('/');

  // Statistiche utenti
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { data: roleStats } = await supabase.from('profiles').select('role');
  
  const roleCounts = (roleStats || []).reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // KPI aggregati team
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Visite oggi (tutti gli utenti)
  const { count: visiteOggi } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .gte('data_visita', today);

  // Visite mese
  const { count: visiteMese } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .gte('data_visita', monthStart);

  // Vendite mese (somma importi)
  const { data: venditeMeseData } = await supabase
    .from('visits')
    .select('importo_vendita')
    .gte('data_visita', monthStart)
    .not('importo_vendita', 'is', null);
  
  const venditeMese = (venditeMeseData || []).reduce((sum, v) => sum + (v.importo_vendita || 0), 0);

  // Clienti totali
  const { count: clientiTotali } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });

  // Top 5 agenti per visite mese
  const { data: topAgents } = await supabase
    .from('visits')
    .select('user_id')
    .gte('data_visita', monthStart);

  const agentVisitCounts: Record<string, number> = {};
  (topAgents || []).forEach(v => {
    agentVisitCounts[v.user_id] = (agentVisitCounts[v.user_id] || 0) + 1;
  });

  const topAgentIds = Object.entries(agentVisitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));

  // Ottieni nomi agenti
  const { data: agentProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', topAgentIds.map(a => a.id));

  const agentNames: Record<string, string> = {};
  (agentProfiles || []).forEach(p => {
    agentNames[p.id] = `${p.first_name} ${p.last_name}`;
  });

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>👑 Pannello Admin</h1>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>← Torna all&apos;app</Link>
      </div>
      
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Benvenuto{me?.first_name ? `, ${me.first_name}` : ''}.
      </p>

      {/* KPI Team */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: 20, borderRadius: 12, marginBottom: 24, color: 'white' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, opacity: 0.9 }}>📊 KPI Team - {now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          <KPICard label="Visite Oggi" value={visiteOggi || 0} icon="🚗" />
          <KPICard label="Visite Mese" value={visiteMese || 0} icon="📅" />
          <KPICard label="Vendite Mese" value={`€${(venditeMese || 0).toLocaleString('it-IT')}`} icon="💰" />
          <KPICard label="Clienti Totali" value={clientiTotali || 0} icon="👥" />
        </div>
      </div>

      {/* Classifica Agenti */}
      {topAgentIds.length > 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🏆 Top Agenti (visite mese)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topAgentIds.map((agent, idx) => (
              <div key={agent.id} style={{ 
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', background: 'white', borderRadius: 8,
                border: '1px solid #e5e7eb'
              }}>
                <span style={{ 
                  width: 28, height: 28, borderRadius: '50%', 
                  background: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#d97706' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, color: idx < 3 ? 'white' : '#6b7280'
                }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1, fontWeight: 500 }}>{agentNames[agent.id] || 'Agente'}</span>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>{agent.count} visite</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiche Utenti */}
      <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>👥 Utenti per Ruolo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
          <StatCard label="Totali" value={totalUsers || 0} color="#111827" />
          <StatCard label="Admin" value={roleCounts['admin'] || 0} color="#7c3aed" />
          <StatCard label="Premium" value={roleCounts['agente_premium'] || 0} color="#059669" />
          <StatCard label="Agenti" value={(roleCounts['agente'] || 0) + (roleCounts['venditore'] || 0)} color="#2563eb" />
        </div>
      </div>

      {/* Azioni */}
      <div style={{ display: 'grid', gap: 12 }}>
        <AdminAction href="/admin/users" icon="👥" label="Gestione Utenti" desc="Modifica ruoli, visualizza attività" />
        <AdminAction href="/admin/usage" icon="📈" label="Statistiche Uso" desc="Query giornaliere, limiti raggiunti" />
        <AdminAction href="/admin/products" icon="📦" label="Catalogo Prodotti" desc="Import/export, modifica prezzi" />
      </div>
    </div>
  );
}

function KPICard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'white', padding: 16, borderRadius: 8, textAlign: 'center', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function AdminAction({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: 16, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
      textDecoration: 'none', color: 'inherit', transition: 'box-shadow 0.2s'
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, color: '#111827' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{desc}</div>
      </div>
    </Link>
  );
}

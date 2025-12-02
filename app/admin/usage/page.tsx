// app/admin/usage/page.tsx
// Statistiche uso per admin

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminUsagePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (me?.role !== 'admin') redirect('/');

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Uso oggi per tipo
  const { data: usageToday } = await supabase
    .from('usage_tracking')
    .select('user_id, usage_type, count')
    .eq('usage_date', today);

  // Uso ultima settimana
  const { data: usageWeek } = await supabase
    .from('usage_tracking')
    .select('user_id, usage_type, count, usage_date')
    .gte('usage_date', weekAgo)
    .order('usage_date', { ascending: false });

  // Limiti per ruolo
  const { data: limits } = await supabase
    .from('service_limits')
    .select('*');

  // Profili utenti per nomi
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role');

  const profileMap: Record<string, { name: string; role: string }> = {};
  (profiles || []).forEach(p => {
    profileMap[p.id] = { name: `${p.first_name} ${p.last_name}`, role: p.role };
  });

  // Calcola statistiche
  const chatQueriesToday = (usageToday || [])
    .filter(u => u.usage_type === 'chat_query')
    .reduce((sum, u) => sum + u.count, 0);

  const pdfExportsToday = (usageToday || [])
    .filter(u => u.usage_type === 'pdf_export')
    .reduce((sum, u) => sum + u.count, 0);

  // Utenti che hanno raggiunto il limite oggi
  const limitReached: { userId: string; type: string; count: number; limit: number }[] = [];
  
  const limitsMap: Record<string, { chat: number; pdf: number | null }> = {};
  (limits || []).forEach(l => {
    limitsMap[l.role] = { chat: l.max_chat_queries_day, pdf: l.max_pdf_exports_month };
  });

  (usageToday || []).forEach(u => {
    const profile = profileMap[u.user_id];
    if (!profile) return;
    const roleLimits = limitsMap[profile.role];
    if (!roleLimits) return;

    if (u.usage_type === 'chat_query' && u.count >= roleLimits.chat) {
      limitReached.push({ userId: u.user_id, type: 'chat', count: u.count, limit: roleLimits.chat });
    }
  });

  // Top utenti per uso chat
  const userChatUsage: Record<string, number> = {};
  (usageWeek || [])
    .filter(u => u.usage_type === 'chat_query')
    .forEach(u => {
      userChatUsage[u.user_id] = (userChatUsage[u.user_id] || 0) + u.count;
    });

  const topChatUsers = Object.entries(userChatUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Uso giornaliero (grafico semplice)
  const dailyUsage: Record<string, { chat: number; pdf: number }> = {};
  (usageWeek || []).forEach(u => {
    if (!dailyUsage[u.usage_date]) {
      dailyUsage[u.usage_date] = { chat: 0, pdf: 0 };
    }
    if (u.usage_type === 'chat_query') {
      dailyUsage[u.usage_date].chat += u.count;
    } else if (u.usage_type === 'pdf_export') {
      dailyUsage[u.usage_date].pdf += u.count;
    }
  });

  const sortedDays = Object.keys(dailyUsage).sort();
  const maxChat = Math.max(...sortedDays.map(d => dailyUsage[d].chat), 1);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>📈 Statistiche Uso</h1>
        <Link href="/admin" style={{ color: '#6b7280', textDecoration: 'none' }}>← Pannello Admin</Link>
      </div>

      {/* KPI Oggi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#eff6ff', padding: 20, borderRadius: 12, border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 8 }}>💬 Query Chat Oggi</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#1e40af' }}>{chatQueriesToday}</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: 20, borderRadius: 12, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 14, color: '#166534', marginBottom: 8 }}>📄 Export PDF Oggi</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#166534' }}>{pdfExportsToday}</div>
        </div>
        <div style={{ background: limitReached.length > 0 ? '#fef2f2' : '#f9fafb', padding: 20, borderRadius: 12, border: `1px solid ${limitReached.length > 0 ? '#fecaca' : '#e5e7eb'}` }}>
          <div style={{ fontSize: 14, color: limitReached.length > 0 ? '#b91c1c' : '#6b7280', marginBottom: 8 }}>⚠️ Limiti Raggiunti</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: limitReached.length > 0 ? '#b91c1c' : '#6b7280' }}>{limitReached.length}</div>
        </div>
      </div>

      {/* Limiti Raggiunti */}
      {limitReached.length > 0 && (
        <div style={{ background: '#fef2f2', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid #fecaca' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#b91c1c', marginBottom: 12 }}>⚠️ Utenti al limite oggi</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {limitReached.map((lr, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'white', borderRadius: 6 }}>
                <span style={{ fontWeight: 500 }}>{profileMap[lr.userId]?.name || 'Utente'}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>({profileMap[lr.userId]?.role})</span>
                <span style={{ marginLeft: 'auto', color: '#b91c1c', fontWeight: 600 }}>{lr.count}/{lr.limit} query</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grafico uso settimanale */}
      <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📊 Query Chat - Ultima Settimana</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {sortedDays.map(day => {
            const height = (dailyUsage[day].chat / maxChat) * 100;
            const dayLabel = new Date(day).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
            return (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{dailyUsage[day].chat}</div>
                <div style={{ 
                  width: '100%', 
                  height: `${Math.max(height, 5)}%`, 
                  background: day === today ? '#2563eb' : '#93c5fd',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4,
                }} />
                <div style={{ fontSize: 10, color: '#6b7280' }}>{dayLabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top utenti */}
      <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🏆 Top Utenti per Query (7 giorni)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topChatUsers.map(([userId, count], idx) => (
            <div key={userId} style={{ 
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', background: 'white', borderRadius: 8,
              border: '1px solid #e5e7eb'
            }}>
              <span style={{ 
                width: 24, height: 24, borderRadius: '50%', 
                background: idx < 3 ? '#2563eb' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: 12, color: idx < 3 ? 'white' : '#6b7280'
              }}>
                {idx + 1}
              </span>
              <span style={{ flex: 1, fontWeight: 500 }}>{profileMap[userId]?.name || 'Utente'}</span>
              <span style={{ fontSize: 12, color: '#6b7280', marginRight: 8 }}>{profileMap[userId]?.role}</span>
              <span style={{ fontWeight: 600, color: '#2563eb' }}>{count} query</span>
            </div>
          ))}
          {topChatUsers.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>Nessun dato disponibile</div>
          )}
        </div>
      </div>

      {/* Tabella limiti per ruolo */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>⚙️ Limiti per Ruolo</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>Ruolo</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Query/Giorno</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>PDF/Mese</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Storico</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Analytics</th>
            </tr>
          </thead>
          <tbody>
            {(limits || []).map(limit => (
              <tr key={limit.role} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 12, fontWeight: 500 }}>
                  {limit.role === 'admin' ? '👑' : limit.role === 'agente_premium' ? '⭐' : '💼'} {limit.role}
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>{limit.max_chat_queries_day}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{limit.max_pdf_exports_month ?? '∞'}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{limit.history_days ? `${limit.history_days}g` : '∞'}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{limit.analytics_advanced ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// app/admin/users/page.tsx
// Gestione utenti per admin

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';
import UserRoleSelector from './UserRoleSelector';

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (me?.role !== 'admin') redirect('/');

  // Carica tutti gli utenti con statistiche
  const { data: users } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, created_at')
    .order('created_at', { ascending: false });

  // Statistiche per utente (clienti, visite)
  const userStats: Record<string, { clients: number; visits: number }> = {};
  
  for (const user of users || []) {
    const { count: clientCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    const { count: visitCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    userStats[user.id] = {
      clients: clientCount || 0,
      visits: visitCount || 0,
    };
  }

  const roleLabels: Record<string, string> = {
    admin: '👑 Admin',
    agente_premium: '⭐ Premium',
    agente: '💼 Agente',
    venditore: '💼 Agente',
  };

  const roleColors: Record<string, string> = {
    admin: '#7c3aed',
    agente_premium: '#059669',
    agente: '#2563eb',
    venditore: '#2563eb',
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>👥 Gestione Utenti</h1>
        <Link href="/admin" style={{ color: '#6b7280', textDecoration: 'none' }}>← Pannello Admin</Link>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>Utente</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Ruolo</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Clienti</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Visite</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Membro dal</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${roleColors[user.role] || '#6b7280'} 0%, #1f2937 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 600, fontSize: 14,
                    }}>
                      {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{user.first_name} {user.last_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{user.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <UserRoleSelector 
                    userId={user.id} 
                    currentRole={user.role} 
                    isCurrentUser={user.id === session.user.id}
                  />
                </td>
                <td style={{ padding: 12, textAlign: 'center', fontWeight: 500 }}>
                  {userStats[user.id]?.clients || 0}
                </td>
                <td style={{ padding: 12, textAlign: 'center', fontWeight: 500 }}>
                  {userStats[user.id]?.visits || 0}
                </td>
                <td style={{ padding: 12, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
                  {new Date(user.created_at).toLocaleDateString('it-IT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
        💡 <strong>Nota:</strong> I dati dei clienti restano cifrati e visibili solo al proprietario. L&apos;admin può vedere le statistiche aggregate ma non i nomi dei clienti.
      </div>
    </div>
  );
}


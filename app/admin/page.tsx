import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  const { data: me } = await supabase.from('profiles').select('role, first_name').eq('id', session.user.id).single();
  if (me?.role !== 'admin') redirect('/');

  // Statistiche base
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { data: roleStats } = await supabase.from('profiles').select('role');
  
  const roleCounts = (roleStats || []).reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>👑 Pannello Admin</h1>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>← Torna all&apos;app</Link>
      </div>
      
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Benvenuto{me?.first_name ? `, ${me.first_name}` : ''}.
      </p>

      {/* Statistiche Utenti */}
      <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📊 Utenti</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
          <StatCard label="Totali" value={totalUsers || 0} color="#111827" />
          <StatCard label="Admin" value={roleCounts['admin'] || 0} color="#7c3aed" />
          <StatCard label="Premium" value={roleCounts['agente_premium'] || 0} color="#059669" />
          <StatCard label="Agenti" value={roleCounts['agente'] || roleCounts['venditore'] || 0} color="#2563eb" />
        </div>
      </div>

      {/* Azioni */}
      <div style={{ display: 'grid', gap: 12 }}>
        <AdminAction href="/admin/users" icon="👥" label="Gestione Utenti" desc="Modifica ruoli, visualizza attività" />
        <AdminAction href="/admin/usage" icon="📈" label="Statistiche Uso" desc="Query, export, limiti raggiunti" />
        <AdminAction href="/admin/products" icon="📦" label="Catalogo Prodotti" desc="Import/export, modifica prezzi" />
      </div>
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

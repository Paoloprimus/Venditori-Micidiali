import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/admin/login');

  const { data: me } = await supabase.from('profiles').select('role, first_name').eq('id', session.user.id).single();
  if (me?.role !== 'admin') redirect('/');

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Pannello Admin</h1>
      <p style={{ color: '#6b7280', marginTop: 8 }}>
        Benvenuto{me?.first_name ? `, ${me.first_name}` : ''}.
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');           // inserirai paolo.olivato@gmail.com
  const [password, setPassword] = useState('');     // la password impostata in Supabase
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg('Credenziali non valide.');
      setLoading(false);
      return;
    }

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (pErr || profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setErrorMsg('Accesso negato: non sei admin.');
      setLoading(false);
      return;
    }

    router.push('/admin');
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: 24, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Login Admin</h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
               style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 12 }} />
        <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
               style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 16 }} />
        <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#111827', color: 'white', fontWeight: 600 }}>
          {loading ? 'Accesso in corso…' : 'Entra'}
        </button>
        {errorMsg && <p style={{ color: '#b91c1c', marginTop: 12 }}>{errorMsg}</p>}
      </form>
    </div>
  );
}

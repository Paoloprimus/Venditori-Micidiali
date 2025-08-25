'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch('/api/conversations/create', { method: 'POST' });

        // Non autenticato: vai alla pagina di login che avevi già
        if (res.status === 401) {
          if (!cancelled) router.replace('/auth/signin?next=/');
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setError(data?.details || data?.error || 'Errore creazione sessione');
          return;
        }

        const json = await res.json().catch(() => ({}));
        const id = json?.conversation?.id || json?.id;
        if (id) {
          if (!cancelled) router.replace(`/chat/${id}`); // adattato al tuo path
        } else {
          if (!cancelled) setError('Risposta inattesa: ID sessione mancante');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Errore di rete');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [router]);

  if (error) {
    return (
      <main className="p-6">
        <div className="text-red-600">{error}</div>
        <a href="/auth/signin" className="inline-block mt-3 px-3 py-2 rounded bg-black text-white">
          Vai al login
        </a>
      </main>
    );
  }

  return <div className="p-6 text-sm text-gray-400">Creo una nuova sessione…</div>;
}

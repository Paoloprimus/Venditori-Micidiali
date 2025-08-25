'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/conversations/create', { method: 'POST' });
        const json = await res.json();
        const id = json?.conversation?.id;
        if (id) router.replace(`/chat/${id}`); // Adatta se il tuo path è diverso
      } catch {}
    };
    run();
  }, [router]);

  return <div className="p-6 text-sm text-gray-400">Creo una nuova sessione…</div>;
}

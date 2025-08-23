'use client';
export const dynamic = 'force-dynamic';
export const revalidate = false;

import React, { useEffect, useRef, useState } from 'react';

function useSpeech() {
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const start = () => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SR) {
      if (typeof window !== 'undefined') {
        window.alert('SpeechRecognition non supportato su questo device');
      }
      return;
    }
    const rec = new SR();
    rec.lang = 'it-IT';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript ?? '';
      if (typeof window !== 'undefined' && (window as any).onTranscript) {
        (window as any).onTranscript(text);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stop = () => {
    try { recRef.current?.stop?.(); } catch {}
    setListening(false);
  };

  return { start, stop, listening };
}

export default function QuickAdd() {
  const [input, setInput] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const { start, stop, listening } = useSpeech();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).onTranscript = (t: string) => {
      setInput(t);
      interpret(t);
    };
    return () => {
      // cleanup
      if (typeof window !== 'undefined') {
        delete (window as any).onTranscript;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const append = (s: string) =>
    setLog((l) => [s, ...l].slice(0, 20));

  async function interpret(cmd: string) {
    const s = cmd.toLowerCase().trim();
    append('🗣️ ' + cmd);

    // CREA ACCOUNT — "crea account rossi"
    let m = s.match(/(crea|nuovo)\s+account\s+(.+)/);
    if (m) {
      const name = m[2].trim();
      const res = await fetch('/api/accounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      append(data.ok ? `✅ account: ${data.account.name} (${data.account.id})` : `❌ ${data.error}`);
      return;
    }

    // CREA PRODOTTO — "crea prodotto assistenza premium a 1200 euro"
    m = s.match(/(crea|nuovo)\s+prodotto\s+(.+?)(?:\s+a\s+([\d.,]+)\s*euro)?/);
    if (m) {
      const title = m[2].trim();
      const price = m[3] ? Number(m[3].replace(',', '.')) : undefined;
      const res = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, base_price: price }),
      });
      const data = await res.json();
      append(data.ok ? `✅ prodotto: ${data.product.title} (${data.product.id})` : `❌ ${data.error}`);
      return;
    }

    // CREA CONTATTO — "crea contatto mario rossi per account <UUID> email mario@x.it"
    m = s.match(/(crea|nuovo)\s+contatto\s+(.+?)\s+per\s+account\s+([0-9a-f-]{36})(?:\s+email\s+(\S+))?/);
    if (m) {
      const full_name = m[2].trim();
      const account_id = m[3];
      const email = m[4];
      const res = await fetch('/api/contacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id, full_name, email }),
      });
      const data = await res.json();
      append(data.ok ? `✅ contatto: ${data.contact.full_name} (${data.contact.id})` : `❌ ${data.error}`);
      return;
    }

    append(
      '🤷‍♂️ Comando non riconosciuto. Esempi: "crea account Rossi", "crea prodotto Assistenza Premium a 1200 euro", "crea contatto Mario Rossi per account <UUID> email mario@x.it"'
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    interpret(input);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Quick Add (voce/testo)</h1>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="border rounded p-2 flex-1"
          placeholder='es. "crea account Rossi"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="px-3 py-2 rounded bg-blue-600 text-white">Invia</button>
        <button
          type="button"
          onClick={listening ? stop : start}
          className={`px-3 py-2 rounded ${listening ? 'bg-red-600' : 'bg-green-600'} text-white`}
        >
          {listening ? 'Stop 🎙️' : 'Parla 🎙️'}
        </button>
      </form>
      <div className="space-y-1">
        {log.map((l, i) => (
          <div key={i} className="text-sm bg-gray-100 rounded px-2 py-1">
            {l}
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600">
        Suggerimenti: “crea account Rossi” • “crea prodotto Assistenza Premium a 1200 euro” •
        “crea contatto Mario Rossi per account &lt;UUID&gt; email mario@x.it”
      </p>
    </div>
  );
}

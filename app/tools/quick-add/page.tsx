'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CustomFields = {
  fascia?: 'A' | 'B' | 'C';
  pagamento?: string;
  prodotti_interesse?: string[] | string;
  ultimi_volumi?: string;
  ultimo_esito?: string;
  tabu?: string[] | string;
  interessi?: string[] | string;
  note?: string;
};

type Contact = { full_name: string; email?: string; phone?: string };

function splitList(v?: string) {
  if (!v) return undefined;
  return v
    .split(/[;,]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

// Heuristica semplice per “estrarre” dai testi in italiano
function extractFromText(text: string) {
  const t = text.replace(/\r/g, '');
  const get = (re: RegExp) => {
    const m = t.match(re);
    return m?.[1]?.trim();
  };

  const name =
    get(/(?:aggiungi\s+cliente|cliente|nome)\s*[:=]\s*([^\n;,.]+)/i) ||
    get(/^\s*([A-ZÀ-Ý][\wÀ-ÿ'&.\s-]{2,})\s*$/im) ||
    '';

  const fascia = (get(/fascia\s*[:=]\s*([ABC])/i)?.toUpperCase() as 'A'|'B'|'C'|undefined) ?? undefined;
  const pagamento = get(/pagamento\s*[:=]\s*([^\n;,.]+)/i);
  const prodotti = get(/prodotti(?:_|\s*)interesse\s*[:=]\s*([^\n]+)/i);
  const volumi = get(/ultimi[_\s]*volumi\s*[:=]\s*([^\n]+)/i);
  const esito = get(/ultimo[_\s]*esito\s*[:=]\s*([^\n]+)/i);
  const tabu = get(/tabu\s*[:=]\s*([^\n]+)/i);
  const interessi = get(/interessi\s*[:=]\s*([^\n]+)/i);
  const note = get(/note\s*[:=]\s*([^\n]+)/i);

  // contatto singolo semplice: "contatto: Mario Rossi, mario@email, 333..."
  const contactLine = get(/contatt[oi]\s*[:=]\s*([^\n]+)/i);
  const contact: Contact | undefined = contactLine
    ? (() => {
        const parts = contactLine.split(/[;,]+/).map(s => s.trim());
        const full_name = parts[0] || '';
        const email = parts.find(p => /\S+@\S+\.\S+/.test(p));
        const phone = parts.find(p => /(\+?\d[\d\s\-]{6,})/.test(p));
        return full_name ? { full_name, email, phone } : undefined;
      })()
    : undefined;

  const custom: CustomFields = {
    fascia,
    pagamento,
    prodotti_interesse: splitList(prodotti),
    ultimi_volumi: volumi,
    ultimo_esito: esito,
    tabu: splitList(tabu),
    interessi: splitList(interessi),
    note,
  };

  return { name, custom, contacts: contact ? [contact] : [] as Contact[] };
}

export default function QuickAddClientPage() {
  const [step, setStep] = useState<1 | 2>(1);

  // STEP 1: input libero
  const [freeText, setFreeText] = useState('');

  // STEP 2: form riepilogo/editabile
  const initial = useMemo(() => extractFromText(freeText), [freeText]);
  const [name, setName] = useState('');
  const [fascia, setFascia] = useState<'A'|'B'|'C'|''>('');
  const [pagamento, setPagamento] = useState('');
  const [prodotti, setProdotti] = useState('');
  const [volumi, setVolumi] = useState('');
  const [esito, setEsito] = useState('');
  const [tabu, setTabu] = useState('');
  const [interessi, setInteressi] = useState('');
  const [note, setNote] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Dettatura ---
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const finalChunkRef = useRef<string>(''); // accumula i risultati finali

  function startDictation() {
    if (typeof window === 'undefined') {
      alert('La dettatura funziona solo nel browser.');
      return;
    }
    const Rec: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Rec) {
      alert('La dettatura non è supportata da questo browser. Prova Chrome su desktop.');
      return;
    }
    if (!recognitionRef.current) {
      recognitionRef.current = new Rec();
    }

    const recog = recognitionRef.current;
    setListening(true);
    finalChunkRef.current = '';
    recog.lang = 'it-IT';
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunkRef.current += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      // Usa il valore precedente per evitare riferimenti fuori scope
      setFreeText(prev =>
        (prev + ' ' + finalChunkRef.current + ' ' + interim).replace(/\s+/g, ' ').trim()
      );
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    try {
      recog.start();
    } catch {
      // alcuni browser lanciano se start() chiamato due volte
    }
  }

  function stopDictation() {
    const recog = recognitionRef.current;
    if (recog && listening) {
      try { recog.stop(); } catch {}
    }
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  function goRiepilogo() {
    const pre = initial;
    setName(pre.name || '');
    setFascia((pre.custom.fascia as any) || '');
    setPagamento(pre.custom.pagamento || '');
    setProdotti(Array.isArray(pre.custom.prodotti_interesse) ? pre.custom.prodotti_interesse.join(', ') : (pre.custom.prodotti_interesse || ''));
    setVolumi(pre.custom.ultimi_volumi || '');
    setEsito(pre.custom.ultimo_esito || '');
    setTabu(Array.isArray(pre.custom.tabu) ? pre.custom.tabu.join(', ') : (pre.custom.tabu || ''));
    setInteressi(Array.isArray(pre.custom.interessi) ? pre.custom.interessi.join(', ') : (pre.custom.interessi || ''));
    setNote(pre.custom.note || '');
    if (pre.contacts && pre.contacts[0]) {
      setContactName(pre.contacts[0].full_name || '');
      setContactEmail(pre.contacts[0].email || '');
      setContactPhone(pre.contacts[0].phone || '');
    } else {
      setContactName('');
      setContactEmail('');
      setContactPhone('');
    }
    setStep(2);
  }

  async function onConfirmSave() {
    setSaving(true);
    setErrorMsg(null);
    setResultMsg(null);

    const body = {
      name: name.trim(),
      custom: {
        fascia: (fascia || undefined) as 'A'|'B'|'C'|undefined,
        pagamento: pagamento || undefined,
        prodotti_interesse: splitList(prodotti),
        ultimi_volumi: volumi || undefined,
        ultimo_esito: esito || undefined,
        tabu: splitList(tabu),
        interessi: splitList(interessi),
        note: note || undefined,
      },
      contacts: contactName.trim()
        ? [{ full_name: contactName.trim(), email: contactEmail.trim() || undefined, phone: contactPhone.trim() || undefined }]
        : [],
    };

    if (!body.name) {
      setSaving(false);
      setErrorMsg('Il nome cliente è obbligatorio.');
      return;
    }

    try {
      const res = await fetch('/api/clients/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(`Errore: ${data?.error ?? res.status}${data?.details ? ` — ${data.details}` : ''}`);
      } else {
        setResultMsg(`Cliente salvato. ID: ${data.accountId}`);
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: '40px auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Cliente rapido</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>
        Scrivi in linguaggio naturale i dati del cliente e conferma dal riepilogo.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setStep(1)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: step===1 ? '#111827' : 'white', color: step===1 ? 'white' : '#111827' }}>
          Parla/Scrivi
        </button>
        <button onClick={() => step===2 ? null : goRiepilogo()}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: step===2 ? '#111827' : 'white', color: step===2 ? 'white' : '#111827' }}>
          Riepilogo & Conferma
        </button>
      </div>

      {step === 1 && (
        <div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button
              onClick={() => (listening ? stopDictation() : startDictation())}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: listening ? '#111827' : 'white', color: listening ? 'white' : '#111827' }}
              type="button"
              aria-pressed={listening}
            >
              {listening ? '🛑 Stop dettatura' : '🎤 Avvia dettatura'}
            </button>

            <small style={{ color: '#6b7280' }}>
              Suggerimento: “Aggiungi cliente: Rossi SRL; fascia B; pagamento 60 giorni…”
            </small>
          </div>

          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder={`Esempio:\nAggiungi cliente: Rossi SRL; fascia B; pagamento 60 giorni;\nprodotti_interesse: linea base; ultimi_volumi: 50 unità;\nultimo_esito: richiesta listino; tabu: no sconti sotto 10%;\ninteressi: consegna rapida; note: preferiscono email;\ncontatto: Mario Rossi, mario@rossisrl.it, 3331234567`}
            rows={10}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #d1d5db' }}
          />
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button onClick={goRiepilogo}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#111827', color: 'white', fontWeight: 600 }}>
              Vai al riepilogo
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Nome cliente *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Rossi SRL"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label>Fascia</label>
            <select value={fascia} onChange={e => setFascia(e.target.value as any)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}>
              <option value="">(vuoto)</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div>
            <label>Pagamento</label>
            <input value={pagamento} onChange={e => setPagamento(e.target.value)} placeholder="Es. 60 giorni"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label>Prodotti di interesse (separa con ;)</label>
            <input value={prodotti} onChange={e => setProdotti(e.target.value)} placeholder="linea base; premium"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label>Ultimi volumi</label>
            <input value={volumi} onChange={e => setVolumi(e.target.value)} placeholder="Es. 50 unità"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label>Ultimo esito</label>
            <input value={esito} onChange={e => setEsito(e.target.value)} placeholder="Es. richiesta listino"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label>Tabù (separa con ;)</label>
            <input value={tabu} onChange={e => setTabu(e.target.value)} placeholder="no sconti sotto 10%"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label>Interessi (separa con ;)</label>
            <input value={interessi} onChange={e => setInteressi(e.target.value)} placeholder="consegna rapida"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: 6, fontWeight: 600 }}>Contatto (opzionale)</div>

          <div>
            <label>Nome completo</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Mario Rossi"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>
          <div>
            <label>Email</label>
            <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="mario@azienda.it"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>
          <div>
            <label>Telefono</label>
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="3331234567"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button onClick={() => setStep(1)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white' }}>
              ← Torna al testo
            </button>
            <button onClick={onConfirmSave} disabled={saving}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#111827', color: 'white', fontWeight: 600 }}>
              {saving ? 'Salvataggio…' : 'Conferma e salva'}
            </button>
            {resultMsg && <span style={{ color: '#065f46' }}>{resultMsg}</span>}
            {errorMsg && <span style={{ color: '#b91c1c' }}>{errorMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

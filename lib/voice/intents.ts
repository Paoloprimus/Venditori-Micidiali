// lib/voice/intents.ts
export type Intent =
  | { type: 'CLIENT_CREATE'; name?: string; needsConfirm: true }
  | { type: 'CLIENT_SEARCH'; query: string; needsConfirm: true }
  | { type: 'CLIENT_UPDATE'; name: string; needsConfirm: true }
  | { type: 'NOTES_SEARCH'; accountHint: string; topic: string; needsConfirm: true }
  | { type: 'NONE' };

const CLEAN = (s: string) => s.replace(/\s+/g, ' ').trim();

function extractNameHint(t: string) {
  const m =
    t.match(/cliente\s*[:=]?\s*([\wÀ-ÿ'&.\s-]{2,})$/i) ||
    t.match(/nome\s*[:=]\s*([\wÀ-ÿ'&.\s-]{2,})/i);
  return m?.[1] ? CLEAN(m[1]) : undefined;
}

function findTopic(t: string) {
  const known = ['figli', 'telefono', 'pagamento', 'indirizzo', 'email', 'ordini', 'volumi', 'interessi', 'note'];
  for (const k of known) if (new RegExp(`\\b${k}\\b`, 'i').test(t)) return k;
  const m = t.match(/se\s+(?:c'?è|esiste|risulta)?\s*(.+)$/i);
  return m?.[1] ? CLEAN(m[1]) : '';
}

// ⬇️ NUOVO: riconosce domande brevi tipo "Rossi ha figli?"
function matchShortQuestion(raw: string): { accountHint: string; topic: string } | null {
  // Lista pronomi interrogativi da escludere (non sono nomi clienti)
  const interrogativePronouns = /^(chi|cosa|che|quando|dove|come|perch[eé]|quanto|quale)/i;
  
  const r1 = raw.match(/^\s*([\wÀ-ÿ'&.\s-]{2,})\s+ha\s+([a-zà-ÿ'&.\s-]{2,})\??\s*$/i);
  if (r1) {
    const accountHint = CLEAN(r1[1]);
    // Escludi se inizia con pronome interrogativo
    if (interrogativePronouns.test(accountHint)) return null;
    return { accountHint, topic: CLEAN(r1[2]) };
  }

  // es. "su Rossi ci sono info su figli?", "di Rossi informazioni su pagamento?"
  const r2 = raw.match(/^\s*(?:su|di|del|della)\s+([\wÀ-ÿ'&.\s-]{2,})\s+(?:c'?\s?è|ci sono|info|informazioni|dettagli|note|appunti)\s+(.+?)\??\s*$/i);
  if (r2) {
    const accountHint = CLEAN(r2[1]);
    // Escludi se inizia con pronome interrogativo
    if (interrogativePronouns.test(accountHint)) return null;
    return { accountHint, topic: CLEAN(r2[2]) };
  }

  // es. "sai se di Rossi ci sono note sui figli?"
  const r3 = raw.match(/(?:di|del|della)\s+([\wÀ-ÿ'&.\s-]{2,}).*\b(figli|telefono|email|pagamento|indirizzo|ordini|volumi|interessi|note)\b/i);
  if (r3) {
    const accountHint = CLEAN(r3[1]);
    // Escludi se inizia con pronome interrogativo
    if (interrogativePronouns.test(accountHint)) return null;
    return { accountHint, topic: CLEAN(r3[2]) };
  }

  return null;
}

export function matchIntent(raw: string) {
  const text = CLEAN(raw.toLowerCase());

  // --- NUOVO CLIENTE ---
  if (/^(?:nuovo|aggiungi|crea)\s+cliente\b/.test(text)) {
    const name =
      (raw.match(/(?:nuovo|aggiungi|crea)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw))?.trim();
    return { type: 'CLIENT_CREATE', name, needsConfirm: true } as const;
  }

  // --- RICERCA CLIENTE ---
  if (/^(?:cerca|ricerca|trova)\s+cliente\b/.test(text)) {
    const q = (raw.match(/(?:cerca|ricerca|trova)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw)) || '';
    return { type: 'CLIENT_SEARCH', query: CLEAN(q), needsConfirm: true } as const;
  }

  // --- MODIFICA CLIENTE ---
  if (/^(?:modifica|aggiorna)\s+cliente\b/.test(text)) {
    const name =
      (raw.match(/(?:modifica|aggiorna)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw))?.trim();
    return name
      ? ({ type: 'CLIENT_UPDATE', name, needsConfirm: true } as const)
      : ({ type: 'CLIENT_UPDATE', name: '', needsConfirm: true } as const);
  }

  // --- NOTE / Q&A SU CLIENTE (frasi lunghe)
  if (/note|non ricordo|cerca\s+nelle\s+note|guarda\s+nelle\s+note/i.test(text)) {
    const acc = (raw.match(/(?:di|del|della)\s+([\wÀ-ÿ'&.\s-]{2,})/i)?.[1] ?? extractNameHint(raw) ?? '').trim();
    const topic = findTopic(raw);
    if (acc && topic) return { type: 'NOTES_SEARCH', accountHint: acc, topic, needsConfirm: true } as const;
  }

  // --- DISABILITATO: domande brevi "Rossi ha figli?"
  // PROBLEMA: Questo pattern causa flusso rotto (chiede conferma, poi non cerca)
  // TODO: Fixare frontend per completare flusso, oppure passare al sistema semantico
  /*
  const short = matchShortQuestion(raw);
  if (short) {
    return { type: 'NOTES_SEARCH', accountHint: short.accountHint, topic: short.topic, needsConfirm: true } as const;
  }
  */

  return { type: 'NONE' } as const;
}

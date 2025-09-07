// lib/voice/intents.ts
export type Intent =
  | { type: 'CLIENT_CREATE'; name?: string; payload?: Record<string, unknown> }
  | { type: 'CLIENT_SEARCH'; query: string }
  | { type: 'CLIENT_UPDATE'; name: string; payload?: Record<string, unknown> }
  | { type: 'NONE' };

const CLEAN = (s: string) => s.replace(/\s+/g, ' ').trim();

// Estrai "cliente" o "nome" o pattern da frasi libere italiane
function extractNameHint(t: string) {
  // esempi catturati: "cliente Rossi SRL", "nome: Rossi SRL", "Rossi SRL"
  const m =
    t.match(/cliente\s*[:=]?\s*([\wÀ-ÿ'&.\s-]{2,})$/i) ||
    t.match(/nome\s*[:=]\s*([\wÀ-ÿ'&.\s-]{2,})/i);
  return m?.[1] ? CLEAN(m[1]) : undefined;
}

export function matchIntent(raw: string): Intent {
  const text = CLEAN(raw.toLowerCase());

  // --- NUOVO CLIENTE ---
  // varianti: "nuovo cliente", "aggiungi cliente", "crea cliente"
  if (/^(?:nuovo|aggiungi|crea)\s+cliente\b/.test(text)) {
    // prova ad estrarre un nome dopo "cliente"
    const name =
      (raw.match(/(?:nuovo|aggiungi|crea)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw))?.trim();
    return { type: 'CLIENT_CREATE', name };
  }

  // --- RICERCA CLIENTE ---
  // varianti: "cerca cliente Rossi", "ricerca cliente", "trova cliente"
  if (/^(?:cerca|ricerca|trova)\s+cliente\b/.test(text)) {
    const q = (raw.match(/(?:cerca|ricerca|trova)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw)) || '';
    return q ? { type: 'CLIENT_SEARCH', query: CLEAN(q) } : { type: 'CLIENT_SEARCH', query: '' };
  }

  // --- MODIFICA CLIENTE ---
  // varianti: "modifica cliente Rossi", "aggiorna cliente Rossi"
  if (/^(?:modifica|aggiorna)\s+cliente\b/.test(text)) {
    const name =
      (raw.match(/(?:modifica|aggiorna)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw))?.trim();
    return name ? { type: 'CLIENT_UPDATE', name } : { type: 'CLIENT_UPDATE', name: '' };
  }

  return { type: 'NONE' };
}

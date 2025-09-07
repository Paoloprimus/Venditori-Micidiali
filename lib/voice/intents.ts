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
  // cattura soggetti semplici: "figli", "telefono", "pagamento", ecc.
  const known = ['figli', 'telefono', 'pagamento', 'indirizzo', 'email', 'ordini', 'volumi'];
  for (const k of known) if (new RegExp(`\\b${k}\\b`, 'i').test(t)) return k;
  // fallback: prendi la parte dopo "se"
  const m = t.match(/se\s+(?:c'?è|esiste|risulta)?\s*(.+)$/i);
  return m?.[1] ? CLEAN(m[1]) : '';
}

export function matchIntent(raw: string): Intent {
  const text = CLEAN(raw.toLowerCase());

  // NUOVO
  if (/^(?:nuovo|aggiungi|crea)\s+cliente\b/.test(text)) {
    const name =
      (raw.match(/(?:nuovo|aggiungi|crea)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw))?.trim();
    return { type: 'CLIENT_CREATE', name, needsConfirm: true };
  }

  // RICERCA
  if (/^(?:cerca|ricerca|trova)\s+cliente\b/.test(text)) {
    const q = (raw.match(/(?:cerca|ricerca|trova)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw)) || '';
    return { type: 'CLIENT_SEARCH', query: CLEAN(q), needsConfirm: true };
  }

  // MODIFICA
  if (/^(?:modifica|aggiorna)\s+cliente\b/.test(text)) {
    const name =
      (raw.match(/(?:modifica|aggiorna)\s+cliente\s*[:=]?\s*([^\n;,.]+)/i)?.[1] ?? extractNameHint(raw))?.trim();
    return name ? { type: 'CLIENT_UPDATE', name, needsConfirm: true } : { type: 'CLIENT_UPDATE', name: '', needsConfirm: true };
  }

  // NOTE: domande tipo "non ricordo se rossi ha figli", "cerca nelle note di rossi ...", ecc.
  if (/note|non ricordo|cerca\s+nelle\s+note|guarda\s+nelle\s+note/i.test(text)) {
    // prendi nome cliente
    const acc =
      (raw.match(/(?:di|del|della)\s+([\wÀ-ÿ'&.\s-]{2,})/i)?.[1] ?? extractNameHint(raw) ?? '').trim();
    // prendi topic
    const topic = findTopic(raw);
    if (acc && topic) return { type: 'NOTES_SEARCH', accountHint: acc, topic, needsConfirm: true };
  }

  return { type: 'NONE' };
}

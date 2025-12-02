/**
 * ============================================================================
 * SISTEMA NLU UNIFICATO - Repping
 * ============================================================================
 * 
 * Parser unificato per tutti gli intent dell'app.
 * Sostituisce i 3 sistemi frammentati precedenti.
 * 
 * Caratteristiche:
 * - Pattern matching robusto per italiano parlato
 * - Entity extraction (nomi, date, importi)
 * - Context-aware (considera conversazione precedente)
 * - Supporto vocale (riconosce varianti parlate)
 * 
 * ============================================================================
 */

// ==================== TIPI ====================

export type IntentType =
  // CLIENTI
  | 'client_count'           // "Quanti clienti ho?"
  | 'client_list'            // "Lista clienti"
  | 'client_search'          // "Cerca cliente Rossi"
  | 'client_detail'          // "Info su Rossi" / "Scheda Bianchi"
  | 'client_create'          // "Nuovo cliente Mario Rossi"
  // VISITE
  | 'visit_count'            // "Quante visite ho fatto?"
  | 'visit_history'          // "Quando ho visto Rossi?"
  | 'visit_last'             // "Ultima visita a Bianchi"
  | 'visit_create'           // "Registra visita da Rossi"
  | 'visit_today'            // "Visite di oggi"
  // VENDITE
  | 'sales_summary'          // "Quanto ho venduto?"
  | 'sales_by_client'        // "Vendite a Rossi"
  | 'sales_today'            // "Vendite di oggi"
  | 'sales_month'            // "Vendite del mese"
  // PRODOTTI
  | 'product_discussed'      // "Cosa ho discusso con Rossi?"
  | 'product_missing'        // "Prodotti mancanti"
  | 'product_search'         // "Cerca prodotto X"
  // PLANNING
  | 'planning_today'         // "Cosa devo fare oggi?"
  | 'planning_callbacks'     // "Chi devo richiamare?"
  | 'planning_week'          // "Planning settimanale"
  // NAVIGAZIONE
  | 'navigate'               // "Apri clienti" / "Vai a visite"
  // GENERICI
  | 'greet'                  // "Ciao" / "Buongiorno"
  | 'help'                   // "Aiuto" / "Cosa posso fare?"
  | 'thanks'                 // "Grazie"
  | 'confirm'                // "Sì" / "Confermo"
  | 'cancel'                 // "No" / "Annulla"
  | 'unknown';               // Non riconosciuto

export type EntityType = {
  clientName?: string;       // Nome cliente estratto
  clientId?: string;         // ID cliente (se risolto)
  date?: string;             // Data (oggi, ieri, settimana, mese)
  amount?: number;           // Importo
  productName?: string;      // Nome prodotto
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  outcome?: string;          // Esito visita
  targetPage?: 'clients' | 'visits' | 'products' | 'documents' | 'settings'; // Per navigazione
};

export type ParsedIntent = {
  intent: IntentType;
  confidence: number;        // 0-1
  entities: EntityType;
  raw: string;               // Input originale
  normalized: string;        // Input normalizzato
  needsConfirmation: boolean;
  suggestedResponse?: string; // Risposta suggerita per intent semplici
};

export type ConversationContext = {
  lastIntent?: IntentType;
  lastEntities?: EntityType;
  currentTopic?: 'clients' | 'visits' | 'sales' | 'products' | 'planning' | null;
  recentClientName?: string;
};

// ==================== NORMALIZZAZIONE ====================

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuovi accenti
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;:]+$/g, ''); // rimuovi punteggiatura finale
}

// ==================== PATTERN MATCHING ====================

// Pattern per riconoscere nomi (dopo verbi/preposizioni)
const NAME_AFTER_PATTERNS = [
  /(?:cliente?|da|a|di|del|della|con|per|su)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{1,30}?)(?:\s|$)/i,
  /(?:chiamato|nome)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{1,30}?)(?:\s|$)/i,
];

// Pattern per importi
const AMOUNT_PATTERN = /(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)?/i;

// Pattern per date/periodi
const PERIOD_PATTERNS: [RegExp, EntityType['period']][] = [
  [/\b(oggi|giornata|stamattina|stasera)\b/i, 'today'],
  [/\b(settimana|questa settimana|ultimi 7 giorni)\b/i, 'week'],
  [/\b(mese|questo mese|mensile|ultimi 30 giorni)\b/i, 'month'],
  [/\b(trimestre|questo trimestre|ultimi 3 mesi)\b/i, 'quarter'],
  [/\b(anno|quest'anno|annuale)\b/i, 'year'],
];

// ==================== INTENT PATTERNS ====================

type IntentPattern = {
  intent: IntentType;
  patterns: RegExp[];
  confidence: number;
  extractEntities?: (text: string, match: RegExpMatchArray | null) => EntityType;
};

const INTENT_PATTERNS: IntentPattern[] = [
  // === CLIENTI ===
  {
    intent: 'client_count',
    patterns: [
      /\b(quanti|numero|conta|totale)\b.*\b(client[ei]|negozi|bar|locali)\b/i,
      /\b(client[ei]|negozi)\b.*\b(quanti|totale|numero)\b/i,
    ],
    confidence: 0.95,
  },
  {
    intent: 'client_list',
    patterns: [
      /\b(lista|elenco|mostra(mi)?|dammi|elenca(mi)?)\b.*\b(client[ei]|negozi)\b/i,
      /\b(client[ei]|negozi)\b.*\b(lista|elenco)\b/i,
      /^(i )?(miei )?client[ei]$/i,
      /\b(come si chiamano)\b.*\b(client[ei])?\b/i,
      /^(i )?nomi(\?)?$/i,
    ],
    confidence: 0.9,
  },
  {
    intent: 'client_search',
    patterns: [
      /\b(cerca|trova|cerco)\b.*\b(cliente?)\b/i,
      /\b(cliente?)\b.*\b(cerca|trova)\b/i,
      /\b(dov'e|dov e|dove trovo)\b.*\b(cliente?)?\b/i,
    ],
    confidence: 0.9,
    extractEntities: (text) => {
      for (const p of NAME_AFTER_PATTERNS) {
        const m = text.match(p);
        if (m?.[1]) return { clientName: m[1].trim() };
      }
      return {};
    },
  },
  {
    intent: 'client_detail',
    patterns: [
      /\b(info|informazioni|dettagli|scheda)\b.*\b(su|di|del)\b\s+/i,
      /\b(apri|mostra)\b.*\b(scheda|profilo)\b/i,
      /^(su|di)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]+)$/i,
    ],
    confidence: 0.85,
    extractEntities: (text) => {
      for (const p of NAME_AFTER_PATTERNS) {
        const m = text.match(p);
        if (m?.[1]) return { clientName: m[1].trim() };
      }
      // Pattern diretto "su Rossi"
      const direct = text.match(/^(?:su|di)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]+)$/i);
      if (direct?.[1]) return { clientName: direct[1].trim() };
      return {};
    },
  },
  {
    intent: 'client_create',
    patterns: [
      /\b(nuovo|nuova|crea|aggiungi|inserisci)\b.*\b(cliente?)\b/i,
      /\b(cliente?)\b.*\b(nuovo|nuova)\b/i,
    ],
    confidence: 0.9,
    extractEntities: (text) => {
      const m = text.match(/cliente?\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,})/i);
      return m?.[1] ? { clientName: m[1].trim() } : {};
    },
  },

  // === VISITE ===
  {
    intent: 'visit_count',
    patterns: [
      /\b(quante|numero|conta|totale)\b.*\b(visite|chiamate|attivita)\b/i,
      /\b(visite|chiamate)\b.*\b(quante|totale|numero)\b/i,
    ],
    confidence: 0.95,
    extractEntities: (text) => {
      for (const [p, period] of PERIOD_PATTERNS) {
        if (p.test(text)) return { period };
      }
      return {};
    },
  },
  {
    intent: 'visit_history',
    patterns: [
      /\b(quando|ultima volta)\b.*\b(visto|visitato|andato|sentito)\b/i,
      /\b(storico|cronologia)\b.*\b(visite|attivita)\b/i,
      /\b(visite|attivita)\b.*\b(a|da|di|con)\b/i,
    ],
    confidence: 0.85,
    extractEntities: (text) => {
      for (const p of NAME_AFTER_PATTERNS) {
        const m = text.match(p);
        if (m?.[1]) return { clientName: m[1].trim() };
      }
      return {};
    },
  },
  {
    intent: 'visit_last',
    patterns: [
      /\b(ultima)\b.*\b(visita|chiamata|volta)\b/i,
      /\b(l'ultima|l ultima)\b.*\b(visita|volta)\b/i,
    ],
    confidence: 0.9,
    extractEntities: (text) => {
      for (const p of NAME_AFTER_PATTERNS) {
        const m = text.match(p);
        if (m?.[1]) return { clientName: m[1].trim() };
      }
      return {};
    },
  },
  {
    intent: 'visit_create',
    patterns: [
      /\b(registra|salva|aggiungi|nuova)\b.*\b(visita|chiamata)\b/i,
      /\b(visita|chiamata)\b.*\b(registra|nuova|da)\b/i,
      /\b(sono stato|ho visto|ho chiamato)\b/i,
    ],
    confidence: 0.9,
    extractEntities: (text) => {
      const entities: EntityType = {};
      // Nome cliente
      for (const p of NAME_AFTER_PATTERNS) {
        const m = text.match(p);
        if (m?.[1]) { entities.clientName = m[1].trim(); break; }
      }
      // Importo
      const amountMatch = text.match(AMOUNT_PATTERN);
      if (amountMatch) {
        entities.amount = parseFloat(amountMatch[1].replace(',', '.'));
      }
      return entities;
    },
  },
  {
    intent: 'visit_today',
    patterns: [
      /\b(visite|chiamate|attivita)\b.*\b(oggi|di oggi|odierne)\b/i,
      /\b(oggi)\b.*\b(visite|chiamate|fatto)\b/i,
      /\b(cosa ho fatto oggi)\b/i,
    ],
    confidence: 0.95,
    extractEntities: () => ({ period: 'today' }),
  },

  // === VENDITE ===
  {
    intent: 'sales_summary',
    patterns: [
      /\b(quanto|totale)\b.*\b(venduto|fatturato|incassato)\b/i,
      /\b(vendite|fatturato|incasso)\b.*\b(totale|quanto)\b/i,
      /\b(riepilogo|riassunto)\b.*\b(vendite|fatturato)\b/i,
    ],
    confidence: 0.9,
    extractEntities: (text) => {
      for (const [p, period] of PERIOD_PATTERNS) {
        if (p.test(text)) return { period };
      }
      return { period: 'month' }; // default
    },
  },
  {
    intent: 'sales_by_client',
    patterns: [
      /\b(vendite|venduto|fatturato)\b.*\b(a|da|con|per)\b/i,
      /\b(quanto)\b.*\b(compra|spende|ordina)\b/i,
    ],
    confidence: 0.85,
    extractEntities: (text) => {
      for (const p of NAME_AFTER_PATTERNS) {
        const m = text.match(p);
        if (m?.[1]) return { clientName: m[1].trim() };
      }
      return {};
    },
  },
  {
    intent: 'sales_today',
    patterns: [
      /\b(vendite|venduto|fatturato)\b.*\b(oggi|stamattina)\b/i,
      /\b(oggi)\b.*\b(venduto|fatturato)\b/i,
    ],
    confidence: 0.95,
    extractEntities: () => ({ period: 'today' }),
  },
  {
    intent: 'sales_month',
    patterns: [
      /\b(vendite|venduto|fatturato)\b.*\b(mese|mensile|questo mese)\b/i,
      /\b(mese|mensile)\b.*\b(venduto|fatturato)\b/i,
    ],
    confidence: 0.95,
    extractEntities: () => ({ period: 'month' }),
  },

  // === PRODOTTI ===
  {
    intent: 'product_discussed',
    patterns: [
      /\b(cosa|quali|che)\b.*\b(prodott[oi]|articol[oi])\b.*\b(discusso|parlato|proposto|venduto)\b/i,
      /\b(prodott[oi])\b.*\b(discussi|trattati)\b/i,
    ],
    confidence: 0.85,
    extractEntities: (text) => {
      for (const p of NAME_AFTER_PATTERNS) {
        const m = text.match(p);
        if (m?.[1]) return { clientName: m[1].trim() };
      }
      return {};
    },
  },
  {
    intent: 'product_missing',
    patterns: [
      /\b(prodott[oi]|articol[oi])\b.*\b(mancant[ei]|esaurit[oi]|finit[oi])\b/i,
      /\b(mancant[ei]|esaurit[oi])\b.*\b(prodott[oi]|articol[oi])\b/i,
      /\b(cosa manca|che manca)\b/i,
    ],
    confidence: 0.9,
  },
  {
    intent: 'product_search',
    patterns: [
      /\b(cerca|trova|cerco)\b.*\b(prodott[oi]|articol[oi])\b/i,
      /\b(prodott[oi]|articol[oi])\b.*\b(cerca|trova)\b/i,
    ],
    confidence: 0.85,
    extractEntities: (text) => {
      const m = text.match(/prodott[oi]?\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,})/i);
      return m?.[1] ? { productName: m[1].trim() } : {};
    },
  },

  // === PLANNING ===
  {
    intent: 'planning_today',
    patterns: [
      /\b(cosa|che)\b.*\b(devo|dovrei|ho da)\b.*\b(fare|oggi)\b/i,
      /\b(programma|agenda|planning)\b.*\b(oggi|giornata)\b/i,
      /\b(oggi)\b.*\b(programma|agenda|fare)\b/i,
      /^cosa (devo fare|faccio)( oggi)?$/i,
    ],
    confidence: 0.9,
    extractEntities: () => ({ period: 'today' }),
  },
  {
    intent: 'planning_callbacks',
    patterns: [
      /\b(chi|quali)\b.*\b(devo|dovrei)\b.*\b(richiamare|ricontattare|risentire)\b/i,
      /\b(da richiamare|da ricontattare)\b/i,
      /\b(callback|follow.?up|richiami)\b/i,
    ],
    confidence: 0.9,
  },
  {
    intent: 'planning_week',
    patterns: [
      /\b(programma|agenda|planning)\b.*\b(settimana|settimanale)\b/i,
      /\b(settimana|prossimi giorni)\b.*\b(programma|fare)\b/i,
    ],
    confidence: 0.85,
    extractEntities: () => ({ period: 'week' }),
  },

  // === NAVIGAZIONE ===
  {
    intent: 'navigate',
    patterns: [
      /\b(apri|vai a|mostra|portami)\b.*\b(client[ei]|lista client[ei])\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(visit[ae]|lista visit[ae])\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(prodott[oi]|catalogo)\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(document[oi]|doc)\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(impostazioni|settings)\b/i,
      /^(client[ei]|visit[ae]|prodott[oi]|document[oi]|impostazioni)$/i,
    ],
    confidence: 0.95,
    extractEntities: (text) => {
      if (/client[ei]/i.test(text)) return { targetPage: 'clients' as const };
      if (/visit[ae]/i.test(text)) return { targetPage: 'visits' as const };
      if (/prodott[oi]|catalogo/i.test(text)) return { targetPage: 'products' as const };
      if (/document[oi]|doc\b/i.test(text)) return { targetPage: 'documents' as const };
      if (/impostazioni|settings/i.test(text)) return { targetPage: 'settings' as const };
      return {};
    },
  },

  // === GENERICI ===
  {
    intent: 'greet',
    patterns: [
      /^(ciao|salve|buongiorno|buonasera|buon pomeriggio|hey|ehi|ehila)$/i,
      /^(ciao|salve|buongiorno|buonasera)\s+(come va|tutto bene)?$/i,
    ],
    confidence: 0.99,
  },
  {
    intent: 'help',
    patterns: [
      /\b(aiuto|help|aiutami)\b/i,
      /\b(cosa|che cosa)\b.*\b(puoi|sai|posso)\b.*\b(fare|chiedere)\b/i,
      /\b(come funziona)\b/i,
      /^(come posso|cosa posso)\b/i,
    ],
    confidence: 0.95,
  },
  {
    intent: 'thanks',
    patterns: [
      /^(grazie|thanks|perfetto|ottimo|ok grazie|va bene grazie)$/i,
    ],
    confidence: 0.99,
  },
  {
    intent: 'confirm',
    patterns: [
      /^(s[iì]|esatto|ok|confermo|procedi|vai|certo|assolutamente|ovvio)$/i,
      /^(s[iì] grazie|ok perfetto)$/i,
    ],
    confidence: 0.99,
  },
  {
    intent: 'cancel',
    patterns: [
      /^(no|annulla|stop|ferma|cancella|lascia stare|non importa)$/i,
      /^(no grazie|non serve)$/i,
    ],
    confidence: 0.99,
  },
];

// ==================== PARSER PRINCIPALE ====================

export function parseIntent(
  input: string,
  context?: ConversationContext
): ParsedIntent {
  const raw = input;
  const normalized = normalize(input);

  // 1. Prova tutti i pattern
  for (const { intent, patterns, confidence, extractEntities } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const entities = extractEntities?.(normalized, match) ?? {};
        
        // Se manca il nome cliente ma c'è nel contesto recente, usalo
        if (!entities.clientName && context?.recentClientName) {
          // Solo per intent che potrebbero riferirsi al cliente precedente
          if (['visit_history', 'visit_last', 'sales_by_client', 'product_discussed', 'client_detail'].includes(intent)) {
            entities.clientName = context.recentClientName;
          }
        }

        return {
          intent,
          confidence,
          entities,
          raw,
          normalized,
          needsConfirmation: ['visit_create', 'client_create'].includes(intent),
          suggestedResponse: getSuggestedResponse(intent, entities),
        };
      }
    }
  }

  // 2. Prova inferenza dal contesto
  if (context?.lastIntent && context?.currentTopic) {
    const inferred = inferFromContext(normalized, context);
    if (inferred) return inferred;
  }

  // 3. Fallback: cerca di capire almeno il topic
  const topicHint = detectTopic(normalized);
  
  return {
    intent: 'unknown',
    confidence: 0.1,
    entities: {},
    raw,
    normalized,
    needsConfirmation: false,
    suggestedResponse: getUnknownResponse(topicHint),
  };
}

// ==================== HELPERS ====================

function detectTopic(text: string): ConversationContext['currentTopic'] {
  if (/client[ei]|negozi|bar|pasticcerie|locali/i.test(text)) return 'clients';
  if (/visit[ae]|chiamat[ae]|attivita/i.test(text)) return 'visits';
  if (/vend|fattur|incass|euro|€/i.test(text)) return 'sales';
  if (/prodott|articol|mancant/i.test(text)) return 'products';
  if (/programma|agenda|planning|fare|devo/i.test(text)) return 'planning';
  return null;
}

function inferFromContext(text: string, context: ConversationContext): ParsedIntent | null {
  // Follow-up comuni basati sul contesto
  
  // "E le email?" dopo aver chiesto i clienti
  if (context.currentTopic === 'clients' && /\b(email|mail)\b/i.test(text)) {
    return {
      intent: 'client_list',
      confidence: 0.8,
      entities: {},
      raw: text,
      normalized: text,
      needsConfirmation: false,
      suggestedResponse: undefined,
    };
  }

  // "E oggi?" dopo aver parlato di vendite
  if (context.currentTopic === 'sales' && /\boggi\b/i.test(text)) {
    return {
      intent: 'sales_today',
      confidence: 0.75,
      entities: { period: 'today' },
      raw: text,
      normalized: text,
      needsConfirmation: false,
    };
  }

  return null;
}

function getSuggestedResponse(intent: IntentType, entities: EntityType): string | undefined {
  switch (intent) {
    case 'greet':
      return "Ciao! Come posso aiutarti oggi?";
    case 'help':
      return "Posso aiutarti con:\n• Clienti (cerca, conta, lista)\n• Visite (storico, registra, oggi)\n• Vendite (totali, per cliente)\n• Prodotti (discussi, mancanti)\n• Planning (oggi, richiami)";
    case 'thanks':
      return "Prego! 😊";
    case 'confirm':
      return undefined; // Gestito dal chiamante
    case 'cancel':
      return "Ok, annullato.";
    default:
      return undefined;
  }
}

function getUnknownResponse(topic: ConversationContext['currentTopic']): string {
  if (topic === 'clients') {
    return "Non ho capito. Prova: \"Quanti clienti ho?\", \"Cerca cliente Rossi\", \"Lista clienti\"";
  }
  if (topic === 'visits') {
    return "Non ho capito. Prova: \"Quando ho visto Rossi?\", \"Visite di oggi\", \"Registra visita\"";
  }
  if (topic === 'sales') {
    return "Non ho capito. Prova: \"Quanto ho venduto?\", \"Vendite del mese\", \"Vendite a Rossi\"";
  }
  if (topic === 'products') {
    return "Non ho capito. Prova: \"Prodotti mancanti\", \"Cosa ho discusso con Rossi?\"";
  }
  return "Non ho capito. Posso aiutarti con clienti, visite, vendite, prodotti o planning. Prova a chiedere!";
}

// ==================== EXPORT UTILITY ====================

export function updateContext(
  current: ConversationContext,
  parsed: ParsedIntent
): ConversationContext {
  return {
    lastIntent: parsed.intent,
    lastEntities: parsed.entities,
    currentTopic: detectTopic(parsed.normalized) ?? current.currentTopic,
    recentClientName: parsed.entities.clientName ?? current.recentClientName,
  };
}

// Test rapido (rimuovere in produzione)
export function testParser() {
  const tests = [
    "Quanti clienti ho?",
    "Cerca cliente Rossi",
    "Quando ho visto Bianchi l'ultima volta?",
    "Quanto ho venduto questo mese?",
    "Registra visita da Mario Rossi, 500 euro",
    "Cosa devo fare oggi?",
    "Chi devo richiamare?",
    "Ciao",
    "Grazie",
  ];
  
  for (const t of tests) {
    const result = parseIntent(t);
    console.log(`"${t}" → ${result.intent} (${result.confidence}) entities:`, result.entities);
  }
}


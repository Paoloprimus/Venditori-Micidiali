/**
 * ============================================================================
 * SISTEMA NLU UNIFICATO v2.0 - REPPING Co-Pilot
 * ============================================================================
 * 
 * Parser intelligente e proattivo per agenti di commercio HoReCa.
 * 
 * Caratteristiche:
 * - Pattern matching robusto per italiano parlato + dialettale
 * - Context retention multi-turn (5+ scambi)
 * - Gestione pronomi e riferimenti impliciti
 * - Suggerimenti proattivi post-risposta
 * - Entity extraction avanzata (date relative, filtri multipli)
 * - Fallback con disambiguazione intelligente
 * 
 * ============================================================================
 */

// ==================== TIPI ====================

export type IntentType =
  // CLIENTI
  | 'client_count'           // "Quanti clienti ho?"
  | 'client_list'            // "Lista clienti" / "Elencali"
  | 'client_search'          // "Cerca cliente Rossi"
  | 'composite_query'        // "Clienti di Verona che hanno comprato vino" (filtri multipli)
  | 'client_detail'          // "Info su Rossi" / "Dimmi tutto su Bianchi"
  | 'client_create'          // "Nuovo cliente Mario Rossi"
  | 'client_inactive'        // "Chi non vedo da un mese?"
  // VISITE
  | 'visit_count'            // "Quante visite ho fatto?"
  | 'visit_history'          // "Quando ho visto Rossi?"
  | 'visit_last'             // "Ultima visita a Bianchi"
  | 'visit_create'           // "Registra visita da Rossi"
  | 'visit_today'            // "Visite di oggi"
  | 'visit_by_position'      // "Il secondo cliente di oggi"
  // VENDITE
  | 'sales_summary'          // "Quanto ho venduto?"
  | 'sales_by_client'        // "Vendite a Rossi"
  | 'sales_by_product'       // "A chi ho venduto birra?"
  | 'sales_today'            // "Vendite di oggi"
  | 'sales_period'           // "Vendite del mese" / "della settimana"
  // RICERCA NOTE
  | 'notes_search'           // "Rossi paga contanti?" / "figli di Bianchi?"
  // PRODOTTI
  | 'product_discussed'      // "Cosa ho discusso con Rossi?"
  | 'product_sold_to'        // "Chi compra birra?"
  | 'product_missing'        // "Prodotti mancanti"
  | 'product_search'         // "Cerca prodotto X"
  | 'product_price'          // "Quanto costa X?" / "Prezzo di Y"
  | 'product_stock'          // "Quante giacenze di X?"
  | 'product_not_proposed'   // "Cosa non ho mai proposto a Rossi?"
  // PLANNING
  | 'planning_today'         // "Cosa devo fare oggi?"
  | 'planning_callbacks'     // "Chi devo richiamare?"
  | 'planning_week'          // "Planning settimanale"
  // REPORT
  | 'report_generate'        // "Stampa report" / "Esporta PDF"
  // NAVIGAZIONE
  | 'navigate'               // "Apri clienti" / "Vai a visite"
  // FOLLOW-UP (gestiti dal contesto)
  | 'followup_list'          // "Elencali" / "Chi sono?"
  | 'followup_count'         // "Quanti sono?"
  | 'followup_period'        // "E ieri?" / "E la settimana scorsa?"
  | 'followup_detail'        // "Dimmi di più" / "Dettagli"
  // ═══════════════════════════════════════════════════════════════
  // 🆕 ANALYTICS / BI - Domande analitiche complesse
  // ═══════════════════════════════════════════════════════════════
  | 'analytics_top_clients'       // "Chi sono i miei migliori clienti?"
  | 'analytics_top_products'      // "Qual è il prodotto più venduto?"
  | 'analytics_client_trend'      // "Come sta andando Rossi?" / "Trend cliente"
  | 'analytics_sales_comparison'  // "Confronta questo mese con lo scorso"
  | 'analytics_avg_order'         // "Qual è il mio ordine medio?"
  | 'analytics_best_day'          // "In che giorno vendo di più?"
  | 'analytics_zone_performance'  // "Qual è la mia zona migliore?"
  | 'analytics_lost_clients'      // "Quali clienti ho perso?"
  | 'analytics_growing_clients'   // "Quali clienti stanno crescendo?"
  | 'analytics_forecast'          // "Previsione fatturato fine mese"
  | 'analytics_target_progress'   // "Sono in linea con l'obiettivo?"
  | 'analytics_cross_sell'        // "Cosa posso proporre a Rossi?"
  | 'analytics_never_bought'      // "Chi non ha mai comprato X?"
  // 🆕 ANALISI GEOGRAFICHE (abbiamo coordinate!)
  | 'revenue_per_km'              // "Quale prodotto rende di più per km?"
  | 'clients_nearby'              // "Clienti più vicini a me"
  | 'km_traveled'                 // "Quanti km ho fatto questo mese?"
  // 🆕 DOMANDE IMPOSSIBILI (gestite con alternative)
  | 'analytics_impossible'        // Domande che richiedono dati non disponibili (es: margini)
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
  date?: string;             // Data specifica
  dateRelative?: 'today' | 'yesterday' | 'day_before' | 'last_week' | 'last_month';
  amount?: number;           // Importo
  productName?: string;      // Nome prodotto
  period?: 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'quarter' | 'year';
  periodCompare?: 'previous' | 'same_last_year'; // Per confronti
  outcome?: string;          // Esito visita
  targetPage?: 'clients' | 'visits' | 'products' | 'documents' | 'settings';
  position?: number;         // Posizione ordinale (primo=1, secondo=2, etc.)
  searchTerm?: string;       // Termine di ricerca generico (per notes_search)
  city?: string;             // Città filtro
  localeType?: string;       // Tipo locale (bar, ristorante, etc.)
  reportType?: 'clients' | 'visits' | 'sales';
  inactivityDays?: number;   // Giorni di inattività
  // 🆕 Analytics entities
  metric?: 'revenue' | 'orders' | 'visits' | 'avg_order' | 'volume';
  sortBy?: 'amount' | 'frequency' | 'recency' | 'growth';
  limit?: number;            // Top N
  comparisonType?: 'vs_previous' | 'vs_last_year' | 'trend';
  // 🆕 Per domande impossibili
  missingData?: string[];    // Dati mancanti (es: ["km", "margini"])
  alternativeIntent?: IntentType; // Intent alternativo suggerito
  // 🆕 Per query composite (filtri multipli)
  productBought?: string;    // Prodotto acquistato ("che hanno comprato vino")
  minAmount?: number;        // Importo minimo ("> 500€")
  maxAmount?: number;        // Importo massimo ("< 1000€")
  hasOrdered?: boolean;      // Ha effettuato ordini (true/false)
  notVisitedDays?: number;   // Non visitato da X giorni
  filters?: string[];        // Lista filtri applicati per debug/display
};

// 🆕 Tipo per gestire risposte a domande impossibili
export type ImpossibleQueryResponse = {
  originalQuestion: string;
  reason: string;              // Perché non possiamo rispondere
  missingData: string[];       // Quali dati mancano
  alternativeQuestions: {
    question: string;
    intent: IntentType;
    entities?: EntityType;
  }[];
};

export type ProactiveSuggestion = {
  text: string;              // Testo del suggerimento
  intent: IntentType;        // Intent che verrebbe triggerato
  entities?: EntityType;     // Entità pre-compilate
  priority: 'high' | 'medium' | 'low';
};

export type ParsedIntent = {
  intent: IntentType;
  confidence: number;        // 0-1
  entities: EntityType;
  raw: string;               // Input originale
  normalized: string;        // Input normalizzato
  needsConfirmation: boolean;
  suggestedResponse?: string;
  // 🆕 Proattività
  proactiveSuggestions?: ProactiveSuggestion[];
  // 🆕 Disambiguazione
  disambiguation?: {
    question: string;
    options: { label: string; intent: IntentType; entities: EntityType }[];
  };
};

// 🆕 Contesto conversazionale potenziato
export type ConversationContext = {
  // Storico ultimi 5 turni
  history: {
    intent: IntentType;
    entities: EntityType;
    timestamp: number;
  }[];
  // Topic corrente inferito
  currentTopic?: 'clients' | 'visits' | 'sales' | 'products' | 'planning' | null;
  // Entità "in focus" (l'ultimo cliente/prodotto menzionato)
  focusClient?: { name: string; id?: string };
  focusProduct?: string;
  // Ultimo risultato (per follow-up "elencali")
  lastResultType?: 'count' | 'list' | 'detail' | 'search';
  lastResultCount?: number;
  // Filtri attivi (per follow-up)
  activeFilters?: {
    city?: string;
    localeType?: string;
    period?: EntityType['period'];
  };
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

// ==================== ENTITY EXTRACTION ====================

// Nomi dopo preposizioni/verbi
const NAME_PATTERNS = [
  /(?:cliente?|da|a|di|del|della|con|per|su|chiamato|nome)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{1,30}?)(?:\s*[?.,;!]|\s+(?:ha|paga|compra|e|che|quando|come)|$)/i,
  /^([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,20})\s*\?$/i, // "Rossi?" → nome + ?
  /(?:tutto\s+(?:su|di)|parlami\s+di|dimmi\s+di)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{1,30})/i,
];

// Importi
const AMOUNT_PATTERN = /(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)?/i;

// Periodi temporali
const PERIOD_MAP: [RegExp, EntityType['period']][] = [
  [/\b(oggi|giornata|stamattina|stasera|stamani)\b/i, 'today'],
  [/\b(ieri|giornata di ieri)\b/i, 'yesterday'],
  [/\b(questa settimana|settimana corrente|ultimi 7 giorni)\b/i, 'week'],
  [/\b(settimana scorsa|scorsa settimana|la settimana passata)\b/i, 'last_week'],
  [/\b(questo mese|mese corrente|mensile)\b/i, 'month'],
  [/\b(mese scorso|scorso mese|il mese passato)\b/i, 'last_month'],
  [/\b(trimestre|questo trimestre|ultimi 3 mesi)\b/i, 'quarter'],
  [/\b(anno|quest'anno|annuale|l'anno)\b/i, 'year'],
];

// Posizioni ordinali
const ORDINAL_MAP: [RegExp, number][] = [
  [/\b(primo|prima|1°|1o)\b/i, 1],
  [/\b(secondo|seconda|2°|2o)\b/i, 2],
  [/\b(terzo|terza|3°|3o)\b/i, 3],
  [/\b(quarto|quarta|4°|4o)\b/i, 4],
  [/\b(quinto|quinta|5°|5o)\b/i, 5],
  [/\b(ultimo|ultima)\b/i, -1], // -1 = ultimo
];

// Tipi locale HoReCa
const LOCALE_TYPES = [
  'bar', 'ristorante', 'pizzeria', 'hotel', 'albergo', 'pasticceria',
  'gelateria', 'pub', 'osteria', 'trattoria', 'bistrot', 'cafe', 'caffetteria',
  'enoteca', 'wine bar', 'cocktail bar', 'discoteca', 'locale notturno',
  'stabilimento balneare', 'agriturismo', 'b&b', 'bed and breakfast',
  'mensa', 'catering', 'food truck', 'chiosco'
];

// ═══════════════════════════════════════════════════════════════
// 🆕 ESTRAZIONE FILTRI COMPOSITI
// ═══════════════════════════════════════════════════════════════

// Lista città italiane comuni per matching
const ITALIAN_CITIES = [
  'milano', 'roma', 'torino', 'napoli', 'firenze', 'bologna', 'venezia', 
  'verona', 'padova', 'genova', 'palermo', 'catania', 'bari', 'brescia',
  'bergamo', 'modena', 'parma', 'reggio emilia', 'vicenza', 'treviso',
  'udine', 'trieste', 'trento', 'bolzano', 'ancona', 'perugia', 'pescara',
  'pisa', 'livorno', 'lucca', 'arezzo', 'siena', 'rimini', 'ravenna',
  'ferrara', 'piacenza', 'como', 'varese', 'monza', 'lecco', 'mantova',
  'cremona', 'pavia', 'lodi', 'alessandria', 'novara', 'biella', 'cuneo',
  'asti', 'savona', 'imperia', 'la spezia', 'massa', 'carrara', 'pistoia',
  'prato', 'grosseto', 'terni', 'rieti', 'viterbo', 'latina', 'frosinone',
  'caserta', 'salerno', 'avellino', 'benevento', 'foggia', 'taranto',
  'brindisi', 'lecce', 'potenza', 'matera', 'cosenza', 'catanzaro',
  'reggio calabria', 'crotone', 'vibo valentia', 'messina', 'siracusa',
  'ragusa', 'enna', 'caltanissetta', 'agrigento', 'trapani', 'sassari',
  'nuoro', 'oristano', 'cagliari', 'olbia', 'tempio pausania',
];

/**
 * Estrae tutti i filtri da una query composita
 * Es: "clienti di Verona che hanno comprato vino il mese scorso"
 * → { city: 'Verona', productBought: 'vino', period: 'last_month', filters: ['city', 'product', 'period'] }
 */
function extractCompositeFilters(text: string): EntityType {
  const entities: EntityType = {};
  const filters: string[] = [];
  const normalized = text.toLowerCase();

  // 1. CITTÀ - "di Verona", "a Milano", "in Roma"
  const cityPatterns = [
    /\b(?:di|a|in|da)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)\b/gi,
    /\b([A-ZÀ-Ú][a-zà-ú]+)\b/gi, // fallback: cerca città note
  ];
  
  for (const pattern of cityPatterns) {
    const matches = text.matchAll(pattern);
    for (const m of matches) {
      const cityCandidate = m[1]?.toLowerCase();
      if (cityCandidate && ITALIAN_CITIES.includes(cityCandidate)) {
        entities.city = capitalizeWords(cityCandidate);
        filters.push('city');
        break;
      }
    }
    if (entities.city) break;
  }

  // 2. TIPO LOCALE - "bar", "ristoranti", "hotel"
  for (const tipo of LOCALE_TYPES) {
    if (normalized.includes(tipo.toLowerCase())) {
      entities.localeType = tipo;
      filters.push('localeType');
      break;
    }
  }

  // 3. PRODOTTO ACQUISTATO - "che hanno comprato vino", "che comprano birra"
  const productPatterns = [
    /(?:compra(?:to|no)?|acquista(?:to|no)?|ordina(?:to|no)?|vend(?:o|uto))\s+(?:il\s+|la\s+|lo\s+|l')?(\w+)/i,
    /(?:chi|a chi)\s+(?:compra|vendo|ho venduto)\s+(?:il\s+|la\s+)?(\w+)/i,
  ];
  
  for (const pattern of productPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const product = match[1].toLowerCase();
      // Evita parole comuni
      if (!['un', 'una', 'il', 'la', 'lo', 'gli', 'le', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra'].includes(product)) {
        entities.productBought = product;
        filters.push('productBought');
        break;
      }
    }
  }

  // 4. IMPORTO MINIMO/MASSIMO - "> 500€", "sopra 1000", "meno di 200"
  const minAmountMatch = text.match(/(?:>|maggiore\s+di|sopra\s+(?:i\s+)?|più\s+di|almeno)\s*(\d+)\s*€?/i);
  if (minAmountMatch) {
    entities.minAmount = parseInt(minAmountMatch[1]);
    filters.push('minAmount');
  }
  
  const maxAmountMatch = text.match(/(?:<|minore\s+di|sotto\s+(?:i\s+)?|meno\s+di|massimo)\s*(\d+)\s*€?/i);
  if (maxAmountMatch) {
    entities.maxAmount = parseInt(maxAmountMatch[1]);
    filters.push('maxAmount');
  }

  // 5. NON VISITATO DA X GIORNI/SETTIMANE/MESI
  const inactivityMatch = text.match(/(?:non\s+(?:vedo|visito)|inattiv[io])\s+(?:da|per)\s+(?:più\s+di\s+)?(\d+)\s*(giorn[oi]|settiman[ae]|mes[ei]|ann[oi])?/i);
  if (inactivityMatch) {
    let days = parseInt(inactivityMatch[1]);
    const unit = inactivityMatch[2]?.toLowerCase() ?? 'giorni';
    
    if (unit.startsWith('settiman')) days *= 7;
    else if (unit.startsWith('mes')) days *= 30;
    else if (unit.startsWith('ann')) days *= 365;
    
    entities.notVisitedDays = days;
    entities.inactivityDays = days; // Compatibilità con intent esistente
    filters.push('notVisitedDays');
  }

  // 6. PERIODO TEMPORALE
  const periodPatterns: [RegExp, EntityType['period']][] = [
    [/\b(oggi|today)\b/i, 'today'],
    [/\b(ieri|yesterday)\b/i, 'yesterday'],
    [/\b(questa settimana|this week)\b/i, 'week'],
    [/\b(settimana scorsa|last week)\b/i, 'last_week'],
    [/\b(questo mese|this month)\b/i, 'month'],
    [/\b(mese scorso|il mese scorso|last month)\b/i, 'last_month'],
    [/\b(quest'anno|this year)\b/i, 'year'],
  ];
  
  for (const [pattern, period] of periodPatterns) {
    if (pattern.test(text)) {
      entities.period = period;
      filters.push('period');
      break;
    }
  }

  // 7. HA EFFETTUATO ORDINI
  if (/\b(che\s+)?(?:hanno|ha|con)\s+(?:fatto\s+)?ordini?\b/i.test(text)) {
    entities.hasOrdered = true;
    filters.push('hasOrdered');
  }
  if (/\b(che\s+)?(?:non\s+hanno|non\s+ha|senza)\s+ordini?\b/i.test(text)) {
    entities.hasOrdered = false;
    filters.push('hasOrdered');
  }

  // Salva lista filtri applicati
  if (filters.length > 0) {
    entities.filters = filters;
  }

  return entities;
}

// ═══════════════════════════════════════════════════════════════

// Estrae tutte le entità possibili da un testo
function extractEntities(text: string, context?: ConversationContext): EntityType {
  const entities: EntityType = {};
  const normalized = normalize(text);

  // 1. Nome cliente
  for (const pattern of NAME_PATTERNS) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      // Evita falsi positivi (parole comuni)
      if (!isCommonWord(name)) {
        entities.clientName = capitalizeWords(name);
        break;
      }
    }
  }

  // 2. Periodo temporale
  for (const [pattern, period] of PERIOD_MAP) {
    if (pattern.test(normalized)) {
      entities.period = period;
      break;
    }
  }

  // 3. Importo
  const amountMatch = normalized.match(AMOUNT_PATTERN);
  if (amountMatch) {
    entities.amount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  // 4. Posizione ordinale
  for (const [pattern, pos] of ORDINAL_MAP) {
    if (pattern.test(normalized)) {
      entities.position = pos;
      break;
    }
  }

  // 5. Tipo locale
  for (const tipo of LOCALE_TYPES) {
    if (normalized.includes(tipo)) {
      entities.localeType = tipo;
      break;
    }
  }

  // 6. Città (dopo "di", "a", "da")
  const cityMatch = normalized.match(/\b(?:di|a|da|in)\s+([A-Za-zÀ-ÿ]{3,})\b/i);
  if (cityMatch && !isCommonWord(cityMatch[1]) && !LOCALE_TYPES.includes(cityMatch[1])) {
    entities.city = capitalizeWords(cityMatch[1]);
  }

  // 7. Prodotto (per ricerche tipo "chi compra birra")
  const productMatch = normalized.match(/(?:compra|vend\w+|ordina\w*|preso|prendono)\s+([\wÀ-ÿ\s]{2,20})/i);
  if (productMatch) {
    entities.productName = productMatch[1].trim();
  }

  // 8. Termine di ricerca per note (es. "paga contanti", "ha figli")
  const noteTerms = [
    /(?:paga|pagamento)\s*([\wÀ-ÿ\s]{2,20})/i,
    /(?:ha|hanno|con)\s+(figli|moglie|marito|cane|gatto|allergi\w+)/i,
    /(?:preferisce|preferenza|piace)\s+([\wÀ-ÿ\s]{2,20})/i,
    /(?:interess\w+|hobby)\s*(?:a|in|per)?\s*([\wÀ-ÿ\s]{2,20})/i,
  ];
  for (const pattern of noteTerms) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      entities.searchTerm = match[1].trim();
      break;
    }
  }

  // 9. Giorni inattività
  const inactiveMatch = normalized.match(/(?:non vedo|non visito|inattiv\w*)\s*(?:da)?\s*(?:piu di|oltre)?\s*(\d+)\s*(?:giorni?|settiman\w*|mes[ei])/i);
  if (inactiveMatch) {
    let days = parseInt(inactiveMatch[1]);
    if (/settiman/i.test(normalized)) days *= 7;
    if (/mes/i.test(normalized)) days *= 30;
    entities.inactivityDays = days;
  }

  // 10. Report type
  if (/report|pdf|export|stampa|esporta/i.test(normalized)) {
    if (/client/i.test(normalized)) entities.reportType = 'clients';
    else if (/visit/i.test(normalized)) entities.reportType = 'visits';
    else if (/vend|fattur/i.test(normalized)) entities.reportType = 'sales';
  }

  // 🆕 Risoluzione pronomi dal contesto
  if (context?.focusClient && !entities.clientName) {
    // "lui", "lei", "quello", "questo cliente", "gli", "le"
    if (/\b(lui|lei|quello|questa?|gli|le)\b/i.test(normalized)) {
      entities.clientName = context.focusClient.name;
      if (context.focusClient.id) entities.clientId = context.focusClient.id;
    }
  }

  return entities;
}

// Parole comuni da non confondere con nomi
function isCommonWord(word: string): boolean {
  const common = new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
    'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
    'e', 'o', 'ma', 'se', 'che', 'chi', 'cosa', 'come', 'quando', 'dove', 'perche',
    'questo', 'quello', 'quale', 'quanto',
    'tutto', 'tutti', 'molto', 'poco', 'tanto', 'troppo',
    'oggi', 'ieri', 'domani', 'sempre', 'mai', 'spesso',
    'cliente', 'clienti', 'visita', 'visite', 'vendita', 'vendite',
    'prodotto', 'prodotti', 'ordine', 'ordini',
    'primo', 'secondo', 'terzo', 'ultimo', 'prossimo',
    'nuovo', 'nuova', 'nuovi', 'nuove',
    ...LOCALE_TYPES
  ]);
  return common.has(word.toLowerCase());
}

function capitalizeWords(str: string): string {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// ==================== INTENT PATTERNS ====================

type IntentMatcher = {
  intent: IntentType;
  patterns: RegExp[];
  confidence: number;
  entityExtractor?: (text: string, match: RegExpMatchArray) => Partial<EntityType>;
  // 🆕 Suggerimenti proattivi associati
  proactiveAfter?: (entities: EntityType, context?: ConversationContext) => ProactiveSuggestion[];
};

const INTENT_MATCHERS: IntentMatcher[] = [
  // ═══════════════════════════════════════════════════════════════
  // CLIENTI
  // ═══════════════════════════════════════════════════════════════
  
  {
    intent: 'client_count',
    patterns: [
      /\b(quanti|numero|conta|totale)\b.*\b(client[ei]|negozi|bar|locali)\b/i,
      /\b(client[ei]|negozi)\b.*\b(quanti|totale|numero)\b/i,
    ],
    confidence: 0.95,
    proactiveAfter: (entities) => {
      const suggestions: ProactiveSuggestion[] = [];
      if (!entities.city && !entities.localeType) {
        suggestions.push({
          text: "Vuoi filtrarli per città o tipo locale?",
          intent: 'client_count',
          priority: 'medium'
        });
      }
      suggestions.push({
        text: "Vuoi vedere la lista?",
        intent: 'client_list',
        priority: 'low'
      });
      return suggestions;
    }
  },

  // 🆕 QUERY COMPOSITE - Filtri multipli combinati
  // Esempi: "clienti di Verona che hanno comprato vino"
  //         "bar di Milano che non vedo da un mese"
  //         "ristoranti con ordine > 500€ questa settimana"
  {
    intent: 'composite_query',
    patterns: [
      // Pattern con "che hanno/che non" + condizione
      /\b(client[ei]|negozi|bar|ristoranti?|locali)\b.*\b(che|quali)\b.*\b(hanno|ha|non|compra|comprato|venduto|ordinato|vedo|visito)\b/i,
      // Pattern con città + tipo locale
      /\b(client[ei]|bar|ristoranti?)\b.*\b(di|a|in)\b\s+([A-ZÀ-Ú][a-zà-ú]+)\b.*\b(che|con|dove)\b/i,
      // Pattern con filtro importo
      /\b(client[ei]|ordini|vendite)\b.*\b(>|<|maggiore|minore|sopra|sotto)\b.*\b(\d+)\s*€?\b/i,
      // Pattern "chi compra X" o "a chi vendo X"
      /\b(chi|a chi)\b.*\b(compra|vendo|ho venduto|acquista)\b.*\b(\w+)\b/i,
      // Pattern con periodo + condizione
      /\b(client[ei])\b.*\b(non vedo|non visito|inattiv)\b.*\b(da|per)\b/i,
    ],
    confidence: 0.95, // Alta priorità per query composite
    entityExtractor: (text) => {
      return extractCompositeFilters(text);
    }
  },

  {
    intent: 'client_list',
    patterns: [
      /\b(lista|elenco|mostra(?:mi)?|dammi|elenca(?:mi)?|vedi)\b.*\b(client[ei]|negozi)\b/i,
      /\b(client[ei]|negozi)\b.*\b(lista|elenco)\b/i,
      /^(i )?(miei )?client[ei]$/i,
      /\b(come si chiamano)\b.*\b(client[ei])?\b/i,
      /^(i )?nomi(\?)?$/i,
    ],
    confidence: 0.9,
    proactiveAfter: () => [{
      text: "Vuoi cercare un cliente specifico?",
      intent: 'client_search',
      priority: 'low'
    }]
  },

  {
    intent: 'client_search',
    patterns: [
      /\b(cerca|trova|cerco)\b.*\b(cliente?)\b/i,
      /\b(cliente?)\b.*\b(cerca|trova)\b/i,
      /\b(dov'e|dov e|dove trovo|conosci)\b/i,
    ],
    confidence: 0.9,
  },

  {
    intent: 'client_detail',
    patterns: [
      /\b(info|informazioni|dettagli|scheda|profilo)\b.*\b(su|di|del|della)\b/i,
      /\b(dimmi|parlami|raccontami)\b.*\b(tutto|di piu)\b.*\b(su|di)\b/i,
      /\b(apri|mostra)\b.*\b(scheda|profilo)\b/i,
      /^(su|di)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]+)$/i,
      // 🆕 Pattern "Rossi?" (solo nome con punto interrogativo)
      /^([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,20})\s*\?$/i,
    ],
    confidence: 0.85,
    proactiveAfter: (entities) => {
      if (entities.clientName) {
        return [
          {
            text: `Vuoi vedere lo storico visite a ${entities.clientName}?`,
            intent: 'visit_history',
            entities: { clientName: entities.clientName },
            priority: 'high'
          },
          {
            text: `Quanto hai venduto a ${entities.clientName}?`,
            intent: 'sales_by_client',
            entities: { clientName: entities.clientName },
            priority: 'medium'
          }
        ];
      }
      return [];
    }
  },

  {
    intent: 'client_create',
    patterns: [
      /\b(nuovo|nuova|crea|aggiungi|inserisci)\b.*\b(cliente?)\b/i,
      /\b(cliente?)\b.*\b(nuovo|nuova)\b/i,
    ],
    confidence: 0.9,
  },

  // 🆕 Clienti inattivi
  {
    intent: 'client_inactive',
    patterns: [
      /\b(chi|quali)\b.*\b(non vedo|non visito|inattiv\w*|dormient\w*)\b/i,
      /\b(client[ei])\b.*\b(inattiv\w*|dormient\w*|trascurat\w*)\b/i,
      /\b(da\s+(?:quanto|troppo)\s+tempo)\b.*\b(non (?:vedo|visito))\b/i,
      /\b(non vedo|non visito)\b.*\b(da (?:un|due|tre|\d+))\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      // Default 30 giorni se non specificato
      const match = text.match(/(\d+)\s*(?:giorni?|settiman\w*|mes[ei])/i);
      let days = 30;
      if (match) {
        days = parseInt(match[1]);
        if (/settiman/i.test(text)) days *= 7;
        if (/mes/i.test(text)) days *= 30;
      }
      return { inactivityDays: days };
    },
    proactiveAfter: () => [{
      text: "Vuoi che ti prepari una lista da richiamare?",
      intent: 'planning_callbacks',
      priority: 'high'
    }]
  },

  // ═══════════════════════════════════════════════════════════════
  // RICERCA NELLE NOTE
  // ═══════════════════════════════════════════════════════════════
  
  {
    intent: 'notes_search',
    patterns: [
      // "Rossi paga contanti?", "Bianchi ha figli?"
      /^([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,20})\s+(paga|ha|hanno|preferisce|compra|ordina|vuole)/i,
      // "cerca nelle note", "nelle note di Rossi"
      /\b(cerca|trova|guarda)\b.*\b(nelle?\s+note)\b/i,
      /\b(note|annotazioni)\b.*\b(di|su|del|della)\b/i,
      // "che tipo di pagamento usa Rossi?"
      /\b(che\s+tipo|come|quale)\b.*\b(pagament\w*|preferenz\w*)\b/i,
      // "ricordo/ricordi" + cliente
      /\b(non )?ricord[oi]\b.*\b(se|che|cosa)\b/i,
    ],
    confidence: 0.85,
    entityExtractor: (text) => {
      // Estrae sia il nome che il termine cercato
      const nameMatch = text.match(/^([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,20})\s+/i);
      const searchMatch = text.match(/(?:paga|pagamento)\s*([\wÀ-ÿ]+)|(?:ha|hanno)\s+([\wÀ-ÿ]+)/i);
      return {
        clientName: nameMatch?.[1]?.trim(),
        searchTerm: searchMatch?.[1] || searchMatch?.[2]
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // VISITE
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'visit_count',
    patterns: [
      /\b(quante|numero|conta|totale)\b.*\b(visite|chiamate|attivita)\b/i,
      /\b(visite|chiamate)\b.*\b(quante|totale|numero)\b/i,
    ],
    confidence: 0.95,
    proactiveAfter: (entities) => {
      if (entities.period === 'today') {
        return [{
          text: "Vuoi vedere i dettagli delle visite di oggi?",
          intent: 'visit_today',
          priority: 'high'
        }];
      }
      return [{
        text: "Vuoi confrontare con il periodo precedente?",
        intent: 'visit_count',
        priority: 'low'
      }];
    }
  },

  {
    intent: 'visit_history',
    patterns: [
      /\b(quando|ultima volta)\b.*\b(visto|visitato|andato|sentito|passato)\b/i,
      /\b(storico|cronologia|tutte le)\b.*\b(visite|attivita)\b/i,
    ],
    confidence: 0.85,
    proactiveAfter: (entities) => {
      if (entities.clientName) {
        return [{
          text: "Vuoi registrare una nuova visita?",
          intent: 'visit_create',
          entities: { clientName: entities.clientName },
          priority: 'medium'
        }];
      }
      return [];
    }
  },

  {
    intent: 'visit_last',
    patterns: [
      /\b(ultima)\b.*\b(visita|chiamata|volta)\b/i,
      /\b(l'ultima|l ultima)\b.*\b(visita|volta|che ho fatto)\b/i,
    ],
    confidence: 0.9,
  },

  // 🆕 Visita per posizione
  {
    intent: 'visit_by_position',
    patterns: [
      /\b(primo|secondo|terzo|quarto|quinto|ultimo)\b.*\b(cliente|visita)\b.*\b(oggi|ieri)\b/i,
      /\b(oggi|ieri)\b.*\b(primo|secondo|terzo|ultimo)\b.*\b(cliente|visita)\b/i,
      /\b(cliente|visita)\s+(numero|n\.?|#)\s*(\d+)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      const entities: Partial<EntityType> = {};
      // Posizione
      for (const [pattern, pos] of ORDINAL_MAP) {
        if (pattern.test(text)) {
          entities.position = pos;
          break;
        }
      }
      // Periodo (oggi/ieri)
      if (/ieri/i.test(text)) entities.period = 'yesterday';
      else entities.period = 'today';
      return entities;
    },
    proactiveAfter: (entities) => [{
      text: "Vuoi vedere tutti i clienti visitati " + (entities.period === 'yesterday' ? 'ieri' : 'oggi') + "?",
      intent: 'visit_today',
      entities: { period: entities.period },
      priority: 'low'
    }]
  },

  {
    intent: 'visit_create',
    patterns: [
      /\b(registra|salva|aggiungi|nuova|segna)\b.*\b(visita|chiamata|passaggio)\b/i,
      /\b(visita|chiamata)\b.*\b(registra|nuova|da)\b/i,
      /\b(sono stato|ho visto|ho chiamato|ho visitato|sono passato)\b/i,
    ],
    confidence: 0.9,
  },

  {
    intent: 'visit_today',
    patterns: [
      /\b(visite|chiamate|attivita|clienti)\b.*\b(oggi|di oggi|odiern[ei]|stamattina)\b/i,
      /\b(oggi|stamattina)\b.*\b(visite|chiamate|fatto|clienti visitati)\b/i,
      /\b(cosa ho fatto oggi)\b/i,
      /\b(riepilogo|riassunto)\b.*\b(oggi|giornata)\b/i,
    ],
    confidence: 0.95,
    proactiveAfter: (_, context) => {
      const suggestions: ProactiveSuggestion[] = [];
      if (context?.lastResultCount && context.lastResultCount > 0) {
        suggestions.push({
          text: "Vuoi il totale venduto oggi?",
          intent: 'sales_today',
          priority: 'high'
        });
      }
      return suggestions;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // VENDITE
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'sales_summary',
    patterns: [
      /\b(quanto|totale)\b.*\b(venduto|fatturato|incassato)\b/i,
      /\b(vendite|fatturato|incasso)\b.*\b(totale|quanto)\b/i,
      /\b(riepilogo|riassunto)\b.*\b(vendite|fatturato)\b/i,
    ],
    confidence: 0.9,
    proactiveAfter: (entities) => {
      const suggestions: ProactiveSuggestion[] = [];
      if (entities.period !== 'today') {
        suggestions.push({
          text: "Vuoi confrontare con il periodo precedente?",
          intent: 'sales_summary',
          priority: 'low'
        });
      }
      return suggestions;
    }
  },

  {
    intent: 'sales_by_client',
    patterns: [
      /\b(vendite|venduto|fatturato)\b.*\b(a|da|con|per)\s+([\wÀ-ÿ])/i,
      /\b(quanto)\b.*\b(compra|spende|ordina)\b/i,
      /\b(quanto gli|quanto le)\b.*\b(vend\w*|fattur\w*)\b/i,
    ],
    confidence: 0.85,
    proactiveAfter: (entities) => {
      if (entities.clientName) {
        return [{
          text: `Vuoi vedere cosa hai discusso con ${entities.clientName}?`,
          intent: 'product_discussed',
          entities: { clientName: entities.clientName },
          priority: 'medium'
        }];
      }
      return [];
    }
  },

  // 🆕 Vendite per prodotto
  {
    intent: 'sales_by_product',
    patterns: [
      /\b(a chi|chi)\b.*\b(vend\w+|venduto)\b.*\b([\wÀ-ÿ]+)\b/i,
      /\b(chi)\b.*\b(compra|ordina|prende)\b.*\b([\wÀ-ÿ]+)\b/i,
      /\b([\wÀ-ÿ]+)\b.*\b(a chi|chi)\b.*\b(vend\w*|preso)\b/i,
    ],
    confidence: 0.85,
    entityExtractor: (text) => {
      const match = text.match(/(?:venduto|compra|ordina|prende)\s+([\wÀ-ÿ\s]{2,20})/i);
      return match ? { productName: match[1].trim() } : {};
    }
  },

  {
    intent: 'sales_today',
    patterns: [
      /\b(vendite|venduto|fatturato|incassato)\b.*\b(oggi|stamattina)\b/i,
      /\b(oggi|stamattina)\b.*\b(venduto|fatturato|incassato)\b/i,
    ],
    confidence: 0.95,
  },

  {
    intent: 'sales_period',
    patterns: [
      /\b(vendite|venduto|fatturato)\b.*\b(mese|settimana|anno|trimestre)\b/i,
      /\b(mese|settimana|anno|trimestre)\b.*\b(venduto|fatturato)\b/i,
    ],
    confidence: 0.95,
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODOTTI
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'product_discussed',
    patterns: [
      /\b(cosa|quali|che)\b.*\b(prodott[oi]|articol[oi])\b.*\b(discusso|parlato|proposto|venduto|trattato)\b/i,
      /\b(prodott[oi])\b.*\b(discussi|trattati|proposti)\b/i,
      /\b(di cosa)\b.*\b(parlato|discusso)\b/i,
    ],
    confidence: 0.85,
  },

  // 🆕 Chi compra un prodotto
  {
    intent: 'product_sold_to',
    patterns: [
      /\b(chi)\b.*\b(compra|ordina|prende|vuole)\b/i,
      /\b(a chi)\b.*\b(vendo|venduto|proposto)\b/i,
    ],
    confidence: 0.85,
    entityExtractor: (text) => {
      const match = text.match(/(?:compra|ordina|prende|vuole|vendo|venduto)\s+([\wÀ-ÿ\s]{2,20})/i);
      return match ? { productName: match[1].trim() } : {};
    }
  },

  {
    intent: 'product_missing',
    patterns: [
      /\b(prodott[oi]|articol[oi])\b.*\b(mancant[ei]|esaurit[oi]|finit[oi])\b/i,
      /\b(mancant[ei]|esaurit[oi])\b.*\b(prodott[oi]|articol[oi])\b/i,
      /\b(cosa manca|che manca|cosa e finito)\b/i,
    ],
    confidence: 0.9,
  },

  {
    intent: 'product_search',
    patterns: [
      /\b(cerca|trova|cerco)\b.*\b(prodott[oi]|articol[oi])\b/i,
      /\b(prodott[oi]|articol[oi])\b.*\b(cerca|trova)\b/i,
      /\b(abbiamo|c'e|ce)\b.*\b([\wÀ-ÿ]+)\b.*\b(catalogo|disponibil)\b/i,
    ],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════
  // PLANNING
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'planning_today',
    patterns: [
      /\b(cosa|che)\b.*\b(devo|dovrei|ho da)\b.*\b(fare|oggi)\b/i,
      /\b(programma|agenda|planning|piano)\b.*\b(oggi|giornata)\b/i,
      /\b(oggi)\b.*\b(programma|agenda|fare)\b/i,
      /^cosa (devo fare|faccio)( oggi)?$/i,
      /\b(da dove|come)\b.*\b(comincio|inizio|parto)\b/i,
    ],
    confidence: 0.9,
    proactiveAfter: () => [{
      text: "Vuoi che ti suggerisca i clienti da visitare?",
      intent: 'client_inactive',
      priority: 'high'
    }]
  },

  {
    intent: 'planning_callbacks',
    patterns: [
      /\b(chi|quali)\b.*\b(devo|dovrei)\b.*\b(richiamare|ricontattare|risentire)\b/i,
      /\b(da richiamare|da ricontattare|da risentire)\b/i,
      /\b(callback|follow.?up|richiami|sollecit\w*)\b/i,
      /\b(chi)\b.*\b(aspetta|attende)\b.*\b(risposta|conferma)\b/i,
    ],
    confidence: 0.9,
  },

  {
    intent: 'planning_week',
    patterns: [
      /\b(programma|agenda|planning)\b.*\b(settimana|settimanale)\b/i,
      /\b(settimana|prossimi giorni)\b.*\b(programma|fare|organizzare)\b/i,
    ],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'report_generate',
    patterns: [
      /\b(genera|crea|stampa|esporta|scarica)\b.*\b(report|pdf|documento|riepilogo)\b/i,
      /\b(report|pdf)\b.*\b(client[ei]|visite|vendite)\b/i,
      /\b(voglio|fammi|dammi)\b.*\b(pdf|report|documento)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      if (/client/i.test(text)) return { reportType: 'clients' as const };
      if (/visit/i.test(text)) return { reportType: 'visits' as const };
      if (/vend|fattur/i.test(text)) return { reportType: 'sales' as const };
      return {};
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // NAVIGAZIONE
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'navigate',
    patterns: [
      /\b(apri|vai a|mostra|portami|fammi vedere)\b.*\b(client[ei]|lista client[ei])\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(visit[ae]|lista visit[ae])\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(prodott[oi]|catalogo)\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(document[oi]|doc|file)\b/i,
      /\b(apri|vai a|mostra|portami)\b.*\b(impostazioni|settings|config)\b/i,
    ],
    confidence: 0.95,
    entityExtractor: (text) => {
      if (/client[ei]/i.test(text)) return { targetPage: 'clients' as const };
      if (/visit[ae]/i.test(text)) return { targetPage: 'visits' as const };
      if (/prodott[oi]|catalogo/i.test(text)) return { targetPage: 'products' as const };
      if (/document[oi]|doc|file/i.test(text)) return { targetPage: 'documents' as const };
      if (/impostazioni|settings|config/i.test(text)) return { targetPage: 'settings' as const };
      return {};
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // FOLLOW-UP (sensibili al contesto)
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'followup_list',
    patterns: [
      /^(elenca(?:li|meli)?|lista(?:li)?|chi sono|quali sono|mostra(?:meli)?|dimm[ei]li)(\?)?$/i,
      /^(fammi|dammi)\s+(la lista|i nomi|l'elenco)(\?)?$/i,
    ],
    confidence: 0.95,
  },

  {
    intent: 'followup_count',
    patterns: [
      /^(quanti|quante)\s+(sono|ce ne sono|ne ho)(\?)?$/i,
      /^(conta(?:li)?|totale)(\?)?$/i,
    ],
    confidence: 0.95,
  },

  {
    intent: 'followup_period',
    patterns: [
      /^e\s+(oggi|ieri|questa settimana|questo mese|la settimana scorsa|il mese scorso)(\?)?$/i,
      /^(e|invece)\s+(prima|dopo|il periodo precedente)(\?)?$/i,
    ],
    confidence: 0.9,
  },

  {
    intent: 'followup_detail',
    patterns: [
      /^(dimmi di piu|dettagli|piu info|approfondisci)(\?)?$/i,
      /^(e|cosa|quali)\s+(altro|altri)(\?)?$/i,
    ],
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════════════════════════
  // 🆕 ANALYTICS / BI - Domande analitiche complesse
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'analytics_top_clients',
    patterns: [
      /\b(chi|qual[ei])\b.*\b(miglior[ei]|top|principal[ei])\b.*\b(client[ei])\b/i,
      /\b(client[ei])\b.*\b(miglior[ei]|top|principal[ei]|più important[ei])\b/i,
      /\b(chi)\b.*\b(fattura|compra|ordina)\b.*\b(di più|maggiormente)\b/i,
      /\b(classifica|ranking)\b.*\b(client[ei])\b/i,
      /\b(top)\s*(\d+)?\s*(client[ei])\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      const match = text.match(/top\s*(\d+)/i);
      return { 
        limit: match ? parseInt(match[1]) : 10,
        sortBy: 'amount' as const,
        metric: 'revenue' as const
      };
    },
    proactiveAfter: () => [{
      text: "Vuoi vedere anche il trend di crescita?",
      intent: 'analytics_growing_clients',
      priority: 'medium'
    }]
  },

  {
    intent: 'analytics_top_products',
    patterns: [
      /\b(qual[ei]?|che)\b.*\b(prodott[oi])\b.*\b(più vendut[oi]|vend[eo] di più|migliore?)\b/i,
      /\b(prodott[oi])\b.*\b(più vendut[oi]|bestseller|top)\b/i,
      /\b(cosa)\b.*\b(vendo|venduto)\b.*\b(di più|maggiormente)\b/i,
      /\b(classifica|ranking)\b.*\b(prodott[oi])\b/i,
    ],
    confidence: 0.9,
    entityExtractor: () => ({ metric: 'revenue' as const, sortBy: 'amount' as const })
  },

  {
    intent: 'analytics_client_trend',
    patterns: [
      /\b(come)\b.*\b(sta andando|va|procede)\b/i,
      /\b(trend|andamento|evoluzione)\b.*\b(di|del|della)?\s*([\wÀ-ÿ]+)?\b/i,
      /\b(sta|stanno)\b.*\b(crescendo|calando|migliorando|peggiorando)\b/i,
    ],
    confidence: 0.85,
    entityExtractor: (text) => {
      const nameMatch = text.match(/(?:di|del|della|con)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,20})/i);
      return nameMatch ? { clientName: nameMatch[1].trim() } : {};
    }
  },

  {
    intent: 'analytics_sales_comparison',
    patterns: [
      /\b(confronta|compara|paragona)\b.*\b(mese|settimana|periodo)\b/i,
      /\b(rispetto|vs|versus|contro)\b.*\b(scorso|precedente|anno)\b/i,
      /\b(differenza|variazione)\b.*\b(tra|fra|rispetto)\b/i,
      /\b(questo mese)\b.*\b(vs|rispetto|contro)\b.*\b(scorso)\b/i,
      /\b(come)\b.*\b(rispetto|confronto)\b.*\b(prima|scorso|precedente)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      if (/anno\s+scorso|stesso\s+periodo/i.test(text)) {
        return { comparisonType: 'vs_last_year' as const };
      }
      return { comparisonType: 'vs_previous' as const };
    }
  },

  {
    intent: 'analytics_avg_order',
    patterns: [
      /\b(qual[ei]?|quanto)\b.*\b(ordine|scontrino|vendita)\b.*\b(medi[oa])\b/i,
      /\b(medi[oa])\b.*\b(ordine|scontrino|vendita|importo)\b/i,
      /\b(average|avg)\b.*\b(order)\b/i,
      /\b(in media)\b.*\b(quanto|vendo|fattur)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: () => ({ metric: 'avg_order' as const })
  },

  {
    intent: 'analytics_best_day',
    patterns: [
      /\b(in che|quale)\b.*\b(giorno)\b.*\b(vendo|fattur|lavoro)\b.*\b(di più|meglio)\b/i,
      /\b(giorno|giornata)\b.*\b(miglior[ei]|più produttiv[oa])\b/i,
      /\b(quando)\b.*\b(vendo|fattur)\b.*\b(di più|meglio)\b/i,
    ],
    confidence: 0.85,
  },

  {
    intent: 'analytics_zone_performance',
    patterns: [
      /\b(qual[ei]?)\b.*\b(zona|città|area|territorio)\b.*\b(miglior[ei]|rend[ei]|più)\b/i,
      /\b(zona|città|area)\b.*\b(più produttiv[oa]|miglior[ei]|rend[ei] di più)\b/i,
      /\b(dove)\b.*\b(vendo|fattur)\b.*\b(di più|meglio)\b/i,
      /\b(performance|rendimento)\b.*\b(per zona|territoriale)\b/i,
    ],
    confidence: 0.9,
  },

  {
    intent: 'analytics_lost_clients',
    patterns: [
      /\b(qual[ei]?|chi)\b.*\b(client[ei])\b.*\b(pers[oi]|perso|abbandona)\b/i,
      /\b(client[ei])\b.*\b(pers[oi]|non compra più|sparit[oi])\b/i,
      /\b(chi)\b.*\b(non (compra|ordina) più|smesso)\b/i,
      /\b(client[ei])\b.*\b(inattiv[ei]|dormient[ei])\b.*\b(da tempo|da molto)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: () => ({ inactivityDays: 90, sortBy: 'recency' as const })
  },

  {
    intent: 'analytics_growing_clients',
    patterns: [
      /\b(qual[ei]?|chi)\b.*\b(client[ei])\b.*\b(cresc|miglior|aumenta)\b/i,
      /\b(client[ei])\b.*\b(in crescita|che crescono|stanno migliorando)\b/i,
      /\b(chi)\b.*\b(sta comprando di più|ordina più di prima)\b/i,
      /\b(trend positiv[oi])\b.*\b(client[ei])\b/i,
    ],
    confidence: 0.9,
    entityExtractor: () => ({ sortBy: 'growth' as const })
  },

  {
    intent: 'analytics_forecast',
    patterns: [
      /\b(previsione|forecast|stima)\b.*\b(fatturato|vendite|fine mese)\b/i,
      /\b(quanto)\b.*\b(chiuder[òo]|farò|prevedo)\b.*\b(mese|fine)\b/i,
      /\b(arriver[òo]|raggiunger[òo])\b.*\b(obiettivo|target|budget)\b/i,
      /\b(proiezione|proiettare)\b.*\b(vendite|fatturato)\b/i,
    ],
    confidence: 0.85,
    proactiveAfter: () => [{
      text: "Vuoi vedere i clienti da spingere per raggiungere l'obiettivo?",
      intent: 'analytics_cross_sell',
      priority: 'high'
    }]
  },

  {
    intent: 'analytics_target_progress',
    patterns: [
      /\b(sono)\b.*\b(in linea|allineato|pari)\b.*\b(obiettivo|target|budget)\b/i,
      /\b(come)\b.*\b(sto andando|vado)\b.*\b(obiettivo|rispetto al)?\b/i,
      /\b(quanto)\b.*\b(manca|manc[ao])\b.*\b(obiettivo|target|budget)\b/i,
      /\b(percentuale|%)\b.*\b(obiettivo|target|raggiunto)\b/i,
      /\b(a che punto)\b.*\b(sono|siamo)\b/i,
    ],
    confidence: 0.85,
  },

  {
    intent: 'analytics_cross_sell',
    patterns: [
      /\b(cosa)\b.*\b(posso|potrei|dovrei)\b.*\b(proporre|vendere|suggerire)\b/i,
      /\b(opportunità|occasion[ei])\b.*\b(vendita|cross.?sell|up.?sell)\b/i,
      /\b(cosa)\b.*\b(non ho mai proposto|manca|potrebbe interessare)\b/i,
      /\b(sugger|consigli)\b.*\b(prodott[oi])\b.*\b(per|da proporre)\b/i,
    ],
    confidence: 0.85,
    entityExtractor: (text) => {
      const nameMatch = text.match(/(?:a|per|da)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,20})/i);
      return nameMatch ? { clientName: nameMatch[1].trim() } : {};
    }
  },

  {
    intent: 'analytics_never_bought',
    patterns: [
      /\b(chi)\b.*\b(non ha mai|mai)\b.*\b(comprato|ordinato|preso)\b/i,
      /\b(client[ei])\b.*\b(non comprano|mai comprato|senza)\b.*\b([\wÀ-ÿ]+)\b/i,
      /\b(a chi)\b.*\b(non ho mai venduto|mai proposto)\b/i,
    ],
    confidence: 0.85,
    entityExtractor: (text) => {
      const prodMatch = text.match(/(?:comprato|ordinato|venduto|proposto)\s+([\wÀ-ÿ\s]{2,20})/i);
      return prodMatch ? { productName: prodMatch[1].trim() } : {};
    }
  },

  {
    intent: 'product_price',
    patterns: [
      /\b(quanto)\b.*\b(costa|prezzo|listino)\b/i,
      /\b(prezzo|costo|listino)\b.*\b(di|del|della)\b/i,
      /\b(a quanto)\b.*\b(vend[oi]|è)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      const match = text.match(/(?:costa|prezzo|di|del)\s+([\wÀ-ÿ\s]{2,30})/i);
      return match ? { productName: match[1].trim() } : {};
    }
  },

  {
    intent: 'product_stock',
    patterns: [
      /\b(quant[eio])\b.*\b(giacenz[ae]|disponibil[ei]|scorte|magazzino)\b/i,
      /\b(giacenz[ae]|disponibilità|stock)\b.*\b(di|del|della)\b/i,
      /\b(ne abbiamo|ce n'è|c'è)\b.*\b(ancora|disponibile)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      const match = text.match(/(?:giacenz\w*|di|del)\s+([\wÀ-ÿ\s]{2,30})/i);
      return match ? { productName: match[1].trim() } : {};
    }
  },

  {
    intent: 'product_not_proposed',
    patterns: [
      /\b(cosa|che|quali)\b.*\b(non ho mai proposto|mai venduto|manca)\b/i,
      /\b(prodott[oi])\b.*\b(mai propost[oi]|da proporre|nuov[oi])\b.*\b(a|per)\b/i,
      /\b(cosa potrei vendere)\b.*\b(a|di nuovo)\b/i,
    ],
    confidence: 0.85,
    entityExtractor: (text) => {
      const nameMatch = text.match(/(?:a|per)\s+([\wÀ-ÿ][\wÀ-ÿ'\s-]{2,20})/i);
      return nameMatch ? { clientName: nameMatch[1].trim() } : {};
    }
  },

  // 🆕 ANALISI GEOGRAFICHE (abbiamo coordinate clienti + punto partenza!)
  {
    intent: 'revenue_per_km',
    patterns: [
      // Fatturato per km
      /\b(fatturato|vendite|resa)\b.*\b(per|al)\b.*\b(km|chilometro)\b/i,
      /\b(km|chilometr)\b.*\b(percors[oi])\b.*\b(fattur|vend)/i,
      /\b(prodott[oi])\b.*\b(maggior fatturato|più redditi[tz]io)\b.*\b(km|chilometr|distanz)\b/i,
      /quale\s+prodott[oi]\s+.*\b(km|chilometr)\b/i,
      /\b(miglior|ottim)\b.*\b(resa|rendimento)\b.*\b(distanz|km)\b/i,
    ],
    confidence: 0.95,
    entityExtractor: (text) => {
      const entities: EntityType = {};
      // Periodo
      if (/sett|week/i.test(text)) entities.period = 'week';
      else if (/mese|month/i.test(text)) entities.period = 'month';
      else if (/anno|year/i.test(text)) entities.period = 'year';
      else entities.period = 'month'; // default
      return entities;
    }
  },
  {
    intent: 'clients_nearby',
    patterns: [
      /\b(client[ei])\b.*\b(più vicin[oi]|vicino a me)\b/i,
      /\b(vicin[oi])\b.*\b(client[ei])\b/i,
      /\b(nella zona|qui vicino)\b.*\b(client[ei])\b/i,
      /chi\s+(ho|c'è)\s+.*\b(vicin[oi]|zona)\b/i,
      /\b(ottimizza|migliora)\b.*\b(giro|percorso)\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      const entities: EntityType = {};
      // Limite risultati
      const limitMatch = text.match(/\b(prim[io])\s+(\d+)\b|\b(\d+)\s+(più vicin|client)/i);
      if (limitMatch) {
        entities.limit = parseInt(limitMatch[2] || limitMatch[3]) || 10;
      }
      return entities;
    }
  },
  {
    intent: 'km_traveled',
    patterns: [
      /\b(km|chilometr)\b.*\b(fatt[oi]|percors[oi])\b/i,
      /\b(quant[io])\b.*\b(km|chilometr)\b/i,
      /\b(distanz[ae])\b.*\b(percors[ae]|total[ei])\b/i,
    ],
    confidence: 0.9,
    entityExtractor: (text) => {
      const entities: EntityType = {};
      if (/oggi|today/i.test(text)) entities.period = 'today';
      else if (/sett|week/i.test(text)) entities.period = 'week';
      else if (/mese|month/i.test(text)) entities.period = 'month';
      else if (/anno|year/i.test(text)) entities.period = 'year';
      else entities.period = 'month';
      return entities;
    }
  },

  // 🆕 DOMANDE IMPOSSIBILI - solo quelle che richiedono dati non disponibili
  {
    intent: 'analytics_impossible',
    patterns: [
      // Richiedono margini (non disponibili)
      /\b(margin[ei]|profitto|guadagno)\b.*\b(per|su|del)\b/i,
      /\b(prodott[oi])\b.*\b(margine maggiore)\b/i,
      /\b(guadagn[oi]|netto)\b.*\b(su|per|con)\b/i,
      // Richiedono tempo per visita (non disponibile)
      /\b(tempo|durata|minuti|ore)\b.*\b(per visita|medio|impiegat[oi])\b/i,
    ],
    confidence: 0.95,
    entityExtractor: (text) => {
      const missingData: string[] = [];
      if (/margin|profitt|guadagn|netto/i.test(text)) missingData.push('margini_prodotto');
      if (/tempo|durata|minuti|ore/i.test(text)) missingData.push('tempo_visita');
      return { missingData };
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // GENERICI
  // ═══════════════════════════════════════════════════════════════

  {
    intent: 'greet',
    patterns: [
      /^(ciao|salve|buongiorno|buonasera|buon pomeriggio|hey|ehi|ehila|bella|ue|we)$/i,
      /^(ciao|salve|buongiorno|buonasera)\s+(come va|tutto bene|come stai)?$/i,
    ],
    confidence: 0.99,
    proactiveAfter: () => [{
      text: "Vuoi un riepilogo della giornata?",
      intent: 'planning_today',
      priority: 'medium'
    }]
  },

  {
    intent: 'help',
    patterns: [
      /\b(aiuto|help|aiutami)\b/i,
      /\b(cosa|che cosa)\b.*\b(puoi|sai|posso)\b.*\b(fare|chiedere)\b/i,
      /\b(come funziona|come si usa)\b/i,
      /^(come posso|cosa posso)\b/i,
    ],
    confidence: 0.95,
  },

  {
    intent: 'thanks',
    patterns: [
      /^(grazie|thanks|perfetto|ottimo|ok grazie|va bene grazie|grande|super|top)$/i,
    ],
    confidence: 0.99,
    proactiveAfter: () => [{
      text: "Posso aiutarti con altro?",
      intent: 'help',
      priority: 'low'
    }]
  },

  {
    intent: 'confirm',
    patterns: [
      /^(s[iì]|esatto|ok|confermo|procedi|vai|certo|assolutamente|ovvio|giusto|corretto)$/i,
      /^(s[iì] grazie|ok perfetto|va bene|d'accordo)$/i,
    ],
    confidence: 0.99,
  },

  {
    intent: 'cancel',
    patterns: [
      /^(no|annulla|stop|ferma|cancella|lascia stare|non importa|niente|lascia perdere)$/i,
      /^(no grazie|non serve|fa niente)$/i,
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

  // 0. Fast-path per input molto brevi (probabili follow-up o nomi)
  if (normalized.length <= 3 && context?.focusClient) {
    // Potrebbe essere un pronome
    if (/^(lui|lei|si|no)$/i.test(normalized)) {
      // Gestito sotto
    }
  }

  // 1. Estrai entità (indipendentemente dall'intent)
  const baseEntities = extractEntities(normalized, context);

  // 2. Cerca match tra i pattern
  for (const matcher of INTENT_MATCHERS) {
    for (const pattern of matcher.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        // Combina entità base + estratte dal matcher
        const matcherEntities = matcher.entityExtractor?.(normalized, match) ?? {};
        const entities = { ...baseEntities, ...matcherEntities };

        // Eredita dal contesto se mancano entità chiave
        if (!entities.clientName && context?.focusClient) {
          // Per intent che tipicamente si riferiscono all'ultimo cliente
          const clientIntents: IntentType[] = [
            'visit_history', 'visit_last', 'sales_by_client', 'product_discussed',
            'client_detail', 'notes_search'
          ];
          if (clientIntents.includes(matcher.intent)) {
            entities.clientName = context.focusClient.name;
            if (context.focusClient.id) entities.clientId = context.focusClient.id;
          }
        }

        // Eredita filtri attivi
        if (context?.activeFilters) {
          if (!entities.city && context.activeFilters.city) {
            entities.city = context.activeFilters.city;
          }
          if (!entities.localeType && context.activeFilters.localeType) {
            entities.localeType = context.activeFilters.localeType;
          }
        }

        // Genera suggerimenti proattivi
        const proactiveSuggestions = matcher.proactiveAfter?.(entities, context);

        return {
          intent: matcher.intent,
          confidence: matcher.confidence,
          entities,
          raw,
          normalized,
          needsConfirmation: ['visit_create', 'client_create'].includes(matcher.intent),
          suggestedResponse: getSuggestedResponse(matcher.intent, entities),
          proactiveSuggestions,
        };
      }
    }
  }

  // 3. Prova inferenza dal contesto per follow-up
  const followupResult = handleFollowup(normalized, context);
  if (followupResult) return followupResult;

  // 4. Prova a capire se è un nome di cliente (input breve senza verbi)
  if (normalized.split(' ').length <= 3 && !hasVerb(normalized)) {
    const possibleName = capitalizeWords(normalized.replace(/\?$/, ''));
    if (!isCommonWord(possibleName)) {
      return {
        intent: 'client_detail',
        confidence: 0.7,
        entities: { clientName: possibleName },
        raw,
        normalized,
        needsConfirmation: false,
        // Disambiguazione se non sicuri
        disambiguation: {
          question: `Vuoi informazioni sul cliente "${possibleName}"?`,
          options: [
            { label: `Sì, mostrami ${possibleName}`, intent: 'client_detail', entities: { clientName: possibleName } },
            { label: 'Cerca nelle note', intent: 'notes_search', entities: { clientName: possibleName } },
            { label: 'No, cerco altro', intent: 'help', entities: {} }
          ]
        }
      };
    }
  }

  // 5. Fallback con topic hint
  const topicHint = detectTopic(normalized);
  
  return {
    intent: 'unknown',
    confidence: 0.1,
    entities: baseEntities,
    raw,
    normalized,
    needsConfirmation: false,
    suggestedResponse: getSmartFallback(normalized, topicHint, context),
    // Se abbiamo un topic, suggerisci
    proactiveSuggestions: topicHint ? getTopicSuggestions(topicHint) : undefined,
  };
}

// ==================== HELPERS ====================

function hasVerb(text: string): boolean {
  const verbs = /\b(ho|hai|ha|sono|sei|e|era|ero|faccio|fai|fa|devo|devi|deve|voglio|vuoi|vuole|cerca|trova|mostra|apri|vai|dammi|dimmi|elenca|conta|quanto|quanti|quante|quando|dove|chi|cosa|come)\b/i;
  return verbs.test(text);
}

function detectTopic(text: string): ConversationContext['currentTopic'] {
  if (/client[ei]|negozi|bar|pasticceri[ae]|locali|ristoranti/i.test(text)) return 'clients';
  if (/visit[ae]|chiamat[ae]|attivita|passaggi/i.test(text)) return 'visits';
  if (/vend|fattur|incass|euro|€|ordini|ordinato/i.test(text)) return 'sales';
  if (/prodott|articol|mancant|catalogo/i.test(text)) return 'products';
  if (/programma|agenda|planning|fare|devo|richiamare|callback/i.test(text)) return 'planning';
  return null;
}

function handleFollowup(text: string, context?: ConversationContext): ParsedIntent | null {
  if (!context?.history?.length) return null;

  const lastTurn = context.history[0];
  const topic = context.currentTopic;

  // "Elencali" / "Chi sono?" dopo un count
  if (/^(elenca(?:li|meli)?|chi sono|quali sono|mostra(?:meli)?|lista)(\?)?$/i.test(text)) {
    if (lastTurn.intent === 'client_count' || topic === 'clients') {
      return {
        intent: 'client_list',
        confidence: 0.9,
        entities: { ...lastTurn.entities }, // eredita filtri
        raw: text,
        normalized: text,
        needsConfirmation: false,
      };
    }
    if (lastTurn.intent === 'visit_count' || topic === 'visits') {
      return {
        intent: 'visit_today',
        confidence: 0.9,
        entities: { ...lastTurn.entities },
        raw: text,
        normalized: text,
        needsConfirmation: false,
      };
    }
  }

  // "Quanti sono?" dopo una lista
  if (/^(quanti|quante)\s*(sono|ce ne sono)?(\?)?$/i.test(text)) {
    if (context.lastResultType === 'list' && topic) {
      return {
        intent: topic === 'clients' ? 'client_count' :
                topic === 'visits' ? 'visit_count' : 'sales_summary',
        confidence: 0.9,
        entities: { ...lastTurn.entities },
        raw: text,
        normalized: text,
        needsConfirmation: false,
      };
    }
  }

  // "E oggi?" / "E ieri?" / "E questo mese?"
  const periodFollowup = text.match(/^e\s+(oggi|ieri|questa settimana|questo mese|la settimana scorsa)(\?)?$/i);
  if (periodFollowup && topic) {
    const periodMap: Record<string, EntityType['period']> = {
      'oggi': 'today',
      'ieri': 'yesterday',
      'questa settimana': 'week',
      'questo mese': 'month',
      'la settimana scorsa': 'last_week',
    };
    const newPeriod = periodMap[periodFollowup[1].toLowerCase()];
    
    // Ripeti l'ultimo intent con nuovo periodo
    return {
      intent: lastTurn.intent,
      confidence: 0.85,
      entities: { ...lastTurn.entities, period: newPeriod },
      raw: text,
      normalized: text,
      needsConfirmation: false,
    };
  }

  // "E le email?" dopo client_list
  if (/\b(email|mail)\b/i.test(text) && topic === 'clients') {
    return {
      intent: 'client_list',
      confidence: 0.8,
      entities: { ...lastTurn.entities },
      raw: text,
      normalized: text,
      needsConfirmation: false,
      suggestedResponse: undefined,
    };
  }

  // "E lui?" / "E di lui?" - riferimento al focus client
  if (/^e\s+(lui|lei|quello|questa?)(\?)?$/i.test(text) && context.focusClient) {
    return {
      intent: 'client_detail',
      confidence: 0.85,
      entities: { 
        clientName: context.focusClient.name,
        clientId: context.focusClient.id 
      },
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
      return "Ciao! Come posso aiutarti oggi? 💼";
    case 'help':
      return `Ecco cosa posso fare per te:

**📊 Clienti**
• "Quanti clienti ho?" / "Lista clienti"
• "Info su [nome]" / "Cerca cliente [nome]"
• "Chi non vedo da un mese?"

**📍 Visite**
• "Visite di oggi" / "Quante visite ho fatto?"
• "Quando ho visto [nome]?"
• "Il secondo cliente di oggi"

**💰 Vendite**
• "Quanto ho venduto questo mese?"
• "Vendite a [nome]"
• "Chi compra [prodotto]?"

**📝 Note**
• "[Nome] paga contanti?"
• "Cerca nelle note [termine]"

**📋 Planning**
• "Cosa devo fare oggi?"
• "Chi devo richiamare?"

Prova a chiedere! 🚀`;
    case 'thanks':
      return "Prego! Se ti serve altro, sono qui. 😊";
    case 'cancel':
      return "Ok, nessun problema. Dimmi se posso aiutarti con altro.";
    default:
      return undefined;
  }
}

function getSmartFallback(text: string, topic: ConversationContext['currentTopic'], context?: ConversationContext): string {
  // Se c'è un cliente nel focus, suggerisci azioni su di esso
  if (context?.focusClient) {
    return `Non ho capito. Stavi parlando di **${context.focusClient.name}** - vuoi:
• Vedere lo storico visite
• Controllare le vendite
• Cercare nelle note

Oppure dimmi cosa ti serve!`;
  }

  // Fallback per topic
  const examples: Record<string, string[]> = {
    clients: ['"Quanti clienti ho?"', '"Cerca cliente Rossi"', '"Lista clienti"'],
    visits: ['"Visite di oggi"', '"Quando ho visto Rossi?"', '"Quante visite questo mese?"'],
    sales: ['"Quanto ho venduto?"', '"Vendite a Rossi"', '"Chi compra birra?"'],
    products: ['"Prodotti mancanti"', '"Cosa ho discusso con Rossi?"'],
    planning: ['"Cosa devo fare oggi?"', '"Chi devo richiamare?"'],
  };

  if (topic && examples[topic]) {
    return `Non ho capito. Prova:\n${examples[topic].map(e => `• ${e}`).join('\n')}`;
  }

  return `Non ho capito "${text}". 

Prova con:
• **Clienti**: "Quanti clienti ho?"
• **Visite**: "Visite di oggi"
• **Vendite**: "Quanto ho venduto?"
• **Planning**: "Cosa devo fare oggi?"

Oppure dimmi "aiuto" per vedere tutto quello che posso fare!`;
}

function getTopicSuggestions(topic: ConversationContext['currentTopic']): ProactiveSuggestion[] {
  const suggestions: Record<string, ProactiveSuggestion[]> = {
    clients: [
      { text: 'Quanti clienti ho?', intent: 'client_count', priority: 'medium' },
      { text: 'Lista clienti', intent: 'client_list', priority: 'low' },
    ],
    visits: [
      { text: 'Visite di oggi', intent: 'visit_today', priority: 'high' },
      { text: 'Quante visite questo mese?', intent: 'visit_count', entities: { period: 'month' }, priority: 'medium' },
    ],
    sales: [
      { text: 'Quanto ho venduto questo mese?', intent: 'sales_summary', entities: { period: 'month' }, priority: 'high' },
    ],
    products: [
      { text: 'Prodotti mancanti', intent: 'product_missing', priority: 'medium' },
    ],
    planning: [
      { text: 'Cosa devo fare oggi?', intent: 'planning_today', priority: 'high' },
      { text: 'Chi devo richiamare?', intent: 'planning_callbacks', priority: 'high' },
    ],
  };
  return topic ? suggestions[topic] ?? [] : [];
}

// ==================== CONTEXT MANAGEMENT ====================

export function updateContext(
  current: ConversationContext | undefined,
  parsed: ParsedIntent
): ConversationContext {
  const history = current?.history ?? [];
  
  // Aggiungi al history (max 5 turni)
  const newHistory = [
    { intent: parsed.intent, entities: parsed.entities, timestamp: Date.now() },
    ...history.slice(0, 4)
  ];

  // Aggiorna focus client
  let focusClient = current?.focusClient;
  if (parsed.entities.clientName) {
    focusClient = { 
      name: parsed.entities.clientName, 
      id: parsed.entities.clientId 
    };
  }

  // Aggiorna focus product
  let focusProduct = current?.focusProduct;
  if (parsed.entities.productName) {
    focusProduct = parsed.entities.productName;
  }

  // Determina result type
  let lastResultType: ConversationContext['lastResultType'];
  if (parsed.intent.includes('count')) lastResultType = 'count';
  else if (parsed.intent.includes('list') || parsed.intent === 'visit_today') lastResultType = 'list';
  else if (parsed.intent.includes('detail') || parsed.intent === 'client_detail') lastResultType = 'detail';
  else if (parsed.intent.includes('search')) lastResultType = 'search';

  // Aggiorna filtri attivi
  const activeFilters: ConversationContext['activeFilters'] = {
    ...current?.activeFilters,
  };
  if (parsed.entities.city) activeFilters.city = parsed.entities.city;
  if (parsed.entities.localeType) activeFilters.localeType = parsed.entities.localeType;
  if (parsed.entities.period) activeFilters.period = parsed.entities.period;

  return {
    history: newHistory,
    currentTopic: detectTopic(parsed.normalized) ?? current?.currentTopic,
    focusClient,
    focusProduct,
    lastResultType,
    activeFilters,
  };
}

// ==================== UTILITIES ====================

export function createEmptyContext(): ConversationContext {
  return {
    history: [],
    currentTopic: null,
  };
}

// Test function (dev only)
export function testParser() {
  const tests = [
    // Base
    "Quanti clienti ho?",
    "Lista clienti",
    "Visite di oggi",
    "Quanto ho venduto questo mese?",
    // Nuovi
    "Rossi paga contanti?",
    "Chi non vedo da un mese?",
    "Il secondo cliente di oggi",
    "A chi ho venduto birra?",
    "Bianchi ha figli?",
    "Dimmi tutto su Rossi",
    "Rossi?",
    // Follow-up
    "Elencali",
    "E ieri?",
    "Quanti sono?",
    // Saluti
    "Ciao",
    "Grazie",
  ];
  
  console.log("=== TEST NLU v2.0 ===\n");
  let context = createEmptyContext();
  
  for (const t of tests) {
    const result = parseIntent(t, context);
    console.log(`"${t}"`);
    console.log(`  → ${result.intent} (${(result.confidence * 100).toFixed(0)}%)`);
    if (Object.keys(result.entities).length > 0) {
      console.log(`  → entities:`, result.entities);
    }
    if (result.disambiguation) {
      console.log(`  → disambiguazione: "${result.disambiguation.question}"`);
    }
    if (result.proactiveSuggestions?.length) {
      console.log(`  → suggerimenti:`, result.proactiveSuggestions.map(s => s.text));
    }
    context = updateContext(context, result);
    console.log('');
  }
}

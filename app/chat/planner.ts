// app/chat/planner.ts
//
// PLANNER v4 - Sistema Intelligente e Proattivo per Repping
// ============================================================================
// 
// Usa il parser NLU unificato v2.0 (lib/nlu/unified.ts) per:
// - Riconoscere tutti gli intent dell'agente HoReCa
// - Estrarre entità avanzate (nomi, date relative, filtri)
// - Gestire contesto multi-turn (5+ scambi)
// - Risposte proattive con suggerimenti
// - Fallback intelligente con disambiguazione
//
// ============================================================================

import { 
  parseIntent, 
  updateContext, 
  createEmptyContext,
  type ParsedIntent, 
  type ConversationContext,
  type ProactiveSuggestion 
} from "@/lib/nlu/unified";

// 📝 Nota: I metadati RAG sono ora inclusi in PlannerResult
// e vengono salvati in messages tramite /api/messages/append

// 🧠 RAG + LLM Fallback (Fase 3)
import { generateWithRAG, shouldUseLLMFallback } from "@/lib/rag/llm-fallback";
import {
  // Clienti
  countClients,
  countUniqueCities,
  listClientNames,
  searchClients,
  // Visite
  countVisits,
  getVisitsToday,
  getVisitsByDay,
  getLastVisitToClient,
  getVisitHistoryForClient,
  // Vendite
  getSalesSummary,
  getSalesByClient,
  // Prodotti
  listMissingProducts,
  getProductsDiscussedWithClient,
  getVisitsByProduct,
  // Planning
  getCallbacks,
  getTodayPlanning,
  getInactiveClients,
  // Note
  searchInNotes,
  // 🆕 Analisi Geografiche
  analyzeRevenuePerKmByProduct,
  getNearestClients,
  getKmTraveledInPeriod,
  // 🆕 Query Composite
  queryClientsWithFilters,
  type CompositeFilters,
  // 🆕 Analytics
  getTopClients,
  getTopProducts,
  getSalesByDayOfWeek,
  getSalesByCity,
  // 🆕 Fase 1: Elaborazioni Numeriche
  getDailyAverage,
  getMonthComparison,
  getTargetGap,
  getYearlyForecast,
  getGrowthLeader,
  getNewClientsCount,
  getConversionRate,
  getVisitFrequency,
  getRevenuePerKmSummary,
  // 🆕 Fase 2: Inferenze Strategiche
  getVisitPriorities,
  getChurnRiskClients,
  getRevenueFocusSuggestions,
  getProductFocusSuggestions,
  getIdealCustomerProfile,
  getLostOpportunities,
  getGrowthPotentialClients,
  getActionPlan,
  getBestTimeForLocaleType,
  // 🆕 Fase 3: Visualizzazioni e Trend
  getSalesTrend,
  getYoYComparison,
  getSalesByWeekdayChart,
  getSalesByCityChart,
  getVisitsByTypeChart,
  getAvgOrderTrend,
  getClientsByRevenueBand,
  getSeasonality,
  getClientGrowth,
} from "@/app/data/adapters";

// 💡 Napoleone
import { generateSuggestions, getSuggestions, generateBriefing } from "@/lib/napoleon";
import { supabase } from "@/lib/supabase/client";

// ==================== TIPI ====================

type Scope =
  | "global"
  | "clients"
  | "products"
  | "orders"
  | "sales"
  | "visits"
  | "planning"
  | "notes"
  | "report";

type ConversationContextState = {
  scope: Scope;
  topic_attivo: string | null;
  ultimo_intent: string | null;
  entita_correnti: Record<string, any> | null;
  ultimo_risultato: any | null;
  updated_at: number | null;
  scope_stack?: Scope[];
  // 🆕 Contesto NLU v2
  nluContext?: ConversationContext;
};

type ConversationApi = {
  state: ConversationContextState;
  expired: boolean;
  setScope: (s: Scope) => void;
  remember: (partial: Partial<ConversationContextState>) => void;
  reset: (opts?: { keepScope?: boolean }) => void;
};

type CryptoLike = {
  decryptFields: (
    scope: string,
    table: string,
    recordId: string,
    rowOrMap: any,
    fieldNames?: string[]
  ) => Promise<any>;
};

export type PlannerResult = {
  text: string;
  appliedScope?: Scope | null;
  intent?: string | null;
  usedContext?: ConversationContextState;
  // 🆕 Proattività
  proactiveSuggestions?: ProactiveSuggestion[];
  // 🆕 Disambiguazione
  disambiguation?: {
    question: string;
    options: { label: string; intent: string; entities: any }[];
  };
  // 📝 Metadati RAG (Fase 2)
  confidence?: number;
  source?: 'local' | 'rag' | 'llm' | 'unknown';
  entities?: Record<string, any>;
  account_ids?: string[];
};

// ==================== HELPERS ====================

function needCrypto(): { text: string; intent: string } {
  return {
    text: "🔒 Devi sbloccare la sessione per visualizzare i dati. Inserisci la passphrase nel pannello laterale.",
    intent: "crypto_not_ready",
  };
}

/**
 * Recupera le coordinate del punto di partenza dal localStorage
 * Salvate in repping_settings da DrawerImpostazioni
 */
function getHomeCoords(): { lat: number; lon: number } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('repping_settings');
    if (!saved) return null;
    
    const data = JSON.parse(saved);
    if (data.homeLat && data.homeLon) {
      return { lat: data.homeLat, lon: data.homeLon };
    }
    return null;
  } catch {
    return null;
  }
}

function scopeFromIntent(intent: string): Scope {
  if (intent.startsWith('client')) return 'clients';
  if (intent.startsWith('visit')) return 'visits';
  if (intent.startsWith('sales')) return 'sales';
  if (intent.startsWith('product')) return 'products';
  if (intent.startsWith('planning')) return 'planning';
  if (intent.startsWith('notes')) return 'notes';
  if (intent.startsWith('report')) return 'report';
  if (intent.startsWith('followup')) return 'global'; // mantieni scope precedente
  return 'global';
}

// Formatta suggerimenti proattivi in testo
// DISABILITATO: l'utente vuole risposte secche senza suggerimenti inline
function formatProactiveSuggestions(_suggestions?: ProactiveSuggestion[]): string {
  return ''; // Nessun suggerimento inline
}

// ==================== PLANNER PRINCIPALE ====================

export async function runChatTurn_v2(
  userText: string,
  conv: ConversationApi,
  crypto: CryptoLike | null,
  userId?: string // 🧠 Per RAG fallback
): Promise<PlannerResult> {
  const { state, expired } = conv;

  // Reset se contesto scaduto
  if (expired) {
    conv.reset();
  }

  // 1. Parse con NLU v2
  const nluContext: ConversationContext = state.nluContext ?? createEmptyContext();
  const parsed = parseIntent(userText, nluContext);

  console.debug("[planner:v4]", {
    input: userText,
    intent: parsed.intent,
    confidence: parsed.confidence,
    entities: parsed.entities,
    hasDisambiguation: !!parsed.disambiguation,
    proactiveSuggestions: parsed.proactiveSuggestions?.length ?? 0,
  });

  // 2. Se c'è disambiguazione, restituiscila
  if (parsed.disambiguation && parsed.confidence < 0.8) {
    return {
      text: parsed.disambiguation.question,
      appliedScope: state.scope,
      intent: parsed.intent,
      usedContext: state,
      disambiguation: parsed.disambiguation,
      // 📝 Metadati RAG
      confidence: parsed.confidence,
      source: 'local',
      entities: parsed.entities,
    };
  }

  // 3. Se ha una risposta suggerita (greet, help, thanks, cancel)
  if (parsed.suggestedResponse && ['greet', 'help', 'thanks', 'cancel'].includes(parsed.intent)) {
    const proactiveText = formatProactiveSuggestions(parsed.proactiveSuggestions);
    return {
      text: parsed.suggestedResponse + proactiveText,
      appliedScope: state.scope,
      intent: parsed.intent,
      usedContext: state,
      proactiveSuggestions: parsed.proactiveSuggestions,
      // 📝 Metadati RAG
      confidence: parsed.confidence,
      source: 'local',
      entities: parsed.entities,
    };
  }

  // 4. Router per intent
  const scope = scopeFromIntent(parsed.intent);
  
  try {
    const result = await handleIntent(parsed, crypto, state, nluContext, userId, userText);
    
    // Aggiorna contesto NLU
    const newNluContext = updateContext(nluContext, parsed);
    conv.remember({
      topic_attivo: scope,
      ultimo_intent: parsed.intent,
      entita_correnti: parsed.entities,
      nluContext: newNluContext,
    });

    // Aggiungi suggerimenti proattivi
    const proactiveText = formatProactiveSuggestions(parsed.proactiveSuggestions);
    const finalResponse = result.text + proactiveText;

    // Estrai account_ids dalle entità
    const accountIds: string[] = [];
    if (parsed.entities.clientId) accountIds.push(parsed.entities.clientId);
    if (nluContext.focusClient?.id) accountIds.push(nluContext.focusClient.id);

    return {
      text: finalResponse,
      appliedScope: scope,
      intent: result.intent,
      usedContext: conv.state,
      proactiveSuggestions: parsed.proactiveSuggestions,
      // 📝 Metadati RAG - passati a HomeClient per il salvataggio in messages
      confidence: parsed.confidence,
      source: 'local' as const, // Per ora tutto locale, in futuro RAG/LLM
      entities: parsed.entities,
      account_ids: accountIds.length > 0 ? accountIds : undefined,
    };
  } catch (error) {
    console.error("[planner:error]", error);
    
    return {
      text: "❌ Si è verificato un errore. Riprova tra poco.",
      appliedScope: state.scope,
      intent: "error",
      usedContext: state,
      // 📝 Metadati RAG anche per errori
      confidence: parsed.confidence,
      source: 'local' as const,
      entities: { error: String(error) },
    };
  }
}

// ==================== INTENT CHAINING HANDLER ====================

/**
 * Gestisce intent concatenati eseguendoli in sequenza
 * Es: "Cerca Rossi e dimmi quando l'ho visto" → client_search + visit_last
 */
async function handleChainedIntents(
  parsed: ParsedIntent,
  crypto: CryptoLike | null,
  state: ConversationContextState,
  nluContext: ConversationContext
): Promise<{ text: string; intent: string }> {
  if (!crypto) return { ...needCrypto(), intent: parsed.intent };

  const chainedIntents = parsed.chainedIntents ?? [];
  const allIntents = [
    { intent: parsed.intent, entities: parsed.entities, confidence: parsed.confidence },
    ...chainedIntents
  ];

  const responses: string[] = [];
  let sharedEntities = { ...parsed.entities };

  for (let i = 0; i < allIntents.length; i++) {
    const { intent, entities } = allIntents[i];
    
    // Merge entità: eredita da precedenti ma mantieni specifiche
    const mergedEntities = { ...sharedEntities, ...entities };
    
    // Crea un parsed fittizio per ogni sub-intent
    const subParsed: ParsedIntent = {
      intent,
      confidence: parsed.confidence,
      entities: mergedEntities,
      raw: parsed.raw,
      normalized: parsed.normalized,
      needsConfirmation: false,
    };

    try {
      // Esegui l'intent (senza ricorsione in chaining)
      const result = await handleIntent(subParsed, crypto, state, nluContext);
      
      // Aggiungi risposta con numerazione
      if (allIntents.length > 1) {
        responses.push(`**${i + 1}.** ${result.text}`);
      } else {
        responses.push(result.text);
      }
      
      // Propaga entità risolte (es: clientName trovato in search)
      if (mergedEntities.clientName) {
        sharedEntities.clientName = mergedEntities.clientName;
      }
      if (mergedEntities.clientId) {
        sharedEntities.clientId = mergedEntities.clientId;
      }
      
    } catch (e) {
      console.error(`[Planner] Errore in intent chain ${intent}:`, e);
      responses.push(`**${i + 1}.** ⚠️ Errore nell'esecuzione di ${intent}`);
    }
  }

  // Combina le risposte
  const combinedText = responses.join('\n\n---\n\n');
  
  return {
    text: combinedText,
    intent: `chained:${allIntents.map(i => i.intent).join('+')}`,
  };
}

// ==================== HANDLER INTENT ====================

async function handleIntent(
  parsed: ParsedIntent,
  crypto: CryptoLike | null,
  state: ConversationContextState,
  nluContext: ConversationContext,
  userId?: string, // 🧠 Per RAG fallback
  userText?: string // 🧠 Testo originale per RAG
): Promise<{ text: string; intent: string }> {
  const { intent, entities } = parsed;

  // 🆕 INTENT CHAINING - Gestisci intent multipli
  if (parsed.chainedIntents && parsed.chainedIntents.length > 0) {
    return handleChainedIntents(parsed, crypto, state, nluContext);
  }

  // 🧠 LLM Fallback per query strategiche/analitiche complesse
  // Questi intent richiedono ragionamento che va oltre il pattern matching
  const llmDelegatedIntents = [
    'strategy_visit_priority', 'strategy_churn_risk', 'strategy_revenue_focus',
    'strategy_product_focus', 'strategy_ideal_customer', 'strategy_lost_opportunities',
    'strategy_growth_potential', 'strategy_action_plan', 'strategy_best_time',
  ];
  
  if (userId && userText && llmDelegatedIntents.includes(intent)) {
    try {
      const llmResponse = await generateWithRAG(userText, userId);
      return {
        text: llmResponse.text,
        intent: 'llm_response',
      };
    } catch (e) {
      console.error('[planner] LLM delegation error:', e);
      // Continua con handler locale come fallback
    }
  }

  switch (intent) {
    // ═══════════════════════════════════════════════════════════════
    // CLIENTI
    // ═══════════════════════════════════════════════════════════════
    
    case 'client_count': {
      const n = await countClients();
      const text = `Hai **${n}** ${n === 1 ? 'cliente' : 'clienti'}.`;
      return { text, intent };
    }

    case 'client_city_count': {
      const result = await countUniqueCities();
      let text = `I tuoi clienti sono distribuiti in **${result.count}** ${result.count === 1 ? 'città' : 'città diverse'}.`;
      if (result.count > 0 && result.count <= 10) {
        text += `\n\n${result.cities.join(', ')}.`;
      }
      return { text, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 QUERY COMPOSITE - Filtri multipli combinati
    // ═══════════════════════════════════════════════════════════════
    case 'composite_query': {
      if (!crypto) return { ...needCrypto(), intent };
      
      // Costruisci filtri dal parsed entities
      const filters: CompositeFilters = {};
      
      if (entities.city) filters.city = entities.city;
      if (entities.localeType) filters.localeType = entities.localeType;
      if (entities.productBought) filters.productBought = entities.productBought;
      if (entities.minAmount) filters.minAmount = entities.minAmount;
      if (entities.maxAmount) filters.maxAmount = entities.maxAmount;
      if (entities.notVisitedDays) filters.notVisitedDays = entities.notVisitedDays;
      if (entities.hasOrdered !== undefined) filters.hasOrdered = entities.hasOrdered;
      if (entities.period) filters.period = entities.period;

      // Verifica che ci sia almeno un filtro
      const hasFilters = Object.keys(filters).length > 0;
      if (!hasFilters) {
        return {
          text: "🤔 Non ho capito quali filtri applicare.\n\nProva con:\n• \"Clienti di Milano\"\n• \"Bar che hanno comprato vino\"\n• \"Ristoranti che non vedo da un mese\"",
          intent
        };
      }

      const result = await queryClientsWithFilters(crypto, filters);
      return { text: result.message, intent };
    }

    case 'client_list': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await listClientNames(crypto);
      const { names, withoutName } = result;
      
      if (names.length === 0) {
        return { 
          text: "Non hai ancora clienti in archivio.\n\n👉 Vuoi importarne alcuni? Usa lo strumento \"Importa Clienti\" nel menu.", 
          intent 
        };
      }

      let text: string;
      if (names.length <= 10) {
        text = `I tuoi **${names.length}** clienti:\n${names.map(n => `• ${n}`).join('\n')}`;
      } else {
        text = `Hai **${names.length}** clienti. Ecco i primi 10:\n${names.slice(0, 10).map(n => `• ${n}`).join('\n')}`;
        text += `\n\n📋 Vuoi la lista completa? Vai su [/clients](/clients) o dimmi "apri clienti"`;
      }
      
      if (withoutName > 0) {
        text += `\n\n_(${withoutName} clienti senza nome)_`;
      }
      
      return { text, intent };
    }

    case 'client_search': {
      if (!crypto) return { ...needCrypto(), intent };
      const query = entities.clientName || '';
      if (!query) {
        return { text: "Chi vuoi cercare? Dimmi il nome del cliente.", intent };
      }
      const result = await searchClients(crypto, query);
      return { text: result.message, intent };
    }

    case 'client_detail': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;
      if (!clientName) {
        return { text: "Di quale cliente vuoi le informazioni?", intent };
      }
      
      // Mostra info complete: ultima visita + vendite
      const [visitResult, salesResult] = await Promise.all([
        getLastVisitToClient(crypto, clientName),
        getSalesByClient(crypto, clientName)
      ]);
      
      if (!visitResult.found) {
        // 🧠 RAG Fallback: se non trovo il cliente esatto, provo ricerca semantica
        if (userId && userText) {
          try {
            const llmResponse = await generateWithRAG(userText, userId);
            if (llmResponse.ragResults.length > 0) {
              return {
                text: llmResponse.text,
                intent: 'rag_response',
              };
            }
          } catch (e) {
            console.error('[planner] RAG fallback error in client_detail:', e);
          }
        }
        return { text: visitResult.message, intent };
      }

      let text = `📋 **${visitResult.clientName}**\n\n`;
      text += visitResult.message;
      
      if (salesResult.found) {
        if (salesResult.totalAmount > 0) {
          text += `\n\n💰 **Totale vendite:** €${salesResult.totalAmount.toLocaleString('it-IT')} (${salesResult.visitCount} ordini)`;
        } else {
          text += `\n\n💰 Nessuna vendita registrata ancora.`;
        }
      }
      
      return { text, intent };
    }

    case 'client_create': {
      const clientName = entities.clientName;
      if (!clientName) {
        return { 
          text: "Come si chiama il nuovo cliente?\n\nPuoi dire: \"Nuovo cliente Mario Rossi\"", 
          intent 
        };
      }
      return {
        text: `Per creare il cliente **${clientName}**, usa:\n\n👉 [Nuovo Cliente](/tools/quick-add-client)\n\nOppure apri il menu laterale → "Nuovo Cliente"`,
        intent,
      };
    }

    // 🆕 Clienti inattivi
    case 'client_inactive': {
      if (!crypto) return { ...needCrypto(), intent };
      const days = entities.inactivityDays ?? 30;
      
      const result = await getInactiveClients(crypto, days);
      return { text: result.message, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // RICERCA NOTE
    // ═══════════════════════════════════════════════════════════════

    // 🆕 Ricerca nelle note
    case 'notes_search': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;
      const searchTerm = entities.searchTerm;
      
      if (!clientName && !searchTerm) {
        return { 
          text: "Cosa vuoi cercare? Prova:\n• \"Rossi paga contanti?\"\n• \"Chi ha figli?\"\n• \"Cerca nelle note allergie\"",
          intent 
        };
      }

      // Usa il nuovo adapter
      const result = await searchInNotes(crypto, searchTerm ?? '', clientName);
      return { text: result.message, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // VISITE
    // ═══════════════════════════════════════════════════════════════

    case 'visit_count': {
      // Mappa periodi estesi a quelli supportati
      let period = entities.period;
      if (period === 'yesterday') period = 'today'; // fallback
      if (period === 'last_week') period = 'week';
      if (period === 'last_month') period = 'month';
      if (period === 'quarter') period = 'month';
      
      const n = await countVisits(period as 'today' | 'week' | 'month' | 'year' | undefined);
      
      const periodLabels: Record<string, string> = {
        'today': 'oggi',
        'yesterday': 'ieri',
        'week': 'questa settimana',
        'last_week': 'la settimana scorsa',
        'month': 'questo mese',
        'last_month': 'il mese scorso',
        'quarter': 'questo trimestre',
        'year': "quest'anno",
      };
      
      const label = periodLabels[entities.period ?? ''] ?? 'in totale';
      
      let text = `Hai fatto **${n}** ${n === 1 ? 'visita' : 'visite'} ${label}.`;
      
      // Proattivo: confronto
      if (n === 0 && entities.period === 'today') {
        text += `\n\n💪 È ora di partire! Vuoi vedere i clienti da visitare?`;
      }
      
      return { text, intent };
    }

    case 'visit_today': {
      if (!crypto) return { ...needCrypto(), intent };
      const visits = await getVisitsToday(crypto);
      
      if (visits.length === 0) {
        return { 
          text: "Non hai ancora registrato visite oggi.\n\n📍 Vuoi registrare la prima?",
          intent 
        };
      }

      const lines = visits.map((v, i) => {
        let line = `${i + 1}. **${v.clientName}** (${v.tipo})`;
        if (v.importo_vendita) line += ` - €${v.importo_vendita.toLocaleString('it-IT')}`;
        return line;
      });

      const total = visits.reduce((sum, v) => sum + (v.importo_vendita ?? 0), 0);
      let text = `📍 **Visite di oggi** (${visits.length}):\n\n${lines.join('\n')}`;
      
      if (total > 0) {
        text += `\n\n💰 **Totale giornata:** €${total.toLocaleString('it-IT')}`;
      }
      
      return { text, intent };
    }

    // 🆕 Visita per posizione
    case 'visit_by_position': {
      if (!crypto) return { ...needCrypto(), intent };
      const position = entities.position ?? 1;
      const isYesterday = entities.period === 'yesterday';
      
      const visits = await getVisitsByDay(crypto, isYesterday ? 'yesterday' : 'today');
      
      if (visits.length === 0) {
        return { 
          text: `Non hai registrato visite ${isYesterday ? 'ieri' : 'oggi'}.`,
          intent 
        };
      }

      const idx = position === -1 ? visits.length - 1 : position - 1;
      
      if (idx < 0 || idx >= visits.length) {
        return { 
          text: `Hai solo ${visits.length} ${visits.length === 1 ? 'visita' : 'visite'} ${isYesterday ? 'ieri' : 'oggi'}.`,
          intent 
        };
      }

      const v = visits[idx];
      const posLabel = position === -1 ? 'Ultima' : `${position}ª`;
      
      let text = `📍 **${posLabel} visita ${isYesterday ? 'di ieri' : 'di oggi'}:**\n\n`;
      text += `👤 **${v.clientName}**\n`;
      text += `📋 Tipo: ${v.tipo}\n`;
      if (v.esito) text += `✅ Esito: ${v.esito}\n`;
      if (v.importo_vendita) text += `💰 Importo: €${v.importo_vendita.toLocaleString('it-IT')}\n`;
      if (v.prodotti_discussi) text += `📦 Prodotti: ${v.prodotti_discussi}`;
      
      return { text, intent };
    }

    case 'visit_last': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;
      if (!clientName) {
        return { text: "Di quale cliente vuoi sapere l'ultima visita?", intent };
      }
      const result = await getLastVisitToClient(crypto, clientName);
      return { text: result.message, intent };
    }

    case 'visit_history': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;
      if (!clientName) {
        return { text: "Di quale cliente vuoi lo storico visite?", intent };
      }
      const result = await getVisitHistoryForClient(crypto, clientName);
      return { text: result.message, intent };
    }

    case 'visit_create': {
      const clientName = entities.clientName;
      const amount = entities.amount;
      
      let text = "📝 **Registra una visita**\n\n";
      
      if (clientName || amount) {
        text += "Ho capito:\n";
        if (clientName) text += `• Cliente: **${clientName}**\n`;
        if (amount) text += `• Importo: **€${amount}**\n`;
        text += "\n";
      }
      
      text += `👉 [Apri Registrazione Visita](/tools/add-visit)`;
      
      return { text, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // VENDITE
    // ═══════════════════════════════════════════════════════════════

    case 'sales_summary':
    case 'sales_period': {
      // Mappa periodi estesi
      let period = entities.period ?? 'month';
      if (period === 'yesterday') period = 'today';
      if (period === 'last_week') period = 'week';
      if (period === 'last_month') period = 'month';
      if (period === 'quarter') period = 'month';
      
      const result = await getSalesSummary(period as 'today' | 'week' | 'month' | 'year');
      return { text: result.message, intent };
    }

    case 'sales_today': {
      const result = await getSalesSummary('today');
      return { text: result.message, intent };
    }

    case 'sales_by_client': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;
      if (!clientName) {
        return { text: "Di quale cliente vuoi le vendite?", intent };
      }
      const result = await getSalesByClient(crypto, clientName);
      return { text: result.message, intent };
    }

    // 🆕 Vendite per prodotto
    case 'sales_by_product':
    case 'product_sold_to': {
      if (!crypto) return { ...needCrypto(), intent };
      const productName = entities.productName;
      
      if (!productName) {
        return { 
          text: "Quale prodotto vuoi cercare?\n\nProva: \"Chi compra birra?\" o \"A chi ho venduto caffè?\"",
          intent 
        };
      }

      // Mappa periodo
      let period = entities.period;
      if (period === 'yesterday') period = 'today';
      if (period === 'last_week') period = 'week';
      if (period === 'last_month') period = 'month';

      const result = await getVisitsByProduct(crypto, productName, period as any);
      return { text: result.message, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // PRODOTTI
    // ═══════════════════════════════════════════════════════════════

    case 'product_discussed': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;
      if (!clientName) {
        return { text: "Con quale cliente vuoi sapere i prodotti discussi?", intent };
      }
      const result = await getProductsDiscussedWithClient(crypto, clientName);
      return { text: result.message, intent };
    }

    case 'product_missing': {
      if (!crypto) return { ...needCrypto(), intent };
      const missing = await listMissingProducts(crypto);
      if (missing.length === 0) {
        return { text: "✅ Non ci sono prodotti mancanti al momento.", intent };
      }
      return { 
        text: `⚠️ **Prodotti mancanti:**\n\n${missing.map(p => `• ${p}`).join('\n')}`,
        intent 
      };
    }

    case 'product_search': {
      const productName = entities.productName;
      if (!productName) {
        return { text: "Quale prodotto vuoi cercare?", intent };
      }
      return { 
        text: `🔍 Ricerca prodotto "${productName}"...\n\n_La ricerca nel catalogo è in arrivo!_`,
        intent 
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // PLANNING
    // ═══════════════════════════════════════════════════════════════

    case 'planning_today': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getTodayPlanning(crypto);
      return { text: result.message, intent };
    }

    case 'planning_tomorrow': {
      // TODO: implementare getTomorrowPlanning con prossima_data
      return {
        text: "📅 Per il planning di domani, sto ancora imparando!\n\nPer ora puoi:\n• Controllare i promemoria impostati\n• Vedere i clienti da richiamare\n\nProva: \"Chi devo richiamare?\"",
        intent
      };
    }

    case 'planning_callbacks': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getCallbacks(crypto);
      return { text: result.message, intent };
    }

    case 'planning_week': {
      return { 
        text: "📅 Il planning settimanale è in arrivo!\n\nPer ora prova: \"Cosa devo fare oggi?\" o \"Chi devo richiamare?\"",
        intent 
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // REPORT
    // ═══════════════════════════════════════════════════════════════

    // 🆕 Generazione report
    case 'report_generate': {
      const reportType = entities.reportType ?? 'clients';
      
      const reportPages: Record<string, string> = {
        clients: '/tools/import-clients', // placeholder
        visits: '/visits',
        sales: '/visits',
      };

      const reportNames: Record<string, string> = {
        clients: 'Clienti',
        visits: 'Visite',
        sales: 'Vendite',
      };

      return {
        text: `📄 **Genera Report ${reportNames[reportType]}**\n\n` +
              `Per esportare il report, vai alla pagina ${reportNames[reportType]} e usa il pulsante "Esporta PDF".\n\n` +
              `👉 [Apri ${reportNames[reportType]}](${reportPages[reportType]})`,
        intent,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // NAVIGAZIONE
    // ═══════════════════════════════════════════════════════════════

    case 'navigate': {
      const target = entities.targetPage;
      const pages: Record<string, { url: string; name: string }> = {
        clients: { url: '/clients', name: 'Lista Clienti' },
        visits: { url: '/visits', name: 'Lista Visite' },
        products: { url: '/products', name: 'Prodotti' },
        documents: { url: '/documents', name: 'Documenti' },
        settings: { url: '/settings', name: 'Impostazioni' },
      };
      
      if (target && pages[target]) {
        const { url, name } = pages[target];
        return {
          text: `📂 **${name}**\n\n👉 [Apri ${name}](${url})`,
          intent,
        };
      }
      
      return {
        text: "Dove vuoi andare?\n\n• Clienti\n• Visite\n• Prodotti\n• Documenti\n• Impostazioni",
        intent,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // FOLLOW-UP (contestuali)
    // ═══════════════════════════════════════════════════════════════

    case 'followup_list': {
      // Ripeti l'ultimo intent con modalità lista
      const lastIntent = state.ultimo_intent;
      const lastEntities = state.entita_correnti ?? {};
      
      if (lastIntent?.includes('client')) {
        if (!crypto) return { ...needCrypto(), intent };
        const result = await listClientNames(crypto);
        return { 
          text: `I tuoi clienti:\n${result.names.slice(0, 15).map(n => `• ${n}`).join('\n')}${result.names.length > 15 ? `\n\n...e altri ${result.names.length - 15}` : ''}`,
          intent: 'client_list'
        };
      }
      
      if (lastIntent?.includes('visit')) {
        if (!crypto) return { ...needCrypto(), intent };
        const visits = await getVisitsToday(crypto);
        if (visits.length === 0) {
          return { text: "Non hai visite da elencare oggi.", intent };
        }
        return { 
          text: `Visite di oggi:\n${visits.map((v, i) => `${i + 1}. ${v.clientName} (${v.tipo})`).join('\n')}`,
          intent: 'visit_today'
        };
      }
      
      return { 
        text: "Cosa vuoi che ti elenchi? Clienti, visite, o altro?",
        intent 
      };
    }

    case 'followup_count': {
      const lastIntent = state.ultimo_intent;
      
      if (lastIntent?.includes('client')) {
        const n = await countClients();
        return { text: `Sono **${n}** clienti in totale.`, intent: 'client_count' };
      }
      
      if (lastIntent?.includes('visit')) {
        const n = await countVisits('today');
        return { text: `Sono **${n}** visite oggi.`, intent: 'visit_count' };
      }
      
      return { text: "Quanti cosa? Clienti, visite, vendite...?", intent };
    }

    case 'followup_period': {
      // Cambia periodo all'ultimo intent
      const lastIntent = state.ultimo_intent;
      const newPeriod = entities.period;
      
      if (lastIntent?.includes('sales') && newPeriod) {
        const result = await getSalesSummary(
          (newPeriod === 'last_week' ? 'week' : newPeriod === 'last_month' ? 'month' : newPeriod) as any
        );
        return { text: result.message, intent: 'sales_summary' };
      }
      
      if (lastIntent?.includes('visit') && newPeriod) {
        const n = await countVisits(
          (newPeriod === 'last_week' ? 'week' : newPeriod === 'last_month' ? 'month' : newPeriod) as any
        );
        const label = newPeriod === 'yesterday' ? 'ieri' : 
                      newPeriod === 'week' ? 'questa settimana' :
                      newPeriod === 'month' ? 'questo mese' : '';
        return { text: `**${n}** visite ${label}.`, intent: 'visit_count' };
      }
      
      return { text: "Non ho capito a cosa applica il periodo. Riformula la domanda!", intent };
    }

    case 'followup_detail': {
      // Mostra più dettagli sull'ultimo risultato
      const lastIntent = state.ultimo_intent;
      const lastEntities = state.entita_correnti ?? {};
      
      if (lastEntities.clientName) {
        if (!crypto) return { ...needCrypto(), intent };
        const result = await getVisitHistoryForClient(crypto, lastEntities.clientName);
        return { text: result.message, intent: 'visit_history' };
      }
      
      return { text: "Di cosa vuoi più dettagli?", intent };
    }

    case 'followup_filter': {
      // Applica filtro (città/tipo) all'ultimo intent
      const lastIntent = state.ultimo_intent;
      const city = entities.city;
      const localeType = entities.localeType;
      
      // Se l'ultimo intent era sui clienti, filtra per città
      if (lastIntent?.includes('client') && city) {
        if (!crypto) return { ...needCrypto(), intent };
        const result = await searchClients(crypto, city);
        return { 
          text: `Clienti a **${city.charAt(0).toUpperCase() + city.slice(1)}**:\n\n${result.message}`, 
          intent: 'client_list' 
        };
      }
      
      // Se l'ultimo intent era sulle visite, filtra per città
      if (lastIntent?.includes('visit') && city) {
        return { 
          text: `Per vedere le visite a ${city}, prova: "visite a ${city}" o "clienti visitati a ${city}"`, 
          intent 
        };
      }
      
      // Filtro per tipo locale
      if (localeType) {
        return { 
          text: `Per filtrare per ${localeType}, prova: "clienti di tipo ${localeType}" o "lista ${localeType}"`, 
          intent 
        };
      }
      
      return { 
        text: "Non ho capito quale filtro vuoi applicare. Puoi dire 'clienti a Milano' o 'lista bar'.", 
        intent 
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFERME
    // ═══════════════════════════════════════════════════════════════

    case 'confirm': {
      const lastIntent = state.ultimo_intent;
      if (lastIntent === 'visit_create') {
        return { 
          text: "Perfetto! 👉 [Apri Registrazione Visita](/tools/add-visit)",
          intent 
        };
      }
      if (lastIntent === 'client_create') {
        return { 
          text: "Perfetto! 👉 [Apri Nuovo Cliente](/tools/quick-add-client)",
          intent 
        };
      }
      return { text: "Ok! Come posso aiutarti?", intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 ANALYTICS / BI - Domande analitiche complesse
    // ═══════════════════════════════════════════════════════════════

    case 'analytics_top_clients': {
      if (!crypto) return { ...needCrypto(), intent };
      const limit = entities.limit ?? 10;
      
      // Determina periodo da entities
      let period: 'month' | 'quarter' | 'year' | undefined;
      if (entities.period === 'month' || entities.period === 'last_month') period = 'month';
      else if (entities.period === 'quarter') period = 'quarter';
      else if (entities.period === 'year') period = 'year';
      
      const result = await getTopClients(crypto, limit, period);
      return { text: result.message, intent };
    }

    case 'analytics_top_products': {
      if (!crypto) return { ...needCrypto(), intent };
      const limit = entities.limit ?? 10;
      
      // Determina periodo
      let period: 'month' | 'quarter' | 'year' | undefined;
      if (entities.period === 'month' || entities.period === 'last_month') period = 'month';
      else if (entities.period === 'quarter') period = 'quarter';
      else if (entities.period === 'year') period = 'year';
      
      const result = await getTopProducts(crypto, limit, period);
      return { text: result.message, intent };
    }

    case 'analytics_client_trend': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;
      
      if (!clientName) {
        return { 
          text: "Di quale cliente vuoi vedere il trend? Dimmi il nome.",
          intent 
        };
      }

      // Mostriamo storico visite + vendite come proxy del trend
      const [visitResult, salesResult] = await Promise.all([
        getVisitHistoryForClient(crypto, clientName),
        getSalesByClient(crypto, clientName)
      ]);

      if (!visitResult.found) {
        return { text: visitResult.message, intent };
      }

      let text = `📈 **Trend di ${visitResult.clientName}**\n\n`;
      text += `**Attività recenti:**\n${visitResult.message}\n\n`;
      
      if (salesResult.found) {
        text += `**Vendite totali:** €${salesResult.totalAmount.toLocaleString('it-IT')} (${salesResult.visitCount} ordini)`;
      }

      return { text, intent };
    }

    case 'analytics_sales_comparison': {
      const period = entities.period ?? 'month';
      const comparison = entities.comparisonType ?? 'vs_previous';
      
      // Prendiamo i dati del periodo corrente
      const current = await getSalesSummary(
        (period === 'last_week' ? 'week' : period === 'last_month' ? 'month' : period) as any
      );

      let text = `📊 **Confronto vendite**\n\n`;
      text += `**Periodo attuale:** ${current.message}\n\n`;
      text += `_Il confronto con il periodo precedente sarà disponibile a breve!_\n\n`;
      text += `💡 Suggerimento: controlla i clienti in crescita con "Chi sta crescendo?"`;

      return { text, intent };
    }

    case 'analytics_avg_order': {
      const period = entities.period ?? 'month';
      const result = await getSalesSummary(
        (period === 'last_week' ? 'week' : period === 'last_month' ? 'month' : period) as any
      );

      const avgOrder = result.visitCount > 0 
        ? Math.round(result.totalAmount / result.visitCount) 
        : 0;

      let text = `📊 **Ordine medio ${result.period}**\n\n`;
      if (avgOrder > 0) {
        text += `💰 **€${avgOrder.toLocaleString('it-IT')}** per ordine\n`;
        text += `📦 ${result.visitCount} ordini totali\n`;
        text += `💵 €${result.totalAmount.toLocaleString('it-IT')} fatturato totale`;
      } else {
        text += `Nessun ordine registrato ${result.period}.`;
      }

      return { text, intent };
    }

    case 'analytics_best_day': {
      // Determina periodo
      let period: 'month' | 'quarter' | 'year' | undefined;
      if (entities.period === 'month' || entities.period === 'last_month') period = 'month';
      else if (entities.period === 'quarter') period = 'quarter';
      else if (entities.period === 'year') period = 'year';
      else period = 'month'; // default
      
      const result = await getSalesByDayOfWeek(period);
      return { text: result.message, intent };
    }

    case 'analytics_zone_performance': {
      if (!crypto) return { ...needCrypto(), intent };
      
      // Determina periodo
      let period: 'month' | 'quarter' | 'year' | undefined;
      if (entities.period === 'month' || entities.period === 'last_month') period = 'month';
      else if (entities.period === 'quarter') period = 'quarter';
      else if (entities.period === 'year') period = 'year';
      else period = 'month'; // default
      
      const result = await getSalesByCity(crypto, period);
      return { text: result.message, intent };
    }

    case 'analytics_lost_clients': {
      if (!crypto) return { ...needCrypto(), intent };
      const days = entities.inactivityDays ?? 90;
      
      const result = await getInactiveClients(crypto, days);
      
      let text = `⚠️ **Clienti potenzialmente persi** (>${days} giorni)\n\n`;
      text += result.message;
      
      return { text, intent };
    }

    case 'analytics_growing_clients': {
      if (!crypto) return { ...needCrypto(), intent };
      
      // Per ora mostriamo i top clienti più recenti come proxy della crescita
      // In futuro: confronto periodo vs periodo precedente
      const result = await getTopClients(crypto, 10, 'month');
      
      if (result.clients.length === 0) {
        return { text: "Nessun dato sulle vendite questo mese.", intent };
      }

      // Filtra clienti con più ordini (segno di attività recente)
      const activeClients = result.clients
        .filter(c => c.orderCount >= 2)
        .slice(0, 5);

      if (activeClients.length === 0) {
        return {
          text: `📈 **Clienti più attivi questo mese:**\n\n` +
                result.clients.slice(0, 5).map((c, i) => 
                  `${i + 1}. **${c.name}**: €${c.totalRevenue.toLocaleString('it-IT')} (${c.orderCount} ordini)`
                ).join('\n') +
                `\n\n💡 _Per analisi di crescita dettagliate serve lo storico di più mesi._`,
          intent
        };
      }

      return {
        text: `📈 **Clienti più attivi questo mese** (≥2 ordini):\n\n` +
              activeClients.map((c, i) => 
                `${i + 1}. **${c.name}**: €${c.totalRevenue.toLocaleString('it-IT')} (${c.orderCount} ordini, media €${c.avgOrder})`
              ).join('\n') +
              `\n\n💡 Questi clienti stanno ordinando frequentemente!`,
        intent
      };
    }

    case 'analytics_forecast': {
      const currentMonth = await getSalesSummary('month');
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysPassed = today.getDate();
      const projectedTotal = daysPassed > 0 
        ? Math.round((currentMonth.totalAmount / daysPassed) * daysInMonth)
        : 0;

      let text = `🔮 **Previsione fine mese**\n\n`;
      text += `📊 **Attuale:** €${currentMonth.totalAmount.toLocaleString('it-IT')} (${daysPassed}/${daysInMonth} giorni)\n\n`;
      
      if (projectedTotal > 0) {
        text += `📈 **Proiezione:** €${projectedTotal.toLocaleString('it-IT')}\n\n`;
        text += `_Basata sul ritmo attuale di vendita_`;
      } else {
        text += `Non ci sono ancora dati sufficienti per una previsione.`;
      }

      return { text, intent };
    }

    case 'analytics_target_progress': {
      const currentMonth = await getSalesSummary('month');
      
      let text = `🎯 **Progresso obiettivo**\n\n`;
      text += `📊 **Vendite mese corrente:** €${currentMonth.totalAmount.toLocaleString('it-IT')}\n\n`;
      text += `_Per impostare un obiettivo mensile, vai su Impostazioni._\n\n`;
      text += `💡 Vuoi vedere una previsione? Chiedi "Previsione fatturato fine mese"`;

      return { text, intent };
    }

    case 'analytics_cross_sell': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;

      if (!clientName) {
        return {
          text: `💡 **Opportunità di vendita**\n\n` +
                `Dimmi il nome del cliente per suggerirti prodotti da proporre.\n\n` +
                `Esempio: "Cosa posso proporre a Rossi?"`,
          intent
        };
      }

      // Mostra prodotti già discussi come base per suggerimenti
      const result = await getProductsDiscussedWithClient(crypto, clientName);
      
      let text = `💡 **Opportunità per ${result.clientName ?? clientName}**\n\n`;
      
      if (result.found && result.products.length > 0) {
        text += `**Prodotti già acquistati:**\n`;
        text += result.products.slice(0, 5).map(p => `• ${p}`).join('\n');
        text += `\n\n_Suggerimento: proponi prodotti complementari o versioni premium!_`;
      } else {
        text += `Nessun prodotto registrato per questo cliente.\n\n`;
        text += `👉 Ottima opportunità per presentare l'intero catalogo!`;
      }

      return { text, intent };
    }

    case 'analytics_never_bought': {
      if (!crypto) return { ...needCrypto(), intent };
      const productName = entities.productName;

      if (!productName) {
        return {
          text: `🔍 **Clienti che non hanno mai comprato...**\n\n` +
                `Dimmi quale prodotto cerchi.\n\n` +
                `Esempio: "Chi non ha mai comprato birra?"`,
          intent
        };
      }

      // Per ora invertiamo la logica: mostriamo chi LO compra
      const result = await getVisitsByProduct(crypto, productName);
      
      let text = `🔍 **Analisi "${productName}"**\n\n`;
      
      if (result.found) {
        text += `**${result.results.length} clienti hanno comprato "${productName}"**\n\n`;
        text += `_Per trovare chi NON lo ha mai comprato, confronta con la tua lista clienti completa._`;
      } else {
        text += `Nessun cliente ha mai comprato "${productName}".\n\n`;
        text += `🎯 Opportunità: proponi questo prodotto a tutti i tuoi clienti!`;
      }

      return { text, intent };
    }

    case 'product_price': {
      const productName = entities.productName;
      
      if (!productName) {
        return { text: "Di quale prodotto vuoi sapere il prezzo?", intent };
      }

      // TODO: implementare ricerca prezzo da products table
      return {
        text: `💰 **Prezzo di "${productName}"**\n\n` +
              `_Ricerca nel catalogo in arrivo!_\n\n` +
              `Nel frattempo vai su [Prodotti](/products) per consultare il listino.`,
        intent
      };
    }

    case 'product_stock': {
      const productName = entities.productName;
      
      if (!productName) {
        return { text: "Di quale prodotto vuoi sapere la giacenza?", intent };
      }

      // TODO: implementare ricerca giacenza da products table
      return {
        text: `📦 **Giacenza di "${productName}"**\n\n` +
              `_Ricerca nel catalogo in arrivo!_\n\n` +
              `Nel frattempo vai su [Prodotti](/products) per consultare le disponibilità.`,
        intent
      };
    }

    case 'product_not_proposed': {
      if (!crypto) return { ...needCrypto(), intent };
      const clientName = entities.clientName;

      if (!clientName) {
        return {
          text: `🆕 **Prodotti mai proposti**\n\n` +
                `Dimmi il nome del cliente.\n\n` +
                `Esempio: "Cosa non ho mai proposto a Rossi?"`,
          intent
        };
      }

      // Mostra prodotti già discussi e suggerisci di guardare il catalogo
      const result = await getProductsDiscussedWithClient(crypto, clientName);
      
      let text = `🆕 **Novità per ${result.clientName ?? clientName}**\n\n`;
      
      if (result.found && result.products.length > 0) {
        text += `**Prodotti già proposti:** ${result.products.length}\n`;
        text += result.products.slice(0, 5).map(p => `• ${p}`).join('\n');
        text += `\n\n💡 Confronta con il [catalogo](/products) per trovare novità!`;
      } else {
        text += `Nessun prodotto registrato.\n\n`;
        text += `🎯 Hai l'intero catalogo da proporre!`;
      }

      return { text, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 ANALISI GEOGRAFICHE - Abbiamo coordinate clienti + partenza!
    // ═══════════════════════════════════════════════════════════════

    case 'revenue_per_km': {
      if (!crypto) return { ...needCrypto(), intent };
      
      // Recupera coordinate punto partenza da localStorage (via stato)
      const homeCoords = getHomeCoords();
      if (!homeCoords) {
        return {
          text: `📍 **Imposta prima il punto di partenza!**\n\nVai in ⚙️ Impostazioni → 📍 Punto di Partenza e inserisci il tuo indirizzo.\n\nQuesto mi permetterà di calcolare distanze e ottimizzare i tuoi giri.`,
          intent
        };
      }
      
      const period = (entities.period as 'week' | 'month' | 'year') || 'month';
      const result = await analyzeRevenuePerKmByProduct(crypto, homeCoords, period);
      return { text: result.message, intent };
    }

    case 'clients_nearby': {
      if (!crypto) return { ...needCrypto(), intent };
      
      const homeCoords = getHomeCoords();
      if (!homeCoords) {
        return {
          text: `📍 **Imposta prima il punto di partenza!**\n\nVai in ⚙️ Impostazioni → 📍 Punto di Partenza.\n\nMi serve per calcolare le distanze dai clienti.`,
          intent
        };
      }
      
      const limit = (entities.limit as number) || 10;
      const result = await getNearestClients(crypto, homeCoords, limit);
      return { text: result.message, intent };
    }

    case 'km_traveled': {
      if (!crypto) return { ...needCrypto(), intent };
      
      const homeCoords = getHomeCoords();
      if (!homeCoords) {
        return {
          text: `📍 **Imposta prima il punto di partenza!**\n\nVai in ⚙️ Impostazioni → 📍 Punto di Partenza.\n\nMi serve per stimare i chilometri percorsi.`,
          intent
        };
      }
      
      const period = (entities.period as 'today' | 'week' | 'month' | 'year') || 'month';
      const result = await getKmTraveledInPeriod(crypto, homeCoords, period);
      return { text: result.message, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 DOMANDE IMPOSSIBILI - Solo quelle che richiedono dati mancanti
    // ═══════════════════════════════════════════════════════════════

    case 'analytics_impossible': {
      const missingData = entities.missingData ?? [];
      
      let text = `🤔 **Domanda interessante!**\n\n`;
      text += `Purtroppo non ho ancora questi dati:\n`;
      
      const missingLabels: Record<string, string> = {
        'margini_prodotto': '💹 Margini di profitto per prodotto',
        'tempo_visita': '⏱️ Durata delle singole visite',
      };
      
      for (const data of missingData) {
        text += `• ${missingLabels[data] ?? data}\n`;
      }
      
      text += `\n**Però posso aiutarti con:**\n`;
      
      if (missingData.includes('margini_prodotto')) {
        text += `• 💰 "Qual è il prodotto più venduto?" - per volume\n`;
        text += `• 📈 "Quale prodotto rende di più per km?" - ottimizzazione giri\n`;
        text += `• 🏆 "Top clienti" - per fatturato\n`;
      }
      
      if (missingData.includes('tempo_visita')) {
        text += `• 📅 "Quante visite ho fatto questo mese?" - frequenza\n`;
        text += `• 👥 "Chi non vedo da un mese?" - clienti da visitare\n`;
        text += `• 🚗 "Quanti km ho fatto?" - distanze percorse\n`;
      }
      
      text += `\n💡 _Queste metriche potrebbero essere aggiunte in futuro!_`;
      
      return { text, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 FASE 1: ELABORAZIONI NUMERICHE AVANZATE
    // ═══════════════════════════════════════════════════════════════

    case 'analytics_daily_avg': {
      const period = (entities.period as 'week' | 'month' | 'quarter' | 'year') || 'month';
      const result = await getDailyAverage(period);
      return { text: result.message, intent };
    }

    case 'analytics_month_comparison': {
      const result = await getMonthComparison();
      return { text: result.message, intent };
    }

    case 'analytics_target_gap': {
      const targetAmount = entities.targetAmount as number | undefined;
      const period = (entities.period as 'month' | 'quarter' | 'year') || 'month';
      const result = await getTargetGap(targetAmount, period);
      return { text: result.message, intent };
    }

    case 'analytics_yearly_forecast': {
      const result = await getYearlyForecast();
      return { text: result.message, intent };
    }

    case 'analytics_growth_leader': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getGrowthLeader(crypto);
      return { text: result.message, intent };
    }

    case 'analytics_new_clients': {
      const period = (entities.period as 'week' | 'month' | 'quarter' | 'year') || 'month';
      const result = await getNewClientsCount(period);
      return { text: result.message, intent };
    }

    case 'analytics_conversion_rate': {
      const period = (entities.period as 'week' | 'month' | 'quarter' | 'year') || 'month';
      const result = await getConversionRate(period);
      return { text: result.message, intent };
    }

    case 'analytics_visit_frequency': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getVisitFrequency(crypto);
      return { text: result.message, intent };
    }

    case 'analytics_revenue_per_km': {
      if (!crypto) return { ...needCrypto(), intent };
      
      const homeCoords = getHomeCoords();
      if (!homeCoords) {
        return {
          text: `📍 **Imposta prima il punto di partenza!**\n\nVai in ⚙️ Impostazioni → 📍 Punto di Partenza.\n\nMi serve per calcolare il fatturato per km.`,
          intent
        };
      }
      
      const period = (entities.period as 'month' | 'quarter' | 'year') || 'month';
      const result = await getRevenuePerKmSummary(crypto, homeCoords, period);
      return { text: result.message, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 FASE 2: INFERENZE STRATEGICHE
    // ═══════════════════════════════════════════════════════════════

    case 'strategy_visit_priority': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getVisitPriorities(crypto);
      return { text: result.message, intent };
    }

    case 'strategy_churn_risk': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getChurnRiskClients(crypto);
      return { text: result.message, intent };
    }

    case 'strategy_revenue_focus': {
      const result = await getRevenueFocusSuggestions();
      return { text: result.message, intent };
    }

    case 'strategy_product_focus': {
      const result = await getProductFocusSuggestions();
      return { text: result.message, intent };
    }

    case 'strategy_ideal_customer': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getIdealCustomerProfile(crypto);
      return { text: result.message, intent };
    }

    case 'strategy_lost_opportunities': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getLostOpportunities(crypto);
      return { text: result.message, intent };
    }

    case 'strategy_growth_potential': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getGrowthPotentialClients(crypto);
      return { text: result.message, intent };
    }

    case 'strategy_action_plan': {
      const targetAmount = entities.targetAmount as number | undefined;
      const result = await getActionPlan(targetAmount);
      return { text: result.message, intent };
    }

    case 'strategy_best_time': {
      const localeType = entities.localeType as string || 'bar';
      const result = await getBestTimeForLocaleType(localeType);
      return { text: result.message, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 FASE 3: VISUALIZZAZIONI E TREND
    // ═══════════════════════════════════════════════════════════════

    case 'chart_sales_trend': {
      const result = await getSalesTrend(6);
      return { text: result.message, intent };
    }

    case 'chart_yoy_comparison': {
      const result = await getYoYComparison();
      return { text: result.message, intent };
    }

    case 'chart_sales_by_weekday': {
      const result = await getSalesByWeekdayChart();
      return { text: result.message, intent };
    }

    case 'chart_sales_by_city': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getSalesByCityChart(crypto);
      return { text: result.message, intent };
    }

    case 'chart_visits_by_type': {
      const result = await getVisitsByTypeChart();
      return { text: result.message, intent };
    }

    case 'chart_avg_order_trend': {
      const result = await getAvgOrderTrend(6);
      return { text: result.message, intent };
    }

    case 'chart_clients_by_revenue': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getClientsByRevenueBand(crypto);
      return { text: result.message, intent };
    }

    case 'chart_seasonality': {
      const result = await getSeasonality();
      return { text: result.message, intent };
    }

    case 'chart_client_growth': {
      const result = await getClientGrowth(12);
      return { text: result.message, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // 💡 NAPOLEONE - Briefing Proattivo
    // ═══════════════════════════════════════════════════════════════

    case 'napoleon_briefing': {
      // Ottieni userId
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { text: "💡 Non riesco ad accedere ai tuoi dati. Effettua il login.", intent };
      }
      
      // Genera nuovi suggerimenti e recupera tutti
      if (crypto) {
        await generateSuggestions(user.id, crypto);
      }
      const suggestions = await getSuggestions(user.id);
      const briefingText = generateBriefing(suggestions);
      
      return { text: briefingText, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // UNKNOWN / DEFAULT
    // ═══════════════════════════════════════════════════════════════

    case 'unknown':
    default: {
      // 🧠 RAG + LLM Fallback per query non riconosciute
      if (userId && userText && shouldUseLLMFallback(intent, parsed.confidence)) {
        try {
          const llmResponse = await generateWithRAG(userText, userId);
          return {
            text: llmResponse.text,
            intent: llmResponse.ragResults.length > 0 ? 'rag_response' : 'llm_response',
          };
        } catch (llmError) {
          console.error('[planner] LLM fallback error:', llmError);
          // Continua con fallback locale
        }
      }
      
      // Fallback locale se LLM non disponibile
      if (parsed.suggestedResponse) {
        return { text: parsed.suggestedResponse, intent: 'unknown' };
      }
      
      return {
        text: getContextualHelp(state, nluContext),
        intent: 'unknown',
      };
    }
  }
}

// ==================== AIUTO CONTESTUALE ====================

function getContextualHelp(state: ConversationContextState, nluContext: ConversationContext): string {
  // Se c'è un cliente nel focus, suggerisci azioni su di esso
  if (nluContext.focusClient) {
    return `Non ho capito. Stavi parlando di **${nluContext.focusClient.name}**.\n\nProva:\n• "Quando l'ho visto l'ultima volta?"\n• "Quanto gli ho venduto?"\n• "Dimmi tutto su di lui"`;
  }

  const topic = state.topic_attivo || nluContext.currentTopic;
  
  const examples: Record<string, string[]> = {
    clients: [
      '"Quanti clienti ho?"',
      '"Cerca cliente Rossi"',
      '"Chi non vedo da un mese?"',
    ],
    visits: [
      '"Visite di oggi"',
      '"Quando ho visto Rossi?"',
      '"Il secondo cliente di oggi"',
    ],
    sales: [
      '"Quanto ho venduto questo mese?"',
      '"Vendite a Rossi"',
      '"Chi compra birra?"',
    ],
    products: [
      '"Prodotti mancanti"',
      '"Cosa ho discusso con Rossi?"',
    ],
    planning: [
      '"Cosa devo fare oggi?"',
      '"Chi devo richiamare?"',
    ],
  };

  let text = "Non ho capito. Ecco cosa puoi chiedermi:\n\n";
  
  if (topic && typeof topic === 'string' && examples[topic]) {
    text += `**${topic.charAt(0).toUpperCase() + topic.slice(1)}:**\n`;
    text += examples[topic].map(e => `• ${e}`).join('\n');
    text += "\n\n";
  }

  // Aggiungi esempi da altri topic
  const allTopics = Object.keys(examples);
  const otherTopics = topic ? allTopics.filter(t => t !== topic) : allTopics;
  
  text += "**Altre opzioni:**\n";
  for (const t of otherTopics.slice(0, 3)) {
    text += `• ${examples[t][0]}\n`;
  }

  return text;
}

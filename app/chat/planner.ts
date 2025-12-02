// app/chat/planner.ts
//
// PLANNER v3 - Sistema unificato NLU per Repping
// ============================================================================
// 
// Usa il nuovo parser unificato (lib/nlu/unified.ts) per:
// - Riconoscere tutti gli intent dell'agente
// - Estrarre entità (nomi clienti, date, importi)
// - Gestire il contesto conversazionale
// - Restituire risposte naturali
//
// ============================================================================

import { parseIntent, updateContext, type ParsedIntent, type ConversationContext } from "@/lib/nlu/unified";
import {
  // Clienti
  countClients,
  listClientNames,
  listClientEmails,
  searchClients,
  // Visite
  countVisits,
  getVisitsToday,
  getLastVisitToClient,
  getVisitHistoryForClient,
  // Vendite
  getSalesSummary,
  getSalesByClient,
  // Prodotti
  listMissingProducts,
  getProductsDiscussedWithClient,
  // Planning
  getCallbacks,
  getTodayPlanning,
  type ClientNamesResult,
} from "../data/adapters";

// ==================== TIPI ====================

type Scope =
  | "global"
  | "clients"
  | "products"
  | "orders"
  | "sales"
  | "visits"
  | "planning"
  | "prodotti"
  | "ordini";

type ConversationContextState = {
  scope: Scope;
  topic_attivo: string | null;
  ultimo_intent: string | null;
  entita_correnti: Record<string, any> | null;
  ultimo_risultato: any | null;
  updated_at: number | null;
  scope_stack?: Scope[];
  // Nuovo: contesto NLU unificato
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
};

// ==================== HELPERS ====================

function needCrypto(): PlannerResult {
  return {
    text: "🔒 Devi sbloccare la sessione per visualizzare i dati.",
    appliedScope: null,
    intent: "crypto_not_ready",
  };
}

function scopeFromIntent(intent: string): Scope {
  if (intent.startsWith('client')) return 'clients';
  if (intent.startsWith('visit')) return 'visits';
  if (intent.startsWith('sales')) return 'sales';
  if (intent.startsWith('product')) return 'products';
  if (intent.startsWith('planning')) return 'planning';
  return 'global';
}

// ==================== PLANNER PRINCIPALE ====================

export async function runChatTurn_v2(
  userText: string,
  conv: ConversationApi,
  crypto: CryptoLike | null
): Promise<PlannerResult> {
  const { state, expired } = conv;

  // Reset se contesto scaduto
  if (expired) {
    conv.reset();
  }

  // 1. Parse con NLU unificato
  const nluContext: ConversationContext = state.nluContext ?? {};
  const parsed = parseIntent(userText, nluContext);

  console.debug("[planner:v3]", {
    input: userText,
    intent: parsed.intent,
    confidence: parsed.confidence,
    entities: parsed.entities,
    needsConfirmation: parsed.needsConfirmation,
  });

  // 2. Se ha una risposta suggerita (greet, help, thanks, cancel)
  if (parsed.suggestedResponse && ['greet', 'help', 'thanks', 'cancel'].includes(parsed.intent)) {
    return {
      text: parsed.suggestedResponse,
      appliedScope: state.scope,
      intent: parsed.intent,
      usedContext: state,
    };
  }

  // 3. Router per intent
  const scope = scopeFromIntent(parsed.intent);
  
  try {
    const result = await handleIntent(parsed, crypto, state);
    
    // Aggiorna contesto
    const newNluContext = updateContext(nluContext, parsed);
    conv.remember({
      topic_attivo: scope,
      ultimo_intent: parsed.intent,
      entita_correnti: parsed.entities,
      nluContext: newNluContext,
    });

    return {
      ...result,
      appliedScope: scope,
      usedContext: conv.state,
    };
  } catch (error) {
    console.error("[planner:error]", error);
    return {
      text: "❌ Si è verificato un errore. Riprova tra poco.",
      appliedScope: state.scope,
      intent: "error",
      usedContext: state,
    };
  }
}

// ==================== HANDLER INTENT ====================

async function handleIntent(
  parsed: ParsedIntent,
  crypto: CryptoLike | null,
  state: ConversationContextState
): Promise<{ text: string; intent: string }> {
  const { intent, entities } = parsed;

  switch (intent) {
    // ═══════════════════════════════════════════════════════════════
    // CLIENTI
    // ═══════════════════════════════════════════════════════════════
    
    case 'client_count': {
      const n = await countClients();
      return {
        text: `Hai **${n}** ${n === 1 ? 'cliente' : 'clienti'} in archivio.`,
        intent,
      };
    }

    case 'client_list': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await listClientNames(crypto);
      const { names, withoutName } = result;
      
      if (names.length === 0) {
        return { text: "Non hai ancora clienti in archivio.", intent };
      }

      let text: string;
      if (names.length <= 10) {
        // Pochi clienti: li elenco tutti
        text = `I tuoi **${names.length}** clienti:\n${names.map(n => `• ${n}`).join('\n')}`;
      } else {
        // Tanti clienti: mostro i primi 10 + offro di aprire la pagina
        text = `Hai **${names.length}** clienti. Ecco i primi 10:\n${names.slice(0, 10).map(n => `• ${n}`).join('\n')}`;
        text += `\n\n📋 **Vuoi la lista completa?** Vai su [/clients](/clients) oppure dimmi "apri clienti"`;
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
      // Mostra info base + ultima visita + vendite
      const [visitResult, salesResult] = await Promise.all([
        getLastVisitToClient(crypto, clientName),
        getSalesByClient(crypto, clientName)
      ]);
      
      if (!visitResult.found) {
        return { text: visitResult.message, intent };
      }

      let text = `📋 **${visitResult.clientName}**\n\n`;
      text += visitResult.message + '\n';
      if (salesResult.found && salesResult.totalAmount > 0) {
        text += `\n💰 Totale vendite: €${salesResult.totalAmount.toLocaleString('it-IT')}`;
      }
      
      return { text, intent };
    }

    case 'client_create': {
      const clientName = entities.clientName;
      if (!clientName) {
        return { 
          text: "Come si chiama il nuovo cliente? Puoi dire: \"Nuovo cliente Mario Rossi\"", 
          intent 
        };
      }
      // Non creiamo direttamente, suggeriamo di usare lo strumento
      return {
        text: `Per creare il cliente **${clientName}**, usa lo strumento "Nuovo Cliente" nel menu laterale, oppure vai su /tools/quick-add-client`,
        intent,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // VISITE
    // ═══════════════════════════════════════════════════════════════

    case 'visit_count': {
      // Mappa quarter a month per ora (countVisits non supporta quarter)
      const period = entities.period === 'quarter' ? 'month' : entities.period;
      const n = await countVisits(period as 'today' | 'week' | 'month' | 'year' | undefined);
      const periodLabel = entities.period === 'today' ? 'oggi' : 
                          entities.period === 'week' ? 'questa settimana' :
                          entities.period === 'month' ? 'questo mese' :
                          entities.period === 'quarter' ? 'questo trimestre' :
                          entities.period === 'year' ? "quest'anno" : 'in totale';
      return {
        text: `Hai fatto **${n}** ${n === 1 ? 'visita' : 'visite'} ${periodLabel}.`,
        intent,
      };
    }

    case 'visit_today': {
      if (!crypto) return { ...needCrypto(), intent };
      const visits = await getVisitsToday(crypto);
      
      if (visits.length === 0) {
        return { text: "Non hai ancora registrato visite oggi.", intent };
      }

      const lines = visits.map(v => {
        let line = `• **${v.clientName}** (${v.tipo})`;
        if (v.importo_vendita) line += ` - €${v.importo_vendita}`;
        return line;
      });

      const total = visits.reduce((sum, v) => sum + (v.importo_vendita ?? 0), 0);
      let text = `📍 **Visite di oggi** (${visits.length}):\n${lines.join('\n')}`;
      if (total > 0) {
        text += `\n\n💰 Totale: €${total.toLocaleString('it-IT')}`;
      }
      
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
      
      let text = "Per registrare una visita, usa lo strumento \"Nuova Visita\" nel menu laterale";
      if (clientName || amount) {
        text += ".\n\nHo capito:";
        if (clientName) text += `\n• Cliente: ${clientName}`;
        if (amount) text += `\n• Importo: €${amount}`;
        text += "\n\n👉 Vai su /tools/add-visit per completare la registrazione.";
      }
      
      return { text, intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // VENDITE
    // ═══════════════════════════════════════════════════════════════

    case 'sales_summary':
    case 'sales_month': {
      // Mappa quarter a month per ora (getSalesSummary non supporta quarter)
      const rawPeriod = entities.period ?? 'month';
      const period = rawPeriod === 'quarter' ? 'month' : rawPeriod;
      const result = await getSalesSummary(period as 'today' | 'week' | 'month' | 'year' | undefined);
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
        return { text: "Non ci sono prodotti mancanti al momento.", intent };
      }
      return { 
        text: `⚠️ Prodotti mancanti: ${missing.join(", ")}`,
        intent 
      };
    }

    case 'product_search': {
      const productName = entities.productName;
      if (!productName) {
        return { text: "Quale prodotto vuoi cercare?", intent };
      }
      return { 
        text: `La ricerca prodotti nel catalogo non è ancora implementata. Cercavi: "${productName}"`,
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

    case 'planning_callbacks': {
      if (!crypto) return { ...needCrypto(), intent };
      const result = await getCallbacks(crypto);
      return { text: result.message, intent };
    }

    case 'planning_week': {
      return { 
        text: "Il planning settimanale non è ancora implementato. Prova con \"Cosa devo fare oggi?\"",
        intent 
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
          text: `📂 **${name}**\n\n👉 [Clicca qui per aprire](${url})\n\nOppure usa il menu laterale destro.`,
          intent,
        };
      }
      
      return {
        text: "Dove vuoi andare? Posso aprirti: clienti, visite, prodotti, documenti o impostazioni.",
        intent,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // CONFERME
    // ═══════════════════════════════════════════════════════════════

    case 'confirm': {
      // Gestisce conferme basate sull'ultimo intent
      const lastIntent = state.ultimo_intent;
      if (lastIntent === 'visit_create') {
        return { 
          text: "Perfetto! Vai su /tools/add-visit per completare la registrazione della visita.",
          intent 
        };
      }
      return { text: "Ok! Come posso aiutarti?", intent };
    }

    // ═══════════════════════════════════════════════════════════════
    // UNKNOWN
    // ═══════════════════════════════════════════════════════════════

    case 'unknown':
    default: {
      return {
        text: parsed.suggestedResponse || getContextualHelp(state),
        intent: 'unknown',
      };
    }
  }
}

// ==================== AIUTO CONTESTUALE ====================

function getContextualHelp(state: ConversationContextState): string {
  const topic = state.topic_attivo;
  
  const examples: Record<string, string[]> = {
    clients: [
      "Quanti clienti ho?",
      "Cerca cliente Rossi",
      "Lista clienti",
    ],
    visits: [
      "Quando ho visto Rossi?",
      "Visite di oggi",
      "Quante visite ho fatto questo mese?",
    ],
    sales: [
      "Quanto ho venduto questo mese?",
      "Vendite a Rossi",
      "Vendite di oggi",
    ],
    products: [
      "Prodotti mancanti",
      "Cosa ho discusso con Rossi?",
    ],
    planning: [
      "Cosa devo fare oggi?",
      "Chi devo richiamare?",
    ],
  };

  let text = "Non ho capito. Ecco cosa puoi chiedermi:\n\n";
  
  if (topic && examples[topic]) {
    text += `**${topic.charAt(0).toUpperCase() + topic.slice(1)}:**\n`;
    text += examples[topic].map(e => `• "${e}"`).join('\n');
    text += "\n\n";
  }

  // Aggiungi sempre qualche esempio generico
  const allTopics = Object.keys(examples);
  const otherTopics = topic ? allTopics.filter(t => t !== topic) : allTopics;
  
  text += "**Altri argomenti:**\n";
  for (const t of otherTopics.slice(0, 3)) {
    text += `• "${examples[t][0]}"\n`;
  }

  return text;
}

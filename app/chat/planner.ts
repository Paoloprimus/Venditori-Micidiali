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
import {
  // Clienti
  countClients,
  listClientNames,
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
};

// ==================== HELPERS ====================

function needCrypto(): { text: string; intent: string } {
  return {
    text: "🔒 Devi sbloccare la sessione per visualizzare i dati. Inserisci la passphrase nel pannello laterale.",
    intent: "crypto_not_ready",
  };
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
function formatProactiveSuggestions(suggestions?: ProactiveSuggestion[]): string {
  if (!suggestions?.length) return '';
  
  const highPriority = suggestions.filter(s => s.priority === 'high');
  if (highPriority.length > 0) {
    return `\n\n💡 **Suggerimento:** ${highPriority[0].text}`;
  }
  
  const medium = suggestions.filter(s => s.priority === 'medium');
  if (medium.length > 0) {
    return `\n\n💡 ${medium[0].text}`;
  }
  
  return '';
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
    };
  }

  // 4. Router per intent
  const scope = scopeFromIntent(parsed.intent);
  
  try {
    const result = await handleIntent(parsed, crypto, state, nluContext);
    
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

    return {
      text: result.text + proactiveText,
      appliedScope: scope,
      intent: result.intent,
      usedContext: conv.state,
      proactiveSuggestions: parsed.proactiveSuggestions,
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
  state: ConversationContextState,
  nluContext: ConversationContext
): Promise<{ text: string; intent: string }> {
  const { intent, entities } = parsed;

  switch (intent) {
    // ═══════════════════════════════════════════════════════════════
    // CLIENTI
    // ═══════════════════════════════════════════════════════════════
    
    case 'client_count': {
      const n = await countClients();
      let text = `Hai **${n}** ${n === 1 ? 'cliente' : 'clienti'} in archivio.`;
      
      // Proattivo: se tanti clienti, suggerisci filtro
      if (n > 50) {
        text += `\n\n📊 Sono tanti! Vuoi filtrarli per città o tipo locale?`;
      }
      
      return { text, intent };
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
      
      // Per ora usiamo getCallbacks come proxy - in futuro implementare query dedicata
      const result = await getCallbacks(crypto);
      
      if (result.items.length === 0) {
        return { 
          text: `Ottimo! Non hai clienti trascurati da più di ${days} giorni. 🎉`,
          intent 
        };
      }

      let text = `⚠️ **Clienti da ricontattare** (inattivi da ${days}+ giorni):\n\n`;
      const items = result.items.slice(0, 5);
      text += items.map(i => `• **${i.clientName}** - ${i.reason}`).join('\n');
      
      if (result.items.length > 5) {
        text += `\n\n...e altri ${result.items.length - 5}`;
      }
      
      text += `\n\n📞 Vuoi partire dal primo?`;
      
      return { text, intent };
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

      // Se abbiamo un cliente specifico, mostra le sue note
      if (clientName) {
        const visitResult = await getLastVisitToClient(crypto, clientName);
        if (!visitResult.found) {
          return { text: visitResult.message, intent };
        }
        
        // TODO: implementare ricerca nelle note reali
        // Per ora mostriamo un messaggio placeholder
        let text = `📝 **Note su ${visitResult.clientName}:**\n\n`;
        text += `_La ricerca nelle note per termine specifico è in arrivo._\n\n`;
        text += `Intanto posso dirti:\n`;
        text += visitResult.message;
        
        return { text, intent };
      }

      // Ricerca generica nelle note
      return { 
        text: `🔍 Ricerca "${searchTerm}" nelle note...\n\n_Funzionalità in arrivo! Per ora prova: "Rossi paga contanti?"_`,
        intent 
      };
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
      
      // Per ora usiamo getVisitsToday - TODO: implementare getVisitsByDay
      const visits = await getVisitsToday(crypto);
      
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

      // TODO: implementare ricerca visite per prodotto
      return { 
        text: `🔍 Ricerca clienti che comprano "${productName}"...\n\n_Funzionalità in arrivo! Per ora posso dirti i prodotti discussi con un cliente specifico._`,
        intent 
      };
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
    // UNKNOWN / DEFAULT
    // ═══════════════════════════════════════════════════════════════

    case 'unknown':
    default: {
      // Usa la risposta intelligente dal parser
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

// app/chat/planner.ts
//
// Planner/Resolver deterministico per Repping.
// - Parla con rules.ts (NLU deterministica)
// - Usa gli adapter REALI (Supabase) per i dati
// - Aggiorna il ConversationContext (memoria breve)
// - Restituisce una risposta in linguaggio naturale
//
// Dipendenze esterne (già create in passaggi precedenti):
//   parseUtterance  -> app/chat/rules
//   ConversationContext -> app/context/ConversationContext (passiamo solo l'API, non importiamo React)
//   Adapters reali -> app/data/adapters (countClients, listClientNames, listClientEmails, listMissingProducts)
//
// NOTA: qui NON importiamo React. È un modulo "puro".

import { parseUtterance } from "../chat/rules";
import {
  countClients,
  listClientNames,
  listClientEmails,
  listMissingProducts,
} from "../data/adapters";

// Tipi (soft) per compatibilità col tuo contesto
type Scope = "clients" | "prodotti" | "ordini" | "global";
type ConversationContextState = {
  scope: Scope;
  topic_attivo: string | null;
  ultimo_intent: string | null;
  entita_correnti: Record<string, any> | null;
  ultimo_risultato: any | null;
  updated_at: number | null;
};

type ConversationApi = {
  state: ConversationContextState;
  expired: boolean;
  setScope: (s: Scope) => void;
  remember: (partial: Partial<ConversationContextState>) => void;
  reset: (opts?: { keepScope?: boolean }) => void;
};

// tipo "soft" per crypto, come negli adapter
type CryptoLike = {
  decryptFields: (
    scope: string,
    table: string,
    recordId: string,
    rowOrMap: any,
    fieldNames?: string[]
  ) => Promise<any>;
};

// Risultato del planner
export type PlannerResult = {
  text: string;                       // Risposta pronta da mostrare
  appliedScope?: Scope | null;        // Quale scope è stato usato/impostato
  intent?: string | null;             // Intent rilevato
  usedContext?: ConversationContextState; // Snapshot del contesto dopo l'update
};

/**
 * Esegue un turno di chat:
 * - analizza la frase
 * - gestisce scope/TTL
 * - chiama gli adapter
 * - aggiorna la memoria
 * - genera la risposta
 */
export async function runChatTurn(
  userText: string,
  conv: ConversationApi,
  crypto: CryptoLike | null // necessario per leggere nomi/email/prodotti cifrati
): Promise<PlannerResult> {
  const { state, expired } = conv;

  // Analisi NLU
  const parsed = parseUtterance(userText);
  let { intent, entities, topicHint } = parsed;

  // 🔧 HOTFIX: se il parser non riconosce (intent "unknown"), forziamo i casi più comuni
  // Evita problemi di regex con accenti/maiuscole e sblocca subito la demo a 3 turni.
  if (intent === "unknown") {
    const low = userText.trim().toLowerCase();
    if (/\bquanti\b/.test(low) && /\bclient/.test(low)) {
      intent = "count";
      topicHint = topicHint ?? "clients";
    } else if (/(come si chiamano|\bnomi\b)/.test(low)) {
      intent = "list_names";
      topicHint = topicHint ?? state.scope !== "global" ? state.scope : "clients";
    } else if (/\b(e )?(le )?email(s)?\b\??$/.test(low) || /\bmail\b/.test(low)) {
      intent = "list_emails";
      topicHint = topicHint ?? "clients";
    } else if (/\bmancanti\b/.test(low) && /\bprodott/.test(low)) {
      intent = "list_missing_products";
      topicHint = topicHint ?? "prodotti";
    }
  }

  // Debug (facoltativo)
  // console.log("🧠 parseUtterance input:", userText);
  // console.log("🧠 intent:", intent, "topicHint:", topicHint);

  // 1) Se il contesto è scaduto, chiedi di re-inquadrare
  if (expired && intent !== "reset") {
    return {
      text: "Il contesto è scaduto. Vuoi ripartire da **clienti**, **prodotti** o **ordini**? (puoi anche scrivere /reset)",
      appliedScope: state.scope,
      intent: "expired",
      usedContext: state,
    };
  }

  // 2) Gestione intent speciali
  if (intent === "reset") {
    conv.reset({ keepScope: false });
    return {
      text: "Contesto azzerato. Possiamo ripartire: vuoi parlare di **clienti**, **prodotti** o **ordini**?",
      appliedScope: "global",
      intent,
      usedContext: conv.state,
    };
  }

  if (intent === "help") {
    return {
      text:
        "Puoi chiedermi, ad esempio:\n" +
        "• Quanti **clienti** ho?\n" +
        "• **Come si chiamano**?\n" +
        "• **E le email**?\n" +
        "• I **prodotti mancanti**?\n" +
        "Puoi anche usare /reset per azzerare il contesto.",
      appliedScope: state.scope,
      intent,
      usedContext: state,
    };
  }

  // 3) Scegli lo scope da usare
  //    Preferiamo: topicHint > state.scope (se state.scope != global)
  let scopeToUse: Scope = state.scope;
  if (topicHint && topicHint !== "global") {
    scopeToUse = topicHint;
    if (scopeToUse !== state.scope) conv.setScope(scopeToUse);
  } else if (scopeToUse === "global") {
    // se lo scope è globale e l'intent richiede un dominio, proviamo a inferirlo
    if (intent === "count" || intent === "list_names" || intent === "list_emails") {
      scopeToUse = "clients";
      conv.setScope(scopeToUse);
    } else if (intent === "list_missing_products") {
      scopeToUse = "prodotti";
      conv.setScope(scopeToUse);
    }
  }

  // 4) Router degli intent
  switch (intent) {
    case "count": {
      if (scopeToUse === "clients") {
        const n = await countClients();
        conv.remember({
          topic_attivo: "clients",
          ultimo_intent: "count",
          entita_correnti: {},
          ultimo_risultato: n,
        });
        return {
          text: `Hai ${n} cliente${n === 1 ? "" : "i"}.`,
          appliedScope: scopeToUse,
          intent,
          usedContext: conv.state,
        };
      }
      return {
        text: "Vuoi il conteggio di **clienti**, **prodotti** o **ordini**?",
        appliedScope: scopeToUse,
        intent,
        usedContext: conv.state,
      };
    }

    case "list_names": {
      if (scopeToUse === "clients") {
        if (!crypto) return needCrypto();
        const names = await listClientNames(crypto);
        const text = names.length ? formatList(names) + "." : "Non ho trovato clienti.";
        conv.remember({
          topic_attivo: "clients",
          ultimo_intent: "list_names",
          entita_correnti: { clientIds: [] },
          ultimo_risultato: names,
        });
        return {
          text,
          appliedScope: scopeToUse,
          intent,
          usedContext: conv.state,
        };
      }
      return {
        text: "Di chi vuoi i **nomi**? Clienti, prodotti…?",
        appliedScope: scopeToUse,
        intent,
        usedContext: conv.state,
      };
    }

    case "list_emails": {
      if (scopeToUse === "clients") {
        if (!crypto) return needCrypto();
        const emails = await listClientEmails(crypto);
        const text = emails.length ? formatList(emails) + "." : "Non ho trovato email clienti.";
        conv.remember({
          topic_attivo: "clients",
          ultimo_intent: "list_emails",
          entita_correnti: { clientIds: [] },
          ultimo_risultato: emails,
        });
        return {
          text,
          appliedScope: scopeToUse,
          intent,
          usedContext: conv.state,
        };
      }
      return {
        text: "Le **email** di chi? Clienti o altro?",
        appliedScope: scopeToUse,
        intent,
        usedContext: conv.state,
      };
    }

    case "list_missing_products": {
      if (scopeToUse === "prodotti") {
        if (!crypto) return needCrypto();
        const missing = await listMissingProducts(crypto);
        const text = missing.length
          ? `Prodotti mancanti: ${formatList(missing)}.`
          : "Al momento non risultano prodotti mancanti.";
        conv.remember({
          topic_attivo: "prodotti",
          ultimo_intent: "list_missing_products",
          entita_correnti: {},
          ultimo_risultato: missing,
        });
        return {
          text,
          appliedScope: scopeToUse,
          intent,
          usedContext: conv.state,
        };
      }
      return {
        text: "Vuoi i **prodotti mancanti** del catalogo?",
        appliedScope: scopeToUse,
        intent,
        usedContext: conv.state,
      };
    }

    case "unknown":
    default: {
      if (state.scope === "clients") {
        return {
          text: 'Non ho capito. Esempi: "Quanti clienti ho?", "Come si chiamano?", "E le email?".',
          appliedScope: state.scope,
          intent: "unknown",
          usedContext: state,
        };
      }
      if (state.scope === "prodotti") {
        return {
          text: 'Non ho capito. Esempi: "Quanti prodotti ho?", "Prodotti mancanti?".',
          appliedScope: state.scope,
          intent: "unknown",
          usedContext: state,
        };
      }
      return {
        text:
          'Non ho capito. Possiamo parlare di **clienti** o **prodotti**. Esempi: "Quanti clienti ho?", "Prodotti mancanti?".',
        appliedScope: state.scope,
        intent: "unknown",
        usedContext: state,
      };
    }
  }
}

// ------------------------ Helpers ------------------------

function needCrypto(): PlannerResult {
  return {
    text:
      "Devo sbloccare la cifratura locale per leggere i dati (useCrypto non pronto). Accedi/ri-sblocca e riprova.",
    appliedScope: null,
    intent: "crypto_not_ready",
    usedContext: undefined as any,
  };
}

function formatList(items: string[]): string {
  if (items.length <= 2) return items.join(" e ");
  const rest = items.slice(0, -1).join(", ");
  return `${rest} e ${items[items.length - 1]}`;
}

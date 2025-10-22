// app/chat/planner.ts
//
// Planner/Resolver deterministico per Repping (versione NLU ibrida).
// - Usa classifyIntent() + policy (intent chiusi e template).
// - Riutilizza gli adapter REALI (Supabase) per i dati.
// - Aggiorna il ConversationContext (memoria breve).
// - Restituisce una risposta in linguaggio naturale tramite template della policy.
//
// Dipendenze esistenti:
//   classifyIntent        -> lib/nlu/IntentClassifier
//   policy (template)     -> lib/nlu/intent_policy.json
//   Adapters reali        -> app/data/adapters (countClients, listClientNames, listClientEmails, listMissingProducts)
//
// NOTA: qui NON importiamo React. È un modulo "puro".

import { classifyIntent } from "@/lib/nlu/IntentClassifier";
import policy from "@/lib/nlu/intent_policy.json";
import {
  countClients,
  listClientNames,
  listClientEmails,
  listMissingProducts,
} from "../data/adapters";

// Tipi (soft) per compatibilità col tuo contesto/page.tsx
// Includo anche gli scope inglesi perché la page li mappa → locali.
type Scope =
  | "global"
  | "clients"
  | "products"
  | "orders"
  | "sales"
  | "prodotti"
  | "ordini";

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
  intent?: string | null;             // Intent rilevato (chiave della policy)
  usedContext?: ConversationContextState; // Snapshot del contesto dopo l'update
};

// ───────────────────────── Helpers ─────────────────────────

function getTemplate(intentKey: string): string {
  const row = (policy.intents as any[]).find((i) => i.key === intentKey);
  return row?.template ?? "";
}

function applyTemplate(tpl: string, data: Record<string, string>): string {
  let out = tpl || "";
  for (const [k, v] of Object.entries(data)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return out;
}

function scopeForIntent(intent: string): Scope | null {
  switch (intent) {
    case "count_clients":
    case "list_client_names":
    case "list_client_emails":
      return "clients";   // ⬅️ inglese: la page mappa → locale
    case "list_missing_products":
      return "products";
    case "list_orders_recent":
      return "orders";
    case "summary_sales":
      return "sales";
    default:
      return null; // greet/help/unknown non forzano scope
  }
}

function textNoData(intent: string, currentScope: Scope): string {
  // Testo neutro, aderente ai template
  if (intent === "list_client_names") return "Non ho trovato clienti.";
  if (intent === "list_client_emails") return "Non ho trovato email clienti.";
  if (intent === "list_missing_products") return "Al momento non risultano prodotti mancanti.";
  if (intent === "count_clients") return "Non ho trovato clienti.";
  return "Non ho trovato dati corrispondenti.";
}

function needCrypto(): PlannerResult {
  return {
    text: "Devi sbloccare la sessione per visualizzare i dati.",
    appliedScope: null,
    intent: "crypto_not_ready",
    usedContext: undefined as any,
  };
}

// ───────────────────────── Planner turn ─────────────────────────

/**
 * Esegue un turno di chat su dati reali:
 * - NLU ibrida: classifyIntent() (usa preproc voce + PII redaction)
 * - Set/normalize scope
 * - Chiama gli adapter reali (Supabase + crypto client-side)
 * - Applica template della policy
 * - Aggiorna la memoria di conversazione
 */
export async function runChatTurn(
  userText: string,
  conv: ConversationApi,
  crypto: CryptoLike | null
): Promise<PlannerResult> {
  const { state, expired } = conv;

  // 0) Context TTL scaduto → chiedi re-inquadramento (coerente con tua UX)
  if (expired) {
    return {
      text: "Il contesto è scaduto. Vuoi ripartire da **clienti**, **prodotti** o **ordini**? (puoi anche scrivere /reset)",
      appliedScope: state.scope,
      intent: "expired",
      usedContext: state,
    };
  }

  // 1) NLU ibrida → { intent, confidence, needsClarification }
  const cls = await classifyIntent(userText);
  const intent = cls.intent;
  const needsClarification = cls.needsClarification;

  if (!intent) {
    // sconosciuto
    return fallbackUnknown(state);
  }
  if (needsClarification) {
    // domanda corta (ottimizzata per voce)
    const clar = (policy as any).speech?.clarify_prompt_short ? "Nomi o email?" : "Vuoi i nomi o le email?";
    return {
      text: clar,
      appliedScope: state.scope,
      intent,
      usedContext: state,
    };
  }

  // 2) Allinea lo scope se l'intent lo suggerisce
  const suggestedScope = scopeForIntent(intent);
  if (suggestedScope && suggestedScope !== state.scope) {
    conv.setScope(suggestedScope); // la page mapperà "products"→"prodotti", ecc.
  }
  const scopeToUse: Scope = suggestedScope ?? state.scope;

  // 3) Router deterministico sugli intent chiusi
  switch (intent) {
    // ——— CLIENTS ———
    case "count_clients": {
      // non serve crypto per contare
      const n = await countClients();
      if (!n || n < 0) {
        return {
          text: textNoData(intent, scopeToUse),
          appliedScope: scopeToUse,
          intent,
          usedContext: state,
        };
      }
      const text = applyTemplate(getTemplate(intent), { N: String(n) });
      conv.remember({
        topic_attivo: "clients",
        ultimo_intent: intent,
        entita_correnti: {},
        ultimo_risultato: { N: n },
      });
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    case "list_client_names": {
      if (!crypto) return needCrypto();
      const names = await listClientNames(crypto); // string[]
      if (!names || names.length === 0) {
        return {
          text: textNoData(intent, scopeToUse),
          appliedScope: scopeToUse,
          intent,
          usedContext: state,
        };
      }
      const text = applyTemplate(getTemplate(intent), { NOMI: names.join(", ") });
      conv.remember({
        topic_attivo: "clients",
        ultimo_intent: intent,
        entita_correnti: { clientIds: [] },
        ultimo_risultato: names,
      });
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    case "list_client_emails": {
      if (!crypto) return needCrypto();
      const emails = await listClientEmails(crypto); // string[]
      if (!emails || emails.length === 0) {
        return {
          text: textNoData(intent, scopeToUse),
          appliedScope: scopeToUse,
          intent,
          usedContext: state,
        };
      }
      const text = applyTemplate(getTemplate(intent), { EMAILS: emails.join(", ") });
      conv.remember({
        topic_attivo: "clients",
        ultimo_intent: intent,
        entita_correnti: { clientIds: [] },
        ultimo_risultato: emails,
      });
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    // ——— PRODUCTS ———
    case "list_missing_products": {
      if (!crypto) return needCrypto();
      const missing = await listMissingProducts(crypto); // string[]
      if (!missing || missing.length === 0) {
        return {
          text: textNoData(intent, scopeToUse),
          appliedScope: scopeToUse,
          intent,
          usedContext: state,
        };
      }
      const text = applyTemplate(getTemplate(intent), { PRODOTTI: missing.join(", ") });
      conv.remember({
        topic_attivo: "prodotti",
        ultimo_intent: intent,
        entita_correnti: {},
        ultimo_risultato: missing,
      });
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    // ——— (non ancora implementati a DB) ———
    case "list_orders_recent": {
      return {
        text: "Gli **ordini recenti** non sono ancora disponibili in questo ambiente.",
        appliedScope: scopeToUse || "orders",
        intent,
        usedContext: state,
      };
    }
    case "summary_sales": {
      return {
        text: "Il **riassunto vendite** non è ancora disponibile in questo ambiente.",
        appliedScope: scopeToUse || "sales",
        intent,
        usedContext: state,
      };
    }

    // ——— Utility intents ———
    case "greet": {
      const tpl = getTemplate("greet") || "Ciao! Come posso aiutarti oggi?";
      return {
        text: tpl,
        appliedScope: state.scope,
        intent,
        usedContext: state,
      };
    }
    case "help": {
      const tpl =
        getTemplate("help") ||
        "Puoi chiedermi di contare i clienti, mostrare nomi, email o prodotti mancanti.";
      return {
        text: tpl,
        appliedScope: state.scope,
        intent,
        usedContext: state,
      };
    }

    // ——— Fallback ———
    default:
      return fallbackUnknown(state);
  }
}

// ------------------------ Fallback ------------------------

function fallbackUnknown(state: ConversationContextState): PlannerResult {
  if (state.scope === "clients") {
    return {
      text:
        'Non ho capito. Esempi: "Quanti clienti ho?", "Come si chiamano?", "E le email?".',
      appliedScope: state.scope,
      intent: "unknown",
      usedContext: state,
    };
  }
  if (state.scope === "prodotti" || state.scope === "products") {
    return {
      text: 'Non ho capito. Esempi: "Prodotti mancanti?".',
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

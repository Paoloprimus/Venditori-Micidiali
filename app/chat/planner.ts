// app/chat/planner.ts
//
// Planner/Resolver deterministico per Repping (versione NLU ibrida + follow-up resolver).
// - Usa classifyIntent() + policy (intent chiusi e template).
// - Riutilizza gli adapter REALI (Supabase) per i dati.
// - Aggiorna il ConversationContext (memoria breve).
// - Risposte generate via template della policy.
// - NOVITÀ: follow-up resolver → se l'NLU è incerta, usa contesto + parole chiave per evitare chiarimenti inutili.

import { classifyIntent } from "@/lib/nlu/IntentClassifier";
import policy from "@/lib/nlu/intent_policy.json";
import {
  countClients,
  listClientNames,
  listClientEmails,
  listMissingProducts,
} from "../data/adapters";

// Tipi (soft) per compatibilità col tuo contesto/page.tsx
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

export type PlannerResult = {
  text: string;
  appliedScope?: Scope | null;
  intent?: string | null;
  usedContext?: ConversationContextState;
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
      return "clients"; // inglese → la page mapperà in locale
    case "list_missing_products":
      return "products";
    case "list_orders_recent":
      return "orders";
    case "summary_sales":
      return "sales";
    default:
      return null;
  }
}

function textNoData(intent: string): string {
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

/**
 * Follow-up resolver:
 * Se l'NLU è incerta o null, prova a inferire l'intent dal contesto + parole chiave.
 * Esempi coperti:
 *  - scope clients + “come si chiamano?” / “nomi” → list_client_names
 *  - scope clients + “email” / “mail” → list_client_emails
 *  - scope prodotti + “mancanti” → list_missing_products
 */
function inferFromContext(userText: string, state: ConversationContextState): string | null {
  const t = userText.toLowerCase().trim();

  const saysNames =
    /\b(nomi|come si chiamano)\b/.test(t) ||
    /^come si chiamano\??$/.test(t) ||
    /^i nomi\??$/.test(t);

  const saysEmails = /\b(email|e[-\s]?mail|mail)\b/.test(t);

  const saysMissing = /\bmancanti?\b/.test(t) && /\bprodott/i.test(t);

  // Se siamo nel dominio clients (o ultimo intent era clients-related), scegli nomi/email
  const inClients =
    state.scope === "clients" ||
    state.topic_attivo === "clients" ||
    state.ultimo_intent === "count_clients" ||
    state.ultimo_intent === "list_client_names" ||
    state.ultimo_intent === "list_client_emails";

  if (inClients) {
    if (saysNames) return "list_client_names";
    if (saysEmails) return "list_client_emails";
  }

  // Se siamo in prodotti, e l'utente cita mancanti
  const inProducts =
    state.scope === "products" ||
    state.scope === "prodotti" ||
    state.topic_attivo === "prodotti" ||
    state.ultimo_intent === "list_missing_products";

  if (inProducts && saysMissing) return "list_missing_products";

  // fallback: frasi ellittiche “e le email?” anche senza parola “clienti”
  if (/^\s*e (le )?email(s)?\??\s*$/.test(t)) return "list_client_emails";
  if (/^\s*i nomi\??\s*$/.test(t)) return "list_client_names";

  return null;
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

// ───────────────────────── Planner turn ─────────────────────────

export async function runChatTurn(
  userText: string,
  conv: ConversationApi,
  crypto: CryptoLike | null
): Promise<PlannerResult> {
  const { state, expired } = conv;

  // 0) Context TTL scaduto → chiedi re-inquadramento
  if (expired) {
    return {
      text:
        "Il contesto è scaduto. Vuoi ripartire da **clienti**, **prodotti** o **ordini**? (puoi anche scrivere /reset)",
      appliedScope: state.scope,
      intent: "expired",
      usedContext: state,
    };
  }

// 1) NLU ibrida
const cls = await classifyIntent(userText);

// LOG #1 — esito del classificatore + contesto corrente
console.debug("[planner:cls]", {
  input: userText,
  intent: cls.intent,
  needsClarification: cls.needsClarification,
  scope: state.scope,
  last_intent: state.ultimo_intent,
  topic: state.topic_attivo,
});

let intent: string | null = cls.intent;
let shouldClarify = !!cls.needsClarification;

// --- gestione fine follow-up e chiarimenti ---
const inferred = inferFromContext(userText, state);

// HARD OVERRIDE per follow-up comuni quando siamo su "clients"
const t = userText.toLowerCase().trim();
if (
  (state.scope === "clients" || state.topic_attivo === "clients" || state.ultimo_intent === "count_clients") &&
  (/\b(nomi|come si chiamano)\b/.test(t) || /^come si chiamano\??$/.test(t) || /^i nomi\??$/.test(t))
) {
  intent = "list_client_names";
  shouldClarify = false;
} else if (
  (state.scope === "clients" || state.topic_attivo === "clients" || state.ultimo_intent === "count_clients") &&
  (/\b(email|e[-\s]?mail|mail)\b/.test(t) || /^\s*e (le )?email(s)?\??\s*$/.test(t))
) {
  intent = "list_client_emails";
  shouldClarify = false;
} else {
  // Se il modello non ha capito, ma il contesto è chiaro → usa inferenza
  if (!intent && inferred) intent = inferred;

  // Se il modello è incerto ma l'inferenza lo chiarisce → procedi
  if (shouldClarify && inferred) {
    intent = inferred;
    shouldClarify = false;
  }
}

// Se ancora nulla → fallback
if (!intent) {
  console.debug("[planner:decide]", { action: "fallback_unknown" });
  return fallbackUnknown(state);
}

// Se serve ancora chiarire (nessuna inferenza utile) → domanda corta
if (shouldClarify) {
  const clar = (policy as any).speech?.clarify_prompt_short
    ? "Nomi o email?"
    : "Vuoi i nomi o le email?";

  // LOG #2 — stiamo scegliendo il chiarimento
  console.debug("[planner:clarify]", { inferred, intent_before_clarify: cls.intent, scope: state.scope });
  return { text: clar, appliedScope: state.scope, intent, usedContext: state };
}

// LOG #3 — intent finale deciso dopo override/inferenza
console.debug("[planner:final_intent]", { intent, scope: state.scope });



  
  // 2) Allinea lo scope se l'intent lo suggerisce
  const suggestedScope = scopeForIntent(intent);
  if (suggestedScope && suggestedScope !== state.scope) {
    conv.setScope(suggestedScope); // la page mapperà in locale
  }
  const scopeToUse: Scope = suggestedScope ?? state.scope;

  // 3) Router deterministico sugli intent chiusi
  switch (intent) {
    // ——— CLIENTS ———
    case "count_clients": {
      const n = await countClients(); // non richiede crypto
      if (!n || n < 0) {
        return {
          text: textNoData(intent),
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
          text: textNoData(intent),
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
          text: textNoData(intent),
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
          text: textNoData(intent),
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

    // ——— non ancora implementati lato dati (placeholder “onesti”) ———
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

    // ——— utility ———
    case "greet": {
      const tpl = getTemplate("greet") || "Ciao! Come posso aiutarti oggi?";
      return { text: tpl, appliedScope: state.scope, intent, usedContext: state };
    }
    case "help": {
      const tpl =
        getTemplate("help") ||
        "Puoi chiedermi di contare i clienti, mostrare nomi, email o prodotti mancanti.";
      return { text: tpl, appliedScope: state.scope, intent, usedContext: state };
    }

    default:
      return fallbackUnknown(state);
  }
}

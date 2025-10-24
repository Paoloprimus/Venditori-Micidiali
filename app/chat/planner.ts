// app/chat/planner.ts
//
// Planner/Resolver deterministico per Repping (versione NLU ibrida + follow-up resolver + multi-scope).
// - Usa classifyIntent() + policy (intent chiusi e template).
// - Riutilizza gli adapter REALI (Supabase) per i dati.
// - Aggiorna il ConversationContext (memoria breve).
// - Risposte generate via template della policy.
// - NOVITÀ v2: multi-scope con stack → ricorda gli ultimi 3 scope per tornare indietro

import { classifyIntent } from "@/lib/nlu/IntentClassifier";
import policy from "@/lib/nlu/intent_policy.json";
import {
  countClients,
  listClientNames,
  listClientEmails,
  listMissingProducts,
  type ClientNamesResult,
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
  scope_stack?: Scope[]; // 🆕 stack degli ultimi scope visitati
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
      return "clients";
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

// 🆕 Gestione scope stack
function updateScopeStack(state: ConversationContextState, newScope: Scope): Scope[] {
  const stack = state.scope_stack || [];
  const filtered = stack.filter(s => s !== newScope); // rimuovi duplicati
  return [newScope, ...filtered].slice(0, 3); // mantieni max 3
}

function inferScopeFromStack(userText: string, state: ConversationContextState): Scope | null {
  const stack = state.scope_stack || [];
  if (stack.length === 0) return null;

  const t = userText.toLowerCase().trim();
  
  // Parole chiave per clienti
  if (/\b(client|nome|email|contatt)/i.test(t)) {
    return stack.find(s => s === "clients") || null;
  }
  
  // Parole chiave per prodotti
  if (/\b(prodott|mancant|catalog)/i.test(t)) {
    const prodScope = stack.find(s => s === "products" || s === "prodotti");
    return prodScope || null;
  }
  
  // Parole chiave per ordini
  if (/\b(ordin|vendut|recent)/i.test(t)) {
    const ordScope = stack.find(s => s === "orders" || s === "ordini");
    return ordScope || null;
  }
  
  return null;
}

/**
 * Follow-up resolver:
 * Se l'NLU è incerta o null, prova a inferire l'intent dal contesto + parole chiave.
 */
function inferFromContext(userText: string, state: ConversationContextState): string | null {
  const t = userText.toLowerCase().trim();

  const saysNames =
    /\b(nomi|come si chiamano)\b/.test(t) ||
    /^come si chiamano\??$/.test(t) ||
    /^i nomi\??$/.test(t);

  const saysEmails = /\b(email|e[-\s]?mail|mail)\b/.test(t);

  const saysMissing = /\bmancanti?\b/.test(t) && /\bprodott/i.test(t);

  // 🆕 Usa scope_stack per determinare il dominio
  const scopeStack = state.scope_stack || [];
  const inClients =
    state.scope === "clients" ||
    state.topic_attivo === "clients" ||
    state.ultimo_intent === "count_clients" ||
    state.ultimo_intent === "list_client_names" ||
    state.ultimo_intent === "list_client_emails" ||
    scopeStack.includes("clients");

  if (inClients) {
    if (saysNames) return "list_client_names";
    if (saysEmails) return "list_client_emails";
  }

  const inProducts =
    state.scope === "products" ||
    state.scope === "prodotti" ||
    state.topic_attivo === "prodotti" ||
    state.ultimo_intent === "list_missing_products" ||
    scopeStack.includes("products") ||
    scopeStack.includes("prodotti");

  if (inProducts && saysMissing) return "list_missing_products";

  // fallback: frasi ellittiche
  if (/^\s*e (le )?email(s)?\??\s*$/.test(t)) return "list_client_emails";
  if (/^\s*i nomi\??\s*$/.test(t)) return "list_client_names";

  return null;
}

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

export async function runChatTurn_v2(
  userText: string,
  conv: ConversationApi,
  crypto: CryptoLike | null
): Promise<PlannerResult> {

  const { state, expired } = conv;
  console.error("[planner_v2:hit]", { input: userText, scope: conv.state.scope, stack: conv.state.scope_stack, expired });

  // 0) Context TTL scaduto → resetta silenziosamente e prosegui
  if (expired) {
    console.error("[planner] Contesto scaduto, resetto e continuo...");
    conv.reset();
    // Non bloccare, continua a processare la domanda normalmente
  }

  // 1) NLU ibrida
  const cls = await classifyIntent(userText);

  console.debug("[planner:cls]", {
    input: userText,
    intent: cls.intent,
    needsClarification: cls.needsClarification,
    scope: state.scope,
    last_intent: state.ultimo_intent,
    topic: state.topic_attivo,
    stack: state.scope_stack,
  });

  let intent: string | null = cls.intent;
  let shouldClarify = !!cls.needsClarification;

  const inferred = inferFromContext(userText, state);
  
  // 🆕 Se non c'è intent chiaro, prova a inferire dallo scope stack
  const inferredScope = inferScopeFromStack(userText, state);
  if (inferredScope && !intent) {
    // Aggiorna temporaneamente lo scope per l'inferenza
    const tempState = { ...state, scope: inferredScope };
    intent = inferFromContext(userText, tempState);
  }

  // HARD OVERRIDE per follow-up comuni
  const t = userText.toLowerCase().trim();
  const scopeStack = state.scope_stack || [];
  
  // 🆕 Cerca "clients" nello stack, non solo nello scope corrente
  if (
    (scopeStack.includes("clients") || state.scope === "clients" || state.topic_attivo === "clients" || state.ultimo_intent === "count_clients") &&
    (/\b(nomi|come si chiamano)\b/.test(t) || /^come si chiamano\??$/.test(t) || /^i nomi\??$/.test(t))
  ) {
    intent = "list_client_names";
    shouldClarify = false;
  } else if (
    (scopeStack.includes("clients") || state.scope === "clients" || state.topic_attivo === "clients" || state.ultimo_intent === "count_clients") &&
    (/\b(email|e[-\s]?mail|mail)\b/.test(t) || /^\s*e (le )?email(s)?\??\s*$/.test(t))
  ) {
    intent = "list_client_emails";
    shouldClarify = false;
  } else {
    if (!intent && inferred) intent = inferred;
    if (shouldClarify && inferred) {
      intent = inferred;
      shouldClarify = false;
    }
  }

  if (!intent) {
    console.debug("[planner:decide]", { action: "fallback_unknown" });
    return fallbackUnknown(state);
  }

  if (shouldClarify) {
    const clar = (policy as any).speech?.clarify_prompt_short
      ? "Nomi o email?"
      : "Vuoi i nomi o le email?";
    return {
      text: clar,
      appliedScope: state.scope,
      intent: "clarify",
      usedContext: state,
    };
  }

  // 2) Determina scope target
  let scopeToUse: Scope = scopeForIntent(intent) ?? state.scope;
  if (state.scope === "global") scopeToUse = scopeForIntent(intent) ?? "clients";

  // 3) Router deterministico sugli intent chiusi
  switch (intent) {
    // ——— CLIENTS ———
    case "count_clients": {
      const n = await countClients();
      if (!n || n < 0) {
        return {
          text: textNoData(intent),
          appliedScope: scopeToUse,
          intent,
          usedContext: state,
        };
      }
      const text = applyTemplate(getTemplate(intent), { N: String(n) });
      
      // 🆕 Aggiorna scope stack
      const newStack = updateScopeStack(state, scopeToUse);
      
      conv.remember({
        topic_attivo: "clients",
        ultimo_intent: intent,
        entita_correnti: {},
        ultimo_risultato: { N: n },
        scope_stack: newStack,
      });
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    case "list_client_names": {
      if (!crypto) return needCrypto();
      
      const result = await listClientNames(crypto);
      const { names, withoutName } = result;
      
      if (!names || names.length === 0) {
        const text = withoutName > 0 
          ? `Hai ${withoutName} ${withoutName === 1 ? 'cliente' : 'clienti'} senza nome.`
          : textNoData(intent);
        
        const newStack = updateScopeStack(state, scopeToUse);
        
        conv.remember({
          topic_attivo: "clients",
          ultimo_intent: intent,
          entita_correnti: { clientIds: [] },
          ultimo_risultato: { names: [], withoutName },
          scope_stack: newStack,
        });
        
        return {
          text,
          appliedScope: scopeToUse,
          intent,
          usedContext: conv.state,
        };
      }
      
      // 🆕 Formatta risposta con info clienti senza nome
      let text = names.length <= 2 
        ? names.join(" e ") + "."
        : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}.`;
      
      if (withoutName > 0) {
        text += ` (${withoutName} ${withoutName === 1 ? 'cliente' : 'clienti'} senza nome)`;
      }
      
      const newStack = updateScopeStack(state, scopeToUse);
      
      conv.remember({
        topic_attivo: "clients",
        ultimo_intent: intent,
        entita_correnti: { clientIds: [] },
        ultimo_risultato: { names, withoutName },
        scope_stack: newStack,
      });
      
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    case "list_client_emails": {
      if (!crypto) return needCrypto();
      const emails = await listClientEmails(crypto);
      if (!emails || emails.length === 0) {
        return {
          text: textNoData(intent),
          appliedScope: scopeToUse,
          intent,
          usedContext: state,
        };
      }
      const text = applyTemplate(getTemplate(intent), { EMAILS: emails.join(", ") });
      
      const newStack = updateScopeStack(state, scopeToUse);
      
      conv.remember({
        topic_attivo: "clients",
        ultimo_intent: intent,
        entita_correnti: { clientIds: [] },
        ultimo_risultato: emails,
        scope_stack: newStack,
      });
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    // ——— PRODUCTS ———
    case "list_missing_products": {
      if (!crypto) return needCrypto();
      const missing = await listMissingProducts(crypto);
      if (!missing || missing.length === 0) {
        return {
          text: textNoData(intent),
          appliedScope: scopeToUse,
          intent,
          usedContext: state,
        };
      }
      const text = applyTemplate(getTemplate(intent), { PRODOTTI: missing.join(", ") });
      
      const newStack = updateScopeStack(state, scopeToUse);
      
      conv.remember({
        topic_attivo: "prodotti",
        ultimo_intent: intent,
        entita_correnti: {},
        ultimo_risultato: missing,
        scope_stack: newStack,
      });
      return { text, appliedScope: scopeToUse, intent, usedContext: conv.state };
    }

    // ——— non ancora implementati ———
    case "list_orders_recent": {
      return {
        text: "Gli **ordini recenti** non sono ancora disponibili in questo ambiente.",
        appliedScope: scopeToUse,
        intent,
        usedContext: state,
      };
    }

    case "summary_sales": {
      return {
        text: "Le **statistiche di vendita** non sono ancora disponibili in questo ambiente.",
        appliedScope: scopeToUse,
        intent,
        usedContext: state,
      };
    }

    case "greet": {
      return {
        text: "Ciao! Posso aiutarti con informazioni su clienti, prodotti o ordini.",
        appliedScope: state.scope,
        intent,
        usedContext: state,
      };
    }

    case "help": {
      return {
        text: "Puoi chiedermi di: contare i clienti, mostrare nomi ed email, verificare prodotti mancanti.",
        appliedScope: state.scope,
        intent,
        usedContext: state,
      };
    }

    default: {
      console.debug("[planner:unknown_intent]", intent);
      return fallbackUnknown(state);
    }
  }
}

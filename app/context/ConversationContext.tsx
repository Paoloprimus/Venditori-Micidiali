"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// ✅ Vocabolario locale (italiano) per lo scope della conversazione
export type LocalScope = "clients" | "prodotti" | "ordini" | "vendite";

export type ConversationState = {
  scope: LocalScope;                     // non-null
  topic_attivo: LocalScope | null;       // alias storico, può restare null
  ultimo_intent: string | null;
  entita_correnti: Record<string, string | number | boolean | null>;
  ultimo_risultato: unknown;

  updated_at: number | null;             // richiesto dal planner
  lastUpdateTs: number | null;           // alias interno per TTL
};

type ConversationContextValue = {
  state: ConversationState;
  expired: boolean;
  setScope: (s: LocalScope) => void;
  setTopic: (t: LocalScope | null) => void; // può essere null per "nessun topic attivo"
  setIntent: (intent: string | null) => void;
  setEntita: (patch: Partial<ConversationState["entita_correnti"]>) => void;
  setRisultato: (v: unknown) => void;
  remember: (patch: Partial<ConversationState>) => void;
  reset: () => void;
};

const DEFAULT_SCOPE: LocalScope = "clients";
const DEFAULT_STATE: ConversationState = {
  scope: DEFAULT_SCOPE,
  topic_attivo: null,
  ultimo_intent: null,
  entita_correnti: {},
  ultimo_risultato: null,
  updated_at: null,
  lastUpdateTs: null,
};

const KEY = "repping:convctx";
const TTL_MS = 30 * 60 * 1000; // 2 minuti

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConversationState>(DEFAULT_STATE);

  // Load da sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ConversationState>;
        const ts = parsed.updated_at ?? parsed.lastUpdateTs ?? Date.now();

        // 🔁 Normalizza eventuali valori inglesi legacy
        let nextScope: LocalScope =
          (parsed.scope as LocalScope) ?? DEFAULT_SCOPE;
        const legacy = (parsed as any)?.scope;
        if (legacy === "products") nextScope = "prodotti";
        if (legacy === "orders") nextScope = "ordini";
        if (legacy === "sales") nextScope = "vendite";

        setState((prev) => ({
          ...prev,
          ...parsed,
          scope: nextScope,
          updated_at: ts,
          lastUpdateTs: ts,
        }) as ConversationState);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persistenza live
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const expired = useMemo(() => {
    const ts = state.updated_at ?? state.lastUpdateTs;
    if (!ts) return false;
    return Date.now() - ts > TTL_MS;
  }, [state.updated_at, state.lastUpdateTs]);

  const now = () => Date.now();

  const api: ConversationContextValue = {
    state,
    expired,
    setScope: (s) =>
      setState((st) => {
        const ts = now();
        return {
          ...st,
          scope: s,
          topic_attivo: s, // allinea alias quando scegli esplicitamente lo scope
          updated_at: ts,
          lastUpdateTs: ts,
        };
      }),
    setTopic: (t) =>
      setState((st) => {
        const ts = now();
        if (t === null) {
          return { ...st, topic_attivo: null, updated_at: ts, lastUpdateTs: ts };
        }
        return {
          ...st,
          topic_attivo: t,
          scope: t, // allinea anche lo scope
          updated_at: ts,
          lastUpdateTs: ts,
        };
      }),
    setIntent: (intent) =>
      setState((st) => {
        const ts = now();
        return { ...st, ultimo_intent: intent, updated_at: ts, lastUpdateTs: ts };
      }),

    // ✅ merge "patch" senza undefined nei valori
    setEntita: (patch) =>
      setState((st) => {
        const ts = now();
        const merged: Record<string, string | number | boolean | null> = {
          ...st.entita_correnti,
        };
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) continue; // scarta undefined per rispettare il tipo
          merged[k] = v as string | number | boolean | null;
        }
        return {
          ...st,
          entita_correnti: merged,
          updated_at: ts,
          lastUpdateTs: ts,
        };
      }),

    setRisultato: (v) =>
      setState((st) => {
        const ts = now();
        return { ...st, ultimo_risultato: v, updated_at: ts, lastUpdateTs: ts };
      }),

    // ✅ remember con normalizzazione scope e merge sicuro di entita_correnti (senza undefined)
    remember: (patch) =>
      setState((st) => {
        const ts = now();

        // normalizza eventuale scope in patch
        let nextScope = st.scope;
        if (patch.scope) {
          const p = patch.scope as string;
          if (p === "products") nextScope = "prodotti";
          else if (p === "orders") nextScope = "ordini";
          else if (p === "sales") nextScope = "vendite";
          else if (p === "clients" || p === "prodotti" || p === "ordini" || p === "vendite") {
            nextScope = p as LocalScope;
          }
        }

        // merge sicuro per entita_correnti se presente nella patch
        let mergedEntita = st.entita_correnti;
        if (patch.entita_correnti) {
          const tmp: Record<string, string | number | boolean | null> = { ...st.entita_correnti };
          for (const [k, v] of Object.entries(patch.entita_correnti)) {
            if (v === undefined) continue;
            tmp[k] = v as string | number | boolean | null;
          }
          mergedEntita = tmp;
        }

        // costruiamo il nuovo stato senza copiare direttamente entita_correnti (per evitare undefined)
        const {
          entita_correnti: _ignoredEntita,
          scope: _ignoredScope,
          ...restPatch
        } = patch;

        return {
          ...st,
          ...restPatch,
          scope: nextScope,
          entita_correnti: mergedEntita,
          updated_at: ts,
          lastUpdateTs: ts,
        };
      }),

    reset: () =>
      setState(() => {
        const ts = now();
        return { ...DEFAULT_STATE, updated_at: ts, lastUpdateTs: ts };
      }),
  };

  return <ConversationContext.Provider value={api}>{children}</ConversationContext.Provider>;
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation deve essere usato dentro <ConversationProvider>.");
  return ctx;
}

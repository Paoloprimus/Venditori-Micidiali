"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// ✅ Scope allineato ai tuoi documenti/planner (niente "products")
export type Scope = "clients" | "prodotti" | "ordini" | "vendite";

export type ConversationState = {
  scope: Scope;                        // non-null
  topic_attivo: Scope | null;          // alias storico, può restare null
  ultimo_intent: string | null;
  entita_correnti: Record<string, string | number | boolean | null>;
  ultimo_risultato: unknown;

  updated_at: number | null;           // richiesto dal planner
  lastUpdateTs: number | null;         // alias interno per TTL
};

type ConversationContextValue = {
  state: ConversationState;
  expired: boolean;
  setScope: (s: Scope) => void;
  setTopic: (t: Scope | null) => void; // può essere null per "nessun topic attivo"
  setIntent: (intent: string | null) => void;
  setEntita: (patch: Partial<ConversationState["entita_correnti"]>) => void;
  setRisultato: (v: unknown) => void;
  remember: (patch: Partial<ConversationState>) => void;
  reset: () => void;
};

const DEFAULT_SCOPE: Scope = "clients";
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
const TTL_MS = 2 * 60 * 1000; // 2 minuti

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
        // Se il vecchio salvataggio aveva scope assente o valori legacy, normalizza:
        let nextScope = (parsed.scope as Scope) ?? DEFAULT_SCOPE;
        // 🔁 normalizza eventuali valori inglesi legacy
        if ((parsed as any)?.scope === "products") nextScope = "prodotti";
        if ((parsed as any)?.scope === "orders") nextScope = "ordini";
        if ((parsed as any)?.scope === "sales") nextScope = "vendite";

        setState((prev) => ({
          ...prev,
          ...parsed,
          scope: nextScope,
          updated_at: ts,
          lastUpdateTs: ts,
        } as ConversationState));
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
          topic_attivo: s, // mantieni allineati alias quando decidi esplicitamente lo scope
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
    setEntita: (patch) =>
      setState((st) => {
        const ts = now();
        return {
          ...st,
          entita_correnti: { ...st.entita_correnti, ...patch },
          updated_at: ts,
          lastUpdateTs: ts,
        };
      }),
    setRisultato: (v) =>
      setState((st) => {
        const ts = now();
        return { ...st, ultimo_risultato: v, updated_at: ts, lastUpdateTs: ts };
      }),
    remember: (patch) =>
      setState((st) => {
        const ts = now();
        let nextScope = st.scope;
        if (patch.scope) {
          // normalizza eventuali stringhe legacy
          const p = patch.scope as string;
          if (p === "products") nextScope = "prodotti";
          else if (p === "orders") nextScope = "ordini";
          else if (p === "sales") nextScope = "vendite";
          else if (p === "clients" || p === "prodotti" || p === "ordini" || p === "vendite") {
            nextScope = p as Scope;
          }
        }
        return {
          ...st,
          ...patch,
          scope: nextScope,
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

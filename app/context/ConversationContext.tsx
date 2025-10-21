"use client"; 
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// Scope sempre definito (no null) per compatibilità con runChatTurn
type Scope = "clients" | "products" | "orders" | "sales";

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
  setTopic: (t: Scope | null) => void; // lasciamo la possibilità di null qui
  setIntent: (intent: string | null) => void;
  setEntita: (patch: Partial<ConversationState["entita_correnti"]>) => void;
  setRisultato: (v: unknown) => void;
  remember: (patch: Partial<ConversationState>) => void;
  reset: () => void;
};

const DEFAULT_SCOPE: Scope = "clients"; // fallback sicuro
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
        // Se il vecchio salvataggio aveva scope nullo/assente, usa il DEFAULT_SCOPE
        const scope = (parsed.scope as Scope) ?? DEFAULT_SCOPE;
        setState((prev) => ({
          ...prev,
          ...parsed,
          scope,
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

  const api = useMemo<ConversationContextValue>(() => {
    return {
      state,
      expired,
      setScope: (s) =>
        setState((st) => {
          const ts = now();
          return {
            ...st,
            scope: s,
            // opzionale: mantieni topic allineato quando scegli esplicitamente lo scope
            topic_attivo: s,
            updated_at: ts,
            lastUpdateTs: ts,
          };
        }),
      setTopic: (t) =>
        setState((st) => {
          const ts = now();
          // se t è null, NON tocchiamo scope (resta quello attuale non-null)
          if (t === null) {
            return { ...st, topic_attivo: null, updated_at: ts, lastUpdateTs: ts };
          }
          return {
            ...st,
            topic_attivo: t,
            scope: t, // se imposti un topic, allinea anche lo scope
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
          // proteggi sempre scope: se patch.scope è mancante o null, mantieni quello esistente
          const nextScope = (patch.scope as Scope) ?? st.scope ?? DEFAULT_SCOPE;
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
  }, [state, expired]);

  return <ConversationContext.Provider value={api}>{children}</ConversationContext.Provider>;
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation deve essere usato dentro <ConversationProvider>.");
  return ctx;
}

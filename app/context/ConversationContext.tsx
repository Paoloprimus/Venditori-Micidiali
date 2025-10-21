"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Scope = "clients" | "products" | "orders" | "sales" | null;

export type ConversationState = {
  // NB: topic_attivo resta per compatibilità, ma usiamo "scope" come nome preferito
  scope: Scope;
  topic_attivo: Scope;                // alias storico
  ultimo_intent: string | null;
  entita_correnti: Record<string, string | number | boolean | null>;
  ultimo_risultato: unknown;          // es. numero, lista nomi/email, ecc.

  // Timestamp di aggiornamento (richiesto da runChatTurn → ConversationContextState)
  updated_at: number | null;          // <— nuovo campo richiesto
  // Alias interno per TTL; tenuto in sync con updated_at
  lastUpdateTs: number | null;
};

type ConversationContextValue = {
  state: ConversationState;
  expired: boolean;
  setScope: (s: Scope) => void;
  setTopic: (t: Scope) => void; // compatibilità
  setIntent: (intent: string | null) => void;
  setEntita: (patch: Partial<ConversationState["entita_correnti"]>) => void;
  setRisultato: (v: unknown) => void;
  remember: (patch: Partial<ConversationState>) => void;
  reset: () => void;
};

const DEFAULT_STATE: ConversationState = {
  scope: null,
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
        const parsed = JSON.parse(raw) as ConversationState;
        // se manca updated_at in vecchie versioni, inizializzalo ora
        const ts = parsed.updated_at ?? parsed.lastUpdateTs ?? Date.now();
        setState((prev) => ({
          ...prev,
          ...parsed,
          updated_at: ts,
          lastUpdateTs: ts,
        }));
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
            topic_attivo: s, // tieni allineati alias
            updated_at: ts,
            lastUpdateTs: ts,
          };
        }),
      setTopic: (t) =>
        setState((st) => {
          const ts = now();
          return {
            ...st,
            topic_attivo: t,
            scope: t,
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
          return { ...st, ...patch, updated_at: ts, lastUpdateTs: ts };
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

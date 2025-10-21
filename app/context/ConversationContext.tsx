"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Scope = "clients" | "products" | "orders" | "sales" | null;

export type ConversationState = {
  // NB: topic_attivo resta per compatibilità, ma usiamo "scope" come nome preferito
  scope: Scope;                 // <— nuovo
  topic_attivo: Scope;          // alias storico
  ultimo_intent: string | null;
  entita_correnti: Record<string, string | number | boolean | null>;
  ultimo_risultato: unknown;    // es. numero, lista nomi/email, ecc.
  lastUpdateTs: number | null;  // per TTL
};

type ConversationContextValue = {
  state: ConversationState;
  expired: boolean;                           // <— nuovo: stato scadenza
  setScope: (s: Scope) => void;               // <— nuovo: alias ergonomico
  setTopic: (t: Scope) => void;               // compatibilità
  setIntent: (intent: string | null) => void;
  setEntita: (patch: Partial<ConversationState["entita_correnti"]>) => void;
  setRisultato: (v: unknown) => void;
  remember: (patch: Partial<ConversationState>) => void; // <— nuovo: helper ergonomico
  reset: () => void;
};

const DEFAULT_STATE: ConversationState = {
  scope: null,
  topic_attivo: null,
  ultimo_intent: null,
  entita_correnti: {},
  ultimo_risultato: null,
  lastUpdateTs: null,
};

const KEY = "repping:convctx";
const TTL_MS = 2 * 60 * 1000; // 2 minuti: cambia liberamente

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConversationState>(DEFAULT_STATE);

  // load da sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConversationState;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  // persistenza live
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const expired = useMemo(() => {
    if (!state.lastUpdateTs) return false;
    return Date.now() - state.lastUpdateTs > TTL_MS;
  }, [state.lastUpdateTs]);

  const touch = () =>
    setState((s) => ({ ...s, lastUpdateTs: Date.now() }));

  const api = useMemo<ConversationContextValue>(() => {
    return {
      state,
      expired,
      setScope: (s) =>
        setState((st) => ({
          ...st,
          scope: s,
          topic_attivo: s, // tieni allineati alias
          lastUpdateTs: Date.now(),
        })),
      setTopic: (t) =>
        setState((st) => ({
          ...st,
          topic_attivo: t,
          scope: t,
          lastUpdateTs: Date.now(),
        })),
      setIntent: (intent) =>
        setState((st) => ({ ...st, ultimo_intent: intent, lastUpdateTs: Date.now() })),
      setEntita: (patch) =>
        setState((st) => ({
          ...st,
          entita_correnti: { ...st.entita_correnti, ...patch },
          lastUpdateTs: Date.now(),
        })),
      setRisultato: (v) =>
        setState((st) => ({ ...st, ultimo_risultato: v, lastUpdateTs: Date.now() })),
      remember: (patch) =>
        setState((st) => ({ ...st, ...patch, lastUpdateTs: Date.now() })),
      reset: () => setState({ ...DEFAULT_STATE, lastUpdateTs: Date.now() }),
    };
  }, [state, expired]);

  return <ConversationContext.Provider value={api}>{children}</ConversationContext.Provider>;
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation deve essere usato dentro <ConversationProvider>.");
  return ctx;
}

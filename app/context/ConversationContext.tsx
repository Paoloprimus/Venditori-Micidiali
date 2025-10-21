"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Topic = "clients" | "products" | "orders" | "sales" | null;

export type ConversationState = {
  topic_attivo: Topic;
  ultimo_intent: string | null;
  entita_correnti: Record<string, string | number | boolean | null>;
  ultimo_risultato: unknown; // es. numero, lista nomi/email, ecc.
};

type ConversationContextValue = {
  state: ConversationState;
  setTopic: (t: Topic) => void;
  setIntent: (intent: string | null) => void;
  setEntita: (patch: Partial<ConversationState["entita_correnti"]>) => void;
  setRisultato: (v: unknown) => void;
  reset: () => void;
};

const DEFAULT_STATE: ConversationState = {
  topic_attivo: null,
  ultimo_intent: null,
  entita_correnti: {},
  ultimo_risultato: null,
};

const KEY = "repping:convctx";

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConversationState>(DEFAULT_STATE);

  // load da sessionStorage (solo client)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConversationState;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignora
    }
    // salvataggio on unload per sicurezza (ridondante col watch sotto)
    const onBeforeUnload = () => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(state));
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persistenza live
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const api = useMemo<ConversationContextValue>(() => {
    return {
      state,
      setTopic: (t) => setState((s) => ({ ...s, topic_attivo: t })),
      setIntent: (intent) => setState((s) => ({ ...s, ultimo_intent: intent })),
      setEntita: (patch) =>
        setState((s) => ({ ...s, entita_correnti: { ...s.entita_correnti, ...patch } })),
      setRisultato: (v) => setState((s) => ({ ...s, ultimo_risultato: v })),
      reset: () => setState(DEFAULT_STATE),
    };
  }, [state]);

  return <ConversationContext.Provider value={api}>{children}</ConversationContext.Provider>;
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation deve essere usato dentro <ConversationProvider>.");
  return ctx;
}

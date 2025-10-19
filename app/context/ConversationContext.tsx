"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Scope = "clients" | "prodotti" | "ordini" | "global";
type Topic = Scope | string;
type Intent = "count" | "list_names" | "list_emails" | "list_missing_products" | string;

export type ConversationContextState = {
  // nuovo: scope semantico (aiuta a guidare l'interpretazione)
  scope: Scope;
  topic_attivo: Topic | null;
  ultimo_intent: Intent | null;
  entita_correnti: Record<string, any> | null;
  ultimo_risultato: any | null;
  updated_at: number | null; // quando è stato aggiornato l'ultima volta
};

const STORAGE_KEY = "repping:convctx:v1";

// ⏱️ TTL di default: 15 minuti (puoi cambiare qui)
const DEFAULT_TTL_MS = 15 * 60 * 1000;

const defaultState: ConversationContextState = {
  scope: "global",
  topic_attivo: null,
  ultimo_intent: null,
  entita_correnti: null,
  ultimo_risultato: null,
  updated_at: null,
};

type ConversationContextValue = {
  state: ConversationContextState;
  expired: boolean;                        // 👈 utile per sapere se è scaduto
  ttlMs: number;                           // il TTL effettivo in uso
  setScope: (s: Scope) => void;            // 👈 nuovo setter scope
  setTopic: (t: Topic | null) => void;
  setIntent: (i: Intent | null) => void;
  setEntities: (e: Record<string, any> | null) => void;
  setLastResult: (r: any) => void;
  remember: (partial: Partial<ConversationContextState>) => void;
  reset: (opts?: { keepScope?: boolean }) => void; // 👈 reset con opzione "tieni lo scope"
};

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

function isExpired(s: ConversationContextState, ttlMs: number) {
  if (!s.updated_at) return false;
  return Date.now() - s.updated_at > ttlMs;
}

export function ConversationProvider({
  children,
  ttlMs = DEFAULT_TTL_MS, // puoi passare un TTL diverso se vuoi
}: {
  children: React.ReactNode;
  ttlMs?: number;
}) {
  const [state, setState] = useState<ConversationContextState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [expired, setExpired] = useState(false);
  const ttlRef = useRef(ttlMs);
  ttlRef.current = ttlMs;

  // hydrate una sola volta da sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConversationContextState;
        const next = isExpired(parsed, ttlRef.current) ? { ...defaultState, scope: parsed.scope ?? "global" } : { ...defaultState, ...parsed };
        setState(next);
        setExpired(isExpired(next, ttlRef.current));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // persistenza leggera in sessionStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  // timer che controlla la scadenza (ogni 10s, leggero)
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => {
      setExpired((prev) => {
        const nowExpired = isExpired(state, ttlRef.current);
        if (nowExpired !== prev) return nowExpired;
        return prev;
      });
    }, 10_000);
    return () => clearInterval(id);
  }, [state, hydrated]);

  // helper per marcare l'update time
  function touch(updates: Partial<ConversationContextState> = {}) {
    setState((s) => ({ ...s, ...updates, updated_at: Date.now() }));
    setExpired(false);
  }

  const api = useMemo<ConversationContextValue>(() => ({
    state,
    expired,
    ttlMs: ttlRef.current,
    setScope: (scope) => touch({ scope }),
    setTopic: (t) => touch({ topic_attivo: t }),
    setIntent: (i) => touch({ ultimo_intent: i }),
    setEntities: (e) => touch({ entita_correnti: e }),
    setLastResult: (r) => touch({ ultimo_risultato: r }),
    remember: (partial) => touch(partial),
    reset: ({ keepScope = false } = {}) =>
      setState((s) => ({
        ...(keepScope ? { ...defaultState, scope: s.scope } : defaultState),
        updated_at: null,
      })),
  }), [state, expired]);

  return (
    <ConversationContext.Provider value={api}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation must be used inside <ConversationProvider>");
  return ctx;
}

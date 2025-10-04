// lib/crypto/CryptoProvider.tsx
"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CryptoService } from "@/lib/crypto/CryptoService";

type Ctx = {
  ready: boolean;
  crypto: CryptoService | (CryptoService & { autoUnlock?: (pass?: string, scopes?: string[]) => Promise<boolean> }) | null;
  unlock: (passphrase: string, scopes?: string[]) => Promise<void>;
  autoUnlock: (passphrase?: string, scopes?: string[]) => Promise<boolean>;
  prewarm: (scopes: string[]) => Promise<void>;
  error: string | null;
};

// opzionale: gli scope che usiamo più spesso
const DEFAULT_SCOPES = [
  "table:accounts",
  "table:contacts",
  "table:products",
  "table:profiles",
  "table:notes",
  "table:conversations",
  "table:messages",
  "table:proposals",
];

const CryptoCtx = createContext<Ctx>({
  ready: false,
  crypto: null,
  unlock: async () => {},
  autoUnlock: async () => false,
  prewarm: async () => {},
  error: null,
});

export const useCrypto = () => useContext(CryptoCtx);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [cryptoSvc, setCryptoSvc] = useState<CryptoService | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureSvc = useCallback(() => {
    if (cryptoSvc) return cryptoSvc;
    const svc = new CryptoService(supabase, null); // istanza condivisa
    setCryptoSvc(svc);
    return svc;
  }, [cryptoSvc]);

  const prewarm = useCallback(
    async (scopes: string[]) => {
      const svc = ensureSvc();
      for (const s of scopes) {
        try {
          await svc.getOrCreateScopeKeys(s);
        } catch (e) {
          // non bloccare tutto se uno scope fallisce
          // eslint-disable-next-line no-console
          console.warn("[crypto prewarm] scope error:", s, e);
        }
      }
    },
    [ensureSvc]
  );

  const unlock = useCallback(
    async (passphrase: string, scopes: string[] = []) => {
      setError(null);
      const svc = ensureSvc();
      try {
        await svc.unlockWithPassphrase(passphrase);
        if (scopes.length) {
          for (const s of scopes) await svc.getOrCreateScopeKeys(s);
        }
        setReady(true);
      } catch (e: any) {
        setError(e?.message ?? "Errore sblocco");
        setReady(false);
        throw e;
      }
    },
    [ensureSvc]
  );

  const autoUnlock = useCallback(
    async (passphrase?: string, scopes: string[] = []) => {
      // 1) passphrase passata a runtime
      let pass = passphrase?.trim();
      // 2) altrimenti prova session/local storage
      if (!pass && typeof window !== "undefined") {
        pass = sessionStorage.getItem("repping:pph") || localStorage.getItem("repping:pph") || "";
      }
      if (!pass) return false;

      try {
        await unlock(pass, scopes);
        // pulizia: non tenere la passphrase in storage
        if (typeof window !== "undefined") {
          try { sessionStorage.removeItem("repping:pph"); } catch {}
          try { localStorage.removeItem("repping:pph"); } catch {}
        }
        return true;
      } catch {
        return false;
      }
    },
    [unlock]
  );

  // Espone anche autoUnlock direttamente sull’istanza crypto (per compatibilità con pagine che fanno (crypto as any).autoUnlock())
  const cryptoExposed = useMemo(() => {
    const svc = ensureSvc();
    (svc as any).autoUnlock = async (pass?: string, scopes?: string[]) =>
      autoUnlock(pass, scopes ?? DEFAULT_SCOPES);
    return svc as CryptoService & { autoUnlock?: (pass?: string, scopes?: string[]) => Promise<boolean> };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoSvc, autoUnlock]); // usa cryptoSvc come origine, ma richiama ensureSvc

  return (
    <CryptoCtx.Provider
      value={{
        ready,
        crypto: cryptoExposed,
        unlock,
        autoUnlock,
        prewarm,
        error,
      }}
    >
      {children}
    </CryptoCtx.Provider>
  );
}

// lib/crypto/CryptoProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { CryptoService } from "@/lib/crypto/CryptoService";

type Ctx = {
  ready: boolean;
  crypto: (CryptoService & { autoUnlock?: (pass?: string, scopes?: string[]) => Promise<boolean> }) | null;
  unlock: (passphrase: string, scopes?: string[]) => Promise<void>;
  autoUnlock: (passphrase?: string, scopes?: string[]) => Promise<boolean>;
  prewarm: (scopes: string[]) => Promise<void>;
  error: string | null;
};

// Scope usati in tutto l’app (tabelle cifrate)
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
  const triedAuto = useRef(false);
  const unlocking = useRef(false);

  // Crea/recupera singleton del servizio
  const ensureSvc = useCallback((): CryptoService => {
    if (cryptoSvc) return cryptoSvc;
    const svc = new CryptoService(supabase, null);
    setCryptoSvc(svc);
    return svc;
  }, [cryptoSvc]);

  // Precarica/genera chiavi per scope
  const prewarm = useCallback(
    async (scopes: string[]) => {
      const svc = ensureSvc();
      for (const s of scopes) {
        try {
          await svc.getOrCreateScopeKeys(s);
        } catch (e) {
          // non bloccare tutto se uno scope fallisce
          console.warn("[crypto prewarm] scope error", s, e);
        }
      }
    },
    [ensureSvc]
  );

  // Sblocco con passphrase
  const unlock = useCallback(
    async (passphrase: string, scopes: string[] = []) => {
      setError(null);
      const svc = ensureSvc();
      try {
        await svc.unlockWithPassphrase(passphrase);
        if (scopes.length) {
          await prewarm(scopes);
        }
        setReady(true);
      } catch (e: any) {
        setReady(false);
        setError(e?.message ?? "Errore sblocco");
        throw e;
      }
    },
    [ensureSvc, prewarm]
  );

  // Auto-unlock: legge pass da session/localStorage (salvata al login)
  const autoUnlock = useCallback(
    async (passphrase?: string, scopes: string[] = DEFAULT_SCOPES) => {
      if (unlocking.current) return false;

      let pass = (passphrase ?? "").trim();
      if (!pass && typeof window !== "undefined") {
        pass =
          sessionStorage.getItem("repping:pph") ||
          localStorage.getItem("repping:pph") ||
          "";
      }
      if (!pass) return false;

      try {
        unlocking.current = true;
        await unlock(pass, scopes);
        // pulizia: non tenere la passphrase
        try {
          sessionStorage.removeItem("repping:pph");
        } catch {}
        try {
          localStorage.removeItem("repping:pph");
        } catch {}
        return true;
      } catch (e) {
        console.warn("[crypto] autoUnlock failed:", e);
        return false;
      } finally {
        unlocking.current = false;
      }
    },
    [unlock]
  );

  // Espone autoUnlock anche sull’istanza crypto (per compatibilità con codice esistente)
  const cryptoExposed = useMemo(() => {
    const svc = ensureSvc() as CryptoService & {
      autoUnlock?: (pass?: string, scopes?: string[]) => Promise<boolean>;
    };
    svc.autoUnlock = autoUnlock;
    return svc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoSvc, autoUnlock]);

  // 🔁 Auto-unlock all’avvio del provider (una sola volta)
  useEffect(() => {
    if (triedAuto.current) return;
    triedAuto.current = true;

    (async () => {
      // se già sbloccato, esci
      if (ready) return;

      // tenta con pass salvata dal login (session/local)
      const ok = await autoUnlock(undefined, DEFAULT_SCOPES);
      if (ok) {
        setReady(true);
        return;
      }

      // se fallisce, lascia ready=false: le pagine mostreranno "Preparazione chiavi…"
      // o eventuali flussi di sblocco custom. Ma niente errori bloccanti qui.
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

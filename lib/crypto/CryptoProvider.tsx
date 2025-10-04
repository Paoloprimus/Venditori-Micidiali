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

type ExposedCrypto = CryptoService & {
  autoUnlock?: (pass?: string, scopes?: string[]) => Promise<boolean>;
};

type Ctx = {
  ready: boolean;
  crypto: ExposedCrypto | null;
  unlock: (passphrase: string, scopes?: string[]) => Promise<void>;
  autoUnlock: (passphrase?: string, scopes?: string[]) => Promise<boolean>;
  prewarm: (scopes: string[]) => Promise<void>;
  forceReady: () => void; // solo dev/emergenza
  error: string | null;
};

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
  forceReady: () => {},
  error: null,
});

export const useCrypto = () => useContext(CryptoCtx);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [cryptoSvc, setCryptoSvc] = useState<CryptoService | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triedAuto = useRef(false);
  const unlocking = useRef(false);

  const ensureSvc = useCallback((): CryptoService => {
    if (cryptoSvc) return cryptoSvc;
    const svc = new CryptoService(supabase, null);
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
          console.warn("[crypto][prewarm] scope error:", s, e);
          throw e;
        }
      }
    },
    [ensureSvc]
  );

  function normalizeOk(ret: unknown): boolean {
    if (ret === undefined) return true;           // molte implementazioni non ritornano nulla su successo
    if (typeof ret === "boolean") return ret;
    if (ret && typeof ret === "object" && "ok" in (ret as any)) {
      return Boolean((ret as any).ok);
    }
    // qualunque altro valore lo consideriamo “non garantito”
    return false;
  }

  const unlock = useCallback(
    async (passphrase: string, scopes: string[] = []) => {
      setError(null);
      const svc = ensureSvc();
      console.info("[crypto][unlock] start, scopes:", scopes);
      try {
        const ret = await (svc as any).unlockWithPassphrase(passphrase);
        const ok = normalizeOk(ret);
        if (!ok) {
          throw new Error("unlockWithPassphrase did not succeed (no-ok return)");
        }

        // sanity check immediato: almeno uno scope deve funzionare
        const checkScope = scopes[0] ?? DEFAULT_SCOPES[0];
        await svc.getOrCreateScopeKeys(checkScope);

        // prewarm opzionale
        if (scopes.length) {
          await prewarm(scopes);
        }
        setReady(true);
        console.info("[crypto][unlock] ready=true");
      } catch (e: any) {
        console.error("[crypto][unlock] ERROR:", e);
        setReady(false);
        setError(e?.message ?? "Errore sblocco");
        throw e;
      }
    },
    [ensureSvc, prewarm]
  );

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
      if (!pass) {
        console.info("[crypto][autoUnlock] no pass in storage");
        return false;
      }

      try {
        unlocking.current = true;
        await unlock(pass, scopes);
        try { sessionStorage.removeItem("repping:pph"); } catch {}
        try { localStorage.removeItem("repping:pph"); } catch {}
        return true;
      } catch (e) {
        console.warn("[crypto][autoUnlock] failed:", e);
        return false;
      } finally {
        unlocking.current = false;
      }
    },
    [unlock]
  );

  const forceReady = useCallback(() => {
    // SOLO DEV: usa NEXT_PUBLIC_CRYPTO_FORCE_READY=1 per abilitare questo comportamento
    if (typeof window !== "undefined" && process?.env?.NEXT_PUBLIC_CRYPTO_FORCE_READY === "1") {
      console.warn("[crypto][forceReady] FORZATO (dev only).");
      setReady(true);
      setError(null);
    } else {
      console.warn("[crypto][forceReady] ignorato: non in dev / env mancante.");
    }
  }, []);

  const cryptoExposed = useMemo(() => {
    const svc = ensureSvc() as ExposedCrypto;
    svc.autoUnlock = autoUnlock;
    return svc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoSvc, autoUnlock]);

  useEffect(() => {
    if (triedAuto.current) return;
    triedAuto.current = true;

    (async () => {
      if (ready) return;
      const ok = await autoUnlock(undefined, DEFAULT_SCOPES);
      if (!ok) {
        console.info("[crypto][init] autoUnlock not ok - waiting for manual/page unlock");
      }
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
        forceReady,
        error,
      }}
    >
      {children}
    </CryptoCtx.Provider>
  );
}

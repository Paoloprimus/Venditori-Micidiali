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
  forceReady: () => void; // dev/emergenza
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

// lato client possiamo leggere solo la public env; usiamo questa per pilotare UI,
// ma il vero guard per il reset è lato server (CRYPTO_DEV_AUTO_RESET)
const CLIENT_FORCE_READY =
  typeof process !== "undefined" &&
  (process as any).env?.NEXT_PUBLIC_CRYPTO_FORCE_READY === "1";

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
    if (ret === undefined) return true; // molte impl. non ritornano nulla su successo
    if (typeof ret === "boolean") return ret;
    if (ret && typeof ret === "object" && "ok" in (ret as any)) {
      return Boolean((ret as any).ok);
    }
    return false;
  }

  async function tryServerResetKeyring(): Promise<boolean> {
    try {
      // chiediamo al server se il reset è abilitato (CRYPTO_DEV_AUTO_RESET=1)
      const probe = await fetch("/api/crypto/force-reset", { method: "GET" });
      const probeJson = await probe.json().catch(() => ({}));
      if (!probe.ok || !probeJson?.enabled) return false;

      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) return false;

      const res = await fetch("/api/crypto/force-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        console.warn("[crypto][reset] server returned", res.status);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("[crypto][reset] error:", e);
      return false;
    }
  }

  const unlock = useCallback(
    async (passphrase: string, scopes: string[] = []) => {
      setError(null);
      const svc = ensureSvc();
      console.info("[crypto][unlock] start, scopes:", scopes);
      try {
        const ret = await (svc as any).unlockWithPassphrase(passphrase);
        const ok = normalizeOk(ret);
        if (!ok) throw new Error("unlockWithPassphrase did not succeed (no-ok return)");

        // sanity check: almeno uno scope deve funzionare
        const checkScope = scopes[0] ?? DEFAULT_SCOPES[0];
        await svc.getOrCreateScopeKeys(checkScope);

        if (scopes.length) await prewarm(scopes);
        setReady(true);
        console.info("[crypto][unlock] ready=true");
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        console.error("[crypto][unlock] ERROR:", e);
        // Se fallisce con OperationError, prova un reset del keyring in DEV/Preview (server-side abilitato)
        if (/OperationError/i.test(msg)) {
          const resetOk = await tryServerResetKeyring();
          if (resetOk) {
            console.warn("[crypto][unlock] keyring reset → retry unlock");
            const ret2 = await (svc as any).unlockWithPassphrase(passphrase);
            const ok2 = normalizeOk(ret2);
            if (!ok2) throw new Error("unlock retry failed (no-ok return)");
            const checkScope2 = scopes[0] ?? DEFAULT_SCOPES[0];
            await svc.getOrCreateScopeKeys(checkScope2);
            if (scopes.length) await prewarm(scopes);
            setReady(true);
            setError(null);
            console.info("[crypto][unlock] ready=true (after reset)");
            return;
          }
        }
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
    if (CLIENT_FORCE_READY) {
      console.warn("[crypto][forceReady] FORZATO (dev only).");
      setReady(true);
      setError(null);
    } else {
      console.warn("[crypto][forceReady] ignorato (env mancante).");
    }
  }, []);

  const cryptoExposed = useMemo(() => {
    const svc = ensureSvc() as ExposedCrypto;
    svc.autoUnlock = autoUnlock;
    return svc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoSvc, autoUnlock]);

  // Auto-unlock iniziale
  useEffect(() => {
    if (triedAuto.current) return;
    triedAuto.current = true;
    (async () => {
      if (ready) return;
      const ok = await autoUnlock(undefined, DEFAULT_SCOPES);
      if (!ok) {
        console.info("[crypto][init] autoUnlock not ok - waiting page unlock");
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

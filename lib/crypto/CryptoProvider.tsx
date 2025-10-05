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
  userId: string | null;
  authChecked: boolean;
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
  userId: null,
  authChecked: false,
});

export const useCrypto = () => useContext(CryptoCtx);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [cryptoSvc, setCryptoSvc] = useState<CryptoService | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // stato auth
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const triedAuto = useRef(false);
  const unlocking = useRef(false);

  // 👇 AGGIUNTO: Log quando il componente si monta (DOPO le dichiarazioni)
  console.log('🔐 CryptoProvider montato - authChecked:', authChecked, 'userId:', userId, 'ready:', ready);

  // ---- AUTH GATE ----
  useEffect(() => {
    let alive = true;

    // check iniziale
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    })();

    // listener cambi sessione (login/logout/refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
      // se siamo usciti e rimane una pass orfana in storage, rimuovila
      if (!session) {
        try { sessionStorage.removeItem("repping:pph"); } catch {}
        try { localStorage.removeItem("repping:pph"); } catch {}
        setReady(false);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ---- SERVICE ----
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
      // abilita solo se server-side ha CRYPTO_DEV_AUTO_RESET=1
      const probe = await fetch("/api/crypto/force-reset", { method: "GET" });
      const j = await probe.json().catch(() => ({}));
      if (!probe.ok || !j?.enabled) return false;
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return false;
      const res = await fetch("/api/crypto/force-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: uid }),
        credentials: "same-origin",
      });
      return res.ok;
    } catch (e) {
      console.warn("[crypto][reset] error:", e);
      return false;
    }
  }

  const unlock = useCallback(
    async (passphrase: string, scopes: string[] = []) => {
      setError(null);

      // ✅ GATE: non provare a sbloccare se non c’è utente autenticato
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        setError("Utente non autenticato");
        throw new Error("Utente non autenticato");
      }

      const svc = ensureSvc();
      try {
        // 👇 AGGIUNTO: Log prima dell'unlock
        console.log('🔐 Tentativo unlock per user:', uid);
        const ret = await (svc as any).unlockWithPassphrase(passphrase);
        const ok = normalizeOk(ret);
        if (!ok) throw new Error("unlockWithPassphrase did not succeed");

        const checkScope = scopes[0] ?? DEFAULT_SCOPES[0];
        await svc.getOrCreateScopeKeys(checkScope);

        if (scopes.length) await prewarm(scopes);
        setReady(true);
        // 👇 AGGIUNTO: Log successo unlock
        console.log('✅ Unlock riuscito, ready=true');
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        // 👇 AGGIUNTO: Log errore unlock
        console.error('❌ Errore unlock:', msg);
        // OperationError → keyring incoerente: prova reset DEV
        if (/OperationError/i.test(msg)) {
          const resetOk = await tryServerResetKeyring();
          if (resetOk) {
            const ret2 = await (svc as any).unlockWithPassphrase(passphrase);
            const ok2 = normalizeOk(ret2);
            if (!ok2) throw new Error("unlock retry failed");
            const checkScope2 = scopes[0] ?? DEFAULT_SCOPES[0];
            await svc.getOrCreateScopeKeys(checkScope2);
            if (scopes.length) await prewarm(scopes);
            setReady(true);
            setError(null);
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

      // ✅ GATE: tenta solo se autenticato
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        // se non autenticato ma c’è una pass orfana salvata, puliscila (siamo probabilmente su /login)
        try { sessionStorage.removeItem("repping:pph"); } catch {}
        try { localStorage.removeItem("repping:pph"); } catch {}
        return false;
      }

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
        try { sessionStorage.removeItem("repping:pph"); } catch {}
        try { localStorage.removeItem("repping:pph"); } catch {}
        return true;
      } catch {
        return false;
      } finally {
        unlocking.current = false;
      }
    },
    [unlock]
  );

  const forceReady = useCallback(() => {
    if (CLIENT_FORCE_READY) {
      setReady(true);
      setError(null);
    }
  }, []);

  const cryptoExposed = useMemo(() => {
    const svc = ensureSvc() as ExposedCrypto;
    svc.autoUnlock = autoUnlock;
    return svc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoSvc, autoUnlock]);

  // Auto-unlock iniziale: SOLO quando abbiamo verificato l’auth
  useEffect(() => {
    if (!authChecked) return;
    if (triedAuto.current) return;
    triedAuto.current = true;

    (async () => {
      if (ready) return;
      // tenta solo se autenticato
      if (!userId) return;
      // 👇 AGGIUNTO: Log auto-unlock
      console.log('🔐 Auto-unlock per user:', userId);
      await autoUnlock(undefined, DEFAULT_SCOPES);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, userId, ready]);

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
        userId,
        authChecked,
      }}
    >
      {children}
    </CryptoCtx.Provider>
  );
}

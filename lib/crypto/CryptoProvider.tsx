// lib/crypto/CryptoProvider.tsx
"use client";

import * as React from "react";
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

// 🔧 scope minimo per evitare errori in bootstrap
const DEFAULT_SCOPES = ["table:accounts"];

const CLIENT_FORCE_READY =
  typeof process !== "undefined" &&
  (process as any).env?.NEXT_PUBLIC_CRYPTO_FORCE_READY === "1";

const CryptoCtx = React.createContext<Ctx>({
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

export function useCrypto() {
  return React.useContext(CryptoCtx);
}

// Solo debug; in dev può salire per StrictMode
let providerMountCount = 0;

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  providerMountCount++;
  console.log(
    "🔐 [PROVIDER] CryptoProvider montato - count:",
    providerMountCount,
    "timestamp:",
    Date.now()
  );

  const [cryptoSvc, setCryptoSvc] = React.useState<CryptoService | null>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // stato auth
  const [userId, setUserId] = React.useState<string | null>(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  const triedAuto = React.useRef(false);
  const unlocking = React.useRef(false);

  console.log(
    "🔐 CryptoProvider montato - authChecked:",
    authChecked,
    "userId:",
    userId,
    "ready:",
    ready
  );

  // ---- AUTH GATE ----
  React.useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
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
  const ensureSvc = React.useCallback((): CryptoService => {
    if (cryptoSvc) return cryptoSvc;
    const svc = new CryptoService(supabase, null);
    setCryptoSvc(svc);
    return svc;
  }, [cryptoSvc]);

  // prewarm tollerante: logga errori, non blocca
  const prewarm = React.useCallback(
    async (scopes: string[]) => {
      const svc = ensureSvc();
      for (const s of scopes) {
        try {
          await svc.getOrCreateScopeKeys(s);
        } catch (e) {
          console.warn("[crypto][prewarm] scope error (ignoro):", s, e);
        }
      }
    },
    [ensureSvc]
  );

  function normalizeOk(ret: unknown): boolean {
    if (ret === undefined) return true;
    if (typeof ret === "boolean") return ret;
    if (ret && typeof ret === "object" && "ok" in (ret as any)) {
      return Boolean((ret as any).ok);
    }
    return false;
  }

  async function tryServerResetKeyring(): Promise<boolean> {
    try {
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

  const unlock = React.useCallback(
    async (passphrase: string, scopes: string[] = []) => {
      setError(null);

      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        setError("Utente non autenticato");
        throw new Error("Utente non autenticato");
      }

      const svc = ensureSvc();
      try {
        console.log("🔐 Tentativo unlock per user:", uid);
        const ret = await (svc as any).unlockWithPassphrase(passphrase);
        const ok = normalizeOk(ret);
        if (!ok) throw new Error("unlockWithPassphrase did not succeed");

        // scalda almeno uno scope per validare la KEK/MK
        const checkScope = scopes[0] ?? DEFAULT_SCOPES[0];
        try {
          await svc.getOrCreateScopeKeys(checkScope);
        } catch (e) {
          console.warn("[crypto] checkScope fallita, continuo:", checkScope, e);
        }

        if (scopes.length) await prewarm(scopes);

        setReady(true);
        console.log("✅ Unlock riuscito, ready=true");
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        console.error("❌ Errore unlock:", msg);

        if (/OperationError/i.test(msg)) {
          const resetOk = await tryServerResetKeyring();
          if (resetOk) {
            const ret2 = await (svc as any).unlockWithPassphrase(passphrase);
            const ok2 = normalizeOk(ret2);
            if (!ok2) throw new Error("unlock retry failed");
            const checkScope2 = scopes[0] ?? DEFAULT_SCOPES[0];
            try { await svc.getOrCreateScopeKeys(checkScope2); } catch {}
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

  const autoUnlock = React.useCallback(
    async (passphrase?: string, scopes: string[] = DEFAULT_SCOPES) => {
      if (unlocking.current) return false;

      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
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

  const forceReady = React.useCallback(() => {
    if (CLIENT_FORCE_READY) {
      setReady(true);
      setError(null);
    }
  }, []);

  const cryptoExposed = React.useMemo(() => {
    const svc = ensureSvc() as ExposedCrypto;
    svc.autoUnlock = autoUnlock;
    return svc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoSvc, autoUnlock]);

  // Auto-unlock iniziale (una sola volta, dopo auth)
  React.useEffect(() => {
    console.log(
      "🔐 [PROVIDER] useEffect auto-unlock - authChecked:",
      authChecked,
      "userId:",
      userId,
      "ready:",
      ready
    );

    if (!authChecked) return;
    if (triedAuto.current) return;
    triedAuto.current = true;

    (async () => {
      if (ready) return;
      if (!userId) return;
      console.log("🔐 [PROVIDER] Auto-unlock per user:", userId);
      await autoUnlock(undefined, DEFAULT_SCOPES);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, userId, ready]);

  // Debug helper globale
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const svc = ensureSvc();
      (window as any).debugCrypto = {
        unlock: (passphrase: string, scopes?: string[]) => unlock(passphrase, scopes),
        ensureScope: (scope: string) => svc.getOrCreateScopeKeys(scope),
        svc,
        ready,
        userId,
        authChecked,
        error,
      };
      console.log("🔐 Crypto debug esposto come window.debugCrypto");
    }
  }, [unlock, ready, userId, authChecked, error, ensureSvc]);

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

// lib/crypto/CryptoProvider.tsx
"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";
import { CryptoService } from "@/lib/crypto/CryptoService";

type CryptoContextType = {
  ready: boolean;
  crypto: CryptoService | null;
  unlock: (passphrase: string) => Promise<void>;
  prewarm: (scopes?: string[]) => Promise<void>;
  error: string | null;
};

const CryptoContext = React.createContext<CryptoContextType>({
  ready: false,
  crypto: null,
  unlock: async () => {},
  prewarm: async () => {},
  error: null,
});

export function useCrypto() {
  return React.useContext(CryptoContext);
}

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [crypto, setCrypto] = React.useState<CryptoService | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // crea servizio una sola volta
  React.useEffect(() => {
    const svc = new CryptoService(supabase, null);
    setCrypto(svc);
    (window as any).debugCrypto = svc;
    console.log("🔐 CryptoProvider inizializzato (singleton)");
  }, []);

  const unlock = async (passphrase: string) => {
    try {
      if (!crypto) return;
      await (crypto as any).unlockWithPassphrase(passphrase);
      setReady(true);
      setError(null);
      console.log("✅ Sblocco riuscito, ready=true");
    } catch (err: any) {
      setReady(false);
      setError(String(err?.message || err));
      console.error("❌ Errore sblocco:", err);
    }
  };

  /**
   * Prepara le chiavi per alcune tabelle ("scope") prima di usarle.
   * - Se CryptoService ha già un metodo prewarm, lo usa.
   * - Altrimenti fa fallback su ensureScope per ogni scope.
   * - Ignora i 409/duplicati (chiave già esistente) e li logga come warning.
   */
  const prewarm = async (scopes?: string[]) => {
    if (!crypto) return;

    const defaultScopes = [
      "profiles",
      "contacts",
      "products",
      "notes",
      "messages",
      "conversations",
      "proposals",
    ];
    const list = scopes && scopes.length ? scopes : defaultScopes;

    try {
      if (typeof (crypto as any).prewarm === "function") {
        await (crypto as any).prewarm(list);
        return;
      }
    } catch (e) {
      console.warn("[crypto][prewarm] errore dal metodo nativo, fallback:", e);
      // continueremo con il fallback sotto
    }

    // Fallback: ensureScope per ogni scope, ignorando i duplicati
    for (const s of list) {
      try {
        if (typeof (crypto as any).ensureScope === "function") {
          await (crypto as any).ensureScope(s);
        }
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        const code = (e && e.code) || "";
        if (msg.includes("duplicate key") || code === "23505" || msg.includes("409")) {
          console.warn("[crypto][prewarm] duplicato (ok da ignorare):", s);
          continue;
        }
        console.warn("[crypto][prewarm] scope error (ignoro):", `table:${s}`, e);
      }
    }
  };

  return (
    <CryptoContext.Provider value={{ ready, crypto, unlock, prewarm, error }}>
      {children}
    </CryptoContext.Provider>
  );
}
